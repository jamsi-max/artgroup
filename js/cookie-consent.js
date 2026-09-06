// COOKIE CONSENT BANNER
// Required by the 152-FZ amendments in force from 1 Sep 2026: visitors must
// be notified about cookies/analytics (Yandex.Metrica + Webvisor) and be
// able to accept or decline, and to change that choice later. The decision
// is kept in localStorage; window.__loadYandexMetrika (see index.html) is
// only ever called after "accepted".
const CONSENT_KEY = 'cookieConsent';

const cookieBanner = document.getElementById('cookie-banner');
const consentModal = document.getElementById('consent-modal');
const footerReopenBtn = document.getElementById('cookie-settings-reopen');
const acceptBtn = document.getElementById('cookie-accept-btn');
const declineBtn = document.getElementById('cookie-decline-btn');
const policyOpenBtn = document.getElementById('cookie-policy-open');
const modalCloseBtn = document.getElementById('consent-modal-close');

function getConsent() {
    try {
        return localStorage.getItem(CONSENT_KEY);
    } catch (e) {
        return null;
    }
}

function setConsent(value) {
    try {
        localStorage.setItem(CONSENT_KEY, value);
    } catch (e) {
        // Storage unavailable (private mode, disabled cookies, etc.) — the
        // choice just won't persist across visits; nothing else to do here.
    }
}

// The banner is position: fixed at the bottom of the viewport, which would
// otherwise sit on top of (and swallow clicks on) whatever page content
// happens to be there — the contact form's submit button included, on a
// short viewport. Pushing the page up by the banner's own real height, read
// at show time, avoids that regardless of viewport size or text length in
// either language — a fixed guess in CSS could too easily be wrong.
function showBanner() {
    cookieBanner.classList.add('is-visible');
    reserveSpaceForBanner();
}

function hideBanner() {
    cookieBanner.classList.remove('is-visible');
    document.body.style.paddingBottom = '';
}

function reserveSpaceForBanner() {
    document.body.style.paddingBottom = cookieBanner.offsetHeight + 'px';
}

window.addEventListener('resize', function () {
    if (cookieBanner.classList.contains('is-visible')) reserveSpaceForBanner();
});

// Scroll lock kept separate from js/popup.js's own lock (different class,
// own saved position) so the two popups can never interfere with each other.
let consentSavedScrollY = 0;

function openConsentModal() {
    if (consentModal.classList.contains('is-open')) return;
    consentSavedScrollY = window.scrollY;
    document.body.style.top = '-' + consentSavedScrollY + 'px';
    document.body.classList.add('consent-modal-open');
    consentModal.classList.add('is-open');
    consentModal.setAttribute('aria-hidden', 'false');
}

function closeConsentModal() {
    if (!consentModal.classList.contains('is-open')) return;
    consentModal.classList.remove('is-open');
    consentModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('consent-modal-open');
    document.body.style.top = '';
    window.scrollTo(0, consentSavedScrollY);
}

acceptBtn.addEventListener('click', function () {
    setConsent('accepted');
    hideBanner();
    if (typeof window.__loadYandexMetrika === 'function') {
        window.__loadYandexMetrika();
    }
});

declineBtn.addEventListener('click', function () {
    const wasAccepted = getConsent() === 'accepted';
    setConsent('declined');
    hideBanner();

    // Metrica is already running this session (the visitor had accepted
    // before and is now withdrawing consent) — a plain JS flag can't unload
    // it, so reload the page. The gate in index.html then skips loading it
    // on the fresh load. Not needed on a first-time decline, since nothing
    // was ever loaded.
    if (wasAccepted && window.__yandexMetrikaLoaded) {
        location.reload();
    }
});

policyOpenBtn.addEventListener('click', openConsentModal);
modalCloseBtn.addEventListener('click', closeConsentModal);

consentModal.addEventListener('click', function (e) {
    if (e.target === consentModal) closeConsentModal();
});

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && consentModal.classList.contains('is-open')) {
        closeConsentModal();
    }
});

// Footer link: reopen the banner at any time to give or withdraw consent,
// regardless of the choice already on file.
footerReopenBtn.addEventListener('click', showBanner);

if (getConsent() === null) {
    showBanner();
}
// END COOKIE CONSENT BANNER
