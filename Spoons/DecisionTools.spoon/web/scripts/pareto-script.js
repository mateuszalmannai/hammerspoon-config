// Pareto Analysis Tool

// Constants
const ITEM_TYPES = {
    UNGROUPED: 'ungrouped'
};

const SCORING_METHODS = {
    FREQUENCY: 'frequency',
    IMPACT: 'impact',
    CUSTOM: 'custom'
};

// Use centralized APP_CONFIG
const CONFIG = {
    ...APP_CONFIG.COMMON,
    ...APP_CONFIG.PARETO,
    DEFAULT_COLORS: [
        '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
        '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#a855f7'
    ]
};

class ParetoAnalyzer {
    constructor() {
        this.groups = [];
        this.items = [];
        this.scoringMethod = SCORING_METHODS.FREQUENCY;
        this.paretoThreshold = CONFIG.PARETO_THRESHOLD;
        this.analysis = {
            totalScore: 0,
            priorityGroupCount: 0,
            priorityGroupIds: []
        };
        this.pendingFocusTarget = null;
        
        this.initializeElements();
        
        // Initialize utility managers (after elements are initialized)
        this.themeManager = new ThemeManager(CONFIG.THEME_KEY);
        this.toasts = new ToastManager();
        this.storage = new StorageManager(CONFIG.STORAGE_KEY, CONFIG.STORAGE_VERSION);
        this.helpModalManager = new ModalManager(this.helpModal);
        
        // Initialize error handler
        this.errorHandler = new ErrorHandler({
            appName: 'ParetoAnalysis',
            toastManager: this.toasts
        });
        
        // Initialize import/export manager
        this.importExportManager = new ImportExportManager({
            appName: 'pareto-analysis',
            toastManager: this.toasts,
            validateItem: (item) => this.validateItem(item),
            getCategoryName: (type) => type === 'ungrouped' ? 'Ungrouped' : 'Grouped'
        });

        // Initialize sample data manager
        this.sampleDataManager = new SampleDataManager();

        // Initialize history manager
        this.history = new HistoryManager();

        // Initialize character counter utility
        const charCountElement = document.getElementById('char-count');
        this.charCounterUtil = new CharacterCounter(
            this.itemInput,
            charCountElement,
            { maxLength: CONFIG.MAX_ITEM_LENGTH, warningThreshold: 0.75, dangerThreshold: 0.9 }
        );
        
        this.themeManager.loadTheme();
        this.attachEventListeners();
        this.loadState();
        this.render();

        // Render storage indicator (tool-specific)
        this.storage.renderToolIndicator('#storage-indicator-container');
    }

    // Initialize DOM elements
    initializeElements() {
        this.itemForm = document.getElementById('item-form');
        this.itemInput = document.getElementById('main-input');
        this.scoringMethodSelect = document.getElementById('scoring-method');
        this.impactSelector = document.getElementById('impact-selector');
        this.impactInput = document.getElementById('impact-input');
        this.impactButtons = document.querySelectorAll('.impact-btn');
        
        this.groupsContainer = document.getElementById('groups-container');
        this.groupsEmpty = document.getElementById('groups-empty');
        this.groupsCount = document.getElementById('groups-count');
        this.ungroupedSection = document.getElementById('ungrouped-section');
        this.ungroupedList = document.getElementById('ungrouped-list');
        this.ungroupedCount = document.getElementById('ungrouped-count');
        
        this.analysisEmpty = document.getElementById('analysis-empty');
        this.chartContainer = document.getElementById('chart-container');
        this.paretoChart = document.getElementById('pareto-chart');
        this.rankingsContainer = document.getElementById('rankings-container');
        this.prioritySummary = document.getElementById('priority-summary');
        this.insightText = document.getElementById('insight-text');
        this.priorityList = document.getElementById('priority-list');
        this.toggleChartBtn = document.getElementById('toggle-chart');
        
        this.clearAllBtn = document.getElementById('clear-all');
        this.themeToggle = document.getElementById('theme-toggle');
        this.helpToggle = document.getElementById('help-toggle');
        this.helpModal = document.getElementById('help-modal');
        this.helpModalClose = document.getElementById('help-modal-close');
        this.contextMenu = document.getElementById('context-menu');
        this.toastContainer = document.getElementById('toast-container');
        
        // Import/Export controls
        this.loadSampleBtn = document.getElementById('load-sample-btn');
        this.importFile = document.getElementById('import-file');
        this.importBtn = document.getElementById('import-btn');
        this.exportSelect = document.getElementById('export-select');
        this.saveHistoryBtn = document.getElementById('save-history-btn');

        this.currentContextTarget = null;
        this.chartVisible = false;
    }

    // Attach event listeners
    attachEventListeners() {
        // Form submission
        this.itemForm.addEventListener('submit', (e) => this.handleAddItem(e));
        
        // Keyboard shortcuts for impact selection (Ctrl+1-9, Ctrl+0 for 10)
        this.itemInput.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && this.scoringMethod === SCORING_METHODS.IMPACT) {
                let impactValue = null;
                
                if (e.key >= '1' && e.key <= '9') {
                    impactValue = e.key;
                } else if (e.key === '0') {
                    impactValue = '10';
                }
                
                if (impactValue) {
                    e.preventDefault();
                    this.setImpact(impactValue);
                    this.toasts.info(`Impact set to ${impactValue}`);
                }
            }
        });
        
        // Impact selector buttons
        this.impactButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.impactButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.impactInput.value = btn.dataset.impact;
            });
        });
        
        // Scoring method change
        this.scoringMethodSelect.addEventListener('change', (e) => {
            this.scoringMethod = e.target.value;
            // Show/hide impact selector based on scoring method
            if (e.target.value === SCORING_METHODS.IMPACT) {
                this.impactSelector.style.display = 'flex';
                // Announce change to screen readers
                this.impactSelector.setAttribute('aria-live', 'polite');
            } else {
                this.impactSelector.style.display = 'none';
            }
            
            // Show toast to guide users for Custom scoring
            if (e.target.value === SCORING_METHODS.CUSTOM) {
                this.toasts.info('Right-click groups to set custom scores');
            }
            
            this.updateAnalysis();
        });
        
        // Toggle chart
        this.toggleChartBtn.addEventListener('click', () => this.toggleChart());
        
        // Clear all
        this.clearAllBtn.addEventListener('click', () => this.clearAll());
        
        // Theme toggle
        this.themeToggle.addEventListener('click', () => this.themeManager.toggleTheme());
        
        // Help modal
        this.helpToggle.addEventListener('click', () => this.helpModalManager.toggle());
        this.helpModalClose.addEventListener('click', () => this.helpModalManager.close());
        this.helpModal.addEventListener('click', (e) => {
            if (e.target === this.helpModal) {
                this.helpModalManager.close();
            }
        });
        
        // Import/Export event listeners
        this.loadSampleBtn.addEventListener('click', () => {
            this.handleLoadSample();
        });

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
            e.target.value = '';
        });

        this.saveHistoryBtn.addEventListener('click', () => this.handleSaveToHistory());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Context menu
        document.addEventListener('click', (e) => this.handleClickOutside(e));
        document.addEventListener('contextmenu', (e) => this.handleRightClick(e));
        
        this.contextMenu.addEventListener('click', (e) => {
            if (e.target.classList.contains('context-menu-item')) {
                this.handleContextAction(e.target.dataset.action);
            }
        });
    }

    // Handle add item
    handleAddItem(e) {
        e.preventDefault();
        
        const text = this.itemInput.value.trim();
        if (!text) return;
        
        // Check for /group command
        if (text.toLowerCase().startsWith('/group')) {
            const groupName = text.substring(6).trim();
            this.createGroup(groupName);
            this.itemInput.value = '';
            this.charCounterUtil.reset();
            return;
        }
        
        const item = {
            id: this.generateId('item'),
            text: text,
            groupId: null,
            impact: parseInt(this.impactInput.value) || CONFIG.IMPACT_DEFAULT,
            createdAt: new Date().toISOString()
        };
        
        this.items.push(item);
        this.itemInput.value = '';
        this.setImpact(CONFIG.IMPACT_DEFAULT); // Reset to medium (5) for next item
        this.charCounterUtil.reset();
        this.saveState();
        this.render();
        this.toasts.success('Item added');
    }

    // Create new group
    createGroup(providedName = null) {
        const name = providedName || prompt('Enter group name:');
        if (!name || !name.trim()) return;
        
        const group = {
            id: this.generateId('group'),
            name: name.trim(),
            color: this.getNextColor(),
            score: 0,
            scoreMethod: this.scoringMethod,
            itemCount: 0,
            percentage: 0,
            cumulativePercentage: 0,
            rank: 0,
            isPriority: false,
            customScore: 0,
            createdAt: new Date().toISOString()
        };
        
        this.groups.push(group);
        this.saveState();
        this.updateAnalysis();
        this.toasts.success(`Group "${name.trim()}" created`);
    }

    // Generate unique ID
    generateId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Get impact level for visual indicator (ENH-3)
    getImpactLevel(value) {
        if (value >= 1 && value <= 3) return 'low';
        if (value >= 4 && value <= 7) return 'medium';
        if (value >= 8 && value <= 10) return 'high';
        return 'none';
    }
    
    // Create enhanced impact badge HTML (ENH-3)
    createImpactBadgeHTML(itemId, impact) {
        const level = this.getImpactLevel(impact);
        return `
            <button class="item-impact impact-level-${level}" data-item-id="${itemId}" tabindex="0" aria-label="Change impact value">
                <span class="impact-value">${impact}</span>
                <span class="impact-bar"></span>
            </button>
        `;
    }
    
    // Attach impact badge listeners (HP-1 - extracted to reduce duplication)
    attachImpactBadgeListeners(badge, itemId) {
        badge.addEventListener('click', () => this.editItemImpact(itemId));
        
        badge.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                this.editItemImpact(itemId);
            } else if (e.altKey && this.scoringMethod === SCORING_METHODS.IMPACT) {
                let impactValue = null;
                
                if (e.key >= '1' && e.key <= '9') {
                    impactValue = parseInt(e.key);
                } else if (e.key === '0') {
                    impactValue = 10;
                }
                
                if (impactValue) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.setItemImpact(itemId, impactValue);
                }
            }
        });
    }

    // Get next available color
    getNextColor() {
        const usedColors = this.groups.map(g => g.color);
        const availableColors = CONFIG.DEFAULT_COLORS.filter(c => !usedColors.includes(c));
        return availableColors.length > 0 ? availableColors[0] : CONFIG.DEFAULT_COLORS[0];
    }

    // Calculate frequency score
    calculateFrequencyScore(groupId) {
        return this.items.filter(item => item.groupId === groupId).length;
    }

    // Calculate impact score
    calculateImpactScore(groupId) {
        return this.items
            .filter(item => item.groupId === groupId)
            .reduce((sum, item) => sum + (item.impact || CONFIG.IMPACT_DEFAULT), 0);
    }

    // Calculate custom score
    calculateCustomScore(groupId) {
        const group = this.groups.find(g => g.id === groupId);
        return group ? group.customScore || 0 : 0;
    }

    // Update group scores
    updateGroupScores() {
        this.groups.forEach(group => {
            switch(this.scoringMethod) {
                case SCORING_METHODS.FREQUENCY:
                    group.score = this.calculateFrequencyScore(group.id);
                    break;
                case SCORING_METHODS.IMPACT:
                    group.score = this.calculateImpactScore(group.id);
                    break;
                case SCORING_METHODS.CUSTOM:
                    group.score = this.calculateCustomScore(group.id);
                    break;
            }
            
            group.itemCount = this.items.filter(i => i.groupId === group.id).length;
        });
    }

    // Sort groups by score
    sortGroupsByScore() {
        return [...this.groups].sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.createdAt.localeCompare(b.createdAt);
        });
    }

    // Calculate percentages
    calculatePercentages() {
        const totalScore = this.groups.reduce((sum, g) => sum + g.score, 0);
        
        if (totalScore === 0) {
            this.groups.forEach(g => {
                g.percentage = 0;
                g.cumulativePercentage = 0;
            });
            return;
        }
        
        const sortedGroups = this.sortGroupsByScore();
        let cumulativeScore = 0;
        
        sortedGroups.forEach((group, index) => {
            group.percentage = (group.score / totalScore) * 100;
            cumulativeScore += group.score;
            group.cumulativePercentage = (cumulativeScore / totalScore) * 100;
            group.rank = index + 1;
        });
    }

    // Identify priority groups
    identifyPriorityGroups() {
        const sortedGroups = this.sortGroupsByScore();
        const priorityIds = [];
        
        // Mark groups whose cumulative percentage is within the threshold
        // This identifies the "vital few" that contribute to 80% of results
        for (const group of sortedGroups) {
            // Include this group if adding it keeps us at or below threshold
            // OR if it's the first group (ensure at least one priority)
            if (group.cumulativePercentage <= this.paretoThreshold) {
                group.isPriority = true;
                priorityIds.push(group.id);
            } else {
                group.isPriority = false;
            }
        }
        
        // Edge case: if no groups qualify (e.g., first group is already > 80%)
        // Mark the top group as priority
        if (priorityIds.length === 0 && sortedGroups.length > 0) {
            sortedGroups[0].isPriority = true;
            priorityIds.push(sortedGroups[0].id);
        }
        
        this.analysis.priorityGroupIds = priorityIds;
        this.analysis.priorityGroupCount = priorityIds.length;
        this.analysis.totalScore = this.groups.reduce((sum, g) => sum + g.score, 0);
    }

    // Update complete analysis
    updateAnalysis() {
        this.updateGroupScores();
        this.calculatePercentages();
        this.identifyPriorityGroups();
        this.saveState();
        this.render();
    }

    // Move item to group
    moveItemToGroup(itemId, groupId) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;
        
        item.groupId = groupId;
        this.updateAnalysis();
        
        if (groupId) {
            const group = this.groups.find(g => g.id === groupId);
            if (group) {
                this.showToast(`Moved to ${group.name}`, 'info', group.color);
            }
        } else {
            // Use gray color for ungrouped items
            this.showToast('Moved to Ungrouped', 'info', '#9ca3af');
        }
    }

    // Delete item
    deleteItem(itemId) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;
        
        // If item is in a group, remove from group instead of deleting
        if (item.groupId) {
            item.groupId = null;
            this.updateAnalysis();
            this.showToast('Item removed from group', 'info', '#9ca3af');
        } else {
            // Only delete if ungrouped
            this.items = this.items.filter(i => i.id !== itemId);
            this.updateAnalysis();
            this.showToast('Item deleted', 'info', '#9ca3af', '#1f2937');
        }
    }
    
    // Edit item impact
    editItemImpact(itemId) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;
        
        // Cycle through impact values (1-10)
        let currentImpact = item.impact || CONFIG.IMPACT_DEFAULT;
        let newImpact = currentImpact >= CONFIG.IMPACT_MAX ? CONFIG.IMPACT_MIN : currentImpact + 1;
        
        item.impact = newImpact;
        this.updateAnalysis();
        
        // Show toast with group color if item is in a group, gray if ungrouped
        if (item.groupId) {
            const group = this.groups.find(g => g.id === item.groupId);
            if (group) {
                this.showToast(`Impact set to ${newImpact}`, 'success', group.color);
                return;
            }
        }
        // Gray background for ungrouped items
        this.showToast(`Impact set to ${newImpact}`, 'success', '#9ca3af', '#1f2937');
    }
    
    // Set item impact to specific value (for keyboard shortcuts)
    setItemImpact(itemId, impactValue) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;
        
        item.impact = impactValue;
        
        // Store focus target before update
        this.pendingFocusTarget = itemId;
        this.updateAnalysis();
        
        // Show toast with group color if item is in a group, gray if ungrouped
        if (item.groupId) {
            const group = this.groups.find(g => g.id === item.groupId);
            if (group) {
                this.showToast(`Impact set to ${impactValue}`, 'success', group.color);
                return;
            }
        }
        // Gray background for ungrouped items
        this.showToast(`Impact set to ${impactValue}`, 'success', '#9ca3af', '#1f2937');
    }

    // Delete group
    deleteGroup(groupId) {
        const group = this.groups.find(g => g.id === groupId);
        if (!group) return;
        
        const itemsInGroup = this.items.filter(i => i.groupId === groupId);
        if (itemsInGroup.length > 0) {
            const confirm = window.confirm(`This group has ${itemsInGroup.length} items. Move them to ungrouped?`);
            if (confirm) {
                itemsInGroup.forEach(item => item.groupId = null);
            } else {
                return;
            }
        }
        
        this.groups = this.groups.filter(g => g.id !== groupId);
        this.updateAnalysis();
        this.toasts.info(`Group "${group.name}" deleted`);
    }

    // Rename group
    renameGroup(groupId) {
        const group = this.groups.find(g => g.id === groupId);
        if (!group) return;
        
        const newName = prompt('Enter new group name:', group.name);
        if (!newName || !newName.trim()) return;
        
        group.name = newName.trim();
        this.saveState();
        this.render();
        this.toasts.success('Group renamed');
    }
    
    // Start inline rename (ENH-2)
    startInlineRename(element, groupId) {
        const group = this.groups.find(g => g.id === groupId);
        if (!group) return;
        
        const originalName = group.name;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = originalName;
        input.className = 'group-name-input';
        input.maxLength = 50;
        
        // Store the element for later
        const parent = element.parentElement;
        element.style.display = 'none';
        parent.insertBefore(input, element);
        
        input.focus();
        input.select();
        
        const finishEdit = (save) => {
            const newName = input.value.trim();
            
            if (save && newName && newName !== originalName) {
                group.name = newName;
                this.saveState();
                this.render();
                this.toasts.success('Group renamed');
            } else {
                input.remove();
                element.style.display = '';
            }
        };
        
        input.addEventListener('blur', () => finishEdit(true));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finishEdit(true);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                finishEdit(false);
            }
        });
    }

    // Change group color
    changeGroupColor(groupId) {
        const group = this.groups.find(g => g.id === groupId);
        if (!group) return;
        
        const newColor = prompt('Enter color (hex):', group.color);
        if (!newColor || !newColor.trim()) return;
        
        group.color = newColor.trim();
        this.saveState();
        this.render();
        this.toasts.success('Color updated');
    }

    // Set custom score
    setCustomScore(groupId) {
        const group = this.groups.find(g => g.id === groupId);
        if (!group) return;
        
        const scoreStr = prompt('Enter custom score (0-10000):', group.customScore.toString());
        if (scoreStr === null) return;
        
        const score = parseFloat(scoreStr);
        if (isNaN(score) || score < 0 || score > 10000) {
            this.showToast('Score must be between 0 and 10,000', 'error');
            return;
        }
        
        group.customScore = score;
        this.updateAnalysis();
        this.toasts.success('Custom score set');
    }
    
    // Set custom score quickly via keyboard (1-10 scale)
    setCustomScoreQuick(groupId, scoreValue) {
        const group = this.groups.find(g => g.id === groupId);
        if (!group) return;
        
        group.customScore = scoreValue;
        this.updateAnalysis();
        this.showToast(`Score set to ${scoreValue}`, 'success', group.color);
    }

    // Toggle chart visibility
    toggleChart() {
        this.chartVisible = !this.chartVisible;
        if (this.chartVisible) {
            this.chartContainer.style.display = 'block';
            this.toggleChartBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                Hide Chart
            `;
            this.drawParetoChart();
        } else {
            this.chartContainer.style.display = 'none';
            this.toggleChartBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="20" x2="12" y2="10"></line>
                    <line x1="18" y1="20" x2="18" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="16"></line>
                </svg>
                Show Chart
            `;
        }
    }

    // Draw Pareto chart
    drawParetoChart() {
        const canvas = this.paretoChart;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        const sortedGroups = this.sortGroupsByScore().filter(g => g.score > 0);
        if (sortedGroups.length === 0) return;
        
        const padding = { top: 40, right: 60, bottom: 60, left: 60 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;
        
        const maxScore = Math.max(...sortedGroups.map(g => g.score));
        const barWidth = chartWidth / sortedGroups.length;
        
        // Get colors based on theme
        const isDark = document.body.classList.contains('dark-mode');
        const textColor = isDark ? '#e5e7eb' : '#1f2937';
        const gridColor = isDark ? '#374151' : '#e5e7eb';
        const lineColor = '#f59e0b';
        
        // Draw grid and axes
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        
        // Y-axis
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.lineTo(width - padding.right, height - padding.bottom);
        ctx.stroke();
        
        // Draw bars
        sortedGroups.forEach((group, index) => {
            const x = padding.left + (index * barWidth);
            const barHeight = (group.score / maxScore) * chartHeight;
            const y = height - padding.bottom - barHeight;
            
            // Bar
            ctx.fillStyle = group.isPriority ? group.color : (isDark ? '#4b5563' : '#d1d5db');
            ctx.fillRect(x + 5, y, barWidth - 10, barHeight);
            
            // Score label
            ctx.fillStyle = textColor;
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(group.score.toString(), x + barWidth / 2, y - 5);
        });
        
        // Draw cumulative line
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        sortedGroups.forEach((group, index) => {
            const x = padding.left + (index * barWidth) + barWidth / 2;
            const y = height - padding.bottom - (group.cumulativePercentage / 100) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            
            // Cumulative percentage label
            ctx.fillStyle = lineColor;
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${group.cumulativePercentage.toFixed(1)}%`, x, y - 10);
        });
        
        ctx.stroke();
        
        // Draw 80% threshold line
        const thresholdY = height - padding.bottom - (this.paretoThreshold / 100) * chartHeight;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding.left, thresholdY);
        ctx.lineTo(width - padding.right, thresholdY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Threshold label
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`${this.paretoThreshold}%`, width - padding.right + 50, thresholdY + 5);
        
        // Group name labels (rotated)
        ctx.fillStyle = textColor;
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'right';
        sortedGroups.forEach((group, index) => {
            const x = padding.left + (index * barWidth) + barWidth / 2;
            const y = height - padding.bottom + 15;
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(-Math.PI / 4);
            ctx.fillText(group.name.substring(0, 20), 0, 0);
            ctx.restore();
        });
        
        // Y-axis labels
        ctx.fillStyle = textColor;
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const y = height - padding.bottom - (i / 5) * chartHeight;
            const value = Math.round((i / 5) * maxScore);
            ctx.fillText(value.toString(), padding.left - 10, y + 5);
        }
        
        // Chart title
        ctx.fillStyle = textColor;
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Pareto Chart', width / 2, 25);
    }

    // Clear all data
    async clearAll() {
        const confirmed = await ModalManager.confirm(
            'Clear all groups and items?\n\nThis will delete all data. This action cannot be undone.',
            {
                title: 'Clear All Data',
                confirmText: 'Clear All',
                cancelText: 'Cancel'
            }
        );

        if (!confirmed) return;

        this.groups = [];
        this.items = [];
        this.saveState();
        this.render();
        this.toasts.info('All data cleared');
    }

    // Handle keyboard shortcuts
    handleKeyboard(e) {
        // Handle global shortcuts first (even in input fields)
        if (e.ctrlKey || e.metaKey) {
            switch(e.key.toLowerCase()) {
                case 'i':
                    e.preventDefault();
                    this.itemInput.focus();
                    return;
                case 'u':
                    e.preventDefault();
                    this.scrollToSection('ungrouped-section');
                    return;
                case 'g':
                    e.preventDefault();
                    this.scrollToSection('groups-section');
                    return;
                case 'r':
                    e.preventDefault();
                    this.scrollToSection('analysis-section');
                    return;
                case 'a':
                    e.preventDefault();
                    this.toggleChart();
                    return;
            }
        }
        
        // Ignore other keys if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            if (e.key === 'Escape') {
                e.target.blur();
            }
            return;
        }
        
        if (e.key === '?') {
            this.helpModalManager.toggle();
        } else if (e.key === 'Escape') {
            this.closeContextMenu();
            if (this.helpModalManager.isOpen()) {
                this.helpModalManager.close();
            }
        }
    }
    
    // Scroll to section
    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    // Set impact value
    setImpact(impact) {
        this.impactInput.value = impact;
        
        // Update active state on buttons
        this.impactButtons.forEach(btn => {
            if (btn.dataset.impact === impact.toString()) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // Handle right click
    handleRightClick(e) {
        const groupCard = e.target.closest('.group-card');
        if (groupCard) {
            e.preventDefault();
            this.currentContextTarget = groupCard;
            this.showContextMenu(e.clientX, e.clientY);
        }
    }

    // Show context menu
    showContextMenu(x, y) {
        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.style.top = `${y}px`;
        this.contextMenu.setAttribute('aria-hidden', 'false');
        this.contextMenu.classList.add('visible');
    }

    // Close context menu
    closeContextMenu() {
        this.contextMenu.setAttribute('aria-hidden', 'true');
        this.contextMenu.classList.remove('visible');
        this.currentContextTarget = null;
    }

    // Handle context menu action
    handleContextAction(action) {
        if (!this.currentContextTarget) return;
        
        const groupId = this.currentContextTarget.dataset.groupId;
        
        switch(action) {
            case 'rename':
                this.renameGroup(groupId);
                break;
            case 'color':
                this.changeGroupColor(groupId);
                break;
            case 'score':
                this.setCustomScore(groupId);
                break;
            case 'delete':
                this.deleteGroup(groupId);
                break;
        }
        
        this.closeContextMenu();
    }

    // Handle click outside
    handleClickOutside(e) {
        if (!this.contextMenu.contains(e.target)) {
            this.closeContextMenu();
        }
    }

    // Render all
    render() {
        this.renderGroups();
        this.renderUngrouped();
        this.renderAnalysis();
        this.updateCounts();
        
        // Restore focus if pending (HP-2 - improved focus restoration)
        if (this.pendingFocusTarget) {
            requestAnimationFrame(() => {
                const badge = document.querySelector(`.item-impact[data-item-id="${this.pendingFocusTarget}"]`);
                if (badge) badge.focus();
                this.pendingFocusTarget = null;
            });
        }
    }

    // Render groups
    renderGroups() {
        if (this.groups.length === 0) {
            this.groupsEmpty.style.display = 'flex';
            this.groupsContainer.innerHTML = '';
            this.groupsContainer.appendChild(this.groupsEmpty);
            return;
        }
        
        this.groupsEmpty.style.display = 'none';
        this.groupsContainer.innerHTML = '';
        
        const sortedGroups = this.sortGroupsByScore();
        
        sortedGroups.forEach(group => {
            const groupCard = this.createGroupCard(group);
            this.groupsContainer.appendChild(groupCard);
        });
    }

    // Create group card
    createGroupCard(group) {
        const card = document.createElement('div');
        card.className = `group-card ${group.isPriority ? 'priority' : ''}`;
        card.dataset.groupId = group.id;
        
        // Make card focusable in Custom scoring mode for keyboard shortcuts
        if (this.scoringMethod === SCORING_METHODS.CUSTOM) {
            card.tabIndex = 0;
            card.setAttribute('aria-label', `${group.name} - Score: ${group.customScore}. Press Cmd+1-9,0 to set score`);
        }
        
        const items = this.items.filter(i => i.groupId === group.id);
        
        card.innerHTML = `
            <div class="group-header">
                <span class="group-color" style="background: ${group.color}"></span>
                <h3 class="group-name-editable" data-group-id="${group.id}" tabindex="0" aria-label="Group name, double-click to edit">${group.name}</h3>
                <span class="group-score">${group.score}</span>
                <button class="group-delete-btn" data-group-id="${group.id}" aria-label="Delete group">×</button>
            </div>
            <div class="group-stats">
                <div class="stat">
                    <span class="label">Rank:</span>
                    <span class="value">#${group.rank}</span>
                </div>
                <div class="stat">
                    <span class="label">Share:</span>
                    <span class="value">${group.percentage.toFixed(1)}%</span>
                </div>
                <div class="stat">
                    <span class="label">Cumulative:</span>
                    <span class="value">${group.cumulativePercentage.toFixed(1)}%</span>
                </div>
            </div>
            <ul class="group-items">
                ${items.map(item => `
                    <li class="group-item" data-item-id="${item.id}">
                        <span>${item.text}</span>
                        <div class="item-actions">
                            ${this.scoringMethod === SCORING_METHODS.IMPACT ? this.createImpactBadgeHTML(item.id, item.impact) : ''}
                            <select class="group-transfer" data-item-id="${item.id}" aria-label="Move to group">
                                <option value="">Move to...</option>
                                ${this.groups.filter(g => g.id !== group.id).map((g, index) => `<option value="${g.id}">${index + 1}. ${g.name}</option>`).join('')}
                                <option value="null">Ungrouped</option>
                            </select>
                            <button class="item-delete" data-item-id="${item.id}" aria-label="Remove from group">×</button>
                        </div>
                    </li>
                `).join('')}
            </ul>
            ${group.isPriority ? '<span class="priority-badge">★ Priority</span>' : ''}
        `;
        
        // Add delete listeners
        card.querySelectorAll('.item-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteItem(btn.dataset.itemId);
            });
        });
        
        // Add impact edit listeners
        card.querySelectorAll('.item-impact').forEach(btn => {
            this.attachImpactBadgeListeners(btn, btn.dataset.itemId);
        });
        
        // Add group transfer listeners
        card.querySelectorAll('.group-transfer').forEach(select => {
            select.addEventListener('change', (e) => {
                if (e.target.value) {
                    const targetGroupId = e.target.value === 'null' ? null : e.target.value;
                    this.moveItemToGroup(select.dataset.itemId, targetGroupId);
                }
            });
        });
        
        // Add group delete listener
        const groupDeleteBtn = card.querySelector('.group-delete-btn');
        if (groupDeleteBtn) {
            groupDeleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteGroup(groupDeleteBtn.dataset.groupId);
            });
        }
        
        // Add inline rename listener (ENH-2)
        const groupNameEl = card.querySelector('.group-name-editable');
        if (groupNameEl) {
            groupNameEl.addEventListener('dblclick', () => {
                this.startInlineRename(groupNameEl, group.id);
            });
            
            groupNameEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.startInlineRename(groupNameEl, group.id);
                }
            });
        }
        
        // Add keyboard shortcut for custom scoring (Cmd+1-9,0)
        if (this.scoringMethod === SCORING_METHODS.CUSTOM) {
            card.addEventListener('keydown', (e) => {
                if (e.altKey) {
                    let scoreValue = null;
                    
                    if (e.key >= '1' && e.key <= '9') {
                        scoreValue = parseInt(e.key);
                    } else if (e.key === '0') {
                        scoreValue = 10;
                    }
                    
                    if (scoreValue) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.setCustomScoreQuick(group.id, scoreValue);
                    }
                }
            });
        }
        
        return card;
    }

    // Render ungrouped items
    renderUngrouped() {
        const ungrouped = this.items.filter(i => !i.groupId);
        
        this.ungroupedList.innerHTML = '';
        
        if (ungrouped.length === 0) {
            this.ungroupedSection.style.display = 'none';
            return;
        }
        
        this.ungroupedSection.style.display = 'block';
        
        ungrouped.forEach(item => {
            const li = document.createElement('li');
            li.className = 'ungrouped-item';
            li.innerHTML = `
                <span>${item.text}</span>
                <div class="item-actions">
                    ${this.scoringMethod === SCORING_METHODS.IMPACT ? this.createImpactBadgeHTML(item.id, item.impact) : ''}
                    <select class="group-selector" data-item-id="${item.id}">
                        <option value="">Move to group...</option>
                        ${this.groups.map((g, index) => `<option value="${g.id}">${index + 1}. ${g.name}</option>`).join('')}
                    </select>
                    <button class="item-delete" data-item-id="${item.id}" aria-label="Delete item">×</button>
                </div>
            `;
            
            const impactBtn = li.querySelector('.item-impact');
            if (impactBtn) {
                this.attachImpactBadgeListeners(impactBtn, item.id);
            }
            
            const selector = li.querySelector('.group-selector');
            selector.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.moveItemToGroup(item.id, e.target.value);
                }
            });
            
            const deleteBtn = li.querySelector('.item-delete');
            deleteBtn.addEventListener('click', () => this.deleteItem(item.id));
            
            this.ungroupedList.appendChild(li);
        });
    }

    // Render analysis
    renderAnalysis() {
        if (this.groups.length === 0 || this.analysis.totalScore === 0) {
            this.analysisEmpty.style.display = 'flex';
            this.rankingsContainer.innerHTML = '';
            this.prioritySummary.style.display = 'none';
            return;
        }
        
        this.analysisEmpty.style.display = 'none';
        
        // Render rankings table
        this.renderRankings();
        
        // Render priority summary
        this.renderPrioritySummary();
        
        // Update chart if visible
        if (this.chartVisible) {
            this.drawParetoChart();
        }
    }

    // Render rankings table
    renderRankings() {
        const sortedGroups = this.sortGroupsByScore();
        
        this.rankingsContainer.innerHTML = `
            <table class="rankings-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Group</th>
                        <th>Score</th>
                        <th>Share %</th>
                        <th>Cumulative %</th>
                        <th>Priority</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedGroups.map(group => `
                        <tr class="${group.isPriority ? 'priority-row' : ''}">
                            <td>${group.rank}</td>
                            <td>
                                <span class="table-color" style="background: ${group.color}"></span>
                                ${group.name}
                            </td>
                            <td>${group.score}</td>
                            <td>${group.percentage.toFixed(1)}%</td>
                            <td>${group.cumulativePercentage.toFixed(1)}%</td>
                            <td>${group.isPriority ? '★ YES' : 'no'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    // Render priority summary
    renderPrioritySummary() {
        const priorityGroups = this.groups.filter(g => g.isPriority).sort((a, b) => a.rank - b.rank);
        
        if (priorityGroups.length === 0) {
            this.prioritySummary.style.display = 'none';
            return;
        }
        
        this.prioritySummary.style.display = 'block';
        
        const totalGroups = this.groups.length;
        const priorityPercentage = (priorityGroups.length / totalGroups) * 100;
        const maxCumulative = Math.max(...priorityGroups.map(g => g.cumulativePercentage));
        
        this.insightText.textContent = `Focus on ${priorityGroups.length} group${priorityGroups.length > 1 ? 's' : ''} (${priorityPercentage.toFixed(0)}% of groups) to address ${maxCumulative.toFixed(1)}% of all issues.`;
        
        this.priorityList.innerHTML = priorityGroups.map(group => `
            <li>
                <span class="priority-color" style="background: ${group.color}"></span>
                ${group.name} (${group.itemCount} item${group.itemCount !== 1 ? 's' : ''}, ${group.percentage.toFixed(1)}%)
            </li>
        `).join('');
    }

    // Update counts
    updateCounts() {
        this.groupsCount.textContent = `(${this.groups.length})`;
        this.ungroupedCount.textContent = `(${this.items.filter(i => !i.groupId).length})`;
    }

    // Save state to localStorage
    saveState() {
        this.storage.save({
            scoringMethod: this.scoringMethod,
            paretoThreshold: this.paretoThreshold,
            groups: this.groups,
            items: this.items,
            analysis: this.analysis
        });
        this.storage.updateToolIndicator();
        StorageManager.checkStorageAndWarn(this.toasts);
    }

    // Load state from localStorage
    loadState() {
        // Check for restore data from history
        const restoreKey = 'restore_pareto';
        const restoreData = localStorage.getItem(restoreKey);
        if (restoreData) {
            try {
                const restored = JSON.parse(restoreData);
                localStorage.removeItem(restoreKey);
                if (restored.data) {
                    this.scoringMethod = restored.data.scoringMethod || SCORING_METHODS.FREQUENCY;
                    this.groups = restored.data.groups || [];
                    this.items = restored.data.items || [];
                    this.analysis = restored.data.analysis || { totalScore: 0, priorityGroupCount: 0, priorityGroupIds: [] };
                    // Update UI
                    this.scoringMethodSelect.value = this.scoringMethod;
                    this.updateAnalysis();
                    // Defer toast until after render
                    setTimeout(() => this.toasts.show('Session restored from history', { type: 'success' }), 100);
                    return;
                }
            } catch (e) {
                console.error('Failed to restore from history:', e);
                localStorage.removeItem(restoreKey);
            }
        }

        const state = this.storage.load();
        if (!state) return;

        this.scoringMethod = state.scoringMethod || SCORING_METHODS.FREQUENCY;
        this.paretoThreshold = state.paretoThreshold || CONFIG.PARETO_THRESHOLD;
        this.groups = state.groups || [];
        this.items = state.items || [];
        this.analysis = state.analysis || { totalScore: 0, priorityGroupCount: 0, priorityGroupIds: [] };

        // Update UI
        this.scoringMethodSelect.value = this.scoringMethod;

        // Recalculate analysis
        this.updateAnalysis();
    }
    
    // Handle JSON export
    handleExportJSON() {
        if (this.items.length === 0 && this.groups.length === 0) {
            this.toasts.show('No data to export', { type: 'info' });
            return;
        }

        const metadata = {
            version: 1,
            scoringMethod: this.scoringMethod,
            paretoThreshold: this.paretoThreshold,
            summary: {
                totalGroups: this.groups.length,
                totalItems: this.items.length,
                ungroupedItems: this.items.filter(i => i.type === ITEM_TYPES.UNGROUPED).length,
                priorityGroups: this.analysis.priorityGroupCount
            }
        };

        // Combine groups and items for export
        const exportData = [
            ...this.groups.map(g => ({
                id: g.id,
                text: g.name,
                type: 'group',
                score: g.score || 0,
                percentage: g.percentage || 0,
                isPriority: this.analysis.priorityGroupIds.includes(g.id),
                color: g.color,
                createdAt: g.createdAt || new Date().toISOString()
            })),
            ...this.items.map(i => ({
                id: i.id,
                text: i.text,
                type: i.type,
                groupId: i.groupId || null,
                impact: i.impact || CONFIG.IMPACT_DEFAULT,
                createdAt: i.createdAt || new Date().toISOString()
            }))
        ];

        this.importExportManager.exportToJSON(exportData, metadata);
    }

    // Handle CSV export
    handleExportCSV() {
        if (this.items.length === 0 && this.groups.length === 0) {
            this.toasts.show('No data to export', { type: 'info' });
            return;
        }

        const headers = ['Type', 'Name/Text', 'Score/Impact', 'Percentage', 'Priority', 'Group'];
        
        const exportData = [
            ...this.groups.map(g => ({
                type: 'Group',
                text: g.name,
                score: g.score || 0,
                percentage: (g.percentage || 0).toFixed(1) + '%',
                priority: this.analysis.priorityGroupIds.includes(g.id) ? 'Yes' : 'No',
                group: '-'
            })),
            ...this.items.map(i => {
                const group = this.groups.find(g => g.id === i.groupId);
                return {
                    type: 'Item',
                    text: i.text,
                    score: i.impact || CONFIG.IMPACT_DEFAULT,
                    percentage: '-',
                    priority: '-',
                    group: group ? group.name : 'Ungrouped'
                };
            })
        ];

        const rowMapper = (item) => [
            item.type,
            this.importExportManager.escapeCsvValue(item.text),
            item.score,
            item.percentage,
            item.priority,
            this.importExportManager.escapeCsvValue(item.group)
        ];

        this.importExportManager.exportToCSV(exportData, headers, rowMapper);
    }

    // Handle import
    async handleImport(file) {
        const result = await this.importExportManager.importFromFile(file);
        
        if (!result) {
            return;
        }

        // Create backup
        this.importExportManager.createBackup('pareto_backup', [...this.groups, ...this.items], 3);

        const { items, merge } = result;

        if (merge) {
            // Merge: Add imported items
            const importedGroups = items.filter(i => i.type === 'group');
            const importedItems = items.filter(i => i.type !== 'group');
            
            // Add groups (skip duplicates by name)
            const existingGroupNames = new Set(this.groups.map(g => g.name.toLowerCase()));
            const newGroups = importedGroups
                .filter(g => !existingGroupNames.has(g.text.toLowerCase()))
                .map(g => ({
                    id: this.generateId(),
                    name: g.text,
                    score: 0,
                    percentage: 0,
                    color: this.getNextColor(),
                    createdAt: g.createdAt || new Date().toISOString()
                }));
            
            this.groups = [...this.groups, ...newGroups];
            
            // Create a map from old group IDs to current group IDs for JSON imports
            const oldGroupIdToCurrentId = {};
            importedGroups.forEach(importedGroup => {
                const matchingGroup = this.groups.find(g => g.name.toLowerCase() === importedGroup.text.toLowerCase());
                if (matchingGroup) {
                    oldGroupIdToCurrentId[importedGroup.id] = matchingGroup.id;
                }
            });
            
            // Create a map of group names to IDs for CSV imports
            const groupNameToId = {};
            this.groups.forEach(g => {
                groupNameToId[g.name.toLowerCase()] = g.id;
            });
            
            // Add items
            const existingItemIds = new Set(this.items.map(i => i.id));
            const newItems = importedItems
                .filter(i => !existingItemIds.has(i.id))
                .map(i => {
                    // Find group ID - check JSON groupId first, then CSV groupName
                    let groupId = null;
                    
                    // For JSON imports: map old groupId to current groupId
                    if (i.groupId && oldGroupIdToCurrentId[i.groupId]) {
                        groupId = oldGroupIdToCurrentId[i.groupId];
                    }
                    // For CSV imports: find group by name
                    else if (i.groupName && groupNameToId[i.groupName.toLowerCase()]) {
                        groupId = groupNameToId[i.groupName.toLowerCase()];
                    }
                    
                    return {
                        id: i.id || this.generateId(),
                        text: i.text,
                        groupId: groupId,
                        type: groupId ? ITEM_TYPES.GROUPED : ITEM_TYPES.UNGROUPED,
                        impact: i.impact || CONFIG.IMPACT_DEFAULT,
                        createdAt: i.createdAt || new Date().toISOString()
                    };
                });
            
            this.items = [...this.items, ...newItems];
            
            this.toasts.show(`Imported ${newGroups.length} groups and ${newItems.length} items`, { type: 'success' });
        } else {
            // Replace: Reset and load imported data
            const importedGroups = items.filter(i => i.type === 'group');
            const importedItems = items.filter(i => i.type !== 'group');
            
            // Create mapping from old group IDs to new groups
            const oldGroupIdToNewId = {};
            
            this.groups = importedGroups.map((g, index) => {
                const newId = this.generateId();
                oldGroupIdToNewId[g.id] = newId; // Map old ID to new ID
                
                return {
                    id: newId,
                    name: g.text,
                    score: 0,
                    percentage: 0,
                    color: CONFIG.DEFAULT_COLORS[index % CONFIG.DEFAULT_COLORS.length],
                    createdAt: g.createdAt || new Date().toISOString()
                };
            });
            
            // Create a map of group names to IDs for CSV imports
            const groupNameToId = {};
            this.groups.forEach(g => {
                groupNameToId[g.name.toLowerCase()] = g.id;
            });
            
            this.items = importedItems.map(i => {
                // Find group ID - check JSON groupId first, then CSV groupName
                let groupId = null;
                
                // For JSON imports: map old groupId to new groupId
                if (i.groupId && oldGroupIdToNewId[i.groupId]) {
                    groupId = oldGroupIdToNewId[i.groupId];
                }
                // For CSV imports: find group by name
                else if (i.groupName && groupNameToId[i.groupName.toLowerCase()]) {
                    groupId = groupNameToId[i.groupName.toLowerCase()];
                }
                
                return {
                    id: i.id || this.generateId(),
                    text: i.text,
                    groupId: groupId,
                    type: groupId ? ITEM_TYPES.GROUPED : ITEM_TYPES.UNGROUPED,
                    impact: i.impact || CONFIG.IMPACT_DEFAULT,
                    createdAt: i.createdAt || new Date().toISOString()
                };
            });
            
            this.toasts.show(`Replaced with ${this.groups.length} groups and ${this.items.length} items`, { type: 'success' });
        }

        this.saveState();
        this.updateAnalysis();
        this.render();
    }

    // Validate item structure
    validateItem(item) {
        return item && item.text && typeof item.text === 'string' && item.text.trim().length > 0;
    }

    /**
     * Handle loading sample data
     */
    async handleLoadSample() {
        // Show modal to choose sample type
        const sampleType = await this.showSampleTypeModal();
        if (!sampleType) return; // User cancelled

        // Get sample data
        const sampleData = this.sampleDataManager.getSampleData('pareto', sampleType);
        if (!sampleData) {
            this.toasts.show('Sample data not available', { type: 'error' });
            return;
        }

        // Backup existing data if any
        if (this.items.length > 0 || this.groups.length > 0) {
            this.importExportManager.createBackup('pareto_backup', [...this.groups, ...this.items], 3);
        }

        // Confirm if user has data
        if (this.items.length > 0 || this.groups.length > 0) {
            const confirmed = await ModalManager.confirm(
                `Load ${sampleData.itemCount} sample items?\n\nThis will replace your current data.`,
                {
                    title: 'Load Sample Data',
                    confirmText: 'Load Sample',
                    cancelText: 'Cancel'
                }
            );
            if (!confirmed) return;
        }

        // Parse sample data (groups and items)
        const importedGroups = sampleData.data.filter(i => i.type === 'group' || i.group !== undefined);
        const importedItems = sampleData.data.filter(i => !i.type || i.type !== 'group');

        // Create groups
        const oldGroupIdToNewId = {};
        this.groups = [];

        importedGroups.forEach((g, index) => {
            const newId = this.generateId('group');
            if (g.id) oldGroupIdToNewId[g.id] = newId;

            this.groups.push({
                id: newId,
                name: g.group || g.text || g.description,
                score: 0,
                scoreMethod: this.scoringMethod,
                itemCount: 0,
                percentage: 0,
                cumulativePercentage: 0,
                rank: 0,
                isPriority: false,
                customScore: 0,
                color: CONFIG.DEFAULT_COLORS[index % CONFIG.DEFAULT_COLORS.length],
                createdAt: g.createdAt || new Date().toISOString()
            });
        });

        // Create a map of group names to IDs
        const groupNameToId = {};
        this.groups.forEach(g => {
            groupNameToId[g.name.toLowerCase()] = g.id;
        });

        // Create items
        this.items = importedItems.map(i => {
            let groupId = null;

            // Map by old groupId or group name
            if (i.groupId && oldGroupIdToNewId[i.groupId]) {
                groupId = oldGroupIdToNewId[i.groupId];
            } else if (i.group && groupNameToId[i.group.toLowerCase()]) {
                groupId = groupNameToId[i.group.toLowerCase()];
            }

            return {
                id: i.id || this.generateId('item'),
                text: i.description || i.text,
                groupId: groupId,
                impact: i.impact || CONFIG.IMPACT_DEFAULT,
                createdAt: i.createdAt || new Date().toISOString()
            };
        });

        this.saveState();
        this.updateAnalysis();
        this.render();

        const typeName = sampleType === 'technical' ? 'Customer Support Issues' : 'Household Time Wasters';
        this.toasts.show(`${typeName} sample loaded! 🎉`, { type: 'success' });
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
                    <p>Select a sample dataset to see how the Pareto Analysis tool works:</p>
                    <div class="sample-options">
                        <button class="sample-option-btn" data-type="technical">
                            <strong>Technical/Professional</strong>
                            <small>Customer Support Issues</small>
                        </button>
                        <button class="sample-option-btn" data-type="everyday">
                            <strong>Personal/Everyday</strong>
                            <small>Household Time Wasters</small>
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
        if (this.groups.length === 0 && this.items.length === 0) {
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
        const priorityGroups = this.groups.filter(g => this.analysis.priorityGroupIds.includes(g.id));
        const summary = this.groups.length > 0
            ? `${this.groups.length} groups, ${this.items.length} items - ${priorityGroups.length} priority groups`
            : `${this.items.length} items`;

        // Save to history
        const session = this.history.saveSession({
            tool: 'pareto',
            title: title.trim(),
            summary: summary,
            data: {
                groups: this.groups,
                items: this.items,
                scoringMethod: this.scoringMethod,
                analysis: this.analysis,
                version: 1
            }
        });

        this.toasts.show('Session saved to history', { type: 'success' });
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    new ParetoAnalyzer();
});
