/**
 * KeyboardManager - Centralized keyboard shortcut handling
 * Provides consistent shortcut registration, execution, and help content generation
 */
class KeyboardManager {
    /**
     * Create a new KeyboardManager instance
     * @param {Object} options - Configuration options
     * @param {ModalManager} options.helpModal - Help modal manager (for ? shortcut)
     * @param {HTMLElement} options.mainInput - Main input element (for Ctrl+I focus)
     * @param {Function} options.onEscape - Custom escape handler (optional)
     */
    constructor(options = {}) {
        this.helpModal = options.helpModal || null;
        this.mainInput = options.mainInput || null;
        this.onEscape = options.onEscape || null;

        // Registered shortcuts organized by type
        this.shortcuts = {
            global: [],      // Always active
            ctrl: [],        // Ctrl/Cmd + key
            alt: [],         // Alt + key
            ctrlShift: [],   // Ctrl/Cmd + Shift + key
            plain: []        // Plain key (when not in input)
        };

        // Bound handler for cleanup
        this._boundHandler = this._handleKeydown.bind(this);

        // Track if initialized
        this._initialized = false;
    }

    /**
     * Initialize the keyboard manager and start listening
     * Call this after registering shortcuts
     */
    init() {
        if (this._initialized) return;

        // Register built-in shortcuts
        this._registerBuiltins();

        // Start listening
        document.addEventListener('keydown', this._boundHandler);
        this._initialized = true;
    }

    /**
     * Stop listening and cleanup
     */
    destroy() {
        document.removeEventListener('keydown', this._boundHandler);
        this._initialized = false;
    }

    /**
     * Register built-in shortcuts (help, escape, focus input)
     * @private
     */
    _registerBuiltins() {
        // ? - Toggle help modal
        if (this.helpModal) {
            this.register({
                key: '?',
                type: 'global',
                description: 'Toggle help dialog',
                action: () => this.helpModal.toggle()
            });
        }

        // Escape - Close modals
        this.register({
            key: 'Escape',
            type: 'global',
            description: 'Close dialogs',
            hidden: true, // Don't show in help
            action: () => {
                if (this.onEscape) {
                    this.onEscape();
                } else if (this.helpModal && this.helpModal.isOpen()) {
                    this.helpModal.close();
                }
            }
        });

        // Ctrl+I - Focus main input
        if (this.mainInput) {
            this.register({
                key: 'i',
                type: 'ctrl',
                description: 'Focus input field',
                action: () => this.mainInput.focus()
            });
        }
    }

    /**
     * Register a keyboard shortcut
     * @param {Object} shortcut - Shortcut configuration
     * @param {string} shortcut.key - The key to listen for (e.g., 'i', '1', 'Enter')
     * @param {string} shortcut.type - Shortcut type: 'global', 'ctrl', 'alt', 'ctrlShift', 'plain'
     * @param {string} shortcut.description - Human-readable description for help modal
     * @param {Function} shortcut.action - Function to execute when triggered
     * @param {string} shortcut.category - Category for grouping in help (optional)
     * @param {boolean} shortcut.hidden - If true, don't show in help content (optional)
     * @param {boolean} shortcut.allowInInput - If true, trigger even when in input field (optional)
     */
    register(shortcut) {
        const { key, type, description, action, category = 'General', hidden = false, allowInInput = false } = shortcut;

        if (!key || !type || !action) {
            console.warn('KeyboardManager: Invalid shortcut registration', shortcut);
            return;
        }

        const entry = {
            key: key.toLowerCase(),
            keyDisplay: key,
            description,
            action,
            category,
            hidden,
            allowInInput
        };

        if (this.shortcuts[type]) {
            this.shortcuts[type].push(entry);
        } else {
            console.warn(`KeyboardManager: Unknown shortcut type "${type}"`);
        }
    }

    /**
     * Register multiple shortcuts at once
     * @param {Array} shortcuts - Array of shortcut configurations
     */
    registerAll(shortcuts) {
        shortcuts.forEach(s => this.register(s));
    }

    /**
     * Handle keydown events
     * @private
     */
    _handleKeydown(e) {
        const key = e.key.toLowerCase();
        const isInInput = this._isInputFocused();
        const hasCtrl = e.metaKey || e.ctrlKey;
        const hasAlt = e.altKey;
        const hasShift = e.shiftKey;

        // Try to match shortcuts in order of specificity
        let matched = false;

        // 1. Ctrl+Shift shortcuts
        if (hasCtrl && hasShift && !hasAlt) {
            matched = this._tryExecute(this.shortcuts.ctrlShift, key, e, isInInput);
        }

        // 2. Ctrl shortcuts (without shift)
        if (!matched && hasCtrl && !hasShift && !hasAlt) {
            matched = this._tryExecute(this.shortcuts.ctrl, key, e, isInInput);
        }

        // 3. Alt shortcuts
        if (!matched && hasAlt && !hasCtrl && !hasShift) {
            matched = this._tryExecute(this.shortcuts.alt, key, e, isInInput);
        }

        // 4. Global shortcuts (? and Escape work anywhere)
        if (!matched) {
            matched = this._tryExecute(this.shortcuts.global, e.key, e, isInInput);
        }

        // 5. Plain key shortcuts (only when not in input)
        if (!matched && !hasCtrl && !hasAlt && !hasShift && !isInInput) {
            matched = this._tryExecute(this.shortcuts.plain, key, e, isInInput);
        }
    }

    /**
     * Try to execute a matching shortcut
     * @private
     */
    _tryExecute(shortcuts, key, event, isInInput) {
        for (const shortcut of shortcuts) {
            if (shortcut.key === key.toLowerCase()) {
                // Skip if in input and not allowed
                if (isInInput && !shortcut.allowInInput && shortcut.key !== 'escape') {
                    continue;
                }

                event.preventDefault();
                shortcut.action(event);
                return true;
            }
        }
        return false;
    }

    /**
     * Check if an input element is focused
     * @private
     */
    _isInputFocused() {
        const activeEl = document.activeElement;
        if (!activeEl) return false;

        const tagName = activeEl.tagName.toLowerCase();
        return tagName === 'input' ||
               tagName === 'textarea' ||
               tagName === 'select' ||
               activeEl.isContentEditable;
    }

    /**
     * Generate HTML content for help modal shortcuts section
     * @returns {string} HTML string
     */
    generateHelpContent() {
        // Collect all visible shortcuts by category
        const byCategory = {};

        const addToCategory = (shortcuts, prefix = '') => {
            shortcuts.forEach(s => {
                if (s.hidden) return;

                const cat = s.category || 'General';
                if (!byCategory[cat]) byCategory[cat] = [];

                byCategory[cat].push({
                    keys: prefix + s.keyDisplay,
                    description: s.description
                });
            });
        };

        addToCategory(this.shortcuts.ctrl, '⌘/Ctrl + ');
        addToCategory(this.shortcuts.ctrlShift, '⌘/Ctrl + Shift + ');
        addToCategory(this.shortcuts.alt, 'Alt + ');
        addToCategory(this.shortcuts.plain, '');
        addToCategory(this.shortcuts.global, '');

        // Generate HTML
        let html = '';

        for (const [category, shortcuts] of Object.entries(byCategory)) {
            html += `<div class="help-section">
                <h4>${this._escapeHtml(category)}</h4>
                <dl class="shortcuts-list">`;

            for (const s of shortcuts) {
                const keys = s.keys.split(' + ').map(k => `<kbd>${this._escapeHtml(k.trim())}</kbd>`).join(' + ');
                html += `
                    <div class="shortcut-item">
                        <dt>${keys}</dt>
                        <dd>${this._escapeHtml(s.description)}</dd>
                    </div>`;
            }

            html += `</dl></div>`;
        }

        return html;
    }

    /**
     * Get shortcuts as structured data (for custom rendering)
     * @returns {Object} Shortcuts organized by category
     */
    getShortcutsData() {
        const byCategory = {};

        const addToCategory = (shortcuts, modifiers) => {
            shortcuts.forEach(s => {
                if (s.hidden) return;

                const cat = s.category || 'General';
                if (!byCategory[cat]) byCategory[cat] = [];

                byCategory[cat].push({
                    key: s.keyDisplay,
                    modifiers,
                    description: s.description
                });
            });
        };

        addToCategory(this.shortcuts.ctrl, ['ctrl']);
        addToCategory(this.shortcuts.ctrlShift, ['ctrl', 'shift']);
        addToCategory(this.shortcuts.alt, ['alt']);
        addToCategory(this.shortcuts.plain, []);
        addToCategory(this.shortcuts.global, []);

        return byCategory;
    }

    /**
     * Escape HTML entities
     * @private
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Create a KeyboardManager with common shortcuts pre-registered
     * @param {Object} options - Same as constructor options
     * @param {Object} commonShortcuts - Common shortcuts to register
     * @returns {KeyboardManager}
     */
    static create(options = {}, commonShortcuts = {}) {
        const manager = new KeyboardManager(options);

        // Register common shortcuts if provided
        if (commonShortcuts.focusInput && options.mainInput) {
            // Already handled in _registerBuiltins
        }

        return manager;
    }
}

/**
 * Predefined shortcut configurations for common actions
 * Use these as templates when registering shortcuts
 */
KeyboardManager.COMMON = {
    // Navigation
    focusInput: (input) => ({
        key: 'i',
        type: 'ctrl',
        category: 'Navigation',
        description: 'Focus input field',
        action: () => input.focus()
    }),

    jumpToResults: (element) => ({
        key: 'r',
        type: 'ctrl',
        category: 'Navigation',
        description: 'Jump to results',
        action: () => element.scrollIntoView({ behavior: 'smooth' })
    }),

    // Data management
    exportJSON: (handler) => ({
        key: 'e',
        type: 'ctrl',
        category: 'Data',
        description: 'Export as JSON',
        action: handler
    }),

    clearAll: (handler) => ({
        key: 'Delete',
        type: 'ctrlShift',
        category: 'Data',
        description: 'Clear all data',
        action: handler
    }),

    // Weight/rating selection (1-5 or 1-10)
    setWeight: (handler, max = 5) => {
        const shortcuts = [];
        for (let i = 1; i <= Math.min(max, 9); i++) {
            shortcuts.push({
                key: String(i),
                type: 'ctrl',
                category: 'Rating',
                description: `Set weight/rating to ${i}`,
                action: () => handler(i)
            });
        }
        if (max >= 10) {
            shortcuts.push({
                key: '0',
                type: 'ctrl',
                category: 'Rating',
                description: 'Set weight/rating to 10',
                action: () => handler(10)
            });
        }
        return shortcuts;
    },

    // Quadrant selection (for Eisenhower/Risk tools)
    selectQuadrant: (handler, labels = ['Q1', 'Q2', 'Q3', 'Q4']) => {
        return labels.map((label, index) => ({
            key: String(index + 1),
            type: 'ctrlShift',
            category: 'Quadrant',
            description: `Select ${label}`,
            action: () => handler(index + 1)
        }));
    }
};
