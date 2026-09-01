# Fase 0 — Fundação Specification

## Problem Statement

O projeto tecsa-health ainda não existe em código: `api/` e `mobile/` estão vazios. Antes de
construir qualquer feature visível (carteira de pacientes, ações de IA), o projeto precisa de uma
base onde as duas regras invioláveis mais caras de violar tarde — marca vazando para dentro do
`core/` mobile, e regra de negócio vazando para o Controller/Eloquent no backend — sejam impossíveis
de violar sem que um script de fronteira acuse o erro. Construir os guard-rails depois do código de
feature significa descobrir a violação quando já custa caro corrigir.

## Goals

- [ ] `docker compose up`, a partir de um clone limpo, deixa a API Laravel respondendo na porta 9000
      sem nenhum passo manual
- [ ] `npx expo start` roda o app mobile com as duas marcas (`nutri-care`, `vita-plus`) selecionáveis
      via `APP_BRAND`, visualmente distintas de verdade
- [ ] Os dois scripts de fronteira (marca no core mobile; camadas no backend) existem, rodam no
      `pretest` de cada projeto, e falham propositalmente quando uma violação é injetada
- [ ] Seeder determinístico popula o banco com no mínimo 5.000 pacientes distribuídos entre as duas
      marcas, com biomarcadores em faixa realista
- [ ] Toda configuração dependente de ambiente (URL da API, porta, credenciais, chave de LLM, brand
      id de build) vem de `.env` próprio de cada projeto — nenhum valor hardcoded no código-fonte
      versionado

## Out of Scope

Explicitamente fora da Fase 0. Fica para as fases seguintes do `docs/plano-de-desenvolvimento.md`.

| Feature                                                          | Reason                                                              |
| ---------------------------------------------------------------- | -------------------------------------------------------------------|
| Endpoint `GET /feature-flags` e hook `useFlag`                   | Fase 1 — depende só da fundação, não faz parte dela                |
| Gate biométrico (`expo-local-authentication`)                    | Fase 1                                                              |
| Carteira de pacientes, tela de detalhe, TanStack Query, FlashList| Fase 2 — a Fase 0 só prova o contrato de marca, não consome API real|
| Endpoints de paciente/biomarcador (`GET /patients`, etc.)        | Fase 2                                                              |
| Qualquer coisa de IA (`AiAction`, `LlmClient`, endpoints de IA)  | Fase 3                                                              |
| `eas.json`, canais de OTA, publicação de update                  | Fase 4                                                              |
| Autenticação real (login, tokens por usuário)                    | Fora de escopo do projeto inteiro — CLAUDE.md §15                  |
| OpenAPI via `dedoc/scramble`                                     | Não há endpoint ainda para documentar; entra junto do primeiro endpoint real na Fase 1 |
| Testes de UI dos quatro estados (loading/erro/vazio/sucesso)     | Não há tela de dado real ainda; a tela de prova de marca da Fase 0 não busca dado de rede |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| ---------------------- | --------------- | --------- | ---------- |
| Servidor da API no Docker | `php artisan serve` em imagem `php:8.3-cli` | Escolhido pelo usuário; CLAUDE.md §8 aceita as duas opções e pede ADR — prioriza reprodutibilidade do ambiente sobre fidelidade de produção nesta fase | y |
| Tela de prova do contrato de marca no mobile | Incluir uma rota mínima (`app/index.tsx`) que usa `useTheme()` e renderiza logo, nome, cor de acento e amostra de tipografia da marca ativa | Escolhido pelo usuário — sem isso o `Brand` type fica sem verificação executável até a Fase 2 | y |
| Identidade visual das duas marcas | Definida neste spec/design pelo assistente (ver seção Identidade de Marca) | Escolhido pelo usuário — sem direção específica prévia | y |
| Gerenciador de pacotes mobile | npm | CLAUDE.md §2.6 fixa `npm test` como comando de teste nos dois projetos; não é uma decisão em aberto | n/a |
| Seed do Faker (backend) | Valor fixo `42` documentado no seeder | Precisa ser determinístico (CLAUDE.md §7); qualquer valor fixo satisfaz o requisito, este é arbitrário e documentado | y |
| Distribuição de pacientes entre marcas | ~50/50 (2.500 + 2.500, ajustável para bater exatamente 5.000) | CLAUDE.md só exige mínimo 5.000 distribuídos entre as duas marcas, sem proporção específica | y |
| Alcance do PHPStan nível 6 na Fase 0 | Roda sobre o projeto vazio (skeleton, migrations, seeders, Providers) — sem Domain/Application ainda além dos stubs mínimos necessários para o `DomainServiceProvider` compilar | CLAUDE.md §3 pede "passando num projeto vazio"; regras de negócio reais só chegam na Fase 2 | y |
| Estrutura mínima de `Domain/`/`Application/` na Fase 0 | Cria as pastas e um exemplo mínimo (interface + binding) só para provar que a inversão de dependência funciona; entidades reais de `Patient`/`AiAction` chegam nas Fases 2/3 | O plano de desenvolvimento pede `DomainServiceProvider` com bindings já na Fase 0, o que exige pelo menos uma interface real para bindar | y |
| Docs versionados nesta fase | `README.md` raiz recebe uma seção inicial (como rodar) e `docker-compose.yml` é preenchido; ADR da escolha do servidor HTTP (§8) é escrita nesta fase | Já é uma decisão tomada nesta fase (servidor da API) e CLAUDE.md §14.11 exige a ADR | y |
| Arquivo `.env` por projeto | `api/.env` e `mobile/.env` (gitignored) + `api/.env.example` e `mobile/.env.example` (versionados) — cada projeto com seu próprio arquivo, nunca um `.env` compartilhado na raiz | Pedido explícito do usuário: nenhuma configuração de ambiente hardcoded; cada projeto tem stack e variáveis diferentes (Laravel lê `DB_*`/`APP_KEY`, Expo lê `EXPO_PUBLIC_*`), então um único `.env` misturaria responsabilidades | y |

**Open questions: none** — todas resolvidas ou registradas acima.

---

## Identidade de Marca (Fase 0)

Registrado aqui porque vira requisito verificável (FNDMOB-05, FNDMOB-06) e alimenta o `design.md`.

**nutri-care** — clínica, sóbria, confiável. Fundo neutro frio (quase branco com leve cinza-azulado),
texto escuro de alto contraste, acento verde-azulado escuro (teal profundo, não pastel), raios de
borda pequenos (bordas quase retas, sensação de prontuário), tipografia sans grotesca de peso médio.
Copy direta e clínica ("Registrar acompanhamento", não "Vamos cuidar disso!").

**vita-plus** — bem-estar, leve, acolhedora. Fundo levemente quente (areia claro), acento coral/laranja
suave, raios de borda grandes (pill em botões), tipografia sans humanista com um peso mais leve no
corpo de texto. Copy mais calorosa, mas nunca infantil.

Isso evita os dois defaults genéricos citados no CLAUDE.md (creme+serifa e preto+verde ácido): nenhuma
marca usa serifa, e nenhuma usa fundo escuro. A distinção vem de densidade + raio + peso tipográfico +
tom de copy, não só de cor de acento — como o CLAUDE.md exige em §5.2.

---

## User Stories

### P1: Configuração 100% via ambiente, sem valor hardcoded ⭐ MVP

**User Story**: Como desenvolvedor de qualquer um dos dois projetos, quero que toda configuração que
varia por ambiente ou ambiente de execução — URL da API, porta, credenciais de banco, chave de LLM,
brand id de build — venha do `.env` daquele projeto, para que trocar de máquina, de marca ou de
ambiente nunca exija editar código-fonte versionado, e para que nenhum segredo chegue ao histórico
do git (CLAUDE.md §2.4).

**Why P1**: Regra transversal às duas outras fundações (Docker, seleção de marca) e à regra
inviolável de segredo do CLAUDE.md. Tratada como história própria — não só como detalhe dentro de
Docker/marca — precisamente para não passar despercebida numa revisão rápida do spec.

**Acceptance Criteria**:

1. The `api/` SHALL ter seu próprio `api/.env.example`, versionado, com todas as variáveis que a
   aplicação lê (incluindo `APP_KEY=`, `DB_*`, `ANTHROPIC_API_KEY=`) preenchidas com placeholder
   vazio ou não sensível — nunca com valor real.
2. The `mobile/` SHALL ter seu próprio `mobile/.env.example`, versionado, com toda variável lida via
   `process.env` em `app.config.ts` ou em runtime (ex.: `EXPO_PUBLIC_API_URL`), com placeholder.
3. The `.gitignore` da raiz SHALL ignorar `api/.env` e `mobile/.env` (e variantes `.env.local`),
   mantendo os respectivos `.env.example` versionados.
4. IF um valor de URL, porta, host, credencial ou identificador de marca aparece como literal
   string/number dentro de código-fonte de `api/app/**` ou `mobile/src/**` (fora de arquivo de
   configuração `.env*`, `app.config.ts` lendo `process.env`, ou teste) THEN isso SHALL ser
   considerado uma violação a ser corrigida antes do merge — verificado por revisão nas tasks que
   tocam `docker-compose.yml`, `app.config.ts` e o entrypoint do container `api`.
5. WHEN `docker-compose.yml` declara variáveis para o serviço `api` ou `db` THEN os valores SHALL
   vir de `env_file: api/.env` (com fallback documentado em `api/.env.example` para quem ainda não
   copiou o arquivo) — nenhuma credencial de banco ou `APP_KEY` escrita diretamente no
   `docker-compose.yml`.
6. WHEN `mobile/app.config.ts` lê `APP_BRAND` THEN SHALL ler de `process.env.APP_BRAND` (com default
   documentado em código, não em `.env` obrigatório — `APP_BRAND` é build-time, não secreto) e
   `EXPO_PUBLIC_API_URL` SHALL vir de `process.env.EXPO_PUBLIC_API_URL`, nunca de uma string fixa
   apontando para `localhost` dentro do código de `core/api`.

**Independent Test**: `grep -rE "postgres://|sk-ant-|localhost:9000" api/app/ mobile/src/` não
retorna nada; apagar `api/.env` e `mobile/.env` e copiá-los novamente a partir dos `.example`
reproduz o ambiente funcional sem editar nenhum arquivo versionado.

---

### P1: Guard-rail de fronteira de marca no mobile ⭐ MVP

**User Story**: Como desenvolvedor do core mobile, quero que uma tentativa de importar algo de
`brands/` dentro de `core/` (ou de citar o nome de uma marca em `core/`) quebre o lint/script de
verificação, para que a violação da regra de isolamento de marca (CLAUDE.md §2.1) seja pega antes do
merge, não em code review manual.

**Why P1**: É a regra inviolável mais cara de violar tarde — uma vez que features do core passam a
depender de marca, desfazer é um refactor grande. Sem o guard-rail mecânico, nada nesta fundação
prova que a regra vale.

**Acceptance Criteria**:

1. WHEN um arquivo dentro de `mobile/src/core/**` contém um `import` cujo caminho casa com
   `**/brands/*` ou `@/brands/*` THEN o ESLint SHALL reportar erro (não warning) na regra
   `no-restricted-imports` com a mensagem "core/ não pode conhecer marca. Use useTheme() ou
   useFlag()."
2. WHEN o script de grep de fronteira (`mobile/scripts/check-brand-boundary.*`) roda sobre
   `mobile/src/core/` contendo a string `nutri-care` ou `vita-plus` em qualquer arquivo THEN o
   script SHALL sair com código de saída diferente de zero e imprimir o arquivo e a linha do achado.
3. WHEN `mobile/src/core/` não contém nenhuma referência de marca e nenhum import de `brands/*`
   THEN tanto o ESLint quanto o script de grep SHALL sair com código de saída zero.
4. The `npm test` (ou `npm run pretest`, encadeado antes de `test`) SHALL executar o script de grep
   de fronteira como parte do pipeline, de forma que rodar `npm test` já cubra a verificação sem
   comando adicional.

**Independent Test**: injetar `import { x } from '@/brands/nutri-care/theme'` num arquivo de
`core/`, rodar `npm run lint` e `npm test` — ambos falham. Remover a linha injetada — ambos passam.

---

### P1: Contrato de marca (`Brand` type) e duas marcas implementadas ⭐ MVP

**User Story**: Como desenvolvedor, quero um tipo `Brand` no core e duas implementações completas
(`nutri-care`, `vita-plus`) com tokens, assets e copy, para que qualquer componente do core consuma
cor/raio/fonte/copy só via `useTheme()`, nunca por literal ou por `if` de marca.

**Why P1**: É o mecanismo central do produto (peso 32% do investimento de engenharia, CLAUDE.md
§1). Sem ele, não há nada para o guard-rail da história anterior proteger.

**Acceptance Criteria**:

1. The `core/theme/brand.types.ts` SHALL exportar um tipo `Brand` contendo, no mínimo, os campos
   `id`, `displayName`, `colors` (com as onze chaves semânticas listadas em CLAUDE.md §5.2:
   `background, surface, surfaceMuted, textPrimary, textSecondary, accent, accentContrast, success,
   warning, danger, border`), `typography`, `radii`, `spacing`, `assets` e `copy`.
2. The `mobile/src/brands/nutri-care/` e `mobile/src/brands/vita-plus/` SHALL cada uma exportar um
   objeto que satisfaz `Brand` sem nenhuma propriedade opcional ausente (checado por `tsc --noEmit`).
3. IF um campo novo é adicionado ao tipo `Brand` e uma marca não o preenche THEN `tsc --noEmit`
   SHALL falhar apontando a marca incompleta.
4. WHEN os valores de `colors.accent`, `radii.md` e `typography.fontFamily.regular` das duas marcas
   são comparados THEN pelo menos os três SHALL ser diferentes entre `nutri-care` e `vita-plus`
   (prova mínima de distinção visual real, não só cor de botão trocada).
5. The `mobile/src/brands/index.ts` SHALL ser o único arquivo do projeto (fora de `brands/**` em si)
   que importa diretamente de `nutri-care/` ou `vita-plus/`; todo o resto do app consome a marca via
   `useTheme()`.

**Independent Test**: `tsc --noEmit` limpo; remover um campo obrigatório de uma marca e ver o erro
de tipo apontar exatamente aquele arquivo.

---

### P1: Seleção de marca por build (`APP_BRAND`) e tela de prova ⭐ MVP

**User Story**: Como desenvolvedor, quero rodar `APP_BRAND=nutri-care npx expo start` ou
`APP_BRAND=vita-plus npx expo start` e ver uma tela mínima que renderiza logo, nome, cor de acento e
amostra de tipografia da marca escolhida, para confirmar visualmente — sem esperar a Fase 2 — que o
pipeline de marca funciona de ponta a ponta.

**Why P1**: Critério de saída explícito da Fase 0 (`docs/plano-de-desenvolvimento.md`): "`npx expo
start` roda com as duas marcas via `APP_BRAND`". Sem uma tela, não há como demonstrar isso além de
inspecionar código.

**Acceptance Criteria**:

1. WHEN a variável de ambiente `APP_BRAND` não está definida THEN `app.config.ts` SHALL usar
   `nutri-care` como padrão (CLAUDE.md §5.3).
2. WHEN `APP_BRAND=vita-plus` está definido no ambiente que roda `expo start` THEN o app SHALL
   carregar a marca `vita-plus` (nome do app, ícone/bundle id e o `BrandProvider` em runtime todos
   refletindo `vita-plus`).
3. The rota `app/index.tsx` SHALL renderizar, usando exclusivamente `useTheme()` (nenhum literal de
   cor/raio/fonte fora de `transparent`): o logo da marca ativa, `displayName`, um bloco de cor
   usando `colors.accent`, e um texto de amostra usando `typography.fontFamily.regular`.
4. WHILE o app roda com `nutri-care` versus `vita-plus`, capturas da mesma rota `app/index.tsx`
   SHALL diferir visualmente em pelo menos cor de acento, raio de borda do bloco de exemplo e fonte
   do texto de amostra.

**Independent Test**: rodar `expo start` duas vezes, uma por marca, tirar screenshot da tela inicial
em ambas, comparar lado a lado.

---

### P1: Guard-rail de fronteira de camada no backend ⭐ MVP

**User Story**: Como desenvolvedor do backend, quero que `Illuminate\` dentro de `app/Domain/`,
`DB::`/`Models\` dentro de `app/Application/` ou `app/Http/Controllers/`, ou `$request->all()` num
controller, quebrem um script determinístico, para que a regra de camadas (CLAUDE.md §6.1, §2.2)
seja pega mecanicamente.

**Why P1**: Equivalente backend da história de fronteira de marca — mesma urgência, mesmo motivo:
caro de desfazer se descoberto tarde.

**Acceptance Criteria**:

1. WHEN qualquer arquivo em `api/app/Domain/` contém a string `Illuminate\` THEN o script
   `api/scripts/check-layer-boundary.sh` SHALL sair com código diferente de zero, identificando o
   arquivo.
2. WHEN qualquer arquivo em `api/app/Application/` ou `api/app/Http/Controllers/` contém `DB::` ou
   `Models\` THEN o script SHALL sair com código diferente de zero, identificando o arquivo.
3. WHEN qualquer arquivo em `api/app/Http/Controllers/` contém `$request->all()` THEN o script
   SHALL sair com código diferente de zero, identificando o arquivo.
4. WHEN nenhuma das três condições acima ocorre THEN o script SHALL sair com código zero.
5. The `composer.json` SHALL registrar um script `pretest` que executa
   `check-layer-boundary.sh` antes de `php artisan test`, de forma equivalente ao `composer test`
   já cobrir a verificação.

**Independent Test**: injetar `use Illuminate\Support\Str;` num arquivo de `Domain/`, rodar
`composer test` — falha. Remover a linha — passa.

---

### P1: Skeleton Laravel com camadas e inversão de dependência ⭐ MVP

**User Story**: Como desenvolvedor backend, quero as pastas `Domain/ Application/ Infrastructure/
Http/` criadas com pelo menos um exemplo real de interface + implementação + binding via
`DomainServiceProvider`, para que a Fase 2 em diante já encontre o padrão pronto para seguir, em vez
de inventar a estrutura no meio de uma feature.

**Why P1**: Pré-requisito estrutural de tudo que vem depois; sem isso o guard-rail de camada da
história anterior não tem nada real para checar além de pastas vazias.

**Acceptance Criteria**:

1. The projeto SHALL conter as pastas `api/app/Domain/`, `api/app/Application/`,
   `api/app/Infrastructure/Persistence/Eloquent/Models/`, `api/app/Infrastructure/Llm/` e
   `api/app/Http/{Controllers,Requests,Resources,Middleware}` conforme CLAUDE.md §4.
2. The `api/app/Domain/FeatureFlag/` SHALL conter uma interface `FeatureFlagRepository` (sem
   sufixo `Interface`) usada como exemplo mínimo de contrato de domínio — a única entidade de
   domínio necessária na Fase 0, porque `feature_flags` é a tabela que a Fase 1 consome primeiro.
3. The `api/app/Infrastructure/Persistence/Eloquent/EloquentFeatureFlagRepository.php` SHALL
   implementar `FeatureFlagRepository` usando um Eloquent Model interno a
   `Infrastructure/Persistence/Eloquent/Models/`.
4. The `api/app/Providers/DomainServiceProvider.php` SHALL bindar
   `FeatureFlagRepository::class` para `EloquentFeatureFlagRepository::class` e SHALL estar
   registrado em `bootstrap/providers.php` (ou `config/app.php` conforme a versão do Laravel).
5. IF a pasta `Domain/` inteira é copiada para um projeto PHP sem Laravel instalado THEN ela SHALL
   compilar sem erro de classe/namespace ausente relacionado a `Illuminate\` (prova mental do
   CLAUDE.md §6.1 tornada verificável: nenhum `use Illuminate\` em `Domain/`).

**Independent Test**: `php artisan tinker` → `app(App\Domain\FeatureFlag\FeatureFlagRepository::class)`
resolve para uma instância de `EloquentFeatureFlagRepository` sem erro.

---

### P1: Migrations e seeder determinístico ⭐ MVP

**User Story**: Como desenvolvedor, quero as seis tabelas do modelo de dados criadas via migration
e um seeder que popula pelo menos 5.000 pacientes distribuídos entre as duas marcas com
biomarcadores em faixa realista (incluindo casos fora da faixa), para que a Fase 2 (lista
virtualizada, paginação cursor) tenha volume real para provar a arquitetura desde o primeiro dia.

**Why P1**: Critério de saída explícito da Fase 0 e pré-requisito de dado real (plano de
desenvolvimento, restrição 2).

**Acceptance Criteria**:

1. The migrations SHALL criar as tabelas `brands, users, patients, biomarkers, ai_actions,
   feature_flags` com as colunas listadas em CLAUDE.md §7, incluindo os índices
   `patients(brand_id, name)` e `biomarkers(patient_id, measured_at)`.
2. The coluna de status de biomarcador SHALL NOT existir como coluna própria em `biomarkers`
   (CLAUDE.md §7 — é derivada em `Domain/Patient/BiomarkerStatus`, que só chega na Fase 2; a Fase 0
   só garante que a migration não crie a coluna errada por antecipação).
3. WHEN `php artisan db:seed` roda com uma seed fixa do Faker THEN o banco SHALL conter no mínimo
   5.000 registros em `patients`, distribuídos entre as duas `brands` semeadas
   (`nutri-care`, `vita-plus`), cada paciente com pelo menos um `biomarker` associado.
4. WHEN o seeder roda duas vezes seguidas a partir de um banco limpo (`migrate:fresh --seed`) THEN
   a contagem final de `patients` SHALL ser idêntica nas duas execuções (determinismo).
5. The seeder SHALL gerar, para uma fração não nula dos pacientes, biomarcadores com `value` fora do
   intervalo `[ref_min, ref_max]`, para que a Fase 3 (IA) tenha casos reais para reagir.

**Independent Test**: `docker compose down -v && docker compose up`, depois `docker compose exec api
php artisan tinker --execute="echo App\Infrastructure\Persistence\Eloquent\Models\Patient::count();"`
retorna ≥ 5000.

---

### P1: Docker Compose de ponta a ponta ⭐ MVP

**User Story**: Como avaliador do projeto, quero rodar `docker compose up` a partir de um clone
limpo e ver a API respondendo na porta 9000, sem executar nenhum comando manual documentado como
"depois rode X", para que o critério mais visível de "reprodutibilidade do ambiente" do projeto
esteja satisfeito.

**Why P1**: Critério de aceite final explícito (CLAUDE.md §14.1) e o primeiro contato de qualquer
avaliador com o projeto.

**Acceptance Criteria**:

1. WHEN `docker compose up` roda num diretório onde `api/vendor` não existe THEN o entrypoint do
   serviço `api` SHALL rodar `composer install` antes de subir o servidor.
2. WHEN `APP_KEY` está vazia no `.env` do container THEN o entrypoint SHALL rodar
   `php artisan key:generate` antes de qualquer outro passo que dependa de criptografia.
3. WHEN o serviço `db` ainda não está saudável THEN o serviço `api` SHALL aguardar
   (`depends_on: condition: service_healthy`) antes de rodar migrations.
4. WHEN o banco está acessível e sem migrations aplicadas THEN o entrypoint SHALL rodar
   `php artisan migrate --force` e, se as tabelas estiverem vazias, `php artisan db:seed --force`.
5. WHEN todos os passos acima terminam sem erro THEN a API SHALL responder HTTP 200 em
   `GET http://localhost:9000/up` (health check padrão do Laravel 11) sem nenhuma intervenção
   manual do operador.
6. The Postgres SHALL estar acessível na porta 5433 do host, mapeada para a porta 5432 interna do
   container `db`.
7. The serviço `api` SHALL ter healthcheck próprio (não só o `depends_on` no `db`) que só reporta
   saudável quando a API está de fato servindo requisições em `/up` — o processo do container
   iniciar (`composer install`/migrations/seed ainda em andamento) não é o mesmo que a API estar
   pronta, e chamador nenhum (script, avaliador, CI futuro) deve inferir prontidão só pelo container
   ter "started".

**Independent Test**: em uma máquina limpa (ou `docker compose down -v` seguido de `docker compose
up -d --wait` — o `--wait` é obrigatório porque só o healthcheck do `api` garante que o comando não
devolve o prompt antes da API estar de fato servindo), `curl -f http://localhost:9000/up` retorna
200 sem nenhum comando adicional. (Achado ao vivo: sem `--wait`, um `curl` imediato após `docker
compose up -d` retorna `Connection reset by peer` porque o container "Started" não significa
`composer install`/migrations/seed já terminaram; ver AD-011 em `.specs/STATE.md`.)

---

### P2: Pint e PHPStan configurados e passando

**User Story**: Como desenvolvedor backend, quero `vendor/bin/pint --test` e `vendor/bin/phpstan
analyse` limpos desde o primeiro commit, para que nenhuma dívida de estilo/tipagem se acumule antes
da primeira feature real.

**Why P2**: Importante para o Definition of Done (CLAUDE.md §13), mas não bloqueia o critério de
saída funcional da fase — é qualidade contínua, não um guard-rail estrutural como as histórias P1.

**Acceptance Criteria**:

1. The `api/phpstan.neon` (ou `phpstan.neon.dist`) SHALL configurar nível 6 ou superior.
2. WHEN `vendor/bin/phpstan analyse` roda sobre o skeleton da Fase 0 THEN SHALL sair com código
   zero.
3. WHEN `vendor/bin/pint --test` roda sobre o skeleton da Fase 0 THEN SHALL sair com código zero.

**Independent Test**: `composer test` (ou script equivalente) encadeia Pint --test, PHPStan e
`php artisan test`, e todos passam num checkout limpo.

---

### P3: README raiz com seção "como rodar" e ADR do servidor HTTP

**User Story**: Como avaliador, quero encontrar no README raiz o passo a passo de como subir o
projeto do zero, para não depender de perguntar ao autor.

**Why P3**: Documentação completa (README com diagrama, todas as ADRs) é entregável da Fase 5; a
Fase 0 só precisa da fatia mínima que descreve o próprio setup que ela criou, para não deixar o
projeto sem nenhum ponto de entrada documentado enquanto as fases seguintes avançam.

**Acceptance Criteria**:

1. The `README.md` raiz SHALL conter uma seção "Como rodar" cobrindo `docker compose up` (backend)
   e `APP_BRAND=<marca> npx expo start` (mobile), incluindo o passo explícito de copiar
   `api/.env.example` → `api/.env` e `mobile/.env.example` → `mobile/.env` antes de subir.
2. The `docs/adr/0001-servidor-http-embutido.md` SHALL registrar a decisão de usar
   `php artisan serve` em vez de nginx+php-fpm, com o trade-off explicitado.

---

## Edge Cases

- IF `docker compose up` roda uma segunda vez com o banco já migrado e semeado THEN o entrypoint
  SHALL NOT re-rodar `db:seed` (idempotência do subir/descer do compose) — só migra o que faltar.
- IF `APP_BRAND` é definido com um valor que não existe em `mobile/src/brands/index.ts`
  (ex.: `APP_BRAND=marca-invalida`) THEN `app.config.ts` SHALL falhar o build com uma mensagem
  clara ("marca desconhecida: marca-invalida"), em vez de cair silenciosamente numa marca default.
- IF o script de fronteira de marca encontra a violação dentro de um comentário (não só import/
  string literal) THEN ainda SHALL contar como violação — CLAUDE.md §2.1 proíbe o nome da marca "em
  qualquer forma", incluindo comentário.
- IF o seeder roda contra um banco que já tem `brands` mas zero `patients` THEN SHALL popular só o
  que falta, sem duplicar `brands`.
- IF `api/.env` ou `mobile/.env` não existe quando o setup roda pela primeira vez THEN o processo de
  subida (entrypoint do Docker para a API; instruções do README para o mobile) SHALL copiar o
  `.env.example` correspondente automaticamente ou falhar com mensagem clara — nunca seguir adiante
  com valor hardcoded como substituto silencioso.
- IF alguém commita um valor que parece segredo (`ANTHROPIC_API_KEY` preenchida, string
  `postgres://user:pass@`) em qualquer arquivo versionado THEN isso é uma violação da regra
  inviolável do CLAUDE.md §2.4, coberta pela checklist final (seção 14 do CLAUDE.md), não por um
  script novo desta fase — a Fase 0 só garante que `.env.example` nunca carrega valor real.
- IF o healthcheck do serviço `db` (`docker-compose.yml`) roda `pg_isready` THEN SHALL passar
  `-U`/`-d` apontando para as credenciais reais da aplicação (`POSTGRES_USER`/`POSTGRES_DB`), nunca
  sem flags — sem elas, `pg_isready` tenta autenticar como o usuário do SO dentro do container
  (`root`), gerando `FATAL: role "root" does not exist` repetido no log do banco a cada intervalo de
  checagem, para sempre, mesmo quando o healthcheck "passa" (achado ao vivo depois da Fase 0
  encerrada nominalmente; ver AD-009 em `.specs/STATE.md`).

---

## Requirement Traceability

| Requirement ID | Story                                              | Phase | Status  |
| --------------- | --------------------------------------------------- | ------ | ------- |
| FNDENV-01       | P1: Configuração 100% via ambiente, sem hardcode    | Tasks  | Pending |
| FNDENV-02       | P1: Configuração 100% via ambiente, sem hardcode    | Tasks  | Pending |
| FNDENV-03       | P1: Configuração 100% via ambiente, sem hardcode    | Tasks  | Pending |
| FNDENV-04       | P1: Configuração 100% via ambiente, sem hardcode    | Tasks  | Pending |
| FNDENV-05       | P1: Configuração 100% via ambiente, sem hardcode    | Tasks  | Pending |
| FNDENV-06       | P1: Configuração 100% via ambiente, sem hardcode    | Tasks  | Pending |
| FNDMOB-01       | P1: Guard-rail de fronteira de marca                | Tasks  | Pending |
| FNDMOB-02       | P1: Guard-rail de fronteira de marca                | Tasks  | Pending |
| FNDMOB-03       | P1: Guard-rail de fronteira de marca                | Tasks  | Pending |
| FNDMOB-04       | P1: Guard-rail de fronteira de marca                | Tasks  | Pending |
| FNDMOB-05       | P1: Contrato de marca (`Brand` type)                | Tasks  | Pending |
| FNDMOB-06       | P1: Contrato de marca (`Brand` type)                | Tasks  | Pending |
| FNDMOB-07       | P1: Contrato de marca (`Brand` type)                | Tasks  | Pending |
| FNDMOB-08       | P1: Contrato de marca (`Brand` type)                | Tasks  | Pending |
| FNDMOB-09       | P1: Contrato de marca (`Brand` type)                | Tasks  | Pending |
| FNDMOB-10       | P1: Seleção de marca (`APP_BRAND`) e tela de prova  | Tasks  | Pending |
| FNDMOB-11       | P1: Seleção de marca (`APP_BRAND`) e tela de prova  | Tasks  | Pending |
| FNDMOB-12       | P1: Seleção de marca (`APP_BRAND`) e tela de prova  | Tasks  | Pending |
| FNDMOB-13       | P1: Seleção de marca (`APP_BRAND`) e tela de prova  | Tasks  | Pending |
| FNDBE-01        | P1: Guard-rail de fronteira de camada backend       | Tasks  | Pending |
| FNDBE-02        | P1: Guard-rail de fronteira de camada backend       | Tasks  | Pending |
| FNDBE-03        | P1: Guard-rail de fronteira de camada backend       | Tasks  | Pending |
| FNDBE-04        | P1: Guard-rail de fronteira de camada backend       | Tasks  | Pending |
| FNDBE-05        | P1: Guard-rail de fronteira de camada backend       | Tasks  | Pending |
| FNDBE-06        | P1: Skeleton Laravel com camadas e DI               | Tasks  | Pending |
| FNDBE-07        | P1: Skeleton Laravel com camadas e DI               | Tasks  | Pending |
| FNDBE-08        | P1: Skeleton Laravel com camadas e DI               | Tasks  | Pending |
| FNDBE-09        | P1: Skeleton Laravel com camadas e DI               | Tasks  | Pending |
| FNDBE-10        | P1: Skeleton Laravel com camadas e DI               | Tasks  | Pending |
| FNDBE-11        | P1: Migrations e seeder determinístico              | Tasks  | Pending |
| FNDBE-12        | P1: Migrations e seeder determinístico              | Tasks  | Pending |
| FNDBE-13        | P1: Migrations e seeder determinístico              | Tasks  | Pending |
| FNDBE-14        | P1: Migrations e seeder determinístico              | Tasks  | Pending |
| FNDBE-15        | P1: Migrations e seeder determinístico              | Tasks  | Pending |
| FNDBE-16        | P1: Docker Compose de ponta a ponta                 | Tasks  | Pending |
| FNDBE-17        | P1: Docker Compose de ponta a ponta                 | Tasks  | Pending |
| FNDBE-18        | P1: Docker Compose de ponta a ponta                 | Tasks  | Pending |
| FNDBE-19        | P1: Docker Compose de ponta a ponta                 | Tasks  | Pending |
| FNDBE-20        | P1: Docker Compose de ponta a ponta                 | Tasks  | Pending |
| FNDBE-21        | P1: Docker Compose de ponta a ponta                 | Tasks  | Pending |
| FNDBE-22        | P2: Pint e PHPStan configurados                     | Tasks  | Pending |
| FNDBE-23        | P2: Pint e PHPStan configurados                     | Tasks  | Pending |
| FNDBE-24        | P2: Pint e PHPStan configurados                     | Tasks  | Pending |
| FNDDOC-01       | P3: README e ADR do servidor HTTP                   | Tasks  | Pending |
| FNDDOC-02       | P3: README e ADR do servidor HTTP                   | Tasks  | Pending |

**ID format:** `[CATEGORY]-[NUMBER]` — `FNDENV` (configuração/ambiente), `FNDMOB` (mobile), `FNDBE`
(backend), `FNDDOC` (documentação).

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 43 total, 0 mapped to tasks yet, 43 unmapped ⚠️ (mapeamento acontece na fase Tasks)

---

## Success Criteria

- [ ] `api/.env.example` e `mobile/.env.example` existem, versionados, com todas as variáveis lidas
      pelo respectivo código; `api/.env` e `mobile/.env` estão no `.gitignore`
- [ ] `grep -rE "postgres://|sk-ant-|sk-proj-|localhost:9000" api/app/ mobile/src/` não retorna nada
- [ ] `docker compose down -v && docker compose up` a partir de um clone limpo deixa
      `curl -f http://localhost:9000/up` retornando 200 sem intervenção manual
- [ ] `App\...\Models\Patient::count()` ≥ 5000 após o seed, distribuído entre as duas marcas
- [ ] `APP_BRAND=nutri-care npx expo start` e `APP_BRAND=vita-plus npx expo start` mostram a rota
      `app/index.tsx` com cor de acento, raio e fonte visivelmente diferentes entre si
- [ ] Injetar uma violação de fronteira de marca (import de `brands/*` em `core/`) faz `npm test`
      falhar; removê-la faz `npm test` passar
- [ ] Injetar uma violação de fronteira de camada (`Illuminate\` em `Domain/`) faz `composer test`
      falhar; removê-la faz `composer test` passar
- [ ] `tsc --noEmit`, `vendor/bin/phpstan analyse`, `vendor/bin/pint --test` saem todos com código
      zero
