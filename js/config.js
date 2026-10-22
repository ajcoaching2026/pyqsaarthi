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

  // Topic-wise test ke niyam (Mock tests apni Excel settings se chalte hain)
  TOPIC_TEST: {
    SIZES: [10, 20, 0],     // 0 = saare prashn
    POSITIVE: 1,
    NEGATIVE: 1 / 3,
    SECONDS_PER_Q: 60,
    OPTION_E: "अनुत्तरित प्रश्न"
  },

  // Report / feedback kahan jaaye: Google Apps Script web-app ka URL (tools/report_apps_script.gs dekhein).
  // Khali "" rahe to demo me Claude artifact database (ya browser) me save hota hai.
  REPORT_URL: "",

  // सुधार शीट: Google Sheet → File → Share → Publish to web → (सुधार tab) → CSV → जो link मिले यहाँ डालें।
  // उस शीट में main Excel जैसी headings हों (QID_Full, Question, Option 1-4, Final_Ans, Explanation, Topic Tadka).
  // जो cell भरा होगा वही बदलेगा; खाली cell = पुराना ही रहेगा।
  SUDHAR_CSV: "",

  // Security: live par true rakhein (copy / right-click band)
  PROTECT_CONTENT: false
};
