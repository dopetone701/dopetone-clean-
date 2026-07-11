// api.js - FIXED PRICES 29.99 - FINAL
const API_URL = 'https://api.dopetonevault.com';
const STATS_API = 'https://dopetone-stats.dopetone701.workers.dev';
const PRICE_API = 'https://track-price-api.dopetone701.workers.dev';

function getD1UserKey() {
  if (!localStorage.getItem('dopetone_device_id')) {
    localStorage.setItem('dopetone_device_id', Math.random().toString(36).slice(2) + Date.now());
  }
  return window.Auth?.user?.id || localStorage.getItem('dopetone_user_id') || `anon_${localStorage.getItem('dopetone_device_id')}`;
}

// 🔥 FIX: Normalize price - handles both 2999 and 29.99
function normalizePrice(rawPrice, priceInfo) {
  // 1. Price API is source of truth - already 29.99
  if (priceInfo?.price != null) {
    const p = Number(priceInfo.price);
    return p > 100 ? p / 100 : p; // safety: if 2999 in price API, convert
  }
  // 2. Main API
  if (rawPrice == null) return 29.99;
  const num = Number(rawPrice);
  if (isNaN(num)) return 29.99;
  // If > 100, it's in cents (2999 -> 29.99)
  return num > 100 ? num / 100 : num;
}

export async function getBeats() {
  try {
    const [beatsRes, statsRes, priceRes] = await Promise.all([
      fetch(`${API_URL}/api/beats`),
      fetch(`${STATS_API}/api/stats/top`).catch(()=>({ json:()=>[] })),
      fetch(`${PRICE_API}/api/monetization/all`).catch(()=>({ json:()=>[] }))
    ]);
   
    if (!beatsRes.ok) throw new Error('Failed to fetch beats');
    const beats = await beatsRes.json();
   
    let statsMap = {};
    try {
      const topStats = await statsRes.json();
      if (Array.isArray(topStats)) topStats.forEach(s => { statsMap[s.id] = s; });
    } catch {}

    let priceMap = {};
    try {
      const priceList = await priceRes.json();
      if (Array.isArray(priceList)) {
        priceList.forEach(p => {
          priceMap[String(p.id)] = {
            mode: (p.monetization_mode || 'paid').toLowerCase(),
            has_free: p.has_free_tagged ? 1 : 0,
            is_free: p.is_free ? 1 : 0,
            price: p.price
          };
        });
      }
    } catch {}

    return beats.map(b => {
      const priceInfo = priceMap[String(b.id)];
      const rawMode = b.monetization_mode || b.monetizationMode || 'paid';
      const finalMode = priceInfo ? priceInfo.mode : rawMode.toLowerCase();
      const normalizedMode = finalMode === 'free_tagged' || finalMode === 'tagged' ? 'hybrid' : finalMode;
      const finalPrice = normalizePrice(b.price, priceInfo);

      return {
        id: b.id,
        title: b.title,
        genre: b.genre || 'Trap',
        bpm: b.bpm || 140,
        key: b.key || 'C Minor',
        mood: b.mood || null,
        type: b.type || null,
        price: finalPrice,
        audio: b.mp3_url,
        mp3_url: b.mp3_url,
        cover: b.cover_url,
        cover_url: b.cover_url,
        zip_url: b.zip_url,
        project_file: b.zip_url,
        sample: b.mp3_url,
        monetization_mode: normalizedMode,
        monetizationMode: normalizedMode,
        has_free_tagged: normalizedMode === 'hybrid' ? 1 : 0,
        is_free: normalizedMode === 'free' ? 1 : 0,
        play_count: statsMap[b.id]?.play_count || b.play_count || 0,
        download_count: statsMap[b.id]?.download_count || b.download_count || 0,
        like_count: statsMap[b.id]?.like_count || b.like_count || 0,
        cart_count: statsMap[b.id]?.cart_count || b.cart_count || 0,
        created_at: b.created_at
      };
    });
  } catch (err) {
    console.error('getBeats error:', err);
    return [];
  }
}

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
  const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export async function getStatsOverview() {
  try {
    const res = await fetch(`${STATS_API}/api/stats/global?range=day`);
    const data = await res.json();
    return {
      totalStreams: data.totalPlays || 0, activeListeners: data.cartItems || 0,
      revenueToday: data.totalRevenue || 0, newFollowers: data.totalLikes || 0,
      totalEmails: data.totalDownloads || 0, totalPlays: data.totalPlays,
      totalLikes: data.totalLikes, totalDownloads: data.totalDownloads, cartItems: data.cartItems
    };
  } catch { return { totalStreams: 0, activeListeners: 0, revenueToday: 0, newFollowers: 0, totalEmails: 0 }; }
}

export async function getStatsSparks() {
  try {
    const res = await fetch(`${STATS_API}/api/stats/global?range=hour&tz=${new Date().getTimezoneOffset()*-1}`);
    const data = await res.json(); const h = data.history || [];
    return { streams: h.map(d=>d.plays||0), listeners: h.map(d=>d.cart||0), revenue: h.map(d=>d.downloads||0), followers: h.map(d=>d.likes||0), history: h };
  } catch { return { streams: [], listeners: [], revenue: [], followers: [] }; }
}

export async function getSongPerformance(songId, range='30d') {
  try {
    let d1Range='day'; if(range==='24h')d1Range='hour'; if(range==='30d')d1Range='month';
    const res=await fetch(`${STATS_API}/api/stats/track/${songId}?range=${d1Range}&tz=${new Date().getTimezoneOffset()*-1}`);
    const data=await res.json(); return data.points||Array(30).fill(0);
  } catch { return Array(30).fill(0); }
}

export async function exportEmails(){ window.location.href=`${API_URL}/api/emails/export`; }

export async function trackBeatPlay(beatId){
  try{ const r=await fetch(`${STATS_API}/api/stats/event`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({beat_id:parseInt(beatId),beatId:parseInt(beatId),event_type:'play',eventType:'play',user_id:getD1UserKey()})}); return await r.json(); }catch{return null;}
}
export async function trackBeatLike(beatId,isLiked){
  try{
    const userKey=getD1UserKey();
    if(isLiked){ const r=await fetch(`${STATS_API}/api/stats/event`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({beat_id:parseInt(beatId),beatId:parseInt(beatId),event_type:'like',eventType:'like',user_id:userKey})}); return await r.json(); }
    else { const r=await fetch(`${STATS_API}/api/stats/untrack`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({beat_id:parseInt(beatId),beatId:parseInt(beatId),event_type:'like',eventType:'like',user_id:userKey})}); return await r.json(); }
  }catch{return null;}
}
export async function trackBeatDownload(beatId){
  try{ const r=await fetch(`${STATS_API}/api/stats/event`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({beat_id:parseInt(beatId),beatId:parseInt(beatId),event_type:'download',eventType:'download',user_id:getD1UserKey()})}); return await r.json(); }catch{return null;}
}
export async function trackBeatCart(beatId){
  try{ const r=await fetch(`${STATS_API}/api/stats/event`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({beat_id:parseInt(beatId),beatId:parseInt(beatId),event_type:'cart',eventType:'cart',user_id:getD1UserKey()})}); return await r.json(); }catch{return null;}
}
export async function untrackBeatCart(beatId){
  try{ const r=await fetch(`${STATS_API}/api/stats/untrack`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({beat_id:parseInt(beatId),beatId:parseInt(beatId),event_type:'cart',eventType:'cart',user_id:getD1UserKey()})}); return await r.json(); }catch{return null;}
}
export async function getAbandonedCarts(){ try{const r=await fetch(`${STATS_API}/api/stats/abandoned`); return await r.json();}catch{return[];} }
export async function getLikedUsers(){ try{const r=await fetch(`${STATS_API}/api/stats/liked`); return await r.json();}catch{return[];} }
