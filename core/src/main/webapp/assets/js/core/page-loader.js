(function () {
    const MINIMUM_VISIBLE_MS = 1000;
    const loader = document.createElement('div');
    loader.className = 'page-loader';
    loader.setAttribute('data-page-loader', '');
    loader.setAttribute('role', 'status');
    loader.setAttribute('aria-live', 'polite');
    loader.innerHTML = `
        <span class="visually-hidden">Preparando tu sesión...</span>
        <div class="page-loader-layout" aria-hidden="true">
            <aside class="page-loader-sidebar">
                <div class="page-loader-brand"></div>
                <div class="page-loader-line"></div>
                <div class="page-loader-line"></div>
                <div class="page-loader-line"></div>
                <div class="page-loader-line"></div>
                <div class="page-loader-sidebar-footer">
                    <div class="page-loader-avatar"></div>
                    <div class="page-loader-avatar-lines">
                        <div class="page-loader-line"></div>
                        <div class="page-loader-line"></div>
                    </div>
                </div>
            </aside>
            <main class="page-loader-main">
                <div class="page-loader-heading"></div>
                <div class="page-loader-cards">
                    <div class="page-loader-card">
                        <div class="page-loader-card-title"></div>
                        <div class="page-loader-card-line"></div>
                        <div class="page-loader-card-line"></div>
                    </div>
                    <div class="page-loader-card">
                        <div class="page-loader-card-title"></div>
                        <div class="page-loader-card-line"></div>
                        <div class="page-loader-card-line"></div>
                    </div>
                </div>
                <div class="page-loader-table">
                    <div class="page-loader-table-line"></div>
                    <div class="page-loader-table-line"></div>
                    <div class="page-loader-table-line"></div>
                    <div class="page-loader-table-line"></div>
                </div>
            </main>
        </div>`;
    document.body.prepend(loader);

    const manualInitialLoad = document.body.getAttribute('data-page-loader-initial') === 'false';
    loader.hidden = manualInitialLoad;
    if (!manualInitialLoad) {
        document.body.setAttribute('aria-busy', 'true');
    }

    let visibleSince = performance.now();
    let navigating = false;
    let activeAlert;

    function show() {
        if (loader.hidden) {
            visibleSince = performance.now();
        }
        loader.hidden = false;
        document.body.setAttribute('aria-busy', 'true');
        if (activeAlert) {
            activeAlert.remove();
            activeAlert = null;
        }
    }

    function waitForPaint() {
        return new Promise(resolve => {
            requestAnimationFrame(() => requestAnimationFrame(resolve));
        });
    }

    async function hideAfterMinimum() {
        await waitForPaint();
        const remaining = MINIMUM_VISIBLE_MS - (performance.now() - visibleSince);
        if (remaining > 0) {
            await new Promise(resolve => setTimeout(resolve, remaining));
        }
        loader.hidden = true;
        document.body.removeAttribute('aria-busy');
    }

    function showError(error, retry) {
        const alert = document.createElement('section');
        alert.className = 'page-load-alert';
        alert.setAttribute('role', 'alert');

        const message = document.createElement('p');
        message.textContent = error && error.message
            ? error.message
            : 'No fue posible cargar la página. Verifica tu conexión e inténtalo de nuevo.';

        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'Reintentar';
        button.addEventListener('click', retry);

        alert.append(message, button);
        document.body.append(alert);
        activeAlert = alert;
        button.focus();
    }

    async function run(task) {
        navigating = false;
        show();

        try {
            await task();
            if (!navigating) {
                await hideAfterMinimum();
            }
        } catch (error) {
            if (navigating) {
                return;
            }
            await hideAfterMinimum();
            showError(error, () => run(task));
        }
    }

    function redirect(url) {
        navigating = true;
        show();
        window.location.href = url;
    }

    document.addEventListener('click', event => {
        if (event.defaultPrevented || event.button !== 0 ||
            event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
            return;
        }

        const link = event.target.closest('a[href]');
        if (!link || link.hasAttribute('download') ||
            (link.target && link.target !== '_self')) {
            return;
        }

        const url = new URL(link.href, window.location.href);
        if (url.origin !== window.location.origin ||
            (url.pathname === window.location.pathname &&
                url.search === window.location.search &&
                (url.hash || !link.getAttribute('href').trim()))) {
            return;
        }

        navigating = true;
        show();
    });

    window.PageLoader = { run, show, redirect };
})();
