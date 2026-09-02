# Fase 1 — Feature Flags Backend Validation

**Date**: 2026-09-01
**Spec**: `.specs/features/fase-1-feature-flags-backend/spec.md`
**Diff range**: `main..feat/flags` (10 commits)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `Brand` entity + `BrandRepository` interface, no Illuminate import |
| T2   | ✅ Done | `EloquentBrandRepository` + binding; dedicated Repository-level test intentionally deferred to T8 (documented in tasks.md's Test Co-location Validation) — verified this deferral does not leave a gap (see Spec-Anchored table, FLAGSBE-04) |
| T3   | ✅ Done | `allForBrand` added to interface + Eloquent impl, 2 new Feature tests |
| T4   | ✅ Done | `BrandNotFound` extends `\RuntimeException`, no Illuminate import |
| T5   | ✅ Done | `FeatureFlagService` with constructor-injected interfaces, 3 unit tests (Mockery) |
| T6   | ✅ Done | `app/Exceptions/Handler.php` + `bootstrap/app.php` wiring; `/up` verified still 200 |
| T7   | ✅ Done | `ListFeatureFlagsRequest`, `rules()` = `['brand' => ['required', 'string']]` |
| T8   | ✅ Done | Controller + `routes/api.php` + `bootstrap/app.php` routing; 4 Feature tests |
| T9   | ✅ Done | `dedoc/scramble` installed; `/docs/api.json` confirmed to document `GET /v1/feature-flags` with `200`/`404`/`422` and `brand` query param |

---

## Spec-Anchored Acceptance Criteria

### P1: Consultar feature flags de uma marca

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| WHEN `brand=<slug existente>` THEN `200` com mapa `key→enabled` | `200`, body `{"aiActionsEnabled": true, "offlineBanner": true}` (exact seed values for nutri-care) | `api/tests/Feature/Api/V1/FeatureFlagControllerTest.php:22-26` — `$response->assertStatus(200); $response->assertExactJson(['aiActionsEnabled' => true, 'offlineBanner' => true]);` | ✅ PASS |
| WHEN marca existe mas sem linhas em `feature_flags` THEN `200` com `{}` | `200`, body `{}` exatamente | `api/tests/Feature/Api/V1/FeatureFlagControllerTest.php:31-35` — `$response->assertStatus(200); $response->assertExactJson([]);` | ✅ PASS |
| IF `brand` ausente THEN `422` envelope `{error:{code:VALIDATION_ERROR,...}}` | `422`, `error.code == "VALIDATION_ERROR"`, envelope shape `{error:{code,message,details}}` | `api/tests/Feature/Api/V1/FeatureFlagControllerTest.php:38-43` — `assertStatus(422); assertJsonStructure(['error'=>['code','message','details']]); assertJsonPath('error.code','VALIDATION_ERROR')` — also exercised in isolation at `api/tests/Feature/ExceptionHandlerTest.php:38-53` with full envelope match including `details` shape | ✅ PASS |
| IF `brand` presente mas inexistente THEN `404` envelope `code:BRAND_NOT_FOUND` | `404`, `error.code == "BRAND_NOT_FOUND"` | `api/tests/Feature/Api/V1/FeatureFlagControllerTest.php:46-51` — `assertStatus(404); assertJsonPath('error.code','BRAND_NOT_FOUND')` — full envelope (including exact `message`) additionally asserted at `api/tests/Feature/ExceptionHandlerTest.php:24-32` — `assertJson(['error'=>['code'=>'BRAND_NOT_FOUND','message'=>'Brand not found: unknown-brand','details'=>[]]])` | ✅ PASS |
| The system SHALL resolve `brand`→`brand_id` internamente antes de consultar `FeatureFlagRepository` | No query direta por slug fora do Repository | `api/app/Application/FeatureFlag/FeatureFlagService.php:23-33` — `$brand = $this->brands->findBySlug($brandSlug); ... $this->featureFlags->allForBrand($brand->id)` — slug resolution isolated to `BrandRepository`, `FeatureFlagRepository::allForBrand` takes `brandId` only. Verified structurally by reading `EloquentFeatureFlagRepository.php:33-34` (`->where('brand_id', $brandId)`, never `slug`) | ✅ PASS |
| Controller livre de Eloquent, `if` de negócio, cálculo | Zero matches for Eloquent/DB/if in Controller | `api/app/Http/Controllers/Api/V1/FeatureFlagController.php` (26 lines) — `grep -n "if\|Eloquent\|DB::\|::query\|Model"` returns **zero matches**; controller body is exactly `$flags = $this->featureFlags->listForBrandSlug(...); return response()->json($flags);` | ✅ PASS |

### P2: Endpoint documentado no OpenAPI

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| WHEN `dedoc/scramble` instalado THEN `/docs/api` expõe o endpoint com params e formatos de resposta (200/422/404) | `/docs/api.json` paths contain `/v1/feature-flags` with responses `200`, `404`, `422` and a `brand` parameter | No automated test exists for this (tasks.md explicitly scopes it to "manual verification only — no assertion library for OpenAPI shape in this project"). Verifier ran a live manual check: started `php artisan serve` against the ephemeral test Postgres with `APP_ENV=local`, fetched `GET /docs/api.json`, parsed the JSON, and confirmed `paths./v1/feature-flags.get.responses.keys() == ['200','404','422']` and `parameters == ['brand']`. Reproducible with: `curl -s http://127.0.0.1:9092/docs/api.json \| python3 -c "import json,sys;d=json.load(sys.stdin);print(d['paths']['/v1/feature-flags'])"` | ✅ PASS (manually verified, no committed automated test — matches tasks.md's declared coverage expectation of "none") |

**Status**: ✅ All ACs covered — no spec-precision gaps found.

---

## Discrimination Sensor

Isolated scratch: `git worktree add /tmp/scratch-flags-mutate HEAD` (detached, since `feat/flags` was already checked out at the main worktree path). Vendor was fully copied (not symlinked) into the scratch tree and `composer dump-autoload -o` was re-run there — a first attempt with a symlinked `vendor/` silently loaded the **real** repo's app code via Composer's absolute-path classmap, which would have made every mutation a false "kill." This was caught and corrected before recording results below.

| Mutation | File:line | Description | Killed? |
| --- | --- | --- | --- |
| 1 | `app/Application/FeatureFlag/FeatureFlagService.php:25` | Flipped `if ($brand === null)` → `if ($brand !== null)` | ✅ Killed — `FeatureFlagServiceTest`: 2 errors (unexpected `BrandNotFound` thrown on happy path / empty-flags path) + 1 failure (`ErrorException: Attempt to read property "id" on null` instead of expected `BrandNotFound`) |
| 2 | `app/Exceptions/Handler.php:18` | Changed `BRAND_NOT_FOUND` envelope status `404` → `200` | ✅ Killed — `ExceptionHandlerTest::test_brand_not_found_renders_404_envelope` and `FeatureFlagControllerTest::test_returns_404_when_brand_does_not_exist` both failed (2 failures) |
| 3 | `app/Infrastructure/Persistence/Eloquent/EloquentFeatureFlagRepository.php:34` | Changed `allForBrand`'s where-clause field `'brand_id'` → `'key'` | ✅ Killed — `FeatureFlagRepositoryTest::test_all_for_brand_returns_every_flag_seeded_for_that_brand` (size 0 vs expected 2) and `FeatureFlagControllerTest::test_returns_200_with_flag_map_for_a_known_brand` (`{}` vs expected map) both failed |

**Sensor depth**: lightweight (3 mutations, default tier)
**Result**: 3/3 killed — PASS ✅

Cleanup: `git worktree remove --force /tmp/scratch-flags-mutate`; confirmed `git status --porcelain` on the real tree matched the pre-sensor baseline (only pre-existing untracked `.specs/features/fase-1-feature-flags-mobile/`) after removing one stray `.env.testing` file that a `cp` command had written to the real repo root during scratch setup (agent-tool cwd resets between Bash calls; the `cp` ran from the default cwd rather than the intended scratch path). No tracked file was touched.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ — every new file maps to exactly one task/component in design.md |
| Surgical changes | ✅ — `bootstrap/app.php` diff is 6 lines, scoped to routing + exception wiring; no unrelated refactors |
| No scope creep | ✅ — `composer.json` diff adds only `dedoc/scramble` (per T9); no PATCH endpoint, no auth, no caching/rate-limiting added (all correctly out-of-scope per spec.md) |
| Matches patterns | ✅ — `EloquentBrandRepository` mirrors `EloquentFeatureFlagRepository`'s model-mapping style; `Brand` entity mirrors `FeatureFlag` entity's `final class` + `readonly` constructor style |
| Spec-anchored outcome check (asserted values match spec) | ✅ — see table above; `assertExactJson`/`assertJsonPath` used, not vague structure-only checks, for every precisely-specified outcome |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ — `FeatureFlagControllerTest` covers all 4 route outcomes (200 w/ flags, 200 empty, 422, 404); `FeatureFlagServiceTest` covers all 3 Service branches (happy, not-found, empty) |
| Every test maps to a spec requirement — no unclaimed tests | ✅ — all 12 new tests trace to FLAGSBE-01..06 per the Test Coverage Matrix in tasks.md; no orphan tests found |
| Documented guidelines followed | CLAUDE.md §2.2 (controller purity), §6.1 (layer boundaries), §6.3 (error envelope) — all verified directly (see below) |

**Controller purity (CLAUDE.md §2.2)**: `grep -n "if\|Eloquent\|DB::\|::query\|Model" app/Http/Controllers/Api/V1/FeatureFlagController.php` → zero matches. Controller body is exactly FormRequest-in, Service-call, `response()->json()`-out.

**Domain purity (CLAUDE.md §6.1)**: `grep -rn "Illuminate" app/Domain/` → zero matches (Brand, BrandRepository, BrandNotFound all clean).

**No `$request->all()` (CLAUDE.md §9)**: `grep -rn '\$request->all()\|request()->all()' app/Http/Controllers/` → zero matches; controller uses `$request->validated('brand')`.

**On the T2 note (dedicated `EloquentBrandRepository` test deferred to T8)**: tasks.md explicitly documents this decision in "Test Co-location Validation" as deliberate — `findBySlug`'s found/not-found paths are fully exercised end-to-end by `FeatureFlagControllerTest`'s 200 and 404 cases, and there is no branch inside `EloquentBrandRepository` that the Controller test doesn't reach. Verifier agrees: a standalone Repository test would duplicate the same two code paths with no new coverage. Not a gap.

**On `ExceptionHandlerTest`'s continued existence alongside `FeatureFlagControllerTest`**: not redundant. `ExceptionHandlerTest` uses inline test-only routes and asserts the **complete, exact** envelope (`assertJson` with full `code`/`message`/`details` for both 404 and 422, including the precise `BrandNotFound` message text and the exact validation `details` structure `['brand' => ['The brand field is required.']]`). `FeatureFlagControllerTest` only asserts `error.code` via `assertJsonPath` plus a loose `assertJsonStructure`. Keeping both is correct: `ExceptionHandlerTest` is the one place proving the Handler's envelope shape is domain-agnostic and exactly correct; `FeatureFlagControllerTest` proves the real route wires into it. Removing either narrows coverage.

**On the `#[Dedoc\Scramble\Attributes\Response(404, ...)]` attribute**: genuinely required, not an unjustified deviation. Scramble infers response shapes by static-analyzing the FormRequest (→ 422) and the Controller's return type/body (→ 200); it cannot infer a `404` produced by an exception thrown deep in `FeatureFlagService` and translated by a separate `Handler` class it doesn't statically trace. Without the attribute, `/docs/api.json` would only list `200`/`422` for this route — verified this is the Scramble project's documented mechanism for exactly this gap (thrown-exception status codes are invisible to static return-type analysis). The task's own "Done when" for T9 anticipated exactly this and mandated the attribute.

---

## Edge Cases

- [x] Malformed/non-matching `brand` slug (e.g., wrong case, unexpected chars) → treated as plain "not found" (`404`, not `422`), same as any nonexistent slug — proven by `FeatureFlagControllerTest::test_returns_404_when_brand_does_not_exist` using `brand=unknown-brand`, which never reaches a special-case branch: `FeatureFlagService` has no validation logic between "slug well-formed" and "slug found," only `findBySlug` returning `null` → `BrandNotFound` → 404. No code path exists that could distinguish a malformed slug from an absent one, which structurally satisfies the requirement (there's nothing to special-case).
- [x] Concurrent requests for the same brand handled independently/consistently — the whole request path (`FeatureFlagService`, `EloquentBrandRepository`, `EloquentFeatureFlagRepository`) is pure read with no shared mutable state; each request builds its own array from a fresh query. No explicit concurrency test exists (correctly, per tasks.md's Test Coverage Matrix — this is a "no shared mutable state" structural guarantee, not a testable race), and design.md's Error Handling Strategy table confirms this was a conscious verification-by-inspection decision, not an omission.

---

## Gate Check

- **Gate command**: `bash scripts/check-layer-boundary.sh && php artisan test && vendor/bin/pint --test && vendor/bin/phpstan analyse --memory-limit=512M`
- **Result**: layer-boundary passed (exit 0); `php artisan test` — 23 tests, 1 explicitly passed + 22 emitting the pre-existing unrelated PHP 8.5 `PDO::MYSQL_ATTR_SSL_CA` deprecation notice (0 failures, 0 errors); Pint — `{"tool":"pint","result":"passed"}`; PHPStan — `[OK] No errors` (38/38 files, level per `phpstan.neon`)
- **Test count before feature** (`main`, verified via `git worktree add ... main` + `composer install` + `php artisan test`): 11 tests (10 deprecated-noise + 1 clean pass)
- **Test count after feature** (`feat/flags`): 23 tests
- **Delta**: +12 new tests — exactly matches the sum of tasks.md's declared additions (DomainServiceProviderTest +1, FeatureFlagRepositoryTest +2, FeatureFlagServiceTest +3, ExceptionHandlerTest +2, FeatureFlagControllerTest +4)
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans (if issues found)

None. No gaps found.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| FLAGSBE-01 | Done (T8) | ✅ Verified |
| FLAGSBE-02 | Done (T3, T5, T8) | ✅ Verified |
| FLAGSBE-03 | Done (T6, T7, T8) | ✅ Verified |
| FLAGSBE-04 | Done (T1, T2, T4, T5, T6, T8) | ✅ Verified |
| FLAGSBE-05 | Done (T1, T5, T8) | ✅ Verified |
| FLAGSBE-06 | Done (T9) | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 7/7 ACs matched spec outcome (6 P1 + 1 P2), 0 spec-precision gaps
**Sensor**: 3/3 mutations killed
**Gate**: layer-boundary + 23 tests (0 failed) + Pint clean + PHPStan clean, all passed

**What works**: The full `GET /api/v1/feature-flags?brand=<slug>` path — happy path with flags, empty-map for a flag-less brand, 422 on missing param, 404 on unknown brand — all verified both by the committed test suite (exact-JSON/exact-envelope assertions, not just structure checks) and by live manual `curl` against a real seeded Postgres instance. Layer boundaries (Controller purity, Domain purity from Laravel) hold under direct grep inspection, not just the boundary script. OpenAPI docs at `/docs/api.json` correctly list all three status codes and the `brand` parameter, requiring (and correctly using) the `#[Response(404, ...)]` attribute to cover the one gap static analysis can't close on its own.

**Issues found**: None.

**Next steps**: None — feature is ready to merge as-is. No lessons were distilled (clean PASS, no signal per lessons.md's rule of "clean PASS with no signal → record nothing").
