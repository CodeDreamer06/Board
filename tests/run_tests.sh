#!/bin/bash
# E2E Test Runner for DevBoard

# Exit on any error
set -e

# Resolve the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

echo "========================================="
echo "Running E2E Test Suite Type Check..."
echo "========================================="
cd "$SCRIPT_DIR"
npx tsc --noEmit
echo "TypeScript verification successful (no errors)!"
echo ""

echo "========================================="
echo "Running Vitest Test Suite..."
echo "========================================="
npm run test
echo ""

echo "========================================="
echo "E2E Test Suite Run Completed Successfully!"
echo "========================================="
