import type { Dict } from '@/i18n'

/** Questions as an essay: the story card, «Ha, to'g'ri» / «O'zgartirish», Nova's own-words box with «Tasdiqlash», kept drafts. */
export default {
  "Ha, to'g'ri": ['Да, верно', "Yes, that's right"],
  'Sizning tanlovingiz': ['Ваш выбор', 'Your choice'],
  "O'z so'zlaringiz bilan tushuntiring": ['Объясните своими словами', 'Explain in your own words'],
  'Oldingilari ({n})': ['Ранние ({n})', 'Earlier ({n})'],
  'Navbatda — Nova tez orada javob beradi…': ['В очереди — Nova скоро ответит…', 'In line — Nova will answer shortly…'],
  'Bu javob allaqachon tasdiqlangan': ['Этот ответ уже подтверждён', 'This answer is already confirmed'],
  "Yo'q, boshqacha": ['Нет, иначе', 'No, it’s different'],
  'Nova taklifi tasdiqlashni kutmoqda': ['Предложение Nova ждёт подтверждения', 'Nova’s proposal is waiting for confirmation'],
  // deal.paymentDate: which field(s) give a payment's date, in order
  "To'lov sanasi qaysi maydondan olinsin?": ['Из какого поля брать дату оплаты?', 'Which field gives the payment date?'],
  "Birinchi to'ldirilgani olinadi": ['Берётся первое заполненное', 'The first filled one is taken'],
  "To'lovlar va tushum shu sanaga qarab kunlarga bo'linadi. Bir nechta maydon tanlansa, birinchi to'ldirilgani olinadi; hech biri to'ldirilmasa — o'tib ketgan yopilish sanasi.": [
    'Оплаты и выручка распределяются по дням по этой дате. Если выбрать несколько полей, берётся первое заполненное; если ни одно не заполнено — прошедшая дата закрытия.',
    'Payments and revenue are put on days by this date. With several fields the first filled one is taken; with none filled, the close date when it is in the past.',
  ],
  // any longer list gets the search; an ordered choice its ↑ / ↓
  'Qidiring…': ['Поиск…', 'Search…'],
  "«{q}» bo'yicha hech narsa topilmadi": ['По «{q}» ничего не найдено', 'Nothing found for «{q}»'],
  Yuqoriga: ['Выше', 'Move up'],
  Pastga: ['Ниже', 'Move down'],
} satisfies Dict
