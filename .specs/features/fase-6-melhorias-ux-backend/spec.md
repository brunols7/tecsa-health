# Fase 6 — Melhorias UX Backend Specification

## Problem Statement

O backend de pacientes (Fase 2) só sabe listar e ler: `POST`/`DELETE` de paciente não existem, o único
`PATCH` altera exclusivamente `needs_follow_up`, e `goal`/`status` são strings soltas sem validação em
nenhuma camada — só a `PatientFactory` respeita uma lista implícita de valores por convenção. Isso
bloqueia o CRUD que a Fase 6 pede no mobile e deixa o cadastro de paciente artificial: nutricionista não
tem como cadastrar um paciente real, corrigir um dado, encerrar um acompanhamento ou remover um cadastro
por engano. Esta feature fecha essas lacunas com um modelo de ciclo de vida real — criar, editar, avançar
o status do acompanhamento (`active` ⇄ `inactive`, `active` ⇄ `completed`) e excluir (soft delete) — e
troca o locale do Faker para `pt_BR`, para que o seed de 5.000+ pacientes pareça uma carteira brasileira
de verdade em vez de nomes em inglês.

## Goals

- [ ] `POST /api/v1/patients` cria um paciente novo com `name`, `birthDate` e `goal` validados, associado
      a uma marca, e devolve `201` com `Location`
- [ ] `PATCH /api/v1/patients/:id` passa a aceitar atualização parcial de `name`, `birthDate`, `goal` e
      `needsFollowUp` (mantendo compatibilidade com o uso atual de `needsFollowUp` isolado)
- [ ] `PATCH /api/v1/patients/:id/status` avança o ciclo de vida do paciente entre `active`, `inactive` e
      `completed`, só permitindo as transições válidas do state machine
- [ ] `DELETE /api/v1/patients/:id` faz soft delete (`deleted_at`); paciente excluído some de toda leitura
      subsequente, em qualquer status
- [ ] `GET /api/v1/patients` filtra por status (`active` por padrão; `inactive`/`completed`/combinação
      explícita via `?status=`)
- [ ] `goal` e `status` deixam de ser string livre: viram enums de domínio, reforçados por check
      constraint no banco e por `FormRequest` em toda escrita
- [ ] Seed determinístico (`FAKER_SEED=42`, ≥5.000 pacientes) passa a gerar nomes em `pt_BR`
- [ ] `patients.status_changed_at` registra quando o status atual começou, para o mobile mostrar "desde
      quando" um paciente está inativo/concluído
- [ ] Nenhuma regra de negócio, Eloquent ou cálculo vaza para o Controller (CLAUDE.md §2.2, §6.1) —
      verificável pelo script de fronteira de camada existente

## Out of Scope

Explicitamente excluído desta feature. Fica para outra fase ou não faz parte do projeto.

| Feature | Reason |
| --- | --- |
| Restaurar paciente excluído (`undelete`) | Não pedido — exclusão é definitiva nesta fase; reverter exige endpoint e UI próprios |
| Auditoria/histórico de mudança de status (quem mudou, quando, de onde) | Não pedido; `updated_at` já registra a última mudança, é o suficiente para esta fase |
| Criação/edição de biomarcadores via API | Fora do escopo — biomarcadores continuam só leitura, nascem via seeder (Fase 0/2) |
| Criação manual de ação de IA (recomendação não gerada por LLM) | Fora do escopo de UI/UX — mudaria o produto de IA da Fase 3; registrado como ideia separada na conversa com o usuário |
| Autenticação real / autorização por usuário logado | Projeto não tem auth real (CLAUDE.md §15); mecanismo provisório de `?brand=slug` continua |
| Alterar `status` em lote (bulk) | Não pedido; cada transição é uma chamada individual |
| Idade mínima/máxima de paciente (regra clínica sobre `birthDate`) | Não pedido; único requisito é a data ser válida e não estar no futuro |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Separação exclusão vs. status | `status` (`active`/`inactive`/`completed`) e exclusão (`deleted_at`, soft delete padrão Eloquent) são mecanismos independentes | Decisão do usuário — "excluídos não aparecem", diferente de "inativo"/"concluído" que aparecem num filtro à parte; misturar os dois no mesmo enum obrigaria filtro manual em toda query em vez de global scope automático do Eloquent | y |
| Transições de status válidas | `active→inactive`, `active→completed`, `inactive→active`, `completed→active`; qualquer outra combinação (`inactive→completed` direto, mesmo estado repetido) é `409 INVALID_STATUS_TRANSITION` | Decisão do usuário — inativar/concluir só a partir de ativo; reativar/reabrir sempre volta para ativo, nunca pula direto entre inativo e concluído | y |
| Rótulo de botão por origem da reativação | Mesma transição de destino (`active`) para as duas origens; o rótulo ("Reativar" vs. "Reabrir acompanhamento") é decisão só do mobile — o backend expõe um único endpoint de status, sem endpoint por rótulo | Decisão do usuário — o backend não precisa saber de copy/rótulo de botão, só do valor de destino | y |
| Escopo de campos do `PATCH /patients/:id` | Aceita `name`, `birthDate`, `goal`, `needsFollowUp`, todos opcionais, pelo menos um obrigatório | Consolida no mesmo endpoint em vez de criar um novo — é o mesmo recurso, o `UpdateFollowUpRequest` atual vira um caso particular deste request mais amplo | y |
| Onde a mudança de status vive | Endpoint próprio `PATCH /patients/:id/status`, separado do PATCH de cadastro | Uma transição de state machine tem regra de validação (transição válida/inválida) bem diferente de uma edição de campo solto; mistura os dois no mesmo request tornaria o 409 de transição inválida ambíguo com o 422 de campo inválido | y |
| `brand` na criação (`POST /patients`) | Campo obrigatório no corpo da requisição (slug da marca), não query param | Nos endpoints existentes `?brand=` é usado para *filtrar* leitura; criar um recurso novo é diferente de filtrar — o valor pertence ao corpo persistido, não a um parâmetro de busca | y |
| Enum de `goal` | 4 valores fixos, iguais aos já usados pela `PatientFactory`: `lose_weight`, `gain_muscle`, `maintain`, `manage_condition` | Já é a convenção implícita do projeto; formalizar não muda o vocabulário, só passa a validar | y |
| Tradução de `goal`/`status` para português | Não é responsabilidade do backend — a API sempre devolve os valores canônicos em inglês (`lose_weight`, `active` etc.); tradução para exibição é 100% do mobile | O backend é o contrato de dados, não a camada de apresentação; nenhuma marca deve influenciar o valor devolvido pela API (CLAUDE.md §2.1) | y |
| Locale do Faker | `config('app.faker_locale')` passa de `env('APP_FAKER_LOCALE', 'en_US')` para `env('APP_FAKER_LOCALE', 'pt_BR')`; `.env.example` ganha `APP_FAKER_LOCALE=pt_BR` explícito | Pedido do usuário (nomes brasileiros); manter a env var configurável preserva a possibilidade de rodar com outro locale sem mudar código | y |
| `FAKER_SEED` do seeder | Mantido em `42` | Determinismo continua garantido; a troca de locale já muda os nomes gerados por natureza (mesma seed, dicionário de nomes diferente) — não há razão para trocar a seed também | y |
| Re-seed do banco após a troca de locale | Necessário rodar `migrate:fresh --seed` (ou equivalente) depois do deploy desta feature — pacientes já existentes com nomes em inglês não são migrados/traduzidos linha a linha | Não existe tradução automática de nome próprio; recriar o seed determinístico é mais simples e mais correto que uma migration de dado que "adivinha" nomes em português | y |
| Validação de `birthDate` | Formato `YYYY-MM-DD`, obrigatório na criação, não pode ser data futura | Único requisito funcional realista para esta fase; regra clínica de idade mínima/máxima não foi pedida | y |
| Exclusão de paciente com histórico de IA (`ai_actions`) | Permitida sempre — soft delete não têm FK cascade porque não remove a linha física; `ai_actions` do paciente excluído simplesmente ficam órfãs de um paciente invisível (nunca mais acessíveis via API, já que o paciente não existe mais para nenhuma leitura) | Consistente com soft delete: nada é fisicamente removido, só escondido; não pedido tratamento especial para o histórico de IA de um paciente excluído | y |
| Rastreio de "desde quando" o status atual vale | Nova coluna `status_changed_at` (timestamp, nullable até a primeira transição), atualizada em toda mudança de `status` (incluindo a criação, que grava o timestamp de quando o paciente nasceu `active`) | Pedido do usuário — permite ao mobile mostrar "Inativo desde 12/03/2026"/"Concluído em 12/03/2026" sem precisar de uma tabela de auditoria completa; um único timestamp já resolve o caso de uso sem novo histórico | y |

**Open questions:** none — todas resolvidas ou registradas acima.

---

## User Stories

### P1: Criar paciente ⭐ MVP

**User Story**: Como nutricionista, eu quero cadastrar um paciente novo com nome, data de nascimento e
objetivo, para que ele passe a existir na carteira sem depender do seeder.

**Why P1**: É o pré-requisito de tudo — sem `POST`, não existe CRUD, e o mobile não tem o que consumir.

**Acceptance Criteria**:

1. WHEN uma requisição `POST /api/v1/patients` chega com `name`, `birthDate`, `goal` e `brand` válidos
   THEN o sistema SHALL criar o paciente com `status=active`, `needsFollowUp=false`, e responder `201`
   com header `Location` apontando para `GET /api/v1/patients/:id`.
2. IF `name` está ausente ou vazio THEN o sistema SHALL responder `422` com o código de erro em
   `name`.
3. IF `birthDate` não está no formato `YYYY-MM-DD`, ou é uma data futura THEN o sistema SHALL responder
   `422` com o código de erro em `birthDate`.
4. IF `goal` não é um dos 4 valores válidos (`lose_weight`, `gain_muscle`, `maintain`,
   `manage_condition`) THEN o sistema SHALL responder `422` com o código de erro em `goal`.
5. IF `brand` está ausente ou não corresponde a nenhuma marca existente THEN o sistema SHALL responder
   `422` com o código de erro em `brand`.
6. The system SHALL ignorar qualquer campo fora de `name`, `birthDate`, `goal`, `brand` presente no
   corpo da requisição (mass assignment controlado via `validated()`, CLAUDE.md §9).
7. WHEN um paciente é criado THEN o sistema SHALL gravar `statusChangedAt` com o timestamp de criação
   (o paciente nasce `active` a partir desse instante).

**Independent Test**: `POST /api/v1/patients` com corpo válido, confirmar `201` + `Location`, depois
`GET` nesse `Location` e confirmar os campos batendo, `status=active`.

---

### P2: Editar cadastro do paciente

**User Story**: Como nutricionista, eu quero corrigir nome, data de nascimento ou objetivo de um
paciente já cadastrado, para consertar um erro de digitação sem recriar o registro.

**Why P2**: Completa o CRUD depois da criação; reaproveita o endpoint de `PATCH` já existente.

**Acceptance Criteria**:

1. WHEN uma requisição `PATCH /api/v1/patients/:id` chega com um ou mais de `name`, `birthDate`,
   `goal`, `needsFollowUp` válidos THEN o sistema SHALL atualizar somente os campos presentes e
   responder `200` com o paciente atualizado.
2. IF a requisição não inclui nenhum de `name`, `birthDate`, `goal`, `needsFollowUp` THEN o sistema
   SHALL responder `422`.
3. IF algum campo presente falha a mesma validação de formato do `POST` (formato de `birthDate`,
   `goal` fora do enum) THEN o sistema SHALL responder `422` com o código de erro no campo específico.
4. IF `:id` não corresponde a um paciente existente (ou existe mas está excluído) THEN o sistema
   SHALL responder `404`.
5. The system SHALL preservar o comportamento já existente: uma requisição só com `needsFollowUp`
   continua funcionando exatamente como antes desta feature.

**Independent Test**: `PATCH` só com `name` novo, confirmar que `birthDate`/`goal`/`needsFollowUp`
permanecem inalterados e o `name` mudou.

---

### P3: Avançar o ciclo de vida do acompanhamento

**User Story**: Como nutricionista, eu quero inativar, reativar, concluir ou reabrir o acompanhamento de
um paciente, para refletir o estado real do tratamento (pausado, encerrado, em andamento de novo).

**Why P3**: É o que torna a carteira "um acompanhamento de verdade" em vez de uma lista estática —
pedido explícito do usuário nesta sessão.

**Acceptance Criteria**:

1. WHEN uma requisição `PATCH /api/v1/patients/:id/status` chega com `status=inactive` e o paciente
   está `active` THEN o sistema SHALL mudar o status para `inactive` e responder `200`.
2. WHEN a mesma requisição chega com `status=completed` e o paciente está `active` THEN o sistema
   SHALL mudar o status para `completed` e responder `200`.
3. WHEN a requisição chega com `status=active` e o paciente está `inactive` OU está `completed` THEN o
   sistema SHALL mudar o status para `active` e responder `200`.
4. IF a transição pedida não está entre as quatro válidas (ex.: `inactive→completed`,
   `completed→inactive`, ou pedir o mesmo status atual) THEN o sistema SHALL responder `409` com o
   código de erro `INVALID_STATUS_TRANSITION`, sem alterar o registro.
5. IF `status` não é um dos três valores do enum (`active`, `inactive`, `completed`) THEN o sistema
   SHALL responder `422`.
6. IF `:id` não corresponde a um paciente existente (ou está excluído) THEN o sistema SHALL responder
   `404`.
7. WHEN qualquer transição válida de status é aplicada (AC1/AC2/AC3) THEN o sistema SHALL atualizar
   `statusChangedAt` para o timestamp da transição.
8. IF a transição é rejeitada (AC4/AC5/AC6) THEN o sistema SHALL manter `statusChangedAt` inalterado.

**Independent Test**: paciente novo (`active`) → `PATCH status=inactive` (200) → `PATCH
status=completed` no mesmo paciente ainda `inactive` (409) → `PATCH status=active` (200) → `GET`
confirma `status=active`.

---

### P4: Excluir paciente (soft delete)

**User Story**: Como nutricionista, eu quero excluir um cadastro feito por engano, para que ele saia da
carteira sem exigir uma operação de banco manual.

**Why P4**: Fecha o CRUD; soft delete evita perda de dado irreversível num projeto sem backup formal.

**Acceptance Criteria**:

1. WHEN uma requisição `DELETE /api/v1/patients/:id` chega para um paciente existente (em qualquer
   status: `active`, `inactive` ou `completed`) THEN o sistema SHALL marcar `deleted_at` com o
   timestamp atual e responder `204`.
2. WHEN um paciente foi excluído THEN qualquer `GET /api/v1/patients`, `GET /api/v1/patients/:id`,
   `GET /api/v1/patients/:id/biomarkers`, `PATCH /api/v1/patients/:id`, `PATCH
   /api/v1/patients/:id/status` referente a ele SHALL responder como se o paciente não existisse
   (`404` para os de recurso único; ausente da lista para o `GET` de coleção).
3. IF `:id` já está excluído E chega um novo `DELETE` para o mesmo `:id` THEN o sistema SHALL
   responder `404` (não há double-delete idempotente nesta fase — o recurso já não é visível).
4. The system SHALL preservar as linhas de `biomarkers` e `ai_actions` do paciente excluído no banco
   (soft delete não faz cascade físico).

**Independent Test**: `DELETE` de um paciente, confirmar `204`, depois `GET /patients/:id` no mesmo id
retorna `404`, e o paciente não aparece em `GET /patients` mesmo sem filtro de status.

---

### P5: Filtrar a carteira por status

**User Story**: Como app mobile, eu quero listar só os pacientes ativos por padrão e, à parte, os
inativos e concluídos, para separar quem está em acompanhamento de quem não está.

**Why P5**: Sem isso, o ciclo de vida da P3 fica invisível na carteira — o mobile precisa desse filtro
para a Fase 6 mobile.

**Acceptance Criteria**:

1. WHEN `GET /api/v1/patients` chega sem o parâmetro `status` THEN o sistema SHALL filtrar
   implicitamente por `status=active`.
2. WHEN `GET /api/v1/patients?status=inactive,completed` chega THEN o sistema SHALL devolver só
   pacientes com `status` igual a `inactive` OU `completed`.
3. WHEN `GET /api/v1/patients?status=active,inactive,completed` chega THEN o sistema SHALL devolver
   pacientes de todos os três status (equivalente a "sem filtro" exceto por excluídos).
4. IF `status` contém algum valor fora do enum (`active`, `inactive`, `completed`) THEN o sistema
   SHALL responder `400`.
5. The system SHALL nunca devolver paciente excluído (`deleted_at` preenchido) em `GET /patients`,
   independentemente do valor de `status` informado.

**Independent Test**: criar um paciente `active`, um `inactive` e um `completed` na mesma marca; `GET
?status=active` devolve só o primeiro; `GET ?status=inactive,completed` devolve os outros dois.

---

### P6: Seed com nomes brasileiros e enums reforçados

**User Story**: Como avaliador do projeto, eu quero ver uma carteira de 5.000+ pacientes com nomes
brasileiros e `goal`/`status` validados de verdade, para que a demonstração pareça um produto real e não
um placeholder gerado em inglês.

**Why P6**: Não bloqueia nenhuma outra story, mas é parte explícita do pedido do usuário (item 2 do
plano) e barata de entregar junto da migration de enum.

**Acceptance Criteria**:

1. The system SHALL gerar nomes de pacientes usando o locale `pt_BR` do Faker por padrão
   (`APP_FAKER_LOCALE=pt_BR`), preservando a possibilidade de override via variável de ambiente.
2. WHEN o seeder roda do zero (`migrate:fresh --seed` ou equivalente) THEN o sistema SHALL continuar
   gerando no mínimo 5.000 pacientes, distribuídos entre as duas marcas, de forma determinística
   (`FAKER_SEED=42` inalterado).
3. The system SHALL rejeitar, a nível de banco (check constraint), qualquer linha de `patients` com
   `goal` fora dos 4 valores válidos ou `status` fora dos 3 valores válidos.
4. IF uma migration tenta inserir um valor de `goal` ou `status` fora do enum (ex.: via seeder ou
   teste antigo desatualizado) THEN o sistema SHALL falhar a constraint do banco, não silenciar o
   dado inválido.

**Independent Test**: `docker compose down -v && docker compose up`, depois `SELECT name FROM patients
LIMIT 20` mostra nomes brasileiros; `INSERT` manual com `goal='invalid'` falha por constraint.

---

## Edge Cases

- IF `POST /patients` chega com `brand` de uma marca existente mas com `name` idêntico a um paciente já
  cadastrado na mesma marca THEN o sistema SHALL permitir a criação normalmente (nome duplicado não é
  erro — não há unicidade de nome pedida em nenhuma fase).
- IF a mesma requisição de transição de status (`PATCH .../status`) chega duas vezes seguidas com o
  mesmo valor de destino igual ao status atual THEN o sistema SHALL responder `409
  INVALID_STATUS_TRANSITION` na segunda vez (mesmo status não é uma transição válida, ver Assumptions).
- IF `GET /patients/:id/biomarkers` é chamado para um paciente `inactive` ou `completed` (não excluído)
  THEN o sistema SHALL responder normalmente com `200` — só exclusão (`deleted_at`) esconde o paciente,
  não os outros status do ciclo de vida.
- WHEN o banco é recriado do zero após esta feature THEN pacientes antigos com nomes em inglês SHALL
  deixar de existir (re-seed completo, não migração de dado linha a linha — ver Assumptions).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| UXBE-01 | P1: Criar paciente | Design | Implementing |
| UXBE-02 | P1: Criar paciente | Design | Implementing |
| UXBE-03 | P1: Criar paciente | Design | Implementing |
| UXBE-04 | P1: Criar paciente | Design | Implementing |
| UXBE-05 | P1: Criar paciente | Design | Implementing |
| UXBE-06 | P1: Criar paciente | Design | Implementing |
| UXBE-31 | P1: Criar paciente | Design | Pending |
| UXBE-07 | P2: Editar cadastro | Design | Implementing |
| UXBE-08 | P2: Editar cadastro | Design | Implementing |
| UXBE-09 | P2: Editar cadastro | Design | Implementing |
| UXBE-10 | P2: Editar cadastro | Design | Implementing |
| UXBE-11 | P2: Editar cadastro | Design | Implementing |
| UXBE-12 | P3: Ciclo de vida | Design | Implementing |
| UXBE-13 | P3: Ciclo de vida | Design | Implementing |
| UXBE-14 | P3: Ciclo de vida | Design | Implementing |
| UXBE-15 | P3: Ciclo de vida | Design | Implementing |
| UXBE-16 | P3: Ciclo de vida | Design | Implementing |
| UXBE-17 | P3: Ciclo de vida | Design | Pending |
| UXBE-32 | P3: Ciclo de vida | Design | Implementing |
| UXBE-18 | P4: Excluir (soft delete) | Design | Implementing |
| UXBE-19 | P4: Excluir (soft delete) | Design | Pending |
| UXBE-20 | P4: Excluir (soft delete) | Design | Pending |
| UXBE-21 | P4: Excluir (soft delete) | Design | Implementing |
| UXBE-22 | P5: Filtro por status | Design | Implementing |
| UXBE-23 | P5: Filtro por status | Design | Implementing |
| UXBE-24 | P5: Filtro por status | Design | Implementing |
| UXBE-25 | P5: Filtro por status | Design | Implementing |
| UXBE-26 | P5: Filtro por status | Design | Implementing |
| UXBE-27 | P6: Seed pt_BR + enums | Design | Pending |
| UXBE-28 | P6: Seed pt_BR + enums | Design | Pending |
| UXBE-29 | P6: Seed pt_BR + enums | Design | Pending |
| UXBE-30 | P6: Seed pt_BR + enums | Design | Implementing |

**ID format:** `UXBE-[NUMBER]` (Fase 6, Melhorias UX, Backend)

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 32 total, 0 mapped to tasks, 32 unmapped ⚠️ (mapeamento acontece na fase Tasks)

---

## Success Criteria

- [ ] `POST`, `PATCH` (cadastro), `PATCH .../status` e `DELETE` de paciente funcionam de ponta a ponta
      via `curl`, cada um com o status code correto do CLAUDE.md §6.3
- [ ] As quatro transições de status válidas funcionam; qualquer outra combinação devolve `409`
- [ ] Paciente excluído desaparece de toda leitura, sem exceção
- [ ] `goal` e `status` são rejeitados por constraint de banco quando fora do enum, não só pela
      validação de aplicação
- [ ] `docker compose down -v && docker compose up` do zero produz 5.000+ pacientes com nomes `pt_BR`
- [ ] Nenhuma regra de negócio no Controller; script de fronteira de camada continua limpo
- [ ] `php artisan test` cobre as 4 transições de status, os 3 status codes de erro novos (`422` de
      enum, `404` de excluído, `409` de transição inválida) e o check constraint do banco
