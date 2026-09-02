# Fase 6 — Melhorias UX Mobile Specification

## Problem Statement

O app hoje só lê pacientes: não existe formulário de criação/edição, não existe forma de excluir ou de
avançar o ciclo de vida de um acompanhamento, `goal` aparece como texto cru em inglês
(`<Text>{patient.goal}</Text>`), a lista não tem filtro de status, e os empty states de marca têm só 3
copies (`patientsTitle`, `emptyPatients`, `aiDisclaimer`) — o de biomarcadores vazios está hardcoded fora
da marca. Esta feature consome os endpoints novos da feature irmã `fase-6-melhorias-ux-backend`
(`POST`/`PATCH`/`PATCH .../status`/`DELETE` de paciente, filtro `?status=`) e fecha essas lacunas visíveis
ao usuário final, mais a publicação de uma atualização OTA nos canais de desenvolvimento já existentes.

## Goals

- [ ] Formulário de criar paciente (nome, data de nascimento, objetivo) acessível a partir da lista
- [ ] Formulário de editar paciente reaproveitando os mesmos campos, pré-preenchido
- [ ] Ação de excluir paciente com confirmação nativa (`Alert`) citando o nome do paciente
- [ ] Ações de ciclo de vida na tela de detalhe: inativar, concluir, reativar, reabrir acompanhamento —
      cada uma com o rótulo certo para o status atual
- [ ] Filtro "Ativos" / "Inativos e concluídos" em modal/bottom-sheet na lista de pacientes
- [ ] `goal` renderizado como badge traduzido (cor neutra única), nunca mais texto cru em inglês
- [ ] Idade do paciente calculada e exibida ao lado do badge de objetivo; datas (`birthDate`,
      `statusChangedAt`) exibidas em `dd/MM/yyyy`, nunca no formato ISO cru da API
- [ ] Empty states revisados: nova chave de copy por marca para biomarcadores vazios, copies existentes
      revisadas para convite à ação (CLAUDE.md §5.5)
- [ ] Nova versão publicada via `eas update` nos canais `nutri-care-development` e
      `vita-plus-development` já existentes, aplicada num device com o app já instalado
- [ ] `tsc --noEmit` limpo, lint de fronteira de marca limpo, sem literal de cor/raio/fonte nos
      componentes novos

## Out of Scope

Explicitamente excluído desta feature. Fica para outra fase ou não faz parte do projeto.

| Feature | Reason |
| --- | --- |
| Redesign das telas de lista e detalhe já existentes | Decisão do usuário — só telas/componentes novos desta fase são retrabalhados; lista e detalhe já passaram pelo Verifier nas Fases 2/3 |
| Criação/edição de biomarcadores no app | Backend não expõe escrita de biomarcador (fora do escopo da feature irmã) |
| Restaurar paciente excluído | Backend não expõe `undelete` nesta fase |
| Criação manual de recomendação de IA | Mudaria o produto de IA da Fase 3; fora do escopo de UI/UX desta fase |
| Novo perfil de build (`preview`/`production`) no `eas.json` | Decisão do usuário — publicação usa só os canais de development já existentes da Fase 4 |
| Publicação em loja (App Store/Play Store) | Explicitamente fora do escopo do projeto (CLAUDE.md §14.9, docs/requisitos-do-produto.md) |
| Auditoria visual de mudança de status (timeline) | Não pedido; backend não guarda histórico de transição nesta fase |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Onde vivem as telas de criar/editar | Novas rotas `src/app/patients/new.tsx` e `src/app/patients/[id]/edit.tsx` (Expo Router), reaproveitando um único componente de formulário (`PatientForm`) para os dois casos | Convenção do projeto (Expo Router baseado em arquivo); form único evita duplicar validação/layout entre criar e editar | y |
| Biblioteca de formulário | `react-hook-form` + resolver `zod` sobre o mesmo `patientSchema` (estendido) | Já é a stack fixa do CLAUDE.md — nenhuma lib nova | y |
| Onde mora a tradução de `goal`/`status` | `core/features/patients/` (ou módulo equivalente dentro de `core/`), como mapa de rótulos fixo — nunca em `brands/*` | O valor não varia por marca (é rótulo de domínio, não copy de marketing); colocá-lo em `brands/*` obrigaria as duas marcas a duplicar o mesmo texto sem motivo, e "core não conhece marca" já proíbe o caminho oposto | y |
| Rótulo do botão de reativação por origem | A partir de `inactive`: botão "Reativar". A partir de `completed`: botão "Reabrir acompanhamento". Os dois chamam o mesmo endpoint (`PATCH .../status`, `status=active`) | Decisão do usuário — mesmo destino, rótulo diferente por origem, para não confundir "retomar pausa" com "reabrir um caso encerrado" | y |
| Cor do badge de objetivo (`goal`) | Um único par de tokens semânticos já existentes (`colors.surfaceMuted` de fundo, `colors.textSecondary` de texto), igual nas duas marcas | Decisão do usuário — evita inventar token novo ou mapear objetivo→cor sem necessidade | y |
| Componente de Badge | Novo componente genérico `core/ui/Badge.tsx`, reutilizado tanto para `goal` do paciente quanto para o pill de status de biomarcador que hoje é inline em `[id].tsx` | Reduz duplicação; o pill de biomarcador já faz visualmente o que um Badge faz, só que sem componente — vira o primeiro consumidor real do componente novo | y |
| UI do filtro de status na lista | Ícone de filtro no cabeçalho da lista abre um bottom-sheet/modal com duas opções: "Ativos" (default) e "Inativos e concluídos" | Decisão do usuário (modal, não segmented control inline) | y |
| Confirmação de exclusão | `Alert.alert` nativo do React Native, título citando o nome do paciente (“Excluir {name}?”), botão destrutivo | Decisão do usuário — já é o "double-check" pedido, sem exigir modal customizado | y |
| Mutation de excluir/status é otimista? | Não — depende de resposta do servidor (`onSuccess` invalida a lista e navega de volta quando aplicável), sem `onMutate` otimista | CLAUDE.md §5.6 reserva otimismo para edições locais simples (ex.: `needsFollowUp` já existente); excluir e mudar status são operações mais sensíveis, com possibilidade real de rejeição (`409` de transição inválida) que não faz sentido reverter uma UI que já sumiu com o paciente da tela | y |
| Campo de data de nascimento no formulário | `expo-router`/RN puro: `TextInput` com máscara/validação de formato `YYYY-MM-DD` via zod, sem date picker nativo novo | Menor superfície nova; nenhuma lib de date picker está na stack fixa do CLAUDE.md, e adicionar uma só para este formulário não se justifica | y |
| Nova chave de copy por marca | `copy.emptyBiomarkers` adicionada ao tipo `Brand['copy']` e às duas marcas, substituindo o texto hardcoded hoje em `[id].tsx` | Alinhado ao padrão já usado por `emptyPatients` — mensagem de estado vazio é copy de marca, não uma constante solta no componente | y |
| `patientSchema` (zod) para `goal`/`status` | Viram `z.enum([...])` com os valores canônicos do backend (`lose_weight` etc., `active`/`inactive`/`completed`), em vez de `z.string()` solto | Fecha o mesmo buraco de tipagem que o backend fecha do lado do enum — falha alto em `.parse()` se a API mandar um valor fora do enum conhecido, em vez de deixar passar string arbitrária | y |
| Versionamento da publicação OTA | `app.json` `version` sobe de `1.0.0` para `1.1.0`; `eas update` publicado nos dois canais de development existentes, sem novo perfil de build | Mudança de funcionalidade visível (CRUD completo) justifica minor bump; canais/perfis já existem da Fase 4, não há motivo para criar novos só para uma atualização OTA | y |
| Cálculo de idade | Anos completos calculados no cliente a partir de `birthDate` (função pura `calculateAge(birthDate: string, today = new Date()): number`, testável isoladamente), nunca vindo da API | Pedido do usuário — é derivado, não precisa de round-trip; parâmetro `today` injetável evita teste flaky por data do relógio real | y |
| Formato de exibição de data | `dd/MM/yyyy` para toda data mostrada ao usuário (`birthDate`, `statusChangedAt`); o formulário de criar/editar continua usando o formato de input próprio do campo de texto (`YYYY-MM-DD`, ver linha de "Campo de data de nascimento no formulário" abaixo) | Pedido do usuário — separa formato de exibição (leitura humana) de formato de input/contrato (parsing determinístico); função pura `formatDateBR(iso: string): string` em `core/` | y |
| Onde exibir "inativo/concluído desde" | Ao lado do botão de ação do ciclo de vida (P4), usando `statusChangedAt` formatado — só aparece quando o paciente não está `active` | Reaproveita o campo novo do backend (`statusChangedAt`) sem exigir tela nova; `active` não precisa mostrar "desde quando" porque é o estado padrão, sem informação extra relevante | y |

**Open questions:** none — todas resolvidas ou registradas acima.

---

## User Stories

### P1: Criar paciente ⭐ MVP

**User Story**: Como nutricionista, eu quero abrir um formulário e cadastrar um paciente novo com nome,
data de nascimento e objetivo, para adicioná-lo à carteira sem depender do seed.

**Why P1**: Sem isso não há CRUD nenhum visível no app — é o ponto de entrada de toda a feature.

**Acceptance Criteria**:

1. WHEN o usuário toca no botão de adicionar paciente na lista THEN o sistema SHALL navegar para o
   formulário de criação, vazio.
2. WHEN o usuário preenche nome, data de nascimento e objetivo válidos e confirma THEN o sistema SHALL
   chamar `POST /patients`, e em caso de sucesso, voltar para a lista e mostrar o paciente novo.
3. IF o usuário tenta confirmar com nome vazio, data de nascimento em formato inválido, ou sem
   selecionar objetivo THEN o sistema SHALL bloquear o envio e mostrar a mensagem de erro específica de
   cada campo, sem chamar a API.
4. IF `POST /patients` responde `422` THEN o sistema SHALL mapear o erro de campo devolvido pela API de
   volta para o campo correspondente do formulário, sem genérico "algo deu errado".
5. IF `POST /patients` falha por rede (offline, timeout) THEN o sistema SHALL mostrar erro com opção de
   tentar novamente, mantendo os dados já digitados no formulário.
6. The system SHALL desabilitar o botão de confirmar enquanto a criação está em andamento (sem duplo
   envio por toque duplo).

**Independent Test**: preencher e enviar o formulário com dados válidos, confirmar que o paciente
aparece na lista logo em seguida.

---

### P2: Editar cadastro do paciente

**User Story**: Como nutricionista, eu quero editar nome, data de nascimento ou objetivo de um paciente
existente, para corrigir um dado sem recriar o cadastro.

**Why P2**: Completa o CRUD junto da criação, reaproveitando o mesmo formulário.

**Acceptance Criteria**:

1. WHEN o usuário toca em editar na tela de detalhe THEN o sistema SHALL abrir o mesmo formulário da P1,
   pré-preenchido com os dados atuais do paciente.
2. WHEN o usuário altera um ou mais campos e confirma THEN o sistema SHALL chamar `PATCH
   /patients/:id` só com os campos alterados, e ao ter sucesso, voltar para o detalhe já atualizado.
3. IF a validação local ou a resposta `422` da API falhar em algum campo THEN o sistema SHALL seguir a
   mesma regra de exibição de erro da P1 (AC3/AC4).
4. The system SHALL aplicar as mesmas regras de validação local da P1 (nome não vazio, data válida,
   objetivo dentre os válidos).

**Independent Test**: editar só o nome de um paciente existente, confirmar que o detalhe reflete o nome
novo e os demais campos continuam iguais.

---

### P3: Excluir paciente

**User Story**: Como nutricionista, eu quero excluir um cadastro feito por engano, com uma confirmação
clara antes, para não perder um paciente sem querer.

**Why P3**: É o item explicitamente pedido como "double-check" no plano — exclusão irreversível do ponto
de vista da UI merece fricção mínima, mas real.

**Acceptance Criteria**:

1. WHEN o usuário toca em excluir na tela de detalhe THEN o sistema SHALL mostrar um `Alert` de
   confirmação citando o nome do paciente, com opção de cancelar e opção de confirmar em destaque
   destrutivo.
2. WHEN o usuário confirma a exclusão no `Alert` THEN o sistema SHALL chamar `DELETE /patients/:id`, e
   ao ter sucesso, remover o paciente da lista em cache e navegar de volta para a lista.
3. WHEN o usuário cancela o `Alert` THEN o sistema SHALL fechar o alerta sem chamar a API, permanecendo
   na tela de detalhe.
4. IF `DELETE /patients/:id` falhar THEN o sistema SHALL manter o paciente visível e mostrar um erro
   com opção de tentar excluir de novo.

**Independent Test**: tocar em excluir, cancelar (paciente continua na lista), tocar em excluir de novo,
confirmar (paciente some da lista).

---

### P4: Avançar o ciclo de vida do acompanhamento

**User Story**: Como nutricionista, eu quero inativar, concluir, reativar ou reabrir o acompanhamento de
um paciente direto na tela de detalhe, para refletir o estado real do tratamento.

**Why P4**: É a peça central do pedido do usuário para tornar a carteira "mais próxima de um
acompanhamento real".

**Acceptance Criteria**:

1. WHILE o paciente está `active` THEN o sistema SHALL mostrar dois botões na tela de detalhe:
   "Marcar como inativo" e "Concluir acompanhamento".
2. WHILE o paciente está `inactive` THEN o sistema SHALL mostrar um botão "Reativar" e ocultar
   "Marcar como inativo"/"Concluir acompanhamento".
3. WHILE o paciente está `completed` THEN o sistema SHALL mostrar um botão "Reabrir acompanhamento" e
   ocultar os outros três.
4. WHEN o usuário toca em qualquer um desses botões THEN o sistema SHALL chamar `PATCH
   /patients/:id/status` com o `status` de destino correspondente, e ao ter sucesso, atualizar a tela
   de detalhe para refletir o novo status e o novo conjunto de botões.
5. IF a chamada de mudança de status falhar (incluindo `409` de transição inválida, caso a tela esteja
   com dado desatualizado) THEN o sistema SHALL mostrar erro sem mudar o status exibido, mantendo os
   botões da situação anterior.
6. The system SHALL desabilitar o botão tocado enquanto a chamada está em andamento.

**Independent Test**: paciente `active` → tocar "Marcar como inativo" → tela mostra "Reativar" → tocar
"Reativar" → tela volta a mostrar os dois botões de `active`.

---

### P5: Filtrar a lista por status

**User Story**: Como nutricionista, eu quero ver só os pacientes ativos por padrão, e abrir um filtro à
parte para ver os inativos e concluídos, para não misturar quem está em acompanhamento com quem não
está.

**Why P5**: Sem isso, a P4 muda o dado mas o usuário nunca vê o efeito na lista principal continuar
limpa.

**Acceptance Criteria**:

1. WHEN a lista de pacientes carrega sem filtro explícito THEN o sistema SHALL buscar
   `GET /patients?status=active` (o padrão do backend já cobre isso; o mobile não precisa enviar nada
   além do default).
2. WHEN o usuário abre o filtro e seleciona "Inativos e concluídos" THEN o sistema SHALL buscar
   `GET /patients?status=inactive,completed` e mostrar essa lista no lugar da anterior.
3. WHEN o usuário seleciona "Ativos" de volta no filtro THEN o sistema SHALL voltar para a busca
   padrão.
4. The system SHALL indicar visualmente qual filtro está ativo (ex.: título/badge na lista) para que o
   usuário não confunda as duas visões.

**Independent Test**: criar um paciente e inativá-lo (P4); confirmar que ele some da lista padrão e
aparece só depois de abrir o filtro "Inativos e concluídos".

---

### P6: Objetivo do paciente como badge traduzido

**User Story**: Como usuário do app (nutricionista ou avaliador), eu quero ver o objetivo do paciente
como um badge em português, para não ver termos técnicos em inglês na interface.

**Why P6**: Item explícito do plano — "nada deve ficar em inglês".

**Acceptance Criteria**:

1. The system SHALL renderizar `goal` como um componente `Badge` com o rótulo traduzido: `lose_weight`
   → "Emagrecimento", `gain_muscle` → "Ganho de massa", `maintain` → "Manutenção",
   `manage_condition` → "Controle de condição clínica".
2. IF a API devolver um valor de `goal` fora dos 4 conhecidos (`.parse()` do zod falhando) THEN o
   sistema SHALL tratar a resposta como erro de rede/parsing (mesmo caminho já usado para qualquer
   payload inválido — CLAUDE.md §5.4), nunca renderizar o valor cru em inglês na tela.
3. The system SHALL usar o mesmo componente `Badge` (cor neutra única) tanto para `goal` quanto para o
   pill de status de biomarcador já existente, sem literal de cor/raio novo.

**Independent Test**: abrir o detalhe de um paciente de cada um dos 4 objetivos, confirmar que os 4
rótulos aparecem em português.

---

### P7: Empty states revisados

**User Story**: Como usuário do app, eu quero mensagens de estado vazio que me convidem a agir, para
entender o que fazer em vez de só ver uma tela em branco.

**Why P7**: Item explícito do plano; barato de entregar junto do resto.

**Acceptance Criteria**:

1. The system SHALL exibir `copy.emptyBiomarkers` (nova chave de copy por marca) no lugar do texto
   hardcoded atual (`EMPTY_BIOMARKERS_MESSAGE`) quando um paciente não tem biomarcador registrado.
2. WHEN o filtro "Inativos e concluídos" (P5) não retorna nenhum paciente THEN o sistema SHALL mostrar
   um empty state distinto do empty state padrão da carteira (copy própria, "Nenhum paciente inativo
   ou concluído no momento" ou equivalente por marca), nunca reaproveitando `copy.emptyPatients` tal
   qual.
3. The system SHALL manter a separação exigida pelo CLAUDE.md §5.5 entre estado vazio e estado de erro
   — nenhuma copy nova desta feature reaproveita o componente/mensagem de erro.

**Independent Test**: abrir o detalhe de um paciente sem biomarcador, confirmar a copy nova; aplicar o
filtro "Inativos e concluídos" quando não há nenhum, confirmar a copy distinta da lista padrão vazia.

---

### P8: Publicar atualização OTA

**User Story**: Como responsável pela entrega, eu quero publicar esta versão via EAS Update nos canais
de desenvolvimento já existentes, para que o app instalado nos devices receba o CRUD novo sem rebuild
nativo.

**Why P8**: Fecha o critério de aceite de OTA da Fase 4 com conteúdo real desta vez (a Fase 4 validou o
mecanismo; esta fase o usa de verdade).

**Acceptance Criteria**:

1. WHEN `eas update --branch nutri-care-development` (e o equivalente para `vita-plus-development`) é
   executado após esta feature estar completa THEN o sistema SHALL publicar um update aplicável aos
   devices já rodando o `development client` de cada marca.
2. WHEN um device com o app instalado (canal correto) é reaberto após a publicação THEN o sistema
   SHALL baixar e aplicar o update sem exigir novo build nativo.
3. The system SHALL ter `app.json` `version` incrementado (`1.0.0` → `1.1.0`) antes da publicação, para
   que a versão fique rastreável no dashboard do EAS.

**Independent Test**: publicar o update, reabrir o app num device de cada marca, confirmar que o CRUD
novo está disponível sem reinstalar o app.

---

### P9: Idade e datas em formato legível

**User Story**: Como usuário do app, eu quero ver a idade do paciente e as datas em formato brasileiro,
para entender o cadastro sem fazer conta de cabeça nem ler datas no formato técnico da API.

**Why P9**: Sugestão aceita pelo usuário nesta sessão — toque de produto barato que aproveita
`birthDate` (já existente) e `statusChangedAt` (novo, da P3/P4 do backend).

**Acceptance Criteria**:

1. The system SHALL calcular a idade em anos completos a partir de `birthDate` e exibi-la ao lado do
   badge de objetivo, tanto no card da lista quanto no cabeçalho da tela de detalhe.
2. The system SHALL exibir qualquer data voltada ao usuário (`birthDate` no detalhe, `statusChangedAt`
   quando aplicável) formatada como `dd/MM/yyyy`, nunca no formato `YYYY-MM-DD` cru da API.
3. WHILE o paciente está `inactive` THEN o sistema SHALL exibir "Inativo desde {statusChangedAt em
   dd/MM/yyyy}" próximo ao botão "Reativar".
4. WHILE o paciente está `completed` THEN o sistema SHALL exibir "Concluído em {statusChangedAt em
   dd/MM/yyyy}" próximo ao botão "Reabrir acompanhamento".
5. WHILE o paciente está `active` THEN o sistema SHALL omitir qualquer texto de "desde quando" (não há
   `statusChangedAt` relevante a mostrar para o estado padrão).

**Independent Test**: abrir o detalhe de um paciente `inactive`, confirmar idade calculada correta,
`birthDate` em `dd/MM/yyyy`, e a frase "Inativo desde {data}" com a mesma data de `statusChangedAt`
devolvida pela API.

---

## Edge Cases

- IF o usuário perde conexão no meio do preenchimento do formulário de criar/editar THEN o sistema
  SHALL preservar os dados digitados (nenhum campo é limpo por erro de rede) — ver P1 AC5.
- IF o usuário abre o formulário de editar, outra sessão exclui o paciente, e o usuário confirma o
  envio THEN o sistema SHALL tratar o `404` da API como erro (mensagem "paciente não encontrado"),
  navegando de volta para a lista.
- IF o filtro "Inativos e concluídos" está ativo e o usuário cria um paciente novo (sempre `active`)
  THEN o sistema SHALL manter o paciente novo fora da visão atual (ele só aparece ao trocar de volta
  para "Ativos") — nenhuma mudança de filtro automática e silenciosa.
- WHEN a flag `aiActionsEnabled` está desligada (Fase 3) THEN as mudanças desta feature (CRUD, status,
  badge de objetivo) SHALL continuar funcionando normalmente — nenhuma dependência entre esta feature e
  o kill switch de IA.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| UXMOB-01 | P1: Criar paciente | Design | Pending |
| UXMOB-02 | P1: Criar paciente | Design | Pending |
| UXMOB-03 | P1: Criar paciente | Design | Pending |
| UXMOB-04 | P1: Criar paciente | Design | Pending |
| UXMOB-05 | P1: Criar paciente | Design | Pending |
| UXMOB-06 | P1: Criar paciente | Design | Pending |
| UXMOB-07 | P2: Editar cadastro | Design | Pending |
| UXMOB-08 | P2: Editar cadastro | Design | Pending |
| UXMOB-09 | P2: Editar cadastro | Design | Pending |
| UXMOB-10 | P2: Editar cadastro | Design | Pending |
| UXMOB-11 | P3: Excluir paciente | Design | Pending |
| UXMOB-12 | P3: Excluir paciente | Design | Pending |
| UXMOB-13 | P3: Excluir paciente | Design | Pending |
| UXMOB-14 | P3: Excluir paciente | Design | Pending |
| UXMOB-15 | P4: Ciclo de vida | Design | Pending |
| UXMOB-16 | P4: Ciclo de vida | Design | Pending |
| UXMOB-17 | P4: Ciclo de vida | Design | Pending |
| UXMOB-18 | P4: Ciclo de vida | Design | Pending |
| UXMOB-19 | P4: Ciclo de vida | Design | Pending |
| UXMOB-20 | P4: Ciclo de vida | Design | Pending |
| UXMOB-21 | P5: Filtro por status | Design | Pending |
| UXMOB-22 | P5: Filtro por status | Design | Pending |
| UXMOB-23 | P5: Filtro por status | Design | Pending |
| UXMOB-24 | P5: Filtro por status | Design | Pending |
| UXMOB-25 | P6: Badge de objetivo | Design | Pending |
| UXMOB-26 | P6: Badge de objetivo | Design | Pending |
| UXMOB-27 | P6: Badge de objetivo | Design | Pending |
| UXMOB-28 | P7: Empty states | Design | Pending |
| UXMOB-29 | P7: Empty states | Design | Pending |
| UXMOB-30 | P7: Empty states | Design | Pending |
| UXMOB-31 | P8: Publicar OTA | Design | Pending |
| UXMOB-32 | P8: Publicar OTA | Design | Pending |
| UXMOB-33 | P8: Publicar OTA | Design | Pending |
| UXMOB-34 | P9: Idade e datas | Design | Pending |
| UXMOB-35 | P9: Idade e datas | Design | Pending |
| UXMOB-36 | P9: Idade e datas | Design | Pending |
| UXMOB-37 | P9: Idade e datas | Design | Pending |
| UXMOB-38 | P9: Idade e datas | Design | Pending |

**ID format:** `UXMOB-[NUMBER]` (Fase 6, Melhorias UX, Mobile)

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 38 total, 0 mapped to tasks, 38 unmapped ⚠️ (mapeamento acontece na fase Tasks)

---

## Success Criteria

- [ ] Criar, editar e excluir paciente funcionam de ponta a ponta no app, nas duas marcas
- [ ] As quatro transições de status funcionam na tela de detalhe, com o rótulo certo por origem
- [ ] Filtro "Ativos"/"Inativos e concluídos" funciona e reflete o efeito das mudanças de status
- [ ] Nenhum texto em inglês visível relacionado a `goal` em nenhuma tela
- [ ] Idade e todas as datas visíveis ao usuário aparecem em `dd/MM/yyyy`/anos completos, nunca no
      formato ISO cru
- [ ] `tsc --noEmit` limpo, lint de fronteira de marca limpo, `npm test` passa
- [ ] Update OTA publicado nos dois canais de development e aplicado num device de cada marca sem
      rebuild nativo
