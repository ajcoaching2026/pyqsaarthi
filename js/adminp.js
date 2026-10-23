// =============================================
// PYQ Saarthi — Admin panel (sirf admin ke phone/laptop par: #admin~PIN se khulta hai)
// Data: Admin Google Sheet (Apps Script web app)  → SITE.SHEET.API
// =============================================
const ADM_TABS = [["reports", "📋", "Reports"], ["sudhar", "✏️", "सुधार"], ["banner", "🎞️", "Banner"], ["mentor", "🎯", "Mentorship"], ["links", "🔗", "Links"], ["stats", "📊", "Analytics"]];
const isAdmin = () => !!store.get("adm", false);
const akey = () => store.get("akey", "");
async function api(params, body) {
  const API = SITE.SHEET && SITE.SHEET.API; if (!API) throw new Error("no-api");
  const u = API + "?" + new URLSearchParams({ ...params, key: akey() });
  const r = body ? await fetch(u, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ ...body, key: akey() }) }) : await fetch(u);
  const j = await r.json(); if (!j.ok) throw new Error(j.error || "error"); return j;
}
function admShell(tab, inner) {
  return `${topbar({ back: "me", title: "🛠️ Admin", sub: SITE.SHEET && SITE.SHEET.API ? L("Google Sheet से जुड़ा ✓", "Connected to Google Sheet ✓") : L("Sheet अभी जुड़ी नहीं", "Sheet not connected") })}
    <div class="adm-tabs">${ADM_TABS.map(([k, i, t]) => `<button class="${k === tab ? "on" : ""}" data-go="adm~${k}">${i} ${t}</button>`).join("")}</div>
    <div id="adm-body">${inner}</div>`;
}
const admNeedSheet = () => `<div class="card hero-soft"><b>🔌 ${L("पहले Admin Google Sheet जोड़ें", "Connect the Admin Google Sheet first")}</b>
  <p>${L("Sheet और Apps Script का setup होने के बाद Claude इसे site से जोड़ देगा — फिर यहाँ Reports, सुधार, Banner, Mentorship और Links सब चलेंगे।", "Once the Sheet + Apps Script is set up, Claude connects it — then Reports, fixes, Banner, Mentorship and Links all work here.")}</p></div>`;
const admNeedKey = () => `<div class="card"><b>🔑 Admin Key</b><p class="muted">${L("Apps Script के setup() से मिली ADMIN KEY एक बार डालें (सिर्फ़ इसी फ़ोन में सेव होगी)।", "Enter the ADMIN KEY from setup() once (saved on this device only).")}</p>
  <div class="adm-row"><input id="adm-key" class="adm-in" placeholder="ADMIN KEY"><button class="btn-sm prim" data-act="adm-key">${L("सेव", "Save")}</button></div></div>`;

async function viewAdmin(tab = "reports", arg) {
  if (!isAdmin()) return go("home");
  const hasApi = !!(SITE.SHEET && SITE.SHEET.API);
  const needs = ["reports", "sudhar", "banner", "mentor", "links"].includes(tab);
  if (needs && !hasApi) { $app.innerHTML = admShell(tab, admNeedSheet() + (tab === "reports" ? localReportsCard() : "")); return; }
  if (needs && !akey()) { $app.innerHTML = admShell(tab, admNeedKey()); return; }
  $app.innerHTML = admShell(tab, `<div class="loading"><div class="spinner"></div></div>`);
  const body = document.getElementById("adm-body");
  try {
    if (tab === "reports") body.innerHTML = await admReports(arg);
    else if (tab === "sudhar") body.innerHTML = admSudharForm(arg ? decodeURIComponent(arg) : "");
    else if (tab === "banner") body.innerHTML = admListEditor("banner");
    else if (tab === "mentor") body.innerHTML = admListEditor("mentor");
    else if (tab === "links") body.innerHTML = admLinks();
    else if (tab === "stats") body.innerHTML = admStats();
    if (tab === "sudhar" && arg) admLookup();
  } catch (e) {
    body.innerHTML = e.message === "key" ? `<div class="tip red">❌ ${L("Admin Key गलत है — फिर से डालें", "Wrong admin key — enter again")}</div>${admNeedKey()}` : `<div class="tip red">❌ ${L("Sheet से जुड़ नहीं पाए", "Could not reach the Sheet")}: ${esc(e.message)}</div>`;
  }
}
const localReportsCard = () => store.get("repq", []).length ? `<button class="card notify-c" data-go="reports">📋 ${L("इस फ़ोन की पुरानी रिपोर्ट", "Old reports saved on this phone")} (${store.get("repq", []).length}) ›</button>` : "";

/* ---------- 📋 Reports ---------- */
let ADM_REP = null;
async function admReports(filter) {
  const j = await api({ action: "reports" });
  const pack = (list, tab) => list.map(r => ({ tab, row: r.row, time: r.v[0], type: r.v[1], reason: r.v[2], comment: r.v[3], qid: r.v[4], exam: r.v[5], qno: r.v[6], excel: r.v[7], question: r.v[8], page: r.v[9], lang: r.v[10], done: r.v[11] }));
  ADM_REP = [...pack(j.reports, "Reports"), ...pack(j.feedback, "Feedback")].sort((a, b) => String(b.time).localeCompare(String(a.time)));
  const f = filter || store.get("admf", "open");
  const shown = ADM_REP.filter(r => f === "all" ? true : f === "fb" ? r.tab === "Feedback" : r.tab === "Reports" && !/हाँ|yes/i.test(r.done));
  const open = ADM_REP.filter(r => r.tab === "Reports" && !/हाँ|yes/i.test(r.done)).length;
  const neg = ADM_REP.filter(r => r.tab === "Feedback" && /👎/.test(r.type)).length;
  const byQ = {}; ADM_REP.filter(r => r.qid).forEach(r => byQ[r.qid] = (byQ[r.qid] || 0) + 1);
  const top = Object.entries(byQ).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return `<div class="card stats3"><div><b>${open}</b><small>${L("खुली रिपोर्ट", "Open reports")}</small></div><div><b>${ADM_REP.filter(r => r.tab === "Feedback").length}</b><small>Feedback</small></div><div><b>${neg}</b><small>👎</small></div></div>
    ${top.length ? `<div class="card"><b>🔥 ${L("सबसे ज़्यादा रिपोर्ट वाले प्रश्न", "Most-reported questions")}</b>${top.map(([q, n]) => `<div class="adm-top"><code>${esc(q)}</code><span>${n}×</span><button class="link" data-go="adm~sudhar~${enc(q)}">✏️ ${L("सुधारें", "Fix")}</button></div>`).join("")}</div>` : ""}
    <div class="mt-tabs">${[["open", L("खुली", "Open")], ["fb", "Feedback"], ["all", L("सभी", "All")]].map(([k, t]) => `<button class="${k === f ? "on" : ""}" data-act="adm-f" data-v="${k}">${t}</button>`).join("")}
      <button data-act="adm-xls">⬇️ Excel</button></div>
    ${shown.map(r => `<div class="card rep-row"><div class="rr-h"><b>${esc(r.type || "")}</b>${r.reason ? ` • ${esc(r.reason)}` : ""}<small>${esc(String(r.time).slice(0, 16).replace("T", " "))}</small></div>
      ${r.comment ? `<div class="rr-c">💬 ${esc(r.comment)}</div>` : ""}
      ${r.qid ? `<div class="rr-meta"><span>QID <b>${esc(r.qid)}</b></span><span>${esc(r.exam)} • Q.${esc(r.qno)}</span><span>Excel: <b>${esc(r.excel)}</b></span></div><div class="rr-q">${esc(String(r.question || "").slice(0, 140))}</div>` : ""}
      <div class="rr-b">${r.qid ? `<button class="btn-sm" data-go="adm~sudhar~${enc(r.qid)}">✏️ ${L("सुधारें", "Fix")}</button>` : ""}
        ${/हाँ|yes/i.test(r.done) ? `<span class="tag ok">✓ ${L("हो गया", "Done")}</span>` : `<button class="btn-sm prim" data-act="adm-done" data-tab="${r.tab}" data-v="${r.row}">✓ ${L("हो गया", "Done")}</button>`}</div></div>`).join("")
      || `<div class="empty"><b>${L("कोई रिपोर्ट नहीं 🎉", "No reports 🎉")}</b></div>`}`;
}
function admDownload() {
  if (!ADM_REP) return;
  const H = ["समय", "प्रकार", "कारण", "टिप्पणी", "QID", "Exam Name", "Q.No", "Excel (Sheet!Row)", "प्रश्न", "कहाँ से", "भाषा", "सुधार हुआ?"];
  const K = ["time", "type", "reason", "comment", "qid", "exam", "qno", "excel", "question", "page", "lang", "done"];
  const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "﻿" + [H.map(q).join(","), ...ADM_REP.map(r => K.map(k => q(r[k])).join(","))].join("\r\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `PYQSaarthi-Reports-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
}

/* ---------- ✏️ सुधार: find a question by QID, edit, save to Sheet ---------- */
function admSudharForm(qid) {
  return `<div class="card"><b>✏️ ${L("प्रश्न सुधारें", "Fix a question")}</b>
    <p class="muted">${L("QID डालें (प्रश्न के नीचे लिखी ID)। जो बदलना है वही बदलें — सेव करते ही 2–5 मिनट में site पर सबके लिए बदल जाएगा।", "Enter the QID shown under the question. Change only what's wrong — it goes live for everyone in 2–5 minutes.")}</p>
    <div class="adm-row"><input id="sd-qid" class="adm-in" value="${esc(qid)}" placeholder="RSSB_24_CET12th(S6)_1"><button class="btn-sm prim" data-act="adm-look">🔍 ${L("खोजें", "Find")}</button></div></div>
    <div id="sd-form"></div>`;
}
async function admLookup() {
  const id = (document.getElementById("sd-qid").value || "").trim(), box = document.getElementById("sd-form");
  if (!id) return;
  box.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  const idx = await getJSON("data/qidx.json").catch(() => ({}));
  const pre = id.replace(/_\d+$/, ""), pid = idx[pre];
  const P = pid ? await loadPaper(pid) : null, q = P && P.questions.find(x => x.id === id);
  if (!q) { box.innerHTML = `<div class="tip red">❌ ${L("यह QID नहीं मिली — Excel से ठीक-ठीक copy करें", "QID not found — copy it exactly from Excel")}</div>`; return; }
  const ta = (k, v, rows = 2) => `<label class="adm-l">${k}<textarea data-k="${k}" rows="${rows}">${esc(v || "")}</textarea></label>`;
  box.innerHTML = `<div class="card adm-form" data-qid="${esc(id)}"><div class="muted">${esc(paperName(pid))} • Q.${q.n} • Excel: ${esc(q.x || "")}</div>
    ${ta("Question", q.q, 3)}${[1, 2, 3, 4].map(i => ta("Option " + i, q.o[i - 1], 1)).join("")}
    <label class="adm-l">Final_Ans<select data-k="Final_Ans">${["A", "B", "C", "D", "Delete"].map(x => `<option ${(q.d && x === "Delete") || (!q.d && "ABCD"[q.a - 1] === x) ? "selected" : ""}>${x}</option>`).join("")}</select></label>
    ${ta("Explanation", q.e, 3)}${ta("Topic Tadka", q.t, 3)}${ta("नोट", "", 1)}
    <button class="btn btn-primary btn-block" data-act="adm-sudhar">💾 ${L("सेव करें — site पर भेजें", "Save — send to site")}</button></div>`;
  box.dataset.orig = JSON.stringify({ Question: q.q, "Option 1": q.o[0], "Option 2": q.o[1], "Option 3": q.o[2], "Option 4": q.o[3], Final_Ans: q.d ? "Delete" : "ABCD"[q.a - 1], Explanation: q.e || "", "Topic Tadka": q.t || "" });
}
async function admSaveSudhar(btn) {
  const f = btn.closest(".adm-form"), orig = JSON.parse(document.getElementById("sd-form").dataset.orig || "{}");
  const row = { QID_Full: f.dataset.qid };
  f.querySelectorAll("[data-k]").forEach(el => { const v = el.value.trim(); if (el.dataset.k === "नोट" || v !== (orig[el.dataset.k] || "").trim()) row[el.dataset.k] = v; });
  if (Object.keys(row).length <= 2 && !row["नोट"]) return toast(L("कुछ बदला ही नहीं", "Nothing changed"));
  btn.disabled = true; btn.textContent = "…";
  try { const j = await api({ action: "sudhar" }, { action: "sudhar", row }); toast(j.updated ? L("पुराना सुधार अपडेट हुआ ✓", "Fix updated ✓") : L("सुधार सेव ✓ — 2–5 मिनट में site पर", "Saved ✓ — live in 2–5 min")); btn.textContent = "✓"; }
  catch (e) { toast("❌ " + e.message); btn.disabled = false; btn.textContent = L("फिर से सेव करें", "Save again"); }
}

/* ---------- 🎞️ Banner / 🎯 Mentorship editors ---------- */
const ED = {
  banner: { tab: "Banner", list: () => SITE.BANNERS || [], cols: ["on", "tag", "icon", "style", "title", "sub", "cta", "go"],
    fields: [["title", "शीर्षक"], ["sub", "नीचे की लाइन"], ["tag", "ऊपर का टैग (जैसे 🆕 नया बैच)"], ["icon", "इमोजी"], ["cta", "बटन"], ["go", "बटन दबाने पर कहाँ जाए"], ["style", "रंग"]] },
  mentor: { tab: "Mentorship", list: () => SITE.MENTORSHIP || [], cols: ["on", "id", "board", "title", "status", "style", "sub", "start", "days", "price", "oldPrice", "points", "plan", "join"],
    fields: [["title", "नाम"], ["id", "छोटी ID (अंग्रेज़ी, बिना space — जैसे rajhc-ldc)"], ["board", "संस्था (RSSB / RPSC / High Court)"], ["status", "टैग (🆕 नया बैच / 🔴 LIVE)"], ["sub", "एक लाइन"],
      ["start", "शुरू"], ["days", "अवधि"], ["price", "फ़ीस ₹"], ["oldPrice", "पुरानी फ़ीस ₹ (कटी हुई)"], ["points", "क्या मिलेगा (हर लाइन एक बिंदु)"], ["plan", "प्लान"], ["join", "जुड़ने का लिंक"], ["style", "रंग"]] }
};
let ED_DATA = null;
function admListEditor(k) {
  const E = ED[k];
  ED_DATA = E.list().map(x => ({ on: "✓", ...x, points: Array.isArray(x.points) ? x.points.join("\n") : (x.points || "") }));
  return edRender(k);
}
function edRender(k) {
  const E = ED[k];
  const goOpts = [["mentor~" + ((ED_DATA[0] && ED_DATA[0].id) || ""), "Mentorship"], ["b~rssb", "पूरा पेपर"], ["subjects", "टॉपिक-वाइज़"], ["mock", "Mock"], ["ts", "Test Series"], ["home", "Home"]];
  const inp = (i, f, label) => {
    const v = ED_DATA[i][f] || "";
    if (f === "style") return `<label class="adm-l">${label}<select data-i="${i}" data-f="${f}">${[["s1", "नारंगी"], ["s2", "नीला"], ["s3", "बैंगनी"]].map(([s, t]) => `<option value="${s}" ${v === s ? "selected" : ""}>${t}</option>`).join("")}</select></label>`;
    if (f === "points" || f === "plan") return `<label class="adm-l">${label}<textarea data-i="${i}" data-f="${f}" rows="3">${esc(v)}</textarea></label>`;
    if (f === "go") return `<label class="adm-l">${label}<input data-i="${i}" data-f="${f}" value="${esc(v)}" list="go-list"></label>`;
    return `<label class="adm-l">${label}<input data-i="${i}" data-f="${f}" value="${esc(v)}"></label>`;
  };
  return `<datalist id="go-list">${goOpts.map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}${(SITE.MENTORSHIP || []).map(m => `<option value="mentor~${m.id}">${esc(m.title)}</option>`).join("")}</datalist>
    <div class="tip">ℹ️ ${L("बदलाव करके नीचे <b>सेव</b> दबाएँ — 2–5 मिनट में site पर दिखेगा।", "Edit, then press <b>Save</b> — live in 2–5 minutes.")}</div>
    ${ED_DATA.map((r, i) => `<div class="card adm-item"><div class="adm-ih"><b>${i + 1}. ${esc(r.title || L("नया", "New"))}</b>
        <label class="adm-on"><input type="checkbox" data-i="${i}" data-f="on" ${isOn(r.on) ? "checked" : ""}> ${L("दिखाएँ", "Show")}</label>
        <button class="link" data-act="ed-up" data-v="${i}">↑</button><button class="link red" data-act="ed-del" data-v="${i}">🗑</button></div>
      ${E.fields.map(([f, l]) => inp(i, f, l)).join("")}</div>`).join("")}
    <button class="card notify-c" data-act="ed-add" data-v="${k}">➕ ${L("नया जोड़ें", "Add new")}</button>
    <button class="btn btn-primary btn-block" data-act="ed-save" data-v="${k}" style="margin-top:12px">💾 ${L("सेव करें", "Save")}</button>`;
}
function edSync() {
  document.querySelectorAll("#adm-body [data-f]").forEach(el => { const i = +el.dataset.i; if (!ED_DATA[i]) return; ED_DATA[i][el.dataset.f] = el.type === "checkbox" ? (el.checked ? "✓" : "no") : el.value; });
}
async function edSave(k, btn) {
  edSync(); const E = ED[k];
  const rows = ED_DATA.map(r => E.cols.map(c => c === "points" ? String(r.points || "").split("\n").map(x => x.trim()).filter(Boolean).join(" | ") : (r[c] || "")));
  btn.disabled = true; btn.textContent = "…";
  try { await api({ action: "save" }, { action: "save", tab: E.tab, rows }); toast(L("सेव ✓ — 2–5 मिनट में site पर", "Saved ✓ — live in 2–5 min")); btn.textContent = "✓ " + L("सेव हो गया", "Saved"); }
  catch (e) { toast("❌ " + e.message); btn.disabled = false; btn.textContent = L("फिर से सेव करें", "Save again"); }
}

/* ---------- 🔗 Links ---------- */
function admLinks() {
  const F = [["telegram", "📢 Telegram"], ["youtube", "▶️ YouTube"], ["instagram", "📸 Instagram"], ["whatsapp", "💬 WhatsApp"], ["email", "✉️ Email"]];
  return `<div class="card adm-form">${F.map(([k, t]) => `<label class="adm-l">${t}<input data-lk="${k}" value="${esc(k === "email" ? SITE.EMAIL : SITE.SOCIAL[k] || "")}" placeholder="https://…"></label>`).join("")}
    <button class="btn btn-primary btn-block" data-act="lk-save">💾 ${L("सेव करें", "Save")}</button></div>
    <div class="tip">ℹ️ ${L("खाली छोड़ा बटन site पर नहीं दिखेगा।", "Empty ones are hidden on the site.")}</div>`;
}
async function lkSave(btn) {
  const rows = [...document.querySelectorAll("[data-lk]")].map(el => [el.dataset.lk, el.value.trim()]);
  btn.disabled = true;
  try { await api({ action: "save" }, { action: "save", tab: "Links", rows }); toast(L("सेव ✓", "Saved ✓")); } catch (e) { toast("❌ " + e.message); }
  btn.disabled = false;
}

/* ---------- 📊 Analytics ---------- */
function admStats() {
  const s = store.get("st", { a: 0, c: 0 });
  return `<div class="card hero-soft"><b>📊 Google Analytics</b>
    <p>${SITE.GA_ID ? L("जुड़ा हुआ ✓ — कितने बच्चे आए, कौन-सा exam/टॉपिक/पेपर सबसे ज़्यादा — सब यहाँ:", "Connected ✓ — visitors, top exams, topics and papers:") : L("अभी नहीं जुड़ा — Measurement ID (G-…) Claude को भेजें।", "Not connected yet — send the Measurement ID (G-…) to Claude.")}</p>
    ${SITE.GA_ID ? `<a class="btn btn-primary" href="https://analytics.google.com/" target="_blank" rel="noopener">Analytics खोलें ›</a>` : ""}</div>
    <div class="card"><b>${L("Analytics में कहाँ देखें", "Where to look in Analytics")}</b><ul class="mt-ul">
      <li>• <b>Reports → Realtime</b> — ${L("अभी कितने बच्चे site पर", "who is on the site now")}</li>
      <li>• <b>Engagement → Events</b> — exam_select, search, topic_open, paper_open, test_start, test_submit, mock_start</li>
      <li>• ${L("किसी event पर क्लिक → कौन-सा exam / टॉपिक / पेपर सबसे ज़्यादा", "Click an event → top exam / topic / paper")}</li></ul></div>
    <div class="card stats3"><div><b>${nf(s.a)}</b><small>${L("इस फ़ोन पर प्रश्न", "Qs on this phone")}</small></div><div><b>${nf(CATALOG.stats.papers)}</b><small>${L("पेपर", "Papers")}</small></div><div><b>${nf(CATALOG.stats.q)}</b><small>${L("प्रश्न", "Questions")}</small></div></div>`;
}

/* ---------- actions ---------- */
document.addEventListener("click", async e => {
  const a = e.target.closest("[data-act]"); if (!a) return;
  const act = a.dataset.act, v = a.dataset.v;
  if (!act.startsWith("adm-") && !act.startsWith("ed-") && act !== "lk-save") return;
  if (act === "adm-key") { const k = document.getElementById("adm-key").value.trim(); if (k) { store.set("akey", k); route(); } }
  else if (act === "adm-f") { store.set("admf", v); viewAdmin("reports", v); }
  else if (act === "adm-xls") admDownload();
  else if (act === "adm-done") { a.disabled = true; try { await api({ action: "done" }, { action: "done", tab: a.dataset.tab, row: +v }); a.outerHTML = `<span class="tag ok">✓ हो गया</span>`; } catch (x) { toast("❌ " + x.message); a.disabled = false; } }
  else if (act === "adm-look") admLookup();
  else if (act === "adm-sudhar") admSaveSudhar(a);
  else if (act === "ed-add") { edSync(); ED_DATA.push({ on: "✓", style: "s1" }); document.getElementById("adm-body").innerHTML = edRender(v); }
  else if (act === "ed-del") { edSync(); ED_DATA.splice(+v, 1); document.getElementById("adm-body").innerHTML = edRender(location.hash.includes("mentor") ? "mentor" : "banner"); }
  else if (act === "ed-up") { edSync(); const i = +v; if (i > 0) [ED_DATA[i - 1], ED_DATA[i]] = [ED_DATA[i], ED_DATA[i - 1]]; document.getElementById("adm-body").innerHTML = edRender(location.hash.includes("mentor") ? "mentor" : "banner"); }
  else if (act === "ed-save") edSave(v, a);
  else if (act === "lk-save") lkSave(a);
});
