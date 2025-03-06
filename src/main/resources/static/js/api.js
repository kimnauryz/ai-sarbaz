/**
 * API client module
 * Handles all HTTP requests to the backend
 */

const API = {
    // Base endpoints for different resources
    endpoints: {
        chats: '/chats',
        prompt: '/chats/prompt',
        streamingPrompt: '/chats/streaming/prompt',
        health: '/chats/health',
        heartbeat: '/chats/streaming/heartbeat'
    },

    /**
     * Get list of chats with pagination
     * @param {number} page - Page number (0-based)
     * @param {number} size - Page size
     * @param {boolean} activeOnly - Whether to fetch only active chats
     * @returns {Promise} Promise that resolves to chat list
     */
    getChats: async (page = 0, size = 50, activeOnly = true) => {
        try {
            const response = await axios.get(`${API.endpoints.chats}?page=${page}&size=${size}&activeOnly=${activeOnly}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching chats:', error);
            throw error;
        }
    },

    /**
     * Create a new chat
     * @param {string} model - Model name to use
     * @returns {Promise} Promise that resolves to the new chat object
     */
    createChat: async (model) => {
        try {
            const response = await axios.post(API.endpoints.chats, { model });
            return response.data;
        } catch (error) {
            console.error('Error creating chat:', error);
            throw error;
        }
    },

    /**
     * Get chat message history with pagination
     * @param {string} chatId - Chat ID
     * @param {number} page - Page number (0-based)
     * @param {number} size - Page size
     * @returns {Promise} Promise that resolves to message list
     */
    getChatHistory: async (chatId, page = 0, size = 20) => {
        try {
            const response = await axios.get(`${API.endpoints.chats}/${chatId}/history?page=${page}&size=${size}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching chat history:', error);
            throw error;
        }
    },

    /**
     * Update chat title
     * @param {string} chatId - Chat ID
     * @param {string} title - New title
     * @returns {Promise} Promise that resolves to updated chat
     */
    updateChatTitle: async (chatId, title) => {
        try {
            const response = await axios.put(`${API.endpoints.chats}/${chatId}/title`, { title });
            return response.data;
        } catch (error) {
            console.error('Error updating chat title:', error);
            throw error;
        }
    },

    /**
     * Archive a chat
     * @param {string} chatId - Chat ID
     * @returns {Promise} Promise that resolves when successful
     */
    archiveChat: async (chatId) => {
        try {
            const response = await axios.put(`${API.endpoints.chats}/${chatId}/archive`);
            return response.data;
        } catch (error) {
            console.error('Error archiving chat:', error);
            throw error;
        }
    },

    /**
     * Delete a chat
     * @param {string} chatId - Chat ID
     * @returns {Promise} Promise that resolves when successful
     */
    deleteChat: async (chatId) => {
        try {
            const response = await axios.delete(`${API.endpoints.chats}/${chatId}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting chat:', error);
            throw error;
        }
    },

    /**
     * Send a message to get a non-streaming response
     * @param {FormData} formData - Form data with message and attachments
     * @returns {Promise} Promise that resolves to the response
     */
    sendMessage: async (formData) => {
        try {
            const response = await axios.post(API.endpoints.prompt, formData);
            return response.data;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    },

    /**
     * Send a message to get a streaming response
     * @param {FormData} formData - Form data with message and attachments
     * @returns {Promise} Promise that resolves to the fetch response
     */
    sendStreamingMessage: async (formData) => {
        try {
            return await fetch(API.endpoints.streamingPrompt, {
                method: 'POST',
                body: formData
            });
        } catch (error) {
            console.error('Error sending streaming message:', error);
            throw error;
        }
    },

    /**
     * Check server health
     * @returns {Promise} Promise that resolves to health status
     */
    checkHealth: async () => {
        try {
            const response = await fetch(API.endpoints.health, { 
                method: 'GET',
                headers: { 'Cache-Control': 'no-cache' }
            });
            return response.ok;
        } catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    }
};
