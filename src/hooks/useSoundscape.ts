import { useEffect, useRef, useState } from 'react';

// Generates a 2-second looping white noise buffer
const getNoiseBuffer = (ctx: AudioContext) => {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  return buffer;
};

// A hook that uses Web Audio API to generate realistic ambient nature soundscapes based on "vibe"
export function useSoundscape() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // Track all source nodes and LFOs so we can clean them up
  const activeNodesRef = useRef<AudioNode[]>([]);
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

    // Fade out existing gracefully
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);

    timeoutRef.current = setTimeout(() => {
      // Clean up old nodes (Oscillators, BufferSources, LFOs)
      activeNodesRef.current.forEach(node => {
        try { if ('stop' in node) (node as any).stop(); } catch(e) {}
        node.disconnect();
      });
      activeNodesRef.current = [];

      if (!isPlaying) return;

      const noiseBuffer = getNoiseBuffer(ctx);
      let targetVolume = 0.5;

      // Create a master filter we can modulate with GPS speed later
      if (!filterRef.current) {
        filterRef.current = ctx.createBiquadFilter();
        filterRef.current.type = 'lowpass';
        filterRef.current.connect(masterGain);
      }
      
      const envFilter = filterRef.current;
      envFilter.frequency.value = 8000; // Default wide open

      // ==========================================
      // SOUND DESIGN ENGINE
      // ==========================================
      if (type === 'Food') {
        // VIBE: Cozy Fireplace (Brown Noise + Crackle)
        targetVolume = 0.8;
        
        // Deep Rumble
        const rumbleSource = ctx.createBufferSource();
        rumbleSource.buffer = noiseBuffer;
        rumbleSource.loop = true;
        const rumbleFilter = ctx.createBiquadFilter();
        rumbleFilter.type = 'lowpass';
        rumbleFilter.frequency.value = 100; // Heavy lowpass for brown noise
        rumbleSource.connect(rumbleFilter);
        rumbleFilter.connect(envFilter);
        rumbleSource.start();
        
        // Crackle/Hiss
        const crackleSource = ctx.createBufferSource();
        crackleSource.buffer = noiseBuffer;
        crackleSource.loop = true;
        const crackleFilter = ctx.createBiquadFilter();
        crackleFilter.type = 'highpass';
        crackleFilter.frequency.value = 4000;
        
        const crackleGain = ctx.createGain();
        crackleGain.gain.value = 0.15; // Keep hiss quiet
        
        crackleSource.connect(crackleFilter);
        crackleFilter.connect(crackleGain);
        crackleGain.connect(envFilter);
        crackleSource.start();

        activeNodesRef.current.push(rumbleSource, crackleSource, rumbleFilter, crackleFilter, crackleGain);

      } else if (type === 'Event') {
        // VIBE: Heavy Rain (Pink Noise + Modulated Bandpass)
        targetVolume = 0.6;
        
        // Rain Roar
        const rainSource = ctx.createBufferSource();
        rainSource.buffer = noiseBuffer;
        rainSource.loop = true;
        
        const rainFilter = ctx.createBiquadFilter();
        rainFilter.type = 'lowpass';
        rainFilter.frequency.value = 1200; // Pink noise roaring sound
        
        rainSource.connect(rainFilter);
        rainFilter.connect(envFilter);
        rainSource.start();

        activeNodesRef.current.push(rainSource, rainFilter);

      } else if (type === 'Fun') {
        // VIBE: Ocean Waves (White Noise + Slow Sine LFO on Lowpass Filter)
        targetVolume = 0.7;
        
        const waveSource = ctx.createBufferSource();
        waveSource.buffer = noiseBuffer;
        waveSource.loop = true;
        
        // The filter that makes the "shhhhh" wave sound
        const waveFilter = ctx.createBiquadFilter();
        waveFilter.type = 'lowpass';
        waveFilter.frequency.value = 400; // Base frequency
        
        // The LFO (Low Frequency Oscillator) that slowly sweeps the filter up and down
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.12; // One wave every ~8 seconds
        
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 1200; // Sweep up to 1600Hz
        
        lfo.connect(lfoGain);
        lfoGain.connect(waveFilter.frequency);
        
        waveSource.connect(waveFilter);
        waveFilter.connect(envFilter);
        
        lfo.start();
        waveSource.start();

        activeNodesRef.current.push(waveSource, waveFilter, lfo, lfoGain);
      }

      // Modulate master filter based on speed (Environmental API)
      if (navigator.geolocation) {
        navigator.geolocation.watchPosition((pos) => {
          if (pos.coords.speed && pos.coords.speed > 0 && filterRef.current) {
            // Higher walking speed = brighter/more intense environment sound
            filterRef.current.frequency.setTargetAtTime(8000 + (pos.coords.speed * 1000), ctx.currentTime, 0.5);
          }
        }, () => {}, { enableHighAccuracy: true });
      }

      // Fade in to new target volume
      masterGain.gain.cancelScheduledValues(ctx.currentTime);
      masterGain.gain.setTargetAtTime(targetVolume, ctx.currentTime, 1.0);
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
        
        setTimeout(() => {
          if (!isPlaying) {
            activeNodesRef.current.forEach(node => {
              try { if ('stop' in node) (node as any).stop(); } catch(e) {}
              node.disconnect();
            });
            activeNodesRef.current = [];
          }
        }, 300);
      }
    }
  }, [isPlaying]);

  return { isPlaying, setIsPlaying, setVibeType: playVibe };
}
