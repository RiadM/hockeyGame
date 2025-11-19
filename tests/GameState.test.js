// GameState Model Tests
// Tests for centralized state management, validation, and serialization

import { GameState } from '../src/models/GameState.js';

// Test runner
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// Test helpers
const assertEqual = (actual, expected, message) => {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
};

const assertThrows = (fn, message) => {
    let threw = false;
    try {
        fn();
    } catch (e) {
        threw = true;
    }
    if (!threw) {
        throw new Error(`${message}: expected function to throw`);
    }
};

const assertDeepEqual = (actual, expected, message) => {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
        throw new Error(`${message}: expected ${expectedStr}, got ${actualStr}`);
    }
};

// Tests
test('GameState initializes with default values', () => {
    const state = new GameState();
    assertEqual(state.score, 100, 'Initial score should be 100');
    assertEqual(state.hintsUsed, 0, 'Initial hints used should be 0');
    assertEqual(state.currentRound, 0, 'Initial round should be 0');
    assertEqual(state.gameWon, false, 'Game should not be won initially');
    assertEqual(state.selectedPlayers.length, 0, 'Selected players should be empty');
    assertEqual(state.roundHistory.length, 0, 'Round history should be empty');
});

test('GameState accepts custom config', () => {
    const config = {
        INITIAL_SCORE: 200,
        HINT_PENALTY: 30,
        CORRECT_BONUS: 60,
        MAX_HINTS: 5,
        TOTAL_ROUNDS: 10
    };
    const state = new GameState(config);
    assertEqual(state.score, 200, 'Score should match custom config');
    assertEqual(state.maxHints, 5, 'Max hints should match custom config');
    assertEqual(state.totalRounds, 10, 'Total rounds should match custom config');
});

test('setScore validates positive numbers', () => {
    const state = new GameState();
    state.setScore(150);
    assertEqual(state.score, 150, 'Score should be set to 150');
});

test('setScore rejects negative values', () => {
    const state = new GameState();
    assertThrows(() => state.setScore(-10), 'Should reject negative score');
});

test('setScore rejects non-numbers', () => {
    const state = new GameState();
    assertThrows(() => state.setScore('abc'), 'Should reject string score');
    assertThrows(() => state.setScore(NaN), 'Should reject NaN score');
});

test('setHintsUsed validates range', () => {
    const state = new GameState();
    state.setHintsUsed(2);
    assertEqual(state.hintsUsed, 2, 'Hints used should be 2');
});

test('setHintsUsed rejects values above max', () => {
    const state = new GameState();
    assertThrows(() => state.setHintsUsed(5), 'Should reject hints above max');
});

test('setHintsUsed rejects negative values', () => {
    const state = new GameState();
    assertThrows(() => state.setHintsUsed(-1), 'Should reject negative hints');
});

test('incrementHintsUsed increments correctly', () => {
    const state = new GameState();
    state.incrementHintsUsed();
    assertEqual(state.hintsUsed, 1, 'Hints should increment to 1');
    state.incrementHintsUsed();
    assertEqual(state.hintsUsed, 2, 'Hints should increment to 2');
});

test('incrementHintsUsed throws when exceeding max', () => {
    const state = new GameState();
    state.setHintsUsed(3);
    assertThrows(() => state.incrementHintsUsed(), 'Should reject increment beyond max');
});

test('setCurrentRound validates range', () => {
    const state = new GameState();
    state.setCurrentRound(3);
    assertEqual(state.currentRound, 3, 'Current round should be 3');
});

test('setCurrentRound rejects values above total rounds', () => {
    const state = new GameState();
    assertThrows(() => state.setCurrentRound(10), 'Should reject round above total');
});

test('incrementRound increments correctly', () => {
    const state = new GameState();
    state.setCurrentRound(1);
    state.incrementRound();
    assertEqual(state.currentRound, 2, 'Round should increment to 2');
});

test('setCurrentPlayer updates player and correct answer', () => {
    const state = new GameState();
    const player = { name: 'Wayne Gretzky', seasons: [] };
    state.setCurrentPlayer(player);
    assertEqual(state.currentPlayer.name, 'Wayne Gretzky', 'Player should be set');
    assertEqual(state.correctAnswer, 'wayne gretzky', 'Correct answer should be lowercase');
});

test('setCurrentPlayer rejects non-objects', () => {
    const state = new GameState();
    assertThrows(() => state.setCurrentPlayer('not an object'), 'Should reject non-object player');
});

test('setGameWon updates game won state', () => {
    const state = new GameState();
    state.setGameWon(true);
    assertEqual(state.gameWon, true, 'Game won should be true');
});

test('setGameWon rejects non-booleans', () => {
    const state = new GameState();
    assertThrows(() => state.setGameWon('true'), 'Should reject non-boolean value');
});

test('addRoundHistory adds valid round data', () => {
    const state = new GameState();
    const roundData = {
        round: 1,
        player: 'Test Player',
        startScore: 100,
        endScore: 150,
        hintsUsed: 0,
        pointsGained: 50
    };
    state.addRoundHistory(roundData);
    assertEqual(state.roundHistory.length, 1, 'Round history should have 1 entry');
    assertEqual(state.roundHistory[0].player, 'Test Player', 'Player name should match');
});

test('addRoundHistory rejects invalid round data', () => {
    const state = new GameState();
    assertThrows(() => state.addRoundHistory({}), 'Should reject incomplete round data');
    assertThrows(() => state.addRoundHistory({ round: 1 }), 'Should reject missing fields');
});

test('addGuessTimestamp adds timestamps', () => {
    const state = new GameState();
    const now = Date.now();
    state.addGuessTimestamp(now);
    assertEqual(state.guessTimestamps.length, 1, 'Should have 1 timestamp');
    assertEqual(state.guessTimestamps[0], now, 'Timestamp should match');
});

test('clearGuessTimestamps removes all when no argument', () => {
    const state = new GameState();
    state.addGuessTimestamp(Date.now());
    state.addGuessTimestamp(Date.now());
    state.clearGuessTimestamps();
    assertEqual(state.guessTimestamps.length, 0, 'All timestamps should be cleared');
});

test('clearGuessTimestamps filters by time', () => {
    const state = new GameState();
    const now = Date.now();
    state.addGuessTimestamp(now - 2000);
    state.addGuessTimestamp(now - 500);
    state.addGuessTimestamp(now);
    state.clearGuessTimestamps(now - 1000);
    assertEqual(state.guessTimestamps.length, 2, 'Should keep timestamps after threshold');
});

test('applyScoreDelta applies positive delta', () => {
    const state = new GameState();
    state.applyScoreDelta(50);
    assertEqual(state.score, 150, 'Score should increase by 50');
});

test('applyScoreDelta applies negative delta', () => {
    const state = new GameState();
    state.applyScoreDelta(-20);
    assertEqual(state.score, 80, 'Score should decrease by 20');
});

test('resetForNewRound resets round-specific state', () => {
    const state = new GameState();
    state.setScore(120);
    state.setHintsUsed(2);
    state.setGameWon(true);
    state.setMultipleChoiceShown(true);
    state.addGuessTimestamp(Date.now());

    state.resetForNewRound();

    assertEqual(state.gameWon, false, 'Game won should be reset');
    assertEqual(state.hintsUsed, 0, 'Hints used should be reset');
    assertEqual(state.multipleChoiceShown, false, 'Multiple choice shown should be reset');
    assertEqual(state.guessTimestamps.length, 0, 'Guess timestamps should be cleared');
    assertEqual(state.roundStartScore, 120, 'Round start score should be current score');
});

test('reset resets all state', () => {
    const state = new GameState();
    state.setScore(150);
    state.setCurrentRound(3);
    state.setHintsUsed(2);
    state.setGameWon(true);
    state.addRoundHistory({
        round: 1,
        player: 'Test',
        startScore: 100,
        endScore: 150,
        hintsUsed: 0,
        pointsGained: 50
    });

    state.reset();

    assertEqual(state.score, 100, 'Score should be reset to initial');
    assertEqual(state.currentRound, 0, 'Round should be reset to 0');
    assertEqual(state.hintsUsed, 0, 'Hints used should be reset');
    assertEqual(state.gameWon, false, 'Game won should be reset');
    assertEqual(state.roundHistory.length, 0, 'Round history should be cleared');
});

test('toJSON serializes state correctly', () => {
    const state = new GameState();
    state.setScore(150);
    state.setCurrentRound(2);
    state.setHintsUsed(1);

    const json = state.toJSON();

    assertEqual(json.score, 150, 'JSON should contain score');
    assertEqual(json.currentRound, 2, 'JSON should contain current round');
    assertEqual(json.hintsUsed, 1, 'JSON should contain hints used');
    assertEqual(typeof json.config, 'object', 'JSON should contain config');
});

test('fromJSON restores state correctly', () => {
    const originalState = new GameState();
    originalState.setScore(175);
    originalState.setCurrentRound(3);
    originalState.setHintsUsed(2);
    originalState.setGameWon(true);

    const json = originalState.toJSON();
    const restoredState = GameState.fromJSON(json);

    assertEqual(restoredState.score, 175, 'Restored score should match');
    assertEqual(restoredState.currentRound, 3, 'Restored round should match');
    assertEqual(restoredState.hintsUsed, 2, 'Restored hints should match');
    assertEqual(restoredState.gameWon, true, 'Restored game won should match');
});

test('fromJSON validates restored state', () => {
    const invalidJson = {
        score: -50,
        hintsUsed: 10,
        currentRound: 0
    };

    assertThrows(() => GameState.fromJSON(invalidJson), 'Should reject invalid restored state');
});

test('getters return copies of arrays', () => {
    const state = new GameState();
    const players = [{ name: 'Player 1' }, { name: 'Player 2' }];
    state.setSelectedPlayers(players);

    const retrieved = state.selectedPlayers;
    retrieved.push({ name: 'Player 3' });

    assertEqual(state.selectedPlayers.length, 2, 'Original array should not be modified');
});

// Run all tests
console.log('Running GameState Tests...\n');

let passed = 0;
let failed = 0;

for (const { name, fn } of tests) {
    try {
        fn();
        console.log(`✓ ${name}`);
        passed++;
    } catch (error) {
        console.log(`✗ ${name}`);
        console.log(`  ${error.message}`);
        failed++;
    }
}

console.log(`\nResults: ${passed} passed, ${failed} failed, ${tests.length} total`);

if (failed > 0) {
    process.exit(1);
}
