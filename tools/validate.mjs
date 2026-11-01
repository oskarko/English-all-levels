// Validate concept JSON files against SCHEMA.md rules.
// Usage: node tools/validate.mjs content/A1/A1-03-have-got.json [more files or dirs]
import fs from 'node:fs';
import path from 'node:path';

const EXPLAIN_TYPES = ['intro', 'rule', 'note', 'tip', 'table', 'examples', 'errors', 'vocab', 'dialogue', 'steps', 'compare'];
const ITEM_TYPES = ['fill', 'choose', 'rewrite', 'error', 'translate', 'order', 'write', 'truefalse', 'spell', 'reading'];
const OTHER_TYPES = ['match', 'classify', 'tablefill', 'wordsearch'];
const COLORS = ['green', 'blue', 'purple', 'orange', 'red', 'teal', 'pink', 'yellow'];
const MONSTERS = ['ae', 'nono', 'saltarin', 'serpiente', 'trampas', 'got', 'error'];
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const strip = s => String(s ?? '').replace(/<[^>]+>/g, '');
const norm = s => strip(s).toLowerCase().replace(/[.,!?¿¡;:"“”]/g, ' ').replace(/’/g, "'").split(/\s+/).filter(Boolean).sort().join(' ');

function checkHtml(s, where, errs) {
  if (typeof s !== 'string') return;
  const stack = [];
  for (const m of s.matchAll(/<\/?([a-z0-9]+)[^>]*>/gi)) {
    const tag = m[1].toLowerCase(); if (['br', 'img'].includes(tag)) continue;
    if (m[0][1] === '/') { if (stack.pop() !== tag) { errs.push(`${where}: unbalanced </${tag}> in "${s.slice(0, 60)}"`); return; } }
    else stack.push(tag);
  }
  if (stack.length) errs.push(`${where}: unclosed <${stack.join('>, <')}> in "${s.slice(0, 60)}"`);
  const allowed = ['b', 'em', 'i', 's', 'u', 'mark', 'small', 'br', 'code', 'span'];
  for (const m of s.matchAll(/<([a-z0-9]+)/gi)) if (!allowed.includes(m[1].toLowerCase())) errs.push(`${where}: tag <${m[1]}> not allowed`);
}
function walkStrings(o, where, errs) {
  if (typeof o === 'string') return checkHtml(o, where, errs);
  if (Array.isArray(o)) o.forEach((x, i) => walkStrings(x, `${where}[${i}]`, errs));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walkStrings(v, `${where}.${k}`, errs);
}

function validate(file) {
  const errs = [], warns = [];
  let d;
  try { d = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return { errs: [`JSON parse error: ${e.message}`], warns }; }
  const need = (cond, msg) => { if (!cond) errs.push(msg); };
  const want = (cond, msg) => { if (!cond) warns.push(msg); };

  need(/^(A1|A2|B1|B2|C1|C2)-\d\d$/.test(d.id || ''), 'id must look like "A1-03"');
  need(LEVELS.includes(d.level), 'level must be A1..C2');
  need(d.id && d.id.startsWith(d.level), 'id must start with level');
  need(path.basename(file).startsWith(d.id + '-'), `file name must start with "${d.id}-"`);
  need(typeof d.title === 'string' && d.title.length, 'title required');
  want(strip(d.title).length <= 26, `title is long (${strip(d.title).length} chars) – it may shrink on the map`);
  need(typeof d.subtitle === 'string', 'subtitle required');
  need(typeof d.icon === 'string', 'icon (emoji) required');

  // map
  const m = d.map || {};
  need(typeof m.center === 'string' && m.center.length, 'map.center required');
  want(strip(m.center).length <= 120, `map.center long (${strip(m.center).length} chars, keep ≤ 120)`);
  need(Array.isArray(m.nodes) && m.nodes.length === 6, 'map.nodes must have exactly 6 nodes');
  (m.nodes || []).forEach((n, i) => {
    need(n.title, `map.nodes[${i}].title required`);
    need(n.items || n.rows || n.html || n.chips, `map.nodes[${i}] needs items/rows/html/chips`);
    if (n.color) need(COLORS.includes(n.color), `map.nodes[${i}].color invalid`);
    const len = strip([n.html, ...(n.items || []), ...((n.rows || []).flat()), ...(n.chips || []), n.after].filter(Boolean).join(' ')).length;
    want(len <= 175, `map.nodes[${i}] has ${len} chars of text (keep ≤ 175 so the map stays big and readable)`);
    want((n.items || []).length <= 5, `map.nodes[${i}] has more than 5 bullets`);
  });
  need(m.error && (m.error.bad || m.error.good), 'map.error with bad/good required');
  need(m.mini && Array.isArray(m.mini.items) && m.mini.items.length === 5, 'map.mini.items must have exactly 5 items');
  (m.mini?.items || []).forEach((it, i) => {
    need(it.q && it.a != null, `map.mini.items[${i}] needs q and a`);
    want(strip(it.q).length <= 46, `map.mini.items[${i}].q is long (${strip(it.q).length} chars, keep ≤ 46)`);
  });

  // explain
  const ex = d.explain || [];
  need(ex.length >= 10, `explain needs ≥ 10 blocks (has ${ex.length})`);
  ex.forEach((b, i) => {
    const w = `explain[${i}](${b.t})`;
    need(EXPLAIN_TYPES.includes(b.t), `${w}: unknown type`);
    if (['intro', 'rule', 'note', 'tip'].includes(b.t)) { need(b.es, `${w}: es required`); need(b.en, `${w}: en required`); }
    if (b.t === 'table') { need(Array.isArray(b.head) && Array.isArray(b.rows) && b.rows.length, `${w}: head + rows required`); (b.rows || []).forEach((r, k) => need(r.length === b.head.length, `${w}: row ${k} has ${r.length} cells, head has ${b.head?.length}`)); }
    if (['examples', 'vocab'].includes(b.t)) { need(Array.isArray(b.items) && b.items.length, `${w}: items required`); (b.items || []).forEach((x, k) => need(x.en && x.es, `${w}: item ${k} needs en + es`)); }
    if (b.t === 'errors') { need(MONSTERS.includes(b.monster || 'error'), `${w}: monster must be one of ${MONSTERS}`); (b.items || []).forEach((x, k) => need(x.bad && x.good, `${w}: item ${k} needs bad + good`)); }
    if (b.t === 'dialogue') (b.lines || []).forEach((x, k) => need(x.who && x.en, `${w}: line ${k} needs who + en`));
    if (b.t === 'steps') (b.items || []).forEach((x, k) => need(x.es, `${w}: item ${k} needs es`));
    if (b.t === 'compare') need(Array.isArray(b.cols) && b.cols.length >= 2 && b.cols.length <= 4, `${w}: 2-4 cols required`);
    if (b.color) need(COLORS.includes(b.color), `${w}: color invalid`);
  });
  const nEx = ex.filter(b => b.t === 'examples').reduce((a, b) => a + (b.items || []).length, 0) + ex.filter(b => b.t === 'rule').reduce((a, b) => a + (b.examples || []).length, 0);
  want(nEx >= 20, `only ${nEx} example sentences in explain (aim for ≥ 20)`);
  need(ex.some(b => b.t === 'errors'), 'explain needs an "errors" block');
  need(ex.some(b => b.t === 'table'), 'explain needs at least one "table" block');

  // exercises
  const xs = d.exercises || [];
  need(xs.length >= 12, `exercises needs ≥ 12 (has ${xs.length})`);
  const types = new Set(xs.map(x => x.t));
  want(types.size >= 8, `only ${types.size} different exercise types (aim for ≥ 8)`);
  let items = 0;
  xs.forEach((x, i) => {
    const w = `exercises[${i}](${x.t})`;
    need(ITEM_TYPES.includes(x.t) || OTHER_TYPES.includes(x.t), `${w}: unknown type`);
    need(x.title, `${w}: title required`);
    need(x.es, `${w}: es instructions required`);
    want(x.en, `${w}: en instructions missing`);
    if (ITEM_TYPES.includes(x.t)) {
      need(Array.isArray(x.items) && x.items.length >= 4, `${w}: ≥ 4 items required`);
      items += (x.items || []).length;
      (x.items || []).forEach((y, k) => {
        const wi = `${w} item ${k + 1}`;
        need(y.q, `${wi}: q required`);
        if (x.t !== 'write') need(y.a != null && y.a !== '', `${wi}: a (answer) required`);
        if (x.t === 'fill') need(/_{3,}/.test(y.q || ''), `${wi}: fill item needs ___ blank`);
        if (x.t === 'choose') {
          const opts = [...String(y.q).matchAll(/\[([^\]]+\|[^\]]+)\]/g)];
          need(opts.length >= 1, `${wi}: choose item needs [a|b] options`);
          if (opts.length === 1) need(opts[0][1].split('|').map(s => s.trim()).includes(String(y.a).trim()), `${wi}: answer "${y.a}" is not one of the options [${opts[0][1]}]`);
        }
        if (x.t === 'order') {
          const tiles = String(y.q).split(/\s*\/\s*/).join(' ');
          need(norm(tiles) === norm(y.a), `${wi}: answer words ≠ tiles\n      tiles:  ${norm(tiles)}\n      answer: ${norm(y.a)}`);
        }
        if (x.t === 'spell') need(/^[a-zA-Z' -]+$/.test(String(y.a)), `${wi}: spell answer must be letters only`);
        if (x.t === 'truefalse') need(typeof y.a === 'boolean', `${wi}: truefalse answer must be true/false`);
        if (x.t === 'reading' && y.tf) need(typeof y.a === 'boolean', `${wi}: tf answer must be true/false`);
        if (x.t === 'rewrite' && Array.isArray(y.a)) { const L = y.labels || x.labels || []; need(L.length === y.a.length, `${wi}: ${y.a.length} answers but ${L.length} labels`); }
      });
      if (x.t === 'reading') need(x.text, `${w}: text required`);
    }
    if (x.t === 'match') { need(Array.isArray(x.pairs) && x.pairs.length >= 4 && x.pairs.length <= 8, `${w}: 4-8 pairs required`); items += (x.pairs || []).length; }
    if (x.t === 'classify') { need(Array.isArray(x.cats) && x.cats.length >= 2 && x.cats.length <= 4, `${w}: 2-4 cats required`); items += (x.cats || []).reduce((a, c) => a + c.words.length, 0); }
    if (x.t === 'tablefill') { need(x.head && x.rows && x.rows.flat().some(c => String(c).startsWith('?')), `${w}: head + rows with "?answer" cells required`); (x.rows || []).forEach((r, k) => need(r.length === x.head?.length, `${w}: row ${k} cell count ≠ head`)); items += (x.rows || []).flat().filter(c => String(c).startsWith('?')).length; }
    if (x.t === 'wordsearch') { need(Array.isArray(x.words) && x.words.length >= 6 && x.words.length <= 10, `${w}: 6-10 words`); (x.words || []).forEach(wd => need(wd.replace(/[^A-Za-z]/g, '').length <= 11, `${w}: word "${wd}" too long (≤ 11 letters)`)); items += (x.words || []).length; }
  });
  want(items >= 100, `only ${items} exercise items in total (aim for ≥ 100)`);
  need(Array.isArray(d.checklist) && d.checklist.length >= 4, 'checklist needs ≥ 4 items');
  walkStrings(d, 'root', errs);
  return { errs, warns, stats: { explain: ex.length, examples: nEx, exercises: xs.length, types: types.size, items } };
}

const targets = process.argv.slice(2).flatMap(t => fs.statSync(t).isDirectory() ? fs.readdirSync(t).filter(f => f.endsWith('.json')).map(f => path.join(t, f)) : [t]);
let bad = 0;
for (const f of targets) {
  const { errs, warns, stats } = validate(f);
  const tag = errs.length ? '✗' : warns.length ? '△' : '✓';
  console.log(`${tag} ${f}${stats ? `  [explain ${stats.explain} · examples ${stats.examples} · exercises ${stats.exercises} · types ${stats.types} · items ${stats.items}]` : ''}`);
  errs.forEach(e => console.log('   ERROR ' + e));
  warns.forEach(w => console.log('   warn  ' + w));
  if (errs.length) bad++;
}
process.exit(bad ? 1 : 0);
