import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        onScan(decodedText);
      },
      () => {
        // parse error, ignore
      }
    ).catch(err => {
      console.warn("QR Scanner error", err);
    });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(err => console.warn("Stop error", err));
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="glass-panel p-4 rounded-[2rem] w-full max-w-sm relative">
        <button onClick={onClose} className="absolute -top-12 right-0 p-2 bg-white/20 text-white rounded-full">
          ✕
        </button>
        <h3 className="text-white text-center font-bold mb-4">Scan Spot QR</h3>
        <div id="qr-reader" className="w-full rounded-xl overflow-hidden"></div>
      </div>
    </div>
  );
}
