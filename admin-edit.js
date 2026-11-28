// ===== מצב עריכה של עמוד (נטען רק כשבכתובת יש ?edit, מעמוד הניהול covers.html) =====
// העמוד נראה בדיוק כמו באתר, ועליו כלים:
// - פס עליון: שם העמוד, חזרה לניהול, ביטול שינויים ושמירה.
// - לחיצה על טקסט (שם הפרויקט, התחום, התיאור, הקרדיט) מאפשרת לכתוב בו.
// - לחיצה על ריבוע בוחרת אותו. בריבוע שנבחר גוררים את התמונה כדי לבחור מה רואים (חיתוך).
// - פס תחתון: הכלים של הריבוע שנבחר (גודל, כיוון, זום, החלפה, הסרה, הזזה).
// כלום לא משתנה באתר עד שלוחצים "שמור". השמירה כותבת ישר ל-GitHub (עם המפתח מעמוד הניהול).
(function () {
  // ===================== הגדרות =====================
  const REPO = "maymina201199-bit/may-portfolio";
  const BRANCH = "main";
  const POST_RATIO = 455 / 568;   // פוסט בפיד (4 על 5)
  const FRAME = 1 / 30;           // פריים אחד
  const MAX_VIDEO_MB = 40;        // סרטון גדול מזה לא עולה ישר
  const MAX_IMAGE_WIDTH = 2800;   // תמונות בגריד: עד 2800 פיקסלים ברוחב
  const pageFile = location.pathname.split("/").pop() || "index.html";
  const pageName = pageFile.replace(/\.html$/, "");

  const section = document.querySelector(".project-page section.project-images");
  if (!section) return;
  const isFeed = section.classList.contains("project-feed");
  document.body.classList.add("is-editing");

  // ===================== GitHub =====================
  function readToken() { try { return localStorage.getItem("gh-token") || ""; } catch (e) { return ""; } }
  async function github(path, options) {
    const response = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${readToken()}`, Accept: "application/vnd.github+json" },
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error("המפתח לא תקין או שפג תוקפו");
      if (response.status === 403 || response.status === 404) throw new Error("למפתח אין הרשאה לכתוב לאתר");
      throw new Error("GitHub החזיר שגיאה " + response.status);
    }
    return response.json();
  }
  const currentFile = path => github(`${path}?ref=${BRANCH}&t=${Date.now()}`, { method: "GET", cache: "no-store" });
  async function saveFile(path, base64, message) {
    let sha;
    try { sha = (await currentFile(path)).sha; } catch (e) { sha = undefined; } // קובץ חדש
    return github(path, { method: "PUT", body: JSON.stringify({ message, content: base64, branch: BRANCH, sha }) });
  }
  function bytesToBase64(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  }
  const blobToBase64 = async blob => bytesToBase64(new Uint8Array(await blob.arrayBuffer()));
  const textToBase64 = text => bytesToBase64(new TextEncoder().encode(text));
  const base64ToText = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, "")), c => c.charCodeAt(0)));

  // ===================== קבצים מהמחשב =====================
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.hidden = true;
  document.body.appendChild(fileInput);
  function pickFiles(accept, multiple) {
    return new Promise(function (resolve) {
      fileInput.accept = accept;
      fileInput.multiple = !!multiple;
      fileInput.value = "";
      fileInput.onchange = () => resolve([...fileInput.files]);
      fileInput.click();
    });
  }
  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("הדפדפן לא מצליח לפתוח את התמונה (אם זה HEIC מהאייפון, שמרי אותה קודם כ-JPG)"));
      img.src = URL.createObjectURL(file);
    });
  }
  const canvasToJpeg = (canvas, quality) => new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", quality || 0.9));
  async function imageForGrid(file) {
    const img = await loadImage(file);
    const scale = Math.min(1, MAX_IMAGE_WIDTH / img.naturalWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    return { blob: await canvasToJpeg(canvas, 0.9), ratio: canvas.width / canvas.height };
  }
  // חיתוך מהאמצע לצורה של פוסט (4 על 5), ברוחב של עד 1080
  function cropToPost(source, sw, sh, canvas) {
    let w = sw, h = Math.round(sw / POST_RATIO);
    if (h > sh) { h = sh; w = Math.round(sh * POST_RATIO); }
    const scale = Math.min(1, 1080 / w);
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas.getContext("2d").drawImage(source, (sw - w) / 2, (sh - h) / 2, w, h, 0, 0, canvas.width, canvas.height);
    return canvas;
  }
  const stamp = () => Date.now().toString(36);
  const escapeAttr = v => String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const attrsHtml = attrs => attrs.map(([name, value]) => value === "" ? ` ${name}` : ` ${name}="${escapeAttr(value)}"`).join("");
  const round = v => Math.round(v * 10000) / 10000;
  const firstImage = section.querySelector("[src^='images/projects/'], [poster^='images/projects/']");
  const folder = firstImage
    ? (firstImage.getAttribute("src") || firstImage.getAttribute("poster")).split("/").slice(0, 3).join("/")
    : "images/projects/" + pageName;

  // ===================== הפס העליון =====================
  const topBar = document.createElement("div");
  topBar.className = "edit-bar";
  topBar.innerHTML = `
    <span class="edit-bar__title">עריכה: ${pageName}</span>
    <a class="edit-bar__link" href="covers.html">← חזרה לניהול</a>
    <a class="edit-bar__link" href="${pageFile}?t=${Date.now()}">חזרה לאתר (העמוד הזה)</a>
    <span class="edit-bar__status" id="edit-status"></span>
    <button type="button" id="edit-cancel">בטל שינויים</button>
    <button type="button" id="edit-save" class="is-main">שמור</button>`;
  document.body.appendChild(topBar);
  const statusLine = topBar.querySelector("#edit-status");
  const say = text => { statusLine.textContent = text; };
  topBar.querySelector("#edit-cancel").addEventListener("click", function () {
    if (confirm("לבטל את כל השינויים שלא נשמרו?")) location.reload();
  });

  // הפס התחתון: הכלים של מה שנבחר
  const bottomBar = document.createElement("div");
  bottomBar.className = "edit-tools";
  bottomBar.hidden = true;
  document.body.appendChild(bottomBar);

  // הכפתור להוספה, מתחת לגריד
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "edit-add";
  addButton.textContent = isFeed ? "+ הוספת פוסט (תמונה או סרטון)" : "+ הוספת תמונות";
  section.after(addButton);

  let editor, texts, introImage, chart;
  let dirty = false;
  const changed = () => { dirty = true; say("יש שינויים שלא נשמרו"); };
  // שינוי בגריד / בפיד (ולא רק בטקסט). רק אז שומרים את הגריד מחדש
  let layoutChanged = false;
  const changedLayout = () => { layoutChanged = true; changed(); };
  window.addEventListener("beforeunload", e => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  // שמירה: קודם הקבצים החדשים, ואז העמוד
  topBar.querySelector("#edit-save").addEventListener("click", async function () {
    if (!readToken()) { say("אין מפתח GitHub בדפדפן הזה. שמרי אותו בעמוד הניהול."); return; }
    const button = this;
    button.disabled = true;
    try {
      await introImage.upload(say);
      await editor.uploadFiles(say);
      say("שומר את העמוד…");
      const page = await currentFile(pageFile);
      const html = base64ToText(page.content);
      const updated = chart.apply(introImage.apply(texts.apply(layoutChanged ? editor.writePage(html) : html)));
      await github(pageFile, { method: "PUT", body: JSON.stringify({ message: `${pageFile}: updated from the admin page`, content: textToBase64(updated), branch: BRANCH, sha: page.sha }) });
      dirty = false;
      layoutChanged = false;
      say("נשמר ✓ האתר יתעדכן תוך דקה-שתיים");
    } catch (error) {
      say("לא נשמר: " + error.message);
    }
    button.disabled = false;
  });

  // מזיז פריט ברשימה, ומחזיר את המקום החדש שלו
  function moveItem(list, from, to) {
    if (from < 0 || from >= list.length) return from;
    const [item] = list.splice(from, 1);
    if (to > from) to--;
    to = Math.max(0, Math.min(list.length, to));
    list.splice(to, 0, item);
    return to;
  }
  // גרירה של ריבוע למקום אחר, בעזרת הידית ⠿ (גרירה בתוך הריבוע עצמו היא חיתוך)
  function makeMovable(figure, handle, index, move) {
    handle.addEventListener("pointerdown", () => { figure.draggable = true; });
    figure.addEventListener("dragstart", e => { e.dataTransfer.setData("text/plain", index); figure.classList.add("is-dragging"); });
    figure.addEventListener("dragend", () => { figure.draggable = false; figure.classList.remove("is-dragging"); });
    figure.addEventListener("dragover", e => e.preventDefault());
    figure.addEventListener("drop", function (e) {
      e.preventDefault();
      const box = figure.getBoundingClientRect();
      move(Number(e.dataTransfer.getData("text/plain")), index + (e.clientX > box.left + box.width / 2 ? 1 : 0));
    });
  }
  function button(label, title, action, extraClass) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    if (title) b.title = title;
    if (extraClass) b.className = extraClass;
    b.addEventListener("click", e => { e.stopPropagation(); action(); });
    return b;
  }

  // קריאה של הגרסה הכי עדכנית של העמוד מ-GitHub (אולי נשמר משהו שעוד לא הגיע לאתר)
  async function latestPage() {
    if (!readToken()) return document;
    try {
      return new DOMParser().parseFromString(base64ToText((await currentFile(pageFile)).content), "text/html");
    } catch (e) { return document; }
  }

  // ===================== הטקסטים: שם הפרויקט, התחום, התיאור והקרדיט =====================
  // לוחצים על טקסט וכותבים. נשמר רק טקסט ששונה, כל השאר בעמוד נשאר בדיוק כמו שהוא
  const escapeText = t => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const oneLine = t => t.replace(/\s+/g, " ").trim();
  function textEditor(doc) {
    const fields = [];
    function editable(el, value, multiline) {
      el.textContent = value;
      el.contentEditable = "plaintext-only";
      if (el.contentEditable !== "plaintext-only") el.contentEditable = "true"; // דפדפן ישן
      el.dataset.editable = multiline ? "lines" : "line";
      el.spellcheck = false;
      el.addEventListener("input", changed);
      el.addEventListener("keydown", e => { if (e.key === "Enter" && !multiline) { e.preventDefault(); el.blur(); } });
      return el;
    }
    // שם הפרויקט והתחום: שורה אחת
    [["project-meta--title", "title"], ["project-meta--field", "field"]].forEach(function ([cls, key]) {
      const el = document.querySelector("." + cls);
      const source = doc.querySelector("." + cls);
      if (!el || !source) return;
      const original = oneLine(source.textContent);
      editable(el, original, false);
      fields.push({
        key, original, read: () => oneLine(el.innerText),
        pattern: new RegExp(`<p class="project-meta ${cls}">[\\s\\S]*?</p>`),
        html: value => `<p class="project-meta ${cls}">${escapeText(value)}</p>`,
      });
    });
    // התיאור (טקסט רציף; האתר מסדר את השורות לבד) והקרדיט שבתוכו (שורות)
    const description = document.querySelector(".project-intro__description");
    const sourceDescription = doc.querySelector(".project-intro__description");
    if (description && sourceDescription) {
      const sourceCredit = sourceDescription.querySelector(".project-intro__credit");
      const clone = sourceDescription.cloneNode(true);
      const cloneCredit = clone.querySelector(".project-intro__credit");
      if (cloneCredit) cloneCredit.remove();
      const originalText = oneLine(clone.textContent);
      const originalCredit = sourceCredit ? sourceCredit.innerHTML.split(/<br\s*\/?>/i).map(oneLine).join("\n") : null;
      description.innerHTML = "";
      const text = editable(document.createElement("span"), originalText, true);
      text.classList.add("edit-text");
      description.appendChild(text);
      let credit = null;
      if (originalCredit !== null) {
        credit = editable(document.createElement("span"), originalCredit, true);
        credit.className = "project-intro__credit";
        credit.dataset.editable = "lines";
        description.appendChild(credit);
      }
      const readCredit = () => credit ? credit.innerText.split("\n").map(oneLine).filter(Boolean).join("\n") : null;
      fields.push({
        key: "description",
        original: originalText + "|" + originalCredit,
        read: () => oneLine(text.innerText) + "|" + readCredit(),
        pattern: /<p class="project-intro__description">[\s\S]*?<\/p>/,
        html: function () {
          const c = readCredit();
          const creditHtml = c ? `\n        <span class="project-intro__credit">${c.split("\n").map(escapeText).join("<br>")}</span>` : "";
          return `<p class="project-intro__description">\n        ${escapeText(oneLine(text.innerText))}${creditHtml}\n      </p>`;
        },
      });
    }
    return {
      apply(html) {
        fields.forEach(function (field) {
          const value = field.read();
          if (value === field.original || !field.pattern.test(html)) return;
          html = html.replace(field.pattern, () => field.html(value));
        });
        return html;
      },
    };
  }

  // ===================== התמונה הגדולה בראש העמוד =====================
  // כפתור "החלפת התמונה הגדולה": תמונה (או סרטון) מהמחשב. נשמר רק אם החליפו
  function introEditor() {
    const intro = document.querySelector(".project-intro");
    let media = intro && intro.querySelector(".project-intro__image");
    if (!media) return { upload: async () => {}, apply: html => html };
    let replacement = null; // { blob } לתמונה, או { file, poster } לסרטון
    const buttonEl = button("החלפת התמונה הגדולה", "תמונה או סרטון מהמחשב", async function () {
      const [file] = await pickFiles("image/*,video/*");
      if (!file) return;
      try {
        let preview;
        if (file.type.startsWith("image/")) {
          const { blob } = await imageForGrid(file);
          replacement = { blob };
          preview = document.createElement("img");
          preview.src = URL.createObjectURL(blob);
        } else {
          if (file.size > MAX_VIDEO_MB * 1024 * 1024) throw new Error(`הסרטון גדול מ-${MAX_VIDEO_MB}MB. שלחי לי אותו ואכווץ אותו.`);
          replacement = { file };
          preview = document.createElement("video");
          preview.src = URL.createObjectURL(file);
          preview.muted = true; preview.loop = true; preview.autoplay = true; preview.playsInline = true;
          await new Promise((resolve, reject) => { preview.onloadeddata = resolve; preview.onerror = () => reject(new Error("הדפדפן לא מצליח לפתוח את הסרטון. נסי לשמור אותו כ-MP4.")); });
          const canvas = document.createElement("canvas");
          canvas.width = preview.videoWidth; canvas.height = preview.videoHeight;
          canvas.getContext("2d").drawImage(preview, 0, 0);
          replacement.poster = await canvasToJpeg(canvas, 0.9);
        }
        preview.className = "project-intro__image";
        media.replaceWith(preview);
        media = preview;
        changed();
      } catch (error) { say(error.message); }
    }, "edit-intro-button");
    intro.appendChild(buttonEl);
    const alt = media.getAttribute("alt") || media.getAttribute("aria-label") || pageName;
    let newHtml = null;
    return {
      async upload(report) {
        if (!replacement) return;
        const id = stamp();
        if (replacement.blob) {
          report("מעלה את התמונה הגדולה…");
          const path = `${folder}/intro-${id}.jpg`;
          await saveFile(path, await blobToBase64(replacement.blob), `${pageName}: new main image (from the admin page)`);
          newHtml = `<img class="project-intro__image" src="${path}" alt="${escapeAttr(alt)}">`;
        } else {
          report("מעלה את הסרטון הגדול… זה יכול לקחת קצת זמן");
          const ext = (replacement.file.name.split(".").pop() || "mp4").toLowerCase();
          const path = `${folder}/intro-${id}.${ext}`, poster = `${folder}/intro-${id}-poster.jpg`;
          await saveFile(path, await blobToBase64(replacement.file), `${pageName}: new main video (from the admin page)`);
          await saveFile(poster, await blobToBase64(replacement.poster), `${pageName}: poster of the main video`);
          newHtml = `<video class="project-intro__image" src="${path}" poster="${poster}" autoplay muted loop playsinline aria-label="${escapeAttr(alt)}"></video>`;
        }
        replacement = null;
      },
      apply(html) {
        if (!newHtml) return html;
        const result = html.replace(/<(img|video) class="project-intro__image"[^>]*>(<\/video>)?/, () => newHtml);
        newHtml = null;
        return result;
      },
    };
  }

  // ===================== הנתונים של הגרף (עמודי סושיאל) =====================
  // כפתור "עריכת נתוני הגרף" פותח טופס. הגרף בעמוד מתעדכן אחרי השמירה
  function chartEditor(doc) {
    const canvas = document.getElementById("growth-chart");
    const sourceCanvas = doc.getElementById("growth-chart");
    if (!canvas || !sourceCanvas) return { apply: html => html };
    const FIELDS = [
      ["platform", "הפלטפורמה (מעל הגרף)", "INSTAGRAM"],
      ["months", "כמה חודשים", "3"],
      ["total", "סך הצפיות (המספר הגדול, בלי האות)", ""],
      ["unit", "האות אחרי המספר (K = אלפים, M = מיליונים, או ריק)", "K"],
      ["views", "views: אחוז הצמיחה (בלי % ובלי +)", ""],
      ["viewers", "viewers: אחוז הצמיחה", ""],
      ["nonfollowers", "non-follower views: אחוז הצמיחה", ""],
    ];
    const data = {};
    FIELDS.forEach(([key, , fallback]) => { data[key] = sourceCanvas.dataset[key] !== undefined ? sourceCanvas.dataset[key] : fallback; });
    let edited = false;
    const stats = canvas.closest(".project-stats");
    stats.appendChild(button(sourceCanvas.dataset.empty ? "הוספת נתונים לגרף" : "עריכת נתוני הגרף", "המספרים שבגרף", openForm, "edit-intro-button edit-chart-button"));
    const modal = document.createElement("div");
    modal.className = "edit-modal";
    modal.hidden = true;
    modal.innerHTML = `<form class="edit-modal__box admin__new"><h2>הנתונים של הגרף</h2>${FIELDS.map(([key, label]) =>
      `<label>${label}<input name="${key}" dir="ltr" autocomplete="off"></label>`).join("")}
      <div class="edit-modal__actions"><button type="submit" class="is-main">אישור</button><button type="button" data-act="close">ביטול</button></div>
      <p class="edit-modal__note">הגרף בעמוד יתעדכן אחרי שלוחצים "שמור" למעלה.</p></form>`;
    document.body.appendChild(modal);
    const form = modal.querySelector("form");
    function openForm() {
      FIELDS.forEach(([key]) => { form[key].value = data[key]; });
      modal.hidden = false;
    }
    modal.addEventListener("click", e => { if (e.target === modal || e.target.closest('[data-act="close"]')) modal.hidden = true; });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const clean = v => v.trim().replace(/[+%,\s]/g, "");
      FIELDS.forEach(([key]) => { data[key] = key === "platform" || key === "unit" ? form[key].value.trim() : clean(form[key].value); });
      if (!data.total || !data.views) { alert("צריך לפחות את סך הצפיות ואת אחוז הצמיחה של views"); return; }
      edited = true;
      modal.hidden = true;
      changed();
      say("נתוני הגרף השתנו (יתעדכנו בעמוד אחרי השמירה)");
    });
    return {
      apply(html) {
        if (!edited) return html;
        const attrs = FIELDS.map(([key]) => ` data-${key}="${escapeAttr(data[key])}"`).join("");
        const label = `${data.platform}, ${data.months} months: +${data.views}% views, +${data.viewers}% viewers, +${data.nonfollowers}% non-follower views, ${data.total}${data.unit} total views`;
        edited = false;
        return html.replace(/<canvas class="project-stats__chart"[^>]*>/, () =>
          `<canvas class="project-stats__chart" id="growth-chart" role="img"\n         ${attrs}\n          aria-label="${escapeAttr(label)}">`);
      },
    };
  }

  // ===================== עמוד פרויקט רגיל: הגריד של 6 טורים =====================
  function gridEditor(source) {
    let items = [...source.querySelectorAll(":scope > figure.tile")].map(readTile);
    let selected = -1;
    let swapping = false; // מחכים ללחיצה על המשבצת שאיתה מחליפים את התמונה
    const isGrid = source.classList.contains("project-grid");
    section.className = "project-images project-grid edit-grid";
    say(isGrid ? "לחצי על ריבוע כדי לערוך אותו" : "העמוד עוד בסידור הישן: ככה הוא ייראה בגריד החדש. כלום לא משתנה באתר עד שלוחצים \"שמור\".");

    function readTile(figure) {
      const media = figure.querySelector(".project-images__image");
      const attrs = [...media.attributes].filter(a => a.name !== "class" && a.name !== "style").map(a => [a.name, a.value]);
      const css = name => media.style.getPropertyValue(name).trim();
      let span = parseInt(figure.dataset.span, 10);
      let shape = figure.dataset.shape;
      const known = !!span;
      if (!known) {
        // סידור ישן: מתרגמים את הגודל בערך, והחיתוך מתחיל מהמרכז
        const c = figure.className;
        const w = parseFloat(figure.style.getPropertyValue("--w")), h = parseFloat(figure.style.getPropertyValue("--h"));
        if (w) {
          span = Math.round(w / 233);
          const r = w / h;
          // צורה רגילה (קרובה ל-5:4 או 4:5) או צורה מיוחדת (למשל פס רחב) שנשארת כמו שהיא
          shape = Math.abs(r - 1.25) < 0.2 ? "land" : Math.abs(r - 0.8) < 0.15 ? "port" : "orig";
        }
        else if (/tile--full/.test(c)) span = 6;
        else if (/tile--big/.test(c)) span = 4;
        else if (/tile--wide/.test(c)) span = 5;
        else if (/tile--half/.test(c)) span = 3;
        else span = 2;
        span = Math.min(6, Math.max(1, span));
        shape = shape || "land";
      }
      return {
        tag: media.tagName.toLowerCase(), attrs, span, shape,
        newRow: figure.dataset.break === "1", // מתחיל שורה חדשה (יורד מתחת לכל מה שלפניו)
        boxRatio: parseFloat(figure.dataset.ratio) || 0, // בצורה המקורית: רוחב חלקי גובה של הריבוע
        ratio: parseFloat(css("--photo-ratio")) || 0,
        dx: known ? parseFloat(css("--dx")) || 0 : 0,
        dy: known ? parseFloat(css("--dy")) || 0 : 0,
        zoom: known ? parseFloat(css("--zoom")) || 1 : 1,
        blob: null,
      };
    }
    const attr = (item, name) => (item.attrs.find(a => a[0] === name) || [])[1];
    function previewSrc(item) {
      if (item.blob) return item.blobUrl || (item.blobUrl = URL.createObjectURL(item.blob));
      return item.tag === "video" ? attr(item, "poster") : attr(item, "src");
    }
    // לא מזיזים את התמונה מעבר לקצה של הריבוע
    function clampCrop(item) {
      // הצורה האמיתית של הריבוע (אחרי הסידור הוא יכול להיות בגובה של השורה)
      const tw = 100, th = item.actualRatio ? 100 / item.actualRatio : item.shape === "port" ? 125 : item.shape === "orig" ? 100 / boxRatioOf(item) : 80, r = item.ratio || 1.5;
      const lx = (Math.max(tw, th * r) * item.zoom - tw) / 2 / tw * 100;
      const ly = (Math.max(th, tw / r) * item.zoom - th) / 2 / th * 100;
      item.dx = Math.max(-lx, Math.min(lx, item.dx));
      item.dy = Math.max(-ly, Math.min(ly, item.dy));
    }
    // בצורה המקורית הריבוע בצורה של התמונה (אלא אם נקבע אחרת)
    const boxRatioOf = item => item.boxRatio || item.ratio || 1.25;
    function mediaStyle(item) {
      const r2 = v => Math.round(v * 100) / 100;
      const parts = [];
      if (item.ratio) parts.push(`--photo-ratio: ${round(item.ratio)}`);
      if (r2(item.dx)) parts.push(`--dx: ${r2(item.dx)}%`);
      if (r2(item.dy)) parts.push(`--dy: ${r2(item.dy)}%`);
      if (r2(item.zoom) !== 1) parts.push(`--zoom: ${r2(item.zoom)}`);
      return parts.join("; ");
    }

    function render() {
      section.innerHTML = "";
      items.forEach(function (item, index) {
        clampCrop(item);
        const figure = document.createElement("figure");
        figure.className = "tile" + (index === selected ? " is-selected" : "");
        figure.dataset.span = item.span;
        figure.dataset.shape = item.shape;
        if (item.newRow) figure.dataset.break = "1";
        figure.style.setProperty("--span", item.span);
        if (item.shape === "orig") { figure.dataset.ratio = round(boxRatioOf(item)); figure.style.setProperty("--ratio", round(boxRatioOf(item))); }
        const img = document.createElement("img");
        img.className = "project-images__image";
        img.draggable = false;
        img.src = previewSrc(item);
        img.style.cssText = mediaStyle(item);
        img.addEventListener("load", function () {
          const r = img.naturalWidth / img.naturalHeight;
          if (r && Math.abs(r - item.ratio) > 0.001) {
            item.ratio = r; clampCrop(item); img.style.cssText = mediaStyle(item);
            if (item.shape === "orig" && !item.boxRatio) { figure.dataset.ratio = round(r); figure.style.setProperty("--ratio", round(r)); packGrid(section); }
          }
        });
        if (item.newRow) figure.insertAdjacentHTML("beforeend", '<span class="edit-badge edit-badge--row">↵ שורה חדשה</span>');
        figure.appendChild(img);
        if (item.tag === "video") figure.insertAdjacentHTML("beforeend", '<span class="edit-badge edit-badge--top">סרטון</span>');
        if (index === selected) figure.insertAdjacentHTML("beforeend", swapping
          ? '<span class="edit-badge">עכשיו לחצי על התמונה שאיתה להחליף</span>'
          : '<span class="edit-badge">גררי את התמונה כדי לבחור מה רואים</span>');
        if (swapping && index !== selected) figure.classList.add("is-swap-target");
        if (item === dragging) figure.classList.add("is-dragging");
        // לחיצה בוחרת. גרירה של ריבוע מזיזה אותו למקום אחר בגריד.
        // בריבוע שנבחר: גרירה מזיזה את התמונה בתוכו (חיתוך)
        figure.addEventListener("pointerdown", e => startCrop(e, index, figure, img));
        section.appendChild(figure);
      });
      packGrid(section);
      // אחרי הסידור: הצורה האמיתית של כל ריבוע, בשביל הגבולות של החיתוך
      [...section.children].forEach(function (figure, i) {
        const item = items[i];
        if (!item || !figure.offsetHeight) return;
        item.actualRatio = figure.offsetWidth / figure.offsetHeight;
        clampCrop(item);
        figure.querySelector("img").style.cssText = mediaStyle(item);
      });
      showTools();
    }

    // ----- גרירה של ריבוע למקום אחר בגריד -----
    // הריבוע זז עם העכבר (תמונה קטנה שעוקבת אחריו), ושאר הריבועים מפנים לו מקום בזמן אמת.
    // נכנסים עם העכבר לריבוע אחר = הריבוע שגוררים עובר למקום שלו. על שטח ריק = אחרי הריבוע שלפניו
    let dragging = null;
    function startMove(e, index, figure, img) {
      const item = items[index];
      const start = { x: e.clientX, y: e.clientY };
      let ghost = null, lastTarget = null;
      e.preventDefault();
      function onMove(ev) {
        if (!dragging) {
          if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 6) return; // עוד לא גרירה, אולי לחיצה
          dragging = item;
          selected = -1;
          ghost = document.createElement("img");
          ghost.className = "edit-ghost";
          ghost.src = img.src;
          document.body.appendChild(ghost);
          document.body.classList.add("is-dragging-tile");
          render();
        }
        ghost.style.transform = `translate(${ev.clientX}px, ${ev.clientY}px)`;
        const under = document.elementFromPoint(ev.clientX, ev.clientY);
        const tile = under && under.closest(".edit-grid > .tile");
        const from = items.indexOf(item);
        let to = -1, target = null;
        if (tile) {
          target = items[[...section.children].indexOf(tile)];
          if (target && target !== item && target !== lastTarget) to = items.indexOf(target) + (items.indexOf(target) > from ? 1 : 0);
        } else if (under && section.contains(under) || under === section) {
          // שטח ריק בגריד: אחרי הריבוע האחרון שמתחיל לפני העכבר (לפי שורות, ואז משמאל לימין)
          const boxes = [...section.children].map((f, i) => ({ i, b: f.getBoundingClientRect() }));
          const before = boxes.filter(({ b }) => b.top <= ev.clientY && (b.bottom <= ev.clientY || b.left <= ev.clientX));
          const last = before.length ? Math.max(...before.map(({ i }) => i)) : -1;
          target = "space-" + last;
          if (target !== lastTarget && last !== from) to = last + 1;
        }
        if (to >= 0) {
          lastTarget = target;
          moveItem(items, from, to);
          render();
        } else if (!tile) lastTarget = target;
      }
      function onUp() {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        if (ghost) ghost.remove();
        document.body.classList.remove("is-dragging-tile");
        if (dragging) {
          dragging = null;
          selected = items.indexOf(item);
          changedLayout();
        } else {
          selected = index; // לחיצה בלי גרירה: בוחרים את הריבוע
        }
        render();
      }
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    }

    // ----- חיתוך: גרירה בתוך הריבוע שנבחר -----
    function startCrop(e, index, figure, img) {
      if (swapping && selected >= 0) {
        if (index !== selected) swapImages(selected, index);
        swapping = false;
        say("");
        render();
        return;
      }
      if (index !== selected) { startMove(e, index, figure, img); return; }
      const item = items[index];
      const start = { x: e.clientX, y: e.clientY, dx: item.dx, dy: item.dy };
      const box = figure.getBoundingClientRect();
      figure.setPointerCapture(e.pointerId);
      figure.classList.add("is-cropping");
      function onMove(ev) {
        item.dx = start.dx + (ev.clientX - start.x) / box.width * 100;
        item.dy = start.dy + (ev.clientY - start.y) / box.height * 100;
        clampCrop(item);
        img.style.cssText = mediaStyle(item);
      }
      function onUp() {
        figure.classList.remove("is-cropping");
        figure.removeEventListener("pointermove", onMove);
        figure.removeEventListener("pointerup", onUp);
        if (item.dx !== start.dx || item.dy !== start.dy) changedLayout();
      }
      figure.addEventListener("pointermove", onMove);
      figure.addEventListener("pointerup", onUp);
    }

    // החלפה בין תמונות: המשבצות נשארות במקום (גודל וכיוון), רק התמונות מתחלפות.
    // החיתוך של שתיהן חוזר למרכז, כי הצורה של המשבצת השתנתה
    const IMAGE_KEYS = ["tag", "attrs", "ratio", "blob", "blobUrl"];
    function swapImages(a, b) {
      const first = items[a], second = items[b];
      IMAGE_KEYS.forEach(function (key) { const t = first[key]; first[key] = second[key]; second[key] = t; });
      [first, second].forEach(item => { item.dx = 0; item.dy = 0; item.zoom = 1; });
      selected = b;
      changedLayout();
    }

    // ↑ שורה למעלה: אם התמונה מתחילה שורה חדשה, מבטלים את זה. אחרת מקדימים אותה בסדר
    // רק כמה שצריך כדי שתעלה (ממלאת משבצת פנויה למעלה)
    function moveUpRow(index) {
      const specs = list => list.map(it => ({ span: it.span, shape: it.shape, ratio: boxRatioOf(it), newRow: it.newRow }));
      const topOf = (list, i) => gridLayout(section, specs(list))[i].top;
      const item = items[index];
      const now = topOf(items, index);
      if (item.newRow) {
        item.newRow = false;
        if (topOf(items, index) < now) { changedLayout(); render(); return; }
        item.newRow = true;
      }
      for (let k = index - 1; k >= 0; k--) {
        const trial = items.slice();
        trial.splice(index, 1);
        trial.splice(k, 0, item);
        if (topOf(trial, k) < now) {
          items = trial;
          selected = k;
          changedLayout();
          render();
          return;
        }
      }
      say("אין לתמונה הזאת מקום בשורה שמעליה (אפשר להקטין אותה ולנסות שוב)");
    }

    function change(edit) { edit(items[selected]); changedLayout(); render(); }
    function move(from, to) { selected = moveItem(items, from, to); changedLayout(); render(); }

    // ----- הפס התחתון -----
    function showTools() {
      const item = items[selected];
      bottomBar.hidden = !item;
      bottomBar.innerHTML = "";
      if (!item) return;
      const group = (label, ...nodes) => {
        const g = document.createElement("div");
        g.className = "edit-tools__group";
        if (label) g.insertAdjacentHTML("beforeend", `<span>${label}</span>`);
        nodes.forEach(n => g.appendChild(n));
        bottomBar.appendChild(g);
      };
      const spans = [1, 2, 3, 4, 5, 6].map(n => button(String(n), `${n} טורים`, () => change(it => { it.span = n; }), item.span === n ? "is-on" : ""));
      group("טורים:", ...spans);
      group("כיוון:",
        button("שוכב 5:4", "", () => change(it => { it.shape = "land"; }), item.shape === "land" ? "is-on" : ""),
        button("עומד 4:5", "", () => change(it => { it.shape = "port"; }), item.shape === "port" ? "is-on" : ""),
        button("צורה מקורית", "הריבוע בצורה של התמונה עצמה (למשל פס רחב)", () => change(it => { it.shape = "orig"; it.boxRatio = 0; it.dx = 0; it.dy = 0; }), item.shape === "orig" ? "is-on" : ""));
      const zoom = document.createElement("input");
      zoom.type = "range"; zoom.min = 1; zoom.max = 3; zoom.step = 0.01; zoom.value = item.zoom; zoom.dir = "ltr";
      const zoomLabel = document.createElement("span");
      zoomLabel.textContent = Math.round(item.zoom * 100) + "%";
      zoom.addEventListener("input", function () {
        item.zoom = Number(zoom.value);
        clampCrop(item);
        zoomLabel.textContent = Math.round(item.zoom * 100) + "%";
        const img = section.children[selected] && section.children[selected].querySelector("img");
        if (img) img.style.cssText = mediaStyle(item);
        changedLayout();
      });
      group("זום:", zoom, zoomLabel, button("איפוס", "החיתוך חוזר למרכז, בלי זום", () => change(it => { it.dx = 0; it.dy = 0; it.zoom = 1; })));
      group("",
        button("↑ שורה למעלה", "התמונה עולה לשורה שמעליה, למקום הפנוי הכי קרוב", () => moveUpRow(selected)),
        button("↵ שורה חדשה", "התמונה (ומה שאחריה) יורדת לשורה מתחת לכל מה שלפניה", () => change(it => { it.newRow = !it.newRow; }), item.newRow ? "is-on" : ""),
        button("‹ קודם", "מקום אחד קודם", () => move(selected, selected - 1)),
        button("הבא ›", "מקום אחד הבא", () => move(selected, selected + 2)),
        button("החלפה עם תמונה אחרת בעמוד", "התמונה עוברת למשבצת אחרת, והתמונה משם עוברת לכאן", () => { swapping = true; say("לחצי על התמונה שאיתה להחליף (Esc לביטול)"); render(); }, swapping ? "is-on" : ""),
        button("החלפת תמונה מהמחשב", "בחירת תמונה אחרת מהמחשב", () => replace(selected)),
        button("הסרה", "להסיר מהגריד (הקובץ עצמו לא נמחק)", () => remove(selected)),
        button("✕", "סגירה", () => { selected = -1; swapping = false; render(); }));
    }

    function remove(index) {
      if (!confirm("להסיר את התמונה הזאת מהגריד? (הקובץ עצמו לא נמחק)")) return;
      items.splice(index, 1);
      selected = -1;
      changedLayout();
      render();
    }
    async function replace(index) {
      const [file] = await pickFiles("image/*");
      if (!file) return;
      try {
        const { blob, ratio } = await imageForGrid(file);
        Object.assign(items[index], { tag: "img", attrs: [["src", ""], ["alt", ""], ["loading", "lazy"]], blob, blobUrl: null, ratio, dx: 0, dy: 0, zoom: 1 });
        changedLayout();
        render();
      } catch (error) { say(error.message); }
    }
    async function add() {
      const files = await pickFiles("image/*", true);
      if (!files.length) return;
      for (const file of files) {
        try {
          const { blob, ratio } = await imageForGrid(file);
          items.push({ tag: "img", attrs: [["src", ""], ["alt", ""], ["loading", "lazy"]], span: 2, shape: ratio >= 1 ? "land" : "port", ratio, dx: 0, dy: 0, zoom: 1, blob });
        } catch (error) { say(error.message); }
      }
      selected = items.length - 1;
      changedLayout();
      render();
      section.lastElementChild.scrollIntoView({ block: "center", behavior: "smooth" });
    }

    async function uploadFiles(report) {
      const waiting = items.filter(item => item.blob);
      for (let i = 0; i < waiting.length; i++) {
        const item = waiting[i];
        report(`מעלה תמונה ${i + 1} מתוך ${waiting.length}…`);
        const path = `${folder}/${stamp()}-${i + 1}.jpg`;
        await saveFile(path, await blobToBase64(item.blob), `${pageName}: new image (from the admin page)`);
        item.attrs = item.attrs.map(([n, v]) => n === "src" ? ["src", path] : [n, v]);
        item.blob = null;
      }
    }
    function writePage(html) {
      // (גם כשיש עוד הגדרות אחרי ה-class, כמו בסידור הישן של Hevel)
      const SECTION = /<section class="project-images(?! project-feed)[^"]*"[^>]*>[\s\S]*?<\/section>/;
      if (!SECTION.test(html)) throw new Error("לא מצאתי את הגריד בעמוד");
      const lines = items.map(function (item) {
        const style = mediaStyle(item);
        const media = `<${item.tag} class="project-images__image"${attrsHtml(item.attrs)}${style ? ` style="${style}"` : ""}>${item.tag === "video" ? "</video>" : ""}`;
        const orig = item.shape === "orig" ? round(boxRatioOf(item)) : 0;
        return `      <figure class="tile" data-span="${item.span}" data-shape="${item.shape}"${orig ? ` data-ratio="${orig}"` : ""}${item.newRow ? ' data-break="1"' : ""} style="--span: ${item.span}${orig ? `; --ratio: ${orig}` : ""}">${media}</figure>`;
      });
      return html.replace(SECTION, () => `<section class="project-images project-grid">\n${lines.join("\n")}\n    </section>`);
    }

    window.addEventListener("resize", () => packGrid(section));
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (swapping) { swapping = false; say(""); render(); }
      else if (selected >= 0) { selected = -1; render(); }
    });
    render();
    return { add, uploadFiles, writePage };
  }

  // ===================== עמוד סושיאל: הפיד =====================
  // cover = סרטון לאורך שמופיע כפריים קבוע (data-video = הסרטון), video = סרטון 4 על 5 שמתנגן, image = תמונה
  function feedEditor(source) {
    let items = [...source.querySelectorAll(":scope > figure.tile")].map(function (figure) {
      const media = figure.querySelector(".project-images__image");
      const tag = media.tagName.toLowerCase();
      return {
        kind: figure.dataset.carousel ? "carousel" : tag === "video" ? "video" : figure.dataset.video ? "cover" : "image",
        carousel: (figure.dataset.carousel || "").split(",").map(s => s.trim()).filter(Boolean), // התמונות של קרוסלה
        tag,
        attrs: [...media.attributes].filter(a => a.name !== "class").map(a => [a.name, a.value]),
        videoPath: figure.dataset.video || "",
      };
    });
    const firstAlt = source.querySelector("[alt], [aria-label]");
    const alt = firstAlt ? firstAlt.getAttribute("alt") || firstAlt.getAttribute("aria-label") : pageName;
    let selected = -1;
    say("לחצי על פוסט כדי לערוך אותו");

    const attr = (item, name) => (item.attrs.find(a => a[0] === name) || [])[1];
    const setAttr = (item, name, value) => {
      const found = item.attrs.find(a => a[0] === name);
      if (found) found[1] = value; else item.attrs.push([name, value]);
    };
    const url = blob => URL.createObjectURL(blob);
    function previewSrc(item) {
      if (item.coverBlob) return item.coverUrl || (item.coverUrl = url(item.coverBlob));
      if (item.posterBlob) return item.posterUrl || (item.posterUrl = url(item.posterBlob));
      return item.tag === "video" ? attr(item, "poster") : attr(item, "src");
    }

    function render() {
      section.innerHTML = "";
      items.forEach(function (item, index) {
        const figure = document.createElement("figure");
        figure.className = "tile" + (index === selected ? " is-selected" : "");
        const img = document.createElement("img");
        img.className = "project-images__image";
        img.draggable = false;
        img.src = previewSrc(item);
        img.style.cssText = attr(item, "style") || "";
        figure.appendChild(img);
        const count = item.carouselBlobs ? item.carouselBlobs.length : item.carousel ? item.carousel.length : 0;
        const labels = { cover: "סרטון (קאבר)", video: "סרטון שמתנגן", image: "תמונה", carousel: `קרוסלה (${count} תמונות)` };
        figure.insertAdjacentHTML("beforeend", `<span class="edit-badge edit-badge--top">${labels[item.kind]}${item.needsCover ? " · צריך לבחור קאבר" : ""}</span>`);
        const handle = button("⠿", "גררי כדי להזיז למקום אחר", () => {}, "edit-handle");
        figure.appendChild(handle);
        makeMovable(figure, handle, index, move);
        figure.addEventListener("click", () => { selected = index; render(); });
        section.appendChild(figure);
      });
      showTools();
    }
    function move(from, to) { selected = moveItem(items, from, to); changedLayout(); render(); }
    function showTools() {
      const item = items[selected];
      bottomBar.hidden = !item;
      bottomBar.innerHTML = "";
      if (!item) return;
      const g = document.createElement("div");
      g.className = "edit-tools__group";
      g.appendChild(button("‹ קודם", "מקום אחד קודם", () => move(selected, selected - 1)));
      g.appendChild(button("הבא ›", "מקום אחד הבא", () => move(selected, selected + 2)));
      if (item.kind === "cover") g.appendChild(button("בחירת קאבר", "בוחרים פריים מהסרטון", () => openCover(selected), "is-on"));
      g.appendChild(button(item.kind === "carousel" ? "תמונות הקרוסלה" : "הפיכה לקרוסלה", "בוחרים כמה תמונות (לפי הסדר), והפוסט הופך לקרוסלה שעוברים בה בין התמונות", () => makeCarousel(selected)));
      g.appendChild(button("החלפה", "קובץ אחר מהמחשב (תמונה או סרטון)", () => replace(selected)));
      g.appendChild(button("הסרה", "להסיר מהפיד (הקובץ עצמו לא נמחק)", () => remove(selected)));
      g.appendChild(button("✕", "סגירה", () => { selected = -1; render(); }));
      bottomBar.appendChild(g);
    }
    function remove(index) {
      if (!confirm("להסיר את הפוסט הזה מהפיד? (הקובץ עצמו לא נמחק)")) return;
      items.splice(index, 1);
      selected = -1;
      changedLayout();
      render();
    }

    // קובץ חדש: תמונה נחתכת לצורה של פוסט. סרטון 4 על 5 עולה ומתנגן.
    // סרטון לאורך (רילס) לא עולה: בוחרים לו פריים, ורק הקאבר עולה לאתר
    async function fromFile(file) {
      if (file.type.startsWith("image/")) {
        const img = await loadImage(file);
        const blob = await canvasToJpeg(cropToPost(img, img.naturalWidth, img.naturalHeight, document.createElement("canvas")), 0.9);
        return { kind: "image", tag: "img", attrs: [["src", ""], ["alt", alt], ["loading", "lazy"], ["style", `--photo-ratio: ${round(POST_RATIO)}`]], coverBlob: blob, newImage: true };
      }
      const localVideo = url(file);
      const probe = document.createElement("video");
      probe.muted = true;
      probe.src = localVideo;
      await new Promise((resolve, reject) => { probe.onloadeddata = resolve; probe.onerror = () => reject(new Error("הדפדפן לא מצליח לפתוח את הסרטון. נסי לשמור אותו כ-MP4.")); });
      const ratio = probe.videoWidth / probe.videoHeight;
      if (Math.abs(ratio - POST_RATIO) < 0.03) {
        if (file.size > MAX_VIDEO_MB * 1024 * 1024) throw new Error(`הסרטון גדול מ-${MAX_VIDEO_MB}MB. שלחי לי אותו ואכווץ אותו.`);
        probe.currentTime = 0.1;
        await new Promise(resolve => { probe.onseeked = resolve; });
        const poster = await canvasToJpeg(cropToPost(probe, probe.videoWidth, probe.videoHeight, document.createElement("canvas")), 0.88);
        return {
          kind: "video", tag: "video", videoFile: file, posterBlob: poster,
          attrs: [["src", ""], ["poster", ""], ["data-autoplay", ""], ["muted", ""], ["loop", ""], ["playsinline", ""], ["preload", "none"], ["aria-label", alt], ["style", `--photo-ratio: ${round(ratio)}`]],
        };
      }
      return { kind: "cover", tag: "img", attrs: [["src", ""], ["alt", alt], ["loading", "lazy"], ["style", `--photo-ratio: ${round(POST_RATIO)}`]], videoPath: "", localVideo, needsCover: true };
    }
    // קרוסלה: בוחרים כמה תמונות (הסדר = הסדר שבו הן נבחרו / השמות שלהן), כל אחת נחתכת לצורה של פוסט.
    // בפיד רואים את הראשונה, ובלחיצה עוברים בין כולן
    async function makeCarousel(index) {
      const files = (await pickFiles("image/*", true)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      if (!files.length) return;
      try {
        const blobs = [];
        for (const file of files) {
          const img = await loadImage(file);
          blobs.push(await canvasToJpeg(cropToPost(img, img.naturalWidth, img.naturalHeight, document.createElement("canvas")), 0.9));
        }
        items[index] = {
          kind: "carousel", tag: "img", carousel: [], carouselBlobs: blobs,
          attrs: [["src", ""], ["alt", alt], ["loading", "lazy"], ["style", `--photo-ratio: ${round(POST_RATIO)}`]],
          coverBlob: blobs[0], newImage: true,
        };
        selected = index;
        changedLayout();
        render();
      } catch (error) { say(error.message); }
    }

    async function replace(index) {
      const [file] = await pickFiles("image/*,video/*");
      if (!file) return;
      try {
        items[index] = await fromFile(file);
        selected = index;
        changedLayout();
        render();
        if (items[index].needsCover) openCover(index);
      } catch (error) { say(error.message); }
    }
    async function add() {
      const files = await pickFiles("image/*,video/*", true);
      if (!files.length) return;
      for (const file of files) {
        try { items.push(await fromFile(file)); } catch (error) { say(error.message); }
      }
      selected = items.length - 1;
      changedLayout();
      render();
      section.lastElementChild.scrollIntoView({ block: "center", behavior: "smooth" });
      if (items[selected] && items[selected].needsCover) openCover(selected);
    }

    // ----- בחירת קאבר: חלון מעל העמוד -----
    const modal = document.createElement("div");
    modal.className = "edit-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="edit-modal__box">
        <div><p>הסרטון: מנגנים ועוצרים על הפריים שרוצים</p><video controls muted playsinline preload="metadata"></video></div>
        <div><p>הקאבר (בדיוק כמו בפיד)</p><canvas></canvas></div>
        <div class="edit-modal__actions">
          <button type="button" data-step="-1">‹ פריים אחורה</button>
          <button type="button" data-step="1">פריים קדימה ›</button>
          <span class="edit-modal__time">0.00 שניות</span>
          <button type="button" data-act="file">בחירת סרטון מהמחשב</button>
          <button type="button" data-act="use" class="is-main">זה הקאבר</button>
          <button type="button" data-act="close">ביטול</button>
          <p class="edit-modal__note"></p>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const video = modal.querySelector("video");
    const canvas = modal.querySelector("canvas");
    const time = modal.querySelector(".edit-modal__time");
    const note = modal.querySelector(".edit-modal__note");
    function drawCover() {
      if (!video.videoWidth) return;
      cropToPost(video, video.videoWidth, video.videoHeight, canvas);
      time.textContent = video.currentTime.toFixed(2) + " שניות";
    }
    function openCover(index) {
      selected = index;
      const item = items[index];
      const sourceVideo = item.localVideo || item.videoPath;
      note.textContent = sourceVideo ? "" : "הסרטון של הפוסט הזה לא נמצא באתר. לחצי \"בחירת סרטון מהמחשב\".";
      video.removeAttribute("src");
      if (sourceVideo) { video.src = sourceVideo; video.load(); }
      modal.hidden = false;
    }
    video.addEventListener("loadedmetadata", () => { video.currentTime = 0.01; });
    ["loadeddata", "seeked", "pause"].forEach(name => video.addEventListener(name, drawCover));
    modal.addEventListener("click", async function (e) {
      const b = e.target.closest("button");
      if (e.target === modal) { modal.hidden = true; video.pause(); return; }
      if (!b) return;
      if (b.dataset.step) {
        video.pause();
        video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + Number(b.dataset.step) * FRAME));
      } else if (b.dataset.act === "close") {
        modal.hidden = true; video.pause();
      } else if (b.dataset.act === "file") {
        const [file] = await pickFiles("video/*");
        if (file) { items[selected].localVideo = url(file); openCover(selected); }
      } else if (b.dataset.act === "use") {
        if (!video.videoWidth) return;
        video.pause();
        drawCover();
        const item = items[selected];
        item.coverBlob = await canvasToJpeg(canvas, 0.88);
        item.coverUrl = null;
        item.needsCover = false;
        modal.hidden = true;
        changedLayout();
        render();
      }
    });

    async function uploadFiles(report) {
      const missing = items.findIndex(item => item.needsCover);
      if (missing >= 0) throw new Error(`לפוסט ${missing + 1} עוד אין קאבר. בחרי אותו ולחצי "בחירת קאבר".`);
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const id = stamp() + "-" + (i + 1);
        if (item.videoFile) {
          report(`מעלה סרטון (פוסט ${i + 1})… זה יכול לקחת קצת זמן`);
          const ext = (item.videoFile.name.split(".").pop() || "mp4").toLowerCase();
          const videoPath = `${folder}/post-${id}.${ext}`;
          await saveFile(videoPath, await blobToBase64(item.videoFile), `${pageName}: new video post (from the admin page)`);
          const posterPath = `${folder}/post-${id}-poster.jpg`;
          await saveFile(posterPath, await blobToBase64(item.posterBlob), `${pageName}: poster of the new video post`);
          setAttr(item, "src", videoPath);
          setAttr(item, "poster", posterPath);
          item.videoFile = null; item.posterBlob = null;
        }
        if (item.carouselBlobs) {
          // התמונות של הקרוסלה. הראשונה היא גם מה שרואים בפיד
          const paths = [];
          for (let n = 0; n < item.carouselBlobs.length; n++) {
            report(`מעלה את הקרוסלה (פוסט ${i + 1}, תמונה ${n + 1} מתוך ${item.carouselBlobs.length})…`);
            const path = `${folder}/post-${id}-${n + 1}.jpg`;
            await saveFile(path, await blobToBase64(item.carouselBlobs[n]), `${pageName}: carousel image ${n + 1} for post ${i + 1} (from the admin page)`);
            paths.push(path);
          }
          item.carousel = paths;
          setAttr(item, "src", paths[0]);
          item.carouselBlobs = null; item.coverBlob = null; item.newImage = false;
        }
        if (item.coverBlob) {
          report(`מעלה תמונה (פוסט ${i + 1})…`);
          // קאבר של פוסט שכבר באתר נשמר באותו שם, עם ?c= חדש כדי שהדפדפנים יציגו את החדש
          const old = (attr(item, "src") || "").split("?")[0];
          const path = old && !item.newImage ? old : `${folder}/post-${id}${item.kind === "cover" ? "-cover" : ""}.jpg`;
          await saveFile(path, await blobToBase64(item.coverBlob), `${pageName}: new ${item.kind === "cover" ? "cover" : "image"} for post ${i + 1} (from the admin page)`);
          setAttr(item, "src", `${path}?c=${Date.now()}`);
          item.coverBlob = null; item.newImage = false;
        }
      }
    }
    function writePage(html) {
      const SECTION = /<section class="project-images project-feed"[^>]*>[\s\S]*?<\/section>/;
      if (!SECTION.test(html)) throw new Error("לא מצאתי את הפיד בעמוד");
      const lines = items.map(function (item) {
        const media = `<${item.tag} class="project-images__image"${attrsHtml(item.attrs)}>${item.tag === "video" ? "</video>" : ""}`;
        const data = item.kind === "carousel" && item.carousel.length ? ` data-carousel="${escapeAttr(item.carousel.join(", "))}"`
                   : item.kind === "cover" && item.videoPath ? ` data-video="${escapeAttr(item.videoPath)}"` : "";
        return `      <figure class="tile"${data}>${media}</figure>`;
      });
      return html.replace(SECTION, () => `<section class="project-images project-feed">\n${lines.join("\n")}\n    </section>`);
    }

    document.addEventListener("keydown", e => { if (e.key === "Escape") { if (!modal.hidden) { modal.hidden = true; video.pause(); } else if (selected >= 0) { selected = -1; render(); } } });
    render();
    return { add, uploadFiles, writePage };
  }

  // ===================== התחלה =====================
  say("טוען…");
  latestPage().then(function (doc) {
    const selector = isFeed ? "section.project-images.project-feed" : "section.project-images:not(.project-feed)";
    const source = doc.querySelector(".project-page " + selector) || doc.querySelector(selector) || section;
    texts = textEditor(doc);
    introImage = introEditor();
    chart = chartEditor(doc);
    editor = isFeed ? feedEditor(source) : gridEditor(source);
    addButton.addEventListener("click", () => editor.add());
    if (!readToken()) say("אין מפתח GitHub בדפדפן הזה: אפשר לנסות, אבל כדי לשמור צריך לשמור מפתח בעמוד הניהול.");
  });
})();
