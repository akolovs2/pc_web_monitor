# app/services/remote_service.py
from PIL import ImageGrab
import pyautogui
import base64
import io
from app.config import config

pyautogui.FAILSAFE = False

def capture_screen() -> str:
    img = ImageGrab.grab()
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG', quality=config.SCREEN_QUALITY)
    return base64.b64encode(buffer.getvalue()).decode()

def handle_click(x: int, y: int) -> None:
    pyautogui.click(x, y)

def handle_move(x: int, y: int) -> None:
    pyautogui.moveTo(x, y)

def handle_key(key: str) -> None:
    pyautogui.press(key)

def handle_type(text: str) -> None:
    pyautogui.write(text)