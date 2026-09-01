# Fase 1 — Feature Flags Mobile Specification

## Problem Statement

O app precisa saber, sem hardcode, quais features estão ligadas para a marca ativa (kill switch de
IA da Fase 3 depende disso), e a carteira de pacientes precisa ficar atrás de um gate biométrico
antes de exibir qualquer conteúdo (CLAUDE.md §9). Hoje `core/flags/` e `core/api/` estão vazios,
nenhuma dependência de rede/estado/persistência está instalada, e não há nenhum provider de flags
nem tela de autenticação. Esta feature entrega os dois: o hook `useFlag(key)` (consumindo o
endpoint da feature irmã `fase-1-feature-flags-backend`) e o gate biométrico via
`expo-local-authentication`.

## Goals

- [ ] `useFlag(key)` devolve o valor efetivo da flag: default da marca enquanto não carregou, valor
      de rede quando chega, último valor conhecido persistido em cold start com o app offline
- [ ] Gate biométrico bloqueia a tela antes de qualquer conteúdo real renderizar, com os três ramos
      de fallback decididos (biometria OK / credencial de device / sem nenhuma credencial) todos
      tratados sem crash
- [ ] `@tanstack/react-query` + `persistQueryClient` com MMKV instalados e configurados no
      `core/` — mecanismo que a Fase 2 (carteira) reusa, não uma solução descartável desta fase
- [ ] Trocar uma flag no banco reflete no app após reabrir (critério de saída da Fase 1 no plano de
      desenvolvimento)

## Out of Scope

Explicitamente fora desta feature.

| Feature                                                        | Reason                                                                    |
| ---------------------------------------------------------------| -------------------------------------------------------------------------- |
| Endpoint `GET /feature-flags` em si                             | Feature irmã `fase-1-feature-flags-backend`                               |
| Uso de `useFlag('aiActionsEnabled')` para esconder superfície de IA | Fase 3 — a superfície de IA nem existe ainda                          |
| Carteira de pacientes, `FlashList`, TanStack Query para dado de paciente | Fase 2 — esta feature só monta a infraestrutura de query/persist que a Fase 2 reusa |
| Seletor de marca em runtime (`__DEV__`)                        | Já existe da Fase 0 (fora do escopo desta feature)                        |
| Autenticação real de usuário (login, sessão)                   | Fora de escopo do projeto inteiro (CLAUDE.md §15) — gate biométrico não é login |
| PIN customizado do app como fallback                            | Decisão do usuário — usa credencial nativa do SO, não uma tela de PIN própria |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | --------------- | --------- | ---------- |
| Ordem gate vs. flags | Gate biométrico bloqueia primeiro; fetch de flags roda em paralelo por trás | Decisão do usuário — flag não é dado sensível de paciente | y |
| Fallback sem biometria cadastrada | Aviso visível + `authenticateAsync({ disableDeviceFallback: false })` (credencial do SO) | Decisão do usuário — nunca silencioso, sempre tenta alguma verificação | y |
| Fallback sem NENHUMA credencial configurada | Deixa passar com aviso de segurança explícito (`passcode_not_set`) | Decisão do usuário — nunca trava o usuário permanentemente fora do app | y |
| Persistência do último valor de flag | `@tanstack/react-query` + `persistQueryClient` + MMKV (antecipado da Fase 2) | CLAUDE.md §3 já proíbe `fetch` em `useEffect` como estado de servidor; escrever cache MMKV artesanal seria descartado na Fase 2 | y |
| Onde o `QueryClient` persistido vive | `core/offline/queryClient.ts`, importado tanto pelo provider de flags quanto (na Fase 2) pela carteira | Estrutura de pastas já prevista no CLAUDE.md §4 (`core/offline/`) | y |
| Escopo de marca no fetch de flags | O client HTTP injeta `?brand=<slug>` automaticamente a partir da marca resolvida em runtime (`resolveBrand`/`Constants.expoConfig.extra.brandId`) | Espelha o contrato definido na feature backend irmã; o app já sabe sua própria marca desde o build (`APP_BRAND`) | y |
| Onde o gate biométrico se encaixa nas rotas do Expo Router | Uma rota/layout que envolve o grupo de rotas da carteira (ex.: `src/app/(protected)/_layout.tsx`), não uma tela solta | Padrão comum do Expo Router para gates de acesso; mantém o gate fora de `core/` como lógica de app, mas reusando hook exposto por `core/` | y |

**Open questions: none** — todas resolvidas ou logadas acima.

---

## User Stories

### P1: Ler feature flag com fallback para default da marca ⭐ MVP

**User Story**: Como app mobile, eu quero ler o valor de uma feature flag via `useFlag(key)`, para
que eu possa esconder/mostrar comportamento sem hardcode e sem travar esperando rede.

**Why P1**: É o mecanismo do qual o kill switch de IA (Fase 3) depende.

**Acceptance Criteria**:

1. WHILE a resposta de rede de `/feature-flags` ainda não chegou THEN `useFlag(key)` SHALL retornar
   `defaults[key]` da marca ativa.
2. WHEN a resposta de rede de `/feature-flags` chega com sucesso THEN `useFlag(key)` SHALL retornar
   o valor de rede para `key`, mesmo que diferente do default.
3. IF `key` não está presente no payload de rede (flag não seedada para a marca) THEN `useFlag(key)`
   SHALL retornar `defaults[key]` da marca ativa, nunca `undefined`.
4. WHILE o app está sem rede (modo avião) e já existe um valor de flag persistido de uma sessão
   anterior THEN `useFlag(key)` SHALL retornar o valor persistido, não o default da marca.
5. WHEN o app é reaberto após uma flag ter sido alterada no banco em uma sessão anterior (com rede
   disponível no momento da reabertura) THEN `useFlag(key)` SHALL eventualmente retornar o novo
   valor (após o fetch resolver), sem exigir reinstalação do app.
6. The system SHALL expor `useFlag` como único ponto de consumo de flags — nenhum componente lê o
   `QueryClient`/cache diretamente.

**Independent Test**: com o backend rodando, trocar uma flag no banco, fechar e reabrir o app —
`useFlag(key)` reflete o novo valor. Desligar a rede e reabrir o app — `useFlag(key)` retorna o
último valor persistido, não trava e não mostra erro na tela.

---

### P2: Gate biométrico antes da carteira ⭐ MVP

**User Story**: Como usuário do app, eu quero autenticar com biometria antes de ver a carteira de
pacientes, para que dados de paciente não fiquem visíveis sem verificação.

**Why P2** (também MVP, numerado P2 só por ordem de leitura): é requisito inviolável do CLAUDE.md
§9; sem ele a Fase 1 não fecha critério de saída.

**Acceptance Criteria**:

1. WHILE o gate biométrico não foi resolvido (nenhum dos três ramos concluiu) THEN o sistema SHALL
   impedir a renderização de qualquer rota protegida (carteira e além), mostrando apenas a tela do
   próprio gate.
2. WHEN o device tem biometria cadastrada e a autenticação é bem-sucedida THEN o sistema SHALL
   liberar a navegação para a rota protegida imediatamente, sem tela intermediária.
3. IF o device tem biometria cadastrada mas a autenticação falha (ex.: rosto/digital não reconhecido)
   THEN o sistema SHALL manter o gate bloqueado e oferecer um botão para tentar novamente, sem
   crash.
4. IF `hasHardwareAsync()` retorna `true` mas `isEnrolledAsync()` retorna `false` (hardware existe,
   nada cadastrado) THEN o sistema SHALL exibir um aviso visível informando que não há biometria
   cadastrada, e em seguida disparar `authenticateAsync({ disableDeviceFallback: false })` para
   oferecer a credencial nativa do SO (PIN/padrão/senha) como verificação.
5. IF a chamada de `authenticateAsync` retorna o erro `passcode_not_set` (nenhuma credencial de
   bloqueio configurada no device, nem biometria nem PIN/padrão/senha) THEN o sistema SHALL liberar
   a navegação para a rota protegida mesmo assim, exibindo um aviso de segurança explícito antes de
   liberar ("acesso liberado sem verificação — nenhuma credencial configurada").
6. IF `hasHardwareAsync()` retorna `false` (device sem sensor biométrico algum, ex.: emulador sem
   configuração) THEN o sistema SHALL seguir o mesmo caminho do item 4 (aviso + credencial de SO),
   tratando ausência de hardware e ausência de cadastro da mesma forma.
7. The system SHALL nunca deixar o gate biométrico lançar uma exceção não tratada para a árvore de
   componentes — qualquer erro de `expo-local-authentication` resolve para um dos ramos acima ou
   para o estado de "tentar novamente" (item 3).

**Independent Test**: em um simulador/emulador sem biometria cadastrada, abrir o app mostra o aviso
de biometria ausente seguido do prompt de credencial do SO (ou o aviso de acesso liberado, se o
emulador também não tiver credencial nenhuma) — em nenhum caso o app trava ou fecha sozinho.

---

### P3: Infraestrutura de query/persist antecipada da Fase 2

**User Story**: Como time de desenvolvimento, eu quero que o `QueryClient` persistido via MMKV já
exista depois desta feature, para que a Fase 2 (carteira) só precise adicionar queries, não montar
a infraestrutura do zero.

**Why P3**: não é visível ao usuário final, mas é pré-requisito técnico registrado nas Assumptions
— sem ele a P1 desta mesma feature não tem onde persistir o último valor conhecido.

**Acceptance Criteria**:

1. The system SHALL expor um `QueryClient` único, configurado com `persistQueryClient` usando um
   storage adapter sobre MMKV, montado uma única vez na raiz do app.
2. WHERE o app roda em ambiente de teste (Jest) THEN o `QueryClient`/persistência SHALL poder ser
   substituído por uma instância em memória, sem exigir o módulo nativo de MMKV.

**Independent Test**: `npm test` roda sem erro relacionado a MMKV/módulo nativo ausente.

---

## Edge Cases

- IF o fetch de `/feature-flags` falha (erro de rede, 5xx) E não existe valor persistido de sessão
  anterior THEN `useFlag(key)` SHALL retornar `defaults[key]` da marca ativa, sem propagar o erro
  para a UI consumidora do hook.
- WHEN o usuário cancela o prompt biométrico do SO (ex.: aperta "Cancelar" no dialog nativo) THEN o
  sistema SHALL tratar como falha de autenticação (mesmo caminho do item 3 da P2), não como sucesso
  nem como ausência de credencial.
- IF a marca ativa (`APP_BRAND`) muda entre builds (ex.: dev trocando via seletor) THEN o cache de
  flags persistido SHALL ser escopado por marca (chave inclui o `brandId`), para não vazar o valor
  de uma marca para outra no mesmo device durante desenvolvimento.

---

## Requirement Traceability

| Requirement ID | Story                                          | Phase  | Status  |
| --------------- | ------------------------------------------------ | ------ | ------- |
| FLAGSMOB-01      | P1: default da marca antes do fetch resolver      | Execute | Complete (T7) |
| FLAGSMOB-02      | P1: valor de rede sobrepõe default                | Execute | Complete (T6, T7) |
| FLAGSMOB-03      | P1: key ausente no payload → default              | Execute | Complete (T7) |
| FLAGSMOB-04      | P1: offline → último valor persistido             | Execute | Complete (T6) |
| FLAGSMOB-05      | P1: flag alterada no banco reflete após reabrir   | Execute | Complete (T6) |
| FLAGSMOB-06      | P2: gate bloqueia conteúdo até resolver           | Execute | Pending (T10) |
| FLAGSMOB-07      | P2: sucesso biométrico libera navegação           | Execute | Complete (T8) |
| FLAGSMOB-08      | P2: falha biométrica → retry, sem crash           | Execute | Complete (T8) |
| FLAGSMOB-09      | P2: sem biometria cadastrada → aviso + credencial SO | Execute | Complete (T8) |
| FLAGSMOB-10      | P2: sem nenhuma credencial → libera com aviso     | Execute | Complete (T8) |
| FLAGSMOB-11      | P2: sem hardware biométrico → mesmo caminho do aviso | Execute | Complete (T8) |
| FLAGSMOB-12      | P3: QueryClient persistido único                  | Execute | Complete (T1, T2) |
| FLAGSMOB-13      | P3: substituível em ambiente de teste             | Execute | Complete (T2, T6, T7) |

**Coverage:** 13 total, 7 mapped and complete (T1-T7 batch), 6 pending (T8-T10 batch, biometric gate)

---

## Success Criteria

- [ ] Trocar uma flag no banco e reabrir o app reflete o novo valor (critério de saída da Fase 1)
- [ ] App funciona em device sem biometria cadastrada — fallback visível, nunca crash (critério de
      saída da Fase 1)
- [ ] Modo avião com cache de flag anterior não quebra `useFlag`
- [ ] `npm test` cobre os três ramos do gate biométrico e os quatro comportamentos de `useFlag`
      (default / rede / offline persistido / key ausente)
