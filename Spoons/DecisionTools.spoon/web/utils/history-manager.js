/**
 * HistoryManager - Manages saved analysis sessions across all tools
 * Allows users to save, view, restore, and delete past decision analyses
 */
class HistoryManager {
    constructor(options = {}) {
        this.storageKey = options.storageKey || 'analysis_history_v1';
        this.maxSessions = options.maxSessions || 50;
        this.autoCleanupDays = options.autoCleanupDays || 90;
        this.version = 1;
    }

    /**
     * Generate a unique session ID
     * @returns {string} Unique ID
     */
    generateId() {
        return `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    }

    /**
     * Get all saved sessions
     * @returns {Array} Array of session objects
     */
    getSessions() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (!data) return [];

            const parsed = JSON.parse(data);
            return parsed.sessions || [];
        } catch (error) {
            console.error('Failed to load history:', error);
            return [];
        }
    }

    /**
     * Get a single session by ID
     * @param {string} sessionId - Session ID to retrieve
     * @returns {Object|null} Session object or null
     */
    getSession(sessionId) {
        const sessions = this.getSessions();
        return sessions.find(s => s.id === sessionId) || null;
    }

    /**
     * Get sessions filtered by tool
     * @param {string} toolName - Tool name to filter by
     * @returns {Array} Filtered sessions
     */
    getSessionsByTool(toolName) {
        const sessions = this.getSessions();
        return sessions.filter(s => s.tool === toolName);
    }

    /**
     * Save a new session
     * @param {Object} sessionData - Session data to save
     * @param {string} sessionData.tool - Tool name (e.g., 'decision-matrix')
     * @param {string} sessionData.title - User-provided title
     * @param {string} sessionData.summary - Brief summary of the analysis
     * @param {Object} sessionData.data - Full tool state snapshot
     * @returns {Object} Saved session object
     */
    saveSession(sessionData) {
        const sessions = this.getSessions();

        const session = {
            id: this.generateId(),
            tool: sessionData.tool,
            title: sessionData.title || 'Untitled Session',
            summary: sessionData.summary || '',
            savedAt: new Date().toISOString(),
            data: sessionData.data
        };

        // Add to beginning (most recent first)
        sessions.unshift(session);

        // Enforce max sessions limit
        if (sessions.length > this.maxSessions) {
            sessions.splice(this.maxSessions);
        }

        this._saveSessions(sessions);
        return session;
    }

    /**
     * Update an existing session
     * @param {string} sessionId - Session ID to update
     * @param {Object} updates - Fields to update
     * @returns {Object|null} Updated session or null if not found
     */
    updateSession(sessionId, updates) {
        const sessions = this.getSessions();
        const index = sessions.findIndex(s => s.id === sessionId);

        if (index === -1) return null;

        // Only allow updating certain fields
        const allowedUpdates = ['title', 'summary'];
        allowedUpdates.forEach(field => {
            if (updates.hasOwnProperty(field)) {
                sessions[index][field] = updates[field];
            }
        });

        sessions[index].updatedAt = new Date().toISOString();
        this._saveSessions(sessions);
        return sessions[index];
    }

    /**
     * Delete a session by ID
     * @param {string} sessionId - Session ID to delete
     * @returns {boolean} True if deleted, false if not found
     */
    deleteSession(sessionId) {
        const sessions = this.getSessions();
        const index = sessions.findIndex(s => s.id === sessionId);

        if (index === -1) return false;

        sessions.splice(index, 1);
        this._saveSessions(sessions);
        return true;
    }

    /**
     * Delete all sessions
     * @returns {number} Number of sessions deleted
     */
    clearAllSessions() {
        const sessions = this.getSessions();
        const count = sessions.length;
        this._saveSessions([]);
        return count;
    }

    /**
     * Delete sessions older than specified days
     * @param {number} days - Age threshold in days
     * @returns {number} Number of sessions deleted
     */
    cleanupOldSessions(days = this.autoCleanupDays) {
        const sessions = this.getSessions();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const filtered = sessions.filter(s => {
            const sessionDate = new Date(s.savedAt);
            return sessionDate > cutoffDate;
        });

        const deletedCount = sessions.length - filtered.length;
        if (deletedCount > 0) {
            this._saveSessions(filtered);
        }

        return deletedCount;
    }

    /**
     * Export sessions to JSON
     * @param {Array} sessionIds - Optional array of session IDs to export (exports all if empty)
     * @returns {Object} Export data object
     */
    exportSessions(sessionIds = []) {
        let sessions = this.getSessions();

        if (sessionIds.length > 0) {
            sessions = sessions.filter(s => sessionIds.includes(s.id));
        }

        return {
            version: this.version,
            exportedAt: new Date().toISOString(),
            sessionCount: sessions.length,
            sessions: sessions
        };
    }

    /**
     * Import sessions from exported data
     * @param {Object} importData - Data from exportSessions
     * @param {boolean} merge - If true, merge with existing; if false, replace all
     * @returns {Object} Import result { imported: number, skipped: number }
     */
    importSessions(importData, merge = true) {
        if (!importData || !importData.sessions) {
            throw new Error('Invalid import data format');
        }

        const existingSessions = merge ? this.getSessions() : [];
        const existingIds = new Set(existingSessions.map(s => s.id));

        let imported = 0;
        let skipped = 0;

        importData.sessions.forEach(session => {
            if (existingIds.has(session.id)) {
                skipped++;
            } else {
                existingSessions.push(session);
                imported++;
            }
        });

        // Sort by date (most recent first)
        existingSessions.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

        // Enforce max limit
        if (existingSessions.length > this.maxSessions) {
            existingSessions.splice(this.maxSessions);
        }

        this._saveSessions(existingSessions);
        return { imported, skipped };
    }

    /**
     * Get storage usage for history
     * @returns {Object} Usage info { bytes, formatted, sessionCount }
     */
    getStorageUsage() {
        const data = localStorage.getItem(this.storageKey);
        const bytes = data ? (this.storageKey.length + data.length) * 2 : 0;
        const sessions = this.getSessions();

        return {
            bytes,
            formatted: StorageManager.formatBytes(bytes),
            sessionCount: sessions.length
        };
    }

    /**
     * Get tool display name
     * @param {string} toolKey - Tool key (e.g., 'decision-matrix')
     * @returns {string} Display name
     */
    static getToolDisplayName(toolKey) {
        const names = {
            'pmi': 'PMI Tool',
            'decision-matrix': 'Decision Matrix',
            'eisenhower-matrix': 'Eisenhower Matrix',
            'paired-comparison': 'Paired Comparison',
            'pareto': 'Pareto Analysis',
            'risk-analysis': 'Risk Analysis'
        };
        return names[toolKey] || toolKey;
    }

    /**
     * Get tool URL
     * @param {string} toolKey - Tool key
     * @returns {string} Tool URL
     */
    static getToolUrl(toolKey) {
        // URLs are relative to history-tool.html which is in tools/ directory
        const urls = {
            'pmi': 'pmi-tool.html',
            'decision-matrix': 'decision-matrix-tool.html',
            'eisenhower-matrix': 'eisenhower-matrix-tool.html',
            'paired-comparison': 'paired-comparison-tool.html',
            'pareto': 'pareto-tool.html',
            'risk-analysis': 'risk-analysis-tool.html'
        };
        return urls[toolKey] || '#';
    }

    /**
     * Save sessions to localStorage
     * @private
     */
    _saveSessions(sessions) {
        const data = {
            version: this.version,
            savedAt: new Date().toISOString(),
            sessions: sessions
        };

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.error('Storage quota exceeded. Consider clearing old sessions.');
            }
            throw error;
        }
    }
}

// Create singleton instance
const historyManager = new HistoryManager();
