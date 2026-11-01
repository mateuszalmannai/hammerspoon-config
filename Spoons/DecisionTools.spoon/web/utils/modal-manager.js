/**
 * ModalManager - Modal dialog management
 * Handles focus management, keyboard navigation, and accessibility
 */
class ModalManager {
    constructor(modalElement, options = {}) {
        if (!modalElement) {
            console.error('ModalManager: modalElement is required');
            this.modal = null;
            return;
        }
        this.modal = modalElement;
        this.closeButton = this.modal.querySelector('[data-modal-close]') || 
                          this.modal.querySelector('.help-modal-close');
        this.backdrop = this.modal.querySelector('[data-modal-backdrop]') ||
                       this.modal.querySelector('.help-modal-backdrop');
        this.returnFocusTo = null;
        this.onOpen = options.onOpen || null;
        this.onClose = options.onClose || null;

        // Bound handler for focus trapping (so we can remove it later)
        this._handleFocusTrap = this._handleFocusTrap.bind(this);

        this.setupListeners();
    }

    /**
     * Get all focusable elements within the modal
     * @returns {HTMLElement[]}
     * @private
     */
    _getFocusableElements() {
        if (!this.modal) return [];
        const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        return Array.from(this.modal.querySelectorAll(selector)).filter(el => {
            // Filter out hidden or disabled elements
            return !el.disabled && el.offsetParent !== null;
        });
    }

    /**
     * Handle Tab key to trap focus within modal
     * @param {KeyboardEvent} e
     * @private
     */
    _handleFocusTrap(e) {
        if (e.key !== 'Tab' || !this.isOpen()) return;

        const focusable = this._getFocusableElements();
        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
            // Shift+Tab: if on first element, wrap to last
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            // Tab: if on last element, wrap to first
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }
    
    /**
     * Setup event listeners
     * @private
     */
    setupListeners() {
        if (!this.modal) return;
        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => this.close());
        }
        
        if (this.backdrop) {
            this.backdrop.addEventListener('click', () => this.close());
        }
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) {
                this.close();
            }
        });
    }
    
    /**
     * Open the modal
     * @param {HTMLElement} returnFocusElement - Element to focus when modal closes
     */
    open(returnFocusElement = null) {
        if (!this.modal) return;
        this.returnFocusTo = returnFocusElement || document.activeElement;
        this.modal.classList.add('visible');
        this.modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        // Enable focus trapping
        document.addEventListener('keydown', this._handleFocusTrap);

        // Focus first focusable element
        const focusable = this._getFocusableElements();
        if (focusable.length > 0) {
            focusable[0].focus();
        }

        if (this.onOpen) this.onOpen();
    }
    
    /**
     * Close the modal
     */
    close() {
        if (!this.modal) return;
        this.modal.classList.remove('visible');
        this.modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';

        // Disable focus trapping
        document.removeEventListener('keydown', this._handleFocusTrap);

        if (this.returnFocusTo) {
            this.returnFocusTo.focus();
        }

        if (this.onClose) this.onClose();
    }
    
    /**
     * Toggle modal open/close
     * @param {HTMLElement} returnFocusElement - Element to focus when modal closes
     */
    toggle(returnFocusElement = null) {
        if (this.isOpen()) {
            this.close();
        } else {
            this.open(returnFocusElement);
        }
    }
    
    /**
     * Check if modal is open
     * @returns {boolean}
     */
    isOpen() {
        if (!this.modal) return false;
        const isOpen = this.modal.classList.contains('visible');
        return isOpen;
    }

    /**
     * Escape HTML special characters to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text safe for innerHTML
     * @private
     */
    static _escapeHtml(text) {
        if (text == null) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    /**
     * Create a focus trap handler for a modal element
     * @param {HTMLElement} modal - The modal element
     * @returns {Function} The keydown handler
     * @private
     */
    static _createFocusTrapHandler(modal) {
        return (e) => {
            if (e.key !== 'Tab') return;

            const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
            const focusable = Array.from(modal.querySelectorAll(selector)).filter(el => {
                return !el.disabled && el.offsetParent !== null;
            });

            if (focusable.length === 0) return;

            const firstElement = focusable[0];
            const lastElement = focusable[focusable.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };
    }

    /**
     * Show confirmation dialog
     * @param {string} message - Confirmation message
     * @param {Object} options - { title, confirmText, cancelText }
     * @returns {Promise<boolean>} True if confirmed
     */
    static async confirm(message, options = {}) {
        return new Promise((resolve) => {
            const modalHTML = `
                <div class="modal-overlay confirm-modal" style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                ">
                    <div class="modal-dialog" style="
                        background: var(--bg-primary);
                        border-radius: var(--radius-lg);
                        padding: 2rem;
                        max-width: 500px;
                        width: 90%;
                        box-shadow: var(--shadow-lg);
                    ">
                        <h3 style="margin: 0 0 1rem 0; color: var(--text-primary);">${ModalManager._escapeHtml(options.title || 'Confirm')}</h3>
                        <p style="margin: 0 0 1.5rem 0; color: var(--text-secondary); line-height: 1.5;">${ModalManager._escapeHtml(message)}</p>
                        <div class="modal-actions" style="display: flex; gap: 0.75rem; justify-content: flex-end;">
                            <button class="btn-cancel btn-secondary" style="
                                padding: 0.5rem 1rem;
                                border-radius: var(--radius-md);
                                border: 1px solid var(--border-color);
                                background: var(--bg-secondary);
                                color: var(--text-primary);
                                cursor: pointer;
                            ">${ModalManager._escapeHtml(options.cancelText || 'Cancel')}</button>
                            <button class="btn-confirm btn-primary" style="
                                padding: 0.5rem 1rem;
                                border-radius: var(--radius-md);
                                border: none;
                                background: var(--primary-color);
                                color: white;
                                cursor: pointer;
                            ">${ModalManager._escapeHtml(options.confirmText || 'OK')}</button>
                        </div>
                    </div>
                </div>
            `;

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = modalHTML;
            const modal = tempDiv.firstElementChild;

            document.body.appendChild(modal);

            // Define handlers
            const handleEscape = (e) => {
                if (e.key === 'Escape') cleanup(false);
            };
            const handleFocusTrap = ModalManager._createFocusTrapHandler(modal);

            const cleanup = (result) => {
                document.body.removeChild(modal);
                document.removeEventListener('keydown', handleEscape);
                document.removeEventListener('keydown', handleFocusTrap);
                resolve(result);
            };

            modal.querySelector('.btn-confirm').addEventListener('click', () => cleanup(true));
            modal.querySelector('.btn-cancel').addEventListener('click', () => cleanup(false));
            // Click on overlay background (not on dialog) closes modal
            modal.addEventListener('click', (e) => {
                if (e.target === modal) cleanup(false);
            });

            document.addEventListener('keydown', handleEscape);
            document.addEventListener('keydown', handleFocusTrap);

            // Focus confirm button
            modal.querySelector('.btn-confirm').focus();
        });
    }

    /**
     * Show prompt dialog
     * @param {string} message - Prompt message
     * @param {string} defaultValue - Default input value
     * @param {Object} options - { title, confirmText, cancelText }
     * @returns {Promise<string|null>} User input or null if cancelled
     */
    static async prompt(message, defaultValue = '', options = {}) {
        return new Promise((resolve) => {
            const escapedDefault = defaultValue.replace(/"/g, '&quot;');
            const modalHTML = `
                <div class="modal-overlay prompt-modal" style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                ">
                    <div class="modal-dialog" style="
                        background: var(--bg-primary);
                        border-radius: var(--radius-lg);
                        padding: 2rem;
                        max-width: 500px;
                        width: 90%;
                        box-shadow: var(--shadow-lg);
                    ">
                        <h3 style="margin: 0 0 1rem 0; color: var(--text-primary);">${ModalManager._escapeHtml(options.title || 'Input Required')}</h3>
                        <p style="margin: 0 0 1rem 0; color: var(--text-secondary); line-height: 1.5;">${ModalManager._escapeHtml(message)}</p>
                        <input type="text" class="modal-input" value="${escapedDefault}" style="
                            width: 100%;
                            padding: 0.5rem;
                            border: 1px solid var(--border-color);
                            border-radius: var(--radius-md);
                            background: var(--bg-secondary);
                            color: var(--text-primary);
                            font-size: 1rem;
                            margin-bottom: 1.5rem;
                        ">
                        <div class="modal-actions" style="display: flex; gap: 0.75rem; justify-content: flex-end;">
                            <button class="btn-cancel btn-secondary" style="
                                padding: 0.5rem 1rem;
                                border-radius: var(--radius-md);
                                border: 1px solid var(--border-color);
                                background: var(--bg-secondary);
                                color: var(--text-primary);
                                cursor: pointer;
                            ">${ModalManager._escapeHtml(options.cancelText || 'Cancel')}</button>
                            <button class="btn-confirm btn-primary" style="
                                padding: 0.5rem 1rem;
                                border-radius: var(--radius-md);
                                border: none;
                                background: var(--primary-color);
                                color: white;
                                cursor: pointer;
                            ">${ModalManager._escapeHtml(options.confirmText || 'OK')}</button>
                        </div>
                    </div>
                </div>
            `;

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = modalHTML;
            const modal = tempDiv.firstElementChild;

            document.body.appendChild(modal);
            const input = modal.querySelector('.modal-input');

            // Define handlers
            const handleEscape = (e) => {
                if (e.key === 'Escape') cleanup(null);
            };
            const handleFocusTrap = ModalManager._createFocusTrapHandler(modal);

            const cleanup = (result) => {
                document.body.removeChild(modal);
                document.removeEventListener('keydown', handleEscape);
                document.removeEventListener('keydown', handleFocusTrap);
                resolve(result);
            };

            const submit = () => {
                const value = input.value.trim();
                cleanup(value || null);
            };

            modal.querySelector('.btn-confirm').addEventListener('click', submit);
            modal.querySelector('.btn-cancel').addEventListener('click', () => cleanup(null));
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    submit();
                }
            });

            document.addEventListener('keydown', handleEscape);
            document.addEventListener('keydown', handleFocusTrap);

            // Focus and select input
            input.focus();
            input.select();
        });
    }
}
