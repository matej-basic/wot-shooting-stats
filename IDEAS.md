# Ideas for later

## Lower the Railway bill

Noted 2026-10-02. Partly done the same day: MySQL memory reduced and the
backend set to sleep when idle. Check whether that was enough on the next bill.

### What the money went to

Railway usage page, billing period Sep 11 to Oct 11, read on 2026-10-02:

| | Amount |
|---|---|
| Account usage so far | $5.02, estimated $7.38 for the period |
| of which memory | $4.80 |
| CPU, volume, backups, egress | about $0.22 together |
| This project | $3.12 (hackerchat $1.76, serene-intuition $0.14) |

Memory costs $0.000231 per GB per minute, about $10 for 1 GB kept on for a
month. The Hobby plan's $5 fee covers $5 of usage, and this project is what
pushed the account over it.

Per service, from each service's Metrics tab:

- MySQL (`mysql:9` image, volume attached): a flat 355 MB with almost no CPU
  and no network traffic. About $3.50 a month.
- Backend: about 90 MB, 47 requests in 30 days. About $0.90 a month.

Neither service had Serverless on, so both ran all day.

### Done on 2026-10-02

- MySQL custom start command set to
  `docker-entrypoint.sh mysqld --performance-schema=OFF --innodb-buffer-pool-size=32M`.
  Memory went from 355 MB to about 210 MB right after the redeploy. That is
  the first reading, so check it again after a day.
- Serverless enabled on the backend service.
- `GET /battles` answered 200 in 0.17 s afterwards, with the existing data.
- Public TCP proxy on MySQL removed, which also deleted `MYSQL_PUBLIC_URL`.
  The backend connects through `mysql.railway.internal`, so it was unaffected.
  For local access use `railway connect MySQL` instead.

Expected saving is about $1.45 a month on MySQL and most of the backend's
$0.90, so the account should land near the $5 included. It may still go
slightly over.

### Still open

- **Serverless on MySQL too**, if the next bill is still above $5. This would
  take the project close to zero, but it needs a test first: a database with a
  volume waking after a long idle period makes the first request slow (the
  backend's response time chart already showed one 14 s spike).
- **Cold starts download the vehicle list.** With the backend asleep most of
  the time, every wake-up fetches it from the Wargaming API and rewrites
  `utils/vehicles.json` (see README, Architecture). Fine at 47 requests a
  month; caching it would make wake-ups faster.
- **Whether a separate MySQL service is needed at all.** Options: a managed
  database with a free or small tier outside Railway, or a smaller engine. The
  SQL lives in `backend/repository.py` and `backend/schema.sql`, so the size
  of a move can be judged from those two files.
- **The backend image.** `backend/Dockerfile` installs `build-essential` into
  the runtime image. If no dependency in `requirements.txt` compiles at install
  time, removing it makes the image smaller and builds faster. Small effect on
  the bill.
- **Moving the backend next to the front end.** The front end is already on
  Vercel. The FastAPI backend could maybe run there as functions, but the
  upload path (temporary files, parsing whole replays) may not fit function
  limits.
