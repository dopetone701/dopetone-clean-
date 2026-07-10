// ===============================
// 🎵 PLAYLIST ENGINE - CLOUDFLARE READY + D1 LIKES SYNC
// ===============================

import {
    getPlaylists,
    savePlaylists
}
from "./playlist-storage.js"

const WORKER_URL = 'https://dope-tone-api.dopetone701.workers.dev';
const STATS_API = 'https://dopetone-stats.dopetone701.workers.dev';

// ===============================
// 🔄 NORMALIZE BEAT FIELDS
// ===============================
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
    sample: beat.sample || beat.mp3_url || beat.audio
  };
}

// ===============================
// 🔑 USER KEY FOR D1 DEDUPE
// ===============================
function getUserKeyForStats(){
  return window.Auth?.user?.id || localStorage.getItem('dopetone_user_id') || `anon_${localStorage.getItem('dopetone_device_id') || 'device'}` ;
}
// Ensure device id
if (!localStorage.getItem('dopetone_device_id')) {
  localStorage.setItem('dopetone_device_id', Math.random().toString(36).slice(2) + Date.now());
}

// ===============================
// ❤️ ENSURE LIKED PLAYLIST
// ===============================
function ensureLikedPlaylist(){
    const playlists = getPlaylists()
    let liked = playlists.find(p => p.isLiked)

    if(!liked){
        liked = {
            id: "liked_playlist",
            name: "Liked",
            isLiked: true,
            created: Date.now(),
            beats: []
        }
        playlists.unshift(liked)
        savePlaylists(playlists)
    }
    return liked
}

ensureLikedPlaylist()

// ===============================
// 🔥 PRESERVE PLAYER UI
// ===============================
function preservePlayerState(){
    return {
        index: window.__CURRENT_INDEX__,
        listId: window.__CURRENT_LIST__,
        playing: window.globalPlayer?.isPlaying?.(),
        percent: (window.__DOPE_TONE_AUDIO__?.currentTime || 0) / (window.__DOPE_TONE_AUDIO__?.duration || 1)
    }
}

// ===============================
// 🔥 RESTORE PLAYER UI
// ===============================
function restorePlayerState(state){
    if(!state) return
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            document.dispatchEvent(new CustomEvent("playerTimeUpdate", {
                detail: {
                    index: state.index,
                    listId: state.listId,
                    percent: state.percent
                }
            }))

            if(state.playing){
                document.dispatchEvent(new CustomEvent("playerPlay", {
                    detail: {
                        index: state.index,
                        listId: state.listId
                    }
                }))
            }
        })
    })
}

// ===============================
// ➕ CREATE PLAYLIST
// ===============================
export function createPlaylist(name){
    let playlists = getPlaylists()
    const customPlaylists = playlists.filter(p => !p.isLiked)

    if(customPlaylists.length >= 7){
        return {
            ok:false,
            message: "Playlist limit reached"
        }
    }

    const exists = playlists.find(p => p.name.toLowerCase() === name.toLowerCase())

    if(exists){
        return {
            ok:false,
            message: "Playlist already exists"
        }
    }

    const playlist = {
        id: "pl_" + Date.now(),
        name,
        created: Date.now(),
        beats:[]
    }

    playlists.push(playlist)
    savePlaylists(playlists)

    const state = preservePlayerState()
    window.renderPlaylists?.()
    restorePlayerState(state)

    return {
        ok:true,
        playlist
    }
}

// ===============================
// ➕ ADD / REMOVE BEAT
// ===============================
export function addBeatToPlaylist(playlistId, beat){
    if(!playlistId || !beat) return

    // ===============================
    // 🔒 BLOCK MANUAL LIKED ADD
    // ===============================
    if(playlistId === "liked_playlist"){
        return { blocked:true }
    }

    const playlists = getPlaylists()
    const playlist = playlists.find(p => p.id === playlistId)

    if(!playlist) return

    const normalizedBeat = normalizeBeat(beat) // 🔥 NORMALIZE BEFORE SAVE
    const existsIndex = playlist.beats.findIndex(b => b.id === normalizedBeat.id)

    // ===============================
    // ❌ REMOVE
    // ===============================
    if(existsIndex !== -1){
        playlist.beats.splice(existsIndex, 1)
        savePlaylists(playlists)
        const state = preservePlayerState()
        window.renderPlaylists?.()
        restorePlayerState(state)
        return { removed:true }
    }

    // ===============================
    // ➕ ADD
    // ===============================
    playlist.beats.unshift(normalizedBeat)
    savePlaylists(playlists)
    const state = preservePlayerState()
    window.renderPlaylists?.()
    restorePlayerState(state)

    return { added:true }
}

// ===============================
// ❌ REMOVE BEAT
// ===============================
export function removeBeatFromPlaylist(playlistId, beatId){
    const playlists = getPlaylists()
    const playlist = playlists.find(p => p.id === playlistId)

    if(!playlist) return

    playlist.beats = playlist.beats.filter(beat => beat.id !== beatId)
    savePlaylists(playlists)
    const state = preservePlayerState()
    window.renderPlaylists?.()
    restorePlayerState(state)
}

// ===============================
// ❤️ TOGGLE LIKE
// ===============================
export function toggleLikedBeat(beat){
    const playlists = getPlaylists()
    const liked = playlists.find(p => p.isLiked)

    if(!liked) return

    const normalizedBeat = normalizeBeat(beat) // 🔥 NORMALIZE BEFORE SAVE
    const exists = liked.beats.find(b => b.id === normalizedBeat.id)

    if(exists){
        liked.beats = liked.beats.filter(b => b.id !== normalizedBeat.id)
    }else{
        liked.beats.unshift(normalizedBeat)
    }

    savePlaylists(playlists)
    window.dispatchEvent(new Event("playlistsUpdated"))
}

// ===============================
// 🗑 DELETE PLAYLIST
// ===============================
export function deletePlaylist(playlistId){
    let playlists = getPlaylists()
    playlists = playlists.filter(playlist => {
        if(playlist.isLiked){
            return true
        }
        return playlist.id !== playlistId
    })

    savePlaylists(playlists)
    const state = preservePlayerState()
    window.renderPlaylists?.()
    restorePlayerState(state)
}

// ===============================
// 🔍 GET PLAYLIST
// ===============================
export function getPlaylist(playlistId){
    const playlists = getPlaylists()
    return playlists.find(p => p.id === playlistId)
}

// ===============================
// 🌍 GLOBALS
// ===============================
window.getPlaylists = getPlaylists
window.createPlaylist = createPlaylist
window.addBeatToPlaylist = addBeatToPlaylist
window.removeBeatFromPlaylist = removeBeatFromPlaylist
window.deletePlaylist = deletePlaylist
window.toggleLikedBeat = toggleLikedBeat

// =====================================
// ❤️ GLOBAL LIKE SYSTEM FINAL CLEAN - D1 CART-STYLE
// =====================================

document.addEventListener("DOMContentLoaded", () => {
    // =====================================
    // 📦 STORAGE HELPERS
    // =====================================

    function getLikedBeats(){
        return JSON.parse(localStorage.getItem("liked_beats")) || []
    }

    function saveLikedBeats(data){
        localStorage.setItem("liked_beats", JSON.stringify(data))
    }

    function getPlaylists(){
        return JSON.parse(localStorage.getItem("playlists")) || []
    }

    function savePlaylists(data){
        localStorage.setItem("playlists", JSON.stringify(data))
    }

    // =====================================
    // ❤️ CHECK LIKE
    // =====================================

    function isBeatLiked(beat){
        if(!beat) return false
        const liked = getLikedBeats()
        return liked.includes(String(beat.id))
    }

    // =====================================
    // ❤️ REFRESH DESKTOP HEART
    // =====================================

    function refreshDesktopHeart(){
        const btn = document.getElementById("loveTrackBtn")
        const beat = window.__CURRENT_BEAT__
        if(!btn || !beat) return
        const liked = isBeatLiked(beat)
        btn.classList.toggle("active", liked)
        const heart = btn.querySelector(".love-heart")
        if(heart){
            heart.textContent = liked ? "❤️" : "♡"
        }
    }

    // =====================================
    // ❤️ REFRESH MOBILE HEART
    // =====================================

    function refreshMobileHeart(){
        const btn = document.getElementById("mpLike")
        const beat = window.__CURRENT_BEAT__
        if(!btn || !beat) return
        const liked = isBeatLiked(beat)
        btn.innerHTML = `
            <span class="love-heart">
                ${liked ? "❤️" : "♡"}
            </span>
        `
    }

    // =====================================
    // ❤️ REFRESH ALL UI
    // =====================================

    function refreshLikeUI(){
        refreshDesktopHeart()
        refreshMobileHeart()
    }

    // =====================================
    // ❤️ UPDATE LIKED PLAYLIST
    // =====================================

    function updateLikedPlaylist(beat, shouldLike){
        let playlists = getPlaylists()
        let likedPlaylist = playlists.find(p => p.isLiked)
        const normalizedBeat = normalizeBeat(beat) // 🔥 NORMALIZE

        // CREATE PLAYLIST
        if(shouldLike && !likedPlaylist){
            likedPlaylist = {
                id: "liked_playlist",
                name: "Liked",
                isLiked: true,
                beats: []
            }
            playlists.unshift(likedPlaylist)
        }

        if(likedPlaylist){
            // ADD
            if(shouldLike){
                const exists = likedPlaylist.beats.some(b => String(b.id) === String(normalizedBeat.id))
                if(!exists){
                    likedPlaylist.beats.push(normalizedBeat)
                }
            }
            // REMOVE
            else{
                likedPlaylist.beats = likedPlaylist.beats.filter(b => String(b.id) !== String(normalizedBeat.id))
                // DELETE EMPTY PLAYLIST
                if(likedPlaylist.beats.length === 0){
                    playlists = playlists.filter(p => !p.isLiked)
                }
            }
        }

        savePlaylists(playlists)
    }

    // =====================================
    // 🌍 LOAD GLOBAL LIKE COUNT FROM D1
    // =====================================
    async function loadGlobalLikeCount(beatId){
        if(!beatId) return;
        try {
            const res = await fetch(`${STATS_API}/api/stats/track/${beatId}?range=day`);
            if(!res.ok) return;
            const json = await res.json();
            const count = json.stats?.like_count || 0;
            const countEl = document.getElementById("likeCount");
            if(countEl) {
                countEl.textContent = count;
                const cached = JSON.parse(localStorage.getItem("dopetone_like_counts")) || {};
                cached[beatId] = count;
                localStorage.setItem("dopetone_like_counts", JSON.stringify(cached));
            }
        } catch(e){}
    }
    window.loadGlobalLikeCount = loadGlobalLikeCount;

    // =====================================
    // ❤️ TOGGLE LIKE - D1 CART LOGIC (1 USER = 1 LIKE)
    // =====================================

    async function toggleBeatLike(){
        const beat = window.__CURRENT_BEAT__
        if(!beat) return
        let liked = getLikedBeats()
        const exists = liked.includes(String(beat.id))
        const userKey = getUserKeyForStats();

        // Optimistic UI update
        if(exists){
            liked = liked.filter(id => String(id) !== String(beat.id))
            updateLikedPlaylist(beat, false)
        } else {
            liked.push(String(beat.id))
            updateLikedPlaylist(beat, true)
        }
        saveLikedBeats(liked)

        // 🔥 D1 SYNC - SAME AS CART SYSTEM
        try {
            if (exists) {
                // UNLIKE - remove from active_likes (or active_carts table re-used for likes)
                await fetch(`${STATS_API}/api/stats/untrack`, {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({
                        beat_id: parseInt(beat.id),
                        beatId: parseInt(beat.id),
                        event_type: 'like',
                        eventType: 'like',
                        user_id: userKey,
                        user_key: userKey
                    })
                });
            } else {
                // LIKE - add to active_likes, deduped per user
                await fetch(`${STATS_API}/api/stats/event`, {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({
                        beatId: parseInt(beat.id),
                        beat_id: parseInt(beat.id),
                        eventType: 'like',
                        event_type: 'like',
                        user_id: userKey,
                        user_key: userKey
                    })
                });
            }
            // Refresh global count after D1 update
            setTimeout(() => loadGlobalLikeCount(beat.id), 500);
        } catch(err) {
            console.error('[LIKE D1] sync failed', err);
        }

        // =====================================
        // 🌍 LIVE GLOBAL COUNT UPDATE (optimistic)
        // =====================================
        const countEl = document.getElementById("likeCount")
        if(countEl){
            let current = Number(countEl.textContent || 0)
            countEl.textContent = exists ? Math.max(0, current - 1) : current + 1
            const cached = JSON.parse(localStorage.getItem("dopetone_like_counts")) || {}
            cached[beat.id] = Number(countEl.textContent)
            localStorage.setItem("dopetone_like_counts", JSON.stringify(cached))
        }

        refreshLikeUI()

        // 🔥 FORCE PLAYLIST REFRESH
        window.dispatchEvent(new Event("playlistsUpdated"))
        window.dispatchEvent(new Event("playlistVisualUpdate"))
    }

    // =====================================
    // ❤️ BUTTONS
    // =====================================

    const desktopHeart = document.getElementById("loveTrackBtn")
    if(desktopHeart){
        desktopHeart.onclick = toggleBeatLike
    }

    const mobileHeart = document.getElementById("mpLike")
    if(mobileHeart){
        mobileHeart.onclick = toggleBeatLike
    }

    // =====================================
    // 🔄 AUTO REFRESH
    // =====================================

    document.addEventListener("trackChange", refreshLikeUI)
    document.addEventListener("trackChange", e => {
        const beat = e.detail
        if(!beat) return
        // 🔥 sync global current beat
        window.__CURRENT_BEAT__ = normalizeBeat(beat)
        // ❤️ refresh licence heart
        window.updateLicenceLikeUI?.()
        // 🔢 refresh global count from D1
        loadGlobalLikeCount?.(beat.id)
    })

    document.addEventListener("playerPlay", refreshLikeUI)
    window.addEventListener("storage", refreshLikeUI)

    // INITIAL LOAD
    setTimeout(refreshLikeUI, 100)

    // =====================================
    // 🌍 GLOBAL ACCESS
    // =====================================

    window.refreshLikeUI = refreshLikeUI
    window.refreshMobileHeart = refreshMobileHeart
    window.toggleBeatLike = toggleBeatLike
})

// ===============================
// 🔥 MORE BUTTON SLIDEOUT - DELEGATED
// ===============================

document.addEventListener("click", async (e) => {
  const moreBtn = e.target.closest("#mpMore, #gpMore")
  if(!moreBtn) return
 
  e.stopPropagation()
  const beat = window.__CURRENT_BEAT__
  if (!beat) {
    console.log("NO CURRENT BEAT")
    return
  }

  const normalizedBeat = normalizeBeat(beat)

  const old = document.getElementById("playerMorePanel")
  if (old) {
    old.remove()
    return
  }

  const panel = document.createElement("div")
  panel.id = "playerMorePanel"

  panel.innerHTML = `
    <div class="more-panel-header">
      <img src="${normalizedBeat.cover_url || normalizedBeat.cover || 'images/logo.png'}" />
      <div class="more-panel-info">
        <div class="more-title">${normalizedBeat.title || normalizedBeat.name}</div>
        <div class="more-artist">${normalizedBeat.artist || 'Dope Tone'}</div>
      </div>
      <button class="more-close">✕</button>
    </div>

    <div class="more-panel-actions">
      <button class="more-item" data-action="playlist">
        <span>🎵</span> Create Playlist
      </button>

      <button class="more-item" data-action="add_playlist">
        <span>➕</span> Add To Playlist
      </button>

      <button class="more-item" data-action="dopetone_cart">
        <span>🛒</span> Add To Cart
      </button>

      <button class="more-item" data-action="download">
        <span>⬇</span> Free Download
      </button>

      <button class="more-item" data-action="share">
        <span>🔗</span> Share
      </button>

      <button class="more-item buy" data-action="buy">
        <span>💳</span> Buy Now
      </button>

      ${localStorage.getItem("isOwner") === "true"? `
        <button class="more-item delete" data-action="delete">
          <span>🗑</span> Delete Beat
        </button>
      ` : ""}
    </div>
  `

  document.body.appendChild(panel)

  requestAnimationFrame(() => {
    panel.classList.add("active")
  })

  const closeBtn = panel.querySelector(".more-close")
  closeBtn.onclick = () => {
    panel.classList.remove("active")
    setTimeout(() => panel.remove(), 250)
  }

  setTimeout(() => {
    document.addEventListener("click", closeOutside)
    function closeOutside(ev){
      if(!panel.contains(ev.target) &&!ev.target.closest("#mpMore, #gpMore")){
        panel.classList.remove("active")
        setTimeout(() => panel.remove(), 250)
        document.removeEventListener("click", closeOutside)
      }
    }
  }, 50)

  panel.querySelectorAll(".more-item").forEach(btn => {
    btn.onclick = async () => {
      const action = btn.dataset.action

      if(action === "playlist"){
        if(window.openPlaylistModal) window.openPlaylistModal(normalizedBeat)
      }

      if(action === "add_playlist"){
        if(window.openAddToPlaylistModal) window.openAddToPlaylistModal(normalizedBeat)
      }

      if(action === "dopetone_cart"){
        let cart = JSON.parse(localStorage.getItem("dopetone_cart")) || []
        const exists = cart.find(item => item.id === normalizedBeat.id)
        if(!exists){
          cart.push(normalizedBeat)
          localStorage.setItem("dopetone_cart", JSON.stringify(cart))
          // 🔥 D1 CART SYNC
          const userKey = getUserKeyForStats();
          fetch(`${STATS_API}/api/stats/event`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({beatId: parseInt(normalizedBeat.id), eventType: 'cart', user_id: userKey})
          }).catch(()=>{});
        }
        if(window.renderCartBeatRow) window.renderCartBeatRow()
        if(window.checkEmptyState) window.checkEmptyState()
        if(window.updateCartCount) window.updateCartCount()
        showCartToast(normalizedBeat.title || normalizedBeat.name)
      }

      if(action === "download"){
        const email = prompt("Enter your email")
        if(!email) return
        const link = document.createElement("a")
        link.href = normalizedBeat.mp3_url || normalizedBeat.audio
        link.download = (normalizedBeat.title || normalizedBeat.name) + ".mp3"
        document.body.appendChild(link)
        link.click()
        link.remove()
      }

      if(action === "share"){
        if(navigator.share){
          await navigator.share({
            title: normalizedBeat.title || normalizedBeat.name,
            url: location.href
          })
        }
      }

      if(action === "buy"){
        window.location.href = `licence-page.html?id=${normalizedBeat.id}`
      }

      panel.classList.remove("active")
      setTimeout(() => panel.remove(), 250)
    }
  })
})

function showCartToast(text){
  let toast = document.getElementById("cartToast")
  if(!toast){
    toast = document.createElement("div")
    toast.id = "cartToast"
    document.body.appendChild(toast)
  }
  toast.textContent = text
  toast.classList.add("active")
  clearTimeout(toast.__timer)
  toast.__timer = setTimeout(() => {
    toast.classList.remove("active")
  }, 2200)
}
