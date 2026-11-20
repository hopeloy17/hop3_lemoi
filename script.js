const filterButtons = [...document.querySelectorAll("[data-filter]")];
const workCards = [...document.querySelectorAll(".work-card")];
const filterStatus = document.querySelector("#filter-status");
const archiveCluster = document.querySelector(".archive-cluster");
const workViewer = document.querySelector(".work-viewer");
const viewerArtwork = document.querySelector(".viewer-artwork");
const viewerCategory = document.querySelector("#viewer-category");
const viewerTitle = document.querySelector("#viewer-title");
const viewerDescription = document.querySelector("#viewer-description");
const viewerCount = document.querySelector("#viewer-count");
const viewerStatus = document.querySelector("#viewer-status");
const previousButton = document.querySelector(".viewer-previous");
const nextButton = document.querySelector(".viewer-next");
const themeButton = document.querySelector("#theme-button");
const themeLabel = document.querySelector("#theme-label");
const themeStatus = document.querySelector("#theme-status");
const categoryLabels = {
  croquis: "croquis",
  numérique: "numérique",
  "3d": "3D",
  études: "études",
  notes: "notes",
};
// Keep this order aligned with the body[data-theme] colorways in the stylesheet.
const themeNames = [
  "papier clair",
  "crème",
  "bleu brume",
  "rose coquillage",
  "lilas",
  "vert feuille",
  "beurre",
  "menthe",
  "sable",
  "nuit",
];

let activeWorkIndex = -1;
let hideViewerTimer;
let swipeStart;
let themeIndex = 0;

themeButton.addEventListener("click", () => {
  themeIndex = (themeIndex + 1) % themeNames.length;
  document.body.dataset.theme = String(themeIndex);

  const page = themeIndex + 1;
  themeLabel.textContent = `fond ${String(page).padStart(2, "0")} / 10`;
  themeButton.setAttribute(
    "aria-label",
    `Changer l’arrière-plan. Fond ${page} sur 10 : ${themeNames[themeIndex]}`,
  );
  themeStatus.textContent = `Fond ${page} sur 10 : ${themeNames[themeIndex]}`;
});

function visibleWorks() {
  return workCards.filter((card) => !card.hidden);
}

function updateViewer(index) {
  activeWorkIndex = index;
  const card = workCards[index];
  const works = visibleWorks();
  const visibleIndex = works.indexOf(card);

  viewerCategory.textContent = categoryLabels[card.dataset.category] ?? card.dataset.category;
  viewerTitle.textContent = card.dataset.title;
  viewerDescription.textContent = card.dataset.description;
  viewerCount.textContent = `${visibleIndex + 1} / ${works.length}`;
  viewerStatus.textContent = `${card.dataset.title}, ${visibleIndex + 1} sur ${works.length}`;
  // Hide unavailable directions rather than suggesting the pages loop.
  previousButton.hidden = visibleIndex === 0;
  nextButton.hidden = visibleIndex === works.length - 1;
}

function openViewer(index) {
  window.clearTimeout(hideViewerTimer);
  archiveCluster.classList.add("is-open");
  workViewer.hidden = false;
  workViewer.classList.remove("is-closing");
  updateViewer(index);

  window.requestAnimationFrame(() => {
    if (archiveCluster.classList.contains("is-open")) {
      workViewer.classList.add("is-visible");
    }
  });

  workViewer.focus({ preventScroll: true });
}

function closeViewer(restoreFocus = true) {
  if (!archiveCluster.classList.contains("is-open")) return;

  archiveCluster.classList.remove("is-open");
  workViewer.classList.remove("is-visible");
  workViewer.classList.add("is-closing");
  window.clearTimeout(hideViewerTimer);
  hideViewerTimer = window.setTimeout(() => {
    if (!archiveCluster.classList.contains("is-open")) {
      workViewer.hidden = true;
      workViewer.classList.remove("is-closing");
    }
  }, 260);

  if (restoreFocus && activeWorkIndex >= 0) {
    workCards[activeWorkIndex].focus({ preventScroll: true });
  }
}

function moveViewer(direction) {
  const works = visibleWorks();
  if (works.length < 2) return;

  const currentCard = workCards[activeWorkIndex];
  const currentIndex = works.indexOf(currentCard);
  const nextIndex = currentIndex + direction;

  // Pages stay in order and stop at either end instead of wrapping around.
  if (nextIndex < 0 || nextIndex >= works.length) return;

  updateViewer(workCards.indexOf(works[nextIndex]));
}

function filterWorks(category) {
  const showAll = category === "tout";
  let visibleCount = 0;

  for (const card of workCards) {
    const matches = showAll || card.dataset.category === category;
    card.hidden = !matches;
    if (matches) visibleCount += 1;
  }

  for (const button of filterButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.filter === category));
  }

  filterStatus.textContent = showAll
    ? "tout le carnet, sans se presser"
    : `${visibleCount} ${visibleCount === 1 ? "petite chose" : "petites choses"} — ${categoryLabels[category]}`;
}

for (const button of filterButtons) {
  button.addEventListener("click", () => {
    const category = button.dataset.filter;
    filterWorks(category);

    if (category !== "tout") {
      document.querySelector("#archive-heading").scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    }
  });
}

for (const card of workCards) {
  card.addEventListener("click", () => {
    // The pile opens on page one; individual shapes are the cover, not page links.
    const firstWork = visibleWorks()[0];
    if (firstWork) openViewer(workCards.indexOf(firstWork));
  });
}

document.querySelector(".viewer-close").addEventListener("click", () => closeViewer());
previousButton.addEventListener("click", () => moveViewer(-1));
nextButton.addEventListener("click", () => moveViewer(1));

viewerArtwork.addEventListener("pointerdown", (event) => {
  swipeStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
  if (viewerArtwork.setPointerCapture) {
    viewerArtwork.setPointerCapture(event.pointerId);
  }
});

viewerArtwork.addEventListener("pointerup", (event) => {
  if (!swipeStart || swipeStart.pointerId !== event.pointerId) return;

  const deltaX = event.clientX - swipeStart.x;
  const deltaY = event.clientY - swipeStart.y;
  swipeStart = null;

  if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;
  // A left swipe advances to the next page; a right swipe returns to the previous one.
  moveViewer(deltaX < 0 ? 1 : -1);
});

viewerArtwork.addEventListener("pointercancel", () => {
  swipeStart = null;
});

document.addEventListener("keydown", (event) => {
  if (!archiveCluster.classList.contains("is-open")) return;

  if (event.key === "Escape") {
    event.preventDefault();
    closeViewer();
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    moveViewer(1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    moveViewer(-1);
  }
});

document.addEventListener("click", (event) => {
  if (!archiveCluster.classList.contains("is-open")) return;
  // Keep the viewer and its tile triggers interactive; every other click closes it.
  if (workViewer.contains(event.target) || event.target.closest(".work-card")) return;

  closeViewer(false);
});
