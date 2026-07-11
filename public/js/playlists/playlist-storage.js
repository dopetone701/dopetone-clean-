// ===============================
// 🎵 DOPE TONE STORAGE ENGINE - MONETIZATION SAFE
// FINAL CLEAN VERSION + D1 SYNC + CHART SYSTEM
// ===============================
const STATS_API = 'https://dopetone-stats.dopetone701.workers.dev';

// === MONETIZATION SAFE ===
const getMode = (b) => {
  if (!b) return 'paid';
  let m = (b.monetization_mode || b.monetizationMode || '').toLowerCase().trim();
  if (['free','hybrid','paid'].includes(m)) return m;
  if (m.includes('tagged')) return 'hybrid';
  if (b.is_free == 1 || b.is_free === true) return 'free';
  if (b.has_free_tagged == 1) return 'hybrid';
  return 'paid';
};
function normalizeBeat(beat) {
  if (!beat) return null;
  return {
    ...beat,
    audio: beat.audio || beat.mp3_url,
    mp3_url: beat.mp3_url || beat.audio,
    cover: beat.cover || beat.cover_url,
    cover_url: beat.cover_url || beat.cover,
    zip_url: beat.zip_url || beat.project_file,
    project_file: beat.project_file || beat.zip_url,
    sample: beat.sample || beat.mp3_url || beat.audio,
    monetization_mode: beat.monetization_mode || beat.monetizationMode || getMode(beat),
    monetizationMode: beat.monetizationMode || beat.monetization_mode || getMode(beat),
    price: beat.price ?? 29.99,
    is_free: beat.is_free ?? (getMode(beat)==='free'?1:0),
    has_free_tagged: beat.has_free_tagged ?? (getMode(beat)==='hybrid'?1:0)
  };
}

function getD1UserKey() {
  if (!localStorage.getItem('dopetone_device_id')) {
    localStorage.setItem('dopetone_device_id', Math.random().toString(36).slice(2) + Date.now());
  }
  return window.Auth?.user?.id || localStorage.getItem('dopetone_user_id') || `anon_${localStorage.getItem('dopetone_device_id')}`;
}

let _d1LikesCache = [];
let _d1LikesLastSync = 0;
async function syncD1LikesToLocal() {
  const now = Date.now();
  if (now - _d1LikesLastSync < 10000) return _d1LikesCache;
  try {
    const userKey = getD1UserKey();
    const res = await fetch(`${STATS_API}/api/stats/liked`);
    if (!res.ok) return _d1LikesCache;
    const data = await res.json();
    const myLikes = data.filter(d => d.user_key === userKey);
    _d1LikesCache = myLikes.map(l => String(l.beat_id));
    _d1LikesLastSync = now;
    const localIds = JSON.parse(localStorage.getItem(LIKED_KEY) || "[]").map(String);
    const merged = [...new Set([...localIds, ..._d1LikesCache])];
    if (merged.length !== localIds.length) {
      localStorage.setItem(LIKED_KEY, JSON.stringify(merged));
      localStorage.setItem('_d1_liked_count', String(_d1LikesCache.length));
    }
    return _d1LikesCache;
  } catch(e) { return _d1LikesCache; }
}
syncD1LikesToLocal();
setInterval(syncD1LikesToLocal, 15000);

// 🔑 STORAGE KEYS
export const PLAYLIST_KEY = "dopetone_playlists";
export const LIKED_KEY = "liked_beats";

export function getPlaylists(){
    const raw = JSON.parse(localStorage.getItem(PLAYLIST_KEY)) || [];
    const playlists = structuredClone(raw);
    const localLikedIds = (JSON.parse(localStorage.getItem(LIKED_KEY)) || []).map(String);
    const d1Ids = _d1LikesCache.length ? _d1LikesCache : (JSON.parse(localStorage.getItem('_d1_liked_ids') || '[]').map(String));
    const likedIds = [...new Set([...localLikedIds, ...d1Ids])];
    const allBeats = window.allBeats || window.store?.beats || [];

    let likedPlaylist = playlists.find(p => p.isLiked);
    if(!likedPlaylist){
        likedPlaylist = { id: "liked_playlist", name: "Liked", isLiked: true, created: Date.now(), beats:[] };
        playlists.unshift(likedPlaylist);
        savePlaylists(playlists);
    }

    if (allBeats.length) {
        // Rebuild from allBeats to get latest monetization state
        likedPlaylist.beats = allBeats.filter(beat => likedIds.includes(String(beat.id))).map(normalizeBeat);
    } else {
        likedPlaylist.beats = (likedPlaylist.beats || []).filter(b => likedIds.includes(String(b.id))).map(normalizeBeat);
        const recent = JSON.parse(localStorage.getItem("dopetone_recent") || "[]");
        const extra = recent.filter(b => likedIds.includes(String(b.id)) && !likedPlaylist.beats.find(x => String(x.id) === String(b.id))).map(normalizeBeat);
        likedPlaylist.beats = [...likedPlaylist.beats, ...extra];
    }

    // 🔥 UPDATE ALL PLAYLISTS WITH LATEST MONETIZATION FROM allBeats
    if (allBeats.length) {
        const beatMap = {};
        allBeats.forEach(b => beatMap[String(b.id)] = b);
        playlists.forEach(pl => {
            pl.beats = (pl.beats || []).map(b => {
                const latest = beatMap[String(b.id)];
                if (latest) return normalizeBeat({ ...b, ...latest });
                return normalizeBeat(b);
            });
        });
    }

    return playlists;
}

export function savePlaylists(playlists){
    if(!Array.isArray(playlists)) return;
    // Ensure beats are normalized before save
    const safe = playlists.map(pl => ({ ...pl, beats: (pl.beats||[]).map(normalizeBeat) }));
    localStorage.setItem(PLAYLIST_KEY, JSON.stringify(safe));
    window.dispatchEvent(new Event("playlistsUpdated"));
}

export function getLikedBeatIds(){
    const local = (JSON.parse(localStorage.getItem(LIKED_KEY)) || []).map(String);
    const d1 = _d1LikesCache.length ? _d1LikesCache : JSON.parse(localStorage.getItem('_d1_liked_ids') || '[]').map(String);
    return [...new Set([...local, ...d1])];
}

export function saveLikedBeatIds(ids){
    localStorage.setItem(LIKED_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event("playlistsUpdated"));
}

export function isBeatLiked(beatId){ return getLikedBeatIds().includes(String(beatId)); }

export function toggleLikedBeat(beat){
    if(!beat?.id) return;
    let liked = JSON.parse(localStorage.getItem(LIKED_KEY) || "[]").map(String);
    const exists = liked.includes(String(beat.id));
    const userKey = getD1UserKey();

    if(exists){
        liked = liked.filter(id => String(id) !== String(beat.id));
        fetch(`${STATS_API}/api/stats/untrack`, {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ beat_id: parseInt(beat.id), event_type: 'like', user_id: userKey })
        }).then(()=>{ _d1LikesCache = _d1LikesCache.filter(id => id !== String(beat.id)); }).catch(()=>{});
        _d1LikesCache = _d1LikesCache.filter(id => id !== String(beat.id));
        localStorage.setItem('_d1_liked_ids', JSON.stringify(_d1LikesCache));
    } else {
        liked.unshift(String(beat.id));
        fetch(`${STATS_API}/api/stats/event`, {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ beatId: parseInt(beat.id), event_type: 'like', eventType: 'like', user_id: userKey })
        }).then(()=>{
            if (!_d1LikesCache.includes(String(beat.id))) {
                _d1LikesCache.unshift(String(beat.id));
                localStorage.setItem('_d1_liked_ids', JSON.stringify(_d1LikesCache));
                localStorage.setItem('_d1_liked_count', String(_d1LikesCache.length));
            }
        }).catch(()=>{});
    }

    saveLikedBeatIds(liked);
    setTimeout(() => {
        if (window.loadTradeChartData) {
            const currentRange = window.currentRange || 'day';
            const currentBeatId = window.currentBeatId || null;
            window.loadTradeChartData?.(currentBeatId, currentRange);
        }
    }, 800);
    return { liked: !exists };
}

export function deletePlaylist(playlistId){
    if(playlistId === "liked_playlist") return;
    let playlists = getPlaylists();
    playlists = playlists.filter(playlist => playlist.id !== playlistId);
    savePlaylists(playlists);
}

export function getPlaylist(playlistId){
    const playlists = getPlaylists();
    return playlists.find(p => p.id === playlistId);
}

window.getPlaylists = getPlaylists;
window.savePlaylists = savePlaylists;
window.toggleLikedBeat = toggleLikedBeat;
window.deletePlaylist = deletePlaylist;
window.getPlaylist = getPlaylist;
window.isBeatLiked = isBeatLiked;
window.syncD1LikesToLocal = syncD1LikesToLocal;

function getLikedPlaylist(){
    const playlists = JSON.parse(localStorage.getItem("playlists")) || [];
    const liked = playlists.find(p => p.isLiked);
    return liked?.beats || [];
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        syncD1LikesToLocal().then(() => { window.dispatchEvent(new Event("playlistsUpdated")); });
    }
});

// 🔥 LIVE CC UPDATE - REFRESH PLAYLIST MONETIZATION
window.addEventListener('cc_monetize_changed', (e)=>{
  const {beatId,mode}=e.detail||{}; if(!beatId) return;
  try{
    let pls = JSON.parse(localStorage.getItem(PLAYLIST_KEY))||[];
    let changed=false;
    pls.forEach(p=>{ p.beats?.forEach(b=>{ if(String(b.id)===String(beatId)){ b.monetization_mode=mode; b.monetizationMode=mode; b.is_free=mode==='free'?1:0; b.has_free_tagged=mode==='hybrid'?1:0; changed=true; } }); });
    if(changed) localStorage.setItem(PLAYLIST_KEY,JSON.stringify(pls));
  }catch{}
  window.dispatchEvent(new Event("playlistsUpdated"));
});
