// ==UserScript==
// @name         🌙 Smart Dark Mode — 三模式黑暗模式
// @namespace    https://github.com/smartdarkmode
// @version      6.0.0
// @description  原色／暗色／亮色三模式，只動純白純黑，有色元素圖片完全不碰，分網站記憶
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

  // ── 三種模式 ────────────────────────────────────────────────
  // 'off'   原色：完全不動
  // 'dark'  暗色：白底→黑底、黑字→白字（亮色網站用）
  // 'light' 亮色：黑底→白底、白字→黑字（暗色網站用）
  const MODES = ['off', 'dark', 'light'];
  const LABELS = { off: '原色', dark: '暗色', light: '亮色' };
  const ICONS  = { off: '🌐',  dark: '🌙',   light: '☀️'  };

  // ── 目標色 ──────────────────────────────────────────────────
  const TO_DARK_BG  = '#181818';
  const TO_DARK_TXT = '#e2e2e2';
  const TO_LITE_BG  = '#f2f2f2';
  const TO_LITE_TXT = '#111111';

  // ── 判斷：只動「幾乎純白」或「幾乎純黑」──────────────────
  // 同時需要：飽和度極低（灰階）+ 亮度極端（接近純白或純黑）
  // 閾值故意收窄，避免誤動有色/中灰元素
  const SAT_MAX   = 12;   // 飽和度 < 12 才算灰階（RGB差距 < 12/255）
  const WHITE_MIN = 235;  // luma > 235 才算「近白」
  const BLACK_MAX = 30;   // luma < 30  才算「近黑」

  function luma(r, g, b)       { return 0.299*r + 0.587*g + 0.114*b; }
  function sat(r, g, b)        { return Math.max(r,g,b) - Math.min(r,g,b); }

  function parseRGB(str) {
    if (!str) return null;
    const m = str.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)/);
    if (!m) return null;
    return { r:+m[1], g:+m[2], b:+m[3], a: m[4]!==undefined ? +m[4] : 1 };
  }

  const SKIP_TAGS = new Set([
    'IMG','VIDEO','CANVAS','PICTURE','IFRAME',
    'SCRIPT','STYLE','NOSCRIPT','BR','HR','LINK'
  ]);

  // ── 狀態 ────────────────────────────────────────────────────
  let mode;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    mode = MODES.includes(saved) ? saved : 'off';
  } catch { mode = 'off'; }

  const changedEls = new Set();

  // ── 單元素處理 ──────────────────────────────────────────────
  function processEl(el) {
    if (!(el instanceof HTMLElement)) return;
    if (SKIP_TAGS.has(el.tagName))   return;
    if (el.id === BTN_ID)            return;
    if (el._sdmDone === mode)        return;   // 同模式不重複處理
    el._sdmDone = mode;

    const cs = getComputedStyle(el);

    // ── 背景色 ──────────────────────────────────────────
    const bg = parseRGB(cs.backgroundColor);
    if (bg && bg.a > 0.05) {
      const s = sat(bg.r, bg.g, bg.b);
      const l = luma(bg.r, bg.g, bg.b);

      if (s < SAT_MAX) {
        if (mode === 'dark'  && l > WHITE_MIN) {
          el.style.setProperty('background-color', TO_DARK_BG, 'important');
          changedEls.add(el);
        }
        if (mode === 'light' && l < BLACK_MAX) {
          el.style.setProperty('background-color', TO_LITE_BG, 'important');
          changedEls.add(el);
        }
      }
    }

    // ── 文字色 ──────────────────────────────────────────
    const col = parseRGB(cs.color);
    if (col) {
      const s = sat(col.r, col.g, col.b);
      const l = luma(col.r, col.g, col.b);

      if (s < SAT_MAX) {
        if (mode === 'dark'  && l < BLACK_MAX) {
          el.style.setProperty('color', TO_DARK_TXT, 'important');
          changedEls.add(el);
        }
        if (mode === 'light' && l > WHITE_MIN) {
          el.style.setProperty('color', TO_LITE_TXT, 'important');
          changedEls.add(el);
        }
      }
    }
  }

  // ── 還原 ────────────────────────────────────────────────────
  function revertAll() {
    changedEls.forEach(el => {
      el.style.removeProperty('background-color');
      el.style.removeProperty('color');
      el._sdmDone = null;
    });
    changedEls.clear();
  }

  // ── 分批掃描 ────────────────────────────────────────────────
  function processAll() {
    const els = Array.from(document.querySelectorAll('*'));
    let i = 0;
    function chunk() {
      const end = Math.min(i + 400, els.length);
      for (; i < end; i++) processEl(els[i]);
      if (i < els.length) setTimeout(chunk, 0);
    }
    chunk();
  }

  // ── 基礎 CSS（html/body 快速鋪底，防閃白/閃黑） ──────────
  function applyBaseCSS() {
    removeBaseCSS();
    const s = document.createElement('style');
    s.id = STYLE_ID;
    if (mode === 'dark') {
      s.textContent = `
        html, body { background-color:${TO_DARK_BG}!important; color:${TO_DARK_TXT}!important; color-scheme:dark!important; }
        img,video,canvas,picture,svg,iframe { filter:none!important; }
      `;
    } else if (mode === 'light') {
      s.textContent = `
        html, body { background-color:${TO_LITE_BG}!important; color:${TO_LITE_TXT}!important; color-scheme:light!important; }
        img,video,canvas,picture,svg,iframe { filter:none!important; }
      `;
    }
    (document.head || document.documentElement).appendChild(s);
  }

  function removeBaseCSS() {
    document.getElementById(STYLE_ID)?.remove();
  }

  // ── 切換模式 ────────────────────────────────────────────────
  function setMode(m) {
    revertAll();            // 先還原上一個模式的所有改動
    mode = m;
    try { localStorage.setItem(STORAGE_KEY, m); } catch {}

    if (mode === 'off') {
      removeBaseCSS();
    } else {
      applyBaseCSS();
      processAll();
    }
    updateBtn();
  }

  function nextMode() {
    const idx = MODES.indexOf(mode);
    setMode(MODES[(idx + 1) % MODES.length]);
  }

  // ── 按鈕 ────────────────────────────────────────────────────
  function createBtn() {
    if (document.getElementById(BTN_ID)) return;

    const style = document.createElement('style');
    style.textContent = `
      #${BTN_ID} {
        position: fixed;
        right: 16px; bottom: 76px;
        z-index: 2147483647;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        width: 48px; height: 48px;
        border-radius: 24px;
        cursor: pointer;
        box-shadow: 0 2px 12px rgba(0,0,0,0.35);
        touch-action: manipulation;
        user-select: none; -webkit-user-select: none;
        transition: transform .15s;
        font-size: 11px; font-weight: bold; font-family: sans-serif;
        gap: 1px; line-height: 1.2;
        border: none;
      }
      #${BTN_ID}:active { transform: scale(0.87); }
      #${BTN_ID}.off   { background:#e8e8e8; color:#333; }
      #${BTN_ID}.dark  { background:#1e1e1e; color:#e0e0e0;
                         box-shadow:0 2px 12px rgba(0,0,0,0.6); }
      #${BTN_ID}.light { background:#ffffff; color:#222;
                         box-shadow:0 2px 12px rgba(0,0,0,0.2); }
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
      `<span style="font-size:16px">${ICONS[mode]}</span>` +
      `<span>${LABELS[mode]}</span>`;
    btn.title = `目前：${LABELS[mode]}，點擊切換`;
  }

  // ── MutationObserver ────────────────────────────────────────
  const observer = new MutationObserver(mutations => {
    if (mode === 'off') return;
    mutations.forEach(m => {
      m.addedNodes.forEach(n => {
        if (n instanceof HTMLElement) {
          processEl(n);
          n.querySelectorAll('*').forEach(processEl);
        }
      });
    });
  });

  // ── 初始化 ──────────────────────────────────────────────────
  function init() {
    if (mode !== 'off') {
      applyBaseCSS();
      processAll();
    }
    createBtn();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
