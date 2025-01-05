// POPUP BOX
const portfolioItems = document.querySelector('.portfolio-container');
const popup = document.querySelector('.popup-box');
const popupCloseIcon = popup.querySelector('.popup-close-icon');


portfolioItems.addEventListener('click', function(e) {
    console.log(e.target.tagName.toLowerCase())
    if(e.target.className == "portfolio-layer") {
        const item = e.target;
        const h4 = item.querySelector("h4").innerHTML;
        const readMoreCont = item.querySelector('.read-more-content').innerHTML;
        popup.querySelector('h3').innerHTML = h4;
        popup.querySelector('.popup-body').innerHTML = readMoreCont;

        popupBox();
    }

    if(e.target.tagName.toLowerCase() == "button") {
        const item = e.target.parentElement;
        const h4 = item.querySelector("h4").innerHTML;
        const readMoreCont = item.querySelector('.read-more-content').innerHTML;
        popup.querySelector('h3').innerHTML = h4;
        popup.querySelector('.popup-body').innerHTML = readMoreCont;

        popupBox();
    }
})

popupCloseIcon.addEventListener('click', popupBox);

popup.addEventListener('click', function(e) {
    if(e.target == popup || e.target.tagName.toLowerCase() === 'a') {
        popupBox();
        // closeDialog();
    }
})

function popupBox(){
    popup.classList.toggle('open');
}
// END POPUP BOX