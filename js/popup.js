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
    .filter(box => box.querySelector('h4') && box.querySelector('.read-more-content'));
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
}

function fillPopupFrom(box) {
    const title = box.querySelector('h4');
    const content = box.querySelector('.read-more-content');
    if (!title || !content) return false;

    const body = popupBody;
    currentProjectIndex = projectBoxes.indexOf(box);

    popup.querySelector('h3').textContent = title.textContent;
    // Copy only the site's existing project nodes; no external HTML or extra
    // media fetches are introduced. Lazy-loading attributes survive cloning.
    const fragment = document.createDocumentFragment();
    Array.from(content.childNodes).forEach(node => fragment.appendChild(node.cloneNode(true)));
    body.textContent = '';
    body.appendChild(fragment);

    const category = box.querySelector('.portfolio-layer > p');
    const subtitle = popup.querySelector('.popup-subtitle');
    subtitle.textContent = category && !category.querySelector('br') ? category.textContent : '';
    subtitle.hidden = !subtitle.textContent.trim();
    popup.querySelector('.popup-project-number').textContent =
        String(currentProjectIndex + 1).padStart(2, '0') + ' / ' + String(projectBoxes.length).padStart(2, '0');
    updatePopupNavigation();
    popup.querySelector('.popup-navigation-status').textContent =
        (currentProjectIndex + 1) + ' / ' + projectBoxes.length + '. ' + title.textContent;

    body.querySelectorAll('a[target="_blank"]').forEach(link => link.relList.add('noopener'));
    body.querySelectorAll('a[href="#contact"]').forEach(link => {
        const paragraph = link.closest('p');
        if (paragraph) paragraph.classList.add('popup-inquiry');
    });

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
    // Resolve the click to its tile rather than testing what was hit. The
    // previous version compared e.target.className against "portfolio-layer",
    // which only matched clicks landing on bare overlay — clicking the title
    // or the description made e.target the <h4>/<p> and nothing happened. How
    // much bare overlay a tile has depends on how long its text is, so the
    // whole tile was clickable on some and only the button on others.
    const box = e.target.closest('.portfolio-box');
    if (!box) return;

    if (fillPopupFrom(box)) openPopup(box.querySelector('button'));
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
// END POPUP BOX
