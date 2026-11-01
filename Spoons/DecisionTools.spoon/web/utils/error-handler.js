/**
 * Global Error Handler
 * Centralized error handling for uncaught exceptions and unhandled promise rejections
 */
class ErrorHandler {
    constructor(options = {}) {
        this.logger = options.logger || new Logger({ prefix: 'ErrorHandler', level: 'ERROR' });
        this.toastManager = options.toastManager;
        this.appName = options.appName || 'App';
        
        this.initializeHandlers();
    }
    
    /**
     * Initialize global error handlers
     */
    initializeHandlers() {
        // Handle uncaught JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleError(event.error || event.message, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
            
            // Prevent default browser error handling
            event.preventDefault();
        });
        
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handlePromiseRejection(event.reason);
            
            // Prevent default browser handling
            event.preventDefault();
        });
    }
    
    /**
     * Handle a caught error
     * @param {Error|string} error - The error object or message
     * @param {Object} context - Additional context about the error
     */
    handleError(error, context = {}) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : '';
        
        // Log the error with full context
        this.logger.error(`${this.appName} Error:`, {
            message: errorMessage,
            stack: errorStack,
            context: context,
            timestamp: new Date().toISOString()
        });
        
        // Show user-friendly message
        if (this.toastManager) {
            this.toastManager.show('An unexpected error occurred. Please try again.', { 
                type: 'error',
                duration: 5000
            });
        }
        
        // In development, also log to console for debugging
        if (this.isDevelopment()) {
            console.error('Full error details:', error, context);
        }
    }
    
    /**
     * Handle unhandled promise rejection
     * @param {*} reason - The rejection reason
     */
    handlePromiseRejection(reason) {
        const message = reason instanceof Error ? reason.message : String(reason);
        
        this.logger.error(`${this.appName} Unhandled Promise Rejection:`, {
            reason: message,
            stack: reason instanceof Error ? reason.stack : undefined,
            timestamp: new Date().toISOString()
        });
        
        if (this.toastManager) {
            this.toastManager.show('An operation failed. Please try again.', { 
                type: 'error',
                duration: 5000
            });
        }
        
        if (this.isDevelopment()) {
            console.error('Unhandled rejection:', reason);
        }
    }
    
    /**
     * Check if running in development mode
     * @returns {boolean}
     */
    isDevelopment() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.protocol === 'file:';
    }
    
    /**
     * Manually log an error
     * @param {Error|string} error - The error to log
     * @param {Object} context - Additional context
     */
    logError(error, context = {}) {
        this.handleError(error, context);
    }
}
