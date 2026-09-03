# Criação manual de biomarcador Specification

## Problem Statement

Hoje `biomarkers` só nasce via seeder determinístico (Fase 0/2) — não existe nenhum caminho, em
nenhuma camada (rota, repositório, tela), para o nutricionista registrar um biomarcador novo a
partir do app. Isso reabre uma decisão que a spec `fase-2-carteira-pacientes-backend` (linha 35)
tinha explicitamente deixado fora de escopo ("não pedido pelo plano" à época). Agora é pedido: na
tela de detalhe do paciente, a listagem de biomarcadores precisa de um caminho de criação, porque é
sobre esses itens que a IA gera as ações de acompanhamento — sem conseguir cadastrá-los, o
nutricionista fica preso ao dado de seed.

## Goals

- [ ] Nutricionista adiciona um biomarcador a um paciente pelo app, sem sair do detalhe do
      paciente, em menos de 30s de interação.
- [ ] O biomarcador criado aparece na lista imediatamente (otimista) e sobrevive a um refresh da
      tela (dado real persistido no backend).
- [ ] `status` (baixo/normal/alto) continua sendo **sempre** derivado de `value`/`ref_min`/`ref_max`
      via `BiomarkerStatus::from()` — nunca um campo aceito do cliente, em nenhuma camada.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Editar ou excluir biomarcador existente | Não pedido; esta feature cobre só criação |
| Importação em lote (CSV/planilha) | Não pedido; entrada é sempre um registro por vez, via formulário |
| Autocomplete/preset de biomarcadores comuns (catálogo do seeder) | Não pedido; campo "Nome" é texto livre nesta versão |
| Fila de escrita offline verdadeira (criar sem rede e sincronizar depois) | Fora do que `CLAUDE.md` §15 promete ("fila de mutations otimistas" já cobre o caso online-com-latência, não offline-completo); sem rede, a criação falha e o rollback se aplica, igual a qualquer outra mutation do projeto |
| Autorização/permissão por papel de usuário | Projeto não tem autenticação real (`CLAUDE.md` §15) |
| Dropdown de gravidade selecionável manualmente | Decisão do usuário durante o discuss: status precisa continuar derivado, não escolhido |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Campo único "Nome" (label); `code` não é digitado pelo usuário | `code` é gerado no backend via slugify de `label` (minúsculas, sem acento, espaços → `_`) | Resposta do usuário no discuss: só um campo de nome, mais simples que pedir um código técnico | y |
| Criação é otimista (aparece na lista antes da confirmação do servidor), com rollback em erro | `onMutate` insere localmente, `onError` reverte, `onSettled` invalida a query | Resposta do usuário no discuss: segue o padrão já usado no app para edições locais (CLAUDE.md §5.6) | y |
| Sem seletor de gravidade manual | Formulário pede `value`, `unit`, `refMin`, `refMax`; app mostra o status calculado como preview somente-leitura | Resposta do usuário no discuss: preserva a regra de que status é sempre derivado | y |
| `measuredAt` pré-preenchido com a data de hoje, editável | Campo de data com default = hoje | Reduz fricção; medição normalmente acabou de ser feita | n |
| Sem restrição de `measuredAt` no futuro | Qualquer data válida é aceita | Dimensão de baixo risco para este escopo; não há regra de negócio hoje que dependa disso | n |
| `value` deve ser > 0; `refMin` >= 0; `refMax` > `refMin` | Validado em ambas as camadas (zod no mobile, FormRequest no backend) | Biomarcadores são medidas físicas (não há valor ≤0 no catálogo do seeder); `refMin` pode ser 0 (ex.: LDL no seeder) | n |
| Sem unicidade de `label`/`code` por paciente (duplicados permitidos) | Nenhuma constraint nova de unicidade | O próprio seeder já permite biomarcadores repetidos ao longo do tempo (`measured_at` diferente); trocar isso é escopo novo | n |
| Precisão numérica: `value`/`refMin`/`refMax` alinhados a `decimal(10,4)` da coluna | Validação client+server rejeita mais de 4 casas decimais / mais de 6 dígitos inteiros | Espelha a coluna existente; evita 500 por overflow no Postgres | n |
| Botão "+ Adicionar" fica sempre visível no cabeçalho da seção de biomarcadores (vazia ou não) | Um único ponto de entrada, não duplicado entre estado vazio e estado cheio | Consistente com o desenho apresentado e aprovado pelo usuário nesta sessão | y |

**Open questions:** none — todas resolvidas ou registradas acima.

---

## User Stories

### P1: Criar biomarcador pelo formulário ⭐ MVP

**User Story**: Como nutricionista, quero adicionar um biomarcador ao paciente diretamente pelo
app, para que eu não dependa de dado de seed e a IA tenha dado real para comentar.

**Why P1**: É o problema relatado — sem isso não existe caminho de criação em nenhuma camada.

**Acceptance Criteria**:

1. WHEN o usuário toca em "+ Adicionar" no cabeçalho da seção de biomarcadores THEN o sistema SHALL
   navegar para uma tela de formulário de criação de biomarcador para aquele paciente.
2. WHEN o usuário envia o formulário com `label`, `value`, `unit`, `refMin`, `refMax` e
   `measuredAt` válidos THEN o sistema SHALL inserir o novo biomarcador na lista do paciente de
   forma otimista, antes da resposta do servidor.
3. WHEN a requisição de criação responde 201 THEN o sistema SHALL invalidar a query de
   biomarcadores do paciente para reconciliar o item otimista com o dado real do servidor (id,
   `code` gerado, `status` calculado).
4. IF a requisição de criação falha (erro de rede ou resposta não-2xx) THEN o sistema SHALL
   reverter a inserção otimista e exibir um erro inline com ação de tentar novamente, mantendo os
   dados preenchidos no formulário.
5. WHILE a requisição de criação está pendente THEN o sistema SHALL desabilitar o botão de submit
   para impedir envio duplicado.
6. WHEN o backend recebe um POST `/api/v1/patients/{id}/biomarkers` com payload válido THEN o
   sistema SHALL responder 201 com header `Location` e o corpo do biomarcador criado (`id`, `code`,
   `label`, `value`, `unit`, `refMin`, `refMax`, `measuredAt`, `status`).
7. The system SHALL derivar `code` a partir de `label` no backend (slugify) — nunca aceitar `code`
   como campo do cliente.
8. The system SHALL calcular `status` via `BiomarkerStatus::from(value, refMin, refMax)` no
   backend — nunca aceitar `status` como campo do cliente, em nenhuma camada (form, payload, DTO).

**Independent Test**: No detalhe de um paciente existente, tocar "+ Adicionar", preencher nome
"Ferritina", valor 40, unidade "ng/mL", faixa 20–200, data de hoje, salvar — o item aparece na
lista com selo "Normal" e sobrevive a um refresh da tela.

---

### P2: Validação e feedback de erro

**User Story**: Como nutricionista, quero saber imediatamente se algo no formulário está errado,
para não perder tempo enviando um cadastro inválido.

**Why P2**: Melhora a experiência do P1, mas o fluxo feliz do P1 já é demonstrável sem isso
implementado com todo o detalhamento (validação mínima de campo obrigatório já é necessária para o
P1 funcionar; P2 cobre os casos de borda além do "campo vazio").

**Acceptance Criteria**:

1. IF `label` está vazio THEN o sistema SHALL bloquear o envio e exibir mensagem de campo
   obrigatório, sem chamar a API.
2. IF `value`, `refMin` ou `refMax` não são numéricos ou estão vazios THEN o sistema SHALL bloquear
   o envio e exibir mensagem de campo inválido, sem chamar a API.
3. IF `refMin` é maior que `refMax` THEN o sistema SHALL bloquear o envio com mensagem informando
   que o mínimo não pode ser maior que o máximo.
4. IF `value` é menor ou igual a zero, ou `refMin` é negativo THEN o sistema SHALL bloquear o envio
   com mensagem de valor inválido.
5. IF o backend recebe um payload que viola qualquer regra acima (cliente comprometido ou bypass)
   THEN o sistema SHALL responder 422 com os erros de campo, no mesmo envelope de erro do resto da
   API (`CLAUDE.md` §6.3).
6. IF o `patientId` da rota não existe THEN o sistema SHALL responder 404 com `PATIENT_NOT_FOUND`,
   reusando a exceção de domínio já existente (`PatientNotFound`).

**Independent Test**: Tentar enviar o formulário vazio — cada campo mostra seu erro sem nenhuma
chamada de rede (interceptável via inspeção de log/mock de rede zero chamadas).

---

## Edge Cases

- IF `value`/`refMin`/`refMax` excedem a precisão da coluna (mais de 4 casas decimais ou mais de 6
  dígitos inteiros) THEN o sistema SHALL rejeitar com 422 antes de tentar o INSERT.
- IF o usuário sai da tela de formulário com dados preenchidos e sem salvar THEN o sistema SHALL
  descartar o rascunho (sem persistência local de rascunho — fora de escopo).
- IF dois biomarcadores com o mesmo `label` são criados para o mesmo paciente THEN o sistema SHALL
  aceitar ambos sem erro de duplicidade (ver Assumptions).
- WHEN a criação falha e o rollback acontece THEN o sistema SHALL manter o usuário na tela de
  formulário com os valores digitados intactos, não navegar de volta automaticamente.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| BIOM-01 | P1: Criar biomarcador pelo formulário | Design | Pending |
| BIOM-02 | P1: Criar biomarcador pelo formulário | Design | Pending |
| BIOM-03 | P1: Criar biomarcador pelo formulário | Design | Pending |
| BIOM-04 | P1: Criar biomarcador pelo formulário | Design | Pending |
| BIOM-05 | P1: Criar biomarcador pelo formulário | Design | Pending |
| BIOM-06 | P1: Criar biomarcador pelo formulário | Design | Pending |
| BIOM-07 | P1: Criar biomarcador pelo formulário | Design | Pending |
| BIOM-08 | P1: Criar biomarcador pelo formulário | Design | Pending |
| BIOM-09 | P2: Validação e feedback de erro | Design | Pending |
| BIOM-10 | P2: Validação e feedback de erro | Design | Pending |
| BIOM-11 | P2: Validação e feedback de erro | Design | Pending |
| BIOM-12 | P2: Validação e feedback de erro | Design | Pending |
| BIOM-13 | P2: Validação e feedback de erro | Design | Pending |
| BIOM-14 | P2: Validação e feedback de erro | Design | Pending |

**ID format:** `BIOM-NN` (biomarcadores)

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 14 total, 0 mapped to tasks, 14 unmapped ⚠️ (mapeamento acontece na fase de Tasks)

---

## Success Criteria

- [ ] Nutricionista cria um biomarcador do zero (do toque em "+ Adicionar" até o item aparecer na
      lista) sem sair do detalhe do paciente.
- [ ] Item criado sobrevive a um refresh de tela (pull-to-refresh ou reabrir o app) com o mesmo
      `status` calculado.
- [ ] Falha de rede durante a criação não deixa a lista em estado inconsistente — o item otimista
      some e o formulário preserva os dados digitados.
- [ ] `npm test` (mobile) e `php artisan test` (api) cobrem pelo menos: o caminho feliz, a
      reversão otimista em erro, e a validação de `refMin > refMax` nos dois lados.
