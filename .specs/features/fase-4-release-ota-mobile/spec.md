# Fase 4 — Release: OTA e build por marca (mobile) Specification

## Problem Statement

O projeto hoje só roda via `npx expo start` com `APP_BRAND` — não existe build nativo instalável,
não existe projeto EAS, e `expo-updates` não está configurado. `docs/requisitos-do-produto.md`
linha 32 exige "OTA de bundle JS (justificar ferramenta)" como funcionalidade entregável, e a
tabela de pesos do mesmo documento (linha 47) atribui 23% do peso de engenharia a "Plataforma e
release (Flag, OTA, nativo e offline)". Sem esta fase, a arquitetura multimarca (Fase 0) fica sem a
prova de que gera dois binários instaláveis de verdade, e não há como demonstrar que um update JS
chega a um device sem novo build nativo.

## Goals

- [ ] Duas marcas com perfil de build de desenvolvimento (`expo-dev-client`) instalável em Android e
      iOS, com ícone/nome/bundle id distintos por marca
- [ ] `expo-updates` configurado com canal por marca+ambiente, resolvido automaticamente por
      `APP_BRAND` em tempo de build (sem `if` de marca em `core/`)
- [ ] Update JS publicado via `eas update` e aplicado num device com o build de desenvolvimento já
      instalado, sem novo build nativo

## Out of Scope

Explicitamente excluído. Documentado para prevenir scope creep.

| Feature                                              | Reason                                                                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Build de produção / distribuição em loja (App Store, Play Store) | CLAUDE.md §14.9 e §3 (requisitos) só exigem OTA aplicado num device com build interno/dev; loja é escopo maior e não pedido. |
| CI/CD automatizando `eas build`/`eas update` a cada push | CLAUDE.md §15 marca CI/CD como fora de escopo do projeto inteiro; scripts rodam localmente.               |
| Rollback automático de update com falha (crash-based)  | Requisitos pedem só publicar e aplicar OTA; estratégia de rollback fica como nota de operação no README, não como comportamento implementado. |
| Novo endpoint ou mudança de contrato no backend         | Fase 4 do plano não tem seção de Backend; confirmado com o usuário — nenhum componente de backend nesta fase. |
| Assinatura de código de produção (certificados Apple/Google de release) | Só builds de desenvolvimento (`expo-dev-client`) são exigidos; assinatura de release fica fora. |

---

## Assumptions & Open Questions

Toda ambiguidade foi resolvida ou registrada aqui — nada fica silenciosamente indefinido.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Plataformas cobertas | Android e iOS (simulador/device do usuário) | Usuário confirmou ter simulador/device iOS disponível — diferente do caso HealthKit (CLAUDE.md §15), não há restrição de honestidade de demo aqui. | y |
| Tipo de build para instalar no device | `expo-dev-client` (perfil `development` no `eas.json`) | Critério de saída (CLAUDE.md §14.9) só pede "dev client ou build interno"; dev client itera mais rápido e não exige assinatura de release. | y |
| Arquitetura de canais EAS Update | Um único `projectId` EAS (mesmo código-fonte, duas marcas), canais nomeados `<brand>-development` (ex.: `nutri-care-development`, `vita-plus-development`) | Padrão recomendado pela Expo para apps white-label com um projeto EAS e múltiplos binários; evita duplicar projeto/infra de update por marca. | y |
| Runtime version policy | `"appVersion"` (deriva o `runtimeVersion` do campo `version` do `app.config.ts`) | Verificado na doc oficial (`docs.expo.dev/eas-update/deployment`, Design, 2026-09-02): é o default gerado por `eas update:configure` e o único não marcado como experimental — a política `"fingerprint"` existe mas a própria documentação Expo a rotula "experimental and not yet widely recommended". Trade-off aceito: bump manual de `version` a cada mudança nativa (raro nesta fase — só builds de desenvolvimento). | y (técnico, resolvido no Design via pesquisa) |
| Escopo de backend | Nenhum — fase 4 é só mobile | Usuário confirmou explicitamente; plano de desenvolvimento também não lista seção Backend para esta fase. | y |
| Conta/projeto EAS | Usuário já tem conta EAS, mas **não** tem projeto criado ainda | `eas init` roda de forma interativa, exige login do usuário — ação externa e visível (cria recurso na conta EAS do usuário). Tasks devem pausar e pedir confirmação explícita antes desse passo, não automatizá-lo silenciosamente. | y |
| Build já instalado no device | Não existe ainda | Tasks incluem gerar o build de desenvolvimento como pré-requisito da validação de OTA, não assumem que já existe. | y |
| Seletor de marca em dev (`__DEV__`) | Fora de escopo desta fase — já existe/é responsabilidade da Fase 0 (CLAUDE.md §5.3) | Fase 4 trata só de build/release/OTA; se o seletor não existir ainda, é gap de outra fase, não desta. | y |

**Open questions:** none — todas resolvidas ou registradas acima.

---

## User Stories

### P1: Build de desenvolvimento instalável por marca ⭐ MVP

**User Story**: Como avaliador/desenvolvedor, quero instalar um build de desenvolvimento de cada
marca no meu device (Android e iOS), para poder demonstrar o app rodando de verdade, com ícone e
nome distintos, fora do Expo Go.

**Why P1**: Sem um binário instalado, não há onde aplicar um update OTA — é pré-requisito de tudo
o mais nesta fase, e é também o próprio critério de aceite final "app instalado nas duas marcas,
ícone e nome distintos, rodando lado a lado" (CLAUDE.md §3, checklist multimarca).

**Acceptance Criteria**:

1. WHEN `eas build --profile development --platform android -e APP_BRAND=nutri-care` (e o
   equivalente para `vita-plus`) roda com sucesso THEN o sistema SHALL gerar um `.apk` instalável
   com ícone, nome de app e `applicationId` (package) específicos da marca, conforme
   `BRAND_BUILD_CONFIG` de `app.config.ts`.
2. WHEN o mesmo comando roda com `--platform ios` THEN o sistema SHALL gerar um build instalável em
   simulador (ou dispositivo, se houver perfil de assinatura ad hoc configurado) com ícone, nome e
   `bundleIdentifier` específicos da marca.
3. WHILE os dois builds (nutri-care e vita-plus) estão instalados no mesmo device físico/simulador
   the sistema SHALL manter os dois como apps distintos e independentes (não sobrescreve um ao
   instalar o outro), pois `applicationId`/`bundleIdentifier` diferem por marca.
4. The sistema SHALL incluir `expo-dev-client` no perfil `development` do `eas.json`, permitindo
   conectar a um servidor Metro local durante o desenvolvimento.

**Independent Test**: Rodar os dois comandos de build (Android), instalar os dois `.apk` no mesmo
emulador/device, confirmar visualmente dois ícones e nomes diferentes na tela inicial, abrir os
dois e confirmar que cada um mostra a marca correta.

---

### P2: expo-updates configurado com canal por marca ⭐ MVP

**User Story**: Como desenvolvedor, quero que cada build resolva automaticamente o canal de update
correto pela marca com que foi compilado, para que publicar um update num canal só afete a marca
certa.

**Why P2**: É o mecanismo que faz a Story P3 (publicar e aplicar OTA) funcionar sem ambiguidade —
sem canal correto por build, um update de uma marca poderia ser aplicado à outra.

**Acceptance Criteria**:

1. The sistema SHALL declarar `expo-updates` como plugin/config em `app.config.ts`, com
   `updates.url` apontando para o projeto EAS único do repositório.
2. WHEN um build é gerado com `APP_BRAND=nutri-care` e perfil `development` THEN o binário
   resultante SHALL reportar canal `nutri-care-development` (verificável via
   `Updates.channel` em runtime ou `eas update:list --channel nutri-care-development`).
3. WHEN um build é gerado com `APP_BRAND=vita-plus` e perfil `development` THEN o binário
   resultante SHALL reportar canal `vita-plus-development`, nunca o canal da outra marca.
4. The sistema SHALL derivar o canal a partir de `APP_BRAND` e do perfil de build dentro de
   `eas.json`/`app.config.ts` (nunca por `if` de marca dentro de `mobile/src/core/**` —
   CLAUDE.md §2.1); a lógica de canal vive em configuração de build, não em código de app.
5. IF `APP_BRAND` não é uma marca conhecida THEN o sistema SHALL falhar o build com erro explícito
   (mecanismo já existente em `app.config.ts` desde a Fase 0 — reaproveitado, não duplicado).

**Independent Test**: Gerar um build de cada marca, abrir cada um e inspecionar `Updates.channel`
(ex.: numa tela de debug/dev-only, ou via log), confirmar que cada binário aponta para o canal da
própria marca.

---

### P3: Publicar e validar update OTA num device já instalado ⭐ MVP

**User Story**: Como desenvolvedor, quero publicar uma mudança de bundle JS via `eas update` e
vê-la chegar automaticamente num device que já tem o build de desenvolvimento instalado, sem
precisar gerar um novo binário nativo, para provar a estratégia de release incremental do produto.

**Why P3**: É o requisito explícito de `docs/requisitos-do-produto.md` linha 32 ("OTA de bundle
JS") e o critério de saída da Fase 4 no plano de desenvolvimento.

**Acceptance Criteria**:

1. WHEN `eas update --branch nutri-care-development --message "..."` roda com sucesso THEN o
   sistema SHALL publicar um novo update associado ao canal `nutri-care-development` (branch e
   canal com o mesmo nome, convenção padrão do `eas update:configure`).
2. WHEN o app com o build de desenvolvimento da marca correspondente é reaberto (ou checa updates
   em foreground, conforme `checkAutomatically` padrão do SDK) THEN o sistema SHALL baixar e
   aplicar o novo bundle JS sem exigir reinstalação do `.apk`/build nativo.
3. WHILE o `runtimeVersion` do binário instalado é compatível com o `runtimeVersion` do update
   publicado (política `appVersion`, derivado do campo `version` do `app.config.ts`) THEN o
   sistema SHALL aplicar o update; caso contrário, o sistema SHALL ignorar o update incompatível
   em vez de aplicar um bundle JS que não bate com o código nativo instalado (comportamento nativo
   do `expo-updates`, não implementação customizada).
4. IF a mudança publicada foi só em `nutri-care-development` THEN o binário instalado da marca
   `vita-plus` SHALL permanecer no bundle anterior (canal isolado por marca — prova visual de que
   os canais não vazam entre marcas).
5. The sistema SHALL documentar no README (mobile) o comando exato usado para publicar o update e
   como confirmar visualmente que ele foi aplicado (ex.: uma mudança de texto/versão visível na UI
   usada como marcador de teste).

**Independent Test**: Fazer uma alteração trivial e visível na UI (ex.: um texto), publicar via
`eas update` no canal da marca A, reabrir o app instalado da marca A e confirmar visualmente a
mudança; reabrir o app da marca B e confirmar que ele NÃO mudou.

---

## Edge Cases

- IF `eas build` falha (erro de credencial, quota, rede) THEN o sistema SHALL expor a mensagem de
  erro da EAS CLI no terminal; não há tratamento customizado — é falha de uma ferramenta externa,
  documentada como tal no README, não escondida.
- IF o device está offline no momento em que o app checa por update THEN o sistema SHALL manter o
  bundle JS atualmente instalado (comportamento padrão do `expo-updates`; não é uma mutation
  otimista do CLAUDE.md §5.6 — é um mecanismo de update de bundle, fora do escopo de
  otimismo/rollback de dados).
- IF o `runtimeVersion` do update publicado não é compatível com o binário instalado (ex.: uma
  dependência nativa nova foi adicionada sem gerar novo build) THEN o sistema SHALL não aplicar
  esse update a esse binário (o binário permanece na versão nativa anterior até um novo build ser
  instalado) — comportamento nativo de `expo-updates` com política `fingerprint`, não lógica
  custom.
- WHEN dois builds de marcas diferentes são instalados no mesmo device THEN o sistema SHALL
  mantê-los como apps totalmente independentes (dados, cache MMKV, sessão de update) — já garantido
  por `applicationId`/`bundleIdentifier` distintos por marca, não exige código novo.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| REL-01 | P1: Build de desenvolvimento por marca | Design | Pending |
| REL-02 | P1: Build de desenvolvimento por marca | Design | Pending |
| REL-03 | P1: Build de desenvolvimento por marca | Design | Pending |
| REL-04 | P1: Build de desenvolvimento por marca | Design | Pending |
| REL-05 | P2: expo-updates com canal por marca | Design | Pending |
| REL-06 | P2: expo-updates com canal por marca | Design | Pending |
| REL-07 | P2: expo-updates com canal por marca | Design | Pending |
| REL-08 | P2: expo-updates com canal por marca | Design | Pending |
| REL-09 | P2: expo-updates com canal por marca | Design | Pending |
| REL-10 | P3: Publicar e validar OTA | Design | Pending |
| REL-11 | P3: Publicar e validar OTA | Design | Pending |
| REL-12 | P3: Publicar e validar OTA | Design | Pending |
| REL-13 | P3: Publicar e validar OTA | Design | Pending |
| REL-14 | P3: Publicar e validar OTA | Design | Pending |

**ID format:** `REL-NN`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 14 total, 0 mapped to tasks, 14 unmapped ⚠️ (mapeamento acontece na fase Tasks)

---

## Success Criteria

- [ ] Dois `.apk` (nutri-care, vita-plus) de perfil `development` instalados lado a lado no mesmo
      device/emulador Android, com ícone e nome distintos
- [ ] Build iOS de desenvolvimento gerado e instalado em simulador/device para pelo menos uma marca
      (idealmente as duas)
- [ ] Um update JS publicado via `eas update` é recebido por um device com build já instalado, sem
      novo build nativo, e a mudança é visualmente confirmável
- [ ] Publicar update num canal de uma marca não afeta o app instalado da outra marca
