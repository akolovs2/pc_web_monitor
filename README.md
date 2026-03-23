# HomeLab Monitor

A self-hosted real-time server monitoring and control platform for personal homelab infrastructure.

Built with **FastAPI** (Python) + **React** (TypeScript/Vite). Backend runs directly on the host for native system access, frontend is served via Docker Compose.

## Features

- Real-time system metrics (CPU, memory) over WebSockets
- Docker container management — list, start, stop, restart, inspect (resource usage of each container)
- Process viewer with kill support (deprecated, for now)
- Responsive dashboard with live updates
- Master admin auth

## Planned

- Web-based SSH terminal (browser → host shell)
- SSH into running Docker containers
- Systemd service control
- Scheduled task management
- Multi-server support
- User auth enhancement, admin panel for user and role management etc.

## Stack

| | |
|---|---|
| Backend | Python, FastAPI, WebSockets, psutil, docker-py |
| Frontend | React, TypeScript, Vite |
| Infrastructure | Docker, Docker Compose |
