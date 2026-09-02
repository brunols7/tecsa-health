# Fase 1 — Feature Flags Mobile Validation

**Date**: 2026-09-01
**Spec**: `.specs/features/fase-1-feature-flags-mobile/spec.md`
**Diff range**: `ac48899..daaaaf9` (branch `feat/flags`)
**Verifier**: independent sub-agent (author ≠ verifier; os fixes das rodadas 2 e 3 foram aplicados pelo orquestrador, não por este Verifier)

## Validation: fase-1-feature-flags-mobile - PASS ✅

Veredito geral da rodada 3, após 2 iterações de fix→re-verify de um máximo de 3.

---

## Histórico de rodadas

| Rodada | Commit | Veredito | Resumo |
| ------ | ------ | -------- | ------ |
| 1 | `fa5f0c1` | ❌ Reprovada | Gap 1 (Major): aviso de fallback inalcançável (FLAGSMOB-09/10). Mais 3 spec-precision gaps. Gate 31/31; sensor 3/3 mortas. |
| 2 | `b80728a` | ❌ Reprovada (estreito) | Gap 1 corrigido e verificado; FLAGSMOB-05 e P2-AC7 fechados. Gate 37/37. Sensor: mutação 4 **sobreviveu** — faltava guarda para o aviso em `checking`/`locked`. |
| 3 | `daaaaf9` | ✅ Aprovada | Guarda adicionada (`it.each` sobre os três status). Gate 39/39. Mutação 4 agora **morta**. Nenhum sinal novo. |

Commits verificados ao longo das três rodadas: `883b301`…`fa5f0c1` (T1-T10), `a352287` (fix do Gap 1), `b80728a` (docs), `daaaaf9` (guarda de regressão).

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | `storage.ts` + deps; adapter síncrono sobre MMKV v4 |
| T2 | ✅ Done | `queryClient` singleton persistido + `createTestQueryClient()` |
| T3 | ✅ Done | `apiGet` devolve `unknown`; `ApiError` com `status`/`code` |
| T4 | ✅ Done | `featureFlagsSchema` `.partial()` |
| T5 | ✅ Done | `fetchFeatureFlags` parseia e propaga `ZodError` |
| T6 | ✅ Done | `useFeatureFlagsQuery` com cache escopado por `brand.id` |
| T7 | ✅ Done | `useFlag` = `data?.[key] ?? defaults[key]` |
| T8 | ✅ Done | Máquina de estado do gate, 6 ramos testados |
| T9 | ✅ Done | Aviso renderiza em qualquer status; ação "Continuar" |
| T10 | ✅ Done | Gate segura `AppTabs` até o reconhecimento do aviso |

---

## Spec-Anchored Acceptance Criteria

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| FLAGSMOB-01 — pendente → `defaults[key]` | default da marca (`false`) | `mobile/src/core/flags/__tests__/useFlag.test.tsx:63` — `expect(result.current).toBe(fakeBrand.defaults.aiActionsEnabled)` com query que nunca resolve | ✅ PASS |
| FLAGSMOB-02 — rede → valor de rede | `true` prevalece sobre default `false` | `mobile/src/core/flags/__tests__/useFlag.test.tsx:71,73` — `waitFor(() => expect(result.current).toBe(true))` + `expect(defaults.aiActionsEnabled).toBe(false)` | ✅ PASS |
| FLAGSMOB-03 — key ausente → default | `false`, nunca `undefined` | `mobile/src/core/flags/__tests__/useFlag.test.tsx:89,95` — sonda `offlineBanner` confirma resolução, depois `expect(aiActionsResult.current).toBe(defaults.aiActionsEnabled)` | ✅ PASS |
| FLAGSMOB-04 — offline → valor persistido | persistido (`true`) sobrevive à falha de fetch | `mobile/src/core/flags/__tests__/useFeatureFlagsQuery.test.tsx:97` — `expect(result.current.data).toEqual({ aiActionsEnabled: true, offlineBanner: true })` | ✅ PASS |
| FLAGSMOB-05 — reabrir reflete novo valor | novo valor de rede **substitui** o persistido | `mobile/src/core/flags/__tests__/useFeatureFlagsQuery.test.tsx:103,116` — `setQueryData(..., { aiActionsEnabled: false })` e `waitFor(() => expect(result.current.data).toEqual({ aiActionsEnabled: true, offlineBanner: false }))` | ✅ PASS |
| FLAGSMOB-06 — gate bloqueia até resolver | `AppTabs` ausente da árvore | `mobile/src/app/__tests__/_layout.test.tsx:36` — `expect(queryByText('AppTabsStub')).toBeNull()` | ✅ PASS |
| FLAGSMOB-07 — biometria OK libera | `unlocked`/`biometric`, sem tela intermediária | `mobile/src/core/auth/__tests__/useBiometricGate.test.tsx:51,53` — `expect(result.current.reason).toBe('biometric')` + `toHaveBeenCalledWith({ disableDeviceFallback: true })`; wiring em `mobile/src/app/__tests__/_layout.test.tsx:49` | ✅ PASS |
| FLAGSMOB-08 — falha → retry sem crash | `locked`, `retryable: true`, retry recupera | `mobile/src/core/auth/__tests__/useBiometricGate.test.tsx:70,75,79`; botão em `mobile/src/core/ui/__tests__/BiometricGateScreen.test.tsx:109,111` | ✅ PASS |
| FLAGSMOB-09 — sem cadastro → aviso visível **e em seguida** credencial do SO | (a) prompt com `disableDeviceFallback: false`; (b) aviso visível antes/durante o prompt (estado `checking`) | (a) `mobile/src/core/auth/__tests__/useBiometricGate.test.tsx:92,96`; (b) `mobile/src/core/ui/__tests__/BiometricGateScreen.test.tsx:131,145-148` — `it.each(['checking','locked','unlocked'])` com `expect(getByText('Acesso liberado sem verificação...')).toBeTruthy()` | ✅ PASS |
| FLAGSMOB-10 — `passcode_not_set` → libera com aviso antes | `unlocked`/`no_credential_available` + aviso exibido **antes** de liberar | `mobile/src/core/auth/__tests__/useBiometricGate.test.tsx:109`; ponta a ponta em `mobile/src/app/__tests__/_layout.test.tsx:62-71` — `expect(queryByText('AppTabsStub')).toBeNull()` com o aviso na tela, e `AppTabs` só após `fireEvent.press(getByText('Continuar'))` | ✅ PASS |
| FLAGSMOB-11 — sem hardware → mesmo caminho | entra no ramo de fallback do SO | `mobile/src/core/auth/__tests__/useBiometricGate.test.tsx:100,109` — `hasHardwareAsync` `false` e `reason` `no_credential_available`, alcançável só por esse ramo | ✅ PASS |
| FLAGSMOB-12 — QueryClient único persistido | singleton ligado ao `mmkvPersister`, montado uma vez | `mobile/src/core/offline/queryClient.ts:16-21` + `mobile/src/app/_layout.tsx:46` | ✅ PASS (config/wiring) |
| FLAGSMOB-13 — substituível em teste | suíte roda sem módulo nativo MMKV | `mobile/src/core/offline/queryClient.ts:6-14` + `mobile/__mocks__/react-native-mmkv.ts:7-17`; 39 testes verdes | ✅ PASS |
| P1-AC6 (sem ID) — `useFlag` único ponto de consumo | zero leituras diretas do cache | sem teste; inspeção: `useFeatureFlagsQuery` importado só por `mobile/src/core/flags/useFlag.ts:1`; `grep` de `useQueryClient`/`getQueryData` em `mobile/src/` vazio | ⚠️ Verificado por inspeção (débito documentado — ver Fix 4) |
| P2-AC7 (sem ID) — nenhuma exceção escapa | erro resolve para `locked`/retry | `mobile/src/core/auth/__tests__/useBiometricGate.test.tsx:128,133,136` — `mockRejectedValue(new Error('sensor indisponível'))` → `status === 'locked'`, `retryable === true` | ✅ PASS |

**Status**: ✅ 13/13 requirements com asserção casando o outcome do spec. P2-AC7 (sem ID próprio) também coberto. P1-AC6 permanece verificado por inspeção estrutural, sem teste — único item sem `file:line`, aceito como débito documentado.

---

## Discrimination Sensor

Escopo desta rodada: reexecução da mutação 4, a única que havia sobrevivido. As mutações 1-3 (rodada 1) e 5 (rodada 2) já haviam sido mortas e não foram repetidas. Scratch: worktree detached em `daaaaf9`, em diretório temporário; mutação revertida com `git checkout --` (nunca `git stash`); baseline de `git status --porcelain` conferido antes e depois.

| Mutation | File:line | Description | Rodada 2 | Rodada 3 |
| -------- | --------- | ----------- | -------- | -------- |
| 1 | `mobile/src/core/auth/useBiometricGate.ts:39` | `reason: 'biometric'` → `'device_credential'` | ✅ Killed | não repetida |
| 2 | `mobile/src/core/flags/useFlag.ts:9` | Precedência invertida do fallback de default | ✅ Killed | não repetida |
| 3 | `mobile/src/core/flags/useFeatureFlagsQuery.ts:12` | `brand.id` removido da `queryKey` | ✅ Killed | não repetida |
| 4 | `mobile/src/core/ui/BiometricGateScreen.tsx:114` | Reintroduz o bug da rodada 1: `{warning !== undefined && …}` → `{status === 'unlocked' && warning !== undefined && …}` | ❌ Survived | ✅ **Killed** |
| 5 | `mobile/src/app/_layout.tsx:26` | `!warningAcknowledged` → `warningAcknowledged` | ✅ Killed | não repetida |

Evidência da morte da mutação 4 nesta rodada: `npx jest src/core/ui src/app` → 2 falhas, exatamente
`BiometricGateScreen › exibe o texto do aviso quando presente, com status "checking"` e
`… com status "locked"`. O caso `"unlocked"` continua passando sob a mutação, o que confirma que a
discriminação nova vem precisamente dos dois status que antes não eram exercitados.

**Sensor depth**: lightweight (5 mutações comportamentais ao longo das três rodadas)
**Result**: 5/5 mutações mortas — PASS ✅
**Isolation**: verificado — `git status --porcelain` do worktree de verificação vazio após restauração; árvore real de implementação sem qualquer modificação; suíte completa reexecutada pós-restauração com 39/39 verdes; worktree de scratch removido.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ — a correção final tocou **apenas** o arquivo de teste, sem mudar produto (correto: o produto já estava certo) |
| No scope creep | ✅ |
| Matches patterns | ✅ — `it.each` é o padrão idiomático de Jest para a mesma asserção sobre um conjunto de estados |
| Spec-anchored outcome check | ✅ — asserções miram o efeito visível e os valores exatos do spec |
| Per-layer Coverage Expectation met | ✅ — hooks 1:1 com ACs; camada de UI cobre o aviso nos três status |
| Every test maps to a spec requirement — no unclaimed tests | ✅ — 33 testes novos sobre o baseline, todos rastreáveis a um AC ou Done-when |
| Documented guidelines followed: `CLAUDE.md` (§2.1, §2.3, §5.2, §5.4, §5.7, §9, §12) | ✅ |

Verificações de constituição reexecutadas nesta rodada: `npx tsc --noEmit` limpo; `npm run pretest`
limpo ("OK: nenhuma referência a marca encontrada em src/core"); zero `any`/`@ts-ignore`/
`@ts-expect-error`; `BiometricGateScreen.tsx` sem literal de cor, raio ou tamanho de fonte.

Observações das rodadas anteriores, todas resolvidas: condição redundante `hasHardware && enrolled`
simplificada para `enrolled` (`useBiometricGate.ts:33`); comentário inline condensado em
justificativa de regra ESLint (`useBiometricGate.ts:69`); ramo morto de `BiometricGateScreen`
eliminado e `reason` efetivamente repassado (`_layout.tsx:32`).

---

## Edge Cases

- [x] **Fetch falha sem cache anterior → default da marca, sem propagar erro à UI** — `mobile/src/core/flags/__tests__/useFeatureFlagsQuery.test.tsx:75,77` composto com `mobile/src/core/flags/__tests__/useFlag.test.tsx:63`; `useFlag` não expõe `error`.
- [x] **Cancelamento do prompt biométrico tratado como falha** — `mobile/src/core/auth/__tests__/useBiometricGate.test.tsx:118,125` — `user_cancel` → `locked`/`retryable`, distinto de sucesso e de `passcode_not_set`.
- [x] **Cache de flags escopado por `brandId`** — `mobile/src/core/flags/useFeatureFlagsQuery.ts:12`, empiricamente protegido pela mutação 3.

---

## Gate Check

- **Gate command**: `npx tsc --noEmit && npm run pretest && npm test` (Build gate, `tasks.md` → Gate Check Commands)
- **Resultado**: 39 passed, 0 failed, 0 skipped (11 suítes)
- **Test count antes da feature**: 6
- **Test count rodada 1**: 31 · **rodada 2**: 37 · **rodada 3**: 39
- **Delta total**: +33 testes sobre o baseline
- **Skipped tests**: nenhum
- **Falhas**: nenhuma
- **`tsc --noEmit`**: limpo · **`pretest`**: lint + fronteira de marca limpos

**Nota de ambiente (não é defeito de código)**: em checkout limpo, `npx tsc --noEmit` falha com
`TS2307`/`TS2882` em `src/components/animated-icon.web.tsx:5` e `src/constants/theme.ts:6` até
`mobile/expo-env.d.ts` ser gerado (arquivo gitignorado, gerado pelo Expo). Regenerado com
`npx expo customize tsconfig.json`, sem alterar nenhum arquivo versionado. Recomendo documentar isso
no README do mobile — todo clone novo esbarra nisso.

**Test Integrity Check**: 6 → 31 → 37 → 39 ao longo das rodadas. Nenhum teste removido em nenhuma
rodada; nenhuma asserção enfraquecida. A única substituição (rodada 3) trocou um teste de caso único
por um `it.each` de três casos — estritamente mais forte, comprovado pela morte da mutação 4.

---

## Fix Plans

Nenhum fix pendente. Histórico:

| Fix | Origem | Situação |
| --- | ------ | -------- |
| Fix 1 — aviso de fallback inalcançável (FLAGSMOB-09/10) | Rodada 1 | ✅ Resolvido em `a352287`, verificado na rodada 2 |
| Fix 2 — asserção de substituição do valor persistido (FLAGSMOB-05) | Rodada 1 | ✅ Resolvido em `a352287` |
| Fix 3 — teste de promise rejeitada (P2-AC7) | Rodada 1 | ✅ Resolvido em `a352287` |
| Fix A — guarda do aviso em `checking`/`locked` | Rodada 2 | ✅ Resolvido em `daaaaf9`, verificado nesta rodada |
| Fix 4 — renumeração de IDs do spec | Rodada 1 | ⏸️ **Não aplicado — débito documentado** |

**Sobre o Fix 4 (débito aceito, decisão de escopo do orquestrador)**: `spec.md` tem 15 ACs (P1: 6,
P2: 7, P3: 2) para apenas 13 IDs; P1-AC6 e P2-AC7 ficaram sem ID próprio, e `FLAGSMOB-06` é usado
com dois sentidos distintos entre `spec.md:169` ("gate bloqueia conteúdo") e `design.md:149`/
`tasks.md` ("único ponto de consumo"). É cosmético, não bloqueia o critério de saída da Fase 1, e
corrigir tocaria `design.md`/`tasks.md` já commitados sem ganho funcional. Consequência a registrar:
a contagem "13/13" subestima o total real de 15 ACs, e P1-AC6 segue sem cobertura de teste — se a
Fase 2 adicionar consumidores de flags, vale um guard-rail (script de grep, no molde do
`check-brand-boundary.sh`) em vez de depender de inspeção manual.

---

## Requirement Traceability Update

| Requirement | Rodada 1 | Rodada 2 | Rodada 3 (final) |
| ----------- | -------- | -------- | ---------------- |
| FLAGSMOB-01 | ✅ Verified | ✅ Verified | ✅ Verified |
| FLAGSMOB-02 | ✅ Verified | ✅ Verified | ✅ Verified |
| FLAGSMOB-03 | ✅ Verified | ✅ Verified | ✅ Verified |
| FLAGSMOB-04 | ✅ Verified | ✅ Verified | ✅ Verified |
| FLAGSMOB-05 | ⚠️ Spec-precision gap | ✅ Verified | ✅ Verified |
| FLAGSMOB-06 | ✅ Verified | ✅ Verified | ✅ Verified |
| FLAGSMOB-07 | ✅ Verified | ✅ Verified | ✅ Verified |
| FLAGSMOB-08 | ✅ Verified | ✅ Verified | ✅ Verified |
| FLAGSMOB-09 | ❌ Needs Fix | ⚠️ Guarda fraca | ✅ Verified |
| FLAGSMOB-10 | ❌ Needs Fix | ✅ Verified | ✅ Verified |
| FLAGSMOB-11 | ✅ Verified | ✅ Verified | ✅ Verified |
| FLAGSMOB-12 | ✅ Verified | ✅ Verified | ✅ Verified |
| FLAGSMOB-13 | ✅ Verified | ✅ Verified | ✅ Verified |
| P1-AC6 (sem ID) | ⚠️ inspeção | ⚠️ inspeção | ⚠️ inspeção (débito, Fix 4) |
| P2-AC7 (sem ID) | ⚠️ Spec-precision gap | ✅ Verified | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 13/13 requirements com asserção casando o outcome do spec (mais P2-AC7, sem ID próprio); 1 AC verificado por inspeção sem teste (P1-AC6, débito documentado)
**Sensor**: 5/5 mutações mortas ao longo das três rodadas; a mutação que havia sobrevivido agora morre
**Gate**: 39 passed, 0 failed, 0 skipped; `tsc` limpo; fronteira de marca limpa

**What works**:

- `useFlag` cobre os quatro comportamentos exigidos — default enquanto pendente, valor de rede, key ausente, valor persistido offline — e agora também a substituição do valor persistido por um valor novo de rede.
- Cache escopado por marca é real e empiricamente protegido: remover `brand.id` da `queryKey` mata um teste.
- O gate biométrico cobre os 6 ramos, incluindo cancelamento tratado como falha, `passcode_not_set` liberando em vez de travar o usuário, e erro inesperado do módulo nativo resolvendo para `locked` sem escapar como exceção.
- O aviso de segurança é comprovadamente visível **antes** de liberar o acesso, e `AppTabs` só renderiza após confirmação humana — o requisito do CLAUDE.md §9 que motivou duas rodadas de fix está fechado com asserção ponta a ponta.
- A guarda de regressão que faltava existe: a mutação que reintroduz o bug original agora falha dois casos de teste.
- Infra de query/persist entregue e testável sem módulo nativo; 39 testes verdes, nenhum removido ou enfraquecido em três rodadas.
- Arquitetura aderente à constituição: `tsc` limpo, zero `any`, fronteira de marca intacta, `core/` sem import de `brands/` fora da raiz.

**Issues found**: nenhum bloqueante. Um débito documentado (Fix 4, renumeração de IDs do spec + P1-AC6 sem teste), explicitamente aceito como decisão de escopo.

**Next steps**: feature pronta para fechar a Fase 1. Recomendações não bloqueantes: (1) UAT em simulador sem biometria para confirmar visualmente a sequência aviso → prompt do SO → "Continuar" (CLAUDE.md §14.8); (2) documentar no README do mobile a geração do `expo-env.d.ts` em clone novo; (3) na Fase 2, considerar um guard-rail de grep para P1-AC6 quando surgirem novos consumidores de flags.
