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

// SLIDER
let slideIndex = 0;
showSlides(slideIndex);

function plusSlides(n) {
    showSlides(slideIndex += n);
}

function showSlides(n) {
    let i;
    let slides = document.getElementsByClassName("mySlides");
    if (n > slides.length) { slideIndex = 1 }
    if (n < 1) { slideIndex = slides.length }
    for (i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";
    }
    slides[slideIndex - 1].style.display = "block";
}
// AUTO SLIDER
setInterval(function() {
    plusSlides(1);
}, 4000);
// END SLIDER

// ACTIVE MENU
let sections = document.querySelectorAll('section');
let navLinks = document.querySelectorAll('header nav a');

window.onscroll = () => {
    sections.forEach(sec => {
        let top = window.scrollY;
        let offset = sec.offsetTop - 150;
        let height = sec.offsetHeight;
        let id = sec.getAttribute('id');

        if (top >= offset && top < offset + height) {
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
ScrollReveal().reveal('.home-img', { origin: 'bottom' });
// END SCROLL REVAL

// PRINT TEXT TYPED JS
const typed = new Typed('.multiple-text', {
    strings: ['"<span class="first-word">Art</span> group"', '"<span class="first-word">Арт</span> групп"'],
    typeSpeed: 100,
    backSpeed: 100,
    backDelay: 1000,
    loop: true
    
})
// END PRINT TEXT TYPED JS

// POPUP BOX
const portfolioItems = document.querySelector('.portfolio-container');
const popup = document.querySelector('.popup-box');
// const popupCloseBtn = popup.querySelector('.popup-close-btn');
const popupCloseIcon = popup.querySelector('.popup-close-icon');

portfolioItems.addEventListener('click', function(e) {
    // console.log(e.target.tagName.toLowerCase());

    if(e.target.tagName.toLowerCase() == "button") {
        const item = e.target.parentElement;
        const h4 = item.querySelector("h4").innerHTML;
        const readMoreCont = item.querySelector('.read-more-content').innerHTML;
        popup.querySelector('h3').innerHTML = h4;
        popup.querySelector('.popup-body').innerHTML = readMoreCont;
        // popup.querySelector('.popup-body').innerHTML = readMoreCont + ' <div class="popup-footer"><button class="btn popup-close-btn" onClick="closeDialog()">Закрыть</button></div>';

        popupBox();
    }
})

// popupCloseBtn.addEventListener('click', popupBox);
popupCloseIcon.addEventListener('click', popupBox);

popup.addEventListener('click', function(e) {
    if(e.target == popup) {
        popupBox();
        closeDialog()
    }
})

function popupBox(){
    popup.classList.toggle('open');
}
// END POPUP BOX

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
        mybutton.textContent = 'Свернуть';
    } else {
        mycontent.style.display = 'none';
        mybutton.textContent = 'Подробнее';
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
    } else {
        mycontent.style.display = 'none';
        mybutton.textContent = 'Подробнее';
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
    } else {
        mycontent.style.display = 'none';
        mybutton.textContent = 'Подробнее';
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