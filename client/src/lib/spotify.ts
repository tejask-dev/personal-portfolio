// Spotify API Service with OAuth PKCE Flow
const CLIENT_ID = '6b0b9a8520304597bd6b975a7839fdc9';
const REDIRECT_URI = typeof window !== 'undefined' 
  ? window.location.origin 
  : 'https://tejass-kaushik.vercel.app';
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-top-read',
  'user-read-recently-played',
  'playlist-modify-public',
  'playlist-modify-private'
].join(' ');

// Token storage keys
const TOKEN_KEY = 'spotify_access_token';
const TOKEN_EXPIRY_KEY = 'spotify_token_expiry';
const VERIFIER_KEY = 'spotify_code_verifier';

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string; width: number; height: number }>;
  };
  external_urls: {
    spotify: string;
  };
  preview_url: string | null;
  duration_ms?: number;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  external_urls: {
    spotify: string;
  };
  images: Array<{ url: string; width: number; height: number }>;
}

export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: Array<{ url: string; width: number; height: number }>;
  external_urls: { spotify: string };
  followers: { total: number };
  country: string;
}

// ============ PKCE Auth Helpers ============

function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

function base64encode(input: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const hashed = await sha256(codeVerifier);
  return base64encode(hashed);
}

// ============ Auth State Management ============

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  
  if (token && expiry) {
    const expiryTime = parseInt(expiry, 10);
    if (Date.now() < expiryTime) {
      return token;
    }
    // Token expired, clear it
    clearToken();
  }
  return null;
}

function storeToken(token: string, expiresIn: number): void {
  const expiryTime = Date.now() + (expiresIn * 1000);
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem(VERIFIER_KEY);
}

export function isAuthenticated(): boolean {
  return getStoredToken() !== null;
}

// ============ OAuth Flow ============

export async function redirectToSpotifyAuth(): Promise<void> {
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  localStorage.setItem(VERIFIER_KEY, codeVerifier);
  
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  });
  
  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function handleAuthCallback(): Promise<boolean> {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const error = urlParams.get('error');
  
  if (error) {
    console.error('Spotify auth error:', error);
    return false;
  }
  
  if (!code) {
    return false;
  }
  
  const codeVerifier = localStorage.getItem(VERIFIER_KEY);
  if (!codeVerifier) {
    console.error('No code verifier found');
    return false;
  }
  
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });
    
    const data = await response.json();
    
    if (data.access_token) {
      storeToken(data.access_token, data.expires_in);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return true;
    }
    
    console.error('Token exchange failed:', data);
    return false;
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    return false;
  }
}

// ============ API Calls ============

async function fetchWebApi(endpoint: string, method: string = 'GET', body?: any) {
  const token = getStoredToken();
  
  if (!token) {
    throw new Error('No valid token available');
  }
  
  const res = await fetch(`https://api.spotify.com/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    method,
    body: body ? JSON.stringify(body) : undefined
  });
  
  if (res.status === 401) {
    // Token expired or invalid
    clearToken();
    throw new Error('Token expired');
  }
  
  if (!res.ok) {
    throw new Error(`Spotify API error: ${res.status} ${res.statusText}`);
  }
  
  return await res.json();
}

export async function getTopTracks(limit: number = 5): Promise<SpotifyTrack[]> {
  try {
    const response = await fetchWebApi(
      `v1/me/top/tracks?time_range=long_term&limit=${limit}`, 
      'GET'
    );
    return response.items || [];
  } catch (error) {
    console.error('Error fetching top tracks:', error);
    return getMockTracks();
  }
}

export async function getTopArtists(limit: number = 5) {
  try {
    const response = await fetchWebApi(
      `v1/me/top/artists?time_range=long_term&limit=${limit}`, 
      'GET'
    );
    return response.items || [];
  } catch (error) {
    console.error('Error fetching top artists:', error);
    return getMockArtists();
  }
}

export async function getCurrentUser(): Promise<SpotifyUser | null> {
  try {
    return await fetchWebApi('v1/me', 'GET');
  } catch (error) {
    console.error('Error fetching user info:', error);
    return getMockUser();
  }
}

export async function createPlaylist(tracksUri: string[]): Promise<SpotifyPlaylist | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const playlist = await fetchWebApi(
      `v1/users/${user.id}/playlists`, 
      'POST', 
      {
        "name": "Tejas's Portfolio Top Tracks",
        "description": "My top tracks displayed on my portfolio",
        "public": true
      }
    );

    if (tracksUri.length > 0) {
      await fetchWebApi(
        `v1/playlists/${playlist.id}/tracks?uris=${tracksUri.join(',')}`,
        'POST'
      );
    }

    return playlist;
  } catch (error) {
    console.error('Error creating playlist:', error);
    return null;
  }
}

export async function getRecentlyPlayed(limit: number = 10) {
  try {
    const response = await fetchWebApi(
      `v1/me/player/recently-played?limit=${limit}`, 
      'GET'
    );
    return response.items || [];
  } catch (error) {
    console.error('Error fetching recently played:', error);
    return getMockRecentlyPlayed();
  }
}

export function formatTrackName(track: SpotifyTrack): string {
  return `${track.name} by ${track.artists.map(artist => artist.name).join(', ')}`;
}

export function getTrackImage(track: SpotifyTrack): string {
  return track.album.images[0]?.url || '/api/placeholder/300/300';
}

// ============ Mock Data (Fallback) ============

function getMockUser(): SpotifyUser {
  return {
    id: 'tejas_kaushik',
    display_name: 'Tejas Kaushik',
    email: 'tejas.kaushik@outlook.com',
    images: [{ url: 'https://i.pravatar.cc/300', width: 300, height: 300 }],
    external_urls: { spotify: 'https://open.spotify.com' },
    followers: { total: 42 },
    country: 'CA'
  };
}

function getMockTracks(): SpotifyTrack[] {
  const mockTracks = [
    { name: "Blinding Lights", artist: "The Weeknd", album: "After Hours", image: "https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36" },
    { name: "Starboy", artist: "The Weeknd", album: "Starboy", image: "https://i.scdn.co/image/ab67616d0000b273a048415db06a5b6fa7ec4e1a" },
    { name: "Save Your Tears", artist: "The Weeknd", album: "After Hours", image: "https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36" },
    { name: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", image: "https://i.scdn.co/image/ab67616d0000b273bd26ede1ae69327010d49946" },
    { name: "Don't Start Now", artist: "Dua Lipa", album: "Future Nostalgia", image: "https://i.scdn.co/image/ab67616d0000b273bd26ede1ae69327010d49946" },
    { name: "Shape of You", artist: "Ed Sheeran", album: "÷", image: "https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96" },
    { name: "Perfect", artist: "Ed Sheeran", album: "÷", image: "https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96" },
    { name: "Watermelon Sugar", artist: "Harry Styles", album: "Fine Line", image: "https://i.scdn.co/image/ab67616d0000b27377fdcfda6535601aff081b6a" },
    { name: "As It Was", artist: "Harry Styles", album: "Harry's House", image: "https://i.scdn.co/image/ab67616d0000b2732e8ed79e177ff6011076f5f0" },
    { name: "Bad Guy", artist: "Billie Eilish", album: "When We All Fall Asleep", image: "https://i.scdn.co/image/ab67616d0000b27350a3147b4edd7701a876c6ce" },
    { name: "Lovely", artist: "Billie Eilish", album: "13 Reasons Why", image: "https://i.scdn.co/image/ab67616d0000b273f0b7e9e4a4a4a4a4a4a4a4a4" },
    { name: "Peaches", artist: "Justin Bieber", album: "Justice", image: "https://i.scdn.co/image/ab67616d0000b273e6f407c7f3a0ec98845e4431" },
  ];
  
  return mockTracks.map((track, index) => ({
    id: `mock-${index}`,
    name: track.name,
    artists: [{ name: track.artist }],
    album: {
      name: track.album,
      images: [{ url: track.image, width: 300, height: 300 }]
    },
    external_urls: { spotify: 'https://open.spotify.com' },
    preview_url: null,
    duration_ms: 180000 + (index * 15000)
  }));
}

function getMockArtists() {
  const artists = [
    { name: "The Weeknd", image: "https://i.scdn.co/image/ab6761610000e5eb214f3cf1cbe7139c1e26f5d7" },
    { name: "Dua Lipa", image: "https://i.scdn.co/image/ab6761610000e5eb0c68f6c95232e716f0abee8d" },
    { name: "Ed Sheeran", image: "https://i.scdn.co/image/ab6761610000e5eb3bcef85e105dfc42399ef0ba" },
    { name: "Harry Styles", image: "https://i.scdn.co/image/ab6761610000e5ebf7db7c8ede90a019c54590bb" },
    { name: "Billie Eilish", image: "https://i.scdn.co/image/ab6761610000e5ebd8b9980db67272cb4d2c3daf" },
    { name: "Justin Bieber", image: "https://i.scdn.co/image/ab6761610000e5eb8ae7f2aaa9817a704a87ea36" },
    { name: "Drake", image: "https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9" },
    { name: "Taylor Swift", image: "https://i.scdn.co/image/ab6761610000e5eb5a00969a4698c3132a15fbb0" },
  ];
  
  return artists.map((artist, index) => ({
    id: `mock-artist-${index}`,
    name: artist.name,
    images: [{ url: artist.image, width: 640, height: 640 }],
    genres: ['pop', 'dance'],
    followers: { total: 50000000 + index * 1000000 }
  }));
}

function getMockRecentlyPlayed() {
  const tracks = getMockTracks().slice(0, 10);
  return tracks.map((track, index) => ({
    track,
    played_at: new Date(Date.now() - index * 3600000).toISOString()
  }));
}
