# Fase 2 — Carteira de Pacientes Mobile Specification

## Problem Statement

O backend da Fase 2 (`fase-2-carteira-pacientes-backend`, spec/design/tasks já fechados) expõe
`GET /patients`, `GET /patients/:id`, `GET /patients/:id/biomarkers` e `PATCH /patients/:id`, mas o
mobile ainda não tem nenhum jeito de consumi-los: não existem schemas zod, funções de fetch, hooks
de TanStack Query, nem telas de lista/detalhe. A tab "Home" hoje mostra a tela de prova de marca da
Fase 0 (`BrandProofScreen`), que já cumpriu seu propósito. Esta feature fecha o maior peso de
investimento de engenharia do projeto (CLAUDE.md §1, 32%): a carteira de pacientes real, tipada,
virtualizada, offline e com update otimista.

## Goals

- [ ] Schemas zod para `Patient`, `PatientPage` e `Biomarker`, com tipo inferido (nunca escrito à
      mão) e `.parse()` obrigatório em toda resposta de rede
- [ ] Lista de pacientes com `FlashList`, busca, e os quatro estados de UI (carregando, erro, vazio,
      sucesso) — cada um distinto, nenhum spinner centralizado como padrão de carregamento
- [ ] `persistQueryClient`/MMKV mantém a carteira legível em modo avião (reusa `queryClient`
      existente da Fase 1, AD-013)
- [ ] Banner de offline via `NetInfo` (`onlineManager` ligado à conectividade real)
- [ ] Tela de detalhe do paciente com biomarcadores e faixa de referência, incluindo o `status`
      (baixo/normal/alto) já calculado pelo backend
- [ ] Mutation otimista de "marcar acompanhamento" na tela de detalhe (toggle), com
      `onMutate`/`onError` (rollback visível) `onSettled` (invalidação)
- [ ] Lista com 5.000+ pacientes rola sem travar (critério de saída da Fase 2 do plano)

## Out of Scope

Explicitamente fora desta feature. Fica para fases seguintes ou não faz parte do projeto.

| Feature                                                          | Reason                                                                 |
| ----------------------------------------------------------------| ------------------------------------------------------------------------ |
| Endpoints backend (`GET/PATCH /patients/...`)                    | Feature irmã `fase-2-carteira-pacientes-backend`, já implementada antes desta (sequenciamento pedido pelo usuário) |
| Ações de IA sobre o paciente, disclaimer clínico                 | Fase 3 — depende desta feature existir primeiro |
| Edição de `name`/`goal`/`status` (cadastro completo)              | Backend não expõe isso nesta fase (decisão já fechada na spec backend) |
| Nova tab "Pacientes" separada, mantendo Home como está            | Decisão do usuário — a carteira substitui a tab Home; tab "Explore" (resíduo do template) fica como está, fora do escopo |
| Indicador de status de biomarcador na linha da lista              | Decisão do usuário — exigiria N+1 do lado do cliente ou mudar o endpoint de listagem já fechado; card mostra só campos que `GET /patients` já devolve |
| Ação de marcar acompanhamento a partir da lista (swipe/long-press) | Decisão do usuário — o toggle vive só na tela de detalhe |
| HealthKit ou qualquer capacidade nativa além do que a Fase 1 (biometria) já cobre | Fora do escopo do produto (CLAUDE.md §15) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | --------------- | --------- | ---------- |
| Local da carteira na navegação | Substitui `src/app/index.tsx` (tab Home); `BrandProofScreen` é removida | Decisão do usuário | y |
| Detalhe do paciente | Rota nova `src/app/patients/[id].tsx`, empurrada via `expo-router` a partir do card da lista | Convenção padrão do Expo Router para rota dinâmica; nenhuma alternativa discutida | y |
| Gatilho da mutation de acompanhamento | Toggle/switch na tela de detalhe | Decisão do usuário — visibilidade do rollback | y |
| Conteúdo do card da lista | `name` + `goal` + selo quando `needsFollowUp=true` | Decisão do usuário — só campos que `GET /patients` já devolve, sem chamada extra por paciente | y |
| Paginação infinita na lista | `useInfiniteQuery` do TanStack Query, `getNextPageParam` lendo `nextCursor` do backend | Único jeito idiomático de consumir cursor pagination com carregamento incremental no scroll da `FlashList` | y |
| Debounce da busca | 300ms antes de disparar nova query (`search` como query key) | Evita uma requisição por tecla digitada; valor comum, não pedido explicitamente mas necessário para não sobrecarregar a API a cada keystroke | y |
| Cópia (copy) de estado vazio/erro da lista de pacientes | Reusa `theme.copy.emptyPatients` (já existe no contrato `Brand`, Fase 0) para o estado vazio; estado de erro usa uma copy nova e fixa no core (não específica de marca, já que "o que falhou e o que fazer" é uma mensagem técnica, não uma mensagem de produto que precise variar por marca) | `Brand.copy` já tem `emptyPatients`; nenhuma chave de copy para "erro de rede" existe no contrato — criar uma nova exigiria expandir o tipo `Brand` (o que obriga as duas marcas a preencher, CLAUDE.md §5.2); como a mensagem de erro é técnica ("Não foi possível carregar. Tentar novamente"), não há motivo de produto para variar por marca | y |
| Copy do estado vazio de biomarcadores (detalhe) | String fixa no core ("Nenhum biomarcador registrado ainda"), não vinda da marca | Mesma lógica acima — não é um texto que precise de tom de marca distinto, e o contrato `Brand.copy` não teria essa chave sem expandir o tipo | y |
| Tela de detalhe sem paginação de biomarcadores | Lista completa de uma vez (o backend não pagina esse endpoint — decisão já fechada na spec backend, volume baixo por paciente) | Consistência com o contrato do backend | y |
| `estimatedItemSize` da `FlashList` | Medido a partir do card real implementado (não estimado a priori) — task de implementação inclui abrir a lista e ajustar o valor observando o layout renderizado | CLAUDE.md §2.5 exige o valor definido, mas o valor correto depende da altura real do card, que só existe depois do componente pronto | y |

**Open questions: none** — todas resolvidas ou logadas acima.

---

## User Stories

### P1: Listar carteira de pacientes com busca e os quatro estados de UI ⭐ MVP

**User Story**: Como nutricionista usando o app, eu quero ver a lista de pacientes da minha marca,
com busca por nome, para localizar rapidamente quem eu preciso atender — mesmo com milhares de
pacientes, sem a tela travar.

**Why P1**: É a tela que prova a arquitetura mobile inteira (tipagem, estado, virtualização,
offline) ao mesmo tempo — o maior peso de investimento do projeto.

**Acceptance Criteria**:

1. WHEN a tela de carteira monta THEN o sistema SHALL buscar a primeira página de
   `GET /patients?brand=<marca atual>` via `useInfiniteQuery`, validando a resposta com
   `patientPageSchema.parse()` antes de renderizar.
2. WHILE a primeira página ainda não chegou THE system SHALL exibir um skeleton com a forma de
   cards de paciente — nunca um spinner centralizado como estado padrão de carregamento.
3. IF a requisição falha (erro de rede ou status de erro) THEN o sistema SHALL exibir um estado de
   erro distinto do vazio, com mensagem do que falhou e um botão de tentar de novo que refaz a
   query.
4. WHEN a marca não tem nenhum paciente cadastrado (lista vazia na primeira página) THEN o sistema
   SHALL exibir um estado vazio distinto do erro, usando `theme.copy.emptyPatients`.
5. WHEN o usuário rola a lista até perto do fim THEN o sistema SHALL buscar a próxima página usando
   o `nextCursor` da página anterior, anexando os novos itens sem duplicar nem perder os já
   renderizados.
6. WHEN o usuário digita no campo de busca THEN o sistema SHALL, após 300ms sem nova tecla, refazer
   a query com `search=<termo>`, reiniciando a paginação (páginas antigas descartadas, não
   anexadas às novas).
7. The system SHALL renderizar a lista via `@shopify/flash-list`, com `estimatedItemSize` definido e
   `keyExtractor` estável (`patient.id`) — proibido `FlatList`/`ScrollView`+`.map()` (CLAUDE.md §2.5).
8. The system SHALL exibir um banner de offline, visível sempre que `NetInfo` reportar
   desconectado, sem esconder o conteúdo já cacheado da lista.

**Independent Test**: com o backend rodando e o banco seedado (5.000+ pacientes), abrir a tela de
carteira mostra pacientes reais, rolar até o fim da lista carrega mais sem travar nem duplicar
cards, e digitar um nome existente filtra a lista.

---

### P2: Detalhe do paciente com biomarcadores

**User Story**: Como nutricionista, eu quero abrir o detalhe de um paciente e ver seus
biomarcadores com a faixa de referência, para entender rapidamente o que está fora do normal.

**Why P2**: Pré-requisito direto da Fase 3 (ações de IA sobre biomarcadores) e completa a fatia
vertical "carteira + detalhe" pedida pelos requisitos do produto.

**Acceptance Criteria**:

1. WHEN o usuário toca num card da lista THEN o sistema SHALL navegar para
   `src/app/patients/[id].tsx`, passando o `id` do paciente.
2. WHEN a tela de detalhe monta THEN o sistema SHALL buscar `GET /patients/:id` e
   `GET /patients/:id/biomarkers` em paralelo, cada resposta validada por seu próprio schema zod.
3. WHILE qualquer uma das duas buscas ainda não chegou THE system SHALL exibir um skeleton com a
   forma do conteúdo real (cabeçalho do paciente + lista de biomarcadores).
4. IF qualquer uma das duas buscas falha THEN o sistema SHALL exibir um estado de erro distinto do
   vazio, com botão de tentar de novo.
5. WHEN o paciente não tem nenhum biomarcador cadastrado THEN o sistema SHALL exibir, na seção de
   biomarcadores, um estado vazio distinto do erro (copy fixa do core, ver Assumptions).
6. WHEN os biomarcadores chegam THEN o sistema SHALL exibir, para cada um, `label`, `value`, `unit`,
   a faixa `refMin`–`refMax`, e um indicador visual do `status` (baixo/normal/alto) vindo pronto do
   backend — o app nunca recalcula `status` no cliente.

**Independent Test**: abrir o detalhe de um paciente do seed com biomarcador fora da faixa (o
seeder gera ~15% de casos assim) mostra o indicador de status correspondente sem nenhum cálculo
adicional no app.

---

### P3: Marcar/desmarcar acompanhamento com update otimista

**User Story**: Como nutricionista, eu quero marcar um paciente para acompanhamento direto na tela
de detalhe, com resposta instantânea, e ver a mudança desfeita visivelmente se a operação falhar no
servidor.

**Why P3**: É a mutation otimista de exemplo exigida pelo plano — prova o padrão
`onMutate`/`onError`/`onSettled` que qualquer escrita futura do projeto vai seguir.

**Acceptance Criteria**:

1. WHEN o usuário aciona o toggle de acompanhamento na tela de detalhe THEN o sistema SHALL, em
   `onMutate`, aplicar a mudança imediatamente na UI (otimista) e dispará-la via
   `PATCH /patients/:id` em paralelo.
2. IF o `PATCH` retorna erro THEN o sistema SHALL, em `onError`, reverter o toggle para o estado
   anterior ao `onMutate`, usando o snapshot salvo antes da mudança otimista — nunca deixar o
   toggle "preso" no valor otimista quando o servidor rejeitou.
3. WHEN o `PATCH` é bem-sucedido ou falha THEN o sistema SHALL, em `onSettled`, invalidar a query do
   detalhe do paciente, garantindo que o estado final reflita o servidor.
4. The system SHALL manter o toggle desabilitado (não clicável de novo) enquanto uma mutation para o
   mesmo paciente já está em andamento — evita duas mutations concorrentes para o mesmo campo.

**Independent Test**: com o backend rodando, tocar o toggle reflete a mudança instantaneamente;
derrubar a API (parar o container) e tocar o toggle de novo mostra a reversão visível após o
timeout/erro de rede, sem travar a tela.

---

## Edge Cases

- IF a resposta da API não bate com o schema zod (campo faltando, tipo errado) THEN o sistema
  SHALL falhar alto (erro capturado pelo estado de erro da query), nunca renderizar com valores
  ausentes silenciosamente (CLAUDE.md §5.4).
- WHEN o usuário troca de marca (seletor de dev, `__DEV__` only) enquanto a lista está carregada
  THEN o sistema SHALL invalidar/limpar a query da carteira anterior — nenhum paciente da marca
  antiga aparece misturado com a nova (query key inclui `brand.id`, seguindo o padrão já usado em
  `useFeatureFlagsQuery`).
- WHEN o dispositivo está offline e o usuário abre a carteira pela primeira vez nesta sessão (sem
  cache persistido ainda) THEN o sistema SHALL exibir o estado de erro (não há dado local para
  mostrar), com o banner de offline visível reforçando a causa.

---

## Requirement Traceability

| Requirement ID | Story                                          | Phase  | Status  |
| --------------- | ------------------------------------------------ | ------ | ------- |
| PATMOB-01        | P1: Primeira página via `useInfiniteQuery`        | Design | Pending |
| PATMOB-02        | P1: Skeleton de carregamento                      | Design | Pending |
| PATMOB-03        | P1: Estado de erro com retry                      | Design | Pending |
| PATMOB-04        | P1: Estado vazio distinto do erro                  | Design | Pending |
| PATMOB-05        | P1: Paginação infinita sem duplicar/perder item    | Design | Pending |
| PATMOB-06        | P1: Busca com debounce reinicia paginação          | Design | Pending |
| PATMOB-07        | P1: `FlashList` com `estimatedItemSize`/`keyExtractor` | Design | Pending |
| PATMOB-08        | P1: Banner de offline via NetInfo                  | Design | Pending |
| PATMOB-09        | P2: Navegação lista → detalhe                      | Design | Pending |
| PATMOB-10        | P2: Busca paralela paciente + biomarcadores         | Design | Pending |
| PATMOB-11        | P2: Skeleton do detalhe                            | Design | Pending |
| PATMOB-12        | P2: Erro do detalhe com retry                      | Design | Pending |
| PATMOB-13        | P2: Vazio de biomarcadores                          | Design | Pending |
| PATMOB-14        | P2: Exibição de status pronto do backend            | Design | Pending |
| PATMOB-15        | P3: `onMutate` otimista                            | Design | Pending |
| PATMOB-16        | P3: `onError` rollback                             | Design | Pending |
| PATMOB-17        | P3: `onSettled` invalidação                        | Design | Pending |
| PATMOB-18        | P3: Toggle desabilitado durante mutation em curso   | Design | Pending |

**Coverage:** 18 total, 0 mapped to tasks, 18 unmapped ⚠️ (mapeamento acontece na fase Tasks)

---

## Success Criteria

- [ ] Lista com 5.000+ pacientes rola sem travar (teste manual/visual — critério de saída da Fase 2
      do plano)
- [ ] Os quatro estados de UI (carregando, erro, vazio, sucesso) aparecem cada um em algum fluxo
      reproduzível na carteira e no detalhe
- [ ] Modo avião mantém a carteira legível (dado já buscado antes de desligar a rede continua
      visível, via `persistQueryClient`/MMKV)
- [ ] A mutation de acompanhamento reverte visivelmente quando a API retorna erro
- [ ] Nenhum literal de cor/raio/fonte no código novo — tudo via `useTheme()`
- [ ] `npx tsc --noEmit` limpo; `npm test` cobre os quatro estados da lista e o rollback da mutation
      (CLAUDE.md §10)
