# Change log (diff summary)

## 2026-04-10 — Initial baseline

- **Prior state**: Single file `BRD` only (no application source).
- **Added**: `docs/` governance pack, gap analysis in repository notes, scaffold instructions.
- **Intent**: Establish traceability before first functional merge.

_Subsequent entries should summarize merged PRs or major commits._

---

## 2026-04-10 — Frontend foundation

- **Next.js** bumped to **15.5.15** (addresses `npm audit` advisories for Next).
- **shadcn/ui** initialized (Tailwind v4 + `components/ui/button`, `lib/utils`).
- **Routes**: `/` (app shell), `/map`, `/leads` placeholders aligned to BRD modules.
- **Fix**: `app/globals.css` theme `--font-sans` now maps to Geist via `--font-geist-sans` (avoids self-referential CSS variable).
- **Config**: `frontend/.env.example` documents API and Maps keys.

---

## 2026-04-10 — Map territory UI

- **Dependency**: `@vis.gl/react-google-maps` for Maps JavaScript API + Geocoding library.
- **Component**: `frontend/components/map/territory-map-view.tsx` — search, radius, circle, marker, JSON copy.
- **Route**: `frontend/app/map/page.tsx` loads the map when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set; otherwise shows setup instructions.

---

## 2026-04-10 — Leads list, detail, territories storage

- **API**: `frontend/lib/api/client.ts`, `frontend/lib/api/leads.ts`, `frontend/lib/types/lead.ts`, `frontend/lib/env.ts` — JSON fetch with credentials; list/detail helpers.
- **UI**: `frontend/components/leads/leads-list.tsx`, `lead-detail-view.tsx`; routes `app/leads/page.tsx`, `app/leads/[id]/page.tsx`.
- **Map**: `frontend/lib/territory-storage.ts` + save / apply / remove in `territory-map-view.tsx` (browser `localStorage`).

---

## 2026-04-10 — Same-origin API stub + URL resolution

- **`resolveApiUrl`**: empty `NEXT_PUBLIC_API_URL` → relative `/api/*` (Next handlers); otherwise prepend Laravel origin.
- **Routes**: `frontend/app/api/leads/route.ts`, `frontend/app/api/leads/[id]/route.ts` (empty list / 404).
- **Backend README**: documents the JSON contract for Laravel implementation.
