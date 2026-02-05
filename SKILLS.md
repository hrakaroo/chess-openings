# Chess Openings Project - Custom Skills

## /test
Run all automated tests for the project.

**Tasks:**
- Run JavaScript normalization tests: `node tests/normalization.test.js`
- Run Python evaluation tests: `python tests/test_evaluate.py`
- Report test results and any failures
- If tests fail, offer to help debug

## /commit
Create a git commit following project conventions.

**Tasks:**
- Run `git status` to see changes
- Run `git diff` to review the changes
- Review recent commits with `git log -5 --oneline` to follow commit style
- Draft a clear, concise commit message
- Stage relevant files with `git add`
- Create commit with: `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>`
- Do NOT push unless explicitly requested

## /evaluate <filename>
Run Stockfish evaluation and graph layout optimization on an opening file.

**Tasks:**
- Verify the opening file exists in `openings/` directory
- Run: `python bin/evaluate.py openings/<filename>`
- Show the output and any warnings
- Explain what was optimized (positions, evaluations)

## /merge <file1> <file2> [output]
Merge multiple opening files into one.

**Tasks:**
- Verify input files exist
- If output filename not provided, ask user for one
- Run: `python bin/merge.py openings/<file1> openings/<file2> --output openings/<output>`
- Confirm the merge completed successfully
- Show statistics (number of positions, transitions merged)

## /rebuild
Rebuild the dropdown opening lists in explore.html and practice.html.

**Tasks:**
- Run: `python bin/rebuild_openings_list.py --update-html`
- Verify the script completed successfully
- Show which files were updated
- Report any duplicate titles found

## /pr
Create a pull request for current changes.

**Tasks:**
- Run `git status` and `git diff` to review changes
- Check current branch name
- If on main, ask user to create a feature branch first
- Push current branch to remote with `-u` flag
- Generate PR title and description based on commits
- Create PR using: `gh pr create --title "..." --body "..."`
- Include testing checklist in PR body
- Return the PR URL

## /docs
Update all documentation to reflect recent changes.

**Tasks:**
- Review changes with `git status` and `git diff`
- Update README.md if features changed
- Update CLAUDE.md if architecture changed
- Add entry to docs/CHANGELOG.md with today's date
- Ensure all docs are consistent
- Do NOT commit - just update the files

## /validate <filename>
Validate an opening file format and check for issues.

**Tasks:**
- Read the opening file from `openings/<filename>`
- Check v4.0 format compliance
- Verify all FEN strings are valid
- Check for missing moves or annotations
- Verify no duplicate transitions
- Report any issues found

## /analyze
Analyze the current codebase for potential improvements.

**Tasks:**
- Review recent changes with `git diff`
- Check for TODO comments in code
- Look for potential bugs or code smells
- Suggest refactoring opportunities
- Check for unused functions or variables
- Report findings with file:line references
