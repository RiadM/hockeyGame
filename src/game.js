// Hockey Game Logic - Core game mechanics
// Handles scoring, hints, guessing, round progression

import { eventBus } from './utils/EventBus.js';

const GAME_CONFIG = {
    INITIAL_SCORE: 100,
    HINT_PENALTY: 20,
    CORRECT_BONUS: 50,
    WRONG_CHOICE_PENALTY: 10,
    MAX_HINTS: 3,
    MAX_ROUNDS: 5,
    ALLOWED_INPUT_PATTERN: /[^a-z\s'-]/gi,
    MAX_INPUT_LENGTH: 100,
    RATE_LIMIT_WINDOW: 1000,
    MAX_GUESSES_PER_WINDOW: 10,
    MESSAGE_TIMEOUT: 4000,
    SHAKE_DURATION: 600
};

class HockeyGameDashboard {
            constructor() {
                this.score = GAME_CONFIG.INITIAL_SCORE;
                this.roundStartScore = GAME_CONFIG.INITIAL_SCORE;
                this.maxScore = GAME_CONFIG.INITIAL_SCORE + GAME_CONFIG.CORRECT_BONUS;
                this.hintsUsed = 0;
                this.maxHints = GAME_CONFIG.MAX_HINTS;
                this.hintPenalty = GAME_CONFIG.HINT_PENALTY;
                this.correctGuessBonus = GAME_CONFIG.CORRECT_BONUS;
                this.wrongChoicePenalty = 10;
                this.currentPlayer = null;
                this.correctAnswer = '';
                this.gameWon = false;
                this.multipleChoiceShown = false;
                this.guessTimestamps = [];
                this.animatingScore = false;
                this.playersData = null;

                // 5-round game tracking
                this.currentRound = 0;
                this.totalRounds = 5;
                this.maxPossibleScore = 750; // 5 rounds × 150 pts each
                this.selectedPlayers = []; // Pre-selected 5 unique players
                this.roundHistory = []; // Track performance per round

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
                    this.currentRound = 1;
                    this.updateScoreDisplay(true);
                    this.updateRoundDisplay();
                } catch (error) {
                    this.handleFatalError(error);
                }
            }

            handleFatalError(error) {
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
                    if (this.selectedPlayers.length === 0) {
                        this.preSelectPlayers();
                    }

                    // Use current round index to get player (0-indexed)
                    const playerIndex = this.currentRound - 1;
                    if (playerIndex >= 0 && playerIndex < this.selectedPlayers.length) {
                        this.currentPlayer = this.selectedPlayers[playerIndex];
                    } else {
                        // Fallback to random if something goes wrong
                        const randomIndex = Math.floor(Math.random() * this.playersData.length);
                        this.currentPlayer = this.playersData[randomIndex];
                    }

                    this.correctAnswer = this.currentPlayer.name.toLowerCase();
                } catch (error) {
                    throw error;
                }
            }

            preSelectPlayers() {
                // Shuffle all players and pick first 5
                const shuffled = [...this.playersData].sort(() => Math.random() - 0.5);
                this.selectedPlayers = shuffled.slice(0, this.totalRounds);
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
                if (!this.currentPlayer) return;
                const allSeasons = this.currentPlayer.seasons
                    .sort((a, b) => a.season.localeCompare(b.season));
                const fragment = document.createDocumentFragment();
                allSeasons.forEach(season => {
                    fragment.appendChild(this.createStatsRow(season));
                });
                this.statsBody.innerHTML = '';
                this.statsBody.appendChild(fragment);
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

                // Modal handlers
                this.scoreInfoBtn.addEventListener('click', () => {
                    this.gameInfoModal.classList.add('show');
                });

                this.gameInfoClose.addEventListener('click', () => {
                    this.gameInfoModal.classList.remove('show');
                });

                this.gameInfoModal.addEventListener('click', (e) => {
                    if (e.target === this.gameInfoModal) {
                        this.gameInfoModal.classList.remove('show');
                    }
                });

                // Restart button
                this.restartBtn.addEventListener('click', () => this.resetGame());

                // Final modal New Game button
                this.finalNewGameBtn.addEventListener('click', () => {
                    this.finalModal.classList.remove('show');
                    this.resetGame();
                });
            }

            updateRoundDisplay() {
                // Emit round changed event
                eventBus.emit('roundChanged', {
                    currentRound: this.currentRound,
                    totalRounds: this.totalRounds,
                    progressPercentage: (this.currentRound / this.totalRounds) * 100
                });

                this.roundValue.textContent = `${this.currentRound} / ${this.totalRounds}`;

                // Update overall progress bar
                const progressPercentage = (this.currentRound / this.totalRounds) * 100;
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

                if (this.isRateLimited()) {
                    this.showMessage('Too many guesses. Please wait.', 'error');
                    return;
                }

                this.guessTimestamps.push(Date.now());
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
                if (guess === this.correctAnswer) {
                    this.handleCorrectGuess();
                } else {
                    this.handleIncorrectGuess();
                }
            }

            async handleCorrectGuess() {
                this.gameWon = true;
                const delta = this.correctGuessBonus;
                const newScore = this.score + delta;

                // Track round performance
                this.roundHistory.push({
                    round: this.currentRound,
                    player: this.currentPlayer.name,
                    startScore: this.roundStartScore,
                    endScore: newScore,
                    hintsUsed: this.hintsUsed,
                    pointsGained: delta
                });

                // Emit player guessed event
                eventBus.emit('playerGuessed', {
                    correct: true,
                    playerName: this.currentPlayer.name,
                    bonus: delta,
                    newScore: newScore,
                    round: this.currentRound,
                    hintsUsed: this.hintsUsed
                });

                this.animateScoreChange(this.score, newScore, delta);
                this.revealAllColumns();

                // Broadcast completion to multiplayer
                if (window.multiplayerManager) {
                    window.multiplayerManager.broadcastCompletion(newScore);

                    // Replace table with waiting screen (multiplayer only)
                    const mainContent = document.querySelector('.main-content');
                    if (mainContent) {
                        // Clear existing content safely
                        mainContent.innerHTML = '';

                        // Create elements using DOM API for XSS prevention
                        const container = document.createElement('div');
                        container.style.cssText = 'display: flex; align-items: center; justify-content: center; height: 100%; background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 12px; flex-direction: column; padding: 40px;';

                        const correctText = document.createElement('div');
                        correctText.style.cssText = 'font-size: 36px; font-weight: 900; color: #065f46; margin-bottom: 20px;';
                        correctText.textContent = 'Correct!';

                        const playerText = document.createElement('div');
                        playerText.style.cssText = 'font-size: 24px; font-weight: 700; color: #047857; margin-bottom: 40px;';
                        playerText.textContent = this.currentPlayer.name;

                        const pointsText = document.createElement('div');
                        pointsText.style.cssText = 'font-size: 18px; color: #059669; margin-bottom: 20px;';
                        pointsText.textContent = `+${delta} points`;

                        const waitingText = document.createElement('div');
                        waitingText.style.cssText = 'font-size: 14px; color: #047857;';
                        waitingText.textContent = 'Waiting for other players...';

                        container.appendChild(correctText);
                        container.appendChild(playerText);
                        container.appendChild(pointsText);
                        container.appendChild(waitingText);
                        mainContent.appendChild(container);
                    }
                } else {
                    // Solo mode - proceed to next round after delay
                    this.showMessage(`Correct! +${delta} pts`, 'success');

                    if (this.currentRound < this.totalRounds) {
                        setTimeout(async () => {
                            await this.loadNextPlayer();
                        }, 2000);
                    } else {
                        setTimeout(() => {
                            this.showFinalScore();
                        }, 2000);
                    }
                }
            }

            async loadNextPlayer() {
                // Emit round complete event
                eventBus.emit('roundComplete', {
                    round: this.currentRound,
                    score: this.score,
                    player: this.currentPlayer?.name
                });

                // Increment round counter
                this.currentRound++;
                this.updateRoundDisplay();

                // Reset game state for new player
                this.gameWon = false;
                this.hintsUsed = 0;
                this.multipleChoiceShown = false;
                this.guessTimestamps = [];

                // Set new round baseline - current score is 100%
                this.roundStartScore = this.score;
                this.maxScore = this.score + this.correctGuessBonus;

                // Emit round start event
                eventBus.emit('roundStart', {
                    round: this.currentRound,
                    totalRounds: this.totalRounds,
                    score: this.score
                });

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
            }

            showFinalScore() {
                // Calculate percentage
                const percentage = Math.round((this.score / this.maxPossibleScore) * 100);

                // Emit game complete event
                eventBus.emit('gameComplete', {
                    finalScore: this.score,
                    maxPossibleScore: this.maxPossibleScore,
                    percentage: percentage,
                    roundHistory: this.roundHistory
                });

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
                this.finalYourScore.textContent = this.score;
                this.finalMaxScore.textContent = this.maxPossibleScore;
                this.finalPercentage.textContent = `${percentage}%`;
                this.finalGrade.textContent = grade;
                this.finalGrade.className = `final-grade ${gradeClass}`;

                // Populate breakdown
                this.breakdownList.innerHTML = '';
                this.roundHistory.forEach(round => {
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

            resetGame() {
                this.score = GAME_CONFIG.INITIAL_SCORE;
                this.roundStartScore = GAME_CONFIG.INITIAL_SCORE;
                this.maxScore = GAME_CONFIG.INITIAL_SCORE + GAME_CONFIG.CORRECT_BONUS;
                this.currentRound = 0;
                this.maxPossibleScore = 750;
                this.roundHistory = [];
                this.selectedPlayers = [];
                this.loadNextPlayer();
            }

            handleIncorrectGuess() {
                // Emit player guessed event
                eventBus.emit('playerGuessed', {
                    correct: false,
                    guess: this.playerInput.value
                });

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
                const delta = -this.hintPenalty;
                const newScore = this.score - this.hintPenalty;

                // Emit hint used event
                eventBus.emit('hintUsed', {
                    hintNumber: this.hintsUsed,
                    totalHints: this.maxHints,
                    penalty: this.hintPenalty,
                    newScore: newScore
                });

                // Mark hint as used
                const hintDot = document.getElementById(`hint-dot-${this.hintsUsed}`);
                if (hintDot) hintDot.classList.add('used');

                this.animateScoreChange(this.score, newScore, delta);

                // Broadcast hint usage to multiplayer
                if (window.multiplayerManager) {
                    window.multiplayerManager.broadcastHintUsed(this.hintsUsed);
                }

                if (this.hintsUsed === 1) {
                    this.revealPlayoffs();
                    this.showMessage('Playoffs revealed! -20 points', 'info');
                } else if (this.hintsUsed === 2) {
                    this.revealTeam();
                    this.showMessage('Team revealed! -20 points', 'info');
                } else if (this.hintsUsed === 3) {
                    await this.showMultipleChoice();
                    this.showMessage('Choose from 4 players! -20 points', 'info');
                    this.hintBtn.disabled = true;
                }

                // Update hint button text for next hint
                this.updateHintButtonText();
            }

            updateHintButtonText() {
                const hintTexts = [
                    'Hint (-20): Playoffs',
                    'Hint (-20): Teams',
                    'Hint (-20): 4 Choices'
                ];

                if (this.hintsUsed < this.maxHints) {
                    this.hintBtn.textContent = hintTexts[this.hintsUsed];
                } else {
                    this.hintBtn.textContent = 'No Hints Left';
                }
            }

            animateScoreChange(fromScore, toScore, delta) {
                if (this.animatingScore) return;

                this.animatingScore = true;
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
                    this.score = currentScore;
                    this.updateScoreDisplay();

                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        this.score = toScore;
                        this.updateScoreDisplay();
                        this.animatingScore = false;

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
                const percentage = (this.score / this.roundStartScore) * 100;

                // Emit score changed event
                eventBus.emit('scoreChanged', {
                    score: this.score,
                    roundStartScore: this.roundStartScore,
                    percentage: Math.round(percentage)
                });

                // Update score value
                this.scoreValue.textContent = this.score;

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
                this.multipleChoiceShown = true;
            }

            async generatePlayerChoices() {
                const choices = [this.currentPlayer.name];
                const otherPlayers = this.playersData
                    .filter(p => p.name !== this.currentPlayer.name)
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
                if (this.gameWon) return;

                const isCorrect = playerName.toLowerCase() === this.correctAnswer;

                if (isCorrect) {
                    button.classList.add('correct-answer');
                    const allButtons = this.playerChoicesContainer.querySelectorAll('.player-choice-btn');
                    allButtons.forEach(btn => btn.disabled = true);
                    this.handleCorrectGuess();
                } else {
                    // Wrong choice penalty
                    const delta = -this.wrongChoicePenalty;
                    const newScore = this.score + delta;
                    this.animateScoreChange(this.score, newScore, delta);

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
