# ClubManager

Football club management system. Backend is an ASP.NET Core 8 Web API using Dapper
against SQL Server; see [CLAUDE.md](CLAUDE.md) for the full project plan.

**Status:** Backend phases 0-5 complete. Frontend phase 6 complete - every screen
is wired to the API, with no placeholders left. Phase 7 covers search and
pagination; player self-edit is not implemented (see below).

## Layout

```
ClubManager.sln
global.json              # pins the SDK to .NET 8
database/
  01_schema.sql          # tables, keys, indexes
  02_seed_admin.sql      # bootstrap Admin login
  03_fix_players_userid_unique.sql   # migration, see below
  04_demo_data.sql       # optional demo data set (destructive, re-runnable)
ClubManager.Api/         # Web API
clubmanager-client/     # React + Vite frontend
```

## Prerequisites

- .NET 8 SDK
- SQL Server (any edition, or LocalDB)

## Database setup

Run the two scripts in order. Both are safe to re-run.

```bash
cd database
sqlcmd -S localhost -E -C -b -i 01_schema.sql
sqlcmd -S localhost -E -C -b -i 02_seed_admin.sql
```

Run `03_fix_players_userid_unique.sql` too if your database was created before
that script existed - it swaps the broken `UNIQUE(UserId)` constraint on `Players`
for a filtered unique index. A fresh `01_schema.sql` already builds it correctly.

Ad-hoc `sqlcmd` against `Players` needs the `-I` flag (`SET QUOTED_IDENTIFIER ON`),
which any table with a filtered index requires for DML. The scripts set it
themselves, and `SqlClient` enables it by default, so the API is unaffected.

That creates `ClubManagerDb` and seeds the one Admin account:

| Username | Password    |
|----------|-------------|
| `admin`  | `Admin@123` |

Admin accounts are only created by script — `/api/auth/register` mints Coach and
Player logins only. Change the seeded password before using this anywhere real.

If your SQL Server is not the default local instance, update
`ConnectionStrings:DefaultConnection` in `ClubManager.Api/appsettings.json`.
For LocalDB that is `Server=(localdb)\MSSQLLocalDB;Database=ClubManagerDb;Trusted_Connection=True;`.

## Running the API

```bash
cd ClubManager.Api
dotnet run
```

Swagger UI is at <http://localhost:5075/swagger> in Development. Use the
**Authorize** button and paste the raw token from `/api/auth/login` (no `Bearer` prefix).

## Endpoints

### Auth (Phase 1)

| Method | Route                | Access     |
|--------|----------------------|------------|
| POST   | `/api/auth/login`    | Anonymous  |
| POST   | `/api/auth/register` | Admin only |
| GET    | `/api/users`         | Admin only |

### Teams (Phase 2)

| Method | Route              | Access               |
|--------|--------------------|----------------------|
| GET    | `/api/teams`       | Any signed-in role   |
| GET    | `/api/teams/{id}`  | Any signed-in role   |
| POST   | `/api/teams`       | Admin only           |
| PUT    | `/api/teams/{id}`  | Admin only           |
| DELETE | `/api/teams/{id}`  | Admin only           |

`DELETE` returns 409 while players, coach accounts or matches still reference
the team, rather than surfacing a foreign-key error as a 500.

### Players (Phase 3)

| Method | Route                | Access                          |
|--------|----------------------|---------------------------------|
| GET    | `/api/players`       | Admin, Coach                    |
| GET    | `/api/players/me`    | Any signed-in role              |
| GET    | `/api/players/{id}`  | Admin, Coach                    |
| POST   | `/api/players`       | Admin, Coach (own team only)    |
| PUT    | `/api/players/{id}`  | Admin, Coach (own team only)    |
| DELETE | `/api/players/{id}`  | Admin, Coach (own team only)    |

`GET /api/players` returns every team for an Admin and the coach's own squad for a
Coach; `?teamId=` overrides that for both, so a Coach can read other squads but
still cannot write to them. A Coach reaching outside their own team on a write
gets 403, never 404.

`GET /api/players/me` resolves the caller's UserId claim through `Players.UserId`
and returns 404 when no player record is linked. Goal stats land in Phase 5.

Jersey numbers are unique within a team (409 on a clash), enforced in
`PlayerService`; an unset jersey number is always allowed.

### Matches and goals (Phase 4)

| Method | Route                       | Access                              |
|--------|-----------------------------|-------------------------------------|
| GET    | `/api/matches`              | Any signed-in role                  |
| GET    | `/api/matches/{id}`         | Any signed-in role                  |
| POST   | `/api/matches`              | Admin, Coach (own team playing)     |
| PUT    | `/api/matches/{id}`         | Admin, Coach (own team playing)     |
| POST   | `/api/matches/{id}/goals`   | Admin, Coach (own team playing)     |

A Coach may write to a match only when their own team is the home or away side,
checked against the JWT claim both before and after the change so a fixture
cannot be handed to two other teams. Reaching outside that gets 403, never 404.

`GET /api/matches/{id}` returns the match with its goals attached.

**Status and score rules** (CLAUDE.md does not specify these - see the Phase 4
notes for the reasoning):

- `POST` always creates a `Scheduled` match with no score.
- `PUT` with `Status = Completed` requires both scores; with `Status = Scheduled`
  both scores must be absent, and reverting clears any stored score.
- A `Completed` score can be corrected, and a match can be reverted to
  `Scheduled`. Goals are never touched by either.
- Goals may be recorded against a `Scheduled` or a `Completed` match.
- Goals and scores are independent: recording a goal does not change the score.
  Standings read `Matches`, top scorers read `Goals`, per CLAUDE.md section 7.
- A team cannot play itself (rejected in `MatchService`, since CLAUDE.md leaves
  this out of the schema on purpose).
- There is no `DELETE` for matches: CLAUDE.md section 5 does not list one.

### Stats (Phase 5)

| Method | Route                     | Access             |
|--------|---------------------------|--------------------|
| GET    | `/api/stats/standings`    | Public - no token  |
| GET    | `/api/stats/topscorers`   | Public - no token  |

Both are read-only aggregation: raw SQL in `StatsRepository` does the arithmetic
and the ordering, and `StatsService` only maps rows onto the response DTOs.

**Standings** count only `Completed` matches with both scores present. Goals for/
against come from `Matches.HomeScore/AwayScore`, never from the `Goals` table.
Every team is listed, so one with no completed matches shows all zeros. Sorted by
points desc, goal difference desc, goals for desc, team name asc.

**Top scorers** count rows in `Goals` regardless of the match status, per the
Phase 4 rule that goal entry is not gated on a match being `Completed`. Only
players with at least one goal appear, sorted by goals desc then name asc. The
team shown is the scorer's current team, so a transfer carries their whole tally.

Both are `[AllowAnonymous]`, per CLAUDE.md section 5's "public/all roles" note and
the optional public pages in section 6, so the standings and top-scorer screens
work logged out. They are the only anonymous endpoints besides `/api/auth/login`;
Teams, Players and Matches all still require a token.

`login` returns a JWT plus the user object:

```json
{
  "token": "eyJhbGci...",
  "expiresAtUtc": "2026-08-19T07:39:19Z",
  "user": { "userId": 1, "username": "admin", "role": "Admin", "teamId": null }
}
```

The token carries `nameidentifier` (UserId), `name`, `role`, and — for a Coach —
a `teamId` claim. Later phases must scope Coach actions off that claim rather
than off a team id in the route or request body.

### Demo data (optional)

`04_demo_data.sql` fills every table so each screen has something to show:
6 teams, 27 players, 8 matches (5 Completed, 3 Scheduled) and 17 goals.

```bash
cd database
sqlcmd -S localhost -E -C -b -i 04_demo_data.sql
```

**It is clear-and-reseed, so it is destructive**: every run deletes all Teams,
Players, Matches, Goals and all non-Admin Users, then inserts the same fixed set
with the same ids. Admin logins are never touched. Re-running always lands on
identical state - row counts and ids included.

Demo logins, all with password `Demo@123`:

| Username | Role | Notes |
|----------|------|-------|
| `coach.arsenal` | Coach | Arsenal |
| `coach.everton` | Coach | Everton |
| `coach.chelsea` | Coach | Chelsea |
| `player.saka` | Player | linked to Bukayo Saka, so `/api/players/me` resolves |
| `player.pickford` | Player | linked to Jordan Pickford |

The set deliberately covers the awkward cases: two players with a NULL jersey
number, one goal recorded against a still-`Scheduled` match (counts toward top
scorers, contributes nothing to standings), and teams with differing numbers of
completed matches.

## Frontend (clubmanager-client)

React 19 + Vite, `axios` and `react-router-dom`. Styling is plain CSS driven by
design tokens in `src/theme.css` - a dark charcoal-green ground with a single
amber club accent, Barlow Condensed headings and Inter body. New screens should
use the tokens, never raw hex values; `landing.css` aliases the same tokens
rather than defining a second palette, so the landing page and the app cannot
drift apart.

Shared building blocks live in `components/ui` (`PageHeader`, `ConfirmDialog`,
and the `LoadingState` / `EmptyState` / `ErrorState` trio), `components/layout`
(`AppShell`, `Sidebar`, `TopBar`) and `components/dashboard` (`StatCard`,
`MatchList`, `StandingsWidget`, `TopScorersWidget`). Destructive actions go
through `ConfirmDialog` rather than `window.confirm`.

The public landing page at `/` adds `three` + `@react-three/fiber` + `@react-three/drei`
(the hero ball) and `gsap` + ScrollTrigger (entrance and scroll animation). Both
are code-split: the signed-in app never downloads them.

```bash
cd clubmanager-client
npm install
npm run dev          # http://localhost:5173
```

The API must be running too - start it in a second terminal. `VITE_API_BASE_URL`
in `.env` points at it (default `http://localhost:5075`); the API already allows
the Vite origin in `Cors:AllowedOrigins`.

```
src/
  api/axiosClient.js      # base instance, JWT request interceptor, 401 handling
  api/useFetch.js         # small GET hook for the read-only pages
  api/useLandingData.js   # landing page data, gated by what the visitor may read
  api/useDashboardData.js # dashboard feed for Admin and Coach
  animations/gsapAnimations.js  # shared reveal/counter/hero motion
  components/ui/          # PageHeader, ConfirmDialog, Loading/Empty/Error states
  components/layout/      # AppShell, Sidebar, TopBar (mobile drawer lives here)
  components/dashboard/   # StatCard, MatchList, StandingsWidget, TopScorersWidget
  pages/admin/Dashboard.jsx     # "/admin" - KPIs, results, fixtures, widgets
  pages/coach/Dashboard.jsx     # "/coach" - the same, scoped to one team
  components/landing/     # LandingNav, Hero, HeroScene (3D) and the sections
  pages/LandingPage.jsx   # public "/" - own dark chrome, outside the app shell
  landing.css             # landing-only styles, scoped under .ld-root
  context/AuthContext.jsx # user / role / token, login+logout, localStorage backed
  routes/ProtectedRoute.jsx
  components/Sidebar.jsx  # role-aware left nav (Admin/Coach/Player sections)
  components/TopBar.jsx   # page title + user chip and logout
  components/MatchManager.jsx  # fixtures/results/goals board, shared Admin+Coach
  components/Pagination.jsx    # client-side pager for the list screens
  helpers/datetime.js     # match-date formatting; see the timezone note below
  theme.css               # design tokens - colors, type scale, radii, shadows
  pages/public/           # StandingsPage, TopScorersPage - live, no login needed
  pages/admin/ coach/ player/   # all live, gated by ProtectedRoute
```

Every screen is wired to the API: Admin teams, players, matches and user
accounts; the Coach's own squad and fixture board; the Player's profile. The
Admin matches screen and the Coach fixtures screen are the same component -
passing `scopeTeamId` narrows it to one team and swaps the two team pickers for
a venue + opponent pair, so a coach cannot compose a fixture they are not in.

**Match dates carry no timezone.** The API serialises `MatchDate` with
`Kind=Unspecified`, and JS parses that form as local time, so a wall-clock value
survives the round trip only while nothing converts through UTC. That rules out
`toISOString()` when building a payload - `helpers/datetime.js` passes the
`datetime-local` string through instead.

**Phase 7:** search and pagination are in place on the players, users and match
lists. Player self-edit is **not** implemented: `PUT /api/players/{id}` is
`[Authorize(Roles = "Admin,Coach")]`, so a Player token gets 403 and there is no
self-service endpoint to call. It needs a backend change first.

### Landing page (`/`)

A public marketing home page with a 3D hero ball and GSAP scroll animation. It
sits outside the app shell and brings its own dark chrome; `/standings`,
`/topscorers`, `/login` and every guarded route are untouched.

Only `/api/stats/*` is anonymous, so the page is built around that: the hero,
the stat counters, the standings preview and the top-scorer preview all work
signed out, deriving their figures from `/api/stats/standings` alone (league
totals - each match is counted once per side, so `played` is halved). The
sections that need `/api/matches` or `/api/players` render a "sign in to view"
state instead of firing a request that would 401 and bounce the visitor to the
login screen.

Navbar section links scroll within the page rather than pointing at
`/admin/teams` and friends, which are Admin-only; each section carries its own
CTA through to the real route.

The 3D scene loads only when WebGL is available and is wrapped in an error
boundary, so a missing or failing GPU leaves the page fully usable. Everything
honours `prefers-reduced-motion`: GSAP is skipped entirely and the ball stops
animating, with content rendered in its final state rather than mid-animation.

The token lives in `localStorage`, so it is readable by any script on the origin.
That is the usual trade-off for a JWT SPA and fine for this project; a real
deployment would want httpOnly cookies.

`ProtectedRoute` is a convenience, not a security boundary - the API enforces the
same rules on every request, which is what the Phase 2-5 verification covers.

## Configuration

`Jwt:Key` in `appsettings.json` is a development key checked into the repo. For
anything deployed, override it (and the connection string) out of band:

```bash
dotnet user-secrets set "Jwt:Key" "<a 32+ character random string>"
```

The app refuses to start if `Jwt:Key` is missing or shorter than 32 characters.

`Cors:AllowedOrigins` already lists `http://localhost:5173` for the Vite client.
