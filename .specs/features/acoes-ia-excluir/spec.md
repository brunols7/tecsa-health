# Excluir Ação de IA (soft delete) Specification

## Problem Statement

Depois que uma ação de IA é aceita ou descartada, ela fica presa na tela do paciente para sempre —
não há como removê-la da lista. O nutricionista precisa de um jeito de "limpar" ações antigas
(aceitas ou descartadas) sem perder o registro no banco, via um ícone de lixeira em cada card.

## Goals

- [ ] Cards com status `accepted` ou `dismissed` ganham um ícone de lixeira (`lucide-react-native`) que, após confirmação, exclui
      a ação da lista (soft delete — a linha continua no banco, só some da tela).
- [ ] Ação excluída nunca mais aparece em `GET /ai-actions`, no resultado de `POST .../ai-actions`
      (nem cache nem refresh), nem como `existingTitles` enviado ao LLM.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Excluir ação `pending` | Usuário escolheu limitar o menu a `accepted`/`dismissed`; pending já tem Aceitar/Descartar |
| Restaurar (undo) uma ação excluída | Não pedido; soft delete existe só para manter histórico no banco, não para reverter pela UI |
| Hard delete (remover linha do banco) | Usuário escolheu soft delete explicitamente |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Escopo do menu | Só em cards `accepted`/`dismissed` | Discutido com o usuário | y |
| Semântica da exclusão | Soft delete — novo status `deleted` no enum `AiActionStatus`, linha permanece no banco | Discutido com o usuário | y |
| Confirmação antes de excluir | Sim, `Alert.alert` de confirmação antes do PATCH/DELETE | Discutido com o usuário | y |
| Endpoint | `DELETE /api/v1/ai-actions/:id`, retorna 204, reaproveita `AiActionService::decide()` com status `deleted` internamente | REST mais idiomático para "excluir" que sobrecarregar o PATCH existente; evita que `AiActionResource` tente serializar `status: 'deleted'` (schema mobile só conhece `pending\|accepted\|dismissed` — se o corpo de resposta incluísse `deleted`, o `.parse()` do zod quebraria em runtime) | y (inferido; sem objeção) |
| Filtragem de `deleted` | `listForPatient` e `findByPatientAndHash` no repositório passam a excluir `status = 'deleted'` | Garante que a ação some do GET, do cache de geração e do refresh sem tocar no schema do mobile | y (inferido) |
| Ícone do card | Ícone de lixeira (`Trash2` de `lucide-react-native`) que abre `Alert.alert` de confirmação direto — não um menu "⋮" | Discutido com o usuário: um "⋮" real exigiria um menu com "Excluir" + "Mudar status" (aceita↔descartada), que não existe hoje e implica liberar uma transição de domínio nova; a lixeira só exclui, sem menu. Usuário pediu explicitamente ícone de biblioteca (Lucide) em vez de emoji — `lucide-react-native` + `react-native-svg` foram adicionados como dependência e registrados em `CLAUDE.md` §3 (ícones do projeto passam a ser sempre Lucide) | y |

**Open questions:** none — todas resolvidas ou registradas acima.

---

## User Stories

### P1: Excluir uma ação já decidida ⭐ MVP

**User Story**: Como nutricionista, quero excluir uma ação aceita ou descartada que não faz mais
sentido na tela, para manter a lista do paciente limpa.

**Why P1**: É o pedido central do usuário.

**Acceptance Criteria**:

1. WHILE o card tem status `accepted` ou `dismissed` system SHALL mostrar um ícone de lixeira que, ao tocar, abre a confirmação com a opção
   "Excluir".
2. WHILE o card tem status `pending` system SHALL NOT mostrar o ícone de lixeira.
3. WHEN o nutricionista toca em "Excluir" THEN o app SHALL mostrar um `Alert.alert` de confirmação
   ("Excluir esta ação?", com opções Cancelar/Excluir) antes de chamar a API.
4. WHEN o nutricionista confirma a exclusão THEN o app SHALL chamar `DELETE /api/v1/ai-actions/:id`
   e, em caso de sucesso (204), remover o card da lista local sem refazer o GET completo.
5. WHEN o backend recebe `DELETE /api/v1/ai-actions/:id` para uma ação `accepted` ou `dismissed`
   THEN o backend SHALL marcar seu status como `deleted` (soft delete) e responder 204 sem corpo.
6. IF a ação alvo está `pending` THEN o backend SHALL responder 409 (`AI_ACTION_ALREADY_RESOLVED`)
   e não alterar o status.
7. IF a ação alvo já está `deleted` THEN o backend SHALL responder 409 e não alterar nada
   (exclusão não é idempotente — a segunda tentativa falha).
8. IF a ação não existe THEN o backend SHALL responder 404 (`AI_ACTION_NOT_FOUND`).
9. IF o kill switch (`aiActionsEnabled`) está desligado para a marca do paciente da ação THEN o
   backend SHALL responder 503, sem alterar o status.

**Independent Test**: Aceitar uma ação, tocar o ícone de lixeira → confirmar no Alert → card some da lista sem
reload; ao reabrir a tela (novo GET), a ação continua ausente.

---

### P2: Ação excluída não reaparece em nenhum fluxo de geração

**User Story**: Como nutricionista, quero que uma ação excluída não volte a aparecer nem seja usada
para evitar repetição ao pedir novas sugestões, para que "excluir" realmente signifique "sumiu".

**Why P2**: Sem isso, a ação excluída reapareceria no próximo cache-hit ou seria citada ao LLM como
"já sugerida", vazando um estado que o usuário queria esconder.

**Acceptance Criteria**:

1. WHEN `GET /api/v1/patients/:id/ai-actions` é chamado após uma exclusão THEN a resposta SHALL NOT
   incluir a ação excluída.
2. WHEN `POST /api/v1/patients/:id/ai-actions` (sem `refresh`) faz cache-hit por `input_hash` THEN
   a lista retornada SHALL NOT incluir ações com status `deleted`.
3. WHEN `POST /api/v1/patients/:id/ai-actions` com `refresh: true` monta `existingTitles` THEN
   ações com status `deleted` SHALL NOT ser incluídas nos títulos enviados ao LLM.

**Independent Test**: Excluir uma ação `accepted`, chamar `GET` de novo → ela não aparece; chamar
`POST` com `refresh: true` → o título da ação excluída não está em `existingTitles` (verificável
via o teste de unidade que inspeciona `FakeLlmClient::lastInput()`).

---

## Edge Cases

- IF o `DELETE` falha por erro de rede THEN o app SHALL manter o card na lista e mostrar um erro
  local (sem otimismo — exclusão não é otimista, mesma regra de CLAUDE.md §5.6 para ações que
  dependem do servidor).
- WHEN a última ação restante da lista é excluída THEN a tela SHALL cair no estado vazio
  (`AiActionsEmptyState`), igual a quando nenhuma ação nunca foi gerada.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| AIDEL-01 | P1: Excluir ação decidida | Execute | Implemented |
| AIDEL-02 | P1: Excluir ação decidida | Execute | Implemented |
| AIDEL-03 | P1: Excluir ação decidida | Execute | Implemented |
| AIDEL-04 | P1: Excluir ação decidida | Execute | Implemented |
| AIDEL-05 | P1: Excluir ação decidida | Execute | Implemented |
| AIDEL-06 | P1: Excluir ação decidida | Execute | Implemented |
| AIDEL-07 | P1: Excluir ação decidida | Execute | Implemented |
| AIDEL-08 | P1: Excluir ação decidida | Execute | Implemented |
| AIDEL-09 | P1: Excluir ação decidida | Execute | Implemented |
| AIDEL-10 | P2: Não reaparece | Execute | Implemented |
| AIDEL-11 | P2: Não reaparece | Execute | Implemented |
| AIDEL-12 | P2: Não reaparece | Execute | Implemented |

**Coverage:** 12 total, 12 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] `php artisan test` e `npm test` passam com testes novos cobrindo as 12 ACs.
- [ ] Nenhuma regra de negócio no controller (delete só chama `AiActionService::decide()` e devolve
      204).
- [ ] `tsc --noEmit` e `phpstan analyse` limpos.
- [ ] Única dependência nova é `lucide-react-native` (+ `react-native-svg`), pedida explicitamente pelo usuário e registrada em `CLAUDE.md` §3; a confirmação usa `Alert` do React Native, não uma lib de menu.
