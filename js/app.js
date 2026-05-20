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

window.onscroll = () => {
    sections.forEach(sec => {
        let top = window.scrollY;
        let offset = sec.offsetTop - 150;
        let height = sec.offsetHeight;
        let id = sec.getAttribute('id');

        if (top >= offset && top < offset + height && id != null && id != 'director1' && id != 'director2') {
            navLinks.forEach(links => {
                links.classList.remove('active');
                document.querySelector('header nav a[href*=' + id + ']').classList.add('active');
            });
        };
    });
};
// END ACTIVE MENU

// SCROLL REVAL
ScrollReveal({
    reset: false, // Changed from true to false to prevent "white screen" bug during dynamic layout changes
    distance: '80px',
    duration: 2000,
    delay: 200
});

ScrollReveal().reveal('.home-details', { origin: 'top' });
// ScrollReveal().reveal('.home-img, .director-box, .services-container, .contact-content', { origin: 'bottom' });
// ScrollReveal().reveal('.home-img', { origin: 'bottom' });
ScrollReveal().reveal('.director-box, .services-container, .contact-content', { origin: 'bottom' });
// END SCROLL REVAL

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

    // Scroll listener
    window.addEventListener('scroll', () => {
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
    });
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
    // Sync ScrollReveal after layout change
    if (typeof ScrollReveal !== 'undefined') {
        ScrollReveal().sync();
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
    // Sync ScrollReveal after layout change
    if (typeof ScrollReveal !== 'undefined') {
        ScrollReveal().sync();
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
    // Sync ScrollReveal after layout change
    if (typeof ScrollReveal !== 'undefined') {
        ScrollReveal().sync();
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