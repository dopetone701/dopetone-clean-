// playlist-similar.js - FULL FIXED - SIMILAR + RECENT BOTH WORK + D1
const API_URL = 'https://api.dopetonevault.com';
const STATS_API = 'https://dopetone-stats.dopetone701.workers.dev';

function getD1UserKey() {
  if (!localStorage.getItem('dopetone_device_id')) {
    localStorage.setItem('dopetone_device_id', Math.random().toString(36).slice(2) + Date.now());
  }
  return window.Auth?.user?.id || localStorage.getItem('dopetone_user_id') || `anon_${localStorage.getItem('dopetone_device_id')}`;
}

function addToRecentlyViewed(beat) {
    if (!beat) return
    const id = beat.id || beat.beat_id || beat._id || beat.uuid
    if (!id) return
    let recent = JSON.parse(localStorage.getItem("dopetone_recent")) || []
    const beatData = {
        id: id,
        title: beat.title || beat.name || "Untitled",
        cover: beat.cover_url || beat.cover || "images/studio.jpg",
        cover_url: beat.cover_url || beat.cover,
        genre: beat.genre || "Trap",
        bpm: beat.bpm || 140,
        mp3_url: beat.mp3_url || beat.audio,
        audio: beat.mp3_url || beat.audio,
        mood: beat.mood || "",
        type: beat.type || "",
        key: beat.key || "",
        zip_url: beat.zip_url || ""
    }
    recent = recent.filter(item => item.id != beatData.id)
    recent.unshift(beatData)
    recent = recent.slice(0, 8)
    localStorage.setItem("dopetone_recent", JSON.stringify(recent))
    renderRecentTracks()
}

export async function renderRecentTracks() {
    const ids = ["recentTrack", "rpTrackMount", "recentPlayedMount", "recentPlayedWrap"];
    const containers = ids.map(id => document.getElementById(id)).filter(Boolean);
    if(!containers.length) return
    
    let recent = JSON.parse(localStorage.getItem("dopetone_recent")) || []
    
    containers.forEach(container => {
        if(!recent.length){
            // If it's the wrapper, look inside for mount
            if (container.id === "recentPlayedWrap") {
                const inner = document.getElementById("rpTrackMount");
                if (inner) inner.innerHTML = `<div class="empty-playlist">Play some beats to see them here</div>`
                return;
            }
            container.innerHTML = `<div class="empty-playlist">Play some beats to see them here</div>`
            return
        }
        
        // If container is the wrap, use inner mount
        let target = container;
        if (container.id === "recentPlayedWrap") {
            target = document.getElementById("rpTrackMount");
            if (!target) return;
        }
        
        target.innerHTML = ""
        recent.forEach((beat, index) => {
            const card = document.createElement("div")
            card.className = "recent-card"
            card.dataset.index = index
            card.innerHTML = `
                <div style="position: relative;">
                  <img src="${beat.cover}">
                  <button class="play-overlay featured-play">
                    <span class="play-icon">▶</span>
                  </button>
                </div>
                <div class="featured-content">
                  <div class="featured-title">${beat.title}</div>
                  <div class="featured-meta">${beat.genre} • ${beat.bpm} BPM</div>
                  <div class="featured-price">
                    <span class="old">$49</span>
                    <span class="new">$19</span>
                  </div>
                  <button class="featured-buy">Add To Cart</button>
                </div>
            `
            card.querySelector(".featured-play").onclick = (e) => {
                e.stopPropagation()
                addToRecentlyViewed(beat)
                const audio = window.__PLAYER__
                const isSameTrack = window.__CURRENT_LIST__ === "playlist-recent" && window.__CURRENT_INDEX__ === index
                if (isSameTrack && audio) {
                    if (audio.paused) audio.play()
                    else audio.pause()
                } else {
                    window.globalPlayer?.play(index, recent, "playlist-recent")
                }
            }
            const viewBtn = card.querySelector(".featured-buy")
            updateCartButtonState(viewBtn, beat)
            viewBtn.onclick = (e) => {
                e.stopPropagation()
                handleCartToggle(viewBtn, beat)
            }
            target.appendChild(card)
        })
    })
}

export async function renderPlaylistSimilarTracks(currentBeatId = null) {
    const container = document.getElementById("similarTrack")
    if(!container) return

    try{
        let beats = []
        try {
            const res = await fetch(`${API_URL}/api/beats`);
            if (res.ok) {
                beats = await res.json();
            } else {
                throw new Error('api beats failed');
            }
        } catch(err) {
            const res2 = await fetch(`${STATS_API}/api/stats/top`);
            if (res2.ok) {
                beats = await res2.json();
            }
        }

        if(!beats?.length){
            const playlists = JSON.parse(localStorage.getItem("playlists") || "[]");
            beats = playlists.flatMap(p => p.beats || []).slice(0,10);
        }

        if(!beats?.length){
            container.innerHTML = `<div class="empty-playlist">No tracks found - add some beats first</div>`
            return
        }

        beats = beats.map(b => ({
            ...b,
            audio: b.mp3_url || b.audio,
            cover: b.cover_url || b.cover,
            mp3_url: b.mp3_url || b.audio,
            cover_url: b.cover_url || b.cover
        }));

        if (currentBeatId) {
            beats = beats.filter(b => String(b.id) !== String(currentBeatId));
        }

        container.innerHTML = ""
        beats = beats.sort(() => Math.random() - 0.5).slice(0, 10)

        beats.forEach((beat, index) => {
            const card = document.createElement("div")
            card.className = "featured-card"
            card.dataset.index = index
            card.innerHTML = `
                <div style="position: relative;">
                  <img src="${beat.cover_url || beat.cover || "images/studio.jpg"}">
                  <button class="play-overlay featured-play">
                    <span class="play-icon">▶</span>
                  </button>
                </div>
                <div class="featured-content">
                  <div class="featured-title">${beat.title || beat.name || "Untitled"}</div>
                  <div class="featured-meta">
                    ${beat.genre || "Trap"} • ${beat.bpm || 140} BPM
                  </div>
                  <div class="featured-price">
                    <span class="old">$49</span>
                    <span class="new">$19</span>
                  </div>
                  <button class="featured-buy">Add To Cart</button>
                </div>
            `
            card.querySelector(".featured-play").onclick = (e) => {
                e.stopPropagation()
                addToRecentlyViewed(beat)
                const audio = window.__PLAYER__
                const isSameTrack = window.__CURRENT_LIST__ === "playlist-similar" && window.__CURRENT_INDEX__ === index
                if (isSameTrack && audio) {
                    if (audio.paused) audio.play()
                    else audio.pause()
                } else {
                    window.globalPlayer?.play(index, beats, "playlist-similar")
                }
            }
            const viewBtn = card.querySelector(".featured-buy")
            updateCartButtonState(viewBtn, beat)
            viewBtn.onclick = (e) => {
                e.stopPropagation()
                handleCartToggle(viewBtn, beat)
            }
            container.appendChild(card)
        })

        enableCinematic(container)
        initSimilarDragScroll()
        syncPlayButtons()
        // Don't call renderRecentTracks here to avoid loop, call separately
       
        console.log("✅ Similar tracks loaded")

    }catch(err){
        console.log("Similar tracks error:", err)
        container.innerHTML = `<div class="empty-playlist">Failed to load tracks - check API</div>`
    }
}

export const renderSimilarTracks = renderPlaylistSimilarTracks;

function updateCartButtonState(btn, beat) {
    let cart = JSON.parse(localStorage.getItem("dopetone_cart")) || []
    const exists = cart.find(item => item.id == beat.id)
    if(exists){
        btn.textContent = "Remove"
        btn.classList.add("added")
    } else {
        btn.textContent = "Add To Cart"
        btn.classList.remove("added")
    }
}

function handleCartToggle(btn, beat) {
    let cart = JSON.parse(localStorage.getItem("dopetone_cart")) || []
    const exists = cart.find(item => item.id == beat.id)
    const userKey = getD1UserKey();

    if(exists){
        cart = cart.filter(item => item.id != beat.id)
        localStorage.setItem("dopetone_cart", JSON.stringify(cart))
        btn.textContent = "Add To Cart"
        btn.classList.remove("added")
        fetch(`${STATS_API}/api/stats/untrack`, {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({beat_id: parseInt(beat.id), event_type: 'cart', user_id: userKey})
        }).catch(()=>{});
    } else {
        const newBeat = {
            id: beat.id || beat.beat_id || beat._id,
            title: beat.title || beat.name,
            cover: beat.cover_url || beat.cover,
            cover_url: beat.cover_url || beat.cover,
            genre: beat.genre,
            bpm: beat.bpm,
            audio: beat.mp3_url || beat.audio,
            mp3_url: beat.mp3_url || beat.audio,
            zip_url: beat.zip_url,
            mood: beat.mood,
            type: beat.type,
            key: beat.key
        }
        cart.push(newBeat)
        localStorage.setItem("dopetone_cart", JSON.stringify(cart))
        btn.textContent = "Added ✓"
        btn.classList.add("added")
        fetch(`${STATS_API}/api/stats/event`, {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({beatId: parseInt(beat.id), eventType: 'cart', user_id: userKey})
        }).catch(()=>{});
        const hasActiveTrack = window.currentBeat || window.activeCartBeat
        if(!hasActiveTrack && typeof window.switchActiveBeat === "function"){
            window.switchActiveBeat(newBeat)
        } else{
            window.renderCartBeatRow?.()
        }
    }
    if(typeof window.renderCartBeatRow === "function") window.renderCartBeatRow()
    if(typeof window.updateCartCount === "function") window.updateCartCount()
    if(typeof window.checkEmptyState === "function") window.checkEmptyState()
    document.dispatchEvent(new CustomEvent("cartUpdated"))
}

function syncPlayButtons() {
    document.removeEventListener("playerPlay", updatePlayIcons)
    document.removeEventListener("playerPause", updatePauseIcons)
    document.addEventListener("playerPlay", updatePlayIcons)
    document.addEventListener("playerPause", updatePauseIcons)
    updateIconsFromGlobalState()
}
function updatePlayIcons(e) {
    const { index, listId } = e.detail
    document.querySelectorAll("#similarTrack .play-icon, #recentTrack .play-icon, #rpTrackMount .play-icon").forEach(icon => { icon.textContent = "▶" })
    if (listId === "playlist-similar") {
        const card = document.querySelector(`#similarTrack .featured-card[data-index="${index}"]`)
        if (card) card.querySelector(".play-icon").textContent = "⏸"
    }
    if (listId === "playlist-recent") {
        const sel = `#recentTrack .recent-card[data-index="${index}"], #rpTrackMount .recent-card[data-index="${index}"]`
        const card = document.querySelector(sel)
        if (card) card.querySelector(".play-icon").textContent = "⏸"
    }
}
function updatePauseIcons() {
    if (window.__CURRENT_LIST__ === "playlist-similar") {
        const card = document.querySelector(`#similarTrack .featured-card[data-index="${window.__CURRENT_INDEX__}"]`)
        if (card) card.querySelector(".play-icon").textContent = "▶"
    }
    if (window.__CURRENT_LIST__ === "playlist-recent") {
        const card = document.querySelector(`#recentTrack .recent-card[data-index="${window.__CURRENT_INDEX__}"], #rpTrackMount .recent-card[data-index="${window.__CURRENT_INDEX__}"]`)
        if (card) card.querySelector(".play-icon").textContent = "▶"
    }
}
function updateIconsFromGlobalState() {
    if (!window.__PLAYER__?.paused) {
        if (window.__CURRENT_LIST__ === "playlist-similar") {
            const card = document.querySelector(`#similarTrack .featured-card[data-index="${window.__CURRENT_INDEX__}"]`)
            if (card) card.querySelector(".play-icon").textContent = "⏸"
        }
        if (window.__CURRENT_LIST__ === "playlist-recent") {
            const card = document.querySelector(`#recentTrack .recent-card[data-index="${window.__CURRENT_INDEX__}"], #rpTrackMount .recent-card[data-index="${window.__CURRENT_INDEX__}"]`)
            if (card) card.querySelector(".play-icon").textContent = "⏸"
        }
    }
}
function enableCinematic(container) {
  const cards = container.querySelectorAll(".featured-card")
  cards.forEach(card => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      card.style.setProperty("--x", `${x}%`)
      card.style.setProperty("--y", `${y}%`)
    })
    card.addEventListener("mouseleave", () => {
      card.style.setProperty("--x", "50%")
      card.style.setProperty("--y", "50%")
    })
  })
}
function initSimilarDragScroll(){
    const slider = document.getElementById("similarTrack")
    if(!slider) return
    let isDown = false, startX, scrollLeft
    slider.addEventListener("mousedown", (e) => {
        isDown = true
        slider.classList.add("dragging")
        startX = e.pageX - slider.offsetLeft
        scrollLeft = slider.scrollLeft
    })
    slider.addEventListener("mouseleave", () => { isDown = false; slider.classList.remove("dragging") })
    slider.addEventListener("mouseup", () => { isDown = false; slider.classList.remove("dragging") })
    slider.addEventListener("mousemove", (e) => {
        if(!isDown) return
        e.preventDefault()
        const x = e.pageX - slider.offsetLeft
        const walk = (x - startX) * 1.6
        slider.scrollLeft = scrollLeft - walk
    })
}
