# ADR-0004: A stack do mobile, e por que cada peça dela existe de verdade no projeto

**Status:** aceita e implementada.

O desafio já fixa boa parte da stack mobile antes de qualquer código ser escrito — Expo Router,
TanStack Query, Zustand, MMKV, FlashList, `expo-updates` — e não deixa muito espaço para trocar por
outra coisa. Esta ADR não é uma lista de tecnologias escolhidas no vácuo; é o porquê de cada uma ter
sido realmente necessária no projeto, tal como ele foi construído.

## TanStack Query para todo estado que vem do servidor

Toda tela que busca dado — carteira de pacientes, detalhe do paciente, biomarcadores, ações de IA,
feature flags — usa um hook de query próprio construído sobre `useQuery`/`useMutation`. Nunca um
`fetch` solto dentro de `useEffect`. Isso dá cache, revalidação, estado de loading/erro e mutations
otimistas de graça, sem reinventar nada disso na mão.

## Cache MMKV para a carteira continuar legível offline

`persistQueryClient` liga o `QueryClient` único do projeto a um `Persister` sobre
`react-native-mmkv`. Na prática, isso significa que a carteira de pacientes e qualquer detalhe de
paciente já visitado continuam legíveis com o aparelho em modo avião — não é sincronização
bidirecional completa (isso está fora de escopo, documentado no README), é cache de leitura: o que
já foi buscado com sucesso uma vez fica disponível offline; o que nunca foi visitado, não.

## Paginação por cursor, não por página/offset

Com mais de 5.000 pacientes no seed e busca por nome ativa, paginação por offset tem um problema
real aqui: qualquer paciente criado ou editado durante uma sessão de scroll desloca os índices de
todo mundo que vem depois, causando item duplicado ou pulado na página seguinte. Cursor não sofre
disso, porque aponta para a posição de um registro específico, não para um índice absoluto na
lista. O trade-off é não conseguir pular direto para "página 40" — coisa que a UI de scroll
infinito deste produto nunca pediu para começo de conversa.

## FlashList na carteira, nunca FlatList

Uma lista de 5.000+ itens renderizada com `FlatList`/`ScrollView.map()` trava a rolagem — é
basicamente o motivo de o desafio marcar "ausência de virtualização" como motivo de eliminação.
`FlashList` está na lista de pacientes com `keyExtractor` estável. Vale uma nota honesta: a versão
instalada (`flash-list@2.0.2`) removeu a prop `estimatedItemSize` que a v1 exigia — o código tem
esse ajuste marcado como `SPEC_DEVIATION` no próprio arquivo, porque a documentação original do
projeto foi escrita contra a v1.

## `expo-updates` + EAS Update para OTA

Cada marca tem seu próprio canal de atualização, derivado do perfil de build (`eas.json`) — nunca
um `if` de marca dentro do código compartilhado. É o mecanismo oficial do próprio Expo, então não
depende de nenhum serviço de terceiro. Isso importa porque a alternativa mais conhecida no mercado,
CodePush, foi descontinuada pela Microsoft — escolher `expo-updates` evita amarrar o projeto a algo
que já não tem manutenção.

## Zustand: aprovado, mas não usado — e isso é intencional, não esquecimento

Zustand está na lista de tecnologias aprovadas para "estado de cliente" (o exemplo típico seria um
seletor de marca em runtime, só para desenvolvimento). Mas esse seletor é opcional e não foi
implementado nesta entrega, e todo o resto do estado da aplicação já é coberto por TanStack Query
(estado de servidor) ou por `useState` local em formulários e toggles (estado de componente). A
biblioteca nunca chegou a ser instalada — é melhor registrar isso com clareza do que fingir um uso
que não existe. Também não há Redux nem Context usado como store global escondido no lugar dela.

## O que isso significa na prática

Toda tela de dado segue o mesmo caminho: um schema zod valida a resposta, um tipo é inferido dele,
uma função de fetch busca o dado, o `.parse()` do zod confere a forma antes de qualquer coisa
chegar ao componente. Um dado que não bate com o schema nunca renderiza silenciosamente errado —
ele falha alto, o que é bem melhor do que descobrir um bug de contrato em produção. E se um caso de
estado de cliente genuíno aparecer no futuro — um filtro complexo que precise sobreviver a
navegação entre telas, por exemplo — Zustand já está aprovado na stack; adotá-lo não exigiria uma
nova decisão de arquitetura, só instalar o pacote.
