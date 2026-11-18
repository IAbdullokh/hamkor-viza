import type { Dict } from '@/i18n'

/** A table column picked in the zoomed block editor: its toolbar and Nova about it (features/blockedit: ColumnTools, BlockEditOverlay; kit/DataTable). */
export default {
  'Ustunni tanlash': ['Выбрать столбец', 'Select the column'],
  'Tanlangan ustun': ['Выбранный столбец', 'Selected column'],
  'Tanlangan: {name}': ['Выбрано: {name}', 'Selected: {name}'],
  'Tanlovni bekor qilish': ['Снять выбор', 'Clear the selection'],
  'Ustun rangi': ['Цвет столбца', 'Column colour'],
  'Ranglash: qiymatga qarab': ['Раскраска по значению', 'Colour by value'],
  'Kattasi yashilroq, kichigi qizilroq': ['Больше — зеленее, меньше — краснее', 'Higher greener, lower redder'],
  Shkala: ['Шкала', 'Scale'],
  Chegara: ['Порог', 'Threshold'],
  'Yashil: shundan boshlab': ['Зелёный: от этого значения', 'Green: from this value'],
  yashil: ['зелёный', 'green'],
  'Qizil: bundan kichik': ['Красный: меньше этого', 'Red: below this'],
  qizil: ['красный', 'red'],
  Format: ['Формат', 'Format'],
  Kasr: ['Знаки', 'Decimals'],
  Chapga: ['Влево', 'Left'],
  "O'ngga": ['Вправо', 'Right'],
  'Kamayish tartibida': ['По убыванию', 'Descending'],
  "O'sish tartibida": ['По возрастанию', 'Ascending'],
  '«{name}» ustuni haqida': ['о столбце «{name}»', 'about the «{name}» column'],
  "Ustunni tanlang: jadvaldagi sarlavhasini yoki katagini bosing — rangini, formatini o'zgartirasiz yoki Nova'ga shu ustun haqida aytasiz": [
    'Выберите столбец: нажмите на его заголовок или ячейку в таблице — измените цвет, формат или скажите Nova об этом столбце',
    'Pick a column: tap its header or a cell in the table — change its colour or format, or tell Nova about that column',
  ],
  "Masalan: «qizil qil», «foizda ko'rsat», «oxiriga qo'y», «nega 0%?»": [
    'Например: «сделай красным», «покажи в процентах», «в конец», «почему 0%?»',
    'E.g. «make it red», «show as percent», «move to the end», «why 0%?»',
  ],
} satisfies Dict
