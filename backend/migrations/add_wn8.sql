-- Migration: Add WoT Personal Rating to users table
-- Run this to add rating tracking to existing database

ALTER TABLE users 
ADD COLUMN personal_rating INT DEFAULT NULL,
ADD COLUMN rating_updated_at TIMESTAMP NULL DEFAULT NULL;

CREATE INDEX idx_user_rating ON users(personal_rating);
