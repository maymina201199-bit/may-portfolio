// ===== כניסה לעמוד: 4 דימויים של הפרויקט עולים על המסך (כמו באתר crxtianhub.com) =====
// מסך שחור מעל העמוד. כל דימוי מתחיל כריבוע קטן בתחתית, עולה למקום שלו ונפתח,
// אחד אחרי השני. אחרי שכולם עלו, כל דימוי עף למקום שלו בעמוד והרקע השחור נעלם.
// לחיצה, גלילה או מקש מדלגים לשלב הזה.
// הדימויים: הדימוי הגדול של העמוד ו-3 הדימויים הראשונים שמתחתיו.
(function () {
  const projectPage = document.querySelector(".project-page");
  if (!projectPage || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // הדימויים בעמוד שאליהם 4 הדימויים יעופו בסוף
  const targets = [...projectPage.querySelectorAll(".project-intro__image, .project-images__image")].slice(0, 4);
  const sources = targets.map(img => img.getAttribute("src"));
  if (sources.length === 0) return;
  targets.forEach(img => img.removeAttribute("loading")); // שיהיו טעונים כשהדימויים מגיעים אליהם

  const entry = document.createElement("div");
  entry.className = "pw";
  entry.setAttribute("aria-hidden", "true");
  sources.forEach(function (src, index) {
    const item = document.createElement("figure");
    item.className = "pw__item";
    item.style.setProperty("--pw-index", index); // כל דימוי מתחיל קצת אחרי הקודם
    item.innerHTML = `<span class="pw__number">${String(index + 1).padStart(2, "0")}_</span>` +
                     `<img class="pw__image" src="${src}" alt="">`;
    entry.appendChild(item);
  });
  document.body.appendChild(entry);
  document.body.classList.add("is-entering");

  // כמה זמן עד שהדימוי האחרון סיים לעלות (המספרים מ-styles.css), ועוד רגע של עצירה
  const style = getComputedStyle(document.documentElement);
  const ms = name => parseFloat(style.getPropertyValue(name));
  const showFor = ms("--pw-entry-delay") + (sources.length - 1) * ms("--pw-entry-stagger") +
                  ms("--pw-entry-duration") + ms("--pw-hold");

  // כל דימוי עף מהמקום שלו במסך הכניסה למקום שלו בעמוד, והרקע השחור נעלם
  let done = false;
  function finish() {
    if (done) return;
    done = true;
    window.scrollTo(0, 0);
    document.body.classList.remove("is-entering");
    const items = [...entry.querySelectorAll(".pw__item")];
    const from = items.map(item => item.querySelector(".pw__image").getBoundingClientRect());
    items.forEach(function (item, i) {
      item.classList.add("is-flying");
      Object.assign(item.style, { left: from[i].left + "px", top: from[i].top + "px",
                                  width: from[i].width + "px", height: from[i].height + "px" });
    });
    requestAnimationFrame(() => requestAnimationFrame(function () {
      entry.classList.add("is-settling");
      items.forEach(function (item, i) {
        const to = targets[i].getBoundingClientRect();
        Object.assign(item.style, { left: to.left + "px", top: to.top + "px",
                                    width: to.width + "px", height: to.height + "px" });
      });
    }));
    setTimeout(() => entry.remove(), ms("--pw-leave-duration") + 50);
  }

  const timer = setTimeout(finish, showFor);
  const skip = () => { clearTimeout(timer); finish(); };
  entry.addEventListener("click", skip);
  window.addEventListener("wheel", skip, { once: true, passive: true });
  window.addEventListener("keydown", skip, { once: true });
})();

// ===== מפה קטנה של העמוד (minimap) =====
// בעמודי הפרויקטים: כשמתחילים לגלול, בפינה מופיעה גרסה קטנה של כל הדימויים בעמוד,
// ומסגרת לבנה מסמנת את מה שרואים עכשיו על המסך. לחיצה על המפה קופצת לאותו מקום.

const page = document.querySelector(".project-page");

if (page) {
  // בונים את המפה: עותק מוקטן של כל התוכן של העמוד
  const minimap = document.createElement("div");
  minimap.className = "minimap";
  minimap.setAttribute("aria-hidden", "true");

  const content = document.createElement("div");
  content.className = "minimap__content";
  const copy = page.cloneNode(true);
  copy.querySelectorAll("img").forEach(img => img.removeAttribute("loading"));
  content.appendChild(copy);

  const frame = document.createElement("div");
  frame.className = "minimap__frame";

  minimap.appendChild(content);
  minimap.appendChild(frame);
  document.body.appendChild(minimap);

  // אחרי כמה פיקסלים של גלילה המפה מופיעה
  const SHOW_AFTER_SCROLL = 10;

  function updateMinimap() {
    const mapWidth = minimap.clientWidth;
    const mapHeight = minimap.clientHeight;
    const pageBox = page.getBoundingClientRect();
    const pageTop = pageBox.top + window.scrollY;

    // פי כמה המפה קטנה מהעמוד האמיתי
    const scale = mapWidth / pageBox.width;
    copy.style.width = pageBox.width + "px";
    copy.style.transform = `scale(${scale})`;

    // המסגרת: החלק של העמוד שרואים עכשיו על המסך
    const frameTop = (window.scrollY - pageTop) * scale;
    const frameHeight = window.innerHeight * scale;
    const contentHeight = pageBox.height * scale;

    // כשהעמוד ארוך מהמפה, המפה עצמה זזה כדי שהמסגרת תישאר בתוכה
    const maxShift = Math.max(0, contentHeight - mapHeight);
    const shift = Math.min(maxShift, Math.max(0, frameTop - (mapHeight - frameHeight) / 2));
    content.style.transform = `translateY(${-shift}px)`;
    frame.style.transform = `translateY(${frameTop - shift}px)`;
    frame.style.height = frameHeight + "px";

    minimap.classList.toggle("is-visible", window.scrollY > SHOW_AFTER_SCROLL);
    minimap.dataset.scale = scale;
    minimap.dataset.shift = shift;
  }

  // לחיצה על המפה: גוללים כך שהמקום שנלחץ יהיה באמצע המסך
  minimap.addEventListener("click", function (event) {
    const scale = Number(minimap.dataset.scale);
    const shift = Number(minimap.dataset.shift);
    const clickY = event.clientY - minimap.getBoundingClientRect().top + shift;
    const pageTop = page.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: pageTop + clickY / scale - window.innerHeight / 2, behavior: "smooth" });
  });

  window.addEventListener("scroll", updateMinimap, { passive: true });
  window.addEventListener("resize", updateMinimap);
  window.addEventListener("load", updateMinimap); // אחרי שכל הדימויים נטענו, העמוד באורך הסופי
  updateMinimap();
}
