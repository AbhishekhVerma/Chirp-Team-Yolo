import React, { useEffect, useRef, useState } from 'react';
import { X, MapPin } from 'lucide-react';

interface ARViewProps {
  spots: any[];
  onClose: () => void;
}

export default function ARView({ spots, onClose }: ARViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [heading, setHeading] = useState<number>(0);
  const [error, setError] = useState('');

  // Assign a fake bearing (0-360) to each spot for the AR demo
  const arSpots = React.useMemo(() => {
    return spots.map((s, i) => ({
      ...s,
      targetBearing: (i * (360 / spots.length)) % 360
    }));
  }, [spots]);

  useEffect(() => {
    // 1. Start Camera
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // iOS Safari Fix: Explicitly play the video once metadata is loaded
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(e => console.warn('Video play blocked:', e));
          };
        }
      })
      .catch(() => setError('Camera access denied or unavailable.'));

    // 2. Start Gyroscope/Compass
    const handleOrientation = (event: DeviceOrientationEvent) => {
      // iOS requires webkitCompassHeading, Android uses alpha
      let currentHeading = 0;
      if ((event as any).webkitCompassHeading) {
        currentHeading = (event as any).webkitCompassHeading;
      } else if (event.alpha !== null) {
        currentHeading = 360 - event.alpha; // Convert alpha to compass bearing
      }
      setHeading(currentHeading);
    };

    const requestDeviceOrientation = async () => {
      // iOS 13+ requires explicit permission for DeviceOrientation
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        try {
          const permissionState = await (DeviceOrientationEvent as any).requestPermission();
          if (permissionState === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          } else {
            setError('Gyroscope permission denied.');
          }
        } catch (e) {
          setError('Failed to request orientation.');
        }
      } else {
        // Non-iOS 13+ devices
        window.addEventListener('deviceorientation', handleOrientation);
      }
    };

    requestDeviceOrientation();

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden flex flex-col">
      {/* Camera Background */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-80"
      />

      {/* AR HUD Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 pointer-events-auto">
          <h2 className="text-white font-bold text-xl drop-shadow-md backdrop-blur-sm bg-black/20 px-4 py-2 rounded-full">
            AR Glass View
          </h2>
          <button onClick={onClose} className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="bg-red-500/80 text-white p-4 mx-4 rounded-xl backdrop-blur-md mt-4">
            {error} (Try tapping the screen if on iOS)
          </div>
        )}

        {/* Compass Strip Indicator */}
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-64 h-8 overflow-hidden bg-black/30 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center text-white font-mono text-sm">
          Bearing: {Math.round(heading)}°
        </div>

        {/* AR Elements (Spots) */}
        <div className="relative w-full h-full flex items-center justify-center">
          {arSpots.map(spot => {
            // Calculate distance between current heading and spot's target bearing
            let diff = spot.targetBearing - heading;
            // Normalize diff to -180 to 180
            if (diff > 180) diff -= 360;
            if (diff < -180) diff += 360;

            // If the spot is within a 45-degree field of view, render it
            const isVisible = Math.abs(diff) < 45;
            
            // Map diff (-45 to 45) to screen X position (-150px to 150px)
            const translateX = (diff / 45) * 160;

            if (!isVisible) return null;

            return (
              <div 
                key={spot.id}
                className="absolute transition-transform duration-100 ease-out pointer-events-auto"
                style={{ transform: `translate(${translateX}px, 0px)` }}
              >
                <div className="glass-panel p-4 rounded-2xl w-48 text-center shadow-2xl border border-white/40">
                   <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                     <MapPin className="text-white w-6 h-6" />
                   </div>
                   <h3 className="font-bold text-white text-lg drop-shadow-md">{spot.name}</h3>
                   <p className="text-xs text-white/80">{spot.distance}</p>
                   <p className="text-xs font-bold text-indigo-200 mt-2">{spot.type}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
