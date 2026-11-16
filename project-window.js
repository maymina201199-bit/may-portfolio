// ===== לחיצה על פרויקט בעמוד הבית: חלון הפרויקט (כמו באתר crxtianhub.com) =====
// הדימוי שנלחץ גדל מהמקום שלו בגריד לאמצע המסך, ושאר הגריד נופל למטה ונעלם.
// מעל הדימוי שם הפרויקט באותיות בתוך ריבועים, שמופיעות בסדר אקראי, ומתחתיו התחום.
// מימין דימויים קטנים של הפרויקט (לחיצה מחליפה את הדימוי הגדול), ובצדדים PREVIOUS / NEXT.
// ליד העכבר כתוב "scroll down", וגלילה למטה מעבירה לעמוד הפרויקט. Esc סוגר.

const projectLinks = [...document.querySelectorAll(".home-gallery__item[data-preview]")];
const bigScreen = window.matchMedia("(hover: hover) and (min-width: 701px)");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const GROW_DURATION = 900;   // הדימוי גדל מהגריד לאמצע המסך
const LEAVE_DURATION = 500;  // גוללים למטה: החלון נעלם ועוברים לעמוד הפרויקט
const EASING = "cubic-bezier(0.22, 0.65, 0.3, 1)";

const win = document.querySelector(".pw");
const winIndex = win.querySelector(".pw__index");
const winTitle = win.querySelector(".pw__title");
const winMeta = win.querySelector(".pw__meta");
const winImage = win.querySelector(".pw__image");
const winThumbs = win.querySelector(".pw__thumbs");
const scrollLabel = document.querySelector(".scroll-cursor");

let current = -1; // איזה פרויקט פתוח בחלון (מספר ברשימה), -1 = סגור

// המידע על פרויקט: מהקישור בגריד ומהשם שמתחת לדימויים
function projectInfo(index) {
  const link = projectLinks[index];
  const row = link.closest(".home-row");
  const position = [...row.querySelectorAll(".home-gallery__item")].indexOf(link);
  const fullName = row.querySelectorAll(".home-titles__name")[position].textContent.trim();
  const slash = fullName.indexOf(" /");
  return {
    link,
    url: link.getAttribute("href"),
    images: link.dataset.preview.split(",").map(src => src.trim()),
    name: slash > -1 ? fullName.slice(0, slash) : fullName,
    category: slash > -1 ? fullName.slice(slash + 2) : "",
  };
}

// שם הפרויקט: כל אות בריבוע משלה, והאותיות מופיעות בסדר אקראי
function buildTitle(name) {
  winTitle.innerHTML = "";
  name.toUpperCase().split(" ").forEach(function (word) {
    const line = document.createElement("span");
    line.className = "pw__word";
    [...word].forEach(function (letter) {
      const box = document.createElement("span");
      box.className = "pw__letter";
      box.textContent = letter;
      box.style.animationDelay = Math.round(150 + Math.random() * 450) + "ms";
      line.appendChild(box);
    });
    winTitle.appendChild(line);
  });
}

function buildThumbs(info) {
  winThumbs.innerHTML = "";
  info.images.forEach(function (src, i) {
    const thumb = document.createElement("button");
    thumb.type = "button";
    thumb.className = "pw__thumb" + (i === 0 ? " is-active" : "");
    thumb.innerHTML = `<img src="${src}" alt="">`;
    thumb.addEventListener("click", function () {
      winImage.src = src;
      winThumbs.querySelectorAll(".pw__thumb").forEach(t => t.classList.toggle("is-active", t === thumb));
    });
    winThumbs.appendChild(thumb);
  });
}

function fillWindow(index) {
  const info = projectInfo(index);
  current = index;
  winIndex.textContent = String(index + 1).padStart(2, "0") + "_";
  buildTitle(info.name);
  winMeta.textContent = info.category;
  winImage.src = info.images[0];
  buildThumbs(info);
  // מפעילים מחדש את האנימציות של הכותרת והפרטים
  win.classList.remove("is-filled");
  void win.offsetWidth;
  win.classList.add("is-filled");
}

// הדימוי גדל מהמקום שלו בגריד למקום שלו בחלון
function growFrom(cell) {
  if (reduceMotion) return;
  const from = cell.getBoundingClientRect();
  const to = winImage.getBoundingClientRect();
  const moveX = from.left - to.left;
  const moveY = from.top - to.top;
  winImage.animate(
    [
      { transformOrigin: "top left", transform: `translate(${moveX}px, ${moveY}px) scale(${from.width / to.width}, ${from.height / to.height})` },
      { transformOrigin: "top left", transform: "none" },
    ],
    { duration: GROW_DURATION, easing: EASING }
  );
}

function openWindow(index) {
  fillWindow(index);
  document.body.classList.add("is-window-open");
  growFrom(projectLinks[index]);
}

function closeWindow() {
  current = -1;
  document.body.classList.remove("is-window-open");
  win.classList.remove("is-filled");
}

function goToProject() {
  if (current < 0 || document.body.classList.contains("is-window-leaving")) return;
  const url = projectInfo(current).url;
  document.body.classList.add("is-window-leaving");
  setTimeout(() => { window.location.href = url; }, LEAVE_DURATION);
}

// PREVIOUS / NEXT: הפרויקט הקודם או הבא בתוך החלון
function step(direction) {
  if (current < 0) return;
  fillWindow((current + direction + projectLinks.length) % projectLinks.length);
}

projectLinks.forEach(function (link, index) {
  link.addEventListener("click", function (event) {
    if (!bigScreen.matches) return; // בטלפון: ישר לעמוד הפרויקט
    event.preventDefault();
    openWindow(index);
  });
});

win.querySelector(".pw__prev").addEventListener("click", () => step(-1));
win.querySelector(".pw__next").addEventListener("click", () => step(1));
winImage.addEventListener("click", goToProject);

// לחיצה על הרקע (לא על דימוי, דימוי קטן או כפתור) סוגרת את החלון
win.addEventListener("click", function (event) {
  if (event.target === win) closeWindow();
});

// גלילה למטה (גלגלת, משטח מגע או מקלדת) כשהחלון פתוח: לעמוד הפרויקט
window.addEventListener("wheel", function (event) {
  if (current >= 0 && event.deltaY > 0) goToProject();
}, { passive: true });

document.addEventListener("keydown", function (event) {
  if (current < 0) return;
  if (event.key === "Escape") closeWindow();
  if (event.key === "ArrowLeft") step(-1);
  if (event.key === "ArrowRight") step(1);
  if (["ArrowDown", "PageDown", " "].includes(event.key)) goToProject();
});

// "scroll down" ליד העכבר כשהחלון פתוח
document.addEventListener("mousemove", function (event) {
  scrollLabel.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
});
