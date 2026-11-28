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
    tiles.forEach(function (tile) {
      const span = Math.min(cols, Math.max(1, parseInt(tile.dataset.span, 10) || 2));
      const heightRatio = tile.dataset.shape === "port" ? 5 / 4 : 4 / 5; // גובה חלקי רוחב
      const rows = Math.max(1, Math.round((widthOf(span) * heightRatio + gap) / unit));
      tile.style.gridColumn = "span " + span;
      tile.style.gridRow = "span " + rows;
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
