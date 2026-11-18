import type { Dict } from '@/i18n'

/** The block chat with Nova and trying a look (features/blockedit/BlockChat.tsx, trymode.ts, BlockEditOverlay.tsx). */
export default {
  'Nova bilan suhbat': ['Чат с Nova', 'Chat with Nova'],
  'Suhbatni tozalash': ['Очистить чат', 'Clear chat'],
  "Nova'ga yozing": ['Напишите Nova', 'Write to Nova'],
  "Nima o'zgarsin? Nova avval nimani tushunganini aytadi va so'raydi — siz «Ha» demaguningizcha hech narsa o'zgarmaydi.": [
    'Что изменить? Nova сначала скажет, что поняла, и спросит — пока вы не скажете «Да», ничего не изменится.',
    "What should change? Nova first says what it understood and asks — nothing changes until you say «Yes».",
  ],
  "Ha, o'zgartir": ['Да, изменить', 'Yes, change it'],
  "Yo'q, o'zgartirma": ['Нет, не меняй', "No, don't"],
  "Ko'rib turibsiz — «Yoqdi» yoki «Ortga» ni bosing": ['Вы смотрите — нажмите «Нравится» или «Назад»', 'You are previewing it — press «Keep» or «Undo»'],
  "Ko'rib chiqildi": ['Просмотрено', 'Previewed'],
  'Ortga qaytarish': ['Вернуть как было', 'Undo'],
  "Qaytarib bo'lmadi": ['Не удалось вернуть', 'Could not undo'],
  'Navbatdan olib tashlash': ['Убрать из очереди', 'Remove from queue'],
  'Ortga qaytarildi': ['Отменено', 'Undone'],
  "O'zgartirilmadi": ['Не изменено', 'Not changed'],
  "Bu o'zgarish endi shu blokka mos kelmaydi": ['Это изменение уже не подходит этому блоку', 'This change no longer fits this block'],
  "Yaxshi, o'zgartirmayman. Boshqacha qilib ayting — nima qilay?": ['Хорошо, не меняю. Скажите иначе — что сделать?', "OK, I won't change it. Tell me another way — what should I do?"],
  'Yoqdimi?': ['Нравится?', 'Like it?'],
  'Yoqdi — saqlash': ['Нравится — сохранить', 'Keep it — save'],
  "Nima o'zgarsin?": ['Что изменить?', 'What should change?'],
  'Avval «Yoqdi — saqlash» yoki «Ortga» ni bosing': ['Сначала нажмите «Нравится — сохранить» или «Назад»', 'First press «Keep it — save» or «Back»'],
  "Ko'rsatkich": ['Показатель', 'Measure'],
  "Chiziq vaqt bo'yicha o'zgarishni ko'rsatadi — bu ma'lumotda sana yo'q": ['Линия показывает изменение во времени — здесь нет дат', 'A line shows change over time — this data has no dates'],
  "Voronka bosqichlar uchun — bu ma'lumotda bosqich yo'q yoki qator juda ko'p": ['Воронка — для этапов: здесь нет этапов или слишком много строк', 'A funnel is for stages — this data has no stages or too many rows'],
  "Doira qismlarni ko'rsatadi — qator juda ko'p yoki manfiy son bor": ['Круг показывает доли — слишком много строк или есть отрицательные числа', 'A pie shows parts — too many rows or a negative number'],
  "Issiqlik xaritasi uchun ikki o'lchov yoki bir nechta ko'rsatkich kerak": ['Для тепловой карты нужны два измерения или несколько показателей', 'A heatmap needs two dimensions or several measures'],
  "Buning uchun bir nechta ko'rsatkich kerak": ['Для этого нужно несколько показателей', 'This needs several measures'],
  "Bu ma'lumotga mos kelmaydi": ['Не подходит для этих данных', "Doesn't fit this data"],
} satisfies Dict
