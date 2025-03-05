/**
 * DeleteModal component
 * Modal dialog for confirming chat deletion
 */
const DeleteModal = {
    template: '#delete-modal-template',

    props: {
        chat: {
            type: Object,
            default: null
        }
    },

    methods: {
        confirm() {
            // Directly emit the confirm event
            this.$emit('confirm');
        }
    }
};