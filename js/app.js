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
    reset: true,
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
document.addEventListener('DOMContentLoaded', () => {
    const shapes = document.querySelectorAll('.shape');
    const container = document.querySelector('.home-img-container');

    if (!container || shapes.length === 0) return;

    // 1. Initial Assembly
    // Start with shapes scattered and rotated
    gsap.set(shapes, {
        x: () => (Math.random() - 0.5) * 800,
        y: () => (Math.random() - 0.5) * 800,
        rotation: () => (Math.random() - 0.5) * 720,
        opacity: 0,
        scale: 0
    });

    const assemblyTL = gsap.timeline({
        defaults: { ease: "expo.out", duration: 2.5 }
    });

    assemblyTL.to(shapes, {
        x: 0,
        y: 0,
        rotation: 0,
        opacity: 1,
        scale: 1,
        stagger: {
            amount: 1,
            from: "random"
        }
    });

    // 2. Idle Floating (Oscillation)
    // After assembly, start a gentle float
    assemblyTL.add(() => {
        gsap.to(container, {
            y: -30,
            duration: 4,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true
        });
    }, "-=0.5");

    // 3. Scroll-based Disintegration
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        const maxScroll = window.innerHeight; // Distance over which full disintegration occurs
        const progress = Math.min(scrollY / maxScroll, 1);

        if (progress <= 0) {
            // Back to assembled state (let idle animation take over for y)
            shapes.forEach(shape => {
                gsap.to(shape, {
                    x: 0,
                    y: 0,
                    rotation: 0,
                    opacity: 1,
                    duration: 0.5,
                    overwrite: 'auto'
                });
            });
            return;
        }

        shapes.forEach((shape, index) => {
            // Each shape flies off in a different direction
            const factor = (index % 5 + 1) * 0.8;
            const dirX = (index % 2 === 0 ? 1 : -1) * (1 + index * 0.1);
            const dirY = (index % 3 === 0 ? 1 : -1) * (1 + index * 0.1);

            gsap.to(shape, {
                x: dirX * progress * 800 * factor,
                y: dirY * progress * 800 * factor,
                rotation: progress * 720 * factor,
                opacity: 1 - progress * 0.9,
                duration: 0.4,
                ease: "power1.out",
                overwrite: 'auto'
            });
        });
    });
});
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
        if (lng == 'ru') {
            mybutton.textContent = 'Свернуть';
        }
        if (lng == 'en') {
            mybutton.textContent = 'Roll up';
        }
        // mybutton.textContent = 'Свернуть';
    } else {
        mycontent.style.display = 'none';
        if (lng == 'ru') {
            mybutton.textContent = 'Подробнее';
        }
        if (lng == 'en') {
            mybutton.textContent = 'More';
        }

        // mybutton.textContent = 'Подробнее';
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
        mybutton.textContent = 'Свернуть';
        if (lng == 'en') {
            mybutton.textContent = 'Roll up';
        }
    } else {
        mycontent.style.display = 'none';
        mybutton.textContent = 'Подробнее';
        if (lng == 'en') {
            mybutton.textContent = 'More';
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
        mybutton.textContent = 'Свернуть';
        if (lng == 'en') {
            mybutton.textContent = 'Roll up';
        }
    } else {
        mycontent.style.display = 'none';
        mybutton.textContent = 'Подробнее';
        if (lng == 'en') {
            mybutton.textContent = 'More';
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

select.addEventListener('change', () => {
    const lng = select.value;
    localStorage.setItem('lang', lng);
    applyLanguage(lng);
});

function applyLanguage(lng) {
    document.querySelector('html').setAttribute('lang', lng);
    document.querySelector('title').innerHTML = mainLang['html-title'][lng];

    for (let key in langList) {
        const element = document.querySelector('.lng-' + key);
        if (element) {
            element.innerHTML = langList[key][lng];
        }
    }
    sendBtn.value = lng === 'en' ? 'Send' : 'Отправить';
}

// Initialize based on localStorage or default to 'ru'
const savedLang = localStorage.getItem('lang') || 'ru';
select.value = savedLang;
applyLanguage(savedLang);
// END MULTILANGUAGES

// VISITORS

// END VISITORS