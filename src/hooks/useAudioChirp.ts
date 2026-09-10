import { useState, useRef, useEffect } from 'react';

// Maps spot ID to specific frequency (Audible ranges are much more reliable across mobile mics)
const FREQ_MAP: Record<string, number> = {
  '1': 2000,
  '2': 2500,
  '3': 3000,
  '4': 3500,
  '5': 4000
};

export function useAudioChirp() {
  const [isListening, setIsListening] = useState(false);
  const [receivedSpotId, setReceivedSpotId] = useState<string | null>(null);
  const [chirpCounts, setChirpCounts] = useState<Record<string, number>>({});
  
  const isListeningRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const startListening = async () => {
    try {
      // Disabling noise suppression is CRITICAL for detecting pure sine waves!
      streamRef.current = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // iOS Fix: explicitly resume context
      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }
      
      const source = audioCtxRef.current.createMediaStreamSource(streamRef.current);
      const analyser = audioCtxRef.current.createAnalyser();
      analyser.fftSize = 2048; // Bins size
      source.connect(analyser);

      setIsListening(true);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const sampleRate = audioCtxRef.current.sampleRate; // usually 44100 or 48000
      
      const checkAudio = () => {
        if (!isListeningRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        
        // Targeted Frequency Detection (Instead of global max energy)
        for (const [id, freq] of Object.entries(FREQ_MAP)) {
          // Find the exact bin for our target frequency
          const binIndex = Math.round((freq / (sampleRate / 2)) * bufferLength);
          
          // Check a small window (+/- 2 bins) around the target frequency
          let localMax = 0;
          const windowSize = 2;
          for (let i = Math.max(0, binIndex - windowSize); i <= Math.min(bufferLength - 1, binIndex + windowSize); i++) {
            if (dataArray[i] > localMax) localMax = dataArray[i];
          }
          
          // If the energy *specifically at this frequency* is high enough, trigger!
          if (localMax > 160) {
            setReceivedSpotId(id);
            setChirpCounts(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
            stopListening();
            return;
          }
        }
        
        requestAnimationFrame(checkAudio);
      };
      
      checkAudio();

    } catch (e) {
      console.error("Mic access denied or error:", e);
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
    }
  };

  const transmitChirp = async (spotId: string) => {
    const targetFreq = FREQ_MAP[spotId] || 2000;
    
    // Increment local viral heatmap when transmitting too
    setChirpCounts(prev => ({ ...prev, [spotId]: (prev[spotId] || 0) + 1 }));
    
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // iOS Fix: explicitly resume context
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(targetFreq, ctx.currentTime);
    
    // Envelope to avoid popping, louder volume, longer duration for easier detection
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.1);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.9);
  };

  return { isListening, startListening, stopListening, transmitChirp, receivedSpotId, setReceivedSpotId, chirpCounts };
}
