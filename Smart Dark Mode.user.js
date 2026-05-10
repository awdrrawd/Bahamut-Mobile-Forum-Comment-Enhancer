// ==UserScript==
// @name         🌙 Smart Dark Mode — 三模式黑暗模式
// @namespace    https://github.com/smartdarkmode
// @version      8.0.0
// @description  原色/暗色/亮色，背景文字成對處理保留對比度，灰底元素完全不動
// @author       You
// @match        *://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  const BTN_ID      = '__sdm_btn__';
  const STYLE_ID    = '__sdm_base__';
  const STORAGE_KEY = 'sdm_mode_' + location.hostname;

  const MODES  = ['off', 'dark', 'light'];
  const LABELS = { off:'原色', dark:'暗色', light:'亮色' };
  const ICONS  = { off:'🌐',  dark:'🌙',  light:'☀️' };

  const DARK_BG  = '#181818';
  const LITE_BG  = '#f0f0f0';

  // ── 顏色工具 ──────────────────────────────────────────────
  const luma = (r,g,b) => 0.299*r + 0.587*g + 0.114*b;
  const sat  = (r,g,b) => Math.max(r,g,b) - Math.min(r,g,b);
  const hex2 = v => v.toString(16).padStart(2,'0');
  const gray = v => { const n=Math.round(v); return '#'+hex2(n)+hex2(n)+hex2(n); };

  function parseRGB(str) {
    if (!str) return null;
    const m = str.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)/);
    if (!m) return null;
    return { r:+m[1], g:+m[2], b:+m[3], a: m[4]!==undefined ? +m[4] : 1 };
  }

  // ── 找元素向上最近的非透明背景 ───────────────────────────
  // 只往上走最多 8 層，快速找出「視覺上坐落在哪種背景」
  function effectiveBgLuma(el) {
    let cur = el;
    for (let i = 0; i < 8; i++) {
      if (!cur || cur === document.documentElement) break;
      const bg = parseRGB(getComputedStyle(cur).backgroundColor);
      if (bg && bg.a > 0.1) return luma(bg.r, bg.g, bg.b);
      cur = cur.parentElement;
    }
    return 255; // fallback：假設白底（大多數亮色網站的預設）
  }

  // ── 判斷「這個背景要被我們改嗎」 ─────────────────────────
  // 只動幾乎純白(暗色模式)或幾乎純黑(亮色模式)
  const BG_SAT_MAX   = 10;   // 飽和度極低才算灰階背景
  const WHITE_LUMA   = 238;  // luma > 238 才算「近白」底
  const BLACK_LUMA   = 22;   // luma < 22  才算「近黑」底

  function bgWillBeDarkened(l, s) { return s < BG_SAT_MAX && l > WHITE_LUMA; }
  function bgWillBeLightened(l, s) { return s < BG_SAT_MAX && l < BLACK_LUMA; }

  // ── 文字目標亮度（只在背景同時被改時才呼叫）────────────────
  // darkMode: 背景變暗 → 文字需要夠亮，但不過亮（最高 185）
  // 只改真正太深（在新暗底上對比 < 4:1）的文字
  //   #181818 的 relative luma ≈ 0.008
  //   contrast 4:1 → text relative luma ≥ 4*(0.008+0.05)-0.05 ≈ 0.182 → luma ≈ 114/255
  const DARK_BG_LUMA = 24;   // luma of #181818
  const LITE_BG_LUMA = 240;  // luma of #f0f0f0

  function textTargetForDarkBg(origLuma) {
    // origLuma 0~113 → too dark for dark bg → map to 170~185
    if (origLuma > 113) return null;           // already readable, skip
    // 越深的字映射越亮，但上限 185（不刺眼）
    const t = Math.round(185 - (origLuma / 113) * 15);
    return gray(t);
  }

  function textTargetForLiteBg(origLuma) {
    // luma > 142 → too light for light bg → map to 40~60
    if (origLuma < 142) return null;
    const t = Math.round(60 - ((origLuma - 142) / 113) * 20);
    return gray(t);
  }

  // ── 跳過標籤 ──────────────────────────────────────────────
  const SKIP = new Set([
    'IMG','VIDEO','CANVAS','PICTURE','IFRAME',
    'SCRIPT','STYLE','NOSCRIPT','BR','HR','LINK'
  ]);

  // ── 狀態 ──────────────────────────────────────────────────
  let mode;
  try { const s = localStorage.getItem(STORAGE_KEY); mode = MODES.includes(s) ? s : 'off'; }
  catch { mode = 'off'; }

  const changed = new Map(); // el → ['background-color', 'color', ...]

  // ── 核心：單元素決策 ──────────────────────────────────────
  // ★ 關鍵改動：文字和背景「成對決策」
  //   文字是否要改，取決於「這個元素視覺上坐落的背景是否也被改了」
  //   → 灰底元素的文字完全不動，保留設計者的對比關係
  function collectChanges(el) {
    if (!(el instanceof HTMLElement)) return null;
    if (SKIP.has(el.tagName))         return null;
    if (el.id === BTN_ID)             return null;
    if (el._sdmMode === mode)         return null;

    const cs  = getComputedStyle(el);
    const bg  = parseRGB(cs.backgroundColor);
    const col = parseRGB(cs.color);

    const bgOwn        = bg && bg.a > 0.1;  // 元素本身有背景色
    const bgOwnLuma    = bgOwn ? luma(bg.r, bg.g, bg.b) : null;
    const bgOwnSat     = bgOwn ? sat(bg.r, bg.g, bg.b)  : null;

    const writes = [];

    if (mode === 'dark') {

      // ── 1. 背景：只動「幾乎純白」底 ──
      const changingBg = bgOwn && bgWillBeDarkened(bgOwnLuma, bgOwnSat);
      if (changingBg) writes.push({ prop:'background-color', val:DARK_BG });

      // ── 2. 文字：只在「視覺背景被改」時才動 ──
      //   a) 元素本身有白底被我們改 → 直接用新暗底判斷
      //   b) 元素本身透明 → 向上查找實際背景亮度，若那個背景是近白 → 也要改
      //   c) 元素本身是灰底（不被我們改）→ 絕對不動文字
      if (col && sat(col.r,col.g,col.b) < 18) {
        const colLumaVal = luma(col.r, col.g, col.b);
        let bgForText;   // 這個文字「視覺上」坐落的新背景亮度

        if (changingBg) {
          bgForText = DARK_BG_LUMA;             // 我們把這元素的底改暗了
        } else if (!bgOwn) {
          // 透明：向上找實際底色的 luma
          const parentBgLuma = effectiveBgLuma(el.parentElement);
          if (bgWillBeDarkened(parentBgLuma, 0)) {
            bgForText = DARK_BG_LUMA;           // 祖先白底被改了
          }
          // 若祖先是灰底或暗底 → bgForText 不設 → 不動文字
        }
        // 若 bgOwn 且不是白底（是灰底）→ bgForText 不設 → 不動文字

        if (bgForText !== undefined) {
          const target = textTargetForDarkBg(colLumaVal);
          if (target) writes.push({ prop:'color', val:target });
        }
      }

    } else if (mode === 'light') {

      const changingBg = bgOwn && bgWillBeLightened(bgOwnLuma, bgOwnSat);
      if (changingBg) writes.push({ prop:'background-color', val:LITE_BG });

      if (col && sat(col.r,col.g,col.b) < 18) {
        const colLumaVal = luma(col.r, col.g, col.b);
        let bgForText;

        if (changingBg) {
          bgForText = LITE_BG_LUMA;
        } else if (!bgOwn) {
          const parentBgLuma = effectiveBgLuma(el.parentElement);
          if (bgWillBeLightened(parentBgLuma, 0)) bgForText = LITE_BG_LUMA;
        }

        if (bgForText !== undefined) {
          const target = textTargetForLiteBg(colLumaVal);
          if (target) writes.push({ prop:'color', val:target });
        }
      }
    }

    return writes.length ? { el, writes } : null;
  }

  // ── 分批掃描 ──────────────────────────────────────────────
  function processAll() {
    const els = Array.from(document.querySelectorAll('*'));
    let i = 0;
    function chunk() {
      const end = Math.min(i + 400, els.length);
      const batch = [];
      for (; i < end; i++) { const r = collectChanges(els[i]); if (r) batch.push(r); }
      batch.forEach(({ el, writes }) => {
        el._sdmMode = mode;
        writes.forEach(({ prop, val }) => el.style.setProperty(prop, val, 'important'));
        changed.set(el, writes.map(w => w.prop));
      });
      if (i < els.length) setTimeout(chunk, 0);
    }
    chunk();
  }

  function revertAll() {
    changed.forEach((props, el) => {
      props.forEach(p => el.style.removeProperty(p));
      el._sdmMode = null;
    });
    changed.clear();
  }

  // ── 基礎 CSS ──────────────────────────────────────────────
  function applyBaseCSS() {
    removeBaseCSS();
    const s = document.createElement('style');
    s.id = STYLE_ID;
    if (mode === 'dark') {
      s.textContent = `
        html,body { background-color:${DARK_BG}!important; color:#d8d8d8!important; }
        * { -webkit-font-smoothing:antialiased!important; -moz-osx-font-smoothing:grayscale!important; }
        #${BTN_ID} { -webkit-font-smoothing:auto!important; }
        img,video,canvas,picture,svg,iframe { filter:none!important; }
      `;
    } else if (mode === 'light') {
      s.textContent = `
        html,body { background-color:${LITE_BG}!important; color:#181818!important; }
        img,video,canvas,picture,svg,iframe { filter:none!important; }
      `;
    }
    (document.head || document.documentElement).appendChild(s);
  }
  function removeBaseCSS() { document.getElementById(STYLE_ID)?.remove(); }

  // ── 切換 ──────────────────────────────────────────────────
  function setMode(m) {
    revertAll();
    mode = m;
    try { localStorage.setItem(STORAGE_KEY, m); } catch {}
    mode === 'off' ? removeBaseCSS() : (applyBaseCSS(), processAll());
    updateBtn();
  }
  function nextMode() { setMode(MODES[(MODES.indexOf(mode)+1) % MODES.length]); }

  // ── 按鈕 ──────────────────────────────────────────────────
  function createBtn() {
    if (document.getElementById(BTN_ID)) return;
    const style = document.createElement('style');
    style.textContent = `
      #${BTN_ID} {
        position:fixed; right:16px; bottom:76px; z-index:2147483647;
        width:48px; height:48px; border-radius:24px; border:none;
        display:flex; flex-direction:column; align-items:center;
        justify-content:center; gap:1px; cursor:pointer;
        font-size:11px; font-weight:bold; font-family:sans-serif; line-height:1.2;
        box-shadow:0 2px 12px rgba(0,0,0,0.35);
        touch-action:manipulation; user-select:none; -webkit-user-select:none;
        transition:transform .15s; -webkit-font-smoothing:auto!important;
      }
      #${BTN_ID}:active { transform:scale(0.87); }
      #${BTN_ID}.off   { background:#e8e8e8; color:#333; }
      #${BTN_ID}.dark  { background:#1e1e1e; color:#e0e0e0; }
      #${BTN_ID}.light { background:#ffffff; color:#222; }
    `;
    (document.head || document.documentElement).appendChild(style);
    const btn = document.createElement('div');
    btn.id = BTN_ID;
    btn.addEventListener('click', nextMode);
    document.body.appendChild(btn);
    updateBtn();
  }

  function updateBtn() {
    const btn = document.getElementById(BTN_ID);
    if (!btn) return;
    btn.className = mode;
    btn.innerHTML = `<span style="font-size:16px;line-height:1">${ICONS[mode]}</span><span>${LABELS[mode]}</span>`;
  }

  // ── MutationObserver ──────────────────────────────────────
  const observer = new MutationObserver(mutations => {
    if (mode === 'off') return;
    const batch = [];
    mutations.forEach(m => m.addedNodes.forEach(n => {
      if (!(n instanceof HTMLElement)) return;
      [n, ...n.querySelectorAll('*')].forEach(el => {
        const r = collectChanges(el); if (r) batch.push(r);
      });
    }));
    batch.forEach(({ el, writes }) => {
      el._sdmMode = mode;
      writes.forEach(({ prop, val }) => el.style.setProperty(prop, val, 'important'));
      changed.set(el, writes.map(w => w.prop));
    });
  });

  // ── 初始化 ────────────────────────────────────────────────
  function init() {
    if (mode !== 'off') { applyBaseCSS(); processAll(); }
    createBtn();
    observer.observe(document.body, { childList:true, subtree:true });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

})();
