// =============================================
// PYQ Saarthi — core: data, storage, language, exam selection, routing, pages
// Routes:  #home | #b~<board> | #f~<familyId> | #r~<paperId>~<page>
//          #subjects | #s~<subject>[~<fams>] | #g~<group>~<subject>[~<fams>]
//          #t~<topic>[~<fams>][~test] | #p~<topic>~<page>[~<fams>]
//          #pick~g~<return> | #pick~s~<subject>~<fams> | #pick~t~<topic>
//          #x~paper~<paperId> | #x~topic~<topic>~<chunk>
//   <fams> = comma separated family ids (temporary scope)
// =============================================

const $app = document.getElementById("app");
let CATALOG = null;
const CACHE = {};

/* ---------- storage ---------- */
const store = {
  get(k, d = null) { try { const v = localStorage.getItem("ps." + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem("ps." + k, JSON.stringify(v)); } catch { } },
  del(k) { try { localStorage.removeItem("ps." + k); } catch { } },
  delPrefix(p) { try { Object.keys(localStorage).filter(k => k.startsWith("ps." + p)).forEach(k => localStorage.removeItem(k)); } catch { } }
};

/* ---------- language (हिं / EN) ---------- */
let LANG = store.get("lang", "hi");
const L = (hi, en) => LANG === "en" ? en : hi;
const nm = o => (LANG === "en" && o.en) ? o.en : o.name;
function langToggle() {
  return `<div class="lang" role="group" aria-label="Language">
    <button class="${LANG === "hi" ? "on" : ""}" data-act="lang" data-v="hi">हिं</button>
    <button class="${LANG === "en" ? "on" : ""}" data-act="lang" data-v="en">EN</button></div>`;
}

/* ---------- helpers ---------- */
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function fmt(text) {
  return esc(text || "")
    .replace(/\*\*_(.*?)_\*\*/g, "<strong><u>$1</u></strong>")
    .replace(/_\*\*(.*?)\*\*_/g, "<strong><u>$1</u></strong>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(ऀ-ॿ'"])_(?!\s)([^_\n]+?)_(?=$|[\s).,।?!'":ऀ-ॿ])/g, "$1<u>$2</u>")
    .replace(/\n/g, "<br>");
}
async function getJSON(path) {
  if (CACHE[path]) return CACHE[path];
  const r = await fetch(path);
  if (!r.ok) throw new Error(path + " " + r.status);
  const d = await r.json();
  if (path.startsWith("data/papers/")) d.questions.forEach(q => { q.pp = d.id; fixQ(q); });
  else if (path.startsWith("data/tb/")) Object.values(d).forEach(t => t.questions.forEach(fixQ));
  return (CACHE[path] = d);
}
// ---------- सुधार शीट (Google Sheet → turant site par) ----------
let FIX = {};
function parseCSV(t) {
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}
async function loadFixes() {
  if (!SITE.SUDHAR_CSV) return;
  try {
    const u = SITE.SUDHAR_CSV + (SITE.SUDHAR_CSV.includes("?") ? "&" : "?") + "t=" + Date.now();
    const rows = parseCSV(await (await fetch(u)).text());
    const h = (rows.shift() || []).map(x => x.trim().toLowerCase());
    const col = name => h.indexOf(name.toLowerCase());
    const idc = col("QID_Full") >= 0 ? col("QID_Full") : col("QID");
    if (idc < 0) return;
    rows.forEach(r => {
      const id = (r[idc] || "").trim(); if (!id) return;
      const g = n => { const i = col(n); return i >= 0 ? (r[i] || "").trim() : ""; };
      FIX[id] = { q: g("Question"), o: [1, 2, 3, 4].map(k => g("Option " + k)), a: g("Final_Ans").toUpperCase(), e: g("Explanation"), t: g("Topic Tadka") };
    });
  } catch (e) { console.warn("सुधार शीट लोड नहीं हुई", e); }
}
function fixQ(q) {
  const f = FIX[q.id]; if (!f) return;
  if (f.q) q.q = f.q;
  f.o.forEach((v, i) => { if (v) q.o[i] = v; });
  if (/^[ABCD]$/.test(f.a)) { q.a = "ABCD".indexOf(f.a) + 1; q.d = 0; }
  else if (f.a.startsWith("DEL")) q.d = 1;
  if (f.e) q.e = f.e;
  if (f.t) q.t = f.t;
}
const loadTopic = id => getJSON(`data/tb/${TOPIC[id].b}.json`).then(d => d[id]);
const loadPaper = id => getJSON(`data/papers/${id}.json`);
const go = hash => { if (location.hash === "#" + hash) route(); else location.hash = hash; };
const toNum = n => Number.isInteger(n) ? n : (+n).toFixed(2);
const nf = n => (+n).toLocaleString("en-IN");
const MONTHS_HI = ["जन", "फ़र", "मार्च", "अप्रै", "मई", "जून", "जुला", "अग", "सित", "अक्टू", "नव", "दिस"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fdate = d => d ? `${+d.slice(8, 10)} ${(LANG === "en" ? MONTHS_EN : MONTHS_HI)[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}` : "";
const today = () => new Date().toISOString().slice(0, 10);
const allFamilies = () => CATALOG.boards.flatMap(b => b.families.map(f => ({ ...f, board: b })));
const family = id => allFamilies().find(f => f.id === id);
const fshort = id => family(id)?.short || family(id)?.name || id;
const paperMeta = id => CATALOG.papers[id];
const paperName = (id, short) => {
  const p = paperMeta(id); if (!p) return "";
  return short ? `${p.fam}${p.title ? " " + p.title : ""} • ${p.year}` : `${p.fam}${p.title ? " — " + p.title : ""} • ${fdate(p.date)}`;
};

/* ---------- catalog index: subject → group → topic ---------- */
let SUBJ = {}, GROUP = {}, TOPIC = {}, MAXY = 0, YEARS = [];
function indexCatalog() {
  CATALOG.subjects.forEach(s => {
    SUBJ[s.id] = s;
    s.groups.forEach(g => {
      if (!GROUP[g.id]) GROUP[g.id] = { ...g, sid: s.id };
      g.topics.forEach(t => { if (!TOPIC[t.id]) TOPIC[t.id] = { ...t, g: GROUP[g.id], s: s }; });
    });
  });
  YEARS = [...new Set(Object.values(CATALOG.papers).map(p => p.year))].sort((a, b) => b - a);
  MAXY = YEARS[0];
}
const topicMeta = id => TOPIC[id];

/* =============================================
   EXAM SELECTION ("मेरी परीक्षाएँ")
   ============================================= */
const EMPTY = () => ({ fams: [], yrs: [], last: 0 });
const mySel = () => store.get("my", null) || EMPTY();
const hasPicked = () => store.get("my", null) !== null;
const yrOk = (y, s) => s.yrs.length ? s.yrs.includes(+y) : s.last ? +y > MAXY - s.last : true;
const isAll = s => !s.fams.length && !s.yrs.length && !s.last;
function tcount(t, s) {
  if (!s || isAll(s)) return t.n;
  let n = 0;
  for (const k in t.c) { const i = k.indexOf("|"); const f = k.slice(0, i); if ((!s.fams.length || s.fams.includes(f)) && yrOk(k.slice(i + 1), s)) n += t.c[k]; }
  return n;
}
const gcount = (g, s) => g.topics.reduce((a, t) => a + tcount(t, s), 0);
const scount = (sb, s) => { const seen = new Set(); let n = 0; sb.groups.forEach(g => g.topics.forEach(t => { if (!seen.has(t.id)) { seen.add(t.id); n += tcount(t, s); } })); return n; };
const LAST_OPTS = [[1, "पिछला 1 साल", "Last 1 yr"], [3, "पिछले 3 साल", "Last 3 yrs"], [5, "पिछले 5 साल", "Last 5 yrs"]];
function yearText(s) {
  return s.yrs.length ? [...s.yrs].sort((a, b) => b - a).join(", ") : s.last ? LAST_OPTS.find(x => x[0] === s.last)[LANG === "en" ? 2 : 1] : "";
}
/* "RSSB (CET 12th, Patwari) • 2025, 2026" */
function selHTML(s, { plain = false } = {}) {
  if (!s.fams.length) {
    const y = yearText(s);
    return plain ? L("सारे exam", "All exams") + (y ? " • " + y : "") : `<span class="og"><b>${L("सारे exam", "All exams")}</b></span>${y ? `<span class="og yr">${y}</span>` : ""}`;
  }
  const byBoard = {};
  s.fams.forEach(id => { const f = family(id); if (f) (byBoard[f.board.name] = byBoard[f.board.name] || []).push(f.short || f.name); });
  const y = yearText(s);
  if (plain) return Object.entries(byBoard).map(([b, l]) => `${b} (${l.join(", ")})`).join(" ") + (y ? " • " + y : "");
  return Object.entries(byBoard).map(([b, l]) => `<span class="og"><b>${b}</b> ${esc(l.join(", "))}</span>`).join("") + (y ? `<span class="og yr">${y}</span>` : "");
}
function selBar(s, { label, href, btn }) {
  return `<div class="selbar"><div class="sb-l"><small>${label}</small><div class="sb-chips">${selHTML(s)}</div></div>
    <button class="sb-add" data-go="${href}">＋ ${btn}</button></div>`;
}
const enc = h => encodeURIComponent(h);
const famsParam = s => s ? s.split(",").filter(Boolean) : [];

/* Hindi words for exam search (exam names are in English) */
const HI_ALIAS = [[/patwar/i, "पटवारी पटवार"], [/cet/i, "सीईटी"], [/12th/i, "12वीं बारहवीं"], [/grad/i, "स्नातक ग्रेजुएशन"], [/teacher|pri\.|primary|upper/i, "शिक्षक अध्यापक टीचर"],
  [/ldc|jr\. ?assist|junior assist/i, "एलडीसी कनिष्ठ सहायक बाबू क्लर्क"], [/vdo|gram vikas/i, "वीडीओ ग्राम विकास अधिकारी"], [/animal|pashu/i, "पशु परिचर"], [/fourth|4th/i, "चतुर्थ श्रेणी"],
  [/comp/i, "कंप्यूटर"], [/account/i, "लेखाकार अकाउंटेंट"], [/lab/i, "प्रयोगशाला लैब सहायक"], [/forest/i, "वनरक्षक वनपाल"], [/steno/i, "स्टेनो आशुलिपिक"], [/supervis/i, "पर्यवेक्षक सुपरवाइजर"],
  [/nurse|anm|gnm|cho|nhm/i, "नर्स स्वास्थ्य"], [/prahari/i, "प्रहरी जेल"], [/driver/i, "चालक ड्राइवर"], [/conductor/i, "परिचालक कंडक्टर"], [/librar/i, "पुस्तकालय लाइब्रेरियन"],
  [/survey/i, "सर्वेयर"], [/jamadar/i, "जमादार"], [/platoon/i, "प्लाटून कमांडर"], [/agri/i, "कृषि पर्यवेक्षक"], [/informatics/i, "सूचना सहायक"], [/hostel|hostal/i, "छात्रावास अधीक्षक"],
  [/live ?stock/i, "पशुधन सहायक"], [/mine/i, "खनन फोरमैन"], [/sanskrit|sans/i, "संस्कृत"], [/hindi/i, "हिंदी"], [/eng/i, "अंग्रेज़ी इंग्लिश"]];
const hiAlias = t => HI_ALIAS.filter(([r]) => r.test(t)).map(x => x[1]).join(" ");

/* picker: search + org → exams (multi), years. Re-renders itself inside `el`.
   opts.compact: each org shows its 5 most popular exams + "और"; opts.onFull opens full screen */
function mountPicker(el, state, opts = {}) {
  const famCount = opts.famCount || null;          // {famId: n} when limited to one topic
  const ui = { q: "", open: {} };
  const famsOf = b => { let f = [...b.families].sort((a, c) => a.pop - c.pop || c.n - a.n); if (famCount) f = f.filter(x => famCount[x.id]).sort((a, c) => famCount[c.id] - famCount[a.id]); return f; };
  const chip = f => `<button class="fchip ${state.fams.includes(f.id) ? "on" : ""}" data-pk="fam" data-v="${f.id}">${state.fams.includes(f.id) ? "✓ " : ""}${esc(f.short || f.name)}${famCount ? ` <small>${famCount[f.id]}</small>` : ` <small>${f.papers.length}</small>`}</button>`;
  const norm = x => (x || "").toLowerCase().replace(/[\s.()\-]/g, "");
  const render = () => {
    const q = norm(ui.q);
    let body;
    if (q) {
      const fams = allFamilies().filter(f => (!famCount || famCount[f.id]) && (norm(f.name + f.short + f.board.name + hiAlias(f.name + " " + f.short)).includes(q)));
      const tops = famCount ? [] : Object.values(TOPIC).filter(t => t.n && t.name !== "अन्य" && (norm(t.name).includes(q) || norm(t.en).includes(q))).slice(0, 5);
      body = `<div class="lab">${L(`"${esc(ui.q)}" से मिले`, `Matches for "${esc(ui.q)}"`)}</div>
        ${fams.length ? `<div class="fchips">${fams.map(chip).join("")}</div>` : `<div class="pk-none">${L("कोई exam नहीं मिला", "No exam found")}</div>`}
        ${tops.length ? `<div class="lab">🧩 ${L("टॉपिक", "TOPICS")}</div>${tops.map(t => `<button class="pk-top" data-pk="topic" data-v="${t.id}"><b>${esc(nm(t))}</b><small>${nm(t.s)} › ${nm(t.g)} • ${t.n} ${L("प्रश्न", "Qs")}</small><span>›</span></button>`).join("")}` : ""}`;
    } else {
      body = CATALOG.boards.map(b => {
        if (b.soon) return `<div class="pk-org soon"><div class="pk-oh"><b>${b.name}</b><small>${L(b.full, b.full)}</small><span class="soon-b">${L("जल्द", "Soon")}</span></div>
          <div class="fchips">${(CATALOG.soon[b.id] || []).slice(0, opts.compact ? 5 : 99).map(x => `<button class="fchip dim" data-act="soon">${esc(x)}</button>`).join("")}</div></div>`;
        const fams = famsOf(b); if (!fams.length) return "";
        const all = fams.every(f => state.fams.includes(f.id));
        const showAll = !opts.compact || ui.open[b.id] || el.closest(".full");
        const shown = showAll ? fams : fams.slice(0, 5);
        return `<div class="pk-org"><div class="pk-oh"><b>${b.name}</b><small>${b.full}</small>
            <button class="pk-all" data-pk="org" data-v="${b.id}">${all ? "☑" : "☐"} ${L("सभी", "All")} ${b.name}</button></div>
          <div class="fchips">${shown.map(chip).join("")}${shown.length < fams.length ? `<button class="fchip more" data-pk="more" data-v="${b.id}">+ ${fams.length - shown.length} ${L("और", "more")} ›</button>` : ""}</div></div>`;
      }).join("") + (opts.compact && opts.onFull && !el.closest(".full") ? `<button class="pk-fullbtn" data-pk="full">📋 ${L("सारे exam देखें (पूरी स्क्रीन)", "See all exams (full screen)")} ›</button>` : "");
    }
    const years = `<div class="lab">${L("साल", "YEARS")}</div><div class="fchips">
      <button class="fchip ${!state.yrs.length && !state.last ? "on" : ""}" data-pk="yall">${L("सारे साल", "All years")}</button>
      ${LAST_OPTS.map(([n, hi, en]) => `<button class="fchip ${state.last === n ? "on" : ""}" data-pk="last" data-v="${n}">${L(hi, en)}</button>`).join("")}
      ${(opts.years || YEARS).map(y => `<button class="fchip ${state.yrs.includes(y) ? "on" : ""}" data-pk="yr" data-v="${y}">${y}</button>`).join("")}</div>`;
    const hadFocus = document.activeElement && document.activeElement.id === "pk-q";
    el.innerHTML = `<label class="pk-search"><span>🔍</span><input id="pk-q" type="search" value="${esc(ui.q)}" placeholder="${L("Exam या टॉपिक खोजें — जैसे पटवारी, CET, संधि", "Search exam or topic — e.g. Patwari, CET")}" autocomplete="off"></label>
      <div class="pk-now"><small>${L("आपने चुना", "Selected")}</small><div class="sb-chips">${selHTML(state)}</div>
        <span class="pk-acts"><button class="link" data-pk="selall">☑ ${L("सभी चुनें", "Select all")}</button>${state.fams.length ? `<button class="link red" data-pk="clear">✕ ${L("सब हटाएँ", "Clear")}</button>` : ""}</span></div>
      ${body}${opts.noYears || q ? "" : years}
      ${opts.uniq !== undefined ? `<label class="chk-row"><input type="checkbox" data-pk="uniq" ${state.uniq ? "checked" : ""}> ${L("दोहराए गए प्रश्न सिर्फ़ एक बार", "Show repeated questions once")}</label>` : ""}`;
    const inp = el.querySelector("#pk-q");
    inp.oninput = () => { ui.q = inp.value; render(); };
    if (hadFocus) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    opts.onChange && opts.onChange(state);
  };
  el.onclick = e => {
    const b = e.target.closest("[data-pk]"); if (!b) return;
    const k = b.dataset.pk, v = b.dataset.v;
    const pool = () => allFamilies().filter(f => !famCount || famCount[f.id]).map(f => f.id);
    if (k === "fam") toggleIn(state.fams, v);
    else if (k === "clear") state.fams = [];
    else if (k === "selall") state.fams = pool();
    else if (k === "org") { const ids = famsOf(CATALOG.boards.find(x => x.id === v)).map(f => f.id); const all = ids.every(i => state.fams.includes(i));
      state.fams = all ? state.fams.filter(i => !ids.includes(i)) : [...new Set([...state.fams, ...ids])]; }
    else if (k === "more") ui.open[v] = true;
    else if (k === "full") { opts.onFull && opts.onFull(); }
    else if (k === "topic") { opts.onTopic ? opts.onTopic(v) : go("t~" + v); return; }
    else if (k === "yall") { state.yrs = []; state.last = 0; }
    else if (k === "last") { state.yrs = []; state.last = state.last === +v ? 0 : +v; }
    else if (k === "yr") { state.last = 0; toggleIn(state.yrs, +v); }
    else if (k === "uniq") { state.uniq = b.checked; return; }
    render();
  };
  state.rerender = render;
  render();
  return state;
}
const LOGIN_NOTE = () => `<div class="login-note">🔒 ${L("यह चयन अभी सिर्फ़ इसी फ़ोन/ब्राउज़र में रहेगा। हमेशा के लिए सेव करने के लिए <b>लॉगिन</b> (जल्द आ रहा है)।", "This choice stays only on this phone/browser for now. <b>Login</b> (coming soon) will save it permanently.")}</div>`;

function firstVisitPopup() { openPickerModal(true); }

/* ---------- topic-level filter (temporary, only for that topic) ---------- */
const TALL = { fams: [], yrs: [], last: 0 };
function topicSel(tid) { return store.get("tf." + tid, null) || mySel(); }
const topicMode = tid => store.get("tm." + tid, "sel");
function activeFilter(tid) {
  const base = topicMode(tid) === "all" ? TALL : topicSel(tid);
  return { fams: [...base.fams], yrs: [...base.yrs], last: base.last || 0, uniq: store.get("uq." + tid, true) };
}
const sigOf = f => [[...f.fams].sort().join(","), [...f.yrs].sort().join(","), f.last || 0, f.uniq ? 1 : 0].join(";");
function applyFilter(qs, f) {
  let out = qs.filter(q => {
    const m = paperMeta(q.p);
    if (f.fams.length && !f.fams.includes(m.famId)) return false;
    return yrOk(m.year, f);
  });
  if (f.uniq) { const seen = new Set(); out = out.filter(q => { const k = q.g || q.id; if (seen.has(k)) return false; seen.add(k); return true; }); }
  return out;
}
function clearTopicProgress(tid) { store.delPrefix("pa." + tid + "#"); store.del("pd." + tid); }
/* a scoped link (#t~tid~fams) becomes this topic's own temporary selection */
function applyScope(tid, fams) {
  if (!fams.length) return;
  const cur = topicSel(tid);
  const next = { fams, yrs: [...mySel().yrs], last: mySel().last };
  if (sigOf({ ...cur, uniq: 1 }) !== sigOf({ ...next, uniq: 1 })) { clearTopicProgress(tid); store.set("tf." + tid, next); }
  store.set("tm." + tid, "sel");
}

/* ---------- topic test chunks: 50 each, last chunk ≥30 else merged ---------- */
function chunks(n) {
  if (n <= 0) return [];
  if (n <= 50) return [n];
  const k = Math.floor(n / 50), r = n % 50;
  if (r === 0) return Array(k).fill(50);
  if (r >= 30) return [...Array(k).fill(50), r];
  return [...Array(k - 1).fill(50), 50 + r];
}
const chunkStart = (ch, k) => ch.slice(0, k).reduce((a, b) => a + b, 0);
const testPool = (qs, f) => applyFilter(qs, f).filter(q => !q.d && q.a);

/* ---------- practice answers: per topic+selection / per paper ---------- */
const paKey = (kind, id, f) => kind === "topic" ? `pa.${id}#${sigOf(f)}` : `pa.paper.${id}`;

/* ---------- UI bits ---------- */
function toast(msg) {
  const t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2200);
}
function confirmBox({ title, rows = [], yes, no, onYes, onNo }) {
  const m = document.createElement("div"); m.className = "modal-mask";
  m.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
    ${rows.map(r => `<div class="m-row ${r.cls || ""}"><span>${r.k}</span><b>${r.v}</b></div>`).join("")}
    <div class="m-text">${title}</div>
    <div class="m-btns"><button class="m-yes">${yes || L("हाँ", "Yes")}</button><button class="m-no">${no || L("नहीं", "No")}</button></div></div>`;
  document.body.appendChild(m);
  m.querySelector(".m-no").onclick = () => { m.remove(); onNo && onNo(); };
  m.onclick = e => { if (e.target === m) m.remove(); };
  m.querySelector(".m-yes").onclick = () => { m.remove(); onYes(); };
}
function tadkaPopup(text) {
  const m = document.createElement("div"); m.className = "modal-mask";
  m.innerHTML = `<div class="modal tadka-card"><div class="tadka-head">🌶️ Topic Tadka <button aria-label="close">✕</button></div>
    <div class="tadka-body">${text ? fmt(text) : L("इस प्रश्न का Topic Tadka जल्द जोड़ा जाएगा।", "Topic Tadka for this question is coming soon.")}</div></div>`;
  document.body.appendChild(m);
  m.onclick = e => { if (e.target === m || e.target.closest(".tadka-head button")) m.remove(); };
}
function topbar({ back, title, sub, right = "" }) {
  return `<header class="topbar"><button class="back" data-go="${back}" aria-label="back">‹</button>
    <div class="t"><b>${title}</b>${sub ? `<small>${sub}</small>` : ""}</div>${right}
    ${langToggle()}</header>`;
}
function brandBar() {
  return `<header class="topbar"><button class="ham" data-act="drawer" aria-label="menu">☰</button><div class="brand"><img src="assets/logo.webp" alt="">
    <div><div class="brand-name">${SITE.NAME_A}<span>${SITE.NAME_B}</span></div><div class="brand-sub">by ${SITE.ACADEMY}</div></div></div>
    ${langToggle()}</header>`;
}
const hindiOnlyNote = sid => LANG === "en" && sid !== "english"
  ? `<div class="tip">ℹ️ Questions are shown in Hindi for now — English versions are coming soon.</div>` : "";
const loginLock = (hi, en) => `<div class="card rank-lock"><div class="rl-i">🏆</div><div><b>${L(hi, en)}</b>
  <small>🔒 ${L("लॉगिन के बाद दिखेगा (जल्द आ रहा है) — सबके अंक मिलाकर असली रैंक", "Shown after login (coming soon) — real rank among all students")}</small></div></div>`;

/* ---------- question card pieces ---------- */
const rightAns = q => q.a || q.sa || 0;
function optionButtons(q, chosen, opts = {}) {
  const LT = ["A", "B", "C", "D", "E"];
  const list = [...q.o]; if (opts.optionE) list.push(opts.optionE);
  const right = rightAns(q);
  return list.map((text, i) => {
    const n = i + 1; let cls = "", tag = "";
    if (opts.reveal) {
      if (n === right) {
        cls = q.d ? "ok sug" : "ok";
        if (chosen === n) tag = `<span class="tag">${L("आपका उत्तर", "Your answer")}</span>`;
        else if (chosen >= 1 && chosen <= 4) tag = `<span class="tag">${q.d ? L("संभावित उत्तर", "Likely answer") : L("सही उत्तर", "Correct answer")}</span>`;
      } else if (n === chosen) {
        cls = n === 5 || q.d ? "" : "bad";
        tag = `<span class="tag ${n === 5 || q.d ? "neutral" : ""}">${L("आपका उत्तर", "Your answer")}</span>`;
      }
    } else if (chosen === n) cls = "sel";
    if (n === 5) cls += " e-opt";
    return `<button class="opt ${cls}" data-opt="${n}" ${opts.disabled ? "disabled" : ""}>${tag}<span class="l">${LT[i]}.</span><span class="tx">${fmt(text)}</span></button>`;
  }).join("");
}
function qTags(q) {
  let h = q.p ? `<span class="q-src">${esc(paperName(q.p, true))}</span>` : "";
  if (q.rep && q.rep.length) h += `<span class="q-rep" title="${esc(q.rep.map(x => paperName(x, true)).join(", "))}">🔁 ${L(`${q.rep.length + 1} बार पूछा`, `Asked ${q.rep.length + 1} times`)}</span>`;
  if (q.d) h += `<span class="q-del">${L("रद्द प्रश्न", "Deleted Q")}</span>`;
  if (q.flag) h += `<span class="q-del">⚠️ ${L("उत्तर-कुंजी जाँच में", "Key under review")}</span>`;
  return h;
}
function explainBlock(q) {
  const also = q.rep && q.rep.length ? `<div class="also"><b>${L("यह प्रश्न इनमें भी आया:", "Also asked in:")}</b> ${q.rep.map(x => esc(paperName(x))).join(" • ")}</div>` : "";
  const delNote = q.d && !q.e ? `<div class="del-note">⚠️ <b>${L("यह प्रश्न RSSB द्वारा Delete (रद्द) कर दिया गया था।", "This question was deleted by RSSB.")}</b> ${L("इसका विस्तृत विश्लेषण जल्द जोड़ा जाएगा।", "Detailed analysis coming soon.")}</div>` : "";
  return `<div class="explain"><h4>📖 Explanation</h4>
    <div class="body">${q.e ? fmt(q.e) : (q.d ? "" : L("इस प्रश्न का Explanation जल्द जोड़ा जाएगा।", "Explanation for this question is coming soon."))}</div>${delNote}${also}
    <div class="tadka-row"><button class="tadka-btn" data-act="tadka" data-qid="${esc(q.id)}">🌶️ Topic Tadka</button></div>
    ${fbBox(q)}</div>`;
}
const QINDEX = {};

/* =============================================
   REPORTS + EXPLANATION FEEDBACK  →  Excel
   Har row me prashn ki pehchaan: QID, Exam Name, Q.No, Excel sheet!row
   ============================================= */
const REPORT_REASONS = [["प्रश्न में गलती", "Error in question"], ["विकल्प में गलती", "Error in options"], ["उत्तर गलत है", "Wrong answer"],
  ["टाइपिंग / वर्तनी की गलती", "Typo / spelling"], ["चित्र नहीं दिख रहा", "Image missing"], ["अन्य", "Other"]];
const FB_REASONS = [["गलत उत्तर", "Wrong answer"], ["व्याख्या गलत है", "Explanation wrong"], ["अधूरी व्याख्या", "Incomplete"],
  ["समझने में कठिन", "Hard to understand"], ["गलत भाषा", "Language issue"], ["अन्य", "Other"]];
let REPORT_DB;                                   // undefined = not checked yet, null = not available
async function reportDB() {
  if (REPORT_DB !== undefined) return REPORT_DB;
  try { REPORT_DB = window.claude && claude.use ? await claude.use("db") : null; } catch { REPORT_DB = null; }
  return REPORT_DB;
}
const findQ = id => QINDEX[id] || (typeof Exam !== "undefined" && Exam.qFor && Exam.qFor(id)) || null;
function qRef(q) {
  const pid = q.p || q.pp, m = paperMeta(pid) || {};
  return { qid: q.id, exam: m.raw || paperName(pid), qno: q.n || "", excel: q.x || "", question: String(q.q || "").replace(/\s+/g, " ").slice(0, 150) };
}
async function sendReport(row) {
  row = { ...row, time: new Date().toISOString(), page: ({ x: "टेस्ट", r: "पेपर पढ़ें", p: "टॉपिक प्रैक्टिस" })[location.hash.slice(1).split("~")[0]] || "अन्य", lang: LANG, done: false };
  try {
    if (SITE.REPORT_URL) {                       // live site → Google Sheet
      await fetch(SITE.REPORT_URL, { method: "POST", mode: "no-cors", body: new URLSearchParams(Object.entries(row).map(([k, v]) => [k, String(v)])) });
      return true;
    }
    const db = await reportDB();
    if (db) { await db.collection("reports").add(row); return true; }
  } catch (e) { console.warn("report", e); }
  const qd = store.get("repq", []); qd.push(row); store.set("repq", qd);   // fallback: this browser
  return true;
}
const qFoot = q => `<div class="q-foot"><span class="qid">ID: ${esc(q.id)}</span>
  <button class="bm-btn ${isBm(q.id) ? "on" : ""}" data-act="bm" data-v="${esc(q.id)}" data-qid="${esc(q.id)}" aria-label="bookmark">${isBm(q.id) ? "★" : "☆"}</button>
  ${store.get("rp." + q.id) ? `<span class="rep-done">✓ ${L("रिपोर्ट भेजी", "Reported")}</span>` : `<button class="rep-btn" data-act="report" data-qid="${esc(q.id)}">⚠️ ${L("रिपोर्ट", "Report")}</button>`}</div>`;
function fbBox(q) {
  const done = store.get("fb." + q.id);
  if (done) return `<div class="fb done">✓ ${L("आपकी प्रतिक्रिया मिल गई — धन्यवाद!", "Thanks for your feedback!")}</div>`;
  return `<div class="fb" data-qid="${esc(q.id)}"><span>${L("क्या इस व्याख्या से आपकी तैयारी बेहतर हुई?", "Did this explanation help you?")}</span>
    <div class="fb-btns"><button data-act="fb-yes">👍 ${L("हाँ", "Yes")}</button><button data-act="fb-no">👎 ${L("नहीं", "No")}</button></div></div>`;
}
function chipsHTML(list) { return `<div class="rchips">${list.map(([hi, en]) => `<button class="rchip" data-r="${esc(hi)}">${L(hi, en)}</button>`).join("")}</div>`; }
function fbNoForm(box) {
  box.innerHTML = `<b>${L("आपकी प्रतिक्रिया की सबसे बड़ी वजह बताएँ", "What was the main problem?")}</b>${chipsHTML(FB_REASONS)}
    <textarea class="rtext" rows="2" placeholder="${L("कोई अन्य कारण? यहाँ लिखें…", "Anything else? Write here…")}"></textarea>
    <button class="btn btn-primary rsend" data-act="fb-send" disabled>${L("सबमिट करें", "Submit")}</button>`;
  box.classList.add("open");
}
function openReport(q) {
  const m = document.createElement("div"); m.className = "modal-mask";
  m.innerHTML = `<div class="modal rep-modal" role="dialog" aria-modal="true">
    <div class="rm-head"><b>⚠️ ${L("इस प्रश्न में गलती बताएँ", "Report this question")}</b><small>ID: ${esc(q.id)} • ${esc(qRef(q).exam)} • Q.${qRef(q).qno}</small></div>
    <div class="rm-body">${chipsHTML(REPORT_REASONS)}
      <textarea class="rtext" rows="3" placeholder="${L("क्या गलत है? सही उत्तर/सुधार लिखें (वैकल्पिक)", "What's wrong? Write the correction (optional)")}"></textarea></div>
    <div class="m-btns"><button class="m-yes" disabled>${L("भेजें", "Send")}</button><button class="m-no">${L("रद्द करें", "Cancel")}</button></div></div>`;
  document.body.appendChild(m);
  const send = m.querySelector(".m-yes");
  m.onclick = async e => {
    if (e.target === m || e.target.closest(".m-no")) return m.remove();
    const c = e.target.closest(".rchip");
    if (c) { c.classList.toggle("on"); send.disabled = !m.querySelector(".rchip.on"); return; }
    if (e.target.closest(".m-yes") && !send.disabled) {
      send.disabled = true;
      const reasons = [...m.querySelectorAll(".rchip.on")].map(x => x.dataset.r).join(", ");
      await sendReport({ type: "प्रश्न रिपोर्ट", reason: reasons, comment: m.querySelector(".rtext").value.trim(), ...qRef(q) });
      store.set("rp." + q.id, 1); m.remove(); toast(L("रिपोर्ट भेज दी गई — धन्यवाद! 🙏", "Report sent — thank you! 🙏"));
      document.querySelectorAll(`.rep-btn[data-qid="${CSS.escape(q.id)}"]`).forEach(b => b.outerHTML = `<span class="rep-done">✓ ${L("रिपोर्ट भेजी", "Reported")}</span>`);
    }
  };
}

/* =============================================
   PAGES
   ============================================= */
function subjectTile(sb, s) {
  const tot = sb.n, mine = scount(sb, s), many = sb.groups.length > 1;
  return `<button class="card subject" data-go="s~${sb.id}"><span class="si">${sb.icon}</span>
    <span><b>${nm(sb)}</b><small>${many ? `${sb.groups.length} ${L("भाग", "parts")} • ` : ""}${nf(tot)} ${L("प्रश्न", "Qs")}</small>
    ${!isAll(s) ? `<small class="mine">${L("आपके चयन में", "Your exams")}: <b>${nf(mine)}</b></small>` : ""}</span></button>`;
}

function viewHome() {
  const st = CATALOG.stats, s = mySel();
  const byBoard = CATALOG.boards.map(b => [b.name, b.families.reduce((n, f) => n + f.papers.length, 0)]).filter(x => x[1]);
  $app.innerHTML = `${brandBar()}
  ${bannerHTML()}
  ${continueCard()}
  <div class="card mychip"><div><div class="lb">🎯 ${L("मेरी परीक्षाएँ", "My exams")}</div><div class="sb-chips">${selHTML(s)}</div></div>
    <button class="bd" data-act="pick-open">${L("बदलें", "Change")}</button></div>
  <div class="doors">
    <button class="card door" data-go="b~rssb"><span class="di" style="background:var(--blue-wash)">📄</span>
      <span class="dt"><b>Full PYQ Papers</b><span class="one"><b>${nf(st.papers)}</b> Papers • <span class="ok">✅ Authentic Ans Key</span></span>
      <small class="src">${byBoard.map(([n]) => n).join(" / ")} ${L("की official site से", "official answer keys")}</small></span><span class="go">›</span></button>
    <button class="card door" data-go="subjects"><span class="di" style="background:var(--green-wash)">🧩</span>
      <span class="dt"><b>Topic-wise PYQ</b><span class="one"><b>${nf(st.q)}</b> Que • <span class="ok">💡 Explanation + Short Tricks</span></span></span><span class="go">›</span></button>
  </div>
  <div class="section-h"><h2>${L("विषय", "Subjects")}</h2><span>${L("टॉपिक-वाइज़", "Topic-wise")}</span></div>
  <div class="subject-grid">${CATALOG.subjects.map(sb => subjectTile(sb, s)).join("")}</div>
  <div id="install-slot"></div>
  <p class="footer"><b>${SITE.NAME_A}${SITE.NAME_B}</b> — ${SITE.ACADEMY}<br>${SITE.TAGLINE}<br><span id="admin-link"></span></p>`;
  (async () => { try { const u = window.claude && claude.use ? await claude.use("user") : null;
    if ((u && await u.canEdit()) || store.get("repq", []).length) { const el = document.getElementById("admin-link"); if (el) el.innerHTML = `<button class="link" data-go="reports">📋 ${L("रिपोर्ट व फ़ीडबैक (एडमिन)", "Reports & feedback (admin)")}</button>`; } } catch { } })();
  renderInstall();
  startBanner();
}

/* ---------- full papers ---------- */
function viewBoard(bid) {
  const b = CATALOG.boards.find(x => x.id === bid && !x.soon) || CATALOG.boards[0];
  const s = mySel();
  const fams = b.families.filter(f => !s.fams.length || s.fams.includes(f.id));
  const papersOf = f => f.papers.filter(p => yrOk(p.year, s));
  $app.innerHTML = `${topbar({ back: "home", title: L("पूरा पेपर", "Full Papers"), sub: L(b.full, b.name) })}
  ${selBar(s, { label: L("आपकी परीक्षाएँ", "Your exams"), href: "pick~g~" + enc("b~" + b.id), btn: "Add Exam" })}
  <div class="btabs">${CATALOG.boards.map(x => x.soon
    ? `<button class="btab soon" data-act="soon">${x.name}<small>${L("जल्द", "soon")}</small></button>`
    : `<button class="btab ${x.id === b.id ? "on" : ""}" data-go="b~${x.id}">${x.name}<small>${fams.reduce((a, f) => a + papersOf(f).length, 0)} ${L("पेपर", "papers")}</small></button>`).join("")}</div>
  <div class="list">${fams.map(f => {
    const ps = papersOf(f);
    return `<button class="card row-btn" data-go="f~${f.id}"><span class="tx"><b>${esc(f.name)}</b><span class="meta">${ps.length} ${L("पेपर", "papers")} • ${[...new Set(ps.map(p => p.year))].join(", ") || "—"}</span></span><span class="go">›</span></button>`;
  }).join("") || `<div class="empty"><b>${L("आपके चुने exam में इस संस्था के पेपर नहीं", "None of your exams are from this board")}</b></div>`}</div>
  <div class="tip">➕ ${L("दूसरे exam के पेपर भी देखने हैं? ऊपर <b>＋ Add Exam</b> दबाएँ — वही exam Topic-wise में भी जुड़ जाएँगे।", "Want papers of other exams? Tap <b>＋ Add Exam</b> above — they get added to Topic-wise too.")}</div>`;
}

function viewFamily(fid) {
  const f = family(fid); if (!f) return go("home");
  const yrSel = store.get("fy." + fid, "all");
  const papers = f.papers.filter(p => yrSel === "all" || p.year === +yrSel)
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, "en", { numeric: true }));
  const byYear = {}; papers.forEach(p => (byYear[p.year] = byYear[p.year] || []).push(p));
  const card = p => {
    if (p.bad) return `<div class="card paper bad"><div class="pt"><b>${esc(p.title || f.name)}</b><span class="st st-bad">${L("सुधार जारी", "Being fixed")}</span></div>
      <small>${fdate(p.date)} • ${p.n} ${L("प्रश्न", "Qs")}</small><div class="bad-note">⚠️ ${esc(p.bad)}</div></div>`;
    const st = store.get("exam.paper." + p.id);
    const badge = st?.submitted ? `<span class="st st-done">${toNum(st.result.score)}/${toNum(st.result.max)}</span>` : st ? `<span class="st st-live">${L("चालू", "In progress")}</span>` : "";
    return `<div class="card paper"><div class="pt"><b>${esc(p.title || f.name)}</b>${badge}</div>
      <small>${fdate(p.date)} • ${p.n} ${L("प्रश्न", "Qs")}${p.del ? ` • ${p.del} ${L("रद्द", "deleted")}` : ""}${p.expl >= p.n / 2 ? ` • <span style="color:var(--green);font-weight:700">Explanation ✓</span>` : ""}</small>
      <div class="pbtns"><button class="btn-sm prim" data-go="x~paper~${p.id}">⏱ ${L("Test दें", "Take Test")}</button><button class="btn-sm" data-go="r~${p.id}~0">📖 ${L("पढ़ें / Practice", "Read / Practice")}</button></div></div>`;
  };
  const subs = CATALOG.subjects.filter(sb => scount(sb, { fams: [f.id], yrs: [], last: 0 }) > 0);
  $app.innerHTML = `${topbar({ back: "b~" + f.board.id, title: f.name, sub: `${f.board.name} • ${f.papers.length} ${L("पेपर", "papers")}` })}
  <div class="fchips">${[["all", L("सब साल", "All years")], ...f.years.map(y => [String(y), String(y)])].map(([v, l]) =>
    `<button class="fchip ${String(yrSel) === v ? "on" : ""}" data-act="fam-year" data-v="${v}">${l}</button>`).join("")}</div>
  ${Object.keys(byYear).sort((a, b) => b - a).map(y => `<div class="yr">${y} • ${byYear[y].length} ${L("पेपर", "papers")}</div>${byYear[y].map(card).join("")}`).join("")}
  ${subs.length ? `<div class="card fam-topics"><b>🎯 ${L(`सिर्फ़ ${esc(f.short || f.name)} के प्रश्न — टॉपिक-वाइज़`, `Only ${esc(f.short || f.name)} — topic-wise`)}</b>
    <div class="ft-grid">${subs.map(sb => `<button class="ft" data-go="s~${sb.id}~${f.id}"><span>${sb.icon}</span>${nm(sb)}<small>${scount(sb, { fams: [f.id], yrs: [], last: 0 })}</small></button>`).join("")}</div></div>` : ""}`;
  $app.dataset.fam = fid;
}

/* ---------- topic-wise ---------- */
function viewSubjects() {
  const s = mySel();
  $app.innerHTML = `${topbar({ back: "home", title: L("टॉपिक-वाइज़ PYQ", "Topic-wise PYQs"), sub: L("विषय चुनें", "Choose a subject") })}
  ${selBar(s, { label: L("आपने चुना", "You selected"), href: "pick~g~subjects", btn: L("बदलें", "Change") })}
  <div class="subject-grid">${CATALOG.subjects.map(sb => subjectTile(sb, s)).join("")}</div>`;
}

/* scope = fams from URL (temporary, e.g. from an exam page) or the global selection */
function scopeOf(famStr) {
  const fams = famsParam(famStr);
  return fams.length ? { s: { fams, yrs: [], last: 0 }, tmp: true, param: fams.join(",") } : { s: mySel(), tmp: false, param: "" };
}
function scopeBar(sc, pickHref) {
  return sc.tmp
    ? selBar(sc.s, { label: L("सिर्फ़ इन exam के प्रश्न", "Only these exams"), href: pickHref, btn: "Add" })
    : selBar(sc.s, { label: L("आपने चुना", "You selected"), href: "pick~g~" + enc(location.hash.slice(1)), btn: L("बदलें", "Change") });
}

function viewSubject(sid, famStr) {
  const sb = SUBJ[sid]; if (!sb) return go("subjects");
  if (sb.groups.length === 1) return viewGroup(sb.groups[0].id, sid, famStr, true);
  const sc = scopeOf(famStr);
  $app.innerHTML = `${topbar({ back: sc.tmp ? "f~" + sc.s.fams[0] : "subjects", title: nm(sb), sub: `${sb.groups.length} ${L("भाग", "parts")} • ${nf(sb.n)} ${L("प्रश्न", "Qs")}` })}
  ${scopeBar(sc, `pick~s~${sid}~${sc.param}`)}
  <div class="group-grid">${sb.groups.map(g => {
    const mine = gcount(g, sc.s);
    return `<button class="card gtile" data-go="g~${g.id}~${sid}${sc.param ? "~" + sc.param : ""}"><span class="gi">${g.icon}</span><b>${nm(g)}</b>
      <small>${L("कुल", "Total")} ${nf(g.n)}</small>${!isAll(sc.s) ? `<small class="mine">${L("आपके चयन में", "Yours")} <b>${nf(mine)}</b></small>` : ""}
      <small class="tc">${g.topics.filter(t => t.n).length} ${L("टॉपिक", "topics")}</small></button>`;
  }).join("")}</div>`;
}

function viewGroup(gid, sid, famStr, direct) {
  const g = GROUP[gid]; if (!g) return go("subjects");
  const sb = SUBJ[sid] || SUBJ[g.sid];
  const sc = scopeOf(famStr), sel = !isAll(sc.s);
  const q = sc.param ? "~" + sc.param : "";
  const rows = g.topics.map(t => ({ t, mine: tcount(t, sc.s) }))
    .sort((a, b) => (a.t.n === 0) - (b.t.n === 0) || (a.t.name === "अन्य") - (b.t.name === "अन्य") || b.mine - a.mine || b.t.n - a.t.n);
  const back = direct ? (sc.tmp ? "f~" + sc.s.fams[0] : "subjects") : `s~${sb.id}${q}`;
  $app.innerHTML = `${topbar({ back, title: nm(g), sub: direct ? `${nf(g.n)} ${L("प्रश्न", "Qs")}` : `${nm(sb)} • ${nf(g.n)} ${L("प्रश्न", "Qs")}` })}
  ${scopeBar(sc, `pick~s~${sid}~${sc.param}`)}
  <input class="filter-in" id="tf" type="search" placeholder="${L("टॉपिक खोजें", "Search topic")}">
  <div class="topic-list" id="tl">${rows.map(({ t, mine }, i) => {
    if (!t.n) return `<div class="card trow zero" data-name="${esc((t.name + " " + (t.en || "")).toLowerCase())}"><div class="trow-main"><span class="n">${String(i + 1).padStart(2, "0")}</span>
      <span class="tx"><b>${esc(nm(t))}</b><span class="meta">${L("इस टॉपिक के प्रश्न जल्द जुड़ेंगे", "Questions coming soon")}</span></span></div></div>`;
    const pd = store.get("pd." + t.id, null);
    const pct = pd && pd.n ? Math.min(100, Math.round(pd.d * 100 / pd.n)) : 0;
    return `<div class="card trow" data-name="${esc((t.name + " " + (t.en || "")).toLowerCase())}">
      <button class="trow-main" data-go="t~${t.id}${q}"><span class="n">${String(i + 1).padStart(2, "0")}</span>
        <span class="tx"><b>${esc(nm(t))}</b><span class="meta">${L("कुल", "Total")} ${t.n}${sel ? ` • <b class="mine">${L("आपके चयन में", "Yours")} ${mine}</b>` : ""}
        ${pd ? `<span class="bar"><i style="width:${pct}%"></i></span> ${pct}%` : ""}</span></span><span class="go">›</span></button>
      <div class="trow-btns"><button data-go="p~${t.id}~0${q}">📖 Practice</button><button data-go="t~${t.id}~${sc.param}~test">⏱ Test</button></div></div>`;
  }).join("")}</div>
  ${hindiOnlyNote(sb.id)}`;
  const tf = document.getElementById("tf");
  tf.oninput = () => document.querySelectorAll("#tl .trow").forEach(r => r.classList.toggle("hidden", !r.dataset.name.includes(tf.value.trim().toLowerCase())));
}

/* ---------- topic page: 3 tabs + practice + 50-question tests ---------- */
async function viewTopic(tid, famStr, focus) {
  const meta = topicMeta(tid); if (!meta) return go("subjects");
  const fams = famsParam(famStr);
  if (fams.length) { applyScope(tid, fams); return location.replace("#t~" + tid + (focus ? "~~" + focus : "")); }
  const back = `g~${meta.g.id}~${meta.s.id}`;
  $app.innerHTML = `${topbar({ back, title: nm(meta), sub: nm(meta.g) })}<div class="loading"><div class="spinner"></div></div>`;
  const data = await loadTopic(tid);
  const qs = data.questions;
  const mode = topicMode(tid), f = activeFilter(tid);
  const allN = applyFilter(qs, { ...TALL, uniq: f.uniq }).length;
  const selF = { ...topicSel(tid), uniq: f.uniq };
  const selN = applyFilter(qs, selF).length;
  const own = !!store.get("tf." + tid, null);
  const list = applyFilter(qs, f);
  // practice progress
  const pa = store.get(paKey("topic", tid, f), {});
  const done = list.filter(q => pa[q.id]).length;
  const firstOpen = list.findIndex(q => !pa[q.id]);
  const corr = list.filter(q => pa[q.id] && !q.d && pa[q.id] === q.a).length, att = list.filter(q => pa[q.id] && !q.d).length;
  // tests
  const pool = testPool(qs, f), ch = chunks(pool.length);
  const hist = store.get(`th.${tid}#${sigOf(f)}`, {});
  const T = SITE.TOPIC_TEST;
  const allDone = ch.length && ch.every((_, k) => hist[k] && hist[k].length);
  let tot = 0, totMax = 0;
  if (allDone) ch.forEach((_, k) => { const h = hist[k][hist[k].length - 1]; tot += h.s; totMax += h.m; });
  const testRows = ch.map((n, k) => {
    const st = chunkStart(ch, k), h = hist[k] || [], lastH = h[h.length - 1];
    const live = store.get(`exam.topic.${tid}#${sigOf(f)}.${k}`);
    const inProg = live && !live.submitted;
    return `<div class="chunk ${lastH ? "done" : ""}"><div class="ck-l"><b>Test ${k + 1}</b><small>Q${st + 1}–${st + n} • ${n} ${L("प्रश्न", "Qs")} • ${Math.ceil(n * T.SECONDS_PER_Q / 60)} ${L("मिनट", "min")}</small>
      ${lastH ? `<small class="ck-s">✓ ${toNum(lastH.s)}/${toNum(lastH.m)} (${lastH.p}%) • ${fdate(lastH.d)}</small>` : ""}
      ${h.length > 1 ? `<details class="ck-h"><summary>${L("पिछले प्रयास", "Past attempts")} (${h.length})</summary>${h.map((x, i) => `<div>${i + 1}. ${toNum(x.s)}/${toNum(x.m)} • ${x.p}% • ${fdate(x.d)}</div>`).join("")}</details>` : ""}</div>
      <div class="ck-b">${lastH && !inProg ? `<button class="btn-sm" data-go="x~topic~${tid}~${k}">${L("रिज़ल्ट", "Result")}</button><button class="btn-sm" data-act="t-retake" data-v="${k}">↺ ${L("दोबारा", "Retake")}</button>`
        : `<button class="btn-sm prim" data-go="x~topic~${tid}~${k}">${inProg ? L("जारी रखें", "Resume") : L("शुरू करें", "Start")}</button>`}</div></div>`;
  }).join("");
  $app.innerHTML = `${topbar({ back, title: nm(meta), sub: `${nm(meta.s)} › ${nm(meta.g)}` })}
  <div class="tabs3">
    <button class="t3 ${mode === "all" ? "on" : ""}" data-act="tmode" data-v="all"><b>${allN}</b><small>${L("कुल प्रश्न", "All Qs")}</small></button>
    <button class="t3 ${mode === "sel" ? "on" : ""}" data-act="tmode" data-v="sel"><b>${selN}</b><small>${L("आपका चयन", "Your selection")}</small></button>
    <button class="t3 add" data-go="pick~t~${tid}"><b>＋</b><small>${L("और जोड़ें", "Add more")}</small></button>
  </div>
  <div class="t3-sum">${mode === "all" ? L("सारे exam, सारे साल", "All exams, all years") : `${selHTML(selF)}${own ? `<span class="own">${L("सिर्फ़ इस टॉपिक के लिए", "this topic only")}</span>` : ""}`}</div>
  ${hindiOnlyNote(meta.s.id)}
  ${list.length ? `
  <div class="card mode practice-c"><div class="mc-h"><span class="mi">📖</span><div><b>Practice</b><small>${L("10-10 प्रश्न • विकल्प चुनते ही उत्तर + Explanation", "10 at a time • answer + explanation on tap")}</small></div></div>
    <div class="pbar big"><i style="width:${Math.round(done * 100 / list.length)}%"></i></div>
    <div class="mc-stat"><span>${done}/${list.length} ${L("हल किए", "done")}</span><span class="score-chip"><span class="c">✓ ${corr}</span><span class="w">✗ ${att - corr}</span></span></div>
    <div class="mc-btns">${done === 0 ? `<button class="btn btn-primary btn-block" data-go="p~${tid}~1">▶ ${L("Practice शुरू करें", "Start practice")}</button>`
      : firstOpen > -1 ? `<button class="btn btn-primary" data-act="p-cont" data-v="${firstOpen}">▶ Q${firstOpen + 1} ${L("से जारी रखें", "— continue")}</button><button class="btn btn-outline" data-act="p-restart">↺ Q1 ${L("से फिर शुरू", "— restart")}</button>`
      : `<button class="btn btn-outline" data-go="p~${tid}~1">📖 ${L("उत्तर देखें", "Review")}</button><button class="btn btn-primary" data-act="p-restart">↺ ${L("फिर से शुरू", "Practise again")}</button>`}</div></div>
  <div class="card mode tests-c" id="tests"><div class="mc-h"><span class="mi">⏱️</span><div><b>${L("टॉपिक टेस्ट", "Topic Tests")}</b><small>${pool.length} ${L("प्रश्न → ", "Qs → ")}${ch.length} ${L("टेस्ट", "tests")} • ${L("सही", "Right")} +${T.POSITIVE}, ${L("गलत", "Wrong")} −⅓ • ${L("रद्द प्रश्न शामिल नहीं", "deleted Qs excluded")}</small></div></div>
    <div class="chunks">${testRows}</div>
    ${allDone ? `<div class="all-done"><b>🎉 ${L("सारे टेस्ट पूरे!", "All tests done!")}</b><span>${L("कुल अंक", "Total")} <b>${toNum(+tot.toFixed(2))}/${toNum(+totMax.toFixed(2))}</b> • <b>${totMax ? (tot * 100 / totMax).toFixed(1) : 0}%</b></span></div>
      ${loginLock("आप टॉप __% छात्रों में", "You're in the top __%")}` : ""}</div>` :
    `<div class="empty"><b>${L("आपके चयन में इस टॉपिक का कोई प्रश्न नहीं", "No questions of this topic in your selection")}</b>${L("ऊपर 'कुल प्रश्न' दबाएँ या ＋ से और exam जोड़ें।", "Tap 'All Qs' above or add exams with ＋.")}</div>`}
  <div class="card soon-card"><b>🏆 ${L("जल्द: PYQ लेवल-अप", "Coming soon: PYQ Level-Up")}</b><small>${L("Easy → Medium → Tough → Elite — एक लेवल पूरा करने पर अगला खुलेगा (लॉगिन के बाद)", "Easy → Medium → Tough → Elite — finish one level to unlock the next (after login)")}</small></div>`;
  $app.dataset.topic = tid;
  if (focus === "test") document.getElementById("tests")?.scrollIntoView({ block: "start" });
}

/* ---------- picker page (global / scope / topic) ---------- */
async function viewPick(mode, a, b) {
  let state, title, sub, opts = {}, onSave, extra = "";
  if (mode === "t") {
    const meta = topicMeta(a); if (!meta) return go("subjects");
    $app.innerHTML = `${topbar({ back: "t~" + a, title: L("प्रश्न चुनें", "Choose questions") })}<div class="loading"><div class="spinner"></div></div>`;
    const data = await loadTopic(a);
    const famCount = {}; data.questions.forEach(q => { const id = paperMeta(q.p).famId; famCount[id] = (famCount[id] || 0) + 1; });
    const years = [...new Set(data.questions.map(q => paperMeta(q.p).year))].sort((x, y) => y - x);
    const cur = topicSel(a);
    state = { fams: cur.fams.filter(x => famCount[x]), yrs: [...cur.yrs], last: cur.last || 0, uniq: store.get("uq." + a, true) };
    const before = sigOf(state);
    title = nm(meta); sub = L("सिर्फ़ इस टॉपिक के लिए चयन", "Selection for this topic only");
    opts = { famCount, years, uniq: true };
    extra = `<div class="tip">ℹ️ ${L("यह चयन <b>सिर्फ़ इस टॉपिक</b> के लिए है — Full Paper और बाकी टॉपिक पर असर नहीं। बदलने पर इस टॉपिक की Practice <b>नए सिरे से (Q1 से)</b> शुरू होगी।", "This applies to <b>this topic only</b>. Changing it restarts this topic's practice from Q1.")}</div>
      ${store.get("tf." + a, null) ? `<button class="reset-link" data-act="tf-reset" data-v="${a}">↩ ${L("मुख्य चयन (मेरी परीक्षाएँ) पर लौटें", "Back to my main selection")}</button>` : ""}`;
    onSave = () => {
      const save = () => { store.set("uq." + a, state.uniq); store.set("tf." + a, { fams: state.fams, yrs: state.yrs, last: state.last }); store.set("tm." + a, "sel"); go("t~" + a); };
      if (sigOf(state) !== before && store.get("pd." + a, null)) confirmBox({ title: L("इस टॉपिक की पिछली Practice हट जाएगी और Q1 से नई शुरुआत होगी। ठीक है?", "This topic's previous practice will be cleared. OK?"), onYes: () => { clearTopicProgress(a); save(); } });
      else { if (sigOf(state) !== before) clearTopicProgress(a); save(); }
    };
    mode = "t";
    var back = "t~" + a;
  } else if (mode === "s") {
    state = { fams: famsParam(b), yrs: [], last: 0 };
    title = L("Exam जोड़ें", "Add exams"); sub = nm(SUBJ[a] || { name: "" });
    opts = { noYears: true };
    extra = `<div class="tip">ℹ️ ${L("यह चयन सिर्फ़ इस सूची के लिए है। सब exam के लिए होम पर 'मेरी परीक्षाएँ' बदलें।", "This only affects this list. Change 'My exams' on home for everything.")}</div>`;
    onSave = () => go(`s~${a}${state.fams.length ? "~" + state.fams.join(",") : ""}`);
    var back = `s~${a}~${b || ""}`;
  } else {
    const cur = mySel(); state = { fams: [...cur.fams], yrs: [...cur.yrs], last: cur.last };
    title = L("मेरी परीक्षाएँ", "My exams"); sub = L("Full Paper + Topic-wise दोनों में लागू", "Applies to Full Papers + Topic-wise");
    extra = LOGIN_NOTE();
    const ret = decodeURIComponent(a || "home");
    onSave = () => { store.set("my", { fams: state.fams, yrs: state.yrs, last: state.last }); toast(L("सेव हो गया ✓", "Saved ✓")); go(ret); };
    var back = ret;
  }
  $app.innerHTML = `${topbar({ back, title, sub })}<div id="pk"></div>${extra}
    <div class="pk-foot"><button class="btn btn-primary btn-block" id="pk-save">✓ ${L("सेव करें", "Save")}</button></div>`;
  mountPicker(document.getElementById("pk"), state, opts);
  document.getElementById("pk-save").onclick = onSave;
}

/* ---------- practice: 10 per page (topic selection or a paper) ---------- */
let PRACTICE = null;
async function viewPractice(kind, id, page, famStr) {
  const PER = 10;
  let list, title, sub, back, sid = null, key;
  if (kind === "topic") {
    const meta = topicMeta(id); if (!meta) return go("subjects");
    const fams = famsParam(famStr);
    if (fams.length) { applyScope(id, fams); return location.replace(`#p~${id}~${page || 0}`); }
    $app.innerHTML = `${topbar({ back: "t~" + id, title: nm(meta), sub: "Practice" })}<div class="loading"><div class="spinner"></div></div>`;
    const data = await loadTopic(id);
    const f = activeFilter(id);
    list = applyFilter(data.questions, f); sid = meta.s.id; key = paKey("topic", id, f);
    title = nm(meta); back = "t~" + id; sub = topicMode(id) === "all" ? L("सारे exam", "All exams") : selHTML(f, { plain: true });
  } else if (kind === "set") {
    $app.innerHTML = `${topbar({ back: "me", title: "…" })}<div class="loading"><div class="spinner"></div></div>`;
    list = await loadSet(id); key = "pa.set." + id; back = "me";
    title = id === "bm" ? L("⭐ Bookmark प्रश्न", "⭐ Bookmarked questions") : L("❌ गलत हुए प्रश्न", "❌ Wrong answers");
    sub = `${list.length} ${L("प्रश्न", "Qs")}`;
    if (!list.length) { $app.innerHTML = `${topbar({ back, title })}<div class="empty"><b>${id === "bm" ? L("अभी कोई Bookmark नहीं", "No bookmarks yet") : L("अभी कोई गलत प्रश्न नहीं 👏", "No wrong answers yet 👏")}</b>${id === "bm" ? L("किसी भी प्रश्न के नीचे ☆ दबाकर Bookmark करें।", "Tap ☆ under any question to bookmark it.") : L("Practice में गलत हुए प्रश्न यहाँ अपने-आप आएँगे।", "Questions you get wrong in practice will appear here.")}</div>`; return; }
  } else {
    $app.innerHTML = `${topbar({ back: "home", title: L("पेपर", "Paper"), sub: "Practice" })}<div class="loading"><div class="spinner"></div></div>`;
    const P = await loadPaper(id);
    list = P.questions.map(q => ({ ...q, p: null })); title = paperName(id); back = "f~" + P.famId; sub = `${P.n} ${L("प्रश्न", "Qs")}`;
    key = paKey("paper", id);
  }
  if (!list.length) { $app.innerHTML = `${topbar({ back, title: esc(title) })}<div class="empty"><b>${L("कोई प्रश्न नहीं", "No questions")}</b></div>`; return; }
  store.set("last", { kind, id });
  const pa = store.get(key, {});
  const total = list.length, pages = Math.ceil(total / PER);
  const firstOpen = list.findIndex(q => !pa[q.id]);
  const doneN = list.filter(q => pa[q.id]).length;
  let focusIdx = -1, ask = false;
  if (!page) {                       // auto: resume at first unanswered
    if (doneN > 0 && firstOpen > -1) { page = Math.floor(firstOpen / PER) + 1; focusIdx = firstOpen; ask = true; }
    else page = 1;
  }
  page = Math.min(Math.max(1, page), pages);
  const from = (page - 1) * PER, slice = list.slice(from, from + PER);
  slice.forEach(q => QINDEX[q.id] = q);
  const card = (q, idx) => {
    const c = pa[q.id];
    return `<article class="card q-card" data-qid="${esc(q.id)}" data-i="${idx}">
      <div class="q-top"><span class="q-badge">Q. ${kind === "paper" ? q.n : idx}</span>${qTags(q)}</div>
      <div class="q-text">${fmt(q.q)}</div>
      <div class="opts">${optionButtons(q, c, { reveal: !!c, disabled: !!c })}</div>
      ${c ? `${q.d ? `<div class="verdict">${L("⚠️ यह प्रश्न रद्द हुआ था — नीचे विश्लेषण देखें", "⚠️ This question was deleted — see analysis below")}</div>` : ""}${explainBlock(q)}` : ""}
      ${qFoot(q)}
    </article>`;
  };
  const R = kind === "topic" ? "p" : kind === "set" ? "l" : "r";
  const opt = n => { const a = (n - 1) * PER + 1, b = Math.min(n * PER, total); return `<option value="${n}" ${n === page ? "selected" : ""}>${L("पेज", "Page")} ${n} / ${pages}  (Q${a}–${b})</option>`; };
  $app.innerHTML = `${topbar({ back, title: esc(title), sub: esc(sub) })}
  <div class="card practice-head sticky"><div class="tx"><b id="ph-t"></b>
      <div class="pbar"><i id="ph-bar"></i></div></div>
    <div class="score-chip"><span class="c" id="ph-c"></span><span class="w" id="ph-w"></span></div>
    <button class="ph-reset" data-act="p-restart" title="${L("फिर से शुरू", "Restart")}" aria-label="restart">↺</button></div>
  ${kind === "topic" ? hindiOnlyNote(sid) : ""}
  ${doneN === total ? `<div class="tip">🎉 ${L("सारे प्रश्न हल हो चुके!", "All questions done!")} <button class="link" data-act="p-restart">↺ ${L("फिर से Practice करें", "Practise again")}</button></div>` : ""}
  <div class="practice-list">${slice.map((q, i) => card(q, from + i + 1)).join("")}</div>
  <div class="pager">
    <button class="pg-arrow" data-go="${R}~${id}~${page - 1}" ${page === 1 ? "disabled" : ""} aria-label="previous">‹</button>
    <select id="pg-sel" aria-label="page">${Array.from({ length: pages }, (_, i) => opt(i + 1)).join("")}</select>
    <button class="pg-arrow" data-go="${R}~${id}~${page + 1}" ${page === pages ? "disabled" : ""} aria-label="next">›</button>
  </div>
  ${page === pages && kind !== "set" ? `<button class="btn btn-orange btn-block" style="margin-top:12px" data-go="${kind === "topic" ? "t~" + id + "~~test" : "x~paper~" + id}">${L("अब Test दें", "Take a test")} ›</button>` : ""}`;
  PRACTICE = { card, list, key, kind, id, R, pa };
  updateHead();
  document.getElementById("pg-sel").onchange = e => go(`${R}~${id}~${e.target.value}`);
  if (focusIdx > -1) {
    const el = $app.querySelector(`.q-card[data-i="${focusIdx + 1}"]`);
    if (el) setTimeout(() => { el.scrollIntoView({ block: "center" }); el.classList.add("flash"); }, 50);
    if (ask && focusIdx > 0) {
      const bar = document.createElement("div"); bar.className = "resume-bar";
      bar.innerHTML = `<span>▶ ${L(`Q${focusIdx + 1} से जारी`, `Continuing from Q${focusIdx + 1}`)}</span><button data-act="p-restart">↺ Q1 ${L("से शुरू करें", "restart")}</button><button class="x" aria-label="close">✕</button>`;
      document.body.appendChild(bar); bar.querySelector(".x").onclick = () => bar.remove(); setTimeout(() => bar.remove(), 7000);
    }
  }
}
function updateHead() {
  if (!PRACTICE) return;
  const pa = store.get(PRACTICE.key, {}), Ls = PRACTICE.list;
  const done = Ls.filter(x => pa[x.id]).length;
  const corr = Ls.filter(x => pa[x.id] && !x.d && pa[x.id] === x.a).length, att = Ls.filter(x => pa[x.id] && !x.d).length;
  document.getElementById("ph-t").textContent = `${done} / ${Ls.length} ${L("हल किए", "done")}`;
  document.getElementById("ph-bar").style.width = Math.round(done * 100 / Ls.length) + "%";
  document.getElementById("ph-c").textContent = "✓ " + corr;
  document.getElementById("ph-w").textContent = "✗ " + (att - corr);
  if (PRACTICE.kind === "topic") store.set("pd." + PRACTICE.id, { d: done, n: Ls.length });
}
function onPracticeTap(btn) {
  const cardEl = btn.closest(".q-card");
  if (!PRACTICE || !cardEl || btn.disabled) return;
  const q = PRACTICE.list.find(x => x.id === cardEl.dataset.qid);
  const pa = PRACTICE.pa; pa[q.id] = +btn.dataset.opt; store.set(PRACTICE.key, pa);   // same object the card reads
  if (!q.d && q.a) { const ok = +btn.dataset.opt === q.a; trackAnswer(ok); noteWrong(q, ok); }
  cardEl.outerHTML = PRACTICE.card(q, +cardEl.dataset.i);
  updateHead();
}
function restartPractice(kind, id) {
  confirmBox({
    title: L("इस Practice के सारे उत्तर हट जाएँगे और Q1 से नई शुरुआत होगी। ठीक है?", "All answers of this practice will be cleared and you'll start from Q1. OK?"),
    yes: L("हाँ, फिर से शुरू", "Yes, restart"),
    onYes: () => {
      if (kind === "topic") { store.del(paKey("topic", id, activeFilter(id))); store.del("pd." + id); go(`p~${id}~1`); }
      else if (kind === "set") { store.del("pa.set." + id); go(`l~${id}~1`); }
      else { store.del(paKey("paper", id)); go(`r~${id}~1`); }
    }
  });
}

/* ---------- admin: reports list + Excel download ---------- */
const REP_COLS = [["time", "समय"], ["type", "प्रकार"], ["reason", "कारण"], ["comment", "टिप्पणी"], ["qid", "QID"], ["exam", "Exam Name"],
  ["qno", "Q.No"], ["excel", "Excel (Sheet!Row)"], ["question", "प्रश्न"], ["page", "कहाँ से"], ["done", "सुधार हुआ?"]];
let REP_FILTER = "rep";
async function viewReports() {
  $app.innerHTML = `${topbar({ back: "home", title: L("रिपोर्ट व फ़ीडबैक", "Reports & feedback"), sub: L("सिर्फ़ एडमिन", "Admin only") })}<div class="loading"><div class="spinner"></div></div>`;
  let can = false, rows = [], err = "";
  try { const u = window.claude && claude.use ? await claude.use("user") : null; can = u ? await u.canEdit() : false; } catch { }
  const db = await reportDB();
  if (db && can) {
    try { const snap = await db.collection("reports").orderBy("time", "desc").limit(1000).get(); rows = snap.docs.map(d => ({ _id: d.id, ...d.data() })); }
    catch (e) { err = e.code || e.message; }
  }
  store.get("repq", []).forEach((r, i) => rows.push({ _id: "local-" + i, _local: 1, ...r }));
  rows.sort((a, b) => String(b.time).localeCompare(String(a.time)));
  if (!can && !rows.length) {
    $app.innerHTML = `${topbar({ back: "home", title: L("रिपोर्ट", "Reports") })}<div class="empty"><b>🔒 ${L("यह पेज सिर्फ़ एडमिन के लिए है", "Admins only")}</b>${L("लाइव साइट पर रिपोर्ट सीधे आपकी Google Sheet में जाएँगी।", "On the live site reports go straight to your Google Sheet.")}</div>`; return;
  }
  const kinds = [["rep", "⚠️ प्रश्न रिपोर्ट", r => r.type === "प्रश्न रिपोर्ट"], ["no", "👎 व्याख्या", r => r.type === "व्याख्या 👎"], ["yes", "👍 व्याख्या", r => r.type === "व्याख्या 👍"], ["all", "सब", () => true]];
  const fn = kinds.find(k => k[0] === REP_FILTER)[2];
  const list = rows.filter(fn);
  const count = k => rows.filter(kinds.find(x => x[0] === k)[2]).length;
  $app.innerHTML = `${topbar({ back: "home", title: L("रिपोर्ट व फ़ीडबैक", "Reports & feedback"), sub: `${rows.length} ${L("कुल", "total")}` })}
  <div class="tip" style="margin-top:0">📋 ${L("हर रिपोर्ट में <b>QID, Exam Name, Q.No और Excel Sheet!Row</b> है — मुख्य Excel में सीधे उसी पंक्ति पर जाकर सुधार करें, फिर ✓ दबाएँ।", "Each row has QID, Exam Name, Q.No and Excel Sheet!Row — fix that row in the master Excel, then tap ✓.")}</div>
  ${err ? `<div class="tip">⚠️ ${esc(err)}</div>` : ""}
  <div class="fchips">${kinds.map(([k, l]) => `<button class="fchip ${k === REP_FILTER ? "on" : ""}" data-act="rep-filter" data-v="${k}">${l} <small>${count(k)}</small></button>`).join("")}</div>
  <button class="btn btn-primary btn-block" style="margin:12px 0" data-act="rep-xls">⬇️ ${L("Excel में डाउनलोड करें", "Download as Excel")} (${list.length})</button>
  <div class="rep-list">${list.map(r => `<div class="card rep-row ${r.done ? "done" : ""}">
      <div class="rr-top"><b>${esc(r.type || "")}</b><small>${esc(new Date(r.time).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "short", timeStyle: "short" }))}</small></div>
      ${r.reason ? `<div class="rr-reason">${esc(r.reason)}</div>` : ""}${r.comment ? `<div class="rr-comment">“${esc(r.comment)}”</div>` : ""}
      <div class="rr-meta"><span>QID <b>${esc(r.qid)}</b></span><span>${esc(r.exam)} • Q.${esc(r.qno)}</span><span>Excel: <b>${esc(r.excel)}</b></span></div>
      <div class="rr-q">${esc(r.question)}</div>
      ${r._local ? `<small class="rr-local">${L("इसी ब्राउज़र में सेव", "Saved in this browser")}</small>` : `<button class="btn-sm ${r.done ? "" : "prim"}" data-act="rep-done" data-v="${esc(r._id)}">${r.done ? L("↩ फिर से खोलें", "Reopen") : "✓ " + L("सुधार कर दिया", "Fixed")}</button>`}
    </div>`).join("") || `<div class="empty"><b>${L("अभी कोई रिपोर्ट नहीं", "No reports yet")}</b></div>`}</div>`;
  $app._reports = list;
}
async function downloadReports() {
  const list = $app._reports || [];
  const cell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "\ufeff" + [REP_COLS.map(c => cell(c[1])).join(","), ...list.map(r => REP_COLS.map(([k]) => cell(k === "done" ? (r.done ? "हाँ" : "नहीं") : k === "time" ? new Date(r.time).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : r[k])).join(","))].join("\r\n");
  const name = `PYQSaarthi-Reports-${today()}.csv`;
  try {
    const dl = window.claude && claude.use ? await claude.use("downloads") : null;
    if (dl) { await dl.save({ filename: name, data: csv }); return; }
  } catch (e) { if (e && e.code === "declined") return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = name; a.click();
}

/* =============================================
   ROUTER + global clicks
   ============================================= */
async function route() {
  window.scrollTo(0, 0);
  PRACTICE = null;
  document.documentElement.lang = LANG;
  document.querySelectorAll(".modal-mask, .drawer, .drawer-mask, .resume-bar").forEach(el => el.remove());
  if (typeof Exam !== "undefined") Exam.stopTimer();
  const [name, ...a] = (location.hash.slice(1) || "home").split("~");
  clearInterval(BANNER_T); closeDrawerMenu(); renderShell(name);
  delete $app.dataset.topic;
  try {
    if (name === "b") viewBoard(a[0]);
    else if (name === "f") viewFamily(a[0]);
    else if (name === "subjects" || name === "e") viewSubjects();
    else if (name === "s") viewSubject(a[0], a[1]);
    else if (name === "g") viewGroup(a[0], a[1], a[2]);
    else if (name === "t") await viewTopic(a[0], a[1], a[2]);
    else if (name === "p") await viewPractice("topic", a[0], +a[1] || 0, a[2]);
    else if (name === "r") await viewPractice("paper", a[0], +a[1] || 0);
    else if (name === "pick") await viewPick(a[0], a[1], a[2]);
    else if (name === "reports") await viewReports();
    else if (name === "l") await viewPractice("set", a[0], +a[1] || 0);
    else if (name === "mock") viewMock();
    else if (name === "ts") viewTS();
    else if (name === "mentor") viewMentor(a[0]);
    else if (name === "skills") viewSkills();
    else if (name === "me") viewMe();
    else if (name === "hist") viewHist();
    else if (name === "info") viewInfo(a[0]);
    else if (name === "courses") viewSoon("🎓 My Courses", L("आपके ख़रीदे Course / Test Series / Mentorship यहाँ दिखेंगे।", "Your purchased courses will appear here."));
    else if (name === "lib") viewSoon("📚 Library", L("PYQ PDF, Short Notes और Tricks — डाउनलोड के साथ।", "PYQ PDFs, short notes and tricks — downloadable."));
    else if (name === "x") await Exam.open(a[0], a[1], +a[2] || 0);
    else viewHome();
  } catch (err) {
    console.error(err);
    $app.innerHTML = `${topbar({ back: "home", title: L("कुछ गड़बड़ हुई", "Something went wrong") })}<div class="empty"><b>${L("पेज लोड नहीं हो पाया", "Page could not load")}</b><br><br><button class="btn btn-primary" data-act="reload">${L("दोबारा कोशिश करें", "Try again")}</button></div>`;
  }
  if (!hasPicked() && !["x", "pick"].includes(name) && !document.querySelector(".modal-mask")) firstVisitPopup();
}

function toggleIn(arr, v) { const i = arr.indexOf(v); if (i > -1) arr.splice(i, 1); else arr.push(v); return arr; }
document.addEventListener("click", e => {
  const opt = e.target.closest(".practice-list .opt");
  if (opt) { onPracticeTap(opt); return; }
  const rc = e.target.closest(".fb .rchip");
  if (rc) { rc.classList.toggle("on"); const b = rc.closest(".fb").querySelector(".rsend"); if (b) b.disabled = !rc.closest(".fb").querySelector(".rchip.on"); return; }
  const g = e.target.closest("[data-go]");
  if (g && !g.disabled) { go(g.dataset.go); return; }
  const a = e.target.closest("[data-act]");
  if (!a || a.disabled) return;
  const act = a.dataset.act, tid = $app.dataset.topic, v = a.dataset.v;
  if (act === "lang") { LANG = v; store.set("lang", v); if (!document.querySelector(".exam-header")) route(); else toast(v === "en" ? "Language: English" : "भाषा: हिंदी"); }
  else if (act === "tadka") tadkaPopup(QINDEX[a.dataset.qid]?.t || (typeof Exam !== "undefined" && Exam.tadkaFor(a.dataset.qid)));
  else if (act === "soon") toast(L("यह जल्द जोड़ा जाएगा", "Coming soon"));
  else if (act === "reload") route();
  else if (act === "fam-year") { store.set("fy." + $app.dataset.fam, v); viewFamily($app.dataset.fam); }
  else if (act === "tmode") { store.set("tm." + tid, v); viewTopic(tid); }
  else if (act === "p-cont") go(`p~${tid}~0`);
  else if (act === "p-restart") {
    document.querySelector(".resume-bar")?.remove();
    if (PRACTICE) restartPractice(PRACTICE.kind, PRACTICE.id); else if (tid) restartPractice("topic", tid);
  }
  else if (act === "t-retake") { store.del(`exam.topic.${tid}#${sigOf(activeFilter(tid))}.${v}`); go(`x~topic~${tid}~${v}`); }
  else if (act === "report") { const q = findQ(a.dataset.qid); if (q) openReport(q); }
  else if (act === "fb-yes" || act === "fb-no" || act === "fb-send") {
    const box = a.closest(".fb"), q = findQ(box.dataset.qid); if (!q) return;
    if (act === "fb-no") return fbNoForm(box);
    const reason = act === "fb-send" ? [...box.querySelectorAll(".rchip.on")].map(x => x.dataset.r).join(", ") : "";
    sendReport({ type: act === "fb-yes" ? "व्याख्या 👍" : "व्याख्या 👎", reason, comment: act === "fb-send" ? box.querySelector(".rtext").value.trim() : "", ...qRef(q) });
    store.set("fb." + q.id, act === "fb-yes" ? 1 : -1);
    box.className = "fb done"; box.innerHTML = `✓ ${L("आपकी प्रतिक्रिया मिल गई — धन्यवाद!", "Thanks for your feedback!")}`;
  }
  else if (act === "rep-filter") { REP_FILTER = v; viewReports(); }
  else if (act === "rep-xls") downloadReports();
  else if (act === "rep-done") { (async () => { const db = await reportDB(); const r = ($app._reports || []).find(x => x._id === v); if (!db || !r) return;
      try { await db.doc("reports/" + v).update({ done: !r.done }); viewReports(); } catch (e) { toast(e.code || "error"); } })(); }
  else if (act === "tf-reset") { store.del("tf." + v); clearTopicProgress(v); go("t~" + v); }
});

window.addEventListener("hashchange", route);
if (SITE.PROTECT_CONTENT) {
  ["contextmenu", "copy", "cut", "dragstart"].forEach(ev => document.addEventListener(ev, e => e.preventDefault()));
}
(async function boot() {
  $app.innerHTML = `<div class="loading"><img src="assets/logo.webp" alt="" width="96" height="96" style="border-radius:50%"><div class="spinner"></div></div>`;
  try { [CATALOG] = await Promise.all([getJSON("data/catalog.json"), loadFixes()]); indexCatalog(); route(); }
  catch (e) { console.error(e); $app.innerHTML = `<div class="empty" style="margin-top:40px"><b>Data could not load</b>Please refresh.</div>`; }
})();

// ---------- App install (PWA) ----------
let INSTALL_EVT = null;
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
function renderInstall() {
  const slot = document.getElementById("install-slot");
  if (!slot) return;
  if (isStandalone() || store.get("inst.x")) { slot.innerHTML = ""; return; }
  const ios = isIOS() && !INSTALL_EVT;
  if (!INSTALL_EVT && !ios) { slot.innerHTML = ""; return; }
  slot.innerHTML = `<div class="card install-card"><img src="assets/icon-192.png" alt="" width="44" height="44">
    <div class="ic-tx"><b>${L("PYQ Saarthi App इंस्टॉल करें", "Install the PYQ Saarthi app")}</b>
    <small>${ios ? L("Safari में नीचे Share ⬆️ दबाएँ → “Add to Home Screen”", "In Safari tap Share ⬆️ → “Add to Home Screen”")
                 : L("Free • 1 MB से कम • बिना इंटरनेट भी पुराने पेपर खुलेंगे", "Free • under 1 MB • opens saved papers offline")}</small></div>
    ${ios ? "" : `<button class="btn btn-primary btn-sm" data-act="install">${L("इंस्टॉल", "Install")}</button>`}
    <button class="ic-x" data-act="install-x" aria-label="close">✕</button></div>`;
}
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); INSTALL_EVT = e; renderInstall(); });
window.addEventListener("appinstalled", () => { INSTALL_EVT = null; store.set("inst.x", 1); renderInstall(); });
document.addEventListener("click", async e => {
  const a = e.target.closest("[data-act='install'],[data-act='install-x']"); if (!a) return;
  if (a.dataset.act === "install" && INSTALL_EVT) { INSTALL_EVT.prompt(); await INSTALL_EVT.userChoice.catch(() => {}); INSTALL_EVT = null; }
  else store.set("inst.x", 1);
  renderInstall();
});
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost") && !/claude|claudeusercontent/.test(location.hostname)) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
