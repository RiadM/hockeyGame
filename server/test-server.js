// Quick server test script
// Run: node server/test-server.js
const http = require('http');

const PORT = process.env.PORT || 3000;

console.log('Testing server startup...');

// Start the server
const { server } = require('./index');

// Wait 2 seconds then test endpoints
setTimeout(async () => {
    try {
        // Test health endpoint
        const healthRes = await fetch(`http://localhost:${PORT}/health`);
        const health = await healthRes.json();
        console.log('✓ Health check:', health);

        // Test ICE servers endpoint
        const iceRes = await fetch(`http://localhost:${PORT}/api/ice-servers`);
        const ice = await iceRes.json();
        console.log('✓ ICE servers:', ice);

        // Test create room
        const createRes = await fetch(`http://localhost:${PORT}/api/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                hostPeerID: 'test123',
                hostName: 'TestHost',
                isPrivate: false
            })
        });
        const room = await createRes.json();
        console.log('✓ Create room:', room);

        // Test list rooms
        const listRes = await fetch(`http://localhost:${PORT}/api/rooms`);
        const rooms = await listRes.json();
        console.log('✓ List rooms:', rooms);

        console.log('\n✓ All tests passed!');
        process.exit(0);
    } catch (err) {
        console.error('✗ Test failed:', err);
        process.exit(1);
    }
}, 2000);
