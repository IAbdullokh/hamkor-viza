import type { Dict } from '@/i18n'

/** Table sources: Excel / CSV, Google Sheets, PostgreSQL, MySQL, ClickHouse, SQL Server — connect forms, checks, errors and "Jadvallarni moslash". */
export default {
  // connect: leads
  "Bazangizga faqat o'qish uchun ulanamiz: siz tanlagan jadvallardan SELECT qilamiz, hech narsa yozmaymiz.": [
    'Подключаемся к вашей базе только на чтение: делаем SELECT из выбранных вами таблиц и ничего не записываем.',
    'We connect to your database read-only: we SELECT from the tables you choose and never write anything.',
  ],
  "Faylni yuklang, keyin har bir varaq nimani saqlashini ko'rsatasiz — sahifalar shundan to'ladi.": [
    'Загрузите файл, затем укажите, что хранит каждый лист, — из этого заполнятся страницы.',
    'Upload the file, then tell us what each sheet holds — the pages fill from that.',
  ],
  "Jadval havolasini qo'ying, keyin har bir varaq nimani saqlashini ko'rsatasiz. Faqat o'qiymiz.": [
    'Вставьте ссылку на таблицу, затем укажите, что хранит каждый лист. Только чтение.',
    'Paste the spreadsheet link, then tell us what each sheet holds. Read only.',
  ],
  'Ulanishni almashtirish': ['Заменить подключение', 'Replace the connection'],
  'Yozish huquqi bor': ['Есть права на запись', 'Can write'],
  "Jadvallarni moslang: moslangan jadval bo'lmasa, sahifalarga ma'lumot bormaydi": [
    'Сопоставьте таблицы: без сопоставленных таблиц страницы не получат данных',
    'Map your tables: without a mapped table no data reaches the pages',
  ],
  "{source} ulandi. Foydalanuvchi yozish huquqiga ega — faqat o'qish uchun foydalanuvchi tavsiya etiladi": [
    '{source} подключён. У пользователя есть права на запись — рекомендуем пользователя только для чтения',
    '{source} is connected. The user can write — a read-only user is recommended',
  ],
  "Joriy ulanish va uning jadval moslashlari o'chiriladi, keyin qaytadan ulaysiz.": [
    'Текущее подключение и его сопоставления таблиц будут удалены, затем подключите заново.',
    'The current connection and its table mappings are removed; then you connect again.',
  ],

  // Excel upload
  'Yuklandi': ['Загружено', 'Uploaded'],
  'Fayl yuklanmoqda': ['Файл загружается', 'Uploading the file'],
  'Excel yoki CSV faylni shu yerga tashlang yoki tanlang': ['Перетащите сюда файл Excel или CSV или выберите его', 'Drop an Excel or CSV file here or pick one'],
  '.xlsx, .xls yoki .csv · {mb} MB gacha · birinchi qatorda ustun nomlari': [
    '.xlsx, .xls или .csv · до {mb} МБ · названия столбцов в первой строке',
    '.xlsx, .xls or .csv · up to {mb} MB · column names in the first row',
  ],
  'Faylni almashtirish': ['Заменить файл', 'Replace the file'],
  'Fayl almashtirildi': ['Файл заменён', 'File replaced'],
  'Hozirgi fayl: {name}': ['Текущий файл: {name}', 'Current file: {name}'],
  "Yangi faylda varaqlar va ustun nomlari o'sha-o'sha bo'lsa, moslashlar saqlanib qoladi.": [
    'Если в новом файле те же листы и названия столбцов, сопоставления сохранятся.',
    'If the new file has the same sheets and column names, the mappings are kept.',
  ],

  // Google Sheets
  "Bu Google Sheets havolasiga o'xshamaydi": ['Это не похоже на ссылку Google Sheets', "This doesn't look like a Google Sheets link"],
  "Havola docs.google.com/spreadsheets/d/… ko'rinishida bo'ladi — brauzer manzil satridan to'liq nusxalang": [
    'Ссылка выглядит как docs.google.com/spreadsheets/d/… — скопируйте её целиком из адресной строки браузера',
    'The link looks like docs.google.com/spreadsheets/d/… — copy it in full from the browser address bar',
  ],
  'Jadval havolasi': ['Ссылка на таблицу', 'Spreadsheet link'],
  'Google Sheets jadvalini oching va brauzer manzil satridagi havolani nusxalang': [
    'Откройте таблицу Google Sheets и скопируйте ссылку из адресной строки браузера',
    'Open the Google Sheets spreadsheet and copy the link from the browser address bar',
  ],
  'Jadvalni bizga oching': ['Откройте нам доступ к таблице', 'Give us access to the spreadsheet'],
  "1-usul (tavsiya): «Ulashish» (Share) → shu e-pochtani «Ko'ruvchi» (Viewer) qilib qo'shing:": [
    'Способ 1 (рекомендуем): «Настройки доступа» (Share) → добавьте этот e-mail как «Читатель» (Viewer):',
    'Option 1 (recommended): Share → add this e-mail as a Viewer:',
  ],
  "2-usul: «Ulashish» → «Havolaga ega har kim» → «Ko'ruvchi». Bunda havolani bilgan har kim jadvalni ko'ra oladi.": [
    'Способ 2: «Настройки доступа» → «Все, у кого есть ссылка» → «Читатель». Тогда таблицу увидит любой, кто знает ссылку.',
    'Option 2: Share → “Anyone with the link” → Viewer. Then anyone who has the link can see the spreadsheet.',
  ],
  "«Ulashish» (Share) → «Havolaga ega har kim» (Anyone with the link) → «Ko'ruvchi» (Viewer) ni tanlang. Biz faqat o'qiymiz.": [
    '«Настройки доступа» (Share) → «Все, у кого есть ссылка» (Anyone with the link) → «Читатель» (Viewer). Мы только читаем.',
    'Share → “Anyone with the link” → Viewer. We only read.',
  ],

  // databases
  "Ulanish satri noto'g'ri": ['Неверная строка подключения', 'The connection string is not valid'],
  'Masalan: {example}': ['Например: {example}', 'For example: {example}'],
  'Bu satr {engine} uchun emas': ['Эта строка не для {engine}', 'This string is not for {engine}'],
  "Shu bazaning ulanish satrini qo'ying yoki boshqa manbani tanlang": [
    'Вставьте строку подключения этой базы или выберите другой источник',
    "Paste this database's connection string or pick another source",
  ],
  "Server manzili noto'g'ri": ['Неверный адрес сервера', 'The server address is not valid'],
  'Masalan: db.kompaniya.uz yoki 203.0.113.7 — http:// va portsiz': [
    'Например: db.kompaniya.uz или 203.0.113.7 — без http:// и порта',
    'For example: db.kompaniya.uz or 203.0.113.7 — without http:// and the port',
  ],
  "Port noto'g'ri": ['Неверный порт', 'The port is not valid'],
  '1 dan 65535 gacha son, odatda {port}': ['Число от 1 до 65535, обычно {port}', 'A number from 1 to 65535, usually {port}'],
  'Maydonlar': ['Поля', 'Fields'],
  'Ulanish satri (URL)': ['Строка подключения (URL)', 'Connection string (URL)'],
  'Ulanish satri': ['Строка подключения', 'Connection string'],
  'Server: {host} · baza: {db} · foydalanuvchi: {user}': ['Сервер: {host} · база: {db} · пользователь: {user}', 'Server: {host} · database: {db} · user: {user}'],
  "Parol satr ichida bo'ladi — u faqat serverga yuboriladi va sizga qaytib ko'rsatilmaydi": [
    'Пароль внутри строки — он уходит только на сервер и больше вам не показывается',
    'The password is inside the string — it only goes to the server and is never shown back',
  ],
  'Server manzili': ['Адрес сервера', 'Server address'],
  'Domen yoki IP, masalan db.kompaniya.uz': ['Домен или IP, например db.kompaniya.uz', 'A domain or IP, e.g. db.kompaniya.uz'],
  'Port': ['Порт', 'Port'],
  'Bu ichki (xususiy) manzil — bulutdagi serverimiz unga ulana olmaydi. Bazaning ochiq (public) manzilini kiriting.': [
    'Это внутренний (частный) адрес — наш облачный сервер не сможет к нему подключиться. Укажите публичный адрес базы.',
    "This is an internal (private) address — our cloud server can't reach it. Enter the database's public address.",
  ],
  'Baza nomi': ['Имя базы', 'Database name'],
  "Bo'sh qolsa — default": ['Если пусто — default', 'Empty means default'],
  'Foydalanuvchi': ['Пользователь', 'User'],
  'Parol': ['Пароль', 'Password'],
  'Shifrlangan ulanish (SSL)': ['Зашифрованное подключение (SSL)', 'Encrypted connection (SSL)'],
  "Server SSL'ni qo'llamasa, o'chiring": ['Выключите, если сервер не поддерживает SSL', "Turn off if the server doesn't support SSL"],
  "Faqat o'qish uchun foydalanuvchi yaratish": ['Создать пользователя только для чтения', 'Create a read-only user'],
  "Administrator sifatida shu buyruqlarni bajaring, «kuchli-parol» ni o'zingizning parolingizga almashtiring va yuqoriga data365_reader bilan kiring. Bu foydalanuvchi faqat o'qiy oladi.": [
    'Выполните эти команды от администратора, замените «kuchli-parol» своим паролем и подключитесь выше как data365_reader. Этот пользователь может только читать.',
    'Run these commands as an administrator, replace “kuchli-parol” with your own password and connect above as data365_reader. This user can only read.',
  ],

  // guides
  'Faylni qanday tayyorlayman?': ['Как подготовить файл?', 'How do I prepare the file?'],
  "Fayl faqat shu loyiha uchun saqlanadi. Uni istalgan payt almashtirish yoki o'chirish mumkin.": [
    'Файл хранится только для этого проекта. Его можно заменить или удалить в любой момент.',
    'The file is stored for this project only. You can replace or delete it at any time.',
  ],
  "Har bir varaq — bitta jadval: birinchi qatorda ustun nomlari, pastida ma'lumot.": [
    'Каждый лист — одна таблица: в первой строке названия столбцов, ниже данные.',
    'Each sheet is one table: column names in the first row, data below.',
  ],
  "Birlashtirilgan katakchalar, sarlavha bezaklari va «Jami» qatorlarini olib tashlang.": [
    'Уберите объединённые ячейки, оформление заголовков и строки «Итого».',
    'Remove merged cells, decorative headers and “Total” rows.',
  ],
  ".xlsx, .xls yoki .csv faylni yuklang. Parol qo'yilgan fayllarni o'qiy olmaymiz.": [
    'Загрузите файл .xlsx, .xls или .csv. Файлы с паролем мы прочитать не можем.',
    "Upload an .xlsx, .xls or .csv file. We can't read password-protected files.",
  ],
  "Ulangandan keyin har bir varaq nimani saqlashini tanlaysiz: lidlar, sdelkalar, sotuvlar, qo'ng'iroqlar yoki reklama xarajati.": [
    'После подключения выберете, что хранит каждый лист: лиды, сделки, продажи, звонки или расходы на рекламу.',
    'After connecting you choose what each sheet holds: leads, deals, sales, calls or ad spend.',
  ],
  'Jadvalni qanday ulayman?': ['Как подключить таблицу?', 'How do I connect the spreadsheet?'],
  "Faqat o'qiymiz — jadvalingizga hech narsa yozmaymiz. Ulashishni istalgan payt bekor qilishingiz mumkin.": [
    'Только читаем — ничего не пишем в вашу таблицу. Доступ можно отозвать в любой момент.',
    'We only read — we never write to your spreadsheet. You can stop sharing at any time.',
  ],
  "Google Sheets'da jadvalni oching va o'ng yuqoridagi «Ulashish» (Share) tugmasini bosing.": [
    'Откройте таблицу в Google Sheets и нажмите «Настройки доступа» (Share) справа вверху.',
    'Open the spreadsheet in Google Sheets and press Share at the top right.',
  ],
  "Bizning xizmat e-pochtamizni «Ko'ruvchi» qilib qo'shing — yoki «Havolaga ega har kim» → «Ko'ruvchi» ni tanlang.": [
    'Добавьте наш служебный e-mail как «Читатель» — или выберите «Все, у кого есть ссылка» → «Читатель».',
    'Add our service e-mail as a Viewer — or choose “Anyone with the link” → Viewer.',
  ],
  "Brauzer manzil satridagi havolani nusxalang va shu yerga qo'ying.": ['Скопируйте ссылку из адресной строки браузера и вставьте сюда.', 'Copy the link from the browser address bar and paste it here.'],
  'Ulangandan keyin har bir varaq nimani saqlashini tanlaysiz.': ['После подключения выберете, что хранит каждый лист.', 'After connecting you choose what each sheet holds.'],
  'Bazani qanday ulayman?': ['Как подключить базу?', 'How do I connect the database?'],
  "Faqat SELECT so'rovlari va faqat siz moslagan jadvallardan. Parol shifrlangan holda saqlanadi va sizga qaytib ko'rsatilmaydi.": [
    'Только запросы SELECT и только к сопоставленным вами таблицам. Пароль хранится в зашифрованном виде и больше не показывается.',
    'Only SELECT queries and only on the tables you map. The password is stored encrypted and never shown back.',
  ],
  "Faqat o'qish uchun alohida foydalanuvchi yarating — formadagi tayyor SQL'ni administrator bajaradi.": [
    'Создайте отдельного пользователя только для чтения — готовый SQL из формы выполняет администратор.',
    'Create a separate read-only user — an administrator runs the ready SQL from the form.',
  ],
  "Baza internetdan ochiq bo'lishi kerak: ochiq (public) manzil va port. Firewall bo'lsa, serverimizga ruxsat bering.": [
    'База должна быть доступна из интернета: публичный адрес и порт. Если есть firewall, разрешите наш сервер.',
    'The database must be reachable from the internet: a public address and port. If there is a firewall, allow our server.',
  ],
  "localhost yoki 192.168.x.x kabi ichki manzillarga bulutdan ulanib bo'lmaydi.": [
    'К внутренним адресам вроде localhost или 192.168.x.x из облака подключиться нельзя.',
    "Internal addresses like localhost or 192.168.x.x can't be reached from the cloud.",
  ],
  "Manzil, port, baza nomi, login va parolni kiriting — yoki tayyor ulanish satrini (URL) qo'ying.": [
    'Введите адрес, порт, имя базы, логин и пароль — или вставьте готовую строку подключения (URL).',
    'Enter the address, port, database name, login and password — or paste a ready connection string (URL).',
  ],
  "Ulangandan keyin qaysi jadval nimani saqlashini tanlaysiz — faqat shu jadvallarni o'qiymiz.": [
    'После подключения выберете, что хранит каждая таблица, — читаем только их.',
    'After connecting you choose what each table holds — we read only those tables.',
  ],

  // mapping
  'Jadvallarni moslash': ['Сопоставление таблиц', 'Map tables'],
  "Jadval nimani saqlashini va qaysi ustun qaysi maydon ekanini ko'rsating — sahifalar shundan to'ladi": [
    'Укажите, что хранит таблица и какой столбец каким полем является, — из этого заполнятся страницы',
    'Say what the table holds and which column is which field — the pages fill from that',
  ],
  "Har bir jadval nimani saqlashini ko'rsating — faqat moslangan jadvallar sahifalarga ma'lumot beradi.": [
    'Укажите, что хранит каждая таблица, — данные на страницы дают только сопоставленные таблицы.',
    'Say what each table holds — only mapped tables feed the pages.',
  ],
  "Hali moslanmagan — sahifalarga ma'lumot bermaydi": ['Ещё не сопоставлено — страницы не получают данных', 'Not mapped yet — feeds no pages'],
  'Jadvallar': ['Таблицы', 'Tables'],
  "Jadval topilmadi. Faylda ma'lumotli varaq yoki bazada o'qish mumkin bo'lgan jadval bo'lishi kerak.": [
    'Таблицы не найдены. В файле должен быть лист с данными, а в базе — таблица, доступная для чтения.',
    'No tables found. The file needs a sheet with data, or the database a table the user can read.',
  ],
  '{n} qator': ['{n} {n|строка|строки|строк}', '{n} {n|row|rows}'],
  "qatorlar soni noma'lum": ['число строк неизвестно', 'row count unknown'],
  'Chapdan jadvalni tanlang': ['Выберите таблицу слева', 'Pick a table on the left'],
  '1. Bu jadvalda nima bor?': ['1. Что в этой таблице?', '1. What is in this table?'],
  'Jadvalga eng mos keladiganlari birinchi turibdi': ['Самые подходящие варианты — первыми', 'The best fits come first'],
  'mos keladi': ['подходит', 'good fit'],
  'moslangan': ['сопоставлено', 'mapped'],
  "Loyihada {crm} bor — CRM bitta bo'ladi": ['В проекте уже есть {crm} — CRM может быть только одна', 'The project already has {crm} — there is only one CRM'],
  '2. Qaysi ustun qaysi maydon?': ['2. Какой столбец каким полем?', '2. Which column is which field?'],
  'Taxminimizni tekshiring. * — majburiy maydon.': ['Проверьте нашу догадку. * — обязательное поле.', 'Check our guess. * marks a required field.'],
  'Summalar valyutasi': ['Валюта сумм', 'Currency of the amounts'],
  "so'm (UZS)": ['сум (UZS)', 'sum (UZS)'],
  'dollar (USD)': ['доллар (USD)', 'dollar (USD)'],
  'majburiy': ['обязательно', 'required'],
  '— ustunni tanlang —': ['— выберите столбец —', '— pick a column —'],
  '— kerak emas —': ['— не нужно —', '— not needed —'],
  'Ustun turi mos emas: kerak — {want}, ustunda — {got}': ['Тип столбца не подходит: нужно — {want}, в столбце — {got}', "The column type doesn't fit: needs {want}, the column has {got}"],
  "Birinchi qatorlarda bu ustun bo'sh": ['В первых строках этот столбец пуст', 'This column is empty in the first rows'],
  'Namuna: {value}': ['Пример: {value}', 'Sample: {value}'],
  "3. Jadvaldan ko'rinish": ['3. Просмотр таблицы', '3. Table preview'],
  "Jadvaldan ko'rinish": ['Просмотр таблицы', 'Table preview'],
  'Birinchi {n} qator · jami {total}': ['Первые {n} строк · всего {total}', 'First {n} rows · {total} in total'],
  'Birinchi {n} qator': ['Первые {n} строк', 'First {n} rows'],
  "Bu jadvalda hali qator yo'q": ['В этой таблице пока нет строк', 'This table has no rows yet'],
  'Majburiy maydonlar: {list}': ['Обязательные поля: {list}', 'Required fields: {list}'],
  "{target} ← {table} · {pages} sahifasini to'ldiradi": ['{target} ← {table} · заполнит страницы: {pages}', '{target} ← {table} · fills {pages}'],
  "Loyihada CRM bitta bo'ladi: {crm} allaqachon ulangan. Lidlar va sdelkalarni jadvaldan olish uchun avval {crm}'ni o'chiring yoki bu jadvalni boshqa maqsadga moslang.": [
    'В проекте одна CRM: {crm} уже подключена. Чтобы брать лиды и сделки из таблицы, сначала отключите {crm} или сопоставьте эту таблицу с чем-то другим.',
    'A project has one CRM: {crm} is already connected. To take leads and deals from the table, remove {crm} first or map this table to something else.',
  ],
  'boshqa CRM': ['другая CRM', 'another CRM'],
  'dan': ['из', 'from'],
  'Tahrirlash': ['Изменить', 'Edit'],
  "Moslashni o'chirish": ['Удалить сопоставление', 'Remove the mapping'],
  'Yana jadval moslash': ['Сопоставить ещё таблицу', 'Map another table'],
  "«{target}» moslashini o'chiramizmi?": ['Удалить сопоставление «{target}»?', 'Remove the “{target}” mapping?'],
  "Bu jadvaldan kelgan ma'lumotlar sahifalardan olib tashlanadi. Jadvalning o'zi o'zgarmaydi.": [
    'Данные из этой таблицы уберутся со страниц. Сама таблица не изменится.',
    'Data from this table is removed from the pages. The table itself does not change.',
  ],
  '{n} ta varaq': ['{n} листов', '{n} sheets'],
  '{n} ta jadval': ['{n} таблиц', '{n} tables'],
  '{n} tasi moslangan': ['сопоставлено: {n}', '{n} mapped'],

  // targets
  'Cheklar (savdo)': ['Чеки (продажи)', 'Receipts (sales)'],
  'Mahsulotlar va qoldiq': ['Товары и остатки', 'Products and stock'],
  'Reklama xarajati': ['Расходы на рекламу', 'Ad spend'],
  'Har bir qator — bitta lid: sana, holat, manba, menejer': ['Каждая строка — один лид: дата, статус, источник, менеджер', 'Each row is one lead: date, status, source, manager'],
  'Har bir qator — bitta sdelka: sana, bosqich, summa': ['Каждая строка — одна сделка: дата, этап, сумма', 'Each row is one deal: date, stage, amount'],
  'Har bir qator — bitta chek yoki buyurtma: sana va summa': ['Каждая строка — один чек или заказ: дата и сумма', 'Each row is one receipt or order: date and total'],
  "Har bir qator — bitta mahsulot: nomi, narxi, qoldig'i": ['Каждая строка — один товар: название, цена, остаток', 'Each row is one product: name, price, stock'],
  "Har bir qator — bitta qo'ng'iroq: vaqt, raqam, davomiylik": ['Каждая строка — один звонок: время, номер, длительность', 'Each row is one call: time, number, duration'],
  "Har bir qator — kun va kampaniya bo'yicha sarf": ['Каждая строка — расход за день по кампании', 'Each row is the spend per day and campaign'],

  // fields
  'ID (yozuv raqami)': ['ID (номер записи)', 'ID (record number)'],
  'Yaratilgan sana': ['Дата создания', 'Created on'],
  'Mijoz ismi': ['Имя клиента', 'Client name'],
  'Menejer': ['Менеджер', 'Manager'],
  'Yopilgan sana': ['Дата закрытия', 'Closed on'],
  "Do'kon / filial": ['Магазин / филиал', 'Shop / branch'],
  'Sotuvchi': ['Продавец', 'Seller'],
  'Chegirma': ['Скидка', 'Discount'],
  'Tannarx': ['Себестоимость', 'Cost'],
  'Narx': ['Цена', 'Price'],
  'Kategoriya': ['Категория', 'Category'],
  'Qoldiq': ['Остаток', 'Stock'],
  'Artikul (SKU)': ['Артикул (SKU)', 'SKU'],
  "Yo'nalish (kiruvchi / chiquvchi)": ['Направление (входящий / исходящий)', 'Direction (inbound / outbound)'],
  'Javob berildimi': ['Отвечен ли', 'Answered'],
  'Suhbat davomiyligi (soniya)': ['Длительность разговора (сек)', 'Talk time (sec)'],
  'Kutish vaqti (soniya)': ['Время ожидания (сек)', 'Wait time (sec)'],
  "E'lon": ['Объявление', 'Ad'],
  "Ko'rsatishlar": ['Показы', 'Impressions'],
  'Mahsulot nomi': ['Название товара', 'Product name'],
  'Chek holati': ['Статус чека', 'Receipt status'],
  'Operator / menejer': ['Оператор / менеджер', 'Operator / manager'],

  // value kinds
  'matn': ['текст', 'text'],
  'son': ['число', 'number'],
  'sana': ['дата', 'date'],
  "ha / yo'q": ['да / нет', 'yes / no'],
  "bo'sh": ['пусто', 'empty'],

  // checks
  '{count} ta varaq': ['{count} листов', '{count} sheets'],
  '{count} ta jadval': ['{count} таблиц', '{count} tables'],
  '{count} ta qator': ['{count} строк', '{count} rows'],
  "Fayl o'qildi": ['Файл прочитан', 'File read'],
  'Fayl ochildi va jadvallari topildi': ['Файл открыт, таблицы найдены', 'The file opened and its tables were found'],
  "Fayl o'qilmasa, undan ma'lumot olib bo'lmaydi": ['Если файл не читается, данные из него не получить', "If the file can't be read, no data comes from it"],
  'Jadval ochildi': ['Таблица открыта', 'Spreadsheet opened'],
  'Google Sheets jadvali bizga ochiq': ['Таблица Google Sheets нам доступна', 'The Google Sheets spreadsheet is open to us'],
  "Jadval ulashilmagan bo'lsa, uni o'qiy olmaymiz": ['Если доступ не выдан, мы не сможем её прочитать', "If it isn't shared, we can't read it"],
  'Bazaga ulandik': ['Подключились к базе', 'Connected to the database'],
  '{source} login va parolni qabul qildi': ['{source} принял логин и пароль', '{source} accepted the login and password'],
  "Login yoki parol noto'g'ri bo'lsa, ma'lumot kelmaydi": ['Если логин или пароль неверны, данных не будет', 'With a wrong login or password no data comes'],
  "Shu jadval o'qiladi": ['Читается эта таблица', 'This spreadsheet is read'],
  "Shu baza o'qiladi": ['Читается эта база', 'This database is read'],
  'Foydalanuvchi yozish huquqiga ega: {grants}': ['У пользователя есть права на запись: {grants}', 'The user can write: {grants}'],
  "Faqat o'qish huquqi": ['Только права на чтение', 'Read-only rights'],
  'Biz faqat tanlangan jadvallardan SELECT qilamiz — hech narsa yozmaymiz': ['Мы делаем только SELECT из выбранных таблиц — ничего не пишем', 'We only SELECT from the chosen tables — we never write'],
  "Xavfsizlik uchun faqat o'qish uchun alohida foydalanuvchi yarating (formadagi yo'riqnoma)": [
    'Для безопасности создайте отдельного пользователя только для чтения (инструкция в форме)',
    'For safety, create a separate read-only user (instructions in the form)',
  ],

  // errors and notices
  'Jadval bizga ochilmagan': ['Таблица нам не открыта', "The spreadsheet isn't shared with us"],
  "Google Sheets'da «Ulashish» → {email} manzilini «Ko'ruvchi» qilib qo'shing yoki «Havolaga ega har kim» → «Ko'ruvchi» ni tanlang": [
    'В Google Sheets: «Настройки доступа» → добавьте {email} как «Читатель» или выберите «Все, у кого есть ссылка» → «Читатель»',
    'In Google Sheets: Share → add {email} as a Viewer, or choose “Anyone with the link” → Viewer',
  ],
  "Google Sheets'da «Ulashish» → bizning xizmat e-pochtamizni «Ko'ruvchi» qilib qo'shing yoki «Havolaga ega har kim» → «Ko'ruvchi» ni tanlang": [
    'В Google Sheets: «Настройки доступа» → добавьте наш служебный e-mail как «Читатель» или выберите «Все, у кого есть ссылка» → «Читатель»',
    'In Google Sheets: Share → add our service e-mail as a Viewer, or choose “Anyone with the link” → Viewer',
  ],
  'Serverimiz bu manzilga ulana olmaydi': ['Наш сервер не может подключиться к этому адресу', "Our server can't connect to this address"],
  "Ichki (xususiy) manzillarga, masalan localhost yoki 192.168.x.x ga ulanib bo'lmaydi — bazaning ochiq (public) manzilini kiriting yoki biz bilan bog'laning": [
    'К внутренним (частным) адресам, например localhost или 192.168.x.x, подключиться нельзя — укажите публичный адрес базы или свяжитесь с нами',
    "Internal (private) addresses such as localhost or 192.168.x.x can't be reached — enter the database's public address or contact us",
  ],
  '«{table}» jadvali topilmadi': ['Таблица «{table}» не найдена', 'Table “{table}” not found'],
  'Jadval topilmadi': ['Таблица не найдена', 'Table not found'],
  "Jadval o'chirilgan yoki nomi o'zgargan — moslashni yangilang": ['Таблица удалена или переименована — обновите сопоставление', 'The table was deleted or renamed — update the mapping'],
  "«{field}» maydoni to'g'ri moslanmagan": ['Поле «{field}» сопоставлено неверно', 'The “{field}” field is not mapped correctly'],
  "Moslash to'liq emas": ['Сопоставление неполное', 'The mapping is incomplete'],
  'Majburiy maydonlarga ustun tanlang va ustun jadvalda borligini tekshiring': [
    'Выберите столбцы для обязательных полей и проверьте, что столбец есть в таблице',
    'Pick columns for the required fields and check the column exists in the table',
  ],
  "Server faylni qabul qilmadi. Kichikroq fayl yuklang yoki ortiqcha varaqlarni o'chiring": ['Сервер не принял файл. Загрузите файл поменьше или удалите лишние листы', "The server didn't accept the file. Upload a smaller file or delete extra sheets"],
  '.xlsx, .xls yoki .csv fayl yuklang — parolsiz, birinchi qatorda ustun nomlari bilan': [
    'Загрузите файл .xlsx, .xls или .csv — без пароля, с названиями столбцов в первой строке',
    'Upload an .xlsx, .xls or .csv file — no password, column names in the first row',
  ],
  "{table}: {count} ta qator o'tkazib yuborildi — majburiy qiymat yo'q yoki o'qilmadi": [
    '{table}: пропущено строк — {count} (нет обязательного значения или не прочиталось)',
    '{table}: {count} rows skipped — a required value is missing or unreadable',
  ],
} satisfies Dict
