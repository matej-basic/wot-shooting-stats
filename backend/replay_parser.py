from utils.parser import Parser
from utils.file_handler import FileHandler
from utils.vehicle_lookup import VehicleLookup

import json

def parse_replay(replay_path: str):
    file_object = FileHandler.open_file(replay_path)
    c = Parser(file_object)
    battle_data = c.battle_data[0]
    metadata = c.get_metadata_fields()

    return {
        "arena_unique_id": battle_data["arenaUniqueID"],
        "players": battle_data["players"],
        "vehicles": battle_data["vehicles"],
        "common": battle_data["common"],
        "metadata": metadata
    }
