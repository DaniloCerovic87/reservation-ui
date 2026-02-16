# Reservation UI (Frontend) — Docker run

This frontend is packaged as a production build served by **nginx**.
The UI calls the backend via relative `/api/...` paths, and nginx forwards those requests to the backend ports on the host machine.

## Prerequisites
- Docker + Docker Compose
- **Backend repo must be running first**, exposing ports on the host:
  - Auth: `http://localhost:8081`
  - Reservations: `http://localhost:8080`
  - Rooms: `http://localhost:8083`
  - Calendar: `http://localhost:8085`

## Run (Frontend)
From this repo root:

```bash
docker compose up --build
