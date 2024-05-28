let currentPage = 0;
const maxPage = (document.getElementsByClassName("pillGrid")[0].children.length + 1) % 3;
const left = document.getElementById("leftPag");
const right = document.getElementById("rightPag");
const pillGrid = document.getElementsByClassName("pillGrid")[0]
let goto
let actCirc = "circle0"

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

function isElementInViewport(el) {

    // Special bonus for those using jQuery
    if (typeof jQuery === "function" && el instanceof jQuery) {
        el = el[0];
    }

    var rect = el.getBoundingClientRect();

    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /* or $(window).height() */
        rect.right <= (window.innerWidth || document.documentElement.clientWidth) /* or $(window).width() */
    );
}
async function findPill() {
    setTimeout(() => {
        for (let i = 0; i < pillGrid.children.length; i++) {
            if (isElementInViewport(pillGrid.children[i])) {
                // console.log(actCirc)
                document.getElementById(actCirc).classList.toggle("activeCircle");
                actCirc = "circle" + (i / 3)
                // console.log(i)
                currentPage = (i/3)
                // console.log("Current Page: " + currentPage)
                setArrowListeners()
                document.getElementById(actCirc).classList.toggle("activeCircle");
                // document.getElementById(pillGrid.children[i]).scrollIntoView()
                break
            }
        }
    }, "500")
}

function sliding() {
    pillGrid.addEventListener("scrollend", findPill)
}

document.getElementById("pill0").scrollIntoView()

sliding()
setArrowListeners()
setCircleListeners()