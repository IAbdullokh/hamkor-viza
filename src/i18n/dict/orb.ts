import type { Dict } from '@/i18n'

/** Nova's orb and voice view (features/orb, features/voice/VoiceView): Diktovka ↔ Jonli suhbat. */
export default {
  "Ovoz rejimi": ["Режим голоса", "Voice mode"],
  "Diktovka": ["Диктовка", "Dictation"],
  "Tugatish": ["Завершить", "End"],
  "Ulanmoqda…": ["Подключаюсь…", "Connecting…"],
  "O'ylayapman…": ["Думаю…", "Thinking…"],
  "Gapiryapman — gapirsangiz to'xtayman": ["Говорю — заговорите, и я остановлюсь", "Speaking — talk and I'll stop"],
  "Gapiring — eshitaman": ["Говорите — я слушаю", "Go ahead — I'm listening"],
  "Boshlash uchun sharni bosing": ["Нажмите на шар, чтобы начать", "Tap the orb to start"],
  "Gapirish uchun sharni bosing": ["Нажмите на шар и говорите", "Tap the orb to speak"],
  "Jonli suhbatni boshlash": ["Начать живой разговор", "Start live conversation"],
  "Mikrofon o'chiq": ["Микрофон выключен", "Microphone is off"],
  "Mikrofonni yoqish": ["Включить микрофон", "Turn the microphone on"],
  "Mikrofonni o'chirish": ["Выключить микрофон", "Turn the microphone off"],
  "Roziman": ["Согласен", "I agree"],
  "Jonli suhbat o'chirilgan": ["Живой разговор отключён", "Live conversation is turned off"],
  "Diktovkadan foydalaning": ["Используйте диктовку", "Use dictation"],
  "Avval ovoz haqidagi ogohlantirishni tasdiqlang": ["Сначала подтвердите уведомление о голосе", "First accept the voice notice"],
  '"Roziman" tugmasini bosing va qayta urining': ["Нажмите «Согласен» и попробуйте снова", "Press \"I agree\" and try again"],
  "Siz": ["Вы", "You"],
  "Javob olib bo'lmadi — yana bir bor ayting": ["Не удалось получить ответ — скажите ещё раз", "Couldn't get an answer — say it again"],
  "Jonli suhbat siz uchun o'chirilgan — Diktovkadan foydalaning": [
    "Живой разговор для вас отключён — используйте диктовку",
    "Live conversation is turned off for you — use dictation",
  ],
  "Jonli suhbatda mikrofon ochiq turadi va ovozingiz Google Gemini'ga uzatiladi; javoblarni Claude tayyorlaydi; matn Nova tarixida saqlanadi, audio saqlanmaydi.": [
    "В живом разговоре микрофон остаётся включённым, и ваш голос передаётся в Google Gemini; ответы готовит Claude; текст сохраняется в истории Nova, аудио не сохраняется.",
    "In a live conversation the microphone stays on and your voice is sent to Google Gemini; Claude prepares the answers; the text is kept in Nova's history, the audio is not stored.",
  ],
} satisfies Dict
