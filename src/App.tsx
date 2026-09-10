import React, { useState, useEffect } from 'react';
import { MapPin, Heart, WifiOff, Users, Compass, Bookmark, Music, QrCode, X, Volume2, Ear, Camera, Radio, Map } from 'lucide-react';
import VibesMap from './components/VibesMap';
import ARView from './components/ARView';
import { useSoundscape } from './hooks/useSoundscape';
import { useAudioChirp } from './hooks/useAudioChirp';
import { useBluetoothSync } from './hooks/useBluetoothSync';
import QRCode from 'react-qr-code';
import QRScanner from './components/QRScanner';
import PitchDeck from './components/PitchDeck';

// --- MOCK DATA ---
const SPOTS = [
  { id: '1', name: 'Joe\'s Pizza', type: 'Food', description: 'Best slices in town, fresh out the oven.', distance: '0.2 mi', lat: 25.2048 + 0.01, lng: 55.2708 - 0.01 },
  { id: '2', name: 'Downtown Art Walk', type: 'Event', description: 'Local artists showcasing street murals.', distance: '0.5 mi', lat: 25.2048 - 0.02, lng: 55.2708 + 0.01 },
  { id: '3', name: 'Central Park Jazz', type: 'Event', description: 'Live jazz by the fountain. Bring a blanket!', distance: '0.8 mi', lat: 25.2048 + 0.03, lng: 55.2708 + 0.02 },
  { id: '4', name: 'Neon Arcade', type: 'Fun', description: 'Retro arcade games and pinball machines.', distance: '1.2 mi', lat: 25.2048 - 0.03, lng: 55.2708 - 0.02 },
  { id: '5', name: 'Midnight Diner', type: 'Food', description: 'Open 24/7. Get the chili fries.', distance: '0.1 mi', lat: 25.2048 + 0.005, lng: 55.2708 + 0.005 }
];

const INITIAL_FEED = [
  { id: '101', friendName: 'Sarah', spotId: '1', action: 'is eating at', time: '2m ago' },
  { id: '102', friendName: 'Mike', spotId: '4', action: 'just checked in at', time: '10m ago' },
];

export default function App() {
  const [username, setUsername] = useState(() => localStorage.getItem('vibes_user') || '');
  const [tempUsername, setTempUsername] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [activeTab, setActiveTab] = useState('discover');
  
  // State for user data
  const [savedSpots, setSavedSpots] = useState<string[]>([]);
  
  // Persist Live Feed
  const [liveFeed, setLiveFeed] = useState(() => {
    const saved = localStorage.getItem('vibes_feed');
    return saved ? JSON.parse(saved) : INITIAL_FEED;
  });

  // Sensory Hooks
  const { isPlaying: isAudioPlaying, setIsPlaying: setIsAudioPlaying, setVibeType } = useSoundscape();
  const { isListening, startListening, stopListening, transmitChirp, receivedSpotId, setReceivedSpotId, chirpCounts, debugVolume } = useAudioChirp();
  const { isScanning, scanForFriends, foundDevices, error: btError } = useBluetoothSync();

  const [isInitialized, setIsInitialized] = useState(false);
  const [showQrSpot, setShowQrSpot] = useState<string | null>(null);
  const [isScanningQr, setIsScanningQr] = useState(false);
  const [showARView, setShowARView] = useState(false);
  const [showPitch, setShowPitch] = useState(false);

  // Sync network status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync saved spots (Local + Vercel Cloud)
  useEffect(() => {
    if (username) {
      const local = localStorage.getItem(`vibes_saved_${username}`);
      if (local) setSavedSpots(JSON.parse(local));

      if (!isOffline) {
        fetch(`/api/sync?username=${username}`)
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              setSavedSpots(data);
              localStorage.setItem(`vibes_saved_${username}`, JSON.stringify(data));
            }
          })
          .catch(() => console.log('Cloud sync unavailable right now'))
          .finally(() => setIsInitialized(true));
      } else {
        setIsInitialized(true);
      }
    }
  }, [username, isOffline]);

  // Persist saved spots (only after init)
  useEffect(() => {
    if (username && isInitialized) {
      localStorage.setItem(`vibes_saved_${username}`, JSON.stringify(savedSpots));
      
      if (!isOffline) {
        fetch(`/api/sync?username=${username}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ savedSpots })
        }).catch(() => console.log('Offline, will sync to cloud later'));
      }
    }
  }, [savedSpots, username, isOffline, isInitialized]);

  // Persist live feed
  useEffect(() => {
    localStorage.setItem('vibes_feed', JSON.stringify(liveFeed));
  }, [liveFeed]);

  // Handle incoming Audio Chirps
  useEffect(() => {
    if (receivedSpotId) {
      if (!savedSpots.includes(receivedSpotId)) {
        setSavedSpots(prev => [...prev, receivedSpotId]);
        alert(`Received a shared spot via Audio Chirp! Spot ID: ${receivedSpotId}`);
      }
      setReceivedSpotId(null);
    }
  }, [receivedSpotId, savedSpots, setReceivedSpotId]);

  // Simulate live updates when online
  useEffect(() => {
    if (isOffline) return;
    
    const interval = setInterval(() => {
      const randomSpot = SPOTS[Math.floor(Math.random() * SPOTS.length)];
      const friends = ['Alex', 'Emma', 'David', 'Chris', 'Mia'];
      const actions = ['just saved', 'is heading to', 'recommends'];
      const randomFriend = friends[Math.floor(Math.random() * friends.length)];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      
      const newUpdate = {
        id: Date.now().toString(),
        friendName: randomFriend,
        spotId: randomSpot.id,
        action: randomAction,
        time: 'just now'
      };
      
      setLiveFeed((prev: any) => [newUpdate, ...prev].slice(0, 10)); // Keep last 10
    }, 15000);

    return () => clearInterval(interval);
  }, [isOffline]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempUsername.trim()) {
      localStorage.setItem('vibes_user', tempUsername.trim());
      setUsername(tempUsername.trim());
    }
  };

  const handleScanQr = (decoded: string) => {
    try {
      const data = JSON.parse(decoded);
      if ((data.type === 'nearby-vibes' || data.type === 'chirp') && data.spotId) {
        if (!savedSpots.includes(data.spotId)) {
          setSavedSpots(prev => [...prev, data.spotId]);
          alert(`Saved spot ${data.spotId} from QR code!`);
        }
        setIsScanningQr(false);
      }
    } catch (e) {
      console.warn("Invalid QR");
    }
  };

  const toggleSave = (spotId: string) => {
    setSavedSpots(prev => 
      prev.includes(spotId) 
        ? prev.filter(id => id !== spotId) 
        : [...prev, spotId]
    );
  };

  // --- RENDERERS ---

  if (!username) {
    return (
      <div className="min-h-screen bg-vibrant flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {showPitch && <PitchDeck onClose={() => setShowPitch(false)} />}
        <button 
          onClick={() => setShowPitch(true)}
          className="absolute top-6 right-6 px-4 py-2 rounded-full glass-button text-sm font-bold text-gray-800 z-10"
        >
          View Pitch Deck
        </button>
        
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="bg-shape shape1"></div>
          <div className="bg-shape shape2"></div>
          <div className="bg-shape shape3"></div>
          <div className="bg-shape shape4"></div>
        </div>

        <div className="glass-panel p-8 w-full max-w-md text-center rounded-[2rem] relative z-10">
          <div className="flex justify-center mb-4">
            <div className="bg-white/40 p-3 rounded-full backdrop-blur-md shadow-sm">
              <MapPin className="text-gray-900 w-10 h-10" />
            </div>
          </div>
          <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900 drop-shadow-md tracking-tight">Chirp</h1>
            <p className="text-sm font-bold text-gray-800 tracking-widest uppercase mt-1">Local Discovery</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input 
                type="text" 
                placeholder="Pick a magic handle... (e.g. password123)" 
                value={tempUsername}
                onChange={e => setTempUsername(e.target.value)}
                className="w-full px-4 py-4 rounded-xl glass-input"
                required
              />
              <p className="text-xs text-gray-700 mt-3 text-left font-medium">For the demo, use <strong>password123</strong> (Syncs across devices!)</p>
            </div>
            <button 
              type="submit" 
              className="w-full glass-button text-gray-900 font-bold py-4 rounded-xl text-lg"
            >
              Start Exploring
            </button>
          </form>
        </div>
      </div>
    );
  }

  const renderSpotCard = (spot: typeof SPOTS[0]) => {
    const isSaved = savedSpots.includes(spot.id);
    return (
      <div 
        key={spot.id} 
        className="glass-panel p-5 mb-4 rounded-[2rem] cursor-pointer hover:bg-white/10 transition-colors"
        onMouseEnter={() => isAudioPlaying && setVibeType(spot.type)}
        onClick={() => isAudioPlaying && setVibeType(spot.type)}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-bold text-xl text-gray-900 drop-shadow-sm leading-tight">{spot.name}</h3>
            <div className="flex items-center flex-wrap gap-2 mt-2">
              <span className="text-xs px-3 py-1 bg-white/40 text-gray-800 rounded-full font-bold backdrop-blur-sm border border-white/40">{spot.type}</span>
              {chirpCounts[spot.id] && (
                <span className="text-xs font-bold text-orange-500 animate-pulse flex items-center bg-orange-100/50 px-2 py-1 rounded-full border border-orange-200 shadow-sm">
                   🔥 {chirpCounts[spot.id]} nearby
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700 font-semibold flex items-center mt-3">
              <MapPin className="w-3 h-3 mr-1" /> {spot.distance} away
            </p>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); toggleSave(spot.id); }}
            className={`p-2 shrink-0 rounded-full flex items-center justify-center transition-all shadow-sm ${isSaved ? 'glass-button active' : 'glass-button'}`}
          >
            <Heart className={`w-5 h-5 ${isSaved ? 'fill-rose-500 text-rose-500' : 'text-gray-800'}`} />
          </button>
        </div>
        <p className="text-gray-800 text-sm mb-4 font-medium">{spot.description}</p>
        <div className="flex space-x-3">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowQrSpot(spot.id); }}
            className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors glass-button flex justify-center items-center text-sm font-bold text-gray-800 shadow-sm"
          >
            <QrCode className="w-4 h-4 mr-2 text-gray-800" /> QR
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); transmitChirp(spot.id); }}
            className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors glass-button flex justify-center items-center text-sm font-bold text-gray-800 shadow-sm"
          >
            <Volume2 className="w-4 h-4 mr-2 text-gray-800" /> Chirp
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="bg-vibrant">
        <div className="bg-shape shape1"></div>
        <div className="bg-shape shape2"></div>
        <div className="bg-shape shape3"></div>
        <div className="bg-shape shape4"></div>
      </div>
      <div className="min-h-screen pb-24 max-w-md mx-auto relative overflow-hidden flex flex-col pt-4 px-4 z-10">
        
        {/* Header */}
        <header className="glass-panel px-5 py-4 rounded-[2rem] mb-6 flex justify-between items-center sticky top-4 shadow-sm z-20">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 drop-shadow-sm">
              Chirp
            </h1>
            <p className="text-sm text-gray-700 font-bold">Hey, {username}! 👋</p>
          </div>
          <div className="flex items-center space-x-3">
            {isOffline && (
              <div className="flex items-center text-xs font-bold text-white bg-red-500/80 px-3 py-1.5 rounded-full shadow-lg">
                <WifiOff className="w-3 h-3 mr-1" /> Offline
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="p-4 pb-28 flex-1 overflow-y-auto">
          {activeTab === 'discover' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-bold text-gray-900 drop-shadow-sm mb-4 flex items-center justify-between">
                <span className="flex items-center"><Compass className="w-5 h-5 mr-2 text-gray-800" /> Happening Now</span>
                
                <div className="flex space-x-2">
                 <button 
                   onClick={() => setShowARView(true)}
                   className="px-3 py-1.5 rounded-full glass-button transition-all flex items-center text-xs font-bold text-gray-800"
                   title="AR Magic Window"
                 >
                   <Camera className="w-4 h-4 mr-1 text-gray-800" /> AR View
                 </button>
                 <button 
                   onClick={() => setIsAudioPlaying(!isAudioPlaying)}
                   className={`px-3 py-1.5 rounded-full glass-button transition-all flex items-center text-xs font-bold ${isAudioPlaying ? 'bg-purple-500/80 shadow-[0_0_15px_rgba(168,85,247,0.5)] animate-pulse text-white' : 'text-gray-800'}`}
                   title="Generative Soundscapes"
                 >
                   <Music className="w-4 h-4 mr-1" /> Ambient
                 </button>
               </div>
            </h2>
            
            {SPOTS.map(renderSpotCard)}
          </div>
        )}

          {activeTab === 'map' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-[calc(100vh-200px)]">
              <div className="glass-panel p-2 rounded-[2rem] shadow-sm flex-1 overflow-hidden">
                <VibesMap spots={SPOTS} />
              </div>
            </div>
          )}

          {activeTab === 'friends' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-bold text-gray-900 drop-shadow-sm mb-4 flex justify-between items-center">
                <span className="flex items-center"><Users className="w-5 h-5 mr-2 text-gray-800" /> Friends' Activity</span>
                           <div className="flex space-x-2">
                  <button 
                    onClick={() => setIsScanningQr(true)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center glass-button transition-colors text-gray-800`}
                    title="Scan QR Code"
                  >
                    <QrCode className="w-4 h-4 mr-1" /> Scan
                  </button>
                  {/* Audio Modem Scanner */}
                  <button 
                    onClick={isListening ? stopListening : startListening}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center glass-button transition-colors ${isListening ? 'bg-red-500/80 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'text-gray-800'}`}
                  >
                    <Ear className="w-4 h-4 mr-1" /> {isListening ? 'Listening...' : 'Listen'}
                  </button>
                  {/* BT Mesh Scanner */}
                  <button 
                    onClick={scanForFriends}
                    disabled={isScanning}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center glass-button transition-colors ${isScanning ? 'bg-blue-500/80 text-white animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'text-gray-800'}`}
                  >
                    <Radio className="w-4 h-4 mr-1" /> BT Scan
                  </button>
                </div>
              </h2>

              {isListening && (
                <div className="flex flex-col items-center justify-center py-2 animate-in fade-in">
                  <span className="text-[10px] text-gray-500 mb-1 tracking-wider uppercase font-bold">Mic Input Level</span>
                  <div className="w-full h-1.5 bg-gray-200/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-400 to-emerald-600 transition-all duration-75" 
                      style={{ width: `${(debugVolume / 255) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Offline Cache Warning */}
              {isOffline && (
                <div className="glass-panel bg-amber-500/20 border border-amber-300/50 rounded-xl p-3 mb-4 text-gray-900 text-sm">
                  <p className="flex items-center font-bold"><WifiOff className="w-4 h-4 mr-2"/> You're offline!</p>
                  <p className="text-xs mt-1 text-gray-800 font-semibold">Showing last cached activity. Use Bluetooth/Audio scanning to find peers.</p>
                </div>
              )}
              
              {/* BT Error/Found Info */}
              {btError && <p className="text-xs text-red-600 mb-2 font-bold">{btError}</p>}
              {foundDevices.length > 0 && (
                <div className="mb-4 text-xs text-gray-900 bg-blue-400/30 p-2 rounded-lg font-semibold">
                  <strong>Nearby BT peers:</strong> {foundDevices.join(', ')}
                </div>
              )}

              <div className="space-y-4">
                {liveFeed.map((feed: any) => {
                  const spot = SPOTS.find(s => s.id === feed.spotId);
                  if (!spot) return null;
                  return (
                    <div key={feed.id} className="glass-panel p-4 rounded-[1.5rem] flex space-x-4 items-center">
                      <div className="w-12 h-12 rounded-full bg-white/40 flex items-center justify-center text-gray-900 font-bold text-lg shadow-sm border border-white/40">
                        {feed.friendName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm text-gray-800 font-medium">
                          <span className="font-extrabold text-gray-900">{feed.friendName}</span> {feed.action} <span className="font-bold text-pink-600 drop-shadow-sm">{spot.name}</span>
                        </p>
                        <p className="text-xs text-gray-600 mt-1 font-semibold">{feed.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'saved' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-bold text-gray-900 drop-shadow-sm mb-4 flex items-center">
                <Bookmark className="w-5 h-5 mr-2 text-gray-800" /> Your Saved Spots
              </h2>
              
              {savedSpots.length === 0 ? (
                <div className="text-center p-8 glass-panel rounded-[2rem]">
                  <Heart className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-bold">You haven't saved any spots yet.</p>
                </div>
              ) : (
                SPOTS.filter(spot => savedSpots.includes(spot.id)).map(renderSpotCard)
              )}
            </div>
          )}
        </main>

        {/* Floating Glass Nav Pill */}
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm glass-nav rounded-[2rem] flex justify-around p-2 shadow-2xl z-30">
          <button 
            onClick={() => setActiveTab('discover')}
            className={`flex flex-col items-center p-3 rounded-[1.5rem] transition-all w-16 ${activeTab === 'discover' ? 'glass-button active text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <Compass className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setActiveTab('map')}
            className={`flex flex-col items-center p-3 rounded-[1.5rem] transition-all w-16 ${activeTab === 'map' ? 'glass-button active text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <Map className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setActiveTab('friends')}
            className={`flex flex-col items-center p-3 rounded-[1.5rem] transition-all w-16 relative ${activeTab === 'friends' ? 'glass-button active text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <Users className="w-6 h-6" />
            {!isOffline && <span className="absolute top-2 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse"></span>}
          </button>
          <button 
            onClick={() => setActiveTab('saved')}
            className={`flex flex-col items-center p-3 rounded-[1.5rem] transition-all w-16 ${activeTab === 'saved' ? 'glass-button active text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <Bookmark className="w-6 h-6" />
          </button>
        </nav>

        {/* QR Modals */}
        {showQrSpot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowQrSpot(null)}>
            <div className="bg-white p-6 rounded-3xl shadow-2xl relative" onClick={e => e.stopPropagation()}>
               <button onClick={() => setShowQrSpot(null)} className="absolute top-2 right-2 text-gray-500">
                 <X className="w-5 h-5"/>
               </button>
               <h3 className="text-gray-800 font-bold mb-4 text-center">Scan to Save Spot</h3>
               <QRCode value={JSON.stringify({ type: 'chirp', spotId: showQrSpot })} size={200} />
            </div>
          </div>
        )}

        {isScanningQr && (
          <QRScanner onScan={handleScanQr} onClose={() => setIsScanningQr(false)} />
        )}

        {showARView && (
          <ARView spots={SPOTS} onClose={() => setShowARView(false)} />
        )}
      </div>
    </>
  );
}
