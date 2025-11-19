// EventBus Integration Test - Verify events are emitted and received
// Tests: Event flow between game.js and EventHandlers.js

import { eventBus } from '../src/utils/EventBus.js';

console.log('Testing EventBus Integration...\n');

// Track events received
const eventsReceived = [];

// Set up listeners for all game events
eventBus.on('scoreChanged', (data) => {
    eventsReceived.push({ event: 'scoreChanged', data });
});

eventBus.on('hintUsed', (data) => {
    eventsReceived.push({ event: 'hintUsed', data });
});

eventBus.on('playerGuessed', (data) => {
    eventsReceived.push({ event: 'playerGuessed', data });
});

eventBus.on('roundComplete', (data) => {
    eventsReceived.push({ event: 'roundComplete', data });
});

eventBus.on('roundStart', (data) => {
    eventsReceived.push({ event: 'roundStart', data });
});

eventBus.on('roundChanged', (data) => {
    eventsReceived.push({ event: 'roundChanged', data });
});

eventBus.on('gameComplete', (data) => {
    eventsReceived.push({ event: 'gameComplete', data });
});

// Simulate game events
console.log('Simulating game events...');

eventBus.emit('roundStart', { round: 1, playerName: 'Test Player', score: 100 });
eventBus.emit('hintUsed', { hintNumber: 1, score: 80, round: 1 });
eventBus.emit('scoreChanged', { score: 80, delta: -20, fromScore: 100 });
eventBus.emit('playerGuessed', { correct: false, guess: 'wrong', score: 80, round: 1 });
eventBus.emit('playerGuessed', { correct: true, playerName: 'Test Player', score: 130, round: 1, hintsUsed: 1 });
eventBus.emit('roundComplete', { round: 1, playerName: 'Test Player', score: 130, hintsUsed: 1 });
eventBus.emit('roundChanged', { round: 2, totalRounds: 5 });
eventBus.emit('gameComplete', { finalScore: 450, maxPossibleScore: 750, percentage: 60, grade: 'C', roundHistory: [] });

// Verify all events were received
console.log(`\nTotal events received: ${eventsReceived.length}`);

const expectedEvents = [
    'roundStart',
    'hintUsed',
    'scoreChanged',
    'playerGuessed',
    'playerGuessed',
    'roundComplete',
    'roundChanged',
    'gameComplete'
];

let passed = true;

if (eventsReceived.length !== expectedEvents.length) {
    console.error(`Expected ${expectedEvents.length} events, got ${eventsReceived.length}`);
    passed = false;
} else {
    console.log(`All ${expectedEvents.length} events received`);
}

// Verify each event
expectedEvents.forEach((expectedEvent, index) => {
    const received = eventsReceived[index];
    if (!received || received.event !== expectedEvent) {
        console.error(`Event ${index + 1}: Expected ${expectedEvent}, got ${received?.event || 'none'}`);
        passed = false;
    } else {
        console.log(`Event ${index + 1}: ${expectedEvent}`);
    }
});

// Test listener count
const listenerCount = eventBus.listenerCount();
console.log(`\nActive listeners: ${listenerCount}`);

if (listenerCount === 7) {
    console.log('Correct number of listeners');
} else {
    console.error(`Expected 7 listeners, got ${listenerCount}`);
    passed = false;
}

// Cleanup
eventBus.clear();
const cleanedCount = eventBus.listenerCount();
console.log(`\nAfter cleanup: ${cleanedCount} listeners`);

if (cleanedCount === 0) {
    console.log('Cleanup successful');
} else {
    console.error(`Expected 0 listeners after cleanup, got ${cleanedCount}`);
    passed = false;
}

console.log(`\n${passed ? 'All integration tests passed!' : 'Some tests failed'}`);
process.exit(passed ? 0 : 1);
