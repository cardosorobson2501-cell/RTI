/* =====================================================================
   ARMAZENAMENTO REDUNDANTE — Tier 2 Digital

   Cada avaliação é gravada em DOIS lugares do aparelho:
     1. IndexedDB (banco do navegador, principal)
     2. localStorage (espelho, uma chave por avaliação)
   Ao abrir, os dois são lidos e juntados (vale a versão mais recente de
   cada avaliação). Um registro ilegível nunca é sobrescrito: vai para a
   quarentena. Também guarda "instantâneos" (cópias completas automáticas)
   e trata a lixeira.
   ===================================================================== */
(function (root) {
  'use strict';

  const NOME_DB = 'tier2';
  const VERSAO_DB = 1;
  const PREF_AV = 'tier2.v2.av.';          // espelho: uma chave por avaliação
  const K_LEGADO = 'tier2.v1.avaliacoes';  // formato antigo (um bloco só) — nunca é apagado
  const K_MIGRADO = 'tier2.v1.migrado';
  const PREF_QUAR = 'tier2.quarentena.';
  const K_ULT_BACKUP = 'tier2.ultimoBackup';
  const K_ULT_AUTO = 'tier2.ultimaTentativaAuto';
  const K_INST_LS = 'tier2.instantaneo.ls'; // último instantâneo, caso o IndexedDB não exista
  const MAX_INST = 10;
  const DIAS_LIXEIRA = 30;

  const estado = {
    idbOk: false,       // IndexedDB disponível e funcionando
    lsOk: true,         // localStorage gravando
    falhas: [],         // mensagens de falha de gravação (para o aviso fixo)
    quarentena: 0,      // registros ilegíveis guardados à parte
    reparados: 0,       // registros recuperados de um dos lados
    migrados: 0,        // vindos do formato antigo
  };

  let db = null; // conexão IndexedDB

  /* ---------------- IndexedDB (promessas) ---------------- */
  function abrirIDB() {
    return new Promise((ok) => {
      try {
        if (!root.indexedDB) return ok(null);
        const req = root.indexedDB.open(NOME_DB, VERSAO_DB);
        req.onupgradeneeded = () => {
          const d = req.result;
          if (!d.objectStoreNames.contains('avaliacoes')) d.createObjectStore('avaliacoes', { keyPath: 'id' });
          if (!d.objectStoreNames.contains('instantaneos')) d.createObjectStore('instantaneos', { keyPath: 't' });
          if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'k' });
        };
        req.onsuccess = () => ok(req.result);
        req.onerror = () => ok(null);
        req.onblocked = () => ok(null);
        setTimeout(() => ok(null), 4000); // navegador travado: segue só com o espelho
      } catch (e) { ok(null); }
    });
  }
  function tx(store, modo, fn) {
    return new Promise((ok, falha) => {
      if (!db) return falha(new Error('sem IndexedDB'));
      try {
        const t = db.transaction(store, modo);
        const s = t.objectStore(store);
        let res;
        const r = fn(s);
        if (r) r.onsuccess = () => { res = r.result; };
        t.oncomplete = () => ok(res);
        t.onerror = () => falha(t.error || new Error('erro IndexedDB'));
        t.onabort = () => falha(t.error || new Error('IndexedDB abortado'));
      } catch (e) { falha(e); }
    });
  }
  const idbTodos = (store) => tx(store, 'readonly', (s) => s.getAll()).catch(() => null);
  const idbPut = (store, v) => tx(store, 'readwrite', (s) => s.put(v));
  const idbDel = (store, k) => tx(store, 'readwrite', (s) => s.delete(k));

  /* ---------------- localStorage seguro ---------------- */
  function lsGet(k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { root.localStorage.setItem(k, v); return root.localStorage.getItem(k) === v; } catch (e) { return false; } }
  function lsDel(k) { try { root.localStorage.removeItem(k); } catch (e) { /* ok */ } }
  function lsChaves(prefixo) {
    const out = [];
    try { for (let i = 0; i < root.localStorage.length; i++) { const k = root.localStorage.key(i); if (k && k.indexOf(prefixo) === 0) out.push(k); } } catch (e) { /* ok */ }
    return out;
  }
  function quarentenar(chave, bruto) {
    const k = PREF_QUAR + chave;
    if (lsGet(k) !== bruto) lsSet(k, bruto);
    estado.quarentena++;
  }
  const valida = (a) => a && typeof a === 'object' && typeof a.id === 'string' && a.cab && typeof a.cab === 'object';
  const maisNova = (x, y) => (!y ? x : !x ? y : ((x.atualizado || 0) >= (y.atualizado || 0) ? x : y));

  /* ---------------- CARGA SEGURA ---------------- */
  async function iniciar() {
    db = await abrirIDB();
    estado.idbOk = !!db;

    // 1) IndexedDB
    const deIDB = {};
    const lista = db ? await idbTodos('avaliacoes') : null;
    if (db && lista === null) estado.idbOk = false;
    (lista || []).forEach((a) => { if (valida(a)) deIDB[a.id] = a; });

    // 2) espelho localStorage (uma chave por avaliação)
    const deLS = {};
    lsChaves(PREF_AV).forEach((k) => {
      const bruto = lsGet(k);
      try { const a = JSON.parse(bruto); if (valida(a)) deLS[a.id] = a; else throw new Error('inválido'); }
      catch (e) { quarentenar(k, bruto); }
    });

    // 3) formato antigo (v1) — lido só até a migração ser concluída; a chave nunca é apagada
    const deV1 = {};
    if (!lsGet(K_MIGRADO)) {
      const bruto = lsGet(K_LEGADO);
      if (bruto) {
        try { const o = JSON.parse(bruto); Object.values(o || {}).forEach((a) => { if (valida(a)) deV1[a.id] = a; }); }
        catch (e) { quarentenar(K_LEGADO, bruto); }
      }
    }

    // 4) junta: vale a versão mais recente de cada avaliação
    const DB = {};
    const ids = new Set([...Object.keys(deIDB), ...Object.keys(deLS), ...Object.keys(deV1)]);
    ids.forEach((id) => { DB[id] = maisNova(maisNova(deIDB[id], deLS[id]), deV1[id]); });

    // 5) repara o lado que estiver faltando ou desatualizado
    for (const id of ids) {
      const a = DB[id];
      const s = JSON.stringify(a);
      const veioSoDoV1 = deV1[id] && !deIDB[id] && !deLS[id];
      if (veioSoDoV1) estado.migrados++;
      else if (!deLS[id] || (db && !deIDB[id])) estado.reparados++; // um dos lados tinha perdido
      if (!deLS[id] || JSON.stringify(deLS[id]) !== s) lsSet(PREF_AV + id, s);
      if (db && (!deIDB[id] || JSON.stringify(deIDB[id]) !== s)) { try { await idbPut('avaliacoes', a); } catch (e) { estado.idbOk = false; } }
    }
    if (Object.keys(deV1).length && confere(DB, Object.keys(deV1))) lsSet(K_MIGRADO, String(Date.now()));

    // 6) lixeira: remove de vez o que passou de 30 dias
    const limite = Date.now() - DIAS_LIXEIRA * 864e5;
    for (const id of Object.keys(DB)) {
      if (DB[id].apagadoEm && DB[id].apagadoEm < limite) { await removerDefinitivo(id); delete DB[id]; }
    }
    return DB;
  }
  // confere se todas as avaliações migradas estão gravadas em pelo menos um lugar
  function confere(DB, ids) { return ids.every((id) => DB[id] && lsGet(PREF_AV + id) !== null); }

  /* ---------------- GRAVAÇÃO (dupla + conferência) ---------------- */
  function gravarAv(a) {
    const s = JSON.stringify(a);
    const okLS = lsSet(PREF_AV + a.id, s);
    estado.lsOk = okLS;
    let prom = Promise.resolve(true);
    if (db) {
      prom = idbPut('avaliacoes', JSON.parse(s)).then(() => true).catch(() => false);
    }
    return prom.then((okIDB) => {
      if (db) estado.idbOk = okIDB;
      const algum = okLS || (db && okIDB);
      if (!algum) registrarFalha('Não foi possível salvar a avaliação neste aparelho. Salve uma cópia de segurança agora.');
      else if (!okLS && db) registrarFalha('Espaço do espelho cheio: a avaliação foi salva só no banco principal. Salve uma cópia de segurança e libere espaço.');
      return { okLS, okIDB: db ? okIDB : null };
    });
  }
  function registrarFalha(msg) {
    if (estado.falhas[estado.falhas.length - 1] !== msg) estado.falhas.push(msg);
    if (typeof root.ARMAZ.aoFalhar === 'function') root.ARMAZ.aoFalhar(msg);
  }
  async function removerDefinitivo(id) {
    lsDel(PREF_AV + id);
    if (db) { try { await idbDel('avaliacoes', id); } catch (e) { /* ok */ } }
  }

  /* ---------------- INSTANTÂNEOS (cópias completas automáticas) ---------------- */
  async function instantaneo(DB, motivo) {
    const avs = Object.values(DB);
    if (!avs.length) return false;
    const reg = { t: Date.now(), motivo: motivo || '', n: avs.filter((a) => !a.apagadoEm).length, dados: JSON.stringify(avs) };
    let ok = false;
    if (db) {
      try {
        await idbPut('instantaneos', reg);
        const todos = (await idbTodos('instantaneos')) || [];
        todos.sort((x, y) => y.t - x.t).slice(MAX_INST).forEach((x) => { idbDel('instantaneos', x.t).catch(() => {}); });
        ok = true;
      } catch (e) { /* segue para o espelho */ }
    }
    if (!ok) ok = lsSet(K_INST_LS, JSON.stringify(reg));
    return ok;
  }
  async function listarInstantaneos() {
    let lista = db ? ((await idbTodos('instantaneos')) || []) : [];
    const ls = lsGet(K_INST_LS);
    if (ls) { try { const r = JSON.parse(ls); if (!lista.some((x) => x.t === r.t)) lista.push(r); } catch (e) { /* ok */ } }
    return lista.sort((x, y) => y.t - x.t).map((x) => ({ t: x.t, n: x.n, motivo: x.motivo, dados: x.dados }));
  }

  /* ---------------- CÓPIA DE ARQUIVO (backup) ---------------- */
  function ultimoBackup() { return Number(lsGet(K_ULT_BACKUP)) || 0; }
  function marcarBackup() {
    const t = Date.now();
    lsSet(K_ULT_BACKUP, String(t));
    if (db) idbPut('meta', { k: 'ultimoBackup', v: t }).catch(() => {});
    return t;
  }
  function ultimaTentativaAuto() { return Number(lsGet(K_ULT_AUTO)) || 0; }
  function marcarTentativaAuto() { lsSet(K_ULT_AUTO, String(Date.now())); }
  // recupera a data do último backup do IndexedDB se o localStorage tiver sido limpo
  async function recuperarMeta() {
    if (ultimoBackup() || !db) return;
    const m = (await idbTodos('meta')) || [];
    const u = m.find((x) => x.k === 'ultimoBackup');
    if (u && u.v) lsSet(K_ULT_BACKUP, String(u.v));
  }

  /* ---------------- ESTADO DO ARMAZENAMENTO ---------------- */
  async function situacao() {
    const out = { idbOk: estado.idbOk, lsOk: estado.lsOk, quarentena: lsChaves(PREF_QUAR).length, persistido: null, uso: null, cota: null };
    try { if (navigator.storage && navigator.storage.persisted) out.persistido = await navigator.storage.persisted(); } catch (e) { /* ok */ }
    try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); out.uso = e.usage; out.cota = e.quota; } } catch (e) { /* ok */ }
    return out;
  }
  async function pedirPersistencia() {
    try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch (e) { /* ok */ }
    return false;
  }

  root.ARMAZ = {
    PREF_AV, DIAS_LIXEIRA, estado,
    iniciar, gravarAv, removerDefinitivo, instantaneo, listarInstantaneos,
    ultimoBackup, marcarBackup, ultimaTentativaAuto, marcarTentativaAuto, recuperarMeta,
    situacao, pedirPersistencia, aoFalhar: null,
  };
})(typeof window !== 'undefined' ? window : globalThis);
