import type { Dict } from '@/i18n'

/** The «Стадия (для отчетов)» field: the Questions step and Nova's stage-source switch. */
export default {
  'Lid hisobot bosqichi qaysi maydondan olinsin?': ['Из какого поля брать стадию лида для отчетов?', 'Which field should the lead report stage come from?'],
  'Sdelka hisobot bosqichi qaysi maydondan olinsin?': ['Из какого поля брать стадию сделки для отчетов?', 'Which field should the deal report stage come from?'],
  "Bo'sh qolgan lidda Bitrix bosqichi ko'rsatiladi; sotildi / bekor Bitrix bosqichidan hisoblanadi": [
    'Если у лида поле пустое, показывается стадия Bitrix; продано / отказ считаются по стадии Bitrix',
    'A lead with the field empty shows its Bitrix stage; won / lost are counted from the Bitrix stage',
  ],
  "Bo'sh qolgan sdelkada Bitrix bosqichi ko'rsatiladi; sotildi / bekor Bitrix bosqichidan hisoblanadi": [
    'Если у сделки поле пустое, показывается стадия Bitrix; продано / отказ считаются по стадии Bitrix',
    'A deal with the field empty shows its Bitrix stage; won / lost are counted from the Bitrix stage',
  ],
  'Bitrix bosqichi (STATUS_ID)': ['Стадия Bitrix (STATUS_ID)', 'Bitrix stage (STATUS_ID)'],
  "Bitrix'da robot to'ldiradigan «Стадия (для отчетов)» maydoni bor. Hisobotlar odatda shundan olinadi: bosqich ustunlari, menejer ostidagi bosqichlar va Bosqich filtri shu maydon bo'yicha chiqadi.": [
    'В Bitrix есть поле «Стадия (для отчетов)», которое заполняет робот. Отчёты обычно строятся по нему: колонки стадий, стадии под менеджером и фильтр Стадия идут по этому полю.',
    'Bitrix has a «Стадия (для отчетов)» field a robot fills. Reports usually use it: the stage columns, the stages under each manager and the Stage filter follow this field.',
  ],
  "Bitrix'da robot to'ldiradigan «Стадия сделки (для отчетов)» maydoni bor. Sdelka bosqichlari jadvali va filtri shu maydon bo'yicha chiqadi.": [
    'В Bitrix есть поле «Стадия сделки (для отчетов)», которое заполняет робот. Таблица и фильтр стадий сделок идут по этому полю.',
    'Bitrix has a «Стадия сделки (для отчетов)» field a robot fills. The deal stage table and filter follow this field.',
  ],
  "Saqlandi. Dashbord qayta qurilmoqda — bu bir-ikki daqiqa oladi, chatdan foydalanishda davom etishingiz mumkin.": [
    'Сохранено. Дашборд пересобирается — это займёт минуту-две, чатом можно пользоваться дальше.',
    'Saved. The dashboard is being rebuilt — it takes a minute or two; you can keep using the chat.',
  ],
  "Qayta qurib bo'lmadi. Keyinroq qayta urinib ko'ring.": ['Не удалось пересобрать. Попробуйте позже.', "The rebuild didn't work. Please try again later."],
  'Tayyor — bosqichlar yangilandi.': ['Готово — стадии обновлены.', 'Done — the stages are updated.'],
  "O'zgartirib bo'lmadi. Keyinroq qayta urinib ko'ring.": ['Не удалось изменить. Попробуйте позже.', "It couldn't be changed. Please try again later."],
  "Tushundim: bosqichlar endi «{field}» maydonidan olinadi — butun dashbordda. O'zgartiraymi?": [
    'Понял: стадии теперь будут браться из поля «{field}» — во всём дашборде. Изменить?',
    'Got it: the stages will now come from the «{field}» field — on the whole dashboard. Shall I change it?',
  ],
  "Tushundim: bosqichlar endi Bitrix bosqichidan (STATUS_ID) olinadi — butun dashbordda. O'zgartiraymi?": [
    'Понял: стадии теперь будут браться из стадии Bitrix (STATUS_ID) — во всём дашборде. Изменить?',
    'Got it: the stages will now come from the Bitrix stage (STATUS_ID) — on the whole dashboard. Shall I change it?',
  ],
  'Bitrix bosqichi': ['Стадия Bitrix', 'Bitrix stage'],
  'Bosqichlar:': ['Стадии:', 'Stages:'],
  'Bosqichlar qaysi maydondan olinadi': ['Из какого поля брать стадии', 'Which field the stages come from'],
  'Hozir: {name} · butun dashbord uchun': ['Сейчас: {name} · для всего дашборда', 'Now: {name} · for the whole dashboard'],
} satisfies Dict
