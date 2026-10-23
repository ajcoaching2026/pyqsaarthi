// =============================================
// PYQ Saarthi — SITE SETTINGS
// Naam, link ya marking badalni ho to sirf yahin badlein.
// =============================================
const SITE = {
  NAME_A: "PYQ ",           // logo ke paas pehla hissa (neela/kaala)
  NAME_B: "Saarthi",          // doosra hissa (orange)
  ACADEMY: "AJ हिंGLISH Academy",
  TAGLINE: "ज्ञान • Growth • Success",
  TELEGRAM_URL: "https://t.me/AJHinglishAcademy",

  PRACTICE_PER_PAGE: 10,

  // ---------- Banner (Home par chalne wali slides) — nayi slide jodni ho to ek {} aur jodo ----------
  // style: "s1" narangi • "s2" neela • "s3" baingani • go: site ka page (jaise "mentor~rajhc-ldc", "subjects", "b~rssb")
  BANNERS: [
    { tag: "🆕 नया बैच", icon: "🎯", style: "s1", title: "Raj HC LDC Mentorship", sub: "रोज़ का प्लान • PYQ • टेस्ट • डाउट", cta: "जुड़ें", go: "mentor~rajhc-ldc" },
    { tag: "⭐ राजस्थान में पहली बार", icon: "📚", style: "s2", title: "PYQ Based Practice", sub: "सारे PYQ — Explanation + Topic Tadka", cta: "शुरू करें", go: "b~rssb" },
    { tag: "⭐ राजस्थान में पहली बार", icon: "🧩", style: "s3", title: "Topic-wise Test — PYQ पर", sub: "हर टॉपिक के 50-50 प्रश्नों के टेस्ट", cta: "टेस्ट दें", go: "subjects" }
  ],

  // ---------- Mentorship programme — jitne chahein jodo; khaali cheez ("") nahi dikhegi ----------
  MENTORSHIP: [
    { id: "rajhc-ldc", board: "High Court", title: "Raj HC LDC Mentorship", status: "🆕 नया बैच", style: "s1",
      sub: "Rajasthan High Court LDC की पूरी तैयारी", start: "", days: "", price: "", oldPrice: "",
      points: ["Day-wise पढ़ाई का प्लान", "हर दिन PYQ + Practice प्रश्न", "हर हफ़्ते Full Test + Rank", "Short Notes", "Telegram पर डाउट"],
      plan: "", join: "https://t.me/AJHinglishAcademy" }
  ],

  // ---------- Judiye (social links) — khaali "" wala button nahi dikhega ----------
  SOCIAL: { telegram: "https://t.me/AJHinglishAcademy", youtube: "", instagram: "", whatsapp: "" },
  EMAIL: "ajcoaching2026@gmail.com",     // contact@pyqsaarthi.com chalu hone par yahan badlein
  VERSION: "1.4",
  GA_ID: "",                             // Google Analytics Measurement ID (G-XXXXXXX) — khaali = analytics band
  ADMIN_PIN: "aj2026",                   // reports page: pyqsaarthi.com/#admin~aj2026 (sirf aapke phone/laptop par ek baar kholna)


  // Topic-wise test ke niyam (Mock tests apni Excel settings se chalte hain)
  TOPIC_TEST: {
    SIZES: [10, 20, 0],     // 0 = saare prashn
    POSITIVE: 1,
    NEGATIVE: 1 / 3,
    SECONDS_PER_Q: 60,
    OPTION_E: "अनुत्तरित प्रश्न"
  },

  // ---------- Admin Google Sheet (tools/admin_apps_script.gs) ----------
  // API = Apps Script "Web app URL" • PUB = Publish-to-web link • GID = har tab ka gid (setup() ke log se)
  // Khaali rahe to reports sirf usi phone me, aur Banner/Mentorship/Links neeche config se chalenge.
  SHEET: { API: "https://script.google.com/macros/s/AKfycbwcVhU4-akAvnZA9rJhoR9wj2-aWVxLcr9zaL9D5OMuqYZnmT2DCCpRKYf0-x2IZnr7/exec", PUB: "", GID: { sudhar: "506195322", banner: "1177734879", mentorship: "1403445941", links: "408479589" } },

  // Security: live par true rakhein (copy / right-click band)
  PROTECT_CONTENT: false
};
