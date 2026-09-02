# Fase 1 — Feature Flags Backend Context

**Gathered:** 2026-09-01
**Spec:** `.specs/features/fase-1-feature-flags-backend/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Um único endpoint de leitura, `GET /api/v1/feature-flags`, que devolve o mapa de feature flags
efetivo de uma marca (`brand`). É a primeira peça do mecanismo de kill switch de IA (CLAUDE.md
§5.7) e o primeiro endpoint real da API — arrasta consigo a primeira exposição via OpenAPI
(`dedoc/scramble`, CLAUDE.md §3) e o primeiro `routes/api.php` do projeto.

---

## Implementation Decisions

### Formato do payload

- Mapa `key → bool`, não lista de objetos: `{ "aiActionsEnabled": true, "offlineBanner": false }`.
- Motivo: bate 1:1 com o tipo `FeatureFlags` já definido em `mobile/src/core/theme/brand.types.ts`
  (`{ aiActionsEnabled: boolean; offlineBanner: boolean }`). O hook `useFlag(key)` do mobile faz
  lookup direto na resposta, sem `reduce`/transformação client-side.
- Consequência para o schema zod do mobile: `featureFlagsSchema` é `z.object({ aiActionsEnabled:
  z.boolean(), offlineBanner: z.boolean() })` — as mesmas chaves de `FeatureFlags`, exigidas (não
  `.partial()`), porque o contrato é "a resposta sempre traz todas as flags conhecidas da marca".

### Brand scoping

- Query param: `GET /api/v1/feature-flags?brand=<slug>` (ex.: `nutri-care`, `vita-plus`).
- Motivo: o projeto não tem autenticação real (CLAUDE.md §15 — usuário semeado + token fixo), então
  não há um mecanismo de sessão/tenant do qual derivar a marca automaticamente. Query param é
  explícito, testável via `curl` sem headers extras, e não exige middleware novo.
- `brand` ausente ou slug que não corresponde a nenhuma marca cadastrada → erro (ver Edge Cases no
  spec, mapeado para `422` via FormRequest — slug ausente/mal formado — e `404` via exceção de
  domínio — slug bem formado mas marca inexistente).
- **Nota registrada para o futuro:** se autenticação real entrar no projeto (hoje fora de escopo,
  CLAUDE.md §15), este mecanismo deve ser revisitado — o brand passaria a vir do usuário
  autenticado/token, não de query param. Decisão do usuário: registrar esta nota no
  `docs/plano-de-desenvolvimento.md` (seção da Fase 1) como um lembrete explícito, não deixar
  perdida só no spec.

### Cache / versionamento

- Sem cache HTTP (`ETag`/`Cache-Control`) nem versionamento de payload nesta fase — não foi pedido
  e o endpoint já é barato (uma query indexada por `brand_id`). Fica como Assumption no spec.

---

## Agent's Discretion

- Exposição via `dedoc/scramble` (`/docs/api`): CLAUDE.md §3 diz que o OpenAPI "entra junto do
  primeiro endpoint real" — este é esse endpoint. Trago a instalação/config mínima do Scramble para
  esta feature em vez de adiar, mas mantenho o escopo de documentação mínimo (só o que o Scramble
  gera automaticamente a partir do FormRequest/Resource, sem anotações extras).
- Estrutura interna (`Application/FeatureFlag/FeatureFlagService`, FormRequest de query,
  `FeatureFlagResource` ou serialização direta) fica para o Design — não é uma decisão de produto.
- Rate limit: endpoint de leitura simples, sem dado sensível — não aplico throttle dedicado (o
  throttle explícito do CLAUDE.md §9 é escopado ao endpoint de IA, Fase 3). Documentado como
  Assumption.

### Declined / Undiscussed Gray Areas → Assumptions

- Nenhuma — as duas áreas de ambiguidade genuína (payload, brand scoping) foram discutidas e
  decididas acima. As demais (cache, rate limit, versionamento) foram resolvidas por discricão do
  agente por serem técnicas, não de produto, e ficam registradas como Assumptions no spec.

---

## Specific References

Nenhuma referência visual/de produto externa — endpoint puro de API, sem UI.

---

## Deferred Ideas

- Trocar brand scoping por derivação a partir de autenticação real: pertence a uma fase futura fora
  do escopo atual do projeto (CLAUDE.md §15). Registrar nota em
  `docs/plano-de-desenvolvimento.md`.
