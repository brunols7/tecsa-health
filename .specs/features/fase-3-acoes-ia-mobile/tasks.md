# Fase 3 — Ações de IA Mobile Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its
Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is
the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review,
Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/fase-3-acoes-ia-mobile/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase (`src/core/api/schemas/__tests__/biomarker.test.ts`,
> `src/core/api/__tests__/http.test.ts`, `src/core/patients/__tests__/useSetFollowUpMutation.test.tsx`,
> `src/core/ui/__tests__/QueryStateView.test.tsx`, `src/app/patients/__tests__/[id].test.tsx`,
> `mobile/package.json` scripts) and project guidelines (`CLAUDE.md` §5.4, §5.5, §5.6, §5.7, §10).
> This feature introduces the project's first non-optimistic mutations (no `onMutate`/rollback —
> CLAUDE.md §5.6 forbids optimism for AI actions) and the first `POST` call in the app.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Schema (`aiActionSchema`) | unit | Parse válido; rejeição de shape inválido (status/priority fora do enum, campo faltando) | `src/core/api/schemas/__tests__/ai-action.test.ts` | `npm test -- ai-action` |
| `apiPost` (`http.ts` modificado) | unit (fetch mockado) | Corpo serializado quando presente, ausente quando omitido; erro 4xx/5xx vira `ApiError` (mesmo padrão de `apiGet`/`apiPatch`) | `src/core/api/__tests__/http.test.ts` (estende o existente) | `npm test -- http.test` |
| API functions (`fetchAiActions`, `generateAiActions`, `decideAiAction`) | unit (fetch mockado) | 1 caso feliz + 1 caso de erro por função | `src/core/api/__tests__/ai-actions.test.ts` | `npm test -- ai-actions.test` |
| `useAiActionsQuery` | unit (`createTestQueryClient`) | Query key correta; `enabled: false` quando a flag está desligada (não dispara fetch) | `src/core/patients/__tests__/useAiActionsQuery.test.tsx` | `npm test -- useAiActionsQuery` |
| `useGenerateAiActionsMutation` | unit (`createTestQueryClient`, `mutationFn` mockada) | Sucesso popula a query de `ai-actions`; **nenhum** `onMutate` no hook (ausência de otimismo é uma asserção do teste, não só do código) | `src/core/patients/__tests__/useGenerateAiActionsMutation.test.tsx` | `npm test -- useGenerateAiActionsMutation` |
| `useDecideAiActionMutation` | unit (`createTestQueryClient`, `mutationFn` mockada) | Sucesso atualiza só o item decidido no array em cache; erro não altera nada no cache (sem rollback porque não houve mudança otimista); **nenhum** `onMutate` | `src/core/patients/__tests__/useDecideAiActionMutation.test.tsx` | `npm test -- useDecideAiActionMutation` |
| `AiActionCard` | component (RNTL) | `pending` mostra 2 botões; tocar cada um desabilita os 2 até resolver; sucesso mostra indicador final sem botões; erro reabilita só aquele card | `src/core/ui/__tests__/AiActionCard.test.tsx` | `npm test -- AiActionCard` |
| `AiActionsSection` | component (RNTL) | Os 4 estados aparecem no fluxo real; flag desligada não renderiza nada e não dispara a query; disclaimer sempre visível quando a seção renderiza algo | `src/core/ui/__tests__/AiActionsSection.test.tsx` | `npm test -- AiActionsSection` |
| `src/app/patients/[id].tsx` (modificado) | component (RNTL) | A seção de IA aparece integrada abaixo dos biomarcadores; erro da seção de IA não derruba o resto da tela | `src/app/patients/__tests__/[id].test.tsx` (estende o existente) | `npm test -- patients/__tests__` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After tasks with unit tests only | `npx tsc --noEmit && npm test` |
| Full | After tasks touching UI/screens | `npm run pretest && npx tsc --noEmit && npm test` |
| Build | After phase completion | `npm run pretest && npx tsc --noEmit && npm test` |

---

## Execution Plan

Phases are ordered and run sequentially — each phase completes before the next begins, and tasks
within a phase execute in order.

### Phase 1: API layer

```
T1
T2
T1 → T3
T2 → T3
```

### Phase 2: Hooks

```
T3 → T4
T3 → T5
T3 → T6
```

### Phase 3: Components e integração

```
T6 → T7
T4 → T8
T5 → T8
T7 → T8
T8 → T9
```

---

## Task Breakdown

### T1: `aiActionSchema`

**What**: Schema zod + tipo inferido de `AiAction`, `AiActionStatus`, `AiActionPriority`.
**Where**: `mobile/src/core/api/schemas/ai-action.ts`
**Depends on**: None
**Reuses**: `mobile/src/core/api/schemas/biomarker.ts` (mesmo padrão de enum + object schema)
**Requirement**: AIMOB-01, AIMOB-04

**Tools**:

- MCP: NONE
- Skill: `react-native-expert`

**Done when**:

- [x] `aiActionSchema.parse()` aceita um objeto válido com todos os campos do design
- [x] `.safeParse()` rejeita `status`/`priority` fora do enum e campo obrigatório faltando
- [x] Gate check passa: `npm test -- ai-action`
- [x] Test count: 4+ testes passam

**Tests**: unit
**Gate**: quick

---

### T2: `apiPost` em `http.ts`

**What**: Novo export `apiPost(path: string, body?: unknown): Promise<unknown>`.
**Where**: `mobile/src/core/api/http.ts` (modify)
**Depends on**: None
**Reuses**: `buildUrl`, `handleErrorResponse` já existentes no mesmo arquivo
**Requirement**: AIMOB-03

**Tools**:

- MCP: NONE
- Skill: `react-native-expert`

**Done when**:

- [x] `apiPost(path, body)` serializa `body` como JSON quando presente
- [x] `apiPost(path)` sem segundo argumento não envia corpo
- [x] Resposta `!response.ok` lança `ApiError` com `status`/`code`, mesmo padrão de `apiGet`
- [x] Gate check passa: `npm test -- http.test`
- [x] Test count: 2+ testes novos passam, suíte de `http.test.ts` sem regressão

**Tests**: unit
**Gate**: quick

---

### T3: `core/api/ai-actions.ts`

**What**: `fetchAiActions`, `generateAiActions`, `decideAiAction` — cada uma chamando `apiGet`/`apiPost`/`apiPatch` e validando a resposta com `aiActionSchema`.
**Where**: `mobile/src/core/api/ai-actions.ts`
**Depends on**: T1, T2
**Reuses**: `mobile/src/core/api/patients.ts` (mesmo padrão exato de fetch tipado)
**Requirement**: AIMOB-01, AIMOB-03, AIMOB-09, AIMOB-10, AIMOB-11

**Tools**:

- MCP: NONE
- Skill: `react-native-expert`

**Done when**:

- [x] `fetchAiActions(patientId)` chama `GET /api/v1/patients/:id/ai-actions` e devolve
      `AiAction[]` validado
- [x] `generateAiActions(patientId)` chama `POST /api/v1/patients/:id/ai-actions` sem corpo
- [x] `decideAiAction(actionId, status)` chama `PATCH /api/v1/ai-actions/:id` com
      `{"status": ...}`
- [x] Cada função tem 1 caso feliz + 1 caso de erro testado (fetch mockado, `ApiError` propagada)
- [x] Gate check passa: `npm test -- ai-actions.test`
- [x] Test count: 6+ testes passam

**Tests**: unit
**Gate**: quick

---

### T4: `useAiActionsQuery`

**What**: Hook de leitura com `enabled` pela flag.
**Where**: `mobile/src/core/patients/useAiActionsQuery.ts`
**Depends on**: T3
**Reuses**: `mobile/src/core/patients/usePatientBiomarkersQuery.ts` (mesmo padrão de
`useQuery`/`queryKey`)
**Requirement**: AIMOB-01, AIMOB-02, AIMOB-04, AIMOB-05, AIMOB-07

**Tools**:

- MCP: NONE
- Skill: `react-native-expert`

**Done when**:

- [ ] `queryKey` é `['ai-actions', patientId]`
- [ ] `enabled` é `false` quando `useFlag('aiActionsEnabled')` é `false` — teste confirma que
      `fetchAiActions` não é chamada nesse caso
- [ ] Gate check passa: `npm test -- useAiActionsQuery`
- [ ] Test count: 3+ testes passam

**Tests**: unit
**Gate**: quick

---

### T5: `useGenerateAiActionsMutation`

**What**: Mutation não-otimista de geração.
**Where**: `mobile/src/core/patients/useGenerateAiActionsMutation.ts`
**Depends on**: T3
**Reuses**: estrutura de `mobile/src/core/patients/useSetFollowUpMutation.ts`, **sem**
`onMutate`/`onError` de rollback
**Requirement**: AIMOB-03, AIMOB-06, AIMOB-08

**Tools**:

- MCP: NONE
- Skill: `react-native-expert`

**Done when**:

- [ ] `mutate(patientId)` chama `generateAiActions` e, no sucesso, popula
      `['ai-actions', patientId]` com o resultado
- [ ] O arquivo não declara `onMutate` em nenhum lugar — teste next-to-code lê o módulo ou o
      comportamento (nenhuma mudança de cache acontece antes do `mutationFn` resolver)
- [ ] Erro da mutation não altera o cache existente
- [ ] Gate check passa: `npm test -- useGenerateAiActionsMutation`
- [ ] Test count: 3+ testes passam

**Tests**: unit
**Gate**: quick

---

### T6: `useDecideAiActionMutation`

**What**: Mutation não-otimista de aceite/descarte, atualizando só o item decidido no array em
cache.
**Where**: `mobile/src/core/patients/useDecideAiActionMutation.ts`
**Depends on**: T3
**Reuses**: mesmo raciocínio de T5
**Requirement**: AIMOB-10, AIMOB-11, AIMOB-12, AIMOB-13, AIMOB-14

**Tools**:

- MCP: NONE
- Skill: `react-native-expert`

**Done when**:

- [ ] `mutate({actionId, status: 'accepted'})` no sucesso substitui só aquele item no array de
      `['ai-actions', patientId]`, mantendo os outros intactos
- [ ] Mesma cobertura para `'dismissed'`
- [ ] Erro da mutation não altera nenhum item do cache (nada para reverter — sem `onMutate`)
- [ ] O arquivo não declara `onMutate`
- [ ] Gate check passa: `npm test -- useDecideAiActionMutation`
- [ ] Test count: 4+ testes passam

**Tests**: unit
**Gate**: quick

---

### T7: `AiActionCard`

**What**: Card de uma ação — botões aceitar/descartar quando `pending`, indicador final quando
resolvida, desabilita só os próprios botões durante a decisão.
**Where**: `mobile/src/core/ui/AiActionCard.tsx`
**Depends on**: T6
**Reuses**: `biomarkerStatusColor()` de `src/app/patients/[id].tsx` como referência de
cor-por-status, adaptado para prioridade via `useTheme().colors`
**Requirement**: AIMOB-09, AIMOB-10, AIMOB-11, AIMOB-12, AIMOB-13

**Tools**:

- MCP: NONE
- Skill: `react-native-expert`, `frontend-design`

**Done when**:

- [ ] Ação `pending` renderiza botões "Aceitar" e "Descartar"
- [ ] Tocar "Aceitar" desabilita os 2 botões até a mutation resolver, depois mostra "Aceita" sem
      botões
- [ ] Tocar "Descartar" segue o mesmo fluxo com "Descartada"
- [ ] Erro da mutation reabilita os 2 botões e mostra mensagem só neste card
- [ ] Ação já `accepted`/`dismissed` (vinda do `GET`) renderiza direto o indicador final, sem botões
- [ ] Nenhum literal de cor/raio/fonte — tudo via `useTheme()`
- [ ] Gate check passa: `npm run pretest && npx tsc --noEmit && npm test -- AiActionCard`
- [ ] Test count: 6+ testes passam

**Tests**: component
**Gate**: full

---

### T8: `AiActionsSection`

**What**: Componente que decide se renderiza algo (flag), monta a query, delega os 4 estados ao
`QueryStateView`, renderiza disclaimer + botão "Gerar ações" (vazio) ou lista de `AiActionCard`
(sucesso).
**Where**: `mobile/src/core/ui/AiActionsSection.tsx`
**Depends on**: T4, T5, T7
**Reuses**: `mobile/src/core/ui/QueryStateView.tsx` (reuso direto, sem modificação)
**Requirement**: AIMOB-01 a AIMOB-08

**Tools**:

- MCP: NONE
- Skill: `react-native-expert`, `frontend-design`

**Done when**:

- [ ] `useFlag('aiActionsEnabled') === false` → componente não renderiza nada (nem título, nem
      disclaimer) e a query correspondente não dispara
- [ ] Estado `pending` (primeira carga) → skeleton com forma de cards
- [ ] Estado vazio → disclaimer + botão "Gerar ações"
- [ ] Tocar "Gerar ações" → loading no botão, depois lista de `AiActionCard`
- [ ] Estado com itens → disclaimer + lista de cards, **sem** botão "Gerar ações"
- [ ] Erro no `GET` → mensagem de erro da seção + retry, sem afetar nenhum outro conteúdo da tela
      (testado isolado, fora do contexto da tela completa)
- [ ] Erro no `POST` → botão "Gerar ações" reabilita com mensagem
- [ ] Gate check passa: `npm run pretest && npx tsc --noEmit && npm test -- AiActionsSection`
- [ ] Test count: 8+ testes passam

**Tests**: component
**Gate**: full

---

### T9: Integrar `AiActionsSection` em `patients/[id].tsx`

**What**: Renderiza `<AiActionsSection patientId={id} />` depois do bloco de biomarcadores, dentro
do `ScrollView` existente.
**Where**: `mobile/src/app/patients/[id].tsx` (modify)
**Depends on**: T8
**Reuses**: estrutura de layout já existente (`ScrollView` com `gap: spacing(4)`)
**Requirement**: AIMOB-05 (erro da seção de IA isolado do resto da tela, verificado end-to-end)

**Tools**:

- MCP: NONE
- Skill: `react-native-expert`

**Done when**:

- [ ] A seção de IA aparece visualmente depois dos biomarcadores na tela de detalhe
- [ ] Um erro simulado só na query de `ai-actions` não impede paciente/biomarcadores de aparecerem
      normalmente (teste no arquivo existente `[id].test.tsx`)
- [ ] `tsc --noEmit` limpo
- [ ] Gate check passa: `npm run pretest && npx tsc --noEmit && npm test`
- [ ] Test count: suíte completa do mobile sem regressão, 2+ testes novos no arquivo existente

**Tests**: component
**Gate**: build

**Commit**: `feat(mobile): show ai actions section on patient detail screen`

---

## Phase Execution Map

```
Phase 1: T1
Phase 1: T2
Phase 1: T1 → T3
Phase 1: T2 → T3

Phase 2: T3 → T4
Phase 2: T3 → T5
Phase 2: T3 → T6

Phase 3: T6 → T7
Phase 3: T4 → T8
Phase 3: T5 → T8
Phase 3: T7 → T8
Phase 3: T8 → T9
```

Execution is strictly sequential within a phase — a single agent (or batch worker) works one task
at a time, in order.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: `aiActionSchema` | 1 file | ✅ Granular |
| T2: `apiPost` | 1 file (modify) | ✅ Granular |
| T3: `ai-actions.ts` (3 funções) | 1 file, 1 cohesive concept (camada de fetch da mesma feature) | ⚠️ OK — cohesive |
| T4: `useAiActionsQuery` | 1 file | ✅ Granular |
| T5: `useGenerateAiActionsMutation` | 1 file | ✅ Granular |
| T6: `useDecideAiActionMutation` | 1 file | ✅ Granular |
| T7: `AiActionCard` | 1 file | ✅ Granular |
| T8: `AiActionsSection` | 1 file | ✅ Granular |
| T9: Integração na tela de detalhe | 1 file (modify) | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | Phase 1, sem seta | ✅ Match |
| T2 | None | Phase 1, sem seta | ✅ Match |
| T3 | T1, T2 | T1 → T3, T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T3 | T3 → T5 | ✅ Match |
| T6 | T3 | T3 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T4, T5, T7 | T4 → T8, T5 → T8, T7 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |

Nenhuma dependência aponta para uma fase posterior; todas apontam para trás ou dentro da mesma
fase.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1: `aiActionSchema` | Schema | unit | unit | ✅ OK |
| T2: `apiPost` | API function (http.ts) | unit | unit | ✅ OK |
| T3: `ai-actions.ts` | API functions | unit | unit | ✅ OK |
| T4: `useAiActionsQuery` | Hook de Query | unit | unit | ✅ OK |
| T5: `useGenerateAiActionsMutation` | Hook de Mutation | unit | unit | ✅ OK |
| T6: `useDecideAiActionMutation` | Hook de Mutation | unit | unit | ✅ OK |
| T7: `AiActionCard` | Componente | component | component | ✅ OK |
| T8: `AiActionsSection` | Componente | component | component | ✅ OK |
| T9: Integração na tela | Componente (tela existente) | component | component | ✅ OK |

---

## Tools

Skills usados: `react-native-expert` em todas as tasks de código (Expo/React Native, TanStack
Query, FlashList/RNTL já são o domínio dele); `frontend-design` adicional em T7/T8 (novos
componentes visuais — cards, badges de prioridade, disclaimer) para garantir densidade/tom
consistentes com as duas marcas, sem cair em defaults genéricos (CLAUDE.md §5.2). Nenhum MCP
externo necessário.
