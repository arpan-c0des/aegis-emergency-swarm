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
* **Live Scenario Drill & Model Training Engine**:
  * **Immediate Execution**: When manual scenario drills (explosions, hazmat leaks, flash floods, collapses) are injected, the swarm executes the scenario immediately upon input.
  * **In-Context Policy Memory (RLIF)**: Evaluates tactical policy fitness and derives learned lessons that are injected into subsequent agent deliberation prompts.
  * **Supervised Fine-Tuning Dataset Generation**: Automatically logs full multi-agent deliberation traces into `data/gemini_finetune_dataset.jsonl` for fine-tuning Gemini models.
* **Dynamic Simulation Engine**: Autonomous unit state machine with lifecycle tracking (dispatched → on-scene → patient transport → hospital admission → auto-refuel and return to service).
* **Cryptographic Ledger**: SHA-256 fingerprinting of every command decision committed with Ed25519 signer keypair on **Solana Devnet**.
* **Audio Synthesis**: Low-latency tactical radio dispatch generated via **ElevenLabs** (with automatic Web Speech API browser fallback).
* **Telemetry Data Warehouse**: Logs simulation actions to **Snowflake** (with local telemetry fallback).
* **High-Res 3D City Visualization**: Next.js 14 & Three.js console with real-time OrbitControls, smooth vehicle cruising, rotating sirens, fire & smoke particles, water suppression spray, and interactive raycast inspector.

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

## 🎯 Live Scenario Injection & Model Training

1. In the dashboard header or bottom dock, click **INJECT SCENARIO** or toggle **DRILL: ON**.
2. Select a quick drill template (e.g. *💥 Subway Methane Gas Leak*, *☣️ Industrial Chemical Spill*, *🌊 Flash Flood Surge*, *🏢 Building Collapse*) or customize location, severity, casualties, and road closures.
3. Click **⚡ RUN SCENARIO & TRAIN SWARM**:
   - The swarm **immediately executes the drill**: Gemini agents deliberate, dispatch ambulances and fire engines, reroute around blocked roads, and formulate the Incident Action Plan.
   - The Incident Commander radio dispatch is synthesized and played aloud.
   - The **Training Engine** evaluates the response, calculates a **Tactical Fitness Score**, derives an actionable **Lesson Learned**, updates in-context memory, and exports a fine-tuning sample to `data/gemini_finetune_dataset.jsonl`.
4. Click **Export Gemini Fine-Tune JSONL** to download the fine-tuning dataset directly from your browser.

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
| `POST` | `/api/admin/inject-data` | Injects manual scenario drill, executes swarm immediately, and records training episode |
| `GET` | `/api/training/stats` | Returns current model training statistics, fitness score, and learned lessons |
| `GET` | `/api/training/export` | Downloads the supervised fine-tuning dataset in Gemini JSONL format |
| `WS` | `/ws` | Real-time WebSocket connection for live telemetry streaming |
