// Hockey Stats Guessing Game - Configuration
// All game constants and configuration values

export const GAME_CONFIG = {
  // Scoring
  INITIAL_SCORE: 100,
  HINT_PENALTY: 20,
  CORRECT_BONUS: 50,
  WRONG_CHOICE_PENALTY: 10,

  // Game Rounds
  TOTAL_ROUNDS: 5,

  // Hints
  MAX_HINTS: 3,

  // Multiple Choice
  MULTIPLE_CHOICE_COUNT: 4,

  // UI Timing
  MESSAGE_TIMEOUT: 4000,
  SHAKE_DURATION: 600,

  // Input Validation
  MAX_INPUT_LENGTH: 100,
  ALLOWED_INPUT_PATTERN: /[^a-z\s'-]/g, // Only letters, spaces, hyphens, apostrophes

  // Rate Limiting
  RATE_LIMIT_WINDOW: 1000, // 1 second
  MAX_GUESSES_PER_WINDOW: 10,

  // Math Constants
  PERCENTAGE_MULTIPLIER: 100,
  SHUFFLE_RANDOMIZER: 0.5,
  EASING_MIDPOINT: 0.5,
  SCORE_ANIMATION_DURATION: 800
};
