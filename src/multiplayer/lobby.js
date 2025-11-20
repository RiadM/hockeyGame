// Lobby Module - Room discovery and listing
// Pure P2P lobby using special lobby peer + optional Node.js fallback

class LobbyManager {
    constructor() {
        this.lobbyPeer = null;
        this.lobbyConnection = null;
        this.rooms = new Map();
        this.heartbeatInterval = null;
        this.isLobbyHost = false;
        this.fallbackURL = 'https://your-server.com/api/lobby'; // Optional backend
        this.passwordAttempts = new Map(); // roomCode -> [timestamps of failures]
        this.MAX_ATTEMPTS = 3;
        this.RATE_LIMIT_WINDOW = 60000; // 1 minute in ms
    }

    async hashPassword(password) {
        if (!password) return null;
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async verifyPassword(inputPassword, storedHash) {
        if (!storedHash) return true;
        const inputHash = await this.hashPassword(inputPassword);
        return inputHash === storedHash;
    }

    validatePassword(password) {
        if (!password || typeof password !== 'string') {
            return { valid: false, error: 'Password required' };
        }
        const trimmed = password.trim();
        if (trimmed.length < 6) {
            return { valid: false, error: 'Password min 6 chars' };
        }
        if (trimmed.length > 50) {
            return { valid: false, error: 'Password max 50 chars' };
        }
        return { valid: true, password: trimmed };
    }

    checkRateLimit(roomCode) {
        const now = Date.now();
        if (!this.passwordAttempts.has(roomCode)) {
            this.passwordAttempts.set(roomCode, []);
        }

        const attempts = this.passwordAttempts.get(roomCode);
        const recentAttempts = attempts.filter(t => now - t < this.RATE_LIMIT_WINDOW);
        this.passwordAttempts.set(roomCode, recentAttempts);

        if (recentAttempts.length >= this.MAX_ATTEMPTS) {
            const oldestAttempt = recentAttempts[0];
            const timeLeft = Math.ceil((this.RATE_LIMIT_WINDOW - (now - oldestAttempt)) / 1000);
            return { allowed: false, timeLeft };
        }

        return { allowed: true };
    }

    recordFailedAttempt(roomCode) {
        const now = Date.now();
        if (!this.passwordAttempts.has(roomCode)) {
            this.passwordAttempts.set(roomCode, []);
        }
        this.passwordAttempts.get(roomCode).push(now);
    }

    showPasswordFeedback(message, isError = true) {
        const feedback = document.getElementById('password-feedback');
        if (!feedback) return;

        feedback.textContent = message;
        feedback.className = isError ? 'password-feedback error' : 'password-feedback success';
        feedback.style.display = 'block';

        if (!isError) {
            setTimeout(() => {
                feedback.style.display = 'none';
            }, 2000);
        }
    }

    connectToLobby() {
        return new Promise((resolve, reject) => {
            const lobbyPeerID = 'hockey_lobby_v1';

            this.lobbyPeer = new Peer({
                debug: 0,
                config: {
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                }
            });

            this.lobbyPeer.on('open', () => {
                this.lobbyConnection = this.lobbyPeer.connect(lobbyPeerID, { reliable: true });

                this.lobbyConnection.on('open', () => {
                    this.setupLobbyHandlers();
                    resolve();
                });

                this.lobbyConnection.on('error', () => {
                    this.useFallbackAPI();
                    resolve();
                });
            });

            this.lobbyPeer.on('error', () => {
                this.useFallbackAPI();
                resolve();
            });

            setTimeout(() => {
                if (!this.lobbyConnection || !this.lobbyConnection.open) {
                    this.useFallbackAPI();
                    resolve();
                }
            }, 5000);
        });
    }

    setupLobbyHandlers() {
        this.lobbyConnection.on('data', (data) => {
            if (data.type === 'rooms') {
                this.updateRoomList(data.rooms);
            }
        });
    }

    async registerRoom(roomCode, hostPeerID, hostName, isPrivate, password = null) {
        const passwordHash = await this.hashPassword(password);

        const roomData = {
            roomCode,
            hostPeerID,
            hostName,
            playerCount: 1,
            maxPlayers: 8,
            isPrivate,
            passwordHash,
            createdAt: Date.now()
        };

        if (this.lobbyConnection && this.lobbyConnection.open) {
            this.lobbyConnection.send({
                type: 'register',
                room: roomData
            });

            this.startHeartbeat(roomCode);
        } else {
            await this.registerRoomFallback(roomData);
        }
    }

    async unregisterRoom(roomCode) {
        this.stopHeartbeat();

        if (this.lobbyConnection && this.lobbyConnection.open) {
            this.lobbyConnection.send({
                type: 'unregister',
                roomCode
            });
        } else {
            await this.unregisterRoomFallback(roomCode);
        }
    }

    startHeartbeat(roomCode) {
        this.heartbeatInterval = setInterval(() => {
            if (this.lobbyConnection && this.lobbyConnection.open) {
                this.lobbyConnection.send({
                    type: 'heartbeat',
                    roomCode
                });
            }
        }, 30000);
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    async fetchPublicRooms() {
        if (this.lobbyConnection && this.lobbyConnection.open) {
            this.lobbyConnection.send({ type: 'list' });
        } else {
            await this.fetchRoomsFallback();
        }
    }

    updateRoomList(rooms) {
        this.rooms.clear();
        rooms.forEach(room => {
            this.rooms.set(room.roomCode, room);
        });
        this.renderRoomList();
    }

    renderRoomList() {
        const container = document.getElementById('lobby-room-list');
        if (!container) return;

        container.textContent = '';

        if (this.rooms.size === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'lobby-empty';
            emptyMsg.textContent = 'No public rooms available';
            container.appendChild(emptyMsg);
            return;
        }

        const sortedRooms = Array.from(this.rooms.values())
            .sort((a, b) => b.createdAt - a.createdAt);

        sortedRooms.forEach(room => {
            const roomEl = document.createElement('div');
            roomEl.className = 'lobby-room-item';

            const headerDiv = document.createElement('div');
            headerDiv.className = 'lobby-room-header';

            const codeSpan = document.createElement('span');
            codeSpan.className = 'lobby-room-code';
            codeSpan.textContent = room.roomCode;

            const countSpan = document.createElement('span');
            countSpan.className = 'lobby-room-count';
            countSpan.textContent = `${room.playerCount}/${room.maxPlayers}`;

            headerDiv.appendChild(codeSpan);
            headerDiv.appendChild(countSpan);

            const hostDiv = document.createElement('div');
            hostDiv.className = 'lobby-room-host';
            hostDiv.textContent = `Host: ${room.hostName}`;

            const joinBtn = document.createElement('button');
            joinBtn.className = 'btn btn-primary lobby-join-btn';
            joinBtn.textContent = room.passwordHash ? 'Join (Password)' : 'Join';
            joinBtn.onclick = () => this.handleJoinRoom(room);

            roomEl.appendChild(headerDiv);
            roomEl.appendChild(hostDiv);
            roomEl.appendChild(joinBtn);

            container.appendChild(roomEl);
        });
    }

    async handleJoinRoom(room) {
        if (room.passwordHash) {
            const rateLimitCheck = this.checkRateLimit(room.roomCode);
            if (!rateLimitCheck.allowed) {
                this.showPasswordFeedback(
                    `Too many attempts. Wait ${rateLimitCheck.timeLeft}s`,
                    true
                );
                return;
            }

            const password = prompt('Enter room password (6-50 chars):');
            if (!password) return;

            const validation = this.validatePassword(password);
            if (!validation.valid) {
                this.showPasswordFeedback(validation.error, true);
                this.recordFailedAttempt(room.roomCode);
                return;
            }

            const valid = await this.verifyPassword(validation.password, room.passwordHash);
            if (!valid) {
                this.recordFailedAttempt(room.roomCode);
                const remaining = this.MAX_ATTEMPTS - 1;
                if (remaining > 0) {
                    this.showPasswordFeedback(`Wrong password. ${remaining} attempts left`, true);
                } else {
                    this.showPasswordFeedback('Wrong password. Account locked for 1 min', true);
                }
                return;
            }

            this.showPasswordFeedback('Password correct', false);
        }

        if (window.multiplayerManager) {
            const playerName = prompt('Enter your name:');
            if (!playerName) return;

            try {
                await window.multiplayerManager.joinRoom(room.roomCode, playerName);
            } catch (err) {
                this.showPasswordFeedback(`Failed to join: ${err.message}`, true);
            }
        }
    }

    useFallbackAPI() {
        this.lobbyConnection = null;
    }

    async registerRoomFallback(roomData) {
        try {
            await fetch(`${this.fallbackURL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(roomData)
            });
        } catch (err) {
            console.warn('Fallback registration failed:', err);
        }
    }

    async unregisterRoomFallback(roomCode) {
        try {
            await fetch(`${this.fallbackURL}/unregister`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomCode })
            });
        } catch (err) {
            console.warn('Fallback unregister failed:', err);
        }
    }

    async fetchRoomsFallback() {
        try {
            const response = await fetch(`${this.fallbackURL}/list`);
            const rooms = await response.json();
            this.updateRoomList(rooms);
        } catch (err) {
            console.warn('Fallback fetch failed:', err);
            this.updateRoomList([]);
        }
    }

    disconnect() {
        this.stopHeartbeat();
        if (this.lobbyConnection) {
            this.lobbyConnection.close();
            this.lobbyConnection = null;
        }
        if (this.lobbyPeer) {
            this.lobbyPeer.destroy();
            this.lobbyPeer = null;
        }
    }
}

export { LobbyManager };
