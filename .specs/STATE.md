# STATE

## Decisions

- **AD-001** (status: active) — Servidor HTTP do container `api` na Fase 0: `php artisan serve` em
  imagem `php:8.3-cli`, não nginx+php-fpm. Rationale: reprodutibilidade do ambiente de dev pesa mais
  que fidelidade de produção nesta fase; documentado em `docs/adr/0001-servidor-http-embutido.md`.
- **AD-002** (status: active) — Todas as tabelas do modelo de dados usam UUID como chave primária,
  não bigint auto-increment. Rationale: evita vazar contagem/ordem de registro entre marcas; consistente
  com paginação cursor planejada para a Fase 2.
- **AD-003** (status: active) — Configuração de ambiente é sempre por projeto: `api/.env` e
  `mobile/.env` (gitignored), cada um com seu `.env.example` versionado. Nenhum `.env` compartilhado
  na raiz. `docker-compose.yml` lê via `env_file: api/.env`; se `api/.env` não existir, o entrypoint
  copia de `api/.env.example` automaticamente. Rationale: pedido explícito do usuário — nenhuma
  configuração de ambiente pode ficar hardcoded em código versionado.
- **AD-004** (status: active) — A primeira entidade de `Domain` implementada é `FeatureFlag`, não
  `Patient`. Rationale: menor superfície para provar a inversão de dependência na Fase 0, e o código
  não é descartável — vira o `GET /feature-flags` real da Fase 1.
- **AD-005** (status: active) — `mobile/eslint.config.js` (flat config) em vez de `.eslintrc.js`.
  Rationale: Expo SDK 57 + ESLint 9 só suportam flat config; `.eslintrc.js` não é lido. A regra
  `no-restricted-imports` de CLAUDE.md §11.1 foi traduzida 1:1 para esse formato, cobrindo também
  `**/brands`/`@/brands` (import sem sufixo `/*`) além de `**/brands/*`/`@/brands/*`.
- **AD-006** (status: active) — `mobile/app.config.ts` não importa `resolveBrand` de `src/brands`;
  mantém um descritor de build (`BRAND_BUILD_CONFIG`) autocontido com os mesmos `id`s do registry.
  Rationale: Expo CLI avalia `app.config.ts` via `require()` do Node fora do Metro — o alias `@/` de
  `tsconfig.json` não resolve nesse contexto. `src/brands/index.ts` continua sendo a única fonte de
  verdade em runtime do app (consumida via `BrandProvider`/`useTheme`); `app.config.ts` é a única
  duplicação intencional e deve ser mantida em sincronia manual com as cores de fundo de cada marca
  (`splashBackgroundColor` == `theme.colors.background` de cada marca — checar isso ao editar tema).
- **AD-007** (status: active) — Rotas do Expo Router ficam em `mobile/src/app/`, não `mobile/app/`.
  Rationale: convergência com o restante do código em `src/` (alias `@/` aponta para `src/`); é o
  layout gerado pelo template `create-expo-app` usado no scaffold.
- **AD-011** (status: active) — `docker-compose.yml`, serviço `api` ganha `healthcheck` próprio
  (`curl -f http://localhost:9000/up`, `start_period: 90s`, `retries: 20`). Rationale: sem ele,
  `docker compose up -d` devolve o prompt assim que o container "Started" (processo lançado), não
  quando o entrypoint termina `composer install` (sem cache, do zero, pode levar ~1-2 min) +
  migrations + seed de 5000 pacientes (~7.5s) + bind da porta. Um `curl` imediato nessa janela dá
  `Connection reset by peer` — reproduzido ao vivo (usuário bateu nisso; eu também reproduzi de
  propósito depois do fix, sem `--wait`, pra confirmar a causa). Comando correto documentado no
  README agora é `docker compose up -d --wait`, que bloqueia até o healthcheck do `api` reportar
  saudável de verdade, não só até o container iniciar. `curl.exe`/`curl` já vêm na imagem
  `php:8.3-cli` (confirmado, não precisou instalar).
- **AD-009** (status: active) — `docker-compose.yml`, healthcheck do serviço `db`: `pg_isready -U
  "$POSTGRES_USER" -d "$POSTGRES_DB"` em vez de `pg_isready` puro. Rationale: sem flags, o comando
  tenta autenticar como o usuário do SO rodando dentro do container (`root`), que não existe como
  role no Postgres — gera `FATAL: role "root" does not exist` a cada 5s, para sempre, no log do
  banco. O healthcheck ainda "passava" (Postgres responde ao handshake mesmo rejeitando a
  autenticação, então `pg_isready` considera o servidor "accepting connections"), então a Fase 0
  nunca travava por causa disso — mas não validava de fato que a role/banco da aplicação estavam
  prontos, só que o processo Postgres respondia. Achado ao vivo pelo usuário depois do handoff
  nominal da Fase 0; corrigido nesta sessão, verificado com `docker compose down -v && up` limpo
  (sem spam de FATAL, `curl /up` 200, `Patient::count()` 5000).
- **AD-010** (status: active) — `api/scripts/check-layer-boundary.sh` varre `DB::`/`Models\` também
  em `Http/Controllers/`, não só `Application/`. Rationale: `spec.md` (FNDBE-02, AC2) sempre exigiu
  as duas pastas — o script implementado nos batches originais só cobria `Application/` (o snippet
  ilustrativo de CLAUDE.md §11.2 também só cobre `Application/`, mas a spec do projeto é mais
  estrita e prevalece por ser específica desta feature). Achado pelo Verifier
  (`validation.md`, gap #6); corrigido nesta sessão com teste novo em
  `LayerBoundaryScriptTest::test_fails_when_controller_uses_db_facade_or_eloquent_models`.
- **AD-008** (status: active) — `BrandProvider` recebe a marca já resolvida via prop (`brand: Brand`),
  não um `brandId: string`. Rationale: achado do Verifier na Fase 0 — a versão anterior fazia
  `BrandProvider` importar `resolveBrand` de `@/brands` diretamente, violando CLAUDE.md §2.1 (core
  não pode conhecer marca) por um ponto cego do guard-rail (import bare `@/brands` sem sufixo `/*`
  não batia no padrão do ESLint). A resolução agora acontece só na raiz do app
  (`mobile/src/app/_layout.tsx`, via `Constants.expoConfig.extra.brandId` + `resolveBrand`), que é o
  único lugar autorizado a importar de `brands/` fora do próprio `brands/index.ts`. Ver AD-005 para o
  fechamento do gap no guard-rail.

## Handoff

- **Feature**: `fase-0-fundacao` (`.specs/features/fase-0-fundacao/`)
- **Phase / Task**: Execute concluído (T1-T32 commitados). Verifier rodou e retornou **FAIL**
  (`.specs/features/fase-0-fundacao/validation.md`): 2 blockers reais + 1 mutante sobrevivente +
  gaps menores, todos com fix aplicado nesta sessão (ver "Fixes pós-Verifier" abaixo). Ainda não
  commitado nem re-verificado — próximo passo é commitar e considerar rodar o Verifier de novo (ou
  aceitar a evidência local: `tsc --noEmit`, `npm test` 6/6, fixture de ESLint confirmando o gap
  fechado).
- **Completed**:
  - spec.md, design.md, tasks.md (32 tasks em 8 fases) — validados, 0 erros.
  - **Batch 1 (T1-T8)** — commits `1d1ae71`..`aa9aa83`: scaffold Laravel 11, `.env.example`,
    pastas Domain/Application/Infrastructure/Http, Pint+PHPStan nível 6, guard-rail de fronteira de
    camada (`check-layer-boundary.sh` + `LayerBoundaryScriptTest`, 3 testes), `FeatureFlagRepository`
    (interface+entidade), `EloquentFeatureFlagRepository`+Model, `DomainServiceProvider` com binding
    (`DomainServiceProviderTest`, 1 teste).
  - **Batch 2 (T9-T17)** — commits `69ef692`..`006772c`, mais `3c1f07a` (checkbox T17 + gitignore de
    `.env.testing`): migrations `brands/users/patients/biomarkers/ai_actions/feature_flags` (UUID PK,
    índices compostos, sem coluna de status derivado), factories (`Brand/Patient/Biomarker`, com
    `Biomarker::factory()->outOfRange()`), seeders determinísticos (`BrandSeeder`, `FeatureFlagSeeder`,
    `PatientSeeder` — seed Faker fixa `42`, ~50/50 entre marcas, ≥5000 pacientes), `PatientSeederTest`
    (3 testes) + `FeatureFlagRepositoryTest` (1 teste), `api/Dockerfile`, `api/docker/entrypoint.sh`
    (idempotente, verificado ao vivo), `docker-compose.yml` raiz (db+api, healthcheck,
    `env_file: api/.env`). T17 verificado ao vivo: `curl -f localhost:9000/up` → 200,
    `Patient::count()` → 5000, Postgres em `localhost:5433` — sem fix necessário, sem commit de
    código próprio (só o checkbox em `3c1f07a`).
  - **Batch 3 (T18-T25)** — commits `0503df9`..`bdd9c4d`: scaffold Expo (SDK 57, Expo Router,
    `tsconfig.json` com `strict: true` e alias `@/*`), `mobile/.env.example`
    (`EXPO_PUBLIC_API_URL=`), árvore `src/core/{api,features,ui,theme,offline,flags}/` +
    `src/brands/`, tipo `Brand` completo em `core/theme/brand.types.ts` (11 chaves de `colors` +
    `FeatureFlags`), marcas `nutri-care` (clínica/sóbria, teal `#0F6E63`, raios pequenos, Inter) e
    `vita-plus` (bem-estar, coral `#F2734A`, raios grandes/pill, Nunito) com assets placeholder,
    `brands/index.ts` com `resolveBrand()` (único ponto de import das marcas fora de `brands/**`),
    `BrandProvider`+`useTheme` (hook lança erro claro fora do provider). `npx tsc --noEmit` limpo ao
    final do batch. Verificado: git log confirma 8 commits, autoria correta, sem trailers.
  - **Batch 4 (T26-T32)** — commits `88ef39d`..`0a35901`: regra `no-restricted-imports` de fronteira
    de marca (implementada em `eslint.config.js`, formato flat-config — Expo SDK/ESLint 9 não suporta
    mais `.eslintrc.js`; mesma regra de CLAUDE.md §11.1 traduzida), `scripts/check-brand-boundary.sh`
    + `pretest` + 3 testes (`checkBrandBoundary.test.ts`), `app.config.ts` lendo `APP_BRAND`/
    `EXPO_PUBLIC_API_URL` (usa descritor de marca autocontido em vez de importar `resolveBrand` de
    `src/brands` — Expo CLI avalia `app.config.ts` fora do Metro, alias `@/` e import relativo sem
    extensão não resolvem nesse contexto; `src/brands/index.ts` continua sendo a fonte de verdade em
    runtime do app), tela de prova em `src/app/index.tsx` (rotas do projeto ficam em `mobile/src/app/`,
    não `mobile/app/` — convergência do template com `src/`), teste `index.test.tsx` comparando
    tokens entre marcas, seção "Como rodar" no README raiz, ADR 0001. Toolchain de teste/lint
    (`eslint`, `jest`, `jest-expo`, `@testing-library/react-native`, `babel.config.js`) precisou ser
    instalada do zero — scaffold do Expo não trouxe nada disso. Sanity final do batch: `tsc --noEmit`
    limpo, `npm test` 4/4, grep de fronteira em `src/core/` sem matches.
  - Total de testes backend na Fase 0 (via `php artisan test`): 10 passed, 23 assertions
    (STATE.md tinha registrado "14" por engano num handoff anterior — número correto confirmado
    pelo Verifier). Pint e PHPStan nível 6 limpos.
  - **Fixes pós-Verifier** (nesta sessão, ainda não commitados): `BrandProvider` reescrito para
    receber `brand: Brand` por prop em vez de `brandId` + `resolveBrand` interno (fecha a violação
    de fronteira, ver AD-008); `mobile/src/app/_layout.tsx` agora monta `BrandProvider` na raiz,
    resolvendo a marca via `Constants.expoConfig.extra.brandId` (antes o Provider nunca era montado
    no app real — só nos testes); `eslint.config.js` cobre também import bare `@/brands`/`**/brands`
    (ver AD-005); `app.config.ts` com `splashBackgroundColor` corrigido para bater com
    `theme.colors.background` real de cada marca (estava divergente — vita-plus tinha preto quase
    puro, exatamente o default genérico que CLAUDE.md §5.2 proíbe); novo teste
    `mobile/src/brands/__tests__/index.test.ts` cobrindo `resolveBrand` (ids válidos + erro em id
    desconhecido — mata o mutante M2 que a suíte anterior deixava sobreviver); `index.test.tsx`
    atualizado para o novo contrato de `BrandProvider`. Todos os comentários inline introduzidos
    pelos batches (incluindo os que eu mesmo adicionei ao "limpar" antes desta correção) foram
    removidos — pedido explícito do usuário: zero comentário no código, racional vai para cá ou para
    spec/design (memória `feedback_no_code_comments`). `npx tsc --noEmit` limpo, `npm test` 6/6.
    Gaps menores do validation.md (README cita endpoint de Fase 1 inexistente, script de fronteira
    backend não varre `Http/Controllers/`, resíduos do template Expo com cor literal e um
    `useTheme` concorrente em `src/hooks/`) ainda **não** corrigidos — ver "Next step".
- **Correção pós-entrega (nesta sessão, após o handoff acima)**: usuário reportou 3 problemas ao
  testar manualmente. Diagnosticados e corrigidos:
  1. `composer test` local falhava (`vendor/autoload.php` não existe) — causa raiz: o próprio guia
     de teste que passei mandava `rm -rf api/vendor` para simular `docker compose up` do zero, e o
     vendor nunca foi reinstalado localmente depois. Reinstalado via `composer:2` (Docker, não PHP
     local, por AD já registrada) + Postgres efêmero de teste (porta 5434) resubido manualmente
     (não é gerenciado pelo compose real). `composer test` volta a passar: 11 testes, 26 assertions,
     Pint e PHPStan limpos.
  2. `role "root" does not exist` em loop no log do `db` — bug real, ver AD-009. Corrigido e
     verificado com `docker compose down -v && up` limpo.
  3. Instrução minha de `psql -U <user> -d <db>` quebrou no zsh (`<user>` virou redirecionamento) —
     erro meu, não do projeto; usuário só precisava dos valores reais (`tecsa`/`tecsa_health`).
  Also corrigido de graça, achado do Verifier ainda pendente: AD-010 (guard-rail de camada backend
  não cobria `Http/Controllers/` para `DB::`/`Models\`).
  README corrigido: `curl -f http://localhost:9000/api/v1/feature-flags` (endpoint de Fase 1,
  inexistente ainda) trocado por `curl -f http://localhost:9000/up` (o que a Fase 0 garante).
- **Next step**: commitar as correções desta sessão (2 grupos: fixes funcionais do Verifier já
  commitados em `76cc004`/`97d63e2`; as correções pós-entrega desta seção — docker-compose,
  layer-boundary script + teste, README, spec.md, STATE.md — ainda não commitadas). Depois, decidir
  se roda o Verifier de novo (recomendado, já que o escopo mudou desde o último PASS/FAIL) ou se
  aceita a evidência local já coletada (composer test 11/11, Pint/PHPStan limpos, docker compose up
  limpo do zero, npm test/tsc do mobile já verificados na sessão anterior). Gaps menores restantes
  do `validation.md` que ainda não foram tocados: resíduos do template Expo com cor literal e um
  `useTheme` concorrente em `src/hooks/`, traceability table do spec.md nunca marcada "Complete"
  (todas as linhas ainda dizem "Pending" apesar do trabalho estar feito — cosmético, não bloqueia).
- **Decisão de ambiente registrada durante Execute**: PHP local (8.5.10, via Homebrew) é usado para
  comandos `artisan`/`pint`/`phpstan`/testes que não tocam `composer.lock`; qualquer
  `composer install`/`update` roda dentro de uma imagem `php:8.3-cli` (Docker, fora do repo) para
  manter o lockfile pinado à plataforma real de produção. Testes de integração (`RefreshDatabase`)
  usam um Postgres 16 efêmero em `localhost:5434` (`api/.env.testing`, gitignored, não committed) —
  separado do Postgres real do compose (`5433`).
- **Commits e autoria**: pedido explícito do usuário — nenhum commit deve ter trailer de co-autoria
  (`Co-Authored-By`, `Claude-Session` etc.) nem qualquer menção a Claude/IA na mensagem. Todos os
  commits até agora seguem esse padrão (autor = Bruno Leonardo via config local do git, mensagem
  Conventional Commits pura). Manter esse padrão em todos os batches restantes.
- **Blockers**: none
- **Uncommitted files**: `.claude/`, `.agents/`, `CLAUDE.md` (modificado), `README.md` (vazio),
  `.specs/STATE.md`, `.specs/features/fase-0-fundacao/{spec,design}.md` (nunca fizeram parte de
  nenhum commit de task — não pertencem a nenhuma task do plano; só `tasks.md` é tocado pelas tasks),
  `api/.env.testing` (gitignored agora, credenciais de teste, não deve ser commitado)
- **Branch**: main
- **Remote**: nenhum configurado ainda — usuário pediu para adicionar
  `https://github.com/brunols7/tecsa-health.git` como `origin` ao final de toda a Fase 0 (não fazer
  antes disso, e nunca dar `git push` sem autorização explícita separada).
