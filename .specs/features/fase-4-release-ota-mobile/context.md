# Fase 4 — Release: OTA e build por marca (mobile) Context

**Gathered:** 2026-09-02
**Spec:** `.specs/features/fase-4-release-ota-mobile/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Gerar builds de desenvolvimento instaláveis para as duas marcas (Android e iOS), configurar
`expo-updates` com um canal por marca, e publicar/validar um update OTA aplicado num device já
instalado, sem novo build nativo. Sem componente de backend.

---

## Implementation Decisions

### Plataformas

- Android **e** iOS entram no escopo testável — usuário tem simulador/device iOS disponível,
  diferente da restrição de HealthKit (CLAUDE.md §15).

### Tipo de build

- Perfil `development` no `eas.json`, com `expo-dev-client`. Não é build de produção nem exige
  assinatura de release — CLAUDE.md §14.9 só pede "dev client ou build interno".

### Arquitetura de canais EAS Update

- Um único `projectId` EAS (mesmo código-fonte para as duas marcas).
- Canais nomeados `<brand>-<profile>`: `nutri-care-development`, `vita-plus-development`.
- O canal é resolvido em configuração de build (`app.config.ts`/`eas.json`), nunca por `if` de
  marca dentro de `mobile/src/core/**`.

### Conta e projeto EAS

- Usuário já tem conta EAS, mas **não** tem projeto criado.
- `eas init`/`eas login` são ações externas e interativas (criam recurso na conta do usuário) — a
  task correspondente deve pausar e pedir confirmação explícita antes de rodar, não automatizar
  silenciosamente.

### Build no device

- Não existe build instalado ainda. As tasks precisam gerar o build de desenvolvimento como
  pré-requisito de qualquer validação de OTA — não assumir que já existe.

### Escopo de backend

- Nenhum. Confirmado explicitamente com o usuário. Plano de desenvolvimento também não lista seção
  Backend para a Fase 4.

---

## Agent's Discretion

- **Runtime version policy**: `"appVersion"` confirmado via pesquisa na doc oficial no Design
  (`docs.expo.dev/eas-update/deployment`, 2026-09-02) — é o default de `eas update:configure` e a
  única política não rotulada "experimental" pela própria Expo (`"fingerprint"` existe, mas a doc
  desaconselha para uso geral hoje). Não é decisão de produto, é implementação.
- **Nome de branch/canal exato para produção** (`<brand>-production`) fica como convenção a criar
  no Design se/quando um perfil `production` for necessário; a Fase 4 só exige o canal
  `development` para atingir o critério de saída. Se o Design achar necessário um segundo perfil,
  registra como decisão técnica lá, não aqui.

---

## Declined / Undiscussed Gray Areas → Assumptions

Nenhuma — as três perguntas discutidas cobriram as decisões de produto genuínas desta fase (as
demais são técnicas, resolvidas no Design). Já refletidas na tabela de Assumptions do `spec.md`.

---

## Specific References

Nenhuma referência visual/específica — feature de infraestrutura de release, não de UI.

---

## Deferred Ideas

- Build de produção / distribuição em loja: fora de escopo, CLAUDE.md §14.9 não exige.
- Rollback automático de update com crash detection: fora de escopo, requisitos pedem só
  publicar/aplicar.
- CI/CD automatizando `eas build`/`eas update`: fora de escopo do projeto inteiro (CLAUDE.md §15).
