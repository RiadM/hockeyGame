// Manager Module - Main orchestration class
// Orchestrates ConnectionManager, RoomManager, ChatManager, SyncManager
// Exposes public API for ui.js

import { ConnectionManager } from './connection.js';
import { RoomManager } from './room.js';
import { ChatManager } from './chat.js';
import { SyncManager } from './sync.js';

class MultiplayerManager {
    constructor() {
        this.connectionManager = new ConnectionManager();
        this.roomManager = new RoomManager();
        this.chatManager = new ChatManager();
        this.syncManager = new SyncManager(this.roomManager, this.chatManager);

        this.playerID = null;
        this.playerName = null;
        this.isHost = false;
        this.roomCode = null;
    }

    get gameState() {
        return this.roomManager.gameState;
    }

    async createRoom(playerName, isPrivate = false) {
        const maxAttempts = 3;
        const backoffDelays = [0, 2000, 5000];

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            console.log(`[Room Creation] Attempt ${attempt + 1}/${maxAttempts}`);

            if (backoffDelays[attempt] > 0) {
                await new Promise(resolve => setTimeout(resolve, backoffDelays[attempt]));
            }

            try {
                const isOnline = await this.connectionManager.checkConnectivity();
                if (!isOnline) {
                    throw new Error('No internet connection. Check your network and try again.');
                }

                const roomCode = await this.createRoomAttempt(playerName, isPrivate);
                console.log('[Room Creation] Success on attempt', attempt + 1);
                this.connectionManager.clearConnectionError();
                return roomCode;

            } catch (error) {
                console.error(`[Room Creation] Attempt ${attempt + 1} failed:`, error.message);

                if (attempt === maxAttempts - 1) {
                    const errorMsg = this.connectionManager.getUserFriendlyError(error);
                    this.connectionManager.displayConnectionError(errorMsg);
                    throw new Error(errorMsg);
                }
            }
        }
    }

    async createRoomAttempt(playerName, isPrivate) {
        this.playerName = playerName;
        this.isHost = true;

        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages) chatMessages.innerHTML = '';

        const { roomCode, playerID } = await this.connectionManager.createHostPeer(playerName, isPrivate);
        this.roomCode = roomCode;
        this.playerID = playerID;

        this.roomManager.playerID = playerID;
        this.roomManager.initializeHost(playerID, playerName);
        this.syncManager.setHost(true);

        localStorage.setItem('hostPeerID', playerID);
        localStorage.setItem('roomCode', roomCode);
        this.roomManager.saveState();

        this.setupHostListeners();
        this.roomManager.updateLeaderboard(this.roomManager.gameState.players);

        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) {
            startBtn.style.display = 'block';
            startBtn.onclick = () => this.startGame();
        }

        return roomCode;
    }

    setupHostListeners() {
        this.connectionManager.peer.on('connection', (conn) => {
            conn.on('open', () => {
                this.syncManager.addConnection(conn.peer, conn);

                // Send current state to new player
                conn.send({
                    type: 'state',
                    state: this.roomManager.gameState
                });
            });

            conn.on('data', (data) => {
                this.syncManager.handleMessage(
                    data,
                    conn.peer,
                    (players) => this.roomManager.updateLeaderboard(players),
                    () => this.roomManager.updateLeaderboard(this.roomManager.gameState.players)
                );
            });

            conn.on('close', () => {
                this.roomManager.removePlayer(conn.peer);
                this.syncManager.removeConnection(conn.peer);
                this.roomManager.saveState();
                this.syncManager.broadcast({ type: 'players', players: this.roomManager.gameState.players });
            });
        });
    }

    async joinRoom(code, playerName) {
        this.playerName = playerName;
        this.isHost = false;
        this.roomCode = code.toUpperCase();

        const { playerID, hostPeerID } = await this.connectionManager.createGuestPeer(code);
        this.playerID = playerID;
        this.roomManager.playerID = playerID;
        this.syncManager.setHost(false);

        const conn = await this.connectionManager.connectToPeer(hostPeerID);

        conn.send({
            type: 'join',
            playerID: playerID,
            playerName: playerName
        });

        localStorage.setItem('playerID_' + code, playerID);
        localStorage.setItem('hostPeerID_' + code, hostPeerID);

        this.syncManager.addConnection(hostPeerID, conn);
        this.syncManager.setupGuestHandlers(
            conn,
            (players) => this.roomManager.updateLeaderboard(players),
            (timeLeft) => this.syncManager.updateTimer(timeLeft)
        );
    }

    startGame() {
        if (!this.isHost || this.roomManager.gameState.gameStarted) return;

        if (!this.roomManager.areAllPlayersReady()) {
            alert('Not all players are ready!');
            return;
        }

        const started = this.roomManager.startGame();
        if (!started) return;

        this.roomManager.saveState();

        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) startBtn.style.display = 'none';

        const timerSection = document.getElementById('timer-section');
        if (timerSection) timerSection.style.display = 'block';

        this.syncManager.startTimerLoop();

        this.syncManager.broadcast({
            type: 'gameStarted',
            state: this.roomManager.gameState
        });
    }

    sendChatMessage(text) {
        if (!text.trim()) return;

        if (this.isHost) {
            const msg = this.chatManager.addMessage(this.playerName, text);
            this.roomManager.gameState.chatMessages = this.chatManager.getMessages();
            this.roomManager.saveState();
            this.syncManager.broadcast({ type: 'chat', ...msg });
            this.chatManager.addChatMessage(msg.playerName, msg.text, false);
        } else {
            const conn = Array.from(this.syncManager.connections.values())[0];
            if (conn) {
                conn.send({
                    type: 'chat',
                    text: text.trim().substring(0, 200)
                });
            }
        }
    }

    updatePlayerScore(newScore) {
        if (this.isHost) {
            this.roomManager.updatePlayerScore(this.playerID, newScore);
            this.roomManager.saveState();
            this.syncManager.broadcast({ type: 'players', players: this.roomManager.gameState.players });
        } else {
            const conn = Array.from(this.syncManager.connections.values())[0];
            if (conn) {
                conn.send({
                    type: 'scoreUpdate',
                    score: newScore
                });
            }
        }
    }

    broadcastHintUsed(hintsUsed) {
        if (this.isHost) {
            this.roomManager.updatePlayerHints(this.playerID, hintsUsed);
            this.roomManager.saveState();
            this.syncManager.broadcast({ type: 'players', players: this.roomManager.gameState.players });
        } else {
            const conn = Array.from(this.syncManager.connections.values())[0];
            if (conn) {
                conn.send({
                    type: 'hintUsed',
                    hintsUsed: hintsUsed
                });
            }
        }
    }

    broadcastCompletion(score) {
        if (this.isHost) {
            this.roomManager.markPlayerCompleted(this.playerID, score);
            this.roomManager.saveState();
            this.syncManager.broadcast({ type: 'players', players: this.roomManager.gameState.players });
        } else {
            const conn = Array.from(this.syncManager.connections.values())[0];
            if (conn) {
                conn.send({
                    type: 'completed',
                    score: score
                });
            }
        }
    }

    sendGuess(guess) {
        if (!this.isHost) {
            const conn = Array.from(this.syncManager.connections.values())[0];
            if (conn) {
                conn.send({ type: 'guess', guess: guess, playerID: this.playerID });
            }
        }
    }

    toggleReady() {
        if (this.roomManager.gameState.gameStarted) return;

        const newReadyState = this.roomManager.togglePlayerReady(this.playerID);
        this.roomManager.saveState();

        if (this.isHost) {
            this.syncManager.broadcast({ type: 'players', players: this.roomManager.gameState.players });
            this.roomManager.updateLeaderboard(this.roomManager.gameState.players);
            this.roomManager.updateStartButton();
        } else {
            const conn = Array.from(this.syncManager.connections.values())[0];
            if (conn) {
                conn.send({
                    type: 'ready',
                    ready: newReadyState
                });
            }
            this.roomManager.updateLeaderboard(this.roomManager.gameState.players);
        }

        const readyBtn = document.getElementById('ready-btn');
        if (readyBtn) {
            readyBtn.textContent = newReadyState ? 'Unready' : 'Ready Up';
            readyBtn.style.background = newReadyState ?
                'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' :
                'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)';
        }
    }

    updateLeaderboard(players) {
        this.roomManager.updateLeaderboard(players);
    }

    updateStartButton() {
        this.roomManager.updateStartButton();
    }

    validatePlayerName(name) {
        return this.roomManager.validatePlayerName(name);
    }

    disconnect() {
        this.syncManager.stopTimer();
        this.connectionManager.destroy();
    }
}

export { MultiplayerManager };
