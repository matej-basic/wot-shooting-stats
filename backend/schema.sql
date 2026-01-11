CREATE DATABASE IF NOT EXISTS wot_stats;
USE wot_stats;

-- CLANS
CREATE TABLE clans (
    id BIGINT PRIMARY KEY,
    tag VARCHAR(10),
    name VARCHAR(255)
);

-- USERS / PLAYERS
CREATE TABLE users (
    account_id BIGINT PRIMARY KEY,
    name VARCHAR(255),
    clan_id BIGINT,
    FOREIGN KEY (clan_id) REFERENCES clans(id) ON DELETE SET NULL
);

-- VEHICLES
CREATE TABLE vehicles (
    type_comp_descr INT PRIMARY KEY,
    name VARCHAR(255)
);

-- BATTLES
CREATE TABLE battles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    battle_name VARCHAR(255) DEFAULT 'Battle',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PER PLAYER PER BATTLE STATS
CREATE TABLE player_battle_stats (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    battle_id BIGINT,
    account_id BIGINT,
    vehicle_type INT,
    team TINYINT,

    shots INT,
    hits INT,
    penetrations INT,
    damage_dealt INT,

    accuracy DECIMAL(5,2),
    penetration_rate DECIMAL(5,2),
    pen_to_shot_ratio DECIMAL(5,2),

    FOREIGN KEY (battle_id) REFERENCES battles(id),
    FOREIGN KEY (account_id) REFERENCES users(account_id),
    FOREIGN KEY (vehicle_type) REFERENCES vehicles(type_comp_descr),

    INDEX (account_id),
    INDEX (battle_id)
);
