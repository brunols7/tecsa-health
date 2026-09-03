# Fase 6 — Melhorias UX Mobile Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of
truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination
sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

**Pré-requisito de sequência**: esta feature consome os 4 endpoints da feature irmã
`fase-6-melhorias-ux-backend` (`POST`/`PATCH`/`PATCH .../status`/`DELETE` de paciente, filtro
`?status=`). Não iniciar o Execute desta feature antes do backend estar implementado e verificado
(mesma sequência já usada nas Fases 2 e 3 do projeto).

---

**Design**: `.specs/features/fase-6-melhorias-ux-mobile/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase sampling (`src/core/patients/__tests__/*`, `src/core/api/__tests__/*`,
> `src/core/ui/__tests__/*`, `src/app/patients/__tests__/[id].test.tsx`,
> `src/app/(tabs)/__tests__/index.test.tsx`) e `mobile/package.json` scripts. Guidelines found:
> CLAUDE.md §10 ("teste que renderiza com as duas marcas", "quatro estados", "mutation com
> rollback") + amostras existentes como piso. Confirm before Execute.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Funções puras (`core/patients/labels.ts`, `core/patients/date.ts`) | unit | Todas as ramificações; 1:1 com os rótulos/casos do spec (4 objetivos, 2 rótulos de reativação, cálculo de idade em limites de ano) | `src/core/patients/__tests__/labels.test.ts`, `.../date.test.ts` | `npm test` |
| Schema zod (`patientSchema`) | unit | Enum aceita os valores válidos, rejeita valor desconhecido (`.safeParse` falha) | `src/core/api/schemas/__tests__/patient.test.ts` | `npm test` |
| Funções de API (`core/api/patients.ts`) | unit | Toda função nova faz `.parse()` e chama o verbo HTTP certo (mock de `apiPost`/`apiPatch`/`apiDelete`) | `src/core/api/__tests__/patients.test.ts` | `npm test` |
| Hooks de mutation/query (`core/patients/*`) | unit (RTL + `@testing-library/react-hooks`-style via `renderHook`) | Sucesso + erro para cada mutation nova; nenhuma delas testa `onMutate` (não são otimistas, por decisão do context.md) | `src/core/patients/__tests__/use*.test.tsx` | `npm test` |
| Componentes de UI novos (`Badge`, `PatientForm`, `PatientLifecycleActions`, `PatientStatusFilterSheet`) | unit (RTL, comportamento — nunca snapshot puro) | Renderiza conteúdo esperado + interação (toque, submit, seleção) por variação de prop relevante (ex.: `PatientLifecycleActions` para os 3 status) | `src/core/ui/__tests__/*.test.tsx` | `npm test` |
| Telas/rotas (`patients/[id]/index.tsx`, `patients/new.tsx`, `patients/[id]/edit.tsx`, `(tabs)/index.tsx`) | unit (RTL, integração de tela) | Os 4 estados de UI onde aplicável; teste de marca dupla onde a tela já tinha esse teste (`(tabs)/index.tsx`) | `src/app/**/__tests__/*.test.tsx` | `npm test` |
| Fronteira de marca / config (`app.json` version bump) | none | Verificado pelo script de fronteira já existente (`pretest`) e pelo `tsc --noEmit` | - | `npm run pretest && npx tsc --noEmit` |
| Publicação OTA | manual | Verificação visual em device de cada marca (Independent Test do spec, P8) | - | `eas update` + verificação manual |

## Gate Check Commands

> Generated from `mobile/package.json` scripts (`lint`→`expo lint`, `pretest`→lint + fronteira de
> marca, `test`→`jest`). Confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Após tasks só de função pura/schema/hook (sem tela nova) | `npm test` |
| Full | Após tasks que criam/alteram componente ou tela | `npm run pretest && npm test && npx tsc --noEmit` |
| Build | Ao final de cada fase, e obrigatório antes da publicação OTA | `npm run pretest && npm test && npx tsc --noEmit` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks
within a phase execute in order.

### Phase 1: Fundação (schema, funções puras, copy, Badge)

T1, T2, T3, T4, T5 — sem dependência entre si.

### Phase 2: API e hooks de mutation/query

T6 → (T7, T8, T9, T10, T11) — as 5 seguem T6, sem dependência entre elas.

### Phase 3: Tela de detalhe (ciclo de vida, exclusão, badges)

T12 (move de arquivo) → T13 (componente) → T14 (integração de ciclo de vida/exclusão) → T15
(adoção de Badge/copy no detalhe).

### Phase 4: Formulário de criar/editar

T16 → T17, T16 → T18.

### Phase 5: Lista (filtro, badge, botão de criar)

T19 → T20.

### Phase 6: Release

T21 → T22 → T23.

---

## Task Breakdown

### T1: `patientSchema` — enums + `statusChangedAt`

**What**: `goal`/`status` viram `z.enum([...])` (extraídos como `patientGoalSchema`/
`patientStatusSchema` exportados); campo `statusChangedAt: z.string()` adicionado.
**Where**: `mobile/src/core/api/schemas/patient.ts`
**Depends on**: None
**Reuses**: `patientPageSchema` (inalterado, só usa `patientSchema` já estendido)
**Requirement**: UXMOB-25, UXMOB-27, UXMOB-35

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [x] `patientGoalSchema`/`patientStatusSchema` exportados e usados dentro de `patientSchema`
- [x] `.safeParse()` com `goal: 'valor-desconhecido'` falha
- [x] Teste unitário cobrindo enum válido/inválido para os dois campos
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(patient-schema): add goal/status enums and statusChangedAt field`

---

### T2: `core/patients/labels.ts`

**What**: `GOAL_LABELS: Record<Patient['goal'], string>` (4 traduções) e
`lifecycleActionLabel(status): { label: string; target: Patient['status'] } | null`.
**Where**: `mobile/src/core/patients/labels.ts`
**Depends on**: None
**Reuses**: Tipo `Patient` de `core/api/schemas/patient.ts`
**Requirement**: UXMOB-25, UXMOB-16, UXMOB-17

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [x] `GOAL_LABELS` cobre os 4 valores, todos em português
- [x] `lifecycleActionLabel('inactive')` → `{label: 'Reativar', target: 'active'}`;
      `lifecycleActionLabel('completed')` → `{label: 'Reabrir acompanhamento', target: 'active'}`;
      `lifecycleActionLabel('active')` → `null` (tela decide as 2 ações separadamente)
- [x] Teste unitário cobrindo os 4 rótulos de objetivo + os 3 casos de `lifecycleActionLabel`
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(patient-labels): add goal and lifecycle action label maps`

---

### T3: `core/patients/date.ts`

**What**: `calculateAge(birthDateIso, today = new Date()): number` e `formatDateBR(iso): string`.
**Where**: `mobile/src/core/patients/date.ts`
**Depends on**: None
**Reuses**: Nada (funções puras, `Date` nativo)
**Requirement**: UXMOB-34, UXMOB-35

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `calculateAge` correto em limite exato de aniversário (dia antes/depois do aniversário no ano
      corrente)
- [x] `formatDateBR('2026-03-05')` → `'05/03/2026'`
- [x] Teste unitário cobrindo os 2 casos de `calculateAge` (antes/depois do aniversário) e o
      formato de `formatDateBR`
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(patient-date): add age calculation and dd/MM/yyyy formatting`

---

### T4: `core/ui/Badge.tsx`

**What**: Componente `Badge({ label, testID? })`, cor neutra única via `useTheme()`
(`colors.surfaceMuted`/`colors.textSecondary`/`radii.pill`).
**Where**: `mobile/src/core/ui/Badge.tsx`
**Depends on**: None
**Reuses**: `useTheme()`
**Requirement**: UXMOB-27

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [x] Renderiza o `label` recebido
- [x] Nenhum literal de cor/raio (tudo via `useTheme()`)
- [x] Teste renderizando com as duas marcas confirmando que os tokens aplicados diferem (mesmo
      padrão do teste de fronteira de marca já usado em `src/brands/__tests__/index.test.ts`)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(ui): add Badge component`

---

### T5: Copy por marca — `emptyBiomarkers` e `emptyFilteredPatients`

**What**: `Brand['copy']` (tipo) ganha as 2 chaves; `nutri-care/copy.ts` e `vita-plus/copy.ts`
ganham os valores, com tom de voz consistente com `emptyPatients` de cada marca.
**Where**: `mobile/src/core/theme/brand.types.ts` (modify), `mobile/src/brands/nutri-care/copy.ts`
(modify), `mobile/src/brands/vita-plus/copy.ts` (modify)
**Depends on**: None
**Reuses**: Padrão de `emptyPatients` já existente nas duas marcas
**Requirement**: UXMOB-28, UXMOB-29

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [x] Tipo `Brand['copy']` exige as 2 chaves novas (TypeScript quebra se uma marca não preencher —
      mesmo mecanismo de CLAUDE.md §5.2)
- [x] As duas marcas têm texto distinto (não copy idêntica reaproveitada)
- [x] `tsc --noEmit` limpo
- [x] Gate check passes: `npm run pretest && npx tsc --noEmit`

**Tests**: none
**Gate**: full

**Commit**: `feat(brand-copy): add emptyBiomarkers and emptyFilteredPatients copy keys`

---

### T6: `core/api/patients.ts` — 4 funções novas + filtro de status

**What**: `createPatient`, `updatePatient` (genérica, substitui o corpo de `patchPatientFollowUp`,
que vira alias fino), `updatePatientStatus`, `deletePatient`; `fetchPatients` ganha parâmetro
`status: string[]`.
**Where**: `mobile/src/core/api/patients.ts` (modify)
**Depends on**: T1
**Reuses**: `apiPost`/`apiPatch`/`apiDelete`/`apiGet` já existentes em `core/api/http.ts`
**Requirement**: UXMOB-02, UXMOB-08, UXMOB-12, UXMOB-15, UXMOB-21

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [x] Toda função nova chama `.parse()` sobre a resposta (nunca confia em `unknown`)
- [x] `patchPatientFollowUp` continua exportada e funcionando (agora como wrapper de
      `updatePatient`)
- [x] `fetchPatients` propaga `status` como query param `status=a,b`
- [x] Teste unitário cobrindo as 4 funções novas + a assinatura nova de `fetchPatients` (mock de
      `apiGet`/`apiPost`/`apiPatch`/`apiDelete`)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(patient-api): add create, update, status and delete patient functions`

---

### T7: `useCreatePatientMutation`

**What**: `useMutation` sem `onMutate`; `onSuccess` invalida `['patients', brand.id]` (todas as
variações de filtro).
**Where**: `mobile/src/core/patients/useCreatePatientMutation.ts`
**Depends on**: T6
**Reuses**: Padrão de cancelamento/invalidação de `useSetFollowUpMutation` (sem a parte otimista)
**Requirement**: UXMOB-02, UXMOB-04, UXMOB-05, UXMOB-06

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [x] Sucesso invalida a lista de pacientes
- [x] Erro propaga para o chamador sem estado otimista para reverter
- [x] Teste cobrindo sucesso e erro
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(patient-hooks): add useCreatePatientMutation`

---

### T8: `useUpdatePatientMutation`

**What**: `useMutation` sem `onMutate`; `onSuccess` invalida `['patient', id]` e `['patients',
brand.id]`.
**Where**: `mobile/src/core/patients/useUpdatePatientMutation.ts`
**Depends on**: T6
**Reuses**: Mesmo padrão de invalidação de T7
**Requirement**: UXMOB-08, UXMOB-09, UXMOB-10

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [x] Sucesso atualiza o cache do detalhe
- [x] Erro propaga sem reverter estado otimista (não existe)
- [x] Teste cobrindo sucesso e erro
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(patient-hooks): add useUpdatePatientMutation`

---

### T9: `useDeletePatientMutation`

**What**: `useMutation` sem `onMutate`; `onSuccess` remove `['patient', id]` do cache e invalida
`['patients', brand.id]`.
**Where**: `mobile/src/core/patients/useDeletePatientMutation.ts`
**Depends on**: T6
**Reuses**: Mesmo padrão de invalidação de T7
**Requirement**: UXMOB-12, UXMOB-13, UXMOB-14

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [x] Sucesso remove o paciente do cache de lista
- [x] Erro propaga para o chamador mostrar mensagem de "tentar excluir de novo"
- [x] Teste cobrindo sucesso e erro
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(patient-hooks): add useDeletePatientMutation`

---

### T10: `useChangePatientStatusMutation`

**What**: `useMutation` sem `onMutate`; `onSuccess` atualiza `['patient', id]` e invalida
`['patients', brand.id]`.
**Where**: `mobile/src/core/patients/useChangePatientStatusMutation.ts`
**Depends on**: T6
**Reuses**: Mesmo padrão de invalidação de T7
**Requirement**: UXMOB-15, UXMOB-16, UXMOB-17, UXMOB-18, UXMOB-19

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [x] Sucesso atualiza o status exibido
- [x] Erro (incluindo `409`) mantém o status anterior visível, sem crash
- [x] Teste cobrindo sucesso e os dois tipos de erro (rede genérica e `409`)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(patient-hooks): add useChangePatientStatusMutation`

---

### T11: `usePatientsQuery` — parâmetro de filtro de status

**What**: Assinatura muda de `(search)` para `(search, statusFilter: 'active' |
'inactive_completed')`; internamente mapeia para `status=active` ou `status=inactive,completed` na
chamada de `fetchPatients`; `queryKey` ganha o filtro (`['patients', brand.id, search,
statusFilter]`).
**Where**: `mobile/src/core/patients/usePatientsQuery.ts` (modify)
**Depends on**: T6
**Reuses**: Hook existente
**Requirement**: UXMOB-21, UXMOB-22, UXMOB-23

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [x] `statusFilter: 'active'` (default) busca só ativos
- [x] `statusFilter: 'inactive_completed'` busca `inactive,completed`
- [x] Teste cobrindo os 2 filtros com query keys diferentes (não colidem no cache)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(patient-hooks): add status filter parameter to usePatientsQuery`

---

### T12: Mover `patients/[id].tsx` → `patients/[id]/index.tsx`

**What**: `git mv` do arquivo de rota (conteúdo idêntico, nenhuma mudança de lógica) e do teste
companheiro, para caber `patients/[id]/edit.tsx` como rota irmã sem colisão de segmento dinâmico no
Expo Router.
**Where**: `mobile/src/app/patients/[id].tsx` → `mobile/src/app/patients/[id]/index.tsx`,
`mobile/src/app/patients/__tests__/[id].test.tsx` → `mobile/src/app/patients/[id]/__tests__/index.test.tsx`
**Depends on**: None
**Reuses**: Conteúdo integral do arquivo atual
**Requirement**: (pré-requisito estrutural de UXMOB-07, UXMOB-11)

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [x] Rota `/patients/:id` continua respondendo exatamente como antes (nenhuma mudança visual)
- [x] Teste movido continua passando sem alteração de asserção
- [x] Nenhum import quebrado em outros arquivos que referenciam o caminho antigo
- [x] Gate check passes: `npm run pretest && npm test && npx tsc --noEmit`

**Tests**: unit (teste movido, sem novo teste)
**Gate**: full

**Commit**: `refactor(patients): move [id] detail route into [id]/index for edit sibling route`

---

### T13: `core/ui/PatientLifecycleActions.tsx`

**What**: Componente que renderiza os botões certos por `status` (2 para `active`, 1 para
`inactive`, 1 para `completed`) + a linha "desde quando" (P9) usando `formatDateBR`.
**Where**: `mobile/src/core/ui/PatientLifecycleActions.tsx`
**Depends on**: T2, T3
**Reuses**: `lifecycleActionLabel`, `formatDateBR`, estilo de botão de `DetailErrorView`
(`patients/[id]/index.tsx`, botão "Tentar novamente")
**Requirement**: UXMOB-15, UXMOB-16, UXMOB-17, UXMOB-18, UXMOB-19, UXMOB-20, UXMOB-36, UXMOB-37,
UXMOB-38

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [x] `status='active'` renderiza "Marcar como inativo" + "Concluir acompanhamento"
- [x] `status='inactive'` renderiza só "Reativar" + "Inativo desde {data}"
- [x] `status='completed'` renderiza só "Reabrir acompanhamento" + "Concluído em {data}"
- [x] Toque num botão chama `onChangeStatus` com o `target` certo; botão desabilitado quando
      `pending=true`
- [x] Teste cobrindo os 3 status (renderização certa + toque disparando `onChangeStatus`)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(ui): add PatientLifecycleActions component`

---

### T14: Integrar ciclo de vida e exclusão na tela de detalhe

**What**: `patients/[id]/index.tsx` passa a montar `PatientLifecycleActions` (usando
`useChangePatientStatusMutation`) e um botão "Excluir" que abre `Alert.alert` citando o nome do
paciente, confirmando com `useDeletePatientMutation` e navegando de volta para a lista em caso de
sucesso; ganha também um botão/link "Editar" para `patients/[id]/edit` (rota criada em T18).
**Where**: `mobile/src/app/patients/[id]/index.tsx` (modify)
**Depends on**: T12, T9, T10, T13
**Reuses**: `PatientLifecycleActions` (T13), `useDeletePatientMutation` (T9),
`useChangePatientStatusMutation` (T10)
**Requirement**: UXMOB-11, UXMOB-12, UXMOB-13, UXMOB-14, UXMOB-15 a UXMOB-20

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [x] `Alert.alert` de exclusão cita o nome do paciente, confirmar chama `DELETE`, cancelar não
      chama nada
- [x] Sucesso na exclusão navega de volta para a lista
- [x] `PatientLifecycleActions` funcional na tela real (mudança de status reflete no cabeçalho)
- [x] Botão "Editar" navega para `patients/[id]/edit`
- [x] Teste cobrindo: confirmar exclusão, cancelar exclusão, mudar status com sucesso, mudar status
      com erro
- [x] Gate check passes: `npm run pretest && npm test && npx tsc --noEmit`

**Tests**: unit
**Gate**: full

**Commit**: `feat(patients): add lifecycle actions and delete flow to detail screen`

---

### T15: Adotar `Badge`/idade/copy na tela de detalhe

**What**: `PatientHeader` troca `<Text>{patient.goal}</Text>` por `<Badge label={GOAL_LABELS[...]}>`
+ idade (`calculateAge`) ao lado; `BiomarkerRow` troca o pill inline de status por `<Badge>`;
`BiomarkersEmptyState` usa `copy.emptyBiomarkers` no lugar da constante `EMPTY_BIOMARKERS_MESSAGE`;
`birthDate` exibido via `formatDateBR`.
**Where**: `mobile/src/app/patients/[id]/index.tsx` (modify)
**Depends on**: T12, T4, T3, T5
**Reuses**: `Badge` (T4), `GOAL_LABELS`/`calculateAge`/`formatDateBR` (T2/T3), `copy.emptyBiomarkers`
(T5)
**Requirement**: UXMOB-25, UXMOB-26, UXMOB-27, UXMOB-28, UXMOB-34, UXMOB-35, UXMOB-36

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [x] Nenhum texto cru de `goal` em inglês na tela
- [x] Idade calculada correta ao lado do badge
- [x] `birthDate` exibida em `dd/MM/yyyy`
- [x] Pill de biomarcador agora é `<Badge>` (mesmo componente, sem duplicar estilo)
- [x] Empty state de biomarcador usa a copy da marca
- [x] Teste atualizado confirmando os 4 pontos acima nas duas marcas
- [x] Gate check passes: `npm run pretest && npm test && npx tsc --noEmit`

**Tests**: unit
**Gate**: full

**Commit**: `feat(patients): adopt Badge, age and brand copy in detail screen`

---

### T16: `core/ui/PatientForm.tsx`

**What**: Formulário único (`mode: 'create' | 'edit'`), `react-hook-form` + `zodResolver`, campos
nome/data de nascimento/objetivo, `fieldErrors` mapeando erro `422` de volta ao campo.
**Where**: `mobile/src/core/ui/PatientForm.tsx`
**Depends on**: T1, T2
**Reuses**: Estilo de `TextInput` da busca de `(tabs)/index.tsx:139-154`; `GOAL_LABELS` (T2) para o
seletor
**Requirement**: UXMOB-01, UXMOB-03, UXMOB-04, UXMOB-07

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [x] Validação local bloqueia envio com nome vazio, data em formato inválido, sem objetivo
      selecionado
- [x] `initialValues` pré-preenche em modo `edit`
- [x] `fieldErrors` externo aparece embaixo do campo certo
- [x] Botão de confirmar desabilita durante `submitting`
- [x] Teste cobrindo: validação local bloqueando envio, submit com sucesso, `fieldErrors` externo
      exibido
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(ui): add PatientForm component`

---

### T17: Rota `patients/new.tsx`

**What**: Monta `PatientForm mode="create"`, usa `useCreatePatientMutation`, navega para
`patients/${id}` em sucesso, mapeia erro `422` para `fieldErrors`.
**Where**: `mobile/src/app/patients/new.tsx`
**Depends on**: T16, T7
**Reuses**: `PatientForm` (T16), `useCreatePatientMutation` (T7)
**Requirement**: UXMOB-01, UXMOB-02, UXMOB-04, UXMOB-05, UXMOB-06

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [x] Envio com sucesso navega para o detalhe do paciente novo
- [x] Erro `422` mapeado por campo
- [x] Erro de rede preserva os dados digitados
- [x] Teste cobrindo sucesso, erro de validação, erro de rede
- [x] Gate check passes: `npm run pretest && npm test && npx tsc --noEmit`

**Tests**: unit
**Gate**: full

**Commit**: `feat(patients): add create patient screen`

---

### T18: Rota `patients/[id]/edit.tsx`

**What**: Monta `PatientForm mode="edit"` com `initialValues` de `usePatientDetailQuery`, usa
`useUpdatePatientMutation`, navega de volta ao detalhe em sucesso.
**Where**: `mobile/src/app/patients/[id]/edit.tsx`
**Depends on**: T16, T8, T12
**Reuses**: `PatientForm` (T16), `useUpdatePatientMutation` (T8), `usePatientDetailQuery` (existente)
**Requirement**: UXMOB-07, UXMOB-08, UXMOB-09, UXMOB-10

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [x] Formulário abre pré-preenchido com os dados atuais
- [x] Envio só dos campos alterados; sucesso navega de volta ao detalhe atualizado
- [x] Erro `404` (paciente excluído por outra sessão) mostra mensagem e navega para a lista
- [x] Teste cobrindo pré-preenchimento, sucesso, erro `422`, erro `404`
- [x] Gate check passes: `npm run pretest && npm test && npx tsc --noEmit`

**Tests**: unit
**Gate**: full

**Commit**: `feat(patients): add edit patient screen`

---

### T19: `core/ui/PatientStatusFilterSheet.tsx`

**What**: Modal/bottom-sheet com duas opções (`'active'`/`'inactive_completed'`), usando `Modal`
nativo do React Native.
**Where**: `mobile/src/core/ui/PatientStatusFilterSheet.tsx`
**Depends on**: None
**Reuses**: Nenhum componente de modal existente (primeiro uso de `Modal` no projeto)
**Requirement**: UXMOB-21, UXMOB-22, UXMOB-23, UXMOB-24

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [x] Seleção de "Inativos e concluídos" chama `onSelect('inactive_completed')` e fecha o modal
- [x] Seleção de "Ativos" chama `onSelect('active')` e fecha o modal
- [x] `current` selecionado aparece marcado visualmente
- [x] Teste cobrindo as 2 seleções + fechar sem selecionar
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(ui): add PatientStatusFilterSheet component`

---

### T20: Integrar filtro, badge/idade e botão de criar na lista

**What**: `(tabs)/index.tsx` ganha: ícone de filtro que abre `PatientStatusFilterSheet`, estado
local `statusFilter` passado a `usePatientsQuery`, indicação visual do filtro ativo, empty state
distinto (`copy.emptyFilteredPatients`) quando o filtro "Inativos e concluídos" não retorna nada,
botão "+" navegando para `patients/new`; `PatientCard` troca `<Text>{patient.goal}</Text>` por
`<Badge>` + idade.
**Where**: `mobile/src/app/(tabs)/index.tsx` (modify)
**Depends on**: T4, T3, T5, T11, T19, T17
**Reuses**: `Badge` (T4), `calculateAge` (T3), `copy.emptyFilteredPatients` (T5), `usePatientsQuery`
com filtro (T11), `PatientStatusFilterSheet` (T19)
**Requirement**: UXMOB-21, UXMOB-22, UXMOB-23, UXMOB-24, UXMOB-25, UXMOB-26, UXMOB-29, UXMOB-01

**Tools**:
- MCP: NONE
- Skill: `react-native-expert`

**Done when**:
- [x] Filtro "Ativos" (default) e "Inativos e concluídos" alternam a lista corretamente
- [x] Empty state do filtro "Inativos e concluídos" é visualmente distinto do empty state padrão
- [x] Botão "+" navega para `patients/new`
- [x] `PatientCard` mostra badge de objetivo + idade, nenhum texto cru em inglês
- [x] Teste atualizado cobrindo: troca de filtro, empty state distinto, navegação do botão "+",
      teste de marca dupla já existente continua passando
- [x] Gate check passes: `npm run pretest && npm test && npx tsc --noEmit`

**Tests**: unit
**Gate**: full

**Commit**: `feat(patients): add status filter, badges and create button to patient list`

---

### T21: Bump de versão para publicação OTA

**What**: `mobile/app.json` `version`: `1.0.0` → `1.1.0`.
**Where**: `mobile/app.json` (modify)
**Depends on**: T20
**Reuses**: N/A
**Requirement**: UXMOB-33

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `version` atualizado
- [ ] `npx expo config` (ou `app.config.ts` resolvido) reflete a versão nova
- [ ] Gate check passes: `npm run pretest && npx tsc --noEmit`

**Tests**: none
**Gate**: build

**Commit**: `chore(mobile): bump version to 1.1.0`

---

### T22: Publicar `eas update` nos dois canais de development (ação externa, requer confirmação)

**What**: Rodar `eas update --branch nutri-care-development --message "fase 6: crud de paciente,
ciclo de vida, badges"` e o equivalente para `vita-plus-development`, **confirmando explicitamente
com o usuário antes de publicar** (ação visível/externa, ver diretriz de blast radius do skill).
**Where**: Nenhum arquivo do repo — ação de CLI (`eas update`).
**Depends on**: T21
**Reuses**: Canais já existentes de `mobile/eas.json` (Fase 4) — nenhum perfil novo
**Requirement**: UXMOB-31, UXMOB-32

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Usuário confirmou explicitamente antes de cada `eas update` rodar
- [ ] Os dois updates publicam com sucesso (`eas update:list` mostra o novo update em cada canal)

**Tests**: manual
**Gate**: build

**Commit**: nenhum

---

### T23: Validar OTA aplicado nos devices das duas marcas

**What**: Reabrir o app NutriCare e VitaPlus (development client já instalado, Fase 4) e confirmar
visualmente o CRUD novo funcionando sem rebuild nativo.
**Where**: Nenhum arquivo do repo — verificação manual.
**Depends on**: T22
**Reuses**: Builds de development client já instalados (Fase 4)
**Requirement**: UXMOB-31, UXMOB-32, UXMOB-33

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] App NutriCare, ao reabrir, baixa e aplica o bundle novo — CRUD de paciente funcional
- [ ] App VitaPlus, ao reabrir, baixa e aplica o bundle novo — CRUD de paciente funcional
- [ ] Nenhum rebuild nativo foi necessário em nenhum dos dois

**Tests**: manual
**Gate**: build

**Commit**: nenhum

---

## Phase Execution Map

Todas as arestas de dependência (incluindo as que atravessam fases), agrupadas pela fase da task de
destino:

```
Phase 1:
T1
T2
T3
T4
T5

Phase 2:
T1 → T6
T6 → T7
T6 → T8
T6 → T9
T6 → T10
T6 → T11

Phase 3:
T2 → T13
T3 → T13
T12 → T14
T9 → T14
T10 → T14
T13 → T14
T12 → T15
T4 → T15
T3 → T15
T5 → T15

Phase 4:
T1 → T16
T2 → T16
T16 → T17
T7 → T17
T16 → T18
T8 → T18
T12 → T18

Phase 5:
T4 → T20
T3 → T20
T5 → T20
T11 → T20
T19 → T20
T17 → T20

Phase 6:
T20 → T21
T21 → T22
T22 → T23
```

Execution is strictly sequential within a phase — a single agent (or batch worker) works one task at
a time, in order. `T12` (Fase 3) não depende de nada, mas só é executada no início da Fase 3 por
convenção de agrupamento (é o pré-requisito estrutural das duas tasks seguintes da mesma fase).

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: patientSchema enums | 1 arquivo | ✅ Granular |
| T2: labels.ts | 1 arquivo | ✅ Granular |
| T3: date.ts | 1 arquivo | ✅ Granular |
| T4: Badge | 1 componente | ✅ Granular |
| T5: Copy por marca | 3 arquivos, mesma mudança coesa (2 chaves novas de copy) | ⚠️ OK — mesma mudança atravessando o tipo + as 2 marcas obrigatórias, não 3 features distintas |
| T6: core/api/patients.ts | 1 arquivo, 4 funções + 1 assinatura alterada | ⚠️ OK — mesmo arquivo, mesma camada (fetch), consistente com o padrão já existente no arquivo |
| T7-T10: hooks de mutation | 1 arquivo cada | ✅ Granular |
| T11: usePatientsQuery | 1 arquivo | ✅ Granular |
| T12: mover [id].tsx | 2 arquivos (rota + teste), mesma operação (move) | ⚠️ OK — mover teste junto do arquivo que ele testa é a mesma unidade de trabalho |
| T13: PatientLifecycleActions | 1 componente | ✅ Granular |
| T14: integração ciclo de vida/exclusão | 1 arquivo (tela existente) | ✅ Granular |
| T15: adoção de Badge/copy no detalhe | 1 arquivo (mesma tela de T14, mudança diferente) | ✅ Granular — T14 e T15 tocam o mesmo arquivo mas são mudanças independentes (ciclo de vida vs. apresentação), cada uma com seu próprio commit |
| T16: PatientForm | 1 componente | ✅ Granular |
| T17: patients/new.tsx | 1 arquivo | ✅ Granular |
| T18: patients/[id]/edit.tsx | 1 arquivo | ✅ Granular |
| T19: PatientStatusFilterSheet | 1 componente | ✅ Granular |
| T20: integração da lista | 1 arquivo | ✅ Granular |
| T21: bump de versão | 1 arquivo | ✅ Granular |
| T22: publicar OTA | 0 arquivos (ação externa) | ✅ Granular |
| T23: validar OTA | 0 arquivos (verificação manual) | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | (nenhuma seta) | ✅ Match |
| T2 | None | (nenhuma seta) | ✅ Match |
| T3 | None | (nenhuma seta) | ✅ Match |
| T4 | None | (nenhuma seta) | ✅ Match |
| T5 | None | (nenhuma seta) | ✅ Match |
| T6 | T1 | T1→T6 | ✅ Match |
| T7 | T6 | T6→T7 | ✅ Match |
| T8 | T6 | T6→T8 | ✅ Match |
| T9 | T6 | T6→T9 | ✅ Match |
| T10 | T6 | T6→T10 | ✅ Match |
| T11 | T6 | T6→T11 | ✅ Match |
| T12 | None | (nenhuma seta) | ✅ Match |
| T13 | T2, T3 | T2→T13, T3→T13 | ✅ Match |
| T14 | T12, T9, T10, T13 | T12→T14, T9→T14, T10→T14, T13→T14 | ✅ Match |
| T15 | T12, T4, T3, T5 | T12→T15, T4→T15, T3→T15, T5→T15 | ✅ Match |
| T16 | T1, T2 | T1→T16, T2→T16 | ✅ Match |
| T17 | T16, T7 | T16→T17, T7→T17 | ✅ Match |
| T18 | T16, T8, T12 | T16→T18, T8→T18, T12→T18 | ✅ Match |
| T19 | None | (nenhuma seta) | ✅ Match |
| T20 | T4, T3, T5, T11, T19, T17 | T4→T20, T3→T20, T5→T20, T11→T20, T19→T20, T17→T20 | ✅ Match |
| T21 | T20 | T20→T21 | ✅ Match |
| T22 | T21 | T21→T22 | ✅ Match |
| T23 | T22 | T22→T23 | ✅ Match |

**Rules verificadas**: nenhuma task depende de uma task de fase posterior; todo `Depends on` tem
seta correspondente no diagrama do "Phase Execution Map", incluindo dependências que atravessam
fases.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Schema zod | unit | unit | ✅ OK |
| T2 | Função pura | unit | unit | ✅ OK |
| T3 | Função pura | unit | unit | ✅ OK |
| T4 | Componente UI | unit | unit | ✅ OK |
| T5 | Copy/config | none | none | ✅ OK |
| T6 | Função de API | unit | unit | ✅ OK |
| T7 | Hook de mutation | unit | unit | ✅ OK |
| T8 | Hook de mutation | unit | unit | ✅ OK |
| T9 | Hook de mutation | unit | unit | ✅ OK |
| T10 | Hook de mutation | unit | unit | ✅ OK |
| T11 | Hook de query | unit | unit | ✅ OK |
| T12 | Rota (move) | unit (teste movido) | unit | ✅ OK |
| T13 | Componente UI | unit | unit | ✅ OK |
| T14 | Tela (rota) | unit | unit | ✅ OK |
| T15 | Tela (rota) | unit | unit | ✅ OK |
| T16 | Componente UI | unit | unit | ✅ OK |
| T17 | Tela (rota) | unit | unit | ✅ OK |
| T18 | Tela (rota) | unit | unit | ✅ OK |
| T19 | Componente UI | unit | unit | ✅ OK |
| T20 | Tela (rota) | unit | unit | ✅ OK |
| T21 | Config | none | none | ✅ OK |
| T22 | Ação externa | manual | manual | ✅ OK |
| T23 | Verificação manual | manual | manual | ✅ OK |

Nenhuma violação — nenhuma task promete um tipo de teste diferente do que a matriz exige, e nenhum
"Tests: none" aparece fora das camadas que a matriz já marca como `none`/`manual`.

---

## Tools and Skills Confirmation

Skill `react-native-expert` em praticamente toda task (Expo Router, React Native, hooks de
TanStack Query); **NONE** em T3 (função pura sem RN) e nas 3 tasks operacionais (T21 é só edição de
JSON, T22/T23 são ações externas). Nenhum MCP do projeto se aplica. Confirmar com o usuário antes de
iniciar o Execute.
