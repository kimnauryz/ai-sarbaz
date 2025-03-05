/**
 * ChatMessage component
 * Displays a message in the chat
 */
const ChatMessage = {
    template: '#chat-message-template',
    
    components: {
        MessageAttachment
    },
    
    props: {
        message: {
            type: Object,
            required: true
        },
        isStreaming: {
            type: Boolean,
            default: false
        }
    },
    
    computed: {
        formattedTime() {
            return Utils.formatTime(this.message.timestamp);
        },
        
        formattedContent() {
            return Utils.formatMessageContent(
                this.message.content,
                this.isStreaming && this.message.id.startsWith('temp-assistant'),
                Store.chat.lastContentLength,
                this.message.id
            );
        }
    }
};
