# AEGIS — Autonomous Emergency Governance & Intelligence System

AEGIS is a multi-agent emergency response simulation powered by **Gemini AI**, anchoring tactical decisions cryptographically on **Solana Devnet**, streaming warehouse telemetry to **Snowflake**, and synthesizing real-time radio broadcasts via **ElevenLabs**.

---

## 🏛️ System Architecture

* **Autonomous Deliberation Swarm**: Multi-turn tactical negotiation using specialized Gemini agents:
  * `MedicalAgent`: Prioritizes patient triage and protects trauma bed allocations.
  * `FireAgent`: Evaluates structural integrity, thermal spread, and perimeter collapse hazards.
  * `PoliceAgent`: Enforces cordons, perimeter lockouts, and evacuation paths.
  * `LogisticsAgent`: Manages fuel constraints, fleet readiness, and hospital saturation limits.
  * `CommandAgent`: Formulates the final Incident Action Plan and generates voice dispatch summaries.
* **Cryptographic Ledger**: SHA-256 fingerprinting of every command decision committed to **Solana Devnet**.
* **Audio Synthesis**: Low-latency voice radio dispatch generated via **ElevenLabs**.
* **Telemetry Data Warehouse**: Logs simulation actions to **Snowflake**.
* **Tactical Command Dashboard**: Next.js 14 frontend featuring real-time WebSockets and an interactive city grid.

---

## 🚀 Quickstart

### 1. Prerequisites
* Python 3.11+
* Node.js 18+

### 2. Backend Setup
```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Fill in your GEMINI_API_KEY and ELEVENLABS_API_KEY in .env

uvicorn api.main:app --reload --port 8000