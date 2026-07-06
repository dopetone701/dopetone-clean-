// api.js - Cloudflare D1 + R2 ONLY
const API_URL = 'https://dope-tone-api.dopetone701.workers.dev';
const R2_PUBLIC = 'https://pub-60c4e7268904a31a890e52771845a014.r2.dev';

// ===== EXISTING: GET BEATS =====
export async function getBeats() {
  try {
    const res = await fetch(`${API_URL}/beats`);
    if (!res.ok) throw new Error('Failed to fetch beats');
   
    const beats = await res.json();
   
    return beats.map(b => ({
      id: b.id,
      title: b.title,
      genre: b.genre || 'Trap',
      bpm: b.bpm || 140,
      key: b.key || 'C Minor',
      mood: b.mood || null,
      type: b.type || null,
      price: (b.price || 2999) / 100,
      audio: b.mp3_url,
      mp3_url: b.mp3_url,
      cover: b.cover_url,
      cover_url: b.cover_url,
      zip_url: b.zip_url,
      project_file: b.zip_url,
      sample: b.mp3_url,
      play_count: b.play_count || 0,
      download_count: b.download_count || 0,
      like_count: b.like_count || 0,
      is_free: b.is_free || false,
      created_at: b.created_at
    }));
  } catch (err) {
    console.error('getBeats error:', err);
    return [];
  }
}

// ===== EXISTING: UPLOAD BEAT =====
export async function uploadBeat({ title, genre, bpm, price, audioFile, coverFile, projectFile }) {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('genre', genre);
  formData.append('bpm', bpm);
  formData.append('key', 'C Minor');
  formData.append('price', price * 100);
  formData.append('audio', audioFile);
  if (coverFile) formData.append('cover', coverFile);
  if (projectFile) formData.append('project', projectFile);

  const res = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    body: formData
  });
 
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

// ===== CONTROL CENTER ENDPOINTS =====

// Get overview stats for top 4 cards
export async function getStatsOverview() {
  try {
    const res = await fetch(`${API_URL}/api/stats/overview`);
    if (!res.ok) throw new Error('Failed to fetch overview');
    return await res.json();
  } catch (err) {
    console.error('getStatsOverview error:', err);
    return { totalStreams: 0, activeListeners: 0, revenueToday: 0, newFollowers: 0, totalEmails: 0 };
  }
}

// Get sparkline data for 4 mini graphs
export async function getStatsSparks() {
  try {
    const res = await fetch(`${API_URL}/api/stats/sparks`);
    if (!res.ok) throw new Error('Failed to fetch sparks');
    return await res.json();
  } catch (err) {
    console.error('getStatsSparks error:', err);
    return { streams: [], listeners: [], revenue: [], followers: [] };
  }
}

// Get song performance for main chart
export async function getSongPerformance(songId, range = '30d') {
  try {
    const res = await fetch(`${API_URL}/api/song/${songId}/performance?range=${range}`);
    if (!res.ok) throw new Error('Failed to fetch song performance');
    return await res.json();
  } catch (err) {
    console.error('getSongPerformance error:', err);
    return Array(30).fill(0);
  }
}

// Export emails CSV
export async function exportEmails() {
  window.location.href = `${API_URL}/api/emails/export`;
}

// ===== NEW: PLAYER TRACKING ENDPOINTS - LINKS TO CONTROL CENTER =====

// 1. Track beat play - fires on every play from anywhere
export async function trackBeatPlay(beatId) {
  try {
    const res = await fetch(`${API_URL}/api/stats/play`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ 
        beat_id: beatId, 
        user_id: window.Auth?.user?.id || 'anonymous',
        timestamp: Date.now()
      })
    });
    return await res.json();
  } catch (err) {
    console.error('trackBeatPlay error:', err);
    return null;
  }
}

// 2. Track beat like/unlike - fires when heart clicked in player
export async function trackBeatLike(beatId, isLiked) {
  try {
    const res = await fetch(`${API_URL}/api/stats/like`, {
      method: 'POST', 
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ 
        beat_id: beatId, 
        liked: isLiked, 
        user_id: window.Auth?.user?.id || 'anonymous',
        timestamp: Date.now()
      })
    });
    return await res.json();
  } catch (err) {
    console.error('trackBeatLike error:', err);
    return null;
  }
}

// 3. Track beat download - fires when download button hit in player
export async function trackBeatDownload(beatId) {
  try {
    const res = await fetch(`${API_URL}/api/stats/download`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'}, 
      body: JSON.stringify({ 
        beat_id: beatId, 
        user_id: window.Auth?.user?.id || 'anonymous',
        timestamp: Date.now()
      })
    });
    return await res.json();
  } catch (err) {
    console.error('trackBeatDownload error:', err);
    return null;
  }
}
