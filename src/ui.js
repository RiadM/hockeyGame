// UI Initialization - Solo Mode
import { HockeyGameDashboard } from './game.js';
import { GameEventHandlers } from './ui/EventHandlers.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize event handlers
    const gameEventHandlers = new GameEventHandlers();
    window.gameEventHandlers = gameEventHandlers;

    // Start game directly
    window.multiplayerManager = null;
    window.hockeyGameInstance = new HockeyGameDashboard();
});
