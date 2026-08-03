# Patch do Code.gs — desfecho por canal + log de toques

Aplique as 5 trocas abaixo no seu `Code.gs`. Depois **rode `setupCRM()` uma vez**
no editor (cria as colunas novas `resultado_call`, `resultado_wpp`, `log_toques`
na aba Carteira). Elas também são criadas sozinhas no próximo carregamento do app
(a sincronização chama `garanteAba_`), mas rodar o setup garante o cabeçalho certo.

---

## 1) CAB_CARTEIRA — adicionar 3 colunas no fim

**LOCALIZAR:**
```js
  'historico_fases','atualizado','data_do_job','status_imovel'];
```
**SUBSTITUIR:**
```js
  'historico_fases','atualizado','data_do_job','status_imovel',
  'resultado_call','resultado_wpp','log_toques'];
```

## 2) Mapa C — índices de fallback

**LOCALIZAR:**
```js
  histFases:21, atualizado:22, dataJob:23, statusImovel:24};
```
**SUBSTITUIR:**
```js
  histFases:21, atualizado:22, dataJob:23, statusImovel:24,
  resultadoCall:25, resultadoWpp:26, logToques:27};
```

## 3) NOMES_CARTEIRA — nomes das colunas novas

**LOCALIZAR:**
```js
  histFases:'historico_fases', atualizado:'atualizado',
  dataJob:'data_do_job', statusImovel:'status_imovel'};
```
**SUBSTITUIR:**
```js
  histFases:'historico_fases', atualizado:'atualizado',
  dataJob:'data_do_job', statusImovel:'status_imovel',
  resultadoCall:'resultado_call', resultadoWpp:'resultado_wpp', logToques:'log_toques'};
```

## 4) jobDaCarteira_ — expor os campos novos para o front

**LOCALIZAR:**
```js
    historicoFases: String(lin[M.histFases]||''),
    atualizado: fmt_(lin[M.atualizado], 'dd/MM/yyyy HH:mm'),
    atualizadoISO: isoData_(lin[M.atualizado]),
```
**SUBSTITUIR:**
```js
    historicoFases: String(lin[M.histFases]||''),
    logToques: String(lin[M.logToques]!=null ? lin[M.logToques] : ''),
    resultadoCall: txt_(lin[M.resultadoCall]),
    resultadoWpp: txt_(lin[M.resultadoWpp]),
    atualizado: fmt_(lin[M.atualizado], 'dd/MM/yyyy HH:mm'),
    atualizadoISO: isoData_(lin[M.atualizado]),
```

## 5) salvarTratativa — substituir a função inteira

Troque toda a função `salvarTratativa(...)` por esta versão. O que muda:
- aceita `t.canal` ('call' | 'wpp'); grava o desfecho na coluna do canal
  (`resultado_call` / `resultado_wpp`);
- só incrementa o contador do canal daquele save;
- acrescenta uma linha estruturada no **log de toques** (`log_toques`):
  `[27/07/2026 14:32 usuario f:1][call] Sem contato / Não atendeu`;
- mantém `historico_fases` e o carimbo `atualizado` (o "tratado hoje" continua funcionando);
- se `t.canal` vier vazio (seção única de confirmação/snoozed), comporta-se como antes.

```js
/**
 * Salva a tratativa de UM canal por vez.
 * t = { canal ('call'|'wpp'|undefined), tabulacao, subTab, dataSnooze, obs,
 *       fase (1|2|3|'confirmacao'|'snoozed'), callFeita, wppEnviado, tentativas }
 */
function salvarTratativa(token, idImovel, t) {
  const s = sessao_(token);

  // não deixa a sincronização automática segurar o lock no meio de um salvamento
  PropertiesService.getScriptProperties().setProperty('ultimaSyncMs', String(Date.now()));

  const lock = pegaLock_(25000);
  if (!lock) return {ok: false, erro: 'Planilha ocupada no momento. Tente salvar de novo em alguns segundos.'};

  try {
    const alvo = achaNaCarteira_(idImovel);
    if (!alvo) return {ok: false, erro: 'Imóvel não encontrado na Carteira: ' + idImovel};
    const M = alvo.M;

    const dono = String(alvo.linha[M.analista] || '').trim().toLowerCase();
    if (dono && dono !== s.usuario && (s.perfil || 'analista') !== 'supervisor')
      return {ok: false, erro: 'Esta demanda pertence a outro analista.'};

    const cart = planilha_().getSheetByName(ABA_CARTEIRA);
    const range = cart.getRange(alvo.idx, 1, 1, alvo.larg);
    const linha = range.getValues()[0];
    if (!dono) linha[M.analista] = s.usuario;

    const set = (col, val) => { if (col != null && val !== undefined && val !== null && val !== '') linha[col] = val; };
    set(M.tabulacao, t.tabulacao);
    set(M.subTab, t.subTab);
    set(M.dataSnooze, t.dataSnooze);
    set(M.obs, t.obs);

    const tentativas = Math.min(30, Math.max(1, Number(t.tentativas) || 1));
    const fase  = String(t.fase || '').toLowerCase();
    const canal = String(t.canal || '').toLowerCase();       // 'call' | 'wpp' | ''
    const inc = (col, n) => { linha[col] = (Number(linha[col]) || 0) + (n || 1); };

    // com canal definido, só mexe no contador daquele canal;
    // sem canal (seção única), mantém o comportamento antigo por callFeita/wppEnviado
    const fezCall = canal ? (canal === 'call') : !!t.callFeita;
    const fezWpp  = canal ? (canal === 'wpp')  : !!t.wppEnviado;

    if (fase === '1' || fase === 'fase1') { if (fezCall) inc(M.f1Calls, tentativas); if (fezWpp) inc(M.f1Wpps); set(M.f1Tab, t.tabulacao); }
    else if (fase === '2' || fase === 'fase2') { if (fezCall) inc(M.f2Calls, tentativas); if (fezWpp) inc(M.f2Wpps); set(M.f2Tab, t.tabulacao); }
    else if (fase === '3' || fase === 'fase3') { if (fezCall) inc(M.f3Calls, tentativas); if (fezWpp) inc(M.f3Wpps); set(M.f3Tab, t.tabulacao); }
    else if (fase === 'confirmacao') set(M.confTab, t.tabulacao);
    else if (fase === 'snoozed') set(M.snoozeTab, t.tabulacao);

    // desfecho por canal
    const desfecho = (t.tabulacao || '') + (t.subTab ? ' / ' + t.subTab : '');
    if (canal === 'call' && M.resultadoCall != null) linha[M.resultadoCall] = desfecho;
    if (canal === 'wpp'  && M.resultadoWpp  != null) linha[M.resultadoWpp]  = desfecho;

    const agora = new Date();
    const carimbo = Utilities.formatDate(agora, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
    const rotuloCanal = canal
      ? '[' + canal + ']'
      : '[' + [t.callFeita ? 'call' : '', t.wppEnviado ? 'wpp' : ''].filter(Boolean).join('+') + ']';

    // log de toques estruturado (novo) — um evento por save/canal
    if (M.logToques != null) {
      const evtLog = '[' + carimbo + ' ' + s.usuario + ' f:' + (t.fase || '?') + ']' + rotuloCanal +
        (canal === 'call' && tentativas > 1 ? ' x' + tentativas : '') + ' ' + desfecho;
      linha[M.logToques] = String(linha[M.logToques] || '');
      linha[M.logToques] = linha[M.logToques] ? linha[M.logToques] + '\n' + evtLog : evtLog;
    }

    // historico_fases (mantido: alimenta os dashboards de tratativas)
    const toques = [fezCall ? (tentativas + ' call' + (tentativas > 1 ? 's' : '')) : '',
                    fezWpp ? 'wpp' : ''].filter(Boolean).join('+');
    const evento = '[' + carimbo + ' ' + s.usuario + ' f:' + (t.fase || '?') +
      (toques ? ' ' + toques : '') + '] ' + (t.tabulacao || '') + (t.subTab ? ' / ' + t.subTab : '');
    linha[M.histFases] = String(linha[M.histFases] || '');
    linha[M.histFases] = linha[M.histFases] ? linha[M.histFases] + '\n' + evento : evento;
    linha[M.atualizado] = agora;

    // Layout padrão: grava 1..atualizado (não toca data_do_job / status_imovel,
    // que podem ter ARRAYFORMULA) e escreve as colunas novas isoladamente.
    const limite = M.atualizado + 1;
    const padrao = (M.dataJob >= limite) && (M.statusImovel >= limite);
    if (padrao) {
      cart.getRange(alvo.idx, 1, 1, limite).setValues([linha.slice(0, limite)]);
      [M.resultadoCall, M.resultadoWpp, M.logToques].forEach(col => {
        if (col != null && col >= limite) cart.getRange(alvo.idx, col + 1).setValue(linha[col]);
      });
    } else {
      // layout não-padrão (colunas reordenadas): grava a linha inteira
      range.setValues([linha]);
    }
    return {ok: true};
  } finally {
    lock.releaseLock();
  }
}
```

---

## Observações
- **Ordem dos dois saves** (regra do front): em dia "Ligação + Chat", o analista
  salva a **call** e, se o desfecho for **"Sem contato"**, o app destrava o
  **WhatsApp** e exige o 2º save. Qualquer outro desfecho (Sucesso, Snoozed,
  Descarte, Já Agendado) **encerra o dia** — não força o outro canal.
- **"tratado hoje"**: continua vindo do carimbo `atualizado`. Como cada save
  atualiza `atualizado`, o lead sai de "pendente" assim que o dia é resolvido.
- **De onde vem o sucesso**: agora dá para cruzar `resultado_call` × `resultado_wpp`
  na planilha. Se quiser, no próximo passo eu ponho um gráfico "Sucesso por canal"
  no Dashboard Operacional lendo esses dois campos.
