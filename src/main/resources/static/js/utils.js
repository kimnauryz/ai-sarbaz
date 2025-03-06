/**
 * Utility functions for the chat application
 */

const Utils = {
    /**
     * Format a timestamp to a human-readable time
     * @param {string} timestamp - ISO timestamp
     * @returns {string} Formatted time
     */
    formatTime: (timestamp) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleTimeString();
    },

    /**
     * Format message content for display
     * Handles streaming, links, and line breaks
     * @param {string} content - Raw message content
     * @param {boolean} isStreaming - Whether this is a streaming message
     * @param {object} lastContentLength - Object tracking content lengths
     * @param {string} streamingMessageId - ID of currently streaming message
     * @returns {string} Formatted HTML content
     */
    formatMessageContent: (content, isStreaming, lastContentLength, streamingMessageId) => {
        if (!content) return '';

        // Escape HTML to prevent XSS
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };

        // For non-streaming or completed messages, just return escaped content
        if (!isStreaming) {
            return escapeHtml(content)
                // Convert URLs to clickable links
                .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-primary">$1</a>')
                // Maintain line breaks for readability
                .replace(/\n/g, '<br>');
        }

        // Initialize last content length for this message if not existing
        if (!lastContentLength || !lastContentLength[streamingMessageId]) {
            if (!lastContentLength) lastContentLength = {};
            lastContentLength[streamingMessageId] = 0;
        }

        const prevLength = lastContentLength[streamingMessageId];
        const currentLength = content.length;

        // No new content
        if (currentLength <= prevLength) {
            return escapeHtml(content)
                .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-primary">$1</a>')
                .replace(/\n/g, '<br>');
        }

        // There is new content to highlight
        const existingContent = escapeHtml(content.substring(0, prevLength))
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-primary">$1</a>')
            .replace(/\n/g, '<br>');

        const newContent = escapeHtml(content.substring(prevLength))
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-primary">$1</a>')
            .replace(/\n/g, '<br>');

        // Update the tracked length
        lastContentLength[streamingMessageId] = currentLength;

        // Return content with the new part wrapped in highlighting span
        return `${existingContent}<span class="newest-chunk">${newContent}</span>`;
    },

    /**
     * Process a streaming response from the server
     * @param {Response} response - Fetch response object
     * @param {function} onChunk - Callback for each chunk of content
     * @param {function} onComplete - Callback for completion
     * @param {function} onError - Callback for errors
     */
    processStreamingResponse: async (response, onChunk, onComplete, onError) => {
        try {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                try {
                    const { done, value } = await reader.read();

                    if (done) {
                        console.log('Stream completed naturally');
                        break;
                    }

                    // Decode and process the chunk
                    const chunk = decoder.decode(value, { stream: true });
                    buffer += chunk;

                    // Split the buffer by SSE delimiter (double newline)
                    const events = buffer.split('\n\n');
                    buffer = events.pop() || ''; // Keep the last chunk (might be incomplete)

                    // Process each complete event
                    for (const eventText of events) {
                        if (!eventText.trim()) continue;

                        // Parse event type and data
                        const eventLines = eventText.split('\n');
                        let eventType = 'message';
                        let eventData = '';

                        for (const line of eventLines) {
                            if (line.startsWith('event:')) {
                                eventType = line.substring(6).trim();
                            } else if (line.startsWith('data:')) {
                                eventData = line.substring(5).trim();
                            }
                        }

                        // Handle different event types
                        if (eventType === 'message' && eventData) {
                            onChunk(eventData);
                        } else if (eventType === 'error') {
                            if (eventData.startsWith('error:')) {
                                eventData = eventData.substring(6).trim();
                            }
                            throw new Error(eventData || 'Unknown streaming error');
                        }
                    }
                } catch (readError) {
                    // Check if it's an abort error or other read error
                    if (readError.name === 'AbortError') {
                        throw new Error('Request timed out');
                    }

                    console.error('Error reading stream chunk:', readError);
                    throw readError;
                }
            }

            onComplete();
        } catch (error) {
            onError(error);
        }
    },

    /**
     * Animate scrolling to the bottom of a container
     * @param {HTMLElement} container - Container element to scroll
     */
    animateScrollToBottom: (container) => {
        if (!container) return;

        const scrollHeight = container.scrollHeight;
        const currentScroll = container.scrollTop + container.clientHeight;

        // If we're already near the bottom, scroll immediately
        if (scrollHeight - currentScroll < 100) {
            container.scrollTop = scrollHeight;
        } else {
            // Otherwise, only scroll if the user hasn't scrolled up to read previous messages
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
            if (isNearBottom) {
                container.scrollTop = scrollHeight;
            }
        }
    },

    /**
     * Available models for the chat
     */
    availableModels: [
        'llama3.2:3b',
        'llama3.2:8b',
        'llama3.2:70b',
        'mistral'
    ]
};