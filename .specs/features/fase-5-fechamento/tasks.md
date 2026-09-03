# Fase 5 — Fechamento Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its
Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is
the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review,
Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/fase-5-fechamento/design.md`
**Status**: Approved

---

## Test Coverage Matrix

> Generated from codebase + spec. Guidelines found: `CLAUDE.md` §10 ("testes só bloqueiam a
> entrega se ausentes ou se listas não forem virtualizadas — não exigem um número fechado"),
> `CLAUDE.md` §14 (checklist final). Esta fase é predominantemente documentação e re-verificação de
> trabalho já implementado, não código de produto novo — a maioria das tasks não cria camada de
> código testável, então a "cobertura" real é o próprio checklist/Verifier rodando verde.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Re-verificação de feature (Verifier) | integration (via sub-agente Verifier) | PASS com evidência `file:line` por AC + sensor de discriminação, igual ao padrão já usado nas features anteriores | `.specs/features/*/validation.md` | `composer test` (api) + `npm test` (mobile), conforme a feature |
| Documentação (ADR, README, roteiro de vídeo, checklist) | none | build gate only — existência do arquivo + conteúdo real (não placeholder), checado por grep/leitura | `docs/**/*.md`, `README.md`, `api/README.md`, `mobile/README.md` | grep de seções/strings + leitura manual |
| Configuração de ambiente (`.env.example`) | none | build gate only — nenhuma variável removida que a app leia de fato | `api/.env.example` | `grep -rE "<VAR>" api/config/ api/app/` antes de remover cada uma |
| Checklist final consolidado | integration (build completo) | todos os itens automatizáveis do `docs/plano-de-desenvolvimento.md` §3 passam numa execução | raiz do repo | `docker compose down -v && docker compose up -d --wait`, `composer test`, `npm test`, `tsc --noEmit`, `phpstan analyse`, `pint --test`, scripts de fronteira, greps de segredo |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | Após task de ADR/README individual | leitura do arquivo + grep de seções esperadas |
| Full | Após Bloco 1 (re-verificação) | `cd api && composer test` **e** `cd mobile && npm test` |
| Build | Fechamento da fase (T15) | `docker compose down -v && docker compose up -d --wait` + `composer test` + `npm test` + `tsc --noEmit` + `phpstan analyse` + `pint --test` + `api/scripts/check-layer-boundary.sh` + `mobile/scripts/check-brand-boundary.sh` + grep de segredo no `git log` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks
within a phase execute in order.

### Phase 1: Re-verificação (Bloco 1)

```
T1 → T2
T1 → T3
```

### Phase 2: ADRs (Bloco 2)

```
T4 → T5 → T6 → T7
```

### Phase 3: READMEs (Bloco 3)

```
T8 → T9 → T10 → T11
```

### Phase 4: Roteiro de vídeo (Bloco 5)

```
T12
```

### Phase 5: Limpeza de ambiente e docs internos (Bloco 6)

```
T13 → T14
```

### Phase 6: Checklist final consolidado (Bloco 4)

```
T15 → T16
```

---

## Task Breakdown

### T1: Re-verificar `fase-0-fundacao`

**What**: Dispatch de um Verifier independente (author≠verifier) sobre `fase-0-fundacao`,
confirmando se os blockers do `validation.md` FAIL anterior ainda existem ou já foram corrigidos
por trabalho posterior; corrigir qualquer gap bloqueante encontrado (bounded a 3 iterações) até o
verdict virar PASS.
**Where**: `.specs/features/fase-0-fundacao/validation.md` (reescrito), mais qualquer arquivo de
código que precise de fix.
**Depends on**: None
**Reuses**: Fluxo de Verificação do skill (`references/validate.md`)
**Requirement**: FASE5-01

**Tools**:
- MCP: NONE
- Skill: `tlc-spec-driven` (fluxo de validação)

**Done when**:
- [x] `validation.md` novo com verdict PASS, evidência `file:line` por AC
- [x] Qualquer gap bloqueante do FAIL anterior corrigido e commitado
- [x] `composer test` e `npm test` continuam verdes após qualquer fix

**Tests**: integration
**Gate**: full

---

### T2: Re-verificar `fase-4-release-ota-mobile`

**What**: Dispatch de um Verifier independente sobre `fase-4-release-ota-mobile` (nunca teve
`validation.md`); corrigir gaps bloqueantes até PASS.
**Where**: `.specs/features/fase-4-release-ota-mobile/validation.md` (novo)
**Depends on**: T1
**Reuses**: Fluxo de Verificação do skill
**Requirement**: FASE5-02

**Tools**:
- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:
- [x] `validation.md` novo com verdict PASS
- [x] Qualquer gap bloqueante corrigido e commitado

**Tests**: integration
**Gate**: full

---

### T3: Re-verificar `detalhe-paciente-abas-mobile`

**What**: Dispatch de um Verifier independente sobre `detalhe-paciente-abas-mobile` (nunca teve
`validation.md`); corrigir gaps bloqueantes até PASS.
**Where**: `.specs/features/detalhe-paciente-abas-mobile/validation.md` (novo)
**Depends on**: T1
**Reuses**: Fluxo de Verificação do skill
**Requirement**: FASE5-03

**Tools**:
- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:
- [x] `validation.md` novo com verdict PASS
- [x] Qualquer gap bloqueante corrigido e commitado

**Tests**: integration
**Gate**: full

**Commit**: (commits individuais de fix, se houver, seguem o padrão Conventional Commits já usado
no projeto — sem trailer de co-autoria)

---

### T4: Escrever ADR de estrutura de repo e camadas do backend

**What**: `docs/adr/0003-estrutura-repo-camadas-backend.md`, usando a skill `create-adr` — contexto
real (monorepo, Domain/Application/Infrastructure/Http), decisão, alternativas consideradas
(ex.: Query Builder espalhado, Action classes sem critério), consequências, citando caminhos reais
(`api/app/Domain/`, `api/app/Application/`, `api/app/Infrastructure/`).
**Where**: `docs/adr/0003-estrutura-repo-camadas-backend.md`
**Depends on**: T1 (não documenta uma base ainda não confirmada)
**Reuses**: Skill `create-adr`, `CLAUDE.md` §6.1/§6.2 como fonte do racional
**Requirement**: FASE5-05

**Tools**:
- MCP: NONE
- Skill: `create-adr`

**Done when**:
- [x] Arquivo criado com seções contexto/decisão/alternativas/consequências
- [x] Cita pelo menos 2 caminhos de arquivo reais do código

**Tests**: none
**Gate**: quick

---

### T5: Escrever ADR de stack e arquitetura mobile

**What**: `docs/adr/0004-stack-arquitetura-mobile.md` — TanStack Query, Zustand, `persistQueryClient`
+MMKV, paginação por cursor, `expo-updates`/EAS Update, com alternativas descartadas e por quê.
**Where**: `docs/adr/0004-stack-arquitetura-mobile.md`
**Depends on**: T4
**Reuses**: Skill `create-adr`, `CLAUDE.md` §3/§5
**Requirement**: FASE5-05

**Tools**:
- MCP: NONE
- Skill: `create-adr`

**Done when**:
- [x] Arquivo criado com seções contexto/decisão/alternativas/consequências
- [x] Cita pelo menos 2 caminhos de arquivo reais do código mobile

**Tests**: none
**Gate**: quick

---

### T6: Escrever ADR de ciclo de vida do paciente (formaliza AD-015)

**What**: `docs/adr/0005-ciclo-de-vida-paciente.md`, formalizando a AD-015 já registrada em
`.specs/STATE.md`: `status` independente de soft delete, 4 transições válidas, por que não um enum
único.
**Where**: `docs/adr/0005-ciclo-de-vida-paciente.md`
**Depends on**: T5
**Reuses**: `.specs/STATE.md` AD-015, skill `create-adr`
**Requirement**: FASE5-08

**Tools**:
- MCP: NONE
- Skill: `create-adr`

**Done when**:
- [x] Arquivo criado, decisão consistente com o que já está implementado em
      `fase-6-melhorias-ux-backend` (sem contradizer o código)
- [x] AD-015 em `.specs/STATE.md` atualizada para apontar para este ADR (status → "formalizada em
      docs/adr/0005")

**Tests**: none
**Gate**: quick

---

### T7: Expandir ADR 0001 com decisão de biometria

**What**: Editar `docs/adr/0001-servidor-http-embutido.md` in-place, adicionando seção sobre
biometria (`expo-local-authentication`) no lugar de HealthKit — mesma ADR, tema "capacidade nativa
+ infra" agrupado por decisão do usuário.
**Where**: `docs/adr/0001-servidor-http-embutido.md`
**Depends on**: T6
**Reuses**: Conteúdo já existente do arquivo, `mobile/src/core/auth/useBiometricGate.ts`
**Requirement**: FASE5-06

**Tools**:
- MCP: NONE
- Skill: `create-adr`

**Done when**:
- [x] Seção nova adicionada sem remover o conteúdo original sobre servidor embutido
- [x] Cita `mobile/src/core/auth/useBiometricGate.ts` como implementação real
- [x] `docs/adr/*.md | wc -l` → 5

**Tests**: none
**Gate**: quick

---

### T8: Reescrever `api/README.md`

**What**: Substituir o boilerplate padrão do Laravel por conteúdo real: arquitetura em camadas
(diagrama de `CLAUDE.md` §6.1), como rodar `composer test`/Pint/PHPStan, lista de endpoints
principais, link para `/docs/api` (Scramble).
**Where**: `api/README.md`
**Depends on**: T1
**Reuses**: `docs-driven` já existente em `routes/api.php`, `CLAUDE.md` §6.3 (lista de endpoints)
**Requirement**: FASE5-10

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `grep -i "About Laravel" api/README.md` não retorna nada
- [x] Contém seções: arquitetura, como rodar testes, lint/análise estática, endpoints

**Tests**: none
**Gate**: quick

---

### T9: Reescrever `mobile/README.md` e corrigir versão

**What**: Substituir o boilerplate padrão do Expo por conteúdo real: estrutura `core/`/`brands/`,
como trocar de marca via `APP_BRAND`, como rodar testes/lint/`tsc`, como publicar OTA. Corrigir
`mobile/package.json` `"version"` para `"1.1.0"` (alinhado com `mobile/app.json`).
**Where**: `mobile/README.md`, `mobile/package.json`
**Depends on**: T8
**Reuses**: `mobile/src/brands/index.ts`, `mobile/eas.json`
**Requirement**: FASE5-11

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `grep -i "Welcome to your Expo app" mobile/README.md` não retorna nada
- [x] Contém seções: estrutura core/brands, troca de marca, testes/lint, OTA
- [x] `mobile/package.json` diz `"version": "1.1.0"`

**Tests**: none
**Gate**: quick

---

### T10: Adicionar diagrama de arquitetura e justificativa de biblioteca ao README raiz

**What**: Adicionar ao `README.md` raiz (sem remover "como rodar" já existente): diagrama de
arquitetura (mermaid, visão macro mobile↔API↔DB↔LLM) e tabela de justificativa de biblioteca (uma
linha por escolha da Stack Fixa do `CLAUDE.md` §3, o "porquê").
**Where**: `README.md`
**Depends on**: T9
**Reuses**: `CLAUDE.md` §3 (tabelas de stack já existentes como fonte)
**Requirement**: FASE5-09

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] README raiz tem um bloco mermaid de arquitetura
- [x] README raiz tem uma tabela com pelo menos 10 linhas de justificativa de biblioteca

**Tests**: none
**Gate**: quick

---

### T11: Adicionar "o que ficou de fora" e relatório de uso de IA ao README raiz

**What**: Adicionar seção inline (resumo, não só link) do que ficou de fora e por quê
(`CLAUDE.md` §15), e o relatório de uso de IA: como o Claude Code foi usado no projeto (spec-driven
via `tlc-spec-driven`, sub-agentes de batch, Verifier independente author≠verifier, decisões
registradas em `.specs/STATE.md`) — descrição honesta, sem inflar nem esconder o quanto foi
assistido.
**Where**: `README.md`
**Depends on**: T10
**Reuses**: `CLAUDE.md` §15, `.specs/STATE.md`
**Requirement**: FASE5-09

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Seção "O que ficou de fora" tem pelo menos os 5 itens de `CLAUDE.md` §15, inline (não só link)
- [x] Seção "Uso de IA" descreve o fluxo real (spec-driven, sub-agentes, Verifier) sem alegações
      genéricas tipo "usei IA para produtividade"

**Tests**: none
**Gate**: quick

**Commit**: `docs: complete root/api/mobile READMEs with architecture, library rationale and AI usage report`

---

### T12: Escrever `docs/video-script.md`

**What**: Roteiro cronometrado de 3-5 minutos, ordenado pelo peso da rubrica (multimarca 32%,
plataforma/release 23%, backend em camadas 13%, IA 10%, testes 8%), cada seção nomeando a
tela/comando exato a mostrar.
**Where**: `docs/video-script.md`
**Depends on**: T7, T11 (referencia ADRs e README já prontos como pontos a citar no vídeo)
**Reuses**: nenhum
**Requirement**: FASE5-13

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Arquivo criado com seções nomeadas por peso de rubrica e tempo estimado por seção somando
      3-5 minutos

**Tests**: none
**Gate**: quick

---

### T13: Limpar variáveis não usadas de `api/.env.example`/`api/.env`

**What**: Confirmar via grep que `REDIS_*`, `MEMCACHED_HOST`, `AWS_*`, `VITE_APP_NAME`,
`BROADCAST_CONNECTION` não são referenciadas em `api/config/`/`api/app/`; remover as confirmadas de
`api/.env.example` e do `api/.env` real do usuário.
**Where**: `api/.env.example`, `api/.env`
**Depends on**: T1
**Reuses**: nenhum
**Requirement**: FASE5-16

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `grep -rE "REDIS_|AWS_|MEMCACHED_|VITE_APP_NAME|BROADCAST_CONNECTION" api/config/ api/app/`
      confirma nenhuma referência antes da remoção
- [x] `grep -rE "REDIS_|AWS_|MEMCACHED_|VITE_APP_NAME|BROADCAST_CONNECTION" api/.env.example` não
      retorna nada depois
- [x] `composer test` continua verde (nenhuma variável removida quebrou config)

**Tests**: none
**Gate**: quick

---

### T14: Criar `docs-internal/` (gitignored) com roteiro pessoal e explicação de escolhas

**What**: Criar pasta `docs-internal/` na raiz, adicionar ao `.gitignore`, escrever roteiro pessoal
do app (versão de apoio do usuário para gravar o vídeo, mais detalhada que `docs/video-script.md`)
e explicação de escolhas de produto/arquitetura que não couberem no README público.
**Where**: `docs-internal/`, `.gitignore`
**Depends on**: T13
**Reuses**: conteúdo já escrito em T4-T12 como base
**Requirement**: FASE5-17

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `.gitignore` tem a linha `docs-internal/`
- [ ] `git status docs-internal/` não mostra a pasta como stageable
- [ ] Pelo menos 2 arquivos escritos dentro (`roteiro-pessoal.md`, `explicacao-escolhas.md`)

**Tests**: none
**Gate**: quick

---

### T15: Rodar checklist final consolidado (automatizável)

**What**: Executar, numa única sessão, todos os itens automatizáveis de
`docs/plano-de-desenvolvimento.md` §3: `docker compose down -v && docker compose up -d --wait` do
zero, `composer test`, `npm test`, `tsc --noEmit`, `phpstan analyse`, `pint --test`,
`check-layer-boundary.sh`, `check-brand-boundary.sh`, grep de segredo no histórico do git, grep de
marca em `mobile/src/core/`. Corrigir qualquer falha antes de fechar a task.
**Where**: raiz do repo (nenhum arquivo de produto editado, exceto fixes se algo falhar)
**Depends on**: T2, T3, T7, T11, T12, T14 (todo o resto da fase precisa estar pronto antes do gate
final)
**Reuses**: `docker-compose.yml`, `api/scripts/check-layer-boundary.sh`,
`mobile/scripts/check-brand-boundary.sh`
**Requirement**: FASE5-14

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `docker compose down -v && docker compose up -d --wait` sobe a API na 9000 sem intervenção
      manual
- [ ] `composer test` e `npm test` verdes
- [ ] `tsc --noEmit`, `phpstan analyse`, `pint --test` limpos
- [ ] Os dois scripts de fronteira passam
- [ ] Grep de segredo e de marca não retornam nada
- [ ] Resultado item a item reportado ao usuário

**Tests**: integration
**Gate**: build

---

### T16: Entregar checklist manual de device físico

**What**: Escrever um checklist passo a passo (app instalado nas duas marcas lado a lado, kill
switch virado no banco visualmente, modo avião, OTA aplicado num device real, gate biométrico sem
biometria cadastrada) para o usuário rodar; entregar como arquivo em `docs-internal/` e comunicar
explicitamente que esses itens ficam "aguardando confirmação do usuário" — não são marcados como
concluídos pelo agente.
**Where**: `docs-internal/checklist-manual-dispositivo.md`
**Depends on**: T15
**Reuses**: `docs/plano-de-desenvolvimento.md` §3 (itens de device físico)
**Requirement**: FASE5-15

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Arquivo criado com um passo a passo claro por item
- [ ] Usuário informado explicitamente de que a Fase 5 depende dessa confirmação para fechar 100%

**Tests**: none
**Gate**: quick

**Commit**: `chore: finalize fase-5 checklist, env cleanup and internal docs`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Phase 1:  T1 --→ T2
          T1 --→ T3
Phase 2:  T1 --→ T4 --→ T5 --→ T6 --→ T7
Phase 3:  T1 --→ T8 --→ T9 --→ T10 --→ T11
Phase 4:  T7 --→ T12
          T11 --→ T12
Phase 5:  T1 --→ T13 --→ T14
Phase 6:  T2 --→ T15
          T3 --→ T15
          T7 --→ T15
          T11 --→ T15
          T12 --→ T15
          T14 --→ T15
          T15 --→ T16
```

Execution is strictly sequential - there is no intra-phase parallelism. A single agent (or batch
worker) works one task at a time, in order.

**Batching suggestion** (16 tasks total, > ~8 → sub-agent batches offered per skill rule):
- Batch A: Phase 1 + Phase 2 (T1-T7, 7 tasks)
- Batch B: Phase 3 + Phase 4 + Phase 5 (T8-T14, 7 tasks)
- Batch C: Phase 6 (T15-T16, 2 tasks)

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1-T3 | 1 feature re-verificada cada | ✅ Granular |
| T4-T7 | 1 arquivo ADR cada | ✅ Granular |
| T8-T9 | 1 README + 1 correção de versão cada | ✅ Granular |
| T10-T11 | 1 seção do README raiz cada | ✅ Granular |
| T12 | 1 arquivo | ✅ Granular |
| T13 | 1 limpeza de config, 2 arquivos relacionados | ✅ Granular |
| T14 | 1 pasta + 2 arquivos internos | ✅ Granular |
| T15 | 1 execução de checklist (não edita produto, só verifica) | ✅ Granular |
| T16 | 1 arquivo | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | None | ✅ Match |
| T2 | T1 | T1→T2 | ✅ Match |
| T3 | T1 | T1→T3 | ✅ Match |
| T4 | T1 | T1→T4 | ✅ Match |
| T5 | T4 | T4→T5 | ✅ Match |
| T6 | T5 | T5→T6 | ✅ Match |
| T7 | T6 | T6→T7 | ✅ Match |
| T8 | T1 | T1→T8 | ✅ Match |
| T9 | T8 | T8→T9 | ✅ Match |
| T10 | T9 | T9→T10 | ✅ Match |
| T11 | T10 | T10→T11 | ✅ Match |
| T12 | T7, T11 | T7→T12, T11→T12 | ✅ Match |
| T13 | T1 | T1→T13 | ✅ Match |
| T14 | T13 | T13→T14 | ✅ Match |
| T15 | T2, T3, T7, T11, T12, T14 | T2→T15, T3→T15, T7→T15, T11→T15, T12→T15, T14→T15 | ✅ Match |
| T16 | T15 | T15→T16 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1 | Re-verificação de feature | integration | integration | ✅ OK |
| T2 | Re-verificação de feature | integration | integration | ✅ OK |
| T3 | Re-verificação de feature | integration | integration | ✅ OK |
| T4-T7 | Documentação (ADR) | none | none | ✅ OK |
| T8-T11 | Documentação (README) | none | none | ✅ OK |
| T12 | Documentação (roteiro) | none | none | ✅ OK |
| T13 | Configuração de ambiente | none | none | ✅ OK |
| T14 | Documentação interna | none | none | ✅ OK |
| T15 | Checklist final consolidado | integration | integration | ✅ OK |
| T16 | Documentação | none | none | ✅ OK |

---
