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
    """Specialized emergency response agents powered by Gemini with rate-limit protection."""

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
        """Invokes Gemini with automatic retry and graceful fallback on quota exhaustion."""
        if not self.client:
            return self._fallback_assessment(role, state_context)

        prompt = f"""
{instruction}

CURRENT CITY TELEMETRY & WORLD STATE:
{json.dumps(state_context, indent=2)}

Provide your concise tactical evaluation (max 3 sentences). Identify immediate priorities and recommend actions.
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
                if attempt == 0 and ("429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "503" in err_str):
                    time.sleep(1.0)
                    continue
                print(f"[Gemini Notice] {role} using tactical baseline: {e}")
                break

        return self._fallback_assessment(role, state_context)

    def _fallback_assessment(self, role: str, state: Dict[str, Any]) -> str:
        """Deterministic, state-adaptive tactical fallback when Gemini API is throttled."""
        time_step = state.get("time_step", 1)
        patients = state.get("patients", {})
        waiting = [f"{p['id']} ({p.get('severity', 'unknown')})" for p in patients.values() if p.get("status") == "waiting"]
        incidents = [f"{inc.get('incident_type', 'incident')} at {inc.get('location', 'sector')}" for inc in state.get("incidents", {}).values() if inc.get("active", True)]
        blocked_roads = [k for k, v in state.get("roads", {}).items() if v == "blocked"]
        crit_fuel = [f"{u.get('callsign', k)} ({u.get('fuel_remaining_minutes', 0)}m)" for k, u in state.get("units", {}).items() if u.get("fuel_remaining_minutes", 100) < 30]

        if role == "Medical Agent":
            if waiting:
                return (
                    f"Medical Triage (Tick {time_step}): Urgent casualties identified: {', '.join(waiting)}. "
                    f"Prioritizing critical patients for immediate transport to Central Trauma Hospital (H1), routing non-critical cases to Clinic (H2)."
                )
            return f"Medical Status (Tick {time_step}): All on-scene casualties categorized and prioritized. Monitoring trauma bed occupancy at H1."

        elif role == "Fire Agent":
            inc_str = ", ".join(incidents) if incidents else "Active sector fire"
            return (
                f"Fire Suppression Lead (Tick {time_step}): Engaging structural hazard: {inc_str}. "
                f"Establishing thermal safety perimeter and deploying engine to protect egress routes."
            )

        elif role == "Police Agent":
            cordons = ", ".join(blocked_roads) if blocked_roads else "impact zone"
            return (
                f"Police Cordon Directive (Tick {time_step}): Securing exclusion perimeter around {cordons}. "
                f"Redirecting civilian traffic to clear high-speed corridors for emergency ambulances."
            )

        elif role == "Logistics Agent":
            fuel_warn = f"Warning: Low fuel on {', '.join(crit_fuel)}." if crit_fuel else "Fleet fuel levels nominal."
            return (
                f"Logistics Audit (Tick {time_step}): {fuel_warn} "
                f"Validating ambulance routing avoiding blocked corridors and protecting H1 trauma bed capacity."
            )

        else: # Command Agent
            primary_inc = incidents[0] if incidents else "structural incident"
            return (
                f"INCIDENT ACTION PLAN - TICK {time_step}:\n"
                f"1. Medical units immediately transport priority casualties to Central Trauma.\n"
                f"2. Fire suppression engines maintain containment perimeter at {primary_inc}.\n"
                f"3. Police enforce road cordons and safe transit corridors.\n"
                f"Radio Broadcast: Attention all units, Incident Command orders immediate casualty transport to H1 and structural perimeter lockdown."
            )

    def run_medical_agent(self, state: Dict[str, Any]) -> str:
        system_instruction = (
            "You are the Medical Operations Agent (Triage & Evacuation Officer). "
            "Prioritize patient severity (critical > serious > minor). Direct critical cases to H1 trauma beds, "
            "and minor/serious cases to H2 clinic. Keep assessments concise and actionable."
        )
        return self._generate_agent_assessment("Medical Agent", system_instruction, state)

    def run_fire_agent(self, state: Dict[str, Any]) -> str:
        system_instruction = (
            "You are the Fire Suppression Lead. Assess structural hazards, collapse risks, thermal spread, and hazardous materials. "
            "Recommend suppression priority and safety buffer perimeters."
        )
        return self._generate_agent_assessment("Fire Agent", system_instruction, state)

    def run_police_agent(self, state: Dict[str, Any]) -> str:
        system_instruction = (
            "You are the Police & Security Officer. Enforce cordons around blocked roads and hazards, "
            "manage civilian evacuations, and secure clear emergency transit corridors."
        )
        return self._generate_agent_assessment("Police Agent", system_instruction, state)

    def run_logistics_agent(self, state: Dict[str, Any], agent_proposals: List[str]) -> str:
        system_instruction = (
            f"You are the Logistics & Resource Officer. Verify fuel levels, vehicle readiness, and hospital bed counts. "
            f"Review agent inputs:\n" + "\n---\n".join(agent_proposals) + "\n"
            "Highlight any resource bottlenecks or impossible routing orders."
        )
        return self._generate_agent_assessment("Logistics Agent", system_instruction, state)

    def run_command_agent(self, state: Dict[str, Any], full_transcript: List[Dict[str, str]]) -> str:
        transcript_formatted = "\n".join([f"{item['agent']}: {item['assessment']}" for item in full_transcript])
        system_instruction = (
            f"You are the Incident Commander. Synthesize agent inputs and produce an authoritative action plan:\n"
            f"{transcript_formatted}\n"
            "Conclude with a single clear sentence starting with 'Radio Broadcast:' for the voice dispatcher."
        )
        return self._generate_agent_assessment("Command Agent", system_instruction, state)
