# Fase 1 — Feature Flags Backend Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its
Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is
the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review,
Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/fase-1-feature-flags-backend/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase (`api/tests/Feature/FeatureFlagRepositoryTest.php`,
> `api/tests/Unit/DomainServiceProviderTest.php`, `api/phpunit.xml`) and project guidelines
> (`CLAUDE.md` §10, §11.2). Guidelines found: `CLAUDE.md`, `api/composer.json` (`scripts.test`,
> `scripts.lint`, `scripts.stan`), `api/phpstan.neon`, `api/phpunit.xml`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain entity / exception (`Brand`, `BrandNotFound`) | none | Build gate only — trivial value objects, no branching logic | `app/Domain/**` | build gate only |
| Repository (Eloquent, `EloquentBrandRepository`, `EloquentFeatureFlagRepository::allForBrand`) | integration (`RefreshDatabase`) | Every public method: found + not-found path | `tests/Feature/*RepositoryTest.php` | `php artisan test --testsuite=Feature --filter=RepositoryTest` |
| Application (`FeatureFlagService`) | unit (fakes, no DB) | 1:1 to spec ACs: happy path, brand not found, brand with zero flags | `tests/Unit/*ServiceTest.php` | `php artisan test --testsuite=Unit` |
| Http (`FeatureFlagController`, `ListFeatureFlagsRequest`, routes) | integration (Feature, `assertJsonStructure`) | Every route in scope: 200 happy path, 200 empty map, 422 missing brand, 404 unknown brand | `tests/Feature/Api/V1/*ControllerTest.php` | `php artisan test --testsuite=Feature` |
| Exception → HTTP mapping (`app/Exceptions/Handler.php`) | integration (Feature) | `BrandNotFound` → 404 envelope; validation → 422 envelope | covered inside the controller Feature test above | `php artisan test --testsuite=Feature` |
| `dedoc/scramble` config | none | Manual verification only — no assertion library for OpenAPI shape in this project | — | manual `curl localhost:9000/docs/api` |

## Gate Check Commands

> Generated from `api/composer.json` scripts and `api/phpunit.xml`.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After tasks with unit tests only | `php artisan test --testsuite=Unit` |
| Full | After tasks with integration/Feature tests | `bash scripts/check-layer-boundary.sh && php artisan test` |
| Build | After phase completion or config/entity-only tasks | `bash scripts/check-layer-boundary.sh && php artisan test && vendor/bin/pint --test && vendor/bin/phpstan analyse` |

---

## Execution Plan

### Phase 1: Domain & Infrastructure foundation

```
T1 → T2
T3
T4
```

### Phase 2: Application layer

```
T1 → T5
T2 → T5
T3 → T5
T4 → T5
```

### Phase 3: Http layer (routes, controller, error mapping, docs)

```
T4 → T6
T5 → T8
T6 → T8
T7 → T8
T8 → T9
```

---

## Task Breakdown

### T1: Criar entidade `Brand` e interface `BrandRepository`

**What**: `app/Domain/Brand/Brand.php` (entidade mínima `id`, `slug`) e
`app/Domain/Brand/BrandRepository.php` (interface `findBySlug(string $slug): ?Brand`).
**Where**: `app/Domain/Brand/Brand.php`, `app/Domain/Brand/BrandRepository.php`
**Depends on**: None
**Reuses**: Padrão de `app/Domain/FeatureFlag/FeatureFlag.php` (entidade `readonly` por construtor)
**Requirement**: FLAGSBE-04, FLAGSBE-05

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [x] `Brand` é `final class` com `public readonly string $id, $slug` via construtor
- [x] `BrandRepository` é uma interface pura, sem import de `Illuminate\`
- [x] `bash scripts/check-layer-boundary.sh` continua passando (Domain sem Laravel)

**Tests**: none
**Gate**: build

**Commit**: `feat(api): add Brand domain entity and repository contract`

---

### T2: Implementar `EloquentBrandRepository` e registrar binding

**What**: `EloquentBrandRepository implements BrandRepository`, consultando `Models\Brand` por
`slug`; binding novo em `DomainServiceProvider`.
**Where**: `app/Infrastructure/Persistence/Eloquent/EloquentBrandRepository.php`,
`app/Providers/DomainServiceProvider.php` (modify)
**Depends on**: T1
**Reuses**: `Models/Brand.php` existente (Fase 0), padrão de
`EloquentFeatureFlagRepository::findByKeyAndBrand`
**Requirement**: FLAGSBE-04, FLAGSBE-05

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [x] `findBySlug` retorna `null` quando não encontra, entidade `Brand` quando encontra
- [x] `DomainServiceProviderTest` ganha um caso novo (`BrandRepository` resolve para
      `EloquentBrandRepository`) — segue o padrão exato do teste existente para `FeatureFlagRepository`
- [x] Gate check passes: `php artisan test --testsuite=Unit`
- [x] Test count: 2 tests pass em `DomainServiceProviderTest` (1 existente + 1 novo), sem deleção

**Tests**: unit
**Gate**: quick

**Commit**: `feat(api): bind BrandRepository to EloquentBrandRepository`

---

### T3: Adicionar `allForBrand` a `FeatureFlagRepository`

**What**: Novo método `allForBrand(string $brandId): array<int, FeatureFlag>` na interface e na
implementação Eloquent.
**Where**: `app/Domain/FeatureFlag/FeatureFlagRepository.php` (modify),
`app/Infrastructure/Persistence/Eloquent/EloquentFeatureFlagRepository.php` (modify)
**Depends on**: None (independente de T1/T2 — outro agregado)
**Reuses**: Mapeamento Model→entidade já usado em `findByKeyAndBrand`

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [x] `allForBrand` devolve array vazio quando a marca não tem flags (não `null`, não exceção)
- [x] `allForBrand` devolve todas as `FeatureFlag` entities da marca, mapeadas corretamente
- [x] `FeatureFlagRepositoryTest` ganha 2 casos novos: marca com flags (assert count + valores),
      marca sem flags (assert array vazio) — usa `BrandSeeder`/`FeatureFlagSeeder` como o teste
      existente já faz
- [x] Gate check passes: `bash scripts/check-layer-boundary.sh && php artisan test`
- [x] Test count: 3 tests pass em `FeatureFlagRepositoryTest` (1 existente + 2 novos)

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): add allForBrand to FeatureFlagRepository`

---

### T4: Criar exceção de domínio `BrandNotFound`

**What**: `app/Domain/FeatureFlag/Exceptions/BrandNotFound.php`, estendendo uma exceção nativa do
PHP (`\RuntimeException`), com mensagem incluindo o slug.
**Where**: `app/Domain/FeatureFlag/Exceptions/BrandNotFound.php`
**Depends on**: None
**Reuses**: Nenhum padrão existente (primeira exceção de domínio do projeto)
**Requirement**: FLAGSBE-04

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [ ] Classe `final`, estende `\RuntimeException`, sem import de `Illuminate\`
- [ ] Construtor recebe `string $slug`, monta mensagem determinística (ex.: `"Brand not found:
      {$slug}"`)
- [ ] `bash scripts/check-layer-boundary.sh` continua passando

**Tests**: none
**Gate**: build

**Commit**: `feat(api): add BrandNotFound domain exception`

---

### T5: Criar `FeatureFlagService`

**What**: `Application/FeatureFlag/FeatureFlagService::listForBrandSlug(string $brandSlug):
array<string, bool>` — resolve slug via `BrandRepository`, lança `BrandNotFound` se `null`, senão
mapeia `FeatureFlagRepository::allForBrand()` para `[key => enabled]`.
**Where**: `app/Application/FeatureFlag/FeatureFlagService.php`
**Depends on**: T1, T2, T3, T4
**Reuses**: `BrandRepository`, `FeatureFlagRepository` (interfaces, injetadas por construtor)
**Requirement**: FLAGSBE-01, FLAGSBE-02, FLAGSBE-04, FLAGSBE-05

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [ ] Dependências injetadas via construtor `private readonly`, nenhum `app()->make()`/`resolve()`
- [ ] Lança `BrandNotFound` quando `BrandRepository::findBySlug` retorna `null`
- [ ] Devolve `[]` quando a marca existe mas `allForBrand` devolve array vazio
- [ ] Devolve o mapa `key => enabled` correto quando há flags
- [ ] Teste unitário usa fakes/mocks em memória para as duas interfaces (Mockery, seguindo o padrão
      já usado no projeto — `mockery/mockery` já é dependência), sem tocar banco
- [ ] Gate check passes: `php artisan test --testsuite=Unit`
- [ ] Test count: 3 tests novos em `FeatureFlagServiceTest` (happy path, brand not found, brand
      sem flags)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(api): add FeatureFlagService use case`

---

### T6: Criar `app/Exceptions/Handler.php` e registrar em `bootstrap/app.php`

**What**: Classe `Handler` com método de registro que mapeia `BrandNotFound` → 404
(`{ "error": { "code": "BRAND_NOT_FOUND", "message": "...", "details": [] } }`) e
`ValidationException` → 422 no mesmo envelope; `bootstrap/app.php`'s `withExceptions()` passa a
delegar para esse Handler em vez do closure vazio atual.
**Where**: `app/Exceptions/Handler.php` (new), `bootstrap/app.php` (modify)
**Depends on**: T4
**Reuses**: Nenhum — primeiro handler de exceção real do projeto (CLAUDE.md §4 estrutura canônica)
**Requirement**: FLAGSBE-03, FLAGSBE-04

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [ ] `bootstrap/app.php` continua expondo `health: '/up'` sem alteração — regressão verificada
      manualmente com `curl -f localhost:9000/up` (AD-011, healthcheck do Docker depende disso)
- [ ] Envelope de erro validado por teste Feature dedicado (pode ser o mesmo arquivo de T8, mas o
      teste específico de 404/422 precisa existir antes ou junto de T8 — se `FeatureFlagController`
      ainda não existir, este teste usa uma rota de teste temporária lançando `BrandNotFound`
      diretamente, substituída pelo teste real em T8)
- [ ] `ValidationException` continua devolvendo 422 (comportamento Laravel padrão), mas com o corpo
      no formato do envelope custom, não o formato default do Laravel
- [ ] Gate check passes: `bash scripts/check-layer-boundary.sh && php artisan test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): add domain-aware exception handler`

---

### T7: Criar `ListFeatureFlagsRequest`

**What**: FormRequest com `rules(): array` exigindo `brand` (`required`, `string`).
**Where**: `app/Http/Requests/ListFeatureFlagsRequest.php`
**Depends on**: None
**Reuses**: Nenhum FormRequest existe ainda no projeto — primeira instância

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [ ] `authorize()` retorna `true` (sem auth real no projeto — CLAUDE.md §15)
- [ ] `rules()` retorna `['brand' => ['required', 'string']]`
- [ ] Nenhuma lógica de negócio dentro do FormRequest (só forma, não existência da marca)

**Tests**: none
**Gate**: build

**Commit**: `feat(api): add ListFeatureFlagsRequest`

---

### T8: Criar `FeatureFlagController`, `routes/api.php` e registrar em `bootstrap/app.php`

**What**: `FeatureFlagController::index(ListFeatureFlagsRequest $request): JsonResponse` chamando
`FeatureFlagService::listForBrandSlug`, devolvendo `response()->json($flags)`; `routes/api.php` com
`Route::prefix('v1')->group(fn () => Route::get('feature-flags',
[FeatureFlagController::class, 'index']))`; `bootstrap/app.php` ganha
`withRouting(..., api: __DIR__.'/../routes/api.php', apiPrefix: 'api', health: '/up')`.
**Where**: `app/Http/Controllers/Api/V1/FeatureFlagController.php` (new), `routes/api.php` (new),
`bootstrap/app.php` (modify)
**Depends on**: T5, T6, T7
**Reuses**: `Controller` base existente, `FeatureFlagService` (T5), `Handler` (T6),
`ListFeatureFlagsRequest` (T7)
**Requirement**: FLAGSBE-01, FLAGSBE-02, FLAGSBE-03, FLAGSBE-04, FLAGSBE-05

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [ ] `curl -f localhost:9000/up` continua respondendo 200 (regressão de `bootstrap/app.php`,
      verificado manualmente)
- [ ] `GET /api/v1/feature-flags?brand=nutri-care` responde 200 com o mapa correto (Feature test)
- [ ] `GET /api/v1/feature-flags?brand=<marca-sem-flags>` responde 200 com `{}` (Feature test)
- [ ] `GET /api/v1/feature-flags` (sem `brand`) responde 422 no envelope padrão (Feature test)
- [ ] `GET /api/v1/feature-flags?brand=inexistente` responde 404 no envelope padrão, código
      `BRAND_NOT_FOUND` (Feature test)
- [ ] Controller não importa Eloquent, `DB::`, nem contém `if` de negócio (verificado por
      `bash scripts/check-layer-boundary.sh`)
- [ ] Gate check passes: `bash scripts/check-layer-boundary.sh && php artisan test`
- [ ] Test count: 4 tests novos em `tests/Feature/Api/V1/FeatureFlagControllerTest.php`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): expose GET /api/v1/feature-flags endpoint`

---

### T9: Instalar e configurar `dedoc/scramble`

**What**: `composer require dedoc/scramble`, publicar config se necessário, confirmar que
`/docs/api` lista o endpoint com os parâmetros de query e os status codes possíveis.
**Where**: `api/composer.json` (modify), `api/config/scramble.php` (new, se publicado)
**Depends on**: T8
**Reuses**: Geração automática do Scramble a partir de `routes/api.php` + `ListFeatureFlagsRequest`
**Requirement**: FLAGSBE-06

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [ ] `composer.lock` atualizado (rodado dentro da imagem `php:8.3-cli`, conforme decisão de
      ambiente já registrada em `.specs/STATE.md`)
- [ ] `curl localhost:9000/docs/api` (com o servidor rodando) devolve HTML/JSON contendo
      `feature-flags` e os status `200`/`422`/`404`
- [ ] Gate check passes: `bash scripts/check-layer-boundary.sh && php artisan test && vendor/bin/pint --test && vendor/bin/phpstan analyse`

**Tests**: none
**Gate**: build

**Commit**: `chore(api): add OpenAPI docs via dedoc/scramble`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 → T2
          T1 → T5
          T2 → T5
          T3 → T5
          T4 → T5
          T4 → T6
Phase 2:  T5 → T8
Phase 3:  T6 → T8
          T7 → T8
          T8 → T9
```

Nota: dentro da Fase 1, T1→T2 é uma cadeia; T3 e T4 não dependem de T1/T2 mas ficam na mesma fase
por coesão temática (fundação de Domain/Infrastructure) — todas completam antes da Fase 2 começar,
execução ainda estritamente sequencial (T1, T2, T3, T4, nessa ordem). T7 não depende de T6 em dados,
mas executa depois dele na ordem sequencial da Fase 3 (sem edge de dependência entre eles no
diagrama, coerente com `Depends on: None` de T7).

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Brand entity + BrandRepository interface | 2 arquivos, 1 conceito (contrato de domínio) | ✅ Granular |
| T2: EloquentBrandRepository + binding | 2 arquivos, 1 conceito (implementação + wiring) | ✅ Granular |
| T3: allForBrand em FeatureFlagRepository | 2 arquivos (interface + impl), 1 método | ✅ Granular |
| T4: BrandNotFound exception | 1 arquivo | ✅ Granular |
| T5: FeatureFlagService | 1 arquivo | ✅ Granular |
| T6: Exceptions Handler + bootstrap wiring | 2 arquivos, 1 conceito (tradução de erro) | ✅ Granular |
| T7: ListFeatureFlagsRequest | 1 arquivo | ✅ Granular |
| T8: Controller + routes + bootstrap wiring | 3 arquivos, 1 conceito (expor o endpoint) | ✅ Granular |
| T9: dedoc/scramble | 2 arquivos (composer + config), 1 conceito (docs) | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | root of Phase 1, no incoming edge | ✅ Match |
| T2 | T1 | edge T1 to T2 | ✅ Match |
| T3 | None | root of Phase 1, no incoming edge | ✅ Match |
| T4 | None | root of Phase 1, no incoming edge | ✅ Match |
| T5 | T1, T2, T3, T4 | edges T1/T2/T3/T4 to T5 | ✅ Match |
| T6 | T4 | edge T4 to T6 | ✅ Match |
| T7 | None | no incoming edge; runs after T6 in sequential order within the phase, no data dependency | ✅ Match |
| T8 | T5, T6, T7 | edges T5/T6/T7 to T8 | ✅ Match |
| T9 | T8 | edge T8 to T9 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1: Brand entity + interface | Domain entity | none | none | ✅ OK |
| T2: EloquentBrandRepository | Repository | integration — mas o teste real (found/not-found) só é natural depois que T3 também existe; T2 cobre via `DomainServiceProviderTest` (unit, binding) porque o `findBySlug` completo só ganha valor de teste de dado real junto do endpoint — decisão: mover a cobertura de dado real de `EloquentBrandRepository` para dentro do teste do Controller (T8), que já exercita `findBySlug` via `BrandNotFound`/sucesso end-to-end | unit (binding) | ✅ OK — ver nota |
| T3: allForBrand | Repository | integration | integration | ✅ OK |
| T4: BrandNotFound | Domain exception | none | none | ✅ OK |
| T5: FeatureFlagService | Application | unit | unit | ✅ OK |
| T6: Exceptions Handler | Http (error mapping) | integration | integration | ✅ OK |
| T7: ListFeatureFlagsRequest | Http (FormRequest) | none (validação de forma coberta pelo teste 422 do Controller em T8, não duplicada aqui) | none | ✅ OK |
| T8: Controller + routes | Http | integration | integration | ✅ OK |
| T9: Scramble | Config | none | none | ✅ OK |

**Nota sobre T2**: `EloquentBrandRepository::findBySlug` é exercitado de ponta a ponta pelos testes
Feature de T8 (`brand=nutri-care` → sucesso, `brand=inexistente` → `BrandNotFound`/404) — escrever
um teste de integração isolado só para o Repository em T2 duplicaria exatamente o mesmo caminho sem
adicionar cobertura nova, já que não há nenhuma ramificação extra no Repository que o Controller não
exercite. Fica registrado aqui em vez de inventar uma task de teste separada (regra do skill:
"resolvendo dependências de compilação" via merge forward — a cobertura real migra para T8).

---

## Available Tools

**MCPs**: nenhum MCP de projeto disponível/necessário para estas tasks — todo trabalho é
leitura/escrita de arquivo e execução de comandos `php`/`composer`, já cobertos pelas ferramentas
padrão.
**Skills**: `laravel-specialist` aplicada em todas as tasks (Eloquent, FormRequest, testes Pest/PHPUnit,
Service pattern). Nenhuma outra skill do projeto se aplica a este lado da feature.
