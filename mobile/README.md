# tecsa-health — mobile

App Expo/React Native white-label do "app do nutricionista". Um core único, duas marcas
(NutriCare, VitaPlus), diferenciadas por tokens/assets/copy/flags — nunca por `if` de marca. A
arquitetura completa e as regras invioláveis estão em [`CLAUDE.md`](../CLAUDE.md).

## Estrutura `core/` / `brands/`

```
mobile/src/
├── app/          ← rotas do Expo Router (alias @/ aponta para src/)
├── core/         ← ZERO conhecimento de marca
│   ├── api/      ← schemas zod, fetch, hooks de query
│   ├── features/ ← telas/lógica por domínio (patients, ai-actions...)
│   ├── ui/       ← componentes visuais, consomem useTheme()
│   ├── theme/    ← tipo Brand, BrandProvider, useTheme
│   ├── offline/  ← QueryClient único, persistência MMKV
│   └── flags/    ← useFlag(), feature flags com default por marca
└── brands/
    ├── index.ts       ← registry, único import de marca fora da raiz do app
    ├── nutri-care/    ← clínica/sóbria: teal, raios pequenos, Inter
    └── vita-plus/     ← bem-estar: coral, raios grandes/pill, Nunito
```

Nenhum arquivo em `src/core/**` importa de `src/brands/**`, contém nome de marca, ou ramifica
comportamento por marca — isso é garantido mecanicamente (ver seção de lint abaixo), não só por
convenção. `src/brands/index.ts` é resolvido em um único lugar: `src/app/_layout.tsx`, que monta
o `BrandProvider` na raiz. Nenhum outro arquivo importa de `brands/`.

## Como trocar de marca

A marca é selecionada em build-time via a variável `APP_BRAND`, lida por `app.config.ts`:

```bash
APP_BRAND=nutri-care npx expo start
# ou
APP_BRAND=vita-plus npx expo start
```

Sem `APP_BRAND` definida, o padrão é `nutri-care`. Um valor desconhecido falha explicitamente
(`app.config.ts` valida contra a lista de marcas conhecidas antes de montar a config do Expo).
`app.config.ts` mantém seu próprio descritor de build (`BRAND_BUILD_CONFIG`) autocontido com os
mesmos ids do registry — o Expo CLI avalia esse arquivo fora do Metro, então o alias `@/` não
resolve nesse contexto e ele não pode importar `resolveBrand` de `src/brands`. Em runtime, a
única fonte de verdade continua sendo `src/brands/index.ts`.

Cada marca gera nome de app, `bundleIdentifier`/`package`, ícone e splash distintos — dois
binários, um core.

## Testes, lint e checagem de tipos

```bash
npm test            # pretest (lint + guard-rail de marca) + Jest
npm run lint         # ESLint, incluindo a regra de fronteira de marca em src/core/**
npx tsc --noEmit      # checagem de tipos estrita (strict: true)
bash scripts/check-brand-boundary.sh   # guard-rail isolado, grep por nome de marca em src/core/
```

`npm test` já roda `pretest` automaticamente (hook nativo do npm). A regra de fronteira de marca
combina duas checagens: `no-restricted-imports` no ESLint (`src/core/**` não pode importar de
`**/brands/*`/`@/brands/*`, incluindo import bare) e o grep de `check-brand-boundary.sh`, que
falha se qualquer slug de marca aparecer dentro de `src/core/`. As duas rodam no `pretest`.

## Publicar OTA

OTA é feito via `expo-updates` + EAS Update, um canal por marca+ambiente. Perfis atuais em
[`eas.json`](./eas.json):

| Perfil | Canal | Uso |
|---|---|---|
| `development-nutri-care` | `nutri-care-development` | Build de desenvolvimento interno, marca NutriCare |
| `development-vita-plus` | `vita-plus-development` | Build de desenvolvimento interno, marca VitaPlus |

Para publicar uma atualização de bundle JS num canal:

```bash
eas update --branch nutri-care-development --message "descrição da mudança"
eas update --branch vita-plus-development --message "descrição da mudança"
```

O app já instalado (dev client ou build interno) nesse canal recebe o bundle novo sem passar por
loja de app. `runtimeVersion` usa a policy `appVersion` (`app.config.ts`), então uma atualização
OTA só é aplicada em builds cuja versão nativa é compatível — mudança de dependência nativa exige
novo build EAS, não só `eas update`.

## Seletor de marca em desenvolvimento

Um seletor de marca em runtime (troca sem rebuild) fica condicionado a `__DEV__` e vive fora de
`src/core/`, só para facilitar demonstração lado a lado das duas marcas. Nunca chega ao build de
produção.

## O que fica de fora, de propósito

Ver [`CLAUDE.md` §15](../CLAUDE.md#15-o-que-fica-de-fora-de-propósito) — autenticação real,
multi-tenancy, sync bidirecional completo, HealthKit, CI/CD.
