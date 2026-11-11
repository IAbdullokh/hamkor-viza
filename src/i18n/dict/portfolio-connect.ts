import type { Dict } from '@/i18n'

/** Loyihalar → "Data365 loyihalari": "Barcha loyihalarni ulash", the Ulangan / Ulanmagan filter and the card's connection line. */
export default {
  'Barcha loyihalarni ulash': ['Подключить все проекты', 'Connect all projects'],
  'Ulanish': ['Подключение', 'Connection'],
  'Ulanmagan': ['Не подключён', 'Not connected'],
  "deploy o'chiq": ['деплой выключен', 'deploy off'],
  '{ok} ta ulangan, {bad} ta ulanmagan': ['Подключено: {ok}, не подключено: {bad}', '{ok} connected, {bad} not connected'],
  'Hozirgina tekshirildi — birozdan keyin qayta bosing': ['Только что проверено — нажмите чуть позже', 'Just checked — press again in a moment'],
  "Tekshirib bo'lmadi — qayta urinib ko'ring": ['Не удалось проверить — попробуйте ещё раз', 'Could not check — try again'],
  "Hali ulangan loyiha yo'q": ['Подключённых проектов пока нет', 'No connected projects yet'],
  'Hamma loyihalar ulangan': ['Все проекты подключены', 'All projects are connected'],
  'Server kalitni qabul qilmadi': ['Сервер не принял ключ', 'The server refused the key'],
  'Server javob bermayapti': ['Сервер не отвечает', 'The server is not answering'],
  "Serverga ulanib bo'lmadi": ['Не удалось подключиться к серверу', 'Could not connect to the server'],
  "Server ma'lumoti yo'q": ['Нет данных о сервере', 'No server details'],
  'Vercel orqali ishlaydi — Studio ulanmagan': ['Работает через Vercel — Studio не подключена', 'Runs on Vercel — Studio is not connected'],
  'Railway orqali ishlaydi — Studio ulanmagan': ['Работает через Railway — Studio не подключена', 'Runs on Railway — Studio is not connected'],
  "GitHub repo ma'lum emas": ['Репозиторий GitHub неизвестен', 'GitHub repo unknown'],
  'GitHub repo ochilmadi': ['Репозиторий GitHub не открылся', 'GitHub repo did not open'],
  "Mac'da loyiha papkasi yo'q": ['На Mac нет папки проекта', 'No project folder on the Mac'],
} satisfies Dict
