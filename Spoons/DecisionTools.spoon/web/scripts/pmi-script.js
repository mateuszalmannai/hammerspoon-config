// Pros & Cons Application

// Constants
const ITEM_TYPES = {
    UNCATEGORIZED: 'uncategorized',
    PRO: 'pro',
    CON: 'con',
    INTERESTING: 'interesting'
};

// Use centralized APP_CONFIG
const CONFIG = {
    ...APP_CONFIG.COMMON,
    ...APP_CONFIG.PMI
};

const MAX_TASK_LENGTH = CONFIG.MAX_ITEM_LENGTH;

class ProsConsManager {
    constructor() {
        this.currentItemId = null;
        this.initializeElements();
        
        // Initialize logger
        this.logger = Logger.getLogger('PMI');
        
        // Initialize utilities
        this.themeManager = new ThemeManager(CONFIG.THEME_KEY);
        this.toasts = new ToastManager({ duration: CONFIG.TOAST_DURATION, fadeDuration: CONFIG.TOAST_FADE_DURATION });
        this.storage = new StorageManager(CONFIG.STORAGE_KEY, {
            version: 1,
            onError: (msg) => this.logger.error(msg)
        });
        this.helpModalManager = new ModalManager(this.helpModal);
        
        // Initialize error handler
        this.errorHandler = new ErrorHandler({
            appName: 'PMI-Tool',
            toastManager: this.toasts
        });
        
        // Initialize import/export manager
        this.importExportManager = new ImportExportManager({
            appName: 'pmi-tool',
            toastManager: this.toasts,
            validateItem: (item) => this.validateItem(item),
            getCategoryName: (type) => this.getCategoryName(type)
        });

        // Initialize sample data manager
        this.sampleDataManager = new SampleDataManager();

        // Initialize history manager
        this.history = new HistoryManager();

        // Load items after storage manager is initialized
        this.items = this.loadItems();
        
        this.themeManager.loadTheme();
        this.attachEventListeners();
        this.render();

        // Render storage indicator (tool-specific)
        this.storage.renderToolIndicator('#storage-indicator-container');
    }

    // Initialize DOM elements
    initializeElements() {
        this.taskForm = document.getElementById('task-form');
        this.taskInput = document.getElementById('main-input');
        this.charCounter = document.getElementById('char-counter');
        this.charCount = document.getElementById('char-count');
        this.weightInput = document.getElementById('weight-input');
        this.weightButtons = document.querySelectorAll('.weight-btn');
        
        // Lists
        this.prosList = document.getElementById('pros-list');
        this.consList = document.getElementById('cons-list');
        this.interestingList = document.getElementById('interesting-list');
        this.uncategorizedList = document.getElementById('uncategorized-list');
        
        // Sections
        this.uncategorizedSection = document.querySelector('.uncategorized-section');
        
        // Counts
        this.prosCount = document.getElementById('pros-count');
        this.consCount = document.getElementById('cons-count');
        this.interestingCount = document.getElementById('interesting-count');
        this.uncategorizedCount = document.getElementById('uncategorized-count');
        
        // Clear buttons
        this.clearProsBtn = document.getElementById('clear-pros');
        this.clearConsBtn = document.getElementById('clear-cons');
        this.clearInterestingBtn = document.getElementById('clear-interesting');
        this.clearUncategorizedBtn = document.getElementById('clear-uncategorized');
        
        // Footer
        this.statUncategorized = document.getElementById('stat-uncategorized');
        this.statPlus = document.getElementById('stat-plus');
        this.statMinus = document.getElementById('stat-minus');
        this.statInteresting = document.getElementById('stat-interesting');
        this.clearAllBtn = document.getElementById('clear-all');
        
        // Decision summary
        this.decisionSummary = document.getElementById('decision-summary');
        this.decisionIndicator = document.getElementById('decision-indicator');
        this.decisionIcon = document.getElementById('decision-icon');
        this.decisionText = document.getElementById('decision-text');
        this.decisionScore = document.getElementById('decision-score');
        
        // Theme toggle
        this.themeToggle = document.getElementById('theme-toggle');
        
        // Help modal
        this.helpToggle = document.getElementById('help-toggle');
        this.helpModal = document.getElementById('help-modal');
        this.helpModalClose = document.getElementById('help-modal-close');
        
        // Toast container
        this.toastContainer = document.getElementById('toast-container');
        
        // Mobile category buttons
        this.mobileCategoryButtons = document.querySelectorAll('.btn-category');
        
        // Import/Export controls
        this.importFile = document.getElementById('import-file');
        this.importBtn = document.getElementById('import-btn');
        this.exportSelect = document.getElementById('export-select');
        this.loadSampleBtn = document.getElementById('load-sample-btn');
        this.saveHistoryBtn = document.getElementById('save-history-btn');
    }

    // Attach event listeners
    attachEventListeners() {
        // Form submission
        this.taskForm.addEventListener('submit', (e) => {
            this.handleAddItem(e, ITEM_TYPES.UNCATEGORIZED);
        });
        
        // Character counter
        this.charCounterUtil = new CharacterCounter(this.taskInput, this.charCount, { maxLength: CONFIG.MAX_ITEM_LENGTH, warningThreshold: CONFIG.CHAR_WARNING_THRESHOLD / CONFIG.MAX_ITEM_LENGTH, dangerThreshold: CONFIG.CHAR_DANGER_THRESHOLD / CONFIG.MAX_ITEM_LENGTH });
        
        // Weight selector buttons
        this.weightButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const weight = btn.dataset.weight;
                this.setWeight(weight);
            });
        });
        
        // Keyboard shortcuts for weight selection
        this.taskInput.addEventListener('keydown', (e) => {
            // Cmd+1 through Cmd+5 to set weight
            if (e.metaKey && e.key >= '1' && e.key <= '5') {
                e.preventDefault();
                this.setWeight(e.key);
                this.announceToScreenReader(`Weight set to ${e.key}`);
            }
        });
        
        // Mobile category buttons
        this.mobileCategoryButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = btn.dataset.type;
                if (this.taskInput.value.trim()) {
                    this.handleAddItem(e, type);
                } else {
                    this.taskInput.focus();
                }
            });
        });
        
        // Theme toggle
        this.themeToggle.addEventListener('click', () => this.themeManager.toggleTheme());
        
        // Help modal
        this.helpToggle.addEventListener('click', () => {
            this.helpModalManager.toggle();
        });
        this.helpModalClose.addEventListener('click', () => this.helpModalManager.close());
        
        // Clear section buttons
        this.clearProsBtn.addEventListener('click', () => this.clearSection(ITEM_TYPES.PRO));
        this.clearConsBtn.addEventListener('click', () => this.clearSection(ITEM_TYPES.CON));
        this.clearInterestingBtn.addEventListener('click', () => this.clearSection(ITEM_TYPES.INTERESTING));
        this.clearUncategorizedBtn.addEventListener('click', () => this.clearSection(ITEM_TYPES.UNCATEGORIZED));
        this.clearAllBtn.addEventListener('click', () => this.clearAll());
        
        // Event delegation for item lists (all four lists)
        [this.prosList, this.consList, this.interestingList, this.uncategorizedList].forEach(list => {
            list.addEventListener('click', (e) => {
                const itemElement = e.target.closest('.item-element');
                if (!itemElement) return;
                
                const itemId = itemElement.dataset.itemId;
                
                if (e.target.classList.contains('delete-btn')) {
                    this.deleteItem(itemId);
                } else if (e.target.classList.contains('item-weight')) {
                    this.editItemWeight(itemId, e.target);
                } else if (e.target.classList.contains('toast-close')) {
                    e.target.closest('.toast').remove();
                }
            });
            
            // Handle category transfer dropdown
            list.addEventListener('change', (e) => {
                if (e.target.classList.contains('category-transfer')) {
                    const itemId = e.target.dataset.itemId;
                    const newType = e.target.value;
                    if (newType) {
                        this.moveItem(itemId, newType);
                        e.target.value = ''; // Reset dropdown
                    }
                }
            });
            
            // Keyboard interaction for weight badges
            list.addEventListener('keydown', (e) => {
                if (e.target.classList.contains('item-weight') && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    const itemElement = e.target.closest('.item-element');
                    if (itemElement) {
                        const itemId = itemElement.dataset.itemId;
                        this.editItemWeight(itemId, e.target);
                    }
                }
            });
        });
        
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Cmd+P: Add as Plus
            if (e.metaKey && e.key === 'p') {
                e.preventDefault();
                if (this.taskInput.value.trim()) {
                    this.handleAddItem(e, ITEM_TYPES.PRO);
                }
            }
            
            // Cmd+M: Add as Minus
            if (e.metaKey && e.key === 'm') {
                e.preventDefault();
                if (this.taskInput.value.trim()) {
                    this.handleAddItem(e, ITEM_TYPES.CON);
                }
            }
            
            // Cmd+I: Add as Interesting
            if (e.metaKey && e.key === 'i') {
                e.preventDefault();
                if (this.taskInput.value.trim()) {
                    this.handleAddItem(e, ITEM_TYPES.INTERESTING);
                }
            }
            
            // Navigation shortcuts (only when not typing in input)
            if (!e.target.matches('input, textarea, select')) {
                // I: Focus Input field
                if (e.key === 'i' && !e.metaKey && !e.ctrlKey) {
                    e.preventDefault();
                    this.taskInput.focus();
                    return;
                }
                
                // P: Navigate to Plus section
                if (e.key === 'p' && !e.metaKey && !e.ctrlKey) {
                    e.preventDefault();
                    this.focusSection(this.prosList, 'Plus');
                    return;
                }
                
                // M: Navigate to Minus section
                if (e.key === 'm' && !e.metaKey && !e.ctrlKey) {
                    e.preventDefault();
                    this.focusSection(this.consList, 'Minus');
                    return;
                }
                
                // N: Navigate to Interesting section
                if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
                    e.preventDefault();
                    this.focusSection(this.interestingList, 'Interesting');
                    return;
                }
                
                // U: Navigate to Uncategorized section
                if (e.key === 'u' && !e.metaKey && !e.ctrlKey) {
                    e.preventDefault();
                    this.focusSection(this.uncategorizedList, 'Uncategorized');
                    return;
                }
            }
            
            // ?: Toggle help modal
            if (e.key === '?') {
                e.preventDefault();
                this.helpModalManager.toggle();
            }
            
            // Escape: Close help modal
            if (e.key === 'Escape') {
                if (this.helpModalManager.isOpen()) {
                    this.helpModalManager.close();
                }
            }
        });
        
        // Import/Export event listeners
        this.importBtn.addEventListener('click', () => {
            this.importFile.click();
        });

        this.importFile.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.handleImport(file);
            }
            // Reset input
            e.target.value = '';
        });

        this.exportSelect.addEventListener('change', (e) => {
            const format = e.target.value;
            if (format === 'json') {
                this.handleExportJSON();
            } else if (format === 'csv') {
                this.handleExportCSV();
            }
            // Reset dropdown
            e.target.value = '';
        });

        // Sample data button
        this.loadSampleBtn.addEventListener('click', () => {
            this.handleLoadSample();
        });

        // Save to history button
        this.saveHistoryBtn.addEventListener('click', () => {
            this.handleSaveToHistory();
        });
    }

    // Generate unique ID
    generateId() {
        return `item_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    }

    // Focus a section by focusing its first item or the section itself
    focusSection(listElement, sectionName) {
        const firstItem = listElement.querySelector('.item-element');
        if (firstItem) {
            // Focus the first item's weight badge for keyboard interaction
            const weightBadge = firstItem.querySelector('.item-weight');
            if (weightBadge) {
                weightBadge.focus();
                this.toasts.show(`Focused ${sectionName} section`, { type: 'info' });
            }
        } else {
            this.toasts.show(`${sectionName} section is empty`, { type: 'info' });
        }
    }

    // Handle JSON export
    handleExportJSON() {
        if (this.items.length === 0) {
            this.toasts.show('No items to export', { type: 'info' });
            return;
        }

        const metadata = {
            version: 1,
            summary: {
                uncategorized: this.items.filter(i => i.type === ITEM_TYPES.UNCATEGORIZED).length,
                plus: this.calculateWeightedScore(ITEM_TYPES.PRO),
                minus: this.calculateWeightedScore(ITEM_TYPES.CON),
                interesting: this.calculateWeightedScore(ITEM_TYPES.INTERESTING)
            }
        };

        this.importExportManager.exportToJSON(this.items, metadata);
    }

    // Handle CSV export
    handleExportCSV() {
        if (this.items.length === 0) {
            this.toasts.show('No items to export', { type: 'info' });
            return;
        }

        const headers = ['Text', 'Category', 'Weight', 'Created Date'];
        const rowMapper = (item) => [
            this.importExportManager.escapeCsvValue(item.text),
            this.getCategoryName(item.type),
            item.weight || CONFIG.WEIGHT_DEFAULT,
            new Date(item.createdAt).toLocaleString()
        ];

        this.importExportManager.exportToCSV(this.items, headers, rowMapper);
    }

    // Handle import
    async handleImport(file) {
        const result = await this.importExportManager.importFromFile(file);
        
        if (!result) {
            return; // Error already shown by manager
        }

        // Create backup before import
        this.importExportManager.createBackup('proscons_backup', this.items, 3);

        const { items, merge, metadata } = result;

        if (merge) {
            // Merge: Add imported items, skip duplicates by ID
            const existingIds = new Set(this.items.map(i => i.id));
            const newItems = items.filter(i => !existingIds.has(i.id));
            this.items = [...this.items, ...newItems];
            
            const duplicates = items.length - newItems.length;
            const message = duplicates > 0 
                ? `Imported ${newItems.length} items (${duplicates} duplicates skipped)`
                : `Imported ${newItems.length} items`;
            this.toasts.show(message, { type: 'success' });
        } else {
            // Replace: Clear and load imported items
            this.items = items;
            this.toasts.show(`Replaced with ${items.length} imported items`, { type: 'success' });
        }

        this.saveItems();
        this.render();
    }

    /**
     * Handle loading sample data
     */
    async handleLoadSample() {
        // Show modal to choose sample type
        const sampleType = await this.showSampleTypeModal();
        if (!sampleType) return; // User cancelled

        // Get sample data
        const sampleData = this.sampleDataManager.getSampleData('pmi', sampleType);
        if (!sampleData) {
            this.toasts.show('Sample data not available', { type: 'error' });
            return;
        }

        // Create backup if user has existing data
        if (this.items.length > 0) {
            this.importExportManager.createBackup('proscons_backup', this.items, 3);
        }

        // Load sample data using import manager
        const result = await this.importExportManager.importFromData(sampleData, this.items.length > 0);

        if (!result) {
            return; // Error already shown or user cancelled
        }

        // Apply import
        if (result.merge) {
            // Merge: Add imported items, skip duplicates by ID
            const existingIds = new Set(this.items.map(i => i.id));
            const newItems = result.items.filter(i => !existingIds.has(i.id));
            this.items = [...this.items, ...newItems];

            const duplicates = result.items.length - newItems.length;
            const message = duplicates > 0
                ? `Added ${newItems.length} sample items (${duplicates} duplicates skipped)`
                : `Added ${newItems.length} sample items`;
            this.toasts.show(message, { type: 'success' });
        } else {
            // Replace: Clear and load imported items
            this.items = result.items;
            this.toasts.show(`Loaded ${result.items.length} sample items`, { type: 'success' });
        }

        this.saveItems();
        this.render();

        const typeName = sampleType === 'technical' ? 'Technical' : 'Everyday';
        this.toasts.show(`${typeName} sample data loaded! 🎉`, { type: 'success' });
    }

    /**
     * Show modal to choose sample data type
     * @returns {Promise<string|null>} 'technical', 'everyday', or null if cancelled
     */
    async showSampleTypeModal() {
        return new Promise((resolve) => {
            // Create modal overlay
            const modal = document.createElement('div');
            modal.className = 'sample-modal-overlay';
            modal.innerHTML = `
                <div class="sample-modal">
                    <h3>Choose Sample Data</h3>
                    <p>Select a sample dataset to see how the PMI tool works:</p>
                    <div class="sample-options">
                        <button class="sample-option-btn" data-type="technical">
                            <strong>Technical/Professional</strong>
                            <small>Remote work decision analysis</small>
                        </button>
                        <button class="sample-option-btn" data-type="everyday">
                            <strong>Personal/Everyday</strong>
                            <small>Getting a dog decision</small>
                        </button>
                        <button class="sample-option-btn" data-type="edge-cases">
                            <strong>Edge Cases</strong>
                            <small>Special chars, Unicode, long text</small>
                        </button>
                    </div>
                    <button class="sample-cancel-btn">Cancel</button>
                </div>
            `;

            document.body.appendChild(modal);

            // Handle button clicks
            modal.querySelectorAll('.sample-option-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const type = btn.dataset.type;
                    document.body.removeChild(modal);
                    resolve(type);
                });
            });

            modal.querySelector('.sample-cancel-btn').addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(null);
            });

            // Close on overlay click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                    resolve(null);
                }
            });

            // Close on Escape key
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    document.body.removeChild(modal);
                    document.removeEventListener('keydown', handleEscape);
                    resolve(null);
                }
            };
            document.addEventListener('keydown', handleEscape);
        });
    }

    /**
     * Save current state to history
     */
    async handleSaveToHistory() {
        if (this.items.length === 0) {
            this.toasts.show('No items to save', { type: 'info' });
            return;
        }

        // Prompt for session title
        const title = await ModalManager.prompt('Enter a title for this session:', '', {
            title: 'Save to History',
            confirmText: 'Save',
            cancelText: 'Cancel'
        });

        if (!title) return; // User cancelled

        // Generate summary
        const plusCount = this.items.filter(i => i.type === ITEM_TYPES.PRO).length;
        const minusCount = this.items.filter(i => i.type === ITEM_TYPES.CON).length;
        const interestingCount = this.items.filter(i => i.type === ITEM_TYPES.INTERESTING).length;
        const summary = `${this.items.length} items: ${plusCount} Plus, ${minusCount} Minus, ${interestingCount} Interesting`;

        // Save to history
        const session = this.history.saveSession({
            tool: 'pmi',
            title: title.trim(),
            summary: summary,
            data: {
                items: this.items,
                version: 1
            }
        });

        this.toasts.show('Session saved to history', { type: 'success' });
        this.logger.info('Session saved to history:', session.id);
    }

    // Validate item structure
    validateItem(item) {
        const required = ['id', 'text', 'type'];
        const validTypes = Object.values(ITEM_TYPES);
        
        // Check required fields
        if (!required.every(field => item.hasOwnProperty(field))) {
            this.logger.warn('Invalid item: missing required fields', item);
            return false;
        }
        
        // Validate type
        if (!validTypes.includes(item.type)) {
            this.logger.warn('Invalid item: unknown type', item);
            return false;
        }
        
        // Validate weight (auto-fix if invalid)
        if (item.weight && (item.weight < CONFIG.WEIGHT_MIN || item.weight > CONFIG.WEIGHT_MAX)) {
            this.logger.warn('Invalid item: weight out of range', item);
            item.weight = CONFIG.WEIGHT_DEFAULT;
        }
        
        return true;
    }

    // Get category name
    getCategoryName(type) {
        const names = {
            [ITEM_TYPES.PRO]: 'Plus',
            [ITEM_TYPES.CON]: 'Minus',
            [ITEM_TYPES.INTERESTING]: 'Interesting',
            [ITEM_TYPES.UNCATEGORIZED]: 'Uncategorized'
        };
        return names[type] || 'Unknown';
    }

    // Add new item
    handleAddItem(e, type = ITEM_TYPES.UNCATEGORIZED) {
        e.preventDefault();
        
        const text = this.taskInput.value.trim();
        
        // Input validation
        if (!text) {
            this.taskInput.value = '';
            return;
        }

        // Check maximum length
        if (text.length > MAX_TASK_LENGTH) {
            this.announceToScreenReader(`Item is too long. Maximum ${MAX_TASK_LENGTH} characters allowed.`);
            return;
        }

        const item = {
            id: this.generateId(),
            text: text,
            type: type,
            weight: parseInt(this.weightInput.value) || CONFIG.WEIGHT_DEFAULT,
            createdAt: new Date().toISOString()
        };

        this.items.unshift(item);
        this.saveItems();
        this.taskInput.value = '';
        this.setWeight(3); // Reset to default weight
        this.render();
        
        // Announce to screen readers
        const typeLabel = type === ITEM_TYPES.PRO ? 'plus' : 
                         type === ITEM_TYPES.CON ? 'minus' : 
                         type === ITEM_TYPES.INTERESTING ? 'interesting' : 'uncategorized';
        this.announceToScreenReader(`Item added to ${typeLabel}`);
        
        // Show toast notification for keyboard shortcuts
        if (type !== ITEM_TYPES.UNCATEGORIZED) {
            const typeName = type === ITEM_TYPES.PRO ? 'Plus' : 
                            type === ITEM_TYPES.CON ? 'Minus' : 'Interesting';
            const toastType = type === ITEM_TYPES.PRO ? 'success' : 
                             type === ITEM_TYPES.CON ? 'error' : 'info';
            this.toasts.show(`Added to ${typeName}`, toastType);
        }
    }

    // Move item to different category
    moveItem(id, newType) {
        const item = this.items.find(i => i.id === id);
        if (item) {
            item.type = newType;
            this.saveItems();
            this.render();
            
            // Announce to screen readers
            const typeLabel = newType === ITEM_TYPES.PRO ? 'plus' : 
                             newType === ITEM_TYPES.CON ? 'minus' : 
                             newType === ITEM_TYPES.INTERESTING ? 'interesting' : 'uncategorized';
            this.announceToScreenReader(`Item moved to ${typeLabel}`);
        }
    }

    // Delete item
    deleteItem(id) {
        const item = this.items.find(i => i.id === id);
        const itemText = item ? item.text : '';
        
        this.items = this.items.filter(i => i.id !== id);
        this.saveItems();
        this.render();
        
        // Announce to screen readers
        if (itemText) {
            this.announceToScreenReader(`Item deleted: ${itemText}`);
        }
    }

    // Clear section
    clearSection(type) {
        const count = this.items.filter(i => i.type === type).length;
        this.items = this.items.filter(i => i.type !== type);
        this.saveItems();
        this.render();
        
        if (count > 0) {
            const typeLabel = type === ITEM_TYPES.PRO ? 'plus items' : 
                             type === ITEM_TYPES.CON ? 'minus items' : 
                             type === ITEM_TYPES.INTERESTING ? 'interesting items' : 'uncategorized items';
            this.announceToScreenReader(`${count} ${typeLabel} cleared`);
        }
    }

    // Clear all items
    async clearAll() {
        const totalCount = this.items.length;
        if (totalCount === 0) {
            this.toasts.info('No items to clear');
            return;
        }

        const confirmed = await ModalManager.confirm(
            'Clear all items?\n\nThis will delete all Plus, Minus, Interesting, and Uncategorized items. This action cannot be undone.',
            {
                title: 'Clear All Items',
                confirmText: 'Clear All',
                cancelText: 'Cancel'
            }
        );

        if (!confirmed) return;

        this.items = [];
        this.saveItems();
        this.render();

        this.toasts.success(`Cleared ${totalCount} items`);
        this.announceToScreenReader(`All ${totalCount} items cleared`);
    }

    // Show context menu


    // Set weight value
    setWeight(weight) {
        this.weightInput.value = weight;
        
        // Update active state on buttons
        this.weightButtons.forEach(btn => {
            if (btn.dataset.weight === weight.toString()) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    /**
     * Cycles the weight of an item by 1, looping from max back to min
     * @param {string} itemId - Unique identifier of the item
     * @param {HTMLElement} weightElement - The weight badge DOM element
     * @returns {void}
     * @fires showToast - Displays success message with category-specific color
     */
    editItemWeight(itemId, weightElement) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;
        
        // Cycle through weights
        let currentWeight = item.weight || CONFIG.WEIGHT_DEFAULT;
        let newWeight = currentWeight >= CONFIG.WEIGHT_MAX ? CONFIG.WEIGHT_MIN : currentWeight + 1;
        
        // Update item
        item.weight = newWeight;
        this.saveItems();
        this.render();
        
        // Show feedback with color matching category
        const toastType = item.type === ITEM_TYPES.PRO ? 'success' : 
                         item.type === ITEM_TYPES.CON ? 'error' : 
                         item.type === ITEM_TYPES.INTERESTING ? 'info' : 'neutral';
        this.toasts.show(`Importance updated to ${newWeight}`, { type: toastType });
    }

    // Render all sections
    render() {
        this.renderPros();
        this.renderCons();
        this.renderInteresting();
        this.renderUncategorized();
        this.updateStats();
    }

    // Render pros list
    renderPros() {
        const pros = this.items.filter(i => i.type === ITEM_TYPES.PRO);
        this.renderList(this.prosList, pros);
        this.prosCount.textContent = `(${pros.length})`;
        this.clearProsBtn.disabled = pros.length === 0;
        
        // Toggle empty state
        this.toggleEmptyState(this.prosList, pros.length === 0);
    }

    // Render cons list
    renderCons() {
        const cons = this.items.filter(i => i.type === ITEM_TYPES.CON);
        this.renderList(this.consList, cons);
        this.consCount.textContent = `(${cons.length})`;
        this.clearConsBtn.disabled = cons.length === 0;
        
        // Toggle empty state
        this.toggleEmptyState(this.consList, cons.length === 0);
    }

    // Render interesting list
    renderInteresting() {
        const interesting = this.items.filter(i => i.type === ITEM_TYPES.INTERESTING);
        this.renderList(this.interestingList, interesting);
        this.interestingCount.textContent = `(${interesting.length})`;
        this.clearInterestingBtn.disabled = interesting.length === 0;
        
        // Toggle empty state
        this.toggleEmptyState(this.interestingList, interesting.length === 0);
    }

    // Render uncategorized list
    renderUncategorized() {
        const uncategorized = this.items.filter(i => i.type === ITEM_TYPES.UNCATEGORIZED);
        
        // Hide section if empty
        if (uncategorized.length === 0) {
            this.uncategorizedSection.style.display = 'none';
            return;
        }
        
        this.uncategorizedSection.style.display = 'block';
        this.renderList(this.uncategorizedList, uncategorized);
        this.uncategorizedCount.textContent = `(${uncategorized.length})`;
        this.clearUncategorizedBtn.disabled = uncategorized.length === 0;
        
        // Toggle empty state
        this.toggleEmptyState(this.uncategorizedList, uncategorized.length === 0);
    }

    // Render list helper
    renderList(listElement, items) {
        // Save the empty state message if it exists
        const emptyStateMsg = listElement.querySelector('.empty-state-message');
        
        // Clear the list
        listElement.innerHTML = '';
        
        // Re-add empty state message first (will be shown/hidden by CSS)
        if (emptyStateMsg) {
            listElement.appendChild(emptyStateMsg);
        }
        
        // Add all items
        items.forEach(item => {
            const itemElement = this.createItemElement(item);
            listElement.appendChild(itemElement);
        });
    }

    // Toggle empty state visual cue
    toggleEmptyState(listElement, isEmpty) {
        if (isEmpty) {
            listElement.classList.add('empty');
        } else {
            listElement.classList.remove('empty');
        }
    }

    // Create item element
    createItemElement(item) {
        const li = document.createElement('li');
        li.className = 'item-element';
        li.setAttribute('role', 'listitem');
        li.dataset.itemId = item.id;
        
        // Create weight badge
        const weightBadge = document.createElement('span');
        weightBadge.className = 'item-weight';
        weightBadge.textContent = item.weight || 3;
        weightBadge.setAttribute('data-weight', item.weight || 3);
        weightBadge.setAttribute('aria-label', `Importance: ${item.weight || 3} out of 5`);
        weightBadge.setAttribute('title', 'Click to edit importance');
        weightBadge.setAttribute('role', 'button');
        weightBadge.setAttribute('tabindex', '0');
        
        // Create item text
        const span = document.createElement('span');
        span.className = 'item-text';
        span.textContent = item.text;
        
        // Create actions container
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'item-actions';
        
        // Add dropdown for all items to move between categories
        const select = document.createElement('select');
        select.className = 'category-transfer';
        select.setAttribute('data-item-id', item.id);
        select.setAttribute('aria-label', 'Move to category');
        
        // Build options based on current item type
        let options = '<option value="">Move to...</option>';
        
        if (item.type !== ITEM_TYPES.PRO) {
            options += `<option value="${ITEM_TYPES.PRO}">1. Plus</option>`;
        }
        if (item.type !== ITEM_TYPES.CON) {
            options += `<option value="${ITEM_TYPES.CON}">2. Minus</option>`;
        }
        if (item.type !== ITEM_TYPES.INTERESTING) {
            options += `<option value="${ITEM_TYPES.INTERESTING}">3. Interesting</option>`;
        }
        if (item.type !== ITEM_TYPES.UNCATEGORIZED) {
            options += `<option value="${ITEM_TYPES.UNCATEGORIZED}">4. Uncategorized</option>`;
        }
        
        select.innerHTML = options;
        actionsDiv.appendChild(select);
        
        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.setAttribute('aria-label', `Delete item: ${item.text}`);
        
        actionsDiv.appendChild(deleteBtn);
        
        // Create header row with weight and actions
        const headerDiv = document.createElement('div');
        headerDiv.className = 'item-element-header';
        headerDiv.appendChild(weightBadge);
        headerDiv.appendChild(actionsDiv);
        
        li.appendChild(headerDiv);
        li.appendChild(span);
        
        return li;
    }

    /**
     * Updates all statistics using a single-pass reduce for optimal performance
     * @returns {void}
     */
    updateStats() {
        // Single-pass calculation of counts and weighted scores
        const stats = this.items.reduce((acc, item) => {
            const type = item.type;
            if (!acc[type]) {
                acc[type] = { count: 0, score: 0 };
            }
            acc[type].count++;
            acc[type].score += item.weight || CONFIG.WEIGHT_DEFAULT;
            return acc;
        }, {
            [ITEM_TYPES.UNCATEGORIZED]: { count: 0, score: 0 },
            [ITEM_TYPES.PRO]: { count: 0, score: 0 },
            [ITEM_TYPES.CON]: { count: 0, score: 0 },
            [ITEM_TYPES.INTERESTING]: { count: 0, score: 0 }
        });
        
        const uncategorizedCount = stats[ITEM_TYPES.UNCATEGORIZED].count;
        const prosCount = stats[ITEM_TYPES.PRO].count;
        const consCount = stats[ITEM_TYPES.CON].count;
        const interestingCount = stats[ITEM_TYPES.INTERESTING].count;
        
        const uncategorizedScore = stats[ITEM_TYPES.UNCATEGORIZED].score;
        const prosScore = stats[ITEM_TYPES.PRO].score;
        const consScore = stats[ITEM_TYPES.CON].score;
        const interestingScore = stats[ITEM_TYPES.INTERESTING].score;
        
        // Update counts with weighted scores (Minus shows as negative)
        this.statUncategorized.textContent = uncategorizedCount > 0 ? `${uncategorizedCount} (${uncategorizedScore})` : '0';
        this.statPlus.textContent = prosCount > 0 ? `${prosCount} (+${prosScore})` : '0';
        this.statMinus.textContent = consCount > 0 ? `${consCount} (-${consScore})` : '0';
        this.statInteresting.textContent = interestingCount > 0 ? `${interestingCount} (${interestingScore})` : '0';
        
        // Update bar widths based on weighted scores
        const maxScore = Math.max(uncategorizedScore, prosScore, consScore, interestingScore, 1);
        
        document.querySelector('.stat-bar-uncategorized').style.width = `${(uncategorizedScore / maxScore) * 100}%`;
        document.querySelector('.stat-bar-plus').style.width = `${(prosScore / maxScore) * 100}%`;
        document.querySelector('.stat-bar-minus').style.width = `${(consScore / maxScore) * 100}%`;
        document.querySelector('.stat-bar-interesting').style.width = `${(interestingScore / maxScore) * 100}%`;
        
        // Update decision summary
        this.updateDecisionSummary(prosScore, consScore);
    }

    // Update decision summary
    updateDecisionSummary(prosScore, consScore) {
        const interestingScore = this.calculateWeightedScore(ITEM_TYPES.INTERESTING);
        
        // Clear previous classes
        this.decisionIndicator.classList.remove('decision-plus', 'decision-minus', 'decision-interesting', 'decision-neutral');
        
        if (prosScore === 0 && consScore === 0 && interestingScore === 0) {
            // No decision items yet
            this.decisionIcon.textContent = '⚖️';
            this.decisionText.textContent = 'Add items to see decision';
            this.decisionScore.textContent = '';
            this.decisionIndicator.classList.add('decision-neutral');
        } else {
            // Find which category has highest score
            const maxScore = Math.max(prosScore, consScore, interestingScore);
            
            if (prosScore === maxScore && prosScore > 0) {
                if (consScore === maxScore || interestingScore === maxScore) {
                    // Tie
                    this.decisionIcon.textContent = '=';
                    this.decisionText.textContent = 'Tied decision';
                    this.decisionScore.textContent = `${maxScore} points each`;
                    this.decisionIndicator.classList.add('decision-neutral');
                } else {
                    // Plus wins
                    this.decisionIcon.textContent = '✓';
                    this.decisionText.textContent = 'Plus wins';
                    this.decisionScore.textContent = `${prosScore} points`;
                    this.decisionIndicator.classList.add('decision-plus');
                }
            } else if (consScore === maxScore && consScore > 0) {
                if (interestingScore === maxScore) {
                    // Tie
                    this.decisionIcon.textContent = '=';
                    this.decisionText.textContent = 'Tied decision';
                    this.decisionScore.textContent = `${maxScore} points each`;
                    this.decisionIndicator.classList.add('decision-neutral');
                } else {
                    // Minus wins
                    this.decisionIcon.textContent = '✗';
                    this.decisionText.textContent = 'Minus wins';
                    this.decisionScore.textContent = `${consScore} points`;
                    this.decisionIndicator.classList.add('decision-minus');
                }
            } else if (interestingScore === maxScore && interestingScore > 0) {
                // Interesting wins
                this.decisionIcon.textContent = '?';
                this.decisionText.textContent = 'Interesting wins';
                this.decisionScore.textContent = `${interestingScore} points`;
                this.decisionIndicator.classList.add('decision-interesting');
            } else {
                // Shouldn't happen, but default to neutral
                this.decisionIcon.textContent = '⚖️';
                this.decisionText.textContent = 'Balanced decision';
                this.decisionScore.textContent = '';
                this.decisionIndicator.classList.add('decision-neutral');
            }
        }
    }

    /**
     * Calculate weighted score for a specific category
     * @param {string} type - The item type (from ITEM_TYPES)
     * @returns {number} The sum of all weights in the category
     */
    calculateWeightedScore(type) {
        return this.items
            .filter(i => i.type === type)
            .reduce((sum, item) => sum + (item.weight || CONFIG.WEIGHT_DEFAULT), 0);
    }

    /**
     * Saves items to localStorage with error handling
     * @returns {void}
     */
    saveItems() {
        this.storage.save({ items: this.items });
        this.storage.updateToolIndicator();
        StorageManager.checkStorageAndWarn(this.toasts);
    }

    // Load items from localStorage
    loadItems() {
        // Check for restore data from history
        const restoreKey = 'restore_pmi';
        const restoreData = localStorage.getItem(restoreKey);
        if (restoreData) {
            try {
                const restored = JSON.parse(restoreData);
                localStorage.removeItem(restoreKey);
                if (restored.data && restored.data.items) {
                    // Defer toast until after render
                    setTimeout(() => this.toasts.show('Session restored from history', { type: 'success' }), 100);
                    return restored.data.items.map(item => ({
                        ...item,
                        weight: item.weight || CONFIG.WEIGHT_DEFAULT
                    }));
                }
            } catch (e) {
                this.logger.error('Failed to restore from history:', e);
                localStorage.removeItem(restoreKey);
            }
        }

        const state = this.storage ? this.storage.load() : null;
        if (state && state.items) {
            // Migration: Ensure all items have weight property
            return state.items.map(item => ({
                ...item,
                weight: item.weight || CONFIG.WEIGHT_DEFAULT
            }));
        }

        // Fallback to direct localStorage for first load before storage manager exists
        try {
            const items = localStorage.getItem(CONFIG.STORAGE_KEY);
            const loadedItems = items ? JSON.parse(items) : [];
            return loadedItems.map(item => ({
                ...item,
                weight: item.weight || CONFIG.WEIGHT_DEFAULT
            }));
        } catch (error) {
            this.logger.error('Failed to load items:', error);
            return [];
        }
    }

    // Announce to screen readers
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'visually-hidden';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        // Remove after announcement
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ProsConsManager();
    });
} else {
    new ProsConsManager();
}
