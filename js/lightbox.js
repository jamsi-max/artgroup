// ABOUT GALLERY LIGHTBOX
// Full-screen viewer for the "О компании" slider. Paging wraps in both
// directions, so the gallery never dead-ends at either edge.
//
// Depends on js/popup.js for lockPageScroll/unlockPageScroll and on
// js/about-slider.js for stopSlideshow/startSlideshow/goToSlide, so it must be
// loaded after both.
(function () {
    const container = document.querySelector('.slideshow-container');
    if (!container) return;

    const slideImages = Array.from(container.querySelectorAll('.mySlides img'));
    if (slideImages.length === 0) return;

    const sources = slideImages.map(img => img.getAttribute('src'));
    const total = sources.length;
    let current = 0;
    let lastFocused = null;

    // ---------- markup ----------

    const box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Фотографии компании АРТ Групп');
    box.innerHTML =
        '<button class="lightbox__close" type="button" aria-label="Закрыть">&times;</button>' +
        '<span class="lightbox__counter"><b>1</b> / ' + total + '</span>' +
        '<button class="lightbox__nav lightbox__nav--prev" type="button" aria-label="Предыдущее фото">&#10094;</button>' +
        '<div class="lightbox__stage"><img class="lightbox__img" src="" alt=""></div>' +
        '<button class="lightbox__nav lightbox__nav--next" type="button" aria-label="Следующее фото">&#10095;</button>' +
        '<div class="lightbox__rail" role="group" aria-label="Все фотографии"></div>';
    document.body.appendChild(box);

    const stage = box.querySelector('.lightbox__stage');
    const image = box.querySelector('.lightbox__img');
    const rail = box.querySelector('.lightbox__rail');
    const counter = box.querySelector('.lightbox__counter b');
    const closeBtn = box.querySelector('.lightbox__close');

    const thumbs = sources.map((src, i) => {
        const thumb = document.createElement('button');
        thumb.type = 'button';
        thumb.className = 'lightbox__thumb';
        thumb.setAttribute('aria-label', 'Фото ' + (i + 1));
        thumb.innerHTML = '<img src="' + src + '" alt="" loading="lazy">';
        thumb.addEventListener('click', () => show(i));
        rail.appendChild(thumb);
        return thumb;
    });

    // ---------- paging ----------

    function show(index, direction) {
        // Wrap in both directions so paging never runs out.
        const next = ((index % total) + total) % total;
        const from = current;
        current = next;

        image.src = sources[current];
        image.alt = 'Фотография компании АРТ Групп ' + (current + 1) + ' из ' + total;
        counter.textContent = String(current + 1);

        thumbs.forEach((thumb, i) => {
            const active = i === current;
            thumb.classList.toggle('is-active', active);
            if (active) thumb.setAttribute('aria-current', 'true');
            else thumb.removeAttribute('aria-current');
        });

        thumbs[current].scrollIntoView({
            behavior: 'smooth', block: 'nearest', inline: 'center'
        });

        // Replay the entrance so the new photo enters from the side it came
        // from. Reading offsetWidth restarts the animation.
        const dir = direction !== undefined
            ? direction
            : (from === current ? 0 : 1);
        stage.classList.remove('from-left', 'from-right');
        if (dir !== 0) {
            void stage.offsetWidth;
            stage.classList.add(dir > 0 ? 'from-right' : 'from-left');
        }
    }

    function step(delta) {
        show(current + delta, delta);
    }

    // ---------- open / close ----------

    function open(index) {
        lastFocused = document.activeElement;

        if (typeof stopSlideshow === 'function') stopSlideshow();
        if (typeof lockPageScroll === 'function') lockPageScroll();

        show(index, 0);
        box.classList.add('is-open');
        closeBtn.focus({ preventScroll: true });
    }

    function close() {
        box.classList.remove('is-open');

        if (typeof unlockPageScroll === 'function') unlockPageScroll();
        // Leave the slider showing whatever the user stopped on.
        if (typeof goToSlide === 'function') goToSlide(current + 1);
        if (typeof startSlideshow === 'function') startSlideshow();

        if (lastFocused && typeof lastFocused.focus === 'function') {
            lastFocused.focus({ preventScroll: true });
        }
    }

    function isOpen() {
        return box.classList.contains('is-open');
    }

    // ---------- input ----------

    slideImages.forEach((img, i) => {
        img.addEventListener('click', () => open(i));
    });

    closeBtn.addEventListener('click', close);
    box.querySelector('.lightbox__nav--prev').addEventListener('click', () => step(-1));
    box.querySelector('.lightbox__nav--next').addEventListener('click', () => step(1));

    // Anywhere dark closes. Stated as "not the photo and not a control" rather
    // than by listing the backdrop elements, so the padding, the area beside
    // the photo and the counter all count without having to be enumerated.
    // The rail counts as a control in full: dragging it to scrub through
    // thumbnails is a real interaction, and closing on the few pixels of gap
    // between them would be a nasty surprise mid-scrub.
    const KEEP_OPEN = '.lightbox__img, .lightbox__close, .lightbox__nav, .lightbox__rail';
    let swiped = false;

    box.addEventListener('click', (e) => {
        // A swipe can be followed by a click; that must not close the viewer.
        if (swiped) {
            swiped = false;
            return;
        }
        if (e.target.closest(KEEP_OPEN)) return;
        close();
    });

    document.addEventListener('keydown', (e) => {
        if (!isOpen()) return;
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowLeft') step(-1);
        else if (e.key === 'ArrowRight') step(1);
        else return;
        e.preventDefault();
    });

    // Swipe, for phones and tablets.
    let touchX = null;
    let touchY = null;

    stage.addEventListener('touchstart', (e) => {
        touchX = e.changedTouches[0].clientX;
        touchY = e.changedTouches[0].clientY;
        // Start every gesture clean, so a drag that never produced a click
        // cannot swallow the next genuine tap.
        swiped = false;
    }, { passive: true });

    stage.addEventListener('touchend', (e) => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        const dy = e.changedTouches[0].clientY - touchY;
        touchX = null;

        // Any real drag is a gesture, not a tap on the backdrop — flag it so
        // the click that follows doesn't close the viewer.
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) swiped = true;

        // Ignore mostly-vertical drags so they don't fight a scroll gesture.
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
            step(dx < 0 ? 1 : -1);
        }
    }, { passive: true });

    // Trackpad swipes, throttled so one gesture moves one photo.
    let wheelLocked = false;
    stage.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaX) < Math.abs(e.deltaY) || Math.abs(e.deltaX) < 12) return;
        if (wheelLocked) return;
        wheelLocked = true;
        setTimeout(() => { wheelLocked = false; }, 320);
        step(e.deltaX > 0 ? 1 : -1);
    }, { passive: true });
})();
// END ABOUT GALLERY LIGHTBOX
