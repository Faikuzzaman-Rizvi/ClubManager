# Football Club Management System — Full Project Plan

## 1. Project Overview

**Name:** ClubManager (working title)

**Goal:** A simple, role-based football club management system where Admins manage clubs/teams/players, Coaches manage their own team and match results, and Players view their own profile/stats. Public users can view standings and top scorers.

**Stack:**
- **Backend:** ASP.NET Core Web API (.NET 8)
- **Data Access:** Dapper (DB-first, raw SQL — no EF Core)
- **Database:** SQL Server (schema designed first in SSMS, versioned as `.sql` scripts)
- **Frontend:** React (Vite) + Axios + React Router
- **Auth:** JWT (role claim: Admin / Coach / Player)
- **Password hashing:** BCrypt.Net or ASP.NET Identity's `PasswordHasher<T>` (hasher only, not full Identity)

---

## 2. Roles & Permissions

| Action | Admin | Coach | Player |
|---|---|---|---|
| Teams CRUD | ✅ | 👁 view only | 👁 view only |
| Players CRUD | ✅ | ✅ (own team only) | 👁 own profile only |
| User accounts (create Coach/Player logins) | ✅ | ❌ | ❌ |
| Matches CRUD | ✅ | ✅ (own team only) | 👁 view only |
| Goals entry | ✅ | ✅ (own team's matches) | ❌ |
| Standings / Top scorers | ✅ | ✅ | ✅ (public too) |

---

## 3. Database Schema (SQL Server, DB-first)

```sql
CREATE TABLE Teams (
    TeamId INT IDENTITY PRIMARY KEY,
    TeamName NVARCHAR(100) NOT NULL,
    City NVARCHAR(100)
);

CREATE TABLE Users (
    UserId INT IDENTITY PRIMARY KEY,
    Username NVARCHAR(50) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    Role NVARCHAR(20) NOT NULL CHECK (Role IN ('Admin','Coach','Player')),
    TeamId INT NULL FOREIGN KEY REFERENCES Teams(TeamId), -- for Coach
    CreatedAt DATETIME DEFAULT GETDATE()
);

CREATE TABLE Players (
    PlayerId INT IDENTITY PRIMARY KEY,
    UserId INT NULL FOREIGN KEY REFERENCES Users(UserId), -- nullable, only if player has login
    TeamId INT NOT NULL FOREIGN KEY REFERENCES Teams(TeamId),
    Name NVARCHAR(100) NOT NULL,
    Position NVARCHAR(30),
    JerseyNumber INT,
    Age INT
);

-- At most one player per login account. Must be a FILTERED unique index, not
-- UNIQUE(UserId): SQL Server treats NULLs as equal, so a plain UNIQUE constraint
-- would permit only ONE login-less player in the entire table.
CREATE UNIQUE INDEX UX_Players_UserId
    ON Players(UserId)
    WHERE UserId IS NOT NULL;

CREATE TABLE Matches (
    MatchId INT IDENTITY PRIMARY KEY,
    HomeTeamId INT NOT NULL FOREIGN KEY REFERENCES Teams(TeamId),
    AwayTeamId INT NOT NULL FOREIGN KEY REFERENCES Teams(TeamId),
    MatchDate DATETIME NOT NULL,
    HomeScore INT NULL,
    AwayScore INT NULL,
    Status NVARCHAR(20) DEFAULT 'Scheduled' -- Scheduled / Completed
);

CREATE TABLE Goals (
    GoalId INT IDENTITY PRIMARY KEY,
    MatchId INT NOT NULL FOREIGN KEY REFERENCES Matches(MatchId),
    PlayerId INT NOT NULL FOREIGN KEY REFERENCES Players(PlayerId),
    Minute INT
);
```

**Notes:**
- Seed one Admin user manually via script (Admin can't self-register).
- `Users.TeamId` only relevant for Coach role.
- `Players.UserId` is null unless that player has a login account; uniqueness is
  enforced by the filtered index `UX_Players_UserId`, so any number of players may
  have no login.
- Scripts that touch `Players` need `SET QUOTED_IDENTIFIER ON` (required for any
  DML against a table carrying a filtered index). The `.sql` files set it; ad-hoc
  `sqlcmd` needs the `-I` flag. `SqlClient` sets it on by default, so the API is fine.

---

## 4. Backend Structure (ASP.NET Core + Dapper)

```
ClubManager.Api/
├── Controllers/
│   ├── AuthController.cs
│   ├── TeamsController.cs
│   ├── PlayersController.cs
│   ├── MatchesController.cs
│   └── StatsController.cs        (standings, top scorers)
├── Services/
│   ├── AuthService.cs
│   ├── TeamService.cs
│   ├── PlayerService.cs
│   ├── MatchService.cs
│   └── StatsService.cs
├── Repositories/
│   ├── ITeamRepository.cs / TeamRepository.cs
│   ├── IPlayerRepository.cs / PlayerRepository.cs
│   ├── IMatchRepository.cs / MatchRepository.cs
│   └── IUserRepository.cs / UserRepository.cs
├── Models/
│   ├── Entities/           (Team, Player, Match, Goal, User)
│   └── Dtos/                (Request/Response DTOs)
├── Middleware/
│   └── JwtMiddleware.cs (or use built-in JwtBearer)
├── Helpers/
│   └── DbConnectionFactory.cs   (creates SqlConnection from connection string)
├── appsettings.json
└── Program.cs
```

**Key design points:**
- `DbConnectionFactory` — single place returning `IDbConnection`, injected into repositories.
- Repositories use raw parameterized SQL via Dapper (`QueryAsync`, `ExecuteAsync`) — never string-concatenated SQL.
- `[Authorize(Roles = "Admin")]` / `[Authorize(Roles = "Admin,Coach")]` on controllers/actions.
- For Coach-scoped actions (e.g. edit own team's player), check `TeamId` from JWT claims against the resource's `TeamId` inside the service layer — don't rely on route params alone.

---

## 5. API Endpoints

```
Auth
POST   /api/auth/login
POST   /api/auth/register            (Admin only — creates Coach/Player logins)

Teams
GET    /api/teams                    (all roles)
GET    /api/teams/{id}
POST   /api/teams                    (Admin)
PUT    /api/teams/{id}                (Admin)
DELETE /api/teams/{id}                (Admin)

Players
GET    /api/players                  (Admin: all, Coach: own team, filter by ?teamId=)
GET    /api/players/{id}
GET    /api/players/me                (Player: own profile + stats)
POST   /api/players                   (Admin, Coach-own-team)
PUT    /api/players/{id}              (Admin, Coach-own-team)
DELETE /api/players/{id}              (Admin, Coach-own-team)

Matches
GET    /api/matches                  (all roles)
GET    /api/matches/{id}
POST   /api/matches                   (Admin, Coach-own-team)
PUT    /api/matches/{id}              (Admin, Coach-own-team — enter result)
POST   /api/matches/{id}/goals        (Admin, Coach-own-team)

Stats
GET    /api/stats/standings          (public/all roles)
GET    /api/stats/topscorers         (public/all roles)
```

---

## 6. Frontend Structure (React + Vite)

```
src/
├── api/
│   └── axiosClient.js         (base instance + JWT interceptor)
├── context/
│   └── AuthContext.jsx        (stores user, role, token)
├── routes/
│   └── ProtectedRoute.jsx     (role-based route guard)
├── pages/
│   ├── LoginPage.jsx
│   ├── admin/
│   │   ├── TeamsPage.jsx
│   │   ├── PlayersPage.jsx
│   │   ├── UsersPage.jsx
│   │   └── MatchesPage.jsx
│   ├── coach/
│   │   ├── MyTeamPlayers.jsx
│   │   └── MatchResultEntry.jsx
│   ├── player/
│   │   └── MyProfile.jsx
│   └── public/
│       ├── StandingsPage.jsx
│       └── TopScorersPage.jsx
├── components/
│   ├── Navbar.jsx
│   ├── PlayerForm.jsx
│   ├── TeamForm.jsx
│   └── MatchForm.jsx
├── App.jsx
└── main.jsx
```

**Role-based routing logic:**
- `ProtectedRoute` checks `role` from `AuthContext` before rendering.
- Navbar links conditionally rendered by role.
- Standings/Top scorers pages accessible without login too (optional public mode).

---

## 7. Build Phases (for Claude Code agent, in order)

### Phase 0 — Setup
- Create solution: `ClubManager.Api` (Web API project)
- Create React app: `clubmanager-client` (Vite)
- Set up SQL Server DB, run schema script, seed one Admin user

### Phase 1 — Auth
- JWT login/register (Admin creates Coach/Player users)
- Password hashing
- `[Authorize]` wiring, role claims in token

### Phase 2 — Teams CRUD
- Backend: Teams repository/service/controller (Admin only writes)
- Frontend: Teams admin page

### Phase 3 — Players CRUD
- Backend: Players endpoints with Admin/Coach scoping logic
- Frontend: Players page (Admin sees all, Coach sees own team)
- `/api/players/me` for Player role

### Phase 4 — Matches + Goals
- Backend: Matches CRUD + goal entry endpoint
- Frontend: Match scheduling form, result entry form (Coach/Admin)

### Phase 5 — Stats (Standings + Top Scorers)
- SQL queries: aggregate W/D/L/Points from Matches; goal counts from Goals
- Backend: StatsController
- Frontend: Standings table, top scorers list (public-accessible pages)

### Phase 6 — Role-based UI polish
- Navbar/menu per role
- Route guards
- Basic styling (Bootstrap or Tailwind — pick one, keep simple)

### Phase 7 (optional stretch)
- Player self profile edit (limited fields)
- Search/filter on players/matches
- Pagination on lists

---

## 8. How to Use This With Claude Code

Suggested workflow:
1. Save this file as `CLAUDE.md` in your project root — Claude Code reads it automatically as project context.
2. Work phase by phase. Example prompts:
   - *"Set up the ASP.NET Core Web API project structure as described in Phase 0/1 of CLAUDE.md, with JWT auth and the Users table."*
   - *"Implement Phase 2: Teams CRUD backend using Dapper, following the repository pattern in CLAUDE.md."*
   - *"Now build the React Teams admin page for Phase 2, using axiosClient and matching the folder structure in CLAUDE.md."*
3. After each phase, test the endpoints (Postman/Thunder Client) before moving to the next phase — don't let Claude Code run too far ahead without verification.
4. Keep this file updated if you change schema or endpoints mid-project, so Claude Code stays in sync.

---

## 9. Suggested Timeline (self-paced)

| Phase | Est. Time |
|---|---|
| 0 — Setup | 0.5 day |
| 1 — Auth | 1 day |
| 2 — Teams | 0.5 day |
| 3 — Players | 1 day |
| 4 — Matches/Goals | 1.5 days |
| 5 — Stats | 1 day |
| 6 — UI polish | 1 day |
| **Total (MVP)** | **~6.5 days** |