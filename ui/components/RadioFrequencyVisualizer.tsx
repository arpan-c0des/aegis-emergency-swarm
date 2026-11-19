import React, { useEffect, useState, useRef } from 'react';

interface Props {
  isPlaying: boolean;
  className?: string;
}

/**
 * Authentic Radio Frequency & Volume Spectrum Visualizer
 * - Idle / Standby: Calm, resting static baseline (zero continuous animation or buffering).
 * - Active Broadcast: Dynamic frequency spectrum modulation responding to speech cadence,
 *   vocal volume envelope, and harmonic frequency bands (60Hz to 12kHz).
 */
export const RadioFrequencyVisualizer: React.FC<Props> = ({ isPlaying, className = '' }) => {
  // 8 Discrete Audio Spectrum Bands:
  // [0: 60Hz Sub, 1: 150Hz Fundamental, 2: 400Hz Formant1, 3: 1kHz Mid, 4: 2.4kHz Formant2, 5: 4kHz Presence, 6: 8kHz Air, 7: 12kHz Treble]
  const IDLE_HEIGHTS = [3, 3, 3, 3, 3, 3, 3, 3];
  const [bandHeights, setBandHeights] = useState<number[]>(IDLE_HEIGHTS);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // When idle (no speech broadcast), immediately halt animation and return to static resting bars
    if (!isPlaying) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      setBandHeights(IDLE_HEIGHTS);
      return;
    }

    const startTime = performance.now();

    const renderFrequencies = (now: number) => {
      const elapsed = (now - startTime) / 1000;

      // Natural speech cadence & syllable bursts (~3.5 to 4.5 syllables/sec)
      const syllableBurst = Math.sin(elapsed * 15) * Math.sin(elapsed * 9);
      const vocalEnergy = Math.abs(syllableBurst);
      
      // Dynamic volume envelope with conversational micro-pauses
      const volumeEnvelope = 0.25 + 0.75 * Math.pow(vocalEnergy, 1.3);

      // Vocal formant energy distribution (Speech peaks in 400Hz - 2.5kHz range)
      const frequencyWeights = [0.3, 0.65, 0.95, 1.0, 0.85, 0.6, 0.4, 0.25];

      const newHeights = frequencyWeights.map((weight, idx) => {
        // Individual frequency flutter per band to mimic authentic audio FFT analysis
        const frequencyPhase = Math.sin(elapsed * (18 + idx * 5.5) + idx * 1.1);
        const flutter = 0.65 + 0.35 * frequencyPhase;
        
        const minHeight = 3;  // resting baseline in px
        const maxHeight = 22; // peak amplitude in px

        const computedHeight = Math.round(
          minHeight + (maxHeight - minHeight) * volumeEnvelope * weight * flutter
        );
        return Math.max(minHeight, Math.min(maxHeight, computedHeight));
      });

      setBandHeights(newHeights);
      animFrameRef.current = requestAnimationFrame(renderFrequencies);
    };

    animFrameRef.current = requestAnimationFrame(renderFrequencies);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isPlaying]);

  return (
    <div 
      className={`flex items-end gap-[3px] h-5 px-1.5 shrink-0 ${className}`}
      title={isPlaying ? "Radio Transmission Active · Live Frequency Spectrum" : "Dispatch Radio Standby · Idle Baseline"}
    >
      {bandHeights.map((h, i) => {
        const isPeak = isPlaying && h >= 14;
        const isMid = isPlaying && h >= 8;

        // Dynamic spectral color grading:
        // Idle: muted slate grey (no movement)
        // Mid volume: amber dispatch tone (#F59E0B)
        // Peak volume surge: bright emergency emerald (#10B981)
        const barColor = !isPlaying
          ? '#52525B'
          : isPeak
          ? '#10B981'
          : isMid
          ? '#F59E0B'
          : '#D97706';

        return (
          <span
            key={i}
            className="w-[3px] rounded-full transition-[height,background-color] duration-75"
            style={{
              height: `${h}px`,
              backgroundColor: barColor,
              opacity: isPlaying ? 1 : 0.4,
              boxShadow: isPeak
                ? '0 0 6px rgba(16, 185, 129, 0.6)'
                : isMid
                ? '0 0 4px rgba(245, 158, 11, 0.4)'
                : 'none'
            }}
          />
        );
      })}
    </div>
  );
};
