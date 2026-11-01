/**
 * ToastManager - Centralized toast notification system
 * Provides consistent notification UI across all tools
 */
class ToastManager {
    constructor(options = {}) {
        this.container = document.getElementById('toast-container');
        this.duration = options.duration || 3000;
        this.fadeDuration = options.fadeDuration || 300;
    }
    
    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {Object} options - Configuration options
     * @returns {HTMLElement} The toast element
     */
    show(message, options = {}) {
        const {
            type = 'info',          // success, error, warning, info
            backgroundColor = null,
            textColor = null,
            duration = this.duration,
            ariaLive = 'polite'
        } = options;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', ariaLive);
        
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.innerHTML = '×';
        closeBtn.setAttribute('aria-label', 'Close notification');
        closeBtn.addEventListener('click', () => this.hide(toast));
        
        toast.appendChild(messageSpan);
        toast.appendChild(closeBtn);
        
        // Apply custom colors
        if (backgroundColor) {
            toast.style.setProperty('background-color', backgroundColor, 'important');
        }
        if (textColor) {
            toast.style.setProperty('color', textColor, 'important');
        }
        
        this.container.appendChild(toast);
        
        // Trigger show animation
        requestAnimationFrame(() => toast.classList.add('show'));
        
        // Auto-hide
        setTimeout(() => this.hide(toast), duration);
        
        return toast;
    }
    
    /**
     * Hide a toast notification
     * @param {HTMLElement} toast - The toast element to hide
     */
    hide(toast) {
        toast.classList.add('hiding');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, this.fadeDuration);
    }
    
    /**
     * Show success toast
     */
    success(message, options = {}) {
        return this.show(message, { ...options, type: 'success' });
    }
    
    /**
     * Show error toast
     */
    error(message, options = {}) {
        return this.show(message, { ...options, type: 'error', ariaLive: 'assertive' });
    }
    
    /**
     * Show warning toast
     */
    warning(message, options = {}) {
        return this.show(message, { ...options, type: 'warning' });
    }
    
    /**
     * Show info toast
     */
    info(message, options = {}) {
        return this.show(message, { ...options, type: 'info' });
    }
}
