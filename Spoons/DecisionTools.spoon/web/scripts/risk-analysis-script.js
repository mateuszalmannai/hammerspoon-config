// Risk Analysis Tool

// Use centralized APP_CONFIG
const CONFIG = {
    ...APP_CONFIG.COMMON,
    ...APP_CONFIG.RISK_ANALYSIS
};

const QUADRANTS = {
    CRITICAL: 'critical',
    MONITOR: 'monitor',
    MITIGATE: 'mitigate',
    ACCEPT: 'accept'
};

class RiskAnalyzer {
    constructor() {
        this.risks = [];
        this.currentProbability = CONFIG.DEFAULT_PROBABILITY;
        this.currentImpact = CONFIG.DEFAULT_IMPACT;
        
        // Initialize DOM elements
        this.initializeElements();
        
        // Initialize utilities
        this.logger = Logger.getLogger('RiskAnalyzer');
        this.themeManager = new ThemeManager(CONFIG.THEME_KEY);
        this.storage = new StorageManager(CONFIG.STORAGE_KEY);
        this.toasts = new ToastManager({ duration: 3000 });
        this.errorHandler = new ErrorHandler({
            logger: this.logger,
            toastManager: this.toasts,
            appName: 'Risk Analysis'
        });
        
        // Initialize modal manager for help
        this.helpModalManager = new ModalManager(this.helpModalElement);
        
        // Initialize character counter
        this.characterCounter = new CharacterCounter(
            this.riskInput,
            this.charCountElement,
            { maxLength: CONFIG.MAX_RISK_LENGTH }
        );
        
        // Initialize ImportExportManager
        this.importExportManager = new ImportExportManager({
            appName: 'risk-analysis',
            logger: this.logger,
            toasts: this.toasts,
            validateItem: (item) => this.validateRisk(item),
            columnMappings: {
                text: ['text', 'risk', 'description', 'name'],
                probability: ['probability', 'likelihood', 'chance'],
                impact: ['impact', 'severity', 'consequence'],
                riskScore: ['riskscore', 'score', 'risk_score'],
                quadrant: ['quadrant', 'category', 'priority']
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

        // Render storage indicator (tool-specific)
        this.storage.renderToolIndicator('#storage-indicator-container');

        this.logger.info('RiskAnalyzer initialized');
    }
    
    initializeElements() {
        // Form elements
        this.riskInput = document.getElementById('main-input');
        this.riskForm = document.getElementById('risk-form');
        this.charCountElement = document.getElementById('char-count');
        
        // Rating selector buttons
        this.probabilityButtons = document.querySelectorAll('[data-probability]');
        this.impactButtons = document.querySelectorAll('[data-impact]');

        // Data management buttons
        this.loadSampleBtn = document.getElementById('load-sample-btn');
        this.clearAllBtn = document.getElementById('clear-all');
        this.importBtn = document.getElementById('import-btn');
        this.exportSelect = document.getElementById('export-select');
        this.importFile = document.getElementById('import-file');
        
        // Quadrant lists
        this.quadrantLists = {
            [QUADRANTS.CRITICAL]: document.getElementById('critical-list'),
            [QUADRANTS.MONITOR]: document.getElementById('monitor-list'),
            [QUADRANTS.MITIGATE]: document.getElementById('mitigate-list'),
            [QUADRANTS.ACCEPT]: document.getElementById('accept-list')
        };
        
        // All quadrant containers (for drag-and-drop)
        this.quadrantContainers = document.querySelectorAll('.quadrant');
        
        // Help modal
        this.helpModalElement = document.getElementById('help-modal');
        this.helpToggle = document.getElementById('help-toggle');
        
        // Theme toggle
        this.themeToggle = document.getElementById('theme-toggle');

        // Save to history button
        this.saveHistoryBtn = document.getElementById('save-history-btn');
    }

    setupEventListeners() {
        // Form submission
        this.riskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });
        
        // Probability buttons
        this.probabilityButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setActiveProbability(parseInt(btn.dataset.probability));
            });
        });
        
        // Impact buttons
        this.impactButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setActiveImpact(parseInt(btn.dataset.impact));
            });
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

        // Keyboard navigation for risk items (arrow keys to adjust P/I)
        this.setupKeyboardNavigation();

        // Click outside risk items for event delegation
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="delete"]')) {
                const riskId = e.target.closest('[data-action="delete"]').dataset.riskId;
                this.deleteRisk(riskId);
            }
        });
    }
    
    handleSubmit() {
        const text = this.riskInput.value.trim();
        if (!text) return;
        
        this.addRisk(text, this.currentProbability, this.currentImpact);
        this.riskInput.value = '';
        this.characterCounter.reset();
        this.riskInput.focus();
    }
    
    setActiveProbability(probability) {
        this.currentProbability = probability;
        this.probabilityButtons.forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.probability) === probability);
            btn.setAttribute('aria-pressed', parseInt(btn.dataset.probability) === probability);
        });
    }
    
    setActiveImpact(impact) {
        this.currentImpact = impact;
        this.impactButtons.forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.impact) === impact);
            btn.setAttribute('aria-pressed', parseInt(btn.dataset.impact) === impact);
        });
    }
    
    // Risk CRUD Operations
    
    addRisk(text, probability = this.currentProbability, impact = this.currentImpact) {
        const quadrant = this.calculateQuadrant(probability, impact);
        
        const risk = {
            id: this.generateId('risk'),
            text: text.trim(),
            probability: probability,
            impact: impact,
            quadrant: quadrant,
            riskScore: this.calculateRiskScore(probability, impact),
            createdAt: new Date().toISOString(),
            movedAt: new Date().toISOString()
        };
        
        this.risks.push(risk);
        this.saveState();
        this.render();
        
        const quadrantLabel = this.getQuadrantLabel(quadrant);
        const colors = this.getQuadrantColors(quadrant);
        this.toasts.show(`Risk added to ${quadrantLabel}`, {
            type: 'success',
            backgroundColor: colors.bg,
            textColor: colors.text
        });
        
        this.logger.info('Risk added', { riskId: risk.id, quadrant });
        return risk;
    }
    
    calculateQuadrant(probability, impact) {
        const highProbability = probability >= 4;
        const highImpact = impact >= 4;
        
        if (highProbability && highImpact) return QUADRANTS.CRITICAL;
        if (!highProbability && highImpact) return QUADRANTS.MONITOR;
        if (highProbability && !highImpact) return QUADRANTS.MITIGATE;
        return QUADRANTS.ACCEPT;
    }
    
    calculateRiskScore(probability, impact) {
        return probability * impact;
    }
    
    deleteRisk(riskId) {
        const index = this.risks.findIndex(r => r.id === riskId);
        if (index !== -1) {
            const risk = this.risks[index];
            this.risks.splice(index, 1);
            this.saveState();
            this.render();
            this.toasts.info('Risk deleted');
            
            this.logger.info('Risk deleted', { riskId, quadrant: risk.quadrant });
        }
    }
    
    updateRiskValues(riskId, newProbability, newImpact) {
        const risk = this.risks.find(r => r.id === riskId);
        if (!risk) return;

        const oldQuadrant = risk.quadrant;

        // Update values if provided
        if (newProbability !== null) risk.probability = newProbability;
        if (newImpact !== null) risk.impact = newImpact;

        // Recalculate score and quadrant
        risk.riskScore = this.calculateRiskScore(risk.probability, risk.impact);
        risk.quadrant = this.calculateQuadrant(risk.probability, risk.impact);
        risk.movedAt = new Date().toISOString();

        this.saveState();

        // Only re-render if quadrant changed (risk needs to move to different list)
        if (risk.quadrant !== oldQuadrant) {
            this.render();
            const colors = this.getQuadrantColors(risk.quadrant);
            this.toasts.show(`Moved to ${this.getQuadrantLabel(risk.quadrant)}`, {
                type: 'success',
                backgroundColor: colors.bg,
                textColor: colors.text
            });
            this.logger.info('Risk quadrant changed', { riskId, from: oldQuadrant, to: risk.quadrant });
        } else {
            // Just update the score display without full re-render
            const riskElement = document.querySelector(`[data-risk-id="${riskId}"]`);
            if (riskElement) {
                const scoreEl = riskElement.querySelector('.risk-badge.score');
                if (scoreEl) scoreEl.textContent = `Score: ${risk.riskScore}/25`;
            }
            this.renderStatistics();
        }
    }

    previewRiskScore(riskId, newProbability, newImpact) {
        const risk = this.risks.find(r => r.id === riskId);
        if (!risk) return;

        // Calculate preview score without modifying the actual risk
        const p = newProbability !== null ? newProbability : risk.probability;
        const i = newImpact !== null ? newImpact : risk.impact;
        const previewScore = this.calculateRiskScore(p, i);

        // Update just the score display
        const riskElement = document.querySelector(`[data-risk-id="${riskId}"]`);
        if (riskElement) {
            const scoreEl = riskElement.querySelector('.risk-badge.score');
            if (scoreEl) scoreEl.textContent = `Score: ${previewScore}/25`;
        }
    }

    async handleClearAll() {
        if (this.risks.length === 0) {
            this.toasts.info('No risks to clear');
            return;
        }

        const confirmed = await ModalManager.confirm(
            'Clear all risks?\n\nThis will delete all risks from the matrix. This action cannot be undone.',
            {
                title: 'Clear All Risks',
                confirmText: 'Clear All',
                cancelText: 'Cancel'
            }
        );

        if (!confirmed) return;

        const count = this.risks.length;
        this.risks = [];
        this.saveState();
        this.render();
        this.toasts.success(`Cleared ${count} risks`);

        this.logger.info('All risks cleared', { count });
    }
    
    // Rendering
    
    render() {
        // Clear all quadrants
        Object.values(QUADRANTS).forEach(quadrant => {
            const list = this.quadrantLists[quadrant];
            if (list) list.innerHTML = '';
        });
        
        // Render risks into quadrants
        this.risks.forEach(risk => {
            const list = this.quadrantLists[risk.quadrant];
            if (!list) return;

            const li = document.createElement('li');
            li.className = 'risk-item';
            li.tabIndex = 0;
            li.dataset.riskId = risk.id;
            li.setAttribute('aria-label', `${risk.text}. Probability ${risk.probability}, Impact ${risk.impact}, Score ${risk.riskScore || 0}.`);

            li.innerHTML = `
                <div class="risk-header">
                    <span class="risk-text">${DOMHelpers.escapeHtml(risk.text)}</span>
                    <span class="risk-badge score" title="Risk Score (P × I)">Score: ${risk.riskScore || 0}/25</span>
                </div>
                <div class="risk-controls">
                    <label class="risk-control">
                        <span>P:</span>
                        <input type="range" class="risk-slider probability-slider"
                               data-risk-id="${risk.id}"
                               min="1" max="5" value="${risk.probability}"
                               aria-label="Probability">
                        <span class="slider-value">${risk.probability}</span>
                    </label>
                    <label class="risk-control">
                        <span>I:</span>
                        <input type="range" class="risk-slider impact-slider"
                               data-risk-id="${risk.id}"
                               min="1" max="5" value="${risk.impact}"
                               aria-label="Impact">
                        <span class="slider-value">${risk.impact}</span>
                    </label>
                    <button class="btn-icon" data-action="delete" data-risk-id="${risk.id}"
                            aria-label="Delete risk">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                             viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                    </button>
                </div>
            `;

            list.appendChild(li);
        });

        // Add slider listeners for probability and impact
        // 'input' event: update display in real-time while dragging
        // 'change' event: commit the change and move risk if needed
        document.querySelectorAll('.probability-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const riskId = e.target.dataset.riskId;
                const newProbability = parseInt(e.target.value);
                e.target.nextElementSibling.textContent = newProbability;
                this.previewRiskScore(riskId, newProbability, null);
            });
            slider.addEventListener('change', (e) => {
                const riskId = e.target.dataset.riskId;
                const newProbability = parseInt(e.target.value);
                this.updateRiskValues(riskId, newProbability, null);
            });
        });

        document.querySelectorAll('.impact-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const riskId = e.target.dataset.riskId;
                const newImpact = parseInt(e.target.value);
                e.target.nextElementSibling.textContent = newImpact;
                this.previewRiskScore(riskId, null, newImpact);
            });
            slider.addEventListener('change', (e) => {
                const riskId = e.target.dataset.riskId;
                const newImpact = parseInt(e.target.value);
                this.updateRiskValues(riskId, null, newImpact);
            });
        });
        
        this.updateCounts();
        this.updateEmptyStates();
        this.renderStatistics();
    }
    
    updateCounts() {
        Object.values(QUADRANTS).forEach(quadrant => {
            const count = this.risks.filter(r => r.quadrant === quadrant).length;
            const countEl = document.getElementById(`${quadrant}-count`);
            if (countEl) {
                countEl.textContent = `(${count})`;
            }
        });
    }
    
    updateEmptyStates() {
        Object.values(QUADRANTS).forEach(quadrant => {
            const list = this.quadrantLists[quadrant];
            const emptyState = document.getElementById(`${quadrant}-empty`);
            
            if (list && emptyState) {
                if (list.children.length === 0) {
                    emptyState.style.display = 'block';
                } else {
                    emptyState.style.display = 'none';
                }
            }
        });
    }
    
    renderStatistics() {
        const statsContainer = document.getElementById('risk-stats');
        if (!statsContainer) return;
        
        const totalRisks = this.risks.length;
        const criticalCount = this.risks.filter(r => r.quadrant === QUADRANTS.CRITICAL).length;
        const highRiskCount = this.risks.filter(r => 
            r.quadrant === QUADRANTS.CRITICAL || r.quadrant === QUADRANTS.MONITOR
        ).length;
        
        const criticalPercentage = totalRisks > 0 ? ((criticalCount / totalRisks) * 100).toFixed(1) : 0;
        const highRiskPercentage = totalRisks > 0 ? ((highRiskCount / totalRisks) * 100).toFixed(1) : 0;
        
        // Calculate average risk score
        const totalRiskScore = this.risks.reduce((sum, r) => sum + (r.riskScore || 0), 0);
        const avgRiskScore = totalRisks > 0 ? (totalRiskScore / totalRisks).toFixed(1) : 0;
        
        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-label">Total Risks</div>
                <div class="stat-value">${totalRisks}</div>
            </div>
            <div class="stat-card critical">
                <div class="stat-label">Critical</div>
                <div class="stat-value">${criticalCount} <span class="stat-percent">(${criticalPercentage}%)</span></div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Avg Score</div>
                <div class="stat-value">${avgRiskScore} <span class="stat-percent">/25</span></div>
            </div>
            <div class="stat-card">
                <div class="stat-label">High Risk</div>
                <div class="stat-value">${highRiskCount} <span class="stat-percent">(${highRiskPercentage}%)</span></div>
            </div>
        `;
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
        const data = {
            version: 1,
            appName: 'risk-analysis',
            exportDate: new Date().toISOString(),
            riskCount: this.risks.length,
            byQuadrant: {
                critical: this.risks.filter(r => r.quadrant === QUADRANTS.CRITICAL).length,
                monitor: this.risks.filter(r => r.quadrant === QUADRANTS.MONITOR).length,
                mitigate: this.risks.filter(r => r.quadrant === QUADRANTS.MITIGATE).length,
                accept: this.risks.filter(r => r.quadrant === QUADRANTS.ACCEPT).length
            },
            data: this.risks
        };
        
        this.importExportManager.exportToJSON(data, 'risk-analysis');
    }
    
    handleExportCSV() {
        const csvData = this.risks.map(risk => ({
            Risk: risk.text,
            Probability: risk.probability,
            Impact: risk.impact,
            Quadrant: this.getQuadrantLabel(risk.quadrant),
            'Created': risk.createdAt,
            'Last Moved': risk.movedAt
        }));
        
        this.importExportManager.exportToCSV(csvData, 'risk-analysis');
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
        
        // Map imported items to risks
        const importedRisks = items.map(item => {
            const probability = parseInt(item.probability) || CONFIG.DEFAULT_PROBABILITY;
            const impact = parseInt(item.impact) || CONFIG.DEFAULT_IMPACT;
            
            // Calculate risk score: use imported value if valid, otherwise calculate
            let riskScore;
            if (item.riskScore !== undefined && item.riskScore !== null && item.riskScore !== '') {
                const parsedScore = parseInt(item.riskScore);
                riskScore = isNaN(parsedScore) ? this.calculateRiskScore(probability, impact) : parsedScore;
            } else {
                riskScore = this.calculateRiskScore(probability, impact);
            }
            
            return {
                id: item.id || this.generateId('risk'),
                text: item.text || item.description || item.name || item.risk,
                probability: probability,
                impact: impact,
                quadrant: item.quadrant ? this.normalizeQuadrant(item.quadrant) : this.calculateQuadrant(probability, impact),
                riskScore: riskScore,
                createdAt: item.createdAt || new Date().toISOString(),
                movedAt: item.movedAt || item.createdAt || new Date().toISOString()
            };
        });
        
        if (merge) {
            this.risks = [...this.risks, ...importedRisks];
            this.toasts.success(`Imported ${importedRisks.length} risks`);
        } else {
            this.risks = importedRisks;
            this.toasts.success(`Replaced with ${importedRisks.length} risks`);
        }
        
        this.saveState();
        this.render();
        this.logger.info('Risks imported', { count: importedRisks.length, merge });
        
        // Reset file input
        event.target.value = '';
    }
    
    normalizeQuadrant(quadrantValue) {
        if (!quadrantValue) return QUADRANTS.CRITICAL;
        
        const normalized = quadrantValue.toString().toLowerCase();
        
        if (normalized.includes('critical') || normalized === QUADRANTS.CRITICAL) {
            return QUADRANTS.CRITICAL;
        }
        if (normalized.includes('monitor') || normalized === QUADRANTS.MONITOR) {
            return QUADRANTS.MONITOR;
        }
        if (normalized.includes('mitigate') || normalized === QUADRANTS.MITIGATE) {
            return QUADRANTS.MITIGATE;
        }
        if (normalized.includes('accept') || normalized === QUADRANTS.ACCEPT) {
            return QUADRANTS.ACCEPT;
        }
        
        // Default to Critical if unknown
        return QUADRANTS.CRITICAL;
    }
    
    validateRisk(item) {
        return item && (item.text || item.name || item.risk || item.description) &&
               typeof (item.text || item.name || item.risk || item.description) === 'string';
    }

    /**
     * Handle loading sample data
     */
    async handleLoadSample() {
        // Show modal to choose sample type
        const sampleType = await this.showSampleTypeModal();
        if (!sampleType) return; // User cancelled

        // Get sample data
        const sampleData = this.sampleDataManager.getSampleData('risk-analysis', sampleType);
        if (!sampleData) {
            this.toasts.show('Sample data not available', { type: 'error' });
            return;
        }

        // Create backup if user has existing data
        if (this.risks.length > 0) {
            this.importExportManager.createBackup(CONFIG.STORAGE_KEY + '_backup', this.risks, 3);
        }

        // Load sample data using import manager
        const result = await this.importExportManager.importFromData(sampleData, this.risks.length > 0);

        if (!result) {
            return; // Error already shown or user cancelled
        }

        // Map imported items to proper risk structure (same as handleImportFile)
        const importedRisks = result.items.map(item => {
            const probability = parseInt(item.probability) || CONFIG.DEFAULT_PROBABILITY;
            const impact = parseInt(item.impact) || CONFIG.DEFAULT_IMPACT;

            // Calculate risk score: use imported value if valid, otherwise calculate
            let riskScore;
            if (item.riskScore !== undefined && item.riskScore !== null && item.riskScore !== '') {
                const parsedScore = parseInt(item.riskScore);
                riskScore = isNaN(parsedScore) ? this.calculateRiskScore(probability, impact) : parsedScore;
            } else {
                riskScore = this.calculateRiskScore(probability, impact);
            }

            return {
                id: item.id || this.generateId('risk'),
                text: item.text || item.description || item.name || item.risk,
                probability: probability,
                impact: impact,
                quadrant: item.quadrant ? this.normalizeQuadrant(item.quadrant) : this.calculateQuadrant(probability, impact),
                riskScore: riskScore,
                createdAt: item.createdAt || new Date().toISOString(),
                movedAt: item.movedAt || item.createdAt || new Date().toISOString()
            };
        });

        // Apply import
        if (result.merge) {
            // Merge: Add imported items, skip duplicates by ID
            const existingIds = new Set(this.risks.map(r => r.id));
            const newRisks = importedRisks.filter(r => !existingIds.has(r.id));
            this.risks = [...this.risks, ...newRisks];

            const duplicates = importedRisks.length - newRisks.length;
            const message = duplicates > 0
                ? `Added ${newRisks.length} sample risks (${duplicates} duplicates skipped)`
                : `Added ${newRisks.length} sample risks`;
            this.toasts.show(message, { type: 'success' });
        } else {
            // Replace: Clear and load imported items
            this.risks = importedRisks;
            this.toasts.show(`Loaded ${importedRisks.length} sample risks`, { type: 'success' });
        }

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
                    <p>Select a sample dataset to see how the Risk Analysis tool works:</p>
                    <div class="sample-options">
                        <button class="sample-option-btn" data-type="technical">
                            <strong>Technical/Professional</strong>
                            <small>Software Project Risks</small>
                        </button>
                        <button class="sample-option-btn" data-type="everyday">
                            <strong>Personal/Everyday</strong>
                            <small>Road Trip Planning</small>
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
        if (this.risks.length === 0) {
            this.toasts.show('No risks to save', { type: 'info' });
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
        const criticalCount = this.risks.filter(r => r.quadrant === QUADRANTS.CRITICAL).length;
        const monitorCount = this.risks.filter(r => r.quadrant === QUADRANTS.MONITOR).length;
        const mitigateCount = this.risks.filter(r => r.quadrant === QUADRANTS.MITIGATE).length;
        const acceptCount = this.risks.filter(r => r.quadrant === QUADRANTS.ACCEPT).length;
        const summary = `${this.risks.length} risks: ${criticalCount} Critical, ${monitorCount} Monitor, ${mitigateCount} Mitigate, ${acceptCount} Accept`;

        // Save to history
        const session = this.history.saveSession({
            tool: 'risk-analysis',
            title: title.trim(),
            summary: summary,
            data: {
                risks: this.risks,
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
            this.riskInput.focus();
            return;
        }
        
        // Quick probability selection (Ctrl+1-5)
        if (e.ctrlKey && e.key >= '1' && e.key <= '5') {
            e.preventDefault();
            this.setActiveProbability(parseInt(e.key));
            return;
        }
        
        // Quick impact selection (Alt+1-5)
        if (e.altKey && e.key >= '1' && e.key <= '5') {
            e.preventDefault();
            this.setActiveImpact(parseInt(e.key));
            return;
        }
    }
    
    isInputFocused() {
        const activeEl = document.activeElement;
        return activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');
    }

    /**
     * Setup keyboard navigation for risk items
     * Arrow keys adjust probability and impact values directly
     * - Arrow Up/Down: Adjust impact (1-5)
     * - Arrow Left/Right: Adjust probability (1-5)
     */
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Only handle arrow keys
            if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                return;
            }

            // Check if a risk item is focused
            const riskItem = e.target.closest('.risk-item');
            if (!riskItem) return;

            // Don't interfere with sliders - they handle their own arrow keys
            if (e.target.classList.contains('risk-slider')) return;

            const riskId = riskItem.dataset.riskId;
            const risk = this.risks.find(r => r.id === riskId);
            if (!risk) return;

            e.preventDefault();

            let newProbability = risk.probability;
            let newImpact = risk.impact;
            let changed = false;

            switch (e.key) {
                case 'ArrowUp':
                    // Increase impact
                    if (risk.impact < 5) {
                        newImpact = risk.impact + 1;
                        changed = true;
                    }
                    break;
                case 'ArrowDown':
                    // Decrease impact
                    if (risk.impact > 1) {
                        newImpact = risk.impact - 1;
                        changed = true;
                    }
                    break;
                case 'ArrowRight':
                    // Increase probability
                    if (risk.probability < 5) {
                        newProbability = risk.probability + 1;
                        changed = true;
                    }
                    break;
                case 'ArrowLeft':
                    // Decrease probability
                    if (risk.probability > 1) {
                        newProbability = risk.probability - 1;
                        changed = true;
                    }
                    break;
            }

            if (changed) {
                const oldQuadrant = risk.quadrant;

                // Update risk values
                risk.probability = newProbability;
                risk.impact = newImpact;
                risk.riskScore = this.calculateRiskScore(newProbability, newImpact);
                risk.quadrant = this.calculateQuadrant(newProbability, newImpact);
                risk.movedAt = new Date().toISOString();

                this.saveState();
                this.render();

                // Show feedback toast
                const quadrantChanged = risk.quadrant !== oldQuadrant;
                const quadrantLabel = this.getQuadrantLabel(risk.quadrant);
                const message = quadrantChanged
                    ? `P:${newProbability} × I:${newImpact} = ${risk.riskScore} → ${quadrantLabel}`
                    : `P:${newProbability} × I:${newImpact} = ${risk.riskScore}`;

                this.toasts.show(message, {
                    type: quadrantChanged ? 'success' : 'info',
                    duration: 2000
                });

                // Re-focus the risk item after render
                requestAnimationFrame(() => {
                    const movedItem = document.querySelector(`[data-risk-id="${riskId}"]`);
                    if (movedItem) {
                        movedItem.focus();
                    }
                });

                this.logger.debug('Risk adjusted via keyboard', {
                    riskId,
                    probability: newProbability,
                    impact: newImpact,
                    quadrantChanged
                });
            }
        });
    }

    // Utility Functions
    
    getQuadrantLabel(quadrant) {
        const labels = {
            [QUADRANTS.CRITICAL]: 'Critical',
            [QUADRANTS.MONITOR]: 'Monitor',
            [QUADRANTS.MITIGATE]: 'Mitigate',
            [QUADRANTS.ACCEPT]: 'Accept'
        };
        return labels[quadrant] || quadrant;
    }
    
    getQuadrantColors(quadrant) {
        const colors = {
            'critical': { bg: '#dc2626', text: 'white' },
            'monitor': { bg: '#2563eb', text: 'white' },
            'mitigate': { bg: '#f59e0b', text: 'white' },
            'accept': { bg: '#10b981', text: 'white' }
        };
        return colors[quadrant] || { bg: '#6b7280', text: 'white' };
    }
    
    generateId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    }

    saveState() {
        this.storage.save({ risks: this.risks });
        this.storage.updateToolIndicator();
        StorageManager.checkStorageAndWarn(this.toasts);
    }

    loadState() {
        // Check for restore data from history
        const restoreKey = 'restore_risk-analysis';
        const restoreData = localStorage.getItem(restoreKey);
        if (restoreData) {
            try {
                const restored = JSON.parse(restoreData);
                localStorage.removeItem(restoreKey);
                if (restored.data && restored.data.risks) {
                    this.risks = restored.data.risks;
                    // Defer toast until after render
                    setTimeout(() => this.toasts.show('Session restored from history', { type: 'success' }), 100);
                    this.logger.info('Risks restored from history', { count: this.risks.length });
                    return;
                }
            } catch (e) {
                this.logger.error('Failed to restore from history:', e);
                localStorage.removeItem(restoreKey);
            }
        }

        const data = this.storage.load();
        this.risks = data?.risks || [];
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    try {
        new RiskAnalyzer();
    } catch (error) {
        console.error('Failed to initialize Risk Analyzer:', error);
        // Show error to user
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <h2>Unable to Load Risk Analysis Tool</h2>
                    <p>An error occurred while initializing the application. Please refresh the page to try again.</p>
                    <pre style="color: red; text-align: left; padding: 1rem; background: #f5f5f5; border-radius: 4px; overflow-x: auto;">${error.message}</pre>
                </div>
            `;
        }
    }
});
