# Fase 0 — Fundação Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source
of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier,
discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/fase-0-fundacao/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from project guidelines - `CLAUDE.md` §2.6 (npm test / php artisan test são obrigatórios
> nos dois projetos), §3 (Jest + React Native Testing Library / Pest), §10 (mínimo de testes por
> camada), §11.1 e §11.2 (scripts de fronteira rodam no `pretest`). Projeto é greenfield — não há
> código nem testes existentes para amostrar, então a matriz vem inteiramente das guidelines
> documentadas, não de inferência sobre repositório.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------- | --------------------- | ------------------ | ------------ |
| `Domain/FeatureFlag/FeatureFlagRepository` (interface pura) | none | build gate only — interface sem lógica | `api/app/Domain/FeatureFlag/*.php` | `composer test` (via PHPStan) |
| `Infrastructure/.../EloquentFeatureFlagRepository` | integration | comportamento de query testado quando a tabela existir (Fase 0 adia para a task da tabela — ver T13, "merge forward") | `api/tests/Feature/FeatureFlagRepositoryTest.php` | `php artisan test --filter=FeatureFlagRepository` |
| `DomainServiceProvider` binding | unit | container resolve `FeatureFlagRepository::class` para a classe concreta correta | `api/tests/Unit/DomainServiceProviderTest.php` | `php artisan test --filter=DomainServiceProvider` |
| Guard-rail de camada backend (`check-layer-boundary.sh`) | integration | script sai ≠0 com violação injetada, 0 sem violação | `api/tests/Feature/LayerBoundaryScriptTest.php` | `php artisan test --filter=LayerBoundaryScript` |
| Guard-rail de marca mobile (ESLint + `check-brand-boundary`) | integration | script sai ≠0 com violação injetada, 0 sem violação | `mobile/scripts/__tests__/checkBrandBoundary.test.ts` | `npm test -- checkBrandBoundary` |
| Migrations + Seeder (`patients`, `biomarkers`, distribuição, determinismo) | integration | contagem ≥ N configurável, distribuída entre marcas, determinismo em duas execuções, casos fora de faixa presentes (N reduzido em teste automatizado; ≥5000 é validado manualmente no docker real — ver T17) | `api/tests/Feature/PatientSeederTest.php` | `php artisan test --filter=PatientSeeder` |
| Docker Compose end-to-end | none | verificação manual/independente apenas — não há camada de código para testar automatizado | n/a | `docker compose up` + `curl -f http://localhost:9000/up` |
| Contrato de marca (`Brand` type + duas marcas) | none (compile-time) | `tsc --noEmit` garante que as duas marcas satisfazem o tipo | `mobile/src/brands/**/*.ts` | `npx tsc --noEmit` |
| Tela de prova (`app/index.tsx`) renderizando as duas marcas | unit (RNTL) | renderiza a mesma tela com `nutri-care` e `vita-plus`, compara tokens aplicados — é o teste mínimo de mobile exigido pelo CLAUDE.md §10 | `mobile/app/__tests__/index.test.tsx` | `npm test -- index.test` |
| ESLint rule de fronteira de marca | none | coberta indiretamente pelo teste do script de guard-rail acima | n/a | `npm run lint` |
| Pint / PHPStan config | none | build gate only | n/a | `vendor/bin/pint --test`, `vendor/bin/phpstan analyse` |

## Gate Check Commands

> Comandos definidos nesta fase (projeto greenfield, sem `composer.json`/`package.json` ainda) — as
> tasks de skeleton (T1, T18) criam os scripts `composer.json`/`package.json` que tornam estes
> comandos reais. Confirmar antes de Execute.

| Gate Level | When to Use | Command |
| ---------- | ------------ | ------- |
| Quick | Depois de tasks com teste unit/integration isolado (backend) | `php artisan test --filter=<Nome>` |
| Quick (mobile) | Depois de tasks com teste unit/integration isolado (mobile) | `npm test -- <arquivo>` |
| Full (backend) | Depois de fase backend completa | `composer test` (encadeia `check-layer-boundary.sh` → `pint --test` → `phpstan analyse` → `php artisan test`) |
| Full (mobile) | Depois de fase mobile completa | `npm test` (encadeia `pretest`: `eslint` → `check-brand-boundary.sh` → `jest`) + `npx tsc --noEmit` |
| Build | Fim da Fase 0 inteira | `docker compose down -v && docker compose up` + `curl -f http://localhost:9000/up` + `APP_BRAND=vita-plus npx expo start` (smoke manual) |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks
within a phase execute in order.

Cada bloco abaixo mostra só as arestas intra-fase reais (a partir do `Depends on` de cada task).
Dependências que cruzam fases (ex.: T14 depende de T4, da Fase 1) aparecem no diagrama consolidado
da seção **Phase Execution Map**, não repetidas aqui.

### Phase 1: Backend — skeleton, ambiente e qualidade

```
T1 → T2
T1 → T3
T3 → T4
T3 → T5
```

### Phase 2: Backend — Domain de exemplo e inversão de dependência

```
T6 → T7
T7 → T8
```

### Phase 3: Backend — dados (migrations, factories, seeders)

```
T9 → T10
T10 → T11
T11 → T12
T12 → T13
```

### Phase 4: Backend — Docker Compose ponta a ponta

```
T14 → T15
T15 → T16
T16 → T17
```

### Phase 5: Mobile — skeleton e ambiente

```
T18 → T19
T18 → T20
```

### Phase 6: Mobile — contrato de marca

```
T21 → T22
T21 → T23
T22 → T24
T23 → T24
T24 → T25
```

### Phase 7: Mobile — guard-rail, seleção de marca e tela de prova

```
T26 → T27
T29 → T30
```

### Phase 8: Documentação

Sem arestas intra-fase — T31 e T32 dependem só de tasks de fases anteriores (T17, T30); ver o
diagrama consolidado em **Phase Execution Map**.

---

## Task Breakdown

### T1: Scaffold do projeto Laravel 11 em `api/`

**What**: Rodar `composer create-project laravel/laravel api` (ou equivalente), configurar
`declare(strict_types=1);` como stub padrão de novo arquivo, confirmar que `api/.env` e
`api/.env.example` foram gerados pelo instalador.
**Where**: `api/` (projeto inteiro gerado pelo Laravel installer)
**Depends on**: None
**Reuses**: n/a (primeiro código do projeto)
**Requirement**: FNDBE-06

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [x] `api/artisan --version` reporta Laravel 11.x
- [x] `api/.env` existe (gitignored pelo `.gitignore` gerado pelo installer) e `api/.env.example`
      existe e está versionável
- [x] `composer.json` já teria stub `strict_types` aplicável (documentar no README interno da task
      se o Laravel 11 não gerar isso por padrão — ajustar `.php-cs-fixer`/Pint para checar)

**Tests**: none
**Gate**: build

**Commit**: `chore(api): scaffold laravel 11 project`

---

### T2: `api/.env.example` completo + confirmação de `.gitignore`

**What**: Editar `api/.env.example` para conter todas as variáveis que a Fase 0 vai precisar:
`APP_KEY=`, `APP_PORT=9000`, `DB_CONNECTION=pgsql`, `DB_HOST=db`, `DB_PORT=5432`,
`DB_DATABASE=tecsa_health`, `DB_USERNAME=`, `DB_PASSWORD=`, `ANTHROPIC_API_KEY=`, `APP_DEBUG=false`
— todas vazias ou com placeholder não sensível. Confirmar que `.gitignore` do Laravel já ignora
`.env` (não `.env.example`).
**Where**: `api/.env.example`, `api/.gitignore` (verificação, sem edição se já correto)
**Depends on**: T1
**Reuses**: `.env.example` gerado por T1 como base
**Requirement**: FNDENV-01, FNDENV-03, FNDENV-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `api/.env.example` versionado contém todas as chaves acima, nenhuma com valor real
- [x] `git check-ignore api/.env` retorna o caminho (confirma que está ignorado)
- [x] `grep -c "ANTHROPIC_API_KEY=" api/.env.example` = 1 e o valor após `=` está vazio

**Tests**: none
**Gate**: build

**Commit**: `chore(api): document all env vars in .env.example`

---

### T3: Estrutura de pastas `Domain/ Application/ Infrastructure/ Http/`

**What**: Criar a árvore de diretórios de CLAUDE.md §4 dentro de `api/app/`:
`Domain/`, `Application/`, `Infrastructure/Persistence/Eloquent/Models/`, `Infrastructure/Llm/`,
`Http/{Controllers/Api/V1,Requests,Resources,Middleware}`. Pastas sem conteúdo ainda usam
`.gitkeep` até T6+ preencherem.
**Where**: `api/app/Domain/`, `api/app/Application/`, `api/app/Infrastructure/`, `api/app/Http/`
**Depends on**: T1
**Reuses**: estrutura padrão do Laravel gerada em T1 (mantém `Http/Controllers` existente, só
adiciona subpastas)
**Requirement**: FNDBE-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Todas as pastas listadas acima existem
- [x] Nenhuma pasta nova quebra o autoload PSR-4 já configurado pelo Laravel (`composer dump-autoload`
      roda sem erro)

**Tests**: none
**Gate**: build

**Commit**: `chore(api): add Domain/Application/Infrastructure folder skeleton`

---

### T4: Pint + PHPStan nível 6 configurados

**What**: Adicionar `laravel/pint` (já vem por padrão no Laravel 11) e `larastan/larastan` como
dependência de dev; criar `api/phpstan.neon` com `level: 6` e paths relevantes; garantir que ambos
passam limpos sobre o skeleton criado até aqui.
**Where**: `api/composer.json`, `api/phpstan.neon`, `api/pint.json` (se necessário customizar)
**Depends on**: T3
**Reuses**: `laravel/pint` já incluso no template do Laravel 11
**Requirement**: FNDBE-22, FNDBE-23, FNDBE-24

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [x] `vendor/bin/pint --test` sai com código 0
- [x] `vendor/bin/phpstan analyse` sai com código 0 no nível 6
- [x] `composer.json` ganha os scripts `"lint": "pint --test"` e `"stan": "phpstan analyse"`

**Tests**: none
**Gate**: build

**Commit**: `chore(api): configure pint and phpstan level 6`

---

### T5: Guard-rail de fronteira de camada backend + `pretest`

**What**: Criar `api/scripts/check-layer-boundary.sh` (template de CLAUDE.md §11.2: falha se
`Illuminate\` aparece em `Domain/`, se `DB::`/`Models\` aparece em `Application/` ou
`Http/Controllers/`, ou se `$request->all()` aparece em `Http/Controllers/`); registrar
`"pretest": "bash scripts/check-layer-boundary.sh"` e `"test": "@pretest && php artisan test"` (ou
composer script equivalente) em `composer.json`; escrever teste que injeta violação num arquivo
temporário fora de `app/` real (fixture) e confirma código de saída ≠0, depois confirma código 0 sem
violação.
**Where**: `api/scripts/check-layer-boundary.sh`, `api/composer.json`,
`api/tests/Feature/LayerBoundaryScriptTest.php`
**Depends on**: T3
**Reuses**: template de script já dado em CLAUDE.md §11.2
**Requirement**: FNDBE-01, FNDBE-02, FNDBE-03, FNDBE-04, FNDBE-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `LayerBoundaryScriptTest` cria um arquivo fixture temporário com `use Illuminate\Support\Str;`
      dentro de uma cópia isolada de `Domain/` (ou aponta o script para um diretório de fixture via
      arg), roda o script, assert exit code ≠0; remove a fixture, assert exit code 0
- [x] Teste equivalente para `DB::`/`Models\` em `Application/` e para `$request->all()` em
      `Http/Controllers/`
- [x] `composer test` já roda o script antes da suíte Pest
- [x] Gate check passa: `php artisan test --filter=LayerBoundaryScript`
- [x] Test count: 3 testes passam (uma cobertura por tipo de violação), nenhuma deleção silenciosa

**Tests**: integration
**Gate**: quick

**Commit**: `test(api): add layer boundary guard-rail script and tests`

---

### T6: Interface `FeatureFlagRepository` (Domain)

**What**: Criar `api/app/Domain/FeatureFlag/FeatureFlagRepository.php` com o método
`findByKeyAndBrand(string $key, string $brandId): ?FeatureFlag` e a entidade de valor `FeatureFlag`
(propriedades `key`, `brandId`, `enabled`, todas `readonly`), sem nenhum `use Illuminate\`.
**Where**: `api/app/Domain/FeatureFlag/FeatureFlagRepository.php`,
`api/app/Domain/FeatureFlag/FeatureFlag.php`
**Depends on**: T3
**Reuses**: n/a
**Requirement**: FNDBE-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `grep -c "Illuminate" api/app/Domain/FeatureFlag/*.php` = 0
- [x] `vendor/bin/phpstan analyse` continua limpo com os novos arquivos

**Tests**: none
**Gate**: build

**Commit**: `feat(api): add FeatureFlagRepository domain interface`

---

### T7: `EloquentFeatureFlagRepository` + Model

**What**: Criar `api/app/Infrastructure/Persistence/Eloquent/Models/FeatureFlag.php` (Eloquent
Model, `$fillable` explícito, tabela `feature_flags`) e
`api/app/Infrastructure/Persistence/Eloquent/EloquentFeatureFlagRepository.php` implementando
`FeatureFlagRepository`, mapeando o Model para a entidade de domínio `FeatureFlag`.
**Where**: `api/app/Infrastructure/Persistence/Eloquent/Models/FeatureFlag.php`,
`api/app/Infrastructure/Persistence/Eloquent/EloquentFeatureFlagRepository.php`
**Depends on**: T6
**Reuses**: interface criada em T6
**Requirement**: FNDBE-07

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [x] `EloquentFeatureFlagRepository implements FeatureFlagRepository` compila e o método devolve a
      entidade de domínio (nunca o Model Eloquent) ao chamador
- [x] `vendor/bin/phpstan analyse` limpo

**Tests**: none (comportamento de query real é testado em T13, quando a tabela existe — "merge
forward" per tasks.md)
**Gate**: build

**Commit**: `feat(api): implement EloquentFeatureFlagRepository`

---

### T8: `DomainServiceProvider` com binding

**What**: Criar `api/app/Providers/DomainServiceProvider.php` bindando
`FeatureFlagRepository::class → EloquentFeatureFlagRepository::class`; registrar o provider em
`api/bootstrap/providers.php`.
**Where**: `api/app/Providers/DomainServiceProvider.php`, `api/bootstrap/providers.php`,
`api/tests/Unit/DomainServiceProviderTest.php`
**Depends on**: T7
**Reuses**: binding pattern de CLAUDE.md §6.2
**Requirement**: FNDBE-08, FNDBE-09, FNDBE-10

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [x] `app(FeatureFlagRepository::class)` resolve para uma instância de
      `EloquentFeatureFlagRepository` — testado sem precisar de tabela real
- [x] Gate check passa: `php artisan test --filter=DomainServiceProvider`
- [x] Test count: 1 teste passa

**Tests**: unit
**Gate**: quick

**Commit**: `feat(api): register DomainServiceProvider with FeatureFlagRepository binding`

---

### T9: Migrations `brands`, `users`

**What**: Criar migrations para `brands` (`id uuid pk`, `slug unique`, `display_name`) e `users`
(`id uuid pk`, `name`, `email unique`, `brand_id fk`).
**Where**: `api/database/migrations/*_create_brands_table.php`,
`api/database/migrations/*_create_users_table.php` (substituindo/ajustando a migration padrão de
`users` do Laravel)
**Depends on**: T3
**Reuses**: migration `users` padrão do Laravel como ponto de partida (T1)
**Requirement**: FNDBE-11

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [x] `php artisan migrate` cria as duas tabelas sem erro num banco de teste
- [x] `users.brand_id` é FK para `brands.id`

**Tests**: none
**Gate**: build

**Commit**: `feat(api): add brands and users migrations`

---

### T10: Migrations `patients`, `biomarkers` (com índices)

**What**: Criar migrations para `patients` (`id uuid pk`, `brand_id fk`, `name`, `birth_date`,
`goal`, `status`, `updated_at`, índice composto `(brand_id, name)`) e `biomarkers` (`id uuid pk`,
`patient_id fk`, `code`, `label`, `value numeric`, `unit`, `ref_min numeric`, `ref_max numeric`,
`measured_at`, índice composto `(patient_id, measured_at)`) — sem coluna de status derivado.
**Where**: `api/database/migrations/*_create_patients_table.php`,
`api/database/migrations/*_create_biomarkers_table.php`
**Depends on**: T9
**Reuses**: n/a
**Requirement**: FNDBE-11, FNDBE-12

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [x] `php artisan migrate` cria as tabelas com os dois índices compostos confirmados via
      `\DB::select` ou `php artisan db:show --table=patients` em teste manual
- [x] Nenhuma coluna `status` derivado existe em `biomarkers`

**Tests**: none
**Gate**: build

**Commit**: `feat(api): add patients and biomarkers migrations with composite indexes`

---

### T11: Migrations `ai_actions`, `feature_flags`

**What**: Criar migrations para `ai_actions` (`id uuid pk`, `patient_id fk`, `title`, `rationale`,
`priority`, `biomarkers jsonb`, `status default 'pending'`, `input_hash`, `created_at`) e
`feature_flags` (`id uuid pk`, `brand_id fk`, `key`, `enabled boolean`, índice único
`(brand_id, key)`).
**Where**: `api/database/migrations/*_create_ai_actions_table.php`,
`api/database/migrations/*_create_feature_flags_table.php`
**Depends on**: T10
**Reuses**: n/a
**Requirement**: FNDBE-11

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [x] `php artisan migrate` cria as duas tabelas restantes; as seis tabelas do modelo de dados
      existem no total
- [x] Índice único `(brand_id, key)` em `feature_flags` confirmado

**Tests**: none
**Gate**: build

**Commit**: `feat(api): add ai_actions and feature_flags migrations`

---

### T12: Factories `BrandFactory`, `PatientFactory`, `BiomarkerFactory`

**What**: Criar factories Eloquent para `Brand`, `Patient`, `Biomarker`, cada uma com valores
realistas via Faker (sem seed fixa ainda — a seed é responsabilidade do seeder em T13). Inclui pelo
menos um `state()` em `BiomarkerFactory` para gerar valor fora de `[ref_min, ref_max]`
(`outOfRange()`), usado pelo seeder para garantir casos que a Fase 3 precisa.
**Where**: `api/database/factories/BrandFactory.php`, `api/database/factories/PatientFactory.php`,
`api/database/factories/BiomarkerFactory.php`
**Depends on**: T11
**Reuses**: `Illuminate\Database\Eloquent\Factories\Factory` padrão do Laravel
**Requirement**: FNDBE-13, FNDBE-15

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [x] `Patient::factory()->make()` e `Biomarker::factory()->outOfRange()->make()` funcionam sem
      tocar o banco
- [x] `vendor/bin/phpstan analyse` limpo

**Tests**: none
**Gate**: build

**Commit**: `feat(api): add Brand, Patient, Biomarker factories`

---

### T13: Seeders determinísticos (`BrandSeeder`, `PatientSeeder`, `FeatureFlagSeeder`)

**What**: Criar `BrandSeeder` (semeia `nutri-care`, `vita-plus`, idempotente — não duplica se já
existem), `FeatureFlagSeeder` (semeia pelo menos uma flag por marca, incluindo `aiActionsEnabled`),
`PatientSeeder` (aceita um parâmetro de contagem, default 5000, semente fixa do Faker `42`,
distribui ~50/50 entre as duas marcas, gera 1+ biomarcador por paciente, garante fração não nula
usando `Biomarker::factory()->outOfRange()`); `DatabaseSeeder` chama os três em ordem. Este task
também escreve o teste de integração do `EloquentFeatureFlagRepository` (adiado de T7, "merge
forward" — agora a tabela existe).
**Where**: `api/database/seeders/{DatabaseSeeder,BrandSeeder,PatientSeeder,FeatureFlagSeeder}.php`,
`api/tests/Feature/PatientSeederTest.php`, `api/tests/Feature/FeatureFlagRepositoryTest.php`
**Depends on**: T12
**Reuses**: factories de T12
**Requirement**: FNDBE-13, FNDBE-14, FNDBE-15

**Tools**:

- MCP: NONE
- Skill: `laravel-specialist`

**Done when**:

- [x] `PatientSeederTest` roda `PatientSeeder` com contagem reduzida (ex. 20) em banco de teste
      (`RefreshDatabase`), confirma distribuição entre as duas marcas, confirma que rodar duas vezes
      seguidas a partir de banco limpo produz a mesma contagem final (determinismo), confirma que
      pelo menos um biomarcador está fora de `[ref_min, ref_max]`
- [x] `FeatureFlagRepositoryTest` semeia uma flag via `FeatureFlagSeeder`, chama
      `EloquentFeatureFlagRepository::findByKeyAndBrand()` e confirma que a entidade de domínio
      retornada bate com o valor semeado
- [x] Gate check passa: `php artisan test --filter=PatientSeeder` e
      `php artisan test --filter=FeatureFlagRepository`
- [x] Test count: 4 testes passam (distribuição, determinismo, fora de faixa, repository query)

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): add deterministic seeders with brand distribution`

---

### T14: `api/Dockerfile`

**What**: Criar `api/Dockerfile` baseado em `php:8.3-cli`, instalando extensões `pdo_pgsql`,
`bcmath`, `intl`, copiando o código e instalando Composer.
**Where**: `api/Dockerfile`
**Depends on**: T4
**Reuses**: n/a
**Requirement**: FNDBE-16 (suporte à história de Docker Compose)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `docker build -t tecsa-api api/` completa sem erro
- [x] `docker run --rm tecsa-api php -m` lista `pdo_pgsql`, `bcmath`, `intl`

**Tests**: none
**Gate**: build

**Commit**: `chore(api): add Dockerfile with required PHP extensions`

---

### T15: `api/docker/entrypoint.sh`

**What**: Script de entrypoint que: copia `.env.example` → `.env` se `.env` não existir; roda
`composer install` se `vendor/` não existir; roda `php artisan key:generate` se `APP_KEY` vazia;
espera o Postgres ficar acessível (a orquestração do healthcheck já fica a cargo do
`depends_on: condition: service_healthy` do compose, mas o script tolera pequena espera adicional);
roda `php artisan migrate --force`; roda `php artisan db:seed --force` só se `patients` estiver
vazia; por fim inicia `php artisan serve --host=0.0.0.0 --port=9000`.
**Where**: `api/docker/entrypoint.sh`
**Depends on**: T14
**Reuses**: n/a
**Requirement**: FNDBE-16, FNDBE-17, FNDBE-18, FNDBE-19, FNDBE-20, FNDENV-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Script é idempotente: rodar duas vezes seguidas não duplica seed nem falha em `migrate` já
      aplicada
- [x] Script nunca escreve um valor de configuração hardcoded — só lê de `.env`/variáveis já
      injetadas pelo compose

**Tests**: none
**Gate**: build

**Commit**: `chore(api): add docker entrypoint with conditional setup steps`

---

### T16: `docker-compose.yml` raiz

**What**: Preencher `docker-compose.yml` com os serviços `db` (Postgres 16, healthcheck,
porta `5433:5432`, variáveis via `env_file: api/.env`) e `api` (build de `api/Dockerfile`, porta
`9000:9000`, `env_file: api/.env`, `depends_on: db: condition: service_healthy`, entrypoint de T15).
**Where**: `docker-compose.yml`
**Depends on**: T15
**Reuses**: n/a
**Requirement**: FNDBE-16, FNDBE-17, FNDBE-18, FNDBE-19, FNDBE-20, FNDBE-21, FNDENV-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `docker compose config` valida sem erro
- [x] Nenhuma credencial de banco ou `APP_KEY` está escrita diretamente no `docker-compose.yml`
      (tudo via `env_file`)

**Tests**: none
**Gate**: build

**Commit**: `chore: add root docker-compose.yml wiring db and api services`

---

### T17: Verificação manual ponta a ponta do Docker Compose

**What**: Rodar `docker compose down -v && docker compose up` a partir de um estado limpo e
confirmar o critério de saída da fase para o backend.
**Where**: n/a (verificação, não gera código novo além de eventuais fixes descobertos)
**Depends on**: T16
**Reuses**: n/a
**Requirement**: FNDBE-16, FNDBE-17, FNDBE-18, FNDBE-19, FNDBE-20, FNDBE-21

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `curl -f http://localhost:9000/up` retorna 200
- [x] `docker compose exec api php artisan tinker --execute="echo App\Infrastructure\Persistence\Eloquent\Models\Patient::count();"`
      retorna ≥ 5000
- [x] Postgres acessível em `localhost:5433` a partir do host

**Tests**: none
**Gate**: build

**Commit**: `chore(api): fix docker compose end-to-end issues found during verification` (só se algum
fix for necessário; caso contrário esta task não gera commit próprio — é checkpoint de verificação)

---

### T18: Scaffold do projeto Expo em `mobile/`

**What**: Rodar `npx create-expo-app@latest mobile --template` com TypeScript e Expo Router,
confirmar `tsconfig.json` com `"strict": true`.
**Where**: `mobile/` (projeto inteiro gerado pelo Expo)
**Depends on**: None (independente do backend)
**Reuses**: n/a
**Requirement**: FNDMOB-05 (suporte)

**Tools**:

- MCP: NONE
- Skill: `react-native-expert`

**Done when**:

- [x] `npx expo --version` roda dentro de `mobile/`
- [x] `tsconfig.json` tem `"strict": true`
- [x] `npx tsc --noEmit` passa limpo no projeto recém-criado

**Tests**: none
**Gate**: build

**Commit**: `chore(mobile): scaffold expo router project with typescript strict`

---

### T19: `mobile/.env.example` + confirmação de `.gitignore`

**What**: Criar `mobile/.env.example` com `EXPO_PUBLIC_API_URL=` (placeholder apontando para
`http://SEU_IP_NA_REDE:9000` como comentário, não como valor default real) e qualquer outra
variável `EXPO_PUBLIC_*` necessária; confirmar que `.gitignore` do Expo já ignora `.env*.local` e
adicionar `mobile/.env` explicitamente se não estiver coberto.
**Where**: `mobile/.env.example`, `mobile/.gitignore`
**Depends on**: T18
**Reuses**: `.gitignore` gerado pelo Expo installer
**Requirement**: FNDENV-02, FNDENV-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `mobile/.env.example` versionado, com placeholder, sem valor real
- [x] `git check-ignore mobile/.env` retorna o caminho

**Tests**: none
**Gate**: build

**Commit**: `chore(mobile): document env vars in .env.example`

---

### T20: Estrutura `src/core/` e `src/brands/`

**What**: Criar a árvore `mobile/src/core/{api,features,ui,theme,offline,flags}/` e
`mobile/src/brands/` (vazia por enquanto, populada em T22-T24).
**Where**: `mobile/src/core/`, `mobile/src/brands/`
**Depends on**: T18
**Reuses**: n/a
**Requirement**: FNDMOB-05 (suporte estrutural)

**Tools**:

- MCP: NONE
- Skill: `react-native-expert`

**Done when**:

- [x] Todas as subpastas de `core/` existem
- [x] `tsconfig.json` já resolve o alias `@/` para `src/` (configurar se o template do Expo não
      trouxer isso por padrão)

**Tests**: none
**Gate**: build

**Commit**: `chore(mobile): add core/ and brands/ folder skeleton`

---

### T21: Tipo `Brand` em `core/theme/brand.types.ts`

**What**: Definir o tipo `Brand` completo conforme design.md (id, displayName, colors com as onze
chaves semânticas, typography, radii, spacing, assets, copy, defaults).
**Where**: `mobile/src/core/theme/brand.types.ts`
**Depends on**: T20
**Reuses**: n/a
**Requirement**: FNDMOB-05

**Tools**:

- MCP: NONE
- Skill: `react-native-expert`

**Done when**:

- [x] `npx tsc --noEmit` passa (tipo sozinho, sem implementação ainda, não quebra nada)
- [x] Tipo exportado contém as onze chaves de `colors` listadas em CLAUDE.md §5.2

**Tests**: none
**Gate**: build

**Commit**: `feat(mobile): define Brand contract type`

---

### T22: Marca `nutri-care` (tokens, assets, copy)

**What**: Implementar `mobile/src/brands/nutri-care/{theme.ts,copy.ts,assets.ts,index.ts}`
satisfazendo o tipo `Brand` — identidade clínica/sóbria definida no spec (fundo cinza-azulado claro,
acento teal profundo, raios pequenos, tipografia sans grotesca, copy direta).
**Where**: `mobile/src/brands/nutri-care/`
**Depends on**: T21
**Reuses**: tipo `Brand` de T21
**Requirement**: FNDMOB-05, FNDMOB-06

**Tools**:

- MCP: NONE
- Skill: `react-native-expert`

**Done when**:

- [x] Objeto exportado satisfaz `Brand` sem propriedade opcional faltando (`tsc --noEmit` confirma)
- [x] Assets placeholder (logo, splash icon) existem em `mobile/src/brands/nutri-care/assets/`

**Tests**: none
**Gate**: build

**Commit**: `feat(mobile): implement nutri-care brand`

---

### T23: Marca `vita-plus` (tokens, assets, copy)

**What**: Implementar `mobile/src/brands/vita-plus/{theme.ts,copy.ts,assets.ts,index.ts}`
satisfazendo o tipo `Brand` — identidade bem-estar/leve definida no spec (fundo areia claro, acento
coral, raios grandes/pill, tipografia sans humanista, copy calorosa).
**Where**: `mobile/src/brands/vita-plus/`
**Depends on**: T21
**Reuses**: tipo `Brand` de T21
**Requirement**: FNDMOB-05, FNDMOB-06

**Tools**:

- MCP: NONE
- Skill: `react-native-expert`

**Done when**:

- [x] Objeto exportado satisfaz `Brand` sem propriedade opcional faltando
- [x] Pelo menos `colors.accent`, `radii.md` e `typography.fontFamily.regular` diferem dos valores
      de `nutri-care` (checagem manual/diff nesta task)
- [x] Assets placeholder existem em `mobile/src/brands/vita-plus/assets/`

**Tests**: none
**Gate**: build

**Commit**: `feat(mobile): implement vita-plus brand`

---

### T24: Registry `brands/index.ts`

**What**: Criar `mobile/src/brands/index.ts`, único arquivo fora de `brands/**` autorizado a
importar `nutri-care/` e `vita-plus/` diretamente; exporta `resolveBrand(id: string): Brand` que
lança erro claro (`Marca desconhecida: ${id}`) se `id` não for `nutri-care` nem `vita-plus`.
**Where**: `mobile/src/brands/index.ts`
**Depends on**: T22, T23
**Reuses**: as duas marcas
**Requirement**: FNDMOB-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `resolveBrand('nutri-care')` e `resolveBrand('vita-plus')` retornam os objetos corretos
- [x] `resolveBrand('inexistente')` lança erro com a mensagem esperada

**Tests**: none
**Gate**: build

**Commit**: `feat(mobile): add brand registry with resolveBrand`

---

### T25: `BrandProvider` + `useTheme`

**What**: Criar `mobile/src/core/theme/BrandProvider.tsx` (Context Provider que recebe o `brandId`
resolvido em runtime — via `Constants.expoConfig.extra.brandId`, preenchido por `app.config.ts` na
T28 — e chama `resolveBrand`) e `mobile/src/core/theme/useTheme.ts` (hook que lê o Context).
**Where**: `mobile/src/core/theme/BrandProvider.tsx`, `mobile/src/core/theme/useTheme.ts`
**Depends on**: T24
**Reuses**: `resolveBrand` de T24
**Requirement**: FNDMOB-05

**Tools**:

- MCP: NONE
- Skill: `react-native-expert`

**Done when**:

- [x] `useTheme()` fora de um `BrandProvider` lança erro claro (não retorna `undefined` silencioso)
- [x] `npx tsc --noEmit` limpo

**Tests**: none
**Gate**: build

**Commit**: `feat(mobile): add BrandProvider and useTheme hook`

---

### T26: Regra de ESLint de fronteira de marca

**What**: Adicionar o override de `mobile/.eslintrc.js` de CLAUDE.md §11.1: em `src/core/**/*`,
`no-restricted-imports` bloqueia padrões `**/brands/*` e `@/brands/*` com a mensagem definida no
spec.
**Where**: `mobile/.eslintrc.js`
**Depends on**: T20
**Reuses**: template de CLAUDE.md §11.1
**Requirement**: FNDMOB-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `npm run lint` sobre um arquivo fixture temporário em `core/` que importa de `@/brands/x`
      reporta erro (não warning) com a mensagem esperada; removendo a fixture, lint passa limpo

**Tests**: none (a verificação da regra em si acontece via o teste do script de T27, que também
cobre o caso de import — ver "Done when" de T27)
**Gate**: build

**Commit**: `chore(mobile): add eslint brand boundary rule for core/`

---

### T27: Script `check-brand-boundary` + `pretest`

**What**: Criar `mobile/scripts/check-brand-boundary.sh` (grep por `nutri-care`/`vita-plus` dentro
de `src/core/`, falha se encontrar); registrar `"pretest": "npm run lint && bash
scripts/check-brand-boundary.sh"` em `package.json`; escrever teste que injeta uma fixture com o
nome de uma marca em comentário dentro de `core/` (cobrindo o edge case do spec: violação em
comentário também conta) e confirma exit code ≠0, depois remove e confirma exit code 0.
**Where**: `mobile/scripts/check-brand-boundary.sh`, `mobile/package.json`,
`mobile/scripts/__tests__/checkBrandBoundary.test.ts`
**Depends on**: T26
**Reuses**: template de CLAUDE.md §11.1
**Requirement**: FNDMOB-02, FNDMOB-03, FNDMOB-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Teste cobre: import de `brands/*` (pego pelo ESLint, verificado indiretamente rodando
      `npm run lint` dentro do teste via `child_process`), string de marca em comentário (pego pelo
      grep script), e o caso limpo (sem violação) passando os dois
- [x] `npm test` já executa o `pretest` (via script `"test": "jest"` com `pretest` hook nativo do
      npm, que roda automaticamente antes de `npm test`)
- [x] Gate check passa: `npm test -- checkBrandBoundary`
- [x] Test count: 3 testes passam

**Tests**: integration
**Gate**: quick

**Commit**: `test(mobile): add brand boundary guard-rail script and tests`

---

### T28: `app.config.ts` lendo `APP_BRAND` e `EXPO_PUBLIC_API_URL`

**What**: Implementar `mobile/app.config.ts`: lê `process.env.APP_BRAND` (default `'nutri-care'` se
ausente — literal de código, não `.env` obrigatório, per design.md), valida contra `resolveBrand`
(falha o build com mensagem clara se marca desconhecida), gera `name`, `slug`,
`bundleIdentifier`/`package`, `icon`, `splash` distintos por marca, injeta `extra.brandId`. Lê
`process.env.EXPO_PUBLIC_API_URL` e injeta em `extra` para o core/api consumir futuramente (Fase 2).
**Where**: `mobile/app.config.ts`
**Depends on**: T24
**Reuses**: `resolveBrand` de T24
**Requirement**: FNDMOB-10, FNDMOB-11, FNDENV-06

**Tools**:

- MCP: NONE
- Skill: `react-native-expert`

**Done when**:

- [x] `APP_BRAND=vita-plus npx expo config --json | jq .extra.brandId` retorna `"vita-plus"`
- [x] Sem `APP_BRAND` definido, retorna `"nutri-care"`
- [x] `APP_BRAND=inexistente npx expo config` falha com mensagem clara
- [x] Nenhuma URL fixa (`localhost:9000` como literal) aparece em `app.config.ts` fora de comentário
      de exemplo

**Tests**: none (comportamento coberto pelas checagens manuais de `expo config --json` acima,
executáveis via CLI; não há framework de teste de config do Expo estabelecido nesta fase)
**Gate**: build

**Commit**: `feat(mobile): read APP_BRAND and EXPO_PUBLIC_API_URL from env in app.config.ts`

---

### T29: Tela de prova `app/index.tsx`

**What**: Criar a rota `mobile/app/index.tsx` usando `useTheme()`: renderiza o logo da marca ativa,
`displayName`, um bloco com `colors.accent` e `radii.md`, e um texto de amostra com
`typography.fontFamily.regular` — nenhum literal de cor/raio/fonte fora de `transparent`.
**Where**: `mobile/app/index.tsx`
**Depends on**: T25
**Reuses**: `useTheme` de T25
**Requirement**: FNDMOB-12, FNDMOB-13

**Tools**:

- MCP: NONE
- Skill: `react-native-expert`

**Done when**:

- [x] Tela renderiza sem erro dentro de um `BrandProvider` de teste com `nutri-care` e com
      `vita-plus`
- [x] `grep -E "#[0-9a-fA-F]{3,6}" mobile/app/index.tsx` não retorna nada (nenhuma cor literal)

**Tests**: none (teste de renderização real fica em T30, que já cobre a tela com as duas marcas —
"merge forward")
**Gate**: build

**Commit**: `feat(mobile): add brand proof screen at app/index.tsx`

---

### T30: Teste — mesma tela, duas marcas, tokens diferem

**What**: Escrever `mobile/app/__tests__/index.test.tsx` usando React Native Testing Library:
renderiza `app/index.tsx` dentro de `BrandProvider` com `nutri-care`, captura o estilo aplicado
(cor de acento, raio); repete com `vita-plus`; assert que os valores capturados diferem. Este é o
teste mínimo de mobile explicitamente exigido por CLAUDE.md §10.
**Where**: `mobile/app/__tests__/index.test.tsx`
**Depends on**: T29
**Reuses**: `BrandProvider`, marcas de T22/T23
**Requirement**: FNDMOB-12, FNDMOB-13 (validação), FNDMOB-06 (validação de distinção)

**Tools**:

- MCP: NONE
- Skill: `react-native-expert`

**Done when**:

- [x] Teste passa comparando `colors.accent` e `radii.md` renderizados nas duas marcas, confirmando
      que diferem
- [x] Gate check passa: `npm test -- index.test`
- [x] Test count: 1 teste passa (com múltiplas assertions internas)

**Tests**: unit
**Gate**: quick

**Commit**: `test(mobile): verify brand token distinction on proof screen`

---

### T31: README raiz — seção "Como rodar"

**What**: Escrever a seção "Como rodar" do `README.md` raiz cobrindo: clonar, copiar
`api/.env.example` → `api/.env` e `mobile/.env.example` → `mobile/.env`, `docker compose up`
(backend), `APP_BRAND=<marca> npx expo start` (mobile), como rodar os testes e os scripts de
fronteira manualmente.
**Where**: `README.md`
**Depends on**: T17, T30
**Reuses**: comandos já validados nas tasks anteriores
**Requirement**: FNDDOC-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Seguir o README do zero (clone limpo) leva a `docker compose up` funcionando e
      `npx expo start` funcionando, sem passo não documentado

**Tests**: none
**Gate**: build

**Commit**: `docs: add "como rodar" section to root README`

---

### T32: ADR 0001 — servidor HTTP embutido

**What**: Escrever `docs/adr/0001-servidor-http-embutido.md` documentando a decisão de usar
`php artisan serve` em vez de nginx+php-fpm no Docker Compose da Fase 0, com contexto, decisão,
trade-off e consequências.
**Where**: `docs/adr/0001-servidor-http-embutido.md`
**Depends on**: T17
**Reuses**: skill `create-adr` para o formato padrão de ADR
**Requirement**: FNDDOC-02

**Tools**:

- MCP: NONE
- Skill: `create-adr`

**Done when**:

- [ ] ADR segue o formato padrão (Contexto/Decisão/Consequências) e cita explicitamente a
      alternativa rejeitada (nginx+php-fpm) e por quê

**Tests**: none
**Gate**: build

**Commit**: `docs: add ADR 0001 for embedded HTTP server choice`

---

## Phase Execution Map

Diagrama consolidado com **todas** as arestas de dependência do plano, incluindo as que cruzam fase
(as intra-fase já apareceram nos blocos de cada fase acima; aqui entram as que faltam, para que o
grafo completo fique explícito num único lugar):

```
T1 → T2
T1 → T3
T3 → T4
T3 → T5
T3 → T6
T6 → T7
T7 → T8
T3 → T9
T9 → T10
T10 → T11
T11 → T12
T12 → T13
T4 → T14
T14 → T15
T15 → T16
T16 → T17
T18 → T19
T18 → T20
T20 → T21
T21 → T22
T21 → T23
T22 → T24
T23 → T24
T24 → T25
T20 → T26
T26 → T27
T24 → T28
T25 → T29
T29 → T30
T17 → T31
T30 → T31
T17 → T32
```

Fases continuam rodando em ordem (1→2→...→8) e tasks dentro de cada fase em ordem sequencial. Fase 5
(skeleton mobile) não depende tecnicamente das Fases 1-4 (backend) e poderia rodar em paralelo, mas
este plano mantém fases sequenciais no modelo de execução do skill — é o *batching* (abaixo) que
paraleliza o trabalho, não concorrência intra-fase.

**Batching recommendation for Execute:** 32 tasks total → packs into ~5 batches of ~6-7 tasks each,
each batch made of whole consecutive phases: Batch 1 = Phase 1+2 (8 tasks), Batch 2 = Phase 3+4 (9
tasks — slightly over budget but a tight dependency chain, acceptable per the skill's sizing rule),
Batch 3 = Phase 5+6 (8 tasks), Batch 4 = Phase 7 (5 tasks), Batch 5 = Phase 8 (2 tasks, likely folded
into Batch 4). Offer sub-agent delegation at Execute time per the skill's offer-then-confirm rule —
not decided here. **Preferência registrada do usuário:** backend (Fases 1-4 / Batches 1-2) deve ser
concluído e verificado (T17) antes de iniciar qualquer task de mobile (Fases 5-8 / Batches 3-5) — sem
intercalar as duas stacks, mesmo que não haja dependência técnica forçando essa ordem; a estrutura de
fases acima já respeita isso.

**Recommended skills for Execute** (already available in this environment): `laravel-specialist` for
every backend task touching Eloquent/migrations/Artisan patterns (T1, T4, T7, T9-T13, T14... T17
verification); `react-native-expert` for every mobile task touching Expo Router, RNTL, or native
config (T18, T20-T23, T25, T28-T30); `create-adr` for T32. No task in this plan needs an MCP server.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1-T32 | cada task toca 1-4 arquivos coesos de um único conceito (uma migration, um script, uma marca, um provider) | ✅ Granular |

Nenhuma task cria mais de um componente/conceito não relacionado; tasks que tocam múltiplos arquivos
(ex. T13: 4 seeders + 2 testes) o fazem porque são a mesma unidade de trabalho coesa (seeders que se
chamam em cadeia + os testes que a validam), consistente com a regra "2-3 coisas relacionadas no
mesmo arquivo/conceito = OK se coeso".

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ------------------------ | ---------------- | ------ |
| T1 | None | (início Phase 1) | ✅ Match |
| T2 | T1 | T1→T2 | ✅ Match |
| T3 | T1 | T1→T3 (via T2→T3 na cadeia linear da fase) | ✅ Match — cadeia linear dentro da fase, T3 depende estruturalmente de T1 (pasta) e segue T2 em ordem |
| T4 | T3 | T3→T4 | ✅ Match |
| T5 | T3 | T4→T5 (ordem linear) — depende de T3 (pastas), roda depois de T4 na sequência da fase | ✅ Match |
| T6 | T3 | Phase1→Phase2, T3→T6 | ✅ Match |
| T7 | T6 | T6→T7 | ✅ Match |
| T8 | T7 | T7→T8 | ✅ Match |
| T9 | T3 | Phase2→Phase3, T3→T9 | ✅ Match |
| T10 | T9 | T9→T10 | ✅ Match |
| T11 | T10 | T10→T11 | ✅ Match |
| T12 | T11 | T11→T12 | ✅ Match |
| T13 | T12 | T12→T13 | ✅ Match |
| T14 | T4 | Phase3→Phase4, T4→T14 | ✅ Match |
| T15 | T14 | T14→T15 | ✅ Match |
| T16 | T15 | T15→T16 | ✅ Match |
| T17 | T16 | T16→T17 | ✅ Match |
| T18 | None | (início Phase 5) | ✅ Match |
| T19 | T18 | T18→T19 | ✅ Match |
| T20 | T18 | T19→T20 (ordem linear) — depende estruturalmente de T18 | ✅ Match |
| T21 | T20 | Phase5→Phase6, T20→T21 | ✅ Match |
| T22 | T21 | T21→T22 | ✅ Match |
| T23 | T21 | T22→T23 (ordem linear) — depende estruturalmente de T21 | ✅ Match |
| T24 | T22, T23 | T23→T24 | ✅ Match |
| T25 | T24 | T24→T25 | ✅ Match |
| T26 | T20 | Phase6→Phase7, T25→T26 (ordem linear) — depende estruturalmente de T20 | ✅ Match |
| T27 | T26 | T26→T27 | ✅ Match |
| T28 | T24 | T27→T28 (ordem linear) — depende estruturalmente de T24 | ✅ Match |
| T29 | T25 | T28→T29 (ordem linear) — depende estruturalmente de T25 | ✅ Match |
| T30 | T29 | T29→T30 | ✅ Match |
| T31 | T17, T30 | Phase7→Phase8, T30→T31 (T17 é de fase anterior, dependência cross-phase implícita já satisfeita pela ordem sequencial de fases) | ✅ Match |
| T32 | T17 | T31→T32 (ordem linear) — depende estruturalmente de T17, já satisfeito pela ordem de fases | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | ------------------------------ | ------------------ | ----------- | ------ |
| T1-T4 | scaffold / config (Pint, PHPStan) | none | none | ✅ OK |
| T5 | Guard-rail de camada backend | integration | integration | ✅ OK |
| T6 | Domain interface pura | none | none | ✅ OK |
| T7 | Infrastructure repository | integration (adiado p/ T13) | none, com nota explícita de merge forward | ✅ OK |
| T8 | DomainServiceProvider binding | unit | unit | ✅ OK |
| T9-T12 | migrations / factories | none | none | ✅ OK |
| T13 | Seeder + repository query real | integration | integration | ✅ OK |
| T14-T16 | Docker/infra | none (build gate) | none | ✅ OK |
| T17 | Verificação manual Docker | none | none | ✅ OK |
| T18-T20 | scaffold mobile / estrutura | none | none | ✅ OK |
| T21 | Brand type | none (compile-time) | none | ✅ OK |
| T22-T23 | Implementação de marca | none (compile-time) | none | ✅ OK |
| T24-T25 | Registry / Provider / hook | none | none | ✅ OK |
| T26 | Regra ESLint | none | none, com nota de cobertura indireta em T27 | ✅ OK |
| T27 | Guard-rail de marca (script) | integration | integration | ✅ OK |
| T28 | `app.config.ts` | none | none, com nota de verificação via CLI | ✅ OK |
| T29 | Tela de prova | none (coberta por T30) | none, com nota de merge forward para T30 | ✅ OK |
| T30 | Teste de distinção de tokens | unit | unit | ✅ OK |
| T31-T32 | Documentação | none | none | ✅ OK |

Nenhuma violação: toda camada com teste exigido pela matriz (T5, T8, T13, T27, T30) tem o teste na
própria task que a cria, nunca deferido sem justificativa explícita de "merge forward" (T7→T13,
T29→T30).

---

## Task Verification Standards

Cada task segue `Done when` + `Tests` + `Gate` definidos acima. Todo `Done when` é binário
(pass/fail), referencia o comando de gate da tabela `Gate Check Commands`, e inclui contagem de
teste esperada onde aplicável, para impedir deleção silenciosa de teste durante a implementação.
