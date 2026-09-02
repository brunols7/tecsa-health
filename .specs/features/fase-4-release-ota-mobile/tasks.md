# Fase 4 — Release: OTA e build por marca (mobile) Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its
Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is
the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review,
Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/fase-4-release-ota-mobile/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Gerado a partir do repositório (`mobile/package.json`, ausência de testes para `app.config.ts`)
> e da natureza da feature. Guidelines encontradas: `CLAUDE.md` §2.3 (tipagem estrita,
> `tsc --noEmit` limpo), §2.6/§10 (testes existem e rodam — mas §10 não pede cobertura para
> config/infra, só para regra de negócio) e §13 (Definition of Done por feature). Nenhuma
> guideline pede teste automatizado para arquivo de configuração de build/release — aplicado o
> default forte da matriz (`Entity/config/schema: none - build gate only`) para os dois arquivos
> de config desta feature; não há camada de domínio/negócio nesta feature.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| `app.config.ts` (updates/runtimeVersion/projectId) | none | build gate only — validado por `npx expo config` resolvendo sem erro e `tsc --noEmit` limpo | `mobile/app.config.ts` | `npx expo config --type public \| jq .` (dry-run local, sem chamada à EAS) |
| `eas.json` (build profiles) | none | build gate only — validado por `eas build:inspect --profile <p> --platform <plat> --non-interactive` (dry-run, gera manifest sem enfileirar build real) | `mobile/eas.json` | `npx eas-cli@latest build:inspect --profile <profile> --platform <platform> --non-interactive` |
| Build nativo instalado (Android/iOS, por marca) | manual/e2e (infra, não Jest) | Independent Test do spec: instalar, confirmar ícone/nome/bundle id distintos | instalação física no device/emulador/simulador | `eas build --profile <profile> --platform <platform>` + instalação manual |
| Update OTA publicado e aplicado | manual/e2e (infra, não Jest) | Independent Test do spec: mudança visual confirmada no device certo, ausente no device da outra marca | `eas update --channel <channel>` + reabertura do app no device | `eas update --channel <channel> --message "..."` |

**Coverage Expectation values** — feature de infraestrutura de build/release; não há
domínio/negócio, rota ou repositório novos. As duas camadas de config seguem o default
`Entity/config/schema: none`. As verificações de build/OTA são inerentemente manuais (dependem de
device físico/simulador e de um serviço externo, EAS) — tratadas como "Independent Test" do spec,
não como suíte Jest.

## Gate Check Commands

> Gerado a partir de `mobile/package.json` (`scripts`).

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Após qualquer task que só mexe em `app.config.ts`/`eas.json` (sem chamar a EAS de verdade) | `npx tsc --noEmit && npx expo config --type public > /dev/null` |
| Full | Após task que roda `pretest`/afeta lint ou boundary scripts | `npm run pretest && npm test` |
| Build | Após task que enfileira um build real na EAS (`eas build`) ou publica update (`eas update`) | Confirmação explícita do usuário antes de rodar + comando `eas` correspondente + verificação manual descrita na task |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks
within a phase execute in order.

### Phase 1: Projeto EAS e configuração de updates

```
T1

T2 → T3 → T4
```

### Phase 2: Validação local de configuração (sem custo externo)

```
T4 → T5
```

### Phase 3: Builds de desenvolvimento por marca (ação externa, gated)

```
T5 → T6 → T7 → T8 → T9
```

### Phase 4: Publicação e validação de OTA + documentação

```
T6 → T10 → T11 → T12
```

---

## Task Breakdown

### T1: Instalar `expo-updates` e `expo-dev-client`

**What**: Rodar `npx expo install expo-updates expo-dev-client` para adicionar as duas
dependências com versão compatível com o Expo SDK 57 já fixado no projeto.
**Where**: `mobile/package.json` (o `expo install` também atualiza `package-lock.json`
automaticamente, como efeito colateral do comando, não uma edição manual separada)
**Depends on**: None
**Reuses**: convenção já usada no projeto de instalar pacotes Expo via `expo install` (não
`npm install` manual).
**Requirement**: REL-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `expo-updates` e `expo-dev-client` aparecem em `dependencies` de `package.json` com as
      versões resolvidas por `expo install`
- [x] `npx tsc --noEmit` continua limpo
- [x] `npm run pretest` continua passando (nenhuma dependência nova quebra lint/boundary)

**Tests**: none
**Gate**: quick

---

### T2: Criar/vincular o projeto EAS (ação externa, requer confirmação)

**What**: **Pausar e confirmar explicitamente com o usuário antes de executar** (`eas login`, se
ainda não autenticado, e `eas init`) — ação que cria um recurso real na conta EAS do usuário.
Depois de confirmado e executado, capturar o `projectId` gerado.
**Where**: Nenhum arquivo do repo (ação de CLI); o `projectId` capturado alimenta T3.
**Depends on**: None
**Reuses**: nenhum — é a primeira integração do projeto com a EAS.
**Requirement**: REL-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Usuário confirmou explicitamente antes de `eas login`/`eas init` rodarem
- [ ] `eas init` concluído com sucesso, projeto vinculado à conta EAS do usuário
- [ ] `projectId` (UUID) anotado para uso em T3

**Tests**: none
**Gate**: build (ação externa; sem gate de código — o "gate" é a confirmação humana antes de
rodar)

**Commit**: nenhum (nenhum arquivo do repo muda nesta task; o commit acontece em T3, que consome o
`projectId`)

---

### T3: Configurar `updates`, `runtimeVersion` e `extra.eas.projectId` em `app.config.ts`

**What**: Acrescentar ao objeto retornado por `app.config.ts` os campos `updates.url` (apontando
para `https://u.expo.dev/<projectId>` de T2), `runtimeVersion: { policy: 'appVersion' }`, e
`extra.eas.projectId`, sem alterar a assinatura da função nem introduzir `if` de marca.
**Where**: `mobile/app.config.ts`
**Depends on**: T2 (precisa do `projectId` real)
**Reuses**: objeto `extra` já existente (`{ ...config.extra, brandId, apiUrl }`) — só ganha o
sub-campo `eas.projectId`, mesmo padrão de spread.
**Requirement**: REL-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `updates.url`, `runtimeVersion.policy` e `extra.eas.projectId` presentes no `ExpoConfig`
      retornado
- [ ] `npx expo config --type public | jq '.updates, .runtimeVersion, .extra.eas'` mostra os três
      campos preenchidos corretamente para `APP_BRAND=nutri-care` e para `APP_BRAND=vita-plus`
- [ ] `npx tsc --noEmit` limpo
- [ ] Nenhuma referência a `nutri-care`/`vita-plus` nova em `mobile/src/core/**` (não se aplica —
      task não toca `core/`, mas confirmar com `npm run pretest`)

**Tests**: none
**Gate**: quick

**Commit**: `feat(mobile): configure expo-updates and eas project id in app config`

---

### T4: Criar `eas.json` com perfis de build de desenvolvimento por marca

**What**: Criar `mobile/eas.json` com dois perfis (`development-nutri-care`,
`development-vita-plus`), cada um com `developmentClient: true`, `distribution: "internal"`,
`channel` nomeado `<brand>-development`, e `env.APP_BRAND` fixo na marca correspondente — conforme
estrutura definida em `design.md`.
**Where**: `mobile/eas.json`
**Depends on**: T3
**Reuses**: nomes de marca (`nutri-care`, `vita-plus`) já usados como `APP_BRAND` em
`app.config.ts`; `KNOWN_BRAND_IDS` continua sendo a única fonte de verdade de quais marcas existem
— `eas.json` só referencia esses IDs nos nomes de profile/channel/env.
**Requirement**: REL-05, REL-06, REL-07, REL-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `mobile/eas.json` válido (JSON bem-formado, `cli.version` presente)
- [ ] Dois perfis, cada um com `channel` e `env.APP_BRAND` distintos e corretos
- [ ] `npx eas-cli@latest build:inspect --profile development-nutri-care --platform android --non-interactive`
      resolve sem erro e mostra `channel: nutri-care-development`
- [ ] Mesmo comando para `development-vita-plus` mostra `channel: vita-plus-development`

**Tests**: none
**Gate**: quick

**Commit**: `feat(mobile): add eas build profiles with per-brand update channels`

---

### T5: Validar configuração local (dry-run, sem custo de fila EAS)

**What**: Rodar as validações locais dos dois artefatos de config juntos (`expo config` para as
duas marcas + `eas build:inspect --non-interactive` para os quatro pares
profile×platform previstos) e registrar a evidência antes de gastar tempo de fila em builds reais.
**Where**: Nenhum arquivo novo — task de verificação.
**Depends on**: T4
**Reuses**: comandos já usados como "Done when" de T3/T4, agora rodados de ponta a ponta.
**Requirement**: REL-05, REL-06, REL-07, REL-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `APP_BRAND=nutri-care npx expo config --type public` e `APP_BRAND=vita-plus npx expo config --type public`
      resolvem sem erro, com `slug`/`ios.bundleIdentifier`/`android.package` distintos (regressão
      da Fase 0, reconfirmada aqui)
- [ ] `APP_BRAND=invalida npx expo config --type public` falha com o erro explícito já existente
      (`isKnownBrandId`) — confirma REL-09 sem código novo
- [ ] `eas build:inspect --non-interactive` para os 4 pares (development-nutri-care/vita-plus ×
      android/ios) resolve sem erro

**Tests**: none
**Gate**: quick

**Commit**: nenhum (task de verificação, sem mudança de arquivo — se alguma validação falhar,
volta para T3/T4 corrigir e commitar lá)

---

### T6: Build de desenvolvimento Android — NutriCare (ação externa, requer confirmação)

**What**: **Confirmar explicitamente com o usuário antes de rodar** (consome cota de build da
conta EAS do usuário) `eas build --profile development-nutri-care --platform android`. Depois de
concluído, instalar o `.apk` gerado num device/emulador Android.
**Where**: Nenhum arquivo do repo — artefato fica na EAS/no device.
**Depends on**: T5
**Reuses**: perfil `development-nutri-care` de T4.
**Requirement**: REL-01, REL-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Usuário confirmou explicitamente antes do build rodar
- [ ] Build concluído com sucesso na EAS
- [ ] `.apk` instalado num device/emulador Android, abre e mostra a marca NutriCare (ícone, nome,
      tema)

**Tests**: manual (Independent Test do spec, P1)
**Gate**: build

**Commit**: nenhum (nenhum arquivo do repo muda)

---

### T7: Build de desenvolvimento Android — VitaPlus (ação externa, requer confirmação)

**What**: Mesma mecânica de T6, para `--profile development-vita-plus --platform android`.
**Where**: Nenhum arquivo do repo.
**Depends on**: T6
**Reuses**: perfil `development-vita-plus` de T4; mesmo fluxo de confirmação de T6.
**Requirement**: REL-01, REL-03, REL-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Usuário confirmou explicitamente antes do build rodar
- [ ] Build concluído com sucesso na EAS
- [ ] `.apk` instalado no mesmo device/emulador Android do NutriCare, sem sobrescrever o app
      anterior (`applicationId` distinto) — os dois ícones aparecem lado a lado
- [ ] Abrir o app VitaPlus mostra a marca correta (ícone, nome, tema)

**Tests**: manual (Independent Test do spec, P1, item "os dois como apps distintos")
**Gate**: build

**Commit**: nenhum

---

### T8: Build de desenvolvimento iOS — NutriCare (ação externa, requer confirmação)

**What**: `eas build --profile development-nutri-care --platform ios`, confirmado antes de
rodar. Instalar no simulador/device iOS do usuário.
**Where**: Nenhum arquivo do repo.
**Depends on**: T7
**Reuses**: perfil `development-nutri-care` de T4.
**Requirement**: REL-02, REL-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Usuário confirmou explicitamente antes do build rodar
- [ ] Build concluído com sucesso na EAS
- [ ] Build instalado em simulador/device iOS, abre e mostra a marca NutriCare

**Tests**: manual (Independent Test do spec, P1)
**Gate**: build

**Commit**: nenhum

---

### T9: Build de desenvolvimento iOS — VitaPlus (ação externa, requer confirmação)

**What**: Mesma mecânica de T8, para `--profile development-vita-plus --platform ios`.
**Where**: Nenhum arquivo do repo.
**Depends on**: T8
**Reuses**: perfil `development-vita-plus` de T4.
**Requirement**: REL-02, REL-03, REL-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Usuário confirmou explicitamente antes do build rodar
- [ ] Build concluído com sucesso na EAS
- [ ] Build instalado no mesmo simulador/device iOS, sem sobrescrever o app NutriCare
      (`bundleIdentifier` distinto)

**Tests**: manual (Independent Test do spec, P1)
**Gate**: build

**Commit**: nenhum

---

### T10: Publicar update OTA no canal NutriCare (ação externa, requer confirmação)

**What**: Fazer uma alteração trivial e visível na UI (ex.: um texto/marcador de versão numa tela
já existente), commitar essa mudança, depois **confirmar explicitamente com o usuário antes de
rodar** `eas update --channel nutri-care-development --message "..."`.
**Where**: um arquivo de UI já existente (ex.: tela inicial/detalhe — escolher o de menor blast
radius no momento da execução) + nenhum arquivo de config novo.
**Depends on**: T6

_Nota: a dependência real é só o build Android NutriCare (T6) — T10 não depende dos builds iOS
(T8/T9), mas só começa depois de Phase 3 terminar, pela execução estritamente sequencial por
fase._
**Reuses**: componente de UI já existente onde o texto-marcador entra.
**Requirement**: REL-10, REL-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Mudança de UI trivial e visível commitada (ex.: `chore(mobile): add OTA verification marker`)
- [ ] Usuário confirmou explicitamente antes de `eas update` rodar
- [ ] `eas update --channel nutri-care-development` publica com sucesso

**Tests**: manual (Independent Test do spec, P3)
**Gate**: build

**Commit**: `chore(mobile): add ota verification marker for fase-4 rollout` (o `eas update` em si
não gera commit — publica o bundle já commitado)

---

### T11: Validar que o OTA chegou no device certo e não vazou para o outro

**What**: Reabrir o app NutriCare instalado (T6) e confirmar visualmente a mudança de T10; reabrir
o app VitaPlus instalado (T7) e confirmar que ele **não** mudou (canal isolado).
**Where**: Nenhum arquivo do repo — verificação manual.
**Depends on**: T10
**Reuses**: os dois builds Android instalados em T6/T7.
**Requirement**: REL-11, REL-12, REL-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] App NutriCare, ao reabrir (ou checar update em foreground), baixa e aplica o novo bundle —
      marcador visual aparece, sem reinstalar o `.apk`
- [ ] App VitaPlus, ao reabrir, **não** mostra o marcador — permanece no bundle anterior
- [ ] `eas update:list --channel vita-plus-development` confirma que nenhum update novo foi
      publicado nesse canal

**Tests**: manual (Independent Test do spec, P3, edge case de isolamento de canal)
**Gate**: build

**Commit**: nenhum

---

### T12: Documentar o fluxo de release no README mobile

**What**: Acrescentar uma seção ao `mobile/README.md` com os comandos exatos usados
(`eas login`/`eas init`, `eas build --profile <p> --platform <plat>`,
`eas update --channel <canal> --message "..."`) e o passo a passo para confirmar visualmente que
um update foi aplicado — reaproveitando o marcador de T10 como exemplo concreto.
**Where**: `mobile/README.md`
**Depends on**: T11
**Reuses**: seção já existente sobre `APP_BRAND`/rodar localmente, como âncora de onde inserir a
seção nova.
**Requirement**: REL-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Seção "Release: build e OTA por marca" presente no README mobile, com os comandos reais
      usados nesta execução (não genéricos)
- [ ] Passo a passo de verificação visual documentado (o marcador usado em T10/T11 como exemplo)
- [ ] `npm run pretest` continua passando (README não quebra nada, mas roda o gate completo como
      fechamento da fase)

**Tests**: none
**Gate**: full

**Commit**: `docs(mobile): document eas build and ota release flow`

---

## Phase Execution Map

Visual representation of task ordering. Phases run in sequence, and tasks within a phase run in
order:

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1     T2 ------→ T3 ------→ T4
Phase 2:                                T4 ------→ T5
Phase 3:                                           T5 ------→ T6 ------→ T7 ------→ T8 ------→ T9
Phase 4:                                                      T6 ------→ T10 ------→ T11 ------→ T12
```

Execution is strictly sequential - there is no intra-phase parallelism. A single agent (or batch
worker) works one task at a time, in order.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Instalar deps | 1 comando, 1 arquivo (package.json) | ✅ Granular |
| T2: Criar projeto EAS | 1 ação externa | ✅ Granular |
| T3: Configurar app.config.ts | 1 arquivo | ✅ Granular |
| T4: Criar eas.json | 1 arquivo | ✅ Granular |
| T5: Validar config local | 1 verificação (2 comandos, sem arquivo novo) | ✅ Granular |
| T6: Build Android NutriCare | 1 ação externa | ✅ Granular |
| T7: Build Android VitaPlus | 1 ação externa | ✅ Granular |
| T8: Build iOS NutriCare | 1 ação externa | ✅ Granular |
| T9: Build iOS VitaPlus | 1 ação externa | ✅ Granular |
| T10: Publicar OTA NutriCare | 1 marcador de UI + 1 ação externa | ✅ Granular |
| T11: Validar OTA nos dois devices | 1 verificação | ✅ Granular |
| T12: Documentar README | 1 arquivo | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | (nenhuma seta de entrada) | ✅ Match |
| T2 | None | (nenhuma seta de entrada) | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 (cross-phase, Phase 1 → Phase 2) | ✅ Match |
| T6 | T5 | T5 → T6 (cross-phase, Phase 2 → Phase 3) | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | T6 | T6 → T10 (cross-phase, Phase 3 → Phase 4; nota: T10 não depende de T7/T8/T9, só precisa do build Android NutriCare) | ✅ Match |
| T11 | T10 | T10 → T11 | ✅ Match |
| T12 | T11 | T11 → T12 | ✅ Match |

**Nota sobre T10:** a dependência real de T10 é só T6 (build Android NutriCare instalado), não a
cadeia completa até T9 — mas T10 só começa depois que Phase 3 termina (execução é estritamente
sequencial por fase, mesmo quando a dependência de dados é mais cedo). O diagrama do Execution Plan
mostra o encadeamento de fases (T9 → T10) para refletir a ordem de execução real; a coluna
"Depends on" no corpo da task é a dependência semântica mínima (T6). Nenhuma das duas contradiz a
regra "dependência nunca aponta para fase futura".

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1: Instalar deps | Entity/config (package.json) | none | none | ✅ OK |
| T2: Criar projeto EAS | N/A (nenhum arquivo) | — | none | ✅ OK |
| T3: app.config.ts | Entity/config | none | none | ✅ OK |
| T4: eas.json | Entity/config | none | none | ✅ OK |
| T5: Validar config local | N/A (verificação) | — | none | ✅ OK |
| T6-T9: Builds | manual/e2e (infra) | manual | manual | ✅ OK |
| T10: Publicar OTA | manual/e2e (infra) | manual | manual | ✅ OK |
| T11: Validar OTA | manual/e2e (infra) | manual | manual | ✅ OK |
| T12: README | Entity/config (docs) | none | none | ✅ OK |

Nenhuma violação — a feature inteira é infraestrutura de build/release sem camada de
domínio/negócio; a matriz de cobertura já reflete isso (`none`/`manual` em vez de `unit`/`e2e` no
sentido Jest), e nenhuma task promete um tipo de teste diferente do que a matriz exige.
