# Fase 3 — Seleção de Provedor de LLM (Anthropic → Gemini) Validation

**Date**: 2026-09-02
**Spec**: `.specs/features/fase-3-llm-provider-fallback/spec.md`
**Diff range**: `3f27fc7..bb908d4` (5 commits: docs de spec/design + T1..T4)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1: Config do Gemini | ✅ Done | `api/config/services.php:36-39` (`key` de `GEMINI_API_KEY`, `model` de `GEMINI_MODEL` com default `gemini-2.5-flash`); `api/.env.example:41-42` logo abaixo do bloco Anthropic, placeholder vazio |
| T2: `GeminiClient` | ✅ Done | `api/app/Infrastructure/Llm/GeminiClient.php:1-101`; 7 testes em `api/tests/Unit/GeminiClientTest.php` — contagem bate com o "Test count: 7" declarado |
| T3: Seleção no `DomainServiceProvider` | ✅ Done | `api/app/Providers/DomainServiceProvider.php:31-36` (closure com `filled()`, `bind()` e não `singleton()`); 5 testes novos em `api/tests/Unit/DomainServiceProviderTest.php:50-96` (4 pré-existentes + 5 = 9), contagem bate |
| T4: Documentação (ADR + README) | ✅ Done | `docs/adr/0002-selecao-de-provedor-llm.md:1-76` cobre problema, decisão Opção A, e as 3 alternativas descartadas (runtime fallback, terceiro provedor, Ollama); `README.md:26-32` cita as duas variáveis e a ordem de prioridade |

Nenhuma task declarada como feita ficou por fazer, e nenhum arquivo fora dos 4 escopos declarados foi
tocado (`git diff --stat 3f27fc7..HEAD` = só spec/design/tasks/STATE, config, adapter, provider,
dois arquivos de teste, ADR e README).

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| LLMSEL-01 — Gemini responde 200 com JSON no schema → `AiSuggestion` populada a partir desse JSON | `risk_level`/`summary`/`actions[]` do JSON viram os campos da entidade | `api/tests/Unit/GeminiClientTest.php:61` — `assertSame('moderate', $suggestion->riskLevel)`; `:62` `assertSame('Glicemia levemente elevada.', $suggestion->summary)`; `:63` `assertCount(1, $suggestion->actions)`; `:64` `assertSame('Reduzir açúcar refinado', $suggestion->actions[0]->title)` | ✅ PASS |
| LLMSEL-02 — HTTP não-2xx → `LlmInvalidResponse` com o status na mensagem | mensagem no mesmo formato do `AnthropicClient` (`"http status {status}"`) | `api/tests/Unit/GeminiClientTest.php:75-76` — `expectException(LlmInvalidResponse::class)` + `expectExceptionMessage('http status 403')` (valor exato, não só o tipo) | ✅ PASS |
| LLMSEL-03 — JSON fora do schema → `LlmInvalidResponse`, sem persistir nada | campo faltando, `risk_level` fora do enum, `actions` vazio ou >5 | `api/tests/Unit/GeminiClientTest.php:104` — enum inválido + `actions` ausente; `:121` — texto não-JSON. Regras `min:1`/`max:5` existem em `api/app/Infrastructure/Llm/GeminiClient.php:68` mas **não** têm asserção dedicada para `actions: []` nem para 6 itens | ⚠️ Parcial — sub-casos representativos cobertos, dois sub-casos enumerados na spec sem asserção própria |
| LLMSEL-04 — `ConnectionException` → `LlmTimeout` | tipo de exceção `LlmTimeout` | `api/tests/Unit/GeminiClientTest.php:134` — `expectException(LlmTimeout::class)` com `Http::fake` lançando `ConnectionException` em `:128-130` | ✅ PASS |
| LLMSEL-05 — nunca envia nome/id do paciente | corpo só com idade, `goal` e biomarcadores | `api/tests/Unit/GeminiClientTest.php:171-177` — `Http::assertSent` afirmando `! str_contains($body, '"name"') && ! str_contains($body, '"id"') && str_contains($body, 'lose_weight')` (prova negativa **e** positiva) | ✅ PASS |
| LLMSEL-06 — timeout de 15 s na chamada HTTP | valor exato 15 | Sem asserção de teste. Evidência de código: `api/app/Infrastructure/Llm/GeminiClient.php:20` (`TIMEOUT_SECONDS = 15`) e `:32` (`Http::timeout(self::TIMEOUT_SECONDS)`) — idêntico ao irmão `api/app/Infrastructure/Llm/AnthropicClient.php:20` | ⚠️ Gap de cobertura conhecido — o fake HTTP do Laravel não expõe o timeout ao `assertSent`; declarado explicitamente em `tasks.md` T2 ("não testado por asserção direta") |
| LLMSEL-07 — `ANTHROPIC_API_KEY` preenchida → `AnthropicClient` | instância de `AnthropicClient` | `api/tests/Unit/DomainServiceProviderTest.php:56` — `assertInstanceOf(AnthropicClient::class, $resolved)` após `config(['services.anthropic.key' => 'sk-ant-x'])` em `:52` | ✅ PASS |
| LLMSEL-08 — chave vazia/`null`/só-espaços → `GeminiClient` | instância de `GeminiClient` nos três casos | `api/tests/Unit/DomainServiceProviderTest.php:65` (`''`), `:74` (`null`), `:83` (`'   '`) — `assertInstanceOf(GeminiClient::class, $resolved)` em cada um | ✅ PASS |
| LLMSEL-09 — decisão isolada no `DomainServiceProvider` | nenhuma outra classe checa o provedor ativo | Sem asserção de teste. Verificado por inspeção do verificador: `grep -rn "AnthropicClient\|GeminiClient" api/app` fora de `Infrastructure/Llm/` retorna **apenas** `api/app/Providers/DomainServiceProvider.php:13,14,33,34` — nenhuma referência em `Application/` ou `Http/` | ⚠️ Verificado por inspeção, não por asserção (não é testável por asserção direta; nota já registrada em `tasks.md` T3) |
| LLMSEL-10 — `bind()` reavalia a cada resolução (não `singleton()`) | duas resoluções na mesma execução devolvem classes diferentes | `api/tests/Unit/DomainServiceProviderTest.php:94-95` — `assertInstanceOf(AnthropicClient::class, $anthropicResolution)` e `assertInstanceOf(GeminiClient::class, $geminiResolution)`, resolvidas em sequência com a config trocada entre elas (`:88`, `:91`) — falharia com `singleton()` | ✅ PASS |

**Status**: ⚠️ 7/10 ACs totalmente ancorados em asserção; 3 sinalizados (LLMSEL-03 parcial,
LLMSEL-06 e LLMSEL-09 verificados por código/inspeção com justificativa registrada em `tasks.md`).
Nenhum dos três é defeito de comportamento — os três caminhos existem no código e são idênticos ao
`AnthropicClient` já validado na feature irmã.

---

## Discrimination Sensor

Executado em git worktree isolado (`git worktree add`), nunca no tree real.

> **Nota metodológica**: a primeira montagem do worktree usou `vendor/` como symlink para o repo
> real. O autoloader do Composer resolve `__DIR__` através do symlink, então as classes carregadas
> vinham de `/Users/brunosilva/Github/tecsa-health/api/app` e **toda** mutação parecia sobreviver
> (falso negativo do sensor). Corrigido copiando `vendor/` (`cp -a`) e rodando `composer
> dump-autoload` dentro do worktree; os resultados abaixo são os da montagem correta.

| Mutation | File:line | Description | Killed? |
| --- | --- | --- | --- |
| 1 | `api/app/Providers/DomainServiceProvider.php:33` | Inverteu os dois ramos do ternário (`filled()` → `GeminiClient`, senão `AnthropicClient`) | ✅ Killed — 5 failed |
| 2 | `api/app/Infrastructure/Llm/GeminiClient.php:49` | Caminho de extração do texto `candidates.0.content.parts.0.text` → `candidates.0.content.text` | ✅ Killed — 3 failed |
| 3 | `api/app/Infrastructure/Llm/GeminiClient.php:27` | Removeu a chave da query string (`?key=...` some da URL) | ✅ Killed — 1 failed (`test_generate_sends_api_key_in_query_string_not_body`) |
| 4 | `api/app/Infrastructure/Llm/GeminiClient.php:45` | `if ($response->failed())` → `if ($response->successful())` | ✅ Killed — 4 failed |

**Sensor depth**: P0-full nas duas classes novas (adapter + seleção)
**Result**: 4/4 killed - PASS ✅

Tree real confirmado inalterado após o sensor: `git status --porcelain` vazio antes e depois
(worktree removido com `git worktree remove --force` + `git worktree prune`).

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ — closure de 3 linhas no `register()`, sem Factory/Resolver dedicado (coerente com design.md "no abstractions for single-use code") |
| Surgical changes | ✅ — 1 linha trocada por 5 no provider; nenhuma assinatura de interface, Service ou Controller tocada |
| No scope creep | ✅ — exatamente os 4 escopos de T1..T4; nenhum terceiro provedor, nenhuma métrica de provedor, nenhuma mudança de UI (todos listados em Out of Scope) |
| Matches patterns | ✅ — `GeminiClient` espelha `AnthropicClient` (`final class`, `TIMEOUT_SECONDS`, mesmas regras de `Validator::make`, mesmas duas exceptions, mesmo `buildPrompt`); duplicação literal é a justificada em design.md, com as 3 diferenças previstas (URL com chave em query string, `generationConfig.response_mime_type`, caminho de extração) |
| Spec-anchored outcome check (asserted values match spec) | ✅ — valores afirmados batem com o texto da spec (`'http status 403'`, enum `moderate`, três formas de chave vazia) |
| Per-layer Coverage Expectation met | ⚠️ — matriz pedia "1:1 com LLMSEL-01..06"; LLMSEL-06 fica por inspeção de código (limitação do `Http::fake`), LLMSEL-03 cobre 2 dos 4 sub-casos |
| Every test maps to a spec requirement — no unclaimed tests | ✅ — 12 testes novos, todos rastreáveis a LLMSEL-01..08/10 |
| CLAUDE.md §2.3 tipagem estrita | ✅ — `declare(strict_types=1)`, type hints completos, sem `mixed`/`@phpstan-ignore`; PHPStan nível configurado passa limpo |
| CLAUDE.md §6.1/§6.2 camadas | ✅ — `Domain/` sem `Illuminate\` (grep limpo); interface `LlmClient` no Domain, implementação em `Infrastructure/Llm`, binding só no `DomainServiceProvider`; nenhum `Application/` ou `Http/` referencia classe concreta de provedor |
| CLAUDE.md §2.4 segredos | ✅ — nenhuma chave real no diff; `.env.example` com `GEMINI_API_KEY=` vazio; a chave só é lida via `config()`/`env()` |
| Documented guidelines followed | ✅ — `CLAUDE.md` §2.3, §2.4, §3 (backend usa `Http::` dentro de adapter, sem SDK), §6.1, §6.2, §10, §12 (sem comentário descritivo de linha) |

---

## Edge Cases

- [x] **Nenhuma das duas chaves preenchida → binda `GeminiClient`** — `api/tests/Unit/DomainServiceProviderTest.php:59-66`: `services.anthropic.key` é `''` e `services.gemini.key` fica sem valor no ambiente de teste; resolve `GeminiClient`, exatamente o `else` da condição.
- [x] **`ANTHROPIC_API_KEY` com só espaços (`"   "`) → tratada como não preenchida** — `api/tests/Unit/DomainServiceProviderTest.php:77-84`, `assertInstanceOf(GeminiClient::class, ...)`; confirma o comportamento de `filled()` prometido pela spec.
- [ ] **As duas chaves preenchidas → sempre `AnthropicClient`** — `api/tests/Unit/DomainServiceProviderTest.php:50-57` cobre "Anthropic preenchida → Anthropic", mas **não** define `services.gemini.key` simultaneamente, então a cláusula "independentemente do valor de `GEMINI_API_KEY`" (LLMSEL-07) não tem asserção literal. Risco real ≈ zero (a closure em `api/app/Providers/DomainServiceProvider.php:32` só lê a chave da Anthropic), mas é um gap de precisão.

---

## Gate Check

- **Gate command**: `composer test && vendor/bin/pint --test && vendor/bin/phpstan analyse` (executado de `api/`)
- **Result**: `composer test` → **23 passed, 0 failed, 132 deprecated** (383 assertions), exit 0
- **Pint**: `{"tool":"pint","result":"passed"}`, exit 0
- **PHPStan**: `[OK] No errors` (82/82 arquivos), exit 0 — rodado com `--memory-limit=512M`, contornando o limite de 128M do ambiente (quirk pré-existente, não do código)
- **Test count before feature**: 143
- **Test count after feature**: 155
- **Delta**: +12 (7 `GeminiClientTest` + 5 `DomainServiceProviderTest`)
- **Skipped tests**: nenhum
- **Failures**: nenhuma
- **Deprecated**: os 132 "deprecated" são ruído pré-existente de `PDO::MYSQL_ATTR_SSL_CA` no PHP 8.5, disparado por `api/config/database.php:81` — não relacionado a esta feature e não é falha. Confirmado empiricamente pelo sensor que testes marcados `DEPR` **continuam executando asserções e falham de verdade** quando o código quebra (mutação 1 produziu 5 `FAILED` reais).

Gate específico das tasks: `php artisan test --filter='GeminiClientTest|DomainServiceProviderTest'`
→ 16 testes, 21 assertions, 0 falhas.

---

## Fix Plans (if issues found)

Nenhum bloqueador. Três itens opcionais de reforço de teste, todos Minor:

### Fix 1 (Minor, opcional): asserção literal do timeout de 15 s (LLMSEL-06)

- **Root cause**: `Http::fake()` do Laravel não registra o timeout na requisição gravada, então
  `assertSent` não alcança o valor.
- **Fix task**: se quiser cobertura literal, expor `TIMEOUT_SECONDS` via reflexão num teste, ou
  aceitar a inspeção de código como está (o `AnthropicClient` irmão vive com o mesmo gap).
- **Priority**: Minor

### Fix 2 (Minor, opcional): sub-casos de `actions` fora do intervalo (LLMSEL-03)

- **Root cause**: os cenários `actions: []` e `actions` com 6 itens não têm asserção própria,
  embora as regras `min:1`/`max:5` existam em `GeminiClient.php:68`.
- **Fix task**: dois testes adicionais em `GeminiClientTest`, mesmo molde do teste de enum inválido.
- **Priority**: Minor

### Fix 3 (Cosmetic): edge case "as duas chaves preenchidas"

- **Root cause**: o teste de Anthropic não seta `services.gemini.key` junto.
- **Fix task**: adicionar `'services.gemini.key' => 'gemini-x'` ao `config([...])` de
  `DomainServiceProviderTest.php:52`, tornando a cláusula "independentemente de `GEMINI_API_KEY`"
  literalmente afirmada. Uma linha.
- **Priority**: Cosmetic

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| LLMSEL-01 | Done | ✅ Verified |
| LLMSEL-02 | Done | ✅ Verified |
| LLMSEL-03 | Done | ✅ Verified (parcial — 2 de 4 sub-casos com asserção; regra presente em `GeminiClient.php:68`) |
| LLMSEL-04 | Done | ✅ Verified |
| LLMSEL-05 | Done | ✅ Verified |
| LLMSEL-06 | Done | ✅ Verified por inspeção de código (`GeminiClient.php:20,32`) — sem asserção possível via `Http::fake` |
| LLMSEL-07 | Done | ✅ Verified |
| LLMSEL-08 | Done | ✅ Verified |
| LLMSEL-09 | Done | ✅ Verified por inspeção (grep: nenhuma referência a provedor concreto fora de `DomainServiceProvider.php:13,14,33,34`) |
| LLMSEL-10 | Done | ✅ Verified |

**Coverage**: 10/10 requisitos verificados, 0 com defeito, 3 com evidência parcialmente de código em
vez de asserção.

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 7/10 ACs totalmente ancorados em asserção de teste; 3 gaps de precisão
sinalizados (LLMSEL-03 parcial, LLMSEL-06 e LLMSEL-09 por inspeção) — nenhum é defeito de
comportamento
**Sensor**: 4/4 mutations killed
**Gate**: 23 passed, 0 failed; Pint passed; PHPStan `[OK] No errors`

**Result**: PASS ✅

**What works**:

- `GeminiClient` implementa `LlmClient` com o mesmo contrato de saída (`AiSuggestion`), as mesmas
  duas exceptions de domínio e as mesmas regras de schema do `AnthropicClient` — o retry de resposta
  inválida em `AiActionService` continua funcionando sem qualquer mudança acima do adapter.
- A seleção de provedor no boot funciona nos quatro estados de `ANTHROPIC_API_KEY` (preenchida,
  vazia, `null`, só espaços) e permanece em `bind()`, reavaliada a cada resolução — provado por
  teste e confirmado pelo mutante que inverte os ramos.
- Nenhuma camada acima de `Infrastructure/Llm` conhece o provedor ativo (grep limpo), respeitando a
  inversão de dependência do CLAUDE.md §6.2.
- Documentação da decisão entregue: ADR-0002 com as três alternativas e por que foram descartadas,
  e README com a ordem de prioridade explícita.

**Issues found**: apenas os três reforços de teste Minor/Cosmetic listados em Fix Plans — nenhum
bloqueia a entrega.

**Next steps**: verificação manual com chave real do Gemini free tier (`tasks.md` §Manual
Verification) — fora do alcance automatizado desta validação, depende de credencial que só o
usuário tem.
