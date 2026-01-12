#!/usr/bin/env python3
"""
Generate optimal node positions for chess opening graph visualization.

This script parses a v2.0 chess openings file, builds a directed graph,
computes optimal node positions using various layout algorithms, and
exports the positions to a JSON file.

Usage:
    python generate_positions.py input.txt [--algorithm dot] [--output positions.json]
"""

import sys
import json
import re
import argparse
from collections import defaultdict

try:
    import networkx as nx
    import pygraphviz as pgv
except ImportError:
    print("Error: Required libraries not found.")
    print("Please install with: pip install networkx pygraphviz")
    print("Note: pygraphviz requires graphviz to be installed on your system:")
    print("  macOS: brew install graphviz")
    print("  Ubuntu/Debian: sudo apt-get install graphviz graphviz-dev")
    print("  Windows: Download from https://graphviz.org/download/")
    sys.exit(1)


def binary_to_state(binary_state):
    """Convert binary base64 state back to text format (matches browser's binaryToState)."""
    import base64

    if binary_state == 'start[w]':
        return 'start[w]'

    # Extract turn indicator
    if binary_state.endswith('[w]'):
        turn = 'w'
        base64_part = binary_state[:-3]
    elif binary_state.endswith('[b]'):
        turn = 'b'
        base64_part = binary_state[:-3]
    else:
        return binary_state  # Malformed, return as-is

    # Decode base64 to bytes
    try:
        binary_data = base64.b64decode(base64_part)
    except:
        return binary_state  # Decode failed, return as-is

    # Unpack bytes to squares (2 squares per byte)
    squares = []
    for byte in binary_data:
        high = (byte >> 4) & 0x0F
        low = byte & 0x0F
        squares.append(high)
        squares.append(low)

    # Convert squares to piece letters
    num_to_piece = {
        1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F',
        7: 'G', 8: 'H', 9: 'I', 10: 'J', 11: 'K', 12: 'L'
    }

    # Build output with run-length encoding for empty squares
    output = ''
    empty_count = 0

    for square in squares:
        if square == 0:
            empty_count += 1
        else:
            # Flush empty count
            while empty_count > 0:
                if empty_count >= 9:
                    output += '9'
                    empty_count -= 9
                else:
                    output += str(empty_count)
                    empty_count = 0
            # Add piece
            output += num_to_piece.get(square, '?')

    # Flush remaining empty count
    while empty_count > 0:
        if empty_count >= 9:
            output += '9'
            empty_count -= 9
        else:
            output += str(empty_count)
            empty_count = 0

    return output + '[' + turn + ']'


def parse_v2_file(filename):
    """Parse a v2.0 format chess openings file and extract transitions."""
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    if not lines or not lines[0].strip().startswith('v'):
        print(f"Error: Invalid file format. Expected version header.")
        sys.exit(1)

    version = lines[0].strip()
    if version != 'v2.0':
        print(f"Warning: File version is {version}, expected v2.0")

    edges = []
    states = set()

    for i, line in enumerate(lines[1:], start=2):
        line = line.strip()
        if not line:
            continue

        # Parse: "state1 -> state2" or "state1 -> state2: annotation"
        if '->' not in line:
            print(f"Warning: Skipping malformed line {i}: {line}")
            continue

        parts = line.split('->')
        if len(parts) != 2:
            print(f"Warning: Skipping malformed line {i}: {line}")
            continue

        from_state = parts[0].strip()
        right_side = parts[1]

        # Check for annotation (after colon)
        if ':' in right_side:
            colon_idx = right_side.index(':')
            to_state = right_side[:colon_idx].strip()
            annotation = right_side[colon_idx+1:].strip()
        else:
            to_state = right_side.strip()
            annotation = ''

        # Convert binary states to text format (matches what browser uses)
        from_state_text = binary_to_state(from_state)
        to_state_text = binary_to_state(to_state)

        states.add(from_state_text)
        states.add(to_state_text)
        edges.append((from_state_text, to_state_text, annotation))

    print(f"Parsed {len(states)} unique states and {len(edges)} transitions")
    return list(states), edges


def build_graph(states, edges):
    """Build a NetworkX directed graph from states and edges."""
    G = nx.DiGraph()

    # Add all nodes
    for state in states:
        G.add_node(state)

    # Add all edges
    for from_state, to_state, annotation in edges:
        G.add_edge(from_state, to_state, annotation=annotation)

    return G


def compute_layout(G, algorithm='dot'):
    """
    Compute node positions using graphviz layout algorithm.

    Available algorithms:
    - dot: hierarchical/layered (best for DAGs, minimizes crossings)
    - neato: spring model (force-directed)
    - fdp: force-directed with smart edge handling
    - sfdp: scalable force-directed (for large graphs)
    - twopi: radial layout
    - circo: circular layout
    """
    try:
        # Convert NetworkX graph to pygraphviz for better control
        A = pgv.AGraph(directed=True)

        # Set graph attributes for top-to-bottom layout
        A.graph_attr['rankdir'] = 'TB'  # Top to Bottom
        A.graph_attr['ranksep'] = '1.5'  # Vertical spacing between ranks
        A.graph_attr['nodesep'] = '0.8'  # Horizontal spacing between nodes at same rank
        A.node_attr['shape'] = 'circle'  # Circle nodes (matches browser visualization)
        A.node_attr['width'] = '0.3'  # Node width in inches
        A.node_attr['height'] = '0.3'  # Node height in inches
        A.node_attr['fixedsize'] = 'true'  # Keep nodes same size

        # Add nodes and edges
        for node in G.nodes():
            A.add_node(node, label='')  # Empty label to avoid size warnings
        for edge in G.edges():
            A.add_edge(edge[0], edge[1])

        # Compute layout
        A.layout(prog=algorithm)

        # Extract positions
        pos = {}
        for node in A.nodes():
            x, y = node.attr['pos'].split(',')
            pos[str(node)] = (float(x), float(y))

        print(f"Layout computed successfully using '{algorithm}' algorithm (TB orientation)")
        return pos
    except Exception as e:
        print(f"Error computing layout with {algorithm}: {e}")
        print("Trying fallback spring layout...")
        pos = nx.spring_layout(G, k=2, iterations=50)
        # Scale up the positions
        pos = {node: (x * 500 + 400, y * 500 + 300) for node, (x, y) in pos.items()}
        print("Fallback layout computed (spring_layout)")
        return pos


def export_positions(positions, output_file):
    """Export node positions to JSON file."""
    # Convert positions to serializable format
    json_positions = {
        node: {"x": float(x), "y": float(y)}
        for node, (x, y) in positions.items()
    }

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(json_positions, f, indent=2)

    print(f"Positions exported to {output_file}")


def main():
    parser = argparse.ArgumentParser(
        description='Generate optimal node positions for chess opening graphs'
    )
    parser.add_argument(
        'input',
        help='Input v2.0 chess openings file (.txt)'
    )
    parser.add_argument(
        '--algorithm', '-a',
        default='dot',
        choices=['dot', 'neato', 'fdp', 'sfdp', 'twopi', 'circo'],
        help='Graphviz layout algorithm (default: dot, best for hierarchical graphs)'
    )
    parser.add_argument(
        '--output', '-o',
        help='Output JSON file (default: input filename with -positions.json suffix)'
    )

    args = parser.parse_args()

    # Determine output filename
    if args.output:
        output_file = args.output
    else:
        # input.txt -> input-positions.json
        base = args.input.rsplit('.', 1)[0]
        output_file = f"{base}-positions.json"

    print(f"Input file: {args.input}")
    print(f"Algorithm: {args.algorithm}")
    print(f"Output file: {output_file}")
    print()

    # Parse input file
    states, edges = parse_v2_file(args.input)

    # Build graph
    G = build_graph(states, edges)

    # Compute layout
    positions = compute_layout(G, args.algorithm)

    # Export positions
    export_positions(positions, output_file)

    print()
    print("Done! To use these positions:")
    print(f"1. Place {output_file} in the same directory as chess-openings.html")
    print(f"2. Load {args.input} in the browser")
    print("3. The browser will automatically use the pre-computed positions")
    print()
    print("Tip: Try different algorithms if you see edge crossings:")
    for algo in ['dot', 'neato', 'fdp', 'sfdp']:
        print(f"  python generate_positions.py {args.input} --algorithm {algo}")


if __name__ == '__main__':
    main()
