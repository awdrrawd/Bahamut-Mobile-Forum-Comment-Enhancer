// ==UserScript==
// @name         🌙 Smart Dark Mode — 智慧黑暗模式
// @namespace    https://github.com/smartdarkmode
// @version      2.0.0
// @description  為所有網站加上黑暗模式，修正 iOS Safari position:fixed 被 filter 破壞的問題
// @author       You
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const STYLE_ID    = '__sdm_style__';
  const BTN_ID      = '__sdm_btn__';
  const STORAGE_KEY = 'dark_mode_' + location.hostname;

  // ── 關鍵修正：filter 套在 body，不套 html ──────────────────
  //
  //  舊寫法（bug）：html { filter: invert(1) }
  //    → html 內所有 position:fixed 全部失效（iOS Safari 已知問題）
  //
  //  新寫法（正確）：body { filter: invert(1) }
  //    → 按鈕插在 <html> 層（body 的兄弟），完全不受 filter 影響
  //    → position:fixed 在 iOS Safari 正常運作
  //
  const DARK_CSS = `
    body {
      filter: invert(1) hue-rotate(180deg) !important;
      background-color: #111 !important;
    }
    img, video, iframe, canvas, picture, svg image,
    [style*="background-image"], .no-invert {
      filter: invert(1) hue-rotate(180deg) !important;
    }
    * { scrollbar-color: #555 #222; }
    html { background-color: #111 !important; }
  `;

  const BTN_CSS = `
    #__sdm_btn__ {
      position: fixed;
      right: 20px;
      bottom: 80px;
      width: 46px;
      height: 46px;
      border-radius: 50%;
      cursor: pointer;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.45);
      transition: transform 0.18s;
      user-select: none;
      -webkit-user-select: none;
      touch-action: manipulation;
    }
    #__sdm_btn__:active { transform: scale(0.9); }
    #__sdm_btn__.dark  { background: #1e1e2e; }
    #__sdm_btn__.light { background: #f0f0f0; }
  `;

  // ── 狀態 ───────────────────────────────────────────────────
  let isDark;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    isDark = saved === null ? true : saved === 'true';
  } catch {
    isDark = true;
  }

  // ── 樣式注入 ───────────────────────────────────────────────
  function applyDark() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = DARK_CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  function removeDark() {
    document.getElementById(STYLE_ID)?.remove();
  }

  function setMode(dark) {
    isDark = dark;
    try { localStorage.setItem(STORAGE_KEY, String(dark)); } catch {}
    dark ? applyDark() : removeDark();
    updateBtn();
  }

  // ── 按鈕（插在 <html>，是 <body> 的兄弟，不受 filter 影響）──
  function createBtn() {
    if (document.getElementById(BTN_ID)) return;

    // 注入按鈕的 CSS（獨立於 dark mode style）
    const bs = document.createElement('style');
    bs.textContent = BTN_CSS;
    document.documentElement.appendChild(bs);

    const btn = document.createElement('div');
    btn.id = BTN_ID;
    btn.addEventListener('click', () => setMode(!isDark));

    // ★ 核心：insertBefore(btn, body) 讓按鈕成為 html 的直接子元素
    //         body 的 filter 影響不到它，iOS fixed 完全正常
    document.documentElement.insertBefore(btn, document.body);

    updateBtn();
  }

  function updateBtn() {
    const btn = document.getElementById(BTN_ID);
    if (!btn) return;
    if (isDark) {
      btn.textContent = '☀️';
      btn.className = 'dark';
      btn.title = '黑暗模式 ON';
    } else {
      btn.textContent = '🌙';
      btn.className = 'light';
      btn.title = '黑暗模式 OFF';
    }
  }

  // ── MutationObserver：動態背景圖處理 ─────────────────────
  function fixBg(node) {
    if (!(node instanceof Element)) return;
    if (node.style?.backgroundImage && node.style.backgroundImage !== 'none') {
      node.style.setProperty('filter', 'invert(1) hue-rotate(180deg)', 'important');
    }
    node.querySelectorAll?.('[style*="background-image"]').forEach(el => {
      el.style.setProperty('filter', 'invert(1) hue-rotate(180deg)', 'important');
    });
  }

  const observer = new MutationObserver(mutations => {
    if (!isDark) return;
    mutations.forEach(m => {
      m.addedNodes.forEach(fixBg);
      if (m.type === 'attributes' && m.attributeName === 'style') fixBg(m.target);
    });
  });

  // ── 初始化 ────────────────────────────────────────────────
  if (isDark) applyDark();

  function init() {
    createBtn();
    observer.observe(document.documentElement, {
      childList: true, subtree: true,
      attributes: true, attributeFilter: ['style'],
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
