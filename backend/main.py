import os
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from replay_parser import parse_replay
from repository import *
from utils.vehicle_lookup import VehicleLookup
from utils.map_lookup import MapLookup

load_dotenv()

# Environment variables
WOT_API_KEY = os.getenv("WOT_API_KEY", "b257be4e7c58952fc322990fe39c72fa")
VEHICLE_CACHE_PATH = os.getenv("VEHICLE_CACHE_PATH", "utils/vehicles.json")
MAP_CACHE_PATH = os.getenv("MAP_CACHE_PATH", "utils/maps_cache.json")
TEMP_UPLOAD_DIR = os.getenv("TEMP_UPLOAD_DIR", "/tmp")
CORS_ORIGINS = [
    o.strip().rstrip("/")
    for o in os.getenv("CORS_ORIGINS", "*").split(",")
    if o.strip()
]

# Optionally append a single frontend origin (useful on Railway)
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "").strip().rstrip("/")
if FRONTEND_ORIGIN:
    CORS_ORIGINS.append(FRONTEND_ORIGIN)

# De-duplicate and normalize
CORS_ORIGINS = list(dict.fromkeys(CORS_ORIGINS))

# Support preview domains by default if not explicitly set
CORS_ORIGIN_REGEX = os.getenv("CORS_ORIGIN_REGEX", r"https://.*\\.vercel\\.app") or None

# Credentials: set to true only if using cookies/auth headers
CORS_ALLOW_CREDENTIALS = os.getenv("CORS_ALLOW_CREDENTIALS", "false").lower() == "true"

app = FastAPI()
lookup = VehicleLookup()
lookup.refresh_from_api(WOT_API_KEY)
lookup = VehicleLookup(VEHICLE_CACHE_PATH)

map_lookup = MapLookup()
map_lookup.refresh_from_api(WOT_API_KEY)

# Configure CORS with explicit origins or regex for preview domains
# Configure CORS with explicit origins or regex for preview domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS != ["*"] else ["*"],
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=CORS_ALLOW_CREDENTIALS,
)

@app.post("/upload-replay")
async def upload_replay(file: UploadFile = File(...), battle_name: str = Form("Battle")):
    path = f"{TEMP_UPLOAD_DIR}/{file.filename}"
    with open(path, "wb") as f:
        f.write(await file.read())

    data = parse_replay(path)

    common_data = data["common"]
    battle_timestamp = common_data.get("arenaCreateTime")
    battle_id = create_battle(battle_name, battle_timestamp)

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
                    "penToShotRatio": pen_ratio
                })

    return {"battle_id": battle_id, "stats": stats_list}

@app.get("/battles")
async def get_battles():
    """Fetch all uploaded battles."""
    battles = get_all_battles()
    return {"battles": battles}

@app.get("/battles/{battle_id}")
async def get_battle_details(battle_id: int):
    """Fetch stats for a specific battle."""
    stats = get_battle_stats(battle_id)
    return {"battle_id": battle_id, "stats": stats}


@app.delete("/battles/{battle_id}")
async def delete_battle_endpoint(battle_id: int):
    """Delete a battle and its associated player stats."""
    result = delete_battle(battle_id)
    if result.get("battles_deleted", 0) == 0:
        return {"status": "not_found", "message": f"Battle {battle_id} not found."}
    return {"status": "ok", "result": result}

@app.post("/debug-replay")
async def debug_replay(file: UploadFile = File(...)):
    """Debug endpoint to inspect player data structure."""
    path = f"{TEMP_UPLOAD_DIR}/{file.filename}"
    with open(path, "wb") as f:
        f.write(await file.read())

    data = parse_replay(path)
    
    # Return first player's data structure for debugging
    first_player_id = next(iter(data["players"].keys()))
    first_player = data["players"][first_player_id]
    
    return {
        "first_player_keys": list(first_player.keys()),
        "first_player_data": first_player,
        "sample_vehicles": data["vehicles"]
    }

@app.put("/battles/{battle_id}")
async def update_battle_endpoint(battle_id: int, battle_name: str):
    """Update battle name."""
    result = update_battle_name(battle_id, battle_name)
    if result.get("updated", 0) == 0:
        return {"status": "not_found", "message": f"Battle {battle_id} not found."}
    return {"status": "ok", "result": result}
