const ID_PLANILHA = '1TD-tswq2BPmC6LKOA4X4wwgNKCG-7T9Cl4TLzA48UXo';

const ABA_DEMANDAS = 'Demandas';
const ABA_CARTEIRA = 'Carteira';
const ABA_USUARIOS = 'Usuarios';
const ABA_ACESSOS = 'Acessos';
const SESSAO_HORAS = 8;

const CAB_DEMANDAS = ['data_mailing','id_imovel','id_pp','primeiro_nome','magiclink',
  'motivo_cancelamento','motivo_reportado','analista'];
const D = {dataMailing:0, idImovel:1, idPP:2, primeiroNome:3, magiclink:4,
  motivoCanc:5, motivoReportado:6, analista:7};

const CAB_CARTEIRA = ['id_imovel','data_mailing','id_pp','primeiro_nome','magiclink','analista',
  'tabulacao','sub_tabulacao','data_snooze','obs',
  'fase1_calls','fase1_wpps','fase2_calls','fase2_wpps','fase3_calls','fase3_wpps',
  'fase1_tabulacao','fase2_tabulacao','fase3_tabulacao','confirmacao_tabulacao','snoozed_tabulacao',
  'historico_fases','atualizado','data_do_job','status_imovel',
  'resultado_call','resultado_wpp','log_toques'];
const C = {idImovel:0, dataMailing:1, idPP:2, primeiroNome:3, magiclink:4, analista:5,
  tabulacao:6, subTab:7, dataSnooze:8, obs:9,
  f1Calls:10, f1Wpps:11, f2Calls:12, f2Wpps:13, f3Calls:14, f3Wpps:15,
  f1Tab:16, f2Tab:17, f3Tab:18, confTab:19, snoozeTab:20,
  histFases:21, atualizado:22, dataJob:23, statusImovel:24,
  resultadoCall:25, resultadoWpp:26, logToques:27};

const CAB_ACESSOS = ['entrada','saida','analista','duracao_min'];
const CAB_USUARIOS = ['usuario','senha','nome','ativo','perfil'];

/* ── Mapa de colunas pelo cabeçalho da aba Carteira ──
   Torna o CRM resiliente a colunas movidas/renomeadas na planilha
   (aceita variações como "status imóvel", "Data do Job" etc). */
const NOMES_CARTEIRA = {idImovel:'id_imovel', dataMailing:'data_mailing', idPP:'id_pp',
  primeiroNome:'primeiro_nome', magiclink:'magiclink', analista:'analista',
  tabulacao:'tabulacao', subTab:'sub_tabulacao', dataSnooze:'data_snooze', obs:'obs',
  f1Calls:'fase1_calls', f1Wpps:'fase1_wpps', f2Calls:'fase2_calls', f2Wpps:'fase2_wpps',
  f3Calls:'fase3_calls', f3Wpps:'fase3_wpps',
  f1Tab:'fase1_tabulacao', f2Tab:'fase2_tabulacao', f3Tab:'fase3_tabulacao',
  confTab:'confirmacao_tabulacao', snoozeTab:'snoozed_tabulacao',
  histFases:'historico_fases', atualizado:'atualizado',
  dataJob:'data_do_job', statusImovel:'status_imovel',
  resultadoCall:'resultado_call', resultadoWpp:'resultado_wpp', logToques:'log_toques'};

function normCab_(v){
  return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .trim().replace(/\s+/g,'_');
}
function mapaCarteira_(aba){
  const cab = aba.getRange(1,1,1,aba.getLastColumn()).getValues()[0].map(normCab_);
  const m = {};
  for (const k in NOMES_CARTEIRA){
    const i = cab.indexOf(NOMES_CARTEIRA[k]);
    m[k] = (i >= 0) ? i : C[k]; // fallback para posição padrão
  }
  return m;
}

/* ── Conversão de datas (VERSÃO ÚNICA E CANÔNICA) ──
   Converte Date, "yyyy-mm-dd", "yyyy-m-d", "dd/mm/aaaa" e textos com hora
   para ISO "yyyy-MM-dd". Devolve '' quando não reconhece.
   IMPORTANTE: só existe UMA isoData_ no arquivo — duas definições
   fariam a segunda sobrescrever a primeira e bagunçar as datas. */
function isoData_(v){
  if (v instanceof Date) {
    return isNaN(v) ? '' : Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  const s = String(v == null ? '' : v).trim();
  if (!s) return '';
  // yyyy-mm-dd ou yyyy-m-d (com ou sem hora depois)
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + '-' + ('0'+m[2]).slice(-2) + '-' + ('0'+m[3]).slice(-2);
  // dd/mm/aaaa (com ou sem hora depois)
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[3] + '-' + ('0'+m[2]).slice(-2) + '-' + ('0'+m[1]).slice(-2);
  return '';
}

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('FUP Fotos · Carteirização FSS')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function planilha_() { return SpreadsheetApp.openById(ID_PLANILHA); }

/* ═══════════ AUTENTICAÇÃO POR EMAIL GOOGLE ═══════════ */
var DOM_SUPERVISOR = ['quintoandar.com.br', 'quintoandar.com'];
var DOM_ANALISTA   = ['webhelpbr.com.br', 'webhelp.com', 'webhelpbr.com', 'br.webhelp.com', 'concentrix.com'];

var SUPERVISORES_FIXOS = [
  'oliveira.hilary@webhelpbr.com.br',
  'juliani.matheus@webhelpbr.com.br',
  'douglas.oliveira@webhelpbr.com.br',
  'vieira.leila@webhelpbr.com.br',
  'neto.vander@webhelpbr.com.br',
  'glowacki.hemilly@webhelpbr.com.br'
];

function emailAtual_() {
  var e = '';
  try { e = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); } catch (x) {}
  if (!e) { try { e = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase(); } catch (x) {} }
  return e;
}
function usuarioDoEmail_(email) {
  return String(email || '').split('@')[0].trim().toLowerCase();
}
function dominioDoEmail_(email) {
  return String(email || '').split('@')[1] || '';
}
function listaDaAba_(nomeAba) {
  try {
    var aba = planilha_().getSheetByName(nomeAba);
    if (!aba || aba.getLastRow() < 2) return [];
    return aba.getRange(2, 1, aba.getLastRow() - 1, 1).getValues()
      .map(function (l) { return String(l[0] || '').trim().toLowerCase(); }).filter(Boolean);
  } catch (e) { return []; }
}

function identificarUsuario_() {
  var email = emailAtual_();
  if (!email) return { ok: false, erro: 'SEM_EMAIL' };

  if (listaDaAba_('EmailsBloqueados').indexOf(email) !== -1)
    return { ok: false, erro: 'BLOQUEADO', email: email };

  var dom = dominioDoEmail_(email);
  var usuario = usuarioDoEmail_(email);
  var ehDominioSup = DOM_SUPERVISOR.indexOf(dom) !== -1;
  var ehDominioAna = DOM_ANALISTA.indexOf(dom) !== -1;

  var dono = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  if (email === dono) return { ok: true, email: email, usuario: usuario, nome: usuario, perfil: 'supervisor' };

  if (!ehDominioSup && !ehDominioAna)
    return { ok: false, erro: 'DOMINIO_NAO_AUTORIZADO', email: email };

  var listaSup = SUPERVISORES_FIXOS.concat(listaDaAba_('Supervisores'));
  var listaAna = listaDaAba_('AnalistasQA');

  var perfil;
  if (listaSup.indexOf(email) !== -1) perfil = 'supervisor';
  else if (listaAna.indexOf(email) !== -1) perfil = 'analista';
  else perfil = ehDominioSup ? 'supervisor' : 'analista';

  return { ok: true, email: email, usuario: usuario, nome: usuario, perfil: perfil };
}

function autenticar() {
  var u = identificarUsuario_();
  if (!u.ok) {
    var msg = {
      'SEM_EMAIL': 'Não foi possível ler sua conta Google. A publicação precisa estar como "Qualquer pessoa com Conta do Google".',
      'BLOQUEADO': 'Seu acesso foi bloqueado. Fale com a supervisão.',
      'DOMINIO_NAO_AUTORIZADO': 'Seu email (' + (u.email || '') + ') não tem acesso a este painel.'
    }[u.erro] || 'Acesso não autorizado.';
    return { ok: false, erro: msg };
  }
  registrarAcesso_(u.email, u.usuario, u.perfil);
  return { ok: true, email: u.email, usuario: u.usuario, nome: u.nome, perfil: u.perfil };
}

function registrarAcesso_(email, usuario, perfil) {
  try {
    var ss = planilha_();
    var aba = ss.getSheetByName('LogAcessos');
    if (!aba) {
      aba = ss.insertSheet('LogAcessos');
      aba.getRange('A1:E1').setValues([['Data/hora', 'Email Google', 'Usuário', 'Perfil', 'Dia']]).setFontWeight('bold');
      aba.setFrozenRows(1);
      aba.setColumnWidth(1, 150); aba.setColumnWidth(2, 250);
    }
    var tz = Session.getScriptTimeZone(), agora = new Date();
    aba.appendRow([
      Utilities.formatDate(agora, tz, 'dd/MM/yyyy HH:mm:ss'),
      email || '(sem email)', usuario || '', perfil || '',
      Utilities.formatDate(agora, tz, 'yyyy-MM-dd')
    ]);
  } catch (e) { /* silencioso */ }
}

function resumoAcessos() {
  var aba = planilha_().getSheetByName('LogAcessos');
  if (!aba || aba.getLastRow() < 2) { Logger.log('Sem acessos ainda.'); return; }
  var dados = aba.getRange(2, 1, aba.getLastRow() - 1, 4).getValues();
  var por = {};
  dados.forEach(function (l) {
    var e = String(l[1] || '');
    por[e] = por[e] || { n: 0, ultimo: '', perfil: l[3] };
    por[e].n++; por[e].ultimo = String(l[0] || '');
  });
  Logger.log('=== ' + Object.keys(por).length + ' contas · ' + dados.length + ' acessos ===');
  Object.keys(por).sort(function (a, b) { return por[b].n - por[a].n; }).forEach(function (e) {
    Logger.log(e + ' (' + por[e].perfil + ') · ' + por[e].n + ' acesso(s) · último: ' + por[e].ultimo);
  });
}

/* ═══════════ LOCK ═══════════ */
function pegaLock_(ms) {
  var lock = LockService.getScriptLock();
  try {
    return lock.tryLock(ms || 10000) ? lock : null;
  } catch (e) {
    return null;
  }
}

function diagnosticarLock() {
  const lock = LockService.getScriptLock();
  const pegou = lock.tryLock(1000);
  if (pegou) {
    lock.releaseLock();
    Logger.log('Lock livre. O problema não está ativo agora.');
  } else {
    Logger.log('Lock OCUPADO. Vá em Execuções e cancele o que estiver "Em execução".');
  }
  return pegou;
}

/* ═══════════ SEGURANÇA ═══════════ */
function exigeDono_() {
  const ativo = Session.getActiveUser().getEmail();
  const dono = Session.getEffectiveUser().getEmail();
  if (!ativo || !dono || ativo !== dono) throw new Error('SEM_PERMISSAO');
}
function exigeSupervisor_(s){
  if ((s.perfil || 'analista') !== 'supervisor') throw new Error('SEM_PERMISSAO');
}
function hash_(texto) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(texto))
    .map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}
function pareceHash_(v) { return /^[a-f0-9]{64}$/i.test(String(v).trim()); }

function testarLogin() { diagnosticarLogin_('admin', 'trocar123'); }
function diagnosticarLogin_(usuario, senha) {
  usuario = String(usuario || '').trim().toLowerCase();
  const ss = planilha_();
  Logger.log('Abas: ' + ss.getSheets().map(s => s.getName()).join(', '));
  const usu = ss.getSheetByName(ABA_USUARIOS);
  if (!usu) { Logger.log('>>> ERRO: aba "Usuarios" não existe. Rode setupCRM().'); return; }
  const falhas = CacheService.getScriptCache().get('loginfail_' + usuario);
  if (Number(falhas) >= 5) Logger.log('>>> BLOQUEADO pelo rate-limit (' + falhas + ' falhas). Espere 10 min ou rode limparBloqueio_("' + usuario + '").');
  const dados = usu.getDataRange().getValues();
  Logger.log('Cabeçalho Usuarios: [' + dados[0].join(' | ') + '] (esperado: ' + CAB_USUARIOS.join(' | ') + ')');
  let achou = false;
  for (let i = 1; i < dados.length; i++) {
    const [u, armazenada, nome, ativo] = dados[i];
    if (String(u).trim().toLowerCase() !== usuario) continue;
    achou = true;
    Logger.log('Usuário na linha ' + (i+1) + ' | nome: ' + nome);
    Logger.log('ativo = "' + ativo + '" → ' + (String(ativo).trim().toLowerCase()==='sim' ? 'OK' : '>>> PROBLEMA: precisa ser "sim"'));
    const g = String(armazenada).trim();
    if (!g) { Logger.log('>>> PROBLEMA: coluna senha vazia.'); continue; }
    if (pareceHash_(g)) Logger.log('Senha é hash. Confere? ' + (g === hash_(senha) ? 'SIM ✓' : '>>> NÃO — senha digitada não bate'));
    else Logger.log('Senha em texto puro. Confere? ' + (g === String(senha) ? 'SIM ✓ (vira hash no 1º login)' : '>>> NÃO — valores diferentes'));
  }
  if (!achou) Logger.log('>>> Usuário "' + usuario + '" não existe na aba Usuarios (veja maiúsculas/espaços).');
}
function limparBloqueio_(usuario) {
  CacheService.getScriptCache().remove('loginfail_' + String(usuario||'').trim().toLowerCase());
  Logger.log('Bloqueio removido para ' + usuario);
}
function idStr_(v) {
  if (v instanceof Date) return '';
  if (typeof v === 'number') return Number.isInteger(v) ? v.toFixed(0) : String(v);
  return String(v == null ? '' : v).trim().replace(/[\u200B\u00A0]/g, '');
}
function fmt_(v, padrao) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), padrao || 'dd/MM/yyyy');
  return String(v || '');
}
function txt_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  return String(v || '').replace(/\w{3} \w{3} \d{2} \d{4} 00:00:00 GMT[^)]*\)?/g, m => {
    const d = new Date(m); return isNaN(d) ? m : Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  });
}

/* ═══════════ SETUP (rodar pelo editor) ═══════════ */
function setupCRM() {
  exigeDono_();
  const ss = planilha_();
  garanteAba_(ss, ABA_DEMANDAS, CAB_DEMANDAS);
  garanteAba_(ss, ABA_CARTEIRA, CAB_CARTEIRA);
  garanteAba_(ss, ABA_ACESSOS, CAB_ACESSOS);
  const usu = garanteAba_(ss, ABA_USUARIOS, CAB_USUARIOS);
  if (usu.getLastRow() === 1) {
    usu.appendRow(['admin', hash_('trocar123'), 'Administrador', 'sim', 'supervisor']);
    Logger.log('Usuário inicial: admin / trocar123');
  }
  Logger.log('Setup concluído.');
}

function protegerSenhasPendentes() {
  exigeDono_();
  const aba = planilha_().getSheetByName(ABA_USUARIOS);
  const dados = aba.getDataRange().getValues();
  let n = 0;
  for (let i = 1; i < dados.length; i++) {
    const s = String(dados[i][1] || '').trim();
    if (s && !pareceHash_(s)) { aba.getRange(i + 1, 2).setValue(hash_(s)); n++; }
  }
  Logger.log(n + ' senha(s) convertida(s) para hash.');
}

function garanteAba_(ss, nome, cabecalho) {
  let aba = ss.getSheetByName(nome);
  if (!aba) aba = ss.insertSheet(nome);
  if (aba.getLastRow() === 0) {
    aba.appendRow(cabecalho);
    aba.getRange(1, 1, 1, cabecalho.length).setFontWeight('bold').setBackground('#DBEAFE');
    aba.setFrozenRows(1);
    return aba;
  }
  const atual = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0]
    .map(v => String(v).trim().toLowerCase());
  const faltam = cabecalho.filter(c => atual.indexOf(c.trim().toLowerCase()) === -1);
  if (faltam.length)
    aba.getRange(1, aba.getLastColumn() + 1, 1, faltam.length)
      .setValues([faltam]).setFontWeight('bold').setBackground('#DBEAFE');
  return aba;
}

/* ═══════════ SINCRONIZAÇÃO Demandas → Carteira ═══════════ */
function sincronizarCarteira() { exigeDono_(); return sincronizarCarteira_(); }
function sincronizarCarteiraTrigger_() { return sincronizarCarteira_(); }
function supSincronizar(token) {
  const s = sessao_(token); exigeSupervisor_(s);
  return sincronizarCarteira_();
}

function sincronizarSeVencido_(minutos) {
  minutos = minutos || 4;
  try {
    const props = PropertiesService.getScriptProperties();
    const ultima = Number(props.getProperty('ultimaSyncMs') || 0);
    if (Date.now() - ultima < minutos * 60000) return {ok:true, pulou:true};
    const r = sincronizarCarteira_();
    if (r && r.ok && !r.pulou) props.setProperty('ultimaSyncMs', String(Date.now()));
    return r;
  } catch (e) {
    Logger.log('sincronizarSeVencido_ falhou: ' + e.message);
    return {ok:false, erro:e.message};
  }
}

function sincronizarCarteira_() {
  const ss = planilha_();
  const cart = garanteAba_(ss, ABA_CARTEIRA, CAB_CARTEIRA);
  const dem = ss.getSheetByName(ABA_DEMANDAS);
  if (!dem) return {ok:false, erro:'Aba Demandas não encontrada.'};

  const lock = pegaLock_(3000);
  if (!lock) {
    Logger.log('Sincronização ignorada: outra execução em andamento.');
    return {ok: true, adicionadas: 0, reatribuidos: 0, pulou: true};
  }

  try {
    const M = mapaCarteira_(cart);
    const larg = Math.max(cart.getLastColumn(), CAB_CARTEIRA.length);
    const dadosCart = cart.getDataRange().getValues();
    const linhaDoId = {};
    for (let i = 1; i < dadosCart.length; i++) {
      const id = idStr_(dadosCart[i][M.idImovel]);
      if (id) linhaDoId[id] = i + 1;
    }

    const dados = dem.getDataRange().getValues();
    const exib = dem.getDataRange().getDisplayValues();
    const novas = [];
    const reatribuir = [];

    for (let i = 1; i < dados.length; i++) {
      const id = idStr_(dados[i][D.idImovel]) || idStr_(exib[i] && exib[i][D.idImovel]);
      if (!id) continue;
      const analistaEntrada = String(dados[i][D.analista] || '').trim();

      if (linhaDoId[id] && linhaDoId[id] > 0) {
        if (analistaEntrada) {
          const atual = String(dadosCart[linhaDoId[id] - 1][M.analista] || '').trim();
          if (atual.toLowerCase() !== analistaEntrada.toLowerCase()) {
            reatribuir.push({linha: linhaDoId[id], analista: analistaEntrada});
          }
        }
        continue;
      }
      if (linhaDoId[id] === -1) continue;

      const linha = [
        dados[i][D.idImovel],
        dados[i][D.dataMailing],
        dados[i][D.idPP],
        dados[i][D.primeiroNome],
        dados[i][D.magiclink],
        analistaEntrada
      ];
      novas.push(linha);
      linhaDoId[id] = -1;
    }

    if (reatribuir.length) {
      reatribuir.sort((a, b) => a.linha - b.linha);
      let ini = 0;
      while (ini < reatribuir.length) {
        let fim = ini;
        while (fim + 1 < reatribuir.length && reatribuir[fim + 1].linha === reatribuir[fim].linha + 1) fim++;
        const bloco = reatribuir.slice(ini, fim + 1).map(r => [r.analista]);
        cart.getRange(reatribuir[ini].linha, M.analista + 1, bloco.length, 1).setValues(bloco);
        ini = fim + 1;
      }
    }

    if (novas.length) {
      const inicio = Math.max(cart.getLastRow() + 1, 2);
      cart.getRange(inicio, 1, novas.length, 6).setValues(novas);
    }

    Logger.log(novas.length + ' novo(s) | ' + reatribuir.length + ' reatribuído(s).');
    return {ok: true, adicionadas: novas.length, reatribuidos: reatribuir.length};
  } finally {
    lock.releaseLock();
  }
}

function ativarSincronizacaoAutomatica() {
  exigeDono_();
  ScriptApp.getProjectTriggers().forEach(tr => {
    const f = tr.getHandlerFunction();
    if (f === 'sincronizarCarteira' || f === 'sincronizarCarteiraTrigger_') ScriptApp.deleteTrigger(tr);
  });
  ScriptApp.newTrigger('sincronizarCarteiraTrigger_').timeBased().everyMinutes(5).create();
  Logger.log('Sincronização automática ativada (5 min).');
}
function desativarSincronizacaoAutomatica() {
  exigeDono_();
  ScriptApp.getProjectTriggers().forEach(tr => {
    const f = tr.getHandlerFunction();
    if (f === 'sincronizarCarteira' || f === 'sincronizarCarteiraTrigger_') ScriptApp.deleteTrigger(tr);
  });
  Logger.log('Sincronização automática desativada.');
}

/* ═══════════ LOGIN / SESSÃO ═══════════ */
function login(usuario, senha) {
  usuario = String(usuario || '').trim().toLowerCase();

  const cache = CacheService.getScriptCache();
  const chaveFalhas = 'loginfail_' + usuario;
  const falhas = Number(cache.get(chaveFalhas) || 0);
  if (falhas >= 5)
    return {ok: false, erro: 'Muitas tentativas. Aguarde 10 minutos e tente de novo.'};
  const registraFalha = () => cache.put(chaveFalhas, String(falhas + 1), 600);

  const aba = planilha_().getSheetByName(ABA_USUARIOS);
  const dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    const [u, armazenada, nome, ativo, perfil] = dados[i];
    if (String(u).trim().toLowerCase() !== usuario) continue;
    if (String(ativo).trim().toLowerCase() !== 'sim') continue;
    const papel = String(perfil || 'analista').trim().toLowerCase() === 'supervisor' ? 'supervisor' : 'analista';

    const guardado = String(armazenada).trim();
    let confere = false;
    if (pareceHash_(guardado)) {
      confere = (guardado === hash_(senha));
    } else if (guardado && guardado === String(senha)) {
      confere = true;
      aba.getRange(i + 1, 2).setValue(hash_(senha));
    }
    if (!confere) break;

    let linhaAcesso = '';
    const lock = pegaLock_(5000);
    if (lock) {
      try {
        const ac = garanteAba_(planilha_(), ABA_ACESSOS, CAB_ACESSOS);
        ac.appendRow([new Date(), '', usuario, '']);
        linhaAcesso = ac.getLastRow();
      } catch (e) {
        Logger.log('Ponto não registrado para ' + usuario + ': ' + e.message);
      } finally {
        lock.releaseLock();
      }
    } else {
      Logger.log('Ponto não registrado para ' + usuario + ': planilha ocupada.');
    }

    const token = Utilities.getUuid();
    const expira = Date.now() + SESSAO_HORAS * 3600 * 1000;
    PropertiesService.getScriptProperties().setProperty('sess_' + token,
      JSON.stringify({usuario: usuario, nome: nome, perfil: papel, expira: expira, acesso: linhaAcesso}));
    limpaSessoesAntigas_();
    cache.remove(chaveFalhas);
    return {ok: true, token: token, nome: nome, usuario: usuario, perfil: papel};
  }
  registraFalha();
  return {ok: false, erro: 'Usuário ou senha inválidos.'};
}

function sessao_(token) {
  if (!token) throw new Error('SESSAO_EXPIRADA');
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty('sess_' + token);
  if (!raw) throw new Error('SESSAO_EXPIRADA');
  const s = JSON.parse(raw);
  if (Date.now() > s.expira) { props.deleteProperty('sess_' + token); throw new Error('SESSAO_EXPIRADA'); }
  return s;
}

function sair(token) {
  try {
    const s = sessao_(token);
    if (s.acesso) {
      const lock = pegaLock_(5000);
      try {
        const ac = planilha_().getSheetByName(ABA_ACESSOS);
        const entrada = ac.getRange(s.acesso, 1).getValue();
        const agora = new Date();
        ac.getRange(s.acesso, 2).setValue(agora);
        if (entrada instanceof Date) ac.getRange(s.acesso, 4).setValue(Math.round((agora - entrada) / 60000));
      } finally {
        if (lock) lock.releaseLock();
      }
    }
  } catch (e) {}
  if (token) PropertiesService.getScriptProperties().deleteProperty('sess_' + token);
  return {ok: true};
}

function limpaSessoesAntigas_() {
  const props = PropertiesService.getScriptProperties();
  const tudo = props.getProperties();
  const agora = Date.now();
  for (const chave in tudo) {
    if (chave.indexOf('sess_') !== 0) continue;
    try { if (agora > JSON.parse(tudo[chave]).expira) props.deleteProperty(chave); }
    catch (e) { props.deleteProperty(chave); }
  }
}

/* ═══════════ JOBS ═══════════ */
function jobDaCarteira_(lin, M){
  M = M || C;
  const tz = Session.getScriptTimeZone();
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const hojeStr = Utilities.formatDate(hoje, tz, 'yyyy-MM-dd');

  const dataJob = isoData_(lin[M.dataJob]);
  const dataSnooze = isoData_(lin[M.dataSnooze]);
  const stBruto = lin[M.statusImovel];
  const statusImovel = (stBruto instanceof Date) ? '' : String(stBruto || '').trim();

  let prioridade = false, diasAteSessao = null;
  if (dataJob) {
    const sessao = new Date(dataJob + 'T00:00:00');
    if (!isNaN(sessao)) {
      diasAteSessao = Math.round((sessao - hoje) / 86400000);
      const dow = sessao.getDay();
      const diasAntes = (dow === 0) ? 2 : 1;
      prioridade = (diasAteSessao <= diasAntes && diasAteSessao > 0);
    }
  }
  const prioSnooze = !!(dataSnooze && dataSnooze <= hojeStr);

  return {
    idImovel: idStr_(lin[M.idImovel]),
    dataMailing: fmt_(lin[M.dataMailing]),
    dataMailingISO: isoData_(lin[M.dataMailing]),
    idPP: idStr_(lin[M.idPP]),
    primeiroNome: String(lin[M.primeiroNome] || ''),
    magiclink: String(lin[M.magiclink] || ''),
    analista: String(lin[M.analista] || ''),
    tabulacao: txt_(lin[M.tabulacao]),
    subTab: txt_(lin[M.subTab]),
    dataSnooze: dataSnooze, dataFollowup: dataSnooze,
    obs: txt_(lin[M.obs]),
    f1Calls: Number(lin[M.f1Calls])||0, f1Wpps: Number(lin[M.f1Wpps])||0,
    f2Calls: Number(lin[M.f2Calls])||0, f2Wpps: Number(lin[M.f2Wpps])||0,
    f3Calls: Number(lin[M.f3Calls])||0, f3Wpps: Number(lin[M.f3Wpps])||0,
    f1Tab: txt_(lin[M.f1Tab]), f2Tab: txt_(lin[M.f2Tab]), f3Tab: txt_(lin[M.f3Tab]),
    confTab: txt_(lin[M.confTab]), snoozeTab: txt_(lin[M.snoozeTab]),
    historicoFases: String(lin[M.histFases]||''),
    logToques: String(lin[M.logToques] != null ? lin[M.logToques] : ''),
    resultadoCall: txt_(lin[M.resultadoCall]),
    resultadoWpp: txt_(lin[M.resultadoWpp]),
    atualizado: fmt_(lin[M.atualizado], 'dd/MM/yyyy HH:mm'),
    atualizadoISO: isoData_(lin[M.atualizado]),
    dataJob: dataJob, dtAgendamento: dataJob,
    statusImovel: statusImovel,
    prioridade: prioridade, diasAteSessao: diasAteSessao, prioSnooze: prioSnooze
  };
}

function getMeusJobs(token) {
  sincronizarSeVencido_();
  const s = sessao_(token);
  const aba = planilha_().getSheetByName(ABA_CARTEIRA);
  const M = mapaCarteira_(aba);
  const dados = aba.getDataRange().getValues();
  const meus = [];
  let fila = 0;
  for (let i = 1; i < dados.length; i++) {
    const id = idStr_(dados[i][M.idImovel]);
    if (!id) continue;
    const dono = String(dados[i][M.analista] || '').trim().toLowerCase();
    if (!dono) { fila++; continue; }
    if (dono !== s.usuario) continue;
    meus.push(jobDaCarteira_(dados[i], M));
  }
  meus.sort((a, b) => (b.dataMailingISO||'').localeCompare(a.dataMailingISO||''));
  return {ok: true, nome: s.nome, usuario: s.usuario, perfil: s.perfil||'analista', jobs: meus, fila: fila};
}

function achaNaCarteira_(idImovel) {
  const aba = planilha_().getSheetByName(ABA_CARTEIRA);
  const M = mapaCarteira_(aba);
  const larg = aba.getLastColumn();
  const alvo = idStr_(idImovel);
  if (!alvo) return null;

  try {
    const colId = M.idImovel + 1;
    const rngCol = aba.getRange(2, colId, Math.max(1, aba.getLastRow()-1), 1);
    const achados = rngCol.createTextFinder(alvo).matchEntireCell(true).findAll();
    for (let k = 0; k < achados.length; k++) {
      const linhaIdx = achados[k].getRow();
      const linha = aba.getRange(linhaIdx, 1, 1, larg).getValues()[0];
      if (idStr_(linha[M.idImovel]) === alvo) return {linha: linha, idx: linhaIdx, M: M, larg: larg};
    }
  } catch (e) {
    Logger.log('TextFinder falhou, usando varredura: ' + e.message);
  }

  const dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++)
    if (idStr_(dados[i][M.idImovel]) === alvo) return {linha: dados[i], idx: i + 1, M: M, larg: larg};
  return null;
}

/**
 * Salva a tratativa de UM canal por vez.
 * t = { canal ('call'|'wpp'|undefined), tabulacao, subTab, dataSnooze, obs,
 *       fase (1|2|3|'confirmacao'|'snoozed'), callFeita, wppEnviado, tentativas }
 */
function salvarTratativa(token, idImovel, t) {
  const s = sessao_(token);

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
      range.setValues([linha]);
    }
    return {ok: true};
  } finally {
    lock.releaseLock();
  }
}

function getMeuHistorico(token) {
  const s = sessao_(token);
  const aba = planilha_().getSheetByName(ABA_CARTEIRA);
  const M = mapaCarteira_(aba);
  const dados = aba.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][M.analista]).trim().toLowerCase() !== s.usuario) continue;
    if (!String(dados[i][M.tabulacao] || '').trim()) continue;
    out.push({
      quando: fmt_(dados[i][M.dataMailing], 'dd/MM/yyyy'),
      idImovel: idStr_(dados[i][M.idImovel]),
      idPP: idStr_(dados[i][M.idPP]),
      nomePP: String(dados[i][M.primeiroNome] || ''),
      tabulacao: txt_(dados[i][M.tabulacao]),
      subTab: txt_(dados[i][M.subTab]),
      obs: txt_(dados[i][M.obs])
    });
  }
  return {ok: true, registros: out};
}

/* ═══════════ SUPERVISOR ═══════════ */
function visaoOperacional_(){
  sincronizarSeVencido_();
  const aba = planilha_().getSheetByName(ABA_CARTEIRA);
  const M = mapaCarteira_(aba);
  const dados = aba.getDataRange().getValues();
  const jobs = [];
  for (let i = 1; i < dados.length; i++){
    if (!idStr_(dados[i][M.idImovel])) continue;
    jobs.push(jobDaCarteira_(dados[i], M));
  }
  const porAnalista = {};
  jobs.forEach(j=>{
    const a = j.analista || '(sem dono)';
    porAnalista[a] = porAnalista[a] || {analista:a, total:0, tratados:0, pendentes:0, cancelados:0};
    porAnalista[a].total++;
    if (j.tabulacao) porAnalista[a].tratados++; else porAnalista[a].pendentes++;
    if ((j.statusImovel||'').toLowerCase().includes('cancel')) porAnalista[a].cancelados++;
  });
  return {ok:true, jobs:jobs, resumo:Object.values(porAnalista).sort((a,b)=>b.total-a.total)};
}
function supVisaoOperacional(token){
  const s = sessao_(token); exigeSupervisor_(s);
  return visaoOperacional_();
}
function pubOperacional(){
  return visaoOperacional_();
}

/* ═══════════ PERFORMANCE (aba Resultados) ═══════════ */
function resultados_(){
  const aba = planilha_().getSheetByName('Resultados');
  if (!aba) return {ok:false, erro:'Aba "Resultados" não encontrada na planilha.'};
  const dados = aba.getDataRange().getDisplayValues();
  if (dados.length < 2) return {ok:true, colunas:[], linhas:[]};

  const cab = dados[0].map(function(c){ return String(c).trim(); });
  const linhas = [];
  for (let i = 1; i < dados.length; i++){
    const obj = {};
    let temAlgo = false;
    for (let j = 0; j < cab.length; j++){
      if (!cab[j]) continue;
      const v = String(dados[i][j] == null ? '' : dados[i][j]).trim();
      obj[cab[j]] = v;
      if (v !== '') temAlgo = true;
    }
    const per = String(obj['Periodo'] || '').trim().toLowerCase();
    const dem = parseFloat(String(obj['Demanda'] || '0').replace(/\./g,'').replace(',','.')) || 0;
    if (temAlgo && (per === 'consolidado' || dem > 0)) linhas.push(obj);
  }
  return {ok:true, colunas:cab, linhas:linhas};
}
function supResultados(token){
  const s = sessao_(token); exigeSupervisor_(s);
  return resultados_();
}
function pubResultados(){
  return resultados_();
}

function supTempoEquipe(token){
  const s = sessao_(token); exigeSupervisor_(s);
  const dados = planilha_().getSheetByName(ABA_ACESSOS).getDataRange().getValues();
  const agora = Date.now();
  const limite = agora - 30*86400000;
  const m = {};
  for (let i=1;i<dados.length;i++){
    const ent = dados[i][0], a = String(dados[i][2]).trim();
    if (!(ent instanceof Date) || ent.getTime()<limite) continue;
    const sai = dados[i][1];
    let dur = Number(dados[i][3])||0;
    if (!dur) {
      const fim = (sai instanceof Date) ? sai.getTime() : agora;
      dur = Math.max(0, Math.round((fim - ent.getTime())/60000));
    }
    m[a] = m[a] || {analista:a, min:0, sessoes:0};
    m[a].min += dur; m[a].sessoes++;
  }
  return {ok:true, tempo:Object.values(m).sort((x,y)=>y.min-x.min)};
}

function getMeuTempo(token) {
  const s = sessao_(token);
  const tz = Session.getScriptTimeZone();
  const dados = planilha_().getSheetByName(ABA_ACESSOS).getDataRange().getValues();
  const hoje = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const agora = Date.now();
  const limite = agora - 30 * 86400000;
  let minHoje = 0, min30 = 0, sessoes = 0;
  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][2]).trim().toLowerCase() !== s.usuario) continue;
    const ent = dados[i][0];
    if (!(ent instanceof Date) || ent.getTime() < limite) continue;
    const sai = dados[i][1];
    let dur = Number(dados[i][3]) || 0;
    if (!dur) {
      const fim = (sai instanceof Date) ? sai.getTime() : agora;
      dur = Math.max(0, Math.round((fim - ent.getTime()) / 60000));
    }
    min30 += dur; sessoes++;
    if (Utilities.formatDate(ent, tz, 'yyyy-MM-dd') === hoje) minHoje += dur;
  }
  return {ok: true, minHoje: minHoje, min30: min30, sessoes: sessoes};
}

function diagnosticoSync() {
  const ss = planilha_();
  const dem = ss.getSheetByName(ABA_DEMANDAS);
  const cart = ss.getSheetByName(ABA_CARTEIRA);
  if (!dem) { Logger.log('Aba Demandas não existe'); return; }
  const dados = dem.getDataRange().getValues();
  let validos = 0, invalidos = 0, exemplosInvalidos = [];
  const exib = dem.getDataRange().getDisplayValues();
  let salvosPeloFallback = 0;
  for (let i = 1; i < dados.length; i++) {
    const bruto = dados[i][D.idImovel];
    let id = idStr_(bruto);
    if (!id) { id = idStr_(exib[i] && exib[i][D.idImovel]); if (id) salvosPeloFallback++; }
    if (id) validos++;
    else if (String(bruto).trim() !== '') { invalidos++; if (exemplosInvalidos.length < 5) exemplosInvalidos.push('linha ' + (i+1) + ': ' + JSON.stringify(bruto) + ' (' + Object.prototype.toString.call(bruto) + ')'); }
  }
  Logger.log('Demandas: ' + (dados.length-1) + ' linhas · ids válidos: ' + validos + ' · inválidos: ' + invalidos + (salvosPeloFallback ? ' · recuperados pelo texto exibido: ' + salvosPeloFallback : ''));
  if (exemplosInvalidos.length) Logger.log('Exemplos inválidos (coluna B como Data? Formate como Texto simples):\n' + exemplosInvalidos.join('\n'));
  const temTrigger = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'sincronizarCarteiraTrigger_');
  Logger.log('Gatilho de 5 min instalado: ' + (temTrigger ? 'sim' : 'NÃO — rode ativarSincronizacaoAutomatica()'));
  const r = sincronizarCarteira_();
  Logger.log('Sync manual agora: ' + JSON.stringify(r));
  if (cart) Logger.log('Carteira após sync: ' + (cart.getLastRow()-1) + ' linhas');
}
