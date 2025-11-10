// Sync Module - State broadcasting and message handling
// Handles: broadcast(), handleMessage(), message types (scoreUpdate, hintUsed, completed, guess)

class SyncManager {
    constructor(roomManager, chatManager) {
        this.roomManager = roomManager;
        this.chatManager = chatManager;
        this.connections = new Map();
        this.isHost = false;
        this.turnTimer = null;
        this.turnDuration = 60;
    }

    setHost(isHost) {
        this.isHost = isHost;
    }

    addConnection(peerID, conn) {
        this.connections.set(peerID, conn);
    }

    removeConnection(peerID) {
        this.connections.delete(peerID);
    }

    broadcast(data) {
        this.connections.forEach((conn, peerID) => {
            if (conn.open) {
                try {
                    conn.send(data);
                } catch (err) {
                    console.error(`Failed to send to ${peerID}:`, err);
                    this.connections.delete(peerID);
                }
            }
        });
    }

    handleMessage(data, fromPeer, updateLeaderboardCallback, onPlayerJoinCallback) {
        if (!this.isHost) return;

        switch (data.type) {
            case 'join':
                const added = this.roomManager.addPlayer(data.playerID, data.playerName);
                if (!added) {
                    const conn = this.connections.get(data.playerID);
                    if (conn) {
                        conn.send({ type: 'error', message: 'Room full' });
                    }
                    return;
                }

                this.roomManager.saveState();

                const newConn = this.connections.get(data.playerID);
                if (newConn) {
                    newConn.send({
                        type: 'fullSync',
                        state: this.roomManager.getFullSyncData()
                    });
                }

                this.broadcast({ type: 'players', players: this.roomManager.gameState.players });
                if (updateLeaderboardCallback) {
                    updateLeaderboardCallback(this.roomManager.gameState.players);
                }
                if (onPlayerJoinCallback) {
                    onPlayerJoinCallback();
                }
                break;

            case 'chat':
                const playerName = this.roomManager.gameState.players[fromPeer]?.name || 'Unknown';
                const chatMsg = this.chatManager.addMessage(playerName, data.text);
                this.roomManager.gameState.chatMessages = this.chatManager.getMessages();
                this.roomManager.saveState();
                this.broadcast({ type: 'chat', ...chatMsg });
                this.chatManager.addChatMessage(chatMsg.playerName, chatMsg.text, false);
                break;

            case 'scoreUpdate':
                this.roomManager.updatePlayerScore(fromPeer, data.score);
                this.roomManager.saveState();
                this.broadcast({ type: 'players', players: this.roomManager.gameState.players });
                if (updateLeaderboardCallback) {
                    updateLeaderboardCallback(this.roomManager.gameState.players);
                }
                break;

            case 'hintUsed':
                this.roomManager.updatePlayerHints(fromPeer, data.hintsUsed);
                this.roomManager.saveState();
                this.broadcast({ type: 'players', players: this.roomManager.gameState.players });
                if (updateLeaderboardCallback) {
                    updateLeaderboardCallback(this.roomManager.gameState.players);
                }
                break;

            case 'completed':
                this.roomManager.markPlayerCompleted(fromPeer, data.score);
                this.roomManager.saveState();
                this.broadcast({ type: 'players', players: this.roomManager.gameState.players });
                if (updateLeaderboardCallback) {
                    updateLeaderboardCallback(this.roomManager.gameState.players);
                }
                break;

            case 'ready':
                const newReadyState = this.roomManager.togglePlayerReady(fromPeer);
                this.roomManager.saveState();
                this.broadcast({ type: 'players', players: this.roomManager.gameState.players });
                if (updateLeaderboardCallback) {
                    updateLeaderboardCallback(this.roomManager.gameState.players);
                }
                this.roomManager.updateStartButton();
                break;

            case 'guess':
                const conn = this.connections.get(fromPeer);
                if (conn) {
                    conn.send({
                        type: 'guessResult',
                        guess: data.guess,
                        playerID: data.playerID
                    });
                }
                break;
        }
    }

    setupGuestHandlers(conn, updateLeaderboardCallback, updateTimerCallback) {
        conn.on('data', (data) => {
            switch (data.type) {
                case 'fullSync':
                    this.roomManager.gameState = data.state;
                    if (updateLeaderboardCallback) {
                        updateLeaderboardCallback(data.state.players);
                    }
                    if (data.state.chatMessages) {
                        this.chatManager.loadChatHistory(data.state.chatMessages);
                    }
                    console.log('[Guest] Full state synced:', this.roomManager.gameState);
                    break;

                case 'state':
                    this.roomManager.gameState = data.state;
                    if (updateLeaderboardCallback) {
                        updateLeaderboardCallback(this.roomManager.gameState.players);
                    }
                    if (updateTimerCallback) {
                        updateTimerCallback(this.roomManager.gameState.turnTimeLeft);
                    }
                    this.chatManager.loadChatHistory(data.state.chatMessages);
                    if (data.state.gameStarted) {
                        const timerSection = document.getElementById('timer-section');
                        if (timerSection) timerSection.style.display = 'block';
                    }
                    break;

                case 'players':
                    this.roomManager.gameState.players = data.players;
                    if (updateLeaderboardCallback) {
                        updateLeaderboardCallback(data.players);
                    }
                    this.roomManager.updateStartButton();
                    break;

                case 'timer':
                    if (updateTimerCallback) {
                        updateTimerCallback(data.timeLeft);
                    }
                    break;

                case 'chat':
                    this.chatManager.addChatMessage(data.playerName, data.text, false);
                    if (updateLeaderboardCallback) {
                        updateLeaderboardCallback(this.roomManager.gameState.players);
                    }
                    break;

                case 'gameStarted':
                    this.roomManager.gameState = data.state;
                    if (updateLeaderboardCallback) {
                        updateLeaderboardCallback(this.roomManager.gameState.players);
                    }
                    const timerSection = document.getElementById('timer-section');
                    if (timerSection) timerSection.style.display = 'block';
                    break;

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
            }
        });

        conn.on('close', () => {
            alert('Connection lost to host. Room closed.');
        });
    }

    startTimerLoop() {
        if (!this.isHost) return;
        if (this.turnTimer) clearInterval(this.turnTimer);

        this.turnTimer = setInterval(() => {
            this.roomManager.gameState.turnTimeLeft--;

            if (this.roomManager.gameState.turnTimeLeft <= 0) {
                this.passTurnToNext();
            } else {
                // Apply -1pt penalty to current player
                const currentTurnPlayer = this.roomManager.gameState.players[this.roomManager.gameState.currentTurn];
                if (currentTurnPlayer) {
                    currentTurnPlayer.score = Math.max(0, currentTurnPlayer.score - 1);
                }

                this.roomManager.saveState();
                this.broadcast({
                    type: 'timer',
                    timeLeft: this.roomManager.gameState.turnTimeLeft,
                    currentTurn: this.roomManager.gameState.currentTurn
                });
                this.broadcast({ type: 'players', players: this.roomManager.gameState.players });

                this.updateTimer(this.roomManager.gameState.turnTimeLeft);
                this.roomManager.updateLeaderboard(this.roomManager.gameState.players);
            }
        }, 1000);
    }

    passTurnToNext() {
        if (!this.isHost) return;

        const playerIDs = Object.keys(this.roomManager.gameState.players);
        const currentIndex = playerIDs.indexOf(this.roomManager.gameState.currentTurn);
        const nextIndex = (currentIndex + 1) % playerIDs.length;

        this.roomManager.gameState.currentTurn = playerIDs[nextIndex];
        this.roomManager.gameState.turnTimeLeft = this.turnDuration;

        this.roomManager.saveState();
        this.broadcast({
            type: 'timer',
            timeLeft: this.roomManager.gameState.turnTimeLeft,
            currentTurn: this.roomManager.gameState.currentTurn
        });

        this.updateTimer(this.roomManager.gameState.turnTimeLeft);
        this.updateTurnIndicator(this.roomManager.gameState.currentTurn);
    }

    updateTimer(timeLeft) {
        const timerDisplay = document.getElementById('timer-display-value');
        if (timerDisplay) {
            timerDisplay.textContent = timeLeft;
        }
    }

    updateTurnIndicator(currentTurnPlayer) {
        // Not needed for simultaneous mode
    }

    stopTimer() {
        if (this.turnTimer) {
            clearInterval(this.turnTimer);
            this.turnTimer = null;
        }
    }
}

export { SyncManager };
