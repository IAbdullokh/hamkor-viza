import type { Dict } from '@/i18n'

/** Nova: the app-wide assistant panel, its status pill, tiers, the "seen" chip and the AI settings page additions. */
export default {
  // panel
  "Nova'dan so'rash": ["Спросить Nova", "Ask Nova"],
  "Tinglayapman — gapiring…": ["Слушаю — говорите…", "Listening — go ahead…"],
  "Tinglayapman…": ["Слушаю…", "Listening…"],
  "Shu sahifani ko'radi — yozing yoki gapiring": ["Видит эту страницу — пишите или говорите", "Sees this page — type or speak"],
  "Nova menyusi": ["Меню Nova", "Nova menu"],
  "«Hey Nova» bilan chaqirish": ["Вызов фразой «Hey Nova»", "Wake with “Hey Nova”"],
  "Yoqilgan": ["Включено", "On"],
  "AI sozlamalari": ["Настройки ИИ", "AI settings"],
  "Salom! Men Nova, Data365 Studio'ning AI yordamchisiman. Bu loyiha haqida so'rang — bosqichlar, lidlar, nima qolgani.": [
    "Здравствуйте! Я Nova, ИИ-помощник Data365 Studio. Спрашивайте об этом проекте — шаги, лиды, что осталось.",
    "Hi! I'm Nova, Data365 Studio's AI assistant. Ask about this project — the steps, the leads, what's left.",
  ],
  "Salom! Men Nova, Data365 Studio'ning AI yordamchisiman. Shu dashbord raqamlari haqida so'rang — tushuntirib beraman.": [
    "Здравствуйте! Я Nova, ИИ-помощник Data365 Studio. Спрашивайте о цифрах этого дашборда — объясню.",
    "Hi! I'm Nova, Data365 Studio's AI assistant. Ask about this dashboard's numbers — I'll explain them.",
  ],
  "Salom! Men Nova, Data365 Studio'ning AI yordamchisiman. Loyihalaringiz, dashbordlar yoki sozlash haqida so'rang.": [
    "Здравствуйте! Я Nova, ИИ-помощник Data365 Studio. Спрашивайте о проектах, дашбордах или настройке.",
    "Hi! I'm Nova, Data365 Studio's AI assistant. Ask about your projects, dashboards or setup.",
  ],
  "Nova aniqroq javob tayyorlayapti…": ["Nova готовит более точный ответ…", "Nova is preparing a more precise answer…"],
  "Nova hali o'ylayapti — chuqur savollar biroz ko'proq vaqt oladi…": [
    "Nova ещё думает — глубокие вопросы занимают чуть больше времени…",
    "Nova is still thinking — deep questions take a little longer…",
  ],
  "Nova chuqur o'ylayapti…": ["Nova думает глубоко…", "Nova is thinking deeply…"],
  "Nova o'ylayapti…": ["Nova думает…", "Nova is thinking…"],
  "Ovozli savol": ["Голосовой вопрос", "Voice question"],
  "Chuqurroq javob": ["Ответ глубже", "Deeper answer"],
  "Nova ko'rdi:": ["Nova увидела:", "Nova saw:"],
  "Ichki yordamchi — model ishlatilmadi": ["Встроенный помощник — модель не использовалась", "Built-in helper — no model used"],

  // the "seen" chip
  "Sahifa manzili": ["Адрес страницы", "Page address"],
  "{n} ta variant": ["вариантов: {n}", "{n} options"],
  "{n} ta maydon": ["полей: {n}", "{n} fields"],
  "{n} ta raqam": ["цифр: {n}", "{n} numbers"],
  "{n} ta tugma": ["кнопок: {n}", "{n} buttons"],
  "ochiq oyna": ["открытое окно", "open dialog"],
  "{n} ta xabar": ["сообщений: {n}", "{n} messages"],

  // status (pill, panel banner)
  "Nova limitga yetdi — {time} dan keyin yana to'liq javob beradi": [
    "Nova достигла лимита — полные ответы снова после {time}",
    "Nova hit the limit — full answers again after {time}",
  ],
  "Nova limitga yetdi — hozircha tezkor javoblar ishlaydi": [
    "Nova достигла лимита — пока работают быстрые ответы",
    "Nova hit the limit — quick answers still work for now",
  ],
  "Nova tayyor — savollaringizga javob beradi": ["Nova готова — ответит на ваши вопросы", "Nova is ready to answer your questions"],
  "Nova bepul rejimda — oddiy savollarga tayyor javoblar beradi": [
    "Nova в бесплатном режиме — даёт готовые ответы на простые вопросы",
    "Nova is in free mode — ready answers to simple questions",
  ],
  "Nova bepul rejimda — oddiy savollarga javob beradi": [
    "Nova в бесплатном режиме — отвечает на простые вопросы",
    "Nova is in free mode — answers simple questions",
  ],

  // neutral error texts (projects/labels.ts errorText)
  "Nova limitga yetdi": ["Nova достигла лимита", "Nova hit the limit"],
  "{time} dan keyin yana to'liq javob beradi — hozircha tezkor javoblar ishlaydi": [
    "Полные ответы снова после {time} — пока работают быстрые ответы",
    "Full answers again after {time} — quick answers work for now",
  ],
  "Birozdan keyin qayta so'rang — hozircha tezkor javoblar ishlaydi": [
    "Спросите снова чуть позже — пока работают быстрые ответы",
    "Ask again a bit later — quick answers work for now",
  ],
  "Nova hozir javob bera olmaydi": ["Nova сейчас не может ответить", "Nova can't answer right now"],
  "Administrator Sozlamalar → AI ulanish bo'limini tekshirsin": [
    "Администратору стоит проверить Настройки → Подключение ИИ",
    "An administrator should check Settings → AI connection",
  ],
  "Ovoz kaliti (Gemini) qabul qilinmadi": ["Голосовой ключ (Gemini) не принят", "The voice key (Gemini) was rejected"],
  "Kalitni Google AI Studio'dan to'liq nusxalab qayta qo'ying": [
    "Скопируйте ключ из Google AI Studio целиком и вставьте снова",
    "Copy the whole key from Google AI Studio and paste it again",
  ],
  "Ovoz hali sozlanmagan": ["Голос ещё не настроен", "Voice isn't set up yet"],
  "Administrator Sozlamalar → AI ulanish bo'limida ovoz kalitini qo'shsin": [
    "Администратору стоит добавить голосовой ключ в Настройки → Подключение ИИ",
    "An administrator should add the voice key in Settings → AI connection",
  ],

  // model tiers (badge words and what each tier is for; the settings page strings live in ai.ts)
  "Tez": ["Быстро", "Quick"],
  "Oddiy": ["Обычно", "Standard"],
  "Chuqur": ["Глубоко", "Deep"],
  "Ma'lumotdan aniq javoblar (soni, reyting, manba) — model ishlatilmaydi": [
    "Точные ответы из данных (количество, рейтинг, источник) — без модели",
    "Exact answers from the data (counts, rankings, sources) — no model",
  ],
  "Salom, qisqa savollar va sahifa haqida tushuntirish": ["Приветствия, короткие вопросы и пояснения по странице", "Greetings, short questions and explaining the page"],
  "Raqamlarni tahlil qilish va tushuntirish": ["Анализ и объяснение цифр", "Analysing and explaining numbers"],
  "Solishtirish, murakkab savollar va «Chuqurroq javob»": ["Сравнения, сложные вопросы и «Ответ глубже»", "Comparisons, complex questions and “Deeper answer”"],
  // thinking modes (⚡ Tez · ◐ O'rta · ✦ Chuqur · Avto) and the new tiers
  "Yengil": ["Лёгкий", "Light"],
  "Kuchli": ["Сильный", "Strong"],
  "O'rta": ["Средний", "Medium"],
  "Fikrlash rejimi": ["Режим размышления", "Thinking mode"],
  "Fikrlash rejimlari (yozish oynasi ustida)": ["Режимы размышления (над полем ввода)", "Thinking modes (above the message box)"],
  "Sonnet 5.5 — tez javob": ["Sonnet 5.5 — быстрый ответ", "Sonnet 5.5 — quick answer"],
  "Opus 5.5 — o'rtacha fikrlash": ["Opus 5.5 — средняя глубина", "Opus 5.5 — medium thinking"],
  "Opus 5.5 yuqori — chuqur fikrlash": ["Opus 5.5 высокий — глубокое размышление", "Opus 5.5 high — deep thinking"],
  "Nova har savolga o'zi tanlaydi": ["Nova выбирает сама для каждого вопроса", "Nova picks for each question"],
  "Nima uchun, maslahat, solishtirish va raqamlar tahlili": ["Почему, советы, сравнения и анализ цифр", "Why-questions, advice, comparisons and number analysis"],
  "Jonli suhbat": ["Живой разговор", "Live conversation"],
  "Nova eshitdi": ["Nova услышала", "Nova heard you"],
} satisfies Dict
