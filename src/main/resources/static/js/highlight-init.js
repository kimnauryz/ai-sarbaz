/**
 * This function ensures highlight.js is properly initialized
 * Call this before trying to use hljs
 */
function ensureHighlightJsInitialized() {
    // Check if highlight.js is already loaded and initialized
    if (typeof hljs !== 'undefined' && hljs.highlightAll) {
        return true;
    }

    console.log('Initializing highlight.js...');

    // Try to load highlight.js if not present
    if (typeof hljs === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js';
        document.head.appendChild(script);

        // Also load CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css';
        document.head.appendChild(link);

        return false;
    }

    // Initialize highlight.js if present but not initialized
    if (typeof hljs.highlightAll === 'undefined') {
        // Some older versions of highlight.js may use initHighlighting
        if (typeof hljs.initHighlighting !== 'undefined') {
            hljs.initHighlighting();
            return true;
        }

        // For really old versions, we need to manually create the highlight function
        if (typeof hljs.highlightBlock !== 'undefined') {
            hljs.highlightAll = function() {
                document.querySelectorAll('pre code').forEach(block => {
                    hljs.highlightBlock(block);
                });
            };
            return true;
        }

        console.error('highlight.js is loaded but missing expected methods');
        return false;
    }

    return true;
}

/**
 * Apply syntax highlighting to code blocks in a container
 * @param {HTMLElement} container - Container element with code blocks
 */
function highlightCodeBlocks(container) {
    if (!container) return;

    // Ensure highlight.js is initialized
    if (!ensureHighlightJsInitialized()) {
        // Try again after a delay if highlight.js is still loading
        setTimeout(() => highlightCodeBlocks(container), 500);
        return;
    }

    try {
        // Try using the built-in highlightAll method first
        if (typeof hljs.highlightAll === 'function') {
            hljs.highlightAll();
        }
        // Fallback to manual highlighting of elements in the container
        else if (typeof hljs.highlightElement === 'function') {
            const codeBlocks = container.querySelectorAll('pre code');
            codeBlocks.forEach(block => {
                hljs.highlightElement(block);
            });
        }
        // Ultimate fallback
        else if (typeof hljs.highlightBlock === 'function') {
            const codeBlocks = container.querySelectorAll('pre code');
            codeBlocks.forEach(block => {
                hljs.highlightBlock(block);
            });
        }
    } catch (error) {
        console.error('Error applying syntax highlighting:', error);
    }
}

// Example of how to modify the MarkdownSupport functions to use this helper

// In setupMarkedRenderer():
marked.setOptions({
    highlight: function(code, language) {
        // Make sure hljs is initialized
        if (!ensureHighlightJsInitialized()) {
            return code; // Return plain code if hljs isn't ready
        }

        // Now try to highlight with the language
        if (language && hljs.getLanguage(language)) {
            try {
                return hljs.highlight(code, { language }).value;
            } catch (err) {
                console.warn('Error highlighting code:', err);
            }
        }

        // Fallback to auto highlighting
        try {
            return hljs.highlightAuto(code).value;
        } catch (err) {
            return code; // Just return the code if all else fails
        }
    },
    // Other options...
});

// In renderChatMessages(), replace the code highlighting section with:
// Highlight all code blocks after rendering
highlightCodeBlocks(messagesContainer);

// In updateStreamingMessage(), replace the code highlighting section with:
// Highlight code blocks in the updated content
highlightCodeBlocks(contentElement);s