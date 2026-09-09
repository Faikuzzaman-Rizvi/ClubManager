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
database/                # one file per database object - see database/README.md
  Migrations/            # schema changes, run once each, in order
  Views/                 # one view per file
  StoredProcedures/      # one procedure per file, foldered by table
  Seed/                  # idempotent reference data
  DemoData/              # optional demo data set (destructive, opt-in)
ClubManager.Database/    # the publisher: applies everything in database/
ClubManager.Api/         # Web API
clubmanager-client/     # React + Vite frontend
```

## Prerequisites

- .NET 8 SDK
- SQL Server (any edition, or LocalDB)

## Database setup

One command, from a clean clone:

```bash
dotnet run --project ClubManager.Database
```

That creates the database if it is missing, applies any migrations it has not
seen, refreshes every view and stored procedure, and seeds the Admin account.
It is safe to run as often as you like, and it is how you pick up someone else's
database changes after a pull — there is never a `.sql` file to open by hand.

```bash
# point it somewhere else
dotnet run --project ClubManager.Database -- --connection "Server=...;Database=...;..."

# also load the demo data set (DESTRUCTIVE - wipes and reseeds every table)
dotnet run --project ClubManager.Database -- --demo-data
```

The publisher reads its connection string from `--connection`, then the
`CLUBMANAGER_CONNECTION` environment variable, then
`ClubManager.Database/appsettings.json`. Point it at the same database as the
API. See [database/README.md](database/README.md) for the file layout, how
migrations are tracked, and how to add a new object.

Ad-hoc `sqlcmd` against `Players` needs the `-I` flag (`SET QUOTED_IDENTIFIER ON`),
which any table with a filtered index requires. The publisher and `SqlClient` both
set it themselves, so neither the publish nor the API is affected.

Publishing creates `ClubManagerDb` and seeds the one Admin account:

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

## Data access

Dapper, against stored procedures and views. The split:

| Kind of query | Where it lives |
|---|---|
| Create, update, delete, any mutation | a stored procedure |
| Reusable or aggregating read | a view |
| Single-table lookup by key | inline SQL in the repository |

Nothing outside `Repositories/` contains SQL, and no SQL anywhere is built by
string concatenation — every value is a named parameter.

**Views** (`database/Views/`, one file each): `vw_PlayerProfile`, `vw_MatchDetails`, `vw_MatchGoals`,
`vw_Standings`, `vw_TopScorers`. Repositories select named columns from them and
add their own `WHERE` and `ORDER BY` — a view cannot carry `ORDER BY`, which is why
the sort stays in the caller. Simple lookups (a team by id, a user by id) stay as
inline SQL: one table, no join, nothing for a view to reuse.

**Procedures** (`database/StoredProcedures/`, one file each): `User_Create`, `User_GetByUsername`,
`Team_Create/Update/Delete`, `Player_Create/Update/Delete`, `Match_Create/Update/Delete`,
`Goal_Create/Delete`, plus `Player_AssertWritable` and `Match_AssertWritable`, which
hold the rules the create and update paths share so the two cannot drift apart.
`Match_Delete` and `Goal_Delete` have no endpoint yet — no route deletes a match or
a goal, and this did not add one.

Three of them fold a check and a write into one transaction, replacing the
read-then-write round trips the services used to make and closing the window
between them: `Team_Delete` (counts the players, coaches and fixtures pointing at
the team), `Player_Delete` (counts goals against the player) and `Match_Delete`
(removes the fixture's goals with it). Each returns an outcome plus the counts, so
a refused delete can still say what is in the way.

**Where the rules live.** Authorisation is only ever in the service layer, decided
from the JWT claims — the database is never asked who is calling. The procedures
enforce data integrity: jersey numbers unique within a team, one player per login,
a completed match carrying both scores, a scorer who plays for one of the two
sides. The services check the same things first so the API returns a friendly
message, which means a procedure only actually raises on a concurrent write or a
hand-edited row. When it does, `DatabaseExceptionHandler` turns it into a 409 with
the procedure's own user-safe message; every other database error becomes a plain
500 that says nothing about the database.

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

Both are read-only aggregation, done entirely in the database by `dbo.vw_Standings`
and `dbo.vw_TopScorers`. `StatsRepository` selects from the view and applies the
sort; `StatsService` only maps rows onto the response DTOs. Nothing is tallied up
in memory.

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

### Images

| Method | Route                        | Access                       |
|--------|------------------------------|------------------------------|
| POST   | `/api/players/{id}/image`    | Admin, Coach (own team only) |
| DELETE | `/api/players/{id}/image`    | Admin, Coach (own team only) |
| POST   | `/api/teams/{id}/logo`       | Admin only                   |
| DELETE | `/api/teams/{id}/logo`       | Admin only                   |
| POST   | `/api/users/me/avatar`       | Any signed-in role           |
| DELETE | `/api/users/me/avatar`       | Any signed-in role           |

Uploads are `multipart/form-data` with a single `file` part. All six return
`{ "imageUrl": "/uploads/…" | null }`.

**Storage.** Only the URL goes in SQL Server — `Players.ImageUrl`,
`Teams.LogoUrl`, `Users.AvatarUrl`, all nullable. The file is written under the
API's upload root and served as static content from `/uploads`, so images stay
out of the database and get cached by the browser. Filenames are a GUID chosen by
the server; the uploaded name is never used, not even sanitised, which rules out
path traversal and overwriting someone else's file in one go.

**Validation.** Extension, content type and the leading file signature are all
checked, then the image is decoded and **re-encoded to WebP** by ImageSharp. That
is the security boundary as much as the optimisation: whatever arrives has to
survive being decoded as an image and written back out, so a script or executable
cannot reach the disk intact. Anything over 5 MB is refused before decoding, and
absurd pixel dimensions are refused from the header, before any pixel is read.
Photos are capped at 512px on the long edge, avatars at 256px, and EXIF, IPTC and
XMP are stripped.

**Replacing** an image deletes the file it replaced, in the same call: the
`*_SetImage` / `_SetLogo` / `_SetAvatar` procedures capture the outgoing URL with
`OUTPUT` on the same `UPDATE` that writes the new one, so nothing races and no
orphan is left behind. Editing a player or renaming a team never touches its
image — that is why images have their own endpoints and their own procedures.

**In responses.** Image URLs ride along on the rows that already carry the entity:
players and top scorers carry `imageUrl`/`playerImageUrl`, fixtures carry
`homeTeamLogoUrl` and `awayTeamLogoUrl`, standings carry `logoUrl`. No screen
makes a second request per row.

**A Player may set their own account avatar, but not their own player photo** —
the squad photo stays with the Admin and their Coach, matching who may edit a
player at all. Clearing an account avatar does not leave a Player faceless:
`vw_UserProfile` falls back to the linked player's photo, and `hasOwnAvatar` on
the user tells the UI whether there is anything of the account's own to remove.

### Demo data (optional)

`database/DemoData/DemoData.sql` fills every table so each screen has something to show:
6 teams, 27 players, 8 matches (5 Completed, 3 Scheduled) and 17 goals.

```bash
dotnet run --project ClubManager.Database -- --demo-data
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
`EntityImage`, `ImageUpload`, and the `LoadingState` / `EmptyState` / `ErrorState`
trio), `components/layout` (`AppShell`, `Sidebar`, `TopBar`) and
`components/dashboard` (`StatCard`, `MatchList`, `StandingsWidget`,
`TopScorersWidget`). Destructive actions go through `ConfirmDialog` rather than
`window.confirm`.

**Images.** Two components, used everywhere:

- **`EntityImage`** is the only way an entity picture is rendered. A missing URL,
  a deleted file and a failed load all end in the same place — initials on a
  ground tinted by a hash of the name, so a squad of fallbacks reads as distinct
  people. There is no path that leaves a broken-image icon on screen. Variants
  are shapes (`avatar` circle, `logo` contained square, `cover`); size comes from
  a class. Everything is `loading="lazy"` and `decoding="async"`.
- **`ImageUpload`** manages one image: click or drag, local preview while the
  request is in flight, progress bar, validation and error messages, replace and
  remove. It is the same component for a player photo, a club crest and a user
  avatar — `endpoint` is what differs.

`api/images.js` holds `resolveImageUrl`, which turns the API's site-relative
`/uploads/…` into an absolute URL. That matters in development: a bare relative
src would resolve against Vite on :5173 rather than the API on :5075.

Images are created after the entity exists, so an upload control appears on the
edit row rather than the create form, and it saves on its own the moment a file
is chosen — cancelling an edit does not undo it.

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
