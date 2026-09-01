#!/usr/bin/env bash
# Guard-rail de fronteira de camada backend (CLAUDE.md §11.2).
# Uso: check-layer-boundary.sh [base_dir]
# base_dir default: app (relativo ao diretório de onde o script é chamado)
set -e

BASE_DIR="${1:-app}"

! grep -rq "Illuminate\\\\" "$BASE_DIR/Domain/" 2>/dev/null \
    || { echo "Domain conhece Laravel"; exit 1; }

! grep -rqE "DB::|Models\\\\" "$BASE_DIR/Application/" 2>/dev/null \
    || { echo "Service conhece Eloquent"; exit 1; }

! grep -rqE "DB::|Models\\\\" "$BASE_DIR/Http/Controllers/" 2>/dev/null \
    || { echo "Controller conhece Eloquent"; exit 1; }

! grep -rqE '\$request->all\(\)|request\(\)->all\(\)' "$BASE_DIR/Http/Controllers/" 2>/dev/null \
    || { echo "all() no controller"; exit 1; }

exit 0
