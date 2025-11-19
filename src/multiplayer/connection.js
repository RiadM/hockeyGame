// Connection Module - PeerJS setup, peer lifecycle, error handling
// Handles: peer.on('open'), peer.on('error'), STUN/TURN config, retry logic

class ConnectionManager {
    constructor() {
        this.peer = null;
        this.playerID = null;
        this.roomCode = null;
        this.onOpenCallback = null;
        this.onErrorCallback = null;
    }

    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }

    async checkConnectivity() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            await fetch('https://www.google.com/favicon.ico', {
                method: 'HEAD',
                mode: 'no-cors',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return true;
        } catch (err) {
            return false;
        }
    }

    displayConnectionError(message) {
        const roomCodeEl = document.querySelector('.room-code');
        if (roomCodeEl) {
            // Use DOM methods to prevent XSS
            roomCodeEl.textContent = '';

            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'color: #ef4444; font-size: 11px; text-align: center;';
            errorDiv.textContent = message;

            const retryBtn = document.createElement('button');
            retryBtn.className = 'btn btn-primary';
            retryBtn.style.cssText = 'width: 100%; margin-top: 8px; font-size: 11px; padding: 6px;';
            retryBtn.textContent = 'Retry Connection';
            retryBtn.onclick = () => window.location.reload();

            roomCodeEl.appendChild(errorDiv);
            roomCodeEl.appendChild(retryBtn);
        }
    }

    clearConnectionError() {
        const roomCodeEl = document.querySelector('.room-code');
        if (roomCodeEl) {
            roomCodeEl.textContent = this.roomCode || 'Connecting...';
        }
    }

    getUserFriendlyError(error) {
        if (!navigator.onLine) {
            return 'No internet connection';
        }
        if (error.message.includes('unavailable-id')) {
            return 'Room ID conflict. Please retry.';
        }
        if (error.message.includes('network') || error.message.includes('peer')) {
            return 'Network error. Check firewall settings.';
        }
        return error.message || 'Connection failed';
    }

    createHostPeer(playerName, isPrivate) {
        return new Promise((resolve, reject) => {
            if (this.peer) {
                this.peer.destroy();
                this.peer = null;
            }

            this.roomCode = this.generateRoomCode();
            this.playerID = 'host_' + this.roomCode.toLowerCase();

            this.peer = new Peer(this.playerID, {
                debug: 2,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        { urls: 'stun:stun2.l.google.com:19302' },
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
                    ],
                    iceTransportPolicy: 'all'
                },
                serialization: 'json'
            });

            const timeout = setTimeout(() => {
                reject(new Error('Connection timeout after 15 seconds'));
            }, 15000);

            this.peer.on('open', (id) => {
                clearTimeout(timeout);
                if (this.onOpenCallback) {
                    this.onOpenCallback(id);
                }
                resolve({ roomCode: this.roomCode, playerID: this.playerID });
            });

            this.peer.on('error', (err) => {
                clearTimeout(timeout);

                let userMessage = '';
                if (err.type === 'unavailable-id') {
                    localStorage.removeItem('hostPeerID');
                    localStorage.removeItem('roomCode');
                    localStorage.removeItem('gameState');
                    userMessage = 'Room ID conflict. Please try creating a new room.';
                } else if (err.type === 'network') {
                    userMessage = 'Cannot reach server. Check your internet connection.';
                } else if (err.type === 'peer-unavailable') {
                    userMessage = 'Cannot establish connection. Please check your network.';
                } else {
                    userMessage = `Connection error: ${err.message || 'Unknown error'}`;
                }

                this.displayConnectionError(userMessage);
                if (this.onErrorCallback) {
                    this.onErrorCallback(err);
                }
                reject(new Error(userMessage));
            });
        });
    }

    createGuestPeer(code) {
        return new Promise((resolve, reject) => {
            this.roomCode = code.toUpperCase();
            this.playerID = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

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

            this.peer.on('open', () => {
                if (this.onOpenCallback) {
                    this.onOpenCallback(this.playerID);
                }
                resolve({ playerID: this.playerID, hostPeerID: 'host_' + code.toLowerCase() });
            });

            this.peer.on('error', (err) => {

                let userMessage = '';
                switch(err.type) {
                    case 'peer-unavailable':
                        userMessage = 'Room not found. Check room code and try again.';
                        break;
                    case 'network':
                        userMessage = 'Cannot reach server. Check your internet connection.';
                        break;
                    case 'disconnected':
                        userMessage = 'Lost connection to server. Please rejoin the room.';
                        break;
                    case 'server-error':
                        userMessage = 'Server error. Please try again in a few moments.';
                        break;
                    default:
                        userMessage = `Connection error: ${err.message || 'Unknown error'}`;
                }

                this.displayConnectionError(userMessage);
                if (this.onErrorCallback) {
                    this.onErrorCallback(err);
                }
                reject(new Error(userMessage));
            });
        });
    }

    connectToPeer(hostPeerID) {
        let attempts = 0;
        const maxAttempts = 3;
        const retryDelays = [5000, 10000, 15000];

        return new Promise((resolve, reject) => {
            const attemptConnection = () => {
                attempts++;
                const conn = this.peer.connect(hostPeerID, { reliable: true });
                let connectionTimeout;
                let connected = false;
                let iceComplete = false;

                connectionTimeout = setTimeout(() => {
                    if (!connected || !iceComplete) {
                        conn.close();
                        if (attempts < maxAttempts) {
                            const delay = retryDelays[attempts - 1] || 15000;
                            setTimeout(attemptConnection, delay);
                        } else {
                            reject(new Error(`Connection failed after ${maxAttempts} attempts. Host may be offline or network issues detected.`));
                        }
                    }
                }, 30000);

                const checkIceState = () => {
                    if (conn.peerConnection) {
                        const pc = conn.peerConnection;
                        if (pc.iceGatheringState === 'complete') {
                            iceComplete = true;
                        } else if (pc.iceGatheringState === 'gathering') {
                            setTimeout(checkIceState, 500);
                        }
                    } else {
                        setTimeout(checkIceState, 100);
                    }
                };
                checkIceState();

                conn.on('open', () => {
                    const waitForIce = () => {
                        if (conn.peerConnection && conn.peerConnection.iceGatheringState === 'complete') {
                            connected = true;
                            iceComplete = true;
                            clearTimeout(connectionTimeout);
                            resolve(conn);
                        } else if (conn.peerConnection && conn.peerConnection.iceGatheringState === 'gathering') {
                            setTimeout(waitForIce, 500);
                        } else {
                            connected = true;
                            clearTimeout(connectionTimeout);
                            resolve(conn);
                        }
                    };
                    waitForIce();
                });

                conn.on('error', (err) => {
                    connected = true;
                    iceComplete = true;
                    clearTimeout(connectionTimeout);
                    if (attempts < maxAttempts) {
                        const delay = retryDelays[attempts - 1] || 15000;
                        this.displayConnectionError(`Connection failed. Retrying in ${delay/1000}s... (Attempt ${attempts}/${maxAttempts})`);
                        setTimeout(attemptConnection, delay);
                    } else {
                        const errorMsg = `Failed to connect after ${maxAttempts} attempts. Verify room code and host availability.`;
                        this.displayConnectionError(errorMsg);
                        reject(new Error(errorMsg));
                    }
                });
            };

            attemptConnection();
        });
    }

    onOpen(callback) {
        this.onOpenCallback = callback;
    }

    onError(callback) {
        this.onErrorCallback = callback;
    }

    destroy() {
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
    }
}

export { ConnectionManager };
