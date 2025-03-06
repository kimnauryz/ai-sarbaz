/**
 * Plain JavaScript Chat Application
 * No Vue reactivity - using vanilla JS for DOM manipulation
 */

// Global state
const AppState = {
    // UI state
    ui: {
        isSidebarCollapsed: window.innerWidth < 768,
        errorToast: {
            visible: false,
            title: '',
            message: ''
        },
        connectionStatus: 'connected', // 'connected', 'disconnected', 'reconnecting'
        reconnectCount: 0,
        maxReconnectAttempts: 3,
        heartbeatTimer: null,
        lastActivityTimestamp: Date.now()
    },

    // Chat state
    chat: {
        chats: [],
        messages: [],
        currentChat: null,
        currentPage: 0,
        totalPages: 0,
        searchQuery: '',
        currentModel: 'llama3.2:3b',
        isTyping: false,
        isStreaming: false,
        streamingMessage: '',
        streamingChatId: null,
        selectedFiles: [],
        lastContentLength: {},
        chatToRename: null,
        chatToDelete: null,
        newChatTitle: ''
    },

    // Modal references
    modalRename: null,
    modalDelete: null,

    // Available models
    availableModels: [
        'llama3.2:3b',
        'llama3.2:8b',
        'llama3.2:70b',
        'mistral'
    ],

    // DOM elements cache
    elements: {}
};

// API client module
const API = {
    // Base endpoints
    endpoints: {
        chats: '/chats',
        prompt: '/chats/prompt',
        streamingPrompt: '/chats/streaming/prompt',
        history: '/chats/{chatId}/history',
        health: '/chats/health',
        heartbeat: '/chats/streaming/heartbeat'
    },

    /**
     * Get list of chats with pagination
     */
    async getChats(page = 0, size = 50, activeOnly = true) {
        try {
            const response = await fetch(`${this.endpoints.chats}?page=${page}&size=${size}&activeOnly=${activeOnly}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching chats:', error);
            throw error;
        }
    },

    /**
     * Create a new chat
     */
    async createChat(model) {
        try {
            const response = await fetch(this.endpoints.chats, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ model })
            });
            return await response.json();
        } catch (error) {
            console.error('Error creating chat:', error);
            throw error;
        }
    },

    /**
     * Get chat message history with pagination
     */
    async getChatHistory(chatId, page = 0, size = 20) {
        try {
            const response = await fetch(`${this.endpoints.chats}/${chatId}/history?page=${page}&size=${size}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching chat history:', error);
            throw error;
        }
    },

    /**
     * Update chat title
     */
    async updateChatTitle(chatId, title) {
        try {
            const response = await fetch(`${this.endpoints.chats}/${chatId}/title`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title })
            });
            return await response.json();
        } catch (error) {
            console.error('Error updating chat title:', error);
            throw error;
        }
    },

    /**
     * Archive a chat
     */
    async archiveChat(chatId) {
        try {
            const response = await fetch(`${this.endpoints.chats}/${chatId}/archive`, {
                method: 'PUT'
            });
            return await response.json();
        } catch (error) {
            console.error('Error archiving chat:', error);
            throw error;
        }
    },

    /**
     * Delete a chat
     */
    async deleteChat(chatId) {
        try {
            await fetch(`${this.endpoints.chats}/${chatId}`, {
                method: 'DELETE'
            });
            return true;
        } catch (error) {
            console.error('Error deleting chat:', error);
            throw error;
        }
    },

    /**
     * Send a message
     */
    async sendMessage(formData) {
        try {
            const response = await fetch(this.endpoints.prompt, {
                method: 'POST',
                body: formData
            });
            return await response.json();
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    },

    /**
     * Send a streaming message
     */
    async sendStreamingMessage(formData) {
        try {
            return await fetch(this.endpoints.streamingPrompt || this.endpoints.prompt, {
                method: 'POST',
                body: formData
            });
        } catch (error) {
            console.error('Error sending streaming message:', error);
            throw error;
        }
    },

    /**
     * Check server health
     */
    async checkHealth() {
        try {
            const response = await fetch(this.endpoints.health, {
                method: 'GET',
                headers: { 'Cache-Control': 'no-cache' }
            });
            return response.ok;
        } catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    }
};

// Utility functions
const Utils = {
    /**
     * Format timestamp to human-readable time
     */
    formatTime(timestamp) {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleTimeString();
    },

    /**
     * Format message content for display
     */
    formatMessageContent(content, isStreaming, lastContentLength, streamingMessageId) {
        if (!content) return '';

        // Escape HTML to prevent XSS
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };

        // For non-streaming or completed messages, just return escaped content
        if (!isStreaming) {
            return escapeHtml(content)
                // Convert URLs to clickable links
                .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-primary">$1</a>')
                // Maintain line breaks for readability
                .replace(/\n/g, '<br>');
        }

        // Initialize last content length for this message if not existing
        if (!lastContentLength[streamingMessageId]) {
            lastContentLength[streamingMessageId] = 0;
        }

        const prevLength = lastContentLength[streamingMessageId];
        const currentLength = content.length;

        // No new content
        if (currentLength <= prevLength) {
            return escapeHtml(content)
                .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-primary">$1</a>')
                .replace(/\n/g, '<br>');
        }

        // There is new content to highlight
        const existingContent = escapeHtml(content.substring(0, prevLength))
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-primary">$1</a>')
            .replace(/\n/g, '<br>');

        const newContent = escapeHtml(content.substring(prevLength))
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-primary">$1</a>')
            .replace(/\n/g, '<br>');

        // Update the tracked length
        lastContentLength[streamingMessageId] = currentLength;

        // Return content with the new part wrapped in highlighting span
        return `${existingContent}<span class="newest-chunk">${newContent}</span>`;
    },

    /**
     * Process a streaming response from the server
     */
    async processStreamingResponse(response, onChunk, onComplete, onError) {
        try {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                try {
                    const { done, value } = await reader.read();

                    if (done) {
                        console.log('Stream completed naturally');
                        break;
                    }

                    // Decode and process the chunk
                    const chunk = decoder.decode(value, { stream: true });
                    buffer += chunk;

                    // Split the buffer by SSE delimiter (double newline)
                    const events = buffer.split('\n\n');
                    buffer = events.pop() || ' '; // Keep the last chunk (might be incomplete)

                    // Process each complete event
                    for (const eventText of events) {
                        if (!eventText.trim()) continue;

                        // Parse event type and data
                        const eventLines = eventText.split('\n');
                        let eventType = 'message';
                        let eventData = '';

                        for (const line of eventLines) {
                            if (line.startsWith('event:')) {
                                eventType = line.substring(6).trim();
                            } else if (line.startsWith('data:')) {
                                eventData = line.substring(5).trim();
                            }
                        }

                        // Handle different event types
                        if (eventType === 'message' && eventData) {
                            onChunk(eventData);
                        } else if (eventType === 'error') {
                            if (eventData.startsWith('error:')) {
                                eventData = eventData.substring(6).trim();
                            }
                            throw new Error(eventData || 'Unknown streaming error');
                        }
                    }
                } catch (readError) {
                    console.error('Error reading stream chunk:', readError);
                    throw readError;
                }
            }

            onComplete();
        } catch (error) {
            onError(error);
        }
    },

    /**
     * Animate scrolling to the bottom of a container
     */
    animateScrollToBottom(container) {
        if (!container) return;

        const scrollHeight = container.scrollHeight;
        const currentScroll = container.scrollTop + container.clientHeight;

        // If we're already near the bottom, scroll immediately
        if (scrollHeight - currentScroll < 100) {
            container.scrollTop = scrollHeight;
        } else {
            // Otherwise, only scroll if the user hasn't scrolled up to read previous messages
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
            if (isNearBottom) {
                container.scrollTop = scrollHeight;
            }
        }
    },

    /**
     * Create pagination items array
     */
    createPaginationItems(currentPage, totalPages) {
        const items = [];

        if (totalPages <= 7) {
            // If few pages, show all
            for (let i = 0; i < totalPages; i++) {
                items.push({ type: 'page', page: i });
            }
        } else {
            // Always show first page
            items.push({ type: 'page', page: 0 });

            // Use ellipsis for range before current page if needed
            if (currentPage > 3) {
                items.push({ type: 'ellipsis' });
            }

            // Add pages around current
            const start = Math.max(1, currentPage - 1);
            const end = Math.min(totalPages - 2, currentPage + 1);

            for (let i = start; i <= end; i++) {
                if (i === 0 || i === totalPages - 1) continue; // Skip first and last
                items.push({ type: 'page', page: i });
            }

            // Use ellipsis for range after current page if needed
            if (currentPage < totalPages - 4) {
                items.push({ type: 'ellipsis' });
            }

            // Always show last page
            if (totalPages > 1) {
                items.push({ type: 'page', page: totalPages - 1 });
            }
        }

        return items;
    }
};

// UI Manager - Handles DOM manipulation and UI updates
const UIManager = {
    /**
     * Initialize UI
     */
    initialize() {
        // Cache DOM elements
        this.cacheElements();

        // Set up event listeners
        this.setupEventListeners();

        // Initialize Bootstrap modals
        this.initializeModals();

        // Set up network status listeners
        window.addEventListener('online', () => this.updateConnectionStatus('connected'));
        window.addEventListener('offline', () => this.updateConnectionStatus('disconnected'));

        // Set up window resize listener
        window.addEventListener('resize', () => {
            AppState.ui.isSidebarCollapsed = window.innerWidth < 768;
            this.updateSidebar();
        });

        // Load initial data
        this.loadChats();
    },

    /**
     * Cache DOM elements for quick access
     */
    cacheElements() {
        // Main containers
        AppState.elements.app = document.getElementById('app');
        AppState.elements.sidebar = document.querySelector('.sidebar');
        AppState.elements.mainContent = document.querySelector('.main-content');
        AppState.elements.chatMessages = document.querySelector('.chat-messages');
        AppState.elements.chatList = document.querySelector('.chat-list');

        // Input elements
        AppState.elements.searchInput = document.querySelector('.search-input input');
        AppState.elements.newMessageInput = document.querySelector('.chat-input');
        AppState.elements.fileInput = document.getElementById('attachments');

        // Modals
        AppState.elements.renameChatModal = document.getElementById('renameChatModal');
        AppState.elements.deleteChatModal = document.getElementById('deleteChatModal');
        AppState.elements.renameTitleInput = document.querySelector('#renameChatModal input');
    },

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Chat list
        document.querySelector('.new-chat-btn').addEventListener('click', () => this.createNewChat());

        // Search input
        AppState.elements.searchInput.addEventListener('input', (e) => {
            AppState.chat.searchQuery = e.target.value;
            this.renderChatList();
        });

        // Model dropdown
        document.querySelectorAll('.dropdown-models .dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.setModel(e.target.textContent.trim());
            });
        });

        // Chat input
        document.querySelector('.btn-send').addEventListener('click', () => this.sendMessage());
        AppState.elements.newMessageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // File upload
        AppState.elements.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));

        // Sidebar toggle
        document.querySelector('.mobile-toggle').addEventListener('click', () => this.toggleSidebar());

        // Modal actions
        if (AppState.elements.renameChatModal) {
            AppState.elements.renameChatModal.querySelector('.btn-primary').addEventListener('click', () => this.renameChat());
        }

        if (AppState.elements.deleteChatModal) {
            AppState.elements.deleteChatModal.querySelector('.btn-danger').addEventListener('click', () => this.deleteChat());
        }
    },

    /**
     * Initialize Bootstrap modals
     */
    initializeModals() {
        if (AppState.elements.renameChatModal) {
            AppState.modalRename = new bootstrap.Modal(AppState.elements.renameChatModal);
            AppState.elements.renameChatModal.addEventListener('hidden.bs.modal', () => {
                AppState.chat.chatToRename = null;
                AppState.chat.newChatTitle = '';
            });
        }

        if (AppState.elements.deleteChatModal) {
            AppState.modalDelete = new bootstrap.Modal(AppState.elements.deleteChatModal);
            AppState.elements.deleteChatModal.addEventListener('hidden.bs.modal', () => {
                AppState.chat.chatToDelete = null;
            });
        }
    },

    /**
     * Update UI based on current state
     */
    updateUI() {
        this.updateSidebar();
        this.renderChatList();
        this.renderChatMessages();
        this.updateConnectionStatus(AppState.ui.connectionStatus);
    },

    /**
     * Update sidebar state
     */
    updateSidebar() {
        if (AppState.ui.isSidebarCollapsed) {
            AppState.elements.sidebar.classList.add('collapsed');
        } else {
            AppState.elements.sidebar.classList.remove('collapsed');
        }
    },

    /**
     * Toggle sidebar collapsed state
     */
    toggleSidebar() {
        AppState.ui.isSidebarCollapsed = !AppState.ui.isSidebarCollapsed;
        this.updateSidebar();
    },

    /**
     * Update connection status indicator
     */
    updateConnectionStatus(status) {
        AppState.ui.connectionStatus = status;

        // Remove existing status element
        const existingStatus = document.querySelector('.connection-status');
        if (existingStatus) {
            existingStatus.remove();
        }

        // Don't show if connected
        if (status === 'connected') return;

        // Create new status element
        const statusEl = document.createElement('div');
        statusEl.className = `connection-status connection-status-${status}`;

        const iconEl = document.createElement('div');
        iconEl.className = 'connection-status-icon';
        statusEl.appendChild(iconEl);

        const textEl = document.createElement('span');
        textEl.textContent = status === 'reconnecting' ? 'Reconnecting...' : 'Disconnected';
        statusEl.appendChild(textEl);

        document.body.appendChild(statusEl);

        // Show error notification
        if (status === 'disconnected') {
            this.showErrorNotification(
                'Connection Lost',
                'The connection to the server was lost. Attempting to reconnect...'
            );
        } else if (status === 'connected' && AppState.ui.reconnectCount > 0) {
            this.showErrorNotification(
                'Connection Restored',
                'The connection has been successfully restored.',
                3000
            );
        }
    },

    /**
     * Show error notification toast
     */
    showErrorNotification(title, message, duration = 5000) {
        AppState.ui.errorToast = {
            visible: true,
            title: title || 'Error',
            message: message || 'An unexpected error occurred'
        };

        // Remove existing toast
        const existingToast = document.querySelector('.error-toast');
        if (existingToast) {
            existingToast.remove();
        }

        // Create new toast
        const toastEl = document.createElement('div');
        toastEl.className = 'error-toast show';

        const headerEl = document.createElement('div');
        headerEl.className = 'error-toast-header';

        const titleEl = document.createElement('span');
        titleEl.className = 'error-toast-title';
        titleEl.textContent = title;
        headerEl.appendChild(titleEl);

        const closeEl = document.createElement('button');
        closeEl.className = 'error-toast-close';
        closeEl.innerHTML = '&times;';
        closeEl.addEventListener('click', () => this.hideErrorNotification());
        headerEl.appendChild(closeEl);

        toastEl.appendChild(headerEl);

        const bodyEl = document.createElement('div');
        bodyEl.className = 'error-toast-body';
        bodyEl.textContent = message;
        toastEl.appendChild(bodyEl);

        document.body.appendChild(toastEl);

        // Auto-hide after duration
        if (duration > 0) {
            setTimeout(() => this.hideErrorNotification(), duration);
        }
    },

    /**
     * Hide error notification
     */
    hideErrorNotification() {
        AppState.ui.errorToast.visible = false;

        const toast = document.querySelector('.error-toast');
        if (toast) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }
    },

    /**
     * Load chats from server
     */
    async loadChats() {
        try {
            const response = await API.getChats(0, 50, true);
            if (response && response.content) {
                AppState.chat.chats = response.content || [];

                // If there are chats but no chat is selected, select the first one
                if (AppState.chat.chats.length > 0 && !AppState.chat.currentChat) {
                    this.selectChat(AppState.chat.chats[0]);
                }

                this.renderChatList();
            }
        } catch (error) {
            console.error('Failed to load chats:', error);
            this.showErrorNotification('Error', 'Failed to load chats');
        }
    },

    /**
     * Render chat list in sidebar
     */
    renderChatList() {
        if (!AppState.elements.chatList) return;

        // Clear existing list
        AppState.elements.chatList.innerHTML = '';

        // Filter chats if search query exists
        const filteredChats = AppState.chat.searchQuery
            ? AppState.chat.chats.filter(chat =>
                chat.title.toLowerCase().includes(AppState.chat.searchQuery.toLowerCase()))
            : AppState.chat.chats;

        // Create chat items
        if (filteredChats.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'text-center text-muted mt-3';
            emptyEl.innerHTML = '<small>Нет доступных чатов</small>';
            AppState.elements.chatList.appendChild(emptyEl);
            return;
        }

        filteredChats.forEach(chat => {
            const chatItemEl = document.createElement('div');
            chatItemEl.className = 'chat-item';
            if (AppState.chat.currentChat && AppState.chat.currentChat.id === chat.id) {
                chatItemEl.classList.add('active');
            }

            const chatTitleEl = document.createElement('div');
            chatTitleEl.className = 'chat-title';
            chatTitleEl.textContent = chat.title;
            chatTitleEl.setAttribute('title', chat.title);
            chatItemEl.appendChild(chatTitleEl);

            const actionsEl = document.createElement('div');
            actionsEl.className = 'chat-actions';

            const renameBtn = document.createElement('button');
            renameBtn.className = 'btn btn-sm btn-link p-0 me-2 text-white';
            renameBtn.innerHTML = '<i class="bi bi-pencil"></i>';
            renameBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showRenameModal(chat);
            });
            actionsEl.appendChild(renameBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-link p-0 text-white';
            deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showDeleteModal(chat);
            });
            actionsEl.appendChild(deleteBtn);

            chatItemEl.appendChild(actionsEl);

            // Add click event to select chat
            chatItemEl.addEventListener('click', () => this.selectChat(chat));

            AppState.elements.chatList.appendChild(chatItemEl);
        });
    },

    /**
     * Load chat history
     */
    async loadChatHistory(chatId, page = 0, size = 20) {
        if (!chatId) {
            console.error('Cannot load chat history: chatId is undefined');
            return;
        }

        try {
            const response = await API.getChatHistory(chatId, page, size);

            if (response && response.content) {
                AppState.chat.messages = response.content || [];
                AppState.chat.currentPage = response.page || 0;
                AppState.chat.totalPages = response.totalPages || 0;

                this.renderChatMessages();
                this.renderPagination();
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
            this.showErrorNotification('Error', 'Failed to load chat history');
        }
    },

    /**
     * Render chat messages
     */
    renderChatMessages() {
        // Get the messages container
        const messagesContainer = document.querySelector('.chat-messages');
        if (!messagesContainer) return;

        // Clear existing messages
        messagesContainer.innerHTML = '';

        // Render each message
        AppState.chat.messages.forEach(message => {
            const messageEl = document.createElement('div');
            messageEl.className = `message ${message.type.toLowerCase()}-message`;

            if (AppState.chat.isStreaming && message.id && message.id.startsWith('temp-assistant')) {
                messageEl.classList.add('streaming-message');
            }

            const contentEl = document.createElement('div');
            contentEl.className = 'message-content';
            contentEl.innerHTML = Utils.formatMessageContent(
                message.content,
                AppState.chat.isStreaming && message.id && message.id.startsWith('temp-assistant'),
                AppState.chat.lastContentLength,
                message.id
            );
            messageEl.appendChild(contentEl);

            // Add attachments if any
            if (message.attachments && message.attachments.length > 0) {
                const attachmentsEl = document.createElement('div');
                attachmentsEl.className = 'message-attachments mt-2';

                message.attachments.forEach(attachment => {
                    const attachmentEl = document.createElement('div');
                    attachmentEl.className = 'attachment-badge';
                    attachmentEl.innerHTML = `<i class="bi bi-paperclip"></i> ${attachment.filename}`;
                    attachmentsEl.appendChild(attachmentEl);
                });

                messageEl.appendChild(attachmentsEl);
            }

            // Add timestamp
            const timeEl = document.createElement('div');
            timeEl.className = 'message-time';
            timeEl.textContent = Utils.formatTime(message.timestamp);
            messageEl.appendChild(timeEl);

            messagesContainer.appendChild(messageEl);
        });

        // Add typing indicator for non-streaming responses
        if (AppState.chat.isTyping && !AppState.chat.isStreaming) {
            const typingEl = document.createElement('div');
            typingEl.className = 'typing-indicator';
            typingEl.innerHTML = `
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            `;
            messagesContainer.appendChild(typingEl);
        }

        // Scroll to bottom
        Utils.animateScrollToBottom(messagesContainer);
    },

    /**
     * Render pagination controls
     */
    renderPagination() {
        const paginationContainer = document.querySelector('nav[aria-label="История сообщений"]');
        if (!paginationContainer) return;

        // Hide pagination if only one page
        if (AppState.chat.totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }

        paginationContainer.style.display = 'flex';

        // Get pagination list
        const paginationList = paginationContainer.querySelector('ul.pagination');
        if (!paginationList) return;

        // Clear existing pagination
        paginationList.innerHTML = '';

        // Add previous button
        const prevItem = document.createElement('li');
        prevItem.className = 'page-item';
        if (AppState.chat.currentPage === 0) {
            prevItem.classList.add('disabled');
        }

        const prevLink = document.createElement('a');
        prevLink.className = 'page-link';
        prevLink.href = '#';
        prevLink.textContent = 'Назад';
        prevLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (AppState.chat.currentPage > 0) {
                this.changePage(AppState.chat.currentPage - 1);
            }
        });

        prevItem.appendChild(prevLink);
        paginationList.appendChild(prevItem);

        // Add page numbers
        const paginationItems = Utils.createPaginationItems(
            AppState.chat.currentPage,
            AppState.chat.totalPages
        );

        paginationItems.forEach(item => {
            const listItem = document.createElement('li');

            if (item.type === 'page') {
                listItem.className = 'page-item';
                if (AppState.chat.currentPage === item.page) {
                    listItem.classList.add('active');
                }

                const pageLink = document.createElement('a');
                pageLink.className = 'page-link';
                pageLink.href = '#';
                pageLink.textContent = item.page + 1;
                pageLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.changePage(item.page);
                });

                listItem.appendChild(pageLink);
            } else {
                listItem.className = 'page-item disabled';

                const ellipsis = document.createElement('span');
                ellipsis.className = 'page-link';
                ellipsis.textContent = '...';

                listItem.appendChild(ellipsis);
            }

            paginationList.appendChild(listItem);
        });

        // Add next button
        const nextItem = document.createElement('li');
        nextItem.className = 'page-item';
        if (AppState.chat.currentPage === AppState.chat.totalPages - 1) {
            nextItem.classList.add('disabled');
        }

        const nextLink = document.createElement('a');
        nextLink.className = 'page-link';
        nextLink.href = '#';
        nextLink.textContent = 'Вперёд';
        nextLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (AppState.chat.currentPage < AppState.chat.totalPages - 1) {
                this.changePage(AppState.chat.currentPage + 1);
            }
        });

        nextItem.appendChild(nextLink);
        paginationList.appendChild(nextItem);
    },

    /**
     * Change current page
     */
    changePage(page) {
        if (page < 0 || page >= AppState.chat.totalPages || !AppState.chat.currentChat) return;
        this.loadChatHistory(AppState.chat.currentChat.id, page);
    },

    /**
     * Select a chat
     */
    selectChat(chat) {
        if (!chat || !chat.id) {
            console.error('Invalid chat selected');
            return;
        }

        AppState.chat.currentChat = chat;
        AppState.chat.currentPage = 0;
        AppState.chat.messages = [];  // Clear messages before loading new ones

        // Update UI to show current chat
        this.updateChatHeader();
        this.renderChatList();

        // Load chat history
        this.loadChatHistory(chat.id, 0, 20);

        // On mobile, collapse sidebar after selecting a chat
        if (window.innerWidth < 768) {
            AppState.ui.isSidebarCollapsed = true;
            this.updateSidebar();
        }
    },

    /**
     * Update chat header with current chat info
     */
    updateChatHeader() {
        const chatHeader = document.querySelector('.chat-header');
        if (!chatHeader || !AppState.chat.currentChat) return;

        // Update chat title
        const titleElement = chatHeader.querySelector('h5');
        if (titleElement) {
            titleElement.textContent = AppState.chat.currentChat.title;
        }

        // Show header and empty state
        const mainContent = document.querySelector('.main-content');
        const emptyState = document.querySelector('.empty-state');
        const messagesContainer = document.querySelector('.chat-messages');
        const chatInputContainer = document.querySelector('.chat-input-container');

        if (mainContent && emptyState && messagesContainer && chatInputContainer) {
            if (AppState.chat.currentChat) {
                emptyState.style.display = 'none';
                chatHeader.style.display = 'flex';
                messagesContainer.style.display = 'block';
                chatInputContainer.style.display = 'flex';
            } else {
                emptyState.style.display = 'flex';
                chatHeader.style.display = 'none';
                messagesContainer.style.display = 'none';
                chatInputContainer.style.display = 'none';
            }
        }
    },

    /**
     * Create a new chat
     */
    async createNewChat() {
        try {
            const newChat = await API.createChat(AppState.chat.currentModel);
            if (newChat) {
                AppState.chat.chats.unshift(newChat);
                this.selectChat(newChat);
                return newChat;
            }
        } catch (error) {
            console.error('Failed to create chat:', error);
            this.showErrorNotification('Error', 'Failed to create a new chat');
            return null;
        }
    },

    /**
     * Set the current model
     */
    setModel(model) {
        if (model && typeof model === 'string') {
            AppState.chat.currentModel = model;

            // Update dropdown button text
            const modelDropdownButton = document.querySelector('#modelsDropdown');
            if (modelDropdownButton) {
                const spanElement = modelDropdownButton.querySelector('span');
                if (spanElement) {
                    spanElement.textContent = model;
                }
            }
        }
    },

    /**
     * Show rename modal
     */
    showRenameModal(chat) {
        AppState.chat.chatToRename = chat;
        if (!AppState.elements.renameTitleInput || !AppState.modalRename) return;

        AppState.elements.renameTitleInput.value = chat.title;
        AppState.modalRename.show();
    },

    /**
     * Rename current chat
     */
    async renameChat() {
        if (!AppState.chat.chatToRename || !AppState.elements.renameTitleInput) return;

        const newTitle = AppState.elements.renameTitleInput.value.trim();
        if (!newTitle) return;

        try {
            const updatedChat = await API.updateChatTitle(AppState.chat.chatToRename.id, newTitle);

            // Update chat in list
            const index = AppState.chat.chats.findIndex(c => c.id === updatedChat.id);
            if (index !== -1) {
                AppState.chat.chats[index] = updatedChat;
            }

            // Update current chat if it's the same one
            if (AppState.chat.currentChat && AppState.chat.currentChat.id === updatedChat.id) {
                AppState.chat.currentChat = updatedChat;
                this.updateChatHeader();
            }

            // Update chat list
            this.renderChatList();

            // Hide modal
            if (AppState.modalRename) {
                AppState.modalRename.hide();
            }
        } catch (error) {
            console.error('Error renaming chat:', error);
            this.showErrorNotification('Error', 'Failed to rename chat');
        }
    },

    /**
     * Show delete confirmation modal
     */
    showDeleteModal(chat) {
        AppState.chat.chatToDelete = chat;

        // Update modal content
        const modalBody = document.querySelector('#deleteChatModal .modal-body p');
        if (modalBody) {
            modalBody.textContent = `Вы уверены, что хотите удалить чат "${chat.title}"?`;
        }

        // Show modal
        if (AppState.modalDelete) {
            AppState.modalDelete.show();
        }
    },

    /**
     * Delete the selected chat
     */
    async deleteChat() {
        if (!AppState.chat.chatToDelete) return;

        try {
            await API.deleteChat(AppState.chat.chatToDelete.id);

            // Remove chat from list
            AppState.chat.chats = AppState.chat.chats.filter(c => c.id !== AppState.chat.chatToDelete.id);

            // Clear current chat if it was the deleted one
            if (AppState.chat.currentChat && AppState.chat.currentChat.id === AppState.chat.chatToDelete.id) {
                AppState.chat.currentChat = null;
                AppState.chat.messages = [];
                this.updateChatHeader();
            }

            // Update chat list
            this.renderChatList();

            // Hide modal
            if (AppState.modalDelete) {
                AppState.modalDelete.hide();
            }
        } catch (error) {
            console.error('Error deleting chat:', error);
            this.showErrorNotification('Error', 'Failed to delete chat');
        }
    },

    /**
     * Archive a chat
     */
    async archiveChat(chatId) {
        if (!confirm('Are you sure you want to archive this chat?')) return;

        try {
            await API.archiveChat(chatId);

            // Remove chat from list
            AppState.chat.chats = AppState.chat.chats.filter(c => c.id !== chatId);

            // Clear current chat if it was the archived one
            if (AppState.chat.currentChat && AppState.chat.currentChat.id === chatId) {
                AppState.chat.currentChat = null;
                AppState.chat.messages = [];
                this.updateChatHeader();
            }

            // Update chat list
            this.renderChatList();
        } catch (error) {
            console.error('Error archiving chat:', error);
            this.showErrorNotification('Error', 'Failed to archive chat');
        }
    },

    /**
     * Handle file upload
     */
    handleFileUpload(event) {
        const files = event.target.files;
        if (!files || !files.length) return;

        // Clear selected files display
        const fileListElement = document.querySelector('.file-list');
        if (fileListElement) {
            fileListElement.innerHTML = '';
        }

        // Add files to state
        AppState.chat.selectedFiles = Array.from(files);

        // Create file items in UI
        AppState.chat.selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.textContent = file.name;

            const removeButton = document.createElement('span');
            removeButton.className = 'file-remove';
            removeButton.textContent = '×';
            removeButton.addEventListener('click', () => this.removeFile(index));

            fileItem.appendChild(removeButton);

            if (fileListElement) {
                fileListElement.appendChild(fileItem);
            }
        });

        // Reset input so the same file can be selected again
        event.target.value = '';
    },

    /**
     * Remove a file from selected files
     */
    removeFile(index) {
        if (index >= 0 && index < AppState.chat.selectedFiles.length) {
            // Remove from state
            AppState.chat.selectedFiles.splice(index, 1);

            // Update UI
            const fileListElement = document.querySelector('.file-list');
            if (fileListElement) {
                fileListElement.innerHTML = '';

                // Recreate file items
                AppState.chat.selectedFiles.forEach((file, i) => {
                    const fileItem = document.createElement('div');
                    fileItem.className = 'file-item';
                    fileItem.textContent = file.name;

                    const removeButton = document.createElement('span');
                    removeButton.className = 'file-remove';
                    removeButton.textContent = '×';
                    removeButton.addEventListener('click', () => this.removeFile(i));

                    fileItem.appendChild(removeButton);
                    fileListElement.appendChild(fileItem);
                });
            }
        }
    },

    /**
     * Send a message
     */
    async sendMessage() {
        const messageInput = document.querySelector('.chat-input');
        if (!messageInput || !messageInput.value.trim() || AppState.chat.isTyping) return;

        const messageText = messageInput.value;
        messageInput.value = '';

        // Check if currentChat exists
        if (!AppState.chat.currentChat || !AppState.chat.currentChat.id) {
            // Create a new chat if none exists
            try {
                const newChat = await this.createNewChat();
                if (!newChat) {
                    console.error('Failed to create a new chat before sending message');
                    this.showErrorNotification('Error', 'Failed to create a new chat');
                    return;
                }
            } catch (error) {
                console.error('Failed to create a new chat before sending message:', error);
                this.showErrorNotification('Error', 'Failed to create a new chat');
                return;
            }
        }

        // Double-check that currentChat now exists and has an id
        if (!AppState.chat.currentChat || !AppState.chat.currentChat.id) {
            console.error('No valid chat available to send message to');
            this.showErrorNotification('Error', 'No chat available to send message to');
            return;
        }

        // Ensure messages array is initialized
        if (!AppState.chat.messages) {
            AppState.chat.messages = [];
        }

        // Initialize lastContentLength if not already done
        if (!AppState.chat.lastContentLength) {
            AppState.chat.lastContentLength = {};
        }

        // Reset streaming state
        AppState.chat.streamingMessage = '';
        AppState.ui.reconnectCount = 0;
        AppState.ui.lastActivityTimestamp = Date.now();

        // Start the heartbeat connection
        this.startHeartbeat();

        // Add user message to the chat
        const userMessage = {
            id: 'temp-' + Date.now(),
            chatId: AppState.chat.currentChat.id,
            type: 'USER',
            content: messageText,
            timestamp: new Date().toISOString()
        };

        AppState.chat.messages.push(userMessage);

        // Initialize streaming state
        AppState.chat.isTyping = true;
        AppState.chat.isStreaming = true;
        AppState.chat.streamingChatId = AppState.chat.currentChat.id;

        // Add placeholder for assistant's response
        const tempAssistantId = 'temp-assistant-' + Date.now();
        const assistantMessage = {
            id: tempAssistantId,
            chatId: AppState.chat.currentChat.id,
            type: 'ASSISTANT',
            content: '',
            timestamp: new Date().toISOString()
        };

        AppState.chat.messages.push(assistantMessage);

        // Initialize content length tracker
        if (!AppState.chat.lastContentLength[tempAssistantId]) {
            AppState.chat.lastContentLength[tempAssistantId] = 0;
        }

        // Update UI with new messages
        this.renderChatMessages();

        try {
            // Prepare form data
            const formData = new FormData();
            formData.append('model', AppState.chat.currentModel);
            formData.append('prompt', messageText);
            formData.append('role', 'helpful assistant');
            formData.append('chatId', AppState.chat.currentChat.id);

            // Add files if they exist
            if (AppState.chat.selectedFiles && AppState.chat.selectedFiles.length > 0) {
                AppState.chat.selectedFiles.forEach(file => {
                    formData.append('attachments', file);
                });

                // Clear selected files
                AppState.chat.selectedFiles = [];

                // Clear file list in UI
                const fileListElement = document.querySelector('.file-list');
                if (fileListElement) {
                    fileListElement.innerHTML = '';
                }
            }

            // Send streaming request
            const response = await API.sendStreamingMessage(formData);

            // Process streaming response
            const self = this;
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

    /**
     * Update streaming message with new content
     */
    updateStreamingMessage(messageId, newContent) {
        // Initialize streamingMessage if needed
        if (!AppState.chat.streamingMessage) {
            AppState.chat.streamingMessage = '';
        }

        // Add new content
        AppState.chat.streamingMessage += newContent;

        // Find and update the message
        const messageIndex = AppState.chat.messages.findIndex(m => m.id === messageId);
        if (messageIndex !== -1) {
            AppState.chat.messages[messageIndex].content = AppState.chat.streamingMessage;

            // Update the message in the DOM
            const messageElements = document.querySelectorAll('.message.assistant-message');
            if (messageElements && messageElements.length > 0) {
                const lastMessageElement = messageElements[messageElements.length - 1];
                const contentElement = lastMessageElement.querySelector('.message-content');

                if (contentElement) {
                    contentElement.innerHTML = Utils.formatMessageContent(
                        AppState.chat.streamingMessage,
                        true,
                        AppState.chat.lastContentLength,
                        messageId
                    );
                }
            }

            // Scroll to bottom
            const messagesContainer = document.querySelector('.chat-messages');
            if (messagesContainer) {
                Utils.animateScrollToBottom(messagesContainer);
            }
        }
    },

    /**
     * Handle streaming errors
     */
    handleStreamingError(messageId, error) {
        console.error('Streaming error:', error);

        // Show error in UI
        this.showErrorNotification(
            'Message Error',
            error.message || 'Error generating response'
        );

        // Update the message with error indication
        const messageIndex = AppState.chat.messages.findIndex(m => m.id === messageId);
        if (messageIndex !== -1) {
            const currentContent = AppState.chat.messages[messageIndex].content;

            let errorMessage;
            if (currentContent) {
                errorMessage = currentContent + "\n\n⚠️ *Response was interrupted due to an error.*";
            } else {
                errorMessage = "⚠️ *Unable to generate a response. Please try again.*";
            }

            // Update the message
            AppState.chat.messages[messageIndex].content = errorMessage;

            // Update the message in the DOM
            const messageElements = document.querySelectorAll('.message.assistant-message');
            if (messageElements && messageElements.length > 0) {
                const lastMessageElement = messageElements[messageElements.length - 1];
                const contentElement = lastMessageElement.querySelector('.message-content');

                if (contentElement) {
                    contentElement.innerHTML = Utils.formatMessageContent(
                        errorMessage,
                        false,
                        AppState.chat.lastContentLength,
                        messageId
                    );
                }
            }
        }

        // Reset streaming state
        this.finalizeStreaming();
    },

    /**
     * Finalize the streaming response
     */
    finalizeStreaming() {
        AppState.chat.isTyping = false;
        AppState.chat.isStreaming = false;

        // Refresh chat history to get final message IDs
        setTimeout(() => {
            if (AppState.chat.currentChat && AppState.chat.currentChat.id) {
                this.loadChatHistory(AppState.chat.currentChat.id, 0);
                this.loadChats();
            }
        }, 500);
    },

    /**
     * Start heartbeat to keep connection alive
     */
    startHeartbeat() {
        // Clear existing heartbeat timer if any
        if (AppState.ui.heartbeatTimer) {
            clearInterval(AppState.ui.heartbeatTimer);
            AppState.ui.heartbeatTimer = null;
        }

        // Update timestamp
        AppState.ui.lastActivityTimestamp = Date.now();

        // Check if EventSource is supported
        if (typeof EventSource !== 'undefined') {
            try {
                const heartbeatSource = new EventSource('/chat/streaming/heartbeat');

                heartbeatSource.addEventListener('heartbeat', (event) => {
                    console.log('Heartbeat received:', event.data);
                    // Update last activity time
                    AppState.ui.lastActivityTimestamp = Date.now();
                });

                heartbeatSource.addEventListener('error', () => {
                    console.warn('Heartbeat connection error, reconnecting...');
                    heartbeatSource.close();

                    // Reconnect after a brief delay
                    setTimeout(() => {
                        this.startHeartbeat();
                    }, 3000);
                });

                // Set up an interval to check for stale connections
                AppState.ui.heartbeatTimer = setInterval(() => {
                    const now = Date.now();
                    const elapsed = now - AppState.ui.lastActivityTimestamp;

                    // If no activity for 30 seconds and streaming is active, consider connection stale
                    if (elapsed > 30000 && AppState.chat.isStreaming) {
                        console.warn('Connection appears stale, restarting heartbeat');
                        heartbeatSource.close();
                        this.startHeartbeat();
                    }
                }, 15000);
            } catch (error) {
                console.error('Failed to start heartbeat:', error);
            }
        }
    },

    /**
     * Clean up resources on shutdown
     */
    cleanup() {
        if (AppState.ui.heartbeatTimer) {
            clearInterval(AppState.ui.heartbeatTimer);
            AppState.ui.heartbeatTimer = null;
        }
    }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    try {
        UIManager.initialize();
    } catch (error) {
        console.error('Error initializing application:', error);
        alert('An error occurred while initializing the application. Please refresh the page.');
    }
});