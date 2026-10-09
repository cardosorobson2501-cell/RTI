/* Teste dos cálculos com alunos fictícios.
   Rodar: node teste/aluno_ficticio.js */
const assert = require('assert');
const D = require('../app/dados.js');
globalThis.DADOS = D;
const R = require('../app/regras.js');

const ok = (n, total) => Array.from({ length: total }, (_, i) => i < n);
const itens = (grupos) => [].concat(...grupos.map(([acertos, n]) => ok(acertos, n).map((v) => ({ ok: v, leu: v ? '' : 'xxx' }))));

// Aluno fictício "João Teste" — Forma 1 (lê A, ouve B)
const aluno = {
  cab: { nome: 'João Teste', turma: 'FORNAX', forma: 1 },
  m0: { eng: 'colaborou bem', sens: 'não' },
  m1: {
    pal: itens([[10, 10], [9, 10], [7, 10], [8, 10]]), // A1..A4
    pse: itens([[9, 10], [7, 10], [4, 10]]), // P1..P3
    palTempo: 48, pseTempo: 71, esforco: true, lex: 3,
  },
  m2: { erros: [3, 17, 40, 55, 70, 90, 120], limite: 91, pros: { expressao: 2, fraseamento: 2, fluidez: 2, ritmo: 1 } },
  m3: {
    A: { ideias: ok(4, 10), perg: [1, 1, 1, 0, 1, 1], recontoFeito: true }, // LIDO
    B: { ideias: ok(7, 10), perg: [2, 2, 2, 1, 2, 1], recontoFeito: true }, // OUVIDO
  },
  m4: { an: [true, true, false, true, true, false], con: [true, true, true, false, true, true, true, false] },
  m5: { oral: [2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0], com: [2, 2, 2, 2, 1, 1, 0, 0, 0, 0] },
};

const c = R.calcular(aluno, { pisoPCPM: 100 });
const linha = (rot, v) => console.log(rot.padEnd(38, '.'), v);

console.log('\n=== ALUNO FICTÍCIO: ' + aluno.cab.nome + ' (Forma 1: lê A, ouve B) ===\n');
linha('Palavras A1/A2/A3/A4', [c.m1.grupos.A1, c.m1.grupos.A2, c.m1.grupos.A3, c.m1.grupos.A4].join(' / '));
linha('Palavras total / precisão', c.m1.palTotal + '/40 · ' + c.m1.palPct + '%');
linha('Pseudo P1/P2/P3', [c.m1.grupos.P1, c.m1.grupos.P2, c.m1.grupos.P3].join(' / '));
linha('Pseudo total / precisão', c.m1.pseTotal + '/30 · ' + c.m1.psePct + '%');
linha('Fluência: lidas / erros', c.m2.lidas + ' / ' + c.m2.erros);
linha('PCPM / precisão', c.m2.pcpm + ' · ' + c.m2.precisao + '%');
linha('Prosódia', c.m2.prosodia + '/16');
linha('Texto A (LIDO) reconto/perg/%', c.m3.A.reconto + ' / ' + c.m3.A.perguntas + ' / ' + c.m3.A.pct + '%');
linha('Texto B (OUVIDO) reconto/perg/%', c.m3.B.reconto + ' / ' + c.m3.B.perguntas + ' / ' + c.m3.B.pct + '%');
linha('Compreensão leitora / oral', c.m3.leitora + '% / ' + c.m3.oral + '%');
linha('Diferença oral − leitora', c.m3.diferenca + ' p.p.');
linha('Anáfora / Conectivos', c.an.total + '/6 (' + c.an.pct + '%) · ' + c.con.total + '/8 (' + c.con.pct + '%)');
linha('Vocab. oral / comando', c.vo.total + '/24 (' + c.vo.pct + '%) · ' + c.vc.total + '/20 (' + c.vc.pct + '%)');
linha('Alerta 5b bem abaixo de 5a', c.alerta5b);
console.log('\nCritérios alterados:');
c.crit.forEach((k) => console.log('  ' + (k.alt ? '■ SIM' : '□ não') + '  ' + k.nome + ' = ' + k.valor + ' (' + k.regra + ')'));
console.log('\nÁrvore:');
c.arvore.passos.forEach((p) => console.log('  ' + p.passo + ' → ' + p.resposta + (p.detalhe ? ' (' + p.detalhe + ')' : '')));
console.log('\nPERFIL SUGERIDO: ' + c.arvore.perfil + ' — ' + D.perfis[c.arvore.perfil]);
c.arvore.reforcos.forEach((r) => console.log('  + ' + r));

// Conferências (valores calculados à mão)
assert.strictEqual(c.m1.palTotal, 34); assert.strictEqual(c.m1.palPct, 85);
assert.strictEqual(c.m1.pseTotal, 20); assert.strictEqual(c.m1.psePct, 66.7);
assert.strictEqual(c.m2.lidas, 92); assert.strictEqual(c.m2.erros, 6); assert.strictEqual(c.m2.pcpm, 86); assert.strictEqual(c.m2.precisao, 93.5);
assert.strictEqual(c.m2.prosodia, 7);
assert.strictEqual(c.m3.A.pct, 40.9); assert.strictEqual(c.m3.B.pct, 77.3);
assert.strictEqual(c.m3.leitora, 40.9); assert.strictEqual(c.m3.oral, 77.3); assert.strictEqual(c.m3.diferenca, 36.4);
assert.strictEqual(c.an.pct, 66.7); assert.strictEqual(c.con.pct, 75);
assert.strictEqual(c.vo.total, 18); assert.strictEqual(c.vo.pct, 75); assert.strictEqual(c.vc.total, 10); assert.strictEqual(c.vc.pct, 50);
assert.strictEqual(c.alerta5b, true);
assert.strictEqual(c.arvore.perfil, 'A');

// Terminou antes de 60 s: PCPM = corretas × 60 ÷ segundos
const t = R.calcular({ cab: { forma: 1 }, m2: { erros: [5, 9], terminou: true, seg: 50, limite: 180 } });
assert.strictEqual(t.m2.lidas, 181); assert.strictEqual(t.m2.erros, 2); assert.strictEqual(t.m2.pcpm, Math.round(179 * 60 / 50 * 10) / 10);
console.log('\nTerminou em 50 s com 2 erros → PCPM =', t.m2.pcpm, '(179 × 60 ÷ 50)');

// Erros marcados depois da última palavra não contam
const t2 = R.calcular({ cab: {}, m2: { erros: [10, 150], limite: 99 } });
assert.strictEqual(t2.m2.erros, 1); assert.strictEqual(t2.m2.pcpm, 99);

// Forma 2 inverte leitora/oral
const f2 = R.calcular(Object.assign({}, aluno, { cab: { forma: 2 } }));
assert.strictEqual(f2.m3.leitora, 77.3); assert.strictEqual(f2.m3.oral, 40.9);

// Outros perfis
const clone = (o) => JSON.parse(JSON.stringify(o));
const bom = clone(aluno);
bom.m1.pal = itens([[10, 10], [10, 10], [10, 10], [9, 10]]); bom.m1.pse = itens([[10, 10], [9, 10], [8, 10]]);
bom.m2 = { erros: [1], limite: 140, pros: { expressao: 3, fraseamento: 3, fluidez: 3, ritmo: 3 } };
const perfil = (a) => R.calcular(a).arvore.perfil;
// E: tudo ok
bom.m3.A = { ideias: ok(8, 10), perg: [2, 2, 2, 2, 1, 1] }; bom.m3.B = { ideias: ok(8, 10), perg: [2, 2, 2, 2, 1, 1] };
assert.strictEqual(perfil(bom), 'E');
// D: palavra e linguagem ok, leitora < 60%
const d = clone(bom); d.m3.A = { ideias: ok(3, 10), perg: [1, 1, 1, 1, 1, 1] }; assert.strictEqual(perfil(d), 'D');
// B: palavra ok, oral < 60%
const b = clone(bom); b.m3.B = { ideias: ok(3, 10), perg: [1, 1, 1, 1, 0, 0] }; assert.strictEqual(perfil(b), 'B');
// B também por anáfora E conectivos alterados (manual)
const b2 = clone(bom); b2.m4 = { an: [true, true, true, false, false, false], con: [true, true, true, true, false, false, false, false] }; assert.strictEqual(perfil(b2), 'B');
// C: palavra e linguagem alteradas
const cc = clone(aluno); cc.m5.oral = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0]; assert.strictEqual(perfil(cc), 'C');
// Incompleto: sem dados → null
assert.strictEqual(perfil({ cab: {} }), null);
console.log('Perfis de controle: E, D, B, B (anáfora+conectivos), C e incompleto → OK');
console.log('\nTODOS OS TESTES PASSARAM ✔\n');

// Módulo 4 v2: trechos da anáfora idênticos aos textos do Módulo 3; gabaritos válidos
for (const it of D.m4.anafora.itens) {
  const full = D.m3.textos[it.texto].paragrafos.join(' ');
  assert.ok(full.includes(it.trecho.replace(/\*\*/g, '')), 'trecho difere do texto ' + it.texto + ': ' + it.trecho.slice(0, 40));
  assert.strictEqual((it.trecho.match(/\*\*/g) || []).length, 2, 'cada trecho tem uma palavra-alvo');
  assert.ok(it.ok >= 0 && it.ok < it.ops.length);
}
for (const it of D.m4.conectivos.itens) { assert.ok(it.frase.includes('___')); assert.ok(it.ok >= 0 && it.ok < it.ops.length); }
assert.strictEqual(D.m0.perguntas.length, D.m0.segmentos.length, 'Módulo 0: cada pergunta tem respostas prontas');
console.log('Módulo 4 v2 (trechos fiéis ao texto) e Módulo 0 (7 perguntas) → OK');
