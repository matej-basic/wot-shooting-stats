"""
WoT Personal Rating Fetcher for World of Tanks
Fetches player personal rating from WoT API
"""

import requests
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class WoTRatingFetcher:
    def __init__(self, api_key: str, region: str = "eu"):
        self.api_key = api_key
        self.region = region.lower()
        self.base_url = f"https://api.worldoftanks.{region}/wot"
    
    def get_player_rating(self, account_id: int) -> Optional[int]:
        """Fetch player personal rating from WoT API"""
        url = f"{self.base_url}/account/info/"
        params = {
            "application_id": self.api_key,
            "account_id": account_id,
            "fields": "global_rating"
        }
        
        try:
            response = requests.get(url, params=params, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            if data.get("status") == "ok" and data.get("data"):
                player_data = data["data"].get(str(account_id))
                if player_data and "global_rating" in player_data:
                    return player_data["global_rating"]
            
            logger.warning(f"No rating found for account {account_id}")
            return None
            
        except requests.RequestException as e:
            logger.error(f"Failed to fetch rating for account {account_id}: {e}")
            return None
    
    def get_rating_color(self, rating: int) -> str:
        """Get color category for WoT Personal Rating"""
        if rating >= 7000:
            return "purple"  # Excellent
        elif rating >= 5000:
            return "blue"  # Very Good
        elif rating >= 3000:
            return "green"  # Good
        elif rating >= 1500:
            return "yellow"  # Average
        else:
            return "orange"  # Below Average
    
    def get_rating_label(self, rating: int) -> str:
        """Get text label for WoT Personal Rating"""
        if rating >= 7000:
            return "Excellent"
        elif rating >= 5000:
            return "Very Good"
        elif rating >= 3000:
            return "Good"
        elif rating >= 1500:
            return "Average"
        else:
            return "Below Average"
