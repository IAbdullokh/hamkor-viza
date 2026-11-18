import type { Dict } from '@/i18n'

/** Stage groups straight from Bitrix24, the owner's own "Sifatli lid", visit questions only where clients come in. */
export default {
  // Questions step: the Bitrix summary
  "Bosqichlar Bitrix'dan olindi": ['Этапы взяты из Bitrix24', 'Stages taken from Bitrix24'],
  "Har bosqich jarayondami, muvaffaqiyatlimi yoki bekormi — buni Bitrix24 o'zi belgilaydi, savol bermaymiz. Kerak bo'lsa, istalgan bosqichni boshqa guruhga o'tkazing.": [
    'В работе этап, успешный или провальный — это отмечает сам Bitrix24, поэтому мы не спрашиваем. Если нужно, перенесите любой этап в другую группу.',
    "Whether a stage is in process, successful or lost is marked by Bitrix24 itself, so we don't ask. If needed, move any stage to another group.",
  ],
  "Bitrix'dan olindi: {p} jarayonda · {s} muvaffaqiyatli · {f} bekor/sifatsiz": [
    'Из Bitrix24: {p} в работе · {s} {s|успешный|успешных|успешных} · {f} отказ/некачественный',
    'From Bitrix24: {p} in process · {s} successful · {f} lost/junk',
  ],
  "Bitrix'dan olindi: {p} jarayonda · {s} muvaffaqiyatli · {f} bekor": ['Из Bitrix24: {p} в работе · {s} {s|успешный|успешных|успешных} · {f} {f|провальный|провальных|провальных}', 'From Bitrix24: {p} in process · {s} successful · {f} lost'],
  "{n} tasi Bitrix'dan farqli — sizning javobingiz bo'yicha": ['{n} — не так, как в Bitrix24: по вашему ответу', "{n} differ from Bitrix24 — as you answered"],
  "{n} tasiga o'z nomingizni bergansiz": ['{n} — с вашим собственным названием', '{n} carry your own name'],
  "Saqlanmagan o'zgarishlar bor": ['Есть несохранённые изменения', 'There are unsaved changes'],

  // the override list: every option says its group
  'Jarayonda · yangi lid': ['В работе · новый лид', 'In process · new lead'],
  'Jarayonda · tashrif belgilandi': ['В работе · визит назначен', 'In process · visit booked'],
  'Jarayonda · kelishuv': ['В работе · договорились', 'In process · agreed'],
  "Bekor bo'ldi · arxiv": ['Отказ · архив', 'Lost · archive'],
  "Hali yakunlanmagan lid, voronkaning boshi. «Jarayonda» kartasida sanaladi.": ['Лид ещё не закрыт, начало воронки. Считается в карточке «В работе».', 'An open lead at the start of the funnel. Counted on the "In process" card.'],
  "Hali yakunlanmagan lid. «Jarayonda» kartasida sanaladi.": ['Лид ещё не закрыт. Считается в карточке «В работе».', 'An open lead. Counted on the "In process" card.'],
  "Hali yakunlanmagan, mijoz kelishga rozi bo'lgan lid. «Jarayonda» va «Tashrif belgilandi» kartalarida sanaladi.": [
    'Лид ещё не закрыт, клиент согласился прийти. Считается в карточках «В работе» и «Визит назначен».',
    'An open lead whose client agreed to come. Counted on the "In process" and "Visit booked" cards.',
  ],
  "Sdelka jarayonda, mijoz bilan kelishildi.": ['Сделка в работе, с клиентом договорились.', 'The deal is in process, agreed with the client.'],
  "Muvaffaqiyatli yakunlangan. Sotuv va yakuniy konversiyada sanaladi.": ['Успешно закрыт. Считается в продажах и итоговой конверсии.', 'Closed successfully. Counted in sales and the final conversion.'],
  "Mijoz rad etdi yoki bekor bo'ldi. «Bekor bo'ldi» kartasida sanaladi.": ['Клиент отказался или отменил. Считается в карточке «Отказ».', 'The client refused or cancelled. Counted on the "Lost" card.'],
  "Haqiqiy lid emas (spam, xato raqam). «Sifatsiz» kartasida sanaladi.": ['Не настоящий лид (спам, ошибочный номер). Считается в карточке «Некачественные».', 'Not a real lead (spam, wrong number). Counted on the "Junk" card.'],
  "Chetga olib qo'yilgan — «Bekor bo'ldi»da sanaladi.": ['Отложен — считается в «Отказ».', 'Parked — counted under "Lost".'],

  // own words
  'Portalda: «{x}»': ['На портале: «{x}»', 'On the portal: "{x}"'],
  '«{x}» nomini olib tashlash': ['Убрать название «{x}»', 'Remove the name "{x}"'],
  "Qo'llash: «{name}» · {x} guruhida": ['Применить: «{name}» · в группе «{x}»', 'Apply: "{name}" · in "{x}"'],

  // the questions
  'Qaysi bosqichlar sifatli lid hisoblanadi?': ['Какие этапы считаются качественным лидом?', 'Which stages count as a qualified lead?'],
  "Buni o'zingiz belgilaysiz — biz oldindan belgilamadik. Lid shu bosqichlardan biriga bir marta yetsa ham sifatli sanaladi.": [
    'Это отмечаете вы сами — мы ничего не отметили заранее. Лид считается качественным, если хоть раз дошёл до одного из этих этапов.',
    "You choose this yourself — we haven't ticked anything. A lead counts as qualified once it reached any of these stages.",
  ],
  'Qaysilari sifatsiz lid?': ['Какие из них — некачественные лиды?', 'Which of these are junk leads?'],
  "Bitrix24 bu bosqichlarni «muvaffaqiyatsiz» deb biladi, nomidan esa aniq emas. Belgilanganlari «Sifatsiz», qolganlari «Bekor bo'ldi» bo'ladi.": [
    'Bitrix24 считает эти этапы провальными, но по названию не ясно. Отмеченные станут «Некачественные», остальные — «Отказ».',
    'Bitrix24 marks these stages as failures, but the names don\'t say which kind. Ticked ones become "Junk", the rest "Lost".',
  ],
  'Qaysi bosqichlar — mijoz keldi («Tashrif buyurdi»)?': ['Какие этапы означают, что клиент пришёл («Визит состоялся»)?', 'Which stages mean the client came ("Visited")?'],
  'Bosqich nomlari va muvaffaqiyatli bosqichdan taxmin qildik': ['Предположили по названиям этапов и успешному этапу', 'Guessed from the stage names and the success stage'],
  "Har biznesda «sifatli» o'zgacha, shuning uchun buni siz belgilaysiz. Belgilamasangiz, «Sifatli lid» kartasida «Belgilanmagan» deb turadi — noto'g'ri 0 emas. Keyin ham o'zgartirsa bo'ladi.": [
    'В каждом бизнесе «качественный» значит своё, поэтому это отмечаете вы. Пока не отмечено, карточка «Качественный лид» показывает «Не задано» — а не ложный 0. Изменить можно и позже.',
    'Every business means something different by "qualified", so you choose it. Until you do, the "Qualified lead" card says "Not set" — not a misleading 0. You can change it later too.',
  ],
  "«Sifatsiz lid» va «Bekor bo'ldi» kartalari alohida sanaladi. Faqat nomidan ajratib bo'lmagan bosqichlarni so'raymiz.": [
    'Карточки «Некачественный лид» и «Отказ» считаются отдельно. Спрашиваем только про этапы, которые нельзя различить по названию.',
    'The "Junk lead" and "Lost" cards are counted separately. We only ask about stages whose names don\'t tell.',
  ],
  "Mijozlaringiz keladigan biznes uchun: «Tashrif buyurdi» kartasi va yakuniy konversiya shundan hisoblanadi.": [
    'Для бизнеса, куда приходят клиенты: отсюда карточка «Визит состоялся» и итоговая конверсия.',
    'For a business clients come to: the "Visited" card and the final conversion come from this.',
  ],
  "Ko'pincha: {list}": ['Обычно: {list}', 'Usually: {list}'],
  "Buni o'zingiz belgilaysiz. Belgilamasangiz, dashbordda «Belgilanmagan» deb turadi — keyin ham belgilash mumkin.": [
    'Это отмечаете вы сами. Пока не отмечено, на дашборде будет «Не задано» — отметить можно и позже.',
    'You choose this yourself. Until you do, the dashboard says "Not set" — you can choose later too.',
  ],
  'Keyinroq belgilayman': ['Отмечу позже', "I'll choose later"],

  // the dashboard
  belgilash: ['задать', 'set it'],
  "Qaysi bosqichlar sifatli lid ekanini hali belgilamagansiz — belgilagach, karta hisoblanadi.": [
    'Вы ещё не отметили, какие этапы считаются качественным лидом — после этого карточка посчитается.',
    "You haven't chosen which stages count as a qualified lead yet — once you do, the card is counted.",
  ],
  'Muvaffaqiyatli ÷ Umumiy lid': ['Успешные ÷ Всего лидов', 'Succeeded ÷ Total leads'],
  'Muvaffaqiyatli yakunlangan lidlar ÷ Umumiy lid': ['Успешно закрытые лиды ÷ Всего лидов', 'Leads closed successfully ÷ Total leads'],
  'Konversiya = Muvaffaqiyatli ÷ Umumiy lid': ['Конверсия = Успешные ÷ Всего лидов', 'Conversion = Succeeded ÷ Total leads'],
} satisfies Dict
