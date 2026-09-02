# ADR-0002: Selecionar provedor de LLM (Anthropic ou Gemini) por presença de env var no boot

## Status

Aceita

## Contexto

`LlmClient` (`app/Domain/AiAction/LlmClient.php`) era bindado direto em `AnthropicClient` no
`DomainServiceProvider`. Sem crédito pago disponível na Anthropic, `ANTHROPIC_API_KEY` ficou vazia
no ambiente do projeto, e toda chamada de geração (`POST /patients/:id/ai-actions`) falhava com
`502 AI_UNAVAILABLE` (`http status 401` da própria Anthropic).

`docs/requisitos-do-produto.md` (fonte de verdade suprema do projeto, linha 20) autoriza
explicitamente "IA: API de LLM (Anthropic, OpenAI ou equivalente)" — a exigência é ter geração de
ações via LLM com contrato validado, não um provedor específico. O free tier do Google Gemini
resolve o problema de custo sem violar esse requisito.

Três formas de resolver isso foram consideradas:

1. **Fallback em runtime** — tentar Anthropic a cada chamada e cair para Gemini só se a chamada
   falhar.
2. **Seleção única no boot** — decidir uma vez, na inicialização do container de dependências, qual
   implementação usar, por presença de `ANTHROPIC_API_KEY`.
3. **Ollama local** — rodar um modelo local via Ollama, eliminando a dependência de qualquer API
   paga.

## Decisão

Seleção única no boot (opção 2). `DomainServiceProvider::register()` binda `LlmClient` com uma
closure: `AnthropicClient` quando `ANTHROPIC_API_KEY` está preenchida (via `filled()`, que trata
`null`, string vazia e string só com espaços como não preenchida), `GeminiClient` caso contrário. O
binding continua `bind()`, não `singleton()` — o container reavalia a decisão a cada resolução, o
que também é o que torna a troca de provedor testável sem reiniciar a aplicação entre os dois
branches.

`GeminiClient` (`app/Infrastructure/Llm/GeminiClient.php`) implementa a mesma interface
`LlmClient` que `AnthropicClient`, com a mesma validação de schema (`risk_level`/`summary`/
`actions[1..5]`) e as mesmas duas exceptions de domínio (`LlmTimeout`, `LlmInvalidResponse`) — o
retry de resposta inválida em `AiActionService` continua funcionando sem mudança nenhuma, porque
ele depende só da interface, nunca da implementação concreta.

### Por que não fallback em runtime

Tentar Anthropic e cair para Gemini só quando a chamada falha custaria uma chamada HTTP a mais
(e potencialmente uma tentativa de autenticação fadada ao erro, com `ANTHROPIC_API_KEY` vazia) em
todo request, sem necessidade real: o cenário concreto do projeto é "tenho uma chave ou não tenho",
decidido no deploy, não "a chave existe mas o provedor está fora do ar nesta chamada específica".
Fallback em runtime é a escolha certa para tolerância a falha transitória de um provedor pago em
produção — não para uma alternância determinística entre "grátis agora" e "pago depois".

### Por que não Ollama local

Rodar um modelo local elimina custo por completo, mas troca a dependência de uma API por uma
dependência de infraestrutura (memória, CPU/GPU, imagem de modelo) que o ambiente de avaliação
deste projeto (Docker Compose simples, container único de API) não foi desenhado para sustentar —
contraria a decisão já registrada em ADR-0001 de manter a superfície de infraestrutura mínima nesta
fase. Fica descartada, não fora de cogitação para sempre: se o projeto migrar para um ambiente com
mais capacidade de cômputo local, vale revisitar.

## Consequências

- Nenhuma camada acima de `Infrastructure/Llm` muda: `AiActionService`, `AiActionController`, o
  cache por hash do snapshot de biomarcadores e o app mobile continuam idênticos — é exatamente o
  caso de uso que a inversão de dependência do CLAUDE.md §6.2 existe para resolver.
- Trocar de provedor em produção (por exemplo, ao obter crédito pago na Anthropic) é só preencher
  `ANTHROPIC_API_KEY` no `.env` e reiniciar o container — nenhum deploy de código novo.
- Com as duas chaves preenchidas, Anthropic sempre vence — não existe hoje um jeito de forçar
  Gemini nesse caso. Se isso virar uma necessidade real (por exemplo, comparar qualidade dos dois
  provedores lado a lado), esta decisão precisa ser revisitada.
- Sem nenhuma das duas chaves preenchidas, o sistema binda `GeminiClient` e a primeira chamada real
  falha por autenticação — mapeado para `502 AI_UNAVAILABLE` pelo caminho de erro já existente.
  Comportamento idêntico ao que o sistema já tinha com `AnthropicClient` sem chave: falha explícita,
  não mascarada.
- Um terceiro provedor exigiria revisitar esta decisão — a closure do `DomainServiceProvider` foi
  desenhada para dois branches, não para uma cadeia de prioridade arbitrária.
