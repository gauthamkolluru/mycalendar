# mycalendar

A personal desk calendar for [calendar.thegauthams.com](https://calendar.thegauthams.com). It opens on the current month. Click a day to write notes, the way you would on paper.

Hosting uses the same Netlify account as [thegauthams.com](https://thegauthams.com). The free plan is enough: static site, one function, and Blobs storage. There is no database bill.

## Daily use

- The page is the month. Other-month dates are faded.
- Click a square to add or remove notes.
- Use `‹` `›` to turn the page.
- Sign in with your password. Each person sees only their own notes.
- After sign-in, use the bell to allow browser reminders. At **11:00 America/New_York** (Eastern, DST-aware), the open tab notifies you if today has notes or a holiday.

## Local

```bash
cp .env.example .env
```

Set `CALENDAR_GAUTHAM_PASSWORD`, `CALENDAR_WIFE_PASSWORD`, and a 32+ character `CALENDAR_SESSION_SECRET`. Then:

```bash
npm install
npm test
npx netlify-cli dev
```

`npm start` only serves the page. The API needs `netlify-cli dev`.

## Host on Netlify (free)

Production site: **thegauthams-calendar** (`https://thegauthams-calendar.netlify.app`), connected to this GitHub repo. Do not point this repo at thegauthams.com.

After a push to `main`, Netlify builds with `npm test && npm run build` and publishes `dist`.

Site environment variables (Site configuration → Environment variables):

- `CALENDAR_GAUTHAM_PASSWORD` — Gautham's password
- `CALENDAR_WIFE_PASSWORD` — her password
- `CALENDAR_SESSION_SECRET` — a long random string, at least 32 characters

Custom domain: add `calendar.thegauthams.com` on **thegauthams-calendar** (not on thegauthams.com). DNS for `thegauthams.com` is already on Netlify, so the subdomain can be attached in that site's domain settings.

## Layout

- `lib/` — calendar math, validation, auth, storage helpers, API
- `src/` — page UI
- `.codebase-graph/` — symbol graph used by agents
- `CODEBASE_INDEX.md` — short symbol lookup
- `netlify/functions/api.js` — production entry
- `tests/` — Vitest
