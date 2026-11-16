# AEGIS — Autonomous Emergency Governance & Intelligence System

AEGIS is an agentic emergency response command-and-control (C2) system powered by **Gemini AI**, anchoring tactical decisions cryptographically on **Solana Devnet**, streaming warehouse telemetry to **Snowflake**, synthesizing real-time radio broadcasts via **ElevenLabs**, and rendering a live claymorphic 3D tactical command console in **Next.js 14 & Three.js**.

---

## 🏛️ System Architecture

* **Autonomous Deliberation Swarm**: Multi-turn tactical negotiation using specialized Gemini agents:
  * `MedicalAgent`: Prioritizes patient triage (critical > serious > minor) and protects trauma bed allocations at Central Trauma (H1) and St. Luke's Clinic (H2).
  * `FireAgent`: Evaluates structural integrity, thermal spread, and perimeter collapse hazards across city sectors.
  * `PoliceAgent`: Enforces cordons, perimeter lockouts, and clears evacuation transit corridors.
  * `LogisticsAgent`: Manages fuel constraints, fleet readiness, and hospital saturation limits.
  * `CommandAgent`: Formulates the final Incident Action Plan and generates voice dispatch summaries.
* **Dynamic Simulation Engine**: Autonomous unit state machine with lifecycle tracking (dispatched → on-scene → patient transport → hospital admission → auto-refuel and return to service).
* **Cryptographic Ledger**: SHA-256 fingerprinting of every command decision committed with Ed25519 signer keypair on **Solana Devnet**.
* **Audio Synthesis**: Low-latency tactical radio dispatch generated via **ElevenLabs** (with automatic Web Speech API browser fallback).
* **Telemetry Data Warehouse**: Logs simulation actions to **Snowflake** (with local telemetry fallback).
* **Tactical Command Dashboard**: Next.js 14 frontend featuring real-time WebSockets, dynamic Three.js 3D city perspective, turn-by-turn emergency routing, and hospital bed reception management.

---

## 🚀 Quickstart Guide

### 1. Prerequisites
* Python 3.11+
* Node.js 18+

### 2. Backend Setup
```bash
# Navigate to project root
cd aegis-emergency-swarm

# Activate Python Virtual Environment
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install Python requirements
pip install -r requirements.txt

# Start FastAPI backend server
uvicorn api.main:app --reload --port 8000
```
Backend runs at `http://127.0.0.1:8000` (API documentation at `http://127.0.0.1:8000/docs`).

### 3. Frontend Setup
```bash
# Open a new terminal and navigate to ui/
cd aegis-emergency-swarm/ui

# Install dependencies (if not already installed)
npm install

# Start Next.js development server
npm run dev
# Or build and start production server
npm run build
npm start
```
Frontend runs at `http://localhost:3000`.

---

## 🗺️ Command Console Views

* **`[01] Admin C2 Swarm` (`/`)**: Main tactical dashboard with live 3D Three.js city grid, real-time Gemini activity feed, dynamic fleet & hospital telemetry, manual disaster drill scenario injector, and Solana cryptographic proof badge.
* **`[02] Emergency Fleet Uber` (`/fleet`)**: Turn-by-turn tactical navigation for response drivers (`AMB-07`, `AMB-12`, `FIRE-03`, `POL-02`), computing Dijkstra shortest paths bypassing active roadblocks and burning hazards.
* **`[03] Hospital Bed Management` (`/hospitals`)**: Reception ward bed capacity management for Central Trauma (H1) and St. Luke's Clinic (H2), synchronized in real time with the multi-agent AI swarm.
* **`Tactical Login` (`/login`)**: Authenticated officer login screen for Incident Commanders, EMS Directors, and Fire Operations Chiefs.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | API status and current simulation tick |
| `GET` | `/api/state` | Full world state snapshot (units, roads, hospitals, patients, incidents) |
| `POST` | `/api/simulate/tick` | Advances simulation tick, runs Gemini deliberation, synthesizes voice, and signs Solana audit |
| `POST` | `/api/reset` | Resets simulation to Tick 0 |
| `GET` | `/api/audio/latest` | Streams latest ElevenLabs voice broadcast MP3 |
| `POST` | `/api/fleet/route` | Computes optimal safe routing avoiding blocked road corridors |
| `POST` | `/api/hospitals/update` | Updates hospital bed capacities and broadcasts changes over WebSockets |
| `POST` | `/api/admin/inject-data` | Injects manual scenario drill hazards and casualties into swarm telemetry |
| `WS` | `/ws` | Real-time WebSocket connection for live telemetry streaming |
