# Fase 0 — Fundação Validation

**Date**: 2026-09-01
**Spec**: `.specs/features/fase-0-fundacao/spec.md`
**Diff range**: `1d1ae71` (root commit, `chore(api): scaffold laravel 11 project`) .. `0a35901` (HEAD,
`docs: add ADR 0001 for embedded HTTP server choice`) — 33 commits, toda a história do repositório
**Verifier**: independent sub-agent (author ≠ verifier)
**Verdict**: ❌ **FAIL** — 2 gaps bloqueantes, 1 mutante sobrevivente, 5 gaps menores

---

## Task Completion

Todas as 32 tasks estão marcadas `[x]` em `tasks.md`. Verificação independente por task:

| Task | Status | Notas |
| ---- | ------ | ----- |
| T1-T4 | ✅ Done | Laravel 11.31, `.env.example` completo, pastas de camada, Pint+PHPStan nível 6 limpos |
| T5 | ✅ Done | `api/scripts/check-layer-boundary.sh` + 3 testes; `composer pretest` encadeado |
| T6-T8 | ✅ Done | `FeatureFlagRepository` (Domain, sem `Illuminate\`), `EloquentFeatureFlagRepository`, binding registrado |
| T9-T13 | ✅ Done | 6 tabelas, índices compostos, seeders determinísticos, 4 testes |
| T14-T17 | ✅ Done (evidência indireta) | Dockerfile/entrypoint/compose corretos por inspeção; verificação ao vivo do T17 não foi re-executada nesta validação (registro em STATE.md aceito) |
| T18-T25 | ⚠️ Partial | Contrato de marca completo e correto, **mas** `BrandProvider` (core) importa `@/brands` — viola CLAUDE.md §2.1 (ver Gap 2) |
| T26-T27 | ⚠️ Partial | Guard-rail funciona, mas o padrão ESLint tem furo para import bare `@/brands` (ver Gap 2) |
| T28 | ✅ Done | `expo config --json` verificado nos 3 casos |
| T29-T30 | ⚠️ Partial | Tela renderiza e o teste distingue tokens, **mas** a tela não funciona no app real (ver Gap 1) |
| T31 | ⚠️ Partial | README tem "Como rodar", mas o comando de verificação aponta para endpoint inexistente (Gap 5) |
| T32 | ✅ Done | `docs/adr/0001-servidor-http-embutido.md` com Contexto/Decisão/Consequências e alternativa rejeitada |

---

## Spec-Anchored Acceptance Criteria

### P1: Configuração 100% via ambiente

| Criterion | Spec-defined outcome | `file:line` + evidência | Result |
| --- | --- | --- | --- |
| FNDENV-01 `api/.env.example` versionado com todas as vars, sem valor real | `APP_KEY=`, `DB_*`, `ANTHROPIC_API_KEY=` com placeholder | `api/.env.example:3` (`APP_KEY=`), `:24-29` (`DB_*`), `:39` (`ANTHROPIC_API_KEY=` vazio) | ✅ PASS |
| FNDENV-02 `mobile/.env.example` versionado com placeholder | `EXPO_PUBLIC_API_URL` com placeholder | `mobile/.env.example:8` (`EXPO_PUBLIC_API_URL=`) | ✅ PASS |
| FNDENV-03 `.gitignore` da **raiz** ignora `api/.env` e `mobile/.env` | ignorados, `.env.example` versionados | `api/.gitignore:9`, `mobile/.gitignore:34` — `git check-ignore -v` confirma ambos. **Desvio**: implementado por `.gitignore` de cada projeto, não pelo da raiz (o `.gitignore` da raiz sequer está versionado). Intenção satisfeita | ⚠️ Desvio aceitável |
| FNDENV-04 nenhum literal de URL/porta/credencial em `api/app/**` ou `mobile/src/**` | grep vazio | `grep -rEn "postgres://\|sk-ant-\|sk-proj-\|localhost:9000" api/app/ mobile/src/` → 0 matches (exit 1) | ✅ PASS |
| FNDENV-05 `docker-compose.yml` usa `env_file: api/.env`, sem credencial inline | nenhuma credencial no YAML | `docker-compose.yml:4-5` e `:20-21` (`env_file: api/.env`); nenhuma chave `environment:` no arquivo | ✅ PASS |
| FNDENV-06 `app.config.ts` lê `APP_BRAND`/`EXPO_PUBLIC_API_URL` de `process.env` | default `nutri-care`, sem string fixa de localhost | `mobile/app.config.ts:44` (`process.env.APP_BRAND ?? DEFAULT_BRAND_ID`), `:60` (`process.env.EXPO_PUBLIC_API_URL ?? ''`) | ✅ PASS |

### P1: Guard-rail de fronteira de marca no mobile

| Criterion | Spec-defined outcome | `file:line` + evidência | Result |
| --- | --- | --- | --- |
| FNDMOB-01 import de `**/brands/*` ou `@/brands/*` em `core/` → erro ESLint com a mensagem exata | erro (não warning), mensagem "core/ não pode conhecer marca. Use useTheme() ou useFlag()." | `mobile/eslint.config.js:9-25`; teste `mobile/scripts/__tests__/checkBrandBoundary.test.ts:40-55` — `expect(result.status).not.toBe(0)` + `toContain('no-restricted-imports')`. Sensor M1 confirmou a mensagem literal. **Furo**: o padrão `@/brands/*` **não** casa o import bare `@/brands`, que é exatamente o que `core/theme/BrandProvider.tsx:3` faz — ver Gap 2 | ❌ GAP parcial |
| FNDMOB-02 script de grep sai ≠0 e imprime arquivo/linha ao achar nome de marca | exit ≠0, arquivo e linha impressos | `mobile/scripts/check-brand-boundary.sh:12-15` (`grep -rniE` imprime arquivo:linha antes do `exit 1`); teste `checkBrandBoundary.test.ts:57-69` | ✅ PASS |
| FNDMOB-03 sem violação → ESLint e script saem 0 | exit 0 nos dois | `checkBrandBoundary.test.ts:32-38` — `expect(lintResult.status).toBe(0)` e `expect(boundaryResult.status).toBe(0)`; executado ao vivo: `npm test` → 4/4 pass | ✅ PASS |
| FNDMOB-04 `npm test`/`pretest` executa o script | pipeline cobre sem comando extra | `mobile/package.json:47` — `"pretest": "npm run lint && bash scripts/check-brand-boundary.sh"`; execução ao vivo mostra o pretest rodando antes do jest | ✅ PASS |

### P1: Contrato de marca (`Brand` type) e duas marcas

| Criterion | Spec-defined outcome | `file:line` + evidência | Result |
| --- | --- | --- | --- |
| FNDMOB-05 tipo `Brand` com as 11 chaves semânticas + typography/radii/spacing/assets/copy | 11 chaves exatas de CLAUDE.md §5.2 | `mobile/src/core/theme/brand.types.ts:23-35` (11 chaves: background, surface, surfaceMuted, textPrimary, textSecondary, accent, accentContrast, success, warning, danger, border), `:36-67` | ✅ PASS |
| FNDMOB-06 as duas marcas satisfazem `Brand` sem campo faltando | `tsc --noEmit` limpo | `mobile/src/brands/nutri-care/index.ts:7-20`, `mobile/src/brands/vita-plus/index.ts:7-20` (anotados `: Brand`); `npx tsc --noEmit` → exit 0 | ✅ PASS |
| FNDMOB-07 campo novo não preenchido → `tsc` falha | erro de tipo apontando a marca | Garantido estruturalmente pela anotação `: Brand` (sem `satisfies` parcial nem `Partial<>`) — `src/brands/*/index.ts:7` | ✅ PASS (compile-time) |
| FNDMOB-08 `colors.accent`, `radii.md` e `typography.fontFamily.regular` diferem entre as marcas | os três diferentes | `nutri-care/theme.ts:18` `#0F6E63` vs `vita-plus/theme.ts:18` `#F2734A`; `:42` `md: 8` vs `md: 18`; `:27` `Inter_500Medium` vs `Nunito_400Regular`. Teste: `src/app/__tests__/index.test.tsx:48,51` — `not.toBe`. **Nota**: o teste cobre accent e radii; `fontFamily.regular` não é assertado (spec-precision gap menor) | ⚠️ PASS parcial |
| FNDMOB-09 `brands/index.ts` é o único arquivo fora de `brands/**` que importa as marcas | import único | `mobile/src/brands/index.ts:3-4`; `grep -rn "nutri-care\|vita-plus" src/` fora de `brands/` só acha `app.config.ts` (ids como string, não import) e testes | ✅ PASS |

### P1: Seleção de marca (`APP_BRAND`) e tela de prova

| Criterion | Spec-defined outcome | `file:line` + evidência | Result |
| --- | --- | --- | --- |
| FNDMOB-10 sem `APP_BRAND` → default `nutri-care` | `extra.brandId === "nutri-care"` | `mobile/app.config.ts:43-44`; verificado ao vivo: `npx expo config --json` → `nutri-care \| NutriCare \| nutri-care \| health.tecsa.nutricare` | ✅ PASS |
| FNDMOB-11 `APP_BRAND=vita-plus` → nome, bundle id **e `BrandProvider` em runtime** refletem `vita-plus` | os três | `app.config.ts:22-36` + verificado ao vivo (`vita-plus \| VitaPlus \| vita-plus \| health.tecsa.vitaplus`). **`BrandProvider` em runtime: NÃO satisfeito** — nenhum arquivo monta `BrandProvider` fora do teste, e `Constants.expoConfig.extra.brandId` nunca é lido em runtime (`grep -rn "BrandProvider\|expoConfig" src/` → só `BrandProvider.tsx`, `useTheme.ts` e o teste) | ❌ GAP (Gap 1) |
| FNDMOB-12 `app/index.tsx` renderiza logo, displayName, bloco `colors.accent`, texto `fontFamily.regular`, sem literal | zero literal fora de `transparent` | `mobile/src/app/index.tsx:18-22` (logo), `:23-31` (displayName), `:34-41` (accent + radii.md), `:53-61` (fontFamily.regular); `grep -nE "#[0-9a-fA-F]{3,6}" src/app/index.tsx` → 0 matches. **Desvio de caminho**: rota em `src/app/`, não `app/` — aceitável (o template Expo converge para `src/`) | ⚠️ PASS com desvio |
| FNDMOB-13 capturas nas duas marcas diferem em accent, raio e fonte | diferença visual real | `src/app/__tests__/index.test.tsx:46-51` prova a diferença **em teste**. A verificação visual real (`expo start` nas duas marcas) é impossível hoje: a tela lança `useTheme() foi chamado fora de um BrandProvider.` no app real — ver Gap 1 | ❌ GAP (Gap 1) |

### P1: Guard-rail de fronteira de camada no backend

| Criterion | Spec-defined outcome | `file:line` + evidência | Result |
| --- | --- | --- | --- |
| FNDBE-01 `Illuminate\` em `Domain/` → exit ≠0 identificando o arquivo | exit 1 | `api/scripts/check-layer-boundary.sh:9-10`; teste `api/tests/Feature/LayerBoundaryScriptTest.php:34-46` — `assertScriptExitCode(1)`. Sensor M3 matou o mutante via `composer test`. **Nota**: o script usa `grep -rq` (quiet) — ele imprime "Domain conhece Laravel" mas **não** o nome do arquivo, ao contrário do "identificando o arquivo" da spec | ⚠️ Spec-precision gap |
| FNDBE-02 `DB::`/`Models\` em `Application/` ou `Http/Controllers/` → exit ≠0 | exit 1 | `check-layer-boundary.sh:12-13`; `LayerBoundaryScriptTest.php:48-60`. **Nota**: o script só cobre `Application/`, não `Http/Controllers/`, para `DB::`/`Models\` — a AC pede os dois diretórios | ❌ GAP parcial (Gap 7) |
| FNDBE-03 `$request->all()` em controller → exit ≠0 | exit 1 | `check-layer-boundary.sh:15-16`; `LayerBoundaryScriptTest.php:62-74` | ✅ PASS |
| FNDBE-04 nenhuma violação → exit 0 | exit 0 | `check-layer-boundary.sh:18`; `LayerBoundaryScriptTest.php:36,45,50,59,64,73` (`assertScriptExitCode(0)`); `composer test` ao vivo passa | ✅ PASS |
| FNDBE-05 `composer.json` registra `pretest` antes de `php artisan test` | `composer test` cobre | `api/composer.json` scripts `pretest`/`test`; sensor M3 confirmou o abort do `composer test` no pretest | ✅ PASS |

### P1: Skeleton Laravel com camadas e DI

| Criterion | Spec-defined outcome | `file:line` + evidência | Result |
| --- | --- | --- | --- |
| FNDBE-06 pastas de CLAUDE.md §4 existem | todas | `api/app/{Domain,Application,Infrastructure/Persistence/Eloquent/Models,Infrastructure/Llm,Http/{Controllers/Api/V1,Requests,Resources,Middleware}}` — todas presentes (`.gitkeep` nas vazias) | ✅ PASS |
| FNDBE-07 interface `FeatureFlagRepository` sem sufixo `Interface` | interface pura | `api/app/Domain/FeatureFlag/FeatureFlagRepository.php:7-10`; entidade `FeatureFlag.php:7-13` (`readonly`) | ✅ PASS |
| FNDBE-08 `EloquentFeatureFlagRepository` implementa a interface via Model interno | devolve entidade de domínio | `api/app/Infrastructure/Persistence/Eloquent/EloquentFeatureFlagRepository.php:11-29` — retorna `new FeatureFlag(...)`, nunca o Model. Teste: `api/tests/Feature/FeatureFlagRepositoryTest.php` (sensor M6 matou a inversão de `enabled`) | ✅ PASS |
| FNDBE-09 `DomainServiceProvider` binda e está registrado | container resolve a concreta | `api/app/Providers/DomainServiceProvider.php:13-16`; `api/bootstrap/providers.php:8`; teste `api/tests/Unit/DomainServiceProviderTest.php` (sensor M8 matou a remoção do binding) | ✅ PASS |
| FNDBE-10 `Domain/` sem `use Illuminate\` | zero ocorrências | `grep -c Illuminate api/app/Domain/FeatureFlag/*.php` → 0; guard-rail cobre mecanicamente | ✅ PASS |

### P1: Migrations e seeder determinístico

| Criterion | Spec-defined outcome | `file:line` + evidência | Result |
| --- | --- | --- | --- |
| FNDBE-11 6 tabelas com colunas de §7 + índices `patients(brand_id,name)` e `biomarkers(patient_id,measured_at)` | ambos os índices | `0000_12_31_000001_create_patients_table.php:22` (`index(['brand_id','name'])`), `0000_12_31_000002_create_biomarkers_table.php:24` (`index(['patient_id','measured_at'])`), `..._brands:14-18`, `..._ai_actions:14-26`, `..._feature_flags:14-22`, `0001_01_01_000000_create_users_table.php:16-21` | ✅ PASS |
| FNDBE-12 sem coluna `status` derivada em `biomarkers` | coluna ausente | `0000_12_31_000002_create_biomarkers_table.php:14-26` — não há `status` | ✅ PASS |
| FNDBE-13 seed com Faker fixo → ≥5000 patients distribuídos entre as 2 marcas, ≥1 biomarker cada | contagem e distribuição | `database/seeders/PatientSeeder.php:15` (`DEFAULT_COUNT = 5000`), `:22` (`FAKER_SEED = 42`), `:37` (round-robin entre marcas), `:41-51` (1-3 biomarcadores). Teste: `tests/Feature/PatientSeederTest.php:28-42` — `assertCount(2, $counts)` + `assertGreaterThan(0, ...)` por slug. Sensor M5 matou a quebra da distribuição. **≥5000 real** validado só manualmente (T17, STATE.md), não em teste automatizado — declarado na Test Coverage Matrix | ⚠️ PASS com nota |
| FNDBE-14 duas execuções a partir de banco limpo → mesma contagem | contagem idêntica | `PatientSeederTest.php:44-61` — `assertSame($firstPatientCount, $secondPatientCount)` e o mesmo para biomarkers | ✅ PASS |
| FNDBE-15 fração não nula fora de `[ref_min, ref_max]` | ≥1 fora da faixa | `PatientSeeder.php:24` (`OUT_OF_RANGE_CHANCE = 15`), `:46-48`; teste `PatientSeederTest.php:63-73` — `assertTrue($outOfRange)`. Sensor M5b matou `CHANCE = 0` | ✅ PASS |

### P1: Docker Compose de ponta a ponta

| Criterion | Spec-defined outcome | `file:line` + evidência | Result |
| --- | --- | --- | --- |
| FNDBE-16 `composer install` se `vendor/` ausente | roda antes do servidor | `api/docker/entrypoint.sh:10-12` | ✅ PASS |
| FNDBE-17 `key:generate` se `APP_KEY` vazia | antes dos passos que dependem de cripto | `api/docker/entrypoint.sh:14-17` | ✅ PASS |
| FNDBE-18 `depends_on: condition: service_healthy` | api espera db | `docker-compose.yml:23-25` + healthcheck em `:12-16` | ✅ PASS |
| FNDBE-19 `migrate --force` e `db:seed --force` só se vazio | seed condicional | `api/docker/entrypoint.sh:25` (migrate), `:27-30` (seed só se `Patient::count()` = 0) — cobre também o edge case de idempotência | ✅ PASS |
| FNDBE-20 `GET http://localhost:9000/up` → 200 sem intervenção manual | health check 200 | `api/bootstrap/app.php:11` (`health: '/up'`), `entrypoint.sh:32` (`serve --port ${APP_PORT:-9000}`), `docker-compose.yml:22` (`"9000:9000"`). Verificação ao vivo registrada em STATE.md (T17); **não re-executada nesta validação** | ⚠️ Evidência indireta |
| FNDBE-21 Postgres em `5433:5432` | mapeamento correto | `docker-compose.yml:7-8` | ✅ PASS |

### P2: Pint e PHPStan

| Criterion | Spec-defined outcome | Evidência | Result |
| --- | --- | --- | --- |
| FNDBE-22 `phpstan.neon` nível ≥6 | `level: 6` | `api/phpstan.neon:11` (`level: 6`) | ✅ PASS |
| FNDBE-23 `phpstan analyse` exit 0 | limpo | Execução ao vivo: `[OK] No errors`, exit 0 | ✅ PASS |
| FNDBE-24 `pint --test` exit 0 | limpo | Execução ao vivo: `{"tool":"pint","result":"passed"}`, exit 0 | ✅ PASS |

### P3: README e ADR

| Criterion | Spec-defined outcome | Evidência | Result |
| --- | --- | --- | --- |
| FNDDOC-01 README com "Como rodar" cobrindo compose, `APP_BRAND=... npx expo start` e a cópia dos `.env.example` | passo a passo completo e correto | `README.md:8-95` — cobre tudo. **Bug**: `README.md:48` manda confirmar com `curl http://localhost:9000/api/v1/feature-flags`, endpoint que não existe na Fase 0 (é Fase 1, out of scope); a spec define `/up` | ⚠️ GAP menor (Gap 5) |
| FNDDOC-02 ADR 0001 com trade-off e alternativa rejeitada | Contexto/Decisão/Consequências + nginx+php-fpm citado | `docs/adr/0001-servidor-http-embutido.md:1-40` | ✅ PASS |

**Status**: ❌ Gaps presentes — 2 bloqueantes (FNDMOB-01 parcial, FNDMOB-11/13), 1 gap parcial de AC
(FNDBE-02), 3 spec-precision gaps sinalizados.

---

## Edge Cases

- [x] `docker compose up` segunda vez não re-roda `db:seed` — `api/docker/entrypoint.sh:27-30`
- [x] `APP_BRAND` inválido falha o build com mensagem clara — verificado ao vivo:
      `APP_BRAND=marca-invalida npx expo config` → `APP_BRAND="marca-invalida" é desconhecida. Marcas
      válidas: nutri-care, vita-plus.` (`app.config.ts:46-50`). **Sem teste automatizado** (Gap 3)
- [x] Nome de marca em comentário dentro de `core/` conta como violação — `checkBrandBoundary.test.ts:57-69`;
      sensor M1b confirmou (`npm test` exit 1)
- [x] Seeder com `brands` já existente não duplica — `BrandSeeder.php:23-26` (`updateOrCreate` por slug)
- [x] `.env` ausente no primeiro boot → entrypoint copia de `.env.example` — `entrypoint.sh:6-8`;
      no mobile, README instrui a cópia (`README.md:22-23`)
- [x] Nenhum segredo commitado — `git log -p | grep -iE "sk-ant|sk-proj|password.*=.*[a-z0-9]{8}"`
      só retorna `env('DB_PASSWORD','')`-style defaults do Laravel; `git log --all --name-only` não
      contém `api/.env`, `mobile/.env` nem `api/.env.testing`

---

## Discrimination Sensor

Scratch isolado: `git worktree add <scratch> HEAD` (com `vendor/` copiado e `composer dump-autoload`
re-executado no scratch — o symlink inicial fazia o autoloader resolver para o repo real e invalidava
os primeiros mutantes de PHP; refeito). Nenhuma mutação tocou a worktree real.

| # | Mutação | File:line | Descrição | Killed? |
| - | ------- | --------- | --------- | ------- |
| M1 | import de marca em `core/` | `mobile/src/core/ui/leak.ts` (fixture) | `import { nutriCareBrand } from '@/brands/nutri-care'` | ✅ Killed (`npm test` exit 1, ESLint `no-restricted-imports` com a mensagem exata) |
| M1b | nome de marca só em comentário em `core/` | `mobile/src/core/ui/leak2.ts` (fixture) | `// TODO: cor da vita-plus` | ✅ Killed (script exit 1, `npm test` exit 1) |
| M2 | `resolveBrand` não lança em id desconhecido | `mobile/src/brands/index.ts:19-21` | `throw new Error(...)` → `return nutriCareBrand` | ❌ **SURVIVED** (`npm test` exit 0) |
| M3 | `Illuminate\` em `Domain/` | `api/app/Domain/FeatureFlag/FeatureFlag.php:7` | `use Illuminate\Support\Str;` | ✅ Killed (`composer test` aborta no pretest: "Domain conhece Laravel", exit 1) |
| M4 | vita-plus copia accent + `radii.md` de nutri-care | `mobile/src/brands/vita-plus/theme.ts:18,42` | `accent: '#0F6E63'`, `md: 8` | ✅ Killed (`jest src/app` 1 failed) |
| M5 | seeder manda todos os pacientes para uma marca só | `api/database/seeders/PatientSeeder.php:37` | `$brandIds[$i % count(...)]` → `$brandIds[0]` | ✅ Killed (`test_distributes_patients_between_the_two_brands` FAILED) |
| M5b | seeder nunca gera valor fora de faixa | `api/database/seeders/PatientSeeder.php:24` | `OUT_OF_RANGE_CHANCE = 15` → `0` | ✅ Killed (`test_generates_at_least_one_biomarker_out_of_its_reference_range` FAILED) |
| M6 | repository inverte `enabled` | `api/app/Infrastructure/Persistence/Eloquent/EloquentFeatureFlagRepository.php:26` | `enabled: $model->enabled` → `! $model->enabled` | ✅ Killed (`FeatureFlagRepositoryTest` FAILED) |
| M7 | guard-rail de camada neutralizado | `api/scripts/check-layer-boundary.sh:9` | `grep "Illuminate\\"` → `"IlluminateXX\\"` | ✅ Killed (`LayerBoundaryScriptTest` FAILED) |
| M8 | binding do `DomainServiceProvider` removido | `api/app/Providers/DomainServiceProvider.php:15` | linha `bind(...)` apagada | ✅ Killed (`DomainServiceProviderTest` → `BindingResolutionException`) |
| M9 | guard-rail de marca neutralizado | `mobile/scripts/check-brand-boundary.sh:12` | padrão do grep alterado | ✅ Killed (`jest scripts` 1 failed) |
| M10 | regra ESLint de fronteira removida | `mobile/eslint.config.js:39` | `brandBoundaryConfig` retirado do array | ✅ Killed (`jest scripts` 1 failed) |

**Sensor depth**: P0-full (12 mutações, cobrindo os dois guard-rails, o contrato de marca, a inversão
de dependência e o seeder — todos caminhos críticos da fundação)
**Result**: 11/12 killed — ❌ **FAIL** (M2 sobreviveu → fix task 3)

**Isolamento**: `git status --porcelain` da worktree real antes e depois do sensor é byte-idêntico
(7 entradas `??`, sem alterações). Scratch removido com `git worktree remove --force` + `prune`;
Postgres efêmero de teste (`tecsa-verify-pg`, porta 5434) parado e removido.

---

## Gate Check

| Gate | Comando | Resultado |
| ---- | ------- | --------- |
| Full (backend) | `composer test` (pretest → `php artisan test`) | ✅ 10 testes, 23 assertions, 0 failed (as 9 marcas `DEPR` são deprecations do PHP 8.5 no `config/database.php` do Laravel, não falhas) |
| Backend estilo | `vendor/bin/pint --test` | ✅ exit 0 (`{"tool":"pint","result":"passed"}`) |
| Backend tipos | `vendor/bin/phpstan analyse` (nível 6) | ✅ exit 0 (`[OK] No errors`) |
| Full (mobile) | `npm test` (pretest: lint + guard-rail → jest) | ✅ 2 suites, 4 testes, 0 failed |
| Mobile tipos | `npx tsc --noEmit` | ✅ exit 0 |
| Mobile lint | `npm run lint` | ✅ exit 0 |
| Fronteira §11.1 | `bash mobile/scripts/check-brand-boundary.sh` | ✅ exit 0 |
| Fronteira §11.2 | `bash api/scripts/check-layer-boundary.sh` | ✅ exit 0 |
| Fronteira §14.5 | `grep -riE "nutri-care\|vita-plus" mobile/src/core/` | ✅ 0 matches |
| Build (Docker e2e) | `docker compose up` + `curl -f localhost:9000/up` | ⚠️ Não re-executado nesta validação — evidência aceita de STATE.md/T17 |

- **Test count antes da feature**: 0 (repositório greenfield)
- **Test count depois**: 14 (backend 10 — incl. 2 do template Laravel; mobile 4)
- **Delta**: +14
- **Skipped**: nenhum
- **Nota de integridade**: STATE.md registra "14 passed" para o backend; a contagem real do backend é
  **10**. Sem impacto funcional, mas o registro está incorreto.

---

## Code Quality

| Princípio | Status |
| --------- | ------ |
| Minimum code | ⚠️ — restos do template Expo (`src/app/explore.tsx`, `src/components/**`, `src/constants/theme.ts`, `src/hooks/use-theme.ts`) permanecem no projeto com cores literais e um segundo sistema de tema/`useTheme` concorrente |
| Surgical changes | ✅ |
| No scope creep | ✅ |
| Matches patterns | ✅ (PSR-12/Pint; kebab-case + named exports no mobile, exceto onde o expo-router exige default) |
| Spec-anchored outcome check | ⚠️ — 3 spec-precision gaps sinalizados (FNDBE-01 "identificando o arquivo", FNDMOB-08 `fontFamily` não assertado, FNDBE-13 ≥5000 só manual) |
| Per-layer Coverage Expectation | ⚠️ — `resolveBrand` (única lógica de runtime do registry) não tem teste; a matriz o classificou como "none (compile-time)", o que subestimou o caminho de erro |
| Every test maps to a spec requirement | ✅ (exceto os 2 `ExampleTest` do scaffold Laravel) |
| Guidelines seguidas | ⚠️ — `CLAUDE.md` §2.1 violado por `src/core/theme/BrandProvider.tsx:3` (ver Gap 2) |

---

## Fix Plans

### Fix 1 (Blocker): `BrandProvider` nunca é montado no app real

- **Root cause**: `mobile/src/app/_layout.tsx:10-18` renderiza o layout do template (`ThemeProvider` +
  `AppTabs`) e nunca envolve a árvore com `BrandProvider`; `Constants.expoConfig.extra.brandId` (que
  `app.config.ts:104` injeta corretamente) não é lido em lugar nenhum em runtime. Consequência: abrir a
  rota `index` com `expo start` lança `useTheme() foi chamado fora de um BrandProvider.` — FNDMOB-11
  ("BrandProvider em runtime refletindo `vita-plus`") e FNDMOB-13 (comparação visual entre marcas) não
  são satisfeitos, e o critério de saída da fase ("`npx expo start` roda com as duas marcas") não é
  demonstrável.
- **Fix task**: em `src/app/_layout.tsx`, ler `Constants.expoConfig?.extra?.brandId` e envolver a
  árvore com `<BrandProvider brandId={...}>`. Verificar com `APP_BRAND=vita-plus npx expo start` +
  `APP_BRAND=nutri-care npx expo start` (screenshots lado a lado, per Independent Test da história) e
  adicionar um teste que renderiza `_layout` e confirma que a marca vem do `extra.brandId`.
- **Priority**: Blocker

### Fix 2 (Blocker): `core/theme/BrandProvider.tsx` importa `@/brands` e o guard-rail não pega

- **Root cause**: `mobile/src/core/theme/BrandProvider.tsx:3` faz `import { resolveBrand } from
  '@/brands'` — um arquivo de `src/core/**` importando de `brands/`, o que CLAUDE.md §2.1 declara
  regra inviolável ("Nenhum arquivo em `mobile/src/core/**` pode importar de `mobile/src/brands/**`").
  O padrão ESLint `group: ['**/brands/*', '@/brands/*']` (`eslint.config.js:18`) casa
  `@/brands/nutri-care` mas **não** o import bare `@/brands`, por isso `npm run lint` passa. O
  guard-rail de grep também não pega (o caminho não contém o slug de nenhuma marca). O `design.md`
  (linha 136) posicionou `BrandProvider` dentro de `core/`, então o desvio nasceu no design — mas
  CLAUDE.md tem precedência ("Regra zero").
- **Fix task**: (a) ampliar o padrão para `['**/brands', '**/brands/*', '@/brands', '@/brands/*']`;
  (b) mover a resolução da marca para fora de `core/` — o `BrandProvider` do core deve receber um
  objeto `Brand` já resolvido via prop, e `resolveBrand` ser chamado só na raiz (`src/app/_layout.tsx`,
  o único lugar autorizado a conhecer `brands/`, per CLAUDE.md §5.1). Casa naturalmente com o Fix 1.
  (c) adicionar um caso ao `checkBrandBoundary.test.ts` cobrindo o import bare `@/brands`.
- **Priority**: Blocker

### Fix 3 (Major): mutante sobrevivente — `resolveBrand` sem teste do caminho de erro

- **Root cause**: não existe teste unitário de `mobile/src/brands/index.ts:16-24`. Trocar o `throw`
  por um fallback silencioso mantém `npm test` verde (sensor M2). É justamente o mecanismo que o
  `design.md` (linha 235) e o edge case do spec ("APP_BRAND inexistente → mensagem clara, não queda
  silenciosa numa marca default") elegeram como mitigação.
- **Fix task**: `mobile/src/brands/__tests__/index.test.ts` — assertar
  `expect(resolveBrand('nutri-care')).toBe(nutriCareBrand)`, idem `vita-plus`, e
  `expect(() => resolveBrand('inexistente')).toThrow('Marca desconhecida: inexistente')`. Idealmente
  cobrir também o `throw` equivalente em `app.config.ts:46-50`.
- **Priority**: Major

### Fix 4 (Major): descritor de marca duplicado em `app.config.ts` já divergiu

- **Root cause**: o desvio documentado (`app.config.ts` não importa `resolveBrand`, mantendo um
  descritor auto-contido) é tecnicamente justificado — o Expo CLI avalia o arquivo fora do Metro —
  mas criou duas fontes de verdade, e elas **já divergiram**: `app.config.ts:33`
  (`vita-plus.splashBackgroundColor = '#0B1210'`, preto quase puro) contradiz a identidade
  "areia claro" de `src/brands/vita-plus/theme.ts:13` (`background: '#FBF3E9'`) e cai exatamente num
  dos dois defaults genéricos que CLAUDE.md §5.2 manda evitar; e `app.config.ts:26`
  (`nutri-care.splashBackgroundColor = '#FBF6EE'`, creme) contradiz o "neutro frio" de
  `nutri-care/theme.ts:13` (`#F2F5F7`).
- **Fix task**: alinhar os dois `splashBackgroundColor` aos `colors.background` das respectivas
  marcas e, se possível, extrair os tokens de build para um módulo `.js`/JSON compartilhado que tanto
  `app.config.ts` quanto `src/brands/*` consumam, eliminando a duplicação. Registrar o desvio
  remanescente como ADR se a duplicação for mantida.
- **Priority**: Major

### Fix 5 (Minor): README aponta para endpoint inexistente

- **Root cause**: `README.md:48` instrui `curl http://localhost:9000/api/v1/feature-flags`, endpoint
  de Fase 1 explicitamente fora do escopo desta fase (`routes/api.php` sequer existe). A spec define
  a verificação como `curl -f http://localhost:9000/up`.
- **Fix task**: trocar o comando por `curl -f http://localhost:9000/up`.
- **Priority**: Minor

### Fix 6 (Minor): `check-layer-boundary.sh` não cobre `DB::`/`Models\` em `Http/Controllers/`

- **Root cause**: `api/scripts/check-layer-boundary.sh:12-13` roda o grep de `DB::|Models\` só sobre
  `$BASE_DIR/Application/`. A AC FNDBE-02 e CLAUDE.md §6.1 pedem também `app/Http/Controllers/`.
  Também faltam os termos `Eloquent` e `->query()` citados em CLAUDE.md §11.2. Hoje o gap é latente
  (não há controller ainda), mas vira violação silenciosa assim que a Fase 1 criar o primeiro.
- **Fix task**: incluir `Http/Controllers/` no mesmo grep (ou um segundo grep) e adicionar um caso ao
  `LayerBoundaryScriptTest` com `DB::` dentro de `Http/Controllers/`.
- **Priority**: Minor

### Fix 7 (Minor): restos do template Expo com sistema de tema concorrente

- **Root cause**: `src/app/explore.tsx`, `src/components/**`, `src/constants/theme.ts` e
  `src/hooks/use-theme.ts` vieram do scaffold e continuam no projeto. `src/hooks/use-theme.ts` expõe
  um segundo `useTheme` (colisão de nome com o do contrato de marca) e `src/constants/theme.ts` traz
  cores literais — o exato "sistema de tema concorrente" que CLAUDE.md §3 quer evitar.
- **Fix task**: remover a rota `explore`, os componentes de demo e o `useTheme` do template, ou
  isolá-los explicitamente até serem substituídos na Fase 2.
- **Priority**: Minor

### Fix 8 (Informational): registros desatualizados

- `.specs/STATE.md` afirma "Total de testes backend até aqui: 14"; a contagem real é 10.
- `.specs/STATE.md` ("In-progress"/"Next step") ainda descreve o Batch 3 como não disparado, embora os
  Batches 3 e 4 estejam completos e commitados.
- FNDENV-03 pede o `.gitignore` **da raiz**; a implementação usa os `.gitignore` de cada projeto
  (`api/.gitignore:9`, `mobile/.gitignore:34`). A intenção é satisfeita (`git check-ignore` confirma),
  mas vale registrar o desvio no spec ou consolidar na raiz.
- **Priority**: Informational

---

## Requirement Traceability Update

| Requirement | Previous | New |
| ----------- | -------- | --- |
| FNDENV-01, -02, -04, -05, -06 | Implementing | ✅ Verified |
| FNDENV-03 | Implementing | ⚠️ Verified com desvio (per-projeto em vez de raiz) |
| FNDMOB-01 | Implementing | ❌ Needs Fix (furo do padrão `@/brands` bare) |
| FNDMOB-02, -03, -04 | Implementing | ✅ Verified |
| FNDMOB-05, -06, -07, -09 | Implementing | ✅ Verified |
| FNDMOB-08 | Implementing | ⚠️ Verified parcial (`fontFamily.regular` não assertado) |
| FNDMOB-10 | Implementing | ✅ Verified |
| FNDMOB-11 | Implementing | ❌ Needs Fix (BrandProvider não montado em runtime) |
| FNDMOB-12 | Implementing | ⚠️ Verified com desvio de caminho (`src/app/`) |
| FNDMOB-13 | Implementing | ❌ Needs Fix (verificação visual impossível hoje) |
| FNDBE-01 | Implementing | ⚠️ Spec-precision gap (não imprime o arquivo) |
| FNDBE-02 | Implementing | ❌ Needs Fix (`Http/Controllers/` fora do grep) |
| FNDBE-03, -04, -05 | Implementing | ✅ Verified |
| FNDBE-06 .. -12, -14, -15 | Implementing | ✅ Verified |
| FNDBE-13 | Implementing | ⚠️ Verified (≥5000 só por verificação manual) |
| FNDBE-16 .. -19, -21 | Implementing | ✅ Verified |
| FNDBE-20 | Implementing | ⚠️ Evidência indireta (T17 em STATE.md, não re-executado) |
| FNDBE-22, -23, -24 | Implementing | ✅ Verified |
| FNDDOC-01 | Implementing | ⚠️ Needs Fix menor (comando de verificação errado) |
| FNDDOC-02 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ❌ Not Ready

**Spec-anchored check**: 33/43 ACs plenamente casados com o resultado definido na spec; 4 ❌ GAP,
6 ⚠️ (desvio aceitável ou spec-precision gap)
**Sensor**: 11/12 mutantes mortos (M2 sobreviveu)
**Gate**: backend 10/10, mobile 4/4, Pint/PHPStan/tsc/lint/guard-rails todos exit 0

**O que funciona**: o guard-rail de camada backend e o de marca mobile são reais e discriminantes
(6 mutantes contra eles, todos mortos); a inversão de dependência do Laravel está correta e testada;
migrations, factories e seeders determinísticos passam com distribuição, determinismo e casos fora de
faixa verificados; o tipo `Brand` e as duas marcas são completos, distintos e checados em
compile-time e em teste; `APP_BRAND` funciona nos três casos (default, marca válida, marca inválida);
Pint, PHPStan nível 6, `tsc --noEmit` e ESLint todos limpos; nenhum segredo no histórico.

**Problemas encontrados**: (1) o `BrandProvider` nunca é montado no app real, então a tela de prova —
o entregável que demonstra a fase inteira — quebra em runtime; (2) o próprio `BrandProvider` mora em
`core/` e importa `@/brands`, violando a regra inviolável §2.1 num ponto cego do guard-rail;
(3) `resolveBrand` não tem teste do caminho de erro; (4) o descritor de marca duplicado em
`app.config.ts` já divergiu da identidade das marcas.

**Next steps**: aplicar Fix 1 e Fix 2 juntos (a solução natural — resolver a marca na raiz e passar o
objeto `Brand` por prop — fecha os dois), depois Fix 3 e Fix 4; Fixes 5-8 podem seguir em lote. Re-verificar
após os fixes (iteração 1 de no máximo 3).
