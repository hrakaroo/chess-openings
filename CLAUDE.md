# Chess Opening Practice Tool - Development Context

This document provides complete context for resuming development of the Chess Opening Practice Tool.

## Project Overview

A static web application (single HTML file) for practicing and managing chess opening repertoires. Users can explore opening lines by moving pieces, and the tool visualizes the opening tree as a graph while saving transitions between board states.

**Key Goal**: Build a tool to practice chess openings for both white and black, with visual tree representation of explored lines.

## Current State

**File**: `chess-openings.html` - A complete, working static web application (~1380 lines)

### What Works

1. **Chessboard Interface**
   - Drag-and-drop piece movement using chessboard.js
   - Legal move validation via chess.js
   - Visual board with piece images loaded from CDN
   - Turn indicator showing "White" or "Black"

2. **State Tracking**
   - Board positions encoded as compact strings
   - Turn information included in state encoding
   - Automatic capture of state transitions on each move
   - Input validation for state strings with comprehensive error checking

3. **Tree Graph Visualization**
   - Canvas-based rendering of opening tree
   - Nodes represent board positions
   - Curved edges (quadratic Bezier curves) show moves
   - Color-coded nodes:
     - Light grey: white to move
     - Dark grey: black to move
     - Green: current board position
     - Orange border: transposition nodes (multiple incoming edges)
   - Click nodes to jump to that position
   - BFS-based layout algorithm arranging nodes by depth
   - Zoom support (0.1x to 5x) via mouse wheel
   - Pan support via click-and-drag
   - Coordinate transformation for accurate interaction

4. **Import/Export**
   - Export prompts for filename with customizable name
   - Load transitions from `.txt` file via file dialog
   - Input validation during file load with error reporting
   - Displays loaded filename and version below Load Routes button
   - File format (v1.0): version header `v1.0` on first line, then one transition per line (`state1 -> state2`)
   - Backward compatible: files without version header treated as v1.0

5. **Navigation**
   - "Reset Board" button returns to starting position
   - "Undo" button navigates backward through move history
   - "Redo" button navigates forward through move history
   - Undo/Redo buttons automatically disabled at history boundaries
   - Clicking graph nodes loads that board state and adds to history
   - Making moves from any position extends that branch

6. **Transposition Detection**
   - Automatically merges duplicate positions reached via different move orders
   - Visual highlighting with orange border for transposed positions
   - Badge showing count of incoming edges (number of paths to position)

7. **Keyboard Shortcuts**
   - Ctrl+Z / Cmd+Z for undo
   - Ctrl+Y / Ctrl+Shift+Z / Cmd+Shift+Z for redo
   - Arrow keys (Left/Right) for undo/redo
   - Disabled when typing in input fields

8. **Move Notation Display**
   - Hover over any node to see the move that was played (e.g., "e4", "Nf3")
   - Uses Standard Algebraic Notation (SAN)
   - Tooltip displayed above hovered node
   - For transpositions, shows move from first parent

9. **PGN Export**
   - Exports opening tree to standard PGN format
   - Includes proper headers (Event, Site, Date, etc.)
   - Main line follows first branch at each position
   - Alternative moves shown as variations in parentheses
   - Compatible with chess software (Lichess, Chess.com, ChessBase)

10. **Move Annotations**
   - Text input field for adding notes/comments to moves
   - Annotations saved with edge transitions
   - Displayed in tooltips when hovering over nodes
   - Returns and quotes automatically stripped
   - Stored in file format as `: annotation text` after transition
   - Loaded and displayed when importing files

## Technical Architecture

### Libraries Used
- **chessboard.js** (1.0.0) - visual chessboard with drag-and-drop
- **chess.js** (0.10.3) - game logic and move validation
- **jQuery** (3.6.0) - required by chessboard.js
- **Canvas API** - for graph rendering

### Data Structures

```javascript
// Graph storage (single source of truth)
graphNodes = []              // Array of state strings
graphEdges = []              // Array of {from: nodeIndex, to: nodeIndex, annotation: string}
stateToIndex = Map()         // Maps state string to index in graphNodes

// Current state
currentBoardState = 'start[w]'  // Tracks which node is green
lastEdgeIndex = -1           // Index of last edge created (for annotation)

// History tracking for undo/redo
moveHistory = ['start[w]']   // Array of states in chronological order
historyIndex = 0             // Current position in history
isNavigatingHistory = false  // Flag to prevent adding to history during undo/redo

// Canvas
nodePositions = []           // Calculated positions for each node
nodeRadius = 15              // Size of node circles
hoveredNodeIndex = -1        // Track which node is being hovered

// Transform state for zoom/pan
transform = {
    zoom: 1.0,               // Current zoom level (0.1 to 5.0)
    offsetX: 0,              // Pan offset X
    offsetY: 0               // Pan offset Y
}
```

### Board State Encoding

**Format**: Compact string with piece codes, run-length encoding for empty squares, and turn suffix

**Piece Codes** (letters A-L):
- White: A=Pawn, B=Knight, C=Bishop, D=Rook, E=Queen, F=King
- Black: G=Pawn, H=Knight, I=Bishop, J=Rook, K=Queen, L=King

**Empty Squares** (digits 1-9):
- Run-length encoded per rank (resets at end of each rank)
- Example: `8` = 8 consecutive empty squares

**Turn Encoding**:
- `[w]` = white to move
- `[b]` = black to move

**Special Case**:
- `start[w]` = starting position shortcut

**Reading Order**: Rank 8 → Rank 1, left to right (a-h files)

**Example**:
```
start[w] -> JIHKLIHJGGGGGGGG884A38AAAA1AAADBCEFCBD[b]
(Starting position → after white plays e4)
```

### File Format (v1.0)

Exported files include a version header for future compatibility:

**Format**:
```
v1.0
state1 -> state2
state2 -> state3
...
```

**Version Detection**:
- First line is checked for version pattern `v\d+\.\d+` (e.g., v1.0, v2.0)
- If no version header found, file is treated as v1.0 (backward compatibility)
- Unsupported versions show an alert and abort loading

**Version 1.0 Parsing**:
1. Skip version line (if present)
2. Parse each line as `state_before -> state_after`
3. Add each transition to graph via `addEdgeToGraph()`

### Key Functions

**State Management**:
- `boardToString()` - Converts current game state to encoded string
- `stateToBoard(state)` - Decodes state string to position object and turn
- `validateState(state)` - Validates state string format, checks for 64 squares, returns error details
- `buildFen(position, turn)` - Constructs FEN string from position
- `loadState(state, addToHistoryFlag)` - Sets board and game to given state, optionally adds to history

**Graph Operations**:
- `addNodeToGraph(state)` - Adds state to graph if not exists, returns index (enables transposition detection)
- `addEdgeToGraph(fromState, toState)` - Adds both nodes and edge (prevents duplicates)
- `calculateNodePositions()` - BFS-based layout algorithm
- `countIncomingEdges()` - Counts incoming edges for each node (for transposition detection)
- `drawGraph()` - Renders graph with curved edges, colored nodes, and transposition highlighting
- `screenToGraph(screenX, screenY)` - Converts screen coordinates to graph coordinates (accounts for zoom/pan)

**History Management**:
- `addToHistory(state)` - Adds state to move history, truncates moveHistory array
- `removeFutureFromGraph()` - Removes edges from truncated history path
- `removeOrphanedNodes()` - Removes nodes with no incoming edges, reindexes graph
- `updateHistoryButtons()` - Updates undo/redo button enabled/disabled state
- `undo()` - Navigate backward in history, immediately removes future edges/nodes from graph
- `redo()` - Navigate forward in history, re-adds the edge and nodes to graph

**File I/O**:
- `exportAllStates()` - Prompts for filename, adds v1.0 header, builds transitions from graph edges, downloads file
- `exportToPGN()` - Exports opening tree to PGN format with variations
- `generatePGNMoveText()` - Recursively traverses tree and builds PGN notation
- `loadRoutesFromFile(content, filename)` - Validates and parses file, rebuilds graph, shows warnings for invalid transitions

**Move Notation**:
- `getMoveNotation(fromState, toState)` - Uses chess.js to determine SAN for move between two states
- `boardToStringFromGame(gameObj)` - Converts chess.js game object to state string
- `getParentEdges(nodeIndex)` - Finds all edges leading to a given node

**Move Handling**:
- `onDragStart()` - Validates piece can be moved
- `onDrop()` - Makes move, updates graph, adds to history, redraws
- `onSnapEnd()` - Updates turn label after piece animation

**UI Controls**:
- `createNewRoute()` - Resets board and history
- `fitView()` - Calculates bounding box of all nodes and scales/centers to fit in canvas
- Mouse wheel handler - Implements zoom (with zoom toward mouse position)
- Mouse drag handlers - Implements pan functionality

### Layout Algorithm

Uses BFS to calculate node depths from root (`start[w]`):
1. Start from root node, assign depth 0
2. Process nodes level by level
3. Count nodes at each depth
4. Position nodes horizontally centered at their depth level
5. Vertical spacing: 80px between levels
6. Horizontal spacing: 60px between sibling nodes

### UI Layout

Two-column table layout:
- **Left column**:
  - Top row: "Reset Board" button + Turn indicator (left) | "Undo" + "Redo" buttons (right)
  - Chessboard (600px)
- **Right column**:
  - Top row: "Export Routes" + "Load Routes" (left) | "Export PGN" + "Fit View" (right)
  - Loaded file label (shows filename after loading)
  - Graph canvas

## Important Implementation Details

### State Encoding Bug Fixes

1. **Empty square counting**: Initially counted across rank boundaries, causing numbers >9. Fixed by resetting counter at end of each rank.

2. **Position mirroring**: Decoding was inverting board (white on top). Fixed rank calculation from `8 - floor(index/8)` to `1 + floor(index/8)`.

### Graph vs Export Data

Originally maintained separate data structures (`savedTransitions` array). Now uses single source of truth - graph edges are converted to transition strings on export.

### Turn Tracking

Turn information is critical - same board with different player to move is a different state. Always include `[w]` or `[b]` suffix.

### Canvas Click Detection

Detects clicks on nodes by:
1. Converting mouse coordinates to canvas space
2. Applying zoom/pan transformation via `screenToGraph()`
3. Calculating distance to each node center in graph coordinates
4. If distance ≤ nodeRadius, load that state

### Zoom and Pan Implementation

Uses canvas transformation matrix:
1. **Zoom**: Multiplies zoom level by 1.1 (zoom in) or 0.9 (zoom out) on mouse wheel
2. **Zoom toward cursor**: Adjusts offset so zoom is centered on mouse position
3. **Pan**: Tracks mouse drag and updates offsetX/offsetY
4. **Transform applied**: `ctx.setTransform(zoom, 0, 0, zoom, offsetX, offsetY)` before drawing
5. **Fit View**: Calculates bounding box of all nodes, determines zoom to fit, centers graph in canvas

### Fit View Implementation

Automatically scales and centers the graph:
1. Calculate bounding box: Find min/max X and Y coordinates of all nodes
2. Add padding (50px) around the bounding box
3. Calculate required zoom: `min(canvas.width / graphWidth, canvas.height / graphHeight)`
4. Clamp zoom to 0.1x - 5x range
5. Calculate graph center point
6. Calculate offsets to center the graph in the canvas
7. Apply transform and redraw

### Transposition Detection

Automatically merges positions reached via different move orders:
1. `addNodeToGraph()` uses `stateToIndex` Map to check if state already exists
2. If state exists, returns existing node index instead of creating new node
3. Multiple edges can point to same node
4. `countIncomingEdges()` identifies transpositions (nodes with 2+ incoming edges)
5. Transpositions highlighted with orange border and badge showing edge count

### Undo/Redo Implementation

Move history tracks state progression:
1. `moveHistory` array stores states chronologically
2. `historyIndex` tracks current position
3. **Undo** immediately calls `removeFutureFromGraph()` to remove future edges and orphaned nodes
4. **Redo** calls `addEdgeToGraph()` to restore the edge (and nodes if needed)
5. **New move after undo** truncates moveHistory, graph already cleaned by undo
6. `removeFutureFromGraph()` removes edges from historyIndex onwards in the history path
7. `removeOrphanedNodes()` cleans up nodes with no incoming edges (except start)
8. Transpositions are preserved - nodes reachable via other paths are kept
9. `isNavigatingHistory` flag prevents history pollution during undo/redo
10. Buttons disabled at boundaries (undo at start, redo at end)

### Input Validation

`validateState()` checks:
1. Type and non-empty string
2. Ends with `[w]` or `[b]` (or special case `start[w]`)
3. Contains only valid characters (A-L, 1-9)
4. Represents exactly 64 squares
Returns `{valid: boolean, error: string}` for detailed error reporting

## File Structure

```
/Users/joshua.gerth/code/practice/
├── chess-openings.html    # Main application (single file)
├── README.md              # User documentation
└── CLAUDE.md             # This file (development context)
```

## Design Decisions

1. **Static HTML file** - No server required, easy to use
2. **CDN libraries** - No local dependencies to manage
3. **Single data structure** - Graph is source of truth for export
4. **Compact encoding** - Minimizes file size for saved repertoires
5. **Canvas rendering** - Full control over graph visualization
6. **Quadratic Bezier curves** - Smooth, visually appealing edges

## Known Limitations

1. **Fixed layout algorithm** - May not be optimal for very large or wide opening trees
2. **Minimal node labels** - Only the root node ("start") shows a label; other nodes are unlabeled for cleaner visualization
3. **Promotion hardcoded to queen** - Always promotes to queen
4. **No castling/en passant in state** - FEN uses dummy values for these (castling rights and en passant square not tracked in state encoding)

## Potential Future Enhancements

### Not Yet Implemented
- Practice mode (quiz yourself on openings)
- Annotations/notes on positions
- Move names (e.g., "Sicilian Defense")
- Statistics (success rate, frequency)
- Better graph layout for large trees (e.g., Reingold-Tilford algorithm)
- Search/filter positions
- Integration with chess engines for evaluation
- Support for playing against opponent/engine
- Better visual node labels (showing move notation)
- Keyboard shortcuts for undo/redo
- Mobile-responsive design

### Technical Improvements Possible
- Switch to D3.js or similar for graph (more features)
- Advanced tree layout algorithms to reduce edge crossings
- Add move history/breadcrumb trail display
- Export to PGN format
- Import from PGN format
- Track castling rights and en passant in state encoding

## Common Operations for Development

### Adding a new feature to the graph
1. Modify `drawGraph()` for visual changes
2. Update `calculateNodePositions()` for layout changes
3. May need to update export/import for new data

### Changing state encoding
1. Update `boardToString()` for encoding
2. Update `stateToBoard()` for decoding
3. Update `buildFen()` if FEN generation affected
4. Update README.md with new format
5. Consider backward compatibility with old files

### Adding UI elements
1. Add HTML in table layout (around line 60-75)
2. Create event handler functions
3. Wire up handlers in "Attach button handlers" section (around line 407)

## Development History Summary

### Phase 1: Basic Chess Board
- Started with static web app using chessboard.js
- Added piece images via CDN
- Implemented move validation with chess.js

### Phase 2: State Tracking
- Designed compact state encoding
- Added automatic transition capture
- Initially saved to file on each move (removed)

### Phase 3: Graph Visualization
- Implemented canvas-based tree graph
- Added node/edge data structures
- Created BFS layout algorithm
- Added curved edges (Bezier curves)

### Phase 4: Node Colors & Navigation
- Color-coded nodes by turn
- Highlighted current position in green
- Made nodes clickable to jump to positions

### Phase 5: Import/Export
- Built export from graph edges
- Removed redundant transition storage
- Added file import functionality
- Load routes dialog and parsing

### Phase 6: Documentation
- Updated README.md with all features
- Created CLAUDE.md (this file)

### Phase 7: UI Refinements
- Added filename prompt for exports
- Added loaded file label display
- Removed node labels except for "start" node for cleaner visualization

### Phase 8: File Format Versioning
- Added v1.0 version header to exported files
- Implemented version detection on file load
- Backward compatible with files without version header
- Version displayed in loaded file label

### Phase 9: High-Priority Improvements (2026-01-11)
- **Zoom and Pan**: Added mouse wheel zoom (0.1x-5x range) and click-drag pan for graph canvas
  - Implemented coordinate transformation for accurate node clicking
  - Zoom centers on mouse position for intuitive interaction
- **Input Validation**: Created comprehensive `validateState()` function
  - Validates state format, character set, and square count
  - File loading validates all transitions and reports errors
  - Shows warning dialog if invalid transitions are skipped
- **Undo/Redo**: Full history navigation support
  - Move history tracks all state changes chronologically
  - Undo/Redo buttons with automatic enable/disable at boundaries
  - Undo immediately removes future edges/nodes from graph
  - Redo restores edges/nodes to graph
  - History cleared when loading files or resetting board
  - Clicking nodes adds to history
- **Transposition Detection**: Visual highlighting of duplicate positions
  - Orange border for nodes with multiple incoming edges
  - Badge showing count of different paths to position
  - Automatic merging via existing `stateToIndex` Map

### Phase 10: Quick Win Features (2026-01-11)
- **Keyboard Shortcuts**: Added comprehensive keyboard navigation
  - Ctrl+Z / Cmd+Z for undo
  - Ctrl+Y / Ctrl+Shift+Z / Cmd+Shift+Z for redo
  - Arrow keys (Left/Right) for undo/redo
  - Disabled when typing in input fields to avoid conflicts
- **Move Notation on Hover**: Show move that was played
  - Displays Standard Algebraic Notation (SAN) in tooltip
  - `getMoveNotation()` uses chess.js to determine move between states
  - Tooltip appears above hovered node with dark background
  - For transpositions, shows move from first parent
  - Cursor changes to pointer when hovering over nodes
- **PGN Export**: Export to standard Portable Game Notation format
  - Added "Export PGN" button next to existing export
  - `exportToPGN()` generates PGN with proper headers
  - `generatePGNMoveText()` recursively traverses tree
  - Main line follows first branch, alternatives shown as variations
  - Compatible with chess software (Lichess, Chess.com, ChessBase)
- **UI Layout Improvements**: Better button organization
  - Reorganized buttons into logical groups with flexbox layout
  - Left/right split within each column for better spacing
- **Fit View**: Intelligent graph scaling
  - "Fit View" button calculates bounding box of all nodes
  - Automatically zooms and centers to show entire graph
  - Maintains 50px padding around edges
  - Useful for large opening trees with many variations

## Testing Checklist

When making changes, verify:
- [ ] Moves still work and update graph
- [ ] Undo/Redo buttons work and are properly disabled at boundaries
- [ ] Keyboard shortcuts work (Ctrl+Z, Ctrl+Y, Arrow keys)
- [ ] Hovering over nodes shows move notation tooltip
- [ ] Zoom (mouse wheel) and pan (drag) work on graph
- [ ] Fit View button scales and centers graph to show all nodes
- [ ] Clicking nodes still works after zooming/panning
- [ ] Cursor changes to pointer when hovering over nodes
- [ ] Transpositions shown with orange border and badge
- [ ] Export Routes prompts for filename and creates valid file format with v1.0 header
- [ ] Export PGN creates valid PGN file with variations
- [ ] Load correctly rebuilds graph and shows filename label with version
- [ ] Load validates transitions and shows warning for invalid entries
- [ ] Load works with both versioned and non-versioned files (backward compatibility)
- [ ] Clicking nodes changes board position and adds to history
- [ ] Current position stays green
- [ ] Turn indicator updates correctly
- [ ] Reset Board works and clears history
- [ ] Undo removes future edges/nodes from graph
- [ ] Redo restores edges/nodes to graph
- [ ] Graph renders without errors (only "start" node has label)
- [ ] No console errors in browser

## Quick Start for Development

1. Open `chess-openings.html` in browser
2. Open browser dev tools (F12)
3. Make changes to HTML file
4. Refresh browser to test
5. Check console for any JavaScript errors

## Contact/Notes

This is a personal project by Joshua Gerth. The tool is designed to be self-contained and easy to share - just send the HTML file to anyone who wants to use it.
