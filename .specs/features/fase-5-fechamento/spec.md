# Fase 5 — Fechamento: Testes, Documentação e Checklist Final Specification

## Problem Statement

O projeto tem código funcional e verificado nas Fases 0-4 e 6 (ver `.specs/STATE.md`), mas a
entrega de um desafio técnico não é só código: é código + prova de que ele atende ao pedido +
defesa documentada das decisões. Hoje faltam três coisas concretas para a entrega poder ser
considerada pronta: (1) duas features nunca tiveram um Verifier independente rodando e uma terceira
tem um verdict FAIL nunca revisitado; (2) `docs/adr/` só cobre 2 dos 4 temas exigidos e as duas
READMEs de subprojeto (`api/`, `mobile/`) ainda são boilerplate de scaffold; (3) o checklist final
consolidado (`docs/plano-de-desenvolvimento.md` §3) nunca rodou de ponta a ponta numa única
passagem. Esta é a fase final do projeto — o gate de saída é literalmente "tudo isso está
verdadeiro", não uma feature nova.

## Goals

- [ ] As três features sem gate fechado (`fase-0-fundacao`, `fase-4-release-ota-mobile`,
      `detalhe-paciente-abas-mobile`) têm `validation.md` com verdict PASS, com qualquer gap
      encontrado corrigido antes de seguir.
- [ ] `docs/adr/` tem as 4 ADRs temáticas exigidas por `CLAUDE.md` §14 item 11, mais a `0002`
      existente — 5 arquivos no total, nenhum genérico.
- [ ] README raiz, `api/README.md` e `mobile/README.md` cobrem tudo que `CLAUDE.md` §14 item 10 e
      o plano exigem — nenhum README de subprojeto é mais boilerplate de scaffold.
- [ ] `docs/video-script.md` existe e cobre os pontos que a rubrica de avaliação pesa (arquitetura
      multimarca, plataforma/release, API em camadas, IA, testes).
- [ ] Todos os itens automatizáveis do checklist final (`docs/plano-de-desenvolvimento.md` §3)
      passam numa única execução, incluindo `docker compose down -v && docker compose up` do zero.
- [ ] Itens não automatizáveis (device físico/simulador) têm um checklist manual entregue ao
      usuário, com o resultado aguardando confirmação explícita antes de fechar a fase.

## Out of Scope

| Item | Motivo |
|---|---|
| Nova funcionalidade de produto | Fase 5 é fechamento, não feature nova — nenhum requisito do `docs/requisitos-do-produto.md` pede algo além do que já existe |
| Autenticação real, multi-tenancy, sync bidirecional completa, HealthKit, CI/CD | Explicitamente fora de escopo do projeto inteiro (`CLAUDE.md` §15), não é decisão desta fase |
| Gravação do vídeo em si | Só o roteiro (`docs/video-script.md`) é entregável desta fase; gravar e publicar o vídeo é ação do usuário fora do escopo de um agente de código |
| Publicação em App Store/Play Store | Fora de escopo do projeto inteiro — só build de desenvolvimento/interno via EAS (`CLAUDE.md` §14 item 9) |
| Correção de deprecation notice do PHP 8.5 em `config/database.php` (`PDO::MYSQL_ATTR_SSL_CA`) | Cosmético — não quebra teste nem é regra inviolável; vira P2 nesta spec, não bloqueia o gate |
| Reescrever ADRs `0001`/`0002` do zero | Já existem e cobrem seus temas corretamente; `0001` é só expandida (não reescrita) para incluir biometria |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Escopo de re-verificação | Re-verificar `fase-0-fundacao`, `fase-4-release-ota-mobile`, `detalhe-paciente-abas-mobile` antes de tocar documentação | Decisão explícita do usuário via `AskUserQuestion` — ver `context.md` item 1 | y |
| Itens de device físico | Checklist manual escrito para o usuário rodar; task fica "aguardando confirmação" | Decisão explícita do usuário — ver `context.md` item 2 | y |
| Agrupamento das ADRs | 4 temáticas novas + `0002` mantida como está | Decisão explícita do usuário — ver `context.md` item 3 | y |
| Local dos documentos internos não commitados | `docs-internal/` na raiz, adicionada ao `.gitignore` | Decisão explícita do usuário — ver `context.md` item 4 | y |
| Cobertura mínima de testes | Já satisfeita (272 backend + 293 mobile, ambos verdes) — Fase 5 não exige número novo de testes, só cobertura do caminho crítico das 3 features re-verificadas | `CLAUDE.md` §10 é explícito: "testes só bloqueiam a entrega se ausentes", não por contagem | y (fato verificado, não pergunta) |
| Limpeza de `api/.env.example` | Remover variáveis do scaffold Laravel não usadas pelo projeto (Redis, Memcached, AWS, Broadcast, Vite) de `api/.env.example` **e** do `api/.env` real do usuário, mantendo só o que a app efetivamente lê | Pedido explícito do plano ("verificar se tem informações adicionais/inúteis nos envs, tanto example como no .env"); risco baixo — são vars nunca lidas pela app, confirmado via grep antes de remover | y (fato verificado + pedido direto do plano) |
| Correção de versão divergente (`mobile/package.json` 1.0.0 vs `mobile/app.json` 1.1.0) | Alinhar `package.json` para `1.1.0` | Inconsistência cosmética encontrada durante a investigação; não é pedido explícito mas é um achado factual barato de corrigir | y (fato, correção trivial dentro do escopo de "fechamento") |

**Open questions:** none — todas resolvidas ou registradas acima.

---

## User Stories

### P1: Fechar o gate de verificação das três features pendentes ⭐ MVP

**User Story**: Como responsável técnico pela entrega, quero que toda feature já implementada
tenha um verdict de Verifier independente e verde, para que a documentação final não descreva um
projeto que não foi realmente comprovado.

**Why P1**: Sem isso, qualquer coisa escrita depois (README, ADR, checklist) descreve um estado
não confirmado. É a pré-condição de tudo mais nesta fase.

**Acceptance Criteria**:

1. WHEN o Verifier roda em `fase-0-fundacao` THEN o sistema SHALL produzir um `validation.md` novo
   com verdict PASS, cobrindo especificamente os blockers do `validation.md` anterior (FAIL).
2. WHEN o Verifier roda em `fase-4-release-ota-mobile` THEN o sistema SHALL produzir
   `.specs/features/fase-4-release-ota-mobile/validation.md` com verdict PASS.
3. WHEN o Verifier roda em `detalhe-paciente-abas-mobile` THEN o sistema SHALL produzir
   `.specs/features/detalhe-paciente-abas-mobile/validation.md` com verdict PASS.
4. IF qualquer uma das três re-verificações retornar FAIL ou gap bloqueante THEN o sistema SHALL
   gerar fix tasks dentro desta mesma fase e corrigi-las antes de prosseguir para as histórias P2/P3.
5. The system SHALL manter os verdicts PASS já existentes das demais features intactos (não
   re-verificar o que já está fechado, para não gastar tempo/orçamento à toa).

**Independent Test**: `ls .specs/features/{fase-0-fundacao,fase-4-release-ota-mobile,detalhe-paciente-abas-mobile}/validation.md`
existe nos três, e `grep -l "PASS" ...validation.md` bate nos três.

---

### P1: ADRs temáticas consolidadas ⭐ MVP

**User Story**: Como avaliador do desafio, quero ler um punhado de ADRs bem escritas que
justifiquem as decisões arquiteturais reais do projeto, para julgar a senioridade técnica sem
precisar reconstruir o raciocínio a partir do código.

**Why P1**: `CLAUDE.md` §14 item 11 e a rubrica (14% do peso é "Documentação e defesa das
decisões") tornam isso um critério de avaliação direto, não um nice-to-have.

**Acceptance Criteria**:

1. The system SHALL manter exatamente 5 arquivos em `docs/adr/`: `0001-servidor-http-embutido.md`
   (existente), `0002-selecao-de-provedor-llm.md` (existente), mais 3 novos cobrindo estrutura de
   repo/camadas backend, stack/arquitetura mobile, e ciclo de vida do paciente
   (status vs. soft-delete).
2. WHEN a ADR de infra/nativo é escrita THEN o sistema SHALL expandir `0001` (não criar um arquivo
   novo) para incluir a decisão de biometria no lugar de HealthKit, já que os dois temas
   (infra embutida + capacidade nativa) foram agrupados como um único documento por decisão do
   usuário.
3. Each ADR SHALL seguir a skill `create-adr` (contexto, decisão, alternativas consideradas,
   consequências) e citar `file:line` ou caminho de arquivo real do código quando referenciar uma
   implementação concreta.
4. WHEN a ADR de ciclo de vida do paciente é escrita THEN o sistema SHALL formalizar a decisão
   já registrada como AD-015 em `.specs/STATE.md`, sem contradizer o que já foi implementado em
   `fase-6-melhorias-ux-backend`.

**Independent Test**: `ls docs/adr/*.md | wc -l` → 5; cada ADR nova tem seção de alternativas
consideradas e não é um resumo vazio de uma frase.

---

### P1: READMEs completas (raiz, api, mobile) ⭐ MVP

**User Story**: Como avaliador clonando o repositório pela primeira vez, quero rodar o projeto e
entender as escolhas de arquitetura só lendo as READMEs, sem precisar perguntar nada.

**Why P1**: É entregável obrigatório do desafio ("Documentação: Relatório sobre o uso de IA
documentado no README") e critério de avaliação (14% do peso).

**Acceptance Criteria**:

1. The root README SHALL conter: como rodar (já existe, mantido), diagrama de arquitetura,
   justificativa de cada escolha de biblioteca (mobile e backend), o que ficou de fora e por quê
   (pode linkar `CLAUDE.md` §15, mas precisa inline pelo menos um resumo), e o relatório de uso de
   IA.
2. IF `api/README.md` ainda contém o boilerplate padrão do Laravel (`## About Laravel`,
   `Laravel Sponsors`, etc.) THEN o sistema SHALL substituí-lo por conteúdo real do projeto:
   arquitetura em camadas, como rodar os testes, como rodar Pint/PHPStan, endpoints principais.
3. IF `mobile/README.md` ainda contém o boilerplate padrão do Expo (`Welcome to your Expo app 👋`,
   etc.) THEN o sistema SHALL substituí-lo por conteúdo real do projeto: estrutura `core/`/`brands/`,
   como trocar de marca via `APP_BRAND`, como rodar testes/lint, como publicar OTA.
4. The system SHALL corrigir `mobile/package.json` para `"version": "1.1.0"`, alinhado com
   `mobile/app.json`.

**Independent Test**: `grep -i "About Laravel" api/README.md` e
`grep -i "Welcome to your Expo app" mobile/README.md` não retornam nada; README raiz tem as 5
seções citadas no AC1 (grep por título de cada seção).

---

### P2: Roteiro de vídeo e checklist final consolidado

**User Story**: Como usuário gravando a demonstração de 3-5 minutos, quero um roteiro que já
mapeie o que mostrar e em que ordem, alinhado à rubrica de avaliação, para não esquecer nenhum
ponto que pesa nota durante a gravação.

**Why P2**: Bloqueante para a entrega final (vídeo é entregável obrigatório do desafio), mas não
bloqueia o resto da Fase 5 — o roteiro pode ser escrito em paralelo/depois das ADRs e READMEs.

**Acceptance Criteria**:

1. The system SHALL criar `docs/video-script.md` com um roteiro cronometrado (3-5 minutos) cobrindo,
   na ordem de peso da rubrica: app core multimarca (32%), plataforma/release — flag/OTA/nativo/
   offline (23%), API e camadas do backend (13%), IA (10%), testes (8%).
2. WHEN o checklist final de `docs/plano-de-desenvolvimento.md` §3 é executado THEN o sistema SHALL
   rodar cada item automatizável (testes, lint, scripts de fronteira, `docker compose down -v && up`
   do zero, grep de segredos) numa única sessão e reportar o resultado item a item.
3. IF qualquer item automatizável do checklist falhar THEN o sistema SHALL corrigir antes de marcar
   a Fase 5 como pronta para revisão do usuário.

**Independent Test**: `docs/video-script.md` existe e tem seções nomeadas por peso de rubrica;
output do checklist final roda sem erro e é reportado ao usuário.

---

### P3: Limpeza de ambiente e documentos internos

**User Story**: Como mantenedor do repositório, quero que os arquivos de configuração não carreguem
lixo de scaffold e que anotações de apoio (roteiro pessoal, explicações extras) fiquem organizadas
sem poluir o histórico do git.

**Why P3**: Não bloqueia nenhum critério de avaliação direto, mas é higiene pedida explicitamente
pelo plano ("verificar informações adicionais/inúteis nos envs") e pelo usuário (documentos
internos não commitados).

**Acceptance Criteria**:

1. The system SHALL remover de `api/.env.example` e do `api/.env` real (sem apagar nada que a app
   leia de fato) as variáveis de scaffold não usadas: `MEMCACHED_HOST`, `REDIS_CLIENT`,
   `REDIS_HOST`, `REDIS_PASSWORD`, `REDIS_PORT`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
   `AWS_DEFAULT_REGION`, `AWS_BUCKET`, `AWS_USE_PATH_STYLE_ENDPOINT`, `VITE_APP_NAME`,
   `BROADCAST_CONNECTION`, confirmado via grep que nenhuma delas é referenciada em `api/config/`
   nem `api/app/` antes de remover.
2. The system SHALL criar `docs-internal/` na raiz, adicionar a linha ao `.gitignore`, e escrever
   ali o roteiro pessoal do app e a explicação de escolhas de produto/arquitetura que não couberem
   no README público.

**Independent Test**: `git status docs-internal/` mostra a pasta como ignorada (não staged);
`grep -rE "REDIS_|AWS_|MEMCACHED_|VITE_APP_NAME|BROADCAST_CONNECTION" api/.env.example` não retorna
nada.

---

## Edge Cases

- IF a re-verificação de `fase-0-fundacao` encontrar que os blockers do FAIL anterior já foram
  corrigidos por trabalho posterior (ex.: Fase 2+ construiu em cima e passou) THEN o Verifier SHALL
  ainda assim produzir evidência nova `file:line`, não apenas herdar o FAIL antigo sem checar.
- IF alguma variável listada para remoção do `.env.example` acabar sendo referenciada em algum
  lugar do código (ex.: um teste específico) THEN o sistema SHALL mantê-la e registrar o motivo,
  em vez de remover cegamente.
- WHEN o usuário roda o checklist manual de device físico e algum item falhar (ex.: OTA não chegou
  no device) THEN a Fase 5 SHALL permanecer em aberto para aquele item específico, sem bloquear os
  demais itens já fechados.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| FASE5-01 | P1: Fechar gate de verificação | Tasks | Pending |
| FASE5-02 | P1: Fechar gate de verificação | Tasks | Pending |
| FASE5-03 | P1: Fechar gate de verificação | Tasks | Pending |
| FASE5-04 | P1: Fechar gate de verificação | Tasks | Pending |
| FASE5-05 | P1: ADRs temáticas | Tasks | Pending |
| FASE5-06 | P1: ADRs temáticas | Tasks | Pending |
| FASE5-07 | P1: ADRs temáticas | Tasks | Pending |
| FASE5-08 | P1: ADRs temáticas | Tasks | Pending |
| FASE5-09 | P1: READMEs completas | Tasks | Pending |
| FASE5-10 | P1: READMEs completas | Tasks | Pending |
| FASE5-11 | P1: READMEs completas | Tasks | Pending |
| FASE5-12 | P1: READMEs completas | Tasks | Pending |
| FASE5-13 | P2: Roteiro de vídeo e checklist | Tasks | Pending |
| FASE5-14 | P2: Roteiro de vídeo e checklist | Tasks | Pending |
| FASE5-15 | P2: Roteiro de vídeo e checklist | Tasks | Pending |
| FASE5-16 | P3: Limpeza de ambiente | Tasks | Pending |
| FASE5-17 | P3: Limpeza de ambiente | Tasks | Pending |

**ID format:** `FASE5-NN`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 17 total, 17 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] `.specs/features/{fase-0-fundacao,fase-4-release-ota-mobile,detalhe-paciente-abas-mobile}/validation.md`
      existem, todos com verdict PASS.
- [ ] `docs/adr/` tem 5 arquivos, todos específicos do projeto (nenhum placeholder).
- [ ] Nenhuma README de subprojeto (`api/`, `mobile/`) é boilerplate de scaffold.
- [ ] README raiz tem diagrama de arquitetura, justificativa de biblioteca e relatório de uso de IA.
- [ ] `docs/video-script.md` existe e é cronometrado.
- [ ] Todos os itens automatizáveis do checklist de `docs/plano-de-desenvolvimento.md` §3 passam
      numa execução única, incluindo `docker compose down -v && docker compose up` do zero.
- [ ] Checklist manual de device físico entregue ao usuário, com status explícito de pendente até
      confirmação.
