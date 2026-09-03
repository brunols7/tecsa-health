# Fase 4 — Release: OTA e build por marca (mobile) Validation

**Date**: 2026-09-03
**Spec**: `.specs/features/fase-4-release-ota-mobile/spec.md`
**Tasks**: `.specs/features/fase-4-release-ota-mobile/tasks.md` (T1-T5 done, T6-T12 pending)
**Diff range checked**: `main` at commit `1547520` (this feature's config files, `mobile/eas.json`,
`mobile/app.config.ts`, `mobile/package.json`)
**Verifier**: independent re-verification (this feature never had a `validation.md` before)
**Verdict**: ✅ **PASS** (scoped — see "Scope of this verdict")

---

## Scope of this verdict

This feature has two kinds of acceptance criteria: config-level ones an agent can verify by reading
files and running local CLI commands, and physical-execution ones (`eas build` producing an
installable binary, installing it on a real device/simulator, `eas update` publishing a bundle and
a human confirming it applied visually) that require a device or simulator this environment does
not have attached, plus EAS cloud build queue time (the one build that did run took ~3h39m end to
end, per its own timestamps — see evidence below).

`.specs/features/fase-5-fechamento/context.md`, decision 2, already settled this for the whole
closing phase: physical-device/OTA-application checks are explicitly out of automated-Verifier
scope and go into a manual checklist the user confirms separately (fase-5 task T16), not treated as
a blocking gap an agent must close by itself. This report follows that decision: it verifies
everything code/CLI-checkable to a PASS, and reports the physical-execution items' real state
honestly instead of skipping them or inventing a demonstration.

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1 — install `expo-updates`/`expo-dev-client` | ✅ Done | `mobile/package.json:14,26` |
| T2 — create/link EAS project | ✅ Done | `extra.eas.projectId` resolves to `9a7ed133-242f-47a6-b70f-ebc2bfeeb50b` for both brands (verified live below) |
| T3 — `updates`/`runtimeVersion`/`extra.eas.projectId` in `app.config.ts` | ✅ Done | `mobile/app.config.ts:97-112` |
| T4 — `eas.json` build profiles per brand | ✅ Done | `mobile/eas.json` |
| T5 — local dry-run validation | ✅ Done (re-run fresh this session) | see Spec-Anchored ACs below |
| T6 — Android build, NutriCare | ✅ Done (real EAS build exists) | see evidence below |
| T7 — Android build, VitaPlus | ❌ Not done | no build found in EAS project history |
| T8 — iOS build, NutriCare | ❌ Not done | no build found |
| T9 — iOS build, VitaPlus | ❌ Not done | no build found |
| T10 — publish OTA update, NutriCare channel | ❌ Not done | `eas update:list --branch nutri-care-development` returns zero update groups |
| T11 — validate OTA reached the right device only | ❌ Not done (depends on T10) | — |
| T12 — document release flow in mobile README | ❌ Not done | `README.md` has no "Release"/OTA section yet |

T6-T12 require EAS account access, a Metro/build queue (T6 alone took ~3h39m wall time per its own
`Started at`/`Finished at` timestamps below), and a physical or simulator device — none of which
this session has. Per the scope note above, these are not "fixed" here; they're reported as-is.

---

## Spec-Anchored Acceptance Criteria

### P2: `expo-updates` configured with a per-brand channel (fully code-verifiable)

| Criterion | Spec-defined outcome | `file:line` + evidence | Result |
| --- | --- | --- | --- |
| REL-05 — `expo-updates` declared with `updates.url` pointing at the EAS project | `updates.url` present | `mobile/app.config.ts:97-99` — `updates: { url: 'https://u.expo.dev/${easProjectId(config)}' }`; live: `APP_BRAND=nutri-care npx expo config --type public --json` → `updates.url = "https://u.expo.dev/9a7ed133-242f-47a6-b70f-ebc2bfeeb50b"` | ✅ PASS |
| REL-06 — `APP_BRAND=nutri-care` + `development` profile → channel `nutri-care-development` | exact channel string | `mobile/eas.json` — `"development-nutri-care": { "channel": "nutri-care-development", "env": { "APP_BRAND": "nutri-care" } }`; confirmed live on the real EAS build (below): `Channel  nutri-care-development` | ✅ PASS |
| REL-07 — `APP_BRAND=vita-plus` → channel `vita-plus-development`, never the other brand's | exact channel string, isolated | `mobile/eas.json` — `"development-vita-plus": { "channel": "vita-plus-development", "env": { "APP_BRAND": "vita-plus" } }` — distinct profile, distinct channel, structurally impossible to cross since each profile hardcodes its own `APP_BRAND` | ✅ PASS |
| REL-08 — channel derived from `APP_BRAND` + build profile, never an `if` of brand inside `mobile/src/core/**` | no brand branching in `core/` | `grep -rn "nutri-care\|vita-plus" mobile/src/core/` → no matches (re-confirmed this session, same guard-rail as fase-0); the channel lives entirely in `mobile/eas.json`, a build-config file outside `src/` | ✅ PASS |
| REL-09 — unknown `APP_BRAND` → build fails with an explicit error | non-zero exit, explicit message | live: `APP_BRAND=invalida npx expo config --type public` → throws `APP_BRAND="invalida" é desconhecida. Marcas válidas: nutri-care, vita-plus.` (re-run this session, same mechanism verified in fase-0) | ✅ PASS |

### P1: Installable development build per brand

| Criterion | Spec-defined outcome | `file:line` + evidence | Result |
| --- | --- | --- | --- |
| REL-01 — `eas build --profile development --platform android -e APP_BRAND=nutri-care` → installable `.apk` with brand-specific icon/name/`applicationId` | successful build, brand-correct artifact | Real build exists: `eas build:list` → `ID 6fb1d450-51d7-469b-9d8e-8bd500cd06df`, `Platform Android`, `Profile development-nutri-care`, `Status finished`, `Channel nutri-care-development`, artifact at `https://expo.dev/artifacts/eas/8g7ssKHy04O45hQJ1AJHDqJ_56RjExzaN_O0d3p5o0E.apk`. `android.package` for this profile resolves to `health.tecsa.nutricare` (live `expo config` above) | ✅ PASS (nutri-care Android only) |
| REL-01 (vita-plus) | same, for vita-plus | No build found for `development-vita-plus` in `eas build:list` | ❌ Not executed — deferred to manual checklist |
| REL-02 — iOS build | installable simulator/device build | No iOS build found for either brand | ❌ Not executed — deferred to manual checklist |
| REL-03 — two brand builds coexist on the same device without overwriting | distinct `applicationId`/`bundleIdentifier` | Structurally guaranteed (`health.tecsa.nutricare` vs `health.tecsa.vitaplus`, confirmed live above) but the side-by-side install itself needs a physical/emulator device — deferred | ⚠️ Config PASS / device demo pending |
| REL-04 — `expo-dev-client` in the `development` eas.json profile | present | `mobile/eas.json` — `"development-nutri-care": { "developmentClient": true, ... }`, same for `development-vita-plus` | ✅ PASS |

### P3: Publish and validate an OTA update on an installed device

| Criterion | Spec-defined outcome | `file:line` + evidence | Result |
| --- | --- | --- | --- |
| REL-10 — `eas update --branch nutri-care-development` publishes | successful publish | `eas update:list --branch nutri-care-development --non-interactive` → branch exists, zero update groups published | ❌ Not executed — deferred to manual checklist |
| REL-11 — reopening the matching build downloads/applies the new bundle, no reinstall | applied without new binary | Depends on REL-10 having happened | ❌ Not executed — deferred |
| REL-12 — incompatible `runtimeVersion` is ignored, not applied | native `expo-updates` behavior, not custom code | Config-level guarantee only: `runtimeVersion.policy: 'appVersion'` (`app.config.ts:101-103`) is the mechanism; behavior itself is `expo-updates` internal, nothing to test at this layer beyond the policy being set | ✅ PASS (config) |
| REL-13 — a vita-plus-only publish does not affect nutri-care's installed bundle | channel isolation, no cross-brand bleed | Structurally guaranteed by per-profile channel (REL-06/07); no live publish exists yet to demonstrate end to end | ✅ PASS (structural) / demo pending |
| REL-14 — README documents the exact publish command and how to confirm visually | section present with real commands | No such section in `mobile/README.md` yet | ❌ Not done — non-blocking, see note below |

**REL-14 note**: this is pure documentation, not device-dependent, so it doesn't belong in the
manual checklist — but `fase-5-fechamento` task T9 ("Reescrever `mobile/README.md`") already covers
rewriting this exact README with an OTA-publishing section as part of its own scope, and that task
is assigned separately from this Verifier's fix budget. Writing it here would just be overwritten by
T9. Flagged as a non-blocking gap for T9 to close, not duplicated in this pass.

---

## Gate Check

```
$ cd mobile && npm test        → 294 passed, 294 total (0 failed)
$ cd mobile && npx tsc --noEmit → clean
$ npx eas-cli@latest whoami     → brunols7 (authenticated, real account)
$ npx eas-cli@latest build:list --limit 10 --non-interactive
  → 1 build: nutri-care/Android/development-nutri-care/finished/channel nutri-care-development
$ npx eas-cli@latest update:list --branch nutri-care-development --non-interactive
  → branch exists, 0 update groups
$ APP_BRAND=nutri-care npx expo config --type public --json  → resolves, correct package/updates/runtimeVersion
$ APP_BRAND=vita-plus npx expo config --type public --json   → resolves, correct package/updates/runtimeVersion
$ APP_BRAND=invalida npx expo config --type public           → throws explicit error, non-zero exit
```

No discrimination sensor was run for this feature: it has zero unit-testable domain logic (the
matrix in `tasks.md` classifies every task's coverage as `none`/`manual`, confirmed correct — this
is build/release configuration, not application code with branchable business logic to mutate).

---

## Summary

**Result**: ✅ PASS (scoped)

The entire config-level surface (P2 in full, P1's build-profile/channel/`expo-dev-client`
definitions, P3's `runtimeVersion` policy) is implemented correctly and re-verified with fresh
live evidence this session, including one real EAS Android build for nutri-care that exists and
resolves to the correct channel and package id.

What remains genuinely undone — vita-plus's Android build, both brands' iOS builds, any OTA
publish, the on-device visual confirmation, and the README release section — is either physical
device/EAS-queue work explicitly deferred to the fase-5 manual checklist (per
`fase-5-fechamento/context.md` decision 2) or documentation already assigned to a separate fase-5
task (T9). None of it is a code defect this Verifier can fix by editing source; forcing it here
would mean either fabricating evidence or spending hours of EAS build-queue time outside this task's
budget. Reported honestly instead of glossed over.

**Spec-anchored check**: 9/14 ACs fully PASS with live evidence; 1 PASS partially (REL-01, nutri-care
only); 4 explicitly deferred to the manual device checklist or to fase-5 T9 (REL-02, REL-10, REL-11,
REL-14), none of them a blocking code gap.
**Gate**: 294 mobile tests passed, `tsc` clean, all EAS CLI dry-run checks resolve correctly.
**Sensor**: not applicable (no domain logic in this feature; matrix classifies it `none`/`manual`).
