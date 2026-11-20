import json
from dataclasses import dataclass, asdict, field
from typing import Dict, List, Optional, Any

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
    callsign: str
    unit_type: str  # "ambulance", "fire_truck", "police_cruiser"
    location: str   # e.g., "Station_North", "Sector_5C", "H1_Central"
    status: str     # "available", "dispatched", "on_scene", "in_transit", "busy"
    fuel_remaining_minutes: int
    assigned_target: Optional[str] = None
    assigned_patient: Optional[str] = None

@dataclass
class Patient:
    id: str
    severity: str   # "critical", "serious", "minor"
    location: str   # e.g., "Sector_5C", "Sector_6B"
    assigned_ambulance: Optional[str] = None
    target_hospital: Optional[str] = None
    status: str = "waiting"  # "waiting", "picked_up", "in_transit", "admitted"

@dataclass
class Incident:
    id: str
    incident_type: str  # "fire", "explosion", "structural_collapse", "flash_flood", "hazmat"
    location: str       # e.g., "Sector_5C", "Sector_6B"
    severity: str       # "high", "medium", "contained", "extinguished"
    details: str
    active: bool = True

class CityState:
    """Manages the real-time simulation state of the emergency zone with full lifecycle dynamics."""
    
    def __init__(self):
        self.time_step: int = 0
        self.weather: str = "deteriorating_rain"
        
        # Roads and transit status: "open", "congested", "blocked"
        self.roads: Dict[str, str] = {
            "Road_A1": "open",
            "Road_B2": "blocked",
            "Road_C3": "congested",
            "Road_D4": "open",
            "Road_E5": "open",
            "Road_F6": "open",
            "Road_G7": "open",
            "Road_H8": "open",
            "Road_I9": "open"
        }
        
        # Hospitals with bed capacities and trauma capability in Kolkata
        self.hospitals: Dict[str, Hospital] = {
            "H1": Hospital(id="H1", name="SSKM Hospital / IPGMER Central Trauma (H1)", total_beds=37, available_beds=28, trauma_capable=True),
            "H2": Hospital(id="H2", name="Apollo / St. Luke's Critical Care Clinic (H2)", total_beds=29, available_beds=12, trauma_capable=False)
        }
        
        # Fleet of response vehicles (accessible by both technical ID and tactical callsign)
        self.units: Dict[str, EmergencyUnit] = {
            "AMB_01": EmergencyUnit(
                id="AMB_01",
                callsign="AMB-07",
                unit_type="ambulance",
                location="Station_North",
                status="available",
                fuel_remaining_minutes=85
            ),
            "AMB_02": EmergencyUnit(
                id="AMB_02",
                callsign="AMB-12",
                unit_type="ambulance",
                location="Station_South",
                status="available",
                fuel_remaining_minutes=72
            ),
            "FIRE_01": EmergencyUnit(
                id="FIRE_01",
                callsign="FIRE-03",
                unit_type="fire_truck",
                location="Station_North",
                status="available",
                fuel_remaining_minutes=90
            ),
            "POLICE_01": EmergencyUnit(
                id="POLICE_01",
                callsign="POL-02",
                unit_type="police_cruiser",
                location="Station_South",
                status="available",
                fuel_remaining_minutes=78
            )
        }
        
        # Initial patients requiring triage and dispatch
        self.patients: Dict[str, Patient] = {
            "P_01": Patient(id="P_01", severity="critical", location="Sector_5C"),
            "P_02": Patient(id="P_02", severity="serious", location="Sector_5C"),
            "P_03": Patient(id="P_03", severity="minor", location="Sector_5C")
        }
        
        # Active incident queue
        self.incidents: Dict[str, Incident] = {
            "INC_01": Incident(
                id="INC_01",
                incident_type="fire",
                location="Sector_5C",
                severity="high",
                details="Active structural fire with trapped casualties at Sector 5C."
            )
        }
        
        # Audit history of actions and negotiations
        self.audit_log: List[dict] = []

    def find_unit(self, identifier: str) -> Optional[EmergencyUnit]:
        """Finds unit by either id ('AMB_01') or callsign ('AMB-07')."""
        clean_id = identifier.replace("-", "_").upper()
        if clean_id in self.units:
            return self.units[clean_id]
        if identifier in self.units:
            return self.units[identifier]
        for u in self.units.values():
            if u.callsign.upper() == identifier.upper():
                return u
        return None

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
        """
        Advances the simulation lifecycle:
        1. Moves vehicles along their routes and advances tasks (on_scene -> transport -> admission -> available).
        2. Burns fuel and manages refueling.
        3. Progresses active fire suppression.
        4. Triggers realistic scenario complications and events.
        """
        # 1. Update Unit & Mission Lifecycles
        for unit_id, unit in list(self.units.items()):
            # Fuel burn for active or moving units
            if unit.status in ["dispatched", "busy", "on_scene", "in_transit"]:
                unit.fuel_remaining_minutes = max(0, unit.fuel_remaining_minutes - 3)
            
            # AMBULANCE LIFECYCLE
            if unit.unit_type == "ambulance":
                if unit.status == "dispatched" and unit.assigned_target:
                    # Ambulance arrives at incident site
                    unit.location = unit.assigned_target
                    unit.status = "on_scene"
                    if unit.assigned_patient and unit.assigned_patient in self.patients:
                        p = self.patients[unit.assigned_patient]
                        p.status = "in_transit"
                        # Begin transport to assigned hospital
                        dest_h = p.target_hospital or "H1"
                        unit.assigned_target = dest_h
                        unit.status = "in_transit"
                
                elif unit.status == "in_transit" and unit.assigned_target:
                    # Ambulance arrives at hospital with patient
                    hospital_key = "H1" if "H1" in unit.assigned_target else "H2"
                    unit.location = hospital_key
                    if unit.assigned_patient and unit.assigned_patient in self.patients:
                        p = self.patients[unit.assigned_patient]
                        p.status = "admitted"
                        p.location = hospital_key
                    # Release unit back to service
                    unit.status = "available"
                    unit.assigned_target = None
                    unit.assigned_patient = None
                    # Auto-refuel if needed at hospital depot
                    if unit.fuel_remaining_minutes < 40:
                        unit.fuel_remaining_minutes = 85

            # FIRE TRUCK LIFECYCLE
            elif unit.unit_type == "fire_truck":
                if unit.status == "dispatched" and unit.assigned_target:
                    unit.location = unit.assigned_target
                    unit.status = "on_scene"
                elif unit.status == "on_scene":
                    # Actively suppress fire at current location
                    for inc in self.incidents.values():
                        if inc.location == unit.location and inc.active:
                            if inc.severity == "high":
                                inc.severity = "medium"
                            elif inc.severity == "medium":
                                inc.severity = "contained"
                            elif inc.severity == "contained":
                                inc.severity = "extinguished"
                                inc.active = False
                                unit.status = "available"
                                unit.assigned_target = None
                                # Clear road if previously blocked by this fire
                                if self.roads.get("Road_B2") == "blocked":
                                    self.roads["Road_B2"] = "open"

            # POLICE CRUISER LIFECYCLE
            elif unit.unit_type == "police_cruiser":
                if unit.status == "dispatched" and unit.assigned_target:
                    unit.location = unit.assigned_target
                    unit.status = "on_scene"

        # 2. Dynamic Disaster Progression Based on Tick
        if self.time_step == 2:
            self.incidents["INC_02"] = Incident(
                id="INC_02",
                incident_type="explosion",
                location="Sector_6B",
                severity="high",
                details="Secondary gas explosion detected at Sector 6B. Road C3 impassable."
            )
            self.roads["Road_C3"] = "blocked"
            self.patients["P_04"] = Patient(id="P_04", severity="critical", location="Sector_6B")

        elif self.time_step == 3:
            self.weather = "torrential_flash_flood"
            self.roads["Road_D4"] = "congested"
            self.patients["P_05"] = Patient(id="P_05", severity="serious", location="Sector_6B")
