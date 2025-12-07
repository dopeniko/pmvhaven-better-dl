// ==UserScript==
// @name         PMVHaven Downloader
// @version      2025-12-07
// @description  Easy downloading of video and metadata - v+d for video + metadata, v+i for only metadata
// @match        https://pmvhaven.com/*
// @grant        GM_download
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        GM_addElement
// @require      https://cdnjs.cloudflare.com/ajax/libs/keypress/2.1.5/keypress.min.js#sha512-JjqUcblrwIZTQBPL/azOhVHwq5uaeXkKzq7da3JZEP14Zg926vZZVhRhBBi+L2pWYquZ6r5P8OZYDYgOChtkOw==
// @require      https://cdnjs.cloudflare.com/ajax/libs/toastify-js/1.6.1/toastify.min.js#sha512-79j1YQOJuI8mLseq9icSQKT6bLlLtWknKwj1OpJZMdPt2pFBry3vQTt+NZuJw7NSd1pHhZlu0s12Ngqfa371EA==
// @resource toastify-js.css       https://cdnjs.cloudflare.com/ajax/libs/toastify-js/1.6.1/toastify.min.css#sha512-UiKdzM5DL+I+2YFxK+7TDedVyVm7HMp/bN85NeWMJNYortoll+Nd6PU9ZDrZiaOsdarOyk9egQm6LOJZi36L2g==
// @run-at       document-idle
// @downloadURL  https://github.com/dopeniko/pmvhaven-better-dl/raw/refs/heads/main/pmvhaven-auto-dl.user.js
// @updateURL    https://github.com/dopeniko/pmvhaven-better-dl/raw/refs/heads/main/pmvhaven-auto-dl.user.js
// ==/UserScript==

/* globals Toastify, TopLoadingBar, keypress */

(function () {
    'use strict';
    // Using debug level here because the main site spams the info log
    function log(m, ...args) { console.debug(`[pmvhaven-auto-dl] ${m}`, ...args); }
    function error(m, ...args) { console.error(`[pmvhaven-auto-dl] ${m}`, ...args); }

    GM_addStyle(GM_getResourceText("toastify-js.css"));
    GM_addStyle(`
        .toastify { padding: 1.5rem; box-shadow: none;
                    background: linear-gradient(var(--color-gray-900)) padding-box,
                                linear-gradient(to right, #4A00E0, #8E2DE2) border-box;
                    border: 2px solid transparent; border-radius: 1rem; }
        .toastify header { padding-bottom: 0.25rem; font-weight: 600; font-size: 0.8rem; }
        .toastify p { padding: 0; margin: 0; font-weight: 400; }
    `);

    function showToast(text) {
        Toastify({ text: `<header>Download Helper</header><p>${text}</p>`, duration: 5000 }).showToast();
    }

    const listener = new keypress.Listener();
    listener.register_combo({
        "keys": "v d",
        "on_keydown": () => {
            downloadSingleVideo().then(() => TopLoadingBar.set(100)).catch(err => {
                error("Error during download", err);
                TopLoadingBar.reset();
            });
        },
        "prevent_repeat": true
    });
    listener.register_combo({
        "keys": "v i",
        "on_keydown": () => {
            downloadSingleVideo(true).then(() => TopLoadingBar.set(100)).catch(err => {
                error("Error during download", err);
                TopLoadingBar.reset();
            });
        },
        "prevent_repeat": true
    });
    listener.register_combo({
        "keys": "v t",
        "on_keydown": () => showToast("Test notification"),
        "prevent_repeat": true
    });

    async function downloadSingleVideo(metadataOnly) {
        if (!location.pathname.startsWith('/video')) {
            showToast("You need to be on a video page");
            log('Combo pressed but not on video page');
            return;
        }

        const videoKey = getVideoKey(location.href);
        if (!videoKey) {
            showToast("Error: see browser log");
            throw new Error("videoKey is null - unable to find 24 character video key from href")
        }

        TopLoadingBar.trickle();
        return downloadVideo(videoKey, metadataOnly);
    }

    async function downloadVideo(videoKey, metadataOnly) {
        const response = await fetch(`/api/videos/${videoKey}`);
        if (!response.ok) {
            if (response.status === 401) {
                showToast("API returned unauthorised. Are you signed in?")
            } else {
                showToast("Bad response from API, check browser log")
            }
            throw new Error("Bad response", response);
        }

        const jsonRes = await response.json();

        if (!jsonRes) {
            throw new Error(`Unexpected response from /api/videos/${videoKey}`, jsonRes);
        }

        log(`Fetched metadata`);

        const data = jsonRes.data;
        if (!data || !data.videoUrl) {
            showToast("Invalid JSON response from API, see browser log");
            throw new Error("videoUrl not found in payload", data);
        }
        const videoUrl = data.videoUrl;
        const uploader = data.creator.at(0) || data.uploader;
        const title = data.title;

        const ext = getFileExtension(videoUrl);
        const baseFilename = `${uploader} - ${videoKey} - ${title}`.trim();

        showToast(`Starting download: ${baseFilename}`);

        let videoDownload;
        if (!metadataOnly) {
            videoDownload = GM.download({
                url: videoUrl,
                name: baseFilename + ext,
                onload: () => TopLoadingBar.set(100),
                onprogress: () => TopLoadingBar.trickle(),
                onerror: () => {
                    TopLoadingBar.reset();
                    showToast(`Error during download: ${baseFilename + ext}`);
                }
            });
        }

        delete data.timelineThumbnails;
        delete data.tagVotes;
        delete data.dislikedBy;
        delete data.likedBy;
        delete data.ratedBy;
        delete data.musicVotes;
        delete data.hlsVariants;
        delete data.favoritedBy;
        delete data.comments;
        delete data.funScriptLikedBy;
        saveBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), baseFilename + '.json');

        return videoDownload;
    }

    function getVideoKey(url) {
        const match = url.match(/([A-Za-z0-9]{24})/);
        return match ? match[1] : null;
    }

    function getFileExtension(url) {
        const match = url.match(/\.([a-zA-Z0-9]+)(\?|$)/);
        if (match) return `${"." + match[1]}`.trim();
        return ".mp4";
    }

    function saveBlob(blob, filename) {
        try {
            const a = document.createElement('a');
            const urlBlob = URL.createObjectURL(blob);
            a.href = urlBlob;
            a.download = filename;

            document.body.appendChild(a);
            a.click();

            document.body.removeChild(a);
            URL.revokeObjectURL(urlBlob);
        } catch (e) {
            showToast("Error: failed to save file, check browser console");
            error("Error saving blob", e);
            throw e;
        }
    }
})();

(function (global) {
    GM_addStyle(`
        #top-loading-bar {
        position: fixed;
        top: 0;
        left: 0;
        height: 3px;
        width: 0%;
        background: linear-gradient(to right, #4A00E0, #8E2DE2);
        z-index: 2147483647;
        pointer-events: none;
        transition: width 200ms linear, opacity 300ms ease;
        opacity: 1;
        will-change: width, opacity;
        }
        #top-loading-bar.hidden {
        opacity: 0;
        transition: opacity 250ms ease;
        }
    `);

    const ID = 'top-loading-bar';
    let el = GM_addElement(document.getElementsByTagName('html')[0], 'div', { id: ID });

    // Internal state
    let current = 0;
    let hideTimeout = null;

    function setProgress(percent) {
        percent = Math.max(0, Math.min(100, Number(percent) || 0));
        current = percent;
        el.classList.remove('hidden');
        el.style.width = percent + '%';
        if (percent >= 100) {
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => {
                el.classList.add('hidden');
                setTimeout(() => {
                    el.style.width = '0%';
                    current = 0;
                }, 300);
            }, 250);
        }
    }

    function reset() {
        clearTimeout(hideTimeout);
        el.classList.remove('hidden');
        el.style.width = '0%';
        current = 0;
    }

    function trickle(amount = null) {
        const inc = amount == null ? (Math.random() * 6 + 2) : Number(amount);
        setProgress(Math.min(99.4, current + inc));
    }

    global.TopLoadingBar = {
        set: setProgress,
        reset,
        trickle,
        get progress() { return current; },
    };
})(window);