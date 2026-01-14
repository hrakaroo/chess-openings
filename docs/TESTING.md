# Testing Guide

This document explains how to test the improvements made to the Chess Openings tool.

## Automated Tests

### JavaScript Tests

**Run normalization tests:**
```bash
node tests/normalization.test.js
```

**Expected output:**
```
Running normalization tests...

Test Group: normalizeFEN - En Passant Clearing
✓ Should clear en passant square d3
✓ Should clear en passant square d6
...

==================================================
Tests passed: 19
Tests failed: 0
Total tests: 19
==================================================
✓ All tests passed!
```

### Python Tests

**Run evaluate.py tests:**
```bash
python tests/test_evaluate.py
```

Or with pytest:
```bash
python -m pytest tests/test_evaluate.py -v
```

**Expected output:**
```
Running evaluate.py tests...

✓ test_normalize_fen_clears_en_passant
✓ test_normalize_fen_resets_move_counters
...

==================================================
Tests passed: 10
Tests failed: 0
Total tests: 10
==================================================
✓ All tests passed!
```

---

## Manual Testing

### 1. Test Error Handling

#### Test 1.1: Empty File
1. Create an empty text file: `touch empty.txt`
2. Open `edit.html` in browser
3. Click "Load Routes" and select `empty.txt`
4. **Expected:** Error modal appears with title "Empty File"
5. Modal should have "Close" button and detailed error message

#### Test 1.2: Invalid Version
1. Create file with content:
   ```
   v3.0
   = Test
   ```
2. Load in browser
3. **Expected:** Error modal "Unsupported Version"
4. Should mention expected v4.0, got v3.0

#### Test 1.3: Missing Title
1. Create file with content:
   ```
   v4.0
   start -> d4
   ```
2. Load in browser
3. **Expected:** Error modal "Invalid File Format"
4. Should mention missing title line

### 2. Test Loading Indicators

#### Test 2.1: File Loading
1. Open `edit.html`
2. Click "Load Routes" and select a large file (e.g., `Openings/London 1-7.txt`)
3. **Expected:**
   - Loading spinner appears immediately
   - Message shows "Loading opening file: London 1-7.txt"
   - Overlay blocks interaction
   - Loading disappears after file loads
   - Success toast appears bottom-right: "Loaded: London 1-7.txt"

#### Test 2.2: Success Notification
1. Successfully load a file
2. **Expected:**
   - Green toast notification appears bottom-right
   - Message: "Loaded: [filename]"
   - Automatically disappears after 3 seconds
   - Smooth slide-in animation

### 3. Test Module Separation

#### Test 3.1: FEN Utils Module
1. Open browser dev console (F12)
2. Open `edit.html`
3. In console, type: `normalizeFEN('rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 5 10')`
4. **Expected:** Returns `'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1'`

#### Test 3.2: UI Feedback Module
1. In console, type: `showError('Test', 'This is a test error', 'Stack trace here')`
2. **Expected:** Error modal appears with expandable "Technical Details"

#### Test 3.3: Module Loading Order
1. View page source of `edit.html`
2. **Expected:** Scripts loaded in order:
   ```html
   <script src="fen-utils.js"></script>
   <script src="ui-feedback.js"></script>
   <script src="chess-common.js"></script>
   ```

### 4. Test Performance Improvements

#### Test 4.1: Large Graph Performance
1. Create a file with 500+ moves (or use a large opening file)
2. Load in `edit.html`
3. Make several rapid moves
4. **Expected:**
   - Graph updates smoothly
   - No lag or stuttering
   - Browser remains responsive

#### Test 4.2: Edge Lookup Speed
1. Open browser dev console
2. Load a large file with many variations
3. In console, run:
   ```javascript
   console.time('addEdge');
   for (var i = 0; i < 100; i++) {
       addEdgeToGraph('start', boardToFEN(), '', true);
   }
   console.timeEnd('addEdge');
   ```
4. **Expected:** Should complete in < 10ms

### 5. Test Backward Compatibility

#### Test 5.1: Old File Format Support
1. Create a file with old format (full FEN in transitions):
   ```
   v4.0
   = Test
   start -> rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1
   ```
2. Load in browser
3. **Expected:** File loads successfully, graph displays correctly

#### Test 5.2: Mixed Format Support
1. Create file with both old and new format transitions
2. **Expected:** Both formats work together

### 6. Test Documentation

#### Test 6.1: Format Documentation
1. Open `FORMAT.md`
2. Verify it contains:
   - Complete v4.0 specification
   - FEN field descriptions
   - SAN examples
   - Validation rules
   - Complete examples

#### Test 6.2: Improvements Documentation
1. Open `IMPROVEMENTS.md`
2. Verify it contains:
   - Summary of all changes
   - Before/after comparisons
   - Performance benchmarks
   - Testing instructions

---

## Integration Tests

### Test Scenario 1: Complete Workflow
1. Open `edit.html`
2. Make moves: d4, d5, Bf4, Nf6
3. Add annotation to Bf4: "London System"
4. Click "Export Routes"
5. Save as `test-export.txt`
6. Close browser
7. Re-open `edit.html`
8. Load `test-export.txt`
9. **Expected:**
   - All moves present
   - Annotation visible on hover
   - Graph structure correct
   - Success notification appears

### Test Scenario 2: Error Recovery
1. Open `edit.html`
2. Try to load invalid file
3. See error modal
4. Click "Close" on modal
5. Load valid file
6. **Expected:**
   - Can recover from error
   - Valid file loads correctly
   - No lingering error state

### Test Scenario 3: Performance Under Load
1. Load `Openings/London 1-7.txt` (largest file)
2. Click through multiple nodes rapidly
3. Make several new moves
4. Export and re-import
5. **Expected:**
   - Smooth throughout
   - No crashes or freezes
   - File imports correctly

---

## Browser Compatibility Testing

Test in multiple browsers:

### Chrome/Edge (Chromium)
- [ ] All features work
- [ ] Loading indicators display correctly
- [ ] Error modals look good
- [ ] Animations smooth

### Firefox
- [ ] All features work
- [ ] requestAnimationFrame works
- [ ] Modals centered correctly

### Safari
- [ ] All features work
- [ ] File input works
- [ ] Animations smooth

---

## Regression Testing

After any code changes, verify:

1. **Tests still pass:**
   ```bash
   node tests/normalization.test.js
   python tests/test_evaluate.py
   ```

2. **Core functionality works:**
   - [ ] Can load files
   - [ ] Can make moves
   - [ ] Can export files
   - [ ] Graph displays correctly

3. **New features intact:**
   - [ ] Error modals appear for invalid files
   - [ ] Loading indicators show during file load
   - [ ] Success notifications appear
   - [ ] Performance still good

---

## Performance Benchmarking

### Benchmark Edge Lookups

```javascript
// In browser console after loading a file
console.time('1000 edge lookups');
for (var i = 0; i < 1000; i++) {
    var key = '0-1';  // Edge from node 0 to node 1
    var result = edgeMap.get(key);
}
console.timeEnd('1000 edge lookups');
// Expected: < 1ms
```

### Benchmark Graph Drawing

```javascript
// In browser console
console.time('drawGraph');
drawGraph();
console.timeEnd('drawGraph');
// Expected: < 50ms for graphs with < 500 nodes
```

---

## Troubleshooting

### Tests Fail
- **Check Node.js version:** Requires Node.js 12+
- **Check Python version:** Requires Python 3.6+
- **Check dependencies:** `python-chess` installed

### Loading Indicator Doesn't Appear
- **Check console for errors**
- **Verify ui-feedback.js is loaded:** `typeof showLoading === 'function'`
- **Check CSS animations supported:** Modern browser required

### Error Modals Don't Show
- **Check console for errors**
- **Verify ui-feedback.js loaded before chess-common.js**
- **Check JavaScript enabled**

### Performance Still Slow
- **Check edgeMap is being used:** `console.log(edgeMap.size)` after loading
- **Check graph size:** Large graphs (1000+ nodes) may still be slow
- **Profile with Chrome DevTools:** Look for bottlenecks

---

## Coverage Report

Current test coverage (approximate):

| Module | Coverage | Tests |
|--------|----------|-------|
| fen-utils.js | 90% | 19 tests |
| evaluate.py (normalize) | 85% | 10 tests |
| chess-common.js | 20% | 0 tests |
| ui-feedback.js | 0% | 0 tests |

**Overall:** ~30% of codebase tested

**Next priorities for testing:**
1. Graph operations (addEdgeToGraph, etc.)
2. File export/import
3. UI feedback functions
4. Canvas drawing

---

## Continuous Testing

### Pre-commit Checklist
- [ ] Run `node tests/normalization.test.js`
- [ ] Run `python tests/test_evaluate.py`
- [ ] Test file loading in browser
- [ ] Check console for errors
- [ ] Verify export/import works

### Pre-release Checklist
- [ ] All automated tests pass
- [ ] All manual tests pass
- [ ] Test in multiple browsers
- [ ] Test with large files
- [ ] Verify backward compatibility
- [ ] Check documentation up to date

---

*Last updated: 2026-01-14*
*Test suite version: 1.0*
