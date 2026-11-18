import type { Dict } from '@/i18n'

/** Wizard step rail lock reasons (features/projects/wizard/WizardLayout.tsx) and the voice capsule's TTS-limit note. */
export default {
  "Avval manbalarni ulang": ['Сначала подключите источники', 'Connect the sources first'],
  "Avval tuzilmani ko'rib chiqing": ['Сначала просмотрите структуру', 'Review the structure first'],
  "Avval ma'lumotlarni yuklang": ['Сначала загрузите данные', 'Load the data first'],
  "Avval ko'rinishni tanlang": ['Сначала выберите вид', 'Choose the look first'],
  "Avval sahifalarni tanlang": ['Сначала выберите страницы', 'Choose the pages first'],
  "Avval tahlil tugashini kuting": ['Сначала дождитесь окончания анализа', 'Wait for the analysis to finish first'],
  "Avval savollarga javob bering": ['Сначала ответьте на вопросы', 'Answer the questions first'],
  "Avval portalni quring": ['Сначала соберите портал', 'Build the portal first'],
  "Ovoz limiti tugadi — javob matnda": ['Лимит голоса исчерпан — ответ текстом', 'Voice limit reached — the answer is in text'],
} satisfies Dict
