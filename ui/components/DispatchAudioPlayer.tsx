import React, { useState, useRef } from 'react';
import { Volume2, PlayCircle, Loader2 } from 'lucide-react';

interface AudioPlayerProps {
  audioAvailable: boolean;
}

export const DispatchAudioPlayer: React.FC<AudioPlayerProps> = ({ audioAvailable }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = () => {
    // Stop any existing playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setIsPlaying(true);

    // Create a fresh audio object with a timestamp to completely bypass browser caching
    const freshAudio = new Audio(`http://127.0.0.1:8000/api/audio/latest?nocache=${Date.now()}`);
    audioRef.current = freshAudio;

    freshAudio.play().catch((err) => {
      console.warn("Audio playback interrupted or blocked by browser:", err);
      setIsPlaying(false);
    });

    freshAudio.onended = () => {
      setIsPlaying(false);
    };

    freshAudio.onerror = (e) => {
      console.error("Audio error encountered:", e);
      setIsPlaying(false);
    };
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <Volume2 className={isPlaying ? "text-green-400 animate-pulse" : "text-gray-400"} size={20} />
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Tactical Audio Link</div>
          <div className="text-sm font-semibold text-gray-200">
            {isPlaying ? "Broadcasting Voice Dispatch..." : audioAvailable ? "ElevenLabs Radio Transmission Ready" : "Awaiting Command Directive"}
          </div>
        </div>
      </div>
      <button
        onClick={playAudio}
        disabled={!audioAvailable || isPlaying}
        className={`px-3 py-1.5 rounded flex items-center space-x-1.5 text-xs font-bold uppercase transition ${
          audioAvailable && !isPlaying
            ? "bg-blue-600 hover:bg-blue-500 text-white"
            : "bg-gray-800 text-gray-500 cursor-not-allowed"
        }`}
      >
        {isPlaying ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}
        <span>{isPlaying ? "Transmitting" : "Play Broadcast"}</span>
      </button>
    </div>
  );
};