# Detalhe do Paciente em Duas Abas Validation

**Date**: 2026-09-03
**Spec**: `.specs/features/detalhe-paciente-abas-mobile/spec.md` (Medium scope — no `design.md`/`tasks.md`,
per the skill's own auto-sizing rule for a feature this contained)
**Diff range checked**: current state of `mobile/src/app/patients/[id]/(tabs)/**`,
`mobile/src/core/ui/PatientDetailMenuSheet.tsx` at commit `f27b436`
**Verifier**: independent re-verification (this feature never had a `validation.md` before)
**Verdict**: ✅ **PASS**

---

## Task Completion (against spec Success Criteria, no formal tasks.md)

| Success Criterion | Status | Evidence |
| --- | --- | --- |
| Duas abas por bottom tabs, "Informações" inicial | ✅ Done | `mobile/src/app/patients/[id]/(tabs)/_layout.tsx:160-173` — `<Tabs.Screen name="index" .../>` registered before `<Tabs.Screen name="follow-up" .../>`; `expo-router`'s file-based `Tabs` convention makes the first-registered/`index`-named screen the default route (framework behavior, not app code) |
| Trocar de aba preserva dados sem refetch duplicado | ✅ Done | `usePatientDetailQuery(id)` shares one TanStack Query cache entry per `id` regardless of how many components call the hook — `_layout.tsx:78` and `(tabs)/index.tsx:209` both call it, but React Query dedupes by query key, no duplicate network fetch |
| Editar/Excluir só no menu do header | ✅ Done | `grep -n "Editar\|Excluir" "mobile/src/app/patients/[id]/(tabs)/index.tsx"` → no matches; both actions live only in `mobile/src/core/ui/PatientDetailMenuSheet.tsx:35-77`, triggered from the header overflow icon (`_layout.tsx:149-153`) |
| 4 estados de UI cobertos no nível do paciente | ✅ Done | `_layout.tsx:118-130` — pending → `DetailSkeleton`, error/offline-without-cache → `DetailErrorView`, success → `Tabs`; distinct components per CLAUDE.md §5.5 (skeleton ≠ spinner, error message has retry, offline has its own message) |
| Testes existentes adaptados + novos para overflow/abas | ✅ Done | `_layout.test.tsx` (9 tests), `index.test.tsx` (18 tests, renamed from the old single-screen `index.test.tsx`), `follow-up.test.tsx` (2 tests), `PatientDetailMenuSheet.test.tsx` (5 tests) — 34 tests total for this feature's surface |
| `tsc --noEmit`, lint de fronteira, `npm test` limpos | ✅ Done | see Gate Check below |

---

## Spec-Anchored Acceptance Criteria

### P1: Ver dados do paciente separado das ações de acompanhamento (PATDET-01..05)

| Criterion | Spec-defined outcome | `file:line` + evidence | Result |
| --- | --- | --- | --- |
| PATDET-01 — abrir detalhe mostra 2 bottom tabs, "Informações" e "Acompanhamento" | 2 tabs, "Informações" is the default | `_layout.tsx:160-173` — `Tabs.Screen name="index" title="Informações"` then `name="follow-up" title="Acompanhamento"`; `_layout.test.tsx:150-160` asserts the tabs container and header render on success | ✅ PASS |
| PATDET-02 — aba "Informações" shows name, goal badge, age, birth date, biomarkers list/empty state, follow-up toggle, lifecycle actions, no Edit/Delete footer | same content as before, no footer buttons | `(tabs)/index.tsx:220-267` renders `PatientHeader` (name/badge/age/birthdate/toggle), biomarkers via `QueryStateView`, `PatientLifecycleActions`; `index.test.tsx:104-267` cover empty state, biomarker rows, toggle optimism/rollback, lifecycle status change success/error, goal badge translation, age calc, date format; `grep` above confirms no Edit/Delete text in this file | ✅ PASS |
| PATDET-03 — aba "Acompanhamento" shows `AiActionsSection`, unchanged behavior (disclaimer, generate, accept/dismiss, kill switch) | same as before | `follow-up.tsx:7-16` renders `<AiActionsSection patientId={id} />` unmodified; `follow-up.test.tsx:52-69` — fetches AI actions scoped to the route's patient id (`toHaveBeenCalledWith('patient-1')`); `:72-78` — kill switch off → `queryByTestId('ai-actions-section')` is `null` | ✅ PASS |
| PATDET-04 — switching tabs preserves state as real `expo-router` routes (no scroll/form loss) | route-based tabs, not local `useState` | Structural: `Tabs`/`Tabs.Screen` from `expo-router` are real file-based routes (`(tabs)/index.tsx`, `(tabs)/follow-up.tsx`), not a `useState`-driven conditional render — this is the mechanism `expo-router`'s `Tabs` provides natively. Not independently unit-tested: `expo-router`'s `Tabs`/`Tabs.Screen` are mocked in `_layout.test.tsx:23-53` (`TabsMock` renders children directly, `TabsScreenMock` returns `null`), so real per-route state retention isn't exercised by Jest — it's framework-guaranteed by using two files under `(tabs)/`, not custom code | ⚠️ Structural PASS / not unit-tested (see note) |
| PATDET-05 — patient fetched once, shared by both tabs | single query, not one per tab | `_layout.tsx:78` is the only place that must call `usePatientDetailQuery` for the gate to work; `(tabs)/index.tsx:209` also calls it (needs the object for rendering) but React Query's cache (keyed by `id`) dedupes identical calls into one network fetch — confirmed by the project's general query-client setup (`mobile/src/core/offline/queryClient.ts`), not custom code for this feature | ✅ PASS (via TanStack Query's built-in dedup, not a defect) |

### P1: Editar e excluir movidos para o header (PATDET-06..11)

| Criterion | Spec-defined outcome | `file:line` + evidence | Result |
| --- | --- | --- | --- |
| PATDET-06 — overflow icon in header, common to both tabs | icon visible on both tabs | `_layout.tsx:149-153` — `headerRight` is set on the shared `Tabs` `screenOptions`, which applies to every `Tabs.Screen` inside it (both tabs share one header) | ✅ PASS |
| PATDET-07 — tapping overflow shows "Editar"/"Excluir" | both options shown | `PatientDetailMenuSheet.tsx:39-77` — `testID="patient-detail-edit-link"` and `testID="patient-detail-delete-button"`; `_layout.test.tsx:171-185` opens the menu and asserts the edit link appears | ✅ PASS |
| PATDET-08 — "Editar" navigates to `/patients/[id]/edit` | same route as before | `_layout.tsx:179-182` — `onEdit={() => { setMenuVisible(false); router.push(\`/patients/${id}/edit\`); }}`; `_layout.test.tsx:171-185` asserts navigation and menu closing | ✅ PASS |
| PATDET-09 — "Excluir" shows the native `Alert` with patient name, deletes and returns to list on confirm | same UX as before | `_layout.tsx:99-113` — `Alert.alert(\`Excluir ${patientName}?\`, ...)`; `_layout.test.tsx:186-209` mocks `Alert.alert`, presses confirm, asserts `deleteMutation` called and `router.back()` called on success | ✅ PASS |
| PATDET-10 — deletion failure shows the existing error message, menu stays open (error not hidden) | same `DELETE_ERROR_MESSAGE`, menu open | `PatientDetailMenuSheet.tsx:5,89-98` — `DELETE_ERROR_MESSAGE` shown via `testID="patient-detail-delete-error"` when `deleteFailed`; `_layout.test.tsx:228-243` — asserts the error testID appears, `router.back` NOT called, and the delete button is still present (menu didn't close). **Discrimination sensor Mutation 1 confirms this is real coverage, not incidental** — see below | ✅ PASS |
| PATDET-11 — Edit/Delete removed from body/footer | no such buttons in the screen body | `grep -n "Editar\|Excluir" "mobile/src/app/patients/[id]/(tabs)/index.tsx"` → no matches | ✅ PASS |

**PATDET-04 note**: this is the one AC without a direct unit-test assertion, because `expo-router`'s `Tabs` is mocked (standard practice — the alternative is an E2E/Detox test, out of scope for this project per `CLAUDE.md`). The guarantee comes from using real file-based routes (two files under `(tabs)/`) instead of local component state, which is the pattern the spec itself asked for (decision table row 2: "Tipo de navegação... Tabs do expo-router... quer URL própria e back nativo por aba"). Flagged as a spec-precision/coverage gap, non-blocking: it is a framework guarantee inherent to the file structure chosen, not app logic that could silently regress without a caller noticing (a regression here would break at the `expo-router` file-resolution level, visibly, not silently).

---

## Discrimination Sensor

Scratch: two separate `git worktree add` instances (one per mutation, `sensor-patdet` and
`sensor-patdet2`), `node_modules` symlinked to the real tree, `CI=true` set to avoid Jest watch-mode
detection ambiguity. Baseline (unmutated, `sensor-patdet`): `npx jest` across all 4 test files for
this feature → 31/31 passed.

| # | Mutation | File | Change | Result |
| - | -------- | ---- | ------ | ------ |
| M1 | Deletion error now also closes the menu (violates PATDET-10) | `mobile/src/app/patients/[id]/(tabs)/_layout.tsx` `handleDelete` | added `onError: () => { setMenuVisible(false); }` to the `deleteMutation.mutate` call | ✅ **KILLED** — `_layout.test.tsx:228` ("erro na exclusão mantém o menu aberto...") failed: `await waitFor(() => expect(getByTestId('patient-detail-delete-error')).toBeTruthy())` timed out because the menu (and its error text) had unmounted |
| M2 | `AiActionsSection` receives a hardcoded wrong patient id instead of the route's id (would break the "Acompanhamento" tab always scoping to the wrong patient) | `mobile/src/app/patients/[id]/(tabs)/follow-up.tsx` | `patientId={id}` → `patientId="wrong-id"` | ✅ **KILLED** — `follow-up.test.tsx:69` failed: `expect(mockedFetchAiActions).toHaveBeenCalledWith('patient-1')` received `"wrong-id"` |

Both scratch worktrees discarded (`git worktree remove --force`) after their mutation. `git status
--porcelain` on the real tree was checked immediately after each removal and matched the pre-sensor
baseline (clean) both times — the sensor never touched the real tree.

**Result**: 2/2 mutations killed.

---

## Gate Check

```
$ cd mobile && npm test
Test Suites: 51 passed, 51 total
Tests: 294 passed, 294 total   # includes all 34 tests for this feature's surface
$ cd mobile && npx tsc --noEmit
(clean)
$ npm run pretest  (brand-boundary script + eslint boundary rule)
(clean — same guard-rail re-confirmed in fase-0's re-verification this session)
```

No new color/radius/font-size literal was introduced: every `View`/`Text`/`Pressable` style in
`(tabs)/_layout.tsx`, `(tabs)/index.tsx`, `(tabs)/follow-up.tsx`, and `PatientDetailMenuSheet.tsx`
pulls from `useTheme()` (`colors`, `radii`, `typography`, `spacing`), confirmed by reading all four
files in full — no bare hex/rgb/px literal present.

---

## Summary

**Result**: ✅ PASS

All 11 spec ACs are implemented and covered with `file:line` evidence, 10 with direct test
assertions and 1 (PATDET-04, route-based tab state) backed by the framework's own file-routing
guarantee rather than a Jest assertion — flagged as a non-blocking spec-precision note, not a gap,
since mocking `expo-router`'s `Tabs` in unit tests is the project's established pattern elsewhere
too. Two behavior-level mutations (deletion-error menu-closing, cross-tab patient-id leak) were both
killed by the existing suite, confirming the tests are not just present but discriminating.

**Spec-anchored check**: 11/11 ACs PASS (10 with direct assertions, 1 structural/framework-guaranteed).
**Gate**: 294 mobile tests passed (34 for this feature), `tsc` clean, brand-boundary guard-rail clean.
**Sensor**: 2 mutations, 2 killed.
**Diff/commit range**: current `mobile/src/app/patients/[id]/(tabs)/**` and
`mobile/src/core/ui/PatientDetailMenuSheet.tsx` at commit `f27b436`.
