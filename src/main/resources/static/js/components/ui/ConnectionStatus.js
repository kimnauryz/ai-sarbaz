/**
 * ConnectionStatus component
 * Shows network connection status
 */
const ConnectionStatus = {
    template: '#connection-status-template',
    
    props: {
        status: {
            type: String,
            default: 'connected',
            validator: value => ['connected', 'disconnected', 'reconnecting'].includes(value)
        }
    }
};
