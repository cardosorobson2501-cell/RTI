/* Teste de segurança dos dados (simula falhas num celular).
   Rodar na raiz do projeto:  node teste/seguranca_dados.js
   Precisa do Playwright instalado (npm i -g playwright) e do Chromium. */
const path = require('path');
const http = require('http');
const fs = require('fs');
const assert = require('assert');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright'); }

const RAIZ = path.join(__dirname, '..');
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
function servidor() {
  return new Promise((ok) => {
    const srv = http.createServer((req, res) => {
      const f = path.join(RAIZ, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
      fs.readFile(f, (err, d) => {
        if (err) { res.writeHead(404); res.end('nao encontrado'); return; }
        res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(d);
      });
    }).listen(0, () => ok(srv));
  });
}

(async () => {
  const srv = await servidor();
  const BASE = 'http://localhost:' + srv.address().port;
  const APP = BASE + '/app/';
  const b = await pw.chromium.launch();
  const erros = [];
  let n = 0;
  const ok = (msg) => console.log('  ✔ ' + (++n) + '. ' + msg);

  const novoCel = async () => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erros.push(String(e)));
    p.on('dialog', (d) => d.accept());
    await p.goto(APP);
    await p.waitForSelector('[data-a="nova"]');
    return { ctx, p };
  };
  const abrir = async (p) => { await p.goto(APP); await p.waitForFunction(() => window.TIER2 && document.querySelector('#top .top-row')); };
  const criar = async (p, nome) => {
    await p.click('[data-a="nova"]');
    await p.fill('[data-f="cab.nome"]', nome);
    await p.fill('input[data-f="cab.turma"]', 'FORNAX');
    await p.fill('[data-f="cab.avaliador"]', 'Prof. Teste');
    await p.click('[data-a="proxCab0"]');
    await p.click('[data-a="menu"]'); await p.click('[data-a="lista"]');
    await p.waitForTimeout(150);
  };
  const nomes = (p) => p.evaluate(() => Object.values(TIER2.DB()).filter((a) => !a.apagadoEm).map((a) => a.cab.nome).sort());
  const idDe = (p, nome) => p.evaluate((nm) => Object.values(TIER2.DB()).find((a) => a.cab.nome === nm).id, nome);
  const irLista = async (p) => { for (let i = 0; i < 6 && !(await p.$('[data-a="config"]')); i++) await p.click('[data-a="voltar"]'); };
  const semModal = (p) => p.evaluate(() => { const m = document.getElementById('modal'); if (m) m.remove(); });

  console.log('\n=== TESTE DE SEGURANÇA DOS DADOS ===\n');

  // 1) gravação dupla + reabrir
  let { ctx, p } = await novoCel();
  await criar(p, 'Ana Souza'); await criar(p, 'Bruno Lima');
  await abrir(p);
  assert.deepStrictEqual(await nomes(p), ['Ana Souza', 'Bruno Lima']);
  const dupla = await p.evaluate(async () => {
    const ls = Object.keys(localStorage).filter((k) => k.startsWith('tier2.v2.av.')).length;
    const idb = await new Promise((r) => { const q = indexedDB.open('tier2'); q.onsuccess = () => { const t = q.result.transaction('avaliacoes').objectStore('avaliacoes').count(); t.onsuccess = () => r(t.result); }; });
    return { ls, idb };
  });
  assert.deepStrictEqual(dupla, { ls: 2, idb: 2 });
  ok('Cada avaliação gravada em dois lugares (banco principal + espelho) e presente ao reabrir');

  // 2) espelho corrompido → recupera do banco principal, sem sobrescrever o dano
  const idAna = await idDe(p, 'Ana Souza');
  await p.evaluate((id) => localStorage.setItem('tier2.v2.av.' + id, '{quebrado'), idAna);
  await abrir(p); await semModal(p);
  assert.deepStrictEqual(await nomes(p), ['Ana Souza', 'Bruno Lima']);
  const quar = await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('tier2.quarentena.')).length);
  assert.ok(quar >= 1);
  const reparado = await p.evaluate((id) => { try { return JSON.parse(localStorage.getItem('tier2.v2.av.' + id)).cab.nome; } catch (e) { return null; } }, idAna);
  assert.strictEqual(reparado, 'Ana Souza');
  ok('Registro corrompido: dados vêm do banco principal, o dano vai para a quarentena e o espelho é reparado');

  // 3) banco principal apagado → volta do espelho
  await p.goto(BASE + '/app/manifest.json');
  await p.evaluate(() => new Promise((r) => { const q = indexedDB.deleteDatabase('tier2'); q.onsuccess = q.onerror = q.onblocked = () => r(); }));
  await abrir(p); await semModal(p);
  assert.deepStrictEqual(await nomes(p), ['Ana Souza', 'Bruno Lima']);
  const idbDeNovo = await p.evaluate(() => new Promise((r) => { const q = indexedDB.open('tier2'); q.onsuccess = () => { const t = q.result.transaction('avaliacoes').objectStore('avaliacoes').count(); t.onsuccess = () => r(t.result); }; }));
  assert.strictEqual(idbDeNovo, 2);
  ok('Banco principal apagado: dados voltam do espelho e o banco é reconstruído');

  // 4) duas janelas do app editando ao mesmo tempo
  const p2 = await ctx.newPage(); p2.on('dialog', (d) => d.accept()); p2.on('pageerror', (e) => erros.push(String(e)));
  await abrir(p2); await semModal(p2);
  await criar(p, 'Carla Dias');                  // janela 1 cria
  await p2.evaluate((id) => { const a = TIER2.DB()[id]; a.cab.turma = 'SCORPIUS'; TIER2.salvar(a); }, idAna); // janela 2 edita outra
  await p.waitForTimeout(300);
  await abrir(p); await semModal(p);
  assert.deepStrictEqual(await nomes(p), ['Ana Souza', 'Bruno Lima', 'Carla Dias']);
  assert.strictEqual(await p.evaluate((id) => TIER2.DB()[id].cab.turma, idAna), 'SCORPIUS');
  ok('Duas janelas abertas: nenhuma apaga o trabalho da outra');
  await p2.close();

  // 5) fechar no meio (reinício do celular)
  await p.evaluate((id) => { const a = TIER2.DB()[id]; a.m1.lex = 7; TIER2.salvar(a); }, idAna);
  await p.goto('about:blank');
  await abrir(p); await semModal(p);
  assert.strictEqual(await p.evaluate((id) => TIER2.DB()[id].m1.lex, idAna), 7);
  ok('Fechar/reiniciar no meio da avaliação: nada se perde');

  // 6) espaço cheio no espelho → salva no banco principal e mostra aviso fixo
  await p.evaluate(() => { window.__setOrig = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new DOMException('cheio', 'QuotaExceededError'); }; });
  await p.evaluate((id) => { const a = TIER2.DB()[id]; a.m1.lex = 9; TIER2.salvar(a); }, idAna);
  await p.waitForTimeout(300);
  assert.ok(await p.isVisible('text=Espaço do espelho cheio'));
  await p.evaluate(() => { Storage.prototype.setItem = window.__setOrig; });
  await abrir(p); await semModal(p);
  assert.strictEqual(await p.evaluate((id) => TIER2.DB()[id].m1.lex, idAna), 9);
  ok('Espaço cheio: a gravação cai no banco principal e um aviso fixo aparece');

  // 7) lixeira: apagar, recuperar, e remoção após 30 dias
  await p.click('[data-a="abrir"][data-v="' + idAna + '"]');
  await p.click('[data-a="apagar"]');
  assert.ok(!(await nomes(p)).includes('Ana Souza'));
  await p.click('[data-a="config"]'); await p.waitForSelector('[data-a="recuperar"]');
  await p.click('[data-a="recuperar"][data-v="' + idAna + '"]');
  assert.ok((await nomes(p)).includes('Ana Souza'));
  const idBruno = await idDe(p, 'Bruno Lima');
  await p.evaluate((id) => { const a = TIER2.DB()[id]; a.apagadoEm = Date.now() - 31 * 864e5; TIER2.salvar(a); }, idBruno);
  await abrir(p); await semModal(p);
  assert.strictEqual(await p.evaluate((id) => !!TIER2.DB()[id], idBruno), false);
  assert.strictEqual(await p.evaluate((id) => localStorage.getItem('tier2.v2.av.' + id), idBruno), null);
  ok('Lixeira: apagar → recuperar funciona; após 30 dias o item é removido de vez');

  // 8) cópias automáticas (instantâneos) e restauração
  await p.click('[data-a="abrir"][data-v="' + idAna + '"]');
  await p.evaluate((id) => { const a = TIER2.DB()[id]; a.m1.lex = 11; TIER2.salvar(a); }, idAna);
  await p.click('[data-a="abrirMod"][data-v="m0"]'); await p.waitForTimeout(300);
  const nInst = await p.evaluate(() => ARMAZ.listarInstantaneos().then((l) => l.length));
  assert.ok(nInst >= 1);
  const idCarla = await idDe(p, 'Carla Dias');
  await p.evaluate(async (id) => { await ARMAZ.removerDefinitivo(id); }, idCarla);
  await abrir(p); await semModal(p); await irLista(p);
  assert.ok(!(await nomes(p)).includes('Carla Dias'));
  await p.click('[data-a="config"]'); await p.waitForSelector('[data-a="restaurarInst"]');
  await p.click('[data-a="restaurarInst"]'); await p.waitForTimeout(300);
  assert.ok((await nomes(p)).includes('Carla Dias'));
  ok('Cópias automáticas internas são criadas e restauram uma avaliação perdida');

  // 9) cópia de segurança automática ao abrir (mais de 24 h sem cópia)
  await p.evaluate(() => { localStorage.setItem('tier2.ultimoBackup', String(Date.now() - 25 * 36e5)); localStorage.removeItem('tier2.ultimaTentativaAuto'); });
  await p.evaluate((id) => { const a = TIER2.DB()[id]; a.m1.lex = 12; TIER2.salvar(a); }, idAna);
  const espera = p.waitForEvent('download', { timeout: 5000 });
  await abrir(p);
  const dl = await espera;
  assert.ok(/Tier2_backup_.*\.json/.test(dl.suggestedFilename()));
  await p.waitForSelector('#modal');
  await p.click('[data-a="copiaConfirmar"]');
  const ult = await p.evaluate(() => Number(localStorage.getItem('tier2.ultimoBackup')));
  assert.ok(Date.now() - ult < 60000);
  assert.ok(!(await p.isVisible('text=sem cópia de segurança')));
  await abrir(p);
  assert.ok(!(await p.$('#modal')));
  ok('Após 24 h sem cópia, ao abrir o app a cópia é baixada sozinha e o lembrete aparece (uma vez por dia)');

  // 10) migração do formato antigo (v1)
  const antigos = await p.evaluate(() => { const o = {}; Object.values(TIER2.DB()).forEach((a) => { o[a.id] = a; }); return o; });
  await ctx.close();
  ({ ctx, p } = await novoCel());
  await p.evaluate((o) => { localStorage.clear(); localStorage.setItem('tier2.v1.avaliacoes', JSON.stringify(o)); }, antigos);
  await p.goto(BASE + '/app/manifest.json');
  await p.evaluate(() => new Promise((r) => { const q = indexedDB.deleteDatabase('tier2'); q.onsuccess = q.onerror = q.onblocked = () => r(); }));
  await abrir(p); await semModal(p);
  assert.deepStrictEqual(await nomes(p), Object.values(antigos).filter((a) => !a.apagadoEm).map((a) => a.cab.nome).sort());
  assert.ok(await p.evaluate(() => !!localStorage.getItem('tier2.v1.avaliacoes')));
  ok('Migração do formato antigo: todas as avaliações presentes e a cópia antiga preservada');

  // 11) sem internet
  await criar(p, 'Davi Rocha');
  await ctx.setOffline(true);
  await p.evaluate(() => { const a = Object.values(TIER2.DB()).find((x) => x.cab.nome === 'Davi Rocha'); a.cab.idade = 15; TIER2.salvar(a); });
  await ctx.setOffline(false);
  // garante que o app ficou guardado no aparelho (service worker) e reabre SEM internet
  await p.evaluate(() => navigator.serviceWorker.ready);
  await abrir(p); await semModal(p);
  await ctx.setOffline(true);
  await abrir(p); await semModal(p);
  assert.strictEqual(await p.evaluate(() => Object.values(TIER2.DB()).find((x) => x.cab.nome === 'Davi Rocha').cab.idade), 15);
  await ctx.setOffline(false);
  ok('Sem internet: o app abre e grava normalmente');

  await b.close(); srv.close();
  assert.deepStrictEqual(erros, [], 'Erros de JavaScript: ' + erros.join(' | '));
  console.log('\nTODOS OS TESTES DE SEGURANÇA PASSARAM ✔ (' + n + ' situações)\n');
})().catch((e) => { console.error('\n✘ FALHOU:', e.message); process.exit(1); });
