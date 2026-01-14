// Simple test runner for normalization logic
// Run with: node tests/normalization.test.js

// Mock Chess.js for testing (minimal implementation)
global.Chess = function(fen) {
    this.fen_value = fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    this.fen = function() { return this.fen_value; };
};

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Copy normalization functions from chess-common.js
function normalizeFEN(fen) {
    if (fen === 'start') return 'start';

    var parts = fen.split(' ');
    if (parts.length === 6) {
        // Clear en passant (ephemeral, only valid for one move)
        parts[3] = '-';
        // Replace halfmove clock with 0 and fullmove number with 1
        parts[4] = '0';
        parts[5] = '1';
        return parts.join(' ');
    }
    return fen;
}

function getFENKey(fen) {
    if (fen === 'start') return 'start';

    var parts = fen.split(' ');
    if (parts.length >= 3) {
        // Return board + turn + castling (ignore en passant and move counters)
        return parts.slice(0, 3).join(' ');
    }
    return fen;
}

// Test framework
let passCount = 0;
let failCount = 0;

function assert(condition, message) {
    if (condition) {
        passCount++;
        console.log('✓', message);
    } else {
        failCount++;
        console.log('✗', message);
    }
}

function assertEquals(actual, expected, message) {
    if (actual === expected) {
        passCount++;
        console.log('✓', message);
    } else {
        failCount++;
        console.log('✗', message);
        console.log('  Expected:', expected);
        console.log('  Actual:  ', actual);
    }
}

// Run tests
console.log('Running normalization tests...\n');

// Test 1: normalizeFEN with en passant
console.log('Test Group: normalizeFEN - En Passant Clearing');
assertEquals(
    normalizeFEN('rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1'),
    'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1',
    'Should clear en passant square d3'
);

assertEquals(
    normalizeFEN('rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6 0 2'),
    'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 1',
    'Should clear en passant square d6'
);

assertEquals(
    normalizeFEN('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'),
    'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    'Should clear en passant square e3'
);

// Test 2: normalizeFEN with move counters
console.log('\nTest Group: normalizeFEN - Move Counter Normalization');
assertEquals(
    normalizeFEN('rnbqkbnr/ppp1pppp/8/3p4/3P1B2/8/PPP1PPPP/RN1QKBNR b KQkq - 1 2'),
    'rnbqkbnr/ppp1pppp/8/3p4/3P1B2/8/PPP1PPPP/RN1QKBNR b KQkq - 0 1',
    'Should reset halfmove clock from 1 to 0'
);

assertEquals(
    normalizeFEN('rnbqkbnr/ppp1pppp/8/3p4/3P1B2/8/PPP1PPPP/RN1QKBNR b KQkq - 5 10'),
    'rnbqkbnr/ppp1pppp/8/3p4/3P1B2/8/PPP1PPPP/RN1QKBNR b KQkq - 0 1',
    'Should reset halfmove clock from 5 to 0 and fullmove from 10 to 1'
);

// Test 3: normalizeFEN with 'start' keyword
console.log('\nTest Group: normalizeFEN - Start Position');
assertEquals(
    normalizeFEN('start'),
    'start',
    'Should return "start" unchanged'
);

// Test 4: normalizeFEN combines en passant and counters
console.log('\nTest Group: normalizeFEN - Combined Normalization');
assertEquals(
    normalizeFEN('rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 5 10'),
    'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1',
    'Should clear en passant AND reset counters'
);

// Test 5: Transposition detection (same position, different paths)
console.log('\nTest Group: Transposition Detection');
const pos1 = normalizeFEN('rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6 0 2');
const pos2 = normalizeFEN('rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2');
const pos3 = normalizeFEN('rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 5 10');
assertEquals(pos1, pos2, 'Positions with different en passant should normalize to same FEN');
assertEquals(pos2, pos3, 'Positions with different move counters should normalize to same FEN');
assertEquals(pos1, pos3, 'All three should be identical');

// Test 6: getFENKey
console.log('\nTest Group: getFENKey - Key Extraction');
assertEquals(
    getFENKey('rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1'),
    'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq',
    'Should extract first 3 fields only'
);

assertEquals(
    getFENKey('start'),
    'start',
    'Should return "start" unchanged'
);

// Test 7: getFENKey for fuzzy matching
console.log('\nTest Group: getFENKey - Fuzzy Matching');
const key1 = getFENKey('rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1');
const key2 = getFENKey('rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1');
const key3 = getFENKey('rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq e3 5 10');
assertEquals(key1, key2, 'Different en passant should have same key');
assertEquals(key2, key3, 'Different en passant and counters should have same key');

// Test 8: Edge cases
console.log('\nTest Group: Edge Cases');
assertEquals(
    normalizeFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    'Already normalized FEN should remain unchanged'
);

assertEquals(
    normalizeFEN('invalid'),
    'invalid',
    'Invalid FEN should be returned unchanged'
);

// Test 9: Castling rights preservation
console.log('\nTest Group: Castling Rights Preservation');
assertEquals(
    normalizeFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'),
    'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',
    'Should preserve all castling rights'
);

assertEquals(
    normalizeFEN('r3k2r/8/8/8/8/8/8/R3K2R w Kq - 0 1'),
    'r3k2r/8/8/8/8/8/8/R3K2R w Kq - 0 1',
    'Should preserve partial castling rights'
);

assertEquals(
    normalizeFEN('r3k2r/8/8/8/8/8/8/R3K2R w - - 0 1'),
    'r3k2r/8/8/8/8/8/8/R3K2R w - - 0 1',
    'Should preserve no castling rights'
);

// Print summary
console.log('\n' + '='.repeat(50));
console.log(`Tests passed: ${passCount}`);
console.log(`Tests failed: ${failCount}`);
console.log(`Total tests: ${passCount + failCount}`);
console.log('='.repeat(50));

if (failCount === 0) {
    console.log('✓ All tests passed!');
    process.exit(0);
} else {
    console.log('✗ Some tests failed');
    process.exit(1);
}
