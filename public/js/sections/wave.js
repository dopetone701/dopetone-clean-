// ===============================
// WAVE SECTION (FILTER WIRED + MONETIZATION + FORCED 10 + POINTER)
// ===============================
import { globalFilter } from '../global-filter.js';

const PLAY_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v14l11-7-11-7z"/></svg>`;
const PAUSE_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
const DOWNLOAD_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`;

let userSeekLock = null;

// 🔥 INJECT CURSOR POINTER STYLE - NO NEED TO TOUCH CSS
(function injectWavePointerStyle(){
  if (document.getElementById('wave-pointer-fix')) return;
  const s = document.createElement('style');
  s.id = 'wave-pointer-fix';
  s.textContent = `
    .wave-price, .wave-price .old-price, .wave-price .new-price { cursor: pointer !important; user-select: none; }
    .wave-price:hover .new-price { color: #ff003c !important; text-decoration: underline; }
    .wave-price[data-mode="free"]:hover .new-price { color: #3b82f6 !important; }
  `;
  document.head.appendChild(s);
})();

// === MONETIZATION ===
const getMode = (b) => {
  if (!b) return 'paid';
  let m = (b.monetization_mode || b.monetizationMode || '').toLowerCase().trim();
  if (['free','hybrid','paid'].includes(m)) return m;
  if (m.includes('tagged')) return 'hybrid';
  if (b.is_free == 1 || b.is_free === true) return 'free';
  if (b.has_free_tagged == 1) return 'hybrid';
  return 'paid';
};
const getPriceHTML = (b) => {
  const mode = getMode(b);
  const price = b.price || 29.99;
  if (mode === 'free') return `<span class="new-price" style="color:#3b82f6;font-weight:800">FREE</span>`;
  return `<span class="old-price">$49</span><span class="new-price">$${price}</span>`;
};
const handleBuy = (beat) => {
  if (getMode(beat) === 'free') {
    const a = document.createElement('a'); a.href = beat.mp3_url || beat.audio; a.download = `${beat.title}.mp3`; a.click(); return;
  }
  let cart = JSON.parse(localStorage.getItem("dopetone_cart") || "[]");
  const cb = { id: beat.id, title: beat.title, cover: beat.cover_url, cover_url: beat.cover_url, genre: beat.genre, bpm: beat.bpm, audio: beat.mp3_url || beat.audio, mp3_url: beat.mp3_url, zip_url: beat.zip_url, mood: beat.mood, key: beat.key, type: beat.type, monetization_mode: getMode(beat) };
  if (!cart.find(x => String(x.id) === String(beat.id))) { cart.push(cb); localStorage.setItem("dopetone_cart", JSON.stringify(cart)); }
  window.location.href = `licence-page.html?id=${beat.id}`;
};

export function renderWave(limit = null) {
  const container = document.getElementById("waveList");
  if (!container) return;

  const sourceBeats = window.filteredPlaylistBeats || globalFilter.filterBeats(window.store.beats, 'all') || [];

  // 🔥 FORCE 10 DETECT - INDEX ONLY
  const path = window.location.pathname;
  const isIndexPage = path === "/" || path === "" || path.includes("index.html") || path.endsWith("/5500") || path.endsWith("/5500/") || (!path.includes("beats.html") && !path.includes("licence-page"));
  const isBeatsPage = path.includes("beats.html");

  let beats = Array.isArray(limit) ? limit : limit ? sourceBeats.slice(0, limit) : sourceBeats;

  // 🔥 FORCE 10 ON INDEX - ALWAYS
  if (isIndexPage && !isBeatsPage) {
    if (Array.isArray(limit) && limit.length > 10) beats = limit.slice(0, 10);
    else if (!Array.isArray(limit)) beats = beats.slice(0, 10);
    else beats = beats.slice(0, 10);
  }

  container.innerHTML = "";

  if (limit !== 0) {
    beats.forEach((beat, index) => {
      const mode = getMode(beat);
      const row = document.createElement("div");
      row.className = "wave-row";
      row.dataset.beatId = beat.id;
      row.dataset.mode = mode;
      row.innerHTML = `
        <div class="wave-left"><div class="wave-cover-wrap"><img src="${beat.cover_url || beat.image || 'images/studio.jpg'}" /><button class="wave-play">${PLAY_SVG}</button></div></div>
        <div class="wave-info"><div class="wave-title">${beat.title}</div><div class="wave-meta">${beat.key || "--"} • ${beat.genre || "--"} • ${beat.bpm || "--"} BPM ${mode==='free'? ' • <span style="color:#3b82f6;font-weight:700">FREE</span>':''}</div></div>
        <div class="wave-bar" id="wave-${beat.id}"></div>
        <div class="wave-actions"><div class="wave-price" data-mode="${mode}">${getPriceHTML(beat)}</div><button class="wave-download">${DOWNLOAD_SVG}</button></div>
      `;
      container.appendChild(row);
      const btn = row.querySelector(".wave-play");
      const waveContainer = row.querySelector(`#wave-${beat.id}`);
      const wave = WaveSurfer.create({ container: waveContainer, waveColor: "#1e293b", progressColor: "#ff003c", height: 40, normalize: true, fillParent: true, partialRender: true, cursorWidth: 0, responsive: true, interact: true, dragToSeek: true });
      wave.load(beat.mp3_url || beat.audio);
      row.__wave = wave;
      waveContainer.addEventListener('click', e => e.stopPropagation());
      waveContainer.addEventListener('mousedown', e => e.stopPropagation());
      waveContainer.addEventListener('touchstart', e => e.stopPropagation());
      wave.on('interaction', () => { userSeekLock = beat.id; clearTimeout(window.__seekUnlockTimer); window.__seekUnlockTimer = setTimeout(()=>{userSeekLock=null;},600); });
      wave.on('seeking', (progress) => {
        const duration = window.globalPlayer?.getDuration?.() || 0;
        if (window.__CURRENT_BEAT__?.id === beat.id && window.__CURRENT_LIST__ === 'wave' && duration) window.globalPlayer?.seek(progress * duration);
      });
      btn.onclick = (e) => { e.stopPropagation(); window.globalPlayer.play(index, [...beats], "wave"); };
      row.addEventListener("click", (e) => {
        if (e.target.closest(".wave-play") || e.target.closest(".wave-bar")) return;
        if (e.target.closest(".wave-price")) { handleBuy(beat); return; }
        if (e.target.closest(".wave-download")) { const email = prompt("Enter your email"); if (!email) return; alert("🔥 Download will be sent to: " + email); }
      });
      row.addEventListener("dblclick", (e) => { if (e.target.closest(".wave-bar")) return; handleBuy(beat); });
    });
  }

  const isLicencePage = path.includes("licence-page.html");
  const isAllBeatsPage = path.includes("beats.html");
  if (!isAllBeatsPage) {
    const exploreRow = document.createElement("div");
    exploreRow.className = "wave-row explore-row";
    exploreRow.innerHTML = `<div class="wave-left"><div class="wave-cover-wrap"><img src="images/logo.png" /></div></div><div class="wave-info"><div class="wave-title">${isLicencePage? "Explore More Tracks" : "Explore More Beats"}</div><div class="wave-meta">${isLicencePage? "Find similar vibes →" : "Unlock full arsenal →"}</div></div><div class="wave-bar explore-bar"><div class="explore-line"></div></div><div class="wave-actions"><a href="beats.html" class="explore-btn">Explore</a></div>`;
    exploreRow.onclick = () => { window.location.href = "beats.html"; };
    container.appendChild(exploreRow);
  }

  document.removeEventListener("playerPlay", window.__wavePlaySync__);
  document.removeEventListener("playerPause", window.__wavePauseSync__);
  window.__wavePauseSync__ = () => { document.querySelectorAll(".wave-play").forEach(b => b.innerHTML = PLAY_SVG); };
  document.addEventListener("playerPause", window.__wavePauseSync__);
  window.__wavePlaySync__ = (e) => {
    const { index, listId } = e.detail;
    document.querySelectorAll(".wave-play").forEach((b, i) => { b.innerHTML = (listId === "wave" && i === index)? PAUSE_SVG : PLAY_SVG; });
  };
  document.addEventListener("playerPlay", window.__wavePlaySync__);
  document.removeEventListener("playerTimeUpdate", window.__waveTimeSync__);
  window.__waveTimeSync__ = (e) => {
    const { index, percent, listId } = e.detail;
    document.querySelectorAll(".wave-row").forEach((row, i) => {
      const wave = row.__wave; if (!wave) return; if (userSeekLock == row.dataset.beatId) return;
      if (listId === "wave" && i === index) wave.seekTo(percent); else wave.seekTo(0);
    });
  };
  document.addEventListener("playerTimeUpdate", window.__waveTimeSync__);

  window.addEventListener('cc_monetize_changed', (e) => {
    const { beatId, mode } = e.detail || {}; if (!beatId) return;
    const row = container.querySelector(`.wave-row[data-beat-id="${beatId}"]`);
    if (row) {
      const priceEl = row.querySelector('.wave-price');
      if (priceEl) { priceEl.innerHTML = mode==='free'? `<span class="new-price" style="color:#3b82f6;font-weight:800">FREE</span>` : `<span class="old-price">$49</span><span class="new-price">$29.99</span>`; priceEl.dataset.mode = mode; row.dataset.mode = mode; }
    }
    const sb = window.store?.beats?.find(x=>String(x.id)===String(beatId));
    if (sb) { sb.monetization_mode = mode; sb.monetizationMode = mode; sb.is_free = mode==='free'?1:0; sb.has_free_tagged = mode==='hybrid'?1:0; }
  });
}

// FILTER CAPSULES — BEST MATCH + FILL TO 10 - INDEX FORCED
document.addEventListener("DOMContentLoaded", () => {
    const filters = document.querySelectorAll(".filter-capsule");
    filters.forEach(btn => {
        btn.onclick = () => {
            filters.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            filterBeatsByGenre(btn.dataset.genre);
        };
    });
});

function filterBeatsByGenre(genre) {
    if (!window.store?.beats) return;
    const allBeats = window.store.beats;
    const path = window.location.pathname;
    const isIndexPage = path === "/" || path.includes("index.html") || path.endsWith("/5500") || path === "";
    const TARGET_COUNT = isIndexPage ? 10 : 50;
    if (genre === "all") { window.filteredPlaylistBeats = null; renderWave(); return; }
    const matchingBeats = allBeats.filter(beat => {
        const bg = (beat.genre||"").toLowerCase(), bt = (beat.tags||[]).join(" ").toLowerCase(), bti = (beat.title||"").toLowerCase(), s = genre.toLowerCase();
        return bg.includes(s) || bt.includes(s) || bti.includes(s);
    });
    if (matchingBeats.length >= TARGET_COUNT) { window.filteredPlaylistBeats = matchingBeats.slice(0, TARGET_COUNT); renderWave(); return; }
    const remaining = TARGET_COUNT - matchingBeats.length;
    const otherBeats = allBeats.filter(b => !matchingBeats.some(m => m.id === b.id));
    window.filteredPlaylistBeats = [...matchingBeats, ...otherBeats.slice(0, remaining)];
    renderWave();
}

function debounce(func, wait) { let t; return (...a)=>{clearTimeout(t); t=setTimeout(()=>func(...a),wait);} }

window.addEventListener('load', () => {
    const searchInput = document.getElementById('beatSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            const query = e.target.value.trim().toLowerCase();
            if (!query) { window.filteredPlaylistBeats = null; renderWave(); return; }
            const allBeats = window.store?.beats || [];
            const path = window.location.pathname;
            const isIndexPage = path === "/" || path.includes("index.html") || path === "";
            const TARGET_COUNT = isIndexPage ? 10 : 50;
            const searchMatches = allBeats.filter(beat => [beat.title, beat.genre, beat.tags?.join(' '), beat.key, beat.mood, beat.bpm].map(x=>String(x||'').toLowerCase()).join(' ').includes(query));
            if (searchMatches.length >= TARGET_COUNT) window.filteredPlaylistBeats = searchMatches.slice(0, TARGET_COUNT);
            else { const other = allBeats.filter(b=>!searchMatches.some(m=>m.id===b.id)); window.filteredPlaylistBeats = [...searchMatches, ...other.slice(0, TARGET_COUNT-searchMatches.length)]; }
            renderWave();
        }, 200));
    }
});

window.renderWave = renderWave;
