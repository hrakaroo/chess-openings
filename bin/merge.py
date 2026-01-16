#!/usr/bin/env python3
"""
Merge multiple chess opening files into a single file.

This script merges multiple v4.0 format chess opening files, combining:
- Transitions (keeping unique transitions only)
- Annotations (merging annotations for duplicate transitions)
- Titles (combining all file titles)

Position coordinates and evaluations are removed from the output.
"""

import argparse
import sys
from collections import defaultdict


def parse_opening_file(filename):
    """
    Parse a v4.0 format opening file.

    Returns:
        tuple: (title, transitions_dict)
        where transitions_dict maps (from_state, move) -> annotation
    """
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    if not lines:
        print(f"Warning: {filename} is empty", file=sys.stderr)
        return None, {}

    # Check version
    version_line = lines[0].strip()
    if not version_line.startswith('v4.'):
        print(f"Warning: {filename} has unsupported version: {version_line}", file=sys.stderr)
        return None, {}

    # Extract title
    title = None
    if len(lines) > 1 and lines[1].strip().startswith('='):
        title = lines[1].strip()[1:].strip()

    # Parse transitions and annotations
    transitions = {}  # (from_state, move) -> annotation
    current_annotation = []

    for i in range(2, len(lines)):
        line = lines[i].strip()

        if not line:
            continue

        # Skip position definitions (contain ':' but not '->')
        if ':' in line and '->' not in line:
            continue

        # Annotation line
        if line.startswith('#'):
            annotation_text = line[1:].strip()
            if annotation_text:
                current_annotation.append(annotation_text)

        # Transition line
        elif '->' in line:
            parts = line.split('->', 1)
            if len(parts) == 2:
                from_state = parts[0].strip()
                move = parts[1].strip()

                # Merge annotation lines with spaces
                annotation = ' '.join(current_annotation) if current_annotation else ''

                key = (from_state, move)
                transitions[key] = annotation

                # Reset annotation buffer
                current_annotation = []

    return title, transitions


def merge_transitions(all_transitions_list):
    """
    Merge transitions from multiple files.

    Args:
        all_transitions_list: List of transitions dicts from different files

    Returns:
        dict: Merged transitions with combined annotations
    """
    merged = {}

    for transitions in all_transitions_list:
        for key, annotation in transitions.items():
            if key in merged:
                # Transition already exists - merge annotations
                existing_annotation = merged[key]

                # Combine annotations if both exist and are different
                if annotation and existing_annotation:
                    if annotation not in existing_annotation:
                        merged[key] = existing_annotation + ' | ' + annotation
                elif annotation:
                    # Only new annotation exists
                    merged[key] = annotation
                # else: keep existing annotation
            else:
                # New transition
                merged[key] = annotation

    return merged


def write_merged_file(output_filename, merged_title, merged_transitions):
    """
    Write merged opening file in v4.0 format.

    Args:
        output_filename: Output file path
        merged_title: Combined title string
        merged_transitions: Dict of (from_state, move) -> annotation
    """
    with open(output_filename, 'w', encoding='utf-8') as f:
        # Write version
        f.write('v4.0\n')

        # Write title
        f.write(f'= {merged_title}\n')

        # Sort transitions for consistent output
        # Group by from_state, then sort by move
        by_state = defaultdict(list)
        for (from_state, move), annotation in merged_transitions.items():
            by_state[from_state].append((move, annotation))

        # Sort states (put 'start' first)
        sorted_states = sorted(by_state.keys(), key=lambda s: (s != 'start', s))

        # Write transitions
        for from_state in sorted_states:
            moves = sorted(by_state[from_state], key=lambda x: x[0])

            for move, annotation in moves:
                # Write annotation if present
                if annotation:
                    f.write(f'# {annotation}\n')

                # Write transition
                f.write(f'{from_state} -> {move}\n')


def main():
    parser = argparse.ArgumentParser(
        description='Merge multiple chess opening files into a single file.',
        epilog='Example: python merge.py london1.txt london2.txt --output merged.txt'
    )

    parser.add_argument(
        'files',
        nargs='+',
        help='Input opening files to merge (v4.0 format)'
    )

    parser.add_argument(
        '--output', '-o',
        required=True,
        help='Output filename for merged result'
    )

    args = parser.parse_args()

    if len(args.files) < 2:
        print("Error: At least 2 files are required for merging", file=sys.stderr)
        sys.exit(1)

    print(f"Merging {len(args.files)} files...")

    # Parse all input files
    titles = []
    all_transitions = []

    for filename in args.files:
        print(f"  Reading: {filename}")
        title, transitions = parse_opening_file(filename)

        if title:
            titles.append(title)

        if transitions:
            all_transitions.append(transitions)
            print(f"    Found {len(transitions)} unique transitions")

    if not all_transitions:
        print("Error: No valid transitions found in any file", file=sys.stderr)
        sys.exit(1)

    # Merge titles
    if titles:
        merged_title = ' + '.join(titles)
    else:
        merged_title = 'Merged Opening'

    print(f"\nMerged title: {merged_title}")

    # Merge transitions
    merged_transitions = merge_transitions(all_transitions)
    print(f"Total unique transitions: {len(merged_transitions)}")

    # Write output
    write_merged_file(args.output, merged_title, merged_transitions)
    print(f"\nMerged file written to: {args.output}")


if __name__ == '__main__':
    main()
