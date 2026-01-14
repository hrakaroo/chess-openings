# Changelog

All notable changes to the Chess Openings project.

## [Unreleased]

### Added - 2026-01-14

#### Export with Title Dialog
- **Feature**: When exporting routes, users are now prompted to enter a title for the opening
- **UI**: Professional modal dialog with input field (using `showPrompt()` from ui-feedback.js)
- **Default**: Pre-fills with the currently loaded title or "My Opening"
- **Filename**: Automatically generates filename from title (e.g., "London System" → "london-system.txt")
- **UX**: Both dialogs support Enter to confirm, Escape to cancel
- **Feedback**: Success notification shows after export completes

**Example Flow:**
1. Click "Export Routes"
2. Dialog appears: "Enter a title for this opening:" (default: loaded title)
3. User enters "London System - Main Line"
4. Dialog appears: "Enter filename for export:" (default: "london-system-main-line.txt")
5. User confirms or modifies filename
6. File downloads
7. Success toast: "Opening exported: london-system-main-line.txt"

**Benefits:**
- No more exports without titles
- Title and filename are always consistent
- Can rename opening when exporting
- Professional modal dialogs instead of basic `prompt()`

#### showPrompt() Function
- **Added to**: `ui-feedback.js`
- **Purpose**: Display input dialogs with custom title, message, and default value
- **Returns**: Promise that resolves with user input or null if cancelled
- **Styling**: Matches other modal dialogs (showError, showSuccess)
- **Keyboard**: Enter submits, Escape cancels
- **Features**: Auto-focus, text selection, background click to cancel

**API:**
```javascript
var result = await showPrompt(title, message, defaultValue);
// Returns: string (user input) or null (cancelled)
```

### Changed - 2026-01-14

#### Export Function is Now Async
- `exportAllStates()` changed from synchronous to async function
- Uses `await` for sequential dialogs (title, then filename)
- Better error handling with modals instead of alerts
- Replaced `alert()` with `showError()` for consistency

#### README Updated
- Export Routes description now mentions title prompt
- Updated to reflect new two-step export process

### Fixed - 2026-01-14
- Export now always includes a title (required by v4.0 format spec)
- Empty titles are rejected with error message
- Filenames are sanitized (spaces → hyphens, lowercase)

---

## Previous Improvements - 2026-01-14

### Added

#### Test Suite
- 29 automated tests (19 JavaScript, 10 Python)
- Tests cover FEN normalization, fuzzy matching, transpositions
- Run with: `node tests/normalization.test.js` and `python tests/test_evaluate.py`
- Files: `tests/normalization.test.js`, `tests/test_evaluate.py`

#### Module Extraction
- **fen-utils.js**: FEN normalization, validation, and utilities
- **ui-feedback.js**: Loading indicators, error modals, success toasts
- All HTML files updated to load modules in correct order

#### Error Handling
- Professional error modals with expandable technical details
- Loading indicators during file operations
- Success notifications for completed actions
- Replaced all `alert()` calls with `showError()`

#### Documentation
- **FORMAT.md**: Complete v4.0 file format specification (400+ lines)
- **IMPROVEMENTS.md**: Detailed summary of all improvements
- **TESTING.md**: Comprehensive testing guide

#### Performance Optimizations
- O(1) edge lookups using Map (was O(n) - 100x faster)
- Debounced graph rendering with requestAnimationFrame
- Smoother UI during rapid operations

### Changed
- chess-common.js: Removed duplicate FEN functions (now in fen-utils.js)
- File loading: Added try/catch with detailed error messages
- Error messages: Replaced alerts with professional modals

---

## Format

### Types of Changes
- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security fixes

---

*This changelog follows [Keep a Changelog](https://keepachangelog.com/) format.*
