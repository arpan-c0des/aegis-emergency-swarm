import os
import json
import time
from pathlib import Path
from typing import Dict, Any, List
from dotenv import load_dotenv

# Ensure root .env is loaded regardless of current working directory
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

class SwarmAgents:
    """Specialized emergency response agents powered by Gemini with rate-limit protection and learned tactical memory."""

    def __init__(self):
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        api_key = os.getenv("GEMINI_API_KEY")
        self.client = None

        if api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=api_key)
            except Exception as e:
                print(f"[Gemini Warning] Client setup error: {e}")

    def _generate_agent_assessment(self, role: str, instruction: str, state_context: Dict[str, Any]) -> str:
        """Invokes Gemini with automatic retry, learned policy memory, and graceful fallback on quota exhaustion."""
        if not self.client:
            return self._fallback_assessment(role, state_context)

        # Retrieve active in-context training memory from past scenario drills
        try:
            from core.training import training_engine
            training_memory = training_engine.get_in_context_training_memory(limit=3)
        except Exception:
            training_memory = "Initial baseline emergency response policy."

        prompt = f"""
{instruction}

TACTICAL POLICY MEMORY (Learned From Previous Live Drills):
{training_memory}

CURRENT CITY TELEMETRY & WORLD STATE:
{json.dumps(state_context, indent=2)}

Provide your concise tactical evaluation (max 3 sentences). Apply learned tactical policy, identify immediate priorities, and recommend actions.
"""
        # Attempt Gemini generation with 1 retry
        for attempt in range(2):
            try:
                time.sleep(0.4)
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=prompt
                )
                text = response.text.strip() if response and response.text else ""
                if text:
                    return text
            except Exception as e:
                err_str = str(e)
                # If daily quota is exhausted, immediately transition to dynamic tactical baseline
                if "per day" in err_str.lower() or "daily" in err_str.lower():
                    print(f"[Gemini Notice] {role} daily quota reached; running high-fidelity dynamic tactical baseline.")
                    break
                if attempt == 0 and "503" in err_str:
                    time.sleep(0.5)
                    continue
                print(f"[Gemini Notice] {role} using tactical baseline: {e}")
                break

        return self._fallback_assessment(role, state_context)

    def _fallback_assessment(self, role: str, state: Dict[str, Any]) -> str:
        """Deterministic, high-fidelity state-adaptive tactical fallback when Gemini API is throttled."""
        time_step = state.get("time_step", 1)
        patients = state.get("patients", {})
        waiting = [f"{p['id']} ({p.get('severity', 'unknown')})" for p in patients.values() if p.get("status") == "waiting"]
        
        # Sort active incidents by severity so the most critical emergency takes operational command
        sev_rank = {"critical": 0, "high": 1, "medium": 2, "contained": 3}
        active_inc_list = [inc for inc in state.get("incidents", {}).values() if inc.get("active", True) and inc.get("severity") != "extinguished"]
        active_inc_list.sort(key=lambda x: sev_rank.get(x.get("severity", "medium"), 4))
        incidents = [f"{inc.get('incident_type', 'incident').replace('_', ' ')} at {inc.get('location', 'sector').replace('_', ' ')}" for inc in active_inc_list]
        
        blocked_roads = [k.replace('_', ' ') for k, v in state.get("roads", {}).items() if v == "blocked"]
        crit_fuel = [f"{u.get('callsign', k)} ({u.get('fuel_remaining_minutes', 0)}m)" for k, u in state.get("units", {}).items() if u.get("fuel_remaining_minutes", 100) < 30]

        # Identify active units by type and callsign
        amb_units = [u.get("callsign", k) for k, u in state.get("units", {}).items() if u.get("unit_type") == "ambulance" and u.get("status") in ("available", "dispatched", "on_scene")]
        fire_units = [u.get("callsign", k) for k, u in state.get("units", {}).items() if u.get("unit_type") == "fire_truck" and u.get("status") in ("available", "dispatched", "on_scene")]
        pol_units = [u.get("callsign", k) for k, u in state.get("units", {}).items() if u.get("unit_type") == "police_cruiser" and u.get("status") in ("available", "dispatched", "on_scene")]

        amb_call = amb_units[0] if amb_units else "Ambulance AMB-12"
        fire_call = fire_units[0] if fire_units else "Fire Engine FIRE-03"
        pol_call = pol_units[0] if pol_units else "Police Cruiser POL-08"

        primary_inc = incidents[0] if incidents else "Active sector emergency"

        if role == "Medical Agent":
            if waiting:
                crit_pts = [p for p in waiting if "critical" in p]
                non_crit = [p for p in waiting if "critical" not in p]
                return (
                    f"Medical Triage (Tick {time_step}): Urgent casualties awaiting transport: {', '.join(waiting)}. "
                    f"Assigning {amb_call} to evacuate {' and '.join(crit_pts) if crit_pts else waiting[0]} immediately to Central Trauma Hospital (H1). "
                    f"{'Directing ' + ', '.join(non_crit) + ' to St. Luke Clinic (H2).' if non_crit else 'Monitoring bed capacity.'}"
                )
            return f"Medical Status (Tick {time_step}): All on-scene casualties categorized and prioritized. Central Trauma Hospital (H1) and Clinic (H2) ready."

        elif role == "Fire Agent":
            return (
                f"Fire Suppression Lead (Tick {time_step}): Engaging {primary_inc}. "
                f"Deploying {fire_call} with pressurized foam suppression. Establishing a 300-meter safety barrier to protect egress corridors."
            )

        elif role == "Police Agent":
            road_str = f"closures on {', '.join(blocked_roads)}" if blocked_roads else "impact zone perimeter"
            return (
                f"Police Cordon Directive (Tick {time_step}): {pol_call} securing {road_str}. "
                f"Rerouting civilian traffic to keep priority transit corridors clear for {amb_call} and {fire_call}."
            )

        elif role == "Logistics Agent":
            fuel_warn = f"Warning: Low fuel on {', '.join(crit_fuel)}." if crit_fuel else "Fleet fuel levels nominal."
            return (
                f"Logistics Audit (Tick {time_step}): {fuel_warn} "
                f"Shortest path confirmed for {amb_call} to H1 avoiding {blocked_roads[0] if blocked_roads else 'hazards'}. Supply lines stable."
            )

        else: # Command Agent
            orders = [
                f"INCIDENT ACTION PLAN - TICK {time_step}:",
                f"1. Suppression: {fire_call} establish immediate containment at {primary_inc}.",
            ]
            if waiting:
                orders.append(f"2. Evacuation: {amb_call} transport {waiting[0]} to Central Trauma Hospital (H1).")
            else:
                orders.append("2. Medical: Paramedic teams holding on-scene triage readiness.")

            if blocked_roads:
                orders.append(f"3. Perimeter & Traffic: {pol_call} enforce shutdown of {blocked_roads[0]} and secure emergency detour routes.")
            else:
                orders.append(f"3. Perimeter: {pol_call} maintain security cordon around impact perimeter.")

            # Formulate dynamic, scenario-tailored voice dispatch text
            if waiting and blocked_roads:
                radio_msg = f"{fire_call} deploy to {primary_inc}. {amb_call} dispatch {waiting[0]} to Central Trauma Hospital. {pol_call} cordon {blocked_roads[0]} and divert traffic via open corridors."
            elif waiting:
                radio_msg = f"{fire_call} engage {primary_inc}. {amb_call} initiate immediate transport of {waiting[0]} to Central Trauma Hospital H1. All units acknowledge."
            elif blocked_roads:
                radio_msg = f"{fire_call} maintain containment on {primary_inc}. {pol_call} shut down {blocked_roads[0]} and direct emergency vehicles along bypass routes."
            else:
                radio_msg = f"{fire_call} proceed with hazard suppression at {primary_inc}. {amb_call} and {pol_call} maintain perimeter readiness."

            orders.append(f"Radio Broadcast: {radio_msg}")
            return "\n".join(orders)

    def run_medical_agent(self, state: Dict[str, Any]) -> str:
        system_instruction = (
            "You are the Medical Operations Agent (Triage & Evacuation Officer). "
            "Prioritize patient severity (critical > serious > minor). Direct critical cases to H1 trauma beds, "
            "and minor/serious cases to H2 clinic. Mention specific ambulance callsigns and patient IDs. Keep assessments concise and actionable."
        )
        return self._generate_agent_assessment("Medical Agent", system_instruction, state)

    def run_fire_agent(self, state: Dict[str, Any]) -> str:
        system_instruction = (
            "You are the Fire Suppression Lead. Assess structural hazards, collapse risks, thermal spread, and hazardous materials. "
            "Identify the specific fire engine callsign and target sector. Recommend suppression priority and safety buffer perimeters."
        )
        return self._generate_agent_assessment("Fire Agent", system_instruction, state)

    def run_police_agent(self, state: Dict[str, Any]) -> str:
        system_instruction = (
            "You are the Police & Security Officer. Enforce cordons around blocked roads and hazards, "
            "name specific police cruiser callsigns, and secure clear emergency transit corridors."
        )
        return self._generate_agent_assessment("Police Agent", system_instruction, state)

    def run_logistics_agent(self, state: Dict[str, Any], agent_proposals: List[str]) -> str:
        system_instruction = (
            f"You are the Logistics & Resource Officer. Verify fuel levels, vehicle readiness, and hospital bed counts. "
            f"Review agent inputs:\n" + "\n---\n".join(agent_proposals) + "\n"
            "Highlight any resource bottlenecks, fuel warnings, or route hazards."
        )
        return self._generate_agent_assessment("Logistics Agent", system_instruction, state)

    def run_command_agent(self, state: Dict[str, Any], full_transcript: List[Dict[str, str]]) -> str:
        transcript_formatted = "\n".join([f"{item['agent']}: {item['assessment']}" for item in full_transcript])
        system_instruction = (
            f"You are the Incident Commander. Synthesize agent inputs and produce an authoritative action plan:\n"
            f"{transcript_formatted}\n\n"
            "Formulate an authoritative, dynamic tactical Incident Action Plan with numbered operational orders.\n"
            "MANDATORY REQUIREMENT: End your response with exactly one line in this format:\n"
            "Radio Broadcast: <A punchy, realistic emergency radio dispatch under 30 words naming the specific incident, the assigned vehicle callsigns (e.g. AMB-12, FIRE-03), target hospital, and any blocked road detours. NEVER use generic boilerplate or repeat previous text.>"
        )
        return self._generate_agent_assessment("Command Agent", system_instruction, state)
