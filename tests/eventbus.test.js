// EventBus Tests - Verify event system functionality
// Tests: on/off/emit, multiple listeners, memory leak prevention

import { EventBus } from '../src/utils/EventBus.js';

// Test 1: Basic on/emit functionality
function testBasicEmit() {
    const bus = new EventBus();
    let received = null;

    bus.on('test', (data) => {
        received = data;
    });

    bus.emit('test', { value: 42 });

    if (received && received.value === 42) {
        console.log('✓ Test 1: Basic emit works');
        return true;
    }
    console.error('✗ Test 1: Basic emit failed');
    return false;
}

// Test 2: Multiple listeners
function testMultipleListeners() {
    const bus = new EventBus();
    let count = 0;

    bus.on('increment', () => count++);
    bus.on('increment', () => count++);
    bus.on('increment', () => count++);

    bus.emit('increment');

    if (count === 3) {
        console.log('✓ Test 2: Multiple listeners work');
        return true;
    }
    console.error('✗ Test 2: Multiple listeners failed, count:', count);
    return false;
}

// Test 3: off() removes listeners
function testOff() {
    const bus = new EventBus();
    let count = 0;

    const handler = () => count++;
    bus.on('test', handler);
    bus.emit('test'); // count = 1

    bus.off('test', handler);
    bus.emit('test'); // count should still be 1

    if (count === 1) {
        console.log('✓ Test 3: off() removes listeners');
        return true;
    }
    console.error('✗ Test 3: off() failed, count:', count);
    return false;
}

// Test 4: once() fires only once
function testOnce() {
    const bus = new EventBus();
    let count = 0;

    bus.once('test', () => count++);
    bus.emit('test'); // count = 1
    bus.emit('test'); // count should still be 1

    if (count === 1) {
        console.log('✓ Test 4: once() fires only once');
        return true;
    }
    console.error('✗ Test 4: once() failed, count:', count);
    return false;
}

// Test 5: clear() removes all listeners
function testClear() {
    const bus = new EventBus();
    let count = 0;

    bus.on('test1', () => count++);
    bus.on('test2', () => count++);

    bus.clear();
    bus.emit('test1');
    bus.emit('test2');

    if (count === 0) {
        console.log('✓ Test 5: clear() removes all listeners');
        return true;
    }
    console.error('✗ Test 5: clear() failed, count:', count);
    return false;
}

// Test 6: listenerCount()
function testListenerCount() {
    const bus = new EventBus();

    bus.on('test', () => {});
    bus.on('test', () => {});
    bus.on('other', () => {});

    if (bus.listenerCount('test') === 2 && bus.listenerCount() === 3) {
        console.log('✓ Test 6: listenerCount() works');
        return true;
    }
    console.error('✗ Test 6: listenerCount() failed');
    return false;
}

// Test 7: Error handling in listeners
function testErrorHandling() {
    const bus = new EventBus();
    let safeHandlerCalled = false;

    bus.on('test', () => {
        throw new Error('Test error');
    });

    bus.on('test', () => {
        safeHandlerCalled = true;
    });

    bus.emit('test');

    if (safeHandlerCalled) {
        console.log('✓ Test 7: Error handling works (other listeners still fire)');
        return true;
    }
    console.error('✗ Test 7: Error handling failed');
    return false;
}

// Test 8: Unsubscribe function
function testUnsubscribe() {
    const bus = new EventBus();
    let count = 0;

    const unsubscribe = bus.on('test', () => count++);
    bus.emit('test'); // count = 1

    unsubscribe();
    bus.emit('test'); // count should still be 1

    if (count === 1) {
        console.log('✓ Test 8: Unsubscribe function works');
        return true;
    }
    console.error('✗ Test 8: Unsubscribe failed, count:', count);
    return false;
}

// Run all tests
export function runAllTests() {
    console.log('Running EventBus tests...\n');

    const results = [
        testBasicEmit(),
        testMultipleListeners(),
        testOff(),
        testOnce(),
        testClear(),
        testListenerCount(),
        testErrorHandling(),
        testUnsubscribe()
    ];

    const passed = results.filter(r => r).length;
    const total = results.length;

    console.log(`\n${passed}/${total} tests passed`);

    return passed === total;
}

// Auto-run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests();
}
