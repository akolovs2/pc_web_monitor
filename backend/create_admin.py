import asyncio
from app.models.database import database, init_db
from app.services.auth_service import hash_password

async def create_admin():
    await init_db()
    
    password_hash = hash_password("")
    
    try:
        await database.execute(
            "INSERT INTO users (username, password_hash) VALUES (:username, :password_hash)",
            {"username": "admin", "password_hash": password_hash}
        )
        print("Admin user created!")
    except Exception as e:
        print(f"Error: {e}")
    
    await database.disconnect()

asyncio.run(create_admin())