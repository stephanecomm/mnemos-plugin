#!/bin/bash
# Test du serveur MCP Mnemos
# Usage : bash test-mcp.sh
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
export SUPABASE_URL="https://hpbsowihyydzdnxuzoxs.supabase.co"
node "$SCRIPT_DIR/test-mcp.js"
