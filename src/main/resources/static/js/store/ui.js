/**
 * UI Store - Manages UI-related state
 */
const UI_Store = Vue.reactive({
    // State
    isSidebarCollapsed: window.innerWidth < 768,
    errorToast: {
        visible: false,
        title: '',
        message: ''
    },
    connectionStatus: 'connected', // 'connected', 'disconnected', 'reconnecting'
    reconnectCount: 0,
    maxReconnectAttempts: 3,
    heartbeatTimer: null,
    lastActivityTimestamp: Date.now(),

    // Initialize UI state
    initialize() {
        // Set up window resize listener for responsive sidebar
        window.addEventListener('resize', () => {
            this.isSidebarCollapsed = window.innerWidth < 768;
        });

        // Set up network status listeners
        window.addEventListener('online', () => {
            this.updateConnectionStatus('connected');
        });

        window.addEventListener('offline', () => {
            this.updateConnectionStatus('disconnected');
        });
    },

    // Toggle sidebar collapsed state
    toggleSidebar() {
        this.isSidebarCollapsed = !this.isSidebarCollapsed;
    },

    /**
     * Show error notification toast
     * @param {string} title - Error title
     * @param {string} message - Error message
     * @param {number} duration - Duration in ms (0 for no auto-hide)
     */
    showErrorNotification(title, message, duration = 5000) {
        // Make sure errorToast is initialized
        if (!this.errorToast) {
            this.errorToast = {
                visible: false,
                title: '',
                message: ''
            };
        }

        this.errorToast.visible = true;
        this.errorToast.title = title || 'Error';
        this.errorToast.message = message || 'An unexpected error occurred';

        // Auto-hide after duration if provided
        if (duration > 0) {
            setTimeout(() => {
                this.hideErrorNotification();
            }, duration);
        }
    },

    /**
     * Hide error notification
     */
    hideErrorNotification() {
        if (this.errorToast) {
            this.errorToast.visible = false;
        }
    },

    /**
     * Update connection status and show appropriate notifications
     * @param {string} status - New connection status
     */
    updateConnectionStatus(status) {
        this.connectionStatus = status;

        if (status === 'disconnected') {
            this.showErrorNotification(
                'Connection Lost',
                'The connection to the server was lost. Attempting to reconnect...'
            );
        } else if (status === 'connected' && this.reconnectCount > 0) {
            this.showErrorNotification(
                'Connection Restored',
                'The connection has been successfully restored.',
                3000
            );
        }
    },

    /**
     * Start heartbeat to keep connection alive
     */
    startHeartbeat() {
        // Clear existing heartbeat timer if any
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }

        // Update timestamp
        this.lastActivityTimestamp = Date.now();

        // Check if EventSource is supported
        if (typeof EventSource !== 'undefined') {
            try {
                const heartbeatSource = new EventSource(API.endpoints.heartbeat);

                heartbeatSource.addEventListener('heartbeat', (event) => {
                    console.log('Heartbeat received:', event.data);
                    // Update last activity time
                    this.lastActivityTimestamp = Date.now();
                });

                heartbeatSource.addEventListener('error', () => {
                    console.warn('Heartbeat connection error, reconnecting...');
                    heartbeatSource.close();

                    // Reconnect after a brief delay
                    setTimeout(() => {
                        this.startHeartbeat();
                    }, 3000);
                });

                // Set up an interval to check for stale connections
                this.heartbeatTimer = setInterval(() => {
                    const now = Date.now();
                    const elapsed = now - this.lastActivityTimestamp;

                    // If no activity for 30 seconds and streaming is active, consider connection stale
                    if (elapsed > 30000 && Chat_Store && Chat_Store.isStreaming) {
                        console.warn('Connection appears stale, restarting heartbeat');
                        heartbeatSource.close();
                        this.startHeartbeat();
                    }
                }, 15000);
            } catch (error) {
                console.error('Failed to start heartbeat:', error);
            }
        }
    },

    /**
     * Clean up resources on shutdown
     */
    cleanup() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
});