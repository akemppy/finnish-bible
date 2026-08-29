(function () {
  "use strict";

  const STORAGE_KEY = "suomi-raamattu:v2";
  const TRANSLATIONS = {
    biblia: { file: "data/biblia.json", short: "Biblia", label: "Biblia 1776" },
    kr1938: { file: "data/kr1938.json", short: "KR 1938", label: "Kirkkoraamattu 1933/1938" },
    kjv: { file: "data/kjv.json", short: "KJV", label: "King James Version (1769)" }
  };
  const MAX_RESULTS = 40;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const els = {
    toggles: $$("[data-translation]"),
    rightToggles: $$("[data-translation-right]"),
    compareBtn: $("#compare-btn"),
    compareRow: $("#compare-row"),
    search: $("#search"),
    searchWrap: $(".search-wrap"),
    clear: $("#search-clear"),
    results: $("#results"),
    bookBtn: $("#book-btn"),
    bookBtnLabel: $("#book-btn-label"),
    prev: $("#prev-chapter"),
    next: $("#next-chapter"),
    main: $("#reader"),
    overlay: $("#picker"),
    sheetTitle: $("#sheet-title"),
    sheetBody: $("#sheet-body"),
    sheetBack: $("#sheet-back"),
    sheetClose: $("#sheet-close"),
    footerTr: $("#footer-translation")
  };

  const cache = Object.create(null);
  const inflight = Object.create(null);
  const LOADING_HTML =
    '<div class="status">Ladataan käännöstä… iso tiedosto, odota hetki</div>';
  const IDB_NAME = "suomi-raamattu-packs";
  const IDB_VERSION = 1;
  let index = null;
  let pickerMode = "books";
  let pickerBook = null;
  let activeResult = -1;
  let searchTimer = 0;
  let pendingHighlight = null;
  let viewSeq = 0;

  const state = {
    translation: "biblia",
    translation2: "kjv",
    compare: false,
    book: "gen",
    chapter: 1,
    verse: null
  };

  function bookMeta(id) {
    return BibleBooks.byId[id] || BibleBooks.BOOKS[0];
  }

  function otherTranslation(id) {
    if (id !== "kjv") return "kjv";
    return "biblia";
  }

  function seedBook(translationId) {
    const seed = window.BIBLE_SEED && window.BIBLE_SEED[translationId];
    return seed || null;
  }

  function hasFullPack(translationId) {
    return !!(cache[translationId] && cache[translationId].books);
  }

  function bookDataOf(translationId, id) {
    const pack = cache[translationId];
    if (pack && pack.books) {
      return pack.books.find((b) => b.id === id) || null;
    }
    const seed = seedBook(translationId);
    if (seed && seed.id === id) return seed;
    return null;
  }

  function hasLocalChapter(translationId, book, chapter) {
    const data = bookDataOf(translationId, book);
    const verses = data && data.chapters[chapter - 1];
    return !!(verses && verses.length);
  }

  function canPaintCurrent() {
    if (!hasLocalChapter(state.translation, state.book, state.chapter)) return false;
    if (state.compare && !hasLocalChapter(state.translation2, state.book, state.chapter)) {
      return false;
    }
    return true;
  }

  function neededTranslations() {
    const ids = [state.translation];
    if (state.compare) {
      if (state.translation2 === state.translation) {
        state.translation2 = otherTranslation(state.translation);
      }
      ids.push(state.translation2);
    }
    return ids;
  }

  function syncSearchReady() {
    if (!els.search) return;
    if (index) {
      els.search.placeholder = "Hae tai avaa kohta, esim. Joh 3:16";
      els.search.removeAttribute("aria-disabled");
    } else {
      els.search.placeholder = "Haku käytössä kun käännös on ladattu";
      els.search.setAttribute("aria-disabled", "true");
    }
  }

  function bookData(id) {
    return bookDataOf(state.translation, id);
  }

  function chapterCount(id) {
    const left = bookDataOf(state.translation, id);
    const leftN = left ? left.chapters.length : 0;
    if (!state.compare) return leftN;
    const right = bookDataOf(state.translation2, id);
    const rightN = right ? right.chapters.length : 0;
    return Math.max(leftN, rightN);
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          translation: state.translation,
          translation2: state.translation2,
          compare: state.compare,
          book: state.book,
          chapter: state.chapter
        })
      );
    } catch (_) {}
  }

  function restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("suomi-raamattu:v1");
      if (!raw) return;
      const s = JSON.parse(raw);
      if (TRANSLATIONS[s.translation]) state.translation = s.translation;
      if (TRANSLATIONS[s.translation2]) state.translation2 = s.translation2;
      if (typeof s.compare === "boolean") state.compare = s.compare;
      if (BibleBooks.byId[s.book]) state.book = s.book;
      if (Number.isInteger(s.chapter) && s.chapter > 0) state.chapter = s.chapter;
    } catch (_) {}
    if (state.translation2 === state.translation) {
      state.translation2 = otherTranslation(state.translation);
    }
  }

  function writeHash() {
    const head = state.compare
      ? state.translation + "+" + state.translation2
      : state.translation;
    const parts = [head, state.book, String(state.chapter)];
    if (state.verse) parts.push(String(state.verse));
    const next = "#" + parts.join("/");
    if (location.hash !== next) history.replaceState(null, "", next);
  }

  function readHash() {
    const h = location.hash.replace(/^#/, "").trim();
    if (!h) return false;
    const parts = h.split("/").filter(Boolean);
    if (!parts.length) return false;
    let i = 0;
    if (parts[0].includes("+")) {
      const [a, b] = parts[0].split("+");
      if (TRANSLATIONS[a] && TRANSLATIONS[b] && a !== b) {
        state.translation = a;
        state.translation2 = b;
        state.compare = true;
        i = 1;
      }
    } else if (TRANSLATIONS[parts[0]]) {
      state.translation = parts[0];
      state.compare = false;
      i = 1;
    }
    if (parts[i] && BibleBooks.byId[parts[i]]) {
      state.book = parts[i];
      i += 1;
    }
    if (parts[i] && /^\d+$/.test(parts[i])) {
      state.chapter = parseInt(parts[i], 10);
      i += 1;
    }
    if (parts[i] && /^\d+$/.test(parts[i])) {
      state.verse = parseInt(parts[i], 10);
    }
    return true;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  function highlightHtml(text, query) {
    const safe = escapeHtml(text);
    if (!query) return safe;
    const q = query.toLocaleLowerCase("fi");
    const hay = safe.toLocaleLowerCase("fi");
    let out = "";
    let from = 0;
    let i = hay.indexOf(q, from);
    if (i < 0) return safe;
    while (i >= 0) {
      out += safe.slice(from, i) + "<mark>" + safe.slice(i, i + q.length) + "</mark>";
      from = i + q.length;
      i = hay.indexOf(q, from);
    }
    return out + safe.slice(from);
  }

  function snippet(text, query, radius) {
    const q = query.toLocaleLowerCase("fi");
    const hay = text.toLocaleLowerCase("fi");
    const i = hay.indexOf(q);
    if (i < 0) {
      return text.length > 140 ? text.slice(0, 137) + "…" : text;
    }
    const start = Math.max(0, i - radius);
    const end = Math.min(text.length, i + q.length + radius);
    return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
  }

  function parseReference(raw) {
    const q = raw.trim();
    if (!q) return null;
    const m = q.match(
      /^(\d+\.?\s*)?([a-zA-ZäöåÄÖÅ][a-zA-ZäöåÄÖÅ.\s]*?)\s+(\d+)(?:\s*[:.,]\s*(\d+))?$/
    );
    if (!m) return null;
    const bookPart = ((m[1] || "") + m[2]).trim();
    const book = BibleBooks.findBook(bookPart);
    if (!book) return null;
    return {
      book: book.id,
      chapter: parseInt(m[3], 10),
      verse: m[4] ? parseInt(m[4], 10) : null,
      meta: book
    };
  }

  function buildIndex(pack) {
    const rows = [];
    for (const book of pack.books) {
      const meta = bookMeta(book.id);
      book.chapters.forEach((verses, ci) => {
        verses.forEach((text, vi) => {
          if (!text) return;
          rows.push({
            id: book.id,
            name: meta.name,
            abbr: meta.abbr,
            c: ci + 1,
            v: vi + 1,
            text,
            hay: text.toLocaleLowerCase("fi")
          });
        });
      });
    }
    return rows;
  }

  function searchText(query) {
    if (!index || query.length < 2) return [];
    const q = query.toLocaleLowerCase("fi");
    const hits = [];
    for (let i = 0; i < index.length && hits.length < MAX_RESULTS; i++) {
      if (index[i].hay.includes(q)) hits.push(index[i]);
    }
    return hits;
  }

  function renderResults(query) {
    const box = els.results;
    box.innerHTML = "";
    activeResult = -1;
    const q = query.trim();
    if (!q) {
      box.classList.remove("open");
      return;
    }

    const ref = parseReference(q);
    const hits = searchText(q);
    if (!ref && !hits.length) {
      box.classList.add("open");
      box.innerHTML = index
        ? '<div class="empty-results">Ei hakutuloksia</div>'
        : '<div class="empty-results">Haku latautuu, odota hetki…</div>';
      return;
    }

    const frag = document.createDocumentFragment();
    if (ref) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "result jump";
      b.dataset.book = ref.book;
      b.dataset.chapter = String(ref.chapter);
      if (ref.verse) b.dataset.verse = String(ref.verse);
      const where = ref.verse
        ? ref.meta.abbr + " " + ref.chapter + ":" + ref.verse
        : ref.meta.abbr + " " + ref.chapter;
      b.innerHTML =
        '<div class="ref">Siirry · ' +
        escapeHtml(where) +
        "</div>" +
        '<div class="snip">' +
        escapeHtml(ref.meta.name) +
        ", luku " +
        ref.chapter +
        "</div>";
      frag.appendChild(b);
    }

    hits.forEach((hit) => {
      if (ref && hit.id === ref.book && hit.c === ref.chapter && hit.v === (ref.verse || hit.v) && ref.verse === hit.v) {
        return;
      }
      const b = document.createElement("button");
      b.type = "button";
      b.className = "result";
      b.dataset.book = hit.id;
      b.dataset.chapter = String(hit.c);
      b.dataset.verse = String(hit.v);
      b.dataset.q = q;
      b.innerHTML =
        '<div class="ref">' +
        escapeHtml(hit.abbr) +
        " " +
        hit.c +
        ":" +
        hit.v +
        " · " +
        escapeHtml(hit.name) +
        "</div>" +
        '<div class="snip">' +
        highlightHtml(snippet(hit.text, q, 52), q) +
        "</div>";
      frag.appendChild(b);
    });

    box.appendChild(frag);
    box.classList.add("open");
  }

  function closeResults() {
    els.results.classList.remove("open");
    activeResult = -1;
  }

  function goTo(book, chapter, verse, query) {
    state.book = book;
    state.chapter = Math.max(1, chapter);
    if (hasFullPack(state.translation)) {
      const nCh = Math.max(1, chapterCount(book) || 1);
      state.chapter = Math.min(state.chapter, nCh);
    }
    state.verse = verse || null;
    pendingHighlight = query || null;
    closeResults();
    els.search.blur();
    save();
    writeHash();
    if (canPaintCurrent() && neededTranslations().every(hasFullPack)) {
      renderChapter();
      return;
    }
    if (canPaintCurrent()) {
      renderChapter();
    }
    refreshView();
  }

  function neighbor(delta) {
    const books = BibleBooks.BOOKS;
    const idx = bookMeta(state.book).index;
    const nCh = chapterCount(state.book);
    const packsReady = neededTranslations().every(hasFullPack);
    let book = idx;
    let ch = state.chapter + delta;
    if (!packsReady && delta > 0 && (nCh === 0 || ch > nCh)) {
      return { book: state.book, chapter: state.chapter + 1 };
    }
    if (ch < 1) {
      if (book === 0) return null;
      book -= 1;
      ch = chapterCount(books[book].id) || 1;
    } else if (ch > nCh) {
      if (book === books.length - 1) return null;
      book += 1;
      ch = 1;
    }
    return { book: books[book].id, chapter: ch };
  }

  function passageHtml(verses, q, idPrefix) {
    let html = "<div class='passage'>";
    verses.forEach((text, i) => {
      if (!text) return;
      const n = i + 1;
      const hit = state.verse === n ? " hit" : "";
      html +=
        '<span class="verse' +
        hit +
        '" id="' +
        idPrefix +
        n +
        '"><span class="vn">' +
        n +
        "</span>" +
        highlightHtml(text, q && state.verse === n ? q : "") +
        " </span>";
    });
    html += "</div>";
    return html;
  }

  function paneHtml(translationId, idPrefix) {
    const meta = bookMeta(state.book);
    const data = bookDataOf(translationId, state.book);
    const label = TRANSLATIONS[translationId].label;
    let html = '<section class="pane">';
    html +=
      '<div class="chapter-head"><h2>' +
      escapeHtml(meta.name) +
      " " +
      state.chapter +
      '</h2><div class="tr">' +
      escapeHtml(label) +
      "</div></div>";
    if (!data || !data.chapters[state.chapter - 1]) {
      html += '<div class="status error">Tätä lukua ei löytynyt.</div></section>';
      return html;
    }
    html += passageHtml(data.chapters[state.chapter - 1], pendingHighlight, idPrefix);
    html += "</section>";
    return html;
  }

  function chapterEndHtml(prev, next) {
    let html = '<div class="chapter-end">';
    html +=
      '<button type="button" id="end-prev"' +
      (prev ? "" : " disabled") +
      ">" +
      (prev ? "← " + bookMeta(prev.book).abbr + " " + prev.chapter : "Alku") +
      "</button>";
    html +=
      '<button type="button" id="end-next"' +
      (next ? "" : " disabled") +
      ">" +
      (next ? bookMeta(next.book).abbr + " " + next.chapter + " →" : "Loppu") +
      "</button></div>";
    return html;
  }

  function updateChrome() {
    const meta = bookMeta(state.book);
    els.bookBtnLabel.textContent = meta.name + " " + state.chapter;
    if (state.compare) {
      els.footerTr.textContent =
        TRANSLATIONS[state.translation].label + " · " + TRANSLATIONS[state.translation2].label;
    } else {
      els.footerTr.textContent = TRANSLATIONS[state.translation].label;
    }
    els.toggles.forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.dataset.translation === state.translation ? "true" : "false");
    });
    els.rightToggles.forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.dataset.translationRight === state.translation2 ? "true" : "false");
    });
    els.compareBtn.setAttribute("aria-pressed", state.compare ? "true" : "false");
    els.compareRow.hidden = !state.compare;
    document.body.classList.toggle("compare-on", state.compare);

    const prev = neighbor(-1);
    const next = neighbor(1);
    els.prev.disabled = !prev;
    els.next.disabled = !next;
    return { prev, next, meta };
  }

  function bindChapterEnd() {
    const prevBtn = $("#end-prev");
    const nextBtn = $("#end-next");
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        const n = neighbor(-1);
        if (n) goTo(n.book, n.chapter);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        const n = neighbor(1);
        if (n) goTo(n.book, n.chapter);
      });
    }
  }

  function scrollToVerse() {
    if (state.verse) {
      const node = document.getElementById("v" + state.verse) || document.getElementById("vr" + state.verse);
      if (node) {
        requestAnimationFrame(() => node.scrollIntoView({ block: "center", behavior: "smooth" }));
        return;
      }
    }
    window.scrollTo(0, 0);
  }

  function renderChapter(opts) {
    const keepScroll = opts && opts.keepScroll;
    const { prev, next } = updateChrome();

    if (state.compare) {
      let html = '<div class="compare-grid">';
      html += paneHtml(state.translation, "v");
      html += paneHtml(state.translation2, "vr");
      html += "</div>";
      html += chapterEndHtml(prev, next);
      els.main.innerHTML = html;
      bindChapterEnd();
      if (!keepScroll) scrollToVerse();
      return;
    }

    const data = bookData(state.book);
    if (!data || !data.chapters[state.chapter - 1]) {
      els.main.innerHTML = '<div class="status error">Tätä lukua ei löytynyt.</div>';
      return;
    }

    const meta = bookMeta(state.book);
    const verses = data.chapters[state.chapter - 1];
    const q = pendingHighlight;
    let html =
      '<div class="chapter-head"><h2>' +
      escapeHtml(meta.name) +
      " " +
      state.chapter +
      '</h2><div class="tr">' +
      escapeHtml(TRANSLATIONS[state.translation].label) +
      "</div></div>";
    html += passageHtml(verses, q, "v");
    html += chapterEndHtml(prev, next);

    els.main.innerHTML = html;
    bindChapterEnd();
    if (!keepScroll) scrollToVerse();
  }

  function openPicker() {
    pickerMode = "books";
    pickerBook = null;
    els.overlay.classList.add("open");
    els.overlay.setAttribute("aria-hidden", "false");
    renderPicker();
    els.sheetClose.focus();
  }

  function closePicker() {
    els.overlay.classList.remove("open");
    els.overlay.setAttribute("aria-hidden", "true");
  }

  function renderPicker() {
    if (pickerMode === "books") {
      els.sheetTitle.textContent = "Valitse kirja";
      els.sheetBack.hidden = true;
      let html = '<div class="group-title">Vanha testamentti</div><div class="book-list">';
      BibleBooks.OT.forEach((b) => {
        html += bookRow(b);
      });
      html += '</div><div class="group-title">Uusi testamentti</div><div class="book-list">';
      BibleBooks.NT.forEach((b) => {
        html += bookRow(b);
      });
      html += "</div>";
      els.sheetBody.innerHTML = html;
    } else {
      const meta = bookMeta(pickerBook);
      const n = chapterCount(pickerBook);
      els.sheetTitle.textContent = meta.name;
      els.sheetBack.hidden = false;
      let html = '<div class="chapters">';
      for (let i = 1; i <= n; i++) {
        const cur = pickerBook === state.book && i === state.chapter ? ' aria-current="true"' : "";
        html += '<button type="button" data-chapter="' + i + '"' + cur + ">" + i + "</button>";
      }
      html += "</div>";
      els.sheetBody.innerHTML = html;
    }
  }

  function bookRow(b) {
    const cur = b.id === state.book ? ' aria-current="true"' : "";
    return (
      '<button type="button" data-book="' +
      b.id +
      '"' +
      cur +
      "><span>" +
      escapeHtml(b.name) +
      '</span><span class="abbr">' +
      escapeHtml(b.abbr) +
      "</span></button>"
    );
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Ei voitu ladata " + src));
      document.head.appendChild(s);
    });
  }

  let idbPromise = null;

  function openIdb() {
    if (idbPromise) return idbPromise;
    idbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("no idb"));
        return;
      }
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("packs")) db.createObjectStore("packs");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        idbPromise = null;
        reject(req.error);
      };
    });
    return idbPromise;
  }

  async function idbGetPack(id) {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("packs", "readonly");
      const r = tx.objectStore("packs").get(id);
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => reject(r.error);
    });
  }

  async function idbPutPack(id, pack) {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("packs", "readwrite");
      const r = tx.objectStore("packs").put(pack, id);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
  }

  async function fetchPackFromNetwork(id) {
    if (window.BIBLES && window.BIBLES[id]) return window.BIBLES[id];
    try {
      const res = await fetch(TRANSLATIONS[id].file);
      if (!res.ok) throw new Error("status " + res.status);
      return await res.json();
    } catch (err) {
      await loadScript("data/" + id + ".js");
      if (!window.BIBLES || !window.BIBLES[id]) {
        throw new Error("Tekstiä ei voitu ladata (" + err.message + ")");
      }
      return window.BIBLES[id];
    }
  }

  function loadTranslation(id) {
    if (cache[id]) return Promise.resolve(cache[id]);
    if (inflight[id]) return inflight[id];
    inflight[id] = (async () => {
      try {
        if (window.BIBLES && window.BIBLES[id]) {
          cache[id] = window.BIBLES[id];
          return cache[id];
        }
        try {
          const stored = await idbGetPack(id);
          if (stored && Array.isArray(stored.books) && stored.books.length) {
            cache[id] = stored;
            return stored;
          }
        } catch (_) {}
        if (cache[id]) return cache[id];
        const pack = await fetchPackFromNetwork(id);
        cache[id] = pack;
        idbPutPack(id, pack).catch(() => {});
        return pack;
      } finally {
        delete inflight[id];
      }
    })();
    return inflight[id];
  }

  function warmIdbCache() {
    Object.keys(TRANSLATIONS).forEach((id) => {
      if (cache[id] || inflight[id]) return;
      idbGetPack(id)
        .then((pack) => {
          if (pack && Array.isArray(pack.books) && pack.books.length && !cache[id]) {
            cache[id] = pack;
          }
        })
        .catch(() => {});
    });
  }

  function clampPlace() {
    if (!hasFullPack(state.translation)) return;
    const nCh = chapterCount(state.book);
    if (!nCh) {
      state.book = "gen";
      state.chapter = 1;
    } else if (state.chapter > nCh) {
      state.chapter = nCh;
    }
  }

  function applyLoadedPacks() {
    const prevBook = state.book;
    const prevCh = state.chapter;
    const prevVerse = state.verse;
    const y = window.scrollY;
    if (cache[state.translation]) {
      index = buildIndex(cache[state.translation]);
    }
    syncSearchReady();
    clampPlace();
    save();
    writeHash();
    if (canPaintCurrent()) {
      const same =
        prevBook === state.book && prevCh === state.chapter && prevVerse === state.verse;
      renderChapter({ keepScroll: same && !state.verse });
      if (same && !state.verse) window.scrollTo(0, y);
    }
    if (els.search.value.trim()) renderResults(els.search.value);
  }

  async function refreshView() {
    const seq = ++viewSeq;
    const ids = neededTranslations();
    if (canPaintCurrent()) {
      save();
      writeHash();
      renderChapter();
    } else {
      els.main.innerHTML = LOADING_HTML;
      updateChrome();
    }
    syncSearchReady();
    try {
      await Promise.all(ids.map((id) => loadTranslation(id)));
      if (seq !== viewSeq) return;
      applyLoadedPacks();
    } catch (err) {
      if (seq !== viewSeq) return;
      if (canPaintCurrent()) {
        renderChapter();
        return;
      }
      els.main.innerHTML =
        '<div class="status error">Tekstien lataus epäonnistui. Avaa sivu paikallisella palvelimella (esim. python3 -m http.server) tai GitHub Pagesissa.<br><br>' +
        escapeHtml(err.message) +
        "</div>";
    }
  }

  async function showTranslation(id, keepPlace) {
    state.translation = id;
    if (state.compare && state.translation2 === id) {
      state.translation2 = keepPlace && TRANSLATIONS[keepPlace] ? keepPlace : otherTranslation(id);
    }
    await refreshView();
  }

  function onSearchInput() {
    const q = els.search.value;
    els.searchWrap.classList.toggle("has-query", q.length > 0);
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => renderResults(q), 90);
  }

  function activateResult(delta) {
    const items = $$(".result", els.results);
    if (!items.length) return;
    activeResult = (activeResult + delta + items.length) % items.length;
    items.forEach((el, i) => el.classList.toggle("active", i === activeResult));
    items[activeResult].scrollIntoView({ block: "nearest" });
  }

  function chooseActiveOrRef() {
    const items = $$(".result", els.results);
    if (activeResult >= 0 && items[activeResult]) {
      items[activeResult].click();
      return;
    }
    const ref = parseReference(els.search.value.trim());
    if (ref) {
      goTo(ref.book, ref.chapter, ref.verse);
      return;
    }
    if (items[0]) items[0].click();
  }

  function bind() {
    els.toggles.forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.translation;
        if (id === state.translation) return;
        const prev = state.translation;
        showTranslation(id, prev);
      });
    });

    els.rightToggles.forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.translationRight;
        if (!TRANSLATIONS[id] || id === state.translation2) return;
        if (id === state.translation) {
          state.translation = state.translation2;
        }
        state.translation2 = id;
        refreshView();
      });
    });

    els.compareBtn.addEventListener("click", () => {
      state.compare = !state.compare;
      if (state.compare && state.translation2 === state.translation) {
        state.translation2 = otherTranslation(state.translation);
      }
      refreshView();
    });

    els.search.addEventListener("input", onSearchInput);
    els.search.addEventListener("focus", () => {
      if (els.search.value.trim()) renderResults(els.search.value);
    });
    els.search.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        activateResult(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activateResult(-1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        chooseActiveOrRef();
      } else if (e.key === "Escape") {
        closeResults();
        els.search.blur();
      }
    });

    els.clear.addEventListener("click", () => {
      els.search.value = "";
      els.searchWrap.classList.remove("has-query");
      closeResults();
      els.search.focus();
    });

    els.results.addEventListener("click", (e) => {
      const btn = e.target.closest(".result");
      if (!btn) return;
      goTo(
        btn.dataset.book,
        parseInt(btn.dataset.chapter, 10),
        btn.dataset.verse ? parseInt(btn.dataset.verse, 10) : null,
        btn.dataset.q || null
      );
    });

    els.bookBtn.addEventListener("click", openPicker);
    els.sheetClose.addEventListener("click", closePicker);
    els.sheetBack.addEventListener("click", () => {
      pickerMode = "books";
      renderPicker();
    });
    els.overlay.addEventListener("click", (e) => {
      if (e.target === els.overlay) closePicker();
    });
    els.sheetBody.addEventListener("click", (e) => {
      const bookBtn = e.target.closest("[data-book]");
      if (bookBtn) {
        pickerBook = bookBtn.dataset.book;
        const n = chapterCount(pickerBook);
        if (n <= 0) {
          goTo(pickerBook, 1);
          closePicker();
          return;
        }
        pickerMode = "chapters";
        renderPicker();
        return;
      }
      const chBtn = e.target.closest("[data-chapter]");
      if (chBtn) {
        goTo(pickerBook, parseInt(chBtn.dataset.chapter, 10));
        closePicker();
      }
    });

    els.prev.addEventListener("click", () => {
      const n = neighbor(-1);
      if (n) goTo(n.book, n.chapter);
    });
    els.next.addEventListener("click", () => {
      const n = neighbor(1);
      if (n) goTo(n.book, n.chapter);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && els.overlay.classList.contains("open")) closePicker();
    });

    window.addEventListener("hashchange", () => {
      readHash();
      refreshView();
    });

    document.addEventListener("click", (e) => {
      if (!els.searchWrap.contains(e.target)) closeResults();
    });
  }

  async function init() {
    restore();
    readHash();
    bind();
    els.searchWrap.classList.toggle("has-query", els.search.value.length > 0);
    syncSearchReady();
    warmIdbCache();
    await refreshView();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
