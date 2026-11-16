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

        # 5. Dynamic Tactical Execution based on swarm priorities and active state
        executed_actions = self._apply_dynamic_resolution()

        # 6. Formulate Dynamic Radio Broadcast reflecting formulated orders and executed actions
        broadcast_summary = self.generate_dynamic_radio_dispatch(command_plan, executed_actions, current_state)

        return {
            "time_step": self.state.time_step,
            "transcript": transcript,
            "command_plan": command_plan,
            "broadcast_summary": broadcast_summary,
            "executed_actions": executed_actions,
            "updated_world_state": self.state.export_state_dict()
        }

    def generate_dynamic_radio_dispatch(self, command_plan: str, executed_actions: List[Dict[str, Any]], current_state: Dict[str, Any]) -> str:
        """
        Formulates an authoritative, ultra-realistic voice dispatch tailored specifically
        to what the swarm formulated and executed on this tick.
        """
        # 1. Check if Command Agent produced a specific dynamic broadcast
        lines = command_plan.split("\n")
        for line in lines:
            line_clean = line.strip()
            line_lower = line_clean.lower()
            if "radio broadcast:" in line_lower:
                clean = line_clean.split(":", 1)[1].strip()
                clean = re.sub(r'[*_#"]', '', clean).strip()
                # Verify that it is dynamic and not the old static phrase
                if (len(clean) > 20 and 
                    "orders immediate casualty transport to h1 and structural perimeter lockdown" not in clean.lower() and
                    "orders confirmed. all units advance" not in clean.lower()):
                    return clean
            elif (line_lower.startswith("broadcast:") or line_lower.startswith("dispatch:")):
                clean = line_clean.split(":", 1)[1].strip()
                clean = re.sub(r'[*_#"]', '', clean).strip()
                if len(clean) > 20:
                    return clean

        # 2. Synthesize directly from executed actions, active hazards, and unit assignments
        sev_rank = {"critical": 0, "high": 1, "medium": 2, "contained": 3}
        active_incidents = [inc for inc in self.state.incidents.values() if inc.active and inc.severity != "extinguished"]
        active_incidents.sort(key=lambda inc: sev_rank.get(inc.severity, 4))
        primary_inc = active_incidents[0] if active_incidents else None
        
        dispatched_fire = []
        dispatched_amb = []
        dispatched_police = []
        transport_orders = []

        for act in executed_actions:
            msg = act.get("message", "")
            if "assigned to transport" in msg:
                transport_orders.append(msg)
            elif "dispatched to" in msg:
                if "AMB" in msg:
                    dispatched_amb.append(msg)
                elif "FIRE" in msg:
                    dispatched_fire.append(msg)
                elif "POL" in msg:
                    dispatched_police.append(msg)

        segments = []

        # Threat identification
        if primary_inc:
            inc_type = primary_inc.incident_type.replace("_", " ")
            inc_loc = primary_inc.location.replace("_", " ")
            segments.append(f"Active {inc_type} at {inc_loc}")
        else:
            segments.append("Sector conditions holding stable")

        # Fire suppression dispatch
        if dispatched_fire:
            m = re.search(r'Unit ([A-Z0-9-]+)', dispatched_fire[0])
            unit_name = m.group(1) if m else "Fire Engine FIRE-03"
            segments.append(f"{unit_name} deployed for hazard containment")

        # Patient transport / medical
        if transport_orders:
            order_text = transport_orders[0]
            call_m = re.search(r'Unit ([A-Z0-9-]+)', order_text)
            pat_m = re.search(r'patient ([A-Z0-9_]+)', order_text)
            hosp_m = re.search(r'to ([A-Za-z0-9\s\(\)]+)\.', order_text)
            
            call_val = call_m.group(1) if call_m else "AMB-12"
            pat_val = pat_m.group(1) if pat_m else "casualty"
            hosp_val = hosp_m.group(1) if hosp_m else "Central Trauma"
            segments.append(f"{call_val} en route transporting {pat_val} to {hosp_val}")
        elif dispatched_amb:
            m = re.search(r'Unit ([A-Z0-9-]+)', dispatched_amb[0])
            unit_name = m.group(1) if m else "Ambulance AMB-12"
            segments.append(f"{unit_name} mobilized for casualty triage")

        # Road closures and police perimeters
        blocked_roads = [r.replace('_', ' ') for r, s in self.state.roads.items() if s == "blocked"]
        if blocked_roads:
            segments.append(f"{blocked_roads[0]} shut down, reroute traffic via secondary corridors")
        elif dispatched_police:
            m = re.search(r'Unit ([A-Z0-9-]+)', dispatched_police[0])
            unit_name = m.group(1) if m else "Police Cruiser POL-08"
            segments.append(f"{unit_name} securing perimeter cordon")

        dispatch_text = ". ".join(segments) + ". All responding units acknowledge."
        return dispatch_text

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
        sev_rank = {"critical": 0, "high": 1, "medium": 2, "contained": 3}
        active_incidents = [inc for inc in self.state.incidents.values() if inc.active and inc.severity != "extinguished"]
        active_incidents.sort(key=lambda inc: sev_rank.get(inc.severity, 4))
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
