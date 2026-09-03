# Context — Fase 5 (Fechamento)

Decisões de produto/processo fechadas com o usuário via `AskUserQuestion` antes de escrever o
`spec.md`. Nenhuma pergunta ficou sem resposta.

## Decisões

1. **Re-verificação das features sem gate fechado.** `fase-0-fundacao` tem `validation.md` em
   **FAIL** nunca revisitado; `fase-4-release-ota-mobile` e `detalhe-paciente-abas-mobile` nunca
   tiveram um Verifier independente rodando. Decisão: **re-verificar as três antes de seguir** para
   documentação. Qualquer gap encontrado vira fix task dentro da própria Fase 5, antes de fechar
   README/ADRs — não faz sentido documentar "checklist 100% verde" sobre uma base com verdict
   pendente.

2. **Checks físicos de device.** Itens do checklist final que só um device real/simulador
   comprova (modo avião mantendo a carteira legível, biometria sem cadastro mostrando fallback,
   OTA publicado e aplicado, duas marcas instaladas lado a lado no mesmo device) não são
   executáveis pelo agente. Decisão: **escrever um checklist manual passo a passo** para o usuário
   rodar; a tarefa correspondente fica com status "aguardando confirmação do usuário" e só é
   marcada concluída quando ele confirmar o resultado. Isso é bloqueante para o critério de aceite
   final (`docs/plano-de-desenvolvimento.md` §3), mas não bloqueia o restante do trabalho
   automatizável de Fase 5 (testes, docs, ADRs) — o agente segue com tudo o mais e devolve esse
   checklist como último item pendente de confirmação humana.

3. **Estrutura das ADRs finais.** `CLAUDE.md` §14 item 11 pede 3-4 ADRs temáticas consolidadas.
   Hoje existem só 2 (`0001-servidor-http-embutido.md`, `0002-selecao-de-provedor-llm.md`). Decisão:
   **4 ADRs temáticas** —
   - (1) estrutura do repo e camadas do backend (monorepo, Domain/Application/Infrastructure,
     OpenAPI como contrato via Scramble)
   - (2) stack e arquitetura mobile (TanStack Query, Zustand, expo-updates, paginação por cursor,
     FlashList)
   - (3) capacidade nativa (biometria no lugar de HealthKit) + infra (servidor embutido — expande a
     0001 existente, que já cobre metade do tema)
   - (4) ciclo de vida do paciente: `status` (ativo/inativo/concluído) modelado como mecanismo
     independente de soft delete (`deleted_at`) — formaliza a **AD-015** já registrada em
     `.specs/STATE.md`, que tinha uma pendência explícita do usuário para virar ADR nesta fase.
   `0002-selecao-de-provedor-llm.md` (seleção Anthropic/Gemini por env var) já existe e cobre bem o
   tema de IA — mantida como está, sem fundir com as novas.

4. **Documentos internos (não commitados).** O usuário pediu documentos de apoio — roteiro do app
   para o vídeo, explicação das escolhas de produto/arquitetura caso não fique claro no README —
   que não devem entrar no repositório remoto. Decisão: pasta **`docs-internal/` na raiz,
   adicionada ao `.gitignore`**. Fica visível localmente para o usuário e para sessões futuras deste
   agente, mas nunca é commitada nem sobe para o `origin`.

## Achados da investigação que alimentam o spec (não são decisões, são fatos verificados ao vivo)

- Backend: 272 testes (Pest) passando, PHPStan nível configurado limpo, Pint limpo, script de
  fronteira de camada limpo.
- Mobile: 293 testes (Jest) passando, `tsc --noEmit` limpo, script de fronteira de marca limpo,
  `FlashList` confirmado na lista de pacientes (não `FlatList`).
- Nenhum segredo real encontrado no histórico do git; `api/.env`/`mobile/.env` nunca commitados.
- `api/README.md` e `mobile/README.md` são o boilerplate padrão do framework (Laravel/Expo),
  nunca reescritos.
- README raiz tem "como rodar" mas falta diagrama de arquitetura, justificativa de biblioteca e
  relatório de uso de IA.
- `docs/video-script.md` não existe.
- `api/.env.example` carrega variáveis do scaffold padrão do Laravel não usadas pelo projeto
  (Redis, Memcached, AWS, Broadcast, Vite) — candidatas a remoção.
- `mobile/package.json` diz `1.0.0`, `mobile/app.json` diz `1.1.0` — versões divergentes.
- PHP 8.5 emite deprecation notice em `config/database.php` (constante `PDO::MYSQL_ATTR_SSL_CA`)
  durante os testes — não quebra a suíte, mas suja o output.
