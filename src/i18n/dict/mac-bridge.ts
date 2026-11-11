import type { Dict } from '@/i18n'

/** «Data365 ko'prigi» / «Kompyuterim»: everyone's own computers, read-only, for Nova (features/macbridge, docs/mac-bridge.md). */
export default {
  "Data365 ko'prigi": ['Мост Data365', 'Data365 bridge'],
  "Faqat o'qish": ['Только чтение', 'Read-only'],
  Onlayn: ['В сети', 'Online'],
  Oflayn: ['Не в сети', 'Offline'],
  "To'xtatilgan": ['Приостановлен', 'Paused'],
  'Rostdan uzilsinmi?': ['Точно отключить?', 'Disconnect for sure?'],
  'Ha, uzish': ['Да, отключить', 'Yes, disconnect'],
  'Bekor qilish': ['Отмена', 'Cancel'],
  Uzish: ['Отключить', 'Disconnect'],
  'Nusxa olish': ['Скопировать', 'Copy'],
  'Nusxa olindi': ['Скопировано', 'Copied'],
  "Bo'lmadi — qayta urinib ko'ring": ['Не получилось — попробуйте ещё раз', 'Did not work — try again'],

  // the page
  Kompyuterim: ['Мой компьютер', 'My computer'],
  'Kompyuterni ulash': ['Подключить компьютер', 'Connect a computer'],
  "Ma'lumotni olib bo'lmadi": ['Не удалось получить данные', 'Could not load the data'],
  "Bu imkoniyat hozir o'chirilgan.": ['Эта возможность сейчас выключена.', 'This feature is turned off right now.'],
  "Sizning rolingiz uchun kompyuter ulash hali yoqilmagan. Kompaniya egasidan so'rang.": [
    'Подключение компьютера для вашей роли ещё не включено. Попросите владельца компании.',
    "Connecting a computer isn't turned on for your role yet. Ask the company owner.",
  ],
  "Ilovani yuklab oling va o'rnating": ['Скачайте и установите приложение', 'Download and install the app'],
  'Ilovada «Kompyuterni ulash»ni bosing — Studio brauzerda ochiladi': [
    'В приложении нажмите «Подключить компьютер» — Studio откроется в браузере',
    'In the app press «Connect a computer» — Studio opens in the browser',
  ],
  '«Ruxsat berish»ni bosing — tayyor': ['Нажмите «Разрешить» — готово', 'Press «Allow» — done'],
  "Eng ko'pi {n} ta kompyuter. Yangisini ulash uchun bittasini uzing.": [
    'Не больше {n} компьютеров. Чтобы подключить новый, отключите один.',
    'At most {n} computers. To connect a new one, disconnect one.',
  ],
  '{os} uchun': ['Для {os}', 'For {os}'],
  'Ilova tez kunda': ['Приложение скоро', 'App coming soon'],
  Kengaytirilgan: ['Дополнительно', 'Advanced'],
  'Terminal orqali ulash (dasturchilar uchun)': ['Подключение через терминал (для разработчиков)', 'Connect through the terminal (for developers)'],
  'Bir martalik kod olish': ['Получить одноразовый код', 'Get a one-time code'],

  // devices
  'Mening kompyuterlarim': ['Мои компьютеры', 'My computers'],
  "To'liq ruxsat": ['Полный доступ', 'Full access'],
  'Qisman ruxsat': ['Частичный доступ', 'Partial access'],
  'Butun uy papkasi': ['Вся домашняя папка', 'The whole home folder'],
  'Tashqi disklar': ['Внешние диски', 'External disks'],
  'Umumiy papka': ['Общая папка', 'Shared folder'],
  '{d}: disk': ['Диск {d}:', '{d}: drive'],
  "Nova hozir bu kompyuterdan hech narsa o'qiy olmaydi.": ['Сейчас Nova ничего не может читать с этого компьютера.', 'Nova cannot read anything on this computer right now.'],
  "Ruxsatni o'zgartirish": ['Изменить доступ', 'Change access'],
  "To'xtatish": ['Приостановить', 'Pause'],
  'Davom ettirish': ['Продолжить', 'Resume'],
  'Kompyuter uzildi': ['Компьютер отключён', 'The computer is disconnected'],
  "Nova bu kompyuterni o'qiy olmaydi. Qayta ulash uchun ilovada yana «Kompyuterni ulash»ni bosing.": [
    'Nova не сможет читать этот компьютер. Чтобы подключить снова, нажмите в приложении «Подключить компьютер».',
    'Nova will no longer read this computer. To connect again, press «Connect a computer» in the app.',
  ],
  "Butun kompyuter, faqat o'qish. Parollar, kalitlar, .env, brauzer va pochta ma'lumotlari, tizim papkalari doim yopiq.": [
    'Весь компьютер, только чтение. Пароли, ключи, .env, данные браузера и почты, системные папки всегда закрыты.',
    'The whole computer, read-only. Passwords, keys, .env, browser and mail data and system folders are always closed.',
  ],
  "Faqat siz tanlagan papkalar, faqat o'qish.": ['Только выбранные вами папки, только чтение.', 'Only the folders you pick, read-only.'],
  "Bu kompyuter o'zi faqat tanlangan papkalarni ulashadi. To'liq ruxsat kompyuterdagi ilovada yoqiladi.": [
    'Этот компьютер сам открывает только выбранные папки. Полный доступ включается в приложении на компьютере.',
    'This computer itself shares only picked folders. Full access is turned on in the app on that computer.',
  ],
  'Ichkaridagi papka': ['Папка внутри', 'A folder inside'],
  "Qo'shish": ['Добавить', 'Add'],
  'Kamida bitta papka tanlang': ['Выберите хотя бы одну папку', 'Pick at least one folder'],
  '{f} — bu kompyuter bu papkani ulashmaydi. Kengroq ruxsat kompyuterdagi ilovada tanlanadi.': [
    '{f} — этот компьютер не открывает эту папку. Более широкий доступ выбирается в приложении на компьютере.',
    "{f} — this computer doesn't share this folder. Wider access is chosen in the app on that computer.",
  ],
  "{f} — papka manzili noto'g'ri": ['{f} — неверный адрес папки', '{f} — not a valid folder'],
  Saqlash: ['Сохранить', 'Save'],
  Saqlandi: ['Сохранено', 'Saved'],

  // activity
  "Nova nimani o'qidi": ['Что прочитала Nova', 'What Nova read'],
  "Hali hech narsa o'qilmagan": ['Пока ничего не прочитано', 'Nothing read yet'],
  Qidiruv: ['Поиск', 'Search'],
  Papka: ['Папка', 'Folder'],
  "O'qish": ['Чтение', 'Read'],
  Yopiq: ['Закрыто', 'Closed'],
  "Bo'lmadi": ['Не удалось', 'Failed'],

  // the owner's setting
  'Kimlar ulay oladi': ['Кто может подключать', 'Who may connect'],
  'Kompyuter ulash yoqilgan': ['Подключение компьютеров включено', 'Connecting computers is on'],

  // the approval page (/ulash)
  "Bu kompyuter Nova'ga fayllarini o'qishga ruxsat so'rayapti.": ['Этот компьютер просит разрешить Nova читать его файлы.', 'This computer asks to let Nova read its files.'],
  'Ruxsat berish': ['Разрешить', 'Allow'],
  'Rad etish': ['Отклонить', 'Deny'],
  'Tayyor — kompyuter ulandi': ['Готово — компьютер подключён', 'Done — the computer is connected'],
  "Ilova o'zi davom etadi. Bu oynani yopishingiz mumkin.": ['Приложение продолжит само. Это окно можно закрыть.', 'The app carries on by itself. You can close this window.'],
  'Rad etildi. Kompyuter ulanmadi.': ['Отклонено. Компьютер не подключён.', 'Denied. The computer was not connected.'],
  "Bu so'rov topilmadi yoki vaqti o'tgan. Ilovada qaytadan «Kompyuterni ulash»ni bosing.": [
    'Запрос не найден или устарел. Нажмите в приложении «Подключить компьютер» ещё раз.',
    'This request was not found or has expired. Press «Connect a computer» in the app again.',
  ],
  'Kompyuterlar soni chegarasiga yetdingiz. «Kompyuterim»da bittasini uzing.': [
    'Достигнут предел числа компьютеров. Отключите один в «Мой компьютер».',
    'You have reached the computer limit. Disconnect one in «My computer».',
  ],
  "Juda ko'p urinish. 15 daqiqadan keyin qayta urinib ko'ring.": ['Слишком много попыток. Попробуйте через 15 минут.', 'Too many attempts. Try again in 15 minutes.'],
} satisfies Dict
