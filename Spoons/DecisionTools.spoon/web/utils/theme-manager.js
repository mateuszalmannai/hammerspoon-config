/**
 * ThemeManager - Centralized theme management utility
 * Handles dark/light mode toggling with system preference detection
 */
class ThemeManager {
    constructor(themeKey = 'theme') {
        this.themeKey = themeKey;
        this.themeToggle = document.getElementById('theme-toggle');
    }
    
    /**
     * Load theme from localStorage or system preference
     */
    loadTheme() {
        const savedTheme = localStorage.getItem(this.themeKey);
        const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'light' || (savedTheme === null && !prefersDark)) {
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark-mode');
        }
        
        this.updateToggleLabel();
    }
    
    /**
     * Toggle between dark and light mode
     * @returns {boolean} true if dark mode is now active
     */
    toggleTheme() {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        document.body.classList.toggle('light-mode');
        localStorage.setItem(this.themeKey, isDarkMode ? 'dark' : 'light');
        this.updateToggleLabel();
        return isDarkMode;
    }
    
    /**
     * Update the theme toggle button aria-label
     * @private
     */
    updateToggleLabel() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        if (this.themeToggle) {
            this.themeToggle.setAttribute('aria-label', 
                isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'
            );
        }
    }
    
    /**
     * Get current theme
     * @returns {string} 'dark' or 'light'
     */
    getCurrentTheme() {
        return document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    }
}
