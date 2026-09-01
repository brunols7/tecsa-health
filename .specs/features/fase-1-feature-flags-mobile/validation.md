# Fase 1 — Feature Flags Mobile Validation

**Date**: 2026-09-01
**Spec**: `.specs/features/fase-1-feature-flags-mobile/spec.md`
**Diff range**: `ac48899..fa5f0c1` (branch `feat/flags`, 13 commits: T1-T10 + 2 merges + 1 docs sync)
**Verifier**: independent sub-agent (author ≠ verifier)
**Verification worktree**: detached `fa5f0c1` in an isolated scratch; real trees read-only throughout

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | `storage.ts` + deps; MMKV v4 `createMMKV` adapter behind `createSyncStoragePersister` |
| T2 | ✅ Done | `queryClient` singleton + `createTestQueryClient()`; `persistQueryClient` from `@tanstack/query-persist-client-core` |
| T3 | ✅ Done | `apiGet` returns `unknown`, `ApiError` carries `status`/`code` |
| T4 | ✅ Done | `featureFlagsSchema` `.partial()`, 3 tests |
| T5 | ✅ Done | `fetchFeatureFlags` parses via schema, propagates `ZodError` |
| T6 | ✅ Done | `useFeatureFlagsQuery`, cache key scoped by `brand.id` |
| T7 | ✅ Done | `useFlag` = `data?.[key] ?? defaults[key]` |
| T8 | ✅ Done | `useBiometricGate` state machine, 5 branch tests |
| T9 | ⚠️ Partial | Component renders `warning` **only** in the `unlocked` branch — unreachable once wired (see Gap 1) |
| T10 | ⚠️ Partial | `_layout.tsx` renders the gate screen only while `status !== 'unlocked'`, which makes T9's warning branch dead code (see Gap 1) |

All 10 tasks are marked `[x]`/Complete in `tasks.md`. T9/T10 are downgraded to Partial by this verification: each is individually correct, but their composition drops a spec-mandated user-visible behavior.

---

## Spec-Anchored Acceptance Criteria

### P1: Ler feature flag com fallback para default da marca

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| FLAGSMOB-01 — WHILE rede não chegou THEN `useFlag(key)` retorna `defaults[key]` | valor do default da marca (`false`), não `undefined` | `mobile/src/core/flags/__tests__/useFlag.test.tsx:63` — `expect(result.current).toBe(fakeBrand.defaults.aiActionsEnabled)` com `mockReturnValue(new Promise(() => {}))` (query nunca resolve) | ✅ PASS |
| FLAGSMOB-02 — WHEN resposta chega THEN retorna valor de rede, mesmo diferente do default | valor de rede (`true`) prevalece sobre default (`false`) | `mobile/src/core/flags/__tests__/useFlag.test.tsx:71,73` — `waitFor(() => expect(result.current).toBe(true))` + `expect(fakeBrand.defaults.aiActionsEnabled).toBe(false)` | ✅ PASS |
| FLAGSMOB-03 — IF `key` ausente no payload THEN retorna `defaults[key]`, nunca `undefined` | `defaults.aiActionsEnabled` (`false`), nunca `undefined` | `mobile/src/core/flags/__tests__/useFlag.test.tsx:89,95` — sonda `offlineBanner` resolve `false` (prova que a query já resolveu), depois `expect(aiActionsResult.current).toBe(fakeBrand.defaults.aiActionsEnabled)` | ✅ PASS |
| FLAGSMOB-04 — WHILE offline com valor persistido THEN retorna o persistido, não o default | valor persistido (`aiActionsEnabled: true`) sobrevive à falha de fetch | `mobile/src/core/flags/__tests__/useFeatureFlagsQuery.test.tsx:97` — `expect(result.current.data).toEqual({ aiActionsEnabled: true, offlineBanner: true })` após `setQueryData` + `mockRejectedValue` | ✅ PASS (ver nota A) |
| FLAGSMOB-05 — WHEN app reaberto após flag mudar no banco THEN eventualmente retorna o novo valor | novo valor de rede substitui o valor antigo persistido | `mobile/src/core/flags/__tests__/useFeatureFlagsQuery.test.tsx:60` — `expect(result.current.data).toEqual({ aiActionsEnabled: true, offlineBanner: false })` (fetch popula `data`) | ⚠️ Spec-precision gap (ver nota B) |
| P1-AC6 — `useFlag` é o único ponto de consumo; nenhum componente lê o cache direto | zero leituras diretas de `QueryClient`/cache fora de `useFlag` | sem `file:line` de teste. Verificado por inspeção: `useFeatureFlagsQuery` é importado só por `mobile/src/core/flags/useFlag.ts:1`; `grep` por `useQueryClient`/`getQueryData` em `mobile/src/` não retorna nada | ⚠️ Spec-precision gap (ver nota C) |

**Nota A (FLAGSMOB-04)**: o "valor persistido" é simulado por `setQueryData` em um `createTestQueryClient()` em memória. O outcome definido no spec (retorna o persistido, não o default) é asseverado com o valor exato, então conta como coberto — mas o caminho real MMKV → `persistQueryClient` → restore não tem teste automatizado (classificado como config/wiring na Test Coverage Matrix; só verificável manualmente em device).

**Nota B (FLAGSMOB-05)**: as duas metades existem separadamente (cache anterior preservado em `:97`; fetch bem-sucedido popula `data` em `:60`), mas **nenhum teste compõe as duas**: não há caso em que o cache é semeado com um valor E o fetch resolve com um valor **diferente**, provando que o novo substitui o antigo. É exatamente o comportamento distintivo do AC. Mecanismo é default do TanStack Query, risco baixo, mas a asserção específica do AC não existe.

**Nota C (P1-AC6 / colisão de ID)**: `spec.md` tem 15 ACs (P1: 6, P2: 7, P3: 2) para apenas 13 IDs de requirement. Duas ACs ficaram sem ID próprio: **P1-AC6** ("único ponto de consumo") e **P2-AC7** ("nunca lança exceção não tratada"). O ID `FLAGSMOB-06` foi reusado com dois sentidos: a tabela de Requirement Traceability do `spec.md:169` o rotula como "P2: gate bloqueia conteúdo até resolver" (T10), enquanto `design.md:149` e `tasks.md` (T7, T8) o usam como o AC de P1 "único ponto de consumo". **Ambos os comportamentos foram verificados** (P2-AC1 por teste, P1-AC6 por inspeção estrutural), então não é um gap de implementação — é um defeito de rotulagem no spec. Recomendo renumerar para 15 IDs.

### P2: Gate biométrico antes da carteira

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| FLAGSMOB-06 — WHILE gate não resolvido THEN nenhuma rota protegida renderiza | `AppTabs` ausente da árvore | `mobile/src/app/__tests__/_layout.test.tsx:36` — `expect(queryByText('AppTabsStub')).toBeNull()` com gate em `checking` | ✅ PASS |
| FLAGSMOB-07 — WHEN biometria OK THEN libera imediatamente, sem tela intermediária | `unlocked`/`reason: 'biometric'`, `AppTabs` presente | `mobile/src/core/auth/__tests__/useBiometricGate.test.tsx:51,53` — `expect(result.current.reason).toBe('biometric')` + `expect(mockedAuthenticateAsync).toHaveBeenCalledWith({ disableDeviceFallback: true })`; wiring em `mobile/src/app/__tests__/_layout.test.tsx:49` — `expect(queryByText('AppTabsStub')).toBeTruthy()` | ✅ PASS |
| FLAGSMOB-08 — IF biometria falha THEN mantém bloqueado + botão de tentar de novo, sem crash | `locked`, `retryable: true`, retry reexecuta o fluxo | `mobile/src/core/auth/__tests__/useBiometricGate.test.tsx:70,75,79` — `expect(afterFailure.retryable).toBe(true)`, depois `retry()` → `waitFor(status === 'unlocked')` + `expect(afterRetry.reason).toBe('biometric')`; botão em `mobile/src/core/ui/__tests__/BiometricGateScreen.test.tsx:109,111` — `fireEvent.press(getByText('Tentar novamente'))` + `expect(onRetry).toHaveBeenCalledTimes(1)` | ✅ PASS |
| FLAGSMOB-09 — IF hardware sim / não cadastrado THEN **aviso visível** + `authenticateAsync({ disableDeviceFallback: false })` | (a) credencial do SO disparada; (b) **aviso visível ao usuário** informando que não há biometria cadastrada | (a) `mobile/src/core/auth/__tests__/useBiometricGate.test.tsx:92,96` — `expect(result.current.reason).toBe('device_credential')` + `toHaveBeenCalledWith({ disableDeviceFallback: false })` ✅; (b) `mobile/src/core/auth/__tests__/useBiometricGate.test.tsx:93` asserta só o **valor de estado** `warning`; nenhum teste asserta o aviso **renderizado**, e ele é inalcançável na árvore montada | ❌ GAP (metade b) — ver Gap 1 |
| FLAGSMOB-10 — IF `passcode_not_set` THEN libera **exibindo aviso de segurança explícito antes de liberar** | (a) `unlocked`/`no_credential_available`; (b) **aviso de segurança exibido antes de liberar** | (a) `mobile/src/core/auth/__tests__/useBiometricGate.test.tsx:109` — `expect(result.current.reason).toBe('no_credential_available')` ✅; (b) `:110` asserta só o valor de estado `warning`; o aviso nunca chega à tela | ❌ GAP (metade b) — ver Gap 1 |
| FLAGSMOB-11 — IF `hasHardwareAsync()` false THEN mesmo caminho do item 4 | entra no ramo de fallback de credencial do SO | `mobile/src/core/auth/__tests__/useBiometricGate.test.tsx:100,109` — `mockedHasHardwareAsync.mockResolvedValue(false)` e `expect(result.current.reason).toBe('no_credential_available')`, `reason` alcançável **apenas** pelo ramo de fallback (`mobile/src/core/auth/useBiometricGate.ts:56-59`), o que prova o desvio | ✅ PASS (ver nota D) |
| P2-AC7 — nunca deixa exceção não tratada escapar para a árvore | qualquer erro resolve para um dos ramos ou para `locked`/retry | sem `file:line`. Garantido estruturalmente pelo `try/catch` em `mobile/src/core/auth/useBiometricGate.ts:29,63-65`; nenhum teste rejeita a promise de `authenticateAsync`/`hasHardwareAsync` | ⚠️ Spec-precision gap (já auto-declarado pelo autor em `tasks.md` T8 Check A) |

**Nota D (FLAGSMOB-11)**: o desvio para o ramo de fallback está provado, mas o teste que exercita `hasHardware: false` termina em `passcode_not_set`; não existe caso `hasHardware: false` + credencial de device **bem-sucedida** asseverando `reason: 'device_credential'` e o aviso de biometria ausente. Cobertura suficiente para o outcome do AC, incompleta para a combinação.

### P3: Infraestrutura de query/persist

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| FLAGSMOB-12 — `QueryClient` único persistido via MMKV, montado uma vez na raiz | um `QueryClient` exportado, ligado ao `mmkvPersister`, provido na raiz | `mobile/src/core/offline/queryClient.ts:16-21` — `export const queryClient = new QueryClient()` + `persistQueryClient({ queryClient, persister: mmkvPersister })`; montado uma vez em `mobile/src/app/_layout.tsx:33` — `<QueryClientProvider client={queryClient}>` | ✅ PASS (config/wiring, sem teste direto — conforme Test Coverage Matrix) |
| FLAGSMOB-13 — em Jest, substituível por instância em memória, sem módulo nativo MMKV | suíte roda sem erro de módulo nativo | `mobile/src/core/offline/queryClient.ts:6-14` `createTestQueryClient()` (sem persistência) + `mobile/__mocks__/react-native-mmkv.ts:7-17` (`createMMKV` em memória sobre `Map`); comprovado pelo gate: 11 suítes / 31 testes verdes, zero erro de NitroModules | ✅ PASS |

Confirmado por leitura de `mobile/__mocks__/react-native-mmkv.ts`: o mock é puro JS (`Map`), sem qualquer binding nativo. Nota: `createTestQueryClient()` mora no mesmo módulo que executa `persistQueryClient(...)` em tempo de import, então importá-lo **toca** `storage.ts`/MMKV — o mock manual é o que torna FLAGSMOB-13 verdadeiro, não o isolamento do módulo.

**Status**: ❌ Gaps present — 11/13 requirements ✅, 2 requirements com gap parcial (FLAGSMOB-09, FLAGSMOB-10), 3 spec-precision gaps (FLAGSMOB-05, P1-AC6, P2-AC7).

---

## Discrimination Sensor

Scratch isolado: `git worktree add --detach <scratch> fa5f0c1` em diretório temporário fora das árvores reais. Mutações aplicadas apenas ali, revertidas com `git checkout -- <file>` (nunca `git stash`). Baseline `git status --porcelain` capturado antes e reconferido depois.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `mobile/src/core/auth/useBiometricGate.ts:39` | `reason: 'biometric'` → `reason: 'device_credential'` no sucesso biométrico puro | ✅ Killed (2 falhas: `useBiometricGate.test.tsx` casos 1 e 2) |
| 2 | `mobile/src/core/flags/useFlag.ts:9` | Precedência invertida: `data?.[key] ?? defaults[key]` → `defaults[key] ?? data?.[key]` (default sempre vence) | ✅ Killed (2 falhas: AC2 e AC3 de `useFlag.test.tsx`) |
| 3 | `mobile/src/core/flags/useFeatureFlagsQuery.ts:12` | `queryKey: ['feature-flags', brand.id]` → `['feature-flags']` (cache vaza entre marcas) | ✅ Killed (1 falha: "preserva o cache anterior" em `useFeatureFlagsQuery.test.tsx`) |

**Sensor depth**: lightweight (3 mutações comportamentais no código de maior risco da feature)
**Result**: 3/3 killed — PASS ✅
**Isolation**: verificado — `git status --porcelain` da árvore de verificação vazio após restauração; árvore real de implementação sem qualquer modificação de `.ts`/`.tsx`; suíte completa reexecutada pós-restauração com 31/31 verdes. Scratch descartado.

---

## Interactive UAT Results

Não executada nesta rodada. O gate biométrico e os avisos de fallback são exatamente o tipo de comportamento user-facing que pede UAT em device/simulador — e é o caminho que expõe o Gap 1 visualmente (CLAUDE.md §14.8 e o "Independent Test" da P2). Recomendada antes de fechar a Fase 1.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ (ver observação 3) |
| Matches patterns | ✅ |
| Spec-anchored outcome check (asserted values match spec) | ⚠️ — 2 ACs asseveram o valor de **estado** e não o **efeito visível** exigido pelo spec (Gap 1) |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ⚠️ — hooks 1:1 com ACs de estado; camada de UI sem asserção sobre o texto de aviso |
| Every test maps to a spec requirement — no unclaimed tests | ✅ — 25 testes novos, todos rastreáveis a um AC ou Done-when |
| Documented guidelines followed: `CLAUDE.md` (§2.3, §5.2, §5.4, §5.7, §9, §12), `mobile/eslint.config.js`, `mobile/scripts/check-brand-boundary.sh` | ✅ |

Verificações de constituição executadas diretamente:

- **§2.1 fronteira de marca** — `npm run pretest` roda lint + `check-brand-boundary.sh`: "OK: nenhuma referência a marca encontrada em src/core". Testes sob `src/core/**` constroem fixtures `Brand` inline em vez de importar `@/brands`, respeitando a regra. `_layout.tsx:9` importa `@/brands`, que é o único ponto autorizado (raiz, AD-005).
- **§2.3 tipagem estrita** — `npx tsc --noEmit` limpo; zero `any`, `@ts-ignore` ou `@ts-expect-error` em todo o diff (grep confirmado). Os `as` presentes são narrowing legítimo de mocks (`as jest.MockedFunction<...>`) e de estilo achatado em teste (`BiometricGateScreen.test.tsx:14`).
- **§5.4 camada de API** — fluxo respeitado: `apiGet` devolve `unknown` (`http.ts:40`), `.parse()` só em `feature-flags.ts:8`, componente nunca chama `fetch`.
- **§5.2 zero literais de estilo** — `BiometricGateScreen.tsx` lê tudo de `useTheme()`; único literal é `flex: 1`/`textAlign`, que não são cor/raio/fonte.

Observações menores (não bloqueiam):

1. **Comentários inline reintroduzidos** — `mobile/src/core/auth/useBiometricGate.ts:69-72` traz um bloco de comentário explicativo. CLAUDE.md §12 permite comentário de "por quê", então não é violação da constituição; mas o commit imediatamente anterior nesta linha do projeto (`97d63e2 style(mobile): remove inline comments per project convention`) estabeleceu convenção de zero comentários inline. Inconsistente com a convenção vigente.
2. **Condição redundante** — `mobile/src/core/auth/useBiometricGate.ts:31,33`: `enrolled` já embute `hasHardware` (`const enrolled = hasHardware && await isEnrolledAsync()`), logo o `hasHardware &&` de novo em `if (hasHardware && enrolled)` é redundante.
3. **`package.json` além do "Where" de T1** — scripts `android`/`ios` mudaram de `expo start --*` para `expo run:*`. Fora do escopo literal da task, mas diretamente justificado pelo Done-when de T1 (MMKV exige dev client nativo reconstruído). Aceito como necessário, não como scope creep.
4. **`BiometricGateScreen` tem um ramo morto** — o bloco `status === 'unlocked'` (`BiometricGateScreen.tsx:95-119`) é inalcançável na árvore montada; `_layout.tsx:24` sequer passa a prop `reason`. É a causa raiz do Gap 1.

---

## Edge Cases

- [x] **Fetch falha sem cache anterior → default da marca, sem propagar erro para a UI** — `mobile/src/core/flags/__tests__/useFeatureFlagsQuery.test.tsx:75,77` (`isError` true, `data` undefined) composto com `mobile/src/core/flags/__tests__/useFlag.test.tsx:63` (`data` undefined → `defaults[key]`). `useFlag` não expõe `error`, então nada vaza para o consumidor. Nota: nenhum teste único compõe erro → default no mesmo `render`.
- [x] **Cancelamento do prompt biométrico tratado como falha** — `mobile/src/core/auth/__tests__/useBiometricGate.test.tsx:118,125` — `mockResolvedValue({ success: false, error: 'user_cancel' })` → `expect(result.current.retryable).toBe(true)` com status `locked`. Distinto de sucesso e de `passcode_not_set`, exatamente como o spec pede.
- [x] **Cache de flags escopado por `brandId`** — `mobile/src/core/flags/useFeatureFlagsQuery.ts:12` (`queryKey: ['feature-flags', brand.id]`), asseverado indiretamente em `useFeatureFlagsQuery.test.tsx:83-86,97` e **empiricamente confirmado** pela mutação 3 do sensor (remover `brand.id` mata o teste).

---

## Gate Check

- **Gate command**: `npx tsc --noEmit && npm run pretest && npm test` (Build gate, `tasks.md` → Gate Check Commands)
- **Result**: 31 passed, 0 failed, 0 skipped (11 suítes)
- **Test count before feature**: 6
- **Test count after feature**: 31
- **Delta**: +25 novos testes
- **Skipped tests**: nenhum
- **Failures**: nenhuma
- **`tsc --noEmit`**: limpo
- **`npm run pretest`**: lint limpo + "OK: nenhuma referência a marca encontrada em src/core"

**Nota de ambiente (não é defeito de código)**: em checkout limpo, `npx tsc --noEmit` falha inicialmente com dois `TS2307/TS2882` em `src/components/animated-icon.web.tsx:5` e `src/constants/theme.ts:6`, porque `mobile/expo-env.d.ts` é gitignorado e gerado pelo Expo. Regenerado com `npx expo customize tsconfig.json` (não alterou nenhum arquivo versionado); depois disso o gate passa limpo. Vale documentar no README do mobile — qualquer clone novo bate nisso.

**Test Integrity Check**: contagem subiu de 6 → 31, nenhum teste removido, nenhuma asserção preexistente enfraquecida (`index.test.tsx` e `checkBrandBoundary.test.ts` passam sem modificação). Um aviso benigno do Jest ("worker process has failed to exit gracefully") persiste, originado do listener de `persistQueryClient` no módulo real importado pelos testes de query; não afeta o resultado (exit 0).

---

## Fix Plans

### Fix 1 (Blocker do ponto de vista de AC): o aviso de fallback nunca é exibido ao usuário

- **Requirements**: FLAGSMOB-09 (metade "aviso visível"), FLAGSMOB-10 (metade "exibindo um aviso de segurança explícito antes de liberar")
- **Root cause**: `mobile/src/core/ui/BiometricGateScreen.tsx:106` renderiza `warning` **apenas** dentro do bloco `status === 'unlocked'` (`:95-119`), enquanto `mobile/src/app/_layout.tsx:23-27` renderiza `BiometricGateScreen` **apenas** quando `gate.status !== 'unlocked'` (caso contrário retorna `<AppTabs />`). As duas condições são mutuamente exclusivas, portanto o texto de aviso é inalcançável em qualquer estado do app real. Os ramos `checking` (`:28-50`) e `locked` (`:52-93`) ignoram a prop `warning`. `_layout.tsx:24` nem passa `reason`.
  - Consequência concreta em FLAGSMOB-10: em device sem nenhuma credencial, o hook seta o aviso e `unlocked` no mesmo ciclo (`useBiometricGate.ts:57-58`), o app pula direto para `AppTabs` e o usuário entra na carteira **sem nunca ver** "acesso liberado sem verificação". É exatamente o cenário que o spec (e CLAUDE.md §9) exige que seja explícito.
  - Consequência concreta em FLAGSMOB-09: o aviso de biometria ausente é setado em `useBiometricGate.ts:46` enquanto o status ainda é `checking`, mas o ramo `checking` não renderiza `warning` — o aviso passa despercebido antes do prompt do SO.
- **Por que os testes não pegaram**: `useBiometricGate.test.tsx:93,110` asseveram o **valor de estado** `warning`, não o efeito visível; `BiometricGateScreen.test.tsx:114-129` passa `warning` nas variantes mas só faz smoke render (`render`+`unmount`), sem nenhuma asserção sobre o texto; `_layout.test.tsx:30,43` mocka o gate com `warning: undefined` nos dois casos.
- **Fix task**:
  - **What**: fazer o aviso aparecer em estado alcançável. Duas opções: (a) renderizar `warning` também nos ramos `checking` e `locked` de `BiometricGateScreen`; e (b) para `passcode_not_set`, introduzir um passo de reconhecimento antes de liberar (ex.: estado `unlocked_with_warning` que renderiza o aviso com um botão "Entendi, continuar") para satisfazer literalmente "antes de liberar".
  - **Where**: `mobile/src/core/ui/BiometricGateScreen.tsx`, `mobile/src/app/_layout.tsx`, possivelmente `mobile/src/core/auth/useBiometricGate.ts`
  - **Verify**: teste em `BiometricGateScreen.test.tsx` asseverando `getByText(<texto do aviso>)` com `status="checking"` e com `status="locked"`; teste em `_layout.test.tsx` com o gate mockado em `passcode_not_set` afirmando que o aviso está na árvore e que `AppTabs` só aparece após o reconhecimento.
  - **Done when**: existe asserção `file:line` de que o texto do aviso é renderizado em um estado que o app realmente atinge, para os dois ramos (biometria ausente e sem credencial).
- **Priority**: Major (requisito de segurança user-facing do CLAUDE.md §9 não observável; nenhum crash envolvido)

### Fix 2 (Minor): asserção faltante para FLAGSMOB-05

- **Root cause**: nenhum teste semeia o cache com um valor e resolve o fetch com um valor **diferente**.
- **Fix task**: em `useFeatureFlagsQuery.test.tsx`, `setQueryData(['feature-flags','brand-a'], { aiActionsEnabled: false })` + `mockResolvedValue({ aiActionsEnabled: true })` e `waitFor` até `data.aiActionsEnabled === true`.
- **Priority**: Minor

### Fix 3 (Minor): P2-AC7 sem teste de exceção

- **Root cause**: nenhum teste faz `hasHardwareAsync`/`authenticateAsync` **rejeitarem**; o `catch` de `useBiometricGate.ts:63-65` não é exercitado.
- **Fix task**: teste com `mockRejectedValue(new Error('sensor indisponível'))` afirmando `status === 'locked'` e `retryable === true`, sem throw.
- **Priority**: Minor

### Fix 4 (Cosmetic): rotulagem de requirements no spec

- **Root cause**: 15 ACs para 13 IDs; `FLAGSMOB-06` usado com dois sentidos distintos entre `spec.md:169` e `design.md:149`/`tasks.md`.
- **Fix task**: renumerar para 15 IDs, dando ID próprio a P1-AC6 e P2-AC7, e alinhar `design.md`/`tasks.md`.
- **Priority**: Cosmetic (não afeta comportamento; afeta rastreabilidade)

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| FLAGSMOB-01 | Complete (T7) | ✅ Verified |
| FLAGSMOB-02 | Complete (T6, T7) | ✅ Verified |
| FLAGSMOB-03 | Complete (T7) | ✅ Verified |
| FLAGSMOB-04 | Complete (T6) | ✅ Verified |
| FLAGSMOB-05 | Complete (T6) | ⚠️ Verified com spec-precision gap (Fix 2) |
| FLAGSMOB-06 | Complete (T10) | ✅ Verified (P2-AC1); ver Fix 4 sobre a colisão de ID |
| FLAGSMOB-07 | Complete (T8) | ✅ Verified |
| FLAGSMOB-08 | Complete (T8) | ✅ Verified |
| FLAGSMOB-09 | Complete (T8) | ❌ Needs Fix (metade "aviso visível" — Fix 1) |
| FLAGSMOB-10 | Complete (T8) | ❌ Needs Fix (metade "aviso antes de liberar" — Fix 1) |
| FLAGSMOB-11 | Complete (T8) | ✅ Verified |
| FLAGSMOB-12 | Complete (T1, T2) | ✅ Verified |
| FLAGSMOB-13 | Complete (T2, T6, T7) | ✅ Verified |
| P1-AC6 (sem ID) | — | ⚠️ Verified por inspeção, sem teste (Fix 4) |
| P2-AC7 (sem ID) | — | ⚠️ Spec-precision gap (Fix 3) |

---

## Summary

**Overall**: ⚠️ Issues — não pronto para fechar a Fase 1 sem o Fix 1

**Spec-anchored check**: 11/13 requirements com asserção casando o outcome do spec; 2 requirements (FLAGSMOB-09, FLAGSMOB-10) com metade do outcome não satisfeita; 3 spec-precision gaps (FLAGSMOB-05, P1-AC6, P2-AC7)
**Sensor**: 3/3 mutações mortas
**Gate**: 31 passed, 0 failed, 0 skipped; `tsc` limpo; fronteira de marca limpa

**What works**:

- `useFlag` cobre os quatro comportamentos exigidos (default enquanto pendente, valor de rede, key ausente, valor persistido) com asserções que casam os valores exatos do spec.
- Cache escopado por marca é real e empiricamente protegido — remover `brand.id` da `queryKey` mata um teste.
- Máquina de estado do gate cobre os 5 ramos, incluindo cancelamento tratado como falha e `passcode_not_set` liberando em vez de travar o usuário.
- `AppTabs` comprovadamente não renderiza antes de `unlocked` — a garantia central do CLAUDE.md §9 está de pé.
- Infra de query/persist entregue e testável sem módulo nativo: 31 testes verdes com o mock em memória de MMKV.
- Arquitetura respeita a constituição: zero `any`, `tsc` limpo, fronteira de marca limpa, `core/` sem import de `brands/` fora da raiz.

**Issues found**:

1. **Gap 1 (Major)** — o texto de aviso dos ramos de fallback é inalcançável: `BiometricGateScreen.tsx:106` só o renderiza sob `status === 'unlocked'`, e `_layout.tsx:23-27` só monta a tela quando `status !== 'unlocked'`. FLAGSMOB-09 e FLAGSMOB-10 exigem aviso **visível**; hoje ele existe apenas como estado. Ver Fix 1.
2. **Fix 2 (Minor)** — FLAGSMOB-05 sem a asserção que distingue o AC (novo valor substituindo o persistido).
3. **Fix 3 (Minor)** — P2-AC7 sem teste de promise rejeitada.
4. **Fix 4 (Cosmetic)** — `FLAGSMOB-06` com dois sentidos; 15 ACs para 13 IDs.

**Next steps**: aplicar o Fix 1 (bloqueia o fechamento da Fase 1, pois o critério de saída "app funciona em device sem biometria cadastrada — fallback visível" depende exatamente do aviso ser visível), depois Fixes 2 e 3 para fechar os spec-precision gaps, e Fix 4 na renumeração do spec. Reverificar com o mesmo gate build e reexecutar o sensor sobre o código alterado. Recomendada UAT em simulador sem biometria após o Fix 1.
