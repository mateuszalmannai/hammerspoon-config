// Paired Comparison Tool

// Use centralized APP_CONFIG
const CONFIG = {
    ...APP_CONFIG.COMMON,
    ...APP_CONFIG.PAIRED_COMPARISON
};

class PairedComparison {
    constructor() {
        // State
        this.options = [];
        this.comparisons = [];
        this.allPairs = [];
        this.currentPairIndex = 0;
        this.isComparing = false;
        
        // Initialize logger
        this.logger = Logger.getLogger('PairedComparison');
        
        // DOM Elements
        this.optionInput = document.getElementById('main-input');
        this.optionForm = document.getElementById('option-form');
        this.optionsList = document.getElementById('options-list');
        this.optionCount = document.getElementById('option-count');
        this.charCounter = document.getElementById('char-count');
        
        this.startSection = document.getElementById('start-section');
        this.startBtn = document.getElementById('start-btn');
        this.pairCount = document.getElementById('pair-count');
        
        this.inputSection = document.getElementById('input-section');
        this.comparisonSection = document.getElementById('comparison-section');
        this.resultsSection = document.getElementById('results-section');
        
        this.optionLeft = document.getElementById('option-left');
        this.optionRight = document.getElementById('option-right');
        this.optionLeftName = document.getElementById('option-left-name');
        this.optionRightName = document.getElementById('option-right-name');
        this.skipBtn = document.getElementById('skip-btn');
        
        this.progressText = document.getElementById('progress-text');
        this.progressFill = document.getElementById('progress-fill');
        
        this.rankingsBody = document.getElementById('rankings-body');
        this.winnerName = document.getElementById('winner-name');
        this.winnerStats = document.getElementById('winner-stats');
        this.rerunComparisonBtn = document.getElementById('rerun-comparison-btn');
        this.restartBtn = document.getElementById('restart-btn');
        
        this.themeToggle = document.getElementById('theme-toggle');
        this.helpToggle = document.getElementById('help-toggle');
        this.helpModal = document.getElementById('help-modal');
        this.helpModalClose = document.getElementById('help-modal-close');
        this.toastContainer = document.getElementById('toast-container');
        
        // Import/Export controls (input section)
        this.loadSampleBtn = document.getElementById('load-sample-btn');
        this.clearAllBtn = document.getElementById('clear-all');
        this.importFile = document.getElementById('import-file');
        this.importBtn = document.getElementById('import-btn');
        this.exportSelect = document.getElementById('export-select');
        
        // Import/Export controls (results section)
        this.importFileResults = document.getElementById('import-file-results');
        this.importBtnResults = document.getElementById('import-btn-results');
        this.exportSelectResults = document.getElementById('export-select-results');
        
        // Initialize utilities
        this.themeManager = new ThemeManager(CONFIG.THEME_KEY);
        this.toasts = new ToastManager({ duration: 3000, fadeDuration: 300 });
        this.storage = new StorageManager(CONFIG.STORAGE_KEY, {
            version: 1,
            onError: (msg) => this.toasts.error(msg)
        });
        this.helpModalManager = new ModalManager(this.helpModal);
        
        // Initialize error handler
        this.errorHandler = new ErrorHandler({
            appName: 'PairedComparison',
            toastManager: this.toasts
        });
        
        // Initialize import/export manager
        this.importExportManager = new ImportExportManager({
            appName: 'paired-comparison',
            toastManager: this.toasts,
            validateItem: (item) => this.validateItem(item),
            getCategoryName: () => 'Option' // Paired comparison doesn't have categories
        });

        // Initialize sample data manager
        this.sampleDataManager = new SampleDataManager();

        // Initialize history manager
        this.history = new HistoryManager();

        // Save to history button
        this.saveHistoryBtn = document.getElementById('save-history-btn');

        // Initialize
        this.themeManager.loadTheme();
        this.setupEventListeners();
        this.loadState();
        this.render();

        // Render storage indicator (tool-specific)
        this.storage.renderToolIndicator('#storage-indicator-container');
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Option form
        this.optionForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddOption();
        });
        
        this.charCounterUtil = new CharacterCounter(
            this.optionInput,
            this.charCounter,
            { maxLength: CONFIG.MAX_OPTION_LENGTH, warningThreshold: 0.8, dangerThreshold: 0.95 }
        );
        
        // Start button
        this.startBtn.addEventListener('click', () => this.startComparisons());
        
        // Comparison cards
        document.getElementById('option-left').addEventListener('click', () => {
            if (this.isComparing && this.currentPairIndex < this.allPairs.length) {
                this.chooseOption('left');
            }
        });
        document.getElementById('option-right').addEventListener('click', () => {
            if (this.isComparing && this.currentPairIndex < this.allPairs.length) {
                this.chooseOption('right');
            }
        });
        this.skipBtn.addEventListener('click', () => this.skipComparison());
        
        // Results buttons
        this.rerunComparisonBtn.addEventListener('click', () => this.rerunComparison());
        this.restartBtn.addEventListener('click', () => this.confirmRestart());
        
        // Theme toggle
        this.themeToggle.addEventListener('click', () => this.themeManager.toggleTheme());
        
        // Help modal
        this.helpToggle.addEventListener('click', () => this.helpModalManager.toggle(this.helpToggle));
        this.helpModalClose.addEventListener('click', () => this.helpModalManager.close());
        
        // Import/Export event listeners (input section)
        this.loadSampleBtn.addEventListener('click', () => {
            this.handleLoadSample();
        });

        this.clearAllBtn.addEventListener('click', () => this.confirmRestart());

        this.importBtn.addEventListener('click', () => {
            this.importFile.click();
        });
        
        this.importFile.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.handleImport(file);
            }
            e.target.value = '';
        });
        
        this.exportSelect.addEventListener('change', (e) => {
            const format = e.target.value;
            if (format === 'json') {
                this.handleExportJSON();
            } else if (format === 'csv') {
                this.handleExportCSV();
            }
            // Reset dropdown to default
            setTimeout(() => {
                e.target.selectedIndex = 0;
            }, 100);
        });

        this.saveHistoryBtn.addEventListener('click', () => this.handleSaveToHistory());

        // Import/Export event listeners (results section)
        this.importBtnResults.addEventListener('click', () => {
            this.importFileResults.click();
        });
        
        this.importFileResults.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.handleImport(file);
            }
            e.target.value = '';
        });
        
        this.exportSelectResults.addEventListener('change', (e) => {
            const format = e.target.value;
            if (format === 'json') {
                this.handleExportJSON();
            } else if (format === 'csv') {
                this.handleExportCSV();
            }
            // Reset dropdown to default
            setTimeout(() => {
                e.target.selectedIndex = 0;
            }, 100);
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }
    
    // Handle keyboard shortcuts
    handleKeyboard(e) {
        // Toggle help modal
        if (e.key === '?') {
            e.preventDefault();
            this.helpModalManager.toggle();
            return;
        }
        
        // Close modals
        if (e.key === 'Escape') {
            this.helpModal.setAttribute('aria-hidden', 'true');
            this.helpModal.classList.remove('visible');
            return;
        }
        
        // Meta/Cmd key shortcuts
        if (e.metaKey || e.altKey) {
            switch(e.key) {
                case 'i':
                    e.preventDefault();
                    this.optionInput.focus();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    if (this.isComparing && this.currentPairIndex < this.allPairs.length) {
                        this.chooseOption('left');
                    }
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (this.isComparing && this.currentPairIndex < this.allPairs.length) {
                        this.chooseOption('right');
                    }
                    break;
                case 's':
                    e.preventDefault();
                    if (this.isComparing && this.currentPairIndex < this.allPairs.length) {
                        this.skipComparison();
                    }
                    break;
                case 'r':
                    e.preventDefault();
                    this.confirmRestart();
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (!this.isComparing && this.options.length >= CONFIG.MIN_OPTIONS) {
                        this.startComparisons();
                    }
                    break;
            }
        }
    }
    
    // Handle add option
    handleAddOption() {
        const text = this.optionInput.value.trim();
        if (!text) return;
        
        // Check maximum options
        if (this.options.length >= CONFIG.MAX_OPTIONS) {
            this.toasts.error(`Maximum ${CONFIG.MAX_OPTIONS} options allowed`);
            return;
        }
        
        // Check for duplicates (case-insensitive)
        if (this.options.some(opt => opt.name.toLowerCase() === text.toLowerCase())) {
            this.toasts.error('Option already exists');
            return;
        }
        
        const option = {
            id: this.generateId('opt'),
            name: text,
            wins: 0,
            losses: 0,
            comparisons: 0,
            createdAt: new Date().toISOString()
        };
        
        this.options.push(option);
        this.optionInput.value = '';
        this.updateCharCounter();
        this.saveState();
        this.render();
        this.toasts.success('Option added');
    }
    
    // Delete option
    deleteOption(id) {
        this.options = this.options.filter(opt => opt.id !== id);
        this.saveState();
        this.render();
        this.toasts.info('Option deleted');
    }
    
    // Generate pairs
    generatePairs() {
        this.allPairs = [];
        
        for (let i = 0; i < this.options.length; i++) {
            for (let j = i + 1; j < this.options.length; j++) {
                this.allPairs.push({
                    optionA: this.options[i].id,
                    optionB: this.options[j].id,
                    completed: false
                });
            }
        }
        
        // Shuffle pairs for randomness
        this.shufflePairs();
    }
    
    // Shuffle pairs using Fisher-Yates algorithm
    shufflePairs() {
        for (let i = this.allPairs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.allPairs[i], this.allPairs[j]] = [this.allPairs[j], this.allPairs[i]];
        }
    }
    
    // Start comparisons
    startComparisons() {
        if (this.options.length < CONFIG.MIN_OPTIONS) {
            this.toasts.error(`Add at least ${CONFIG.MIN_OPTIONS} options to compare`);
            return;
        }
        
        // Reset comparisons and stats
        this.comparisons = [];
        this.options.forEach(opt => {
            opt.wins = 0;
            opt.losses = 0;
            opt.comparisons = 0;
        });
        
        this.generatePairs();
        this.currentPairIndex = 0;
        this.isComparing = true;
        
        this.saveState();
        this.showComparisonSection();
        this.showCurrentPair();
    }
    
    // Show input section
    showInputSection() {
        this.inputSection.style.display = 'block';
        this.comparisonSection.style.display = 'none';
        this.resultsSection.style.display = 'none';
    }
    
    // Show comparison section
    showComparisonSection() {
        this.inputSection.style.display = 'none';
        this.comparisonSection.style.display = 'block';
        this.resultsSection.style.display = 'none';
    }
    
    // Show current pair
    showCurrentPair() {
        if (this.currentPairIndex >= this.allPairs.length) {
            this.completeComparisons();
            return;
        }
        
        const pair = this.allPairs[this.currentPairIndex];
        const optionA = this.options.find(opt => opt.id === pair.optionA);
        const optionB = this.options.find(opt => opt.id === pair.optionB);
        
        // Defensive check for invalid pairs
        if (!optionA || !optionB) {
            this.logger.error('Invalid pair - options not found');
            this.toasts.error('Error loading comparison. Restarting...');
            this.restart();
            return;
        }
        
        this.optionLeftName.textContent = optionA.name;
        this.optionRightName.textContent = optionB.name;
        
        // Update progress
        this.updateProgress();
    }
    
    // Choose option
    chooseOption(side) {
        const pair = this.allPairs[this.currentPairIndex];
        const winnerId = side === 'left' ? pair.optionA : pair.optionB;
        const loserId = side === 'left' ? pair.optionB : pair.optionA;
        
        // Record comparison
        this.comparisons.push({
            id: this.generateId('cmp'),
            optionA: pair.optionA,
            optionB: pair.optionB,
            winner: winnerId,
            timestamp: new Date().toISOString()
        });
        
        // Update stats
        const winner = this.options.find(opt => opt.id === winnerId);
        const loser = this.options.find(opt => opt.id === loserId);
        
        winner.wins++;
        winner.comparisons++;
        loser.losses++;
        loser.comparisons++;
        
        // Mark pair as completed
        pair.completed = true;
        
        // Move to next pair after brief delay to show selection
        this.currentPairIndex++;
        
        this.saveState();
        
        // Show visual feedback before moving to next pair
        setTimeout(() => {
            this.showCurrentPair();
        }, CONFIG.COMPARISON_DELAY);
    }
    
    // Skip comparison
    skipComparison() {
        // Move to next pair without recording
        this.currentPairIndex++;
        this.saveState();
        this.showCurrentPair();
        this.toasts.info('Comparison skipped');
    }
    
    // Update progress
    updateProgress() {
        const completed = this.comparisons.length;
        const total = this.allPairs.length;
        const percent = total > 0 ? (completed / total) * 100 : 0;
        
        this.progressFill.style.width = `${percent}%`;
        this.progressText.textContent = `${completed} of ${total} pairs completed`;
    }
    
    // Complete comparisons
    completeComparisons() {
        this.isComparing = false;
        this.toasts.success('All comparisons complete! 🎉');
        this.showResultsSection();
    }
    
    // Show results section
    showResultsSection() {
        this.inputSection.style.display = 'none';
        this.comparisonSection.style.display = 'none';
        this.resultsSection.style.display = 'block';
        this.renderResults();
    }
    
    // Calculate rankings
    calculateRankings() {
        return this.options.map(opt => {
            const winRate = opt.comparisons > 0 
                ? (opt.wins / opt.comparisons) * 100 
                : 0;
            return {...opt, winRate};
        }).sort((a, b) => {
            if (b.winRate !== a.winRate) return b.winRate - a.winRate;
            return b.wins - a.wins;
        });
    }
    
    // Render results
    renderResults() {
        const rankings = this.calculateRankings();
        
        if (rankings.length === 0) return;
        
        // Show winner
        const winner = rankings[0];
        this.winnerName.textContent = winner.name;
        this.winnerStats.textContent = `${winner.wins} wins, ${winner.winRate.toFixed(1)}% win rate`;
        
        // Show rankings table
        this.rankingsBody.innerHTML = rankings.map((opt, index) => `
            <tr class="${index === 0 ? 'top-choice' : ''}">
                <td class="rank">${index + 1}${this.getMedal(index)}</td>
                <td class="option-name">${DOMHelpers.escapeHtml(opt.name)}</td>
                <td class="wins">${opt.wins}</td>
                <td class="losses">${opt.losses}</td>
                <td class="win-rate">
                    <div class="win-rate-container">
                        <div class="win-rate-bar">
                            <div class="win-rate-fill" style="width: ${opt.winRate}%"></div>
                        </div>
                        <span class="win-rate-text">${opt.winRate.toFixed(1)}%</span>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    // Get medal for rank
    getMedal(rank) {
        const medals = ['🥇', '🥈', '🥉'];
        return medals[rank] || '';
    }
    
    // Confirm restart
    async confirmRestart() {
        if (this.options.length === 0) {
            this.toasts.info('No options to clear');
            return;
        }

        const confirmed = await ModalManager.confirm(
            'Clear all options and comparisons?\n\nThis will delete all options and comparison results. This action cannot be undone.',
            {
                title: 'Clear All Data',
                confirmText: 'Clear All',
                cancelText: 'Cancel'
            }
        );

        if (!confirmed) return;

        const count = this.options.length;
        this.restart();
        this.toasts.success(`Cleared ${count} options`);
    }
    
    // Rerun comparison with existing options
    rerunComparison() {
        if (this.options.length < 2) {
            this.toasts.show('Add at least 2 options to compare', { type: 'info' });
            return;
        }
        
        // Reset comparison data but keep options
        this.options.forEach(opt => {
            opt.wins = 0;
            opt.losses = 0;
            opt.comparisons = 0;
        });
        
        this.comparisons = [];
        this.generatePairs();
        this.currentPairIndex = 0;
        this.isComparing = true;
        
        this.saveState();
        this.showComparisonSection();
        this.showCurrentPair();
        this.toasts.info('Starting new comparison with same options');
    }
    
    // Restart
    restart() {
        this.options = [];
        this.comparisons = [];
        this.allPairs = [];
        this.currentPairIndex = 0;
        this.isComparing = false;
        
        this.saveState();
        this.inputSection.style.display = 'block';
        this.comparisonSection.style.display = 'none';
        this.resultsSection.style.display = 'none';
        this.render();
    }
    
    // Render
    render() {
        this.renderOptions();
        this.updateOptionCount();
        this.updateStartButton();
    }
    
    // Render options
    renderOptions() {
        if (this.options.length === 0) {
            this.optionsList.innerHTML = '<li class="empty-message" style="list-style: none; text-align: center; padding: 2rem; color: var(--text-muted); grid-column: 1 / -1;">No options added yet. Add at least 2 options to begin.</li>';
            return;
        }
        
        this.optionsList.innerHTML = this.options.map(opt => `
            <li class="option-item">
                <span class="option-name">${DOMHelpers.escapeHtml(opt.name)}</span>
                <button class="option-delete" data-id="${opt.id}" aria-label="Delete option">×</button>
            </li>
        `).join('');
        
        // Add delete listeners
        this.optionsList.querySelectorAll('.option-delete').forEach(btn => {
            btn.addEventListener('click', () => this.deleteOption(btn.dataset.id));
        });
    }
    
    // Update option count
    updateOptionCount() {
        this.optionCount.textContent = `(${this.options.length})`;
    }
    
    // Update start button
    updateStartButton() {
        const canStart = this.options.length >= CONFIG.MIN_OPTIONS;
        this.startBtn.disabled = !canStart;
        
        if (this.options.length >= CONFIG.MIN_OPTIONS) {
            this.startSection.style.display = 'block';
            // Calculate combinations: C(n,2) = n(n-1)/2
            const totalPairs = (this.options.length * (this.options.length - 1)) / 2;
            this.pairCount.textContent = totalPairs;
        } else {
            this.startSection.style.display = 'none';
        }
    }
    

    // Generate unique ID
    generateId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Save state
    saveState() {
        this.storage.save({
            options: this.options,
            comparisons: this.comparisons,
            allPairs: this.allPairs,
            currentPairIndex: this.currentPairIndex,
            isComparing: this.isComparing
        });
        this.storage.updateToolIndicator();
        StorageManager.checkStorageAndWarn(this.toasts);
    }

    // Load state
    loadState() {
        // Check for restore data from history
        const restoreKey = 'restore_paired-comparison';
        const restoreData = localStorage.getItem(restoreKey);
        if (restoreData) {
            try {
                const restored = JSON.parse(restoreData);
                localStorage.removeItem(restoreKey);
                if (restored.data) {
                    this.options = restored.data.options || [];
                    this.comparisons = restored.data.comparisons || [];
                    this.allPairs = restored.data.allPairs || [];
                    this.currentPairIndex = restored.data.currentPairIndex || 0;
                    this.isComparing = false; // Don't auto-resume comparison
                    // Defer toast until after render
                    setTimeout(() => this.toasts.show('Session restored from history', { type: 'success' }), 100);
                    this.logger.info('State restored from history');
                    // Show results if completed
                    if (this.comparisons.length > 0 && this.comparisons.length === this.allPairs.length) {
                        this.showResultsSection();
                    }
                    return;
                }
            } catch (e) {
                this.logger.error('Failed to restore from history:', e);
                localStorage.removeItem(restoreKey);
            }
        }

        const state = this.storage.load();
        if (!state) return;

        this.options = state.options || [];
        this.comparisons = state.comparisons || [];
        this.allPairs = state.allPairs || [];
        this.currentPairIndex = state.currentPairIndex || 0;
        this.isComparing = state.isComparing || false;

        // Resume session if comparing
        if (this.isComparing && this.currentPairIndex < this.allPairs.length) {
            this.showComparisonSection();
            this.showCurrentPair();
        } else if (this.comparisons.length > 0 && this.currentPairIndex >= this.allPairs.length) {
            this.showResultsSection();
        }
    }
    
    // Handle JSON export
    handleExportJSON() {
        if (this.options.length === 0) {
            this.toasts.show('No options to export', { type: 'info' });
            return;
        }

        const hasResults = this.comparisons.length > 0;
        const metadata = {
            version: 1,
            totalOptions: this.options.length,
            totalComparisons: this.allPairs.length,
            completedComparisons: this.comparisons.length,
            hasCompletedResults: this.comparisons.length === this.allPairs.length && this.allPairs.length > 0
        };

        // Format options as items for export - include comparison data
        const items = this.options.map((option) => {
            return {
                id: option.id,
                name: option.name,
                wins: option.wins || 0,
                losses: option.losses || 0,
                comparisons: option.comparisons || 0,
                createdAt: option.createdAt || new Date().toISOString()
            };
        });

        this.importExportManager.exportToJSON(items, metadata);
    }

    // Handle CSV export
    handleExportCSV() {
        if (this.options.length === 0) {
            this.toasts.show('No options to export', { type: 'info' });
            return;
        }

        const results = this.calculateRankings();
        const headers = ['Rank', 'Option', 'Wins', 'Losses', 'Win Rate'];
        
        const rowMapper = (item) => [
            item.rank,
            this.importExportManager.escapeCsvValue(item.text),
            item.wins,
            item.losses,
            item.winRate + '%'
        ];

        const items = this.options.map((option, index) => {
            const result = results.find(r => r.name === option.name);
            return {
                rank: index + 1,
                text: option.name,
                wins: result?.wins || 0,
                losses: result?.losses || 0,
                winRate: result ? ((result.wins / (result.wins + result.losses)) * 100).toFixed(1) : 0
            };
        });

        this.importExportManager.exportToCSV(items, headers, rowMapper);
    }

    // Handle import
    async handleImport(file) {
        const result = await this.importExportManager.importFromFile(file);
        
        if (!result) {
            return;
        }

        // Create backup
        this.importExportManager.createBackup('pairedComparison_backup', this.options, 3);

        const { items, merge } = result;

        // Check if imported data has comparison results
        const hasComparisonResults = items.some(i => 
            i.hasOwnProperty('wins') || i.hasOwnProperty('losses') || i.hasOwnProperty('comparisons')
        );

        if (merge) {
            // Merge: Add imported options, skip duplicates by name
            const existingNames = new Set(this.options.map(o => o.name.toLowerCase()));
            const newOptions = items
                .filter(i => !existingNames.has((i.name || i.text).toLowerCase()))
                .map(i => ({
                    id: this.generateId('option'),
                    name: i.name || i.text,
                    wins: i.wins || 0,
                    losses: i.losses || 0,
                    comparisons: i.comparisons || 0,
                    createdAt: i.createdAt || new Date().toISOString()
                }));
            
            this.options = [...this.options, ...newOptions];
            
            const duplicates = items.length - newOptions.length;
            const message = duplicates > 0 
                ? `Imported ${newOptions.length} options (${duplicates} duplicates skipped)`
                : `Imported ${newOptions.length} options`;
            this.toasts.show(message, { type: 'success' });
        } else {
            // Replace: Load imported options with their comparison results
            this.options = items.map(i => ({
                id: i.id || this.generateId('option'),
                name: i.name || i.text,
                wins: i.wins || 0,
                losses: i.losses || 0,
                comparisons: i.comparisons || 0,
                createdAt: i.createdAt || new Date().toISOString()
            }));
            
            // Reset comparison state
            this.comparisons = [];
            this.allPairs = [];
            this.currentPairIndex = 0;
            this.isComparing = false;
            
            const message = hasComparisonResults 
                ? `Imported ${items.length} options with comparison results`
                : `Imported ${items.length} options`;
            this.toasts.show(message, { type: 'success' });
        }

        this.saveState();
        this.render();
        
        // If we imported comparison results, show the results section
        // Otherwise show the input section
        if (hasComparisonResults && !merge) {
            this.showResultsSection();
            // Inform user they can run a new comparison
            setTimeout(() => {
                this.toasts.show('Tip: Click "Run New Comparison" to compare these options again', { 
                    type: 'info',
                    duration: 5000 
                });
            }, 1500);
        } else {
            this.showInputSection();
        }
    }

    // Validate item structure
    validateItem(item) {
        const text = item.name || item.text;
        return item && text && typeof text === 'string' && text.trim().length > 0;
    }

    /**
     * Handle loading sample data
     */
    async handleLoadSample() {
        // Show modal to choose sample type
        const sampleType = await this.showSampleTypeModal();
        if (!sampleType) return; // User cancelled

        // Get sample data
        const sampleData = this.sampleDataManager.getSampleData('paired-comparison', sampleType);
        if (!sampleData) {
            this.toasts.show('Sample data not available', { type: 'error' });
            return;
        }

        // Backup existing data if any
        if (this.options.length > 0) {
            this.importExportManager.createBackup('pairedComparison_backup', this.options, 3);
        }

        // Confirm if user has data
        if (this.options.length > 0) {
            const confirmed = await ModalManager.confirm(
                `Load ${sampleData.totalOptions} sample options?\n\nThis will replace your current ${this.options.length} options.`,
                {
                    title: 'Load Sample Data',
                    confirmText: 'Replace',
                    cancelText: 'Cancel'
                }
            );
            if (!confirmed) return;
        }

        // Load sample data
        this.options = sampleData.data.map(item => ({
            id: item.id || this.generateId('opt'),
            name: item.name,
            wins: item.wins || 0,
            losses: item.losses || 0,
            comparisons: item.comparisons || 0,
            createdAt: item.createdAt || new Date().toISOString()
        }));

        // Reset comparison state
        this.comparisons = [];
        this.allPairs = [];
        this.currentPairIndex = 0;
        this.isComparing = false;

        this.saveState();
        this.showInputSection();
        this.render();

        // Check if sample has completed results
        const hasResults = sampleData.hasCompletedResults && this.options.every(opt => opt.comparisons > 0);

        if (hasResults) {
            // Show results immediately
            this.showResultsSection();
            const typeName = sampleType === 'technical' ? 'Programming Languages' : 'Vacation Destinations';
            this.toasts.show(`${typeName} sample loaded with results! 🎉`, { type: 'success' });

            // Inform user they can run a new comparison
            setTimeout(() => {
                this.toasts.show('Tip: Click "Run New Comparison" to compare these options again', {
                    type: 'info',
                    duration: 5000
                });
            }, 1500);
        } else {
            const typeName = sampleType === 'technical' ? 'Programming Languages' : 'Vacation Destinations';
            this.toasts.show(`${typeName} sample loaded! 🎉`, { type: 'success' });
        }
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
                    <p>Select a sample dataset to see how the Paired Comparison tool works:</p>
                    <div class="sample-options">
                        <button class="sample-option-btn" data-type="technical">
                            <strong>Technical/Professional</strong>
                            <small>Programming Languages comparison</small>
                        </button>
                        <button class="sample-option-btn" data-type="everyday">
                            <strong>Personal/Everyday</strong>
                            <small>Vacation Destinations comparison</small>
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
        if (this.options.length === 0) {
            this.toasts.show('No options to save', { type: 'info' });
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
        const hasResults = this.comparisons.length > 0;
        const winner = hasResults ? this.options.reduce((best, current) =>
            (current.wins || 0) > (best.wins || 0) ? current : best
        ) : null;
        const summary = hasResults && winner
            ? `${this.options.length} options, ${this.comparisons.length} comparisons - Winner: ${winner.name}`
            : `${this.options.length} options`;

        // Save to history
        const session = this.history.saveSession({
            tool: 'paired-comparison',
            title: title.trim(),
            summary: summary,
            data: {
                options: this.options,
                comparisons: this.comparisons,
                allPairs: this.allPairs,
                currentPairIndex: this.currentPairIndex,
                version: 1
            }
        });

        this.toasts.show('Session saved to history', { type: 'success' });
        this.logger.info('Session saved to history:', session.id);
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    new PairedComparison();
});
