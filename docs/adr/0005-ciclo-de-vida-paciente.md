# ADR-0005: Status de acompanhamento e exclusão são coisas diferentes, não um enum só

**Status:** aceita e implementada.

No começo do projeto, um paciente só tinha dois estados possíveis: existe ou não existe. Não havia
distinção entre "esse paciente saiu do acompanhamento ativo" (mudou de nutricionista, pausou o
plano) e "esse registro foi removido por engano ou por pedido". Durante a fase de melhorias de UX,
o pedido do usuário foi direto: deveria existir um estado de acompanhamento, com inativos e
concluídos aparecendo numa filtragem separada, e excluídos não aparecendo em lugar nenhum — ou seja,
dois conceitos diferentes, com regras de visibilidade diferentes.

A opção mais óbvia à primeira vista seria um único enum cobrindo tudo:
`status: active | inactive | completed | deleted`. Foi considerada e descartada.

## O que decidimos

Tratar ciclo de vida de acompanhamento e exclusão como **dois mecanismos independentes**, que nunca
se misturam num campo só.

**O `status`** é uma coluna com três valores possíveis — `active`, `inactive`, `completed` — e as
transições entre eles são restritas por regra: pode ir de `active` para `inactive` e vice-versa,
pode ir de `active` para `completed` e vice-versa, mas nunca direto de `inactive` para `completed`
(precisa passar por `active` no meio). Essa regra vive inteira no Domain, como um enum PHP com um
método `canTransitionTo()` — nenhuma dependência de Laravel, nenhuma consulta ao banco, então é
testável em milissegundos. Quando alguém tenta uma transição inválida, o Service correspondente
lança uma exceção de domínio própria em vez de deixar o banco aceitar qualquer coisa.

**A exclusão** usa o soft delete padrão do Eloquent (`SoftDeletes`, coluna `deleted_at`). Isso
significa que nenhuma query do projeto precisa se lembrar manualmente de filtrar registros
excluídos — o próprio Eloquent já esconde esses registros de toda leitura padrão através do seu
global scope automático.

## Por que não um enum único misturando os dois

Um enum combinado exigiria que todo repositório e toda query soubessem filtrar manualmente
`WHERE status != 'deleted'` — reintroduzindo à mão exatamente o mecanismo que o soft delete do
Eloquent já resolve sozinho. Também tornaria uma coisa razoável ("restaurar um paciente excluído
sem perder o status de acompanhamento que ele tinha antes") difícil de expressar sem guardar um
histórico paralelo. Com os dois eixos separados, restaurar um paciente simplesmente devolve o
registro com o `status` que ele já tinha — porque a exclusão nunca tocou nesse campo.

Tem também uma questão mais conceitual: um enum único misturaria duas perguntas de negócio bem
diferentes — "este paciente está em acompanhamento?" e "este registro deveria sequer existir?" — na
mesma coluna. Isso obrigaria toda regra de transição a considerar também o caso `deleted`,
multiplicando a complexidade sem necessidade real.

## O que isso significa na prática

Filtrar a carteira por status (ativos, inativos, concluídos) é uma consulta direta, sem se
preocupar em excluir registros deletados — isso já está garantido antes mesmo de a query do
repositório rodar. Qualquer regra nova sobre "quem pode ver o quê" precisa decidir explicitamente
se é uma questão de `status` (visível, mas filtrado por padrão) ou de exclusão (nunca visível) — a
modelagem não deixa essa distinção ambígua, mas exige que quem escreve a query saiba qual das duas
perguntas está fazendo. E como a regra de transição é um enum PHP puro, ela tem testes cobrindo
cada transição válida e cada uma inválida sem precisar de banco de dados.
