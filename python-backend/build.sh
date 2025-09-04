#!/usr/bin/env bash
set -euo pipefail

echo "Python version: $(python -V 2>&1)"
echo "Upgrading pip..."
python -m pip install --upgrade pip

echo "Installing build helpers (Cython, wheel, setuptools) if available..."
python -m pip install --no-cache-dir Cython wheel setuptools || true

echo "Installing requirements from requirements.txt"
python -m pip install --no-cache-dir -r requirements.txt

echo "Build script finished"
