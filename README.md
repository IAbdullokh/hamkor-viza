# Hamkor viza

The «Hamkor viza» dashboard as a standalone web app (React + TypeScript + Vite), plus the Data365 Studio backup of the
project. Open this folder in VS Code, run it, change it, deploy it — it is yours.

> **Studio's editor no longer controls this copy.** Block edits, added charts, filters and the background made in Studio
> after this copy was written do not reach it, and changes here never flow back into Studio. The numbers themselves still
> come live from the published server (`https://hamkor-viza.data365dashboard.uz`).

- Project: `p_lmyys54pi6h4` · Dashboard: `hamkor-viza` · Pages: lead, calls, hisobot, taqsimot

## Run it

Needs Node.js 20.19+.

```bash
npm install
npm run dev:demo   # demo data from Studio's generator — no server, no login, no client data
npm run dev        # live data from https://hamkor-viza.data365dashboard.uz — sign in with the dashboard's viewer login
```

Both open http://localhost:5173. `npm run dev` forwards `/api` to the published server (see `vite.config.ts`), so the
dashboard's own login card appears first; use the viewer login the dashboard owner gave you (Studio → the dashboard →
«Kirish»). The session cookie stays on localhost only.

Optional, offline on real numbers: put `VIEWER_LOGIN` / `VIEWER_PASSWORD` into `.env.local` (copy `.env.example`), run
`npm run snapshot` (saves into `data/`, which is gitignored — it is client data, never commit it), then
`npm run dev:snapshot`.

Other commands: `npm run typecheck`, `npm test`, `npm run build`, `npm run preview`.

## Where things live

| Path | What |
| --- | --- |
| `src/config/project.gen.ts` | name, slug, industry words, base look, **the pages and their order**, the published address |
| `src/config/blocks.gen.ts` | **block edits**: hidden, renamed, resized, coloured blocks, table columns (block id = `<page>:<kind>:<title>`) |
| `src/config/charts.gen.ts` | charts added with «+ Grafik», per page |
| `src/config/filters.gen.ts` | filters added with «+ Filtr», per page |
| `src/config/prefs.gen.ts` | background («Fon»: `liquid`, `white`, `gray`, `dark` …) and `realtime: true` (new numbers apply at once) |
| `src/app/` | this app's own shell: entry, sidebar, dashboard page, login card, the API layer (`api.ts`), data mode |
| `src/pages/<page>/` | the page components (Lidlar, Qo'ng'iroqlar, Kunlik hisobot, Taqsimot …) |
| `src/kit/`, `src/ui/`, `src/charts/` | the Liquid Glass building blocks: cards, tables, drill-downs, filters, charts |
| `src/styles/`, `src/ds/looks/`, `src/shell/ThemeController.tsx` | theme tokens, glass, light/dark, the viewer's «Ko'rinish» |
| `src/data/` | data layer: `source.tsx` (live snapshot or demo generator), `generate.ts` (demo data) |
| `src/i18n/` | Uzbek / Russian / English texts |

The Liquid Glass code is copied from Data365 Studio as it was when this copy was written.

## Changing a page or a block

- **Hide a block**: in `src/config/blocks.gen.ts` add `"<block id>": { "hidden": true }`. Ids look like
  `lead:card:utm bo'yicha` (page `lead`, a card titled «UTM bo'yicha»). Remove the line to show it again.
- **Rename / resize**: `{ "title": "New name" }`, `{ "span": 6 }` (width in a 12-column grid), `{ "h": "compact" }` or
  `"tall"`, `{ "color": "green" }`.
- **Remove a page or change the order**: edit `pages` in `src/config/project.gen.ts` and the matching line in
  `src/app/pages.gen.ts`. Add a page the same way (`deal`, `kampaniyalar`, `reja` … — the component must exist in
  `src/pages/`; copy it from Data365 Studio if it is not here).
- **Change what a page shows**: edit its component in `src/pages/<page>/` like any React code.

`npm run dev` reloads on save.

## Build and deploy

```bash
npm run build      # → dist/ (static files: index.html + assets)
```

`dist/` is a static site (hash routes, relative paths): any static host serves it. The app calls **same-origin `/api`**,
and the live API (with the viewer's cookie session) is on the published server, so pick one:

1. **Simplest — serve `dist/` from the dashboard's own domain** (`hamkor-viza.data365dashboard.uz`): put the files where that server serves the
   dashboard's web files; `/api` is already there, nothing else to set.
2. **Your own domain with a reverse proxy**: serve `dist/` and forward `/api/` to `https://hamkor-viza.data365dashboard.uz/api/`. nginx:

   ```nginx
   location / { root /var/www/hamkor-viza; try_files $uri /index.html; }
   location /api/ {
     proxy_pass https://hamkor-viza.data365dashboard.uz/api/;
     proxy_set_header Host hamkor-viza.data365dashboard.uz;
     proxy_ssl_server_name on;
     proxy_buffering off;          # the live «Yangi ma'lumot bor» stream
     proxy_cookie_domain hamkor-viza.data365dashboard.uz $host;
   }
   ```
3. Calling the server cross-origin (`VITE_API_DIRECT=1` at build time) works only if that server allows CORS with
   credentials for your domain; it does not by default.

`npm run build:demo` builds a demo-data version that needs no server at all (for showing the look).

## Restore in Data365 Studio (backup)

This repository is also the project's Studio backup:

- `project.json` — the project, dashboard and connections (no keys)
- `questions.json` — the questions and answers
- `dashboard/state/` — plans and module values
- `kv/` — block edits, added charts and filters, background
- `files/` — project files

1. Studio → Loyihalar → «GitHub'dan tiklash» → choose this repository.
2. Re-enter the connection keys (Bitrix24 webhook and others) — they are never stored here.
3. Press «Yangilash»: the data is loaded from the source again.

Client data (leads, deals, calls), uploaded files, logins and any key or password are never stored in this repository.

## Qisqacha (o'zbekcha)

Bu — «Hamkor viza» dashbordining alohida ilovasi (React + TypeScript + Vite) va loyihaning Studio zaxirasi.
`npm install`, so'ng `npm run dev:demo` (namunaviy ma'lumot, login kerak emas) yoki `npm run dev` (jonli ma'lumot,
dashbordning ko'ruvchi logini bilan kiriladi). Sahifalar va bloklar `src/config/` ichida: blokni yashirish, nomini
o'zgartirish yoki sahifalar tartibi shu fayllarda. `npm run build` → `dist/` — eng oddiy joylash: `dist/`ni dashbordning
o'z domenida (`hamkor-viza.data365dashboard.uz`) yoki `/api`ni shu serverga uzatadigan reverse proxy ortida xizmat qilish. Studio muharriri bu
nusxani endi boshqarmaydi; bu yerdagi o'zgarishlar Studio'ga qaytmaydi. Mijoz ma'lumotlari repozitoriyda saqlanmaydi
(`data/` gitignore'da).
