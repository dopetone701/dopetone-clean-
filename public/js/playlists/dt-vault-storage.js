// ===============================
// 🎵 DT VAULT STORAGE - V1 - FIXED - CLEAN NAMESPACE
// TARGET: dt_vault_v1 + dt_liked_v1 - LIKE LOGIC KEPT 100%
// ===============================
const STATS_API = 'https://dopetone-stats.dopetone701.workers.dev';

export const VAULT_KEY = "dt_vault_v1";
export const LIKED_KEY = "dt_liked_v1";
export const DEVICE_KEY = "dt_device_id";

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
    id: String(beat.id || beat.beat_id || beat._id || ""),
    title: beat.title || beat.name || "Untitled",
    audio: beat.audio || beat.mp3_url,
    mp3_url: beat.mp3_url || beat.audio,
    cover: beat.cover || beat.cover_url || beat.image || "images/logo.png",
    cover_url: beat.cover_url || beat.cover || beat.image || "images/logo.png",
    genre: beat.genre || "Trap",
    bpm: beat.bpm || 140,
    key: beat.key || "--",
    monetization_mode: beat.monetization_mode || beat.monetizationMode || getMode(beat),
    monetizationMode: beat.monetizationMode || beat.monetization_mode || getMode(beat),
    price: beat.price ?? 29.99,
    is_free: beat.is_free ?? (getMode(beat)==='free'?1:0),
    has_free_tagged: beat.has_free_tagged ?? (getMode(beat)==='hybrid'?1:0)
  };
}

function getD1UserKey() {
  if (!localStorage.getItem(DEVICE_KEY)) {
    localStorage.setItem(DEVICE_KEY, Math.random().toString(36).slice(2) + Date.now());
  }
  return window.Auth?.user?.id || localStorage.getItem('dopetone_user_id') || `anon_${localStorage.getItem(DEVICE_KEY)}`;
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
    }
    localStorage.setItem('dt_liked_count', String(_d1LikesCache.length));
    localStorage.setItem('dt_liked_ids', JSON.stringify(_d1LikesCache));
    return _d1LikesCache;
  } catch(e) { return _d1LikesCache; }
}
syncD1LikesToLocal();
setInterval(syncD1LikesToLocal, 15000);

(function migrateOnce(){
  if(localStorage.getItem('dt_migrated_v1')) return;
  try{
    const oldLiked = JSON.parse(localStorage.getItem('liked_beats') || '[]');
    const oldVault = JSON.parse(localStorage.getItem('dopetone_playlists') || '[]');
    if(oldLiked.length && !localStorage.getItem(LIKED_KEY)) localStorage.setItem(LIKED_KEY, JSON.stringify(oldLiked));
    if(oldVault.length && !localStorage.getItem(VAULT_KEY)) localStorage.setItem(VAULT_KEY, JSON.stringify(oldVault));
    localStorage.setItem('dt_migrated_v1','1');
  }catch{}
})();

export function getVaultPlaylists(){
    let raw;
    try{ raw = JSON.parse(localStorage.getItem(VAULT_KEY) || "[]"); } catch{ raw = []; }
    const playlists = structuredClone(raw);
    let localLikedIds = [];
    let d1Ids = [];
    try{ localLikedIds = (JSON.parse(localStorage.getItem(LIKED_KEY) || "[]")).map(String); }catch{}
    try{ d1Ids = _d1LikesCache.length ? _d1LikesCache : (JSON.parse(localStorage.getItem('dt_liked_ids') || '[]')).map(String); }catch{}
    const likedIds = [...new Set([...localLikedIds, ...d1Ids])];
    const allBeats = window.allBeats || window.store?.beats || [];

    let likedPlaylist = playlists.find(p => p.isLiked);
    if(!likedPlaylist){
        likedPlaylist = { id: "dt_liked_playlist", name: "Liked", isLiked: true, created: Date.now(), beats:[] };
        playlists.unshift(likedPlaylist);
        saveVaultPlaylists(playlists);
    }

    if (allBeats.length) {
        likedPlaylist.beats = allBeats.filter(beat => likedIds.includes(String(beat.id))).map(normalizeBeat);
    } else {
        let filtered = (likedPlaylist.beats || []).filter(b => likedIds.includes(String(b.id))).map(normalizeBeat);
        let recent = [];
        try{ recent = JSON.parse(localStorage.getItem("dopetone_recent") || "[]"); }catch{}
        const extra = recent.filter(b => likedIds.includes(String(b.id)) && !filtered.find(x => String(x.id) === String(b.id))).map(normalizeBeat);
        likedPlaylist.beats = [...filtered, ...extra];
    }

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

export function saveVaultPlaylists(playlists){
    if(!Array.isArray(playlists)) return;
    const safe = playlists.map(pl => ({ ...pl, beats: (pl.beats||[]).map(normalizeBeat).filter(Boolean) }));
    localStorage.setItem(VAULT_KEY, JSON.stringify(safe));
    window.dispatchEvent(new Event("dt_vault_updated"));
    window.dispatchEvent(new Event("playlistsUpdated"));
}

export function getVaultLikedIds(){
    let local = [];
    let d1 = [];
    try{ local = (JSON.parse(localStorage.getItem(LIKED_KEY) || "[]")).map(String); }catch{}
    try{ d1 = _d1LikesCache.length ? _d1LikesCache : JSON.parse(localStorage.getItem('dt_liked_ids') || '[]').map(String); }catch{}
    return [...new Set([...local, ...d1])];
}

export function saveVaultLikedIds(ids){
    localStorage.setItem(LIKED_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event("dt_vault_updated"));
    window.dispatchEvent(new Event("playlistsUpdated"));
}

export function isVaultLiked(beatId){ return getVaultLikedIds().includes(String(beatId)); }

export function toggleVaultLiked(beat){
    if(!beat?.id) return { liked:false };
    let liked = [];
    try{ liked = (JSON.parse(localStorage.getItem(LIKED_KEY) || "[]")).map(String); }catch{}
    const exists = liked.includes(String(beat.id));
    const userKey = getD1UserKey();

    if(exists){
        liked = liked.filter(id => String(id) !== String(beat.id));
        fetch(`${STATS_API}/api/stats/untrack`, {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ beat_id: parseInt(beat.id), event_type: 'like', user_id: userKey })
        }).then(()=>{ _d1LikesCache = _d1LikesCache.filter(id => id !== String(beat.id)); }).catch(()=>{});
        _d1LikesCache = _d1LikesCache.filter(id => id !== String(beat.id));
        localStorage.setItem('dt_liked_ids', JSON.stringify(_d1LikesCache));
    } else {
        liked.unshift(String(beat.id));
        fetch(`${STATS_API}/api/stats/event`, {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ beatId: parseInt(beat.id), event_type: 'like', eventType: 'like', user_id: userKey })
        }).then(()=>{
            if (!_d1LikesCache.includes(String(beat.id))) {
                _d1LikesCache.unshift(String(beat.id));
                localStorage.setItem('dt_liked_ids', JSON.stringify(_d1LikesCache));
                localStorage.setItem('dt_liked_count', String(_d1LikesCache.length));
            }
        }).catch(()=>{});
    }

    saveVaultLikedIds(liked);
    setTimeout(() => {
        if (window.loadTradeChartData) {
            const currentRange = window.currentRange || 'day';
            const currentBeatId = window.currentBeatId || null;
            window.loadTradeChartData?.(currentBeatId, currentRange);
        }
    }, 800);
    return { liked: !exists };
}

export function deleteVaultPlaylist(playlistId){
    if(playlistId === "dt_liked_playlist" || playlistId === "liked_playlist") return;
    let playlists = getVaultPlaylists();
    playlists = playlists.filter(playlist => playlist.id !== playlistId);
    saveVaultPlaylists(playlists);
}

export function getVaultPlaylist(playlistId){
    const playlists = getVaultPlaylists();
    return playlists.find(p => p.id === playlistId);
}

window.getVaultPlaylists = getVaultPlaylists;
window.getPlaylists = getVaultPlaylists;
window.isVaultLiked = isVaultLiked;
window.isBeatLiked = isVaultLiked;
window.toggleVaultLiked = toggleVaultLiked;
window.toggleLikedBeat = toggleVaultLiked;
window.deleteVaultPlaylist = deleteVaultPlaylist;
window.deletePlaylist = deleteVaultPlaylist;
window.syncD1LikesToLocal = syncD1LikesToLocal;

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        syncD1LikesToLocal().then(() => { window.dispatchEvent(new Event("dt_vault_updated")); });
    }
});

window.addEventListener('cc_monetize_changed', (e)=>{
  const detail = e.detail||{};
  const beatId = detail.beatId;
  const mode = detail.mode;
  if(!beatId) return;
  try{
    let pls = JSON.parse(localStorage.getItem(VAULT_KEY)||"[]");
    let changed=false;
    pls.forEach(p=>{ (p.beats||[]).forEach(b=>{ if(String(b.id)===String(beatId)){ b.monetization_mode=mode; b.monetizationMode=mode; b.is_free=mode==='free'?1:0; b.has_free_tagged=mode==='hybrid'?1:0; changed=true; } }); });
    if(changed) localStorage.setItem(VAULT_KEY,JSON.stringify(pls));
  }catch{}
  window.dispatchEvent(new Event("dt_vault_updated"));
});
