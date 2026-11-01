/**
 * CharacterCounter - Character counting with visual feedback
 * Provides consistent character limit warnings across tools
 */
class CharacterCounter {
    constructor(input, counterElement, options = {}) {
        this.input = input;
        this.counterElement = counterElement;
        this.maxLength = options.maxLength || 500;
        this.warningThreshold = options.warningThreshold || 0.8; // 80%
        this.dangerThreshold = options.dangerThreshold || 0.95;  // 95%
        
        this.input.addEventListener('input', () => this.update());
        this.update();
    }
    
    /**
     * Update counter display and styling
     * @returns {number} Current character count
     */
    update() {
        const length = this.input.value.length;
        this.counterElement.textContent = length;
        
        const percentage = length / this.maxLength;
        
        this.counterElement.classList.remove('warning', 'danger');
        
        if (percentage >= this.dangerThreshold) {
            this.counterElement.classList.add('danger');
        } else if (percentage >= this.warningThreshold) {
            this.counterElement.classList.add('warning');
        }
        
        return length;
    }
    
    /**
     * Reset counter to zero
     */
    reset() {
        this.counterElement.textContent = '0';
        this.counterElement.classList.remove('warning', 'danger');
    }
    
    /**
     * Get current count
     * @returns {number}
     */
    getCount() {
        return this.input.value.length;
    }
}
