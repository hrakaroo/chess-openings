# Chess Opening Practice Tool - Development Context

This document provides complete context for resuming development of the Chess Opening Practice Tool.

## Project Overview

A static web application for building, exploring, and practicing chess opening repertoires. The tool visualizes opening trees as graphs and tracks transitions between board states.

**Key Features**:
- Build custom opening repertoires with move annotations
- Explore existing repertoires in read-only mode
- Practice openings with score tracking and randomized path ordering
- Visual graph representation with transposition detection
- Export to v4.0 format and PGN

## Current Architecture

### File Structure

```
/practice/
  ├── index.html          - Welcome page with mode selection
  ├── explore.html        - Explore Mode: Browse openings (read-only)
  ├── build.html          - Build Mode: Create and edit repertoires
  ├── practice.html       - Practice Mode: Interactive practice with scoring
  ├── bin/                - Python utility scripts
  │   ├── evaluate.py     - Graph layout optimization + Stockfish evaluation
  │   └── merge.py        - Merge multiple opening files
  ├── js/                 - JavaScript modules
  │   ├── chess-common.js - Shared chess logic (graph, export, import)
  │   ├── fen-utils.js    - FEN normalization and validation
  │   └── ui-feedback.js  - UI modals and toast notifications
  ├── openings/           - Sample opening files
  └── docs/               - Additional documentation
```

### Three Modes

**1. Explore Mode** (`explore.html`)
- Read-only board (no drag-and-drop)
- Load opening files and navigate via graph clicks
- Keyboard navigation (arrow keys)
- View move annotations
- Export to PGN

**2. Build Mode** (`build.html`)
- Full editing with drag-and-drop
- Create moves and variations
- Add annotations (type before move, auto-applied)
- Undo/Redo with history
- Export to v4.0 format with title

**3. Practice Mode** (`practice.html`)
- Interactive practice with move validation
- Path-based practice (cycles through all unique paths once)
- Score tracking (correct paths / total paths)
- Remaining counter (counts down to zero)
- Auto-start on file load, Reset button to restart
- Randomized path order each session

## Technical Architecture

### Libraries Used
- **chessboard.js** (1.0.0) - Visual chessboard with drag-and-drop
- **chess.js** (0.10.3) - Game logic and move validation
- **jQuery** (3.6.0) - Required by chessboard.js
- **Dagre** (0.8.5) - Graph layout algorithm
- **Canvas API** - Graph rendering

### Data Structures

**1. Graph Nodes** (`graphNodes` array)
- Each node is a **normalized FEN** string
- En passant info **stripped** for transposition detection
- Special keyword: `'start'` for initial position
- Indexed by position in array

**2. Graph Edges** (`graphEdges` array)
- Each edge is an object:
  ```javascript
  {
    from: <node_index>,        // Integer index into graphNodes
    to: <node_index>,          // Integer index into graphNodes
    move: <SAN_string>,        // e.g., "e4", "Nf3", "exd6"
    fullFEN: <full_FEN>,       // Full FEN with en passant (for validation)
    annotation: <text>         // User comment (optional)
  }
  ```

**3. State Mapping**
- `stateToIndex` - Map from normalized FEN to node index
- `edgeMap` - Map from "fromIndex-toIndex" to edge index (O(1) lookup)
- Both maps rebuilt when nodes/edges are modified (undo, orphan removal)

### Critical Design Decision: En Passant Handling

**Problem**: En passant moves require en passant info in FEN, but we strip it for transposition detection.

**Solution**: Dual FEN storage
- **Nodes** use **normalized FEN** (en passant stripped) for graph topology
- **Edges** store **full FEN** (en passant included) for move validation
- When exporting: write full FEN to file
- When loading: apply move to full FEN, then normalize for node matching

**Example**:
```
After Black plays f7-f5:
  Node FEN:  r1b.../.../ - 0 1    (normalized, no en passant)
  Edge FEN:  r1b.../.../ f6 0 1   (full, with en passant square)

Export line:
  r1b.../.../ f6 0 1 -> exf6+

On load:
  - Apply exf6+ to full FEN (works because f6 is there)
  - Normalize result for node storage
```

### Move Storage

**Capturing moves** (`build.html` onDrop):
1. Get full FEN before move (with en passant)
2. Make move via chess.js
3. Extract `move.san` (Standard Algebraic Notation)
4. Get normalized FEN after move
5. Store edge with: fromState (normalized), toState (normalized), move (SAN), fullFEN (unnormalized)

**Exporting moves**:
- Use `edge.move` if available (new files)
- Fall back to reconstruction for old files without stored moves
- Write `fullFEN -> move` to file

**Loading moves**:
- Parse line: `FEN -> move`
- Apply move to FEN using chess.js
- Normalize result for node matching
- Store full FEN in edge for future exports

### File Format (v4.0)

```
v4.0
= Opening Title
# Optional annotation
FEN_string -> move_in_SAN
# Another annotation
FEN_string -> move_in_SAN
...
```

**Optional position definitions** (from evaluate.py):
```
FEN : x, y
FEN : x, y, evaluation
```

**Key points**:
- FEN can be full FEN (with en passant) or normalized
- Moves are in Standard Algebraic Notation (e.g., "Nf3", "O-O", "exd6")
- Comments start with `#` and apply to next transition
- Multiple `#` lines are joined with spaces
- Position definitions are optional (tool uses Dagre if absent)

### Graph Rendering

**Node Colors**:
- Blue (`#4A90E2`) - Start position
- Dark grey (`#616161`) - White to move
- Light grey (`#E0E0E0`) - Black to move
- Green (`#4CAF50`) - Current position
- Red (`#E53935`) - Terminal with Stockfish evaluation

**Layout**:
- Uses Dagre algorithm if no pre-computed positions
- Uses pre-computed positions from evaluate.py if available
- Zoom: 0.1x to 5x (mouse wheel)
- Pan: click and drag

**Transposition Detection**:
- Automatically merges nodes with same normalized FEN
- Multiple edges can point to same node
- Visible in graph as multiple incoming edges

### Undo/Redo System (Build Mode)

**History tracking**:
- `moveHistory` array stores normalized FEN states
- `historyIndex` tracks current position
- Clicking nodes adds to history

**Undo**:
1. Decrement `historyIndex`
2. Call `removeFutureFromGraph(currentStateIndex)` to remove forward edges
3. Rebuild `edgeMap` after edge removal
4. Remove orphaned nodes
5. Rebuild `edgeMap` again after node index changes

**Redo**:
1. Increment `historyIndex`
2. Re-add edge from history[i-1] to history[i]
3. Load state

**Critical bug fix**: `edgeMap` must be rebuilt after any edge or node modifications to prevent stale cache lookups.

### Practice Mode Implementation

**Path generation**:
1. Find all terminal states (leaf nodes with no outgoing edges)
2. For each terminal, use DFS to find all paths from start to terminal
3. Store array of paths (each path is array of states)
4. Shuffle paths for random order

**Practice loop**:
1. User makes move
2. Validate move matches next state in current path
3. If correct, computer plays next move from path
4. If incorrect, snapback (no score penalty, but must retry)
5. On path completion:
   - Increment score if no mistakes
   - Decrement remaining
   - Move to next path
6. When all paths done, auto-stop

**Score tracking**:
- `pathsCompleted` / `allPathsOriginal.length`
- `pathsRemaining` counts down to 0
- Mistakes prevent scoring but don't end practice

## Python Utilities

### evaluate.py

**Purpose**: Generate optimal graph layouts and Stockfish evaluations

**Usage**:
```bash
python bin/evaluate.py opening.txt
```

**Features**:
- Uses pygraphviz for graph layout (dot, neato, fdp, sfdp algorithms)
- Generates x,y coordinates for each position
- Optional Stockfish evaluation for terminal positions
- Embeds coordinates and evaluations in v4.0 file
- Can output to separate file with `--output`

**Output format**:
```
v4.0
= Title
FEN : x, y
FEN : x, y, white +0.25
FEN -> move
...
```

### merge.py

**Purpose**: Combine multiple opening files into one

**Usage**:
```bash
python bin/merge.py file1.txt file2.txt --output merged.txt
```

**Features**:
- Merges transitions (deduplicates by from_state + move)
- Combines annotations with ` | ` separator
- Merges titles with ` + ` separator
- Removes position coordinates and evaluations (clean output)
- Outputs standard v4.0 format

**Use cases**:
- Combining variations of same opening
- Building complete repertoire from multiple systems
- Consolidating files with different annotations

## Recent Changes (Latest Session)

### 1. En Passant Fix (CRITICAL)
**Problem**: En passant moves exported as "???" and failed to load
**Root cause**: Normalized FEN strips en passant info needed for move validation
**Solution**: Store full FEN in edges, normalized FEN in nodes
**Files changed**: `js/chess-common.js`, `build.html`, `js/fen-utils.js`

### 2. Direct Move Storage
**Problem**: Move reconstruction could fail or be incorrect
**Solution**: Capture and store `move.san` from chess.js directly
**Files changed**: `js/chess-common.js`, `build.html`

### 3. Practice Mode Improvements
- Changed from infinite loop to path-based practice
- Pre-compute all paths on file load
- Show total paths in success message
- Score = completed_without_mistakes / total_paths
- Added "Remaining" counter
- Changed Start/Stop to Reset button (always red)
- Auto-start on file load
- No mistakes tracked per path

### 4. UI Polish
- Updated graph node colors (darker dark grey, lighter light grey)
- Changed piece theme to Staunty (from Lichess)
- Removed placeholder text from annotation display (Explore/Practice)
- Made Start button text white on green/red background

### 5. Undo/Redo Fix
**Problem**: Undo created isolated nodes in graph
**Root cause**: `edgeMap` cache not rebuilt after edge/node modifications
**Solution**: Rebuild `edgeMap` in both `removeFutureFromGraph()` and `removeOrphanedNodes()`
**Files changed**: `js/chess-common.js`

### 6. Code Organization
- Moved `evaluate.py` and `merge.py` to `bin/` directory
- Updated all README references to use `bin/` prefix
- Cleaned up old `__pycache__` directory

## Known Limitations

1. **En passant caveat**: Board states don't preserve en passant info in nodes (only in edges), which could theoretically cause incorrect transposition merging in extremely rare cases. See README Caveat section.

2. **Promotion**: Always promotes to Queen (no UI for choosing piece)

3. **Draw detection**: Not implemented (no 50-move rule, threefold repetition)

4. **Stockfish**: Requires separate installation for evaluate.py evaluation feature

## Development Guidelines

### When Adding Features

1. **Maintain separation of concerns**: Build mode = editing, Explore mode = viewing, Practice mode = testing
2. **Preserve backward compatibility**: New code should load old v4.0 files
3. **Update edgeMap**: Always rebuild `edgeMap` after modifying `graphEdges` or node indices
4. **Test en passant**: Any changes to FEN handling must preserve en passant moves
5. **Update all three modes**: Changes to `chess-common.js` affect all modes

### Testing Checklist

- [ ] Load old v4.0 files (pre-move-storage)
- [ ] Load new v4.0 files (with move storage)
- [ ] En passant moves work (create, export, reload)
- [ ] Undo/Redo doesn't create orphaned nodes
- [ ] Transpositions merge correctly
- [ ] Practice mode completes all paths
- [ ] PGN export works
- [ ] Merge.py handles duplicate transitions

### Common Pitfalls

1. **Don't use `currentBoardState` for full FEN** - it's normalized!
   - Use `game.fen()` to get full FEN with en passant

2. **Don't forget skipDraw parameter** - prevents redundant redraws
   - Use `true` when loading files (batch operations)

3. **Don't modify edges without rebuilding edgeMap** - causes stale cache
   - Always call rebuild after filter/splice on `graphEdges`

4. **Don't assume move reconstruction works** - it fails for en passant
   - Always store `move.san` when capturing moves

## Future Considerations

- [ ] Click-to-move for mobile support (currently drag-only)
- [ ] Multiple promotion piece selection
- [ ] Import from PGN
- [ ] Opening book integration
- [ ] Spaced repetition for practice mode
- [ ] Multi-color highlighting for different lines
- [ ] Export to Anki flashcards
- [ ] Cloud sync for openings

## Quick Reference

### Load a file
```javascript
loadRoutesFromFile(fileContent, filename)
```

### Add a move (Build mode)
```javascript
// In onDrop:
var fullFEN = game.fen();              // Full FEN before move
var move = game.move({from, to});      // Make move
var moveSAN = move.san;                // Capture SAN
var stateAfter = boardToFEN();         // Normalized after
addEdgeToGraph(stateBefore, stateAfter, annotation, false, moveSAN, fullFEN);
```

### Export
```javascript
exportAllStates()  // Prompts for title and filename
exportToPGN()      // Exports to PGN format
```

### Practice mode paths
```javascript
findAllPaths()              // Returns array of paths
shuffleArray(paths)         // Randomizes order
```

## File Format Details

See `docs/FORMAT.md` for complete v4.0 specification.

**Minimal valid file**:
```
v4.0
= My Opening
start -> e4
```

**With annotations and positions**:
```
v4.0
= London System
start : 100, 0
rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1 : 100, 100, white +0.3
# Standard London opening
start -> d4
# Symmetrical response
rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1 -> d5
```

## Contact & Repository

- GitHub: https://github.com/hrakaroo/chess-openings
- Live Demo: https://hrakaroo.github.io/chess-openings/

---

**Last Updated**: January 2026 (v4.0 format, three-mode system, en passant fix)
