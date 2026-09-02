# Fase 2 — Carteira de Pacientes Backend Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its
Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is
the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review,
Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/fase-2-carteira-pacientes-backend/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase (`api/tests/Feature/FeatureFlagRepositoryTest.php`,
> `api/tests/Unit/DomainServiceProviderTest.php`, `api/phpunit.xml`) and project guidelines
> (`CLAUDE.md` §7, §10, §11.2). This feature introduces the project's first pure-domain enum with
> boundary conditions (`BiomarkerStatus`) and its first keyset-pagination Repository method.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain entity/DTO (`Patient`, `Biomarker`, `PatientPage`) | none | Build gate only — plain value objects, no branching | `app/Domain/**` | build gate only |
| Domain enum (`BiomarkerStatus::from`) | unit, no Laravel | Every AC boundary: below, exact `refMin`, inside, exact `refMax`, above | `tests/Unit/BiomarkerStatusTest.php` | `php artisan test --testsuite=Unit --filter=BiomarkerStatusTest` |
| Domain value object (`PatientCursor::encode/decode`) | unit, no Laravel | Round-trip encode→decode; decode of malformed base64/JSON throws `InvalidCursor` | `tests/Unit/PatientCursorTest.php` | `php artisan test --testsuite=Unit --filter=PatientCursorTest` |
| Repository (Eloquent, `EloquentPatientRepository`, `EloquentBiomarkerRepository`) | integration (`RefreshDatabase`) | Every public method: found + not-found + pagination boundary (page 1, page 2, last page) | `tests/Feature/*RepositoryTest.php` | `php artisan test --testsuite=Feature --filter=RepositoryTest` |
| Application (`PatientService`) | unit (fakes, no DB) | 1:1 to spec ACs: happy path, brand not found, patient not found, invalid cursor, limit clamp | `tests/Unit/PatientServiceTest.php` | `php artisan test --testsuite=Unit --filter=PatientServiceTest` |
| Http (`PatientController`, FormRequests, routes) | integration (Feature, `assertJsonStructure`) | Every route: 200 happy path (list/detail/biomarkers/patch), pagination no-overlap across 2 pages, 422, 404, 400 | `tests/Feature/Api/V1/PatientControllerTest.php` | `php artisan test --testsuite=Feature` |
| Exception → HTTP mapping (`PatientNotFound`, `InvalidCursor`) | integration (Feature) | Covered inside the controller Feature test above | — | `php artisan test --testsuite=Feature` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After tasks with unit tests only | `php artisan test --testsuite=Unit` |
| Full | After tasks with integration/Feature tests | `bash scripts/check-layer-boundary.sh && php artisan test` |
| Build | After phase completion or config/entity-only tasks | `bash scripts/check-layer-boundary.sh && php artisan test && vendor/bin/pint --test && vendor/bin/phpstan analyse` |

---

## Execution Plan

### Phase 1: Domain foundation (migration + pure domain)

```
T1
T2 → T5
T3
T4
```

### Phase 2: Infrastructure (Eloquent repositories)

```
T1 → T6
T3 → T6
T4 → T6
T2 → T7
T5 → T7
```

### Phase 3: Application layer

```
T6 → T8
T7 → T8
```

### Phase 4: Http layer (error mapping, requests, resources, controller, routes)

```
T3 → T9
T10
T11
T8 → T12
T9 → T12
T10 → T12
T11 → T12
```

---

## Task Breakdown

### T1: Migration `needs_follow_up` + atualizar `Model\Patient` e `PatientFactory`

**What**: Migration aditiva `patients.needs_follow_up boolean default false`; `Models/Patient`
ganha `needs_follow_up` em `$fillable` e cast `boolean`; `PatientFactory::definition()` ganha
`'needs_follow_up' => false`.
**Where**: `database/migrations/xxxx_add_needs_follow_up_to_patients.php` (new),
`app/Infrastructure/Persistence/Eloquent/Models/Patient.php` (modify),
`database/factories/PatientFactory.php` (modify)
**Depends on**: None
**Reuses**: Padrão de migration aditiva do projeto (UUID PK já existente, só adiciona coluna)
**Requirement**: PATBE-16, PATBE-17

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [x] `php artisan migrate` roda sem erro sobre o banco de teste existente (5.000+ pacientes já
      seedados recebem `needs_follow_up = false` via default da coluna, sem backfill manual)
- [x] `Model\Patient::$casts` inclui `'needs_follow_up' => 'boolean'`
- [x] `PatientFactory::definition()` inclui `'needs_follow_up' => false` — `PatientSeederTest`
      existente continua passando sem alteração (seed determinístico não muda contagem/distribuição)
- [x] Gate check passes: `php artisan test --testsuite=Feature --filter=PatientSeederTest`

**Tests**: none (coberto indiretamente por `PatientSeederTest` já existente)
**Gate**: quick

**Commit**: `feat(api): add needs_follow_up column to patients`

---

### T2: `Domain/Biomarker/BiomarkerStatus` (enum) + `Domain/Biomarker/Biomarker` (entidade)

**What**: Enum `BiomarkerStatus` (`Low`, `Normal`, `High`) com método estático `from(float $value,
float $refMin, float $refMax): self`; entidade `Biomarker` com `status` calculado no construtor.
**Where**: `app/Domain/Biomarker/BiomarkerStatus.php`, `app/Domain/Biomarker/Biomarker.php`
**Depends on**: None
**Reuses**: Nenhum — primeira peça deste agregado
**Requirement**: PATBE-12, PATBE-14, PATBE-15

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [x] `BiomarkerStatus::from()` retorna `Low` quando `value < refMin`, `High` quando `value >
      refMax`, `Normal` quando `refMin <= value <= refMax` (limites inclusos)
- [x] `BiomarkerStatusTest` cobre os 5 casos: abaixo, exatamente `refMin`, dentro, exatamente
      `refMax`, acima
- [x] `Biomarker` é `final class`, `readonly` por construtor, sem import de `Illuminate\`
- [x] `bash scripts/check-layer-boundary.sh` continua passando (Domain sem Laravel)
- [x] Gate check passes: `php artisan test --testsuite=Unit --filter=BiomarkerStatusTest`
- [x] Test count: 5 tests novos em `BiomarkerStatusTest`

**SPEC_DEVIATION**: `BiomarkerStatus` implementado como enum puro (não `: string`), não backed
enum. PHP proíbe redeclarar `from()`/`tryFrom()` num enum backed (`Cannot redeclare` — erro fatal
confirmado ao vivo); só enum puro permite um `from()` estático com assinatura própria. Serialização
para string usa método `value(): string` em vez da propriedade `->value` do backed enum — Phase 4
(`BiomarkerResource`, T11) deve chamar `$this->status->value()`.

**Tests**: unit
**Gate**: quick

**Commit**: `feat(api): add BiomarkerStatus domain rule and Biomarker entity`

---

### T3: `Domain/Patient/PatientCursor` (VO), `PatientPage` (DTO), exceções `PatientNotFound`/`InvalidCursor`

**What**: `PatientCursor::encode(name, id): string` / `PatientCursor::decode(cursor): self` (lança
`InvalidCursor` em base64/JSON malformado ou shape incorreto); `PatientPage { items, nextCursor }`;
`PatientNotFound`/`InvalidCursor` estendendo `\RuntimeException`.
**Where**: `app/Domain/Patient/PatientCursor.php`, `app/Domain/Patient/PatientPage.php`,
`app/Domain/Patient/Exceptions/PatientNotFound.php`,
`app/Domain/Patient/Exceptions/InvalidCursor.php`
**Depends on**: None
**Reuses**: Forma de `BrandNotFound` (Fase 1) para as duas exceções novas
**Requirement**: PATBE-08, PATBE-11, PATBE-18

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [x] `PatientCursorTest` cobre round-trip (`encode` seguido de `decode` devolve `name`/`id`
      originais) e decode de string malformada lançando `InvalidCursor`
- [x] Nenhuma classe deste task importa `Illuminate\`
- [x] `bash scripts/check-layer-boundary.sh` continua passando
- [x] Gate check passes: `php artisan test --testsuite=Unit --filter=PatientCursorTest`
- [x] Test count: 2+ tests novos em `PatientCursorTest`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(api): add PatientCursor value object and Patient domain exceptions`

---

### T4: `Domain/Patient/Patient` (entidade) + `PatientRepository` (interface)

**What**: Entidade `Patient` (`id, brandId, name, birthDate, goal, status, needsFollowUp,
updatedAt`); interface `PatientRepository` com `paginate()`, `findById()`, `updateNeedsFollowUp()`.
**Where**: `app/Domain/Patient/Patient.php`, `app/Domain/Patient/PatientRepository.php`
**Depends on**: None (independente de T2/T3 — mesma fase por coesão temática)
**Reuses**: Padrão de entidade `readonly` já usado em `Brand`/`FeatureFlag`
**Requirement**: PATBE-01, PATBE-10, PATBE-16, PATBE-17, PATBE-18

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [x] `Patient` é `final class`, `readonly` por construtor
- [x] `PatientRepository` é interface pura (assinatura exata do design.md), sem import de
      `Illuminate\`
- [x] `bash scripts/check-layer-boundary.sh` continua passando

**Tests**: none
**Gate**: build

**Commit**: `feat(api): add Patient domain entity and repository contract`

---

### T5: `Domain/Biomarker/BiomarkerRepository` (interface)

**What**: Interface `BiomarkerRepository { listForPatient(string $patientId): array<int,
Biomarker> }`.
**Where**: `app/Domain/Biomarker/BiomarkerRepository.php`
**Depends on**: T2
**Reuses**: Padrão "um agregado, um Repository" confirmado na Fase 1
**Requirement**: PATBE-12, PATBE-13

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [x] Interface pura, sem import de `Illuminate\`
- [x] `bash scripts/check-layer-boundary.sh` continua passando

**Tests**: none
**Gate**: build

**Commit**: `feat(api): add BiomarkerRepository contract`

---

### T6: `EloquentPatientRepository` + binding

**What**: Implementação Eloquent de `PatientRepository`: `paginate()` (filtro `brand_id`, busca
`ILIKE`, ordenação `name, id`, cursor via `whereRaw('(name, id) > (?, ?)', [...])`, busca `limit+1`
para decidir `nextCursor`), `findById()`, `updateNeedsFollowUp()` (lança `PatientNotFound` se 0 linhas
afetadas); binding novo em `DomainServiceProvider`.
**Where**: `app/Infrastructure/Persistence/Eloquent/EloquentPatientRepository.php`,
`app/Providers/DomainServiceProvider.php` (modify)
**Depends on**: T1, T3, T4
**Reuses**: `Models/Patient.php` (T1), `PatientCursor`/`PatientPage`/exceções (T3), padrão de binding
existente

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [x] `paginate()` nunca devolve mais que `$limit` itens em `items`, mesmo buscando `limit+1` linhas
      internamente
- [x] `paginate()` com 2 marcas diferentes nunca mistura pacientes entre elas (teste com pacientes
      de nomes iguais em marcas diferentes)
- [x] `paginate()` com busca filtra corretamente (`ILIKE '%termo%'`, case-insensitive)
- [x] `paginate()` percorrida página a página (usando o `nextCursor` de cada resposta) cobre todos os
      pacientes de uma marca de teste sem duplicata nem lacuna
- [x] `findById()` retorna `null` para id inexistente, entidade para id existente
- [x] `updateNeedsFollowUp()` atualiza a coluna e devolve a entidade atualizada; lança
      `PatientNotFound` para id inexistente, sem lançar quando o valor já era o mesmo (PATCH
      idempotente — ver Risks do design.md)
- [x] `DomainServiceProviderTest` ganha caso novo (`PatientRepository` resolve para
      `EloquentPatientRepository`)
- [x] Gate check passes: `bash scripts/check-layer-boundary.sh && php artisan test`
- [x] Test count: `EloquentPatientRepositoryTest` com pelo menos 6 casos (found/not-found,
      paginação 2 marcas, busca, paginação sem sobreposição em 2+ páginas, PATCH idempotente)

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): implement EloquentPatientRepository with cursor pagination`

---

### T7: `EloquentBiomarkerRepository` + binding

**What**: `listForPatient()` → query `where('patient_id', $patientId)->orderBy('measured_at',
'desc')`, mapeando cada linha para `Biomarker` com `BiomarkerStatus::from()` aplicado; binding novo.
**Where**: `app/Infrastructure/Persistence/Eloquent/EloquentBiomarkerRepository.php`,
`app/Providers/DomainServiceProvider.php` (modify)
**Depends on**: T2, T5
**Reuses**: `Models/Biomarker.php` existente, `BiomarkerStatus::from()` (T2)

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [x] `listForPatient()` devolve `[]` para paciente sem biomarcadores, lista ordenada por
      `measuredAt desc` para paciente com biomarcadores
- [x] Cada `Biomarker` devolvido tem `status` correto (usa `Biomarker::factory()->outOfRange()`
      existente da Fase 0 para cobrir o caso "alto"/"baixo")
- [x] `DomainServiceProviderTest` ganha caso novo (`BiomarkerRepository` resolve para
      `EloquentBiomarkerRepository`)
- [x] Gate check passes: `bash scripts/check-layer-boundary.sh && php artisan test`
- [x] Test count: `EloquentBiomarkerRepositoryTest` com pelo menos 3 casos

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): implement EloquentBiomarkerRepository`

---

### T8: `Application/Patient/PatientService`

**What**: `listForBrandSlug()` (resolve slug via `BrandRepository`, decodifica cursor, clampa
`limit`, delega a `PatientRepository::paginate()`), `getById()`, `listBiomarkers()`,
`setNeedsFollowUp()` — assinaturas exatas do design.md.
**Where**: `app/Application/Patient/PatientService.php`
**Depends on**: T6, T7
**Reuses**: `BrandRepository` (Fase 1), `PatientRepository`/`BiomarkerRepository` (T6/T7)
**Requirement**: PATBE-01 a PATBE-20 (orquestra todas)

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [ ] Dependências injetadas via construtor `private readonly`, nenhum `app()->make()`/`resolve()`
- [ ] `listForBrandSlug`: `limit` nulo → 50; `limit > 100` → 100 (clamp, sem erro); propaga
      `BrandNotFound`/`InvalidCursor`
- [ ] `getById`: lança `PatientNotFound` quando `PatientRepository::findById` retorna `null`
- [ ] `listBiomarkers`: lança `PatientNotFound` quando o paciente não existe, antes de consultar
      biomarcadores
- [ ] `setNeedsFollowUp`: propaga `PatientNotFound` do Repository
- [ ] Testes unitários usam fakes/mocks (Mockery) para as 3 interfaces, sem tocar banco
- [ ] Gate check passes: `php artisan test --testsuite=Unit`
- [ ] Test count: `PatientServiceTest` com pelo menos 7 casos (1 por AC principal + clamp de limit)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(api): add PatientService use case`

---

### T9: `Exceptions/Handler.php` ganha `PatientNotFound` → 404 e `InvalidCursor` → 400

**What**: Dois branches novos no `render()` existente, reusando o método privado `envelope()`.
**Where**: `app/Exceptions/Handler.php` (modify)
**Depends on**: T3
**Reuses**: `envelope()` privado existente (Fase 1), mesmo padrão de `BrandNotFound`
**Requirement**: PATBE-08, PATBE-11, PATBE-18

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [ ] `PatientNotFound` → `404`, código `PATIENT_NOT_FOUND`
- [ ] `InvalidCursor` → `400`, código `INVALID_CURSOR`
- [ ] Teste Feature dedicado (rota de teste temporária ou o teste real de T12, se já existir)
      confirma o corpo exato das duas respostas
- [ ] Gate check passes: `bash scripts/check-layer-boundary.sh && php artisan test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): map PatientNotFound and InvalidCursor to HTTP responses`

---

### T10: `ListPatientsRequest` e `UpdateFollowUpRequest` (FormRequests)

**What**: `ListPatientsRequest` (`brand` required string, `search` nullable string max:255, `cursor`
nullable string, `limit` nullable integer min:1); `UpdateFollowUpRequest` (`needsFollowUp` required
boolean).
**Where**: `app/Http/Requests/ListPatientsRequest.php`, `app/Http/Requests/UpdateFollowUpRequest.php`
**Depends on**: None
**Reuses**: Padrão de `ListFeatureFlagsRequest` (Fase 1)
**Requirement**: PATBE-06, PATBE-19, PATBE-20

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [ ] `authorize()` retorna `true` nos dois (sem auth real — CLAUDE.md §15)
- [ ] `rules()` batem exatamente com o design.md
- [ ] Nenhuma lógica de negócio dentro dos FormRequests

**Tests**: none
**Gate**: build

**Commit**: `feat(api): add ListPatientsRequest and UpdateFollowUpRequest`

---

### T11: `PatientResource`, `PatientPageResource`, `BiomarkerResource`

**What**: Três API Resources transformando as entidades de domínio (não Models) para o shape
camelCase do contrato mobile.
**Where**: `app/Http/Resources/PatientResource.php`, `app/Http/Resources/PatientPageResource.php`,
`app/Http/Resources/BiomarkerResource.php`
**Depends on**: None
**Reuses**: Nenhum Resource existe ainda no projeto — primeira instância

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [ ] `PatientResource::toArray()` recebe uma entidade `Patient` (não `Model`) e devolve `id, name,
      birthDate, goal, status, needsFollowUp, updatedAt`
- [ ] `PatientPageResource` devolve `{ data: [...PatientResource], nextCursor: string|null }`
- [ ] `BiomarkerResource::toArray()` recebe `Biomarker` e devolve `id, code, label, value, unit,
      refMin, refMax, measuredAt, status` (status como string do enum, `$this->status->value`)

**Tests**: none (coberto pelos testes Feature do Controller em T12)
**Gate**: build

**Commit**: `feat(api): add Patient and Biomarker API resources`

---

### T12: `PatientController`, rotas e verificação manual do Scramble

**What**: `PatientController::index/show/biomarkers/updateFollowUp`, cada um chamando o
FormRequest + `PatientService` + devolvendo o Resource; 4 rotas novas em `routes/api.php` dentro do
grupo `v1` existente.
**Where**: `app/Http/Controllers/Api/V1/PatientController.php` (new), `routes/api.php` (modify)
**Depends on**: T8, T9, T10, T11
**Reuses**: `Controller` base existente, `PatientService` (T8), Handler (T9), FormRequests (T10),
Resources (T11)
**Requirement**: PATBE-01 a PATBE-20

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [ ] `curl -f localhost:9000/up` continua respondendo 200 (regressão de `routes/api.php`)
- [ ] `GET /api/v1/patients?brand=nutri-care&limit=50` responde 200 com `data`/`nextCursor`
- [ ] Duas chamadas encadeadas via `nextCursor` não repetem nem pulam paciente (teste Feature com
      seed de tamanho conhecido no banco de teste)
- [ ] `GET /api/v1/patients?brand=nutri-care&search=<termo>` filtra corretamente
- [ ] `GET /api/v1/patients` sem `brand` → 422; `?brand=inexistente` → 404; `?cursor=lixo` → 400
- [ ] `GET /api/v1/patients/:id` → 200 com paciente; id inexistente → 404
- [ ] `GET /api/v1/patients/:id/biomarkers` → 200 com lista + `status`; paciente sem biomarcadores →
      `[]`; paciente inexistente → 404
- [ ] `PATCH /api/v1/patients/:id` com `{"needsFollowUp":true}` → 200, `GET` subsequente confirma
      persistência; corpo inválido → 422; id inexistente → 404
- [ ] Controller não importa Eloquent, `DB::`, nem contém `if` de negócio
      (`bash scripts/check-layer-boundary.sh`)
- [ ] `curl localhost:9000/docs/api` lista as 4 rotas novas (verificação manual, sem asserção
      automatizada — mesmo padrão da Fase 1)
- [ ] Gate check passes: `bash scripts/check-layer-boundary.sh && php artisan test && vendor/bin/pint --test && vendor/bin/phpstan analyse`
- [ ] Test count: `PatientControllerTest` com pelo menos 10 casos

**Tests**: integration
**Gate**: build

**Commit**: `feat(api): expose patient wallet and biomarker endpoints`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1
          T2 → T5
          T3
          T4
Phase 2:  T1 → T6
          T3 → T6
          T4 → T6
          T2 → T7
          T5 → T7
Phase 3:  T6 → T8
          T7 → T8
Phase 4:  T3 → T9
          T10 (no incoming edge)
          T11 (no incoming edge)
          T8 → T12
          T9 → T12
          T10 → T12
          T11 → T12
```

Nota: dentro da Fase 1, T1/T3/T4 não dependem entre si (agregados diferentes: migration,
Patient-cursor/DTO/exceptions, Patient entity/interface) mas ficam na mesma fase por coesão temática
(fundação); T2→T5 é a única cadeia real dessa fase (`BiomarkerRepository` depende da entidade
`Biomarker` existir). T10/T11 não têm dependência de dado entre si nem com o resto da Fase 4, mas
executam depois de T9 na ordem sequencial (sem edge de dependência).

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Migration + Model + Factory | 3 arquivos, 1 conceito (coluna nova) | ✅ Granular |
| T2: BiomarkerStatus + Biomarker | 2 arquivos, 1 conceito (regra de status) | ✅ Granular |
| T3: PatientCursor + PatientPage + 2 exceções | 4 arquivos, 1 conceito (contratos de paginação/erro) | ✅ Granular |
| T4: Patient entity + PatientRepository interface | 2 arquivos, 1 conceito (contrato de domínio) | ✅ Granular |
| T5: BiomarkerRepository interface | 1 arquivo | ✅ Granular |
| T6: EloquentPatientRepository + binding | 2 arquivos, 1 conceito (implementação + wiring) | ✅ Granular |
| T7: EloquentBiomarkerRepository + binding | 2 arquivos, 1 conceito | ✅ Granular |
| T8: PatientService | 1 arquivo | ✅ Granular |
| T9: Exceptions Handler (2 branches) | 1 arquivo | ✅ Granular |
| T10: 2 FormRequests | 2 arquivos, 1 conceito (validação de forma) | ✅ Granular |
| T11: 3 API Resources | 3 arquivos, 1 conceito (serialização) | ✅ Granular |
| T12: Controller + routes | 2 arquivos, 1 conceito (expor os 4 endpoints) | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | root of Phase 1 | ✅ Match |
| T2 | None | root of Phase 1 | ✅ Match |
| T3 | None | root of Phase 1 | ✅ Match |
| T4 | None | root of Phase 1 | ✅ Match |
| T5 | T2 | edge T2 to T5 | ✅ Match |
| T6 | T1, T3, T4 | edges T1/T3/T4 to T6 | ✅ Match |
| T7 | T2, T5 | edges T2/T5 to T7 | ✅ Match |
| T8 | T6, T7 | edges T6/T7 to T8 | ✅ Match |
| T9 | T3 | edge T3 to T9 | ✅ Match |
| T10 | None | no incoming edge | ✅ Match |
| T11 | None | no incoming edge | ✅ Match |
| T12 | T8, T9, T10, T11 | edges T8/T9/T10/T11 to T12 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1: Migration/Model/Factory | Infra config | none (covered by existing seeder test) | none | ✅ OK |
| T2: BiomarkerStatus/Biomarker | Domain enum | unit | unit | ✅ OK |
| T3: PatientCursor/PatientPage/exceptions | Domain VO/DTO | unit | unit | ✅ OK |
| T4: Patient entity + interface | Domain | none | none | ✅ OK |
| T5: BiomarkerRepository interface | Domain | none | none | ✅ OK |
| T6: EloquentPatientRepository | Repository | integration | integration | ✅ OK |
| T7: EloquentBiomarkerRepository | Repository | integration | integration | ✅ OK |
| T8: PatientService | Application | unit | unit | ✅ OK |
| T9: Exceptions Handler | Http (error mapping) | integration (covered by T12 Feature test too) | integration | ✅ OK |
| T10: FormRequests | Http | none (validation covered by T12's 422 cases) | none | ✅ OK |
| T11: API Resources | Http | none (covered by T12 Feature tests) | none | ✅ OK |
| T12: Controller + routes | Http | integration | integration | ✅ OK |

---

## Available Tools

**MCPs**: nenhum MCP de projeto disponível/necessário — todo trabalho é leitura/escrita de arquivo e
execução de comandos `php`/`artisan`, já cobertos pelas ferramentas padrão.
**Skills**: `laravel-specialist` aplicada em todas as tasks (Eloquent, FormRequest, Resources,
enums PHP 8, testes Pest). Nenhuma outra skill do projeto se aplica a este lado da feature.
