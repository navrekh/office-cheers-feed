# Global Daily-Active Scale-Up Plan

Three coordinated features plus a quiet hydration fix for the ticker.

## 1. Timezone-Aware Daily Active Matrix

**New util:** `src/lib/dailyMatrix.ts`
- `getLocalDayContext()` → reads `Intl.DateTimeFormat().resolvedOptions().timeZone`, returns `{ weekday: 0–6, hour, isFridayAfternoon, isMidWeek, label }` computed in the visitor's local zone (not IST-hardcoded).
- Subscribe pattern (1-min tick) so widgets re-render when the local clock crosses Friday 12:00.

**Dashboard wiring (`src/routes/index.tsx`):**
- Mon–Thu (any local zone): show new `MidWeekSurvivalTracker` card with rotating daily micro-metrics:
  - Mon — "Monday Re-entry Trauma Index"
  - Tue — "Tuesday Standup Exhaustion Level"
  - Wed — "Hump-Day Slack Latency"
  - Thu — "Thursday Pre-Friday Anticipation"
- Fri ≥ 12:00 local → auto-activate the existing `LiveWorkspaceRadar` + `BurnoutLeaderboard` in their "pulsing live" visual state via a `livePulse` prop.
- Fri <12:00 → calm pre-launch state with countdown to local noon.
- Sat/Sun → "Weekend Decompression Mode" (read-only nostalgia view).

**New component:** `src/components/MidWeekSurvivalTracker.tsx` — compact card with daily metric, animated bar, and a "log my pain" emoji selector (LocalStorage only).

## 2. Global Tech Hub Selector — Landing Modal

Reuses existing `HUBS` from `src/lib/hubs.ts` (extend `zones` so Silicon Valley/SF lists "SOMA, Mountain View, Cupertino", Bangalore adds "Electronic City, Manyata", Pune adds "Yerwada").

**New component:** `src/components/HubLandingModal.tsx`
- Auto-opens on first visit (LocalStorage key `drinkedin.hub.onboarded`).
- Detects nearest hub via `detectDefaultHub()` and highlights it with a "✨ Nearest node detected: Bangalore" hero.
- Grid of hub cards grouped by region with flag, zones, live "techies online" mock count.
- Selecting a hub calls `setSelectedCity()` (existing store) → every downstream widget already subscribes via `useCurrentCity`/`subscribeCity`, so chat strings, trending venues, leaderboard, ticker swap instantly.
- Persistent sticky access via the existing `HubSelector` in the header (already built — no duplication).

**City-aware copy:** Extend `mockFeed.ts` and `RecentEscapesTicker.tsx` to interpolate the active city's zones into post strings so "fled Shoreditch, London" only appears for London users, "fled Hinjawadi, Pune" for Pune, etc.

## 3. Daily Standup Escape Valve (Bingo Widget)

**New component:** `src/components/StandupEscapeValve.tsx`
- Ultra-compact card in main feed, only visible Mon–Fri 09:30–11:00 local (otherwise collapses to a 1-line "next standup escape in Xh" teaser).
- Big primary button: **"BINGO! My manager just said a buzzword."**
- First click expands a 3×3 live Bingo grid of global tech buzzwords: Circle back · Bandwidth · Leverage · AI-driven · OKRs · Synergy · Low-hanging fruit · Move the needle · Touch base.
- Tile clicks persist to `localStorage` (`drinkedin.standupBingo.<YYYY-MM-DD>`) — daily streak counter shown.
- On BINGO (row/col/diag) for guests → triggers existing `AuthModal` with reason: *"Lock in my global slacker streak leaderboard position."*
- Signed-in users get a toast "Streak +1 · Day N" and an entry pushed to the existing burnout leaderboard mock.

Distinct from the existing `CorporateBingo` (which is 9-square one-shot); this one is **daily, time-gated, streak-based**.

## 4. Quiet hydration fix (ticker)

`RecentEscapesTicker` currently shuffles + assigns relative timestamps at module/component mount, producing different text on server vs client → React #418. Fix: gate the shuffled/timestamped list behind a `useEffect` `mounted` flag and render the deterministic raw order during SSR. Same pattern for `mockFeed` consumers if needed.

## Files

**New:**
- `src/lib/dailyMatrix.ts`
- `src/components/MidWeekSurvivalTracker.tsx`
- `src/components/HubLandingModal.tsx`
- `src/components/StandupEscapeValve.tsx`

**Edited:**
- `src/routes/index.tsx` — mount landing modal, conditional Mid-Week vs Friday-Live layout, insert Standup Escape Valve into feed.
- `src/lib/hubs.ts` — extend zones (Mountain View, Cupertino, Electronic City, Manyata, Yerwada).
- `src/components/RecentEscapesTicker.tsx` — SSR-safe shuffle + city-aware zones.
- `src/lib/mockFeed.ts` — SSR-safe deterministic first render.

## Out of scope (confirm if wanted)

- Server-persisted streak leaderboard (currently LocalStorage only).
- Real-time "techies online" counts (mock with seeded jitter).
- Adding more hubs beyond the existing 9.

Reply **go** to build, or tell me what to trim/add.
