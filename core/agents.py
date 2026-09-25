import os
import json
import time
from typing import Dict, Any, List
from dotenv import load_dotenv

load_dotenv()

class SwarmAgents:
    """Specialized emergency response agents powered by Gemini with rate-limit protection."""

    def __init__(self):
        # gemini-1.5-flash has higher free quotas (15 RPM / 1500 RPD) compared to 2.5-flash
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
        api_key = os.getenv("GEMINI_API_KEY")
        self.client = None

        if api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=api_key)
            except Exception as e:
                print(f"[Gemini Warning] Client setup error: {e}")

    def _generate_agent_assessment(self, role: str, instruction: str, state_context: Dict[str, Any]) -> str:
        """Invokes Gemini with automatic retry and graceful fallback on 429 quota exhaustion."""
        if not self.client:
            return self._fallback_assessment(role, state_context)

        prompt = f"""
{instruction}

CURRENT CITY TELEMETRY & WORLD STATE:
{json.dumps(state_context, indent=2)}

Provide your concise tactical evaluation (max 3 sentences). Identify immediate priorities and recommend actions.
"""
        try:
            # Small pace pause to prevent burst concurrency rate-limiting
            time.sleep(0.6)
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            return response.text.strip()
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                print(f"[Gemini Throttled] 429 Quota reached on {role}. Activating local tactical fallback.")
            else:
                print(f"[Gemini Error] {role} failed: {e}")
            return self._fallback_assessment(role, state_context)

    def _fallback_assessment(self, role: str, state: Dict[str, Any]) -> str:
        """Deterministic tactical fallback when Gemini API quotas are exhausted."""
        time_step = state.get("time_step", 1)
        if role == "Medical Agent":
            waiting = [p["id"] for p in state.get("patients", {}).values() if p.get("status") == "waiting"]
            return f"Medical Priority (Tick {time_step}): Prioritizing triage for {len(waiting)} waiting casualties ({', '.join(waiting) if waiting else 'None'}). Directing transport to available trauma beds at H1."
        
        elif role == "Fire Agent":
            incidents = list(state.get("incidents", {}).keys())
            return f"Fire Suppression Directive: Maintaining structural suppression perimeter on {incidents}. Enforcing safety buffer around blocked corridor Road B2."
        
        elif role == "Police Agent":
            blocked = [k for k, v in state.get("roads", {}).items() if v == "blocked"]
            return f"Police Lockdown Order: Maintaining cordons around {', '.join(blocked) if blocked else 'impact zone'}. Rerouting non-emergency fleet via open corridors."
        
        elif role == "Logistics Agent":
            crit_fuel = [u["id"] for u in state.get("units", {}).values() if u.get("fuel_remaining_minutes", 100) < 30]
            return f"Logistics Assessment: Warning — fuel critical for {crit_fuel if crit_fuel else 'none'}. Reserving Central Hospital H1 capacity for critical trauma."
        
        else: # Command Agent
            return (
                f"INCIDENT ACTION PLAN - TICK {time_step}:\n"
                f"1. Medical units immediately transport urgent casualties to Central Trauma.\n"
                f"2. Police enforce security perimeter at Building A.\n"
                f"3. Radio Broadcast: Emergency teams dispatched. All civilian traffic avoid designated red corridors."
            )

    def run_medical_agent(self, state: Dict[str, Any]) -> str:
        system_instruction = (
            "You are the Medical Operations Agent (Triage & Evacuation Officer). "
            "Prioritize patient severity (critical > serious > minor). Protect trauma bed capacity at H1."
        )
        return self._generate_agent_assessment("Medical Agent", system_instruction, state)

    def run_fire_agent(self, state: Dict[str, Any]) -> str:
        system_instruction = (
            "You are the Fire Suppression Lead. Assess structural hazards, collapse risks, and hazardous materials."
        )
        return self._generate_agent_assessment("Fire Agent", system_instruction, state)

    def run_police_agent(self, state: Dict[str, Any]) -> str:
        system_instruction = (
            "You are the Police & Security Officer. Enforce perimeters, manage evacuations, and secure routes."
        )
        return self._generate_agent_assessment("Police Agent", system_instruction, state)

    def run_logistics_agent(self, state: Dict[str, Any], agent_proposals: List[str]) -> str:
        system_instruction = (
            f"You are the Logistics & Resource Officer. Verify fuel levels, vehicle availability, and bed count. "
            f"Review agent inputs:\n" + "\n---\n".join(agent_proposals)
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