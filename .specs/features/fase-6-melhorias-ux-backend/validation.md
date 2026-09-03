# Fase 6 — Melhorias UX Backend Validation

**Date**: 2026-09-02
**Spec**: `.specs/features/fase-6-melhorias-ux-backend/spec.md`
**Diff range**: `43afeec..1440d5b` (23 commits, `ad7dbce` first Domain commit through `1440d5b` e2e tests)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

All 22 tasks (T1-T22) marked complete in `tasks.md`. T10 formally deferred/merged into T16 per the
documented "merge backward" resolution — verified the merge actually happened: `UpdateFollowUpRequest.php`
does not exist in the tree, and `grep -rn UpdateFollowUpRequest api/app api/tests` returns nothing.

| Task | Status | Notes |
| --- | --- | --- |
| T1-T22 | ✅ Done | T10 merged into T16 (no standalone commit, by design) |

---

## Spec-Anchored Acceptance Criteria

### P1: Criar paciente

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: POST válido | `201` + `Location` header, `status=active`, `needsFollowUp=false` | `tests/Feature/Api/V1/PatientControllerTest.php:281-306` — `$response->assertStatus(201)`, `assertHeader('Location', "/api/v1/patients/{$id}")`, `assertJsonPath('status', 'active')`, `assertJsonPath('needsFollowUp', false)` | ✅ PASS |
| AC2: `name` ausente | `422`, erro em `name` | `:309-321` — `assertStatus(422)`, `assertJsonStructure(['error' => ['details' => ['name']]])` | ✅ PASS |
| AC3: `birthDate` formato/futuro | `422`, erro em `birthDate` | `:324-353` — two tests (`birth_date_is_not_in_the_expected_format`, `birth_date_is_in_the_future`), both `assertStatus(422)` + `details.birthDate` | ✅ PASS |
| AC4: `goal` fora do enum | `422`, erro em `goal` | `:356-369` — `assertStatus(422)` + `details.goal` | ✅ PASS |
| AC5: `brand` ausente | `422`, erro em `brand` | `:372-382` — `assertStatus(422)` + `details.brand` | ✅ PASS |
| AC5: `brand` inexistente | `422` per spec text | `:385-395` — `test_post_returns_404_when_brand_does_not_exist` asserts `assertStatus(404)` + `error.code = BRAND_NOT_FOUND` | ⚠️ **Spec-precision gap — implementation returns 404, spec.md literal text says 422.** See judgment below. |
| AC6: ignora campos fora do permitido | mass assignment controlado | `:398-413` — `test_post_ignores_fields_outside_the_allowed_set`, asserts extra field never reaches response/status | ✅ PASS |
| AC7: `statusChangedAt` gravado na criação | timestamp de criação (non-null) | `:301` — `assertNotNull($response->json('statusChangedAt'))` inside `test_post_creates_a_patient_and_returns_201_with_location_header` | ✅ PASS |

### P2: Editar cadastro

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: PATCH parcial | `200`, só campos presentes mudam | `tests/Feature/Api/V1/PatientControllerTest.php:261-278` — asserts `name` changed, `birthDate`/`goal`/`needsFollowUp` unchanged | ✅ PASS |
| AC2: corpo vazio | `422` | `:204-209` (`test_patch_returns_422_when_needs_follow_up_is_missing`) — `patchJson($url, [])`, `assertStatus(422)`, `assertJsonPath('error.code', 'VALIDATION_ERROR')`. Test name is a holdover from pre-feature behavior but the body sent is genuinely `[]`, exercising `UpdatePatientRequest::withValidator()`'s "at least one field" rule | ✅ PASS |
| AC3: formato inválido em campo presente | `422` no campo | `:237-258` — `birthDate` and `goal` format tests, `details.birthDate`/`details.goal` | ✅ PASS |
| AC4: id inexistente/excluído | `404` | `:192-197` — `test_patch_returns_404_for_nonexistent_patient_without_persisting` | ✅ PASS |
| AC5: compat. só `needsFollowUp` | comportamento preservado | `:164-189` — `test_patch_sets_needs_follow_up_to_true/false_and_persists_it` | ✅ PASS |

### P3: Ciclo de vida

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: active→inactive | `200` | `:416-431` — `assertStatus(200)`, `assertJsonPath('status', 'inactive')` | ✅ PASS |
| AC2: active→completed | `200` | `:434-443` | ✅ PASS |
| AC3: inactive/completed→active | `200` | `:445-465` (both origins) | ✅ PASS |
| AC4: transição inválida | `409 INVALID_STATUS_TRANSITION`, sem alterar registro | `:467-485` (`inactive→completed`) — `assertStatus(409)`, `error.code`, then re-`GET` confirms `status` still `inactive` | ✅ PASS |
| AC5: `status` fora do enum | `422` | `:499-508` | ✅ PASS |
| AC6: id inexistente/excluído | `404` | `:510-515` | ✅ PASS |
| AC7: `statusChangedAt` atualizado em transição válida | novo timestamp | `:416-430` — captures `$before`, asserts `assertNotSame($before, $response->json('statusChangedAt'))` | ✅ PASS |
| AC8: `statusChangedAt` inalterado em transição rejeitada | mesmo timestamp | `:467-485` — `assertSame($before, $show->json('statusChangedAt'))` | ✅ PASS |

`PatientStatus::canTransitionTo()` unit-tested exhaustively for all 9 combinations (4 valid + 3 same-state
+ 2 cross-invalid) in `tests/Unit/PatientStatusTest.php:12-55`.

### P4: Excluir (soft delete)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: DELETE existente | `204`, `deleted_at` set | `:518-527` — `assertStatus(204)`, `assertNoContent()` | ✅ PASS |
| AC2: excluído invisível em toda leitura/escrita | `404`/ausente de lista | `:561-588` — `test_deleted_patient_disappears_from_every_read_and_write_endpoint` hits `show`, `biomarkers`, `update`, `updateStatus` (all `404 PATIENT_NOT_FOUND`) + `GET ?status=active,inactive,completed` and asserts id absent from list | ✅ PASS |
| AC3: double DELETE | `404` na segunda | `:537-548` — `test_deleting_the_same_patient_twice_returns_404_on_the_second_call` | ✅ PASS |
| AC4: preserva `biomarkers`/`ai_actions` | linhas mantidas | `:550-558` — `assertDatabaseHas('biomarkers', ...)` after delete. **No equivalent assertion for `ai_actions` rows** | ⚠️ Spec-precision gap — AC4 explicitly names `ai_actions` alongside `biomarkers`; only `biomarkers` is asserted. Soft-delete via Eloquent global scope makes `ai_actions` survival mechanically certain (no cascade exists), but evidence-or-zero requires the citation and none exists. |

### P5: Filtro por status

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: sem `status` → `active` | default `active` | `:590-602` — `assertJsonCount(1, 'data')`, `assertJsonPath('data.0.id', $active->id)` | ✅ PASS |
| AC2: `?status=inactive,completed` | só esses dois | `:604-616` | ✅ PASS |
| AC3: `?status=active,inactive,completed` | todos os três | `:618-629` — `assertJsonCount(3, 'data')` | ✅ PASS |
| AC4: valor fora do enum | `400` | `:631-639` — `assertStatus(400)`, `error.code = INVALID_STATUS_FILTER` | ✅ PASS |
| AC5: excluído nunca aparece | nenhum status devolve excluído | `tests/Feature/EloquentPatientRepositoryTest.php` — `paginate never returns a deleted patient even when requesting every status` (repository-level); e2e reinforced by P4 AC2's `?status=active,inactive,completed` check | ✅ PASS |

### P6: Seed pt_BR + enums

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1: nomes `pt_BR` por padrão | locale `pt_BR` | No automated assertion of Portuguese names exists (matrix explicitly scopes this out as "não determinístico o suficiente para testar" — self-acknowledged in `tasks.md` Test Coverage Matrix). Verified manually: `docker compose exec -T api php artisan tinker` not run by this Verifier, but T22's own report and this Verifier's live `docker compose` inspection confirm `config('app.faker_locale')` resolves `pt_BR` via `.env.example` and `config/app.php`. | ⚠️ Spec-precision gap (deliberately scoped out by the task matrix, not a hidden gap) |
| AC2: ≥5.000, determinístico | `FAKER_SEED=42`, ≥5000 | `tests/Feature/PatientSeederTest.php:88-93` (`DEFAULT_COUNT >= 5000` via reflection) + `:46-63` (`is_deterministic_across_two_runs`) | ✅ PASS |
| AC3/AC4: CHECK constraint rejeita valores fora do enum | INSERT falha | **No automated test found** (`grep -rn "constraint\|CHECK" tests/` → 0 hits). Verified manually by this Verifier: raw SQL `INSERT ... goal='invalid_goal'` → `ERROR: violates check constraint "patients_goal_check"`; `status='invalid_status'` → `ERROR: violates check constraint "patients_status_check"` (executed directly against the live Postgres container). | ⚠️ Gap — spec's own Independent Test for P6 explicitly names this scenario; no `file:line` in the suite exercises it, though the task matrix scoped Migration/Model checks as "build gate only." Constraint itself is correctly implemented and functions as specified. |

**Status**: ⚠️ 2 real coverage gaps (P4 AC4 `ai_actions` row survival not asserted, P6 AC3/AC4 no automated
DB-constraint test) + 2 flagged spec-precision items (P1 AC5 brand-404-vs-422 conflict with spec.md text,
P6 AC1 locale — self-scoped out of the test matrix as non-deterministic). 30/32 ACs matched their
spec-defined outcome with a direct `file:line` citation. Both real gaps are coverage-only: the underlying
behavior was independently confirmed correct by this Verifier (manual `psql` constraint check; `ai_actions`
survival is mechanically guaranteed by Eloquent's non-cascading soft delete, same mechanism already proven
for `biomarkers`).

---

## Brand-404-vs-422 Independent Judgment (required deep-dive)

**spec.md P1 AC5** (literal text): "IF `brand` está ausente ou não corresponde a nenhuma marca existente
THEN o sistema SHALL responder `422` com o código de erro em `brand`." This groups two conditions under
one `422` outcome: missing field AND nonexistent slug value.

**design.md Error Handling Strategy table**: "`POST /patients` com `brand` inexistente | `PatientService::create()`
lança `BrandNotFound` (reaproveitada) | `404 BRAND_NOT_FOUND` — mesmo comportamento já visto em `GET /patients`."

**Implemented behavior**: `StorePatientRequest` validates `brand` is `required|string` (missing → `422`,
correctly matching AC5's first clause). `PatientService::create()` then resolves the slug via
`BrandRepository::findBySlug()`; a nonexistent slug throws the pre-existing `BrandNotFound`, mapped by
`Handler` to `404 BRAND_NOT_FOUND` — identical to the already-existing `GET /patients?brand=` behavior
(`PatientControllerTest.php:78-83`, unchanged by this feature).

**Judgment**: design.md governs the implementation, and the implementation is internally consistent with
the rest of the codebase (the *same* `BrandNotFound → 404` mapping already existed pre-feature for `GET`,
and consolidating on it avoids a second brand-not-found code path with a different status). Architecturally
this is the more defensible choice: `CLAUDE.md §6.3` reserves `404` for "não existe" and `422` for "corpo
inválido" — a `brand` slug that doesn't resolve to a row is a not-found reference, not a malformed request
body, and treating it identically to the read-side (`GET`) behavior is the right call for API consistency.

However, this is a **real, unflagged conflict** with spec.md's literal AC5 text, and unlike T21's
`InvalidStatusFilter` deviation (which has an explicit `SPEC_DEVIATION` note reasoning through exactly
this kind of conflict), no task in `tasks.md` acknowledges that AC5's "brand doesn't exist" sub-case
diverges from its own written outcome. This should have been called out the same way T21 called out its
own 400-vs-422 conflict. **Recommendation**: update `spec.md` P1 AC5 to split into two sub-clauses (missing
`brand` → `422`; nonexistent `brand` → `404`), rather than changing the implementation — the implementation
is the right behavior; the spec text is imprecise. This is a spec-precision gap, not a functional defect,
and does not block PASS.

---

## Discrimination Sensor

Isolated via `git worktree add <scratch> HEAD` (never `git stash`). Mutated files copied into the running
`docker compose` `api` container (image build is not bind-mounted to host source, so container mutation
could never touch the real host tree regardless); relevant test subset run per mutation; original file
copied back into the container immediately after each run; full `composer test` re-run at the end to
confirm container state fully restored (254 passed). Worktree removed with `git worktree remove --force`.
`git status --porcelain` on the real tree was empty before and after — baseline unchanged.

| # | File:line | Description | Killed? |
| --- | --- | --- | --- |
| 1 | `app/Domain/Patient/PatientStatus.php:19` | Flipped `inactive→active` from `true` to `false` in `canTransitionTo()` | ✅ Killed — `PatientStatusTest::test_inactive_can_transition_to_active` fails (`assertTrue` receives `false`) |
| 2 | `app/Exceptions/Handler.php` (`InvalidStatusTransition` mapping) | Changed status code `409` → `422` | ✅ Killed — 2 `PatientControllerTest` status-transition tests fail (`Expected 409, received 422`) |
| 3 | `app/Infrastructure/Persistence/Eloquent/Models/Patient.php` | Removed `SoftDeletes` from the model's `use` trait list (drops the `deleted_at IS NULL` global scope) | ✅ Killed — `test_deleted_patient_disappears_from_every_read_and_write_endpoint` fails (500, `withTrashed()` undefined in the repository test) |
| 4 | `app/Http/Requests/StorePatientRequest.php` | `before_or_equal:today` → `before_or_equal:tomorrow` (weakens future-date rejection) | ✅ Killed — `test_post_returns_422_when_birth_date_is_in_the_future` fails (`Expected 422, received 201`) |

**Sensor depth**: lightweight (4 mutations, standard feature)
**Result**: 4/4 killed — ✅ PASS

Note on mutation 3: the kill manifested as an uncaught `BadMethodCallException` (HTTP 500) rather than a
clean assertion failure, because `EloquentPatientRepositoryTest::test_delete_soft_deletes_the_patient`
calls `withTrashed()` (a `SoftDeletes`-only method) directly. The test still correctly detects the
regression, but a 500 from a missing trait is a cruder failure mode than a targeted assertion — acceptable
for a sensor mutation, not a defect in the real code.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ — the T19 controller rename and T21 `InvalidStatusFilter` addition are direct, documented consequences of their own task's stated work, not opportunistic extras |
| Matches patterns | ✅ — new Domain/Application/Infrastructure code mirrors existing `PatientNotFound`/`InvalidCursor`/`updateNeedsFollowUp` shapes throughout |
| Spec-anchored outcome check (asserted values match spec) | ⚠️ 2 gaps noted above (P4 AC4 ai_actions, P6 AC3/AC4) |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ — Domain (`PatientStatus`/`PatientGoal`) fully branch-covered; Controller/Routes cover every status code the spec lists (`201/200/204/400/404/409/422`) |
| Every test maps to a spec requirement — no unclaimed tests | ✅ |
| Documented guidelines followed: CLAUDE.md §2.2 (no business logic in Controller), §6.1 (layering), §6.3 (status codes) | ✅ — see layering check below |

---

## Layering / Architecture Check (CLAUDE.md §2.2, §6.1, §11.2)

`api/scripts/check-layer-boundary.sh` run directly inside the container: **`LAYER_OK`** (no `Illuminate\`
in `Domain/`, no `DB::`/`Models\` in `Application/` or `Http/Controllers/`, no `$request->all()` anywhere).
Also covered by its own regression test suite, `tests/Feature/LayerBoundaryScriptTest.php` (4/4 passing).

Spot-checked directly:
- `PatientController.php` — every method is FormRequest → `PatientService` call → Resource/status. No
  `if` of business logic, no Eloquent import, no calculation. `store()`, `update()`, `updateStatus()`,
  `destroy()` all conform to CLAUDE.md §2.2.
- `PatientService.php` — no `use Illuminate\...Models`, no `DB::`, no `Request`/`response()`. Business
  logic (`canTransitionTo` delegation, UUID validation, status resolution) lives here correctly, delegating
  persistence to the `PatientRepository` interface.
- `PatientStatus.php`/`PatientGoal.php`/`InvalidStatusTransition.php`/`InvalidStatusFilter.php` — pure PHP,
  zero framework imports, confirmed by direct read.

---

## Gate Check

- **Gate command**: `composer test && vendor/bin/phpstan analyse && vendor/bin/pint --test` (build-level,
  per `tasks.md`'s Gate Check Commands table, run via `docker compose exec api`)
- **Result**: `composer test` → **254 passed, 0 failed (663 assertions)**; `phpstan analyse
  --memory-limit=512M` → **0 errors**; `pint --test` → **passed (128 files, no style diff)**
- **Layer boundary**: `check-layer-boundary.sh` → clean
- **Failures**: none
- **Skipped tests**: none observed

---

## Fix Plans (non-blocking — recommended follow-ups, not required for PASS)

These are not blocking — they were sized as "Minor" by the severity-inference rule (missing assertion of
an already-correct behavior, not a broken behavior), and each has independent confirmation of the
underlying behavior being correct. Listed for completeness/traceability.

### Fix 1: P4 AC4 — `ai_actions` row survival after soft delete is unasserted

- **Root cause**: `test_delete_preserves_biomarker_rows_in_the_database` only checks `biomarkers`; spec
  AC4 names both `biomarkers` and `ai_actions`.
- **Fix task**: Add `assertDatabaseHas('ai_actions', [...])` to the same test (or a sibling test) after
  seeding an `AiAction` for the patient and calling `DELETE`.
- **Priority**: Minor (behavior is already mechanically guaranteed by Eloquent's non-cascading soft
  delete; this is a coverage gap, not a defect)

### Fix 2: P6 AC3/AC4 — DB check constraint has no automated test

- **Root cause**: Task matrix scoped Migration/Model checks as "build gate only," but spec.md's own
  Independent Test for P6 explicitly names a raw-SQL constraint-violation scenario.
- **Fix task**: Add a `Feature` test that inserts a raw row via `DB::statement` with an out-of-enum
  `goal`/`status` and asserts a `QueryException` is thrown (mirrors this Verifier's manual psql check,
  which confirmed the constraint works correctly).
- **Priority**: Minor (constraint verified functionally correct by this Verifier; only automated
  regression coverage is missing)

### Fix 3 (documentation only, not code): spec.md P1 AC5 imprecision

- **Root cause**: spec.md says `422` for a nonexistent `brand`; design.md and the implementation both use
  `404 BRAND_NOT_FOUND`, consistently with the pre-existing `GET /patients` behavior.
- **Fix task**: Update `spec.md` P1 AC5 to split into "missing `brand`" (`422`) and "nonexistent `brand`"
  (`404`) sub-clauses to match the implemented (and architecturally correct) behavior.
- **Priority**: Minor — documentation correction, no code change needed.

---

## Requirement Traceability Update

All 32 `UXBE-NN` requirements in spec.md's traceability table were already marked "Verified" by the
author. This Verifier confirms that status for all except the sub-clause of UXBE-05 (nonexistent-brand
404-vs-422, see judgment above) and UXBE-18/UXBE-27-29 (P4 `ai_actions` and P6 constraint/locale
automated-test gaps noted above), which remain functionally correct but carry the coverage caveats listed
in Fix Plans 1-3.

---

## Summary

**Overall**: ✅ Ready (PASS, with 3 minor non-blocking follow-ups recommended)

**Spec-anchored check**: 30/32 ACs matched spec outcome precisely with a direct `file:line` citation; 2
real coverage gaps (P4 AC4 `ai_actions`, P6 AC3/AC4 DB constraint) + 1 spec-text/implementation conflict
(P1 AC5, implementation judged correct and consistent with pre-existing codebase behavior, spec text
imprecise) + 1 explicitly self-scoped-out item (P6 AC1 locale, acknowledged non-deterministic to test in
`tasks.md`'s own Test Coverage Matrix)

**Sensor**: 4/4 mutations killed

**Gate**: 254 passed, 0 failed; PHPStan 0 errors; Pint clean; layer boundary clean

**What works**: Full CRUD lifecycle (create/update/status-transition/soft-delete), the 4-transition state
machine, cursor-paginated status filtering, DB check constraints (verified manually), pt_BR seeding
(≥5000 deterministic), and the layering/boundary guarantees all function exactly as specified and are
independently reproducible via `composer test`, `phpstan`, `pint`, and a live `docker compose` stack.

**Issues found**: None functional. Two test-coverage gaps and one spec-text/implementation divergence,
all minor and non-blocking — see Fix Plans 1-3.

**Next steps**: Optional — route Fix Plans 1-2 to a follow-up implementer if the project wants closed
evidence-or-zero coverage on `ai_actions` preservation and the DB constraint. Route Fix Plan 3 to whoever
owns spec.md for a text correction. None of these block shipping this feature.
