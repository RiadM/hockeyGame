// Room Module - Player management, ready system, room state
// Handles: players list, join/leave, ready state, leaderboard, start button

class RoomManager {
    constructor() {
        this.gameState = {
            players: {},
            currentTurn: null,
            turnTimeLeft: 60,
            chatMessages: [],
            gameStarted: false,
            currentRound: 1,
            timeLimit: null,
            gameMode: 'unlimited'
        };
        this.playerID = null;
        this.isHost = false;
    }

    initializeHost(playerID, playerName) {
        this.playerID = playerID;
        this.isHost = true;

        const savedState = localStorage.getItem('gameState');
        if (savedState) {
            this.gameState = JSON.parse(savedState);
        } else {
            this.gameState.players[playerID] = {
                name: playerName,
                score: 100,
                round: 1,
                hintsUsed: 0,
                completed: false,
                isHost: true,
                ready: false
            };
            this.gameState.currentTurn = playerID;
            this.gameState.gameStarted = false;
        }
    }

    addPlayer(playerID, playerName) {
        if (Object.keys(this.gameState.players).length >= 8) {
            return false;
        }

        this.gameState.players[playerID] = {
            name: playerName,
            score: 100,
            round: 1,
            hintsUsed: 0,
            completed: false,
            isHost: false,
            ready: false
        };
        return true;
    }

    removePlayer(playerID) {
        delete this.gameState.players[playerID];
    }

    updatePlayerScore(playerID, score) {
        if (this.gameState.players[playerID]) {
            this.gameState.players[playerID].score = score;
        }
    }

    updatePlayerHints(playerID, hintsUsed) {
        if (this.gameState.players[playerID]) {
            this.gameState.players[playerID].hintsUsed = hintsUsed;
        }
    }

    markPlayerCompleted(playerID, score) {
        if (this.gameState.players[playerID]) {
            this.gameState.players[playerID].completed = true;
            this.gameState.players[playerID].score = score;
        }
    }

    togglePlayerReady(playerID) {
        if (this.gameState.players[playerID]) {
            const newReadyState = !this.gameState.players[playerID].ready;
            this.gameState.players[playerID].ready = newReadyState;
            return newReadyState;
        }
        return false;
    }

    areAllPlayersReady() {
        return Object.values(this.gameState.players).every(p => p.ready);
    }

    startGame() {
        if (!this.isHost || this.gameState.gameStarted) return false;

        if (!this.areAllPlayersReady()) {
            return false;
        }

        this.gameState.gameStarted = true;
        return true;
    }

    updateLeaderboard(players) {
        const leaderboardList = document.querySelector('.leaderboard-list');
        if (!leaderboardList) return;

        const sorted = Object.entries(players).sort((a, b) => b[1].score - a[1].score);
        leaderboardList.innerHTML = '';

        sorted.forEach(([id, player], index) => {
            const item = document.createElement('div');
            let className = 'leaderboard-item';
            if (id === this.playerID) className += ' current-user';
            if (player.completed) className += ' completed';

            item.className = className;

            const hintsText = player.hintsUsed !== undefined ? `${player.hintsUsed}/3 hints` : '';
            const statusText = player.completed ? ' DONE' : '';
            const readyText = (!this.gameState.gameStarted && player.ready) ? ' READY' : '';

            // Create elements using DOM methods (XSS prevention)
            const rankDiv = document.createElement('div');
            rankDiv.className = 'leaderboard-rank';
            rankDiv.textContent = index + 1;

            const nameDiv = document.createElement('div');
            nameDiv.className = 'leaderboard-name';
            nameDiv.textContent = player.name + statusText + readyText;

            const hintsDiv = document.createElement('div');
            hintsDiv.className = 'leaderboard-hints';
            hintsDiv.textContent = hintsText;

            const scoreDiv = document.createElement('div');
            scoreDiv.className = 'leaderboard-score';
            scoreDiv.textContent = player.score;

            item.appendChild(rankDiv);
            item.appendChild(nameDiv);
            item.appendChild(hintsDiv);
            item.appendChild(scoreDiv);

            leaderboardList.appendChild(item);
        });

        const roomPlayersCount = document.querySelector('.room-players-count');
        if (roomPlayersCount) {
            roomPlayersCount.textContent = `${Object.keys(players).length}/8 Players`;
        }
    }

    updateStartButton() {
        if (!this.isHost) return;

        const startBtn = document.getElementById('start-game-btn');
        if (!startBtn || this.gameState.gameStarted) return;

        const allReady = this.areAllPlayersReady();
        const readyCount = Object.values(this.gameState.players).filter(p => p.ready).length;
        const totalCount = Object.values(this.gameState.players).length;

        if (allReady) {
            startBtn.disabled = false;
            startBtn.textContent = 'Start Game';
            startBtn.style.opacity = '1';
        } else {
            startBtn.disabled = true;
            startBtn.textContent = `Ready: ${readyCount}/${totalCount}`;
            startBtn.style.opacity = '0.5';
        }
    }

    saveState() {
        if (this.isHost) {
            localStorage.setItem('gameState', JSON.stringify(this.gameState));
        }
    }

    validatePlayerName(name) {
        if (!name || typeof name !== 'string') return null;

        const trimmed = name.trim();
        // 3-20 chars, letters, numbers, spaces, hyphens, apostrophes only
        if (trimmed.length < 3 || trimmed.length > 20) return null;
        if (!/^[a-zA-Z0-9\s\-']+$/.test(trimmed)) return null;

        return trimmed;
    }

    getFullSyncData() {
        return {
            players: this.gameState.players,
            chatMessages: this.gameState.chatMessages || [],
            currentRound: this.gameState.currentRound || 1,
            timeLimit: this.gameState.timeLimit || null,
            gameMode: this.gameState.gameMode || 'unlimited'
        };
    }
}

export { RoomManager };
