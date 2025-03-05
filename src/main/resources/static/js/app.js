/**
 * Main application file
 * Mounts the Vue application and initializes components
 */

// Main app component
const App = {
    // Use specific components
    components: {
        ConnectionStatus,
        ErrorToast,
        ChatList,
        ChatMessage,
        ChatInput,
        RenameModal,
        DeleteModal
    },

    // Setup the application
    setup() {
        // Initialize the store
        Store.initialize();

        // Create a ref for the messages container element
        const messagesContainer = Vue.ref(null);

        // Watch for message changes to scroll to bottom
        Vue.watch(
            () => Chat_Store.messages,
            () => {
                Vue.nextTick(() => {
                    if (messagesContainer.value) {
                        Utils.animateScrollToBottom(messagesContainer.value);
                    }
                });
            },
            { deep: true }
        );

        // Computed property for pagination
        const paginationItems = Vue.computed(() => {
            const items = [];
            const totalPages = Chat_Store.totalPages;
            const currentPage = Chat_Store.currentPage;

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
        });

        // Handle modal confirm actions
        const handleRenameConfirm = (newTitle) => {
            Chat_Store.renameChat(newTitle);
        };

        const handleDeleteConfirm = () => {
            Chat_Store.deleteChat();
        };

        // Lifecycle hooks
        Vue.onMounted(() => {
            // Initialize Bootstrap modals after the DOM is ready
            Vue.nextTick(() => {
                try {
                    const renameModalEl = document.getElementById('renameChatModal');
                    const deleteModalEl = document.getElementById('deleteChatModal');

                    if (renameModalEl) {
                        Chat_Store.modalRename = new bootstrap.Modal(renameModalEl);

                        // Set up modal events for proper cleanup
                        renameModalEl.addEventListener('hidden.bs.modal', () => {
                            Chat_Store.chatToRename = null;
                            Chat_Store.newChatTitle = '';
                        });
                    }

                    if (deleteModalEl) {
                        Chat_Store.modalDelete = new bootstrap.Modal(deleteModalEl);

                        // Set up modal events for proper cleanup
                        deleteModalEl.addEventListener('hidden.bs.modal', () => {
                            Chat_Store.chatToDelete = null;
                        });
                    }
                } catch (error) {
                    console.error('Error initializing modals:', error);
                }
            });
        });

        Vue.onUnmounted(() => {
            // Clean up
            UI_Store.cleanup();

            // Dispose modals
            if (Chat_Store.modalRename) {
                Chat_Store.modalRename.dispose();
            }

            if (Chat_Store.modalDelete) {
                Chat_Store.modalDelete.dispose();
            }
        });

        return {
            // Store references
            ui: UI_Store,
            chat: Chat_Store,

            // Utility values
            Utils,
            messagesContainer,
            paginationItems,

            // Modal handlers
            handleRenameConfirm,
            handleDeleteConfirm,

            // Utility methods
            formatTime: Utils.formatTime,
            formatMessageContent: Utils.formatMessageContent
        };
    },

    // HTML template for the entire application
    template: `
        <connection-status :status="ui.connectionStatus" />
        
        <error-toast 
            :title="ui.errorToast.title" 
            :message="ui.errorToast.message"
            :visible="ui.errorToast.visible"
            @close="ui.hideErrorNotification"
        />
        
        <chat-list 
            :chats="chat.chats" 
            :current-chat="chat.currentChat"
            :search-query="chat.searchQuery"
            :current-model="chat.currentModel"
            :is-sidebar-collapsed="ui.isSidebarCollapsed"
            :available-models="Utils.availableModels"
            @select-chat="chat.selectChat"
            @create-chat="chat.createNewChat"
            @show-rename-modal="chat.showRenameModal"
            @show-delete-modal="chat.showDeleteModal"
            @set-model="chat.setModel"
            @load-chats="chat.loadChats"
        />
        
        <div class="main-content">
            <div v-if="!chat.currentChat" class="empty-state">
                <i class="bi bi-chat-dots"></i>
                <h3>Выберите чат или начните новый</h3>
                <p>Используйте кнопку "Новый чат" слева для создания беседы</p>
            </div>
            
            <template v-else>
                <div class="chat-header">
                    <div class="d-flex align-items-center">
                        <button class="btn btn-sm btn-link p-0 mobile-toggle" @click="ui.toggleSidebar">
                            <i class="bi bi-list fs-4"></i>
                        </button>
                        <h5 class="mb-0">{{ chat.currentChat.title }}</h5>
                    </div>
                    
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-secondary" @click="chat.showRenameModal(chat.currentChat)">
                            <i class="bi bi-pencil me-1"></i> Переименовать
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" @click="chat.archiveChat(chat.currentChat.id)">
                            <i class="bi bi-archive me-1"></i> Архивировать
                        </button>
                        <button class="btn btn-sm btn-outline-danger" @click="chat.showDeleteModal(chat.currentChat)">
                            <i class="bi bi-trash me-1"></i> Удалить
                        </button>
                    </div>
                </div>
                
                <div class="chat-messages" ref="messagesContainer">
                    <chat-message 
                        v-for="(message, index) in chat.messages" 
                        :key="message.id || index"
                        :message="message"
                        :is-streaming="chat.isStreaming"
                    />
                    
                    <!-- Typing indicator for non-streaming responses -->
                    <div v-if="chat.isTyping && !chat.isStreaming" class="typing-indicator">
                        <div class="typing-dots">
                            <div class="typing-dot"></div>
                            <div class="typing-dot"></div>
                            <div class="typing-dot"></div>
                        </div>
                    </div>
                </div>
                
                <nav v-if="chat.totalPages > 1" aria-label="История сообщений" class="d-flex justify-content-center mt-2">
                    <ul class="pagination pagination-sm">
                        <li class="page-item" :class="{ 'disabled': chat.currentPage === 0 }">
                            <a class="page-link" href="#" @click.prevent="chat.changePage(chat.currentPage - 1)">Назад</a>
                        </li>
                        
                        <template v-for="item in paginationItems" :key="item.page || 'ellipsis'">
                            <li v-if="item.type === 'page'" class="page-item" :class="{ 'active': chat.currentPage === item.page }">
                                <a class="page-link" href="#" @click.prevent="chat.changePage(item.page)">{{ item.page + 1 }}</a>
                            </li>
                            <li v-else class="page-item disabled">
                                <span class="page-link">...</span>
                            </li>
                        </template>
                        
                        <li class="page-item" :class="{ 'disabled': chat.currentPage === chat.totalPages - 1 }">
                            <a class="page-link" href="#" @click.prevent="chat.changePage(chat.currentPage + 1)">Вперёд</a>
                        </li>
                    </ul>
                </nav>
                
                <chat-input 
                    :is-streaming="chat.isStreaming"
                    :selected-files="chat.selectedFiles"
                    @send="chat.sendMessage"
                    @file-upload="chat.handleFileUpload"
                    @remove-file="chat.removeFile"
                />
            </template>
        </div>
        
        <rename-modal 
            :chat="chat.chatToRename"
            @confirm="handleRenameConfirm"
        />
        
        <delete-modal 
            :chat="chat.chatToDelete"
            @confirm="handleDeleteConfirm"
        />
    `
};

// Create and mount the Vue application
document.addEventListener('DOMContentLoaded', () => {
    const app = Vue.createApp(App);

    // Global error handler
    app.config.errorHandler = (err, vm, info) => {
        console.error('Vue error:', err);
        console.error('Component:', vm);
        console.error('Info:', info);

        // Show error notification
        if (UI_Store) {
            UI_Store.showErrorNotification(
                'Application Error',
                'Something went wrong in the application. Please try refreshing the page.'
            );
        }
    };

    app.mount('#app');
});