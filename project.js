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
    const to = targets.map(img => img.getBoundingClientRect());
    const easing = style.getPropertyValue("--pw-fly-easing").trim();

    // FLIP: שמים כל דימוי ישר בגודל ובמקום של היעד, ואז מתחילים אותו
    // מהגודל והמקום שהיה בו (בעזרת transform ו-clip-path) ונותנים לו לחזור ליעד
    items.forEach(function (item, i) {
      const f = from[i], t = to[i];
      item.classList.add("is-flying");
      Object.assign(item.style, { left: t.left + "px", top: t.top + "px",
                                  width: t.width + "px", height: t.height + "px" });
      const scale = Math.max(f.width / t.width, f.height / t.height);
      const insetX = Math.max(0, (t.width - f.width / scale) / 2);
      const insetY = Math.max(0, (t.height - f.height / scale) / 2);
      const moveX = (f.left + f.width / 2) - (t.left + t.width / 2);
      const moveY = (f.top + f.height / 2) - (t.top + t.height / 2);
      item.animate([
        { transform: `translate(${moveX}px, ${moveY}px) scale(${scale})`,
          clipPath: `inset(${insetY}px ${insetX}px)` },
        { transform: "none", clipPath: "inset(0px 0px)" },
      ], { duration: ms("--pw-leave-duration"), easing, fill: "both" });
    });
    entry.classList.add("is-settling");
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
// מתחת למפה יש כפתור "Next project" לפרויקט הבא.

const page = document.querySelector(".project-page");

// הסדר של עמודי הפרויקטים, כמו בגריד בעמוד הבית. "Next project" מוביל לבא אחריו
const PROJECT_ORDER = ["modern-warfare", "hevel", "sabra", "portrait", "sela", "lifta",
                       "1984-2025", "eat-and-drink"];

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

  // הכפתור "Next project" מתחת למפה
  const current = location.pathname.split("/").pop().replace(".html", "");
  const next = PROJECT_ORDER[(PROJECT_ORDER.indexOf(current) + 1) % PROJECT_ORDER.length];
  const nextLink = document.createElement("a");
  nextLink.className = "next-project";
  nextLink.href = next + ".html";
  nextLink.textContent = "Next project";

  // המפה והכפתור יחד, בפינה הימנית התחתונה
  const dock = document.createElement("div");
  dock.className = "project-dock";
  dock.appendChild(minimap);
  dock.appendChild(nextLink);
  document.body.appendChild(dock);

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

    dock.classList.toggle("is-visible", window.scrollY > SHOW_AFTER_SCROLL);
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

// ===== לחיצה על דימוי: הוא נפתח בגדול על כל המסך =====
// הדימוי נפתח בדיוק עם החיתוך שיש לו בעמוד (אותה צורה, אותו זום ואותה הטיה),
// רק גדול, על רקע שחור. לחיצה נוספת, Esc או גלילה סוגרים
(function () {
  const projectPage = document.querySelector(".project-page");
  if (!projectPage) return;

  const viewer = document.createElement("div");
  viewer.className = "image-viewer";
  viewer.innerHTML = '<div class="image-viewer__box"><img class="image-viewer__image" alt=""></div>';
  document.body.appendChild(viewer);
  const viewerBox = viewer.querySelector(".image-viewer__box");
  const viewerImage = viewer.querySelector("img");

  function open(img) {
    // הצורה של המשבצת בעמוד (או של הדימוי עצמו, אם אין לו משבצת)
    const slot = img.closest(".tile, .project-intro__frame") || img;
    const box = slot.getBoundingClientRect();
    viewerBox.style.setProperty("--viewer-ratio", box.width / box.height);
    viewerImage.src = img.currentSrc || img.src;
    viewerImage.style.cssText = img.style.cssText;                // אותו חיתוך, זום והטיה (--dx, --dy, --rot, --zoom)
    viewer.classList.add("is-open");
  }

  function close() {
    viewer.classList.remove("is-open");
  }

  projectPage.querySelectorAll(".project-intro__image, .project-images__image").forEach(function (img) {
    img.addEventListener("click", () => open(img));
  });

  viewer.addEventListener("click", close);
  document.addEventListener("keydown", event => { if (event.key === "Escape") close(); });
  window.addEventListener("wheel", close, { passive: true });
})();

// ===== סידור שורות בטקסט של הפרויקט =====
// אף פעם לא נשארת מילה לבד בשורה, והשורות מתחלפות כמה שאפשר: קצרה, ארוכה, קצרה, ארוכה.
// הסידור מחושב מחדש בכל גודל מסך (גם בטלפון).
(function () {
  const SHORT_LINE = 0.72; // שורה "קצרה" היא בערך 72% מהרוחב
  const blocks = [...document.querySelectorAll(".project-intro__description")];
  if (!blocks.length) return;

  // שומרים את המילים המקוריות של כל טקסט (בלי שבירות שורה ידניות). שורת הקרדיט נשארת כמו שהיא
  blocks.forEach(function (block) {
    const credit = block.querySelector(".project-intro__credit");
    if (credit) credit.remove();
    block.dataset.words = JSON.stringify(
      block.innerHTML.replace(/<br\s*\/?>/gi, " ").trim().split(/\s+/).filter(Boolean));
    block.credit = credit;
  });

  function balance(block) {
    const words = JSON.parse(block.dataset.words);
    const maxWidth = block.clientWidth - 2;

    // מודדים כל מילה ואת הרווח, באותו פונט של הטקסט
    const probe = document.createElement("span");
    probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap";
    block.appendChild(probe);
    const width = words.map(w => { probe.innerHTML = w; return probe.getBoundingClientRect().width; });
    probe.innerHTML = "a&nbsp;a"; const withSpace = probe.getBoundingClientRect().width;
    probe.innerHTML = "aa"; const space = withSpace - probe.getBoundingClientRect().width;
    probe.remove();

    const lineWidth = (i, j) => width.slice(i, j).reduce((a, b) => a + b, 0) + space * (j - i - 1);

    // מחפשים את החלוקה הכי טובה לשורות: כל שורה לפחות 2 מילים ולא רחבה מהטקסט,
    // והשורות קרובות לסירוגין לאורך "קצר" ו"ארוך". הזיכרון (cache) לפי מיקום ושורה זוגית/אי־זוגית
    const n = words.length;
    const cache = new Map();
    function solve(i, lineNo) {
      const key = i * 2 + (lineNo % 2);
      if (cache.has(key)) return cache.get(key);
      if (i === n) return { cost: 0, breaks: [] };
      let result = { cost: Infinity, breaks: [] };
      for (let j = i + 2; j <= n; j++) {
        if (n - j === 1) continue;
        const w = lineWidth(i, j);
        if (w > maxWidth) break;
        const target = (lineNo % 2 === 0 ? SHORT_LINE : 1) * maxWidth;
        const cost = j === n ? 0 : Math.pow((target - w) / maxWidth, 2) * 100;
        const rest = solve(j, lineNo + 1);
        if (cost + rest.cost < result.cost) result = { cost: cost + rest.cost, breaks: [j, ...rest.breaks] };
      }
      cache.set(key, result);
      return result;
    }

    const { breaks, cost } = solve(0, 0);
    if (!isFinite(cost)) {                    // אם אי אפשר (טקסט קצר מאוד), רק מחברים את שתי המילים האחרונות
      block.innerHTML = words.slice(0, -1).join(" ") + "&nbsp;" + words[words.length - 1];
    } else {
      let start = 0;
      block.innerHTML = breaks.map(end => {
        const line = words.slice(start, end).join(" ");
        start = end;
        return `<span class="balanced-line">${line}</span>`;
      }).join("");
    }
    if (block.credit) block.appendChild(block.credit);
  }

  const run = () => blocks.forEach(balance);
  document.fonts.ready.then(run);
  let timer;
  window.addEventListener("resize", () => { clearTimeout(timer); timer = setTimeout(run, 100); });
})();
