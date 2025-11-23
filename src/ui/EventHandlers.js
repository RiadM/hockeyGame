// UI Event Handlers - Listen to game events and update DOM
// Demonstrates decoupling: game logic emits events, UI listens and responds

import { eventBus } from '../utils/EventBus.js';

class GameEventHandlers {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Score changes
        eventBus.on('scoreChanged', (data) => {
            // UI can update analytics, triggers, effects here
        });

        // Hint usage
        eventBus.on('hintUsed', (data) => {
            // UI can show hint animations, update hint counter displays
        });

        // Player guessed
        eventBus.on('playerGuessed', (data) => {
            if (data.correct) {
                // UI can trigger confetti, celebration animations
                this.triggerCelebration(data);
            } else {
                // UI can show shake animations, error effects
                this.triggerErrorEffect();
            }
        });

        // Round changes
        eventBus.on('roundComplete', (data) => {
            // UI can show round summary, transition animations
        });

        eventBus.on('roundStart', (data) => {
            // UI can show round intro, reset animations
        });

        eventBus.on('roundChanged', (data) => {
            // UI can update progress indicators
        });

        // Game complete
        eventBus.on('gameComplete', (data) => {
            // UI can show final stats, leaderboard updates
            this.showGameStats(data);
        });
    }

    triggerCelebration(data) {
        // Example: Could add confetti, sound effects, animations
    }

    triggerErrorEffect() {
        // Example: Could add shake effect, error sound
    }

    showGameStats(data) {
        // Example: Could display detailed analytics
    }

    /**
     * Cleanup all event listeners to prevent memory leaks
     */
    destroy() {
        eventBus.clear();
    }
}

export { GameEventHandlers };
