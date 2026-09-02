# Fase 1 — Feature Flags Mobile Context

**Gathered:** 2026-09-01
**Spec:** `.specs/features/fase-1-feature-flags-mobile/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Hook `useFlag(key)` que expõe o valor efetivo de uma feature flag (defaults da marca enquanto não
carrega, valor de rede quando chega, último valor conhecido persistido entre sessões) e gate
biométrico (`expo-local-authentication`) que bloqueia a carteira até autenticação (ou fallback
tratado), consumindo `GET /api/v1/feature-flags` da feature backend irmã.

---

## Implementation Decisions

### Ordem entre gate biométrico e carregamento de flags

- O gate biométrico bloqueia a tela primeiro. Nada de conteúdo real (carteira, flags já resolvidas
  para valor de rede) renderiza antes do gate resolver (sucesso ou fallback tratado).
- O fetch de `/feature-flags` inicia em paralelo, por trás do gate — flag não é dado sensível de
  paciente (CLAUDE.md §9 é sobre dado de paciente em log, não sobre flags), então buscar antes do
  gate passar não fere a regra. Quando o gate passa, a carteira já usa o valor de rede se tiver
  chegado a tempo, ou o default da marca caso contrário — comportamento que a Fase 1 já exige
  (CLAUDE.md §5.7).
- Consequência de implementação: o provider/hook de flags precisa poder iniciar fora da árvore que
  só monta depois do gate (ou montar em paralelo, não sequencial).

### Fallback biométrico (device sem biometria cadastrada)

Fluxo combinado, não um único ramo:

1. App verifica `hasHardwareAsync()` / `isEnrolledAsync()`.
2. Se não há biometria cadastrada, mostra um aviso visível e explícito ("Este dispositivo não tem
   biometria cadastrada") — não é silencioso, o usuário sabe que o mecanismo mudou.
3. Mesmo assim, dispara `authenticateAsync({ disableDeviceFallback: false })` — deixa o SO oferecer
   a credencial de bloqueio do device (PIN/padrão/senha) como garantia mínima de que *alguma*
   verificação acontece.
4. **Se o device não tiver NENHUMA credencial de bloqueio configurada** (nem biometria, nem
   PIN/padrão/senha — `expo-local-authentication` retorna o erro `passcode_not_set` nesse caso):
   deixa passar, mas com um aviso de segurança explícito e visível ("Acesso liberado sem
   verificação — nenhuma credencial configurada neste dispositivo"). Decisão do usuário: nunca
   travar o usuário permanentemente fora do app num device sem nenhuma credencial disponível — mas
   o aviso precisa aparecer, não pode ser um bypass silencioso.
5. Nenhum desses três ramos é um `throw`/crash. Todos resolvem para "gate passou" com uma origem
   diferente (`biometric` | `device_credential` | `no_credential_available`), que fica disponível
   para a UI decidir o texto do aviso e para logs não sensíveis.

### Persistência do último valor de flag conhecido

- MMKV, nunca AsyncStorage (CLAUDE.md §3 proíbe qualquer persistência fora de MMKV).
- Como o projeto ainda não tem TanStack Query instalado (chega "oficialmente" na Fase 2, junto da
  carteira), mas CLAUDE.md §3 já proíbe `fetch` em `useEffect` como estado de servidor e fixa
  TanStack Query como a única opção aceita — a Fase 1 antecipa a instalação mínima de
  `@tanstack/react-query` + `persistQueryClient` + MMKV (o mesmo mecanismo que a Fase 2 vai reusar
  para a carteira), em vez de escrever um cache MMKV artesanal que seria descartado depois. Decisão
  de arquitetura, não de produto — registrada aqui para não ser reinventada no Design.
- Resultado prático: `useFlag(key)` é um hook fino sobre `useQuery(['feature-flags', brand])`, com
  `initialData` vindo dos `defaults` da marca ativa e o `QueryClient` persistido via MMKV.

---

## Agent's Discretion

- Estrutura de arquivos dentro de `core/flags/` e `core/offline/` (onde vive o `QueryClient`
  persistido) fica para o Design.
- Copy exata das telas de aviso biométrico fica com o Design/Execute, usando os tokens de copy da
  marca ativa (`useTheme()`), nunca string hardcoded fora de `brands/*`.

### Declined / Undiscussed Gray Areas → Assumptions

- Nenhuma — todas as áreas de ambiguidade genuína (ordem do gate, fallback biométrico, persistência)
  foram discutidas e decididas acima.

---

## Specific References

Nenhuma referência visual externa — a tela de aviso biométrico segue os quatro estados de UI já
padronizados no core (CLAUDE.md §5.5: sem "Ops!", sem spinner centralizado).

---

## Deferred Ideas

- Nenhuma — discussão ficou dentro do escopo da feature.
