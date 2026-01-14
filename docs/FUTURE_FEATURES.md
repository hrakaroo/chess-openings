# Future Features & Enhancements

This document tracks potential features and improvements to consider for future development.

## User Experience Enhancements

### Move Highlighting (Chess.com Style)

**Description:** Show possible legal moves when a piece is selected/clicked.

**Visual Indicators:**
- Small dots on empty destination squares
- Hollow circles on squares with capturable pieces
- Highlight the selected piece's square

**Implementation Approach:**
1. Add click handler to detect piece selection
2. Use Chess.js to get legal moves for selected piece:
   ```javascript
   var moves = game.moves({
       square: source,
       verbose: true
   });
   ```
3. Add visual indicators to each destination square:
   - Small dot for normal moves
   - Hollow circle for captures
4. Add CSS styling for move hints:
   ```css
   .move-hint {
       width: 20px;
       height: 20px;
       border-radius: 50%;
       background: rgba(0, 0, 0, 0.2);
       position: absolute;
       top: 50%;
       left: 50%;
       transform: translate(-50%, -50%);
   }

   .capture-hint {
       width: 80%;
       height: 80%;
       border: 3px solid rgba(0, 0, 0, 0.2);
       background: transparent;
   }
   ```
5. Clean up highlights on move completion or deselection

**Benefits:**
- Easier for beginners to see legal moves
- Faster move selection in practice mode
- More polished, professional feel
- Matches familiar Chess.com UX

**Considerations:**
- Only enable in Build and Practice modes (not Explore)
- May need toggle option to disable for advanced users
- Could impact performance on slower devices (many DOM updates)

**Dependencies:**
- Already have Chess.js (legal move calculation)
- Already have jQuery (DOM manipulation)
- Already have chessboard.js with drag events

**Estimated Effort:** 2-3 hours (implementation + testing)

---

## Other Ideas

### Practice Mode Implementation
- Random position selection from loaded opening
- Move validation against opening tree
- Score tracking (correct/incorrect moves)
- Hint system
- Spaced repetition algorithm

### Mobile Support
- Touch-friendly controls
- Responsive layout for tablets/phones
- Gesture support for navigation

### Advanced Graph Features
- Minimap for large opening trees
- Search/filter nodes
- Collapse/expand branches
- Custom node colors/labels

### Export Enhancements
- Export to Lichess study format
- Export as images (board diagrams)
- Print-friendly view
- Share via URL

### Performance
- Lazy loading for large opening trees
- Virtual rendering for graph canvas
- Web Workers for heavy computations

---

*Add new feature ideas to this document as they come up. Mark completed features with ✅ and move details to docs/CHANGELOG.md*
