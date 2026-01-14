# Chess Openings File Format Specification v4.0

## Overview

The Chess Openings file format (`.txt`) is a human-readable text format for storing chess opening repertoires, including move sequences, position information, graph layouts, and Stockfish evaluations.

## File Structure

A v4.0 file consists of:
1. Version header
2. Title line
3. Position definitions (optional)
4. Transition definitions (moves)

## Format Specification

### 1. Version Header (Required)

```
v4.0
```

- **Line 1**: Must be exactly `v4.0`
- Case-sensitive
- No spaces or additional characters

### 2. Title Line (Required)

```
= Title Text
```

- **Line 2**: Must start with `=` followed by a space
- Title can contain any characters after the space
- Used for display in the UI

### 3. Position Definitions (Optional)

Format:
```
<FEN> : <x>, <y>
<FEN> : <x>, <y>, <evaluation>
```

**Fields:**
- `<FEN>`: Normalized FEN string or `start` keyword
- `<x>`: X coordinate (float)
- `<y>`: Y coordinate (float, canvas coordinates with origin at top-left)
- `<evaluation>`: Optional Stockfish evaluation (e.g., `white +0.35`, `black -1.20`, `M5`)

**FEN Normalization:**
- En passant square: Always `-`
- Halfmove clock: Always `0`
- Fullmove number: Always `1`

**Example:**
```
start : 50.8, 0.0
rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1 : 50.8, 129.6, white +0.26
rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 1 : 90.8, 259.2, white +0.25
```

### 4. Transition Definitions (Required)

Format:
```
<from_FEN> -> <move>
# <comment>
<from_FEN> -> <move>
```

**Fields:**
- `<from_FEN>`: Starting position (normalized FEN or `start`)
- `->`: Separator (space-arrow-space)
- `<move>`: Standard Algebraic Notation (SAN) move

**Comments:**
- Lines starting with `#` are comments/annotations
- Associated with the next transition
- Multiple comment lines are concatenated

**Example:**
```
start -> d4
rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1 -> d5
# London System main line
rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 1 -> Bf4
rnbqkbnr/ppp1pppp/8/3p4/3P1B2/8/PPP1PPPP/RN1QKBNR b KQkq - 0 1 -> Nf6
```

## Complete Example

```
v4.0
= London System - Main Lines
start : 50.8, 0.0
rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1 : 50.8, 129.6, white +0.26
rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 1 : 90.8, 259.2, white +0.25
rnbqkbnr/ppp1pppp/8/3p4/3P1B2/8/PPP1PPPP/RN1QKBNR b KQkq - 0 1 : 90.8, 388.8, white +0.19
start -> d4
rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1 -> d5
# Main line continues with Bf4
rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 1 -> Bf4
rnbqkbnr/ppp1pppp/8/3p4/3P1B2/8/PPP1PPPP/RN1QKBNR b KQkq - 0 1 -> Nf6
```

## FEN Notation Details

FEN (Forsyth-Edwards Notation) has 6 space-separated fields:

1. **Piece placement** (rank 8 to rank 1, `/` separates ranks)
   - Lowercase = black pieces, Uppercase = white pieces
   - Numbers = empty squares
   - Example: `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR`

2. **Active color**
   - `w` = White to move
   - `b` = Black to move

3. **Castling availability**
   - `K` = White kingside, `Q` = White queenside
   - `k` = Black kingside, `q` = Black queenside
   - `-` = No castling available
   - Example: `KQkq` (all castling available)

4. **En passant target square**
   - **Normalized to `-`** in this format
   - Original: algebraic notation (e.g., `e3`) or `-`

5. **Halfmove clock**
   - **Normalized to `0`** in this format
   - Original: moves since last capture or pawn advance (for 50-move rule)

6. **Fullmove number**
   - **Normalized to `1`** in this format
   - Original: starts at 1, increments after Black's move

**Normalization Rationale:**
Fields 4-6 are normalized because:
- En passant is ephemeral (only valid for one ply)
- Move counters don't affect position identity
- Enables transposition detection (same position, different move orders)

## Standard Algebraic Notation (SAN)

Moves use standard chess notation:

- **Pawn moves**: `e4`, `d5`, `exd5` (capture)
- **Piece moves**: `Nf3`, `Bb5`, `Qh5`
- **Captures**: `Nxe5`, `Bxf7+`
- **Castling**: `O-O` (kingside), `O-O-O` (queenside)
- **Promotion**: `e8=Q`, `e8=N`
- **Check**: `Qh5+`
- **Checkmate**: `Qh7#`

Disambiguations when needed:
- `Nbd7` (knight from b-file)
- `R1a3` (rook from 1st rank)
- `Qh4e1` (fully disambiguated)

## Version History

### v4.0 (Current)
- FEN-based position encoding
- Move notation for transitions (`d4` instead of full FEN)
- Normalized FEN (en passant = `-`, counters = `0 1`)
- Stockfish evaluations
- Graph layout coordinates
- Title support
- Comment/annotation support

### v3.0 (Deprecated)
- Custom position encoding
- Full FEN for both source and target in transitions
- No normalization

## Compatibility

- **Reading**: Supports both move notation and old full-FEN transitions
- **Writing**: Always outputs move notation format
- **Tools**:
  - JavaScript: `chess.js` library for move parsing
  - Python: `python-chess` library for move parsing
  - Evaluation: Stockfish chess engine

## Validation Rules

1. **Version** must be exactly `v4.0`
2. **Title** must exist and start with `=`
3. **FEN strings** must be valid (validated by chess.js/python-chess)
4. **Move notation** must be legal from the source position
5. **Coordinates** must be numeric (floats)
6. **Evaluations** must match format: `(white|black) [+-]?\d+\.\d+` or `M\d+`

## Error Handling

Invalid files should produce clear error messages:
- Missing version: "Invalid file format. Missing version header."
- Wrong version: "Unsupported version. Expected v4.0, but got vX.X"
- Missing title: "Invalid file format. Missing title line."
- Invalid FEN: "Invalid FEN: <error details>"
- Invalid move: "Invalid move '<move>' from state <FEN>"

## Best Practices

1. **Hand-editing**:
   - Use move notation for readability
   - Add comments for variations
   - One transition per line

2. **Generated files**:
   - Run through `evaluate.py` to add coordinates and evaluations
   - Ensure proper normalization

3. **Version control**:
   - Git-friendly line-based format
   - Clear diffs for move changes
   - Separate files for different openings

4. **File naming**:
   - Use descriptive names: `London-System-vs-Kings-Indian.txt`
   - Avoid spaces if possible (use hyphens or underscores)

## Tools

### generate layout and evaluations
```bash
python evaluate.py input.txt --output output.txt
python evaluate.py input.txt --algorithm dot  # Different layout
python evaluate.py input.txt --no-eval         # Skip Stockfish
```

### Convert old format
```bash
python evaluate.py old-v3-file.txt --output new-v4-file.txt
```

## See Also

- [README.md](README.md) - Main documentation
- [FEN on Wikipedia](https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation)
- [PGN Specification](https://www.chessclub.com/help/PGN-spec)
- [Stockfish](https://stockfishchess.org/)
