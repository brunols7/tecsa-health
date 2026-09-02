# Fase 3 — Ações de IA Backend Validation

**Date**: 2026-09-02
**Spec**: `.specs/features/fase-3-acoes-ia-backend/spec.md`
**Diff range**: `main..feat/ia-acoes` (18 commits, `5356164`..`fc8badf`)
**Verifier**: independent sub-agent (author ≠ verifier)
**Iteration**: 2 (re-verificação após o Fix 1 da iteração 1)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 — Config Anthropic | ✅ Done | `api/config/services.php:31-34`, `api/.env.example:39` |
| T2 — `AiActionStatus` enum | ✅ Done | 10 unit tests |
| T3 — DTOs de domínio | ✅ Done | 4 files, zero `Illuminate\` |
| T4 — `InputHashCalculator` | ✅ Done | 3 unit tests |
| T5 — Exceções de domínio | ✅ Done | 7 classes |
| T6 — Interfaces | ✅ Done | `AiActionRepository`, `LlmClient` |
| T7 — Model + `EloquentAiActionRepository` | ✅ Done | 9 integration tests (o 9º é o do Fix 1) |
| T8 — `FakeLlmClient` | ✅ Done | queue-based double with `timesCalled()` |
| T9 — `AnthropicClient` | ✅ Done | 5 unit tests, `Http::fake()` only |
| T10 — `AiActionService::generate` | ✅ Done | 8 unit tests |
| T11 — `AiActionService::listForPatient` | ✅ Done | +4 unit tests |
| T12 — `AiActionService::decide` | ✅ Done | +5 unit tests |
| T13 — Handler mapping | ✅ Done | `api/app/Exceptions/Handler.php:36-54` |
| T14 — FormRequest + Resource | ✅ Done | — |
| T15 — Controller + rotas | ✅ Done | `api/routes/api.php:16-19` |
| T16 — Rate limiter `ai` | ✅ Done | `api/app/Providers/AppServiceProvider.php:27` |
| T17 — Feature tests | ✅ Done | 20 tests |

All 17 tasks are marked done in `tasks.md`; no `- [ ]` boxes remain.

**Process note (resolvido nesta iteração)**: `design.md` estava untracked na iteração 1; foi
commitado junto com o Fix 1 em `fc8badf`.

---

## Spec-Anchored Acceptance Criteria

### P1: Gerar ações de acompanhamento por IA (AIBE-01..AIBE-10)

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AIBE-01 — POST, paciente existe, flag on, tem biomarcador, sem hash existente → chama LLM, persiste 1-5 `pending` com `input_hash`, `201` | `201` + lista de ações criadas, `status=pending` | `api/tests/Feature/Api/V1/AiActionControllerTest.php:87` — `$first->assertStatus(201)`; `:89` — `assertJsonPath('0.status', 'pending')`; `api/tests/Unit/AiActionServiceTest.php:120` — `assertTrue($result->generated)`; `:107-112` — `insertMany` recebe ações com `status->value() === 'pending'` e `patientId` correto | ✅ PASS |
| AIBE-02 — mesmo snapshot já tem `ai_action` → `200` com as existentes, sem chamar LLM | `200` + mesmas ações, `LlmClient` não invocado | `AiActionControllerTest.php:93` — `assertStatus(200)`; `:96` — `assertSame($firstIds, $secondIds)`; `:97` — `assertSame(1, $fake->timesCalled())`; `AiActionServiceTest.php:158-160` — `assertFalse(generated)`, `assertSame($existing, ...)`, `assertSame(0, timesCalled())`; escopo por paciente: `api/tests/Feature/EloquentAiActionRepositoryTest.php:103` — `assertSame([], $repository->findByPatientAndHash($patientA->id, 'shared-hash'))` com a linha existente só sob `patientB` | ✅ PASS |
| AIBE-03 — paciente inexistente → `404` `PATIENT_NOT_FOUND` | status `404`, `error.code = PATIENT_NOT_FOUND` | `AiActionControllerTest.php:106` — `assertStatus(404)`; `:107` — `assertJsonPath('error.code', 'PATIENT_NOT_FOUND')` | ✅ PASS |
| AIBE-04 — flag off → `503` `AI_DISABLED`, sem chamar LLM | status `503`, `error.code = AI_DISABLED`, 0 chamadas | `AiActionControllerTest.php:130-132` — `assertStatus(503)`, `assertJsonPath('error.code','AI_DISABLED')`, `assertSame(0, $fake->timesCalled())`; `AiActionServiceTest.php:205` — `expectException(AiDisabled::class)` | ✅ PASS |
| AIBE-05 — timeout do LLM (15s) → `502` `AI_UNAVAILABLE`, sem persistir | status `502`, `error.code = AI_UNAVAILABLE`, nada persistido, timeout 15s | `AiActionControllerTest.php:144-146` — `assertStatus(502)`, `assertJsonPath('error.code','AI_UNAVAILABLE')`, `assertSame(0, AiActionModel::…->count())`; `AiActionServiceTest.php:261` — `assertSame(1, $llm->timesCalled())` (sem retry); `api/tests/Unit/AnthropicClientTest.php:110` — `expectException(LlmTimeout::class)` on `ConnectionException` | ⚠️ Spec-precision gap (valor 15s) |
| AIBE-06 — schema inválido → 1 retry; falha de novo → `502` `AI_UNAVAILABLE` | exatamente 2 chamadas, `502`, `AI_UNAVAILABLE` | `AiActionControllerTest.php:159-162` — `assertStatus(502)`, `assertJsonPath('error.code','AI_UNAVAILABLE')`, `assertSame(2, $fake->timesCalled())`, `assertSame(0, …count())`; `AiActionServiceTest.php:290` — `assertSame(2, $llm->timesCalled())`; `:319` — retry bem-sucedido, `assertSame(2, timesCalled())` | ✅ PASS |
| AIBE-07 — nunca persiste resposta não validada | `insertMany` nunca chamado em caminho de erro; 0 linhas | `AiActionServiceTest.php:250` e `:278` — `$aiActions->shouldNotReceive('insertMany')`; `AiActionControllerTest.php:146,162` — `assertSame(0, AiActionModel::query()->where('patient_id', …)->count())`; `api/app/Infrastructure/Llm/AnthropicClient.php:76-83` — só devolve `AiSuggestion` após `Validator` passar | ✅ PASS |
| AIBE-08 — só biomarcadores + idade + `goal` no prompt, nunca `name`/id | corpo enviado sem `name`/identificador | `AnthropicClientTest.php:142-148` — `Http::assertSent(fn ($r) => ! str_contains($r->body(), '"name"') && ! str_contains($r->body(), '"id"') && str_contains($r->body(), 'lose_weight'))`; reforçado estruturalmente por `api/app/Domain/AiAction/AiPromptInput.php:12-16` (tipo não tem campo `name`/`id`) | ✅ PASS |
| AIBE-09 — Controller sem Eloquent / regra / hash | script de fronteira §11.2 passa | `api/tests/Feature/LayerBoundaryScriptTest.php:62` — `test_fails_when_controller_uses_db_facade_or_eloquent_models` (`assertScriptExitCode(0)` na `:64`); `:76` — `test_fails_when_controller_uses_request_all`; `bash api/scripts/check-layer-boundary.sh` exit 0; `api/app/Http/Controllers/Api/V1/AiActionController.php:26-57` só delega ao Service | ✅ PASS |
| AIBE-10 — sem biomarcadores → `422` `PATIENT_NO_BIOMARKERS`, sem LLM | status `422`, `error.code = PATIENT_NO_BIOMARKERS` | `AiActionControllerTest.php:118-119` — `assertStatus(422)`, `assertJsonPath('error.code','PATIENT_NO_BIOMARKERS')`; `AiActionServiceTest.php:230` — `expectException(PatientNoBiomarkers::class)`; `:234` — `assertSame(0, $llm->timesCalled())` | ✅ PASS |

### P2: Listar ações já geradas (AIBE-11..AIBE-14)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AIBE-11 — GET → `200` com todas as ações, `created_at desc` | status `200`, todas as ações, ordem desc | `AiActionControllerTest.php:187-189` — `assertStatus(200)`, `assertJsonCount(1)`, `assertJsonPath('0.title', 'Reduzir açúcar refinado')`; ordenação: `api/tests/Feature/EloquentAiActionRepositoryTest.php:59-60` — `assertSame($newer->id, $items[0]->id)`, `assertSame($older->id, $items[1]->id)` | ✅ PASS |
| AIBE-12 — sem histórico → `200` `[]` | status `200`, corpo exatamente `[]` | `AiActionControllerTest.php:172-173` — `assertStatus(200)`, `assertExactJson([])` | ✅ PASS |
| AIBE-13 — paciente inexistente → `404` `PATIENT_NOT_FOUND` | status `404`, code `PATIENT_NOT_FOUND` | `AiActionControllerTest.php:196-197` — `assertStatus(404)`, `assertJsonPath('error.code','PATIENT_NOT_FOUND')` | ✅ PASS |
| AIBE-14 — flag off → `503` `AI_DISABLED` | status `503`, code `AI_DISABLED` | `AiActionControllerTest.php:207-208` — `assertStatus(503)`, `assertJsonPath('error.code','AI_DISABLED')`; `AiActionServiceTest.php:418` — `expectException(AiDisabled::class)`, `:412` — `shouldNotReceive('listForPatient')` | ✅ PASS |

### P3: Aceitar ou descartar (AIBE-15..AIBE-21)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AIBE-15 — PATCH `accepted` numa `pending` → persiste + `200` | status `200`, `status: accepted` persistido | `AiActionControllerTest.php:219-221` — `assertStatus(200)`, `assertJsonPath('status','accepted')`, `assertSame('accepted', $action->fresh()->status)`; `AiActionServiceTest.php:462` — `updateStatus` chamado `once()` com `AiActionStatus::Accepted` | ✅ PASS |
| AIBE-16 — PATCH `dismissed` numa `pending` → persiste + `200` | status `200`, `status: dismissed` persistido | `AiActionControllerTest.php:232-234` — `assertStatus(200)`, `assertJsonPath('status','dismissed')`, `assertSame('dismissed', $action->fresh()->status)` | ✅ PASS |
| AIBE-17 — ação inexistente → `404` `AI_ACTION_NOT_FOUND` | status `404`, code `AI_ACTION_NOT_FOUND` | `AiActionControllerTest.php:241-242` — `assertStatus(404)`, `assertJsonPath('error.code','AI_ACTION_NOT_FOUND')` | ✅ PASS |
| AIBE-18 — ação já resolvida → `409` `AI_ACTION_ALREADY_RESOLVED`, sem alterar | status `409`, code `AI_ACTION_ALREADY_RESOLVED`, estado inalterado | `AiActionControllerTest.php:253-255` — `assertStatus(409)`, `assertJsonPath('error.code','AI_ACTION_ALREADY_RESOLVED')`, `assertSame('accepted', $action->fresh()->status)`; `AiActionServiceTest.php:552` — `shouldNotReceive('updateStatus')`; `:558` — `expectException(AiActionAlreadyResolved::class)` | ✅ PASS |
| AIBE-19 — corpo sem `status` ou valor fora do enum → `422`, sem persistir | status `422`, nada persistido | `AiActionControllerTest.php:266-268` — `assertStatus(422)`, `assertJsonPath('error.code','VALIDATION_ERROR')`, `assertSame('pending', $action->fresh()->status)`; `:279-280` — mesmo para `status: 'pending'` (fora de `{accepted,dismissed}`) | ✅ PASS |
| AIBE-20 — flag off → `503` `AI_DISABLED`, sem alterar | status `503`, code `AI_DISABLED`, estado inalterado | `AiActionControllerTest.php:291-293` — `assertStatus(503)`, `assertJsonPath('error.code','AI_DISABLED')`, `assertSame('pending', $action->fresh()->status)`; `AiActionServiceTest.php:576` — `shouldNotReceive('updateStatus')` | ✅ PASS |
| AIBE-21 — campos além de `status` são ignorados | campo extra não chega ao Service / não muda o recurso | `AiActionControllerTest.php:307-309` — `assertStatus(200)`, `assertJsonPath('status','accepted')`, `assertJsonPath('title','Reduzir açúcar')` (o `title: 'Hacked title'` enviado é ignorado) | ✅ PASS |

### P4: Rate limit (AIBE-22, AIBE-23)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AIBE-22 — 11ª POST na mesma janela → `429`, sem chamar LLM | status `429` na 11ª, LLM não invocado por ela | `AiActionControllerTest.php:321` — as 10 primeiras `assertStatus($i === 1 ? 201 : 200)`; `:325` — `$eleventh->assertStatus(429)`; `:326` — `assertSame(1, $fake->timesCalled())` | ✅ PASS |
| AIBE-23 — limite só no `POST` | `GET`/`PATCH` seguem `200` depois do `429` | `AiActionControllerTest.php:339` — POST `429`; `:342` — `$get->assertStatus(200)`; `:346` — `$patch->assertStatus(200)`; rota: `api/routes/api.php:17-18` (`throttle:ai` só no POST) | ✅ PASS |

**Status**: ✅ 23/23 ACs com evidência `file:line`; 22 casam exatamente com o outcome definido no spec,
1 spec-precision gap (AIBE-05: o valor `15s` do timeout é uma constante em
`api/app/Infrastructure/Llm/AnthropicClient.php:20` que nenhum teste asserta — o outcome HTTP
(`502`/`AI_UNAVAILABLE`) está coberto).

---

## Discrimination Sensor

Scratch: `git worktree add …/scratchpad/sensor HEAD` (vendor copiado fisicamente + `composer
dump-autoload` — um symlink de `vendor/` fazia o autoloader PSR-4 resolver de volta para a árvore
real e neutralizava silenciosamente as mutações; a primeira tentativa foi descartada por isso).
Baseline no scratch da iteração 1: 55 testes verdes nas 4 classes alvo.

**Iteração 2**: a Mutação 4 foi reaplicada num novo worktree (`…/scratchpad/sensor2` em `fc8badf`,
vendor copiado fisicamente + `composer dump-autoload`). Baseline no scratch: 9 testes verdes em
`EloquentAiActionRepositoryTest`. As Mutações 1-3 não foram reexecutadas: nenhum código de produção
mudou desde a iteração 1 (`fc8badf` só adiciona um teste e o `design.md`), e adicionar teste só pode
aumentar o poder de discriminação.

| Mutation | File:line | Description | Killed? |
| --- | --- | --- | --- |
| 1 | `api/app/Application/AiAction/AiActionService.php:74` | Cache-hit check invertido: `if ($existing !== [])` → `if ($existing === [])` | ✅ Killed (it. 1) — 11 testes falharam (`AiActionServiceTest` cache miss/hit, `AiActionControllerTest` post generates/cache hit) |
| 2 | `api/app/Application/AiAction/AiActionService.php:163-165` | Retry removido: o `catch (LlmInvalidResponse)` deixa de re-chamar `llm->generate()` e relança direto | ✅ Killed — 3 testes falharam (`invalid schema twice retries once`, `invalid schema once then success`, `post returns 502 after one retry`) |
| 3 | `api/app/Domain/AiAction/AiActionStatus.php:36` | Guarda terminal removida: `return $this === self::Pending && in_array(...)` → `return in_array(...)` | ✅ Killed — 4 testes falharam (`accepted cannot transition to dismissed`, `dismissed cannot transition to accepted`, `decide throws ai action already resolved`, `patch returns 409`) |
| 4 | `api/app/Infrastructure/Persistence/Eloquent/EloquentAiActionRepository.php:39` | Escopo do cache por paciente removido: `->where('patient_id', $patientId)` apagado de `findByPatientAndHash` | ✅ **Killed (it. 2)** — `EloquentAiActionRepositoryTest.php:103` falha (`Failed asserting that two arrays are identical`); suíte completa: `119 deprecated, 1 failed, 23 passed`. Na iteração 1 essa mesma mutação sobrevivia à suíte inteira (142 testes verdes) |

**Sensor depth**: lightweight (4 mutações, foco no código novo de maior risco)
**Result**: 4/4 killed — ✅ PASS

**Isolamento verificado (it. 2)**: baseline `git status --porcelain` da árvore real capturado antes
do sensor (` M .specs/LESSONS.md`, ` M .specs/STATE.md`, ` M .specs/lessons.json`,
`?? .specs/features/fase-3-acoes-ia-backend/validation.md`, `?? .specs/features/fase-3-acoes-ia-mobile/`)
e idêntico depois; `git diff --stat HEAD -- api/` vazio, confirmando que nenhuma mutação vazou para
o código real. Worktree removida com `git worktree remove --force` + `git worktree prune`. Nenhum
`git stash` usado.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ |
| Surgical changes | ✅ — só arquivos novos de `AiAction` + 5 modificações pontuais (`Handler`, `routes/api.php`, os 2 Providers, `config/services.php`, `.env.example`) |
| No scope creep | ✅ — nada fora do escopo da Fase 3; `risk_level`/`summary` corretamente não persistidos, como o spec manda |
| Matches patterns | ✅ — `EloquentAiActionRepository` segue `toDomain()` de `EloquentPatientRepository`; `AiActionStatus` segue o enum puro de `BiomarkerStatus`; `Handler` segue os `if ($e instanceof …)` existentes |
| Sem `Illuminate\` em `app/Domain/` | ✅ — `grep -rn "Illuminate" app/Domain/` vazio |
| Sem Eloquent/`DB::` em `Application/` e `Controllers/` | ✅ — `grep -rnE "DB::\|Models\\\\\|->query\(\)"` vazio |
| Sem `$request->all()` em controller | ✅ — `AiActionController.php:53` usa `$request->validated('status')` |
| Zero comentários inline (regra do projeto) | ✅ — nenhum comentário novo; os únicos hits são docblocks de scaffolding pré-existentes do Laravel em `AppServiceProvider` |
| Spec-anchored outcome check | ⚠️ — 22/23 exatos, 1 spec-precision gap (AIBE-05, valor 15s) |
| Per-layer Coverage Expectation met | ✅ — domínio/Application 1:1 com as ACs; rotas cobrem happy+edge+error; o caso "cache nunca cruza pacientes" (Edge Case 3) agora está coberto na camada Repository (`EloquentAiActionRepositoryTest.php:91-104`) |
| Every test maps to a spec requirement | ✅ — nenhum teste órfão nos 6 arquivos novos |
| Documented guidelines followed | ✅ — `CLAUDE.md` §2.2, §2.3, §6.1, §6.2, §6.3, §6.4, §9, §11.2 |

---

## Edge Cases

- [x] **Paciente sem nenhum biomarcador → `422` `PATIENT_NO_BIOMARKERS`, sem chamar o LLM** — coberto
      (`AiActionControllerTest.php:118-119`, `AiActionServiceTest.php:230,234`).
- [x] **Duas POSTs concorrentes podem gerar dois lotes** — explicitamente aceito no spec ("não
      corrigido"); nenhum lock esperado, nenhum teste devido. Comportamento consistente com
      `AiActionService.php:72-76` (sem transação/lock).
- [x] **Mesmo snapshot clínico em dois pacientes diferentes → LLM chamado para cada um, cache nunca
      compartilhado** — ✅ coberto desde `fc8badf`.
      `test_find_by_patient_and_hash_never_returns_another_patients_rows`
      (`api/tests/Feature/EloquentAiActionRepositoryTest.php:91-104`) cria uma `ai_action` para o
      paciente B com `input_hash = 'shared-hash'` e asserta
      `assertSame([], $repository->findByPatientAndHash($patientA->id, 'shared-hash'))` (`:103`).
      Discriminação confirmada empiricamente: a Mutação 4, que sobrevivia na iteração 1, agora mata
      esse teste.

---

## Gate Check

- **Gate command**: `bash scripts/check-layer-boundary.sh && php artisan test && vendor/bin/pint --test && vendor/bin/phpstan analyse --memory-limit=512M` (rodado de `api/`)
- **Result**: 143 passed, 0 failed, 0 skipped (366 assertions, exit 0)
  - `check-layer-boundary.sh` — exit 0
  - `php artisan test` — exit 0, `Tests: 120 deprecated, 23 passed (366 assertions)`; os 120
    "deprecated" são avisos do PHP 8.4 sobre `PDO::MYSQL_ATTR_SSL_*` no driver, não falhas: todo
    teste que os emite passou
  - `vendor/bin/pint --test` — `{"tool":"pint","result":"passed"}`, exit 0
  - `vendor/bin/phpstan analyse --memory-limit=512M` — `[OK] No errors`, 81/81 arquivos
    (`--memory-limit=512M` é limite de ambiente, não do código)
- **Test count before feature** (`main`): 79
- **Test count after feature** (`feat/ia-acoes` em `fc8badf`): 143
- **Delta**: +64 novos testes (AiActionControllerTest 20, AiActionServiceTest 17, AiActionStatusTest
  10, EloquentAiActionRepositoryTest 9, AnthropicClientTest 5, InputHashCalculatorTest 3)
- **Skipped tests**: nenhum
- **Failures**: nenhuma
- **Test integrity**: `git diff --stat main..HEAD -- api/tests/` mostra 6 arquivos, 1415 inserções e
  **0 deleções** — nenhum teste removido, nenhuma asserção enfraquecida. Entre a iteração 1 e a 2 a
  contagem só subiu (142 → 143).

---

## Fix Plans

### Fix 1: Cache de ações de IA não é provado como escopado por paciente (Edge Case 3 / AIBE-02) — ✅ RESOLVIDO em `fc8badf`

Verificação independente do fix: a Mutação 4 foi reaplicada num worktree isolado em `fc8badf` e
agora **mata** o teste novo (`EloquentAiActionRepositoryTest.php:103`), enquanto a suíte sem mutação
segue verde (143 testes, exit 0). "Done when" da tarefa de fix atendido.

- **Root cause (histórico)**: a suíte nunca cria duas linhas `ai_actions` com o **mesmo** `input_hash` sob
  `patient_id` diferentes. Sem esse caso, o filtro `->where('patient_id', $patientId)` em
  `api/app/Infrastructure/Persistence/Eloquent/EloquentAiActionRepository.php:39` não é observável:
  apagá-lo mantém os 142 testes verdes (Mutação 4). Uma regressão aqui faria um paciente receber
  ações de IA geradas para outro paciente — vazamento clínico entre prontuários.
- **Fix task**:
  - **What**: adicionar teste em `api/tests/Feature/EloquentAiActionRepositoryTest.php` —
    `test_find_by_patient_and_hash_never_returns_another_patients_rows`: criar paciente A e paciente
    B (mesma marca ou marcas distintas), inserir uma `ai_action` para B com `input_hash = 'hash-a'`,
    e asserir `assertSame([], $repository->findByPatientAndHash($patientA->id, 'hash-a'))`.
  - **Where**: `api/tests/Feature/EloquentAiActionRepositoryTest.php`
  - **Verify**: reaplicar a Mutação 4 (remover `->where('patient_id', $patientId)` da linha 40) e
    confirmar que o novo teste falha; restaurar e confirmar verde.
  - **Done when**: Mutação 4 é morta e `php artisan test` continua exit 0.
- **Priority**: Major

### Fix 2 (opcional, não-bloqueante): Timeout de 15s não é asserido (AIBE-05)

- **Root cause**: `AnthropicClient::TIMEOUT_SECONDS = 15`
  (`api/app/Infrastructure/Llm/AnthropicClient.php:20`) é a decisão registrada em Assumptions, mas
  nenhum teste observa o valor — só o efeito (`LlmTimeout` → `502`). Trocar 15 por 120 não quebra
  nada.
- **Fix task**: em `api/tests/Unit/AnthropicClientTest.php`, asserir o timeout aplicado ao request
  (via `Http::assertSent` inspecionando as opções do request, ou expondo a constante e asseriando
  `15`).
- **Priority**: Minor — **não bloqueia o PASS**. O outcome que o spec define para AIBE-05 (`502`
  `AI_UNAVAILABLE`, nada persistido) está coberto e discriminado; o valor `15` é uma decisão de
  Assumptions, não um outcome de AC. Fica registrado como spec-precision gap aberto.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| AIBE-01 | Complete | ✅ Verified |
| AIBE-02 | ⚠️ Verified com ressalva | ✅ Verified — escopo por paciente do cache agora provado e discriminado (`EloquentAiActionRepositoryTest.php:103`, Mutação 4 morta) |
| AIBE-03 | Complete | ✅ Verified |
| AIBE-04 | Complete | ✅ Verified |
| AIBE-05 | Complete | ⚠️ Verified com spec-precision gap (valor 15s não asserido) |
| AIBE-06 | Complete | ✅ Verified |
| AIBE-07 | Complete | ✅ Verified |
| AIBE-08 | Complete | ✅ Verified |
| AIBE-09 | Complete | ✅ Verified |
| AIBE-10 | Complete | ✅ Verified |
| AIBE-11 | Complete | ✅ Verified |
| AIBE-12 | Complete | ✅ Verified |
| AIBE-13 | Complete | ✅ Verified |
| AIBE-14 | Complete | ✅ Verified |
| AIBE-15 | Complete | ✅ Verified |
| AIBE-16 | Complete | ✅ Verified |
| AIBE-17 | Complete | ✅ Verified |
| AIBE-18 | Complete | ✅ Verified |
| AIBE-19 | Complete | ✅ Verified |
| AIBE-20 | Complete | ✅ Verified |
| AIBE-21 | Complete | ✅ Verified |
| AIBE-22 | Complete | ✅ Verified |
| AIBE-23 | Complete | ✅ Verified |
| Edge Case 3 (cache nunca cruza pacientes) | ❌ Needs Fix | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready — **PASS** (iteração 2; o mutante sobrevivente da iteração 1 foi morto, sem
regressão no gate)

**Spec-anchored check**: 23/23 ACs com evidência `file:line`; 22 casam exatamente com o outcome do
spec, 1 spec-precision gap não-bloqueante (AIBE-05, valor 15s)
**Sensor**: 4/4 mutações mortas
**Gate**: 143 passed, 0 failed, 0 skipped — layer boundary, Pint e PHPStan limpos

**What works**:

- Distinção `502 AI_UNAVAILABLE` (falha do provedor) × `503 AI_DISABLED` (kill switch) está correta
  e coberta nos dois sentidos (`Handler.php:36-42`, testes `:130`, `:144`, `:159`, `:207`, `:291`)
- Kill switch bloqueia de fato os **três** endpoints (POST/GET/PATCH), com asserção de estado
  inalterado no PATCH
- Transição terminal: `409 AI_ACTION_ALREADY_RESOLVED` provado no HTTP e no domínio; mutação da
  guarda terminal foi morta
- Retry exatamente-uma-vez em schema inválido, e ausência de retry em timeout, ambos asseridos por
  contagem de chamadas (`timesCalled()` 2 vs 1)
- Sem PII no prompt: `AiPromptInput` não tem campo de nome/id, e o corpo enviado é verificado
- Rate limit: `429` na 11ª POST, `GET`/`PATCH` intocados, `throttle:ai` só na rota POST
- Camadas respeitadas: `Domain/` sem `Illuminate\`, Controller sem Eloquent/regra, zero comentários
  inline novos
- **Novo na iteração 2**: o cache de ações de IA é provadamente escopado por paciente — vazamento
  clínico entre prontuários é agora detectado pela suíte

**Issues found**:

1. ~~**Escopo do cache por paciente não é testado**~~ — ✅ resolvido em `fc8badf` e verificado por
   reaplicação da Mutação 4 (agora morta).
2. **Timeout de 15s não é asserido** (AIBE-05) — spec-precision gap, **Minor, não-bloqueante**.
   Fica em aberto (ver Fix 2); o outcome HTTP definido pelo spec está coberto.
3. ~~**`design.md` não commitado**~~ — ✅ resolvido em `fc8badf`.

**Next steps**: feature aprovada. Opcionalmente endereçar o Fix 2 (Minor) numa passada futura;
nenhum fix→re-verify adicional é necessário (encerrado na iteração 2 de no máximo 3).
