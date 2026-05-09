// ==UserScript==
// @name         🌙 Smart Dark Mode — 智慧黑暗模式
// @namespace    https://github.com/smartdarkmode
// @version      1.0.0
// @description  為所有網站加上黑暗模式，智慧保護圖片/影片不被反色，支援每個網站獨立記憶開關狀態
// @author       You
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  // ── 設定區 ────────────────────────────────────────────────
  const STYLE_ID   = '__smart_dark_mode_style__';
  const BTN_ID     = '__smart_dark_mode_btn__';
  const STORAGE_KEY = 'dark_mode_' + location.hostname;

  // 這些元素不應該被反色（圖片、影片、嵌入等）
  const EXCLUDE_SELECTORS = [
    'img', 'video', 'iframe', 'canvas', 'picture',
    'svg image',            // SVG 內的圖片
    '[style*="background-image"]',  // 背景圖片元素
    '.no-invert',           // 自訂 class 可排除
  ].join(', ');

  // ── CSS 樣式 ───────────────────────────────────────────────
  const DARK_CSS = `
    /* 整頁反色 + 色相旋轉（讓藍色不變成橘色） */
    html {
      filter: invert(1) hue-rotate(180deg) !important;
      background-color: #111 !important;
    }

    /* 把圖片/影片/iframe 再反轉回來，保持原色 */
    img,
    video,
    iframe,
    canvas,
    picture,
    svg image,
    [style*="background-image"],
    .no-invert {
      filter: invert(1) hue-rotate(180deg) !important;
    }

    /* 讓捲軸也變暗 */
    * {
      scrollbar-color: #555 #222;
    }

    /* 避免白色閃爍（頁面載入瞬間） */
    html, body {
      background-color: #111 !important;
    }
  `;

  // ── 狀態管理 ───────────────────────────────────────────────
  // 預設：開啟黑暗模式（找不到記憶則預設 true）
  let isDark = GM_getValue(STORAGE_KEY, true);

  // ── 注入 / 移除樣式 ───────────────────────────────────────
  function applyDark() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = DARK_CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  function removeDark() {
    const el = document.getElementById(STYLE_ID);
    if (el) el.remove();
  }

  function setMode(dark) {
    isDark = dark;
    GM_setValue(STORAGE_KEY, dark);
    dark ? applyDark() : removeDark();
    updateBtn();
  }

  // ── 懸浮按鈕 ──────────────────────────────────────────────
  function createBtn() {
    if (document.getElementById(BTN_ID)) return;

    const btn = document.createElement('div');
    btn.id = BTN_ID;

    Object.assign(btn.style, {
      position:        'fixed',
      // 用 env(safe-area-inset-bottom) 避開 iOS Safari 底部導覽列
      bottom:          'calc(72px + env(safe-area-inset-bottom, 0px))',
      right:           '20px',
      zIndex:          '2147483647',  // 最高層級
      width:           '54px',        // 手機上加大一點，好點擊
      height:          '54px',
      borderRadius:    '50%',
      cursor:          'pointer',
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      fontSize:        '24px',
      boxShadow:       '0 2px 16px rgba(0,0,0,0.6)',
      transition:      'transform 0.2s, opacity 0.2s',
      userSelect:      'none',
      webkitUserSelect: 'none',
      touchAction:     'manipulation',  // 避免 iOS 雙擊縮放延遲
      // 按鈕本身要反轉回來，不然黑暗模式下按鈕會被雙重反色
      filter:          'invert(1) hue-rotate(180deg)',
    });

    btn.title = '切換黑暗模式 (Smart Dark Mode)';

    btn.addEventListener('click', () => setMode(!isDark));

    // Hover 效果
    btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.15)'; });
    btn.addEventListener('mouseleave', () => { btn.style.transform = 'scale(1)'; });

    document.body.appendChild(btn);
    updateBtn();
  }

  function updateBtn() {
    const btn = document.getElementById(BTN_ID);
    if (!btn) return;
    if (isDark) {
      btn.textContent = '☀️';
      btn.style.background = '#1e1e2e';
      btn.title = '目前：黑暗模式 — 點擊切換回亮色';
    } else {
      btn.textContent = '🌙';
      btn.style.background = '#f0f0f0';
      btn.title = '目前：亮色模式 — 點擊切換黑暗模式';
    }
  }

  // ── MutationObserver：處理動態載入的圖片背景 ──────────────
  // 有些網站用 JS 動態設定 style="background-image:..."
  // 我們要即時幫新元素加上正確的 CSS（已由 CSS selector 覆蓋）
  // 但對於用 inline style 的元素，需要特別處理
  function fixDynamicBackgrounds(node) {
    if (!(node instanceof Element)) return;
    // 檢查自身
    if (node.style && node.style.backgroundImage && node.style.backgroundImage !== 'none') {
      node.style.setProperty('filter', 'invert(1) hue-rotate(180deg)', 'important');
    }
    // 檢查子元素
    node.querySelectorAll('[style*="background-image"]').forEach(el => {
      el.style.setProperty('filter', 'invert(1) hue-rotate(180deg)', 'important');
    });
  }

  const observer = new MutationObserver(mutations => {
    if (!isDark) return;
    mutations.forEach(m => {
      m.addedNodes.forEach(fixDynamicBackgrounds);
      // 屬性變更（style 被動態修改）
      if (m.type === 'attributes' && m.attributeName === 'style') {
        fixDynamicBackgrounds(m.target);
      }
    });
  });

  // ── 初始化 ────────────────────────────────────────────────
  // document-start 時立刻注入樣式，避免白色閃爍
  if (isDark) applyDark();

  // DOM ready 後建立按鈕並啟動 observer
  function init() {
    createBtn();
    observer.observe(document.documentElement, {
      childList:  true,
      subtree:    true,
      attributes: true,
      attributeFilter: ['style'],
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
