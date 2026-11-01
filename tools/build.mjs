// Build PDFs from content JSON.
// Usage:
//   node tools/build.mjs content/A1/A1-03-have-got.json [--png]      one concept
//   node tools/build.mjs content/A1 [--png] [--book]                 a whole level (+ merged level book)
//   node tools/build.mjs all [--book]                                every level
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { PDFDocument } from 'pdf-lib';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = path.join(ROOT, 'output');
const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const targets = args.filter(a => !a.startsWith('--'));
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const LEVEL_NAMES = {
  A1: 'Acceso · Beginner', A2: 'Plataforma · Elementary', B1: 'Umbral · Intermediate',
  B2: 'Avanzado · Upper-intermediate', C1: 'Dominio operativo · Advanced', C2: 'Maestría · Proficiency'
};

const css = fs.readFileSync(path.join(ROOT, 'tools/engine.css'), 'utf8').replaceAll('FONTDIR', pathToFileURL(path.join(ROOT, 'fonts')).href);
const js = fs.readFileSync(path.join(ROOT, 'tools/engine.js'), 'utf8');

const EMOJI_DIR = path.join(ROOT, 'emoji');
const EMO_RE = /[\u{1F1E6}-\u{1F1FF}]{2}|(?:\p{Extended_Pictographic}\uFE0F|\p{Emoji_Presentation})(?:[\u{1F3FB}-\u{1F3FF}]|\uFE0F)?(?:\u200D\p{Extended_Pictographic}\uFE0F?(?:[\u{1F3FB}-\u{1F3FF}])?)*/gu;
const emoCode = m => [...(m.includes('\u200D') ? m : m.replace(/\uFE0F/g, ''))].map(c => c.codePointAt(0).toString(16)).join('-');
async function ensureEmoji(text) {
  fs.mkdirSync(EMOJI_DIR, { recursive: true });
  const codes = new Set([...text.matchAll(EMO_RE)].map(m => emoCode(m[0])));
  const missing = [];
  for (const code of codes) {
    const f = path.join(EMOJI_DIR, code + '.svg');
    if (fs.existsSync(f)) continue;
    let ok = false;
    for (const variant of [code, code.replace(/-fe0f/g, ''), code + '-fe0f']) {
      const res = await fetch(`https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${variant}.svg`);
      if (res.ok) { fs.writeFileSync(f, Buffer.from(await res.arrayBuffer())); ok = true; break; }
    }
    if (!ok) missing.push(code);
  }
  return missing;
}

function html(dataVar, data) {
  const safe = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${data.id ? `${data.id} · ${fileName(data).split(' · ').slice(1).join(' · ')}` : `Nivel ${data.level}`} · Mario's English Maps</title><style>${css}</style></head><body><div id="pages"></div><script>window.EMOJI_DIR=${JSON.stringify(pathToFileURL(EMOJI_DIR).href)};window.${dataVar}=${safe};</script><script>${js}</script></body></html>`;
}

function fileName(d) {
  const t = String(d.file_title || d.title).replace(/<[^>]+>/g, '').replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
  return `${d.id} · ${t}`;
}

async function render(browser, dataVar, data, pdfPath, pngPrefix) {
  const htmlPath = path.join(OUT, 'html', (data.id || ('book-' + data.level)) + '.html');
  fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
  const doc = html(dataVar, data);
  const missing = await ensureEmoji(doc);
  if (missing.length) console.warn(`   ⚠ emoji not found: ${missing.join(', ')}`);
  fs.writeFileSync(htmlPath, doc);
  const page = await browser.newPage();
  const logs = [];
  page.on('console', m => { if (m.type() === 'warn' || m.type() === 'error') logs.push(m.text()); });
  page.on('pageerror', e => logs.push('PAGEERROR ' + e.message));
  await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  await page.waitForFunction('window.__done === true', { timeout: 180000 });
  const err = await page.evaluate('window.__error');
  if (err) { await page.close(); throw new Error(`${data.id}: ${err}`); }
  const n = await page.evaluate('window.__pages');
  fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
  await page.pdf({ path: pdfPath, width: '297mm', height: '210mm', printBackground: true, preferCSSPageSize: true });
  if (pngPrefix) {
    fs.mkdirSync(path.dirname(pngPrefix), { recursive: true });
    const base = path.basename(pngPrefix);
    for (const f of fs.readdirSync(path.dirname(pngPrefix))) if (new RegExp(`^${base}-\\d+\\.png$`).test(f)) fs.unlinkSync(path.join(path.dirname(pngPrefix), f));
    await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 1.4 });
    const els = await page.$$('.page');
    for (let i = 0; i < els.length; i++) await els[i].screenshot({ path: `${pngPrefix}-${String(i + 1).padStart(2, '0')}.png` });
  }
  await page.close();
  return { pages: n, logs };
}

function listConcepts(target) {
  if (target === 'all') return LEVELS.flatMap(l => listConcepts(path.join(ROOT, 'content', l)));
  const p = path.resolve(target);
  if (!fs.existsSync(p)) return [];
  if (fs.statSync(p).isDirectory()) return fs.readdirSync(p).filter(f => f.endsWith('.json')).sort().map(f => path.join(p, f));
  return [p];
}

const files = targets.flatMap(listConcepts);
if (!files.length) { console.error('No content files found.'); process.exit(1); }
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files', '--font-render-hinting=none'] });
const built = {};
let failed = 0;
for (const f of files) {
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  const pdfPath = path.join(ROOT, 'pdf', data.level, path.basename(f, '.json') + '.pdf');
  const png = flags.has('--png') ? path.join(OUT, 'png', data.id) : null;
  try {
    const r = await render(browser, 'DATA', data, pdfPath, png);
    (built[data.level] ||= []).push({ data, pdfPath, pages: r.pages });
    console.log(`✓ ${data.id} (${r.pages} pp) → ${path.relative(ROOT, pdfPath)}${r.logs.length ? '\n   ' + r.logs.join('\n   ') : ''}`);
  } catch (e) { failed++; console.error(`✗ ${f}\n   ${e.message}`); }
}

if (flags.has('--book')) {
  for (const [level, list] of Object.entries(built)) {
    list.sort((a, b) => a.data.id.localeCompare(b.data.id));
    // cover + index (index pages computed in two passes)
    const book = {
      level, icon: '🗺️', title: `Mario's <em>English</em> Maps`, subtitle: LEVEL_NAMES[level],
      description: `${list.length} mapas mentales con explicación en español e inglés, ejercicios y solucionario. <br><i>${list.length} mind maps with explanations in Spanish and English, exercises and answer keys.</i>`,
      items: []
    };
    const bookPdf = path.join(OUT, 'html', `book-${level}.pdf`);
    let frontPages = 2;
    for (let pass = 0; pass < 2; pass++) {
      let pg = frontPages + 1;
      book.items = list.map(x => { const it = { icon: x.data.icon || '📘', title: x.data.title, subtitle: x.data.subtitle || '', page: pg }; pg += x.pages; return it; });
      const r = await render(browser, 'BOOK', book, bookPdf, null);
      if (r.pages === frontPages) break; frontPages = r.pages;
    }
    const merged = await PDFDocument.create();
    for (const src of [bookPdf, ...list.map(x => x.pdfPath)]) {
      const doc = await PDFDocument.load(fs.readFileSync(src));
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      pages.forEach(p => merged.addPage(p));
    }
    merged.setTitle(`Mario's English Maps · Nivel ${level}`);
    const out = path.join(ROOT, 'pdf', 'libros', `Nivel-${level}-libro-completo.pdf`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, await merged.save());
    console.log(`📚 ${level} book → ${path.relative(ROOT, out)} (${merged.getPageCount()} pp)`);
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
