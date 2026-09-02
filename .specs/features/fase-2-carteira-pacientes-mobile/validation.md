# Fase 2 — Carteira de Pacientes Mobile Validation

**Date**: 2026-09-01
**Spec**: `.specs/features/fase-2-carteira-pacientes-mobile/spec.md`
**Diff range**: `2da6797..c020f96` (14 commits, `mobile/` only)
**Verifier**: independent sub-agent (author ≠ verifier)

**Verdict**: PASS ✅ — 18/18 requirements traced to asserted evidence, gate green (99 tests), 3/3
mutants killed. Três itens não bloqueantes registrados abaixo.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | `@shopify/flash-list@2.0.2`, `@react-native-community/netinfo@12.0.1` |
| T2 | ✅ Done | Schemas com `z.infer`, nenhum tipo à mão |
| T3 | ✅ Done | `apiPatch` reusa `buildUrl`/`handleErrorResponse` de `apiGet` |
| T4 | ✅ Done | 4 funções, `.parse()` em todas |
| T5 | ✅ Done | `useInfiniteQuery`, key `['patients', brand.id, search]` |
| T6 | ✅ Done | Dois `useQuery` simples |
| T7 | ✅ Done | `onMutate`/`onError`/`onSettled` completos |
| T8 | ✅ Done | Debounce genérico com cleanup de timer |
| T9 | ✅ Done | SPEC_DEVIATION verificada e legítima (ver abaixo) |
| T10 | ✅ Done | 4 estados num só componente |
| T11 | ✅ Done | Banner condicional a `useIsOffline()` |
| T12 | ✅ Done | 2 SPEC_DEVIATIONs, uma legítima, uma com ressalva (ver abaixo) |
| T13 | ✅ Done | Detalhe compõe os estados manualmente (permitido pelo design) |
| T14 | ⚠️ Partial | Verificação manual do critério de saída **não executada** — exige backend real e device |

---

## Spec-Anchored Acceptance Criteria

### P1: Listar carteira com busca e quatro estados

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1 — monta e busca 1ª página via `useInfiniteQuery` com `parse()` | `fetchPatients(brand, search, cursor)` chamado; resposta validada | `src/core/patients/__tests__/usePatientsQuery.test.tsx:73` — `expect(mockedFetchPatients).toHaveBeenCalledWith('brand-a','joao',undefined)`; `src/core/api/__tests__/patients.test.ts:55` — `rejects.toThrow()` em payload inválido | ✅ PASS |
| AC2 — skeleton, nunca spinner | Skeleton com forma de cards | `src/app/__tests__/index.test.tsx:73` — `expect(getByTestId('patients-skeleton')).toBeTruthy()` | ✅ PASS |
| AC3 — erro distinto do vazio + retry | Mensagem do que falhou + botão que refaz a query | `src/app/__tests__/index.test.tsx:84,88` — `getByText('Não foi possível carregar a carteira de pacientes.')` e `expect(refetch).toHaveBeenCalledTimes(1)` | ✅ PASS |
| AC4 — vazio usando `theme.copy.emptyPatients` | Copy vinda da marca | `src/app/__tests__/index.test.tsx:106` — `expect(getByText(brand.copy.emptyPatients)).toBeTruthy()` | ✅ PASS |
| AC5 — próxima página via `nextCursor`, sem duplicar/perder | Cursor da página anterior usado; itens anexados | `src/core/patients/__tests__/usePatientsQuery.test.tsx:113,114` — `pages` com length 2 e `toHaveBeenNthCalledWith(2,'brand-a',undefined,'cursor-2')`; `src/app/__tests__/index.test.tsx:150,168` — `fetchNextPage` chamado só com `hasNextPage` | ✅ PASS |
| AC6 — busca com debounce 300ms reinicia paginação | Após 300ms, query com `search`; páginas antigas descartadas | `src/app/__tests__/index.test.tsx:199,205` — `toHaveBeenLastCalledWith('')` antes e `('maria')` após `advanceTimersByTime(300)`; `usePatientsQuery.test.tsx:148` — `pages` da nova busca com length 1 | ✅ PASS |
| AC7 — `FlashList` com `estimatedItemSize` e `keyExtractor` | Ambos definidos | `src/app/index.tsx:171-174` — `FlashList` com `keyExtractor={(patient) => patient.id}`; `estimatedItemSize` **ausente** | ⚠️ SPEC_DEVIATION aceita |
| AC8 — banner de offline sem esconder conteúdo | Banner visível quando NetInfo reporta desconectado | `src/app/__tests__/index.test.tsx:182` — banner e lista renderizados juntos; `src/core/offline/__tests__/network.test.ts:65` — `expect(result.current).toBe(true)` | ✅ PASS |

### P2: Detalhe do paciente com biomarcadores

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1 — card navega para `patients/[id]` | `id` do paciente na rota | `src/app/__tests__/index.test.tsx:132` — `expect(push).toHaveBeenCalledWith('/patients/1')` | ✅ PASS |
| AC2 — busca paciente + biomarcadores, cada um validado | Dois fetches, dois schemas | `src/app/patients/__tests__/[id].test.tsx:118-126`; `src/core/api/__tests__/patients.test.ts:103,112` — `toEqual([validBiomarker])` e `rejects.toThrow()` com status fora do enum | ✅ PASS |
| AC3 — skeleton enquanto qualquer busca pendente | Skeleton do conteúdo real | `src/app/patients/__tests__/[id].test.tsx:88` — `getByTestId('patient-detail-skeleton')` com só uma das duas queries pendente | ✅ PASS |
| AC4 — erro distinto do vazio + retry | Erro visível, vazio ausente | `src/app/patients/__tests__/[id].test.tsx:97,98,103` — erro presente, `getByText('Nenhum biomarcador…')` **lança**, retry recarrega | ✅ PASS |
| AC5 — vazio de biomarcadores com copy do core | "Nenhum biomarcador registrado ainda" | `src/app/patients/__tests__/[id].test.tsx:113` | ✅ PASS |
| AC6 — `label`,`value`,`unit`,`refMin–refMax`,`status` do backend | Sem recálculo no cliente | `src/app/patients/__tests__/[id].test.tsx:124,126` — `getByText('7.2 % (ref. 4–6)')` e `getByText('high')`; `src/app/patients/[id].tsx:181` renderiza `biomarker.status` direto | ✅ PASS |

### P3: Acompanhamento com update otimista

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1 — `onMutate` aplica otimista | Cache do detalhe com o novo valor antes da resposta | `src/core/patients/__tests__/useSetFollowUpMutation.test.tsx:80` — `getQueryData(['patient','patient-1'])?.needsFollowUp` `toBe(true)`; `[id].test.tsx:147` — toggle `props.value` `toBe(true)` | ✅ PASS |
| AC2 — `onError` reverte pro snapshot | Cache volta exatamente ao valor pré-mutation | `src/core/patients/__tests__/useSetFollowUpMutation.test.tsx:97` — `toEqual(fakePatient)` (mutante killed) | ✅ PASS |
| AC3 — `onSettled` invalida a query do detalhe | Invalidação em sucesso e em erro | `useSetFollowUpMutation.test.tsx:112,113,128,129` — `toHaveBeenCalledWith({queryKey:['patient','patient-1']})` e `['patients','brand-a']` nos dois caminhos | ✅ PASS |
| AC4 — toggle desabilitado durante mutation | Não clicável enquanto em voo | `src/app/patients/__tests__/[id].test.tsx:143,148,152` — `props.disabled` `false → true → false` | ✅ PASS |

**Status**: ✅ 18/18 requisitos com evidência `file:line` + asserção sobre o valor definido na spec.
1 spec-precision gap (P1 AC7).

---

## Discrimination Sensor

Scratch isolado via `git worktree add` (removido com `--force`); `git status --porcelain` idêntico ao
baseline antes e depois. Nenhum `git stash`.

| Mutation | File:line | Description | Killed? |
| --- | --- | --- | --- |
| 1 | `src/core/patients/usePatientsQuery.ts:16` | `getNextPageParam` sempre `undefined` (paginação nunca avança) | ✅ Killed — `usePatientsQuery.test.tsx:109` `expect(hasNextPage).toBe(true)` |
| 2 | `src/core/patients/useSetFollowUpMutation.ts:41` | Removido `setQueryData` do rollback em `onError` | ✅ Killed — `useSetFollowUpMutation.test.tsx:97` |
| 3 | `src/core/ui/QueryStateView.tsx:77` | `if (isEmpty)` → `if (!isEmpty)` (vazio e sucesso trocados) | ✅ Killed — 6 testes falharam (`QueryStateView.test.tsx` + `app/__tests__/index.test.tsx`) |

**Sensor depth**: lightweight (3 mutações no código novo de maior risco)
**Result**: 3/3 killed — PASS ✅

**Observação de discriminação (não bloqueante):** sob a mutação 2, o teste de tela
`src/app/patients/__tests__/[id].test.tsx:155` ("reverte o toggle visivelmente") **continuou
passando**. Ele não discrimina o caminho de rollback: com o rollback removido, o `onSettled`
invalida `['patient', id]` e o refetch traz o paciente original, produzindo o mesmo valor final na
UI. O AC PATMOB-16 permanece coberto pelo teste de hook (que matou o mutante); o teste de tela é
redundante e não protege a regra.

---

## Interactive UAT Results

| # | Test | Result | Details |
| --- | --- | --- | --- |
| 1 | Lista com 5.000+ pacientes rola sem travar | ⏭️ Não executado | Exige backend rodando + device/simulador, indisponíveis neste ambiente |
| 2 | Modo avião mantém a carteira legível | ⏭️ Não executado | Idem |
| 3 | Rollback visível com API derrubada | ⏭️ Não executado | Idem — coberto por teste automatizado no lugar |

Critério de saída manual da Fase 2 permanece pendente e está registrado como tal em `tasks.md` (T14).

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ |
| Surgical changes | ✅ — só `mobile/`, `_layout.tsx` tocado apenas para o listener |
| No scope creep | ✅ |
| Matches patterns | ✅ — replica `feature-flags.ts`/`useFeatureFlagsQuery` |
| Spec-anchored outcome check | ✅ |
| Per-layer Coverage Expectation met | ✅ — Test Coverage Matrix cumprida em todas as 10 linhas |
| Every test maps to a spec requirement | ✅ |
| Documented guidelines followed | ✅ — `CLAUDE.md` §2.3 (sem `any`/`ts-ignore`), §2.5 (FlashList), §5.4 (`.parse()` em toda resposta), §5.5 (4 estados), §5.6 (rollback), §5.2 (zero literal de cor/raio/fonte — grep limpo) |

**Ressalvas registradas** (não bloqueantes):

1. `src/core/ui/QueryStateView.tsx:81` — `children(data as T)`. O `as` não decorre de validação: com
   `status: 'success'` e `data: undefined`, `children` receberia `undefined` tipado como `T`.
   Estreitar por discriminated union removeria o cast (CLAUDE.md §2.3).
2. `src/app/index.tsx:182` — `router.push(... as Href)`. Ver seção seguinte.

---

## Verificação das SPEC_DEVIATIONs declaradas

| Deviation | Alegação do autor | Verificação independente | Veredito |
| --- | --- | --- | --- |
| T9 — `NetInfo.useNetInfo()` no lugar de `useNetInfoState()` | Hook do design não existe na versão instalada | `node_modules/@react-native-community/netinfo/lib/typescript/src/index.d.ts:52` exporta `useNetInfo`; `useNetInfoState` não existe no pacote | ✅ Legítima |
| T12 — `estimatedItemSize` omitido | Prop removida em `@shopify/flash-list@2.0.2` | `grep -rl estimatedItemSize node_modules/@shopify/flash-list/dist` não retorna nada — a prop não existe mais em v2 (auto-sizing) | ✅ Legítima; PATMOB-07 é insatisfazível na versão instalada, e o design/spec foram escritos contra a API v1 |
| T12 — `router.push(... as Href)` | "Cast seguro assim que T13 criar a rota" | **Parcialmente falsa.** `mobile/.expo/types/router.d.ts` (14 linhas, artefato gerado versionado) lista só `/explore`, `/` e `/_sitemap` — `patients/[id]` **não** está lá. Hoje o cast é a única razão de o `tsc` aceitar a chamada: ele silencia a checagem de typed routes, não estreita uma união que já contém a rota | ⚠️ Ressalva |

Sobre o terceiro item: a rota existe de fato em `src/app/patients/[id].tsx` e o comportamento está
correto e asserido (`index.test.tsx:132`). O problema é o artefato gerado desatualizado. Regenerar os
typed routes (rodar o dev server do Expo uma vez) faz `/patients/${string}` entrar na união e permite
remover o cast. Recomendação, não bloqueio.

---

## Edge Cases

- [x] Resposta fora do schema zod falha alto — `src/core/api/__tests__/patients.test.ts:55,112` (`rejects.toThrow()`), nunca renderiza dado parcial
- [~] Troca de marca não mistura pacientes — evidência **estrutural**: `usePatientsQuery.ts:12` inclui `brand.id` na key e `usePatientsQuery.test.tsx:75` asserta a key `['patients','brand-a','joao']`. Não há teste que troque de marca e confirme o descarte da lista anterior
- [~] Offline na primeira abertura sem cache → erro + banner — os dois comportamentos são cobertos separadamente (`index.test.tsx:76` erro, `:171` banner), não num único fluxo combinado

---

## Gate Check

- **Gate command**: `npm run pretest && npx tsc --noEmit && npm test` (em `mobile/`)
- **Result**: 99 passed, 0 failed, 0 skipped (23 suites)
- **Test count before feature**: ~37 blocos `it()` (`git grep -c "it(" 2da6797 -- mobile/src`)
- **Test count after feature**: ~96 blocos `it()` no mesmo recorte; 99 executados incluindo `scripts/`
- **Delta**: +59 — nenhum teste removido ou enfraquecido. As remoções em `src/app/__tests__/index.test.tsx` acompanham a remoção da `BrandProofScreen` (T12), substituída por cobertura maior
- **Skipped tests**: nenhum
- **Failures**: nenhuma
- **Pretest**: lint + `check-brand-boundary.sh` passaram ("OK: nenhuma referência a marca encontrada em src/core")

---

## Fix Plans

Nenhum bloqueador. Três melhorias sugeridas, todas Minor:

### Fix 1: Teste de tela de rollback não discrimina

- **Root cause**: `[id].test.tsx:155` observa só o valor final do toggle, que o refetch do `onSettled` restaura mesmo sem rollback.
- **Fix task**: fazer o mock do refetch devolver `needsFollowUp: true` (valor do servidor) para que só o rollback do `onError` possa produzir `false`.
- **Priority**: Minor

### Fix 2: Typed routes desatualizados forçam `as Href`

- **Root cause**: `mobile/.expo/types/router.d.ts` versionado sem `patients/[id]`.
- **Fix task**: regenerar os typed routes e remover o cast de `src/app/index.tsx:182`.
- **Priority**: Minor

### Fix 3: `data as T` em `QueryStateView`

- **Root cause**: props não modelam a correlação entre `status` e `data`.
- **Fix task**: discriminated union nos props, eliminando o cast.
- **Priority**: Minor

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| PATMOB-01 | Pending | ✅ Verified |
| PATMOB-02 | Pending | ✅ Verified |
| PATMOB-03 | Pending | ✅ Verified |
| PATMOB-04 | Pending | ✅ Verified |
| PATMOB-05 | Pending | ✅ Verified |
| PATMOB-06 | Pending | ✅ Verified |
| PATMOB-07 | Pending | ⚠️ Verified com deviation (`estimatedItemSize` inexistente em flash-list v2) |
| PATMOB-08 | Pending | ✅ Verified |
| PATMOB-09 | Pending | ✅ Verified |
| PATMOB-10 | Pending | ✅ Verified |
| PATMOB-11 | Pending | ✅ Verified |
| PATMOB-12 | Pending | ✅ Verified |
| PATMOB-13 | Pending | ✅ Verified |
| PATMOB-14 | Pending | ✅ Verified |
| PATMOB-15 | Pending | ✅ Verified |
| PATMOB-16 | Pending | ✅ Verified |
| PATMOB-17 | Pending | ✅ Verified |
| PATMOB-18 | Pending | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 18/18 ACs com evidência asserida; 1 spec-precision gap (PATMOB-07)
**Sensor**: 3/3 mutantes mortos
**Gate**: 99 passed, 0 failed, 0 skipped

**What works**: fluxo `schema zod → tipo inferido → fetch → parse → hook` fechado nos 4 endpoints;
`.parse()` em toda resposta de rede; lista virtualizada com `FlashList`, busca com debounce e
paginação por cursor sem duplicar páginas; quatro estados de UI distintos e testados na lista e no
detalhe; banner de offline ligado ao NetInfo com `onlineManager` conectado na raiz; mutation
otimista com rollback provado por mutação de código; zero literal de cor/raio/fonte; zero `any`,
`@ts-ignore` ou nome de marca no core.

**Issues found**: nenhum bloqueador. Três itens Minor (Fix 1-3) e o critério de saída manual da
Fase 2 pendente de execução com backend e device reais.

**Next steps**: seguir para a Fase 3. Os três fixes Minor podem entrar como limpeza oportunista; a
verificação manual precisa acontecer antes da entrega final (CLAUDE.md §14, itens 6-8).
