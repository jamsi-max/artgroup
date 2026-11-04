// Contact presentation only. Delivery stays with postTelegramFeedback(),
// shared unchanged with the Services assessment dialog in js/app.js.
const contactSection = document.getElementById('contact');
const contactForm = document.getElementById('contact-form');
const contactFields = ['phone', 'name', 'comment'].map(name => contactForm.elements.namedItem(name));
const contactState = { phase: 'idle', errorKey: '', attempted: false };

function contactText(key) {
    const language = document.documentElement.lang === 'en' ? 'en' : 'ru';
    return langList[key][language];
}

function contactFieldError(field) {
    if (!field.value.trim()) return `contact-required-${field.name}`;
    if (field.value.length > field.maxLength) return 'contact-length';
    if (!field.validity.valid) return 'contact-invalid';
    return '';
}

function showContactFieldError(field, key) {
    const error = document.getElementById(`${field.id}-error`);
    field.toggleAttribute('data-populated', Boolean(field.value));
    if (key) {
        field.setAttribute('aria-invalid', 'true');
        error.dataset.errorKey = key;
        error.textContent = contactText(key).replace('{max}', field.maxLength);
        error.hidden = false;
    } else {
        field.removeAttribute('aria-invalid');
        delete error.dataset.errorKey;
        error.textContent = '';
        error.hidden = true;
    }
}

// Existing language changes call this function. Only leaf text/attributes
// change: never replace the form, its data, icons, listeners or state.
function updateContactLanguage() {
    contactSection.querySelectorAll('[data-contact-text]').forEach(node => {
        node.textContent = contactText(node.dataset.contactText);
    });
    contactSection.querySelectorAll('[data-contact-placeholder]').forEach(node => {
        node.placeholder = contactText(node.dataset.contactPlaceholder);
    });
    contactSection.querySelectorAll('[data-contact-title]').forEach(node => {
        node.title = contactText(node.dataset.contactTitle);
    });
    contactSection.querySelectorAll('[data-contact-aria]').forEach(node => {
        node.setAttribute('aria-label', contactText(node.dataset.contactAria));
    });
    contactFields.forEach(field => {
        const error = document.getElementById(`${field.id}-error`);
        if (error.dataset.errorKey) showContactFieldError(field, error.dataset.errorKey);
    });
    renderContactState();
}

function renderContactState() {
    const pending = contactState.phase === 'sending';
    const succeeded = contactState.phase === 'success';
    const button = contactForm.querySelector('.send-btn');
    button.disabled = pending || succeeded;
    button.classList.toggle('is-loading', pending);
    button.querySelector('[data-contact-submit]').textContent = contactText(pending ? 'contact-sending' : 'contact-submit');
    contactForm.setAttribute('aria-busy', String(pending));
    contactFields.forEach(field => { field.readOnly = pending; });
    contactForm.hidden = succeeded;
    document.getElementById('contact-confirmation').hidden = !succeeded;
    document.getElementById('contact-feedback').textContent = contactState.errorKey ? contactText(contactState.errorKey) : '';
    document.getElementById('contact-announcement').textContent = pending ? contactText('contact-sending')
        : succeeded ? `${contactText('contact-success-title')}. ${contactText('contact-success-body')}` : '';
}

function keepContactTargetVisible(target) {
    if (!target || !contactSection.contains(target)) return;
    const viewport = window.visualViewport;
    const header = document.querySelector('.header').getBoundingClientRect();
    const banner = document.getElementById('cookie-banner');
    const cookieHeight = banner.classList.contains('is-visible') ? banner.offsetHeight : 0;
    const top = Math.max(header.bottom, viewport?.offsetTop || 0) + 14;
    const bottom = (viewport ? viewport.offsetTop + viewport.height : innerHeight) - cookieHeight - 16;
    // Keep the persistent label with its focused field, rather than
    // scrolling the input alone underneath the sticky header.
    const rect = (target.closest('.contact-field') || target).getBoundingClientRect();
    const error = target.id && document.getElementById(`${target.id}-error`);
    const targetBottom = error && !error.hidden ? error.getBoundingClientRect().bottom : rect.bottom;
    // On a short landscape/keyboard viewport, prefer the control's start;
    // native textarea/caret scrolling still works without a form scroller.
    if (targetBottom - rect.top > bottom - top || rect.top < top) {
        window.scrollBy({ top: rect.top - top, behavior: 'instant' });
    } else if (targetBottom > bottom) {
        window.scrollBy({ top: targetBottom - bottom, behavior: 'instant' });
    }
}

async function sendTelegram(event) {
    event.preventDefault();
    if (contactState.phase === 'sending' || contactState.phase === 'success') return;
    contactState.attempted = true;
    let firstInvalid;
    contactFields.forEach(field => {
        const key = contactFieldError(field);
        showContactFieldError(field, key);
        if (key && !firstInvalid) firstInvalid = field;
    });
    if (firstInvalid) {
        firstInvalid.focus({ preventScroll: true });
        keepContactTargetVisible(firstInvalid);
        return;
    }

    const data = new FormData(contactForm);
    contactState.phase = 'sending';
    contactState.errorKey = '';
    renderContactState();
    try {
        const response = await postTelegramFeedback({
            name: data.get('name'), phone: data.get('phone'),
            message: data.get('comment'), website: data.get('website') || ''
        });
        // A real HTTP success is the Worker's existing acceptance contract.
        // An opaque response/status 0 cannot confirm delivery.
        if (response.type === 'opaque' || response.type === 'opaqueredirect' || response.status === 0) {
            contactState.phase = 'failed';
            contactState.errorKey = 'contact-unknown';
        } else if (!response.ok) {
            contactState.phase = 'failed';
            contactState.errorKey = 'contact-rejected';
        } else {
            // Confirm immediately, independently of decorative CSS. Preserve
            // the area occupied by the form so focus/layout do not collapse.
            const panel = contactSection.querySelector('.contact-form-panel');
            panel.style.minHeight = `${Math.ceil(panel.getBoundingClientRect().height)}px`;
            contactState.phase = 'success';
            contactForm.reset();
        }
    } catch (_) {
        // A network/abort failure is unknown delivery, never an acceptance.
        // Keep every field value and do not log personal data or auto-retry.
        contactState.phase = 'failed';
        contactState.errorKey = 'contact-unknown';
    } finally {
        renderContactState();
        if (contactState.phase === 'success') {
            const heading = document.getElementById('contact-success-title');
            heading.focus({ preventScroll: true });
            keepContactTargetVisible(heading);
        } else {
            keepContactTargetVisible(document.getElementById('contact-feedback'));
        }
    }
}

(() => {
    // If the shared delivery script failed to load/initialise, keep the
    // honest phone/email fallback and disabled form instead of a dead submit.
    try {
        if (typeof postTelegramFeedback !== 'function' || typeof FEEDBACK_API !== 'string') return;
    } catch (_) { return; }
    contactFields.forEach(field => {
        field.addEventListener('input', () => {
            field.toggleAttribute('data-populated', Boolean(field.value));
            // Only correct an already reported error while typing.
            if (field.hasAttribute('aria-invalid')) showContactFieldError(field, contactFieldError(field));
        });
        field.addEventListener('change', () => field.toggleAttribute('data-populated', Boolean(field.value)));
        field.addEventListener('blur', () => {
            if (contactState.attempted || field.value) showContactFieldError(field, contactFieldError(field));
        });
    });
    updateContactLanguage();
    contactForm.noValidate = true;
    contactForm.querySelector('.contact-fields').disabled = false;
    contactSection.classList.add('contact-ready');

    // Each part begins only when it is actually in view. Watching the
    // entire tall section used to finish the entrance before the drawing
    // or mobile form became visible. Base styles always stay readable.
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const panel = contactSection.querySelector('.contact-form-panel');
    const targets = [...contactSection.querySelectorAll('.contact-introduction, .contact-study, .contact-form-panel, .contact-strip')];
    const directVisit = location.hash === '#contact';
    let observer;
    const stopPanelEntrance = () => {
        observer?.unobserve(panel);
        panel.classList.remove('contact-visible');
    };
    const finishEntrance = () => {
        observer?.disconnect();
        targets.forEach(target => target.classList.remove('contact-visible'));
    };
    if (!motion.matches && 'IntersectionObserver' in window) {
        try {
            observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    observer.unobserve(entry.target);
                    const editing = contactFields.some(field => field.value) || panel.contains(document.activeElement);
                    // A direct anchor visit keeps the form immediately visible;
                    // the architectural illustration still draws on entry.
                    if (entry.target === panel && (editing || directVisit)) return;
                    entry.target.classList.add('contact-visible');
                });
            }, { rootMargin: '0px 0px -48px 0px', threshold: .08 });
            targets.forEach(target => observer.observe(target));
        } catch (_) { finishEntrance(); }
    }
    contactForm.addEventListener('focusin', stopPanelEntrance);
    contactForm.addEventListener('input', stopPanelEntrance);
    motion.addEventListener('change', finishEntrance);

    function syncContactInsets() {
        const header = document.querySelector('.header');
        const banner = document.getElementById('cookie-banner');
        contactSection.style.setProperty('--contact-header-height', `${header.offsetHeight}px`);
        contactSection.style.setProperty('--contact-cookie-height', `${banner.classList.contains('is-visible') ? banner.offsetHeight : 0}px`);
    }
    syncContactInsets();
    if ('ResizeObserver' in window) {
        const insets = new ResizeObserver(syncContactInsets);
        insets.observe(document.querySelector('.header'));
        insets.observe(document.getElementById('cookie-banner'));
    }
    contactSection.addEventListener('focusin', event => {
        if (event.target.matches('input:not(.hp-field), textarea, .send-btn')) {
            requestAnimationFrame(() => keepContactTargetVisible(event.target));
        }
    });
    window.visualViewport?.addEventListener('resize', () => {
        if (contactSection.contains(document.activeElement)) keepContactTargetVisible(document.activeElement);
    });
    window.addEventListener('resize', syncContactInsets, { passive: true });

    // The original Yandex organization badge is independent of form delivery.
    // Load once, near the section, only with the existing cookie consent.
    const badge = contactSection.querySelector('[data-contact-badge]');
    let near = false;
    function syncBadge() {
        let allowed = false;
        try { allowed = localStorage.getItem('cookieConsent') === 'accepted'; } catch (_) {}
        if (!allowed) {
            badge.hidden = true;
            badge.removeAttribute('src');
        } else if (near && !badge.hasAttribute('src')) {
            badge.src = badge.dataset.src;
            badge.hidden = false;
        }
        syncContactInsets();
    }
    if ('IntersectionObserver' in window) {
        try {
            const badgeObserver = new IntersectionObserver(entries => {
                if (!entries.some(entry => entry.isIntersecting)) return;
                near = true;
                badgeObserver.disconnect();
                syncBadge();
            }, { rootMargin: '200px 0px' });
            badgeObserver.observe(contactSection.querySelector('.contact-review'));
        } catch (_) { near = true; syncBadge(); }
    } else {
        const checkNear = () => {
            if (contactSection.getBoundingClientRect().top > innerHeight + 200) return;
            near = true;
            window.removeEventListener('scroll', checkNear);
            syncBadge();
        };
        window.addEventListener('scroll', checkNear, { passive: true });
        checkNear();
    }
    ['cookie-accept-btn', 'cookie-decline-btn'].forEach(id => {
        // Let the existing cookie handler store its decision first.
        document.getElementById(id).addEventListener('click', () => queueMicrotask(syncBadge));
    });
    document.getElementById('cookie-settings-reopen').addEventListener('click', () => queueMicrotask(syncContactInsets));
    window.addEventListener('storage', event => { if (event.key === 'cookieConsent') syncBadge(); });
})();
