# ADR-0001: Servidor HTTP embutido no Docker Compose e biometria no lugar de HealthKit

## Status

Aceita

## Contexto

O serviço `api` do `docker-compose.yml` da Fase 0 precisa expor a API Laravel na porta 9000
(exigência fixa de CLAUDE.md §3, "Versões e portas") e, por CLAUDE.md §8, `docker compose up`
precisa deixar a API respondendo sem nenhum passo manual entre o comando e o serviço no ar:
Postgres saudável, `composer install` condicional, `APP_KEY` gerada se vazia, migrations e seed
condicional, tudo dentro do entrypoint do container.

Existem duas formas aceitáveis de servir a API dentro do container, ambas citadas explicitamente
em CLAUDE.md §8:

- Servidor embutido do PHP (`php artisan serve`) em imagem `php:8.3-cli`.
- nginx como proxy reverso na porta 9000, conversando com php-fpm via FastCGI.

O objetivo desta fase é reprodutibilidade do ambiente de desenvolvimento — qualquer pessoa clonando
o repositório e rodando `docker compose up` precisa chegar a uma API funcionando de forma confiável
e rápida — e não performance ou fidelidade de produção. O tempo de engenharia disponível também é
limitado e está distribuído entre várias frentes (mobile, IA, testes, documentação), não só infra.

## Decisão

O serviço `api` roda `php artisan serve --host=0.0.0.0 --port=9000` dentro de uma imagem
`php:8.3-cli`, com as extensões `pdo_pgsql`, `bcmath` e `intl` instaladas no `Dockerfile`, e todos
os passos de setup (install de dependências, key generation, migrations, seed) resolvidos pelo
`docker/entrypoint.sh` do container antes do servidor subir.

Rejeitamos nginx + php-fpm para esta fase. É a opção mais fiel a um ambiente de produção real, mas
introduz peças adicionais — configuração de nginx, socket ou FastCGI entre nginx e php-fpm, healthcheck
de dois processos em vez de um — que aumentam a superfície de erro na primeira subida do ambiente sem
trazer benefício nesta fase: não há carga concorrente real para justificar o ganho de performance, e o
risco de o avaliador rodar `docker compose up` e cair numa tela de erro de proxy mal configurado pesa
mais do que a fidelidade extra de produção.

## Consequências

- `docker compose up` sobe a API com uma única peça de infraestrutura (um processo PHP), reduzindo o
  que pode dar errado na primeira execução e tornando o Dockerfile e o entrypoint mais simples de ler,
  revisar e demonstrar em vídeo.
- `php artisan serve` é single-threaded e não é recomendado para produção — ele não é a escolha
  correta se este ambiente precisar sustentar carga concorrente real ou virar a base de um deploy de
  produção. Essa limitação é aceita conscientemente nesta fase.
- Se performance sob concorrência ou paridade com produção virar requisito em uma fase futura, esta
  decisão deve ser revisitada com um novo ADR que supersede este, migrando para nginx + php-fpm (ou
  outro servidor de aplicação PHP com suporte a múltiplos workers).
- A escolha não afeta o contrato da API nem o código de domínio/aplicação — é puramente uma decisão de
  infraestrutura de desenvolvimento, confinada ao `Dockerfile` e ao `docker-compose.yml`.

---

# Biometria (`expo-local-authentication`) no lugar de HealthKit

Agrupada nesta mesma ADR por decisão do usuário: os dois temas ("capacidade nativa" e "infra
embutida") compartilham o tema `CLAUDE.md` §14 item 11 alínea (c). São decisões independentes uma
da outra — mudar uma não afeta a outra — mas cobrem o mesmo eixo de avaliação.

## Contexto

`docs/requisitos-do-produto.md` pede uma capacidade nativa não trivial (câmera, biometria,
notificação push ou similar) exercitando código fora do JS puro. HealthKit era a opção mais óbvia
dado o domínio do produto (dados de saúde), mas exige um device físico iOS real para demonstração
honesta — simulador iOS não tem HealthKit funcional (a API existe, mas sem dado real nem hardware
biométrico simulável de forma confiável) — e `CLAUDE.md` §15 já registra a falta desse device como
motivo explícito para descartar HealthKit deste projeto. A carteira de pacientes contém dado
clínico sensível (nome, biomarcadores), o que também justifica algum gate de acesso ao abrir o app,
independente da escolha de capacidade nativa.

## Decisão

`expo-local-authentication` como gate biométrico antes de exibir a carteira de pacientes.
`mobile/src/core/auth/useBiometricGate.ts` implementa a máquina de estados
(`checking`/`locked`/`unlocked`), chamando `hasHardwareAsync()` + `isEnrolledAsync()` e, quando
biometria não está cadastrada, caindo para a credencial do dispositivo (PIN/padrão/senha) via
`authenticateAsync({ disableDeviceFallback: false })` em vez de travar o usuário para sempre —
`useBiometricGate.ts:48-67` cobre os três casos: biometria cadastrada, biometria ausente mas
device tem bloqueio configurado (`reason: 'device_credential'`), e nenhum bloqueio configurado no
device (`reason: 'no_credential_available'`, com aviso explícito em vez de negar acesso).
`mobile/src/core/ui/BiometricGateScreen.tsx` é a tela que consome esse hook, montada em
`mobile/src/app/_layout.tsx:22,30` antes de qualquer rota da carteira renderizar.

## Por que não HealthKit

HealthKit precisa de device físico iOS para provar de verdade que lê dado real do sensor/app de
saúde — o ambiente de demonstração deste projeto não tem esse device disponível, tornando a
demonstração inevitavelmente falsa (mockada) se HealthKit fosse escolhido. Biometria, por outro
lado, funciona de ponta a ponta tanto em simulador (com biometria simulada via Face
ID/Touch ID do simulador do Xcode, ou o equivalente do emulador Android) quanto em device físico —
a mesma capacidade nativa demonstra de forma honesta nos dois ambientes.

## Consequências

- O gate biométrico é a primeira coisa que qualquer sessão do app enfrenta — sem device com
  biometria cadastrada nem bloqueio de tela configurado, o app ainda abre (com aviso), porque negar
  acesso por completo nesse caso bloquearia a demonstração em qualquer emulador/simulador limpo, sem
  nenhum ganho de segurança real (não há segredo a proteger além da própria sessão local).
- A escolha não usa nenhum dado de saúde nativo do device (nada de HealthKit/Google Fit) — os
  biomarcadores do produto vêm inteiramente da API, nunca de uma integração nativa de saúde.
- Se um device físico iOS ficar disponível no futuro, o app não precisa mudar para adicionar
  HealthKit como uma capacidade nativa *adicional* — a decisão aqui não fecha a porta, só reflete a
  limitação real de ambiente desta entrega.
