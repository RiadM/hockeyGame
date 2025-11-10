// UI Initialization and Event Handlers
// Handles mode selection, room management, chat

import { MultiplayerManager } from './multiplayer/manager.js';
import { HockeyGameDashboard } from './game.js';

// Mode Selection & Chat Setup
        document.addEventListener('DOMContentLoaded', () => {
            const modeModal = document.getElementById('mode-modal');
            const soloBtn = document.getElementById('solo-mode-btn');
            const createRoomBtn = document.getElementById('create-room-btn');
            const joinRoomBtn = document.getElementById('join-room-btn');
            const joinRoomInput = document.getElementById('join-room-input');
            const roomCodeEl = document.querySelector('.room-code');
            const chatInput = document.querySelector('.chat-input');
            const chatSendBtn = document.querySelector('.chat-send-btn');

            // Solo mode - hide multiplayer UI
            soloBtn.addEventListener('click', () => {
                modeModal.style.display = 'none';
                const rightSidebar = document.querySelector('.right-sidebar');
                if (rightSidebar) rightSidebar.classList.add('hidden');

                window.multiplayerManager = null;
                window.hockeyGameInstance = new HockeyGameDashboard();
            });

            // Create room
            createRoomBtn.addEventListener('click', async () => {
                const playerNameInput = document.getElementById('player-name-input');
                let playerName = playerNameInput.value;
                const tempMgr = new MultiplayerManager();
                playerName = tempMgr.validatePlayerName(playerName);

                if (!playerName) {
                    alert('Invalid name. Use 3-20 characters (letters, numbers, spaces, hyphens, apostrophes only).');
                    return;
                }

                // Clean old localStorage data
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith('playerID_') || key.startsWith('hostPeerID_') || key === 'roomCode' || key === 'gameState')) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => localStorage.removeItem(key));

                const isPrivate = document.getElementById('private-room-checkbox').checked;

                try {
                    window.multiplayerManager = tempMgr;
                    const code = await window.multiplayerManager.createRoom(playerName, isPrivate);

                    const rightSidebar = document.querySelector('.right-sidebar');
                    if (rightSidebar) rightSidebar.classList.remove('hidden');

                    roomCodeEl.textContent = code;
                    modeModal.style.display = 'none';

                    const readyBtn = document.getElementById('ready-btn');
                    if (readyBtn) readyBtn.style.display = 'block';

                    window.hockeyGameInstance = new HockeyGameDashboard();
                    window.multiplayerManager.updateStartButton();
                } catch (error) {
                    alert('Error creating room: ' + error.message);
                }
            });

            // Join room
            joinRoomBtn.addEventListener('click', async () => {
                const code = joinRoomInput.value.trim().toUpperCase();
                if (!code || code.length !== 6) {
                    alert('Please enter a valid 6-character room code');
                    return;
                }

                const playerNameInput = document.getElementById('player-name-input');
                let playerName = playerNameInput.value;
                const tempMgr = new MultiplayerManager();
                playerName = tempMgr.validatePlayerName(playerName);

                if (!playerName) {
                    alert('Invalid name. Use 3-20 characters (letters, numbers, spaces, hyphens, apostrophes only).');
                    return;
                }

                // Clean old localStorage data
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith('playerID_') || key.startsWith('hostPeerID_') || key === 'roomCode' || key === 'gameState')) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => localStorage.removeItem(key));

                try {
                    window.multiplayerManager = tempMgr;
                    await window.multiplayerManager.joinRoom(code, playerName);

                    roomCodeEl.textContent = code;
                    modeModal.style.display = 'none';

                    const rightSidebar = document.querySelector('.right-sidebar');
                    if (rightSidebar) rightSidebar.classList.remove('hidden');

                    const statusValues = document.querySelectorAll('.status-value');
                    if (statusValues[0]) statusValues[0].textContent = 'Multiplayer';

                    const readyBtn = document.getElementById('ready-btn');
                    if (readyBtn) readyBtn.style.display = 'block';

                    window.hockeyGameInstance = new HockeyGameDashboard();
                } catch (error) {
                    alert('Error joining room: ' + error.message);
                }
            });

            // Chat send
            const sendMessage = () => {
                if (!window.multiplayerManager || !chatInput.value.trim()) return;
                window.multiplayerManager.sendChatMessage(chatInput.value);
                chatInput.value = '';
            };

            chatSendBtn.addEventListener('click', sendMessage);
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') sendMessage();
            });

            // Room code click-to-copy
            const roomCodeDisplay = document.getElementById('room-code-display');
            if (roomCodeDisplay) {
                roomCodeDisplay.addEventListener('click', async () => {
                    const code = roomCodeDisplay.textContent;
                    try {
                        await navigator.clipboard.writeText(code);
                        const originalText = roomCodeDisplay.textContent;
                        roomCodeDisplay.textContent = 'COPIED!';
                        roomCodeDisplay.style.background = 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)';
                        roomCodeDisplay.style.borderColor = '#10b981';
                        setTimeout(() => {
                            roomCodeDisplay.textContent = originalText;
                            roomCodeDisplay.style.background = '';
                            roomCodeDisplay.style.borderColor = '';
                        }, 1000);
                    } catch (err) {
                        console.error('Copy failed:', err);
                    }
                });
            }

            // Ready button
            const readyBtn = document.getElementById('ready-btn');
            if (readyBtn) {
                readyBtn.addEventListener('click', () => {
                    if (window.multiplayerManager) {
                        window.multiplayerManager.toggleReady();
                    }
                });
            }
        });
