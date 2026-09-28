/* =====================================================================
   REGRAS — cálculos, critérios de corte e árvore de decisão.
   Tudo o que for "ponto de corte" está em CORTES, logo abaixo.
   A árvore segue o Manual do Avaliador (seção 6).
   ===================================================================== */
(function (root) {
  const D = root.DADOS || (typeof require !== 'undefined' ? require('./dados.js') : null);

  // Pontos de corte (critérios provisórios da folha/manual).
  // pisoPCPM vem das Configurações do app (padrão 100) e pode ser trocado pela referência local.
  const CORTES = {
    palavras: 90,        // precisão < 90% → alterado
    pseudo: 80,          // precisão < 80% → alterado
    pisoPCPM: 100,       // PCPM < piso → alterado (editável nas Configurações)
    prosodia: 8,         // total < 8 (de 16) → alterado
    leitora: 60,         // compreensão leitora < 60%
    oral: 60,            // compreensão oral < 60%
    diferenca: 20,       // oral − leitora ≥ 20 p.p. reforça Perfil A
    anafora: 60,         // < 60% (3 ou menos de 6)
    conectivos: 60,      // < 60% (4 ou menos de 8)
    vocabOral: 50,       // < 50%
    vocabComando: 60,    // < 60% → só alerta, não entra na árvore
    // "5b bem abaixo de 5a": 5b pelo menos 20 p.p. abaixo de 5a
    distancia5b: 20,
  };

  const N_TEXTO = 181; // palavras do texto de fluência

  const soma = (arr) => arr.reduce((a, b) => a + (b || 0), 0);
  const pct = (v, max) => (v == null ? null : Math.round((v / max) * 1000) / 10);
  const arr = (a, n) => { const r = (a || []).slice(0, n); while (r.length < n) r.push(null); return r; };
  const respondidos = (a) => a.filter((x) => x !== null && x !== undefined).length;

  function textos(forma) {
    // Forma 1 = lê A, ouve B · Forma 2 = lê B, ouve A
    if (forma === 1 || forma === '1') return { lido: 'A', ouvido: 'B' };
    if (forma === 2 || forma === '2') return { lido: 'B', ouvido: 'A' };
    return { lido: null, ouvido: null };
  }

  /* ---------- cálculos por módulo ---------- */
  function calcM1(m1) {
    m1 = m1 || {};
    const pal = D.m1.palavras.itens, pse = D.m1.pseudo.itens;
    const rp = arr(m1.pal, 40).map((x) => (x ? x.ok : null));
    const rs = arr(m1.pse, 30).map((x) => (x ? x.ok : null));
    const porGrupo = {};
    pal.forEach((it, i) => { porGrupo[it.g] = (porGrupo[it.g] || 0) + (rp[i] === true ? 1 : 0); });
    pse.forEach((it, i) => { porGrupo[it.g] = (porGrupo[it.g] || 0) + (rs[i] === true ? 1 : 0); });
    const palResp = respondidos(rp), pseResp = respondidos(rs);
    const palTotal = rp.filter((x) => x === true).length;
    const pseTotal = rs.filter((x) => x === true).length;
    return {
      grupos: porGrupo,
      palResp, pseResp,
      palTotal: palResp === 40 ? palTotal : null,
      pseTotal: pseResp === 30 ? pseTotal : null,
      palPct: palResp === 40 ? pct(palTotal, 40) : null,
      psePct: pseResp === 30 ? pct(pseTotal, 30) : null,
      palParcial: palTotal, pseParcial: pseTotal,
      palTempo: m1.palTempo ?? null,
      pseTempo: m1.pseTempo ?? null,
      esforco: !!m1.esforco,
      lex: m1.lex || 0,
    };
  }

  function calcM2(m2) {
    m2 = m2 || {};
    const erros = (m2.erros || []).slice().sort((a, b) => a - b);
    let lidas = null, nErros = null, pcpm = null, precisao = null, corretas = null;
    if (m2.terminou && m2.seg > 0) {
      lidas = (m2.limite != null ? m2.limite : N_TEXTO - 1) + 1;
      nErros = erros.filter((i) => i < lidas).length;
      corretas = lidas - nErros;
      pcpm = Math.round((corretas * 60 / m2.seg) * 10) / 10;
    } else if (m2.limite != null) {
      lidas = m2.limite + 1;
      nErros = erros.filter((i) => i < lidas).length;
      corretas = lidas - nErros;
      pcpm = corretas;
    }
    if (lidas) precisao = pct(corretas, lidas);
    const p = m2.pros || {};
    const dims = D.m2.prosodia.dimensoes.map((d) => p[d.id] ?? null);
    const prosodia = dims.every((v) => v != null) ? soma(dims) : null;
    return { lidas, erros: nErros, corretas, pcpm, precisao, terminou: !!m2.terminou, seg: m2.seg ?? null, prosodia, prosResp: respondidos(dims) };
  }

  function calcTexto(t) {
    t = t || {};
    const ideias = arr(t.ideias, 10).map((x) => !!x);
    const perg = arr(t.perg, 6);
    const reconto = ideias.filter(Boolean).length;
    const pergResp = respondidos(perg);
    const perguntas = pergResp === 6 ? soma(perg) : null;
    const total = perguntas != null ? reconto + perguntas : null;
    return { reconto, recontoFeito: !!t.recontoFeito, perguntas, pergResp, pergParcial: soma(perg), pct: total != null ? pct(total, 22) : null };
  }

  function calcM3(m3, forma) {
    m3 = m3 || {};
    const A = calcTexto(m3.A), B = calcTexto(m3.B);
    const tx = textos(forma);
    const leitora = tx.lido ? (tx.lido === 'A' ? A : B).pct : null;
    const oral = tx.ouvido ? (tx.ouvido === 'A' ? A : B).pct : null;
    const diferenca = leitora != null && oral != null ? Math.round((oral - leitora) * 10) / 10 : null;
    return { A, B, lido: tx.lido, ouvido: tx.ouvido, leitora, oral, diferenca };
  }

  function calcOkList(a, n) {
    const r = arr(a, n);
    const resp = respondidos(r);
    const tot = r.filter((x) => x === true).length;
    return { total: resp === n ? tot : null, parcial: tot, resp, n, pct: resp === n ? pct(tot, n) : null };
  }

  function calc012(a, n) {
    const r = arr(a, n);
    const resp = respondidos(r);
    const tot = soma(r);
    return { total: resp === n ? tot : null, parcial: tot, resp, n, max: n * 2, pct: resp === n ? pct(tot, n * 2) : null };
  }

  function calcM7(m7) {
    m7 = m7 || {};
    const out = { grupos: {}, resp: 0, n: 0, total: 0 };
    D.m7.grupos.forEach((g) => {
      const r = arr((m7.itens || {})[g.id], g.itens.length).map((x) => (x ? x.ok : null));
      const ok = r.filter((x) => x === true).length;
      out.grupos[g.id] = { ok, n: g.itens.length, resp: respondidos(r) };
      out.resp += respondidos(r); out.n += g.itens.length; out.total += ok;
    });
    out.zorzi = arr(m7.zorzi, 8).map((x) => !!x);
    return out;
  }

  /* ---------- cálculo geral ---------- */
  function calcular(av, cfg) {
    av = av || {};
    const cortes = Object.assign({}, CORTES, cfg && cfg.pisoPCPM ? { pisoPCPM: Number(cfg.pisoPCPM) } : {});
    const forma = av.cab && av.cab.forma;
    const m1 = calcM1(av.m1);
    const m2 = calcM2(av.m2);
    const m3 = calcM3(av.m3, forma);
    const an = calcOkList(av.m4 && av.m4.an, 6);
    const con = calcOkList(av.m4 && av.m4.con, 8);
    const vo = calc012(av.m5 && av.m5.oral, 12);
    const vc = calc012(av.m5 && av.m5.com, 10);
    const m6 = av.m6 || {};
    const sup = calcOkList(m6.sup, 12);
    const rep = calcOkList(m6.rep, 12);
    const m7 = calcM7(av.m7);

    const menor = (v, c) => (v == null ? null : v < c);
    const crit = [
      { id: 'palavras', nome: 'Palavras reais (precisão)', valor: m1.palPct, fmt: '%', regra: '< ' + cortes.palavras + '%', alt: menor(m1.palPct, cortes.palavras) },
      { id: 'pseudo', nome: 'Pseudopalavras (precisão)', valor: m1.psePct, fmt: '%', regra: '< ' + cortes.pseudo + '%', alt: menor(m1.psePct, cortes.pseudo) },
      { id: 'pcpm', nome: 'Fluência (PCPM)', valor: m2.pcpm, fmt: '', regra: '< ' + cortes.pisoPCPM + ' (piso provisório)', alt: menor(m2.pcpm, cortes.pisoPCPM) },
      { id: 'prosodia', nome: 'Prosódia (MFS)', valor: m2.prosodia, fmt: '/16', regra: '< ' + cortes.prosodia, alt: menor(m2.prosodia, cortes.prosodia) },
      { id: 'leitora', nome: 'Compreensão LEITORA', valor: m3.leitora, fmt: '%', regra: '< ' + cortes.leitora + '%', alt: menor(m3.leitora, cortes.leitora) },
      { id: 'oral', nome: 'Compreensão ORAL', valor: m3.oral, fmt: '%', regra: '< ' + cortes.oral + '%', alt: menor(m3.oral, cortes.oral) },
      { id: 'diferenca', nome: 'Diferença oral − leitora', valor: m3.diferenca, fmt: ' p.p.', regra: '≥ ' + cortes.diferenca + ' p.p. reforça Perfil A', alt: m3.diferenca == null ? null : m3.diferenca >= cortes.diferenca },
      { id: 'anafora', nome: 'Anáfora', valor: an.pct, fmt: '%', regra: '< 60% (3 ou menos de 6)', alt: menor(an.pct, cortes.anafora) },
      { id: 'conectivos', nome: 'Conectivos', valor: con.pct, fmt: '%', regra: '< 60% (4 ou menos de 8)', alt: menor(con.pct, cortes.conectivos) },
      { id: 'vocabOral', nome: 'Vocabulário oral', valor: vo.pct, fmt: '%', regra: '< ' + cortes.vocabOral + '%', alt: menor(vo.pct, cortes.vocabOral) },
      { id: 'vocabComando', nome: 'Vocabulário de comando (alerta, não altera perfil)', valor: vc.pct, fmt: '%', regra: '< ' + cortes.vocabComando + '%', alt: menor(vc.pct, cortes.vocabComando) },
    ];
    const C = {}; crit.forEach((c) => { C[c.id] = c; });

    // Alerta 5b bem abaixo de 5a
    const alerta5b = vo.pct != null && vc.pct != null && vc.pct < cortes.vocabComando && (vo.pct - vc.pct) >= cortes.distancia5b;

    const arvore = decidir(C, av);

    return { cortes, m1, m2, m3, an, con, vo, vc, sup, rep, m6, m7, crit, C, alerta5b, arvore };
  }

  /* ---------- ÁRVORE DE DECISÃO (Manual, seção 6) ---------- */
  // "algum": sim se qualquer um for alterado; não se todos forem não-alterados; null se faltar dado.
  function algum(lista) {
    if (lista.some((c) => c.alt === true)) return true;
    if (lista.every((c) => c.alt === false)) return false;
    return null;
  }
  function ambos(a, b) {
    if (a.alt === true && b.alt === true) return true;
    if (a.alt === false || b.alt === false) return false;
    return null;
  }
  const faltando = (lista) => lista.filter((c) => c.alt == null).map((c) => c.nome);

  function decidir(C, av) {
    const passos = [];
    const reforcos = [];
    const m0 = av.m0 || {};

    // PASSO 0 — condições básicas
    const cautela = [];
    if (m0.sens === 'sim') cautela.push('suspeita sensorial' + (m0.sensQual ? ' (' + m0.sensQual + ')' : ''));
    if (m0.eng && m0.eng !== 'colaborou bem') cautela.push('engajamento: ' + m0.eng);
    passos.push({
      passo: 'Passo 0 — Condições básicas',
      pergunta: 'Visão, audição, frequência e engajamento adequados?',
      resposta: cautela.length ? 'não' : (m0.eng ? 'sim' : '?'),
      detalhe: cautela.length ? 'Resolver ou encaminhar primeiro (exame de vista/audição, conversa, frequência). Interpretar os resultados com cautela: ' + cautela.join('; ') + '.' : '',
    });

    // PASSO 1 — reconhecimento de palavras
    const l1 = [C.palavras, C.pseudo, C.pcpm];
    const p1 = algum(l1);
    passos.push({
      passo: 'Passo 1 — Reconhecimento de palavras',
      pergunta: 'Palavras reais < 90% OU pseudopalavras < 80% OU PCPM abaixo do critério?',
      resposta: p1 == null ? '?' : p1 ? 'sim' : 'não',
      detalhe: p1 == null ? 'Falta: ' + faltando(l1).join(', ') : l1.filter((c) => c.alt).map((c) => c.nome).join(', '),
      nota: p1 ? 'Aplicar Módulos 6 e 7 (fonológico e ditado) para caracterizar a dificuldade.' : '',
    });

    // PASSO 2 — compreensão da linguagem
    const anCon = ambos(C.anafora, C.conectivos);
    const l2 = [C.oral, C.vocabOral, { nome: 'Anáfora E conectivos', alt: anCon }];
    const p2 = algum(l2);
    passos.push({
      passo: 'Passo 2 — Compreensão da linguagem',
      pergunta: 'Compreensão ORAL < 60% OU vocabulário < 50% OU (anáfora E conectivos alterados)?',
      resposta: p2 == null ? '?' : p2 ? 'sim' : 'não',
      detalhe: p2 == null ? 'Falta: ' + faltando(l2).join(', ') : l2.filter((c) => c.alt).map((c) => c.nome).join(', '),
    });

    let perfil = null;
    if (p1 === true && p2 === false) perfil = 'A';
    else if (p1 === true && p2 === true) perfil = 'C';
    else if (p1 === false && p2 === true) perfil = 'B';
    else if (p1 === false && p2 === false) {
      // PASSO 3 — compreensão leitora
      const p3 = C.leitora.alt;
      passos.push({
        passo: 'Passo 3 — Compreensão leitora',
        pergunta: 'Compreensão LEITORA < 60%?',
        resposta: p3 == null ? '?' : p3 ? 'sim' : 'não',
        detalhe: p3 == null ? 'Falta: Compreensão LEITORA' : '',
      });
      if (p3 === true) perfil = 'D';
      else if (p3 === false) perfil = 'E';
    }

    // Reforços e alertas (não mudam o perfil)
    if (C.diferenca.alt === true) reforcos.push('Diferença oral − leitora ≥ 20 p.p.: sinal de que a leitura das palavras limita a compreensão (reforça Perfil A).');
    if (C.prosodia.alt === true) reforcos.push('Prosódia abaixo de 8: sugere leitura pouco automatizada.');
    if (C.anafora.alt === true && C.conectivos.alt === true && C.oral.alt === false && C.vocabOral.alt === false)
      reforcos.push('Anáfora e conectivos alterados com compreensão oral e vocabulário preservados: subtipo específico (monitorar as ligações entre frases). Foco: leitura compartilhada com paradas para “a quem isso se refere?” e “por que essa palavra liga essas duas ideias?”.');
    else if (C.anafora.alt === true || C.conectivos.alt === true)
      reforcos.push((C.anafora.alt ? 'Anáfora' : 'Conectivos') + ' alterado(s).');
    if (C.vocabComando.alt === true) reforcos.push('Vocabulário de comando < 60%: alerta de formato de prova (não altera o perfil).');

    return { perfil, passos, reforcos, cautela, passo1: p1 };
  }

  /* ---------- status dos módulos ---------- */
  function statusModulos(av) {
    av = av || {};
    const st = (resp, n) => (resp === 0 ? 'nao' : resp >= n ? 'ok' : 'andamento');
    const cab = av.cab || {};
    const cabResp = ['nome', 'turma', 'forma'].filter((k) => cab[k]).length;
    const m0 = av.m0 || {};
    const m0Resp = (m0.eng ? 1 : 0) + (m0.sens ? 1 : 0);
    const m1 = av.m1 || {};
    const m1Resp = respondidos(arr(m1.pal, 40).map((x) => (x ? x.ok : null))) + respondidos(arr(m1.pse, 30).map((x) => (x ? x.ok : null)));
    const m2c = calcM2(av.m2);
    const m2Resp = (m2c.lidas ? 1 : 0) + m2c.prosResp;
    const m3 = av.m3 || {};
    const m3Resp = ['A', 'B'].reduce((s, k) => s + respondidos(arr((m3[k] || {}).perg, 6)) + ((m3[k] || {}).recontoFeito ? 1 : 0), 0);
    const m4 = av.m4 || {};
    const m4Resp = respondidos(arr(m4.an, 6)) + respondidos(arr(m4.con, 8));
    const m5 = av.m5 || {};
    const m5Resp = respondidos(arr(m5.oral, 12)) + respondidos(arr(m5.com, 10));
    const m6 = av.m6 || {};
    const m6Resp = respondidos(arr(m6.sup, 12)) + respondidos(arr(m6.rep, 12)) + ((m6.nl || {}).tempo ? 1 : 0) + ((m6.nn || {}).tempo ? 1 : 0);
    const m7c = calcM7(av.m7);
    const res = av.res || {};
    return {
      cab: st(cabResp, 3),
      m0: st(m0Resp, 2),
      m1: st(m1Resp, 70),
      m2: st(m2Resp, 5),
      m3: st(m3Resp, 14),
      m4: st(m4Resp, 14),
      m5: st(m5Resp, 22),
      m6: (av.m6 || {}).ativo === false ? 'pulado' : (av.m6 || {}).ativo ? st(m6Resp, 26) : 'nao',
      m7: (av.m7 || {}).ativo === false ? 'pulado' : (av.m7 || {}).ativo ? st(m7c.resp, 28) : 'nao',
      res: res.perfilConf ? 'ok' : 'nao',
    };
  }

  const R = { CORTES, N_TEXTO, calcular, textos, statusModulos, calcM1, calcM2, calcM3, pct };
  root.REGRAS = R;
  if (typeof module !== 'undefined') module.exports = R;
})(typeof window !== 'undefined' ? window : globalThis);
