(function () {
  "use strict";

  const STORAGE_KEY = "suomi-raamattu:v1";
  const TRANSLATIONS = {
    biblia: { file: "data/biblia.json", short: "Biblia", label: "Biblia 1776" },
    kr1938: { file: "data/kr1938.json", short: "KR 1938", label: "Kirkkoraamattu 1933/1938" }
  };
  const MAX_RESULTS = 40;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const els = {
    toggles: $$("[data-translation]"),
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
  let index = null;
  let pickerMode = "books";
  let pickerBook = null;
  let activeResult = -1;
  let searchTimer = 0;
  let pendingHighlight = null;

  const state = {
    translation: "biblia",
    book: "gen",
    chapter: 1,
    verse: null
  };

  function bookMeta(id) {
    return BibleBooks.byId[id] || BibleBooks.BOOKS[0];
  }

  function currentPack() {
    return cache[state.translation];
  }

  function bookData(id) {
    const pack = currentPack();
    if (!pack) return null;
    return pack.books.find((b) => b.id === id) || null;
  }

  function chapterCount(id) {
    const b = bookData(id);
    return b ? b.chapters.length : 0;
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          translation: state.translation,
          book: state.book,
          chapter: state.chapter
        })
      );
    } catch (_) {}
  }

  function restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (TRANSLATIONS[s.translation]) state.translation = s.translation;
      if (BibleBooks.byId[s.book]) state.book = s.book;
      if (Number.isInteger(s.chapter) && s.chapter > 0) state.chapter = s.chapter;
    } catch (_) {}
  }

  function writeHash() {
    const parts = [state.translation, state.book, String(state.chapter)];
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
    if (TRANSLATIONS[parts[0]]) {
      state.translation = parts[0];
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
      box.innerHTML = '<div class="empty-results">Ei hakutuloksia</div>';
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
    const nCh = Math.max(1, chapterCount(book) || 1);
    state.book = book;
    state.chapter = Math.min(Math.max(1, chapter), nCh);
    state.verse = verse || null;
    pendingHighlight = query || null;
    closeResults();
    els.search.blur();
    save();
    writeHash();
    renderChapter();
  }

  function neighbor(delta) {
    const books = BibleBooks.BOOKS;
    const idx = bookMeta(state.book).index;
    const nCh = chapterCount(state.book);
    let book = idx;
    let ch = state.chapter + delta;
    if (ch < 1) {
      if (book === 0) return null;
      book -= 1;
      ch = chapterCount(books[book].id);
    } else if (ch > nCh) {
      if (book === books.length - 1) return null;
      book += 1;
      ch = 1;
    }
    return { book: books[book].id, chapter: ch };
  }

  function renderChapter() {
    const meta = bookMeta(state.book);
    const data = bookData(state.book);
    els.bookBtnLabel.textContent = meta.name + " " + state.chapter;
    els.footerTr.textContent = TRANSLATIONS[state.translation].label;
    els.toggles.forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.dataset.translation === state.translation ? "true" : "false");
    });

    const prev = neighbor(-1);
    const next = neighbor(1);
    els.prev.disabled = !prev;
    els.next.disabled = !next;

    if (!data || !data.chapters[state.chapter - 1]) {
      els.main.innerHTML = '<div class="status error">Tätä lukua ei löytynyt.</div>';
      return;
    }

    const verses = data.chapters[state.chapter - 1];
    const q = pendingHighlight;
    let html =
      '<div class="chapter-head"><h2>' +
      escapeHtml(meta.name) +
      " " +
      state.chapter +
      '</h2><div class="tr">' +
      escapeHtml(TRANSLATIONS[state.translation].label) +
      "</div></div><div class='passage'>";

    verses.forEach((text, i) => {
      if (!text) return;
      const n = i + 1;
      const hit = state.verse === n ? " hit" : "";
      html +=
        '<span class="verse' +
        hit +
        '" id="v' +
        n +
        '"><span class="vn">' +
        n +
        "</span>" +
        highlightHtml(text, q && state.verse === n ? q : "") +
        " </span>";
    });

    html += "</div>";
    html += '<div class="chapter-end">';
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

    els.main.innerHTML = html;
    $("#end-prev").addEventListener("click", () => {
      const n = neighbor(-1);
      if (n) goTo(n.book, n.chapter);
    });
    $("#end-next").addEventListener("click", () => {
      const n = neighbor(1);
      if (n) goTo(n.book, n.chapter);
    });

    if (state.verse) {
      const node = document.getElementById("v" + state.verse);
      if (node) {
        requestAnimationFrame(() => node.scrollIntoView({ block: "center", behavior: "smooth" }));
      }
    } else {
      window.scrollTo(0, 0);
    }
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

  async function loadTranslation(id) {
    if (cache[id]) return cache[id];
    if (window.BIBLES && window.BIBLES[id]) {
      cache[id] = window.BIBLES[id];
      return cache[id];
    }
    try {
      const res = await fetch(TRANSLATIONS[id].file);
      if (!res.ok) throw new Error("status " + res.status);
      cache[id] = await res.json();
      return cache[id];
    } catch (err) {
      await loadScript("data/" + id + ".js");
      if (!window.BIBLES || !window.BIBLES[id]) {
        throw new Error("Tekstiä ei voitu ladata (" + err.message + ")");
      }
      cache[id] = window.BIBLES[id];
      return cache[id];
    }
  }

  async function showTranslation(id, keepPlace) {
    els.main.innerHTML = '<div class="status">Ladataan Raamattua…</div>';
    try {
      await loadTranslation(id);
      state.translation = id;
      index = buildIndex(cache[id]);
      const nCh = chapterCount(state.book);
      if (!nCh) {
        state.book = "gen";
        state.chapter = 1;
      } else if (state.chapter > nCh) {
        state.chapter = nCh;
      }
      if (!keepPlace) {
        /* keep current book/chapter when toggling */
      }
      save();
      writeHash();
      renderChapter();
      if (els.search.value.trim()) renderResults(els.search.value);
    } catch (err) {
      els.main.innerHTML =
        '<div class="status error">Tekstien lataus epäonnistui. Avaa sivu paikallisella palvelimella (esim. python3 -m http.server) tai GitHub Pagesissa.<br><br>' +
        escapeHtml(err.message) +
        "</div>";
    }
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
        if (btn.dataset.translation !== state.translation) {
          showTranslation(btn.dataset.translation, true);
        }
      });
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
      showTranslation(state.translation, true);
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
    await showTranslation(state.translation, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
