# Installing pygraphviz on macOS

This guide helps you install pygraphviz, which is needed for the best graph layouts in evaluate.py.

## Step-by-Step Installation

### 1. Make sure graphviz is installed via Homebrew

```bash
brew install graphviz
```

### 2. Find where Homebrew installed graphviz

```bash
brew --prefix graphviz
```

This should output something like:
- `/usr/local/opt/graphviz` (Intel Macs)
- `/opt/homebrew/opt/graphviz` (Apple Silicon Macs)

### 3. Activate your virtual environment

```bash
cd /Users/jgerth/GitHub/chess-openings
source venv/bin/activate
```

### 4. Install pygraphviz with explicit paths

**For Apple Silicon Macs (M1/M2/M3):**
```bash
pip install --config-settings="--global-option=build_ext" \
            --config-settings="--global-option=-I$(brew --prefix graphviz)/include" \
            --config-settings="--global-option=-L$(brew --prefix graphviz)/lib" \
            pygraphviz
```

**For Intel Macs:**
```bash
pip install --global-option=build_ext \
            --global-option="-I$(brew --prefix graphviz)/include" \
            --global-option="-L$(brew --prefix graphviz)/lib" \
            pygraphviz
```

### 5. Alternative: Use environment variables (if above doesn't work)

```bash
export CFLAGS="-I$(brew --prefix graphviz)/include"
export LDFLAGS="-L$(brew --prefix graphviz)/lib"
pip install pygraphviz
```

### 6. Another alternative: Install specific version

Sometimes older versions install more easily:

```bash
pip install pygraphviz==1.11
```

Or try the latest:
```bash
pip install --upgrade pygraphviz
```

## Troubleshooting

### If you get "command errored out with exit status 1"

Try this sequence:
```bash
# Uninstall if partially installed
pip uninstall pygraphviz

# Make sure you have the latest pip
pip install --upgrade pip setuptools wheel

# Try with environment variables
export CFLAGS="-I$(brew --prefix graphviz)/include"
export LDFLAGS="-L$(brew --prefix graphviz)/lib"
pip install --no-cache-dir pygraphviz
```

### If you get "fatal error: 'graphviz/cgraph.h' file not found"

This means pip can't find the graphviz headers. Double-check:
```bash
# Verify graphviz is installed
brew list graphviz

# Check the include directory exists
ls $(brew --prefix graphviz)/include/graphviz/

# If the directory doesn't exist, reinstall graphviz
brew reinstall graphviz
```

### If you get linker errors

```bash
# Make sure pkg-config is installed
brew install pkg-config

# Then try installing with pkg-config
pip install --no-cache-dir pygraphviz
```

## Verify Installation

Once installed, verify it works:

```bash
python -c "import pygraphviz; print('pygraphviz version:', pygraphviz.__version__)"
```

You should see output like: `pygraphviz version: 1.11`

## Test with evaluate.py

```bash
python bin/evaluate.py your-openings.txt --no-eval
```

You should see: "Using pygraphviz for graph layouts"

## Still Having Issues?

If none of the above works:

1. **Use the networkx built-in layouts** - They work quite well for chess opening trees:
   ```bash
   # Just use networkx, no pygraphviz needed
   python bin/evaluate.py your-openings.txt
   ```
   The built-in hierarchical layout is good for most opening trees. You won't get the absolute best layout quality, but it's perfectly usable.

2. **Check your Python version** - pygraphviz works best with Python 3.9-3.11. If you're using Python 3.12+, try creating a venv with an older Python version:
   ```bash
   # Install pyenv to manage Python versions
   brew install pyenv
   pyenv install 3.11.7

   # Create venv with specific Python version
   ~/.pyenv/versions/3.11.7/bin/python3 -m venv venv
   source venv/bin/activate
   ```

3. **File an issue** - Share the exact error message and we can debug further.
