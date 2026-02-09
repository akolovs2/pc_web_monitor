# app/models/database.py
from databases import Database
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'auth.db')
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

DATABASE_URL = f"sqlite:///{DB_PATH}"
database = Database(DATABASE_URL)

async def init_db():
    await database.connect()
    await database.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            refresh_token TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)