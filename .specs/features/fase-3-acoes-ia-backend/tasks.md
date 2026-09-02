# Fase 3 — Ações de IA Backend Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its
Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is
the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review,
Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/fase-3-acoes-ia-backend/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase (`api/tests/Unit/{BiomarkerStatusTest,PatientServiceTest,FeatureFlagServiceTest}.php`,
> `api/tests/Feature/{Api/V1/PatientControllerTest,EloquentPatientRepositoryTest}.php`, `api/phpunit.xml`)
> and project guidelines (`CLAUDE.md` §6.4, §9, §10, §11.2). This feature introduces the project's
> first external-provider adapter (`AnthropicClient`, tested via `Http::fake()`, no real network
> call ever) and its first rate-limited endpoint.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain entity/DTO (`AiAction`, `AiPromptInput`, `AiSuggestion`, `AiSuggestedAction`) | none | Build gate only — plain value objects, no branching | `app/Domain/AiAction/*.php` | build gate only |
| Domain enum (`AiActionStatus::fromString`/`canTransitionTo`) | unit, no Laravel | Every valid/invalid string; every transition pair (pending→accepted, pending→dismissed, accepted→*, dismissed→*) | `tests/Unit/AiActionStatusTest.php` | `php artisan test --testsuite=Unit --filter=AiActionStatusTest` |
| Domain pure fn (`InputHashCalculator::compute`) | unit, no Laravel | Same input → same hash (order-independent on biomarker array), different `goal` → different hash, different biomarker value → different hash | `tests/Unit/InputHashCalculatorTest.php` | `php artisan test --testsuite=Unit --filter=InputHashCalculatorTest` |
| Infrastructure adapter (`AnthropicClient`) | unit (`Http::fake()`, zero real network) | Valid response → `AiSuggestion`; malformed JSON/schema → `LlmInvalidResponse`; simulated timeout → `LlmTimeout` | `tests/Unit/AnthropicClientTest.php` | `php artisan test --testsuite=Unit --filter=AnthropicClientTest` |
| Repository (Eloquent, `EloquentAiActionRepository`) | integration (`RefreshDatabase`) | Every public method: `findById` found/not-found, `listForPatient` ordering (`created_at desc`), `findByPatientAndHash` hit/miss, `insertMany` persists all rows, `updateStatus` changes status | `tests/Feature/EloquentAiActionRepositoryTest.php` | `php artisan test --testsuite=Feature --filter=EloquentAiActionRepositoryTest` |
| Application (`AiActionService`) | unit (`FakeLlmClient` + in-memory/fake repositories, no DB) | 1:1 to spec ACs: cache hit/miss, patient not found, ai disabled, no biomarkers, timeout→`LlmUnavailable`, invalid schema retried once then→`LlmUnavailable`, list happy/empty/not-found/disabled, decide accept/dismiss/not-found/already-resolved/disabled | `tests/Unit/AiActionServiceTest.php` | `php artisan test --testsuite=Unit --filter=AiActionServiceTest` |
| Http (`AiActionController`, `DecideAiActionRequest`, routes, rate limiter) | integration (Feature, `assertJsonStructure`) | Every route: 200/201 happy path (generate, cache-hit generate, list, decide accept, decide dismiss), 404, 422, 503, 409, 429 | `tests/Feature/Api/V1/AiActionControllerTest.php` | `php artisan test --testsuite=Feature --filter=AiActionControllerTest` |
| Exception → HTTP mapping (`AiDisabled`, `LlmUnavailable`, `PatientNoBiomarkers`, `AiActionNotFound`, `AiActionAlreadyResolved`) | integration (Feature) | Covered inside the controller Feature test above | — | `php artisan test --testsuite=Feature --filter=AiActionControllerTest` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After tasks with unit tests only | `php artisan test --testsuite=Unit` |
| Full | After tasks with integration/Feature tests | `bash scripts/check-layer-boundary.sh && php artisan test` |
| Build | After phase completion or config/entity-only tasks | `bash scripts/check-layer-boundary.sh && php artisan test && vendor/bin/pint --test && vendor/bin/phpstan analyse` |

---

## Execution Plan

Phases are ordered and run sequentially — each phase completes before the next begins, and tasks
within a phase execute in order.

### Phase 1: Domain foundation

```
T1
T2 → T3 → T4
T5
T3 → T6
T5 → T6
```

### Phase 2: Infrastructure (Eloquent + LLM adapters)

```
T6 → T7
T6 → T8
T1 → T9
T6 → T9
```

### Phase 3: Application (orchestration)

```
T4 → T10
T7 → T10
T8 → T10
T9 → T10
T10 → T11 → T12
```

### Phase 4: Http (routes, requests, resources, controller, rate limit)

```
T5 → T13
T3 → T14
T12 → T15
T13 → T15
T14 → T15
T15 → T16 → T17
```

---

## Task Breakdown

### T1: Config wiring for o provedor Anthropic

**What**: Adiciona `ANTHROPIC_MODEL` ao `.env.example`, e uma seção `anthropic` em
`config/services.php` lendo `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL` (default `claude-haiku-4-5`).
**Where**: `api/.env.example`, `api/config/services.php`
**Depends on**: None
**Reuses**: bloco `postmark`/`resend` existente em `config/services.php` como modelo de formato
**Requirement**: AIBE-01 (pré-requisito de infraestrutura)

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [x] `config('services.anthropic.key')` e `config('services.anthropic.model')` resolvem os valores
      de env, com default `claude-haiku-4-5` para o modelo
- [x] `ANTHROPIC_API_KEY=` (já existente) e `ANTHROPIC_MODEL=claude-haiku-4-5` estão em
      `.env.example`
- [x] Gate check passa: `php artisan config:show services` sem erro (build gate)

**Tests**: none
**Gate**: build

---

### T2: `AiActionStatus` enum

**What**: Enum PHP puro (não backed) com `pending`/`accepted`/`dismissed`, `value()`,
`fromString()`, `canTransitionTo()`.
**Where**: `api/app/Domain/AiAction/AiActionStatus.php`
**Depends on**: None
**Reuses**: `app/Domain/Biomarker/BiomarkerStatus.php` (mesmo padrão de enum puro com método
estático — não backed, porque backed impede redeclarar `from()`)
**Requirement**: AIBE-15, AIBE-16, AIBE-18

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [x] `fromString('pending'|'accepted'|'dismissed')` devolve a instância certa; qualquer outra
      string lança exceção
- [x] `canTransitionTo()` só devolve `true` para `Pending->Accepted` e `Pending->Dismissed`
- [x] Zero import de `Illuminate\` no arquivo
- [x] Gate check passa: `php artisan test --testsuite=Unit --filter=AiActionStatusTest`
- [x] Test count: 4+ testes passam (fromString válido, fromString inválido, 2+ casos de transição) — 10 testes passam

**Tests**: unit
**Gate**: quick

---

### T3: DTOs de domínio (`AiAction`, `AiPromptInput`, `AiSuggestion`, `AiSuggestedAction`)

**What**: Quatro classes `final readonly`-style (construtor promovido, propriedades `readonly`),
sem lógica além de armazenar dado — `AiSuggestion::fromArray()` mapeia o array já validado pelo
adapter para o value object.
**Where**: `api/app/Domain/AiAction/AiAction.php`, `AiPromptInput.php`, `AiSuggestion.php`,
`AiSuggestedAction.php`
**Depends on**: T2 (`AiAction` referencia `AiActionStatus`)
**Reuses**: `app/Domain/Patient/Patient.php` (mesmo estilo de entidade imutável)
**Requirement**: AIBE-01, AIBE-08

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [x] `AiAction` tem exatamente os campos do design (`id, patientId, title, rationale, priority,
      biomarkers, status, inputHash, createdAt`)
- [x] `AiPromptInput` tem `age, goal, biomarkers` (sem `name`/`id` do paciente)
- [x] `AiSuggestion::fromArray()` monta `riskLevel, summary, actions: AiSuggestedAction[]`
- [x] Zero import de `Illuminate\` em qualquer um dos 4 arquivos
- [x] Gate check passa: `php artisan test --testsuite=Unit` (nenhum teste quebrado pelas novas classes)

**Tests**: none
**Gate**: quick

---

### T4: `InputHashCalculator`

**What**: Função estática pura que computa `sha256` de JSON canônico de `{biomarkers ordenados por
code, goal}`.
**Where**: `api/app/Domain/AiAction/InputHashCalculator.php`
**Depends on**: T3
**Reuses**: mesmo espírito de regra pura de `BiomarkerStatus::from()`
**Requirement**: AIBE-01, AIBE-02

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [x] Mesmo array de biomarcadores em ordem diferente + mesmo `goal` produz o mesmo hash
- [x] `goal` diferente produz hash diferente
- [x] Um valor de biomarcador diferente produz hash diferente
- [x] Zero import de `Illuminate\`
- [x] Gate check passa: `php artisan test --testsuite=Unit --filter=InputHashCalculatorTest`
- [x] Test count: 3+ testes passam — 3 testes passam

**Tests**: unit
**Gate**: quick

---

### T5: Exceções de domínio

**What**: 5 classes de exceção — `AiDisabled`, `LlmUnavailable`, `PatientNoBiomarkers`,
`AiActionNotFound`, `AiActionAlreadyResolved` (mais `LlmInvalidResponse`/`LlmTimeout`, lançadas só
pelo `LlmClient` e capturadas dentro do `AiActionService` — nunca vazam até o Controller).
**Where**: `api/app/Domain/AiAction/Exceptions/{AiDisabled,LlmUnavailable,LlmInvalidResponse,LlmTimeout,PatientNoBiomarkers,AiActionNotFound,AiActionAlreadyResolved}.php`
**Depends on**: None
**Reuses**: `app/Domain/Patient/Exceptions/PatientNotFound.php` (mesmo padrão — `RuntimeException`
com mensagem no construtor)
**Requirement**: AIBE-04, AIBE-05, AIBE-06, AIBE-10, AIBE-17, AIBE-18, AIBE-20

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [x] As 7 classes existem, cada uma `extends RuntimeException`, zero import de `Illuminate\`
- [x] Gate check passa: `php artisan test --testsuite=Unit` (nenhuma quebra)

**Tests**: none
**Gate**: quick

---

### T6: Interfaces `AiActionRepository` e `LlmClient`

**What**: Duas interfaces de domínio, exatamente com a assinatura do design.
**Where**: `api/app/Domain/AiAction/AiActionRepository.php`, `api/app/Domain/AiAction/LlmClient.php`
**Depends on**: T3, T5
**Reuses**: `app/Domain/Patient/PatientRepository.php` (mesmo padrão de interface de Repository)
**Requirement**: AIBE-01, AIBE-02, AIBE-11, AIBE-15

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [x] `AiActionRepository` declara `findById, listForPatient, findByPatientAndHash, insertMany,
      updateStatus`
- [x] `LlmClient` declara `generate(AiPromptInput): AiSuggestion`
- [x] Zero import de `Illuminate\`
- [x] Gate check passa: `php artisan test --testsuite=Unit` (nenhuma quebra)

**Tests**: none
**Gate**: quick

---

### T7: `Models\AiAction` + `EloquentAiActionRepository`

**What**: Eloquent model (`$fillable` explícito, `$casts = ['biomarkers' => 'array']`,
`$timestamps = false`) e a implementação da interface, mais o binding em `DomainServiceProvider`.
**Where**: `api/app/Infrastructure/Persistence/Eloquent/Models/AiAction.php`,
`api/app/Infrastructure/Persistence/Eloquent/EloquentAiActionRepository.php`,
`api/app/Providers/DomainServiceProvider.php` (modify)
**Depends on**: T6
**Reuses**: `app/Infrastructure/Persistence/Eloquent/EloquentPatientRepository.php` (padrão
`toDomain(Model): Entity`)
**Requirement**: AIBE-01, AIBE-02, AIBE-11, AIBE-12

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [x] `findById` devolve `null` quando não existe, entidade quando existe
- [x] `listForPatient` ordena por `created_at desc`
- [x] `findByPatientAndHash` devolve `[]` em cache miss, e as linhas certas em cache hit
- [x] `insertMany` persiste todas as linhas passadas numa única chamada
- [x] `updateStatus` altera e devolve a entidade atualizada
- [x] Binding `AiActionRepository::class → EloquentAiActionRepository::class` registrado
- [x] Gate check passa: `php artisan test --testsuite=Feature --filter=EloquentAiActionRepositoryTest`
- [x] Test count: 6+ testes passam — 8 testes passam

**Tests**: integration
**Gate**: full

---

### T8: `FakeLlmClient`

**What**: Implementação de teste de `LlmClient` — `respondWith()`, `failWith()`, `timesCalled()`.
**Where**: `api/app/Infrastructure/Llm/FakeLlmClient.php`
**Depends on**: T6
**Reuses**: nenhum padrão existente no projeto (primeiro fake de infraestrutura); segue o espírito
de "adapter trocável" descrito em CLAUDE.md §6.2
**Requirement**: AIBE-01, AIBE-02, AIBE-06 (habilita os testes de `AiActionService` em T10)

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [ ] `generate()` devolve o que foi configurado em `respondWith()`, ou lança o que foi configurado
      em `failWith()`
- [ ] `timesCalled()` conta chamadas reais a `generate()`
- [ ] Gate check passa: `php artisan test --testsuite=Unit` (nenhuma quebra; sem teste próprio — é
      um duplo de teste, exercitado pelos testes que o consomem em T10)

**Tests**: none
**Gate**: quick

---

### T9: `AnthropicClient`

**What**: Implementação real de `LlmClient` — chama a API de mensagens da Anthropic via `Http::`,
com `timeout(15)`, valida a resposta com `Validator::make()` usando as regras do CLAUDE.md §6.4, e
lança `LlmInvalidResponse`/`LlmTimeout` conforme o caso.
**Where**: `api/app/Infrastructure/Llm/AnthropicClient.php`
**Depends on**: T1, T6
**Reuses**: regras de validação exatas do CLAUDE.md §6.4
**Requirement**: AIBE-05, AIBE-06, AIBE-07, AIBE-08

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [ ] Com `Http::fake()` devolvendo um JSON válido, `generate()` devolve `AiSuggestion` correta
- [ ] Com `Http::fake()` devolvendo JSON fora do schema, `generate()` lança `LlmInvalidResponse`
- [ ] Com `Http::fake()` simulando timeout (`Http::fake(fn () => throw new ConnectionException())`
      ou equivalente), `generate()` lança `LlmTimeout`
- [ ] Nenhum teste faz chamada de rede real (CLAUDE.md §10 — "nenhum teste pode fazer chamada real
      ao provedor de LLM")
- [ ] `AiPromptInput` enviado ao prompt nunca inclui `name`/id do paciente
- [ ] Gate check passa: `php artisan test --testsuite=Unit --filter=AnthropicClientTest`
- [ ] Test count: 3+ testes passam

**Tests**: unit
**Gate**: quick

---

### T10: `AiActionService::generate`

**What**: Orquestra cache hit/miss, checagem de kill switch, checagem de biomarcadores, chamada ao
`LlmClient` com retry único em `LlmInvalidResponse`, persistência.
**Where**: `api/app/Application/AiAction/AiActionService.php` (novo arquivo, método `generate` +
`AiActionGenerationResult` DTO)
**Depends on**: T4, T7, T8, T9
**Reuses**: `app/Application/Patient/PatientService.php` (`assertValidId()`, injeção de
`PatientRepository`/`BiomarkerRepository` via construtor)
**Requirement**: AIBE-01, AIBE-02, AIBE-03, AIBE-04, AIBE-05, AIBE-06, AIBE-07, AIBE-08, AIBE-09, AIBE-10

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [ ] Cache miss: chama `FakeLlmClient` exatamente 1 vez, persiste as ações, `generated = true`
- [ ] Cache hit: `FakeLlmClient::timesCalled() === 0`, devolve as ações existentes, `generated =
      false`
- [ ] Paciente inexistente → `PatientNotFound`
- [ ] `aiActionsEnabled = false` → `AiDisabled`, sem chamar `FakeLlmClient`
- [ ] Paciente sem biomarcadores → `PatientNoBiomarkers`, sem chamar `FakeLlmClient`
- [ ] `FakeLlmClient` configurado para lançar `LlmTimeout` → `AiActionService` relança
      `LlmUnavailable`, `timesCalled() === 1` (sem retry em timeout)
- [ ] `FakeLlmClient` configurado para lançar `LlmInvalidResponse` nas 2 primeiras chamadas →
      `AiActionService` relança `LlmUnavailable`, `timesCalled() === 2` (exatamente 1 retry)
- [ ] `FakeLlmClient` configurado para lançar `LlmInvalidResponse` só na 1ª chamada e responder
      válido na 2ª → `generate` retorna sucesso, `timesCalled() === 2`
- [ ] Nenhum caminho de erro persiste nada (`AiActionRepository::insertMany` nunca chamado)
- [ ] Gate check passa: `php artisan test --testsuite=Unit --filter=AiActionServiceTest`
- [ ] Test count: 9+ testes passam

**Tests**: unit
**Gate**: quick

---

### T11: `AiActionService::listForPatient`

**What**: Lista o histórico de ações de um paciente, com as mesmas checagens de paciente/kill
switch de `generate`.
**Where**: `api/app/Application/AiAction/AiActionService.php` (modify — adiciona método)
**Depends on**: T10
**Reuses**: mesmas checagens de `generate` (paciente existe, flag ligada)
**Requirement**: AIBE-11, AIBE-12, AIBE-13, AIBE-14

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [ ] Paciente com histórico → devolve as ações (via repositório fake/mock)
- [ ] Paciente sem histórico → `[]`
- [ ] Paciente inexistente → `PatientNotFound`
- [ ] `aiActionsEnabled = false` → `AiDisabled`
- [ ] Gate check passa: `php artisan test --testsuite=Unit --filter=AiActionServiceTest`
- [ ] Test count total do arquivo: 13+ testes passam

**Tests**: unit
**Gate**: quick

---

### T12: `AiActionService::decide`

**What**: Aceita ou descarta uma ação `pending`, aplicando a transição terminal de
`AiActionStatus::canTransitionTo()`.
**Where**: `api/app/Application/AiAction/AiActionService.php` (modify — adiciona método)
**Depends on**: T11
**Reuses**: `AiActionStatus::canTransitionTo()` (T2)
**Requirement**: AIBE-15, AIBE-16, AIBE-17, AIBE-18, AIBE-20

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [ ] `decide(id, Accepted)` numa ação `pending` → persiste `accepted`, devolve a ação atualizada
- [ ] `decide(id, Dismissed)` numa ação `pending` → persiste `dismissed`
- [ ] Ação inexistente → `AiActionNotFound`
- [ ] Ação já `accepted`/`dismissed` → `AiActionAlreadyResolved`, sem chamar `updateStatus`
- [ ] `aiActionsEnabled = false` na marca da ação → `AiDisabled`, sem chamar `updateStatus`
- [ ] Gate check passa: `php artisan test --testsuite=Unit --filter=AiActionServiceTest`
- [ ] Test count total do arquivo: 18+ testes passam

**Tests**: unit
**Gate**: quick

---

### T13: Exception → HTTP mapping no `Handler`

**What**: Adiciona os 5 `if ($e instanceof X)` novos (`AiDisabled`→503, `LlmUnavailable`→502,
`PatientNoBiomarkers`→422, `AiActionNotFound`→404, `AiActionAlreadyResolved`→409) ao
`Exceptions\Handler` existente.
**Where**: `api/app/Exceptions/Handler.php` (modify)
**Depends on**: T5
**Reuses**: os `if` já existentes para `PatientNotFound`/`InvalidCursor` (mesmo padrão de envelope)
**Requirement**: AIBE-04, AIBE-05, AIBE-10, AIBE-17, AIBE-18

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [ ] Cada uma das 5 exceções produz o `status`/`code` certo no envelope padrão
- [ ] Gate check passa: `php artisan test --testsuite=Unit` (nenhuma quebra; teste real do mapping
      vem no Feature test de T17)

**Tests**: none
**Gate**: quick

---

### T14: `DecideAiActionRequest` + `AiActionResource`

**What**: `FormRequest` para o `PATCH` (`status` obrigatório, `in:accepted,dismissed`) e o
`JsonResource` de serialização.
**Where**: `api/app/Http/Requests/DecideAiActionRequest.php`,
`api/app/Http/Resources/AiActionResource.php`
**Depends on**: T3
**Reuses**: `app/Http/Requests/UpdateFollowUpRequest.php`, `app/Http/Resources/PatientResource.php`
(mesmo padrão exato)
**Requirement**: AIBE-19, AIBE-21

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [ ] `DecideAiActionRequest::rules()` rejeita corpo sem `status` ou com valor fora do enum
- [ ] `AiActionResource::toArray()` expõe `id, patientId, title, rationale, priority, biomarkers,
      status, createdAt`
- [ ] Gate check passa: `php artisan test --testsuite=Unit` (nenhuma quebra)

**Tests**: none
**Gate**: quick

---

### T15: `AiActionController` + rotas

**What**: Controller com `generate`, `index`, `decide` (status `201`/`200` conforme
`AiActionGenerationResult->generated`), registrado em `routes/api.php`.
**Where**: `api/app/Http/Controllers/Api/V1/AiActionController.php`, `api/routes/api.php` (modify)
**Depends on**: T12, T13, T14
**Reuses**: `app/Http/Controllers/Api/V1/PatientController.php` (mesmo padrão exato — sem Eloquent,
sem `if` de negócio)
**Requirement**: AIBE-01, AIBE-02, AIBE-03, AIBE-09, AIBE-11, AIBE-15, AIBE-16, AIBE-21

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [ ] `GET /api/v1/patients/{id}/ai-actions`, `POST /api/v1/patients/{id}/ai-actions`,
      `PATCH /api/v1/ai-actions/{id}` registradas
- [ ] Controller não importa nenhuma classe `Eloquent`/`Models\`/`DB::`
- [ ] Gate check passa: `bash scripts/check-layer-boundary.sh`

**Tests**: none (exercitado end-to-end em T17)
**Gate**: quick

---

### T16: Rate limiter `ai`

**What**: `RateLimiter::for('ai', ...)` (10/min por IP) registrado em `AppServiceProvider::boot()`,
middleware `throttle:ai` aplicado só na rota `POST /patients/{id}/ai-actions`.
**Where**: `api/app/Providers/AppServiceProvider.php` (modify), `api/routes/api.php` (modify)
**Depends on**: T15
**Reuses**: `Illuminate\Cache\RateLimiting\Limit` + `Illuminate\Support\Facades\RateLimiter` (API
padrão do Laravel, primeira vez usada no projeto)
**Requirement**: AIBE-22, AIBE-23

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [ ] `throttle:ai` está presente só na rota `POST` de geração, não em `GET`/`PATCH`
- [ ] Limite configurado em 10 requisições/minuto por IP
- [ ] Gate check passa: `bash scripts/check-layer-boundary.sh && php artisan route:list` mostra o
      middleware na rota certa

**Tests**: none (exercitado em T17)
**Gate**: quick

---

### T17: Feature tests dos 3 endpoints + rate limit

**What**: Suíte `Feature` cobrindo os três endpoints ponta a ponta (`assertJsonStructure`, status
codes), incluindo o teste de rate limit (11 chamadas).
**Where**: `api/tests/Feature/Api/V1/AiActionControllerTest.php`
**Depends on**: T16
**Reuses**: `app/tests/Feature/Api/V1/PatientControllerTest.php` (mesmo padrão de setup —
`RefreshDatabase`, factories, `FakeLlmClient` trocado via `$this->app->bind`)
**Requirement**: AIBE-01 a AIBE-23 (verificação end-to-end de toda a traceability)

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [ ] `POST` gera (`201`) na primeira chamada e devolve cache hit (`200`) na segunda, mesmo
      paciente, `FakeLlmClient::timesCalled() === 1`
- [ ] `POST` com paciente inexistente → `404`; sem biomarcadores → `422`; kill switch off → `503`
- [ ] `GET` devolve `[]` para paciente sem histórico, e as ações depois de um `POST` — kill switch
      off → `503`
- [ ] `PATCH` aceita e descarta uma ação `pending` (`200` nos dois); ação inexistente → `404`; ação
      já resolvida → `409`; corpo inválido → `422`; kill switch off → `503`
- [ ] 11ª chamada `POST` na mesma janela de 1 minuto → `429`
- [ ] Toda a Traceability table do `spec.md` é atualizada para `Complete` nesta task
- [ ] Gate check passa: `bash scripts/check-layer-boundary.sh && php artisan test && vendor/bin/pint
      --test && vendor/bin/phpstan analyse`
- [ ] Test count: 12+ testes passam neste arquivo; suíte completa sem regressão

**Tests**: integration
**Gate**: build

**Commit**: `feat(api): expose ai-actions generate/list/decide endpoints`

---

## Phase Execution Map

```
Phase 1:
T1
T2 → T3 → T4
T5 → T6
T3 → T6

Phase 2:
T6 → T7
T6 → T8
T1 → T9
T6 → T9

Phase 3:
T4 → T10
T7 → T10
T8 → T10
T9 → T10
T10 → T11 → T12

Phase 4:
T5 → T13
T3 → T14
T12 → T15
T13 → T15
T14 → T15
T15 → T16 → T17
```

Execution is strictly sequential within a phase — a single agent (or batch worker) works one task
at a time, in order. `T1`, `T5`, `T6` have no cross-dependency within Phase 1 beyond what's listed,
but are executed in numeric order for a single worker.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Config Anthropic | 2 files, 1 concept | ✅ Granular |
| T2: `AiActionStatus` enum | 1 file | ✅ Granular |
| T3: 4 DTOs de domínio | 4 files, 1 cohesive concept (data shapes for the same flow) | ⚠️ OK — cohesive, sem lógica |
| T4: `InputHashCalculator` | 1 file | ✅ Granular |
| T5: 7 exceções de domínio | 7 files, 1 cohesive concept (error taxonomy) | ⚠️ OK — cohesive, sem lógica |
| T6: 2 interfaces | 2 files, 1 cohesive concept (contratos de domínio) | ⚠️ OK — cohesive |
| T7: Model + Repository + binding | 3 files, 1 endpoint de persistência | ✅ Granular |
| T8: `FakeLlmClient` | 1 file | ✅ Granular |
| T9: `AnthropicClient` | 1 file | ✅ Granular |
| T10: `AiActionService::generate` | 1 método (novo arquivo) | ✅ Granular |
| T11: `AiActionService::listForPatient` | 1 método | ✅ Granular |
| T12: `AiActionService::decide` | 1 método | ✅ Granular |
| T13: Handler mapping | 1 file (modify) | ✅ Granular |
| T14: FormRequest + Resource | 2 files, 1 cohesive concept (contrato HTTP do PATCH) | ⚠️ OK — cohesive |
| T15: Controller + rotas | 2 files, 1 endpoint group | ✅ Granular |
| T16: Rate limiter | 2 files (modify), 1 concept | ✅ Granular |
| T17: Feature tests | 1 file | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | Phase 1, sem seta | ✅ Match |
| T2 | None | Phase 1, sem seta | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | None | Phase 1, sem seta | ✅ Match |
| T6 | T3, T5 | T3 → T6, T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 (fase 1→2) | ✅ Match |
| T8 | T6 | T6 → T8 | ✅ Match |
| T9 | T1, T6 | T1 → T9, T6 → T9 | ✅ Match |
| T10 | T4, T7, T8, T9 | T4 → T10, T7 → T10, T8 → T10, T9 → T10 | ✅ Match |
| T11 | T10 | T10 → T11 | ✅ Match |
| T12 | T11 | T11 → T12 | ✅ Match |
| T13 | T5 | T5 → T13 (fase 1→4) | ✅ Match |
| T14 | T3 | T3 → T14 (fase 1→4) | ✅ Match |
| T15 | T12, T13, T14 | T12 → T15, T13 → T15, T14 → T15 | ✅ Match |
| T16 | T15 | T15 → T16 | ✅ Match |
| T17 | T16 | T16 → T17 | ✅ Match |

Nenhuma dependência aponta para uma fase posterior; todas as dependências apontam para trás ou
dentro da mesma fase.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1: Config Anthropic | Entity/Config | none | none | ✅ OK |
| T2: `AiActionStatus` | Domain enum | unit | unit | ✅ OK |
| T3: DTOs de domínio | Domain entity/DTO | none | none | ✅ OK |
| T4: `InputHashCalculator` | Domain pure fn | unit | unit | ✅ OK |
| T5: Exceções | Domain entity/DTO (config-like) | none | none | ✅ OK |
| T6: Interfaces | Domain entity/DTO | none | none | ✅ OK |
| T7: Model + Repository | Repository | integration | integration | ✅ OK |
| T8: `FakeLlmClient` | Infrastructure (test double) | none (duplo de teste, sem branch próprio) | none | ✅ OK |
| T9: `AnthropicClient` | Infrastructure adapter | unit | unit | ✅ OK |
| T10: `AiActionService::generate` | Application | unit | unit | ✅ OK |
| T11: `AiActionService::listForPatient` | Application | unit | unit | ✅ OK |
| T12: `AiActionService::decide` | Application | unit | unit | ✅ OK |
| T13: Handler mapping | Exception→HTTP (config-like até o Feature test) | integration (Feature) | none, coberto em T17 | ✅ OK — ver "Resolving compilation dependencies": mapping só é testável de ponta a ponta depois da rota existir (T15+), então o teste real está em T17, não deferido sem motivo |
| T14: FormRequest + Resource | Http (config-like até a rota existir) | integration (Feature) | none, coberto em T17 | ✅ OK — mesmo motivo de T13 |
| T15: Controller + rotas | Http | integration (Feature) | none, coberto em T17 | ✅ OK — controller só é testável ponta a ponta depois do rate limiter (T16) estar no lugar certo; T17 cobre os dois juntos |
| T16: Rate limiter | Http (middleware) | integration (Feature) | none, coberto em T17 | ✅ OK — mesmo motivo de T15 |
| T17: Feature tests | Http (rotas completas) | integration | integration | ✅ OK |

**Nota sobre T13-T16**: seguem a regra "Merge forward" de `tasks.md` §Resolving compilation
dependencies — o Handler, o FormRequest/Resource, o Controller e o rate limiter só formam uma rota
testável de ponta a ponta depois que todas as quatro peças existem: T17 absorve o teste Feature de
todas elas numa única task coesa, em vez de forçar 4 tasks a escrever Feature tests parciais e
frágeis contra rotas ainda incompletas.

---

## Tools

Skill único usado em todas as tasks de código: `laravel-specialist` (modelos Eloquent, FormRequest,
API Resources, RateLimiter, Pest/PHPUnit — exatamente o escopo desta feature). Nenhum MCP externo
necessário — toda a informação de API está em `CLAUDE.md` §6.4 (regras de validação) e na
documentação já lida da Anthropic (Messages API) durante o Design.
