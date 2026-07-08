// ===============================
// WAVE SECTION (FILTER WIRED SAFE)
// ===============================
import { globalFilter } from '../global-filter.js'; // 🔥 ADD THIS LINE

const PLAY_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v14l11-7-11-7z"/></svg>`;
const PAUSE_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
const DOWNLOAD_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`;

let userSeekLock = null; // 🔥 FIX SEEK SNAP-BACK

export function renderWave(limit = null) {
  const container = document.getElementById("waveList")
  if (!container) return


  // 🔥 CHANGED: Use filter with fallback to existing logic
  const sourceBeats = window.filteredPlaylistBeats || globalFilter.filterBeats(window.store.beats, 'all') || []


  // 🔥 NEW: Hard limit 10 on index page
  const isIndexPage = window.location.pathname === "/" ||
                      window.location.pathname.includes("index.html") ||
                      window.location.pathname.endsWith("/5500/") ||
                      window.location.pathname.endsWith("/5500")


  let beats = Array.isArray(limit)
   ? limit
    : limit
   ? sourceBeats.slice(0, limit)
    : sourceBeats


  // Force 10 max on index unless explicit limit passed
  if (isIndexPage && !Array.isArray(limit) && limit === null) {
    beats = beats.slice(0, 10)
  }


  container.innerHTML = ""


  if(limit !== 0){
    beats.forEach((beat, index) => {
      const row = document.createElement("div")
      row.className = "wave-row"


      row.innerHTML = `
        <div class="wave-left">
          <div class="wave-cover-wrap">
            <img src="${beat.cover_url || beat.image || 'images/studio.jpg'}" />
            <button class="wave-play">${PLAY_SVG}</button>
          </div>
        </div>


        <div class="wave-info">
          <div class="wave-title">${beat.title}</div>
          <div class="wave-meta">
            ${beat.key || "--"} • ${beat.genre || "--"} • ${beat.bpm || "--"} BPM
          </div>
        </div>


        <div class="wave-bar" id="wave-${beat.id}"></div>


        <div class="wave-actions">
          <div class="wave-price">
            <span class="old-price">$${beat.old_price || 49}</span>
            <span class="new-price">$${beat.price || 19}</span>
          </div>
          <button class="wave-download">${DOWNLOAD_SVG}</button>
        </div>
      `


      container.appendChild(row)


      const btn = row.querySelector(".wave-play")
      const waveContainer = row.querySelector(`#wave-${beat.id}`)


      // 🌊 LIQUID WAVE – SEEK FIXED
      const wave = WaveSurfer.create({
        container: waveContainer,
        waveColor: "#1e293b",
        progressColor: "#ff003c",
        height: 40,
        barWidth: undefined,
        barGap: undefined,
        normalize: true,
        fillParent: true,
        partialRender: true,
        cursorWidth: 0,
        responsive: true,
        interact: true, // 🔥 ENABLE CLICK/TAP SEEK
        dragToSeek: true // 🔥 ENABLE DRAG SEEK
      })


      wave.load(beat.mp3_url || beat.audio)
      row.__wave = wave
      row.dataset.beatId = beat.id; // 🔥 FOR SEEK LOCK CHECK

      // 🔥 STOP ROW CLICK WHEN SEEKING
      waveContainer.addEventListener('click', (e) => e.stopPropagation());
      waveContainer.addEventListener('mousedown', (e) => e.stopPropagation());
      waveContainer.addEventListener('touchstart', (e) => e.stopPropagation());

      // 🔥 SYNC SEEK TO GLOBAL PLAYER – HARD LOCK
      wave.on('interaction', () => {
        userSeekLock = beat.id; // Lock this wave
        clearTimeout(window.__seekUnlockTimer);
        window.__seekUnlockTimer = setTimeout(() => { 
          userSeekLock = null; 
        }, 600); // 600ms lock
      });

      wave.on('seeking', (progress) => {
        const currentBeat = window.__CURRENT_BEAT__;
        const currentList = window.__CURRENT_LIST__;
        // AFTER - safe version
const duration = window.globalPlayer?.getDuration?.() || 0;

        
        if (currentBeat?.id === beat.id && currentList === 'wave' && duration) {
          const seekTime = progress * duration; // 🔥 CONVERT 0-1 TO SECONDS
          window.globalPlayer?.seek(seekTime);
        }
      });


      // ▶ GLOBAL PLAYER
      btn.onclick = (e) => {
        e.stopPropagation();
        window.globalPlayer.play(index, [...beats], "wave")
      }


      // CLICK SYSTEM
      row.addEventListener("click", (e) => {
        if (e.target.closest(".wave-play")) return
        if (e.target.closest(".wave-bar")) return // 🔥 DON'T TRIGGER BUY ON WAVE CLICK


        // 💳 BUY + AUTO CART
        if (e.target.closest(".wave-price")) {
          let cart = JSON.parse(localStorage.getItem("dopetone_cart")) || []
          const cartBeat = {
            id: beat.id,
            title: beat.title,
            cover: beat.cover_url,
            cover_url: beat.cover_url,
            genre: beat.genre,
            bpm: beat.bpm,
            audio: beat.mp3_url || beat.audio,
            mp3_url: beat.mp3_url,
            zip_url: beat.zip_url,
            mood: beat.mood,
            key: beat.key,
            type: beat.type
          }


          const exists = cart.find(item => item.id == beat.id)
          if(!exists){
            cart.push(cartBeat)
            localStorage.setItem("dopetone_cart", JSON.stringify(cart))
          }
          window.location.href = `licence-page.html?id=${beat.id}`
          return
        }


        if (e.target.closest(".wave-download")) {
          const email = prompt("Enter your email")
          if (!email) return
          alert("🔥 Download will be sent to: " + email)
        }
      })


      // 💀 DOUBLE CLICK → BUY
      row.addEventListener("dblclick", (e) => {
        if (e.target.closest(".wave-bar")) return // 🔥 DON'T BUY ON WAVE DOUBLE CLICK
        let cart = JSON.parse(localStorage.getItem("dopetone_cart")) || []
        const cartBeat = {
          id: beat.id,
          title: beat.title,
          cover: beat.cover_url,
          cover_url: beat.cover_url,
          genre: beat.genre,
          bpm: beat.bpm,
          audio: beat.mp3_url || beat.audio,
          mp3_url: beat.mp3_url,
          mood: beat.mood,
          key: beat.key,
          type: beat.type
        }


        const exists = cart.find(item => item.id == beat.id)
        if(!exists){
          cart.push(cartBeat)
          localStorage.setItem("dopetone_cart", JSON.stringify(cart))
        }
        window.location.href = `licence-page.html?id=${beat.id}`
      })
    })
  }


  // 🔥 EXPLORE MORE LICENCE PAGE
  const isLicencePage = window.location.pathname.includes("licence-page.html")
  const isAllBeatsPage = window.location.pathname.includes("beats.html")


  if (!isAllBeatsPage) {
    const exploreRow = document.createElement("div")
    exploreRow.className = "wave-row explore-row"
    exploreRow.innerHTML = `
      <div class="wave-left">
        <div class="wave-cover-wrap">
          <img src="images/logo.png" />
        </div>
      </div>
      <div class="wave-info">
        <div class="wave-title">
          ${isLicencePage? "Explore More Tracks" : "Explore More Beats"}
        </div>
        <div class="wave-meta">
          ${isLicencePage? "Find similar vibes →" : "Unlock full arsenal →"}
        </div>
      </div>
      <div class="wave-bar explore-bar">
        <div class="explore-line"></div>
      </div>
      <div class="wave-actions">
        <a href="beats.html" class="explore-btn">Explore</a>
      </div>
    `
    exploreRow.onclick = () => {
      window.location.href = "beats.html"
    }
    container.appendChild(exploreRow)
  }


  // 🔁 BUTTON SYNC
  document.removeEventListener("playerPlay", window.__wavePlaySync__)
  document.removeEventListener("playerPause", window.__wavePauseSync__)


  window.__wavePauseSync__ = () => {
    document.querySelectorAll(".wave-play").forEach(btn => {
      btn.innerHTML = PLAY_SVG
    })
  }
  document.addEventListener("playerPause", window.__wavePauseSync__)


  window.__wavePlaySync__ = (e) => {
    const { index, listId } = e.detail
    document.querySelectorAll(".wave-play").forEach((b, i) => {
      b.innerHTML = (listId === "wave" && i === index)? PAUSE_SVG : PLAY_SVG
    })
  }
  document.addEventListener("playerPlay", window.__wavePlaySync__)


  // 🎯 WAVE SYNC – FIXED SNAP BACK
  document.removeEventListener("playerTimeUpdate", window.__waveTimeSync__)


  window.__waveTimeSync__ = (e) => {
    const { index, percent, listId } = e.detail
    document.querySelectorAll(".wave-row").forEach((row, i) => {
      const wave = row.__wave
      const beatId = row.dataset.beatId;
      if (!wave) return
      
      // 🔥 SKIP UPDATE IF USER IS SEEKING THIS WAVE
      if (userSeekLock == beatId) return;
      
      if (listId === "wave" && i === index) {
        wave.seekTo(percent)
      } else {
        wave.seekTo(0)
      }
    })
  }
  document.addEventListener("playerTimeUpdate", window.__waveTimeSync__)
}


// ===============================
// FILTER CAPSULES — BEST MATCH + FILL TO 10
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    const filters = document.querySelectorAll(".filter-capsule")
   
    filters.forEach(btn => {
        btn.onclick = () => {
            filters.forEach(b => b.classList.remove("active"))
            btn.classList.add("active")
           
            const genre = btn.dataset.genre
            filterBeatsByGenre(genre)
        }
    })
})


function filterBeatsByGenre(genre) {
    if (!window.store?.beats) return
   
    const allBeats = window.store.beats
    const TARGET_COUNT = 10
   
    if (genre === "all") {
        window.filteredPlaylistBeats = null
        renderWave()
        return
    }
   
    // 1. Get best matches first
    const matchingBeats = allBeats.filter(beat => {
        const beatGenre = (beat.genre || "").toLowerCase()
        const beatTags = (beat.tags || []).join(" ").toLowerCase()
        const beatTitle = (beat.title || "").toLowerCase()
        const searchTerm = genre.toLowerCase()
       
        return beatGenre.includes(searchTerm) ||
               beatTags.includes(searchTerm) ||
               beatTitle.includes(searchTerm)
    })
   
    // 2. If we have 10+ matches, show top 10
    if (matchingBeats.length >= TARGET_COUNT) {
        window.filteredPlaylistBeats = matchingBeats.slice(0, TARGET_COUNT)
        renderWave()
        return
    }
   
    // 3. If fewer than 10, fill the gap with other beats
    const remaining = TARGET_COUNT - matchingBeats.length
    const otherBeats = allBeats.filter(beat => {
        return !matchingBeats.some(match => match.id === beat.id)
    })
   
    const filledBeats = [...matchingBeats, ...otherBeats.slice(0, remaining)]
    window.filteredPlaylistBeats = filledBeats
    renderWave()
}


// ===============================
// UTILITY FUNCTIONS
// ===============================
function debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout)
            func(...args)
        }
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
    }
}


// ===============================
// SEARCH INTEGRATION
// ===============================
window.addEventListener('load', () => {
    const searchInput = document.getElementById('beatSearch')
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            const query = e.target.value.trim().toLowerCase()
           
            if (!query) {
                window.filteredPlaylistBeats = null
                renderWave()
                return
            }
           
            const allBeats = window.store?.beats || []
            const TARGET_COUNT = 10
           
            // Search matches first
            const searchMatches = allBeats.filter(beat => {
                const searchable = [
                    beat.title,
                    beat.genre,
                    beat.tags?.join(' '),
                    beat.key,
                    beat.mood,
                    beat.bpm,
                    beat.name
                ].map(x => String(x || '').toLowerCase()).join(' ')
               
                return searchable.includes(query)
            })
           
            // Fill to 10 if needed
            if (searchMatches.length >= TARGET_COUNT) {
                window.filteredPlaylistBeats = searchMatches.slice(0, TARGET_COUNT)
            } else {
                const remaining = TARGET_COUNT - searchMatches.length
                const otherBeats = allBeats.filter(beat => {
                    return !searchMatches.some(match => match.id === beat.id)
                })
                window.filteredPlaylistBeats = [...searchMatches, ...otherBeats.slice(0, remaining)]
            }
           
            renderWave()
        }, 200))
    }
})


window.renderWave = renderWave // 👈 Expose to global scope
