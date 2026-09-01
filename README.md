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
(banco, filas e cache locais). A única chave que vale preencher se você for exercitar a geração de
ações de IA de verdade é `ANTHROPIC_API_KEY` — vazia, ela não bloqueia o resto do app, só a
geração de sugestões.

`mobile/.env` precisa de `EXPO_PUBLIC_API_URL`. Em simulador iOS ou emulador Android, aponte para
`http://localhost:9000`. **Em device físico**, `localhost` não alcança a máquina host — use o IP da
sua máquina na rede local, por exemplo `http://192.168.0.10:9000` (descubra o IP com `ipconfig
getifaddr en0` no macOS ou `ip addr` no Linux).

### 2. Subir o backend

```bash
docker compose up
```

Sem nenhum passo manual adicional, isso sobe o Postgres com healthcheck, espera o banco ficar
saudável, roda `composer install` se o `vendor/` não existir, gera a `APP_KEY` se estiver vazia,
roda as migrations, semeia o banco (mínimo 5.000 pacientes distribuídos entre as duas marcas) se
ele estiver vazio, e sobe a API na porta **9000**. Confirme com:

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
