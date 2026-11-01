/**
 * App-wide Configuration
 * Shared constants and configuration values across all decision tools
 *
 * Usage in tool scripts:
 *   const CONFIG = {
 *       ...APP_CONFIG.COMMON,
 *       ...APP_CONFIG.TOOL_NAME,
 *       // tool-specific overrides if needed
 *   };
 */

const APP_CONFIG = {
    // Common configuration shared by all tools
    COMMON: {
        THEME_KEY: 'theme',
        MAX_ITEM_LENGTH: 500,
        CHAR_WARNING_THRESHOLD: 0.8,  // 80% of max length
        CHAR_DANGER_THRESHOLD: 0.9,   // 90% of max length
        TOAST_DURATION: 3000,
        TOAST_FADE_DURATION: 300,
        MIN_TOUCH_TARGET: 44
    },

    // PMI Tool (Plus/Minus/Interesting)
    PMI: {
        STORAGE_KEY: 'proscons',
        MAX_ITEM_LENGTH: 500,
        WEIGHT_MIN: 1,
        WEIGHT_MAX: 5,
        WEIGHT_DEFAULT: 3,
        CHAR_WARNING_THRESHOLD: 400,
        CHAR_DANGER_THRESHOLD: 450
    },

    // Paired Comparison Tool
    PAIRED_COMPARISON: {
        STORAGE_KEY: 'pairedComparison_v1',
        MAX_OPTIONS: 10,
        MIN_OPTIONS: 2,
        MAX_OPTION_LENGTH: 100,
        COMPARISON_DELAY: 400
    },

    // Decision Matrix Tool
    DECISION_MATRIX: {
        STORAGE_KEY: 'decisionMatrix_v1',
        MAX_OPTIONS: 10,
        MIN_OPTIONS: 2,
        MAX_CRITERIA: 10,
        MIN_CRITERIA: 2,
        MAX_INPUT_LENGTH: 100,
        SCORE_MIN: 1,
        SCORE_MAX: 10,
        WEIGHT_MIN: 1,
        WEIGHT_MAX: 10
    },

    // Eisenhower Matrix Tool
    EISENHOWER: {
        STORAGE_KEY: 'eisenhower_matrix',
        MAX_TASK_LENGTH: 500
    },

    // Risk Analysis Tool
    RISK_ANALYSIS: {
        STORAGE_KEY: 'risk_analysis',
        MAX_RISK_LENGTH: 500,
        DEFAULT_PROBABILITY: 3,
        DEFAULT_IMPACT: 3,
        PROBABILITY_MIN: 1,
        PROBABILITY_MAX: 5,
        IMPACT_MIN: 1,
        IMPACT_MAX: 5
    },

    // Pareto Analysis Tool
    PARETO: {
        STORAGE_KEY: 'pareto_analysis',
        STORAGE_VERSION: 1,
        MAX_ITEM_LENGTH: 500,
        MAX_ITEMS: 50,
        MAX_GROUPS: 10,
        IMPACT_MIN: 1,
        IMPACT_MAX: 10,
        IMPACT_DEFAULT: 5,
        PARETO_THRESHOLD: 80,
        CHART_COLORS: {
            bar: 'rgba(59, 130, 246, 0.8)',
            line: 'rgba(239, 68, 68, 0.8)',
            grid: 'rgba(200, 200, 200, 0.2)'
        }
    },

    // Cost-Benefit Analysis Tool
    COST_BENEFIT: {
        STORAGE_KEY: 'cost_benefit_v1',
        MAX_DESCRIPTION_LENGTH: 200,
        MAX_ITEMS: 100,
        AMOUNT_MIN: 0,
        AMOUNT_MAX: 999999999
    },

    // Backup configuration
    BACKUP: {
        MAX_COUNT: 3,
        KEY_SUFFIX: '_backups'
    },

    // Export configuration
    EXPORT: {
        VERSION: 1,
        MAX_FILE_SIZE: 10 * 1024 * 1024,  // 10MB
        MAX_ITEMS: 1000
    }
};

// Freeze to prevent modification
Object.freeze(APP_CONFIG);
Object.freeze(APP_CONFIG.COMMON);
Object.freeze(APP_CONFIG.PMI);
Object.freeze(APP_CONFIG.PAIRED_COMPARISON);
Object.freeze(APP_CONFIG.DECISION_MATRIX);
Object.freeze(APP_CONFIG.EISENHOWER);
Object.freeze(APP_CONFIG.RISK_ANALYSIS);
Object.freeze(APP_CONFIG.PARETO);
Object.freeze(APP_CONFIG.PARETO.CHART_COLORS);
Object.freeze(APP_CONFIG.COST_BENEFIT);
Object.freeze(APP_CONFIG.BACKUP);
Object.freeze(APP_CONFIG.EXPORT);
