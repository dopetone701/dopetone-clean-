// ===============================
// 🔥 BEATS.JS - INFINITE ARSENAL
// ===============================

import { renderWave } from "./sections/wave.js"

console.log("🚀 Beats.js loaded")

document.addEventListener('DOMContentLoaded', async () => {
 
  // Wait for app.js to load beats
  if (!window.store?.loaded) {
    console.log('⏳ Waiting for store...')
    await new Promise(resolve => {
      const check = setInterval(() => {
        if (window.store?.loaded) {
          clearInterval(check)
          resolve()
        }
      }, 50)
    })
  }
 
  const beats = window.filteredPlaylistBeats || window.store.beats || []
  console.log(`✅ Beats ready: ${beats.length}`)

  initToggle()
  initSearch()
})

function initToggle() {
  const listBtn = document.getElementById("listBtn")
  const gridBtn = document.getElementById("gridBtn")
  const listSection = document.getElementById("arsenalSection")
  const gridSection = document.getElementById("gridSection")

  if (!listBtn ||!gridBtn) return

  // LIST VIEW - renderWave handles gp play buttons
  listBtn.addEventListener("click", () => {
    listSection.style.display = "block"
    gridSection.style.display = "none"
    listBtn.classList.add("active")
    gridBtn.classList.remove("active")

    if (!listSection.dataset.loaded) {
      renderWave(null)
      listSection.dataset.loaded = "true"
    }
  })

  // GRID VIEW - we hook gp manually
  gridBtn.addEventListener("click", () => {
    listSection.style.display = "none"
    gridSection.style.display = "block"
    gridBtn.classList.add("active")
    listBtn.classList.remove("active")

    if (!gridSection.dataset.loaded) {
      renderGridView()
      gridSection.dataset.loaded = "true"
    }
  })

  listBtn.click() // Default to List
}

// ===============================
// 🔍 SEARCH - INFINITE ARSENAL
// ===============================
function initSearch() {
  const input = document.getElementById('beatSearch');
  const dropdown = document.getElementById('searchDropdown');
  
  if (!input ||!dropdown) {
    console.log('[Search] Input not found - skipping');
    return;
  }

  // AUTOFILL KILLER
  input.value = '';
  setTimeout(() => input.value = '', 100);

  let searchTimeout;
  let originalBeats = null;
  let currentResults = [];

  input.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim().toLowerCase();

    searchTimeout = setTimeout(() => {
      if (!window.store?.beats) return;

      if (!originalBeats) {
        originalBeats = [...window.store.beats];
      }

      if (!query) {
        dropdown.classList.remove('active');
        if (originalBeats) {
          window.store.beats = originalBeats;
          rerenderAllSections(originalBeats);
          currentResults = originalBeats;
          originalBeats = null;
        }
        return;
      }

      const results = originalBeats.filter(beat => {
        const searchable = [
          beat.title,
          beat.genre,
          beat.tags?.join(' '),
          beat.key,
          beat.mood,
          beat.bpm
        ].map(x => String(x || '').toLowerCase()).join(' ');
        
        return searchable.includes(query);
      });

      const exactMatch = originalBeats.find(
        beat => beat.title?.toLowerCase() === query
      );

      currentResults = exactMatch? [exactMatch] : results;

      if (currentResults.length > 0) {
        showDropdown(currentResults.slice(0, 6));
        rerenderAllSections(currentResults);
      } else {
        // 🔥 GODLY INFINITY: RESPAWN ALL BEATS
        showInfiniteRespawn();
        rerenderAllSections(originalBeats);
        currentResults = originalBeats;
      }

    }, 150);
  });

  function rerenderAllSections(beats) {
    // LIST VIEW
    if (window.renderWave && document.getElementById("arsenalSection")?.style.display!== "none") {
      window.renderWave(beats);
    }
    
    // GRID VIEW
    if (document.getElementById("gridSection")?.style.display!== "none") {
      renderGridView(beats);
    }
    
    console.log(`[Search] Filtered to ${beats.length} beats`);
  }

  function showDropdown(beats) {
    dropdown.innerHTML = '';
    beats.forEach((beat) => {
      const item = document.createElement('div');
      item.className = 'search-item';
      item.innerHTML = `
        <img src="${beat.cover_url || 'images/studio.jpg'}" />
        <div class="search-item-info">
          <div class="search-item-title">${beat.title}</div>
          <div class="search-item-meta">${beat.genre || 'Unknown'} • ${beat.bpm || '--'} BPM</div>
        </div>
        <div class="search-item-play">▶</div>
      `;
      
      item.onclick = () => {
        input.value = beat.title;
        dropdown.classList.remove('active');
        if (window.globalPlayer) {
          window.globalPlayer.play(0, [beat], "wave");
        }
        rerenderAllSections([beat]);
      };
      
      dropdown.appendChild(item);
    });
    dropdown.classList.add('active');
  }

  function showInfiniteRespawn() {
    dropdown.innerHTML = `
      <div class="search-item" style="justify-content:center;color:#00eaff;font-size:13px;font-family:Poppins;">
        💀 No matches found
      </div>
      <div class="search-item" style="justify-content:center;color:rgba(255,255,255,0.6);font-size:12px;font-family:Poppins;">
        🔥 Respawning full arsenal...
      </div>
    `;
    dropdown.classList.add('active');
    setTimeout(() => dropdown.classList.remove('active'), 1500);
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
      input.value = firstBeat.title;
      dropdown.classList.remove('active');
      if (window.globalPlayer) {
        window.globalPlayer.play(0, [...currentResults], "wave");
      }
      rerenderAllSections([firstBeat]);
    }
    
    if (e.key === 'Escape') {
      input.value = '';
      input.dispatchEvent(new Event('input'));
      input.blur();
    }
  });

  console.log('[Search] Infinite Arsenal Mode ✅');
}

// ===============================
// 🎯 GRID VIEW - TOGGLE + INFINITE
// ===============================
function renderGridView(filteredBeats = null) {
  const container = document.getElementById('gridContainer')
  const beats = filteredBeats || window.filteredPlaylistBeats || window.store.beats || []
 
  if (!container) return
 
  const oldCards = container.querySelectorAll('.grid-card')
  oldCards.forEach(card => {
    card.style.opacity = '0'
    card.style.transform = 'scale(0.95)'
  })
  
  setTimeout(() => {
    container.innerHTML = ''
    container.className = 'grid-container'

    // 🔥 INFINITE MODE: NEVER EMPTY
    const finalBeats = beats.length > 0? beats : (window.store.beats || [])

    finalBeats.forEach((beat, index) => {
      const card = document.createElement('div')
      card.className = 'grid-card'
      card.style.opacity = '0'
      card.style.transform = 'scale(0.95)'
      card.style.transition = 'all 0.3s ease'
      
      card.innerHTML = `
        <div class="grid-media">
          <img src="${beat.cover_url || 'images/studio.jpg'}" />
          <button class="play-btn grid-play">▶</button>
        </div>
        <div class="grid-title">${beat.title}</div>
        <div class="grid-tag">#${beat.genre || "Trap"}</div>
        <div class="grid-price-row">
          <span class="grid-old">$${beat.old_price || 49}</span>
          <span class="grid-new">$${beat.price || 19}</span>
        </div>
        <div class="grid-actions">
          <button class="grid-buy">Buy</button>
        </div>
      `
     
      // 🔥 TOGGLE PLAY/PAUSE
      card.querySelector('.grid-play').onclick = (e) => {
        e.stopPropagation()
        const isCurrentBeat = window.globalPlayer?.currentIndex === index && 
                             window.__CURRENT_LIST__ === 'grid'
        
        if (isCurrentBeat && window.globalPlayer?.isPlaying) {
          window.globalPlayer.pause()
        } else {
          window.globalPlayer.play(index, finalBeats, 'grid')
        }
      }
      
      card.querySelector('.grid-buy').onclick = (e) => {
        e.stopPropagation()
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
          type: beat.type,
          key: beat.key
        }
        const exists = cart.find(item => item.id == beat.id)
        if(!exists){
          cart.push(cartBeat)
          localStorage.setItem("dopetone_cart", JSON.stringify(cart))
        }
        window.location.href = `licence-page.html?id=${beat.id}`
      }
     
      container.appendChild(card)
      
      setTimeout(() => {
        card.style.opacity = '1'
        card.style.transform = 'scale(1)'
      }, index * 30)
    })
  }, 150)

  document.removeEventListener("playerPlay", window.__gridPlaySync__)
  window.__gridPlaySync__ = (e) => {
    const { index, listId } = e.detail
    document.querySelectorAll(".grid-play").forEach((b, i) => {
      b.textContent = (listId === "grid" && i === index)? "⏸" : "▶"
    })
  }
  document.addEventListener("playerPlay", window.__gridPlaySync__)

  document.addEventListener("playerPause", () => {
    if (window.__CURRENT_LIST__!== "grid") return
    document.querySelectorAll(".grid-play").forEach(b => b.textContent = "▶")
  })
}
