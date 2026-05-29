# Personal Dashboard — Build Plan

## Current Status: Phase 1, Step 1 (Foundation Fixes)

---

## Phase 1: Fix the Foundation

- [x] **Step 1 — Create `middleware.ts`**
  Auth guard was in `proxy.ts` (never loaded by Next.js). Fixed by creating `src/middleware.ts`.

- [x] **Step 2 — Fix OAuth callback URL for Codespace**
  `AUTH_URL` updated to: `https://cuddly-barnacle-97x7p5gjgp6w37j7x-3000.app.github.dev`

  **ACTION REQUIRED** — add the callback URL to your GitHub OAuth app:
  1. Go to https://github.com/settings/developers → your OAuth App
  2. Add this to "Authorization callback URL":
     `https://cuddly-barnacle-97x7p5gjgp6w37j7x-3000.app.github.dev/api/auth/callback/github`
  
  Note: Codespace names change when the codespace restarts. If you get a new name, update `AUTH_URL` again.

- [x] **Step 3 — Dashboard skeleton UI**
  Replace boilerplate `page.tsx` with a real layout showing all planned widgets as placeholders.

- [ ] **Step 4 — Verify dev server runs cleanly**
  Run `pnpm dev` and confirm `/`, `/sign-in`, and GitHub sign-in flow all work.

---

## Phase 2: Static Dashboard Widgets

- [ ] **Step 5 — Today header widget** (greeting, date, day-of-week)
- [ ] **Step 6 — Calendar widget placeholder** (shows mock events, labeled "coming soon")
- [ ] **Step 7 — Training Plan widget placeholder** (shows mock workout, labeled "coming soon")
- [ ] **Step 8 — Todo list UI** (interactive checkboxes, add/delete — no DB yet, use local state)
- [ ] **Step 9 — Habits tracker UI** (daily check-in grid — no DB yet)
- [ ] **Step 10 — Notes widget UI** (textarea, autosave indicator — no DB yet)

---

## Phase 3: Wire Up the Database (Supabase)

- [ ] **Step 11 — Todos CRUD** (create, check off, delete — persisted to Supabase `todos` table)
- [ ] **Step 12 — Habits CRUD** (daily log persisted to Supabase `habits` table)
- [ ] **Step 13 — Notes autosave** (debounced save to Supabase `notes` table, 3 slots)

---

## Phase 4: External Integrations

- [ ] **Step 14 — Microsoft Calendar** (OAuth flow, read today's events from Graph API)
- [ ] **Step 15 — TrainingPeaks** (paste ICS URL in settings, show today's planned workout)
- [ ] **Step 16 — Finance tracker** (manual transaction entry, spending summary widget)

---

## Known Issues / Blockers

| Issue | Impact | Fix |
|-------|--------|-----|
| `AUTH_URL` mismatch in Codespace | OAuth 404 after GitHub login | Update `.env.local` + GitHub OAuth app settings |
| DB password in `.env.local` has brackets `[...]` | Possible connection failure | Verify it's the real password from Supabase dashboard |
| GitHub OAuth secret exposed in `.env.local` | Security risk | Rotate the secret, never commit `.env.local` |

---

## Architecture Notes

- **Framework**: Next.js 16 (App Router), React 19
- **Auth**: NextAuth v5 beta (JWT strategy, GitHub provider)
- **Database**: Supabase Postgres via Drizzle ORM
- **UI**: Tailwind v4 + shadcn components
- **Deployment**: Vercel
