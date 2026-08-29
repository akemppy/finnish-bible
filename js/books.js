/* Finnish Protestant canon — names and abbreviations people actually type. */
(function (global) {
  const BOOKS = [
    { id: "gen", name: "1. Mooseksen kirja", abbr: "1 Moos", testament: "ot" },
    { id: "exo", name: "2. Mooseksen kirja", abbr: "2 Moos", testament: "ot" },
    { id: "lev", name: "3. Mooseksen kirja", abbr: "3 Moos", testament: "ot" },
    { id: "num", name: "4. Mooseksen kirja", abbr: "4 Moos", testament: "ot" },
    { id: "deu", name: "5. Mooseksen kirja", abbr: "5 Moos", testament: "ot" },
    { id: "jos", name: "Joosua", abbr: "Jos", testament: "ot" },
    { id: "jdg", name: "Tuomarien kirja", abbr: "Tuom", testament: "ot" },
    { id: "rut", name: "Ruut", abbr: "Ruut", testament: "ot" },
    { id: "1sa", name: "1. Samuelin kirja", abbr: "1 Sam", testament: "ot" },
    { id: "2sa", name: "2. Samuelin kirja", abbr: "2 Sam", testament: "ot" },
    { id: "1ki", name: "1. Kuninkaiden kirja", abbr: "1 Kun", testament: "ot" },
    { id: "2ki", name: "2. Kuninkaiden kirja", abbr: "2 Kun", testament: "ot" },
    { id: "1ch", name: "1. Aikakirja", abbr: "1 Aik", testament: "ot" },
    { id: "2ch", name: "2. Aikakirja", abbr: "2 Aik", testament: "ot" },
    { id: "ezr", name: "Esra", abbr: "Esra", testament: "ot" },
    { id: "neh", name: "Nehemia", abbr: "Neh", testament: "ot" },
    { id: "est", name: "Ester", abbr: "Est", testament: "ot" },
    { id: "job", name: "Job", abbr: "Job", testament: "ot" },
    { id: "psa", name: "Psalmit", abbr: "Ps", testament: "ot" },
    { id: "pro", name: "Sananlaskut", abbr: "Sananl", testament: "ot" },
    { id: "ecc", name: "Saarnaaja", abbr: "Saarn", testament: "ot" },
    { id: "sng", name: "Korkea veisu", abbr: "Laul", testament: "ot" },
    { id: "isa", name: "Jesaja", abbr: "Jes", testament: "ot" },
    { id: "jer", name: "Jeremia", abbr: "Jer", testament: "ot" },
    { id: "lam", name: "Valitusvirret", abbr: "Valit", testament: "ot" },
    { id: "ezk", name: "Hesekiel", abbr: "Hes", testament: "ot" },
    { id: "dan", name: "Daniel", abbr: "Dan", testament: "ot" },
    { id: "hos", name: "Hoosea", abbr: "Hoos", testament: "ot" },
    { id: "jol", name: "Jooel", abbr: "Joel", testament: "ot" },
    { id: "amo", name: "Aamos", abbr: "Aam", testament: "ot" },
    { id: "oba", name: "Obadja", abbr: "Ob", testament: "ot" },
    { id: "jon", name: "Joona", abbr: "Joona", testament: "ot" },
    { id: "mic", name: "Miika", abbr: "Miika", testament: "ot" },
    { id: "nam", name: "Nahum", abbr: "Nah", testament: "ot" },
    { id: "hab", name: "Habakuk", abbr: "Hab", testament: "ot" },
    { id: "zep", name: "Sefanja", abbr: "Sef", testament: "ot" },
    { id: "hag", name: "Haggai", abbr: "Hagg", testament: "ot" },
    { id: "zec", name: "Sakarja", abbr: "Sak", testament: "ot" },
    { id: "mal", name: "Malakia", abbr: "Mal", testament: "ot" },
    { id: "mat", name: "Matteus", abbr: "Matt", testament: "nt" },
    { id: "mrk", name: "Markus", abbr: "Mark", testament: "nt" },
    { id: "luk", name: "Luukas", abbr: "Luuk", testament: "nt" },
    { id: "jhn", name: "Johannes", abbr: "Joh", testament: "nt" },
    { id: "act", name: "Apostolien teot", abbr: "Apt", testament: "nt" },
    { id: "rom", name: "Roomalaiskirje", abbr: "Room", testament: "nt" },
    { id: "1co", name: "1. Korinttilaiskirje", abbr: "1 Kor", testament: "nt" },
    { id: "2co", name: "2. Korinttilaiskirje", abbr: "2 Kor", testament: "nt" },
    { id: "gal", name: "Galatalaiskirje", abbr: "Gal", testament: "nt" },
    { id: "eph", name: "Efesolaiskirje", abbr: "Ef", testament: "nt" },
    { id: "php", name: "Filippiläiskirje", abbr: "Fil", testament: "nt" },
    { id: "col", name: "Kolossalaiskirje", abbr: "Kol", testament: "nt" },
    { id: "1th", name: "1. Tessalonikalaiskirje", abbr: "1 Tess", testament: "nt" },
    { id: "2th", name: "2. Tessalonikalaiskirje", abbr: "2 Tess", testament: "nt" },
    { id: "1ti", name: "1. Timoteuskirje", abbr: "1 Tim", testament: "nt" },
    { id: "2ti", name: "2. Timoteuskirje", abbr: "2 Tim", testament: "nt" },
    { id: "tit", name: "Tituksen kirje", abbr: "Tit", testament: "nt" },
    { id: "phm", name: "Filemonin kirje", abbr: "Filem", testament: "nt" },
    { id: "heb", name: "Heprealaiskirje", abbr: "Hepr", testament: "nt" },
    { id: "jas", name: "Jaakobin kirje", abbr: "Jaak", testament: "nt" },
    { id: "1pe", name: "1. Pietarin kirje", abbr: "1 Piet", testament: "nt" },
    { id: "2pe", name: "2. Pietarin kirje", abbr: "2 Piet", testament: "nt" },
    { id: "1jn", name: "1. Johanneksen kirje", abbr: "1 Joh", testament: "nt" },
    { id: "2jn", name: "2. Johanneksen kirje", abbr: "2 Joh", testament: "nt" },
    { id: "3jn", name: "3. Johanneksen kirje", abbr: "3 Joh", testament: "nt" },
    { id: "jud", name: "Juudaksen kirje", abbr: "Juud", testament: "nt" },
    { id: "rev", name: "Ilmestyskirja", abbr: "Ilm", testament: "nt" }
  ];

  const EXTRA_ALIASES = {
    gen: ["1moos", "1.moos", "i moos", "ensimmäinen mooseksen kirja", "genesis"],
    exo: ["2moos", "2.moos", "ii moos", "toinen mooseksen kirja", "exodus"],
    lev: ["3moos", "3.moos", "iii moos", "kolmas mooseksen kirja"],
    num: ["4moos", "4.moos", "iv moos", "neljäs mooseksen kirja"],
    deu: ["5moos", "5.moos", "v moos", "viides mooseksen kirja"],
    jos: ["joos", "joosuan kirja"],
    jdg: ["tuomarien", "tuom"],
    rut: ["ruutin kirja"],
    "1sa": ["1sam", "1.sam", "i sam"],
    "2sa": ["2sam", "2.sam", "ii sam"],
    "1ki": ["1kun", "1.kun", "i kun"],
    "2ki": ["2kun", "2.kun", "ii kun"],
    "1ch": ["1aik", "1.aik", "i aik"],
    "2ch": ["2aik", "2.aik", "ii aik"],
    psa: ["psalmi", "psalmin", "psalmit"],
    pro: ["sananlasku", "san"],
    ecc: ["saarn"],
    sng: ["korkea veisu", "laul. l", "laul l", "laul.l."],
    isa: ["esaias", "esa"],
    lam: ["valit"],
    ezk: ["hes"],
    jol: ["joel", "jooel"],
    oba: ["obadja", "ob"],
    jon: ["jonan kirja", "jon"],
    zep: ["sef"],
    zec: ["sak"],
    mat: ["matteuksen evankeliumi", "mt"],
    mrk: ["markuksen evankeliumi", "mk"],
    luk: ["luukkaan evankeliumi", "lk"],
    jhn: ["johanneksen evankeliumi", "jn"],
    act: ["ap. t", "ap.t", "ap t", "teot"],
    rom: ["roomalaiskirje", "room"],
    "1co": ["1kor", "1.kor", "i kor"],
    "2co": ["2kor", "2.kor", "ii kor"],
    eph: ["efesolaiskirje"],
    php: ["filippiläiskirje", "phil"],
    "1th": ["1tess", "1.tess", "i tess"],
    "2th": ["2tess", "2.tess", "ii tess"],
    "1ti": ["1tim", "1.tim", "i tim"],
    "2ti": ["2tim", "2.tim", "ii tim"],
    phm: ["filemon", "filem"],
    heb: ["hepr"],
    jas: ["jaakob"],
    "1pe": ["1piet", "1.piet", "i piet"],
    "2pe": ["2piet", "2.piet", "ii piet"],
    "1jn": ["1joh", "1.joh", "i joh"],
    "2jn": ["2joh", "2.joh", "ii joh"],
    "3jn": ["3joh", "3.joh", "iii joh"],
    jud: ["juudas", "juud"],
    rev: ["ilm", "ilmestys"]
  };

  function norm(s) {
    return String(s)
      .toLocaleLowerCase("fi")
      .replace(/[.\u00ad]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function compact(s) {
    return norm(s).replace(/\s+/g, "");
  }

  const byId = Object.create(null);
  const aliasMap = Object.create(null);

  function addAlias(alias, book) {
    const n = norm(alias);
    const c = compact(alias);
    if (n && !aliasMap[n]) aliasMap[n] = book;
    if (c && !aliasMap[c]) aliasMap[c] = book;
  }

  BOOKS.forEach((book, index) => {
    book.index = index;
    byId[book.id] = book;
    addAlias(book.id, book);
    addAlias(book.abbr, book);
    addAlias(book.name, book);
    addAlias(book.name.replace(/kirja$/i, "").trim(), book);
    addAlias(book.name.replace(/\d+\.\s*/, ""), book);
    (EXTRA_ALIASES[book.id] || []).forEach((a) => addAlias(a, book));
  });

  function findBook(query) {
    if (!query) return null;
    const n = norm(query);
    const c = compact(query);
    return aliasMap[n] || aliasMap[c] || null;
  }

  const EN_ALIASES = {
    gen: ["genesis", "gn"],
    exo: ["exodus", "ex", "exo"],
    lev: ["leviticus", "lev"],
    num: ["numbers", "num", "numb"],
    deu: ["deuteronomy", "deut", "dt"],
    jos: ["joshua"],
    jdg: ["judges", "judg"],
    rut: ["ruth"],
    "1sa": ["1 samuel", "i samuel", "1sa"],
    "2sa": ["2 samuel", "ii samuel", "2sa"],
    "1ki": ["1 kings", "i kings", "1ki", "1 kgs"],
    "2ki": ["2 kings", "ii kings", "2ki", "2 kgs"],
    "1ch": ["1 chronicles", "i chronicles", "1ch", "1 chron"],
    "2ch": ["2 chronicles", "ii chronicles", "2ch", "2 chron"],
    ezr: ["ezra"],
    neh: ["nehemiah"],
    est: ["esther"],
    job: ["job"],
    psa: ["psalms", "psalm"],
    pro: ["proverbs", "prov"],
    ecc: ["ecclesiastes", "eccl", "qoheleth"],
    sng: ["song of solomon", "song of songs", "canticles", "sos", "ss"],
    isa: ["isaiah"],
    jer: ["jeremiah"],
    lam: ["lamentations"],
    ezk: ["ezekiel"],
    dan: ["daniel"],
    hos: ["hosea"],
    jol: ["joel"],
    amo: ["amos"],
    oba: ["obadiah"],
    jon: ["jonah"],
    mic: ["micah"],
    nam: ["nahum"],
    hab: ["habakkuk"],
    zep: ["zephaniah"],
    hag: ["haggai"],
    zec: ["zechariah"],
    mal: ["malachi"],
    mat: ["matthew", "matt"],
    mrk: ["mark"],
    luk: ["luke"],
    jhn: ["john", "jn"],
    act: ["acts"],
    rom: ["romans"],
    "1co": ["1 corinthians", "i corinthians", "1co"],
    "2co": ["2 corinthians", "ii corinthians", "2co"],
    gal: ["galatians"],
    eph: ["ephesians"],
    php: ["philippians"],
    col: ["colossians"],
    "1th": ["1 thessalonians", "i thessalonians", "1th"],
    "2th": ["2 thessalonians", "ii thessalonians", "2th"],
    "1ti": ["1 timothy", "i timothy", "1ti"],
    "2ti": ["2 timothy", "ii timothy", "2ti"],
    tit: ["titus"],
    phm: ["philemon"],
    heb: ["hebrews"],
    jas: ["james"],
    "1pe": ["1 peter", "i peter", "1pe"],
    "2pe": ["2 peter", "ii peter", "2pe"],
    "1jn": ["1 john", "i john", "1jn"],
    "2jn": ["2 john", "ii john", "2jn"],
    "3jn": ["3 john", "iii john", "3jn"],
    jud: ["jude"],
    rev: ["revelation", "revelations", "rev", "apoc"]
  };

  Object.keys(EN_ALIASES).forEach((id) => {
    const book = byId[id];
    if (!book) return;
    EN_ALIASES[id].forEach((a) => addAlias(a, book));
  });

  global.BibleBooks = {
    BOOKS,
    byId,
    findBook,
    norm,
    OT: BOOKS.filter((b) => b.testament === "ot"),
    NT: BOOKS.filter((b) => b.testament === "nt")
  };
})(window);
