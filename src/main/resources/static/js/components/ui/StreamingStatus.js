/**
 * StreamingStatus component
 * Shows when a response is being streamed
 */
const StreamingStatus = {
    template: `
        <div class="streaming-status mb-2">
            <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <span class="small text-muted">{{ message }}</span>
        </div>
    `,
    
    props: {
        message: {
            type: String,
            default: 'Generating response...'
        }
    }
};
