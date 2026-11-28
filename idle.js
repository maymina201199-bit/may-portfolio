// ===== שומר מסך: אם לא נגעו באתר 40 שניות, רצה הפתיחה (האותיות המתחלפות של "may mina") =====
// האותיות מתחלפות בלי הפסקה עד שנוגעים: תזוזה של העכבר, גלילה, לחיצה, מקלדת או נגיעה במסך.
// אז המסך נעלם בהדרגה, והספירה של 40 השניות מתחילה מחדש.
// משתמש באותו עיצוב כמו הפתיחה בעמוד הבית (.intro). לא פועל בעמוד הניהול ובמצב עריכה.
(function () {
  if (new URLSearchParams(location.search).has("edit")) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // מי שביקש פחות אנימציות

  const IDLE_TIME = 40000;   // 40 שניות בלי מגע
  const LETTERS = ["m", "a", "y", "m", "i", "n", "a"];
  const LETTER_SPEED = 100;  // כמו בפתיחה: כל אות 0.1 שנייה
  const FADE_DURATION = 500;

  let idleTimer = null;
  let screen = null;      // מסך הפתיחה, כשהוא מוצג
  let letterTimer = null;

  function show() {
    // אם הפתיחה של עמוד הבית עוד על המסך, לא מוסיפים עוד אחת
    if (screen || document.querySelector(".intro:not(.is-hidden)")) return;
    screen = document.createElement("div");
    screen.className = "intro is-hidden";
    screen.setAttribute("aria-hidden", "true");
    screen.innerHTML = '<span class="intro__letter">m</span>';
    document.body.appendChild(screen);
    requestAnimationFrame(() => requestAnimationFrame(() => screen && screen.classList.remove("is-hidden"))); // נכנס בהדרגה
    const letter = screen.querySelector(".intro__letter");
    let index = 0;
    letterTimer = setInterval(function () {
      index = (index + 1) % LETTERS.length;
      letter.textContent = LETTERS[index];
    }, LETTER_SPEED);
  }

  function hide() {
    if (!screen) return;
    const leaving = screen;
    screen = null;
    clearInterval(letterTimer);
    leaving.classList.add("is-hidden");
    setTimeout(() => leaving.remove(), FADE_DURATION);
  }

  // כל מגע: מסתירים את המסך (אם הוא מוצג) ומתחילים לספור מחדש
  function wake() {
    hide();
    clearTimeout(idleTimer);
    idleTimer = setTimeout(show, IDLE_TIME);
  }
  ["mousemove", "mousedown", "wheel", "scroll", "keydown", "touchstart", "pointerdown"].forEach(function (name) {
    window.addEventListener(name, wake, { passive: true, capture: true });
  });
  wake();
})();
