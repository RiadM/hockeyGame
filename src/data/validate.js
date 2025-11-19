// Schema validation for player data files
const fs = require('fs');
const path = require('path');

const PLAYERS_DIR = path.join(__dirname, 'players');
const MANIFEST_PATH = path.join(__dirname, 'manifest.json');
const MAX_FILE_SIZE = 10 * 1024; // 10KB limit per file

const requiredPlayerFields = [
  'name', 'position', 'birth_date', 'birth_place',
  'height', 'weight', 'shoots', 'draft_info', 'seasons'
];

const requiredSeasonFields = [
  'season', 'team', 'league', 'gp', 'g', 'a', 'pts', 'pim',
  'plus_minus', 'playoff_gp', 'playoff_g', 'playoff_a',
  'playoff_pts', 'playoff_pim'
];

function validatePlayerData(playerData, filename) {
  const errors = [];

  // Check required fields
  for (const field of requiredPlayerFields) {
    if (!(field in playerData)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate seasons array
  if (!Array.isArray(playerData.seasons)) {
    errors.push('seasons must be an array');
  } else {
    playerData.seasons.forEach((season, idx) => {
      for (const field of requiredSeasonFields) {
        if (!(field in season)) {
          errors.push(`Season ${idx}: Missing required field: ${field}`);
        }
      }
    });
  }

  return errors;
}

function validateFileSize(filepath) {
  const stats = fs.statSync(filepath);
  return stats.size <= MAX_FILE_SIZE;
}

// Main validation
let totalErrors = 0;
let totalSize = 0;

console.log('Validating player data files...\n');

// Validate manifest
try {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  console.log('✓ manifest.json is valid JSON');
  console.log(`  Found ${manifest.players.length} players in manifest\n`);

  // Validate each player file
  manifest.players.forEach(({ id, name, file }) => {
    const filepath = path.join(__dirname, file);

    try {
      // Check file exists
      if (!fs.existsSync(filepath)) {
        console.log(`✗ ${id}: File not found at ${file}`);
        totalErrors++;
        return;
      }

      // Validate JSON
      const playerData = JSON.parse(fs.readFileSync(filepath, 'utf8'));

      // Validate schema
      const errors = validatePlayerData(playerData, id);

      // Check file size
      const stats = fs.statSync(filepath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      totalSize += stats.size;
      const sizeOK = validateFileSize(filepath);

      if (errors.length === 0 && sizeOK) {
        console.log(`✓ ${id}: Valid (${sizeKB}KB)`);
      } else {
        console.log(`✗ ${id}: ERRORS`);
        if (!sizeOK) {
          console.log(`  - File size ${sizeKB}KB exceeds ${MAX_FILE_SIZE/1024}KB limit`);
        }
        errors.forEach(err => console.log(`  - ${err}`));
        totalErrors += errors.length;
      }

    } catch (err) {
      console.log(`✗ ${id}: ${err.message}`);
      totalErrors++;
    }
  });

} catch (err) {
  console.log(`✗ manifest.json: ${err.message}`);
  totalErrors++;
}

console.log(`\nTotal size: ${(totalSize / 1024).toFixed(2)}KB`);
console.log(`\nValidation ${totalErrors === 0 ? 'PASSED' : 'FAILED'}: ${totalErrors} errors`);
process.exit(totalErrors === 0 ? 0 : 1);
