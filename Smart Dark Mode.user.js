// ==UserScript==
// @name         🌙 Smart Dark Mode — 三模式黑暗模式
// @namespace    https://github.com/smartdarkmode
// @version      7.0.0
// @description  原色／暗色／亮色，等比對應文字深淺，修正粗體模糊，分網站記憶
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
  const ICONS  = { off:'🌐',  dark:'🌙',   light:'☀️' };

  // ── 背景目標色 ──────────────────────────────────────────────
  const DARK_BG  = '#181818';
  const LITE_BG  = '#f2f2f2';

  // ── 顏色工具 ────────────────────────────────────────────────
  function luma(r, g, b) { return 0.299*r + 0.587*g + 0.114*b; }
  function sat(r, g, b)  { return Math.max(r,g,b) - Math.min(r,g,b); }

  function parseRGB(str) {
    if (!str) return null;
    const m = str.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)/);
    if (!m) return null;
    return { r:+m[1], g:+m[2], b:+m[3], a: m[4]!==undefined ? +m[4] : 1 };
  }

  function toHex(v) { return v.toString(16).padStart(2,'0'); }
  function rgb2hex(r,g,b) { return '#'+toHex(r)+toHex(g)+toHex(b); }

  // ── 等比文字顏色對應 ─────────────────────────────────────────
  // 暗色模式：把深灰系文字「等比」映射到亮色
  //   原始黑(0)   → 極亮(228)
  //   原始深灰(80) → 中亮(180)
  //   原始中灰(140)→ 偏亮(140) ← 接近中間，不動
  //   > 160       → 不動（已經夠亮，在暗背景上 OK）
  //
  // 亮色模式反向相同邏輯。
  function mapDarkText(origLuma) {
    // origLuma: 0~255，輸入深色文字的亮度
    if (origLuma > 160) return null;          // 已夠亮，不動
    // 線性映射 [0→160] → [228→128]：越深的字映射到越亮
    const mapped = Math.round(228 - (origLuma / 160) * 100);
    return rgb2hex(mapped, mapped, mapped);
  }

  function mapLightText(origLuma) {
    // origLuma: 0~255，輸入淺色文字的亮度
    if (origLuma < 100) return null;          // 已夠暗，不動
    // 線性映射 [100→255] → [100→20]
    const mapped = Math.round(100 - ((origLuma - 100) / 155) * 80);
    return rgb2hex(mapped, mapped, mapped);
  }

  // ── 飽和度閾值（灰階判斷） ──────────────────────────────────
  // 文字稍寬鬆（SAT_TXT），有些設計用「帶一點藍調的深灰」做正文
  const SAT_BG  = 10;    // 背景：極嚴，只動純灰白黑底
  const SAT_TXT = 18;    // 文字：稍寬，捕捉帶微微色調的深灰字

  // 背景閾值
  const WHITE_MIN = 235; // luma > 235 才算「近白」底
  const BLACK_MAX = 25;  // luma < 25  才算「近黑」底

  // ── 跳過清單 ────────────────────────────────────────────────
  const SKIP = new Set([
    'IMG','VIDEO','CANVAS','PICTURE','IFRAME',
    'SCRIPT','STYLE','NOSCRIPT','BR','HR','LINK'
  ]);

  // ── 狀態 ────────────────────────────────────────────────────
  let mode;
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    mode = MODES.includes(s) ? s : 'off';
  } catch { mode = 'off'; }

  // 記錄每個元素改了什麼，方便精準還原
  // Map<element, { props: string[] }>
  const changed = new Map();

  // ── 單元素處理（Read-then-Write 避免 layout thrashing） ───
  function collectChanges(el) {
    if (!(el instanceof HTMLElement)) return null;
    if (SKIP.has(el.tagName))         return null;
    if (el.id === BTN_ID)             return null;
    if (el._sdmMode === mode)         return null;

    const cs  = getComputedStyle(el);
    const out = [];   // [{ prop, value }]

    // ── 背景色 ──
    const bg = parseRGB(cs.backgroundColor);
    if (bg && bg.a > 0.05 && sat(bg.r,bg.g,bg.b) < SAT_BG) {
      const l = luma(bg.r,bg.g,bg.b);
      if (mode === 'dark'  && l > WHITE_MIN) out.push({ prop:'background-color', val:DARK_BG });
      if (mode === 'light' && l < BLACK_MAX) out.push({ prop:'background-color', val:LITE_BG });
    }

    // ── 文字色 ──
    const col = parseRGB(cs.color);
    if (col && sat(col.r,col.g,col.b) < SAT_TXT) {
      const l = luma(col.r,col.g,col.b);
      let mapped = null;
      if (mode === 'dark')  mapped = mapDarkText(l);
      if (mode === 'light') mapped = mapLightText(l);
      if (mapped) out.push({ prop:'color', val:mapped });
    }

    return out.length ? { el, out } : null;
  }

  // ── 分批掃描：先讀再寫 ──────────────────────────────────────
  function processAll() {
    const els = Array.from(document.querySelectorAll('*'));
    let i = 0;

    function chunk() {
      const end = Math.min(i + 400, els.length);
      const writes = [];

      // 讀取階段
      for (; i < end; i++) {
        const r = collectChanges(els[i]);
        if (r) writes.push(r);
      }

      // 寫入階段（批量，減少 reflow）
      writes.forEach(({ el, out }) => {
        el._sdmMode = mode;
        out.forEach(({ prop, val }) => {
          el.style.setProperty(prop, val, 'important');
        });
        changed.set(el, out.map(o => o.prop));
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

  // ── 基礎 CSS ────────────────────────────────────────────────
  // color-scheme 移除：在某些 iOS 版本下會影響字體渲染
  // -webkit-font-smoothing: antialiased 修正淺色字在深底的模糊問題
  function applyBaseCSS() {
    removeBaseCSS();
    const s = document.createElement('style');
    s.id = STYLE_ID;
    if (mode === 'dark') {
      s.textContent = `
        html,body {
          background-color: ${DARK_BG} !important;
          color: #e2e2e2 !important;
        }
        /* 修正 WebKit subpixel 渲染切換導致的粗體模糊 */
        * {
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
        }
        /* 絕對不動圖片、影片、iframe */
        img,video,canvas,picture,svg,iframe { filter:none!important; }
      `;
    } else if (mode === 'light') {
      s.textContent = `
        html,body {
          background-color: ${LITE_BG} !important;
          color: #111 !important;
        }
        img,video,canvas,picture,svg,iframe { filter:none!important; }
      `;
    }
    (document.head || document.documentElement).appendChild(s);
  }

  function removeBaseCSS() { document.getElementById(STYLE_ID)?.remove(); }

  // ── 切換 ────────────────────────────────────────────────────
  function setMode(m) {
    revertAll();
    mode = m;
    try { localStorage.setItem(STORAGE_KEY, m); } catch {}
    if (mode === 'off') { removeBaseCSS(); }
    else { applyBaseCSS(); processAll(); }
    updateBtn();
  }

  function nextMode() { setMode(MODES[(MODES.indexOf(mode)+1) % MODES.length]); }

  // ── 按鈕 ────────────────────────────────────────────────────
  function createBtn() {
    if (document.getElementById(BTN_ID)) return;

    const style = document.createElement('style');
    style.textContent = `
      #${BTN_ID} {
        position:fixed; right:16px; bottom:76px;
        z-index:2147483647;
        width:48px; height:48px; border-radius:24px;
        display:flex; flex-direction:column;
        align-items:center; justify-content:center; gap:1px;
        cursor:pointer; border:none;
        font-size:11px; font-weight:bold; font-family:sans-serif;
        line-height:1.2;
        box-shadow:0 2px 12px rgba(0,0,0,0.35);
        touch-action:manipulation;
        user-select:none; -webkit-user-select:none;
        transition:transform .15s;
        /* 按鈕本身不受 font-smoothing 覆蓋影響，保持清晰 */
        -webkit-font-smoothing: auto !important;
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
    btn.innerHTML =
      `<span style="font-size:16px;line-height:1">${ICONS[mode]}</span>` +
      `<span>${LABELS[mode]}</span>`;
  }

  // ── MutationObserver ────────────────────────────────────────
  const observer = new MutationObserver(mutations => {
    if (mode === 'off') return;
    const toProcess = [];
    mutations.forEach(m => {
      m.addedNodes.forEach(n => {
        if (n instanceof HTMLElement) {
          toProcess.push(n, ...n.querySelectorAll('*'));
        }
      });
    });
    if (!toProcess.length) return;
    const writes = toProcess.map(collectChanges).filter(Boolean);
    writes.forEach(({ el, out }) => {
      el._sdmMode = mode;
      out.forEach(({ prop, val }) => el.style.setProperty(prop, val, 'important'));
      changed.set(el, out.map(o => o.prop));
    });
  });

  // ── 初始化 ──────────────────────────────────────────────────
  function init() {
    if (mode !== 'off') { applyBaseCSS(); processAll(); }
    createBtn();
    observer.observe(document.body, { childList:true, subtree:true });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

})();
