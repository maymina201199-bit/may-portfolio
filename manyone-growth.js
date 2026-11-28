// הגרף המונפש של הצמיחה באינסטגרם (3 חודשים) בעמוד של Manyone.
// מצויר על canvas בגודל 1080 על 1920. האנימציה מתחילה כשהגרף מגיע למסך,
// חוזרת על עצמה, ונעצרת כשהוא לא נראה (כדי לא להעמיס על המחשב).
(function () {
  const cv = document.getElementById("growth-chart");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const W = 1080, H = 1920, DURATION = 9; // שניות
  const FONT = '"Helvetica Neue", -apple-system, Arial, sans-serif';

  // ---------- הנתונים: 90 ימים של צמיחה (פי 17 בערך, כמו +1,614%) ----------
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const N = 90, raw = [];
  for (let i = 0; i < N; i++) {
    const x = i / (N - 1);
    const base = 1 + 16.1 * (Math.exp(3.2 * x) - 1) / (Math.exp(3.2) - 1);
    raw.push(base * (1 + (rnd() - 0.5) * 0.28) + (i % 7 === 5 ? base * 0.12 : 0));
  }
  // החלקה קלה, והתחלה וסוף מדויקים
  const pts = raw.map((v, i) => {
    let s = 0, c = 0;
    for (let k = -2; k <= 2; k++) { const j = i + k; if (j >= 0 && j < N) { s += raw[j]; c++; } }
    return s / c;
  });
  pts[0] = 1; pts[N - 1] = 17.141;
  const maxV = 17.141;

  // ---------- עזרים ----------
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (t, start, dur) => clamp((t - start) / dur);
  const easeOut = p => 1 - Math.pow(1 - p, 3);
  const easeOutExpo = p => p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
  const easeInOut = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  const fmt = (v, dec) => v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });

  function text(str, x, y, size, weight, alpha, align = "left", spacing = 0) {
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.letterSpacing = spacing + "px";
    ctx.textAlign = align; ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillText(str, x, y);
  }
  function hline(x1, x2, y, alpha, w = 1.5) {
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
  }

  // ---------- המיקומים ----------
  const M = 90, GX0 = M, GX1 = W - M, GY0 = 360, GY1 = 1040;
  const gx = i => GX0 + (GX1 - GX0) * (i / (N - 1));
  const gy = v => GY1 - (GY1 - GY0) * ((v - 1) / (maxV - 1)) * 0.92 - 6;

  const stats = [
    { v: 1614.1, dec: 1, pre: "+", suf: "%", label: "views" },
    { v: 4815,   dec: 0, pre: "+", suf: "%", label: "viewers" },
    { v: 852.2,  dec: 1, pre: "+", suf: "%", label: "non-follower views" },
  ];

  function render(t) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    ctx.lineCap = "round"; ctx.lineJoin = "round";

    // הכותרת
    const hA = easeOut(prog(t, 0, 0.8));
    text("INSTAGRAM", M, 190, 30, 400, 0.85 * hA, "left", 8);
    text("3 MONTHS", W - M, 190, 30, 300, 0.55 * hA, "right", 8);
    hline(M, M + (W - 2 * M) * easeInOut(prog(t, 0.1, 1.0)), 235, 0.35);

    // קווי הרשת
    const gA = easeOut(prog(t, 0.3, 0.9));
    for (let k = 0; k <= 4; k++) {
      const y = GY1 - (GY1 - GY0) * k / 4;
      hline(GX0, GX0 + (GX1 - GX0) * easeInOut(prog(t, 0.3 + k * 0.06, 0.9)), y, (k === 0 ? 0.45 : 0.1) * gA, k === 0 ? 1.5 : 1);
    }
    // החודשים
    for (let m = 0; m < 3; m++) {
      const a = easeOut(prog(t, 0.6 + m * 0.12, 0.7));
      const xs = GX0 + (GX1 - GX0) * (m + 1) / 3;
      if (m < 2) {
        ctx.setLineDash([4, 10]);
        ctx.strokeStyle = `rgba(255,255,255,${0.14 * a})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(xs, GY1); ctx.lineTo(xs, GY1 - (GY1 - GY0) * a); ctx.stroke();
        ctx.setLineDash([]);
      }
      text(`MONTH ${m + 1}`, GX0 + (GX1 - GX0) * (m + 0.5) / 3, GY1 + 62, 24, 300, 0.5 * a, "center", 5);
    }

    // העקומה
    const dp = easeInOut(prog(t, 0.9, 4.0));
    const end = dp * (N - 1);
    if (dp > 0) {
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 3;
      ctx.shadowColor = "rgba(255,255,255,0.55)"; ctx.shadowBlur = 14;
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
      ctx.setLineDash([3, 9]); ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(tx, ty + 14); ctx.lineTo(tx, GY1); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(tx, ty, 7, 0, Math.PI * 2); ctx.fill();
      const pulse = (t * 0.9) % 1;
      ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - pulse)})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(tx, ty, 10 + pulse * 26, 0, Math.PI * 2); ctx.stroke();

      // האחוז שרץ ליד הקצה
      const growth = (pts[i0] + (pts[i1] - pts[i0]) * f - 1) * 100;
      const lx = Math.min(tx, GX1 - 10), la = easeOut(prog(t, 1.4, 0.6));
      text(`+${fmt(dp >= 1 ? 1614.1 : growth, 1)}%`, lx - 22, ty - 32, 34, 300, 0.95 * la, "right", 1);
    }

    // המספר הגדול: סך הצפיות
    const heroA = easeOut(prog(t, 2.2, 1.0));
    const heroV = 68.7 * easeOutExpo(prog(t, 2.2, 3.2));
    const yOff = (1 - heroA) * 30;
    text(`${fmt(heroV, 1)}K`, M - 6, 1330 + yOff, 210, 100, heroA, "left", -4);
    text("total views", M, 1395 + yOff, 32, 300, 0.6 * heroA, "left", 4);

    // שורות הנתונים
    stats.forEach((s, k) => {
      const st = 2.9 + k * 0.45;
      const a = easeOut(prog(t, st, 0.9));
      const y = 1500 + k * 120;
      hline(M, M + (W - 2 * M) * easeInOut(prog(t, st - 0.1, 1.0)), y - 72, 0.22, 1);
      const v = s.v * easeOutExpo(prog(t, st, 2.8));
      const off = (1 - a) * 24;
      text(`${s.pre}${fmt(v, s.dec)}${s.suf}`, M, y + off, 64, 200, a, "left", 0);
      text(s.label, W - M, y - 6 + off, 28, 300, 0.6 * a, "right", 3);
    });
    hline(M, M + (W - 2 * M) * easeInOut(prog(t, 4.2, 1.0)), 1500 + 2 * 120 + 48, 0.22, 1);
  }

  // ---------- הניגון ----------
  // מי שביקש פחות תנועה במחשב רואה מיד את הגרף הגמור
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { render(DURATION); return; }

  let t0 = 0, running = false;
  function loop(now) {
    if (!running) return;
    if (!t0) t0 = now;
    let t = (now - t0) / 1000;
    if (t > DURATION + 1.5) { t0 = now; t = 0; } // מתחיל מחדש
    render(Math.min(t, DURATION));
    requestAnimationFrame(loop);
  }
  render(0);
  new IntersectionObserver(function (entries) {
    const visible = entries[0].isIntersecting;
    if (visible && !running) { running = true; t0 = 0; requestAnimationFrame(loop); } // כל פעם שחוזרים אליו, מההתחלה
    if (!visible) running = false;
  }).observe(cv);
})();
