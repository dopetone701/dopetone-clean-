// api.js - Cloudflare D1 + R2 ONLY + STATS D1 SYNC
const API_URL = 'https://api.dopetonevault.com';
const STATS_API = 'https://dopetone-stats.dopetone701.workers.dev';
const R2_PUBLIC = 'https://pub-60c4e7268904a31a890e52771845a014.r2.dev';

// ===== USER KEY HELPER - SAME AS CART/LIKES =====
function getD1UserKey() {
  if (!localStorage.getItem('dopetone_device_id')) {
    localStorage.setItem('dopetone_device_id', Math.random().toString(36).slice(2) + Date.now());
  }
  return window.Auth?.user?.id || localStorage.getItem('dopetone_user_id') || `anon_${localStorage.getItem('dopetone_device_id')}`;
}

// ===== EXISTING: GET BEATS - NOW MERGED WITH D1 REAL COUNTS =====
export async function getBeats() {
  try {
    const [beatsRes, statsRes] = await Promise.all([
      fetch(`${API_URL}/api/beats`),
      fetch(`${STATS_API}/api/stats/top`).catch(()=>({json:()=>[]}))
    ]);
    
    if (!beatsRes.ok) throw new Error('Failed to fetch beats');
    const beats = await beatsRes.json();
    
    // Try to get real counts from D1
    let statsMap = {};
    try {
      const topStats = await statsRes.json();
      if (Array.isArray(topStats)) {
        topStats.forEach(s => {
          statsMap[s.id] = s;
        });
      }
    } catch(e) {}

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
      // 🔥 D1 REAL COUNTS - if available use D1, else fallback to old
      play_count: statsMap[b.id]?.play_count || b.play_count || 0,
      download_count: statsMap[b.id]?.download_count || b.download_count || 0,
      like_count: statsMap[b.id]?.like_count || b.like_count || 0,
      cart_count: statsMap[b.id]?.cart_count || b.cart_count || 0,
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

  const res = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    body: formData
  });
 
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

// ===== CONTROL CENTER ENDPOINTS - NOW D1 =====
export async function getStatsOverview() {
  try {
    const res = await fetch(`${STATS_API}/api/stats/global?range=day`);
    if (!res.ok) throw new Error('Failed to fetch overview');
    const data = await res.json();
    return {
      totalStreams: data.totalPlays || 0,
      activeListeners: data.cartItems || 0,
      revenueToday: data.totalRevenue || 0,
      newFollowers: data.totalLikes || 0,
      totalEmails: data.totalDownloads || 0,
      totalPlays: data.totalPlays,
      totalLikes: data.totalLikes,
      totalDownloads: data.totalDownloads,
      cartItems: data.cartItems
    };
  } catch (err) {
    console.error('getStatsOverview error:', err);
    return { totalStreams: 0, activeListeners: 0, revenueToday: 0, newFollowers: 0, totalEmails: 0 };
  }
}

export async function getStatsSparks() {
  try {
    const res = await fetch(`${STATS_API}/api/stats/global?range=hour&tz=${new Date().getTimezoneOffset()*-1}`);
    if (!res.ok) throw new Error('Failed to fetch sparks');
    const data = await res.json();
    const h = data.history || [];
    return {
      streams: h.map(d => d.plays || 0),
      listeners: h.map(d => d.cart || 0),
      revenue: h.map(d => d.downloads || 0),
      followers: h.map(d => d.likes || 0),
      history: h
    };
  } catch (err) {
    console.error('getStatsSparks error:', err);
    return { streams: [], listeners: [], revenue: [], followers: [] };
  }
}

export async function getSongPerformance(songId, range = '30d') {
  try {
    // Map range to D1 ranges
    let d1Range = 'day';
    if (range === '7d') d1Range = 'day';
    if (range === '24h') d1Range = 'hour';
    if (range === '30d') d1Range = 'month';
    
    const res = await fetch(`${STATS_API}/api/stats/track/${songId}?range=${d1Range}&tz=${new Date().getTimezoneOffset()*-1}`);
    if (!res.ok) throw new Error('Failed to fetch song performance');
    const data = await res.json();
    return data.points || Array(30).fill(0);
  } catch (err) {
    console.error('getSongPerformance error:', err);
    return Array(30).fill(0);
  }
}

export async function exportEmails() {
  window.location.href = `${API_URL}/api/emails/export`;
}

// ===== NEW: PLAYER TRACKING ENDPOINTS - D1 DEDUPE SYSTEM =====

// 1. Track beat play - fires on every play from anywhere
export async function trackBeatPlay(beatId) {
  try {
    const res = await fetch(`${STATS_API}/api/stats/event`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        beat_id: parseInt(beatId),
        beatId: parseInt(beatId),
        event_type: 'play',
        eventType: 'play',
        user_id: getD1UserKey()
      })
    });
    return await res.json();
  } catch (err) {
    console.error('trackBeatPlay error:', err);
    return null;
  }
}

// 2. Track beat like/unlike - D1 ACTIVE_LIKES (1 user = 1 like)
export async function trackBeatLike(beatId, isLiked) {
  try {
    const userKey = getD1UserKey();
    if (isLiked) {
      const res = await fetch(`${STATS_API}/api/stats/event`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          beat_id: parseInt(beatId),
          beatId: parseInt(beatId),
          event_type: 'like',
          eventType: 'like',
          user_id: userKey
        })
      });
      return await res.json();
    } else {
      const res = await fetch(`${STATS_API}/api/stats/untrack`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          beat_id: parseInt(beatId),
          beatId: parseInt(beatId),
          event_type: 'like',
          eventType: 'like',
          user_id: userKey
        })
      });
      return await res.json();
    }
  } catch (err) {
    console.error('trackBeatLike error:', err);
    return null;
  }
}

// 3. Track beat download
export async function trackBeatDownload(beatId) {
  try {
    const res = await fetch(`${STATS_API}/api/stats/event`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        beat_id: parseInt(beatId),
        beatId: parseInt(beatId),
        event_type: 'download',
        eventType: 'download',
        user_id: getD1UserKey()
      })
    });
    return await res.json();
  } catch (err) {
    console.error('trackBeatDownload error:', err);
    return null;
  }
}

// 4. Track cart add - D1 ACTIVE_CARTS (1 user = 1 cart per beat)
export async function trackBeatCart(beatId) {
  try {
    const res = await fetch(`${STATS_API}/api/stats/event`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        beat_id: parseInt(beatId),
        beatId: parseInt(beatId),
        event_type: 'cart',
        eventType: 'cart',
        user_id: getD1UserKey()
      })
    });
    return await res.json();
  } catch (err) {
    console.error('trackBeatCart error:', err);
    return null;
  }
}

// 5. Untrack cart - remove
export async function untrackBeatCart(beatId) {
  try {
    const res = await fetch(`${STATS_API}/api/stats/untrack`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        beat_id: parseInt(beatId),
        beatId: parseInt(beatId),
        event_type: 'cart',
        eventType: 'cart',
        user_id: getD1UserKey()
      })
    });
    return await res.json();
  } catch (err) {
    console.error('untrackBeatCart error:', err);
    return null;
  }
}

// 6. Get abandoned carts for reminders
export async function getAbandonedCarts() {
  try {
    const res = await fetch(`${STATS_API}/api/stats/abandoned`);
    if (!res.ok) throw new Error('Failed');
    return await res.json();
  } catch (err) {
    console.error('getAbandonedCarts error:', err);
    return [];
  }
}

// 7. Get who liked
export async function getLikedUsers() {
  try {
    const res = await fetch(`${STATS_API}/api/stats/liked`);
    if (!res.ok) throw new Error('Failed');
    return await res.json();
  } catch (err) {
    console.error('getLikedUsers error:', err);
    return [];
  }
}
