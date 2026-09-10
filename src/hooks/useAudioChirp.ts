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
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
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
        
        let maxEnergy = 0;
        let maxIndex = 0;
        
        // Find peak frequency in the expected range
        for(let i = 0; i < bufferLength; i++) {
          if (dataArray[i] > maxEnergy) {
            maxEnergy = dataArray[i];
            maxIndex = i;
          }
        }

        const peakFrequency = maxIndex * (sampleRate / 2) / bufferLength;
        
        // Simple FSK decoding based on peak energy map (lowered threshold to 120 for reliability)
        if (maxEnergy > 120) {
          for (const [id, freq] of Object.entries(FREQ_MAP)) {
            // Check if peak frequency is within 200Hz tolerance of our mapped frequency
            if (Math.abs(peakFrequency - freq) < 200) {
              setReceivedSpotId(id);
              setChirpCounts(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
              stopListening();
              return;
            }
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

  const transmitChirp = (spotId: string) => {
    const targetFreq = FREQ_MAP[spotId] || 2000;
    
    // Increment local viral heatmap when transmitting too
    setChirpCounts(prev => ({ ...prev, [spotId]: (prev[spotId] || 0) + 1 }));
    
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(targetFreq, ctx.currentTime);
    
    // Envelope to avoid popping, louder volume (1.0)
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.1);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  };

  return { isListening, startListening, stopListening, transmitChirp, receivedSpotId, setReceivedSpotId, chirpCounts };
}
