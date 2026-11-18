import type { Dict } from '@/i18n'

/** Colleagues on one project's code: the editor role ("Muharrir"), session authors, renaming a chat (features/auth/roles.ts, features/edit/Team.tsx). */
export default {
  Muharrir: ['Редактор', 'Editor'],
  Boshqaruvchi: ['Управляющий', 'Manager'],
  "Boshqaruvchi qilish (Data365 loyihalari bilan hamma narsa)": ['Сделать управляющим (всё с проектами Data365)', 'Make a manager (everything with Data365 projects)'],
  "Data365 loyihalari bilan hamma narsa: kod, serverga nashr, orqaga qaytarish, serverlar va ma'lumotlar. AI sozlamalari va foydalanuvchilar — faqat egasida.": ['Всё с проектами Data365: код, публикация на сервер, откат, серверы и данные. Настройки ИИ и пользователи — только у владельца.', 'Everything with Data365 projects: code, deploy, rollback, servers and data. AI settings and users stay the owner\'s.'],
  "A'zo qila oladigan hamma narsa + Data365 loyihalari kodini Nova bilan o'zgartirib, GitHub'ga yuboradi. Serverga nashr qilish, orqaga qaytarish va push bilan o'zi nashr bo'ladigan loyihalarga yuborish — faqat egasida.": [
    'Всё, что может участник, + меняет код проектов Data365 вместе с Nova и отправляет в GitHub. Публикация на сервер, откат и отправка в проекты, которые публикуются сами при push, — только у владельца.',
    'Everything a member can do, plus changing Data365 projects’ code with Nova and pushing it to GitHub. Publishing to the server, rolling back and pushing to projects that publish on push stay with the owner.',
  ],
  "Bu loyihada GitHub'ga yuborish saytni darhol yangilaydi — qo'llashni egasi qiladi. Tayyor o'zgarishni unga ko'rsating.": [
    'В этом проекте отправка в GitHub сразу обновляет сайт — применяет владелец. Покажите ему готовое изменение.',
    'In this project pushing to GitHub updates the site at once — the owner applies it. Show them the ready change.',
  ],
  '{name} endi: {role}': ['{name} теперь: {role}', '{name} is now: {role}'],
  "A'zo qilish (kodni o'zgartirmaydi)": ['Сделать участником (не меняет код)', 'Make a member (no code changes)'],
  "Muharrir qilish (loyiha kodini o'zgartiradi)": ['Сделать редактором (меняет код проектов)', 'Make an editor (changes project code)'],
  "Nom 1–{n} belgi bo'lsin, < va > belgilarisiz": ['Название — от 1 до {n} символов, без < и >', 'The name must be 1–{n} characters, without < or >'],
  'Nomi saqlandi': ['Название сохранено', 'Name saved'],
  'Bu suhbatni faqat uni boshlagan odam yoki egasi qayta nomlaydi': [
    'Переименовать беседу может только тот, кто её начал, или владелец',
    'Only the person who started this chat or the owner can rename it',
  ],
  'Suhbat nomi': ['Название беседы', 'Chat name'],
  'Saqlash (Enter)': ['Сохранить (Enter)', 'Save (Enter)'],
  'Bekor qilish (Esc)': ['Отмена (Esc)', 'Cancel (Esc)'],
  'Enter — saqlash · Esc — bekor qilish': ['Enter — сохранить · Esc — отмена', 'Enter — save · Esc — cancel'],
  'Qayta nomlash': ['Переименовать', 'Rename'],
  'Boshqalar ham tahrirlayapti': ['Другие тоже редактируют', 'Others are editing too'],
  'Shu loyihada hozir': ['Сейчас в этом проекте', 'On this project now'],
  '{name} ham tahrirlayapti': ['{name} тоже редактирует', '{name} is editing too'],
  "Bu suhbatni {name} boshlagan — siz faqat ko'rasiz. O'zingiz davom ettirish uchun «Yangi suhbat» oching.": [
    'Эту беседу начал(а) {name} — вы можете только смотреть. Чтобы продолжить самому, откройте «Новую беседу».',
    '{name} started this chat — you can only view it. To carry on yourself, open a “New chat”.',
  ],
  "Bu suhbatni egasi boshlagan — siz faqat ko'rasiz. O'zingiz davom ettirish uchun «Yangi suhbat» oching.": [
    'Эту беседу начал владелец — вы можете только смотреть. Чтобы продолжить самому, откройте «Новую беседу».',
    'The owner started this chat — you can only view it. To carry on yourself, open a “New chat”.',
  ],
  "Nomi yoki so'rov bo'yicha qidirish": ['Поиск по названию или запросу', 'Search by name or request'],
  "Nomi, birinchi xabar yoki muallif bo'yicha qidirish": ['Поиск по названию, первому сообщению или автору', 'Search by name, first message or author'],
  "{name}ning o'zgarishi nashrni kutmoqda": ['Правка {name} ждёт публикации', "{name}'s change is waiting to be published"],
  "{name}ning o'zgarishi nashr qilinmoqda": ['Правка {name} публикуется', "{name}'s change is being published"],
  'Tarixdan qidirish': ['Поиск по истории', 'Search the history'],
  '{name} uchun Nova ishlayapti': ['Nova работает для {name}', 'Nova is working for {name}'],
  '{name} tahrirlash oynasida': ['{name} в редакторе', '{name} is in the editor'],
} satisfies Dict
