// ==UserScript==
// @name         🌙 Smart Dark Mode — 智慧黑暗模式
// @namespace    https://github.com/smartdarkmode
// @version      4.0.0
// @description  mix-blend-mode 實現黑暗模式：不卡頓、fixed 元素正常、圖片原色保留
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

  // ── 核心原理 v4 ──────────────────────────────────────────────
  //
  //  問題回顧：
  //   v1  html { filter }         → fixed 全壞（含我們的按鈕）
  //   v2  body { filter }         → 按鈕 OK，但網站 fixed header/nav 壞
  //   v3  backdrop-filter overlay → fixed 全 OK，但 GPU 極重 → 卡頓
  //
  //  v4 方案：mix-blend-mode: difference
  //   • difference(白色, 頁面顏色) = |白-頁面| = 反色  → 實現黑暗模式
  //   • mix-blend-mode 不建立 containing block        → fixed 完全正常
  //   • 只是「合成模式」不是逐幀像素處理              → 效能輕量
  //   • 圖片預先 filter: invert(1)，overlay 再反色    → 數學完全抵銷 → 原色
  //
  //  差異（vs backdrop-filter）：
  //   mix-blend-mode 不支援 hue-rotate，所以有色物件（藍→黃、紅→青）
  //   對大部分網站（以黑白文字為主）影響不大，圖片顏色完全正確。
  //

  const DARK_CSS = `
    /* 白色疊加層 + difference 混合 = 反色整個畫面 */
    html::before {
      content: '';
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: #ffffff;
      mix-blend-mode: difference;
      pointer-events: none;
      z-index: 2147483640;
    }

    /* 圖片預先 invert(1)：
       difference(白, invert(原色)) = |1-(1-原色)| = 原色  ← 數學精準還原 */
    img,
    video,
    canvas,
    picture,
    svg image {
      filter: invert(1) !important;
    }

    /* 防止頁面載入瞬間白色閃爍 */
    html { background: #000 !important; }
  `;

  // 按鈕 CSS
  // v4 起不需要任何 filter：按鈕 z-index 高於 overlay，不受 mix-blend-mode 影響
  const BTN_CSS = `
    #${BTN_ID} {
      position: fixed;           /* fixed 正常！沒有任何祖先 filter */
      right: 20px;
      bottom: 80px;
      width: 46px;
      height: 46px;
      border-radius: 50%;
      cursor: pointer;
      z-index: 2147483647;       /* 高於 overlay → 不被反色 */
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      box-shadow: 0 2px 14px rgba(0,0,0,0.35);
      transition: transform 0.15s;
      user-select: none;
      -webkit-user-select: none;
      touch-action: manipulation;
      border: none;
    }
    #${BTN_ID}:active { transform: scale(0.88); }

    /* 頁面暗時：亮色按鈕（高對比） */
    #${BTN_ID}.dark  { background: #eeeeee; }

    /* 頁面亮時：暗色按鈕（高對比） */
    #${BTN_ID}.light { background: #222222; }
  `;

  // ── 狀態 ────────────────────────────────────────────────────
  let isDark;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    isDark = saved === null ? true : saved === 'true';
  } catch {
    isDark = true;
  }

  // ── 樣式注入 ─────────────────────────────────────────────────
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

  // ── 按鈕 ────────────────────────────────────────────────────
  function createBtn() {
    if (document.getElementById(BTN_ID)) return;

    const bs = document.createElement('style');
    bs.id = '__sdm_btn_css__';
    bs.textContent = BTN_CSS;
    (document.head || document.documentElement).appendChild(bs);

    const btn = document.createElement('div');
    btn.id = BTN_ID;
    btn.addEventListener('click', () => setMode(!isDark));

    // 直接放 body，position:fixed 完全正常（沒有任何祖先 filter）
    document.body.appendChild(btn);
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

  // ── MutationObserver：動態 inline background-image ──────────
  function fixInlineBg(node) {
    if (!(node instanceof Element)) return;
    const check = (el) => {
      if (el.style?.backgroundImage && el.style.backgroundImage !== 'none') {
        el.style.setProperty('filter', 'invert(1)', 'important');
      }
    };
    check(node);
    node.querySelectorAll?.('[style*="background-image"]').forEach(check);
  }

  const observer = new MutationObserver(mutations => {
    if (!isDark) return;
    mutations.forEach(m => {
      m.addedNodes.forEach(fixInlineBg);
      if (m.type === 'attributes' && m.attributeName === 'style') {
        fixInlineBg(m.target);
      }
    });
  });

  // ── 初始化 ──────────────────────────────────────────────────
  if (isDark) applyDark(); // 頁面一開始就套，防白色閃爍

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
