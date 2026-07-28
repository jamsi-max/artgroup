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

// HOME IMAGE GEOMETRIC ANIMATION
function initGeometricAnimation() {
    const shapes = gsap.utils.toArray('.shape');
    if (shapes.length === 0) return;

    // Stable base rotations for the architectural "tilted" look
    const baseRotations = shapes.map((_, i) => (Math.sin(i * 1.5) * 15));
    const idleTweens = [];
    let isAssembling = false;
    let isAtHome = false;
    let isNavigatingToHome = false;

    function stopIdle() {
        idleTweens.forEach(t => t.kill());
        idleTweens.length = 0;
    }

    function startIdle() {
        // Only idle if we are at top and not in transition
        if (!isAtHome || isAssembling || window.scrollY > 100) return;
        
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
        if (isAtHome && !forceStagger) return;

        isAssembling = true;
        isAtHome = true;

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

    // Initial load
    assemble(true);

    // Handle "Home" link clicks
    document.querySelectorAll('a[href="#home"]').forEach(link => {
        link.addEventListener('click', () => {
            isNavigatingToHome = true;
            assemble(true);
        });
    });

    // Scroll listener — throttled to one frame. Previously this fired on every
    // scroll event and spawned 30 fresh GSAP tweens each time.
    function onShapeScroll() {
        const scrollY = window.scrollY;

        // If we reach the top, reset navigation flag and reassemble if needed
        if (scrollY < 50) {
            isNavigatingToHome = false;
            if (!isAtHome && !isAssembling) {
                assemble(false);
            }
            return;
        }

        // Ignore scroll disintegration if we are currently assembling or navigating home
        if (isAssembling || isNavigatingToHome) return;

        // Away from home
        if (isAtHome) {
            isAtHome = false;
            stopIdle();
        }

        // Standard disintegration logic
        const maxScroll = window.innerHeight * 1.5;
        const progress = Math.min(scrollY / maxScroll, 1);
        
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

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGeometricAnimation);
} else {
    initGeometricAnimation();
}
// END HOME IMAGE GEOMETRIC ANIMATION

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
const TEKLEGRAM_BOT_TOKEN = '7926428166:AAFNtiaRDgs2egDYqaW_mnT6XRA1a1GuA6I';
const TELEGRAM_CHAT_ID = '-1002266189533';
const API = `https://api.telegram.org/bot${TEKLEGRAM_BOT_TOKEN}/sendMessage`;

async function sendTelegram(e) {
    e.preventDefault();

    const form = e.target;
    const formBtn = form.querySelector('.send-btn');
    const formSendResult = document.querySelector('.form-send-result');
    formSendResult.textContent = '';

    const {phone, name, comment} = Object.fromEntries(new FormData(form).entries());

    message = `🟢 Заявка с сайта Art group\nИмя: ${name}\nТелефон: ${phone}\nКомментарий: ${comment}`;

    try {
        formBtn.textContent = 'Отправка...';
        const response = await fetch(API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message
            })
        });

        if (response.ok) {
            formSendResult.textContent = `${name}! Спасибо за ваше сообщение! Мы свяжемся с вами в ближайшее время!`;
            formSendResult.style.position = 'relative';
            formSendResult.style.zIndex = '100';
            formSendResult.style.color = 'rgb(26 244 5)';
            formSendResult.style.fontSize = '1rem';
            formSendResult.style.fontWeight = '600';
            form.reset();
            form.style.display = 'none';
        } else {
            throw new Error(response.statusText);
        }
    } catch (error) {
        console.error(error);
        formSendResult.textContent = 'Произошла ошибка отправки! Попробуйте еще раз.';
        formSendResult.style.color = 'red';
    } finally {
        formBtn.textContent = 'Отправить';
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