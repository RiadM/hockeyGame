// UI Initialization and Event Handlers
// Handles mode selection, room management, chat

import { MultiplayerManager } from './multiplayer/manager.js';
import { LobbyManager } from './multiplayer/lobby.js';
import { LobbyBrowser } from './ui/LobbyBrowser.js';
import { HockeyGameDashboard } from './game.js';
import { GameEventHandlers } from './ui/EventHandlers.js';
import { PlayerService } from './services/PlayerService.js';

// Mode Selection & Chat Setup
        document.addEventListener('DOMContentLoaded', () => {
            // Initialize event handlers for game events
            const gameEventHandlers = new GameEventHandlers();
            window.gameEventHandlers = gameEventHandlers; // Store for cleanup if needed

            // Initialize lobby manager
            const lobbyManager = new LobbyManager();
            lobbyManager.connectToLobby();

            // Initialize lobby browser
            const lobbyBrowser = new LobbyBrowser(lobbyManager, {
                publicRoomsList: document.getElementById('public-rooms-list'),
                createRoomBtn: document.getElementById('create-room-btn'),
                privateRoomCheckbox: document.getElementById('private-room-checkbox'),
                joinRoomInput: document.getElementById('join-room-input'),
                joinRoomBtn: document.getElementById('join-room-btn'),
                browseRoomsBtn: document.getElementById('browse-rooms-btn')
            });
            lobbyBrowser.init();

            const modeModal = document.getElementById('mode-modal');
            const soloBtn = document.getElementById('solo-mode-btn');
            const createRoomBtn = document.getElementById('create-room-btn');
            const joinRoomBtn = document.getElementById('join-room-btn');
            const joinRoomInput = document.getElementById('join-room-input');
            const roomCodeEl = document.querySelector('.room-code');
            const chatInput = document.querySelector('.chat-input');
            const chatSendBtn = document.querySelector('.chat-send-btn');

            // Initialize sidebar collapse functionality
            initializeSidebarCollapse();

            // Initialize player autocomplete
            initializePlayerAutocomplete();

            // Auto-start in solo mode (skip modal)
            modeModal.style.display = 'none';
            const rightSidebar = document.querySelector('.right-sidebar');
            if (rightSidebar) rightSidebar.classList.add('hidden');
            window.multiplayerManager = null;
            window.hockeyGameInstance = new HockeyGameDashboard();

            // Solo mode button (kept for future use if modal is re-enabled)
            soloBtn.addEventListener('click', () => {
                modeModal.style.display = 'none';
                const rightSidebar = document.querySelector('.right-sidebar');
                if (rightSidebar) rightSidebar.classList.add('hidden');

                window.multiplayerManager = null;
                window.hockeyGameInstance = new HockeyGameDashboard();
            });

            // Wire up lobby browser callbacks for room creation
            lobbyBrowser.onRoomCreate = async (isPrivate, password) => {
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
                    const code = await window.multiplayerManager.createRoom(playerName, isPrivate);

                    // Register room with lobby
                    await lobbyManager.registerRoom(
                        code,
                        window.multiplayerManager.playerID,
                        playerName,
                        isPrivate,
                        password
                    );

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
            };

            // Wire up lobby browser callbacks for room joining
            lobbyBrowser.onRoomJoin = async (roomCode) => {
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
                    await window.multiplayerManager.joinRoom(roomCode, playerName);

                    roomCodeEl.textContent = roomCode;
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
            };

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
                        // Copy failed silently
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

        // Initialize sidebar collapse functionality
        function initializeSidebarCollapse() {
            const leftSidebarCollapseBtn = document.getElementById('left-sidebar-collapse-btn');
            const rightSidebarCollapseBtn = document.getElementById('right-sidebar-collapse-btn');
            const scoreSidebar = document.querySelector('.score-sidebar');
            const rightSidebar = document.querySelector('.right-sidebar');

            // Left sidebar collapse
            if (leftSidebarCollapseBtn && scoreSidebar) {
                leftSidebarCollapseBtn.addEventListener('click', () => {
                    scoreSidebar.classList.toggle('collapsed');
                    
                    // Update button text based on state
                    if (scoreSidebar.classList.contains('collapsed')) {
                        leftSidebarCollapseBtn.textContent = '+';
                    } else {
                        leftSidebarCollapseBtn.textContent = '-';
                    }
                    
                    // Store user preference in localStorage
                    localStorage.setItem('leftSidebarCollapsed', scoreSidebar.classList.contains('collapsed'));
                });
                
                // Restore user preference on load
                const savedLeftCollapsed = localStorage.getItem('leftSidebarCollapsed');
                if (savedLeftCollapsed === 'true') {
                    scoreSidebar.classList.add('collapsed');
                    leftSidebarCollapseBtn.textContent = '+';
                }
            }

            // Right sidebar collapse
            if (rightSidebarCollapseBtn && rightSidebar) {
                rightSidebarCollapseBtn.addEventListener('click', () => {
                    rightSidebar.classList.toggle('collapsed');
                    
                    // Update button text based on state
                    if (rightSidebar.classList.contains('collapsed')) {
                        rightSidebarCollapseBtn.textContent = '+';
                    } else {
                        rightSidebarCollapseBtn.textContent = '-';
                    }
                    
                    // Store user preference in localStorage
                    localStorage.setItem('rightSidebarCollapsed', rightSidebar.classList.contains('collapsed'));
                });
                
                // Restore user preference on load
                const savedRightCollapsed = localStorage.getItem('rightSidebarCollapsed');
                if (savedRightCollapsed === 'true') {
                    rightSidebar.classList.add('collapsed');
                    rightSidebarCollapseBtn.textContent = '+';
                }
            }
        }

        // Initialize player autocomplete functionality
        function initializePlayerAutocomplete() {
            const playerGuessInput = document.getElementById('player-guess');
            const autocompleteList = document.getElementById('autocomplete-list');
            
            if (!playerGuessInput) return;

            let currentFocus = -1;
            let allPlayers = [];

            // Load all players when the page loads
            PlayerService.getAllPlayerInfo().then(playerInfo => {
                allPlayers = playerInfo.map(info => info.name);
            });

            playerGuessInput.addEventListener('input', function(e) {
                const val = this.value;
                closeAllLists();
                if (!val) return false;
                currentFocus = -1;

                // Filter players based on input
                const filteredPlayers = allPlayers.filter(player => 
                    player.toLowerCase().includes(val.toLowerCase())
                ).slice(0, 10); // Limit to 10 suggestions

                if (filteredPlayers.length === 0) return false;

                // Create autocomplete container
                const listDiv = document.createElement('div');
                listDiv.setAttribute('id', this.id + '-autocomplete-list');
                listDiv.setAttribute('class', 'autocomplete-items');
                this.parentNode.appendChild(listDiv);

                // Add items to the list
                filteredPlayers.forEach((player, idx) => {
                    const item = document.createElement('div');
                    item.innerHTML = player.replace(new RegExp(`(${val})`, 'gi'), '<strong>$1</strong>');
                    item.addEventListener('click', function() {
                        playerGuessInput.value = player;
                        closeAllLists();
                    });
                    listDiv.appendChild(item);
                });
            });

            playerGuessInput.addEventListener('keydown', function(e) {
                const items = document.querySelectorAll('#' + this.id + '-autocomplete-list div');
                
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    currentFocus++;
                    addActive(items);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    currentFocus--;
                    addActive(items);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (currentFocus > -1 && items) {
                        items[currentFocus].click();
                    }
                }
            });

            document.addEventListener('click', function(e) {
                if (e.target !== playerGuessInput) {
                    closeAllLists();
                }
            });

            function addActive(items) {
                if (!items) return false;
                removeActive(items);
                if (currentFocus >= items.length) currentFocus = 0;
                if (currentFocus < 0) currentFocus = (items.length - 1);
                items[currentFocus].classList.add('autocomplete-active');
            }

            function removeActive(items) {
                for (let i = 0; i < items.length; i++) {
                    items[i].classList.remove('autocomplete-active');
                }
            }

            function closeAllLists(elmnt) {
                const items = document.getElementsByClassName('autocomplete-items');
                for (let i = 0; i < items.length; i++) {
                    if (elmnt !== items[i] && elmnt !== playerGuessInput) {
                        items[i].parentNode.removeChild(items[i]);
                    }
                }
            }
        }
