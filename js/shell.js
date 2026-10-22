// =============================================
// PYQ Saarthi — app shell: bottom bar, left menu, banner, continue card,
// exam picker popup, Mock / Test Series / Mentorship / Skills / Profile pages
// =============================================

/* ---------- navigation ---------- */
const NAV = [
  ["home", "🏠", "Home", "Home"], ["mock", "📝", "Mock", "Mock"], ["ts", "🏆", "Test Series", "Test Series"],
  ["skills", "⌨️", "Skills", "Skills"], ["me", "👤", "Profile", "Profile"]
];
const SECTION = { mock: "mock", ts: "ts", skills: "skills", me: "me", info: "me", hist: "me", l: "me", reports: "me", mentor: "mentor" };
const sectionOf = name => name === "x" && /^#x~mock~/.test(location.hash) ? "mock" : SECTION[name] || "home";

function sideItems(active) {
  const it = (go, ic, hi, en, extra = "") => `<button class="sd-i ${active === go ? "on" : ""}" data-go="${go}"><i>${ic}</i>${L(hi, en)}${extra}</button>`;
  const soon = `<span class="sd-soon">${L("जल्द", "Soon")}</span>`;
  return `${it("home", "🏠", "Home — PYQ Practice", "Home — PYQ Practice")}
    ${it("mock", "📝", "PYQ Mock Test", "PYQ Mock Test")}
    ${it("ts", "🏆", "Test Series", "Test Series")}
    ${it("mentor", "🎯", "Mentorship", "Mentorship", `<span class="sd-new">NEW</span>`)}
    <div class="sd-sec">${L("मेरा", "MINE")}</div>
    ${it("me", "👤", "Profile", "Profile")}
    ${it("l~bm", "⭐", "Bookmark प्रश्न", "Bookmarked Qs")}
    ${it("l~wr", "❌", "गलत हुए प्रश्न", "Wrong answers")}
    ${it("hist", "🧾", "Test History", "Test History")}
    ${it("courses", "🎓", "My Courses", "My Courses", soon)}
    <div class="sd-sec">LIBRARY</div>
    ${it("lib", "📚", "PYQ PDF • Notes", "PYQ PDF • Notes", soon)}
    ${it("skills", "⌨️", "Typing • Steno", "Typing • Steno", soon)}
    <div class="sd-sec">${L("और", "MORE")}</div>
    ${SITE.SOCIAL.telegram ? `<a class="sd-i" href="${SITE.SOCIAL.telegram}" target="_blank" rel="noopener"><i>📢</i>${L("Telegram से जुड़ें", "Join Telegram")}</a>` : ""}
    ${it("info~contact", "❓", "Help / Contact", "Help / Contact")}
    ${it("info~about", "ℹ️", "About • Policies", "About • Policies")}`;
}
function renderShell(name) {
  const sec = sectionOf(name);
  let nav = document.getElementById("bnav");
  if (!nav) { nav = document.createElement("nav"); nav.id = "bnav"; document.body.appendChild(nav); }
  nav.innerHTML = NAV.map(([k, ic, hi, en]) => `<button class="${sec === k ? "on" : ""}" data-go="${k}"><i>${ic}</i><span>${L(hi, en)}</span></button>`).join("");
  let side = document.getElementById("side");
  if (!side) { side = document.createElement("aside"); side.id = "side"; document.body.appendChild(side); }
  const active = name === "home" || !name ? "home" : location.hash.slice(1).split("~").slice(0, name === "l" || name === "info" ? 2 : 1).join("~");
  side.innerHTML = `<div class="sd-brand" data-go="home"><img src="assets/logo.webp" alt=""><div class="brand-name">${SITE.NAME_A}<span>${SITE.NAME_B}</span></div></div>
    <div class="sd-list">${sideItems(active)}</div>`;
  document.body.classList.toggle("in-test", false);
}
function openDrawerMenu() {
  closeDrawerMenu();
  const m = document.createElement("div"); m.className = "dm-mask";
  const name = (location.hash.slice(1) || "home").split("~")[0];
  m.innerHTML = `<div class="dm">
    <div class="dm-h" data-go="me"><div class="av">${esc([...(store.get("name", "") || "🙂")][0].toUpperCase())}</div>
      <div><b>${esc(store.get("name", "") || L("नमस्ते!", "Hello!"))}</b><small>${L("Profile देखें", "View profile")} ›</small></div></div>
    <div class="sd-list">${sideItems(name === "home" ? "home" : location.hash.slice(1).split("~").slice(0, 2).join("~"))}</div></div>`;
  document.body.appendChild(m);
  requestAnimationFrame(() => m.classList.add("open"));
  m.onclick = e => { if (e.target === m || e.target.closest("[data-go], a")) closeDrawerMenu(); };
}
function closeDrawerMenu() { document.querySelectorAll(".dm-mask").forEach(x => x.remove()); }

/* ---------- banner (auto slide) ---------- */
let BANNER_T = null;
function bannerHTML() {
  const B = SITE.BANNERS || []; if (!B.length) return "";
  return `<div class="bn-wrap"><div class="bn-track" id="bn-track">${B.map(b => `<button class="slide ${b.style || "s1"}" data-go="${b.go}">
      ${b.tag ? `<span class="k">${esc(b.tag)}</span>` : ""}<span class="em">${b.icon || ""}</span>
      <b>${esc(b.title)}</b><small>${esc(b.sub || "")}</small>${b.cta ? `<span class="cta">${esc(b.cta)} ›</span>` : ""}</button>`).join("")}</div>
    ${B.length > 1 ? `<div class="dots" id="bn-dots">${B.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</div>` : ""}</div>`;
}
function startBanner() {
  clearInterval(BANNER_T);
  const tr = document.getElementById("bn-track"); if (!tr) return;
  const dots = document.querySelectorAll("#bn-dots i"), n = tr.children.length;
  const cur = () => Math.round(tr.scrollLeft / tr.clientWidth);
  tr.onscroll = () => dots.forEach((d, i) => d.classList.toggle("on", i === cur()));
  if (n > 1) BANNER_T = setInterval(() => {
    if (!document.body.contains(tr)) return clearInterval(BANNER_T);
    tr.scrollTo({ left: ((cur() + 1) % n) * tr.clientWidth, behavior: "smooth" });
  }, 4500);
}

/* ---------- "जहाँ छोड़ा था, वहीं से" — one card, whatever was last ---------- */
function continueCard() {
  const last = store.get("last"); if (!last) return "";
  if (last.kind === "test") {
    const S = store.get("exam." + last.key); if (!S) return "";
    if (S.submitted) return `<button class="card cont done" data-go="${last.h}"><span class="pl">✓</span><span class="tx"><small>${L("आख़िरी टेस्ट", "Last test")} • ${L("पूरा हुआ", "Finished")}</small>
      <b>${esc(last.title)}</b><small>${L("स्कोर", "Score")}: ${toNum(S.result?.score ?? 0)} — ${L("Result देखें", "See result")}</small></span><span class="go">›</span></button>`;
    const done = S.ans.filter(Boolean).length, leftS = Math.max(0, (S.deadline - Date.now()) / 1000);
    const hm = leftS >= 3600 ? `${Math.floor(leftS / 3600)}:${String(Math.floor(leftS % 3600 / 60)).padStart(2, "0")}` : `${Math.floor(leftS / 60)} ${L("मिनट", "min")}`;
    return `<button class="card cont test" data-go="${last.h}"><span class="pl">▶</span><span class="tx"><small>${L("जहाँ छोड़ा था, वहीं से", "Continue where you left")} • Test</small>
      <b>${esc(last.title)}</b><span class="bar"><i style="width:${Math.round(done * 100 / S.n)}%"></i></span>
      <small>⏱ ${hm} ${L("बचा", "left")} • ${done} / ${S.n}</small></span><span class="go">›</span></button>`;
  }
  if (last.kind === "topic") {
    const t = topicMeta(last.id); if (!t) return "";
    const pd = store.get("pd." + last.id, null);
    return `<button class="card cont" data-go="p~${t.id}~0"><span class="pl">▶</span><span class="tx"><small>${L("जहाँ छोड़ा था, वहीं से", "Continue where you left")} • Practice</small>
      <b>${esc(nm(t))} — ${esc(nm(t.g))}</b>${pd ? `<span class="bar"><i style="width:${Math.round(pd.d * 100 / pd.n)}%"></i></span><small>${pd.d} / ${pd.n} ${L("हल किए", "done")}</small>` : ""}</span><span class="go">›</span></button>`;
  }
  if (last.kind === "paper") {
    if (!paperMeta(last.id)) return "";
    const pa = store.get(paKey("paper", last.id), {}), n = paperMeta(last.id).n || 0, d = Object.keys(pa).length;
    return `<button class="card cont" data-go="r~${last.id}~0"><span class="pl">▶</span><span class="tx"><small>${L("जहाँ छोड़ा था, वहीं से", "Continue where you left")} • ${L("पेपर पढ़ें", "Paper")}</small>
      <b>${esc(paperName(last.id))}</b>${n ? `<span class="bar"><i style="width:${Math.round(d * 100 / n)}%"></i></span><small>${d} / ${n} ${L("हल किए", "done")}</small>` : ""}</span><span class="go">›</span></button>`;
  }
  if (last.kind === "set" && false) {
    return `<button class="card cont" data-go="l~${last.id}~0"><span class="pl">▶</span><span class="tx"><small>${L("जहाँ छोड़ा था, वहीं से", "Continue where you left")}</small>
      <b>${last.id === "bm" ? L("⭐ Bookmark प्रश्न", "⭐ Bookmarked") : L("❌ गलत हुए प्रश्न", "❌ Wrong answers")}</b></span><span class="go">›</span></button>`;
  }
  return "";
}

/* ---------- exam picker as a popup (first visit + "बदलें") ---------- */
function openPickerModal(first) {
  document.querySelectorAll(".modal-mask.pk-modal").forEach(x => x.remove());
  const m = document.createElement("div"); m.className = "modal-mask pk-modal";
  const cur = mySel();
  m.innerHTML = `<div class="modal big" role="dialog" aria-modal="true">
    <div class="mb-head"><b>🎯 ${first ? L("आप किस परीक्षा की तैयारी कर रहे हैं?", "Which exam are you preparing for?") : L("मेरी परीक्षाएँ बदलें", "Change my exams")}</b>
      <small>${L("एक या ज़्यादा चुनें — Full Paper और Topic-wise में यही दिखेंगे", "Pick one or more — Full Papers & Topic-wise follow this")}</small>
      <button class="mb-full" id="pk-full" aria-label="full screen">⤢</button></div>
    <div class="mb-body" id="pkm"></div>
    <div class="mb-foot"><button class="btn btn-primary btn-block" id="pk-ok"></button>
      ${first ? `<button class="reset-link" id="pk-skip">${L("अभी नहीं — सारे exam दिखाएँ", "Not now — show all exams")}</button>` : ""}</div></div>`;
  document.body.appendChild(m);
  const box = m.querySelector(".modal");
  const st = mountPicker(m.querySelector("#pkm"), { fams: [...cur.fams], yrs: [...cur.yrs], last: cur.last }, {
    compact: true, noYears: first, onFull: () => { box.classList.add("full"); st.rerender(); },
    onChange: s => { const b = m.querySelector("#pk-ok"); if (b) b.textContent = `✓ ${first ? L("आगे बढ़ें", "Continue") : L("सेव करें", "Save")}${s.fams.length ? ` (${s.fams.length} ${L("चुने", "chosen")})` : ""}`; },
    onTopic: tid => { m.remove(); if (first) store.set("my", EMPTY()); go("t~" + tid); }
  });
  m.querySelector("#pk-full").onclick = () => { box.classList.toggle("full"); st.rerender(); };
  m.querySelector("#pk-ok").onclick = () => { store.set("my", { fams: st.fams, yrs: st.yrs, last: st.last }); m.remove(); if (!first) toast(L("सेव हो गया ✓", "Saved ✓")); route(); };
  if (first) m.querySelector("#pk-skip").onclick = () => { store.set("my", EMPTY()); m.remove(); route(); };
  else m.onclick = e => { if (e.target === m) m.remove(); };
}

/* ---------- my stats (this phone) ---------- */
const todayKey = () => new Date().toISOString().slice(0, 10);
function trackAnswer(correct, n = 1, c = correct ? 1 : 0) {
  const s = store.get("st", { a: 0, c: 0, days: [] });
  s.a += n; s.c += c;
  const t = todayKey(); if (!s.days.includes(t)) { s.days.push(t); s.days = s.days.slice(-400); }
  store.set("st", s);
}
function streak() {
  const days = new Set(store.get("st", { days: [] }).days); let n = 0; const d = new Date();
  if (!days.has(todayKey())) d.setDate(d.getDate() - 1);
  while (days.has(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
/* bookmarks + wrong answers: {qid: paperId} */
const isBm = id => !!store.get("bm", {})[id];
function toggleBm(q) {
  const bm = store.get("bm", {}); const pid = q.p || q.pp;
  if (bm[q.id]) delete bm[q.id]; else if (pid) bm[q.id] = pid;
  store.set("bm", bm);
  document.querySelectorAll(`.bm-btn[data-qid="${CSS.escape(q.id)}"]`).forEach(b => { b.classList.toggle("on", !!bm[q.id]); b.textContent = bm[q.id] ? "★" : "☆"; });
  toast(bm[q.id] ? L("⭐ Bookmark किया", "⭐ Bookmarked") : L("Bookmark हटाया", "Bookmark removed"));
}
function noteWrong(q, correct) {
  const wr = store.get("wr", {}); const pid = q.p || q.pp; if (!pid || q.d || !q.a) return;
  if (correct) delete wr[q.id]; else wr[q.id] = pid;
  store.set("wr", wr);
}
async function loadSet(which) {
  const map = store.get(which, {}); const ids = Object.keys(map).reverse();
  const pids = [...new Set(ids.map(i => map[i]))];
  const papers = await Promise.all(pids.map(p => loadPaper(p).catch(() => null)));
  const byId = {}; papers.forEach(P => P && P.questions.forEach(q => byId[q.id] = { ...q, p: P.id }));
  return ids.map(i => byId[i]).filter(Boolean);
}

/* ---------- small page helpers ---------- */
const pageTop = (title, sub) => topbar({ back: "home", title, sub });
const soonTag = () => `<span class="tag soon">${L("जल्द आ रहा है", "Coming soon")}</span>`;

/* ---------- 📝 PYQ Mock — fixed mixed tests made from an exam's real papers ---------- */
const loadMocks = () => getJSON("data/mock.json");
const mockTitle = m => `${m.name}${m.v ? " — " + m.v : ""}`;
const mockState = (key, k) => store.get(`exam.mock.${key}.${k}`);
async function viewMock(key) {
  $app.innerHTML = `${pageTop("📝 PYQ Mock Test")}<div class="loading"><div class="spinner"></div></div>`;
  const M = await loadMocks();
  if (key) {
    const m = M[key]; if (!m) return go("mock");
    const fam = family(m.fam);
    $app.innerHTML = `${topbar({ back: "mock", title: esc(mockTitle(m)), sub: `${m.tests.length} Mock • ${m.n} ${L("प्रश्न हर एक", "Qs each")}` })}
      <div class="tip">📌 ${L(`ये <b>${m.tests.length} Mock</b> ${esc(fam ? fam.name : m.name)} के <b>${m.papers.length} असली पेपरों</b> के ${nf(m.q)} प्रश्नों को मिलाकर बने हैं — हर Mock हमेशा एक जैसा रहेगा, ताकि सबकी Rank एक साथ बने।`,
        `These <b>${m.tests.length} mocks</b> mix ${nf(m.q)} questions from <b>${m.papers.length} real papers</b> — each mock stays fixed so everyone's rank is comparable.`)}</div>
      ${m.tests.map((t, k) => { const S = mockState(key, k); const done = S && S.submitted;
        return `<div class="card mk"><div class="mk-t"><b>Mock ${k + 1}</b><small>${t.length} ${L("प्रश्न", "Qs")} • ${Math.round(m.min * t.length / m.n)} ${L("मिनट", "min")} • +${m.pos} / −${m.neg}</small>
          ${done ? `<span class="tag ok">✓ ${L("स्कोर", "Score")} ${toNum(S.result?.score ?? 0)} / ${toNum(S.result?.max ?? 0)}</span>` : S ? `<span class="tag soon">▶ ${L("अधूरा", "In progress")}</span>` : `<span class="tag free">Free</span>`}</div>
          <div class="mk-b">${done ? `<button class="btn-sm" data-go="x~mock~${enc(key)}~${k}">${L("Result", "Result")}</button><button class="btn-sm prim" data-act="mock-retake" data-v="${esc(key)}" data-k="${k}">↺ ${L("दोबारा", "Retake")}</button>`
            : `<button class="btn-sm prim" data-go="x~mock~${enc(key)}~${k}">${S ? L("जारी रखें", "Resume") : L("शुरू करें", "Start")}</button>`}</div></div>`; }).join("")}
      <div class="tip">🏆 ${L("Rank — लॉगिन के बाद (जल्द): हर Mock में सबके अंक मिलाकर असली Rank।", "Rank — after login (soon): real rank from everyone's scores.")}</div>`;
    return;
  }
  const my = mySel().fams;
  const list = Object.entries(M).sort(([, a], [, b]) => (my.includes(b.fam) - my.includes(a.fam)) || ((family(a.fam)?.pop ?? 99) - (family(b.fam)?.pop ?? 99)) || b.q - a.q);
  const row = ([key, m]) => { const done = m.tests.filter((_, k) => mockState(key, k)?.submitted).length;
    return `<button class="card mk mk-fam" data-go="mock~${enc(key)}"><div class="mk-t"><b>${esc(mockTitle(m))}</b>
      <small>${m.tests.length} Mock • ${m.n} ${L("प्रश्न", "Qs")} • ${m.papers.length} ${L("पेपर से", "papers")} • ${nf(m.q)} PYQ</small>
      ${done ? `<span class="tag ok">✓ ${done} / ${m.tests.length} ${L("दिए", "done")}</span>` : `<span class="tag free">Free</span>`}</div><span class="go">›</span></button>`; };
  const mine = list.filter(([, m]) => my.includes(m.fam)), rest = list.filter(([, m]) => !my.includes(m.fam));
  $app.innerHTML = `${pageTop("📝 PYQ Mock Test", L("असली exam के pattern पर", "On the real exam pattern"))}
    <div class="tip">💡 ${L("हर exam के <b>सारे असली PYQ</b> मिलाकर बने <b>fixed Mock</b> — असली समय और marking के साथ, Rank भी (लॉगिन के बाद)।", "<b>Fixed mocks</b> made by mixing <b>all real PYQs</b> of an exam — real time and marking, with rank (after login).")}</div>
    ${mine.length ? `<div class="section-h"><h2>🎯 ${L("मेरी परीक्षाएँ", "My exams")}</h2></div>${mine.map(row).join("")}` : ""}
    <div class="section-h"><h2>${mine.length ? L("बाकी exam", "Other exams") : L("सारे exam", "All exams")}</h2><span>${rest.length}</span></div>${rest.map(row).join("")}
    <div class="tip">ℹ️ ${L("जिस exam के 2 या ज़्यादा पेपर हैं, उसके Mock बनते हैं। नए पेपर जुड़ने पर नए Mock अपने-आप जुड़ेंगे — पुराने वैसे ही रहेंगे।", "Mocks are made for exams with 2+ papers. New papers add new mocks — old ones stay the same.")}</div>`;
}

/* ---------- 🏆 Test Series ---------- */
function viewTS() {
  $app.innerHTML = `${pageTop("🏆 Test Series", L("PYQ पर आधारित Full Tests", "Full tests based on PYQ"))}
    <div class="card hero-soft"><b>🔒 ${L("जल्द आ रहा है", "Coming soon")}</b>
      <p>${L("हर exam की <b>Full Test Series</b> — पूरे राजस्थान की <b>असली Rank</b>, विस्तृत analysis और Explanation के साथ।", "A <b>Full Test Series</b> for every exam — with <b>All-Rajasthan rank</b>, detailed analysis and explanations.")}</p></div>
    ${["CET 12th Level", "CET Graduation", "Patwari", "Raj HC LDC"].map(t => `<div class="card mk"><div class="mk-t"><b>${t} — Test Series</b><small>${L("Full Tests • Rank • Analysis", "Full tests • Rank • Analysis")}</small>${soonTag()}</div>
      <div class="mk-b"><button class="btn-sm" data-act="notify" data-v="${esc(t)} Test Series">🔔 ${L("सूचना पाएँ", "Notify me")}</button></div></div>`).join("")}
    <div class="tip">🆓 ${L("तब तक — <b>Mock</b> टैब में हर exam के Free PYQ Mock दें।", "Meanwhile — take free PYQ mocks in the <b>Mock</b> tab.")} <button class="link" data-go="mock">Mock ›</button></div>`;
}
function notifyMe(what) {
  if (SITE.SOCIAL.telegram) { toast(L("Telegram पर सबसे पहले सूचना मिलेगी", "You'll be notified first on Telegram")); window.open(SITE.SOCIAL.telegram, "_blank", "noopener"); }
  const n = store.get("notify", []); if (!n.includes(what)) { n.push(what); store.set("notify", n); }
}

/* ---------- 🎯 Mentorship ---------- */
function viewMentor(id) {
  const M = SITE.MENTORSHIP || [];
  if (id) {
    const m = M.find(x => x.id === id); if (!m) return go("mentor");
    $app.innerHTML = `${topbar({ back: "mentor", title: esc(m.title) })}
      <div class="slide ${m.style || "s1"} static">${m.status ? `<span class="k">${esc(m.status)}</span>` : ""}<b>${esc(m.title)}</b><small>${esc(m.sub || "")}</small></div>
      ${(m.start || m.days) ? `<div class="card mt-row">${m.start ? `<span>🗓️ ${L("शुरू", "Starts")}: <b>${esc(m.start)}</b></span>` : ""}${m.days ? `<span>⏳ <b>${esc(m.days)}</b></span>` : ""}</div>` : ""}
      ${m.points && m.points.length ? `<div class="card"><h3 class="mt-h">📦 ${L("क्या मिलेगा", "What you get")}</h3><ul class="mt-ul">${m.points.map(p => `<li>✔ ${esc(p)}</li>`).join("")}</ul></div>` : ""}
      ${m.plan ? `<div class="card"><h3 class="mt-h">🗓️ ${L("प्लान", "Plan")}</h3><p>${fmt(m.plan)}</p></div>` : ""}
      ${!m.price ? `<div class="tip">ℹ️ ${L("फ़ीस, तारीख़ और पूरी जानकारी जल्द — अभी Telegram पर पूछें।", "Fees, dates and full details soon — ask on Telegram now.")}</div>` : ""}
      <div class="mt-buy">${m.price ? `<div><b>₹${esc(m.price)}</b>${m.oldPrice ? ` <s>₹${esc(m.oldPrice)}</s>` : ""}</div>` : `<div><b>${L("जल्द", "Soon")}</b></div>`}
        <a class="btn btn-orange" href="${m.join || SITE.SOCIAL.telegram}" target="_blank" rel="noopener">${m.price ? L("अभी जुड़ें", "Join now") : L("जानकारी लें", "Get details")} ›</a></div>`;
    return;
  }
  const boards = ["सभी", ...new Set(M.map(m => m.board).filter(Boolean))];
  const f = store.get("mf", "सभी");
  const list = M.filter(m => f === "सभी" || m.board === f);
  $app.innerHTML = `${pageTop("🎯 Mentorship", L("सारे प्रोग्राम", "All programmes"))}
    ${boards.length > 2 ? `<div class="mt-tabs">${boards.map(b => `<button class="${b === f ? "on" : ""}" data-act="mf" data-v="${esc(b)}">${b === "सभी" ? L("सभी", "All") : esc(b)}</button>`).join("")}</div>` : ""}
    ${list.map(m => `<button class="mp" data-go="mentor~${m.id}"><div class="mh ${m.style || "s1"}">${m.status ? `<span class="badge">${esc(m.status)}</span>` : ""}<b>${esc(m.title)}</b><small>${esc(m.sub || "")}</small></div>
      ${m.points && m.points.length ? `<div class="mb">${m.points.slice(0, 4).map(p => "✔ " + esc(p)).join(" ")}</div>` : ""}
      <div class="mf"><span class="pr">${m.price ? `₹${esc(m.price)}${m.oldPrice ? ` <s>₹${esc(m.oldPrice)}</s>` : ""}` : L("जानकारी जल्द", "Details soon")}</span><span class="btn-sm prim">${L("देखें", "View")} ›</span></div></button>`).join("")
      || `<div class="empty"><b>${L("अभी कोई प्रोग्राम नहीं", "No programme yet")}</b></div>`}
    <div class="card mp-more">🔔 ${L("नए Mentorship की सूचना — Telegram पर", "New mentorship alerts — on Telegram")} ${SITE.SOCIAL.telegram ? `<a class="link" href="${SITE.SOCIAL.telegram}" target="_blank" rel="noopener">${L("जुड़ें", "Join")} ›</a>` : ""}</div>`;
}

/* ---------- ⌨️ Skills ---------- */
function viewSkills() {
  $app.innerHTML = `${pageTop("⌨️ Skills", "Typing • Steno")}
    <div class="card big-i"><span class="di" style="background:var(--blue-wash)">⌨️</span><div><b>Typing Test</b>
      <small>${L("हिंदी (Mangal • Remington-Gail • Krutidev) • English", "Hindi (Mangal • Remington-Gail • Krutidev) • English")}<br>${L("RSSB LDC / Informatics Asst. के नियम से", "As per RSSB LDC / Informatics Asst. rules")}</small>${soonTag()}</div></div>
    <div class="card big-i"><span class="di" style="background:var(--purple-wash)">🎧</span><div><b>Steno (${L("आशुलिपि", "Shorthand")})</b>
      <small>${L("Dictation ऑडियो • 80/100 WPM • Transcription + गलतियों की जाँच", "Dictation audio • 80/100 WPM • Transcription check")}</small>${soonTag()}</div></div>
    <div class="card"><b>✅ ${L("Typing में क्या मिलेगा", "What Typing will have")}</b>
      <ul class="mt-ul"><li>• Speed (WPM) + Accuracy %</li><li>• ${L("गलत शब्द लाल रंग में", "Wrong words in red")}</li><li>• ${L("रोज़ का अभ्यास + रिकॉर्ड", "Daily practice + record")}</li><li>• ${L("असली exam जैसा समय", "Real exam timing")}</li></ul></div>
    <button class="card notify-c" data-act="notify" data-v="Typing/Steno">🔔 ${L("जल्द शुरू होगा — सूचना पाएँ", "Starting soon — get notified")} ›</button>`;
}

/* ---------- 👤 Profile ---------- */
function viewMe() {
  const s = store.get("st", { a: 0, c: 0 }), name = store.get("name", "");
  const bm = Object.keys(store.get("bm", {})).length, wr = Object.keys(store.get("wr", {})).length;
  const hist = examHistory().length;
  const li = (go, ic, t, r = "›") => `<button class="li" data-go="${go}"><i>${ic}</i>${t}<em>${r}</em></button>`;
  const so = SITE.SOCIAL;
  const socials = [["telegram", "Telegram", "#229ED9"], ["youtube", "YouTube", "#ff0000"], ["instagram", "Instagram", "#d62976"], ["whatsapp", "WhatsApp", "#25D366"]].filter(([k]) => so[k]);
  $app.innerHTML = `${pageTop("👤 Profile")}
    <div class="card prof"><div class="av">${esc([...(name || "🙂")][0].toUpperCase())}</div>
      <div class="pn"><b>${esc(name || L("नमस्ते!", "Hello!"))}</b><small>${L("लॉगिन जल्द आ रहा है", "Login coming soon")}</small></div>
      <button class="edit" data-act="me-name" aria-label="edit">✏️</button></div>
    <div class="card mychip"><div><div class="lb">🎯 ${L("मेरी परीक्षाएँ", "My exams")}</div><div class="sb-chips">${selHTML(mySel())}</div></div><button class="bd" data-act="pick-open">${L("बदलें", "Change")}</button></div>
    <div class="lh">📊 ${L("मेरी तैयारी", "My preparation")}</div>
    <div class="card stats3"><div><b>${nf(s.a)}</b><small>${L("प्रश्न किए", "Qs done")}</small></div><div><b>${s.a ? Math.round(s.c * 100 / s.a) : 0}%</b><small>${L("सही", "Correct")}</small></div><div><b>🔥 ${streak()}</b><small>${L("दिन लगातार", "day streak")}</small></div></div>
    <div class="list">${li("l~bm", "⭐", L("Bookmark किए प्रश्न", "Bookmarked questions"), `<span class="cnt">${bm}</span>`)}
      ${li("l~wr", "❌", L("गलत हुए प्रश्न — दोबारा करें", "Wrong answers — retry"), `<span class="cnt">${wr}</span>`)}
      ${li("hist", "🧾", L("Test History", "Test History"), `<span class="cnt">${hist}</span>`)}</div>
    <div class="lh">🛒 ${L("मेरी ख़रीदारी", "My purchases")}</div>
    <div class="list">${li("ts", "🏆", L("मेरी Test Series", "My Test Series"))}${li("mentor", "🎯", "Mentorship")}
      <div class="li dim"><i>💳</i>${L("Payment History • Receipt", "Payment history • Receipt")}<em>${L("जल्द", "Soon")}</em></div></div>
    <div class="lh">⚙️ Settings</div>
    <div class="list"><div class="li"><i>🌐</i>${L("भाषा", "Language")}${langToggle()}</div></div>
    <div class="lh">🤝 ${L("जुड़िए", "Connect")}</div>
    <div class="list">${socials.length ? `<div class="social">${socials.map(([k, t, c]) => `<a href="${so[k]}" target="_blank" rel="noopener" style="background:${c}">${t}</a>`).join("")}</div>` : ""}
      <button class="li" data-act="share"><i>📤</i>${L("App दोस्तों को भेजें", "Share the app")}<em>›</em></button></div>
    <div class="lh">ℹ️ GENERAL</div>
    <div class="list">${li("info~contact", "❓", L("Help / Contact", "Help / Contact"))}
      <button class="li" data-act="fb-general"><i>⚠️</i>${L("गलती / Feedback भेजें", "Send feedback")}<em>›</em></button>
      ${li("info~about", "🏫", "About Us")}${li("info~privacy", "🔒", "Privacy Policy")}${li("info~terms", "📜", "Terms & Conditions")}
      ${li("info~refund", "💸", "Refund Policy")}${li("info~disclaimer", "⚖️", "Disclaimer")}</div>
    <p class="ver">${SITE.NAME_A}${SITE.NAME_B} v${SITE.VERSION} • Made with ❤️ in India</p>`;
}
function examHistory() {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i); if (!k || !k.startsWith("ps.exam.")) continue;
    try { const S = JSON.parse(localStorage.getItem(k)); if (S && S.submitted) out.push(S); } catch { }
  }
  return out.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
}
function viewHist() {
  const H = examHistory();
  const route = S => S.kind === "topic" || S.kind === "mock" ? `x~${S.kind}~${enc(S.id)}~${S.chunk || 0}` : `x~${S.kind}~${S.id}`;
  $app.innerHTML = `${topbar({ back: "me", title: "🧾 Test History", sub: `${H.length} ${L("टेस्ट", "tests")}` })}
    ${H.map(S => { const r = S.result || {}; return `<button class="card hrow" data-go="${route(S)}"><div><b>${esc(S.title)}</b>
      <small>${new Date(S.submittedAt).toLocaleDateString(LANG === "en" ? "en-IN" : "hi-IN", { day: "numeric", month: "short", year: "numeric" })} • ✓ ${r.correct ?? "-"} ✗ ${r.wrong ?? "-"}</small></div>
      <span class="hs">${toNum(r.score ?? 0)}<small>/${toNum(r.max ?? S.n * S.pos)}</small></span></button>`; }).join("")
    || `<div class="empty"><b>${L("अभी कोई टेस्ट नहीं दिया", "No tests yet")}</b>${L("पूरा पेपर, Mock या टॉपिक टेस्ट दें।", "Take a full paper, mock or topic test.")}</div>`}`;
}

/* ---------- ℹ️ About / policies / contact ---------- */
const INFO = {
  about: ["🏫 About Us", () => `<p><b>${SITE.NAME_A}${SITE.NAME_B}</b> — ${SITE.ACADEMY} की पहल। राजस्थान की प्रतियोगी परीक्षाओं (RSSB, RPSC, Rajasthan High Court) के <b>पिछले वर्षों के प्रश्न (PYQ)</b> एक जगह — पूरा पेपर, टॉपिक-वाइज़ Practice, Test और Mock, Explanation व Topic Tadka के साथ।</p>
    <p>हमारा लक्ष्य: हर विद्यार्थी को <b>बिल्कुल Free</b> में सही और भरोसेमंद PYQ देना, ताकि तैयारी असली परीक्षा के अनुसार हो।</p>
    <p>उत्तर-कुंजी (Answer Key) संबंधित भर्ती संस्था की <b>आधिकारिक वेबसाइट</b> पर जारी अंतिम कुंजी के अनुसार रखी गई है।</p>`],
  contact: ["❓ Help / Contact", () => `<p>कोई प्रश्न, सुझाव या गलती दिखे — हमें बताइए:</p>
    <div class="list">${SITE.SOCIAL.telegram ? `<a class="li" href="${SITE.SOCIAL.telegram}" target="_blank" rel="noopener"><i>📢</i>Telegram<em>›</em></a>` : ""}
    ${SITE.SOCIAL.whatsapp ? `<a class="li" href="${SITE.SOCIAL.whatsapp}" target="_blank" rel="noopener"><i>💬</i>WhatsApp<em>›</em></a>` : ""}
    <a class="li" href="mailto:${SITE.EMAIL}"><i>✉️</i>${SITE.EMAIL}<em>›</em></a></div>
    <p class="muted">किसी प्रश्न में गलती हो तो उसी प्रश्न के नीचे <b>⚠️ रिपोर्ट</b> दबाएँ — हम उसी प्रश्न को ID से ठीक कर देंगे।</p>`],
  privacy: ["🔒 Privacy Policy", () => `<p><b>अंतिम अद्यतन:</b> 22 Oct 2026</p>
    <p>1. <b>हम क्या रखते हैं:</b> आपकी चुनी परीक्षाएँ, Practice/Test के उत्तर, Bookmark और भाषा — ये सब <b>सिर्फ़ आपके फ़ोन/ब्राउज़र</b> (localStorage) में रहते हैं, हमारे सर्वर पर नहीं।</p>
    <p>2. <b>रिपोर्ट / फ़ीडबैक:</b> जब आप किसी प्रश्न पर रिपोर्ट या फ़ीडबैक भेजते हैं, तो प्रश्न ID, कारण और आपकी लिखी टिप्पणी हमें मिलती है — इसमें आपका नाम/नंबर नहीं होता।</p>
    <p>3. <b>लॉगिन (आगे):</b> लॉगिन शुरू होने पर नाम, मोबाइल/ईमेल और प्रगति सुरक्षित रूप से सेव होगी; यह पॉलिसी तब अपडेट की जाएगी।</p>
    <p>4. <b>Cookies व विज्ञापन:</b> साइट के उपयोग के आँकड़ों (Analytics) और विज्ञापन (जैसे Google AdSense) के लिए तीसरे पक्ष की cookies उपयोग हो सकती हैं। Google आपकी रुचि के अनुसार विज्ञापन दिखाने के लिए cookies का उपयोग कर सकता है; आप Google Ads Settings में इसे बंद कर सकते हैं।</p>
    <p>5. <b>भुगतान (आगे):</b> भुगतान Razorpay जैसे सुरक्षित गेटवे से होगा — कार्ड/UPI की जानकारी हम नहीं रखते।</p>
    <p>6. हम आपकी जानकारी किसी को बेचते नहीं हैं। प्रश्न हों तो: ${SITE.EMAIL}</p>`],
  terms: ["📜 Terms & Conditions", () => `<p>1. ${SITE.NAME_A}${SITE.NAME_B} का कंटेंट केवल <b>शैक्षिक अभ्यास</b> के लिए है।</p>
    <p>2. प्रश्न सार्वजनिक परीक्षाओं के हैं; Explanation, Topic Tadka, टॉपिक-विभाजन और साइट का डिज़ाइन ${SITE.ACADEMY} का है — बिना अनुमति कॉपी/बेचना मना है।</p>
    <p>3. हम सही जानकारी देने का पूरा प्रयास करते हैं, फिर भी किसी गलती से हुए नुकसान की ज़िम्मेदारी नहीं ले सकते — गलती दिखे तो रिपोर्ट करें।</p>
    <p>4. Paid Test Series / Mentorship (जब शुरू हों) व्यक्तिगत उपयोग के लिए हैं; अकाउंट साझा करना मना है।</p>
    <p>5. साइट का दुरुपयोग करने पर पहुँच बंद की जा सकती है। ये शर्तें समय-समय पर बदल सकती हैं।</p>`],
  refund: ["💸 Refund Policy", () => `<p>1. PYQ Practice, Mock और Test — <b>बिल्कुल Free</b> हैं।</p>
    <p>2. Paid Test Series / Mentorship (जब शुरू हों): डिजिटल कंटेंट होने के कारण ख़रीदने और कंटेंट खुल जाने के बाद सामान्यतः रिफ़ंड नहीं होता।</p>
    <p>3. अगर पैसे कट गए पर कोर्स नहीं खुला, या दो बार भुगतान हो गया — 7 दिन के अंदर ${SITE.EMAIL} पर भुगतान ID के साथ लिखें; जाँच के बाद 5–7 कार्य-दिवस में पूरा पैसा लौटाया जाएगा।</p>
    <p>4. किसी कोर्स के रद्द होने पर पूरा पैसा लौटाया जाएगा।</p>`],
  disclaimer: ["⚖️ Disclaimer", () => `<p><b>${SITE.NAME_A}${SITE.NAME_B}</b> एक स्वतंत्र शैक्षिक वेबसाइट है। इसका <b>RSSB, RPSC, Rajasthan High Court या किसी भी सरकारी संस्था से कोई संबंध नहीं</b> है।</p>
    <p>प्रश्न सार्वजनिक रूप से उपलब्ध पिछली परीक्षाओं से लिए गए हैं; उत्तर संबंधित संस्था की आधिकारिक अंतिम उत्तर-कुंजी के अनुसार हैं। किसी भी आधिकारिक सूचना के लिए हमेशा संस्था की आधिकारिक वेबसाइट देखें।</p>`]
};
function viewInfo(k) {
  const it = INFO[k] || INFO.about;
  $app.innerHTML = `${topbar({ back: "me", title: it[0] })}<div class="card info-page">${it[1]()}</div>
    <div class="info-links">${Object.entries(INFO).filter(([x]) => x !== k).map(([x, v]) => `<button class="link" data-go="info~${x}">${v[0]}</button>`).join("")}</div>`;
}
function viewSoon(title, text) {
  $app.innerHTML = `${pageTop(title)}<div class="card hero-soft"><b>⏳ ${L("जल्द आ रहा है", "Coming soon")}</b><p>${text}</p></div>
    <button class="card notify-c" data-act="notify" data-v="${esc(title)}">🔔 ${L("सूचना पाएँ", "Get notified")} ›</button>`;
}

/* ---------- shell actions ---------- */
document.addEventListener("click", e => {
  const a = e.target.closest("[data-act]"); if (!a) return;
  const act = a.dataset.act, v = a.dataset.v;
  if (act === "drawer") openDrawerMenu();
  else if (act === "pick-open") openPickerModal(false);
  else if (act === "notify") notifyMe(v);
  else if (act === "mf") { store.set("mf", v); viewMentor(); }
  else if (act === "bm") { const q = findQ(v); if (q) toggleBm(q); }
  else if (act === "mock-retake") confirmBox({ title: L("इस Mock के पिछले उत्तर हटाकर दोबारा दें?", "Clear your answers and retake this mock?"), onYes: () => { store.del(`exam.mock.${v}.${a.dataset.k}`); go(`x~mock~${enc(v)}~${a.dataset.k}`); } });
  else if (act === "me-name") { const n = prompt(L("आपका नाम", "Your name"), store.get("name", "")); if (n !== null) { store.set("name", n.trim().slice(0, 40)); viewMe(); } }
  else if (act === "share") {
    const d = { title: SITE.NAME_A + SITE.NAME_B, text: L("राजस्थान के सारे PYQ — बिल्कुल Free, Explanation के साथ 👇", "All Rajasthan PYQs — free, with explanations 👇"), url: location.origin };
    if (navigator.share) navigator.share(d).catch(() => { }); else { window.open("https://wa.me/?text=" + encodeURIComponent(d.text + " " + d.url), "_blank", "noopener"); }
  }
  else if (act === "fb-general") {
    const t = prompt(L("अपना सुझाव / गलती लिखें", "Write your feedback")); if (t && t.trim()) {
      sendReport({ type: "सामान्य फ़ीडबैक", reason: "", comment: t.trim().slice(0, 800), qid: "", exam: "", qno: "", excel: "", question: "", page: "Profile", lang: LANG });
      toast(L("धन्यवाद! भेज दिया ✓", "Thanks! Sent ✓"));
    }
  }
});
