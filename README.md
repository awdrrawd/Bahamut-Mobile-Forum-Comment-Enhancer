# 巴哈姆特 手機網頁版 留言區增強
**Bahamut Mobile Forum Comment Enhancer**

[![License: CC-BY-ND-4.0](https://img.shields.io/badge/License-CC--BY--ND--4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nd/4.0/)
[![Greasy Fork](https://img.shields.io/badge/Greasy%20Fork-安裝-red?logo=greasyfork)](https://greasyfork.org/zh-TW/scripts/575997-bahamut-mobile-forum-comment-enhancer)
[![Version](https://img.shields.io/badge/version-1.0.3-blue)](https://greasyfork.org/zh-TW/scripts/575997-bahamut-mobile-forum-comment-enhancer)

為巴哈姆特手機網頁版（`m.gamer.com.tw`）留言區補上各種實用功能，讓手機瀏覽體驗更接近電腦版。

---

## ✨ 功能介紹

| 功能 | 說明 |
|------|------|
| 💬 **回覆按鈕** | 每則留言新增「回覆」按鈕，自動帶入 `#B樓:sn#` 格式前綴 |
| ✏️ **編輯留言** | 自己的留言顯示「編輯」按鈕，支援即時在頁面內修改 |
| 🔖 **@TAG 功能** | 輸入 `@` 自動彈出好友／留言名單，可快速選取插入 TAG |
| 🔗 **複製連結** | 標題列新增一鍵複製文章連結按鈕（🔗） |
| 🔝 **返回頂端** | 捲動超過一頁後顯示返回頂端氣球按鈕 |
| 🚫 **隱藏開啟 App 橫幅** | 自動移除頁面上的「開啟 App」提示 |

---

## 📦 安裝方式

### 步驟一：安裝瀏覽器腳本管理器

你需要先安裝一個 Userscript 管理器，推薦以下擇一安裝：

- **Tampermonkey**（推薦）
  - [Chrome](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
  - [Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/)
  - [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
  - [Safari (iOS/macOS)](https://apps.apple.com/app/tampermonkey/id1482490089)
- **Violentmonkey**
  - [Chrome](https://chromewebstore.google.com/detail/violentmonkey/jinjaccalgkegedbjcedninebooldoop)
  - [Firefox](https://addons.mozilla.org/firefox/addon/violentmonkey/)

> 📱 手機用戶可使用支援 Userscript 的瀏覽器，例如 **Kiwi Browser**（Android）搭配 Tampermonkey，或 **Safari + Tampermonkey**（iOS）。

---

### 步驟二：安裝腳本

安裝好管理器之後，點擊下方按鈕即可跳轉至 Greasy Fork 安裝頁面：

**[🔽 點此安裝腳本](https://greasyfork.org/zh-TW/scripts/575997-bahamut-mobile-forum-comment-enhancer)**

點擊頁面上的「安裝腳本」按鈕，管理器會自動彈出安裝確認視窗，按下確認即完成。

---

### 步驟三：開始使用

安裝完成後，以瀏覽器開啟任何巴哈姆特手機版文章頁面（網址開頭為 `https://m.gamer.com.tw/forum/`），功能即自動啟用，無須額外設定。

---

## 🖼️ 適用頁面

```
https://m.gamer.com.tw/forum/Co.php*
https://m.gamer.com.tw/forum/C.php*
```

---

## 🛠️ 使用說明

### 回覆留言
每則留言下方會出現「**回覆**」按鈕，點擊後會自動在輸入框填入對應的樓層引用格式 `#B樓:sn#`。

### 編輯留言
僅自己發表的留言才會顯示「**編輯**」按鈕。點擊後直接在頁面內修改，支援字數計算（上限 85 字）。

### @TAG 好友
在任意留言輸入框輸入 `@` 後，會自動彈出留言名單與好友名單供選擇；也可繼續輸入 ID 或暱稱進行篩選。  
鍵盤可使用 `↑` `↓` 導航，`Enter` / `Tab` 選取，`Esc` 關閉。

### 複製文章連結
頁面右上角標題列會出現 🔗 圖示，點擊即複製當前文章網址，並顯示「已複製連結」提示。

### 返回頂端
當頁面捲動超過一個視窗高度後，右下角會浮現返回頂端按鈕，點擊即平滑捲動至頁首。

---

## 🔄 更新記錄

| 版本 | 說明 |
|------|------|
| 1.0.3 | 修正各類相容性問題、優化 @ mention 體驗 |
| 1.0.2 | 改善好友清單讀取邏輯 |
| 1.0.1 | 修正編輯功能 CSRF Token 取得方式 |
| 1.0.0 | 初始發布 |

---

## 🐛 問題回報 / 建議

如遇到問題或有功能建議，請至 [Issues](../../issues) 頁面回報，並提供：

- 瀏覽器與版本
- 腳本管理器名稱與版本
- 問題描述與重現步驟（可附截圖）

---

## 📄 授權

本腳本採用 [CC BY-ND 4.0](https://creativecommons.org/licenses/by-nd/4.0/deed.zh-hant) 授權。  
允許轉載與分享，但**不得修改**，且需**標示原作者**。

---

<div align="center">
  Made with ❤️ by <a href="https://github.com/awdrrawd">瀧月瀨</a>
</div>
