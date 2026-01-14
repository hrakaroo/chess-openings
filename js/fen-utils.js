// FEN Utilities Module
// Handles FEN normalization, validation, and comparison

/**
 * Starting position FEN
 */
var START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Normalize FEN for consistent state matching.
 * Clears en passant and replaces move counters with '- 0 1'.
 *
 * This ensures that the same board position is always represented by the same string,
 * regardless of how it was reached or when the moves were made.
 *
 * @param {string} fen - FEN string or 'start' keyword
 * @returns {string} Normalized FEN string
 *
 * @example
 * normalizeFEN('rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 5 10')
 * // Returns: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1'
 */
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

/**
 * Get FEN key for position lookups (ignores en passant and move counters for matching).
 *
 * This is used for fuzzy matching - two positions with the same board, turn, and castling
 * rights are considered the same, even if they have different en passant or move counters.
 *
 * @param {string} fen - FEN string or 'start' keyword
 * @returns {string} FEN key (first 3 fields: board + turn + castling)
 *
 * @example
 * getFENKey('rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1')
 * // Returns: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq'
 */
function getFENKey(fen) {
    if (fen === 'start') return 'start';

    var parts = fen.split(' ');
    if (parts.length >= 3) {
        // Return board + turn + castling (ignore en passant and move counters)
        return parts.slice(0, 3).join(' ');
    }
    return fen;
}

/**
 * Validate FEN string format.
 *
 * @param {string} state - FEN string or 'start' keyword
 * @returns {{valid: boolean, error: string}} Validation result
 */
function validateState(state) {
    if (state === 'start') {
        return {valid: true, error: ''};
    }

    // Basic FEN validation - check for 6 space-separated parts
    var parts = state.split(' ');
    if (parts.length !== 6) {
        return {
            valid: false,
            error: 'FEN must have 6 space-separated fields'
        };
    }

    // Validate piece placement (ranks separated by /)
    var ranks = parts[0].split('/');
    if (ranks.length !== 8) {
        return {
            valid: false,
            error: 'Piece placement must have 8 ranks'
        };
    }

    // Validate active color
    if (parts[1] !== 'w' && parts[1] !== 'b') {
        return {
            valid: false,
            error: 'Active color must be w or b'
        };
    }

    // Validate castling (basic check)
    if (!/^(-|[KQkq]{1,4})$/.test(parts[2])) {
        return {
            valid: false,
            error: 'Invalid castling rights'
        };
    }

    // Validate en passant (basic check)
    if (!/^(-|[a-h][36])$/.test(parts[3])) {
        return {
            valid: false,
            error: 'Invalid en passant square'
        };
    }

    // Note: We don't strictly validate halfmove and fullmove as numbers
    // since we normalize them anyway

    return {valid: true, error: ''};
}

/**
 * Convert state to FEN notation.
 *
 * @param {string} state - State string ('start' or FEN)
 * @returns {string} FEN string
 */
function stateToFEN(state) {
    if (state === 'start') {
        return START_FEN;
    }
    return state;
}

/**
 * Convert board state to normalized FEN using the global game object.
 *
 * @returns {string} Normalized FEN string or 'start'
 */
function boardToFEN() {
    var fen = game.fen();
    // If it's the starting position, return 'start' for convenience
    if (fen === START_FEN) {
        return 'start';
    }
    // Normalize FEN: replace en passant and move counters
    return normalizeFEN(fen);
}

// Export for use in other modules (if using ES6 modules)
// For now, these are global functions accessible in all HTML files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        START_FEN,
        normalizeFEN,
        getFENKey,
        validateState,
        stateToFEN,
        boardToFEN
    };
}
