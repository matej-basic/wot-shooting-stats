import json
import requests
from pathlib import Path

class VehicleLookup:
    def __init__(self, json_path: str = None):
        """
        Load local vehicle mapping JSON.
        If json_path is None, defaults to 'utils/vehicles.json'.
        """
        self.json_path = Path(json_path or Path(__file__).parent / "vehicles.json")
        self.tank_data = {}

        if self.json_path.exists():
            try:
                with open(self.json_path, "r", encoding="utf-8") as f:
                    self.tank_data = json.load(f)
            except json.JSONDecodeError as e:
                print(f"[VehicleLookup] Error: Failed to parse {self.json_path}: {e}")
                print(f"[VehicleLookup] Vehicle lookup will return 'Unknown'.")
        else:
            print(f"[VehicleLookup] Warning: {self.json_path} not found. Vehicle lookup will return 'Unknown'.")

    def get_vehicle_name(self, type_comp_descr: int, short_name: bool = True) -> str:
        """
        Returns the vehicle name for a given typeCompDescr.
        Defaults to short name if available.
        """
        vehicle_id = str(type_comp_descr)
        if vehicle_id in self.tank_data:
            vehicle_info = self.tank_data[vehicle_id]
            if short_name:
                return vehicle_info.get("short_name", vehicle_info.get("name", "Unknown"))
            else:
                return vehicle_info.get("name", "Unknown")
        return "Unknown"

    def refresh_from_api(self, api_key: str):
        """
        Fetch all vehicles from Wargaming API and overwrite local JSON file.
        """
        url = f"https://api.worldoftanks.com/wot/encyclopedia/vehicles/?application_id={api_key}"
        try:
            resp = requests.get(url)
            resp.raise_for_status()
            data = resp.json()
            if data.get("status") != "ok":
                raise ValueError("API response not OK")
            
            vehicles_data = data.get("data", {})
            # Save to local JSON
            with open(self.json_path, "w", encoding="utf-8") as f:
                json.dump(vehicles_data, f, indent=4, ensure_ascii=False)
            
            # Update in-memory cache
            self.tank_data = vehicles_data
            print(f"[VehicleLookup] Vehicle data refreshed: {len(self.tank_data)} entries saved.")
        except Exception as e:
            print(f"[VehicleLookup] Failed to refresh from API: {e}")
