# Fase 1 — Feature Flags Backend Specification

## Problem Statement

O mecanismo de kill switch de IA (Fase 3) e o hook `useFlag` do mobile (feature irmã
`fase-1-feature-flags-mobile`) precisam de uma fonte de verdade remota para feature flags, escopada
por marca. Hoje o domínio (`FeatureFlagRepository`, `FeatureFlag` entity, model Eloquent, seeder) já
existe da Fase 0, mas não há nenhum jeito de consumi-lo via HTTP: `routes/api.php` não existe,
`bootstrap/app.php` não registra rotas de API, e as pastas de Controller/Resource/FormRequest estão
vazias. Esta feature fecha esse caminho: `Domain` (já pronto) → `Application` (novo) →
`Http\Controllers` (novo), expondo `GET /api/v1/feature-flags`.

## Goals

- [ ] `GET /api/v1/feature-flags?brand=<slug>` devolve, em `200`, o mapa `{ key: boolean }` de todas
      as flags cadastradas para a marca informada
- [ ] Marca ausente, mal formada ou inexistente produz erro claro (`422`/`404`) no envelope padrão
      do `Exceptions\Handler` (CLAUDE.md §6.3), nunca um 500 ou stack trace
- [ ] O endpoint fica documentado automaticamente em `/docs/api` via `dedoc/scramble`, sem anotação
      manual além do que `FormRequest`/Resource já expressam
- [ ] Controller não contém regra de negócio, Eloquent ou cálculo (CLAUDE.md §2.2, §6.1) — toda
      resolução de flags vive em `Application/FeatureFlag/FeatureFlagService`

## Out of Scope

Explicitamente fora desta feature. Fica para fases seguintes ou não faz parte do projeto.

| Feature                                                        | Reason                                                                 |
| ---------------------------------------------------------------| ------------------------------------------------------------------------ |
| Endpoint de escrita para alterar flag (`PATCH /feature-flags`) | Não pedido pelo plano; flags são trocadas direto no banco/seed nesta fase |
| Brand scoping via autenticação/token real                      | Projeto não tem auth real (CLAUDE.md §15); ver nota registrada no plano de desenvolvimento |
| Cache HTTP (`ETag`, `Cache-Control`) ou versionamento de payload | Não pedido; endpoint já é barato (query indexada por `brand_id`)       |
| Rate limit dedicado neste endpoint                              | CLAUDE.md §9 escopa throttle explícito ao endpoint de IA (Fase 3), não a leitura de flags |
| Consumo do endpoint pelo app mobile (`useFlag`, persistência)  | Feature irmã `fase-1-feature-flags-mobile`                              |
| Kill switch efetivo de IA (endpoint de IA respondendo 503)     | Fase 3 — esta feature só entrega a leitura de flags, não a aplicação do kill switch em outro endpoint |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | --------------- | --------- | ---------- |
| Formato do payload | Mapa `key → boolean` (não lista de objetos) | Decisão do usuário — bate 1:1 com o tipo `FeatureFlags` do mobile, sem transformação client-side | y |
| Mecanismo de brand scoping | Query param `?brand=<slug>` | Decisão do usuário — sem auth real, é o mecanismo mais simples e testável; nota de revisão futura registrada em `docs/plano-de-desenvolvimento.md` | y |
| Cache/versionamento de payload | Nenhum nesta fase | Não pedido; endpoint barato | y |
| Rate limit dedicado | Nenhum nesta fase | CLAUDE.md §9 escopa throttle ao endpoint de IA (Fase 3) | y |
| Documentação OpenAPI | Instala/configura `dedoc/scramble` nesta feature (primeiro endpoint real do projeto) | CLAUDE.md §3: "a API expõe um OpenAPI... servido em `/docs/api`", introduzido "junto do primeiro endpoint real" | y |
| Flag ausente do banco para uma marca (key existe no tipo `FeatureFlags` mas não tem linha em `feature_flags`) | Omitida da resposta (o mobile já resolve isso caindo no default da marca — CLAUDE.md §5.7) | Repository/Service não inventam um valor para uma flag que não foi seedada; simplesmente não aparece no mapa | y |
| Marca com zero flags cadastradas | `200` com objeto vazio `{}`, não erro | Marca existe e é válida; ausência de flags é um estado de dado, não uma falha — o mobile trata como "nada carregado ainda", cai nos defaults | y |

**Open questions: none** — todas resolvidas ou logadas acima.

---

## User Stories

### P1: Consultar feature flags de uma marca ⭐ MVP

**User Story**: Como app mobile de uma marca, eu quero buscar o conjunto de feature flags dessa
marca, para que eu possa decidir o que mostrar/esconder sem hardcode.

**Why P1**: É o único comportamento desta feature — sem ele, nada do resto do projeto (kill switch
de IA, `useFlag`) tem onde se apoiar.

**Acceptance Criteria**:

1. WHEN uma requisição `GET /api/v1/feature-flags?brand=<slug>` chega com um `slug` que corresponde
   a uma marca cadastrada THEN o sistema SHALL responder `200` com um corpo JSON cujas chaves são as
   `key` de cada `FeatureFlag` cadastrada para essa marca e cujos valores são o `enabled` booleano
   correspondente.
2. WHEN a marca informada existe mas não tem nenhuma linha em `feature_flags` THEN o sistema SHALL
   responder `200` com corpo `{}`.
3. IF o parâmetro `brand` está ausente da query string THEN o sistema SHALL responder `422` com o
   envelope de erro padrão (`{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details":
   [...] } }`), sem tocar o banco.
4. IF o parâmetro `brand` está presente mas não corresponde a nenhuma marca cadastrada THEN o
   sistema SHALL responder `404` com o envelope de erro padrão, código `BRAND_NOT_FOUND`.
5. The system SHALL resolver `brand` para `brand_id` internamente antes de consultar
   `FeatureFlagRepository` — nenhuma query direta por slug fora do Repository.
6. The system SHALL manter o Controller livre de Eloquent, `if` de negócio e cálculo — toda
   resolução de marca→flags vive em `Application/FeatureFlag/FeatureFlagService`.

**Independent Test**: `curl "http://localhost:9000/api/v1/feature-flags?brand=nutri-care"` devolve
`200` e um JSON com as chaves esperadas; trocar o valor de uma flag no banco (via `tinker` ou SQL) e
repetir a chamada reflete o novo valor sem restart do processo.

---

### P2: Endpoint documentado no OpenAPI

**User Story**: Como desenvolvedor consumindo a API (mobile ou terceiro), eu quero ver o endpoint em
`/docs/api`, para que eu não precise ler o código-fonte do backend para saber o contrato.

**Why P2**: Não bloqueia o consumo funcional do endpoint, mas é exigência explícita do CLAUDE.md §3
para o "primeiro endpoint real" — vale fazer nesta feature em vez de acumular dívida.

**Acceptance Criteria**:

1. WHEN o pacote `dedoc/scramble` está instalado e configurado THEN o sistema SHALL expor
   `GET /api/v1/feature-flags` em `/docs/api` com os parâmetros de query e os formatos de resposta
   (`200`, `422`, `404`) documentados automaticamente a partir do FormRequest e da resposta do
   Controller.

**Independent Test**: acessar `/docs/api` num browser/`curl` mostra o endpoint listado com os
status codes possíveis.

---

## Edge Cases

- IF o `slug` de `brand` contém caracteres fora do padrão esperado (ex.: espaço, maiúsculas
  inconsistentes com o seed) THEN o sistema SHALL tratar como "não encontrado" (`404`), não como erro
  de validação — mesmo comportamento de qualquer slug inexistente, sem revelar se o formato "quase
  bateu" com algo.
- WHEN duas requisições concorrentes chegam para a mesma marca THEN o sistema SHALL responder as duas
  de forma independente e consistente (leitura pura, sem estado compartilhado mutável no request).

---

## Requirement Traceability

| Requirement ID | Story                              | Phase  | Status  |
| --------------- | ----------------------------------- | ------ | ------- |
| FLAGSBE-01       | P1: Consultar flags de uma marca    | Execute | Done (T8) |
| FLAGSBE-02       | P1: Marca sem flags cadastradas     | Execute | Done (T3, T5, T8) |
| FLAGSBE-03       | P1: `brand` ausente → 422           | Execute | Done (T6, T7, T8) |
| FLAGSBE-04       | P1: `brand` inexistente → 404       | Execute | Done (T1, T2, T4, T5, T6, T8) |
| FLAGSBE-05       | P1: Controller sem regra de negócio | Execute | Done (T1, T5, T8) |
| FLAGSBE-06       | P2: Documentação OpenAPI            | Execute | Pending (T9) |

**Coverage:** 6 total, 5 mapped to tasks, 1 pending (T9 — dedoc/scramble)

---

## Success Criteria

- [ ] `GET /api/v1/feature-flags?brand=nutri-care` e `?brand=vita-plus` respondem `200` com payloads
      diferentes quando as flags seedadas diferem entre as marcas
- [ ] Trocar uma flag no banco (update direto) é refletido na próxima chamada ao endpoint, sem
      restart do processo PHP
- [ ] `422`/`404` seguem o envelope de erro padrão do projeto, verificável por teste Feature
      (`assertJsonStructure`)
- [ ] Controller, Service e Repository respeitam as camadas do CLAUDE.md §6.1 (verificável pelo
      script de fronteira de camada, §11.2)
