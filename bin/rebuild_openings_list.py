#!/usr/bin/env python3
"""
Rebuild the openings dropdown list for the HTML files.

This script scans the openings/ directory, extracts titles from each v4.0 file,
and generates the HTML <option> elements for the dropdown selector.

Usage:
    python bin/rebuild_openings_list.py
    python bin/rebuild_openings_list.py --update-html
"""

import os
import sys
import argparse
from pathlib import Path


def parse_title_from_file(filepath):
    """
    Parse the title from a v4.0 format opening file.

    Returns:
        str: The title (text after '=' on line 2), or None if not found
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        if len(lines) < 2:
            return None

        # Check version
        if not lines[0].strip().startswith('v4.'):
            return None

        # Extract title from line 2
        if lines[1].strip().startswith('='):
            title = lines[1].strip()[1:].strip()
            return title if title else None

        return None
    except Exception as e:
        print(f"Warning: Error reading {filepath}: {e}", file=sys.stderr)
        return None


def scan_openings_directory(openings_dir='openings'):
    """
    Scan the openings directory and extract titles from all .txt files.

    Returns:
        list: List of tuples (filepath, title)

    Raises:
        ValueError: If duplicate titles are found
    """
    openings_path = Path(openings_dir)

    if not openings_path.exists():
        print(f"Error: Directory '{openings_dir}' does not exist", file=sys.stderr)
        sys.exit(1)

    if not openings_path.is_dir():
        print(f"Error: '{openings_dir}' is not a directory", file=sys.stderr)
        sys.exit(1)

    # Find all .txt files
    txt_files = sorted(openings_path.glob('*.txt'))

    if not txt_files:
        print(f"Warning: No .txt files found in '{openings_dir}'", file=sys.stderr)
        return []

    openings = []
    title_to_file = {}

    for filepath in txt_files:
        title = parse_title_from_file(filepath)

        if title is None:
            print(f"Warning: Skipping {filepath.name} - no valid title found", file=sys.stderr)
            continue

        # Check for duplicate titles
        if title in title_to_file:
            print(f"Error: Duplicate title '{title}' found in:", file=sys.stderr)
            print(f"  - {title_to_file[title]}", file=sys.stderr)
            print(f"  - {filepath}", file=sys.stderr)
            sys.exit(1)

        title_to_file[title] = filepath

        # Store as relative path from project root
        relative_path = f"openings/{filepath.name}"
        openings.append((relative_path, title))

    return openings


def generate_html_options(openings):
    """
    Generate HTML <option> elements for the dropdown.

    Args:
        openings: List of tuples (filepath, title)

    Returns:
        str: HTML options as a string
    """
    if not openings:
        return '                                <option value="">-- No Openings Available --</option>'

    lines = ['                                <option value="">-- Select Opening --</option>']

    for filepath, title in openings:
        lines.append(f'                                <option value="{filepath}">{title}</option>')

    return '\n'.join(lines)


def update_html_file(html_file, new_options):
    """
    Update the dropdown options in an HTML file.

    Args:
        html_file: Path to HTML file
        new_options: New HTML options string

    Returns:
        bool: True if file was updated, False otherwise
    """
    try:
        with open(html_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Find the select element for preloadedSelect
        start_marker = '<select id="preloadedSelect"'
        end_marker = '</select>'

        start_idx = content.find(start_marker)
        if start_idx == -1:
            print(f"Warning: Could not find dropdown in {html_file}", file=sys.stderr)
            return False

        # Find the end of the opening <select> tag
        select_close = content.find('>', start_idx)
        if select_close == -1:
            return False

        # Find the closing </select>
        end_idx = content.find(end_marker, select_close)
        if end_idx == -1:
            return False

        # Replace the options
        new_content = (
            content[:select_close + 1] + '\n' +
            new_options + '\n' +
            '                            ' + content[end_idx:]
        )

        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(new_content)

        print(f"Updated: {html_file}")
        return True

    except Exception as e:
        print(f"Error updating {html_file}: {e}", file=sys.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(
        description='Rebuild openings dropdown list for HTML files',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Print HTML options to stdout
  python bin/rebuild_openings_list.py

  # Update HTML files in place
  python bin/rebuild_openings_list.py --update-html
        """
    )

    parser.add_argument(
        '--update-html',
        action='store_true',
        help='Update HTML files in place (explore.html and practice.html)'
    )

    parser.add_argument(
        '--openings-dir',
        default='openings',
        help='Directory containing opening files (default: openings)'
    )

    args = parser.parse_args()

    # Scan openings directory
    print(f"Scanning {args.openings_dir}/ directory...", file=sys.stderr)
    openings = scan_openings_directory(args.openings_dir)

    if not openings:
        print("No valid opening files found.", file=sys.stderr)
        sys.exit(1)

    print(f"Found {len(openings)} opening(s):", file=sys.stderr)
    for filepath, title in openings:
        print(f"  - {title} ({filepath})", file=sys.stderr)
    print(file=sys.stderr)

    # Generate HTML options
    html_options = generate_html_options(openings)

    if args.update_html:
        # Update HTML files
        print("Updating HTML files...", file=sys.stderr)
        success = True

        for html_file in ['explore.html', 'practice.html']:
            if os.path.exists(html_file):
                if not update_html_file(html_file, html_options):
                    success = False
            else:
                print(f"Warning: {html_file} not found", file=sys.stderr)

        if success:
            print("\nSuccess! HTML files updated.", file=sys.stderr)
        else:
            print("\nWarning: Some files could not be updated.", file=sys.stderr)
            sys.exit(1)
    else:
        # Print to stdout
        print("HTML Options (copy these into explore.html and practice.html):")
        print()
        print(html_options)
        print()
        print("To automatically update HTML files, run:")
        print("  python bin/rebuild_openings_list.py --update-html")


if __name__ == '__main__':
    main()
