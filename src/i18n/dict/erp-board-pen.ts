import type { Dict } from '@/i18n'

/** The board's rail as Miro's, the pen panel and its strokes, «+» (features/erp/board: ToolRail, PenPanel, rail.ts). */
export default {
  // the rail
  "Shakllar va chiziqlar": ['Фигуры и линии', 'Shapes and lines'],
  "Rasm": ['Изображение', 'Image'],
  "Jadval": ['Таблица', 'Table'],
  "Kommentariya": ['Комментарий', 'Comment'],
  // the pen panel
  "Qalam": ['Ручка', 'Pen'],
  "Marker": ['Маркер', 'Highlighter'],
  "Aqlli chizish": ['Умное рисование', 'Smart drawing'],
  "O'chirg'ich": ['Ластик', 'Eraser'],
  "Aniq o'chirg'ich": ['Точный ластик', 'Precision eraser'],
  "Lasso": ['Лассо', 'Lasso'],
  "Chiziq {n}": ['Линия {n}', 'Stroke {n}'],
  // a stroke on the selection bar
  "Juda qalin": ['Очень толстая', 'Extra thick'],
} satisfies Dict
