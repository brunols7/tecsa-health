# Criação manual de biomarcador Context

**Gathered:** 2026-09-03
**Spec:** `.specs/features/biomarcadores-criar/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Um formulário de criação de biomarcador, acessível por um botão "+ Adicionar" no cabeçalho da
seção de biomarcadores do detalhe do paciente. Cria o registro real no backend (hoje só existe via
seed) e insere de forma otimista na lista local.

---

## Implementation Decisions

### Entidade certa

- A pedido original citava "nome, descrição, dropdown de gravidade" mas descrevia, na prática, os
  biomarcadores do paciente (não `ai_actions` — confirmado explicitamente pelo usuário: "as IAs dao
  recomendacoes em cima desses itens que eu quero adicionar").

### Gravidade manual

- Não existe dropdown de gravidade selecionável. `status` continua sempre derivado de
  `value`/`ref_min`/`ref_max` via `BiomarkerStatus::from()`. O formulário mostra o status calculado
  como preview somente-leitura, atualizado conforme o usuário digita valor/faixa.

### Nome vs código

- Um único campo "Nome" no formulário (`label`). O campo técnico `code` (que já existe na tabela)
  é gerado no backend via slugify do `label` — o usuário nunca digita `code`.

### Salvar otimista

- Criação é otimista: `onMutate` insere o biomarcador na lista local antes da resposta do servidor;
  `onError` reverte; `onSettled` invalida a query para reconciliar com o dado real (id, `code`,
  `status` do servidor). Segue o padrão já estabelecido no projeto (`CLAUDE.md` §5.6) para edições
  locais.

### Agent's Discretion

- Layout exato do formulário (agrupamento visual em seções "Nome" / "Medida" / "Faixa de
  referência" / "Data da medição") foi desenhado e apresentado como wireframe ASCII nesta sessão;
  o usuário não pediu ajuste, então o desenho vale como aprovado por ausência de objeção — mas
  ainda está sujeito a refinamento visual na implementação real (cores/raios/tipografia vêm do
  tema, nunca literais, por CLAUDE.md §5.2).
- Slugify de `code`: minúsculas, sem acento, espaços/caracteres não alfanuméricos → `_`,
  colapsando repetições. Detalhe de implementação, não perguntado ao usuário.
- Mensagens de erro específicas de cada validação (texto exato) ficam a critério da implementação,
  seguindo o tom de voz ativa já usado no projeto (`CLAUDE.md` §12).

### Declined / Undiscussed Gray Areas → Assumptions

Todas as áreas abaixo foram levantadas durante o discuss e não geraram pergunta adicional ao
usuário (dimensão de baixo risco para o escopo) — registradas na tabela de Assumptions do
`spec.md`, não decididas por discussão explícita:

- Default e editabilidade de `measuredAt` (hoje, editável).
- Ausência de restrição de data futura em `measuredAt`.
- Faixa de validação de `value`/`refMin`/`refMax` (positivo, `refMin < refMax`, precisão
  `decimal(10,4)`).
- Ausência de unicidade de `label`/`code` por paciente.

---

## Specific References

Nenhuma referência externa específica ("quero como o app X") foi mencionada. A referência mais
próxima foi o próprio `AiActionCard`/`AiActionsSection` (formulário confundido inicialmente com
`ai_actions`), reaproveitado como referência de "como uma seção com botão de adicionar já se parece
no app" — mas o domínio final é biomarcador, não ação de IA.

---

## Deferred Ideas

- Autocomplete/preset dos biomarcadores comuns do catálogo do seeder (glicemia, HbA1c, LDL, HDL,
  triglicerídeos, TSH, vitamina D) ao digitar o nome — poderia acelerar o preenchimento, mas não foi
  pedido; registrado aqui para uma iteração futura, não faz parte desta feature.
- Edição/exclusão de biomarcador existente — mencionado como "fora de escopo" na spec, não
  discutido em profundidade porque o usuário não trouxe o assunto.
