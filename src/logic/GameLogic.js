// Hockey Game Logic - Pure Functions
// All game logic without side effects, DOM manipulation, or state mutation
// Every function is testable without DOM and deterministic for same inputs

import { GAME_CONFIG } from '../config.js';

/**
 * Calculate score based on game events
 * @param {number} currentScore - Current score
 * @param {number} hintsUsed - Number of hints used this round
 * @param {boolean} isCorrect - Whether the guess was correct
 * @param {number} wrongChoices - Number of wrong multiple choice selections
 * @returns {number} New score
 */
export function calculateScore(currentScore, hintsUsed, isCorrect, wrongChoices = 0) {
  let score = currentScore;

  // Deduct hint penalties
  score -= hintsUsed * GAME_CONFIG.HINT_PENALTY;

  // Deduct wrong choice penalties
  score -= wrongChoices * 10; // WRONG_CHOICE_PENALTY constant

  // Add correct guess bonus
  if (isCorrect) {
    score += GAME_CONFIG.CORRECT_BONUS;
  }

  return score;
}

/**
 * Validate a player guess against correct answer
 * @param {string} guess - Player's guess
 * @param {string} correctAnswer - Correct player name
 * @returns {boolean} True if guess matches
 */
export function validateGuess(guess, correctAnswer) {
  if (!guess || !correctAnswer) return false;
  return guess.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
}

/**
 * Check if hints are still available
 * @param {number} hintsUsed - Number of hints already used
 * @param {number} maxHints - Maximum hints allowed
 * @returns {boolean} True if more hints available
 */
export function canUseHint(hintsUsed, maxHints = GAME_CONFIG.MAX_HINTS) {
  return hintsUsed < maxHints;
}

/**
 * Select random player from array
 * @param {Array} players - Array of player objects
 * @param {number} [seed] - Optional seed for deterministic testing
 * @returns {Object} Random player object
 */
export function selectRandomPlayer(players, seed) {
  if (!players || players.length === 0) {
    throw new Error('No players available');
  }

  // If seed provided (for testing), use seeded random
  let randomIndex;
  if (seed !== undefined) {
    randomIndex = seed % players.length;
  } else {
    randomIndex = Math.floor(Math.random() * players.length);
  }

  return players[randomIndex];
}

/**
 * Generate array of multiple choice options including correct answer
 * @param {Object} currentPlayer - The correct player object
 * @param {Array} allPlayers - All available players
 * @param {number} count - Number of choices to generate
 * @param {number} [seed] - Optional seed for deterministic testing
 * @returns {Array<string>} Array of player names (shuffled)
 */
export function generateMultipleChoice(
  currentPlayer,
  allPlayers,
  count = GAME_CONFIG.MULTIPLE_CHOICE_COUNT,
  seed
) {
  if (!currentPlayer || !allPlayers || allPlayers.length === 0) {
    throw new Error('Invalid players data');
  }

  if (count < 2) {
    throw new Error('Must have at least 2 choices');
  }

  if (allPlayers.length < count) {
    throw new Error('Not enough players for multiple choice');
  }

  // Start with correct answer
  const choices = [currentPlayer.name];

  // Get other players excluding current
  const otherPlayers = allPlayers
    .filter(p => p.name !== currentPlayer.name)
    .map(p => p.name);

  // Add random wrong answers
  const availablePlayers = [...otherPlayers];
  while (choices.length < count && availablePlayers.length > 0) {
    let randomIndex;
    if (seed !== undefined) {
      // Use seed for deterministic selection
      randomIndex = (seed + choices.length) % availablePlayers.length;
    } else {
      randomIndex = Math.floor(Math.random() * availablePlayers.length);
    }

    choices.push(availablePlayers[randomIndex]);
    availablePlayers.splice(randomIndex, 1);
  }

  // Shuffle choices
  const shuffled = shuffleArray(choices, seed);

  return shuffled;
}

/**
 * Shuffle array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @param {number} [seed] - Optional seed for deterministic testing
 * @returns {Array} Shuffled array (new array, not mutated)
 */
export function shuffleArray(array, seed) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    let j;
    if (seed !== undefined) {
      // Seeded random for testing
      j = (seed + i) % (i + 1);
    } else {
      j = Math.floor(Math.random() * (i + 1));
    }
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/**
 * Sanitize user input for player name guess
 * @param {string} input - Raw user input
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input, maxLength = GAME_CONFIG.MAX_INPUT_LENGTH) {
  if (!input) return '';

  return input
    .trim()
    .toLowerCase()
    .replace(GAME_CONFIG.ALLOWED_INPUT_PATTERN, '')
    .substring(0, maxLength);
}

/**
 * Check if rate limit exceeded
 * @param {Array<number>} timestamps - Array of guess timestamps
 * @param {number} currentTime - Current timestamp
 * @param {number} window - Time window in ms
 * @param {number} maxGuesses - Max guesses per window
 * @returns {boolean} True if rate limited
 */
export function isRateLimited(
  timestamps,
  currentTime,
  window = GAME_CONFIG.RATE_LIMIT_WINDOW,
  maxGuesses = GAME_CONFIG.MAX_GUESSES_PER_WINDOW
) {
  if (!timestamps || timestamps.length === 0) return false;

  const recentGuesses = timestamps.filter(t => currentTime - t < window);
  return recentGuesses.length >= maxGuesses;
}

/**
 * Pre-select N unique random players for multi-round game
 * @param {Array} allPlayers - All available players
 * @param {number} count - Number of players to select
 * @param {number} [seed] - Optional seed for deterministic testing
 * @returns {Array} Array of selected player objects
 */
export function preSelectPlayers(allPlayers, count = 5, seed) {
  if (!allPlayers || allPlayers.length === 0) {
    throw new Error('No players available');
  }

  if (count > allPlayers.length) {
    throw new Error('Not enough players available');
  }

  // Shuffle and take first N
  const shuffled = shuffleArray([...allPlayers], seed);
  return shuffled.slice(0, count);
}
