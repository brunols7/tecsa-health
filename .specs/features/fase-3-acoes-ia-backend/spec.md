# Fase 3 — Ações de IA Backend Specification

## Problem Statement

O core mobile (Fase 0), o mecanismo de feature flags com kill switch (Fase 1) e a carteira de
pacientes com biomarcadores reais (Fase 2) já existem, mas não há nenhum jeito de gerar, listar ou
decidir sobre ações de acompanhamento sugeridas por IA: `Domain/AiAction` não existe, e a tabela
`ai_actions` (migrada desde a Fase 0) não tem nenhuma camada de Application/Http em cima. Esta
feature fecha esse caminho — expondo geração (com cache por snapshot clínico), listagem e
aceite/descarte via REST, com o kill switch `aiActionsEnabled` bloqueando os três endpoints quando
desligado, que a feature irmã `fase-3-acoes-ia-mobile` vai consumir.

## Goals

- [ ] `POST /api/v1/patients/:id/ai-actions` gera entre 1 e 5 ações via LLM na primeira chamada para
      um snapshot de biomarcadores+objetivo, e devolve as ações já existentes sem gastar token em
      qualquer chamada seguinte com o mesmo snapshot
- [ ] `GET /api/v1/patients/:id/ai-actions` devolve o histórico completo de ações do paciente
      (qualquer status)
- [ ] `PATCH /api/v1/ai-actions/:id` aceita ou descarta uma ação `pending`, de forma terminal
- [ ] `aiActionsEnabled = false` na marca do paciente faz os três endpoints acima responderem `503`,
      sem exceção
- [ ] Resposta do LLM fora do schema esperado nunca é persistida; falha vira `502` depois de exatamente
      uma nova tentativa
- [ ] Nenhuma regra de negócio, Eloquent ou cálculo de hash vaza para o Controller (CLAUDE.md §2.2,
      §6.1) — verificável pelo script de fronteira de camada existente
- [ ] Nenhum dado identificável (nome, documento) chega ao prompt do LLM (CLAUDE.md §6.4)

## Out of Scope

Explicitamente fora desta feature. Fica para fases seguintes ou não faz parte do projeto.

| Feature | Reason |
| --- | --- |
| Consumo dos endpoints pelo app mobile (superfície de IA, disclaimer, fluxo de aceite/descarte) | Feature irmã `fase-3-acoes-ia-mobile`, desenvolvida depois, sequencialmente |
| Edição de biomarcadores ou `goal` do paciente | Não existe endpoint de escrita para isso no projeto (Fase 2 só expõe `needsFollowUp`); o mecanismo de invalidação de cache por hash existe e funciona, mas não é exercitável nesta fase por falta de um caminho que mude o snapshot |
| Reversão de status (`accepted`/`dismissed` → `pending`) | Decisão do usuário — transição é terminal |
| Edição do conteúdo de uma ação (título/rationale) pelo nutricionista | Não pedido pelo plano; a ação é gerada ou descartada, nunca editada |
| Notificação (push/e-mail) quando uma ação é gerada | Não pedido pelo plano |
| Deduplicação sob concorrência (duas requisições `POST` simultâneas para o mesmo paciente sem histórico ainda podem gerar dois lotes de ações) | Sem lock/transação distribuída nesta fase; aceitável para o volume de uso de uma demo |
| Cache compartilhado entre pacientes diferentes com snapshot clínico idêntico | Cache é sempre por `(patient_id, input_hash)`; ver Assumptions |
| Autenticação real / autorização granular sobre quem pode aceitar-descartar | Projeto não tem auth real (CLAUDE.md §15) |
| Persistência de `risk_level`/`summary` da resposta do LLM | Usados só para validar o formato da resposta; a tabela `ai_actions` (CLAUDE.md §7) não tem coluna para eles |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Endpoint de leitura do histórico | Novo `GET /api/v1/patients/:id/ai-actions`, além dos dois endpoints já listados no plano | Decisão do usuário — o mobile precisa exibir ações existentes sem regenerar a cada abertura de tela | y |
| Transição de status do PATCH | Terminal: `pending → accepted` ou `pending → dismissed`; PATCH numa ação já resolvida responde `409` | Decisão do usuário — decisão humana é definitiva, mais simples de raciocinar e testar | y |
| Modelo Anthropic padrão | `claude-haiku-4-5`, configurável via `.env` (`ANTHROPIC_MODEL`) | Decisão do usuário — modelo mais barato por token entre os atuais, projeto de demonstração com custo real de API | y |
| Escopo do kill switch | Bloqueia os três endpoints (`GET`, `POST`, `PATCH`) de `ai-actions`, não só a geração | CLAUDE.md §5.7 exige "esconder toda a superfície de IA" nos dois lados; deixar `GET`/`PATCH` abertos vazaria dado de IA mesmo com a flag desligada | y |
| Escopo do cache | Chave `(patient_id, input_hash)` — nunca compartilhado entre pacientes diferentes | `input_hash` vive numa coluna da tabela `ai_actions`, sempre associada a um `patient_id` via FK; compartilhar entre pacientes exigiria índice/tabela novos não pedidos pelo plano | y |
| Composição do `input_hash` | `sha256` de JSON canônico de `{ biomarkers: [{code, value, unit, measuredAt}, ...] ordenado por code, goal }` | Cobre exatamente o dado clínico enviado ao prompt (AIBE-08); nome e idade ficam fora — idade deriva de `birthDate`, que não muda, e nome nunca deve influenciar cache | y |
| Código de erro para falha do provedor LLM (timeout ou schema inválido após retry) | `502 Bad Gateway`, código `AI_UNAVAILABLE` | Não coberto pela tabela de status do CLAUDE.md §6.3 (só define `503` para kill switch); `502` é o código REST correto para falha de dependência upstream, distinto do `503` de feature desligada | y |
| Status HTTP do `POST` | `201` quando gera ações novas (chamou o LLM), `200` quando é cache hit (devolve as existentes) | Nenhum dos dois é "erro"; `201` fica reservado para quando algo é de fato criado. Sem header `Location` — o recurso criado é uma coleção de N ações, não um recurso único endereçável | y |
| Paciente sem nenhum biomarcador cadastrado | `POST` responde `422`, código `PATIENT_NO_BIOMARKERS`, sem chamar o LLM | Evita gasto de chamada paga sem nenhum dado clínico para basear a sugestão; não ocorre no seed padrão (Fase 0 sempre semeia 1-3 biomarcadores por paciente), mas é um guard barato | y |
| Timeout do `LlmClient` | 15 segundos | Não especificado pelo plano; valor prático para uma chamada síncrona de request/response mobile sem gerar percepção de tela travada por tempo excessivo | y |
| Escopo do retry | Só para resposta que falha a validação do schema (1 tentativa extra); timeout de rede falha direto, sem retry | CLAUDE.md §6.4 fala explicitamente de retry para "resposta inválida contra o schema"; retry automático sobre timeout dobraria a latência de uma falha de rede sem necessidade | y |
| Rate limit | `RateLimiter::for('ai', ...)`: 10 requisições/minuto por IP, aplicado só ao `POST` de geração | CLAUDE.md §9 exige throttle no endpoint de IA; `GET`/`PATCH` não geram custo de LLM, não precisam do mesmo limite | y |

**Open questions: none** — todas resolvidas acima.

---

## User Stories

### P1: Gerar ações de acompanhamento por IA para um paciente ⭐ MVP

**User Story**: Como app mobile, eu quero pedir a geração de ações de acompanhamento para um
paciente, para que o nutricionista veja sugestões acionáveis baseadas nos biomarcadores atuais, sem
pagar por uma nova chamada ao provedor quando o dado clínico não mudou.

**Why P1**: É o coração da Fase 3 e a regra de negócio mais cara/arriscada do projeto (custo real de
API, resposta não confiável de terceiro) — precisa existir e estar certa antes de qualquer consumo
mobile.

**Acceptance Criteria**:

1. WHEN `POST /api/v1/patients/:id/ai-actions` chega para um paciente existente, `aiActionsEnabled`
   é `true` para a marca do paciente, o paciente tem ao menos um biomarcador, e não existe nenhuma
   `ai_action` com `input_hash` igual ao snapshot atual THEN o sistema SHALL chamar o `LlmClient`,
   validar a resposta contra o schema (CLAUDE.md §6.4), persistir entre 1 e 5 novas `ai_actions` com
   `status = pending` e o `input_hash` do snapshot atual, e responder `201` com a lista das ações
   criadas.
2. WHEN a mesma requisição chega e já existe ao menos uma `ai_action` com `input_hash` igual ao
   snapshot atual (qualquer status) THEN o sistema SHALL responder `200` com a lista de `ai_actions`
   existentes para esse `input_hash`, sem chamar o `LlmClient`.
3. IF o `id` do paciente não corresponde a nenhum paciente THEN o sistema SHALL responder `404` no
   envelope de erro padrão, código `PATIENT_NOT_FOUND`.
4. IF `aiActionsEnabled` é `false` para a marca do paciente THEN o sistema SHALL responder `503` no
   envelope de erro padrão, código `AI_DISABLED`, sem chamar o `LlmClient`.
5. IF a chamada ao `LlmClient` excede o timeout configurado (15s) THEN o sistema SHALL responder
   `502` no envelope de erro padrão, código `AI_UNAVAILABLE`, sem persistir nada.
6. IF a resposta do `LlmClient` falha a validação do schema THEN o sistema SHALL tentar novamente
   exatamente uma vez; IF a segunda tentativa também falhar a validação THEN o sistema SHALL
   responder `502`, código `AI_UNAVAILABLE`, sem persistir nada.
7. The system SHALL nunca persistir uma resposta do LLM que não passou pela validação do schema.
8. The system SHALL enviar ao `LlmClient` apenas biomarcadores (código, valor, unidade, faixa de
   referência), idade calculada a partir de `birthDate`, e `goal` do paciente — nunca `name` nem
   qualquer identificador direto.
9. The system SHALL manter o Controller livre de Eloquent, regra de negócio e cálculo de hash — toda
   a orquestração vive em `Application/AiAction/GenerateAiActionsService`.

**Independent Test**: `curl -X POST http://localhost:9000/api/v1/patients/<uuid>/ai-actions` com
`aiActionsEnabled=true` devolve `201` com 1-5 ações; repetir a mesma chamada imediatamente devolve
`200` com as mesmas ações, verificável com `FakeLlmClient` contando 1 única invocação nos dois casos.

---

### P2: Listar ações de IA já geradas para um paciente

**User Story**: Como app mobile, eu quero listar as ações já geradas para um paciente, para exibir o
histórico completo (pendentes, aceitas, descartadas) sem depender de disparar uma nova geração.

**Why P2**: Sem este endpoint, a tela de detalhe mobile teria que chamar `POST` toda vez que abre,
misturando leitura com o efeito colateral (e custo) de geração.

**Acceptance Criteria**:

1. WHEN `GET /api/v1/patients/:id/ai-actions` chega para um paciente existente THEN o sistema SHALL
   responder `200` com todas as `ai_actions` do paciente, de qualquer status, ordenadas por
   `created_at desc`.
2. WHEN o paciente existe mas nunca teve nenhuma ação gerada THEN o sistema SHALL responder `200`
   com uma lista vazia `[]`.
3. IF o `id` do paciente não corresponde a nenhum paciente THEN o sistema SHALL responder `404` no
   envelope de erro padrão, código `PATIENT_NOT_FOUND`.
4. IF `aiActionsEnabled` é `false` para a marca do paciente THEN o sistema SHALL responder `503` no
   envelope de erro padrão, código `AI_DISABLED`.

**Independent Test**: `curl http://localhost:9000/api/v1/patients/<uuid>/ai-actions` devolve `200`
com `[]` para um paciente sem histórico; depois de um `POST` bem-sucedido, o mesmo `GET` devolve as
ações criadas.

---

### P3: Aceitar ou descartar uma ação sugerida

**User Story**: Como app mobile, eu quero marcar uma ação sugerida como aceita ou descartada, para
que o nutricionista registre sua decisão humana sobre a sugestão — e essa decisão seja definitiva.

**Why P3**: É o mecanismo de "aceite/descarte humano" que o CLAUDE.md §6.4 exige para toda sugestão
de IA nascer `pending`.

**Acceptance Criteria**:

1. WHEN `PATCH /api/v1/ai-actions/:id` chega com corpo `{ "status": "accepted" }` e a ação existe
   com `status = pending` THEN o sistema SHALL persistir `status = accepted` e responder `200` com a
   ação atualizada.
2. WHEN o corpo é `{ "status": "dismissed" }` e a ação existe com `status = pending` THEN o sistema
   SHALL persistir `status = dismissed` e responder `200` com a ação atualizada.
3. IF o `id` não corresponde a nenhuma `ai_action` THEN o sistema SHALL responder `404` no envelope
   de erro padrão, código `AI_ACTION_NOT_FOUND`.
4. IF a ação existe mas seu `status` já não é `pending` THEN o sistema SHALL responder `409` no
   envelope de erro padrão, código `AI_ACTION_ALREADY_RESOLVED`, sem alterar nada.
5. IF o corpo não contém `status`, ou contém um valor fora de `{"accepted", "dismissed"}` THEN o
   sistema SHALL responder `422` no envelope de erro padrão, sem persistir nada.
6. IF `aiActionsEnabled` é `false` para a marca do paciente dono da ação THEN o sistema SHALL
   responder `503`, código `AI_DISABLED`, sem alterar nada.
7. IF o corpo contém campos além de `status` THEN o sistema SHALL ignorá-los — nenhum campo além do
   permitido pelo FormRequest chega ao Service.

**Independent Test**: `curl -X PATCH -d '{"status":"accepted"}' -H 'Content-Type: application/json'
http://localhost:9000/api/v1/ai-actions/<uuid>` devolve `200` com `status: "accepted"`; repetir a
mesma chamada devolve `409`.

---

### P4: Rate limit no endpoint de geração

**User Story**: Como operador do backend, eu quero limitar a taxa de chamadas de geração de IA, para
proteger o orçamento do provedor contra uso excessivo ou automatizado.

**Why P4**: CLAUDE.md §9 exige throttle explícito no endpoint de IA; é a única superfície que gasta
dinheiro real por requisição.

**Acceptance Criteria**:

1. WHEN a 11ª requisição `POST /api/v1/patients/:id/ai-actions` da mesma origem chega dentro da
   mesma janela de 1 minuto THEN o sistema SHALL responder `429`, sem chamar o `LlmClient`.
2. The system SHALL aplicar este limite apenas ao `POST` de geração — `GET` e `PATCH` não são
   limitados nesta fase.

**Independent Test**: 11 requisições `POST` consecutivas para o mesmo paciente dentro de 1 minuto —
as 10 primeiras seguem o fluxo normal (gerando ou batendo cache), a 11ª devolve `429`.

---

## Edge Cases

- IF o paciente não tem nenhum biomarcador cadastrado THEN o sistema SHALL responder `422`, código
  `PATIENT_NO_BIOMARKERS`, sem chamar o `LlmClient` (`POST`).
- WHEN duas requisições `POST` concorrentes chegam para o mesmo paciente sem nenhum histórico ainda
  THEN o sistema PODE gerar dois lotes de ações (sem lock); comportamento aceito nesta fase, não
  corrigido.
- WHEN o mesmo snapshot clínico (biomarcadores + `goal`) ocorre em dois pacientes diferentes THEN o
  sistema SHALL gerar/chamar o LLM para cada paciente independentemente — o cache nunca é
  compartilhado entre pacientes.

---

## Requirement Traceability

| Requirement ID | Story | Task | Status |
| --- | --- | --- | --- |
| AIBE-01 | P1: Gera ações novas quando não há hash existente | T1 | Implementing |
| AIBE-02 | P1: Cache hit devolve ações existentes, sem chamar LLM | - | Pending |
| AIBE-03 | P1: Paciente inexistente → 404 | - | Pending |
| AIBE-04 | P1: Kill switch off → 503 | - | Pending |
| AIBE-05 | P1: Timeout → 502 | - | Pending |
| AIBE-06 | P1: Schema inválido → retry único → 502 | - | Pending |
| AIBE-07 | P1: Nunca persiste resposta não validada | - | Pending |
| AIBE-08 | P1: Só dado clínico mínimo no prompt (sem PII) | - | Pending |
| AIBE-09 | P1: Controller sem regra de negócio | - | Pending |
| AIBE-10 | Edge: sem biomarcadores → 422 PATIENT_NO_BIOMARKERS | - | Pending |
| AIBE-11 | P2: Lista todas as ações, ordenadas created_at desc | - | Pending |
| AIBE-12 | P2: Paciente sem histórico → [] | - | Pending |
| AIBE-13 | P2: Paciente inexistente → 404 | - | Pending |
| AIBE-14 | P2: Kill switch off → 503 | - | Pending |
| AIBE-15 | P3: PATCH aceita ação pending | T2 | Implementing |
| AIBE-16 | P3: PATCH descarta ação pending | T2 | Implementing |
| AIBE-17 | P3: Ação inexistente → 404 | - | Pending |
| AIBE-18 | P3: Ação já resolvida → 409 | T2 | Implementing |
| AIBE-19 | P3: Corpo inválido → 422 | - | Pending |
| AIBE-20 | P3: Kill switch off → 503 | - | Pending |
| AIBE-21 | P3: Ignora campos não permitidos | - | Pending |
| AIBE-22 | P4: 11ª requisição na janela → 429 | - | Pending |
| AIBE-23 | P4: Rate limit só no POST | - | Pending |

**Coverage:** 23 total, 0 mapped to tasks, 23 unmapped ⚠️ (Tasks ainda não criado)

---

## Success Criteria

- [ ] Desligar `aiActionsEnabled` no banco faz `GET`, `POST` e `PATCH` de `ai-actions` responderem
      `503` imediatamente
- [ ] Reenviar o mesmo snapshot de biomarcadores para o mesmo paciente não gera nova chamada ao
      `LlmClient` (cache hit verificável em teste com `FakeLlmClient`)
- [ ] Resposta inválida do LLM (schema quebrado) não quebra a resposta HTTP nem persiste lixo —
      `502` limpo depois do retry único
- [ ] Toda ação nasce `pending` e só sai desse estado via `PATCH` explícito, de forma terminal
- [ ] Controller, Service e Repository respeitam as camadas do CLAUDE.md §6.1 (script de fronteira,
      §11.2)
- [ ] Rate limit do `POST` de geração é exercitado por teste (11ª chamada → 429)
