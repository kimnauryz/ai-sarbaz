/**
 * Chat Store - Manages chat-related state
 */
const chatStoreMethods = {
    // Initialize chat state
    initialize() {
        // Ensure arrays are initialized
        Chat_Store.chats = [];
        Chat_Store.messages = [];
        Chat_Store.selectedFiles = [];
        Chat_Store.lastContentLength = {};

        // Load chats on initialization
        setTimeout(() => Chat_Store.loadChats(), 0);
    },

    /**
     * Load chats from the server
     */
    async loadChats() {
        try {
            const response = await API.getChats(0, 50, true);
            if (response && response.content) {
                Chat_Store.chats = response.content || [];

                // If there are chats but no chat is selected, select the first one
                if (Chat_Store.chats.length > 0 && !Chat_Store.currentChat) {
                    Chat_Store.selectChat(Chat_Store.chats[0]);
                }
            } else {
                console.warn('No content in loadChats response');
                Chat_Store.chats = [];
            }
        } catch (error) {
            console.error('Failed to load chats:', error);
            if (UI_Store) {
                UI_Store.showErrorNotification('Error', 'Failed to load chats');
            }
            Chat_Store.chats = [];
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
                Chat_Store.messages = response.content || [];
                Chat_Store.currentPage = response.page || 0;
                Chat_Store.totalPages = response.totalPages || 0;
            } else {
                console.warn('No content in loadChatHistory response');
                Chat_Store.messages = [];
                Chat_Store.currentPage = 0;
                Chat_Store.totalPages = 0;
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
            if (UI_Store) {
                UI_Store.showErrorNotification('Error', 'Failed to load chat history');
            }
            Chat_Store.messages = [];
            Chat_Store.currentPage = 0;
            Chat_Store.totalPages = 0;
        }
    },

    /**
     * Create a new chat
     */
    async createNewChat() {
        try {
            const newChat = await API.createChat(Chat_Store.currentModel);
            if (newChat) {
                Chat_Store.chats.unshift(newChat);
                Chat_Store.selectChat(newChat);
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

        Chat_Store.currentChat = chat;
        Chat_Store.currentPage = 0;
        Chat_Store.messages = [];  // Clear messages before loading new ones

        Chat_Store.loadChatHistory(chat.id);

        // On mobile, collapse sidebar after selecting a chat
        if (window.innerWidth < 768 && UI_Store) {
            UI_Store.isSidebarCollapsed = true;
        }
    },

    /**
     * Set the current AI model
     * @param {string} model - Model name
     */
    setModel(model) {
        if (model && typeof model === 'string') {
            Chat_Store.currentModel = model;
        }
    },

    /**
     * Change the current page of messages
     * @param {number} page - Page number to navigate to
     */
    changePage(page) {
        if (page < 0 || page >= Chat_Store.totalPages || !Chat_Store.currentChat) return;
        Chat_Store.loadChatHistory(Chat_Store.currentChat.id, page);
    },

    /**
     * Handle file upload
     * @param {Event} event - File input change event
     */
    handleFileUpload(event) {
        const files = event.target.files;
        if (!files || !files.length) return;

        for (let i = 0; i < files.length; i++) {
            Chat_Store.selectedFiles.push(files[i]);
        }

        // Reset input so the same file can be selected again
        event.target.value = '';
    },

    /**
     * Remove a file from selected files
     * @param {number} index - Index of file to remove
     */
    removeFile(index) {
        if (index >= 0 && index < Chat_Store.selectedFiles.length) {
            Chat_Store.selectedFiles.splice(index, 1);
        }
    },

    /**
     * Show rename modal for a chat
     * @param {object} chat - Chat to rename
     */
    showRenameModal(chat) {
        Chat_Store.chatToRename = chat;
        Chat_Store.newChatTitle = chat.title;
        if (Chat_Store.modalRename) {
            Chat_Store.modalRename.show();
        }
    },

    /**
     * Rename the current chat
     * @param {string} newTitle - New chat title
     */
    async renameChat(newTitle) {
        if (!Chat_Store.chatToRename || !newTitle.trim()) return;

        try {
            const response = await API.updateChatTitle(Chat_Store.chatToRename.id, newTitle);

            const updatedChat = response;

            // Update chat in list
            const index = Chat_Store.chats.findIndex(c => c.id === updatedChat.id);
            if (index !== -1) {
                Chat_Store.chats[index] = updatedChat;
            }

            // Update current chat if it's the same one
            if (Chat_Store.currentChat && Chat_Store.currentChat.id === updatedChat.id) {
                Chat_Store.currentChat = updatedChat;
            }

            if (Chat_Store.modalRename) {
                Chat_Store.modalRename.hide();
            }
        } catch (error) {
            console.error('Error renaming chat:', error);
            if (UI_Store) {
                UI_Store.showErrorNotification('Error', 'Failed to rename chat');
            }
        }
    },

    /**
     * Show delete confirmation modal
     * @param {object} chat - Chat to delete
     */
    showDeleteModal(chat) {
        Chat_Store.chatToDelete = chat;
        if (Chat_Store.modalDelete) {
            Chat_Store.modalDelete.show();
        }
    },

    /**
     * Delete the selected chat
     */
    async deleteChat() {
        if (!Chat_Store.chatToDelete) return;

        try {
            await API.deleteChat(Chat_Store.chatToDelete.id);

            // Remove chat from list
            Chat_Store.chats = Chat_Store.chats.filter(c => c.id !== Chat_Store.chatToDelete.id);

            // Clear current chat if it was the deleted one
            if (Chat_Store.currentChat && Chat_Store.currentChat.id === Chat_Store.chatToDelete.id) {
                Chat_Store.currentChat = null;
                Chat_Store.messages = [];
            }

            if (Chat_Store.modalDelete) {
                Chat_Store.modalDelete.hide();
            }
        } catch (error) {
            console.error('Error deleting chat:', error);
            if (UI_Store) {
                UI_Store.showErrorNotification('Error', 'Failed to delete chat');
            }
        }
    },

    /**
     * Archive a chat
     * @param {string} chatId - ID of chat to archive
     */
    async archiveChat(chatId) {
        if (!confirm('Are you sure you want to archive this chat?')) return;

        try {
            await API.archiveChat(chatId);

            // Remove chat from list
            Chat_Store.chats = Chat_Store.chats.filter(c => c.id !== chatId);

            // Clear current chat if it was the archived one
            if (Chat_Store.currentChat && Chat_Store.currentChat.id === chatId) {
                Chat_Store.currentChat = null;
                Chat_Store.messages = [];
            }
        } catch (error) {
            console.error('Error archiving chat:', error);
            if (UI_Store) {
                UI_Store.showErrorNotification('Error', 'Failed to archive chat');
            }
        }
    },

    /**
     * Send a message
     * @param {string} message - Message content
     */
    async sendMessage(message) {
        if (!message || !message.trim() || Chat_Store.isTyping) return;

        // Check if currentChat exists
        if (!Chat_Store.currentChat || !Chat_Store.currentChat.id) {
            // Create a new chat if none exists
            try {
                const newChat = await Chat_Store.createNewChat();
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
        if (!Chat_Store.currentChat || !Chat_Store.currentChat.id) {
            console.error('No valid chat available to send message to');
            if (UI_Store) {
                UI_Store.showErrorNotification('Error', 'No chat available to send message to');
            }
            return;
        }

        // Ensure messages array is initialized
        if (!Chat_Store.messages) {
            Chat_Store.messages = [];
        }

        // Initialize lastContentLength if not already done
        if (!Chat_Store.lastContentLength) {
            Chat_Store.lastContentLength = {};
        }

        // Reset streaming state
        Chat_Store.streamingMessage = '';
        if (UI_Store) {
            UI_Store.reconnectCount = 0;
            UI_Store.lastActivityTimestamp = Date.now();

            // Start the heartbeat connection
            UI_Store.startHeartbeat();
        }

        // Add user message to the chat
        Chat_Store.messages.push({
            id: 'temp-' + Date.now(),
            chatId: Chat_Store.currentChat.id,
            type: 'USER',
            content: message,
            timestamp: new Date().toISOString()
        });

        // Initialize streaming state
        Chat_Store.isTyping = true;
        Chat_Store.isStreaming = true;
        Chat_Store.streamingChatId = Chat_Store.currentChat.id;

        // Add placeholder for assistant's response
        const tempAssistantId = 'temp-assistant-' + Date.now();
        Chat_Store.messages.push({
            id: tempAssistantId,
            chatId: Chat_Store.currentChat.id,
            type: 'ASSISTANT',
            content: '',
            timestamp: new Date().toISOString()
        });

        // Initialize content length tracker
        if (!Chat_Store.lastContentLength[tempAssistantId]) {
            Chat_Store.lastContentLength[tempAssistantId] = 0;
        }

        try {
            // Prepare form data
            const formData = new FormData();
            formData.append('model', Chat_Store.currentModel);
            formData.append('prompt', message);
            formData.append('role', 'helpful assistant');
            formData.append('chatId', Chat_Store.currentChat.id);

            // Add files if they exist
            if (Chat_Store.selectedFiles && Chat_Store.selectedFiles.length > 0) {
                Chat_Store.selectedFiles.forEach(file => {
                    formData.append('attachments', file);
                });

                // Clear selected files
                Chat_Store.selectedFiles = [];
            }

            // Ensure 'this' context is preserved for callbacks
            const self = Chat_Store;

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
            Chat_Store.handleStreamingError(tempAssistantId, error);
        }
    },

    /**
     * Update streaming message with new content
     * @param {string} messageId - ID of message to update
     * @param {string} newContent - New content to append
     */
    updateStreamingMessage(messageId, newContent) {
        // Initialize streamingMessage if needed
        if (!Chat_Store.streamingMessage) {
            Chat_Store.streamingMessage = '';
        }

        // Add new content
        Chat_Store.streamingMessage += newContent;

        // Find and update the message
        const messageIndex = Chat_Store.messages.findIndex(m => m.id === messageId);
        if (messageIndex !== -1) {
            // Create a new message object to ensure Vue reactivity
            const updatedMessage = {...Chat_Store.messages[messageIndex]};
            updatedMessage.content = Chat_Store.streamingMessage;

            // Replace the message in the array
            Chat_Store.messages.splice(messageIndex, 1, updatedMessage);
        }
    },

    /**
     * Handle streaming errors
     */
    handleStreamingError(messageId, error) {
        console.error('Streaming error:', error);

        // Show error in UI
        if (UI_Store) {
            UI_Store.showErrorNotification(
                'Message Error',
                error.message || 'Error generating response'
            );
        }

        // Update the message with error indication
        const messageIndex = Chat_Store.messages.findIndex(m => m.id === messageId);
        if (messageIndex !== -1) {
            const currentContent = Chat_Store.messages[messageIndex].content;

            let errorMessage;
            if (currentContent) {
                errorMessage = currentContent + "\n\n⚠️ *Response was interrupted due to an error.*";
            } else {
                errorMessage = "⚠️ *Unable to generate a response. Please try again.*";
            }

            // Update the message
            const updatedMessage = {...Chat_Store.messages[messageIndex]};
            updatedMessage.content = errorMessage;
            Chat_Store.messages.splice(messageIndex, 1, updatedMessage);
        }

        // Reset streaming state
        Chat_Store.finalizeStreaming();
    },

    /**
     * Finalize the streaming response
     */
    finalizeStreaming() {
        Chat_Store.isTyping = false;
        Chat_Store.isStreaming = false;

        // Refresh chat history to get final message IDs
        setTimeout(() => {
            if (Chat_Store.currentChat && Chat_Store.currentChat.id) {
                Chat_Store.loadChatHistory(Chat_Store.currentChat.id, 0);
                Chat_Store.loadChats();
            }
        }, 500);
    }
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