# ADR-0002: Por que o app usa Gemini quando não há crédito na Anthropic

**Status:** aceita e implementada.

No início, `LlmClient` (a interface que o resto do backend usa para pedir sugestões de IA) estava
ligada direto ao `AnthropicClient`. Sem crédito pago disponível na conta Anthropic usada para este
projeto, `ANTHROPIC_API_KEY` ficou vazia, e toda tentativa de gerar uma ação de IA falhava com
`502 AI_UNAVAILABLE` — um erro de autenticação da própria Anthropic, não um bug do projeto.

O enunciado do desafio é claro que o provedor de LLM pode ser "Anthropic, OpenAI ou equivalente" —
o que importa é ter geração de ações via LLM com contrato validado, não uma marca específica de
IA. Isso abriu a porta para usar o free tier do Google Gemini sem violar nenhum requisito.

## O que decidimos

Escolher o provedor **uma única vez, na inicialização da aplicação**, com base em qual chave de API
está preenchida no ambiente — não tentar um provedor a cada chamada e cair para o outro só se falhar.

Na prática: `DomainServiceProvider::register()` liga `LlmClient` a uma closure que resolve
`AnthropicClient` quando `ANTHROPIC_API_KEY` está preenchida, e `GeminiClient` quando não está. O
`GeminiClient` (`app/Infrastructure/Llm/GeminiClient.php`) implementa exatamente a mesma interface
que o `AnthropicClient` — mesma validação de schema na resposta, mesmas exceções de domínio
(`LlmTimeout`, `LlmInvalidResponse`). Isso significa que nada acima dessa camada precisou mudar: o
`AiActionService`, o retry em resposta inválida, o cache por hash de biomarcadores, o app mobile —
tudo continua funcionando sem saber (nem precisar saber) qual dos dois provedores está por trás.
É exatamente o tipo de situação para o qual a inversão de dependência existe.

## Por que não um fallback em tempo real

Tentar a Anthropic e só cair para o Gemini quando a chamada falhasse pareceria mais "robusto", mas
custaria uma chamada HTTP extra (e uma tentativa de autenticação fadada ao erro, já que a chave
está vazia) em todo request, para resolver um problema que não é esse. O cenário real aqui é "eu
tenho uma chave configurada ou não tenho" — decidido no momento do deploy, não "a chave existe mas o
provedor está fora do ar agora". Fallback em tempo real faz sentido para tolerar uma falha
passageira de um provedor pago em produção; não faz sentido para alternar entre "grátis por
enquanto" e "pago quando tiver crédito".

## Por que não um modelo rodando localmente (Ollama)

Eliminaria o custo por completo, mas trocaria uma dependência de API por uma dependência de
infraestrutura — memória, CPU/GPU, imagem de modelo — que o ambiente deste projeto (um único
container de API, via Docker Compose simples) não foi pensado para sustentar. Isso também iria
contra a decisão já tomada na ADR-0001 de manter a infraestrutura o mais simples possível nesta
fase. Não está descartado para sempre — se o projeto um dia migrar para um ambiente com mais
capacidade de cômputo local, vale reconsiderar.

## O que isso significa na prática

- Trocar de provedor em produção — por exemplo, ao conseguir crédito pago na Anthropic — é só
  preencher `ANTHROPIC_API_KEY` no `.env` e reiniciar o container. Nenhum deploy de código novo.
- Com as duas chaves preenchidas ao mesmo tempo, a Anthropic sempre ganha a prioridade. Hoje não
  existe um jeito de forçar o Gemini nesse cenário — se um dia for preciso comparar os dois
  provedores lado a lado, essa parte da decisão precisaria mudar.
- Sem nenhuma das duas chaves, o sistema ainda tenta o Gemini e falha por autenticação na primeira
  chamada real — cai no mesmo caminho de erro já existente (`502 AI_UNAVAILABLE`). O comportamento é
  uma falha explícita, nunca uma resposta mascarada como se tivesse funcionado.
- Um terceiro provedor exigiria repensar essa parte — a closure foi desenhada para escolher entre
  dois candidatos, não para uma cadeia de prioridade com N opções.
