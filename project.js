// מצב עריכה (?edit בכתובת, נפתח מעמוד הניהול covers.html): העמוד נראה כמו באתר,
// ועליו כלים לעריכת הגריד. במצב הזה מדלגים על הכניסה, ההגדלה בלחיצה והסמן המיוחד
const EDIT_MODE = new URLSearchParams(location.search).has("edit");
if (EDIT_MODE) {
  const editorScript = document.createElement("script");
  editorScript.src = "admin-edit.js?v=" + (new URL(document.currentScript.src).searchParams.get("v") || Date.now());
  document.body.appendChild(editorScript);
}

// ===== כניסה לעמוד: 4 דימויים של הפרויקט עולים על המסך (כמו באתר crxtianhub.com) =====
// מסך שחור מעל העמוד. כל דימוי מתחיל כריבוע קטן בתחתית, עולה למקום שלו ונפתח,
// אחד אחרי השני. אחרי שכולם עלו, כל דימוי עף למקום שלו בעמוד והרקע השחור נעלם.
// לחיצה, גלילה או מקש מדלגים לשלב הזה.
// הדימויים: הדימוי הגדול של העמוד ו-3 הדימויים הראשונים שמתחתיו.
(function () {
  const projectPage = document.querySelector(".project-page");
  if (!projectPage || EDIT_MODE || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // הדימויים בעמוד שאליהם 4 הדימויים יעופו בסוף
  const targets = [...projectPage.querySelectorAll(".project-intro__image, .project-images__image")].slice(0, 4);
  const sources = targets.map(el => el.tagName === "VIDEO" ? el.getAttribute("poster") : el.getAttribute("src"));
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
const PROJECT_ORDER = ["manyone", "modern-warfare", "hevel", "eat-and-drink", "sabra", "sela", "portrait", "1984-2025", "lifta"];

if (page) {
  // בונים את המפה: עותק מוקטן של כל התוכן של העמוד
  const minimap = document.createElement("div");
  minimap.className = "minimap";
  minimap.setAttribute("aria-hidden", "true");

  const content = document.createElement("div");
  content.className = "minimap__content";
  const copy = page.cloneNode(true);
  copy.querySelectorAll("img").forEach(img => img.removeAttribute("loading"));
  // בעותק המוקטן סרטונים לא מתנגנים ולא נטענים: רואים רק את תמונת הפתיחה שלהם
  copy.querySelectorAll("video").forEach(function (video) {
    video.removeAttribute("autoplay");
    video.removeAttribute("data-autoplay");
    video.removeAttribute("src");
    video.preload = "none";
  });
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
  // אותו מספר גרסה כמו בקישור ל-project.js, כדי שהדפדפן יטען את העמוד הבא בגרסה החדשה
  const versionMatch = (document.querySelector('script[src*="project.js"]') || {}).src?.match(/v=([^&]+)/);
  nextLink.href = next + ".html" + (versionMatch ? "?v=" + versionMatch[1] : "");
  nextLink.textContent = "Next project";

  // המפה והכפתור יחד, בפינה הימנית התחתונה.
  // הכפתור עצמו יושב ישר בעמוד (לא בתוך הפאנל), כדי שהצבע שלו יתהפך לפי מה שמאחוריו,
  // ובפאנל יש במקומו ריבוע ריק באותו גודל
  const dock = document.createElement("div");
  dock.className = "project-dock";
  dock.appendChild(minimap);
  const nextSpace = document.createElement("div");
  nextSpace.className = "project-dock__next-space";
  dock.appendChild(nextSpace);
  document.body.appendChild(dock);
  document.body.appendChild(nextLink);

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
    nextLink.classList.toggle("is-visible", window.scrollY > SHOW_AFTER_SCROLL);
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
// רק גדול, על רקע שחור. כשהוא פתוח מדפדפים בין כל הדימויים של העמוד:
// לחיצה על הצד הימני של המסך = הדימוי הבא, על הצד השמאלי = הקודם (וגם החיצים במקלדת,
// או החלקה הצידה בטלפון). לחיצה על הרקע השחור, Esc או גלילה סוגרים
(function () {
  const projectPage = document.querySelector(".project-page");
  if (!projectPage || EDIT_MODE) return;

  const viewer = document.createElement("div");
  viewer.className = "image-viewer";
  viewer.innerHTML = '<div class="image-viewer__box"><img class="image-viewer__image" alt=""></div>';
  document.body.appendChild(viewer);
  const viewerBox = viewer.querySelector(".image-viewer__box");
  const viewerImage = viewer.querySelector("img");

  // כל הדימויים בעמוד, לפי הסדר (בלי סרטונים, שמתנגנים במקום)
  const images = [...projectPage.querySelectorAll(".project-intro__image, .project-images__image")]
    .filter(el => el.tagName === "IMG" && !el.closest(".minimap"));
  let currentIndex = 0;

  function open(img) {
    currentIndex = Math.max(0, images.indexOf(img));
    // הצורה של המשבצת בעמוד (או של הדימוי עצמו, אם אין לו משבצת)
    const slot = img.closest(".tile, .project-intro__frame") || img;
    const box = slot.getBoundingClientRect();
    viewerBox.style.setProperty("--viewer-ratio", box.width / box.height);
    viewerImage.src = img.tagName === "VIDEO" ? img.poster : (img.currentSrc || img.src); // סרטון: תמונת הפתיחה שלו
    viewerImage.style.cssText = img.style.cssText;                // אותו חיתוך, זום והטיה (--dx, --dy, --rot, --zoom)
    viewer.classList.add("is-open");
  }

  function close() {
    viewer.classList.remove("is-open");
  }

  // מעבר לדימוי הבא (+1) או הקודם (-1). אחרי האחרון חוזרים לראשון
  function step(direction) {
    if (!images.length) return;
    open(images[(currentIndex + direction + images.length) % images.length]);
  }

  projectPage.querySelectorAll(".project-intro__image, .project-images__image").forEach(function (img) {
    img.addEventListener("click", function () {
      if (img.tagName === "VIDEO") {
        // סרטון: לחיצה עוצרת או מפעילה אותו (ולא פותחת אותו בגדול)
        if (img.paused) {
          delete img.dataset.userPaused;
          img.play().catch(function () {});
        } else {
          img.dataset.userPaused = "true"; // שהקוד שמפעיל סרטונים לבד לא יפעיל אותו שוב
          img.pause();
        }
        return;
      }
      open(img);
    });
  });

  // לחיצה על הדימוי: צד ימין של המסך = הבא, צד שמאל = הקודם. לחיצה על הרקע: סגירה
  viewer.addEventListener("click", function (event) {
    if (swiped) { swiped = false; return; }
    if (!event.target.closest(".image-viewer__box")) { close(); return; }
    step(event.clientX < window.innerWidth / 2 ? -1 : 1);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") close();
    if (!viewer.classList.contains("is-open")) return;
    if (event.key === "ArrowRight") step(1);
    if (event.key === "ArrowLeft") step(-1);
  });
  // בטלפון: החלקה שמאלה = הבא, החלקה ימינה = הקודם
  let touchX = null, swiped = false;
  viewer.addEventListener("touchstart", event => { touchX = event.touches[0].clientX; }, { passive: true });
  viewer.addEventListener("touchend", function (event) {
    if (touchX === null) return;
    const dx = event.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 40) { swiped = true; step(dx < 0 ? 1 : -1); setTimeout(() => { swiped = false; }, 400); }
  });
  window.addEventListener("wheel", close, { passive: true });
})();

// ===== סידור שורות בטקסט של הפרויקט =====
// אף פעם לא נשארת מילה לבד בשורה, והשורות מתחלפות כמה שאפשר: קצרה, ארוכה, קצרה, ארוכה.
// הסידור מחושב מחדש בכל גודל מסך (גם בטלפון).
(function () {
  const SHORT_LINE = 0.72; // שורה "קצרה" היא בערך 72% מהרוחב
  const blocks = [...document.querySelectorAll(".project-intro__description")];
  if (!blocks.length || EDIT_MODE) return; // במצב עריכה הטקסט נשאר כמו שהוא, כדי שאפשר יהיה לערוך אותו

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

// ===== הפעלה אוטומטית של סרטונים (כמו בעמוד הבית) =====
(function () {
  function playAllVideos() {
    document.querySelectorAll("video[autoplay]").forEach(function (video) {
      video.muted = true;
      if (video.paused && !video.dataset.userPaused) video.play().catch(function () {});
    });
  }
  playAllVideos();
  document.addEventListener("touchstart", playAllVideos, { once: true, passive: true });
  document.addEventListener("click", playAllVideos, { once: true });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) playAllVideos(); });
})();

// ===== הסמן מעל דימויים וסרטונים (האייקונים מהפיגמה) =====
// מעל דימוי: פלוס (לחיצה מגדילה). בדימוי הגדול: הריבוע עם החץ מעמוד הבית, שמצביע ימינה (הבא)
// או שמאלה (הקודם) לפי הצד של המסך. על הרקע השחור מסביב: מינוס (לחיצה סוגרת).
// מעל סרטון: שני קווים כשהוא מתנגן (לחיצה עוצרת), משולש כשהוא עצור (לחיצה מפעילה).
// כמו הסמן בעמוד הבית: קווים לבנים שהופכים לשחורים על רקע בהיר
(function () {
  if (EDIT_MODE || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return; // רק במחשב עם עכבר

  const cursor = document.createElement("div");
  cursor.className = "media-cursor";
  cursor.innerHTML = '<img class="media-cursor__icon" alt=""><span class="media-cursor__arrow"><img src="images/arrow-right.png" alt=""></span>';
  document.body.appendChild(cursor);
  const icon = cursor.querySelector(".media-cursor__icon");

  const ICONS = {
    "zoom-in": "images/cursor-zoom-in.svg",
    "zoom-out": "images/cursor-zoom-out.svg",
    play: "images/cursor-play.svg",
    pause: "images/cursor-pause.svg",
  };
  let current = "";
  let lastTarget = null;

  function update(target) {
    lastTarget = target;
    let kind = "";
    if (target && target.closest(".image-viewer.is-open .image-viewer__box")) {
      kind = mouseX < window.innerWidth / 2 ? "prev" : "next";
    } else if (target && target.closest(".image-viewer.is-open")) {
      kind = "zoom-out";
    } else if (target && !target.closest(".minimap")) {
      const media = target.closest(".project-page .project-intro__image, .project-page .project-images__image");
      if (media) kind = media.tagName === "VIDEO" ? (media.paused ? "play" : "pause") : "zoom-in";
    }
    if (kind !== current) {
      current = kind;
      cursor.dataset.kind = kind;
      if (ICONS[kind]) icon.src = ICONS[kind];
    }
    document.body.classList.toggle("has-media-cursor", kind !== "");
  }

  let mouseX = 0, mouseY = 0;
  document.addEventListener("mousemove", function (event) {
    mouseX = event.clientX;
    mouseY = event.clientY;
    cursor.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    update(event.target);
  });
  // אחרי לחיצה (עצירה/הפעלה, פתיחה/סגירה) האייקון מתעדכן מיד לפי מה שמתחת לעכבר
  document.addEventListener("click", function () {
    setTimeout(() => update(document.elementFromPoint(mouseX, mouseY)), 0);
  });
  document.addEventListener("mouseleave", () => update(null));
  document.querySelectorAll("video").forEach(function (video) {
    video.addEventListener("play", () => update(lastTarget));
    video.addEventListener("pause", () => update(lastTarget));
  });
})();

// ===== סרטונים בפיד: נטענים ומתנגנים רק כשהם קרובים למסך =====
// (data-autoplay במקום autoplay) כך שהעמוד לא מוריד את כל הסרטונים בבת אחת.
// סרטון שיוצא מהמסך נעצר, וכשחוזרים אליו הוא ממשיך. סרטון שעצרו בלחיצה נשאר עצור.
(function () {
  const videos = [...document.querySelectorAll(".project-page video[data-autoplay]")].filter(v => !v.closest(".minimap"));
  if (!videos.length || !("IntersectionObserver" in window)) {
    videos.forEach(video => { video.muted = true; video.play().catch(function () {}); });
    return;
  }
  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      const video = entry.target;
      if (entry.isIntersecting) {
        if (!video.dataset.userPaused) {
          video.muted = true;
          video.play().catch(function () {});
        }
      } else if (!video.paused) {
        video.pause();
      }
    });
  }, { rootMargin: "300px 0px" }); // מתחילים לטעון קצת לפני שהסרטון נכנס למסך
  videos.forEach(video => observer.observe(video));
})();
