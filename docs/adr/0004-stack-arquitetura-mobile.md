# ADR-0004: Stack mobile — TanStack Query, cache MMKV, cursor pagination, EAS Update

## Status

Aceita

## Contexto

`CLAUDE.md` §3 fixa a stack mobile antes de qualquer código ser escrito (Expo Router, TanStack
Query, Zustand, MMKV, FlashList, `expo-updates`) e proíbe explicitamente qualquer alternativa fora
dessa lista. Esta ADR registra por que cada peça foi de fato necessária no projeto real — não é uma
lista de tecnologias escolhidas no vácuo, é o racional por trás de cada uma tal como usada.

## Decisão

**TanStack Query v5 (`@tanstack/react-query@^5.102.8`) para todo estado de servidor.** Toda tela que
busca dado (carteira de pacientes, detalhe, biomarcadores, ações de IA, feature flags) usa um hook
de query próprio (`mobile/src/core/patients/usePatientDetailQuery.ts`,
`usePatientBiomarkersQuery.ts`, `useAiActionsQuery.ts`) construído sobre `useQuery`/`useMutation` —
nunca `fetch` direto em `useEffect`.

**Persistência de leitura via `persistQueryClient` + MMKV.** `mobile/src/core/offline/queryClient.ts`
liga o `QueryClient` único do projeto a `persistQueryClient` com um `Persister` sobre
`react-native-mmkv` (`mobile/src/core/offline/storage.ts:5-16`). A carteira de pacientes e o
detalhe de um paciente já visitado ficam legíveis com o dispositivo em modo avião.

**Paginação por cursor, não offset.** `mobile/src/core/api/patients.ts:12-18` — `fetchPatients`
recebe `cursor: string | undefined` e devolve o próximo cursor no envelope paginado, nunca `page`/
`offset`. O seed tem 5.000+ pacientes (`CLAUDE.md` §2.5); com scroll infinito sobre offset, um
paciente inserido/removido durante a navegação desloca todos os índices seguintes, causando item
duplicado ou pulado na próxima página — cursor não tem esse problema porque aponta para uma posição
relativa a um registro específico, não a um índice absoluto.

**`@shopify/flash-list` na carteira de pacientes.** `mobile/src/app/index.tsx:4,264-267` — `FlashList`
com `keyExtractor` estável, nunca `FlatList`/`ScrollView.map()` sobre a lista completa (`CLAUDE.md`
§2.5). A versão instalada (`flash-list@2.0.2`) removeu `estimatedItemSize` do contrato de props —
registrado como `SPEC_DEVIATION` inline no próprio arquivo (`index.tsx:260-263`) porque
`design.md`/`tasks.md` foram escritos contra a v1, que exigia essa prop.

**`expo-updates` + EAS Update para OTA, canal derivado de `app.config.ts`/`eas.json` por marca.**
Ver detalhamento completo em `.specs/features/fase-4-release-ota-mobile/validation.md` — cada
perfil de build (`mobile/eas.json`) fixa `channel` e `env.APP_BRAND`, sem `if` de marca em
`mobile/src/core/**`.

**Zustand foi aprovado na stack, mas não foi adotado — não surgiu estado de cliente que o
justificasse.** `CLAUDE.md` §3 lista Zustand como a escolha para "estado de cliente" (ex.: um
seletor de marca em runtime só para dev, `CLAUDE.md` §5.3). Esse seletor é opcional
("pode existir") e não foi implementado nesta entrega; todo o restante do estado da aplicação é
estado de servidor (TanStack Query) ou estado local de componente (`useState` em formulários,
toggles). `grep -rn "zustand" mobile/src mobile/package.json` não retorna nenhum resultado — a
biblioteca nunca foi instalada. Registrado aqui em vez de fingir um uso que não existe: não há
Redux, Context-como-store-global, nem qualquer outro mecanismo concorrente escondido no lugar dela.

## Por que não Redux Toolkit Query / SWR para estado de servidor

RTK Query amarra o app a todo o ecossistema Redux (store, slices, middleware) para resolver um
problema que TanStack Query resolve sozinho; SWR tem API mais enxuta mas sem a mesma profundidade de
mutations otimistas com rollback nativo (`onMutate`/`onError`/`onSettled`) que `CLAUDE.md` §5.6
exige para as mutations de escrita do projeto (marcar acompanhamento, aceitar/descartar ação de IA).
`mobile/src/core/patients/useSetFollowUpMutation.ts` e as demais mutations do projeto usam esse
padrão de três fases diretamente.

## Por que não offset na paginação da carteira

Com 5.000+ pacientes e busca por nome ativa, o cenário mais comum de "página desloca" não é raro:
qualquer criação/edição de paciente durante uma sessão de scroll já reordena o `LIMIT/OFFSET`
subjacente. O cursor amarra a posição a `updated_at`+`id` do último item visto, imune a esse
deslocamento — o trade-off aceito é não poder pular direto para "página 40", o que a UI de scroll
infinito do produto nunca pediu.

## Por que não CodePush para OTA

CodePush (App Center) foi descontinuado pela Microsoft; `expo-updates` é o mecanismo nativo do Expo
SDK já usado no resto do projeto, sem dependência de um serviço de terceiro desativado.

## Consequências

- Toda tela de dado segue o mesmo fluxo `schema zod → tipo inferido → fetch → parse → hook de
  Query` (`CLAUDE.md` §5.4); um dado que falha o `.parse()` do zod nunca chega ao componente — ele
  falha alto em vez de renderizar algo silenciosamente errado.
- O cache MMKV persiste só o que já foi buscado com sucesso; um paciente nunca visitado continua
  indisponível offline — é o "cache de leitura, não sincronização bidirecional completa" já
  registrado como fora de escopo em `CLAUDE.md` §15.
- Se um caso de estado de cliente genuíno aparecer no futuro (por exemplo, um filtro complexo de UI
  que precise sobreviver a navegação entre telas sem ir para a URL), Zustand já está aprovado na
  stack — não exige uma nova decisão de arquitetura, só a instalação do pacote.
- `FlashList` v2 sem `estimatedItemSize` é mais simples de usar (auto-sizing), mas divergiu do que
  `design.md` original previa — o `SPEC_DEVIATION` inline é o registro desse ajuste de versão real
  vs. planejada.
