#!/usr/bin/env python3
"""
Setup hockey game files: create src directory and game files.
Returns: 0 = success, 1 = failure
"""

import os
import sys

def create_src_directory(base_path):
    """Create src directory"""
    src_path = os.path.join(base_path, 'src')
    try:
        os.makedirs(src_path, exist_ok=True)
        print(f"Directory created: {src_path}")
        return src_path
    except Exception as e:
        print(f"Failed to create directory: {e}")
        return None

def create_styles_css(src_path):
    """Create styles.css with extracted CSS"""
    css_content = """:root {
    --primary-color: #3498db;
    --secondary-color: #2ecc71;
    --background-color: #ecf0f1;
    --text-color: #34495e;
    --border-color: #bdc3c7;
    --box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    --transition: all 0.3s ease;
}

body, html {
    margin: 0;
    padding: 0;
    height: 100%;
    font-family: 'Arial', sans-serif;
    background-color: var(--background-color);
    color: var(--text-color);
}

.container {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-width: 1200px;
    margin: 0 auto;
    background-color: white;
    box-shadow: var(--box-shadow);
}

header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    background-color: var(--primary-color);
    color: white;
}

.logo, .score {
    font-size: 1.5em;
    font-weight: bold;
}

.main-content {
    display: flex;
    flex: 1;
}

.publicity {
    width: 20%;
    padding: 20px;
    background-color: var(--secondary-color);
    color: white;
}

.game-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 20px;
    overflow-x: auto;
}

.stats-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
}

.stats-table th, .stats-table td {
    border: 1px solid var(--border-color);
    padding: 10px;
    text-align: center;
}

.stats-table th {
    background-color: var(--primary-color);
    color: white;
}

.stats-table tr:nth-child(even) {
    background-color: var(--background-color);
}

.stats-table .season-col {
    background-color: var(--primary-color);
    color: white;
}

.stats-table .team-col {
    background-color: #2980b9;
    color: white;
}

.stats-table .league-col {
    background-color: #3498db;
    color: white;
}

.stats-table .regular-season {
    background-color: #f39c12;
    color: white;
}

.stats-table .playoffs {
    background-color: #e74c3c;
    color: white;
}

.stats-table tbody tr {
    opacity: 0;
    transition: opacity 0.5s ease-in;
}

.stats-table tbody tr.revealed {
    opacity: 1;
}

.user-input {
    background-color: white;
    border-radius: 10px;
    padding: 20px;
    box-shadow: var(--box-shadow);
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

input[type="text"] {
    flex: 1;
    min-width: 200px;
    padding: 10px;
    border: 1px solid var(--border-color);
    border-radius: 5px;
    font-size: 1em;
    transition: var(--transition);
}

input[type="text"]:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.3);
}

input[type="text"].correct {
    border-color: var(--secondary-color);
    background-color: #d5f4e6;
}

input[type="text"].incorrect {
    border-color: #e74c3c;
    background-color: #fadbd8;
}

.buttons {
    display: flex;
    gap: 10px;
}

button {
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    font-size: 1em;
    cursor: pointer;
    transition: var(--transition);
}

button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
}

button.guess-btn {
    background-color: var(--secondary-color);
    color: white;
}

button.hint-btn {
    background-color: var(--primary-color);
    color: white;
}

button:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-2px);
}

.search-row {
    display: flex;
    gap: 10px;
    width: 100%;
}

.hint-row {
    display: flex;
    justify-content: center;
    width: 100%;
    margin-top: 10px;
}

.message {
    width: 100%;
    padding: 10px;
    border-radius: 5px;
    text-align: center;
    font-weight: bold;
    margin-top: 10px;
    transition: var(--transition);
}

.message.success {
    background-color: var(--secondary-color);
    color: white;
}

.message.error {
    background-color: #e74c3c;
    color: white;
}

.message.info {
    background-color: var(--primary-color);
    color: white;
}

@media (max-width: 768px) {
    .main-content {
        flex-direction: column;
    }

    .publicity {
        width: 100%;
        order: 2;
    }

    .game-area {
        order: 1;
    }
}
"""

    css_path = os.path.join(src_path, 'styles.css')
    try:
        with open(css_path, 'w', encoding='utf-8') as f:
            f.write(css_content)
        print(f"Created: {css_path}")
        return True
    except Exception as e:
        print(f"Failed to create styles.css: {e}")
        return False

def create_game_js(src_path):
    """Create game.js with game logic"""
    js_content = """// Hockey Statistics Guessing Game Logic

class HockeyGame {
    constructor() {
        this.score = 100;
        this.hintsUsed = 0;
        this.revealedRows = 0;
        this.correctAnswer = 'sidney crosby';
        this.gameWon = false;
        this.maxHints = 2;
        this.hintPenalty = 20;
        this.correctGuessBonus = 50;

        this.init();
    }

    init() {
        this.scoreDisplay = document.querySelector('.score');
        this.playerInput = document.querySelector('input[type="text"]');
        this.guessBtn = document.querySelector('.guess-btn');
        this.hintBtn = document.querySelector('.hint-btn');
        this.tableRows = document.querySelectorAll('.stats-table tbody tr');
        this.userInputContainer = document.querySelector('.user-input');

        this.setupEventListeners();
        this.updateScoreDisplay();
        this.hideAllRows();
    }

    setupEventListeners() {
        this.guessBtn.addEventListener('click', () => this.handleGuess());
        this.hintBtn.addEventListener('click', () => this.handleHint());
        this.playerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleGuess();
            }
        });
    }

    hideAllRows() {
        this.tableRows.forEach(row => {
            row.style.opacity = '0';
            row.classList.remove('revealed');
        });
    }

    handleGuess() {
        if (this.gameWon) {
            this.showMessage('You already won! Refresh to play again.', 'info');
            return;
        }

        const guess = this.playerInput.value.trim().toLowerCase();

        if (!guess) {
            this.showMessage('Please enter a player name', 'error');
            return;
        }

        if (guess === this.correctAnswer) {
            this.handleCorrectGuess();
        } else {
            this.handleIncorrectGuess();
        }
    }

    handleCorrectGuess() {
        this.gameWon = true;
        this.score += this.correctGuessBonus;
        this.updateScoreDisplay();

        this.playerInput.classList.add('correct');
        this.playerInput.disabled = true;
        this.guessBtn.disabled = true;
        this.hintBtn.disabled = true;

        this.revealAllRows();

        const bonusMsg = this.hintsUsed === 0 ? ' Perfect game!' : '';
        this.showMessage(`Correct! +${this.correctGuessBonus} points.${bonusMsg}`, 'success');
    }

    handleIncorrectGuess() {
        this.playerInput.classList.add('incorrect');
        setTimeout(() => {
            this.playerInput.classList.remove('incorrect');
        }, 1000);

        this.showMessage('Incorrect guess. Try again or use a hint!', 'error');
    }

    handleHint() {
        if (this.gameWon) {
            this.showMessage('You already won!', 'info');
            return;
        }

        if (this.revealedRows >= this.tableRows.length) {
            this.showMessage('All hints revealed!', 'info');
            return;
        }

        this.revealNextRow();
        this.hintsUsed++;
        this.score -= this.hintPenalty;
        this.updateScoreDisplay();

        if (this.revealedRows >= this.tableRows.length) {
            this.hintBtn.disabled = true;
        }

        this.showMessage(`Hint revealed! -${this.hintPenalty} points`, 'info');
    }

    revealNextRow() {
        if (this.revealedRows < this.tableRows.length) {
            const row = this.tableRows[this.revealedRows];
            row.classList.add('revealed');
            this.revealedRows++;
        }
    }

    revealAllRows() {
        this.tableRows.forEach(row => {
            row.classList.add('revealed');
        });
        this.revealedRows = this.tableRows.length;
    }

    updateScoreDisplay() {
        this.scoreDisplay.textContent = `Score: ${this.score}`;
    }

    showMessage(text, type) {
        let messageEl = this.userInputContainer.querySelector('.message');

        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.className = 'message';
            this.userInputContainer.appendChild(messageEl);
        }

        messageEl.className = `message ${type}`;
        messageEl.textContent = text;

        setTimeout(() => {
            messageEl.style.opacity = '0';
            setTimeout(() => {
                messageEl.style.opacity = '1';
            }, 300);
        }, 10);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new HockeyGame();
});
"""

    js_path = os.path.join(src_path, 'game.js')
    try:
        with open(js_path, 'w', encoding='utf-8') as f:
            f.write(js_content)
        print(f"Created: {js_path}")
        return True
    except Exception as e:
        print(f"Failed to create game.js: {e}")
        return False

def update_html_file(base_path):
    """Update HTML file to link external CSS and JS"""
    html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hockey Player Statistics</title>
    <link rel="stylesheet" href="src/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <div class="logo">HockeyStats</div>
            <div class="score">Score: 0</div>
        </header>
        <div class="main-content">
            <div class="game-area">
                <table class="stats-table">
                    <thead>
                        <tr>
                            <th class="season-col">Season</th>
                            <th class="team-col">Team</th>
                            <th class="league-col">Lge</th>
                            <th class="regular-season" colspan="6">Regular Season</th>
                            <th class="playoffs" colspan="5">Playoffs</th>
                        </tr>
                        <tr>
                            <th></th>
                            <th></th>
                            <th></th>
                            <th>GP</th>
                            <th>G</th>
                            <th>A</th>
                            <th>Pts</th>
                            <th>PIM</th>
                            <th>+/-</th>
                            <th>GP</th>
                            <th>G</th>
                            <th>A</th>
                            <th>Pts</th>
                            <th>PIM</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr data-season="2003-04">
                            <td>2003-04</td>
                            <td>Rimouski Oceanic</td>
                            <td>QMJHL</td>
                            <td>59</td>
                            <td>33</td>
                            <td>60</td>
                            <td>93</td>
                            <td>74</td>
                            <td>45</td>
                            <td>12</td>
                            <td>7</td>
                            <td>19</td>
                            <td>12</td>
                            <td>6</td>
                        </tr>
                        <tr data-season="2004-05">
                            <td>2004-05</td>
                            <td>Rimouski Oceanic</td>
                            <td>QMJHL</td>
                            <td>68</td>
                            <td>52</td>
                            <td>71</td>
                            <td>123</td>
                            <td>85</td>
                            <td>19</td>
                            <td>10</td>
                            <td>5</td>
                            <td>15</td>
                            <td>20</td>
                            <td>4</td>
                        </tr>
                    </tbody>
                </table>
                <div class="user-input">
                    <div class="search-row">
                        <input type="text" placeholder="Enter player name to search...">
                        <button class="guess-btn">Guess</button>
                    </div>
                    <div class="hint-row">
                        <button class="hint-btn">Hint</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script src="src/game.js"></script>
</body>
</html>
"""

    html_path = os.path.join(base_path, 'hockey_version_25oct.html')
    try:
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        print(f"Updated: {html_path}")
        return True
    except Exception as e:
        print(f"Failed to update HTML file: {e}")
        return False

def main():
    print("=== Hockey Game Setup ===")

    base_path = r'c:\Users\Xena\source\repos\hockeyGame'

    if not os.path.exists(base_path):
        print(f"Base directory not found: {base_path}")
        return 1

    src_path = create_src_directory(base_path)
    if not src_path:
        return 1

    if not create_styles_css(src_path):
        return 1

    if not create_game_js(src_path):
        return 1

    if not update_html_file(base_path):
        return 1

    print("=== Setup Complete ===")
    print(f"Files created:")
    print(f"  - {os.path.join(src_path, 'styles.css')}")
    print(f"  - {os.path.join(src_path, 'game.js')}")
    print(f"  - {os.path.join(base_path, 'hockey_version_25oct.html')} (updated)")
    return 0

if __name__ == "__main__":
    exit(main())
