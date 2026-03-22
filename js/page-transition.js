(() => {
    const LOADER_ID = 'page-transition-loader';
    const HIDDEN_CLASS = 'is-hidden';
    /** Fallback: hide loader after this ms if load event never fires (e.g. stuck resource). */
    const HIDE_FALLBACK_MS = 3500;

    /**
     * Matches language.js `loading` for tr/en. Uses localStorage because this script runs on
     * standalone pages that do not call initLanguage() (no shared t() context).
     */
    function getLoadingLabel() {
        try {
            const lang = localStorage.getItem('language');
            if (lang === 'en') return 'Loading...';
            return 'Yükleniyor...';
        } catch {
            return 'Yükleniyor...';
        }
    }

    function createLoaderElement() {
        const overlay = document.createElement('div');
        overlay.id = LOADER_ID;
        overlay.setAttribute('aria-hidden', 'true');
        const label = getLoadingLabel();
        overlay.innerHTML = `
            <div class="page-transition-loader__content" role="status" aria-live="polite">
                <span class="page-transition-loader__spinner" aria-hidden="true"></span>
                <span class="page-transition-loader__text">${label}</span>
            </div>
        `;
        return overlay;
    }

    function getOrCreateLoader() {
        const existing = document.getElementById(LOADER_ID);
        if (existing) return existing;
        const overlay = createLoaderElement();
        document.body.appendChild(overlay);
        return overlay;
    }

    function showLoader() {
        const loader = getOrCreateLoader();
        loader.classList.remove(HIDDEN_CLASS);
    }

    let fallbackTimer = null;

    function hideLoader() {
        if (fallbackTimer != null) {
            clearTimeout(fallbackTimer);
            fallbackTimer = null;
        }
        const loader = document.getElementById(LOADER_ID);
        if (!loader) return;
        loader.classList.add(HIDDEN_CLASS);
    }

    function scheduleHideFallback() {
        if (fallbackTimer != null) return;
        fallbackTimer = setTimeout(hideLoader, HIDE_FALLBACK_MS);
    }

    function shouldHandleLinkNavigation(anchor, event) {
        if (!anchor || !anchor.href) return false;
        if (event.defaultPrevented) return false;
        if (event.button !== 0) return false;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
        if (anchor.target === '_blank') return false;
        if (anchor.hasAttribute('download')) return false;

        const href = anchor.getAttribute('href') || '';
        if (!href || href.startsWith('#')) return false;
        if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return false;

        const targetUrl = new URL(anchor.href, window.location.href);
        if (targetUrl.origin !== window.location.origin) return false;

        const currentWithoutHash = `${window.location.origin}${window.location.pathname}${window.location.search}`;
        const targetWithoutHash = `${targetUrl.origin}${targetUrl.pathname}${targetUrl.search}`;
        if (currentWithoutHash === targetWithoutHash && targetUrl.hash) return false;

        return true;
    }

    document.addEventListener('DOMContentLoaded', () => {
        showLoader();
        scheduleHideFallback();
    });

    // Hide on load. If script runs late (e.g. defer after load on cached pages), load may have already fired.
    if (document.readyState === 'complete') {
        hideLoader();
    } else {
        window.addEventListener('load', hideLoader);
    }

    window.addEventListener('pageshow', hideLoader);
    window.addEventListener('popstate', hideLoader);

    document.addEventListener('click', (event) => {
        const anchor = event.target instanceof Element ? event.target.closest('a') : null;
        if (!shouldHandleLinkNavigation(anchor, event)) return;
        showLoader();
    });
})();
