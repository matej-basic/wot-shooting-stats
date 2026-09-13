#!/usr/bin/env python3
"""
Script to fetch and update WoT Personal Ratings for all existing users in the database.

This script:
1. Fetches all unique account IDs from player_battle_stats
2. Gets their current personal rating from the WoT API
3. Updates the users table with the most recent rating
4. Provides progress feedback

Run: python3 backfill_user_ratings.py
"""

import os
import sys
import time
import logging
from typing import List
import mysql.connector
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from utils.wot_rating import WoTRatingFetcher

load_dotenv()

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database config: DB_* wins, otherwise the DATABASE_* variables the backend uses
DB_CONFIG = {
    "host": os.getenv("DB_HOST") or os.getenv("DATABASE_HOST", "localhost"),
    "user": os.getenv("DB_USER") or os.getenv("DATABASE_USER", "root"),
    "password": os.getenv("DB_PASSWORD") or os.getenv("DATABASE_PASSWORD", ""),
    "database": os.getenv("DB_NAME") or os.getenv("DATABASE_NAME", "wot_stats"),
    "port": int(os.getenv("DB_PORT") or os.getenv("DATABASE_PORT", "3306")),
}

WOT_API_KEY = os.getenv("WOT_API_KEY")
REGION = os.getenv("WOT_REGION", "eu")

def get_all_account_ids() -> List[int]:
    """Fetch all unique account IDs from database."""
    try:
        db = mysql.connector.connect(**DB_CONFIG)
        cur = db.cursor()
        cur.execute("SELECT DISTINCT account_id FROM users ORDER BY account_id")
        accounts = [row[0] for row in cur.fetchall()]
        cur.close()
        db.close()
        return accounts
    except Exception as e:
        logger.error(f"Failed to fetch account IDs: {e}")
        return []

def update_user_rating(account_id: int, rating: int) -> bool:
    """Update user's personal rating in database."""
    try:
        db = mysql.connector.connect(**DB_CONFIG)
        cur = db.cursor()
        cur.execute(
            "UPDATE users SET personal_rating = %s, rating_updated_at = NOW() WHERE account_id = %s",
            (rating, account_id)
        )
        db.commit()
        cur.close()
        db.close()
        return True
    except Exception as e:
        logger.error(f"Failed to update rating for account {account_id}: {e}")
        return False

def main():
    if not WOT_API_KEY:
        logger.error("WOT_API_KEY is not set")
        sys.exit(1)

    logger.info(f"Starting rating backfill for region: {REGION.upper()}")

    # Initialize rating fetcher
    fetcher = WoTRatingFetcher(WOT_API_KEY, region=REGION)
    
    # Get all account IDs
    account_ids = get_all_account_ids()
    logger.info(f"Found {len(account_ids)} unique accounts to update")
    
    if not account_ids:
        logger.warning("No accounts found in database")
        return
    
    # Fetch and update ratings
    successful = 0
    failed = 0
    
    for idx, account_id in enumerate(account_ids, 1):
        # Rate limiting - WoT API has limits
        if idx > 1:
            time.sleep(0.1)  # Small delay between requests
        
        rating = fetcher.get_player_rating(account_id)
        
        if rating is not None:
            if update_user_rating(account_id, rating):
                successful += 1
                logger.info(f"[{idx}/{len(account_ids)}] Account {account_id}: Rating {rating}")
            else:
                failed += 1
        else:
            failed += 1
            logger.warning(f"[{idx}/{len(account_ids)}] Account {account_id}: No rating found")
    
    # Summary
    logger.info("=" * 60)
    logger.info(f"Backfill Complete!")
    logger.info(f"  Successful: {successful}")
    logger.info(f"  Failed: {failed}")
    logger.info(f"  Total: {len(account_ids)}")
    logger.info("=" * 60)

if __name__ == "__main__":
    main()
