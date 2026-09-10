import { useEffect, useRef, useState } from 'react';

// A hook that uses Web Audio API to generate ambient drones based on "vibe"
export function useSoundscape() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const gain = audioCtxRef.current.createGain();
      gain.gain.value = 0; // start silent
      gain.connect(audioCtxRef.current.destination);
      gainNodeRef.current = gain;
    }
    // Always attempt to resume in case it's suspended (crucial for iOS)
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playVibe = (type: string) => {
    if (!isPlaying) return; // Only play if toggled on
    initAudio();
    if (!audioCtxRef.current || !gainNodeRef.current) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const ctx = audioCtxRef.current;
    const gain = gainNodeRef.current;

    // Fade out existing gracefully
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);

    timeoutRef.current = setTimeout(() => {
      // Stop old oscillators
      oscillatorsRef.current.forEach(osc => {
        try { osc.stop(); } catch(e) {}
        osc.disconnect();
      });
      oscillatorsRef.current = [];

      if (!isPlaying) return;

      // Create new generators based on type
      let freqs = [220, 277.18, 329.63]; // A major default
      let waveType: OscillatorType = 'sine';
      let targetVolume = 0.4;

      if (type === 'Food') {
        freqs = [196, 246.94, 293.66]; // G major (warm)
        waveType = 'triangle';
        targetVolume = 0.4;
      } else if (type === 'Event') {
        freqs = [261.63, 329.63, 392.00]; // C major (energetic)
        waveType = 'sine';
        targetVolume = 0.5;
      } else if (type === 'Fun') {
        freqs = [146.83, 174.61, 220.00]; // D minor (retro/arcade)
        waveType = 'triangle'; // Square is too harsh for ambient
        targetVolume = 0.3;
      }

      // Filter to make it ambient
      if (!filterRef.current) {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.connect(gain);
        filterRef.current = filter;
        
        // Modulate filter based on speed (Environmental API)
        if (navigator.geolocation) {
          navigator.geolocation.watchPosition((pos) => {
            if (pos.coords.speed && pos.coords.speed > 0) {
              const currentSpeed = pos.coords.speed;
              // Higher speed = brighter sound (higher cutoff)
              if (filterRef.current) {
                 filterRef.current.frequency.setTargetAtTime(600 + (currentSpeed * 300), ctx.currentTime, 0.5);
              }
            }
          }, () => {}, { enableHighAccuracy: true });
        }
      }

      filterRef.current.frequency.value = 800; // Default cutoff

      freqs.forEach(freq => {
        const osc = ctx.createOscillator();
        osc.type = waveType;
        osc.frequency.value = freq;
        osc.detune.value = (Math.random() - 0.5) * 10;
        osc.connect(filterRef.current!);
        osc.start();
        oscillatorsRef.current.push(osc);
      });

      // Fade in to new target volume
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setTargetAtTime(targetVolume, ctx.currentTime, 1.0);
    }, 300); // Shorter crossfade
  };

  useEffect(() => {
    if (isPlaying) {
      initAudio();
      playVibe('Food'); // Default start
    } else {
      if (gainNodeRef.current && audioCtxRef.current) {
        gainNodeRef.current.gain.cancelScheduledValues(audioCtxRef.current.currentTime);
        gainNodeRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.2);
        
        // Clean up immediately if stopped
        setTimeout(() => {
          if (!isPlaying) { // check if still not playing
            oscillatorsRef.current.forEach(osc => {
              try { osc.stop(); } catch(e) {}
              osc.disconnect();
            });
            oscillatorsRef.current = [];
          }
        }, 300);
      }
    }
  }, [isPlaying]);

  return { isPlaying, setIsPlaying, setVibeType: playVibe };
}
