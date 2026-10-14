// ABOUT GALLERY — the public controls are also used by js/lightbox.js.
const slideshow = document.querySelector('.slideshow-container');
const aboutSlides = Array.from(slideshow.querySelectorAll('.mySlides'));
const galleryCurrent = slideshow.querySelector('.gallery-current');
const galleryTotal = slideshow.querySelector('.gallery-total');
const galleryPlayback = slideshow.querySelector('.gallery-playback');
const slideshowMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let slideIndex = 0;
let slideTimer = null;
let shownSlide = null;
let slideshowPaused = false; // Temporary suspension while the lightbox is open.
let slideshowUserPaused = slideshowMotion.matches;
let slideshowInView = !('IntersectionObserver' in window);
let slideshowHasFocus = false;

aboutSlides.forEach(slide => { slide.style.display = 'none'; });
galleryTotal.textContent = String(aboutSlides.length);
showSlides(slideIndex);

function plusSlides(n) {
    showSlides(slideIndex + n);
}

function showSlides(n) {
    if (aboutSlides.length === 0) return;
    slideIndex = ((n - 1) % aboutSlides.length + aboutSlides.length) % aboutSlides.length + 1;
    if (shownSlide) {
        shownSlide.style.display = 'none';
        shownSlide.setAttribute('aria-hidden', 'true');
    }
    shownSlide = aboutSlides[slideIndex - 1];
    shownSlide.style.display = 'block';
    shownSlide.setAttribute('aria-hidden', 'false');
    galleryCurrent.textContent = String(slideIndex).padStart(2, '0');
}

function goToSlide(oneBased) {
    showSlides(oneBased);
}

function getCurrentSlide() {
    return slideIndex;
}

function startSlideshow() {
    slideshowPaused = false;
    syncSlideshow();
}

function stopSlideshow() {
    slideshowPaused = true;
    syncSlideshow();
}

function syncSlideshow() {
    const readingPhoto = slideshowHasFocus && document.activeElement !== galleryPlayback;
    if (slideshowPaused || slideshowUserPaused || !slideshowInView || document.hidden || readingPhoto) {
        clearInterval(slideTimer);
        slideTimer = null;
    } else if (slideTimer === null) {
        slideTimer = setInterval(() => plusSlides(1), 6000);
    }
    const en = document.documentElement.lang === 'en';
    galleryPlayback.setAttribute('aria-pressed', String(!slideshowUserPaused));
    const label = en ? 'Automatic photo changes' : 'Автоматическая смена фотографий';
    galleryPlayback.setAttribute('aria-label', label);
    galleryPlayback.title = label;
}

galleryPlayback.addEventListener('click', () => {
    slideshowUserPaused = !slideshowUserPaused;
    syncSlideshow();
});
slideshow.addEventListener('focusin', () => { slideshowHasFocus = true; syncSlideshow(); });
slideshow.addEventListener('focusout', event => {
    slideshowHasFocus = slideshow.contains(event.relatedTarget);
    syncSlideshow();
});

function updateAboutGalleryLanguage() {
    const en = document.documentElement.lang === 'en';
    slideshow.setAttribute('aria-label', en ? 'Company photographs' : 'Фотографии компании');
    slideshow.querySelector('.prev').setAttribute('aria-label', en ? 'Previous photo' : 'Предыдущее фото');
    slideshow.querySelector('.next').setAttribute('aria-label', en ? 'Next photo' : 'Следующее фото');
    const fullscreen = slideshow.querySelector('.slider-hint');
    const fullscreenLabel = en ? 'Open photo full screen' : 'Открыть фото на весь экран';
    fullscreen.setAttribute('aria-label', fullscreenLabel);
    fullscreen.title = fullscreenLabel;
    aboutSlides.forEach((slide, i) => {
        slide.querySelector('img').alt = (en ? 'A.R.T. Group company photo ' : 'Фотография компании АРТ Групп ') + (i + 1);
        slide.querySelector('.gallery-photo').setAttribute('aria-label', (en ? 'Open photo ' : 'Открыть фотографию ') + (i + 1));
    });
    syncSlideshow();
}

if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
        slideshowInView = entry.isIntersecting;
        syncSlideshow();
    });
    observer.observe(slideshow);
}
document.addEventListener('visibilitychange', syncSlideshow);
const onSlideshowMotionChange = () => {
    if (slideshowMotion.matches) slideshowUserPaused = true;
    syncSlideshow();
};
if (slideshowMotion.addEventListener) slideshowMotion.addEventListener('change', onSlideshowMotionChange);
else slideshowMotion.addListener(onSlideshowMotionChange);
updateAboutGalleryLanguage();
startSlideshow();
