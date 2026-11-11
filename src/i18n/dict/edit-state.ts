import type { Dict } from '@/i18n'

/** "Kod holati" (Mac · GitHub · Studio) and overlap warnings between people editing one project (features/edit/CodeState.tsx). */
export default {
  'Kod holati': ['Состояние кода', 'Code state'],
  'Kod holati tekshirilmoqda…': ['Проверяем состояние кода…', 'Checking the code state…'],
  "Kod holatini bilib bo'lmadi": ['Не удалось узнать состояние кода', 'Could not read the code state'],
  'Qayta tekshirish': ['Проверить снова', 'Check again'],
  'Studio papkasi': ['Папка Studio', 'Studio folder'],
  'Eng yangisi': ['Самая новая', 'Newest'],
  "{n} ta o'zgarish GitHub'da yo'q": ['{n} {n|изменения|изменений|изменений} нет на GitHub', '{n} {n|change|changes} not on GitHub'],
  "{n} ta o'zgarish Studio papkasida yo'q": ['{n} {n|изменения|изменений|изменений} нет в папке Studio', '{n} {n|change|changes} not in the Studio folder'],
  'Bir xil': ['Совпадает', 'Same'],
  'Studio papkasidan orqada': ['Отстаёт от папки Studio', 'Behind the Studio folder'],
  "Yangi narsa yo'q": ['Ничего нового', 'Nothing new'],
  Ulanmadi: ['Нет связи', 'Unreachable'],
  Ulanmagan: ['Не подключён', 'Not connected'],
  '{n} ta ochiq tahrir': ['{n} {n|открытая правка|открытые правки|открытых правок}', '{n} open {n|edit|edits}'],
  "Ochiq tahrir yo'q": ['Открытых правок нет', 'No open edits'],
  "{n} ta fayl o'zgarmoqda": ['{n|Меняется|Меняются|Меняются} {n} {n|файл|файла|файлов}', '{n} {n|file|files} changing'],
  nusxa: ['копия', 'copy'],
  'Hammasi bir xil': ['Всё совпадает', 'Everything matches'],
  "Eng yangisi: Studio papkasi (GitHub'da yo'q {n} ta o'zgarish)": ['Новее всего: папка Studio ({n} {n|изменения|изменений|изменений} нет на GitHub)', 'Newest: the Studio folder ({n} {n|change|changes} not on GitHub)'],
  'Eng yangisi: Studio papkasi (saqlanmagan {n} ta fayl)': ['Новее всего: папка Studio ({n} {n|несохранённый файл|несохранённых файла|несохранённых файлов})', 'Newest: the Studio folder ({n} unsaved {n|file|files})'],
  "GitHub yangiroq (Studio papkasida yo'q {n} ta o'zgarish)": ['GitHub новее ({n} {n|изменения|изменений|изменений} нет в папке Studio)', 'GitHub is newer ({n} {n|change|changes} not in the Studio folder)'],
  "Studio papkasi va GitHub ajralgan: GitHub'da yo'q {a} ta, Studio papkasida yo'q {b} ta o'zgarish": ['Папка Studio и GitHub разошлись: {a} {a|изменения|изменений|изменений} нет на GitHub, {b} — в папке Studio', 'The Studio folder and GitHub have diverged: {a} {a|change|changes} not on GitHub, {b} not in the Studio folder'],
  'GitHub ulanmagan — kod faqat Studio papkasida': ['GitHub не подключён — код только в папке Studio', 'GitHub is not connected — the code is only in the Studio folder'],
  "GitHub'ga ulanib bo'lmadi — qaysi nusxa yangiligi noma'lum": [
    'Не удалось связаться с GitHub — неизвестно, какая копия новее',
    'Could not reach GitHub — unknown which copy is newer',
  ],
  "Studio papkasida avval GitHub'dagini oling (git pull), keyin o'zingiznikini yuboring (git push), so'ng tahrirlang": ['В папке Studio сначала заберите изменения с GitHub (git pull), потом отправьте свои (git push), затем правьте', 'In the Studio folder first take what is on GitHub (git pull), then send yours (git push), then edit'],
  "Studio papkasidagi o'zgarishlarni GitHub'ga yuboring (git push), keyin tahrirlang — tahrir nusxasi GitHub'dan boshlanadi": ['Отправьте изменения из папки Studio на GitHub (git push), потом правьте — копия для правки начинается с GitHub', 'Send the Studio folder\'s changes to GitHub (git push), then edit — the edit copy starts from GitHub'],
  "Studio papkasida saqlanmagan fayllar bor, shuning uchun u o'zi yangilanmadi — Studio tahriri baribir GitHub'dagi eng yangi holatdan boshlanadi": ['В папке Studio есть несохранённые файлы, поэтому она не обновилась сама — правка в Studio всё равно начинается с самого нового состояния на GitHub', 'The Studio folder has unsaved files, so it did not update itself — a Studio edit starts from the newest GitHub state anyway'],
  "Studio papkasidagi saqlanmagan fayllarni commit qilib GitHub'ga yuboring, keyin tahrirlang — ular tahrir nusxasiga kirmaydi": ['Закоммитьте несохранённые файлы в папке Studio и отправьте на GitHub, потом правьте — в копию для правки они не попадают', 'Commit the unsaved files in the Studio folder and send them to GitHub, then edit — they do not reach the edit copy'],
  'Studio papkasidagi saqlanmagan {n} ta fayl tahrir nusxasiga kirmaydi': ['{n} {n|несохранённый файл|несохранённых файла|несохранённых файлов} в папке Studio не {n|попадает|попадают|попадают} в копию для правки', '{n} unsaved {n|file|files} in the Studio folder {n|doesn\'t|don\'t} reach the edit copy'],
  "Studio papkasi «{branch}» branchida — taqqoslash «{main}» bo'yicha": ['Папка Studio на ветке «{branch}» — сравнение по «{main}»', 'The Studio folder is on branch “{branch}” — compared on “{main}”'],
  "Studio'dagi {n} ta ochiq tahrir ({m} ta fayl) hali GitHub'ga yuborilmagan": [
    '{n} {n|открытая правка|открытые правки|открытых правок} в Studio ({m} {m|файл|файла|файлов}) ещё не на GitHub',
    '{n} open Studio {n|edit|edits} ({m} {m|file|files}) {n|is|are} not on GitHub yet',
  ],
  "Studio'dagi {n} ta ochiq tahrirdan {k} tasida o'zgarish bor ({m} ta fayl) — hali GitHub'ga yuborilmagan": [
    'Из {n} {n|открытой правки|открытых правок|открытых правок} в Studio изменения есть в {k} ({m} {m|файл|файла|файлов}) — ещё не на GitHub',
    '{k} of the {n} open Studio {n|edit|edits} {k|has|have} changes ({m} {m|file|files}) — not on GitHub yet',
  ],
  'Boshqa suhbat': ['Другая беседа', 'Another chat'],
  "{who} ham «{files}»ni o'zgartiryapti — davom etsangiz bo'ladi, lekin kelishib oling": [
    '{who} тоже меняет «{files}» — продолжать можно, но договоритесь',
    '{who} is also changing “{files}” — you can go on, but agree with each other',
  ],
  "Siz ham boshqa suhbatda «{files}»ni o'zgartiryapsiz — davom etsangiz bo'ladi, lekin kelishib oling": [
    'Вы тоже меняете «{files}» в другой беседе — продолжать можно, но договоритесь',
    'You are also changing “{files}” in another chat — you can go on, but agree with each other',
  ],
  "Studio papkasini GitHub'dan yangilash kerak (git pull) — Studio tahriri baribir GitHub'dagi eng yangi holatdan boshlanadi": [
    'Папку Studio нужно обновить с GitHub (git pull) — правка в Studio всё равно начинается с самого нового состояния на GitHub',
    'The Studio folder needs a git pull from GitHub — a Studio edit starts from the newest GitHub state anyway',
  ],
  "Studio papkasi GitHub'dan o'zi yangilandi ({n} ta o'zgarish)": [
    'Папка Studio сама обновилась с GitHub ({n} {n|изменение|изменения|изменений})',
    'The Studio folder updated itself from GitHub ({n} {n|change|changes})',
  ],
} satisfies Dict
