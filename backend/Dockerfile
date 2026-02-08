# Dockerfile for a generic Python backend (adjust as needed)
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

# Install system deps needed by some packages (adjust or remove)
RUN apt-get update && apt-get install -y --no-install-recommends build-essential gcc && rm -rf /var/lib/apt/lists/*

# Install Python deps if requirements.txt exists
COPY requirements.txt .
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi

# Copy app sources
COPY . .

EXPOSE ${PORT}

# Try to run common entrypoints: uvicorn (FastAPI), app.py, main.py
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]