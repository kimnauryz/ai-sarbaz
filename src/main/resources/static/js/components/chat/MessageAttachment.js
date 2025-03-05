/**
 * MessageAttachment component
 * Displays an attachment in a message
 */
const MessageAttachment = {
    template: '#message-attachment-template',
    
    props: {
        attachment: {
            type: Object,
            required: true
        }
    }
};
