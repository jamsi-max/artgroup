// POPUP BOX
const portfolioItems = document.querySelector('.portfolio-container');
const popup = document.querySelector('.popup-box');
const popupCloseIcon = popup.querySelector('.popup-close-icon');
const popupContent = popup.querySelector('.popup-content');
const popupHeader = popup.querySelector('.popup-header');
const popupBody = popup.querySelector('.popup-body');
const popupNavigation = popup.querySelector('.popup-navigation');
const popupPrevious = popup.querySelector('.popup-previous');
const popupNext = popup.querySelector('.popup-next');
const projectBoxes = Array.from(portfolioItems.querySelectorAll('.portfolio-box'))
    .filter(box => box.dataset.project && box.querySelector('.project-title') && box.querySelector('.project-story'));
let currentProjectIndex = -1;
let popupReturnFocus = null;

// Scroll position to restore when the popup closes. While the popup is open the
// body is position: fixed, which otherwise resets the page to the top.
let savedScrollY = 0;

function lockPageScroll() {
    savedScrollY = window.scrollY;

    // No scrollbar-width compensation needed: html has `overflow-y: scroll`,
    // so the scrollbar gutter is reserved permanently and does not collapse
    // when the body stops overflowing.
    document.body.style.top = '-' + savedScrollY + 'px';
    document.body.classList.add('popup-open');
}

function unlockPageScroll() {
    document.body.classList.remove('popup-open');
    document.body.style.top = '';

    // Jump straight back to where the user was, without animating. app.js
    // normally already forces scroll-behavior to auto; this stands on its own
    // in case the popup runs without it.
    const html = document.documentElement;
    const previousBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, savedScrollY);
    html.style.scrollBehavior = previousBehavior;
}

function openPopup(trigger) {
    if (popup.classList.contains('open')) return;
    popupReturnFocus = trigger || document.activeElement;
    popup.classList.add('open');
    popup.setAttribute('aria-hidden', 'false');
    lockPageScroll();
    popupCloseIcon.focus({ preventScroll: true });
}

function closePopup(restoreFocus = true) {
    if (!popup.classList.contains('open')) return;
    popup.classList.remove('open');
    unlockPageScroll();
    if (restoreFocus && popupReturnFocus && popupReturnFocus.isConnected && popupReturnFocus.getClientRects().length) {
        popupReturnFocus.focus({ preventScroll: true });
    } else if (popupContent.contains(document.activeElement)) {
        document.activeElement.blur();
    }
    popup.setAttribute('aria-hidden', 'true');
    // Stop the embedded player when the panel closes. Its original URL stays
    // in the source story and is cloned again the next time this case opens.
    popupBody.querySelectorAll('iframe').forEach(frame => frame.src = 'about:blank');
}

function fillPopupFrom(box) {
    const title = box.querySelector('.project-title');
    const content = box.querySelector('.project-story');
    if (!title || !content) return false;

    const body = popupBody;
    currentProjectIndex = projectBoxes.indexOf(box);

    popup.querySelector('#popup-project-title').textContent = title.textContent;
    // Copy only the site's existing project nodes; no external HTML or extra
    // media fetches are introduced. Lazy-loading attributes survive cloning.
    const fragment = document.createDocumentFragment();
    Array.from(content.childNodes).forEach(node => fragment.appendChild(node.cloneNode(true)));
    body.textContent = '';
    body.appendChild(fragment);

    const category = box.querySelector('.project-category');
    const subtitle = popup.querySelector('.popup-subtitle');
    subtitle.textContent = category && !category.querySelector('br') ? category.textContent : '';
    subtitle.hidden = !subtitle.textContent.trim();
    popup.querySelector('.popup-project-number').textContent =
        String(currentProjectIndex + 1).padStart(2, '0') + ' / ' + String(projectBoxes.length).padStart(2, '0');
    updatePopupNavigation();
    popup.querySelector('.popup-navigation-status').textContent =
        (currentProjectIndex + 1) + ' / ' + projectBoxes.length + '. ' + title.textContent;

    body.querySelectorAll('a[target="_blank"]').forEach(link => link.relList.add('noopener'));
    // Start every project at its beginning. The panel is reused for all of
    // them, and replacing the markup does not reset how far the previous
    // project had been scrolled — so the next one opened part-way down.
    // Done before the panel is shown, so there is nothing to see.
    body.scrollTop = 0;
    popupHeader.scrollTop = 0;
    popupContent.scrollTop = 0;

    return true;
}

function updatePopupNavigation() {
    const en = document.documentElement.lang === 'en';
    popupCloseIcon.setAttribute('aria-label', en ? 'Close project' : 'Закрыть проект');
    popupNavigation.setAttribute('aria-label', en ? 'Project navigation' : 'Навигация по проектам');
    popupPrevious.querySelector('span').textContent = en ? 'Previous project' : 'Предыдущий проект';
    popupNext.querySelector('span').textContent = en ? 'Next project' : 'Следующий проект';
    popupNavigation.hidden = projectBoxes.length < 2;
}

function refreshProjectPopupLanguage() {
    if (popup.classList.contains('open') && currentProjectIndex >= 0) fillPopupFrom(projectBoxes[currentProjectIndex]);
    else updatePopupNavigation();
}

function navigatePopup(delta) {
    if (!popup.classList.contains('open') || projectBoxes.length < 2) return;
    // Keep focus in a persistent control if a keyboard user was reading a link
    // inside the project content that is about to be replaced.
    if (popupBody.contains(document.activeElement)) {
        (delta < 0 ? popupPrevious : popupNext).focus({ preventScroll: true });
    }
    const index = (currentProjectIndex + delta + projectBoxes.length) % projectBoxes.length;
    fillPopupFrom(projectBoxes[index]);
}

popupPrevious.addEventListener('click', () => navigatePopup(-1));
popupNext.addEventListener('click', () => navigatePopup(1));
updatePopupNavigation();

portfolioItems.addEventListener('click', function (e) {
    // Keep the larger tile target as well as a real keyboard-operable button.
    // Text selection, native summaries and source links retain their behaviour.
    if (e.target.closest('a, details') || !window.getSelection().isCollapsed) return;
    const box = e.target.closest('[data-project]');
    if (!box) return;
    const trigger = box.querySelector('.project-open');

    if (fillPopupFrom(box)) openPopup(trigger);
})

popupCloseIcon.addEventListener('click', () => closePopup());

popup.addEventListener('click', function (e) {
    if (e.target === popup) {
        closePopup();
    } else if (e.target.closest('a')) {
        // Unlock before app.js computes the destination of an anchor link.
        closePopup(false);
    }
})

document.addEventListener('keydown', function (e) {
    if (!popup.classList.contains('open')) return;
    if (e.key === 'Escape') {
        e.preventDefault();
        closePopup();
    } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') &&
        !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey &&
        !e.target.matches('input, textarea, select') && !e.target.isContentEditable) {
        e.preventDefault();
        navigatePopup(e.key === 'ArrowLeft' ? -1 : 1);
    } else if (e.key === 'Tab') {
        const controls = Array.from(popupContent.querySelectorAll('button, a[href], iframe'))
            .filter(el => el.getClientRects().length > 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if ((e.shiftKey && document.activeElement === first) ||
            (!e.shiftKey && document.activeElement === last)) {
            e.preventDefault();
            (e.shiftKey ? last : first).focus({ preventScroll: true });
        }
    }
});

// Also catches focus leaving a cross-origin video frame, whose key events
// cannot bubble into this document.
document.addEventListener('focusin', function (e) {
    if (popup.classList.contains('open') && !popupContent.contains(e.target)) {
        popupCloseIcon.focus({ preventScroll: true });
    }
});
// Hide native inline stories only after the dialog bindings are installed.
portfolioItems.closest('.portfolio').classList.add('portfolio-enhanced');
// END POPUP BOX
