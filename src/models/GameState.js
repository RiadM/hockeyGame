// GameState Model - Centralized state management with validation
// All game state mutations go through validated setters

export class GameState {
    constructor(config = {}) {
        // Configuration constants
        this._config = {
            INITIAL_SCORE: config.INITIAL_SCORE || 100,
            HINT_PENALTY: config.HINT_PENALTY || 20,
            CORRECT_BONUS: config.CORRECT_BONUS || 50,
            MAX_HINTS: config.MAX_HINTS || 3,
            TOTAL_ROUNDS: config.TOTAL_ROUNDS || 5,
            WRONG_CHOICE_PENALTY: config.WRONG_CHOICE_PENALTY || 10
        };

        // Initialize state
        this._score = this._config.INITIAL_SCORE;
        this._roundStartScore = this._config.INITIAL_SCORE;
        this._maxScore = this._config.INITIAL_SCORE + this._config.CORRECT_BONUS;
        this._hintsUsed = 0;
        this._currentPlayer = null;
        this._correctAnswer = '';
        this._gameWon = false;
        this._multipleChoiceShown = false;
        this._currentRound = 0;
        this._maxPossibleScore = this._config.TOTAL_ROUNDS * (this._config.INITIAL_SCORE + this._config.CORRECT_BONUS);
        this._selectedPlayers = [];
        this._roundHistory = [];
        this._guessTimestamps = [];
        this._animatingScore = false;
    }

    // Getters
    get score() { return this._score; }
    get roundStartScore() { return this._roundStartScore; }
    get maxScore() { return this._maxScore; }
    get hintsUsed() { return this._hintsUsed; }
    get maxHints() { return this._config.MAX_HINTS; }
    get currentPlayer() { return this._currentPlayer; }
    get correctAnswer() { return this._correctAnswer; }
    get gameWon() { return this._gameWon; }
    get multipleChoiceShown() { return this._multipleChoiceShown; }
    get currentRound() { return this._currentRound; }
    get totalRounds() { return this._config.TOTAL_ROUNDS; }
    get maxPossibleScore() { return this._maxPossibleScore; }
    get selectedPlayers() { return [...this._selectedPlayers]; }
    get roundHistory() { return [...this._roundHistory]; }
    get guessTimestamps() { return [...this._guessTimestamps]; }
    get animatingScore() { return this._animatingScore; }
    get config() { return { ...this._config }; }

    // Validated setters
    setScore(value) {
        if (typeof value !== 'number' || isNaN(value)) {
            throw new Error('Score must be a valid number');
        }
        if (value < 0) {
            throw new Error('Score cannot be negative');
        }
        this._score = Math.round(value);
    }

    setRoundStartScore(value) {
        if (typeof value !== 'number' || isNaN(value)) {
            throw new Error('Round start score must be a valid number');
        }
        if (value < 0) {
            throw new Error('Round start score cannot be negative');
        }
        this._roundStartScore = Math.round(value);
    }

    setMaxScore(value) {
        if (typeof value !== 'number' || isNaN(value)) {
            throw new Error('Max score must be a valid number');
        }
        if (value < 0) {
            throw new Error('Max score cannot be negative');
        }
        this._maxScore = Math.round(value);
    }

    setHintsUsed(value) {
        if (typeof value !== 'number' || isNaN(value)) {
            throw new Error('Hints used must be a valid number');
        }
        if (value < 0 || value > this._config.MAX_HINTS) {
            throw new Error(`Hints used must be between 0 and ${this._config.MAX_HINTS}`);
        }
        this._hintsUsed = Math.round(value);
    }

    setCurrentPlayer(player) {
        if (player !== null && typeof player !== 'object') {
            throw new Error('Current player must be an object or null');
        }
        this._currentPlayer = player;
        this._correctAnswer = player ? player.name.toLowerCase() : '';
    }

    setGameWon(value) {
        if (typeof value !== 'boolean') {
            throw new Error('Game won must be a boolean');
        }
        this._gameWon = value;
    }

    setMultipleChoiceShown(value) {
        if (typeof value !== 'boolean') {
            throw new Error('Multiple choice shown must be a boolean');
        }
        this._multipleChoiceShown = value;
    }

    setCurrentRound(value) {
        if (typeof value !== 'number' || isNaN(value)) {
            throw new Error('Current round must be a valid number');
        }
        if (value < 0 || value > this._config.TOTAL_ROUNDS) {
            throw new Error(`Current round must be between 0 and ${this._config.TOTAL_ROUNDS}`);
        }
        this._currentRound = Math.round(value);
    }

    setSelectedPlayers(players) {
        if (!Array.isArray(players)) {
            throw new Error('Selected players must be an array');
        }
        this._selectedPlayers = [...players];
    }

    setAnimatingScore(value) {
        if (typeof value !== 'boolean') {
            throw new Error('Animating score must be a boolean');
        }
        this._animatingScore = value;
    }

    // Specialized state mutation methods
    incrementHintsUsed() {
        this.setHintsUsed(this._hintsUsed + 1);
    }

    incrementRound() {
        this.setCurrentRound(this._currentRound + 1);
    }

    addRoundHistory(roundData) {
        if (!roundData || typeof roundData !== 'object') {
            throw new Error('Round data must be an object');
        }
        const required = ['round', 'player', 'startScore', 'endScore', 'hintsUsed', 'pointsGained'];
        for (const field of required) {
            if (!(field in roundData)) {
                throw new Error(`Round data missing required field: ${field}`);
            }
        }
        this._roundHistory.push({ ...roundData });
    }

    addGuessTimestamp(timestamp) {
        if (typeof timestamp !== 'number' || isNaN(timestamp)) {
            throw new Error('Guess timestamp must be a valid number');
        }
        this._guessTimestamps.push(timestamp);
    }

    clearGuessTimestamps(beforeTime = null) {
        if (beforeTime === null) {
            this._guessTimestamps = [];
        } else {
            if (typeof beforeTime !== 'number' || isNaN(beforeTime)) {
                throw new Error('Before time must be a valid number');
            }
            this._guessTimestamps = this._guessTimestamps.filter(t => t >= beforeTime);
        }
    }

    // Apply score delta with validation
    applyScoreDelta(delta) {
        if (typeof delta !== 'number' || isNaN(delta)) {
            throw new Error('Score delta must be a valid number');
        }
        this.setScore(this._score + delta);
    }

    // Reset for new round
    resetForNewRound() {
        this._gameWon = false;
        this._hintsUsed = 0;
        this._multipleChoiceShown = false;
        this._guessTimestamps = [];
        this._roundStartScore = this._score;
        this._maxScore = this._score + this._config.CORRECT_BONUS;
    }

    // Full game reset
    reset() {
        this._score = this._config.INITIAL_SCORE;
        this._roundStartScore = this._config.INITIAL_SCORE;
        this._maxScore = this._config.INITIAL_SCORE + this._config.CORRECT_BONUS;
        this._hintsUsed = 0;
        this._currentPlayer = null;
        this._correctAnswer = '';
        this._gameWon = false;
        this._multipleChoiceShown = false;
        this._currentRound = 0;
        this._selectedPlayers = [];
        this._roundHistory = [];
        this._guessTimestamps = [];
        this._animatingScore = false;
    }

    // Serialization
    toJSON() {
        return {
            config: this._config,
            score: this._score,
            roundStartScore: this._roundStartScore,
            maxScore: this._maxScore,
            hintsUsed: this._hintsUsed,
            currentPlayer: this._currentPlayer,
            gameWon: this._gameWon,
            multipleChoiceShown: this._multipleChoiceShown,
            currentRound: this._currentRound,
            maxPossibleScore: this._maxPossibleScore,
            selectedPlayers: this._selectedPlayers,
            roundHistory: this._roundHistory,
            guessTimestamps: this._guessTimestamps,
            animatingScore: this._animatingScore
        };
    }

    static fromJSON(json) {
        if (!json || typeof json !== 'object') {
            throw new Error('Invalid JSON data');
        }

        const state = new GameState(json.config || {});

        // Restore state using validated setters
        if ('score' in json) state.setScore(json.score);
        if ('roundStartScore' in json) state.setRoundStartScore(json.roundStartScore);
        if ('maxScore' in json) state.setMaxScore(json.maxScore);
        if ('hintsUsed' in json) state.setHintsUsed(json.hintsUsed);
        if ('currentPlayer' in json) state.setCurrentPlayer(json.currentPlayer);
        if ('gameWon' in json) state.setGameWon(json.gameWon);
        if ('multipleChoiceShown' in json) state.setMultipleChoiceShown(json.multipleChoiceShown);
        if ('currentRound' in json) state.setCurrentRound(json.currentRound);
        if ('selectedPlayers' in json) state.setSelectedPlayers(json.selectedPlayers);
        if ('animatingScore' in json) state.setAnimatingScore(json.animatingScore);

        // Direct assignments for arrays (already validated by setters above)
        if ('roundHistory' in json && Array.isArray(json.roundHistory)) {
            state._roundHistory = [...json.roundHistory];
        }
        if ('guessTimestamps' in json && Array.isArray(json.guessTimestamps)) {
            state._guessTimestamps = [...json.guessTimestamps];
        }
        if ('maxPossibleScore' in json) {
            state._maxPossibleScore = json.maxPossibleScore;
        }

        return state;
    }
}
