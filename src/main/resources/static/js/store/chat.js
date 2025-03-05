// Create store methods first, then make the whole object reactive
const chatStoreMethods = {
    // Initialize chat state
    initialize() {
        // Ensure arrays are initialized
        this.chats = this.chats || [];
        this.messages = this.messages || [];
        this.selectedFiles = this.selectedFiles || [];

        // Load chats on initialization
        setTimeout(() => this.loadChats(), 0);
    },

    /**
     * Load chats from the server
     */
    async loadChats() {
        try {
            const response = await API.getChats(0, 50, true);
            if (response && response.content) {
                this.chats = response.content || [];

                // If there are chats but no chat is selected, select the first one
                if (this.chats.length > 0 && !this.currentChat) {
                    this.selectChat(this.chats[0]);
                }
            } else {
                console.warn('No content in loadChats response');
                this.chats = [];
            }
        } catch (error) {
            console.error('Failed to load chats:', error);
            if (UI_Store) {
                UI_Store.showErrorNotification('Error', 'Failed to load chats');
            }
            this.chats = [];
        }
    },

    /**
     * Load chat history for a specific chat
     * @param {string} chatId - Chat ID
     * @param {number} page - Page number (0-based)
     * @param {number} size - Page size
     */
    async loadChatHistory(chatId, page = 0, size = 20) {
        if (!chatId) {
            console.error('Cannot load chat history: chatId is undefined');
            return;
        }

        try {
            const response = await API.getChatHistory(chatId, page, size);

            if (response && response.content) {
                // Always reinitialize messages array
                this.messages = response.content || [];
                this.currentPage = response.page || 0;
                this.totalPages = response.totalPages || 0;
            } else {
                console.warn('No content in loadChatHistory response');
                this.messages = [];
                this.currentPage = 0;
                this.totalPages = 0;
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
            if (UI_Store) {
                UI_Store.showErrorNotification('Error', 'Failed to load chat history');
            }
            this.messages = [];
            this.currentPage = 0;
            this.totalPages = 0;
        }
    },

    /**
     * Create a new chat
     */
    async createNewChat() {
        try {
            const newChat = await API.createChat(this.currentModel);
            if (newChat) {
                this.chats.unshift(newChat);
                this.selectChat(newChat);
                return newChat;
            }
        } catch (error) {
            console.error('Failed to create chat:', error);
            if (UI_Store) {
                UI_Store.showErrorNotification('Error', 'Failed to create a new chat');
            }
            return null;
        }
    },

    /**
     * Select a chat
     * @param {object} chat - Chat object
     */
    selectChat(chat) {
        if (!chat || !chat.id) {
            console.error('Invalid chat selected');
            return;
        }

        this.currentChat = chat;
        this.currentPage = 0;
        this.messages = [];  // Clear messages before loading new ones

        this.loadChatHistory(chat.id, 0, 20);

        // On mobile, collapse sidebar after selecting a chat
        if (window.innerWidth < 768 && UI_Store) {
            UI_Store.isSidebarCollapsed = true;
        }
    },

    // Add the remaining methods from the previous implementation...
    // ...

    setModel(model) {
        if (model && typeof model === 'string') {
            this.currentModel = model;
        }
    },

    async sendMessage(message) {
        if (!message || !message.trim() || this.isTyping) return;

        // Check if currentChat exists
        if (!this.currentChat || !this.currentChat.id) {
            // Create a new chat if none exists
            try {
                const newChat = await this.createNewChat();
                if (!newChat) {
                    console.error('Failed to create a new chat before sending message');
                    if (UI_Store) {
                        UI_Store.showErrorNotification('Error', 'Failed to create a new chat');
                    }
                    return;
                }
            } catch (error) {
                console.error('Failed to create a new chat before sending message:', error);
                if (UI_Store) {
                    UI_Store.showErrorNotification('Error', 'Failed to create a new chat');
                }
                return;
            }
        }

        // Double-check that currentChat now exists and has an id
        if (!this.currentChat || !this.currentChat.id) {
            console.error('No valid chat available to send message to');
            if (UI_Store) {
                UI_Store.showErrorNotification('Error', 'No chat available to send message to');
            }
            return;
        }

        // Ensure messages array is initialized
        if (!this.messages) {
            this.messages = [];
        }

        // Reset streaming state
        this.streamingMessage = '';
        if (UI_Store) {
            UI_Store.reconnectCount = 0;
            UI_Store.lastActivityTimestamp = Date.now();

            // Start the heartbeat connection
            UI_Store.startHeartbeat();
        }

        // Add user message to the chat
        this.messages.push({
            id: 'temp-' + Date.now(),
            chatId: this.currentChat.id,
            type: 'USER',
            content: message,
            timestamp: new Date().toISOString()
        });

        // Initialize streaming state
        this.isTyping = true;
        this.isStreaming = true;
        this.streamingChatId = this.currentChat.id;

        // Add placeholder for assistant's response
        const tempAssistantId = 'temp-assistant-' + Date.now();
        this.messages.push({
            id: tempAssistantId,
            chatId: this.currentChat.id,
            type: 'ASSISTANT',
            content: '',
            timestamp: new Date().toISOString()
        });

        // Initialize content length tracker
        this.lastContentLength[tempAssistantId] = 0;

        try {
            // Prepare form data
            const formData = new FormData();
            formData.append('model', this.currentModel);
            formData.append('prompt', message);
            formData.append('role', 'helpful assistant');
            formData.append('chatId', this.currentChat.id);

            // Add files if they exist
            if (this.selectedFiles && this.selectedFiles.length > 0) {
                this.selectedFiles.forEach(file => {
                    formData.append('attachments', file);
                });

                // Clear selected files
                this.selectedFiles = [];
            }

            // Ensure 'this' context is preserved for callbacks
            const self = this;

            // Send streaming request
            const response = await API.sendStreamingMessage(formData);

            // Process streaming response
            Utils.processStreamingResponse(
                response,
                // On chunk received
                function(content) {
                    self.updateStreamingMessage(tempAssistantId, content);
                },
                // On complete
                function() {
                    self.finalizeStreaming();
                },
                // On error
                function(error) {
                    self.handleStreamingError(tempAssistantId, error);
                }
            );
        } catch (error) {
            console.error('Failed to send message:', error);
            this.handleStreamingError(tempAssistantId, error);
        }
    },

    // Include all other methods with the same 'self' pattern where needed
};

// Create the actual reactive store by combining state and methods
const Chat_Store = Vue.reactive({
    // State
    chats: [],
    messages: [],
    currentChat: null,
    currentPage: 0,
    totalPages: 0,
    searchQuery: '',
    currentModel: 'llama3.2:3b',

    // Status
    isTyping: false,
    isStreaming: false,
    streamingMessage: '',
    streamingChatId: null,

    // File handling
    selectedFiles: [],

    // Content tracking for streaming animations
    lastContentLength: {},

    // Modals state
    chatToRename: null,
    chatToDelete: null,
    newChatTitle: '',
    modalRename: null,
    modalDelete: null,

    // Add all methods
    ...chatStoreMethods
});