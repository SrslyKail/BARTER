let currentPage = 0;
let maxPage =
  (document.getElementsByClassName("pillGrid")[0].children.length + 1) / 3;

const left = document.getElementById("leftPag");
const right = document.getElementById("rightPag");
const pillGrid = document.getElementsByClassName("pillGrid")[0];
let goto;
let actCirc = "circle0";

function leftButton() {
  actCirc = "circle" + currentPage;
  currentPage -= 1;
  document.getElementById(actCirc).classList.toggle("activeCircle");
  actCirc = "circle" + currentPage;
  document.getElementById(actCirc).classList.toggle("activeCircle");
  goto = "pill" + currentPage * 3;
  document.getElementById(goto).scrollIntoView();
  setArrowListeners();
}

function rightButton() {
  actCirc = "circle" + currentPage;
  currentPage += 1;
  document.getElementById(actCirc).classList.toggle("activeCircle");
  actCirc = "circle" + currentPage;
  document.getElementById(actCirc).classList.toggle("activeCircle");
  goto = "pill" + currentPage * 3;
  document.getElementById(goto).scrollIntoView();
  setArrowListeners();
}

function setArrowListeners() {
  left.removeEventListener("click", leftButton);
  right.removeEventListener("click", rightButton);

  if (currentPage > 0) {
    left.addEventListener("click", leftButton);
  }

  if (currentPage < maxPage - 1) {
    right.addEventListener("click", rightButton);
  }
}

function scrollTo(circNum) {
  document.getElementById(actCirc).classList.toggle("activeCircle");
  document
    .getElementById("pill" + circNum.currentTarget.myParam)
    .scrollIntoView();
  actCirc = "circle" + circNum.currentTarget.myParam / 3;
  document.getElementById(actCirc).classList.toggle("activeCircle");
  currentPage = circNum.currentTarget.myParam / 3;
  setArrowListeners();
}

function setCircleListeners() {
  for (n = 0; n < maxPage; n++) {
    let curCircle = document.getElementById("circle" + n);
    curCircle.myParam = n * 3;
    curCircle.addEventListener("click", scrollTo);
  }
}

// const carousel = document.getElementById("carousel")

function isElementInViewport(el) {
  let rect = el.getBoundingClientRect();
  // let carouselSize = carousel.getBoundingClientRect

  //modifier calculates a sort of margin for defining what's in the viewport
  let modifier = window.innerWidth / 2 - 240;
  if (modifier < 0) {
    modifier = 0;
  }
  while (modifier < window.innerWidth / 2) {
    modifier += 494;
  }
  modifier -= 496;

  // let compareTo = {width: carousel.width, height: carousel.height} // this also includes margin/padding, just FYI

  return (
    rect.top >= 0 &&
    rect.left >= 0 + modifier &&
    rect.bottom <=
      (window.innerHeight ||
        document.documentElement.clientHeight) /* or $(window).height() */ &&
    rect.right <=
      (window.innerWidth ||
        document.documentElement.clientWidth) /* or $(window).width() */
  );
}
async function findPill() {
  setTimeout(() => {
    for (let i = 0; i < pillGrid.children.length; i++) {
      if (isElementInViewport(pillGrid.children[i])) {
        // console.log(actCirc)
        document.getElementById(actCirc).classList.toggle("activeCircle");
        actCirc = "circle" + i / 3;
        // console.log(i)
        currentPage = i / 3;
        // console.log("Current Page: " + currentPage)
        setArrowListeners();
        document.getElementById(actCirc).classList.toggle("activeCircle");
        // document.getElementById(pillGrid.children[i]).scrollIntoView()
        break;
      }
    }
  }, "500");
}

function sliding() {
  pillGrid.addEventListener("scrollend", findPill);
}

// document.getElementById("pill0").scrollIntoView()

sliding();
setArrowListeners();
setCircleListeners();

function toggleAdd() {
  $("#toggleAdd").toggleClass("d-none");
}