from db import get_db

def upsert_clan(clan_id, tag=None, name=None):
    """Insert or ignore clan entry."""
    if not clan_id:
        return
    db = get_db()
    cur = db.cursor()
    cur.execute("""
        INSERT IGNORE INTO clans (id, tag, name)
        VALUES (%s, %s, %s)
    """, (clan_id, tag, name))

def upsert_user(account_id, name, clan_id=None):
    # Ensure clan exists if clan_id is provided
    if clan_id:
        upsert_clan(clan_id)
    
    db = get_db()
    cur = db.cursor()
    cur.execute("""
        INSERT INTO users (account_id, name, clan_id)
        VALUES (%s,%s,%s)
        ON DUPLICATE KEY UPDATE name=VALUES(name), clan_id=VALUES(clan_id)
    """, (account_id, name, clan_id))

def upsert_vehicle(type_comp_descr, name):
    db = get_db()
    cur = db.cursor()
    cur.execute("""
        INSERT IGNORE INTO vehicles (type_comp_descr, name)
        VALUES (%s,%s)
    """, (type_comp_descr, name))

def create_battle(battle_name="Battle", battle_timestamp=None):
    """Create a new battle with given name."""
    db = get_db()
    cur = db.cursor()
    if battle_timestamp:
        # Convert Unix timestamp to MySQL TIMESTAMP format
        from datetime import datetime
        dt = datetime.fromtimestamp(battle_timestamp)
        cur.execute(
            "INSERT INTO battles (battle_name, created_at) VALUES (%s, %s)",
            (battle_name, dt)
        )
    else:
        cur.execute(
            "INSERT INTO battles (battle_name) VALUES (%s)",
            (battle_name,)
        )
    return cur.lastrowid

def insert_player_stats(battle_id, account_id, vehicle_type, team, stats):
    db = get_db()
    cur = db.cursor()
    cur.execute("""
        INSERT INTO player_battle_stats (
            battle_id, account_id, vehicle_type, team,
            shots, hits, penetrations, damage_dealt,
            accuracy, penetration_rate, pen_to_shot_ratio
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """, (
        battle_id, account_id, vehicle_type, team,
        stats["shots"], stats["hits"], stats["penetrations"],
        stats["damage_dealt"], stats["accuracy"],
        stats["penetration_rate"], stats["pen_to_shot_ratio"]
    ))

def get_all_battles():
    """Fetch all battles with name and timestamp info."""
    db = get_db()
    cur = db.cursor(dictionary=True)
    cur.execute("""
        SELECT 
            b.id,
            b.battle_name,
            b.created_at,
            COUNT(DISTINCT pbs.account_id) as player_count
        FROM battles b
        LEFT JOIN player_battle_stats pbs ON b.id = pbs.battle_id
        GROUP BY b.id, b.battle_name, b.created_at
        ORDER BY b.created_at DESC
    """)
    return cur.fetchall()

def get_battle_stats(battle_id):
    """Fetch stats for a specific battle with player and clan info."""
    db = get_db()
    cur = db.cursor(dictionary=True)
    cur.execute("""
        SELECT 
            u.name,
            pbs.team,
            c.tag as clanAbbrev,
            v.name as vehicleName,
            pbs.shots,
            pbs.hits,
            pbs.penetrations,
            pbs.damage_dealt as damageDealt,
            pbs.accuracy,
            pbs.penetration_rate as penetrationRate,
            pbs.pen_to_shot_ratio as penToShotRatio
        FROM player_battle_stats pbs
        JOIN users u ON pbs.account_id = u.account_id
        LEFT JOIN clans c ON u.clan_id = c.id
        JOIN vehicles v ON pbs.vehicle_type = v.type_comp_descr
        WHERE pbs.battle_id = %s
        ORDER BY u.name ASC
    """, (battle_id,))
    return cur.fetchall()


def delete_battle(battle_id):
    """Delete a battle and its associated player stats.

    This removes rows from `player_battle_stats` for the given
    `battle_id` and then removes the `battles` row. Returns a
    dict with counts of deleted rows.
    """
    db = get_db()
    cur = db.cursor()
    # Delete player stats first to avoid foreign key constraint errors
    cur.execute("DELETE FROM player_battle_stats WHERE battle_id = %s", (battle_id,))
    stats_deleted = cur.rowcount
    cur.execute("DELETE FROM battles WHERE id = %s", (battle_id,))
    battles_deleted = cur.rowcount
    db.commit()
    return {"player_stats_deleted": stats_deleted, "battles_deleted": battles_deleted}


def update_battle_name(battle_id, battle_name):
    """Update a battle's name."""
    db = get_db()
    cur = db.cursor()
    cur.execute("UPDATE battles SET battle_name = %s WHERE id = %s", (battle_name, battle_id))
    updated = cur.rowcount
    db.commit()
    return {"updated": updated}
