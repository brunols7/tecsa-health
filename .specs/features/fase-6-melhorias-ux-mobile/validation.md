# Fase 6 — Melhorias UX Mobile Validation

**Date**: 2026-09-02
**Spec**: `.specs/features/fase-6-melhorias-ux-mobile/spec.md`
**Diff range**: `ba89fac..e9ac1aa` (mobile T1–T21), scoped to `mobile/`
**Verifier**: independent sub-agent (author ≠ verifier)

**Scope note**: T22 (`eas update` publish) and T23 (manual device verification) are external/manual
actions with no code — out of scope for this pass, pending live user execution. P8's OTA-publish ACs
(spec.md P8; UXMOB-31/32/33 in Requirement Traceability) are marked pending below, not failed.

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1 | ✅ Done | `patientGoalSchema`/`patientStatusSchema` enums + `statusChangedAt` |
| T2 | ✅ Done | `GOAL_LABELS`, `lifecycleActionLabel` |
| T3 | ✅ Done | `calculateAge`, `formatDateBR` |
| T4 | ✅ Done | `Badge` component |
| T5 | ✅ Done | `emptyBiomarkers`/`emptyFilteredPatients` copy, both brands |
| T6 | ✅ Done | `createPatient`/`updatePatient`/`updatePatientStatus`/`deletePatient`, status filter on `fetchPatients` |
| T7 | ✅ Done | `useCreatePatientMutation` |
| T8 | ✅ Done | `useUpdatePatientMutation` |
| T9 | ✅ Done | `useDeletePatientMutation` |
| T10 | ✅ Done | `useChangePatientStatusMutation` |
| T11 | ✅ Done | `usePatientsQuery` status filter param |
| T12 | ✅ Done | `[id].tsx` → `[id]/index.tsx` move |
| T13 | ✅ Done | `PatientLifecycleActions` |
| T14 | ✅ Done | Lifecycle + delete integrated in detail screen |
| T15 | ✅ Done | Badge/age/copy adopted in detail screen |
| T16 | ✅ Done | `PatientForm` |
| T17 | ✅ Done | `patients/new.tsx` |
| T18 | ✅ Done | `patients/[id]/edit.tsx` |
| T19 | ✅ Done | `PatientStatusFilterSheet` |
| T20 | ✅ Done | Filter/badges/create button in list |
| T21 | ✅ Done | `app.json` version 1.0.0 → 1.1.0 |
| T22 | ⏸️ Pending | External action — requires user confirmation, out of this pass's scope |
| T23 | ⏸️ Pending | Manual device verification, out of this pass's scope |

---

## Spec-Anchored Acceptance Criteria

### P1: Criar paciente

| Criterion | Spec-defined outcome | file:line + assertion | Result |
| --- | --- | --- | --- |
| AC1: toque em adicionar → navega ao form vazio | navigate to `/patients/new` | `mobile/src/app/(tabs)/__tests__/index.test.tsx:184-198` - `fireEvent.press('patients-create-button'); expect(push).toHaveBeenCalledWith('/patients/new')` | ✅ PASS |
| AC2: submit válido → `POST /patients`, volta e mostra paciente novo | `createPatient` called with exact input; router navigates to new patient | `mobile/src/app/patients/__tests__/new.test.tsx:63-77` - `expect(mockedCreatePatient).toHaveBeenCalledWith({name, birthDate, goal, brand}); expect(mockRouterPush).toHaveBeenCalledWith('/patients/patient-new-1')` | ✅ PASS |
| AC3: nome vazio/data inválida/sem objetivo bloqueia envio, erro por campo | field-level error shown, `onSubmit` not called | `mobile/src/core/ui/__tests__/PatientForm.test.tsx:60-95` - 3 cases, each asserts field error testID present and `expect(onSubmit).not.toHaveBeenCalled()` | ✅ PASS |
| AC4: `422` mapeia erro de campo devolvido pela API | field error text from `ApiError.details` shown under correct field, no generic message | `mobile/src/app/patients/__tests__/new.test.tsx:79-93` - `ApiError(..., 422, ..., {name:[...]})` → `getByTestId('patient-form-name-error')`, exact text asserted | ✅ PASS |
| AC5: erro de rede mostra retry, preserva dados digitados | network error message shown; input values unchanged | `mobile/src/app/patients/__tests__/new.test.tsx:95-106` - asserts `patient-new-error` present and both field values still `'Maria Silva'`/`'1990-05-05'` | ✅ PASS |
| AC6: botão de confirmar desabilitado durante envio | `submitting=true` → submit disabled | `mobile/src/core/ui/__tests__/PatientForm.test.tsx:157-162` - `expect(...accessibilityState?.disabled).toBe(true)` | ✅ PASS |

### P2: Editar cadastro do paciente

| Criterion | Spec-defined outcome | file:line + assertion | Result |
| --- | --- | --- | --- |
| AC1: editar abre form pré-preenchido | fields show current patient data | `mobile/src/app/patients/[id]/__tests__/edit.test.tsx:70-77` - `expect(...value).toBe('Maria Silva')` etc. | ✅ PASS |
| AC2: `PATCH` só com campos alterados, volta ao detalhe atualizado | payload contains only changed field(s) | `mobile/src/app/patients/[id]/__tests__/edit.test.tsx:79-92` - `expect(mockedUpdatePatient).toHaveBeenCalledWith('patient-1', { name: 'Maria Souza' })` (birthDate/goal absent) + `expect(mockRouterBack).toHaveBeenCalled()` | ✅ PASS |
| AC3: erro local/422 segue mesma regra da P1 | field error mapped from API | `mobile/src/app/patients/[id]/__tests__/edit.test.tsx:94-110` - `birthDate: ['Data de nascimento inválida']` → field error text asserted | ✅ PASS |
| AC4: mesmas regras de validação local da P1 | reuses `PatientForm`, same schema | `mobile/src/core/ui/__tests__/PatientForm.test.tsx` covers both modes with same `patientFormSchema` | ✅ PASS |
| Edge case: 404 (excluído por outra sessão) → erro + volta à lista | `router.replace('/')`, error message shown | `mobile/src/app/patients/[id]/__tests__/edit.test.tsx:112-124` - `ApiError(...,404,...)` → `expect(mockRouterReplace).toHaveBeenCalledWith('/')`, `mockRouterBack` not called | ✅ PASS |

### P3: Excluir paciente

| Criterion | Spec-defined outcome | file:line + assertion | Result |
| --- | --- | --- | --- |
| AC1: toque em excluir → `Alert` cita o nome, opções cancelar/destrutivo | `Alert.alert('Excluir {name}?', ..., [Cancelar, Excluir(destructive)])` | `mobile/src/app/patients/[id]/__tests__/index.test.tsx:305-328` - `expect(alertSpy).toHaveBeenCalledWith('Excluir Maria Silva?', expect.any(String), expect.arrayContaining([{text:'Excluir', style:'destructive'}]))` | ✅ PASS |
| AC2: confirmar → `DELETE`, remove do cache, volta à lista | `deletePatient('patient-1')` called, `router.back()` called | same test, lines 324-325 - `expect(mockedDeletePatient).toHaveBeenCalledWith('patient-1')`; `expect(mockRouterBack).toHaveBeenCalled()` | ✅ PASS |
| AC3: cancelar → fecha sem chamar API, permanece no detalhe | no `DELETE` call, screen unchanged | `mobile/src/app/patients/[id]/__tests__/index.test.tsx:330-348` - `expect(mockedDeletePatient).not.toHaveBeenCalled()`, `expect(mockRouterBack).not.toHaveBeenCalled()`, `getByText('Maria Silva')` | ✅ PASS |
| AC4: falha na exclusão → mantém paciente visível, erro com retry | error message shown, patient still visible | `mobile/src/app/patients/[id]/__tests__/index.test.tsx:350-369` - `getByTestId('patient-detail-delete-error')`, `getByText('Maria Silva')`, `mockRouterBack` not called | ✅ PASS |

### P4: Ciclo de vida do acompanhamento

| Criterion | Spec-defined outcome | file:line + assertion | Result |
| --- | --- | --- | --- |
| AC1: `active` → "Marcar como inativo" + "Concluir acompanhamento" | exact labels | `mobile/src/core/ui/__tests__/PatientLifecycleActions.test.tsx:58-70` - `getByText('Marcar como inativo')`, `getByText('Concluir acompanhamento')` | ✅ PASS |
| AC2: `inactive` → só "Reativar", oculta os 2 de active | exact label, others absent | `mobile/src/core/ui/__tests__/PatientLifecycleActions.test.tsx:100-114` - `getByText('Reativar')`; `queryByText('Marcar como inativo')`/`'Concluir acompanhamento'` null | ✅ PASS |
| AC3: `completed` → só "Reabrir acompanhamento" | exact label, others absent | `mobile/src/core/ui/__tests__/PatientLifecycleActions.test.tsx:130-144` - `getByText('Reabrir acompanhamento')`; other 3 labels null | ✅ PASS |
| AC4: toque → `PATCH .../status` com destino certo, atualiza tela | `updatePatientStatus(id, target)`; UI reflects new status/buttons | `mobile/src/app/patients/[id]/__tests__/index.test.tsx:371-384` - `expect(mockedUpdatePatientStatus).toHaveBeenCalledWith('patient-1','inactive')`; `getByText('Reativar')` after | ✅ PASS |
| AC5: falha (inclui 409) mantém status/botões anteriores | previous status/buttons unchanged, no crash | `mobile/src/core/patients/__tests__/useChangePatientStatusMutation.test.tsx:107-123` (409 via `ApiError`) + `mobile/src/app/patients/[id]/__tests__/index.test.tsx:386-399` (generic error) - both assert prior status/buttons remain | ✅ PASS |
| AC6: botão tocado desabilita durante chamada | `disabled` prop true while `pending` | `mobile/src/core/ui/__tests__/PatientLifecycleActions.test.tsx:160-170` - `accessibilityState?.disabled` `true` | ✅ PASS |

### P5: Filtrar a lista por status

| Criterion | Spec-defined outcome | file:line + assertion | Result |
| --- | --- | --- | --- |
| AC1: sem filtro explícito → busca `status=active` (default) | `fetchPatients` called with `['active']` | `mobile/src/core/patients/__tests__/usePatientsQuery.test.tsx:67-84` - `expect(mockedFetchPatients).toHaveBeenCalledWith('brand-a','joao',undefined,['active'])` | ✅ PASS |
| AC2: "Inativos e concluídos" → busca `status=inactive,completed` | `fetchPatients` with `['inactive','completed']`; query param `inactive%2Ccompleted` | `mobile/src/core/patients/__tests__/usePatientsQuery.test.tsx:174-219` + `mobile/src/core/api/__tests__/patients.test.ts:63-74` - exact param string asserted | ✅ PASS |
| AC3: volta para "Ativos" → busca padrão | same query with `['active']` after toggling back | `mobile/src/app/(tabs)/__tests__/index.test.tsx:164-182` - `toHaveBeenLastCalledWith('','active')` then `'inactive_completed'` | ✅ PASS |
| AC4: indicação visual do filtro ativo | filter label rendered distinctly | `mobile/src/app/(tabs)/__tests__/index.test.tsx:174-180` - `getByText('Ativos')`/`getByText('Inativos e concluídos')` via `patients-active-filter-indicator` | ✅ PASS |

### P6: Objetivo como badge traduzido

| Criterion | Spec-defined outcome | file:line + assertion | Result |
| --- | --- | --- | --- |
| AC1: 4 traduções exatas | `lose_weight`→"Emagrecimento", `gain_muscle`→"Ganho de massa", `maintain`→"Manutenção", `manage_condition`→"Controle de condição clínica" | `mobile/src/core/patients/__tests__/labels.test.ts:3-9` - exact `toBe()` per value | ✅ PASS |
| AC2: goal fora do enum → tratado como erro de parsing, nunca renderiza cru | `.safeParse()` fails | `mobile/src/core/api/schemas/__tests__/patient.test.ts:68-71` - `expect(result.success).toBe(false)` for unknown `goal` | ✅ PASS |
| AC3: mesmo `Badge` para goal e status de biomarcador, sem literal de cor novo | biomarker pill uses neutral `surfaceMuted`, not per-status color | `mobile/src/app/patients/[id]/__tests__/index.test.tsx:449-461` - `expect(style.backgroundColor).toBe(nutriCareColors.surfaceMuted); expect(...).not.toBe(...danger)` | ✅ PASS |

### P7: Empty states revisados

| Criterion | Spec-defined outcome | file:line + assertion | Result |
| --- | --- | --- | --- |
| AC1: `copy.emptyBiomarkers` no lugar do hardcoded | brand copy text rendered | `mobile/src/app/patients/[id]/__tests__/index.test.tsx:177-186` (+ vita-plus at 188-197) - `getByText(resolveBrand('nutri-care').copy.emptyBiomarkers)` | ✅ PASS |
| AC2: filtro sem resultado → empty state distinto | separate testID/copy, `emptyFilteredPatients` | `mobile/src/app/(tabs)/__tests__/index.test.tsx:112-134` - `getByTestId('patients-empty-filtered')`, `expect(brand.copy.emptyFilteredPatients).not.toBe(brand.copy.emptyPatients)` | ✅ PASS |
| AC3: nenhuma copy nova reaproveita erro | separate error vs. empty components | Structural: `DetailErrorView`/`BiomarkersEmptyState` and `PatientsFilteredEmptyState` are distinct components with distinct testIDs (`mobile/src/app/patients/[id]/index.tsx:43-82,196-213`, `mobile/src/app/(tabs)/index.tsx:110-163`) | ⚠️ Spec-precision gap (structural check only, no single assertion proves non-reuse; low risk given separate components) |

### P9: Idade e datas em formato legível

| Criterion | Spec-defined outcome | file:line + assertion | Result |
| --- | --- | --- | --- |
| AC1: idade calculada, exibida junto ao badge (lista e detalhe) | correct integer age next to goal badge | `mobile/src/core/patients/__tests__/date.test.ts:4-21` (unit, incl. exact-birthday boundary) + `mobile/src/app/patients/[id]/__tests__/index.test.tsx:424-434` (`patient-age` matches `calculateAge(...)`) + `mobile/src/app/(tabs)/__tests__/index.test.tsx:156-157` (`patient-age-1` present) | ✅ PASS |
| AC2: `dd/MM/yyyy`, nunca ISO cru | `formatDateBR('2026-03-05')` → `'05/03/2026'` | `mobile/src/core/patients/__tests__/date.test.ts:24-30` + `mobile/src/app/patients/[id]/__tests__/index.test.tsx:436-447` (`patient-birth-date` text matches formatted date, `queryByText(fakePatient.birthDate)` null) | ✅ PASS |
| AC3: `inactive` → "Inativo desde {data}" | exact phrase with `formatDateBR(statusChangedAt)` | `mobile/src/core/ui/__tests__/PatientLifecycleActions.test.tsx:100-110` - `getByText('Inativo desde 05/03/2026')` | ✅ PASS |
| AC4: `completed` → "Concluído em {data}" | exact phrase | `mobile/src/core/ui/__tests__/PatientLifecycleActions.test.tsx:130-140` - `getByText('Concluído em 20/05/2026')` | ✅ PASS |
| AC5: `active` → omite "desde quando" | no since-text rendered | `mobile/src/core/ui/__tests__/PatientLifecycleActions.test.tsx:58-70` - `queryByTestId('lifecycle-status-since')` null | ✅ PASS |

### P8: Publicar atualização OTA — OUT OF SCOPE FOR THIS PASS

| Criterion | Result |
| --- | --- |
| AC1: `eas update` publica nos 2 canais | ⏸️ Pending — T22 is an external CLI action requiring explicit user confirmation, not executed in this pass |
| AC2: device reabre e aplica update sem rebuild | ⏸️ Pending — T23 is manual device verification, not executed in this pass |
| AC3: `app.json` version 1.0.0→1.1.0 before publish | ✅ PASS — `mobile/app.json` version confirmed `1.1.0` (T21 code change, verified) |

**Status**: ✅ All in-scope ACs (P1–P7, P9) covered and match spec-defined outcomes. 1 spec-precision
gap flagged (P7 AC3, structural not assertion-level). P8 OTA-publish ACs pending manual/external
execution (T22/T23), out of this pass's scope per explicit instruction.

---

## Discrimination Sensor

Ran in an isolated `git worktree` at `e9ac1aa` (symlinked `node_modules` from the real tree, no
writes to the real tree). Baseline `git status --porcelain` on the real tree was empty before and
after the sensor run.

| # | File:line | Description | Killed? |
| --- | --- | --- | --- |
| 1 | `mobile/src/core/patients/date.ts:8` | Flipped `<` to `<=` in `calculateAge`'s birthday comparison (off-by-one on the exact-birthday boundary) | ✅ Killed — `date.test.ts` "calcula corretamente no dia exato do aniversário" failed (expected 26, got 25) |
| 2 | `mobile/src/core/patients/labels.ts:4` | Changed `GOAL_LABELS.lose_weight` from `'Emagrecimento'` to `'Emagrecimento total'` | ✅ Killed — `labels.test.ts` failed (expected `'Emagrecimento'`, got `'Emagrecimento total'`) |
| 3 | `mobile/src/core/patients/labels.ts:14` | Swapped `lifecycleActionLabel('inactive')` target from `'active'` to `'inactive'` | ✅ Killed — `labels.test.ts` failed (`toEqual` mismatch on `target`) |
| 4 | `mobile/src/core/patients/useChangePatientStatusMutation.ts:23-26` | Removed `queryClient.setQueryData(['patient', input.id], data)` from `onSuccess` (status no longer written to cache on success) | ✅ Killed — `useChangePatientStatusMutation.test.tsx` "atualiza o status exibido..." failed (expected `'inactive'`, got `'active'`) |
| 5 | `mobile/src/app/patients/[id]/index.tsx:303-311` | Inverted `Alert.alert` button wiring — `onPress` (delete call) moved to the `Cancelar` button, `Excluir` button left with no handler | ✅ Killed — `index.test.tsx` delete-confirm/cancel/error tests failed (3 of 4 failures in the combined run; 4th was mutation 4's effect on the lifecycle test in the same file) |

**Sensor depth**: lightweight (5 targeted mutations across pure functions, a mutation hook, and a
screen-level side effect)
**Result**: 5/5 killed - PASS ✅

Cleanup: scratch worktree removed (`git worktree remove --force`), real tree `git status --porcelain`
confirmed empty before and after (matches baseline).

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ — each task's diff matches its stated scope, no extra surface |
| Surgical changes | ✅ — `patchPatientFollowUp` kept as a thin wrapper per design decision, no unrelated refactors found |
| No scope creep | ✅ — list/detail screens only touched where the design explicitly calls for it (badge/age/copy/lifecycle/delete adoption), no redesign |
| Matches patterns | ✅ — new hooks follow existing `useSetFollowUpMutation` cancel/invalidate shape; new components use `useTheme()` exclusively, no literal color/radius/font found in new files |
| Spec-anchored outcome check (asserted values match spec) | ✅ — see table above, exact labels/formats/payloads verified |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ — pure functions (`date.ts`/`labels.ts`) have 1:1 branch coverage; routes (`new.tsx`, `edit.tsx`, `[id]/index.tsx`, `(tabs)/index.tsx`) cover success + validation error + network error + not-found paths |
| Every test maps to a spec requirement - no unclaimed tests | ✅ — all new/changed test files map directly to UXMOB-* requirements or listed edge cases |
| Documented guidelines followed | CLAUDE.md §5.4 (schema→fetch→parse→hook), §5.5 (4 UI states, empty≠error), §5.6 (no optimism for status/delete), §10 (behavior tests, no snapshot-only) |

One documented deviation found in the diff surface: none. (The pre-existing `SPEC_DEVIATION` comment
about `FlashList` v2 dropping `estimatedItemSize` in `(tabs)/index.tsx` predates this feature's diff —
confirmed via `git diff ba89fac..e9ac1aa -- mobile/src/app/\(tabs\)/index.tsx`, which shows no match for
that string; it is untouched by T1–T21 and out of this pass's scope.)

---

## Edge Cases

- [x] Perda de conexão no meio do form preserva os dados digitados (P1 AC5) — `new.test.tsx:95-106`
- [x] Editar um paciente excluído por outra sessão (404) trata como erro e volta à lista — `edit.test.tsx:112-124`
- [x] Filtro "Inativos e concluídos" ativo + criar paciente novo → paciente novo fica fora da visão atual — implícito: criação sempre gera `active`, e o filtro é um parâmetro de query independente do estado local (`usePatientsQuery` query-key separado por `statusFilter`, `usePatientsQuery.test.tsx:174-219`); nenhuma mudança automática de filtro é disparada por `useCreatePatientMutation`'s `onSuccess` (só invalida, não força refetch do filtro atual para "active") — ⚠️ Spec-precision gap: nenhum teste dedicado simula "criar durante filtro inativo" ponta-a-ponta; a garantia é estrutural (invalidação de query key, não force de UI), não testada diretamente
- [x] `aiActionsEnabled` desligada não afeta CRUD/status/badge — estrutural: nenhuma das mutations/telas novas consulta `useFlag('aiActionsEnabled')`; `index.test.tsx` roda com `mockedUseFlag.mockReturnValue(true)` fixo, sem teste explícito do inverso para esta feature especificamente (a garantia herda do isolamento arquitetural, não é re-testada aqui)

---

## Gate Check

- **Gate command**: `npm run pretest && npm test && npx tsc --noEmit`
- **Result**: 249 tests passed, 0 failed, 0 skipped (43 suites); `pretest` (lint + brand-boundary script) clean; `tsc --noEmit` clean
- **Test count before feature**: 164 tests / 31 suites (measured at `ba89fac`, pre-mobile-feature baseline)
- **Test count after feature**: 249 tests / 43 suites
- **Delta**: +85 tests / +12 suites
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

None. No gaps found that require a fix task.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| UXMOB-01 to UXMOB-06 | Implementing | ✅ Verified |
| UXMOB-07 to UXMOB-10 | Implementing | ✅ Verified |
| UXMOB-11 to UXMOB-14 | Implementing | ✅ Verified |
| UXMOB-15 to UXMOB-20 | Implementing | ✅ Verified |
| UXMOB-21 to UXMOB-24 | Implementing | ✅ Verified |
| UXMOB-25 to UXMOB-27 | Implementing | ✅ Verified |
| UXMOB-28 to UXMOB-30 | Implementing | ✅ Verified |
| UXMOB-31, UXMOB-32 | Implementing | ⏸️ Pending (T22/T23 manual/external) |
| UXMOB-33 | Implementing | ✅ Verified (version bump code confirmed; publish itself is UXMOB-31/32) |
| UXMOB-34 to UXMOB-38 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready (P1–P7, P9 in-scope work). P8 OTA publish (T22/T23) awaits explicit user
confirmation and manual device verification — not a code gap.

**Spec-anchored check**: 35/36 in-scope ACs matched spec outcome exactly; 1 spec-precision gap
flagged (P7 AC3, structural rather than assertion-proven)

**Sensor**: 5/5 mutations killed

**Gate**: 249 passed, 0 failed (pretest + test + tsc --noEmit all clean)

**What works**: Full patient CRUD (create/edit/delete), the 4 lifecycle transitions with correct
per-origin labels, status filter with distinct empty state, goal/biomarker-status as a shared neutral
`Badge`, age and `dd/MM/yyyy` dates throughout, brand-specific empty-state copy for biomarkers and the
filtered list. All new code follows the schema→fetch→parse→hook→component chain, uses `useTheme()`
exclusively (no literal colors/radii/fonts), and none of the 4 new mutations use `onMutate` (per the
context.md decision that status/delete are too sensitive for optimism).

**Issues found**: None blocking. Two minor spec-precision gaps noted (P7 AC3 empty/error separation is
structural not assertion-proven; the "create during inactive filter" and "aiActionsEnabled off doesn't
affect CRUD" edge cases rely on architectural isolation rather than a dedicated end-to-end test) — low
risk, no fix task warranted.

**Next steps**: Route T22 (eas update publish, requires explicit user confirmation per skill's
blast-radius guidance) and T23 (manual device verification) back to the user/implementer when ready to
close P8.
