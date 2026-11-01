// Cost-Benefit Analysis Tool

// Use centralized APP_CONFIG
const CONFIG = {
    ...APP_CONFIG.COMMON,
    ...APP_CONFIG.COST_BENEFIT
};

const ITEM_TYPES = {
    COST: 'cost',
    BENEFIT: 'benefit'
};

const CATEGORIES = {
    ONE_TIME: 'one-time',
    RECURRING: 'recurring'
};

const FREQUENCIES = {
    MONTHLY: 'monthly',
    YEARLY: 'yearly'
};

class CostBenefitAnalyzer {
    constructor() {
        this.items = [];
        this.currentType = ITEM_TYPES.COST;

        // Initialize DOM elements
        this.initializeElements();

        // Initialize utilities
        this.logger = Logger.getLogger('CostBenefitAnalyzer');
        this.themeManager = new ThemeManager(CONFIG.THEME_KEY);
        this.storage = new StorageManager(CONFIG.STORAGE_KEY);
        this.toasts = new ToastManager({ duration: 3000 });
        this.errorHandler = new ErrorHandler({
            logger: this.logger,
            toastManager: this.toasts,
            appName: 'Cost-Benefit Analysis'
        });

        // Initialize modal manager for help
        this.helpModalManager = new ModalManager(this.helpModalElement);

        // Initialize character counter
        this.characterCounter = new CharacterCounter(
            this.descriptionInput,
            this.charCountElement,
            { maxLength: CONFIG.MAX_DESCRIPTION_LENGTH }
        );

        // Initialize ImportExportManager
        this.importExportManager = new ImportExportManager({
            appName: 'cost-benefit',
            logger: this.logger,
            toasts: this.toasts,
            validateItem: (item) => this.validateItem(item),
            columnMappings: {
                description: ['description', 'name', 'item', 'text'],
                type: ['type', 'category_type', 'cost_benefit'],
                category: ['category', 'timing', 'recurrence'],
                amount: ['amount', 'value', 'cost', 'benefit', 'price'],
                frequency: ['frequency', 'freq', 'period']
            }
        });

        // Initialize sample data manager
        this.sampleDataManager = new SampleDataManager();

        // Initialize history manager
        this.history = new HistoryManager();

        // Load theme
        this.themeManager.loadTheme();

        // Setup event listeners
        this.setupEventListeners();

        // Load saved data
        this.loadState();
        this.render();

        // Render storage indicator
        this.storage.renderToolIndicator('#storage-indicator-container');

        this.logger.info('CostBenefitAnalyzer initialized');
    }

    initializeElements() {
        // Form elements
        this.itemForm = document.getElementById('item-form');
        this.descriptionInput = document.getElementById('main-input');
        this.amountInput = document.getElementById('amount-input');
        this.categorySelect = document.getElementById('category-select');
        this.frequencySelect = document.getElementById('frequency-select');
        this.frequencyGroup = document.getElementById('frequency-group');
        this.charCountElement = document.getElementById('char-count');

        // Type toggle buttons
        this.typeToggle = document.querySelector('.type-toggle');
        this.costBtn = this.typeToggle.querySelector('[data-type="cost"]');
        this.benefitBtn = this.typeToggle.querySelector('[data-type="benefit"]');

        // Data management buttons
        this.loadSampleBtn = document.getElementById('load-sample-btn');
        this.clearAllBtn = document.getElementById('clear-all');
        this.importBtn = document.getElementById('import-btn');
        this.exportSelect = document.getElementById('export-select');
        this.importFile = document.getElementById('import-file');
        this.saveHistoryBtn = document.getElementById('save-history-btn');

        // Summary elements
        this.summaryCards = document.getElementById('summary-cards');
        this.comparisonBarContainer = document.getElementById('comparison-bar-container');

        // Lists
        this.costsListEl = document.getElementById('costs-list');
        this.benefitsListEl = document.getElementById('benefits-list');
        this.costsEmptyEl = document.getElementById('costs-empty');
        this.benefitsEmptyEl = document.getElementById('benefits-empty');
        this.costsCountEl = document.getElementById('costs-count');
        this.benefitsCountEl = document.getElementById('benefits-count');
        this.costsTotalEl = document.getElementById('costs-total');
        this.benefitsTotalEl = document.getElementById('benefits-total');

        // Help modal
        this.helpModalElement = document.getElementById('help-modal');
        this.helpToggle = document.getElementById('help-toggle');

        // Theme toggle
        this.themeToggle = document.getElementById('theme-toggle');
    }

    setupEventListeners() {
        // Form submission
        this.itemForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // Type toggle
        this.typeToggle.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-type]');
            if (btn) {
                this.setActiveType(btn.dataset.type);
            }
        });

        // Category change - show/hide frequency
        this.categorySelect.addEventListener('change', () => {
            this.updateFrequencyVisibility();
        });

        // Data management
        this.loadSampleBtn.addEventListener('click', () => this.handleLoadSample());
        this.clearAllBtn.addEventListener('click', () => this.handleClearAll());
        this.importBtn.addEventListener('click', () => this.importFile.click());
        this.importFile.addEventListener('change', (e) => this.handleImportFile(e));
        this.exportSelect.addEventListener('change', (e) => this.handleExport(e));
        this.saveHistoryBtn.addEventListener('click', () => this.handleSaveToHistory());

        // Help modal
        this.helpToggle.addEventListener('click', () => {
            this.helpModalManager.toggle();
        });

        // Theme toggle
        this.themeToggle.addEventListener('click', () => {
            this.themeManager.toggleTheme();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Delete item delegation
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="delete"]')) {
                const itemId = e.target.closest('[data-action="delete"]').dataset.itemId;
                this.deleteItem(itemId);
            }
        });
    }

    updateFrequencyVisibility() {
        if (this.categorySelect.value === CATEGORIES.RECURRING) {
            this.frequencyGroup.style.display = 'block';
        } else {
            this.frequencyGroup.style.display = 'none';
        }
    }

    setActiveType(type) {
        this.currentType = type;
        this.costBtn.classList.toggle('active', type === ITEM_TYPES.COST);
        this.benefitBtn.classList.toggle('active', type === ITEM_TYPES.BENEFIT);
    }

    handleSubmit() {
        const description = this.descriptionInput.value.trim();
        const amount = parseFloat(this.amountInput.value);

        if (!description) {
            this.toasts.show('Please enter a description', { type: 'warning' });
            this.descriptionInput.focus();
            return;
        }

        if (isNaN(amount) || amount < 0) {
            this.toasts.show('Please enter a valid amount', { type: 'warning' });
            this.amountInput.focus();
            return;
        }

        const category = this.categorySelect.value;
        const frequency = category === CATEGORIES.RECURRING
            ? this.frequencySelect.value
            : FREQUENCIES.YEARLY;

        this.addItem(description, amount, this.currentType, category, frequency);

        // Reset form
        this.descriptionInput.value = '';
        this.amountInput.value = '';
        this.characterCounter.reset();
        this.descriptionInput.focus();
    }

    addItem(description, amount, type, category, frequency) {
        const item = {
            id: this.generateId('item'),
            description: description.trim(),
            type: type,
            category: category,
            amount: amount,
            frequency: frequency,
            createdAt: new Date().toISOString()
        };

        this.items.push(item);
        this.saveState();
        this.render();

        const typeLabel = type === ITEM_TYPES.COST ? 'Cost' : 'Benefit';
        this.toasts.show(`${typeLabel} added: ${this.formatCurrency(amount)}`, {
            type: 'success'
        });

        this.logger.info('Item added', { itemId: item.id, type, amount });
        return item;
    }

    deleteItem(itemId) {
        const index = this.items.findIndex(i => i.id === itemId);
        if (index !== -1) {
            const item = this.items[index];
            this.items.splice(index, 1);
            this.saveState();
            this.render();
            this.toasts.info('Item deleted');
            this.logger.info('Item deleted', { itemId, type: item.type });
        }
    }

    async handleClearAll() {
        if (this.items.length === 0) {
            this.toasts.info('No items to clear');
            return;
        }

        const confirmed = await ModalManager.confirm(
            'Clear all items?\n\nThis will delete all costs and benefits. This action cannot be undone.',
            {
                title: 'Clear All Items',
                confirmText: 'Clear All',
                cancelText: 'Cancel'
            }
        );

        if (!confirmed) return;

        const count = this.items.length;
        this.items = [];
        this.saveState();
        this.render();
        this.toasts.success(`Cleared ${count} items`);
        this.logger.info('All items cleared', { count });
    }

    // Calculations

    getAnnualizedAmount(item) {
        if (item.category === CATEGORIES.ONE_TIME) {
            return item.amount;
        }
        // Recurring
        if (item.frequency === FREQUENCIES.MONTHLY) {
            return item.amount * 12;
        }
        return item.amount; // Yearly
    }

    calculateTotals() {
        const costs = this.items.filter(i => i.type === ITEM_TYPES.COST);
        const benefits = this.items.filter(i => i.type === ITEM_TYPES.BENEFIT);

        const totalCosts = costs.reduce((sum, item) => sum + this.getAnnualizedAmount(item), 0);
        const totalBenefits = benefits.reduce((sum, item) => sum + this.getAnnualizedAmount(item), 0);
        const netBenefit = totalBenefits - totalCosts;

        // Benefit-Cost Ratio (avoid division by zero)
        let bcr = 0;
        if (totalCosts > 0) {
            bcr = totalBenefits / totalCosts;
        } else if (totalBenefits > 0) {
            bcr = Infinity;
        }

        // ROI percentage
        let roi = 0;
        if (totalCosts > 0) {
            roi = (netBenefit / totalCosts) * 100;
        } else if (netBenefit > 0) {
            roi = Infinity;
        }

        return {
            totalCosts,
            totalBenefits,
            netBenefit,
            bcr,
            roi,
            costsCount: costs.length,
            benefitsCount: benefits.length
        };
    }

    // Rendering

    render() {
        this.renderSummaryCards();
        this.renderComparisonBar();
        this.renderLists();
        this.updateCounts();
        this.updateEmptyStates();
    }

    renderSummaryCards() {
        const totals = this.calculateTotals();

        const netClass = totals.netBenefit >= 0 ? 'net-positive' : 'net-negative';
        const netValueClass = totals.netBenefit >= 0 ? 'positive' : 'negative';

        let ratioClass = 'ratio-neutral';
        if (totals.bcr > 1) ratioClass = 'ratio-good';
        else if (totals.bcr < 1 && totals.bcr > 0) ratioClass = 'ratio-bad';

        const bcrDisplay = totals.bcr === Infinity ? 'N/A' : totals.bcr.toFixed(2);
        const roiDisplay = totals.roi === Infinity ? 'N/A' : `${totals.roi.toFixed(1)}%`;

        this.summaryCards.innerHTML = `
            <div class="summary-card costs">
                <div class="summary-label">Total Costs</div>
                <div class="summary-value negative">${this.formatCurrency(totals.totalCosts)}</div>
                <div class="summary-sublabel">Annualized</div>
            </div>
            <div class="summary-card benefits">
                <div class="summary-label">Total Benefits</div>
                <div class="summary-value positive">${this.formatCurrency(totals.totalBenefits)}</div>
                <div class="summary-sublabel">Annualized</div>
            </div>
            <div class="summary-card ${netClass}">
                <div class="summary-label">Net Benefit</div>
                <div class="summary-value ${netValueClass}">${this.formatCurrency(totals.netBenefit)}</div>
                <div class="summary-sublabel">Benefits - Costs</div>
            </div>
            <div class="summary-card ${ratioClass}">
                <div class="summary-label">Benefit-Cost Ratio</div>
                <div class="summary-value">${bcrDisplay}</div>
                <div class="summary-sublabel">${totals.bcr > 1 ? 'Favorable' : totals.bcr === 1 ? 'Break-even' : totals.bcr > 0 ? 'Unfavorable' : 'N/A'}</div>
            </div>
            <div class="summary-card ${ratioClass}">
                <div class="summary-label">ROI</div>
                <div class="summary-value ${netValueClass}">${roiDisplay}</div>
                <div class="summary-sublabel">Return on Investment</div>
            </div>
        `;
    }

    renderComparisonBar() {
        const totals = this.calculateTotals();
        const total = totals.totalCosts + totals.totalBenefits;

        if (total === 0) {
            this.comparisonBarContainer.innerHTML = `
                <div class="comparison-bar costs" style="width: 50%;">Costs: €0</div>
                <div class="comparison-bar benefits" style="width: 50%;">Benefits: €0</div>
            `;
            return;
        }

        const costsPercent = (totals.totalCosts / total) * 100;
        const benefitsPercent = (totals.totalBenefits / total) * 100;

        this.comparisonBarContainer.innerHTML = `
            <div class="comparison-bar costs" style="width: ${costsPercent}%;">
                ${costsPercent > 15 ? this.formatCurrency(totals.totalCosts) : ''}
            </div>
            <div class="comparison-bar benefits" style="width: ${benefitsPercent}%;">
                ${benefitsPercent > 15 ? this.formatCurrency(totals.totalBenefits) : ''}
            </div>
        `;
    }

    renderLists() {
        const costs = this.items.filter(i => i.type === ITEM_TYPES.COST);
        const benefits = this.items.filter(i => i.type === ITEM_TYPES.BENEFIT);

        // Sort by annualized amount (highest first)
        costs.sort((a, b) => this.getAnnualizedAmount(b) - this.getAnnualizedAmount(a));
        benefits.sort((a, b) => this.getAnnualizedAmount(b) - this.getAnnualizedAmount(a));

        this.costsListEl.innerHTML = costs.map(item => this.renderItem(item)).join('');
        this.benefitsListEl.innerHTML = benefits.map(item => this.renderItem(item)).join('');

        // Update totals in column headers
        const totals = this.calculateTotals();
        this.costsTotalEl.textContent = this.formatCurrency(totals.totalCosts);
        this.benefitsTotalEl.textContent = this.formatCurrency(totals.totalBenefits);
    }

    renderItem(item) {
        const annualized = this.getAnnualizedAmount(item);
        const amountClass = item.type === ITEM_TYPES.COST ? 'cost' : 'benefit';
        const categoryBadge = item.category === CATEGORIES.ONE_TIME
            ? '<span class="item-badge one-time">One-time</span>'
            : `<span class="item-badge recurring">${item.frequency === FREQUENCIES.MONTHLY ? 'Monthly' : 'Yearly'}</span>`;

        const showAnnualized = item.category === CATEGORIES.RECURRING && item.frequency === FREQUENCIES.MONTHLY;

        return `
            <li class="item" data-item-id="${item.id}">
                <div class="item-info">
                    <div class="item-description">${DOMHelpers.escapeHtml(item.description)}</div>
                    <div class="item-meta">
                        ${categoryBadge}
                    </div>
                </div>
                <div class="item-amount ${amountClass}">
                    ${this.formatCurrency(item.amount)}${item.frequency === FREQUENCIES.MONTHLY ? '/mo' : ''}
                    ${showAnnualized ? `<span class="item-annualized">${this.formatCurrency(annualized)}/yr</span>` : ''}
                </div>
                <div class="item-actions">
                    <button class="btn-icon" data-action="delete" data-item-id="${item.id}"
                            aria-label="Delete item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                             viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                    </button>
                </div>
            </li>
        `;
    }

    updateCounts() {
        const costs = this.items.filter(i => i.type === ITEM_TYPES.COST);
        const benefits = this.items.filter(i => i.type === ITEM_TYPES.BENEFIT);

        this.costsCountEl.textContent = `(${costs.length})`;
        this.benefitsCountEl.textContent = `(${benefits.length})`;
    }

    updateEmptyStates() {
        const costs = this.items.filter(i => i.type === ITEM_TYPES.COST);
        const benefits = this.items.filter(i => i.type === ITEM_TYPES.BENEFIT);

        this.costsEmptyEl.style.display = costs.length === 0 ? 'block' : 'none';
        this.benefitsEmptyEl.style.display = benefits.length === 0 ? 'block' : 'none';
    }

    // Import/Export

    handleExport(event) {
        const format = event.target.value;
        if (!format) return;

        if (format === 'json') {
            this.handleExportJSON();
        } else if (format === 'csv') {
            this.handleExportCSV();
        }

        event.target.value = ''; // Reset dropdown
    }

    handleExportJSON() {
        const totals = this.calculateTotals();
        const data = {
            version: 1,
            appName: 'cost-benefit',
            exportDate: new Date().toISOString(),
            itemCount: this.items.length,
            summary: {
                totalCosts: totals.totalCosts,
                totalBenefits: totals.totalBenefits,
                netBenefit: totals.netBenefit,
                bcr: totals.bcr === Infinity ? null : totals.bcr,
                roi: totals.roi === Infinity ? null : totals.roi
            },
            data: this.items
        };

        this.importExportManager.exportToJSON(data, 'cost-benefit');
    }

    handleExportCSV() {
        const csvData = this.items.map(item => ({
            Description: item.description,
            Type: item.type === ITEM_TYPES.COST ? 'Cost' : 'Benefit',
            Amount: item.amount,
            Category: item.category === CATEGORIES.ONE_TIME ? 'One-time' : 'Recurring',
            Frequency: item.frequency === FREQUENCIES.MONTHLY ? 'Monthly' : 'Yearly',
            'Annualized Amount': this.getAnnualizedAmount(item),
            'Created': item.createdAt
        }));

        this.importExportManager.exportToCSV(csvData, 'cost-benefit');
    }

    async handleImportFile(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        this.logger.info('Import started', { fileName: file.name, fileType: file.type });

        const result = await this.importExportManager.importFromFile(file);

        if (!result) {
            event.target.value = '';
            return;
        }

        const { items, merge } = result;

        this.logger.info('Processing import', { itemCount: items.length, merge });

        // Map imported items
        const importedItems = items.map(item => this.normalizeItem(item));

        if (merge) {
            this.items = [...this.items, ...importedItems];
            this.toasts.success(`Imported ${importedItems.length} items`);
        } else {
            this.items = importedItems;
            this.toasts.success(`Replaced with ${importedItems.length} items`);
        }

        this.saveState();
        this.render();
        this.logger.info('Items imported', { count: importedItems.length, merge });

        // Reset file input
        event.target.value = '';
    }

    normalizeItem(item) {
        // Normalize type
        let type = ITEM_TYPES.COST;
        if (item.type) {
            const typeLower = item.type.toString().toLowerCase();
            if (typeLower.includes('benefit') || typeLower === 'b' || typeLower === '+') {
                type = ITEM_TYPES.BENEFIT;
            }
        }

        // Normalize category
        let category = CATEGORIES.ONE_TIME;
        if (item.category) {
            const catLower = item.category.toString().toLowerCase();
            if (catLower.includes('recurring') || catLower === 'r' || catLower === 'rec') {
                category = CATEGORIES.RECURRING;
            }
        }

        // Normalize frequency
        let frequency = FREQUENCIES.YEARLY;
        if (item.frequency) {
            const freqLower = item.frequency.toString().toLowerCase();
            if (freqLower.includes('month') || freqLower === 'm' || freqLower === 'mo') {
                frequency = FREQUENCIES.MONTHLY;
            }
        }

        return {
            id: item.id || this.generateId('item'),
            description: item.description || item.name || item.text || item.item || 'Unnamed item',
            type: type,
            category: category,
            amount: parseFloat(item.amount) || 0,
            frequency: frequency,
            createdAt: item.createdAt || new Date().toISOString()
        };
    }

    validateItem(item) {
        return item && (item.description || item.name || item.text || item.item) &&
               item.amount !== undefined && !isNaN(parseFloat(item.amount));
    }

    async handleLoadSample() {
        const sampleType = await this.showSampleTypeModal();
        if (!sampleType) return;

        const sampleData = this.sampleDataManager.getSampleData('cost-benefit', sampleType);
        if (!sampleData) {
            this.toasts.show('Sample data not available', { type: 'error' });
            return;
        }

        // Create backup if user has existing data
        if (this.items.length > 0) {
            this.importExportManager.createBackup(CONFIG.STORAGE_KEY + '_backup', this.items, 3);
        }

        const result = await this.importExportManager.importFromData(sampleData, this.items.length > 0);

        if (!result) return;

        const importedItems = result.items.map(item => this.normalizeItem(item));

        if (result.merge) {
            const existingIds = new Set(this.items.map(i => i.id));
            const newItems = importedItems.filter(i => !existingIds.has(i.id));
            this.items = [...this.items, ...newItems];

            const duplicates = importedItems.length - newItems.length;
            const message = duplicates > 0
                ? `Added ${newItems.length} sample items (${duplicates} duplicates skipped)`
                : `Added ${newItems.length} sample items`;
            this.toasts.show(message, { type: 'success' });
        } else {
            this.items = importedItems;
            this.toasts.show(`Loaded ${importedItems.length} sample items`, { type: 'success' });
        }

        this.saveState();
        this.render();

        const typeName = sampleType === 'technical' ? 'Technical' : 'Everyday';
        this.toasts.show(`${typeName} sample data loaded!`, { type: 'success' });
    }

    async showSampleTypeModal() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'sample-modal-overlay';
            modal.innerHTML = `
                <div class="sample-modal">
                    <h3>Choose Sample Data</h3>
                    <p>Select a sample dataset to see how the Cost-Benefit Analysis tool works:</p>
                    <div class="sample-options">
                        <button class="sample-option-btn" data-type="technical">
                            <strong>Technical/Professional</strong>
                            <small>Software License Purchase</small>
                        </button>
                        <button class="sample-option-btn" data-type="everyday">
                            <strong>Personal/Everyday</strong>
                            <small>Home Solar Panel Installation</small>
                        </button>
                    </div>
                    <button class="sample-cancel-btn">Cancel</button>
                </div>
            `;

            document.body.appendChild(modal);

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

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                    resolve(null);
                }
            });

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

    async handleSaveToHistory() {
        if (this.items.length === 0) {
            this.toasts.show('No items to save', { type: 'info' });
            return;
        }

        const title = await ModalManager.prompt('Enter a title for this session:', '', {
            title: 'Save to History',
            confirmText: 'Save',
            cancelText: 'Cancel'
        });

        if (!title) return;

        const totals = this.calculateTotals();
        const summary = `${this.items.length} items: Net ${this.formatCurrency(totals.netBenefit)}, BCR ${totals.bcr === Infinity ? 'N/A' : totals.bcr.toFixed(2)}`;

        const session = this.history.saveSession({
            tool: 'cost-benefit',
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

    // Keyboard Shortcuts

    handleKeyboard(e) {
        // Help modal
        if (e.key === '?' && !this.isInputFocused()) {
            e.preventDefault();
            this.helpModalManager.toggle();
            return;
        }

        // Focus input
        if (e.ctrlKey && e.key === 'i') {
            e.preventDefault();
            this.descriptionInput.focus();
            return;
        }

        // Tab to toggle type (only when in type toggle area or form)
        if (e.key === 'Tab' && !e.shiftKey && document.activeElement === this.descriptionInput) {
            // Let default tab behavior work
        }
    }

    isInputFocused() {
        const activeEl = document.activeElement;
        return activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');
    }

    // Utility Functions

    formatCurrency(amount) {
        return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    generateId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    }

    saveState() {
        this.storage.save({ items: this.items });
        this.storage.updateToolIndicator();
        StorageManager.checkStorageAndWarn(this.toasts);
    }

    loadState() {
        // Check for restore data from history
        const restoreKey = 'restore_cost-benefit';
        const restoreData = localStorage.getItem(restoreKey);
        if (restoreData) {
            try {
                const restored = JSON.parse(restoreData);
                localStorage.removeItem(restoreKey);
                if (restored.data && restored.data.items) {
                    this.items = restored.data.items;
                    setTimeout(() => this.toasts.show('Session restored from history', { type: 'success' }), 100);
                    this.logger.info('Items restored from history', { count: this.items.length });
                    return;
                }
            } catch (e) {
                this.logger.error('Failed to restore from history:', e);
                localStorage.removeItem(restoreKey);
            }
        }

        const data = this.storage.load();
        this.items = data?.items || [];
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    try {
        new CostBenefitAnalyzer();
    } catch (error) {
        console.error('Failed to initialize Cost-Benefit Analyzer:', error);
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <h2>Unable to Load Cost-Benefit Analysis Tool</h2>
                    <p>An error occurred while initializing the application. Please refresh the page to try again.</p>
                    <pre style="color: red; text-align: left; padding: 1rem; background: #f5f5f5; border-radius: 4px; overflow-x: auto;">${error.message}</pre>
                </div>
            `;
        }
    }
});
