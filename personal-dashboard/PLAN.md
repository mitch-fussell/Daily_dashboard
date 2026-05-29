# Personal Dashboard — Build Plan

## Current Status: Phase 4 — Production deployed, all core widgets polished

---

## Phase 1: Fix the Foundation ✅ COMPLETE

- [x] **Step 1 — Fix auth middleware**
  Next.js 16 uses `proxy.ts` (not `middleware.ts`). Deleted conflicting `middleware.ts`, kept `src/proxy.ts` as the auth guard.

- [x] **Step 2 — Fix OAuth callback URL**
  Added GitHub Codespace origin to `serverActions.allowedOrigins` in `next.config.ts`. Added `allowedDevOrigins` for Codespace wildcard. Registered callback URL in GitHub OAuth app settings.

- [x] **Step 3 — Dashboard skeleton UI**
  Replaced boilerplate `page.tsx` with full layout: header, todos, habits, notes, calendar, training widgets.

- [x] **Step 4 — Dev server verified**
  `pnpm dev` runs cleanly. `/`, `/sign-in`, and GitHub OAuth flow all work in Codespace.

---

## Phase 2: Static Dashboard Widgets ✅ COMPLETE (built directly with DB)

- [x] **Step 5 — Today header widget** (greeting, current date, day-of-week)
- [x] **Step 6 — Calendar widget** (hour-by-hour daily schedule view)
- [x] **Step 7 — Training widget placeholder** (later replaced with live ICS integration)
- [x] **Step 8 — Todo list UI** (add, check off, delete; due dates with urgency colors)
- [x] **Step 9 — Habits tracker UI** (daily check-in, streak counter, recovery chips)
- [x] **Step 10 — Notes widget UI** (3-tab textarea with autosave indicator)

---

## Phase 3: Database (Supabase + Drizzle) ✅ COMPLETE

- [x] **Step 11 — Todos CRUD**
  - Create, toggle, delete, inline edit (name + due date)
  - `dueAt` timestamp; urgency colors: green (>7d) → yellow (3–7d) → orange (1–3d) → red (today/overdue)
  - `completedAt` tracked; completed todos hidden after Monday midnight (weekly cleanup)
  - drizzle-kit migration applied manually via Node.js script (bug in drizzle-kit 0.31 with Supabase CHECK constraints)

- [x] **Step 12 — Habits CRUD**
  - Create, rename, delete habits
  - Daily toggle (current day + past 7 days via recovery chips)
  - Streak counting: alive if today OR yesterday done; resets with "restarted" label
  - Previous streak shown on restart; UTC-keyed date strings for consistency

- [x] **Step 13 — Notes autosave**
  - Debounced 1.5s save to Supabase `notes` table
  - 3 slots: Quick Notes / Ideas / Scratch
  - Silent save (no revalidatePath); `beforeunload` flush prevents losing edits on tab close

---

## Phase 4: External Integrations

- [x] **Step 14 — Microsoft Calendar** ✅ (OAuth flow, Graph API)
  - `/api/ms-calendar/connect` → Microsoft OAuth redirect (state cookie for CSRF)
  - `/api/ms-calendar/callback` → exchanges code for tokens, stores in DB
  - `src/lib/ms-graph.ts` — Graph API calendarView fetch + automatic token refresh; clears token on 401
  - Calendar widget merges MS + ICS events in same timeline; shows connect/disconnect controls
  - Env vars: `AUTH_MICROSOFT_ENTRA_ID_ID` + `AUTH_MICROSOFT_ENTRA_ID_SECRET`
  - Azure app needs: Web redirect URI `<AUTH_URL>/api/ms-calendar/callback`, Calendars.Read + offline_access permissions

- [x] **Step 15 — TrainingPeaks ICS integration** ✅
  - Paste `webcal://` or `https://` ICS URL in settings (persisted to DB per user)
  - Parses ICS with `ical.js` v2; converts `webcal://` → `https://` at fetch time
  - Shows **all** workouts for today and tomorrow (multiple sessions per day supported)
  - Stat pills per workout: Time (actual vs planned), TSS (actual vs planned), Distance
  - Upcoming races section (A:/B:/C: prefixed events) with priority color badges
  - Weekly stats: running, biking, swimming, gym, other — totals + grand total
  - Refresh button (`router.refresh()`) to pull latest feed
  - Fixed: all-day event duration overflow (was showing 24h per workout — now correctly reads "Actual Time" from raw ICS description before truncation)
  - **Known limitation**: TrainingPeaks free ICS feed only exports completed workouts; planned future workouts appear after completion

- [ ] **Step 16 — Finance tracker** (manual transaction entry, spending summary widget)

---

## Polish & Bugs Fixed ✅

- [x] **Data persistence verified** — all widget data (todos, habits, notes, training URL) stored in Supabase and loaded fresh on every page visit; JWT session cookie survives browser close (30-day expiry)
- [x] **User ID mismatch fixed** — JWT now looks up the real DB user ID by email after OAuth sign-in, preventing session ID mismatch with existing DB records
- [x] **Font changed to Poppins** — weights 300–700 loaded via `next/font/google`; replaces Geist across the entire app
- [x] **Layout reorganized** — Calendar in column 1; Todos + Habits + Notes stacked in column 2; Training Plan in column 3
- [x] **Speed Insights added** — `@vercel/speed-insights` in root layout for Vercel performance monitoring

---

## Deployment ✅ COMPLETE

- [x] Vercel project linked (`daily-dashboard`)
- [x] Root directory: `personal-dashboard`, Framework: Next.js
- [x] All env vars in Production scope: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_URL`
- [x] pnpm esbuild build scripts unblocked via `onlyBuiltDependencies` in `package.json`
- [x] Large binary removed from git history; clean force-push
- [x] GitHub OAuth working end-to-end at `https://daily-dashboard-umber.vercel.app`

---

## Security Notes

| Secret | Status |
|--------|--------|
| `AUTH_GITHUB_SECRET` | Rotate if not already done — old value was exposed in chat |
| `DATABASE_URL` | `.env.local` + Vercel Production only — never commit |
| `.env.local` | In `.gitignore` — never commit |

---

## Architecture

- **Framework**: Next.js 16 (App Router), React 19
- **Auth**: NextAuth v5 beta — JWT strategy, GitHub OAuth, `proxy.ts` guard (Next.js 16 pattern)
- **Database**: Supabase Postgres (transaction pooler port 6543) via Drizzle ORM (`prepare: false`)
- **UI**: Tailwind v4 + shadcn components + Poppins font
- **Deployment**: Vercel (Git-connected, auto-deploys on push to `main`)
- **Package manager**: pnpm v9
