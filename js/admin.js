// =============================================
// PYQ Saarthi Admin — Excel → website data (catalog + topic files + mocks)
// Website ka maujooda data rakhta hai; sirf Excel wale topic naye bante / badalte hain.
// =============================================

const el = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const FILES = [];          // { name, wb, sheet, subject, board }
let RESULT = null;

/* ---------- column names that Excel may use ---------- */
const norm = s => String(s ?? "").toLowerCase().replace(/[\s_\-.()]/g, "");
const HEAD = {
  qid: ["qid", "id", "questionid"],
  q: ["question", "que", "questions", "प्रश्न", "prashn"],
  o1: ["option1", "optiona", "opt1", "विकल्प1"],
  o2: ["option2", "optionb", "opt2", "विकल्प2"],
  o3: ["option3", "optionc", "opt3", "विकल्प3"],
  o4: ["option4", "optiond", "opt4", "विकल्प4"],
  ans: ["finalans", "answer", "ans", "correct", "correctanswer", "उत्तर"],
  e: ["explanation", "solution", "व्याख्या"],
  topic: ["topic", "टॉपिक", "chapter"],
  subject: ["subject", "विषय"],
  board: ["board", "exambody", "बोर्ड"],
  src: ["exam", "examname", "pyq", "source", "year", "परीक्षा"],
  lvl: ["level", "difficulty"],
  mock: ["mock", "mockid", "mockname"]
};
function mapHeaders(row) {
  const m = {};
  const n = row.map(norm);
  for (const [k, names] of Object.entries(HEAD)) {
    for (const nm of names) { const i = n.indexOf(norm(nm)); if (i > -1) { m[k] = i; break; } }
  }
  return m;
}

/* ---------- ids that stay the same every time ---------- */
function hash(s) { let h = 5381; for (const c of s) h = (h * 33 ^ c.codePointAt(0)) >>> 0; return h.toString(36).slice(0, 7); }
const AI = /clou?de|colude|gpt/i;
const clean = v => (v === undefined || v === null) ? "" : String(v).trim();
const normBoard = b => { const x = clean(b).toUpperCase(); return x.includes("RSSB") || x.includes("RSMSSB") ? "RSSB" : x.includes("RPSC") ? "RPSC" : (x || ""); };

/* ---------- step 1: pick files ---------- */
el("files").onchange = async e => {
  for (const f of e.target.files) {
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.SheetNames.find(n => /master/i.test(n)) || wb.SheetNames[0];
    FILES.push({ name: f.name, wb, sheet, subject: "", board: "RPSC" });
  }
  e.target.value = "";
  drawFiles();
};
function drawFiles() {
  el("file-list").innerHTML = FILES.map((f, i) => `<div class="file">
    <b>📄 ${esc(f.name)}</b>
    <label class="full">कौन-सी Sheet<select data-i="${i}" data-k="sheet">${f.wb.SheetNames.map(n => `<option ${n === f.sheet ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
    <div class="row">
      <label>विषय (अगर Excel में कॉलम नहीं)<input type="text" data-i="${i}" data-k="subject" value="${esc(f.subject)}" placeholder="जैसे: राजस्थान भूगोल"></label>
      <label>Board (अगर कॉलम नहीं)<select data-i="${i}" data-k="board">${["RPSC", "RSSB"].map(b => `<option ${b === f.board ? "selected" : ""}>${b}</option>`).join("")}</select></label>
    </div>
    <button class="reset-link" style="margin:0" data-del="${i}">हटाएँ</button></div>`).join("");
  el("check").disabled = !FILES.length;
}
el("file-list").addEventListener("input", e => { const t = e.target; if (t.dataset.k) FILES[+t.dataset.i][t.dataset.k] = t.value; });
el("file-list").addEventListener("click", e => { const d = e.target.closest("[data-del]"); if (d) { FILES.splice(+d.dataset.del, 1); drawFiles(); } });
el("make-mocks").onchange = e => el("mock-opts").classList.toggle("hidden", !e.target.checked);

/* ---------- step 2: read + check ---------- */
function readRows() {
  const rows = [], errors = [];
  for (const f of FILES) {
    const data = XLSX.utils.sheet_to_json(f.wb.Sheets[f.sheet], { header: 1, defval: "", raw: true });
    const h = mapHeaders(data[0] || []);
    const need = ["q", "o1", "o2", "o3", "o4", "ans"].filter(k => h[k] === undefined);
    if (need.length) { errors.push(`${f.name}: ज़रूरी कॉलम नहीं मिले — ${need.map(k => ({ q: "Question", o1: "Option 1", o2: "Option 2", o3: "Option 3", o4: "Option 4", ans: "Answer" }[k])).join(", ")}`); continue; }
    if (h.topic === undefined) { errors.push(`${f.name}: "Topic" कॉलम नहीं है — हर प्रश्न का टॉपिक ज़रूरी है`); continue; }
    data.slice(1).forEach((r, i) => {
      const line = `${f.name} • पंक्ति ${i + 2}`;
      const g = k => h[k] === undefined ? "" : clean(r[h[k]]);
      const q = g("q");
      if (!q && !g("o1")) return;                     // khaali line
      const o = [g("o1"), g("o2"), g("o3"), g("o4")];
      let a = g("ans"), an = 0;
      if (/^[1-4](\.0+)?$/.test(a)) an = parseInt(a);
      else if (/^[A-Da-d]$/.test(a)) an = "abcd".indexOf(a.toLowerCase()) + 1;
      else if (a) an = o.findIndex(x => x === a) + 1;
      const subject = g("subject") || clean(f.subject);
      const board = normBoard(g("board") || f.board);
      const topic = g("topic");
      const miss = [];
      if (!q) miss.push("प्रश्न"); if (o.some(x => !x)) miss.push("कोई विकल्प");
      if (!an) miss.push(`सही उत्तर ("${a}" समझ नहीं आया — 1/2/3/4 लिखें)`);
      if (!subject) miss.push("विषय"); if (!topic) miss.push("टॉपिक");
      if (miss.length) { errors.push(`${line}: ${miss.join(", ")} खाली/गलत`); return; }
      const src = g("src");
      rows.push({ qid: g("qid"), q, o, a: an, e: g("e"), src: AI.test(src) ? "" : src.replace(/\s+/g, " "), lvl: g("lvl").replace(/^\d+\.\s*/, ""), subject, board, topic, mock: g("mock") });
    });
  }
  return { rows, errors };
}

el("check").onclick = async () => {
  el("check").disabled = true; el("check").textContent = "जाँच हो रही है…";
  try {
    let cat;
    try { cat = await (await fetch("data/catalog.json", { cache: "no-store" })).json(); }
    catch { cat = { subjects: [], mocks: [] }; }
    const { rows, errors } = readRows();
    RESULT = build(cat, rows);
    RESULT.errors = errors;
    showSummary();
  } catch (err) {
    console.error(err);
    el("summary").innerHTML = `<div class="errs">कुछ गड़बड़ हुई: ${esc(err.message)}</div>`;
    el("step2").classList.remove("hidden");
  }
  el("check").disabled = false; el("check").textContent = "दोबारा जाँचें";
};

function build(cat, rows) {
  cat = JSON.parse(JSON.stringify(cat));
  cat.subjects = cat.subjects || []; cat.mocks = cat.mocks || [];
  const files = {}, report = [];
  // group: subject → board → topic
  const groups = new Map();
  rows.forEach(r => {
    const k = r.subject + "\u0001" + r.board + "\u0001" + r.topic;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  });
  for (const [k, list] of groups) {
    const [sName, board, tName] = k.split("\u0001");
    let s = cat.subjects.find(x => x.name === sName);
    if (!s) { s = { id: "s" + hash(sName), name: sName, icon: [...sName][0], boards: { RPSC: [], RSSB: [] } }; cat.subjects.push(s); }
    s.boards[board] = s.boards[board] || [];
    let t = s.boards[board].find(x => x.name === tName);
    const isNew = !t;
    if (!t) { t = { id: "t" + hash(sName + "|" + board + "|" + tName), name: tName, count: 0 }; s.boards[board].push(t); }
    t.count = list.length;
    files[`data/topics/${t.id}.json`] = {
      id: t.id, name: tName, subject: s.id, board,
      questions: list.map((r, i) => ({ id: r.qid || `${t.id}-${i + 1}`, q: r.q, o: r.o, a: r.a, e: r.e, src: r.src, lvl: r.lvl }))
    };
    report.push({ subject: sName, board, topic: tName, n: list.length, isNew });
  }
  // move subjects that now have questions ahead of empty "coming soon" ones
  const count = s => Object.values(s.boards).flat().reduce((a, t) => a + t.count, 0);
  cat.subjects.sort((a, b) => (count(b) > 0) - (count(a) > 0));

  const mocks = [];
  if (el("make-mocks").checked) {
    const pos = +el("m-pos").value || 2, neg = +el("m-neg").value || 0, sec = +el("m-sec").value || 72, optE = el("m-e").value || "अनुत्तरित प्रश्न";
    const byMock = new Map();
    rows.filter(r => r.mock).forEach(r => { if (!byMock.has(r.mock)) byMock.set(r.mock, []); byMock.get(r.mock).push(r); });
    for (const [name, list] of byMock) {
      const title = name.replace(/_/g, " ");
      const id = "m" + hash(name);
      const minutes = Math.round(list.length * sec / 60);
      const subj = [...new Set(list.map(r => r.subject))].join(", ");
      const meta = {
        id, name: title, paper: subj, header: title, minutes, pos, neg, optionE: optE, count: list.length,
        insHi: `✍️ कुल प्रश्न = **'${list.length} प्रश्न'**\n✍️ कुल अंक = **'${+(list.length * pos).toFixed(2)} अंक'**\n✅ सही उत्तर = **'${pos} अंक'**\n❌ गलत उत्तर = **'-${neg} अंक'**\n⌛ कुल समय = **'${minutes} मिनट'**\n**यदि '10% से अधिक' प्रश्न बिना कोई 'Option' चुने छोड़े जाते हैं, तो आप ''अयोग्य'' माने जाओगे।**\n\n**"----------------🎊 All the Best🎊----------------"**`,
        insEn: `✍️ Total Questions = **'${list.length}'**\n✅ Correct Answer = **'+${pos}'**\n❌ Incorrect Answer = **'-${neg}'**\n⌛ Total Time = **'${minutes} Minutes'**\nIf more than **10% Questions** are left without selecting any 'Option', you will be considered **"Disqualified".**`
      };
      files[`data/mocks/${id}.json`] = { ...meta, questions: list.map((r, i) => ({ id: r.qid || `${id}-${i + 1}`, q: r.q, o: r.o, a: r.a, e: r.e, src: r.src, lvl: r.lvl })) };
      const { insHi, insEn, ...listMeta } = meta;
      const at = cat.mocks.findIndex(m => m.id === id);
      mocks.push({ name: title, n: list.length, isNew: at < 0 });
      if (at < 0) cat.mocks.push(listMeta); else cat.mocks[at] = listMeta;
    }
  }
  cat.updated = new Date().toISOString().slice(0, 10);
  files["data/catalog.json"] = cat;
  return { files, report, mocks, total: rows.length };
}

function showSummary() {
  const R = RESULT;
  const rowsHtml = R.report.map(r => `<tr><td>${esc(r.subject)}</td><td>${r.board}</td><td>${esc(r.topic)} <span class="pill ${r.isNew ? "new" : "upd"}">${r.isNew ? "नया" : "बदला"}</span></td><td class="n">${r.n}</td></tr>`).join("");
  el("summary").innerHTML = `
    <p><b style="color:var(--ink)">${R.total} प्रश्न सही मिले</b> • ${R.report.length} टॉपिक${R.mocks.length ? ` • ${R.mocks.length} Mock Test` : ""}</p>
    ${R.report.length ? `<div class="tbl-wrap"><table><thead><tr><th>विषय</th><th>Board</th><th>टॉपिक</th><th>प्रश्न</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>` : ""}
    ${R.mocks.length ? `<div class="tbl-wrap"><table><thead><tr><th>Mock Test</th><th>प्रश्न</th></tr></thead><tbody>${R.mocks.map(m => `<tr><td>${esc(m.name)} <span class="pill ${m.isNew ? "new" : "upd"}">${m.isNew ? "नया" : "बदला"}</span></td><td class="n">${m.n}</td></tr>`).join("")}</tbody></table></div>` : ""}
    ${R.errors.length ? `<div class="errs"><b>⚠️ ${R.errors.length} पंक्तियाँ छोड़ी गईं — Excel में ठीक करके दोबारा जाँचें:</b><br>${R.errors.slice(0, 200).map(esc).join("<br>")}</div>` : `<div class="ok-box">✅ कोई गलती नहीं मिली।</div>`}`;
  el("download").disabled = !R.total;
  el("step2").classList.remove("hidden");
  el("step2").scrollIntoView({ behavior: "smooth" });
}

/* ---------- step 3: ZIP ---------- */
el("download").onclick = async () => {
  const zip = new JSZip();
  for (const [path, obj] of Object.entries(RESULT.files))
    zip.file(path, JSON.stringify(obj, null, path.endsWith("catalog.json") ? 1 : 0));
  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `pyqsaarthi-data-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a); a.click(); a.remove();
  el("step3").classList.remove("hidden");
  el("step3").scrollIntoView({ behavior: "smooth" });
};
