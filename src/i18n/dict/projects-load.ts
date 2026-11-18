import type { Dict } from '@/i18n'

/** Step 4 "load": switching a pull to a file mid-way, entity detection, the load gate and where the data came from (steps/LoadStep.tsx, load/*). */
export default {
  'Bu fayl: Lidlar ({n})': ['Этот файл: лиды ({n})', 'This file: leads ({n})'],
  'Bu fayl: Sdelkalar ({n})': ['Этот файл: сделки ({n})', 'This file: deals ({n})'],
  Avtomatik: ['Автоматически', 'Automatic'],
  'CSV, XLS, XLSX, HTML · 1 GB gacha': ['CSV, XLS, XLSX, HTML · до 1 ГБ', 'CSV, XLS, XLSX, HTML · up to 1 GB'],
  Takrorlar: ['Повторы', 'Duplicates'],
  '{n} ta takror qator — har biridan eng yangisi olindi': ['{n} {c|повторяющаяся строка|повторяющиеся строки|повторяющихся строк} — оставлена самая свежая версия', '{n} repeated {c|row|rows} — the newest of each was kept'],
  "Fayl yuklanganda portaldan olish to'xtaydi. Shu paytgacha olinganlari saqlanadi — fayl bilan birlashtiramiz, keyin faqat qolganini olamiz.": [
    'Когда файл загрузится, выгрузка из портала остановится. Уже полученное сохранится — объединим с файлом и докачаем только остальное.',
    'Uploading the file stops the portal pull. What it already got is kept — we merge it with the file and then fetch only the rest.',
  ],

  // the load gate and the step's promises
  "Fayl tekshirilyapti — tekshiruv tugagach keyingi qadamga o'tasiz": ['Файл проверяется — после проверки перейдёте к следующему шагу', 'The file is being checked — you can move on once it is verified'],
  'Fayl portal bilan mos kelmadi — boshqa fayl yuklang': ['Файл не совпал с порталом — загрузите другой файл', 'The file does not match the portal — upload another file'],
  "Yuklash to'xtatilgan — davom ettiring yoki fayl yuklang": ['Загрузка приостановлена — продолжите её или загрузите файл', 'The load is paused — resume it or upload a file'],
  'Fayldan davom etish': ['Продолжить из файла', 'Continue from a file'],
  "Portaldan olish sekin bo'lsa, eksport faylini yuklang — olinganlari saqlanadi, qolganini fayldan olamiz.": [
    'Если выгрузка из портала идёт медленно, загрузите файл экспорта — полученное сохранится, остальное возьмём из файла.',
    'If the portal pull is slow, upload an export file — what was pulled is kept, the rest comes from the file.',
  ],
  "Bazada borini qayta olmaymiz — portaldan faqat yangi va o'zgarganlarini qo'shamiz": [
    'Что уже есть в базе, повторно не качаем — из портала добавим только новые и изменённые',
    'We do not fetch what is already in — from the portal we only add new and changed records',
  ],
  "Faylda yo'q qismini (bosqich tarixi, ikkinchi tur) portaldan olamiz — {range}": [
    'Чего нет в файле (история стадий, второй тип), возьмём из портала — {range}',
    'What the file lacks (stage history, the other type) comes from the portal — {range}',
  ],
  "Fayl tekshirilib bo'lgach keyingi qadamga o'tasiz": ['К следующему шагу — после проверки файла', 'You move on once the file is verified'],
  "Faylda yo'q qismini portaldan olyapmiz": ['Докачиваем из портала то, чего нет в файле', 'Fetching what the file lacks from the portal'],
  'Fayl tekshirilyapti': ['Файл проверяется', 'Checking the file'],
  "Fayl qabul qilinmadi — to'g'ri faylni yuklang": ['Файл не принят — загрузите подходящий файл', 'The file was not accepted — upload the right file'],
  "Vaqtni oldindan aytib bo'lmaydi — yuklash boshlangach hisoblaymiz": [
    'Время заранее не оценить — посчитаем, когда загрузка начнётся',
    'The time cannot be told in advance — we measure it once the load starts',
  ],

  // the file check: the portal is counted over the file's own period
  'Faylda {file} · fayl davri ({period}) ichida portalda {portal}': [
    'В файле {file} · в портале за период файла ({period}) — {portal}',
    'File {file} · portal {portal} within the file’s period ({period})',
  ],

  // where the data came from
  "Ma'lumot qayerdan keldi": ['Откуда данные', 'Where the data came from'],
  '{n} lid fayldan': ['{n} {c|лид|лида|лидов} из файла', '{n} {c|lead|leads} from the file'],
  '{n} sdelka fayldan': ['{n} {c|сделка|сделки|сделок} из файла', '{n} {c|deal|deals} from the file'],
  '{n} yangi lid portaldan': ['{n} {c|новый лид|новых лида|новых лидов} из портала', '{n} new {c|lead|leads} from the portal'],
  '{n} yangi sdelka portaldan': ['{n} {c|новая сделка|новые сделки|новых сделок} из портала', '{n} new {c|deal|deals} from the portal'],
  "Yangi va o'zgargan lidlar portaldan": ['Новые и изменённые лиды из портала', 'New and changed leads from the portal'],
  "Yangi va o'zgargan sdelkalar portaldan": ['Новые и изменённые сделки из портала', 'New and changed deals from the portal'],
  '{n} sdelka portaldan': ['{n} {c|сделка|сделки|сделок} из портала', '{n} {c|deal|deals} from the portal'],
  '{n} lid portaldan': ['{n} {c|лид|лида|лидов} из портала', '{n} {c|lead|leads} from the portal'],
  'Sdelkalar portaldan': ['Сделки из портала', 'Deals from the portal'],
  'Lidlar portaldan': ['Лиды из портала', 'Leads from the portal'],
  'Bosqich tarixi portaldan': ['История стадий из портала', 'Stage history from the portal'],
  "{n} bosqich o'zgarishi portaldan": ['{n} {c|смена стадии|смены стадий|смен стадий} из портала', '{n} stage {c|change|changes} from the portal'],
  "Hammasi olindi — fayl va portal ma'lumotlari birlashtirildi": ['Всё получено — данные файла и портала объединены', 'All in — the file and the portal data are merged'],

  // cancelling a load
  'Yuklashni bekor qilasizmi?': ['Отменить загрузку?', 'Cancel the load?'],
  'Shu paytgacha olinganlari saqlanadi — keyin fayl yuklasangiz, ular bilan birlashtiramiz.': [
    'Уже полученное сохранится — если потом загрузите файл, объединим с ним.',
    'What was pulled so far is kept — if you upload a file next, we merge it in.',
  ],
  Ortga: ['Назад', 'Back'],

  // pull phase of Instagram Direct and WhatsApp Business
  'Instagram va WhatsApp chatlari': ['Чаты Instagram и WhatsApp', 'Instagram and WhatsApp chats'],
} satisfies Dict
