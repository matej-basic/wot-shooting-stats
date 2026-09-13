# WoT shooting stats

A web app that collects shooting statistics from World of Tanks replays. You upload one or more `.wotreplay` files, the backend reads the battle results stored in each one and saves shots, hits, penetrations and damage for every player in that battle, up to 30 per replay. The front end shows each battle as a table with team averages, a list of all players with their overall accuracy and personal rating, and a page per player with totals by vehicle and by battle. The player views can be filtered by date.

Accuracy is hits / shots, penetration rate is penetrations / hits, and pen-to-shot ratio is penetrations / shots, all in percent.

## The .wotreplay format

`event_parser.py` reads a replay as binary:

| Offset | Content |
|---|---|
| `0x00` to `0x03` | magic header, bytes `12 32 34 11`; the parser skips it without checking |
| `0x04` to `0x07` | number of blocks, unsigned 32-bit little-endian |
| `0x08` onwards | the blocks, each a 4-byte little-endian length followed by that many bytes |

Block 1 is JSON with the battle metadata: client version, map name, date, the recording player, server, and the vehicles at battle start. Block 2 is JSON with the battle results: `personal` (the recording player's stats, with per-enemy entries under `details`), `players`, `vehicles` and `common`. The shot counts for all players come from `vehicles` in this block.

The block count covers only those JSON blocks. Everything after them is the binary event stream the game client uses to play the battle back. In the replay used during development the file is 1,452,537 bytes, the two JSON blocks end at offset 162,697, and the other 1,289,840 bytes are that stream. This project does not decode it.

The layout follows [replays_unpack](https://github.com/Monstrofil/replays_unpack) by Monstrofil, the community project `event_parser.py` cites as its reference. replays_unpack also unpacks the event stream.

### Which parser the backend uses

`event_parser.py` and `shots.py` in the repository root are command line tools. The backend does not import them.

The backend reads uploads through `backend/replay_parser.py`, which calls `backend/utils/file_handler.py` and `backend/utils/parser.py`. It opens the file as UTF-8 text and ignores decoding errors, keeps only the first line, splits it on whitespace and drops every character outside ASCII 34 to 127. It then scans what is left for JSON objects, takes the first as metadata and the second as battle results. This finds both JSON blocks, but it also removes spaces and non-ASCII letters inside strings, so the map "Sand River" is stored as "SandRiver".

`shots.py` uses the same text method and prints the recording player's shot statistics as JSON. `event_parser.py` reads the blocks by their length prefix and decodes them as UTF-8, so names stay intact.

```bash
python3 event_parser.py path/to/replay.wotreplay            # block layout and shot summary
python3 shots.py path/to/replay.wotreplay > output.json     # shot statistics as JSON
```

## Architecture

- `backend/`: a FastAPI app (`main.py`) over MySQL 8. The SQL is in `repository.py` and the tables in `schema.sql` (clans, users, vehicles, battles, player_battle_stats). On every start it downloads the vehicle list from the Wargaming API and rewrites `backend/utils/vehicles.json`, which is why that file shows as modified after a run.
- `frontend/`: Next.js 16 with React 19 and Tailwind CSS 4. The pages are client components and call the backend directly from the browser at `NEXT_PUBLIC_API_URL`.
- `docker-compose.yml` runs MySQL, the backend and the front end for local work. MySQL loads `backend/schema.sql` the first time its data volume is created.
- The front end is deployed on Vercel. The backend runs on any host with Python 3.11 and a MySQL database.

## Running locally

You need a Wargaming application ID. It is free at <https://developers.wargaming.net/>. The backend uses it to fetch vehicle and map names, and the rating script uses it to fetch personal ratings.

### With Docker Compose

```bash
git clone https://github.com/matej-basic/wot-shooting-stats.git
cd wot-shooting-stats
cp backend/.env.example backend/.env    # then set WOT_API_KEY in backend/.env
docker compose up --build
```

The front end is on <http://localhost:3000> and the API on <http://localhost:8000>. Compose publishes ports 3000, 8000 and 3306, so nothing else on the machine may use them.

Compose sets the database and CORS variables for the backend container itself. The rest, `WOT_API_KEY` included, comes from `backend/.env`: `./backend` is mounted at `/app` and the backend loads `.env` from there with python-dotenv.

The backend does not wait for MySQL. It opens a connection per request, so requests in the first half minute after `docker compose up` can fail while MySQL initialises.

### Without Docker

Database, MySQL 8:

```bash
mysql -u root -p < backend/schema.sql
mysql -u root -p -e "CREATE USER 'wot_user'@'localhost' IDENTIFIED BY 'wot_password'; GRANT ALL ON wot_stats.* TO 'wot_user'@'localhost';"
```

Backend. Run it from `backend/`, because imports and file paths are relative to that directory:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                   # set WOT_API_KEY, adjust DATABASE_* if needed
uvicorn main:app --reload
```

Front end:

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

### Existing databases and personal ratings

`schema.sql` creates `users.personal_rating` and `users.rating_updated_at`. A database created from an older `schema.sql`, including an old `mysql_data` Docker volume, needs the migration once:

```bash
mysql -u root -p wot_stats < backend/migrations/add_wn8.sql
# or with Docker Compose
docker compose exec -T mysql mysql -uroot -proot wot_stats < backend/migrations/add_wn8.sql
```

The file is called `add_wn8`, but the column holds the Wargaming personal rating (`global_rating` from the account API), not WN8.

Uploads do not fetch ratings. `backend/backfill_user_ratings.py` asks the Wargaming API for the current rating of every user in the database and stores it:

```bash
cd backend
python3 backfill_user_ratings.py
```

## Environment variables

Backend, read in `backend/main.py` and `backend/db.py`:

| Variable | Used for |
|---|---|
| `WOT_API_KEY` | Wargaming application ID |
| `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD` | MySQL connection; the defaults are `localhost`, `3306`, `wot_stats`, `wot_user`, `wot_password` |
| `VEHICLE_CACHE_PATH` | JSON file with vehicle names, `utils/vehicles.json` by default |
| `MAP_CACHE_PATH` | read by `main.py`, but `MapLookup` still uses its own `utils/maps_cache.json` |
| `TEMP_UPLOAD_DIR` | where uploaded replays are written, `/tmp` by default |
| `CORS_ORIGINS` | comma-separated list of allowed origins |
| `FRONTEND_ORIGIN` | one more allowed origin, added to that list |
| `CORS_ORIGIN_REGEX` | regular expression for further origins, such as Vercel preview domains |
| `CORS_ALLOW_CREDENTIALS` | `true` to allow cookies and auth headers, `false` by default |
| `ADMIN_TOKEN` | bearer token for the routes that rename or delete battles; without it those routes are off |
| `ENABLE_DOCS` | `1` turns on `/docs`, `/redoc` and `/openapi.json` |

`ADMIN_TOKEN` and `ENABLE_DOCS` come with the `fix/security` branch, which also makes `WOT_API_KEY` required: the backend refuses to start without it. Until that branch is merged, `main.py` ignores the two new variables and does not require the key.

`backend/backfill_user_ratings.py` reads `WOT_API_KEY` (required), `WOT_REGION` (`eu` by default) and `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`. Each `DB_*` variable falls back to its `DATABASE_*` counterpart, so the script works with the same `backend/.env` as the backend.

Front end: `NEXT_PUBLIC_API_URL` is the backend URL as the browser sees it, `http://localhost:8000` by default. Next.js writes it into the bundle at build time, so changing it needs a new build.

## Limits

- The binary event stream is not decoded. There is no per-shot data such as timing, target or position, only the totals the game writes into block 2.
- The backend still uses the text parser described above, not `event_parser.py`. Spaces and non-ASCII characters inside names are lost, and the parser reads only up to the first newline byte in the file.
- Every upload creates a new battle. `replay_parser.py` reads the replay's `arenaUniqueID` but nothing stores it, so when two players from the same battle both upload their replays, that battle and all 30 players in it are counted twice in every total.
- A replay saved by a player who left before the battle ended has block 1 only. It has no battle results, and the upload fails with a server error.
- Personal ratings change only when `backfill_user_ratings.py` runs. Players added since the last run show "-".
- Each backend start overwrites `backend/utils/vehicles.json` with the current vehicle list. If the download fails, the error is printed and the existing file is used.
