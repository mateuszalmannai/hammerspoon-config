/**
 * Decision Matrix Tool
 * Weighted criteria-based decision making
 */

// Use centralized APP_CONFIG
const CONFIG = {
    ...APP_CONFIG.COMMON,
    ...APP_CONFIG.DECISION_MATRIX,
    BACKUP_KEY: 'decisionMatrix_backup'
};

class DecisionMatrix {
    constructor() {
        // State
        this.options = [];
        this.criteria = [];
        this.scores = {}; // { optionId: { criteriaId: score } }

        // Initialize utilities
        this.logger = Logger.getLogger('DecisionMatrix');
        this.themeManager = new ThemeManager();
        this.toasts = new ToastManager();
        this.storage = new StorageManager(CONFIG.STORAGE_KEY);

        // Initialize import/export manager
        this.importExportManager = new ImportExportManager({
            appName: 'decision-matrix',
            toastManager: this.toasts,
            validateItem: this.validateImportItem.bind(this),
            customCsvRowParser: this.parseDecisionMatrixCSV.bind(this)
        });

        // Initialize sample data manager
        this.sampleDataManager = new SampleDataManager();

        // Initialize history manager
        this.history = new HistoryManager();

        // Initialize
        this.initDOMElements();
        this.setupEventListeners();
        this.themeManager.loadTheme();
        this.loadState();
        this.render();

        // Render storage indicator (tool-specific)
        this.storage.renderToolIndicator('#storage-indicator-container');

        this.logger.info('Decision Matrix initialized');
    }

    /**
     * Initialize DOM element references
     */
    initDOMElements() {
        // Main input elements
        this.mainInput = document.getElementById('main-input');
        this.inputType = document.getElementById('input-type');
        this.mainForm = document.getElementById('main-form');
        this.weightSelector = document.getElementById('weight-selector-inline');

        // Weight elements
        this.criteriaWeight = document.getElementById('criteria-weight');
        this.weightButtons = document.querySelectorAll('.weight-btn');

        // List elements
        this.criteriaList = document.getElementById('criteria-list');
        this.criteriaCount = document.getElementById('criteria-count');
        this.optionsList = document.getElementById('options-list');
        this.optionCount = document.getElementById('option-count');

        // Matrix elements
        this.matrixSection = document.getElementById('matrix-section');
        this.matrixContainer = document.getElementById('matrix-container');

        // Results elements
        this.resultsSection = document.getElementById('results-section');
        this.winnerCard = document.getElementById('winner-card');
        this.winnerName = document.getElementById('winner-name');
        this.winnerScore = document.getElementById('winner-score');
        this.rankingsBody = document.getElementById('rankings-body');

        // Control elements
        this.loadSampleBtn = document.getElementById('load-sample-btn');
        this.clearAllBtn = document.getElementById('clear-all');
        this.resetScoresBtn = document.getElementById('reset-scores-btn');
        this.exportSelect = document.getElementById('export-select');
        this.importBtn = document.getElementById('import-btn');
        this.importFile = document.getElementById('import-file');
        this.themeToggle = document.getElementById('theme-toggle');

        // Help modal
        this.helpToggle = document.getElementById('help-toggle');
        this.helpModal = document.getElementById('help-modal');
        this.helpModalManager = new ModalManager(this.helpModal);

        // Save to history button
        this.saveHistoryBtn = document.getElementById('save-history-btn');

        // Character counter
        this.mainCharCounter = new CharacterCounter(
            this.mainInput,
            document.getElementById('main-char-count'),
            { maxLength: CONFIG.MAX_INPUT_LENGTH }
        );
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Main form submission
        this.mainForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // Input type change
        this.inputType.addEventListener('change', () => {
            this.updateWeightVisibility();
            this.updatePlaceholder();
        });

        // Weight buttons
        this.weightButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const weight = parseInt(e.target.dataset.weight);
                this.setWeight(weight);
            });
        });

        // Control buttons
        this.loadSampleBtn.addEventListener('click', () => this.handleLoadSample());
        this.clearAllBtn.addEventListener('click', () => this.clearAll());
        this.resetScoresBtn.addEventListener('click', () => this.resetScores());
        this.exportSelect.addEventListener('change', () => this.handleExport());
        this.importBtn.addEventListener('click', () => this.importFile.click());
        this.importFile.addEventListener('change', (e) => this.handleImport(e.target.files[0]));
        this.saveHistoryBtn.addEventListener('click', () => this.handleSaveToHistory());

        // Theme toggle
        this.themeToggle.addEventListener('click', () => this.themeManager.toggleTheme());

        // Help toggle
        this.helpToggle.addEventListener('click', () => {
            this.helpModalManager.toggle(this.helpToggle);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Initialize visibility
        this.updateWeightVisibility();
    }

    /**
     * Handle form submission based on input type
     */
    handleSubmit() {
        const type = this.inputType.value;
        if (type === 'criterion') {
            this.handleAddCriteria();
        } else {
            this.handleAddOption();
        }
    }

    /**
     * Update weight selector visibility based on input type
     */
    updateWeightVisibility() {
        const isCriterion = this.inputType.value === 'criterion';
        this.weightSelector.style.display = isCriterion ? 'flex' : 'none';
    }

    /**
     * Update placeholder based on input type
     */
    updatePlaceholder() {
        const isCriterion = this.inputType.value === 'criterion';
        this.mainInput.placeholder = isCriterion
            ? "Add a criterion... (e.g., 'Cost', 'Quality', 'Speed')"
            : "Add an option... (e.g., 'Option A', 'Product X')";
    }

    /**
     * Set weight and update button states
     */
    setWeight(weight) {
        this.criteriaWeight.value = weight;
        this.weightButtons.forEach(btn => {
            if (parseInt(btn.dataset.weight) === weight) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboard(e) {
        // Help modal toggle
        if (e.key === '?') {
            e.preventDefault();
            this.helpModalManager.toggle();
            return;
        }

        // Escape closes modals
        if (e.key === 'Escape') {
            this.helpModalManager.close();
            return;
        }

        // Command/Ctrl shortcuts
        if (e.metaKey || e.ctrlKey) {
            switch (e.key.toLowerCase()) {
                case 'i':
                    e.preventDefault();
                    this.mainInput.focus();
                    break;
                case 'c':
                    e.preventDefault();
                    this.inputType.value = 'criterion';
                    this.updateWeightVisibility();
                    this.updatePlaceholder();
                    this.mainInput.focus();
                    break;
                case 'o':
                    e.preventDefault();
                    this.inputType.value = 'option';
                    this.updateWeightVisibility();
                    this.updatePlaceholder();
                    this.mainInput.focus();
                    break;
                case 'r':
                    e.preventDefault();
                    this.resultsSection.scrollIntoView({ behavior: 'smooth' });
                    break;
                case 'e':
                    e.preventDefault();
                    this.handleExportJSON();
                    break;
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
                case '8':
                case '9':
                    e.preventDefault();
                    this.setWeight(parseInt(e.key));
                    break;
                case '0':
                    e.preventDefault();
                    this.setWeight(10);
                    break;
            }
        }
    }

    /**
     * Add new criterion
     */
    handleAddCriteria() {
        const text = this.mainInput.value.trim();
        if (!text) {
            this.toasts.show('Please enter a criterion', { type: 'warning' });
            return;
        }

        if (this.criteria.length >= CONFIG.MAX_CRITERIA) {
            this.toasts.show(`Maximum ${CONFIG.MAX_CRITERIA} criteria allowed`, { type: 'error' });
            return;
        }

        // Check for duplicates (case-insensitive)
        if (this.criteria.some(c => c.name.toLowerCase() === text.toLowerCase())) {
            this.toasts.show('This criterion already exists', { type: 'error' });
            return;
        }

        const criterion = {
            id: this.generateId('crit'),
            name: text,
            weight: parseInt(this.criteriaWeight.value),
            createdAt: new Date().toISOString()
        };

        this.criteria.push(criterion);
        this.mainInput.value = '';
        this.setWeight(5); // Reset to default weight

        this.saveState();
        this.render();
        this.toasts.show('Criterion added', { type: 'success' });

        // Focus input for next entry
        this.mainInput.focus();
    }

    /**
     * Delete criterion
     */
    deleteCriteria(id) {
        const criterion = this.criteria.find(c => c.id === id);
        if (!criterion) return;

        const confirmDelete = confirm(`Delete criterion "${criterion.name}"?\n\nThis will remove all scores for this criterion.`);
        if (!confirmDelete) return;

        // Remove criterion
        this.criteria = this.criteria.filter(c => c.id !== id);

        // Remove all scores for this criterion
        Object.keys(this.scores).forEach(optionId => {
            if (this.scores[optionId][id]) {
                delete this.scores[optionId][id];
            }
        });

        this.calculateScores();
        this.saveState();
        this.render();
        this.toasts.show('Criterion deleted', { type: 'info' });
    }

    /**
     * Add new option
     */
    handleAddOption() {
        const text = this.mainInput.value.trim();
        if (!text) {
            this.toasts.show('Please enter an option', { type: 'warning' });
            return;
        }

        if (this.options.length >= CONFIG.MAX_OPTIONS) {
            this.toasts.show(`Maximum ${CONFIG.MAX_OPTIONS} options allowed`, { type: 'error' });
            return;
        }

        // Check for duplicates (case-insensitive)
        if (this.options.some(o => o.name.toLowerCase() === text.toLowerCase())) {
            this.toasts.show('This option already exists', { type: 'error' });
            return;
        }

        const option = {
            id: this.generateId('opt'),
            name: text,
            totalScore: 0,
            weightedScore: 0,
            createdAt: new Date().toISOString()
        };

        this.options.push(option);
        this.scores[option.id] = {}; // Initialize scores object

        this.mainInput.value = '';

        this.saveState();
        this.render();
        this.toasts.show('Option added', { type: 'success' });

        // Focus input for next entry
        this.mainInput.focus();
    }

    /**
     * Delete option
     */
    deleteOption(id) {
        const option = this.options.find(o => o.id === id);
        if (!option) return;

        const confirmDelete = confirm(`Delete option "${option.name}"?\n\nThis will remove all scores for this option.`);
        if (!confirmDelete) return;

        // Remove option
        this.options = this.options.filter(o => o.id !== id);

        // Remove all scores for this option
        delete this.scores[id];

        this.calculateScores();
        this.saveState();
        this.render();
        this.toasts.show('Option deleted', { type: 'info' });
    }

    /**
     * Set score for option-criterion pair
     */
    setScore(optionId, criteriaId, score) {
        if (!this.scores[optionId]) {
            this.scores[optionId] = {};
        }

        this.scores[optionId][criteriaId] = parseInt(score);
        this.calculateScores();
        this.saveState();
        this.render();
    }

    /**
     * Calculate weighted scores for all options
     */
    calculateScores() {
        this.options.forEach(option => {
            let weightedSum = 0;
            let totalRaw = 0;

            this.criteria.forEach(criterion => {
                const score = this.scores[option.id]?.[criterion.id] || 0;
                weightedSum += score * criterion.weight;
                totalRaw += score;
            });

            option.weightedScore = weightedSum;
            option.totalScore = totalRaw;
        });
    }

    /**
     * Generate unique ID
     */
    generateId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    }

    /**
     * Render all UI components
     */
    render() {
        this.renderCriteria();
        this.renderOptions();
        this.renderMatrix();
        this.renderResults();
    }

    /**
     * Render criteria list
     */
    renderCriteria() {
        this.criteriaCount.textContent = `(${this.criteria.length})`;

        if (this.criteria.length === 0) {
            this.criteriaList.innerHTML = '<li class="empty-message">No criteria added yet. Start by adding evaluation criteria above.</li>';
            return;
        }

        this.criteriaList.innerHTML = this.criteria.map(criterion => `
            <li class="item item-inline" data-id="${criterion.id}">
                <span class="item-text">${DOMHelpers.escapeHtml(criterion.name)}</span>
                <div class="item-actions">
                    <span class="item-weight"
                          data-id="${criterion.id}"
                          data-weight="${criterion.weight}"
                          role="button"
                          tabindex="0"
                          aria-label="Importance: ${criterion.weight}/10 - Click or press Enter to change"
                          title="Click to change weight (cycles 1-10)">
                        ${criterion.weight}
                    </span>
                    <button class="btn-icon delete-btn" data-id="${criterion.id}" aria-label="Delete ${DOMHelpers.escapeHtml(criterion.name)}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </li>
        `).join('');

        // Attach event listeners
        this.criteriaList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => this.deleteCriteria(btn.dataset.id));
        });

        // Weight badge click listeners
        this.criteriaList.querySelectorAll('.item-weight').forEach(badge => {
            badge.addEventListener('click', () => this.cycleWeight(badge.dataset.id));
            badge.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.cycleWeight(badge.dataset.id);
                }
            });
        });
    }

    /**
     * Cycle weight between 1-10 when badge is clicked
     */
    cycleWeight(id) {
        const criterion = this.criteria.find(c => c.id === id);
        if (!criterion) return;

        // Cycle from 1 to 10, then back to 1
        criterion.weight = criterion.weight === 10 ? 1 : criterion.weight + 1;

        this.calculateScores();
        this.saveState();
        this.render();
    }

    /**
     * Render options list
     */
    renderOptions() {
        this.optionCount.textContent = `(${this.options.length})`;

        if (this.options.length === 0) {
            this.optionsList.innerHTML = '<li class="empty-message">No options added yet. Add options to evaluate above.</li>';
            return;
        }

        this.optionsList.innerHTML = this.options.map((option, index) => `
            <li class="item item-inline" data-id="${option.id}">
                <span class="item-number">${index + 1}.</span>
                <span class="item-text">${DOMHelpers.escapeHtml(option.name)}</span>
                <div class="item-actions">
                    <button class="btn-icon delete-btn" data-id="${option.id}" aria-label="Delete ${DOMHelpers.escapeHtml(option.name)}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </li>
        `).join('');

        // Attach event listeners
        this.optionsList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => this.deleteOption(btn.dataset.id));
        });
    }

    /**
     * Render scoring matrix
     */
    renderMatrix() {
        if (this.options.length === 0 || this.criteria.length === 0) {
            this.matrixSection.style.display = 'none';
            return;
        }

        this.matrixSection.style.display = 'block';

        let html = '<div class="table-responsive"><table class="score-matrix"><thead><tr><th>Option</th>';

        // Header: Criteria names with weights
        this.criteria.forEach(c => {
            html += `<th>${DOMHelpers.escapeHtml(c.name)}<br><span class="weight-badge">Weight: ${c.weight}</span></th>`;
        });
        html += '<th class="total-column">Weighted Total</th></tr></thead><tbody>';

        // Rows: Options
        this.options.forEach(option => {
            html += `<tr><td class="option-name">${DOMHelpers.escapeHtml(option.name)}</td>`;

            // Score cells
            this.criteria.forEach(criterion => {
                const score = this.scores[option.id]?.[criterion.id] || 0;
                html += `<td class="score-cell">
                    <select
                        class="score-selector"
                        data-option="${option.id}"
                        data-criterion="${criterion.id}"
                        aria-label="Score for ${DOMHelpers.escapeHtml(option.name)} - ${DOMHelpers.escapeHtml(criterion.name)}"
                    >
                        <option value="0" ${score === 0 ? 'selected' : ''}>-</option>
                        ${Array.from({ length: 10 }, (_, i) => i + 1).map(n =>
                            `<option value="${n}" ${score === n ? 'selected' : ''}>${n}</option>`
                        ).join('')}
                    </select>
                </td>`;
            });

            // Total weighted score
            const scoreClass = option.weightedScore > 0 ? 'has-score' : '';
            html += `<td class="total-score ${scoreClass}"><strong>${option.weightedScore.toFixed(1)}</strong></td>`;
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        this.matrixContainer.innerHTML = html;

        // Attach listeners to score selectors
        this.matrixContainer.querySelectorAll('.score-selector').forEach(select => {
            select.addEventListener('change', (e) => {
                this.setScore(
                    e.target.dataset.option,
                    e.target.dataset.criterion,
                    e.target.value
                );
            });
        });
    }

    /**
     * Render results
     */
    renderResults() {
        if (this.options.length === 0) {
            this.winnerName.textContent = '-';
            this.winnerScore.textContent = 'Add options to see results';
            this.rankingsBody.innerHTML = '<tr><td colspan="4" class="empty-message">No options to display</td></tr>';
            return;
        }

        const rankings = this.getRankings();
        const winner = rankings[0];
        const maxScore = winner.weightedScore;

        // Update winner card
        this.winnerName.textContent = winner.name;
        if (maxScore > 0) {
            this.winnerScore.textContent = `Weighted Score: ${winner.weightedScore.toFixed(1)}`;
        } else {
            this.winnerScore.textContent = 'Score each option to see results';
        }

        // Update rankings table
        this.rankingsBody.innerHTML = rankings.map((option, index) => {
            const percentage = maxScore > 0 ? (option.weightedScore / maxScore) * 100 : 0;
            const medal = this.getMedal(index);
            const rowClass = index === 0 && maxScore > 0 ? 'top-choice' : '';

            return `
                <tr class="${rowClass}">
                    <td>${index + 1}${medal}</td>
                    <td>${DOMHelpers.escapeHtml(option.name)}</td>
                    <td>${option.weightedScore.toFixed(1)}</td>
                    <td>
                        <div class="score-bar">
                            <div class="score-fill" style="width: ${percentage}%"></div>
                            <span class="score-percentage">${percentage.toFixed(0)}%</span>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Get rankings sorted by weighted score
     */
    getRankings() {
        return [...this.options].sort((a, b) => b.weightedScore - a.weightedScore);
    }

    /**
     * Get medal emoji for rank
     */
    getMedal(rank) {
        const medals = ['🥇', '🥈', '🥉'];
        return medals[rank] ? ` ${medals[rank]}` : '';
    }

    /**
     * Save state to localStorage
     */
    saveState() {
        this.storage.save({
            options: this.options,
            criteria: this.criteria,
            scores: this.scores,
            version: 1,
            lastModified: new Date().toISOString()
        });
        this.logger.info('State saved');
        this.storage.updateToolIndicator();
        StorageManager.checkStorageAndWarn(this.toasts);
    }

    /**
     * Load state from localStorage
     */
    loadState() {
        // Check for restore data from history
        const restoreKey = 'restore_decision-matrix';
        const restoreData = localStorage.getItem(restoreKey);
        if (restoreData) {
            try {
                const restored = JSON.parse(restoreData);
                localStorage.removeItem(restoreKey);
                if (restored.data) {
                    this.options = restored.data.options || [];
                    this.criteria = restored.data.criteria || [];
                    this.scores = restored.data.scores || {};
                    this.calculateScores();
                    // Defer toast until after render
                    setTimeout(() => this.toasts.show('Session restored from history', { type: 'success' }), 100);
                    this.logger.info('State restored from history');
                    return;
                }
            } catch (e) {
                this.logger.error('Failed to restore from history:', e);
                localStorage.removeItem(restoreKey);
            }
        }

        const state = this.storage.load();
        if (!state) {
            this.logger.info('No saved state found');
            return;
        }

        this.options = state.options || [];
        this.criteria = state.criteria || [];
        this.scores = state.scores || {};

        // Recalculate scores in case weights changed
        this.calculateScores();
        this.logger.info('State loaded', { options: this.options.length, criteria: this.criteria.length });
    }

    /**
     * Clear all data
     */
    async clearAll() {
        const confirmed = await ModalManager.confirm(
            'Clear all data?\n\nThis will delete all criteria, options, and scores. This action cannot be undone.',
            {
                title: 'Clear All Data',
                confirmText: 'Clear All',
                cancelText: 'Cancel'
            }
        );

        if (!confirmed) return;

        // Create backup before clearing
        this.importExportManager.createBackup(CONFIG.BACKUP_KEY, {
            options: this.options,
            criteria: this.criteria,
            scores: this.scores
        }, 3);

        this.options = [];
        this.criteria = [];
        this.scores = {};

        this.storage.clear();
        this.render();
        this.toasts.show('All data cleared', { type: 'info' });
        this.logger.info('All data cleared');
    }

    /**
     * Reset only scores (keep options and criteria)
     */
    async resetScores() {
        const confirmed = await ModalManager.confirm(
            'Reset all scores?\n\nThis will clear all scores but keep your options and criteria. You can re-score them from scratch.',
            {
                title: 'Reset Scores',
                confirmText: 'Reset Scores',
                cancelText: 'Cancel'
            }
        );

        if (!confirmed) return;

        // Reset all scores
        this.scores = {};
        this.options.forEach(option => {
            this.scores[option.id] = {};
            option.weightedScore = 0;
            option.totalScore = 0;
        });

        this.saveState();
        this.render();
        this.toasts.show('Scores reset', { type: 'info' });
        this.logger.info('Scores reset');
    }

    /**
     * Handle export selection
     */
    handleExport() {
        const format = this.exportSelect.value;
        if (!format) return;

        if (format === 'json') {
            this.handleExportJSON();
        } else if (format === 'csv') {
            this.handleExportCSV();
        }

        // Reset select
        this.exportSelect.value = '';
    }

    /**
     * Export data as JSON
     */
    handleExportJSON() {
        if (this.options.length === 0 && this.criteria.length === 0) {
            this.toasts.show('No data to export', { type: 'warning' });
            return;
        }

        const exportData = [{
            options: this.options,
            criteria: this.criteria,
            scores: this.scores
        }];

        const metadata = {
            version: 1,
            totalOptions: this.options.length,
            totalCriteria: this.criteria.length,
            exportDate: new Date().toISOString()
        };

        this.importExportManager.exportToJSON(exportData, metadata);
        this.logger.info('Exported to JSON');
    }

    /**
     * Export data as CSV
     */
    handleExportCSV() {
        if (this.options.length === 0) {
            this.toasts.show('No options to export', { type: 'warning' });
            return;
        }

        // CSV format: Option, Criterion1, Criterion2, ..., Weighted Total
        const headers = ['Option', ...this.criteria.map(c => `${c.name} (Weight: ${c.weight})`), 'Weighted Total'];

        const rows = this.options.map(option => {
            const scores = this.criteria.map(c => this.scores[option.id]?.[c.id] || 0);
            return [
                this.importExportManager.escapeCsvValue(option.name),
                ...scores,
                option.weightedScore.toFixed(1)
            ];
        });

        this.importExportManager.exportToCSV(
            rows.map((row, i) => ({ row, index: i })),
            headers,
            (item) => item.row
        );

        this.logger.info('Exported to CSV');
    }

    /**
     * Handle file import
     */
    async handleImport(file) {
        if (!file) return;

        const result = await this.importExportManager.importFromFile(file);
        if (!result) {
            // Reset file input
            this.importFile.value = '';
            return;
        }

        const { items, merge } = result;

        // Create backup before import
        this.importExportManager.createBackup(CONFIG.BACKUP_KEY, {
            options: this.options,
            criteria: this.criteria,
            scores: this.scores
        }, 3);

        if (merge) {
            // Merge: add new items, skip duplicates
            const importedData = items[0];

            // Merge criteria
            if (importedData.criteria) {
                importedData.criteria.forEach(newCriterion => {
                    if (!this.criteria.some(c => c.name.toLowerCase() === newCriterion.name.toLowerCase())) {
                        this.criteria.push(newCriterion);
                    }
                });
            }

            // Merge options
            if (importedData.options) {
                importedData.options.forEach(newOption => {
                    if (!this.options.some(o => o.name.toLowerCase() === newOption.name.toLowerCase())) {
                        this.options.push(newOption);
                    }
                });
            }

            // Merge scores
            if (importedData.scores) {
                Object.keys(importedData.scores).forEach(optionId => {
                    if (!this.scores[optionId]) {
                        this.scores[optionId] = {};
                    }
                    Object.assign(this.scores[optionId], importedData.scores[optionId]);
                });
            }
        } else {
            // Replace: clear and load
            const importedData = items[0];
            this.options = importedData.options || [];
            this.criteria = importedData.criteria || [];
            this.scores = importedData.scores || {};
        }

        this.calculateScores();
        this.saveState();
        this.render();
        this.toasts.show('Data imported successfully', { type: 'success' });
        this.logger.info('Data imported', { merge });

        // Reset file input
        this.importFile.value = '';
    }

    /**
     * Parse Decision Matrix CSV format
     * CSV Format: Option, Criterion1 (Weight: X), Criterion2 (Weight: Y), ..., Weighted Total
     * @param {String} csvText - CSV content
     * @returns {Object} - Data structure with options, criteria, and scores
     */
    parseDecisionMatrixCSV(csvText) {
        const lines = csvText.trim().split('\n');

        if (lines.length < 2) {
            throw new Error('CSV file is empty or has no data rows');
        }

        // Parse header row to extract criteria and weights
        const headerRow = lines[0];
        const headers = this.importExportManager.parseCSVRow(headerRow);

        const criteria = [];
        const criteriaIndexMap = {}; // Map column index to criteria ID

        // Process headers (skip first column which is "Option" and last which is "Weighted Total")
        for (let i = 1; i < headers.length; i++) {
            const header = headers[i].trim();

            // Skip "Weighted Total" column
            if (header.toLowerCase().includes('weighted total') ||
                header.toLowerCase().includes('total')) {
                continue;
            }

            // Extract criterion name and weight
            // Format: "Criterion Name (Weight: X)"
            const weightMatch = header.match(/\(weight:\s*(\d+)\)/i);
            const weight = weightMatch ? parseInt(weightMatch[1]) : 5;

            // Remove weight part to get clean name
            const name = header.replace(/\s*\(weight:\s*\d+\)\s*/i, '').trim();

            if (name) {
                const criterionId = this.generateId('crit');
                criteria.push({
                    id: criterionId,
                    name: name,
                    weight: weight,
                    createdAt: new Date().toISOString()
                });
                criteriaIndexMap[i] = criterionId;
            }
        }

        // Parse data rows to extract options and scores
        const options = [];
        const scores = {};

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue; // Skip empty lines

            const values = this.importExportManager.parseCSVRow(lines[i]);

            if (values.length === 0 || !values[0]) continue;

            const optionName = values[0].trim();
            const optionId = this.generateId('opt');

            const option = {
                id: optionId,
                name: optionName,
                totalScore: 0,
                weightedScore: 0,
                createdAt: new Date().toISOString()
            };

            options.push(option);
            scores[optionId] = {};

            // Extract scores for each criterion
            // Map through the original column indices to get scores in the right order
            Object.keys(criteriaIndexMap).forEach(colIndex => {
                const columnIndex = parseInt(colIndex);
                const criterionId = criteriaIndexMap[columnIndex];

                if (values[columnIndex]) {
                    const scoreValue = parseInt(values[columnIndex]);
                    if (!isNaN(scoreValue) && scoreValue >= 0 && scoreValue <= 10) {
                        scores[optionId][criterionId] = scoreValue;
                    }
                }
            });
        }

        // Return single item wrapped in array (since importFromFile expects data array)
        const result = {
            version: 1,
            data: [{
                options: options,
                criteria: criteria,
                scores: scores
            }],
            itemCount: 1,
            importDate: new Date().toISOString()
        };

        this.logger.info('CSV parsed successfully', {
            optionsCount: options.length,
            criteriaCount: criteria.length,
            scoresKeys: Object.keys(scores).length
        });

        return result;
    }

    /**
     * Handle loading sample data
     */
    async handleLoadSample() {
        // Show modal to choose sample type
        const sampleType = await this.showSampleTypeModal();
        if (!sampleType) return; // User cancelled

        // Get sample data
        const sampleData = this.sampleDataManager.getSampleData('decision-matrix', sampleType);
        if (!sampleData) {
            this.toasts.show('Sample data not available', { type: 'error' });
            return;
        }

        // Create backup if user has existing data
        if (this.options.length > 0 || this.criteria.length > 0) {
            this.importExportManager.createBackup(CONFIG.BACKUP_KEY, {
                options: this.options,
                criteria: this.criteria,
                scores: this.scores
            }, 3);
        }

        // Load sample data using import manager
        const result = await this.importExportManager.importFromData(sampleData, this.options.length > 0 || this.criteria.length > 0);

        if (!result) {
            return; // Error already shown or user cancelled
        }

        // Extract the data from the first item
        const importedData = result.items[0];

        // Apply import
        if (result.merge) {
            // Merge: Add new items, skip duplicates
            if (importedData.criteria) {
                importedData.criteria.forEach(newCriterion => {
                    if (!this.criteria.some(c => c.name.toLowerCase() === newCriterion.name.toLowerCase())) {
                        this.criteria.push(newCriterion);
                    }
                });
            }

            if (importedData.options) {
                importedData.options.forEach(newOption => {
                    if (!this.options.some(o => o.name.toLowerCase() === newOption.name.toLowerCase())) {
                        this.options.push(newOption);
                    }
                });
            }

            if (importedData.scores) {
                Object.keys(importedData.scores).forEach(optionId => {
                    if (!this.scores[optionId]) {
                        this.scores[optionId] = {};
                    }
                    Object.assign(this.scores[optionId], importedData.scores[optionId]);
                });
            }
        } else {
            // Replace: Clear and load
            this.options = importedData.options || [];
            this.criteria = importedData.criteria || [];
            this.scores = importedData.scores || {};
        }

        this.calculateScores();
        this.saveState();
        this.render();

        const typeName = sampleType === 'technical' ? 'Technical' : 'Everyday';
        this.toasts.show(`${typeName} sample data loaded!`, { type: 'success' });
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
                    <p>Select a sample dataset to see how the Decision Matrix works:</p>
                    <div class="sample-options">
                        <button class="sample-option-btn" data-type="technical">
                            <strong>Technical/Professional</strong>
                            <small>Cloud Provider Selection</small>
                        </button>
                        <button class="sample-option-btn" data-type="everyday">
                            <strong>Personal/Everyday</strong>
                            <small>Choosing a New Car</small>
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
        if (this.options.length === 0 && this.criteria.length === 0) {
            this.toasts.show('No data to save', { type: 'info' });
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
        const winner = this.getWinner();
        const summary = winner && winner.totalScore > 0
            ? `${this.options.length} options, ${this.criteria.length} criteria - Winner: ${winner.name}`
            : `${this.options.length} options, ${this.criteria.length} criteria`;

        // Save to history
        const session = this.history.saveSession({
            tool: 'decision-matrix',
            title: title.trim(),
            summary: summary,
            data: {
                options: this.options,
                criteria: this.criteria,
                scores: this.scores,
                version: 1
            }
        });

        this.toasts.show('Session saved to history', { type: 'success' });
        this.logger.info('Session saved to history:', session.id);
    }

    /**
     * Get the winning option
     */
    getWinner() {
        if (this.options.length === 0) return null;
        return this.options.reduce((best, current) =>
            (current.totalScore || 0) > (best.totalScore || 0) ? current : best
        );
    }

    /**
     * Validate imported item
     */
    validateImportItem(item) {
        // For decision matrix, we expect the full data structure
        if (!item || typeof item !== 'object') {
            this.logger.warn('Invalid item: not an object', item);
            return false;
        }

        // At least one of options or criteria should exist
        const hasOptions = Array.isArray(item.options) && item.options.length > 0;
        const hasCriteria = Array.isArray(item.criteria) && item.criteria.length > 0;

        const isValid = hasOptions || hasCriteria;

        if (!isValid) {
            this.logger.warn('Invalid item: no valid options or criteria', {
                hasOptions,
                hasCriteria,
                optionsLength: item.options?.length,
                criteriaLength: item.criteria?.length
            });
        } else {
            this.logger.info('Valid item found', {
                optionsCount: item.options?.length || 0,
                criteriaCount: item.criteria?.length || 0
            });
        }

        return isValid;
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    new DecisionMatrix();
});
