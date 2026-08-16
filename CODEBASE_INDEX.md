# Codebase index

| Symbol | Location | Responsibility | Relations |
|---|---|---|---|
| `buildMonthGrid` | `lib/calendar.js:30` | Sunday-start month page, including faded overflow days | used by `src/main.js`, tests |
| `holidayName` | `lib/calendar.js:60` | Desk-calendar US observance label for an ISO date | used by `src/main.js`, tests |
| `shiftMonth` | `lib/calendar.js:25` | Previous/next month | used by `buildMonthGrid`, `src/main.js` |
| `todayParts` | `lib/calendar.js:9` | Local-calendar year/month/day | used by `src/main.js` |
| `validateIsoDate` | `lib/validate.js:6` | Rejects non-existent calendar dates | used by `lib/api.js` |
| `validateTaskText` | `lib/validate.js:19` | Trims notes; rejects empty/oversized text | used by `lib/api.js` |
| `parseYearMonth` | `lib/validate.js:31` | Parses `YYYY-MM` | used by `lib/api.js` |
| `passwordsMatch` | `lib/auth.js:6` | Timing-safe password compare | used by `lib/api.js` |
| `signSession` / `verifySession` | `lib/auth.js:14` / `:20` | HMAC session token | used by `lib/api.js` |
| `handleRequest` | `lib/api.js:26` | Session + notes HTTP API | used by Netlify function, tests |
| `memoryBlobStore` | `lib/store.js:1` | In-memory Blobs stand-in | tests |
| `readMonth` / `writeMonth` | `lib/store.js:15` / `:21` | Month JSON in a blob store | used by `lib/api.js` |
| `logger` | `lib/logger.js:13` | JSON logs with a scope | used by API and UI |
| `api` | `src/client.js:34` | Browser fetch helper | used by `src/main.js` |
| `boot` | `src/main.js:32` | Session check, current month, first paint | page entry |
| `lockButton` | `src/main.js:99` | Ends the session and hides notes | used by `header` |
| Netlify function | `netlify/functions/api.js:4` | Production `/api/*` entry using Netlify Blobs | calls `handleRequest` |
