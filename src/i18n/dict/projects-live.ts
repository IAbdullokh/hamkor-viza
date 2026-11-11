import type { Dict } from '@/i18n'

/** Live dashboard (/l/$slug/$page) + the live-only notes inside the 7 pages — ru / en. */
export default {
  // header
  'Yangilash': ['Обновить', 'Refresh'],
  'Yangilanmoqda…': ['Обновляется…', 'Refreshing…'],
  'Yangilangan: {at}': ['Обновлено: {at}', 'Updated: {at}'],
  'Qurilgan: {at}': ['Собрано: {at}', 'Built: {at}'],
  "Ma'lumotlar yangilanmoqda": ['Данные обновляются', 'Updating the data'],
  "Ma'lumotlar yangilandi": ['Данные обновлены', 'Data updated'],
  "Yangilab bo'lmadi. Keyinroq qayta urinib ko'ring.": ['Не удалось обновить. Попробуйте позже.', "Couldn't refresh. Try again later."],
  "O'zgartirish uchun ruxsat kerak — Studio'ga kiring": ['Для изменения нужен доступ — войдите в Studio', 'You need access to change this — sign in to Studio'],
  "O'zgarish saqlanmadi. Internetni tekshirib, qayta urinib ko'ring.": [
    'Изменение не сохранилось. Проверьте интернет и попробуйте снова.',
    "The change wasn't saved. Check the connection and try again.",
  ],
  "Boshqa odam o'zgartirdi — yangilandi": ['Другой человек изменил — обновлено', 'Someone else changed it — updated'],
  // new data waits for the viewer (live/refresh.ts) — unless the dashboard is real-time
  "Yangi ma'lumot bor": ['Есть новые данные', 'New data available'],
  "Yangi ma'lumotni olib bo'lmadi — birozdan keyin urinib ko'ring": ['Не удалось загрузить новые данные — попробуйте чуть позже', "Couldn't load the new data — try again in a moment"],
  "Manbadan yangi ma'lumot olish": ['Получить свежие данные из источника', 'Get fresh data from the source'],
  "Eng yangi ma'lumotni ko'rsatish": ['Показать самые свежие данные', 'Show the newest data'],

  // other UIs
  "Namunaviy ma'lumot.": ['Пример данных.', 'Sample data.'],
  "{ui} ko'rinishi hozircha namunaviy ma'lumot bilan ishlaydi. Loyihangiz ma'lumotlari Liquid Glass ko'rinishida.": [
    'Вид «{ui}» пока работает на примере данных. Данные вашего проекта показывает вид Liquid Glass.',
    'The {ui} look still runs on sample data for now. Your project’s data is shown in the Liquid Glass look.',
  ],

  // not found
  'Dashboard topilmadi': ['Дашборд не найден', 'Dashboard not found'],
  "Havola eskirgan yoki loyiha o'chirilgan bo'lishi mumkin. Loyihalar ro'yxatidan oching.": [
    'Ссылка могла устареть или проект удалён. Откройте его из списка проектов.',
    'The link may be out of date or the project was deleted. Open it from the project list.',
  ],
  "Havola eskirgan yoki loyiha o'chirilgan bo'lishi mumkin.": [
    'Ссылка могла устареть или проект удалён.',
    'The link may be out of date or the project was deleted.',
  ],

  // Qo'ng'iroqlar without telephony
  'Telefoniya ulanmagan': ['Телефония не подключена', 'No telephony connected'],
  "Bu loyihada qo'ng'iroqlar manbasi yo'q. Bitrix24 telefoniyasi yoki OnlinePBX ulanganda qo'ng'iroqlar shu yerda ko'rinadi.": [
    'В этом проекте нет источника звонков. Когда подключите телефонию Bitrix24 или OnlinePBX, звонки появятся здесь.',
    'This project has no call source. Once Bitrix24 telephony or OnlinePBX is connected, calls appear here.',
  ],

  // Taqsimot in a live project
  "Ko'rish rejimi.": ['Режим просмотра.', 'View only.'],
  "Foizlar va dam olish kunlarini Data365 Studio'dan o'zgartirish mumkin.": ['Проценты и выходные меняются в Data365 Studio.', 'Shares and days off are changed in Data365 Studio.'],
  "Sonlar o'zi yangilansin": ['Цифры обновляются сами', 'Numbers update by themselves'],
} satisfies Dict
