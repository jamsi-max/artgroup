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