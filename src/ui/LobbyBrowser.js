// LobbyBrowser - Manages lobby UI for creating, joining, and browsing rooms
// Integrates with LobbyManager for P2P room discovery

export class LobbyBrowser {
    constructor(lobbyManager, elements) {
        this.lobbyManager = lobbyManager;

        // Elements
        this.publicRoomsList = elements.publicRoomsList;
        this.createRoomBtn = elements.createRoomBtn;
        this.privateRoomCheckbox = elements.privateRoomCheckbox;
        this.joinRoomInput = elements.joinRoomInput;
        this.joinRoomBtn = elements.joinRoomBtn;
        this.browseRoomsBtn = elements.browseRoomsBtn;

        if (!this.lobbyManager || !this.publicRoomsList) {
            throw new Error('Required lobby elements missing');
        }

        this.isVisible = false;
        this.refreshInterval = null;
        this.onRoomJoin = null;
        this.onRoomCreate = null;
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Create room button
        if (this.createRoomBtn) {
            this.createRoomBtn.addEventListener('click', () => this.handleCreateRoom());
        }

        // Join room button
        if (this.joinRoomBtn) {
            this.joinRoomBtn.addEventListener('click', () => this.handleJoinRoom());
        }

        // Join on Enter key
        if (this.joinRoomInput) {
            this.joinRoomInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleJoinRoom();
            });
        }

        // Browse rooms button
        if (this.browseRoomsBtn) {
            this.browseRoomsBtn.addEventListener('click', () => this.togglePublicRooms());
        }
    }

    async handleCreateRoom() {
        const isPrivate = this.privateRoomCheckbox?.checked || false;
        let password = null;

        if (isPrivate) {
            password = this.promptPassword('Set room password (6-50 chars):');
            if (!password) return;

            const validation = this.lobbyManager.validatePassword(password);
            if (!validation.valid) {
                this.showError(validation.error);
                return;
            }
            password = validation.password;
        }

        if (this.onRoomCreate) {
            await this.onRoomCreate(isPrivate, password);
        }
    }

    async handleJoinRoom() {
        const roomCode = this.joinRoomInput?.value?.trim().toUpperCase();
        if (!roomCode || roomCode.length !== 6) {
            this.showError('Enter valid 6-character room code');
            return;
        }

        const room = this.lobbyManager.rooms.get(roomCode);
        let password = null;

        if (room?.passwordHash) {
            const rateLimitCheck = this.lobbyManager.checkRateLimit(roomCode);
            if (!rateLimitCheck.allowed) {
                this.showError(`Too many attempts. Wait ${rateLimitCheck.timeLeft}s`);
                return;
            }

            password = this.promptPassword('Enter room password (6-50 chars):');
            if (!password) return;

            const validation = this.lobbyManager.validatePassword(password);
            if (!validation.valid) {
                this.showError(validation.error);
                this.lobbyManager.recordFailedAttempt(roomCode);
                return;
            }

            const valid = await this.lobbyManager.verifyPassword(validation.password, room.passwordHash);
            if (!valid) {
                this.lobbyManager.recordFailedAttempt(roomCode);
                const remaining = this.lobbyManager.MAX_ATTEMPTS - 1;
                const msg = remaining > 0
                    ? `Wrong password. ${remaining} attempts left`
                    : 'Wrong password. Locked for 1 min';
                this.showError(msg);
                return;
            }
        }

        if (this.onRoomJoin) {
            await this.onRoomJoin(roomCode);
        }
    }

    togglePublicRooms() {
        this.isVisible = !this.isVisible;

        if (this.isVisible) {
            this.show();
            this.fetchRooms();
            this.startAutoRefresh();
        } else {
            this.hide();
            this.stopAutoRefresh();
        }
    }

    show() {
        if (this.publicRoomsList) {
            this.publicRoomsList.style.display = 'block';
        }
        this.isVisible = true;
    }

    hide() {
        if (this.publicRoomsList) {
            this.publicRoomsList.style.display = 'none';
        }
        this.isVisible = false;
    }

    async fetchRooms() {
        await this.lobbyManager.fetchPublicRooms();
        this.renderRooms();
    }

    renderRooms() {
        if (!this.publicRoomsList) return;

        this.publicRoomsList.innerHTML = '';

        // Header
        const header = document.createElement('div');
        header.className = 'lobby-header';
        header.textContent = 'Available Public Rooms';
        this.publicRoomsList.appendChild(header);

        // Empty state
        if (this.lobbyManager.rooms.size === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'lobby-empty';
            emptyMsg.textContent = 'No public rooms available';
            this.publicRoomsList.appendChild(emptyMsg);
            return;
        }

        // Render rooms
        const sortedRooms = Array.from(this.lobbyManager.rooms.values())
            .filter(room => !room.isPrivate)
            .sort((a, b) => b.createdAt - a.createdAt);

        sortedRooms.forEach(room => {
            const roomEl = this.createRoomElement(room);
            this.publicRoomsList.appendChild(roomEl);
        });
    }

    createRoomElement(room) {
        const roomEl = document.createElement('div');
        roomEl.className = 'lobby-room-item';

        // Room header (code + player count)
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

        // Host info
        const hostDiv = document.createElement('div');
        hostDiv.className = 'lobby-room-host';
        hostDiv.textContent = `Host: ${room.hostName}`;

        // Join button
        const joinBtn = document.createElement('button');
        joinBtn.className = 'btn btn-primary lobby-join-btn';
        joinBtn.textContent = room.passwordHash ? 'Join (Password)' : 'Join';
        joinBtn.onclick = () => this.handleJoinRoomFromList(room);

        roomEl.appendChild(headerDiv);
        roomEl.appendChild(hostDiv);
        roomEl.appendChild(joinBtn);

        return roomEl;
    }

    async handleJoinRoomFromList(room) {
        let password = null;

        if (room.passwordHash) {
            const rateLimitCheck = this.lobbyManager.checkRateLimit(room.roomCode);
            if (!rateLimitCheck.allowed) {
                this.showError(`Too many attempts. Wait ${rateLimitCheck.timeLeft}s`);
                return;
            }

            password = this.promptPassword('Enter room password (6-50 chars):');
            if (!password) return;

            const validation = this.lobbyManager.validatePassword(password);
            if (!validation.valid) {
                this.showError(validation.error);
                this.lobbyManager.recordFailedAttempt(room.roomCode);
                return;
            }

            const valid = await this.lobbyManager.verifyPassword(validation.password, room.passwordHash);
            if (!valid) {
                this.lobbyManager.recordFailedAttempt(room.roomCode);
                const remaining = this.lobbyManager.MAX_ATTEMPTS - 1;
                const msg = remaining > 0
                    ? `Wrong password. ${remaining} attempts left`
                    : 'Wrong password. Locked for 1 min';
                this.showError(msg);
                return;
            }
        }

        if (this.onRoomJoin) {
            await this.onRoomJoin(room.roomCode);
        }
    }

    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            this.fetchRooms();
        }, 10000); // Refresh every 10 seconds
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    promptPassword(message) {
        const password = prompt(message);
        return password?.trim() || null;
    }

    showError(message) {
        alert(message);
    }

    cleanup() {
        this.stopAutoRefresh();
        this.hide();
    }
}
