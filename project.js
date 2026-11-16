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
