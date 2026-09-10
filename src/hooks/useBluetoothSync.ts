import { useState } from 'react';

export function useBluetoothSync() {
  const [isScanning, setIsScanning] = useState(false);
  const [foundDevices, setFoundDevices] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const scanForFriends = async () => {
    setIsScanning(true);
    setError(null);
    try {
      // Note: Web Bluetooth requires HTTPS and user gesture.
      // It also only acts as a Central, so it can't discover other phones easily unless they are broadcasting as a BLE peripheral (which requires native apps).
      // This is a proof-of-concept for the "mesh" idea.
      
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        // OptionalServices could be added if we had a specific GATT service
      });

      if (device && device.name) {
        setFoundDevices(prev => [...new Set([...prev, device.name])]);
      }
    } catch (err: any) {
      console.warn("Bluetooth error:", err);
      if (err.name === 'NotFoundError') {
        setError('No Bluetooth devices found, or cancelled.');
      } else if (err.name === 'NotSupportedError') {
         setError('Web Bluetooth is not supported on this browser/device.');
      } else {
        setError(err.message || 'Bluetooth failed');
      }
    } finally {
      setIsScanning(false);
    }
  };

  return { isScanning, scanForFriends, foundDevices, error };
}
