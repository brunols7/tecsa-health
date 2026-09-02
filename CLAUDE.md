# CLAUDE.md — Constituição do Projeto

**Fonte de verdade suprema: `docs/requisitos-do-produto.md`** (o escopo acordado do produto). Este
arquivo (`CLAUDE.md`) é a *implementação* desses requisitos — arquitetura, stack e convenções
escolhidas para atendê-los. Onde `CLAUDE.md` exigir algo que `docs/requisitos-do-produto.md` não
pede, direta ou indiretamente, essa exigência é opcional (boa prática, não bloqueio de entrega). Em
caso de conflito real entre os dois, `docs/requisitos-do-produto.md` vence. Isso vale tanto para
humanos quanto para agentes de IA trabalhando no repositório — antes de tratar algo abaixo como
inegociável, confira se está mesmo ancorado nos requisitos ou se é só rigor adicionado por cima.

**Regra zero:** na dúvida entre "mais bonito" e "mais aderente às regras abaixo", vence a regra —
mas a regra por sua vez vence, ou perde, para `docs/requisitos-do-produto.md`. Este projeto é
guiado por regra, não por gosto, e a regra é guiada pelo que foi acordado.

---

## 1. O que é o projeto

App core único e white-label servindo duas marcas do mesmo grupo, a partir de uma base compartilhada. Sobre esse core, uma fatia vertical do "app do nutricionista":

1. Carteira de pacientes (lista grande, busca, offline)
2. Detalhe do paciente com biomarcadores e faixas de referência
3. Ações de acompanhamento geradas por LLM, com aceite/descarte humano

Prioridade de investimento de engenharia, para calibrar onde investir tempo:

| Área | Peso |
|---|---|
| App core multimarca e arquitetura mobile | 32% |
| Plataforma e release (flag, OTA, nativo, offline) | 23% |
| Documentação e defesa das decisões | 14% |
| API e camadas do backend | 13% |
| IA e pensamento de produto | 10% |
| Testes | 8% |

---

## 2. Regras invioláveis

Violar qualquer uma destas é bug crítico de arquitetura e bloqueia o merge. Não existe exceção, não existe "só nesse caso", não existe TODO para depois.

### 2.1 Nenhuma referência a marca dentro do core

Nenhum arquivo em `mobile/src/core/**` pode:

- importar de `mobile/src/brands/**`
- conter o nome de uma marca em qualquer forma (string, identificador, comentário, nome de arquivo)
- ramificar comportamento por marca

```ts
// PROIBIDO
import { nutriCareTheme } from '@/brands/nutri-care/theme';
const color = brand === 'vitaPlus' ? '#0F766E' : '#B45309';
if (brandId === 'nutri-care') showPremiumBanner();

// CORRETO
const { colors } = useTheme();
const color = colors.accent;
if (flags.premiumBanner) showPremiumBanner();
```

Diferença entre marcas se expressa por **tokens**, **assets**, **copy** e **flags**. Nunca por `if`.

Isto é garantido mecanicamente. Ver seção 11.1.

### 2.2 Nenhuma regra de negócio no Controller

Controller faz exatamente quatro coisas: receber a requisição, validar via FormRequest, chamar um
método de Service, devolver Resource com o status correto. Nada mais.

```php
// PROIBIDO
public function show(string $id): JsonResponse
{
    $patient = Patient::with('biomarkers')->find($id);       // Eloquent no controller
    if (!$patient) {
        return response()->json(['error' => 'not found'], 404);
    }
    $risk = $patient->hba1c > 6.5 ? 'high' : 'normal';       // regra de negócio
    return response()->json([...$patient->toArray(), 'risk' => $risk]);
}

// CORRETO
public function show(string $id): PatientDetailResource
{
    return new PatientDetailResource(
        $this->patients->getDetail($id)
    );
}
```

Se um controller tem `if`, cálculo, `map` com lógica, acesso a Eloquent, query, ou montagem de
objeto de domínio, está errado. O `404` sai de uma exceção de domínio lançada no Service e
traduzida pelo handler global, não de um `if` no controller.

### 2.3 Tipagem estrita nos dois lados

**Mobile.** `strict: true` no `tsconfig.json`. Proibido:

- `any` explícito (use `unknown` e refine)
- `@ts-ignore` e `@ts-expect-error`
- `as` para silenciar erro de tipo (casts só para narrowing legítimo após validação)
- arquivos `.js` de código-fonte

`tsc --noEmit` deve passar limpo. Sem exceções em `eslint-disable` para as regras de tipo.

**Backend.** `declare(strict_types=1);` no topo de todo arquivo PHP. Type hint obrigatório em todo
parâmetro, retorno e propriedade, incluindo retorno `void`. PHPStan nível 6 ou superior passando.
Proibido: `mixed` sem necessidade real, array associativo solto atravessando camada (use DTO ou
objeto de valor), e `@phpstan-ignore`.

### 2.4 Nenhum segredo no repositório

- Chave de LLM, senha de banco e qualquer credencial vivem só em `.env`, que está no `.gitignore`
- `.env.example` é versionado com placeholders sem valor real
- Proibido chave de LLM chegar ao app mobile. O app **nunca** fala com a API do provedor
  diretamente. Toda chamada de LLM sai do backend.
- Antes de entregar, rodar a verificação da seção 14

Se uma chave já foi commitada, não basta remover no commit seguinte. Revogue a chave, gere outra,
e reescreva o histórico.

### 2.5 Listas grandes sempre virtualizadas

Nenhum `ScrollView` com `.map()` sobre coleção de tamanho não limitado. Nenhum `FlatList` na
carteira de pacientes. A lista de pacientes usa `FlashList`, com `estimatedItemSize` definido e
`keyExtractor` estável. O seed do banco tem no mínimo 5.000 pacientes para que isso seja
demonstrável.

### 2.6 Testes existem e rodam

`npm test` passa nos dois projetos. Não é opcional. Cobertura mínima na seção 10.

---

## 3. Stack fixa

Nada fora desta lista entra no projeto sem uma ADR justificando.

### Mobile

| Papel | Escolha | Não use |
|---|---|---|
| Runtime | Expo SDK 51+, TypeScript | React Native CLI puro |
| Navegação | Expo Router | React Navigation configurado à mão |
| Estado de servidor | TanStack Query v5 | Redux Toolkit Query, SWR, fetch em `useEffect` |
| Estado de cliente | Zustand | Redux, Context como store global |
| Persistência | MMKV via `persistQueryClient` | Realm, WatermelonDB, SQLite |
| Lista | `@shopify/flash-list` | FlatList, SectionList, ScrollView |
| Validação/contratos | zod | yup, io-ts, tipos escritos à mão |
| Formulários | react-hook-form | estado manual campo a campo |
| OTA | `expo-updates` + EAS Update | CodePush (App Center foi descontinuado) |
| Biometria | `expo-local-authentication` | — |
| Rede | `@react-native-community/netinfo` | — |
| Ícones | `lucide-react-native` | emoji como ícone, glifo Unicode solto em `Text`, outra lib de ícone (Feather, Ionicons, `@expo/vector-icons`, SVG customizado por componente) |
| Testes | Jest + React Native Testing Library | Enzyme, testes de snapshot como única cobertura |

Proibido: qualquer biblioteca de UI pronta com tema próprio (NativeBase, React Native Paper,
Tamagui, gluestack). Elas trazem um sistema de tema concorrente e enfraquecem exatamente a parte
mais estratégica do produto: o design system multimarca é seu.

### Backend

| Papel | Escolha | Não use |
|---|---|---|
| Linguagem | PHP 8.2+, `strict_types` | PHP 7.x |
| Framework | Laravel 11 (10 é o mínimo aceito) | Lumen, Symfony, Slim |
| ORM | Eloquent, confinado ao Repository | Query Builder espalhado, SQL cru no Service |
| Banco | PostgreSQL 16 | SQLite, Mongo |
| Validação | FormRequest, um por endpoint de escrita | `$request->validate()` dentro do controller |
| Serialização | API Resources | `->toArray()` do model devolvido direto |
| LLM | `Http::` do Laravel dentro de um adapter próprio | SDK chamado de dentro do Service |
| Testes | Pest (PHPUnit também serve) | — |
| Análise estática | PHPStan/Larastan nível 6+ | — |
| Estilo | Laravel Pint | — |
| Infra | Docker Compose | — |

Proibido no backend: pacote de "geração de CRUD" automático, `Repository` que só repassa
`Model::all()` sem contrato, e Action classes misturadas com Services sem critério. Escolha um
padrão e mantenha.

**Contrato entre API e app.** Como o backend não é mais TypeScript, o contrato deixa de ser
compartilhado por código. Substitua por: os schemas zod do mobile são a fonte de verdade do
cliente, e a API expõe um OpenAPI (via `dedoc/scramble`, que lê os Resources e FormRequests
automaticamente) servido em `/docs/api`. Divergência entre os dois é pega pelo `.parse()` do zod em
runtime, que falha alto em vez de propagar dado errado. Registre isso como ADR: é a mitigação
consciente de um trade-off, e vale ponto na defesa.

### Versões e portas

- Backend escuta na **porta 9000**. Exigência do enunciado, não negocie.
- Postgres na 5432 interna, exposta em 5433 no host para evitar conflito.
- `docker compose up` sobe backend e banco, roda migrations e seed, e deixa a API respondendo.
  Nenhum passo manual entre o comando e a API funcionando.

---

## 4. Estrutura de pastas canônica

```
tecsa-health/
├── CLAUDE.md                    ← este arquivo
├── README.md                    ← visão geral, decisões, relatório de IA
├── docker-compose.yml
├── .env.example
├── .claude/skills/              ← skills do projeto, versionadas
├── docs/
│   ├── adr/                     ← 0001-....md, 0002-....md
│   └── video-script.md
│
├── api/
│   ├── README.md
│   ├── app/
│   │   ├── Domain/                      ← coração. Não conhece Laravel
│   │   │   ├── Patient/
│   │   │   │   ├── Patient.php          ← entidade
│   │   │   │   ├── BiomarkerStatus.php  ← enum + regra de faixa
│   │   │   │   └── PatientRepository.php    ← INTERFACE
│   │   │   ├── AiAction/
│   │   │   │   ├── AiSuggestion.php
│   │   │   │   └── LlmClient.php            ← INTERFACE
│   │   │   └── FeatureFlag/
│   │   ├── Application/                 ← Services, casos de uso
│   │   │   ├── Patient/PatientService.php
│   │   │   ├── AiAction/GenerateAiActionsService.php
│   │   │   └── FeatureFlag/FeatureFlagService.php
│   │   ├── Infrastructure/              ← implementações
│   │   │   ├── Persistence/Eloquent/
│   │   │   │   ├── Models/              ← Eloquent vive SÓ aqui
│   │   │   │   └── EloquentPatientRepository.php
│   │   │   └── Llm/
│   │   │       ├── AnthropicClient.php
│   │   │       └── FakeLlmClient.php
│   │   ├── Http/
│   │   │   ├── Controllers/Api/V1/
│   │   │   ├── Requests/                ← FormRequests
│   │   │   ├── Resources/               ← API Resources
│   │   │   └── Middleware/
│   │   ├── Exceptions/Handler.php       ← envelope de erro global
│   │   └── Providers/
│   │       └── DomainServiceProvider.php    ← bindings interface → implementação
│   ├── database/
│   │   ├── migrations/
│   │   ├── factories/
│   │   └── seeders/
│   ├── routes/api.php
│   └── tests/
│       ├── Unit/
│       └── Feature/
│
└── mobile/
    ├── README.md
    ├── app.config.ts            ← lê APP_BRAND
    ├── eas.json                 ← perfis e canais por marca
    ├── app/                     ← rotas do expo-router
    └── src/
        ├── core/                ← ZERO conhecimento de marca
        │   ├── api/
        │   ├── features/
        │   ├── ui/
        │   ├── theme/
        │   ├── offline/
        │   └── flags/
        └── brands/
            ├── index.ts         ← registry
            ├── nutri-care/
            └── vita-plus/
```

---

## 5. Arquitetura mobile

### 5.1 Direção de dependência

```
app/ (rotas)  →  core/features  →  core/api  →  core/http
                       ↓
                   core/ui  →  core/theme
                                    ↑
                              brands/*  (injetado só na raiz)
```

Regras:

- A seta nunca aponta para trás. `core/ui` não importa `core/features`. `core/api` não importa
  componente nenhum.
- `brands/*` é importado em **um único lugar**: o arquivo raiz que monta o `BrandProvider`.
  Nenhum outro import de `brands` existe no projeto.
- `core/features/patients` não importa de `core/features/outra-coisa`. Se precisarem compartilhar,
  o compartilhado sobe para `core/`.

### 5.2 O contrato de marca

`core/theme/brand.types.ts` define o que uma marca é. Este tipo é do core; as marcas o implementam.

```ts
export type Brand = {
  id: string;
  displayName: string;
  colors: {
    background: string;
    surface: string;
    surfaceMuted: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
    accentContrast: string;
    success: string;
    warning: string;
    danger: string;
    border: string;
  };
  typography: {
    fontFamily: { regular: string; medium: string; bold: string };
    scale: { xs: number; sm: number; md: number; lg: number; xl: number; display: number };
  };
  radii: { sm: number; md: number; lg: number; pill: number };
  spacing: (n: number) => number;
  assets: { logo: ImageSourcePropType; splashIcon: ImageSourcePropType };
  copy: { patientsTitle: string; emptyPatients: string; aiDisclaimer: string };
  defaults: FeatureFlags;
};
```

Regras do contrato:

- **Tokens são semânticos, nunca literais.** `colors.accent`, não `colors.teal`. `colors.danger`,
  não `colors.red`. Se o nome do token descreve a cor em vez do papel, está errado.
- Nenhum componente do core declara cor, raio ou tamanho de fonte literal. Tudo vem de `useTheme()`.
  Único literal permitido: `transparent`.
- Adicionar um token novo é adicionar ao tipo `Brand`, o que obriga **todas** as marcas a
  preencherem. É proposital: o compilador impede que uma marca fique quebrada.
- As duas marcas precisam ser visualmente distintas de verdade, não a mesma tela com o botão de
  outra cor. Diferencie densidade, raio, peso tipográfico e tom de copy. Uma marca clínica e sóbria
  contra uma marca de bem-estar mais leve, por exemplo. Evite os defaults genéricos: fundo creme
  com serifa de alto contraste e acento terracota, ou preto quase puro com um verde ácido.

### 5.3 Seleção de marca

Build-time via `app.config.ts`:

```ts
const brand = process.env.APP_BRAND ?? 'nutri-care';
// gera name, slug, bundleIdentifier, package, icon, splash e extra.brandId distintos
```

Em `eas.json`, um perfil de build por marca, cada um com seu `channel` de OTA. Dois binários, um
core. Em modo dev, um seletor escondido pode trocar a marca em runtime para facilitar a demo. Esse
seletor vive fora de `core/`, é condicionado a `__DEV__` e nunca chega ao build de produção.

### 5.4 Camada de API tipada

Fluxo obrigatório para todo endpoint:

```
schema zod  →  tipo inferido  →  função de fetch  →  parse na resposta  →  hook de Query
```

```ts
// core/api/schemas/patient.ts
export const patientSchema = z.object({ /* ... */ });
export type Patient = z.infer<typeof patientSchema>;

// core/api/patients.ts
export async function fetchPatients(params: ListParams): Promise<Paginated<Patient>> {
  const raw = await http.get('/patients', params);
  return paginatedSchema(patientSchema).parse(raw);   // parse obrigatório
}
```

Regras:

- Tipo nunca é escrito à mão. É sempre `z.infer` do schema.
- Toda resposta passa por `.parse()` ou `.safeParse()`. Dado da rede é `unknown` até ser validado.
- Componente nunca chama `fetch`. Componente chama hook, hook chama função de api, função de api
  chama o cliente http.
- Erro de rede vira um tipo de erro de domínio (`ApiError` com `status` e `code`), não um `Error`
  genérico com string.

### 5.5 Estados de UI

Toda tela que carrega dado trata **quatro** estados. Não três.

| Estado | Exigência |
|---|---|
| Carregando | Skeleton com a forma do conteúdo real. Proibido spinner centralizado como padrão |
| Erro | Mensagem que diz o que falhou e o que fazer, mais botão de tentar de novo. Sem "Ops!" |
| Vazio | Convite à ação, com a copy vinda da marca. Distinto do estado de erro |
| Sucesso | O conteúdo |

Estado vazio e estado de erro **não** compartilham componente. São coisas diferentes para o
usuário.

### 5.6 Offline e update otimista

- A carteira de pacientes é persistida via `persistQueryClient` e fica legível sem rede.
- `onlineManager` é ligado ao NetInfo. Banner de offline visível quando desconectado.
- Mutations de escrita usam `onMutate` para aplicar otimista, `onError` para reverter com o
  snapshot anterior, `onSettled` para invalidar.
- Reverter é obrigatório. Uma mutation otimista sem rollback é um bug, não uma feature.
- Ação de IA **não** é otimista: ela depende de resposta do servidor e de custo. Otimista se aplica
  a edições locais como marcar acompanhamento, aceitar ou descartar uma ação sugerida.

### 5.7 Feature flags

- Fonte: `GET /api/v1/feature-flags`, com escopo por marca.
- Enquanto não carrega, valem os `defaults` da marca. O app nunca fica travado esperando flag.
- O último valor conhecido é persistido.
- `aiActionsEnabled` é o kill switch. Quando falso, o app esconde toda a superfície de IA e o
  backend responde 503 no endpoint de IA. **Os dois lados.** Kill switch só no cliente não é kill
  switch.
- Proibido `if (flag)` espalhado. O consumo passa por um hook `useFlag('aiActionsEnabled')`.

---

## 6. Arquitetura backend

### 6.1 As camadas e o que cada uma pode

```
Http\Controllers  →  Application\Services  →  Domain\...\Repository (interface)
                            ↓                          ↑
                  Domain\...\LlmClient          Infrastructure\Persistence\Eloquent
                     (interface)                        ↓
                            ↑                        Postgres
              Infrastructure\Llm\AnthropicClient
```

| Camada | Pode | Não pode |
|---|---|---|
| Controller | FormRequest, chamar Service, devolver Resource e status | Eloquent, query, regra, cálculo, `if` de negócio |
| Service | Regra de negócio, orquestração, chamar interfaces do Domain | `Model::`, `DB::`, `Request`, `response()` |
| Domain | Entidades, enums, objetos de valor, interfaces, regra pura | Laravel, Eloquent, HTTP, facades |
| Repository (impl) | Eloquent, query, mapear Model → entidade de domínio | regra de negócio, chamar Service |
| Adapter LLM | HTTP para o provedor, parse e validação de forma | decidir o que fazer com o resultado |

Duas consequências que valem repetir:

- O Service **nunca** conhece Eloquent. Se `use App\Infrastructure\...\Models\` ou `DB::` aparece
  num arquivo dentro de `Application/`, está errado.
- `Domain/` não importa nada do `Illuminate\`. Se você conseguir copiar a pasta `Domain/` para um
  projeto sem Laravel e ela compilar, a camada está correta. Esse é o teste mental.

O Repository devolve **entidade de domínio**, não Model do Eloquent. Deixar o Model vazar para o
Service é o erro mais comum e derruba o propósito da camada: o Service passaria a depender de
Eloquent por tabela do meio.

### 6.2 Inversão de dependência

Interfaces vivem no `Domain`. Implementações vivem em `Infrastructure`. O binding vive num
ServiceProvider dedicado.

```php
// app/Domain/Patient/PatientRepository.php
namespace App\Domain\Patient;

interface PatientRepository
{
    public function paginate(ListPatientsQuery $query): PatientPage;
    public function findById(string $id): ?Patient;
    public function save(Patient $patient): void;
}
```

```php
// app/Providers/DomainServiceProvider.php
public function register(): void
{
    $this->app->bind(PatientRepository::class, EloquentPatientRepository::class);
    $this->app->bind(LlmClient::class, AnthropicClient::class);
}
```

```php
// app/Application/Patient/PatientService.php
public function __construct(
    private readonly PatientRepository $patients,   // interface, não implementação
) {}
```

Nos testes, `$this->app->bind(LlmClient::class, FakeLlmClient::class)` troca o adapter. É isso que
torna a suíte rápida, determinística e sem gastar token.

Regra: nenhum `app()->make()` ou `resolve()` dentro de Service. Dependência entra por construtor.
Service locator escondido no meio do código anula a inversão que você acabou de montar.

### 6.3 REST, verbos e status

| Situação | Status |
|---|---|
| Leitura com sucesso | 200 |
| Criação | 201 com `Location` |
| Atualização sem corpo de retorno | 204 |
| Corpo inválido | 422 |
| Parâmetro malformado | 400 |
| Não autenticado | 401 |
| Sem permissão | 403 |
| Não existe | 404 |
| Rate limit | 429 |
| Feature desligada por kill switch | 503 |

Proibido: 200 com `{ success: false }` no corpo. O status carrega o resultado.

Erro sempre no mesmo envelope, produzido pelo `Exceptions\Handler` global a partir de exceções de
domínio (`PatientNotFound`, `AiDisabled`, `LlmUnavailable`). O controller não monta erro:

```json
{ "error": { "code": "PATIENT_NOT_FOUND", "message": "...", "details": [] } }
```

Endpoints:

```
GET   /api/v1/patients?search=&cursor=&limit=
GET   /api/v1/patients/:id
PATCH /api/v1/patients/:id
GET   /api/v1/patients/:id/biomarkers
POST  /api/v1/patients/:id/ai-actions
PATCH /api/v1/ai-actions/:id            aceitar ou descartar
GET   /api/v1/feature-flags
```

Paginação é **cursor**, não offset. Com 5.000 registros e scroll infinito, offset gera duplicata e
perda de item quando o dado muda.

### 6.4 Camada de LLM

Contrato de saída estruturado e validado. Texto solto não é aceito.

Peça JSON ao modelo, e valide a resposta antes de qualquer uso, dentro do adapter:

```php
// Infrastructure/Llm/AnthropicClient.php
$rules = [
    'risk_level'          => ['required', Rule::in(['low', 'moderate', 'high'])],
    'summary'             => ['required', 'string', 'max:400'],
    'actions'             => ['required', 'array', 'min:1', 'max:5'],
    'actions.*.title'     => ['required', 'string', 'max:120'],
    'actions.*.rationale' => ['required', 'string', 'max:400'],
    'actions.*.biomarkers'=> ['required', 'array'],
    'actions.*.priority'  => ['required', Rule::in(['low', 'medium', 'high'])],
];

$validator = Validator::make($decoded, $rules);
if ($validator->fails()) {
    throw new LlmInvalidResponse($validator->errors());
}

return AiSuggestion::fromArray($validator->validated());   // entidade de domínio
```

O adapter devolve entidade de domínio validada. O Service recebe algo em que pode confiar e nunca
vê JSON cru.

Obrigatório:

- Cache por hash do snapshot de biomarcadores. Mesmo dado clínico, mesma sugestão, zero token gasto.
  Chave baseada no id do paciente está errada: não invalida quando o exame muda.
- Timeout explícito e fallback gracioso. Se o LLM falhar, a tela não quebra: mostra estado de erro
  com ação de tentar de novo.
- Resposta inválida contra o schema é tratada como falha, com um retry. Nunca salvar saída não
  validada.
- Rate limit no endpoint.
- Toda sugestão nasce com status `pending` e exige aceite ou descarte humano. O app não aplica nada
  sozinho.
- Disclaimer clínico visível na UI, com texto vindo da marca.
- Nada de dado identificável desnecessário no prompt. Envie biomarcadores, idade e objetivo, não
  nome e documento.

---

## 7. Modelo de dados

```
brands        id, slug, display_name
users         id, name, email, brand_id            (nutricionista)
patients      id, brand_id, name, birth_date, goal, status, updated_at
biomarkers    id, patient_id, code, label, value, unit,
              ref_min, ref_max, measured_at
ai_actions    id, patient_id, title, rationale, priority, biomarkers,
              status(pending|accepted|dismissed), input_hash, created_at
feature_flags id, brand_id, key, enabled
```

Regras:

- `status` de biomarcador (baixo, normal, alto) é **derivado** a partir de `ref_min` e `ref_max`.
  Não é coluna. O cálculo vive em `Domain/Patient/BiomarkerStatus.php`, como enum com um método
  estático `from(float $value, float $min, float $max)`. Não vive no controller, não vive num
  accessor do Eloquent, não vive no componente React. É a regra de negócio mais fácil de testar do
  projeto: use isso a favor da cobertura.
- Índices em `patients(brand_id, name)` e `biomarkers(patient_id, measured_at)`.
- Seed determinístico com faker semeado, mínimo 5.000 pacientes distribuídos entre as duas marcas,
  com faixa de biomarcadores realista e alguns casos fora da faixa para a IA ter o que dizer.

---

## 8. Docker

`docker compose up` na raiz precisa, sem nenhum passo adicional:

1. Subir Postgres com healthcheck
2. Esperar o banco ficar saudável (`depends_on` com `condition: service_healthy`)
3. `composer install` se o vendor não existir
4. `php artisan key:generate` se `APP_KEY` estiver vazia
5. `php artisan migrate --force`
6. `php artisan db:seed --force` se o banco estiver vazio
7. Subir a API na porta 9000

Serviços mínimos: `api` e `db`. Para o `api`, duas opções aceitáveis:

- **Simples:** imagem `php:8.3-cli` rodando `php artisan serve --host=0.0.0.0 --port=9000`. Suficiente
  para o estágio atual do projeto, sobe rápido, uma linha de config.
- **Mais fiel:** nginx na 9000 conversando com php-fpm. Mais realista, mais peça para dar errado.

Escolha a primeira se o tempo estiver apertado e registre a decisão numa ADR. "Escolhi o servidor
embutido porque o objetivo agora é reprodutibilidade do ambiente, não performance de produção" é uma
justificativa válida. Extensões PHP necessárias no Dockerfile: `pdo_pgsql`, `bcmath`, `intl`.

Regras:

- Nenhum comando manual documentado como "depois rode X". Se precisa, coloque no entrypoint.
- `vendor/` no `.gitignore`. `composer.lock` versionado.
- O app mobile em device físico não alcança `localhost`. `EXPO_PUBLIC_API_URL` aponta para o IP da
  máquina na rede, e isso está documentado no README do mobile.
- `.env.example` contém todas as variáveis, inclusive `ANTHROPIC_API_KEY=` vazia.

---

## 9. Segurança

- Chave de LLM só no backend, só em variável de ambiente.
- Gate biométrico com `expo-local-authentication` antes de exibir a carteira. Fallback quando o
  device não tem biometria cadastrada precisa existir e estar tratado.
- Nenhum dado de paciente em log.
- CORS restrito e `throttle` no endpoint de IA (`RateLimiter::for('ai', ...)`).
- Toda escrita passa por FormRequest. Use `$request->validated()` no controller, nunca
  `$request->all()`. Campo não previsto nas regras não pode chegar ao Service.
- `APP_DEBUG=false` no `.env.example`. Stack trace vazando em resposta de erro é falha de segurança.
- Mass assignment: `$fillable` explícito nos Models, nunca `$guarded = []`.

---

## 10. Testes: caminho crítico, não checklist exaustivo

Os requisitos pedem "cobertura mínima de testes" (backend) e testes só bloqueiam a entrega se
**ausentes** ou se listas não forem virtualizadas — não exigem um número ou uma lista fechada de
casos. A prioridade é: existe teste, ele cobre a regra de negócio central (`BiomarkerStatus`,
kill switch, fronteira de marca) e ele falha de verdade se a regra quebrar. As listas abaixo são
**exemplos do que é caminho crítico**, não um mínimo obrigatório item a item — se o tempo apertar,
corte o exemplo mais periférico da lista antes de cortar o teste da regra de negócio central.

### Backend

Pest, com `tests/Unit` sem banco e `tests/Feature` com `RefreshDatabase`.

- **Unit, sem Laravel:** `BiomarkerStatus::from()` cobrindo abaixo, dentro e acima da faixa, mais os
  limites exatos. É regra pura, roda em milissegundos, e prova que o Domain está isolado.
- **Unit:** `PatientService` com `PatientRepository` mockado (Mockery ou fake em memória), cobrindo
  o caso de paciente inexistente lançando `PatientNotFound`.
- **Unit:** `GenerateAiActionsService` com `FakeLlmClient`, cobrindo sucesso, resposta inválida do
  LLM, cache hit sem chamar o client, e kill switch desligado lançando `AiDisabled`.
- **Feature:** endpoints principais verificando **status code e forma do JSON**: 200, 404, 422, 503.
  Use `assertJsonStructure`, não comparação de payload inteiro (quebra a cada mudança de seed).

Nenhum teste pode fazer chamada real ao provedor de LLM. Se a suíte precisa de `ANTHROPIC_API_KEY`
para passar, está errada.

### Mobile

- Teste que renderiza a mesma tela com as duas marcas e verifica que os tokens aplicados diferem.
  Este é o teste que prova o desacoplamento.
- Teste dos quatro estados da lista de pacientes.
- Teste da mutation otimista, incluindo o rollback em caso de erro.
- Teste do hook de flag, verificando que a superfície de IA some quando o kill switch está off.

Teste de snapshot não conta como cobertura. Teste que só verifica que o componente renderiza sem
quebrar não conta.

---

## 11. Verificações automáticas

### 11.1 Fronteira de marca

Em `mobile/.eslintrc.js`:

```js
overrides: [{
  files: ['src/core/**/*'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['**/brands/*', '@/brands/*'],
        message: 'core/ não pode conhecer marca. Use useTheme() ou useFlag().',
      }],
    }],
  },
}]
```

Mais um script que faz grep pelos slugs das marcas em `src/core/` e falha se encontrar. As duas
verificações rodam no `pretest`. Cite ambas no README e no vídeo: é a prova de que o risco
arquitetural principal está mitigado.

### 11.2 Fronteira de camada no backend

Script que roda no `pretest` e falha se:

- `Illuminate\` aparecer em qualquer arquivo dentro de `app/Domain/`
- `Models\`, `DB::`, `Eloquent` ou `->query()` aparecer em `app/Application/` ou em
  `app/Http/Controllers/`
- `$request->all()` aparecer em qualquer controller

```bash
#!/usr/bin/env bash
set -e
! grep -rq "Illuminate\\\\" app/Domain/            || { echo "Domain conhece Laravel"; exit 1; }
! grep -rqE "DB::|Models\\\\" app/Application/     || { echo "Service conhece Eloquent"; exit 1; }
! grep -rq 'request()->all()\|$request->all()' app/Http/Controllers/ || { echo "all() no controller"; exit 1; }
```

Larastan também pega parte disso com regras de arquitetura, mas o grep é explícito e você consegue
mostrá-lo rodando no vídeo em cinco segundos. Vale mais que a análise silenciosa.

---

## 12. Convenções de código

**Mobile.**

- Arquivos e pastas em kebab-case. Componentes React em PascalCase.
- Um componente exportado por arquivo.
- Named exports. `export default` só onde o expo-router exige.
- Import absoluto com alias `@/`. Nada de `../../../`.

**Backend.**

- PSR-12, garantido por Laravel Pint. Rode antes de cada commit.
- Classes em PascalCase, uma por arquivo, namespace espelhando a pasta.
- Interface sem sufixo `Interface`. `PatientRepository` é a interface,
  `EloquentPatientRepository` é a implementação. O nome descreve o papel, não o mecanismo.
- Propriedades injetadas são `private readonly`, declaradas na assinatura do construtor.
- Nada de facade dentro de `Domain/` ou `Application/`. Facade é acoplamento a framework
  disfarçado de conveniência.
- Sem comentário que descreve o que a linha faz. Comentário só para explicar por que uma decisão
  não óbvia foi tomada.
- Copy da interface em voz ativa e sentence case. Botão diz o que acontece: "Gerar ações", não
  "Enviar". A ação mantém o mesmo nome do botão até o toast de confirmação.
- Erro na interface explica o que falhou e o que fazer. Não pede desculpa, não é vago.

---

## 13. Definition of Done por feature

Uma feature só está pronta quando **todos** os itens valem:

- [ ] `tsc --noEmit` passa
- [ ] Lint passa, incluindo a regra de fronteira de marca
- [ ] Funciona nas duas marcas, verificado visualmente
- [ ] Os quatro estados de UI estão implementados
- [ ] Tem ao menos um teste
- [ ] Nenhum literal de cor, raio ou tamanho de fonte no código
- [ ] Nenhum segredo novo fora do `.env`

---

## 14. Checklist final antes de enviar

Rode e confirme, na ordem:

1. `rm -rf node_modules && docker compose down -v && docker compose up` a partir do zero. A API
   responde na 9000 sem intervenção manual.
2. `php artisan test` passa em `api/`, `npm test` passa em `mobile/`.
3. `tsc --noEmit` limpo no mobile, `vendor/bin/phpstan analyse` limpo na api, `vendor/bin/pint --test`
   sem diferença.
4. Scripts de fronteira (11.1 e 11.2) passam.
5. `git log -p | grep -iE "sk-ant|sk-proj|password.*=.*[a-z0-9]{8}"` não retorna nada. Confira também
   que `api/.env` nunca foi commitado: `git log --all --name-only | grep -x "api/.env"`.
5. `grep -riE "nutri-care|vita-plus" mobile/src/core/` não retorna nada.
6. App instalado nas duas marcas, com ícone e nome distintos, rodando lado a lado.
7. Kill switch virado no banco: botão de IA some no app e endpoint devolve 503.
8. Modo avião: carteira continua legível.
9. OTA publicado via `eas update` e aplicado num build de desenvolvimento/interno já instalado no
   device (dev client ou build interno). **Não** exige publicação nas lojas (App Store/Play
   Store) — os requisitos pedem só "OTA de bundle JS (justificar ferramenta)", não uma release
   pública.
10. README da raiz contém: como rodar, diagrama de arquitetura, justificativa de cada escolha de
    biblioteca, o que ficou de fora e por quê, e o relatório de uso de IA.
11. ADRs escritas, consolidadas em poucos documentos temáticos (não uma por decisão) — por
    exemplo: (a) estrutura do repo e camadas do backend (monorepo, Domain/Application/Infrastructure,
    OpenAPI como contrato), (b) stack e arquitetura mobile (TanStack Query, expo-updates, paginação
    por cursor), (c) capacidade nativa (biometria no lugar de HealthKit) e infra (servidor embutido
    no lugar de nginx + php-fpm). Três a quatro ADRs bem escritas defendem tão bem quanto oito
    fragmentadas, e custam menos tempo.
12. Vídeo de 3 a 5 minutos gravado, seguindo `docs/video-script.md`.

---

## 15. O que fica de fora, de propósito

Escrever isso no README vale mais que tentar entregar tudo pela metade.

- Autenticação real. Existe um usuário semeado e um token fixo. O foco desta fase é arquitetura.
- Multi-tenancy no nível de banco.
- Sincronização bidirecional completa offline. O que existe é cache de leitura mais fila de
  mutations otimistas.
- HealthKit, por indisponibilidade de device iOS para demonstração honesta.
- CI/CD. Os scripts de verificação existem e rodam localmente.
