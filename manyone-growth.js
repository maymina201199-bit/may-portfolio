// הגרף המונפש של הצמיחה באינסטגרם (3 חודשים) בעמוד של Manyone.
// במחשב: הגרף משמאל והמספרים מימין לו, במיקום כמו בפיגמה. בטלפון: המספרים מתחת לגרף.
// האנימציה מתחילה כשהגרף מגיע למסך, חוזרת על עצמה, ונעצרת כשהוא לא נראה.
(function () {
  const cv = document.getElementById("growth-chart");
  if (!cv) return;
  // עוד אין נתונים (data-empty): הגרף לא מוצג באתר עד שממלאים אותם בעמוד הניהול
  if (cv.dataset.empty) { cv.closest(".project-stats").classList.add("is-empty"); return; }
  const ctx = cv.getContext("2d");
  const DURATION = 9; // שניות
  const FONT = '"Polymath Display", Arial, sans-serif'; // הפונט של הכותרות באתר

  // ---------- הנתונים: מה-canvas בעמוד (data-...), כך שלכל עמוד סושיאל יש נתונים משלו.
  // עורכים אותם בעמוד הניהול. בלי נתונים: הנתונים של Manyone ----------
  const d = cv.dataset;
  const num = (value, fallback) => { const n = parseFloat(value); return isNaN(n) ? fallback : n; };
  const decimals = (value, fallback) => (String(value || fallback).split(".")[1] || "").length;
  const PLATFORM = (d.platform || "INSTAGRAM").toUpperCase();
  const MONTHS = Math.max(1, Math.round(num(d.months, 3)));
  const TOTAL = num(d.total, 68.7), TOTAL_DEC = decimals(d.total, "68.7"), UNIT = d.unit !== undefined ? d.unit : "K";
  const VIEWS = num(d.views, 1614.1);
  const GROWTH = Math.max(1.05, 1 + VIEWS / 100); // כמה פעמים העקומה עולה מההתחלה עד הסוף

  // ---------- העקומה: 90 ימים של צמיחה, עד הצמיחה של הצפיות ----------
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const N = 90, raw = [];
  for (let i = 0; i < N; i++) {
    const x = i / (N - 1);
    const base = 1 + (GROWTH - 1) * (Math.exp(3.2 * x) - 1) / (Math.exp(3.2) - 1);
    raw.push(base * (1 + (rnd() - 0.5) * 0.28) + (i % 7 === 5 ? base * 0.12 : 0));
  }
  const pts = raw.map((v, i) => {
    let s = 0, c = 0;
    for (let k = -2; k <= 2; k++) { const j = i + k; if (j >= 0 && j < N) { s += raw[j]; c++; } }
    return s / c;
  });
  pts[0] = 1; pts[N - 1] = GROWTH;
  const maxV = Math.max(GROWTH, ...pts);

  const stats = [
    { v: VIEWS,                        dec: decimals(d.views, "1614.1"),        label: "views" },
    { v: num(d.viewers, 4815),         dec: decimals(d.viewers, "4815"),        label: "viewers" },
    { v: num(d.nonfollowers, 852.2),   dec: decimals(d.nonfollowers, "852.2"),  label: "non-follower views" },
  ];


  // ---------- עזרים ----------
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (t, start, dur) => clamp((t - start) / dur);
  const easeOut = p => 1 - Math.pow(1 - p, 3);
  const easeOutExpo = p => p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
  const easeInOut = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  const fmt = (v, dec) => v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const HERO_TEXT = `${fmt(TOTAL, TOTAL_DEC)}${UNIT}`; // המספר הגדול, למשל 68.7K

  function text(str, x, y, size, alpha, align = "left") {
    ctx.font = `${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillText(str, x, y);
  }
  function hline(x1, x2, y, alpha, w = 1) {
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
  }

  // ---------- המיקומים (בפיקסלים של המסך) ----------
  let L = {};

  // המיקומים לקוחים מהפיגמה (עמוד ברוחב 1440): הגרף מתחיל ב-726 ונגמר ב-1118,
  // המספרים בין 1193 ל-1416. הגבהים נמדדים מהשורה הראשונה של הטקסט משמאל (315 בפיגמה)
  function layout() {
    const cw = cv.clientWidth;
    const baseFS = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--home-text-size")) || 15; // כמו "manyone TLV"
    const wide = cw >= 500; // במחשב: המספרים מימין לגרף. בטלפון: מתחת
    const l = { cw, wide };
    ctx.textAlign = "left"; // המדידות של הטקסט למטה מניחות יישור לשמאל

    if (wide) {
      const u = cw / 706; // פיקסל אחד של הפיגמה, על המסך (העמודה: 720 עד 1426)
      const FS = baseFS * Math.min(1, u);
      l.FS = FS;
      // הגרף מתחיל בדיוק בקו של "SM / PHOTOGRAPHY", והמספר הגדול בדיוק בקו של מספר הטלפון
      const left = cv.getBoundingClientRect().left;
      const title = document.querySelector(".project-meta--title"); // "manyone TLV"
      const phone = document.querySelector(".project-contact--phone");
      l.X0 = 0; // הגרף מתחיל בקצה של העמודה הימנית
      l.X1 = l.X0 + 392 * u;
      // INSTAGRAM / 3 MONTHS: על אותו קו כמו "manyone TLV" (ה-canvas עולה למעלה עד לשם)
      l.yB = 2 * u;
      if (title && title.firstChild) {
        const range = document.createRange();
        range.selectNodeContents(title);
        const box = range.getClientRects()[0];
        ctx.font = `${getComputedStyle(title).fontSize} ${FONT}`;
        const top = cv.getBoundingClientRect().top - (parseFloat(cv.style.marginTop) || 0); // ראש ה-canvas בלי ההזזה
        if (box) l.yB = box.top + ctx.measureText("M").fontBoundingBoxAscent - top;
      }
      l.T = Math.ceil(Math.max(0, -l.yB) + FS * 1.2); // מקום מעל INSTAGRAM
      l.GY0 = 66 * u; l.GY1 = 338 * u; l.monthsY = 367 * u;
      l.NX0 = phone ? phone.getBoundingClientRect().left - left : 473 * u;
      l.NX1 = 696 * u;
      // הספרה 0 של הטלפון מתחילה קצת אחרי הקצה של התיבה שלה: מזיזים את 68.7K כך שהדיו יתחיל באותו מקום
      if (phone) {
        ctx.font = `${getComputedStyle(phone).fontSize} ${FONT}`;
        l.phoneInk = -ctx.measureText("0").actualBoundingBoxLeft;
      }
      l.heroY = 39 * u; l.labelY = 63 * u;
      l.rowsTop = 76 * u; l.rowH = 41.8 * u; l.rowText = 25 * u;
      l.heroCap = 58 * u; // גובה הספרות של 68.7K
      l.H = l.monthsY + FS * 0.5;
    } else {
      const FS = baseFS;
      l.FS = FS; l.T = 0;
      l.X0 = 0; l.X1 = cw;
      l.yB = FS;
      l.GY0 = l.yB + 70; l.GY1 = l.GY0 + cw * 0.62; l.monthsY = l.GY1 + 16 + FS;
      l.NX0 = 0; l.NX1 = cw;
      l.heroCap = cw * 0.14;
      l.heroY = l.monthsY + 48 + l.heroCap;
      l.labelY = l.heroY + FS + 10;
      l.rowsTop = l.labelY + 24; l.rowH = 3 * FS; l.rowText = 1.5 * FS + FS * 0.35;
      l.H = l.rowsTop + 3 * l.rowH + 8;
    }
    // גודל הפונט של 68.7K לפי גובה הספרות
    ctx.font = `100px ${FONT}`;
    l.HS = Math.min(100 * l.heroCap / ctx.measureText(HERO_TEXT).actualBoundingBoxAscent,
                    100 * (l.NX1 - l.NX0) / ctx.measureText(HERO_TEXT).width); // לא רחב מהעמודה
    ctx.font = `${l.HS}px ${FONT}`;
    l.heroX = l.NX0 + (l.phoneInk || 0) + ctx.measureText("6").actualBoundingBoxLeft; // הדיו של ה-6 על הקו

    // גודל ה-canvas: חד גם במסכים צפופים
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    l.dpr = dpr;
    const total = Math.ceil(l.H + l.T);
    cv.style.height = total + "px";
    cv.style.marginTop = -l.T + "px";
    cv.width = Math.round(cw * dpr);
    cv.height = Math.round(total * dpr);
    l.total = total;
    L = l;
  }

  function render(t) {
    const { FS, X0, X1, GY0, GY1 } = L;
    const gx = i => X0 + (X1 - X0) * (i / (N - 1));
    const gy = v => GY1 - (GY1 - GY0) * ((v - 1) / (maxV - 1)) * 0.92 - 2;

    ctx.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, L.cw, L.total);
    ctx.translate(0, L.T);
    ctx.lineCap = "round"; ctx.lineJoin = "round";

    // הכותרת
    const hA = easeOut(prog(t, 0, 0.8));
    text(PLATFORM, X0, L.yB, FS, 0.85 * hA);
    text(`${MONTHS} MONTH${MONTHS === 1 ? "" : "S"}`, X1, L.yB, FS, 0.55 * hA, "right");

    // קווי הרשת
    const gA = easeOut(prog(t, 0.3, 0.9));
    for (let k = 0; k <= 4; k++) {
      const y = GY1 - (GY1 - GY0) * k / 4;
      hline(X0, X0 + (X1 - X0) * easeInOut(prog(t, 0.3 + k * 0.06, 0.9)), y, (k === 0 ? 0.45 : 0.1) * gA);
    }
    // החודשים
    for (let m = 0; m < MONTHS; m++) {
      const a = easeOut(prog(t, 0.6 + m * 0.12, 0.7));
      const xs = X0 + (X1 - X0) * (m + 1) / MONTHS;
      if (m < MONTHS - 1) {
        ctx.setLineDash([2, 4]);
        ctx.strokeStyle = `rgba(255,255,255,${0.14 * a})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(xs, GY1); ctx.lineTo(xs, GY1 - (GY1 - GY0) * a); ctx.stroke();
        ctx.setLineDash([]);
      }
      text(`MONTH ${m + 1}`, X0 + (X1 - X0) * (m + 0.5) / MONTHS, L.monthsY, FS, 0.5 * a, "center");
    }

    // העקומה
    const dp = easeInOut(prog(t, 0.9, 4.0));
    const end = dp * (N - 1);
    if (dp > 0) {
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5;
      ctx.shadowColor = "rgba(255,255,255,0.55)"; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.moveTo(gx(0), gy(pts[0]));
      const last = Math.floor(end);
      for (let i = 1; i <= last; i++) {
        const xm = (gx(i - 1) + gx(i)) / 2, ym = (gy(pts[i - 1]) + gy(pts[i])) / 2;
        ctx.quadraticCurveTo(gx(i - 1), gy(pts[i - 1]), xm, ym);
      }
      const f = end - last, i0 = last, i1 = Math.min(N - 1, last + 1);
      const tx = gx(i0) + (gx(i1) - gx(i0)) * f, ty = gy(pts[i0] + (pts[i1] - pts[i0]) * f);
      ctx.lineTo(tx, ty); ctx.stroke();
      ctx.shadowBlur = 0;

      // הקצה של הקו: נקודה, טבעת שפועמת וקו מנוקד למטה
      ctx.setLineDash([1.5, 4]); ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(tx, ty + 6); ctx.lineTo(tx, GY1); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(tx, ty, 3, 0, Math.PI * 2); ctx.fill();
      const pulse = (t * 0.9) % 1;
      ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - pulse)})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(tx, ty, 4 + pulse * 11, 0, Math.PI * 2); ctx.stroke();

      // האחוז שרץ ליד הקצה
      const growth = (pts[i0] + (pts[i1] - pts[i0]) * f - 1) * 100;
      const la = easeOut(prog(t, 1.4, 0.6));
      text(`+${fmt(dp >= 1 ? VIEWS : growth, stats[0].dec)}%`, Math.min(tx, X1 - 4) - 10, ty - 12, FS, 0.95 * la, "right");
    }

    // המספר הגדול: סך הצפיות
    const heroA = easeOut(prog(t, 2.2, 1.0));
    const heroV = TOTAL * easeOutExpo(prog(t, 2.2, 3.2));
    const yOff = (1 - heroA) * 12;
    text(`${fmt(heroV, TOTAL_DEC)}${UNIT}`, L.heroX, L.heroY + yOff, L.HS, heroA);
    text("total views", L.NX0, L.labelY + yOff, FS, 0.6 * heroA);

    // שורות הנתונים
    stats.forEach((s, k) => {
      const st = 2.9 + k * 0.45;
      const a = easeOut(prog(t, st, 0.9));
      const top = L.rowsTop + k * L.rowH;
      hline(L.NX0, L.NX0 + (L.NX1 - L.NX0) * easeInOut(prog(t, st - 0.1, 1.0)), top, 0.22);
      const v = s.v * easeOutExpo(prog(t, st, 2.8));
      const y = top + L.rowText + (1 - a) * 10;
      text(`+${fmt(v, s.dec)}%`, L.NX0, y, FS, a);
      text(s.label, L.NX1, y, FS, 0.6 * a, "right");
    });
    hline(L.NX0, L.NX0 + (L.NX1 - L.NX0) * easeInOut(prog(t, 4.2, 1.0)), L.rowsTop + 3 * L.rowH, 0.22);
  }

  // ---------- הניגון ----------
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; // מי שביקש פחות תנועה רואה את הגרף הגמור
  let t0 = 0, running = false, lastT = reduced ? DURATION : 0;
  function loop(now) {
    if (!running) return;
    if (!t0) t0 = now;
    let t = (now - t0) / 1000;
    if (t > DURATION + 1.5) { t0 = now; t = 0; } // מתחיל מחדש
    lastT = Math.min(t, DURATION);
    render(lastT);
    requestAnimationFrame(loop);
  }

  // מחכים שהפונט ייטען לפני שמודדים ומציירים, אחרת הטקסט יופיע בפונט אחר
  document.fonts.load(`16px ${FONT}`).then(function () {
    layout();
    render(lastT);
    window.addEventListener("resize", () => { layout(); render(lastT); });
    if (reduced) return;
    new IntersectionObserver(function (entries) {
      const visible = entries[0].isIntersecting;
      if (visible && !running) { running = true; t0 = 0; requestAnimationFrame(loop); } // כל פעם שחוזרים אליו, מההתחלה
      if (!visible) running = false;
    }).observe(cv);
  });
})();
