// ===== הגריד של 6 טורים בעמודי הפרויקטים (section.project-grid) =====
// כל ריבוע הוא 5 על 4 (שוכב, data-shape="land"), 4 על 5 (עומד, data-shape="port"),
// או בצורה המקורית של התמונה (data-shape="orig", והיחס רוחב/גובה ב-data-ratio),
// ברוחב של 1 עד 6 טורים (data-span). את הסידור קובעים בעמוד הקאברים (covers.html).
// הריבועים מסתדרים לבד אחד ליד השני, כמו בפיגמה, גם כשהגבהים שונים:
// הגריד מחולק לשורות דקות, וכל ריבוע תופס כמה שורות שהגובה שלו צריך.
(function () {
  // הטורים, הרווח וגובה השורה הדקה של הגריד
  function measure(grid) {
    const style = getComputedStyle(grid);
    const cols = style.gridTemplateColumns.split(" ").filter(Boolean).length || 6;
    const gap = parseFloat(style.columnGap) || 0;
    const colWidth = (grid.clientWidth - gap * (cols - 1)) / cols;
    const widthOf = span => span * colWidth + (span - 1) * gap;
    // גובה שורה דקה: ריבוע שוכב של 2 טורים (כולל הרווח מתחתיו) = 24 שורות.
    // כך ריבוע גדול של 4 טורים יוצא בדיוק בגובה של שני ריבועים קטנים אחד מעל השני
    const unit = cols >= 2 ? (widthOf(2) * 0.8 + gap) / 24 : 1;
    return { cols, gap, widthOf, unit };
  }

  function packGrid(grid) {
    const tiles = grid.querySelectorAll(":scope > .tile");
    // קודם כל ריבוע ברוחב טור אחד, כדי שריבוע רחב לא ייצור טורים נוספים (למשל בטלפון, שיש בו טור אחד)
    tiles.forEach(tile => { tile.style.gridColumn = "span 1"; });
    const { gap, unit } = measure(grid);

    grid.classList.add("is-packed");
    grid.style.gridAutoRows = unit + "px";
    grid.style.rowGap = "0px";
    layout(grid, [...tiles].map(tile => ({ span: tile.dataset.span, shape: tile.dataset.shape, ratio: tile.dataset.ratio, newRow: tile.dataset.break === "1" })))
      .forEach(function (spot, i) {
        const tile = tiles[i];
        tile.style.gridColumn = `${spot.column + 1} / span ${spot.span}`;
        tile.style.gridRow = `${spot.top + 1} / span ${spot.rows}`;
        tile.style.height = spot.rows * unit - gap + "px";
      });
  }

  // החישוב של הסידור (בלי לגעת בעמוד), גם בשביל מצב העריכה: איפה כל ריבוע יושב.
  // כל ריבוע נכנס למקום הכי גבוה (ואז הכי שמאלי) שפנוי לו, גם בחור שנשאר למעלה (כמו בפיגמה).
  // ריבוע עם newRow מתחיל שורה חדשה: הוא וכל מה שאחריו יורדים מתחת לכל מה שלפניו.
  // ריבוע בצורה המקורית קובע את הגובה של השורה שלו: כל ריבוע אחר שמתחיל באותה שורה
  // מקבל בדיוק את אותו גובה (והתמונה בו נחתכת), כך שכל התחתיות בשורה מיושרות
  function layout(grid, specs) {
    const { cols, widthOf, gap, unit } = measure(grid);
    const spans = specs.map(spec => Math.min(cols, Math.max(1, parseInt(spec.span, 10) || 2)));
    const natural = specs.map(function (spec, i) {
      const heightRatio = spec.shape === "port" ? 5 / 4                                   // גובה חלקי רוחב
                        : spec.shape === "orig" ? 1 / (parseFloat(spec.ratio) || 1.25)
                        : 4 / 5;
      return Math.max(1, Math.round((widthOf(spans[i]) * heightRatio + gap) / unit));
    });

    function place(rowHeights, definers) {
      const placed = []; // הריבועים שכבר במקום: טורים [c0, c1) ושורות [r0, r1)
      let floor = 0;     // מעל השורה הזאת כבר לא מכניסים ריבועים
      const free = (c0, c1, r0, r1) => placed.every(p => c1 <= p.c0 || c0 >= p.c1 || r1 <= p.r0 || r0 >= p.r1);
      return specs.map(function (spec, i) {
        const span = spans[i];
        const rowsAt = top => (!definers.has(i) && rowHeights.has(top)) ? rowHeights.get(top) : natural[i];
        if (spec.newRow) floor = Math.max(floor, ...placed.map(p => p.r1));
        // המקומות האפשריים: הרצפה, או מתחת לריבוע שכבר במקום
        const tops = [...new Set([floor, ...placed.map(p => p.r1).filter(r => r >= floor)])].sort((a, b) => a - b);
        let spot = null;
        for (const top of tops) {
          const rows = rowsAt(top);
          for (let c = 0; c + span <= cols && !spot; c++) if (free(c, c + span, top, top + rows)) spot = { column: c, top, rows };
          if (spot) break;
        }
        placed.push({ c0: spot.column, c1: spot.column + span, r0: spot.top, r1: spot.top + spot.rows });
        return { column: spot.column, top: spot.top, rows: spot.rows, span };
      });
    }

    // כמה סבבים: מסדרים, בודקים איפה יש ריבוע בצורה מקורית, וקובעים לפיו את גובה השורה שלו
    let rowHeights = new Map(), definers = new Set(), spots = place(rowHeights, definers);
    for (let round = 0; round < 4; round++) {
      const nextHeights = new Map(), nextDefiners = new Set();
      specs.forEach(function (spec, i) {
        if (spec.shape !== "orig" || nextHeights.has(spots[i].top)) return;
        nextHeights.set(spots[i].top, natural[i]);
        nextDefiners.add(i);
      });
      const same = nextHeights.size === rowHeights.size && [...nextHeights].every(([t, h]) => rowHeights.get(t) === h);
      if (same) break;
      rowHeights = nextHeights; definers = nextDefiners;
      spots = place(rowHeights, definers);
    }
    return spots;
  }

  window.packGrid = packGrid;   // גם מצב העריכה משתמש בזה
  window.gridLayout = layout;   // מצב העריכה: לבדוק לאן ריבוע יגיע לפני שמזיזים אותו

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
