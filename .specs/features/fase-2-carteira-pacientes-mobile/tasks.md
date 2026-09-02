# Fase 2 — Carteira de Pacientes Mobile Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its
Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is
the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review,
Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/fase-2-carteira-pacientes-mobile/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase (`src/core/flags/__tests__/useFeatureFlagsQuery.test.tsx`,
> `src/core/api/__tests__/http.test.ts`, `mobile/package.json` scripts) and project guidelines
> (`CLAUDE.md` §5.4, §5.5, §5.6, §10). This feature introduces the project's first infinite-query
> hook, first mutation with rollback, and first dedicated UI-state component.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Schemas (`patientSchema`, `patientPageSchema`, `biomarkerSchema`) | unit | Parse válido; rejeição de shape inválido (campo faltando/tipo errado) | `src/core/api/schemas/__tests__/*.test.ts` | `npm test -- schemas` |
| API functions (`fetchPatients`, `fetchPatientDetail`, `fetchPatientBiomarkers`, `patchPatientFollowUp`) | unit (fetch mockado) | 1 caso feliz + 1 caso de erro por função, seguindo o padrão de `http.test.ts` | `src/core/api/__tests__/patients.test.ts` | `npm test -- patients.test` |
| `apiPatch` (`http.ts` modificado) | unit (fetch mockado) | Corpo serializado corretamente; erro 4xx/5xx vira `ApiError` (mesmo padrão de `apiGet`) | `src/core/api/__tests__/http.test.ts` (estende o existente) | `npm test -- http.test` |
| Hooks de Query (`usePatientsQuery`, `usePatientDetailQuery`, `usePatientBiomarkersQuery`) | unit (`createTestQueryClient`, sem MMKV real) | Query key correta; paginação sem duplicar ao trocar `search` | `src/core/patients/__tests__/*.test.tsx` | `npm test -- patients` |
| `useDebouncedValue` | unit (fake timers) | Valor só atualiza após o delay; reset do timer em mudança rápida sucessiva | `src/core/patients/__tests__/useDebouncedValue.test.ts` | `npm test -- useDebouncedValue` |
| `useSetFollowUpMutation` | unit (`createTestQueryClient`, `mutationFn` mockada) | `onMutate` aplica otimista; `onError` reverte pro snapshot; `onSettled` invalida as 2 queries | `src/core/patients/__tests__/useSetFollowUpMutation.test.tsx` | `npm test -- useSetFollowUpMutation` |
| `useIsOffline`/`network.ts` | unit (NetInfo mockado) | Hook reflete o estado mockado do NetInfo | `src/core/offline/__tests__/network.test.ts` | `npm test -- network.test` |
| `QueryStateView` | component (RNTL) | Renderiza cada um dos 4 estados dado o prop correspondente | `src/core/ui/__tests__/QueryStateView.test.tsx` | `npm test -- QueryStateView` |
| `src/app/index.tsx` (lista) | component (RNTL) | Os 4 estados aparecem no fluxo real (loading/error/empty/success), busca dispara nova query | `src/app/__tests__/index.test.tsx` | `npm test -- app/__tests__/index` |
| `src/app/patients/[id].tsx` (detalhe) | component (RNTL) | Skeleton/erro/vazio/sucesso do detalhe; toggle desabilitado durante mutation; rollback visível no `onError` | `src/app/patients/__tests__/[id].test.tsx` | `npm test -- patients/__tests__` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After tasks with unit tests only | `npx tsc --noEmit && npm test` |
| Full | After tasks touching UI/screens | `npm run pretest && npx tsc --noEmit && npm test` |
| Build | After phase completion | `npm run pretest && npx tsc --noEmit && npm test` |

---

## Execution Plan

### Phase 1: Dependências e fundação de dados (schemas, http, api functions)

```
T1
T2
T3
T2 → T4
```

### Phase 2: Hooks de Query e utilitários

```
T4 → T5
T4 → T6
T4 → T7
T4 → T8
T1 → T9
```

### Phase 3: Componentes de UI reusáveis

```
T10
T9 → T11
```

### Phase 4: Telas (lista, detalhe) e integração final

```
T5 → T12
T10 → T12
T11 → T12
T6 → T13
T7 → T13
T10 → T13
T12 → T14
T13 → T14
```

---

## Task Breakdown

### T1: Instalar `@shopify/flash-list` e `@react-native-community/netinfo`

**What**: `npx expo install @shopify/flash-list @react-native-community/netinfo`, sem nenhum código
de aplicação ainda — só a instalação e confirmação de compatibilidade com o SDK 57.
**Where**: `mobile/package.json` (modify)
**Depends on**: None
**Reuses**: Nenhum — primeira vez que essas libs entram no projeto

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [x] `package.json` lista as duas dependências com versão compatível com Expo SDK 57
      (`npx expo install` resolve isso automaticamente)
- [x] `npx tsc --noEmit` continua limpo (nenhum import novo ainda, só a instalação)
- [x] `npm test` continua passando (suíte existente inalterada)

**Tests**: none
**Gate**: quick

**Commit**: `chore(mobile): add flash-list and netinfo dependencies`

---

### T2: Schemas zod `patient.ts` e `biomarker.ts`

**What**: `patientSchema`, `patientPageSchema` (com tipos inferidos `Patient`/`PatientPage`),
`biomarkerSchema`/`biomarkerStatusSchema` (com `Biomarker`/`BiomarkerStatus`).
**Where**: `src/core/api/schemas/patient.ts`, `src/core/api/schemas/biomarker.ts`
**Depends on**: None
**Reuses**: Padrão exato de `src/core/api/schemas/feature-flags.ts`
**Requirement**: PATMOB-01, PATMOB-10, PATMOB-14

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [ ] Nenhum tipo escrito à mão — todos via `z.infer`
- [ ] Teste unitário confirma parse de um payload válido e rejeição de payload com campo faltando
      (ex.: `needsFollowUp` ausente) para cada schema
- [ ] Gate check passes: `npx tsc --noEmit && npm test -- schemas`
- [ ] Test count: 6+ tests novos (2+ por schema)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(mobile): add Patient and Biomarker zod schemas`

---

### T3: `apiPatch` em `core/api/http.ts`

**What**: Nova função exportada `apiPatch(path, body)`, reusando `ApiError`/parse de erro/`buildUrl`
já existentes no módulo (extraídos para reuso interno se ainda não estiverem acessíveis a partir de
uma segunda função exportada).
**Where**: `src/core/api/http.ts` (modify)
**Depends on**: None
**Reuses**: `ApiError`, `isErrorEnvelope`, `buildUrl` já existentes

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [ ] `apiPatch` serializa o corpo como JSON com `Content-Type: application/json`
- [ ] Resposta não-2xx lança `ApiError` com `status`/`code`, mesmo padrão de `apiGet`
- [ ] `http.test.ts` ganha casos novos para `apiPatch` (sucesso + erro), seguindo exatamente a forma
      dos testes existentes de `apiGet`
- [ ] Gate check passes: `npx tsc --noEmit && npm test -- http.test`
- [ ] Test count: 2+ tests novos em `http.test.ts` (total do arquivo cresce de 3 para 5+)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(mobile): add apiPatch to the HTTP client`

---

### T4: Funções de API (`fetchPatients`, `fetchPatientDetail`, `fetchPatientBiomarkers`, `patchPatientFollowUp`)

**What**: 4 funções em `core/api/patients.ts`, cada uma chamando `apiGet`/`apiPatch` e validando com
`.parse()` do schema correspondente.
**Where**: `src/core/api/patients.ts`
**Depends on**: T2
**Reuses**: `apiGet` (existente), `apiPatch` (T3 — dependência de dado real acontece em Phase 1 mas
a task em si só precisa que `apiPatch` exista; ordem sequencial dentro da fase garante isso), schemas
(T2)
**Requirement**: PATMOB-01, PATMOB-10, PATMOB-15

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [ ] `fetchPatients` monta os query params (`brand`, `search` só se presente, `cursor` só se
      presente) e faz `.parse()` com `patientPageSchema`
- [ ] `fetchPatientDetail`/`fetchPatientBiomarkers`/`patchPatientFollowUp` seguem o mesmo padrão
      (fetch mockado, `.parse()` obrigatório)
- [ ] Nenhum componente importa `apiGet`/`apiPatch` diretamente — só estas 4 funções
- [ ] Gate check passes: `npx tsc --noEmit && npm test -- patients.test`
- [ ] Test count: 8+ tests novos (2 por função: sucesso + erro/schema inválido)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(mobile): add patient and biomarker API functions`

---

### T5: `usePatientsQuery` (`useInfiniteQuery`)

**What**: Hook com `queryKey: ['patients', brand.id, debouncedSearch ?? '']`,
`getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined`, `initialPageParam: undefined`.
Recebe o termo de busca **já debounced** como parâmetro (o debounce em si é responsabilidade da
screen via T9).
**Where**: `src/core/patients/usePatientsQuery.ts`
**Depends on**: T4
**Reuses**: `useTheme()` para `brand.id`, `fetchPatients` (T4) — `apiPatch` (T3) não é usado por
este hook (só de leitura), mas T3 já está concluída antes da Fase 2 começar
**Requirement**: PATMOB-01, PATMOB-05, PATMOB-06

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [ ] Trocar o parâmetro de busca entre chamadas do hook (simulando digitação) produz uma query key
      diferente e não mistura páginas da busca anterior com a nova (teste com `createTestQueryClient`
      renderizando o hook duas vezes com buscas diferentes)
- [ ] `nextCursor: null` da última página resulta em `hasNextPage: false`
- [ ] Gate check passes: `npx tsc --noEmit && npm test -- patients`
- [ ] Test count: 3+ tests novos em `usePatientsQuery.test.tsx`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(mobile): add usePatientsQuery infinite query hook`

---

### T6: `usePatientDetailQuery` e `usePatientBiomarkersQuery`

**What**: Dois hooks `useQuery` simples, query keys `['patient', id]` e `['patient', id,
'biomarkers']`.
**Where**: `src/core/patients/usePatientDetailQuery.ts`,
`src/core/patients/usePatientBiomarkersQuery.ts`
**Depends on**: T4
**Reuses**: `fetchPatientDetail`, `fetchPatientBiomarkers` (T4)
**Requirement**: PATMOB-10

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [ ] Cada hook expõe `status`/`data`/`refetch` do `useQuery` sem transformação extra
- [ ] Gate check passes: `npx tsc --noEmit && npm test -- patients`
- [ ] Test count: 2+ tests novos (1 por hook, caso feliz)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(mobile): add patient detail and biomarkers query hooks`

---

### T7: `useSetFollowUpMutation`

**What**: `useMutation` com `onMutate` (snapshot + set otimista em `['patient', id]`), `onError`
(rollback do snapshot), `onSettled` (invalida `['patient', id]` e `['patients', brandId]`).
**Where**: `src/core/patients/useSetFollowUpMutation.ts`
**Depends on**: T4
**Reuses**: `patchPatientFollowUp` (T4), `useTheme()` para `brand.id` (usado só dentro do
`onSettled`, não como dependência de dado do hook)
**Requirement**: PATMOB-15, PATMOB-16, PATMOB-17, PATMOB-18

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [ ] `onMutate` aplica o novo valor de `needsFollowUp` imediatamente no cache de `['patient', id]`
      e devolve o snapshot anterior no `context`
- [ ] `onError` restaura exatamente o snapshot anterior (teste força a `mutationFn` a rejeitar e
      confirma que o cache volta ao valor pré-mutation)
- [ ] `onSettled` invalida as 2 query keys, independente de sucesso ou erro
- [ ] `isPending` é `true` enquanto a mutation está em voo (usado por T13 para desabilitar o toggle)
- [ ] Gate check passes: `npx tsc --noEmit && npm test -- useSetFollowUpMutation`
- [ ] Test count: 4+ tests novos (otimista aplicado, rollback em erro, invalidação em sucesso,
      invalidação em erro)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(mobile): add optimistic useSetFollowUpMutation`

---

### T8: `useDebouncedValue`

**What**: Hook genérico `useDebouncedValue<T>(value, delayMs): T`.
**Where**: `src/core/patients/useDebouncedValue.ts`
**Depends on**: T4 (mesma fase por coesão; sem dependência de dado real)
**Reuses**: Nenhum — primeiro hook de debounce do projeto

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [ ] Valor só atualiza após `delayMs` sem nova mudança (teste com fake timers, `jest.advanceTimersByTime`)
- [ ] Mudança rápida sucessiva reinicia o timer (o valor intermediário nunca "vaza" para o resultado)
- [ ] Gate check passes: `npx tsc --noEmit && npm test -- useDebouncedValue`
- [ ] Test count: 2+ tests novos

**Tests**: unit
**Gate**: quick

**Commit**: `feat(mobile): add useDebouncedValue hook`

---

### T9: `core/offline/network.ts` (`setupNetworkStatusListener`, `useIsOffline`)

**What**: Liga `onlineManager` do TanStack Query ao `NetInfo.addEventListener`;
`useIsOffline()` sobre `NetInfo.useNetInfoState()`.
**Where**: `src/core/offline/network.ts`
**Depends on**: T1
**Reuses**: `queryClient`/`onlineManager` do pacote `@tanstack/react-query` (já dependência do
projeto)
**Requirement**: PATMOB-08

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [ ] `setupNetworkStatusListener()` devolve uma função de unsubscribe
- [ ] `useIsOffline()` reflete o estado mockado do `NetInfo` em teste (conectado → `false`,
      desconectado → `true`)
- [ ] Gate check passes: `npx tsc --noEmit && npm test -- network.test`
- [ ] Test count: 2+ tests novos

**Tests**: unit
**Gate**: quick

**Commit**: `feat(mobile): wire NetInfo to TanStack Query online manager`

---

### T10: `QueryStateView` (componente de estado reusável)

**What**: Componente que recebe `status`/`isEmpty`/`onRetry`/`skeleton`/`emptyState`/`errorMessage`/
`children` e decide qual dos 4 estados renderizar.
**Where**: `src/core/ui/QueryStateView.tsx`
**Depends on**: None
**Reuses**: `useTheme()` para cores/tipografia do texto de erro e do botão de retry
**Requirement**: PATMOB-02, PATMOB-03, PATMOB-04

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [ ] `status: 'pending'` renderiza `skeleton`
- [ ] `status: 'error'` renderiza `errorMessage` + botão que chama `onRetry`
- [ ] `status: 'success', isEmpty: true` renderiza `emptyState`
- [ ] `status: 'success', isEmpty: false` renderiza `children(data)`
- [ ] Nenhum literal de cor/raio/fonte — tudo via `useTheme()`
- [ ] Gate check passes: `npx tsc --noEmit && npm test -- QueryStateView`
- [ ] Test count: 4 tests novos (1 por estado)

**Tests**: component
**Gate**: quick

**Commit**: `feat(mobile): add QueryStateView reusable UI-state component`

---

### T11: `OfflineBanner`

**What**: Banner fixo, visível `WHILE useIsOffline() === true`.
**Where**: `src/core/ui/OfflineBanner.tsx`
**Depends on**: T9
**Reuses**: `useIsOffline` (T9), `useTheme()`
**Requirement**: PATMOB-08

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [ ] Banner visível quando `useIsOffline()` é `true`, ausente quando `false`
- [ ] Nenhum literal de cor/raio/fonte
- [ ] Gate check passes: `npx tsc --noEmit && npm test -- OfflineBanner`
- [ ] Test count: 2 tests novos (visível/ausente)

**Tests**: component
**Gate**: quick

**Commit**: `feat(mobile): add OfflineBanner component`

---

### T12: `src/app/index.tsx` — tela de lista

**What**: Reescreve a tela (remove `BrandProofScreen`), monta `usePatientsQuery` +
`useDebouncedValue` (aplicado ao texto do campo de busca) + `QueryStateView` + `FlashList` com dados
achatados via `useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data])`.
**Where**: `src/app/index.tsx` (rewrite)
**Depends on**: T5, T10, T11
**Reuses**: `usePatientsQuery` (T5), `useDebouncedValue` (T8, via busca), `QueryStateView` (T10),
`OfflineBanner` (T11), `useTheme()`
**Requirement**: PATMOB-01 a PATMOB-08

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [ ] Os 4 estados aparecem no fluxo real de teste (RNTL): mock de query `pending` mostra skeleton,
      `error` mostra retry, `success` com página vazia mostra `emptyState` (`theme.copy.emptyPatients`),
      `success` com itens mostra a `FlashList`
- [ ] Digitar no campo de busca (com fake timers avançando 300ms) dispara nova query com `search`
      preenchido
- [ ] `FlashList` recebe `estimatedItemSize` (valor medido do card real — ajustar observando o
      layout renderizado no simulador/device antes de fechar a task) e `keyExtractor={(p) => p.id}`
- [ ] `onEndReached` chama `fetchNextPage` quando `hasNextPage`
- [ ] `OfflineBanner` renderizado no topo da tela
- [ ] Tocar num card navega para `/patients/${id}`
- [ ] Nenhum literal de cor/raio/fonte
- [ ] Gate check passes: `npm run pretest && npx tsc --noEmit && npm test -- app/__tests__/index`
- [ ] Test count: 6+ tests novos

**Tests**: component
**Gate**: full

**Commit**: `feat(mobile): rebuild home screen as the patient wallet list`

---

### T13: `src/app/patients/[id].tsx` — tela de detalhe

**What**: Rota nova. `usePatientDetailQuery(id)` + `usePatientBiomarkersQuery(id)` +
`useSetFollowUpMutation()`. Cabeçalho do paciente, toggle de acompanhamento (desabilitado durante
`isPending`), lista de biomarcadores (com `status`, `refMin`–`refMax`) via `ScrollView` (ver Risks
do design.md — volume baixo, não é a lista que o CLAUDE.md §2.5 mira).
**Where**: `src/app/patients/[id].tsx` (new)
**Depends on**: T6, T7, T10
**Reuses**: `usePatientDetailQuery`, `usePatientBiomarkersQuery` (T6), `useSetFollowUpMutation`
(T7), `QueryStateView` (T10), `useTheme()`
**Requirement**: PATMOB-09 a PATMOB-18

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [ ] Skeleton enquanto qualquer uma das 2 queries está pendente
- [ ] Erro distinto do vazio quando qualquer uma das 2 falha, com retry
- [ ] Estado vazio de biomarcadores (copy fixa, ver Assumptions) quando a lista vem vazia
- [ ] Cada biomarcador mostra `label`, `value`, `unit`, faixa `refMin`–`refMax`, indicador de
      `status` — sem nenhum cálculo de status no componente (vem pronto do backend)
- [ ] Tocar o toggle aplica a mudança imediatamente (otimista) e o desabilita enquanto
      `useSetFollowUpMutation().isPending`
- [ ] Forçar a `mutationFn` a rejeitar (mock) mostra o toggle revertendo visivelmente para o valor
      anterior
- [ ] Nenhum literal de cor/raio/fonte
- [ ] Gate check passes: `npm run pretest && npx tsc --noEmit && npm test -- patients/__tests__`
- [ ] Test count: 7+ tests novos

**Tests**: component
**Gate**: full

**Commit**: `feat(mobile): add patient detail screen with optimistic follow-up toggle`

---

### T14: Integração final — `_layout.tsx` liga `setupNetworkStatusListener`, remoção de resíduos

**What**: `src/app/_layout.tsx` ganha `useEffect(() => setupNetworkStatusListener(), [])`; confirma
que nenhuma referência a `BrandProofScreen` sobra no projeto (arquivo antigo removido em T12, aqui
só a checagem final); roda o critério de saída completo da Fase 2 (lista com 5.000+ pacientes,
modo avião, rollback visível).
**Where**: `src/app/_layout.tsx` (modify)
**Depends on**: T12, T13
**Reuses**: `setupNetworkStatusListener` (T9)

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [ ] `grep -r "BrandProofScreen" src/` não retorna nada
- [ ] Verificação manual (com backend real rodando, seed de 5.000+ pacientes): lista rola sem travar
      visivelmente, os 4 estados aparecem em algum fluxo reproduzível, modo avião mantém a carteira
      legível (dado já buscado antes de desligar a rede), mutation de acompanhamento reverte
      visivelmente com a API derrubada
- [ ] Gate check passes: `npm run pretest && npx tsc --noEmit && npm test`

**Tests**: none (verificação manual do critério de saída da fase, registrada aqui)
**Gate**: build

**Commit**: `chore(mobile): wire network status listener and verify phase 2 exit criteria`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1
          T2
          T3
          T2 → T4
Phase 2:  T4 → T5
          T4 → T6
          T4 → T7
          T4 → T8
          T1 → T9
Phase 3:  T10
          T9 → T11
Phase 4:  T5 → T12
          T10 → T12
          T11 → T12
          T6 → T13
          T7 → T13
          T10 → T13
          T12 → T14
          T13 → T14
```

Nota: T3 (`apiPatch`) não depende de T2 (schemas) — são conceitos independentes (cliente HTTP vs.
contrato de dado) — mas ambos ficam na Fase 1 por coesão temática de "fundação". `patchPatientFollowUp`
(T4) usa `apiPatch`, então T3 precisa existir antes de T4 rodar; como os dois completam dentro da
mesma fase, em ordem sequencial (T1, T2, T3, T4), a dependência de dado está satisfeita mesmo sem
uma aresta explícita T3→T4 no diagrama — T4 continua declarando só `Depends on: T2` porque é a
única dependência de *conteúdo* real (as funções de leitura usam os schemas; só
`patchPatientFollowUp`, uma das quatro, usa `apiPatch`). T8 (Fase 2) não tem dependência de dado
com T4, mas fica na mesma fase por coesão temática (hooks utilitários).

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Instalar dependências | 1 comando, 1 arquivo (`package.json`) | ✅ Granular |
| T2: Schemas zod (2 arquivos) | 2 arquivos, 1 conceito (contrato de dado) | ✅ Granular |
| T3: `apiPatch` | 1 arquivo | ✅ Granular |
| T4: Funções de API (4 funções, 1 arquivo) | 1 arquivo, 1 conceito (camada de fetch) | ✅ Granular |
| T5: `usePatientsQuery` | 1 arquivo | ✅ Granular |
| T6: 2 hooks de detalhe | 2 arquivos, 1 conceito (leitura simples) | ✅ Granular |
| T7: `useSetFollowUpMutation` | 1 arquivo | ✅ Granular |
| T8: `useDebouncedValue` | 1 arquivo | ✅ Granular |
| T9: `network.ts` | 1 arquivo | ✅ Granular |
| T10: `QueryStateView` | 1 arquivo | ✅ Granular |
| T11: `OfflineBanner` | 1 arquivo | ✅ Granular |
| T12: Tela de lista | 1 arquivo (rewrite) | ✅ Granular |
| T13: Tela de detalhe | 1 arquivo (novo) | ✅ Granular |
| T14: Wiring final + verificação | 1 arquivo + verificação manual | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | root of Phase 1 | ✅ Match |
| T2 | None | root of Phase 1 | ✅ Match |
| T3 | None | root of Phase 1 (paralelo a T2) | ✅ Match |
| T4 | T2 | edge T2 to T4 | ✅ Match |
| T5 | T4 | edge T4 to T5 | ✅ Match |
| T6 | T4 | edge T4 to T6 | ✅ Match |
| T7 | T4 | edge T4 to T7 | ✅ Match |
| T8 | T4 | edge T4 to T8 | ✅ Match |
| T9 | T1 | edge T1 to T9 | ✅ Match |
| T10 | None | root of Phase 3 | ✅ Match |
| T11 | T9 | edge T9 to T11 | ✅ Match |
| T12 | T5, T10, T11 | edges T5/T10/T11 to T12 | ✅ Match |
| T13 | T6, T7, T10 | edges T6/T7/T10 to T13 | ✅ Match |
| T14 | T12, T13 | edges T12/T13 to T14 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1: Dependências | Config | none | none | ✅ OK |
| T2: Schemas | Data contract | unit | unit | ✅ OK |
| T3: `apiPatch` | API client | unit | unit | ✅ OK |
| T4: Funções de API | API layer | unit | unit | ✅ OK |
| T5: `usePatientsQuery` | Hook (Query) | unit | unit | ✅ OK |
| T6: Hooks de detalhe | Hook (Query) | unit | unit | ✅ OK |
| T7: `useSetFollowUpMutation` | Hook (Mutation) | unit | unit | ✅ OK |
| T8: `useDebouncedValue` | Hook (utility) | unit | unit | ✅ OK |
| T9: `network.ts` | Offline infra | unit | unit | ✅ OK |
| T10: `QueryStateView` | UI component | component | component | ✅ OK |
| T11: `OfflineBanner` | UI component | component | component | ✅ OK |
| T12: Tela de lista | Screen | component | component | ✅ OK |
| T13: Tela de detalhe | Screen | component | component | ✅ OK |
| T14: Wiring final | Integration | none (manual verification) | none | ✅ OK |

---

## Available Tools

**MCPs**: nenhum MCP de projeto disponível/necessário — todo trabalho é leitura/escrita de arquivo,
`npx expo install`, `npx tsc`, `npm test`, já cobertos pelas ferramentas padrão.
**Skills**: `react-native-expert` aplicada em todas as tasks (Expo Router, TanStack Query,
FlashList, testes RNTL/Jest). Nenhuma outra skill do projeto se aplica a este lado da feature.
