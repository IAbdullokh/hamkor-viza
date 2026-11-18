import type { Dict } from '@/i18n'

/** The shared UI kit and chart engine (src/ui/glass.tsx, src/charts/ChartView.tsx, src/charts/options.ts). */
export default {
  // the wait countdown's unit (ui/progress.tsx)
  daqiqa: ['мин', 'min'],
  soat: ['ч', 'h'],
  'Qolgan vaqt': ['Осталось времени', 'Time left'],
  // Liquid Glass amount slider: frosted ↔ clear glass
  Xira: ['Матовое', 'Frosted'],
  Tiniq: ['Прозрачное', 'Clear'],
  // charts
  Boshqalar: ['Прочие', 'Others'],
  'birinchi bosqichdan': ['от первого этапа', 'of the first stage'],
  jamidan: ['от общего', 'of the total'],
  'Dataset topilmadi': ['Набор данных не найден', 'Dataset not found'],
  'oldingi davrga nisbatan': ['к прошлому периоду', 'vs the previous period'],
} satisfies Dict
