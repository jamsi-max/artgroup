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

function fillPopupFrom(item) {
    const h4 = item.querySelector('h4').innerHTML;
    const readMoreCont = item.querySelector('.read-more-content').innerHTML;
    popup.querySelector('h3').innerHTML = h4;
    popup.querySelector('.popup-body').innerHTML = readMoreCont;
}

portfolioItems.addEventListener('click', function (e) {
    if (e.target.className == "portfolio-layer") {
        fillPopupFrom(e.target);
        openPopup();
    }

    if (e.target.tagName.toLowerCase() == "button") {
        fillPopupFrom(e.target.parentElement);
        openPopup();
    }
})

popupCloseIcon.addEventListener('click', closePopup);

popup.addEventListener('click', function (e) {
    if (e.target == popup || e.target.tagName.toLowerCase() === 'a') {
        closePopup();
    }
})
// END POPUP BOX
