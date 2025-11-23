// Comprehensive test suite for player data files
const fs = require('fs');
const path = require('path');

const PLAYERS_DIR = path.join(__dirname, 'players');
const MANIFEST_PATH = path.join(__dirname, 'manifest.json');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`✗ ${name}`);
    console.log(`  ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Load manifest
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

// Test: Manifest structure
test('Manifest has required fields', () => {
  assert(manifest.version, 'Missing version field');
  assert(Array.isArray(manifest.players), 'Players must be an array');
  assert(manifest.players.length === 5, `Expected 5 players, got ${manifest.players.length}`);
});

// Test: All player files exist
test('All player files exist', () => {
  manifest.players.forEach(({ id, file }) => {
    const filepath = path.join(__dirname, file);
    assert(fs.existsSync(filepath), `Missing file: ${file}`);
  });
});

// Test: All JSON files are valid
test('All JSON files are valid', () => {
  manifest.players.forEach(({ file }) => {
    const filepath = path.join(__dirname, file);
    const content = fs.readFileSync(filepath, 'utf8');
    JSON.parse(content); // Will throw if invalid
  });
});

// Test: Player names match manifest
test('Player names match manifest', () => {
  manifest.players.forEach(({ id, name, file }) => {
    const filepath = path.join(__dirname, file);
    const player = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    assert(player.name === name, `Name mismatch for ${id}: expected "${name}", got "${player.name}"`);
  });
});

// Test: All players have required fields
test('All players have required fields', () => {
  const required = ['name', 'position', 'birth_date', 'birth_place', 'height', 'weight', 'shoots', 'draft_info', 'seasons'];
  manifest.players.forEach(({ id, file }) => {
    const filepath = path.join(__dirname, file);
    const player = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    required.forEach(field => {
      assert(field in player, `${id}: Missing field "${field}"`);
    });
  });
});

// Test: All seasons have required fields
test('All seasons have required fields', () => {
  const required = ['season', 'team', 'league', 'gp', 'g', 'a', 'pts', 'pim', 'plus_minus', 'playoff_gp', 'playoff_g', 'playoff_a', 'playoff_pts', 'playoff_pim'];
  manifest.players.forEach(({ id, file }) => {
    const filepath = path.join(__dirname, file);
    const player = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    assert(Array.isArray(player.seasons), `${id}: seasons must be an array`);
    player.seasons.forEach((season, idx) => {
      required.forEach(field => {
        assert(field in season, `${id} season ${idx}: Missing field "${field}"`);
      });
    });
  });
});

// Test: Numeric fields are numbers
test('Numeric fields are numbers', () => {
  const numericFields = ['gp', 'g', 'a', 'pts', 'pim', 'playoff_gp', 'playoff_g', 'playoff_a', 'playoff_pts', 'playoff_pim'];
  manifest.players.forEach(({ id, file }) => {
    const filepath = path.join(__dirname, file);
    const player = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    player.seasons.forEach((season, idx) => {
      numericFields.forEach(field => {
        assert(typeof season[field] === 'number', `${id} season ${idx}: ${field} must be a number`);
      });
    });
  });
});

// Test: File sizes are reasonable for lazy loading
test('File sizes support lazy loading', () => {
  const MAX_SIZE = 10 * 1024; // 10KB per file
  manifest.players.forEach(({ id, file }) => {
    const filepath = path.join(__dirname, file);
    const stats = fs.statSync(filepath);
    assert(stats.size <= MAX_SIZE, `${id}: File size ${stats.size} exceeds ${MAX_SIZE} bytes`);
  });
});

// Test: No duplicate player IDs
test('No duplicate player IDs', () => {
  const ids = manifest.players.map(p => p.id);
  const uniqueIds = [...new Set(ids)];
  assert(ids.length === uniqueIds.length, `Duplicate IDs found`);
});

// Test: Total size is less than original
test('Total size is less than original data.js', () => {
  let totalSize = 0;
  manifest.players.forEach(({ file }) => {
    const filepath = path.join(__dirname, file);
    const stats = fs.statSync(filepath);
    totalSize += stats.size;
  });
  const originalSize = 38 * 1024; // 38KB
  assert(totalSize < originalSize, `Total size ${totalSize} exceeds original ${originalSize}`);
});

// Test: Expected players are present
test('All expected players are present', () => {
  const expectedIds = ['holmstrom', 'redmond', 'oreilly', 'mailloux', 'kadri'];
  const actualIds = manifest.players.map(p => p.id).sort();
  expectedIds.sort();
  assert(JSON.stringify(actualIds) === JSON.stringify(expectedIds),
    `Expected ${expectedIds.join(', ')}, got ${actualIds.join(', ')}`);
});

// Summary
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
