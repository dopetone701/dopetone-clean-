// ===============================
// FEATURED SECTION (FILTER WIRED SAFE)
// ===============================
import { globalFilter } from '../global-filter.js';

const PLAY_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v14l11-7-11-7z"/></svg>`;
const PAUSE_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

export function renderFeatured() {
  const container = document.getElementById("featuredTrack");
  if (!container ||!store.beats?.length) return;

  // Featured – play button always visible on mobile, keep your bg
  if (!document.getElementById('featured-play-visibility')) {
    const s = document.createElement('style');
    s.id = 'featured-play-visibility';
    s.textContent = `
#featuredTrack .featured-play,
#featuredTrack .play-overlay {
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: auto !important;
  z-index: 50 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}
#featuredTrack .featured-play .play-icon {
  display: flex; align-items: center; justify-content: center;
  line-height: 1;
}
#featuredTrack .featured-play .play-icon svg {
  width: 1em; height: 1em; display: block; fill: currentColor;
}

/* mobile – bigger, still centered */
@media (max-width: 768px) {
  #featuredTrack .featured-play,
  #featuredTrack .play-overlay {
    transform: translate(-50%, -50%) scale(1.35) !important;
    font-size: 22px !important;
  }
  #featuredTrack .featured-play .play-icon svg {
    width: 1.4em; height: 1.4em;
  }
}

/* desktop – hover to show */
@media (min-width: 769px) {
  #featuredTrack .featured-play,
  #featuredTrack .play-overlay { opacity: 0 !important; }
  #featuredTrack .featured-card:hover .featured-play,
  #featuredTrack .featured-card.active .featured-play { 
    opacity: 1 !important; 
  }
}

`;
    document.head.appendChild(s);
  }

  const beats = globalFilter.filterBeats(store.beats, 'featured');
  let current = Math.floor(beats.length / 2);
  let activeIndex = null;
  let isPlaying = false;

  function getOffset(index) {
    let diff = index - current;
    if (diff > beats.length / 2) diff -= beats.length;
    if (diff < -beats.length / 2) diff += beats.length;
    return diff;
  }

  function render() {
    container.innerHTML = "";
    beats.forEach((beat, index) => {
      const card = document.createElement("div");
      card.className = "featured-card";
      card.innerHTML = `
        <div style="position: relative;">
          <img src="${beat.cover_url || beat.image || 'images/studio.jpg'}" />
          <button class="play-overlay featured-play" type="button">
            <span class="play-icon">${PLAY_SVG}</span>
          </button>
        </div>
        <div class="featured-content">
          <div class="featured-title">${beat.title}</div>
          <div class="featured-meta">#${beat.genre || "Trap"} • ${beat.bpm || 140} BPM</div>
          <div class="featured-price"><span class="old">$49</span><span class="new">$19</span></div>
          <button class="featured-buy">Buy</button>
        </div>
      `;
      const offset = getOffset(index);
      card.style.transform = `translate(-50%, -50%) translateX(${offset * 120}%) scale(${1 - Math.abs(offset) * 0.2}) rotateY(${offset * -25}deg)`;
      card.style.opacity = Math.max(0, 1 - Math.abs(offset) * 0.5);
      card.style.zIndex = 10 - Math.abs(Math.round(offset));

      const playBtn = card.querySelector(".featured-play");
      playBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const audio = window.__PLAYER__;
        const isSame = window.__CURRENT_LIST__ === "featured" && window.__CURRENT_INDEX__ === index;
        if (isSame && audio) {
          if (audio.paused) audio.play(); else audio.pause();
        } else {
          window.globalPlayer.play(index, [...beats], "featured");
        }
      });

      const buyBtn = card.querySelector(".featured-buy");
      buyBtn.onclick = (e) => {
        e.stopPropagation();
        let cart = JSON.parse(localStorage.getItem("dopetone_cart")) || [];
        const cartBeat = { id: beat.id, title: beat.title, cover: beat.cover_url, cover_url: beat.cover_url, genre: beat.genre, bpm: beat.bpm, audio: beat.mp3_url || beat.audio, mp3_url: beat.mp3_url, zip_url: beat.zip_url, mood: beat.mood, type: beat.type, key: beat.key };
        if (!cart.find(item => item.id == beat.id)) { cart.push(cartBeat); localStorage.setItem("dopetone_cart", JSON.stringify(cart)); }
        window.location.href = `licence-page.html?id=${beat.id}`;
      };

      card.addEventListener("click", (e) => {
        if (e.target.closest(".featured-play") || e.target.closest(".featured-buy")) return;
        animateTo(index);
      });
      card.addEventListener("dblclick", (e) => {
        if (e.target.closest(".featured-play") || e.target.closest(".featured-buy")) return;
        if (Math.round(current)!== index) return;
        goToLicence(beat);
      });
      container.appendChild(card);
    });
    enableCinematic(container);
    syncUI();
  }

  function syncUI() {
    document.querySelectorAll(".featured-card").forEach((card, i) => {
      const icon = card.querySelector(".play-icon");
      if (!icon) return;
      const active = i === activeIndex && isPlaying;
      icon.innerHTML = active ? PAUSE_SVG : PLAY_SVG;
      card.classList.toggle("active", active);
    });
  }

  document.addEventListener("playerPlay", (e) => {
    const { index, listId } = e.detail;
    if (listId!== "featured") { activeIndex = null; isPlaying = false; syncUI(); return; }
    activeIndex = index; isPlaying = true; syncUI(); animateTo(index);
  });
  document.addEventListener("playerPause", () => {
    if (window.__CURRENT_LIST__!== "featured") return;
    isPlaying = false; syncUI();
  });

  function animateTo(targetIndex) {
    let start = current, end = targetIndex, len = beats.length;
    let diff = end - start;
    if (diff > len / 2) diff -= len;
    if (diff < -len / 2) diff += len;
    const duration = 400, startTime = performance.now();
    function frame(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      current = start + diff * eased;
      render();
      if (progress < 1) requestAnimationFrame(frame);
      else { current = (end + len) % len; render(); }
    }
    requestAnimationFrame(frame);
  }

  let startX = 0, startY = 0, startTime = 0;
  container.style.touchAction = 'pan-y';
  container.addEventListener('touchstart', e => { const t = e.touches[0]; startX = t.clientX; startY = t.clientY; startTime = Date.now(); }, { passive: true });
  container.addEventListener('touchmove', e => { const t = e.touches[0]; const dx = t.clientX - startX; const dy = t.clientY - startY; if (Math.abs(dx) > Math.abs(dy)) e.preventDefault(); }, { passive: false });
  container.addEventListener('touchend', e => {
    const t = e.changedTouches[0]; const dx = t.clientX - startX; const dy = t.clientY - startY; const dt = Date.now() - startTime;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) && dt < 600) {
      const cur = Math.round(current);
      animateTo(dx < 0? (cur + 1) % beats.length : (cur - 1 + beats.length) % beats.length);
    }
  });

  render();
}

function enableCinematic(container) {
  const cards = container.querySelectorAll(".featured-card");
  cards.forEach(card => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty("--x", `${x}%`);
      card.style.setProperty("--y", `${y}%`);
    });
    card.addEventListener("mouseleave", () => {
      card.style.setProperty("--x", "50%");
      card.style.setProperty("--y", "50%");
    });
  });
}
