// ===============================
// 🎵 PLAYLISTS PAGE FINAL - CLOUDFLARE ONLY
// ===============================

import { renderPlaylistCapsulesOnly } from "./playlist-render.js"
import { renderWave } from "../sections/wave.js"
import { renderPlaylistSimilarTracks } from "./playlist-similar.js"

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

console.log("🎵 playlists-page loaded")

// RENDER SIMILAR TRACKS
renderPlaylistSimilarTracks()

document.addEventListener("DOMContentLoaded", async () => {
    // ===============================
    // 🎯 RENDER CAPSULES
    // ===============================
    ensureDownloadsPlaylist()
    renderPlaylistCapsulesOnly()
   
    // ===============================
    // ➕ ADD PLAYLIST BTN → MORPH
    // ===============================
    const addBtn = document.getElementById("playlistMiniAdd")

    if(addBtn){
        addBtn.addEventListener("click", (e) => {
            e.stopPropagation()
            if(window.openPlaylistModal){
                window.openPlaylistModal()
            } else {
                console.error("openPlaylistModal not found - check playlist-modal.js loaded")
            }
        })
    }

    // ===============================
    // 🎯 TOGGLE SYSTEM
    // ===============================
    initToggle()

    // ===============================
    // 🔍 SEARCH SYSTEM - WAIT FOR STORE
    // ===============================
    initPlaylistSearch()

    // ===============================
    // 🎯 CAPSULE CLICK ENGINE
    // ===============================
    initPlaylistCapsules()
})

// ======================================
// 🔥 ENSURE DOWNLOADS PLAYLIST EXISTS
// ======================================
function ensureDownloadsPlaylist(){
    let playlists = JSON.parse(localStorage.getItem("dopetone_playlists")) || []
    let downloads = playlists.find(p => p.id === "downloads_playlist")
   
    if(!downloads){
        downloads = {
            id: "downloads_playlist",
            name: "Downloads",
            isDownloads: true,
            beats: []
        }
        playlists.unshift(downloads)
        localStorage.setItem("dopetone_playlists", JSON.stringify(playlists))
    }
}

// ======================================
// ⬇️ GET DOWNLOADS PLAYLIST
// ======================================
function getDownloadsPlaylist(){
    const playlists = JSON.parse(localStorage.getItem("dopetone_playlists")) || []
    const downloads = playlists.find(p => p.isDownloads || p.id === "downloads_playlist")
    return (downloads?.beats || []).map(normalizeBeat)
}

// ======================================
// ❤️ FIX LIKED PLAYLIST RENDER
// ======================================
function getLikedPlaylist(){
    const playlists = JSON.parse(localStorage.getItem("playlists")) || []
    const liked = playlists.find(p => p.isLiked)
    return (liked?.beats || []).map(normalizeBeat)
}

// ======================================
// 🎯 CAPSULE CLICK ENGINE + AUTO LOAD
// ======================================
function initPlaylistCapsules(){
    const container = document.getElementById("playlistCapsules")
    if(!container) return

    const urlParams = new URLSearchParams(window.location.search)
    const targetPlaylistId = urlParams.get("id") || "liked_playlist"

    loadPlaylistById(targetPlaylistId)

    setTimeout(() => {
        const capsules = document.querySelectorAll(".playlist-capsule")
       
        capsules.forEach(btn => {
            const btnText = btn.textContent.trim().toLowerCase()
            const isLiked = btnText === "liked" && targetPlaylistId === "liked_playlist"
            const isDownloads = btnText === "downloads" && targetPlaylistId === "downloads_playlist"
            const playlist = window.getPlaylists()?.find(p => p.name.toLowerCase() === btnText)
            const isMatch = playlist?.id === targetPlaylistId
           
            if(isLiked || isDownloads || isMatch){
                btn.classList.add("active")
            } else {
                btn.classList.remove("active")
            }
        })

        capsules.forEach(btn => {
            btn.addEventListener("click", () => {
                capsules.forEach(b => b.classList.remove("active"))
                btn.classList.add("active")

                const btnText = btn.textContent.trim().toLowerCase()

                if(btnText === "liked"){
                    window.filteredPlaylistBeats = getLikedPlaylist()
                    window.__CURRENT_PLAYLIST_ID__ = "liked_playlist"
                    updateURL("liked_playlist")
                }
                else if(btnText === "downloads"){
                    window.filteredPlaylistBeats = getDownloadsPlaylist()
                    window.__CURRENT_PLAYLIST_ID__ = "downloads_playlist"
                    updateURL("downloads_playlist")
                }
                else {
                    const playlists = window.getPlaylists() || []
                    const playlist = playlists.find(p => p.name === btn.textContent.trim())
                    if(!playlist) return
                    window.filteredPlaylistBeats = (playlist.beats || []).map(normalizeBeat)
                    window.__CURRENT_PLAYLIST_ID__ = playlist.id
                    updateURL(playlist.id)
                }

                renderActiveView()
            })
        })
    },50)
}

// ===============================
// 🔥 LOAD PLAYLIST BY ID
// ===============================
function loadPlaylistById(playlistId){
    if(playlistId === "liked_playlist"){
        window.filteredPlaylistBeats = getLikedPlaylist()
        window.__CURRENT_PLAYLIST_ID__ = "liked_playlist"
    } else if(playlistId === "downloads_playlist"){
        window.filteredPlaylistBeats = getDownloadsPlaylist()
        window.__CURRENT_PLAYLIST_ID__ = "downloads_playlist"
    } else {
        const playlists = window.getPlaylists() || []
        const playlist = playlists.find(p => p.id === playlistId)
        window.filteredPlaylistBeats = (playlist?.beats || []).map(normalizeBeat)
        window.__CURRENT_PLAYLIST_ID__ = playlistId
    }
   
    renderActiveView()
}

// ===============================
// 🔥 RENDER ACTIVE VIEW HELPER
// ===============================
function renderActiveView(){
    const listBtn = document.getElementById("listBtn")
    const listSection = document.getElementById("arsenalSection")
    const gridSection = document.getElementById("gridSection")

    if(listBtn.classList.contains("active")){
        listSection.style.display = "block"
        gridSection.style.display = "none"
        renderWave()
    } else {
        listSection.style.display = "none"
        gridSection.style.display = "block"
        renderGridView()
    }
}

// GET BEAT ID FROM URL
const urlParams = new URLSearchParams(window.location.search);
const beatId = urlParams.get('id');

// GET CART FROM STORAGE
const cart = JSON.parse(localStorage.getItem('cart') || '[]');

// LOAD BEAT IF ID EXISTS
if(beatId){
  loadBeat(beatId);
  renderSimilarTracks(beatId);
}

// FOR EMPTY CART STATE
if(cart.length === 0){
  renderSimilarTracks();
}

// ===============================
// 🔥 UPDATE URL WITHOUT RELOAD
// ===============================
function updateURL(playlistId){
    const url = new URL(window.location)
    url.searchParams.set("id", playlistId)
    window.history.pushState({}, "", url)
}

// ===============================
// 🎯 TOGGLE SYSTEM
// ===============================
function initToggle(){
    const listBtn = document.getElementById("listBtn")
    const gridBtn = document.getElementById("gridBtn")
    const listSection = document.getElementById("arsenalSection")
    const gridSection = document.getElementById("gridSection")

    if(!listBtn ||!gridBtn) return

    listBtn.addEventListener("click", () => {
        listSection.style.display = "block"
        gridSection.style.display = "none"
        listBtn.classList.add("active")
        gridBtn.classList.remove("active")
        renderWave()
    })

    gridBtn.addEventListener("click", () => {
        listSection.style.display = "none"
        gridSection.style.display = "block"
        gridBtn.classList.add("active")
        listBtn.classList.remove("active")
        renderGridView()
    })
}

// ===============================
// 🔍 SEARCH - PLAYLIST FIRST + GLOBAL ARSENAL
// ===============================
function initPlaylistSearch(){
    const input = document.getElementById('beatSearch');
    const dropdown = document.getElementById('searchDropdown');
   
    if (!input ||!dropdown) {
        console.log('[Search] Input not found - skipping');
        return;
    }

    input.value = '';
    setTimeout(() => input.value = '', 100);

    let searchTimeout;
    let currentResults = [];

    input.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim().toLowerCase();

        searchTimeout = setTimeout(() => {
            if (!query) {
                dropdown.classList.remove('active');
                loadPlaylistById(window.__CURRENT_PLAYLIST_ID__ || "liked_playlist")
                return;
            }

            const playlists = window.getPlaylists() || []
            const likedBeats = getLikedPlaylist()
            const downloadsBeats = getDownloadsPlaylist()
           
            let playlistResults = []
           
            likedBeats.forEach(beat => {
                if (matchesQuery(beat, query)) {
                    playlistResults.push({
                   ...beat,
                        _playlistTag: 'Liked',
                        _playlistId: 'liked_playlist'
                    })
                }
            })
           
            downloadsBeats.forEach(beat => {
                if (matchesQuery(beat, query)) {
                    playlistResults.push({
                   ...beat,
                        _playlistTag: 'Downloads',
                        _playlistId: 'downloads_playlist'
                    })
                }
            })
           
            playlists.forEach(pl => {
                if (pl.isLiked) return
                pl.beats?.forEach(beat => {
                    const normalizedBeat = normalizeBeat(beat);
                    if (matchesQuery(normalizedBeat, query)) {
                        playlistResults.push({
                       ...normalizedBeat,
                            _playlistTag: pl.name,
                            _playlistId: pl.id
                        })
                    }
                })
            })

            if (playlistResults.length === 0) {
                const allBeats = window.store?.beats || window.allBeats || window.beats || []
               
                console.log('🔍 Searching global arsenal:', allBeats.length, 'beats')
               
                const globalResults = allBeats
               .filter(beat => matchesQuery(beat, query))
               .map(beat => ({
                   ...beat,
                        _playlistTag: 'Beats Arsenal',
                        _playlistId: 'global',
                        _isGlobal: true
                    }))
               
                if (globalResults.length > 0) {
                    showDropdown(globalResults.slice(0, 8), true)
                    window.filteredPlaylistBeats = globalResults
                    renderActiveView()
                    currentResults = globalResults
                    return
                }
            }

            if (playlistResults.length > 0) {
                const currentId = window.__CURRENT_PLAYLIST_ID__
                playlistResults.forEach(r => {
                    if (r._playlistId === currentId) {
                        r._playlistTag = null
                    }
                })
               
                showDropdown(playlistResults.slice(0, 8), false)
                window.filteredPlaylistBeats = playlistResults
                renderActiveView()
                currentResults = playlistResults
            } else {
                showInfiniteRespawn()
                window.filteredPlaylistBeats = []
                renderActiveView()
                currentResults = []
            }

        }, 150);
    });

    function matchesQuery(beat, query) {
        const searchable = [
            beat.title,
            beat.genre,
            beat.tags?.join(' '),
            beat.key,
            beat.mood,
            beat.bpm,
            beat.name
        ].map(x => String(x || '').toLowerCase()).join(' ');
       
        return searchable.includes(query);
    }

    function showDropdown(beats, isGlobal) {
        dropdown.innerHTML = '';
       
        if (isGlobal) {
            const header = document.createElement('div');
            header.className = 'search-item';
            header.style = 'justify-content:center;color:#00eaff;font-size:11px;font-family:Poppins;background:rgba(0,234,255,0.08);font-weight:500;';
            header.innerHTML = '🔥 From Beats Arsenal';
            dropdown.appendChild(header);
        }
       
        beats.forEach((beat) => {
            const item = document.createElement('div');
            item.className = 'search-item';
            item.innerHTML = `
                <img src="${beat.cover_url || beat.cover || 'images/logo.png'}" />
                <div class="search-item-info">
                    <div class="search-item-title">
                        ${beat.title || beat.name}
                    </div>
                    <div class="search-item-meta">
                        ${beat.genre || 'Unknown'} • ${beat.bpm || '--'} BPM
                        ${beat._playlistTag? `<span style="color:rgba(0,234,255,0.7);font-size:10px;font-weight:400;margin-left:8px;font-style:italic;">${beat._playlistTag}</span>` : ''}
                    </div>
                </div>
                <div class="search-item-play">▶</div>
            `;
           
            item.onclick = () => {
                input.value = beat.title || beat.name;
                dropdown.classList.remove('active');
               
                if (window.globalPlayer) {
                    window.globalPlayer.play(0, [beat], beat._isGlobal? "global_search" : "playlist_search");
                }
               
                window.filteredPlaylistBeats = [beat]
                renderActiveView()
            };
           
            dropdown.appendChild(item);
        });
        dropdown.classList.add('active');
    }

    function showInfiniteRespawn() {
        dropdown.innerHTML = `
            <div class="search-item" style="justify-content:center;color:#00eaff;font-size:13px;font-family:Poppins;">
                💀 No matches in playlists or arsenal
            </div>
        `;
        dropdown.classList.add('active');
        setTimeout(() => dropdown.classList.remove('active'), 2000);
    }

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.arsenal-search')) {
            dropdown.classList.remove('active');
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && currentResults.length > 0) {
            e.preventDefault();
            const firstBeat = currentResults[0];
            input.value = firstBeat.title || firstBeat.name;
            dropdown.classList.remove('active');
           
            if (window.globalPlayer) {
                window.globalPlayer.play(0, [firstBeat], firstBeat._isGlobal? "global_search" : "playlist_search");
            }
            window.filteredPlaylistBeats = [firstBeat]
            renderActiveView()
        }
       
        if (e.key === 'Escape') {
            input.value = '';
            input.dispatchEvent(new Event('input'));
            input.blur();
        }
    });

    console.log('[Search] Playlist-First + Global Arsenal ✅');
}

// ===============================
// 🎯 FILTER TO SIGHT - GP TRIGGER
// ===============================
window.filterBeatsToSight = function(beats) {
    const input = document.getElementById('beatSearch')
    if (input && beats.length === 1) {
        input.value = beats[0].title || beats[0].name
    }
   
    window.filteredPlaylistBeats = beats
    renderActiveView()
   
    console.log('🎯 Filtered to sight:', beats[0]?.title || beats[0]?.name)
}

// ===============================
// 🔳 GRID VIEW - PREMIUM TAGS
// ===============================
function renderGridView(){
    const container = document.getElementById("gridContainer")
    if(!container) return

    const beats = window.filteredPlaylistBeats || []
    container.className = "beats-grid"
    container.innerHTML = ""

    if(!beats.length){
        container.innerHTML = `<div class="empty-playlist">No beats found</div>`
        return
    }

    beats.forEach((beat,index) => {
        const card = document.createElement("div")
        card.className = "beat-card latest-beat-card"
        card.dataset.beatId = beat.id

        card.innerHTML = `
        <div class="beat-cover-wrap">
            <img src="${beat.cover_url || beat.cover || "images/logo.png"}" class="beat-cover">
            <button class="beat-play-btn" data-index="${index}">▶</button>
        </div>
        <div class="beat-info">
            <div class="beat-title">
                ${beat.title || beat.name || "Untitled"}
            </div>
            <div class="beat-meta">
                #${beat.genre || "Trap"}
                ${beat._playlistTag? `<span style="color:rgba(0,234,255,0.6);font-size:10px;font-weight:300;margin-left:6px;font-style:italic;letter-spacing:0.3px;">${beat._playlistTag}</span>` : ''}
            </div>
        </div>
        <div class="beat-price-row">
            <span class="beat-old-price">$49</span>
            <span class="beat-price">$19</span>
        </div>
        <button class="beat-buy-btn">Add To Cart</button>
        `

        card.querySelector(".beat-play-btn").onclick = (e) => {
            e.stopPropagation()
            if(window.globalPlayer){
                window.globalPlayer.play(index, beats, beat._isGlobal? "global_search" : "playlist_grid")
            } else {
                console.error("globalPlayer not loaded")
            }
        }

        const addBtn = card.querySelector(".beat-buy-btn")
       
        let cart = JSON.parse(localStorage.getItem("dopetone_cart")) || []
        const exists = cart.find(item => item.id == beat.id)
       
        if(exists){
            addBtn.textContent = "Remove"
            addBtn.classList.add("added")
        } else {
            addBtn.textContent = "Add To Cart"
            addBtn.classList.remove("added")
        }

        addBtn.onclick = async (e) => {
            e.stopPropagation()
           
            const btn = e.currentTarget
            let cart = JSON.parse(localStorage.getItem("dopetone_cart")) || []
            const exists = cart.find(item => item.id == beat.id)

            if(exists){
                cart = cart.filter(item => item.id!= beat.id)
                localStorage.setItem("dopetone_cart", JSON.stringify(cart))
                btn.textContent = "Add To Cart"
                btn.classList.remove("added")
            } else {
                const newBeat = normalizeBeat(beat) // 🔥 NORMALIZE
                cart.push(newBeat)
                localStorage.setItem("dopetone_cart", JSON.stringify(cart))
                btn.textContent = "Added ✓"
                btn.classList.add("added")

                const hasActiveTrack = window.currentBeat || window.activeCartBeat
                if(!hasActiveTrack && typeof window.switchActiveBeat === "function"){
                    await window.switchActiveBeat(newBeat)
                }
                else{
                    window.renderCartBeatRow?.()
                }
            }

            if(typeof window.renderCartBeatRow === "function"){
                window.renderCartBeatRow()
            }
            if(typeof window.updateCartCount === "function"){
                window.updateCartCount()
            }
            if(typeof window.checkEmptyState === "function"){
                window.checkEmptyState()
            }
        }

        container.appendChild(card)
    })

    syncGridPlayButtons()
}

// ===============================
// 🔄 SYNC GRID PLAY BUTTONS
// ===============================
function syncGridPlayButtons(){
    const allBtns = document.querySelectorAll(".beat-play-btn")
   
    allBtns.forEach(btn => {
        btn.textContent = "▶"
        btn.classList.remove("active")
    })

    const currentBeat = window.__CURRENT_BEAT__
    const isPlaying = window.globalPlayer?.isPlaying()

    if(!currentBeat ||!isPlaying) return

    const activeCard = document.querySelector(`.beat-card[data-beat-id="${currentBeat.id}"]`)
    if(activeCard){
        const btn = activeCard.querySelector(".beat-play-btn")
        if(btn){
            btn.textContent = "⏸"
            btn.classList.add("active")
        }
    }
}

// ===============================
// 🎯 LISTEN FOR PLAYER EVENTS
// ===============================

document.addEventListener("playerPlay", (e) => {
    syncGridPlayButtons()
})

document.addEventListener("playerPause", () => {
    document.querySelectorAll(".beat-play-btn").forEach(btn => {
        btn.textContent = "▶"
        btn.classList.remove("active")
    })
})

document.addEventListener("trackChange", (e) => {
    syncGridPlayButtons()
})

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(syncGridPlayButtons, 300)
})

// ========================================
// 🔥 PLAYLIST CAPSULE DRAG SCROLL
// ========================================
const capsules = document.querySelector(".playlist-capsules")
if(capsules){
    let isDown = false
    let startX = 0
    let scrollLeft = 0

    capsules.addEventListener("mousedown", e => {
        isDown = true
        capsules.classList.add("dragging")
        startX = e.pageX
        scrollLeft = capsules.scrollLeft
    })

    window.addEventListener("mouseup", () => {
        isDown = false
        capsules.classList.remove("dragging")
    })

    capsules.addEventListener("mousemove", e => {
        if(!isDown) return
        e.preventDefault()
        const walk = (e.pageX - startX) * 1.4
        capsules.scrollLeft = scrollLeft - walk
    })

    let touchStartX = 0
    let touchScrollLeft = 0

    capsules.addEventListener("touchstart", e => {
        touchStartX = e.touches[0].clientX
        touchScrollLeft = capsules.scrollLeft
    }, { passive:true })

    capsules.addEventListener("touchmove", e => {
        const touchX = e.touches[0].clientX
        const walk = (touchX - touchStartX) * 1.3
        capsules.scrollLeft = touchScrollLeft - walk
    }, { passive:true })
}

// ========================================
// ❤️ GLOBAL LIKE SYSTEM - LOCAL ONLY
// ========================================

document.addEventListener("DOMContentLoaded", () => {
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

    function isBeatLiked(beat){
        if(!beat) return false
        const liked = getLikedBeats()
        return liked.includes(String(beat.id))
    }

    function refreshDesktopHeart(){
        const btn = document.getElementById("loveTrackBtn")
        const beat = window.__CURRENT_BEAT__
        if(!btn ||!beat) return
        const liked = isBeatLiked(beat)
        btn.classList.toggle("active", liked)
        const heart = btn.querySelector(".love-heart")
        if(heart) heart.textContent = liked? "❤️" : "♡"
    }

    function refreshMobileHeart(){
        const btn = document.getElementById("mpLike")
        const beat = window.__CURRENT_BEAT__
        if(!btn ||!beat) return
        const liked = isBeatLiked(beat)
        btn.innerHTML = `<span class="love-heart">${liked? "❤️" : "♡"}</span>`
    }

    function refreshLikeUI(){
        refreshDesktopHeart()
        refreshMobileHeart()
    }

    function updateLikedPlaylist(beat, shouldLike){
        let playlists = getPlaylists()
        let likedPlaylist = playlists.find(p => p.isLiked)
        const normalizedBeat = normalizeBeat(beat)

        if(shouldLike &&!likedPlaylist){
            likedPlaylist = {
                id: "liked_playlist",
                name: "Liked",
                isLiked: true,
                beats: []
            }
            playlists.unshift(likedPlaylist)
        }

        if(likedPlaylist){
            if(shouldLike){
                const exists = likedPlaylist.beats.some(b => String(b.id) === String(normalizedBeat.id))
                if(!exists) likedPlaylist.beats.push(normalizedBeat)
            } else {
                likedPlaylist.beats = likedPlaylist.beats.filter(b => String(b.id)!== String(normalizedBeat.id))
                if(likedPlaylist.beats.length === 0){
                    playlists = playlists.filter(p =>!p.isLiked)
                }
            }
        }
        savePlaylists(playlists)
    }

    function toggleBeatLike(){
        const beat = window.__CURRENT_BEAT__
        if(!beat) return
        let liked = getLikedBeats()
        const exists = liked.includes(String(beat.id))

        if(exists){
            liked = liked.filter(id => String(id)!== String(beat.id))
            updateLikedPlaylist(beat, false)
        } else {
            liked.push(String(beat.id))
            updateLikedPlaylist(beat, true)
        }

        saveLikedBeats(liked)

        const countEl = document.getElementById("likeCount")
        if(countEl){
            let current = Number(countEl.textContent || 0)
            countEl.textContent = exists? Math.max(0, current - 1) : current + 1
            const cached = JSON.parse(localStorage.getItem("dopetone_like_counts")) || {}
            cached[beat.id] = Number(countEl.textContent)
            localStorage.setItem("dopetone_like_counts", JSON.stringify(cached))
        }

        // 🔥 SUPABASE REMOVED - NO MORE SYNC
        refreshLikeUI()
        window.dispatchEvent(new Event("playlistsUpdated"))
        window.dispatchEvent(new Event("playlistVisualUpdate"))
    }

    const desktopHeart = document.getElementById("loveTrackBtn")
    if(desktopHeart) desktopHeart.onclick = toggleBeatLike

    const mobileHeart = document.getElementById("mpLike")
    if(mobileHeart) mobileHeart.onclick = toggleBeatLike

    document.addEventListener("trackChange", refreshLikeUI)
    document.addEventListener("playerPlay", refreshLikeUI)
    window.addEventListener("storage", refreshLikeUI)
    setTimeout(refreshLikeUI, 100)

    window.refreshLikeUI = refreshLikeUI
    window.refreshMobileHeart = refreshMobileHeart
    window.toggleBeatLike = toggleBeatLike
})

// =====================================
// ☁️ SUPABASE REMOVED - CLOUDFLARE ONLY
// =====================================
// async function syncGlobalLike REMOVED

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
