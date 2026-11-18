import type { Dict } from '@/i18n'

/** Skip / period per load section (owner, 2026-10-24): load/SectionChoices.tsx, load/sections.ts, the job panel's rows and the footer. */
export default {
  "O'tkazib yuborish": ['Пропустить', 'Skip'],
  "O'tkazib yuboriladi": ['Будет пропущено', 'Will be skipped'],
  "Lidlar va sdelkalarning ikkalasini o'tkazib bo'lmaydi": ['Нельзя пропустить и лиды, и сделки', 'Leads and deals cannot both be skipped'],
  'Oxirgi 3 oy': ['Последние 3 месяца', 'Last 3 months'],
  'Oxirgi 6 oy': ['Последние 6 месяцев', 'Last 6 months'],
  'Oxirgi 1 yil': ['Последний год', 'Last year'],
  'Oxirgi 2 yil': ['Последние 2 года', 'Last 2 years'],
  '{date} dan': ['С {date}', 'From {date}'],
  'Sanadan…': ['С даты…', 'From a date…'],
  'Qaysi sanadan': ['С какой даты', 'From which date'],
  "Yuklanadigan bo'limlar": ['Загружаемые разделы', 'Sections to load'],
  '{n} qator olinmaydi': ['{n} {n|строка не будет загружена|строки не будут загружены|строк не будут загружены}', '{n} {n|row|rows} will not be loaded'],
  'Xodimlar, bosqichlar va maydonlar har doim olinadi.': ['Сотрудники, стадии и поля загружаются всегда.', 'Staff, stages and fields are always loaded.'],
  "Fayldagi yozuvlar davridan qat'i nazar saqlanadi — davr faqat portaldan olinadiganini cheklaydi.": [
    'Записи из файла сохраняются при любом периоде — период ограничивает только то, что берём с портала.',
    "A file's records are kept whatever the period — the period only limits what is fetched from the portal.",
  ],
  "O'tkazib yuborish yoki davrni o'zgartirish hali boshlanmagan bo'limlarga qo'llanadi.": [
    'Пропуск и смена периода действуют на разделы, которые ещё не начались.',
    "Skipping or changing the period applies to sections that have not started yet.",
  ],
  "Qo'ng'iroqlarni o'tkazib yuborib yoki davrni qisqartirib davom ettirishingiz mumkin": [
    'Можно продолжить, пропустив звонки или сократив период',
    'You can continue by skipping calls or shortening the period',
  ],
  "«{section}» bo'limini o'tkazib yuborib yoki davrini qisqartirib davom ettirishingiz mumkin": [
    'Можно продолжить, пропустив раздел «{section}» или сократив его период',
    'You can continue by skipping “{section}” or shortening its period',
  ],
  'Portaldan nimalar olinadi': ['Что берём с портала', 'What is fetched from the portal'],
  "Fayllar ichida. Portal qismi to'xtadi — davom ettiring yoki o'tkazib yuboring": [
    'Файлы загружены. Часть с портала остановилась — продолжите или пропустите её',
    'The files are in. The portal part stopped — resume it or skip it',
  ],
  "Bu bo'lim yuklanmagan — sahifada bo'sh ko'rinadi": ['Этот раздел не загружен — на странице он будет пустым', 'This section was not loaded — it shows empty on the page'],
  "Bu bo'lim yuklanmagan": ['Этот раздел не загружен', 'This section was not loaded'],
  "«{section}» yuklash paytida o'tkazib yuborilgan. Uni loyihaning yuklash qadamida «Qaytarish» bilan qaytarib, qayta yuklash mumkin.": [
    'Раздел «{section}» пропустили при загрузке. Его можно вернуть кнопкой «Вернуть» на шаге загрузки проекта и загрузить заново.',
    '“{section}” was skipped during the load. You can take it back with “Undo” in the project\'s load step and load it again.',
  ],
} satisfies Dict
