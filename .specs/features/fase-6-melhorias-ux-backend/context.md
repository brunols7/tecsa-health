# Fase 6 — Melhorias UX Backend Context

**Gathered:** 2026-09-02
**Spec:** `.specs/features/fase-6-melhorias-ux-backend/spec.md`
**Status:** Ready for design

---

## Feature Boundary

CRUD completo de paciente no backend (`POST`/`PATCH`/`DELETE`), um state machine de ciclo de vida de
acompanhamento (`active`/`inactive`/`completed`, com `status_changed_at`), enums de `goal`/`status`
reforçados por check constraint, filtro de listagem por status, e seed com nomes `pt_BR`.

---

## Implementation Decisions

### Exclusão vs. ciclo de vida

- Exclusão é soft delete puro (`deleted_at`, Eloquent `SoftDeletes`), completamente separado do campo
  `status`. Um paciente excluído nunca mais aparece em nenhuma leitura, em nenhum status.
- `status` cobre só o ciclo de vida do acompanhamento: `active` (padrão), `inactive` (pausado,
  reativável), `completed` (concluído, reabrível). As únicas transições válidas são
  `active→inactive`, `active→completed`, `inactive→active`, `completed→active`. Qualquer outra
  combinação (`inactive→completed` direto, repetir o status atual) é `409 INVALID_STATUS_TRANSITION`.
- A mudança de status vive num endpoint próprio (`PATCH /patients/:id/status`), separado do `PATCH`
  de cadastro — evita confundir `422` de validação de campo com `409` de transição inválida.

### Rastreio de "desde quando"

- Nova coluna `status_changed_at`, atualizada em toda transição de status (e na criação, já que o
  paciente nasce `active`). Não é uma tabela de auditoria completa — um timestamp resolve o caso de
  uso do mobile ("Inativo desde X") sem introduzir histórico versionado.

### Enums

- `goal`: 4 valores fixos, os mesmos já usados implicitamente pela `PatientFactory`
  (`lose_weight`, `gain_muscle`, `maintain`, `manage_condition`). Formalizar não muda o vocabulário,
  só passa a validar em toda camada (migration + Domain + FormRequest).
- Tradução para português não é responsabilidade do backend — a API sempre devolve os valores
  canônicos em inglês; a UI (mobile) traduz.

### Seed

- Locale do Faker muda de `en_US` para `pt_BR` via `APP_FAKER_LOCALE` (env configurável, com esse novo
  default). `FAKER_SEED=42` permanece igual — a troca de locale já muda os nomes por natureza, trocar
  a seed também não teria propósito.
- Não há migração de dado linha a linha para "traduzir" nomes existentes — o caminho é recriar o seed
  do zero (`migrate:fresh --seed`).

### Agent's Discretion

- Formato exato do código de erro em cada `422` (ex.: `PATIENT_INVALID_GOAL` vs. reaproveitar um
  código genérico de validação) fica a critério do design, desde que siga o envelope de erro já
  padronizado pelo `Exceptions\Handler` (CLAUDE.md §6.3).
- Nome exato da exceção de domínio para transição inválida (`InvalidStatusTransition` ou equivalente)
  e onde ela vive em `Domain/Patient/`.

### Declined / Undiscussed Gray Areas → Assumptions

Nenhuma — todas as áreas relevantes foram discutidas com o usuário nesta sessão (via `AskUserQuestion`,
em duas rodadas) e estão registradas na tabela "Assumptions & Open Questions" do `spec.md`.

---

## Specific References

- Modelo de ciclo de vida pedido pelo usuário nas próprias palavras: "deveria ter estados de
  acompanhamento... em algum momento o usuário pode chegar ao fim ou cancelar... deve ter como
  inativar e reativar, como dar como concluído... os inativos e concluídos aparecem em uma
  filtragem à parte e o resto fica na lista normal. Excluídos não aparecem."
- Ajuste sobre o rótulo de reativação: "deve ter como reativar, mas não pode levar esse nome, ou se
  levar, ao clicar em reativar ele fica com o status diferente" — resolvido como: mesmo destino
  (`active`), rótulo de botão diferente por status de origem (decisão que vive só no mobile, o
  backend não sabe de rótulo).

---

## Deferred Ideas

- Restaurar paciente excluído (`undelete`): não pedido, fica para uma fase futura se o usuário quiser.
- Auditoria completa de mudança de status (quem mudou, histórico versionado): o usuário aceitou a
  versão simplificada (`status_changed_at` único), não uma tabela de eventos.
- Registrar esta modelagem (status separado de soft delete, state machine de 4 transições) como ADR
  na Fase 5 — pedido explícito do usuário ("Simm anote"), ver `.specs/STATE.md` AD-015.
