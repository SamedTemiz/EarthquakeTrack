(() => {
    const LOADER_ID = 'page-transition-loader';
    const HIDDEN_CLASS = 'is-hidden';
    const HIDE_FALLBACK_MS = 3500;

    function createLoaderElement() {
        const el = document.createElement('div');
        el.id = LOADER_ID;
        el.setAttribute('aria-hidden', 'true');
        return el;
    }

    function getOrCreateLoader() {
        const existing = document.getElementById(LOADER_ID);
        if (existing) return existing;
        const el = createLoaderElement();
        document.body.appendChild(el);
        return el;
    }

    function getSidebarLeft() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return 0;
        return sidebar.getBoundingClientRect().width;
    }

    function showLoader() {
        const loader = getOrCreateLoader();
        loader.style.setProperty('--sidebar-w', getSidebarLeft() + 'px');
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

    // === Astro ClientRouter lifecycle ===
    // Show before fetch starts, hide when new page is fully ready
    document.addEventListener('astro:before-preparation', showLoader);
    document.addEventListener('astro:page-load', hideLoader);

    // === First page load (all pages including index.html) ===
    document.addEventListener('DOMContentLoaded', () => {
        showLoader();
        scheduleHideFallback();
    });
    if (document.readyState === 'complete') {
        hideLoader();
    } else {
        window.addEventListener('load', hideLoader);
    }
    window.addEventListener('pageshow', hideLoader);

    // === Fallback click handler for navigations without ClientRouter ===
    // (e.g. index.html → blog.html which crosses the Astro/non-Astro boundary)
    function shouldHandleLinkNavigation(anchor, event) {
        if (!anchor || !anchor.href) return false;
        if (event.defaultPrevented || event.button !== 0) return false;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
        if (anchor.target === '_blank' || anchor.hasAttribute('download')) return false;

        const href = anchor.getAttribute('href') || '';
        if (!href || href.startsWith('#')) return false;
        if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return false;

        const targetUrl = new URL(anchor.href, window.location.href);
        if (targetUrl.origin !== window.location.origin) return false;

        const currentBase = `${window.location.origin}${window.location.pathname}${window.location.search}`;
        const targetBase = `${targetUrl.origin}${targetUrl.pathname}${targetUrl.search}`;
        if (currentBase === targetBase && targetUrl.hash) return false;

        return true;
    }

    document.addEventListener('click', (event) => {
        const anchor = event.target instanceof Element ? event.target.closest('a') : null;
        if (!shouldHandleLinkNavigation(anchor, event)) return;
        showLoader();
    });
})();
