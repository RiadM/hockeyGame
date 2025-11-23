// HintTooltip - Displays hint information with cost preview
// Shows what each hint reveals and the point penalty

export class HintTooltip {
    constructor(elements) {
        this.hintBtn = elements.hintBtn;
        this.tooltip = null;
        this.mouseEnterHandler = null;
        this.mouseLeaveHandler = null;
        this.createTooltip();
    }

    createTooltip() {
        // Create tooltip element if it doesn't exist
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'hint-tooltip';
        this.tooltip.style.cssText = `
            position: absolute;
            background: linear-gradient(135deg, #0e7490 0%, #0891b2 100%);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            white-space: nowrap;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
            z-index: 1000;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;
        document.body.appendChild(this.tooltip);
    }

    // Show tooltip with hint info
    showTooltip(hintNumber, cost, description) {
        if (!this.hintBtn || !this.tooltip) return;

        const rect = this.hintBtn.getBoundingClientRect();
        this.tooltip.textContent = `${description} (-${cost} pts)`;

        // Position above button
        this.tooltip.style.left = `${rect.left + rect.width / 2}px`;
        this.tooltip.style.top = `${rect.top - 10}px`;
        this.tooltip.style.transform = 'translate(-50%, -100%)';
        this.tooltip.style.opacity = '1';
    }

    // Hide tooltip
    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.style.opacity = '0';
        }
    }

    // Update hint button text
    updateHintButtonText(hintsUsed, maxHints) {
        const hintTexts = [
            'Hint (-20): Playoffs',
            'Hint (-20): Teams',
            'Hint (-20): 4 Choices'
        ];

        if (hintsUsed < maxHints) {
            this.hintBtn.textContent = hintTexts[hintsUsed];
        } else {
            this.hintBtn.textContent = 'No Hints Left';
        }
    }

    // Attach hover listeners for tooltip
    attachListeners(hintsUsed, maxHints) {
        if (!this.hintBtn) return;

        const hintDescriptions = [
            'Reveal playoff stats',
            'Reveal team names',
            'Show 4 player choices'
        ];

        // Remove old listeners if they exist
        this.removeListeners();

        // Create and store new listeners
        this.mouseEnterHandler = () => {
            if (hintsUsed < maxHints) {
                this.showTooltip(hintsUsed + 1, 20, hintDescriptions[hintsUsed]);
            }
        };

        this.mouseLeaveHandler = () => {
            this.hideTooltip();
        };

        this.hintBtn.addEventListener('mouseenter', this.mouseEnterHandler);
        this.hintBtn.addEventListener('mouseleave', this.mouseLeaveHandler);
    }

    // Remove event listeners
    removeListeners() {
        if (this.hintBtn && this.mouseEnterHandler) {
            this.hintBtn.removeEventListener('mouseenter', this.mouseEnterHandler);
            this.hintBtn.removeEventListener('mouseleave', this.mouseLeaveHandler);
        }
    }

    // Cleanup
    destroy() {
        this.removeListeners();
        if (this.tooltip && this.tooltip.parentNode) {
            this.tooltip.parentNode.removeChild(this.tooltip);
        }
    }
}
