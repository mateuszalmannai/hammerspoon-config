/**
 * ImportExportManager - Reusable data import/export utility
 * Provides JSON and CSV export/import functionality for all decision tools
 */
class ImportExportManager {
    constructor(options = {}) {
        this.appName = options.appName || 'decision-tool';
        this.toastManager = options.toastManager;
        this.onImport = options.onImport; // Callback when data is imported
        this.validateItem = options.validateItem; // Item validation function
        this.getCategoryName = options.getCategoryName; // Map type to readable name
        
        // Default column mappings for CSV import
        const defaultColumnMappings = {
            text: ['text', 'option', 'name', 'name/text'],
            category: ['category'],
            weight: ['weight'],
            type: ['type'],
            impact: ['score/impact', 'impact', 'score'],
            group: ['group'],
            groupName: ['group'],
            wins: ['wins'],
            losses: ['losses'],
            comparisons: ['comparisons'],
            quadrant: ['quadrant']
        };
        
        // Merge custom column mappings with defaults
        this.columnMappings = options.columnMappings 
            ? { ...defaultColumnMappings, ...options.columnMappings }
            : defaultColumnMappings;
        
        // Optional custom CSV row parser
        this.customCsvRowParser = options.customCsvRowParser;
        
        // Initialize logger
        this.logger = new Logger({ 
            prefix: 'ImportExportManager',
            level: 'INFO'
        });
    }

    /**
     * Export data as JSON file
     * @param {Array} items - Items to export
     * @param {Object} metadata - Additional metadata (version, summary, etc.)
     */
    exportToJSON(items, metadata = {}) {
        const exportData = {
            version: metadata.version || 1,
            appName: this.appName,
            exportDate: new Date().toISOString(),
            itemCount: items.length,
            data: items,
            ...metadata
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const filename = `${this.appName}-${this.getDateString()}.json`;

        this.downloadFile(blob, filename);
        
        if (this.toastManager) {
            this.toastManager.show('Data exported to JSON', { type: 'success' });
        }

        return filename;
    }

    /**
     * Export data as CSV file
     * @param {Array} items - Items to export
     * @param {Array} headers - CSV column headers
     * @param {Function} rowMapper - Function to map item to CSV row array
     */
    exportToCSV(items, headers, rowMapper) {
        const rows = items.map(rowMapper);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const filename = `${this.appName}-${this.getDateString()}.csv`;

        this.downloadFile(blob, filename);
        
        if (this.toastManager) {
            this.toastManager.show('Data exported to CSV', { type: 'success' });
        }

        return filename;
    }

    /**
     * Handle file import
     * @param {File} file - File to import
     * @param {Boolean} merge - Whether to merge with existing data or replace
     * @returns {Promise} - Resolves with imported data
     */
    async importFromFile(file) {
        try {
            // Add file size validation (10MB limit)
            const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
            if (file.size > MAX_FILE_SIZE) {
                if (this.toastManager) {
                    this.toastManager.show('File too large. Maximum size is 10MB', { type: 'error' });
                }
                return null;
            }

            const text = await file.text();
            const fileExtension = file.name.split('.').pop().toLowerCase();
            
            let importedData;
            
            // Handle CSV files
            if (fileExtension === 'csv') {
                importedData = this.parseCSV(text);
            } else {
                // Handle JSON files
                importedData = JSON.parse(text);
            }

            // Validate structure
            if (!this.validateImportData(importedData)) {
                if (this.toastManager) {
                    this.toastManager.show('Invalid import file format', { type: 'error' });
                }
                return null;
            }

            // Add item count limit validation
            const MAX_ITEMS = 1000;
            if (importedData.data && importedData.data.length > MAX_ITEMS) {
                if (this.toastManager) {
                    this.toastManager.show(
                        `Too many items (${importedData.data.length}). Maximum is ${MAX_ITEMS}`,
                        { type: 'error' }
                    );
                }
                this.logger.warn(`Import rejected: ${importedData.data.length} items exceeds limit of ${MAX_ITEMS}`);
                return null;
            }

            // Ask user: merge or replace
            const merge = await ModalManager.confirm(
                `Import ${importedData.itemCount || importedData.data.length} items.\n\nClick OK to ADD to existing items.\nClick Cancel to REPLACE all items.`,
                {
                    title: 'Import Data',
                    confirmText: 'Add to Existing',
                    cancelText: 'Replace All'
                }
            );

            // Filter valid items
            const validItems = this.validateItem 
                ? importedData.data.filter(item => this.validateItem(item))
                : importedData.data;

            if (validItems.length === 0) {
                if (this.toastManager) {
                    this.toastManager.show('No valid items to import', { type: 'error' });
                }
                return null;
            }

            const skipped = importedData.data.length - validItems.length;
            if (skipped > 0) {
                this.logger.warn(`Skipped ${skipped} invalid items during import`);
            }

            return {
                items: validItems,
                merge: merge,
                metadata: {
                    version: importedData.version || 1,
                    exportDate: importedData.exportDate,
                    originalCount: importedData.data.length,
                    validCount: validItems.length
                }
            };

        } catch (error) {
            this.logger.error('Import failed:', error);
            console.error('Import error details:', error.message, error.stack);
            if (this.toastManager) {
                this.toastManager.show(`Failed to import file: ${error.message}`, { type: 'error' });
            }
            return null;
        }
    }

    /**
     * Import data directly from JSON object (programmatic import for sample data)
     * @param {Object} jsonData - Data object matching export format
     * @param {Boolean} showConfirm - Whether to show merge/replace confirmation dialog
     * @returns {Promise<Object|null>} Import result object or null on error
     */
    async importFromData(jsonData, showConfirm = true) {
        try {
            // Validate structure
            if (!this.validateImportData(jsonData)) {
                if (this.toastManager) {
                    this.toastManager.show('Invalid data format', { type: 'error' });
                }
                return null;
            }

            // Add item count limit validation
            const MAX_ITEMS = 1000;
            if (jsonData.data && jsonData.data.length > MAX_ITEMS) {
                if (this.toastManager) {
                    this.toastManager.show(
                        `Too many items (${jsonData.data.length}). Maximum is ${MAX_ITEMS}`,
                        { type: 'error' }
                    );
                }
                this.logger.warn(`Import rejected: ${jsonData.data.length} items exceeds limit of ${MAX_ITEMS}`);
                return null;
            }

            // Ask user: merge or replace (if confirmation enabled)
            let merge = false;
            if (showConfirm) {
                const itemCount = jsonData.itemCount || jsonData.data.length;
                merge = await ModalManager.confirm(
                    `Load ${itemCount} sample items.\n\nClick OK to ADD to existing items.\nClick Cancel to REPLACE all items.`,
                    {
                        title: 'Load Sample Data',
                        confirmText: 'Add to Existing',
                        cancelText: 'Replace All'
                    }
                );
            }

            // Filter valid items
            const validItems = this.validateItem
                ? jsonData.data.filter(item => this.validateItem(item))
                : jsonData.data;

            if (validItems.length === 0) {
                if (this.toastManager) {
                    this.toastManager.show('No valid items to import', { type: 'error' });
                }
                return null;
            }

            const skipped = jsonData.data.length - validItems.length;
            if (skipped > 0) {
                this.logger.warn(`Skipped ${skipped} invalid items during import`);
            }

            return {
                items: validItems,
                merge: merge,
                metadata: {
                    version: jsonData.version || 1,
                    exportDate: jsonData.exportDate,
                    originalCount: jsonData.data.length,
                    validCount: validItems.length,
                    source: 'sample-data',
                    title: jsonData.title,
                    description: jsonData.description
                }
            };

        } catch (error) {
            this.logger.error('Import from data failed:', error);
            if (this.toastManager) {
                this.toastManager.show(`Failed to load sample data: ${error.message}`, { type: 'error' });
            }
            return null;
        }
    }

    /**
     * Parse CSV file content into importable data structure
     * @param {String} csvText - CSV file content
     * @returns {Object} - Importable data structure
     */
    parseCSV(csvText) {
        // Use custom CSV parser if provided (for tools with special formats like Decision Matrix)
        if (this.customCsvRowParser) {
            return this.customCsvRowParser(csvText);
        }

        // Default CSV parsing for simple row-based formats
        const lines = csvText.trim().split('\n');

        if (lines.length < 2) {
            throw new Error('CSV file is empty or has no data rows');
        }

        // Parse header row
        const headers = this.parseCSVRow(lines[0]);

        // Parse data rows
        const items = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue; // Skip empty lines

            const values = this.parseCSVRow(lines[i]);
            const item = this.csvRowToItem(headers, values);
            if (item) {
                items.push(item);
            }
        }

        return {
            version: 1,
            data: items,
            itemCount: items.length,
            importDate: new Date().toISOString()
        };
    }

    /**
     * Parse a CSV row handling quoted values
     * @param {String} row - CSV row
     * @returns {Array} - Array of values
     */
    parseCSVRow(row) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            const nextChar = row[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote
                    current += '"';
                    i++; // Skip next quote
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // End of value
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        // Add last value
        values.push(current.trim());

        return values;
    }

    /**
     * Convert CSV row to item object
     * @param {Array} headers - Column headers
     * @param {Array} values - Row values
     * @returns {Object} - Item object
     */
    csvRowToItem(headers, values) {
        // Map headers to expected format (case-insensitive)
        const headerMap = {};
        headers.forEach((header, index) => {
            const normalizedHeader = header.toLowerCase().trim();
            headerMap[normalizedHeader] = index;
        });

        // Helper function to find value by multiple possible column names
        const findValue = (possibleNames) => {
            for (const name of possibleNames) {
                const index = headerMap[name.toLowerCase()];
                if (index !== undefined && values[index]) {
                    return values[index];
                }
            }
            return null;
        };

        // Extract text using configurable column mappings
        const text = findValue(this.columnMappings.text);
        if (!text) {
            this.logger.warn('Skipping CSV row with empty text');
            return null;
        }

        // Start with basic structure
        // Use 'name' if CSV has 'Name' column (for paired comparison), otherwise use 'text'
        const item = {
            id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
            createdAt: new Date().toISOString()
        };
        
        // Determine if this is a paired comparison import (has Name, Wins, Losses columns)
        const hasNameColumn = headerMap.hasOwnProperty('name');
        const hasComparisonColumns = headerMap.hasOwnProperty('wins') || headerMap.hasOwnProperty('losses');
        
        if (hasNameColumn || hasComparisonColumns) {
            // Paired comparison format
            item.name = text;
        } else {
            // PMI/Pareto format
            item.text = text;
        }

        // Add type - check for Pareto 'Type' column first (Group/Item)
        const typeCol = findValue(this.columnMappings.type);
        if (typeCol && typeCol.toLowerCase() === 'group') {
            item.type = 'group';
        } else if (this.columnMappings.category) {
            // PMI-style category mapping
            const category = findValue(this.columnMappings.category) || 'uncategorized';
            const categoryMap = {
                'plus': 'pro',
                'minus': 'con',
                'interesting': 'interesting',
                'uncategorized': 'uncategorized'
            };
            item.type = categoryMap[category.toLowerCase()] || 'uncategorized';
        }

        // Add weight (PMI)
        if (this.columnMappings.weight) {
            const weightValue = findValue(this.columnMappings.weight);
            if (weightValue !== null) {
                item.weight = parseInt(weightValue) || 3;
            }
        }

        // Add impact/score (Pareto)
        if (this.columnMappings.impact) {
            const impactValue = findValue(this.columnMappings.impact);
            if (impactValue !== null && impactValue !== '-') {
                const impact = parseInt(impactValue);
                if (!isNaN(impact)) {
                    item.impact = impact;
                }
            }
        }

        // Add group reference (Pareto)
        if (this.columnMappings.groupName) {
            const groupValue = findValue(this.columnMappings.groupName);
            if (groupValue && groupValue !== '-' && groupValue.toLowerCase() !== 'ungrouped') {
                item.groupName = groupValue;
            }
        }

        // Add comparison results (Paired Comparison)
        if (this.columnMappings.wins) {
            const winsValue = findValue(this.columnMappings.wins);
            if (winsValue !== null && winsValue !== '') {
                const wins = parseInt(winsValue);
                if (!isNaN(wins)) {
                    item.wins = wins;
                }
            }
        }

        if (this.columnMappings.losses) {
            const lossesValue = findValue(this.columnMappings.losses);
            if (lossesValue !== null && lossesValue !== '') {
                const losses = parseInt(lossesValue);
                if (!isNaN(losses)) {
                    item.losses = losses;
                }
            }
        }

        if (this.columnMappings.comparisons) {
            const comparisonsValue = findValue(this.columnMappings.comparisons);
            if (comparisonsValue !== null && comparisonsValue !== '') {
                const comparisons = parseInt(comparisonsValue);
                if (!isNaN(comparisons)) {
                    item.comparisons = comparisons;
                }
            }
        }

        // Add quadrant (Eisenhower Matrix)
        if (this.columnMappings.quadrant) {
            const quadrantValue = findValue(this.columnMappings.quadrant);
            if (quadrantValue) {
                item.quadrant = quadrantValue;
            }
        }

        return item;
    }

    /**
     * Validate import data structure
     */
    validateImportData(data) {
        // Check required structure
        if (!data.data || !Array.isArray(data.data)) {
            this.logger.error('Invalid import data: missing data array');
            return false;
        }

        // If a custom validator is provided, use it for validation
        // This allows tools with special structures (like Decision Matrix) to have custom validation
        if (this.validateItem) {
            const hasValidItems = data.data.some(item => this.validateItem(item));
            if (!hasValidItems) {
                this.logger.error('Invalid import data: no valid items found');
                return false;
            }
            return true;
        }

        // Default validation - at least one item should have required fields
        // Accept both 'text' and 'name' fields for flexibility across different tools
        const hasValidItems = data.data.some(item =>
            item && typeof item === 'object' && item.id && (item.text || item.name)
        );

        if (!hasValidItems) {
            this.logger.error('Invalid import data: no valid items found');
            return false;
        }

        return true;
    }

    /**
     * Escape CSV value and prevent formula injection
     */
    escapeCsvValue(value) {
        if (value === null || value === undefined) return '';
        
        let stringValue = String(value);
        
        // Prevent CSV formula injection - prefix dangerous characters with a single quote
        // Dangerous characters: = + - @ \t \r (could trigger formula evaluation in Excel/Sheets)
        const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];
        if (dangerousChars.some(char => stringValue.startsWith(char))) {
            stringValue = "'" + stringValue;
        }
        
        // Escape quotes and wrap in quotes if contains comma/quote/newline
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        
        return stringValue;
    }

    /**
     * Download file helper
     */
    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();

        // Cleanup
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
    }

    /**
     * Get formatted date string for filenames
     */
    getDateString() {
        return new Date().toISOString().slice(0, 10);
    }

    /**
     * Create backup in localStorage
     * @param {String} backupKey - localStorage key for backups
     * @param {Array} items - Items to backup
     * @param {Number} maxBackups - Maximum number of backups to keep
     */
    createBackup(backupKey, items, maxBackups = 3) {
        try {
            const backupData = {
                timestamp: new Date().toISOString(),
                items: items,
                itemCount: items.length
            };

            // Get existing backups
            const backupsJson = localStorage.getItem(backupKey);
            const backups = backupsJson ? JSON.parse(backupsJson) : [];

            // Add new backup
            backups.unshift(backupData);

            // Keep only maxBackups
            const trimmed = backups.slice(0, maxBackups);

            localStorage.setItem(backupKey, JSON.stringify(trimmed));

            this.logger.info(`Backup created: ${items.length} items`);
            return true;
        } catch (error) {
            this.logger.error('Failed to create backup:', error);
            return false;
        }
    }

    /**
     * Get list of available backups
     * @param {String} backupKey - localStorage key for backups
     */
    getBackups(backupKey) {
        try {
            const backupsJson = localStorage.getItem(backupKey);
            return backupsJson ? JSON.parse(backupsJson) : [];
        } catch (error) {
            this.logger.error('Failed to load backups:', error);
            return [];
        }
    }

    /**
     * Restore from backup
     * @param {String} backupKey - localStorage key for backups
     * @param {Number} index - Index of backup to restore
     */
    restoreBackup(backupKey, index) {
        try {
            const backups = this.getBackups(backupKey);
            
            if (index < 0 || index >= backups.length) {
                throw new Error('Invalid backup index');
            }

            return backups[index].items;
        } catch (error) {
            this.logger.error('Failed to restore backup:', error);
            if (this.toastManager) {
                this.toastManager.show('Failed to restore backup', { type: 'error' });
            }
            return null;
        }
    }
}
