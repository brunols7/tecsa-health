# Fase 6 — Melhorias UX Mobile Context

**Gathered:** 2026-09-02
**Spec:** `.specs/features/fase-6-melhorias-ux-mobile/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Telas/formulário de criar e editar paciente, exclusão com confirmação, ações de ciclo de vida
(inativar/concluir/reativar/reabrir) na tela de detalhe, filtro de status em modal, badge traduzido de
objetivo, idade e datas formatadas em `dd/MM/yyyy`, empty states revisados, e publicação OTA nos canais
de desenvolvimento já existentes.

---

## Implementation Decisions

### Escopo visual

- Só telas/componentes novos desta feature são desenhados com cuidado (formulário, `Badge`, filtro,
  empty states novos). Lista e detalhe já existentes (Fases 2/3) **não** são redesenhados — já
  passaram pelo Verifier, retrabalhar é risco de regressão sem pedido explícito.

### Ciclo de vida na UI

- Botões visíveis mudam conforme o `status` atual do paciente: `active` mostra "Marcar como
  inativo" + "Concluir acompanhamento"; `inactive` mostra só "Reativar"; `completed` mostra só
  "Reabrir acompanhamento". As duas últimas chamam o mesmo endpoint de destino (`status=active`), só
  o rótulo muda.
- Nenhuma dessas mutations é otimista — dependem de resposta do servidor, incluindo a possibilidade
  real de `409` (transição inválida se a tela estiver com dado desatualizado).

### Exclusão

- `Alert.alert` nativo, título citando o nome do paciente, botão destrutivo. Sem modal customizado,
  sem exigir digitar o nome — soft delete no backend já reduz o risco de uma exclusão por engano ser
  catastrófica.

### Filtro de status

- Ícone de filtro no cabeçalho da lista abre um bottom-sheet/modal com "Ativos" (default) e "Inativos
  e concluídos". Não é um segmented control inline — decisão explícita do usuário.

### Objetivo (goal) e Badge

- Tradução de `goal` vive em `core/` (mapa de rótulos fixo), nunca em `brands/*` — não varia por
  marca, é rótulo de domínio.
- Novo componente `core/ui/Badge.tsx`, cor neutra única (mesmo par de tokens nas duas marcas),
  reaproveitado também no pill de status de biomarcador que hoje é inline em `[id].tsx`.

### Idade e formato de data (sugestão aceita pelo usuário)

- Idade em anos completos, calculada no cliente a partir de `birthDate`, exibida ao lado do badge de
  objetivo (card da lista e cabeçalho do detalhe).
- Toda data visível ao usuário em `dd/MM/yyyy` (`birthDate`, `statusChangedAt`). O formulário de
  criar/editar mantém o formato de input próprio (não precisa ser `dd/MM/yyyy` digitável — sem date
  picker novo, ver Assumptions do spec).
- "Inativo desde {data}"/"Concluído em {data}" usando `statusChangedAt`, só quando o paciente não
  está `active`.

### Agent's Discretion

- Estrutura exata de arquivo do `PatientForm` (um componente com prop `mode: 'create' | 'edit'`, ou
  dois componentes finos por cima de um form compartilhado) fica para o design.
- Nome exato da função utilitária de idade/data (`calculateAge`, `formatDateBR`) e se moram no mesmo
  arquivo ou separados, dentro de `core/`.

### Declined / Undiscussed Gray Areas → Assumptions

Nenhuma — todas as áreas relevantes foram discutidas com o usuário nesta sessão (via `AskUserQuestion`,
duas rodadas, mais uma troca livre sobre o modelo de ciclo de vida) e estão registradas na tabela
"Assumptions & Open Questions" do `spec.md`.

---

## Specific References

- "A ideia é deixar mais perto de algo real de acompanhamento, então alterar status, controlar
  objetivos e recomendações, é o essencial." — usado para não expandir escopo para criação manual de
  recomendação de IA (fora de escopo, ver `spec.md` Out of Scope); "controlar recomendações" é
  satisfeito pelo fluxo de aceitar/descartar já existente da Fase 3.
- Sugestões aceitas literalmente pelo usuário: "1. Gostei, pode adicionar no app." (idade),
  "2. formate a data exibindo dd/MM/yyyy." (formato de data), "3. Pode ser." (status_changed_at,
  spec irmã de backend).

---

## Deferred Ideas

- Redesign completo de lista/detalhe: fora de escopo por decisão explícita do usuário.
- Date picker nativo para `birthDate` no formulário: não pedido, formato de input via `TextInput` +
  validação zod é suficiente para esta fase.
- Timeline visual de mudanças de status: não pedido; um único "desde quando" já atende.
