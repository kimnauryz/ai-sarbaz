/**
 * Store module that combines all separate stores
 * Using a simple reactive state management approach with Vue 3
 */

// Create reactive global store by combining individual stores
const Store = Vue.reactive({
    // Initialize store state
    initialize() {
        UI_Store.initialize();
        Chat_Store.initialize();
    },

    // Access to individual stores
    get ui() {
        return UI_Store;
    },

    get chat() {
        return Chat_Store;
    }
});