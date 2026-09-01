# Fase 1 — Feature Flags Mobile Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its
Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is
the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review,
Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/fase-1-feature-flags-mobile/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase (`mobile/src/app/__tests__/index.test.tsx`,
> `mobile/src/brands/__tests__/index.test.ts`, `mobile/scripts/__tests__/*.test.ts`,
> `mobile/package.json` jest preset) and project guidelines (`CLAUDE.md` §10, §5.4, §5.7, §9).
> Guidelines found: `CLAUDE.md`, `mobile/package.json` (`scripts.pretest`, `scripts.test`,
> `scripts.lint`), `mobile/tsconfig.json` (`strict: true`).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Pure utility (`http.ts`, `schemas/feature-flags.ts`, `storage.ts` adapter) | unit | Happy path + malformed/error input per function; schema tested against valid, partial, and invalid payloads | `src/core/**/__tests__/*.test.ts` | `npm test` |
| Hooks (`useFeatureFlagsQuery`, `useFlag`, `useBiometricGate`) | unit (React Testing Library `renderHook`) | 1:1 to spec ACs: every branch listed in the spec's Acceptance Criteria for that hook | `src/core/**/__tests__/*.test.tsx` | `npm test` |
| Components (`BiometricGateScreen`) | unit (render, both brands) | Renders with distinct tokens per brand (mirrors existing `index.test.tsx` pattern); each visible state (checking/warning/no-credential) renders without throwing | `src/core/ui/__tests__/*.test.tsx` | `npm test` |
| Integration (`_layout.tsx` gate wiring) | unit (render) | Gate blocks `AppTabs` before resolution; renders it after `unlocked` | `src/app/__tests__/*.test.tsx` | `npm test` |
| Config/wiring (`queryClient.ts` non-persisted factory, dependency install) | none | Exercised indirectly by every hook test above via `createTestQueryClient()` | — | build gate only (`npx tsc --noEmit`) |

## Gate Check Commands

> Generated from `mobile/package.json` scripts.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After tasks with unit tests only, no lint-sensitive change | `npm test` |
| Full | After tasks touching `core/` boundary-sensitive files or adding imports | `npm run pretest && npm test` |
| Build | After phase completion | `npx tsc --noEmit && npm run pretest && npm test` |

---

## Execution Plan

### Phase 1: Offline/query foundation

```
T1 → T2
```

### Phase 2: Typed API layer

```
T3
T4
T3 → T5
T4 → T5
```

### Phase 3: Flags hook

```
T6 → T7
```

### Phase 4: Biometric gate

```
T8 → T9
```

### Phase 5: Integration at app root

```
T10
```

---

## Task Breakdown

### T1: Instalar dependências e criar `core/offline/storage.ts`

**What**: `npm install react-native-mmkv @tanstack/react-query @tanstack/query-sync-storage-persister
zod expo-local-authentication`; criar `mmkvStorage` (instância MMKV) e `mmkvPersister` (adapter
`Persister` sobre MMKV) em `core/offline/storage.ts`.
**Where**: `mobile/package.json` (modify), `src/core/offline/storage.ts` (new)
**Depends on**: None
**Reuses**: Nenhum — primeira dependência de rede/estado/persistência do projeto
**Requirement**: FLAGSMOB-12

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [x] Dependências instaladas, `package.json`/`package-lock.json` atualizados
- [x] Dev client reconstruído (`npx expo prebuild` ou equivalente) — MMKV exige módulo nativo,
      registrado como passo explícito, não assumido
- [x] `mmkvStorage` é uma instância MMKV nomeada (`id: 'tecsa-health-cache'`)
- [x] `mmkvPersister` implementa a interface `Persister` esperada pelo `@tanstack/react-query`
      (`persistClient`/`restoreClient`/`removeClient`), síncrono sobre MMKV
- [x] `npx tsc --noEmit` limpo

**Tests**: none
**Gate**: build

**Commit**: `feat(mobile): add MMKV storage and query persister adapter`

**Status**: ✅ Complete — `npx expo prebuild --no-install` gerou `ios/`/`android/` (gitignorados,
regenerados a partir do managed workflow). `mmkvPersister` usa `createSyncStoragePersister` sobre
um adapter síncrono (`getItem`/`setItem`/`removeItem`) que chama `getString`/`set`/`remove` da
instância MMKV v4 (`createMMKV`). Gate build (`tsc --noEmit && pretest && test`) passa limpo: 6
testes existentes, 0 falhas (T1 não adiciona teste, conforme Test Coverage Matrix).

---

### T2: Criar `core/offline/queryClient.ts`

**What**: `QueryClient` único exportado (`queryClient`), configurado com `persistQueryClient` usando
`mmkvPersister`; `createTestQueryClient()` sem persistência para uso em testes.
**Where**: `src/core/offline/queryClient.ts`
**Depends on**: T1
**Reuses**: `mmkvPersister` de T1
**Requirement**: FLAGSMOB-12, FLAGSMOB-13

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [x] `queryClient` é uma instância única de `QueryClient`, persistida via `persistQueryClient` na
      importação do módulo
- [x] `createTestQueryClient()` devolve um `QueryClient` novo, sem qualquer persistência, sem tocar
      MMKV
- [x] `npx tsc --noEmit` limpo

**Tests**: none
**Gate**: build

**Commit**: `feat(mobile): add persisted QueryClient singleton`

**Status**: ✅ Complete — `persistQueryClient` (de `@tanstack/query-persist-client-core`, o pacote
onde a função realmente vive; `@tanstack/react-query` reexporta os hooks, não essa função) chamado
no import do módulo, ligando `queryClient` ao `mmkvPersister` de T1. `createTestQueryClient()` cria
um `QueryClient` novo com `retry: false` nas queries (evita retries lentos em teste) e nunca importa
`storage.ts`/MMKV. Gate build limpo: 6 testes existentes, 0 falhas.

---

### T3: Criar `core/api/http.ts`

**What**: `apiGet<T>(path, params?)` sobre `fetch`, base URL de `EXPO_PUBLIC_API_URL`; classe
`ApiError extends Error { status: number; code?: string }` para erros de rede/HTTP não-2xx.
**Where**: `src/core/api/http.ts`
**Depends on**: None
**Reuses**: `EXPO_PUBLIC_API_URL` já existente em `.env`

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [x] `apiGet` monta a query string a partir de `params`, devolve `unknown` (JSON cru, sem parse)
- [x] Resposta não-2xx lança `ApiError` com `status` e, se o corpo seguir o envelope do backend,
      `code`
- [x] Teste unitário cobre: sucesso (mock de `fetch` global), erro 4xx/5xx vira `ApiError`, erro de
      rede (rejeição de `fetch`) propaga como erro
- [x] Gate check passes: `npm test`
- [x] Test count: 3 tests novos em `src/core/api/__tests__/http.test.ts`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(mobile): add typed HTTP client`

**Status**: ✅ Complete — `apiGet(path, params?)` sem generic `<T>` (o generic do design.md não é
referenciado no tipo de retorno, que já é `Promise<unknown>`; mantido sem `<T>` morto). Query string
montada manualmente (`encodeURIComponent` + join), sem depender de `URL`/`URLSearchParams` globais
— não polyfilled por padrão no Hermes/RN deste projeto. `npm test`: 9 passed (3 novos), lint e
boundary check limpos.

*Check A:*

| Done-when criterion | file:line + assertion | Spec-defined outcome | Covered? |
| --- | --- | --- | --- |
| `apiGet` devolve `unknown` sem parse | `http.test.ts:16-19` `await apiGet(...)`; `expect(result).toEqual({ aiActionsEnabled: true })` | JSON cru devolvido tal qual | ✅ Yes |
| Resposta não-2xx lança `ApiError` com `status`/`code` | `http.test.ts:24-30` `.rejects.toMatchObject({ status: 404, code: 'PATIENT_NOT_FOUND' })` + `.rejects.toBeInstanceOf(ApiError)` | status e code do envelope propagados | ✅ Yes |
| Erro de rede propaga | `http.test.ts:35` `.rejects.toThrow('Network request failed')` | erro original propaga, não é engolido | ✅ Yes |

*Check C:* os 3 testes mapeiam 1:1 para os 3 casos do "Done when" — nenhum teste especulativo, todos mantidos.

---

### T4: Criar `core/api/schemas/feature-flags.ts`

**What**: `featureFlagsSchema = z.object({ aiActionsEnabled: z.boolean(), offlineBanner: z.boolean()
}).partial()`; `type FeatureFlagsResponse = z.infer<typeof featureFlagsSchema>`.
**Where**: `src/core/api/schemas/feature-flags.ts`
**Depends on**: None
**Reuses**: Nomeia as mesmas keys de `FeatureFlags` em `core/theme/brand.types.ts`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Schema aceita payload completo (`{ aiActionsEnabled: true, offlineBanner: false }`)
- [x] Schema aceita payload parcial (`{}`, só uma key)
- [x] Schema rejeita payload com tipo errado (`{ aiActionsEnabled: "true" }`) — `.safeParse` retorna
      `success: false`
- [x] Gate check passes: `npm test`
- [x] Test count: 3 tests novos em `src/core/api/schemas/__tests__/feature-flags.test.ts`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(mobile): add feature flags zod schema`

**Status**: ✅ Complete — schema nomeia as mesmas duas keys de `FeatureFlags`
(`core/theme/brand.types.ts`), `.partial()` conforme design.md. `npm test`: 12 passed (3 novos).

*Check A:*

| Done-when criterion | file:line + assertion | Spec-defined outcome | Covered? |
| --- | --- | --- | --- |
| Aceita payload completo | `feature-flags.test.ts:5-9` `safeParse({aiActionsEnabled:true,offlineBanner:false})`; `expect(result.success).toBe(true)` + `expect(result.data).toEqual(...)` | `success: true`, dado preservado | ✅ Yes |
| Aceita payload parcial (`{}` e uma key) | `feature-flags.test.ts:12-19` dois `safeParse` (`{}` e `{aiActionsEnabled:true}`), ambos `success: true` | `.partial()` — nenhuma key obrigatória | ✅ Yes |
| Rejeita tipo errado | `feature-flags.test.ts:22-25` `safeParse({aiActionsEnabled:'true'})`; `expect(result.success).toBe(false)` | `success: false` | ✅ Yes |

*Check C:* os 3 testes mapeiam 1:1 para os 3 casos do "Done when" — nenhum teste especulativo.

---

### T5: Criar `core/api/feature-flags.ts`

**What**: `fetchFeatureFlags(brandId: string): Promise<FeatureFlagsResponse>` — chama
`apiGet('/api/v1/feature-flags', { brand: brandId })`, valida com `featureFlagsSchema.parse`.
**Where**: `src/core/api/feature-flags.ts`
**Depends on**: T3, T4
**Reuses**: `apiGet` (T3), `featureFlagsSchema` (T4)
**Requirement**: FLAGSMOB-01, FLAGSMOB-02, FLAGSMOB-03

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [x] `fetchFeatureFlags` chama `apiGet` com o path e `brand` corretos
- [x] Resposta válida é parseada e devolvida como `FeatureFlagsResponse`
- [x] Resposta que falha o `.parse()` (schema) propaga o erro do zod, não engole silenciosamente
- [x] Gate check passes: `npm test`
- [x] Test count: 2 tests novos em `src/core/api/__tests__/feature-flags.test.ts` (mock de `apiGet`)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(mobile): add fetchFeatureFlags typed fetch function`

**Status**: ✅ Complete — `jest.mock('@/core/api/http')` isola `fetchFeatureFlags` de rede real.
`npm test`: 14 passed (2 novos).

*Check A:*

| Done-when criterion | file:line + assertion | Spec-defined outcome | Covered? |
| --- | --- | --- | --- |
| Chama `apiGet` com path e `brand` corretos | `feature-flags.test.ts:16-18` `expect(mockedApiGet).toHaveBeenCalledWith('/api/v1/feature-flags', {brand:'demo-brand'})` | path/params exatos do design.md | ✅ Yes |
| Resposta válida parseada e devolvida | `feature-flags.test.ts:19` `expect(result).toEqual({aiActionsEnabled:true,offlineBanner:false})` | dado validado devolvido intacto | ✅ Yes |
| `.parse()` que falha propaga erro do zod | `feature-flags.test.ts:22-25` `mockedApiGet.mockResolvedValue({aiActionsEnabled:'not-a-boolean'})`; `.rejects.toThrow()` | erro propaga, não é engolido | ✅ Yes |

*Check C:* os 2 testes mapeiam 1:1 para os 2 casos do "Done when" (o 3º item, "resposta válida
parseada", é coberto pela mesma asserção do 1º teste — nenhum teste especulativo).

---

### T6: Criar `core/flags/useFeatureFlagsQuery.ts`

**What**: `useFeatureFlagsQuery(): UseQueryResult<FeatureFlagsResponse>` — `useQuery({ queryKey:
['feature-flags', brand.id], queryFn: () => fetchFeatureFlags(brand.id) })`, `brand` lido de
`useTheme()`.
**Where**: `src/core/flags/useFeatureFlagsQuery.ts`
**Depends on**: T2, T5
**Reuses**: `useTheme()` existente, `fetchFeatureFlags` (T5), `createTestQueryClient` (T2) nos testes
**Requirement**: FLAGSMOB-02, FLAGSMOB-04, FLAGSMOB-05

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [x] Chave de cache inclui `brand.id` — duas marcas nunca compartilham entrada de cache (edge case
      do spec)
- [x] Teste com `QueryClientProvider` + `createTestQueryClient()` cobre: sucesso popula `data`,
      falha de rede deixa `data` undefined (sem cache anterior), cache anterior via `setQueryData`
      simulando MMKV restaurado é preservado quando o fetch novo falha
- [x] Gate check passes: `npm test`
- [x] Test count: 3 tests novos em `src/core/flags/__tests__/useFeatureFlagsQuery.test.tsx`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(mobile): add useFeatureFlagsQuery hook`

**Status**: ✅ Complete — `brand` lido de `useTheme()` (nunca de `@/brands`, respeitando a fronteira
de marca). Testes usam um fixture `Brand` construído inline no teste (não importado de
`src/brands`, proibido dentro de `src/core/**` por `eslint.config.js`), com `BrandProvider` +
`QueryClientProvider(createTestQueryClient())`.

**Achado durante a task (fora do escopo do "Where" original, necessário para o gate passar):**
importar `createTestQueryClient` de `core/offline/queryClient.ts` também executa, a nível de
módulo, o `new QueryClient()` + `persistQueryClient(...)` do `queryClient` real (o arquivo tem os
dois exports juntos, por design), o que importa `storage.ts` e tenta carregar o módulo nativo
`react-native-mmkv` — inexistente sob Jest, quebrando a suíte inteira com "Failed to get
NitroModules". Adicionado `mobile/__mocks__/react-native-mmkv.ts` (mock manual reconhecido
automaticamente pelo Jest para pacotes de `node_modules`, sem precisar de `jest.mock()` em cada
teste) com uma implementação em memória (`Map`) de `createMMKV`. Isso é o que viabiliza
`createTestQueryClient()` como "padrão oficial de teste" (nota de risco do design.md) — sem o mock,
nenhum hook de query seria testável. `npm test`: 17 passed (3 novos). Aviso benigno do Jest ("worker
process has failed to exit gracefully") aparece após a suíte, ligado a um listener interno do
`persistQueryClient` do módulo real que não é encerrado entre arquivos de teste; não afeta o
resultado (exit code 0, 17/17).

*Check A:*

| Done-when criterion | file:line + assertion | Spec-defined outcome | Covered? |
| --- | --- | --- | --- |
| Chave de cache inclui `brand.id` | `useFeatureFlagsQuery.test.tsx:83-86,93-97` `queryClient.setQueryData(['feature-flags', fakeBrand.id], {...})` seguido de `expect(result.current.data).toEqual({...})` — só bate se o hook usar a mesma chave | cache por marca, nunca compartilhado | ✅ Yes |
| Sucesso popula `data` | `useFeatureFlagsQuery.test.tsx:58-61` `expect(result.current.data).toEqual({aiActionsEnabled:true,offlineBanner:false})` | valor de rede no `data` | ✅ Yes |
| Falha sem cache anterior → `data` undefined | `useFeatureFlagsQuery.test.tsx:75-77` `expect(result.current.data).toBeUndefined()` | nenhum dado, sem crash | ✅ Yes |
| Cache anterior preservado quando fetch novo falha | `useFeatureFlagsQuery.test.tsx:95-97` `expect(result.current.data).toEqual({aiActionsEnabled:true,offlineBanner:true})` | valor persistido mantido | ✅ Yes |

*Check C:* os 3 testes mapeiam 1:1 para os 3 casos do "Done when" (a cobertura de `brand.id` na
chave é um efeito colateral verificável do 3º teste, não um 4º teste separado) — nenhum teste
especulativo.

---

### T7: Criar `core/flags/useFlag.ts`

**What**: `useFlag(key: keyof FeatureFlags): boolean` — `useFeatureFlagsQuery().data?.[key] ??
useTheme().defaults[key]`.
**Where**: `src/core/flags/useFlag.ts`
**Depends on**: T6
**Reuses**: `useFeatureFlagsQuery` (T6), `useTheme()`
**Requirement**: FLAGSMOB-01, FLAGSMOB-02, FLAGSMOB-03, FLAGSMOB-06

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [ ] Enquanto a query está `pending`, retorna `defaults[key]` da marca ativa (AC1)
- [ ] Quando a query resolve com valor para `key`, retorna o valor de rede, mesmo diferente do
      default (AC2)
- [ ] Quando a query resolve mas `key` está ausente do payload, retorna `defaults[key]` (AC3, nunca
      `undefined`)
- [ ] Gate check passes: `npm test`
- [ ] Test count: 3 tests novos em `src/core/flags/__tests__/useFlag.test.tsx`, um por AC acima

**Tests**: unit
**Gate**: quick

**Commit**: `feat(mobile): add useFlag public hook`

---

### T8: Criar `core/auth/useBiometricGate.ts`

**What**: Hook de máquina de estado implementando o fluxo combinado de fallback decidido no
context.md (biometria → credencial de device → `passcode_not_set` → libera com aviso; falha/cancela
→ retry).
**Where**: `src/core/auth/useBiometricGate.ts`
**Depends on**: None
**Reuses**: Nenhum — primeira peça de `core/auth/`
**Requirement**: FLAGSMOB-06, FLAGSMOB-07, FLAGSMOB-08, FLAGSMOB-09, FLAGSMOB-10, FLAGSMOB-11

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [ ] `hasHardwareAsync() && isEnrolledAsync()` ambos `true` → `authenticateAsync()` sem fallback de
      device; sucesso → `{ status: 'unlocked', reason: 'biometric' }` (AC2); falha ou cancelamento →
      `{ status: 'locked', retryable: true }` (AC3, edge case de cancelamento)
- [ ] Hardware ausente OU não cadastrado → `authenticateAsync({ disableDeviceFallback: false })`;
      sucesso → `unlocked/device_credential` (AC4); erro `passcode_not_set` →
      `unlocked/no_credential_available` (AC5); outra falha/cancelamento → `locked` com retry (AC6
      trata ausência de hardware pelo mesmo caminho)
- [ ] Nenhum erro de `expo-local-authentication` propaga como exceção não tratada — todo `catch`
      resolve para um dos estados acima (AC7)
- [ ] `retry()` reseta o estado para `checking` e reexecuta o fluxo
- [ ] Teste mocka `expo-local-authentication` (`hasHardwareAsync`, `isEnrolledAsync`,
      `authenticateAsync`) para cada um dos 5 ramos (biometria OK, falha biométrica, device
      credential OK, passcode_not_set, cancelamento)
- [ ] Gate check passes: `npm test`
- [ ] Test count: 5 tests novos em `src/core/auth/__tests__/useBiometricGate.test.tsx`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(mobile): add useBiometricGate hook`

---

### T9: Criar `core/ui/BiometricGateScreen.tsx`

**What**: Componente puro que recebe `status`/`reason`/`warning`/`retry` de `useBiometricGate` e
renderiza a tela de gate (verificando / aviso de biometria ausente / aviso de sem credencial / botão
de retry), usando tokens e copy da marca ativa.
**Where**: `src/core/ui/BiometricGateScreen.tsx`
**Depends on**: T8
**Reuses**: `useTheme()`, tipo de retorno de `useBiometricGate` (T8)

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [ ] Nenhum literal de cor/raio/tamanho de fonte — tudo via `useTheme()`
- [ ] Renderiza sem erro nas duas marcas, para cada `status`/`reason` possível (segue o padrão de
      `index.test.tsx` — comparar tokens aplicados entre marcas)
- [ ] Botão de retry só aparece quando `status === 'locked'`
- [ ] Gate check passes: `npm test`
- [ ] Test count: 4 tests novos em `src/core/ui/__tests__/BiometricGateScreen.test.tsx`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(mobile): add BiometricGateScreen component`

---

### T10: Integrar gate e `QueryClientProvider` em `_layout.tsx`

**What**: `_layout.tsx` ganha `QueryClientProvider` (envolvendo `BrandProvider`, sem mudar a ordem
existente) e passa a renderizar `BiometricGateScreen` (com `onRetry`) enquanto
`useBiometricGate().status !== 'unlocked'`, só então renderizando `AppTabs`.
**Where**: `src/app/_layout.tsx` (modify)
**Depends on**: T2, T9
**Reuses**: `BrandProvider`, `AppTabs`, `AnimatedSplashOverlay` (nenhum muda), `queryClient` (T2),
`BiometricGateScreen` (T9), `useBiometricGate` (T8)
**Requirement**: FLAGSMOB-06, FLAGSMOB-07

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [ ] `AppTabs` nunca renderiza antes de `status === 'unlocked'` (AC1) — verificado por teste que
      mocka `useBiometricGate` retornando `checking`/`locked` e afirma que `AppTabs` não está na
      árvore
- [ ] `AppTabs` renderiza assim que `status === 'unlocked'` (AC2/AC4/AC5), sem tela intermediária
- [ ] Fetch de flags (via `useFeatureFlagsQuery`, indiretamente por qualquer consumidor futuro) roda
      independente do gate — não é bloqueado pelo `QueryClientProvider` estar "atrás" do gate
- [ ] `index.test.tsx` existente continua passando sem modificação de expectativa (só precisa do
      `QueryClientProvider` no wrapper de teste, se `useTheme`/`BrandProvider` sozinhos não bastarem
      mais para renderizar a árvore completa)
- [ ] Gate check passes: `npx tsc --noEmit && npm run pretest && npm test`
- [ ] Test count: 2 tests novos em `src/app/__tests__/_layout.test.tsx`, todos os testes existentes
      (contagem atual do projeto) continuam passando

**Tests**: unit
**Gate**: build

**Commit**: `feat(mobile): wire biometric gate and QueryClientProvider at app root`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 → T2
Phase 2:  T3 → T5
          T4 → T5
Phase 3:  T2 → T6
          T5 → T6
          T6 → T7
Phase 4:  T8 → T9
Phase 5:  T2 → T10
          T9 → T10
```

Execução dentro de cada fase é estritamente sequencial na ordem numérica (T1 antes de T2, etc.); o
diagrama acima mostra só as arestas de dependência real entre tasks, não a ordem de leitura.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: deps + storage.ts | 1 arquivo de código + install (instalação de dependências é setup, não um "componente" adicional) | ✅ Granular |
| T2: queryClient.ts | 1 arquivo | ✅ Granular |
| T3: http.ts | 1 arquivo | ✅ Granular |
| T4: schemas/feature-flags.ts | 1 arquivo | ✅ Granular |
| T5: api/feature-flags.ts | 1 arquivo | ✅ Granular |
| T6: useFeatureFlagsQuery.ts | 1 arquivo/1 hook | ✅ Granular |
| T7: useFlag.ts | 1 arquivo/1 hook | ✅ Granular |
| T8: useBiometricGate.ts | 1 arquivo/1 hook (múltiplos ramos internos, mas uma única máquina de estado coesa) | ✅ Granular |
| T9: BiometricGateScreen.tsx | 1 arquivo/1 componente | ✅ Granular |
| T10: _layout.tsx wiring | 1 arquivo (modify) | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | root of Phase 1, no incoming edge | ✅ Match |
| T2 | T1 | edge T1 to T2 | ✅ Match |
| T3 | None | root of Phase 2, no incoming edge | ✅ Match |
| T4 | None | root of Phase 2, no incoming edge | ✅ Match |
| T5 | T3, T4 | edges T3/T4 to T5 | ✅ Match |
| T6 | T2, T5 | edges T2/T5 to T6 | ✅ Match |
| T7 | T6 | edge T6 to T7 | ✅ Match |
| T8 | None | root of Phase 4, no incoming edge | ✅ Match |
| T9 | T8 | edge T8 to T9 | ✅ Match |
| T10 | T2, T9 | edges T2/T9 to T10 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1: deps + storage.ts | Pure utility | unit — mas `storage.ts` é um wrapper fino de MMKV que só é exercitado de forma significativa através de `queryClient.ts` (T2) e dos hooks que o consomem; testar `storage.ts` isolado exigiria mockar o módulo nativo MMKV sem nenhuma lógica própria para verificar | none (config/wiring) | ✅ OK — ver nota |
| T2: queryClient.ts | Config/wiring | none | none | ✅ OK |
| T3: http.ts | Pure utility | unit | unit | ✅ OK |
| T4: schemas/feature-flags.ts | Pure utility | unit | unit | ✅ OK |
| T5: api/feature-flags.ts | Pure utility | unit | unit | ✅ OK |
| T6: useFeatureFlagsQuery.ts | Hook | unit | unit | ✅ OK |
| T7: useFlag.ts | Hook | unit | unit | ✅ OK |
| T8: useBiometricGate.ts | Hook | unit | unit | ✅ OK |
| T9: BiometricGateScreen.tsx | Component | unit | unit | ✅ OK |
| T10: _layout.tsx | Integration | unit | unit | ✅ OK |

**Nota sobre T1**: `mmkvStorage`/`mmkvPersister` não têm ramificação própria (é configuração +
adapter de interface, sem `if` de negócio) — a matriz já classifica esse tipo de camada como "none,
build gate only" (linha "Config/wiring"). A cobertura real do comportamento de persistência acontece
via `createTestQueryClient()` nos testes de T6/T7 (que usam a variante SEM persistência,
propositalmente) e via verificação manual (T1's "Done when": dev client reconstruído, `expo start`
funcional) — não há teste automatizado que exercite o MMKV real, consistente com o projeto não ter
infraestrutura de teste de módulo nativo.

---

## Available Tools

**MCPs**: nenhum MCP de projeto disponível/necessário — todo trabalho é edição de arquivo TypeScript
e comandos `npm`/`npx`, já cobertos pelas ferramentas padrão.
**Skills**: `react-native-expert` aplicada a todas as tasks que tocam Expo/React Native (hooks,
componentes, TanStack Query, MMKV, `expo-local-authentication`). T4 (schema zod puro) não precisa da
skill — é TypeScript genérico sem nada específico de React Native.
