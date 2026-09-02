# Fase 6 — Melhorias UX Backend Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of
truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination
sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/fase-6-melhorias-ux-backend/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase sampling (`tests/Unit/PatientServiceTest.php`,
> `tests/Feature/EloquentPatientRepositoryTest.php`, `tests/Feature/Api/V1/PatientControllerTest.php`,
> `tests/Feature/PatientSeederTest.php`) and `composer.json` scripts. Guidelines found: CLAUDE.md §10
> ("cobertura mínima, caminho crítico") + existing test samples as floor. Confirm before Execute.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain (enums `PatientGoal`/`PatientStatus`, exception `InvalidStatusTransition`) | unit | All branches; 1:1 to spec ACs (P3 AC1-AC6); every listed edge case (mesmo status repetido, transição cruzada inválida) | `tests/Unit/PatientGoalTest.php`, `tests/Unit/PatientStatusTest.php` | `composer test` |
| Application (`PatientService` métodos novos) | unit | All branches; 1:1 to spec ACs (P1-P4); fake/mock `PatientRepository`/`BrandRepository` (padrão `Mockery` já usado) | `tests/Unit/PatientServiceTest.php` (métodos novos) | `composer test` |
| Repository (`EloquentPatientRepository` métodos novos) | integration | Key query paths (insert/update/updateStatus/delete/paginate-by-status) + error handling (`PatientNotFound` em affected=0) | `tests/Feature/EloquentPatientRepositoryTest.php` (RefreshDatabase) | `composer test` |
| Controller/Routes (`POST`/`PATCH`/`PATCH .../status`/`DELETE`/`GET ?status=`) | e2e (Feature) | All routes: happy path + every listed edge case (422/404/409/400) + status code exato do CLAUDE.md §6.3 | `tests/Feature/Api/V1/PatientControllerTest.php` | `composer test` |
| Seeder/Factory (`PatientFactory`/`PatientSeeder`, locale `pt_BR`) | integration | ≥5.000 pacientes, valores dentro do enum, determinismo (`FAKER_SEED=42`) | `tests/Feature/PatientSeederTest.php` | `composer test` |
| FormRequest (`StorePatientRequest`/`UpdatePatientRequest`/`UpdatePatientStatusRequest`) | none | Validação exercida indiretamente pelos testes de Controller (422 já cobre) | - | build gate only |
| Migration / Model (`SoftDeletes`, check constraints) | none | Verificado pelos testes de Repository (insert/delete) e pelo `docker compose up` do zero | - | build gate only |
| `config/app.php` (locale) | none | Verificado pelo `PatientSeederTest` gerar nomes sem quebrar; não há asserção de "nome é português" (não determinístico o suficiente para testar) | - | build gate only |

## Gate Check Commands

> Generated from `api/composer.json` scripts (`lint`→Pint, `stan`→PHPStan, `pretest`→layer boundary,
> `test`→pretest + `php artisan test`). Confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Após tasks só de Domain/Application (unit, sem banco) | `composer test` |
| Full | Após tasks com Repository/Controller (integration/e2e, banco real) | `composer test && vendor/bin/phpstan analyse` |
| Build | Ao final de cada fase, e obrigatório ao final da Fase 2 (migration) | `composer test && vendor/bin/phpstan analyse && vendor/bin/pint --test` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks
within a phase execute in order.

### Phase 1: Domain Foundation

T1, T2, T3, T4 — sem dependência entre si (cada um é um arquivo novo independente); ordem de
execução segue a numeração só por convenção de leitura. Diagrama exato de dependências no "Phase
Execution Map" ao final deste documento.

### Phase 2: Persistence

T5 → T6 → T8 (com T7 confluindo em T8); T9 e T10 independentes. Diagrama exato no "Phase Execution
Map".

### Phase 3: Application (Service)

T11, T12, T13, T14 — sem dependência entre si (todos dependem só de T7, da Fase 2). Diagrama exato
no "Phase Execution Map".

### Phase 4: HTTP (Requests, Controller, Routes, Resource, Handler)

T15 → T16 → T19 ← T17, T18; T19 → T20, T19 → T21; T20, T21 → T22. Diagrama exato no "Phase Execution
Map".

---

## Task Breakdown

### T1: Create `PatientGoal` enum

**What**: Enum PHP puro backed em `string` com os 4 valores (`lose_weight`, `gain_muscle`,
`maintain`, `manage_condition`) e método estático `values(): array<int, string>`.
**Where**: `api/app/Domain/Patient/PatientGoal.php`
**Depends on**: None
**Reuses**: Nenhum — mesmos 4 valores hoje soltos em `database/factories/PatientFactory.php:26`
**Requirement**: UXBE-04, UXBE-27

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [x] Enum criado sem nenhum `use Illuminate\...` (Domain puro, verificável por
      `check-layer-boundary.sh`)
- [x] `values()` retorna os 4 valores na ordem declarada
- [x] Teste unitário cobrindo `values()` e `PatientGoal::from('lose_weight')` etc.
- [x] Gate check passes: `composer test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(patient-domain): add PatientGoal enum`

**Status**: ✅ Complete

---

### T2: Create `PatientStatus` enum com `canTransitionTo()`

**What**: Enum PHP puro backed em `string` (`active`/`inactive`/`completed`) com
`canTransitionTo(self $target): bool` cobrindo exatamente as 4 transições válidas do spec (P3
AC1-AC4) e `values(): array<int, string>`.
**Where**: `api/app/Domain/Patient/PatientStatus.php`
**Depends on**: None
**Reuses**: Mesmo padrão de "regra de negócio mais fácil de testar" já estabelecido por
`BiomarkerStatus` (CLAUDE.md §7)
**Requirement**: UXBE-12, UXBE-13, UXBE-14, UXBE-15

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [x] `canTransitionTo()` retorna `true` só para `active→inactive`, `active→completed`,
      `inactive→active`, `completed→active`
- [x] `canTransitionTo()` retorna `false` para `inactive→completed`, `completed→inactive`, e para
      qualquer status igual ao atual (`active→active` etc.)
- [x] Teste unitário cobre as 4 transições válidas E as combinações inválidas citadas acima (mesmo
      espírito de `BiomarkerStatus::from()` cobrindo os limites exatos)
- [x] Gate check passes: `composer test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(patient-domain): add PatientStatus enum with transition rules`

**Status**: ✅ Complete

---

### T3: Create `InvalidStatusTransition` exception

**What**: Exceção de domínio `final class InvalidStatusTransition extends RuntimeException`,
construtor `__construct(string $from, string $to)`, mesmo estilo de `PatientNotFound`.
**Where**: `api/app/Domain/Patient/Exceptions/InvalidStatusTransition.php`
**Depends on**: None
**Reuses**: `app/Domain/Patient/Exceptions/PatientNotFound.php` (mesmo esqueleto)
**Requirement**: UXBE-15

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Classe criada, sem `Illuminate\`
- [x] Mensagem inclui os dois valores (`$from`, `$to`)
- [x] Gate check passes: `composer test` (build gate — sem teste unitário dedicado, mesmo padrão de
      `PatientNotFound`/`InvalidCursor`, exercida via `PatientServiceTest`/Feature test em T13/T21)

**Tests**: none
**Gate**: quick

**Commit**: `feat(patient-domain): add InvalidStatusTransition exception`

**Status**: ✅ Complete

---

### T4: Add `statusChangedAt` ao `Patient` entity

**What**: Novo parâmetro `public readonly string $statusChangedAt` no construtor de `Patient`,
posicionado antes de `updatedAt` (mesma ordem usada no `PatientResource`/design.md).
**Where**: `api/app/Domain/Patient/Patient.php` (modify)
**Depends on**: None
**Reuses**: Estrutura existente da entidade (readonly properties)
**Requirement**: UXBE-27 (backend, campo novo do modelo)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Propriedade adicionada, `declare(strict_types=1)` mantido
- [x] Nenhum outro arquivo que instancia `new Patient(...)` quebra a compilação (é código morto até
      T8 atualizar `toDomain()` — aceitável, T8 é a próxima task da mesma fase)
- [x] Gate check passes: `composer test` (Entity/Config — build gate only, matriz não exige teste
      dedicado para um DTO puro)

**Tests**: none
**Gate**: quick

**Commit**: `feat(patient-domain): add statusChangedAt to Patient entity`

**Status**: ✅ Complete

**SPEC_DEVIATION**: `statusChangedAt` and `updatedAt` both got a `= ''` default on the constructor
parameter, instead of being required as design.md shows. Reason: all existing call sites
(`EloquentPatientRepository::toDomain()`, `PatientServiceTest`, `AiActionServiceTest`) construct
`Patient` with named arguments and did not pass `statusChangedAt`; without a default, this is a
runtime `ArgumentCountError`, not the "dead code until T8" compile-time-only situation the task
description assumed — PHP has no compile-time arity check. Giving only `statusChangedAt` a default
is rejected by PHP itself (`Optional parameter declared before required parameter is implicitly
treated as required`), so `updatedAt` needed the same treatment. T8 replaces both with real values
in `toDomain()`; this default only exists to keep the gate green in the T4-T7 window.

---

### T5: Migration — colunas de ciclo de vida e soft delete

**What**: Nova migration aditiva: `status_changed_at` (timestamp, nullable), `deleted_at`
(`$table->softDeletes()`), e 2 `CHECK` constraints via `DB::statement()` (`goal` restrito aos 4
valores, `status` restrito aos 3 valores). `down()` reverte na ordem inversa.
**Where**: `api/database/migrations/0000_12_31_000006_add_lifecycle_and_soft_delete_to_patients_table.php`
**Depends on**: None
**Reuses**: Convenção de nome/numeração das migrations existentes (`0000_12_31_0000NN_...`)
**Requirement**: UXBE-27, UXBE-28

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [x] `php artisan migrate` roda limpo a partir de um banco já com a Fase 0-3 aplicada
- [x] `php artisan migrate:rollback` reverte sem erro
- [x] Inserir uma linha com `goal`/`status` fora do enum via SQL cru falha por constraint (verificado
      manualmente ou no teste de T8)
- [x] Gate check passes: `composer test`

**Tests**: none
**Gate**: full

**Commit**: `feat(patient-persistence): add lifecycle columns and check constraints migration`

**Status**: ✅ Complete

---

### T6: `SoftDeletes` + `$fillable` no Model Eloquent

**What**: `Infrastructure/Persistence/Eloquent/Models/Patient` ganha `use SoftDeletes;` e
`$fillable` explícito incluindo `status_changed_at` (CLAUDE.md §9 — mass assignment controlado).
**Where**: `api/app/Infrastructure/Persistence/Eloquent/Models/Patient.php` (modify)
**Depends on**: T5
**Reuses**: Model já existente
**Requirement**: UXBE-18, UXBE-19

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [x] `SoftDeletes` importado e usado
- [x] `$fillable` lista `name`, `brand_id`, `birth_date`, `goal`, `status`, `needs_follow_up`,
      `status_changed_at` (nunca `$guarded = []`)
- [x] Gate check passes: `composer test`

**Tests**: none
**Gate**: quick

**Commit**: `feat(patient-persistence): add SoftDeletes trait to Patient model`

**Status**: ✅ Complete

---

### T7: Ampliar `PatientRepository` (interface)

**What**: Adiciona `insert(string $brandId, string $name, string $birthDate, string $goal): Patient`,
`update(string $id, array $fields): Patient`, `updateStatus(string $id, string $status, string
$statusChangedAt): Patient`, `delete(string $id): void`; `paginate()` ganha parâmetro
`array $statuses` (lista de status a incluir no filtro).
**Where**: `api/app/Domain/Patient/PatientRepository.php` (modify)
**Depends on**: T1, T2, T4
**Reuses**: Estilo de assinatura de `updateNeedsFollowUp` já existente
**Requirement**: UXBE-01, UXBE-07, UXBE-12, UXBE-18, UXBE-22

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Interface compila (Domain puro, sem `Illuminate\`)
- [x] `EloquentPatientRepository` ainda não implementa os métodos novos — quebra esperada até T8 (T7
      e T8 são consecutivos na mesma fase)
- [x] Gate check passes: leitura de código (PHPStan vai reclamar da implementação incompleta até T8
      — não rodar `composer test` isolado nesta task; gate real acontece em T8)

**Tests**: none
**Gate**: quick

**Commit**: `feat(patient-domain): extend PatientRepository interface with lifecycle methods`

**Status**: ✅ Complete (código lido: `php -l` limpo, `check-layer-boundary.sh` limpo; suíte
automatizada roda como parte do gate de T8, conforme instruído por esta própria task)

---

### T8: Implementar métodos novos em `EloquentPatientRepository`

**What**: Implementa os 4 métodos novos da interface + atualiza `toDomain()` para incluir
`statusChangedAt` + adapta `paginate()` para filtrar por `array $statuses` (`whereIn('status',
$statuses)`).
**Where**: `api/app/Infrastructure/Persistence/Eloquent/EloquentPatientRepository.php` (modify)
**Depends on**: T6, T7
**Reuses**: Padrão de `updateNeedsFollowUp` (update + affected=0 → `PatientNotFound` + `findOrFail` +
`toDomain`)
**Requirement**: UXBE-01, UXBE-07, UXBE-12, UXBE-17, UXBE-18, UXBE-22, UXBE-23, UXBE-24, UXBE-25

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [x] `insert()` cria com `status=active`, `needs_follow_up=false`, `status_changed_at=now()`, UUID
      gerado (mesmo padrão AD-002)
- [x] `update()` só grava os campos presentes em `$fields`
- [x] `updateStatus()` grava `status` e `status_changed_at` juntos, atomicamente
- [x] `delete()` usa soft delete do Eloquent (`->delete()`, não `->forceDelete()`)
- [x] `paginate()` com `$statuses = ['active']` (default) exclui `inactive`/`completed`;
      `$statuses = ['inactive', 'completed']` devolve só esses dois
- [x] Teste de integração cobrindo os 4 métodos novos + o filtro de `paginate()`, incluindo o caso
      "excluído nunca aparece mesmo pedindo todos os status" (spec P5 AC5)
- [x] Gate check passes: `composer test && vendor/bin/phpstan analyse`

**Tests**: integration
**Gate**: full

**Commit**: `feat(patient-persistence): implement lifecycle and soft delete repository methods`

**Status**: ✅ Complete

**SPEC_DEVIATION**: (1) `PatientRepository::paginate()`'s new `array $statuses` parameter got a
default (`['active']`, matching spec P5 AC1's own default) instead of being required as T7 first
wrote it. Reason: `PatientService::listForBrandSlug()` (unchanged until T21) still calls
`paginate()` with 4 positional args; without a default this throws `ArgumentCountError` on every
existing list/search request, not just new-filter tests. (2) Several pre-existing tests in
`EloquentPatientRepositoryTest.php` and `PatientControllerTest.php` that create patients via
`PatientModel::factory()` without an explicit `status` now pin `'status' => 'active'`. Reason: the
factory's pre-existing `randomElement(['active', 'inactive'])` combined with the new default
active-only filter made `paginate()`-backed assertions (count/order) flaky depending on the random
draw — confirmed by a real failing run before the fix. `PatientFactory`'s default status itself is
T9's job; this only pins the specific tests whose intent has nothing to do with status.

---

### T9: Atualizar `PatientFactory`/`PatientSeeder` para usar os enums + locale `pt_BR`

**What**: `PatientFactory::definition()` troca `randomElement([...])` solto por
`randomElement(PatientGoal::values())` e `status` para `PatientStatus::Active->value` (seeder sempre
cria pacientes `active` — inativar/concluir é ação de teste/uso, não de seed); `config/app.php`
`faker_locale` default vira `pt_BR`; `.env.example` ganha `APP_FAKER_LOCALE=pt_BR`.
**Where**: `api/database/factories/PatientFactory.php` (modify), `api/config/app.php` (modify),
`api/.env.example` (modify)
**Depends on**: T1, T2
**Reuses**: `PatientSeeder` (`FAKER_SEED=42`, `DEFAULT_COUNT=5000`) — nenhuma mudança de contagem/seed
**Requirement**: UXBE-27, UXBE-28, UXBE-29

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [x] `PatientFactory` usa os enums, nenhum array de string solto duplicado
- [x] `config('app.faker_locale')` resolve para `pt_BR` sem `APP_FAKER_LOCALE` setado
- [x] `.env.example` documenta a variável
- [x] `PatientSeederTest` (existente, ajustado se necessário) confirma ≥5.000 pacientes e todo `goal`
      dentro de `PatientGoal::values()`
- [x] Gate check passes: `composer test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(patient-seed): use pt_BR locale and enum values in patient seeder`

**Status**: ✅ Complete

---

### T10: Migração de teste — remover `UpdateFollowUpRequest`, preparar terreno para T16

**What**: Remove `api/app/Http/Requests/UpdateFollowUpRequest.php` e qualquer teste que o referencie
diretamente (a funcionalidade é absorvida por `UpdatePatientRequest`, criado em T16 — esta task só
limpa o terreno; o endpoint `PATCH /patients/:id` continua funcionando durante a janela entre T10 e
T16 porque o controller ainda aponta para o método antigo até T19).
**Where**: `api/app/Http/Requests/UpdateFollowUpRequest.php` (delete)
**Depends on**: None (independente do resto da Fase 2, mas empacotada aqui por ser HTTP/config-level)
**Reuses**: N/A
**Requirement**: UXBE-07 (preparação)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Arquivo removido
- [ ] Nenhuma referência a `UpdateFollowUpRequest` sobra no código (grep limpo)
- [ ] Gate check passes: `composer test` (espera-se falha temporária do PHPStan/rota até T16-T19
      recriarem o fluxo — se o gate falhar aqui, mover esta task para depois de T16 em vez de deixar
      o repositório num estado quebrado entre commits; **preferir**: só remover o arquivo no mesmo
      commit de T16, e pular esta task T10 do plano — ver nota abaixo)

**Tests**: none
**Gate**: quick

**Commit**: `chore(patient-http): remove UpdateFollowUpRequest ahead of consolidation`

> **Nota de execução**: esta task só é segura se `PatientController::updateFollowUp` também for
> removido no mesmo commit (senão a rota fica sem `FormRequest` e quebra o type-hint). Na prática,
> **mesclar T10 dentro de T16** (a task que cria `UpdatePatientRequest` e atualiza o controller) é
> preferível — mantida aqui como task separada só para rastreabilidade do requirement; se o executor
> perceber a mesma dependência circular, aplicar a regra de "merge backward" do `tasks.md` do skill
> (seção "Resolving compilation dependencies") e absorver T10 em T16 sem pedir confirmação.

---

### T11: `PatientService::create()`

**What**: Novo método `create(string $name, string $birthDate, string $goal, string $brandSlug):
Patient` — resolve `brand` via `BrandRepository::findBySlug()` (lança `BrandNotFound` se ausente),
delega a `PatientRepository::insert()`.
**Where**: `api/app/Application/Patient/PatientService.php` (modify)
**Depends on**: T7
**Reuses**: Padrão de `listForBrandSlug()` (linha 37-41) para resolver marca
**Requirement**: UXBE-01, UXBE-05

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [ ] Sucesso: paciente criado com os dados corretos
- [ ] `brand` inexistente lança `BrandNotFound`
- [ ] Teste unitário com `PatientRepository`/`BrandRepository` mockados (Mockery) cobrindo os 2 casos
- [ ] Gate check passes: `composer test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(patient-service): add create method`

---

### T12: `PatientService::update()`

**What**: Novo método `update(string $id, array $fields): Patient` — valida UUID (`assertValidId`),
delega a `PatientRepository::update()`.
**Where**: `api/app/Application/Patient/PatientService.php` (modify)
**Depends on**: T7
**Reuses**: `assertValidId()` já existente (linha 82-87)
**Requirement**: UXBE-07, UXBE-10

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [ ] Sucesso: só os campos de `$fields` são repassados ao repositório
- [ ] Id inválido ou paciente inexistente lança `PatientNotFound`
- [ ] Teste unitário cobrindo os 2 casos
- [ ] Gate check passes: `composer test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(patient-service): add update method`

---

### T13: `PatientService::changeStatus()`

**What**: Novo método `changeStatus(string $id, string $targetStatus): Patient` — busca o paciente
atual, calcula `PatientStatus::from($current->status)->canTransitionTo(PatientStatus::from($targetStatus))`,
lança `InvalidStatusTransition` se `false`, senão delega a `PatientRepository::updateStatus()` com
`now()`.
**Where**: `api/app/Application/Patient/PatientService.php` (modify)
**Depends on**: T2, T3, T7
**Reuses**: `assertValidId()`
**Requirement**: UXBE-12, UXBE-13, UXBE-14, UXBE-15, UXBE-16, UXBE-32

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [ ] As 4 transições válidas funcionam
- [ ] Transições inválidas (incluindo mesmo status) lançam `InvalidStatusTransition`
- [ ] Paciente inexistente/excluído lança `PatientNotFound`
- [ ] Teste unitário cobrindo as 4 transições válidas + pelo menos 2 inválidas + not-found
- [ ] Gate check passes: `composer test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(patient-service): add changeStatus method with transition validation`

---

### T14: `PatientService::delete()`

**What**: Novo método `delete(string $id): void` — valida UUID, delega a
`PatientRepository::delete()`.
**Where**: `api/app/Application/Patient/PatientService.php` (modify)
**Depends on**: T7
**Reuses**: `assertValidId()`
**Requirement**: UXBE-18, UXBE-21

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [ ] Sucesso: repositório chamado com o id certo
- [ ] Id inválido, paciente inexistente, ou já excluído lançam `PatientNotFound`
- [ ] Teste unitário cobrindo os 2 casos
- [ ] Gate check passes: `composer test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(patient-service): add delete method`

---

### T15: `StorePatientRequest`

**What**: `FormRequest` com `name` (`required|string|max:255`), `birthDate`
(`required|date_format:Y-m-d|before_or_equal:today`), `goal`
(`required|string|Rule::in(PatientGoal::values())`), `brand` (`required|string`).
**Where**: `api/app/Http/Requests/StorePatientRequest.php`
**Depends on**: T1
**Reuses**: Esqueleto de `ListPatientsRequest`/`UpdateFollowUpRequest`
**Requirement**: UXBE-02, UXBE-03, UXBE-04, UXBE-05

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [ ] `authorize()` retorna `true`
- [ ] Regras cobrem os 4 campos exatamente como acima
- [ ] Gate check passes: `composer test` (exercida via Feature test em T21)

**Tests**: none
**Gate**: quick

**Commit**: `feat(patient-http): add StorePatientRequest`

---

### T16: `UpdatePatientRequest` (substitui `UpdateFollowUpRequest`)

**What**: `FormRequest` com `name`, `birthDate`, `goal`, `needsFollowUp` todos `sometimes` + mesmas
regras de formato de T15 para os 3 primeiros; `withValidator()` adiciona erro se nenhum campo estiver
presente. Remove `UpdateFollowUpRequest.php` no mesmo commit (ver nota em T10 — task consolidada
aqui).
**Where**: `api/app/Http/Requests/UpdatePatientRequest.php` (novo),
`api/app/Http/Requests/UpdateFollowUpRequest.php` (delete)
**Depends on**: T1, T15
**Reuses**: Esqueleto de `UpdateFollowUpRequest` (removido, mas serve de referência de forma)
**Requirement**: UXBE-07, UXBE-08, UXBE-09, UXBE-10, UXBE-11

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [ ] Todos os 4 campos são `sometimes`
- [ ] Corpo vazio (nenhum campo) falha validação
- [ ] `UpdateFollowUpRequest.php` não existe mais, nenhuma referência a ele sobra
- [ ] Gate check passes: `composer test` (exercida via Feature test em T21)

**Tests**: none
**Gate**: quick

**Commit**: `feat(patient-http): consolidate UpdateFollowUpRequest into UpdatePatientRequest`

---

### T17: `UpdatePatientStatusRequest`

**What**: `FormRequest` com `status` (`required|string|Rule::in(PatientStatus::values())`).
**Where**: `api/app/Http/Requests/UpdatePatientStatusRequest.php`
**Depends on**: T2
**Reuses**: Esqueleto dos requests acima
**Requirement**: UXBE-15

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [ ] `authorize()` retorna `true`
- [ ] Regra cobre `status` exatamente como acima
- [ ] Gate check passes: `composer test` (exercida via Feature test em T21)

**Tests**: none
**Gate**: quick

**Commit**: `feat(patient-http): add UpdatePatientStatusRequest`

---

### T18: `PatientResource` — campo `statusChangedAt`

**What**: Adiciona `'statusChangedAt' => $this->resource->statusChangedAt` ao array de saída.
**Where**: `api/app/Http/Resources/PatientResource.php` (modify)
**Depends on**: T4
**Reuses**: Resource existente
**Requirement**: UXBE-30 (contrato exposto ao mobile)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Campo presente na saída, mesma posição do design.md
- [ ] Gate check passes: `composer test` (exercida via `assertJsonStructure` em T21)

**Tests**: none
**Gate**: quick

**Commit**: `feat(patient-http): expose statusChangedAt in PatientResource`

---

### T19: `PatientController` — `store`, `update` (renomeado), `updateStatus`, `destroy`

**What**: Adiciona `store(StorePatientRequest): JsonResponse` (`201` + `Location`), renomeia
`updateFollowUp` para `update(UpdatePatientRequest): JsonResponse` (chama `PatientService::update()`
com `$request->validated()`), adiciona `updateStatus(UpdatePatientStatusRequest): JsonResponse`,
adiciona `destroy(string $id): JsonResponse` (`204`).
**Where**: `api/app/Http/Controllers/Api/V1/PatientController.php` (modify)
**Depends on**: T11, T12, T13, T14, T15, T16, T17, T18
**Reuses**: Padrão fino já existente em `show`/`biomarkers` — nenhum Eloquent/regra no Controller
**Requirement**: UXBE-01, UXBE-06, UXBE-07, UXBE-12, UXBE-18

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [ ] `store` responde `201` com header `Location: /api/v1/patients/{id}`
- [ ] `update` mantém compatibilidade com chamada só de `needsFollowUp` (spec P2 AC5)
- [ ] `updateStatus` e `destroy` retornam os status corretos (`200`/`204`)
- [ ] `check-layer-boundary.sh` continua limpo (nenhum `DB::`/`Models\`/`$request->all()` no
      controller)
- [ ] Gate check passes: `composer test && vendor/bin/phpstan analyse`

**Tests**: none (o Controller em si não tem teste unitário próprio no projeto — cobertura via Feature
test em T21, mesma convenção já usada para os métodos existentes)
**Gate**: full

**Commit**: `feat(patient-http): add store, updateStatus and destroy controller actions`

---

### T20: Rotas + `Exceptions\Handler` (409 de transição inválida)

**What**: `routes/api.php` ganha `POST patients`, `PATCH patients/{id}/status`,
`DELETE patients/{id}`; `Exceptions\Handler::render()` ganha 1 `if` para `InvalidStatusTransition` →
envelope `409 INVALID_STATUS_TRANSITION` (mesmo padrão de `AiActionAlreadyResolved`).
**Where**: `api/routes/api.php` (modify), `api/app/Exceptions/Handler.php` (modify)
**Depends on**: T3, T19
**Reuses**: Padrão exato de `AiActionAlreadyResolved` (linha 47-49 do Handler) para o novo `if`
**Requirement**: UXBE-01, UXBE-12, UXBE-15, UXBE-18

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [ ] As 3 rotas novas respondem (roteadas para os métodos certos)
- [ ] `InvalidStatusTransition` produz `409` com `code: INVALID_STATUS_TRANSITION`
- [ ] Gate check passes: `composer test && vendor/bin/phpstan analyse`

**Tests**: none
**Gate**: full

**Commit**: `feat(patient-http): register new patient routes and 409 handler mapping`

---

### T21: `ListPatientsRequest` + `PatientService::listForBrandSlug` — filtro `?status=`

**What**: `ListPatientsRequest` ganha regra `status` (`nullable|string`, valor validado como lista
separada por vírgula de `PatientStatus::values()` via regra customizada — `400` se algum valor for
inválido, não `422`, para diferenciar "parâmetro malformado" de "corpo inválido" conforme CLAUDE.md
§6.3); `PatientService::listForBrandSlug()` ganha parâmetro `?array $statuses`, default `['active']`
quando `null`; repassa a `PatientRepository::paginate()` (já pronto desde T8).
**Where**: `api/app/Http/Requests/ListPatientsRequest.php` (modify),
`api/app/Application/Patient/PatientService.php` (modify),
`api/app/Http/Controllers/Api/V1/PatientController.php` (modify — passa o novo parâmetro)
**Depends on**: T8, T19
**Reuses**: `paginate()` já implementado em T8
**Requirement**: UXBE-22, UXBE-23, UXBE-24, UXBE-25, UXBE-26

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [ ] `GET /patients` sem `status` filtra por `active`
- [ ] `GET /patients?status=inactive,completed` devolve só esses dois
- [ ] `GET /patients?status=active,inactive,completed` devolve os três
- [ ] `GET /patients?status=invalido` responde `400`
- [ ] Paciente excluído nunca aparece, independentemente de `status`
- [ ] Gate check passes: `composer test && vendor/bin/phpstan analyse`

**Tests**: none (lógica de filtro já testada em T8/integration; esta task é o fio elétrico
Controller→Service→Repository — coberta pelos testes de e2e de T22, que são o ponto onde o
comportamento fica testável de ponta a ponta, ver "Resolving compilation dependencies" do skill)
**Gate**: full

**Commit**: `feat(patient-http): add status filter to GET /patients`

---

### T22: Testes de Feature end-to-end (todos os endpoints novos/alterados)

**What**: Testes de Feature cobrindo, via `RefreshDatabase`, os 4 endpoints novos/alterados por
completo: `POST` (201/422×4 campos/404 brand), `PATCH` cadastro (200/422/404, compatibilidade com só
`needsFollowUp`), `PATCH .../status` (200×4 transições/409×2/422/404), `DELETE`
(204/404/paciente some de tudo), `GET ?status=` (400/filtros). Esta é a task que fecha o "fio
elétrico" de T19-T21, seguindo a regra "merge forward" do skill para testes que só ficam executáveis
depois da wiring completa.
**Where**: `api/tests/Feature/Api/V1/PatientControllerTest.php` (modify, testes novos)
**Depends on**: T20, T21
**Reuses**: Padrão de teste já existente no arquivo (`BrandModel::factory()`, `PatientModel::factory()`,
`getJson`/`postJson`/`patchJson`/`deleteJson`, `assertJsonStructure`)
**Requirement**: UXBE-01 a UXBE-30 (cobertura e2e de todas as ACs de status code)

**Tools**:
- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:
- [ ] Cada status code do spec (`201`, `200`, `204`, `400`, `404`, `409`, `422`) tem pelo menos um
      teste que o produz de verdade
- [ ] Teste específico para "paciente excluído desaparece de `GET`/`show`/`biomarkers`/`update`/
      `updateStatus`" (spec P4 AC2)
- [ ] Teste específico para "reenviar `DELETE` no mesmo id excluído dá 404" (spec P4 AC3)
- [ ] `check-layer-boundary.sh` limpo
- [ ] Gate check passes: `composer test && vendor/bin/phpstan analyse && vendor/bin/pint --test`
- [ ] `docker compose down -v && docker compose up -d --wait` do zero sobe limpo, `curl -f
      localhost:9000/up` 200, `Patient::count()` ≥ 5000 com nomes `pt_BR`

**Tests**: e2e
**Gate**: build

**Commit**: `test(patient-http): cover new patient lifecycle endpoints end-to-end`

---

## Phase Execution Map

Todas as arestas de dependência (incluindo as que atravessam fases), agrupadas pela fase da task de
destino:

```
Phase 1:
T1
T2
T3
T4

Phase 2:
T5 → T6
T1 → T7
T2 → T7
T4 → T7
T6 → T8
T7 → T8
T1 → T9
T2 → T9
T10

Phase 3:
T7 → T11
T7 → T12
T2 → T13
T3 → T13
T7 → T13
T7 → T14

Phase 4:
T1 → T15
T1 → T16
T15 → T16
T2 → T17
T4 → T18
T11 → T19
T12 → T19
T13 → T19
T14 → T19
T15 → T19
T16 → T19
T17 → T19
T18 → T19
T3 → T20
T19 → T20
T8 → T21
T19 → T21
T20 → T22
T21 → T22
```

Execution is strictly sequential within a phase — a single agent (or batch worker) works one task at
a time, in order. Tasks sem seta de entrada (`T1`-`T4`, `T10`) não dependem de nenhuma outra task,
mas são executadas na ordem numérica por convenção de commits.

**Packing**: 22 tasks totais → ~3 batches de ~7-8 tasks (Fase 1+2 = 10 tasks é o maior bloco único;
como é uma cadeia de dependência apertada de persistência, mantido como um único batch levemente
acima do orçamento em vez de cortar no meio — ver regra "legítimo (se gordo) single-worker phase" do
skill). Sugestão de corte: Batch A = Fase 1+2 (T1-T10), Batch B = Fase 3+4 parte 1 (T11-T18), Batch C
= Fase 4 parte 2 (T19-T22).

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: PatientGoal enum | 1 arquivo | ✅ Granular |
| T2: PatientStatus enum | 1 arquivo | ✅ Granular |
| T3: InvalidStatusTransition | 1 arquivo | ✅ Granular |
| T4: Patient entity field | 1 arquivo | ✅ Granular |
| T5: Migration | 1 arquivo | ✅ Granular |
| T6: SoftDeletes no Model | 1 arquivo | ✅ Granular |
| T7: PatientRepository interface | 1 arquivo | ✅ Granular |
| T8: EloquentPatientRepository impl | 1 arquivo | ✅ Granular |
| T9: Factory/Seeder + config + .env | 3 arquivos, mesma mudança coesa (locale) | ⚠️ OK se coesivo — os 3 arquivos existem só para fazer "trocar o locale do Faker" funcionar de ponta a ponta; nenhum é testável isolado dos outros dois |
| T10: Remover UpdateFollowUpRequest | 1 arquivo (nota: candidato a merge em T16) | ✅ Granular (com nota de merge explícita) |
| T11: PatientService::create | 1 método, 1 arquivo | ✅ Granular |
| T12: PatientService::update | 1 método, 1 arquivo | ✅ Granular |
| T13: PatientService::changeStatus | 1 método, 1 arquivo | ✅ Granular |
| T14: PatientService::delete | 1 método, 1 arquivo | ✅ Granular |
| T15: StorePatientRequest | 1 arquivo | ✅ Granular |
| T16: UpdatePatientRequest | 2 arquivos (1 novo + 1 delete), mesma mudança coesa | ⚠️ OK — delete é consequência direta da criação, não uma segunda feature |
| T17: UpdatePatientStatusRequest | 1 arquivo | ✅ Granular |
| T18: PatientResource | 1 arquivo | ✅ Granular |
| T19: PatientController (4 métodos) | 1 arquivo, 4 métodos relacionados (mesmo recurso) | ⚠️ OK se cohesivo — é o mesmo padrão já usado pelo controller existente (vários métodos finos por arquivo) |
| T20: Rotas + Handler | 2 arquivos, mesma mudança coesa (expor + traduzir a exceção nova) | ⚠️ OK — sem o Handler, a rota nova produziria 500 em vez de 409; são a mesma unidade de entrega |
| T21: Filtro de status (Request+Service+Controller) | 3 arquivos, mesma mudança coesa (1 parâmetro atravessando 3 camadas) | ⚠️ OK — é uma única funcionalidade (filtro), não 3 features; separar quebraria a compilação entre tasks |
| T22: Testes e2e | 1 arquivo (testes) | ✅ Granular |

**Granularity check**: nenhuma task cria/edita múltiplos arquivos não relacionados. As marcadas ⚠️
são grupos de arquivos que implementam uma única mudança atravessando camadas (mesma regra usada por
features anteriores do projeto, ex. Fase 3 T17 do backend uniu binding + rota) — aceitas.

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | (nenhuma seta) | ✅ Match |
| T2 | None | (nenhuma seta) | ✅ Match |
| T3 | None | (nenhuma seta) | ✅ Match |
| T4 | None | (nenhuma seta) | ✅ Match |
| T5 | None | (nenhuma seta) | ✅ Match |
| T6 | T5 | T5→T6 | ✅ Match |
| T7 | T1, T2, T4 | T1→T7, T2→T7, T4→T7 | ✅ Match |
| T8 | T6, T7 | T6→T8, T7→T8 | ✅ Match |
| T9 | T1, T2 | T1→T9, T2→T9 | ✅ Match |
| T10 | None | (nenhuma seta) | ✅ Match |
| T11 | T7 | T7→T11 | ✅ Match |
| T12 | T7 | T7→T12 | ✅ Match |
| T13 | T2, T3, T7 | T2→T13, T3→T13, T7→T13 | ✅ Match |
| T14 | T7 | T7→T14 | ✅ Match |
| T15 | T1 | T1→T15 | ✅ Match |
| T16 | T1, T15 | T1→T16, T15→T16 | ✅ Match |
| T17 | T2 | T2→T17 | ✅ Match |
| T18 | T4 | T4→T18 | ✅ Match |
| T19 | T11, T12, T13, T14, T15, T16, T17, T18 | todas as 8 setas presentes | ✅ Match |
| T20 | T3, T19 | T3→T20, T19→T20 | ✅ Match |
| T21 | T8, T19 | T8→T21, T19→T21 | ✅ Match |
| T22 | T20, T21 | T20→T22, T21→T22 | ✅ Match |

**Rules verificadas**: nenhuma task depende de uma task de fase posterior; todo `Depends on` tem seta
correspondente no diagrama do "Phase Execution Map", incluindo dependências que atravessam fases.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Domain (enum) | unit | unit | ✅ OK |
| T2 | Domain (enum) | unit | unit | ✅ OK |
| T3 | Domain (exception) | none (mesmo padrão de `PatientNotFound`) | none | ✅ OK |
| T4 | Domain (entity) | none (Entity/Config) | none | ✅ OK |
| T5 | Migration | none | none | ✅ OK |
| T6 | Model | none | none | ✅ OK |
| T7 | Domain (interface) | none | none | ✅ OK |
| T8 | Repository | integration | integration | ✅ OK |
| T9 | Factory/Seeder/Config | integration (seeder) | integration | ✅ OK |
| T10 | HTTP (delete) | none | none | ✅ OK |
| T11 | Application (Service) | unit | unit | ✅ OK |
| T12 | Application (Service) | unit | unit | ✅ OK |
| T13 | Application (Service) | unit | unit | ✅ OK |
| T14 | Application (Service) | unit | unit | ✅ OK |
| T15 | FormRequest | none | none | ✅ OK |
| T16 | FormRequest | none | none | ✅ OK |
| T17 | FormRequest | none | none | ✅ OK |
| T18 | Resource | none | none | ✅ OK |
| T19 | Controller | none (e2e cobre em T22, não é deferral — ver nota) | none | ✅ OK |
| T20 | Routes/Handler | none (e2e cobre em T22) | none | ✅ OK |
| T21 | Request/Service/Controller (filtro) | none (e2e cobre em T22) | none | ✅ OK |
| T22 | Controller (via Feature test) | e2e | e2e | ✅ OK |

**Nota sobre T19-T21 com `Tests: none`**: não é test deferral disfarçado — o Controller do projeto
nunca teve teste unitário próprio em nenhuma fase anterior (`show`/`biomarkers`/`index` também não
têm); a Coverage Expectation da matriz para a camada "Controller/Routes" é **e2e**, e T22 é a task
que entrega esse e2e cobrindo T19-T21 juntos, porque só depois da wiring completa (rotas + handler +
filtro) existe uma rota chamável de ponta a ponta para testar. Isso segue literalmente a seção
"Resolving compilation dependencies" do processo de Tasks do skill (opção "merge forward"): o e2e não
pode rodar antes da rota existir, então ele migra para a primeira task em que fica executável.

---

## Tools and Skills Confirmation

Para cada task: **Skill `laravel-specialist`** nas tasks que tocam Eloquent/migration/FormRequest/
Controller (T5, T6, T8, T9, T11-T17, T19-T22); **NONE** nas tasks de Domain puro (T1-T4, T7, T10,
T18) porque são PHP sem framework, onde a skill não agrega. Nenhum MCP do projeto se aplica a este
tipo de tarefa (sem Firebase, sem Canva). Confirmar com o usuário antes de iniciar o Execute.
