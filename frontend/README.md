# Spanner Graph Visualization

This package provides a visualization tool for Spanner Graph data.

## Development

### Setup

```bash
# Install dependencies
npm install
```

### Development

```bash
python spanner_graphs/dev_util/serve_dev.py
```
This will start a hot-reload development environment that can be accessed at http://localhost:1234/.

## Production for Notebook environments

```bash
npm run build:notebook
```
This will create a bundled and version-controlled JavaScript file in the `third_party` directory that includes all dependencies.