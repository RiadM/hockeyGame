// Hockey Game Logic - Core game mechanics
// Handles scoring, hints, guessing, round progression

import { GameState } from './models/GameState.js';
import { eventBus } from './utils/EventBus.js';
import { KeyboardHandler } from './utils/KeyboardHandler.js';

const GAME_CONFIG = {
    INITIAL_SCORE: 100,
    HINT_PENALTY: 20,
    CORRECT_BONUS: 50,
    WRONG_CHOICE_PENALTY: 10,
    MAX_HINTS: 3,
    MAX_ROUNDS: 5,
    TOTAL_ROUNDS: 5,
    ALLOWED_INPUT_PATTERN: /[^a-z\s'-]/gi,
    MAX_INPUT_LENGTH: 100,
    RATE_LIMIT_WINDOW: 1000,
    MAX_GUESSES_PER_WINDOW: 10,
    MESSAGE_TIMEOUT: 4000,
    SHAKE_DURATION: 600
};

class HockeyGameDashboard {
            constructor() {
                // Centralized state management
                this.gameState = new GameState(GAME_CONFIG);
                this.playersData = null;
                this.keyboardHandler = null;

                this.init();
            }

            async init() {
                try {
                    this.scoreValue = document.getElementById('score-value');
                    this.scoreProgress = document.getElementById('score-progress');
                    this.scorePercentage = document.getElementById('score-percentage');
                    this.scoreDelta = document.getElementById('score-delta');
                    this.playerInput = document.getElementById('player-guess');
                    this.guessBtn = document.getElementById('guess-btn');
                    this.hintBtn = document.getElementById('hint-btn');
                    this.messageEl = document.getElementById('game-message');
                    this.statsBody = document.getElementById('stats-body');
                    this.sidebarInputGroup = document.getElementById('sidebar-input-group');
                    this.hintsCard = document.getElementById('hints-card');
                    this.playerChoicesContainer = document.getElementById('player-choices');
                    this.scoreInfoBtn = document.getElementById('score-info-btn');
                    this.gameInfoModal = document.getElementById('game-info-modal');
                    this.gameInfoClose = document.getElementById('game-info-close');
                    this.restartBtn = document.getElementById('restart-btn');
                    this.successModal = document.getElementById('success-modal');
                    this.successPlayer = document.getElementById('success-player');
                    this.successScore = document.getElementById('success-score');
                    this.roundValue = document.getElementById('round-value');
                    this.roundProgressBar = document.getElementById('round-progress-bar');
                    this.finalModal = document.getElementById('final-modal');
                    this.finalContent = document.getElementById('final-content');
                    this.finalYourScore = document.getElementById('final-your-score');
                    this.finalMaxScore = document.getElementById('final-max-score');
                    this.finalPercentage = document.getElementById('final-percentage');
                    this.finalGrade = document.getElementById('final-grade');
                    this.breakdownList = document.getElementById('breakdown-list');
                    this.finalNewGameBtn = document.getElementById('final-new-game-btn');

                    if (!this.scoreValue || !this.playerInput || !this.statsBody) {
                        throw new Error('Critical DOM elements missing');
                    }

                    await this.selectRandomPlayer();
                    this.populateTable();
                    this.setupEventListeners();

                    // Initialize to round 1
                    this.gameState.setCurrentRound(1);
                    this.updateScoreDisplay(true);
                    this.updateRoundDisplay();
                } catch (error) {
                    this.handleFatalError(error);
                }
            }

            handleFatalError(error) {
                console.error('Game initialization failed:', error);
                alert('Game initialization failed. Please refresh the page.');
            }

            async selectRandomPlayer() {
                try {
                    if (!this.playersData) {
                        const { PLAYERS_DATA } = await import('./data.js');
                        this.playersData = PLAYERS_DATA;
                    }

                    if (!this.playersData || !this.playersData.length) {
                        throw new Error('No players available');
                    }

                    // If no players selected yet, pre-select 5 unique players
                    if (this.gameState.selectedPlayers.length === 0) {
                        this.preSelectPlayers();
                    }

                    // Use current round index to get player (0-indexed)
                    const playerIndex = this.gameState.currentRound - 1;
                    if (playerIndex >= 0 && playerIndex < this.gameState.selectedPlayers.length) {
                        this.gameState.setCurrentPlayer(this.gameState.selectedPlayers[playerIndex]);
                    } else {
                        // Fallback to random if something goes wrong
                        const randomIndex = Math.floor(Math.random() * this.playersData.length);
                        this.gameState.setCurrentPlayer(this.playersData[randomIndex]);
                    }
                } catch (error) {
                    console.error('Failed to load player data:', error);
                    throw error;
                }
            }

            preSelectPlayers() {
                // Shuffle all players and pick first 5
                const shuffled = [...this.playersData].sort(() => Math.random() - 0.5);
                this.gameState.setSelectedPlayers(shuffled.slice(0, this.gameState.totalRounds));
            }

            createStatsRow(season) {
                const row = document.createElement('tr');
                const plusMinus = season.plus_minus !== null && season.plus_minus !== undefined
                    ? season.plus_minus : '--';

                // Add league-based class to row for styling
                if (season.league === 'NHL') {
                    row.classList.add('nhl-row');
                } else {
                    row.classList.add('junior-row');
                }

                const cells = [
                    { value: season.season, className: '' },
                    { value: season.league, className: 'league-col' },
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
                    cell.textContent = value;
                    if (className) cell.className = className;
                    row.appendChild(cell);
                });

                return row;
            }

            populateTable() {
                if (!this.gameState.currentPlayer) return;
                const allSeasons = this.gameState.currentPlayer.seasons
                    .sort((a, b) => a.season.localeCompare(b.season));
                const fragment = document.createDocumentFragment();
                allSeasons.forEach(season => {
                    fragment.appendChild(this.createStatsRow(season));
                });
                this.statsBody.innerHTML = '';
                this.statsBody.appendChild(fragment);
            }

            setupEventListeners() {
                try {
                    // Button click handlers with error boundaries
                    this.guessBtn.addEventListener('click', () => {
                        try {
                            this.handleGuess();
                        } catch (error) {
                            this.handleError('Failed to process guess', error);
                        }
                    });

                    this.hintBtn.addEventListener('click', () => {
                        try {
                            this.handleHint();
                        } catch (error) {
                            this.handleError('Failed to show hint', error);
                        }
                    });

                    this.playerInput.addEventListener('keypress', (e) => {
                        try {
                            if (e.key === 'Enter') this.handleGuess();
                        } catch (error) {
                            this.handleError('Failed to process guess', error);
                        }
                    });

                    this.playerInput.addEventListener('input', () => {
                        try {
                            this.playerInput.classList.remove('incorrect', 'correct');
                        } catch (error) {
                            console.error('Input handler error:', error);
                        }
                    });

                    // Modal handlers with error boundaries
                    this.scoreInfoBtn.addEventListener('click', () => {
                        try {
                            this.gameInfoModal.classList.add('show');
                        } catch (error) {
                            this.handleError('Failed to open modal', error);
                        }
                    });

                    this.gameInfoClose.addEventListener('click', () => {
                        try {
                            this.closeAllModals();
                        } catch (error) {
                            this.handleError('Failed to close modal', error);
                        }
                    });

                    this.gameInfoModal.addEventListener('click', (e) => {
                        try {
                            if (e.target === this.gameInfoModal) {
                                this.gameInfoModal.classList.remove('show');
                            }
                        } catch (error) {
                            this.handleError('Failed to close modal', error);
                        }
                    });

                    // Restart button with error boundary
                    this.restartBtn.addEventListener('click', () => {
                        try {
                            this.resetGame();
                        } catch (error) {
                            this.handleError('Failed to reset game', error);
                        }
                    });

                    // Final modal New Game button with error boundary
                    this.finalNewGameBtn.addEventListener('click', () => {
                        try {
                            this.finalModal.classList.remove('show');
                            this.resetGame();
                        } catch (error) {
                            this.handleError('Failed to start new game', error);
                        }
                    });

                    // Initialize keyboard handler
                    this.keyboardHandler = new KeyboardHandler({
                        onSpace: () => {
                            try {
                                this.handleHint();
                            } catch (error) {
                                this.handleError('Failed to show hint', error);
                            }
                        },
                        onEnter: () => {
                            try {
                                this.handleGuess();
                            } catch (error) {
                                this.handleError('Failed to process guess', error);
                            }
                        },
                        onEscape: () => {
                            try {
                                this.closeAllModals();
                            } catch (error) {
                                this.handleError('Failed to close modals', error);
                            }
                        }
                    });
                } catch (error) {
                    console.error('Failed to setup event listeners:', error);
                    this.handleFatalError(error);
                }
            }

            closeAllModals() {
                try {
                    if (this.gameInfoModal) {
                        this.gameInfoModal.classList.remove('show');
                    }
                    if (this.finalModal) {
                        this.finalModal.classList.remove('show');
                    }
                } catch (error) {
                    console.error('Error closing modals:', error);
                }
            }

            handleError(message, error) {
                console.error(message, error);
                this.showMessage(message + '. Please try again.', 'error');
            }

            updateRoundDisplay() {
                this.roundValue.textContent = `${this.gameState.currentRound} / ${this.gameState.totalRounds}`;

                // Update overall progress bar
                const progressPercentage = (this.gameState.currentRound / this.gameState.totalRounds) * 100;
                this.roundProgressBar.style.width = `${progressPercentage}%`;
            }

            sanitizeInput(input) {
                if (!input) return '';
                return input.trim().toLowerCase()
                    .replace(GAME_CONFIG.ALLOWED_INPUT_PATTERN, '')
                    .substring(0, GAME_CONFIG.MAX_INPUT_LENGTH);
            }

            isRateLimited() {
                const now = Date.now();
                this.gameState.clearGuessTimestamps(now - GAME_CONFIG.RATE_LIMIT_WINDOW);
                return this.gameState.guessTimestamps.length >= GAME_CONFIG.MAX_GUESSES_PER_WINDOW;
            }

            handleGuess() {
                try {
                    if (this.gameState.gameWon) {
                        this.showMessage('You already won! Use New Game to play again.', 'info');
                        return;
                    }

                    if (this.isRateLimited()) {
                        this.showMessage('Too many guesses. Please wait.', 'error');
                        return;
                    }

                    this.gameState.addGuessTimestamp(Date.now());
                    const guess = this.sanitizeInput(this.playerInput.value);

                    if (!guess) {
                        this.showMessage('Please enter a valid player name', 'error');
                        return;
                    }

                    // Multiplayer mode: broadcast guess to host for validation
                    if (window.multiplayerManager && !window.multiplayerManager.isHost) {
                        window.multiplayerManager.sendGuess(guess);
                        return;
                    }

                    // Solo mode or host: validate locally
                    if (guess === this.gameState.correctAnswer) {
                        this.handleCorrectGuess();
                    } else {
                        this.handleIncorrectGuess();
                    }
                } catch (error) {
                    this.handleError('Error processing guess', error);
                }
            }

            async handleCorrectGuess() {
                try {
                    this.gameState.setGameWon(true);
                    const delta = GAME_CONFIG.CORRECT_BONUS;
                    const newScore = this.gameState.score + delta;

                    // Track round performance
                    this.gameState.addRoundHistory({
                        round: this.gameState.currentRound,
                        player: this.gameState.currentPlayer.name,
                        startScore: this.gameState.roundStartScore,
                        endScore: newScore,
                        hintsUsed: this.gameState.hintsUsed,
                        pointsGained: delta
                    });

                    this.animateScoreChange(this.gameState.score, newScore, delta);
                    this.revealAllColumns();

                    // Broadcast completion to multiplayer
                    if (window.multiplayerManager) {
                        window.multiplayerManager.broadcastCompletion(newScore);

                        // Replace table with waiting screen (multiplayer only)
                        const mainContent = document.querySelector('.main-content');
                        if (mainContent) {
                            // Use DOM methods to prevent XSS
                            mainContent.textContent = '';

                            const container = document.createElement('div');
                            container.style.cssText = 'display: flex; align-items: center; justify-content: center; height: 100%; background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 12px; flex-direction: column; padding: 40px;';

                            const correctText = document.createElement('div');
                            correctText.style.cssText = 'font-size: 36px; font-weight: 900; color: #065f46; margin-bottom: 20px;';
                            correctText.textContent = 'Correct!';

                            const playerName = document.createElement('div');
                            playerName.style.cssText = 'font-size: 24px; font-weight: 700; color: #047857; margin-bottom: 40px;';
                            playerName.textContent = this.gameState.currentPlayer.name;

                            const pointsText = document.createElement('div');
                            pointsText.style.cssText = 'font-size: 18px; color: #059669; margin-bottom: 20px;';
                            pointsText.textContent = `+${delta} points`;

                            const waitingText = document.createElement('div');
                            waitingText.style.cssText = 'font-size: 14px; color: #047857;';
                            waitingText.textContent = 'Waiting for other players...';

                            container.appendChild(correctText);
                            container.appendChild(playerName);
                            container.appendChild(pointsText);
                            container.appendChild(waitingText);
                            mainContent.appendChild(container);
                        }
                    } else {
                        // Solo mode - proceed to next round after delay
                        this.showMessage(`Correct! +${delta} pts`, 'success');

                        if (this.gameState.currentRound < this.gameState.totalRounds) {
                            setTimeout(async () => {
                                try {
                                    await this.loadNextPlayer();
                                } catch (error) {
                                    this.handleError('Failed to load next player', error);
                                }
                            }, 2000);
                        } else {
                            setTimeout(() => {
                                try {
                                    this.showFinalScore();
                                } catch (error) {
                                    this.handleError('Failed to show final score', error);
                                }
                            }, 2000);
                        }
                    }
                } catch (error) {
                    this.handleError('Error handling correct guess', error);
                }
            }

            async loadNextPlayer() {
                try {
                    // Increment round counter
                    this.gameState.incrementRound();
                    this.updateRoundDisplay();

                    // Reset game state for new player
                    this.gameState.resetForNewRound();

                    // Reset UI
                    this.playerInput.value = '';
                    this.playerInput.classList.remove('correct', 'incorrect');
                    this.playerInput.disabled = false;
                    this.guessBtn.disabled = false;
                    this.hintBtn.disabled = false;

                    // Show hints card and input, hide choices
                    this.hintsCard.classList.remove('hidden');
                    this.sidebarInputGroup.classList.remove('hidden');
                    this.playerChoicesContainer.classList.add('hidden');

                    // Reset hint dots
                    for (let i = 1; i <= 3; i++) {
                        const dot = document.getElementById(`hint-dot-${i}`);
                        if (dot) dot.classList.remove('used');
                    }

                    // Reset hint button text
                    this.updateHintButtonText();

                    // Load new player
                    await this.selectRandomPlayer();
                    this.populateTable();

                    // Hide all columns again
                    document.querySelectorAll('.team-col, .playoffs, .playoff-col').forEach(el => {
                        el.classList.add('hidden');
                    });

                    this.messageEl.classList.remove('show');

                    // Update progress bar to show 100% at round start
                    this.updateScoreDisplay();

                    // Focus input for accessibility
                    this.focusInput();
                } catch (error) {
                    this.handleError('Failed to load next player', error);
                }
            }

            showFinalScore() {
                // Calculate percentage
                const percentage = Math.round((this.gameState.score / this.gameState.maxPossibleScore) * 100);

                // Calculate grade
                let grade = 'F';
                let gradeClass = 'grade-f';
                if (percentage >= 90) {
                    grade = 'A+';
                    gradeClass = 'grade-a-plus';
                } else if (percentage >= 80) {
                    grade = 'A';
                    gradeClass = 'grade-a';
                } else if (percentage >= 70) {
                    grade = 'B';
                    gradeClass = 'grade-b';
                } else if (percentage >= 60) {
                    grade = 'C';
                    gradeClass = 'grade-c';
                } else if (percentage >= 50) {
                    grade = 'D';
                    gradeClass = 'grade-d';
                }

                // Update final modal content
                this.finalYourScore.textContent = this.gameState.score;
                this.finalMaxScore.textContent = this.gameState.maxPossibleScore;
                this.finalPercentage.textContent = `${percentage}%`;
                this.finalGrade.textContent = grade;
                this.finalGrade.className = `final-grade ${gradeClass}`;

                // Populate breakdown
                this.breakdownList.innerHTML = '';
                this.gameState.roundHistory.forEach(round => {
                    const item = document.createElement('div');
                    item.className = 'breakdown-item';

                    const player = document.createElement('div');
                    player.className = 'breakdown-player';
                    player.textContent = `${round.round}. ${round.player}`;

                    const hints = document.createElement('div');
                    hints.className = 'breakdown-hints';
                    hints.textContent = round.hintsUsed === 0 ? 'Perfect!' : `${round.hintsUsed} hint${round.hintsUsed > 1 ? 's' : ''}`;

                    const score = document.createElement('div');
                    score.className = round.hintsUsed === 0 ? 'breakdown-score perfect' : 'breakdown-score';
                    score.textContent = `+${round.pointsGained}`;

                    item.appendChild(player);
                    item.appendChild(hints);
                    item.appendChild(score);
                    this.breakdownList.appendChild(item);
                });

                // Show final modal
                setTimeout(() => {
                    this.finalModal.classList.add('show');
                }, 500);
            }

            async resetGame() {
                try {
                    // Close all modals
                    this.closeAllModals();

                    // Reset game state completely
                    this.gameState.reset();
                    this.gameState.setCurrentRound(1);

                    // Clear UI elements
                    this.playerInput.value = '';
                    this.playerInput.classList.remove('correct', 'incorrect');
                    this.playerInput.disabled = false;
                    this.guessBtn.disabled = false;
                    this.hintBtn.disabled = false;

                    // Reset hints display
                    this.hintsCard.classList.remove('hidden');
                    this.sidebarInputGroup.classList.remove('hidden');
                    this.playerChoicesContainer.classList.add('hidden');

                    // Reset hint dots
                    for (let i = 1; i <= 3; i++) {
                        const dot = document.getElementById(`hint-dot-${i}`);
                        if (dot) dot.classList.remove('used');
                    }

                    // Reset hint button text
                    this.updateHintButtonText();

                    // Clear messages
                    this.messageEl.classList.remove('show');

                    // Pre-select new set of players for the game
                    this.gameState.setSelectedPlayers([]);
                    this.preSelectPlayers();

                    // Load first player
                    await this.selectRandomPlayer();
                    this.populateTable();

                    // Hide all columns
                    document.querySelectorAll('.team-col, .playoffs, .playoff-col').forEach(el => {
                        el.classList.add('hidden');
                    });

                    // Update displays
                    this.updateScoreDisplay(true);
                    this.updateRoundDisplay();

                    // Focus on input for accessibility
                    this.focusInput();

                    this.showMessage('New game started!', 'info');
                } catch (error) {
                    this.handleError('Failed to reset game', error);
                }
            }

            focusInput() {
                try {
                    if (this.playerInput && !this.playerInput.disabled) {
                        // Small delay to ensure UI has updated
                        setTimeout(() => {
                            this.playerInput.focus();
                        }, 100);
                    }
                } catch (error) {
                    console.error('Failed to focus input:', error);
                }
            }

            handleIncorrectGuess() {
                this.playerInput.classList.add('incorrect');
                setTimeout(() => {
                    this.playerInput.classList.remove('incorrect');
                }, GAME_CONFIG.SHAKE_DURATION);
                this.showMessage('Incorrect! Try again or use a hint.', 'error');
            }

            async handleHint() {
                try {
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

                    // Mark hint as used
                    const hintDot = document.getElementById(`hint-dot-${this.gameState.hintsUsed}`);
                    if (hintDot) hintDot.classList.add('used');

                    this.animateScoreChange(this.gameState.score, newScore, delta);

                    // Broadcast hint usage to multiplayer
                    if (window.multiplayerManager) {
                        window.multiplayerManager.broadcastHintUsed(this.gameState.hintsUsed);
                    }

                    if (this.gameState.hintsUsed === 1) {
                        this.revealPlayoffs();
                        this.showMessage('Playoffs revealed! -20 points', 'info');
                    } else if (this.gameState.hintsUsed === 2) {
                        this.revealTeam();
                        this.showMessage('Team revealed! -20 points', 'info');
                    } else if (this.gameState.hintsUsed === 3) {
                        await this.showMultipleChoice();
                        this.showMessage('Choose from 4 players! -20 points', 'info');
                        this.hintBtn.disabled = true;
                    }

                    // Update hint button text for next hint
                    this.updateHintButtonText();
                } catch (error) {
                    this.handleError('Failed to show hint', error);
                }
            }

            updateHintButtonText() {
                const hintTexts = [
                    'Hint (-20): Playoffs',
                    'Hint (-20): Teams',
                    'Hint (-20): 4 Choices'
                ];

                if (this.gameState.hintsUsed < this.gameState.maxHints) {
                    this.hintBtn.textContent = hintTexts[this.gameState.hintsUsed];
                } else {
                    this.hintBtn.textContent = 'No Hints Left';
                }
            }

            animateScoreChange(fromScore, toScore, delta) {
                if (this.gameState.animatingScore) return;

                this.gameState.setAnimatingScore(true);
                const duration = 800;
                const startTime = performance.now();

                // Show delta badge
                this.scoreDelta.textContent = delta > 0 ? `+${delta}` : delta;
                this.scoreDelta.className = `score-delta ${delta > 0 ? 'positive' : 'negative'} show`;

                const animate = (currentTime) => {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);

                    // Easing function for smooth animation
                    const easeProgress = progress < 0.5
                        ? 2 * progress * progress
                        : -1 + (4 - 2 * progress) * progress;

                    const currentScore = Math.round(fromScore + (toScore - fromScore) * easeProgress);
                    this.gameState.setScore(currentScore);
                    this.updateScoreDisplay();

                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        this.gameState.setScore(toScore);
                        this.updateScoreDisplay();
                        this.gameState.setAnimatingScore(false);

                        // Hide delta badge after animation
                        setTimeout(() => {
                            this.scoreDelta.classList.remove('show');
                        }, 1500);
                    }
                };

                requestAnimationFrame(animate);
            }

            updateScoreDisplay(instant = false) {
                // Progress bar shows: current score / round start score
                // Start round at 100: bar at 100%
                // Use hint to 80: bar at 80%
                // Correct to 130: bar at 130%
                const percentage = (this.gameState.score / this.gameState.roundStartScore) * 100;

                // Update score value
                this.scoreValue.textContent = this.gameState.score;

                // Update progress bar width
                this.scoreProgress.style.width = `${percentage}%`;
                this.scorePercentage.textContent = `${Math.round(percentage)}%`;

                // Update progress bar color based on percentage
                this.scoreProgress.classList.remove('excellent', 'good', 'average', 'low');
                if (percentage >= 100) {
                    this.scoreProgress.classList.add('excellent');
                } else if (percentage >= 80) {
                    this.scoreProgress.classList.add('good');
                } else if (percentage >= 60) {
                    this.scoreProgress.classList.add('average');
                } else {
                    this.scoreProgress.classList.add('low');
                }
            }

            async showMultipleChoice() {
                // Hide hints card and input group
                this.hintsCard.classList.add('hidden');
                this.sidebarInputGroup.classList.add('hidden');

                const choices = await this.generatePlayerChoices();
                this.playerChoicesContainer.innerHTML = '';

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
                const otherPlayers = this.playersData
                    .filter(p => p.name !== this.gameState.currentPlayer.name)
                    .map(p => p.name);

                while (choices.length < GAME_CONFIG.MULTIPLE_CHOICE_COUNT && otherPlayers.length > 0) {
                    const randomIndex = Math.floor(Math.random() * otherPlayers.length);
                    choices.push(otherPlayers[randomIndex]);
                    otherPlayers.splice(randomIndex, 1);
                }

                // Shuffle choices
                for (let i = choices.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [choices[i], choices[j]] = [choices[j], choices[i]];
                }

                return choices;
            }

            handleMultipleChoiceClick(playerName, button) {
                if (this.gameState.gameWon) return;

                const isCorrect = playerName.toLowerCase() === this.gameState.correctAnswer;

                if (isCorrect) {
                    button.classList.add('correct-answer');
                    const allButtons = this.playerChoicesContainer.querySelectorAll('.player-choice-btn');
                    allButtons.forEach(btn => btn.disabled = true);
                    this.handleCorrectGuess();
                } else {
                    // Wrong choice penalty
                    const delta = -GAME_CONFIG.WRONG_CHOICE_PENALTY;
                    const newScore = this.gameState.score + delta;
                    this.animateScoreChange(this.gameState.score, newScore, delta);

                    button.classList.add('wrong-answer');
                    button.disabled = true;
                    this.showMessage(`Incorrect! -10 pts`, 'error');
                }
            }

            revealPlayoffs() {
                const playoffHeaders = document.querySelectorAll('.playoffs');
                playoffHeaders.forEach(header => {
                    header.classList.remove('hidden');
                    header.classList.add('reveal-animation');
                });

                const playoffCols = document.querySelectorAll('.playoff-col');
                playoffCols.forEach(col => {
                    col.classList.remove('hidden');
                    col.classList.add('reveal-animation');
                });
            }

            revealTeam() {
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

            showMessage(text, type) {
                this.messageEl.textContent = text;
                this.messageEl.className = `message ${type} show`;

                if (type !== 'success') {
                    setTimeout(() => {
                        this.messageEl.classList.remove('show');
                    }, GAME_CONFIG.MESSAGE_TIMEOUT);
                }
            }
        }

export { HockeyGameDashboard, GAME_CONFIG };
