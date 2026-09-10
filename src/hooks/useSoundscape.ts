import { useEffect, useRef, useState } from 'react';

// A hook that uses Web Audio API to generate ambient drones based on "vibe"
export function useSoundscape() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const gain = audioCtxRef.current.createGain();
      gain.gain.value = 0; // start silent
      gain.connect(audioCtxRef.current.destination);
      gainNodeRef.current = gain;
    }
  };

  const playVibe = (type: string) => {
    initAudio();
    if (!audioCtxRef.current || !gainNodeRef.current) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Fade out existing
    gainNodeRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.5);

    timeoutRef.current = setTimeout(() => {
      // Stop old oscillators
      oscillatorsRef.current.forEach(osc => {
        try { osc.stop(); } catch(e) {}
        osc.disconnect();
      });
      oscillatorsRef.current = [];

      if (!isPlaying) return;

      const ctx = audioCtxRef.current!;
      const gain = gainNodeRef.current!;

      // Create new generators based on type
      let freqs = [220, 277.18, 329.63]; // A major default
      let waveType: OscillatorType = 'sine';

      if (type === 'Food') {
        freqs = [196, 246.94, 293.66]; // G major (warm)
        waveType = 'triangle';
      } else if (type === 'Event') {
        freqs = [261.63, 329.63, 392.00]; // C major (energetic)
        waveType = 'sine';
      } else if (type === 'Fun') {
        freqs = [146.83, 174.61, 220.00]; // D minor (retro/arcade)
        waveType = 'square';
        gain.gain.value = 0.05; // square is loud
      }

      // Filter to make it ambient
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      
      // Modulate filter based on speed (Environmental API)
      let currentSpeed = 0;
      if (navigator.geolocation) {
        navigator.geolocation.watchPosition((pos) => {
          if (pos.coords.speed && pos.coords.speed > 0) {
            currentSpeed = pos.coords.speed;
            // Higher speed = brighter sound (higher cutoff)
            filter.frequency.setTargetAtTime(800 + (currentSpeed * 200), ctx.currentTime, 0.5);
          }
        }, () => {}, { enableHighAccuracy: true });
      }

      filter.frequency.value = 800 + (currentSpeed * 200);
      filter.connect(gain);

      freqs.forEach(freq => {
        const osc = ctx.createOscillator();
        osc.type = waveType;
        osc.frequency.value = freq;
        osc.detune.value = (Math.random() - 0.5) * 10;
        osc.connect(filter);
        osc.start();
        oscillatorsRef.current.push(osc);
      });

      // Fade in
      gain.gain.setTargetAtTime(waveType === 'square' ? 0.02 : 0.1, ctx.currentTime, 1);
    }, 600);
  };

  useEffect(() => {
    if (isPlaying) {
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      playVibe('Food'); // Default start
    } else {
      if (gainNodeRef.current && audioCtxRef.current) {
        gainNodeRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.5);
      }
    }
  }, [isPlaying]);

  return { isPlaying, setIsPlaying, setVibeType: playVibe };
}
