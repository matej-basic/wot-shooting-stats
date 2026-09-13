import os
import mysql.connector

def migrate():
    conn = mysql.connector.connect(
        host=os.environ["DATABASE_HOST"],
        user=os.environ["DATABASE_USER"],
        password=os.environ["DATABASE_PASSWORD"],
        database=os.environ["DATABASE_NAME"],
        port=int(os.environ["DATABASE_PORT"]),
        autocommit=True
    )

    cursor = conn.cursor()
    with open("./schema.sql") as f:
        cursor.execute(f.read(), multi=True)

    cursor.close()
    conn.close()
