# tecsa-health — api

Backend Laravel 11 do app white-label de nutricionista. Domínio isolado de framework,
Eloquent confinado à camada de infraestrutura, contrato de API exposto via OpenAPI gerado a
partir do código. Ver a arquitetura completa e as regras invioláveis em
[`CLAUDE.md`](../CLAUDE.md).

## Arquitetura em camadas

```
Http\Controllers  →  Application\Services  →  Domain\...\Repository (interface)
                            ↓                          ↑
                  Domain\...\LlmClient          Infrastructure\Persistence\Eloquent
                     (interface)                        ↓
                            ↑                        Postgres
              Infrastructure\Llm\AnthropicClient / GeminiClient
```

| Camada | Pode | Não pode |
|---|---|---|
| Controller | FormRequest, chamar Service, devolver Resource e status | Eloquent, query, regra, cálculo, `if` de negócio |
| Service (`Application/`) | Regra de negócio, orquestração, chamar interfaces do Domain | `Model::`, `DB::`, `Request`, `response()` |
| Domain | Entidades, enums, objetos de valor, interfaces, regra pura | Laravel, Eloquent, HTTP, facades |
| Repository (impl, `Infrastructure/`) | Eloquent, query, mapear Model → entidade de domínio | regra de negócio, chamar Service |
| Adapter LLM (`Infrastructure/Llm/`) | HTTP para o provedor, parse e validação de forma | decidir o que fazer com o resultado |

Interfaces vivem em `Domain/`, implementações em `Infrastructure/`, e o binding entre as duas
fica isolado em `app/Providers/DomainServiceProvider.php`. O Repository sempre devolve entidade
de domínio, nunca Model do Eloquent — isso é o que permite o Service nunca conhecer Eloquent.

A fronteira é garantida mecanicamente, não só por convenção: `composer test` roda
`scripts/check-layer-boundary.sh` no `pretest`, que falha se `Illuminate\` aparecer em
`app/Domain/`, se `DB::`/`Models\` aparecerem em `app/Application/` ou
`app/Http/Controllers/`, ou se `$request->all()` aparecer em qualquer controller.

## Como rodar os testes

```bash
composer test        # pretest (guard-rail de camada) + suíte Pest completa
```

`tests/Unit/` roda sem banco (inclui `BiomarkerStatus::from()`, regra pura de faixa de
referência). `tests/Feature/` usa `RefreshDatabase` contra o Postgres configurado em
`.env.testing`.

## Lint e análise estática

```bash
composer lint         # Laravel Pint — PSR-12
composer stan          # PHPStan/Larastan nível 6+
```

Rode os dois antes de qualquer commit. Nenhum dos dois é opcional para considerar uma mudança
pronta — ver `CLAUDE.md` §13 (Definition of Done).

## Endpoints principais

Todos sob o prefixo `/api/v1`. Fonte de verdade: `routes/api.php`.

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/feature-flags` | Flags de feature com escopo por marca (`aiActionsEnabled` é o kill switch de IA) |
| `GET` | `/patients` | Lista paginada por cursor, com busca |
| `POST` | `/patients` | Cria paciente |
| `GET` | `/patients/{id}` | Detalhe do paciente |
| `PATCH` | `/patients/{id}` | Atualiza dados do paciente |
| `PATCH` | `/patients/{id}/status` | Transição de ciclo de vida (`active`/`inactive`/`completed`) |
| `DELETE` | `/patients/{id}` | Soft delete |
| `GET` | `/patients/{id}/biomarkers` | Biomarcadores do paciente, com status derivado da faixa de referência |
| `POST` | `/patients/{id}/biomarkers` | Cria biomarcador manualmente |
| `GET` | `/patients/{id}/ai-actions` | Lista ações de acompanhamento sugeridas por IA |
| `POST` | `/patients/{id}/ai-actions` | Gera novas ações via LLM (rate limit `throttle:ai`, kill switch aplicado) |
| `PATCH` | `/ai-actions/{id}` | Aceita ou descarta uma ação sugerida |
| `DELETE` | `/ai-actions/{id}` | Remove uma ação |

Status HTTP seguem a tabela de `CLAUDE.md` §6.3 (201 com `Location` na criação, 204 sem corpo,
422 para corpo inválido, 503 quando o kill switch de IA está desligado, etc.). Erros sempre no
mesmo envelope (`{ "error": { "code", "message", "details" } }`), produzido pelo
`Exceptions\Handler` global a partir de exceções de domínio — nenhum controller monta erro à
mão.

## Documentação OpenAPI

A API expõe um contrato OpenAPI gerado automaticamente a partir dos Controllers, FormRequests e
API Resources via [`dedoc/scramble`](https://scramble.dedoc.co/) — não é escrito à mão, então
não diverge do código.

Com a API rodando (`docker compose up -d --wait` ou `php artisan serve --port=9000`):

```
http://localhost:9000/docs/api
```

## Provedor de LLM

O adapter (`Infrastructure/Llm/AnthropicClient.php` ou `GeminiClient.php`) é escolhido no boot
por presença de env var: `ANTHROPIC_API_KEY` preenchida usa Anthropic, senão usa
`GEMINI_API_KEY` (free tier). Ver
[`docs/adr/0002-selecao-de-provedor-llm.md`](../docs/adr/0002-selecao-de-provedor-llm.md) para
o racional completo.
