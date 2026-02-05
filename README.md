# Chess Opening Practice Tool

A [static web application for practicing chess openings](https://www.hrakaroo.com/chess-openings/).

## Motivation

While learning the London System opening, I noticed that many variations shared common board positions but arrived there through different move orders (transpositions). For example, reaching the same position via e6→b3→f6 versus f6→b3→e6.

I had difficulty visualizing these relationships, and it bothered me that traditional training tools treated each variation as a strict sequence rather than highlighting the common positions.

My initial goal was to render opening variations as a graph to clearly see where different paths converge. Visualizing transpositions made it much easier to understand and remember opening theory. From there, it was natural to extend the tool to support building custom repertoires and practicing them interactively.

## Caveat

Graph nodes are rendered without en passant information for transposition detection. This is a deliberate design choice because:
- En passant opportunities are rare in general play
- They're even rarer in opening theory
- They're extremely rare in cases where they would meaningfully distinguish between variations

The system uses **dual FEN storage** to handle this:
- **Graph nodes** use normalized FENs (en passant stripped) for transposition detection
- **Graph edges** preserve full FENs (en passant included) for move validation
- **Practice mode** uses full FENs for position loading, enabling en passant captures

This means en passant moves work correctly in all modes, while transposition detection remains accurate. There's a very narrow theoretical possibility that the system may incorrectly merge two positions that should be distinct due to differing en passant rights, but this is extremely unlikely in practical opening theory.

## Features

- **Interactive chessboard** with drag-and-drop piece movement, legal move validation, and Staunty piece theme (Staunton-style pieces with depth and shading from Lichess)
- **Automatic state tracking** - each move is captured as a transition between board states
- **Move annotations** - add notes and comments to specific moves:
  - Type annotation before making a move, it's automatically applied
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
  - Export to v5.0 format (.txt) with FEN notation, positions, evaluations, titles, and player color
  - Export to standard PGN format for use in other chess software
  - Import from saved v5.0 files with annotation, title, and player color support
- **Keyboard shortcuts** - Ctrl+Z/Cmd+Z for undo, Ctrl+Y/Cmd+Shift+Z for redo, arrow keys for navigation (Build Mode only)
- **Turn indicator** - shows whose move it is at all times

## How to Use

The application now has three separate pages, each optimized for a specific workflow:

### 📁 File Structure

```
/practice/
  ├── index.html          - Welcome page with mode selection
  ├── explore.html        - Explore Mode: Browse and explore routes
  ├── build.html          - Build Mode: Build and modify repertoires
  ├── practice.html       - Practice Mode: Interactive opening practice
  ├── README.md           - Main documentation
  ├── bin/                - Python utility scripts
  │   ├── evaluate.py     - Layout optimization and Stockfish evaluation
  │   └── merge.py        - Merge multiple opening files
  ├── js/                 - JavaScript modules
  │   ├── chess-common.js - Shared chess logic
  │   ├── fen-utils.js    - FEN normalization utilities
  │   └── ui-feedback.js  - User interface feedback (modals, toasts)
  ├── docs/               - Documentation files
  │   ├── FORMAT.md       - v4.0 file format specification
  │   ├── IMPROVEMENTS.md - Summary of improvements
  │   ├── TESTING.md      - Testing guide
  │   └── CHANGELOG.md    - Change history
  ├── tests/              - Test files
  │   ├── normalization.test.js - JavaScript tests
  │   ├── test_evaluate.py      - Python tests
  │   └── test-export.html      - Export feature test page
  └── openings/           - Collection of pre-built openings
```

### Modes

#### Explore Mode (`explore.html`)
- **Purpose**: Load and view opening routes without making changes
- **Features**:
  - Quick-load dropdown for pre-built openings or custom file upload
  - Click nodes in the graph to navigate through positions
  - Keyboard navigation (arrow keys: Down=next move, Up=previous, Right/Left=alternate variations)
  - View move annotations in read-only text field above the board
  - Export to PGN format
  - Board pieces are moved through the graph only
- **Available buttons**: Load dropdown, Custom File, Export PGN, Fit View
- **URL**: `explore.html`

#### Build Mode (`build.html`)
- **Purpose**: Build and modify opening repertoires
- **Features**:
  - Make new moves and create variations
  - Undo/Redo navigation (keyboard shortcuts and buttons)
  - Add annotations to moves
  - Export routes to file with title prompt
  - Full board interaction (drag and drop pieces)
- **Available buttons**: All editing buttons (Reset, Undo/Redo, annotations, Export Routes, etc.)
- **URL**: `build.html`

#### Practice Mode (`practice.html`)
- **Purpose**: Test your knowledge of loaded opening repertoires through interactive practice
- **Features**:
  - Quick-load dropdown for pre-built openings or custom file upload
  - Player color (White or Black) is loaded from the opening file
  - Computer automatically plays the opposite side through the repertoire
  - Validates your moves against loaded variations (including en passant captures)
  - Tracks "Mistakes" count (increments on each incorrect move) and "Variations" (paths remaining to practice)
  - Automatically cycles through all unique paths in random order
  - View move annotations during practice with auto-appended move descriptions
  - Graph visualization with current position highlighted (view-only, clicking disabled)
  - **Last move highlighting** - squares are highlighted to show the most recent move (from and to squares)
  - **Error highlighting** - red flash on squares when attempting incorrect moves
  - **Audio feedback** - move sounds for correct moves, gentle error tone for incorrect moves
- **Available buttons**: Load dropdown, Custom File, Reset, Fit View
- **URL**: `practice.html`

##### Debug Console (Practice Mode)

You can enable detailed transition logging to the browser console to see exactly what moves are being played:

1. Open your browser's developer console (F12 or Cmd+Option+I)
2. Type: `DEBUG_TRANSITIONS = true`
3. Press Enter

Now you'll see detailed logs for every transition:
- **[Practice Start]**: When practice begins, shows total paths and shuffled order
- **[New Path]**: When starting a new path through the opening
- **[User Move]**: Your moves with CORRECT/INCORRECT status and FEN transitions
- **[Computer Move]**: Computer's moves with FEN transitions
- **[Path Complete]**: When a path finishes (with or without mistakes)
- **[Score]**: Updated score after each path completion

Example output:
```
[Practice Start] Playing as white
[Practice Start] Total paths: 8
[New Path] Starting path 1/8
[User Move] CORRECT - Path 1/8, Step 1/5
  From: start
  To:   rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1
[Computer Move] Path 1/8, Step 2/5
  From: rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1
  To:   rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2
```

To disable logging, type: `DEBUG_TRANSITIONS = false`

**Switching Modes**: Click the "← Back to Home" link at the top of any mode page to return to the welcome page and select a different mode.

### Getting Started

1. Open `index.html` in your web browser (or visit https://hrakaroo.github.io/chess-openings/)
   - You'll see a welcome page with three mode options
2. To view existing routes: Click **Explore** mode, then click **Load Routes** and select a `.txt` file
3. To build a new repertoire: Click **Build** mode at the welcome page

### Exploring Openings (Build Mode)

1. Navigate to `build.html` or click **Build** from the welcome page
2. Move pieces on the board to explore opening lines (drag and drop)
3. The turn indicator shows whose move it is (White or Black)
4. Watch the tree graph build as you make moves
5. Click any node in the graph to jump to that position

### Adding Annotations (Build Mode)

1. Type your note or comment in the annotation text box **before** making a move (e.g., "Main line", "Tricky trap!", "Best for White")
2. Make the move by dragging a piece
3. The annotation is automatically applied to the move you just made
4. The annotation text box clears automatically, ready for the next move
5. Annotations appear in the tooltip when you hover over nodes in the graph
6. Returns and quotes are automatically stripped from annotations

**Note**: Annotations are saved with the transition between two positions, so they're associated with the move. Type the annotation first, then make the move - no save button needed!

### Practicing Openings (Practice Mode)

1. Navigate to `practice.html` or click **Practice** from the welcome page
2. Click **Load Routes** and select a `.txt` file containing your opening repertoire
3. Practice automatically starts - player color (White or Black) is loaded from the file
4. The computer will play the opposite side, and you must respond with moves from your loaded repertoire
5. **Mistakes** counter increments each time you make an incorrect move
6. **Variations** counter shows how many paths remain to practice (counts down to zero)
7. Making an incorrect move causes a red flash on the square and plays an error sound, but doesn't reset the position
8. The practice session cycles through all paths in random order (shuffled at start)
9. When all variations are complete, a completion modal shows your total mistakes
10. Click **Reset** to restart the practice session with a new random order
11. Annotations from your repertoire are displayed above the board with auto-generated move descriptions (e.g., "Knight to f3")

**Tips**:
- Practice mode validates your moves against ALL loaded variations, so any valid move from your repertoire is accepted
- The random order ensures you're truly learning the positions, not just memorizing a fixed sequence
- Red square flashing provides immediate visual feedback when attempting incorrect moves
- Move descriptions are automatically appended to annotations for user moves only

### Managing Routes

- **Reset Board** - return to the starting position without clearing the graph
- **Reset Board and Graph** - return to the starting position and completely clear all graph data (removes all explored positions and variations)
- **Undo** - go back to the previous position in your move history (Ctrl+Z, Cmd+Z, or Left Arrow)
- **Redo** - move forward in your history after undoing (Ctrl+Y, Ctrl+Shift+Z, Cmd+Shift+Z, or Right Arrow)
- **Export Routes** - prompts for title, player color (white/black), and filename, then saves all recorded transitions to a `.txt` file (v5.0 format with FEN notation, title, and player color). The title and player color default to loaded values if available.
- **Load Routes** - import a previously saved v5.0 .txt file to restore your opening tree (displays the loaded title, filename and version below the graph)
- **Export PGN** - exports your opening tree to standard PGN (Portable Game Notation) format with variations, compatible with chess software like Lichess, Chess.com, and ChessBase
- **Fit View** - automatically scales and centers the graph to show all nodes within the canvas (useful after exploring large opening trees)

**Note on Undo/Redo**: When you undo, the "future" path is immediately removed from the graph. When you redo, the path is restored. If you make a new move after undoing, the old future is permanently replaced. Positions that are reachable via other paths (transpositions) are always preserved.

**Note on PGN Export**: The PGN export creates a single game with all your variations. The main line follows the first branch at each position, and alternative moves are shown as variations in parentheses.

### Optimizing Graph Layout (Advanced)

For complex opening trees with many variations, you can use the Python script to generate optimal node positions with minimal edge crossings.

**Quick Start** (recommended setup):
```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # macOS/Linux (on Windows: venv\Scripts\activate)

# Install dependencies
pip install numpy networkx chess

# Install graphviz (system package)
brew install graphviz  # macOS (Ubuntu: sudo apt-get install graphviz graphviz-dev)

# Install pygraphviz with environment variables (macOS)
export CFLAGS="-I$(brew --prefix graphviz)/include"
export LDFLAGS="-L$(brew --prefix graphviz)/lib"
pip install pygraphviz

# Run the script
python bin/evaluate.py your-openings.txt
```

**Detailed Setup Instructions:**

1. **Set up Python virtual environment** (recommended, one-time setup):
   ```bash
   # Create a virtual environment in the project directory
   python3 -m venv venv

   # Activate the virtual environment
   # On macOS/Linux:
   source venv/bin/activate
   # On Windows:
   # venv\Scripts\activate
   ```

   Note: You'll need to activate the virtual environment each time you want to use the Python scripts:
   ```bash
   source venv/bin/activate  # macOS/Linux
   ```

   When you're done, you can deactivate the virtual environment:
   ```bash
   deactivate
   ```

2. **Install required Python dependencies** (with virtual environment activated):
   ```bash
   pip install numpy networkx
   ```
   Note: NetworkX requires numpy, which is used for numerical computations in layout algorithms.

3. **Install pygraphviz for optimal graph layouts** (recommended):

   First install graphviz system package:
   - **macOS:** `brew install graphviz`
   - **Ubuntu/Debian:** `sudo apt-get install graphviz graphviz-dev`
   - **Windows:** Download from https://graphviz.org/download/

   Then install pygraphviz with explicit paths to help pip find the graphviz libraries:

   **macOS:**
   ```bash
   export CFLAGS="-I$(brew --prefix graphviz)/include"
   export LDFLAGS="-L$(brew --prefix graphviz)/lib"
   pip install pygraphviz
   ```

   **Linux:**
   ```bash
   pip install pygraphviz
   ```

   **Windows:** See [INSTALL_PYGRAPHVIZ.md](INSTALL_PYGRAPHVIZ.md)

   **If installation fails:** See [INSTALL_PYGRAPHVIZ.md](INSTALL_PYGRAPHVIZ.md) for detailed troubleshooting, or skip to step 4 and use built-in layouts (they work well, just not as optimal).

   **Verify installation:**
   ```bash
   python -c "import pygraphviz; print('Success!')"
   ```

4. **Optional: Install evaluation support** (for position scoring):
   ```bash
   pip install chess
   ```
   For Stockfish engine:
   - macOS: `brew install stockfish`
   - Ubuntu/Debian: `sudo apt-get install stockfish`
   - Windows: Download from https://stockfishchess.org/download/

5. **Generate positions and evaluations** (with virtual environment activated):
   ```bash
   python bin/evaluate.py your-openings.txt
   ```
   This modifies your file in place, adding optimal position coordinates and Stockfish evaluations for leaf nodes (terminal positions).

   **The script will automatically use the best available layout backend:**
   - If you installed pygraphviz: Uses pygraphviz for optimal layouts (recommended)
   - If you only have networkx: Uses built-in hierarchical layout (good for most cases)

   To skip evaluation:
   ```bash
   python bin/evaluate.py your-openings.txt --no-eval
   ```

   To specify Stockfish location:
   ```bash
   python bin/evaluate.py your-openings.txt --stockfish-path /path/to/stockfish
   ```

6. **Try different algorithms** if you have pygraphviz installed:
   ```bash
   python bin/evaluate.py your-openings.txt --algorithm dot
   python bin/evaluate.py your-openings.txt --algorithm neato
   python bin/evaluate.py your-openings.txt --algorithm fdp
   python bin/evaluate.py your-openings.txt --algorithm sfdp
   ```
   Available algorithms (requires pygraphviz):
   - `dot` - hierarchical/layered (best for DAGs, minimizes crossings) - **default and recommended**
   - `neato` - spring model (force-directed)
   - `fdp` - force-directed with smart edge handling
   - `sfdp` - scalable force-directed (best for very large graphs)

   **Note:** Without pygraphviz, the `--algorithm` parameter is ignored and a built-in hierarchical layout is used automatically.

7. **Save to a different file** (optional):
   ```bash
   python bin/evaluate.py your-openings.txt --output optimized-openings.txt
   ```

8. **Load in browser**:
   - Open View or Edit mode
   - Click "Load Routes" and select your `.txt` file
   - The graph will automatically use the embedded positions and evaluations

**Benefits of pre-computed positions and evaluations**:
- **Eliminates or minimizes edge crossings** - pygraphviz produces significantly better layouts than browser-based Dagre
- **More powerful layout algorithms** - access to graphviz's sophisticated layout engines (dot, neato, fdp, sfdp)
- **Stockfish evaluations for leaf positions** - see which terminal positions are favorable
- **Everything in one file** - positions and evaluations embedded in the same file (no separate files to manage)
- **Reproducible layouts** - can regenerate with different algorithms to find the best one
- **Optional** - tool works fine without positions (uses Dagre layout in browser)

### Merging Opening Files

If you have multiple opening files that you want to combine into a single repertoire, use the `merge.py` script (with virtual environment activated if you set one up):

```bash
# Activate virtual environment first (if using one)
source venv/bin/activate  # macOS/Linux

# Run merge script
python bin/merge.py file1.txt file2.txt file3.txt --output merged.txt
```

**What it does**:
- Combines all unique transitions from multiple files
- Merges annotations when the same transition appears in multiple files (separated by ` | `)
- Combines titles from all input files (e.g., "London System + Queen's Gambit")
- Removes position coordinates and evaluations (clean output)
- Outputs a standard v4.0 format file ready to use

**Example**:
```bash
# Merge multiple London System variations
python bin/merge.py openings/london-1-5.txt openings/london-6-10.txt --output openings/london-complete.txt

# Merge different openings into a repertoire
python bin/merge.py openings/london.txt openings/queens-gambit.txt openings/kings-indian.txt --output my-repertoire.txt
```

**Use cases**:
- Combining separate files for the same opening (e.g., different variations learned at different times)
- Building a complete repertoire from multiple opening systems
- Consolidating similar lines with different annotations
- Creating a master file from themed subsets

**Note**: If you want optimal graph layout after merging, run `bin/evaluate.py` on the merged file.

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

#### Build Mode
- **Ctrl+Z** (Windows/Linux) or **Cmd+Z** (Mac) - Undo
- **Ctrl+Y** (Windows/Linux) or **Cmd+Shift+Z** (Mac) - Redo
- **Ctrl+Shift+Z** (Windows/Linux) - Redo (alternative)
- **Left Arrow** - Undo
- **Right Arrow** - Redo
- **Up Arrow** - Navigate to parent node
- **Down Arrow** - Navigate to child node

#### Explore Mode / Practice Mode
- **Down Arrow** - Navigate to next child node (move forward in the opening)
- **Up Arrow** - Navigate to parent node (move backward)
- **Right Arrow** - Cycle to next sibling variation (alternate move from same position)
- **Left Arrow** - Cycle to previous sibling variation

**Note**: In Explore/Practice modes, arrow keys provide full graph navigation. In Build mode, Left/Right arrows are reserved for Undo/Redo, while Up/Down navigate the graph.

## Board State Encoding

Board states are encoded using **FEN (Forsyth-Edwards Notation)**, the standard notation for describing chess positions.

### FEN Format

FEN is a standard notation that consists of six fields separated by spaces:

1. **Piece placement** (from rank 8 to rank 1, "/" separates ranks)
2. **Active color** ("w" for white, "b" for black)
3. **Castling availability** (e.g., "KQkq" or "-")
4. **En passant target square** (e.g., "e3" or "-")
5. **Halfmove clock** (number of halfmoves since last capture or pawn move)
6. **Fullmove number** (starts at 1, incremented after black's move)

**Example FEN strings:**
- Starting position: `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1`
- After 1. e4: `rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1`
- After 1. e4 c5: `rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2`

**Piece notation in FEN:**
- Uppercase = White pieces (P, N, B, R, Q, K)
- Lowercase = Black pieces (p, n, b, r, q, k)
- Digits = Number of consecutive empty squares (1-8)

### Special Cases

- `start` = A shortcut keyword representing the initial chess position (equivalent to the starting FEN)

## File Format

All exported files use version 5.0 format with FEN (Forsyth-Edwards Notation) for board state representation. Each file must include a title on line 2 and player color on line 3.

### Format Specification

The first line must contain the version number:
```
v5.0
```

The second line must contain the title:
```
= Title of Opening Repertoire
```

The third line must contain the player color (who you practice as):
```
white
```
or
```
black
```

Each board state uses FEN notation as described in the "Board State Encoding" section above, or the special `start` keyword for the initial position.

The file contains three types of lines:

**1. Position Definitions (Optional)**:
```
state : x, y
state : x, y, evaluation
```
Where:
- `state` is either `start` or a full FEN string
- `x` and `y` are the canvas coordinates for optimal graph layout
- `evaluation` (optional) is the Stockfish evaluation for leaf positions showing which color is favored:
  - Examples: `white +0.50`, `black +1.25`, `white M5` (white has mate in 5)
  - Always shows the absolute advantage (positive numbers only)
- Position definitions are typically generated by the Python script

**2. Transition Lines**:
```
state -> move
```
Where:
- `state` is either `start` or a full FEN string representing the board position
- `move` is the chess move in Standard Algebraic Notation (SAN), e.g., "e4", "Nf3", "O-O", "Qxd5"

**3. Annotations**:
Annotations are specified using `#` comment lines immediately before the transition:
```
# Annotation text here
# Multiple lines are joined with spaces
state -> move
```

Example file with title, player color, positions, evaluations, annotations, and transitions:
```
v5.0
= Sicilian Defense Repertoire
white
start : 283.8, 0.0
rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1 : 283.8, 129.6
rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2 : 283.8, 259.2, white +0.25
rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2 : 450.2, 388.8, black +0.35
# Main line, e4
start -> e4
# Sicilian Defense, c5
rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1 -> c5
# Nf3
rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2 -> Nf3
```

Note: In this example, the last two positions are leaf nodes (no further moves), so they have Stockfish evaluations. Hover over the red nodes in the graph to see which color is favored.

**Format Benefits**:
- **Highly readable**: Transitions show actual chess moves (e4, Nf3, O-O) instead of full board positions
- **Compact**: Move notation is much shorter than full FEN strings, reducing file size significantly
- **Standard notation**: Uses industry-standard FEN and SAN (Standard Algebraic Notation)
- **Unified file**: Positions, evaluations, and routes in a single file (no separate files needed)
- **Optional positions**: Position definitions are optional - files work without them (uses Dagre layout)
- **Optional evaluations**: Stockfish evaluations are optional and only computed for leaf nodes
- **Easy to edit**: You can manually edit move sequences without reconstructing full board positions
- **Universal compatibility**: FEN and SAN work with all chess software and libraries

**Notes**:
- Position lines come before transition lines
- Positions are optional - if not present, browser uses Dagre layout
- Evaluations are optional - only generated for leaf positions (terminal nodes)
- Transitions use Standard Algebraic Notation (SAN) for moves, not full FEN strings
- The target state is computed by applying the move to the source state
- Annotations use `#` comment lines immediately before the transition
- Multiple `#` comment lines before a transition are joined with spaces
- Empty `#` lines are ignored
- Returns and quotes are stripped when saving annotations
- Title line (line 2) and player color line (line 3) are required in v5.0 format
- Player color must be either "white" or "black" (lowercase)

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
