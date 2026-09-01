#!/usr/bin/env bash
# Fronteira de marca (CLAUDE.md §11.1): nada em src/core/**/* pode conter o
# nome de uma marca em qualquer forma (import, string, identificador,
# comentário). O ESLint (eslint.config.js) já pega o caso de import via
# no-restricted-imports; este script cobre o caso geral via grep textual,
# incluindo string em comentário.
set -euo pipefail

CORE_DIR="src/core"

if grep -rniE "nutri-care|vita-plus" "$CORE_DIR"; then
  echo "Violação de fronteira de marca: nome de marca encontrado em $CORE_DIR" >&2
  exit 1
fi

echo "OK: nenhuma referência a marca encontrada em $CORE_DIR"
exit 0
