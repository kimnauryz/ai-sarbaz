/**
 * Markdown Support Integration
 * Adds Markdown editor and rendering to the chat application
 */

const MarkdownSupport = {
    // SimpleMDE editor instance
    editor: null,

    /**
     * Initialize Markdown support
     */
    initialize() {
        // Set up the Markdown renderer
        this.setupMarkedRenderer();

        // Initialize SimpleMDE editor
        this.initializeEditor();

        // Override messaging functions to handle Markdown
        this.overrideMessageFunctions();

        // Set up event listeners
        this.setupEventListeners();

        console.log('Markdown support initialized');
    },

    /**
     * Setup Marked.js renderer with security options
     */
    setupMarkedRenderer() {
        // Configure Marked options
        marked.setOptions({
            renderer: new marked.Renderer(),
            highlight: function(code, language) {
                // Use highlight.js for code syntax highlighting
                if (hljs.getLanguage(language)) {
                    try {
                        return hljs.highlight(code, { language }).value;
                    } catch (err) {}
                }
                return hljs.highlightAuto(code).value;
            },
            langPrefix: 'hljs language-',
            pedantic: false,
            gfm: true,
            breaks: true,
            sanitize: false,
            smartypants: false,
            xhtml: false
        });

        // Create custom renderer with security enhancements
        const renderer = new marked.Renderer();

        // Make links open in new tab with security attributes
        renderer.link = function(href, title, text) {
            // Only allow specific protocols
            if (!/^(https?:|mailto:|tel:|#)/.test(href)) {
                return text;
            }

            const escapedHref = href.replace(/"/g, '&quot;');
            let link = '<a href="' + escapedHref + '"';

            if (title) {
                link += ' title="' + title.replace(/"/g, '&quot;') + '"';
            }

            // Add security attributes for external links
            if (href.startsWith('http')) {
                link += ' target="_blank" rel="noopener noreferrer"';
            }

            link += '>' + text + '</a>';
            return link;
        };

        // Use the custom renderer
        marked.setOptions({ renderer });
    },

    /**
     * Initialize SimpleMDE Markdown editor
     */
    initializeEditor() {
        // Get the textarea element
        const textareaElement = document.querySelector('.chat-input');
        if (!textareaElement) {
            console.error('Failed to find textarea element for SimpleMDE');
            return;
        }

        // Initialize SimpleMDE with options
        this.editor = new SimpleMDE({
            element: textareaElement,
            spellChecker: false,
            status: false,
            placeholder: "Введите ваше сообщение...",
            toolbar: [
                "bold", "italic", "heading", "|",
                "quote", "code", "unordered-list", "ordered-list", "|",
                "link", "|", "preview"
            ],
            autofocus: false,
            initialValue: '',
            indentWithTabs: false,
            tabSize: 4,
            toolbarTips: true,
            shortcuts: {
                "toggleBold": "Ctrl-B",
                "toggleItalic": "Ctrl-I",
                "drawLink": "Ctrl-K",
                "toggleHeadingSmaller": "Ctrl-H",
                "toggleCodeBlock": "Ctrl-Alt-C",
                "togglePreview": "Ctrl-P"
            },
            promptURLs: true,
            renderingConfig: {
                codeSyntaxHighlighting: true,
                markedOptions: {
                    gfm: true
                }
            }
        });

        // Add Ctrl+Enter handler to send message
        this.editor.codemirror.on('keydown', (cm, event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                this.sendMessage();
            }
        });

        // Position the send button properly
        this.adjustSendButtonPosition();
    },

    /**
     * Adjust send button position to work with SimpleMDE
     */
    adjustSendButtonPosition() {
        const sendButton = document.querySelector('.btn-send');
        if (!sendButton) return;

        // Move send button to the editor container
        const editorContainer = document.querySelector('.CodeMirror');
        if (editorContainer) {
            editorContainer.style.position = 'relative';
            sendButton.style.position = 'absolute';
            sendButton.style.right = '10px';
            sendButton.style.bottom = '10px';
            sendButton.style.zIndex = '10';
        }
    },

    /**
     * Override the message rendering functions to use Markdown
     */
    overrideMessageFunctions() {
        // Store original functions for reference
        const originalRenderChatMessages = UIManager.renderChatMessages;
        const originalUpdateStreamingMessage = UIManager.updateStreamingMessage;

        // Override renderChatMessages to render Markdown content
        UIManager.renderChatMessages = function() {
            // Get messages container
            const messagesContainer = document.querySelector('.chat-messages');
            if (!messagesContainer) return;

            // Clear current messages
            messagesContainer.innerHTML = '';

            // Render each message
            AppState.chat.messages.forEach(message => {
                const messageEl = document.createElement('div');
                messageEl.className = `message ${message.type.toLowerCase()}-message`;

                if (AppState.chat.isStreaming && message.id && message.id.startsWith('temp-assistant')) {
                    messageEl.classList.add('streaming-message');
                }

                const contentEl = document.createElement('div');
                contentEl.className = 'message-content';

                // Render content as Markdown
                if (message.type === 'ASSISTANT' && AppState.chat.isStreaming &&
                    message.id && message.id.startsWith('temp-assistant')) {
                    // For streaming messages
                    contentEl.innerHTML = MarkdownSupport.renderStreamingMarkdown(
                        message.content,
                        AppState.chat.lastContentLength,
                        message.id
                    );
                } else {
                    // For completed messages
                    contentEl.innerHTML = marked.parse(message.content || '');
                }

                messageEl.appendChild(contentEl);

                // Add attachments if any
                if (message.attachments && message.attachments.length > 0) {
                    const attachmentsEl = document.createElement('div');
                    attachmentsEl.className = 'message-attachments mt-2';

                    message.attachments.forEach(attachment => {
                        const attachmentEl = document.createElement('div');
                        attachmentEl.className = 'attachment-badge';
                        attachmentEl.innerHTML = `<i class="bi bi-paperclip"></i> ${attachment.filename}`;
                        attachmentsEl.appendChild(attachmentEl);
                    });

                    messageEl.appendChild(attachmentsEl);
                }

                // Add timestamp
                const timeEl = document.createElement('div');
                timeEl.className = 'message-time';
                timeEl.textContent = Utils.formatTime(message.timestamp);
                messageEl.appendChild(timeEl);

                messagesContainer.appendChild(messageEl);
            });

            // Add typing indicator for non-streaming responses
            if (AppState.chat.isTyping && !AppState.chat.isStreaming) {
                const typingEl = document.createElement('div');
                typingEl.className = 'typing-indicator';
                typingEl.innerHTML = `
                    <div class="typing-dots">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                `;
                messagesContainer.appendChild(typingEl);
            }

            // Scroll to bottom
            Utils.animateScrollToBottom(messagesContainer);

            // Highlight all code blocks
            document.querySelectorAll('.message-content pre code').forEach(block => {
                hljs.highlightElement(block);
            });
        };

        // Override updateStreamingMessage to handle Markdown streaming
        UIManager.updateStreamingMessage = function(messageId, newContent) {
            // Initialize streamingMessage if needed
            if (!AppState.chat.streamingMessage) {
                AppState.chat.streamingMessage = '';
            }

            // Add new content
            AppState.chat.streamingMessage += newContent;

            // Find and update the message
            const messageIndex = AppState.chat.messages.findIndex(m => m.id === messageId);
            if (messageIndex !== -1) {
                AppState.chat.messages[messageIndex].content = AppState.chat.streamingMessage;

                // Update the message in the DOM
                const messageElements = document.querySelectorAll('.message.assistant-message');
                if (messageElements && messageElements.length > 0) {
                    const lastMessageElement = messageElements[messageElements.length - 1];
                    const contentElement = lastMessageElement.querySelector('.message-content');

                    if (contentElement) {
                        contentElement.innerHTML = MarkdownSupport.renderStreamingMarkdown(
                            AppState.chat.streamingMessage,
                            AppState.chat.lastContentLength,
                            messageId
                        );

                        // Highlight code blocks in the new content
                        contentElement.querySelectorAll('pre code').forEach(block => {
                            hljs.highlightElement(block);
                        });
                    }
                }

                // Scroll to bottom
                const messagesContainer = document.querySelector('.chat-messages');
                if (messagesContainer) {
                    Utils.animateScrollToBottom(messagesContainer);
                }
            }
        };

        // Override sendMessage to use SimpleMDE
        const originalSendMessage = UIManager.sendMessage;
        UIManager.sendMessage = function() {
            // Only proceed if we have the editor
            if (!MarkdownSupport.editor) {
                console.error('SimpleMDE not initialized');
                return;
            }

            // Get message text from SimpleMDE
            const messageText = MarkdownSupport.editor.value();
            if (!messageText.trim() || AppState.chat.isTyping) return;

            // Clear the editor
            MarkdownSupport.editor.value('');

            // Check if currentChat exists
            if (!AppState.chat.currentChat || !AppState.chat.currentChat.id) {
                // Create a new chat if none exists
                this.createNewChat().then(newChat => {
                    if (!newChat) {
                        console.error('Failed to create a new chat before sending message');
                        this.showErrorNotification('Error', 'Failed to create a new chat');
                        return;
                    }
                    // Continue with sending
                    this.processMessageSending(messageText);
                }).catch(error => {
                    console.error('Failed to create chat:', error);
                    this.showErrorNotification('Error', 'Failed to create a new chat');
                });
            } else {
                // Chat exists, proceed with sending
                this.processMessageSending(messageText);
            }
        };

        // Add helper method to process message sending
        UIManager.processMessageSending = function(messageText) {
            // Initialize lastContentLength if not done
            if (!AppState.chat.lastContentLength) {
                AppState.chat.lastContentLength = {};
            }

            // Reset streaming state
            AppState.chat.streamingMessage = '';
            AppState.ui.reconnectCount = 0;
            AppState.ui.lastActivityTimestamp = Date.now();

            // Start heartbeat
            if (this.startHeartbeat) {
                this.startHeartbeat();
            }

            // Add user message to chat
            const userMessage = {
                id: 'temp-' + Date.now(),
                chatId: AppState.chat.currentChat.id,
                type: 'USER',
                content: messageText,
                timestamp: new Date().toISOString()
            };

            AppState.chat.messages.push(userMessage);

            // Set typing state
            AppState.chat.isTyping = true;
            AppState.chat.isStreaming = true;
            AppState.chat.streamingChatId = AppState.chat.currentChat.id;

            // Add placeholder for assistant's response
            const tempAssistantId = 'temp-assistant-' + Date.now();
            const assistantMessage = {
                id: tempAssistantId,
                chatId: AppState.chat.currentChat.id,
                type: 'ASSISTANT',
                content: '',
                timestamp: new Date().toISOString()
            };

            AppState.chat.messages.push(assistantMessage);

            // Initialize content length tracker
            AppState.chat.lastContentLength[tempAssistantId] = 0;

            // Update UI with new messages
            this.renderChatMessages();

            // Prepare form data
            const formData = new FormData();
            formData.append('model', AppState.chat.currentModel);
            formData.append('prompt', messageText);
            formData.append('role', 'helpful assistant');
            formData.append('chatId', AppState.chat.currentChat.id);

            // Add files if they exist
            if (AppState.chat.selectedFiles && AppState.chat.selectedFiles.length > 0) {
                AppState.chat.selectedFiles.forEach(file => {
                    formData.append('attachments', file);
                });

                // Clear selected files
                AppState.chat.selectedFiles = [];

                // Clear file list in UI
                const fileListElement = document.querySelector('.file-list');
                if (fileListElement) {
                    fileListElement.innerHTML = '';
                }
            }

            // Self reference for callbacks
            const self = this;

            // Send request
            API.sendStreamingMessage(formData)
                .then(response => {
                    // Process streaming response
                    Utils.processStreamingResponse(
                        response,
                        // On chunk received
                        function(content) {
                            self.updateStreamingMessage(tempAssistantId, content);
                        },
                        // On complete
                        function() {
                            self.finalizeStreaming();
                        },
                        // On error
                        function(error) {
                            self.handleStreamingError(tempAssistantId, error);
                        }
                    );
                })
                .catch(error => {
                    console.error('Failed to send message:', error);
                    this.handleStreamingError(tempAssistantId, error);
                });
        };
    },

    /**
     * Set up event listeners for Markdown-specific buttons
     */
    setupEventListeners() {
        // Markdown guide button
        const markdownGuideBtn = document.querySelector('.markdown-guide-btn');
        if (markdownGuideBtn) {
            markdownGuideBtn.addEventListener('click', () => {
                const markdownGuideModal = new bootstrap.Modal(document.getElementById('markdownGuideModal'));
                markdownGuideModal.show();
            });
        }

        // Send button (needs to be moved to the editor container)
        const sendButton = document.querySelector('.btn-send');
        if (sendButton) {
            sendButton.addEventListener('click', this.sendMessage.bind(this));
        }
    },

    /**
     * Send a message using the current editor content
     */
    sendMessage() {
        if (UIManager && UIManager.sendMessage) {
            UIManager.sendMessage();
        }
    },

    /**
     * Render streaming content with Markdown highlighting
     */
    renderStreamingMarkdown(content, lastContentLength, streamingMessageId) {
        if (!content) return '';

        // Initialize lastContentLength for this message if not existing
        if (!lastContentLength[streamingMessageId]) {
            lastContentLength[streamingMessageId] = 0;
        }

        const prevLength = lastContentLength[streamingMessageId];
        const currentLength = content.length;

        // No new content
        if (currentLength <= prevLength) {
            return marked.parse(content);
        }

        // Attempt to find good break points (end of sentences, paragraphs)
        const existingContent = content.substring(0, prevLength);
        let newContent = content.substring(prevLength);

        // Update the tracked length
        lastContentLength[streamingMessageId] = currentLength;

        // Render both parts
        const renderedExisting = marked.parse(existingContent);
        const renderedNew = marked.parse(newContent);

        // If we're just starting (no existing content)
        if (!existingContent.trim()) {
            return `<span class="newest-chunk">${renderedNew}</span>`;
        }

        // Find where to insert the newest-chunk class
        // This is tricky as we need to add it after the last closing tag
        let combinedHtml = renderedExisting;

        // Extract the text content from rendered HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = renderedNew;
        const textContent = tempDiv.textContent || tempDiv.innerText || '';

        // Wrap the new content in a span
        if (textContent.trim()) {
            combinedHtml += `<span class="newest-chunk">${renderedNew}</span>`;
        } else {
            combinedHtml += renderedNew;
        }

        return combinedHtml;
    }
};

/**
 * Initialize the Markdown support when the DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    // Check if required libraries are loaded
    if (typeof marked !== 'undefined' && typeof SimpleMDE !== 'undefined' && typeof hljs !== 'undefined') {
        // Wait for UIManager to be initialized
        const initInterval = setInterval(() => {
            if (typeof UIManager !== 'undefined' && UIManager.initialize) {
                clearInterval(initInterval);
                // First initialize the base UI
                if (!UIManager.initialized) {
                    UIManager.initialize();
                }
                // Then initialize Markdown support
                MarkdownSupport.initialize();
            }
        }, 100);
    } else {
        console.error('Required libraries for Markdown support are not loaded');
        // Try to load missing libraries
        loadMissingLibraries();
    }
});

/**
 * Load any missing libraries required for Markdown support
 */
function loadMissingLibraries() {
    const requiredLibraries = [
        {
            name: 'marked',
            global: 'marked',
            url: 'https://cdn.jsdelivr.net/npm/marked@4.3.0/marked.min.js'
        },
        {
            name: 'SimpleMDE',
            global: 'SimpleMDE',
            url: 'https://cdn.jsdelivr.net/npm/simplemde@1.11.2/dist/simplemde.min.js',
            css: 'https://cdn.jsdelivr.net/npm/simplemde@1.11.2/dist/simplemde.min.css'
        },
        {
            name: 'highlight.js',
            global: 'hljs',
            url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js',
            css: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/default.min.css'
        }
    ];

    let loadedCount = 0;
    const totalToLoad = requiredLibraries.reduce((count, lib) => count + (lib.css ? 2 : 1), 0);

    requiredLibraries.forEach(library => {
        // Check if library is already loaded
        if (window[library.global]) {
            loadedCount++;
            return;
        }

        // Load CSS if needed
        if (library.css) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = library.css;
            link.onload = () => {
                loadedCount++;
                checkAllLoaded();
            };
            document.head.appendChild(link);
        }

        // Load JavaScript
        const script = document.createElement('script');
        script.src = library.url;
        script.onload = () => {
            loadedCount++;
            checkAllLoaded();
            console.log(`Loaded ${library.name}`);
        };
        script.onerror = () => {
            console.error(`Failed to load ${library.name} from ${library.url}`);
        };
        document.head.appendChild(script);
    });

    function checkAllLoaded() {
        if (loadedCount === totalToLoad) {
            console.log('All required libraries loaded, initializing Markdown support');
            setTimeout(() => {
                if (typeof UIManager !== 'undefined' && UIManager.initialize) {
                    // First initialize the base UI if needed
                    if (!UIManager.initialized) {
                        UIManager.initialize();
                    }
                    // Then initialize Markdown support
                    MarkdownSupport.initialize();
                } else {
                    console.error('UIManager not available after loading libraries');
                }
            }, 500);
        }
    }
}