// SLIDER
let slideIndex = 0;
let slideTimer = null;

showSlides(slideIndex);

function plusSlides(n) {
    showSlides(slideIndex += n);
}

function showSlides(n) {
    const slides = document.getElementsByClassName("mySlides");
    if (slides.length === 0) return;

    if (n > slides.length) { slideIndex = 1 }
    if (n < 1) { slideIndex = slides.length }

    for (let i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";
    }
    slides[slideIndex - 1].style.display = "block";
}

// Jump the slider to a given 1-based slide. Used by the lightbox so that
// closing it leaves the slider on the photo the user was last looking at.
function goToSlide(oneBased) {
    slideIndex = oneBased;
    showSlides(slideIndex);
}

// The slide on screen right now, 1-based. The lightbox opens on it when the
// viewer is launched from the hint button rather than from a photo.
function getCurrentSlide() {
    return slideIndex;
}

// AUTO SLIDER
function startSlideshow() {
    if (slideTimer !== null) return;
    slideTimer = setInterval(function () {
        plusSlides(1);
    }, 3000);
}

function stopSlideshow() {
    clearInterval(slideTimer);
    slideTimer = null;
}

startSlideshow();
// END SLIDER
