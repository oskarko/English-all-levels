/* Mario's English Maps — in-browser renderer + paginator.
   window.DATA = concept JSON (see SCHEMA.md). Sets window.__done = true when finished. */
(async function () {
  'use strict';
  const D = window.DATA;
  const BOOK = window.BOOK || null; // for level cover/index mode
  const BRAND = "Mario's English Maps";
  const PAGES = document.getElementById('pages');
  const LEVEL_COLOR = { A1: 'green', A2: 'blue', B1: 'orange', B2: 'purple', C1: 'red', C2: 'teal' };
  const CYCLE = ['green', 'blue', 'purple', 'orange', 'teal', 'pink', 'yellow', 'red'];

  const $ = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const strip = s => String(s || '').replace(/<[^>]+>/g, '');
  const EMOJI_DIR = window.EMOJI_DIR || 'emoji';
  const EMO_RE = /[\u{1F1E6}-\u{1F1FF}]{2}|(?:\p{Extended_Pictographic}️|\p{Emoji_Presentation})(?:[\u{1F3FB}-\u{1F3FF}]|️)?(?:‍\p{Extended_Pictographic}️?(?:[\u{1F3FB}-\u{1F3FF}])?)*/gu;
  const emoCode = m => [...(m.includes('‍') ? m : m.replace(/️/g, ''))].map(c => c.codePointAt(0).toString(16)).join('-');
  function emojify(root) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
    for (const t of nodes) {
      const s = t.nodeValue; EMO_RE.lastIndex = 0;
      if (!EMO_RE.test(s)) continue;
      EMO_RE.lastIndex = 0;
      const frag = document.createDocumentFragment(); let last = 0, m;
      while ((m = EMO_RE.exec(s))) {
        frag.append(s.slice(last, m.index));
        const img = document.createElement('img'); img.className = 'emj'; img.alt = ''; img.src = `${EMOJI_DIR}/${emoCode(m[0])}.svg`;
        frag.append(img); last = m.index + m[0].length;
      }
      frag.append(s.slice(last)); t.replaceWith(frag);
    }
    return root;
  }

  const arr = x => (x == null ? [] : Array.isArray(x) ? x : [x]);

  /* ---------- seeded random ---------- */
  function hash(str) { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(list, seedStr) { const r = rng(hash(seedStr)); const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  /* ---------- svg assets ---------- */
  const NAVY = '#232a4d';
  const SVG = {
    star: `<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" fill="#ffd54d" stroke="#c99a06" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
    starO: `<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" fill="none" stroke="#c99a06" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
    heart: `<svg viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" fill="#ffd6df" stroke="#e05a78" stroke-width="1.7" stroke-linejoin="round"/></svg>`,
    leaves: `<svg viewBox="0 0 64 22" fill="none" stroke="#3e9a5a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 17 Q32 5 58 17"/><path d="M17 12.4 q-4 -7 -10 -6 q2 7 10 6z" fill="#d3eeda"/><path d="M27 9.4 q-1 -7 -8 -8 q0 7 8 8z" fill="#d3eeda"/><path d="M37 9.4 q1 -7 8 -8 q0 7 -8 8z" fill="#d3eeda"/><path d="M47 12.4 q4 -7 10 -6 q-2 7 -10 6z" fill="#d3eeda"/></svg>`,
    sprig: `<svg viewBox="0 0 24 44" fill="none" stroke="#3e9a5a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 43 C12 30 12 16 13 3"/><path d="M12 33 q-9 -2 -10 -9 q8 0 10 9z" fill="#d3eeda"/><path d="M12 24 q9 -2 10 -9 q-8 0 -10 9z" fill="#d3eeda"/><path d="M12.6 15 q-8 -2 -8 -9 q7 1 8 9z" fill="#d3eeda"/></svg>`,
    book: `<svg viewBox="0 0 80 52" fill="none" stroke="${NAVY}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M4 12 V47 C16 44 30 44 40 49 C50 44 64 44 76 47 V12" stroke="#e05a78" stroke-width="2.6"/><path d="M40 12 C30 6 16 6 6 9 V44 C16 41 30 41 40 46 C50 41 64 41 74 44 V9 C64 6 50 6 40 12 Z" fill="#fff"/><path d="M40 12 V46"/><path d="M12 16 C20 14 28 14 34 17 M12 23 C20 21 28 21 34 24 M12 30 C20 28 28 28 34 31 M46 17 C52 14 60 14 68 16 M46 24 C52 21 60 21 68 23 M46 31 C52 28 60 28 68 30" stroke-width="1.4" stroke="#8a90ad"/></svg>`,
    plane: `<svg viewBox="0 0 120 40" fill="none" stroke="${NAVY}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><path d="M4 30 C20 36 30 18 42 25 C52 31 46 40 38 34 C31 29 50 20 72 22" stroke-dasharray="3 4" stroke="#7d8299"/><path d="M78 20 L114 5 L95 34 L88 24 Z" fill="#fff"/><path d="M88 24 L114 5"/><path d="M88 24 L87 31 L93 28"/></svg>`,
    dashL: `<svg viewBox="0 0 30 30" stroke="${NAVY}" stroke-width="3.2" stroke-linecap="round"><path d="M8 7 L24 11 M5 15 L25 15 M8 23 L24 19"/></svg>`,
    dashR: `<svg viewBox="0 0 30 30" stroke="${NAVY}" stroke-width="3.2" stroke-linecap="round"><path d="M22 7 L6 11 M25 15 L5 15 M22 23 L6 19"/></svg>`,
    rays: `<svg viewBox="0 0 20 34" stroke="${NAVY}" stroke-width="2.2" stroke-linecap="round"><path d="M17 7 L6 2 M17 17 L4 17 M17 27 L6 32"/></svg>`,
    swoosh: `<svg class="ul" viewBox="0 0 200 10" preserveAspectRatio="none"><path d="M2 6 C50 1 120 1 198 4" stroke="#e05a78" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M24 9 C70 5 130 5 186 7.5" stroke="#e05a78" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>`,
    notebook: `<svg viewBox="0 0 52 50"><rect x="5" y="8" width="29" height="37" rx="3" fill="#fff" stroke="${NAVY}" stroke-width="2"/><path d="M11 18 H28 M11 24 H28 M11 30 H24" stroke="#9aa0bb" stroke-width="1.5" stroke-linecap="round"/><path d="M19.5 39.5 s-4-2.4-4-5.2a2.1 2.1 0 0 1 4-1 2.1 2.1 0 0 1 4 1c0 2.8-4 5.2-4 5.2z" fill="#ffd6df" stroke="#e05a78" stroke-width="1.2"/><g fill="none" stroke="${NAVY}" stroke-width="1.6"><path d="M10 10 v-4 a1.6 1.6 0 0 1 3.2 0 v4"/><path d="M17 10 v-4 a1.6 1.6 0 0 1 3.2 0 v4"/><path d="M24 10 v-4 a1.6 1.6 0 0 1 3.2 0 v4"/></g><g transform="rotate(32 40 24)"><rect x="36" y="4" width="8" height="30" rx="1.2" fill="#ffd54d" stroke="${NAVY}" stroke-width="1.8"/><rect x="36" y="1" width="8" height="5" rx="1" fill="#f28b9b" stroke="${NAVY}" stroke-width="1.8"/><path d="M36 34 L40 43 L44 34 Z" fill="#f5d7b0" stroke="${NAVY}" stroke-width="1.8" stroke-linejoin="round"/><path d="M39 40.5 L40 43 L41 40.5Z" fill="${NAVY}"/></g></svg>`,
    bulb: `<svg viewBox="0 0 30 30"><path d="M15 4a8 8 0 0 0-4.5 14.6V22h9v-3.4A8 8 0 0 0 15 4z" fill="#ffe27a" stroke="${NAVY}" stroke-width="1.6"/><path d="M11 25h8M12 28h6" stroke="${NAVY}" stroke-width="1.6" stroke-linecap="round"/></svg>`
  };
  const dataUri = svg => `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  const SPIRAL = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 17 8.4'><circle cx='12.6' cy='4.7' r='1.15' fill='#2d3047'/><path d='M12.6 4.5 C 9 2.3, 3.2 1.5, 1.7 3.1 C 0.8 4.3, 4.2 5.6, 12.4 5' fill='none' stroke='#596075' stroke-width='0.8' stroke-linecap='round'/><path d='M12.2 4.3 C 9 2.9, 4.2 2.2, 2.6 3.2' fill='none' stroke='#c9ccd8' stroke-width='0.3' stroke-linecap='round'/></svg>`;
  const DOTS = (() => { let d = ''; for (let y = 2.5; y < 210; y += 5) for (let x = 2.5; x < 297; x += 5) d += `M${x} ${y}h0`; return `<svg class="dots" viewBox="0 0 297 210" preserveAspectRatio="none"><path d="${d}" stroke="#e0dacb" stroke-width=".55" stroke-linecap="round"/></svg>`; })();
  const SPIRAL_SVG = (() => { let r = ''; for (let i = 0; i < 23; i++) { const y = i * 8.6; r += `<g transform="translate(0 ${y})"><circle cx="12.6" cy="4.7" r="1.15" fill="#2d3047"/><path d="M12.6 4.5 C 9 2.3, 3.2 1.5, 1.7 3.1 C 0.8 4.3, 4.2 5.6, 12.4 5" fill="none" stroke="#596075" stroke-width="0.8" stroke-linecap="round"/><path d="M12.2 4.3 C 9 2.9, 4.2 2.2, 2.6 3.2" fill="none" stroke="#c9ccd8" stroke-width="0.3" stroke-linecap="round"/></g>`; } return `<svg class="spiral" viewBox="0 0 17 198">${r}</svg>`; })();
  const lvlHex = { A1: '#2d9a56', A2: '#2a78bf', B1: '#e0780f', B2: '#7653c1', C1: '#d64242', C2: '#13918b' }[(D || BOOK).level] || '#2d9a56';
  const WAVE = c => `<svg xmlns='http://www.w3.org/2000/svg' width='22' height='6' viewBox='0 0 22 6'><path d='M0 3 Q5.5 0 11 3 T22 3' fill='none' stroke='${c}' stroke-width='1.6'/></svg>`;
  const WAVE2 = `<svg xmlns='http://www.w3.org/2000/svg' width='10' height='3' viewBox='0 0 10 3'><path d='M0 1.5 Q2.5 0 5 1.5 T10 1.5' fill='none' stroke='#e05a78' stroke-width='1.2'/></svg>`;
  const st = document.createElement('style');
  st.textContent = `.ph::after{background-image:${dataUri(WAVE(lvlHex))}} .mini .ml h3::after{background-image:${dataUri(WAVE2)}}`;
  document.head.append(st);

  const MONSTERS = {
    ae: { name: 'Monstruo Ae', color: '#5cc46b', eyes: 1 },
    nono: { name: 'El No-No', color: '#ef6461', eyes: 2 },
    saltarin: { name: 'Verbo Saltarín', color: '#4d9de0', eyes: 2 },
    serpiente: { name: 'Serpiente de la S', color: '#9b6ddb', eyes: 1 },
    trampas: { name: 'Trampas Españolas', color: '#f5a03a', eyes: 2 },
    got: { name: 'El Got Perdido', color: '#f07fb5', eyes: 1 },
    error: { name: 'Monstruo del error', color: '#2bb3a3', eyes: 2 }
  };
  function monster(kind) {
    const M = MONSTERS[kind] || MONSTERS.error; const c = M.color, d = NAVY;
    const eyes = M.eyes === 1
      ? `<circle cx="32" cy="27" r="9" fill="#fff" stroke="${d}" stroke-width="2"/><circle cx="33.5" cy="28.5" r="4.5" fill="${d}"/><circle cx="35" cy="26.5" r="1.5" fill="#fff"/>`
      : `<circle cx="24" cy="27" r="6.5" fill="#fff" stroke="${d}" stroke-width="2"/><circle cx="25" cy="28" r="3.2" fill="${d}"/><circle cx="26" cy="26.6" r="1" fill="#fff"/><circle cx="40" cy="27" r="6.5" fill="#fff" stroke="${d}" stroke-width="2"/><circle cx="41" cy="28" r="3.2" fill="${d}"/><circle cx="42" cy="26.6" r="1" fill="#fff"/>`;
    return `<svg viewBox="0 0 64 64"><path d="M20 15 L14 3 L27 11 Z M44 15 L50 3 L37 11 Z" fill="${c}" stroke="${d}" stroke-width="2" stroke-linejoin="round"/><path d="M10 58 C6 38 8 14 32 12 C56 14 58 38 54 58 C50 54 46 54 43 58 C40 54 35 54 32 58 C29 54 24 54 21 58 C18 54 14 54 10 58 Z" fill="${c}" stroke="${d}" stroke-width="2.2" stroke-linejoin="round"/><ellipse cx="32" cy="47" rx="10" ry="6.5" fill="#fff" opacity=".35"/>${eyes}<path d="M23 39 Q32 47 41 39 Z" fill="#fff" stroke="${d}" stroke-width="2" stroke-linejoin="round"/><path d="M27 40.4 L28.6 43 L30.2 41.4 M33.8 41.4 L35.4 43 L37 40.4" fill="none" stroke="${d}" stroke-width="1.2"/></svg>`;
  }

  /* ---------- inline formatting ---------- */
  function blanks(s) {
    return String(s).replace(/_{3,}/g, m => `<span class="blank${m.length === 4 ? ' m' : m.length >= 5 ? ' l' : ''}"></span>`);
  }
  function opts(s) {
    return String(s).replace(/\[([^\[\]|]+(?:\|[^\[\]|]+)+)\]/g, (m, inner) => inner.split('|').map(o => `<span class="opt">${o.trim()}</span>`).join('<span class="osl">/</span>'));
  }
  const q = s => opts(blanks(s));
  function formulaHtml(f) {
    return arr(f).map(line => `<div class="formula">${String(line).split(/\s\+\s/).map((p, i) => {
      const key = /^\*[^*]+\*$/.test(p.trim()); const txt = key ? p.trim().slice(1, -1) : String(p).replace(/\*([^*]+)\*/g, '<b>$1</b>');
      return (i ? '<span class="fp">+</span>' : '') + `<span class="fc${key ? ' k' : ''}">${txt}</span>`;
    }).join('')}</div>`).join('');
  }
  const bi = (es, en) => (es ? `<div class="bi es"><span class="flag">🇪🇸</span><div class="tx">${es}</div></div>` : '') + (en ? `<div class="bi en"><span class="flag">🇬🇧</span><div class="tx">${en}</div></div>` : '');

  /* ---------- page shells ---------- */
  function shell(kind) {
    const p = $('div', `page ${kind} lv-${(D || BOOK).level}`);
    p.insertAdjacentHTML('beforeend', DOTS);
    p.append($('div', 'frame'));
    p.insertAdjacentHTML('beforeend', SPIRAL_SVG);
    const sh = $('div', 'sheet'); p.append(sh);
    PAGES.append(p);
    return { p, sh };
  }
  const SECT = {
    explain: { icon: '📖', es: 'Explicación', en: 'Explanation' },
    practice: { icon: '✏️', es: 'Ejercicios', en: 'Practice' },
    review: { icon: '🏆', es: 'Repaso', en: 'Review' },
    key: { icon: '🔑', es: 'Solucionario', en: 'Answer key' },
    index: { icon: '🗺️', es: 'Índice', en: 'Contents' }
  };
  function flowPage(secKey) {
    const sec = SECT[secKey];
    const { p, sh } = shell('flow');
    const src = D || BOOK;
    const ph = $('div', 'ph', `<div class="ph-ic">${src.icon || '📘'}</div><div><div class="ph-t">${src.title}</div><div class="ph-s">${src.subtitle || ''}</div></div><div class="sp"></div><div class="ph-sec">${sec.icon} ${sec.es} · <span class="en">${sec.en}</span></div><div class="lvl-badge">Nivel ${src.level}${SVG.star}</div>`);
    const content = $('div', 'content');
    const pf = $('div', 'pf', `<span>✏️ ${BRAND} · ${src.level} · ${strip(src.title)}</span><span class="pn"></span>`);
    sh.append(ph, content, pf);
    emojify(ph); emojify(pf);
    return content;
  }

  /* ---------- paginator ---------- */
  let F = null;
  function startSection(secKey) { if (F) balance(F.region); F = { sec: secKey }; newPage(); }
  function newPage() { F.content = flowPage(F.sec); F.region = null; }
  // move trailing blocks of the left column to the right one so both columns end at a similar height
  function balance(r) {
    if (!r || r.wide || r.ci !== 0) return;
    const [c0, c1] = r.cols;
    while (c0.children.length > 1) {
      const h = Math.max(c0.offsetHeight, c1.offsetHeight);
      const last = c0.lastElementChild;
      c1.prepend(last);
      if (Math.max(c0.offsetHeight, c1.offsetHeight) >= h - 1) { c0.append(last); break; }
    }
    if (c1.children.length) r.ci = 1;
  }
  function newRegion(wide) {
    if (F.region && F.content.contains(F.region)) balance(F.region);
    const r = $('div', 'region ' + (wide ? 'wide' : 'two'));
    r.wide = wide; r.ci = 0;
    if (wide) r.cols = [r]; else { r.cols = [$('div', 'col'), $('div', 'col')]; r.append(...r.cols); }
    F.content.append(r); F.region = r;
  }
  const over = () => F.content.scrollHeight > F.content.clientHeight + 0.5;
  function advance() { if (F.region && !F.region.wide && F.region.ci === 0) F.region.ci = 1; else newPage(); }
  const wrapSpec = spec0 => spec0.__w ? spec0 : Object.assign({}, spec0, { __w: true, render: (a, b, c) => emojify(spec0.render(a, b, c)) });
  // try to put a whole (unsplit) block at the current position without changing regions of other type
  function tryWhole(spec0) {
    const spec = wrapSpec(spec0);
    if (!F.region || F.region.wide !== !!spec.wide) return false;
    spec.begin && spec.begin();
    const col = F.region.cols[F.region.ci];
    const e = spec.render(0, spec.n == null ? null : spec.n, false); col.append(e);
    if (!over()) { spec.commit && spec.commit(); return true; }
    e.remove(); return false;
  }
  // fill the remaining space of the current column with later blocks that fit whole
  // ordered blocks (numbered rules) never jump ahead of an earlier ordered block
  function backfill(queue, current) {
    if (!queue) return;
    let orderedPending = !!(current && current.ordered);
    for (let i = 0; i < Math.min(queue.length, 7); i++) {
      const s = queue[i];
      if (s.fixed) break;
      if (s.ordered && orderedPending) continue;
      if (tryWhole(s)) { queue.splice(i, 1); i--; }
      else if (s.ordered) orderedPending = true;
    }
  }
  function flow(specs) { const q = specs.slice(); while (q.length) place(q.shift(), q); }
  function place(spec0, queue) {
    const spec = wrapSpec(spec0);
    const n = spec.n == null ? null : spec.n;
    let start = 0, cont = false, guard = 0, committed = false;
    const commit = () => { if (!committed) { committed = true; spec.commit && spec.commit(); } };
    while (guard++ < 400) {
      if (!committed && spec.begin) spec.begin();
      if (!F.region || F.region.wide !== !!spec.wide) newRegion(!!spec.wide);
      const col = F.region.cols[F.region.ci];
      let e = spec.render(start, n, cont);
      col.append(e);
      if (!over()) { commit(); return; }
      // gentle squeeze: a block that almost fits is shrunk a little instead of leaving an orphan tail
      for (const z of [0.96, 0.92]) { e.style.zoom = z; if (!over()) { commit(); return; } }
      e.style.zoom = '';
      e.remove();
      if (n != null && n - start > 1) {
        const min = Math.min(spec.min || 2, n - start - 1);
        let lo = start + Math.max(1, min), hi = n - 1, best = -1;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          const t = spec.render(start, mid, cont); col.append(t);
          const ok = !over(); t.remove();
          if (ok) { best = mid; lo = mid + 1; } else hi = mid - 1;
        }
        const emptyCol = col.children.length === 0;
        // split only if a reasonable chunk fits (or the column is empty)
        if (best > 0 && (emptyCol || best - start >= Math.min(3, n - start - 1))) {
          col.append(spec.render(start, best, cont)); commit();
          start = best; cont = true; advance(); continue;
        }
      }
      const pageEmpty = F.content.firstChild === F.region && col.children.length === 0;
      if (pageEmpty) {
        e = spec.render(start, n, cont); col.append(e); commit();
        let z = 1; while (over() && z > 0.55) { z -= 0.04; e.style.zoom = z; }
        console.warn('SQUEEZED block to zoom ' + z.toFixed(2));
        advance();
        return;
      }
      if (!cont) backfill(queue, spec);
      advance();
    }
  }

  /* ---------- card helper ---------- */
  function card(o) {
    const c = $('div', `card c-${o.color || 'blue'} ${o.cls || ''}`);
    const h = $('div', 'card-h');
    h.innerHTML = (o.pre || '') + (o.num != null ? `<span class="num">${o.num}</span>` : '') +
      `<span class="ttl">${o.title || ''}${o.en ? ` <span class="en">· ${o.en}</span>` : ''}${o.cont ? ' <span class="cont">(continúa · cont.)</span>' : ''}</span>` +
      (o.icon ? `<span class="ic">${o.icon}</span>` : '');
    const b = $('div', 'card-b');
    c.append(h, b); c.body = b;
    return c;
  }
  const lvColor = () => LEVEL_COLOR[(D || BOOK).level] || 'green';

  /* ---------- explanation blocks ---------- */
  let cyc = 0;
  const nextColor = () => CYCLE[(cyc++) % 5];
  const EX = {
    section(b) {
      return { wide: true, render: () => $('div', 'sect', `<span class="big">${b.icon}</span><div><h2>${b.es} <span class="en">· ${b.en}</span></h2>${b.sub ? `<div class="sub">${b.sub}</div>` : ''}${b.name ? `<div class="namebar">Name · Nombre <span class="ln"></span> Date · Fecha <span class="ln s"></span> ⭐ Score <span class="ln s"></span></div>` : ''}</div>`) };
    },
    intro(b) {
      const color = b.color || lvColor();
      return { wide: !!b.wide, render: () => { const c = card({ color, title: b.title || '¿Qué es?', en: b.title_en || 'What is it?', icon: b.icon || '🔎' }); c.body.innerHTML = bi(b.es, b.en) + (b.formula ? formulaHtml(b.formula) : ''); return c; } };
    },
    rule(b) {
      const color = b.color || nextColor();
      const ex = arr(b.examples);
      return {
        wide: !!b.wide, render: () => {
          const c = card({ color, title: b.title, en: b.title_en, icon: b.icon, num: b.num });
          c.body.innerHTML = bi(b.es, b.en) + (b.formula ? formulaHtml(b.formula) : '') +
            (ex.length ? `<div class="exl" style="margin-top:1.6mm">${ex.map(x => `<div class="exi"><span class="ic">${x.icon || '•'}</span><div><div class="en">${x.en}</div>${x.es ? `<div class="es">${x.es}</div>` : ''}</div></div>`).join('')}</div>` : '');
          return c;
        }
      };
    },
    note(b) { return EX.rule(b); },
    tip(b) {
      return { wide: !!b.wide, render: () => { const c = card({ color: b.color || 'yellow', title: b.title || 'Truco', en: b.title_en || 'Tip', icon: b.icon || '💡', cls: 'soft' }); c.body.innerHTML = bi(b.es, b.en); return c; } };
    },
    table(b) {
      const color = b.color || nextColor();
      const rows = b.rows || [];
      return {
        wide: !!b.wide, n: rows.length, min: 3, render: (s, e, cont) => {
          const c = card({ color, title: b.title, en: b.title_en, icon: b.icon, cont });
          const last = e == null || e >= rows.length;
          c.body.innerHTML = `<table class="t"><thead><tr>${(b.head || []).map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.slice(s, e == null ? undefined : e).map(r => `<tr>${r.map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table>` +
            (last && (b.note || b.note_en) ? `<div class="tnote">${bi(b.note, b.note_en)}</div>` : '');
          return c;
        }
      };
    },
    examples(b) {
      const color = b.color || 'teal';
      const it = b.items || [];
      return {
        wide: !!b.wide, n: it.length, min: 3, render: (s, e, cont) => {
          const c = card({ color, title: b.title || 'Ejemplos', en: b.title_en || 'Examples', icon: b.icon || '💬', cont });
          c.body.innerHTML = `<div class="exl">${it.slice(s, e == null ? undefined : e).map(x => `<div class="exi"><span class="ic">${x.icon || '•'}</span><div><div class="en">${x.en}</div>${x.es ? `<div class="es">${x.es}</div>` : ''}</div></div>`).join('')}</div>`;
          return c;
        }
      };
    },
    errors(b) {
      const it = b.items || [];
      const M = MONSTERS[b.monster] || MONSTERS.error;
      return {
        wide: !!b.wide, n: it.length, min: 2, render: (s, e, cont) => {
          const c = card({ color: 'red', title: `<span class="mon-h">${monster(b.monster)}<span>${b.title || '¡Caza al monstruo!'} <span class="en">· ${b.title_en || 'Hunt the monster'}</span>${cont ? ' <span class="cont">(cont.)</span>' : ''}<br><span class="mon-name">${M.name}</span></span></span>` });
          c.body.innerHTML = it.slice(s, e == null ? undefined : e).map(x => `<div class="erri"><div class="bad"><span class="x">✗</span><span class="w">${x.bad}</span></div><div class="good"><span class="v">✓</span>${x.good}</div>${x.why || x.why_en ? `<div class="why">${x.why || ''}${x.why_en ? ` <span class="en">/ ${x.why_en}</span>` : ''}</div>` : ''}</div>`).join('');
          return c;
        }
      };
    },
    vocab(b) {
      const color = b.color || nextColor();
      const it = b.items || []; const cols = b.cols || (b.wide ? 4 : 2);
      return {
        wide: !!b.wide, n: Math.ceil(it.length / cols), min: 2, render: (s, e, cont) => {
          const c = card({ color, title: b.title || 'Vocabulario', en: b.title_en || 'Vocabulary', icon: b.icon || '🧩', cont });
          const sl = it.slice(s * cols, e == null ? undefined : e * cols);
          c.body.innerHTML = `<div class="vgrid" style="--vcols:${cols}">${sl.map(x => `<div class="vc"><span class="ic">${x.icon || '•'}</span><div><div class="en">${x.en}</div><div class="es">${x.es || ''}</div></div></div>`).join('')}</div>`;
          return c;
        }
      };
    },
    dialogue(b) {
      const ln = b.lines || [];
      const first = ln[0] && ln[0].who;
      return {
        wide: !!b.wide, n: ln.length, min: 3, render: (s, e, cont) => {
          const c = card({ color: b.color || 'purple', title: b.title || 'Diálogo', en: b.title_en || 'Dialogue', icon: b.icon || '🗨️', cont });
          c.body.innerHTML = `<div class="dl">${ln.slice(s, e == null ? undefined : e).map(x => `<div class="dli${x.who !== first ? ' alt' : ''}"><div class="who">${x.who}</div><div class="bub"><div>${x.en}</div>${x.es ? `<div class="es">${x.es}</div>` : ''}</div></div>`).join('')}</div>`;
          return c;
        }
      };
    },
    steps(b) {
      const it = b.items || [];
      return {
        wide: !!b.wide, n: it.length, min: 2, render: (s, e, cont) => {
          const c = card({ color: b.color || 'orange', title: b.title || 'Paso a paso', en: b.title_en || 'Step by step', icon: b.icon || '🪜', cont });
          c.body.innerHTML = `<div class="stl">${it.slice(s, e == null ? undefined : e).map((x, i) => `<div class="sti"><span class="n">${s + i + 1}</span><div><div>${x.es || ''}</div>${x.en ? `<div class="en">🇬🇧 ${x.en}</div>` : ''}</div></div>`).join('')}</div>`;
          return c;
        }
      };
    },
    compare(b) {
      const cols = b.cols || [];
      return {
        wide: !!b.wide, render: () => {
          const c = card({ color: b.color || 'blue', title: b.title, en: b.title_en, icon: b.icon || '⚖️' });
          c.body.innerHTML = (b.es || b.en ? `<div style="margin-bottom:1.6mm">${bi(b.es, b.en)}</div>` : '') +
            `<div class="cmp" style="grid-template-columns:repeat(${cols.length},1fr)">${cols.map((k, i) => `<div class="cc c-${k.color || CYCLE[i]}"><h4>${k.head}</h4><ul class="dots">${arr(k.items).map(x => `<li>${x}</li>`).join('')}</ul></div>`).join('')}</div>`;
          return c;
        }
      };
    }
  };

  /* ---------- exercises ---------- */
  const EXCOL = ['blue', 'purple', 'green', 'orange', 'teal', 'pink'];
  function exHead(x, num, cont) {
    const c = card({ color: x._color, title: x.title, en: x.title_en, icon: x.icon || '', cont, cls: 'ex', pre: `<span class="exn">Ejercicio ${num}</span>` });
    if (!cont) {
      const ins = (x.es || x.en) ? `<div class="ins">${x.es ? `<div class="es">✍️ ${x.es}</div>` : ''}${x.en ? `<div class="en">🇬🇧 ${x.en}</div>` : ''}</div>` : '';
      const bank = x.bank ? `<div class="bank"><span class="lab">Word bank</span>${arr(x.bank).map(w => `<span class="w">${w}</span>`).join('')}</div>` : '';
      c.body.innerHTML = ins + bank;
    }
    return c;
  }
  const lines = (n, labels) => {
    const L = arr(labels);
    const k = Math.max(n || 0, L.length || 0, 1);
    let h = ''; for (let i = 0; i < k; i++) h += `<div class="wl"><span class="lab">${L[i] || ''}</span></div>`;
    return h;
  };
  function itemsHtml(x, s, e, fn) {
    const it = x.items || [];
    return `<div class="its">${it.slice(s, e == null ? undefined : e).map((y, i) => `<div class="it"><span class="n">${s + i + 1}</span><div>${fn(y, s + i)}</div></div>`).join('')}</div>`;
  }
  function scramble(word, seed) {
    const letters = word.replace(/\s+/g, '').split('');
    let sh = shuffle(letters, seed);
    if (sh.join('') === letters.join('') && letters.length > 1) sh = sh.slice(1).concat(sh[0]);
    return sh;
  }
  function wordsearch(x, seedStr) {
    const words = arr(x.words).map(w => w.toUpperCase().replace(/[^A-Z]/g, ''));
    const size = x.size || Math.max(10, Math.min(14, Math.max(...words.map(w => w.length)) + 3));
    const dirs = x.diag ? [[0, 1], [1, 0], [1, 1]] : [[0, 1], [1, 0]];
    for (let attempt = 0; attempt < 50; attempt++) {
      const r = rng(hash(seedStr + attempt));
      const g = Array.from({ length: size }, () => Array(size).fill(null));
      const on = Array.from({ length: size }, () => Array(size).fill(false));
      let ok = true;
      for (const w of words.slice().sort((a, b) => b.length - a.length)) {
        let placed = false;
        for (let t = 0; t < 400 && !placed; t++) {
          const [dr, dc] = dirs[Math.floor(r() * dirs.length)];
          const r0 = Math.floor(r() * (size - dr * (w.length - 1)));
          const c0 = Math.floor(r() * (size - dc * (w.length - 1)));
          let fits = true;
          for (let k = 0; k < w.length; k++) { const ch = g[r0 + dr * k][c0 + dc * k]; if (ch && ch !== w[k]) { fits = false; break; } }
          if (!fits) continue;
          for (let k = 0; k < w.length; k++) { g[r0 + dr * k][c0 + dc * k] = w[k]; on[r0 + dr * k][c0 + dc * k] = true; }
          placed = true;
        }
        if (!placed) { ok = false; break; }
      }
      if (!ok) continue;
      const AL = 'ABCDEFGHIJKLMNOPRSTUVWY';
      for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) if (!g[i][j]) g[i][j] = AL[Math.floor(r() * AL.length)];
      return { g, on, words };
    }
    throw new Error('wordsearch failed for ' + seedStr);
  }
  const WS = {};

  const XT = {
    fill: (y) => `<div class="q">${q(y.q)}${y.hint ? ` <span class="hint">(${y.hint})</span>` : ''}</div>`,
    choose: (y) => `<div class="q">${q(y.q)}${y.hint ? ` <span class="hint">(${y.hint})</span>` : ''}</div>`,
    rewrite: (y, i, x) => `<div class="q">${q(y.q)}${y.hint ? ` <span class="hint">(${y.hint})</span>` : ''}</div>${lines(y.lines || 1, y.labels || x.labels)}`,
    error: (y) => `<div class="q badq">${y.q}</div>${lines(1, ['✓'])}`,
    translate: (y) => `<div class="q">🇪🇸 ${y.q}${y.hint ? ` <span class="hint">(${y.hint})</span>` : ''}</div>${lines(y.lines || 1, ['🇬🇧'])}`,
    order: (y, i, x) => `<div class="tiles">${String(y.q).split(/\s*\/\s*/).map(t => `<span class="tl">${t}</span>`).join('')}</div>${lines(1)}`,
    write: (y) => `<div class="q">${q(y.q)}</div>${lines(y.lines || 2)}`,
    truefalse: (y) => `<div class="q">${q(y.q)} <span class="tfbox"><span>T</span><span>F</span></span></div>`,
    spell: (y, i, x) => {
      const L = scramble(String(y.a), (D.id || '') + x.title + i);
      const boxes = String(y.a).split('').map(ch => ch === ' ' ? '<span style="display:inline-block;width:3mm"></span>' : '<span style="display:inline-block;width:6.2mm;height:7mm;border:1.4px solid var(--c);border-radius:1.2mm;background:#fff;margin-right:.8mm"></span>').join('');
      return `<div class="q">${y.q}</div><div class="tiles">${L.map(t => `<span class="tl">${t}</span>`).join('')}</div><div style="margin:.8mm 0 .4mm">${boxes}</div>`;
    },
    reading: (y) => y.tf ? `<div class="q">${q(y.q)} <span class="tfbox"><span>T</span><span>F</span></span></div>` : `<div class="q">${q(y.q)}</div>${lines(y.lines || 1)}`
  };

  const EXN = { next: 1 };
  function exSpec(x) {
    const it = x.items || [];
    const t = x.t;
    const hooks = { begin: () => { if (!x._fixedNum) x._num = EXN.next; }, commit: () => { x._fixedNum = true; EXN.next++; } };
    const S = o => Object.assign(o, hooks);
    if (XT[t]) {
      return S({
        wide: !!x.wide, n: it.length, min: 2, render: (s, e, cont) => {
          const c = exHead(x, x._num, cont);
          let pre = '';
          if (t === 'reading' && !cont) pre = `<div class="reading">${x.text_title ? `<h5>${x.text_title}</h5>` : ''}${arr(x.text).map(p => `<p>${p}</p>`).join('')}</div>`;
          c.body.insertAdjacentHTML('beforeend', pre + itemsHtml(x, s, e, (y, i) => XT[t](y, i, x)));
          return c;
        }
      });
    }
    if (t === 'match') {
      const pairs = x.pairs || [];
      const right = shuffle(pairs.map((p, i) => ({ txt: p[1], i })), (D.id || '') + 'm' + x.title);
      if (right.every((r, k) => r.i === k) && right.length > 1) right.push(right.shift());
      x._match = pairs.map((p, i) => `${i + 1}-${String.fromCharCode(97 + right.findIndex(r => r.i === i))}`);
      return S({
        wide: !!x.wide, render: () => {
          const c = exHead(x, x._num, false);
          c.body.insertAdjacentHTML('beforeend', `<div class="match">${pairs.map((p, i) => `<div class="ml"><span class="k">${i + 1}</span>${p[0]}</div><div></div><div class="mr"><span class="k">${String.fromCharCode(97 + i)}</span>${right[i].txt}</div>`).join('')}</div>`);
          return c;
        }
      });
    }
    if (t === 'classify') {
      const cats = x.cats || [];
      const words = shuffle(cats.flatMap(k => k.words), (D.id || '') + 'c' + x.title);
      return S({
        wide: !!x.wide, render: () => {
          const c = exHead(Object.assign({}, x, { bank: words }), x._num, false);
          c.body.insertAdjacentHTML('beforeend', `<div class="cls" style="grid-template-columns:repeat(${cats.length},1fr)">${cats.map(k => `<div class="bin"><h6>${k.name}</h6></div>`).join('')}</div>`);
          return c;
        }
      });
    }
    if (t === 'tablefill') {
      const rows = x.rows || [];
      return S({
        wide: !!x.wide, n: rows.length, min: 3, render: (s, e, cont) => {
          const c = exHead(x, x._num, cont);
          c.body.insertAdjacentHTML('beforeend', `<table class="t"><thead><tr>${(x.head || []).map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.slice(s, e == null ? undefined : e).map(r => `<tr>${r.map(cell => `<td>${String(cell).startsWith('?') ? '<span class="blank" style="width:100%"></span>' : cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
          return c;
        }
      });
    }
    if (t === 'wordsearch') {
      const W = wordsearch(x, (D.id || '') + 'ws' + x.title); x._ws = W;
      return S({
        wide: !!x.wide, render: () => {
          const c = exHead(x, x._num, false);
          const clues = arr(x.clues);
          c.body.insertAdjacentHTML('beforeend', `<div class="ws"><table>${W.g.map(r => `<tr>${r.map(ch => `<td>${ch}</td>`).join('')}</tr>`).join('')}</table><div class="wsl">${W.words.map((w, i) => `<span>${clues[i] || w.toLowerCase()}</span>`).join('')}</div></div>`);
          return c;
        }
      });
    }
    throw new Error('Unknown exercise type: ' + t);
  }

  /* ---------- answers ---------- */
  const A = a => Array.isArray(a) ? a.join(' / ') : String(a);
  function ansSpec(x) {
    const num = x._num;
    const color = x._color;
    const head = (cont) => card({ color, title: `Ejercicio ${num} · ${x.title}`, cont, cls: 'ans' });
    const t = x.t;
    const tf = v => (v === true || v === 'T' || v === 'true') ? '<b class="ok">True ✓</b>' : '<b class="ko">False ✗</b>';
    const one = (y) => {
      if (t === 'truefalse' || (t === 'reading' && y.tf)) return tf(y.a) + (y.why ? ` — ${y.why}` : '');
      if (t === 'write') return y.a ? A(y.a) : '<i>Respuesta libre · Free answer</i>';
      return A(y.a);
    };
    if (XT[t]) {
      const it = x.items || [];
      const long = it.some(y => strip(one(y)).length > 34);
      return {
        n: it.length, min: 3, render: (s, e, cont) => {
          const c = head(cont);
          c.body.innerHTML = `<div class="${long ? 'al' : ''}">${it.slice(s, e == null ? undefined : e).map((y, i) => `<span class="ai"><span class="n">${s + i + 1}.</span>${one(y)}</span>`).join(' ')}</div>`;
          return c;
        }
      };
    }
    return {
      render: () => {
        const c = head(false);
        if (t === 'match') c.body.innerHTML = x._match.map(m => `<span class="ai">${m}</span>`).join(' ');
        else if (t === 'classify') c.body.innerHTML = `<div class="al">${(x.cats || []).map(k => `<span class="ai"><b>${k.name}:</b> ${k.words.join(', ')}</span>`).join('')}</div>`;
        else if (t === 'tablefill') c.body.innerHTML = `<table class="t"><thead><tr>${(x.head || []).map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${(x.rows || []).map(r => `<tr>${r.map(cell => `<td>${String(cell).startsWith('?') ? `<span class="fill">${String(cell).slice(1)}</span>` : cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
        else if (t === 'wordsearch') { const W = x._ws; c.body.innerHTML = `<div class="ws key"><table>${W.g.map((r, i) => `<tr>${r.map((ch, j) => `<td class="${W.on[i][j] ? 'on' : ''}">${ch}</td>`).join('')}</tr>`).join('')}</table><div class="wsl" style="font-size:12.5px">${W.words.map(w => `<span>${w}</span>`).join('')}</div></div>`; }
        return c;
      }
    };
  }

  /* ---------- MAP PAGE ---------- */
  function buildMap() {
    const m = D.map;
    const { p, sh } = shell('map');
    const nodes = m.nodes || [];
    const defaultColors = ['green', 'blue', 'purple', 'orange', 'pink', 'yellow'];
    const boxHtml = (nd, i) => {
      const color = nd.color || defaultColors[i % 6];
      let body = '';
      if (nd.html) body += `<p>${nd.html}</p>`;
      if (nd.chips) body += `<div class="chips">${arr(nd.chips).map(c => `<span>${c}</span>`).join('')}</div>`;
      if (nd.rows) body += `<div class="mrows">${nd.rows.map(r => `<span class="k">${r[0]}</span><span>${r[1]}</span>`).join('')}</div>`;
      if (nd.items) body += `<ul class="dots">${nd.items.map(x => `<li>${x}</li>`).join('')}</ul>`;
      if (nd.after) body += `<p>${nd.after}</p>`;
      return `<div class="mbox c-${color}${nd.art ? ' has-art' : ''}" data-side="${i % 2 === 0 ? 'l' : 'r'}"><div class="mbox-h"><span class="n">${i + 1}</span><span class="t">${nd.title}</span>${nd.icon ? `<span class="ic">${nd.icon}</span>` : ''}</div><div class="mbox-b">${body}</div>${nd.art ? `<span class="art">${nd.art}</span>` : ''}</div>`;
    };
    const left = nodes.filter((_, i) => i % 2 === 0).map((nd, k) => boxHtml(nd, k * 2)).join('');
    const right = nodes.filter((_, i) => i % 2 === 1).map((nd, k) => boxHtml(nd, k * 2 + 1)).join('');
    const er = m.error || {};
    const errBox = `<div class="mbox c-red" data-side="c"><div class="mbox-h"><span class="n">${nodes.length + 1}</span><span class="t">${er.title || 'Error común'}</span><span class="ic">⚠️</span></div><div class="mbox-b">${arr(er.bad).map(b => `<div class="errl bad"><span class="x">✗</span><span>${b}</span></div>`).join('')}${arr(er.good).map(g => `<div class="errl good"><span class="v">✓</span><span>${g}</span></div>`).join('')}${er.note ? `<div class="errn">${er.note}</div>` : ''}</div></div>`;
    const mini = m.mini || { items: [] };
    sh.innerHTML = `
      <div class="mh">
        <div class="book">${SVG.book}</div>
        <div class="mt-wrap"><div class="mt">${SVG.dashL}<span>${D.title}</span>${SVG.dashR}</div>
        <div class="ms"><span>${D.subtitle || ''}</span>${SVG.heart.replace('<svg', '<svg class="h"')}${SVG.swoosh}</div></div>
        <div class="plane">${SVG.plane}</div>
        <div class="lvl-badge">Nivel ${D.level}${SVG.star}</div>
        <div class="dd" style="left:30mm;top:19mm;width:6mm">${SVG.star}</div>
        <div class="dd" style="left:44mm;top:6mm;width:9mm">${SVG.sprig}</div>
        <div class="dd" style="right:30mm;top:20mm;width:5mm">${SVG.heart}</div>
        <div class="dd" style="right:8mm;top:15mm;width:9mm">${SVG.sprig}</div>
      </div>
      <div class="mb">
        <div class="mcol l">${left}</div>
        <div class="mcol c">
          <div class="oval-wrap"><div class="rays l">${SVG.rays}</div><div class="oval"><div class="heart">${SVG.heart}</div><div>${m.center}</div><div class="leaves">${SVG.leaves}</div></div><div class="rays r">${SVG.rays}</div></div>
          <div class="doodles"><div class="dd" style="position:absolute;left:4mm;top:30%;width:5mm">${SVG.star}</div><div class="dd" style="position:absolute;right:5mm;top:15%;width:4.5mm">${SVG.starO}</div></div>
          ${errBox}
        </div>
        <div class="mcol r">${right}</div>
        <svg class="links"></svg>
      </div>
      <div class="mini">
        <div class="ml">${SVG.notebook}<div><h3>Mini ejercicio</h3><div class="ins2">${mini.es || ''}${mini.en ? `<br><i>${mini.en}</i>` : ''}</div></div></div>
        ${arr(mini.items).slice(0, 5).map((it, i) => `<div class="mc"><div><span class="n">${i + 1}.</span> ${q(it.q)}</div>${it.hint ? `<div class="hint">(${it.hint})</div>` : ''}</div>`).join('')}
      </div>`;
    return p;
  }
  function fitMap(p) {
    const mb = p.querySelector('.mb');
    const cols = [...mb.querySelectorAll('.mcol')];
    let fs = 17.5;
    const fits = () => cols.every(c => c.scrollHeight <= c.clientHeight + 1);
    mb.style.setProperty('--mfs', fs + 'px');
    while (!fits() && fs > 9.5) { fs -= 0.25; mb.style.setProperty('--mfs', fs + 'px'); }
    if (fs < 13) console.warn(`MAP TOO FULL: font shrunk to ${fs}px (target ≥ 13px). Shorten the map boxes.`);
    if (!fits()) console.warn('MAP OVERFLOW: boxes do not fit even at minimum size.');
    // mini cells
    const mini = p.querySelector('.mini');
    let mf = 13.5;
    while ([...mini.querySelectorAll('.mc')].some(c => c.scrollHeight > c.clientHeight + 1) && mf > 10) { mf -= .25; mini.querySelectorAll('.mc').forEach(c => c.style.fontSize = mf + 'px'); }
    if (mf < 12) console.warn(`MINI EXERCISE TOO LONG: font shrunk to ${mf}px. Shorten the 5 mini items.`);
    const mh = p.querySelector('.mt'); const mhw = p.querySelector('.mh');
    let tf = 43; while (mh.scrollWidth > mhw.clientWidth - 330 && tf > 26) { tf -= 1; mh.style.fontSize = tf + 'px'; }
    if (tf < 32) console.warn(`MAP TITLE TOO LONG: shrunk to ${tf}px. Use a shorter title.`);
    // keep decorations clear of wide titles
    const plane = p.querySelector('.mh .plane');
    if (plane && mh.scrollWidth > mhw.clientWidth - 2 * plane.getBoundingClientRect().width - 2 * 36 * 3.78 + 40) {
      Object.assign(plane.style, { top: '13.5mm', right: '5mm', width: '24mm' });
      p.querySelectorAll('.mh .dd').forEach(d => { if (d.style.right === '8mm') d.style.display = 'none'; });
    }
  }
  function drawLinks(p) {
    const mb = p.querySelector('.mb');
    const svg = mb.querySelector('.links');
    const R = mb.getBoundingClientRect();
    const ov = mb.querySelector('.oval').getBoundingClientRect();
    const cx = ov.left + ov.width / 2 - R.left, cy = ov.top + ov.height / 2 - R.top, a = ov.width / 2, b = ov.height / 2;
    const colorOf = el => getComputedStyle(el).getPropertyValue('--c').trim() ? getComputedStyle(el).borderTopColor : '#888';
    let out = '';
    mb.querySelectorAll('.mbox').forEach(bx => {
      const r = bx.getBoundingClientRect();
      const side = bx.dataset.side;
      let ex, ey;
      if (side === 'l') { ex = r.right - R.left; ey = r.top - R.top + Math.min(r.height / 2, 14); }
      else if (side === 'r') { ex = r.left - R.left; ey = r.top - R.top + Math.min(r.height / 2, 14); }
      else { ex = r.left - R.left + r.width / 2; ey = r.top - R.top; }
      const dx = ex - cx, dy = ey - cy;
      const t = 1 / Math.sqrt((dx / a) ** 2 + (dy / b) ** 2);
      const sx = cx + dx * t, sy = cy + dy * t;
      const col = colorOf(bx);
      const d = side === 'c' ? `M${sx} ${sy} C ${sx} ${(sy + ey) / 2}, ${ex} ${(sy + ey) / 2}, ${ex} ${ey}` : `M${sx} ${sy} C ${(sx + ex) / 2} ${sy}, ${(sx + ex) / 2} ${ey}, ${ex} ${ey}`;
      out += `<path d="${d}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linecap="round"/><circle cx="${ex}" cy="${ey}" r="3.4" fill="#fff" stroke="${col}" stroke-width="2"/><circle cx="${sx}" cy="${sy}" r="2" fill="${col}"/>`;
    });
    svg.setAttribute('viewBox', `0 0 ${R.width} ${R.height}`);
    svg.innerHTML = out;
  }

  /* ---------- LEVEL BOOK (cover + index) ---------- */
  function buildBook() {
    const B = BOOK;
    const { sh } = shell('cover');
    sh.innerHTML = `<div class="book" style="width:46mm;margin-bottom:6mm">${SVG.book}</div>
      <h1>${B.title}</h1><div class="cs">${B.subtitle}</div>
      <div class="clv">Nivel ${B.level}</div>
      <div class="cd">${B.description || ''}</div>
      <div style="position:absolute;left:30mm;top:25mm;width:14mm">${SVG.star}</div>
      <div style="position:absolute;right:30mm;top:30mm;width:44mm">${SVG.plane}</div>
      <div style="position:absolute;right:40mm;bottom:30mm;width:12mm">${SVG.heart}</div>
      <div style="position:absolute;left:44mm;bottom:28mm;width:14mm">${SVG.sprig}</div>`;
    startSection('index');
    place({ wide: true, render: () => $('div', 'sect', `<span class="big">🗺️</span><div><h2>Índice <span class="en">· Contents</span></h2><div class="sub">Cada mapa tiene: mapa mental, explicación (español + inglés), ejercicios y solucionario.<br><i>Each map has: a mind map, explanation (Spanish + English), exercises and an answer key.</i></div></div>`) });
    const it = B.items;
    place({
      wide: true, n: Math.ceil(it.length / 2), min: 2, render: (s, e) => {
        const sl = it.slice(s * 2, e == null ? undefined : e * 2);
        return $('div', 'idx', sl.map((x, i) => `<div class="ii c-${CYCLE[(s * 2 + i) % 6]}"><span class="ic">${x.icon}</span><div class="tt">${x.title}<br><span class="en">${x.subtitle}</span></div><span class="pg">p. ${x.page}</span></div>`).join(''));
      }
    });
    place(Object.assign(EX.steps({ wide: true, color: 'orange', icon: '🧭', title: 'Cómo usar cada mapa', title_en: 'How to use each map', items: [
      { es: '<b>Mira el mapa</b> (1.ª página) y léelo en voz alta. Fíjate en el óvalo central: es la idea clave.', en: 'Look at the mind map and read it aloud. The centre has the key idea.' },
      { es: '<b>Lee la explicación</b>: primero 🇪🇸 en español, luego 🇬🇧 en inglés. Lee los ejemplos y su traducción.', en: 'Read the explanation, first in Spanish, then in English.' },
      { es: '<b>Haz el mini ejercicio</b> del mapa y después los <b>ejercicios</b>, a lápiz y con letra clara.', en: 'Do the mini exercise and then the exercises, in pencil.' },
      { es: '<b>Corrige</b> con el solucionario y colorea tus estrellas en la página de repaso.', en: 'Check with the answer key and colour your stars.' },
      { es: '<b>Repasa el mapa</b> una vez por semana: ¡pégalo en la pared o llévalo en la mochila!', en: 'Review the map once a week.' }
    ] }), {}));
    place({ wide: true, render: () => $('div', '', `<div style="font-size:11px;color:var(--muted);text-align:center">Ilustraciones emoji: Twemoji (CC-BY 4.0) · Fuentes: Shantell Sans, Patrick Hand, Caveat (SIL OFL)</div>`) });
  }

  /* ---------- BUILD ---------- */
  await Promise.all([
    document.fonts.load('15px "Patrick Hand"'), document.fonts.load('800 20px "Shantell"'), document.fonts.load('700 20px "Shantell"'), document.fonts.load('500 20px "Shantell"'),
    document.fonts.load('600 20px "Caveat"'), document.fonts.load('400 20px "Kalam"')
  ]);
  await document.fonts.ready;

  if (BOOK) {
    buildBook();
    document.querySelectorAll('.page.cover').forEach(emojify);
  } else {
    const mp = buildMap();
    emojify(mp);
    fitMap(mp);

    // explanation
    startSection('explain');
    cyc = 0;
    const exq = [Object.assign(EX.section({ icon: '📖', es: 'Explicación', en: 'Explanation', sub: D.explain_sub || 'Lee cada recuadro despacio. Primero en español, luego en inglés. <i>Read each box slowly: first in Spanish, then in English.</i>' }), { fixed: true })];
    for (const b of D.explain || []) {
      const f = EX[b.t]; if (!f) throw new Error('Unknown explain block: ' + b.t);
      exq.push(Object.assign(f(b), { ordered: b.t === 'rule' || /^\s*\d/.test(strip(b.title || '')) }));
    }
    flow(exq);
    { // sanity check: numbered blocks must appear in ascending order
      const nums = [...document.querySelectorAll('.page.flow .card-h .ttl')].map(t => (t.textContent.match(/^\s*(\d+)\s*[·.]/) || [])[1]).filter(Boolean).map(Number);
      for (let i = 1; i < nums.length; i++) if (nums[i] < nums[i - 1]) { console.warn('RULE ORDER: numbered block ' + nums[i] + ' appears after ' + nums[i - 1]); break; }
    }

    // exercises
    startSection('practice');
    const exs = (D.exercises || []).filter(x => x.t !== 'break');
    exs.forEach((x, i) => { x._color = x.color || EXCOL[i % EXCOL.length]; });
    flow([Object.assign(EX.section({ icon: '✏️', es: 'Ejercicios', en: 'Practice', sub: D.practice_sub || 'Escribe con lápiz y letra clara. Antes de escribir, piensa qué regla toca. <i>Write in pencil. Think about the rule first.</i>', name: true }), { fixed: true }), ...exs.map(x => exSpec(x))]);
    exs.sort((a, b) => a._num - b._num);

    // review
    startSection('review');
    place(EX.section({ icon: '🏆', es: '¿Lo he aprendido?', en: 'Can I do it?', sub: 'Marca cada frase cuando la sepas hacer y colorea las estrellas. <i>Tick each line when you can do it and colour the stars.</i>' }));
    const chk = D.checklist || [];
    place({ wide: false, render: () => { const c = card({ color: lvColor(), title: 'Lo sé hacer', en: 'I can…', icon: '✅' }); c.body.innerHTML = `<div class="chk">${chk.map(x => `<div class="chi"><span class="bx"></span><div><div>${x.es}</div><div class="en">🇬🇧 ${x.en}</div></div><span class="stars">☆☆☆</span></div>`).join('')}</div>`; return c; } });
    place({ wide: false, render: () => { const c = card({ color: 'yellow', title: 'Mi progreso', en: 'My progress', icon: '⭐' }); c.body.innerHTML = `<div style="margin-bottom:1.6mm;font-size:14px">Colorea 1, 2 o 3 estrellas en cada ejercicio. <i>Colour 1, 2 or 3 stars for each exercise.</i></div><div class="prog">${exs.map((x) => `<div class="pg">Ej. ${x._num}<span class="st">☆☆☆</span></div>`).join('')}</div>`; return c; } });
    if (D.final_tip) place(EX.tip(D.final_tip));

    // answer key
    startSection('key');
    place(EX.section({ icon: '🔑', es: 'Solucionario', en: 'Answer key', sub: 'Para el adulto que corrige (¡o para comprobar después de hacerlo!). <i>For the grown-up who checks, or to check after you finish.</i>' }));
    const mini = (D.map && D.map.mini) || { items: [] };
    place({ render: () => { const c = card({ color: 'purple', title: 'Mapa · Mini ejercicio', cls: 'ans' }); c.body.innerHTML = arr(mini.items).map((y, i) => `<span class="ai"><span class="n">${i + 1}.</span>${A(y.a)}</span>`).join(' '); return c; } });
    const keyq = [];
    exs.forEach(x => keyq.push(Object.assign(ansSpec(x), { fixed: true })));
    flow(keyq);
    const lastPf = [...document.querySelectorAll('.pf')].pop();
    if (lastPf) { const sp = lastPf.querySelector('span'); sp.insertAdjacentHTML('beforeend', ' · Emoji: Twemoji (CC-BY 4.0) · Fuentes: Shantell Sans, Patrick Hand, Caveat (SIL OFL) · Hecho con cariño para Mario 💚'); emojify(sp); }
  }

  if (F) balance(F.region);
  // page numbers
  const all = [...document.querySelectorAll('.page')];
  all.forEach((pg, i) => { const pn = pg.querySelector('.pn'); if (pn) pn.textContent = `${i + 1} / ${all.length}`; });
  await document.fonts.ready;
  await Promise.all([...document.images].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
  const broken = [...document.images].filter(im => !im.naturalWidth).map(im => im.src.split('/').pop());
  if (broken.length) console.warn('MISSING EMOJI: ' + [...new Set(broken)].join(', '));
  document.querySelectorAll('.page.map').forEach(drawLinks);
  window.__pages = all.length;
  window.__done = true;
})().catch(e => { window.__error = String(e && e.stack || e); window.__done = true; });
