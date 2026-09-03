# ADR-0005: `status` de acompanhamento independente de exclusão (soft delete)

## Status

Aceita

## Contexto

O produto original (Fases 0-3) só tinha "paciente existe" ou "paciente não existe" — sem
distinção entre um paciente que saiu do acompanhamento ativo (mudou de nutricionista, pausou o
plano) e um paciente removido por engano ou por pedido explícito. Na Fase 6
(`fase-6-melhorias-ux-backend`), o usuário pediu explicitamente: "deveria ter estados de
acompanhamento... os inativos e concluídos aparecem em uma filtragem à parte... excluídos não
aparecem" — dois conceitos distintos com regras de visibilidade diferentes, não um único campo.

A alternativa considerada e descartada foi um único enum cobrindo os dois eixos ao mesmo tempo (por
exemplo, `status: active | inactive | completed | deleted`), o que pareceria mais simples à
primeira vista.

## Decisão

`status` (ciclo de vida do acompanhamento) e exclusão (`deleted_at`) são **dois mecanismos
independentes**, nunca fundidos num enum único.

**`status`** é uma coluna Postgres com três valores — `active`, `inactive`, `completed` — modelada
como enum PHP em `app/Domain/Patient/PatientStatus.php:7-11`, com transições válidas restritas por
`canTransitionTo()` (`PatientStatus.php:13-21`): `active⇄inactive`, `active⇄completed`, nunca
`inactive⇄completed` direto (precisa passar por `active`). `PatientService::changeStatus()`
(`app/Application/Patient/PatientService.php:137-153`) carrega o paciente, valida a transição via
`canTransitionTo()` e lança `InvalidStatusTransition` (`app/Domain/Patient/Exceptions/
InvalidStatusTransition.php`) se ela não for permitida — a regra vive inteira no Domain/Application,
testável sem HTTP nem banco.

**Exclusão** usa `SoftDeletes` padrão do Eloquent (`app/Infrastructure/Persistence/Eloquent/Models/
Patient.php:13,31`, coluna `deleted_at`). `PatientService::delete()`
(`PatientService.php:157-161`) chama `$this->patients->delete($id)`, que delega ao
`SoftDeletes::delete()` do model — nenhum filtro manual em query nenhuma: o global scope automático
do Eloquent já exclui registros com `deleted_at` preenchido de toda leitura padrão.

## Por que não um enum único misturando os dois eixos

Um enum único (`active|inactive|completed|deleted`) obrigaria todo repositório e toda query a
filtrar manualmente `WHERE status != 'deleted'` — reintroduzindo, à mão, exatamente o mecanismo que
o `SoftDeletes` do Eloquent já dá de graça via global scope. Também tornaria "restaurar um paciente
excluído sem saber que status de acompanhamento ele tinha antes" impossível de expressar sem um
histórico paralelo: com os dois eixos separados, restaurar (`restore()` do Eloquent) simplesmente
devolve o paciente com o `status` que ele já tinha, porque `status` nunca foi tocado pela exclusão.
Um enum combinado também misturaria duas perguntas de negócio diferentes — "este paciente está em
acompanhamento?" vs. "este registro deveria existir?" — na mesma coluna, forçando toda regra de
transição a também considerar o caso `deleted`, o que multiplicaria os casos de
`canTransitionTo()` sem necessidade real.

## Consequências

- Filtragem por status (`active`/`inactive`/`completed`) na carteira de pacientes é um `WHERE
  status IN (...)` direto, sem se preocupar em excluir registros deletados — o global scope do
  Eloquent já faz isso antes da query do repositório rodar.
- Restaurar um paciente excluído (fora do escopo desta entrega, mas viável com a modelagem atual)
  não perde o `status` de acompanhamento que ele tinha — os dois eixos nunca se sobrescrevem.
- Qualquer nova regra de negócio sobre "quem pode ver o quê" tem que decidir explicitamente se é
  uma regra de `status` (visível, mas filtrado) ou de exclusão (nunca visível) — a modelagem não
  deixa essa distinção ambígua, mas exige que quem escreve uma query nova saiba qual das duas
  perguntas está fazendo.
- `PatientStatus::canTransitionTo()` sendo um enum puro, sem Eloquent, é testável em
  `tests/Unit/PatientStatusTest.php` e em `tests/Unit/PatientServiceTest.php`, cobrindo cada
  transição válida e cada uma inválida, sem `RefreshDatabase`.
