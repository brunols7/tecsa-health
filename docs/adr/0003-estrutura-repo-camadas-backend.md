# ADR-0003: Um repositório só, e um backend organizado em camadas de verdade

**Status:** aceita e implementada.

Antes de escrever a primeira linha de código, duas perguntas estruturais precisavam de resposta:
como organizar o mobile e a API entre si, e como organizar as camadas dentro do próprio backend
Laravel. As duas decisões moldam tudo o que vem depois, então valem uma explicação própria.

## Um repositório só, não dois

A alternativa a um monorepo seria dois repositórios separados — um para `api/`, outro para
`mobile/`. Optamos por manter os dois na mesma raiz de git, com um `docker-compose.yml` único
subindo o backend inteiro e um `README.md` de topo explicando o projeto como um todo. O mobile e a
API são fortemente acoplados neste desafio (um não faz sentido sem o outro), e nenhum dos dois
ganharia um ciclo de release independente que justificasse a separação.

Como o Laravel não fala TypeScript, não existe um contrato de tipos compartilhado entre os dois
projetos como haveria num monorepo full-TypeScript. O contrato aqui é OpenAPI, gerado automaticamente
pelo `dedoc/scramble` a partir dos próprios `Resources` e `FormRequests` do Laravel, servido em
`/docs/api`. Não é um pacote de tipos compilado — é a documentação da API nascendo direto do código
que a implementa, então ela nunca fica desatualizada por esquecimento.

## Camadas do backend: Domain → Application → Http, com Infrastructure por trás

A alternativa mais comum em projetos Laravel é o "MVC fino" de CRUD simples: Controller chamando o
Model do Eloquent diretamente, com regra de negócio espalhada entre accessors/scopes do Model e o
próprio Controller. Funciona para app pequeno, mas mistura responsabilidades que crescem rápido —
e é exatamente o tipo de mistura que os critérios de avaliação deste desafio penalizam (regra de
negócio dentro de Controller é motivo de eliminação).

Optamos por separar o backend em quatro camadas, cada uma com uma responsabilidade e um limite
claro do que pode e não pode fazer:

- **`app/Domain/{Patient,Biomarker,AiAction,Brand,FeatureFlag}/`** guarda entidades, enums, objetos
  de valor e as interfaces de repositório (`PatientRepository`, `AiActionRepository`, `LlmClient`).
  Nada aqui conhece Laravel — nenhum `use Illuminate\...` aparece nessas pastas, e isso é conferido
  automaticamente: `api/scripts/check-layer-boundary.sh` roda um grep que falha o build se alguém
  quebrar essa regra.
- **`app/Application/{Patient,AiAction,FeatureFlag}/*Service.php`** é onde a regra de negócio de
  verdade mora — orquestração, decisões, validações de domínio. Cada Service recebe suas
  dependências por injeção de construtor, sempre como interface do Domain, nunca como classe
  concreta (`PatientService` recebe `BrandRepository`, `PatientRepository`, `BiomarkerRepository` —
  todas interfaces). Nenhum `Model::` ou `DB::` aparece aqui; o mesmo script de fronteira garante
  isso também.
- **`app/Infrastructure/`** é onde o Eloquent de fato mora — os Models, os Repositories que
  implementam as interfaces do Domain, o cliente HTTP que fala com o provedor de LLM. É a única
  camada que sabe como o dado é persistido de verdade.
- **`app/Http/Controllers/`** faz só quatro coisas: recebe a requisição, valida via `FormRequest`,
  chama um método de Service, devolve um `Resource` com o status certo. Se um Controller tem um
  `if` de negócio, um cálculo ou uma query, está errado — e o mesmo script de fronteira também varre
  os Controllers procurando por isso.

## Por que vale a separação

Cada camada pode ser testada isoladamente: o Domain não precisa de banco nem de HTTP para ser
testado (é PHP puro), os Services são testados com um repositório falso em memória, e só os testes
de Feature realmente batem no banco. Isso também é o que faz o Repository devolver uma **entidade
de domínio**, nunca o Model do Eloquent direto — se o Model vazasse para o Service, o Service
passaria a depender de Eloquent por tabela do meio, e a separação perderia o sentido.

O `check-layer-boundary.sh` existe justamente porque regra de arquitetura que só vive na cabeça de
quem escreveu o código se perde com o tempo. Rodando no `pretest`, qualquer violação dessas
fronteiras quebra a suíte antes de chegar a um PR — não depende de review humano lembrar de checar.
