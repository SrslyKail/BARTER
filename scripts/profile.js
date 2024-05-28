
let currentPage = 0;
const maxPage = (document.getElementsByClassName("pillGrid")[0].children.length + 1) % 3;
const left = document.getElementById("leftPag");
const right = document.getElementById("rightPag");
let goto
let actCirc = "circle0"
let oldCirc

function leftButton() {

    actCirc = "circle" + currentPage
    currentPage -= 1;
    document.getElementById(actCirc).classList.toggle("activeCircle");
    actCirc = "circle" + currentPage
    document.getElementById(actCirc).classList.toggle("activeCircle");
    goto = "pill" + (currentPage * 3)
    document.getElementById(goto).scrollIntoView()
    setArrowListeners()
}

function rightButton() {
    actCirc = "circle" + currentPage
    currentPage += 1;
    document.getElementById(actCirc).classList.toggle("activeCircle");
    actCirc = "circle" + currentPage
    document.getElementById(actCirc).classList.toggle("activeCircle");
    goto = "pill" + (currentPage * 3)
    document.getElementById(goto).scrollIntoView()
    setArrowListeners()
}

function setArrowListeners() {

    left.removeEventListener("click", leftButton);
    right.removeEventListener("click", rightButton);

    if (currentPage > 0) {
        left.addEventListener("click", leftButton)
    }

    if (currentPage < maxPage - 1) {
        right.addEventListener("click", rightButton)
    }
}

function scrollTo(circNum) {
    document.getElementById(actCirc).classList.toggle("activeCircle");
    document.getElementById("pill" + circNum.currentTarget.myParam).scrollIntoView()
    actCirc = ("circle" + (circNum.currentTarget.myParam / 3))
    document.getElementById(actCirc).classList.toggle("activeCircle");
    currentPage = (circNum.currentTarget.myParam / 3)
    setArrowListeners()
}

function setCircleListeners() {

    for (n = 0; n < maxPage; n++) {
        let curCircle = document.getElementById("circle" + (n))
        curCircle.myParam = (n * 3)
        curCircle.addEventListener("click", scrollTo)
    }
}




document.getElementById("pill0").scrollIntoView()

setArrowListeners()
setCircleListeners()
