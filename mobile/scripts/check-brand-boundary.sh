#!/usr/bin/env bash
set -euo pipefail

CORE_DIR="src/core"

if grep -rniE "nutri-care|vita-plus" "$CORE_DIR"; then
  echo "Violação de fronteira de marca: nome de marca encontrado em $CORE_DIR" >&2
  exit 1
fi

echo "OK: nenhuma referência a marca encontrada em $CORE_DIR"
exit 0
