/**
 * ChatInput component
 * Message input and file upload
 */
const ChatInput = {
    template: '#chat-input-template',
    
    data() {
        return {
            message: '',
        };
    },
    
    props: {
        isStreaming: {
            type: Boolean,
            default: false
        },
        selectedFiles: {
            type: Array,
            required: true
        }
    },
    
    methods: {
        sendMessage() {
            if (!this.message.trim() || this.isStreaming) return;
            
            this.$emit('send', this.message);
            this.message = '';
        },
        
        handleEnterKey(event) {
            // Send on Enter, but not on Shift+Enter
            if (!event.shiftKey) {
                this.sendMessage();
            }
        },
        
        handleFileUpload(event) {
            this.$emit('file-upload', event);
        },
        
        removeFile(index) {
            this.$emit('remove-file', index);
        }
    }
};
