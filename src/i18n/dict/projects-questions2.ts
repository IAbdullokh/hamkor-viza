import type { Dict } from '@/i18n'

/** Questions round 2: sales pipelines first, grouped stage pickers with a filter, the Central Bank rate, sections, periods. */
export default {
  // pipelines first
  'Qaysi voronkalar sotuv?': ['Какие воронки — продажи?', 'Which pipelines are sales?'],
  "Keyingi savollar va dashborddagi sotuv faqat shu voronkalar bo'yicha hisoblanadi": ['Следующие вопросы и продажи на дашборде считаются только по этим воронкам', 'The next questions and the sales on the dashboard count only these pipelines'],
  'Belgilanmagan voronkalar sotuv, tushum, konversiya va menejerlar reytingiga kirmaydi (masalan, ishga olish yoki sifat nazorati).': ['Неотмеченные воронки не входят в продажи, выручку, конверсию и рейтинг менеджеров (например, найм или контроль качества).', 'Unticked pipelines are left out of sales, revenue, conversion and the manager ranking (hiring or quality control, for example).'],
  // Kelishuv
  'Qaysi bosqichdan mijoz bilan kelishilgan hisoblanadi?': ['С какого этапа считается, что с клиентом договорились?', 'From which stage is the client counted as agreed?'],
  "Har voronkadan bitta bosqich tanlang — undan keyingilari ham «Kelishuv» sanaladi": ['Выберите по одному этапу в каждой воронке — следующие за ним тоже считаются «Договорённостью»', 'Pick one stage per pipeline — the stages after it count as «Agreed» too'],
  "«Kelishuv» kartasi va hisobotdagi kelishilgan sdelkalar shu bosqichdan sanaladi. Belgilamasangiz, kelishuv sanalmaydi.": ['Карточка «Договорённость» и договорённые сделки в отчёте считаются с этого этапа. Если не отметить, договорённости не считаются.', 'The «Agreed» card and the agreed deals in the report count from this stage. Leave it empty and nothing counts as agreed.'],
  'Kelishilgan sdelkalar': ['Договорённые сделки', 'Agreed deals'],
  // result lines with their period
  'oxirgi {days} kunda yaratilgan {total} liddan {value}': ['из {total} {total|лида|лидов|лидов}, созданных за последние {days} {days|день|дня|дней}: {value}', 'of {total} {total|lead|leads} created in the last {days} {days|day|days}: {value}'],
  'oxirgi {days} kunda yopilgan {total} sdelkadan {value} tasi sotildi': ['из {total} {total|сделки|сделок|сделок}, закрытых за последние {days} {days|день|дня|дней}, продано {value}', 'of {total} {total|deal|deals} closed in the last {days} {days|day|days}, {value} won'],
  'oxirgi {days} kunda yaratilgan {total} sdelkadan {value}': ['из {total} {total|сделки|сделок|сделок}, созданных за последние {days} {days|день|дня|дней}: {value}', 'of {total} {total|deal|deals} created in the last {days} {days|day|days}: {value}'],
  "oxirgi {days} kundagi {total} qo'ng'iroqdan {value}": ['из {total} {total|звонка|звонков|звонков} за последние {days} {days|день|дня|дней}: {value}', 'of {total} {total|call|calls} in the last {days} {days|day|days}: {value}'],
  'oxirgi {days} kunda': ['за последние {days} {days|день|дня|дней}', 'in the last {days} {days|day|days}'],
  // the question list by section
  'Sdelkalar va voronkalar': ['Сделки и воронки', 'Deals and pipelines'],
  Pul: ['Деньги', 'Money'],
  'Manbalar va reklama': ['Источники и реклама', 'Sources and ads'],
  'Avtomatik aniqlandi': ['Определено автоматически', 'Detected automatically'],
  // currency
  'Dollar kursi': ['Курс доллара', 'Dollar rate'],
  'Avtomatik — Markaziy bank kursi': ['Автоматически — курс Центрального банка', 'Automatic — Central Bank rate'],
  "Har kunning summasi o'sha kungi kurs bilan so'mga aylanadi (cbu.uz)": ['Сумма каждого дня пересчитывается в сумы по курсу того же дня (cbu.uz)', "Each day's amount is converted to UZS at that day's rate (cbu.uz)"],
  "O'z kursim": ['Свой курс', 'My own rate'],
  'Hamma kunlar uchun bitta kurs': ['Один курс для всех дней', 'One rate for every day'],
  "Bugun: 1 USD = {rate} so'm · cbu.uz": ['Сегодня: 1 USD = {rate} сум · cbu.uz', 'Today: 1 USD = {rate} UZS · cbu.uz'],
  "cbu.uz hozir javob bermadi — oxirgi ma'lum kurs: 1 USD = {rate} so'm ({day})": ['cbu.uz сейчас не ответил — последний известный курс: 1 USD = {rate} сум ({day})', 'cbu.uz did not answer — the last known rate: 1 USD = {rate} UZS ({day})'],
  "cbu.uz hozir javob bermadi — vaqtincha 1 USD = {rate} so'm; keyingi qurishda yangilanadi": ['cbu.uz сейчас не ответил — временно 1 USD = {rate} сум; обновится при следующей сборке', 'cbu.uz did not answer — for now 1 USD = {rate} UZS; the next build updates it'],
  // the grouped stage picker
  'Sana maydonlari': ['Поля с датой', 'Date fields'],
  'Voronka {id}': ['Воронка {id}', 'Pipeline {id}'],
  'Bosqichni qidiring…': ['Найдите этап…', 'Find a stage…'],
  'Faqat tanlanganlar': ['Только выбранные', 'Only selected'],
  'Hali hech narsa tanlanmagan': ['Пока ничего не выбрано', 'Nothing selected yet'],
  "«{q}» bo'yicha bosqich topilmadi": ['По запросу «{q}» этапов нет', 'No stage matches «{q}»'],
  '{s} / {n} tanlandi': ['выбрано {s} из {n}', '{s} of {n} selected'],
  'har voronkadan bittadan': ['по одному в каждой воронке', 'one per pipeline'],
  'sonlar butun davr uchun: lid bosqichida — unga yetgan lidlar, voronkada — unga yetgan sdelkalar': ['числа за всё время: у этапа лида — лиды, дошедшие до него, в воронке — сделки, дошедшие до него', 'counts are all-time: for a lead stage the leads that reached it, in a pipeline the deals that reached it'],
  // deal stages: one line per chosen pipeline
  '{n} bosqich: {s} sotildi · {f} bekor · {p} jarayonda': ['{n} {n|этап|этапа|этапов}: {s} продажа · {f} отказ · {p} в работе', '{n} {n|stage|stages}: {s} won · {f} lost · {p} in progress'],
  'Tekshiring: nomi Bitrix belgisiga mos emas — {list}': ['Проверьте: название не совпадает с отметкой Bitrix — {list}', "Check: the name does not match Bitrix's mark — {list}"],
} satisfies Dict
