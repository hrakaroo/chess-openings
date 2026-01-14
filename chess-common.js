// Chess Opening Practice Tool - Common Functions
// Shared code across View, Edit, and Practice modes

// Initialize the chess game logic
var game = new Chess();

// Graph data structures
var graphNodes = [];  // Array of unique states
var graphEdges = [];  // Array of {from: stateIndex, to: stateIndex, annotation: string}
var stateToIndex = new Map();  // Map state string to its index in graphNodes
var currentBoardState = 'start';  // Track the current board state (FEN or 'start')
var lastEdgeIndex = -1;  // Track the last edge created for annotation
var precomputedPositions = null;  // Optional pre-computed node positions from JSON
var nodeEvaluations = {};  // Map state string to evaluation string (e.g., "+0.50", "M5")
var loadedTitle = '';  // Title of the loaded route file

// Starting position FEN
var START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Normalize FEN for consistent state matching
// Clears en passant and replaces move counters with '- 0 1'
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

// Get FEN key for position lookups (ignores en passant and move counters for matching)
function getFENKey(fen) {
    if (fen === 'start') return 'start';

    var parts = fen.split(' ');
    if (parts.length >= 3) {
        // Return board + turn + castling (ignore en passant and move counters)
        return parts.slice(0, 3).join(' ');
    }
    return fen;
}

// History tracking for undo/redo
var moveHistory = ['start'];  // Array of states in chronological order (FEN or 'start')
var historyIndex = 0;  // Current position in history
var isNavigatingHistory = false;  // Flag to prevent adding to history during undo/redo

// Board reference (will be initialized by each page)
var board = null;

// Add a node to the graph if it doesn't exist, return its index
function addNodeToGraph(state) {
    // Normalize state to ensure consistent comparison
    var normalizedState = normalizeFEN(state);

    if (!stateToIndex.has(normalizedState)) {
        var index = graphNodes.length;
        graphNodes.push(normalizedState);
        stateToIndex.set(normalizedState, index);
        return index;
    }
    return stateToIndex.get(normalizedState);
}

// Add an edge to the graph if it doesn't exist
function addEdgeToGraph(fromState, toState, annotation, skipDraw) {
    var fromIndex = addNodeToGraph(fromState);
    var toIndex = addNodeToGraph(toState);

    // Check if edge already exists
    var existingEdgeIndex = -1;
    for (var i = 0; i < graphEdges.length; i++) {
        if (graphEdges[i].from === fromIndex && graphEdges[i].to === toIndex) {
            existingEdgeIndex = i;
            break;
        }
    }

    if (existingEdgeIndex === -1) {
        // Create new edge
        var newEdge = {
            from: fromIndex,
            to: toIndex,
            annotation: annotation || ''
        };
        graphEdges.push(newEdge);
        lastEdgeIndex = graphEdges.length - 1;
    } else {
        // Update existing edge annotation if provided
        if (annotation !== undefined && annotation !== '') {
            graphEdges[existingEdgeIndex].annotation = annotation;
        }
        lastEdgeIndex = existingEdgeIndex;
    }

    if (!skipDraw) {
        drawGraph();
    }
}

// Remove orphaned nodes (nodes with no incoming or outgoing edges)
function removeOrphanedNodes() {
    // Build a set of nodes that have edges
    var nodesWithEdges = new Set();
    nodesWithEdges.add(stateToIndex.get('start')); // Always keep start node

    for (var i = 0; i < graphEdges.length; i++) {
        nodesWithEdges.add(graphEdges[i].from);
        nodesWithEdges.add(graphEdges[i].to);
    }

    // Find orphaned nodes
    var nodesToRemove = [];
    for (var j = 0; j < graphNodes.length; j++) {
        if (!nodesWithEdges.has(j)) {
            nodesToRemove.push(j);
        }
    }

    if (nodesToRemove.length === 0) return;

    // Remove orphaned nodes (from highest index to lowest to maintain indices)
    nodesToRemove.reverse();
    for (var k = 0; k < nodesToRemove.length; k++) {
        var removeIndex = nodesToRemove[k];
        var removedState = graphNodes[removeIndex];

        // Remove from array
        graphNodes.splice(removeIndex, 1);

        // Update stateToIndex map
        stateToIndex.delete(removedState);

        // Rebuild stateToIndex for indices after the removed one
        for (var m = removeIndex; m < graphNodes.length; m++) {
            stateToIndex.set(graphNodes[m], m);
        }

        // Update edge indices
        for (var n = 0; n < graphEdges.length; n++) {
            if (graphEdges[n].from > removeIndex) graphEdges[n].from--;
            if (graphEdges[n].to > removeIndex) graphEdges[n].to--;
        }
    }
}

// Remove all edges and nodes in the "future" from a given state
function removeFutureFromGraph(fromStateIndex) {
    // Build adjacency list
    var children = {};
    for (var i = 0; i < graphEdges.length; i++) {
        var from = graphEdges[i].from;
        if (!children[from]) children[from] = [];
        children[from].push(graphEdges[i].to);
    }

    // BFS to find all reachable nodes from start
    var reachableFromStart = new Set();
    var queue = [stateToIndex.get('start')];
    reachableFromStart.add(stateToIndex.get('start'));

    while (queue.length > 0) {
        var node = queue.shift();
        if (children[node]) {
            for (var j = 0; j < children[node].length; j++) {
                var child = children[node][j];
                if (!reachableFromStart.has(child)) {
                    reachableFromStart.add(child);
                    queue.push(child);
                }
            }
        }
    }

    // Remove edges going out from fromStateIndex
    graphEdges = graphEdges.filter(function(edge) {
        return edge.from !== fromStateIndex;
    });

    // Remove orphaned nodes
    removeOrphanedNodes();

    drawGraph();
}

// Get current board state as FEN (or 'start' for starting position)
function boardToFEN() {
    var fen = game.fen();
    // If it's the starting position, return 'start' for convenience
    if (fen === START_FEN) {
        return 'start';
    }
    // Normalize FEN: replace halfmove clock and fullmove number with '-'
    return normalizeFEN(fen);
}

// Load a state onto the board
function loadState(state, addToHistoryFlag) {
    // Normalize state for consistency
    var normalizedState = normalizeFEN(state);

    // Load FEN into game engine
    if (normalizedState === 'start') {
        game.reset();
        board.position('start');
    } else {
        game.load(normalizedState);
        board.position(game.fen());
    }

    currentBoardState = normalizedState;

    if (addToHistoryFlag && !isNavigatingHistory) {
        // Trim history after current index and add new state
        moveHistory = moveHistory.slice(0, historyIndex + 1);
        moveHistory.push(state);
        historyIndex = moveHistory.length - 1;
        if (typeof updateHistoryButtons === 'function') {
            updateHistoryButtons();
        }
    }

    // Update annotation input if present
    var annotationInput = document.getElementById('annotationInput');
    if (annotationInput && lastEdgeIndex !== -1 && lastEdgeIndex < graphEdges.length) {
        annotationInput.value = graphEdges[lastEdgeIndex].annotation || '';
    }

    // Update turn label if present
    if (typeof updateTurnLabel === 'function') {
        updateTurnLabel();
    }

    // Update evaluation label if present
    updateEvaluationLabel();

    drawGraph();
}

// Helper function to find evaluation with fuzzy FEN matching
function findEvaluation(state) {
    // Try exact match first
    if (nodeEvaluations[state]) {
        return nodeEvaluations[state];
    }

    // Try fuzzy match (ignore move counters)
    var stateKey = getFENKey(state);
    for (var evalState in nodeEvaluations) {
        if (getFENKey(evalState) === stateKey) {
            return nodeEvaluations[evalState];
        }
    }
    return null;
}

// Update evaluation label with current position's evaluation
function updateEvaluationLabel() {
    var evalLabel = document.getElementById('evaluationLabel');
    if (!evalLabel) return;

    var evaluation = findEvaluation(currentBoardState);
    if (evaluation) {
        evalLabel.textContent = evaluation;
        evalLabel.style.display = 'block';
    } else {
        evalLabel.style.display = 'none';
    }
}

// Validate a state string format
function validateState(state) {
    if (state === 'start') {
        return {valid: true};
    }

    // Try to load the FEN into a temporary game to validate it
    try {
        var testGame = new Chess();
        testGame.load(state);
        return {valid: true};
    } catch (e) {
        return {valid: false, error: 'Invalid FEN: ' + e.message};
    }
}

// Export all graph states to v4.0 format
function exportAllStates() {
    if (graphEdges.length === 0) {
        alert('No routes to export. Add some moves first.');
        return;
    }

    // Check if we're in edit mode
    var isEditMode = typeof updateHistoryButtons === 'function';

    // Build position definitions (only in View mode, not Edit mode)
    var positionLines = [];
    if (!isEditMode && precomputedPositions && Object.keys(precomputedPositions).length > 0) {
        for (var state in precomputedPositions) {
            if (precomputedPositions.hasOwnProperty(state)) {
                var pos = precomputedPositions[state];
                var line = state + ' : ' + pos.x + ', ' + pos.y;

                // Add evaluation if available
                if (nodeEvaluations[state]) {
                    line += ', ' + nodeEvaluations[state];
                }

                positionLines.push(line);
            }
        }
    }

    // Build transitions with annotations as # comment lines
    var transitionLines = [];
    for (var i = 0; i < graphEdges.length; i++) {
        var edge = graphEdges[i];
        var fromState = graphNodes[edge.from];
        var toState = graphNodes[edge.to];

        // Add annotation as # comment lines if present
        if (edge.annotation && edge.annotation.length > 0) {
            transitionLines.push('# ' + edge.annotation);
        }

        // Get move notation instead of full target FEN
        var moveNotation = getMoveNotation(fromState, toState);

        // Add transition as: from_state -> move
        transitionLines.push(fromState + ' -> ' + moveNotation);
    }

    // Add version header, title (if exists), and combine positions + transitions
    var content = 'v4.0\n';
    if (loadedTitle) {
        content += '= ' + loadedTitle + '\n';
    }
    if (positionLines.length > 0) {
        content += positionLines.join('\n') + '\n';
    }
    content += transitionLines.join('\n');

    // Prompt for filename
    var filename = prompt('Enter filename for export:', 'openings.txt');
    if (!filename) return;

    if (!filename.endsWith('.txt')) {
        filename += '.txt';
    }

    // Create download
    var blob = new Blob([content], {type: 'text/plain'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Export to PGN format
function exportToPGN() {
    if (graphNodes.length === 0) {
        alert('No routes to export.');
        return;
    }

    // Build adjacency list of moves
    var moves = {};
    for (var i = 0; i < graphEdges.length; i++) {
        var edge = graphEdges[i];
        var fromState = graphNodes[edge.from];
        if (!moves[fromState]) {
            moves[fromState] = [];
        }
        moves[fromState].push({
            to: graphNodes[edge.to],
            annotation: edge.annotation
        });
    }

    // Generate PGN headers
    var pgn = '[Event "Opening Repertoire"]\n';
    pgn += '[Site "Chess Opening Practice Tool"]\n';
    pgn += '[Date "' + new Date().toISOString().split('T')[0].replace(/-/g, '.') + '"]\n';
    pgn += '[White "Repertoire"]\n';
    pgn += '[Black "Repertoire"]\n';
    pgn += '[Result "*"]\n\n';

    // Generate move text recursively
    function generatePGNMoveText(state, moveNumber, indent) {
        var currentMoves = moves[state];
        if (!currentMoves || currentMoves.length === 0) return '';

        var result = '';
        // Determine whose turn it is from FEN or 'start' keyword
        var isWhiteToMove = true;
        if (state !== 'start') {
            var fenParts = state.split(' ');
            if (fenParts.length >= 2) {
                isWhiteToMove = fenParts[1] === 'w';
            }
        }

        // Main line (first move)
        var mainMove = currentMoves[0];
        var moveNotation = getMoveNotation(state, mainMove.to);

        if (isWhiteToMove) {
            result += moveNumber + '. ' + moveNotation;
        } else {
            if (result === '') {
                result += moveNumber + '... ' + moveNotation;
            } else {
                result += ' ' + moveNotation;
            }
        }

        var nextMoveNumber = isWhiteToMove ? moveNumber : moveNumber + 1;
        result += generatePGNMoveText(mainMove.to, nextMoveNumber, indent);

        // Variations (alternative moves)
        for (var i = 1; i < currentMoves.length; i++) {
            var variation = currentMoves[i];
            var varMoveNotation = getMoveNotation(state, variation.to);

            result += ' (';
            if (isWhiteToMove) {
                result += moveNumber + '. ' + varMoveNotation;
            } else {
                result += moveNumber + '... ' + varMoveNotation;
            }

            result += generatePGNMoveText(variation.to, nextMoveNumber, indent + '  ');
            result += ')';
        }

        return result;
    }

    pgn += generatePGNMoveText('start', 1, '');
    pgn += ' *\n';

    // Prompt for filename
    var filename = prompt('Enter filename for PGN export:', 'openings.pgn');
    if (!filename) return;

    if (!filename.endsWith('.pgn')) {
        filename += '.pgn';
    }

    // Create download
    var blob = new Blob([pgn], {type: 'application/x-chess-pgn'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Get move notation between two states
function getMoveNotation(fromState, toState) {
    // Handle 'start' keyword
    var fromFen = (fromState === 'start') ? START_FEN : fromState;
    var toFen = (toState === 'start') ? START_FEN : toState;

    // Create temporary game to find the move
    var tempGame = new Chess(fromFen);
    var moves = tempGame.moves({verbose: true});

    // Get FEN key of target (first 4 fields for fuzzy matching)
    var targetKey = getFENKey(toFen);

    for (var i = 0; i < moves.length; i++) {
        tempGame.move(moves[i]);
        var resultFen = tempGame.fen();

        // Compare using FEN key (first 4 fields: board + turn + castling + en passant)
        var resultKey = getFENKey(resultFen);

        if (resultKey === targetKey) {
            return moves[i].san;
        }

        tempGame.undo();
    }

    return '???';
}

// Load routes from file content
function loadRoutesFromFile(fileContent, filename) {
    var lines = fileContent.split('\n');

    if (lines.length === 0) {
        alert('File is empty');
        return;
    }

    // Check version header
    var version = lines[0].trim();
    if (!version.startsWith('v')) {
        alert('Invalid file format. Missing version header.');
        return;
    }

    if (version !== 'v4.0') {
        alert('Invalid file format. Expected v4.0, got ' + version);
        return;
    }

    // Parse title (required in v4.0 format)
    if (lines.length < 2 || !lines[1].trim().startsWith('=')) {
        alert('Invalid file format. Missing title line (= Title).');
        return;
    }
    loadedTitle = lines[1].trim().substring(1).trim();
    var startLine = 2;

    // Reset graph
    graphNodes = [];
    graphEdges = [];
    stateToIndex = new Map();
    moveHistory = ['start'];
    historyIndex = 0;
    lastEdgeIndex = -1;
    precomputedPositions = {};
    nodeEvaluations = {};
    cachedDagrePositions = null;
    lastGraphStructure = null;

    // Parse file in two passes: first positions, then transitions
    var invalidCount = 0;
    var positionCount = 0;
    var pendingComments = [];  // Accumulate # comment lines before transitions

    for (var i = startLine; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line.length === 0) continue;

        // Check if this is a comment line (starts with #)
        if (line.startsWith('#')) {
            var comment = line.substring(1).trim();
            if (comment.length > 0) {
                pendingComments.push(comment);
            }
            continue;
        }

        // Check if this is a position definition or transition
        if (line.indexOf('->') !== -1) {
            // This is a transition: "state -> move" or "state -> state" (old format)
            var arrowSplit = line.split('->');
            if (arrowSplit.length === 2) {
                var fromState = arrowSplit[0].trim();
                var toPart = arrowSplit[1].trim();

                // Join accumulated comments as annotation
                var annotation = pendingComments.join(' ');
                pendingComments = [];  // Clear for next transition

                // Validate fromState
                var fromValid = validateState(fromState);

                if (fromValid.valid) {
                    // Check if toPart is a FEN string (contains '/') or move notation
                    if (toPart.indexOf('/') !== -1 || toPart === 'start') {
                        // Old format: toPart is a full FEN state
                        var toState = toPart;
                        var toValid = validateState(toState);
                        if (toValid.valid) {
                            addEdgeToGraph(fromState, toState, annotation, true);
                        } else {
                            invalidCount++;
                            console.warn('Line ' + (i + 1) + ': Invalid to state - ' + toValid.error);
                        }
                    } else {
                        // New format: toPart is move notation - apply the move to get toState
                        var moveNotation = toPart;
                        var fromFen = (fromState === 'start') ? START_FEN : fromState;
                        var tempGame = new Chess(fromFen);

                        try {
                            var move = tempGame.move(moveNotation);
                            if (move === null) {
                                invalidCount++;
                                console.warn('Line ' + (i + 1) + ': Invalid move "' + moveNotation + '" from state ' + fromState.substring(0, 20) + '...');
                            } else {
                                // Get resulting FEN, normalize, and convert to 'start' if needed
                                var resultFen = tempGame.fen();
                                var toState = (resultFen === START_FEN) ? 'start' : normalizeFEN(resultFen);
                                addEdgeToGraph(fromState, toState, annotation, true);
                            }
                        } catch (e) {
                            invalidCount++;
                            console.warn('Line ' + (i + 1) + ': Error applying move "' + moveNotation + '" - ' + e.message);
                        }
                    }
                } else {
                    invalidCount++;
                    console.warn('Line ' + (i + 1) + ': Invalid from state - ' + fromValid.error);
                }
            } else {
                invalidCount++;
                console.warn('Line ' + (i + 1) + ': Malformed transition (missing ->)');
                pendingComments = [];  // Clear on error
            }
        } else if (line.indexOf(':') !== -1) {
            // Clear comments before position definitions
            pendingComments = [];
            // This might be a position definition: "state : x, y" or "state : x, y, eval"
            // In Edit mode, skip positions and evaluations (use dynamic layout)
            var isEditMode = typeof updateHistoryButtons === 'function';

            if (!isEditMode) {
                var colonPos = line.indexOf(':');
                var state = line.substring(0, colonPos).trim();
                var coords = line.substring(colonPos + 1).trim();

                // Try to parse coordinates and optional evaluation
                var coordParts = coords.split(',');
                if (coordParts.length >= 2) {
                    var x = parseFloat(coordParts[0].trim());
                    var y = parseFloat(coordParts[1].trim());

                    if (!isNaN(x) && !isNaN(y)) {
                        // Valid position definition
                        var stateValid = validateState(state);
                        if (stateValid.valid) {
                            precomputedPositions[state] = {x: x, y: y};

                            // Check if there's an evaluation (3rd part)
                            if (coordParts.length >= 3) {
                                var evaluation = coordParts[2].trim();
                                if (evaluation.length > 0) {
                                    nodeEvaluations[state] = evaluation;
                                }
                            }

                            positionCount++;
                        } else {
                            console.warn('Line ' + (i + 1) + ': Invalid state in position definition - ' + stateValid.error);
                        }
                    } else {
                        console.warn('Line ' + (i + 1) + ': Invalid coordinates in position definition');
                    }
                }
            }
        }
    }

    // Reset board to starting position
    game.reset();
    board.position('start');
    currentBoardState = 'start';

    // Update evaluation label
    updateEvaluationLabel();

    // Update loaded file label if present
    var label = document.getElementById('loadedFileLabel');
    if (label) {
        var message = 'Loaded: ';
        if (loadedTitle) {
            message += loadedTitle + ' - ';
        }
        message += filename + ' (' + version + ')';
        if (positionCount > 0) {
            message += ' with ' + positionCount + ' positions';
        }
        if (invalidCount > 0) {
            message += ' - ' + invalidCount + ' invalid lines skipped';
        }
        label.innerText = message;
        label.style.color = invalidCount > 0 ? '#d32f2f' : '#666';
    }

    drawGraph();

    // Auto-fit view in practice and view modes (not edit mode)
    var isEditMode = typeof updateHistoryButtons === 'function';
    if (!isEditMode) {
        fitView();
    }

    // Enable Start button in practice mode after loading routes
    var startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.disabled = false;
    }
}

// Load pre-computed positions from JSON
function loadPositionsFromFile(fileContent, filename) {
    try {
        var positions = JSON.parse(fileContent);
        precomputedPositions = positions;

        var label = document.getElementById('loadedFileLabel');
        if (label) {
            var currentText = label.innerText;
            if (currentText) {
                label.innerText = currentText + ' + positions';
            } else {
                label.innerText = 'Loaded positions: ' + filename;
            }
        }

        drawGraph();
    } catch (e) {
        alert('Error parsing positions file: ' + e.message);
    }
}

// Canvas and graph rendering
var canvas = null;
var ctx = null;
var nodePositions = [];
var nodeRadius = 15;
var cachedDagrePositions = null;  // Cache Dagre layout results
var lastGraphStructure = null;    // Track graph changes

// Node colors
var NODE_COLORS = {
    START: '#4A90E2',        // Blue
    WHITE_TO_MOVE: '#9E9E9E', // Dark grey (white's turn)
    BLACK_TO_MOVE: '#BDBDBD', // Light grey (black's turn)
    CURRENT: '#4CAF50',      // Green
    EVALUATED: '#E53935'     // Red (positions with Stockfish evaluation)
};

// Transform state for zoom/pan
var transform = {
    x: 0,
    y: 0,
    scale: 1.0
};

// Mouse state for dragging
var isDragging = false;
var dragStartX = 0;
var dragStartY = 0;
var hoveredNodeIndex = -1;

// Initialize canvas
function initCanvas() {
    canvas = document.getElementById('graphCanvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }

    ctx = canvas.getContext('2d');

    // Set up event listeners
    setupCanvasEventListeners();

    // Initialize with starting node
    addNodeToGraph('start');

    // Set up resize handler
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

// Resize canvas to fit container
function resizeCanvas() {
    if (!canvas) return;

    var container = canvas.parentElement;
    var rect = container.getBoundingClientRect();
    canvas.width = rect.width - 2;
    canvas.height = rect.height - 2;
    drawGraph();
}

// Fit view to show all nodes
function fitView() {
    if (nodePositions.length === 0) return;

    var minX = Infinity, maxX = -Infinity;
    var minY = Infinity, maxY = -Infinity;

    for (var i = 0; i < nodePositions.length; i++) {
        var pos = nodePositions[i];
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x);
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y);
    }

    var graphWidth = maxX - minX;
    var graphHeight = maxY - minY;
    var padding = 50;

    var scaleX = (canvas.width - 2 * padding) / graphWidth;
    var scaleY = (canvas.height - 2 * padding) / graphHeight;
    var newScale = Math.min(scaleX, scaleY, 1.0);

    var centerX = (minX + maxX) / 2;
    var centerY = (minY + maxY) / 2;

    transform.scale = newScale;
    transform.x = canvas.width / 2 - centerX * newScale;
    transform.y = canvas.height / 2 - centerY * newScale;

    drawGraph();
}

// Draw the graph using Dagre layout
function drawGraph() {
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (graphNodes.length === 0) return;

    // Helper function to find precomputed position with fuzzy FEN matching
    function findPrecomputedPosition(state) {
        // Try exact match first
        if (precomputedPositions[state]) {
            return precomputedPositions[state];
        }

        // Try fuzzy match (ignore move counters)
        var stateKey = getFENKey(state);
        for (var precompState in precomputedPositions) {
            if (getFENKey(precompState) === stateKey) {
                return precomputedPositions[precompState];
            }
        }
        return null;
    }

    // Use pre-computed positions if available
    if (precomputedPositions && Object.keys(precomputedPositions).length > 0) {
        nodePositions = [];
        for (var k = 0; k < graphNodes.length; k++) {
            var state = graphNodes[k];
            var pos = findPrecomputedPosition(state);
            if (pos) {
                nodePositions.push({
                    x: pos.x,
                    y: pos.y,
                    state: state
                });
            }
        }
    } else {
        // Check if graph structure changed
        var currentStructure = graphNodes.length + '-' + graphEdges.length;
        var structureChanged = currentStructure !== lastGraphStructure;

        // Use cached positions if graph hasn't changed
        if (!structureChanged && cachedDagrePositions) {
            nodePositions = cachedDagrePositions;
        } else {
            // Build Dagre graph structure only when we need to compute layout
            var g = new dagre.graphlib.Graph();
            g.setGraph({
                rankdir: 'TB',
                ranksep: 80,
                nodesep: 60,
                ranker: 'network-simplex',
                align: 'DL'
            });
            g.setDefaultEdgeLabel(function() { return {}; });

            // Add nodes
            for (var i = 0; i < graphNodes.length; i++) {
                g.setNode(i, {width: nodeRadius * 2, height: nodeRadius * 2});
            }

            // Add edges
            for (var j = 0; j < graphEdges.length; j++) {
                g.setEdge(graphEdges[j].from, graphEdges[j].to);
            }

            // Compute layout with Dagre
            dagre.layout(g);
            nodePositions = [];
            for (var m = 0; m < graphNodes.length; m++) {
                var node = g.node(m);
                if (node) {
                    nodePositions.push({
                        x: node.x,
                        y: node.y,
                        state: graphNodes[m]
                    });
                }
            }

            // Cache the results
            cachedDagrePositions = nodePositions;
            lastGraphStructure = currentStructure;
        }
    }

    // Apply transform
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    // Draw edges first with curved lines
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    graphEdges.forEach(function(edge) {
        var fromPos = nodePositions[edge.from];
        var toPos = nodePositions[edge.to];

        // Calculate control point for quadratic curve
        var controlX = (fromPos.x + toPos.x) / 2;
        var controlY = fromPos.y + (toPos.y - fromPos.y) * 0.3;

        ctx.beginPath();
        ctx.moveTo(fromPos.x, fromPos.y);
        ctx.quadraticCurveTo(controlX, controlY, toPos.x, toPos.y);
        ctx.stroke();
    });

    // Draw nodes
    for (var n = 0; n < nodePositions.length; n++) {
        var pos = nodePositions[n];
        var state = pos.state;

        // Determine color (priority: current > start > evaluated > default)
        if (state === currentBoardState) {
            ctx.fillStyle = NODE_COLORS.CURRENT;
        } else if (state === 'start') {
            ctx.fillStyle = NODE_COLORS.START;
        } else if (findEvaluation(state)) {
            // Node has Stockfish evaluation - color it red
            ctx.fillStyle = NODE_COLORS.EVALUATED;
        } else {
            // Determine whose turn it is from FEN string
            var isWhiteTurn = true;  // default
            if (state !== 'start') {
                var fenParts = state.split(' ');
                if (fenParts.length >= 2) {
                    isWhiteTurn = fenParts[1] === 'w';
                }
            }
            ctx.fillStyle = isWhiteTurn ? NODE_COLORS.WHITE_TO_MOVE : NODE_COLORS.BLACK_TO_MOVE;
        }

        // Highlight hovered node
        if (n === hoveredNodeIndex) {
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 3;
        } else {
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
        }

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, nodeRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Draw label only for start node
        if (state === 'start') {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('start', pos.x, pos.y);
        }
    }

    ctx.restore();
}

// Setup canvas event listeners
function setupCanvasEventListeners() {
    if (!canvas) return;

    // Click handler - navigate to node
    canvas.addEventListener('click', function(event) {
        // Disable node clicking in practice mode
        var isPracticeMode = document.getElementById('correctField') !== null;
        if (isPracticeMode) {
            return;
        }

        var rect = canvas.getBoundingClientRect();
        var mouseX = event.clientX - rect.left;
        var mouseY = event.clientY - rect.top;

        // Transform to graph coordinates
        var graphX = (mouseX - transform.x) / transform.scale;
        var graphY = (mouseY - transform.y) / transform.scale;

        // Check if clicked on a node
        for (var i = 0; i < nodePositions.length; i++) {
            var pos = nodePositions[i];
            var dx = graphX - pos.x;
            var dy = graphY - pos.y;
            var distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= nodeRadius) {
                loadState(pos.state, true);
                return;
            }
        }
    });

    // Mouse wheel zoom
    canvas.addEventListener('wheel', function(event) {
        event.preventDefault();

        var rect = canvas.getBoundingClientRect();
        var mouseX = event.clientX - rect.left;
        var mouseY = event.clientY - rect.top;

        var zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
        var newScale = transform.scale * zoomFactor;

        newScale = Math.max(0.1, Math.min(5.0, newScale));

        var worldX = (mouseX - transform.x) / transform.scale;
        var worldY = (mouseY - transform.y) / transform.scale;

        transform.scale = newScale;
        transform.x = mouseX - worldX * newScale;
        transform.y = mouseY - worldY * newScale;

        drawGraph();
    });

    // Drag to pan
    canvas.addEventListener('mousedown', function(event) {
        if (event.button === 0) {
            isDragging = true;
            dragStartX = event.clientX;
            dragStartY = event.clientY;
            canvas.style.cursor = 'grabbing';
        }
    });

    canvas.addEventListener('mousemove', function(event) {
        var rect = canvas.getBoundingClientRect();
        var mouseX = event.clientX - rect.left;
        var mouseY = event.clientY - rect.top;

        if (isDragging) {
            var dx = event.clientX - dragStartX;
            var dy = event.clientY - dragStartY;

            transform.x += dx;
            transform.y += dy;

            dragStartX = event.clientX;
            dragStartY = event.clientY;

            drawGraph();
        } else {
            // Hover detection
            var graphX = (mouseX - transform.x) / transform.scale;
            var graphY = (mouseY - transform.y) / transform.scale;

            var oldHovered = hoveredNodeIndex;
            hoveredNodeIndex = -1;

            for (var i = 0; i < nodePositions.length; i++) {
                var pos = nodePositions[i];
                var dx = graphX - pos.x;
                var dy = graphY - pos.y;
                var distance = Math.sqrt(dx * dx + dy * dy);

                if (distance <= nodeRadius) {
                    hoveredNodeIndex = i;
                    canvas.style.cursor = 'pointer';
                    canvas.title = getMoveTooltip(pos.state);
                    break;
                }
            }

            if (hoveredNodeIndex === -1) {
                canvas.style.cursor = 'default';
                canvas.title = '';
            }

            if (oldHovered !== hoveredNodeIndex) {
                drawGraph();
            }
        }
    });

    canvas.addEventListener('mouseup', function() {
        isDragging = false;
        canvas.style.cursor = 'default';
    });

    canvas.addEventListener('mouseleave', function() {
        isDragging = false;
        hoveredNodeIndex = -1;
        canvas.style.cursor = 'default';
        canvas.title = '';
        drawGraph();
    });
}

// Get tooltip text for a node
function getMoveTooltip(state) {
    if (state === 'start') {
        return 'Starting position';
    }

    // Find the edge that leads to this state
    for (var i = 0; i < graphEdges.length; i++) {
        var edge = graphEdges[i];
        if (graphNodes[edge.to] === state) {
            var fromState = graphNodes[edge.from];
            var moveNotation = getMoveNotation(fromState, state);

            var tooltip = moveNotation;
            if (edge.annotation) {
                tooltip += ' - ' + edge.annotation;
            }
            return tooltip;
        }
    }

    return state;
}

// Keyboard navigation support
var currentChildIndex = 0;  // Track which child we're currently viewing

// Get all children of a state
function getChildren(state) {
    var stateIndex = stateToIndex.get(state);
    if (stateIndex === undefined) return [];

    var children = [];
    for (var i = 0; i < graphEdges.length; i++) {
        if (graphEdges[i].from === stateIndex) {
            children.push(graphNodes[graphEdges[i].to]);
        }
    }
    return children;
}

// Get parent of a state
function getParent(state) {
    var stateIndex = stateToIndex.get(state);
    if (stateIndex === undefined) return null;

    for (var i = 0; i < graphEdges.length; i++) {
        if (graphEdges[i].to === stateIndex) {
            return graphNodes[graphEdges[i].from];
        }
    }
    return null;
}

// Navigate to next child (DOWN arrow)
function navigateDown() {
    var children = getChildren(currentBoardState);
    if (children.length === 0) return;

    // Move to first child and reset child index
    currentChildIndex = 0;
    loadState(children[0], true);
}

// Navigate to parent (UP arrow)
function navigateUp() {
    var parent = getParent(currentBoardState);
    if (parent) {
        currentChildIndex = 0;
        loadState(parent, true);
    }
}

// Cycle to next sibling (RIGHT arrow)
function navigateRight() {
    var parent = getParent(currentBoardState);
    if (!parent) return;

    var siblings = getChildren(parent);
    if (siblings.length <= 1) return;

    // Find current position in siblings
    var currentIndex = -1;
    for (var i = 0; i < siblings.length; i++) {
        if (siblings[i] === currentBoardState) {
            currentIndex = i;
            break;
        }
    }

    if (currentIndex === -1) return;

    // Move to next sibling (wrap around)
    var nextIndex = (currentIndex + 1) % siblings.length;
    currentChildIndex = nextIndex;
    loadState(siblings[nextIndex], true);
}

// Cycle to previous sibling (LEFT arrow)
function navigateLeft() {
    var parent = getParent(currentBoardState);
    if (!parent) return;

    var siblings = getChildren(parent);
    if (siblings.length <= 1) return;

    // Find current position in siblings
    var currentIndex = -1;
    for (var i = 0; i < siblings.length; i++) {
        if (siblings[i] === currentBoardState) {
            currentIndex = i;
            break;
        }
    }

    if (currentIndex === -1) return;

    // Move to previous sibling (wrap around)
    var prevIndex = (currentIndex - 1 + siblings.length) % siblings.length;
    currentChildIndex = prevIndex;
    loadState(siblings[prevIndex], true);
}

// Setup keyboard navigation
function setupKeyboardNavigation() {
    document.addEventListener('keydown', function(event) {
        // Check if user is typing in an input field
        var target = event.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            return;
        }

        // Check if this is Edit mode with undo/redo shortcuts
        // In Edit mode, arrow keys are used for undo/redo
        if (typeof updateHistoryButtons === 'function') {
            // This is Edit mode - don't intercept Left/Right arrows
            // Only handle Up/Down for navigation
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                navigateDown();
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                navigateUp();
            }
        } else {
            // This is View/Practice mode - use all arrow keys for navigation
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                navigateDown();
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                navigateUp();
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                navigateRight();
            } else if (event.key === 'ArrowLeft') {
                event.preventDefault();
                navigateLeft();
            }
        }
    });
}

// Call this to enable keyboard navigation
// This should be called after initCanvas()
setupKeyboardNavigation();
