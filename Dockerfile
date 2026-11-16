# Multi-stage production Dockerfile for AEGIS Emergency Swarm
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend and core modules
COPY api/ api/
COPY core/ core/
COPY integrations/ integrations/
COPY data/ data/
COPY .env* ./

# Default port for cloud environments
ENV PORT=8000
EXPOSE 8000

# Start production uvicorn ASGI server
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT}"]
