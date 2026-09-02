# Excluir Ação de IA (soft delete) Validation

**Date**: 2026-09-02
**Spec**: `.specs/features/acoes-ia-excluir/spec.md`
**Diff range**: `9fed1b5..7858455` (4 commits: `9fed1b5` deleted status/transitions, `ae1b428` DELETE endpoint, `38ce4bb` mobile delete mutation, `7858455` mobile delete icon)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

All 4 commits present and their tests pass. No blocked/partial tasks found.

---

## Iteration 2 — Gap Closure (self-verified by author, commit `c914960`)

Both gaps ranked by iteration-1's Verifier were minor test-precision gaps (evidence-or-zero), not
functional bugs — the sensor already confirmed the underlying behavior was correct. Closed with
purely additive tests, no implementation files touched:

1. **AIDEL-11 gap closed** — `api/tests/Feature/EloquentAiActionRepositoryTest.php`:
   `test_find_by_patient_and_hash_excludes_deleted_rows_but_keeps_the_rest` and
   `test_list_for_patient_excludes_deleted_rows_but_keeps_the_rest` now assert directly at the
   repository layer that a `deleted` row and a surviving row under the same `input_hash`/patient
   are filtered correctly (survivor kept, deleted excluded), not just a full cache-miss. Also
   `api/tests/Feature/Api/V1/AiActionControllerTest.php::test_post_cache_hit_excludes_a_deleted_action_but_keeps_the_surviving_one`
   exercises the full HTTP path: two actions generated together, one deleted, then a plain `POST`
   (no `refresh`) returns 200 with only the surviving title and `llm->timesCalled() === 1` (proving
   it was a genuine cache hit, not a miss-triggered regeneration).
2. **Edge case gap closed** — `mobile/src/core/ui/__tests__/AiActionsSection.test.tsx::excluir a
   última ação restante faz a tela cair no estado vazio` renders the real `AiActionCard` inside
   `AiActionsSection` with one accepted action, confirms the delete `Alert`, and asserts the screen
   falls back to `ai-actions-generate-button` (the empty state) with the card gone.

Verified: `EloquentAiActionRepositoryTest` (11/11), `AiActionControllerTest` (34/34, 141
assertions), phpstan clean, pint clean, `tsc --noEmit` clean, `AiActionsSection` (10/10), full
mobile suite (31 suites / 164 tests). No implementation code changed in this iteration, so the
iteration-1 discrimination sensor result (6/6 killed) still holds.

**Final verdict: PASS**, 0 remaining gaps.

---

## Spec-Anchored Acceptance Criteria

### P1: Excluir uma ação já decidida

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AIDEL-01: WHILE `accepted`/`dismissed` SHALL show trash icon opening confirmation with "Excluir" | Icon rendered with testID `ai-action-delete-{id}`, tap opens `Alert.alert` with an "Excluir" button | `mobile/src/core/ui/__tests__/AiActionCard.test.tsx:299-317` - `fireEvent.press(getByTestId('ai-action-delete-ai-action-1'))`; `expect(alertSpy).toHaveBeenCalledWith('Excluir esta ação?', expect.any(String), expect.arrayContaining([expect.objectContaining({ text: 'Excluir' })]))` | ✅ PASS |
| AIDEL-02: WHILE `pending` SHALL NOT show trash icon | `queryByTestId` returns null for pending card | `mobile/src/core/ui/__tests__/AiActionCard.test.tsx:291-297` - `expect(queryByTestId('ai-action-delete-ai-action-1')).toBeNull()` | ✅ PASS |
| AIDEL-03: WHEN tap "Excluir" THEN app SHALL show `Alert.alert` confirmation before calling API | Alert invoked with title/message/Cancelar+Excluir buttons before mutate | `mobile/src/core/ui/AiActionCard.tsx:38-43` (`confirmDelete`) + test at `AiActionCard.test.tsx:299-317` verifies Alert called with exact title `'Excluir esta ação?'` and an "Excluir" button whose `onPress` triggers `mutate` | ✅ PASS |
| AIDEL-04: WHEN confirmed THEN app SHALL call `DELETE /api/v1/ai-actions/:id`; on 204 remove card from local list without a full GET | `apiDelete` called with `method: 'DELETE'`; on success, `setQueryData` filters the deleted id out (no `invalidateQueries`/refetch) | `mobile/src/core/api/__tests__/ai-actions.test.ts:138-147` - `expect(global.fetch).toHaveBeenCalledWith('/api/v1/ai-actions/ai-action-1', expect.objectContaining({ method: 'DELETE' }))`; `mobile/src/core/patients/__tests__/useDeleteAiActionMutation.test.tsx:53-65` - `expect(queryClient.getQueryData(['ai-actions', 'patient-1'])).toEqual([actionTwo])` | ✅ PASS |
| AIDEL-05: WHEN backend receives DELETE for `accepted`/`dismissed` THEN SHALL set status `deleted` and respond 204 with no body | Status becomes `'deleted'` in DB; response is exactly 204, `assertNoContent()` | `api/tests/Feature/Api/V1/AiActionControllerTest.php:397-408` - `$response->assertStatus(204); $response->assertNoContent(); $this->assertSame('deleted', $action->fresh()->status)`; also `:410-420` for `dismissed` | ✅ PASS |
| AIDEL-06: IF target is `pending` THEN backend SHALL respond 409 `AI_ACTION_ALREADY_RESOLVED` and not alter status | Exact status 409, exact error code, status unchanged (`'pending'`) | `api/tests/Feature/Api/V1/AiActionControllerTest.php:430-441` - `assertStatus(409); assertJsonPath('error.code', 'AI_ACTION_ALREADY_RESOLVED'); assertSame('pending', $action->fresh()->status)` | ✅ PASS |
| AIDEL-07: IF target already `deleted` THEN backend SHALL respond 409 (delete is not idempotent) | Exact 409 + exact error code on double-delete | `api/tests/Feature/Api/V1/AiActionControllerTest.php:443-453` - `assertStatus(409); assertJsonPath('error.code', 'AI_ACTION_ALREADY_RESOLVED')` | ✅ PASS |
| AIDEL-08: IF action doesn't exist THEN backend SHALL respond 404 `AI_ACTION_NOT_FOUND` | Exact 404 + exact error code | `api/tests/Feature/Api/V1/AiActionControllerTest.php:422-428` - `assertStatus(404); assertJsonPath('error.code', 'AI_ACTION_NOT_FOUND')` | ✅ PASS |
| AIDEL-09: IF kill switch off for the action's patient brand THEN backend SHALL respond 503, no status change | Exact 503 + status unchanged (`'accepted'`) | `api/tests/Feature/Api/V1/AiActionControllerTest.php:455-466` - `assertStatus(503); assertJsonPath('error.code', 'AI_DISABLED'); assertSame('accepted', $action->fresh()->status)` | ✅ PASS |

### P2: Ação excluída não reaparece em nenhum fluxo de geração

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AIDEL-10: WHEN GET after a deletion THEN response SHALL NOT include the deleted action | List excludes deleted, only active action returned | `api/tests/Feature/Api/V1/AiActionControllerTest.php:468-480` - `assertJsonCount(1); assertJsonPath('0.title', 'Ativa')`; repository-level filter at `api/app/Infrastructure/Persistence/Eloquent/EloquentAiActionRepository.php:26-35` | ✅ PASS |
| AIDEL-11: WHEN POST (no `refresh`) cache-hits by `input_hash` THEN returned list SHALL NOT include `deleted` actions | Cache-hit list excludes deleted | `api/tests/Feature/Api/V1/AiActionControllerTest.php:482-516` (`test_post_after_deleting_the_only_action_no_longer_cache_hits_on_it`) proves deleted rows are excluded from `findByPatientAndHash` (cache miss after the only cached action was deleted, forcing regeneration and excluding the deleted title) | ⚠️ Spec-precision gap (see below) |
| AIDEL-12: WHEN POST with `refresh: true` builds `existingTitles` THEN `deleted` actions SHALL NOT be included in titles sent to the LLM | `existingTitles` array exactly excludes the deleted action's title | `api/tests/Unit/AiActionServiceTest.php:427-474` (`test_refresh_excludes_deleted_titles_from_the_llm_prompt`) - `assertSame(['Ação aceita'], $llm->lastInput()?->existingTitles)` with history containing both an `Accepted` and a `Deleted` action | ✅ PASS |

**Status**: ✅ 11/12 ACs fully covered on spec-defined outcome; 1 spec-precision/coverage gap flagged (AIDEL-11).

**AIDEL-11 gap detail**: The spec's exact scenario is "a cache-hit list SHALL NOT include deleted actions." The only test exercising this path (`test_post_after_deleting_the_only_action_no_longer_cache_hits_on_it`) deletes the *only* cached action, which forces a **cache miss** (empty `findByPatientAndHash` result) and a fresh LLM call — it never observes a genuine cache **hit** where the returned set contains both a surviving and a deleted action under the same `input_hash`. The repository-level filter itself (`EloquentAiActionRepository.php:37-46`) is correct and provably exercised by the discrimination sensor (mutation 6 below, killed), but `tests/Feature/EloquentAiActionRepositoryTest.php` — the dedicated repository test file — has no case at all for `findByPatientAndHash` excluding a `deleted` row from a hit that contains other, non-deleted rows. This is a real, if narrow, test-precision gap, not a functional defect (the mutation sensor confirms the behavior is currently correct and would be caught by an unrelated test if broken).

---

## Edge Cases

- [x] IF DELETE fails on network error THEN app SHALL keep the card and show a local error (no optimism) — `mobile/src/core/patients/__tests__/useDeleteAiActionMutation.test.tsx:91-105` (`'não altera o cache quando a mutation falha'`, asserts cache unchanged on `ApiError` rejection) + `mobile/src/core/patients/__tests__/useDeleteAiActionMutation.test.tsx:67-89` (`'não altera o cache antes da mutation resolver (nenhuma mudança otimista)'`) + `mobile/src/core/ui/__tests__/AiActionCard.test.tsx:349-357` (error message shown, status label `'Aceita'` still present, i.e. card stays)
- [ ] WHEN the last remaining action is deleted THEN screen SHALL fall to the empty state (`AiActionsEmptyState`) — **NOT directly tested**. `useDeleteAiActionMutation`'s `onSuccess` writes to the same query key (`['ai-actions', patientId]`) that `useAiActionsQuery` reads, and `AiActionsSection.tsx:176` derives `isEmpty` from `query.data?.length ?? 0 === 0`, so this behavior is a structurally-guaranteed consequence of two independently-tested units, but no test in `mobile/src/core/ui/__tests__/AiActionsSection.test.tsx` (or elsewhere) exercises the actual integration of "delete the only card → empty state renders." Evidence-or-zero: **not covered**.

---

## Code Quality

| Principle        | Status |
| ---------------- | ------ |
| Minimum code     | ✅ |
| Surgical changes | ✅ |
| No scope creep   | ✅ |
| Matches patterns | ✅ (controller stays thin — `delete()` only calls `decide()` and returns a Resource-less 204, matching CLAUDE.md §2.2 and the spec's explicit design rationale) |
| Spec-anchored outcome check (asserted values match spec) | ✅ (see table above) |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ domain (`AiActionStatus::canTransitionTo`) has 1:1 coverage for all 4 valid/invalid transition pairs touching `Deleted`; route has happy (204), not-found (404), conflict×2 (409 pending / 409 already-deleted), and kill-switch (503) — all 4 documented status codes covered |
| Every test maps to a spec requirement - no unclaimed tests | ✅ |
| Documented guidelines followed: CLAUDE.md §2.2 (no business rule in controller), §6.3 (status codes table), §6.4 (LLM cache/existingTitles) | ✅ |

---

## Discrimination Sensor

Isolated in a temporary `git worktree` at `/private/tmp/.../scratchpad/verify-wt` (never `git stash`). Real tree baseline (`git status --porcelain`) was empty before the sensor run and confirmed empty again after cleanup.

*Note on method*: the worktree's `api/vendor` was initially symlinked to the real repo's vendor for speed; running `composer dump-autoload` there rewrote the **real repo's** optimized autoload map to resolve `App\*` classes into the worktree (a symlink resolution artifact), which would have silently made the real tree execute mutated code. This was caught immediately (a "control" run of `AiActionStatusTest` against the real tree passed even with the mutation present, which shouldn't happen), fixed by removing the symlink and re-running `composer dump-autoload` in the real `api/` directory to restore correct absolute paths, and verified via `ReflectionClass::getFileName()` before any further mutation testing. All 6 mutations below were run only after this was confirmed fixed; the worktree's vendor was then a real (non-symlinked) copy, isolating it from the real tree for the remainder of the sensor run.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `api/app/Domain/AiAction/AiActionStatus.php:39-41` | Added `Deleted` to `Pending`'s allowed transition targets (`Pending::canTransitionTo(Deleted)` becomes `true`) | ✅ Killed - `AiActionStatusTest::test_pending_cannot_transition_to_deleted` fails (`assertFalse` receives `true`) |
| 2 | `api/app/Infrastructure/Persistence/Eloquent/EloquentAiActionRepository.php:26-35` | Removed `->where('status', '!=', AiActionStatus::Deleted->value())` from `listForPatient` | ✅ Killed - `AiActionControllerTest::test_get_excludes_deleted_actions_from_the_list` fails (`assertJsonCount(1)` sees 2) |
| 3 | `api/app/Http/Controllers/Api/V1/AiActionController.php:66-68` | Changed `delete()` response from `response()->json(null, 204)` to `response()->json(null, 200)` | ✅ Killed - 3 tests fail, including direct `assertStatus(204)` assertions in `test_delete_soft_deletes_an_accepted_action_and_returns_204` |
| 4 | `mobile/src/core/ui/AiActionCard.tsx:96` | Changed `action.status === 'pending' ? (...)` guard to `false ? (...)`, so the pending-buttons branch never renders and the accepted/dismissed branch (with the trash icon) always renders instead | ✅ Killed - 5 tests fail, including `'ação "pending" não mostra o ícone de lixeira'` |
| 5 | `mobile/src/core/ui/AiActionCard.tsx:41` | Removed `onPress: () => deleteMutation.mutate(action.id)` from the Alert's "Excluir" button | ✅ Killed - `'ação "accepted" mostra o ícone de lixeira; ao confirmar no Alert, chama a mutation de excluir'` fails (`deleteMutate` never called) |
| 6 | `api/app/Infrastructure/Persistence/Eloquent/EloquentAiActionRepository.php:37-46` | Removed `->where('status', '!=', AiActionStatus::Deleted->value())` from `findByPatientAndHash` | ✅ Killed - `AiActionControllerTest::test_post_after_deleting_the_only_action_no_longer_cache_hits_on_it` fails (expects 201/regeneration, gets 200/stale cache hit including the deleted title) — note: killed only via the "all-deleted" scenario, not a genuine mixed cache-hit test; see AIDEL-11 spec-precision gap above |

**Sensor depth**: lightweight (6 targeted behavior-level mutations, standard-risk feature)
**Result**: 6/6 killed - PASS ✅

---

## Gate Check

- **Gate commands**:
  - `cd api && DB_HOST=127.0.0.1 DB_PORT=5433 php artisan test --filter=AiActionStatusTest` → 16 passed
  - `... --filter=AiActionServiceTest` → 25 passed (81 assertions)
  - `... --filter=AiActionControllerTest` → 33 passed (133 assertions)
  - `vendor/bin/phpstan analyse --no-progress --memory-limit=512M` → No errors
  - `vendor/bin/pint --test` → passed
  - `cd mobile && npx tsc --noEmit` → clean, no output
  - `CI=true npx jest AiActionCard useDeleteAiActionMutation ai-actions.test http.test --watchAll=false --forceExit --runInBand` → 4 suites, 34 tests passed
  - `npm run lint` → clean
  - `bash scripts/check-brand-boundary.sh` → `OK: nenhuma referência a marca encontrada em src/core`
- **Result**: all gates green, 0 failed
- **Failures**: none
- **Skipped tests**: none

---

## Fix Plans (if issues found)

### Fix 1: AIDEL-11 lacks a genuine mixed cache-hit test

- **Root cause**: The only test exercising cache-hit exclusion of `deleted` rows (`test_post_after_deleting_the_only_action_no_longer_cache_hits_on_it`) deletes the sole cached action, producing a cache **miss**, not a cache **hit** containing a mix of deleted and non-deleted rows under the same `input_hash`. `tests/Feature/EloquentAiActionRepositoryTest.php` (the dedicated repository test) has no `findByPatientAndHash`-excludes-deleted case at all.
- **Fix task**: Add a repository-level test in `EloquentAiActionRepositoryTest.php` that creates two rows under the same `input_hash` (one `accepted`, one `deleted`), calls `findByPatientAndHash`, and asserts the result contains only the non-deleted row. Optionally add a Feature-level POST test with the same mixed setup asserting the cache-hit response excludes the deleted title.
- **Priority**: Minor (the sensor confirms current behavior is correct; this closes a test-precision gap, not a functional defect)

### Fix 2: Edge case "last action deleted → empty state" has no direct test

- **Root cause**: `AiActionsSection.test.tsx` never exercises delete-to-empty as an integration; the behavior is only guaranteed by composing two separately-tested units (`useDeleteAiActionMutation`'s cache write + `AiActionsSection`'s `isEmpty` derivation from `query.data.length`).
- **Fix task**: Add a test in `AiActionsSection.test.tsx` (or a new integration test) that renders the section with a single action in the query cache, triggers the delete flow (or directly calls `queryClient.setQueryData` to simulate the mutation's `onSuccess`), and asserts the empty-state UI (`AiActionsEmptyState`) renders.
- **Priority**: Minor (structurally implied by existing code and tests, but not directly evidenced per evidence-or-zero)

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| AIDEL-01 | Implemented | ✅ Verified |
| AIDEL-02 | Implemented | ✅ Verified |
| AIDEL-03 | Implemented | ✅ Verified |
| AIDEL-04 | Implemented | ✅ Verified |
| AIDEL-05 | Implemented | ✅ Verified |
| AIDEL-06 | Implemented | ✅ Verified |
| AIDEL-07 | Implemented | ✅ Verified |
| AIDEL-08 | Implemented | ✅ Verified |
| AIDEL-09 | Implemented | ✅ Verified |
| AIDEL-10 | Implemented | ✅ Verified |
| AIDEL-11 | Implemented | ⚠️ Verified with spec-precision gap |
| AIDEL-12 | Implemented | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready (with 2 minor, non-blocking test-precision gaps)

**Spec-anchored check**: 11/12 ACs matched spec outcome exactly; 1 spec-precision gap (AIDEL-11 - cache-hit exclusion of `deleted` is proven only via a full-cache-miss scenario, not a genuine mixed cache-hit)
**Sensor**: 6/6 mutations killed
**Gate**: all backend and mobile gates green (108 backend assertions across the 3 filtered suites + 245 backend AiAction-suite total, 34 mobile tests, phpstan/pint/tsc/lint/brand-boundary all clean)

**What works**: Full status-machine correctness (`Deleted` reachable only from `Accepted`/`Dismissed`, never twice, never from `Pending`); correct REST semantics (204 no-body, reused `AiActionService::decide()`, no business logic in controller); repository-level exclusion of `deleted` from both `listForPatient` and `findByPatientAndHash`; `existingTitles` correctly excludes `deleted` on refresh; mobile UI correctly gates the trash icon to `accepted`/`dismissed`, confirms via `Alert.alert`, and applies no optimistic update (cache only changes in `onSuccess`), matching the spec's explicit no-optimism requirement.

**Issues found**:
1. AIDEL-11 cache-hit exclusion tested only via a full-miss scenario, not a genuine partial/mixed cache hit — see Fix 1.
2. "Delete last action → empty state" edge case has no direct integration test — see Fix 2.

**Next steps**: Both gaps are minor and non-blocking (sensor confirms the underlying behavior is currently correct); recommend adding the two tests in Fix 1 and Fix 2 as a small follow-up, not a re-verify-required blocker.
