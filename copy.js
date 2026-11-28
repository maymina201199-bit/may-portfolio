// ===== העתקה: הסמן משתנה לאייקון של העתקה (מהפיגמה) =====
// מתי: כשהעכבר על המייל או על הטלפון, או על טקסט שסימנו (משפט, פסקה).
// לחיצה מעתיקה (המייל / הטלפון / הטקסט המסומן), ובמקום הסמן מופיע "copied!" ל-2 שניות.
// אחר כך חוזר הסמן הרגיל, עד שהעכבר יוצא ונכנס שוב. גם Cmd+C מציג "copied!".
// רק במחשב עם עכבר. בטלפון המייל והטלפון נשארים קישורים רגילים.
(function () {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (new URLSearchParams(location.search).has("edit")) return; // במצב עריכה בוחרים טקסט כדי לכתוב

  const COPIED_TIME = 2000;
  const cursor = document.createElement("div");
  cursor.className = "copy-cursor";
  cursor.innerHTML = '<img class="copy-cursor__icon" src="images/cursor-copy.svg" alt=""><span class="copy-cursor__text">copied!</span>';
  document.body.appendChild(cursor);

  let mouseX = -100, mouseY = -100;
  let copiedUntil = 0;     // עד מתי מציגים "copied!"
  let resting = false;     // אחרי העתקה: סמן רגיל עד שהעכבר יוצא מהמקום

  // המייל והטלפון (בעמוד הבית ובעמודי הפרויקטים)
  const contactOf = target => target && target.closest && target.closest(".project-contact");
  // האם העכבר על הטקסט המסומן
  function overSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) return false;
    for (let i = 0; i < selection.rangeCount; i++) {
      for (const box of selection.getRangeAt(i).getClientRects()) {
        if (mouseX >= box.left && mouseX <= box.right && mouseY >= box.top && mouseY <= box.bottom) return true;
      }
    }
    return false;
  }

  function update(target) {
    const now = Date.now();
    const onCopyable = !!contactOf(target) || overSelection();
    if (!onCopyable) resting = false;
    let state = "";
    if (now < copiedUntil) state = "copied";
    else if (onCopyable && !resting) state = "icon";
    cursor.dataset.state = state;
    document.body.classList.toggle("has-copy-cursor", state !== "");
  }

  function showCopied() {
    copiedUntil = Date.now() + COPIED_TIME;
    resting = true;
    update(document.elementFromPoint(mouseX, mouseY));
    setTimeout(() => update(document.elementFromPoint(mouseX, mouseY)), COPIED_TIME + 20);
  }
  function copy(text) {
    if (!text) return;
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
    showCopied();
  }

  document.addEventListener("mousemove", function (event) {
    mouseX = event.clientX;
    mouseY = event.clientY;
    cursor.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    update(event.target);
  });
  document.addEventListener("mouseleave", () => { cursor.dataset.state = ""; document.body.classList.remove("has-copy-cursor"); });
  document.addEventListener("selectionchange", () => update(document.elementFromPoint(mouseX, mouseY)));

  // לחיצה על המייל או על הטלפון: מעתיקים במקום לפתוח את תוכנת המייל / החיוג
  document.addEventListener("click", function (event) {
    const contact = contactOf(event.target);
    if (!contact) return;
    event.preventDefault();
    const href = contact.getAttribute("href") || "";
    copy(href.startsWith("mailto:") ? href.slice(7) : contact.textContent.trim());
  });
  // לחיצה על טקסט מסומן: מעתיקים אותו (ולא מבטלים את הסימון)
  document.addEventListener("mousedown", function (event) {
    if (event.button !== 0 || contactOf(event.target) || !overSelection()) return;
    event.preventDefault();
    copy(window.getSelection().toString().trim());
  });
  // Cmd+C / Ctrl+C
  document.addEventListener("copy", () => { if (window.getSelection().toString().trim()) showCopied(); });
})();
