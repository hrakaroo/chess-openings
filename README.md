# Chess Opening Practice Tool

A static web application for practicing chess openings. The tool captures board state transitions as you explore different opening lines.

## Features

- **Interactive chessboard** with drag-and-drop piece movement and legal move validation
- **Automatic state tracking** - each move is captured as a transition between board states
- **Move annotations** - add notes and comments to specific moves:
  - Text input field under the buttons for adding annotations
  - Annotations are saved with transitions and displayed in tooltips
  - Hover over nodes to see both the move notation and your annotation
- **Tree graph visualization** showing all explored positions as an opening tree with:
  - Optimal graph layout using Dagre algorithm (automatically minimizes edge crossings)
  - Curved edges connecting parent and child positions
  - Color-coded nodes: blue (starting position), light grey (black to move), dark grey (white to move), green (current position)
  - Transposition detection (positions reachable via multiple move orders show multiple edges converging)
  - Click any node to jump to that board position
  - Hover over nodes to see the move that was played (e.g., "e4", "Nf3") and annotation
  - Zoom and pan support for large opening trees
  - **Keyboard navigation** - use arrow keys to navigate through the opening tree (Down=next move, Up=previous, Right/Left=alternate variations)
- **Undo/Redo** - navigate backward and forward through your move history with keyboard shortcuts
- **Export/Import** - save and load your opening repertoire:
  - Export to custom format v2.0 (.txt) with text encoding and run-length compression
  - Export to standard PGN format for use in other chess software
  - Import from saved v2.0 files with annotation support
- **Keyboard shortcuts** - Ctrl+Z/Cmd+Z for undo, Ctrl+Y/Cmd+Shift+Z for redo, arrow keys for navigation (Edit Mode only)
- **Turn indicator** - shows whose move it is at all times

## How to Use

The application now has three separate pages, each optimized for a specific workflow:

### 📁 File Structure

```
/practice/
  ├── index.html          - Redirects to view.html (default)
  ├── view.html           - View Mode: Browse and explore routes
  ├── edit.html           - Edit Mode: Build and modify repertoires
  ├── practice.html       - Practice Mode: Coming soon
  └── chess-common.js     - Shared functions across all pages
```

### Modes

#### View Mode (`view.html`) - Default
- **Purpose**: Load and view opening routes without making changes
- **Features**:
  - Load route files (with embedded positions)
  - Click nodes in the graph to navigate through positions
  - Export to PGN format
  - Read-only board (pieces cannot be moved)
- **Available buttons**: Load Routes, Export PGN, Fit View
- **Visual indicator**: Light blue background on mode panel
- **URL**: `view.html`

#### Edit Mode (`edit.html`)
- **Purpose**: Build and modify opening repertoires
- **Features**:
  - Make new moves and create variations
  - Undo/Redo navigation (keyboard shortcuts and buttons)
  - Add annotations to moves
  - Export routes to file
  - Full board interaction (drag and drop pieces)
- **Available buttons**: All editing buttons (Reset, Undo/Redo, annotations, Export Routes, etc.)
- **Visual indicator**: Light green background on mode panel
- **URL**: `edit.html`

#### Practice Mode (`practice.html`)
- **Purpose**: Coming soon...
- **Visual indicator**: Light yellow background on mode panel
- **URL**: `practice.html`

**Switching Modes**: Each page has buttons at the top to switch to other modes. Clicking a mode button navigates to that page.

### Getting Started

1. Open `index.html` in your web browser (or visit https://hrakaroo.github.io/chess-openings/)
   - This will redirect you to **View Mode** by default
2. To view existing routes: Stay in View Mode, click **Load Routes**, and select a `.txt` file
3. To build a new repertoire: Click **Switch to Edit Mode** at the top

### Exploring Openings (Edit Mode)

1. Navigate to `edit.html` or click **Switch to Edit Mode** from View Mode
2. Move pieces on the board to explore opening lines (drag and drop)
3. The turn indicator shows whose move it is (White or Black)
4. Watch the tree graph build as you make moves
5. Click any node in the graph to jump to that position

### Adding Annotations (Edit Mode)

1. After making a move, the annotation text box will show any existing annotation for that move
2. Type your note or comment in the text box (e.g., "Main line", "Tricky trap!", "Best for White")
3. Click the **Save** button to save the annotation
4. Annotations appear in the tooltip when you hover over nodes in the graph
5. Returns and quotes are automatically stripped from annotations

**Note**: Annotations are saved with the transition between two positions, so they're associated with the move that was just made.

### Managing Routes

- **Reset Board** - return to the starting position without clearing the graph
- **Reset Board and Graph** - return to the starting position and completely clear all graph data (removes all explored positions and variations)
- **Undo** - go back to the previous position in your move history (Ctrl+Z, Cmd+Z, or Left Arrow)
- **Redo** - move forward in your history after undoing (Ctrl+Y, Ctrl+Shift+Z, Cmd+Shift+Z, or Right Arrow)
- **Export Routes** - prompts for a filename, then saves all recorded transitions to a `.txt` file (v2.0 format with text encoding)
- **Load Routes** - import a previously saved v2.0 .txt file to restore your opening tree (displays the loaded filename and version below the buttons)
- **Load Positions** - optionally load a pre-computed positions JSON file generated by `evaluate.py` for optimal graph layout with minimal edge crossings
- **Export PGN** - exports your opening tree to standard PGN (Portable Game Notation) format with variations, compatible with chess software like Lichess, Chess.com, and ChessBase
- **Fit View** - automatically scales and centers the graph to show all nodes within the canvas (useful after exploring large opening trees)

**Note on Undo/Redo**: When you undo, the "future" path is immediately removed from the graph. When you redo, the path is restored. If you make a new move after undoing, the old future is permanently replaced. Positions that are reachable via other paths (transpositions) are always preserved.

**Note on PGN Export**: The PGN export creates a single game with all your variations. The main line follows the first branch at each position, and alternative moves are shown as variations in parentheses.

### Optimizing Graph Layout (Advanced)

For complex opening trees with many variations, you can use the Python script to generate optimal node positions with minimal edge crossings:

1. **Install dependencies** (one-time setup):
   ```bash
   pip install networkx pygraphviz
   ```
   Note: `pygraphviz` requires graphviz to be installed on your system:
   - macOS: `brew install graphviz`
   - Ubuntu/Debian: `sudo apt-get install graphviz graphviz-dev`
   - Windows: Download from https://graphviz.org/download/

2. **Optional: Install evaluation support** (for position scoring):
   ```bash
   pip install chess
   ```
   For Stockfish engine:
   - macOS: `brew install stockfish`
   - Ubuntu/Debian: `sudo apt-get install stockfish`
   - Windows: Download from https://stockfishchess.org/download/

3. **Generate positions and evaluations**:
   ```bash
   python evaluate.py your-openings.txt
   ```
   This modifies your file in place, adding optimal position coordinates and Stockfish evaluations for leaf nodes (terminal positions).

   To skip evaluation:
   ```bash
   python evaluate.py your-openings.txt --no-eval
   ```

   To specify Stockfish location:
   ```bash
   python evaluate.py your-openings.txt --stockfish-path /path/to/stockfish
   ```

4. **Try different algorithms** if you see edge crossings:
   ```bash
   python evaluate.py your-openings.txt --algorithm dot
   python evaluate.py your-openings.txt --algorithm neato
   python evaluate.py your-openings.txt --algorithm fdp
   ```
   Available algorithms:
   - `dot` - hierarchical/layered (best for DAGs, minimizes crossings) - **default**
   - `neato` - spring model (force-directed)
   - `fdp` - force-directed with smart edge handling
   - `sfdp` - scalable force-directed (for large graphs)

5. **Save to a different file** (optional):
   ```bash
   python evaluate.py your-openings.txt --output optimized-openings.txt
   ```

6. **Load in browser**:
   - Open View or Edit mode
   - Click "Load Routes" and select your `.txt` file
   - The graph will automatically use the embedded positions and evaluations

**Benefits of pre-computed positions and evaluations**:
- Eliminates or minimizes edge crossings
- More powerful layout algorithms than browser-based Dagre
- Stockfish evaluations for leaf positions (terminal nodes)
- Positions and evaluations embedded in the same file (no separate files to manage)
- Can be regenerated with different algorithms to find the best one
- Optional - tool works fine without positions (uses Dagre layout)

### Navigation

- Click on any node in the tree graph to set the board to that position
- The current position is highlighted in green
- Make moves from any position to extend that branch of your opening tree
- Use **Undo** and **Redo** buttons to navigate through your move history
- Undo/Redo buttons are automatically disabled when at the beginning/end of history

### Graph Controls

- **Mouse Wheel** - zoom in/out on the tree graph (zoom range: 0.1x to 5x)
- **Click and Drag** - pan around the graph to explore large opening trees
- **Click Node** - jump to that board position (adds to history)
- **Hover Over Node** - see the move that was played to reach that position (e.g., "e4", "Nf6", "O-O")

### Keyboard Shortcuts

#### Edit Mode
- **Ctrl+Z** (Windows/Linux) or **Cmd+Z** (Mac) - Undo
- **Ctrl+Y** (Windows/Linux) or **Cmd+Shift+Z** (Mac) - Redo
- **Ctrl+Shift+Z** (Windows/Linux) - Redo (alternative)
- **Left Arrow** - Undo
- **Right Arrow** - Redo
- **Up Arrow** - Navigate to parent node
- **Down Arrow** - Navigate to child node

#### View Mode / Practice Mode
- **Down Arrow** - Navigate to next child node (move forward in the opening)
- **Up Arrow** - Navigate to parent node (move backward)
- **Right Arrow** - Cycle to next sibling variation (alternate move from same position)
- **Left Arrow** - Cycle to previous sibling variation

**Note**: In View/Practice modes, arrow keys provide full graph navigation. In Edit mode, Left/Right arrows are reserved for Undo/Redo, while Up/Down navigate the graph.

## Board State Encoding

Each board state is encoded as a compact string for efficient storage.

### Piece Encoding (Letters A-L)

**White Pieces:**
- `A` = Pawn
- `B` = Knight
- `C` = Bishop
- `D` = Rook
- `E` = Queen
- `F` = King

**Black Pieces:**
- `G` = Pawn
- `H` = Knight
- `I` = Bishop
- `J` = Rook
- `K` = Queen
- `L` = King

### Empty Square Encoding (Digits 1-9)

Empty squares use run-length encoding:
- `8` = eight consecutive empty squares
- `3` = three consecutive empty squares
- etc.

### Turn Encoding

Each state includes whose turn it is next, appended in brackets:
- `[w]` = White to move
- `[b]` = Black to move

### Special Cases

- `start[w]` = The initial chess position with white to move (shortcut to avoid encoding the full starting state)

### Board Reading Order

The board is encoded from top to bottom (rank 8 to rank 1), left to right (a-file to h-file).

## File Format

All exported files use version 2.0 format with text-based state encoding using run-length encoding for efficient representation.

### Format Specification

The first line must contain the version number:
```
v2.0
```

Each board state uses the text encoding described in the "Board State Encoding" section above:
- Pieces are represented by letters A-L
- Empty squares use run-length encoding (digits 1-9)
- Turn indicator `[w]` or `[b]` is appended

The file contains two types of lines:

**1. Position Definitions (Optional)**:
```
state : x, y
state : x, y, evaluation
```
Where:
- `x` and `y` are the canvas coordinates for optimal graph layout
- `evaluation` (optional) is the Stockfish evaluation for leaf positions showing which color is favored:
  - Examples: `white +0.50`, `black +1.25`, `white M5` (white has mate in 5)
  - Always shows the absolute advantage (positive numbers only)
- Position definitions are typically generated by the Python script

**2. Transition Lines**:
```
text_state_before -> text_state_after
text_state_before -> text_state_after: annotation text
```

Example file with positions, evaluations, and transitions:
```
v2.0
start[w] : 283.8, 0.0
JIHKLIHJGGGGGGGG884A38AAAA1AAADBCEFCBD[b] : 283.8, 129.6
JIHKLIHJGGG1GGGG8G3A38AAAA1AAADBCEFCBD[w] : 283.8, 259.2, white +0.25
JIHKLIHJGGG1GGGG1G2A3GA6A3AAA2AAAD2EFCBD[b] : 450.2, 388.8, black +0.35
start[w] -> JIHKLIHJGGGGGGGG884A38AAAA1AAADBCEFCBD[b]: Main line, e4
JIHKLIHJGGGGGGGG884A38AAAA1AAADBCEFCBD[b] -> JIHKLIHJGGG1GGGG8G3A38AAAA1AAADBCEFCBD[w]: Sicilian Defense, c5
JIHKLIHJGGG1GGGG8G3A38AAAA1AAADBCEFCBD[w] -> JIHKLIHJGGG1GGGG1G2A3GA6A3AAA2AAAD2EFCBD[b]: Nf3
```

Note: In this example, the last two positions are leaf nodes (no further moves), so they have Stockfish evaluations. Hover over the red nodes in the graph to see which color is favored.

**Format Benefits**:
- **Unified file**: Positions, evaluations, and routes in a single file (no separate files needed)
- **Optional positions**: Position definitions are optional - files work without them (uses Dagre layout)
- **Optional evaluations**: Stockfish evaluations are optional and only computed for leaf nodes
- **Variable length**: Positions with many empty squares are shorter (typical positions: 30-45 characters)
- **Human-readable**: Text encoding can be manually inspected and understood
- **Efficient**: Run-length encoding provides compact storage for sparse positions

**Notes**:
- Position lines come before transition lines
- Positions are optional - if not present, browser uses Dagre layout
- Evaluations are optional - only generated for leaf positions (terminal nodes)
- Annotations are added after a colon (`:`) following the transition
- Returns and quotes are stripped when saving annotations

## Graph Visualization

The tree graph on the right side of the screen visualizes your opening repertoire:

- **Nodes** represent board positions (states)
  - Only the root node displays a label ("start")
  - Other nodes are unlabeled circles for a clean visualization
- **Edges** are curved lines showing legal moves between positions
- **Root node** is the starting position at the top
- **Node colors**:
  - Blue - the starting position
  - Light grey - positions where it's black's turn
  - Dark grey - positions where it's white's turn
  - Green - the current board position
- **Transpositions**:
  - Multiple edges converging into the same node indicate transpositions (positions reachable via different move orders)
- **Layout** - uses the Dagre library with Sugiyama algorithm to automatically minimize edge crossings and create optimal hierarchical layouts
- **Interactive** - zoom with mouse wheel, pan by dragging, click nodes to navigate

## Transpositions

The tool automatically detects transpositions - positions that can be reached through different move orders. When you reach the same position via different paths, the graph merges them into a single node with multiple incoming edges. You can visually identify transpositions by seeing multiple edges converging into the same position.

This helps you identify key positions in your opening repertoire that arise from multiple variations.
