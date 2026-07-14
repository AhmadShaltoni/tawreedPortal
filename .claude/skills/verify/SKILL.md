---
name: verify
description: How to build, launch, and drive tawreedPortal (Next.js admin dashboard) to verify changes at the real surface
---

# Verifying tawreedPortal changes

**DANGER: `.env` DATABASE_URL is the live Railway production DB.** Never submit forms that write/broadcast (e.g. sending a notification to "جميع المستخدمين"). When probing form submission, block POSTs first (Playwright `page.route` aborting POST) so nothing reaches the server. Reads (browsing admin pages, public /api/v1/* GETs) are fine.

## Launch
- Dev server: `npm run dev` (port 3000). Check `lsof -i :3000 -sTCP:LISTEN` first — one is usually already running.
- **Do not run `npm run build` while the dev server is running** — it corrupts the turbopack cache and the dev server silently serves stale chunks for later edits (symptom: edits to a file stop taking effect, old error stacks reference the same chunk hash). Fix: kill and restart the dev server.

## Drive (headless browser)
- No Playwright browsers installed; use `playwright-core` (npm i in scratchpad) with `chromium.launch({ channel: 'chrome' })` — system Google Chrome works headless.
- Admin login at `/login` is **phone + password**: `0791234567` / `Admin@123` (from `prisma/seed.ts`). Fill `input[name="phone"]`, `input[name="password"]`, submit, wait for `/admin`.
- Server errors in dev are forwarded to the browser console — capture `page.on('console')` to read server-side exceptions (e.g. Next 16 sync-dynamic-APIs errors) without owning the dev server terminal.

## Gotchas
- Next 16: `searchParams` in page components is a Promise — must `await`. Sync access throws (page renders but data fetches silently return empty via catch-all error handling).
- Server actions are POSTs — a picker that calls a search action on mount will trip a POST-blocking route; count/allow accordingly.
