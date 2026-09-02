# Fase 3 — Seleção de Provedor de LLM Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its
Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is
the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review,
Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

**Usuário pediu explicitamente para NÃO executar ainda** (revisão antes do Execute) — este arquivo
existe só para aprovação. Não iniciar Execute até o usuário confirmar.

---

**Design**: `.specs/features/fase-3-llm-provider-fallback/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Gerado a partir do código (`api/tests/Unit/AnthropicClientTest.php`,
> `api/tests/Unit/DomainServiceProviderTest.php`, `api/composer.json` scripts) e do
> `CLAUDE.md` §2.3/§6.2/§10. Guidelines encontradas: nenhuma em `AGENTS.md`/`CONTRIBUTING.md`
> específica de teste — CLAUDE.md §10 e os testes existentes já citados servem de piso.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Config (`config/services.php`, `.env.example`) | none | build gate only | - | `composer test` |
| `GeminiClient` (Infrastructure/Llm) | unit | 1:1 com LLMSEL-01..06 — sucesso, resposta não-2xx, JSON fora do schema, timeout/conexão, ausência de PII no corpo enviado, mesmo padrão de `AnthropicClientTest` | `api/tests/Unit/GeminiClientTest.php` | `php artisan test --filter=GeminiClientTest` |
| `DomainServiceProvider` (seleção de `LlmClient`) | unit | 1:1 com LLMSEL-07..10 — chave Anthropic preenchida resolve Anthropic, vazia/ausente/só-espaço resolve Gemini, resolução via `bind()` reavaliada a cada chamada | `api/tests/Unit/DomainServiceProviderTest.php` (estende o existente) | `php artisan test --filter=DomainServiceProviderTest` |
| README / ADR (documentação) | none | build gate only (revisão humana, não testável por script) | - | `composer test` (garante que nada quebrou) |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Após tasks com testes unitários apenas | `php artisan test --filter=<ClasseDoTeste>` |
| Build | Última task da feature / tasks de config e docs | `composer test && vendor/bin/pint --test && vendor/bin/phpstan analyse` |

---

## Execution Plan

Fases ordenadas, executadas em sequência — cada fase completa antes da próxima começar.

### Phase 1: Config e adapter

```
T1 → T2
```

### Phase 2: Seleção de provedor

```
T2 → T3
```

### Phase 3: Documentação

```
T3 → T4
```

---

## Task Breakdown

### T1: Config do Gemini

**What**: Adiciona o bloco `gemini` (`key`, `model`) em `config/services.php` e as duas linhas
correspondentes em `api/.env.example`, mesmo padrão do bloco `anthropic` já existente.
**Where**: `api/config/services.php` (modify), `api/.env.example` (modify)
**Depends on**: None
**Reuses**: bloco `anthropic` já existente em `config/services.php:31-34`
**Requirement**: LLMSEL-01 (pré-requisito de config para o adapter poder ler a chave/modelo)

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [x] `config('services.gemini.key')` lê `GEMINI_API_KEY` do ambiente
- [x] `config('services.gemini.model')` lê `GEMINI_MODEL`, com default `gemini-2.5-flash` quando a
      env var não está setada
- [x] `api/.env.example` tem `GEMINI_API_KEY=` e `GEMINI_MODEL=gemini-2.5-flash`, logo abaixo do
      bloco `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL`
- [x] Gate check passa: `composer test`

**Tests**: none
**Gate**: build

---

### T2: `GeminiClient`

**What**: Nova classe `GeminiClient implements LlmClient`, mesma forma do `AnthropicClient` (método
único `generate()`), payload/parsing específicos da API Generative Language do Google (ver design.md
— chave na query string, `generationConfig.response_mime_type: application/json`, texto da resposta
em `candidates.0.content.parts.0.text`).
**Where**: `api/app/Infrastructure/Llm/GeminiClient.php`
**Depends on**: T1
**Reuses**: `api/app/Infrastructure/Llm/AnthropicClient.php` (estrutura, regras de validação do
schema, exceptions lançadas), `AiSuggestion::fromArray()`
**Requirement**: LLMSEL-01, LLMSEL-02, LLMSEL-03, LLMSEL-04, LLMSEL-05, LLMSEL-06

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [x] Resposta `200` com JSON válido conforme schema → `generate()` devolve `AiSuggestion`
      equivalente (LLMSEL-01)
- [x] Resposta HTTP não-2xx → lança `LlmInvalidResponse` com o status na mensagem (LLMSEL-02)
- [x] JSON fora do schema (campo faltando, enum inválido, `actions` vazio ou >5) → lança
      `LlmInvalidResponse` (LLMSEL-03)
- [x] `ConnectionException` na chamada HTTP → lança `LlmTimeout` (LLMSEL-04)
- [x] Corpo da requisição enviado ao Gemini nunca contém `name`/`id` do paciente, só
      idade/goal/biomarcadores (LLMSEL-05)
- [x] Chamada HTTP usa timeout de 15 segundos (LLMSEL-06) — garantido pela constante
      `TIMEOUT_SECONDS = 15`, mesmo padrão (não testado por asserção direta) do `AnthropicClient`
      irmão
- [x] Gate check passa: `php artisan test --filter=GeminiClientTest`
- [x] Test count: 7 testes passam (5 cenários do `AnthropicClientTest` + 1 extra cobrindo a
      diferença de payload do Gemini — chave na query string, não no corpo/header)

**Tests**: unit
**Gate**: quick

---

### T3: Seleção de provedor no `DomainServiceProvider`

**What**: Troca `$this->app->bind(LlmClient::class, AnthropicClient::class)` por uma closure que
resolve `AnthropicClient` quando `ANTHROPIC_API_KEY` está preenchida, senão `GeminiClient`.
**Where**: `api/app/Providers/DomainServiceProvider.php` (modify)
**Depends on**: T2
**Reuses**: mesmo método `register()`, mesmo estilo dos outros 5 bindings da classe
**Requirement**: LLMSEL-07, LLMSEL-08, LLMSEL-09, LLMSEL-10

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [ ] `config(['services.anthropic.key' => 'sk-ant-x'])` + `$this->app->make(LlmClient::class)` →
      instância de `AnthropicClient` (LLMSEL-07)
- [ ] `config(['services.anthropic.key' => ''])` (e também `null` e `'   '`) + mesma chamada →
      instância de `GeminiClient` (LLMSEL-08)
- [ ] Nenhuma outra classe (`AiActionService`, `AiActionController`) referencia qual provedor está
      ativo — confirmado por leitura, não é testável por asserção direta (LLMSEL-09)
- [ ] Binding continua sendo `bind()`, não `singleton()` — os dois testes acima resolvendo em
      sequência na mesma execução provam isso (LLMSEL-10)
- [ ] Gate check passa: `php artisan test --filter=DomainServiceProviderTest`
- [ ] Test count: 2+ testes novos passam, suíte existente de `DomainServiceProviderTest` sem
      regressão

**Tests**: unit
**Gate**: quick

---

### T4: Documentação da decisão (README + ADR)

**What**: Registra a escolha de provedor configurável (Anthropic → Gemini) na documentação de
entrega — pedido explícito do usuário para a entrega final não esconder essa decisão. Cria
`docs/adr/0002-selecao-de-provedor-llm.md` (formato dos ADRs já existentes, ver
`docs/adr/0001-servidor-http-embutido.md`) e atualiza o README raiz: a seção que já cita
`ANTHROPIC_API_KEY` (linha ~28) passa a explicar as duas variáveis, a ordem de prioridade, e o
motivo (rodar sem custo com o free tier do Gemini agora, caminho pago pronto depois).
**Where**: `docs/adr/0002-selecao-de-provedor-llm.md` (new), `README.md` (modify)
**Depends on**: T3
**Reuses**: formato/tom do ADR 0001 existente
**Requirement**: nenhum requirement funcional novo — é documentação da decisão já coberta por
LLMSEL-07/08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] ADR novo explica o problema (custo da Anthropic), a decisão (Opção A — seleção no boot por env
      var, sem fallback em runtime), as alternativas consideradas (fallback em runtime, terceiro
      provedor, Ollama local) e por que foram descartadas
- [ ] README raiz menciona `GEMINI_API_KEY`/`GEMINI_MODEL` ao lado de `ANTHROPIC_API_KEY`, com a
      ordem de prioridade explícita
- [ ] Gate check passa: `composer test && vendor/bin/pint --test && vendor/bin/phpstan analyse`

**Tests**: none
**Gate**: build

**Commit**: `docs(api): document Anthropic-to-Gemini provider selection decision`

---

## Phase Execution Map

```
Phase 1: T1 → T2
Phase 2: T2 → T3
Phase 3: T3 → T4
```

Execução estritamente sequencial — 4 tasks cabem num único batch (bem abaixo do limiar de 8 que
dispararia oferta de sub-agentes).

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Config Gemini | 2 arquivos, 1 conceito coeso (config) | ✅ Granular |
| T2: `GeminiClient` | 1 arquivo | ✅ Granular |
| T3: Seleção no `DomainServiceProvider` | 1 arquivo | ✅ Granular |
| T4: Documentação | 2 arquivos, 1 conceito coeso (registro da decisão) | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | Phase 1, sem seta de entrada | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1: Config Gemini | Config | none | none | ✅ OK |
| T2: `GeminiClient` | Adapter LLM | unit | unit | ✅ OK |
| T3: Seleção no Provider | Provider (seleção) | unit | unit | ✅ OK |
| T4: Documentação | README/ADR | none | none | ✅ OK |

---

## Manual Verification (pós-Execute, fora da automação)

Não é uma task automatizada porque depende de uma chave real do Gemini, que só o usuário tem:

1. Preencher `GEMINI_API_KEY` em `api/.env` com uma chave real do Google AI Studio (free tier).
2. Reiniciar o container: `docker compose restart api` (não precisa rebuild — só `.env` mudou, é
   bind-mount).
3. `curl -X POST http://localhost:9000/api/v1/patients/<uuid>/ai-actions` deve devolver `201`/`200`
   com ações reais, não `502`.
4. Preencher também `ANTHROPIC_API_KEY` (se/quando o usuário tiver crédito) e repetir o `curl` —
   deve continuar funcionando, agora via Anthropic (prova a troca sem mudança de código).

---

## Tools

Skill usado: `laravel-specialist` em T1-T3 (config Laravel, adapter HTTP, binding no
ServiceProvider — domínio dele). T4 é só documentação, nenhuma skill/MCP necessário. Nenhum MCP
externo necessário em nenhuma task.
