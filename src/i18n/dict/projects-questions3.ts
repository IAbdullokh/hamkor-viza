import type { Dict } from '@/i18n'

/** Questions review (2026-11-04): the deal loss reasons, an empty portal, the users' picker. */
export default {
  // deal.reasons
  "Sdelka bekor bo'lish sabablari qaysi maydonlarda?": ['В каких полях причины отказа по сделкам?', 'Which fields hold the deal loss reasons?'],
  "Bekor bo'lgan sdelkalar sababi shu maydonlardan olinadi": ['Причина проигранной сделки берётся из этих полей', 'The reason of a lost deal comes from these fields'],
  "Sdelka nega bekor bo'lgani yozilgan maydonlar. Sdelkalar sahifasidagi bekor bo'lish sabablari shundan olinadi.": [
    'Поля, где записано, почему сделка проиграна. Причины отказа на странице Сделки берутся отсюда.',
    'The fields that say why a deal was lost. The loss reasons on the Deals page come from them.',
  ],
  // an empty portal
  'Portalda lid yoki sdelka topilmadi': ['На портале не найдено ни лидов, ни сделок', 'No leads or deals were found in the portal'],
  "Portalda lid yoki sdelka borligini tekshirib, ma'lumotlarni qayta yuklang": [
    'Проверьте, что на портале есть лиды или сделки, и загрузите данные заново',
    'Check that the portal has leads or deals and load the data again',
  ],
  // the users' picker
  'Xodimni qidiring…': ['Найдите сотрудника…', 'Find a person…'],
  "«{q}» bo'yicha xodim topilmadi": ['По «{q}» сотрудник не найден', 'No one matches «{q}»'],
} satisfies Dict
