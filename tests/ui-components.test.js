// UI Components Unit Tests
// Tests: ScoreDisplay, HintTooltip, WinModal, TableRenderer

import { ScoreDisplay } from '../src/ui/ScoreDisplay.js';
import { HintTooltip } from '../src/ui/HintTooltip.js';
import { WinModal } from '../src/ui/WinModal.js';
import { TableRenderer } from '../src/ui/TableRenderer.js';

// Mock DOM environment
global.document = {
    createElement: (tag) => {
        const classes = [];
        return {
            className: '',
            textContent: '',
            style: {},
            classList: {
                add: function(cls) { if (!classes.includes(cls)) classes.push(cls); },
                remove: function(cls) { const idx = classes.indexOf(cls); if (idx > -1) classes.splice(idx, 1); },
                contains: function(cls) { return classes.includes(cls); }
            },
            appendChild: () => {},
            addEventListener: () => {},
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 40 }),
            animate: () => ({ onfinish: null })
        };
    },
    body: {
        appendChild: () => {}
    },
    querySelectorAll: () => [],
    getElementById: () => null
};

global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.performance = { now: () => Date.now() };
global.window = { innerHeight: 800 };

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
    if (condition) {
        testsPassed++;
        console.log(`✓ ${message}`);
    } else {
        testsFailed++;
        console.error(`✗ ${message}`);
    }
}

console.log('\n=== ScoreDisplay Tests ===\n');

// Test 1: Constructor validation
try {
    new ScoreDisplay({});
    assert(false, 'Should throw error for missing elements');
} catch (e) {
    assert(e.message.includes('Required score display elements missing'), 'Constructor validates required elements');
}

// Test 2: Score update
const mockElements = {
    scoreValue: { textContent: '' },
    scoreProgress: {
        style: { width: '' },
        classList: {
            add: function(cls) { this.classes = this.classes || []; this.classes.push(cls); },
            remove: function() { this.classes = []; },
            classes: []
        }
    },
    scorePercentage: { textContent: '' },
    scoreDelta: {
        textContent: '',
        classList: { add: () => {}, remove: () => {} }
    }
};

const scoreDisplay = new ScoreDisplay(mockElements);
scoreDisplay.updateScore(150, 100);
assert(mockElements.scoreValue.textContent === 150, 'Score value updated correctly');
assert(mockElements.scoreProgress.style.width === '150%', 'Score progress bar width set');
assert(mockElements.scorePercentage.textContent === '150%', 'Score percentage displayed');
assert(mockElements.scoreProgress.classList.classes.includes('excellent'), 'Excellent class applied for 100%+');

// Test 3: Progress bar color classes
scoreDisplay.updateScore(85, 100);
assert(mockElements.scoreProgress.classList.classes.includes('good'), 'Good class applied for 80-99%');

scoreDisplay.updateScore(65, 100);
assert(mockElements.scoreProgress.classList.classes.includes('average'), 'Average class applied for 60-79%');

scoreDisplay.updateScore(50, 100);
assert(mockElements.scoreProgress.classList.classes.includes('low'), 'Low class applied for <60%');

// Test 4: Show delta badge
scoreDisplay.showScoreDelta(50);
assert(mockElements.scoreDelta.textContent === '+50', 'Positive delta shows +50');

scoreDisplay.showScoreDelta(-20);
assert(mockElements.scoreDelta.textContent === -20, 'Negative delta shows -20');

// Test 5: Reset functionality
scoreDisplay.reset();
assert(scoreDisplay.animatingScore === false, 'Animation state reset');

console.log('\n=== HintTooltip Tests ===\n');

// Test 6: Tooltip creation
const hintBtn = {
    addEventListener: () => {},
    getBoundingClientRect: () => ({ left: 100, top: 200, width: 80, height: 40 }),
    textContent: ''
};
const hintTooltip = new HintTooltip({ hintBtn });
assert(hintTooltip.tooltip !== null, 'Tooltip element created');

// Test 7: Update hint button text
hintTooltip.updateHintButtonText(0, 3);
assert(hintBtn.textContent === 'Hint (-20): Playoffs', 'First hint text set correctly');

hintTooltip.updateHintButtonText(1, 3);
assert(hintBtn.textContent === 'Hint (-20): Teams', 'Second hint text set correctly');

hintTooltip.updateHintButtonText(2, 3);
assert(hintBtn.textContent === 'Hint (-20): 4 Choices', 'Third hint text set correctly');

hintTooltip.updateHintButtonText(3, 3);
assert(hintBtn.textContent === 'No Hints Left', 'No hints left text displayed');

console.log('\n=== WinModal Tests ===\n');

// Test 8: Grade calculation
const winModal = new WinModal({
    successModal: { classList: { add: () => {}, remove: () => {} } },
    successPlayer: { textContent: '' },
    successScore: { textContent: '' },
    finalModal: { classList: { add: () => {}, remove: () => {} } },
    finalYourScore: { textContent: '' },
    finalMaxScore: { textContent: '' },
    finalPercentage: { textContent: '' },
    finalGrade: { textContent: '', className: '' },
    breakdownList: { innerHTML: '', appendChild: () => {} }
});

const gradeA = winModal.calculateGrade(92);
assert(gradeA.grade === 'A+' && gradeA.gradeClass === 'grade-a-plus', 'A+ grade for 90%+');

const gradeB = winModal.calculateGrade(75);
assert(gradeB.grade === 'B' && gradeB.gradeClass === 'grade-b', 'B grade for 70-79%');

const gradeC = winModal.calculateGrade(65);
assert(gradeC.grade === 'C' && gradeC.gradeClass === 'grade-c', 'C grade for 60-69%');

const gradeF = winModal.calculateGrade(45);
assert(gradeF.grade === 'F' && gradeF.gradeClass === 'grade-f', 'F grade for <50%');

console.log('\n=== TableRenderer Tests ===\n');

// Test 9: Constructor validation
try {
    new TableRenderer({});
    assert(false, 'Should throw error for missing table body');
} catch (e) {
    assert(e.message.includes('Stats table body element missing'), 'Constructor validates table body element');
}

// Test 10: Create stats row
const mockTable = {
    querySelectorAll: () => []
};

const tableRenderer = new TableRenderer({
    statsBody: {
        innerHTML: '',
        appendChild: () => {},
        closest: () => mockTable,
        parentElement: mockTable
    }
});

const mockSeason = {
    season: '2020-21',
    league: 'NHL',
    team: 'Detroit Red Wings',
    gp: 56,
    g: 10,
    a: 20,
    pts: 30,
    pim: 25,
    plus_minus: 5,
    playoff_gp: 4,
    playoff_g: 1,
    playoff_a: 2,
    playoff_pts: 3,
    playoff_pim: 2
};

const row = tableRenderer.createStatsRow(mockSeason);
assert(row !== null, 'Stats row created');

// Test 11: NHL vs Junior row styling
const nhlSeason = { ...mockSeason, league: 'NHL' };
const nhlRow = tableRenderer.createStatsRow(nhlSeason);
assert(nhlRow.classList.contains('nhl-row'), 'NHL row has nhl-row class');

const juniorSeason = { ...mockSeason, league: 'OHL' };
const juniorRow = tableRenderer.createStatsRow(juniorSeason);
assert(juniorRow.classList.contains('junior-row'), 'Junior row has junior-row class');

// Test 12: Plus/minus handling
const noStatsSeason = { ...mockSeason, plus_minus: null };
const noStatsRow = tableRenderer.createStatsRow(noStatsSeason);
assert(noStatsRow !== null, 'Row created even with null plus_minus');

console.log('\n=== Test Summary ===\n');
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}\n`);

if (testsFailed === 0) {
    console.log('✓ All tests passed!');
    process.exit(0);
} else {
    console.error(`✗ ${testsFailed} test(s) failed`);
    process.exit(1);
}
