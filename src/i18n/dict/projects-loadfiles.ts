import type { Dict } from '@/i18n'

/** Step 4 "load": several export files side by side (leads, deals), their rows, and the small differences in plain words (load/ImportPanel.tsx, load/format.ts). */
export default {
  // the slots
  'Eksport fayllari': ['Файлы экспорта', 'Export files'],
  "Fayllarni istalgan payt yuklang — portalni kutish shart emas. Har bir fayl qo'shiladi, oldingisi o'chmaydi; portaldan faqat fayllarda yo'q qismini olamiz.": [
    'Загружайте файлы в любой момент — ждать портал не нужно. Каждый файл добавляется, предыдущий не удаляется; из портала берём только то, чего нет в файлах.',
    'Upload files at any time — no need to wait for the portal. Each file is added, the earlier one stays; from the portal we only fetch what the files lack.',
  ],
  "+ Lidlar faylini qo'shish": ['+ Добавить файл лидов', '+ Add the leads file'],
  "+ Sdelkalar faylini qo'shish": ['+ Добавить файл сделок', '+ Add the deals file'],
  'Yangi lidlar faylini tashlang': ['Перетащите новый файл лидов', 'Drop the new leads file'],
  'Yangi sdelkalar faylini tashlang': ['Перетащите новый файл сделок', 'Drop the new deals file'],
  "Boshqa fayl qo'shish": ['Добавить другой файл', 'Add another file'],
  "turini fayl ustunlaridan o'zimiz aniqlaymiz": ['тип определим сами по столбцам файла', 'we tell its kind from the file’s columns'],
  "Bu sdelkalar fayli ekan — Sdelkalar qatoriga qo'ydik": ['Это файл сделок — поставили его в строку «Сделки»', 'This is a deals file — it went into the Deals row'],
  "Bu lidlar fayli ekan — Lidlar qatoriga qo'ydik": ['Это файл лидов — поставили его в строку «Лиды»', 'This is a leads file — it went into the Leads row'],
  'Lidlar faylini almashtirasizmi?': ['Заменить файл лидов?', 'Replace the leads file?'],
  'Sdelkalar faylini almashtirasizmi?': ['Заменить файл сделок?', 'Replace the deals file?'],
  "Bu sdelkalar fayli ekan, lidlar emas. Lidlar fayli o'zgarmaydi — bu fayl Sdelkalar qatoridagi «{name}» o'rniga qo'yiladi. Yozuvlar birlashtiriladi — eng yangi o'zgarish qoladi.": [
    'Это файл сделок, а не лидов. Файл лидов не изменится — этот файл встанет вместо «{name}» в строке «Сделки». Записи объединяются — остаётся самое свежее изменение.',
    'This is a deals file, not a leads file. The leads file stays as it is — this file takes the place of “{name}” in the Deals row. Records are merged — the newest change stays.',
  ],
  "Bu lidlar fayli ekan, sdelkalar emas. Sdelkalar fayli o'zgarmaydi — bu fayl Lidlar qatoridagi «{name}» o'rniga qo'yiladi. Yozuvlar birlashtiriladi — eng yangi o'zgarish qoladi.": [
    'Это файл лидов, а не сделок. Файл сделок не изменится — этот файл встанет вместо «{name}» в строке «Лиды». Записи объединяются — остаётся самое свежее изменение.',
    'This is a leads file, not a deals file. The deals file stays as it is — this file takes the place of “{name}” in the Leads row. Records are merged — the newest change stays.',
  ],
  "Yangi fayl tekshirilgach, shu turdagi eski faylning hisoboti almashadi. Yozuvlar birlashtiriladi — eng yangi o'zgarish qoladi.": [
    'Когда новый файл будет проверен, отчёт старого файла этого типа заменится. Записи объединяются — остаётся самое свежее изменение.',
    'Once the new file is checked, it replaces the old file’s report of that kind. Records are merged — the newest change stays.',
  ],

  // a file not in yet / refused
  Fayl: ['Файл', 'File'],
  'Tekshirilyapti — portal bilan solishtirilmoqda': ['Проверяется — сверяем с порталом', 'Checking — comparing with the portal'],
  'Navbatda — oldingi fayl tekshirilgach boshlanadi': ['В очереди — начнётся после проверки предыдущего файла', 'Queued — starts once the previous file is checked'],
  'Hozirgi fayl: {name} — yangisi tekshirilgach almashadi': ['Текущий файл: {name} — заменится после проверки нового', 'Current file: {name} — replaced once the new one is checked'],
  'Qabul qilinmadi': ['Не принят', 'Not accepted'],
  "Bu fayl ma'lumotga tegmadi — bu qism portaldan olinadi": ['Этот файл не тронул данные — эта часть придёт из портала', 'This file did not touch the data — this part comes from the portal'],
  "Bu fayl ma'lumotga tegmadi — «{name}» o'z joyida qoladi": ['Этот файл не тронул данные — «{name}» остаётся на месте', 'This file did not touch the data — “{name}” stays in place'],
  "Navbatda — portaldan olish to'xtagach boshlanadi": ['В очереди — начнётся, когда загрузка из портала остановится', 'Queued — starts once the portal fetch stops'],

  // a file of the other kind (FILE_WRONG_ENTITY): what happened, and where it goes
  'Bu sdelkalar fayli, lidlar emas': ['Это файл сделок, а не лидов', 'This is a deals file, not a leads file'],
  'Bu lidlar fayli, sdelkalar emas': ['Это файл лидов, а не сделок', 'This is a leads file, not a deals file'],
  'Sdelkalar qatoriga tashlang': ['Перетащите его в строку «Сделки»', 'Drop it into the Deals row'],
  'Lidlar qatoriga tashlang': ['Перетащите его в строку «Лиды»', 'Drop it into the Leads row'],
  'Fayl bu qatorga mos emas': ['Файл не подходит для этой строки', 'The file does not belong in this row'],
  "Faylni o'z qatoriga tashlang": ['Перетащите файл в его строку', 'Drop the file into its own row'],
  'Sdelkalar fayli sifatida yuklash': ['Загрузить как файл сделок', 'Upload as the deals file'],
  'Lidlar fayli sifatida yuklash': ['Загрузить как файл лидов', 'Upload as the leads file'],
  'Faylni Sdelkalar qatoriga qayta tashlang': ['Перетащите файл в строку «Сделки» ещё раз', 'Drop the file into the Deals row again'],
  'Faylni Lidlar qatoriga qayta tashlang': ['Перетащите файл в строку «Лиды» ещё раз', 'Drop the file into the Leads row again'],
  "Fayllar tekshirilyapti — hammasi tekshirilgach keyingi qadamga o'tasiz": [
    'Файлы проверяются — перейдёте к следующему шагу, когда проверка всех закончится',
    'The files are being checked — you can move on once all of them are verified',
  ],

  // the small differences, in plain words
  'Kichik farqlar ({n})': ['Небольшие расхождения ({n})', 'Small differences ({n})'],
  "ma'lumotga ta'sir qilmaydi": ['на данные не влияет', 'does not affect the data'],
  'Faylda: {values}': ['В файле: {values}', 'In the file: {values}'],
  'va yana {n} ta': ['и ещё {n}', 'and {n} more'],
  'Ismsiz xodim': ['Сотрудник без имени', 'Employee without a name'],
  "Bitrix24'da ismi kiritilmagan xodim(lar) yoki ishdan ketganlar. Ularning yozuvlari mas'ul xodimsiz saqlanadi — xodimlar kesimidagi hisobotda «Belgilanmagan» bo'lib ko'rinadi.": [
    'Сотрудники без имени в Bitrix24 или уволенные. Их записи сохраняются без ответственного — в отчёте по сотрудникам они будут «Не указан».',
    'Employees with no name in Bitrix24, or who left. Their records are kept without a responsible person — the per-employee report shows them as “Not set”.',
  ],
  "Bu xodimlar portal ro'yxatida topilmadi (ishdan ketgan bo'lishi mumkin). Ularning yozuvlari mas'ul xodimsiz saqlanadi — xodimlar kesimidagi hisobotda «Belgilanmagan» bo'lib ko'rinadi.": [
    'Этих сотрудников нет в списке портала (возможно, уволены). Их записи сохраняются без ответственного — в отчёте по сотрудникам они будут «Не указан».',
    'These employees are not in the portal’s list (they may have left). Their records are kept without a responsible person — the per-employee report shows them as “Not set”.',
  ],
  "Bu manbalar portalning manbalar ro'yxatida yo'q (o'chirilgan bo'lishi mumkin). Yozuvlar fayldagi nomi bilan saqlanadi — ma'lumot yo'qolmaydi.": [
    'Этих источников нет в списке источников портала (возможно, удалены). Записи сохраняются с названием из файла — данные не теряются.',
    'These sources are not in the portal’s source list (they may have been deleted). Records keep the name from the file — nothing is lost.',
  ],
  "Bu bosqichlar portalda topilmadi (nomi o'zgargan bo'lishi mumkin). Yozuvlar fayldagi nomi bilan saqlanadi; portaldan yangilanganda to'g'rilanadi.": [
    'Этих стадий нет в портале (возможно, переименованы). Записи сохраняются с названием из файла; при обновлении из портала исправятся.',
    'These stages are not on the portal (they may have been renamed). Records keep the name from the file; an update from the portal corrects them.',
  ],
  "Bir nechta tanlangan qiymat bir katakda (masalan «{example}»). Ular ro'yxatda bor — faylni qayta yuklasangiz, tekshiruv ularni to'g'ri o'qiydi.": [
    'Несколько выбранных значений в одной ячейке (например, «{example}»). Они есть в списке — загрузите файл заново, и проверка прочитает их правильно.',
    'Several chosen values in one cell (e.g. “{example}”). They are in the list — upload the file again and the check reads them correctly.',
  ],
  "Ro'yxatda yo'q qiymat (o'chirilgan yoki nomi o'zgargan bo'lishi mumkin). Fayldagi matn bilan saqlanadi — ma'lumot yo'qolmaydi.": [
    'Значения нет в списке (возможно, удалено или переименовано). Сохраняется текстом из файла — данные не теряются.',
    'The value is not in the list (it may have been deleted or renamed). It is kept as the text from the file — nothing is lost.',
  ],
} satisfies Dict
