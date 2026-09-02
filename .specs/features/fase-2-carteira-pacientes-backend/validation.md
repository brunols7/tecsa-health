# Fase 2 — Carteira de Pacientes Backend Validation

**Date**: 2026-09-01
**Spec**: `.specs/features/fase-2-carteira-pacientes-backend/spec.md`
**Diff range**: `main..HEAD` (13 commits, `2b4d0f6`..`649b57b`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | Migration + Model + Factory, all checkboxes ticked |
| T2   | ✅ Done | `BiomarkerStatus` implemented as pure enum (documented SPEC_DEVIATION, correctly implemented) |
| T3   | ✅ Done | `PatientCursor`/`PatientPage`/exceptions |
| T4   | ✅ Done | `Patient` entity + `PatientRepository` interface |
| T5   | ✅ Done | `BiomarkerRepository` interface |
| T6   | ✅ Done | `EloquentPatientRepository` + binding |
| T7   | ✅ Done | `EloquentBiomarkerRepository` + binding |
| T8   | ✅ Done | `PatientService` |
| T9   | ✅ Done | Handler gains `PatientNotFound`→404, `InvalidCursor`→400 |
| T10  | ✅ Done | `ListPatientsRequest`, `UpdateFollowUpRequest` |
| T11  | ✅ Done | 3 API Resources |
| T12  | ✅ Done | Controller + routes, second documented SPEC_DEVIATION (UUID format validation in Service) correctly implemented |

All 12 tasks are marked done in `tasks.md` with every "Done when" checkbox ticked. Both `SPEC_DEVIATION` notes (T2, T12) are reasonable, match the design/tasks rationale, and are verified present in the actual code (`app/Domain/Biomarker/BiomarkerStatus.php` is a non-backed enum with `value(): string`; `PatientService::assertValidId()` is a pure regex check with zero Illuminate imports).

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| PATBE-01: primeira página, ordenação, `next_cursor` | `200`, até `limit` itens, ordenados por `name asc` (tie-break `id asc`), `next_cursor` não nulo se houver mais | `tests/Feature/Api/V1/PatientControllerTest.php:25-28` — `assertStatus(200)`, `assertJsonCount(2,'data')`, `assertNotNull(nextCursor)` | ⚠️ Partial — status/count/cursor covered; **no test asserts the returned order is `name asc` with tie-break `id asc`** (all fixtures use already-sorted or single-name-per-brand data) |
| PATBE-02: página seguinte via `cursor` | Continua exatamente de onde parou, sem repetir/pular | `tests/Feature/Api/V1/PatientControllerTest.php:31-54` — `assertEmpty(array_intersect($firstIds,$secondIds))`, `assertCount(5, array_unique(...))`; also `tests/Feature/EloquentPatientRepositoryTest.php:74-101` walks all pages | ✅ PASS |
| PATBE-03: última página → `next_cursor: null` | `next_cursor` nulo | `tests/Feature/Api/V1/PatientControllerTest.php:51` — `assertNull($secondPage->json('nextCursor'))` | ✅ PASS |
| PATBE-04: busca por `name`, contém, case-insensitive | Filtra antes de paginar | `tests/Feature/Api/V1/PatientControllerTest.php:56-67` — `search=ana` matches `'Ana Silva'`; `tests/Feature/EloquentPatientRepositoryTest.php:59-72` — `'ANA'` matches `'Ana Silva'` | ✅ PASS |
| PATBE-05: `limit` default `50` / clamp `100` | `null`→50, `>100`→100 (no error) | `tests/Unit/PatientServiceTest.php:25-43` (`paginate` called with `50`), `:45-63` (`paginate` called with `100` for input `250`) | ✅ PASS |
| PATBE-06: `brand` ausente → `422` | `422`, envelope padrão | `tests/Feature/Api/V1/PatientControllerTest.php:69-76` — `assertStatus(422)`, `assertJsonStructure(['error'=>[...]])` | ✅ PASS |
| PATBE-07: `brand` inexistente → `404` | `404`, `BRAND_NOT_FOUND` | `tests/Feature/Api/V1/PatientControllerTest.php:78-84` — `assertJsonPath('error.code','BRAND_NOT_FOUND')` | ✅ PASS |
| PATBE-08: `cursor` ilegível → `400` | `400`, `INVALID_CURSOR` | `tests/Feature/Api/V1/PatientControllerTest.php:86-95` — `assertStatus(400)`, `assertJsonPath('error.code','INVALID_CURSOR')`; unit coverage `tests/Unit/PatientCursorTest.php:23-42`, `tests/Unit/PatientServiceTest.php:107-124` | ✅ PASS |
| PATBE-09: Controller sem regra de negócio | Nenhum Eloquent/`if` de negócio no Controller | `app/Http/Controllers/Api/V1/PatientController.php` (manual read: no Eloquent import, no conditional branching) + `bash scripts/check-layer-boundary.sh` (passes) + `tests/Feature/LayerBoundaryScriptTest.php` | ✅ PASS |
| PATBE-10: detalhe de paciente por id → `200` | `200` com todos os campos do contrato | `tests/Feature/Api/V1/PatientControllerTest.php:97-111` — `assertJson([...])` + `assertJsonStructure(['id','name','birthDate','goal','status','needsFollowUp','updatedAt'])` | ✅ PASS |
| PATBE-11: id inexistente/malformado → `404` | `404`, `PATIENT_NOT_FOUND`, mesmo tratamento nos dois casos | `tests/Feature/Api/V1/PatientControllerTest.php:113-127` — both `Uuid::uuid4()` (unknown) and `'not-a-uuid'` (malformed) assert `404`/`PATIENT_NOT_FOUND`; unit: `tests/Unit/PatientServiceTest.php:169-183` | ✅ PASS |
| PATBE-12: biomarcadores com `status` derivado | `200`, ordenado `measuredAt desc`, `status` por `BiomarkerStatus::from()` | `tests/Feature/Api/V1/PatientControllerTest.php:129-143`; `tests/Feature/EloquentBiomarkerRepositoryTest.php:29-50` (order) and `:52-68` (`assertSame(BiomarkerStatus::Normal, ...)` / `assertNotSame`) | ✅ PASS |
| PATBE-13: paciente sem biomarcadores → `[]` | `200`, lista vazia | `tests/Feature/Api/V1/PatientControllerTest.php:145-154` — `assertExactJson([])`; `tests/Feature/EloquentBiomarkerRepositoryTest.php:19-27` — `assertSame([], ...)` | ✅ PASS |
| PATBE-14: `BiomarkerStatus::from()` limites exatos | `value==refMin`→Normal, `value==refMax`→Normal, below/inside/above correct | `tests/Unit/BiomarkerStatusTest.php:12-35` — all 5 boundary cases with exact expected enum case | ✅ PASS |
| PATBE-15: `BiomarkerStatus` puro, sem Illuminate | Nenhum import `Illuminate\` | `app/Domain/Biomarker/BiomarkerStatus.php` (no `use Illuminate`) + `bash scripts/check-layer-boundary.sh` passes | ✅ PASS |
| PATBE-16: PATCH liga `needsFollowUp` | `200`, persiste `true` | `tests/Feature/Api/V1/PatientControllerTest.php:164-176` — `assertJsonPath('needsFollowUp', true)` + subsequent `GET` confirms | ✅ PASS |
| PATBE-17: PATCH desliga `needsFollowUp` | `200`, persiste `false` | `tests/Feature/Api/V1/PatientControllerTest.php:178-190` — `assertJsonPath('needsFollowUp', false)` + subsequent `GET` confirms | ✅ PASS |
| PATBE-18: PATCH id inexistente → `404` sem persistir | `404`, `PATIENT_NOT_FOUND` | `tests/Feature/Api/V1/PatientControllerTest.php:192-198`; repository-level `tests/Feature/EloquentPatientRepositoryTest.php:116-123` | ✅ PASS |
| PATBE-19: PATCH corpo inválido → `422` | `422`, envelope padrão, sem persistir | `tests/Feature/Api/V1/PatientControllerTest.php:200-220` — missing field and non-boolean both assert `422`/`VALIDATION_ERROR` | ✅ PASS |
| PATBE-20: PATCH ignora campos não permitidos | Só `needsFollowUp` chega ao Service | `tests/Feature/Api/V1/PatientControllerTest.php:222-235` — `name` unchanged despite `'name'=>'Hacked Name'` in body | ✅ PASS |

**Status**: ⚠️ 1 spec-precision gap flagged (PATBE-01 ordering not directly asserted) — everything else (19/20) matches the spec-defined outcome exactly, with `file:line` evidence.

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| --- | --- | --- | --- |
| 1 | `app/Domain/Biomarker/BiomarkerStatus.php:16` | Flipped `$value < $refMin` → `$value <= $refMin` (boundary at `refMin`) | ✅ Killed — `BiomarkerStatusTest::test_returns_normal_when_value_equals_ref_min` fails |
| 2 | `app/Infrastructure/Persistence/Eloquent/EloquentPatientRepository.php:30` | Flipped tuple comparison direction `(name, id) > (?, ?)` → `(name, id) < (?, ?)` | ✅ Killed — `EloquentPatientRepositoryTest::test_paginate_walked_across_pages_covers_every_patient_without_overlap_or_gap` fails (7 seen instead of 10) |
| 3 | `app/Infrastructure/Persistence/Eloquent/EloquentPatientRepository.php:72` | Flipped `updateNeedsFollowUp` not-found branch `$affected === 0` → `$affected !== 0` | ✅ Killed — 3 tests in `EloquentPatientRepositoryTest` fail (idempotent update throws, not-found update doesn't) |

**Sensor depth**: lightweight (3 targeted mutations)
**Result**: 3/3 killed — PASS ✅

**Method**: isolated `git worktree add /tmp/tecsa-sensor HEAD`, `vendor/` copied (not symlinked — a symlink leaves Composer's classmap `$baseDir` resolving to the real repo path, silently defeating the mutation) plus a local `composer dump-autoload` inside the worktree, `.env.testing` copied pointing at the same ephemeral `tecsa-test-pg` Postgres container. Each mutation applied, targeted test run, confirmed failing, reverted, worktree removed with `--force`. `git status --porcelain` on the real tree matched the pre-sensor baseline before and after.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ |
| Surgical changes | ✅ — only the files the 12 tasks required |
| No scope creep | ✅ |
| Matches patterns | ✅ — mirrors Fase 1's `Brand`/`FeatureFlag` Repository pattern; `Handler.php` reuses existing `envelope()` |
| Spec-anchored outcome check (asserted values match spec) | ⚠️ 19/20 exact; PATBE-01 ordering not directly asserted |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ — matches the Test Coverage Matrix in `tasks.md` layer by layer |
| Every test maps to a spec requirement — no unclaimed tests | ✅ |
| Documented guidelines followed: `CLAUDE.md` §2.2/§2.3/§6.1/§6.3, `tasks.md` Test Coverage Matrix | ✅ |

No `any`/`mixed` abuse, no facades in `Domain`/`Application`, `strict_types=1` present in every new file, `PatientResource`/`BiomarkerResource` use `$wrap = null` deliberately (documented in T12's SPEC_DEVIATION) to match the spec's literal array/object shapes. Controller methods are 3-5 lines each, no `if` business logic, no Eloquent import.

---

## Edge Cases

- [ ] `search=` (empty string) treated as "no filter" — **implemented correctly** (`EloquentPatientRepository::paginate()`: `if ($search !== null && $search !== '')`) but **not covered by any test** — no test sends `search=` with an empty value and asserts the unfiltered result
- [x] Cursor pointing to a removed record — inherently satisfied: `PatientCursor`/tuple comparison never requires the cursor's row to still exist; no removal endpoint exists in this phase to construct the scenario, consistent with spec's own caveat
- [x] Two brands with same-name patients never mix — `tests/Feature/EloquentPatientRepositoryTest.php:43-57` (`test_paginate_never_mixes_patients_between_brands_with_the_same_name`)

---

## Gate Check

- **Gate command**: `bash scripts/check-layer-boundary.sh && php artisan test && vendor/bin/pint --test && vendor/bin/phpstan analyse` (run from `api/`)
- **Result**: 4 passed, 0 failed, 0 skipped
  - `check-layer-boundary.sh`: exit 0
  - `php artisan test`: 79 tests, 197 assertions, exit 0 (test output labels most tests "deprecated" solely due to a PHP 8.5 `PDO::MYSQL_ATTR_SSL_CA` constant deprecation notice unrelated to this feature — not a test failure)
  - `vendor/bin/pint --test`: `{"tool":"pint","result":"passed"}`
  - `vendor/bin/phpstan analyse`: `[OK] No errors` (57 files)
- **Test count before feature** (`main`, `2b4d0f6^`): 23 tests
- **Test count after feature**: 79 tests
- **Delta**: +56 new tests
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans (if issues found)

### Fix 1: PATBE-01 ordering not directly asserted

- **Root cause**: existing tests for `GET /patients` either use a single patient per brand or names already inserted in alphabetical order, so a broken `orderBy('name')`/tie-break would not necessarily fail the suite (the discrimination sensor's mutation #2 on the cursor comparison direction does incidentally exercise the same code path and is caught, but that is not the same guarantee as testing ordering directly).
- **Fix task**: add one Feature or Repository test that inserts patients with names deliberately out of alphabetical order (and at least one pair of duplicate names within the same brand) and asserts the response/`items` order is exactly `name asc, id asc`.
- **Priority**: Minor (not a functional defect — code is correct on inspection and indirectly exercised by the sensor; this is a coverage gap, not a behavior gap)

### Fix 2: empty `search=` edge case untested

- **Root cause**: no test sends `search=` (empty string) and asserts all patients are returned unfiltered.
- **Fix task**: add a Feature test: `GET /api/v1/patients?brand=nutri-care&search=` with N seeded patients asserts all N appear (not zero).
- **Priority**: Minor (implementation is correct; only test coverage is missing)

---

## Requirement Traceability Update

`spec.md`'s traceability table already listed all 20 `PATBE-01`..`PATBE-20` rows as "Complete" before this validation ran. Verified this claim against actual test evidence above: 19/20 rows are backed by an exact `file:line` assertion matching the spec-defined outcome; PATBE-01 is backed by tests for pagination correctness but not for the ordering sub-clause specifically. The table is left as "Complete" for all 20 rows — no row describes a broken behavior, and the one gap found is a test-coverage precision issue on an already-passing, already-correct implementation, not an unmet requirement. Recorded here rather than by regressing the table to "Pending", since regressing would misrepresent working code as not implemented.

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| PATBE-01 | Complete | ✅ Verified (coverage gap noted above — code correct, test for ordering sub-clause missing) |
| PATBE-02 .. PATBE-20 | Complete | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 19/20 ACs matched spec outcome exactly; 1 coverage gap flagged (PATBE-01 ordering sub-clause)
**Sensor**: 3/3 mutations killed
**Gate**: 4/4 passed (layer boundary, `php artisan test` 79/79, Pint, PHPStan level 6+)

**What works**: All 4 endpoints (`GET /patients`, `GET /patients/:id`, `GET /patients/:id/biomarkers`, `PATCH /patients/:id`), cursor pagination with no overlap/gap across brands, case-insensitive search, `limit` default/clamp, `BiomarkerStatus` boundary rule (pure, no Illuminate), the full error envelope (`422`/`400`/`404`) wired through `Handler.php`, and strict layer separation (Controller has zero business logic, confirmed by both static grep and manual read). Both documented `SPEC_DEVIATION`s (pure `BiomarkerStatus` enum, UUID-format pre-check in `PatientService`) are implemented exactly as described and are reasonable engineering responses to real PHP/Postgres constraints hit during implementation.

**Issues found**: two test-coverage gaps, neither indicating a functional defect — (1) no test directly asserts `name asc`/`id asc` ordering with out-of-order or duplicate-name fixtures; (2) no test covers the empty-string `search=` edge case. Both fixes are additive test-only tasks (see Fix Plans).

**Next steps**: optional — add the two tests above in a small follow-up commit; not a blocker for merge given the gate is green, the sensor found no surviving mutants, and manual code review confirms both code paths are already correct.
