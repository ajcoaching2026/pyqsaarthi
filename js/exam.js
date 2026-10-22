// =============================================
// PYQ Saarthi — CBT Test engine (AJ CBT Portal ka naya roop)
// Instructions → Test → Submit → Result → Review
// Timer ek fixed "deadline" se chalta hai: tab band karke wapas aane par bhi sahi samay.
// =============================================

const Exam = (() => {
  let S = null;          // current test state
  let tick = null;
  let revFilter = "all";

  const save = () => S && store.set("exam." + S.key, S);
  const fmtTime = sec => {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(s).padStart(2, "0");
  };
  const left = () => (S.deadline - Date.now()) / 1000;

  function stopTimer() { clearInterval(tick); tick = null; }

  /* ---------- open a test from the route ---------- */
  async function open(kind, id, size) {
    try { id = decodeURIComponent(id); } catch { }
    $app.innerHTML = `<div class="loading"><div class="spinner"></div>${L("टेस्ट तैयार हो रहा है…", "Preparing test…")}</div>`;
    let key = kind + "." + id;
    let base;
    const rule = `उत्तर न आए तो **E (अनुत्तरित प्रश्न)** चुनें — इसमें अंक नहीं कटेंगे।\n**10% से अधिक प्रश्न बिना किसी विकल्प के छोड़ने पर आप अयोग्य माने जाएँगे।**`;
    const ruleEn = `Choose **E** if you don't know the answer (no negative marking).\nLeaving more than **10%** questions blank means **Disqualified**.`;
    if (kind === "paper") {
      const P = await loadPaper(id);
      if (P.bad) { toast(L("यह पेपर अभी सुधार में है", "This paper is being fixed")); return go("f~" + P.famId); }
      base = {
        key, kind, id, back: "f~" + P.famId, title: paperName(id), header: `${P.fam}${P.title ? " — " + P.title : ""}`,
        pos: P.pos, neg: P.neg, optE: SITE.TOPIC_TEST.OPTION_E, minutes: P.min, pool: P.questions.map(q => ({ ...q, p: id })),
        insHi: `✍️ यह पेपर **RSSB** की परीक्षा **${P.fam}${P.title ? " (" + P.title + ")" : ""}** में **${fdate(P.date)}** को आया था।\n✍️ कुल प्रश्न = **'${P.n}'**${P.del ? ` (इनमें **${P.del} प्रश्न रद्द** — इनके अंक नहीं जुड़ेंगे)` : ""}\n✅ सही उत्तर = **'+${P.pos} अंक'**\n❌ गलत उत्तर = **'-${P.neg} अंक'**\n⌛ कुल समय = **'${P.min} मिनट'**\n${rule}\n\n**"----------------🎊 All the Best🎊----------------"**`,
        insEn: `✍️ This paper was asked in **RSSB ${P.fam}** on **${P.date.split("-").reverse().join(".")}**.\n✍️ Total Questions = **${P.n}**${P.del ? ` (${P.del} deleted — not counted)` : ""}\n✅ Correct = **+${P.pos}**, ❌ Wrong = **-${P.neg}**\n⌛ Time = **${P.min} minutes**\n${ruleEn}`
      };
    } else if (kind === "mock") {
      const m = mockList().find(x => x.id === id);
      if (!m) { toast(L("यह Mock नहीं मिला", "Mock not found")); return go("mock"); }
      const saved0 = store.get("exam." + key);
      const latest = [...m.papers].sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
      const L0 = await loadPaper(latest.id);
      let pool = [];
      if (!saved0) {
        const Ps = await Promise.all(m.papers.map(p => loadPaper(p.id)));
        const seen = new Set(), all = [];
        Ps.forEach(P => P.questions.forEach(q => { if (q.d || !q.a) return; const g = q.g || q.id; if (seen.has(g)) return; seen.add(g); all.push({ ...q, p: P.id }); }));
        for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
        pool = all.slice(0, Math.min(L0.n, all.length)).sort((a, b) => a.n - b.n);
      }
      const n = saved0 ? saved0.n : pool.length;
      const mins = Math.round(L0.min * n / L0.n);
      const nm0 = `${m.fam.name}${m.v ? " — " + m.v : ""}`;
      base = {
        key, kind, id, back: "mock", title: `${nm0} — PYQ Mock`, header: `${nm0} • PYQ Mock`,
        pos: L0.pos, neg: L0.neg, optE: SITE.TOPIC_TEST.OPTION_E, minutes: mins, size: n, pool,
        insHi: `✍️ यह **PYQ Mock** है — **${nm0}** के **${m.papers.length} असली पेपरों** से चुने गए प्रश्न (हर बार नए)।\n✍️ कुल प्रश्न = **'${n}'**\n✅ सही उत्तर = **'+${L0.pos} अंक'**\n❌ गलत उत्तर = **'-${L0.neg} अंक'**\n⌛ कुल समय = **'${mins} मिनट'**\n${rule}\n\n**"----------------🎊 All the Best🎊----------------"**`,
        insEn: `✍️ This **PYQ Mock** is built from **${m.papers.length} real papers** of **${nm0}** (new questions every time).\n✍️ Total Questions = **${n}**\n✅ Correct = **+${L0.pos}**, ❌ Wrong = **-${L0.neg}**\n⌛ Time = **${mins} minutes**\n${ruleEn}`
      };
    } else {
      const meta = topicMeta(id);
      if (!meta) return go("home");
      const d = await loadTopic(id);
      const f = activeFilter(id), sig = sigOf(f);
      const pool = testPool(d.questions, f), ch = chunks(pool.length);
      const k = Math.min(Math.max(0, size || 0), Math.max(0, ch.length - 1));
      if (!ch.length) { toast(L("इस चयन में टेस्ट के प्रश्न नहीं", "No test questions in this selection")); return go("t~" + id); }
      const st = chunkStart(ch, k), n = ch[k];
      const T = SITE.TOPIC_TEST;
      const mins = Math.ceil(n * T.SECONDS_PER_Q / 60);
      base = {
        key: `topic.${id}#${sig}.${k}`, kind, id, chunk: k, chunks: ch, sig, back: "t~" + id + "~~test",
        title: `${nm(meta)} — Test ${k + 1}/${ch.length}`, header: `${nm(meta)} • Test ${k + 1}`,
        pos: T.POSITIVE, neg: T.NEGATIVE, optE: T.OPTION_E, minutes: mins, size: n, pool: pool.slice(st, st + n),
        insHi: `✍️ विषय: **${meta.s.name} › ${meta.g.name} › ${meta.name}** (असली PYQ)\n✍️ यह **Test ${k + 1} / ${ch.length}** है — प्रश्न **Q${st + 1} से Q${st + n}** (नए साल के पहले)\n✍️ कुल प्रश्न = **${n}**\n✅ सही उत्तर = **+${T.POSITIVE} अंक**\n❌ गलत उत्तर = **−⅓ अंक**\n⌛ कुल समय = **${mins} मिनट**\n${rule}`,
        insEn: `✍️ This is **Test ${k + 1} of ${ch.length}** — questions **${st + 1} to ${st + n}**\n✍️ Total Questions = **${n}**\n✅ Correct = **+${T.POSITIVE}**, ❌ Wrong = **−1/3**\n⌛ Time = **${mins} minutes**\n${ruleEn}`
      };
      key = base.key;
    }

    const saved = store.get("exam." + key);
    if (saved && saved.submitted) { S = saved; return showResult(); }
    if (saved && !saved.submitted) {
      S = saved;
      if (left() <= 0) return submit(true);
      return showResume(base);
    }
    showInstructions(base);
  }

  function fresh(base) {
    let qs = base.pool;
    const now = Date.now();
    const { pool, insHi, insEn, ...rest } = base;
    S = {
      ...rest, qs, n: qs.length, ans: Array(qs.length).fill(0), rev: Array(qs.length).fill(false),
      cur: 0, start: now, deadline: now + base.minutes * 60000, submitted: false
    };
    save();
  }

  /* ---------- screens ---------- */
  function showResume(base) {
    const done = S.ans.filter(Boolean).length;
    $app.innerHTML = `${topbar({ back: base.back, title: base.title })}
    <div class="card ins-box" style="padding:22px 18px">
      <img src="assets/logo.webp" alt="">
      <h1 style="font-size:24px;color:var(--orange-deep)">${L("अधूरा टेस्ट मिला", "Unfinished test found")}</h1>
      <p style="color:var(--muted)">${done}/${S.n} ${L("प्रश्न हल किए हैं", "answered")} • ${fmtTime(left())} ${L("समय बचा है", "left")}</p>
      <button class="btn btn-primary" id="resume">▶ ${L("टेस्ट जारी रखें", "Resume test")}</button><br>
      <button class="btn btn-soft-orange" id="restart" style="margin-top:10px">🔄 ${L("नया टेस्ट शुरू करें", "Start a new test")}</button>
    </div>`;
    document.getElementById("resume").onclick = () => runExam();
    document.getElementById("restart").onclick = () => confirmBox({
      title: L("पुराने उत्तर हट जाएँगे। नया टेस्ट शुरू करें?", "Old answers will be cleared. Start a new test?"),
      onYes: () => { store.del("exam." + S.key); showInstructions(base); }
    });
  }

  function showInstructions(base) {
    $app.innerHTML = `${topbar({ back: base.back, title: base.title, sub: `${base.size || base.pool.length} ${L("प्रश्न", "Qs")} • ${base.minutes} ${L("मिनट", "min")}` })}
    <div class="ins-box">
      <img src="assets/logo.webp" alt="">
      <h1>Instructions</h1>
      <div class="card ins-text">
        ${LANG === "en" ? `<h3>📌 English Instructions</h3><p>${fmt(base.insEn)}</p><hr><h3>📌 हिंदी निर्देश</h3><p>${fmt(base.insHi)}</p>`
          : `<h3>📌 हिंदी निर्देश</h3><p>${fmt(base.insHi)}</p><hr><h3>📌 English Instructions</h3><p>${fmt(base.insEn)}</p>`}
      </div>
      <button class="btn btn-primary" id="begin">🚀 Start Exam</button>
    </div>`;
    document.getElementById("begin").onclick = () => { fresh(base); runExam(); };
  }

  function runExam() {
    store.set("last", { kind: "test", key: S.key, h: location.hash.slice(1), title: S.title });
    document.body.classList.add("in-test");
    renderQ();
    stopTimer();
    tick = setInterval(() => {
      const el = document.getElementById("timer");
      const l = left();
      if (el) { el.textContent = "⏱ " + fmtTime(l); el.classList.toggle("low", l < 300); }
      if (l <= 0) submit(true);
    }, 1000);
  }

  function renderQ() {
    const q = S.qs[S.cur];
    QINDEX[q.id] = q;
    const last = S.cur === S.n - 1;
    $app.innerHTML = `
    <div class="exam-header">
      <div class="logo-row"><img src="assets/logo.webp" alt="${SITE.ACADEMY}"></div>
      <div class="info-row">
        <div class="timer ${left() < 300 ? "low" : ""}" id="timer">⏱ ${fmtTime(left())}</div>
        <button class="grid-btn" id="pal" aria-label="सभी प्रश्न"><span></span><span></span><span></span><span></span></button>
      </div>
    </div>
    <div class="exam-title">✍️ ${esc(S.header)} ✍️</div>
    <div class="card q-card">
      <div class="q-top"><span class="q-badge">Q. ${S.cur + 1} / ${S.n}</span>${S.kind === "topic" && q.p ? `<span class="q-src">${esc(paperName(q.p, true))}</span>` : ""}</div>
      <div class="q-text">${fmt(q.q)}</div>
      <div class="opts" id="opts">${optionButtons(q, S.ans[S.cur], { optionE: S.optE })}</div>
      ${qFoot(q)}
    </div>
    <div class="exam-actions">
      <button class="a-prev" id="prev" ${S.cur === 0 ? "disabled" : ""}>Previous</button>
      <button class="a-review" id="mark">${S.rev[S.cur] ? "Review ★" : "Mark Review"}</button>
      <button class="a-next" id="next">${last ? "🚀 Finish" : "Next"}</button>
    </div>`;
    document.getElementById("opts").onclick = e => {
      const b = e.target.closest(".opt"); if (!b) return;
      const n = +b.dataset.opt;
      S.ans[S.cur] = S.ans[S.cur] === n ? 0 : n;   // dobara tap = chunav hatao
      save(); renderQ();
    };
    document.getElementById("prev").onclick = () => { if (S.cur > 0) { S.cur--; save(); renderQ(); } };
    document.getElementById("next").onclick = () => { if (last) askSubmit(); else { S.cur++; save(); renderQ(); window.scrollTo(0, 0); } };
    document.getElementById("mark").onclick = () => { S.rev[S.cur] = !S.rev[S.cur]; save(); renderQ(); };
    document.getElementById("pal").onclick = () => openDrawer("exam");
  }

  /* ---------- palette drawer (exam + review) ---------- */
  function openDrawer(mode, list, onPick) {
    closeDrawer();
    const mask = document.createElement("div"); mask.className = "drawer-mask";
    const d = document.createElement("aside"); d.className = "drawer"; d.setAttribute("aria-label", "प्रश्न सूची");
    const idx = list || S.qs.map((_, i) => i);
    const cls = i => {
      const a = S.ans[i], q = S.qs[i];
      if (mode === "exam") return a === 5 ? "e" : a ? "ans" : "";
      if (q.d) return "del";
      if (a === 5) return "e";
      if (!a) return "";
      return a === q.a ? "ok" : "bad";
    };
    const legend = mode === "exam"
      ? `<span><i style="background:var(--green-opt)"></i>${L("उत्तर दिया", "Answered")}</span><span><i style="background:var(--purple)"></i>${L("E चुना", "Chose E")}</span><span><i style="background:#e5e7eb"></i>खाली</span><span>★ Review</span>`
      : `<span><i style="background:#2ecc71"></i>सही</span><span><i style="background:#ff4d4d"></i>गलत</span><span><i style="background:var(--purple)"></i>E</span><span><i style="background:#e5e7eb"></i>खाली</span><span><i style="background:#f59e0b"></i>रद्द</span>`;
    d.innerHTML = `<div class="drawer-head"><button class="back" aria-label="बंद करें">←</button><b>${idx.length} ${L("प्रश्न", "Qs")}</b></div>
      <div class="legend">${legend}</div>
      <div class="pal-grid">${idx.map((qi, k) => `<button class="pal ${cls(qi)} ${mode === "exam" && qi === S.cur ? "cur" : ""}" data-k="${k}">
        ${S.rev[qi] ? `<span class="star">★</span>` : ""}${qi + 1}</button>`).join("")}</div>
      ${mode === "exam" ? `<div class="drawer-foot"><button class="btn btn-primary btn-block" id="dsub">🚀 Submit Test</button>
        <button class="reset-link" id="dleave">${L("बाहर जाएँ (टेस्ट बाद में जारी रखें)", "Leave (resume later)")}</button></div>` : ""}`;
    document.body.append(mask, d);
    requestAnimationFrame(() => { mask.classList.add("show"); d.classList.add("show"); });
    mask.onclick = closeDrawer;
    d.querySelector(".back").onclick = closeDrawer;
    d.querySelector(".pal-grid").onclick = e => {
      const b = e.target.closest(".pal"); if (!b) return;
      closeDrawer();
      if (mode === "exam") { S.cur = idx[+b.dataset.k]; save(); renderQ(); }
      else onPick(+b.dataset.k);
    };
    if (mode === "exam") {
      d.querySelector("#dsub").onclick = () => { closeDrawer(); askSubmit(); };
      d.querySelector("#dleave").onclick = () => { closeDrawer(); go(S.back); };
    }
  }
  function closeDrawer() { document.querySelectorAll(".drawer, .drawer-mask").forEach(e => e.remove()); }

  function counts() {
    const answered = S.ans.filter(a => a >= 1 && a <= 4).length;
    const e = S.ans.filter(a => a === 5).length;
    return { answered, e, blank: S.n - answered - e, marked: S.rev.filter(Boolean).length };
  }

  function askSubmit() {
    const c = counts();
    confirmBox({
      rows: [
        { k: "🕒 " + L("बचा समय", "Time left"), v: fmtTime(left()), cls: "time" },
        { k: "✓ " + L("उत्तर दिए (A–D)", "Answered (A–D)"), v: c.answered },
        { k: "◐ " + L("विकल्प E चुना", "Chose option E"), v: c.e },
        { k: "○ " + L("बिना विकल्प के", "No option"), v: c.blank },
        { k: "☆ " + L("Review मार्क", "Marked"), v: c.marked }
      ],
      title: c.blank > S.n * 0.1 ? `⚠️ ${c.blank} प्रश्न खाली हैं (10% से ज़्यादा)।<br>फिर भी Submit करें?` : "क्या आप टेस्ट Submit करना चाहते हैं?",
      yes: "Submit", no: L("वापस जाएँ", "Go back"), onYes: () => submit(false)
    });
  }

  /* ---------- result ---------- */
  function calc() {
    let correct = 0, wrong = 0;
    const del = S.qs.filter(q => q.d).length;
    S.qs.forEach((q, i) => { const a = S.ans[i]; if (!q.d && a >= 1 && a <= 4) a === q.a ? correct++ : wrong++; });
    const c = counts();
    const score = correct * S.pos - wrong * S.neg;
    const max = (S.n - del) * S.pos;
    const end = Math.min(S.submittedAt || Date.now(), S.deadline);
    return {
      correct, wrong, e: c.e, blank: c.blank, attempted: correct + wrong, del,
      score: +score.toFixed(2), max: +max.toFixed(2), plus: +(correct * S.pos).toFixed(2), minus: +(wrong * S.neg).toFixed(2),
      pct: max ? +(score * 100 / max).toFixed(2) : 0,
      accuracy: correct + wrong ? Math.round(correct * 100 / (correct + wrong)) : 0,
      disq: c.blank > S.n * 0.1, allowed: Math.floor(S.n * 0.1),
      time: fmtTime((end - S.start) / 1000)
    };
  }

  function submit(auto) {
    stopTimer(); closeDrawer();
    document.querySelectorAll(".modal-mask").forEach(m => m.remove());
    S.submitted = true; S.submittedAt = Date.now(); S.result = calc(); save();
    document.body.classList.remove("in-test");
    try { const r = S.result; trackAnswer(false, r.correct + r.wrong, r.correct); S.qs.forEach((q, i) => { const a = S.ans[i]; if (!q.d && q.a && a >= 1 && a <= 4) noteWrong(q, a === q.a); }); } catch { }
    if (S.kind === "topic") {
      const hk = `th.${S.id}#${S.sig}`, h = store.get(hk, {});
      (h[S.chunk] = h[S.chunk] || []).push({ s: S.result.score, m: S.result.max, p: S.result.pct, d: today() });
      store.set(hk, h);
    }
    if (auto) toast(L("समय समाप्त — टेस्ट अपने-आप Submit हो गया", "Time up — test submitted automatically"));
    showResult(true);
  }

  function showResult(justNow) {
    stopTimer();
    const r = S.result;
    const nextK = S.kind === "topic" && S.chunk + 1 < S.chunks.length ? S.chunk + 1 : -1;
    $app.innerHTML = `${topbar({ back: S.back, title: "Test Result", sub: esc(S.title) })}
    <div class="card" style="padding:0 14px 14px;margin-top:4px">
      <div class="res-title">Test Result</div>
      <div class="res-brand"><img src="assets/logo.webp" alt=""><div><b>${SITE.ACADEMY}</b>
        <small><span class="o">ज्ञान</span> • <span class="bl">Growth</span> • <span class="o">Success</span></small></div></div>
      ${r.disq ? `<div class="disq"><div><h4>⚠️ ${L("अयोग्यता सूचना", "Disqualification")}</h4>❌ ${L("छोड़े गए प्रश्न", "Left blank")}: <b>${r.blank}</b><br>✅ ${L("अनुमत सीमा", "Allowed")}: <b>${r.allowed}</b></div><div class="dv"></div>
        <div><h4>${L("नियम", "Rule")}</h4>${L("10% से अधिक प्रश्नों में कोई भी विकल्प अंकित न करने पर अभ्यर्थी अयोग्य माना जाएगा।", "Leaving more than 10% of questions without any option disqualifies the candidate.")}</div></div>` : ""}
      <div class="score-banner">
        <img src="assets/trophy.webp" alt="">
        <div><div class="lbl">Your Score</div>
          <div><span class="val">${toNum(r.score)}</span> <span class="of">/ ${toNum(r.max)}</span></div>
          <span class="pill">${r.pct}%</span></div>
      </div>
      ${S.kind === "paper" ? loginLock("आपकी रैंक: — • आप —% छात्रों से आगे", "Your rank: — • ahead of —% students") : ""}
      <div class="stat4">
        <div class="stat c"><div class="ic">✓</div><div class="nm">${L("सही", "Right")}</div><b>${r.correct}</b><span class="mk">+${toNum(r.plus)}</span></div>
        <div class="stat w"><div class="ic">✕</div><div class="nm">${L("गलत", "Wrong")}</div><b>${r.wrong}</b><span class="mk">−${toNum(r.minus)}</span></div>
        <div class="stat e"><div class="ic">E</div><div class="nm">${L("विकल्प E", "Option E")}</div><b>${r.e}</b><span class="mk">0</span></div>
        <div class="stat n"><div class="ic">○</div><div class="nm">${L("खाली", "Blank")}</div><b>${r.blank}</b><span class="mk">0</span></div>
      </div>
      <div class="card summary"><h4>📋 Test Summary</h4>
        <div class="sum-grid"><div><small>${L("कुल प्रश्न", "Questions")}</small><b>${S.n}</b>${r.del ? `<small style="color:#b45309">${r.del} ${L("रद्द", "deleted")}</small>` : ""}</div>
        <div><small>Accuracy</small><b>${r.accuracy}%</b></div>
        <div><small>${L("लगा समय", "Time taken")}</small><b>${r.time}</b></div></div></div>
      <div class="res-btns">
        ${nextK > -1 ? `<button class="btn btn-orange" data-go="x~topic~${S.id}~${nextK}">▶ ${L("अगला टेस्ट", "Next test")}: Test ${nextK + 1} (Q${chunkStart(S.chunks, nextK) + 1}–${chunkStart(S.chunks, nextK) + S.chunks[nextK]})</button>` : ""}
        <button class="btn btn-primary" id="rev">📖 Review Answers</button>
        <button class="btn btn-soft-orange" id="again">🔄 ${L("दोबारा टेस्ट दें", "Retake test")}</button>
        ${S.kind === "topic" ? `<button class="btn btn-outline" data-go="t~${S.id}~~test">🗂 ${L("सारे टेस्ट देखें", "All tests of this topic")}</button><button class="btn btn-outline" data-go="p~${S.id}~0">📘 ${L("इस टॉपिक की Practice करें", "Practise this topic")}</button>` : `<button class="btn btn-outline" data-go="r~${S.id}~1">📘 ${L("यह पेपर पढ़ें (उत्तर + Explanation)", "Read this paper (answers + explanation)")}</button>`}
        <a class="btn btn-orange" href="${SITE.TELEGRAM_URL}" target="_blank" rel="noopener">📚 ${L("और टेस्ट के लिए Telegram जॉइन करें", "Join Telegram for more tests")}</a>
      </div>
    </div>`;
    document.getElementById("rev").onclick = () => { revFilter = "all"; showReview(0); };
    document.getElementById("again").onclick = () => confirmBox({
      title: L("यह रिज़ल्ट हटाकर टेस्ट दोबारा दें?", "Clear this result and retake?"),
      onYes: () => { store.del("exam." + S.key); open(S.kind, S.id, S.kind === "topic" ? S.chunk : 0); }
    });
    if (justNow && S.kind === "topic") setTimeout(() => {
      if (nextK > -1) confirmBox({
        title: `✅ Test ${S.chunk + 1} ${L("पूरा", "done")} — ${toNum(r.score)}/${toNum(r.max)}<br><br>${L("अगला टेस्ट शुरू करें?", "Start the next test?")} <b>Test ${nextK + 1}</b> (Q${chunkStart(S.chunks, nextK) + 1}–${chunkStart(S.chunks, nextK) + S.chunks[nextK]})`,
        yes: L("अगला टेस्ट ▶", "Next test ▶"), no: L("बाद में", "Later"), onYes: () => go(`x~topic~${S.id}~${nextK}`)
      });
      else {
        const h = store.get(`th.${S.id}#${S.sig}`, {});
        const all = S.chunks.every((_, k) => h[k] && h[k].length);
        let t = 0, m = 0; if (all) S.chunks.forEach((_, k) => { const x = h[k][h[k].length - 1]; t += x.s; m += x.m; });
        confirmBox({
          title: all ? `🎉 ${L("इस टॉपिक के सारे टेस्ट पूरे!", "All tests of this topic done!")}<br><br>${L("कुल अंक", "Total")}: <b>${toNum(+t.toFixed(2))}/${toNum(+m.toFixed(2))}</b> (${m ? (t * 100 / m).toFixed(1) : 0}%)<br><small>🔒 ${L("टॉप X% पोज़िशन — लॉगिन के बाद", "Top X% position — after login")}</small>`
            : `✅ ${L("यह आख़िरी टेस्ट था। बाकी टेस्ट भी दें ताकि कुल अंक दिखें।", "That was the last test. Finish the others to see your total.")}`,
          yes: L("सारे टेस्ट देखें", "See all tests"), no: L("ठीक है", "OK"), onYes: () => go(`t~${S.id}~~test`)
        });
      }
    }, 400);
  }

  /* ---------- review ---------- */
  const FILTERS = [["all", "All"], ["correct", "Correct"], ["wrong", "Wrong"], ["review", "Review ★"], ["optionE", "Option E"], ["blank", "Unattempted"], ["del", "Deleted"]];
  function filtered() {
    return S.qs.map((q, i) => i).filter(i => {
      const a = S.ans[i], q = S.qs[i];
      switch (revFilter) {
        case "correct": return !q.d && a >= 1 && a <= 4 && a === q.a;
        case "wrong": return !q.d && a >= 1 && a <= 4 && a !== q.a;
        case "del": return !!q.d;
        case "review": return S.rev[i];
        case "optionE": return a === 5;
        case "blank": return !a;
        default: return true;
      }
    });
  }
  function showReview(k) {
    const list = filtered();
    const chips = `<div class="chips">${FILTERS.map(([f, l]) => `<button class="chip ${f === revFilter ? "on" : ""}" data-f="${f}">${l}</button>`).join("")}</div>`;
    if (!list.length) {
      $app.innerHTML = `${topbar({ back: S.back, title: "Review Answers" })}${chips}<div class="empty"><b>${L("इस फ़िल्टर में कोई प्रश्न नहीं", "No questions in this filter")}</b>दूसरा फ़िल्टर चुनें।</div>
        <div class="rev-nav" style="grid-template-columns:1fr"><button class="rn-exit" id="exit">🚪 ${L("रिज़ल्ट पर जाएँ", "Back to result")}</button></div>`;
    } else {
      k = Math.min(Math.max(0, k), list.length - 1);
      const i = list[k], q = S.qs[i];
      QINDEX[q.id] = q;
      $app.innerHTML = `${topbar({
        back: S.back, title: "Review Answers", sub: `Question ${k + 1} / ${list.length}`,
        right: `<button class="grid-btn" id="pal" aria-label="प्रश्न सूची"><span></span><span></span><span></span><span></span></button>`
      })}
      ${chips}
      <div class="card q-card">
        <div class="q-top"><span class="q-badge">Q. ${i + 1}</span>${qTags(S.kind === "topic" ? q : { ...q, p: null })}${S.rev[i] ? `<span class="q-src" style="background:var(--amber-wash);color:var(--amber-ink)">★ Review</span>` : ""}</div>
        <div class="q-text">${fmt(q.q)}</div>
        <div class="opts">${optionButtons(q, S.ans[i], { optionE: S.optE, reveal: true, disabled: true })}</div>
        ${!S.ans[i] ? `<div class="verdict" style="color:var(--muted)">○ ${L("यह प्रश्न खाली छोड़ा गया", "You left this blank")}</div>` : ""}
        ${explainBlock(q)}
        ${qFoot(q)}
      </div>
      <div class="rev-nav">
        <button class="rn-prev" id="pv" ${k === 0 ? "disabled style='opacity:.5'" : ""}>⬅ Previous</button>
        <button class="rn-exit" id="exit">🚪 Exit</button>
        <button class="rn-next" id="nx" ${k === list.length - 1 ? "disabled style='opacity:.5'" : ""}>Next ➡</button>
      </div>`;
      document.getElementById("pv").onclick = () => { showReview(k - 1); window.scrollTo(0, 0); };
      document.getElementById("nx").onclick = () => { showReview(k + 1); window.scrollTo(0, 0); };
      document.getElementById("pal").onclick = () => openDrawer("review", list, kk => { showReview(kk); window.scrollTo(0, 0); });
    }
    document.getElementById("exit").onclick = () => { showResult(); window.scrollTo(0, 0); };
    $app.querySelector(".chips").onclick = e => {
      const c = e.target.closest(".chip"); if (!c) return;
      revFilter = c.dataset.f; showReview(0);
    };
    $app.querySelector(".chip.on")?.scrollIntoView({ inline: "center", block: "nearest" });
  }

  return { open, stopTimer, tadkaFor: id => S && S.qs.find(q => q.id === id)?.t, qFor: id => S && S.qs.find(q => q.id === id) };
})();
