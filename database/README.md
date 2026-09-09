# ClubManager database

Every database object lives in its own file. Publishing applies all of them, in
dependency order, and is safe to run as often as you like.

```bash
dotnet run --project ClubManager.Database
```

That is the whole workflow. Nothing here is meant to be opened and executed by
hand — the publisher is what keeps a database up to date.

## Layout

```
database/
├── Migrations/              schema changes, run once each, in order
│   ├── 001_InitialSchema.sql
│   ├── 002_FixPlayersUserIdUniqueIndex.sql
│   └── 003_AddViewSupportIndexes.sql
├── Views/                   one view per file
│   ├── vw_MatchDetails.sql
│   ├── vw_MatchGoals.sql
│   ├── vw_PlayerProfile.sql
│   ├── vw_Standings.sql
│   └── vw_TopScorers.sql
├── StoredProcedures/        one procedure per file, foldered by table
│   ├── Goal/                Goal_Create, Goal_Delete
│   ├── Match/               Match_AssertWritable, Match_Create, Match_Delete, Match_Update
│   ├── Player/              Player_AssertWritable, Player_Create, Player_Delete, Player_Update
│   ├── Team/                Team_Create, Team_Delete, Team_Update
│   └── User/                User_Create, User_GetByUsername
├── Seed/                    idempotent reference data, runs every publish
│   └── 001_AdminAccount.sql
└── DemoData/                opt-in only, destructive
    └── DemoData.sql
```

There is no `Tables/` folder. Tables are not CREATE OR ALTER objects — redefining
one would mean dropping it and the rows in it — so their whole history lives in
`Migrations/`, which is the only safe way to evolve a table that already holds
data.

## Publish order

The publisher walks the folders in this order, which is dependency order:

1. **Migrations** — tables, then the indexes and constraints on them
2. **Views** — before procedures, since a procedure may read a view
3. **Stored procedures**
4. **Seed data** — last, once the tables it writes to are guaranteed to exist

Within Views and StoredProcedures, files are attempted in name order and any that
fail are retried while each pass gets at least one more of them in. That resolves
dependencies between modules without a manifest to maintain: a view built on
another view simply succeeds on the second pass. When a pass fixes nothing, the
remaining errors are real and all of them are reported together.

## Migrations vs. programmable objects

**Migrations run once.** Each is recorded in `dbo.__SchemaVersions` with a
SHA-256 of its contents, and skipped on every later publish. Editing a migration
that has already been applied fails the publish, loudly — the database it already
ran against will never see the edit, so silently accepting it would put two
environments on different schemas while both claim to be up to date. Add a new
migration instead.

Each migration runs in its own transaction. One that fails part way leaves
nothing behind and is not recorded, so the next publish retries it cleanly.

**Views and stored procedures are re-applied every publish.** They are all
`CREATE OR ALTER`, so the file is the single source of truth for what the object
should look like and there is no state to track. Change a file, publish, done.

Adopting an existing database is the same command: the guarded migrations run as
no-ops against the schema already there, get recorded, and the modules are
refreshed.

## Writing a new object

- **New view or procedure** — add the file. Nothing else to register.
- **New table, column, constraint or index** — add
  `Migrations/00N_WhatItDoes.sql`. Prefix numerically; that prefix is the running
  order. Guard the change (`IF NOT EXISTS`, `IF COL_LENGTH(...) IS NULL`) so
  adopting a database that already has it is a no-op.
- **Seed data** — add to `Seed/`, and make it a no-op when the row is already
  there. It runs on every publish.

## Session options

The publisher pins `ANSI_NULLS ON` and `QUOTED_IDENTIFIER ON` for its connection,
so no file needs to set them. This matters: `dbo.Players` carries filtered indexes
(`UX_Players_UserId`, `UX_Players_Team_Jersey`), and SQL Server refuses both DML
against such a table and the creation of any module that reads it unless
`QUOTED_IDENTIFIER` is ON. `SqlClient` — and therefore the API — has it on by
default. Ad-hoc `sqlcmd` does not; use `-I` there.

## Error numbers

Procedures raise business-rule failures with `THROW` and a number of 50000 or
above, which `ClubManager.Api/Middleware/DatabaseExceptionHandler.cs` maps to a
409. Anything below 50000 is the engine talking, and becomes an opaque 500.

| Number | Meaning |
|--------|---------|
| 50001 | the referenced team does not exist |
| 50010 | the referenced player does not exist |
| 50011 | jersey number already taken on that team |
| 50012 | login is missing, or is not a Player-role login |
| 50013 | login is already linked to another player |
| 50020 | the referenced match does not exist |
| 50021 | a team cannot play itself |
| 50022 | score and status disagree |
| 50030 | the scorer plays for neither side in the match |
| 50031 | the minute is outside the allowed range |
| 50040 | username already taken |
| 50041 | role / team assignment is not valid |

Authorisation is never enforced here. Who may touch which team is decided in the
service layer from the JWT claims; the procedures only enforce data integrity,
and only ever see an already-authorised request. Every `THROW` message is written
to be safe to show a user: no table names, no column names, no SQL.

## Demo data

`DemoData/DemoData.sql` fills every table so each screen has something to show:
6 teams, 27 players, 8 matches and 17 goals. It is **destructive** — it wipes and
reseeds everything except Admin logins — so it never runs during a normal publish:

```bash
dotnet run --project ClubManager.Database -- --demo-data
```
