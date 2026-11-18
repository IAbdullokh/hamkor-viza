import type { Dict } from '@/i18n'

/** "✨ AI tavsiyasi" for one block in the zoomed editor (features/blockedit/BlockAiTips): Opus 5.5 suggests changes to that block. */
export default {
  'Shu blok uchun tavsiya': ['Совет для этого блока', 'Suggest for this block'],
  "Opus shu blokning ma'lumotiga qarab 3–5 ta aniq o'zgarish taklif qiladi. Shaxsiy ma'lumot yuborilmaydi.": [
    'Opus предложит 3–5 конкретных изменений по данным этого блока. Личные данные не отправляются.',
    "Opus suggests 3–5 concrete changes from this block's data. No personal data is sent.",
  ],
  "Opus o'ylamoqda…": ['Opus думает…', 'Opus is thinking…'],
  "Opus shu blokni o'rganmoqda — odatda 20–60 soniya": ['Opus изучает блок — обычно 20–60 секунд', 'Opus is studying this block — usually 20–60 seconds'],
  "Tavsiya kelmadi — qayta urinib ko'ring.": ['Рекомендации не пришли — попробуйте ещё раз.', 'No suggestions came back — please try again.'],
  "AI tavsiyasi qo'llandi — saqlandi": ['Совет ИИ применён — сохранено', 'AI suggestion applied — saved'],
  'Bu tavsiya blokda allaqachon bor': ['Это уже есть в блоке', 'The block already looks like this'],
  "Qo'llandi": ['Применено', 'Applied'],
  "Hammasini qo'llash": ['Применить все', 'Apply all'],
  'Keyingi bosqichda': ['На следующем этапе', 'Next step'],
  'Sinov rejimi: javoblar modelsiz': ['Тестовый режим: ответы без модели', 'Test mode: answers without a model'],
} satisfies Dict
