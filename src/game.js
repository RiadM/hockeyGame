// Hockey Stats Guessing Game - Redesigned
// Game Flow:
// 1. Start: Show Season + Regular Season stats (all visible)
// 2. Hint 1: Reveal Playoff columns
// 3. Hint 2: Reveal Team column
// 4. Hint 3: Show 4 player names to choose from (multiple choice)

import { GAME_CONFIG } from './config.js';

class HockeyGame {
    constructor() {
        this.score = GAME_CONFIG.INITIAL_SCORE;
        this.hintsUsed = 0;
        this.maxHints = GAME_CONFIG.MAX_HINTS;
        this.hintPenalty = GAME_CONFIG.HINT_PENALTY;
        this.correctGuessBonus = GAME_CONFIG.CORRECT_BONUS;
        this.currentPlayer = null;
        this.correctAnswer = '';
        this.gameWon = false;
        this.multipleChoiceShown = false;

        // Rate limiting
        this.guessTimestamps = [];

        this.init();
    }

    async init() {
        try {
            // Get DOM elements
            this.scoreDisplay = document.querySelector('.score');
            this.playerInput = document.getElementById('player-guess');
            this.guessBtn = document.getElementById('guess-btn');
            this.hintBtn = document.getElementById('hint-btn');
            this.hintsRemaining = document.getElementById('hints-remaining');
            this.messageEl = document.getElementById('game-message');
            this.statsBody = document.getElementById('stats-body');
            this.textInputGroup = document.getElementById('text-input-group');
            this.playerChoicesContainer = document.getElementById('player-choices');

            // Validate critical DOM elements exist
            if (!this.scoreDisplay || !this.playerInput || !this.statsBody) {
                throw new Error('Critical DOM elements missing');
            }

            // Select random player and load game
            await this.selectRandomPlayer();
            this.populateTable();
            this.setupEventListeners();
            this.updateDisplay();
        } catch (error) {
            this.handleFatalError(error);
        }
    }

    handleFatalError(error) {
        console.error('Game initialization failed:', error);
        const gameArea = document.querySelector('.game-area');
        if (gameArea) {
            const errorContainer = document.createElement('div');
            errorContainer.style.cssText = 'text-align: center; padding: 40px;';

            const heading = document.createElement('h2');
            heading.textContent = 'Game Error';

            const message = document.createElement('p');
            message.textContent = 'Unable to load the game. Please refresh the page.';

            const button = document.createElement('button');
            button.textContent = 'Refresh Page';
            button.onclick = () => location.reload();

            errorContainer.appendChild(heading);
            errorContainer.appendChild(message);
            errorContainer.appendChild(button);

            gameArea.innerHTML = '';
            gameArea.appendChild(errorContainer);
        }
    }

    async selectRandomPlayer() {
        try {
            // Lazy load player data
            const { PLAYERS_DATA } = await import('./data.js');

            if (!PLAYERS_DATA || !PLAYERS_DATA.length) {
                throw new Error('No players available');
            }

            const randomIndex = Math.floor(Math.random() * PLAYERS_DATA.length);
            this.currentPlayer = PLAYERS_DATA[randomIndex];
            this.correctAnswer = this.currentPlayer.name.toLowerCase();
        } catch (error) {
            console.error('Failed to load player data:', error);
            this.showMessage('Error: Player data not found. Please check data.js', 'error');
            throw error;
        }
    }

    createStatsRow(season) {
        const row = document.createElement('tr');

        const plusMinus = season.plus_minus !== null && season.plus_minus !== undefined
            ? season.plus_minus
            : '--';

        const cells = [
            { value: season.season, className: '' },
            { value: season.team, className: 'team-col hidden' },
            { value: season.gp, className: '' },
            { value: season.g, className: '' },
            { value: season.a, className: '' },
            { value: season.pts, className: '' },
            { value: season.pim, className: '' },
            { value: plusMinus, className: '' },
            { value: season.playoff_gp || '--', className: 'playoff-col hidden' },
            { value: season.playoff_g || '--', className: 'playoff-col hidden' },
            { value: season.playoff_a || '--', className: 'playoff-col hidden' },
            { value: season.playoff_pts || '--', className: 'playoff-col hidden' },
            { value: season.playoff_pim || '--', className: 'playoff-col hidden' }
        ];

        cells.forEach(({ value, className }) => {
            const cell = document.createElement('td');
            cell.textContent = value; // Safe - auto-escapes
            if (className) cell.className = className;
            row.appendChild(cell);
        });

        return row;
    }

    populateTable() {
        if (!this.currentPlayer) {
            console.error('No player selected');
            return;
        }

        // Filter NHL seasons only
        const nhlSeasons = this.currentPlayer.seasons.filter(s => s.league === 'NHL');

        // Use DocumentFragment for efficient DOM manipulation
        const fragment = document.createDocumentFragment();
        nhlSeasons.forEach(season => {
            fragment.appendChild(this.createStatsRow(season));
        });

        // Clear and append in single operation
        this.statsBody.innerHTML = '';
        this.statsBody.appendChild(fragment);
    }

    setupEventListeners() {
        this.guessBtn.addEventListener('click', () => this.handleGuess());
        this.hintBtn.addEventListener('click', () => this.handleHint());

        this.playerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleGuess();
            }
        });

        // Clear incorrect styling on input
        this.playerInput.addEventListener('input', () => {
            this.playerInput.classList.remove('incorrect', 'correct');
        });
    }

    sanitizeInput(input) {
        if (!input) return '';

        return input
            .trim()
            .toLowerCase()
            .replace(GAME_CONFIG.ALLOWED_INPUT_PATTERN, '') // Only letters, spaces, hyphens, apostrophes
            .substring(0, GAME_CONFIG.MAX_INPUT_LENGTH); // Max length
    }

    isRateLimited() {
        const now = Date.now();
        this.guessTimestamps = this.guessTimestamps.filter(
            t => now - t < GAME_CONFIG.RATE_LIMIT_WINDOW
        );
        return this.guessTimestamps.length >= GAME_CONFIG.MAX_GUESSES_PER_WINDOW;
    }

    handleGuess() {
        if (this.gameWon) {
            this.showMessage('You already won! Refresh to play again.', 'info');
            return;
        }

        // Rate limiting check
        if (this.isRateLimited()) {
            this.showMessage('Too many guesses. Please wait.', 'error');
            return;
        }

        this.guessTimestamps.push(Date.now());

        // Sanitize input
        const guess = this.sanitizeInput(this.playerInput.value);

        if (!guess) {
            this.showMessage('Please enter a valid player name', 'error');
            return;
        }

        if (guess === this.correctAnswer) {
            this.handleCorrectGuess();
        } else {
            this.handleIncorrectGuess();
        }
    }

    handleCorrectGuess() {
        this.gameWon = true;
        this.score += this.correctGuessBonus;

        // Visual feedback
        if (!this.multipleChoiceShown) {
            this.playerInput.classList.add('correct');
            this.playerInput.disabled = true;
            this.guessBtn.disabled = true;
        }
        this.hintBtn.disabled = true;

        // Reveal everything
        this.revealAllColumns();

        // Update display
        this.updateDisplay();

        // Show success message
        const bonusMsg = this.hintsUsed === 0
            ? ` Perfect game! Final score: ${this.score}`
            : ` Final score: ${this.score}`;

        this.showMessage(`Correct! The player was ${this.currentPlayer.name}!${bonusMsg}`, 'success');
    }

    handleIncorrectGuess() {
        this.playerInput.classList.add('incorrect');

        setTimeout(() => {
            this.playerInput.classList.remove('incorrect');
        }, GAME_CONFIG.SHAKE_DURATION);

        this.showMessage('Incorrect! Try again or use a hint.', 'error');
    }

    async handleHint() {
        if (this.gameWon) {
            this.showMessage('You already won!', 'info');
            return;
        }

        if (this.hintsUsed >= this.maxHints) {
            this.showMessage('No more hints available!', 'error');
            return;
        }

        this.hintsUsed++;
        this.score -= this.hintPenalty;

        // Hint 1: Reveal playoffs
        if (this.hintsUsed === 1) {
            this.revealPlayoffs();
            this.showMessage('Playoffs revealed! -20 points', 'info');
        }
        // Hint 2: Reveal team
        else if (this.hintsUsed === 2) {
            this.revealTeam();
            this.showMessage('Team revealed! -20 points', 'info');
        }
        // Hint 3: Show multiple choice
        else if (this.hintsUsed === 3) {
            await this.showMultipleChoice();
            this.showMessage('Choose from 4 players! -20 points', 'info');
            this.hintBtn.disabled = true;
        }

        this.updateDisplay();
    }

    async showMultipleChoice() {
        // Hide text input
        this.textInputGroup.classList.add('hidden');

        // Generate 4 player choices (1 correct + 3 random wrong)
        const choices = await this.generatePlayerChoices();

        // Create buttons using safe DOM methods
        this.playerChoicesContainer.innerHTML = '';
        choices.forEach(playerName => {
            const button = document.createElement('button');
            button.className = 'player-choice-btn';
            button.textContent = playerName; // Safe - auto-escapes
            button.addEventListener('click', () => this.handleMultipleChoiceClick(playerName, button));
            this.playerChoicesContainer.appendChild(button);
        });

        // Show container
        this.playerChoicesContainer.classList.remove('hidden');
        this.multipleChoiceShown = true;
    }

    async generatePlayerChoices() {
        const choices = [this.currentPlayer.name];

        // Get all other player names
        const { PLAYERS_DATA } = await import('./data.js');
        const otherPlayers = PLAYERS_DATA
            .filter(p => p.name !== this.currentPlayer.name)
            .map(p => p.name);

        // Randomly select 3 wrong answers
        while (choices.length < GAME_CONFIG.MULTIPLE_CHOICE_COUNT && otherPlayers.length > 0) {
            const randomIndex = Math.floor(Math.random() * otherPlayers.length);
            choices.push(otherPlayers[randomIndex]);
            otherPlayers.splice(randomIndex, 1);
        }

        // Shuffle array
        for (let i = choices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [choices[i], choices[j]] = [choices[j], choices[i]];
        }

        return choices;
    }

    handleMultipleChoiceClick(playerName, button) {
        if (this.gameWon) {
            return;
        }

        const isCorrect = playerName.toLowerCase() === this.correctAnswer;

        if (isCorrect) {
            button.classList.add('correct-answer');

            // Disable all buttons
            const allButtons = this.playerChoicesContainer.querySelectorAll('.player-choice-btn');
            allButtons.forEach(btn => btn.disabled = true);

            this.handleCorrectGuess();
        } else {
            button.classList.add('wrong-answer');
            button.disabled = true;
            this.showMessage('Incorrect! Try another player.', 'error');
        }
    }

    revealPlayoffs() {
        // Show playoff header
        const playoffHeaders = document.querySelectorAll('.playoffs');
        playoffHeaders.forEach(header => {
            header.classList.remove('hidden');
            header.classList.add('reveal-animation');
        });

        // Show playoff columns
        const playoffCols = document.querySelectorAll('.playoff-col');
        playoffCols.forEach(col => {
            col.classList.remove('hidden');
            col.classList.add('reveal-animation');
        });
    }

    revealTeam() {
        // Show team header
        const teamHeaders = document.querySelectorAll('.team-col');
        teamHeaders.forEach(header => {
            header.classList.remove('hidden');
            header.classList.add('reveal-animation');
        });
    }

    revealAllColumns() {
        this.revealPlayoffs();
        this.revealTeam();
    }

    updateDisplay() {
        this.scoreDisplay.textContent = `Score: ${this.score}`;
        this.hintsRemaining.textContent = this.maxHints - this.hintsUsed;
    }

    showMessage(text, type) {
        this.messageEl.textContent = text;
        this.messageEl.className = `message ${type} show`;

        // Auto-hide after configured timeout for non-success messages
        if (type !== 'success') {
            setTimeout(() => {
                this.messageEl.classList.remove('show');
            }, GAME_CONFIG.MESSAGE_TIMEOUT);
        }
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new HockeyGame();
});
