#!/bin/bash
# Lance le serveur MCP Mnemos depuis le bon repertoire
# $BASH_SOURCE resout le chemin meme si appele en relatif
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/index.cjs"
