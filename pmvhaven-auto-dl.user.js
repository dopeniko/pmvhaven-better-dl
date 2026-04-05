// ==UserScript==
// @name         PMVHaven Downloader
// @version      2026-02-08
// @description  Easy downloading of video and metadata - v+d for video + metadata, v+i for only metadata. Works on video pages and playlist pages active video.
// @match        https://pmvhaven.com/*
// @grant        GM_download
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        GM_addElement
// @require      https://cdnjs.cloudflare.com/ajax/libs/keypress/2.1.5/keypress.min.js#sha512-JjqUcblrwIZTQBPL/azOhVHwq5uaeXkKzq7da3JZEP14Zg926vZZVhRhBBi+L2pWYquZ6r5P8OZYDYgOChtkOw==
// @require      https://cdnjs.cloudflare.com/ajax/libs/toastify-js/1.6.1/toastify.min.js#sha512-79j1YQOJuI8mLseq9icSQKT6bLlLtWknKwj1OpJZMdPt2pFBry3vQTt+NZuJw7NSd1pHhZlu0s12Ngqfa371EA==
// @resource toastify-js.css       https://cdnjs.cloudflare.com/ajax/libs/toastify-js/1.6.1/toastify.min.css#sha512-UiKdzM5DL+I+2YFxK+7TDedVyVm7HMp/bN85NeWMJNYortoll+Nd6PU9ZDrZiaOsdarOyk9egQm6LOJZi36L2g==
// @run-at       document-idle
// ==/UserScript==

/* globals Toastify, TopLoadingBar, keypress */

(function () {
    'use strict';

    const log = (m, ...args) => console.debug(`[pmvhaven-auto-dl] ${m}`, ...args);

    try {
        GM_addStyle(GM_getResourceText("toastify-js.css"));
        GM_addStyle(`
            .toastify { padding: 1.5rem; box-shadow: 0 8px 16px rgba(0,0,0,0.5);
                        background: #111827 !important; border: 2px solid #8E2DE2; border-radius: 1rem; color: #fff !important; }
            .toastify header { font-weight: 700; color: #8E2DE2; font-size: 0.8rem; text-transform: uppercase; margin-bottom: 5px; }
        `);
    } catch(e) { console.error("Style error", e); }

    function showToast(text) {
        Toastify({ text: `<header>Downloader</header><div>${text}</div>`, duration: 4000, escapeMarkup: false }).showToast();
    }

    const listener = new keypress.Listener();

    listener.register_combo({
        "keys": "v d",
        "on_keydown": () => executeAction(false),
        "prevent_repeat": true
    });

    listener.register_combo({
        "keys": "v i",
        "on_keydown": () => executeAction(true),
        "prevent_repeat": true
    });

    listener.register_combo({
        "keys": "v t",
        "on_keydown": () => showToast("🚀 Shortcut detected! Script is active."),
        "prevent_repeat": true
    });

    async function executeAction(metadataOnly) {
        const videoKey = findVideoKey();

        if (!videoKey) {
            showToast("❌ Could not find Video ID on this page.");
            return;
        }

        if (window.TopLoadingBar) window.TopLoadingBar.trickle();

        try {
            await runDownload(videoKey, metadataOnly);
            if (window.TopLoadingBar) window.TopLoadingBar.set(100);
        } catch (err) {
            console.error(err);
            if (window.TopLoadingBar) window.TopLoadingBar.reset();
            showToast("❌ Error occurred. Check console.");
        }
    }

    function findVideoKey() {
        // Method A: Check URL (Best for Video Pages)
        const urlMatch = window.location.href.match(/_([a-fA-F0-9]{24})/);
        if (urlMatch) return urlMatch[1];

        // Method B: Playlist Sidebar (Look for the link with views/timestamp under the title)
        const statsLink = document.querySelector('a[href*="/video/"]');
        if (statsLink) {
            const linkMatch = statsLink.href.match(/_([a-fA-F0-9]{24})/);
            if (linkMatch) return linkMatch[1];
        }

        // Method C: Any link on page with standard ID pattern (Fallback)
        const anyVideoLink = document.querySelector('a[href*="/video/"]');
        if (anyVideoLink) {
            const match = anyVideoLink.href.match(/_([a-fA-F0-9]{24})/);
            if (match) return match[1];
        }

        return null;
    }

    async function runDownload(videoKey, metadataOnly) {
        const response = await fetch(`/api/videos/${videoKey}/watch-page`);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const jsonRes = await response.json();
        const data = jsonRes.data.video;
        if (!data || !data.videoUrl) throw new Error("Missing video data");

        const uploader = (data.creator && data.creator[0]) || data.uploader || "Unknown";
        const cleanTitle = data.title.replace(/[\\/:*?"<>|]/g, '_');
        const filename = `${uploader} - ${videoKey} - ${cleanTitle}`;

        showToast(`📥 Processing: ${data.title}`);

        if (!metadataOnly) {
            GM_download({
                url: data.videoUrl,
                name: filename + (data.videoUrl.match(/\.[a-z0-9]+(?=\?|$)/i) || [".mp4"])[0],
                onerror: () => showToast("❌ Video download failed.")
            });
        }

        const metadata = { ...data };
        ['timelineThumbnails', 'tagVotes', 'dislikedBy', 'likedBy', 'ratedBy', 'musicVotes', 'hlsVariants', 'favoritedBy', 'comments', 'funScriptLikedBy'].forEach(k => delete metadata[k]);

        const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename + ".json";
        a.click();
        URL.revokeObjectURL(a.href);
    }
})();

(function (global) {
    GM_addStyle(`
        #top-loading-bar { position: fixed; top: 0; left: 0; height: 3px; width: 0%; background: linear-gradient(to right, #4A00E0, #8E2DE2); z-index: 2147483647; pointer-events: none; transition: width 200ms linear, opacity 300ms ease; opacity: 1; }
        #top-loading-bar.hidden { opacity: 0; }
    `);
    const el = GM_addElement(document.documentElement, 'div', { id: 'top-loading-bar' });
    let current = 0;
    global.TopLoadingBar = {
        set: (p) => {
            current = p; el.style.width = p + '%';
            if (p >= 100) setTimeout(() => el.classList.add('hidden'), 500);
            else el.classList.remove('hidden');
        },
        trickle: () => global.TopLoadingBar.set(current + (Math.random() * 10 + 2)),
        reset: () => global.TopLoadingBar.set(0)
    };
})(window);
