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
from integrations.voice_elevenlabs import DispatchAudioService, DEFAULT_AUDIO_PATH
from integrations.warehouse_snowflake import SnowflakeWarehouse
from integrations.audit_solana import SolanaAuditLedger
from api.auth import auth_verifier

ROOT_DIR = Path(__file__).resolve().parent.parent

app = FastAPI(
    title="AEGIS - Autonomous Emergency Governance & Intelligence System",
    version="1.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Simulation & Integration Singletons
orchestrator = SwarmOrchestrator()
voice_service = DispatchAudioService()
snowflake_wh = SnowflakeWarehouse()
solana_ledger = SolanaAuditLedger()

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
    
    # 1. Instantiate a clean world state and orchestrator
    orchestrator = SwarmOrchestrator()
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
    "auto_mode": True
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
        # Broadcast updated state so dashboard and 3D map update in real-time
        await broadcast_message({
            "type": "SIMULATION_UPDATE",
            "data": {
                "updated_world_state": orchestrator.state.export_state_dict()
            }
        })
        return {"status": "success", "hospital": h.__dict__}
    return {"status": "error", "message": "Hospital ID not found"}

# 3. MANUAL DATA INJECTION (TRAINING / DRILL SCENARIOS)
@app.post("/api/admin/inject-data")
async def inject_custom_data(data: ManualInjectPayload):
    if system_config["auto_mode"]:
        return {"status": "denied", "message": "Disable Auto-Mode before injecting manual scenario data."}
    
    # Inject dynamic hazard
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

    # Broadcast to all clients immediately
    fresh_state = orchestrator.state.export_state_dict()
    await broadcast_message({
        "type": "SIMULATION_UPDATE",
        "data": {
            "updated_world_state": fresh_state
        }
    })

    return {
        "status": "injected",
        "incident_id": inc_id,
        "current_incidents": len(orchestrator.state.incidents),
        "world_state": fresh_state
    }
