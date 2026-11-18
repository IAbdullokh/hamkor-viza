import type { Dict } from '@/i18n'

/** Comparison bars and ranks in a block's table (features/blockedit: ColumnTools, BlockEditOverlay; kit/DataTable). */
export default {
  "Taqqoslash chizig'i": ['Полоски сравнения', 'Comparison bars'],
  Reyting: ['Рейтинг', 'Rank'],
  "Har bir son ustun eng kattasiga nisbatan chiziq bilan ko'rsatiladi": [
    'Каждое число показано полоской относительно самого большого в столбце',
    'Each number gets a bar against the largest in its column',
  ],
  "Chiziq va eng yuqori 3 ta qiymatga o'rin belgisi": ['Полоски и значок места у трёх самых больших значений', 'Bars plus a place badge on the top 3 values'],
  "{n}-o'rin": ['{n}-е место', 'Place {n}'],
  'Hamma ustunlarga chiziq': ['Полоски во всех столбцах', 'Bars on every column'],
  'Chiziq + reyting': ['Полоски + рейтинг', 'Bars + rank'],
  "Sonlarni bir-biri bilan solishtirish: qaysi biri katta — bir qarashda": [
    'Сравнить числа между собой: какое больше — с одного взгляда',
    'Compare the numbers with each other: which is higher, at a glance',
  ],
  // the progress look (table.barStyle "line", colRules "ring", "Rangli ustunlar"; colstyle.ts)
  "Chiziq ko'rinishi": ['Вид полосок', 'Bar style'],
  'Orqa fon': ['Фон', 'Fill behind'],
  'Ostki chiziq': ['Линия снизу', 'Line under'],
  'Sonning orqasida yumshoq fon': ['Мягкий фон за числом', 'A soft fill behind the number'],
  'Son ostida ingichka chiziq': ['Тонкая линия под числом', 'A thin line under the number'],
  'Foizlar halqada': ['Проценты в кольце', 'Percents as rings'],
  "Foiz ustunlari kichik halqa ichida ko'rsatiladi": ['Столбцы с процентами показаны в маленьком кольце', 'Percent columns are shown in a small ring'],
  "Foiz kichik halqa ichida ko'rsatiladi": ['Процент показан в маленьком кольце', 'The percent is shown in a small ring'],
  Halqa: ['Кольцо', 'Ring'],
  'Rangli ustunlar': ['Цветные столбцы', 'Colourful columns'],
  "Har bir son ustuni o'z rangida: sarlavha, chiziq va halqa": ['Каждый числовой столбец своим цветом: заголовок, линия и кольцо', 'Each number column in its own colour: header, line and ring'],
  'Rangli chiziqli jadval': ['Цветная таблица с линиями', 'Colourful progress table'],
  "Har ustun o'z rangida, son ostida chiziq, foizlar halqada": ['Каждый столбец своим цветом, линия под числом, проценты в кольце', 'Each column in its own colour, a line under the number, percents as rings'],
  "Qiymat yo'q": ['Нет значения', 'No value'],
} satisfies Dict
