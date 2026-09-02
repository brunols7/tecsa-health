# Fase 2 — Carteira de Pacientes Backend Specification

## Problem Statement

O core mobile (Fase 0) e o mecanismo de feature flags (Fase 1) já existem, mas não há nenhum jeito
de o app ler pacientes ou biomarcadores reais: `Domain/Patient` não existe, e as tabelas
`patients`/`biomarkers` (migradas e seedadas com 5.000+ registros desde a Fase 0) não têm nenhuma
camada de Application/Http em cima. Esta feature fecha esse caminho — o maior peso de investimento
de engenharia do projeto (CLAUDE.md §1, 32% mobile + parte dos 13% de API) — expondo a carteira de
pacientes e o detalhe com biomarcadores via REST, com paginação cursor, busca, e o `status` derivado
de biomarcador que a feature irmã `fase-2-carteira-pacientes-mobile` vai consumir.

## Goals

- [ ] `GET /api/v1/patients?brand=&search=&cursor=&limit=` devolve uma página de pacientes da marca,
      ordenada por nome, sem duplicar nem pular item entre páginas mesmo com dado mudando
- [ ] `GET /api/v1/patients/:id` devolve o detalhe de um paciente
- [ ] `GET /api/v1/patients/:id/biomarkers` devolve os biomarcadores do paciente, cada um com
      `status` derivado (baixo/normal/alto) calculado por `Domain/Patient/BiomarkerStatus::from()`
- [ ] `PATCH /api/v1/patients/:id` altera a flag de acompanhamento (`needs_follow_up`) do paciente
- [ ] Nenhuma regra de negócio, Eloquent ou cálculo vaza para o Controller (CLAUDE.md §2.2, §6.1) —
      verificável pelo script de fronteira de camada existente (`check-layer-boundary.sh`)
- [ ] `BiomarkerStatus::from()` é testado isoladamente, sem Laravel, cobrindo abaixo/dentro/acima da
      faixa e os limites exatos (CLAUDE.md §10)

## Out of Scope

Explicitamente fora desta feature. Fica para fases seguintes ou não faz parte do projeto.

| Feature                                                          | Reason                                                                 |
| ----------------------------------------------------------------| ------------------------------------------------------------------------ |
| Consumo do endpoint pelo app mobile (schemas zod, FlashList, offline, mutation otimista) | Feature irmã `fase-2-carteira-pacientes-mobile`, desenvolvida depois, sequencialmente |
| Edição de `name`, `goal`, `status` (cadastro) via PATCH          | Decisão do usuário — PATCH nesta feature só altera `needs_follow_up`; edição de cadastro completo não foi pedida pelo plano |
| Ações de IA sobre o paciente                                     | Fase 3 — depende desta feature existir primeiro (paciente/biomarcador real) |
| Criação (`POST`) ou remoção de paciente/biomarcador via API      | Não pedido pelo plano; dado nasce via seeder determinístico (Fase 0) |
| Cache HTTP (`ETag`) ou paginação por offset                      | Paginação cursor é exigência explícita do CLAUDE.md §6.3 (offset perde/duplica item com 5.000 registros e dado mudando) |
| Autorização por marca via autenticação real                      | Projeto não tem auth real (CLAUDE.md §15); mesmo mecanismo provisório de `?brand=slug` da Fase 1 |
| Ordenação alternativa (por biomarcador fora de faixa, por `updated_at`) | Não pedido; ordenação única por `name` é o que o índice `patients(brand_id, name)` já otimiza |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | --------------- | --------- | ---------- |
| Semântica de "marcar acompanhamento" | Novo campo `needs_follow_up: boolean` (default `false`) em `patients`, migration nova | Decisão do usuário — semântica própria, separada de `status` (ativo/inativo no cadastro) | y |
| Formato do cursor | Opaco, base64 de `{name, id}` do último registro da página anterior; ordenação por `name asc`, tie-break por `id asc` | Decisão do usuário — usa o índice `patients(brand_id, name)` diretamente, sem duplicar/perder item quando há nomes repetidos | y |
| Comportamento da busca (`?search=`) | Contém, case-insensitive (`ILIKE '%termo%'` sobre `name`) | Decisão do usuário — é o que um usuário espera de uma busca de texto; 5.000 registros por marca é barato mesmo sem usar o índice para o filtro de conteúdo (o índice já filtra por `brand_id` primeiro) | y |
| Escopo de campos editáveis no PATCH | Só `needs_follow_up` | Decisão do usuário — superfície mínima, alinhada ao propósito de "mutation de exemplo" do plano | y |
| Brand scoping em `GET /patients` (lista) | Query param `?brand=<slug>`, igual à Fase 1 (`?brand=` de feature-flags) | Consistência com o mecanismo provisório já estabelecido (CLAUDE.md §15, nota do plano) | y |
| Brand scoping em `GET /patients/:id`, `GET /patients/:id/biomarkers`, `PATCH /patients/:id` | Nenhum — resolvido só por `id` (UUID), sem exigir `?brand=` | Um recurso individual já é inequivocamente identificado pelo seu UUID; exigir `?brand=` redundante nesses três endpoints não previne nada (não há autenticação real para uma marca "roubar" outra) e adicionaria validação sem benefício | y |
| Tamanho de página | `limit` default `50`, máximo `100` (acima disso, clamp para `100`, não erro) | Não especificado pelo plano; valor prático para lista virtualizada, evita paginação decorativa (1 item) ou página gigante | y |
| Limites da faixa de referência em `BiomarkerStatus::from()` | `value < ref_min` → baixo; `value > ref_max` → alto; `ref_min <= value <= ref_max` → normal (limites inclusos) | Convenção clínica usual (o valor exatamente no limite da faixa de referência é considerado dentro da faixa) | y |
| `GET /patients/:id` inclui biomarcadores embutidos? | Não — endpoint devolve só os campos do paciente; biomarcadores só via `GET /patients/:id/biomarkers` | Plano de desenvolvimento lista os dois endpoints separadamente | y |
| Ordenação de `GET /patients/:id/biomarkers` | Por `measured_at desc` (mais recente primeiro) | Usa o índice `biomarkers(patient_id, measured_at)` diretamente; não há paginação nesse endpoint (poucos biomarcadores por paciente — 1 a 3 pelo seeder) | y |

**Open questions: none** — todas resolvidas acima.

---

## User Stories

### P1: Listar carteira de pacientes com busca e paginação cursor ⭐ MVP

**User Story**: Como app mobile de uma marca, eu quero listar os pacientes dessa marca, com busca
por nome e paginação, para que o nutricionista veja a carteira inteira sem travar a tela nem perder
ou duplicar item ao rolar.

**Why P1**: É o endpoint sobre o qual toda a feature mobile de carteira (Fase 2) e a demonstração de
5.000 pacientes se apoiam.

**Acceptance Criteria**:

1. WHEN uma requisição `GET /api/v1/patients?brand=<slug>` chega sem `cursor` THEN o sistema SHALL
   responder `200` com a primeira página de até `limit` pacientes da marca, ordenados por `name asc`
   (tie-break `id asc`), e um `next_cursor` não nulo se existirem mais registros além da página.
2. WHEN uma requisição inclui `cursor=<valor da página anterior>` THEN o sistema SHALL responder com
   a página seguinte, continuando exatamente de onde a anterior parou — nenhum paciente da página
   anterior reaparece, nenhum paciente é pulado.
3. WHEN a última página é alcançada THEN o sistema SHALL responder com `next_cursor: null`.
4. WHEN `search=<termo>` está presente THEN o sistema SHALL filtrar os pacientes da marca cujo
   `name` contém `<termo>`, case-insensitive, antes de paginar.
5. IF `limit` está ausente THEN o sistema SHALL usar `50` como padrão.
6. IF `limit` excede `100` THEN o sistema SHALL usar `100` (clamp), sem erro.
7. IF o parâmetro `brand` está ausente THEN o sistema SHALL responder `422` no envelope de erro
   padrão.
8. IF o parâmetro `brand` não corresponde a nenhuma marca cadastrada THEN o sistema SHALL responder
   `404` no envelope de erro padrão, código `BRAND_NOT_FOUND`.
9. IF `cursor` está presente mas é ilegível (não decodifica para um par `{name, id}` válido) THEN o
   sistema SHALL responder `400` no envelope de erro padrão, código `INVALID_CURSOR`.
10. The system SHALL manter o Controller livre de Eloquent, `if` de negócio e cálculo — toda
    resolução de página/busca vive em `Application/Patient/PatientService`.

**Independent Test**: `curl "http://localhost:9000/api/v1/patients?brand=nutri-care&limit=50"`
devolve `200` com 50 pacientes e um `next_cursor`; repetir a chamada passando esse `next_cursor`
devolve os 50 seguintes, sem sobreposição, verificável comparando os `id`s das duas respostas.

---

### P2: Ver detalhe de um paciente

**User Story**: Como app mobile, eu quero buscar o detalhe de um paciente por id, para exibir a tela
de detalhe da carteira.

**Why P2**: Pré-requisito direto da tela de detalhe mobile e do fluxo de PATCH (P4).

**Acceptance Criteria**:

1. WHEN uma requisição `GET /api/v1/patients/:id` chega com um `id` existente THEN o sistema SHALL
   responder `200` com os campos do paciente (`id`, `name`, `birthDate`, `goal`, `status`,
   `needsFollowUp`, `updatedAt`).
2. IF o `id` não corresponde a nenhum paciente THEN o sistema SHALL responder `404` no envelope de
   erro padrão, código `PATIENT_NOT_FOUND`.
3. IF o `id` não é um UUID bem formado THEN o sistema SHALL responder `404` (mesmo tratamento de "não
   encontrado", sem revelar se o formato "quase bateu" com algo).

**Independent Test**: `curl http://localhost:9000/api/v1/patients/<uuid-válido>` devolve `200` com o
paciente; trocar por um UUID aleatório devolve `404`.

---

### P3: Ver biomarcadores de um paciente com status derivado

**User Story**: Como app mobile, eu quero buscar os biomarcadores de um paciente com o status
(baixo/normal/alto) já calculado, para exibir a faixa de referência sem duplicar a regra clínica no
cliente.

**Why P3**: É a regra de negócio central da Fase 2 (CLAUDE.md §7) e a mais fácil de testar
isoladamente — vale a pena isolar bem.

**Acceptance Criteria**:

1. WHEN uma requisição `GET /api/v1/patients/:id/biomarkers` chega com um `id` de paciente existente
   THEN o sistema SHALL responder `200` com a lista de biomarcadores desse paciente, ordenada por
   `measuredAt desc`, cada um incluindo `status` (`"low" | "normal" | "high"`) calculado por
   `BiomarkerStatus::from(value, refMin, refMax)`.
2. IF o paciente não existe THEN o sistema SHALL responder `404` no envelope de erro padrão, código
   `PATIENT_NOT_FOUND`.
3. WHEN o paciente existe mas não tem nenhum biomarcador cadastrado THEN o sistema SHALL responder
   `200` com uma lista vazia `[]`.
4. The system SHALL calcular `status` como `"low"` quando `value < refMin`, `"high"` quando
   `value > refMax`, e `"normal"` quando `refMin <= value <= refMax` (limites inclusos).
5. The system SHALL manter `BiomarkerStatus::from()` livre de qualquer import do Illuminate — regra
   pura, testável sem banco (CLAUDE.md §7, §10).

**Independent Test**: `curl http://localhost:9000/api/v1/patients/<uuid>/biomarkers` devolve `200`
com cada item trazendo `status`; um teste unitário chama `BiomarkerStatus::from()` diretamente nos
limites exatos (`value == refMin`, `value == refMax`) e confirma `"normal"`.

---

### P4: Marcar/desmarcar acompanhamento de um paciente

**User Story**: Como app mobile, eu quero marcar ou desmarcar um paciente para acompanhamento, para
que o nutricionista sinalize quem precisa de atenção — e essa é a mutation de exemplo que prova o
fluxo otimista no mobile (feature irmã).

**Why P4**: Sem um endpoint de escrita real, a mutation otimista do mobile (`onMutate`/`onError`
rollback) não tem o que exercitar de ponta a ponta.

**Acceptance Criteria**:

1. WHEN uma requisição `PATCH /api/v1/patients/:id` chega com corpo `{ "needsFollowUp": true }` e
   `id` existente THEN o sistema SHALL persistir `needs_follow_up = true` nesse paciente e responder
   `200` com o paciente atualizado.
2. WHEN o corpo é `{ "needsFollowUp": false }` THEN o sistema SHALL persistir `false` e responder
   `200` com o paciente atualizado.
3. IF o `id` não corresponde a nenhum paciente THEN o sistema SHALL responder `404` no envelope de
   erro padrão, código `PATIENT_NOT_FOUND`, sem persistir nada.
4. IF o corpo não contém `needsFollowUp` ou contém um valor que não é booleano THEN o sistema SHALL
   responder `422` no envelope de erro padrão, sem persistir nada.
5. IF o corpo contém campos além de `needsFollowUp` THEN o sistema SHALL ignorá-los — nenhum campo
   além do permitido pelo FormRequest chega ao Service (CLAUDE.md §9, `$request->validated()`).

**Independent Test**: `curl -X PATCH -d '{"needsFollowUp":true}' -H 'Content-Type: application/json'
http://localhost:9000/api/v1/patients/<uuid>` devolve `200` com `needsFollowUp: true`; um `GET`
subsequente no mesmo paciente confirma a persistência.

---

## Edge Cases

- IF `search` é uma string vazia (`?search=`) THEN o sistema SHALL tratar como "sem filtro de busca"
  (equivalente a omitir o parâmetro), não como "nenhum resultado".
- IF `cursor` de uma página aponta para um paciente que foi removido entre as duas chamadas (não
  ocorre nesta fase, sem endpoint de remoção, mas o Service não deve quebrar) THEN o sistema SHALL
  continuar a paginação normalmente a partir do próximo `name`/`id` maior que o cursor, sem exigir
  que o registro do cursor ainda exista.
- WHEN duas marcas têm pacientes com o mesmo `name` THEN o sistema SHALL nunca misturar resultados
  entre marcas — o filtro `brand_id` sempre precede busca e cursor na query.

---

## Requirement Traceability

| Requirement ID | Story                                        | Task | Status  |
| --------------- | --------------------------------------------- | ---- | ------- |
| PATBE-01        | P1: Primeira página, ordenação e `next_cursor` | T12 | Complete |
| PATBE-02        | P1: Página seguinte via `cursor`                | T12 | Complete |
| PATBE-03        | P1: Última página → `next_cursor: null`         | T12 | Complete |
| PATBE-04        | P1: Busca por `name` (contém, case-insensitive) | T12 | Complete |
| PATBE-05        | P1: `limit` default/clamp                       | T8, T12 | Complete |
| PATBE-06        | P1: `brand` ausente → 422                       | T12 | Complete |
| PATBE-07        | P1: `brand` inexistente → 404                   | T12 | Complete |
| PATBE-08        | P1: `cursor` inválido → 400                     | T3, T9, T12 | Complete |
| PATBE-09        | P1: Controller sem regra de negócio             | T12 | Complete |
| PATBE-10        | P2: Detalhe de paciente por id                  | T12 | Complete |
| PATBE-11        | P2: id inexistente/malformado → 404             | T9, T12 | Complete |
| PATBE-12        | P3: Biomarcadores com status derivado           | T12 | Complete |
| PATBE-13        | P3: Paciente sem biomarcadores → `[]`           | T12 | Complete |
| PATBE-14        | P3: `BiomarkerStatus::from()` limites exatos    | T2 | Complete |
| PATBE-15        | P3: `BiomarkerStatus` puro, sem Illuminate      | T2 | Complete |
| PATBE-16        | P4: PATCH liga `needsFollowUp`                  | T12 | Complete |
| PATBE-17        | P4: PATCH desliga `needsFollowUp`               | T12 | Complete |
| PATBE-18        | P4: PATCH id inexistente → 404                  | T9, T12 | Complete |
| PATBE-19        | P4: PATCH corpo inválido → 422                  | T12 | Complete |
| PATBE-20        | P4: PATCH ignora campos não permitidos          | T12 | Complete |

**Coverage:** 20 total, 20 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] `GET /api/v1/patients?brand=nutri-care&limit=50` seguido de chamadas com `next_cursor`
      percorre todos os pacientes da marca sem duplicata nem lacuna (verificável por teste Feature
      com um seed de tamanho conhecido)
- [ ] `GET /api/v1/patients/:id/biomarkers` devolve `status` correto nos três casos (baixo, normal,
      alto) e nos dois limites exatos, coberto por teste unitário de `BiomarkerStatus`
- [ ] `PATCH /api/v1/patients/:id` altera `needs_follow_up` e a mudança é visível num `GET`
      subsequente
- [ ] Controller, Service e Repository respeitam as camadas do CLAUDE.md §6.1 (script de fronteira,
      §11.2)
- [ ] Índices `patients(brand_id, name)` e `biomarkers(patient_id, measured_at)` (já existentes desde
      a Fase 0) são exercitados pelas queries reais do `PatientService`, não ignorados por um
      `orderBy`/`where` que force outra coluna
