/**
 * ErrorToast component
 * Displays error notifications
 */
const ErrorToast = {
    template: '#error-toast-template',
    
    props: {
        title: {
            type: String,
            default: 'Error'
        },
        message: {
            type: String,
            default: 'An error occurred'
        },
        visible: {
            type: Boolean,
            default: false
        }
    },
    
    methods: {
        close() {
            this.$emit('close');
        }
    }
};
