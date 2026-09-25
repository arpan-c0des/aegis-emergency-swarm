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

import heapq

class NavigationRouter:
    """Calculates shortest paths avoiding road closures and burning zones."""
    
    # Manhattan grid nodes and coordinates
    NODES = {
        "H1_Central": (-74.006, 40.718),
        "H2_West": (-74.015, 40.712),
        "Sector_5C": (-74.004, 40.715),
        "Sector_6B": (-74.002, 40.711),
        "Evac_Zone": (-74.008, 40.712),
        "Station_North": (-74.001, 40.720),
        "Station_South": (-74.010, 40.708),
    }

    # Edges format: (node_from, node_to, base_travel_minutes, road_id)
    EDGES = [
        ("Station_North", "Sector_5C", 3.2, "Road_A1"),
        ("Sector_5C", "H1_Central", 2.5, "Road_B2"),
        ("Sector_5C", "Sector_6B", 4.0, "Road_C3"),
        ("Sector_6B", "H1_Central", 5.0, "Road_D4"),
        ("Sector_6B", "Evac_Zone", 3.0, "Road_E5"),
        ("Evac_Zone", "H2_West", 2.8, "Road_F6"),
        ("Station_South", "Evac_Zone", 4.1, "Road_G7"),
        ("Station_South", "Sector_6B", 3.5, "Road_H8"),
        ("H1_Central", "H2_West", 6.0, "Road_I9"),
    ]

    @classmethod
    def calculate_optimal_route(cls, origin: str, destination: str, blocked_roads: list) -> dict:
        adj = {n: [] for n in cls.NODES}
        for u, v, cost, road_id in cls.EDGES:
            # Penalize or block routes based on road closures
            if road_id in blocked_roads:
                continue
            adj[u].append((cost, v, road_id))
            adj[v].append((cost, u, road_id))

        pq = [(0, origin, [origin], [])]
        visited = set()

        while pq:
            cost, curr, path, route_roads = heapq.heappop(pq)
            if curr == destination:
                return {
                    "origin": origin,
                    "destination": destination,
                    "eta_minutes": round(cost, 1),
                    "waypoints": path,
                    "roads_traversed": route_roads,
                    "avoided_blocks": blocked_roads
                }
            if curr in visited:
                continue
            visited.add(curr)

            for edge_cost, neighbor, road_id in adj[curr]:
                if neighbor not in visited:
                    heapq.heappush(pq, (cost + edge_cost, neighbor, path + [neighbor], route_roads + [road_id]))

        # Fallback if cut off
        return {
            "origin": origin,
            "destination": destination,
            "eta_minutes": 99.9,
            "waypoints": [origin, destination],
            "roads_traversed": [],
            "status": "NO_SAFE_CORRIDOR"
        }