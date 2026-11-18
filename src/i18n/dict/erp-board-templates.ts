import type { Dict } from '@/i18n'

/** «Shablonlar»: the template library's kinds and titles (features/erp/board/templates), and the lines of «Siz uchun». The older titles are in erp-board-tools.ts. */
export default {
  // the kinds
  "Jarayon va diagramma": ['Процессы и диаграммы', 'Processes and diagrams'],
  "Audit va tahlil": ['Аудит и анализ', 'Audit and analysis'],
  "Strategiya va reja": ['Стратегия и план', 'Strategy and planning'],
  "Agile": ['Agile', 'Agile'],
  // «Siz uchun»
  "Oxirgi ishlatilganlar": ['Недавно использованные', 'Recently used'],
  "«{soha}» uchun": ['Для сферы «{soha}»', 'For «{soha}»'],
  "Shu mijoz uchun": ['Для этого клиента', 'For this client'],
  "Jarayon konsultanti uchun": ['Для консультанта по процессам', 'For a process consultant'],
  // jarayon va diagramma
  "Qiymat oqimi xaritasi": ['Карта потока создания ценности', 'Value stream map'],
  "SIPOC": ['SIPOC', 'SIPOC'],
  "Ma'lumot oqimi diagrammasi": ['Диаграмма потоков данных', 'Data flow diagram'],
  "Tashkilot tuzilmasi": ['Структура организации', 'Org chart'],
  // audit va tahlil
  "Hozirgi → Kerakli holat": ['Текущее → Целевое состояние', 'Current → Target state'],
  "Talablar kanvasi (TZ)": ['Канвас требований (ТЗ)', 'Requirements canvas (spec)'],
  "ERP modullari xaritasi": ['Карта модулей ERP', 'ERP module map'],
  "5 ta nega": ['5 «почему»', '5 Whys'],
  "Ishikawa baliq skeleti": ['Диаграмма Исикавы (рыбья кость)', 'Fishbone (Ishikawa)'],
  "Og'riq va foyda": ['Боли и выгоды', 'Pains and gains'],
  // strategiya va reja
  "SWOT tahlil": ['SWOT-анализ', 'SWOT analysis'],
  "Biznes-model kanvasi": ['Канвас бизнес-модели', 'Business model canvas'],
  "Lean kanvas": ['Lean-канвас', 'Lean canvas'],
  "OKR: maqsad va natijalar": ['OKR: цели и ключевые результаты', 'OKR: objectives and key results'],
  "Yo'l xaritasi (Gantt)": ['Дорожная карта (Гант)', 'Roadmap (Gantt)'],
  "Ta'sir va harakat matritsasi": ['Матрица влияния и усилий', 'Impact–effort matrix'],
  "Eyzenxauer matritsasi": ['Матрица Эйзенхауэра', 'Eisenhower matrix'],
  // uchrashuv
  "Loyiha kickoff": ['Старт проекта (kickoff)', 'Project kickoff'],
  "Retrospektiva (boshlash, to'xtatish, davom)": ['Ретроспектива (начать, остановить, продолжить)', 'Retrospective (start, stop, continue)'],
  "Fikrlar yig'ini": ['Мозговой штурм', 'Brainstorm'],
  "Qarorlar jurnali": ['Журнал решений', 'Decision log'],
  // agile
  "Sprint doskasi (Kanban)": ['Доска спринта (Канбан)', 'Sprint board (Kanban)'],
  "Sprint rejasi": ['План спринта', 'Sprint plan'],
  "Foydalanuvchi hikoyalari xaritasi": ['Карта пользовательских историй', 'User story map'],
} satisfies Dict
