import io
import json
import sys
import codecs
from json import JSONDecoder


def open_file(file: str) -> str:
    """
    Opens the world of tanks replay file and puts all the content into a string object.
    Only the first line contains actual data; the rest is binary metadata.
    
    :param file: world of tanks replay file
    :return: decoded text with non-printable characters filtered
    """
    with io.open(file, 'r', encoding='utf-8', errors='ignore') as infile:
        for idx, line in enumerate(infile):
            if idx == 0:
                raw_data = []
                raw_line = line.split()
                
                for record in raw_line:
                    for letter in record:
                        # Keep only printable ASCII characters (34-127)
                        if 34 <= ord(letter) <= 127:
                            raw_data.append(letter)

    return ''.join(raw_data)


def decode_replay_format(text: str):
    """
    Decode replay format: handles the quoted, escaped JSON prefix format.
    
    :param text: raw replay text
    :return: unescaped, decoded JSON string
    """
    # Remove the "NN prefix (quoted escaped JSON)
    if text.startswith('"') and '{' in text:
        # Find where the actual JSON starts
        idx = text.find('{')
        if idx > 1:
            # Extract from the JSON start to the end (removing trailing quote)
            text = text[idx:-1]
            
            # Decode escape sequences
            try:
                text = codecs.escape_decode(text)[0].decode('utf-8')
            except Exception:
                pass  # If decoding fails, use as-is
    
    return text


def extract_json_objects(text: str):
    """
    Extract JSON objects from text using streaming decoder.
    
    :param text: raw text containing JSON objects
    :return: list of decoded JSON objects
    """
    decoder = JSONDecoder()
    objects = []
    pos = 0
    
    while True:
        match = text.find('{', pos)
        if match == -1:
            break
            
        try:
            result, index = decoder.raw_decode(text[match:])
            objects.append(result)
            pos = match + index
        except ValueError:
            pos = match + 1
    
    return objects


def extract_shot_stats(objects):
    """
    Extract shot statistics from replay JSON objects.
    
    :param objects: list of JSON objects from replay file
    :return: dictionary with organized shot and battle statistics
    """
    result = {
        "metadata": None,
        "battle_data": None,
        "player_stats": None,
        "shot_details": None
    }
    
    if len(objects) > 0:
        result["metadata"] = objects[0]  # Contains client version, map, vehicles, player info
    
    if len(objects) > 1:
        obj2 = objects[1]  # Contains personal, players, vehicles, common data
        result["battle_data"] = obj2
        
        # Extract personal player stats and shot details
        if "personal" in obj2:
            player_id = list(obj2["personal"].keys())[0] if obj2["personal"] else None
            if player_id:
                personal = obj2["personal"][player_id]
                result["player_stats"] = {
                    "player_id": player_id,
                    "shots_fired": personal.get("shots", 0),
                    "direct_hits": personal.get("directHits", 0),
                    "piercings": personal.get("piercings", 0),
                    "damage_dealt": personal.get("damageDealt", 0),
                    "damage_received": personal.get("damageReceived", 0),
                    "kills": personal.get("kills", 0),
                    "assists_track": personal.get("damageAssistedTrack", 0),
                    "assists_radio": personal.get("damageAssistedRadio", 0),
                    "assists_stun": personal.get("damageAssistedStun", 0),
                    "assists_inspire": personal.get("damageAssistedInspire", 0),
                    "assists_smoke": personal.get("damageAssistedSmoke", 0),
                }
                
                # Extract per-enemy shot details
                if "details" in personal:
                    details = {}
                    for enemy_key, stats in personal["details"].items():
                        details[enemy_key] = {
                            "direct_hits": stats.get("directHits", 0),
                            "piercings": stats.get("piercings", 0),
                            "damage_dealt": stats.get("damageDealt", 0),
                            "damage_received": stats.get("damageReceived", 0),
                            "crits": stats.get("crits", 0),
                            "damage_assisted_track": stats.get("damageAssistedTrack", 0),
                            "damage_assisted_radio": stats.get("damageAssistedRadio", 0),
                            "ricochets": stats.get("rickochetsReceived", 0),
                            "stun_duration": stats.get("stunDuration", 0),
                            "fire": stats.get("fire", 0),
                        }
                    result["shot_details"] = details
    
    if len(objects) > 3:
        # Object 4 contains final frag counts
        result["final_frags"] = objects[3]
    
    return result


def main():
    """Main entry point."""
    if len(sys.argv) != 2:
        print("Usage: python shots.py <path_to.wotreplay>", file=sys.stderr)
        sys.exit(1)

    replay_path = sys.argv[1]

    print(f"Reading replay from: {replay_path}", file=sys.stderr)
    
    # Open and decode the file
    file_text = open_file(replay_path)
    file_text = decode_replay_format(file_text)
    
    # Extract all JSON objects
    objects = extract_json_objects(file_text)
    
    print(f"Found {len(objects)} JSON objects in replay", file=sys.stderr)
    
    # Extract and output shot statistics
    shot_stats = extract_shot_stats(objects)
    
    # Output formatted JSON to stdout
    print(json.dumps(shot_stats, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()