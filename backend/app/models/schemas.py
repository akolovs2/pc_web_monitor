# app/models/schemas.py
from pydantic import BaseModel

class Service(BaseModel):
    name: str
    status: str

class Task(BaseModel):
    pid: int
    name: str
    cpu: float
    memory: float
    status: str

class Metrics(BaseModel):
    cpu: float
    ram: float
    services: list[Service]
    tasks: list[Task]

class KillResponse(BaseModel):
    success: bool
    message: str

class RemoteInput(BaseModel):
    type: str
    x: int | None = None
    y: int | None = None
    key: str | None = None
    text: str | None = None