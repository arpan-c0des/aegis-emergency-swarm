import heapq
from typing import Dict, Any, List, Optional
from core.world_state import CityState, EmergencyUnit

class SimulationTools:
    """Deterministic actions that agents invoke to mutate the simulation state."""

    def __init__(self, state: CityState):
        self.state = state

    def dispatch_vehicle(self, unit_id: str, target_location: str, mission_type: str) -> Dict[str, Any]:
        """
        Dispatches an emergency vehicle (ambulance, fire truck, police) to a target location.
        """
        unit = self.state.find_unit(unit_id)
        if not unit:
            return {"status": "error", "message": f"Unit {unit_id} not found."}
        if unit.status in ["busy", "in_transit"]:
            return {"status": "rejected", "message": f"Unit {unit.callsign} ({unit.id}) is busy on another mission."}
        if unit.fuel_remaining_minutes <= 10:
            return {
                "status": "warning",
                "message": f"Unit {unit.callsign} fuel is critically low ({unit.fuel_remaining_minutes}m). Refuel needed."
            }

        unit.status = "dispatched"
        unit.assigned_target = target_location
        log_entry = self.state.log_action(
            agent_name="Logistics/Dispatcher",
            action="dispatch_vehicle",
            details={
                "unit_id": unit.id,
                "callsign": unit.callsign,
                "target": target_location,
                "mission": mission_type
            }
        )
        return {
            "status": "success",
            "message": f"Unit {unit.callsign} ({unit.id}) dispatched to {target_location} for {mission_type}.",
            "log": log_entry
        }

    def assign_patient_transport(self, patient_id: str, ambulance_id: str, hospital_id: str) -> Dict[str, Any]:
        """
        Assigns an ambulance to pick up a patient and transport them to a designated hospital.
        """
        patient = self.state.patients.get(patient_id)
        ambulance = self.state.find_unit(ambulance_id)
        
        # Normalize hospital ID
        target_h_key = "H1" if "1" in hospital_id else "H2"
        hospital = self.state.hospitals.get(target_h_key)

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

        # Reserve bed and commit assignment
        hospital.available_beds -= 1
        patient.assigned_ambulance = ambulance.id
        patient.target_hospital = target_h_key
        patient.status = "in_transit"
        ambulance.status = "dispatched"
        ambulance.assigned_target = patient.location
        ambulance.assigned_patient = patient.id

        log_entry = self.state.log_action(
            agent_name="MedicalAgent",
            action="assign_patient_transport",
            details={
                "patient_id": patient_id,
                "ambulance_id": ambulance.id,
                "callsign": ambulance.callsign,
                "hospital_id": target_h_key,
                "hospital_name": hospital.name,
                "severity": patient.severity
            }
        )
        return {
            "status": "success",
            "message": f"Patient {patient_id} ({patient.severity}) assigned to {ambulance.callsign} -> {hospital.name}.",
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
        return {
            "status": "success",
            "message": f"Road {road_id} changed from {previous} to {status}.",
            "log": log_entry
        }

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

    # Location synonyms / aliases mapping
    ALIASES = {
        "H1": "H1_Central",
        "H2": "H2_West",
        "CENTRAL": "H1_Central",
        "WEST": "H2_West",
        "BUILDING_A": "Sector_5C",
        "BUILDING_C": "Sector_6B",
        "STATION_1": "Station_North",
        "ZONE_A": "Station_North",
        "ZONE_B": "Station_South",
        "ZONE_C": "Sector_5C"
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
    def normalize_node(cls, node_name: str) -> str:
        """Normalizes any input location name or synonym to a standard graph node."""
        if not node_name:
            return "Station_North"
        clean = node_name.strip()
        if clean in cls.NODES:
            return clean
        upper = clean.upper()
        if upper in cls.ALIASES:
            return cls.ALIASES[upper]
        for k, v in cls.ALIASES.items():
            if k in upper:
                return v
        return "Sector_5C"

    @classmethod
    def calculate_optimal_route(cls, origin: str, destination: str, blocked_roads: list) -> dict:
        norm_orig = cls.normalize_node(origin)
        norm_dest = cls.normalize_node(destination)

        adj = {n: [] for n in cls.NODES}
        for u, v, cost, road_id in cls.EDGES:
            # Skip blocked roads
            if road_id in blocked_roads:
                continue
            adj[u].append((cost, v, road_id))
            adj[v].append((cost, u, road_id))

        pq = [(0, norm_orig, [norm_orig], [])]
        visited = set()

        while pq:
            cost, curr, path, route_roads = heapq.heappop(pq)
            if curr == norm_dest:
                return {
                    "origin": norm_orig,
                    "destination": norm_dest,
                    "eta_minutes": round(cost, 1),
                    "waypoints": path,
                    "roads_traversed": route_roads,
                    "avoided_blocks": blocked_roads,
                    "status": "CLEAR"
                }
            if curr in visited:
                continue
            visited.add(curr)

            for edge_cost, neighbor, road_id in adj[curr]:
                if neighbor not in visited:
                    heapq.heappush(pq, (cost + edge_cost, neighbor, path + [neighbor], route_roads + [road_id]))

        # Fallback if cut off by severe roadblocks
        return {
            "origin": norm_orig,
            "destination": norm_dest,
            "eta_minutes": 12.0,
            "waypoints": [norm_orig, "Evac_Zone", norm_dest],
            "roads_traversed": ["Detour_Auxiliary"],
            "avoided_blocks": blocked_roads,
            "status": "EMERGENCY_DETOUR"
        }
