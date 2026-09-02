# fase-3-acoes-ia-mobile Validation

**Date**: 2026-09-02
**Spec**: `.specs/features/fase-3-acoes-ia-mobile/spec.md`
**Diff range**: `13a8628^..4991786` (main..feat/ia-acoes, mobile files only)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `aiActionSchema` + enums, `mobile/src/core/api/schemas/ai-action.ts` |
| T2   | ✅ Done | `apiPost` added to `mobile/src/core/api/http.ts` |
| T3   | ✅ Done | `fetchAiActions`/`generateAiActions`/`decideAiAction`, `mobile/src/core/api/ai-actions.ts` |
| T4   | ✅ Done | `useAiActionsQuery`, `mobile/src/core/patients/useAiActionsQuery.ts` |
| T5   | ✅ Done | `useGenerateAiActionsMutation`, no `onMutate` |
| T6   | ✅ Done | `useDecideAiActionMutation`, no `onMutate` |
| T7   | ✅ Done | `AiActionCard`, `mobile/src/core/ui/AiActionCard.tsx` |
| T8   | ✅ Done | `AiActionsSection`, `mobile/src/core/ui/AiActionsSection.tsx` |
| T9   | ✅ Done | Integrated into `mobile/src/app/patients/[id].tsx:269` |

All 52 "Done when" checkboxes in `tasks.md` are checked; none partial or blocked.

---

## Spec-Anchored Acceptance Criteria

### P1: Ver e gerar ações de acompanhamento

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AIMOB-01: skeleton no carregamento inicial | Skeleton com forma de cards, não spinner centralizado | `mobile/src/core/ui/__tests__/AiActionsSection.test.tsx:95-101` — `expect(getByTestId('ai-actions-skeleton')).toBeTruthy()`; source uses `AiActionsSkeleton` (`AiActionsSection.tsx:17-30`), no `ActivityIndicator` centralizado no skeleton | ✅ PASS |
| AIMOB-02: estado vazio com disclaimer + convite + botão | Disclaimer, copy da marca, botão "Gerar ações" | `AiActionsSection.test.tsx:103-111` — assert `getByTestId('ai-actions-generate-button')`, `getByText('Revise as sugestões...')`, `getByText('Ações de acompanhamento')` | ✅ PASS |
| AIMOB-03: tocar "Gerar ações" | Desabilita botão, mostra loading, chama POST, substitui vazio pela lista | `AiActionsSection.test.tsx:113-136` — assert `ai-actions-generate-loading` truthy, `disabled` true, depois `getByText('Reduzir consumo de açúcar')` e botão ausente | ✅ PASS |
| AIMOB-04: GET não vazio | Disclaimer + card por ação, sem botão "Gerar ações" | `AiActionsSection.test.tsx:138-146` — `queryByTestId('ai-actions-generate-button')` é `null` | ✅ PASS |
| AIMOB-05: GET falha não bloqueia o resto da tela | Mensagem de erro da seção + retry; paciente/biomarcadores continuam visíveis | `AiActionsSection.test.tsx:148-161` (erro + retry isolado); `mobile/src/app/patients/__tests__/[id].test.tsx:257-269` — `getByText('Maria Silva')` e `getByText('Hemoglobina glicada')` seguem truthy quando só `fetchAiActions` rejeita | ✅ PASS |
| AIMOB-06: POST falha reabilita botão | Botão reabilita, mensagem abaixo dele | `AiActionsSection.test.tsx:163-175` — `getByTestId('ai-actions-generate-error')` truthy, `disabled` `false` | ✅ PASS |
| AIMOB-07: kill switch esconde a seção inteira, sem GET | Nada renderiza, GET não dispara | `AiActionsSection.test.tsx:84-93` — `queryByTestId('ai-actions-section')` é `null`, `queryByText('Ações de acompanhamento')` é `null`, `expect(mockedFetchAiActions).not.toHaveBeenCalled()`; source `AiActionsSection.tsx:95-97` retorna `null` antes de montar qualquer JSX | ✅ PASS |
| AIMOB-08: geração nunca otimista | Lista só muda após resposta do POST | `mobile/src/core/patients/__tests__/useGenerateAiActionsMutation.test.tsx:52-75` — cache `toBeUndefined()` enquanto `isPending`, só popula após resolver; source `useGenerateAiActionsMutation.ts:11-17` não declara `onMutate` | ✅ PASS |

### P2: Aceitar ou descartar uma ação sugerida

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AIMOB-09: pending mostra botões | Aceitar + Descartar visíveis | `mobile/src/core/ui/__tests__/AiActionCard.test.tsx:101-110` | ✅ PASS |
| AIMOB-10: Aceitar decide e desabilita até resposta | Botões desabilitam, depois indicador "Aceita" sem botões | `AiActionCard.test.tsx:112-144`; `mobile/src/core/patients/__tests__/useDecideAiActionMutation.test.tsx:53-66,83-105` | ✅ PASS |
| AIMOB-11: Descartar segue mesmo fluxo | Indicador "Descartada" | `AiActionCard.test.tsx:146-178`; `useDecideAiActionMutation.test.tsx:68-81` | ✅ PASS |
| AIMOB-12: PATCH falha reabilita só aquele card | Reabilita botões, mensagem só nesse card, outros intactos | `AiActionCard.test.tsx:180-201` — card 1 mostra erro e reabilita, `queryByTestId('ai-action-error-ai-action-2')` é `null` e card 2 continua habilitado | ✅ PASS |
| AIMOB-13: status final sem botões | `accepted`/`dismissed` do GET renderiza indicador direto | `AiActionCard.test.tsx:203-221` | ✅ PASS |
| AIMOB-14: aceitar/descartar nunca otimista | Card só muda após resposta do PATCH | `useDecideAiActionMutation.test.tsx:83-105` — cache inalterado durante `isPending`; source `useDecideAiActionMutation.ts:18-26` não declara `onMutate` | ✅ PASS |

**Status**: ✅ All 14 ACs covered with precise spec-matching evidence.

---

## Edge Cases

| Edge case | Spec-defined outcome | Evidence | Result |
| --- | --- | --- | --- |
| Offline, seção nunca carregada com sucesso | Estado de erro da seção, sem cache local de ações de IA | `AiActionsSection.test.tsx:148-155` — `fetchAiActions` rejeita e nenhum dado prévio existe no `queryClient`; a seção exibe a mensagem de erro. Comportamento é idêntico ao caso de rede offline (nenhum `shouldDehydrateQuery`/allowlist filtra `ai-actions` do persister em `mobile/src/core/offline/queryClient.ts:18-21`, mas como não há fetch anterior bem-sucedido, não há nada persistido para essa chave) | ✅ PASS (evidência indireta — não há teste que simula `useIsOffline`/NetInfo diretamente para a seção de IA, mas o efeito é equivalente a uma falha de rede sem cache prévio) |
| Prioridades diferentes diferenciadas visualmente via tema | Cor/selo de `useTheme()`, nunca literal | `AiActionCard.test.tsx:223-248` — `backgroundColor` do selo de prioridade bate com `fakeBrand.colors.success/warning/danger` conforme `low/medium/high`; source `AiActionCard.tsx:15-23` usa só `colors` do tema | ✅ PASS |
| Flag muda de `true` para `false` com a tela aberta remove a seção | Seção desaparece na próxima renderização | Nenhum teste no diff desta feature renderiza `AiActionsSection` e depois muda o retorno de `useFlag` para provar a remoção em um rerender. O comportamento é garantido estruturalmente: `AiActionsSection.tsx:91,95-97` chama `useFlag` incondicionalmente a cada render e retorna `null` antes de montar qualquer JSX quando a flag é `false` — não há memoização nem estado local que atrasaria a reação. Mas por regra evidence-or-zero, falta uma citação de teste direta | ⚠️ Spec-precision/test-coverage gap (comportamento correto por inspeção, sem teste de rerender dedicado) |

---

## Discrimination Sensor

Sensor executado em worktree git isolado (`git worktree add <scratch> HEAD`), nunca no diretório real. Baseline `git status --porcelain` antes e depois do sensor: `?? .specs/features/fase-3-acoes-ia-mobile/design.md` (idêntico).

| Mutation | File:line | Description | Killed? |
| --- | --- | --- | --- |
| 1 | `mobile/src/core/patients/useDecideAiActionMutation.ts:21-22` (scratch) | `onSuccess` trocado de `previous?.map((action) => (action.id === data.id ? data : action))` para `previous?.map(() => data)` (atualiza todos os itens, não só o decidido) | ✅ Killed — 2/4 testes de `useDecideAiActionMutation.test.tsx` falharam |
| 2 | `mobile/src/core/ui/AiActionsSection.tsx:95` (scratch) | Condição do kill switch invertida: `if (!aiActionsEnabled) return null` → `if (aiActionsEnabled) return null` (renderiza quando a flag está desligada) | ✅ Killed — 7/7 testes de `AiActionsSection.test.tsx` falharam |
| 3 | `mobile/src/core/ui/AiActionCard.tsx:86,108` (scratch) | `disabled={isThisActionInFlight}` trocado por `disabled={false}` nos dois botões (remove o desabilitar durante a decisão) | ✅ Killed — 2/7 testes de `AiActionCard.test.tsx` falharam |

**Sensor depth**: lightweight (3 mutações, código de maior risco desta feature: cache scoping, kill switch, desabilitar botão)
**Result**: 3/3 killed - PASS ✅

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ — cada arquivo novo cobre exatamente uma responsabilidade da task |
| Surgical changes | ✅ — único arquivo pré-existente modificado fora de `http.ts`/`[id].tsx` é a adição pontual de `apiPost` e da seção, sem tocar código adjacente |
| No scope creep | ✅ — nenhum arquivo fora do escopo de T1-T9 foi alterado (`git diff --stat` confirma 18 arquivos, todos previstos no design) |
| Matches patterns | ✅ — segue exatamente o padrão de `patients.ts`/`usePatientBiomarkersQuery`/`useSetFollowUpMutation` já em uso |
| Zero comentários inline | ✅ — `git diff` do range não introduz nenhuma linha `//` ou `/* */` nova |
| Sem `any`/`as`/`@ts-ignore`/`@ts-expect-error` | ✅ — busca no diff não encontrou nenhuma ocorrência |
| Sem literal de cor/raio/fonte nos componentes novos | ✅ — `AiActionCard.tsx` e `AiActionsSection.tsx` usam só `useTheme()`; único valor não-token são os nomes de `testID` (não é literal de design) |
| Named exports | ✅ — nenhum `export default` novo no diff |
| Spec-anchored outcome check (asserted values match spec) | ✅ — ver tabela de ACs acima |
| Per-layer Coverage Expectation met (schema/API/hooks: unit; componentes: RNTL) | ✅ — corresponde 1:1 à Test Coverage Matrix de `tasks.md` |
| Every test maps to a spec requirement — no unclaimed tests | ✅ |
| Documented guidelines followed | CLAUDE.md §5.4 (zod `.parse()` obrigatório), §5.5 (4 estados), §5.6 (sem otimismo em IA), §5.7 (kill switch nos dois lados) — todos verificados acima |

---

## Gate Check

- **Gate command**: `npm run pretest && npx tsc --noEmit && npm test` (Build gate, `tasks.md`)
- **`npm run pretest`**: lint OK, `check-brand-boundary.sh` → `OK: nenhuma referência a marca encontrada em src/core`
- **`npx tsc --noEmit`**: 1 erro, em `src/app/(tabs)/index.tsx:177` — confirmado pré-existente e alheio a esta feature (`git show main:mobile/src/app/(tabs)/index.tsx` é byte-idêntico ao arquivo atual; nenhum commit desta feature toca esse arquivo). Excluído do veredito.
- **`npm test`**: 30 suítes, 146 testes, 146 passaram, 0 falharam
- **Test count before feature** (commit `0058ae1`, antes de T1): suíte mobile não alterada por esta feature — os 9 arquivos de teste novos/estendidos desta feature somam ~9 novos arquivos + extensões em `http.test.ts` e `[id].test.tsx`
- **Test count after feature**: 146 passam (confirmado por `tasks.md` T9 e reconfirmado nesta verificação)
- **Skipped tests**: nenhum
- **Failures**: nenhuma (exceto o `tsc` pré-existente, não relacionado)

---

## Fix Plans

Nenhum fix obrigatório. Um gap secundário de cobertura de teste foi identificado (edge case do kill switch mudando em tempo real) — ver Edge Cases acima. Não bloqueia a entrega porque o comportamento é garantido pela reatividade padrão de `useFlag`/React, não por lógica nova desta feature; registrado como lição.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| AIMOB-01 | Complete | ✅ Verified |
| AIMOB-02 | Complete | ✅ Verified |
| AIMOB-03 | Complete | ✅ Verified |
| AIMOB-04 | Complete | ✅ Verified |
| AIMOB-05 | Complete | ✅ Verified |
| AIMOB-06 | Complete | ✅ Verified |
| AIMOB-07 | Complete | ✅ Verified |
| AIMOB-08 | Complete | ✅ Verified |
| AIMOB-09 | Complete | ✅ Verified |
| AIMOB-10 | Complete | ✅ Verified |
| AIMOB-11 | Complete | ✅ Verified |
| AIMOB-12 | Complete | ✅ Verified |
| AIMOB-13 | Complete | ✅ Verified |
| AIMOB-14 | Complete | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 14/14 ACs matched spec outcome; 1 edge-case spec-precision/test-coverage gap flagged (kill switch live-toggle rerender)

**Sensor**: 3/3 mutations killed

**Gate**: pretest + tsc (1 pre-existing unrelated error excluded) + 146/146 tests passed

**What works**: All 9 tasks implemented per design. Schema validation, `apiPost`, fetch functions, both non-optimistic mutations (verified absent `onMutate` in source and by cache-timing assertions), card and section components with all 4 UI states, kill switch (hides everything, blocks the GET), per-card decision isolation, theme-driven priority colors, and screen integration are each independently evidenced.

**Issues found**: One coverage gap — no rerender-based test proves the section unmounts the instant `aiActionsEnabled` flips from `true` to `false` mid-session. The code is safe by inspection (unconditional hook call, immediate early return, no memoization), but the spec's third edge case has no direct assertion behind it.

**Next steps**: Optional follow-up task — add one rerender test to `AiActionsSection.test.tsx` that starts with the flag `true`, renders the section, then rerenders with the flag `false` and asserts `ai-actions-section` disappears. Not a blocker for this feature.
