# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - Um registry cujo unico comportamento e lancar erro em id desconhecido precisa de teste unitario direto do caminho de erro; 'compile-time only' na matriz de cobertura nao cobre o throw.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `mobile` · harmful: 0
- features: fase-0-fundacao
- evidence: M2 mobile/src/brands/index.ts:19 (mobile)
- last seen: 2026-09-01T19:33:50Z

### L-002 - Um Provider de contexto so esta entregue quando montado na raiz da aplicacao; teste que instancia o Provider manualmente nao prova que o app real o monta.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `mobile` · harmful: 0
- features: fase-0-fundacao
- evidence: FNDMOB-11 mobile/src/app/_layout.tsx:10 (mobile)
- last seen: 2026-09-01T19:33:51Z

### L-003 - Padrao de no-restricted-imports com sufixo /* nao casa o import bare do diretorio; sempre inclua a forma sem sufixo no mesmo group.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `mobile` · harmful: 0
- features: fase-0-fundacao
- evidence: FNDMOB-01 mobile/eslint.config.js:18 (mobile)
- last seen: 2026-09-01T19:33:51Z

### L-004 - Quando um desvio duplica uma fonte de verdade, valide os valores duplicados contra o original na mesma task; a duplicacao aqui ja nasceu divergente.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `mobile` · harmful: 0
- features: fase-0-fundacao
- evidence: mobile/app.config.ts:33 (mobile)
- last seen: 2026-09-01T19:33:51Z

### L-005 - Script de fronteira deve varrer todos os diretorios citados na AC; um diretorio ainda vazio hoje vira violacao silenciosa na fase seguinte.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api` · harmful: 0
- features: fase-0-fundacao
- evidence: FNDBE-02 api/scripts/check-layer-boundary.sh:12 (api)
- last seen: 2026-09-01T19:33:51Z

### L-006 - When a spec requires a visible warning or message, assert that it renders in a state the wired app actually reaches, not just that the hook sets the value
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `mobile-ui` · harmful: 0
- features: fase-1-feature-flags-mobile
- evidence: mobile/src/core/ui/BiometricGateScreen.tsx:106 (FLAGSMOB-09, FLAGSMOB-10) (mobile-ui)
- last seen: 2026-09-01T23:19:22Z

### L-007 - When an AC describes a value replacing a previously stored one, seed the old value and assert the new one replaces it, rather than testing each half separately
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `mobile-query` · harmful: 0
- features: fase-1-feature-flags-mobile
- evidence: mobile/src/core/flags/__tests__/useFeatureFlagsQuery.test.tsx:60 (FLAGSMOB-05) (mobile-query)
- last seen: 2026-09-01T23:19:28Z

### L-008 - When an element is made to render independently of a state variable, assert it for every value of that state, not only the one the fix targeted
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `mobile-ui` · harmful: 0
- features: fase-1-feature-flags-mobile
- evidence: mobile/src/core/ui/BiometricGateScreen.tsx:114 (mutation 4, FLAGSMOB-09) (mobile-ui)
- last seen: 2026-09-01T23:29:47Z

### L-009 - When a spec's acceptance criterion specifies an exact sort order and tie-break column, assert the returned sequence directly against out-of-order and duplicate-key fixtures, not just pagination totals/uniqueness.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `backend/repository-pagination` · harmful: 0
- features: fase-2-carteira-pacientes-backend
- evidence: PATBE-01 (spec.md P1 AC1) / validation.md Spec-Anchored Acceptance Criteria (backend/repository-pagination)
- last seen: 2026-09-02T01:40:43Z

### L-010 - Every documented edge case in spec.md must have its own explicit test, even when the guarding code is a one-line conditional that looks obviously correct on read.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `backend/testing` · harmful: 0
- features: fase-2-carteira-pacientes-backend
- evidence: spec.md Edge Cases (search vazio) / validation.md Edge Cases (backend/testing)
- last seen: 2026-09-02T01:40:43Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
