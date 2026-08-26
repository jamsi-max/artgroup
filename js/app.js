// CLOSE MENU HAMBURGER
var menu = document.getElementsByClassName('navbar');
var checkMenu = document.getElementById("check");

menu[0].addEventListener('click', handleMenuClick);

function handleMenuClick(event) {
    if (event.target instanceof HTMLAnchorElement) {
        checkMenu.checked = false;
    }
}
// END CLOSE MENU HAMBURGER

// ACTIVE MENU
let sections = document.querySelectorAll('section');
let navLinks = document.querySelectorAll('header nav a');

function updateActiveMenu() {
    const top = window.scrollY;

    for (const sec of sections) {
        const id = sec.getAttribute('id');
        if (id == null || id == 'director1' || id == 'director2') continue;

        const offset = sec.offsetTop - 150;
        if (top < offset || top >= offset + sec.offsetHeight) continue;

        const link = document.querySelector('header nav a[href*="' + id + '"]');
        if (!link) continue;

        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
    }
}

// Coalesce scroll work into one rAF tick. The old handler ran a nested loop of
// DOM queries on every single scroll event, which starved the main thread
// during fast scrolling and made reveal animations stutter.
let activeMenuTicking = false;
window.addEventListener('scroll', () => {
    if (activeMenuTicking) return;
    activeMenuTicking = true;
    requestAnimationFrame(() => {
        updateActiveMenu();
        activeMenuTicking = false;
    });
}, { passive: true });

updateActiveMenu();
// END ACTIVE MENU

// SMOOTH ANCHOR NAVIGATION
// The stylesheet asks for `scroll-behavior: smooth`, but it is declared on the
// universal selector while html carries `overflow-x: hidden` — the combination
// browsers are known to ignore, which is why jumps land instantly. Driving the
// scroll here works regardless, and lets the duration and easing be chosen
// rather than left to the browser.
function initSmoothAnchors() {
    const header = document.querySelector('.header');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // JS owns anchor scrolling from here on, so switch the CSS behaviour off.
    // Leaving it on would make every window.scrollTo below animate on its own
    // and fight this tween. It is only disabled once this script runs, so
    // without JS the stylesheet still provides native smooth scrolling.
    document.documentElement.style.scrollBehavior = 'auto';

    function destinationFor(target) {
        // Sit the section just below the sticky header rather than under it.
        const headerHeight = header ? header.offsetHeight : 0;
        const top = target.getBoundingClientRect().top + window.scrollY - headerHeight;
        const furthest = document.documentElement.scrollHeight - window.innerHeight;
        return Math.max(0, Math.min(top, furthest));
    }

    // Leaves quickly, lands gently.
    function ease(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    let frame = null;

    function cancel() {
        if (frame === null) return;
        cancelAnimationFrame(frame);
        frame = null;
    }

    function glideTo(destination) {
        const from = window.scrollY;
        const distance = destination - from;
        if (Math.abs(distance) < 1) return;

        // Long trips get a little more time, but never enough to feel slow.
        const duration = Math.min(800, Math.max(420, Math.abs(distance) * 0.42));
        const start = performance.now();

        cancel();

        function step(now) {
            const progress = Math.min(1, (now - start) / duration);
            window.scrollTo(0, from + distance * ease(progress));
            frame = progress < 1 ? requestAnimationFrame(step) : null;
        }

        frame = requestAnimationFrame(step);
    }

    // Grabbing the page mid-flight should hand control straight back.
    ['wheel', 'touchstart', 'keydown'].forEach(type => {
        window.addEventListener(type, cancel, { passive: true });
    });

    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (!link) return;

        const hash = link.getAttribute('href');
        if (hash.length < 2) return; // bare "#", used by the footer logo

        const target = document.getElementById(hash.slice(1));
        if (!target) return;

        e.preventDefault();

        const destination = destinationFor(target);
        if (reduceMotion.matches) {
            window.scrollTo(0, destination);
        } else {
            glideTo(destination);
        }

        // Keep the address bar and the back button in step, without letting the
        // browser perform its own instant jump to the anchor.
        if (window.history && history.pushState) {
            history.pushState(null, '', hash);
        }
    });

    // Because the jumps above are pushed manually, the browser no longer
    // scrolls anywhere on back/forward — so drive that here too.
    window.addEventListener('popstate', () => {
        const hash = location.hash;
        if (hash.length < 2) return;

        const target = document.getElementById(hash.slice(1));
        if (!target) return;

        const destination = destinationFor(target);
        if (reduceMotion.matches) {
            window.scrollTo(0, destination);
        } else {
            glideTo(destination);
        }
    });
}

initSmoothAnchors();
// END SMOOTH ANCHOR NAVIGATION

// SCROLL REVEAL
// Native IntersectionObserver instead of the ScrollReveal library: the browser
// recomputes intersections itself, so late-loading images shifting the layout
// can't leave a block stuck at a stale position.
function initScrollReveal() {
    // .reveal lives in the markup so the starting state is painted immediately
    // and nothing flashes before this script runs.
    const targets = document.querySelectorAll('.reveal');
    if (targets.length === 0) return;

    // Without IntersectionObserver, show everything rather than hide it.
    if (!('IntersectionObserver' in window)) {
        targets.forEach(el => el.classList.add('is-revealed'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-revealed');
            // Reveal once — no reset, so scrolling back and forth quickly
            // can never re-hide a block or interrupt its transition.
            observer.unobserve(entry.target);
        });
    }, {
        threshold: 0.1,
        // Start slightly before the element edge so it is already settled
        // by the time it is properly in view.
        rootMargin: '0px 0px -5% 0px'
    });

    targets.forEach(el => observer.observe(el));
}

initScrollReveal();
// END SCROLL REVEAL

// GEOMETRIC FIGURE ANIMATION
// Shared engine behind the home hero image and the three "Why us?" figures:
// each is a cluster of .shape elements inside its own container that
// explodes together into place, wiggles idly while settled, and comes apart
// again as the page scrolls past it.
function createFigureAnimator(container) {
    const shapes = gsap.utils.toArray(container.querySelectorAll('.shape'));
    if (shapes.length === 0) return null;

    // Stable base rotations for the architectural "tilted" look
    const baseRotations = shapes.map((_, i) => (Math.sin(i * 1.5) * 15));
    const idleTweens = [];
    let isAssembling = false;
    let isSettled = false;

    function stopIdle() {
        idleTweens.forEach(t => t.kill());
        idleTweens.length = 0;
    }

    function startIdle() {
        stopIdle();
        shapes.forEach((shape, i) => {
            const t = gsap.to(shape, {
                x: "+=" + (Math.sin(i) * 20),
                y: "+=" + (Math.cos(i) * 20),
                rotation: "+=" + (Math.sin(i * 2) * 10),
                duration: 3 + Math.random() * 2,
                ease: "sine.inOut",
                repeat: -1,
                yoyo: true,
                delay: i * 0.05
            });
            idleTweens.push(t);
        });
    }

    function assemble(forceStagger = false) {
        if (isAssembling) return;
        if (isSettled && !forceStagger) return;

        isAssembling = true;
        isSettled = true;

        stopIdle();
        gsap.killTweensOf(shapes);

        if (forceStagger) {
            gsap.set(shapes, {
                x: () => (Math.random() - 0.5) * 1000,
                y: () => (Math.random() - 0.5) * 1000,
                rotation: () => (Math.random() - 0.5) * 720,
                opacity: 0,
                scale: 0
            });
        }

        gsap.to(shapes, {
            x: 0,
            y: 0,
            rotation: (i) => baseRotations[i],
            opacity: 1,
            scale: 1,
            duration: 1.5,
            ease: "expo.out",
            stagger: forceStagger ? { amount: 1.2, from: "random" } : 0,
            onComplete: () => {
                isAssembling = false;
                startIdle();
            }
        });
    }

    // progress: 0 = fully assembled/at rest, 1 = fully scattered/invisible.
    // Recomputed continuously from scroll position so it scrubs smoothly in
    // both directions instead of playing once.
    function disassemble(progress) {
        if (isAssembling) return;

        if (isSettled) {
            isSettled = false;
            stopIdle();
        }

        shapes.forEach((shape, i) => {
            const factor = (i % 5 + 1) * 0.8;
            const dx = (i % 2 === 0 ? 1 : -1) * (1 + i * 0.1);
            const dy = (i % 3 === 0 ? 1 : -1) * (1 + i * 0.1);

            gsap.to(shape, {
                x: dx * progress * 800 * factor,
                y: dy * progress * 800 * factor,
                rotation: baseRotations[i] + (progress * 720 * factor),
                opacity: 1 - progress * 0.9,
                duration: 0.8,
                ease: "power2.out",
                overwrite: "auto"
            });
        });
    }

    return {
        assemble,
        disassemble,
        get isSettled() { return isSettled; },
        get isAssembling() { return isAssembling; }
    };
}

// The hero figure at the very top of the page — always "at rest" when the
// page is scrolled to the top, and keyed off the global scroll position
// since it only ever lives there.
function initHeroFigure() {
    const container = document.querySelector('.home-img-container');
    if (!container) return;
    const anim = createFigureAnimator(container);
    if (!anim) return;

    let isNavigatingToHome = false;

    anim.assemble(true);

    document.querySelectorAll('a[href="#home"]').forEach(link => {
        link.addEventListener('click', () => {
            isNavigatingToHome = true;
            anim.assemble(true);
        });
    });

    // Scroll listener — throttled to one frame.
    function onShapeScroll() {
        const scrollY = window.scrollY;

        if (scrollY < 50) {
            isNavigatingToHome = false;
            if (!anim.isSettled && !anim.isAssembling) {
                anim.assemble(false);
            }
            return;
        }

        if (anim.isAssembling || isNavigatingToHome) return;

        const maxScroll = window.innerHeight * 1.5;
        const progress = Math.min(scrollY / maxScroll, 1);
        anim.disassemble(progress);
    }

    let shapeTicking = false;
    window.addEventListener('scroll', () => {
        if (shapeTicking) return;
        shapeTicking = true;
        requestAnimationFrame(() => {
            onShapeScroll();
            shapeTicking = false;
        });
    }, { passive: true });
}

// The three "Why us?" figures. Unlike the hero they can sit anywhere on the
// page, so each is keyed off its own position in the viewport rather than
// the global scroll position: it explodes into place the first time it
// scrolls into view, holds and wiggles while comfortably on screen, and
// dissolves again as it scrolls past — in either direction.
function initWhyUsFigures() {
    const figures = Array.from(document.querySelectorAll('.figure-canvas'))
        .map(container => ({ container, anim: createFigureAnimator(container), hasEnteredOnce: false }))
        .filter(f => f.anim);
    if (figures.length === 0) return;

    function onFiguresScroll() {
        const vh = window.innerHeight;

        figures.forEach(fig => {
            const { anim, container } = fig;
            if (anim.isAssembling) return;

            const rect = container.getBoundingClientRect();

            if (!fig.hasEnteredOnce) {
                // Scrolling down brings it up from below — trigger the same
                // dramatic scatter-in the hero plays on load.
                if (rect.top < vh * 0.85) {
                    fig.hasEnteredOnce = true;
                    anim.assemble(true);
                }
                return;
            }

            const settleTop = vh * 0.75;
            const settleBottom = vh * 0.25;
            const inSettleZone = rect.top < settleTop && rect.bottom > settleBottom;

            if (inSettleZone) {
                if (!anim.isSettled) anim.assemble(false);
                return;
            }

            // Symmetric in both directions: scrolling down pushes it out over
            // the top edge (rect.bottom sinking below settleBottom), scrolling
            // up pushes it out over the bottom edge (rect.top rising above
            // settleTop) — each ramps 0→1 over the same distance, continuous
            // with the settle zone's own boundary so there is no jump where
            // the two hand off.
            const exitDistance = vh * 0.9;
            const progress = rect.bottom <= settleBottom
                ? Math.min(Math.max((settleBottom - rect.bottom) / exitDistance, 0), 1)
                : Math.min(Math.max((rect.top - settleTop) / exitDistance, 0), 1);
            anim.disassemble(progress);
        });
    }

    let figureTicking = false;
    function requestFiguresTick() {
        if (figureTicking) return;
        figureTicking = true;
        requestAnimationFrame(() => {
            onFiguresScroll();
            figureTicking = false;
        });
    }

    window.addEventListener('scroll', requestFiguresTick, { passive: true });
    window.addEventListener('resize', requestFiguresTick);

    // In case a figure already sits in (or near) the viewport on load.
    onFiguresScroll();
}

function initGeometricAnimation() {
    initHeroFigure();
    initWhyUsFigures();
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGeometricAnimation);
} else {
    initGeometricAnimation();
}
// END GEOMETRIC FIGURE ANIMATION

// PRINT TEXT TYPED JS
const typed = new Typed('.multiple-text', {
    strings: ['"<span class="first-word">Art</span> group"', '"<span class="first-word">Арт</span> групп"'],
    typeSpeed: 100,
    backSpeed: 100,
    backDelay: 1000,
    loop: true
    
})
// END PRINT TEXT TYPED JS

// PORTFOLIO LOAD MORE
let box = document.querySelectorAll('.portfolio-box');
let loadMoreBtn = document.querySelector('.portfolio-load-more-btn');
let currentimg = 6;

loadMoreBtn.addEventListener('click', () => {
    for (let i = currentimg; i < currentimg + 3; i++) {
        if (box[i]){
            box[i].style.display = 'block';
        }
    }
    currentimg += 3;
    if (currentimg >= box.length) {
        loadMoreBtn.style.display = 'none';
    }
})
// END PORTFOLIO LOAD MORE

// // POPUP BOX
// const portfolioItems = document.querySelector('.portfolio-container');
// const popup = document.querySelector('.popup-box');
// const popupCloseIcon = popup.querySelector('.popup-close-icon');


// portfolioItems.addEventListener('click', function(e) {
//     console.log(e.target.className)
//     if(e.target.className == "portfolio-layer") {
//         const item = e.target;
//         const h4 = item.querySelector("h4").innerHTML;
//         const readMoreCont = item.querySelector('.read-more-content').innerHTML;
//         popup.querySelector('h3').innerHTML = h4;
//         popup.querySelector('.popup-body').innerHTML = readMoreCont;

//         popupBox();
//     }
// })

// popupCloseIcon.addEventListener('click', popupBox);

// popup.addEventListener('click', function(e) {
//     if(e.target == popup || e.target.tagName.toLowerCase() === 'a') {
//         popupBox();
//         // closeDialog();
//     }
// })

// function popupBox(){
//     popup.classList.toggle('open');
// }
// // END POPUP BOX

// READ MORE ABOUT
function changeReadMore() {
    const mycontent =
        document.getElementById('mybox1id');
    const mybutton =
        document.getElementById('mybuttonid');

    if (mycontent.style.display === 'none'
        || mycontent.style.display === '') {
        mycontent.style.display = 'block';
        mycontent.style.marginTop = '3%';
        mycontent.style.fontSize = '1.2rem';
        mycontent.style.fontFamily = 'Poppins, sans-serif';
        if (currentLng == 'ru') {
            mybutton.textContent = 'Свернуть';
        }
        if (currentLng == 'en') {
            mybutton.textContent = 'Collapse';
        }
    } else {
        mycontent.style.display = 'none';
        if (currentLng == 'ru') {
            mybutton.textContent = 'Подробнее';
        }
        if (currentLng == 'en') {
            mybutton.textContent = 'More details';
        }
    }
}
// END READ MORE ABOUT

// READ MORE DIRECTORS
function changeReadMore2() {
    const mycontent =
        document.getElementById('mybox2id');
    const mybutton =
        document.getElementById('mybuttonid2');

    if (mycontent.style.display === 'none'
        || mycontent.style.display === '') {
        mycontent.style.display = 'block';
        mycontent.style.marginTop = '3%';
        mycontent.style.fontSize = '1.2rem';
        mycontent.style.fontFamily = 'Poppins, sans-serif';
        if (currentLng == 'ru') {
            mybutton.textContent = 'Свернуть';
        }
        if (currentLng == 'en') {
            mybutton.textContent = 'Collapse';
        }
    } else {
        mycontent.style.display = 'none';
        if (currentLng == 'ru') {
            mybutton.textContent = 'Подробнее';
        }
        if (currentLng == 'en') {
            mybutton.textContent = 'More details';
        }
    }
}

function changeReadMore3() {
    const mycontent =
        document.getElementById('mybox3id');
    const mybutton =
        document.getElementById('mybuttonid3');

    if (mycontent.style.display === 'none'
        || mycontent.style.display === '') {
        mycontent.style.display = 'block';
        mycontent.style.marginTop = '3%';
        mycontent.style.fontSize = '1.2rem';
        mycontent.style.fontFamily = 'Poppins, sans-serif';
        if (currentLng == 'ru') {
            mybutton.textContent = 'Свернуть';
        }
        if (currentLng == 'en') {
            mybutton.textContent = 'Collapse';
        }
    } else {
        mycontent.style.display = 'none';
        if (currentLng == 'ru') {
            mybutton.textContent = 'Подробнее';
        }
        if (currentLng == 'en') {
            mybutton.textContent = 'More details';
        }
    }
}
// END READ MORE DIRECTORS

// SEND TELEGRAM FORM
// The message is forwarded through a small backend (see backend/) instead of
// calling the Telegram Bot API directly from the browser, so the bot token
// never sits in client-side JS where anyone viewing source could read it.
const FEEDBACK_API = 'https://artgroup-feedback.onrender.com/api/feedback';

// Guards against a double-click or double-tap firing two submits before the
// first fetch has resolved.
let feedbackSubmitting = false;

// Plays once on a successful submit: the card folds toward the button (see
// .is-sending in style.css), then the paper-plane glyph launches from there
// and flies off (.form-plane.is-flying). Resolves once both CSS animations
// have finished, so the caller can run its normal success handling right
// after — nothing about that handling needs to know this happened. Skipped
// outright for anyone who has asked the OS for less motion.
function playSendFlight(form) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return Promise.resolve();
    }

    const plane = form.parentElement.querySelector('.form-plane');
    if (!plane) return Promise.resolve();

    return new Promise((resolve) => {
        let formDone = false;
        let planeDone = false;
        let settled = false;

        const finish = () => {
            if (settled) return;
            settled = true;
            form.removeEventListener('animationend', onFormEnd);
            plane.removeEventListener('animationend', onPlaneEnd);
            resolve();
        };
        const onFormEnd = () => { formDone = true; if (planeDone) finish(); };
        const onPlaneEnd = () => { planeDone = true; if (formDone) finish(); };

        form.addEventListener('animationend', onFormEnd);
        plane.addEventListener('animationend', onPlaneEnd);

        form.classList.add('is-sending');
        // A short beat behind the fold, so the plane reads as launching out
        // of the card rather than popping in alongside it.
        setTimeout(() => plane.classList.add('is-flying'), 220);

        // Safety net in case an animationend is ever missed (e.g. the tab
        // was backgrounded), so the success handling can never hang.
        setTimeout(finish, 1600);
    });
}

async function sendTelegram(e) {
    e.preventDefault();
    if (feedbackSubmitting) return;

    const form = e.target;
    const formBtn = form.querySelector('.send-btn');
    const formSendResult = document.querySelector('.form-send-result');
    formSendResult.textContent = '';
    formSendResult.classList.remove('is-success', 'is-error');

    // "website" is a honeypot: hidden off-screen in the markup, so only a
    // bot filling in every field ever sets it. Real submits send it empty.
    const {phone, name, comment, website} = Object.fromEntries(new FormData(form).entries());

    feedbackSubmitting = true;
    formBtn.disabled = true;

    try {
        // formBtn is an <input type="submit">, whose visible label comes
        // from .value, not .textContent.
        formBtn.value = 'Отправка...';
        const response = await fetch(FEEDBACK_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, phone, comment, hp: website })
        });

        if (response.ok) {
            await playSendFlight(form);
            formSendResult.textContent = `${name}! Спасибо за ваше сообщение! Мы свяжемся с вами в ближайшее время!`;
            formSendResult.classList.add('is-success');
            form.reset();
            form.style.display = 'none';
        } else {
            throw new Error(response.statusText);
        }
    } catch (error) {
        console.error(error);
        formSendResult.textContent = 'Произошла ошибка отправки! Попробуйте еще раз.';
        formSendResult.classList.add('is-error');
    } finally {
        feedbackSubmitting = false;
        formBtn.disabled = false;
        formBtn.value = currentLng === 'en' ? 'Send' : 'Отправить';
    }
};
// END SEND TELEGRAM FORM

// MULTILANGUAGES
const select = document.querySelector('select');
const sendBtn = document.querySelector('.send-btn');
let currentLng = localStorage.getItem('lang') || 'ru'; // Global variable to store current language

select.addEventListener('change', () => {
    currentLng = select.value;
    localStorage.setItem('lang', currentLng);
    applyLanguage(currentLng);
});

function applyLanguage(lng) {
    currentLng = lng; // Ensure global variable is updated
    document.querySelector('html').setAttribute('lang', lng);
    document.querySelector('title').innerHTML = mainLang['html-title'][lng];

    for (let key in langList) {
        const element = document.querySelector('.lng-' + key);
        if (element) {
            element.innerHTML = langList[key][lng];
        }
    }
    sendBtn.value = lng === 'en' ? 'Send' : 'Отправить';

    // Refresh toggle buttons text if sections are expanded
    const sections = [
        { contentId: 'mybox1id', buttonId: 'mybuttonid' },
        { contentId: 'mybox2id', buttonId: 'mybuttonid2' },
        { contentId: 'mybox3id', buttonId: 'mybuttonid3' }
    ];

    sections.forEach(sec => {
        const content = document.getElementById(sec.contentId);
        const button = document.getElementById(sec.buttonId);
        if (content && button && content.style.display === 'block') {
            button.textContent = lng === 'en' ? 'Collapse' : 'Свернуть';
        }
    });
}

// Initialize based on localStorage or default to 'ru'
select.value = currentLng;
applyLanguage(currentLng);
// END MULTILANGUAGES

// VISITORS

// END VISITORS