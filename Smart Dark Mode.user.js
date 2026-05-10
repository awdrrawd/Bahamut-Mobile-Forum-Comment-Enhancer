// ==UserScript==
// @name         🌙 Smart Dark Mode — 智慧黑暗模式
// @namespace    https://github.com/smartdarkmode
// @version      5.0.0
// @description  只把灰階系的白底/黑字對調，有色元素和圖片完全不動
// @author       You
// @match        *://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  const BTN_ID      = '__sdm_btn__';
  const STYLE_ID    = '__sdm_base__';
  const STORAGE_KEY = 'dark_mode_' + location.hostname;

  // ── 目標色 ──────────────────────────────────────────────────
  const DARK_BG   = '#1a1a1a';   // 白底 → 換成這個
  const DARK_BG2  = '#252525';   // 淺灰底 → 換成這個
  const LIGHT_TXT = '#e0e0e0';   // 黑字 → 換成這個

  // ── 判斷函式 ────────────────────────────────────────────────
  function luma(r, g, b)       { return 0.299*r + 0.587*g + 0.114*b; }
  function saturation(r, g, b) { return Math.max(r,g,b) - Math.min(r,g,b); }

  function parseRGB(str) {
    if (!str) return null;
    const m = str.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)/);
    if (!m) return null;
    return { r:+m[1], g:+m[2], b:+m[3], a: m[4]!==undefined ? +m[4] : 1 };
  }

  // 跳過這些標籤（圖片、影片完全不動）
  const SKIP = new Set(['IMG','VIDEO','CANVAS','PICTURE','SVG','IFRAME',
                        'SCRIPT','STYLE','NOSCRIPT','BR','HR']);

  // ── 狀態 ────────────────────────────────────────────────────
  let isDark;
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    isDark = s === null ? true : s === 'true';
  } catch { isDark = true; }

  // 追蹤被我們改過的元素，方便還原
  const changedEls = new Set();

  // ── 單元素處理 ──────────────────────────────────────────────
  function processEl(el) {
    if (!(el instanceof HTMLElement)) return;
    if (SKIP.has(el.tagName))        return;
    if (el.id === BTN_ID)            return;
    if (el._sdmDone)                 return;
    el._sdmDone = true;

    const cs = getComputedStyle(el);

    // ── 背景色 ──
    const bg = parseRGB(cs.backgroundColor);
    if (bg && bg.a > 0.05) {
      const sat = saturation(bg.r, bg.g, bg.b);
      const lum = luma(bg.r, bg.g, bg.b);

      if (sat < 20) {                     // 灰階系才動
        if (lum > 210) {                  // 白/近白 → 深底
          el.style.setProperty('background-color', DARK_BG, 'important');
          changedEls.add(el);
        } else if (lum > 160) {           // 淺灰 → 稍暗
          el.style.setProperty('background-color', DARK_BG2, 'important');
          changedEls.add(el);
        }
      }
    }

    // ── 文字色 ──
    const col = parseRGB(cs.color);
    if (col) {
      const sat = saturation(col.r, col.g, col.b);
      const lum = luma(col.r, col.g, col.b);

      if (sat < 30 && lum < 80) {        // 黑/深灰字 → 亮字
        el.style.setProperty('color', LIGHT_TXT, 'important');
        changedEls.add(el);
      }
    }

    // ── 邊框色（選用，可關閉） ──
    const border = parseRGB(cs.borderColor);
    if (border && border.a > 0.05) {
      const sat = saturation(border.r, border.g, border.b);
      const lum = luma(border.r, border.g, border.b);
      if (sat < 20 && lum > 180) {
        el.style.setProperty('border-color', '#444', 'important');
        changedEls.add(el);
      }
    }
  }

  // ── 批量處理（分批避免卡頓） ────────────────────────────────
  function processAll() {
    const els = Array.from(document.querySelectorAll('*'));
    let i = 0;
    function chunk() {
      const end = Math.min(i + 500, els.length);
      for (; i < end; i++) processEl(els[i]);
      if (i < els.length) setTimeout(chunk, 0);
    }
    chunk();
  }

  // ── 還原（關閉時） ──────────────────────────────────────────
  function revertAll() {
    changedEls.forEach(el => {
      el.style.removeProperty('background-color');
      el.style.removeProperty('color');
      el.style.removeProperty('border-color');
      el._sdmDone = false;   // 允許重新掃描
    });
    changedEls.clear();
  }

  // ── 基礎 CSS（html/body 層，快速防閃白） ────────────────────
  function applyBaseCSS() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      html, body {
        background-color: ${DARK_BG} !important;
        color: ${LIGHT_TXT} !important;
        color-scheme: dark !important;   /* 讓瀏覽器原生 UI 也用暗色 */
      }
      /* 絕對不碰圖片 */
      img, video, canvas, picture, svg { filter: none !important; }
    `;
    (document.head || document.documentElement).appendChild(s);
  }

  function removeBaseCSS() {
    document.getElementById(STYLE_ID)?.remove();
  }

  // ── 開關 ────────────────────────────────────────────────────
  function setMode(dark) {
    isDark = dark;
    try { localStorage.setItem(STORAGE_KEY, String(dark)); } catch {}

    if (dark) {
      applyBaseCSS();
      processAll();
    } else {
      removeBaseCSS();
      revertAll();
    }
    updateBtn();
  }

  // ── 按鈕 ────────────────────────────────────────────────────
  // 不用任何 filter/blend-mode，position:fixed 完全正常
  function createBtn() {
    if (document.getElementById(BTN_ID)) return;

    const style = document.createElement('style');
    style.textContent = `
      #${BTN_ID} {
        position: fixed;
        right: 20px;
        bottom: 80px;
        width: 44px; height: 44px;
        border-radius: 50%;
        z-index: 2147483647;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.4);
        cursor: pointer;
        touch-action: manipulation;
        user-select: none; -webkit-user-select: none;
        transition: transform .15s;
        border: 1.5px solid rgba(255,255,255,0.15);
      }
      #${BTN_ID}:active { transform: scale(0.88); }
      #${BTN_ID}.on  { background: #2a2a2a; color: #fff; }
      #${BTN_ID}.off { background: #f0f0f0; color: #111; }
    `;
    (document.head || document.documentElement).appendChild(style);

    const btn = document.createElement('div');
    btn.id = BTN_ID;
    btn.addEventListener('click', () => setMode(!isDark));
    document.body.appendChild(btn);
    updateBtn();
  }

  function updateBtn() {
    const btn = document.getElementById(BTN_ID);
    if (!btn) return;
    btn.textContent = isDark ? '☀️' : '🌙';
    btn.className   = isDark ? 'on' : 'off';
    btn.title       = isDark ? '黑暗模式 ON — 點擊關閉' : '黑暗模式 OFF — 點擊開啟';
  }

  // ── MutationObserver：動態新增的元素也補掃 ─────────────────
  const observer = new MutationObserver(mutations => {
    if (!isDark) return;
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
    if (isDark) {
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
