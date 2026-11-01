/**
 * StorageManager - Centralized localStorage management
 * Handles state persistence with versioning and error handling
 */
class StorageManager {
    constructor(storageKey, options = {}) {
        this.storageKey = storageKey;
        this.version = options.version || 1;
        this.onError = options.onError || console.error;
    }
    
    /**
     * Save data to localStorage
     * @param {Object} data - The data to save
     * @param {number} version - Optional version override
     * @returns {boolean} Success status
     */
    save(data, version = this.version) {
        const state = {
            ...data,
            version,
            savedAt: new Date().toISOString()
        };
        
        try {
            const serialized = JSON.stringify(state);
            localStorage.setItem(this.storageKey, serialized);
            return true;
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                this.onError('Storage quota exceeded', error);
            } else {
                this.onError('Failed to save state', error);
            }
            return false;
        }
    }
    
    /**
     * Load data from localStorage
     * @param {Function} migrate - Optional migration function (oldState, oldVersion, newVersion) => newState
     * @returns {Object|null} The loaded state or null
     */
    load(migrate = null) {
        try {
            const serialized = localStorage.getItem(this.storageKey);
            if (!serialized) return null;
            
            const state = JSON.parse(serialized);
            
            // Handle version migration
            if (migrate && state.version !== this.version) {
                return migrate(state, state.version, this.version);
            }
            
            return state;
        } catch (error) {
            this.onError('Failed to load state', error);
            // Clear corrupted data
            this.clear();
            return null;
        }
    }
    
    /**
     * Clear stored data
     * @returns {boolean} Success status
     */
    clear() {
        try {
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (error) {
            this.onError('Failed to clear storage', error);
            return false;
        }
    }
    
    /**
     * Check if data exists in storage
     * @returns {boolean}
     */
    exists() {
        return localStorage.getItem(this.storageKey) !== null;
    }

    /**
     * Get the size of this storage key in bytes
     * @returns {number} Size in bytes
     */
    getSize() {
        const data = localStorage.getItem(this.storageKey);
        if (!data) return 0;
        // Each character in localStorage is stored as UTF-16 (2 bytes)
        return (this.storageKey.length + data.length) * 2;
    }

    /**
     * Format bytes as human-readable string
     * @param {number} bytes - Number of bytes
     * @returns {string} Formatted string (e.g., "1.2 MB")
     */
    static formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    /**
     * Get overall localStorage usage statistics
     * @param {number} limitBytes - Storage limit in bytes (default 5MB)
     * @returns {Object} Usage statistics
     */
    static getStorageUsage(limitBytes = 5 * 1024 * 1024) {
        let totalBytes = 0;

        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                const value = localStorage.getItem(key);
                // Each character is 2 bytes (UTF-16)
                totalBytes += (key.length + value.length) * 2;
            }
        }

        const percentage = (totalBytes / limitBytes) * 100;

        return {
            used: totalBytes,
            usedFormatted: StorageManager.formatBytes(totalBytes),
            limit: limitBytes,
            limitFormatted: StorageManager.formatBytes(limitBytes),
            percentage: percentage.toFixed(1),
            isWarning: percentage > 70,
            isDanger: percentage > 90
        };
    }

    /**
     * Get storage usage breakdown by tool
     * @returns {Array} Array of tool usage objects sorted by size (largest first)
     */
    static getToolUsage() {
        const tools = {
            'proscons': 'PMI Tool',
            'pairedComparison_v1': 'Paired Comparison',
            'decisionMatrix_v1': 'Decision Matrix',
            'pareto_analysis': 'Pareto Analysis',
            'eisenhower_matrix': 'Eisenhower Matrix',
            'risk_analysis': 'Risk Analysis',
            'cost_benefit_v1': 'Cost-Benefit Analysis',
            'analysis_history_v1': 'Session History',
            'theme': 'Theme Preference'
        };

        const usage = [];

        for (const [key, name] of Object.entries(tools)) {
            const data = localStorage.getItem(key);
            const bytes = data ? (key.length + data.length) * 2 : 0;
            usage.push({
                key,
                name,
                bytes,
                formatted: StorageManager.formatBytes(bytes)
            });
        }

        // Sort by size descending
        return usage.sort((a, b) => b.bytes - a.bytes);
    }

    /**
     * Get a summary string of storage usage
     * @returns {string} Human-readable summary
     */
    static getUsageSummary() {
        const usage = StorageManager.getStorageUsage();
        const tools = StorageManager.getToolUsage().filter(t => t.bytes > 0);

        let summary = `Storage: ${usage.usedFormatted} / ${usage.limitFormatted} (${usage.percentage}%)`;

        if (tools.length > 0) {
            summary += '\n\nBreakdown:';
            tools.forEach(tool => {
                summary += `\n  ${tool.name}: ${tool.formatted}`;
            });
        }

        return summary;
    }

    /**
     * Check storage usage and show warning toast if needed
     * Only shows warning once per session per threshold to avoid spam
     * @param {ToastManager} toastManager - Toast manager instance for showing warnings
     */
    static checkStorageAndWarn(toastManager) {
        if (!toastManager) return;

        const usage = StorageManager.getStorageUsage();

        // Use session flags to avoid repeated warnings
        if (usage.isDanger && !StorageManager._dangerWarningShown) {
            StorageManager._dangerWarningShown = true;
            toastManager.show(
                `Storage nearly full (${usage.percentage}%). Export your data as backup.`,
                { type: 'warning', duration: 5000 }
            );
        } else if (usage.isWarning && !StorageManager._warningShown) {
            StorageManager._warningShown = true;
            toastManager.show(
                `Storage usage at ${usage.percentage}%. Consider exporting or clearing old data.`,
                { type: 'info', duration: 4000 }
            );
        }

        // Update indicator if it exists
        StorageManager.updateIndicator();
    }

    /**
     * Render storage indicator for THIS tool into a container element
     * Shows only this tool's storage usage, not overall
     * @param {HTMLElement|string} container - Container element or selector
     */
    renderToolIndicator(container) {
        const el = typeof container === 'string' ? document.querySelector(container) : container;
        if (!el) return;

        const bytes = this.getSize();
        const formatted = StorageManager.formatBytes(bytes);

        const indicator = document.createElement('span');
        indicator.id = 'storage-indicator';
        indicator.className = 'storage-indicator';
        indicator.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
            </svg>
            ${formatted}
        `;
        indicator.title = `Storage used by this tool: ${formatted}`;

        el.appendChild(indicator);
    }

    /**
     * Update existing tool-specific storage indicator
     */
    updateToolIndicator() {
        const indicator = document.getElementById('storage-indicator');
        if (!indicator) return;

        const bytes = this.getSize();
        const formatted = StorageManager.formatBytes(bytes);

        indicator.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
            </svg>
            ${formatted}
        `;
        indicator.title = `Storage used by this tool: ${formatted}`;
    }

    /**
     * Render overall storage indicator into a container element (static version)
     * Shows total localStorage usage across all tools
     * @param {HTMLElement|string} container - Container element or selector
     */
    static renderIndicator(container) {
        const el = typeof container === 'string' ? document.querySelector(container) : container;
        if (!el) return;

        const usage = StorageManager.getStorageUsage();
        const indicator = document.createElement('span');
        indicator.id = 'storage-indicator';
        indicator.className = 'storage-indicator';
        if (usage.isDanger) indicator.classList.add('danger');
        else if (usage.isWarning) indicator.classList.add('warning');

        indicator.textContent = `Storage: ${usage.percentage}%`;
        indicator.title = StorageManager.getUsageSummary();

        el.appendChild(indicator);
    }

    /**
     * Update existing overall storage indicator (static version)
     */
    static updateIndicator() {
        const indicator = document.getElementById('storage-indicator');
        if (!indicator) return;

        const usage = StorageManager.getStorageUsage();

        indicator.textContent = `Storage: ${usage.percentage}%`;
        indicator.title = StorageManager.getUsageSummary();

        indicator.classList.remove('warning', 'danger');
        if (usage.isDanger) indicator.classList.add('danger');
        else if (usage.isWarning) indicator.classList.add('warning');
    }

    /**
     * Render storage breakdown modal content
     * @returns {string} HTML string for modal content
     */
    static renderStorageBreakdown() {
        const usage = StorageManager.getStorageUsage();
        const tools = StorageManager.getToolUsage();

        let html = `
            <div class="storage-overview">
                <div class="storage-bar-container">
                    <div class="storage-bar" style="width: ${Math.min(usage.percentage, 100)}%"></div>
                </div>
                <p class="storage-summary">
                    <strong>${usage.usedFormatted}</strong> of ${usage.limitFormatted} used (${usage.percentage}%)
                </p>
            </div>
            <div class="storage-breakdown">
                <h4>Memory Usage by Tool</h4>
                <ul class="storage-list">
        `;

        for (const tool of tools) {
            if (tool.bytes > 0) {
                html += `
                    <li class="storage-item">
                        <span class="storage-tool-name">${tool.name}</span>
                        <span class="storage-tool-size">${tool.formatted}</span>
                    </li>
                `;
            }
        }

        if (tools.every(t => t.bytes === 0)) {
            html += `<li class="storage-item storage-empty">No data stored yet</li>`;
        }

        html += `
                </ul>
            </div>
        `;

        return html;
    }
}

// Session flags for storage warnings (reset on page reload)
StorageManager._warningShown = false;
StorageManager._dangerWarningShown = false;
