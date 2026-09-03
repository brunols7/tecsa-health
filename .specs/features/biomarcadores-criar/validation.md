# Criação manual de biomarcador Validation

**Date**: 2026-09-03
**Spec**: `.specs/features/biomarcadores-criar/spec.md`
**Diff range**: `ada94c6..898b07e` (14 commits, T1-T14)
**Verifier**: independent sub-agent (author ≠ verifier)

**Verdict**: PASS ✅ — 14/14 ACs batem com o resultado definido na spec, 5/5 mutações mortas, gates
verdes nos dois lados.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 `BiomarkerCode::fromLabel()` | ✅ Done | `api/app/Domain/Biomarker/BiomarkerCode.php`, 6 testes unit, zero import `Illuminate\` |
| T2 `CreateBiomarkerData` | ✅ Done | DTO `readonly`, 6 campos tipados, sem Laravel |
| T3 `BiomarkerRepository::save()` | ✅ Done | Interface + Eloquent + `'id'` no `$fillable`, 2 testes de integração |
| T4 `PatientService::createBiomarker()` | ✅ Done | 3 testes unit com repositório mockado |
| T5 `CreateBiomarkerRequest` | ✅ Done | 6 regras, `toData()` sem lógica de negócio |
| T6 Endpoint `POST /patients/{id}/biomarkers` | ✅ Done | 7 testes Feature, rota registrada |
| T7 Mover rota para `[id]/index.tsx` | ✅ Done | `git mv` com histórico preservado (`similarity index 85%`) |
| T8 `createBiomarkerInputSchema` | ✅ Done | 6 testes novos |
| T9 `computeBiomarkerStatus()` | ✅ Done | 5 testes de borda |
| T10 `createBiomarker()` api fn | ✅ Done | 2 testes, `.parse()` presente |
| T11 `useCreateBiomarkerMutation` | ✅ Done | 4 testes (otimista, rollback, invalidate x2) |
| T12 `BiomarkerForm` | ✅ Done | 7 testes RTL |
| T13 Botão "+ Adicionar" | ✅ Done | 2 testes novos em `index.test.tsx` |
| T14 Rota `biomarkers/new.tsx` | ✅ Done | 2 testes novos |

Nenhuma task parcial ou bloqueada.

---

## Spec-Anchored Acceptance Criteria

### P1: Criar biomarcador pelo formulário

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1 — toque em "+ Adicionar" navega para o formulário do paciente | `router.push('/patients/{id}/biomarkers/new')`; botão visível com lista vazia e cheia | `mobile/src/app/patients/[id]/__tests__/index.test.tsx:197` — `expect(push).toHaveBeenCalledWith('/patients/patient-1/biomarkers/new')`; visibilidade nos dois estados em `:175` e `:181` — `expect(getByTestId('biomarkers-add-button')).toBeTruthy()` | ✅ PASS |
| AC2 — submit válido insere na lista de forma otimista, antes da resposta | item no cache antes de a promise resolver | `mobile/src/core/patients/__tests__/useCreateBiomarkerMutation.test.tsx:79-90` — cache tem `toHaveLength(2)` e `cached?.[0]` `toMatchObject({label:'Ferritina', value:40, status:'normal'})` com `resolveCreate` ainda pendente | ✅ PASS |
| AC3 — 201 invalida a query de biomarcadores para reconciliar | `invalidateQueries` com `['patient', id, 'biomarkers']` | `useCreateBiomarkerMutation.test.tsx:124-126` — `expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['patient','patient-1','biomarkers'] })` | ✅ PASS |
| AC4 — falha reverte a inserção otimista e mostra erro inline com retry, dados preservados | cache volta ao snapshot exato; formulário mantém valores; erro + ação de tentar novamente | rollback: `useCreateBiomarkerMutation.test.tsx:107-109` — `toEqual([existingBiomarker])`; UI: `mobile/src/core/ui/__tests__/BiomarkerForm.test.tsx:179-182` — `getByTestId('biomarker-form-submit-error')`, `getByTestId('biomarker-form-retry')`, `props.value).toBe('Ferritina')`, `expect(onSuccess).not.toHaveBeenCalled()` | ✅ PASS |
| AC5 — submit desabilitado enquanto pendente | botão `disabled === true` durante o voo | `BiomarkerForm.test.tsx:161` — `expect(getByTestId('biomarker-form-submit').props.accessibilityState?.disabled).toBe(true)` | ✅ PASS |
| AC6 — POST válido responde 201 com `Location` e corpo completo | 201 + header `Location` + 9 campos | `api/tests/Feature/Api/V1/PatientControllerTest.php:251-256` — `assertStatus(201)`, `assertHeader('Location', "/api/v1/patients/{$patient->id}/biomarkers")`, `assertJsonStructure(['id','code','label','value','unit','refMin','refMax','measuredAt','status'])` | ✅ PASS |
| AC7 — `code` derivado de `label` no backend, nunca aceito do cliente | slug de "Ferro sérico" → `ferro_serico` | `PatientControllerTest.php:254` — `assertJsonPath('code','ferro_serico')` (payload não envia `code`); unit `api/tests/Unit/PatientServiceTest.php:367` — `assertSame('ferro_serico', $result->code)`; regras de slug em `api/tests/Unit/BiomarkerCodeTest.php:14-39` (6 casos) | ✅ PASS |
| AC8 — `status` calculado via `BiomarkerStatus::from()`, nunca aceito do cliente | valor fora da faixa vira `high` mesmo sem `status` no payload | `PatientServiceTest.php:405` — `assertSame(BiomarkerStatus::High, $result->status)` com `value:250, refMax:200`; e2e `PatientControllerTest.php:256` — `assertJsonPath('status','normal')`. `CreateBiomarkerRequest::rules()` não tem chave `status`/`code`, logo `validated()` não pode carregá-los | ✅ PASS |

### P2: Validação e feedback de erro

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1 — `label` vazio bloqueia envio, sem chamar a API | erro no campo + zero chamadas de rede | `BiomarkerForm.test.tsx:104-106` — `getByTestId('biomarker-form-label-input-error')` e `expect(mockedCreateBiomarker).not.toHaveBeenCalled()`; schema em `mobile/src/core/api/schemas/__tests__/biomarker.test.ts:79-82` | ✅ PASS |
| AC2 — `value`/`refMin`/`refMax` não numéricos ou vazios bloqueiam, sem chamar a API | erro de campo inválido + zero chamadas | `BiomarkerForm.test.tsx:116-117` — erro em `value` e `not.toHaveBeenCalled()`; schema `biomarker.test.ts:85-88` (`value: 'quarenta'` rejeitado) | ✅ PASS |
| AC3 — `refMin` maior que `refMax` bloqueia com mensagem no mínimo/máximo | envio bloqueado, erro apontando o campo | `BiomarkerForm.test.tsx:128-129` — `getByTestId('biomarker-form-ref-max-input-error')` + `not.toHaveBeenCalled()`; `biomarker.test.ts:110-112` — `result.error.issues[0].path` `toEqual(['refMax'])` | ✅ PASS |
| AC4 — `value <= 0` ou `refMin` negativo bloqueiam com valor inválido | schema rejeita ambos | `biomarker.test.ts:91-94` (`value: 0` → `success` `false`) e `:97-100` (`refMin: -1` → `success` `false`) | ✅ PASS |
| AC5 — backend responde 422 com erros de campo no envelope padrão | 422 + `error.code: VALIDATION_ERROR` | `PatientControllerTest.php:294-295` (label vazio), `:312-313` (value não numérico), `:330-331` (`refMin >= refMax`), `:348-349` (`value <= 0`) — todos `assertStatus(422)` + `assertJsonPath('error.code','VALIDATION_ERROR')` | ✅ PASS |
| AC6 — `patientId` inexistente responde 404 `PATIENT_NOT_FOUND` reusando `PatientNotFound` | 404 + código de erro exato | `PatientControllerTest.php:363-364` — `assertStatus(404)` + `assertJsonPath('error.code','PATIENT_NOT_FOUND')`; unit `PatientServiceTest.php:425-429` — `shouldNotReceive('save')` + `expectException(PatientNotFound::class)` (prova que não persiste antes) | ✅ PASS |

**Status**: ✅ 14/14 ACs cobertas e com valor asserido igual ao definido na spec. Zero spec-precision
gaps: toda Aca define um resultado preciso (status, chave de erro, valor de campo) e o teste mira
exatamente esse valor.

---

## Discrimination Sensor

Isolamento: `git worktree add` em `scratchpad/sensor` (nunca `git stash`). Durante o preparo, o
symlink de `api/vendor` fez o autoloader do Composer resolver `App\` de volta para a árvore real
(PHP resolve `__DIR__` através de symlink), o que anulava as mutações no backend. Corrigido com
cópia real de `vendor` + `composer dump-autoload` no worktree, mais `.env.testing` (gitignored,
ausente no worktree). Rodada de controle sem mutação depois da correção: 9 testes, 32 asserções,
zero falhas — harness validado antes de contar qualquer kill.

| Mutation | File:line | Description | Killed? |
| --- | --- | --- | --- |
| 1 | `mobile/src/core/patients/biomarkerStatus.ts:4` | Borda `value < refMin` → `value <= refMin` | ✅ Killed (1 falha: "retorna normal quando o valor é igual ao refMin") |
| 2 | `api/app/Application/Patient/PatientService.php:79-81` | Removido o `throw new PatientNotFound` de `createBiomarker` | ✅ Killed (2 falhas: unit `throws patient not found before saving` + Feature `returns 404 when patient does not exist`) |
| 3 | `api/app/Http/Requests/CreateBiomarkerRequest.php:27` | Regra `gt:refMin` → `gte:refMin` | ✅ Killed (1 falha: `returns 422 when ref min is greater than or equal to ref max`) |
| 4 | `api/app/Http/Controllers/Api/V1/PatientController.php:74` | `setStatusCode(201)` → `setStatusCode(200)` | ✅ Killed (2 falhas: `creates a biomarker and returns 201...` + `created biomarker persists...`) |
| 5 | `mobile/src/core/patients/useCreateBiomarkerMutation.ts:46` | Removido o rollback `setQueryData(queryKey, context?.previous)` do `onError` | ✅ Killed (1 falha: "reverte para o snapshot anterior quando a mutation falha") |

**Sensor depth**: lightweight, ampliado para 5 mutações (cobre as duas stacks e as quatro regras de
maior risco: borda de status, guarda de existência, cross-field de faixa, status HTTP, rollback).
**Result**: 5/5 killed — PASS ✅
**Isolamento verificado**: `git status --porcelain` idêntico ao baseline pré-sensor (3 arquivos de
spec untracked), worktree removido com `--force` + `git worktree prune`.

---

## Interactive UAT Results

⏭️ Skipped — sessão sem usuário disponível (job em background). Não é uma falha; os itens
user-facing (navegação, selo ao vivo, erro inline, botão desabilitado) têm cobertura automatizada
via RTL, listada nas ACs P1 1/4/5 e P2 1-4.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ Sem abstração especulativa; `BiomarkersSection` ficou local ao arquivo de rota, sem `Input` genérico em `core/ui/` |
| Surgical changes | ✅ T7 é `git mv` puro (`similarity index 85%`, só o import auto-referente do teste mudou), separado do commit de comportamento |
| No scope creep | ✅ Nada de editar/excluir biomarcador, import em lote ou autocomplete — tudo listado em Out of Scope permaneceu fora |
| Matches patterns | ✅ `final class` + `authorize(): true` como `UpdateFollowUpRequest`; `Uuid::uuid4()` como `AiActionService`; mutation no padrão de `useSetFollowUpMutation` |
| Spec-anchored outcome check | ✅ 14/14 asserções miram o valor exato da spec |
| Per-layer Coverage Expectation | ✅ Domínio 1:1 (`BiomarkerCode` 6 casos, `computeBiomarkerStatus` 5 bordas); rota cobre happy + 4x 422 + 404 |
| Todo teste mapeia a um requisito | ✅ Nenhum teste órfão nos 46 novos |
| Guidelines seguidas | ✅ `CLAUDE.md` §2.1 (boundary de marca passa), §2.2 (controller sem `if`/cálculo/Eloquent), §2.3 (`strict_types`, PHPStan 6 limpo, `tsc` limpo), §5.6 (otimista com rollback), §12 (zero comentário descritivo no código de produção) |

Conformidade arquitetural conferida diretamente: `Domain/Biomarker/BiomarkerCode.php` e
`CreateBiomarkerData.php` não importam `Illuminate\`; `PatientService` não toca Eloquent;
`PatientController::createBiomarker` é fio puro (FormRequest → Service → Resource);
`check-layer-boundary.sh` e `check-brand-boundary.sh` passam.

---

## Edge Cases

- [x] **Falha + rollback mantém o usuário no formulário com valores intactos** — `BiomarkerForm.test.tsx:179-182`: erro inline e `props.value` ainda `'Ferritina'`, `onSuccess` não chamado, sem navegação.
- [x] **Rascunho descartado ao sair da tela** — satisfeito estruturalmente: `BiomarkerForm` mantém o estado só em `useForm`, sem nenhuma persistência local; desmontar a tela descarta. Sem teste dedicado (comportamento por ausência de código).
- [x] **Dois biomarcadores com o mesmo `label` são aceitos** — nenhuma constraint de unicidade em `biomarkers` (migration inalterada) e `save()` não checa duplicidade. Sem teste dedicado.
- [ ] **Precisão além de `decimal(10,4)` rejeitada com 422 antes do INSERT** — ⚠️ implementado mas NÃO testado. `CreateBiomarkerRequest::rules()` tem `decimal:0,4` e `max:999999.9999` nos três campos numéricos (`api/app/Http/Requests/CreateBiomarkerRequest.php:24,26,27`), o que satisfaz o edge case, mas nenhum teste assere o 422 para 5 casas decimais ou 7 dígitos inteiros. Por evidence-or-zero: não coberto. Não bloqueia (não é AC; o caminho de escrita está protegido), mas é a lacuna de teste mais relevante da feature.

---

## Gate Check

- **Gate command (Build)**: backend `cd api && composer lint && composer stan && composer test`; mobile `cd mobile && npx tsc --noEmit && npm run pretest && npm test`

| Comando | Exit | Resultado |
| --- | --- | --- |
| `composer lint` (Pint) | 0 | `{"tool":"pint","result":"passed"}` |
| `composer stan` (PHPStan nível 6) | 0 | 86/86 arquivos, `[OK] No errors` (sem OOM nesta máquina; `--memory-limit` não foi necessário) |
| `composer test` (boundary script + Pest) | 0 | 203 testes, 535 asserções, 0 falhas |
| `npx tsc --noEmit` | 0 | limpo |
| `npm run pretest` (eslint + brand boundary) | 0 | `OK: nenhuma referência a marca encontrada em src/core` |
| `npm test` (Jest) | 0 | 35 suítes, 192 testes, 0 falhas |

- **Test count antes da feature**: ~185 backend / ~164 mobile
- **Test count depois**: 203 backend / 192 mobile
- **Delta**: +18 backend, +28 mobile (46 testes novos)
- **Skipped tests**: nenhum
- **Failures**: nenhuma
- **Nota de ambiente**: a suíte backend reporta 168 testes como `DEPR`. É a deprecação
  `Constant PDO::MYSQL_ATTR_SSL_CA is deprecated since 8.5` disparada por
  `vendor/laravel/framework/config/database.php`, que atinge toda a suíte (inclusive testes que esta
  feature não tocou) e não altera o exit code nem as asserções. Ruído de ambiente pré-existente, não
  regressão desta feature.

---

## Fix Plans

Nenhum blocker. Uma melhoria opcional, não bloqueante:

### Fix 1 (Minor, opcional): cobrir o edge case de precisão numérica

- **Root cause**: as regras `decimal:0,4` e `max:999999.9999` existem em `CreateBiomarkerRequest`,
  mas nenhum teste as exercita, então uma remoção acidental dessas regras passaria pelos gates.
- **Fix task**: adicionar 2 testes em `api/tests/Feature/Api/V1/PatientControllerTest.php` — POST com
  `value: 40.12345` (5 casas) e POST com `value: 1234567.0` (7 dígitos inteiros), ambos esperando
  `assertStatus(422)` + `assertJsonPath('error.code','VALIDATION_ERROR')`.
- **Priority**: Minor

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| BIOM-01 | Implementing | ✅ Verified |
| BIOM-02 | Implementing | ✅ Verified |
| BIOM-03 | Implementing | ✅ Verified |
| BIOM-04 | Implementing | ✅ Verified |
| BIOM-05 | Implementing | ✅ Verified |
| BIOM-06 | Implementing | ✅ Verified |
| BIOM-07 | Implementing | ✅ Verified |
| BIOM-08 | Implementing | ✅ Verified |
| BIOM-09 | Implementing | ✅ Verified |
| BIOM-10 | Implementing | ✅ Verified |
| BIOM-11 | Implementing | ✅ Verified |
| BIOM-12 | Implementing | ✅ Verified |
| BIOM-13 | Implementing | ✅ Verified |
| BIOM-14 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 14/14 ACs com valor asserido igual ao da spec, 0 spec-precision gaps
**Sensor**: 5/5 mutações mortas
**Gate**: 6 comandos, todos exit 0 (203 testes backend, 192 mobile)

**What works**:
- Criação ponta a ponta: `POST /api/v1/patients/{id}/biomarkers` devolve 201 com `Location` e corpo completo.
- `code` e `status` derivados no backend; nenhum dos dois é aceito do cliente (não existem nas `rules()`, logo não sobrevivem ao `validated()`).
- Mutation otimista real: insere antes da resposta, reverte para o snapshot exato em erro, invalida a `queryKey` certa em sucesso e em falha.
- Formulário bloqueia os 4 casos inválidos sem tocar a rede, mostra selo de status ao vivo nos três estados e preserva os dados digitados quando a criação falha.
- Fronteiras arquiteturais intactas: `Domain/` sem Laravel, Service sem Eloquent, controller sem regra, `src/core/` sem marca.

**Issues found**: um edge case da spec (precisão `decimal(10,4)`) está implementado mas não tem
teste. Não bloqueia a entrega; ver Fix 1.

**Next steps**: feature pronta para merge. Opcionalmente aplicar Fix 1 antes de fechar, e rodar UAT
interativo quando houver usuário disponível.
