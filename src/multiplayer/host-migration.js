// Host Migration - Detects host disconnect, elects oldest guest, re-establishes P2P

class HostMigration {
    constructor(manager) {
        this.manager = manager;
        this.migrationInProgress = false;
        this.joinOrder = [];
    }

    recordPlayerJoin(playerID) {
        if (!this.joinOrder.includes(playerID)) this.joinOrder.push(playerID);
    }

    recordPlayerLeave(playerID) {
        const index = this.joinOrder.indexOf(playerID);
        if (index > -1) this.joinOrder.splice(index, 1);
    }

    onHostDisconnect() {
        if (this.migrationInProgress || this.manager.isHost) return;
        this.migrationInProgress = true;
        this.electNewHost() ? this.promoteToHost() : this.waitForNewHost();
    }

    electNewHost() {
        const guestJoinOrder = this.joinOrder.filter(id => {
            const player = this.manager.roomManager.gameState.players[id];
            return player && !player.isHost;
        });
        if (guestJoinOrder.length === 0) {
            this.handleRoomDeath();
            return false;
        }
        return guestJoinOrder[0] === this.manager.playerID;
    }

    async promoteToHost() {
        const oldPlayerID = this.manager.playerID;
        const oldPlayerData = this.manager.roomManager.gameState.players[oldPlayerID];
        const oldHostID = Object.keys(this.manager.roomManager.gameState.players)
            .find(id => this.manager.roomManager.gameState.players[id].isHost && id !== oldPlayerID);
        if (oldHostID) delete this.manager.roomManager.gameState.players[oldHostID];

        const newHostID = 'host_' + this.manager.roomCode.toLowerCase();
        if (this.manager.connectionManager.peer) this.manager.connectionManager.peer.destroy();

        try {
            await this.manager.connectionManager.createHostPeer(this.manager.playerName, false);
            this.manager.playerID = newHostID;
            this.manager.isHost = true;
            this.manager.roomManager.playerID = newHostID;
            this.manager.roomManager.isHost = true;
            this.manager.syncManager.setHost(true);

            if (oldPlayerData) {
                this.manager.roomManager.gameState.players[newHostID] = { ...oldPlayerData, isHost: true };
                delete this.manager.roomManager.gameState.players[oldPlayerID];
            }

            this.recordPlayerLeave(oldPlayerID);
            this.recordPlayerJoin(newHostID);
            this.manager.roomManager.saveState();
            this.manager.setupHostListeners();
            this.manager.syncManager.broadcast({ type: 'hostChanged', newHostID, roomCode: this.manager.roomCode });

            const startBtn = document.getElementById('start-game-btn');
            if (startBtn && !this.manager.roomManager.gameState.gameStarted) startBtn.style.display = 'block';
            this.manager.roomManager.updateLeaderboard(this.manager.roomManager.gameState.players);

            this.migrationInProgress = false;
            this.notify('You are now the host', 'success');
        } catch (error) {
            this.migrationInProgress = false;
            this.notify('Host migration failed: ' + error.message, 'error');
        }
    }

    waitForNewHost() {
        const timeout = setTimeout(() => {
            this.migrationInProgress = false;
            this.notify('Host migration timeout. Room may be unstable.', 'warning');
        }, 10000);

        const checkInterval = setInterval(() => {
            if (!this.migrationInProgress) {
                clearInterval(checkInterval);
                clearTimeout(timeout);
            }
        }, 500);
    }

    async reconnectToNewHost(newHostID) {
        if (this.manager.isHost) return;
        if (this.manager.connectionManager.peer) this.manager.connectionManager.peer.destroy();

        try {
            const { playerID } = await this.manager.connectionManager.createGuestPeer(this.manager.roomCode);
            this.manager.playerID = playerID;
            this.manager.roomManager.playerID = playerID;

            const conn = await this.manager.connectionManager.connectToPeer(newHostID);
            conn.send({ type: 'rejoin', playerID, playerName: this.manager.playerName });

            this.manager.syncManager.addConnection(newHostID, conn);
            this.manager.syncManager.setupGuestHandlers(
                conn,
                (players) => this.manager.roomManager.updateLeaderboard(players),
                (timeLeft) => this.manager.syncManager.updateTimer(timeLeft)
            );

            this.migrationInProgress = false;
            this.notify('Reconnected to new host', 'success');
        } catch (error) {
            this.migrationInProgress = false;
            this.notify('Reconnection failed: ' + error.message, 'error');
        }
    }

    handleRoomDeath() {
        alert('All players have left. Room closed.');
        window.location.reload();
    }

    notify(message, type) {
        const chatMessages = document.querySelector('.chat-messages');
        if (!chatMessages) return;
        const notice = document.createElement('div');
        notice.style.cssText = `padding: 8px; margin: 4px 0; border-radius: 4px; font-size: 11px; text-align: center;`;
        if (type === 'success') notice.style.background = '#d1fae5';
        else if (type === 'error') notice.style.background = '#fee2e2';
        else if (type === 'warning') notice.style.background = '#fef3c7';
        notice.textContent = message;
        chatMessages.appendChild(notice);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

export { HostMigration };
