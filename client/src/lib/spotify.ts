// Spotify API Service
const SPOTIFY_TOKEN = 'BQD7J8vt-kOiK6g7ldAyTEU7XmIEVDfKozz4hsidEwTnkJ7WNGRX1dPyHvFp_rNl9Lfr23Ijmzwoi2ik1VpL6YBk-xQR65K-9xw1NCEHeD0uo8K5rCRGjyBjFVyYuPkCUZo15-hDEQDaRJlMN0CYn-FSpY5ClqHWOP0jZwu2Q5xfAvKj2RuczSa6Y4oek4nWoyFHfWGK26SxUVFbw-w8NaPpTsBRfJgTvu98iL4jAFmuh6o1otfNvN0fg0i9PlZ8TaS5llQWTdfZrxljXWrP7RSTznOwGA50HK_RsiWkMuf8aIQJqHtAQaQZ4jbLCg2s';

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

async function fetchWebApi(endpoint: string, method: string = 'GET', body?: any) {
  const res = await fetch(`https://api.spotify.com/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${SPOTIFY_TOKEN}`,
      'Content-Type': 'application/json',
    },
    method,
    body: body ? JSON.stringify(body) : undefined
  });
  
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
    return [];
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
    return [];
  }
}

export async function getCurrentUser() {
  try {
    return await fetchWebApi('v1/me', 'GET');
  } catch (error) {
    console.error('Error fetching user info:', error);
    return null;
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
    return [];
  }
}

export function formatTrackName(track: SpotifyTrack): string {
  return `${track.name} by ${track.artists.map(artist => artist.name).join(', ')}`;
}

export function getTrackImage(track: SpotifyTrack): string {
  return track.album.images[0]?.url || '/api/placeholder/300/300';
}








