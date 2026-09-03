# ADR-0003: Monorepo com backend em camadas Domain/Application/Infrastructure/Http

## Status

Aceita

## Contexto

O desafio pede dois entregáveis fortemente acoplados — um app mobile e a API que ele consome — mais
uma superfície de avaliação que pesa arquitetura tanto quanto funcionalidade (`CLAUDE.md`, tabela de
pesos: 32% core mobile, 23% plataforma/release, 13% API/backend). Duas decisões estruturais
precisavam ser tomadas antes de escrever a primeira linha de código: como organizar os dois
projetos entre si, e como organizar as camadas dentro do backend Laravel.

Para a organização entre projetos, a alternativa a um monorepo (`api/` + `mobile/` na mesma raiz de
git) seria dois repositórios separados. Para as camadas do backend, a alternativa a
Domain/Application/Infrastructure seria o padrão Laravel "MVC fino" comum em CRUDs — Controller
chamando Eloquent Model diretamente, com regra de negócio espalhada entre Model (accessors/scopes) e
Controller.

## Decisão

**Monorepo.** `api/` e `mobile/` vivem na mesma raiz de git, com um `docker-compose.yml` único
subindo o backend e um único `README.md` de topo explicando os dois. A API não tem contrato
TypeScript compartilhado com o client (Laravel não fala TypeScript), então o contrato entre os dois
projetos é OpenAPI gerado por `dedoc/scramble` (`api/composer.json:10`) a partir dos próprios
`Resources`/`FormRequests`, servido em `/docs/api` — não um pacote de tipos compilado.

**Backend em camadas: `Domain` → `Application` → `Http` para leitura de dependência, com
`Infrastructure` implementando o que `Domain` declara como interface.**

- `app/Domain/{Patient,Biomarker,AiAction,Brand,FeatureFlag}/` — entidades, enums, objetos de valor e
  interfaces de repositório (`PatientRepository`, `AiActionRepository`, `LlmClient`, todas em
  `app/Domain/*/`). Zero `use Illuminate\...` nessas pastas — confirmado ao vivo:
  `grep -rq "Illuminate\\\\" app/Domain/` não retorna nada, e é o próprio gate de
  `api/scripts/check-layer-boundary.sh:9-10`.
- `app/Application/{Patient,AiAction,FeatureFlag}/*Service.php` — orquestração e regra de negócio,
  dependendo só das interfaces do `Domain` via injeção de construtor (`PatientService.php:34-38`
  recebe `BrandRepository`, `PatientRepository`, `BiomarkerRepository`, todas interfaces). Nenhum
  `Model::`/`DB::` aparece aqui — segundo gate do mesmo script (`check-layer-boundary.sh:12-13`).
- `app/Infrastructure/Persistence/Eloquent/` — onde o Eloquent de fato vive.
  `EloquentPatientRepository implements PatientRepository` (`EloquentPatientRepository.php:16`) usa
  `PatientModel::query()` internamente mas **devolve entidade de domínio** (`Patient`, `PatientPage`),
  nunca o Model. `app/Infrastructure/Llm/{AnthropicClient,GeminiClient}.php` implementam
  `LlmClient` (ver ADR-0002).
- `app/Providers/DomainServiceProvider.php` — único lugar que liga interface a implementação
  (`bind(PatientRepository::class, EloquentPatientRepository::class)` e equivalentes).
- `app/Http/Controllers/Api/V1/` — só recebe `FormRequest`, chama um método de `Service`, devolve
  `Resource`. Erro nunca é montado ali: `app/Exceptions/Handler.php:24` centraliza a tradução de
  exceção de domínio (`PatientNotFound`, `AiDisabled`, etc.) para o envelope JSON.

## Por que não repositórios separados

Um repositório por projeto exigiria versionar e publicar um contrato de API por fora (pacote OpenAPI
ou SDK gerado), com um passo de release a mais toda vez que o contrato mudasse — overhead real sem
benefício num projeto de avaliação de escopo fechado, com um único desenvolvedor e sem múltiplas
equipes consumindo a API de fora. Monorepo também deixa `docker compose up` (`CLAUDE.md` §8) trivial:
um `docker-compose.yml`, sem submódulo git nem sincronização manual de duas árvores.

## Por que não MVC fino direto no Eloquent

Regra de negócio em accessor de Model ou em `if` de Controller funciona para um CRUD pequeno, mas o
projeto tem duas peças de lógica que precisam ser testadas isoladas de HTTP e de banco: o cálculo de
status de biomarcador (`BiomarkerStatus::from()`, `CLAUDE.md` §7) e a decisão de aceitar/rejeitar
resposta de LLM (`AiActionService`). Testar essas regras via Model ou Controller obriga a suíte a
subir banco e simular request HTTP para provar uma função pura — lento e frágil. Com `Domain` isolado
de `Illuminate\`, `tests/Unit/PatientServiceTest.php` mocka `PatientRepository` (a interface) e roda
sem `RefreshDatabase`, sem banco algum.

## Consequências

- Todo endpoint de escrita passa por `FormRequest::validated()`, nunca `$request->all()` — reforçado
  pelo terceiro gate de `check-layer-boundary.sh` e citado em `CLAUDE.md` §11.2.
- O Repository devolvendo entidade em vez de Model é a regra mais fácil de violar por engano (um
  `return $model;` em vez de `return $model->toDomain();` compila sem erro de tipo se a assinatura da
  interface não for estrita) — o teste mental de "copiar `Domain/` para um projeto sem Laravel e ver
  se compila" é o que pega isso, não o PHPStan sozinho.
- OpenAPI via Scramble como contrato, em vez de tipos compartilhados, é um trade-off consciente: uma
  mudança de schema no backend só é pega em runtime pelo `.parse()` do zod no mobile, não em tempo de
  compilação — documentado também no `CLAUDE.md` §3 como mitigação aceita, não ignorada.
- Um terceiro contexto de domínio grande (por exemplo, faturamento) provavelmente justificaria
  separar o monorepo num momento futuro — não é o caso hoje, com dois projetos e um único mantenedor.
