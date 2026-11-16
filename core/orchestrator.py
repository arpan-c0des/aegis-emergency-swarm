import json
import re
from typing import Dict, Any, List
from core.world_state import CityState
from core.tools import SimulationTools, NavigationRouter
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
        
        # 1. Advance real-world simulation dynamics (lifecycle, fuel, fire suppression, admissions)
        self.state.advance_disaster_conditions()
        current_state = self.state.export_state_dict()
        
        transcript: List[Dict[str, str]] = []

        print(f"\n=======================================================")
        print(f"🚨 TICK {self.state.time_step} — STARTING SWARM DELIBERATION CYCLE")
        print(f"=======================================================")

        # 2. Specialized Domain Assessments
        med_view = self.agents.run_medical_agent(current_state)
        transcript.append({"agent": "MedicalAgent", "assessment": med_view})

        fire_view = self.agents.run_fire_agent(current_state)
        transcript.append({"agent": "FireAgent", "assessment": fire_view})

        police_view = self.agents.run_police_agent(current_state)
        transcript.append({"agent": "PoliceAgent", "assessment": police_view})

        # 3. Logistics Reality Audit
        proposals = [med_view, fire_view, police_view]
        logistics_view = self.agents.run_logistics_agent(current_state, proposals)
        transcript.append({"agent": "LogisticsAgent", "assessment": logistics_view})

        # 4. Incident Commander Final Synthesis
        command_plan = self.agents.run_command_agent(current_state, transcript)
        transcript.append({"agent": "CommandAgent", "assessment": command_plan})

        # 5. Extract Dynamic Radio Broadcast text for ElevenLabs voice dispatch
        broadcast_summary = self._extract_radio_summary(command_plan)

        # 6. Dynamic Tactical Execution based on swarm priorities and active state
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
            line_lower = line.lower()
            if "radio broadcast:" in line_lower:
                clean = line.split(":", 1)[1].strip()
                clean = re.sub(r'[*_#"]', '', clean).strip()
                if len(clean) > 15:
                    return clean
            elif "broadcast" in line_lower or "radio" in line_lower or "announcement" in line_lower:
                clean = re.sub(r'[*_#"]', '', line).strip()
                if len(clean) > 20:
                    return clean
        return f"Tick {self.state.time_step} orders confirmed. All units advance per Incident Action Plan."

    def _apply_dynamic_resolution(self) -> List[Dict[str, Any]]:
        """
        Dynamically executes actions prioritizing active threats and casualties:
        - Dispatches fire engines to unsuppressed active incidents.
        - Dispatches ambulances to waiting patients (sorted: critical > serious > minor).
        - Directs police cruisers to establish cordons around blocked or hazardous areas.
        """
        actions = []
        blocked_roads = [r for r, status in self.state.roads.items() if status == "blocked"]

        # 1. Fire Suppression Dispatch
        active_incidents = [inc for inc in self.state.incidents.values() if inc.active and inc.severity != "extinguished"]
        for inc in active_incidents:
            # Find available fire truck
            for uid, unit in self.state.units.items():
                if unit.unit_type == "fire_truck" and unit.status == "available" and unit.fuel_remaining_minutes > 10:
                    res = self.tools.dispatch_vehicle(uid, inc.location, f"{inc.incident_type}_suppression")
                    actions.append(res)
                    break

        # 2. Medical Triage & Patient Transport Dispatch
        # Sort waiting patients: critical first, then serious, then minor
        severity_rank = {"critical": 0, "serious": 1, "minor": 2}
        waiting_patients = [
            p for p in self.state.patients.values() 
            if p.status == "waiting"
        ]
        waiting_patients.sort(key=lambda p: severity_rank.get(p.severity, 3))

        for patient in waiting_patients:
            # Find available ambulance
            for uid, amb in self.state.units.items():
                if amb.unit_type == "ambulance" and amb.status == "available" and amb.fuel_remaining_minutes > 10:
                    # Choose target hospital: critical -> H1 (if beds exist), else H2
                    if patient.severity == "critical" and self.state.hospitals["H1"].available_beds > 0:
                        target_h = "H1"
                    elif self.state.hospitals["H2"].available_beds > 0:
                        target_h = "H2"
                    else:
                        target_h = "H1"

                    res = self.tools.assign_patient_transport(patient.id, uid, target_h)
                    actions.append(res)
                    break

        # 3. Police Security & Traffic Cordon Dispatch
        for uid, unit in self.state.units.items():
            if unit.unit_type == "police_cruiser" and unit.status == "available":
                # Deploy to protect the highest severity hazard area
                if active_incidents:
                    target_zone = active_incidents[0].location
                    res = self.tools.dispatch_vehicle(uid, target_zone, "perimeter_security_cordon")
                    actions.append(res)
                break

        # 4. Perimeter Designation for any uncordoned high-severity fire
        for inc in active_incidents:
            if inc.severity == "high":
                res = self.tools.designate_evacuation_perimeter(inc.location, 300)
                actions.append(res)
                break

        return actions
