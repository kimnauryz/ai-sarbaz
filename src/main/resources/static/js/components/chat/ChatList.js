/**
 * ChatList component
 * Sidebar with list of available chats
 */
const ChatList = {
    template: '#chat-list-template',
    
    props: {
        chats: {
            type: Array,
            required: true
        },
        currentChat: {
            type: Object,
            default: null
        },
        searchQuery: {
            type: String,
            default: ''
        },
        currentModel: {
            type: String,
            required: true
        },
        isSidebarCollapsed: {
            type: Boolean,
            default: false
        },
        availableModels: {
            type: Array,
            default: () => Utils.availableModels
        }
    },
    
    computed: {
        filteredChats() {
            if (!this.searchQuery) return this.chats;
            
            const query = this.searchQuery.toLowerCase();
            return this.chats.filter(chat => 
                chat.title.toLowerCase().includes(query)
            );
        }
    },
    
    methods: {
        selectChat(chat) {
            this.$emit('select-chat', chat);
        },
        
        createNewChat() {
            this.$emit('create-chat');
        },
        
        showRenameModal(chat) {
            this.$emit('show-rename-modal', chat);
        },
        
        showDeleteModal(chat) {
            this.$emit('show-delete-modal', chat);
        },
        
        setModel(model) {
            this.$emit('set-model', model);
        },
        
        loadChats() {
            this.$emit('load-chats');
        }
    }
};
