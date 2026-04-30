// ==UserScript==
// @name               Bahamut Mobile Forum Comment Enhancer
// @name:zh-TW         巴哈姆特 手機網頁版 留言區增強
// @name:zh-cn         巴哈姆特 手机网页版 留言区增强
// @namespace          https://github.com/awdrrawd
// @version            1.0.2
// @description        Adds reply, mention-tag, and edit features to Bahamut's mobile forum, plus a scroll-to-top balloon and copy-link button.
// @description:zh-TW  添加手機版留言區的回覆、TAG編輯功能，並且添加返回頂端氣球與複製連結按鈕
// @description:zh-cn  添加手机版留言区的回复、TAG编辑功能，并且添加返回顶端气球与复制链接按钮
// @author             瀧月瀨
// @icon               https://www.gamer.com.tw/favicon.ico
// @homepageURL        https://github.com/awdrrawd/Bahamut-Mobile-Forum-Comment-Enhancer
// @supportURL         https://github.com/awdrrawd/Bahamut-Mobile-Forum-Comment-Enhancer/issues
// @match              https://m.gamer.com.tw/forum/Co.php*
// @match              https://m.gamer.com.tw/forum/C.php*
// @grant              GM_xmlhttpRequest
// @connect            forum.gamer.com.tw
// @license            CC-BY-ND-4.0
// @downloadURL        https://update.greasyfork.org/scripts/575997/Bahamut%20Mobile%20Forum%20Comment%20Enhancer.user.js
// @updateURL          https://update.greasyfork.org/scripts/575997/Bahamut%20Mobile%20Forum%20Comment%20Enhancer.meta.js
// ==/UserScript==

(function () {
    'use strict';

    const isMobile = location.hostname === 'm.gamer.com.tw';

    function hideOpenAppBanner() {
        if (!isMobile) return;
        const style = document.createElement('style');
        style.textContent = `.open-app { display: none !important; }`;
        document.head.appendChild(style);
        document.querySelectorAll('.open-app').forEach(e => e.remove());
        new MutationObserver(() => {
            document.querySelectorAll('.open-app').forEach(e => e.remove());
        }).observe(document.body, { childList: true, subtree: true });
    }

    function showToast(msg) {
        const t = document.createElement('div');
        t.className = 'uhb-toast';
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.classList.add('uhb-toast--show'), 10);
        setTimeout(() => {
            t.classList.remove('uhb-toast--show');
            setTimeout(() => t.remove(), 300);
        }, 2000);
    }

    function addCopyLinkButton() {
        if (!isMobile) return;
        function tryInsert() {
            const trbtn = document.querySelector('header .trbtn');
            if (!trbtn || trbtn.querySelector('.uhb-copylink')) return;
            const a = document.createElement('a');
            a.href = 'javascript:;';
            a.className = 'uhb-copylink';
            a.title = '複製文章連結';
            a.textContent = '🔗';
            a.style.cssText = 'font-size:20px; line-height:50px; display:inline-block; margin-right:4px;';
            a.onclick = () => {
                const url = location.href;
                if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(url).then(() => showToast('已複製連結'));
                } else {
                    const el = document.createElement('textarea');
                    el.value = url;
                    document.body.appendChild(el);
                    el.select();
                    document.execCommand('copy');
                    el.remove();
                    showToast('已複製連結');
                }
            };
            trbtn.insertBefore(a, trbtn.firstChild);
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', tryInsert);
        } else {
            tryInsert();
            setTimeout(tryInsert, 800);
        }
    }

    function addScrollTopBalloon() {
        if (!isMobile) return;
        const balloon = document.createElement('div');
        balloon.className = 'uhb-scroll-top quicktool iconbtn';
        balloon.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
        balloon.innerHTML = `<svg viewBox="0 0 26.95 22.21" style="pointer-events: none;">
        <g>
            <path d="M26.37,7.06L13.55,0,.73,7.06c-.54,.3-.74,.98-.44,1.53l.31,.56c.3,.54,.98,.74,1.53,.44L13.55,3.29l11.43,6.3c.54,.3,1.23,.1,1.53-.44l.31-.56c.3-.54,.1-1.23-.44-1.53Z"></path>
            <g>
                <path d="M8.26,13.95v1.79h-3.24v6.47h-1.79v-6.47H0v-1.79H8.26Z"></path>
                <path d="M15.66,13.95c.93,0,1.7,.76,1.7,1.7v4.87c0,.94-.77,1.7-1.7,1.7h-4.87c-.94,0-1.7-.76-1.7-1.7v-4.87c0-.94,.76-1.7,1.7-1.7h4.87Zm-4.78,6.47h4.68v-4.68h-4.68v4.68Z"></path>
                <path d="M25.17,13.96c.94,0,1.71,.77,1.71,1.7v2.13c0,.93-.77,1.7-1.71,1.7h-4.77s.03,.03,.03,.08c0,0-.02,0-.03-.01v2.65h-1.78V13.96h6.55Zm-4.77,3.74h4.68v-1.96h-4.68v1.96Z"></path>
            </g>
        </g>
    </svg>`;
        document.body.appendChild(balloon);
        function update() {
            balloon.classList.toggle('uhb-scroll-top--visible', window.scrollY > window.innerHeight);
        }
        window.addEventListener('scroll', update, { passive: true });
        update();
    }
    function getAvatarUrl(id) {
        if (!id) return '';
        const c1 = id[0] || '_';
        const c2 = id[1] || '_';
        return `https://avatar2.bahamut.com.tw/avataruserpic/${c1}/${c2}/${id}/${id}_s.png`;
    }
    // ──────────────────────────────────────────────
    // 帳號取得（合併）
    // ──────────────────────────────────────────────
    function getCurrentUser() {
        const bahaid = document.cookie.match(/(?:^|;\s*)BAHAID=([^;]+)/);
        if (bahaid) return decodeURIComponent(bahaid[1]);
        const a = document.querySelector('a[href*="home.gamer.com.tw/"]');
        if (a) {
            const m = a.href.match(/home\.gamer\.com\.tw\/([^/?#"]+)/);
            if (m) return m[1];
        }
        const b = document.querySelector('a[href*="/home/home.php?owner="]');
        if (b) {
            const m = b.href.match(/owner=([^&]+)/);
            if (m) return m[1];
        }
        const c = document.cookie.match(/(?:^|;\s*)ckBahamutAC=([^;]+)/);
        if (c) return decodeURIComponent(c[1]);
        return null;
    }
    // getCurrentAccount 統一使用 getCurrentUser
    const getCurrentAccount = getCurrentUser;

    // ──────────────────────────────────────────────
    // @好友/留言清單
    // ──────────────────────────────────────────────
    let cachedFriends = null;

    // 切換文章時清除快取
    window.addEventListener('popstate', () => { cachedFriends = null; });

    function parseTagListFromPage() {
        const list = [];
        document.querySelectorAll('.tag-list .tag-user').forEach(a => {
            const onclick = a.getAttribute('onclick') || '';
            const m = onclick.match(/tagUser\(\d+,\s*'([^']+)'\s*,\s*'([^']+)'/);
            if (m) {
                const id   = m[1];
                const name = m[2];
                const img    = a.querySelector('img');
                const avatar = img?.src || img?.dataset?.src || getAvatarUrl(id);
                if (!list.some(f => f.id === id)) list.push({ id, name, avatar });
            }
        });
        return list;
    }

    function parseCommentersFromPage() {
        const map = new Map();
        document.querySelectorAll('[data-comment]').forEach(el => {
            const pcLink = el.querySelector('a.reply-content__user[href*="home.gamer.com.tw/"]')
            || el.querySelector('a[href*="home.gamer.com.tw/"]');
            if (pcLink) {
                const m = pcLink.href.match(/home\.gamer\.com\.tw\/([^/?#"]+)/);
                if (m) {
                    const id     = m[1];
                    const name   = pcLink.textContent.trim();
                    const imgEl  = el.querySelector('img.gamercard, .reply-avatar img');
                    const avatar = imgEl?.src || imgEl?.dataset?.src || getAvatarUrl(id);
                    if (id && !map.has(id)) map.set(id, { id, name, avatar });
                }
            }
            const mLink = el.querySelector('a[href*="/home/home.php?owner="]');
            if (mLink) {
                const m = mLink.href.match(/owner=([^&]+)/);
                if (m) {
                    const id     = m[1];
                    const name   = mLink.textContent.replace(/：$/, '').trim();
                    const imgEl  = el.querySelector('.reply-avatar img, .userpic img');
                    const avatar = imgEl?.src || imgEl?.dataset?.src || getAvatarUrl(id);
                    if (id && !map.has(id)) map.set(id, { id, name, avatar });
                }
            }
        });
        return [...map.values()];
    }

    function buildMergedList(friends) {
        const me = getCurrentAccount();
        const commenterMap = new Map();
        parseTagListFromPage().forEach(f => {
            if (f.id !== me) commenterMap.set(f.id, f);
        });
        parseCommentersFromPage().forEach(f => {
            if (f.id !== me && !commenterMap.has(f.id)) commenterMap.set(f.id, f);
        });
        const friendMap = new Map();
        friends.forEach(f => {
            if (f.id !== me && !commenterMap.has(f.id)) friendMap.set(f.id, f);
        });
        return {
            commenters: [...commenterMap.values()],
            friends: [...friendMap.values()]
        };
    }

    function fetchFriends(cb) {
        if (cachedFriends !== null) {
            cb(buildMergedList(cachedFriends));
            return;
        }
        const u = getCurrentAccount();
        if (!u) {
            cachedFriends = [];
            cb(buildMergedList([]));
            return;
        }
        GM_xmlhttpRequest({
            method: 'GET',
            url: `https://forum.gamer.com.tw/ajax/tag_list_friend.php?u=${encodeURIComponent(u)}`,
            headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' },
            onload(resp) {
                const friends = [];
                try {
                    const data = JSON.parse(resp.responseText);
                    const list = Array.isArray(data) ? data :
                    data.friendList || data.friend || data.list || data.data || data.result || [];
                    (Array.isArray(list) ? list : []).forEach(u => {
                        const id   = u.userid || u.userId || u.user_id || u.account || u.id || '';
                        const name = u.nick || u.nickname || u.name || u.displayName || u.userid || id;
                        if (id && !friends.some(f => f.id === id)) {
                            friends.push({ id, name, avatar: getAvatarUrl(id) });
                        }
                    });
                } catch (e) {
                    console.warn('[UHB] tag_list_friend parse fail', e);
                }
                cachedFriends = friends;
                cb(buildMergedList(friends));
            },
            onerror() {
                cachedFriends = [];
                cb(buildMergedList([]));
            }
        });
    }

    // ── mention 狀態 ──
    let mentionListEl    = null;
    let mentionInput     = null;
    let mentionStart     = -1;
    let mentionSelecting = false;

    function closeMentionList() {
        if (mentionSelecting) return;
        if (mentionListEl) { mentionListEl.remove(); mentionListEl = null; }
    }

    function resetMentionState() {
        mentionInput = null;
        mentionStart = -1;
        mentionSelecting = false;
    }

    function selectMention(id, name) {
        if (!mentionInput) { mentionSelecting = false; return; }
        const val    = mentionInput.value;
        const pos    = mentionInput.selectionStart ?? val.length;
        const before = val.slice(0, mentionStart);
        const after  = val.slice(pos);
        const insert = `[${id}:${name}]`;
        mentionInput.value = before + insert + after;
        const newPos = mentionStart + insert.length;
        mentionInput.setSelectionRange(newPos, newPos);
        mentionInput.focus();
        mentionSelecting = false;
        mentionInput.dispatchEvent(new Event('input', { bubbles: true }));
        closeMentionList();
        resetMentionState();
    }

    function showMentionList(grouped, input) {
        closeMentionList();
        mentionListEl = document.createElement('div');
        mentionListEl.className = 'uhb-mention-list';

        let firstAdded = false;

        function addHeader(text) {
            const h = document.createElement('div');
            h.className = 'uhb-mention-header';
            h.textContent = text;
            mentionListEl.appendChild(h);
        }

        function addItem(f) {
            const item = document.createElement('div');
            item.className = 'uhb-mention-item' + (!firstAdded ? ' active' : '');
            item.dataset.id   = f.id;
            item.dataset.name = f.name;
            firstAdded = true;

            const img = document.createElement('img');
            img.className = 'uhb-mention-avatar';
            img.src = f.avatar || getAvatarUrl(f.id);
            img.alt = '';
            img.onerror = () => { img.style.display = 'none'; };

            const textWrap = document.createElement('span');
            textWrap.className = 'uhb-mention-text';
            textWrap.innerHTML =
                `<span class="uhb-mention-id">@${f.id}</span>` +
                `<span class="uhb-mention-name">${f.name}</span>`;

            item.appendChild(img);
            item.appendChild(textWrap);

            let touchStartY = 0;
            let touchMoved = false;

            item.addEventListener('touchstart', (ev) => {
                touchStartY = ev.touches[0].clientY;
                touchMoved = false;
            }, { passive: true });

            item.addEventListener('touchmove', (ev) => {
                if (Math.abs(ev.touches[0].clientY - touchStartY) > 8) {
                    touchMoved = true;
                }
            }, { passive: true });

            item.addEventListener('click', (ev) => {
                if (touchMoved) return; // 滑動過就忽略
                ev.preventDefault();
                ev.stopPropagation();
                mentionSelecting = true;
                selectMention(f.id, f.name);
            });
            item.addEventListener('touchstart', (ev) => {
                ev.stopPropagation();
                mentionSelecting = true;
                selectMention(f.id, f.name);
            }, { passive: true });

            mentionListEl.appendChild(item);
        }

        if (grouped.commenters.length) {
            addHeader('留言名單');
            grouped.commenters.forEach(f => addItem(f));
        }
        if (grouped.friends.length) {
            addHeader('好友名單');
            grouped.friends.forEach(f => addItem(f));
        }

        const rect = input.getBoundingClientRect();
        const itemCount = grouped.commenters.length + grouped.friends.length;
        const listHeight = Math.min(280, itemCount * 48);
        const spaceAbove = rect.top;
        const spaceBelow = window.innerHeight - rect.bottom;

        mentionListEl.style.cssText = `
            position: fixed;
            left: ${Math.max(8, rect.left)}px;
            width: ${Math.min(rect.width, 300)}px;
            z-index: 99999;
        `;
        mentionListEl.addEventListener('mousedown', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
        });
        if (spaceAbove >= listHeight || spaceAbove > spaceBelow) {
            mentionListEl.style.top = Math.max(8, rect.top - 8 - listHeight) + 'px';
        } else {
            mentionListEl.style.top = (rect.bottom + 4) + 'px';
        }

        document.body.appendChild(mentionListEl);
    }

    function handleAtInput(e) {
        const input = e.target;
        if (!(input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement)) return;
        if (!input.id?.startsWith('commendReply_') && input.tagName !== 'TEXTAREA') return;

        const val = input.value || '';
        const pos = input.selectionStart ?? val.length;

        let at = -1;
        for (let i = pos - 1; i >= 0; i--) {
            if (val[i] === '@') { at = i; break; }
            if (val[i] === ' ' || val[i] === '\n' || val[i] === '\t') break;
        }
        if (at === -1) {
            closeMentionList();
            resetMentionState();
            return;
        }

        const query  = val.slice(at + 1, pos).toLowerCase();
        mentionInput = input;
        mentionStart = at;

        fetchFriends((result) => {
            if (mentionInput !== input) return;
            const filterFn = f =>
            f.id.toLowerCase().includes(query) || f.name.toLowerCase().includes(query);
            const matched = {
                commenters: result.commenters.filter(filterFn),
                friends: result.friends.filter(filterFn)
            };
            if (!matched.commenters.length && !matched.friends.length) {
                closeMentionList();
                return;
            }
            showMentionList(matched, input);
        });
    }

    function handleAtKeydown(e) {
        if (!mentionListEl) return;
        const items = mentionListEl.querySelectorAll('.uhb-mention-item');
        if (!items.length) return;

        let active = mentionListEl.querySelector('.uhb-mention-item.active');
        let idx = [...items].indexOf(active);

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            idx = (idx + 1) % items.length;
            items.forEach(i => i.classList.remove('active'));
            items[idx]?.classList.add('active');
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            idx = (idx - 1 + items.length) % items.length;
            items.forEach(i => i.classList.remove('active'));
            items[idx]?.classList.add('active');
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            const target = mentionListEl.querySelector('.uhb-mention-item.active') || items[0];
            if (target) {
                e.preventDefault();
                mentionSelecting = true;
                selectMention(target.dataset.id, target.dataset.name);
            }
        } else if (e.key === 'Escape') {
            closeMentionList();
            resetMentionState();
        }
    }

    function setupAtMention() {
        if (!isMobile) return;
        document.addEventListener('input', handleAtInput);
        document.addEventListener('keydown', handleAtKeydown);
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.uhb-mention-list')) {
                closeMentionList();
                resetMentionState();
            }
        });
    }

    // ──────────────────────────────────────────────
    // 回覆 / 編輯按鈕
    // ──────────────────────────────────────────────
    function parseComment(el) {
        try { return JSON.parse(el.dataset.comment); } catch { return null; }
    }

    function getFloor(commentEl) {
        const floorEl = commentEl.querySelector('[name="comment_floor"]');
        if (floorEl) {
            const m = floorEl.textContent.match(/B(\d+)/);
            if (m) return parseInt(m[1]);
        }
        const m = commentEl.textContent.match(/\bB(\d+)\b/);
        return m ? parseInt(m[1]) : 0;
    }

    function getAuthor(commentEl) {
        const a = commentEl.querySelector('a.reply-content__user[href*="home.gamer.com.tw/"]')
        || commentEl.querySelector('a[href*="home.gamer.com.tw/"]');
        if (a) {
            const m = a.href.match(/home\.gamer\.com\.tw\/([^/?#"]+)/);
            if (m) return m[1];
        }
        const b = commentEl.querySelector('a[href*="/home/home.php?owner="]');
        if (b) {
            const m = b.href.match(/owner=([^&]+)/);
            if (m) return m[1];
        }
        return null;
    }

    function injectReplyPrefix(prefix, snB) {
        let input = snB ? document.getElementById(`commendReply_${snB}`) : null;
        if (!input) {
            input = document.querySelector(
                'input[id^="commendReply_"], #comment_content, ' +
                'textarea[placeholder*="留言"], textarea[placeholder*="回覆"]'
            );
        }
        if (input) {
            const stripped = (input.value || '').replace(/^#B\d+:\d+#\s*/, '');
            input.value = prefix + stripped;
            input.focus();
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        const openBtn = document.querySelector(
            '.reply-btn, .comment-btn, button[onclick*="openCommentDialog"], a[onclick*="openCommentDialog"]'
        );
        if (openBtn) {
            openBtn.click();
            setTimeout(() => injectReplyPrefix(prefix, snB), 400);
        }
    }

    function doReply(commentEl, data) {
        const { snB, sn } = data;
        const floor  = getFloor(commentEl);
        const prefix = `#B${floor}:${sn}# `;
        if (isMobile) { injectReplyPrefix(prefix, snB); return; }
        if (window.Forum?.C?.replyToFloor) { Forum.C.replyToFloor(snB, sn, floor); return; }
        injectReplyPrefix(prefix, snB);
    }

    let activeTooltip = null;

    function showTooltip(anchor, text) {
        hideTooltip();
        const tip = document.createElement('div');
        tip.className = 'uhb-tooltip';
        tip.textContent = text;
        document.body.appendChild(tip);
        const rect = anchor.getBoundingClientRect();
        tip.style.top  = (window.scrollY + rect.top - 36) + 'px';
        tip.style.left = (window.scrollX + rect.left) + 'px';
        activeTooltip = tip;
        setTimeout(hideTooltip, 2500);
    }

    function hideTooltip() {
        if (activeTooltip) { activeTooltip.remove(); activeTooltip = null; }
    }

    function doEdit(commentEl, data) {
        if (!isMobile && window.Forum?.C?.editComment) { Forum.C.editComment(commentEl); return; }
        if (isMobile && window.Mobile?.Forum?.editComment) {
            Mobile.Forum.editComment(data.bsn, data.snB, data.sn);
            return;
        }
        inlineEdit(commentEl, data);
    }

    function inlineEdit(commentEl, data) {
        const { bsn, snB, sn } = data;
        const articleEl = commentEl.querySelector('article .comment_content, p[name="content_layout"]');
        if (!articleEl || commentEl.querySelector('.uhb-editor-wrapper')) return;

        const originalText = (() => {
            const clone = articleEl.cloneNode(true);
            clone.querySelectorAll('img').forEach(img => {
                const url = img.src || img.dataset?.src || '';
                if (url) img.replaceWith(document.createTextNode(' ' + url));
            });
            clone.querySelectorAll('a').forEach(a => {
                a.replaceWith(document.createTextNode(a.textContent));
            });
            return clone.textContent.trim();
        })();
        const MAX_LEN       = 85;
        const articleParent = articleEl.parentElement;

        const wrapper   = document.createElement('div');
        wrapper.className = 'uhb-editor-wrapper';
        const textarea  = document.createElement('textarea');
        textarea.className = 'uhb-edit-textarea';
        textarea.value  = originalText;
        const footer    = document.createElement('div');
        footer.className = 'uhb-edit-footer';
        const counter   = document.createElement('span');
        counter.className = 'uhb-char-counter';
        const btnRow    = document.createElement('div');
        btnRow.className = 'uhb-edit-btnrow';
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.className   = 'uhb-edit-action uhb-edit-cancel';
        cancelBtn.type        = 'button';
        const submitBtn = document.createElement('button');
        submitBtn.textContent = '確定';
        submitBtn.className   = 'uhb-edit-action uhb-edit-submit';
        submitBtn.type        = 'button';

        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(submitBtn);
        footer.appendChild(counter);
        footer.appendChild(btnRow);
        wrapper.appendChild(textarea);
        wrapper.appendChild(footer);
        articleParent.replaceChild(wrapper, articleEl);
        updateCounter(originalText.length);
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);

        function updateCounter(len) {
            counter.textContent = `${len} / ${MAX_LEN}`;
            counter.classList.toggle('uhb-counter-over', len > MAX_LEN);
            textarea.classList.toggle('uhb-over-limit', len > MAX_LEN);
        }

        textarea.addEventListener('input', () => {
            updateCounter(textarea.value.length);
            if (textarea.value.length > MAX_LEN) showTooltip(counter, `超過 ${MAX_LEN} 個字了喔～`);
            else hideTooltip();
        });

        function doCancel() { articleParent.replaceChild(articleEl, wrapper); }

        cancelBtn.onclick = doCancel;
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSubmit(); }
            else if (e.key === 'Escape') { doCancel(); }
        });
        submitBtn.onclick = doSubmit;

        function doSubmit() {
            const newText = textarea.value.trim();
            if (!newText) return;
            if (newText.length > MAX_LEN) {
                showTooltip(counter, `超過 ${MAX_LEN} 個字了喔～`);
                textarea.focus();
                return;
            }
            submitBtn.disabled    = true;
            submitBtn.textContent = '送出中…';

            if (isMobile && window.Bahamut?.Csrf) {
                try { new Bahamut.Csrf().setCookie(); } catch {}
            }

            const rawToken  = (document.cookie.match(/ckBahamutCsrfToken=([^;]+)/) || [])[1] || '';
            const csrfToken = rawToken ? decodeURIComponent(rawToken) : '';

            GM_xmlhttpRequest({
                method: 'POST',
                url: 'https://forum.gamer.com.tw/ajax/edit_comment.php',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': location.href,
                    ...(csrfToken ? { 'X-Bahamut-Csrf-Token': csrfToken } : {})
                },
                data: [
                    `bsn=${encodeURIComponent(bsn)}`,
                    `snB=${encodeURIComponent(snB)}`,
                    `snC=${encodeURIComponent(sn)}`,
                    `c=${encodeURIComponent(newText)}`,
                    `returnHtml=1`
                ].join('&'),
                onload(resp) {
                    let res = null;
                    try { res = JSON.parse(resp.responseText); } catch {}
                    if (res?.errMsg) {
                        submitBtn.disabled    = false;
                        submitBtn.textContent = '確定';
                        alert('編輯失敗：' + res.errMsg);
                        return;
                    }
                    if (resp.status >= 200 && resp.status < 400) {
                        articleEl.textContent = newText;
                        articleParent.replaceChild(articleEl, wrapper);
                    } else {
                        submitBtn.disabled    = false;
                        submitBtn.textContent = '確定';
                        alert('編輯失敗，HTTP ' + resp.status);
                    }
                },
                onerror() {
                    submitBtn.disabled    = false;
                    submitBtn.textContent = '確定';
                    alert('網路錯誤，無法送出編輯。');
                }
            });
        }
    }

    function processComment(commentEl, currentUser) {
        if (commentEl.dataset.uhbDone) return;
        commentEl.dataset.uhbDone = '1';
        const data = parseComment(commentEl);
        if (!data) return;

        const deleted = [...commentEl.querySelectorAll('span')].some(s => s.textContent.includes('此留言已由原留言者'));
        if (deleted) return;

        const footer    = commentEl.querySelector('.reply-content__footer, .list-footer');
        const buttonbar = commentEl.querySelector('.buttonbar');
        if (!buttonbar) return;

        // 回覆按鈕
        if (!buttonbar.querySelector('.uhb-reply')) {
            const btn = document.createElement('button');
            btn.textContent = '回覆';
            btn.className   = 'tag uhb-reply';
            btn.type        = 'button';
            btn.onclick     = () => doReply(commentEl, data);
            buttonbar.appendChild(btn);
        }

        // 編輯按鈕（自己的留言才顯示）
        const isOwn = data.editable === true ||
              (getAuthor(commentEl) && currentUser && getAuthor(commentEl) === currentUser);
        if (isOwn && !footer?.querySelector('.uhb-edit-wrap')) {
            const wrap = document.createElement('div');
            wrap.className = 'uhb-edit-wrap';
            const btn = document.createElement('button');
            btn.textContent = '編輯';
            btn.className   = 'uhb-btn uhb-edit';
            btn.type        = 'button';
            btn.onclick     = () => doEdit(commentEl, data);
            wrap.appendChild(btn);
            // footer 不存在時 fallback 到 buttonbar
            (footer || buttonbar).appendChild(wrap);
        }
    }

    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .uhb-btn {
                display: inline-flex; align-items: center;
                padding: 4px 10px; margin-left: 6px;
                border: none; border-radius: 4px;
                font-size: 13px; cursor: pointer; font-family: inherit;
                transition: opacity .15s, transform .1s; line-height: 1.4;
            }
            .uhb-btn:active { opacity: .7; transform: scale(.96); }
            .uhb-edit { background: #009cad; color: #fff; }
            .uhb-reply {
                display: inline-block;
                padding: 2px 8px;
                border: none;
                background: transparent;
                color: #555;
                font-size: 12px;
                cursor: pointer;
            }

            .uhb-editor-wrapper { display: flex; flex-direction: column; gap: 6px; width: 100%; }
            .uhb-edit-textarea {
                width: 100%; min-height: 64px; padding: 6px 8px;
                border: 2px solid #aaa; border-radius: 6px;
                font-size: 14px; font-family: inherit; resize: vertical;
                box-sizing: border-box; outline: none;
                transition: border-color .2s; background: #fff; color: #333;
            }
            .uhb-edit-textarea:focus { border-color: #5aa9e6; }
            .uhb-edit-textarea.uhb-over-limit { border-color: #e63946 !important; animation: uhb-shake .25s ease; }
            @keyframes uhb-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
            .uhb-edit-footer { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
            .uhb-char-counter { font-size: 12px; color: #888; white-space: nowrap; transition: color .15s; }
            .uhb-char-counter.uhb-counter-over { color: #e63946; font-weight: bold; }
            .uhb-edit-btnrow { display: flex; gap: 6px; flex-shrink: 0; }
            .uhb-edit-action {
                padding: 5px 14px; border: none; border-radius: 5px;
                font-size: 13px; font-family: inherit; cursor: pointer;
                transition: opacity .15s; line-height: 1.4;
            }
            .uhb-edit-action:active { opacity: .7; }
            .uhb-edit-cancel { background: #ddd; color: #333; }
            .uhb-edit-submit { background: #f4a261; color: #fff; }
            .uhb-edit-submit:disabled { opacity: .6; cursor: default; }

            .uhb-tooltip {
                position: absolute; z-index: 99999;
                background: #e63946; color: #fff;
                padding: 4px 10px; border-radius: 6px;
                font-size: 13px; white-space: nowrap;
                pointer-events: none; box-shadow: 0 2px 8px rgba(0,0,0,.25);
                animation: uhb-fadein .15s ease;
            }
            @keyframes uhb-fadein { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }

            .uhb-scroll-top {
                position: fixed; right: 16px; bottom: 80px;
                width: 46px; height: 46px; border-radius: 50%;
                background: rgba(255,255,255,0.92);
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                cursor: pointer; z-index: 9000;
                display: flex; align-items: center; justify-content: center;
                padding: 10px; box-sizing: border-box;
                opacity: 0; pointer-events: none; transition: opacity .25s;
            }
            .uhb-scroll-top svg {
                width: 100%; height: 100%; fill: #555;
            }

            .uhb-scroll-top--visible { opacity: 1; pointer-events: auto; }

            .uhb-mention-list {
                background: #fff; border: 1px solid #ddd; border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,.18);
                overflow: hidden; max-height: 280px; overflow-y: auto;
                user-select: none;
                -webkit-user-select: none;
            }
            .uhb-mention-header {
                padding: 4px 12px; font-size: 11px; font-weight: bold;
                color: #999; background: #f5f5f5;
                border-bottom: 1px solid #eee; position: sticky; top: 0;
            }
            .uhb-mention-item {
                display: flex; align-items: center; gap: 10px;
                padding: 7px 12px; cursor: pointer; transition: background .1s;
            }
            .uhb-mention-item:hover, .uhb-mention-item.active { background: #f0f6ff; }
            .uhb-mention-avatar {
                width: 32px; height: 32px; border-radius: 50%;
                object-fit: cover; flex-shrink: 0;
                border: 1px solid #e0e0e0; background: #f5f5f5;
            }
            .uhb-mention-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
            .uhb-mention-id   { color: #5aa9e6; font-weight: bold; font-size: 13px; }
            .uhb-mention-name { color: #666; font-size: 12px; }

            .uhb-edit-wrap {
                margin-left: auto;
                display: flex;
                align-items: center;
            }
            .reply-content__footer,
            .list-footer {
                display: flex;
                align-items: center;
            }

            .uhb-toast {
                position: fixed; bottom: 80px; left: 50%;
                transform: translateX(-50%) translateY(10px);
                background: rgba(0,0,0,0.75); color: #fff;
                padding: 8px 18px; border-radius: 20px;
                font-size: 13px; z-index: 99999;
                opacity: 0; transition: opacity .25s, transform .25s;
                pointer-events: none; white-space: nowrap;
            }
            .uhb-toast--show { opacity: 1; transform: translateX(-50%) translateY(0); }
        `;
        document.head.appendChild(style);
    }

    function run() {
        const currentUser = getCurrentUser();
        document.querySelectorAll('[data-comment]').forEach(el => processComment(el, currentUser));
    }

    function observe() {
        const target = document.querySelector('#comment_list, #reply_list') || document.body;
        new MutationObserver(() => run()).observe(target, { childList: true, subtree: true });
    }

    injectStyles();
    hideOpenAppBanner();
    addCopyLinkButton();
    addScrollTopBalloon();
    setupAtMention();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { run(); observe(); });
    } else {
        run();
        observe();
    }
})();
