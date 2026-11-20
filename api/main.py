import os
import json
import asyncio
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse
from pydantic import BaseModel

from core.world_state import CityState, Incident, Patient
from core.tools import SimulationTools, NavigationRouter
from core.agents import SwarmAgents
from core.orchestrator import SwarmOrchestrator
from core.training import training_engine, FINETUNE_FILE
from integrations.voice_elevenlabs import DispatchAudioService, DEFAULT_AUDIO_PATH
from integrations.warehouse_snowflake import SnowflakeWarehouse
from integrations.audit_solana import SolanaAuditLedger
from api.auth import auth_verifier

ROOT_DIR = Path(__file__).resolve().parent.parent

app = FastAPI(
    title="AEGIS - Autonomous Emergency Governance & Intelligence System",
    version="1.0.0"
)

# Enable CORS for Next.js frontend (local development, tunnels, and live cloud deployments)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Simulation & Integration Singletons
orchestrator = SwarmOrchestrator()
voice_service = DispatchAudioService()
snowflake_wh = SnowflakeWarehouse()
solana_ledger = SolanaAuditLedger()

HOSP_PERSIST_FILE = ROOT_DIR / "data" / "central_hospitals.json"

def load_central_hospitals() -> dict:
    if HOSP_PERSIST_FILE.exists():
        try:
            with open(HOSP_PERSIST_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[Hospitals] Error reading hospitals file: {e}")
    return {
        "H1": 28,
        "H2": 12,
        "updatedAt": "2026-11-17T00:00:00.000Z"
    }

def save_central_hospitals(state: dict):
    try:
        HOSP_PERSIST_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(HOSP_PERSIST_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        print(f"[Hospitals] Error writing hospitals file: {e}")

_init_beds = load_central_hospitals()
if "H1" in orchestrator.state.hospitals and "H1" in _init_beds:
    orchestrator.state.hospitals["H1"].available_beds = _init_beds["H1"]
if "H2" in orchestrator.state.hospitals and "H2" in _init_beds:
    orchestrator.state.hospitals["H2"].available_beds = _init_beds["H2"]

# Connected WebSocket clients for real-time dashboard streaming
active_connections: List[WebSocket] = []

async def broadcast_message(payload: dict):
    """Sends real-time updates to all connected browser clients."""
    msg = json.dumps(payload)
    for conn in list(active_connections):
        try:
            await conn.send_text(msg)
        except Exception:
            if conn in active_connections:
                active_connections.remove(conn)

@app.get("/")
def read_root():
    return {
        "system": "AEGIS Emergency Swarm API",
        "status": "online",
        "version": "1.0.0",
        "tick": orchestrator.state.time_step
    }

@app.get("/api/state")
def get_world_state(user: dict = Depends(auth_verifier.verify_token)):
    """Returns the current snapshot of roads, hospitals, units, and patients."""
    return orchestrator.state.export_state_dict()

@app.post("/api/simulate/tick")
async def trigger_simulation_tick(user: dict = Depends(auth_verifier.verify_token)):
    # 1. Run multi-agent swarm negotiation
    result = orchestrator.run_cycle()
    time_step = result["time_step"]
    command_plan = result["command_plan"]
    actions = result["executed_actions"]
    broadcast_text = result["broadcast_summary"]

    # 2. Persist to Snowflake Warehouse
    snowflake_wh.log_swarm_actions(time_step, actions)

    # 3. Anchor cryptographic audit trail on Solana
    solana_tx = solana_ledger.record_decision_hash(time_step, command_plan, actions)
    result["solana_audit"] = solana_tx

    # 4. Generate dynamic tactical voice alert via ElevenLabs for this specific tick
    audio_path = voice_service.synthesize_dispatch_call(broadcast_text, output_path=DEFAULT_AUDIO_PATH)
    result["audio_available"] = bool(audio_path and os.path.exists(audio_path))

    # 5. Broadcast new state over WebSockets to UI
    await broadcast_message({
        "type": "SIMULATION_UPDATE",
        "data": result
    })

    return result

@app.post("/api/reset")
async def reset_simulation():
    """Resets the simulation back to initial genesis state and notifies all clients."""
    global orchestrator
    
    # 1. Instantiate a clean world state and orchestrator, preserving configured hospital bed counts
    orchestrator = SwarmOrchestrator()
    _current_beds = load_central_hospitals()
    if "H1" in orchestrator.state.hospitals and "H1" in _current_beds:
        orchestrator.state.hospitals["H1"].available_beds = _current_beds["H1"]
    if "H2" in orchestrator.state.hospitals and "H2" in _current_beds:
        orchestrator.state.hospitals["H2"].available_beds = _current_beds["H2"]
    fresh_state = orchestrator.state.export_state_dict()

    # 2. Safely remove previous audio dispatch file if present
    if os.path.exists(DEFAULT_AUDIO_PATH):
        try:
            os.remove(DEFAULT_AUDIO_PATH)
        except Exception:
            pass

    # 3. Broadcast the clean initial state to all connected frontends
    reset_payload = {
        "type": "RESET_STATE",
        "data": {
            "updated_world_state": fresh_state,
            "transcript": [],
            "command_plan": "",
            "solana_audit": None,
            "audio_available": False,
            "executed_actions": []
        }
    }
    await broadcast_message(reset_payload)

    return {
        "status": "success",
        "message": "Simulation reset to Tick 0",
        "state": fresh_state
    }

@app.get("/api/audio/latest")
def get_latest_audio():
    """Serves the latest tactical radio broadcast audio file with cache-busting headers."""
    if os.path.exists(DEFAULT_AUDIO_PATH):
        with open(DEFAULT_AUDIO_PATH, "rb") as f:
            audio_bytes = f.read()
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            }
        )
    return Response(
        content=json.dumps({"status": "error", "message": "No audio file generated yet."}),
        status_code=404,
        media_type="application/json"
    )

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Live streaming socket for tactical dashboard updates."""
    await websocket.accept()
    active_connections.append(websocket)
    try:
        # Send initial world state immediately upon connection
        await websocket.send_text(json.dumps({
            "type": "INITIAL_STATE",
            "data": orchestrator.state.export_state_dict()
        }))
        while True:
            # Keep socket alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)

# Configuration state for Auto vs Manual Injection
system_config = {
    "auto_mode": False  # Default to manual / drill capable for training
}

class ManualInjectPayload(BaseModel):
    incident_type: str
    location: str
    severity: str
    details: str
    block_road: Optional[str] = None
    patient_count: int = 1

class HospitalUpdatePayload(BaseModel):
    hospital_id: str
    available_beds: int
    trauma_ready: bool = True
    generator_status: str = "NOMINAL"

class RouteRequest(BaseModel):
    unit_id: str
    destination: str

@app.get("/api/config")
def get_config():
    return system_config

@app.post("/api/config/toggle-auto")
def toggle_auto_mode():
    system_config["auto_mode"] = not system_config["auto_mode"]
    return {"auto_mode": system_config["auto_mode"]}

# 1. FLEET NAVIGATION ENDPOINT
@app.post("/api/fleet/route")
def get_fleet_route(req: RouteRequest):
    unit = orchestrator.state.find_unit(req.unit_id)
    origin = unit.location if unit else "Station_North"
    blocked = [r for r, status in orchestrator.state.roads.items() if status == "blocked"]
    route_plan = NavigationRouter.calculate_optimal_route(origin, req.destination, blocked)
    return {
        "unit_id": unit.callsign if unit else req.unit_id,
        "fuel_remaining_minutes": unit.fuel_remaining_minutes if unit else 75,
        "routing": route_plan
    }

# 2. HOSPITAL RECEPTION BED UPDATE ENDPOINT
@app.post("/api/hospitals/update")
async def update_hospital_beds(payload: HospitalUpdatePayload):
    key = "H1" if "1" in payload.hospital_id else "H2"
    if key in orchestrator.state.hospitals:
        h = orchestrator.state.hospitals[key]
        h.available_beds = payload.available_beds
        
        # Persist hospital beds
        import datetime
        beds_data = load_central_hospitals()
        beds_data[key] = payload.available_beds
        beds_data["updatedAt"] = datetime.datetime.utcnow().isoformat() + "Z"
        save_central_hospitals(beds_data)

        # Broadcast updated state so dashboard and 3D map update in real-time
        await broadcast_message({
            "type": "SIMULATION_UPDATE",
            "data": {
                "updated_world_state": orchestrator.state.export_state_dict()
            }
        })
        return {"status": "success", "hospital": h.__dict__}
    return {"status": "error", "message": "Hospital ID not found"}

# 3. MANUAL DATA INJECTION & LIVE MODEL TRAINING
@app.post("/api/admin/inject-data")
async def inject_custom_data(data: ManualInjectPayload):
    # Capture snapshot before injection for episode logging
    initial_state_snapshot = orchestrator.state.export_state_dict()

    # 1. Inject dynamic hazard into city state
    inc_id = f"INC_{len(orchestrator.state.incidents) + 1:02d}"
    normalized_loc = NavigationRouter.normalize_node(data.location)
    orchestrator.state.incidents[inc_id] = Incident(
        id=inc_id,
        incident_type=data.incident_type,
        location=normalized_loc,
        severity=data.severity,
        details=data.details,
        active=True
    )
    
    if data.block_road and data.block_road in orchestrator.state.roads:
        orchestrator.state.roads[data.block_road] = "blocked"

    for _ in range(data.patient_count):
        pid = f"P_{len(orchestrator.state.patients) + 1:02d}"
        orchestrator.state.patients[pid] = Patient(
            id=pid,
            severity=data.severity,
            location=normalized_loc,
            status="waiting"
        )

    # 2. RUN SWARM CYCLE IMMEDIATELY ON THIS INJECTED SCENARIO
    print(f"\n⚡ LIVE SCENARIO INJECTED: {data.incident_type} at {normalized_loc}. Triggering Swarm Execution...")
    result = orchestrator.run_cycle()
    time_step = result["time_step"]
    command_plan = result["command_plan"]
    actions = result["executed_actions"]
    broadcast_text = result["broadcast_summary"]

    # 3. Persist actions and anchor cryptographic proof
    snowflake_wh.log_swarm_actions(time_step, actions)
    solana_tx = solana_ledger.record_decision_hash(time_step, command_plan, actions)
    result["solana_audit"] = solana_tx

    # 4. Generate dynamic voice dispatch audio
    audio_path = voice_service.synthesize_dispatch_call(broadcast_text, output_path=DEFAULT_AUDIO_PATH)
    result["audio_available"] = bool(audio_path and os.path.exists(audio_path))

    # 5. TRAIN MODEL: Record training episode and update in-context memory + fine-tuning dataset
    training_record = training_engine.record_scenario_training_episode(
        scenario_input=data.dict(),
        initial_state=initial_state_snapshot,
        transcript=result["transcript"],
        command_plan=command_plan,
        executed_actions=actions,
        updated_state=result["updated_world_state"]
    )
    result["training_episode"] = training_record
    result["training_stats"] = training_engine.get_training_stats()

    # 6. Broadcast full simulation + training update to all connected clients
    await broadcast_message({
        "type": "SIMULATION_UPDATE",
        "data": result
    })

    return {
        "status": "injected_and_executed",
        "incident_id": inc_id,
        "result": result,
        "training": training_record,
        "world_state": result["updated_world_state"]
    }

# 4. MODEL TRAINING & ADAPTATION TELEMETRY ENDPOINTS
@app.get("/api/training/stats")
def get_training_metrics():
    """Returns current model training metrics, episode counts, and policy adaptations."""
    return training_engine.get_training_stats()

@app.get("/api/training/export")
def export_finetune_dataset():
    """Exports the Gemini fine-tuning JSONL dataset generated from live scenario runs."""
    if FINETUNE_FILE.exists():
        return FileResponse(
            path=str(FINETUNE_FILE),
            filename="gemini_emergency_swarm_finetune.jsonl",
            media_type="application/x-jsonlines"
        )
    return Response(
        content=json.dumps({"status": "empty", "message": "No fine-tune samples generated yet."}),
        status_code=404,
        media_type="application/json"
    )

# =========================================================================
# 5. CENTRAL MULTI-DEVICE AUTHENTICATION & SECURITY VAULT STORAGE
# =========================================================================
VAULT_PERSIST_FILE = ROOT_DIR / "data" / "central_vault.json"

def load_central_vault() -> dict:
    if VAULT_PERSIST_FILE.exists():
        try:
            with open(VAULT_PERSIST_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[Vault] Error reading vault file: {e}")
    return {
        "initialized": True,
        "resigned": False,
        "vault": None
    }

def save_central_vault(state: dict):
    try:
        VAULT_PERSIST_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(VAULT_PERSIST_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        print(f"[Vault] Error writing vault file: {e}")

global_vault_state = load_central_vault()

@app.get("/api/vault")
def get_central_vault():
    return global_vault_state

@app.post("/api/vault")
async def update_central_vault(payload: dict):
    global global_vault_state
    action = payload.get("action")
    if action == "resign":
        global_vault_state = {
            "initialized": False,
            "resigned": True,
            "resignedAt": payload.get("timestamp") or "",
            "vault": None
        }
        save_central_vault(global_vault_state)
        await broadcast_message({
            "type": "SECURITY_RESIGNATION",
            "message": "Incident Commander has resigned. All master credentials revoked."
        })
        return {"status": "resigned", "initialized": False, "resigned": True}

    if action in ("save", "initialize") or "vault" in payload:
        v = payload.get("vault") or payload
        global_vault_state = {
            "initialized": True,
            "resigned": False,
            "vault": v
        }
        save_central_vault(global_vault_state)
        await broadcast_message({
            "type": "VAULT_UPDATED",
            "vault": v
        })
        return {"status": "saved", "initialized": True, "resigned": False, "vault": v}

    return global_vault_state

# =========================================================================
# 6. CENTRAL MULTI-DEVICE EVACUATION & HOSPITAL BED SYNCHRONIZATION
# =========================================================================
@app.get("/api/hospitals")
def get_hospitals_beds():
    beds_data = load_central_hospitals()
    return beds_data

EVAC_PERSIST_FILE = ROOT_DIR / "data" / "central_evacuation.json"

def load_central_evacuation() -> dict:
    if EVAC_PERSIST_FILE.exists():
        try:
            with open(EVAC_PERSIST_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[Evacuation] Error reading evacuation file: {e}")
    return {
        "police": 46,
        "fire": 54,
        "ambulance": 42,
        "total": 142,
        "lastUpdatedBy": "C2 Central Dispatch",
        "lastDelta": 0,
        "updatedAt": "2026-11-17T00:00:00.000Z"
    }

def save_central_evacuation(state: dict):
    try:
        EVAC_PERSIST_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(EVAC_PERSIST_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        print(f"[Evacuation] Error writing evacuation file: {e}")

global_evacuation_state = load_central_evacuation()

@app.get("/api/evacuation")
def get_evacuation_state():
    return global_evacuation_state

@app.post("/api/evacuation")
async def update_evacuation_state(payload: dict):
    global global_evacuation_state
    service = payload.get("service")
    count = payload.get("count")
    delta = payload.get("delta")
    updated_by = payload.get("updatedBy", "Field Personnel")

    if service in ("police", "fire", "ambulance"):
        if count is not None:
            global_evacuation_state[service] = max(0, int(count))
        elif delta is not None:
            global_evacuation_state[service] = max(0, global_evacuation_state.get(service, 0) + int(delta))
    else:
        if "police" in payload and payload["police"] is not None:
            global_evacuation_state["police"] = max(0, int(payload["police"]))
        if "fire" in payload and payload["fire"] is not None:
            global_evacuation_state["fire"] = max(0, int(payload["fire"]))
        if "ambulance" in payload and payload["ambulance"] is not None:
            global_evacuation_state["ambulance"] = max(0, int(payload["ambulance"]))

    global_evacuation_state["total"] = (
        global_evacuation_state.get("police", 0) +
        global_evacuation_state.get("fire", 0) +
        global_evacuation_state.get("ambulance", 0)
    )
    global_evacuation_state["lastUpdatedBy"] = updated_by
    global_evacuation_state["lastDelta"] = int(delta) if delta is not None else 0
    import datetime
    global_evacuation_state["updatedAt"] = datetime.datetime.utcnow().isoformat() + "Z"

    save_central_evacuation(global_evacuation_state)

    await broadcast_message({
        "type": "EVACUATION_UPDATE",
        "data": global_evacuation_state
    })

    return {"status": "success", "data": global_evacuation_state}

# =========================================================================
# 7. REAL-TIME MULTI-DEVICE TACTICAL AUDIO BROADCAST ENGINE
# =========================================================================
latest_tactical_broadcast = {
    "id": "genesis",
    "full": "All units standing by. EOC Gold Command monitoring city sector corridors.",
    "police": "Police unit POL-02: Standing by on patrol.",
    "fire": "Fire Engine FIRE-03: Standing by at Shyambazar depot.",
    "ambulance": "Ambulance AMB-07: Standing by for trauma triage calls.",
    "timestamp": "2026-11-20T14:40:00Z"
}

@app.get("/api/broadcast/latest")
def get_latest_broadcast():
    return latest_tactical_broadcast

@app.post("/api/broadcast")
async def publish_tactical_broadcast(payload: dict):
    global latest_tactical_broadcast
    import datetime
    b_id = payload.get("id") or f"bc_{int(datetime.datetime.utcnow().timestamp() * 1000)}"
    full_text = payload.get("full") or payload.get("broadcast_summary") or "Attention all units: Incident Commander broadcast."
    police_text = payload.get("police") or "Attention Police Interceptor POL-02: Maintain traffic cordon and secure incident perimeter."
    fire_text = payload.get("fire") or "Attention Fire Engine FIRE-03: Proceed for structural suppression and hazard containment."
    ambulance_text = payload.get("ambulance") or "Attention Ambulance AMB-07: Proceed for casualty triage and transport."

    latest_tactical_broadcast = {
        "id": b_id,
        "full": full_text,
        "police": police_text,
        "fire": fire_text,
        "ambulance": ambulance_text,
        "timestamp": payload.get("timestamp") or (datetime.datetime.utcnow().isoformat() + "Z")
    }

    # Broadcast to all connected WebSockets immediately
    await broadcast_message({
        "type": "TACTICAL_AUDIO_BROADCAST",
        "data": latest_tactical_broadcast
    })

    return {"status": "broadcast_published", "data": latest_tactical_broadcast}



