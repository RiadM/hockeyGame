// EventBus - Centralized event system for decoupling game logic from UI
// Provides pub/sub pattern: emit events from logic, listen in UI

class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * Register event listener
     * @param {string} event - Event name
     * @param {Function} callback - Handler function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }

        const handlers = this.listeners.get(event);
        handlers.push(callback);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Handler to remove
     */
    off(event, callback) {
        if (!this.listeners.has(event)) return;

        const handlers = this.listeners.get(event);
        const index = handlers.indexOf(callback);

        if (index !== -1) {
            handlers.splice(index, 1);
        }

        // Clean up empty event arrays
        if (handlers.length === 0) {
            this.listeners.delete(event);
        }
    }

    /**
     * Emit event to all listeners
     * @param {string} event - Event name
     * @param {*} data - Event payload
     */
    emit(event, data) {
        if (!this.listeners.has(event)) return;

        const handlers = this.listeners.get(event);
        // Clone array to prevent issues if handlers modify listener list
        [...handlers].forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`EventBus error in ${event} handler:`, error);
            }
        });
    }

    /**
     * Register one-time event listener
     * @param {string} event - Event name
     * @param {Function} callback - Handler function
     */
    once(event, callback) {
        const onceWrapper = (data) => {
            callback(data);
            this.off(event, onceWrapper);
        };
        this.on(event, onceWrapper);
    }

    /**
     * Remove all listeners for an event, or all events if no event specified
     * @param {string} [event] - Optional event name
     */
    clear(event) {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }

    /**
     * Get listener count for debugging
     * @param {string} [event] - Optional event name
     * @returns {number} Listener count
     */
    listenerCount(event) {
        if (event) {
            return this.listeners.has(event) ? this.listeners.get(event).length : 0;
        }

        let total = 0;
        for (const handlers of this.listeners.values()) {
            total += handlers.length;
        }
        return total;
    }
}

// Singleton instance for global use
const eventBus = new EventBus();

export { EventBus, eventBus };
