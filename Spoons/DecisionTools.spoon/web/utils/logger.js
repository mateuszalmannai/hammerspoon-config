/**
 * Logger - Configurable logging utility
 * Provides environment-aware logging with different levels
 */
class Logger {
    constructor(options = {}) {
        this.enabled = options.enabled ?? true;
        this.level = options.level || 'info'; // debug, info, warn, error
        this.prefix = options.prefix || '';
        
        // Log levels in order of severity
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
    }

    /**
     * Check if message should be logged based on current level
     */
    shouldLog(messageLevel) {
        return this.levels[messageLevel] >= this.levels[this.level];
    }

    /**
     * Format message with prefix and timestamp
     */
    formatMessage(level, message) {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const prefix = this.prefix ? `[${this.prefix}] ` : '';
        return `[${timestamp}] ${prefix}[${level.toUpperCase()}] ${message}`;
    }

    /**
     * Log debug message
     * @param {string} message - Message to log
     * @param {...any} args - Additional arguments
     */
    debug(message, ...args) {
        if (this.enabled && this.shouldLog('debug')) {
            console.debug(this.formatMessage('debug', message), ...args);
        }
    }

    /**
     * Log info message
     * @param {string} message - Message to log
     * @param {...any} args - Additional arguments
     */
    info(message, ...args) {
        if (this.enabled && this.shouldLog('info')) {
            console.info(this.formatMessage('info', message), ...args);
        }
    }

    /**
     * Log warning message
     * @param {string} message - Message to log
     * @param {...any} args - Additional arguments
     */
    warn(message, ...args) {
        if (this.enabled && this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message), ...args);
        }
    }

    /**
     * Log error message
     * @param {string} message - Message to log
     * @param {...any} args - Additional arguments
     */
    error(message, ...args) {
        if (this.enabled && this.shouldLog('error')) {
            console.error(this.formatMessage('error', message), ...args);
        }
    }

    /**
     * Enable logging
     */
    enable() {
        this.enabled = true;
    }

    /**
     * Disable logging
     */
    disable() {
        this.enabled = false;
    }

    /**
     * Set logging level
     * @param {string} level - debug, info, warn, or error
     */
    setLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.level = level;
        } else {
            console.warn(`Invalid log level: ${level}. Using 'info' instead.`);
            this.level = 'info';
        }
    }

    /**
     * Get or create a named logger instance
     * Loggers are cached so the same instance is returned for the same name
     * @param {string} name - Logger name/prefix (e.g., 'DecisionMatrix', 'PMI')
     * @returns {Logger} Logger instance
     */
    static getLogger(name) {
        if (!Logger._loggers) {
            Logger._loggers = {};
        }

        if (!Logger._loggers[name]) {
            Logger._loggers[name] = new Logger({
                enabled: Logger._globalEnabled,
                level: Logger._globalLevel,
                prefix: name
            });
        }

        return Logger._loggers[name];
    }

    /**
     * Set global logging level for all loggers
     * @param {string} level - debug, info, warn, or error
     */
    static setGlobalLevel(level) {
        Logger._globalLevel = level;
        // Update all existing loggers
        if (Logger._loggers) {
            Object.values(Logger._loggers).forEach(logger => {
                logger.setLevel(level);
            });
        }
    }

    /**
     * Enable or disable all loggers globally
     * @param {boolean} enabled - Whether logging is enabled
     */
    static setGlobalEnabled(enabled) {
        Logger._globalEnabled = enabled;
        // Update all existing loggers
        if (Logger._loggers) {
            Object.values(Logger._loggers).forEach(logger => {
                logger.enabled = enabled;
            });
        }
    }

    /**
     * Get all registered logger names
     * @returns {string[]} Array of logger names
     */
    static getLoggerNames() {
        return Logger._loggers ? Object.keys(Logger._loggers) : [];
    }
}

// Static properties for global configuration
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
Logger._loggers = {};
Logger._globalEnabled = true;
Logger._globalLevel = isDevelopment ? 'debug' : 'warn';

// Create default app logger (for backwards compatibility)
const appLogger = Logger.getLogger('App');
