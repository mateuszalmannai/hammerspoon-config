/**
 * DOMHelpers - Common DOM manipulation utilities
 * Provides consistent DOM operations across tools
 */
const DOMHelpers = {
    /**
     * Create an element with options
     * @param {string} tag - HTML tag name
     * @param {Object} options - Element configuration
     * @returns {HTMLElement}
     */
    createElement(tag, options = {}) {
        const element = document.createElement(tag);
        
        if (options.className) {
            element.className = options.className;
        }
        
        if (options.attributes) {
            Object.entries(options.attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
        }
        
        if (options.textContent) {
            element.textContent = options.textContent;
        }

        // innerHTML handling with safe defaults
        // sanitize defaults to true for security - set sanitize: false only for trusted content
        if (options.innerHTML) {
            const shouldSanitize = options.sanitize !== false;
            if (shouldSanitize) {
                element.textContent = options.innerHTML;
            } else {
                // WARNING: Using innerHTML with sanitize: false - ensure content is trusted
                element.innerHTML = options.innerHTML;
            }
        }
        
        if (options.children) {
            options.children.forEach(child => element.appendChild(child));
        }
        
        return element;
    },
    
    /**
     * Escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string}
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * Unescape HTML entities
     * @param {string} html - HTML to unescape
     * @returns {string}
     */
    unescapeHtml(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText;
    },
    
    /**
     * Show element
     * @param {HTMLElement} element
     */
    show(element) {
        element.style.display = '';
    },
    
    /**
     * Hide element
     * @param {HTMLElement} element
     */
    hide(element) {
        element.style.display = 'none';
    },
    
    /**
     * Toggle element visibility
     * @param {HTMLElement} element
     * @param {boolean} show - Optional explicit state
     */
    toggle(element, show) {
        element.style.display = show ? '' : 'none';
    },
    
    /**
     * Add classes to element
     * @param {HTMLElement} element
     * @param {...string} classes
     */
    addClasses(element, ...classes) {
        element.classList.add(...classes);
    },
    
    /**
     * Remove classes from element
     * @param {HTMLElement} element
     * @param {...string} classes
     */
    removeClasses(element, ...classes) {
        element.classList.remove(...classes);
    },
    
    /**
     * Announce message to screen readers
     * @param {string} message - Message to announce
     * @param {string} priority - 'polite' or 'assertive'
     */
    announceToScreenReader(message, priority = 'polite') {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', priority);
        announcement.className = 'visually-hidden';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }
};
