import type { Dict } from '@/i18n'

/** Nova's voice (features/voice): the composer mic, "Tinglash" and the Gemini key card on Sozlamalar → AI ulanish. */
export default {
  // mic + listen (client-facing: no provider names)
  "Tayyorlanmoqda…": ["Готовлю…", "Preparing…"],
  "Tinglash": ["Прослушать", "Listen"],
  "To'xtatish va yuborish": ["Остановить и отправить", "Stop and send"],
  "bekor qilish": ["отмена", "cancel"],
  "Hech narsa eshitilmadi": ["Ничего не слышно", "Nothing was heard"],
  "Mikrofonga ruxsat berilmagan — brauzer sozlamalarida yoqing": [
    "Нет доступа к микрофону — разрешите его в настройках браузера",
    "Microphone access is blocked — allow it in the browser settings",
  ],
  "Mikrofon topilmadi": ["Микрофон не найден", "No microphone found"],
  "Bu brauzer o'zbekcha nutqni tanimaydi — Chrome yoki Edge'dan foydalaning": [
    "Этот браузер не распознаёт узбекскую речь — используйте Chrome или Edge",
    "This browser can't recognise Uzbek speech — use Chrome or Edge",
  ],
  "Ovozli aloqa uzildi — qayta urinib ko'ring": ["Голосовое соединение прервалось — попробуйте ещё раз", "The voice connection dropped — try again"],
  "Ovoz xizmati kaliti ishlamayapti — Sozlamalar → AI ulanish'da tekshiring": [
    "Ключ голосовой службы не работает — проверьте в Настройки → Подключение ИИ",
    "The voice service key isn't working — check it in Settings → AI connection",
  ],
  "Ovoz xizmati ulanmagan — Sozlamalar → AI ulanish'da ulang": [
    "Голосовая служба не подключена — подключите в Настройки → Подключение ИИ",
    "The voice service isn't connected — connect it in Settings → AI connection",
  ],
  "Ovoz xizmati hozir javob bermayapti — birozdan keyin urinib ko'ring": [
    "Голосовая служба сейчас не отвечает — попробуйте чуть позже",
    "The voice service isn't responding — try again shortly",
  ],
  "Ovozli savolni boshlab bo'lmadi": ["Не удалось начать голосовой вопрос", "Couldn't start the voice question"],
  "Ovozingiz faqat matnga aylantirish uchun Google'ga yuboriladi. Javobni Nova beradi.": [
    "Ваш голос отправляется в Google только для перевода в текст. Отвечает Nova.",
    "Your voice is sent to Google only to turn it into text. Nova gives the answer.",
  ],
  "Brauzer ovozni ijro etishga ruxsat bermadi — yana bir marta bosing": [
    "Браузер не разрешил воспроизвести звук — нажмите ещё раз",
    "The browser blocked playback — tap once more",
  ],
  "Javobni ovoz chiqarib o'qib bo'lmadi": ["Не удалось прочитать ответ вслух", "Couldn't read the answer aloud"],

  // Gemini key card (technical settings page)
  "Nova ovozi — Gemini": ["Голос Nova — Gemini", "Nova's voice — Gemini"],
  "Google AI Studio kalitingizdan to'lanadi": ["Оплачивается с вашего ключа Google AI Studio", "Billed to your Google AI Studio key"],
  "Gemini bu yerda faqat quloq va til: aytganingizni so'zma-so'z yozib beradi va javobni ovoz chiqarib o'qiydi. Savollarga har doim Nova (Claude) javob beradi — Gemini hech narsani o'zgartirmaydi, qisqartirmaydi va tarjima qilmaydi.": [
    "Gemini здесь — только уши и голос: дословно записывает сказанное и читает ответ вслух. На вопросы всегда отвечает Nova (Claude) — Gemini ничего не меняет, не сокращает и не переводит.",
    "Gemini is only the ears and the voice here: it writes down exactly what you said and reads the answer aloud. Nova (Claude) always answers — Gemini changes, shortens and translates nothing.",
  ],
  "Ovozli javob": ["Ответ голосом", "Spoken answer"],
  "Gemini — aniq yozib olish (o'zbek, rus, ingliz)": ["Gemini — дословная запись (узбекский, русский, английский)", "Gemini — exact transcription (Uzbek, Russian, English)"],
  "Brauzer — faqat Chrome va Edge": ["Браузер — только Chrome и Edge", "Browser — Chrome and Edge only"],
  "Gemini — «Tinglash» tugmasi": ["Gemini — кнопка «Прослушать»", "Gemini — the “Listen” button"],
  "O'chiq — kalit kerak": ["Выключено — нужен ключ", "Off — needs a key"],
  "Ovoz faqat matnga aylantirish uchun Google'ga yuboriladi; kalit faqat shu serverda shifrlangan holda saqlanadi.": [
    "Голос отправляется в Google только для перевода в текст; ключ хранится зашифрованным только на этом сервере.",
    "Audio goes to Google only to be turned into text; the key is stored encrypted on this server only.",
  ],
  "Oxirgi tekshiruv": ["Последняя проверка", "Last check"],
  "Gemini API kaliti": ["API-ключ Gemini", "Gemini API key"],
  "Bu Gemini kalitiga o'xshamaydi — u «AIza» bilan boshlanadi": [
    "Это не похоже на ключ Gemini — он начинается с «AIza»",
    "This doesn't look like a Gemini key — it starts with “AIza”",
  ],
  "Bu Gemini kalitiga o'xshamaydi — aistudio.google.com/apikey'dan to'liq nusxalang": [
    "Это не похоже на ключ Gemini — скопируйте его целиком с aistudio.google.com/apikey",
    "This doesn't look like a Gemini key — copy it in full from aistudio.google.com/apikey",
  ],
  "Google kalitni qabul qilmadi — yangi kalit yarating yoki to'liq nusxalang": [
    "Google не принял ключ — создайте новый или скопируйте целиком",
    "Google rejected the key — create a new one or copy it in full",
  ],
  "Gemini limiti tugadi — Google AI Studio hisobingizni tekshiring": [
    "Лимит Gemini исчерпан — проверьте аккаунт Google AI Studio",
    "The Gemini limit is reached — check your Google AI Studio account",
  ],
  "Google bilan bog'lanib bo'lmadi — birozdan keyin qayta urinib ko'ring": [
    "Не удалось связаться с Google — попробуйте чуть позже",
    "Couldn't reach Google — try again shortly",
  ],
  "Google javob bermadi — birozdan keyin qayta urinib ko'ring": ["Google не ответил — попробуйте чуть позже", "Google didn't answer — try again shortly"],
  "Serverda ovoz xizmati hali yoqilmagan": ["На сервере голосовая служба ещё не включена", "The voice service isn't enabled on the server yet"],
  "Gemini kalitini o'chirasizmi?": ["Удалить ключ Gemini?", "Remove the Gemini key?"],
  "Kalit serverdan o'chiriladi. Ovozli savol faqat Chrome va Edge'da ishlaydi, «Tinglash» o'chadi.": [
    "Ключ будет удалён с сервера. Голосовой вопрос будет работать только в Chrome и Edge, «Прослушать» выключится.",
    "The key is removed from the server. Voice questions will work only in Chrome and Edge, and “Listen” turns off.",
  ],
  // voice limits (projects/labels.ts voiceLimit), the notice, the mic badge on a spoken question
  "Juda ko'p ovozli savol — bir daqiqadan keyin qayta urinib ko'ring": [
    "Слишком много голосовых вопросов — попробуйте снова через минуту",
    "Too many voice questions — try again in a minute",
  ],
  "Hozircha savolni yozib yuborishingiz mumkin": ["Пока можно написать вопрос текстом", "Meanwhile you can type the question"],
  "Bugungi ovozli suhbat limiti tugadi": ["Дневной лимит голосовых разговоров исчерпан", "Today's voice conversation limit is used up"],
  "Ertaga qayta urinib ko'ring — hozircha savolni yozib yuboring": [
    "Попробуйте снова завтра — а пока напишите вопрос текстом",
    "Try again tomorrow — for now, type your question",
  ],
  "Tasdiqlab bo'lmadi — qayta urinib ko'ring": ["Не удалось подтвердить — попробуйте ещё раз", "Couldn't confirm — please try again"],
  "Jonli suhbatda aytildi": ["Сказано в живом разговоре", "Said in a live conversation"],
  "Ovoz bilan aytildi": ["Сказано голосом", "Spoken"],
} satisfies Dict
