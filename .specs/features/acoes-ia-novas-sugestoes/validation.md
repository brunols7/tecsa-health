# Novas Sugestões de Ações de IA Validation

**Date**: 2026-09-02
**Spec**: `.specs/features/acoes-ia-novas-sugestoes/spec.md`
**Diff range**: `HEAD~5..HEAD` on `feat/ia-acoes` (`d68a835`..`2376543`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

Spec has no `tasks.md` in this feature's folder (only `spec.md`); traceability table in spec.md
marks all 10 requirements "Implemented". Code inspection confirms all 10 ACs have corresponding
implementation.

---

## Spec-Anchored Acceptance Criteria

### P1: Pedir novas sugestões de IA

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AIREF-01: toque em "Novas sugestões" com lista não vazia → app chama POST com `refresh: true` | `generateAiActions` called with `refresh=true`, which serializes body `{refresh:true}` | `mobile/src/core/ui/AiActionsSection.tsx:100` `onPress={() => mutation.mutate({ patientId, refresh: true })}` + `mobile/src/core/ui/__tests__/AiActionsSection.test.tsx:166` `expect(mockedGenerateAiActions).toHaveBeenCalledWith('patient-1', true)` + `mobile/src/core/api/ai-actions.ts:14` (body serialization, untested directly but trivial) | ✅ PASS |
| AIREF-02: backend recebe `refresh: true` → `AiActionService` ignora cache e chama `LlmClient` de novo | cache hit exists, `refresh:true` → `llm->timesCalled()===1`, `generated===true` | `api/tests/Unit/AiActionServiceTest.php:322-364` `test_refresh_bypasses_cache_calls_llm_and_appends_to_existing_actions` — `$this->assertSame(1, $llm->timesCalled());` (line 360) | ✅ PASS |
| AIREF-03: prompt para `refresh:true` inclui títulos `pending`+`accepted` como `existingTitles` | `existingTitles === ['Ação pendente', 'Ação aceita']`, dismissed excluded | `api/tests/Unit/AiActionServiceTest.php:366-425` `test_refresh_sends_pending_and_accepted_titles_to_the_llm_but_not_dismissed` — `$this->assertSame(['Ação pendente', 'Ação aceita'], $llm->lastInput()?->existingTitles);` (line 424) | ✅ PASS |
| AIREF-04: refresh bem-sucedido → persiste novas ações com `input_hash` do snapshot atual e devolve 201 com lista completa, sem apagar/alterar existentes | (a) 201, (b) full merged list (existing+new), (c) new rows persist with **current** `input_hash` | (a)(b): `api/tests/Feature/Api/V1/AiActionControllerTest.php:124-131` `$refreshed->assertStatus(201); $refreshed->assertJsonCount(2);` + `api/tests/Unit/AiActionServiceTest.php:359-363` `assertCount(2, ...); assertSame($existing, $result->actions[0]);`. (c) **no test asserts** the persisted `input_hash` of the newly inserted rows equals the current biomarker-snapshot hash (`insertMany` mock in Unit test only checks title, not `inputHash`; Feature test never inspects `AiActionModel::input_hash`) | ⚠️ Spec-precision gap (sub-clause (c) uncovered) |
| AIREF-05: resposta de refresh bem-sucedida → UI exibe lista completa (existentes+novas) sem duplicar cards | both titles rendered, old title appears exactly once | `mobile/src/core/ui/__tests__/AiActionsSection.test.tsx:170-173` `await waitFor(() => expect(getByText('Aumentar ingestão de fibras')).toBeTruthy()); expect(queryAllByText('Reduzir consumo de açúcar')).toHaveLength(1);` | ✅ PASS |
| AIREF-06: POST sem `refresh` (ou `refresh:false`) mantém comportamento de cache inalterado | `generated===false`, `actions===$existing`, `llm.timesCalled()===0` | `api/tests/Unit/AiActionServiceTest.php:454-491` `test_without_refresh_cache_hit_still_short_circuits_without_calling_llm` (lines 488-490) + `api/tests/Feature/Api/V1/AiActionControllerTest.php:134-147` `test_post_without_refresh_still_hits_cache_and_never_appends` — `$second->assertStatus(200); $second->assertJsonCount(1);` | ✅ PASS |

### P2: Botão condicional ao estado

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AIREF-07: lista vazia → mostra **apenas** "Gerar ações" (sem refresh) | `ai-actions-generate-button` present; `ai-actions-refresh-button` **absent** | `mobile/src/core/ui/__tests__/AiActionsSection.test.tsx:103-111` asserts `ai-actions-generate-button` present, but **never asserts `queryByTestId('ai-actions-refresh-button')` is null** in the empty-state test. Absence is only true by construction (`AiActionsRefreshButton` lives in the separate success-branch render prop, `AiActionsSection.tsx:183-190`), not by an explicit negative assertion | ⚠️ Spec-precision gap (negative case unasserted) |
| AIREF-08: lista com ≥1 item → mostra "Novas sugestões" **no topo, acima dos cards** | `ai-actions-refresh-button` present, `ai-actions-generate-button` absent, rendered before the card list | `mobile/src/core/ui/__tests__/AiActionsSection.test.tsx:138-147` asserts presence/absence of the two buttons, but **does not assert render order** (i.e., that the button precedes the cards in the tree). Code does place it first (`AiActionsSection.tsx:185-187`) but this is unverified by test | ⚠️ Spec-precision gap (position sub-clause uncovered) |
| AIREF-09: falha no refresh (rede, 502/503) → mensagem de erro junto ao botão, ações existentes preservadas, permite retry | error text visible, existing card still visible, button re-enabled | `mobile/src/core/ui/__tests__/AiActionsSection.test.tsx:176-189` `test('erro ao buscar novas sugestões...')` — `expect(getByTestId('ai-actions-refresh-error')).toBeTruthy(); expect(getByText('Reduzir consumo de açúcar')).toBeTruthy(); expect(...disabled).toBe(false);` (lines 186-188) | ✅ PASS |
| AIREF-10: refresh em andamento → botão desabilitado + indicador de carregamento | `disabled===true`, loading indicator visible | `mobile/src/core/ui/__tests__/AiActionsSection.test.tsx:167-168` `await waitFor(() => expect(getByTestId('ai-actions-refresh-loading')).toBeTruthy()); expect(...disabled).toBe(true);` | ✅ PASS |

**Status**: ⚠️ Gaps present — 7/10 ACs fully matched, 3/10 have a spec-precision gap on a specific sub-clause (core behavior of each is otherwise covered).

---

## Edge Cases

| Edge case (from spec.md) | Result |
| --- | --- |
| Kill switch off → 503 even with `refresh: true` | ❌ No evidence. `api/tests/Feature/Api/V1/AiActionControllerTest.php:171-182` (`test_post_returns_503_when_kill_switch_is_off`) does not send `refresh:true`; no test combines the two. Code path (`assertAiEnabled` runs before the refresh branch) makes this very likely correct, but per evidence-or-zero this specific combination is uncovered. |
| Patient has no biomarkers → 422 even with `refresh: true` | ❌ No evidence. `api/tests/Feature/Api/V1/AiActionControllerTest.php:159-169` (`test_post_returns_422_when_patient_has_no_biomarkers`) does not send `refresh:true`. |
| LLM invalid schema on a refresh call → single retry, then 502, existing actions untouched | ❌ No evidence. `api/tests/Feature/Api/V1/AiActionControllerTest.php:198-212` (`test_post_returns_502_after_one_retry_when_schema_is_invalid_twice`) exercises the retry/502 path but not with `refresh:true`, and does not assert that pre-existing actions survive a failed refresh (it only asserts 0 rows exist, patient never had any actions to begin with). |
| No `pending`/`accepted` actions → `existingTitles` is `[]` | ✅ `api/tests/Unit/AiActionServiceTest.php:427-452` `test_refresh_with_no_cache_hit_sends_empty_existing_titles` — `$this->assertSame([], $llm->lastInput()?->existingTitles);` (line 450). Covers the "first refresh, no cache hit" sub-case; the "all-dismissed cache hit" sub-case is not separately tested but is a direct logical extension of the filter proven in `test_refresh_sends_pending_and_accepted_titles_to_the_llm_but_not_dismissed` (line 366-425). |

---

## Discrimination Sensor

Isolated scratch: `git worktree add` (never `git stash`), with `api/vendor` and `mobile/node_modules`
**copied** (not symlinked — a first attempt symlinking `api/vendor` silently invalidated the sensor,
since PHP resolves `__DIR__` through the symlink back to the real repo's `app/` directory, so
mutations in the scratch tree were never actually exercised; this was caught, corrected, and
verified against a clean baseline re-run before mutating).

| # | File:line | Description | Killed? |
| --- | --- | --- | --- |
| 1 | `api/app/Application/AiAction/AiActionService.php:74` | Flipped `if ($existing !== [] && ! $refresh)` → `if ($existing !== [])` (refresh no longer bypasses cache) | ✅ Killed — 2 tests failed (`test_refresh_bypasses_cache_calls_llm_and_appends_to_existing_actions`, `test_refresh_sends_pending_and_accepted_titles_to_the_llm_but_not_dismissed`) |
| 2 | `api/app/Application/AiAction/AiActionService.php:121-129` | Removed the `Pending`/`Accepted` status filter in `titlesToAvoidRepeating` — dismissed titles now included | ✅ Killed — `test_refresh_sends_pending_and_accepted_titles_to_the_llm_but_not_dismissed` failed (unexpected `'Ação descartada'` in array) |
| 3 | `api/app/Application/AiAction/AiActionService.php:114` | Changed `[...$history, ...$actions]` → `$actions` (refresh no longer appends, only returns new actions) | ✅ Killed — `test_refresh_bypasses_cache_calls_llm_and_appends_to_existing_actions` failed (`assertCount(2, ...)` got 1) |
| 4 | `api/app/Http/Requests/GenerateAiActionsRequest.php:28` | `wantsRefresh()` hardcoded to `return false;` (refresh flag never reaches the Service) | ✅ Killed — `test_post_with_refresh_calls_llm_again_and_appends_to_existing_actions` failed (`Expected 201, received 200`) |
| 5 | `mobile/src/core/ui/AiActionsSection.tsx:100` | Refresh button's `onPress` calls `mutation.mutate({ patientId })` without `refresh: true` | ✅ Killed — `AiActionsSection.test.tsx` refresh test failed (`toHaveBeenCalledWith` expected `true`, received `undefined`) |

**Sensor depth**: lightweight (5 targeted mutations)
**Result**: 5/5 killed — ✅ PASS

Real worktree `git status --porcelain` before and after the sensor run: both empty (clean). Scratch
worktree removed with `git worktree remove --force`; scratch test database (`tecsa_health_test`)
dropped after use.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ (the unrelated `fix(mobile): keep priority badge...` commit is excluded, as instructed) |
| Matches patterns | ✅ (Controller stays thin — reads `wantsRefresh()` from FormRequest, delegates to Service; Service owns the cache-bypass decision) |
| Spec-anchored outcome check (asserted values match spec) | ⚠️ 3 ACs + 3 edge cases have a sub-clause or combination not directly asserted (see tables above) |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ⚠️ Domain/Service layer is thoroughly covered (9 refresh-specific unit tests); route layer misses the refresh × (503 / 422 / 502) combinations |
| Every test maps to a spec requirement — no unclaimed tests | ✅ |
| Documented guidelines followed | CLAUDE.md §6.4 (LLM adapter contract), §2.2 (no business logic in Controller) — both followed: `AiActionController.php:27-35` only reads the FormRequest and calls the Service |

---

## Gate Check

- **Gate commands**:
  - `cd api && php artisan test --filter=AiActionServiceTest` → 21 passed, 0 failed (71 assertions)
  - `cd api && php artisan test --filter=AiActionControllerTest` → 22 passed, 0 failed (95 assertions) — required starting `docker compose up -d db` and creating the `tecsa_health_test` database, which did not exist; pre-existing `.env.testing` (`DB_PORT=5434`) does not match `docker-compose.yml`'s published port (`5433`), so the run used `DB_HOST=127.0.0.1 DB_PORT=5433` overrides. This port mismatch is a pre-existing environment issue, not introduced by this diff.
  - `cd api && vendor/bin/phpstan analyse --no-progress --memory-limit=512M` → No errors (default 128M limit crashes the process; unrelated to this diff, pre-existing repo config)
  - `cd api && vendor/bin/pint --test` → passed
  - `cd mobile && npx tsc --noEmit` → clean, no output
  - `cd mobile && npx jest useGenerateAiActionsMutation AiActionsSection` → 2 suites, 14 passed, 0 failed
- **Failures**: none
- **Skipped tests**: none

---

## Fix Plans

### Fix 1: AIREF-04(c) — assert persisted `input_hash` on refresh-generated actions

- **Root cause**: `insertMany` is asserted only on `title`/`patientId`/`status` in the Unit test
  (`AiActionServiceTest.php:348-350`); no test reads back `AiActionModel::input_hash` after a
  refresh POST to confirm it equals the current biomarker-snapshot hash.
- **Fix task**: In `AiActionControllerTest::test_post_with_refresh_calls_llm_again_and_appends_to_existing_actions`,
  assert `AiActionModel::query()->where('patient_id', $patient->id)->pluck('input_hash')->unique()->count() === 1`
  (all rows, old and new, share one hash) — or a Unit-level assertion on the `Mockery::on()` closure
  checking `$actions[0]->inputHash === $inputHash`.
- **Priority**: Minor (behavior is correct by code inspection — `AiActionService.php:97-110` always
  uses the single `$inputHash` local for new rows — this is a coverage gap, not a suspected bug).

### Fix 2: Edge cases — kill switch / no-biomarkers / invalid-schema combined with `refresh: true`

- **Root cause**: The three refresh-specific edge cases in spec.md were never given their own test;
  existing 503/422/502 tests all use the no-refresh path.
- **Fix task**: Duplicate `test_post_returns_503_when_kill_switch_is_off`,
  `test_post_returns_422_when_patient_has_no_biomarkers`, and
  `test_post_returns_502_after_one_retry_when_schema_is_invalid_twice` with `['refresh' => true]`
  sent in the request body, plus (for the schema-invalid case) seed a pre-existing pending action
  first and assert it still exists after the 502.
- **Priority**: Minor (all three checks precede/are independent of the refresh branch in
  `AiActionService::generate()`, so failure risk is low, but per evidence-or-zero these are
  currently uncovered).

### Fix 3: AIREF-07/08 — assert button mutual-exclusion and position directly

- **Root cause**: The empty-state test never asserts `ai-actions-refresh-button` is absent; the
  non-empty test never asserts render order.
- **Fix task**: Add `expect(queryByTestId('ai-actions-refresh-button')).toBeNull();` to the
  empty-state test, and use `UNSAFE_root` / testID ordering (or split the refresh button and first
  card into a single container and assert `children[0].props.testID === 'ai-actions-refresh-button'`)
  in the non-empty test.
- **Priority**: Cosmetic/Minor (implementation is structurally correct — the two buttons live in
  mutually exclusive render branches, and the refresh button is written before the `.map()` — this
  is purely a test-strength gap).

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| AIREF-01 | Implemented | ✅ Verified |
| AIREF-02 | Implemented | ✅ Verified |
| AIREF-03 | Implemented | ✅ Verified |
| AIREF-04 | Implemented | ⚠️ Needs Fix (sub-clause: input_hash persistence assertion) |
| AIREF-05 | Implemented | ✅ Verified |
| AIREF-06 | Implemented | ✅ Verified |
| AIREF-07 | Implemented | ⚠️ Needs Fix (negative assertion) |
| AIREF-08 | Implemented | ⚠️ Needs Fix (position assertion) |
| AIREF-09 | Implemented | ✅ Verified |
| AIREF-10 | Implemented | ✅ Verified |

---

## Summary

**Overall**: ⚠️ Issues

**Spec-anchored check**: 7/10 ACs matched spec outcome exactly; 3 flagged with a spec-precision gap
on a specific sub-clause (core behavior of all 10 is implemented and covered — the gaps are narrow
and low-risk, not missing features)

**Sensor**: 5/5 mutations killed

**Gate**: 21 + 22 backend tests passed, 0 failed; phpstan clean; pint clean; tsc clean; 14 mobile
tests passed, 0 failed

**What works**: Cache-bypass on refresh, existingTitles dedup logic (pending+accepted, excluding
dismissed), append-not-replace merge semantics, 201/200 status discrimination, mobile button
mutual-exclusion between empty and non-empty states, loading/error/disabled states on the refresh
button, rollback-free error handling that preserves the already-loaded list. All of this is backed
by genuine, spec-anchored assertions and survived 5/5 targeted mutations.

**Issues found**: 3 ACs (AIREF-04, 07, 08) and 3 edge cases have a real implementation that is very
likely correct by code inspection, but lack a direct test assertion for one specific sub-clause each
(see Fix Plans above). None of these indicate a functional bug found during this review — they are
coverage gaps under the evidence-or-zero rule.

**Next steps**: Route Fix 1-3 to an implementer as fix tasks (all Minor/Cosmetic severity, no
Blocker/Major found), then re-run the Verifier. This is fix→re-verify iteration 1 of the 3 allowed.

---

## Iteration 2 (re-verify after fix commit)

**Date**: 2026-09-02
**Fix commit**: `e1b6fc3` `test(api,mobile): close verifier coverage gaps for ai-action refresh`
**Diff scope confirmed**: `git show --stat HEAD` — only
`api/tests/Feature/Api/V1/AiActionControllerTest.php` (+52/-0) and
`mobile/src/core/ui/__tests__/AiActionsSection.test.tsx` (+14/-3) changed. No implementation files
(`api/app/**`, `mobile/src/core/{api,patients,ui}/**` excluding `__tests__`) touched — per the
mandate, the discrimination sensor is skipped this round (iteration 1's 5/5-killed result against
pre-fix implementation still stands and remains valid, since the implementation is unchanged).

### Gap-Closure Table

| # | Gap (iteration 1) | Fix location | Assertion targets spec outcome? | Verdict |
| --- | --- | --- | --- | --- |
| 1 | AIREF-04(c): no assertion that refresh-persisted rows carry the **current** biomarker-snapshot `input_hash` | `api/tests/Feature/Api/V1/AiActionControllerTest.php:132-135` — `$this->assertSame(1, AiActionModel::query()->where('patient_id', $patient->id)->distinct('input_hash')->count('input_hash'));` | Yes. `input_hash` is a non-nullable `string` column (`api/database/migrations/0000_12_31_000003_create_ai_actions_table.php:21`), and the biomarker snapshot is not mutated between the first POST and the refresh POST in this test, so "current snapshot hash" is invariant across both calls. Asserting exactly 1 distinct non-null value across the 2 rows (1 pre-existing + 1 refresh-generated) proves the new row was persisted with the same hash as the snapshot-derived hash of the first generation — i.e., the current snapshot hash, per spec AIREF-04. Not a weaker proxy: a bug that persisted a stale, null, or divergent hash on the new row would make `distinct('input_hash')->count()` return 2, failing this assertion. | ✅ Closed |
| 2 | Edge case: kill switch off + `refresh: true` never combined | `api/tests/Feature/Api/V1/AiActionControllerTest.php:175-186` — `test_post_with_refresh_returns_503_when_kill_switch_is_off` — `$response->assertStatus(503); $response->assertJsonPath('error.code', 'AI_DISABLED'); $this->assertSame(0, $fake->timesCalled());` | Yes. Directly matches spec edge case: "SHALL devolver 503 mesmo com `refresh: true`" plus proves the LLM was never invoked (bypass check happens before the refresh branch). | ✅ Closed |
| 3 | Edge case: no-biomarkers + `refresh: true` never combined | `api/tests/Feature/Api/V1/AiActionControllerTest.php:175-186` (see block above at line ~175) — `test_post_with_refresh_returns_422_when_patient_has_no_biomarkers` — `$response->assertStatus(422); $response->assertJsonPath('error.code', 'PATIENT_NO_BIOMARKERS');` | Yes. Matches spec edge case exactly: 422 with `refresh: true` sent. | ✅ Closed |
| 4 | Edge case: invalid-schema retry/502 + `refresh: true`, existing actions preserved, never combined | `api/tests/Feature/Api/V1/AiActionControllerTest.php:243-262` — `test_post_with_refresh_returns_502_after_one_retry_and_keeps_existing_actions` — `$refreshed->assertStatus(502); $refreshed->assertJsonPath('error.code', 'AI_UNAVAILABLE'); $this->assertSame(3, $fake->timesCalled()); $this->assertSame(1, AiActionModel::query()->where('patient_id', $patient->id)->count()); $this->assertTrue(AiActionModel::query()->whereKey($existingId)->exists());` | Yes — this closes the gap more completely than the original Fix Plan asked: it seeds one pre-existing action via a successful first POST, captures its id, forces 2 consecutive `LlmInvalidResponse` failures on refresh (1 initial + 1 retry = the "single retry" semantics, for a total of 3 LLM calls including the first successful one), asserts 502/`AI_UNAVAILABLE`, and asserts the pre-existing row count is still 1 and the specific id still exists — directly matching "sem tocar nas ações existentes." | ✅ Closed |
| 5 | AIREF-07: empty-state test never asserted `ai-actions-refresh-button` absence | `mobile/src/core/ui/__tests__/AiActionsSection.test.tsx:109` — `expect(queryByTestId('ai-actions-refresh-button')).toBeNull();` | Yes. Direct negative assertion using `queryByTestId` (returns `null` rather than throwing), added inside the same test that already confirms `ai-actions-generate-button` presence — matches spec P2/AC1 "mostrar **apenas** o botão Gerar ações." | ✅ Closed |
| 6 | AIREF-08: non-empty-state test never asserted refresh button renders **above** the cards | `mobile/src/core/ui/__tests__/AiActionsSection.test.tsx:147-152` — `const tree = JSON.stringify(toJSON()); const refreshButtonIndex = tree.indexOf('"ai-actions-refresh-button"'); const firstCardIndex = tree.indexOf(`"ai-action-card-${fakeAction.id}"`); expect(refreshButtonIndex).toBeGreaterThan(-1); expect(firstCardIndex).toBeGreaterThan(-1); expect(refreshButtonIndex).toBeLessThan(firstCardIndex);` | Yes. `toJSON()` serializes the rendered tree in document order, so an earlier string index for the refresh button's testID than the first card's testID is a valid proxy for "renders before it in the tree" (React Native Testing Library's `toJSON()` output preserves render/DOM order, and JSON.stringify does not reorder object keys or array elements). This directly targets the spec's "no topo da seção, acima dos cards" requirement, not just presence. | ✅ Closed |

**All 6 ranked gaps from iteration 1 closed. 0 remaining.**

### Previously-PASS Criteria — Regression Spot Check

Reviewed the full diff (`git show HEAD`) against AIREF-01, 02, 03, 05, 06, 09, 10 (the criteria not
touched by this commit's Fix Plan targets):

- No existing assertion was removed, weakened, or altered — the diff is purely additive (new
  `assertSame`/`assertJsonPath` lines and one new test method in the PHP file; one new
  `queryByTestId` line and one new `toJSON()` block in the TSX file — the pre-existing assertions in
  each modified test function are untouched).
- No implementation file changed, so the behavior underlying AIREF-01/02/03/05/06/09/10 is
  identical to iteration 1, where it was already verified ✅ PASS with spec-anchored evidence.
- **Verdict**: no regression. All 7 previously-PASS criteria remain ✅ PASS.

### Gate Check (re-run fresh)

| Command | Result |
| --- | --- |
| `cd api && DB_HOST=127.0.0.1 DB_PORT=5433 php artisan test --filter=AiActionControllerTest` | Exit 0. 25 tests, 107 assertions, 0 failures (test count up from 22 in iteration 1 — the 3 new edge-case tests). Output shows `!` (deprecated) markers, not `✘` (failed) — the noise is `PHP Deprecated: Constant PDO::MYSQL_ATTR_SSL_CA is deprecated since 8.5`, a pre-existing PHP 8.5 environment warning unrelated to this feature or diff, present on every test regardless of content. |
| `cd api && vendor/bin/phpstan analyse --no-progress --memory-limit=512M` | `[OK] No errors` |
| `cd api && vendor/bin/pint --test` | `{"tool":"pint","result":"passed"}` |
| `cd mobile && npx tsc --noEmit` | Clean, no output |
| `cd mobile && CI=true npx jest AiActionsSection --watchAll=false --forceExit --runInBand` | 1 suite, 9 tests passed, 0 failed (up from prior count due to the strengthened assertions in existing tests; no new `it()` blocks added, 2 existing tests gained assertions) |

**Test Integrity**: test count increased (backend +3 new tests, mobile 0 new tests but 2
strengthened) — consistent with the fix commit description, no deletions, no weakened assertions
found.

### Discrimination Sensor

Skipped per instructions: this commit touches only `tests/`/`__tests__/` paths (confirmed above via
`git show --stat HEAD`), zero implementation files changed. Iteration 1's sensor run (5/5 mutations
killed, against the same unchanged implementation) remains the valid, current evidence — see the
Iteration 1 section above for the full mutation table.

### Iteration 2 Requirement Traceability Update

| Requirement | Iteration 1 Status | Iteration 2 Status |
| --- | --- | --- |
| AIREF-01 | ✅ Verified | ✅ Verified (unchanged) |
| AIREF-02 | ✅ Verified | ✅ Verified (unchanged) |
| AIREF-03 | ✅ Verified | ✅ Verified (unchanged) |
| AIREF-04 | ⚠️ Needs Fix (input_hash sub-clause) | ✅ Verified |
| AIREF-05 | ✅ Verified | ✅ Verified (unchanged) |
| AIREF-06 | ✅ Verified | ✅ Verified (unchanged) |
| AIREF-07 | ⚠️ Needs Fix (negative assertion) | ✅ Verified |
| AIREF-08 | ⚠️ Needs Fix (position assertion) | ✅ Verified |
| AIREF-09 | ✅ Verified | ✅ Verified (unchanged) |
| AIREF-10 | ✅ Verified | ✅ Verified (unchanged) |

Edge cases: all 3 previously-gapped edge cases (kill switch + refresh, no-biomarkers + refresh,
invalid-schema retry + refresh) now have direct test evidence — see Gap-Closure Table above.

### Iteration 2 Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 10/10 ACs matched spec outcome exactly. 0 spec-precision gaps remaining.

**Sensor**: not re-run (no implementation change since the 5/5-killed run in iteration 1); iteration
1's result stands.

**Gate**: 25 backend tests passed (0 failed); phpstan clean; pint clean; tsc clean; 9 mobile tests
passed (0 failed).

**What works**: All 10 acceptance criteria across both user stories, all 4 edge cases (including
all 3 refresh × failure-mode combinations), and the full merge/cache/dedup/UI-state behavior — all
backed by spec-anchored assertions, all previously-flagged coverage gaps closed without weakening
any existing test.

**Issues found**: none remaining.

**Next steps**: None — feature validated PASS on fix→re-verify iteration 2 of the 3 allowed. No
further iteration needed.
