# Fase 3 — Seleção de Provedor de LLM (Anthropic → Gemini) Specification

## Problem Statement

O backend só sabe falar com um provedor de LLM: `DomainServiceProvider` binda `LlmClient` direto em
`AnthropicClient`, e `ANTHROPIC_API_KEY` está vazia no ambiente atual — toda chamada de geração
(`POST /patients/:id/ai-actions`) falha com `502 AI_UNAVAILABLE` (`http status 401`, confirmado ao
vivo). Colocar crédito pago na Anthropic não é uma opção agora. `docs/requisitos-do-produto.md`
(fonte de verdade suprema do projeto) autoriza qualquer provedor equivalente — linha 20: "IA: API de
LLM (Anthropic, OpenAI ou equivalente)" — então o projeto pode rodar de graça com o free tier do
Google Gemini sem violar nenhum requisito. Esta feature adiciona esse segundo adapter e uma seleção
automática no boot do backend, sem exigir nenhuma mudança de código quando uma chave Anthropic paga
for adicionada depois.

## Goals

- [ ] Um segundo adapter `GeminiClient implements LlmClient` gera sugestões válidas usando o free
      tier da API do Google Gemini, com o mesmo contrato de saída (`AiSuggestion`) já usado pelo
      resto do sistema
- [ ] `DomainServiceProvider` escolhe, na inicialização da aplicação, qual implementação de
      `LlmClient` bindar — `AnthropicClient` se `ANTHROPIC_API_KEY` estiver preenchida, senão
      `GeminiClient` — sem exigir mudança de código para trocar de provedor, só a env var
- [ ] Nenhuma camada acima de `Infrastructure/Llm` muda: `AiActionService`, `AiActionController`,
      retry de schema inválido (`AiActionService`), cache por hash e o mobile continuam idênticos
- [ ] `api/.env.example` documenta as duas novas variáveis (`GEMINI_API_KEY`, `GEMINI_MODEL`) com
      placeholder vazio, mesmo padrão de `ANTHROPIC_API_KEY`

## Out of Scope

Explicitamente fora desta feature. Fica para fases seguintes ou não faz parte do projeto.

| Feature | Reason |
| --- | --- |
| Fallback em runtime (tentar Anthropic, cair para Gemini só se a chamada falhar) | Decisão do usuário — Opção A escolhida explicitamente: seleção acontece uma vez no boot, pela presença da env var, não por falha de chamada. Ver Assumptions. |
| Terceiro provedor (OpenAI, Groq, etc.) | Não pedido; a necessidade concreta agora é ter uma alternativa gratuita à Anthropic |
| Mudança no formato de saída validado (`risk_level`/`summary`/`actions[]`) | Fora de escopo — o contrato já existe e os dois adapters devem produzi-lo idêntico |
| Métricas/observabilidade de qual provedor está ativo | Não pedido pelo plano |
| UI mobile mostrando qual provedor gerou a sugestão | Não pedido; o app não sabe e não precisa saber qual `LlmClient` está bindado |
| Retry cross-provider (tentar Gemini se Anthropic falhar na mesma requisição) | Mesma razão do primeiro item — não é a Opção A |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Estratégia de seleção | Opção A: decisão única no boot (`DomainServiceProvider::register()`), por presença de env var — não fallback em runtime por falha de chamada | Decisão explícita do usuário nesta sessão | y |
| Prioridade quando as duas chaves estão preenchidas | `ANTHROPIC_API_KEY` vence | O usuário descreveu o caso como "se `ANTHROPIC_API_KEY` estiver preenchida, usa ele, senão Gemini" — ordem explícita | y |
| Comportamento quando nenhuma das duas chaves está preenchida | Sistema binda `GeminiClient` (é o `else` da condição); a chamada real ao Gemini falha com erro de autenticação do provedor, que já mapeia para `502 AI_UNAVAILABLE` pelo caminho existente (`AiActionService`/`AiActionController`) | Mesmo comportamento que o sistema já tem hoje com `AnthropicClient` e chave vazia — não é uma regressão nova, não precisa de tratamento especial | y |
| Critério de "preenchida" | `Illuminate\Support\Str`/helper `filled()` do Laravel (falsy para `null`, string vazia, ou string só com espaços em branco) | Padrão idiomático do framework já usado no projeto; evita around string vazia vs `null` divergirem | y |
| Endpoint e formato da API Gemini | REST `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}`, corpo `{"contents":[{"parts":[{"text": prompt}]}], "generationConfig": {"response_mime_type": "application/json"}}`, resposta em `candidates[0].content.parts[0].text` | Confirmado via busca web (WebSearch, 2026) — formato REST público e estável da API Generative Language do Google; `response_mime_type: application/json` força saída JSON válida na própria API, reduzindo falha de schema comparado a só pedir "responda em JSON" no prompt (como o adapter Anthropic faz) | y |
| Modelo Gemini padrão | `gemini-2.5-flash`, configurável via `GEMINI_MODEL` | Modelo do free tier ativo em 2026 confirmado via WebSearch; mesmo padrão de configurabilidade de `ANTHROPIC_MODEL` | y |
| Timeout do `GeminiClient` | 15 segundos, igual ao `AnthropicClient` (`fase-3-acoes-ia-backend`, AIBE assumption "Timeout do LlmClient") | Mesma motivação já registrada na feature irmã — não repetir a decisão, só herdar o valor | y |
| Exceptions lançadas pelo `GeminiClient` em falha | Reusa `LlmTimeout` e `LlmInvalidResponse` do `Domain/AiAction/Exceptions`, exatamente como `AnthropicClient` | Contrato de exceção já é do `LlmClient` (implícito no uso que `AiActionService` faz — captura essas duas classes, não uma por provedor); um novo tipo de exceção quebraria o retry existente sem necessidade | y |
| PII no prompt do Gemini | Mesma regra da feature irmã (AIBE-08): só biomarcadores, idade, `goal` — nunca nome/documento | Requisito já estabelecido e vinculante para qualquer `LlmClient`, não é uma decisão nova desta feature | y |

**Open questions: none** — todas resolvidas acima.

---

## User Stories

### P1: Adapter Gemini implementa o contrato `LlmClient` ⭐ MVP

**User Story**: Como backend, eu quero um adapter que fale com a API do Google Gemini e devolva uma
`AiSuggestion` validada, para que o sistema tenha uma alternativa gratuita à Anthropic sem mudar
nenhuma camada acima do adapter.

**Why P1**: Sem um adapter Gemini funcional, não existe nada para selecionar — é a base de tudo
nesta feature.

**Acceptance Criteria**:

1. WHEN `GeminiClient::generate()` recebe um `AiPromptInput` e a API do Gemini responde `200` com um
   JSON que satisfaz o schema (`risk_level`, `summary`, `actions[1..5]` com `title`/`rationale`/
   `biomarkers`/`priority`) THEN o sistema SHALL devolver uma `AiSuggestion` equivalente, populada a
   partir desse JSON.
2. IF a resposta HTTP da API do Gemini não é bem-sucedida (`4xx`/`5xx`) THEN o sistema SHALL lançar
   `LlmInvalidResponse` com o status HTTP na mensagem, mesmo formato de erro do `AnthropicClient`.
3. IF o corpo da resposta não contém um JSON que satisfaça o schema (campo faltando, `risk_level`
   fora do enum, `actions` vazio ou com mais de 5 itens) THEN o sistema SHALL lançar
   `LlmInvalidResponse`, sem persistir nada (a persistência não é responsabilidade do adapter — ver
   `AiActionService` já existente).
4. IF a chamada HTTP falhar por timeout/conexão (`Illuminate\Http\Client\ConnectionException`) THEN
   o sistema SHALL lançar `LlmTimeout`.
5. The system SHALL enviar ao Gemini apenas biomarcadores, idade e `goal` — nunca `name` nem
   qualquer identificador direto do paciente (mesma regra AIBE-08 da feature irmã).
6. The system SHALL usar timeout de 15 segundos na chamada HTTP ao Gemini.

**Independent Test**: Com `Http::fake()` simulando `generativelanguage.googleapis.com/*`, instanciar
`GeminiClient` diretamente e chamar `generate()` com um `AiPromptInput` de teste — mesmo padrão do
`AnthropicClientTest` já existente, sem subir a aplicação inteira.

---

### P2: Seleção automática de provedor no boot

**User Story**: Como operador do backend, eu quero que o sistema use `AnthropicClient` quando
`ANTHROPIC_API_KEY` está preenchida e `GeminiClient` quando não está, para rodar de graça agora e
trocar para produção paga só preenchendo uma env var, sem deploy de código novo.

**Why P2**: É o comportamento que resolve o problema concreto do usuário (custo zero agora, caminho
pago pronto depois) — mas só faz sentido depois que o P1 garante que o adapter alternativo funciona.

**Acceptance Criteria**:

1. WHEN a aplicação resolve `LlmClient` do container e `ANTHROPIC_API_KEY` está preenchida THEN o
   sistema SHALL bindar `AnthropicClient`, independentemente do valor de `GEMINI_API_KEY`.
2. WHEN a aplicação resolve `LlmClient` do container e `ANTHROPIC_API_KEY` NÃO está preenchida
   (`null`, string vazia, ou só espaços em branco) THEN o sistema SHALL bindar `GeminiClient`.
3. The system SHALL manter esta decisão isolada em `DomainServiceProvider::register()` — nenhuma
   outra classe (`AiActionService`, `AiActionController`, testes de contrato) verifica qual provedor
   está ativo.
4. The system SHALL continuar resolvendo `LlmClient` via `bind()` (não `singleton()`), preservando o
   comportamento atual de o container reavaliar a escolha a cada resolução — necessário para os
   testes cobrirem os dois branches trocando a config em tempo de execução.

**Independent Test**: Com `config(['services.anthropic.key' => 'sk-ant-x'])`,
`$this->app->make(LlmClient::class)` devolve uma instância de `AnthropicClient`; com
`config(['services.anthropic.key' => ''])` (ou `null`), a mesma chamada devolve uma instância de
`GeminiClient` — mesmo padrão do `DomainServiceProviderTest` já existente para os outros bindings.

---

## Edge Cases

- IF nenhuma das duas chaves (`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`) está preenchida THEN o sistema
  SHALL bindar `GeminiClient` (é o `else` da condição de seleção) — a chamada real falhará com erro
  de autenticação do provedor Gemini, que já mapeia para `502 AI_UNAVAILABLE` pelo caminho existente
  em `AiActionService`; nenhum tratamento novo é necessário.
- IF `ANTHROPIC_API_KEY` contém só espaços em branco (`"   "`) THEN o sistema SHALL tratá-la como não
  preenchida e bindar `GeminiClient` (mesmo comportamento do helper `filled()` do Laravel).
- WHEN as duas chaves estão preenchidas THEN o sistema SHALL sempre bindar `AnthropicClient` — não
  existe modo de forçar Gemini com a chave Anthropic também presente nesta feature (fora de escopo,
  ver Out of Scope).

---

## Requirement Traceability

| Requirement ID | Story | Task | Status |
| --- | --- | --- | --- |
| LLMSEL-01 | P1: Gemini gera AiSuggestion válida a partir de resposta 200 conforme schema | - | Pending |
| LLMSEL-02 | P1: Resposta HTTP não-2xx → LlmInvalidResponse | - | Pending |
| LLMSEL-03 | P1: JSON fora do schema → LlmInvalidResponse | - | Pending |
| LLMSEL-04 | P1: Falha de conexão/timeout → LlmTimeout | - | Pending |
| LLMSEL-05 | P1: Nunca envia nome/id do paciente ao Gemini | - | Pending |
| LLMSEL-06 | P1: Timeout de 15s na chamada HTTP | - | Pending |
| LLMSEL-07 | P2: ANTHROPIC_API_KEY preenchida → binda AnthropicClient | - | Pending |
| LLMSEL-08 | P2: ANTHROPIC_API_KEY vazia/ausente → binda GeminiClient | - | Pending |
| LLMSEL-09 | P2: Decisão isolada no DomainServiceProvider | - | Pending |
| LLMSEL-10 | P2: bind() reavalia a cada resolução (não singleton) | - | Pending |

**Coverage:** 10 total, 0 mapped to tasks, 10 unmapped ⚠️ (Tasks ainda não criado)

---

## Success Criteria

- [ ] Com `ANTHROPIC_API_KEY` vazia e `GEMINI_API_KEY` preenchida com uma chave real do free tier,
      `POST /api/v1/patients/:id/ai-actions` gera ações de verdade (não `502`)
- [ ] Preencher `ANTHROPIC_API_KEY` depois (sem tocar em código) faz o mesmo endpoint voltar a usar
      Anthropic, verificável pelo teste de seleção do `DomainServiceProvider`
- [ ] `AiActionService`, `AiActionController`, cache por hash, retry de schema inválido e o mobile
      continuam passando nos testes existentes sem nenhuma alteração
- [ ] `composer test` (Pest) passa com os testes novos de `GeminiClient` e da seleção de provedor
