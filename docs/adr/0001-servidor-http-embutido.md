# ADR-0001: Usar servidor HTTP embutido do PHP no serviço `api` do Docker Compose

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
