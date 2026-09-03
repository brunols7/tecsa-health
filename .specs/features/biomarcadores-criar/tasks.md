# Criação manual de biomarcador Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its
Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is
the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review,
Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/biomarcadores-criar/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase sampling. Guidelines found: no `AGENTS.md`/`CONTRIBUTING.md`; conventions
> read from `CLAUDE.md` §10 ("caminho crítico, não checklist exaustiva") and inferred from existing
> test samples: `api/tests/Unit/BiomarkerStatusTest.php`, `api/tests/Unit/PatientServiceTest.php`,
> `api/tests/Feature/EloquentBiomarkerRepositoryTest.php`, `api/tests/Feature/Api/V1/PatientControllerTest.php`,
> `mobile/src/core/patients/__tests__/useSetFollowUpMutation.test.tsx`,
> `mobile/src/core/api/schemas/__tests__/biomarker.test.ts`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain (`BiomarkerCode`) | unit | All branches: acento, espaço, maiúscula/minúscula, pontuação, string já normalizada | `api/tests/Unit/BiomarkerCodeTest.php` | `cd api && php artisan test --testsuite=Unit` |
| Domain (`CreateBiomarkerData`) | none | Value object sem lógica — build gate só | `api/app/Domain/Biomarker/CreateBiomarkerData.php` | build gate |
| Repository (`EloquentBiomarkerRepository::save`, `$fillable`) | integration | Caminho de escrita: cria com id explícito, campos persistidos, lido de volta igual | `api/tests/Feature/EloquentBiomarkerRepositoryTest.php` | `cd api && php artisan test --testsuite=Feature` |
| Application (`PatientService::createBiomarker`) | unit | 1:1 com BIOM-06/07/08/14: happy path (id/code/status gerados, `save()` chamado) + `PatientNotFound` | `api/tests/Unit/PatientServiceTest.php` | `cd api && php artisan test --testsuite=Unit` |
| Http (`CreateBiomarkerRequest`) | none (coberto via Feature do controller) | Regras validadas indiretamente pelos casos 422 do controller test | — | build gate |
| Http (`PatientController::createBiomarker` + rota) | e2e/Feature | Happy (201 + Location + body) + cada caso 422 (label vazio, value não numérico, refMin>=refMax, value<=0) + 404 paciente inexistente | `api/tests/Feature/Api/V1/PatientControllerTest.php` | `cd api && php artisan test --testsuite=Feature` |
| Mobile schema (`createBiomarkerInputSchema`) | unit | Válido aceito; cada regra de `.refine()`/bounds rejeitada isoladamente | `mobile/src/core/api/schemas/__tests__/biomarker.test.ts` | `cd mobile && npm test` |
| Mobile pure fn (`computeBiomarkerStatus`) | unit | Todas as bordas: `value < refMin`, `value === refMin`, dentro da faixa, `value === refMax`, `value > refMax` | `mobile/src/core/patients/__tests__/biomarkerStatus.test.ts` | `cd mobile && npm test` |
| Mobile api fn (`createBiomarker`) | unit | Monta URL/body corretos, faz parse da resposta com `biomarkerSchema` | `mobile/src/core/api/__tests__/patients.test.ts` | `cd mobile && npm test` |
| Mobile mutation (`useCreateBiomarkerMutation`) | unit | Insere otimista em `onMutate` (antes do resolve), reverte em `onError`, invalida em `onSettled` — mesmo padrão de asserção de `useSetFollowUpMutation.test.tsx` | `mobile/src/core/patients/__tests__/useCreateBiomarkerMutation.test.tsx` | `cd mobile && npm test` |
| Mobile component (`BiomarkerForm`) | unit (RTL) | Bloqueia submit com campo vazio/inválido sem chamar a API; mostra selo de status ao vivo; desabilita botão enquanto pendente; mostra erro inline sem navegar em falha | `mobile/src/core/ui/__tests__/BiomarkerForm.test.tsx` | `cd mobile && npm test` |
| Mobile route (`patients/[id]/index.tsx` — botão "+ Adicionar") | unit (RTL) | Botão renderiza sempre (vazio ou não); toque navega para a rota correta | `mobile/src/app/patients/[id]/__tests__/index.test.tsx` | `cd mobile && npm test` |
| Mobile route (`patients/[id]/biomarkers/new.tsx`) | unit (RTL) | Renderiza o formulário com o `patientId` certo; `onSuccess` chama `router.back()` | `mobile/src/app/patients/[id]/biomarkers/__tests__/new.test.tsx` | `cd mobile && npm test` |

## Gate Check Commands

> Confirme antes do Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick (backend, unit) | Após tasks só de Domain/Application | `cd api && php artisan test --testsuite=Unit` |
| Quick (mobile, jest) | Após tasks só de schema/função pura/hook | `cd mobile && npm test` |
| Full (backend) | Após tasks que tocam Repository/Controller/rota | `cd api && composer test` (roda `check-layer-boundary.sh` + suíte completa) |
| Full (mobile) | Após tasks que tocam componente/rota/tela | `cd mobile && npm run pretest && npm test` (lint + `check-brand-boundary.sh` + jest) |
| Build (fim de fase) | Fim de cada fase | Backend: `cd api && composer lint && composer stan && composer test`. Mobile: `cd mobile && npx tsc --noEmit && npm run pretest && npm test` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks
within a phase execute in order.

### Phase 1: Backend — domínio e persistência

```
T1, T2, T3 (executadas nesta ordem; sem dependência de dado entre si)
```

### Phase 2: Backend — orquestração e HTTP

```
T1 --→ T4
T2 --→ T4
T3 --→ T4
T2 --→ T5
T4 --→ T6
T5 --→ T6
```

### Phase 3: Mobile — reestruturação de rota (isolada)

```
T7
```

### Phase 4: Mobile — schema, função pura e cliente de API

```
T8, T9 (executadas nesta ordem; sem dependência de dado entre si)
T8 --→ T10
```

### Phase 5: Mobile — mutation, formulário e telas

```
T8  --→ T11
T9  --→ T11
T10 --→ T11
T8  --→ T12
T9  --→ T12
T11 --→ T12
T7  --→ T13
T12 --→ T13
T7  --→ T14
T12 --→ T14
```

---

## Task Breakdown

### T1: Criar `BiomarkerCode::fromLabel()` (Domain, puro)

**What**: Classe `BiomarkerCode` com método estático `fromLabel(string $label): string` que gera um
slug (minúsculas, sem acento via `Transliterator` do `ext-intl`, não-alfanumérico → `_`, sem `_`
duplicado ou nas pontas), zero dependência de Laravel.
**Where**: `api/app/Domain/Biomarker/BiomarkerCode.php`
**Depends on**: None
**Reuses**: nada (classe nova)
**Requirement**: BIOM-07

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `BiomarkerCode::fromLabel()` implementado, sem `use Illuminate\...` no arquivo
- [x] Testes cobrem: label simples, label com acento ("Hemoglobina glicada" → mesmo, "Ferro sérico"
      → sem acento), label com pontuação/parênteses, espaços múltiplos colapsados
- [x] Gate check passa: `cd api && php artisan test --testsuite=Unit`
- [x] Contagem de testes: 4+ novos, todos verdes

**Tests**: unit
**Gate**: quick

---

### T2: Criar `CreateBiomarkerData` (Domain, DTO)

**What**: Value object `readonly` com `label: string`, `value: float`, `unit: string`,
`refMin: float`, `refMax: float`, `measuredAt: string`, para cruzar Http → Application sem array
solto (`CLAUDE.md` §2.3/§6.1).
**Where**: `api/app/Domain/Biomarker/CreateBiomarkerData.php`
**Depends on**: None
**Reuses**: mesmo espírito de `ListPatientsQuery` (`CLAUDE.md` §6.2)
**Requirement**: BIOM-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Classe `final readonly class CreateBiomarkerData` com os 6 campos tipados
- [x] Zero import de `Illuminate\`
- [x] Gate check passa: `cd api && composer stan` (nível 6, sem `mixed`)

**Tests**: none
**Gate**: build

---

### T3: Estender `BiomarkerRepository` com `save()` (interface + Eloquent + model)

**What**: Adicionar `save(Biomarker $biomarker): void` à interface `BiomarkerRepository`;
implementar em `EloquentBiomarkerRepository::save()` via `BiomarkerModel::query()->create([...])`
incluindo `id` explícito; adicionar `'id'` ao `$fillable` de `Infrastructure/Persistence/Eloquent/Models/Biomarker.php`.
**Where**: `api/app/Domain/Biomarker/BiomarkerRepository.php`,
`api/app/Infrastructure/Persistence/Eloquent/EloquentBiomarkerRepository.php`,
`api/app/Infrastructure/Persistence/Eloquent/Models/Biomarker.php`
**Depends on**: None
**Reuses**: `BiomarkerModel` já usado por `listForPatient()`
**Requirement**: BIOM-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `save()` persiste todos os campos, incluindo `id` explícito (gerado fora deste método)
- [x] Teste de integração cria um biomarcador via `save()` e confirma via `listForPatient()` /
      leitura direta do model que os campos batem
- [x] `listForPatient()` continua funcionando sem regressão (suíte existente verde)
- [x] Gate check passa: `cd api && php artisan test --testsuite=Feature`
- [x] Contagem de testes: 2+ novos em `EloquentBiomarkerRepositoryTest.php`, suíte total sem queda

**Tests**: integration
**Gate**: full

---

### T4: Implementar `PatientService::createBiomarker()`

**What**: Método que recebe `patientId` e `CreateBiomarkerData`, confirma que o paciente existe
(reusa `PatientNotFound`), gera `id` via `Uuid::uuid4()->toString()` (mesmo padrão de
`AiActionService`), `code` via `BiomarkerCode::fromLabel()`, `status` via `BiomarkerStatus::from()`,
monta a entidade `Biomarker`, chama `$this->biomarkers->save()`, devolve a entidade completa.
**Where**: `api/app/Application/Patient/PatientService.php`
**Depends on**: T1, T2, T3
**Reuses**: `PatientRepository`/`BiomarkerRepository` já injetados, `PatientNotFound`,
`BiomarkerCode`, `BiomarkerStatus::from()`
**Requirement**: BIOM-06, BIOM-07, BIOM-08, BIOM-14

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `createBiomarker()` lança `PatientNotFound` quando `patientId` não existe, sem chamar `save()`
- [x] Caminho feliz gera `id` (uuid v4 válido), `code` (via `BiomarkerCode`), `status` (via
      `BiomarkerStatus::from()`) e chama `save()` exatamente uma vez com a entidade correta
- [x] `status` nunca é lido de `CreateBiomarkerData` — só calculado
- [x] Gate check passa: `cd api && php artisan test --testsuite=Unit`
- [x] Contagem de testes: 3+ novos em `PatientServiceTest.php` (fake/mock de repositório, sem banco)

**Tests**: unit
**Gate**: quick

---

### T5: Criar `CreateBiomarkerRequest`

**What**: FormRequest com `rules()` (`label: required|string|min:2|max:120`,
`value: required|numeric|gt:0`, `unit: required|string|max:20`, `refMin: required|numeric|gte:0`,
`refMax: required|numeric|gt:refMin`, `measuredAt: required|date`) e `toData(): CreateBiomarkerData`.
**Where**: `api/app/Http/Requests/CreateBiomarkerRequest.php`
**Depends on**: T2
**Reuses**: estilo de `UpdateFollowUpRequest` (`final class`, `authorize(): true`)
**Requirement**: BIOM-09, BIOM-10, BIOM-11, BIOM-12, BIOM-13

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `rules()` cobre os 6 campos com os bounds da tabela de Assumptions do `spec.md`
- [x] `toData()` mapeia `$this->validated()` para `CreateBiomarkerData` sem lógica de negócio
- [x] `composer stan` limpo (sem `mixed` desnecessário)
- [x] Gate check passa: `cd api && composer stan`

**Tests**: none
**Gate**: build

---

### T6: Endpoint `POST /api/v1/patients/{id}/biomarkers`

**What**: `PatientController::createBiomarker(CreateBiomarkerRequest, string $id): JsonResponse` →
chama `PatientService::createBiomarker()`, devolve 201 com header `Location` apontando para
`/api/v1/patients/{id}/biomarkers` (a coleção — não há GET individual) e corpo
`new BiomarkerResource($biomarker)`; registrar a rota em `api/routes/api.php`.
**Where**: `api/app/Http/Controllers/Api/V1/PatientController.php`, `api/routes/api.php`
**Depends on**: T4, T5
**Reuses**: `BiomarkerResource` sem alteração
**Requirement**: BIOM-06, BIOM-13, BIOM-14

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] 201 com `Location` e corpo (`id`, `code`, `label`, `value`, `unit`, `refMin`, `refMax`,
      `measuredAt`, `status`) no caminho feliz
- [x] 422 para: `label` vazio, `value` não numérico, `refMin >= refMax`, `value <= 0` — cada um com
      seu próprio teste
- [x] 404 `PATIENT_NOT_FOUND` quando o paciente não existe
- [x] Controller não tem `if`, cálculo, nem acesso a Eloquent (checável por `check-layer-boundary.sh`)
- [x] Gate check passa: `cd api && composer test`
- [x] Contagem de testes: 6+ novos em `PatientControllerTest.php`, suíte total sem queda

**Tests**: e2e
**Gate**: full

**Commit**: `feat(api): add manual biomarker creation endpoint`

---

### T7: Mover `patients/[id].tsx` para `patients/[id]/index.tsx`

**What**: `git mv mobile/src/app/patients/[id].tsx mobile/src/app/patients/[id]/index.tsx` e
`git mv mobile/src/app/patients/__tests__/[id].test.tsx mobile/src/app/patients/[id]/__tests__/index.test.tsx`
— **sem nenhuma mudança de conteúdo** nesta task, só a movimentação, para abrir espaço para a rota
aninhada `biomarkers/new` (Expo Router não permite arquivo e pasta coexistindo no mesmo segmento).
**Where**: `mobile/src/app/patients/[id].tsx` → `mobile/src/app/patients/[id]/index.tsx`
**Depends on**: None
**Reuses**: conteúdo idêntico ao arquivo original
**Requirement**: BIOM-01

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Arquivo e teste movidos via `git mv` (histórico preservado); único conteúdo alterado foi o
      import auto-referente do teste (`'../[id]'` → `'../index'`), necessário porque o arquivo
      importado mudou de nome — sem isso o módulo não resolve (verificado: teste falhava com
      "Cannot find module '../[id]'" antes do ajuste)
- [x] `router.push('/patients/${id}')` (usado em `(tabs)/index.tsx:177`) continua resolvendo para a
      mesma tela (URL não muda: pasta `[id]/index.tsx` responde no mesmo path que `[id].tsx`)
- [x] Suíte existente do detalhe do paciente continua 100% verde, sem nenhum teste novo
- [x] Gate check passa: `cd mobile && npm test`

**Tests**: unit (suíte existente, sem teste novo)
**Gate**: quick

**Commit**: `refactor(mobile): move patient detail screen to nested route folder`

---

### T8: Estender schema com `createBiomarkerInputSchema`

**What**: Adicionar `createBiomarkerInputSchema` (zod) ao arquivo de schema existente, com
`.refine()` garantindo `refMax > refMin`, e exportar `CreateBiomarkerInput`.
**Where**: `mobile/src/core/api/schemas/biomarker.ts`
**Depends on**: None
**Reuses**: `biomarkerStatusSchema`/`biomarkerSchema` já existentes no mesmo arquivo
**Requirement**: BIOM-10, BIOM-11, BIOM-12

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Schema aceita um input válido completo
- [x] Rejeita: `label` vazio, `value` não numérico ou `<= 0`, `refMin` negativo, `refMax <= refMin`
      — um teste por regra
- [x] `tsc --noEmit` limpo
- [x] Gate check passa: `cd mobile && npm test`
- [x] Contagem de testes: 5+ novos em `biomarker.test.ts`

**Tests**: unit
**Gate**: quick

---

### T9: Criar `computeBiomarkerStatus()` (função pura)

**What**: Função `computeBiomarkerStatus(value: number, refMin: number, refMax: number):
BiomarkerStatus` espelhando `BiomarkerStatus::from()` do backend (`value < refMin` → `'low'`,
`value > refMax` → `'high'`, senão `'normal'`).
**Where**: `mobile/src/core/patients/biomarkerStatus.ts`
**Depends on**: None
**Reuses**: tipo `BiomarkerStatus` de `@/core/api/schemas/biomarker`
**Requirement**: BIOM-02, BIOM-08

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Testes cobrem as 5 bordas: abaixo, exatamente no mínimo, dentro, exatamente no máximo, acima
- [ ] Resultado bate com os mesmos casos de `api/tests/Unit/BiomarkerStatusTest.php` (paridade
      explícita, comentada no teste — não no código de produção)
- [ ] Gate check passa: `cd mobile && npm test`
- [ ] Contagem de testes: 5+ novos em `biomarkerStatus.test.ts`

**Tests**: unit
**Gate**: quick

---

### T10: Criar `createBiomarker()` (api function)

**What**: Função `createBiomarker(patientId: string, input: CreateBiomarkerInput):
Promise<Biomarker>` que chama `apiPost(/api/v1/patients/${patientId}/biomarkers, input)` e faz parse
da resposta com `biomarkerSchema`.
**Where**: `mobile/src/core/api/patients.ts`
**Depends on**: T8
**Reuses**: `apiPost` de `@/core/api/http`, `biomarkerSchema` existente
**Requirement**: BIOM-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Chama `apiPost` com a URL e o corpo corretos
- [ ] Faz `.parse()` da resposta antes de devolver (nunca `unknown` vazando)
- [ ] Teste com `apiPost` mockado cobre sucesso e propagação de `ApiError`
- [ ] Gate check passa: `cd mobile && npm test`
- [ ] Contagem de testes: 2+ novos em `patients.test.ts`

**Tests**: unit
**Gate**: quick

---

### T11: Criar `useCreateBiomarkerMutation`

**What**: Hook de mutation otimista: `onMutate` cancela queries em voo, salva snapshot, insere um
`Biomarker` otimista (id `optimistic-...`, `status` via `computeBiomarkerStatus`) no topo do array
em cache; `onError` restaura o snapshot; `onSettled` invalida
`['patient', patientId, 'biomarkers']`.
**Where**: `mobile/src/core/patients/useCreateBiomarkerMutation.ts`
**Depends on**: T8, T9, T10
**Reuses**: padrão de acesso à `queryClient` de `useDecideAiActionMutation`/`useSetFollowUpMutation`
**Requirement**: BIOM-02, BIOM-03, BIOM-04

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Teste confirma que o cache já reflete o item otimista **antes** da promise de
      `createBiomarker` resolver (mesmo padrão de asserção de
      `useSetFollowUpMutation.test.tsx`/`useDecideAiActionMutation.test.tsx`)
- [ ] Teste confirma rollback exato para o snapshot anterior quando a mutation falha
- [ ] Teste confirma que `invalidateQueries` é chamado com a `queryKey` certa após sucesso
- [ ] Gate check passa: `cd mobile && npm test`
- [ ] Contagem de testes: 3+ novos em `useCreateBiomarkerMutation.test.tsx`

**Tests**: unit
**Gate**: quick

---

### T12: Criar `BiomarkerForm` (react-hook-form + zod)

**What**: Componente de formulário com campos Nome/Valor/Unidade/Faixa mín/Faixa máx/Data, usando
`useForm({ resolver: zodResolver(createBiomarkerInputSchema) })`, selo de status calculado ao vivo
via `watch()` + `computeBiomarkerStatus`, submit desabilitado durante `mutation.isPending`, chama
`mutation.mutate(input, { onSuccess: props.onSuccess, onError: setInlineError })` sem navegar em
caso de erro. Adiciona `react-hook-form` e `@hookform/resolvers` como dependências novas do
`mobile/package.json` (primeiro formulário do projeto — já previstas na stack fixa do `CLAUDE.md`).
**Where**: `mobile/src/core/ui/BiomarkerForm.tsx`, `mobile/package.json`
**Depends on**: T8, T9, T11
**Reuses**: `useTheme()`, estilo de `TextInput` de `(tabs)/index.tsx:139-151`
**Requirement**: BIOM-04, BIOM-05, BIOM-09, BIOM-10, BIOM-11, BIOM-12

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Submeter com `label` vazio, `value` não numérico, ou `refMin >= refMax` bloqueia o envio e
      mostra a mensagem no campo, sem chamar `mutation.mutate` (verificável via mock não chamado)
- [ ] Selo de status muda ao digitar `value`/`refMin`/`refMax` (testa os três estados)
- [ ] Botão de submit fica desabilitado enquanto `mutation.isPending`
- [ ] Em erro da mutation, o formulário permanece montado com os valores digitados e mostra erro
      inline com ação de tentar de novo — sem chamar `onSuccess`
- [ ] Em sucesso, `onSuccess` é chamado
- [ ] Nenhum literal de cor/raio/fonte — tudo via `useTheme()`
- [ ] Gate check passa: `cd mobile && npm run pretest && npm test`
- [ ] Contagem de testes: 6+ novos em `BiomarkerForm.test.tsx`

**Tests**: unit
**Gate**: full

---

### T13: Botão "+ Adicionar" na seção de biomarcadores

**What**: Extrair a renderização atual de biomarcadores (`BiomarkerRow`/`BiomarkersEmptyState`) num
bloco local `BiomarkersSection` com cabeçalho contendo o botão "+ Adicionar" (visível com lista
vazia ou não), que navega para `/patients/${id}/biomarkers/new` via `router.push`.
**Where**: `mobile/src/app/patients/[id]/index.tsx`
**Depends on**: T7, T12
**Reuses**: `BiomarkerRow`/`BiomarkersEmptyState` já existentes, sem mudança de comportamento
**Requirement**: BIOM-01

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Botão "+ Adicionar" renderiza tanto no estado vazio quanto no estado com itens
- [ ] Toque no botão chama `router.push('/patients/${id}/biomarkers/new')`
- [ ] Nenhuma regressão nos testes existentes da tela (lista, estados de erro/loading, follow-up)
- [ ] Gate check passa: `cd mobile && npm test`
- [ ] Contagem de testes: 2+ novos em `index.test.tsx` (ex-`[id].test.tsx`), suíte total sem queda

**Tests**: unit
**Gate**: quick

---

### T14: Rota `patients/[id]/biomarkers/new.tsx`

**What**: Tela nova que lê `id` via `useLocalSearchParams`, renderiza `<BiomarkerForm patientId={id}
onSuccess={() => router.back()} />`.
**Where**: `mobile/src/app/patients/[id]/biomarkers/new.tsx`
**Depends on**: T7, T12
**Reuses**: `BiomarkerForm` (T12) inteiro, sem duplicar lógica
**Requirement**: BIOM-01, BIOM-03

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Tela renderiza `BiomarkerForm` com o `patientId` correto vindo da rota
- [ ] `onSuccess` chama `router.back()`
- [ ] Gate check passa: `cd mobile && npx tsc --noEmit && npm run pretest && npm test`
- [ ] Contagem de testes: 2+ novos em `new.test.tsx`

**Tests**: unit
**Gate**: build

**Commit**: `feat(mobile): add manual biomarker creation form and entry point`

---

## Phase Execution Map

Setas = dependência real (`Depends on`). Tasks sem seta entre si na mesma fase não têm dependência
de dado, mas ainda executam em ordem (T1 antes de T2 antes de T3, etc.) por serem sequenciais.

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1, T2, T3 (sem dependência entre si)

Phase 2:  T1 --→ T4
          T2 --→ T4
          T3 --→ T4
          T2 --→ T5
          T4 --→ T6
          T5 --→ T6

Phase 3:  T7 (sem dependência)

Phase 4:  T8, T9 (sem dependência entre si)
          T8 --→ T10

Phase 5:  T8  --→ T11
          T9  --→ T11
          T10 --→ T11
          T8  --→ T12
          T9  --→ T12
          T11 --→ T12
          T7  --→ T13
          T12 --→ T13
          T7  --→ T14
          T12 --→ T14
```

Execution is strictly sequential - there is no intra-phase parallelism. A single agent (or batch
worker) works one task at a time, in order: T1, T2, T3 (Fase 1) → T4, T5, T6 (Fase 2) → T7 (Fase 3)
→ T8, T9, T10 (Fase 4) → T11, T12, T13, T14 (Fase 5).

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: `BiomarkerCode::fromLabel()` | 1 classe pura | ✅ Granular |
| T2: `CreateBiomarkerData` DTO | 1 classe | ✅ Granular |
| T3: `save()` (interface + Eloquent + model) | 1 capacidade coesa, 3 arquivos ligados | ✅ Granular (2-3 arquivos cohesivos, mesma mudança) |
| T4: `PatientService::createBiomarker()` | 1 método | ✅ Granular |
| T5: `CreateBiomarkerRequest` | 1 FormRequest | ✅ Granular |
| T6: Endpoint + rota | 1 endpoint | ✅ Granular |
| T7: Mover arquivo de rota | 1 mudança mecânica, 2 arquivos (código + teste) | ✅ Granular |
| T8: `createBiomarkerInputSchema` | 1 schema | ✅ Granular |
| T9: `computeBiomarkerStatus()` | 1 função pura | ✅ Granular |
| T10: `createBiomarker()` api fn | 1 função | ✅ Granular |
| T11: `useCreateBiomarkerMutation` | 1 hook | ✅ Granular |
| T12: `BiomarkerForm` | 1 componente | ✅ Granular |
| T13: Botão "+ Adicionar" | 1 seção, 1 arquivo | ✅ Granular |
| T14: Rota `biomarkers/new.tsx` | 1 tela | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | None (Fase 1, sem seta) | ✅ Match |
| T2 | None | None (Fase 1, sem seta) | ✅ Match |
| T3 | None | None (Fase 1, sem seta) | ✅ Match |
| T4 | T1, T2, T3 | `T1→T4`, `T2→T4`, `T3→T4` | ✅ Match |
| T5 | T2 | `T2→T5` | ✅ Match |
| T6 | T4, T5 | `T4→T6`, `T5→T6` | ✅ Match |
| T7 | None | None (Fase 3, sem seta) | ✅ Match |
| T8 | None | None (Fase 4, sem seta) | ✅ Match |
| T9 | None | None (Fase 4, sem seta) | ✅ Match |
| T10 | T8 | `T8→T10` | ✅ Match |
| T11 | T8, T9, T10 | `T8→T11`, `T9→T11`, `T10→T11` | ✅ Match |
| T12 | T8, T9, T11 | `T8→T12`, `T9→T12`, `T11→T12` | ✅ Match |
| T13 | T7, T12 | `T7→T13`, `T12→T13` | ✅ Match |
| T14 | T7, T12 | `T7→T14`, `T12→T14` | ✅ Match |

**Nota**: tasks sem seta na mesma fase (T1/T2/T3, T8/T9, e T7 sozinho na Fase 3) não têm
dependência de dado entre si — executam em ordem só por serem sequenciais dentro da fase, não por
gate. Todas as dependências reais são backward ou dentro da mesma fase, nunca apontando para uma
fase futura.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1: `BiomarkerCode` | Domain (pure) | unit | unit | ✅ OK |
| T2: `CreateBiomarkerData` | Domain (DTO/config) | none | none | ✅ OK |
| T3: `save()` | Repository/data-access | integration | integration | ✅ OK |
| T4: `PatientService::createBiomarker` | Application | unit | unit | ✅ OK |
| T5: `CreateBiomarkerRequest` | Http (validado via T6) | none | none | ✅ OK |
| T6: Endpoint + rota | Controller/e2e | e2e | e2e | ✅ OK |
| T7: Mover rota | Config/estrutura (sem lógica nova) | none/suíte existente | unit (regressão) | ✅ OK |
| T8: `createBiomarkerInputSchema` | Schema/validação | unit | unit | ✅ OK |
| T9: `computeBiomarkerStatus` | Domain (pure, mobile) | unit | unit | ✅ OK |
| T10: `createBiomarker` api fn | Mobile api client | unit | unit | ✅ OK |
| T11: `useCreateBiomarkerMutation` | Mobile hook | unit | unit | ✅ OK |
| T12: `BiomarkerForm` | Mobile componente | unit | unit | ✅ OK |
| T13: Botão "+ Adicionar" | Mobile tela (modificação) | unit | unit | ✅ OK |
| T14: Rota `biomarkers/new.tsx` | Mobile tela (nova) | unit | unit | ✅ OK |

Nenhuma violação — nenhuma task usa "testado em outra task" como justificativa para `Tests: none`;
os dois `none` (T2, T5) batem com a matriz (DTO sem lógica, FormRequest coberto pelo Feature test do
controller que o consome).
