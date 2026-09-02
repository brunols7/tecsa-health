# Novas Sugestões de Ações de IA Specification

## Problem Statement

Hoje o botão "Gerar ações" só existe no estado vazio da seção de ações de IA. Depois da primeira
geração, não há forma de pedir mais sugestões ao LLM: `AiActionService::generate()` sempre resolve
por cache (mesmo hash de biomarcadores → devolve as ações já existentes, nunca chama o LLM de
novo). O nutricionista precisa de um jeito de pedir novas sugestões sob demanda, mesmo sem novos
exames, sem que o LLM repita o que já foi sugerido.

## Goals

- [ ] Botão "Novas sugestões" visível quando a lista de ações já tem itens, além do botão "Gerar
      ações" do estado vazio.
- [ ] Pedido de novas sugestões sempre chama o LLM (ignora o cache por hash), e as sugestões novas
      se somam às existentes sem duplicar título nem quebrar o cache para gerações futuras sem
      refresh.

## Out of Scope

| Feature                                                       | Reason                                                              |
| -------------------------------------------------------------- | -------------------------------------------------------------------- |
| Limite de quantas vezes o botão pode ser clicado por paciente  | Rate limit por IP já existe (`RateLimiter::for('ai')`, 10/min); um limite adicional por paciente não foi pedido |
| Remover ou expirar ações antigas pending ao gerar novas         | Usuário escolheu somar (append), não substituir                     |
| Deduplicar contra ações `dismissed`                             | Usuário escolheu reenviar ao LLM apenas `pending`+`accepted`; descartadas podem voltar |

---

## Assumptions & Open Questions

| Assumption / decision                                                                 | Chosen default                                                                 | Rationale                                                                                   | Confirmed? |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------- |
| Bypass de cache no refresh                                                             | `POST /patients/:id/ai-actions` ganha campo opcional `refresh: boolean` no corpo | Discutido com o usuário — sempre chama o LLM de novo, aceitando o custo extra                    | y          |
| Como evitar repetição                                                                  | Envia ao LLM os títulos das ações `pending`+`accepted` existentes, pedindo para não repetir | Discutido com o usuário                                                                          | y          |
| Merge do resultado                                                                      | Soma (append) às ações existentes; nada é removido ou alterado                   | Discutido com o usuário                                                                          | y          |
| Ações novas geradas por refresh usam o mesmo `input_hash` do snapshot atual de biomarcadores | Sim — o hash é function pura de biomarcadores+goal, não do modo de geração        | Preserva o comportamento de cache existente: uma geração normal futura (sem refresh) já enxerga as novas ações somadas |  y (inferido; sem objeção levantada) |
| Resposta HTTP do refresh                                                                | 201 quando o LLM gerou ações novas (sempre, dado que refresh nunca faz cache-hit) | Consistente com o contrato atual: `generated: true` → 201                                        | y (inferido) |

**Open questions:** none — todas resolvidas ou registradas acima.

---

## User Stories

### P1: Pedir novas sugestões de IA ⭐ MVP

**User Story**: Como nutricionista, quero pedir novas sugestões de ação para um paciente que já
tem ações listadas, para que eu tenha mais opções sem esperar um novo exame.

**Why P1**: É o pedido central do usuário — sem isso o botão de gerar só serve uma vez por paciente.

**Acceptance Criteria**:

1. WHEN o nutricionista toca em "Novas sugestões" com a lista de ações não vazia THEN o app SHALL
   chamar `POST /patients/:id/ai-actions` com `refresh: true`.
2. WHEN o backend recebe `refresh: true` THEN o `AiActionService` SHALL ignorar o resultado do
   cache por `input_hash` e chamar o `LlmClient` novamente.
3. WHEN o backend monta o prompt para uma chamada com `refresh: true` THEN o `AiPromptInput` SHALL
   incluir os títulos das ações do paciente com status `pending` ou `accepted` como
   `existingTitles`, para instruir o LLM a não repeti-los.
4. WHEN a geração com `refresh: true` retorna sugestões válidas THEN o backend SHALL persistir as
   novas ações com o `input_hash` do snapshot atual de biomarcadores e devolver, em 201, a lista
   completa (ações existentes + novas), sem apagar ou alterar as existentes.
5. WHEN o app recebe a resposta de uma chamada de refresh bem-sucedida THEN a UI SHALL exibir a
   lista completa retornada (existentes + novas) sem duplicar cards.
6. The system SHALL manter o comportamento atual de `POST /patients/:id/ai-actions` sem `refresh`
   (ou `refresh: false`) inalterado — cache por hash continua valendo para a primeira geração.

**Independent Test**: Com um paciente que já tem ações pending, tocar "Novas sugestões" e ver a
lista crescer com itens novos, sem os antigos sumirem ou se duplicarem.

---

### P2: Botão não deve concorrer com o "Gerar ações" do estado vazio

**User Story**: Como nutricionista, quero que o botão de novas sugestões só apareça quando já há
ações, para não confundir com o fluxo de primeira geração.

**Why P2**: Evita dois botões redundantes convivendo no mesmo estado.

**Acceptance Criteria**:

1. WHILE a lista de ações está vazia (`AiActionsEmptyState`) system SHALL mostrar apenas o botão
   "Gerar ações" existente (sem `refresh`).
2. WHILE a lista de ações tem ao menos um item system SHALL mostrar o botão "Novas sugestões" no
   topo da seção, acima dos cards.
3. IF a chamada de refresh falhar (erro de rede, 502/503) THEN a UI SHALL mostrar uma mensagem de
   erro junto ao botão e permitir tentar de novo, sem remover as ações já carregadas da tela.
4. WHILE uma chamada de refresh está em andamento system SHALL desabilitar o botão "Novas
   sugestões" e mostrar indicador de carregamento.

**Independent Test**: Provocar erro (kill switch ligado durante o refresh, ou mock de erro) e
confirmar que a lista de ações existentes continua visível e o erro aparece isolado no botão.

---

## Edge Cases

- IF `aiActionsEnabled` está desligado (kill switch) THEN o endpoint SHALL devolver 503 mesmo com
  `refresh: true` (mesma checagem existente de `assertAiEnabled`).
- IF o paciente não tem biomarcadores THEN o endpoint SHALL devolver 422 mesmo com `refresh: true`
  (mesma checagem existente `PatientNoBiomarkers`).
- IF o LLM devolve resposta inválida contra o schema em uma chamada de refresh THEN o backend
  SHALL aplicar o mesmo retry único já existente e, se falhar de novo, devolver 502
  (`LlmUnavailable`) sem tocar nas ações existentes.
- WHEN não há ações `pending` nem `accepted` (ex.: todas dismissed, ou primeira geração via
  refresh) THEN `existingTitles` SHALL ser um array vazio.

---

## Requirement Traceability

| Requirement ID | Story                        | Phase   | Status  |
| --------------- | ----------------------------- | ------- | ------- |
| AIREF-01        | P1: Pedir novas sugestões     | Execute | Implemented |
| AIREF-02        | P1: Pedir novas sugestões     | Execute | Implemented |
| AIREF-03        | P1: Pedir novas sugestões     | Execute | Implemented |
| AIREF-04        | P1: Pedir novas sugestões     | Execute | Implemented |
| AIREF-05        | P1: Pedir novas sugestões     | Execute | Implemented |
| AIREF-06        | P1: Pedir novas sugestões     | Execute | Implemented |
| AIREF-07        | P2: Botão condicional ao estado | Execute | Implemented |
| AIREF-08        | P2: Botão condicional ao estado | Execute | Implemented |
| AIREF-09        | P2: Botão condicional ao estado | Execute | Implemented |
| AIREF-10        | P2: Botão condicional ao estado | Execute | Implemented |

**Coverage:** 10 total, 10 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] `npm test` (mobile) e `php artisan test` (api) passam, com testes novos cobrindo
      `refresh: true/false`, dedup de `existingTitles`, e os dois estados do botão.
- [ ] Nenhuma regra de negócio nova no controller (refresh é lido via FormRequest, decisão de
      bypass de cache vive no Service).
- [ ] `tsc --noEmit` e `phpstan analyse` limpos.
