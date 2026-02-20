# Reservation UI (Frontend) — Docker run

This frontend is packaged as a production build served by **nginx**.
The UI calls the backend via relative `/api/...` paths, and nginx forwards those requests to the backend ports on the host machine.

## Prerequisites
- Docker + Docker Compose
- **Backend repo must be running first**, exposing ports on the host:
  - AuthenticationService: `http://localhost:8081`
  - ReservationService: `http://localhost:8080`
  - EmployeeService: `http://localhost:8082`
  - RoomService: `http://localhost:8083`
  - CalendarService: `http://localhost:8085`

## Run (Frontend)
From this repo root:

```bash
docker compose up --build
