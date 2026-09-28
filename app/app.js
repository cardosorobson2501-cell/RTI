/* =====================================================================
   Tier 2 Digital — app de registro da avaliação individual de leitura.
   Tudo roda no aparelho: os dados ficam no armazenamento local do
   navegador e nunca são enviados para a internet.
   ===================================================================== */
(function () {
  'use strict';
  const D = window.DADOS;
  const R = window.REGRAS;

  /* ================= ARMAZENAMENTO ================= */
  const K_DB = 'tier2.v1.avaliacoes';
  const K_CFG = 'tier2.v1.config';
  const K_PREF = 'tier2.v1.prefs';
  const K_POS = 'tier2.v1.posicao';

  function ler(k, def) {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; }
  }
  function gravar(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { toast('Não foi possível salvar! Faça um backup agora.'); return false; }
  }
  let DB = ler(K_DB, {});
  let CFG = Object.assign({ pisoPCPM: 100 }, ler(K_CFG, {}));
  let PREF = Object.assign({ avaliador: '', turma: '', turmas: [], ultimaForma: null }, ler(K_PREF, {}));

  function salvar(av) {
    if (!av) return;
    av.atualizado = Date.now();
    DB[av.id] = av;
    gravar(K_DB, DB);
  }
  function salvarPos() { gravar(K_POS, { tela: S.tela, avId: S.avId, mod: S.mod, i: S.i }); }

  // pede ao navegador para não apagar os dados sozinho
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { /* ok */ }

  /* ================= UTILITÁRIOS ================= */
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hoje = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const dataBR = (iso) => (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('/') : iso || '');
  const fmt = (v, suf) => (v == null || v === '' ? '—' : String(v).replace('.', ',') + (suf || ''));
  const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  // Código visível da avaliação (derivado do identificador interno, que nunca muda).
  // É por ele que o "Restaurar backup" reconhece a mesma avaliação em outro aparelho.
  const codigo = (a) => { const c = String(a.id || '').slice(-6).toUpperCase(); return c.slice(0, 3) + '-' + c.slice(3); };

  function getPath(o, path) {
    return path.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
  }
  function setPath(o, path, v) {
    const ks = path.split('.');
    let cur = o;
    for (let j = 0; j < ks.length - 1; j++) {
      const k = ks[j];
      if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = /^\d+$/.test(ks[j + 1]) ? [] : {};
      cur = cur[k];
    }
    cur[ks[ks.length - 1]] = v;
  }

  let toastT = null;
  function toast(msg) {
    let el = $('#toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg; el.classList.remove('hidden');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.add('hidden'), msg.length > 80 ? 6000 : 2600);
  }
  function vibrar(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* ok */ } }
  function bip() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
      const c = new Ctx(); const o = c.createOscillator(); const g = c.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(c.destination); g.gain.value = 0.25;
      o.start(); o.stop(c.currentTime + 0.5);
    } catch (e) { /* ok */ }
  }

  /* ================= ESTADO DA TELA ================= */
  const S = { tela: 'lista', avId: null, mod: null, i: 0, errAberto: false, sensSim: false };
  const pos = ler(K_POS, null);
  if (pos && pos.avId && DB[pos.avId]) Object.assign(S, pos);
  const av = () => DB[S.avId];

  const MODS = ['cab', 'm0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7'];
  const NOMES = {
    cab: ['·', 'Identificação', 'Aluno, triagem e Forma'],
    m0: ['0', 'Conversa inicial', 'Condições básicas · 3 min'],
    m1: ['1', 'Palavras e pseudopalavras', '40 palavras + 30 pseudopalavras · 5–6 min'],
    m2: ['2', 'Fluência oral (1 minuto)', 'PCPM e prosódia · 2 min'],
    m3: ['3', 'Compreensão', 'Texto lido e texto ouvido · 10–12 min'],
    m4: ['4', 'Coesão', 'Anáfora e conectivos · 4 min'],
    m5: ['5', 'Vocabulário', 'Oral e de comando · 6 min'],
    m6: ['6', 'Processamento fonológico', 'OPCIONAL · só se o Passo 1 estiver alterado'],
    m7: ['7', 'Ditado', 'OPCIONAL · só se o Passo 1 estiver alterado'],
  };

  /* ================= CRONÔMETROS ================= */
  // cronômetro = { t0: marca de início (ms) ou null, acc: segundos acumulados }
  function segundos(T) { if (!T) return 0; return (T.acc || 0) + (T.t0 ? (Date.now() - T.t0) / 1000 : 0); }
  function cronoHTML(path, rotulo) {
    const T = getPath(av(), path) || {};
    const rodando = !!T.t0;
    return '<div class="crono"><div class="relogio" data-crono="' + path + '">' + Math.floor(segundos(T)) + 's</div>' +
      '<div class="lbl">' + esc(rotulo) + '</div>' +
      (rodando ? '<button class="btn err" data-a="cronoParar" data-p="' + path + '">■ Parar</button>'
        : '<button class="btn ok" data-a="cronoIniciar" data-p="' + path + '">▶ ' + (segundos(T) > 0 ? 'Continuar' : 'Iniciar') + '</button>') +
      (!rodando && segundos(T) > 0 ? '<button class="btn ghost" data-a="cronoZerar" data-p="' + path + '" title="Zerar">↺</button>' : '') +
      '</div>';
  }
  function cronoIniciar(path) { const a = av(); const T = getPath(a, path) || { acc: 0 }; if (!T.t0) T.t0 = Date.now(); setPath(a, path, T); salvar(a); }
  function cronoParar(path) {
    const a = av(); const T = getPath(a, path); if (!T || !T.t0) return;
    T.acc = segundos(T); T.t0 = null; setPath(a, path, T);
    // grava o tempo no campo correspondente
    const destino = { 'm1.palT': 'm1.palTempo', 'm1.pseT': 'm1.pseTempo', 'm6.nl.T': 'm6.nl.tempo', 'm6.nn.T': 'm6.nn.tempo' }[path];
    if (destino) setPath(a, destino, Math.round(T.acc));
    salvar(a);
  }

  setInterval(() => {
    const a = av(); if (!a) return;
    $$('[data-crono]').forEach((el) => { el.textContent = Math.floor(segundos(getPath(a, el.dataset.crono))) + 's'; });
    const f = $('[data-flu]');
    if (f && a.m2 && a.m2.fase === 'lendo') {
      const t = (Date.now() - a.m2.t0) / 1000;
      const rest = Math.max(0, 60 - t);
      f.textContent = Math.ceil(rest);
      if (rest <= 0) fimDoMinuto();
    }
  }, 200);

  function fimDoMinuto() {
    const a = av(); a.m2.fase = 'limite'; salvar(a);
    vibrar([400, 150, 400, 150, 400]); bip();
    render();
    const ov = document.createElement('div');
    ov.className = 'fim-tempo';
    ov.innerHTML = '<div>⏱ TEMPO!<small>Deixe o aluno terminar a frase.<br>Depois toque na ÚLTIMA palavra lida no 1º minuto.</small><small>(toque aqui para fechar)</small></div>';
    ov.onclick = () => ov.remove();
    document.body.appendChild(ov);
  }

  /* ================= CONSTRUÇÃO DAS TELAS ================= */
  function intro(o) {
    let h = '<div class="card"><h2>' + esc(o.titulo) + '</h2>';
    if (o.tempo) h += '<span class="tag">' + esc(o.tempo) + '</span>';
    if (o.fazer) h += '<div class="say fazer">' + esc(o.fazer) + '</div>';
    (o.roteiros || []).forEach((r) => { h += '<div class="say">' + esc(r) + '</div>'; });
    if (o.regras && o.regras.length) h += '<h3>Regras</h3><ul class="regras">' + o.regras.map((r) => '<li>' + esc(r) + '</li>').join('') + '</ul>';
    if (o.extra) h += o.extra;
    h += '</div>';
    let acao = '';
    if (o.aluno) acao += '<button class="btn" data-a="aluno" data-v="' + o.aluno + '">👁 Mostrar ao aluno</button>';
    acao += '<button class="btn pri" data-a="' + (o.acaoComecar || 'prox') + '"' + (o.p ? ' data-p="' + o.p + '"' : '') + '>' + esc(o.botao || 'Começar →') + '</button>';
    return { html: h, acao };
  }

  // fica = no erro, fica na tela para digitar "como leu/escreveu" (Módulos 1 e 7)
  function botoesOkErr(path, fica) {
    const v = getPath(av(), path);
    return '<div class="big2"><button class="btn err' + (v === false ? ' sel' : '') + '" data-a="okErr" data-p="' + path + '" data-v="0"' + (fica ? ' data-fica="1"' : '') + '>✗ Erro</button>' +
      '<button class="btn ok' + (v === true ? ' sel' : '') + '" data-a="okErr" data-p="' + path + '" data-v="1">✓ Correto</button></div>';
  }
  function botoes210(path) {
    const v = getPath(av(), path);
    return '<div class="pontos">' + [2, 1, 0].map((n) => '<button class="btn p' + n + (v === n ? ' sel' : '') + '" data-a="nota" data-p="' + path + '" data-v="' + n + '">' + n + '</button>').join('') + '</div>';
  }
  function rubrica(r2, r1, r0) {
    return '<div class="rubrica">' +
      '<div class="r2"><b>2</b><span>' + esc(r2) + '</span></div>' +
      '<div class="r1"><b>1</b><span>' + esc(r1) + '</span></div>' +
      '<div class="r0"><b>0</b><span>' + esc(r0) + '</span></div></div>';
  }
  function itemHead(tag, n, total, extraTag) {
    return '<div class="item-head"><span class="tag pri">' + esc(tag) + '</span>' + (extraTag || '') + '<span class="muted">' + n + ' de ' + total + '</span></div>';
  }
  function checkBtn(path, texto, n) {
    const on = !!getPath(av(), path);
    return '<button class="check' + (on ? ' on' : '') + '" data-a="toggle" data-p="' + path + '">' + (n != null ? '<span class="n">' + n + '</span>' : '') + '<span class="box">' + (on ? '✓' : '') + '</span><span>' + esc(texto) + '</span></button>';
  }
  function chips(path, opcoes, multi) {
    const v = getPath(av(), path);
    return '<div class="chips">' + opcoes.map((o) => {
      const val = typeof o === 'object' ? o.v : o; const lab = typeof o === 'object' ? o.l : o;
      const on = multi ? (v || []).includes(val) : v === val;
      return '<button class="chip' + (on ? ' on' : '') + '" data-a="' + (multi ? 'chipMulti' : 'chip') + '" data-p="' + path + '" data-v="' + esc(val) + '">' + esc(lab) + '</button>';
    }).join('') + '</div>';
  }
  function campo(path, rotulo, tipo, extra, erro) {
    const v = getPath(av(), path);
    const cls = erro ? ' class="erro"' : '';
    const msg = erro ? '<div class="erro-msg">' + esc(erro) + '</div>' : '';
    if (tipo === 'area') return (rotulo ? '<label class="f">' + esc(rotulo) + '</label>' : '') + '<textarea data-f="' + path + '"' + cls + ' ' + (extra || '') + '>' + esc(v) + '</textarea>' + msg;
    return (rotulo ? '<label class="f">' + esc(rotulo) + '</label>' : '') + '<input type="' + (tipo || 'text') + '" data-f="' + path + '"' + cls + (tipo === 'number' ? ' inputmode="numeric" data-num="1"' : '') + ' value="' + esc(v) + '" ' + (extra || '') + '>' + msg;
  }
  function stat(rotulo, valor, cls) { return '<div class="stat ' + (cls || '') + '"><b>' + valor + '</b><span>' + esc(rotulo) + '</span></div>'; }
  function botaoProxModulo(mod) {
    const idx = MODS.indexOf(mod);
    const prox = MODS[idx + 1];
    let h = '';
    if (prox) h += '<button class="btn pri" data-a="abrirMod" data-v="' + prox + '">Próximo: ' + (prox === 'cab' ? '' : 'Módulo ' + NOMES[prox][0] + ' — ') + NOMES[prox][1] + ' →</button>';
    else h += '<button class="btn pri" data-a="resumo">Resumo e Decisão →</button>';
    h += '<button class="btn small ghost" data-a="menu">☰ Menu dos módulos</button>';
    return h;
  }

  /* ---------- CABEÇALHO: validação dos campos obrigatórios ---------- */
  // Nome completo = pelo menos duas partes com letra (evita "joão", aceita "joão da silva", "ana d'ávila").
  function nomeCompleto(v) {
    return String(v || '').trim().split(/\s+/).filter((p) => /\p{L}/u.test(p)).length >= 2;
  }
  function validarCab0(a) {
    const erros = {};
    if (!nomeCompleto(a.cab.nome)) erros.nome = String(a.cab.nome || '').trim() ? 'Digite o nome completo do aluno (nome e sobrenome).' : 'Obrigatório: digite o nome completo do aluno.';
    if (!String(a.cab.turma || '').trim()) erros.turma = 'Obrigatório: informe a turma.';
    if (!String(a.cab.avaliador || '').trim()) erros.avaliador = 'Obrigatório: informe o nome do avaliador(a).';
    return erros;
  }

  /* ---------- CABEÇALHO ---------- */
  function passosCab() {
    const a = av();
    return [
      () => {
        const erros = S.cabErros || {};
        return {
          sub: 'Aluno',
          html: '<div class="card"><h2>Identificação</h2>' +
            '<p class="muted" style="margin:0">Código desta avaliação: <b>' + codigo(a) + '</b></p>' +
            campo('cab.nome', 'Nome completo do aluno', 'text', 'autocomplete="off"' + (erros.nome ? ' data-foco="1"' : ''), erros.nome) +
            campo('cab.matricula', 'Nº do aluno — matrícula ou nº de chamada (opcional)', 'text', 'autocomplete="off" inputmode="numeric"') +
            '<label class="f">Turma</label>' + (PREF.turmas.length ? chips('cab.turma', PREF.turmas.slice(0, 8)) : '') +
            '<input type="text" data-f="cab.turma" class="' + (erros.turma ? 'erro' : '') + '" value="' + esc(a.cab.turma) + '" placeholder="ou digite a turma" style="margin-top:8px">' +
            (erros.turma ? '<div class="erro-msg">' + esc(erros.turma) + '</div>' : '') +
            '<div class="row"><div>' + campo('cab.idade', 'Idade', 'number') + '</div><div>' + campo('cab.data', 'Data', 'date') + '</div></div>' +
            campo('cab.avaliador', 'Avaliador(a)', 'text', '', erros.avaliador) + '</div>',
          acao: '<button class="btn pri" data-a="proxCab0">Próximo →</button>',
        };
      },
      () => ({
        sub: 'Triagem',
        html: '<div class="card"><h2>Dados da triagem</h2>' +
          '<label class="f">Triagem (dissertativa) total — de 0 a 8</label>' + chips('cab.triagem', [0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ v: String(n), l: String(n) }))) +
          campo('cab.elA', 'EL — Parte A (frases, 3 min) — de 0 a 50', 'number') +
          '<label class="f">Domínio(s) em risco na triagem</label>' + chips('cab.dominios', D.dominiosTriagem, true) +
          '<input type="text" data-f="cab.dominioOutro" value="' + esc(a.cab.dominioOutro) + '" placeholder="outro (opcional)" style="margin-top:8px">' +
          campo('cab.motivo', 'Motivo do encaminhamento', 'area') + '</div>',
        acao: '<button class="btn pri" data-a="prox">Próximo →</button>',
      }),
      () => {
        // sugestão: alternar em relação à avaliação anterior (outra, não esta)
        const outras = Object.values(DB).filter((x) => x.id !== a.id && x.cab.forma).sort((x, y) => (y.criado || 0) - (x.criado || 0));
        const ultima = outras.length ? outras[0].cab.forma : null;
        const sug = ultima ? (ultima === 1 ? 2 : 1) : null;
        const f = a.cab.forma;
        return {
          sub: 'Forma e autorizações',
          html: '<div class="card"><h2>Forma</h2><p class="muted">Alterne pela ordem de atendimento: metade dos alunos na Forma 1, metade na Forma 2.' +
            (sug ? ' <b>Sugestão: Forma ' + sug + '</b> (a avaliação anterior foi Forma ' + ultima + ').' : '') + '</p>' +
            '<button class="btn' + (f === 1 ? ' pri' : '') + '" data-a="forma" data-v="1">Forma 1<br><small>lê o Texto A (O mandacaru) · ouve o B (O tatu-bola)</small></button>' +
            '<button class="btn' + (f === 2 ? ' pri' : '') + '" data-a="forma" data-v="2">Forma 2<br><small>lê o Texto B (O tatu-bola) · ouve o A (O mandacaru)</small></button>' +
            '<label class="f">Gravação autorizada?</label><div class="seg">' + chips('cab.gravacao', ['sim', 'não']).replace(/^<div class="chips">|<\/div>$/g, '') + '</div>' +
            '<label class="f">Autorização dos responsáveis?</label><div class="seg">' + chips('cab.autorizacao', ['sim', 'não']).replace(/^<div class="chips">|<\/div>$/g, '') + '</div>' +
            '</div>',
          acao: '<button class="btn pri" data-a="fimCab">Concluir → Módulo 0</button>',
        };
      },
    ];
  }

  /* ---------- MÓDULO 0 ---------- */
  function passosM0() {
    const a = av();
    const ps = [() => Object.assign({ sub: 'Instruções' }, intro({ titulo: D.m0.titulo, tempo: D.m0.tempo, fazer: D.m0.roteiro, regras: D.m0.regras }))];
    D.m0.perguntas.forEach((p, i) => ps.push(() => ({
      sub: 'Pergunta ' + (i + 1) + ' de 6',
      html: '<div class="card">' + itemHead('Conversa', i + 1, 6) + '<div class="say">' + esc(p) + '</div>' +
        D.m0.segmentos[i].map((sg) => '<label class="f">' + esc(sg.p) + (sg.multi ? ' <span class="muted">(pode marcar mais de uma)</span>' : '') + '</label>' +
          chips('m0.op.' + sg.id, sg.ops, !!sg.multi)).join('') +
        campo('m0.resp.' + i, 'Outra resposta / observação (opcional)', 'text', 'placeholder="escreva só se precisar" autocomplete="off"') + '</div>',
      acao: '<button class="btn pri" data-a="prox">Próximo →</button>',
    })));
    ps.push(() => ({
      sub: 'Engajamento',
      html: '<div class="card"><h2>Engajamento na sessão</h2><p class="muted">Marque ao longo ou ao fim da sessão.</p>' +
        D.m0.engajamento.map((e) => '<button class="btn' + (a.m0.eng === e ? ' pri' : '') + '" data-a="setAvanca" data-p="m0.eng" data-v="' + e + '">' + e + '</button>').join('') + '</div>',
      acao: '',
    }));
    ps.push(() => ({
      sub: 'Suspeita sensorial',
      html: '<div class="card"><h2>Suspeita sensorial (visão/audição) a encaminhar?</h2>' +
        '<div class="row"><button class="btn' + (a.m0.sens === 'não' ? ' pri' : '') + '" data-a="sens" data-v="não">Não</button>' +
        '<button class="btn' + (a.m0.sens === 'sim' ? ' pri' : '') + '" data-a="sens" data-v="sim">Sim</button></div>' +
        (a.m0.sens === 'sim' ? campo('m0.sensQual', 'Qual?', 'text', 'placeholder="ex.: não enxerga o quadro" data-foco="1"') +
          '<div class="alerta">Registre e encaminhe. Interprete os resultados com cautela.</div>' : '') + '</div>',
      acao: '<button class="btn pri" data-a="prox">Concluir módulo →</button>',
    }));
    ps.push(() => ({
      sub: 'Concluído',
      html: '<div class="card"><h2>Módulo 0 concluído</h2>' +
        '<div class="stats">' + stat('Engajamento', esc(a.m0.eng || '—')) + stat('Suspeita sensorial', esc(a.m0.sens || '—') + (a.m0.sensQual ? ' · ' + esc(a.m0.sensQual) : '')) + '</div>' +
        ((a.m0.sens === 'sim' || (a.m0.eng && a.m0.eng !== 'colaborou bem')) ? '<div class="alerta">Passo 0 da árvore: condições básicas não adequadas → resolver ou encaminhar primeiro e interpretar os resultados com cautela.</div>' : '') + '</div>',
      acao: botaoProxModulo('m0'),
    }));
    return ps;
  }

  /* ---------- MÓDULO 1 ---------- */
  function passosM1() {
    const a = av();
    const ps = [];
    const bloco = (lista, chave, cronoPath, tempoPath, alunoV, fimFn) => {
      const L = D.m1[lista];
      const n = L.itens.length;
      ps.push(() => Object.assign({ sub: L.nome + ' · instruções' }, intro({
        titulo: L.nome + ' (' + n + ')', tempo: D.m1.tempo, roteiros: [L.roteiro],
        regras: D.m1.regras.concat(lista === 'pseudo' ? [D.m1.regraLexicalizacao] : []),
        extra: '<p class="muted">Dica: para mostrar a lista ao aluno, gire o celular na horizontal.</p>',
        aluno: alunoV, botao: '▶ Começar e iniciar cronômetro', acaoComecar: 'comecaCrono', p: cronoPath,
      })));
      L.itens.forEach((it, i) => ps.push(() => {
        const p = 'm1.' + chave + '.' + i;
        const r = getPath(a, p) || {};
        const errado = r.ok === false || S.errAberto;
        let h = cronoHTML(cronoPath, L.nome) + '<div class="card">' + itemHead(it.g, i + 1, n) +
          '<div class="estimulo">' + esc(it.t) + '</div>';
        if (errado) h += '<label class="f">Como o aluno leu? <span class="muted">(opcional — toque para escrever)</span></label><input type="text" data-f="' + p + '.leu" value="' + esc(r.leu) + '" placeholder="ex.: ' + esc(it.t) + '…" autocapitalize="off" autocomplete="off" data-enter="prox">';
        if (lista === 'pseudo') h += '<div class="contador" style="margin-top:12px"><span class="muted" style="flex:1">Lexicalizações: <b>' + (a.m1.lex || 0) + '</b></span><button class="btn small lexbtn" data-a="lex" data-v="1">+1 lexicalização</button></div>';
        h += '</div>';
        let acao = '';
        if (errado) acao += '<button class="btn pri" data-a="prox">Próximo →</button>';
        acao += botoesOkErr(p + '.ok', true);
        return { sub: L.nome + ' ' + (i + 1) + '/' + n, html: h, acao };
      }));
      ps.push(() => {
        const c = R.calcM1(a.m1);
        return { sub: L.nome + ' · resultado', html: fimFn(c), acao: '<button class="btn pri" data-a="prox">' + (lista === 'palavras' ? 'Continuar: pseudopalavras →' : 'Concluir módulo →') + '</button>' };
      });
    };
    bloco('palavras', 'pal', 'm1.palT', 'm1.palTempo', 'pal', (c) => {
      const T = getPath(a, 'm1.palT');
      return (T && T.t0 ? cronoHTML('m1.palT', 'Pare o cronômetro') : '') + '<div class="card"><h2>Palavras reais — resultado</h2><div class="stats">' +
        ['A1', 'A2', 'A3', 'A4'].map((g) => stat(D.m1.palavras.grupos[g], c.grupos[g] + '/10')).join('') +
        stat('TOTAL palavras', (c.palTotal ?? c.palParcial + '*') + '/40', 'destaque') +
        stat('Precisão', fmt(c.palPct, '%'), c.palPct != null && c.palPct < R.CORTES.palavras ? 'alt' : 'destaque') + '</div>' +
        (c.palResp < 40 ? '<div class="alerta">Faltam ' + (40 - c.palResp) + ' itens sem resposta.</div>' : '') +
        campo('m1.palTempo', 'Tempo da lista (segundos)', 'number') +
        checkBtn('m1.esforco', 'Lê com esforço?') + '</div>';
    });
    bloco('pseudo', 'pse', 'm1.pseT', 'm1.pseTempo', 'pse', (c) => {
      const T = getPath(a, 'm1.pseT');
      return (T && T.t0 ? cronoHTML('m1.pseT', 'Pare o cronômetro') : '') + '<div class="card"><h2>Pseudopalavras — resultado</h2><div class="stats">' +
        ['P1', 'P2', 'P3'].map((g) => stat(g, c.grupos[g] + '/10')).join('') +
        stat('TOTAL', (c.pseTotal ?? c.pseParcial + '*') + '/30', 'destaque') +
        stat('Precisão', fmt(c.psePct, '%'), c.psePct != null && c.psePct < R.CORTES.pseudo ? 'alt' : 'destaque') + '</div>' +
        (c.pseResp < 30 ? '<div class="alerta">Faltam ' + (30 - c.pseResp) + ' itens sem resposta.</div>' : '') +
        campo('m1.pseTempo', 'Tempo (segundos)', 'number') +
        '<label class="f">Lexicalizações (L)</label><div class="contador"><button class="btn" data-a="lex" data-v="-1">−</button><div class="v">' + (a.m1.lex || 0) + '</div><button class="btn" data-a="lex" data-v="1">+</button></div></div>';
    });
    ps.push(() => {
      const c = R.calcM1(a.m1);
      return {
        sub: 'Concluído',
        html: '<div class="card"><h2>Módulo 1 — resumo</h2><div class="stats">' +
          stat('Palavras', (c.palTotal ?? '—') + '/40 · ' + fmt(c.palPct, '%'), c.palPct != null && c.palPct < 90 ? 'alt' : '') +
          stat('Pseudopalavras', (c.pseTotal ?? '—') + '/30 · ' + fmt(c.psePct, '%'), c.psePct != null && c.psePct < 80 ? 'alt' : '') +
          stat('Tempo palavras', fmt(c.palTempo, ' s')) + stat('Tempo pseudo', fmt(c.pseTempo, ' s')) +
          stat('Lê com esforço', c.esforco ? 'sim' : 'não') + stat('Lexicalizações', c.lex) + '</div></div>',
        acao: botaoProxModulo('m1'),
      };
    });
    return ps;
  }

  /* ---------- MÓDULO 2 ---------- */
  function palavrasTexto() {
    const out = []; let idx = 0;
    D.m2.linhas.forEach((l, li) => { l.split(' ').forEach((w) => out.push({ w, i: idx++, li })); });
    return out;
  }
  const PALAVRAS_FLU = palavrasTexto();

  function passosM2() {
    const a = av();
    if (!a.m2) a.m2 = {};
    const ps = [];
    ps.push(() => Object.assign({ sub: 'Instruções' }, intro({
      titulo: D.m2.titulo, tempo: D.m2.tempo, roteiros: [D.m2.roteiro], regras: D.m2.regras,
      extra: '<p class="muted">Mostre o texto ao aluno (caderno impresso ou botão abaixo em outro aparelho) e, neste celular, marque os erros no texto da próxima tela.</p>',
      aluno: 'flu', botao: 'Ir para o texto →',
    })));
    ps.push(() => {
      const m = a.m2; const fase = m.fase || 'pronto';
      const c = R.calcM2(m);
      const erros = new Set(m.erros || []);
      let bar = '<div class="flu-bar' + (fase === 'limite' ? ' ' : '') + '">';
      if (fase === 'pronto') bar += '<div class="relogio">60</div><div class="st">Toque em INICIAR quando disser “Já”. Depois toque nas palavras erradas.</div>';
      else if (fase === 'lendo') bar += '<div class="relogio" data-flu>' + Math.ceil(Math.max(0, 60 - (Date.now() - m.t0) / 1000)) + '</div><div class="st">Lendo… toque nas palavras com ERRO.<br>Erros: <b data-nerros>' + erros.size + '</b></div>';
      else if (fase === 'limite') bar += '<div class="relogio fim">0</div><div class="st"><b style="color:var(--err)">Toque na ÚLTIMA palavra lida no 1º minuto.</b></div>';
      else bar += '<div class="relogio">' + (m.terminou ? Math.round(m.seg) + 's' : '✓') + '</div><div class="st">' + (m.terminou ? 'Terminou antes de 60 s.' : 'Última palavra marcada.') + ' Toque numa palavra para marcar/desmarcar erro.</div>';
      bar += '</div>';
      let t = '<div class="texto-flu' + (fase === 'limite' ? ' modo-limite' : '') + '"><h4>' + esc(D.m2.tituloTexto) + '</h4>';
      D.m2.linhas.forEach((l, li) => {
        if (D.m2.paragrafos.includes(li)) t += (li > 0 ? '</p>' : '') + '<p>';
        const ws = PALAVRAS_FLU.filter((p) => p.li === li);
        ws.forEach((p, k) => {
          let cls = 'w';
          if (erros.has(p.i)) cls += ' e';
          if (m.limite === p.i) cls += ' lim';
          if (m.limite != null && p.i > m.limite) cls += ' alem';
          t += '<span class="' + cls + '" data-w="' + p.i + '">' + esc(p.w) + '</span>' + (k === ws.length - 1 ? '<sup class="acum">' + D.m2.acumulado[li] + '</sup>' : '') + ' ';
        });
      });
      t += '</p>';
      t += '</div>';
      let res = '';
      if (c.lidas != null) {
        res = '<div class="card" style="margin-top:12px"><div class="stats">' +
          stat('Palavras lidas' + (c.terminou ? '' : ' em 60 s'), c.lidas) + stat('Erros', c.erros) +
          stat('PCPM' + (c.terminou ? ' (corretas × 60 ÷ ' + Math.round(c.seg) + ' s)' : ' (lidas − erros)'), fmt(c.pcpm), c.pcpm < (CFG.pisoPCPM || 100) ? 'alt' : 'destaque') +
          stat('Precisão', fmt(c.precisao, '%')) + '</div>' +
          (c.terminou ? campo('m2.seg', 'Tempo total, se terminou (segundos)', 'number') : '') + '</div>';
      } else if (fase !== 'pronto') {
        res = '<div class="card" style="margin-top:12px"><span class="muted">Erros marcados até agora: <b data-nerros>' + erros.size + '</b></span></div>';
      }
      let acao = '';
      if (fase === 'pronto') acao = '<button class="btn ok" style="min-height:76px;font-size:24px" data-a="fluIniciar">▶ INICIAR (60 s)</button>';
      else if (fase === 'lendo') acao = '<button class="btn pri" data-a="fluTerminou">Terminou antes de 60 s</button>';
      else if (fase === 'limite') acao = '<div class="muted" style="text-align:center;padding:6px">Toque na última palavra lida ↑</div>';
      else acao = '<div class="row"><button class="btn small" data-a="fluRemarcar">Remarcar última</button><button class="btn small" data-a="fluReiniciar">Reiniciar</button></div><button class="btn pri" data-a="prox">Prosódia →</button>';
      return { sub: 'Leitura 1 minuto', html: bar + t + res, acao, semTopo: false };
    });
    D.m2.prosodia.dimensoes.forEach((d, k) => ps.push(() => {
      const v = (a.m2.pros || {})[d.id];
      const desc = { 1: d.d1, 2: d.d2, 3: d.d3, 4: d.d4 };
      return {
        sub: 'Prosódia ' + (k + 1) + '/4',
        html: '<div class="card">' + itemHead('Prosódia', k + 1, 4) + '<h2>' + esc(d.nome) + '</h2><p class="muted">' + esc(D.m2.prosodia.nome) + '. ' + esc(D.m2.prosodia.legenda) + '</p>' +
          [1, 2, 3, 4].map((n) => '<button class="btn' + (v === n ? ' pri' : '') + '" style="text-align:left" data-a="nota" data-p="m2.pros.' + d.id + '" data-v="' + n + '"><b style="font-size:24px;margin-right:10px">' + n + '</b>' + esc(desc[n]) + '</button>').join('') +
          '</div>',
        acao: '',
      };
    }));
    ps.push(() => {
      const c = R.calcM2(a.m2);
      return {
        sub: 'Resultado',
        html: '<div class="card"><h2>Módulo 2 — resultado</h2><div class="stats">' +
          stat('Palavras lidas', fmt(c.lidas)) + stat('Erros', fmt(c.erros)) +
          stat('PCPM', fmt(c.pcpm), c.pcpm != null && c.pcpm < (CFG.pisoPCPM || 100) ? 'alt' : 'destaque') + stat('Precisão', fmt(c.precisao, '%')) +
          D.m2.prosodia.dimensoes.map((d) => stat(d.nome, fmt((a.m2.pros || {})[d.id]))).join('') +
          stat('Prosódia TOTAL (4–16)', fmt(c.prosodia), c.prosodia != null && c.prosodia < 8 ? 'alt' : 'destaque') + '</div>' +
          (c.prosodia != null && c.prosodia < 8 ? '<div class="alerta err">' + D.m2.prosodia.alerta + '.</div>' : '') +
          (c.lidas == null ? '<div class="alerta">Falta marcar a última palavra lida (ou “Terminou”).</div>' : '') + '</div>',
        acao: botaoProxModulo('m2'),
      };
    });
    return ps;
  }

  /* ---------- MÓDULO 3 ---------- */
  function passosM3() {
    const a = av();
    const forma = a.cab.forma;
    if (!forma) {
      return [() => ({
        sub: 'Escolha a Forma',
        html: '<div class="card"><h2>Qual Forma?</h2><p class="muted">A Forma define qual texto o aluno LÊ e qual ele OUVE.</p>' +
          '<button class="btn" data-a="forma" data-v="1">Forma 1<br><small>lê o Texto A · ouve o B</small></button>' +
          '<button class="btn" data-a="forma" data-v="2">Forma 2<br><small>lê o Texto B · ouve o A</small></button></div>',
        acao: '',
      })];
    }
    const tx = R.textos(forma);
    const ps = [];
    [['lido', tx.lido], ['ouvido', tx.ouvido]].forEach(([modo, k]) => {
      const T = D.m3.textos[k];
      const base = 'm3.' + k;
      const rot = modo === 'lido' ? 'LIDO pelo aluno (em silêncio)' : 'OUVIDO (lido pelo avaliador)';
      const tagModo = '<span class="tag ' + (modo === 'lido' ? 'pri' : 'warn') + '">' + (modo === 'lido' ? 'LIDO' : 'OUVIDO') + '</span>';
      const textoHTML = '<div class="texto-ler"><h3 style="text-transform:none;color:inherit;letter-spacing:0">' + esc(T.titulo) + '</h3>' + T.paragrafos.map((p) => '<p>' + esc(p) + '</p>').join('') + '</div>';
      ps.push(() => {
        const o = intro({
          titulo: T.nome + ': “' + T.titulo + '” — ' + rot, tempo: 'Forma ' + forma,
          roteiros: [modo === 'lido' ? D.m3.roteiroLido : D.m3.roteiroOuvido],
          regras: modo === 'lido' ? D.m3.regrasLido : D.m3.regrasOuvido,
          extra: modo === 'ouvido'
            ? '<h3>Leia em voz alta</h3>' + textoHTML
            : '<details class="texto-ref"><summary>Ver o texto (só para você)</summary>' + textoHTML + '</details>',
          aluno: modo === 'lido' ? 'txt' + k : null, botao: 'Texto recolhido → Reconto',
        });
        return Object.assign({ sub: T.nome + ' · ' + (modo === 'lido' ? 'lido' : 'ouvido') }, o);
      });
      ps.push(() => ({
        sub: T.nome + ' · reconto',
        html: '<div class="card"><div class="item-head">' + tagModo + '<span class="muted">' + esc(T.titulo) + '</span></div><h2>1) Reconto livre, sem o texto</h2>' +
          '<div class="say">' + esc(D.m3.roteiroReconto) + '</div><p class="muted">' + esc(D.m3.regraReconto) + ' Vale 1 cada.</p>' +
          T.ideias.map((idea, j) => checkBtn(base + '.ideias.' + j, idea, j + 1)).join('') +
          '<p><b>Reconto: ' + (((getPath(a, base + '.ideias') || []).filter(Boolean).length)) + ' / 10</b></p></div>',
        acao: '<button class="btn pri" data-a="recontoFeito" data-p="' + base + '">Pronto → Perguntas</button>',
      }));
      T.perguntas.forEach((q, j) => ps.push(() => ({
        sub: T.nome + ' · pergunta ' + (j + 1) + '/6',
        html: '<div class="card">' + itemHead(q.tipo, j + 1, 6, tagModo) +
          '<div class="say">' + esc(q.p) + '</div>' + rubrica(q.r2, q.r1, q.r0) + '</div>',
        acao: botoes210(base + '.perg.' + j),
      })));
      ps.push(() => {
        const c = R.calcM3(a.m3, forma)[k];
        return {
          sub: T.nome + ' · resultado',
          html: '<div class="card"><div class="item-head">' + tagModo + '<span class="muted">' + esc(T.titulo) + '</span></div><h2>Resultado do ' + T.nome + '</h2><div class="stats">' +
            stat('Reconto', c.reconto + ' / 10') + stat('Perguntas', (c.perguntas ?? c.pergParcial + '*') + ' / 12') +
            stat('Compreensão = (reconto + perguntas) ÷ 22', fmt(c.pct, '%'), c.pct != null && c.pct < 60 ? 'alt' : 'destaque') +
            stat('Conta como', modo === 'lido' ? 'Compreensão LEITORA' : 'Compreensão ORAL') + '</div>' +
            (c.pergResp < 6 ? '<div class="alerta">Faltam ' + (6 - c.pergResp) + ' perguntas sem nota.</div>' : '') +
            campo(base + '.obs', D.m3.observacoes, 'area') + '</div>',
          acao: '<button class="btn pri" data-a="prox">' + (modo === 'lido' ? 'Próximo: texto OUVIDO →' : 'Concluir módulo →') + '</button>',
        };
      });
    });
    ps.push(() => {
      const c = R.calcM3(a.m3, forma);
      return {
        sub: 'Concluído',
        html: '<div class="card"><h2>Módulo 3 — resumo</h2><div class="stats">' +
          stat('Compreensão LEITORA (Texto ' + c.lido + ')', fmt(c.leitora, '%'), c.leitora != null && c.leitora < 60 ? 'alt' : 'destaque') +
          stat('Compreensão ORAL (Texto ' + c.ouvido + ')', fmt(c.oral, '%'), c.oral != null && c.oral < 60 ? 'alt' : 'destaque') +
          stat('Diferença oral − leitora', fmt(c.diferenca, ' p.p.'), c.diferenca != null && c.diferenca >= 20 ? 'alt' : '') + '</div>' +
          (c.diferenca != null && c.diferenca >= 20 ? '<div class="alerta">Diferença ≥ 20 p.p.: sinal de que a leitura das palavras limita a compreensão (reforça Perfil A).</div>' : '') + '</div>',
        acao: botaoProxModulo('m3'),
      };
    });
    return ps;
  }

  /* ---------- MÓDULO 4 ---------- */
  function passosM4() {
    const a = av();
    const ps = [];
    const An = D.m4.anafora, Co = D.m4.conectivos;
    ps.push(() => Object.assign({ sub: '4a · instruções' }, intro({ titulo: An.nome + ' (6)', tempo: D.m4.tempo, roteiros: [An.roteiro], regras: An.regras })));
    An.itens.forEach((it, i) => ps.push(() => ({
      sub: 'Anáfora ' + (i + 1) + '/6',
      html: '<div class="card">' + itemHead('Texto ' + it.texto + ' · ' + D.m3.textos[it.texto].titulo, i + 1, 6) +
        '<p class="muted">Leia a frase enfatizando a palavra destacada e pergunte: “A quem (ou a quê) esta palavra está se referindo?”</p>' +
        '<div class="frase">' + esc(it.antes) + '<mark>' + esc(it.alvo) + '</mark>' + esc(it.depois) + '</div>' +
        '<div class="gabarito">Resposta correta: <b>' + esc(it.resp) + '</b></div></div>',
      acao: botoesOkErr('m4.an.' + i),
    })));
    ps.push(() => Object.assign({ sub: '4b · instruções' }, intro({ titulo: Co.nome + ' (8)', roteiros: [Co.roteiro], regras: Co.regras })));
    Co.itens.forEach((it, i) => ps.push(() => ({
      sub: 'Conectivos ' + (i + 1) + '/8',
      html: '<div class="card">' + itemHead(it.rel, i + 1, 8) +
        '<div class="say">' + esc(it.frase) + '</div><p class="muted" style="margin-bottom:0">Opções — fale nesta ordem:</p>' +
        '<div class="opcoes">' + it.ops.map((o, j) => '<span class="' + (j === it.ok ? 'certa' : '') + '"><i>' + (j + 1) + 'ª</i>' + esc(o) + '</span>').join('') + '</div>' +
        '<div class="gabarito">Correta: <b>' + esc(it.ops[it.ok]) + '</b></div></div>',
      acao: botoesOkErr('m4.con.' + i),
    })));
    ps.push(() => {
      const c = R.calcular(a, CFG);
      return {
        sub: 'Resultado',
        html: '<div class="card"><h2>Módulo 4 — resultado</h2><div class="stats">' +
          stat('Anáfora', (c.an.total ?? c.an.parcial + '*') + ' / 6 · ' + fmt(c.an.pct, '%'), c.C.anafora.alt ? 'alt' : 'destaque') +
          stat('Conectivos', (c.con.total ?? c.con.parcial + '*') + ' / 8 · ' + fmt(c.con.pct, '%'), c.C.conectivos.alt ? 'alt' : 'destaque') + '</div>' +
          (c.an.resp < 6 || c.con.resp < 8 ? '<div class="alerta">Há itens sem resposta.</div>' : '') + '</div>',
        acao: botaoProxModulo('m4'),
      };
    });
    return ps;
  }

  /* ---------- MÓDULO 5 ---------- */
  function passosM5() {
    const a = av();
    const ps = [];
    [['oral', 'oral', 12], ['comando', 'com', 10]].forEach(([k, chave, n]) => {
      const B = D.m5[k];
      ps.push(() => Object.assign({ sub: B.nome + ' · instruções' }, intro({ titulo: B.nome + ' (' + n + ')', tempo: k === 'oral' ? D.m5.tempo : null, roteiros: [B.roteiro], regras: B.regras })));
      B.itens.forEach((it, i) => ps.push(() => ({
        sub: (k === 'oral' ? '5a' : '5b') + ' ' + (i + 1) + '/' + n,
        html: '<div class="card">' + itemHead(k === 'oral' ? '5a · Vocabulário oral' : '5b · Vocabulário de comando', i + 1, n) +
          '<div class="estimulo md">' + esc(it[0]) + '</div>' +
          '<p class="muted">“O que quer dizer <b>' + esc(it[0]) + '</b>?” · Se só der exemplo: “E o que ela significa?”</p>' +
          rubrica(it[1], B.um, B.zero) + '</div>',
        acao: botoes210('m5.' + chave + '.' + i),
      })));
    });
    ps.push(() => {
      const c = R.calcular(a, CFG);
      return {
        sub: 'Resultado',
        html: '<div class="card"><h2>Módulo 5 — resultado</h2><div class="stats">' +
          stat('5a Vocabulário oral', (c.vo.total ?? c.vo.parcial + '*') + ' / 24 · ' + fmt(c.vo.pct, '%'), c.C.vocabOral.alt ? 'alt' : 'destaque') +
          stat('5b Vocabulário de comando', (c.vc.total ?? c.vc.parcial + '*') + ' / 20 · ' + fmt(c.vc.pct, '%'), c.C.vocabComando.alt ? 'alt' : 'destaque') + '</div>' +
          (c.alerta5b ? '<div class="alerta">' + esc(D.m5.alerta5b) + '</div>' : '') +
          (c.C.vocabComando.alt && !c.alerta5b ? '<div class="alerta">Vocabulário de comando < 60%: alerta (não altera o perfil).</div>' : '') + '</div>',
        acao: botaoProxModulo('m5'),
      };
    });
    return ps;
  }

  /* ---------- MÓDULO 6 ---------- */
  function telaAtivar(mod, titulo, condicao) {
    const a = av();
    const c = R.calcular(a, CFG);
    const p1 = c.arvore.passo1;
    const ativo = (a[mod] || {}).ativo;
    return () => ({
      sub: 'Aplicar ou pular',
      html: '<div class="card"><h2>' + esc(titulo) + '</h2><span class="tag warn">OPCIONAL</span><p>' + esc(condicao) + '</p>' +
        (p1 === true ? '<div class="alerta err">Passo 1 ALTERADO neste aluno → recomendado aplicar.</div>'
          : p1 === false ? '<div class="alerta ok">Passo 1 não alterado → pode pular.</div>'
            : '<div class="alerta">Passo 1 ainda incompleto (faltam dados dos Módulos 1 ou 2).</div>') +
        (ativo === false ? '<p class="muted">Situação atual: pulado.</p>' : '') + '</div>',
      acao: '<button class="btn ghost" data-a="ativar" data-p="' + mod + '" data-v="0">Pular este módulo</button><button class="btn pri" data-a="ativar" data-p="' + mod + '" data-v="1">Aplicar →</button>',
    });
  }

  function passosM6() {
    const a = av();
    if (!a.m6) a.m6 = {};
    const M = D.m6;
    const ps = [telaAtivar('m6', M.titulo, M.condicao)];
    if (!a.m6.ativo) return ps;
    ps.push(() => Object.assign({ sub: '6a · instruções' }, intro({ titulo: M.supressao.nome + ' (12)', tempo: M.tempo, roteiros: [M.supressao.roteiro], regras: M.supressao.regras })));
    M.supressao.itens.forEach((it, i) => ps.push(() => ({
      sub: '6a ' + (i + 1) + '/12',
      html: '<div class="card">' + itemHead('6a · Supressão', i + 1, 12) +
        '<div class="say">Diga <b>' + esc(it[0]) + '</b> sem o <b>' + esc(it[1]) + '</b>.</div>' +
        '<div class="estimulo md">' + esc(it[0]) + ' − ' + esc(it[1]) + '</div>' +
        '<div class="gabarito">Resposta esperada: <b>' + esc(it[2]) + '</b></div></div>',
      acao: botoesOkErr('m6.sup.' + i),
    })));
    ps.push(() => Object.assign({ sub: '6b · instruções' }, intro({ titulo: M.repeticao.nome + ' (12)', roteiros: [M.repeticao.roteiro], regras: M.repeticao.regras })));
    M.repeticao.itens.forEach((it, i) => ps.push(() => ({
      sub: '6b ' + (i + 1) + '/12',
      html: '<div class="card">' + itemHead('6b · Repetição', i + 1, 12) +
        '<p class="muted">Fale UMA vez, em ritmo natural:</p><div class="estimulo">' + esc(it) + '</div>' +
        '<div class="gabarito">Vale só a repetição <b>completa e exata</b>.</div></div>',
      acao: botoesOkErr('m6.rep.' + i),
    })));
    [['letras', 'nl'], ['numeros', 'nn']].forEach(([k, ch]) => ps.push(() => {
      const N = M.nomeacao[k];
      const base = 'm6.' + ch;
      const v = getPath(a, base) || {};
      return {
        sub: '6c · ' + N.nome,
        html: '<div class="card"><h2>' + esc(M.nomeacao.nome) + ' — ' + esc(N.nome) + '</h2>' +
          '<div class="say">' + esc(N.roteiro) + '</div>' +
          '<ul class="regras">' + M.nomeacao.regras.map((r) => '<li>' + esc(r) + '</li>').join('') + '</ul>' +
          '<p class="muted">Treino: ' + N.treino.join(' ') + '</p></div>' +
          cronoHTML(base + '.T', 'da 1ª à última (50)') +
          '<div class="card">' + campo(base + '.tempo', 'Tempo (segundos)', 'number') +
          '<label class="f">Erros</label><div class="contador"><button class="btn" data-a="cont" data-p="' + base + '.erros" data-v="-1">−</button><div class="v">' + (v.erros || 0) + '</div><button class="btn" data-a="cont" data-p="' + base + '.erros" data-v="1">+</button></div>' +
          checkBtn(base + '.pulou', 'Pulou ou repetiu linha? (anula a medida)') + '</div>',
        acao: '<button class="btn" data-a="aluno" data-v="' + (k === 'letras' ? 'ranL' : 'ranN') + '">👁 Mostrar ao aluno</button><button class="btn pri" data-a="prox">Próximo →</button>',
      };
    }));
    ps.push(() => {
      const c = R.calcular(a, CFG);
      const nl = a.m6.nl || {}, nn = a.m6.nn || {};
      return {
        sub: 'Resultado',
        html: '<div class="card"><h2>Módulo 6 — resultado</h2><div class="stats">' +
          stat('6a Supressão', (c.sup.total ?? c.sup.parcial + '*') + ' / 12') + stat('6b Repetição', (c.rep.total ?? c.rep.parcial + '*') + ' / 12') +
          stat('Letras', fmt(nl.tempo, ' s') + ' · ' + (nl.erros || 0) + ' erros' + (nl.pulou ? ' · ANULADA' : '')) +
          stat('Números', fmt(nn.tempo, ' s') + ' · ' + (nn.erros || 0) + ' erros' + (nn.pulou ? ' · ANULADA' : '')) + '</div>' +
          '<p class="muted">Critério: referência local. ' + esc(M.nomeacao.leitura) + '</p></div>',
        acao: botaoProxModulo('m6'),
      };
    });
    return ps;
  }

  /* ---------- MÓDULO 7 ---------- */
  function passosM7() {
    const a = av();
    if (!a.m7) a.m7 = {};
    const M = D.m7;
    const ps = [telaAtivar('m7', M.titulo, M.condicao)];
    if (!a.m7.ativo) return ps;
    ps.push(() => Object.assign({ sub: 'Instruções' }, intro({ titulo: M.titulo + ' (28)', tempo: M.tempo, fazer: M.roteiro, regras: M.regras })));
    let num = 0;
    M.grupos.forEach((g) => g.itens.forEach((w, i) => {
      const nFolha = ++num;
      ps.push(() => {
        const p = 'm7.itens.' + g.id + '.' + i;
        const r = getPath(a, p) || {};
        return {
          sub: 'Ditado ' + nFolha + '/28',
          html: '<div class="card">' + itemHead(g.nome + ' ' + (i + 1) + '/' + g.itens.length, nFolha, 28) +
            '<div class="estimulo">' + esc(w) + '</div>' +
            (g.id === 'pse' ? '<p class="muted">Pseudopalavra: sem frase. Aceite qualquer grafia que represente a pronúncia.</p>' : '<p class="muted">Diga a palavra, uma frase curta com ela e a palavra de novo.</p>') +
            '<label class="f">Como escreveu (opcional)</label><input type="text" data-f="' + p + '.esc" value="' + esc(r.esc) + '" autocapitalize="off" autocomplete="off" data-enter="prox"></div>',
          acao: (r.ok === false ? '<button class="btn pri" data-a="prox">Próximo →</button>' : '') + botoesOkErr(p + '.ok', true),
        };
      });
    }));
    ps.push(() => ({
      sub: 'Classificação dos erros',
      html: '<div class="card"><h2>' + esc(M.tituloZorzi) + '</h2>' + M.zorzi.map((z, i) => checkBtn('m7.zorzi.' + i, z)).join('') +
        '<p class="muted">' + esc(M.leitura) + '</p></div>',
      acao: '<button class="btn pri" data-a="prox">Concluir módulo →</button>',
    }));
    ps.push(() => {
      const c = R.calcular(a, CFG).m7;
      return {
        sub: 'Resultado',
        html: '<div class="card"><h2>Módulo 7 — resultado</h2><div class="stats">' +
          M.grupos.map((g) => stat(g.nome, c.grupos[g.id].ok + ' / ' + g.itens.length)).join('') +
          stat('TOTAL', c.total + ' / 28', 'destaque') + '</div>' +
          (c.resp < 28 ? '<div class="alerta">Faltam ' + (28 - c.resp) + ' palavras sem correção.</div>' : '') + '</div>',
        acao: '<button class="btn pri" data-a="resumo">Resumo e Decisão →</button><button class="btn small ghost" data-a="menu">☰ Menu dos módulos</button>',
      };
    });
    return ps;
  }

  const PASSOS = { cab: passosCab, m0: passosM0, m1: passosM1, m2: passosM2, m3: passosM3, m4: passosM4, m5: passosM5, m6: passosM6, m7: passosM7 };

  /* ================= TELAS PRINCIPAIS ================= */
  function progressoGeral(a) {
    const st = R.statusModulos(a);
    const ks = ['cab', 'm0', 'm1', 'm2', 'm3', 'm4', 'm5', 'res'];
    let s = 0; ks.forEach((k) => { s += st[k] === 'ok' ? 1 : st[k] === 'andamento' ? 0.5 : 0; });
    return Math.round((s / ks.length) * 100);
  }

  function telaLista() {
    const lista = Object.values(DB).sort((x, y) => (y.atualizado || 0) - (x.atualizado || 0));
    let h = '<h1>Avaliações Tier 2</h1>';
    h += '<button class="btn pri" data-a="nova">＋ Nova avaliação</button>';
    if (!lista.length) h += '<div class="card"><p>Nenhuma avaliação ainda.</p><p class="muted">Os dados ficam só neste aparelho. Faça backup de vez em quando (botão abaixo).</p></div>';
    lista.forEach((a) => {
      const c = R.calcular(a, CFG);
      const perf = (a.res && a.res.perfilConf) || c.arvore.perfil;
      const conf = a.res && a.res.perfilConf;
      h += '<div class="card aluno" data-a="abrir" data-v="' + a.id + '" role="button">' +
        '<div class="perfil ' + (perf ? 'p' + perf : '') + '" title="' + (conf ? 'confirmado' : 'sugerido') + '">' + (perf || '?') + (perf && !conf ? '<small style="font-size:10px">?</small>' : '') + '</div>' +
        '<div class="info"><div class="nome">' + esc(a.cab.nome || '(sem nome)') + '</div><div class="muted">' + esc(a.cab.turma || '—') + ' · ' + dataBR(a.cab.data) + ' · Forma ' + (a.cab.forma || '?') + '</div>' +
        '<div class="muted" style="font-size:12px">Cód. ' + codigo(a) + (a.cab.avaliador ? ' · ' + esc(a.cab.avaliador) : '') + '</div>' +
        '<div class="minibar"><div style="width:' + progressoGeral(a) + '%"></div></div></div></div>';
    });
    const acao = '<div class="row"><button class="btn small" data-a="exportarTodos">⬇ Excel (todos)</button><button class="btn small" data-a="backup">💾 Backup</button></div>' +
      '<div class="row"><button class="btn small ghost" data-a="restaurar">⤒ Restaurar backup</button><button class="btn small ghost" data-a="config">⚙ Configurações</button></div>';
    return { titulo: 'Tier 2 Digital', sub: 'Registro da avaliação individual de leitura', html: h, acao, semVoltar: true };
  }

  function telaMenu() {
    const a = av();
    const st = R.statusModulos(a);
    const rot = { nao: 'não iniciado', andamento: 'em andamento', ok: 'completo', pulado: 'pulado' };
    let h = '<div class="card"><h2>' + esc(a.cab.nome || '(sem nome)') + '</h2><span class="muted">' + esc(a.cab.turma || '') + ' · ' + dataBR(a.cab.data) + ' · Forma ' + (a.cab.forma || '?') + '<br>Código da avaliação: <b>' + codigo(a) + '</b>' + (a.cab.matricula ? ' · Nº do aluno: ' + esc(a.cab.matricula) : '') + '</span></div>';
    MODS.forEach((m) => {
      h += '<button class="mod st-' + st[m] + '" data-a="abrirMod" data-v="' + m + '"><span class="num">' + (st[m] === 'ok' ? '✓' : NOMES[m][0]) + '</span>' +
        '<span class="t">' + (m === 'cab' ? '' : 'Módulo ' + NOMES[m][0] + ' — ') + NOMES[m][1] + '<small>' + NOMES[m][2] + '</small></span>' +
        '<span class="tag ' + (st[m] === 'ok' ? 'ok' : st[m] === 'andamento' ? 'warn' : '') + '">' + rot[st[m]] + '</span></button>';
    });
    h += '<button class="mod st-' + st.res + '" data-a="resumo"><span class="num">★</span><span class="t">Resumo e Decisão<small>Critérios, perfil sugerido, encaminhamento</small></span><span class="tag ' + (st.res === 'ok' ? 'ok' : '') + '">' + (st.res === 'ok' ? 'perfil confirmado' : 'a confirmar') + '</span></button>';
    h += '<button class="btn small ghost" style="color:var(--err);margin-top:24px" data-a="apagar">🗑 Apagar esta avaliação</button>';
    return { titulo: a.cab.nome || 'Avaliação', sub: 'Módulos', html: h, acao: '<button class="btn small" data-a="lista">← Lista de alunos</button>' };
  }

  function telaResumo() {
    const a = av();
    if (!a.res) a.res = {};
    const c = R.calcular(a, CFG);
    const arv = c.arvore;
    const tx = R.textos(a.cab.forma);
    let h = '<div class="card"><h2>' + esc(a.cab.nome || '(sem nome)') + '</h2><div class="muted">' + esc(a.cab.turma || '') + ' · ' + esc(a.cab.idade ? a.cab.idade + ' anos' : '') + ' · ' + dataBR(a.cab.data) + ' · Avaliador(a): ' + esc(a.cab.avaliador || '—') + '<br>Código da avaliação: <b>' + codigo(a) + '</b>' + (a.cab.matricula ? ' · Nº do aluno: ' + esc(a.cab.matricula) : '') +
      '<br>Forma ' + (a.cab.forma || '?') + (tx.lido ? ' (lê ' + tx.lido + ', ouve ' + tx.ouvido + ')' : '') + ' · Triagem ' + fmt(a.cab.triagem) + '/8 · EL Parte A ' + fmt(a.cab.elA) + '/50</div></div>';

    // Tabela de critérios
    h += '<div class="card"><h2>Resumo e decisão</h2><table class="res"><colgroup><col class="c1"><col class="c2"><col class="c3"><col class="c4"></colgroup><tr><th>Medida</th><th>Valor</th><th>Critério</th><th>Alt.?</th></tr>';
    c.crit.forEach((k) => {
      h += '<tr class="' + (k.alt ? 'alt' : '') + '"><td>' + esc(k.nome) + '</td><td class="v">' + (k.valor == null ? '—' : fmt(k.valor, k.fmt)) + '</td><td class="c">' + esc(k.regra) + '</td><td class="a">' + (k.alt == null ? '—' : k.alt ? 'SIM' : 'não') + '</td></tr>';
    });
    const m6 = a.m6 || {};
    if (m6.ativo) {
      const nl = m6.nl || {}, nn = m6.nn || {};
      h += '<tr class="' + (a.res.altFono ? 'alt' : '') + '"><td>Supressão / repetição</td><td class="v">' + fmt(c.sup.total ?? c.sup.parcial) + ' / ' + fmt(c.rep.total ?? c.rep.parcial) + '</td><td class="c">referência local</td><td class="a"><button class="chip' + (a.res.altFono ? ' on' : '') + '" data-a="toggleR" data-p="res.altFono">' + (a.res.altFono ? 'SIM' : 'não') + '</button></td></tr>';
      h += '<tr class="' + (a.res.altRAN ? 'alt' : '') + '"><td>Nomeação rápida</td><td class="v">L ' + fmt(nl.tempo, 's') + '<br>N ' + fmt(nn.tempo, 's') + '</td><td class="c">referência local</td><td class="a"><button class="chip' + (a.res.altRAN ? ' on' : '') + '" data-a="toggleR" data-p="res.altRAN">' + (a.res.altRAN ? 'SIM' : 'não') + '</button></td></tr>';
    }
    h += '</table><p class="muted">* Enquanto não houver grupo de referência local, usa-se ' + (CFG.pisoPCPM || 100) + ' PCPM como piso provisório (ajuste em Configurações). Nenhum critério decide sozinho.</p></div>';

    // Árvore
    h += '<div class="card"><h2>Árvore de decisão (Manual)</h2>';
    arv.passos.forEach((p) => {
      h += '<div class="passo ' + (p.resposta === 'sim' ? (p.passo.startsWith('Passo 0') ? 'nao' : 'sim') : p.resposta === 'não' ? (p.passo.startsWith('Passo 0') ? 'sim' : 'nao') : '') + '"><b>' + esc(p.passo) + '</b><span class="muted">' + esc(p.pergunta) + '</span><br><span class="r">→ ' + esc(p.resposta === '?' ? 'incompleto' : p.resposta.toUpperCase()) + '</span>' +
        (p.detalhe ? ' <span class="muted">(' + esc(p.detalhe) + ')</span>' : '') + (p.nota ? '<div class="alerta">' + esc(p.nota) + '</div>' : '') + '</div>';
    });
    if (arv.perfil) h += '<div class="alerta ok" style="font-size:17px">Perfil sugerido: <b>' + esc(D.perfis[arv.perfil]) + '</b></div>';
    else h += '<div class="alerta">Perfil ainda não pode ser sugerido: faltam dados (veja acima).</div>';
    arv.reforcos.forEach((r) => { h += '<div class="alerta">' + esc(r) + '</div>'; });
    if (c.alerta5b) h += '<div class="alerta">' + esc(D.m5.alerta5b) + '</div>';
    h += '</div>';

    // Confirmação
    h += '<div class="card perfis"><h2>Perfil (confirme ou troque)</h2>';
    Object.keys(D.perfis).forEach((k) => {
      h += '<button class="btn' + (a.res.perfilConf === k ? ' sel' : '') + '" data-a="perfil" data-v="' + k + '">' + (arv.perfil === k ? '<span class="sug">sugerido</span>' : '') + (a.res.perfilConf === k ? '✓ ' : '') + esc(D.perfis[k]) + '</button>';
    });
    const pf = a.res.perfilConf || arv.perfil;
    if (pf) h += '<div class="say fazer" style="font-size:15px"><b>Foco da intervenção (' + pf + '):</b> ' + esc(D.intervencao[pf].foco) + '<br><b>Como monitorar (a cada 2 semanas):</b> ' + esc(D.intervencao[pf].monitorar) + '</div>';
    h += '</div>';

    h += '<div class="card">' + campo('res.hipotese', 'Hipótese principal e o que ensinar primeiro', 'area') +
      campo('res.monitoramento', 'Medida de monitoramento escolhida e meta para 8–12 semanas', 'area') +
      '<label class="f">Encaminhamento externo</label>' + chips('res.enc', D.encaminhamentos, true) +
      ((a.res.enc || []).includes('outro') ? campo('res.encOutro', 'Outro: qual?', 'text') : '') + '</div>';
    h += '<div class="alerta">' + esc(D.lembrete) + '</div>';
    const acao = '<button class="btn pri" data-a="exportarUm">⬇ Exportar este aluno (Excel)</button><div class="row"><button class="btn small ghost" data-a="menu">☰ Módulos</button><button class="btn small ghost" data-a="lista">Lista de alunos</button></div>';
    return { titulo: a.cab.nome || 'Resumo', sub: 'Resumo e Decisão', html: h, acao };
  }

  function telaConfig() {
    let h = '<div class="card"><h2>Configurações</h2>' +
      '<label class="f">Piso de PCPM (fluência)</label><input type="number" inputmode="numeric" data-cfg="pisoPCPM" value="' + esc(CFG.pisoPCPM) + '">' +
      '<p class="muted">Padrão: 100 (piso provisório do manual). Troque pelo menor valor do seu grupo de referência local assim que tiver.</p></div>' +
      '<div class="card"><h2>Privacidade</h2><p>Os dados ficam <b>somente neste aparelho</b>, no armazenamento do navegador. Nada é enviado para a internet.</p>' +
      '<p class="muted">Se limpar os dados do navegador ou trocar de celular, as avaliações se perdem. Use <b>Backup</b> regularmente e guarde o arquivo em local seguro (são dados de menores — LGPD).</p>' +
      '<p class="muted">Avaliações salvas: ' + Object.keys(DB).length + '</p></div>';
    return { titulo: 'Configurações', sub: '', html: h, acao: '<button class="btn pri" data-a="lista">← Voltar</button>' };
  }

  /* ================= RENDER ================= */
  let ultimaChave = '';
  function render() {
    let t;
    let progresso = null;
    if (S.tela === 'lista' || !av()) { S.tela = 'lista'; t = telaLista(); }
    else if (S.tela === 'menu') t = telaMenu();
    else if (S.tela === 'resumo') t = telaResumo();
    else if (S.tela === 'config') t = telaConfig();
    else {
      const ps = PASSOS[S.mod]();
      if (S.i >= ps.length) S.i = ps.length - 1;
      if (S.i < 0) S.i = 0;
      const p = ps[S.i]();
      const nomeMod = S.mod === 'cab' ? 'Identificação' : 'Módulo ' + NOMES[S.mod][0] + ' · ' + NOMES[S.mod][1];
      t = { titulo: nomeMod, sub: (av().cab.nome ? av().cab.nome + ' · ' : '') + (p.sub || ''), html: p.html, acao: p.acao };
      progresso = ps.length > 1 ? Math.round((S.i / (ps.length - 1)) * 100) : 100;
      av().pos = av().pos || {}; av().pos[S.mod] = S.i; gravar(K_DB, DB);
    }
    const chave = S.tela + '|' + S.mod + '|' + S.i + '|' + S.avId;
    $('#top').innerHTML = '<div class="top-row">' +
      (t.semVoltar ? '<span style="width:8px"></span>' : '<button class="icon-btn" data-a="voltar" aria-label="Voltar">←</button>') +
      '<div class="top-title">' + esc(t.titulo) + (t.sub ? '<small>' + esc(t.sub) + '</small>' : '') + '</div>' +
      (S.tela === 'passo' ? '<button class="icon-btn" data-a="menu" aria-label="Menu dos módulos">☰</button>' : '') +
      '</div>' + (progresso != null ? '<div class="prog"><div style="width:' + progresso + '%"></div></div>' : '');
    $('#main').innerHTML = t.html;
    $('#acao').innerHTML = '<div class="acao-in">' + (t.acao || '') + '</div>';
    $('#acao').classList.toggle('hidden', !t.acao);
    if (chave !== ultimaChave) { window.scrollTo(0, 0); ultimaChave = chave; }
    const f = $('[data-foco]');
    if (f) { f.focus({ preventScroll: true }); }
    salvarPos();
  }

  /* ================= NAVEGAÇÃO ================= */
  function abrirMod(m) {
    const a = av();
    S.tela = 'passo'; S.mod = m; S.errAberto = false;
    S.i = (a.pos && a.pos[m]) || 0;
    render();
  }
  function prox() {
    S.errAberto = false;
    const n = PASSOS[S.mod]().length;
    if (S.i < n - 1) { S.i++; render(); } else { S.tela = 'menu'; render(); }
  }
  function voltar() {
    S.errAberto = false;
    if (S.tela === 'passo') { if (S.i > 0) { S.i--; render(); } else { S.tela = 'menu'; render(); } }
    else if (S.tela === 'menu' || S.tela === 'config') { S.tela = 'lista'; render(); }
    else if (S.tela === 'resumo') { S.tela = 'menu'; render(); }
  }

  function novaAvaliacao() {
    S.cabErros = null;
    const a = {
      id: novoId(), criado: Date.now(), atualizado: Date.now(),
      cab: { nome: '', turma: PREF.turma || '', idade: '', data: hoje(), avaliador: PREF.avaliador || '', dominios: [], forma: null },
      m0: { resp: [] }, m1: { pal: [], pse: [], lex: 0 }, m2: {}, m3: { A: {}, B: {} }, m4: { an: [], con: [] }, m5: { oral: [], com: [] }, m6: {}, m7: {}, res: {}, pos: {},
    };
    DB[a.id] = a; salvar(a);
    S.avId = a.id; S.tela = 'passo'; S.mod = 'cab'; S.i = 0;
    render();
    const inp = $('[data-f="cab.nome"]'); if (inp) inp.focus();
  }

  function lembrarPrefs() {
    const a = av(); if (!a) return;
    if (a.cab.avaliador) PREF.avaliador = a.cab.avaliador;
    if (a.cab.turma) {
      PREF.turma = a.cab.turma;
      PREF.turmas = [a.cab.turma].concat(PREF.turmas.filter((t) => t !== a.cab.turma)).slice(0, 8);
    }
    if (a.cab.forma) PREF.ultimaForma = a.cab.forma;
    gravar(K_PREF, PREF);
  }

  /* ================= AÇÕES ================= */
  const A = {
    nova: novaAvaliacao,
    abrir: (d) => { S.avId = d.v; S.tela = 'menu'; render(); },
    lista: () => { S.tela = 'lista'; render(); },
    menu: () => { S.tela = 'menu'; S.errAberto = false; render(); },
    resumo: () => { S.tela = 'resumo'; render(); },
    config: () => { S.tela = 'config'; render(); },
    voltar,
    prox,
    proxCab0: () => {
      const a = av();
      const erros = validarCab0(a);
      if (Object.keys(erros).length) { S.cabErros = erros; toast('Corrija os campos destacados.'); render(); return; }
      S.cabErros = null;
      prox();
    },
    abrirMod: (d) => abrirMod(d.v),
    apagar: () => {
      const a = av();
      if (confirm('Apagar a avaliação de "' + (a.cab.nome || 'sem nome') + '"? Isso não pode ser desfeito.')) {
        delete DB[a.id]; gravar(K_DB, DB); S.avId = null; S.tela = 'lista'; render(); toast('Avaliação apagada.');
      }
    },
    okErr: (d, b) => {
      const a = av(); const ok = d.v === '1';
      setPath(a, d.p, ok);
      if (ok && /^m1\./.test(d.p)) setPath(a, d.p.replace(/ok$/, 'leu'), '');
      salvar(a);
      if (ok) {
        // último item da lista para o cronômetro sozinho
        autoPararCrono();
        prox();
      } else if (b && b.dataset.fica) { S.errAberto = true; autoPararCrono(); render(); }
      else prox();
    },
    nota: (d) => { const a = av(); setPath(a, d.p, Number(d.v)); salvar(a); prox(); },
    setAvanca: (d) => { const a = av(); setPath(a, d.p, d.v); salvar(a); prox(); },
    toggle: (d) => { const a = av(); setPath(a, d.p, !getPath(a, d.p)); salvar(a); render(); },
    toggleR: (d) => { const a = av(); setPath(a, d.p, !getPath(a, d.p)); salvar(a); render(); },
    chip: (d) => { const a = av(); setPath(a, d.p, getPath(a, d.p) === d.v ? null : d.v); salvar(a); if (d.p === 'cab.turma') { lembrarPrefs(); if (S.cabErros) delete S.cabErros.turma; } render(); },
    chipMulti: (d) => {
      const a = av(); let v = getPath(a, d.p) || [];
      v = v.includes(d.v) ? v.filter((x) => x !== d.v) : v.concat([d.v]);
      if (d.p === 'res.enc') { if (d.v === 'não' && v.includes('não')) v = ['não']; else v = v.filter((x) => x !== 'não' || d.v === 'não'); }
      setPath(a, d.p, v); salvar(a); render();
    },
    forma: (d) => { const a = av(); a.cab.forma = Number(d.v); salvar(a); lembrarPrefs(); render(); },
    fimCab: () => { lembrarPrefs(); if (!av().cab.forma) { toast('Escolha a Forma (1 ou 2).'); return; } abrirMod('m0'); },
    sens: (d) => { const a = av(); a.m0.sens = d.v; if (d.v === 'não') { a.m0.sensQual = ''; salvar(a); prox(); } else { salvar(a); render(); } },
    lex: (d) => { const a = av(); a.m1.lex = Math.max(0, (a.m1.lex || 0) + Number(d.v)); salvar(a); render(); },
    cont: (d) => { const a = av(); setPath(a, d.p, Math.max(0, (getPath(a, d.p) || 0) + Number(d.v))); salvar(a); render(); },
    cronoIniciar: (d) => { cronoIniciar(d.p); render(); },
    cronoParar: (d) => { cronoParar(d.p); render(); },
    cronoZerar: (d) => { const a = av(); setPath(a, d.p, { t0: null, acc: 0 }); salvar(a); render(); },
    comecaCrono: (d) => { cronoIniciar(d.p); prox(); },
    recontoFeito: (d) => { const a = av(); setPath(a, d.p + '.recontoFeito', true); salvar(a); prox(); },
    ativar: (d) => {
      const a = av(); a[d.p] = a[d.p] || {}; a[d.p].ativo = d.v === '1'; salvar(a);
      if (d.v === '1') { S.i = 1; render(); } else { S.tela = 'menu'; render(); }
    },
    perfil: (d) => { const a = av(); a.res.perfilConf = a.res.perfilConf === d.v ? null : d.v; salvar(a); render(); },
    aluno: (d) => mostrarAluno(d.v),
    fluIniciar: () => { const a = av(); a.m2.erros = []; a.m2.t0 = Date.now(); a.m2.fase = 'lendo'; a.m2.terminou = false; a.m2.limite = null; a.m2.seg = null; salvar(a); render(); },
    fluTerminou: () => {
      const a = av(); const seg = Math.round(((Date.now() - a.m2.t0) / 1000) * 10) / 10;
      a.m2.seg = seg; a.m2.terminou = true; a.m2.limite = R.N_TEXTO - 1; a.m2.fase = 'revisao'; salvar(a); render();
    },
    fluRemarcar: () => { const a = av(); a.m2.fase = 'limite'; a.m2.terminou = false; a.m2.seg = null; salvar(a); render(); },
    fluReiniciar: () => { if (confirm('Apagar os erros marcados e reiniciar o minuto?')) { const a = av(); a.m2 = { pros: a.m2.pros }; salvar(a); render(); } },
    exportarTodos: () => exportar(Object.values(DB)),
    exportarUm: () => exportar([av()]),
    backup,
    restaurar: () => $('#arquivo').click(),
  };

  function autoPararCrono() {
    // para o cronômetro da lista ao responder o último item
    const a = av();
    if (S.mod !== 'm1') return;
    // passos do Módulo 1: 0 = instruções, 1–40 = palavras, 41 = resultado, 42 = instruções, 43–72 = pseudopalavras
    if (S.i === 40 && a.m1.palT && a.m1.palT.t0) cronoParar('m1.palT');
    if (S.i === 72 && a.m1.pseT && a.m1.pseT.t0) cronoParar('m1.pseT');
  }

  function tocarPalavra(i) {
    const a = av(); const m = a.m2;
    if (!m.fase || m.fase === 'pronto') { toast('Toque em ▶ INICIAR antes de marcar erros.'); return; }
    if (m.fase === 'limite') {
      m.limite = i; m.fase = 'revisao'; m.terminou = false; m.seg = null;
      const ov = $('.fim-tempo'); if (ov) ov.remove();
      salvar(a); render(); return;
    }
    const e = new Set(m.erros || []);
    if (e.has(i)) e.delete(i); else e.add(i);
    m.erros = Array.from(e).sort((x, y) => x - y);
    if (!m.fase) m.fase = 'pronto';
    salvar(a);
    if (m.fase === 'lendo') {
      // não redesenha a tela inteira durante a leitura (mantém a rolagem)
      const el = $('[data-w="' + i + '"]'); if (el) el.classList.toggle('e');
      $$('[data-nerros]').forEach((n) => { n.textContent = m.erros.length; });
      vibrar(15);
    } else render();
  }

  document.addEventListener('click', (ev) => {
    const w = ev.target.closest('[data-w]');
    if (w && S.tela === 'passo' && S.mod === 'm2') { tocarPalavra(Number(w.dataset.w)); return; }
    const b = ev.target.closest('[data-a]');
    if (!b) return;
    const fn = A[b.dataset.a];
    if (fn) { ev.preventDefault(); fn({ v: b.dataset.v, p: b.dataset.p }, b); }
  });

  document.addEventListener('input', (ev) => {
    const el = ev.target;
    if (el.dataset.f) {
      const a = av(); if (!a) return;
      let v = el.value;
      if (el.dataset.num) v = v === '' ? null : Number(String(v).replace(',', '.'));
      setPath(a, el.dataset.f, v); salvar(a);
      if (S.cabErros && ['cab.nome', 'cab.turma', 'cab.avaliador'].includes(el.dataset.f)) {
        el.classList.remove('erro');
        const m = el.nextElementSibling; if (m && m.classList.contains('erro-msg')) m.remove();
        delete S.cabErros[el.dataset.f.replace('cab.', '')];
      }
    } else if (el.dataset.cfg) {
      CFG[el.dataset.cfg] = el.value === '' ? 100 : Number(el.value); gravar(K_CFG, CFG);
    }
  });
  document.addEventListener('change', (ev) => {
    if (ev.target.dataset.f && (ev.target.dataset.f.startsWith('cab.') || ev.target.dataset.f === 'm2.seg')) {
      if (ev.target.dataset.f.startsWith('cab.')) lembrarPrefs();
    }
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && ev.target.dataset && ev.target.dataset.enter) { ev.preventDefault(); ev.target.blur(); A[ev.target.dataset.enter]({}); }
  });

  /* ================= TELA DO ALUNO ================= */
  function mostrarAluno(tipo) {
    let h = '';
    const colunas = (L) => {
      const n = L.itens.length / L.colunas;
      let g = '<div class="grade c' + L.colunas + '">';
      for (let c = 0; c < L.colunas; c++) g += '<div class="col">' + L.itens.slice(c * n, c * n + n).map((it) => '<div>' + esc(it.t) + '</div>').join('') + '</div>';
      return g + '</div>';
    };
    if (tipo === 'pal' || tipo === 'pse') {
      const L = D.m1[tipo === 'pal' ? 'palavras' : 'pseudo'];
      h = '<h2>' + esc(L.tituloAluno) + '</h2><p class="inst">' + esc(L.instrAluno) + '</p>' + colunas(L);
    } else if (tipo === 'flu') {
      h = '<div class="txt"><h2>' + esc(D.m2.tituloAluno) + '</h2><p class="inst">' + esc(D.m2.instrAluno) + '</p><h3>' + esc(D.m2.tituloTexto) + '</h3>';
      const pars = D.m2.paragrafos.concat([D.m2.linhas.length]);
      for (let k = 0; k < pars.length - 1; k++) h += '<p>' + esc(D.m2.linhas.slice(pars[k], pars[k + 1]).join(' ')) + '</p>';
      h += '</div>';
    } else if (tipo === 'txtA' || tipo === 'txtB') {
      const T = D.m3.textos[tipo.slice(3)];
      h = '<div class="txt"><h2>' + esc(T.nome.toUpperCase()) + '</h2><p class="inst">' + esc(D.m3.tituloAluno) + '</p><h3>' + esc(T.titulo) + '</h3>' + T.paragrafos.map((p) => '<p>' + esc(p) + '</p>').join('') + '</div>';
    } else if (tipo === 'ranL' || tipo === 'ranN') {
      const N = D.m6.nomeacao[tipo === 'ranL' ? 'letras' : 'numeros'];
      h = '<h2>' + (tipo === 'ranL' ? 'Diga o nome das LETRAS o mais rápido que conseguir' : 'Diga o nome dos NÚMEROS o mais rápido que conseguir') + '</h2><p class="inst">Da esquerda para a direita, linha por linha, como se estivesse lendo.</p>' +
        '<p class="inst">Treino:</p><div class="ran treino">' + N.treino.map((x) => '<div>' + x + '</div>').join('') + '</div>' +
        '<div class="ran">' + N.grade.flat().map((x) => '<div>' + x + '</div>').join('') + '</div>';
    }
    const v = $('#alunoView');
    v.innerHTML = h;
    v.classList.remove('hidden');
    $('#alunoSair').classList.remove('hidden');
    window.scrollTo(0, 0);
  }
  function fecharAluno() { $('#alunoView').classList.add('hidden'); $('#alunoSair').classList.add('hidden'); }

  /* ================= EXCEL ================= */
  const simNao = (b) => (b == null ? '' : b ? 'Sim' : 'Não');
  const num = (v) => (v == null || v === '' || isNaN(v) ? '' : Number(v));

  function linhaResumo(a) {
    const c = R.calcular(a, CFG);
    const cab = a.cab || {}, m0 = a.m0 || {}, m1 = c.m1, m2 = c.m2, m3 = c.m3;
    const pros = (a.m2 || {}).pros || {};
    const m6 = a.m6 || {}, nl = m6.nl || {}, nn = m6.nn || {};
    const res = a.res || {};
    const o = {
      'Código da avaliação': codigo(a), 'Nº do aluno': cab.matricula || '',
      'Nome': cab.nome || '', 'Turma': cab.turma || '', 'Idade': num(cab.idade), 'Data': dataBR(cab.data), 'Avaliador(a)': cab.avaliador || '',
      'Triagem (/8)': num(cab.triagem), 'EL Parte A (/50)': num(cab.elA),
      'Domínios em risco': (cab.dominios || []).concat(cab.dominioOutro ? [cab.dominioOutro] : []).join(', '),
      'Motivo do encaminhamento': cab.motivo || '', 'Forma': cab.forma || '', 'Texto lido': m3.lido || '', 'Texto ouvido': m3.ouvido || '',
      'Gravação autorizada': cab.gravacao || '', 'Autorização responsáveis': cab.autorizacao || '',
      'Engajamento': m0.eng || '', 'Suspeita sensorial': m0.sens || '', 'Suspeita: qual': m0.sensQual || '',
      'A1 (/10)': m1.grupos.A1, 'A2 (/10)': m1.grupos.A2, 'A3 (/10)': m1.grupos.A3, 'A4 (/10)': m1.grupos.A4,
      'Palavras (/40)': num(m1.palTotal), 'Palavras %': num(m1.palPct), 'Tempo palavras (s)': num(m1.palTempo), 'Lê com esforço': simNao(m1.esforco),
      'P1 (/10)': m1.grupos.P1, 'P2 (/10)': m1.grupos.P2, 'P3 (/10)': m1.grupos.P3,
      'Pseudopalavras (/30)': num(m1.pseTotal), 'Pseudopalavras %': num(m1.psePct), 'Tempo pseudo (s)': num(m1.pseTempo), 'Lexicalizações': m1.lex,
      'Fluência: palavras lidas': num(m2.lidas), 'Fluência: erros': num(m2.erros), 'Terminou antes: tempo (s)': m2.terminou ? num(m2.seg) : '',
      'PCPM': num(m2.pcpm), 'Precisão fluência %': num(m2.precisao),
      'Prosódia: expressão': num(pros.expressao), 'Prosódia: fraseamento': num(pros.fraseamento), 'Prosódia: fluidez': num(pros.fluidez), 'Prosódia: ritmo': num(pros.ritmo),
      'Prosódia total (/16)': num(m2.prosodia),
      'Texto A reconto (/10)': m3.A.reconto, 'Texto A perguntas (/12)': num(m3.A.perguntas), 'Texto A %': num(m3.A.pct),
      'Texto B reconto (/10)': m3.B.reconto, 'Texto B perguntas (/12)': num(m3.B.perguntas), 'Texto B %': num(m3.B.pct),
      'Compreensão LEITORA %': num(m3.leitora), 'Compreensão ORAL %': num(m3.oral), 'Diferença oral − leitora (p.p.)': num(m3.diferenca),
      'Anáfora (/6)': num(c.an.total), 'Anáfora %': num(c.an.pct), 'Conectivos (/8)': num(c.con.total), 'Conectivos %': num(c.con.pct),
      'Vocab. oral (/24)': num(c.vo.total), 'Vocab. oral %': num(c.vo.pct), 'Vocab. comando (/20)': num(c.vc.total), 'Vocab. comando %': num(c.vc.pct),
      'Alerta 5b << 5a': simNao(c.alerta5b),
      'Módulo 6 aplicado': m6.ativo ? 'Sim' : m6.ativo === false ? 'Pulado' : '',
      'Supressão (/12)': m6.ativo ? num(c.sup.total) : '', 'Repetição (/12)': m6.ativo ? num(c.rep.total) : '',
      'Nomeação letras (s)': m6.ativo ? num(nl.tempo) : '', 'Nomeação letras erros': m6.ativo ? (nl.erros || 0) : '', 'Nomeação letras pulou linha': m6.ativo ? simNao(!!nl.pulou) : '',
      'Nomeação números (s)': m6.ativo ? num(nn.tempo) : '', 'Nomeação números erros': m6.ativo ? (nn.erros || 0) : '', 'Nomeação números pulou linha': m6.ativo ? simNao(!!nn.pulou) : '',
      'Módulo 7 aplicado': (a.m7 || {}).ativo ? 'Sim' : (a.m7 || {}).ativo === false ? 'Pulado' : '',
    };
    D.m7.grupos.forEach((g) => { o['Ditado ' + g.nome + ' (/' + g.itens.length + ')'] = (a.m7 || {}).ativo ? c.m7.grupos[g.id].ok : ''; });
    o['Ditado total (/28)'] = (a.m7 || {}).ativo ? c.m7.total : '';
    o['Ditado: tipos de erro (Zorzi)'] = (a.m7 || {}).ativo ? D.m7.zorzi.filter((z, i) => c.m7.zorzi[i]).join('; ') : '';
    c.crit.forEach((k) => { o['ALTERADO: ' + k.nome] = simNao(k.alt); });
    if (m6.ativo) { o['ALTERADO: Supressão/repetição'] = simNao(!!res.altFono); o['ALTERADO: Nomeação rápida'] = simNao(!!res.altRAN); }
    o['Critérios alterados'] = c.crit.filter((k) => k.alt).map((k) => k.nome).join('; ');
    o['Passo 0: cautela'] = c.arvore.cautela.join('; ');
    o['Perfil sugerido'] = c.arvore.perfil || '';
    o['Perfil confirmado'] = res.perfilConf || '';
    o['Hipótese e o que ensinar primeiro'] = res.hipotese || '';
    o['Monitoramento e meta (8–12 sem.)'] = res.monitoramento || '';
    o['Encaminhamento externo'] = (res.enc || []).map((e) => (e === 'outro' && res.encOutro ? 'outro: ' + res.encOutro : e)).join(', ');
    o['Obs. Texto A'] = ((a.m3 || {}).A || {}).obs || '';
    o['Obs. Texto B'] = ((a.m3 || {}).B || {}).obs || '';
    D.m0.segmentos.forEach((seg, i) => {
      seg.forEach((sg) => { const v = (m0.op || {})[sg.id]; o['M0: ' + sg.p] = Array.isArray(v) ? v.join(', ') : (v || ''); });
      o['M0 P' + (i + 1) + ' observação'] = ((m0.resp || [])[i]) || '';
    });
    return o;
  }

  function linhasItens(a) {
    const cab = a.cab || {};
    const rows = [];
    const add = (modulo, parte, n, grupo, item, resultado, pontos, obs) => rows.push({
      'Código da avaliação': codigo(a), 'Nº do aluno': cab.matricula || '',
      'Nome': cab.nome || '', 'Turma': cab.turma || '', 'Data': dataBR(cab.data), 'Módulo': modulo, 'Parte': parte, 'Nº': n, 'Grupo/tipo': grupo || '', 'Item': item,
      'Resultado': resultado == null ? '' : resultado, 'Pontos': pontos == null ? '' : pontos, 'Como leu / escreveu / anotação': obs || '',
    });
    const okTxt = (v) => (v === true ? 'Correto' : v === false ? 'Erro' : '');
    const okPts = (v) => (v === true ? 1 : v === false ? 0 : null);
    const m0 = a.m0 || {};
    D.m0.segmentos.forEach((seg, i) => {
      seg.forEach((sg) => { const v = (m0.op || {})[sg.id]; add('0', 'Conversa', i + 1, '', sg.p, Array.isArray(v) ? v.join(', ') : (v || ''), null, ''); });
      if ((m0.resp || [])[i]) add('0', 'Conversa', i + 1, '', 'Observação', '', null, m0.resp[i]);
    });
    add('0', 'Engajamento', '', '', 'Engajamento na sessão', m0.eng || '', null, '');
    add('0', 'Sensorial', '', '', 'Suspeita sensorial', m0.sens || '', null, m0.sensQual);
    const m1 = a.m1 || {};
    D.m1.palavras.itens.forEach((it, i) => { const r = (m1.pal || [])[i] || {}; add('1', 'Palavras', i + 1, it.g, it.t, okTxt(r.ok), okPts(r.ok), r.leu); });
    D.m1.pseudo.itens.forEach((it, i) => { const r = (m1.pse || [])[i] || {}; add('1', 'Pseudopalavras', i + 1, it.g, it.t, okTxt(r.ok), okPts(r.ok), r.leu); });
    const m2 = a.m2 || {};
    (m2.erros || []).forEach((i) => { if (m2.limite == null || i <= m2.limite) add('2', 'Fluência — erro', i + 1, 'palavra nº ' + (i + 1), PALAVRAS_FLU[i].w, 'Erro', 0, ''); });
    if (m2.limite != null) add('2', 'Fluência — última palavra lida', m2.limite + 1, '', PALAVRAS_FLU[m2.limite].w, m2.terminou ? 'Terminou o texto' : ']', null, '');
    D.m2.prosodia.dimensoes.forEach((d, i) => add('2', 'Prosódia', i + 1, '', d.nome, '', ((m2.pros || {})[d.id]) ?? null, ''));
    const tx = R.textos(cab.forma);
    ['A', 'B'].forEach((k) => {
      const T = D.m3.textos[k]; const t = ((a.m3 || {})[k]) || {};
      const modo = tx.lido === k ? 'LIDO' : tx.ouvido === k ? 'OUVIDO' : '';
      T.ideias.forEach((idea, i) => add('3', T.nome + ' (' + modo + ') — reconto', i + 1, '', idea, (t.ideias || [])[i] ? 'Recontou' : 'Não', (t.ideias || [])[i] ? 1 : 0, ''));
      T.perguntas.forEach((q, i) => add('3', T.nome + ' (' + modo + ') — perguntas', i + 1, q.tipo, q.p, '', ((t.perg || [])[i]) ?? null, ''));
      if (t.obs) add('3', T.nome + ' — observações', '', '', '', '', null, t.obs);
    });
    const m4 = a.m4 || {};
    D.m4.anafora.itens.forEach((it, i) => add('4', '4a Anáfora', i + 1, 'Texto ' + it.texto, it.antes + '[' + it.alvo + ']' + it.depois, okTxt((m4.an || [])[i]), okPts((m4.an || [])[i]), ''));
    D.m4.conectivos.itens.forEach((it, i) => add('4', '4b Conectivos', i + 1, it.rel, it.frase, okTxt((m4.con || [])[i]), okPts((m4.con || [])[i]), ''));
    const m5 = a.m5 || {};
    D.m5.oral.itens.forEach((it, i) => add('5', '5a Vocabulário oral', i + 1, '', it[0], '', ((m5.oral || [])[i]) ?? null, ''));
    D.m5.comando.itens.forEach((it, i) => add('5', '5b Vocabulário de comando', i + 1, '', it[0], '', ((m5.com || [])[i]) ?? null, ''));
    const m6 = a.m6 || {};
    if (m6.ativo) {
      D.m6.supressao.itens.forEach((it, i) => add('6', '6a Supressão', i + 1, it[1], it[0] + ' → ' + it[2], okTxt((m6.sup || [])[i]), okPts((m6.sup || [])[i]), ''));
      D.m6.repeticao.itens.forEach((it, i) => add('6', '6b Repetição', i + 1, '', it, okTxt((m6.rep || [])[i]), okPts((m6.rep || [])[i]), ''));
      [['nl', 'Letras'], ['nn', 'Números']].forEach(([ch, nome]) => { const v = m6[ch] || {}; add('6', '6c Nomeação', '', nome, 'tempo (s) / erros / pulou linha', (v.tempo ?? '') + ' s', v.erros || 0, v.pulou ? 'pulou linha (anula)' : ''); });
    }
    const m7 = a.m7 || {};
    if (m7.ativo) {
      let n = 0;
      D.m7.grupos.forEach((g) => g.itens.forEach((w, i) => { n++; const r = ((m7.itens || {})[g.id] || [])[i] || {}; add('7', 'Ditado', n, g.nome, w, okTxt(r.ok), okPts(r.ok), r.esc); }));
      D.m7.zorzi.forEach((z, i) => add('7', 'Zorzi', i + 1, '', z, (m7.zorzi || [])[i] ? 'Marcado' : '', null, ''));
    }
    return rows;
  }

  function larguras(rows) {
    if (!rows.length) return [];
    return Object.keys(rows[0]).map((k) => ({ wch: Math.min(45, Math.max(k.length, ...rows.map((r) => String(r[k] == null ? '' : r[k]).length)) + 2) }));
  }

  function exportar(lista) {
    lista = lista.filter(Boolean);
    if (!lista.length) { toast('Nenhuma avaliação para exportar.'); return; }
    if (!window.XLSX) { toast('Biblioteca do Excel não carregou. Abra o app com internet uma vez.'); return; }
    lista.sort((x, y) => String(x.cab.turma).localeCompare(String(y.cab.turma)) || String(x.cab.nome).localeCompare(String(y.cab.nome)));
    const res = lista.map(linhaResumo);
    const itens = [].concat(...lista.map(linhasItens));
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(res); ws1['!cols'] = larguras(res);
    const ws2 = XLSX.utils.json_to_sheet(itens); ws2['!cols'] = larguras(itens);
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumo');
    XLSX.utils.book_append_sheet(wb, ws2, 'Itens');
    const nomeArq = lista.length === 1
      ? 'Tier2_' + (lista[0].cab.nome || 'aluno').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/[^A-Za-z0-9]+/g, '_') + '_' + hoje() + '.xlsx'
      : 'Tier2_' + hoje() + '.xlsx';
    const bin = XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: true });
    baixar(nomeArq, bin, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    toast('Excel gerado: ' + nomeArq);
  }

  /* ================= BACKUP ================= */
  function baixar(nome, conteudo, tipo) {
    const blob = new Blob([conteudo], { type: tipo });
    const url = URL.createObjectURL(blob);
    const l = document.createElement('a'); l.href = url; l.download = nome; document.body.appendChild(l); l.click();
    setTimeout(() => { URL.revokeObjectURL(url); l.remove(); }, 1000);
  }
  function backup() {
    const dados = { app: 'tier2-digital', versao: 1, exportado: new Date().toISOString(), config: CFG, avaliacoes: Object.values(DB) };
    baixar('Tier2_backup_' + hoje() + '.json', JSON.stringify(dados), 'application/json');
    toast('Backup salvo (' + dados.avaliacoes.length + ' avaliações). Guarde o arquivo em local seguro.');
  }
  function restaurarArquivo(file) {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const j = JSON.parse(fr.result);
        const lista = Array.isArray(j) ? j : j.avaliacoes;
        if (!Array.isArray(lista)) throw new Error('formato');
        let novos = 0, atualizados = 0, mantidos = 0;
        lista.forEach((a) => {
          if (!a || !a.id || !a.cab) return;
          const atual = DB[a.id];
          if (!atual) { DB[a.id] = a; novos++; }
          else if ((a.atualizado || 0) > (atual.atualizado || 0)) { DB[a.id] = a; atualizados++; }
          else mantidos++;
        });
        gravar(K_DB, DB);
        S.tela = 'lista'; render();
        toast('Backup restaurado: ' + novos + ' avaliação(ões) adicionada(s), ' + atualizados + ' atualizada(s), ' + mantidos + ' sem mudança (você já tinha a versão igual ou mais nova).');
      } catch (e) { toast('Arquivo de backup inválido.'); }
    };
    fr.readAsText(file);
  }

  /* ================= INÍCIO ================= */
  function iniciar() {
    document.body.innerHTML =
      '<header class="top" id="top"></header><main id="main"></main><div class="acao" id="acao"></div>' +
      '<div class="aluno-view hidden" id="alunoView"></div><button class="aluno-sair hidden" id="alunoSair">✕ voltar ao avaliador</button>' +
      '<input type="file" id="arquivo" accept=".json,application/json" class="hidden">';
    $('#alunoSair').onclick = fecharAluno;
    $('#arquivo').onchange = (e) => { if (e.target.files[0]) restaurarArquivo(e.target.files[0]); e.target.value = ''; };
    render();
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(() => { /* ok */ });
    }
  }

  // exposto para testes automatizados
  window.TIER2 = { linhaResumo, linhasItens, calcular: (a) => R.calcular(a, CFG), DB: () => DB };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
