// KeyboardHandler.js - Global keyboard shortcut management
// Provides consistent keyboard navigation across the game

export class KeyboardHandler {
    constructor(callbacks) {
        this.callbacks = callbacks || {};
        this.isEnabled = true;
        this.activeModals = new Set();

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.init();
    }

    init() {
        try {
            document.addEventListener('keydown', this.handleKeyDown);
        } catch (error) {
            console.error('Failed to initialize KeyboardHandler:', error);
        }
    }

    handleKeyDown(event) {
        if (!this.isEnabled) return;

        try {
            const key = event.key;
            const target = event.target;
            const tagName = target.tagName.toLowerCase();

            // Escape key - Close modals (highest priority)
            if (key === 'Escape') {
                event.preventDefault();
                if (this.callbacks.onEscape) {
                    this.callbacks.onEscape();
                }
                return;
            }

            // Don't interfere with typing in input fields for other keys
            const isInputField = tagName === 'input' || tagName === 'textarea';

            // Space key - Get Hint (only if not in input field)
            if (key === ' ' && !isInputField) {
                event.preventDefault();
                if (this.callbacks.onSpace) {
                    this.callbacks.onSpace();
                }
                return;
            }

            // Enter key - Submit guess (works in input field too)
            if (key === 'Enter') {
                event.preventDefault();
                if (this.callbacks.onEnter) {
                    this.callbacks.onEnter();
                }
                return;
            }

            // Tab key - Native browser behavior (focus navigation)
            // No need to prevent default or handle specially
            // Browser handles focus management automatically
        } catch (error) {
            console.error('Error in keyboard handler:', error);
            // Don't rethrow - keyboard shortcuts should fail gracefully
        }
    }

    registerModal(modalElement) {
        if (modalElement) {
            this.activeModals.add(modalElement);
        }
    }

    unregisterModal(modalElement) {
        if (modalElement) {
            this.activeModals.delete(modalElement);
        }
    }

    hasActiveModals() {
        return this.activeModals.size > 0;
    }

    enable() {
        this.isEnabled = true;
    }

    disable() {
        this.isEnabled = false;
    }

    destroy() {
        try {
            document.removeEventListener('keydown', this.handleKeyDown);
            this.activeModals.clear();
        } catch (error) {
            console.error('Error destroying KeyboardHandler:', error);
        }
    }

    updateCallbacks(newCallbacks) {
        try {
            this.callbacks = { ...this.callbacks, ...newCallbacks };
        } catch (error) {
            console.error('Error updating keyboard callbacks:', error);
        }
    }
}
