# Reading Journal Senior — Project Guide

> Always read `PLAN.md` before starting work. Update it after every session.

## Stack
- **Frontend:** Vanilla HTML + JS + CSS (no framework, no build step)
- **Backend:** Express.js (`backend/server.js`, `backend/db.js`)
- **Deadline:** 2026-05-20

## Frontend Structure
```
frontend/
  *.html          — 15 pages (one file per page)
  js/
    ui-helpers.js          — shared: showToast(), showAlert(), showInputModal()
    layoutsidebar.js       — shared: sidebar HTML inject + logout logic
    auth.js                — shared: token check / redirect
    hardcover-api.js       — book search API (used in journal-detail popup)
    journal-detail.js      — main load/save/timer for journal-detail.html
    journal-genre.js       — genre picker widget + lockBookFromAPI / unlockToManualMode
    journal-chapters.js    — chapter manager + see-all modal
    journal-stats.js       — reading stats chart (reads window.JournalApp.currentReadingLogs)
    search-page.js         — search + category browse
    favorite-page.js       — favorites CRUD
    dashboard-page.js      — (inline in HTML, not a separate file)
    seeall.js              — reading log chart page
    manage-pre-book.js     — admin: book management
    manage-pre-author.js   — admin: author management
    manage-pre-genre.js    — admin: genre management
    manageuser.js          — admin: user management
    managereport.js        — admin: bug reports
    login.js / signup.js / report-bug.js
  styles/         — one CSS file per page + shared: styles.css, sidebar.css
```

## Key Patterns

**Shared state (journal-detail):**
`window.JournalApp = { currentReadingLogs, lastSessionSeconds, totalTimeInSeconds }`
Set in `journal-detail.js`, read in `journal-stats.js`.

**Modal patterns (2 exist — don't mix):**
- `popup hidden` class (journal-detail.html) → ui-helpers uses `classList.remove("hidden")` + `style.display = "flex"`
- `.modal { display:none }` CSS (search-page.html) → ui-helpers sets `style.display = "flex"`
- `ui-helpers.showAlert` handles both ✓

**Auth pattern:**
Every page calls `loadUser()` at `DOMContentLoaded`. Token in `localStorage.getItem("token")`. Redirect to `log-in-page.html` on 401.

**API base:**
- Relative paths `/api/...` (Express proxy) — no hardcoded domain needed
- Exception: `favorite-page.js` still has `const API_BASE_URL = 'https://reading-journal.xyz'` — TODO fix

## Known Issues / TODOs
- `search-page.js` line ~507: `openSeeAllModal` uses `grid` instead of `gridEl` (undefined variable bug)
- `favorite-page.js`: `API_BASE_URL` hardcoded — should use relative `/api/...`
- `dashboard-page.html`: logic is inline `<script>` — not extracted to a JS file yet

## File Sizes (before touching, check these)
| File | Lines |
|---|---|
| `js/journal-chapters.js` | 392 |
| `js/journal-detail.js` | 345 |
| `js/search-page.js` | ~545 |
| `js/manage-pre-book.js` | 432 |
| `js/favorite-page.js` | ~365 |
| `js/journal-stats.js` | 132 |
| `js/journal-genre.js` | 127 |

## DO NOT
- Don't add `api-helpers.js` or abstraction layers without asking first
- Don't migrate to React before May 20
- Don't touch `backend/` unless the task explicitly requires it
