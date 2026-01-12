// Chess Opening Practice Tool - Common Functions
// Shared code across View, Edit, and Practice modes

// Initialize the chess game logic
var game = new Chess();

// Graph data structures
var graphNodes = [];  // Array of unique states
var graphEdges = [];  // Array of {from: stateIndex, to: stateIndex, annotation: string}
var stateToIndex = new Map();  // Map state string to its index in graphNodes
var currentBoardState = 'start[w]';  // Track the current board state
var lastEdgeIndex = -1;  // Track the last edge created for annotation
var precomputedPositions = null;  // Optional pre-computed node positions from JSON
var nodeEvaluations = {};  // Map state string to evaluation string (e.g., "+0.50", "M5")

// History tracking for undo/redo
var moveHistory = ['start[w]'];  // Array of states in chronological order
var historyIndex = 0;  // Current position in history
var isNavigatingHistory = false;  // Flag to prevent adding to history during undo/redo

// Board reference (will be initialized by each page)
var board = null;

// Add a node to the graph if it doesn't exist, return its index
function addNodeToGraph(state) {
    if (!stateToIndex.has(state)) {
        var index = graphNodes.length;
        graphNodes.push(state);
        stateToIndex.set(state, index);
        return index;
    }
    return stateToIndex.get(state);
}

// Add an edge to the graph if it doesn't exist
function addEdgeToGraph(fromState, toState, annotation) {
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

    drawGraph();
}

// Remove orphaned nodes (nodes with no incoming or outgoing edges)
function removeOrphanedNodes() {
    // Build a set of nodes that have edges
    var nodesWithEdges = new Set();
    nodesWithEdges.add(stateToIndex.get('start[w]')); // Always keep start node

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
    var queue = [stateToIndex.get('start[w]')];
    reachableFromStart.add(stateToIndex.get('start[w]'));

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

// Piece encoding maps
var PIECE_MAP_ENCODE = {
    'w': {'p': 'A', 'n': 'B', 'b': 'C', 'r': 'D', 'q': 'E', 'k': 'F'},
    'b': {'p': 'G', 'n': 'H', 'b': 'I', 'r': 'J', 'q': 'K', 'k': 'L'}
};

var PIECE_MAP_DECODE = {
    'A': 'wP', 'B': 'wN', 'C': 'wB', 'D': 'wR', 'E': 'wQ', 'F': 'wK',
    'G': 'bP', 'H': 'bN', 'I': 'bB', 'J': 'bR', 'K': 'bQ', 'L': 'bK'
};

// Convert board to compact state string
function boardToString() {
    var board = game.board();
    var output = '';
    var emptyCount = 0;

    // Read board from rank 8 to rank 1 (top to bottom)
    for (var rank = 7; rank >= 0; rank--) {
        for (var file = 0; file < 8; file++) {
            var square = board[rank][file];

            if (square === null) {
                emptyCount++;
            } else {
                // Flush empty count
                while (emptyCount > 0) {
                    if (emptyCount >= 9) {
                        output += '9';
                        emptyCount -= 9;
                    } else {
                        output += emptyCount.toString();
                        emptyCount = 0;
                    }
                }

                // Add piece
                var color = square.color;
                var type = square.type;
                output += PIECE_MAP_ENCODE[color][type];
            }
        }
    }

    // Flush remaining empty count
    while (emptyCount > 0) {
        if (emptyCount >= 9) {
            output += '9';
            emptyCount -= 9;
        } else {
            output += emptyCount.toString();
            emptyCount = 0;
        }
    }

    // Append turn
    var turn = game.turn() === 'w' ? 'w' : 'b';
    return output + '[' + turn + ']';
}

// Convert state string to position object for chessboard.js
function stateToPosition(state) {
    if (state === 'start[w]') {
        return 'start';
    }

    // Extract the board encoding (everything before the turn indicator)
    var bracketIndex = state.indexOf('[');
    if (bracketIndex === -1) return 'start';

    var encoding = state.substring(0, bracketIndex);

    // Decode the encoding into a 64-square array
    var squares = [];
    for (var i = 0; i < encoding.length; i++) {
        var char = encoding[i];
        if (char >= '1' && char <= '9') {
            // Empty squares
            var count = parseInt(char);
            for (var j = 0; j < count; j++) {
                squares.push(null);
            }
        } else {
            // Piece
            var piece = PIECE_MAP_DECODE[char];
            if (piece) {
                squares.push(piece);
            } else {
                console.error('Unknown piece encoding:', char);
                squares.push(null);
            }
        }
    }

    // Convert to chessboard.js position object
    var position = {};
    var files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    var squareIndex = 0;

    // Read from rank 8 to rank 1
    for (var rank = 8; rank >= 1; rank--) {
        for (var file = 0; file < 8; file++) {
            if (squareIndex < squares.length && squares[squareIndex] !== null) {
                var squareName = files[file] + rank;
                position[squareName] = squares[squareIndex];
            }
            squareIndex++;
        }
    }

    return position;
}

// Convert state string to FEN
function stateToFEN(state) {
    if (state === 'start[w]') {
        return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }

    // Extract encoding and turn
    var bracketIndex = state.indexOf('[');
    if (bracketIndex === -1) return null;

    var encoding = state.substring(0, bracketIndex);
    var turn = state.charAt(bracketIndex + 1);

    // Decode to 64 squares
    var squares = [];
    for (var i = 0; i < encoding.length; i++) {
        var char = encoding[i];
        if (char >= '1' && char <= '9') {
            var count = parseInt(char);
            for (var j = 0; j < count; j++) {
                squares.push(null);
            }
        } else {
            squares.push(PIECE_MAP_DECODE[char] || null);
        }
    }

    // Convert to FEN board string (rank 8 to rank 1)
    var fenParts = [];
    for (var rank = 0; rank < 8; rank++) {
        var rankStr = '';
        var emptyCount = 0;

        for (var file = 0; file < 8; file++) {
            var squareIndex = rank * 8 + file;
            var piece = squares[squareIndex];

            if (piece === null) {
                emptyCount++;
            } else {
                if (emptyCount > 0) {
                    rankStr += emptyCount.toString();
                    emptyCount = 0;
                }

                // Convert piece notation (wP -> P, bP -> p)
                var pieceChar = piece[1]; // P, N, B, R, Q, K
                if (piece[0] === 'b') pieceChar = pieceChar.toLowerCase();
                rankStr += pieceChar;
            }
        }

        if (emptyCount > 0) {
            rankStr += emptyCount.toString();
        }

        fenParts.push(rankStr);
    }

    // Build full FEN string (simplified - no castling, en passant, etc.)
    var fenBoard = fenParts.join('/');
    var fenTurn = turn === 'w' ? 'w' : 'b';
    return fenBoard + ' ' + fenTurn + ' - - 0 1';
}

// Load a state onto the board
function loadState(state, addToHistoryFlag) {
    var position = stateToPosition(state);
    var fen = stateToFEN(state);

    board.position(position);

    if (fen) {
        game.load(fen);
    } else {
        game.reset();
    }

    currentBoardState = state;

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

    drawGraph();
}

// Validate a state string format
function validateState(state) {
    if (state === 'start[w]') {
        return {valid: true};
    }

    // Check format: should end with [w] or [b]
    if (!state.endsWith('[w]') && !state.endsWith('[b]')) {
        return {valid: false, error: 'Missing turn indicator [w] or [b]'};
    }

    // Extract encoding
    var bracketIndex = state.indexOf('[');
    var encoding = state.substring(0, bracketIndex);

    // Validate encoding characters
    var validChars = /^[A-L1-9]+$/;
    if (!validChars.test(encoding)) {
        return {valid: false, error: 'Invalid characters in state encoding'};
    }

    return {valid: true};
}

// Export all graph states to v2.0 format
function exportAllStates() {
    if (graphEdges.length === 0) {
        alert('No routes to export. Add some moves first.');
        return;
    }

    // Build position definitions if we have precomputed positions
    var positionLines = [];
    if (precomputedPositions && Object.keys(precomputedPositions).length > 0) {
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

    // Build transitions from graph edges (using text format)
    var transitions = graphEdges.map(function(edge) {
        var fromState = graphNodes[edge.from];
        var toState = graphNodes[edge.to];
        var transition = fromState + ' -> ' + toState;
        if (edge.annotation && edge.annotation.length > 0) {
            transition += ': ' + edge.annotation;
        }
        return transition;
    });

    // Add version header and combine positions + transitions
    var content = 'v2.0\n';
    if (positionLines.length > 0) {
        content += positionLines.join('\n') + '\n';
    }
    content += transitions.join('\n');

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
        var isWhiteToMove = state.indexOf('[w]') !== -1;

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

    pgn += generatePGNMoveText('start[w]', 1, '');
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
    var fromFen = stateToFEN(fromState);
    var toFen = stateToFEN(toState);

    if (!fromFen || !toFen) return '???';

    // Create temporary game to find the move
    var tempGame = new Chess(fromFen);
    var moves = tempGame.moves({verbose: true});

    for (var i = 0; i < moves.length; i++) {
        tempGame.move(moves[i]);
        var resultFen = tempGame.fen();

        // Compare board position (ignore move counters)
        var resultBoard = resultFen.split(' ').slice(0, 2).join(' ');
        var targetBoard = toFen.split(' ').slice(0, 2).join(' ');

        if (resultBoard === targetBoard) {
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

    if (version !== 'v2.0') {
        console.warn('File version is ' + version + ', expected v2.0');
    }

    // Reset graph
    graphNodes = [];
    graphEdges = [];
    stateToIndex = new Map();
    moveHistory = ['start[w]'];
    historyIndex = 0;
    lastEdgeIndex = -1;
    precomputedPositions = {};
    nodeEvaluations = {};

    // Parse file in two passes: first positions, then transitions
    var invalidCount = 0;
    var positionCount = 0;

    for (var i = 1; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line.length === 0) continue;

        // Check if this is a position definition or transition
        if (line.indexOf('->') !== -1) {
            // This is a transition: "state1 -> state2" or "state1 -> state2: annotation"
            var arrowSplit = line.split('->');
            if (arrowSplit.length === 2) {
                var fromState = arrowSplit[0].trim();
                var rightSide = arrowSplit[1];

                // Parse annotation
                var colonIndex = rightSide.indexOf(':');
                var toState, annotation;
                if (colonIndex !== -1) {
                    toState = rightSide.substring(0, colonIndex).trim();
                    annotation = rightSide.substring(colonIndex + 1).trim();
                } else {
                    toState = rightSide.trim();
                    annotation = '';
                }

                // Validate and add to graph
                var fromValid = validateState(fromState);
                var toValid = validateState(toState);

                if (fromValid.valid && toValid.valid) {
                    addEdgeToGraph(fromState, toState, annotation);
                } else {
                    invalidCount++;
                    if (!fromValid.valid) {
                        console.warn('Line ' + (i + 1) + ': Invalid from state - ' + fromValid.error);
                    }
                    if (!toValid.valid) {
                        console.warn('Line ' + (i + 1) + ': Invalid to state - ' + toValid.error);
                    }
                }
            } else {
                invalidCount++;
                console.warn('Line ' + (i + 1) + ': Malformed transition (missing ->)');
            }
        } else if (line.indexOf(':') !== -1) {
            // This might be a position definition: "state : x, y" or "state : x, y, eval"
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

    // Reset board to starting position
    game.reset();
    board.position('start');
    currentBoardState = 'start[w]';

    // Update loaded file label if present
    var label = document.getElementById('loadedFileLabel');
    if (label) {
        var message = 'Loaded: ' + filename + ' (' + version + ')';
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
    addNodeToGraph('start[w]');

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

    // Compute layout
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

    // Use pre-computed positions if available
    if (precomputedPositions) {
        nodePositions = [];
        for (var k = 0; k < graphNodes.length; k++) {
            var state = graphNodes[k];
            if (precomputedPositions[state]) {
                nodePositions.push({
                    x: precomputedPositions[state].x,
                    y: precomputedPositions[state].y,
                    state: state
                });
            } else {
                // Fallback to Dagre for missing nodes
                dagre.layout(g);
                var node = g.node(k);
                if (node) {
                    nodePositions.push({x: node.x, y: node.y, state: state});
                }
            }
        }
    } else {
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
        } else if (state === 'start[w]') {
            ctx.fillStyle = NODE_COLORS.START;
        } else if (nodeEvaluations[state]) {
            // Node has Stockfish evaluation - color it red
            ctx.fillStyle = NODE_COLORS.EVALUATED;
        } else {
            var isWhiteTurn = state.indexOf('[w]') !== -1;
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
        if (state === 'start[w]') {
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
    if (state === 'start[w]') {
        return 'Starting position';
    }

    // Check if this node has an evaluation
    var evaluation = nodeEvaluations[state];

    // If node has evaluation, show ONLY the evaluation
    if (evaluation) {
        return evaluation;
    }

    // Find the edge that leads to this state (for non-evaluated nodes)
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
