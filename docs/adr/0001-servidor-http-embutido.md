# ADR-0001: Por que o backend roda no servidor embutido do PHP (e não nginx), e por que biometria em vez de HealthKit

**Status:** aceita e implementada.

Este documento junta duas decisões que, à primeira vista, não têm nada a ver uma com a outra — uma
é sobre como o Docker sobe a API, a outra é sobre qual recurso nativo o app mobile usa. Elas foram
agrupadas porque respondem ao mesmo item da avaliação ("capacidade nativa e infraestrutura"), e
porque as duas nasceram do mesmo tipo de raciocínio: dado o tempo e o ambiente reais que a gente
tinha, qual escolha reduz o risco de algo dar errado na hora de demonstrar o projeto?

## Parte 1 — O servidor HTTP do container `api`

A porta 9000 é uma exigência fixa do desafio, e `docker compose up` precisa deixar a API
respondendo sem nenhum passo manual no meio do caminho — banco saudável, dependências instaladas,
chave gerada, migrations e seed rodados, tudo dentro do próprio `entrypoint.sh` do container.

Existiam duas formas razoáveis de servir essa API dentro do container: o servidor embutido do
próprio PHP (`php artisan serve`) ou um nginx na frente conversando com php-fpm via FastCGI — a
configuração mais parecida com um ambiente de produção real.

**Optamos pelo servidor embutido.** O serviço `api` roda `php artisan serve --host=0.0.0.0
--port=9000` numa imagem `php:8.3-cli`, com as extensões `pdo_pgsql`, `bcmath` e `intl` instaladas
no `Dockerfile`. Todo o resto — instalar dependências, gerar a chave, rodar migrations e seed — é
resolvido pelo `docker/entrypoint.sh` antes do servidor subir.

nginx + php-fpm foi descartado para esta fase. É a opção mais fiel a produção, sem dúvida, mas traz
peças a mais — configuração de proxy, socket entre nginx e php-fpm, healthcheck de dois processos
em vez de um — que aumentam a chance de alguma coisa quebrar bem na primeira subida do ambiente, que
é exatamente o momento em que um avaliador roda `docker compose up` pela primeira vez. Não há carga
concorrente real neste projeto que justifique o ganho de performance do nginx, então o risco não
compensava o benefício.

**O que isso custa:** `php artisan serve` é single-threaded e não seria uma escolha correta para
produção de verdade, se este projeto algum dia precisasse sustentar tráfego real. Isso é uma
limitação aceita conscientemente — se performance sob carga virar um requisito futuro, essa decisão
deveria ser revisitada com uma nova ADR migrando para nginx + php-fpm. Por outro lado, a escolha não
toca em nada do código de domínio ou da API em si — está inteiramente confinada ao `Dockerfile` e ao
`docker-compose.yml`, então trocar de servidor no futuro não exigiria tocar em uma linha de negócio.

---

## Parte 2 — Biometria no lugar de HealthKit

O desafio pede para usar algum recurso nativo do celular que não seja só JavaScript — câmera,
biometria, notificação push, algo do tipo. Dado que o produto lida com dado de saúde, HealthKit
parecia a escolha óbvia à primeira vista.

O problema é prático, não técnico: HealthKit só faz sentido demonstrar de verdade num device físico
iOS — o simulador não tem dado real de sensor nem hardware biométrico simulável de forma confiável.
Sem um iPhone físico disponível para gravar a demonstração, qualquer demo de HealthKit seria
inevitavelmente encenada, e isso pesa mais contra o projeto do que simplesmente escolher outra
capacidade nativa honesta.

**Optamos por biometria** (`expo-local-authentication`) como um gate de acesso antes de abrir a
carteira de pacientes — que, aliás, já faz sentido por conta própria: é dado clínico sensível, então
pedir alguma barreira de entrada não é só "cumprir requisito", é razoável.

A implementação vive em `mobile/src/core/auth/useBiometricGate.ts`, uma máquina de estados simples
(`checking` → `locked` → `unlocked`). Ela chama `hasHardwareAsync()` e `isEnrolledAsync()` e cobre
três cenários reais, não só o caminho feliz:

- o device tem biometria cadastrada → pede biometria;
- o device não tem biometria, mas tem PIN/padrão/senha configurado → cai para a credencial do
  aparelho em vez de travar o usuário para sempre (`useBiometricGate.ts:48-67`);
- o device não tem nenhum bloqueio configurado → o app ainda abre, com um aviso, porque negar acesso
  nesse caso não protege nada de verdade (não há segredo a esconder além da própria sessão local) e
  só atrapalharia testar o app num emulador limpo.

Essa tela (`BiometricGateScreen.tsx`) é montada em `mobile/src/app/_layout.tsx` antes de qualquer
rota da carteira renderizar — é literalmente a primeira coisa que a pessoa vê ao abrir o app.

**Por que não HealthKit, resumindo:** biometria funciona de ponta a ponta tanto em simulador
(Face ID/Touch ID simulado do Xcode, ou o equivalente do Android) quanto em device físico — a mesma
demonstração é honesta nos dois ambientes, o que HealthKit não conseguiria ser sem hardware real. Se
um dia um iPhone físico estiver disponível, nada aqui impede adicionar HealthKit depois como uma
capacidade *a mais* — essa decisão não fecha a porta, só reflete a limitação real de ambiente desta
entrega. E vale reforçar: nenhum dado de saúde nativo do device é usado — os biomarcadores do
produto vêm inteiramente da API, nunca de uma integração nativa de saúde.
