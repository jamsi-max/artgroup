// POPUP BOX
const portfolioItems = document.querySelector('.portfolio-container');
const popup = document.querySelector('.popup-box');
const popupCloseIcon = popup.querySelector('.popup-close-icon');

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

    // Jump straight back to where the user was, without smooth scrolling
    // (html has scroll-behavior: smooth, which would animate this).
    const html = document.documentElement;
    const previousBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, savedScrollY);
    html.style.scrollBehavior = previousBehavior;
}

function openPopup() {
    if (popup.classList.contains('open')) return;
    popup.classList.add('open');
    lockPageScroll();
}

function closePopup() {
    if (!popup.classList.contains('open')) return;
    popup.classList.remove('open');
    unlockPageScroll();
}

function fillPopupFrom(box) {
    const title = box.querySelector('h4');
    const content = box.querySelector('.read-more-content');
    if (!title || !content) return false;

    popup.querySelector('h3').innerHTML = title.innerHTML;
    popup.querySelector('.popup-body').innerHTML = content.innerHTML;
    return true;
}

portfolioItems.addEventListener('click', function (e) {
    // Resolve the click to its tile rather than testing what was hit. The
    // previous version compared e.target.className against "portfolio-layer",
    // which only matched clicks landing on bare overlay — clicking the title
    // or the description made e.target the <h4>/<p> and nothing happened. How
    // much bare overlay a tile has depends on how long its text is, so the
    // whole tile was clickable on some and only the button on others.
    const box = e.target.closest('.portfolio-box');
    if (!box) return;

    if (fillPopupFrom(box)) openPopup();
})

popupCloseIcon.addEventListener('click', closePopup);

popup.addEventListener('click', function (e) {
    if (e.target == popup || e.target.tagName.toLowerCase() === 'a') {
        closePopup();
    }
})
// END POPUP BOX
