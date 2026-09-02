# Fase 3 — Ações de IA Mobile Specification

## Problem Statement

A tela de detalhe do paciente (Fase 2) já exibe biomarcadores e o toggle de acompanhamento, mas o
nutricionista não tem nenhum jeito de ver ou pedir ações de acompanhamento sugeridas por IA — a
feature irmã `fase-3-acoes-ia-backend` expõe `GET/POST /patients/:id/ai-actions` e
`PATCH /ai-actions/:id`, mas nada no app os consome ainda. Esta feature fecha esse caminho: uma nova
seção na tela de detalhe que lista, gera e permite aceitar/descartar ações, escondida por completo
quando o kill switch `aiActionsEnabled` está desligado.

## Goals

- [ ] A tela de detalhe do paciente ganha uma seção "Ações de acompanhamento" com os quatro estados
      de UI (carregando/erro/vazio/sucesso) exigidos pelo CLAUDE.md §5.5
- [ ] O nutricionista consegue gerar ações (quando a lista está vazia) e aceitar ou descartar cada
      ação pendente, sem otimismo local — a UI só reflete a decisão depois da resposta do servidor
- [ ] `useFlag('aiActionsEnabled') === false` esconde a seção inteira, sem nenhum vestígio (nem
      título, nem disclaimer)
- [ ] O disclaimer clínico da marca (`copy.aiDisclaimer`) fica visível sempre que a seção está
      visível
- [ ] `tsc --noEmit` limpo, sem `any`/`as`/`@ts-ignore`, todo dado de rede passa por `.parse()` de
      schema zod (CLAUDE.md §2.3, §5.4)

## Out of Scope

Explicitamente fora desta feature. Fica para fases seguintes ou não faz parte do projeto.

| Feature | Reason |
| --- | --- |
| Endpoints de backend (`GET/POST /ai-actions`, `PATCH /ai-actions/:id`) | Feature irmã `fase-3-acoes-ia-backend`, desenvolvida antes, sequencialmente |
| Mutation otimista para gerar/aceitar/descartar ação | CLAUDE.md §5.6 é explícito: ação de IA depende de resposta do servidor e de custo, nunca é otimista |
| Botão "Gerar novas ações" quando já existem ações para o paciente | Decisão do usuário — o botão só aparece na lista vazia; regenerar manualmente não foi pedido |
| Edição do conteúdo de uma ação pelo nutricionista | Não pedido; ação só é aceita ou descartada |
| Reversão de status (`accepted`/`dismissed` → `pending`) na UI | O backend trata a transição como terminal (`409` em PATCH repetido); a UI não oferece essa ação |
| Notificação/push quando uma ação é gerada | Não pedido pelo plano |
| Tela própria de ações de IA | Decisão do usuário — a seção vive dentro da tela de detalhe já existente |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Localização da superfície de IA | Nova seção "Ações de acompanhamento" dentro de `patients/[id].tsx`, abaixo da lista de biomarcadores | Decisão do usuário | y |
| Visibilidade do botão "Gerar ações" | Só aparece quando a lista de ações está vazia (`GET` devolve `[]`) | Decisão do usuário | y |
| Estado da seção de IA é independente do estado da tela (paciente + biomarcadores) | A seção tem seu próprio carregando/erro/vazio/sucesso, calculado a partir da query de `ai-actions`; uma falha nela não bloqueia o resto da tela de detalhe (que já tem seu próprio estado combinado de paciente+biomarcadores) | A seção de IA é opcional (gated por flag) e tem uma origem de dado própria; misturar seu erro com o de paciente/biomarcadores esconderia informação já carregada com sucesso | y |
| A query de `ai-actions` só é feita quando a flag está ligada | `useAiActionsQuery` usa `enabled: useFlag('aiActionsEnabled')` | Evita bater num endpoint que o próprio backend vai responder `503` quando a flag está desligada (CLAUDE.md §5.7 — kill switch nos dois lados) | y |
| Corpo do "erro" de geração (`502 AI_UNAVAILABLE`, `422 PATIENT_NO_BIOMARKERS`) | Mensagem de erro genérica da seção ("Não foi possível gerar ações agora.") com botão "Tentar novamente" — a UI não distingue os códigos de erro no texto, só loga/trata via `ApiError.code` internamente se precisar de comportamento diferente no futuro | Não pedido pelo plano um texto por código; CLAUDE.md §5.5 só exige "o que falhou e o que fazer", que uma mensagem genérica + retry já cobre | y |
| Estado por-item ao aceitar/descartar | Cada card de ação pendente tem seus próprios botões "Aceitar"/"Descartar"; ao tocar, os dois botões desse card ficam desabilitados até a resposta (sem alterar visualmente o card antes disso); erro reabilita os botões e mostra uma mensagem curta só naquele card | Não-otimista (CLAUDE.md §5.6) aplicado no nível do item, não da tela inteira — outros cards continuam interativos enquanto um está em voo | y |

**Open questions: none** — todas resolvidas acima.

---

## User Stories

### P1: Ver e gerar ações de acompanhamento ⭐ MVP

**User Story**: Como nutricionista, eu quero ver as ações de acompanhamento já sugeridas para um
paciente, e gerar novas quando ainda não existem, para decidir o que fazer com base na IA.

**Why P1**: É a superfície de valor da Fase 3 — sem isso não há nada para aceitar/descartar (P2).

**Acceptance Criteria**:

1. WHILE a seção de ações de IA está carregando pela primeira vez (`GET` em voo) THEN o sistema
   SHALL exibir um skeleton com a forma de cards de ação, não um spinner centralizado.
2. WHEN o `GET` devolve uma lista vazia THEN o sistema SHALL exibir o disclaimer clínico da marca, um
   convite à ação com a copy da marca, e um botão "Gerar ações".
3. WHEN o nutricionista toca "Gerar ações" THEN o sistema SHALL desabilitar o botão, mostrar um
   indicador de carregamento nele, chamar `POST /patients/:id/ai-actions`, e ao sucesso substituir o
   estado vazio pela lista de ações recebida.
4. WHEN o `GET` devolve uma lista não vazia THEN o sistema SHALL exibir o disclaimer clínico da marca
   e um card por ação (`title`, `rationale`, `priority`, `status`), sem o botão "Gerar ações".
5. IF o `GET` falha (erro de rede ou `503`) THEN o sistema SHALL exibir uma mensagem de erro
   específica desta seção e um botão "Tentar novamente" que refaz o `GET` — sem bloquear o resto da
   tela de detalhe (paciente e biomarcadores continuam visíveis se já carregaram).
6. IF o `POST` de geração falha THEN o sistema SHALL reabilitar o botão "Gerar ações", exibir uma
   mensagem de erro abaixo dele, e permitir tentar de novo tocando o mesmo botão.
7. WHILE `useFlag('aiActionsEnabled')` é `false` THEN o sistema SHALL não renderizar nenhuma parte da
   seção de IA (nem título, nem disclaimer, nem botão) e SHALL não disparar o `GET`.
8. The system SHALL nunca aplicar otimismo local ao resultado da geração — a lista só muda depois da
   resposta do `POST`.

**Independent Test**: Abrir o detalhe de um paciente sem ações prévias mostra o estado vazio com
disclaimer e botão; tocar "Gerar ações" mostra loading e depois a lista de cards; reabrir a mesma
tela mostra a lista direto (via `GET`), sem o botão.

---

### P2: Aceitar ou descartar uma ação sugerida

**User Story**: Como nutricionista, eu quero aceitar ou descartar cada ação sugerida individualmente,
para registrar minha decisão sobre cada sugestão.

**Why P2**: É o fechamento do ciclo de "aceite/descarte humano" que o CLAUDE.md §6.4 exige — sem
isso a lista de ações é só leitura.

**Acceptance Criteria**:

1. WHEN uma ação tem `status = "pending"` THEN o sistema SHALL exibir os botões "Aceitar" e
   "Descartar" nesse card.
2. WHEN o nutricionista toca "Aceitar" THEN o sistema SHALL desabilitar os dois botões desse card,
   chamar `PATCH /ai-actions/:id` com `{"status":"accepted"}`, e ao sucesso substituir os botões por
   um indicador visual de "Aceita" — sem alterar o card antes da resposta chegar.
3. WHEN o nutricionista toca "Descartar" THEN o sistema SHALL seguir o mesmo fluxo do item 2, com
   `{"status":"dismissed"}` e indicador "Descartada".
4. IF o `PATCH` falha THEN o sistema SHALL reabilitar os dois botões desse card e exibir uma
   mensagem de erro curta só nele, sem afetar os demais cards da lista.
5. WHEN uma ação já tem `status = "accepted"` ou `"dismissed"` (vinda do `GET`, ou depois de uma
   decisão bem-sucedida) THEN o sistema SHALL exibir o indicador do status final, sem nenhum botão
   de ação nesse card.
6. The system SHALL nunca aplicar otimismo local ao resultado de aceitar/descartar — o card só muda
   depois da resposta do `PATCH`.

**Independent Test**: Numa ação `pending`, tocar "Aceitar" desabilita os botões, aguarda a resposta,
e troca para o indicador "Aceita"; reabrir a tela mostra a mesma ação já como "Aceita", sem botões.

---

## Edge Cases

- IF o app está offline e a seção de IA nunca foi carregada com sucesso para este paciente THEN o
  sistema SHALL exibir o estado de erro desta seção (sem cache local de ações de IA — CLAUDE.md §5.6
  só exige offline para a carteira de pacientes, não para ações de IA).
- WHEN o `GET` de ações devolve mais de uma ação com `priority` diferente THEN o sistema SHALL
  diferenciar visualmente a prioridade de cada card (cor/selo vindo de `useTheme()`, nunca literal —
  CLAUDE.md §5.2), do mesmo jeito que o status de biomarcador já é diferenciado na tela de detalhe.
- IF `useFlag('aiActionsEnabled')` muda de `true` para `false` enquanto a tela de detalhe está aberta
  THEN o sistema SHALL remover a seção de IA da tela na próxima renderização (o hook já reage ao
  novo valor da query de flags).

---

## Requirement Traceability

| Requirement ID | Story | Task | Status |
| --- | --- | --- | --- |
| AIMOB-01 | P1: Skeleton no carregamento inicial | T1 | In Progress |
| AIMOB-02 | P1: Estado vazio com disclaimer + botão gerar | - | Pending |
| AIMOB-03 | P1: Gerar ações troca vazio por lista | T2 | In Progress |
| AIMOB-04 | P1: Estado sucesso sem botão gerar | T1 | In Progress |
| AIMOB-05 | P1: Erro no GET não bloqueia resto da tela | - | Pending |
| AIMOB-06 | P1: Erro no POST reabilita botão | - | Pending |
| AIMOB-07 | P1: Kill switch esconde a seção inteira | - | Pending |
| AIMOB-08 | P1: Geração não é otimista | - | Pending |
| AIMOB-09 | P2: Botões aceitar/descartar em ação pending | - | Pending |
| AIMOB-10 | P2: Aceitar decide e desabilita botões até resposta | - | Pending |
| AIMOB-11 | P2: Descartar decide e desabilita botões até resposta | - | Pending |
| AIMOB-12 | P2: Erro no PATCH reabilita botões só daquele card | - | Pending |
| AIMOB-13 | P2: Status final sem botões | - | Pending |
| AIMOB-14 | P2: Aceitar/descartar não é otimista | - | Pending |

**Coverage:** 14 total, 0 mapped to tasks, 14 unmapped ⚠️ (Tasks ainda não criado)

---

## Success Criteria

- [ ] Os quatro estados da seção de IA (carregando/erro/vazio/sucesso) aparecem cada um em algum
      fluxo reproduzível, isolados do estado da tela de detalhe
- [ ] Gerar, aceitar e descartar só refletem na UI depois da resposta do servidor — nenhum dos três
      tem `onMutate` otimista
- [ ] Desligar `aiActionsEnabled` no banco remove a seção de IA da tela (título, disclaimer, cards e
      botões) na próxima vez que a tela renderiza
- [ ] Disclaimer clínico da marca visível sempre que a seção é renderizada, com copy vinda de
      `useTheme().copy.aiDisclaimer`
- [ ] `tsc --noEmit` limpo; toda resposta de rede passa por `.parse()` de schema zod novo
      (`aiActionSchema`)
