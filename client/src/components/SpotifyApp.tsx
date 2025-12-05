'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Music, 
  Play, 
  Pause,
  ExternalLink, 
  Loader2,
  User,
  Clock,
  Home,
  Library,
  Disc,
  Volume2,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Mic2,
  ListMusic,
  Heart,
  EllipsisVertical
} from 'lucide-react';
import { 
  getTopTracks, 
  getTopArtists, 
  getCurrentUser, 
  getRecentlyPlayed,
  createPlaylist,
  getTrackImage,
  SpotifyTrack,
  SpotifyPlaylist
} from '../lib/spotify';

export default function SpotifyApp() {
  const [topTracks, setTopTracks] = useState<SpotifyTrack[]>([]);
  const [topArtists, setTopArtists] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [recentlyPlayed, setRecentlyPlayed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'artists' | 'recent' | 'library'>('home');
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadSpotifyData();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const loadSpotifyData = async () => {
    try {
      setLoading(true);
      const [tracks, artists, userData, recent] = await Promise.all([
        getTopTracks(20),
        getTopArtists(12),
        getCurrentUser(),
        getRecentlyPlayed(20)
      ]);

      setTopTracks(tracks);
      setTopArtists(artists);
      setUser(userData);
      setRecentlyPlayed(recent);
      
      // Set initial track
      if (tracks.length > 0) {
        setCurrentTrack(tracks[0]);
      }
    } catch (error) {
      console.error('Error loading Spotify data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (track: SpotifyTrack) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play().catch(console.error);
        setIsPlaying(true);
      }
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.src = track.preview_url || '';
        if (track.preview_url) {
            audioRef.current.play().catch(console.error);
        } else {
            setIsPlaying(false); // No preview available
        }
      } else {
        const audio = new Audio(track.preview_url || '');
        audioRef.current = audio;
        if (track.preview_url) audio.play().catch(console.error);
      }
    }
  };

  // Helper to format duration (mock data since API might not return it in simple call, or calculate random)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col justify-center items-center bg-black text-white">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 360] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
            <div className="w-20 h-20 bg-[#1DB954] rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(29,185,84,0.5)]">
                <Music className="w-10 h-10 text-black" />
            </div>
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">Loading Library...</h2>
        <p className="text-gray-400">Connecting to Spotify</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="pb-24">
            {/* Hero Section */}
            <div className="bg-gradient-to-b from-indigo-900/80 to-black/0 p-8 mb-6">
              <div className="flex items-end gap-6">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-52 h-52 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-xl overflow-hidden"
                >
                    {currentTrack && (
                        <img src={getTrackImage(currentTrack)} alt="Hero" className="w-full h-full object-cover" />
                    )}
                </motion.div>
                <div className="flex-1">
                  <p className="text-sm font-bold uppercase text-white/80 mb-2">Top Track</p>
                  <h1 className="text-5xl md:text-7xl font-black text-white mb-6 line-clamp-2 leading-tight">
                    {currentTrack?.name}
                  </h1>
                  <div className="flex items-center gap-2 text-sm text-gray-300 font-medium">
                    {user?.images?.[0]?.url && (
                        <img src={user.images[0].url} alt={user.display_name} className="w-6 h-6 rounded-full" />
                    )}
                    <span className="hover:underline cursor-pointer">{user?.display_name || 'Tejas'}</span>
                    <span>•</span>
                    <span>{topTracks.length} songs</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tracks List */}
            <div className="px-8">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => currentTrack && handlePlay(currentTrack)}
                            className="w-14 h-14 bg-[#1DB954] rounded-full flex items-center justify-center hover:scale-105 hover:bg-[#1ed760] transition-all shadow-lg"
                        >
                            {isPlaying ? <Pause className="w-6 h-6 text-black fill-black" /> : <Play className="w-6 h-6 text-black fill-black pl-1" />}
                        </button>
                        <button className="text-gray-400 hover:text-white transition-colors"><Heart className="w-8 h-8" /></button>
                        <button className="text-gray-400 hover:text-white transition-colors"><EllipsisVertical className="w-6 h-6" /></button>
                    </div>
                </div>

                <div className="bg-black/20 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-4 py-2 text-gray-400 text-sm border-b border-white/10 sticky top-0 bg-[#121212] z-10">
                        <div className="w-8 text-center">#</div>
                        <div>Title</div>
                        <div className="hidden md:block">Album</div>
                        <div className="w-12 text-right"><Clock className="w-4 h-4 ml-auto" /></div>
                    </div>
                    {topTracks.map((track, index) => (
                        <motion.div
                            key={track.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            onClick={() => handlePlay(track)}
                            className={`group grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-4 py-3 items-center hover:bg-white/10 rounded-md transition-colors cursor-pointer ${currentTrack?.id === track.id ? 'bg-white/10' : ''}`}
                        >
                            <div className="w-8 text-center text-gray-400 font-medium group-hover:hidden">
                                {currentTrack?.id === track.id && isPlaying ? (
                                    <div className="flex justify-center gap-[2px] h-3 items-end">
                                        <div className="w-[3px] bg-[#1DB954] animate-[bounce_1s_infinite]" />
                                        <div className="w-[3px] bg-[#1DB954] animate-[bounce_1.2s_infinite]" />
                                        <div className="w-[3px] bg-[#1DB954] animate-[bounce_0.8s_infinite]" />
                                    </div>
                                ) : (
                                    index + 1
                                )}
                            </div>
                            <div className="w-8 text-center hidden group-hover:block">
                                {currentTrack?.id === track.id && isPlaying ? <Pause className="w-4 h-4 mx-auto text-white" /> : <Play className="w-4 h-4 mx-auto text-white" />}
                            </div>
                            
                            <div className="flex items-center gap-4 overflow-hidden">
                                <img src={getTrackImage(track)} alt={track.name} className="w-10 h-10 rounded object-cover shadow-sm" />
                                <div className="flex flex-col truncate">
                                    <span className={`truncate font-medium ${currentTrack?.id === track.id ? 'text-[#1DB954]' : 'text-white'}`}>
                                        {track.name}
                                    </span>
                                    <span className="text-sm text-gray-400 truncate group-hover:text-white transition-colors">
                                        {track.artists.map(a => a.name).join(', ')}
                                    </span>
                                </div>
                            </div>
                            <div className="hidden md:block text-gray-400 text-sm truncate hover:text-white transition-colors">
                                {track.album.name}
                            </div>
                            <div className="w-12 text-right text-sm text-gray-400">
                                {/* Mock duration as it's not in the basic interface */}
                                {formatTime(180 + (index * 13) % 120)} 
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
          </div>
        );
      case 'artists':
        return (
          <div className="p-8 pb-24">
            <h2 className="text-3xl font-bold text-white mb-6">Top Artists</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {topArtists.map((artist, index) => (
                <motion.div
                  key={artist.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-all duration-300 group cursor-pointer"
                >
                  <div className="relative w-full aspect-square mb-4 shadow-lg rounded-full overflow-hidden">
                    <img
                      src={artist.images[0]?.url || '/api/placeholder/200/200'}
                      alt={artist.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute bottom-2 right-2 w-10 h-10 bg-[#1DB954] rounded-full flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all shadow-lg">
                        <Play className="w-5 h-5 text-black fill-black pl-1" />
                    </div>
                  </div>
                  <h3 className="text-white font-bold truncate mb-1">{artist.name}</h3>
                  <p className="text-[#B3B3B3] text-sm">Artist</p>
                </motion.div>
              ))}
            </div>
          </div>
        );
      case 'recent':
        return (
          <div className="p-8 pb-24">
            <h2 className="text-3xl font-bold text-white mb-6">Recently Played</h2>
            <div className="bg-black/20 rounded-lg overflow-hidden">
                {recentlyPlayed.map((item, index) => (
                    <motion.div
                        key={`${item.track.id}-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => handlePlay(item.track)}
                        className="flex items-center gap-4 px-4 py-3 hover:bg-white/10 transition-colors cursor-pointer group"
                    >
                        <div className="w-10 h-10 bg-gray-800 rounded overflow-hidden relative">
                             <img src={getTrackImage(item.track)} alt={item.track.name} className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play className="w-4 h-4 text-white fill-white" />
                             </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className={`font-medium truncate ${currentTrack?.id === item.track.id ? 'text-[#1DB954]' : 'text-white'}`}>{item.track.name}</h4>
                            <p className="text-sm text-gray-400 truncate group-hover:text-white transition-colors">
                                {item.track.artists.map((a: any) => a.name).join(', ')}
                            </p>
                        </div>
                        <div className="text-xs text-gray-500">
                            {new Date(item.played_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    </motion.div>
                ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };


  return (
    <div className="w-full h-full flex bg-black font-sans text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-black flex flex-col gap-2 p-2 border-r border-white/5 shrink-0">
        <div className="bg-[#121212] rounded-lg p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2 px-2 text-white font-bold cursor-pointer hover:text-white transition-colors">
                <Home className="w-6 h-6" />
                <span onClick={() => setActiveTab('home')}>Home</span>
            </div>
            <div className="flex items-center gap-2 px-2 text-gray-400 font-bold cursor-pointer hover:text-white transition-colors">
                <Search className="w-6 h-6" />
                <span>Search</span>
            </div>
        </div>
        
        <div className="bg-[#121212] rounded-lg p-4 flex-1 flex flex-col gap-4 overflow-hidden">
            <div className="flex items-center justify-between px-2 text-gray-400 font-bold hover:text-white transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                    <Library className="w-6 h-6" />
                    <span>Your Library</span>
                </div>
                <button className="hover:bg-white/10 p-1 rounded-full"><ExternalLink className="w-4 h-4" /></button>
            </div>
            
            {/* Tabs / Filters */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                <button onClick={() => setActiveTab('artists')} className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'artists' ? 'bg-white text-black' : 'bg-[#232323] text-white hover:bg-[#333]'}`}>Artists</button>
                <button onClick={() => setActiveTab('recent')} className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'recent' ? 'bg-white text-black' : 'bg-[#232323] text-white hover:bg-[#333]'}`}>Recent</button>
            </div>

            {/* Playlist List */}
            <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-700">
                <div onClick={() => setActiveTab('home')} className={`flex items-center gap-3 p-2 rounded-md cursor-pointer ${activeTab === 'home' ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-700 to-blue-900 rounded flex items-center justify-center">
                        <Heart className="w-6 h-6 text-white fill-white" />
                    </div>
                    <div>
                        <p className={`font-medium truncate ${activeTab === 'home' ? 'text-[#1DB954]' : 'text-white'}`}>Liked Songs</p>
                        <p className="text-sm text-gray-400">Playlist • {topTracks.length} songs</p>
                    </div>
                </div>
                
                {/* Mock Playlists */}
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-white/5">
                        <div className="w-12 h-12 bg-[#282828] rounded flex items-center justify-center">
                            <Music className="w-6 h-6 text-gray-400" />
                        </div>
                        <div>
                            <p className="font-medium truncate text-white">My Playlist #{i}</p>
                            <p className="text-sm text-gray-400">Playlist • Tejas</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-[#121212] relative overflow-hidden rounded-lg my-2 mr-2">
        {/* Header / Top Bar */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-black/0 z-20 flex items-center justify-between px-6 transition-colors hover:bg-black/20">
            <div className="flex gap-2">
                <button className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:scale-105"><ChevronLeft className="w-5 h-5" /></button>
                <button className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:scale-105"><ChevronRight className="w-5 h-5" /></button>
            </div>
            <div className="flex items-center gap-4">
                <button className="px-4 py-1.5 bg-white text-black font-bold rounded-full text-sm hover:scale-105 transition-transform">Explore Premium</button>
                <div className="w-8 h-8 bg-[#282828] rounded-full p-0.5 border border-black cursor-pointer hover:scale-105 transition-transform" title={user?.display_name}>
                    {user?.images?.[0]?.url ? (
                        <img src={user.images[0].url} alt="User" className="w-full h-full rounded-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-[#535353] rounded-full flex items-center justify-center"><User className="w-4 h-4" /></div>
                    )}
                </div>
            </div>
        </div>

        {/* Scrollable View */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#535353] scrollbar-track-transparent">
            {renderContent()}
        </div>
      </div>

      {/* Player Bar (Fixed Bottom) */}
      <div className="h-[90px] w-full bg-[#181818] border-t border-[#282828] flex items-center justify-between px-4 absolute bottom-0 left-0 z-50">
        {/* Current Track Info */}
        <div className="flex items-center gap-4 w-[30%]">
            {currentTrack && (
                <>
                    <div className="w-14 h-14 bg-[#282828] rounded overflow-hidden relative group cursor-pointer">
                        <img src={getTrackImage(currentTrack)} alt={currentTrack.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center">
                            <button className="text-white"><ExternalLink className="w-6 h-6" /></button>
                        </div>
                    </div>
                    <div className="min-w-0">
                        <div className="text-sm font-medium text-white truncate hover:underline cursor-pointer">{currentTrack.name}</div>
                        <div className="text-xs text-gray-400 truncate hover:underline cursor-pointer hover:text-white">{currentTrack.artists.map(a => a.name).join(', ')}</div>
                    </div>
                    <button className="text-[#1DB954] ml-2"><Heart className="w-4 h-4 fill-current" /></button>
                </>
            )}
        </div>

        {/* Player Controls */}
        <div className="flex flex-col items-center w-[40%] max-w-[722px]">
            <div className="flex items-center gap-6 mb-2">
                <button className="text-gray-400 hover:text-white transition-colors"><Shuffle className="w-4 h-4" /></button>
                <button className="text-gray-400 hover:text-white transition-colors"><SkipBack className="w-5 h-5 fill-current" /></button>
                <button 
                    onClick={() => currentTrack && handlePlay(currentTrack)}
                    className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                >
                    {isPlaying ? <Pause className="w-4 h-4 text-black fill-black" /> : <Play className="w-4 h-4 text-black fill-black pl-0.5" />}
                </button>
                <button className="text-gray-400 hover:text-white transition-colors"><SkipForward className="w-5 h-5 fill-current" /></button>
                <button className="text-gray-400 hover:text-white transition-colors"><Repeat className="w-4 h-4" /></button>
            </div>
            <div className="w-full flex items-center gap-2 text-xs text-gray-400 font-mono">
                <span>0:00</span>
                <div className="flex-1 h-1 bg-[#4D4D4D] rounded-full overflow-hidden group cursor-pointer">
                    <div className="h-full bg-white w-1/3 group-hover:bg-[#1DB954] relative">
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100" />
                    </div>
                </div>
                <span>3:00</span>
            </div>
        </div>

        {/* Volume / Extra */}
        <div className="w-[30%] flex items-center justify-end gap-3">
            <button className="text-gray-400 hover:text-white"><Mic2 className="w-4 h-4" /></button>
            <button className="text-gray-400 hover:text-white"><ListMusic className="w-4 h-4" /></button>
            <button className="text-gray-400 hover:text-white"><Disc className="w-4 h-4" /></button>
            <div className="flex items-center gap-2 w-32 group">
                <Volume2 className="w-5 h-5 text-gray-400 group-hover:text-white" />
                <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={volume} 
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full h-1 bg-[#4D4D4D] rounded-lg appearance-none cursor-pointer accent-[#1DB954] hover:accent-[#1ed760]" 
                />
            </div>
        </div>
      </div>

      {/* Search Icon fix */}
      <div className="hidden">
        <User /> <Clock /> {/* To ensure imports are used if needed elsewhere but I used User/Clock */}
      </div>
    </div>
  );
}

function ChevronLeft({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m15 18-6-6 6-6"/></svg>;
}

function ChevronRight({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m9 18 6-6-6-6"/></svg>;
}

function Search({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
}
