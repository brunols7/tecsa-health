# Requisitos do Produto: App Mobile (Tecsa Group)

> Escopo acordado do produto. Esta é a fonte de verdade do projeto — em caso de divergência entre
> este documento e qualquer outro (`CLAUDE.md`, specs, ADRs), este documento vence. Nenhuma
> exigência que não esteja aqui, direta ou indiretamente, é obrigatória para a entrega; pode ser
> uma boa prática a mais, mas nunca motivo de bloqueio.

## Contexto

Construa um app core único e white-label que atenda duas marcas distintas do grupo. A partir de
uma base compartilhada, o app deve renderizar duas identidades visuais diferentes (design system).
Sobre esse core, entregue uma fatia vertical do "app do nutricionista": carteira de pacientes,
detalhes com biomarcadores e ações geradas por IA.

## Stack Tecnológica

- Mobile: React Native, Expo (TypeScript obrigatório).
- Backend: PHP com Laravel 10+ (preferencial) ou Node.js.
- Banco de Dados: MySQL ou PostgreSQL.
- IA: API de LLM (Anthropic, OpenAI ou equivalente).
- Infraestrutura: Docker (o comando `docker compose up` deve subir backend e banco; backend na
  porta 9000).

## Requisitos Técnicos

### 1. Mobile (Foco Principal do Projeto)

- **Arquitetura**: Desacoplada da marca; camada de API tipada; gerência de estado e navegação
  justificadas.
- **UX/UI**: Tratamento de estados (carregando, erro, vazio e sucesso) e lista virtualizada para
  grandes bases.
- **Funcionalidades**: Feature flag remota (com kill switch para IA), OTA de bundle JS (justificar
  ferramenta), e uso de capacidade nativa (ex: HealthKit, biometria).
- **Offline**: Persistência local da carteira e suporte a update otimista.

### 2. Backend (Arquitetura em Camadas)

- **Padrão**: REST com verbos e status corretos.
- **Camadas**: Controller (validação), Service (regras de negócio e LLM) e Repository (banco).
- **Princípios**: SOLID, Clean Code e cobertura mínima de testes.

## Prioridade de Investimento de Engenharia

| Área | Peso |
|---|---|
| App core multimarca e arquitetura mobile | 32% |
| Plataforma e release (Flag, OTA, nativo e offline) | 23% |
| Documentação e defesa das decisões | 14% |
| API e camadas do backend | 13% |
| IA e pensamento de produto | 10% |
| Testes | 8% |

## Regras Invioláveis (Bloqueiam a Entrega)

- Marca acoplada ao core
- Regra de negócio no Controller
- Ausência de TypeScript
- Chave de LLM exposta no commit
- Ausência de testes ou de virtualização de listas
