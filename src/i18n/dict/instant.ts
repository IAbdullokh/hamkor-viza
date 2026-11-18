import type { Dict } from '@/i18n'

/** "Tezkor yangilanish": the Bitrix24 outbound webhook box and the dashboard strip (features/instant). */
export default {
  "Token noto'g'ri ko'rinadi — Bitrix24 ko'rsatgan «Tokenni» to'liq nusxalang": [
    'Токен выглядит неверно — скопируйте «Токен» из Bitrix24 полностью',
    'The token looks wrong — copy the whole «Token» Bitrix24 shows',
  ],
  "Saqlandi — nashr qilingan serverga keyingi nashrda o'tadi": ['Сохранено — на опубликованный сервер попадёт при следующей публикации', 'Saved — it reaches the published server with the next publish'],
  'Tezkor yangilanish ulandi': ['Мгновенное обновление подключено', 'Instant updates connected'],
  "O'chirib bo'lmadi": ['Не удалось отключить', 'Could not turn it off'],
  'Tezkor yangilanish': ['Мгновенное обновление', 'Instant updates'],
  "Bitrix24'da lid yoki sdelka o'zgarishi bilan dashbord bir necha soniyada yangilanadi. Buning uchun ikkinchi kalit — chiquvchi vebhuk kerak.": [
    'Как только в Bitrix24 меняется лид или сделка, дашборд обновляется за несколько секунд. Для этого нужен второй ключ — исходящий вебхук.',
    'When a lead or deal changes in Bitrix24, the dashboard updates within seconds. This needs a second key — the outbound webhook.',
  ],
  'Tezkor yangilanish ulangan': ['Мгновенное обновление подключено', 'Instant updates are on'],
  "Oxirgi o'zgarish keldi: {when}": ['Последнее изменение пришло: {when}', 'Last change received: {when}'],
  "Bitrix24'dan birinchi o'zgarish kutilmoqda — biror lidni o'zgartirib ko'ring.": [
    'Ждём первое изменение из Bitrix24 — попробуйте изменить любой лид.',
    'Waiting for the first change from Bitrix24 — try changing any lead.',
  ],
  "Nashr qilingan dashbordga keyingi «Qayta nashr qilish»da o'tadi.": [
    'На опубликованный дашборд попадёт при следующем «Опубликовать снова».',
    'It reaches the published dashboard with the next «Publish again».',
  ],
  "Bu kalitni kiritmasangiz, yangilanish qo'lda bo'ladi: dashbordga har kirganingizda «Yangilash»ni bosib yangi ma'lumotlarni olasiz (aks holda ular har 15 daqiqada keladi).": [
    'Без этого ключа обновление ручное: при каждом входе в дашборд нажимайте «Обновить», чтобы получить новые данные (иначе они приходят каждые 15 минут).',
    'Without this key updates are manual: each time you open the dashboard, press «Refresh» to get new data (otherwise it arrives every 15 minutes).',
  ],
  "Bitrix24'da: Ilovalar → Dasturchilar uchun → Boshqa → «Chiquvchi vebhuk».": [
    'В Bitrix24: Приложения → Разработчикам → Другое → «Исходящий вебхук».',
    'In Bitrix24: Applications → Developer resources → Other → «Outbound webhook».',
  ],
  "«Ishlovchi manzili» maydoniga shu havolani qo'ying:": ['В поле «URL вашего обработчика» вставьте эту ссылку:', 'Paste this link into «Your handler URL»:'],
  'Havola nashr serveri sozlangach chiqadi (Nashr qilish → Nashr serveri).': [
    'Ссылка появится после настройки сервера публикации (Опубликовать → Сервер публикации).',
    'The link appears once the publishing server is set up (Publish → Publishing server).',
  ],
  "Hodisalarni belgilang: lid va sdelka — qo'shilganda, o'zgarganda, o'chirilganda. Saqlang.": [
    'Отметьте события: лид и сделка — создание, изменение, удаление. Сохраните.',
    'Tick the events: lead and deal — added, changed, deleted. Save.',
  ],
  "Bitrix24 ko'rsatgan «Token»ni shu yerga qo'ying:": ['Вставьте сюда «Токен приложения», который показал Bitrix24:', 'Paste the application «Token» Bitrix24 shows here:'],
  "Yangilanish qo'lda: yangi ma'lumot uchun «Yangilash»ni bosing. Tezkor yangilanishni ulasangiz, o'zgarishlar soniyalarda keladi.": [
    'Обновление ручное: для новых данных нажмите «Обновить». С мгновенным обновлением изменения приходят за секунды.',
    'Updates are manual: press «Refresh» for new data. With instant updates, changes arrive in seconds.',
  ],
} satisfies Dict
