// ===== לחיצה על פרויקט בעמוד הבית: חלון עם 4 דימויים =====
// בלחיצה נפתח מלבן לבן לרוחב באמצע המסך, ובתוכו 4 דימויים של הפרויקט עולים כמו באתר crxtianhub.com:
// כל דימוי מתחיל כריבוע קטן בתחתית החלון, עולה למקום שלו ונפתח לגודל מלא, אחד אחרי השני.
// כשהדימויים סיימו לעלות, ליד העכבר כתוב "scroll down", וגלילה למטה מעבירה לעמוד הפרויקט. Esc או לחיצה מחוץ לחלון סוגרים.

const projectLinks = [...document.querySelectorAll(".home-gallery__item[data-preview]")];
const bigScreen = window.matchMedia("(hover: hover) and (min-width: 701px)");
const LEAVE_DURATION = 500; // גוללים למטה: החלון נעלם ועוברים לעמוד הפרויקט

const win = document.querySelector(".pw");
const winBox = win.querySelector(".pw__box");
const scrollLabel = document.querySelector(".scroll-cursor");

let openUrl = null; // הכתובת של הפרויקט שפתוח בחלון, null = סגור
let readyTimer;     // מתי הדימויים סיימו לעלות ו-"scroll down" מופיע

// כמה זמן עד שהדימוי האחרון סיים לעלות (המספרים מ-styles.css)
function entryTime(count) {
  const style = getComputedStyle(document.documentElement);
  const ms = name => parseFloat(style.getPropertyValue(name));
  return ms("--pw-entry-delay") + (count - 1) * ms("--pw-entry-stagger") + ms("--pw-entry-duration");
}

// בונים את 4 הדימויים מחדש בכל פתיחה, כדי שהתנועה תתחיל מההתחלה
function fillWindow(link) {
  const images = link.dataset.preview.split(",").map(src => src.trim()).slice(0, 4);
  winBox.innerHTML = "";
  images.forEach(function (src, index) {
    const item = document.createElement("figure");
    item.className = "pw__item";
    item.style.setProperty("--pw-index", index); // כל דימוי מתחיל קצת אחרי הקודם
    item.innerHTML = `<span class="pw__number">${String(index + 1).padStart(2, "0")}_</span>` +
                     `<img class="pw__image" src="${src}" alt="">`;
    winBox.appendChild(item);
  });
}

function openWindow(link) {
  fillWindow(link);
  openUrl = link.getAttribute("href");
  document.body.classList.add("is-window-open");
  // "scroll down" ליד העכבר מופיע רק כשהדימויים סיימו לעלות
  clearTimeout(readyTimer);
  readyTimer = setTimeout(() => document.body.classList.add("is-window-ready"),
                          entryTime(winBox.children.length));
}

function closeWindow() {
  openUrl = null;
  clearTimeout(readyTimer);
  document.body.classList.remove("is-window-open", "is-window-ready");
  winBox.innerHTML = "";
}

function goToProject() {
  if (!openUrl || document.body.classList.contains("is-window-leaving")) return;
  document.body.classList.add("is-window-leaving");
  setTimeout(() => { window.location.href = openUrl; }, LEAVE_DURATION);
}

projectLinks.forEach(function (link) {
  link.addEventListener("click", function (event) {
    if (!bigScreen.matches) return; // בטלפון: ישר לעמוד הפרויקט
    event.preventDefault();
    openWindow(link);
  });
});

// לחיצה מחוץ לחלון סוגרת אותו, לחיצה בתוך החלון מעבירה לעמוד הפרויקט
win.addEventListener("click", function (event) {
  if (winBox.contains(event.target) || event.target === winBox) goToProject();
  else closeWindow();
});

// גלילה למטה (גלגלת, משטח מגע או מקלדת) כשהחלון פתוח: לעמוד הפרויקט
window.addEventListener("wheel", function (event) {
  if (openUrl && event.deltaY > 0) goToProject();
}, { passive: true });

document.addEventListener("keydown", function (event) {
  if (!openUrl) return;
  if (event.key === "Escape") closeWindow();
  if (["ArrowDown", "PageDown", " "].includes(event.key)) goToProject();
});

// חוזרים לעמוד הבית בכפתור "חזור" של הדפדפן: הדפדפן משחזר את העמוד בדיוק כמו שעזבנו אותו
// (עם החלון פתוח ונעלם), אז סוגרים את החלון ומחזירים את הגריד
window.addEventListener("pageshow", function () {
  document.body.classList.remove("is-window-leaving");
  closeWindow();
});

// "scroll down" ליד העכבר כשהחלון פתוח
document.addEventListener("mousemove", function (event) {
  scrollLabel.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
});
