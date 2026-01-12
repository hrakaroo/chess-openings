#!/usr/bin/env python3
"""
Generate optimal node positions and evaluations for chess opening graphs.

This script parses a v2.0 chess openings file with text-encoded states,
builds a directed graph, computes optimal node positions using various
layout algorithms, evaluates leaf positions with Stockfish, and embeds
everything back into the file.

Usage:
    python evaluate.py input.txt [--algorithm dot] [--output output.txt]
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

try:
    import chess
    import chess.engine
    STOCKFISH_AVAILABLE = True
except ImportError:
    print("Warning: python-chess not found. Position evaluation will be skipped.")
    print("To enable evaluation: pip install chess")
    STOCKFISH_AVAILABLE = False


def state_to_fen(state):
    """Convert state string to FEN notation."""
    if state == 'start[w]':
        return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

    # Extract encoding and turn
    bracket_index = state.index('[')
    encoding = state[:bracket_index]
    turn = state[bracket_index+1]  # 'w' or 'b'

    # Piece mapping
    piece_map = {
        'A': 'P', 'B': 'N', 'C': 'B', 'D': 'R', 'E': 'Q', 'F': 'K',
        'G': 'p', 'H': 'n', 'I': 'b', 'J': 'r', 'K': 'q', 'L': 'k'
    }

    # Decode to 64 squares
    squares = []
    i = 0
    while i < len(encoding):
        char = encoding[i]
        if char.isdigit():
            # Empty squares
            count = int(char)
            squares.extend([None] * count)
        else:
            # Piece
            squares.append(piece_map.get(char, '?'))
        i += 1

    # Build FEN board string (rank 8 to rank 1)
    fen_parts = []
    for rank in range(8):
        rank_str = ''
        empty_count = 0

        for file in range(8):
            square_index = rank * 8 + file
            piece = squares[square_index] if square_index < len(squares) else None

            if piece is None:
                empty_count += 1
            else:
                if empty_count > 0:
                    rank_str += str(empty_count)
                    empty_count = 0
                rank_str += piece

        if empty_count > 0:
            rank_str += str(empty_count)

        fen_parts.append(rank_str)

    fen_board = '/'.join(fen_parts)
    fen_turn = 'w' if turn == 'w' else 'b'

    # Simplified FEN (no castling, en passant tracking)
    return f"{fen_board} {fen_turn} - - 0 1"


def find_leaf_nodes(edges):
    """Find nodes that have no outgoing edges (leaf nodes)."""
    # Build set of nodes that have outgoing edges
    nodes_with_children = set()
    all_nodes = set()

    for from_state, to_state, _ in edges:
        nodes_with_children.add(from_state)
        all_nodes.add(from_state)
        all_nodes.add(to_state)

    # Leaf nodes are those that appear as 'to' but never as 'from'
    # Or appear as 'from' but have no children
    leaf_nodes = all_nodes - nodes_with_children

    return list(leaf_nodes)


def evaluate_positions(leaf_nodes, stockfish_path=None):
    """Evaluate leaf node positions using Stockfish."""
    if not STOCKFISH_AVAILABLE:
        print("Skipping evaluation: python-chess not installed")
        return {}

    # Try to find Stockfish
    if stockfish_path is None:
        # Common Stockfish locations
        possible_paths = [
            '/usr/local/bin/stockfish',
            '/usr/bin/stockfish',
            '/opt/homebrew/bin/stockfish',
            'stockfish',  # In PATH
            '/usr/games/stockfish'
        ]

        for path in possible_paths:
            try:
                # Test if this path works
                engine = chess.engine.SimpleEngine.popen_uci(path)
                engine.quit()
                stockfish_path = path
                break
            except:
                continue

        if stockfish_path is None:
            print("Warning: Stockfish not found. Skipping position evaluation.")
            print("To enable evaluation:")
            print("  macOS: brew install stockfish")
            print("  Ubuntu/Debian: sudo apt-get install stockfish")
            print("  Or specify path with --stockfish-path")
            return {}

    print(f"Using Stockfish at: {stockfish_path}")
    print(f"Evaluating {len(leaf_nodes)} leaf positions...")

    evaluations = {}

    try:
        engine = chess.engine.SimpleEngine.popen_uci(stockfish_path)

        for i, state in enumerate(leaf_nodes, 1):
            try:
                fen = state_to_fen(state)
                board = chess.Board(fen)

                # Analyze position (depth 15 is reasonable for openings)
                info = engine.analyse(board, chess.engine.Limit(depth=15))

                # Get score from White's perspective
                score = info['score'].white()

                # Format as "white +X.XX" or "black +X.XX"
                if score.is_mate():
                    # Mate score
                    mate_in = score.mate()
                    if mate_in > 0:
                        eval_str = f"white M{mate_in}"
                    else:
                        eval_str = f"black M{abs(mate_in)}"
                else:
                    # Centipawn score - convert to pawns
                    cp = score.score()
                    eval_pawns = abs(cp / 100.0)

                    if cp >= 0:
                        eval_str = f"white +{eval_pawns:.2f}"
                    else:
                        eval_str = f"black +{eval_pawns:.2f}"

                evaluations[state] = eval_str

                if i % 10 == 0:
                    print(f"  Evaluated {i}/{len(leaf_nodes)} positions...")

            except Exception as e:
                print(f"  Warning: Could not evaluate position {state[:20]}...: {e}")
                continue

        engine.quit()
        print(f"Evaluation complete: {len(evaluations)} positions evaluated")

    except Exception as e:
        print(f"Error initializing Stockfish: {e}")
        return {}

    return evaluations


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

        # Skip position definition lines (state : x, y) or (state : x, y, eval)
        # We only need transitions for rebuilding the graph
        if '->' not in line:
            # Position definitions have format: "state : x, y" or "state : x, y, eval"
            if ':' in line and '[' in line and ']' in line:
                # This looks like a position definition, skip silently
                continue
            else:
                # This is actually malformed
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

        # States are already in text format (run-length encoded)
        states.add(from_state)
        states.add(to_state)
        edges.append((from_state, to_state, annotation))

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


def update_file_with_positions(input_file, positions, evaluations, output_file):
    """Update the input file with position definitions and evaluations."""
    # Read original file
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    if not lines or not lines[0].strip().startswith('v'):
        print(f"Error: Invalid file format. Expected version header.")
        sys.exit(1)

    version = lines[0].strip()

    # Find max Y to flip the coordinate system
    # Graphviz: Y increases upward (math coordinates)
    # Browser canvas: Y increases downward (screen coordinates)
    y_values = [y for x, y in positions.values()]
    max_y = max(y_values)

    # Separate transitions from old position definitions
    transitions = []
    for i, line in enumerate(lines[1:], start=2):
        line_stripped = line.strip()
        if not line_stripped:
            continue

        # Check if this is a transition (contains ->)
        if '->' in line_stripped:
            transitions.append(line_stripped)

    # Build new position definitions
    position_lines = []
    for state, (x, y) in positions.items():
        # Flip Y coordinate for canvas
        flipped_y = max_y - y

        # Add evaluation if available
        if state in evaluations:
            position_lines.append(f"{state} : {x}, {flipped_y}, {evaluations[state]}")
        else:
            position_lines.append(f"{state} : {x}, {flipped_y}")

    # Write updated file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(version + '\n')
        # Write positions first
        for pos_line in position_lines:
            f.write(pos_line + '\n')
        # Write transitions
        for trans_line in transitions:
            f.write(trans_line + '\n')

    print(f"File updated with {len(position_lines)} positions (Y-axis flipped for canvas)")
    if evaluations:
        print(f"  Including {len(evaluations)} position evaluations")
    print(f"Output written to: {output_file}")


def main():
    parser = argparse.ArgumentParser(
        description='Generate optimal node positions for chess opening graphs and update the file'
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
        help='Output file (default: overwrites input file)'
    )
    parser.add_argument(
        '--in-place', '-i',
        action='store_true',
        help='Modify the input file in place (default behavior)'
    )
    parser.add_argument(
        '--stockfish-path',
        help='Path to Stockfish executable (default: auto-detect)'
    )
    parser.add_argument(
        '--no-eval',
        action='store_true',
        help='Skip position evaluation with Stockfish'
    )

    args = parser.parse_args()

    # Determine output filename
    if args.output:
        output_file = args.output
    else:
        # Default: overwrite input file
        output_file = args.input

    print(f"Input file: {args.input}")
    print(f"Algorithm: {args.algorithm}")
    print(f"Output file: {output_file}")
    if output_file == args.input:
        print("(Will modify input file in place)")
    print()

    # Parse input file
    states, edges = parse_v2_file(args.input)

    # Build graph
    G = build_graph(states, edges)

    # Compute layout
    positions = compute_layout(G, args.algorithm)

    # Evaluate leaf positions if requested
    evaluations = {}
    if not args.no_eval:
        print()
        leaf_nodes = find_leaf_nodes(edges)
        if len(leaf_nodes) > 0:
            evaluations = evaluate_positions(leaf_nodes, args.stockfish_path)
        else:
            print("No leaf nodes found (all positions have continuations)")
    else:
        print("Skipping position evaluation (--no-eval flag set)")

    # Update file with positions and evaluations
    update_file_with_positions(args.input, positions, evaluations, output_file)

    print()
    print("Done! To use these positions:")
    print(f"1. Load {output_file} in the browser (View or Edit mode)")
    print("2. The file now contains routes, positions, and evaluations (if available)")
    print()
    print("Tip: Try different algorithms if you see edge crossings:")
    for algo in ['dot', 'neato', 'fdp', 'sfdp']:
        print(f"  python evaluate.py {args.input} --algorithm {algo}")
    print()
    print("Options:")
    print(f"  --no-eval              Skip Stockfish evaluation")
    print(f"  --stockfish-path PATH  Specify Stockfish location")


if __name__ == '__main__':
    main()
