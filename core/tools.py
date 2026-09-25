from typing import Dict, Any
from core.world_state import CityState

class SimulationTools:
    """Deterministic actions that Gemini agents invoke to mutate the simulation state."""

    def __init__(self, state: CityState):
        self.state = state

    def dispatch_vehicle(self, unit_id: str, target_location: str, mission_type: str) -> Dict[str, Any]:
        """
        Dispatches an emergency vehicle (ambulance, fire truck, police) to a target location.
        """
        unit = self.state.units.get(unit_id)
        if not unit:
            return {"status": "error", "message": f"Unit {unit_id} not found."}
        if unit.status == "busy":
            return {"status": "rejected", "message": f"Unit {unit_id} is already busy on another task."}
        if unit.fuel_remaining_minutes <= 10:
            return {
                "status": "warning",
                "message": f"Unit {unit_id} fuel is critically low ({unit.fuel_remaining_minutes} min remaining). High risk dispatch."
            }

        unit.status = "dispatched"
        unit.assigned_target = target_location
        log_entry = self.state.log_action(
            agent_name="Logistics/Dispatcher",
            action="dispatch_vehicle",
            details={"unit_id": unit_id, "target": target_location, "mission": mission_type}
        )
        return {"status": "success", "message": f"Unit {unit_id} dispatched to {target_location}.", "log": log_entry}

    def assign_patient_transport(self, patient_id: str, ambulance_id: str, hospital_id: str) -> Dict[str, Any]:
        """
        Assigns an ambulance to pick up a patient and transport them to a designated hospital.
        """
        patient = self.state.patients.get(patient_id)
        ambulance = self.state.units.get(ambulance_id)
        hospital = self.state.hospitals.get(hospital_id)

        if not patient:
            return {"status": "error", "message": f"Patient {patient_id} does not exist."}
        if not ambulance or ambulance.unit_type != "ambulance":
            return {"status": "error", "message": f"Valid ambulance {ambulance_id} required."}
        if not hospital:
            return {"status": "error", "message": f"Hospital {hospital_id} does not exist."}

        # Medical validation: Critical patients need trauma capacity if available
        if patient.severity == "critical" and not hospital.trauma_capable:
            return {
                "status": "rejected",
                "message": f"Cannot route critical patient {patient_id} to non-trauma facility {hospital.name}."
            }

        if hospital.available_beds <= 0:
            return {
                "status": "rejected",
                "message": f"Hospital {hospital.name} has 0 available beds remaining."
            }

        # Commit assignments
        hospital.available_beds -= 1
        patient.assigned_ambulance = ambulance_id
        patient.target_hospital = hospital_id
        patient.status = "in_transit"
        ambulance.status = "busy"
        ambulance.assigned_target = patient.location

        log_entry = self.state.log_action(
            agent_name="MedicalAgent",
            action="assign_patient_transport",
            details={
                "patient_id": patient_id,
                "ambulance_id": ambulance_id,
                "hospital_id": hospital_id,
                "severity": patient.severity
            }
        )
        return {
            "status": "success",
            "message": f"Patient {patient_id} assigned to {ambulance_id} heading to {hospital.name}.",
            "remaining_beds": hospital.available_beds,
            "log": log_entry
        }

    def update_road_status(self, road_id: str, status: str, reason: str) -> Dict[str, Any]:
        """
        Updates road condition: 'open', 'congested', or 'blocked'.
        """
        if road_id not in self.state.roads:
            return {"status": "error", "message": f"Road {road_id} does not exist."}
        if status not in ["open", "congested", "blocked"]:
            return {"status": "error", "message": "Status must be open, congested, or blocked."}

        previous = self.state.roads[road_id]
        self.state.roads[road_id] = status

        log_entry = self.state.log_action(
            agent_name="PoliceAgent",
            action="update_road_status",
            details={"road_id": road_id, "previous": previous, "new_status": status, "reason": reason}
        )
        return {"status": "success", "message": f"Road {road_id} changed from {previous} to {status}.", "log": log_entry}

    def designate_evacuation_perimeter(self, location: str, radius_meters: int) -> Dict[str, Any]:
        """
        Establishes an emergency safety perimeter around an active incident.
        """
        log_entry = self.state.log_action(
            agent_name="FireAgent",
            action="designate_evacuation_perimeter",
            details={"location": location, "radius_meters": radius_meters}
        )
        return {
            "status": "success",
            "message": f"Safety perimeter of {radius_meters}m established around {location}.",
            "log": log_entry
        }