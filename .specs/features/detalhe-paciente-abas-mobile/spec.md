# Detalhe do Paciente em Duas Abas Specification

## Problem Statement

A tela de detalhe do paciente (`mobile/src/app/patients/[id]/index.tsx`) hoje empilha, numa única
`ScrollView`, os dados cadastrais, a lista de biomarcadores, o toggle de acompanhamento, as ações de
ciclo de vida, os botões Editar/Excluir e a seção inteira de ações de IA. Isso deixa a tela longa e
mistura dois propósitos distintos: consultar o paciente e agir sobre as sugestões de IA. O usuário
pediu para separar em duas telas — uma com dados do paciente, outra só com ações de acompanhamento —
e mover Editar/Excluir para um menu no header.

## Goals

- [ ] Duas abas dentro da tela do paciente: "Informações" (dados cadastrais, idade, biomarcadores,
      toggle de acompanhamento, ações de ciclo de vida) e "Acompanhamento" (`AiActionsSection` como
      hoje, sem alteração de comportamento)
- [ ] Navegação entre as abas via `Tabs` nativo do `expo-router` (bottom tabs, rotas próprias com
      URL), sem depender de biblioteca fora da stack aprovada no `CLAUDE.md`
- [ ] Editar e Excluir saem do corpo da tela e viram um menu no header (ícone de overflow),
      disponível nas duas abas
- [ ] Os quatro estados de UI (carregando, erro, vazio, sucesso — CLAUDE.md §5.5) continuam
      cobertos, sem duplicar a lógica de carregamento do paciente em cada aba
- [ ] `tsc --noEmit` limpo, lint de fronteira de marca limpo, sem literal de cor/raio/fonte novo

## Out of Scope

Explicitamente excluído desta feature. Fica para outra fase ou não faz parte do projeto.

| Feature | Reason |
| --- | --- |
| Top tabs / segmented control no topo | Exigiria `@react-navigation/material-top-tabs` + `react-native-pager-view`, fora da stack aprovada no `CLAUDE.md`; decisão do usuário nesta sessão foi usar o `Tabs` de bottom já incluso no `expo-router` |
| Mudar o conteúdo ou comportamento de `AiActionsSection` | A seção só muda de tela, não de comportamento — aceite/descarte/gerar ações seguem como estão |
| Mudar hooks de query/mutation existentes (`usePatientDetailQuery`, `usePatientBiomarkersQuery`, `useAiActionsQuery`, etc.) | Reaproveitados como estão; a mudança é só de composição de UI e navegação |
| Alterar o backend ou os endpoints consumidos | Feature é puramente mobile/navegação |
| Badge de contagem de sugestões pendentes na aba "Acompanhamento" | Não pedido pelo usuário nesta sessão; pode virar melhoria futura |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Onde fica o toggle `needsFollowUp` e `PatientLifecycleActions` | Aba "Informações" | São dados/estado do cadastro do paciente, não sugestões geradas por IA — decisão do usuário | y |
| Tipo de navegação entre as sub-telas | `Tabs` do `expo-router` (rotas próprias, não `useState` local) | Decisão explícita do usuário — quer URL própria e back nativo por aba | y |
| Posição visual das tabs | Bottom tabs (padrão do `Tabs` do `expo-router`, zero dependência nova) | Decisão do usuário após ser avisado que top tabs exigiria dependência nova fora do CLAUDE.md | y |
| Onde vive o menu de Editar/Excluir | Ícone de overflow no header, compartilhado pelas duas abas | Decisão explícita do usuário | y |
| Onde vive o `usePatientDetailQuery` (dado do paciente: nome, idade, status) | No layout compartilhado `patients/[id]/(tabs)/_layout.tsx`, que também é dono do header (título + menu overflow) e dos 4 estados de UI para "paciente não encontrado/erro/offline sem cache" | Evita buscar o paciente duas vezes (uma por aba) e evita duplicar o tratamento de erro/loading; as duas abas dependem do paciente existir antes de fazer sentido | y |
| Onde vive o `usePatientBiomarkersQuery` | Só na aba "Informações" (`(tabs)/index.tsx`) | Só essa aba usa biomarcadores; a aba de acompanhamento não precisa deles | y |
| Como o header consegue setar `headerRight` (menu overflow) uma vez só para as duas abas | Via `Stack.Screen` que envolve o grupo `(tabs)` no `app/_layout.tsx` raiz (mesmo mecanismo já usado hoje para `title` de `patients/[id]`) | Padrão já usado no projeto para o Stack raiz; grupos `(tabs)` não mudam a URL, então o `Stack.Screen name="patients/[id]"` continua correto. A ser confirmado tecnicamente na implementação (primeira task) com o `react-native-expert` — se não funcionar, o fallback é `navigation.setOptions` dentro do layout de tabs | n — validar na Task 1 de implementação |
| IDs de teste (`testID`) dos elementos movidos (`patient-detail-edit-link`, `patient-detail-delete-button`, etc.) | Mantidos com os mesmos nomes onde o elemento equivalente existir, para minimizar diffs de teste; testIDs novos (ex. do botão de overflow) seguem o padrão `patient-detail-*` já usado no arquivo | Consistência com os testes existentes que serão adaptados, não reescritos do zero | y |

**Open questions:** none — todas resolvidas ou registradas acima.

---

## User Stories

### P1: Ver dados do paciente separado das ações de acompanhamento ⭐ MVP

**User Story**: Como nutricionista, quero ver os dados cadastrais e biomarcadores do paciente numa
tela e as ações de acompanhamento de IA em outra, para não rolar uma tela longa e misturada quando só
preciso de uma das duas coisas.

**Why P1**: É o pedido central desta sessão — sem isso não há feature.

**Acceptance Criteria**:

1. WHEN o nutricionista abre o detalhe de um paciente THEN o sistema SHALL exibir duas abas
   navegáveis por bottom tabs: "Informações" (aba inicial/padrão) e "Acompanhamento".
2. WHEN a aba "Informações" está ativa THEN o sistema SHALL exibir nome, badge de objetivo, idade,
   data de nascimento, lista de biomarcadores (ou estado vazio de biomarcadores), o toggle de
   acompanhamento (`needsFollowUp`) e as ações de ciclo de vida (`PatientLifecycleActions`) — mesmo
   conteúdo e comportamento que existem hoje na tela única, sem o footer de Editar/Excluir.
3. WHEN a aba "Acompanhamento" está ativa THEN o sistema SHALL exibir `AiActionsSection` com o mesmo
   comportamento atual (disclaimer, gerar ações, aceitar/descartar, kill switch via `useFlag`).
4. WHEN o nutricionista troca de aba THEN o sistema SHALL preservar cada aba como uma rota própria do
   `expo-router` (não perde estado de scroll/formulário ao alternar e ao voltar).
5. The system SHALL buscar os dados do paciente (`usePatientDetailQuery`) uma única vez, compartilhada
   pelas duas abas, não uma vez por aba.

**Independent Test**: Abrir um paciente, ver a aba "Informações" com os dados, trocar para
"Acompanhamento" e ver a seção de IA; voltar para "Informações" e confirmar que os dados continuam lá.

---

### P1: Editar e excluir movidos para o header ⭐ MVP

**User Story**: Como nutricionista, quero acessar Editar e Excluir por um menu no header, para que o
corpo da tela fique focado em conteúdo e não em botões de ação secundários.

**Why P1**: Pedido explícito do usuário, parte do mesmo escopo da separação de telas.

**Acceptance Criteria**:

1. WHEN o nutricionista visualiza qualquer uma das duas abas do detalhe do paciente THEN o sistema
   SHALL exibir um ícone de overflow (menu "mais opções") no header, comum às duas abas.
2. WHEN o nutricionista toca no ícone de overflow THEN o sistema SHALL exibir as opções "Editar" e
   "Excluir".
3. WHEN o nutricionista escolhe "Editar" no menu THEN o sistema SHALL navegar para
   `/patients/[id]/edit`, mesmo comportamento do link "Editar" atual.
4. WHEN o nutricionista escolhe "Excluir" no menu THEN o sistema SHALL exibir a mesma confirmação
   nativa (`Alert`) com o nome do paciente que existe hoje, e SHALL excluir e voltar para a lista em
   caso de confirmação.
5. IF a exclusão falhar THEN o sistema SHALL exibir a mesma mensagem de erro que existe hoje
   (`DELETE_ERROR_MESSAGE`), sem fechar o menu de forma que o erro fique invisível.
6. The system SHALL remover os botões "Editar" e "Excluir" do corpo/footer da tela — eles só existem
   no menu do header.

**Independent Test**: Abrir o detalhe de um paciente, tocar no overflow do header, editar o paciente
via o item do menu, voltar, tocar no overflow de novo e excluir via o item do menu, confirmando que a
mesma UX de confirmação/erro de hoje se mantém.

---

## Edge Cases

- IF o paciente não existe ou a busca falhar (`usePatientDetailQuery` em erro) THEN o sistema SHALL
  exibir o estado de erro atual (mensagem + tentar de novo) **antes** de renderizar as abas — nenhuma
  aba é acessível sem o paciente carregado.
- IF o dispositivo está offline e não há cache do paciente THEN o sistema SHALL exibir a mesma
  mensagem de offline sem cache que existe hoje, no lugar das abas.
- WHILE o paciente ainda está carregando (`pending`) o sistema SHALL exibir o skeleton atual no lugar
  das abas, não um skeleton por aba.
- IF os biomarcadores vierem vazios THEN a aba "Informações" SHALL exibir o estado vazio de
  biomarcadores já existente (`BiomarkersEmptyState`), sem afetar a aba "Acompanhamento".
- IF o kill switch de IA (`aiActionsEnabled`) estiver desligado THEN a aba "Acompanhamento" SHALL
  continuar existindo como aba (não desaparece), mas `AiActionsSection` SHALL renderizar `null` como
  hoje — comportamento inalterado, só o container mudou.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PATDET-01 | P1: Ver dados separados | Design | Pending |
| PATDET-02 | P1: Ver dados separados | Design | Pending |
| PATDET-03 | P1: Ver dados separados | Design | Pending |
| PATDET-04 | P1: Ver dados separados | Design | Pending |
| PATDET-05 | P1: Ver dados separados | Design | Pending |
| PATDET-06 | P1: Editar/excluir no header | Design | Pending |
| PATDET-07 | P1: Editar/excluir no header | Design | Pending |
| PATDET-08 | P1: Editar/excluir no header | Design | Pending |
| PATDET-09 | P1: Editar/excluir no header | Design | Pending |
| PATDET-10 | P1: Editar/excluir no header | Design | Pending |
| PATDET-11 | P1: Editar/excluir no header | Design | Pending |

**ID format:** `PATDET-NN`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 11 total, 0 mapped to tasks, 11 unmapped ⚠️ (mapeamento acontece na fase Execute, escopo
Medium não gera `tasks.md` formal)

---

## Success Criteria

- [ ] Abrir um paciente mostra duas abas por bottom tabs; "Informações" é a aba inicial
- [ ] Trocar de aba preserva dados sem refetch duplicado do paciente
- [ ] Editar/Excluir só existem no menu do header, com o mesmo comportamento (confirmação, erro) de
      hoje
- [ ] Os 4 estados de UI continuam cobertos no nível do paciente (antes das abas)
- [ ] Testes existentes de `index.test.tsx` e `edit.test.tsx` adaptados e passando; novos testes
      cobrindo o menu de overflow e a navegação entre abas
- [ ] `tsc --noEmit`, lint de fronteira de marca e `npm test` limpos em `mobile/`
