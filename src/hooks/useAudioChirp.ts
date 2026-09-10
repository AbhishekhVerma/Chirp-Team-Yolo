import { useState, useRef, useEffect } from 'react';

export function useAudioChirp() {
  const [isListening, setIsListening] = useState(false);
  const [receivedSpotId, setReceivedSpotId] = useState<string | null>(null);
  const [chirpCounts, setChirpCounts] = useState<Record<string, number>>({});
  const [debugVolume, setDebugVolume] = useState<number>(0); 
  
  const isListeningRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const startListening = async () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // HACKATHON DEMO MOCK: Automatically trigger Spot #2 after 5 seconds
      mockTimeoutRef.current = setTimeout(() => {
        if (isListeningRef.current) {
          const mockSpotId = '2'; // They requested the "two chirps" option (Spot #2)
          setReceivedSpotId(mockSpotId);
          setChirpCounts(prev => ({ ...prev, [mockSpotId]: (prev[mockSpotId] || 0) + 1 }));
          stopListening();
        }
      }, 5000);

      streamRef.current = await navigator.mediaDevices.getUserMedia({ 
        audio: true // Removed aggressive constraints (echoCancellation: false, etc.) which cause some Windows Realtek drivers to return dead silent streams
      });
      
      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }
      
      const source = audioCtxRef.current.createMediaStreamSource(streamRef.current);
      const analyser = audioCtxRef.current.createAnalyser();
      analyser.fftSize = 512; 
      analyser.smoothingTimeConstant = 0.1; // Extremely fast reaction
      source.connect(analyser);

      setIsListening(true);
      
      // Safety net: Force resume continuously if the browser is stubbornly blocking it
      setInterval(() => {
        if (audioCtxRef.current?.state === 'suspended') {
          audioCtxRef.current.resume();
        }
      }, 500);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const sampleRate = audioCtxRef.current.sampleRate;
      
      // Target range 2000Hz - 3000Hz
      const minBin = Math.floor((2000 / (sampleRate / 2)) * bufferLength);
      const maxBin = Math.ceil((3000 / (sampleRate / 2)) * bufferLength);
      
      let isHigh = false;
      let currentChirpCount = 0;
      let lastChirpTime = Date.now();
      
      const checkAudio = () => {
        if (!isListeningRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        
        let globalMax = 0;
        let rangeMax = 0;
        
        for (let i = 0; i < bufferLength; i++) {
          if (dataArray[i] > globalMax) globalMax = dataArray[i];
          if (i >= minBin && i <= maxBin) {
            if (dataArray[i] > rangeMax) rangeMax = dataArray[i];
          }
        }
        
        if (Math.random() < 0.2) setDebugVolume(globalMax); // Update visualizer with overall mic level

        const now = Date.now();

        // Lower threshold to 80 to ensure we catch quiet chirps
        if (rangeMax > 80 && !isHigh) {
          isHigh = true;
          currentChirpCount++;
          lastChirpTime = now;
        } else if (rangeMax < 50 && isHigh) {
          // Add a tiny debounce to prevent double-counting a single chirp
          if (now - lastChirpTime > 150) {
            isHigh = false;
          }
        }

        // If we heard chirps, but it's been silent for 1.2 seconds, evaluate the count!
        if (currentChirpCount > 0 && now - lastChirpTime > 1200) {
          const spotId = currentChirpCount.toString();
          // Reset
          currentChirpCount = 0;
          isHigh = false;
          
          if (['1', '2', '3', '4', '5'].includes(spotId)) {
            setReceivedSpotId(spotId);
            setChirpCounts(prev => ({ ...prev, [spotId]: (prev[spotId] || 0) + 1 }));
            stopListening();
            return;
          }
        }
        
        requestAnimationFrame(checkAudio);
      };
      
      checkAudio();

    } catch (e: any) {
      alert("Microphone Error: " + (e.message || "Access denied."));
      console.error("Mic access denied:", e);
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (mockTimeoutRef.current) {
      clearTimeout(mockTimeoutRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
  };

  const transmitChirp = async (spotId: string) => {
    const numChirps = parseInt(spotId, 10);
    if (isNaN(numChirps) || numChirps < 1 || numChirps > 5) return;
    
    setChirpCounts(prev => ({ ...prev, [spotId]: (prev[spotId] || 0) + 1 }));
    
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const playPeep = (timeOffset: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      // Bird-like slide up from 2000Hz to 3000Hz
      osc.frequency.setValueAtTime(2000, ctx.currentTime + timeOffset);
      osc.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + timeOffset + 0.15);
      
      // Quick attack, quick release
      gain.gain.setValueAtTime(0, ctx.currentTime + timeOffset);
      gain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + timeOffset + 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + timeOffset + 0.15);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime + timeOffset);
      osc.stop(ctx.currentTime + timeOffset + 0.15);
    };

    // Play N chirps spaced 350ms apart
    for (let i = 0; i < numChirps; i++) {
      playPeep(i * 0.35);
    }
  };

  return { isListening, startListening, stopListening, transmitChirp, receivedSpotId, setReceivedSpotId, chirpCounts, debugVolume };
}
