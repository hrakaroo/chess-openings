# En Passant Handling Fix

## The Problem

The graph was being rendered as multiple disconnected subgraphs because positions with different en passant information were being treated as separate nodes.

### Example

Two different paths reach the same logical board position:
1. Path A: `1.e4 e5 2.Nf3` (no en passant in resulting FEN)
2. Path B: `1.Nf3 e5 2.e4` (en passant square e3 in resulting FEN)

These should be the SAME node in the graph (transposition), but were being rendered as two separate nodes because the FEN strings differed only in the en passant field.

## The Solution

**Two-Level FEN Storage:**

1. **Graph Nodes**: Use NORMALIZED FEN (en passant stripped)
   - Ensures transpositions are detected and merged
   - Same logical position = same node, regardless of how you reached it

2. **File Storage**: Use FULL FEN (en passant preserved) in transitions
   - Required for correct move validation (e.g., en passant captures)
   - Exported file preserves all information needed to replay the moves

## Implementation

### Python (`bin/evaluate.py`)

**Changed:**
- `parse_v4_file()`: Now returns edges as 4-tuples: `(normalized_from, normalized_to, annotation, full_from_fen)`
- `build_graph()`: Uses normalized FENs for graph topology, stores full FEN as edge attribute
- `update_file_with_positions()`: Exports transitions with full FEN preserved
- `find_leaf_nodes()`: Updated to handle new edge format

**Key Code:**
```python
# When parsing:
normalized_from = normalize_fen(from_state)
states.add(normalized_from)  # Graph nodes use normalized FEN
edges.append((normalized_from, to_state, annotation, from_state))  # Preserve full FEN

# When exporting:
transition_lines.append(f"{full_from_fen} -> {move_notation}")  # Use full FEN
```

### JavaScript (`js/chess-common.js`)

**Changed:**
- `loadRoutesFromFile()`: Normalizes both from and to states when loading old format transitions
- Old format path now calls: `addEdgeToGraph(normalizedFrom, normalizedTo, annotation, true, '', fromState)`
  - `normalizedFrom/To`: Used for graph nodes (transposition detection)
  - `fromState`: Stored as fullFEN for export

**Key Code:**
```javascript
// Normalize for graph nodes
var normalizedFrom = normalizeFEN(fromState);
var normalizedTo = normalizeFEN(toPart);

// Pass normalized states for graph, preserve full FEN for export
addEdgeToGraph(normalizedFrom, normalizedTo, annotation, true, '', fromState);
```

## Testing

To verify the fix works:

1. **Create a position with en passant**:
   - Make a move that creates an en passant opportunity (e.g., pawn advancing two squares)
   - File should have FEN with en passant square (e.g., `e3`)

2. **Load the file in browser**:
   - Graph should show ONE node for the position
   - Not multiple nodes for different en passant states

3. **Export and reload**:
   - Exported file should preserve en passant information
   - Reloading should work correctly

## Files Modified

1. `/bin/evaluate.py` - Python layout/evaluation script
   - `parse_v4_file()` - Added full_from_fen to edges
   - `build_graph()` - Handle 4-tuple edges
   - `find_leaf_nodes()` - Handle 4-tuple edges
   - `update_file_with_positions()` - Export with full FEN

2. `/js/chess-common.js` - JavaScript graph/board logic
   - `loadRoutesFromFile()` - Normalize FENs for graph topology in old format path

## Backward Compatibility

The changes are backward compatible:

- **Old files** (without en passant): Work exactly as before
- **New files** (with en passant): Now handled correctly
- **Mixed usage**: Old code can read new files, new code can read old files

The 4-tuple edge format includes a fallback for 3-tuple edges in `build_graph()`.

## Related Files

- `/js/fen-utils.js` - Contains `normalizeFEN()` function
- `/CLAUDE.md` - Project documentation (includes en passant caveat section)
- `/README.md` - User-facing documentation

## Date

January 2026 - Fixed en passant handling for proper transposition detection
