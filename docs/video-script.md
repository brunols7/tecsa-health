# Roteiro do vídeo (3-5 minutos)

Ordem das seções segue o peso da rubrica de avaliação (`CLAUDE.md` §1). Cada seção nomeia a
tela ou comando exato a mostrar — não é para narrar sobre o código, é para provar ao vivo.

Tempo total alvo: **4 minutos**. Os tempos por seção são um guia, não um cronômetro rígido —
ajuste ao vivo, mas não deixe nenhuma seção estourar o dobro do previsto.

---

## 1. App core multimarca e arquitetura mobile — peso 32% (≈ 1min15s)

**Tela**: terminal + os dois apps lado a lado (simulador iOS + emulador Android, ou dois
simuladores).

1. (0:00-0:15) Terminal: `APP_BRAND=nutri-care npx expo start` num terminal,
   `APP_BRAND=vita-plus npx expo start` noutro (portas diferentes). Abrir os dois.
2. (0:15-0:45) Mostrar a carteira de pacientes nas duas marcas lado a lado — apontar a
   diferença real de densidade, raio, tipografia e copy (NutriCare clínica/sóbria vs. VitaPlus
   bem-estar), não só cor de botão trocada. Rolar a lista rápido pra mostrar que não trava com
   5.000+ pacientes (`FlashList`).
3. (0:45-1:00) Abrir `mobile/src/core/theme/brand.types.ts` no editor, mostrar o contrato
   `Brand` — apontar que é tipo, não `if`. Abrir `mobile/eslint.config.js` e rodar
   `bash mobile/scripts/check-brand-boundary.sh` no terminal, mostrar saída limpa.
4. (1:00-1:15) Abrir um componente de `mobile/src/core/ui/` e mostrar `useTheme()` sendo
   consumido — nenhum literal de cor/raio/fonte no arquivo.

## 2. Plataforma e release — flag, OTA, nativo, offline — peso 23% (≈ 55s)

**Tela**: terminal + app mobile + `psql`/Tinker.

1. (1:15-1:35) Terminal: virar `aiActionsEnabled` para `false` no banco
   (`docker compose exec db psql -U tecsa -d tecsa_health -c "UPDATE feature_flags SET
   enabled = false WHERE key = 'aiActionsEnabled';"`), mostrar a superfície de IA sumir no app
   sem reiniciar (refetch de flag). Chamar `POST /patients/:id/ai-actions` via curl, mostrar
   `503`.
2. (1:35-1:50) Modo avião no device/simulador: mostrar a carteira de pacientes continuando
   legível (cache `persistQueryClient`/MMKV), banner de offline visível.
3. (1:50-2:10) `eas update --branch nutri-care-development --message "demo OTA"`, mostrar o
   bundle chegando num dev client já instalado (reabrir o app ou puxar o update manualmente) —
   sem passar por loja.

## 3. API e camadas do backend — peso 13% (≈ 40s)

**Tela**: editor + terminal.

1. (2:10-2:25) Abrir `api/app/Http/Controllers/Api/V1/PatientController.php` — mostrar que só
   chama Service e devolve Resource, sem Eloquent. Abrir
   `api/app/Application/Patient/PatientService.php` e `api/app/Domain/Patient/PatientRepository.php`
   (interface) lado a lado.
2. (2:25-2:40) Terminal: `bash api/scripts/check-layer-boundary.sh`, mostrar saída limpa. Abrir
   `http://localhost:9000/docs/api` (Scramble) no navegador, mostrar o contrato OpenAPI gerado
   do código.
3. (2:40-2:50) `docker compose down -v && docker compose up -d --wait` do zero (pode ser
   cortado/acelerado no vídeo), terminando com `curl -f http://localhost:9000/up` → 200.

## 4. IA e pensamento de produto — peso 10% (≈ 30s)

**Tela**: app mobile + editor.

1. (2:50-3:05) No app (com `aiActionsEnabled` de volta a `true`), abrir um paciente com
   biomarcador fora da faixa, clicar em "Gerar ações", mostrar o disclaimer clínico e as ações
   chegando com status `pending`. Aceitar uma, descartar outra — mostrar que nada é aplicado
   sozinho.
2. (3:05-3:20) Abrir `api/app/Infrastructure/Llm/AnthropicClient.php` (ou `GeminiClient.php`),
   apontar a validação de schema da resposta do LLM antes de virar entidade de domínio.

## 5. Testes — peso 8% (≈ 25s)

**Tela**: terminal.

1. (3:20-3:35) `cd api && composer test` — mostrar a contagem de testes passando (Pest,
   `BiomarkerStatus::from()` incluso).
2. (3:35-3:45) `cd mobile && npm test` — mostrar a contagem de testes passando (Jest + RNTL),
   incluindo o teste que compara tokens entre as duas marcas.

---

## Fechamento (≈ 15s, opcional se sobrar tempo)

Uma frase mencionando onde fica a documentação de apoio: ADRs em `docs/adr/`, relatório de uso
de IA e diagrama de arquitetura no `README.md` raiz.

---

**Soma dos tempos por seção**: 1:15 + 0:55 + 0:40 + 0:30 + 0:25 = 3:45, mais até 15s de
fechamento — cabe dentro da janela de 3 a 5 minutos exigida.
