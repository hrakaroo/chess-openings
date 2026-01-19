#!/usr/bin/env python3
"""
Generate optimal node positions and evaluations for chess opening graphs.

This script parses a v4.0 chess openings file with FEN-encoded states,
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
except ImportError as e:
    print("Error: NetworkX is required.")
    if "numpy" in str(e).lower():
        print("Please install with: pip install numpy networkx")
        print("(NetworkX requires numpy)")
    else:
        print("Please install with: pip install networkx")
    sys.exit(1)

# Try to import graphviz libraries (optional, for better layouts)
PYGRAPHVIZ_AVAILABLE = False
PYDOT_AVAILABLE = False

try:
    import pygraphviz as pgv
    PYGRAPHVIZ_AVAILABLE = True
    LAYOUT_BACKEND = "pygraphviz"
except ImportError:
    try:
        import pydot
        from networkx.drawing.nx_pydot import graphviz_layout
        PYDOT_AVAILABLE = True
        LAYOUT_BACKEND = "pydot"
    except ImportError:
        LAYOUT_BACKEND = "networkx"

if LAYOUT_BACKEND == "networkx":
    print("Note: Using NetworkX built-in layouts (pygraphviz not found)")
    print("For optimal layouts, install pygraphviz - see INSTALL_PYGRAPHVIZ.md")
elif LAYOUT_BACKEND == "pydot":
    print("Warning: Using pydot for graph layouts")
    print("Note: pydot layouts may not be optimal. Consider installing pygraphviz instead.")
    print("See INSTALL_PYGRAPHVIZ.md for installation instructions.")
else:
    print("Using pygraphviz for graph layouts (optimal)")

# chess library is required for parsing move notation
try:
    import chess
except ImportError:
    print("Error: python-chess is required.")
    print("Please install with: pip install chess")
    sys.exit(1)

# chess.engine is optional (only needed for Stockfish evaluation)
try:
    import chess.engine
    STOCKFISH_AVAILABLE = True
except ImportError:
    print("Warning: python-chess engine module not found. Position evaluation will be skipped.")
    print("To enable evaluation: pip install chess")
    STOCKFISH_AVAILABLE = False


def normalize_fen(fen):
    """Normalize FEN by clearing en passant and setting move counters to '- 0 1'."""
    if fen == 'start':
        return 'start'
    parts = fen.split(' ')
    if len(parts) == 6:
        parts[3] = '-'  # en passant (ephemeral, only valid for one move)
        parts[4] = '0'  # halfmove clock
        parts[5] = '1'  # fullmove number (must be at least 1)
        return ' '.join(parts)
    return fen


def state_to_fen(state):
    """Convert state string to FEN notation."""
    if state == 'start':
        return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    # In v4.0 format, states are already in FEN notation
    return state


def fen_key(fen):
    """Get FEN key for comparison (first 3 fields + normalized en passant/move counters)."""
    if fen == 'start':
        return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

    parts = fen.split(' ')
    if len(parts) >= 3:
        # Compare board + turn + castling, ignore en passant and move counters
        return ' '.join(parts[:3]) + ' - 0 1'
    return fen


def find_leaf_nodes(edges):
    """Find nodes that have no outgoing edges (leaf nodes)."""
    # Build set of nodes that have outgoing edges
    nodes_with_children = set()
    all_nodes = set()

    for edge_tuple in edges:
        # Handle both 3-tuple (old) and 4-tuple (new with full_from_fen)
        from_state = edge_tuple[0]
        to_state = edge_tuple[1]

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


def parse_v4_file(filename):
    """Parse a v4.0 format chess openings file and extract transitions.

    Returns:
        states: set of normalized FEN strings (for graph nodes)
        edges: list of tuples (normalized_from, normalized_to, annotation, full_from_fen)
               - normalized states for graph topology
               - full_from_fen preserves en passant for export
        title: opening title
    """
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    if not lines or not lines[0].strip().startswith('v'):
        print(f"Error: Invalid file format. Expected version header.")
        sys.exit(1)

    version = lines[0].strip()
    if version != 'v4.0':
        print(f"Error: File version is {version}, expected v4.0")
        sys.exit(1)

    # Parse title (required in v4.0 format)
    if len(lines) < 2 or not lines[1].strip().startswith('='):
        print(f"Error: Missing title line. Expected '= Title' on line 2.")
        sys.exit(1)

    title = lines[1].strip()[1:].strip()
    start_line = 2

    edges = []  # List of (normalized_from, normalized_to, annotation, full_from_fen)
    states = set()  # Set of normalized FEN strings
    pending_comments = []  # Accumulate # comment lines before transitions

    for i, line in enumerate(lines[start_line:], start=start_line+1):
        line = line.strip()
        if not line:
            continue

        # Check if this is a comment line (starts with #)
        if line.startswith('#'):
            comment = line[1:].strip()
            if comment:
                pending_comments.append(comment)
            continue

        # Skip position definition lines (state : x, y) or (state : x, y, eval)
        # We only need transitions for rebuilding the graph
        if '->' not in line:
            # Position definitions have format: "state : x, y" or "state : x, y, eval"
            if ':' in line:
                # Check if this looks like a position definition (has numbers after colon)
                parts = line.split(':', 1)
                if len(parts) == 2:
                    coords = parts[1].strip()
                    # Check if it starts with a number (coordinate)
                    if coords and coords[0].isdigit():
                        # This looks like a position definition, skip silently
                        pending_comments = []  # Clear comments before position definitions
                        continue

            # This is actually malformed
            print(f"Warning: Skipping malformed line {i}: {line}")
            pending_comments = []
            continue

        parts = line.split('->')
        if len(parts) != 2:
            print(f"Warning: Skipping malformed line {i}: {line}")
            pending_comments = []
            continue

        from_state = parts[0].strip()
        to_part = parts[1].strip()

        # Join accumulated comments as annotation
        annotation = ' '.join(pending_comments)
        pending_comments = []  # Clear for next transition

        # Check if to_part is a FEN string (contains '/') or move notation
        if '/' in to_part or to_part == 'start':
            # Old format: to_part is a full FEN state
            # Normalize both states for graph topology (transposition detection)
            normalized_from = normalize_fen(from_state)
            normalized_to = normalize_fen(to_part)
            states.add(normalized_from)
            states.add(normalized_to)
            # Store normalized states for graph, preserve full from_state for export
            edges.append((normalized_from, normalized_to, annotation, from_state))
        else:
            # New format: to_part is move notation - apply the move to get to_state
            move_notation = to_part
            try:
                from_fen = state_to_fen(from_state)
                board = chess.Board(from_fen)
                move = board.parse_san(move_notation)
                board.push(move)
                to_fen = board.fen()
                # Convert back to 'start' if it matches starting position
                if to_fen == 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1':
                    to_state = 'start'
                else:
                    to_state = normalize_fen(to_fen)

                # Normalize from_state for graph topology (transposition detection)
                normalized_from = normalize_fen(from_state)

                # Add normalized states to graph nodes
                states.add(normalized_from)
                states.add(to_state)
                # Store normalized states for graph, preserve full from_state for export
                edges.append((normalized_from, to_state, annotation, from_state))
            except Exception as e:
                print(f"Warning: Line {i}: Could not apply move '{move_notation}' from state '{from_state[:30]}...' - {e}")
                continue

    print(f"Parsed {len(states)} unique states and {len(edges)} transitions")
    if title:
        print(f"Title: {title}")
    return list(states), edges, title


def build_graph(states, edges):
    """Build a NetworkX directed graph from states and edges.

    Args:
        states: set of normalized FEN strings
        edges: list of tuples (normalized_from, normalized_to, annotation, full_from_fen)
    """
    G = nx.DiGraph()

    # Add all nodes (states are already normalized)
    for state in states:
        G.add_node(state)

    # Add all edges (use normalized states for graph topology)
    for edge_tuple in edges:
        # Handle both 3-tuple (old) and 4-tuple (new with full_from_fen)
        if len(edge_tuple) == 4:
            from_state, to_state, annotation, full_from_fen = edge_tuple
        else:
            from_state, to_state, annotation = edge_tuple
            full_from_fen = from_state  # Fallback for old format

        G.add_edge(from_state, to_state, annotation=annotation, full_from_fen=full_from_fen)

    return G


def compute_layout(G, algorithm='dot'):
    """
    Compute node positions using the best available layout backend.

    Available algorithms (for graphviz backends):
    - dot: hierarchical/layered (best for DAGs, minimizes crossings)
    - neato: spring model (force-directed)
    - fdp: force-directed with smart edge handling
    - sfdp: scalable force-directed (for large graphs)
    - twopi: radial layout
    - circo: circular layout
    """

    # Try pygraphviz first (best quality)
    if LAYOUT_BACKEND == "pygraphviz":
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

            print(f"Layout computed successfully using pygraphviz '{algorithm}' algorithm")
            return pos
        except Exception as e:
            print(f"Error computing layout with pygraphviz: {e}")
            print("Falling back to alternative layout...")

    # Try pydot (good quality, easier to install)
    if LAYOUT_BACKEND == "pydot" or (LAYOUT_BACKEND == "pygraphviz" and PYDOT_AVAILABLE):
        try:
            # Use pydot through networkx
            pos = graphviz_layout(G, prog=algorithm)
            print(f"Layout computed successfully using pydot '{algorithm}' algorithm")
            return pos
        except Exception as e:
            print(f"Error computing layout with pydot: {e}")
            print("Falling back to NetworkX layout...")

    # Fallback to NetworkX built-in layouts
    print("Using NetworkX built-in layout algorithms...")

    # Try hierarchical layout for DAGs
    if nx.is_directed_acyclic_graph(G):
        try:
            # Use multipartite layout for hierarchical structure
            # Assign layers based on topological sort
            layers = {}
            for i, layer_nodes in enumerate(nx.topological_generations(G)):
                for node in layer_nodes:
                    layers[node] = i

            # Create subset structure for multipartite layout
            pos = nx.multipartite_layout(G, subset_key=lambda node: layers[node], scale=200)

            # Scale and offset to match graphviz-style coordinates
            pos = {node: (x * 3 + 400, y * 150) for node, (x, y) in pos.items()}
            print("Layout computed using NetworkX multipartite_layout (hierarchical)")
            return pos
        except Exception as e:
            print(f"Could not use hierarchical layout: {e}")

    # Final fallback: spring layout
    try:
        pos = nx.spring_layout(G, k=2, iterations=100, seed=42)
        # Scale up the positions to match graphviz coordinate system
        pos = {node: (x * 500 + 400, y * 500 + 300) for node, (x, y) in pos.items()}
        print("Layout computed using NetworkX spring_layout (force-directed)")
        return pos
    except Exception as e:
        print(f"Error with spring layout: {e}")
        # Last resort: random layout
        pos = nx.random_layout(G, seed=42)
        pos = {node: (x * 500 + 400, y * 500 + 300) for node, (x, y) in pos.items()}
        print("Warning: Using random layout (consider installing pydot for better results)")
        return pos


def update_file_with_positions(input_file, positions, evaluations, output_file, title='', edges=None):
    """Update the input file with position definitions and evaluations."""
    if not edges:
        edges = []

    # Find max Y to flip the coordinate system
    # Graphviz: Y increases upward (math coordinates)
    # Browser canvas: Y increases downward (screen coordinates)
    y_values = [y for x, y in positions.values()]
    max_y = max(y_values)

    # Build new position definitions
    position_lines = []
    for state, (x, y) in positions.items():
        # Flip Y coordinate for canvas
        flipped_y = max_y - y

        # Normalize state before writing (replace move counters with '-')
        normalized_state = normalize_fen(state)

        # Add evaluation if available
        if state in evaluations:
            position_lines.append(f"{normalized_state} : {x}, {flipped_y}, {evaluations[state]}")
        else:
            position_lines.append(f"{normalized_state} : {x}, {flipped_y}")

    # Build transition lines with annotations as # comments
    transition_lines = []
    for edge_tuple in edges:
        # Handle both 3-tuple (old) and 4-tuple (new with full_from_fen)
        if len(edge_tuple) == 4:
            from_state, to_state, annotation, full_from_fen = edge_tuple
        else:
            from_state, to_state, annotation = edge_tuple
            full_from_fen = from_state  # Fallback for old format

        # Add annotation as # comment if present
        if annotation:
            transition_lines.append(f"# {annotation}")

        # Find the move that leads from from_state to to_state
        # Use full_from_fen (with en passant) for move reconstruction
        try:
            from_fen = state_to_fen(full_from_fen)
            to_fen = state_to_fen(to_state)
            board = chess.Board(from_fen)

            # Try all legal moves to find the one that matches
            move_notation = None
            to_fen_key = fen_key(to_fen)
            for move in board.legal_moves:
                board.push(move)
                if fen_key(board.fen()) == to_fen_key:
                    # Found the move! Get SAN notation
                    board.pop()
                    move_notation = board.san(move)
                    break
                board.pop()

            if move_notation:
                # Write transition with full FEN (preserves en passant)
                transition_lines.append(f"{full_from_fen} -> {move_notation}")
            else:
                # Fallback to old format if move not found
                print(f"Warning: Could not find move from {from_state[:30]}... to {to_state[:30]}...")
                transition_lines.append(f"{from_state} -> {to_state}")
        except Exception as e:
            print(f"Warning: Error converting transition: {e}")
            # Fallback to old format
            transition_lines.append(f"{from_state} -> {to_state}")

    # Write updated file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('v4.0\n')
        if title:
            f.write(f'= {title}\n')
        # Write positions first
        for pos_line in position_lines:
            f.write(pos_line + '\n')
        # Write transitions with annotations
        for trans_line in transition_lines:
            f.write(trans_line + '\n')

    print(f"File updated with {len(position_lines)} positions (Y-axis flipped for canvas)")
    if evaluations:
        print(f"  Including {len(evaluations)} position evaluations")
    print(f"Output written to: {output_file}")


def main():
    parser = argparse.ArgumentParser(
        description='Generate optimal node positions for chess opening graphs and update the file',
        epilog='Note: Requires networkx. For best results, install pydot or pygraphviz for graphviz layouts.'
    )
    parser.add_argument(
        'input',
        help='Input v4.0 chess openings file (.txt)'
    )
    parser.add_argument(
        '--algorithm', '-a',
        default='dot',
        choices=['dot', 'neato', 'fdp', 'sfdp', 'twopi', 'circo'],
        help='Graphviz layout algorithm (default: dot). Only used if pydot or pygraphviz is installed.'
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
    states, edges, title = parse_v4_file(args.input)

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
    update_file_with_positions(args.input, positions, evaluations, output_file, title, edges)

    print()
    print("Done! To use these positions:")
    print(f"1. Load {output_file} in the browser (View or Edit mode)")
    print("2. The file now contains routes, positions, and evaluations (if available)")
    print()

    if LAYOUT_BACKEND == "pygraphviz":
        print("Tip: Try different algorithms if you see edge crossings:")
        for algo in ['dot', 'neato', 'fdp', 'sfdp']:
            print(f"  python bin/evaluate.py {args.input} --algorithm {algo}")
        print()
    elif LAYOUT_BACKEND == "pydot":
        print("Warning: pydot layouts may not be optimal.")
        print("For best results, install pygraphviz - see INSTALL_PYGRAPHVIZ.md")
        print()
    elif LAYOUT_BACKEND == "networkx":
        print("Note: Using NetworkX built-in layouts.")
        print("For optimal layouts, install pygraphviz - see INSTALL_PYGRAPHVIZ.md")
        print()

    print("Options:")
    print(f"  --no-eval              Skip Stockfish evaluation")
    print(f"  --stockfish-path PATH  Specify Stockfish location")


if __name__ == '__main__':
    main()
