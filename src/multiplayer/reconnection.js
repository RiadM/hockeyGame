// Reconnection - Network drop recovery with automatic rejoin
// Handles: connection monitoring, exponential backoff, state restoration, 60s timeout

class ReconnectionManager {
    constructor(manager) {
        this.manager = manager;
        this.reconnecting = false;
        this.reconnectAttempts = 0;
        this.maxReconnectTime = 60000; // 60s timeout
        this.reconnectStartTime = null;
        this.retryDelays = [0, 2000, 5000, 10000, 15000, 30000]; // Exponential backoff
        this.reconnectTimeout = null;
        this.connectionCheckInterval = null;
    }

    startConnectionMonitoring(conn) {
        // Monitor connection health
        conn.on('close', () => {
            if (!this.reconnecting && !this.manager.roomManager.gameState.gameEnded) {
                this.handleDisconnect();
            }
        });

        conn.on('error', (err) => {
            if (!this.reconnecting) {
                this.handleDisconnect();
            }
        });
    }

    handleDisconnect() {
        if (this.manager.isHost) return; // Host uses migration logic

        this.reconnecting = true;
        this.reconnectAttempts = 0;
        this.reconnectStartTime = Date.now();
        this.showReconnectingUI();

        // Store playerID for reconnection
        const storageKey = 'playerID_' + this.manager.roomCode;
        localStorage.setItem(storageKey, this.manager.playerID);
        localStorage.setItem(storageKey + '_name', this.manager.playerName);

        this.attemptReconnect();
    }

    async attemptReconnect() {
        const elapsed = Date.now() - this.reconnectStartTime;

        // Check 60s timeout
        if (elapsed > this.maxReconnectTime) {
            this.handleReconnectFailure();
            return;
        }

        const delay = this.retryDelays[Math.min(this.reconnectAttempts, this.retryDelays.length - 1)];
        this.updateReconnectingUI(this.reconnectAttempts + 1, delay);

        if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        this.reconnectAttempts++;

        try {
            await this.performReconnect();
            this.handleReconnectSuccess();
        } catch (error) {
            // Continue trying until timeout
            if (Date.now() - this.reconnectStartTime < this.maxReconnectTime) {
                this.attemptReconnect();
            } else {
                this.handleReconnectFailure();
            }
        }
    }

    async performReconnect() {
        const hostPeerID = localStorage.getItem('hostPeerID_' + this.manager.roomCode);
        const originalPlayerID = localStorage.getItem('playerID_' + this.manager.roomCode);

        if (!hostPeerID) throw new Error('No host ID found');
        if (!originalPlayerID) throw new Error('No player ID found');

        // Destroy existing peer
        if (this.manager.connectionManager.peer) {
            this.manager.connectionManager.peer.destroy();
        }

        // Recreate peer with original playerID to preserve state
        const { playerID } = await this.manager.connectionManager.createGuestPeer(
            this.manager.roomCode,
            originalPlayerID
        );

        // Update manager state
        this.manager.playerID = playerID;
        this.manager.roomManager.playerID = playerID;

        // Connect to host
        const conn = await this.manager.connectionManager.connectToPeer(hostPeerID);

        // Send rejoin message
        conn.send({
            type: 'rejoin',
            playerID: originalPlayerID,
            playerName: this.manager.playerName
        });

        // Setup connection handlers
        this.manager.syncManager.addConnection(hostPeerID, conn);
        this.manager.syncManager.setupGuestHandlers(
            conn,
            (players) => this.manager.roomManager.updateLeaderboard(players),
            (timeLeft) => this.manager.syncManager.updateTimer(timeLeft)
        );

        // Monitor new connection
        this.startConnectionMonitoring(conn);
    }

    handleReconnectSuccess() {
        this.reconnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectStartTime = null;
        this.showReconnectedUI();

        // Clear UI after 3 seconds
        setTimeout(() => this.clearReconnectUI(), 3000);
    }

    handleReconnectFailure() {
        this.reconnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectStartTime = null;
        this.showReconnectFailedUI();

        // Notify user and offer manual rejoin
        setTimeout(() => {
            const retry = confirm('Failed to reconnect after 60 seconds. Reload to try rejoining?');
            if (retry) window.location.reload();
        }, 2000);
    }

    showReconnectingUI() {
        const indicator = this.getOrCreateIndicator();
        indicator.style.background = '#fef3c7';
        indicator.style.color = '#92400e';
        indicator.textContent = 'Connection lost. Reconnecting...';
        indicator.style.display = 'block';
    }

    updateReconnectingUI(attempt, nextDelay) {
        const indicator = this.getOrCreateIndicator();
        const elapsed = Math.floor((Date.now() - this.reconnectStartTime) / 1000);
        indicator.textContent = `Reconnecting... (attempt ${attempt}, ${60 - elapsed}s left)`;
    }

    showReconnectedUI() {
        const indicator = this.getOrCreateIndicator();
        indicator.style.background = '#d1fae5';
        indicator.style.color = '#065f46';
        indicator.textContent = 'Reconnected!';
    }

    showReconnectFailedUI() {
        const indicator = this.getOrCreateIndicator();
        indicator.style.background = '#fee2e2';
        indicator.style.color = '#991b1b';
        indicator.textContent = 'Reconnection failed';
    }

    clearReconnectUI() {
        const indicator = document.getElementById('reconnect-indicator');
        if (indicator) indicator.style.display = 'none';
    }

    getOrCreateIndicator() {
        let indicator = document.getElementById('reconnect-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'reconnect-indicator';
            indicator.style.cssText = `
                padding: 8px;
                margin: 8px 0;
                border-radius: 4px;
                font-size: 11px;
                text-align: center;
                font-weight: 600;
                display: none;
            `;

            const roomInfo = document.querySelector('.room-info');
            if (roomInfo) {
                roomInfo.insertBefore(indicator, roomInfo.firstChild);
            }
        }
        return indicator;
    }

    cleanup() {
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        if (this.connectionCheckInterval) clearInterval(this.connectionCheckInterval);
        this.clearReconnectUI();
        // Clear all disconnect timers
        if (this.disconnectTimers) {
            this.disconnectTimers.forEach(timer => clearTimeout(timer));
            this.disconnectTimers.clear();
        }
    }

    // Host-side: Track disconnected players and remove after 60s if no reconnect
    trackDisconnectedPlayer(playerID, removeCallback) {
        if (!this.disconnectTimers) {
            this.disconnectTimers = new Map();
        }

        // Set 60s timeout
        const timer = setTimeout(() => {
            removeCallback();
            this.disconnectTimers.delete(playerID);
        }, 60000);

        this.disconnectTimers.set(playerID, timer);
    }

    // Host-side: Cancel timeout when player reconnects
    cancelDisconnectTimeout(playerID) {
        if (!this.disconnectTimers) return;

        const timer = this.disconnectTimers.get(playerID);
        if (timer) {
            clearTimeout(timer);
            this.disconnectTimers.delete(playerID);
        }
    }
}

export { ReconnectionManager };
