import { useState } from 'react';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';

interface PitchDeckProps {
  onClose: () => void;
}

export default function PitchDeck({ onClose }: PitchDeckProps) {
  const [slide, setSlide] = useState(0);

  const slides = [
    {
      title: "The Problem",
      subtitle: "You are at a massive music festival.",
      content: "You want to find the best food truck. You want to know where your friends are. But there is a massive problem. 80,000 people are here and the cell towers are completely jammed. You have zero signal."
    },
    {
      title: "The Solution",
      subtitle: "Chirp.",
      content: "A local-first discovery app that does not care if you have cell service. It caches your world locally and uses physical hardware to share data when the internet goes down."
    },
    {
      title: "Sensory Tech",
      subtitle: "Audio Chirp Mesh.",
      content: "We built a custom FSK audio modem in the browser. If you find a cool spot, your phone emits a high frequency audio chirp. Your friend's phone hears it, decodes it, and saves the spot. Zero internet required."
    },
    {
      title: "Sensory UI",
      subtitle: "AR & Ambient Audio.",
      content: "We use your phone's gyroscope to project locations in augmented reality. We use your GPS walking speed to generate dynamic, ambient background music. The app reacts to how you move."
    },
    {
      title: "Target Audience",
      subtitle: "Gen Z & Festival Goers.",
      content: "People who want to stay connected in dense, chaotic environments without relying on fragile infrastructure. They value privacy, decentralization, and physical presence."
    },
    {
      title: "Go-to-Market",
      subtitle: "Golden Chirps.",
      content: "Local businesses pay to drop 'Golden Chirps' (exclusive offline discounts scattered around the city) that users discover organically through our acoustic mesh network."
    },
    {
      title: "The Ultimate Vision",
      subtitle: "Bluetooth Mesh.",
      content: "Phones act as decentralized nodes. Once one device fetches local spots, it silently broadcasts that data to nearby phones via Bluetooth Low Energy (BLE). Those phones relay it forward, creating a viral, city-wide offline web."
    },
    {
      title: "Future Roadmap",
      subtitle: "Native App Launch.",
      content: "Right now we are a Progressive Web App to bypass App Store fees. Our next step is a native iOS and Android launch to unlock true background Bluetooth BLE mesh networking. Thank you."
    }
  ];

  const nextSlide = () => setSlide(s => Math.min(s + 1, slides.length - 1));
  const prevSlide = () => setSlide(s => Math.max(s - 1, 0));

  return (
    <div className="fixed inset-0 z-[200] bg-vibrant flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/40 blur-[120px] rounded-full animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-pink-400/40 blur-[120px] rounded-full animate-blob animation-delay-2000"></div>
      </div>

      <button onClick={onClose} className="absolute top-6 right-6 p-3 glass-button rounded-full text-gray-800 z-10">
        <X className="w-6 h-6" />
      </button>

      <div className="glass-panel rounded-[3rem] p-10 max-w-2xl w-full text-center relative shadow-2xl border border-white/40 min-h-[400px] flex flex-col justify-center">
        <div className="mb-4">
          <span className="px-4 py-1.5 rounded-full bg-white/20 text-sm font-bold tracking-widest uppercase text-gray-700">
            Slide {slide + 1} of {slides.length}
          </span>
        </div>
        
        <h1 className="text-5xl font-black text-gray-900 drop-shadow-md mb-2 tracking-tight">
          {slides[slide].title}
        </h1>
        
        <h2 className="text-2xl font-bold text-indigo-600 mb-8">
          {slides[slide].subtitle}
        </h2>
        
        <p className="text-xl text-gray-800 leading-relaxed font-medium">
          {slides[slide].content}
        </p>

        <div className="absolute bottom-10 left-0 right-0 flex justify-center space-x-6">
          <button 
            onClick={prevSlide}
            disabled={slide === 0}
            className="p-4 rounded-full glass-button disabled:opacity-30 transition-all text-gray-900"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button 
            onClick={nextSlide}
            disabled={slide === slides.length - 1}
            className="p-4 rounded-full glass-button disabled:opacity-30 transition-all text-gray-900"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      </div>
    </div>
  );
}
