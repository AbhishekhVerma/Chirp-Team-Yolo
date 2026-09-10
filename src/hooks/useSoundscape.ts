import { useEffect, useRef, useState } from 'react';

// A hook that uses Web Audio API to generate lush, pleasant ambient drones
export function useSoundscape() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  const activeNodesRef = useRef<AudioNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const gain = audioCtxRef.current.createGain();
      gain.gain.value = 0; 
      gain.connect(audioCtxRef.current.destination);
      gainNodeRef.current = gain;
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playVibe = (type: string) => {
    if (!isPlaying) return;
    initAudio();
    if (!audioCtxRef.current || !gainNodeRef.current) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const ctx = audioCtxRef.current;
    const masterGain = gainNodeRef.current;

    // Fade out gently
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.8);

    timeoutRef.current = setTimeout(() => {
      // Clean up old nodes
      activeNodesRef.current.forEach(node => {
        try { if ('stop' in node) (node as any).stop(); } catch(e) {}
        node.disconnect();
      });
      activeNodesRef.current = [];

      if (!isPlaying) return;

      if (!filterRef.current) {
        filterRef.current = ctx.createBiquadFilter();
        filterRef.current.type = 'lowpass';
        filterRef.current.connect(masterGain);
      }
      
      const envFilter = filterRef.current;
      envFilter.frequency.value = 1000; // Soft cutoff

      // Lush Chord Progressions (Pleasant, relaxing)
      let freqs = [220, 277.18, 329.63]; // A Major
      
      if (type === 'Food') {
        freqs = [261.63, 329.63, 392.00, 493.88]; // C Major 7th (Warm & Cozy)
      } else if (type === 'Event') {
        freqs = [349.23, 440.00, 523.25, 659.25]; // F Lydian (Airy & Open)
      } else if (type === 'Fun') {
        freqs = [196.00, 261.63, 293.66, 392.00]; // G Suspended (Floating & Playful)
      }

      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine'; // Only sine waves for pure pleasantness
        osc.frequency.value = freq;
        
        // Add a very slow LFO to the volume of each note to make them "breathe"
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1 + (index * 0.05); // slightly different breath rates
        
        const voiceGain = ctx.createGain();
        voiceGain.gain.value = 0.5; // Base volume
        
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.4; // Modulation depth
        
        lfo.connect(lfoGain);
        lfoGain.connect(voiceGain.gain);
        
        osc.connect(voiceGain);
        voiceGain.connect(envFilter);
        
        osc.start();
        lfo.start();
        
        activeNodesRef.current.push(osc, lfo, voiceGain, lfoGain);
      });

      // Modulate master filter based on speed
      if (navigator.geolocation) {
        navigator.geolocation.watchPosition((pos) => {
          if (pos.coords.speed && pos.coords.speed > 0 && filterRef.current) {
            filterRef.current.frequency.setTargetAtTime(1000 + (pos.coords.speed * 200), ctx.currentTime, 1.0);
          }
        }, () => {}, { enableHighAccuracy: true });
      }

      // Very slow fade in for ambient pleasantness
      masterGain.gain.cancelScheduledValues(ctx.currentTime);
      masterGain.gain.setTargetAtTime(0.6, ctx.currentTime, 2.0);
    }, 1000); 
  };

  useEffect(() => {
    if (isPlaying) {
      initAudio();
      playVibe('Food'); 
    } else {
      if (gainNodeRef.current && audioCtxRef.current) {
        gainNodeRef.current.gain.cancelScheduledValues(audioCtxRef.current.currentTime);
        gainNodeRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.5);
        
        setTimeout(() => {
          if (!isPlaying) {
            activeNodesRef.current.forEach(node => {
              try { if ('stop' in node) (node as any).stop(); } catch(e) {}
              node.disconnect();
            });
            activeNodesRef.current = [];
          }
        }, 1000);
      }
    }
  }, [isPlaying]);

  return { isPlaying, setIsPlaying, setVibeType: playVibe };
}
