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

class Container(BaseModel):
    id: str
    name: str
    status: str
    image: str
    cpu: float
    memory: float
    memory_usage: int
    memory_limit: int

class ContainerAction(BaseModel):
    success: bool
    message: str

class Metrics(BaseModel):
    cpu: float
    ram: float
    services: list[Service]
    tasks: list[Task]

class KillResponse(BaseModel):
    success: bool
    message: str