// ===============================
// 🎵 DOPE TONE STORAGE ENGINE
// FINAL CLEAN VERSION + D1 SYNC + CHART SYSTEM
// ===============================

const STATS_API = 'https://dopetone-stats.dopetone701.workers.dev';

function getD1UserKey() {
  if (!localStorage.getItem('dopetone_device_id')) {
    localStorage.setItem('dopetone_device_id', Math.random().toString(36).slice(2) + Date.now());
  }
  return window.Auth?.user?.id || localStorage.getItem('dopetone_user_id') || `anon_${localStorage.getItem('dopetone_device_id')}`;
}

// 🔥 SYNC D1 LIKES INTO LOCAL - FOR CHARTS
let _d1LikesCache = [];
let _d1LikesLastSync = 0;
async function syncD1LikesToLocal() {
  const now = Date.now();
  if (now - _d1LikesLastSync < 10000) return _d1LikesCache; // 10s cache
  try {
    const userKey = getD1UserKey();
    const res = await fetch(`${STATS_API}/api/stats/liked`);
    if (!res.ok) return _d1LikesCache;
    const data = await res.json();
    const myLikes = data.filter(d => d.user_key === userKey);
    _d1LikesCache = myLikes.map(l => String(l.beat_id));
    _d1LikesLastSync = now;
    // Merge into localStorage so charts see it
    const localIds = JSON.parse(localStorage.getItem(LIKED_KEY) || "[]").map(String);
    const merged = [...new Set([...localIds, ..._d1LikesCache])];
    if (merged.length !== localIds.length) {
      localStorage.setItem(LIKED_KEY, JSON.stringify(merged));
      localStorage.setItem('_d1_liked_count', String(_d1LikesCache.length));
    }
    return _d1LikesCache;
  } catch(e) {
    return _d1LikesCache;
  }
}
// Auto sync on load
syncD1LikesToLocal();
setInterval(syncD1LikesToLocal, 15000);

// ===============================
// 🔑 STORAGE KEYS
// ===============================
export const PLAYLIST_KEY =
"dopetone_playlists"

export const LIKED_KEY =
"liked_beats"

// ===============================
// 📦 GET PLAYLISTS - D1 AWARE
// ===============================
export function getPlaylists(){

    // ===========================
    // 📦 RAW PLAYLISTS
    // ===========================
    const raw =
    JSON.parse(
        localStorage.getItem(
            PLAYLIST_KEY
        )
    ) || []

    // ===========================
    // 🔥 SAFE CLONE
    // ===========================
    const playlists =
    structuredClone(raw)

    // ===========================
    // ❤️ LIKED IDS - LOCAL + D1 MERGED
    // ===========================
    const localLikedIds =
    (
        JSON.parse(
            localStorage.getItem(
                LIKED_KEY
            )
        ) || []
    ).map(String)

    // D1 cached ids
    const d1Ids = _d1LikesCache.length ? _d1LikesCache : (JSON.parse(localStorage.getItem('_d1_liked_ids') || '[]').map(String));
    
    const likedIds = [...new Set([...localLikedIds, ...d1Ids])];

    // ===========================
    // 🌍 GLOBAL BEATS
    // ===========================
    const allBeats =
    window.allBeats || []

    // ===========================
    // ❤️ FIND LIKED PLAYLIST
    // ===========================
    let likedPlaylist =
    playlists.find(
        p => p.isLiked
    )

    // ===========================
    // ❤️ CREATE IF MISSING
    // ===========================
    if(!likedPlaylist){

        likedPlaylist = {

            id:
            "liked_playlist",

            name:
            "Liked",

            isLiked:
            true,

            created:
            Date.now(),

            beats:[]
        }

        playlists.unshift(
            likedPlaylist
        )

        savePlaylists(
            playlists
        )
    }

    // ===========================
    // 🔥 FORCE REAL LIKED BEATS - D1 + LOCAL
    // ===========================
    if (allBeats.length) {
        likedPlaylist.beats =
        allBeats.filter(
            beat =>
            likedIds.includes(
                String(beat.id)
            )
        )
    } else {
        // If allBeats not loaded yet, keep existing beats that match likedIds
        likedPlaylist.beats = (likedPlaylist.beats || []).filter(b => likedIds.includes(String(b.id)));
        // Also try to hydrate from recent/local cache
        const recent = JSON.parse(localStorage.getItem("dopetone_recent") || "[]");
        const extra = recent.filter(b => likedIds.includes(String(b.id)) && !likedPlaylist.beats.find(x => String(x.id) === String(b.id)));
        likedPlaylist.beats = [...likedPlaylist.beats, ...extra];
    }

    // ===========================
    // ✅ RETURN SAFE DATA
    // ===========================
    return playlists
}

// ===============================
// 💾 SAVE PLAYLISTS
// ===============================
export function savePlaylists(
    playlists
){

    if(!Array.isArray(playlists)){
        return
    }

    localStorage.setItem(
        PLAYLIST_KEY,
        JSON.stringify(playlists)
    )

    // 🔥 LIVE UPDATE EVENT
    window.dispatchEvent(
        new Event(
            "playlistsUpdated"
        )
    )
}

// ===============================
// ❤️ GET LIKED IDS - D1 MERGED
// ===============================
export function getLikedBeatIds(){

    const local = (
        JSON.parse(
            localStorage.getItem(
                LIKED_KEY
            )
        ) || []
    ).map(String)

    const d1 = _d1LikesCache.length ? _d1LikesCache : JSON.parse(localStorage.getItem('_d1_liked_ids') || '[]').map(String);

    return [...new Set([...local, ...d1])];
}

// ===============================
// ❤️ SAVE LIKED IDS
// ===============================
export function saveLikedBeatIds(
    ids
){

    localStorage.setItem(
        LIKED_KEY,
        JSON.stringify(ids)
    )

    // 🔥 LIVE UPDATE EVENT
    window.dispatchEvent(
        new Event(
            "playlistsUpdated"
        )
    )
}

// ===============================
// ❤️ IS LIKED - D1 AWARE
// ===============================
export function isBeatLiked(
    beatId
){

    const liked =
    getLikedBeatIds()

    return liked.includes(
        String(beatId)
    )
}

// ===============================
// ❤️ TOGGLE LIKE - D1 SYNCED + CHARTS
// ===============================
export function toggleLikedBeat(
    beat
){

    if(!beat?.id){
        return
    }

    let liked =
    JSON.parse(localStorage.getItem(LIKED_KEY) || "[]").map(String)

    const exists =
    liked.includes(
        String(beat.id)
    )

    const userKey = getD1UserKey();

    // ===========================
    // ❌ REMOVE - D1 UNTRACK
    // ===========================
    if(exists){

        liked =
        liked.filter(
            id =>
            String(id)
            !==
            String(beat.id)
        )

        // D1
        fetch(`${STATS_API}/api/stats/untrack`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
                beat_id: parseInt(beat.id),
                event_type: 'like',
                user_id: userKey
            })
        }).then(()=>{ _d1LikesCache = _d1LikesCache.filter(id => id !== String(beat.id)); }).catch(()=>{});

        // Update D1 cache
        _d1LikesCache = _d1LikesCache.filter(id => id !== String(beat.id));
        localStorage.setItem('_d1_liked_ids', JSON.stringify(_d1LikesCache));
    }

    // ===========================
    // ➕ ADD - D1 TRACK (DEDUPE)
    // ===========================
    else{

        liked.unshift(
            String(beat.id)
        )

        // D1 - will dedupe if already liked
        fetch(`${STATS_API}/api/stats/event`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
                beatId: parseInt(beat.id),
                event_type: 'like',
                eventType: 'like',
                user_id: userKey
            })
        }).then(()=>{
            if (!_d1LikesCache.includes(String(beat.id))) {
                _d1LikesCache.unshift(String(beat.id));
                localStorage.setItem('_d1_liked_ids', JSON.stringify(_d1LikesCache));
                localStorage.setItem('_d1_liked_count', String(_d1LikesCache.length));
            }
        }).catch(()=>{});
    }

    saveLikedBeatIds(
        liked
    )

    // 🔥 CHART SYSTEM - FORCE CHART REFRESH
    setTimeout(() => {
        if (window.loadTradeChartData) {
            // Refresh global chart if on control center
            const currentRange = window.currentRange || 'day';
            const currentBeatId = window.currentBeatId || null;
            window.loadTradeChartData?.(currentBeatId, currentRange);
        }
    }, 800);

    return {

        liked:
        !exists
    }
}

// ===============================
// 🗑 DELETE PLAYLIST
// ===============================
export function deletePlaylist(
    playlistId
){

    if(
        playlistId ===
        "liked_playlist"
    ){
        return
    }

    let playlists =
    getPlaylists()

    playlists =
    playlists.filter(
        playlist =>
            playlist.id !==
            playlistId
    )

    savePlaylists(
        playlists
    )
}

// ===============================
// 🔍 GET SINGLE PLAYLIST
// ===============================
export function getPlaylist(
    playlistId
){

    const playlists =
    getPlaylists()

    return playlists.find(
        p =>
        p.id === playlistId
    )
}

// ===============================
// 🌍 GLOBALS
// ===============================
window.getPlaylists =
getPlaylists

window.savePlaylists =
savePlaylists

window.toggleLikedBeat =
toggleLikedBeat

window.deletePlaylist =
deletePlaylist

window.getPlaylist =
getPlaylist

window.isBeatLiked =
isBeatLiked

window.syncD1LikesToLocal = syncD1LikesToLocal;

// ===============================
// 🎯 CAPSULE ENGINE
// ===============================
function getLikedPlaylist(){

    const playlists =
    JSON.parse(
        localStorage.getItem("playlists")
    ) || []

    const liked =
    playlists.find(
        p => p.isLiked
    )

    return liked?.beats || []
}

// Auto refresh likes from D1 on visibility change (phone -> laptop switch)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        syncD1LikesToLocal().then(() => {
            window.dispatchEvent(new Event("playlistsUpdated"));
        });
    }
});
