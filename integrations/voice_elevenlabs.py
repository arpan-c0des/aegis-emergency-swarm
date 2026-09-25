import os
from typing import Optional
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs

load_dotenv()

class DispatchAudioService:
    """Generates tactical emergency radio voice broadcasts using ElevenLabs."""

    def __init__(self):
        self.api_key = os.getenv("ELEVENLABS_API_KEY")
        # Adam (Pre-made voice accessible to free tier accounts)
        self.voice_id = os.getenv("ELEVENLABS_VOICE_ID", "pNInz6obpgDQGcFmaJgB")
        self.client = ElevenLabs(api_key=self.api_key) if self.api_key else None

    def synthesize_dispatch_call(self, broadcast_text: str, output_path: str = "dispatch_alert.mp3") -> Optional[str]:
        """
        Takes urgent tactical command text and saves an MP3 radio broadcast.
        """
        if not self.client or not self.api_key:
            print("[ElevenLabs] No API key detected. Skipping real-time TTS audio synthesis.")
            return None

        try:
            print(f"[ElevenLabs] Generating tactical radio audio for: \"{broadcast_text[:60]}...\"")
            audio_generator = self.client.text_to_speech.convert(
                voice_id=self.voice_id,
                text=f"Attention all units. Incident Commander broadcast: {broadcast_text}",
                model_id="eleven_turbo_v2_5"
            )

            # Write stream chunks to file
            with open(output_path, "wb") as f:
                for chunk in audio_generator:
                    f.write(chunk)

            print(f"[ElevenLabs] Audio broadcast successfully generated -> {output_path}")
            return output_path

        except Exception as e:
            print(f"[ElevenLabs Error] Could not generate audio dispatch: {e}")
            return None