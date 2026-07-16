// ===============================
// WAVE SECTION - PRO FINAL - CONNECTED TO CHARTS + D1 STATS
// PAID $ ICON / HYBRID DOWNLOAD ICON / FREE DOWNLOAD - STAYS IN VAULT
// INDEX = 10 ONLY | BEATS.HTML = ALL
// ===============================
import { globalFilter } from '../global-filter.js';
import { STATS_API } from '../control-center/cc-config.js';

const PLAY_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg>`;
const PAUSE_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
const DOWNLOAD_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`;
const DOLLAR_SVG = `<span style="font-weight:900;font-size:18px;line-height:1">$</span>`;

let userSeekLock = null;
const waveCache = new Map();
let observer = null;
let activeBeatsRef = [];

(function injectStyle(){
  if (document.getElementById('wave-pointer-fix')) return;
  const s = document.createElement('style');
  s.id = 'wave-pointer-fix';
  s.textContent = `
.wave-price{cursor:pointer!important;user-select:none}
.wave-bar{cursor:pointer;pointer-events:auto}
.wave-bar canvas{pointer-events:auto}
.wave-row,.wave-actions,.wave-price,.new-price{overflow:visible!important}
.new-price{padding-left:2px!important;display:inline-block!important}
.wave-download{cursor:pointer!important}
  `;
  document.head.appendChild(s);
})();

// AUTH
const isSignedIn = () =>!!window.currentUser ||!!localStorage.getItem('dopetone_user') ||!!localStorage.getItem('sb-access-token') ||!!localStorage.getItem('supabase.auth.token');
const openAuthModal = (beat) => {
  sessionStorage.setItem('pendingDownloadBeat', beat.id);
  if (window.openAuth) return window.openAuth('download', beat);
  if (window.showLoginModal) return window.showLoginModal();
  const modal = document.getElementById('authModal') || document.getElementById('loginModal') || document.querySelector('[data-auth-modal]');
  if (modal) { modal.classList.add('active','open','show'); modal.style.display='flex'; }
};

// === PRO DOWNLOAD TRACKING - CONNECTED TO cc-charts.js ===
async function trackDownloadEvent(beat){
  try {
    const beatId = parseInt(beat.id);
    await fetch(`${STATS_API}/api/stats/event`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ beat_id: beatId, event_type: 'download', user_id: localStorage.getItem('dopetone_user_id') || 'vault_user' })
    });
    const dlEl = document.getElementById('totalDownloads');
    if (dlEl) dlEl.textContent = String((parseInt(dlEl.textContent||'0')+1));
    window.dispatchEvent(new CustomEvent('cc_downloaded', { detail: { beat_id: beatId, beat } }));
    setTimeout(async ()=>{
      try{
        const tz = new Date().getTimezoneOffset() * -1;
        const r = await fetch(`${STATS_API}/api/stats/global?range=hour&tz=${tz}`);
        if(r.ok){
          const j = await r.json();
          window.dispatchEvent(new CustomEvent('cc_stats_global_update', { detail: j }));
        }
      }catch{}
    }, 800);
  } catch(e){ console.warn('track download failed', e); }
}

// === PRO DOWNLOAD - FORCE BLOB - NEVER OPENS PLAYER TAB ===
async function triggerDownload(beat){
  const filename = `${(beat.title || 'beat').replace(/[^a-z0-9]/gi,'_')}.mp3`;
  const apiUrl = `${STATS_API}/api/download?id=${beat.id}`;
  const res = await fetch(apiUrl);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.style.display='none';
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(blobUrl); a.remove(); }, 1000);
  const dlEl = document.getElementById('totalDownloads');
  if(dlEl) dlEl.textContent = String(parseInt(dlEl.textContent||'0')+1);
}

const handleDownload = (beat) => {
  if (getMode(beat) === 'paid') return;
  if (!isSignedIn()) { openAuthModal(beat); return; }
  triggerDownload(beat);
};

// MONETIZATION
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
  if (mode === 'free') return `<span class="new-price">FREE</span>`;
  return `<span class="old-price">$49</span><span class="new-price">$${price}</span>`;
};
const handleBuy = (beat) => {
  const mode = getMode(beat);
  if (mode === 'free') { handleDownload(beat); return; }
  let cart = JSON.parse(localStorage.getItem("dopetone_cart") || "[]");
  const cb = { id: beat.id, title: beat.title, cover: beat.cover_url, cover_url: beat.cover_url, genre: beat.genre, bpm: beat.bpm, audio: beat.mp3_url || beat.audio, mp3_url: beat.mp3_url, zip_url: beat.zip_url, mood: beat.mood, key: beat.key, type: beat.type, monetization_mode: getMode(beat), price: mode==='hybrid'? 0 : beat.price };
  if (!cart.find(x => String(x.id) === String(beat.id))) { cart.push(cb); localStorage.setItem("dopetone_cart", JSON.stringify(cart)); }
  window.location.href = `licence-page.html?id=${beat.id}`;
};

function ensureWave(row, beat){
  if (!row || row.dataset.waveInit === '1' || waveCache.has(String(beat.id))) return;
  row.dataset.waveInit = '1';
  const container = row.querySelector(`#wave-${beat.id}`);
  if (!container) return;
  const mode = getMode(beat);
  let progress = "#00f0ff", waveColor = "rgba(90,110,200,0.65)";
  if(mode==='free'){
    const ctx = document.createElement('canvas').getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 300, 0);
    grad.addColorStop(0, "#4da6ff"); grad.addColorStop(0.5, "#ffffff"); grad.addColorStop(1, "#ff4d94");
    progress = grad; waveColor = "rgba(77,166,255,0.32)";
  }
  if(mode==='hybrid'){ progress = "#f59e0b"; waveColor = "rgba(245,158,11,0.35)"; }
  const wave = WaveSurfer.create({ container, waveColor, progressColor: progress, cursorColor: "transparent", height: 42, normalize: true, partialRender: true, fillParent: true, interact: true, dragToSeek: true, cursorWidth: 0 });
  wave.load(beat.mp3_url || beat.audio);
  row.__wave = wave;
  waveCache.set(String(beat.id), wave);
  container.addEventListener('click', e => e.stopPropagation());
  wave.on('interaction', () => { userSeekLock = beat.id; clearTimeout(window.__seekUnlockTimer); window.__seekUnlockTimer = setTimeout(()=>{userSeekLock=null;},600); });
  wave.on('seeking', (p) => { const d = window.globalPlayer?.getDuration?.() || 0; if (window.__CURRENT_BEAT__?.id === beat.id && window.__CURRENT_LIST__ === 'wave' && d) window.globalPlayer?.seek(p * d); });
}

export function renderWave(limit = null) {
  const container = document.getElementById("waveList");
  if (!container) return;
  waveCache.forEach(w => { try{w.destroy()}catch{} }); waveCache.clear();
  if (observer) { observer.disconnect(); observer = null; }

  // 🔥 FIX - FORCE ALL ON BEATS.HTML, CLEAR STUCK 10 FILTER
  const path = window.location.pathname;
  const isBeatsPage = path.includes("beats.html");
  const isIndexPage =!isBeatsPage;
  if(isBeatsPage){
    // if user came from index with 10 limit, wipe it
    if(window.filteredPlaylistBeats && window.filteredPlaylistBeats.length <= 10 && (window.store?.beats?.length || 0) > 10){
      // keep it only if it's a real search/filter, else clear to show all
      const q = (document.getElementById('beatSearch')?.value || '').trim();
      if(!q) window.filteredPlaylistBeats = null;
    }
  }

  const sourceBeats = window.filteredPlaylistBeats || globalFilter.filterBeats(window.store.beats, 'all') || [];

  let beats;
  if (Array.isArray(limit)) beats = limit;
  else if (limit!== null) beats = sourceBeats.slice(0, limit);
  else beats = sourceBeats;

  if (isIndexPage) beats = beats.slice(0, 10);

  activeBeatsRef = [...beats];
  container.innerHTML = "";
  if (limit!== 0) {
    beats.forEach((beat, index) => {
      const mode = getMode(beat);
      const row = document.createElement("div");
      row.className = "wave-row"; row.dataset.beatId = beat.id; row.dataset.mode = mode;
      let actionBtn = '';
      if (mode === 'paid') actionBtn = `<button class="wave-download is-paid" title="Buy">${DOLLAR_SVG}</button>`;
      else if (mode === 'hybrid') actionBtn = `<button class="wave-download is-hybrid" title="Free Tagged">${DOWNLOAD_SVG}</button>`;
      else actionBtn = `<button class="wave-download is-free" title="Free Download">${DOWNLOAD_SVG}</button>`;
      row.innerHTML = `<div class="wave-left"><div class="wave-cover-wrap"><img src="${beat.cover_url || beat.image || 'images/studio.jpg'}" loading="eager" /><button class="wave-play">${PLAY_SVG}</button></div></div><div class="wave-info"><div class="wave-title">${beat.title}</div><div class="wave-meta">${beat.key || "--"} • ${beat.genre || "--"} • ${beat.bpm || "--"} BPM ${mode==='free'? ' • <span style="color:#3b82f6;font-weight:700">FREE</span>': mode==='hybrid'? ' • <span style="color:#f59e0b">FREE TAG</span>':''}</div></div><div class="wave-bar" id="wave-${beat.id}"></div><div class="wave-actions"><div class="wave-price" data-mode="${mode}">${getPriceHTML(beat)}</div>${actionBtn}</div>`;
      container.appendChild(row);
      const btn = row.querySelector(".wave-play");
      btn.onclick = (e) => { e.stopPropagation(); ensureWave(row, beat); const actualIndex = activeBeatsRef.findIndex(b => String(b.id) === String(beat.id)); window.globalPlayer.play(actualIndex >=0? actualIndex : index, [...activeBeatsRef], "wave"); };
      row.addEventListener("click", (e) => {
        if (e.target.closest(".wave-price")) { e.stopPropagation(); handleBuy(beat); return; }
        if (e.target.closest(".wave-download.is-paid")) { e.stopPropagation(); handleBuy(beat); return; }
        if (e.target.closest(".wave-download.is-hybrid")) { e.stopPropagation(); handleBuy(beat); return; }
        if (e.target.closest(".wave-download.is-free")) { e.stopPropagation(); handleDownload(beat); return; }
        if (e.target.closest(".wave-bar")) return;
        ensureWave(row, beat);
        const actualIndex = activeBeatsRef.findIndex(b => String(b.id) === String(beat.id));
        window.globalPlayer.play(actualIndex >=0? actualIndex : index, [...activeBeatsRef], "wave");
      });
    });
  }
  if (!path.includes("beats.html")) {
    const exploreRow = document.createElement("div");
    exploreRow.className = "wave-row explore-row";
    exploreRow.innerHTML = `<div class="wave-left"><div class="wave-cover-wrap"><img src="images/logo.png" /></div></div><div class="wave-info"><div class="wave-title">Explore More Beats</div><div class="wave-meta">Unlock full arsenal →</div></div><div class="wave-bar explore-bar"><div class="explore-line"></div></div><div class="wave-actions"><a href="beats.html" class="explore-btn">Explore</a></div>`;
    exploreRow.onclick = () => { window.location.href = "beats.html"; };
    container.appendChild(exploreRow);
  }
  observer = new IntersectionObserver((entries)=>{ entries.forEach(entry=>{ if(entry.isIntersecting){ const row = entry.target; const beat = activeBeatsRef.find(b => String(b.id) === String(row.dataset.beatId)); if(beat) ensureWave(row, beat); observer.unobserve(row); } }); }, { rootMargin: "300px 0px" });
  container.querySelectorAll('.wave-row:not(.explore-row)').forEach(r=> observer.observe(r));

  document.removeEventListener("playerPlay", window.__wavePlaySync__);
  document.removeEventListener("playerPause", window.__wavePauseSync__);
  window.__wavePauseSync__ = () => { document.querySelectorAll(".wave-play").forEach(b => b.innerHTML = PLAY_SVG); document.querySelectorAll(".wave-row").forEach(r=> r.classList.remove('active')); };
  document.addEventListener("playerPause", window.__wavePauseSync__);
  window.__wavePlaySync__ = (e) => {
    const { index, listId } = e.detail; if (listId!== "wave") return;
    const currentBeat = activeBeatsRef[index];
    document.querySelectorAll(".wave-row").forEach((row) => { const isActive = String(row.dataset.beatId) === String(currentBeat?.id); row.classList.toggle('active', isActive); const btn = row.querySelector(".wave-play"); if (btn) btn.innerHTML = isActive? PAUSE_SVG : PLAY_SVG; });
    if (currentBeat) { const activeRow = container.querySelector(`.wave-row[data-beat-id="${currentBeat.id}"]`); if (activeRow) ensureWave(activeRow, currentBeat); }
  };
  document.addEventListener("playerPlay", window.__wavePlaySync__);
  document.removeEventListener("playerTimeUpdate", window.__waveTimeSync__);
  window.__waveTimeSync__ = (e) => {
    const { index, percent, listId } = e.detail; if (listId!== "wave") return;
    document.querySelectorAll(".wave-row").forEach((row) => { const wave = row.__wave; if (!wave) return; if (userSeekLock == row.dataset.beatId) return; const isActive = String(row.dataset.beatId) === String(activeBeatsRef[index]?.id); if (isActive) wave.seekTo(percent); else wave.seekTo(0); });
  };
  document.addEventListener("playerTimeUpdate", window.__waveTimeSync__);
}

window.addEventListener('auth_success', () => {
  const pendingId = sessionStorage.getItem('pendingDownloadBeat');
  if (!pendingId) return;
  const beat = (window.store?.beats || []).find(b => String(b.id) === String(pendingId)) || activeBeatsRef.find(b => String(b.id) === String(pendingId));
  if (beat) { sessionStorage.removeItem('pendingDownloadBeat'); triggerDownload(beat); }
});
window.addEventListener('storage', (e) => { if (e.key === 'dopetone_user' && e.newValue) window.dispatchEvent(new Event('auth_success')); });

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".filter-capsule").forEach(btn => { btn.onclick = () => { document.querySelectorAll(".filter-capsule").forEach(b=>b.classList.remove("active")); btn.classList.add("active"); filterBeatsByGenre(btn.dataset.genre); }; });
});

function filterBeatsByGenre(genre) {
  if (!window.store?.beats) return;
  const allBeats = window.store.beats;
  const isBeatsPage = window.location.pathname.includes("beats.html");
  if (genre === "all") { window.filteredPlaylistBeats = null; renderWave(); return; }
  const matching = allBeats.filter(b=> [b.genre||"", (b.tags||[]).join(" "), b.title||""].join(" ").toLowerCase().includes(genre.toLowerCase()));
  if (isBeatsPage) {
    window.filteredPlaylistBeats = matching;
  } else {
    window.filteredPlaylistBeats = matching.slice(0,10);
  }
  renderWave();
}

function debounce(func, wait) { let t; return (...a)=>{clearTimeout(t); t=setTimeout(()=>func(...a),wait);} }

window.addEventListener('load', () => {
  const searchInput = document.getElementById('beatSearch');
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      const query = e.target.value.trim().toLowerCase();
      const isBeatsPage = window.location.pathname.includes("beats.html");
      if (!query) { window.filteredPlaylistBeats = null; renderWave(); return; }
      const allBeats = window.store?.beats || [];
      const searchMatches = allBeats.filter(beat => [beat.title, beat.genre, beat.tags?.join(' '), beat.key, beat.mood, beat.bpm].map(x=>String(x||'').toLowerCase()).join(' ').includes(query));
      if (isBeatsPage) window.filteredPlaylistBeats = searchMatches;
      else window.filteredPlaylistBeats = searchMatches.slice(0,10);
      renderWave();
    }, 200));
  }
});

window.renderWave = renderWave;
window.handleDownload = handleDownload;
window.triggerDownload = triggerDownload;
