# APP_NAME

## Overview

This is a Python application scaffolded by the Self-Service Repository Request system.

## Prerequisites

- Python 3.11+

## Getting Started

```bash
# Create a virtual environment
python -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate

# Install runtime dependencies
pip install -r requirements.txt

# Install dev dependencies
pip install -r requirements-dev.txt

# Install the package in editable mode
pip install -e .

# Run tests
pytest

# Run the application
APP_NAME
```

## Project Structure

```
APP_NAME/
├── pyproject.toml
├── requirements.txt
├── requirements-dev.txt
├── src/
│   └── app_name/
│       ├── __init__.py
│       └── main.py
└── tests/
    └── test_main.py
```
