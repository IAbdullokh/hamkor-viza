import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { setKioskViewer } from '@/features/auth/store'
import { pinViewScope } from '@/lib/viewLook'
import { applyLastTheme } from '@/shell/ThemeController'
import { config } from '@/config'
import { installApi } from './app/api'
import { resolveBoot } from './app/boot'
import { DATA_MODE } from './app/mode'
import { App } from './app/App'
import { LoginScreen, NotFoundScreen } from './app/LoginScreen'
import './styles/index.css'
import './ds/looks'

// every /api call goes through one place: config answers, demo mode, the viewer's cookie session (app/api.ts)
installApi()
// this app is a published dashboard's viewer page: read-only, no Studio sign-in, its own «Ko'rinish» per dashboard
setKioskViewer()
pinViewScope(`live:${config.project.slug}`)
// the theme this browser showed last, before the first frame (no dark flash)
applyLastTheme()
document.title = config.project.name

const root = createRoot(document.getElementById('root')!)
void resolveBoot(DATA_MODE).then((boot) =>
  root.render(<StrictMode>{boot.kind === 'login' ? <LoginScreen name={boot.name} /> : boot.kind === 'unknown' ? <NotFoundScreen /> : <App />}</StrictMode>),
)
