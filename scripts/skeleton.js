//---------------------------------------------------
// This function loads the parts of your skeleton
// (navbar, footer, and other things) into html doc.
//---------------------------------------------------

document.addEventListener("DOMContentLoaded", loadSkeleton);
function loadSkeleton() {
  $("#footerPlaceholder").load("./text/footer.html");
  $("#headerPlaceholder").load("./text/header.html");
}
