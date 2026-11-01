// Eisenhower Matrix Tool - Main Application Script
// Priority management using the Urgent-Important Matrix

// Use centralized APP_CONFIG
const CONFIG = {
    ...APP_CONFIG.COMMON,
    ...APP_CONFIG.EISENHOWER
};

const QUADRANTS = {
    DO_FIRST: 'do-first',
    SCHEDULE: 'schedule',
    DELEGATE: 'delegate',
    ELIMINATE: 'eliminate'
};

class EisenhowerMatrix {
    constructor() {
        this.tasks = [];
        this.currentQuadrant = QUADRANTS.DO_FIRST;
        
        // Initialize DOM elements
        this.initializeElements();
        
        // Initialize utilities
        this.logger = Logger.getLogger('EisenhowerMatrix');
        this.themeManager = new ThemeManager(CONFIG.THEME_KEY);
        this.toasts = new ToastManager();
        this.storage = new StorageManager(CONFIG.STORAGE_KEY, { version: 1 });
        this.errorHandler = new ErrorHandler({
            appName: 'Eisenhower Matrix',
            toastManager: this.toasts
        });
        
        // Initialize ImportExportManager with custom validation
        this.importExportManager = new ImportExportManager({
            appName: 'eisenhower-matrix',
            toastManager: this.toasts,
            validateItem: (item) => this.validateTask(item),
            columnMappings: {
                text: ['text', 'task', 'name', 'description'],
                quadrant: ['quadrant', 'category', 'priority']
            }
        });

        // Initialize sample data manager
        this.sampleDataManager = new SampleDataManager();

        // Initialize history manager
        this.history = new HistoryManager();

        // Initialize modal manager for help
        this.helpModalManager = new ModalManager(this.helpModal);
        
        // Initialize character counter
        const charCountElement = document.getElementById('char-count');
        this.characterCounter = new CharacterCounter(
            this.taskInput,
            charCountElement,
            { maxLength: CONFIG.MAX_TASK_LENGTH, warningThreshold: 0.75, dangerThreshold: 0.9 }
        );
        
        // Load theme
        this.themeManager.loadTheme();
        
        // Load data and setup
        this.loadTasks();
        this.setupEventListeners();
        this.render();

        // Render storage indicator (tool-specific)
        this.storage.renderToolIndicator('#storage-indicator-container');

        this.logger.info('Eisenhower Matrix initialized', { taskCount: this.tasks.length });
    }
    
    initializeElements() {
        // Form elements
        this.taskInput = document.getElementById('main-input');
        this.taskForm = document.getElementById('task-form');
        
        // Quadrant selector buttons
        this.quadrantButtons = document.querySelectorAll('.quadrant-btn');
        
        // Data management buttons
        this.loadSampleBtn = document.getElementById('load-sample-btn');
        this.clearAllBtn = document.getElementById('clear-all');
        this.importBtn = document.getElementById('import-btn');
        this.exportSelect = document.getElementById('export-select');
        this.importFile = document.getElementById('import-file');
        
        // Quadrant lists
        this.quadrantLists = {
            [QUADRANTS.DO_FIRST]: document.getElementById('do-first-list'),
            [QUADRANTS.SCHEDULE]: document.getElementById('schedule-list'),
            [QUADRANTS.DELEGATE]: document.getElementById('delegate-list'),
            [QUADRANTS.ELIMINATE]: document.getElementById('eliminate-list')
        };
        
        // All quadrant containers (for drag-and-drop)
        this.quadrantContainers = document.querySelectorAll('.quadrant');
        
        // Help and theme
        this.helpModal = document.getElementById('help-modal');
        this.helpToggle = document.getElementById('help-toggle');
        this.themeToggle = document.getElementById('theme-toggle');

        // Save to history button
        this.saveHistoryBtn = document.getElementById('save-history-btn');
    }
    
    setupEventListeners() {
        // Form submission
        this.taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddTask();
        });

        // Handle Enter key in textarea (submit form instead of newline)
        this.taskInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleAddTask();
            }
        });
        
        // Quadrant selector buttons
        this.quadrantButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const quadrant = btn.dataset.quadrant;
                this.setActiveQuadrant(quadrant);
            });
        });
        
        // Data management
        this.loadSampleBtn.addEventListener('click', () => this.handleLoadSample());
        this.clearAllBtn.addEventListener('click', () => this.handleClearAll());
        this.importBtn.addEventListener('click', () => {
            this.importFile.click();
        });
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
        
        // Event delegation for task actions
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="delete"]')) {
                const taskId = e.target.closest('[data-action="delete"]').dataset.taskId;
                this.deleteTask(taskId);
            }
        });
        
        // Setup drag and drop
        this.setupDragAndDrop();

        // Setup keyboard navigation for tasks
        this.setupKeyboardNavigation();
    }
    
    setupDragAndDrop() {
        // Make task items draggable
        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('task-item')) {
                e.target.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
                this.logger.debug('Drag started', { taskId: e.target.dataset.taskId });
            }
        });
        
        document.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('task-item')) {
                e.target.classList.remove('dragging');
            }
        });
        
        // Handle drop zones (quadrants)
        this.quadrantContainers.forEach(quadrant => {
            quadrant.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                quadrant.classList.add('drag-over');
            });
            
            quadrant.addEventListener('dragleave', (e) => {
                // Only remove if leaving the quadrant entirely
                if (e.target === quadrant) {
                    quadrant.classList.remove('drag-over');
                }
            });
            
            quadrant.addEventListener('drop', (e) => {
                e.preventDefault();
                quadrant.classList.remove('drag-over');
                
                const taskId = e.dataTransfer.getData('text/plain');
                const newQuadrant = quadrant.dataset.quadrant;
                
                this.moveTask(taskId, newQuadrant);
            });
        });
    }

    /**
     * Setup keyboard navigation for moving tasks between quadrants with arrow keys
     * Visual layout (based on HTML/CSS grid order):
     *   Do First  | Schedule
     *   Delegate  | Eliminate
     */
    setupKeyboardNavigation() {
        // Navigation map: current quadrant -> { direction: target quadrant }
        // Arrow keys move in the visual direction on screen
        this.quadrantNavMap = {
            [QUADRANTS.DO_FIRST]: {      // top-left
                ArrowRight: QUADRANTS.SCHEDULE,
                ArrowDown: QUADRANTS.DELEGATE
            },
            [QUADRANTS.SCHEDULE]: {      // top-right
                ArrowLeft: QUADRANTS.DO_FIRST,
                ArrowDown: QUADRANTS.ELIMINATE
            },
            [QUADRANTS.DELEGATE]: {      // bottom-left
                ArrowRight: QUADRANTS.ELIMINATE,
                ArrowUp: QUADRANTS.DO_FIRST
            },
            [QUADRANTS.ELIMINATE]: {     // bottom-right
                ArrowLeft: QUADRANTS.DELEGATE,
                ArrowUp: QUADRANTS.SCHEDULE
            }
        };

        // Delegate keyboard events for task items
        document.addEventListener('keydown', (e) => {
            const taskItem = e.target.closest('.task-item');
            if (!taskItem) return;

            // Arrow keys move the task
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                this.handleTaskArrowKey(taskItem, e.key);
            }
        });
    }

    /**
     * Handle arrow key press on a task item
     * @param {HTMLElement} taskItem - The task element
     * @param {string} key - The arrow key pressed
     */
    handleTaskArrowKey(taskItem, key) {
        const taskId = taskItem.dataset.taskId;
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const currentQuadrant = task.quadrant;
        const targetQuadrant = this.quadrantNavMap[currentQuadrant]?.[key];

        if (targetQuadrant) {
            this.moveTask(taskId, targetQuadrant);

            // Re-focus the task in its new location
            requestAnimationFrame(() => {
                const movedTask = document.querySelector(`[data-task-id="${taskId}"]`);
                if (movedTask) {
                    movedTask.focus();
                }
            });
        }
    }

    handleKeyboard(e) {
        // Help modal
        if (e.key === '?') {
            e.preventDefault();
            this.helpModalManager.toggle();
            return;
        }

        // Focus input
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
            e.preventDefault();
            e.stopPropagation();
            this.taskInput.focus();
            return;
        }

        // Quick quadrant selection with Ctrl+Shift+number
        if (e.ctrlKey && e.shiftKey && ['1', '2', '3', '4'].includes(e.key)) {
            e.preventDefault();
            e.stopPropagation();
            const quadrants = [
                QUADRANTS.DO_FIRST,
                QUADRANTS.SCHEDULE,
                QUADRANTS.DELEGATE,
                QUADRANTS.ELIMINATE
            ];
            const index = parseInt(e.key) - 1;
            this.setActiveQuadrant(quadrants[index], true);
            this.logger.debug('Quadrant selected via keyboard', { quadrant: quadrants[index], key: e.key });
            return;
        }
    }
    
    setActiveQuadrant(quadrant, showToast = false) {
        this.currentQuadrant = quadrant;

        // Update button states
        this.quadrantButtons.forEach(btn => {
            if (btn.dataset.quadrant === quadrant) {
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
            } else {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
            }
        });

        // Show toast for keyboard shortcuts
        if (showToast) {
            const quadrantNames = {
                [QUADRANTS.DO_FIRST]: 'Do First',
                [QUADRANTS.SCHEDULE]: 'Schedule',
                [QUADRANTS.DELEGATE]: 'Delegate',
                [QUADRANTS.ELIMINATE]: 'Eliminate'
            };
            this.toasts.show(`Selected: ${quadrantNames[quadrant]}`, { type: 'info', duration: 1500 });
        }

        this.logger.debug('Active quadrant changed', { quadrant });
    }
    
    handleAddTask() {
        const text = this.taskInput.value.trim();
        
        if (!text) {
            this.toasts.show('Please enter a task', { type: 'warning' });
            return;
        }
        
        if (text.length > CONFIG.MAX_TASK_LENGTH) {
            this.toasts.show(`Task is too long (max ${CONFIG.MAX_TASK_LENGTH} characters)`, { type: 'error' });
            return;
        }
        
        this.addTask(text, this.currentQuadrant);
        this.taskInput.value = '';
        this.characterCounter.reset();
        this.taskInput.focus();
    }
    
    addTask(text, quadrant = this.currentQuadrant) {
        const task = {
            id: this.generateId('task'),
            text: text.trim(),
            quadrant: quadrant,
            createdAt: new Date().toISOString(),
            movedAt: new Date().toISOString()
        };
        
        this.tasks.push(task);
        this.saveState();
        this.render();
        this.toasts.success('Task added');
        
        this.logger.info('Task added', { quadrant, taskId: task.id });
        return task;
    }
    
    deleteTask(taskId) {
        const index = this.tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
            const task = this.tasks[index];
            this.tasks.splice(index, 1);
            this.saveState();
            this.render();
            this.toasts.info('Task deleted');
            
            this.logger.info('Task deleted', { taskId, quadrant: task.quadrant });
        }
    }
    
    moveTask(taskId, newQuadrant) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.quadrant !== newQuadrant) {
            const oldQuadrant = task.quadrant;
            task.quadrant = newQuadrant;
            task.movedAt = new Date().toISOString();
            this.saveState();
            this.render();
            
            // Show colored toast matching the destination quadrant
            const quadrantColors = {
                'do-first': { bg: '#ef4444', text: 'white' },
                'schedule': { bg: '#3b82f6', text: 'white' },
                'delegate': { bg: '#f59e0b', text: 'white' },
                'eliminate': { bg: '#6b7280', text: 'white' }
            };
            const colors = quadrantColors[newQuadrant];
            this.toasts.show(`Moved to ${this.getQuadrantLabel(newQuadrant).split(' (')[0]}`, {
                type: 'success',
                backgroundColor: colors.bg,
                textColor: colors.text
            });
            
            this.logger.info('Task moved', { taskId, from: oldQuadrant, to: newQuadrant });
        }
    }
    
    async handleClearAll() {
        if (this.tasks.length === 0) {
            this.toasts.info('No tasks to clear');
            return;
        }

        const confirmed = await ModalManager.confirm(
            'Clear all tasks?\n\nThis will delete all tasks from all quadrants. This action cannot be undone.',
            {
                title: 'Clear All Tasks',
                confirmText: 'Clear All',
                cancelText: 'Cancel'
            }
        );

        if (!confirmed) return;

        const count = this.tasks.length;
        this.tasks = [];
        this.saveState();
        this.render();
        this.toasts.success(`Cleared ${count} tasks`);

        this.logger.info('All tasks cleared', { count });
    }
    
    render() {
        // Clear all quadrants
        Object.values(QUADRANTS).forEach(quadrant => {
            const list = this.quadrantLists[quadrant];
            if (list) list.innerHTML = '';
        });
        
        // Render tasks into quadrants
        this.tasks.forEach(task => {
            const list = this.quadrantLists[task.quadrant];
            if (!list) return;
            
            const li = document.createElement('li');
            li.className = 'task-item';
            li.draggable = true;
            li.tabIndex = 0;
            li.dataset.taskId = task.id;
            li.setAttribute('aria-label', `${task.text}. Use arrow keys to move between quadrants.`);
            
            li.innerHTML = `
                <span class="task-text">${DOMHelpers.escapeHtml(task.text)}</span>
                <div class="task-actions">
                    <select class="quadrant-transfer" data-task-id="${task.id}" aria-label="Move to quadrant">
                        <option value="">Move to...</option>
                        ${Object.entries(QUADRANTS)
                            .filter(([_, value]) => value !== task.quadrant)
                            .map(([key, value]) => {
                                const label = key.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
                                return `<option value="${value}">${label}</option>`;
                            })
                            .join('')}
                    </select>
                    <button class="btn-icon" data-action="delete" data-task-id="${task.id}" 
                            aria-label="Delete task">
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
        
        // Add transfer dropdown listeners
        document.querySelectorAll('.quadrant-transfer').forEach(select => {
            select.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.moveTask(select.dataset.taskId, e.target.value);
                    e.target.value = ''; // Reset dropdown after move
                }
            });
        });
        
        this.updateCounts();
        this.updateEmptyStates();
    }
    
    updateCounts() {
        Object.values(QUADRANTS).forEach(quadrant => {
            const count = this.tasks.filter(t => t.quadrant === quadrant).length;
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
    
    // Import/Export Functions
    
    handleExport(event) {
        const format = event.target.value;
        if (!format) return;
        
        if (format === 'json') {
            this.handleExportJSON();
        } else if (format === 'csv') {
            this.handleExportCSV();
        }
        
        // Reset dropdown
        event.target.value = '';
    }
    
    handleExportJSON() {
        if (this.tasks.length === 0) {
            this.toasts.show('No tasks to export', { type: 'info' });
            return;
        }
        
        const metadata = {
            totalTasks: this.tasks.length,
            byQuadrant: {
                doFirst: this.tasks.filter(t => t.quadrant === QUADRANTS.DO_FIRST).length,
                schedule: this.tasks.filter(t => t.quadrant === QUADRANTS.SCHEDULE).length,
                delegate: this.tasks.filter(t => t.quadrant === QUADRANTS.DELEGATE).length,
                eliminate: this.tasks.filter(t => t.quadrant === QUADRANTS.ELIMINATE).length
            }
        };
        
        this.importExportManager.exportToJSON(this.tasks, metadata);
        this.logger.info('Tasks exported to JSON', metadata);
    }
    
    handleExportCSV() {
        if (this.tasks.length === 0) {
            this.toasts.show('No tasks to export', { type: 'info' });
            return;
        }
        
        const headers = ['Task', 'Quadrant', 'Created', 'Last Moved'];
        const rowMapper = (task) => [
            this.importExportManager.escapeCsvValue(task.text),
            this.getQuadrantLabel(task.quadrant),
            task.createdAt,
            task.movedAt
        ];
        
        this.importExportManager.exportToCSV(this.tasks, headers, rowMapper);
        this.logger.info('Tasks exported to CSV', { count: this.tasks.length });
    }
    
    async handleImportFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.logger.info('Import started', { fileName: file.name, fileType: file.type });
        
        const result = await this.importExportManager.importFromFile(file);
        
        this.logger.info('Import result', { result });
        
        if (!result) {
            this.logger.error('Import failed - no result returned');
            event.target.value = ''; // Reset file input
            return;
        }
        
        const { items, merge } = result;
        
        this.logger.info('Processing import', { itemCount: items.length, merge });
        
        // Map imported items to tasks
        const importedTasks = items.map(item => ({
            id: item.id || this.generateId('task'),
            text: item.text || item.name || item.task,
            quadrant: this.parseQuadrant(item.quadrant),
            createdAt: item.createdAt || new Date().toISOString(),
            movedAt: item.movedAt || item.createdAt || new Date().toISOString()
        }));
        
        if (merge) {
            this.tasks = [...this.tasks, ...importedTasks];
            this.toasts.success(`Imported ${importedTasks.length} tasks`);
        } else {
            this.tasks = importedTasks;
            this.toasts.success(`Replaced with ${importedTasks.length} tasks`);
        }
        
        this.saveState();
        this.render();
        this.logger.info('Tasks imported', { count: importedTasks.length, merge });
        
        // Reset file input
        event.target.value = '';
    }
    
    parseQuadrant(quadrantValue) {
        if (!quadrantValue) return QUADRANTS.DO_FIRST;
        
        const normalized = quadrantValue.toString().toLowerCase();
        
        if (normalized.includes('do first') || normalized.includes('do-first') || normalized === QUADRANTS.DO_FIRST) {
            return QUADRANTS.DO_FIRST;
        }
        if (normalized.includes('schedule') || normalized === QUADRANTS.SCHEDULE) {
            return QUADRANTS.SCHEDULE;
        }
        if (normalized.includes('delegate') || normalized === QUADRANTS.DELEGATE) {
            return QUADRANTS.DELEGATE;
        }
        if (normalized.includes('eliminate') || normalized === QUADRANTS.ELIMINATE) {
            return QUADRANTS.ELIMINATE;
        }
        
        // Default to Do First if unknown
        return QUADRANTS.DO_FIRST;
    }
    
    getQuadrantLabel(quadrant) {
        const labels = {
            [QUADRANTS.DO_FIRST]: 'Do First (Urgent & Important)',
            [QUADRANTS.SCHEDULE]: 'Schedule (Not Urgent & Important)',
            [QUADRANTS.DELEGATE]: 'Delegate (Urgent & Not Important)',
            [QUADRANTS.ELIMINATE]: 'Eliminate (Not Urgent & Not Important)'
        };
        return labels[quadrant] || quadrant;
    }
    
    validateTask(item) {
        return item && (item.text || item.name || item.task) &&
               typeof (item.text || item.name || item.task) === 'string';
    }

    /**
     * Handle loading sample data
     */
    async handleLoadSample() {
        // Show modal to choose sample type
        const sampleType = await this.showSampleTypeModal();
        if (!sampleType) return; // User cancelled

        // Get sample data
        const sampleData = this.sampleDataManager.getSampleData('eisenhower-matrix', sampleType);
        if (!sampleData) {
            this.toasts.show('Sample data not available', { type: 'error' });
            return;
        }

        // Create backup if user has existing data
        if (this.tasks.length > 0) {
            this.importExportManager.createBackup(CONFIG.STORAGE_KEY + '_backup', this.tasks, 3);
        }

        // Load sample data using import manager
        const result = await this.importExportManager.importFromData(sampleData, this.tasks.length > 0);

        if (!result) {
            return; // Error already shown or user cancelled
        }

        // Apply import
        if (result.merge) {
            // Merge: Add imported items, skip duplicates by ID
            const existingIds = new Set(this.tasks.map(t => t.id));
            const newTasks = result.items.filter(t => !existingIds.has(t.id));
            this.tasks = [...this.tasks, ...newTasks];

            const duplicates = result.items.length - newTasks.length;
            const message = duplicates > 0
                ? `Added ${newTasks.length} sample tasks (${duplicates} duplicates skipped)`
                : `Added ${newTasks.length} sample tasks`;
            this.toasts.show(message, { type: 'success' });
        } else {
            // Replace: Clear and load imported items
            this.tasks = result.items;
            this.toasts.show(`Loaded ${result.items.length} sample tasks`, { type: 'success' });
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
                    <p>Select a sample dataset to see how the Eisenhower Matrix works:</p>
                    <div class="sample-options">
                        <button class="sample-option-btn" data-type="technical">
                            <strong>Technical/Professional</strong>
                            <small>Project Manager Tasks</small>
                        </button>
                        <button class="sample-option-btn" data-type="everyday">
                            <strong>Personal/Everyday</strong>
                            <small>Personal Life Tasks</small>
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
        if (this.tasks.length === 0) {
            this.toasts.show('No tasks to save', { type: 'info' });
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
        const doFirstCount = this.tasks.filter(t => t.quadrant === QUADRANTS.DO_FIRST).length;
        const scheduleCount = this.tasks.filter(t => t.quadrant === QUADRANTS.SCHEDULE).length;
        const delegateCount = this.tasks.filter(t => t.quadrant === QUADRANTS.DELEGATE).length;
        const eliminateCount = this.tasks.filter(t => t.quadrant === QUADRANTS.ELIMINATE).length;
        const summary = `${this.tasks.length} tasks: ${doFirstCount} Do First, ${scheduleCount} Schedule, ${delegateCount} Delegate, ${eliminateCount} Eliminate`;

        // Save to history
        const session = this.history.saveSession({
            tool: 'eisenhower-matrix',
            title: title.trim(),
            summary: summary,
            data: {
                tasks: this.tasks,
                version: 1
            }
        });

        this.toasts.show('Session saved to history', { type: 'success' });
        this.logger.info('Session saved to history:', session.id);
    }

    // Utility Functions

    saveState() {
        this.storage.save({
            tasks: this.tasks,
            savedAt: new Date().toISOString()
        });
        this.storage.updateToolIndicator();
        StorageManager.checkStorageAndWarn(this.toasts);
    }

    loadTasks() {
        // Check for restore data from history
        const restoreKey = 'restore_eisenhower-matrix';
        const restoreData = localStorage.getItem(restoreKey);
        if (restoreData) {
            try {
                const restored = JSON.parse(restoreData);
                localStorage.removeItem(restoreKey);
                if (restored.data && restored.data.tasks) {
                    this.tasks = restored.data.tasks;
                    // Defer toast until after render
                    setTimeout(() => this.toasts.show('Session restored from history', { type: 'success' }), 100);
                    this.logger.info('Tasks restored from history', { count: this.tasks.length });
                    return;
                }
            } catch (e) {
                this.logger.error('Failed to restore from history:', e);
                localStorage.removeItem(restoreKey);
            }
        }

        const data = this.storage.load();
        this.tasks = data?.tasks || [];
        this.logger.debug('Tasks loaded from storage', { count: this.tasks.length });
    }
    
    generateId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    }
    
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new EisenhowerMatrix();
    
    // Expose to window for debugging (development only)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.eisenhowerMatrix = app;
    }
});
