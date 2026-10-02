# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The README is detailed and current (replay format, env variables, known limits). Read it before changing parsing, CORS or the admin routes.

## Commands

There are no tests and no Python linter config. The only automated check is the front end lint.

```bash
# Whole stack (MySQL on 3306, API on 8000, front end on 3000)
cp backend/.env.example backend/.env   # set WOT_API_KEY
docker compose up --build

# Backend alone; must run from backend/, imports and cache paths are relative to it
cd backend && source venv/bin/activate && uvicorn main:app --reload

# Front end
cd frontend && npm run dev      # also: npm run build, npm run lint

# Replay CLI tools in the repo root (not used by the backend)
python3 event_parser.py example.wotreplay
python3 shots.py example.wotreplay > output.json
```

`example.wotreplay` in the root is untracked (`*.wotreplay` is ignored) and is the handy test input. To exercise the upload path: `curl -F file=@example.wotreplay http://localhost:8000/upload-replay`.

The backend raises at import if `WOT_API_KEY` is unset, and every start calls the Wargaming API and rewrites `backend/utils/vehicles.json`. Don't commit that file's churn unless the vehicle list is the point of the change.

## Architecture

Upload flow: `ReplayUploader.tsx` posts to `POST /upload-replay` in `backend/main.py`, which streams the file to a temp path (20 MB cap, also enforced by a Content-Length middleware), calls `replay_parser.parse_replay`, deletes the file, then writes one `battles` row plus one `player_battle_stats` row per player. The per-player accuracy, penetration rate and pen-to-shot ratio are computed in `main.py` at insert time and stored, not derived in SQL.

Two replay parsers exist and they are not the same:
- `backend/utils/parser.py` + `file_handler.py` (used by the backend) treat the file as text, strip non-ASCII and whitespace, and pull out the first two JSON objects. Names lose spaces (`SandRiver`).
- `event_parser.py` in the root reads the binary block layout by length prefix and keeps names intact. Swapping the backend over to it is a known open item (see README "Limits").

Data layer: `backend/repository.py` holds all SQL as plain functions; `main.py` does `from repository import *`. Each function opens its own connection via `db.get_db()` with `autocommit=True`, so there are no transactions across a whole upload. Schema lives in `backend/schema.sql`, which Docker loads only on a fresh `mysql_data` volume. A schema change needs both an edit to `schema.sql` and a new file under `backend/migrations/` for existing databases. `backend/migration.py` is not called from anywhere.

Name lookups: `utils/vehicle_lookup.py` and `utils/map_lookup.py` map `typeCompDescr` and map ids to names using JSON caches refreshed from the Wargaming API at startup. `MAP_CACHE_PATH` is read but `MapLookup` ignores it.

Personal ratings (`users.personal_rating`) are filled only by `backend/backfill_user_ratings.py`, a standalone script that uses `DB_*` env names falling back to `DATABASE_*`.

Admin routes (`PUT`/`DELETE /battles/{id}`) go through `auth.require_admin`: 404 when `ADMIN_TOKEN` is unset, 403 on a wrong bearer token. The front end deliberately has no buttons for them.

Front end: Next.js 16 / React 19 / Tailwind 4, a single client page (`app/page.tsx`) that switches between three modes (upload, battles, players) and opens `UserStats` as a modal. Each component defines its own `API_URL` from `NEXT_PUBLIC_API_URL`, which is inlined at build time. There is no shared API client or type module; response shapes are typed locally in each component, so a backend response change means updating every component that reads it.

## Repo conventions

Commit messages are plain English sentences in the imperative, no prefix (`Keep env files out of images; drop the edit and delete buttons`). Changes land through PRs from `fix/` or `chore/` branches.
