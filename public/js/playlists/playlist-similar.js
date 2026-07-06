// js/playlists/playlist-similar.js
// ========================================
// 🔥 SIMILAR TRACKS + RECENTLY VIEWED - CLOUDFLARE
// ========================================

const API_URL = 'https://api.dopetonevault.com/api/beats'

// ===============================
// 🕐 RECENT TRACKER - LOCAL TO THIS FILE
// ===============================
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
    renderRecentTracks() // Re-render recent section immediately
}

export async function renderRecentTracks() {
    const container = document.getElementById("recentTrack")
    if(!container) return
   
    let recent = JSON.parse(localStorage.getItem("dopetone_recent")) || []
   
    if(!recent.length){
        container.innerHTML = `<div class="empty-playlist">Play some beats to see them here</div>`
        return
    }
   
    container.innerHTML = ""
   
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
              <button class="featured-buy">View Beat</button>
            </div>
        `
       
        // PLAY
        card.querySelector(".featured-play").onclick = (e) => {
            e.stopPropagation()
            addToRecentlyViewed(beat) // Move to front
           
            const audio = window.__PLAYER__
            const isSameTrack = window.__CURRENT_LIST__ === "playlist-recent" &&
                               window.__CURRENT_INDEX__ === index
           
            if (isSameTrack && audio) {
                if (audio.paused) audio.play()
                else audio.pause()
            } else {
                window.globalPlayer?.play(index, recent, "playlist-recent")
            }
        }
       
        // 🔥 VIEW BEAT = ADD/REMOVE CART (LIKE WAVE BUY BTN)
        const viewBtn = card.querySelector(".featured-buy")
        updateCartButtonState(viewBtn, beat)
       
        viewBtn.onclick = (e) => {
            e.stopPropagation()
            handleCartToggle(viewBtn, beat)
        }
       
        container.appendChild(card)
    })
}

// ===============================
// 🔥 SIMILAR TRACKS RENDER - CLOUDFLARE D1
// ===============================
export async function renderPlaylistSimilarTracks() {
    const container = document.getElementById("similarTrack")
    if(!container) return

    try{
        // 🔥 FETCH FROM YOUR CLOUDFLARE API INSTEAD OF SUPABASE
        const res = await fetch(`${API_URL}/beats`);
        if (!res.ok) throw new Error('Failed to fetch beats');

        let beats = await res.json()
        if(!beats?.length){
            container.innerHTML = `<div class="empty-playlist">No tracks found</div>`
            return
        }

        // Normalize fields for frontend
        beats = beats.map(b => ({
            ...b,
            audio: b.mp3_url,
            cover: b.cover_url,
            mp3_url: b.mp3_url,
            cover_url: b.cover_url
        }));

        container.innerHTML = ""
        beats = beats.sort(() => Math.random() - 0.5).slice(0, 10) // Random 10

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
                  <button class="featured-buy">View Beat</button>
                </div>
            `

            // PLAY BUTTON - SAVE TO RECENT
            card.querySelector(".featured-play").onclick = (e) => {
                e.stopPropagation()
                addToRecentlyViewed(beat) // <- SAVE TO RECENT HERE
               
                const audio = window.__PLAYER__
                const isSameTrack = window.__CURRENT_LIST__ === "playlist-similar" &&
                                   window.__CURRENT_INDEX__ === index
               
                if (isSameTrack && audio) {
                    if (audio.paused) audio.play()
                    else audio.pause()
                } else {
                    window.globalPlayer?.play(index, beats, "playlist-similar")
                }
            }

            // 🔥 VIEW BEAT = ADD/REMOVE CART (LIKE WAVE BUY BTN)
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
        renderRecentTracks() // <- RENDER RECENT AFTER SIMILAR LOADS
       
        console.log("✅ Similar tracks loaded from Cloudflare")

    }catch(err){
        console.log("Similar tracks error:", err)
        container.innerHTML = `<div class="empty-playlist">Failed to load tracks</div>`
    }
}

// ===============================
// 🛒 CART TOGGLE - WAVE BUY BUTTON LOGIC
// ===============================
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

    // ====================================
    // ❌ REMOVE
    // ====================================
    if(exists){
        cart = cart.filter(item => item.id != beat.id)
        localStorage.setItem("dopetone_cart", JSON.stringify(cart))
       
        btn.textContent = "Add To Cart"
        btn.classList.remove("added")
       
    } else {
        // ====================================
        // 🛒 ADD
        // ====================================
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

        // ====================================
        // 🔥 ONLY SWITCH IF NO ACTIVE TRACK
        // ====================================
        const hasActiveTrack = window.currentBeat || window.activeCartBeat

        // 🔥 FIRST TRACK EVER
        if(!hasActiveTrack && typeof window.switchActiveBeat === "function"){
            window.switchActiveBeat(newBeat)
        }
        // 🔥 OTHERWISE: only render row, keep current active beat
        else{
            window.renderCartBeatRow?.()
        }
    }

    // ====================================
    // 🔄 REFRESH UI
    // ====================================
    if(typeof window.renderCartBeatRow === "function"){
        window.renderCartBeatRow()
    }
    if(typeof window.updateCartCount === "function"){
        window.updateCartCount()
    }
    if(typeof window.checkEmptyState === "function"){
        window.checkEmptyState()
    }
   
    // Dispatch cart updated event
    document.dispatchEvent(new CustomEvent("cartUpdated"))
}

// 🔥 GLOBAL PLAY BUTTON SYNC
function syncPlayButtons() {
    document.removeEventListener("playerPlay", updatePlayIcons)
    document.removeEventListener("playerPause", updatePauseIcons)
    document.addEventListener("playerPlay", updatePlayIcons)
    document.addEventListener("playerPause", updatePauseIcons)
    updateIconsFromGlobalState()
}

function updatePlayIcons(e) {
    const { index, listId } = e.detail
    document.querySelectorAll("#similarTrack .play-icon, #recentTrack .play-icon").forEach(icon => {
        icon.textContent = "▶"
    })
    if (listId === "playlist-similar") {
        const card = document.querySelector(`#similarTrack .featured-card[data-index="${index}"]`)
        if (card) card.querySelector(".play-icon").textContent = "⏸"
    }
    if (listId === "playlist-recent") {
        const card = document.querySelector(`#recentTrack .recent-card[data-index="${index}"]`)
        if (card) card.querySelector(".play-icon").textContent = "⏸"
    }
}

function updatePauseIcons() {
    if (window.__CURRENT_LIST__ === "playlist-similar") {
        const card = document.querySelector(`#similarTrack .featured-card[data-index="${window.__CURRENT_INDEX__}"]`)
        if (card) card.querySelector(".play-icon").textContent = "▶"
    }
    if (window.__CURRENT_LIST__ === "playlist-recent") {
        const card = document.querySelector(`#recentTrack .recent-card[data-index="${window.__CURRENT_INDEX__}"]`)
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
            const card = document.querySelector(`#recentTrack .recent-card[data-index="${window.__CURRENT_INDEX__}"]`)
            if (card) card.querySelector(".play-icon").textContent = "⏸"
        }
    }
}

// HOVER LIGHT EFFECT
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

// DRAG SCROLL
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
