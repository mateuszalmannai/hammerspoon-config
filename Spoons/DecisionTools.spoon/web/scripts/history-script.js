/**
 * HistoryViewer - UI controller for the session history page
 */
class HistoryViewer {
    constructor() {
        // Initialize utilities
        this.themeManager = new ThemeManager();
        this.toasts = new ToastManager();
        this.history = new HistoryManager();

        // Initialize DOM elements
        this.initializeElements();

        // Setup keyboard manager
        this.setupKeyboardManager();

        // Setup event listeners
        this.setupEventListeners();

        // Load theme
        this.themeManager.loadTheme();

        // Render sessions
        this.render();

        // Render storage indicator
        this.renderStorageIndicator();
    }

    initializeElements() {
        // Controls
        this.filterSelect = document.getElementById('filter-tool');
        this.sessionCount = document.getElementById('session-count');

        // Session list
        this.sessionList = document.getElementById('session-list');
        this.emptyState = document.getElementById('empty-state');

        // Buttons
        this.clearAllBtn = document.getElementById('clear-all');
        this.exportBtn = document.getElementById('export-btn');
        this.importBtn = document.getElementById('import-btn');
        this.importFile = document.getElementById('import-file');

        // Theme and help
        this.themeToggle = document.getElementById('theme-toggle');
        this.helpToggle = document.getElementById('help-toggle');

        // Modals
        this.helpModal = document.getElementById('help-modal');
        this.helpModalManager = new ModalManager(this.helpModal);
        this.viewModal = document.getElementById('view-modal');
        this.viewModalManager = new ModalManager(this.viewModal);
        this.viewModalContent = document.getElementById('view-modal-content');
    }

    setupKeyboardManager() {
        // Initialize keyboard manager with help modal and custom escape handler
        this.keyboard = new KeyboardManager({
            helpModal: this.helpModalManager,
            onEscape: () => {
                // Close all modals on escape
                if (this.helpModalManager.isOpen()) {
                    this.helpModalManager.close();
                }
                if (this.viewModalManager.isOpen()) {
                    this.viewModalManager.close();
                }
            }
        });

        // Register tool-specific shortcuts
        this.keyboard.registerAll([
            {
                key: 'e',
                type: 'ctrl',
                category: 'Data',
                description: 'Export sessions',
                action: () => this.handleExport()
            },
            {
                key: 'i',
                type: 'ctrl',
                category: 'Data',
                description: 'Import sessions',
                action: () => this.importFile.click()
            }
        ]);

        // Initialize the keyboard manager
        this.keyboard.init();
    }

    setupEventListeners() {
        // Filter
        this.filterSelect.addEventListener('change', () => this.render());

        // Theme and help
        this.themeToggle.addEventListener('click', () => this.themeManager.toggleTheme());
        this.helpToggle.addEventListener('click', () => this.helpModalManager.toggle(this.helpToggle));

        // Data management
        this.clearAllBtn.addEventListener('click', () => this.handleClearAll());
        this.exportBtn.addEventListener('click', () => this.handleExport());
        this.importBtn.addEventListener('click', () => this.importFile.click());
        this.importFile.addEventListener('change', (e) => this.handleImport(e));

        // Delegate click events for session actions
        this.sessionList.addEventListener('click', (e) => this.handleSessionAction(e));
    }

    render() {
        const filterTool = this.filterSelect.value;
        let sessions = filterTool
            ? this.history.getSessionsByTool(filterTool)
            : this.history.getSessions();

        // Update count
        const countText = sessions.length === 1 ? '1 session' : `${sessions.length} sessions`;
        this.sessionCount.textContent = countText;

        // Show empty state or sessions
        if (sessions.length === 0) {
            this.sessionList.style.display = 'none';
            this.emptyState.style.display = 'block';
            return;
        }

        this.sessionList.style.display = 'flex';
        this.emptyState.style.display = 'none';

        // Render session cards
        this.sessionList.innerHTML = sessions.map(session => this.renderSessionCard(session)).join('');
    }

    renderSessionCard(session) {
        const toolName = HistoryManager.getToolDisplayName(session.tool);
        const savedDate = new Date(session.savedAt);
        const formattedDate = savedDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        const formattedTime = savedDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <article class="session-card" data-session-id="${session.id}">
                <div class="session-header">
                    <h3 class="session-title">${DOMHelpers.escapeHtml(session.title)}</h3>
                    <span class="session-tool-badge">${toolName}</span>
                </div>
                ${session.summary ? `<p class="session-summary">${DOMHelpers.escapeHtml(session.summary)}</p>` : ''}
                <div class="session-meta">
                    <span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        ${formattedDate}
                    </span>
                    <span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        ${formattedTime}
                    </span>
                </div>
                <div class="session-actions">
                    <button class="btn-text" data-action="view" data-session-id="${session.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        View
                    </button>
                    <button class="btn-text" data-action="restore" data-session-id="${session.id}" data-tool="${session.tool}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="1 4 1 10 7 10"></polyline>
                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                        </svg>
                        Restore
                    </button>
                    <button class="btn-text" data-action="delete" data-session-id="${session.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Delete
                    </button>
                </div>
            </article>
        `;
    }

    handleSessionAction(e) {
        const button = e.target.closest('[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        const sessionId = button.dataset.sessionId;

        switch (action) {
            case 'view':
                this.viewSession(sessionId);
                break;
            case 'restore':
                this.restoreSession(sessionId, button.dataset.tool);
                break;
            case 'delete':
                this.deleteSession(sessionId);
                break;
        }
    }

    viewSession(sessionId) {
        const session = this.history.getSession(sessionId);
        if (!session) {
            this.toasts.error('Session not found');
            return;
        }

        // Update modal title
        document.getElementById('view-modal-title').textContent = session.title;

        // Format and display session data
        const formattedData = JSON.stringify(session.data, null, 2);
        this.viewModalContent.textContent = formattedData;

        this.viewModalManager.open();
    }

    async restoreSession(sessionId, toolKey) {
        const session = this.history.getSession(sessionId);
        if (!session) {
            this.toasts.error('Session not found');
            return;
        }

        const toolName = HistoryManager.getToolDisplayName(toolKey);
        const confirmed = await ModalManager.confirm(
            `Restore "${session.title}" to ${toolName}?\n\nThis will replace the current data in that tool.`,
            {
                title: 'Restore Session',
                confirmText: 'Restore',
                cancelText: 'Cancel'
            }
        );

        if (!confirmed) return;

        // Store the session data for the tool to pick up
        const restoreKey = `restore_${toolKey}`;
        localStorage.setItem(restoreKey, JSON.stringify({
            sessionId: session.id,
            data: session.data,
            restoredAt: new Date().toISOString()
        }));

        // Navigate to the tool
        const toolUrl = HistoryManager.getToolUrl(toolKey);
        window.location.href = toolUrl;
    }

    async deleteSession(sessionId) {
        const session = this.history.getSession(sessionId);
        if (!session) {
            this.toasts.error('Session not found');
            return;
        }

        const confirmed = await ModalManager.confirm(
            `Delete "${session.title}"?\n\nThis action cannot be undone.`,
            {
                title: 'Delete Session',
                confirmText: 'Delete',
                cancelText: 'Cancel'
            }
        );

        if (!confirmed) return;

        this.history.deleteSession(sessionId);
        this.render();
        this.renderStorageIndicator();
        this.toasts.success('Session deleted');
    }

    async handleClearAll() {
        const sessions = this.history.getSessions();
        if (sessions.length === 0) {
            this.toasts.info('No sessions to clear');
            return;
        }

        const confirmed = await ModalManager.confirm(
            `Delete all ${sessions.length} saved sessions?\n\nThis action cannot be undone.`,
            {
                title: 'Clear All History',
                confirmText: 'Clear All',
                cancelText: 'Cancel'
            }
        );

        if (!confirmed) return;

        const count = this.history.clearAllSessions();
        this.render();
        this.renderStorageIndicator();
        this.toasts.success(`Cleared ${count} sessions`);
    }

    handleExport() {
        const sessions = this.history.getSessions();
        if (sessions.length === 0) {
            this.toasts.info('No sessions to export');
            return;
        }

        const exportData = this.history.exportSessions();
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `session-history-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.toasts.success(`Exported ${sessions.length} sessions`);
    }

    async handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const importData = JSON.parse(text);

            if (!importData.sessions || !Array.isArray(importData.sessions)) {
                throw new Error('Invalid history file format');
            }

            const result = this.history.importSessions(importData, true);
            this.render();
            this.renderStorageIndicator();
            this.toasts.success(`Imported ${result.imported} sessions (${result.skipped} skipped)`);

        } catch (error) {
            this.toasts.error('Failed to import: ' + error.message);
        }

        // Reset file input
        e.target.value = '';
    }

    renderStorageIndicator() {
        const usage = this.history.getStorageUsage();
        const container = document.getElementById('storage-indicator-container');
        if (!container) return;

        container.innerHTML = '';
        const indicator = document.createElement('span');
        indicator.id = 'storage-indicator';
        indicator.className = 'storage-indicator';
        indicator.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
            </svg>
            ${usage.formatted}
        `;
        indicator.title = `${usage.sessionCount} sessions stored`;
        container.appendChild(indicator);
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    new HistoryViewer();
});
