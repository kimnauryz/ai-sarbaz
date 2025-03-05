/**
 * RenameModal component
 * Modal dialog for renaming a chat
 */
const RenameModal = {
    template: '#rename-modal-template',

    data() {
        return {
            title: ''
        };
    },

    props: {
        chat: {
            type: Object,
            default: null
        }
    },

    watch: {
        chat: {
            immediate: true,
            handler(newChat) {
                if (newChat && newChat.title) {
                    this.title = newChat.title;
                }
            }
        }
    },

    methods: {
        confirm() {
            if (!this.title || !this.title.trim()) {
                return;
            }

            // Emit the event with the new title
            this.$emit('confirm', this.title);

            // Reset the title
            this.title = '';
        }
    }
};