# Fase 3 — Ações de IA Mobile Design

**Spec**: `.specs/features/fase-3-acoes-ia-mobile/spec.md`
**Status**: Draft

---

## Architecture Overview

Mesma cadeia de `fase-2-carteira-pacientes-mobile`: schema zod → função de fetch com `.parse()` →
hook de TanStack Query → componente. A seção de IA é um novo bloco dentro de
`src/app/patients/[id].tsx`, isolado num componente próprio (`AiActionsSection`) com seu próprio
estado de carregamento/erro/vazio/sucesso — reaproveitando o `QueryStateView` genérico já usado
noutras telas do projeto.

```mermaid
graph TD
    Screen[patients/[id].tsx] --> AiSection[AiActionsSection]
    AiSection --> Flag{useFlag 'aiActionsEnabled'}
    Flag -- false --> Nothing[não renderiza nada]
    Flag -- true --> Query[useAiActionsQuery]
    Query --> QSV[QueryStateView]
    QSV -- pending --> Skeleton[AiActionsSkeleton]
    QSV -- error --> ErrorState[erro + retry]
    QSV -- empty --> EmptyState[disclaimer + botão Gerar]
    EmptyState --> GenMut[useGenerateAiActionsMutation]
    QSV -- success --> List[lista de AiActionCard]
    List --> DecideMut[useDecideAiActionMutation]
```

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --- | --- | --- |
| `QueryStateView` | `mobile/src/core/ui/QueryStateView.tsx` | Reusado tal como está para os 4 estados da seção de IA — `status`/`isEmpty`/`skeleton`/`emptyState`/`errorMessage`/`children` já cobrem exatamente o contrato exigido pelo spec (AIMOB-01 a 05) |
| `useFlag` | `mobile/src/core/flags/useFlag.ts` | `useFlag('aiActionsEnabled')` decide se a seção renderiza algo — já existe, zero mudança |
| `useTheme` | `mobile/src/core/theme/useTheme.ts` | Fonte de `colors`, `spacing`, `radii`, `typography`, `copy.aiDisclaimer` — nenhum literal na seção nova |
| `apiGet`/`apiPatch` | `mobile/src/core/api/http.ts` | Reusados como estão; só falta `apiPost` (não existe ainda — nenhum endpoint anterior usou `POST`) |
| Padrão de schema zod + `.parse()` | `mobile/src/core/api/schemas/biomarker.ts`, `mobile/src/core/api/patients.ts` | Modelo direto para `aiActionSchema` + `fetchAiActions`/`generateAiActions`/`decideAiAction` |
| Padrão de mutation não-otimista (sem `onMutate`) | Nenhum exemplo direto no projeto ainda — `useSetFollowUpMutation` é o único exemplo de mutation, e é otimista | Ver Tech Decisions — mutation aqui usa só `mutationFn` + `onSuccess` invalidando a query, sem `onMutate`/`onError` de rollback (não há nada local para reverter) |
| `usePatientDetailQuery`/query key pattern | `mobile/src/core/patients/usePatientDetailQuery.ts` | Mesmo padrão de `queryKey` array (`['ai-actions', patientId]`) e `enabled` condicional |

### Integration Points

| System | Integration Method |
| --- | --- |
| `GET/POST /patients/:id/ai-actions`, `PATCH /ai-actions/:id` (feature irmã backend) | `apiGet`/`apiPost` (novo)/`apiPatch` em `core/api/ai-actions.ts`, cada resposta validada por `.parse()` de `aiActionSchema` |
| `patients/[id].tsx` (tela existente da Fase 2) | Import de `AiActionsSection`, renderizado depois da lista de biomarcadores, dentro do mesmo `ScrollView` |

---

## Components

### `core/api/schemas/ai-action.ts`

- **Purpose**: Schema zod + tipo inferido de uma `AiAction`.
- **Location**: `mobile/src/core/api/schemas/ai-action.ts`
- **Interfaces**:
  - `aiActionStatusSchema = z.enum(['pending', 'accepted', 'dismissed'])`
  - `aiActionPrioritySchema = z.enum(['low', 'medium', 'high'])`
  - `aiActionSchema = z.object({ id, patientId, title, rationale, priority: aiActionPrioritySchema, biomarkers: z.array(z.string()), status: aiActionStatusSchema, createdAt })`
  - `export type AiAction = z.infer<typeof aiActionSchema>`
- **Dependencies**: `zod`
- **Reuses**: mesmo padrão de `core/api/schemas/biomarker.ts`

### `core/api/http.ts` (modify)

- **Purpose**: Adiciona `apiPost`, único método HTTP ainda não usado no projeto (todos os endpoints
  anteriores eram `GET`/`PATCH`).
- **Location**: `mobile/src/core/api/http.ts`
- **Interfaces**: `apiPost(path: string, body?: unknown): Promise<unknown>` — mesmo formato de
  `apiPatch`, mas sem exigir `body` (o `POST` de geração não tem corpo)
- **Reuses**: `buildUrl`, `handleErrorResponse` já existentes, sem duplicar nada

### `core/api/ai-actions.ts`

- **Purpose**: As três funções de fetch tipado desta feature.
- **Location**: `mobile/src/core/api/ai-actions.ts`
- **Interfaces**:
  - `fetchAiActions(patientId: string): Promise<AiAction[]>` — `GET`, `.parse()` com
    `z.array(aiActionSchema)`
  - `generateAiActions(patientId: string): Promise<AiAction[]>` — `POST`, mesmo parse (o status
    `201`/`200` não muda o formato do corpo, só o HTTP status, que a UI não precisa distinguir por
    spec — ver Assumption do spec.md)
  - `decideAiAction(actionId: string, status: 'accepted' | 'dismissed'): Promise<AiAction>` —
    `PATCH`, `.parse()` com `aiActionSchema`
- **Dependencies**: `apiGet`, `apiPost`, `apiPatch`, `aiActionSchema`
- **Reuses**: exatamente o padrão de `core/api/patients.ts`

### `core/patients/useAiActionsQuery.ts`

- **Purpose**: Hook de leitura, `enabled` pela flag.
- **Location**: `mobile/src/core/patients/useAiActionsQuery.ts`
- **Interfaces**: `useAiActionsQuery(patientId: string): UseQueryResult<AiAction[]>` —
  `queryKey: ['ai-actions', patientId]`, `enabled: useFlag('aiActionsEnabled')`
- **Dependencies**: `fetchAiActions`, `useFlag`
- **Reuses**: mesmo padrão de `usePatientBiomarkersQuery`

### `core/patients/useGenerateAiActionsMutation.ts`

- **Purpose**: Mutation não-otimista de geração.
- **Location**: `mobile/src/core/patients/useGenerateAiActionsMutation.ts`
- **Interfaces**: `useGenerateAiActionsMutation(): UseMutationResult<AiAction[], ApiError, string>`
  — `mutationFn: (patientId) => generateAiActions(patientId)`, `onSuccess` faz
  `queryClient.setQueryData(['ai-actions', patientId], data)` (sem `onMutate`)
- **Dependencies**: `generateAiActions`, `useQueryClient`
- **Reuses**: estrutura de `useSetFollowUpMutation`, mas **sem** as seções `onMutate`/`onError` de
  rollback (CLAUDE.md §5.6 — ação de IA nunca é otimista)

### `core/patients/useDecideAiActionMutation.ts`

- **Purpose**: Mutation não-otimista de aceite/descarte.
- **Location**: `mobile/src/core/patients/useDecideAiActionMutation.ts`
- **Interfaces**: `useDecideAiActionMutation(patientId: string): UseMutationResult<AiAction, ApiError, {actionId: string; status: 'accepted' | 'dismissed'}>`
  — `onSuccess` atualiza só o item decidido dentro do array em cache
  (`queryClient.setQueryData(['ai-actions', patientId], (old) => old?.map(...))`)
- **Dependencies**: `decideAiAction`, `useQueryClient`
- **Reuses**: mesmo raciocínio de `useGenerateAiActionsMutation`

### `core/ui/AiActionsSection.tsx`

- **Purpose**: Componente principal da seção — monta `useAiActionsQuery` +
  `useGenerateAiActionsMutation`, decide se renderiza algo (via `useFlag`), delega os 4 estados ao
  `QueryStateView`.
- **Location**: `mobile/src/core/ui/AiActionsSection.tsx`
- **Interfaces**: `AiActionsSection({ patientId }: { patientId: string })`
- **Dependencies**: `useFlag`, `useAiActionsQuery`, `useGenerateAiActionsMutation`, `QueryStateView`,
  `useTheme`
- **Reuses**: `QueryStateView` (skeleton/erro/vazio providos como children), copy da marca
  (`copy.aiDisclaimer`)

### `core/ui/AiActionCard.tsx`

- **Purpose**: Um card de ação — título, rationale, badge de prioridade, botões
  aceitar/descartar (se `pending`) ou indicador de status final.
- **Location**: `mobile/src/core/ui/AiActionCard.tsx`
- **Interfaces**: `AiActionCard({ action, patientId }: { action: AiAction; patientId: string })` —
  usa `useDecideAiActionMutation(patientId)` internamente, com estado local de "qual card está em
  voo" derivado do próprio `mutation.isPending` + `mutation.variables?.actionId === action.id`
  (evita desabilitar todos os cards quando só um está decidindo)
- **Dependencies**: `useDecideAiActionMutation`, `useTheme`
- **Reuses**: mesmo padrão de cor-por-status de `biomarkerStatusColor()` em
  `patients/[id].tsx`, adaptado para prioridade (`low/medium/high` → `success/warning/danger` da
  marca)

### `app/patients/[id].tsx` (modify)

- **Purpose**: Renderiza `<AiActionsSection patientId={id} />` depois do bloco de biomarcadores,
  dentro do mesmo `ScrollView`.
- **Location**: `mobile/src/app/patients/[id].tsx`
- **Reuses**: estrutura de layout já existente (`ScrollView` com `gap: spacing(4)`)

---

## Data Models

```typescript
// core/api/schemas/ai-action.ts
type AiActionStatus = 'pending' | 'accepted' | 'dismissed';
type AiActionPriority = 'low' | 'medium' | 'high';

interface AiAction {
  id: string;
  patientId: string;
  title: string;
  rationale: string;
  priority: AiActionPriority;
  biomarkers: string[];
  status: AiActionStatus;
  createdAt: string;
}
```

**Relationships**: um `AiAction[]` por `patientId`, chave de cache `['ai-actions', patientId]`.

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| --- | --- | --- |
| `GET /ai-actions` falha (rede ou `503`) | `QueryStateView` mostra o estado de erro da seção | Mensagem + botão "Tentar novamente", resto da tela intacto |
| `POST /ai-actions` falha (`502`/`422`/`429`) | `mutation.isError` reabilita o botão "Gerar ações" e mostra mensagem abaixo dele | Nenhuma mudança na lista; usuário pode tocar de novo |
| `PATCH /ai-actions/:id` falha (`404`/`409`/`503`) | `mutation.isError` do card específico reabilita seus botões e mostra mensagem só nele | Outros cards continuam interativos |
| `ApiError` sem `code` reconhecido | Mesma mensagem genérica de cada estado acima (spec não pede diferenciação por código) | Consistente com a Assumption do spec.md |

---

## Risks & Concerns

| Concern | Location (file:line) | Impact | Mitigation |
| --- | --- | --- | --- |
| `QueryStateView` usa `flex: 1, justifyContent: 'center'` no estado de erro, pensado para ocupar a tela inteira (uso original em `patients/[id].tsx` fora de um `ScrollView` filho) | `mobile/src/core/ui/QueryStateView.tsx:33-40` | Dentro da seção de IA (um bloco no meio de um `ScrollView`), esse `flex: 1` pode colapsar para altura mínima do conteúdo em vez de centralizar como na tela cheia — resultado visual mais apertado, não um bug funcional | Aceitável nesta fase — o comportamento continua correto (mensagem + retry visíveis), só menos centralizado verticalmente; ajuste de padding fica a critério da implementação (Agent's Discretion), sem exigir mudar o componente compartilhado e arriscar quebrar os usos existentes |
| Nenhuma mutation anterior no projeto é não-otimista — `useSetFollowUpMutation` é o único exemplo, e é otimista | `mobile/src/core/patients/useSetFollowUpMutation.ts` | Risco de copiar o padrão errado por hábito (adicionar `onMutate` sem querer) | Marcado explicitamente nesta design e no spec (AIMOB-08, AIMOB-14) — tasks vão exigir a ausência de `onMutate` como critério de "Done when" |

> Nenhum outro concern encontrado nas camadas tocadas por esta feature.

---

## Tech Decisions (only non-obvious ones)

| Decision | Choice | Rationale |
| --- | --- | --- |
| `apiPost` novo em `core/api/http.ts` em vez de um cliente HTTP próprio para IA | Estende o módulo compartilhado existente | Mesma função `buildUrl`/`handleErrorResponse` já cobre tudo que `apiPost` precisa; criar um cliente paralelo duplicaria a montagem de erro |
| `useDecideAiActionMutation` recebe `patientId` como argumento do hook (não da mutation) | `useDecideAiActionMutation(patientId)` | A invalidação/atualização de cache precisa saber `queryKey: ['ai-actions', patientId]` antes de qualquer chamada; passar como argumento do hook (fixo por render do card) evita repetir `patientId` em todo `mutate()` |
| Prioridade "em voo" calculada por `mutation.variables?.actionId === action.id` em vez de um estado local por card | Deriva do próprio `UseMutationResult`, sem `useState` extra | Uma mutation por card evitaria isso, mas criaria N instâncias de mutation por lista; uma única mutation compartilhada por card, distinguida por `variables`, é o padrão mais simples que ainda cumpre "só aquele card desabilita" (AIMOB-12) |
| Corpo do `POST` de geração é vazio (`apiPost(path)`, sem segundo argumento) | — | O backend não exige corpo para gerar (spec `fase-3-acoes-ia-backend`, P1) |

> Nenhuma decisão aqui estabelece uma convenção nova de projeto além de `apiPost` (extensão aditiva
> de um módulo já existente, não uma convenção nova); nada a promover para `AD-NNN`.
