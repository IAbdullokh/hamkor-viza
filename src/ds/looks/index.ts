import { registerDS } from '../registry'
import { bentoChart, bentoOption, glassProChart, glassProOption, klassikChart, klassikOption, midnightChart, midnightOption, minimalChart, minimalOption } from './charts'
import { makeCard, makeStatCard } from './parts'
import './looks.css'

/** The newer own-data looks (import once from main.tsx). Liquid Glass needs no entry: it is the default. */
registerDS('bento', { Card: makeCard('bento'), StatCard: makeStatCard('bento'), chartTheme: bentoChart, option: bentoOption })
registerDS('midnight', { Card: makeCard('midnight'), StatCard: makeStatCard('midnight'), chartTheme: midnightChart, option: midnightOption, tableBars: true })
registerDS('minimal', { Card: makeCard('minimal'), StatCard: makeStatCard('minimal'), chartTheme: minimalChart, option: minimalOption })
registerDS('glasspro', { Card: makeCard('glasspro'), StatCard: makeStatCard('glasspro'), chartTheme: glassProChart, option: glassProOption })
registerDS('klassik', { Card: makeCard('klassik'), StatCard: makeStatCard('klassik'), chartTheme: klassikChart, option: klassikOption })
