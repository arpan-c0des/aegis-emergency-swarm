import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")
DEFAULT_AUDIO_PATH = str(ROOT_DIR / "dispatch_alert.mp3")

class DispatchAudioService:
    """Generates tactical emergency radio voice broadcasts using ElevenLabs."""

    def __init__(self):
        self.api_key = os.getenv("ELEVENLABS_API_KEY")
        # Adam (Pre-made voice accessible to free tier accounts)
        self.voice_id = os.getenv("ELEVENLABS_VOICE_ID", "pNInz6obpgDQGcFmaJgB")
        self.client = ElevenLabs(api_key=self.api_key) if self.api_key else None

    def synthesize_dispatch_call(self, broadcast_text: str, output_path: str = DEFAULT_AUDIO_PATH) -> Optional[str]:
        """
        Takes urgent tactical command text and saves an MP3 radio broadcast.
        """
        if not self.client or not self.api_key:
            print("[ElevenLabs] No API key detected. Skipping real-time TTS audio synthesis.")
            return None

        try:
            # Clean broadcast text of markdown, quotes, and redundant prefixes
            clean_text = broadcast_text.strip()
            # Strip common redundant prefixes so speech doesn't stutter or duplicate
            redundant_prefixes = [
                "Radio Broadcast:", "Radio Broadcast -", "Radio Announcement:",
                "Broadcast:", "Dispatch:",
                "Attention all units. Incident Commander broadcast:",
                "Attention all units. Incident Commander dispatch:",
                "Attention all units,", "Attention all units:", "Attention all units.",
                "Incident Command to all units:", "Incident Command orders:",
                "Incident Command to all stations:"
            ]
            for prefix in redundant_prefixes:
                if clean_text.lower().startswith(prefix.lower()):
                    clean_text = clean_text[len(prefix):].strip()

            clean_text = clean_text.strip(' *"#\'')
            if not clean_text:
                clean_text = "All units acknowledge. Incident action plan orders in effect."

            spoken_text = f"Attention all units. Incident Commander broadcast: {clean_text}"
            print(f"[ElevenLabs] Generating tactical radio audio: \"{spoken_text}\"")

            audio_generator = self.client.text_to_speech.convert(
                voice_id=self.voice_id,
                text=spoken_text,
                model_id="eleven_turbo_v2_5"
            )

            # Write stream chunks to temporary file first, then atomically replace
            temp_path = f"{output_path}.tmp"
            with open(temp_path, "wb") as f:
                for chunk in audio_generator:
                    f.write(chunk)

            if os.path.exists(output_path):
                try:
                    os.remove(output_path)
                except Exception:
                    pass
            os.replace(temp_path, output_path)

            file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0
            print(f"[ElevenLabs] Audio broadcast successfully generated -> {output_path} ({file_size} bytes)")
            return output_path

        except Exception as e:
            print(f"[ElevenLabs Error] Could not generate audio dispatch: {e}")
            return None
