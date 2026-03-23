# TODO: Migrate to from SQLite to PostgreSQL for better performance and scalability in production and SQLAlchemy for easier database management and migrations. For now, using SQLite for simplicity in development and testing.
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