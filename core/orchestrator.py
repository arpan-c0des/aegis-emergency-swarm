import json
import re
from typing import Dict, Any, List
from core.world_state import CityState
from core.tools import SimulationTools
from core.agents import SwarmAgents

class SwarmOrchestrator:
    """Manages multi-agent negotiation turns, state mutation, and disaster progression."""

    def __init__(self, state: CityState = None):
        self.state = state if state else CityState()
        self.tools = SimulationTools(self.state)
        self.agents = SwarmAgents()

    def run_cycle(self) -> Dict[str, Any]:
        """Runs an evolving deliberation, negotiation, and execution cycle."""
        self.state.time_step += 1
        
        # Advance real-world simulation dynamics (burns fuel, triggers secondary explosions/weather)
        self.state.advance_disaster_conditions()
        current_state = self.state.export_state_dict()
        
        transcript: List[Dict[str, str]] = []

        print(f"\n=======================================================")
        print(f"🚨 TICK {self.state.time_step} — STARTING SWARM DELIBERATION CYCLE")
        print(f"=======================================================")

        # 1. Specialized Domain Assessments
        med_view = self.agents.run_medical_agent(current_state)
        transcript.append({"agent": "MedicalAgent", "assessment": med_view})

        fire_view = self.agents.run_fire_agent(current_state)
        transcript.append({"agent": "FireAgent", "assessment": fire_view})

        police_view = self.agents.run_police_agent(current_state)
        transcript.append({"agent": "PoliceAgent", "assessment": police_view})

        # 2. Logistics Reality Audit
        proposals = [med_view, fire_view, police_view]
        logistics_view = self.agents.run_logistics_agent(current_state, proposals)
        transcript.append({"agent": "LogisticsAgent", "assessment": logistics_view})

        # 3. Incident Commander Final Synthesis
        command_plan = self.agents.run_command_agent(current_state, transcript)
        transcript.append({"agent": "CommandAgent", "assessment": command_plan})

        # 4. Extract Dynamic Radio Broadcast text for ElevenLabs
        broadcast_summary = self._extract_radio_summary(command_plan)

        # 5. Deterministic Tool Execution Loop
        executed_actions = self._apply_dynamic_resolution()

        return {
            "time_step": self.state.time_step,
            "transcript": transcript,
            "command_plan": command_plan,
            "broadcast_summary": broadcast_summary,
            "executed_actions": executed_actions,
            "updated_world_state": self.state.export_state_dict()
        }

    def _extract_radio_summary(self, command_plan: str) -> str:
        """Extracts a short, punchy 1-2 sentence voice broadcast from the command plan."""
        lines = command_plan.split("\n")
        for line in lines:
            if "broadcast" in line.lower() or "radio" in line.lower() or "announcement" in line.lower():
                clean = re.sub(r'[*_#]', '', line).strip()
                if len(clean) > 20:
                    return clean
        return f"Tick {self.state.time_step} tactical order executed. Units proceed according to updated command plan."

    def _apply_dynamic_resolution(self) -> List[Dict[str, Any]]:
        """Applies adaptive actions based on the current tick's state."""
        actions = []
        
        # Dispatch Fire Truck if available
        if self.state.units["FIRE_01"].status == "available":
            res = self.tools.dispatch_vehicle("FIRE_01", "Building_A", "structural_fire_suppression")
            actions.append(res)

        # Find waiting patients and assign available ambulances
        for pid, patient in list(self.state.patients.items()):
            if patient.status == "waiting":
                # Look for an ambulance with enough fuel
                for aid, amb in self.state.units.items():
                    if amb.unit_type == "ambulance" and amb.status == "available" and amb.fuel_remaining_minutes > 10:
                        # Choose target hospital
                        target_h = "H1" if (patient.severity == "critical" and self.state.hospitals["H1"].available_beds > 0) else "H2"
                        res = self.tools.assign_patient_transport(pid, aid, target_h)
                        actions.append(res)
                        break

        # Block any roads affected by active incidents
        if "INC_02" in self.state.incidents and self.state.roads.get("Road_C3") != "blocked":
            res = self.tools.update_road_status("Road_C3", "blocked", "Secondary explosion debris")
            actions.append(res)

        return actions