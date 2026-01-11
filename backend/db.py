import os
from dotenv import load_dotenv
import mysql.connector

load_dotenv()

def get_db():
    return mysql.connector.connect(
        host=os.getenv("DATABASE_HOST", "localhost"),
        port=int(os.getenv("DATABASE_PORT", "3306")),
        user=os.getenv("DATABASE_USER", "wot_user"),
        password=os.getenv("DATABASE_PASSWORD", "wot_password"),
        database=os.getenv("DATABASE_NAME", "wot_stats"),
        autocommit=True
    )
