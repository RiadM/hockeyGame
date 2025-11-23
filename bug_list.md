# MULTIPLAYER BUG LIST

**Generated**: 2025-11-20
**Files**: manager.js, connection.js, sync.js, room.js, chat.js

---

## CRITICAL BUGS

### BUG-1: Turn-Based Timer Applied to Simultaneous Mode
**Severity**: CRIT
**File**: /home/user/hockeyGame/src/multiplayer/sync.js:218-221
**Impact**: Incorrect gameplay - current turn player loses 1pt/sec when all players should play simultaneously

**Code**:
```javascript
const currentTurnPlayer = this.roomManager.gameState.players[this.roomManager.gameState.currentTurn];
if (currentTurnPlayer) {
    currentTurnPlayer.score = Math.max(0, currentTurnPlayer.score - 1);
}
```

**Problem**: Timer loop applies per-second penalty to "current turn" player, but game is simultaneous mode where all play at once.

**Fix**: Remove turn penalties for simultaneous mode OR implement separate turn-based mode if needed.

---

### BUG-2: No Reconnection Support
**Severity**: CRIT
**File**: All multiplayer files
**Impact**: Temporary network issues = permanent player removal from game

**Missing**:
- Reconnection handshake protocol
- Player ID persistence after disconnect
- State restoration on rejoin
- Timeout grace period (e.g., 60s to reconnect)

**Current Behavior**:
- connection.on('close') → removePlayer() (manager.js:108-114)
- No way to rejoin same room with same player ID

**Fix**:
1. Add reconnection protocol: save playerID + roomCode in localStorage
2. Add rejoining handshake with playerID verification
3. Restore player state instead of creating new player
4. Add grace period before removing disconnected player

---

### BUG-3: No Host Migration
**Severity**: CRIT
**File**: All multiplayer files
**Impact**: Host disconnect = entire room dies, all players kicked

**Architecture**: Star topology - all connections to host only

**Current Behavior**:
- Host disconnect → all guest connections close
- sync.js:202-204: alert('Connection lost to host. Room closed.')
- No fallback host

**Fix**:
1. Detect host disconnect
2. Promote longest-connected guest to new host
3. Migrate peer connections (guests reconnect to new host)
4. Transfer gameState ownership
5. Update all player references

**Complexity**: High - requires mesh topology or coordinated migration

---

### BUG-4: Guest Missing TURN Servers
**Severity**: CRIT
**File**: /home/user/hockeyGame/src/multiplayer/connection.js:159-162
**Impact**: Guests cannot connect from restrictive NAT/firewall environments

**Code**:
```javascript
this.peer = new Peer(this.playerID, {
    debug: 2,
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
        ]
    },
    serialization: 'json'
});
```

**Problem**: Only STUN servers configured, no TURN fallback

**Compare Host** (connection.js:92-107): Has STUN + TURN (OpenRelay ports 80 & 443)

**Fix**: Add same TURN servers to guest config:
```javascript
{
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
},
{
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
}
```

---

## HIGH PRIORITY BUGS

### BUG-5: Alert() Blocks UI
**Severity**: HIGH
**Files**:
- /home/user/hockeyGame/src/multiplayer/manager.js:150
- /home/user/hockeyGame/src/multiplayer/sync.js:203

**Locations**:
1. `alert('Not all players are ready!')` - manager.js:150
2. `alert('Connection lost to host. Room closed.')` - sync.js:203

**Problem**: Blocking alerts interrupt multiplayer experience, prevent concurrent actions

**Fix**: Implement in-game notification system:
- Non-blocking toast/banner messages
- Styled with game theme (cyan/blue/slate)
- Auto-dismiss after 3-5 seconds
- Queue multiple messages

---

### BUG-6: Tight Coupling to Global Instance
**Severity**: HIGH
**File**: /home/user/hockeyGame/src/multiplayer/sync.js:189
**Impact**: Fragile integration, breaks if global unavailable

**Code**:
```javascript
case 'guessResult':
    const gameInstance = window.hockeyGameInstance;
    if (gameInstance) {
        const guess = data.guess;
        if (guess === gameInstance.correctAnswer) {
            gameInstance.handleCorrectGuess();
        } else {
            gameInstance.handleIncorrectGuess();
        }
    }
    break;
```

**Problem**: Direct access to window.hockeyGameInstance couples multiplayer to specific global

**Fix**:
- Pass game instance to MultiplayerManager constructor
- Or use event bus pattern for decoupling
- Or callback injection

---

### BUG-7: Fragile Guest Connection Retrieval
**Severity**: HIGH
**Files**: /home/user/hockeyGame/src/multiplayer/manager.js
**Locations**: Lines 183, 199, 215, 231, 244, 261

**Pattern**:
```javascript
const conn = Array.from(this.syncManager.connections.values())[0];
```

**Problem**:
- Assumes guest has exactly 1 connection
- Breaks if connections Map has 0 or 2+ entries
- Array.from() creates new array every call (inefficient)

**Fix**: Store host connection explicitly:
```javascript
// In joinRoom():
this.hostConnection = conn;

// In other methods:
if (this.hostConnection && this.hostConnection.open) {
    this.hostConnection.send(...);
}
```

---

### BUG-8: innerHTML for Clearing Elements
**Severity**: HIGH (security best practice)
**Files**:
- /home/user/hockeyGame/src/multiplayer/manager.js:61
- /home/user/hockeyGame/src/multiplayer/room.js:111

**Code**:
```javascript
// manager.js:61
if (chatMessages) chatMessages.innerHTML = '';

// room.js:111
leaderboardList.innerHTML = '';
```

**Problem**: innerHTML usage inconsistent with XSS prevention elsewhere (textContent used properly)

**Current Impact**: Low (no user data involved in clearing)

**Fix**: Use textContent = '' for consistency:
```javascript
chatMessages.textContent = '';
leaderboardList.textContent = '';
```

---

## MEDIUM PRIORITY BUGS

### BUG-9: No Message Validation
**Severity**: MEDIUM
**File**: /home/user/hockeyGame/src/multiplayer/sync.js:38-128
**Impact**: Malformed messages can crash app, DoS via spam

**Missing**:
- Type checking on message.type
- Required field validation (e.g., playerID, playerName)
- Data type validation (e.g., score is number)
- Rate limiting per sender

**Example Risk**:
```javascript
// Attacker sends:
conn.send({ type: 'scoreUpdate', score: 'HACKED' });
// Result: NaN propagates through app
```

**Fix**:
1. Validate message schema:
```javascript
const VALID_TYPES = ['join', 'chat', 'scoreUpdate', 'hintUsed', 'completed', 'ready', 'guess'];
if (!VALID_TYPES.includes(data.type)) return;
```

2. Add rate limiting:
```javascript
// Track messages per player
this.messageCount.set(fromPeer, (this.messageCount.get(fromPeer) || 0) + 1);
// Limit to 10 msgs/sec
```

---

### BUG-10: No Profanity Filter in Chat
**Severity**: MEDIUM
**File**: /home/user/hockeyGame/src/multiplayer/chat.js
**Impact**: Inappropriate content in chat

**Current**: 200 char length limit only (chat.js:13)

**Fix**:
- Basic profanity word list filter
- Replace with asterisks or reject message
- Or implement user reporting system

---

### BUG-11: Stale State Risk from localStorage
**Severity**: MEDIUM
**File**: /home/user/hockeyGame/src/multiplayer/room.js:24-26
**Impact**: Old gameState loaded, conflicts with new room

**Code**:
```javascript
const savedState = localStorage.getItem('gameState');
if (savedState) {
    this.gameState = JSON.parse(savedState);
}
```

**Problem**: No version check, timestamp, or roomCode validation

**Scenario**:
1. Create room ABCDEF yesterday
2. Browser crash, state saved
3. Create new room GHIJKL today
4. Loads old ABCDEF state → conflict

**Fix**: Add versioning:
```javascript
const savedState = localStorage.getItem('gameState');
if (savedState) {
    const state = JSON.parse(savedState);
    const roomCode = localStorage.getItem('roomCode');
    if (state.roomCode === roomCode && Date.now() - state.timestamp < 3600000) {
        this.gameState = state;
    }
}
```

---

### BUG-12: No Chat Timestamp Display
**Severity**: MEDIUM
**File**: /home/user/hockeyGame/src/multiplayer/chat.js
**Impact**: Users can't tell when messages sent

**Data**: timestamp stored (chat.js:14)
```javascript
timestamp: Date.now()
```

**UI**: Not rendered in addChatMessage() (chat.js:25-51)

**Fix**: Display relative time:
```javascript
const timeSpan = document.createElement('span');
timeSpan.className = 'chat-message-time';
timeSpan.textContent = formatRelativeTime(msg.timestamp);
messageEl.appendChild(timeSpan);
```

---

### BUG-13: Empty Turn Indicator Implementation
**Severity**: MEDIUM
**File**: /home/user/hockeyGame/src/multiplayer/sync.js:265-267
**Impact**: Dead code, unclear intent

**Code**:
```javascript
updateTurnIndicator(currentTurnPlayer) {
    // Not needed for simultaneous mode
}
```

**Problem**: Function exists but does nothing

**Fix**:
- Remove if truly not needed
- Or implement for future turn-based mode
- Or remove turn-passing logic entirely (lines 237-256)

---

## ARCHITECTURAL ISSUES (Not Bugs, but Limitations)

### ISSUE-A: Star Topology (No Mesh)
**Impact**: Single point of failure (host), no host migration possible
**Solution**: Migrate to mesh network or hybrid model

### ISSUE-B: No State Versioning
**Impact**: Hard to migrate/upgrade gameState schema
**Solution**: Add version field, migration functions

### ISSUE-C: localStorage Only (No Server)
**Impact**: No cross-device sync, lost on clear
**Solution**: Optional cloud save via backend

### ISSUE-D: No Analytics/Monitoring
**Impact**: Can't diagnose connection issues in production
**Solution**: Add telemetry (connection success rate, errors)

---

## SUMMARY

**Total Bugs**: 13
**Critical**: 4 (BUG-1 to BUG-4)
**High**: 4 (BUG-5 to BUG-8)
**Medium**: 5 (BUG-9 to BUG-13)

**Recommended Fix Order**:
1. BUG-4: Add guest TURN servers (5 min fix)
2. BUG-1: Remove turn penalties (10 min fix)
3. BUG-7: Store host connection reference (15 min fix)
4. BUG-8: Change innerHTML to textContent (2 min fix)
5. BUG-5: Replace alerts with toast notifications (1 hour)
6. BUG-6: Decouple game instance (30 min)
7. BUG-2: Add reconnection protocol (4-6 hours)
8. BUG-3: Implement host migration (8-12 hours)
9. BUG-9 to BUG-13: Incremental improvements

**Estimated Total Fix Time**: 16-20 hours for all bugs
