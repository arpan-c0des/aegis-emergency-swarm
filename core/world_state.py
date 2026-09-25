import json
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional

@dataclass
class Hospital:
    id: str
    name: str
    total_beds: int
    available_beds: int
    trauma_capable: bool

@dataclass
class EmergencyUnit:
    id: str
    unit_type: str  # "ambulance", "fire_truck", "police_cruiser"
    location: str   # e.g., "Zone_A", "Station_1"
    status: str     # "available", "dispatched", "busy"
    fuel_remaining_minutes: int
    assigned_target: Optional[str] = None

@dataclass
class Patient:
    id: str
    severity: str   # "critical", "serious", "minor"
    location: str
    assigned_ambulance: Optional[str] = None
    target_hospital: Optional[str] = None
    status: str = "waiting"  # "waiting", "in_transit", "admitted"

@dataclass
class Incident:
    id: str
    incident_type: str  # "fire", "casualty_cluster", "structural_hazard"
    location: str
    severity: str       # "high", "medium", "low"
    details: str

class CityState:
    """Manages the real-time simulation state of the emergency zone."""
    
    def __init__(self):
        self.time_step: int = 0
        self.weather: str = "deteriorating_rain"
        
        # Roads and transit status: "open", "congested", "blocked"
        self.roads: Dict[str, str] = {
            "Road_A1": "open",
            "Road_B2": "blocked",
            "Road_C3": "congested",
            "Road_D4": "open"
        }
        
        # Hospitals with bed capacities and trauma capability
        self.hospitals: Dict[str, Hospital] = {
            "H1": Hospital(id="H1", name="Central Trauma Hospital", total_beds=10, available_beds=2, trauma_capable=True),
            "H2": Hospital(id="H2", name="West District Clinic", total_beds=8, available_beds=6, trauma_capable=False)
        }
        
        # Initial fleet of response vehicles
        self.units: Dict[str, EmergencyUnit] = {
            "AMB_01": EmergencyUnit(id="AMB_01", unit_type="ambulance", location="Zone_A", status="available", fuel_remaining_minutes=8),
            "AMB_02": EmergencyUnit(id="AMB_02", unit_type="ambulance", location="Zone_C", status="available", fuel_remaining_minutes=35),
            "FIRE_01": EmergencyUnit(id="FIRE_01", unit_type="fire_truck", location="Station_1", status="available", fuel_remaining_minutes=60),
            "POLICE_01": EmergencyUnit(id="POLICE_01", unit_type="police_cruiser", location="Zone_B", status="available", fuel_remaining_minutes=50)
        }
        
        # Initial patients requiring triage and dispatch
        self.patients: Dict[str, Patient] = {
            "P_01": Patient(id="P_01", severity="critical", location="Building_A"),
            "P_02": Patient(id="P_02", severity="serious", location="Building_A"),
            "P_03": Patient(id="P_03", severity="minor", location="Building_A")
        }
        
        # Active incident queue
        self.incidents: Dict[str, Incident] = {
            "INC_01": Incident(
                id="INC_01",
                incident_type="fire",
                location="Building_A",
                severity="high",
                details="Active structural fire with multiple trapped casualties"
            )
        }
        
        # Audit history of actions and negotiations
        self.audit_log: List[dict] = []

    def export_state_dict(self) -> dict:
        """Returns the world state as a clean JSON-serializable dictionary."""
        return {
            "time_step": self.time_step,
            "weather": self.weather,
            "roads": self.roads,
            "hospitals": {k: asdict(v) for k, v in self.hospitals.items()},
            "units": {k: asdict(v) for k, v in self.units.items()},
            "patients": {k: asdict(v) for k, v in self.patients.items()},
            "incidents": {k: asdict(v) for k, v in self.incidents.items()}
        }

    def log_action(self, agent_name: str, action: str, details: dict) -> dict:
        """Records an official tactical action taken within the simulation."""
        entry = {
            "time_step": self.time_step,
            "agent": agent_name,
            "action": action,
            "details": details
        }
        self.audit_log.append(entry)
        return entry

    def advance_disaster_conditions(self):
        """Simulates time passing, deteriorating weather, fuel burning, and new emergency incidents."""
        # Burn fuel for active units
        for unit_id, unit in self.units.items():
            if unit.status in ["dispatched", "busy"] and unit.fuel_remaining_minutes > 0:
                unit.fuel_remaining_minutes = max(0, unit.fuel_remaining_minutes - 4)

        # Dynamic events based on simulation tick
        if self.time_step == 2:
            self.incidents["INC_02"] = Incident(
                id="INC_02",
                incident_type="explosion",
                location="Building_C",
                severity="high",
                details="Secondary structural explosion reported at Building C. Smoke plume impacting Road C3."
            )
            self.roads["Road_C3"] = "blocked"
            self.patients["P_04"] = Patient(id="P_04", severity="critical", location="Building_C")

        elif self.time_step == 3:
            self.weather = "torrential_flash_flood"
            self.roads["Road_D4"] = "congested"
            self.patients["P_05"] = Patient(id="P_05", severity="serious", location="Building_C")

        elif self.time_step >= 4:
            # Random emergency complications
            self.hospitals["H1"].available_beds = max(0, self.hospitals["H1"].available_beds - 1)