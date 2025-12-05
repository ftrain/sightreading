#!/bin/bash
# Download Salamander piano samples for local hosting
# Run this script from the project root: ./scripts/download-samples.sh

set -e

SAMPLES_DIR="public/samples"
BASE_URL="https://tonejs.github.io/audio/salamander"

mkdir -p "$SAMPLES_DIR"
cd "$SAMPLES_DIR"

echo "Downloading Salamander Grand Piano samples..."

# A notes (A0-A7)
for oct in 0 1 2 3 4 5 6 7; do
  curl -sO "$BASE_URL/A$oct.mp3" && echo "✓ A$oct.mp3"
done

# C notes (C1-C8)
for oct in 1 2 3 4 5 6 7 8; do
  curl -sO "$BASE_URL/C$oct.mp3" && echo "✓ C$oct.mp3"
done

# D# notes (Ds1-Ds7)
for oct in 1 2 3 4 5 6 7; do
  curl -sO "$BASE_URL/Ds$oct.mp3" && echo "✓ Ds$oct.mp3"
done

# F# notes (Fs1-Fs7)
for oct in 1 2 3 4 5 6 7; do
  curl -sO "$BASE_URL/Fs$oct.mp3" && echo "✓ Fs$oct.mp3"
done

echo ""
echo "Done! Downloaded $(ls -1 *.mp3 | wc -l) samples to $SAMPLES_DIR"
echo "Total size: $(du -sh . | cut -f1)"
