# app/routers/remote.py
import asyncio
from fastapi import APIRouter, WebSocket
from app.services import remote_service
from app.config import config

router = APIRouter()

@router.websocket("/remote")
async def remote_desktop(websocket: WebSocket):
    await websocket.accept()
    loop = asyncio.get_event_loop()
    
    async def send_screen():
        while True:
            try:
                image = await loop.run_in_executor(None, remote_service.capture_screen)
                await websocket.send_json({
                    "type": "screen",
                    "image": image
                })
                await asyncio.sleep(1 / config.SCREEN_FPS)
            except:
                break
    
    asyncio.create_task(send_screen())
    
    try:
        while True:
            data = await websocket.receive_json()
            action_type = data.get('type')
            
            actions = {
                'click': lambda: remote_service.handle_click(data['x'], data['y']),
                'move': lambda: remote_service.handle_move(data['x'], data['y']),
                'key': lambda: remote_service.handle_key(data['key']),
                'type': lambda: remote_service.handle_type(data['text']),
            }
            
            if action_type in actions:
                await loop.run_in_executor(None, actions[action_type])
                
    except Exception as e:
        print(f"Remote session closed: {e}")