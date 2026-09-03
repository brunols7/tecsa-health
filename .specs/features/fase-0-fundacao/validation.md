# Fase 0 — Fundação Validation (re-verificação)

**Date**: 2026-09-03
**Spec**: `.specs/features/fase-0-fundacao/spec.md`
**Previous verdict**: ❌ FAIL (2026-09-01) — 2 gaps bloqueantes, 1 mutante sobrevivente, 5 gaps menores
**Diff range checked**: `1d1ae71` (root) .. `7086380` (HEAD, this session's fix commit) — all work
landed on `main` since the FAIL, across Fases 1-4, 6, plus `biomarcadores-criar`,
`acoes-ia-excluir`, `acoes-ia-novas-sugestoes`
**Verifier**: independent re-verification, this session (author of the original FAIL and of the
later fixes are different sessions; this pass re-derives evidence from scratch, not from the old
report's claims)
**Verdict**: ✅ **PASS**

---

## Method

Every gap and blocker from the previous `validation.md` (Fix 1-8) was checked against the current
code, not assumed fixed. Two were confirmed via a discrimination-sensor re-run in an isolated
worktree; the rest via direct file inspection. One genuinely open item was found (Fix 2's item (c),
never implemented) and fixed in this session before writing this report.

---

## Blocker Re-Verification

### Fix 1 (Blocker): `BrandProvider` never mounted in the real app — RESOLVED

Original gap: `_layout.tsx` never wrapped the tree in `BrandProvider`; `useTheme()` threw outside a
provider; the two-brand visual comparison was undemonstrable.

Current: `mobile/src/app/_layout.tsx:11` imports `resolveBrand` from `@/brands`; `_layout.tsx:19-20`
resolves `brandId` from `Constants.expoConfig?.extra?.brandId` and calls `resolveBrand(brandId)` at
module scope; `_layout.tsx:57-70` (`TabLayout`) wraps `GatedContent` in `<BrandProvider brand={brand}>`.
`mobile/src/app/__tests__/index.test.tsx:49` renders the real screen tree through `BrandProvider`
with a resolved brand and asserts brand-specific copy/colors render (`:100-120`, `:284-285`).

**Status**: ✅ Fixed. `npx expo start` with either `APP_BRAND` value now has a mounted provider —
confirmed structurally (no code path reaches `useTheme()` without a `BrandProvider` ancestor) and by
the passing render tests.

### Fix 2 (Blocker): `core/theme/BrandProvider.tsx` imported `@/brands`, guard-rail had a hole — RESOLVED (gap closed this session)

Original gap had three parts: (a) widen the ESLint pattern to also match bare `@/brands`; (b) move
brand resolution out of `core/`, have `BrandProvider` take an already-resolved `Brand` via prop; (c)
add a guard-rail regression test for the bare-import hole.

- **(a) — done.** `mobile/eslint.config.js:12-17` — `group` is now
  `['**/brands/*', '@/brands/*', '**/brands', '@/brands']`, covering the bare form.
- **(b) — done.** `mobile/src/core/theme/BrandProvider.tsx:1-13` no longer imports anything from
  `brands/`; it takes `brand: Brand` as a prop (`BrandProviderProps`). The only `resolveBrand` call
  site outside `brands/index.ts` itself and tests is `mobile/src/app/_layout.tsx:11,20` — the root,
  the one place CLAUDE.md §5.1 authorizes. Confirmed via
  `grep -rn "from '@/brands'" mobile/src --include='*.ts' --include='*.tsx' | grep -v __tests__` →
  only `src/app/_layout.tsx`.
- **(c) — was NOT done, found and fixed this session.** The previous fix plan explicitly asked for a
  `checkBrandBoundary.test.ts` case covering the bare `@/brands` import; no such case existed as of
  commit `1547520`. The discrimination sensor (below, Mutation 2) proved this: reverting the ESLint
  pattern to the pre-fix narrower form did not fail any test in the suite. Added
  `mobile/scripts/__tests__/checkBrandBoundary.test.ts:39-53` ("import bare de brands (sem sufixo
  /*) em core/ é pego pelo ESLint"), which writes a fixture importing `@/brands` (no slug) inside
  `src/core/` and asserts `npm run lint` fails with `no-restricted-imports`. Re-ran the same
  mutation after the fix: reverting the pattern now fails this new test (see sensor below).
  Committed as `7086380 test(mobile): cover bare @/brands import in brand boundary guard-rail`.

**Status**: ✅ Fixed, including the regression-coverage gap the original fix plan asked for and that
had been missed.

### Fix 3 (Major): mutant M2 survived — `resolveBrand` had no error-path test — RESOLVED

`mobile/src/brands/__tests__/index.test.ts:1-11` now asserts both known ids resolve
(`:5-6`) and `expect(() => resolveBrand('inexistente')).toThrow('Marca desconhecida: inexistente')`
(`:10`). Discrimination sensor Mutation 1 (below) confirms this kills the silent-fallback mutant.

**Status**: ✅ Fixed.

### Fix 4 (Major): duplicated brand descriptor in `app.config.ts` had already diverged — RESOLVED

Original: `app.config.ts` splash colors contradicted the real brand theme tokens (vita-plus almost
black vs. its actual sand background; nutri-care cream vs. its actual cool neutral).

Current: `mobile/app.config.ts:21` (`nutri-care.splashBackgroundColor: '#F2F5F7'`) matches
`mobile/src/brands/nutri-care/theme.ts:8` (`background: '#F2F5F7'`) exactly.
`mobile/app.config.ts:29` (`vita-plus.splashBackgroundColor: '#FBF3E9'`) matches
`mobile/src/brands/vita-plus/theme.ts:8` (`background: '#FBF3E9'`) exactly. The duplication itself
(two sources of truth) is still structural, but it is documented and justified as intentional in
`.specs/STATE.md` **AD-006** ("Expo CLI avalia `app.config.ts` via `require()` do Node fora do
Metro — o alias `@/` de `tsconfig.json` não resolve nesse contexto... deve ser mantida em
sincronia manual"), which is a reasonable, disclosed trade-off, not a silent regression.

**Status**: ✅ Fixed (values realigned); duplication remains by documented design, not a defect.

### Fix 5 (Minor): README pointed at a nonexistent endpoint — RESOLVED

`README.md:66` now uses `curl -f http://localhost:9000/up`, matching the spec's verification
command. No reference to `/api/v1/feature-flags` remains in the "como rodar" section
(`grep -n "feature-flags" README.md` → only unrelated architecture-diagram mentions elsewhere in the
doc, not in the run instructions).

**Status**: ✅ Fixed.

### Fix 6 (Minor): `check-layer-boundary.sh` didn't cover `Http/Controllers/` — RESOLVED

`api/scripts/check-layer-boundary.sh:15-16` now runs the `DB::|Models\` grep against
`$BASE_DIR/Http/Controllers/` in addition to `$BASE_DIR/Application/`. This matches
`.specs/STATE.md` **AD-010**, which documents the fix and cites the regression test added for it:
`api/tests/Feature/LayerBoundaryScriptTest.php` —
`test_fails_when_controller_uses_db_facade_or_eloquent_models`. Confirmed present in the current
test file (`composer test` run below includes it, green).

**Status**: ✅ Fixed.

### Fix 7 (Minor): leftover Expo scaffold with a competing theme system — RESOLVED

`mobile/src/app/explore.tsx`, `src/components/**` demo components, `src/constants/theme.ts`, and
`src/hooks/use-theme.ts` no longer exist. `ls mobile/src/app/` shows only `__tests__/`,
`_layout.tsx`, `index.tsx`, `patients/` — no `explore.tsx`. `find mobile/src -iname "use-theme*" -o
-path "*constants/theme*"` returns nothing.

**Status**: ✅ Fixed.

### Fix 8 (Informational): stale STATE.md records — superseded

The specific claims flagged (test count of 10 vs 14, Batch 3/4 status) predate this report by many
sessions; `.specs/STATE.md` has been rewritten dozens of times since (most recently for AD-015).
Not independently re-checked — informational only, non-blocking then and now.

---

## Spec-Anchored Acceptance Criteria (re-check of previously-failing ACs only)

| Criterion | Spec-defined outcome | `file:line` + evidence | Result |
| --- | --- | --- | --- |
| FNDMOB-01 — import of `**/brands/*` or bare `@/brands` in `core/` → ESLint error with exact message | error, message "core/ não pode conhecer marca. Use useTheme() ou useFlag()." | `mobile/eslint.config.js:12-19` pattern includes bare form; `mobile/scripts/__tests__/checkBrandBoundary.test.ts:26-38` (slug form) and `:39-53` (bare form, new) both assert `result.status !== 0` and `result.output.toContain('no-restricted-imports')` | ✅ PASS |
| FNDMOB-11 — `APP_BRAND=vita-plus` → name, bundle id, **and `BrandProvider` at runtime** reflect `vita-plus` | all three | `app.config.ts:22-36` (name/bundle, unchanged from before) + `src/app/_layout.tsx:19-20,57-70` now resolves and mounts the provider at runtime | ✅ PASS |
| FNDMOB-13 — screenshots of both brands differ in accent, radius, font weight | real visual difference | `src/app/__tests__/index.test.tsx:46-51,284-285` proves the token difference through a mounted `BrandProvider` tree (previously this ran against a component that would crash outside a provider in the real app; now the same tree the app actually renders is what's under test) | ✅ PASS |
| FNDBE-02 — `DB::`/`Models\` in `Application/` or `Http/Controllers/` → exit ≠0 | exit 1 | `api/scripts/check-layer-boundary.sh:12-16`; `api/tests/Feature/LayerBoundaryScriptTest.php` (green in `composer test` run below) | ✅ PASS |

---

## Discrimination Sensor

Scratch: `git worktree add <scratch>/sensor-fase0 HEAD` at commit `1547520` (before this session's
fix), `node_modules` symlinked to the real tree (no vendor copy needed for a TS/Jest-only sensor).
Baseline: `npx jest src/brands/__tests__/index.test.ts` → 2/2 passed;
`npx jest scripts/__tests__/checkBrandBoundary.test.ts` → 3/3 passed.

| # | Mutation | File | Change | Result |
| - | -------- | ---- | ------ | ------ |
| M1 | `resolveBrand` silently falls back instead of throwing on unknown id | `mobile/src/brands/index.ts:19-21` | `throw new Error(...)` → `return nutriCareBrand` | ✅ **KILLED** — `src/brands/__tests__/index.test.ts:10` failed with "Received function did not throw" |
| M2 | ESLint brand-boundary pattern narrowed back to the pre-fix form (slug-only) | `mobile/eslint.config.js` pattern | `['**/brands/*', '@/brands/*', '**/brands', '@/brands']` → `['**/brands/*', '@/brands/*']` | ❌ **SURVIVED** at commit `1547520` (no test exercised the bare-import case) → **fixed this session** by adding the case to `checkBrandBoundary.test.ts`; re-run after the fix (in the real tree, not the scratch) shows the same mutation now fails the new test |

Scratch discarded (`git worktree remove ... --force`) after M1/M2. `git status --porcelain` on the
real tree before and after the sensor run is identical (confirmed — the sensor never touched the
real tree; the fix for M2 was applied directly and separately, then verified against the real,
unmutated code, not against the scratch).

**Result**: 2/2 mutations kill — ✅ PASS (1 killed immediately, 1 required — and got — a real fix).

---

## Gate Check

```
$ cd api && composer test
Tests: 225 deprecated, 47 passed (716 assertions)   # exit 0 — "deprecated" = PHP 8.5 PDO::MYSQL_ATTR_SSL_CA
                                                       notice only (spec.md Out of Scope, cosmetic),
                                                       all 272 tests pass
$ cd mobile && npm test
Test Suites: 51 passed, 51 total
Tests: 294 passed, 294 total   # 293 pre-existing + 1 new (checkBrandBoundary bare-import case)
$ cd mobile && npx tsc --noEmit
(clean, no output)
```

---

## Summary

**Result**: ✅ PASS

Both original blockers (Fix 1: `BrandProvider` never mounted; Fix 2: bare-import boundary hole) are
confirmed fixed by later work (Fases 1-4/6), with fresh `file:line` evidence, not inherited from the
old report's claims. The two Major gaps (Fix 3, Fix 4) and the three Minor/Informational gaps (Fix
5-8) are also confirmed fixed, except Fix 2's regression-test sub-item, which had been silently
skipped — the discrimination sensor caught it as a survived mutant, and it was fixed in this session
(`7086380`) before this report was written.

No blocking gap remains. `composer test` (272 tests) and `npm test` (294 tests) are green,
`tsc --noEmit` is clean.

**Spec-anchored check**: 4/4 previously-failing ACs now PASS with fresh evidence.
**Sensor**: 2 mutations, 2 killed (1 immediately, 1 after a real fix this session).
**Diff/commit range**: `1d1ae71`..`7086380`.
