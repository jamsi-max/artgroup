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
let count = 2;
setInterval(function() {
    
    document.getElementById('radio' + count).checked = true;
    count++;
    if (count > 3) {
        count = 1;
    }
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

ScrollReveal().reveal('.title, .home-details', { origin: 'top' });
ScrollReveal().reveal('.home-img, .about-content, .director-box, .services-container, .contact-content', { origin: 'bottom' });
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

// PORTFOLIO FIX BACKGROUND
const showDialog = () => {
    document.getElementById('popup').classList.add('show')
    const scrollY = document.documentElement.style.getPropertyValue('--scroll-y');
    const body = document.body;
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}`;
};
const closeDialog = () => {
    const body = document.body;
    const scrollY = body.style.top;
    body.style.position = '';
    body.style.top = '';
    window.scrollTo(0, parseInt(scrollY || '0') * -1);
    document.getElementById('popup').classList.remove('show');
}
window.addEventListener('scroll', () => {
    document.documentElement.style.setProperty('--scroll-y', `${window.scrollY}px`);
});
// END PORTFOLIO FIX BACKGROUND