# tecsa-health

App core único e white-label servindo duas marcas (NutriCare e VitaPlus) a partir de uma base
compartilhada, com uma fatia vertical do "app do nutricionista": carteira de pacientes,
biomarcadores e ações de acompanhamento geradas por IA. A arquitetura completa, as regras
invioláveis e as decisões de stack estão documentadas em [`CLAUDE.md`](./CLAUDE.md).

## Como rodar

### Pré-requisitos

- Docker e Docker Compose
- Node.js 20+ e npm
- Um device físico com Expo Go, um simulador iOS ou um emulador Android (para o app mobile)

### 1. Clonar e configurar variáveis de ambiente

```bash
git clone <url-do-repositorio>
cd tecsa-health

cp api/.env.example api/.env
cp mobile/.env.example mobile/.env
```

`api/.env` já vem com valores padrão que funcionam sem edição para rodar localmente via Docker
(banco, filas e cache locais). Para exercitar a geração de ações de IA de verdade, preencha uma das
duas chaves de LLM — `ANTHROPIC_API_KEY` ou `GEMINI_API_KEY` (free tier do Google AI Studio, sem
custo). O backend escolhe o provedor sozinho no boot: se `ANTHROPIC_API_KEY` estiver preenchida,
usa Anthropic; senão, usa Gemini. Com as duas vazias, a geração falha com `502 AI_UNAVAILABLE` —
o resto do app não é afetado. Motivo e alternativas descartadas em
[`docs/adr/0002-selecao-de-provedor-llm.md`](./docs/adr/0002-selecao-de-provedor-llm.md).

`mobile/.env` precisa de `EXPO_PUBLIC_API_URL`. Em simulador iOS ou emulador Android, aponte para
`http://localhost:9000`. **Em device físico**, `localhost` não alcança a máquina host — use o IP da
sua máquina na rede local, por exemplo `http://192.168.0.10:9000` (descubra o IP com `ipconfig
getifaddr en0` no macOS ou `ip addr` no Linux).

### 2. Subir o backend

```bash
docker compose up -d --wait
```

Sem nenhum passo manual adicional, isso sobe o Postgres com healthcheck, espera o banco ficar
saudável, roda `composer install` se o `vendor/` não existir, gera a `APP_KEY` se estiver vazia,
roda as migrations, semeia o banco (mínimo 5.000 pacientes distribuídos entre as duas marcas) se
ele estiver vazio, e sobe a API na porta **9000**.

Use sempre `--wait`: o serviço `api` tem healthcheck próprio (`curl -f http://localhost:9000/up`),
e `--wait` bloqueia o comando até esse healthcheck reportar saudável, não só até o container
iniciar. Sem `--wait` (ou rodando `docker compose up` em foreground e testando antes da linha
`Server running on [http://0.0.0.0:9000]` aparecer no log), um `curl` imediato pode acertar a porta
antes do `composer install`/migrations/seed terminarem e cair em `Connection reset by peer` — não é
erro do backend, é corrida entre o comando e o entrypoint ainda rodando. Num clone limpo (sem cache
de imagem), a primeira subida pode levar até ~1-2 minutos por causa do `composer install`.

Só `api/.env` e a pasta `vendor/` são montados no container (`docker-compose.yml`) — o resto do
código do backend é copiado na imagem no `build`. Depois de editar qualquer arquivo em `api/app/`
(ou outro código-fonte), rode `docker compose up -d --build api` para a mudança valer; `docker
compose restart api` só reinicia o processo com a imagem antiga, não recarrega código novo.

Confirme com:

```bash
curl -f http://localhost:9000/up
```

(`/api/v1/feature-flags` só existe a partir da Fase 1 — `/up` é o health check padrão do Laravel 11
e é o que a Fase 0 garante.)

Para derrubar tudo e recomeçar do zero (inclusive o volume do banco):

```bash
docker compose down -v
```

### 3. Rodar o app mobile

```bash
cd mobile
npm install

APP_BRAND=nutri-care npx expo start
# ou
APP_BRAND=vita-plus npx expo start
```

`APP_BRAND` seleciona a marca em tempo de build (`app.config.ts` lê a variável, valida contra o
registry de marcas e falha com mensagem clara se o valor for desconhecido). Sem `APP_BRAND`
definida, o padrão é `nutri-care`. Abra no Expo Go, num simulador, ou pressione `i`/`a` no
terminal do Metro.

### 4. Rodar os testes e os scripts de fronteira

**Backend** (a partir de `api/`):

```bash
composer test        # roda o guard-rail de camada (11.2) e a suíte Pest
composer lint         # Laravel Pint
composer stan         # PHPStan/Larastan nível 6+
bash scripts/check-layer-boundary.sh   # guard-rail de camada isolado, se quiser rodar sem o resto da suíte
```

**Mobile** (a partir de `mobile/`):

```bash
npm test                                  # roda pretest (lint + guard-rail de marca) e depois o Jest
npm run lint                              # ESLint, incluindo a regra de fronteira de marca em src/core/**
bash scripts/check-brand-boundary.sh      # guard-rail de marca isolado (grep por nome de marca em src/core/)
npx tsc --noEmit                          # checagem de tipos estrita
```

`npm test` já executa `pretest` automaticamente (hook nativo do npm) — não é preciso rodar lint e
o guard-rail à parte antes de testar, mas os comandos acima funcionam isolados quando você quer
depurar só uma das etapas.

## O que fica de fora, de propósito

Ver [`CLAUDE.md` §15](./CLAUDE.md#15-o-que-fica-de-fora-de-propósito).
