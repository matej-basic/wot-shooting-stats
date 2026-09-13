import os
import logging
import tempfile
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from auth import require_admin
from replay_parser import parse_replay
from repository import *
from utils.vehicle_lookup import VehicleLookup
from utils.map_lookup import MapLookup

load_dotenv()
logging.basicConfig(level=logging.INFO)

# Environment variables
WOT_API_KEY = os.getenv("WOT_API_KEY", "").strip()
if not WOT_API_KEY:
    raise RuntimeError(
        "WOT_API_KEY is not set. Set it to your Wargaming application ID "
        "(https://developers.wargaming.net/applications/) before starting the backend."
    )

VEHICLE_CACHE_PATH = os.getenv("VEHICLE_CACHE_PATH", "utils/vehicles.json")
MAP_CACHE_PATH = os.getenv("MAP_CACHE_PATH", "utils/maps_cache.json")
TEMP_UPLOAD_DIR = os.getenv("TEMP_UPLOAD_DIR", "/tmp")

# Uploads
REPLAY_SUFFIX = ".wotreplay"
MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB per replay file
MULTIPART_OVERHEAD_BYTES = 64 * 1024  # room for multipart framing and the battle_name field
UPLOAD_CHUNK_BYTES = 1024 * 1024

# CORS
DEFAULT_CORS_ORIGINS = "https://wot-shooting-stats.vercel.app,http://localhost:3000"
CORS_ORIGINS = [
    o.strip().rstrip("/")
    for o in (os.getenv("CORS_ORIGINS", "").strip() or DEFAULT_CORS_ORIGINS).split(",")
    if o.strip()
]

# Optionally append a single frontend origin (useful on Railway)
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "").strip().rstrip("/")
if FRONTEND_ORIGIN:
    CORS_ORIGINS.append(FRONTEND_ORIGIN)

# De-duplicate and normalize
CORS_ORIGINS = list(dict.fromkeys(CORS_ORIGINS))

# Optional regex for extra origins such as Vercel preview deployments. No default:
# it is matched against the whole origin, so anchor it to this project's previews.
CORS_ORIGIN_REGEX = os.getenv("CORS_ORIGIN_REGEX", "").strip() or None

# Credentials: set to true only if using cookies/auth headers
CORS_ALLOW_CREDENTIALS = os.getenv("CORS_ALLOW_CREDENTIALS", "false").lower() == "true"

# Methods the front end uses (GET lists, POST uploads, PUT renames a battle)
CORS_ALLOW_METHODS = ["GET", "POST", "PUT"]

# Startup logs for CORS configuration
logging.info(f"[CORS] ORIGINS: {CORS_ORIGINS}")
logging.info(f"[CORS] ORIGIN_REGEX: {CORS_ORIGIN_REGEX}")
logging.info(f"[CORS] ALLOW_CREDENTIALS: {CORS_ALLOW_CREDENTIALS}")
if "*" in CORS_ORIGINS:
    logging.warning("[CORS] CORS_ORIGINS contains '*': every website may call this API from a browser.")

# Interactive docs (/docs, /redoc, /openapi.json) only when ENABLE_DOCS=1
ENABLE_DOCS = os.getenv("ENABLE_DOCS", "").strip().lower() in ("1", "true", "yes")

app = FastAPI(
    docs_url="/docs" if ENABLE_DOCS else None,
    redoc_url="/redoc" if ENABLE_DOCS else None,
    openapi_url="/openapi.json" if ENABLE_DOCS else None,
)
lookup = VehicleLookup()
lookup.refresh_from_api(WOT_API_KEY)
lookup = VehicleLookup(VEHICLE_CACHE_PATH)

map_lookup = MapLookup()
map_lookup.refresh_from_api(WOT_API_KEY)


@app.middleware("http")
async def limit_upload_size(request: Request, call_next):
    """Refuse oversized uploads from their Content-Length, before the body is read."""
    if request.method == "POST" and request.url.path == "/upload-replay":
        length = request.headers.get("content-length")
        if length is not None and (
            not length.isdigit() or int(length) > MAX_UPLOAD_BYTES + MULTIPART_OVERHEAD_BYTES
        ):
            return JSONResponse(
                status_code=413,
                content={"detail": f"Upload too large; the limit is {MAX_UPLOAD_BYTES // (1024 * 1024)} MB."},
            )
    return await call_next(request)


# Added last so it wraps the other middleware and error responses carry CORS headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_methods=CORS_ALLOW_METHODS,
    allow_headers=["Content-Type"],
    allow_credentials=CORS_ALLOW_CREDENTIALS,
)


@app.post("/upload-replay")
async def upload_replay(file: UploadFile = File(...), battle_name: str = Form("Battle")):
    if not (file.filename or "").lower().endswith(REPLAY_SUFFIX):
        raise HTTPException(status_code=400, detail=f"Only {REPLAY_SUFFIX} files are accepted.")

    # Save under a server-generated name; the client's filename is never used as a path.
    path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, dir=TEMP_UPLOAD_DIR, suffix=REPLAY_SUFFIX) as tmp:
            path = tmp.name
            size = 0
            while chunk := await file.read(UPLOAD_CHUNK_BYTES):
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Upload too large; the limit is {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
                    )
                tmp.write(chunk)

        try:
            data = parse_replay(path)
        except Exception:
            logging.exception("[upload-replay] Failed to parse uploaded replay")
            raise HTTPException(status_code=400, detail="The file could not be parsed as a replay.")
    finally:
        if path:
            try:
                os.remove(path)
            except FileNotFoundError:
                pass

    metadata = data.get("metadata", {})

    # Derive battle name from metadata when available
    derived_battle_name = None
    map_name = metadata.get("mapDisplayName")
    player_name = metadata.get("playerName")
    if map_name and player_name:
        derived_battle_name = f"{map_name} - {player_name}"

    common_data = data["common"]
    battle_timestamp = common_data.get("arenaCreateTime")
    battle_name_effective = derived_battle_name or battle_name or "Battle"
    battle_id = create_battle(battle_name_effective, battle_timestamp)

    stats_list = []

    for acc_id, player in data["players"].items():
        clan_id = player.get("clanDBID")
        clan_abbrev = player.get("clanAbbrev")
        team = player.get("team")
        
        # Insert clan if it exists
        if clan_id:
            upsert_clan(clan_id, clan_abbrev)
        
        upsert_user(int(acc_id), player["name"], clan_id)

        for v in data["vehicles"].values():
            if int(v[0]["accountDBID"]) == int(acc_id):
                vehicle = v[0]
                type_descr = vehicle["typeCompDescr"]
                vehicle_name = lookup.get_vehicle_name(type_descr)
                upsert_vehicle(type_descr, vehicle_name)

                shots = vehicle.get("shots", 0)
                hits = vehicle.get("directHits", 0)
                pens = vehicle.get("piercings", 0)
                damage = vehicle.get("damageDealt", 0)
                accuracy = round((hits / shots) * 100, 2) if shots else 0
                pen_rate = round((pens / hits) * 100, 2) if hits else 0
                pen_ratio = round((pens / shots) * 100, 2) if shots else 0

                insert_player_stats(
                    battle_id,
                    int(acc_id),
                    type_descr,
                    player.get("team"),
                    {
                        "shots": shots,
                        "hits": hits,
                        "penetrations": pens,
                        "damage_dealt": damage,
                        "accuracy": accuracy,
                        "penetration_rate": pen_rate,
                        "pen_to_shot_ratio": pen_ratio
                    }
                )

                # Add to stats list for response
                stats_list.append({
                    "battleStartTime": common_data["arenaCreateTime"],
                    "name": player["name"],
                    "team": player.get("team"),
                    "clanAbbrev": player.get("clanAbbrev"),
                    "vehicleName": vehicle_name,
                    "shots": shots,
                    "hits": hits,
                    "penetrations": pens,
                    "damageDealt": damage,
                    "accuracy": accuracy,
                    "penetrationRate": pen_rate,
                    "penToShotRatio": pen_ratio,
                    "mapDisplayName": metadata.get("mapDisplayName"),
                    "playerName": metadata.get("playerName"),
                })

    return {"battle_id": battle_id, "metadata": metadata, "stats": stats_list}

@app.get("/battles")
async def get_battles():
    """Fetch all uploaded battles."""
    battles = get_all_battles()
    return {"battles": battles}

@app.get("/battles/{battle_id}")
async def get_battle_details(battle_id: int):
    """Fetch stats for a specific battle."""
    result = get_battle_stats(battle_id)
    return {"battle_id": battle_id, "stats": result["players"], "team_averages": result["team_averages"]}


@app.delete("/battles/{battle_id}", dependencies=[Depends(require_admin)])
async def delete_battle_endpoint(battle_id: int):
    """Delete a battle and its associated player stats. Requires ADMIN_TOKEN."""
    result = delete_battle(battle_id)
    if result.get("battles_deleted", 0) == 0:
        return {"status": "not_found", "message": f"Battle {battle_id} not found."}
    return {"status": "ok", "result": result}

@app.put("/battles/{battle_id}", dependencies=[Depends(require_admin)])
async def update_battle_endpoint(battle_id: int, battle_name: str = Query(..., min_length=1, max_length=255)):
    """Update battle name. Requires ADMIN_TOKEN."""
    result = update_battle_name(battle_id, battle_name)
    if result.get("updated", 0) == 0:
        return {"status": "not_found", "message": f"Battle {battle_id} not found."}
    return {"status": "ok", "result": result}


@app.get("/users")
async def get_users(start_date: str = None, end_date: str = None):
    """Fetch all users with their battle counts."""
    users = get_all_users(start_date, end_date)
    return {"users": users}


@app.get("/users/{account_id}")
async def get_user_stats(account_id: int, start_date: str = None, end_date: str = None):
    """Fetch aggregated stats for a specific user across all battles."""
    stats = get_user_aggregated_stats(account_id, start_date, end_date)
    if not stats:
        return {"status": "not_found", "message": f"User {account_id} not found or has no stats."}
    return {"account_id": account_id, "stats": stats}
