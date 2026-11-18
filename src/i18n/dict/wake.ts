import type { Dict } from '@/i18n'

/** "Hey Nova" wake word: the toggle, the top-bar indicator and their status lines (features/wake). */
export default {
  "Hey Nova": ["Hey Nova", "Hey Nova"],
  "«Hey Nova» deb chaqirish": ["Вызывать фразой «Hey Nova»", "Wake with “Hey Nova”"],
  "Kompyuteringizda tinglanadi — ovoz faqat «Hey Nova» dan keyin yuboriladi": [
    "Слушает на вашем компьютере — звук отправляется только после «Hey Nova»",
    "Listens on your computer — audio is sent only after “Hey Nova”",
  ],
  "Birinchi marta ~{mb} MB ovoz modeli yuklanadi, keyin brauzerda saqlanadi.": [
    "В первый раз загружается голосовая модель ~{mb} МБ, дальше она хранится в браузере.",
    "The first time, a ~{mb} MB voice model downloads; after that it stays in the browser.",
  ],
  "«Hey Nova» deng, signaldan keyin savolingizni ayting.": [
    "Скажите «Hey Nova» и после сигнала задайте вопрос.",
    "Say “Hey Nova”, then ask your question after the chime.",
  ],
  "Ovoz bilan chaqirish": ["Вызов голосом", "Wake by voice"],
  "Qo'lingiz band bo'lsa — «Hey Nova» deng": ["Если руки заняты — скажите «Hey Nova»", "Hands busy? Just say “Hey Nova”"],
  // status lines
  "O'chiq": ["Выключено", "Off"],
  "«Hey Nova» kutilmoqda": ["Ждёт «Hey Nova»", "Waiting for “Hey Nova”"],
  "Pauza — Nova tinglayapti yoki gapiryapti": ["Пауза — Nova слушает или говорит", "Paused — Nova is listening or speaking"],
  "Mikrofon yoqilmoqda…": ["Включается микрофон…", "Turning on the microphone…"],
  "Ovoz modeli yuklanmoqda…": ["Загружается голосовая модель…", "Loading the voice model…"],
  "Boshqa Studio oynasida tinglanmoqda": ["Слушает другая вкладка Studio", "Another Studio tab is listening"],
  "Tinglashni boshlash uchun sahifani bir marta bosing": [
    "Нажмите на страницу один раз, чтобы начать слушать",
    "Click the page once to start listening",
  ],
  "Mikrofonga ruxsat berilmagan — brauzer sozlamalarida ruxsat bering": [
    "Нет доступа к микрофону — разрешите его в настройках браузера",
    "Microphone access is blocked — allow it in the browser settings",
  ],
  "Mikrofon topilmadi": ["Микрофон не найден", "No microphone found"],
  "Ovoz modelini yuklab bo'lmadi": ["Не удалось загрузить голосовую модель", "Couldn't load the voice model"],
  "Mikrofon ovozini o'qib bo'lmadi": ["Не удалось получить звук с микрофона", "Couldn't read the microphone audio"],
  "Bu brauzerda ishlamaydi": ["Не работает в этом браузере", "Doesn't work in this browser"],
  "Faqat https manzilda ishlaydi": ["Работает только по https", "Works only over https"],
  "Ishga tushmoqda…": ["Запускается…", "Starting…"],
  // the browser wake word is the extra way now (Siri is recommended), and it rests to save the battery
  "Brauzer mikrofoni doim ochiq turadi — Siri orqali chaqirish tavsiya etiladi": [
    "Микрофон браузера всё время включён — рекомендуем вызывать через Siri",
    "The browser keeps the microphone on all the time — calling through Siri is recommended",
  ],
  "Batareya kam — mikrofon o'chirildi, quvvatga ulasangiz davom etadi": [
    "Батарея садится — микрофон выключен, продолжит при зарядке",
    "Battery low — microphone off; it resumes when charging",
  ],
  "Oyna uzoq yopiq turdi — mikrofon o'chirildi, qaytsangiz davom etadi": [
    "Вкладка долго была скрыта — микрофон выключен, продолжит, когда вернётесь",
    "The tab was hidden for a long time — microphone off; it resumes when you come back",
  ],
  "Brauzerda «Hey Nova»": ["«Hey Nova» в браузере", "“Hey Nova” in the browser"],
  "Qo'shimcha usul — mikrofon doim ochiq turadi": ["Дополнительный способ — микрофон всё время включён", "Extra way — the microphone stays on"],
} satisfies Dict
