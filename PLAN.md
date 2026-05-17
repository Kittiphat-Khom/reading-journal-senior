# Reading Journal — Session Plan

> **Format:** เปิด session → เขียน `## Session [วันที่]` + `### TODO` / ปิด session → เขียน `### NEXT` แล้ว commit

---

## Project State (2026-05-12)

**Stack:** Vanilla HTML + JS + CSS (no framework)
**Pages:** 15 HTML pages, 15 JS files (~4,884 lines total)
**Backend:** Express.js (`backend/server.js`, `backend/db.js`)
**Deadline:** 2026-05-20 (8 วัน)

### Biggest files (ดูก่อนถ้าจะแตะ)
| File | Lines | Notes |
|---|---|---|
| `frontend/js/journal-detail.js` | 1,140 | ใหญ่สุด |
| `frontend/js/search-page.js` | 576 | |
| `frontend/js/manage-pre-book.js` | 432 | |
| `frontend/js/favorite-page.js` | 400 | |

---

## Migration Decision

**React full migration = ไม่ทัน deadline (May 20)**

Options:
- [x] A. Clean vanilla JS ที่มีอยู่ (เร็ว, ปลอดภัย)
- [ ] B. Migrate เฉพาะ 1-2 หน้าที่ messy ที่สุดเป็น React component แบบ CDN (ไม่ต้อง build step)
- [ ] C. Migrate ทั้งหมด Next.js (หลัง deadline)

**Decision:** Option A — Clean vanilla JS ก่อน deadline, Next.js หลัง May 20

**Inspired by:** `insight-frontend` pattern (components/Layout, components/Forms, hooks/, helpers/)
→ adapt เป็น vanilla JS folder structure แทน

---

## Sessions

<!-- เพิ่ม session ใหม่ด้านล่างทุกครั้ง -->

---

## Session 2026-05-12 (2)

### TODO
- [x] ประเมิน scope project
- [x] สร้าง PLAN.md
- [x] ตัดสินใจ strategy → Clean vanilla JS (Option A, ปลอดภัยกว่า deadline)
- [x] สร้าง `js/ui-helpers.js` — shared `showToast`, `showAlert`, `showInputModal`
- [x] ลบ CSS injection จาก `journal-detail.js` (lines 6-23) → ย้ายไป `journal-detail.css`
- [x] ลบ `showToast`/`showAlert`/`showInputModal` duplicate ออกจาก `journal-detail.js` (1140→1018 lines)
- [x] ลบ `showToast` duplicate ออกจาก `favorite-page.js`
- [x] เพิ่ม `ui-helpers.js` ใน `journal-detail.html` + `favorite-page.html`

### NEXT (session ถัดไป)
- `search-page.js` ยังมี `showAlert` แบบต่างระบบ (ใช้ `style.display` แทน `classList`) — อาจ unify ทีหลัง
- `journal-detail.js` ยังเป็น monolith 1018 lines — แตก function ใหญ่ออก
- ตรวจ `favorite-page.js` บรรทัด 200+ มี `alert()` native ค้างอยู่ → เปลี่ยนเป็น `showToast`
- ดู `dashboard-page.js` / `seeall.js` ว่ามี pattern dirty อื่นอีกมั้ย

---

## Session 2026-05-12 (3)

### TODO
- [x] ตัดสินใจ folder restructure → skip (flat structure โอเคสำหรับ vanilla JS, deadline ไม่ทัน)
- [x] Unify `showAlert` ใน `search-page.js` → ลบ duplicate, เพิ่ม `ui-helpers.js` ใน HTML
- [x] แตก `journal-detail.js` (1018 lines) → 4 files: `journal-genre.js` (127L), `journal-detail.js` (345L), `journal-chapters.js` (392L), `journal-stats.js` (132L)
- [x] แก้ `confirm()` dead code ใน `favorite-page.js` (ไม่ใช่ `alert()` — PLAN.md เดิมผิด)
- [x] อัปเดต `ui-helpers.js` showAlert ให้รองรับทั้ง `hidden` class และ `style.display` pattern
- [x] อัปเดต `journal-detail.html` script tags

### Changes Summary
| File | Before | After | Action |
|---|---|---|---|
| `js/journal-detail.js` | 1018L | 345L | split |
| `js/journal-genre.js` | — | 127L | new |
| `js/journal-chapters.js` | — | 392L | new |
| `js/journal-stats.js` | — | 132L | new |
| `js/search-page.js` | ~576L | ~545L | removed duplicate showAlert |
| `js/favorite-page.js` | 375L | ~365L | removed dead confirm() branches |
| `js/ui-helpers.js` | 83L | 85L | dual-pattern showAlert |
| `search-page.html` | — | — | added ui-helpers.js script tag |
| `journal-detail.html` | — | — | added 3 new script tags |

### NEXT (session ถัดไป)
- ทดสอบ `journal-detail.html` — chapter save/load, timer, stats chart ยังทำงานไหม
- ทดสอบ `search-page.html` — showAlert ยังโชว์ได้ไหม (เดิมใช้ style.display, ตอนนี้ใช้ ui-helpers)
- `search-page.js` มี bug: `openSeeAllModal` line 507 ใช้ `grid` แทน `gridEl` (undefined variable)
- ดู `dashboard-page.html` — มี inline `<script>` tag ขนาดใหญ่ อาจ extract เป็นไฟล์

---

## Session 2026-05-12 (4)

### TODO
- [x] แก้ `search-page.js` bug: `openSeeAllModal` ใช้ `grid` แทน `gridEl` (3 จุด)
- [x] Extract `dashboard-page.html` inline `<script>` (~200 lines) → `js/dashboard-page.js`
- [x] ลบ `showToast` duplicate ออกจาก dashboard script (ใช้ shared `ui-helpers.js` แทน)
- [x] เพิ่ม `ui-helpers.js` script tag ใน `dashboard-page.html`

### Changes Summary
| File | Before | After | Action |
|---|---|---|---|
| `js/dashboard-page.js` | — | 224L | new (extracted from HTML) |
| `dashboard-page.html` | ~315L | ~120L | removed inline script |
| `js/search-page.js` | ~545L | ~545L | fixed `grid` → `gridEl` (3 occurrences) |

### NEXT (session ถัดไป)
- ทดสอบ `journal-detail.html` — chapter save/load, timer, stats chart หลัง split
- ทดสอบ `search-page.html` — showAlert + see-all modal หลังแก้ bug
- แก้ `favorite-page.js`: `API_BASE_URL` hardcoded → ใช้ relative `/api/...`
- แก้ `auth.js`: `API_BASE_URL` hardcoded ถ้ามี
- ดู `manage-pre-book.js` (432L), `seeall.js` — มี pattern dirty อื่นไหม

---

## Session 2026-05-12 (5) — React Migration

### Decision
ผู้ใช้ยืนยันต้องการ React full migration รับความเสี่ยงด้าน deadline แล้ว

### TODO
- [x] ประเมิน stack → ใช้ CRA + React 19 + React Router DOM v7 ที่มีอยู่แล้ว
- [x] เพิ่ม proxy → `frontend/package.json`: `"proxy": "http://localhost:5000"`
- [x] สร้าง folder structure: `src/api/`, `src/context/`, `src/components/layout/`, `src/components/ui/`, `src/pages/admin/`, `src/hooks/`, `src/helpers/`, `src/styles/`
- [x] Copy CSS → `src/styles/`
- [x] สร้าง core: `api/client.js` (axios interceptor), `api/auth.js`, `api/journals.js`, `api/favorites.js`, `api/search.js`, `api/admin.js`
- [x] สร้าง context: `AuthContext.jsx`, `ToastContext.jsx`
- [x] สร้าง helpers: `formatDate.js`
- [x] สร้าง hooks: `useTimer.js`
- [x] สร้าง layout components: `Sidebar.jsx`, `Topbar.jsx`, `MainLayout.jsx`
- [x] สร้าง ui components: `BookCard.jsx`, `Pagination.jsx`, `ConfirmModal.jsx`, `LogoutModal.jsx`, `RatingBlock.jsx`, `ChapterManager.jsx`, `StatsModal.jsx`, `JournalModal.jsx`
- [x] สร้าง routing: `App.jsx` (PrivateRoute, PublicRoute)
- [x] สร้าง pages: Login, Signup, ForgotPassword, ResetPassword, VerifyEmail
- [x] สร้าง pages: Dashboard, JournalDetail, Search, Favorites, SeeAll, Recommend, ReportBug
- [x] สร้าง admin pages: AdminHome, ManageBook, ManageAuthor, ManageGenre, ManageUser, ManageReport
- [x] เพิ่ม global CSS: `src/index.css` (toast, modal, buttons, pagination)
- [x] เพิ่ม Font Awesome + Google Fonts + Chart.js ใน `public/index.html`
- [x] Build สำเร็จ: `Compiled successfully` ไม่มี error

### Structure สุดท้าย
```
frontend/src/
  api/          client.js, auth.js, journals.js, favorites.js, search.js, admin.js
  context/      AuthContext.jsx, ToastContext.jsx
  hooks/        useTimer.js
  helpers/      formatDate.js
  components/
    layout/     Sidebar.jsx, Topbar.jsx, MainLayout.jsx
    ui/         BookCard.jsx, Pagination.jsx, ConfirmModal.jsx, LogoutModal.jsx,
                RatingBlock.jsx, ChapterManager.jsx, StatsModal.jsx, JournalModal.jsx
  pages/        LoginPage, SignupPage, ForgotPasswordPage, ResetPasswordPage,
                VerifyEmailPage, DashboardPage, JournalDetailPage, SearchPage,
                FavoritePage, SeeAllPage, RecommendPage, ReportBugPage
  pages/admin/  AdminHomePage, ManageBookPage, ManageAuthorPage, ManageGenrePage,
                ManageUserPage, ManageReportPage
  styles/       (CSS ทุกไฟล์จาก frontend/styles/)
```

### NEXT (session ถัดไป)
- เปิด dev server (`npm start`) + ทดสอบ login → dashboard flow ใน browser
- ตรวจ CSS ที่หน้า dashboard, journal-detail — อาจต้องปรับ class names ให้ match
- ทดสอบ Chapter Manager save/load
- ทดสอบ Timer + reading log
- ทดสอบ Search page (API search + favorites toggle)
- แก้ CSS ที่ขาดหรือ mismatch (ถ้ามี)
- ปรับ backend ให้ serve React build แทน static HTML files

---

## Session 2026-05-12 (6) — CSS Audit + Fix All Pages

### TODO
- [x] แก้ `backend/server.js` → serve `frontend/build` แทน static HTML (SPA catch-all)
- [x] แก้ CSS mismatch ใน `JournalDetailPage.jsx`: total-time-wrapper, digital-clock, digit-box, log-col, log-list
- [x] แก้ `RatingBlock.jsx`: ใช้ `filled` class ทุก type (CSS controls color via `[data-type]`)
- [x] Rewrite `SearchPage.jsx` — ใช้ CSS classes ตรงจาก original: book-section, scroll-container, book-grid, book-card, card-cover, scroll-btn, modal, modal-content, close-btn, add-library-btn, fav-icon-btn
- [x] Rewrite `FavoritePage.jsx` — ใช้: favorite-container, favorite-grid, fav-card, fav-img-wrapper, fav-overlay, remove-btn, fav-info, modal-overlay.active, book-detail-box
- [x] Rewrite `RecommendPage.jsx` — ใช้: recommendation-wrapper, book-grid, book-card, book-cover, book-rank, book-footer, nav-circle-btn, page-indicators, dot + modal.active, modal-content, close-btn
- [x] Rewrite `SeeAllPage.jsx` — ใช้: stat-content, stat-header, stat-body, stat-chart-section, chart-container, chart-filter, stat-list-section, total-time-box, digital-clock-popup, digit-box, session-list-container, session-log-list, session-time-badge, session-date, stat-footer (standalone page — no MainLayout)
- [x] Rewrite `ReportBugPage.jsx` — ใช้: topbar, main-content, container.fade-in, top-nav, card.glass-effect, card-header, form-content, upload-section, upload-box, input-section, form-group, input-field, textarea-field, form-actions, btn-primary
- [x] แก้ admin pages: ลบ `className="button primary/secondary"` → inline styles (classes ไม่มีนิยาม)
- [x] Build สำเร็จ: `Compiled successfully` ไม่มี error

### NEXT (session ถัดไป)
- เปิด dev server (`npm start`) และทดสอบใน browser:
  - Login → Dashboard (book grid, pagination)
  - เปิด Journal Detail (timer start/finish, ratings, chapter manager, stats)
  - Search page (search results, scroll, add to journal, favorite)
  - Favorites page (grid display, delete, add to library)
  - Recommend page (grid + pagination arrows, book detail modal)
  - Report Bug page (form submit + history modal)
  - SeeAll page (chart + session list)
- ตรวจ admin pages `/admin/*` ทุก page
- ถ้า deploy: รัน `npm run build` แล้ว `node backend/server.js` → SPA route ทำงานได้

---

## Session 2026-05-12 (7) — Component Consistency + API Module Cleanup

### TODO
- [x] แก้ `LoginPage.jsx`: redirect ผู้ใช้ใหม่จาก `/admin/genres` → `/preferences/genres`
- [x] สร้าง preference onboarding pages: `GenreSelectPage`, `AuthorSelectPage`, `BookSelectPage`
- [x] เพิ่ม routes ใน `App.jsx`: `/preferences/genres`, `/preferences/authors`, `/preferences/books`
- [x] Migrate `DashboardPage` จาก `MainLayout` (render-props) + `Topbar` → `SidebarPageLayout`
- [x] ลบ `MainLayout.jsx` + `Topbar.jsx` (unused)
- [x] แก้ `api/journals.js`: fix `createJournal` endpoint, เพิ่ม `addJournalById`
- [x] แก้ `api/search.js`: เพิ่ม `getRecommendations`
- [x] แก้ `JournalDetailPage`, `SeeAllPage`, `FavoritePage`, `RecommendPage` ใช้ api modules
- [x] Build สำเร็จ: `Compiled with warnings` (exhaustive-deps เท่านั้น)

### Layout Pattern สุดท้าย (consistent ทุก page)
| Pages | Layout |
|---|---|
| Dashboard, Search, Favorites, Recommend, ReportBug | `SidebarPageLayout` |
| SeeAll, JournalDetail | Standalone (no sidebar — by design) |
| Preferences (3 pages) | Standalone onboarding flow |
| Admin pages | Standalone admin CSS |
| Auth pages | Standalone auth CSS |

### NEXT (session ถัดไป)
- ทดสอบ full flow ใน browser: signup → onboarding → dashboard → journal → search → favorites → recommend
- ตรวจ CSS preference pages ให้ match original HTML
- ตรวจ admin pages ทุก page

---

## Session 2026-05-17 — Security Hardening (Production-Grade)

### TODO
- [x] **1. JWT secret — ไม่มี fallback** — ถ้าไม่มี env var ให้ crash ทันที
- [x] **2. Email format validation** — validate รูปแบบ email ก่อน query DB (register, forgot-password)
- [x] **3. Helmet.js** — set security HTTP headers อัตโนมัติ ใน `server.js`
- [x] **4. Rate limiting** — จำกัด request ต่อ IP สำหรับ login, register, forgot-password, verify-otp
- [x] **5. ลบ `SELECT *` ที่เหลือ** — ระบุ column ที่ต้องการใน DB queries

### NEXT
- ทดสอบ rate limit ว่า block หลัง N requests จริง
- ทดสอบ email validation ว่า reject format ผิดได้
- Deploy ขึ้น Railway แล้วตรวจ headers ผ่าน browser devtools
