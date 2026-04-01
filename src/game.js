// Hockey Game - Core controller
// Delegates rendering to UI components, uses GameLogic for pure functions

import { GameState } from './models/GameState.js';
import { KeyboardHandler } from './utils/KeyboardHandler.js';
import { GAME_CONFIG } from './config.js';
import playerService from './services/PlayerService.js';
import { TableRenderer } from './ui/TableRenderer.js';
import { ScoreDisplay } from './ui/ScoreDisplay.js';
import { WinModal } from './ui/WinModal.js';
import { HintTooltip } from './ui/HintTooltip.js';
import { sanitizeInput, isRateLimited } from './logic/GameLogic.js';

class HockeyGameDashboard {
    constructor() {
        this.gameState = new GameState(GAME_CONFIG);
        this.keyboardHandler = null;
        this.tableRenderer = null;
        this.scoreDisplay = null;
        this.winModal = null;
        this.hintTooltip = null;
        this.init();
    }

    async init() {
        try {
            this.playerInput = document.getElementById('player-guess');
            this.guessBtn = document.getElementById('guess-btn');
            this.hintBtn = document.getElementById('hint-btn');
            this.messageEl = document.getElementById('game-message');
            this.sidebarInputGroup = document.getElementById('sidebar-input-group');
            this.hintsCard = document.getElementById('hints-card');
            this.playerChoicesContainer = document.getElementById('player-choices');
            this.scoreInfoBtn = document.getElementById('score-info-btn');
            this.gameInfoModal = document.getElementById('game-info-modal');
            this.gameInfoClose = document.getElementById('game-info-close');
            this.restartBtn = document.getElementById('restart-btn');
            this.roundValue = document.getElementById('round-value');
            this.roundProgressBar = document.getElementById('round-progress-bar');
            this.finalNewGameBtn = document.getElementById('final-new-game-btn');

            const statsBody = document.getElementById('stats-body');
            if (!this.playerInput || !statsBody) {
                throw new Error('Critical DOM elements missing');
            }

            // Initialize UI components
            this.tableRenderer = new TableRenderer({ statsBody });
            this.scoreDisplay = new ScoreDisplay({
                scoreValue: document.getElementById('score-value'),
                scoreProgress: document.getElementById('score-progress'),
                scorePercentage: document.getElementById('score-percentage'),
                scoreDelta: document.getElementById('score-delta')
            });
            this.winModal = new WinModal({
                successModal: document.getElementById('success-modal'),
                successPlayer: document.getElementById('success-player'),
                successScore: document.getElementById('success-score'),
                finalModal: document.getElementById('final-modal'),
                finalYourScore: document.getElementById('final-your-score'),
                finalMaxScore: document.getElementById('final-max-score'),
                finalPercentage: document.getElementById('final-percentage'),
                finalGrade: document.getElementById('final-grade'),
                breakdownList: document.getElementById('breakdown-list')
            });

            this.hintTooltip = new HintTooltip({ hintBtn: this.hintBtn });
            this.hintTooltip.attachListeners(0, this.gameState.maxHints);

            await this.selectRandomPlayer();
            this.tableRenderer.populateTable(this.gameState.currentPlayer);
            this.setupEventListeners();

            this.gameState.setCurrentRound(1);
            this.scoreDisplay.updateScore(this.gameState.score, this.gameState.roundStartScore);
            this.updateRoundDisplay();

            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) loadingScreen.remove();
        } catch (error) {
            this.handleFatalError(error);
        }
    }

    handleFatalError(error) {
        console.error('Game initialization failed:', error);
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.querySelector('.loading-spinner').style.display = 'none';
            const textEl = loadingScreen.querySelector('.loading-text');
            textEl.textContent = 'Failed to load game data.';
            const retryBtn = document.createElement('button');
            retryBtn.textContent = 'Retry';
            retryBtn.className = 'btn btn-primary';
            retryBtn.style.cssText = 'margin-top: 12px; padding: 10px 24px; font-size: 14px;';
            retryBtn.addEventListener('click', () => {
                textEl.textContent = 'Retrying...';
                retryBtn.remove();
                loadingScreen.querySelector('.loading-spinner').style.display = '';
                this.init();
            });
            loadingScreen.querySelector('.loading-content').appendChild(retryBtn);
        }
    }

    async selectRandomPlayer() {
        if (this.gameState.selectedPlayers.length === 0) {
            const players = await playerService.getRandomPlayers(this.gameState.totalRounds);
            this.gameState.setSelectedPlayers(players);
        }
        const playerIndex = this.gameState.currentRound - 1;
        if (playerIndex >= 0 && playerIndex < this.gameState.selectedPlayers.length) {
            this.gameState.setCurrentPlayer(this.gameState.selectedPlayers[playerIndex]);
        } else {
            const randomPlayer = await playerService.getRandomPlayer();
            this.gameState.setCurrentPlayer(randomPlayer);
        }
    }

    setupEventListeners() {
        this.guessBtn.addEventListener('click', () => this.handleGuess());
        this.hintBtn.addEventListener('click', () => this.handleHint());
        this.playerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleGuess();
        });
        this.playerInput.addEventListener('input', () => {
            this.playerInput.classList.remove('incorrect', 'correct');
        });

        this.scoreInfoBtn.addEventListener('click', () => {
            this.gameInfoModal.classList.add('show');
        });
        this.gameInfoClose.addEventListener('click', () => this.closeAllModals());
        this.gameInfoModal.addEventListener('click', (e) => {
            if (e.target === this.gameInfoModal) this.gameInfoModal.classList.remove('show');
        });

        this.restartBtn.addEventListener('click', () => this.resetGame());
        this.finalNewGameBtn.addEventListener('click', () => {
            this.winModal.hideFinalModal();
            this.resetGame();
        });

        this.keyboardHandler = new KeyboardHandler({
            onSpace: () => this.handleHint(),
            onEnter: () => this.handleGuess(),
            onEscape: () => this.closeAllModals()
        });
    }

    closeAllModals() {
        if (this.gameInfoModal) this.gameInfoModal.classList.remove('show');
        this.winModal.hideFinalModal();
    }

    updateRoundDisplay() {
        this.roundValue.textContent = `${this.gameState.currentRound} / ${this.gameState.totalRounds}`;
        const pct = (this.gameState.currentRound / this.gameState.totalRounds) * 100;
        this.roundProgressBar.style.width = `${pct}%`;
    }

    handleGuess() {
        if (this.gameState.gameWon) {
            this.showMessage('You already won! Use New Game to play again.', 'info');
            return;
        }
        if (isRateLimited(this.gameState.guessTimestamps, Date.now())) {
            this.showMessage('Too many guesses. Please wait.', 'error');
            return;
        }

        this.gameState.addGuessTimestamp(Date.now());
        const guess = sanitizeInput(this.playerInput.value);

        if (!guess) {
            this.showMessage('Please enter a valid player name', 'error');
            return;
        }

        if (guess === this.gameState.correctAnswer) {
            this.handleCorrectGuess();
        } else {
            this.handleIncorrectGuess();
        }
    }

    handleCorrectGuess() {
        this.gameState.setGameWon(true);
        const delta = GAME_CONFIG.CORRECT_BONUS;
        const newScore = this.gameState.score + delta;

        this.gameState.addRoundHistory({
            round: this.gameState.currentRound,
            player: this.gameState.currentPlayer.name,
            startScore: this.gameState.roundStartScore,
            endScore: newScore,
            hintsUsed: this.gameState.hintsUsed,
            pointsGained: delta
        });

        this.scoreDisplay.animateScoreChange(
            this.gameState.score, newScore, delta,
            this.gameState.roundStartScore,
            () => { this.gameState.setScore(newScore); }
        );
        this.tableRenderer.revealAllColumns();
        this.winModal.showConfetti();
        this.showMessage(`Correct! It's ${this.gameState.currentPlayer.name}! +${delta} pts`, 'success');

        if (this.gameState.currentRound < this.gameState.totalRounds) {
            setTimeout(() => this.loadNextPlayer(), 2000);
        } else {
            this.saveHighScore(newScore);
            setTimeout(() => {
                this.winModal.showFinalModal(
                    newScore,
                    this.gameState.maxPossibleScore,
                    this.gameState.roundHistory
                );
            }, 2000);
        }
    }

    async loadNextPlayer() {
        this.gameState.incrementRound();
        this.updateRoundDisplay();
        this.gameState.resetForNewRound();
        this.resetRoundUI();

        await this.selectRandomPlayer();
        this.tableRenderer.populateTable(this.gameState.currentPlayer);
        this.tableRenderer.hideAllColumns();
        this.messageEl.classList.remove('show');
        this.scoreDisplay.updateScore(this.gameState.score, this.gameState.roundStartScore);
        this.focusInput();
    }

    resetRoundUI() {
        this.playerInput.value = '';
        this.playerInput.classList.remove('correct', 'incorrect');
        this.playerInput.disabled = false;
        this.guessBtn.disabled = false;
        this.hintBtn.disabled = false;
        this.hintsCard.classList.remove('hidden');
        this.sidebarInputGroup.classList.remove('hidden');
        this.playerChoicesContainer.classList.add('hidden');

        for (let i = 1; i <= 3; i++) {
            const dot = document.getElementById(`hint-dot-${i}`);
            if (dot) dot.classList.remove('used');
        }
        this.updateHintButtonText();
    }

    async resetGame() {
        this.closeAllModals();
        this.gameState.reset();
        this.gameState.setCurrentRound(1);
        this.resetRoundUI();
        this.messageEl.classList.remove('show');
        this.gameState.setSelectedPlayers([]);
        this.scoreDisplay.reset();

        await this.selectRandomPlayer();
        this.tableRenderer.populateTable(this.gameState.currentPlayer);
        this.tableRenderer.hideAllColumns();
        this.scoreDisplay.updateScore(this.gameState.score, this.gameState.roundStartScore);
        this.updateRoundDisplay();
        this.focusInput();
        this.showMessage('New game started!', 'info');
    }

    focusInput() {
        if (this.playerInput && !this.playerInput.disabled) {
            setTimeout(() => this.playerInput.focus(), 100);
        }
    }

    handleIncorrectGuess() {
        this.playerInput.classList.add('incorrect');
        setTimeout(() => this.playerInput.classList.remove('incorrect'), GAME_CONFIG.SHAKE_DURATION);
        this.showMessage('Incorrect! Try again or use a hint.', 'error');
    }

    async handleHint() {
        if (this.gameState.gameWon) {
            this.showMessage('You already won!', 'info');
            return;
        }
        if (this.gameState.hintsUsed >= this.gameState.maxHints) {
            this.showMessage('No more hints available!', 'error');
            return;
        }

        this.gameState.incrementHintsUsed();
        const delta = -GAME_CONFIG.HINT_PENALTY;
        const newScore = this.gameState.score + delta;

        const hintDot = document.getElementById(`hint-dot-${this.gameState.hintsUsed}`);
        if (hintDot) hintDot.classList.add('used');

        this.scoreDisplay.animateScoreChange(
            this.gameState.score, newScore, delta,
            this.gameState.roundStartScore,
            () => { this.gameState.setScore(newScore); }
        );

        if (this.gameState.hintsUsed === 1) {
            this.tableRenderer.revealPlayoffs();
            this.showMessage('Playoffs revealed! -20 points', 'info');
        } else if (this.gameState.hintsUsed === 2) {
            this.tableRenderer.revealTeam();
            this.showMessage('Team revealed! -20 points', 'info');
        } else if (this.gameState.hintsUsed === 3) {
            await this.showMultipleChoice();
            this.showMessage('Choose from 4 players! -20 points', 'info');
            this.hintBtn.disabled = true;
        }
        this.updateHintButtonText();
    }

    updateHintButtonText() {
        const cost = GAME_CONFIG.HINT_PENALTY;
        const texts = [`Hint (-${cost}): Playoffs`, `Hint (-${cost}): Teams`, `Hint (-${cost}): 4 Choices`];
        this.hintBtn.textContent = this.gameState.hintsUsed < this.gameState.maxHints
            ? texts[this.gameState.hintsUsed] : 'No Hints Left';
        if (this.hintTooltip) {
            this.hintTooltip.attachListeners(this.gameState.hintsUsed, this.gameState.maxHints);
        }
    }

    async showMultipleChoice() {
        this.hintsCard.classList.add('hidden');
        this.sidebarInputGroup.classList.add('hidden');

        const choices = await this.generatePlayerChoices();
        this.playerChoicesContainer.textContent = '';

        choices.forEach(playerName => {
            const button = document.createElement('button');
            button.className = 'player-choice-btn';
            button.textContent = playerName;
            button.addEventListener('click', () => this.handleMultipleChoiceClick(playerName, button));
            this.playerChoicesContainer.appendChild(button);
        });

        this.playerChoicesContainer.classList.remove('hidden');
        this.gameState.setMultipleChoiceShown(true);
    }

    async generatePlayerChoices() {
        const choices = [this.gameState.currentPlayer.name];
        const allPlayerInfo = await playerService.getAllPlayerInfo();
        const otherPlayers = allPlayerInfo
            .filter(p => p.name !== this.gameState.currentPlayer.name)
            .map(p => p.name);

        while (choices.length < GAME_CONFIG.MULTIPLE_CHOICE_COUNT && otherPlayers.length > 0) {
            const idx = Math.floor(Math.random() * otherPlayers.length);
            choices.push(otherPlayers[idx]);
            otherPlayers.splice(idx, 1);
        }

        for (let i = choices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [choices[i], choices[j]] = [choices[j], choices[i]];
        }
        return choices;
    }

    handleMultipleChoiceClick(playerName, button) {
        if (this.gameState.gameWon) return;

        if (playerName.toLowerCase() === this.gameState.correctAnswer) {
            button.classList.add('correct-answer');
            this.playerChoicesContainer.querySelectorAll('.player-choice-btn')
                .forEach(btn => { btn.disabled = true; });
            this.handleCorrectGuess();
        } else {
            const delta = -GAME_CONFIG.WRONG_CHOICE_PENALTY;
            const newScore = this.gameState.score + delta;
            this.scoreDisplay.animateScoreChange(
                this.gameState.score, newScore, delta,
                this.gameState.roundStartScore,
                () => { this.gameState.setScore(newScore); }
            );
            button.classList.add('wrong-answer');
            button.disabled = true;
            this.showMessage('Incorrect! -10 pts', 'error');
        }
    }

    showMessage(text, type) {
        this.messageEl.textContent = text;
        this.messageEl.className = `message ${type} show`;
        if (type !== 'success') {
            setTimeout(() => this.messageEl.classList.remove('show'), GAME_CONFIG.MESSAGE_TIMEOUT);
        }
    }

    saveHighScore(score) {
        try {
            const stored = JSON.parse(localStorage.getItem('hockeyGameHighScores') || '[]');
            stored.push({ score, date: new Date().toISOString(), rounds: this.gameState.totalRounds });
            stored.sort((a, b) => b.score - a.score);
            localStorage.setItem('hockeyGameHighScores', JSON.stringify(stored.slice(0, 10)));
        } catch (e) { /* localStorage unavailable */ }
    }

    getHighScores() {
        try {
            return JSON.parse(localStorage.getItem('hockeyGameHighScores') || '[]');
        } catch (e) { return []; }
    }
}

export { HockeyGameDashboard };
