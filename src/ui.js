// UI Initialization and Event Handlers
// Solo mode game initialization

import { HockeyGameDashboard } from './game.js';
import { GameEventHandlers } from './ui/EventHandlers.js';
import { PlayerService } from './services/PlayerService.js';

// Game Setup
document.addEventListener('DOMContentLoaded', () => {
    // Initialize event handlers for game events
    const gameEventHandlers = new GameEventHandlers();
    window.gameEventHandlers = gameEventHandlers;

    // Initialize sidebar collapse functionality
    initializeSidebarCollapse();

    // Initialize player autocomplete
    initializePlayerAutocomplete();

    // Auto-start in solo mode
    const rightSidebar = document.querySelector('.right-sidebar');
    if (rightSidebar) rightSidebar.classList.add('hidden');
    window.multiplayerManager = null;
    window.hockeyGameInstance = new HockeyGameDashboard();
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
