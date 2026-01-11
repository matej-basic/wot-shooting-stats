import requests
import json
from datetime import datetime

class MapLookup:
    def __init__(self, cache_file="utils/maps_cache.json"):
        self.cache_file = cache_file
        self.maps = {}
        self.load_cache()
    
    def load_cache(self):
        """Load maps from cache file."""
        try:
            with open(self.cache_file, 'r') as f:
                self.maps = json.load(f)
        except FileNotFoundError:
            self.maps = {}
        except Exception as e:
            print(f"[MapLookup] Failed to load cache '{self.cache_file}': {e}")
            self.maps = {}
        else:
            print(f"[MapLookup] Loaded {len(self.maps)} cached maps from '{self.cache_file}'")
    
    def refresh_from_api(self, api_key: str, language: str = "en"):
        """Fetch arena data from WoT API and cache it."""
        try:
            url = "https://api.worldoftanks.eu/wot/encyclopedia/arenas/"
            params = {
                "application_id": api_key,
                "language": language,
                "fields": "arena_id,name_i18n,description"
            }
            print(f"[MapLookup] Requesting arenas from API: {url} params={params}")
            response = requests.get(url, params=params, timeout=10)
            print(f"[MapLookup] HTTP status: {response.status_code}")
            try:
                response.raise_for_status()
            except Exception as e:
                print(f"[MapLookup] HTTP error while fetching arenas: {e}")
                print(f"[MapLookup] Response body: {response.text[:1000]}")
                return False

            try:
                data = response.json()
            except Exception as e:
                print(f"[MapLookup] Failed to parse JSON response: {e}")
                print(f"[MapLookup] Response text: {response.text[:1000]}")
                return False

            print(f"[MapLookup] API returned status field: {data.get('status')}")
            if data.get("status") == "ok":
                arena_count = len(data.get("data", {}))
                print(f"[MapLookup] Fetched {arena_count} arenas from API")
                # Store maps by arena_id
                for arena_id, arena_data in data.get("data", {}).items():
                    self.maps[str(arena_id)] = {
                        "name": arena_data.get("name_i18n"),
                        "description": arena_data.get("description"),
                        "cached_at": datetime.now().isoformat()
                    }

                self.save_cache()
                print(f"[MapLookup] Cached {len(self.maps)} maps to '{self.cache_file}'")
                return True
            else:
                print(f"[MapLookup] API error: {data.get('error')}")
                return False
        except Exception as e:
            print(f"Failed to refresh maps from API: {e}")
            return False
    
    def save_cache(self):
        """Save maps cache to file."""
        with open(self.cache_file, 'w') as f:
            json.dump(self.maps, f, indent=2)
    
    def get_map_name(self, arena_id):
        """Get map name by arena ID."""
        arena_id_str = str(arena_id)
        if arena_id_str in self.maps:
            name = self.maps[arena_id_str].get("name", "Unknown")
            print(f"[MapLookup] Resolved arena_id {arena_id} -> '{name}' from cache")
            return name
        print(f"[MapLookup] arena_id {arena_id} not found in cache")
        return "Unknown"
