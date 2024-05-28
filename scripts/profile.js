
let currentPage = 0;
const maxPage = (document.getElementsByClassName("pillGrid")[0].children.length + 1)%3;
const left = document.getElementById("leftPag");
const right = document.getElementById("rightPag");
let goto
let actCirc = "circle0"
let oldCirc

async function leftButton() {

    oldCirc = "circle" + currentPage
    currentPage -= 1;
    document.getElementById(actCirc).classList.toggle("activeCircle");
    actCirc = "circle" + currentPage
    document.getElementById(actCirc).classList.toggle("activeCircle");
    goto = "pill" + (currentPage * 3)
    document.getElementById(goto).scrollIntoView()
    setListeners()
}

function rightButton() {
    actCirc = "circle" + currentPage
    currentPage += 1;
    document.getElementById(actCirc).classList.toggle("activeCircle");
    actCirc = "circle" + currentPage
    document.getElementById(actCirc).classList.toggle("activeCircle");
    goto = "pill" + (currentPage * 3)
    document.getElementById(goto).scrollIntoView()
    console.log(currentPage)
    setListeners()
}

async function setListeners() {
    
    left.removeEventListener("click", leftButton);
    right.removeEventListener("click", rightButton);

    if (currentPage > 0) {
        left.addEventListener("click", leftButton)
    }

    if (currentPage < maxPage -1 ) {
        console.log(maxPage)
        console.log("testing max")
        right.addEventListener("click", rightButton)
    }
}
setListeners()
