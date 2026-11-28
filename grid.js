// ===== הגריד של 6 טורים בעמודי הפרויקטים (section.project-grid) =====
// כל ריבוע הוא 5 על 4 (שוכב, data-shape="land") או 4 על 5 (עומד, data-shape="port"),
// ברוחב של 1 עד 6 טורים (data-span). את הסידור קובעים בעמוד הקאברים (covers.html).
// הריבועים מסתדרים לבד אחד ליד השני, כמו בפיגמה, גם כשהגבהים שונים:
// הגריד מחולק לשורות דקות, וכל ריבוע תופס כמה שורות שהגובה שלו צריך.
(function () {
  function packGrid(grid) {
    const tiles = grid.querySelectorAll(":scope > .tile");
    // קודם כל ריבוע ברוחב טור אחד, כדי שריבוע רחב לא ייצור טורים נוספים (למשל בטלפון, שיש בו טור אחד)
    tiles.forEach(tile => { tile.style.gridColumn = "span 1"; });
    const style = getComputedStyle(grid);
    const cols = style.gridTemplateColumns.split(" ").filter(Boolean).length || 6;
    const gap = parseFloat(style.columnGap) || 0;
    const colWidth = (grid.clientWidth - gap * (cols - 1)) / cols;
    const widthOf = span => span * colWidth + (span - 1) * gap;
    // גובה שורה דקה: ריבוע שוכב של 2 טורים (כולל הרווח מתחתיו) = 24 שורות.
    // כך ריבוע גדול של 4 טורים יוצא בדיוק בגובה של שני ריבועים קטנים אחד מעל השני
    const unit = cols >= 2 ? (widthOf(2) * 0.8 + gap) / 24 : 1;

    grid.classList.add("is-packed");
    grid.style.gridAutoRows = unit + "px";
    grid.style.rowGap = "0px";
    // כל ריבוע נכנס למקום הכי גבוה (ואז הכי שמאלי) שפנוי לו, גם בחור שנשאר למעלה (כמו בפיגמה).
    // ריבוע עם data-break="1" מתחיל שורה חדשה: הוא וכל מה שאחריו יורדים מתחת לכל מה שלפניו
    const placed = []; // הריבועים שכבר במקום: טורים [c0, c1) ושורות [r0, r1)
    let floor = 0;     // מעל השורה הזאת כבר לא מכניסים ריבועים
    const free = (c0, c1, r0, r1) => placed.every(p => c1 <= p.c0 || c0 >= p.c1 || r1 <= p.r0 || r0 >= p.r1);
    tiles.forEach(function (tile) {
      const span = Math.min(cols, Math.max(1, parseInt(tile.dataset.span, 10) || 2));
      const heightRatio = tile.dataset.shape === "port" ? 5 / 4 : 4 / 5; // גובה חלקי רוחב
      const rows = Math.max(1, Math.round((widthOf(span) * heightRatio + gap) / unit));
      if (tile.dataset.break === "1") floor = Math.max(floor, ...placed.map(p => p.r1));
      // המקומות האפשריים: הרצפה, או מתחת לריבוע שכבר במקום
      const tops = [...new Set([floor, ...placed.map(p => p.r1).filter(r => r >= floor)])].sort((a, b) => a - b);
      let spot = null;
      for (const top of tops) {
        for (let c = 0; c + span <= cols && !spot; c++) if (free(c, c + span, top, top + rows)) spot = { c, top };
        if (spot) break;
      }
      placed.push({ c0: spot.c, c1: spot.c + span, r0: spot.top, r1: spot.top + rows });
      tile.style.gridColumn = `${spot.c + 1} / span ${span}`;
      tile.style.gridRow = `${spot.top + 1} / span ${rows}`;
      tile.style.height = rows * unit - gap + "px";
    });
  }
  window.packGrid = packGrid; // גם עמוד הקאברים משתמש בזה, לתצוגה של העריכה

  // מסדרים כל גריד בעמוד, ומסדרים מחדש כשהרוחב משתנה
  document.querySelectorAll(".project-grid").forEach(function (grid) {
    if (grid.closest(".minimap")) return;
    packGrid(grid);
    let lastWidth = grid.clientWidth;
    new ResizeObserver(function () {
      if (grid.clientWidth === lastWidth) return;
      lastWidth = grid.clientWidth;
      packGrid(grid);
    }).observe(grid);
  });
})();
