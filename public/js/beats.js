// ===============================
// 🔥 BEATS.JS - NOX SECURE DOWNLOAD + AUTH MODAL + CHARTS + 3 COLS
// ===============================
import { renderWave } from "./sections/wave.js";
console.log("🚀 Beats.js NOX SECURE loaded");

const PLAY_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg>`;
const PAUSE_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

const BEATS_API = "https://all-beats-analytics-api.dopetone701.workers.dev";
const STATS_API = "https://dopetone-stats.dopetone701.workers.dev";
// CHANGE THIS TO YOUR AI-API WORKERS URL FROM SCREENSHOT:
const DOWNLOAD_API = "https://ai-api.dopetone701.workers.dev"; // <-- your ai-api url

const getMode = (b) => {
  if (!b) return 'paid';
  let m = (b.monetization_mode || b.monetizationMode || '').toLowerCase().trim();
  if (['free','hybrid','paid'].includes(m)) return m;
  if (b.is_free == 1 || b.is_free === true) return 'free';
  if (b.has_free_tagged == 1) return 'hybrid';
  return 'paid';
};

function fixPrice(p){
  let price = Number(p?? 29.99);
  if(isNaN(price)) return 29.99;
  if(price >= 1000) price = price/100;
  if(price >= 100) price = price/100;
  return Number(price.toFixed(2));
}

const getPriceHTML = (b) => {
  const mode = getMode(b);
  const price = fixPrice(b.price || 29.99);
  if (mode === 'free') return `<span class="free-dna">FREE</span>`;
  return `<span class="old">$49</span><span class="new">$${price.toFixed(2)}</span>`;
};

// ===== CC-CHARTS SYNC HELPERS =====
function pushToD1(beatId, action='cart'){
  try{
    const cart = JSON.parse(localStorage.getItem("dopetone_cart")||"[]");
    const total = cart.length;
    const countForBeat = cart.filter(c=> String(c.id)===String(beatId)).length;
    window.dispatchEvent(new CustomEvent('cc_cart_updated', {detail:{beat_id:beatId, count: total, track_count: countForBeat, action}}));
    window.dispatchEvent(new CustomEvent('cc_player_cart_sync', {detail:{total, beat_id:beatId, action}}));
    if(action==='download'||action==='free'){
      window.dispatchEvent(new CustomEvent('cc_downloaded', {detail:{beat_id:beatId, action}}));
    }
    const cartEl = document.getElementById('cartItems');
    if(cartEl) cartEl.textContent = String(Math.max(parseInt(cartEl.textContent||'0')||0, total));
  }catch{}
}

// ===== NOX SECURE DOWNLOAD - SAME PAGE - AUTH MODAL - NO CDN LEAK =====
const activeDL = new Set();
async function noxDownload(beat, btn){
  // 1. AUTH GUARD - open your auth modal v3.4
  const user = window.Auth?.user || JSON.parse(localStorage.getItem('dopetone_user')||'null');
  if(!user){
    // open auth modal
    if(window.Auth?.openModal){
      window.Auth.openModal(false);
    } else {
      document.getElementById('authModal')?.classList.add('active');
      document.body.style.overflow='hidden';
    }
    window.Auth?.showToast?.('Sign in to download') || console.log('signin required');
    return;
  }

  if(activeDL.has(String(beat.id))) return;
  activeDL.add(String(beat.id));
  const origHTML = btn.innerHTML;

  try{
    btn.disabled = true;
    btn.innerHTML = `<span style="display:flex;gap:6px;align-items:center;justify-content:center"><span style="width:12px;height:12px;border:2px solid #02110f;border-top-color:transparent;border-radius:50%;animation:spin.6s linear infinite;display:inline-block"></span> Preparing</span>`;

    // instant chart bump
    try{
      const dlEl = document.getElementById('totalDownloads');
      if(dlEl) dlEl.textContent = String((parseInt(dlEl.textContent||'0')||0)+1);
      pushToD1(beat.id,'download');
      fetch(`${STATS_API}/api/stats/track/${beat.id}/download`, {method:'POST', keepalive:true}).catch(()=>{});
      fetch(`${STATS_API}/api/stats/global/download`, {method:'POST', keepalive:true, headers:{'Content-Type':'application/json'}, body:JSON.stringify({beat_id:beat.id})}).catch(()=>{});
    }catch{}

    btn.innerHTML = `<span style="display:flex;gap:6px;align-items:center;justify-content:center"><span style="width:12px;height:12px;border:2px solid #02110f;border-top-color:transparent;border-radius:50%;animation:spin.6s linear infinite;display:inline-block"></span> Downloading</span>`;

    // SECURE FETCH - never r2 url
    const url = `${DOWNLOAD_API}/api/secure-download/${beat.id}?uid=${user.id}`;
    const res = await fetch(url, { headers:{'x-user-id': String(user.id)}, cache:'no-store' });
    if(!res.ok) throw new Error('dl failed '+res.status);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${beat.title.replace(/[^a-z0-9]/gi,'_')}_DopeTone_FREE.mp3`;
    a.style.display='none';
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{ URL.revokeObjectURL(blobUrl); a.remove(); }, 2000);

    btn.innerHTML = `✓ Downloaded`;
    btn.style.background = '#10b981';
    btn.style.color = '#fff';
    setTimeout(()=>{
      btn.innerHTML = origHTML;
      btn.style.background = '';
      btn.style.color = '';
      btn.disabled = false;
      activeDL.delete(String(beat.id));
    },2500);

  }catch(err){
    console.error('[NOX DL FAIL]', err);
    btn.innerHTML = `Retry`;
    btn.disabled = false;
    activeDL.delete(String(beat.id));
  }
}

const handleBuy = async (beat, btn) => {
  const mode = getMode(beat);
  if (mode === 'free') {
    await noxDownload(beat, btn);
    return;
  }
  // PAID - cart + D1 + charts
  let cart = JSON.parse(localStorage.getItem("dopetone_cart") || "[]");
  const cartBeat = {
    id: beat.id, title: beat.title, cover: beat.cover_url, cover_url: beat.cover_url,
    genre: beat.genre, bpm: beat.bpm, audio: beat.mp3_url || beat.audio,
    mp3_url: beat.mp3_url, zip_url: beat.zip_url, mood: beat.mood, type: beat.type, key: beat.key,
    monetization_mode: mode, price: fixPrice(beat.price)
  };
  if (!cart.find(x => String(x.id) === String(beat.id))) {
    cart.push(cartBeat);
    localStorage.setItem("dopetone_cart", JSON.stringify(cart));
    pushToD1(beat.id,'cart');
    // fire stats
    fetch(`${STATS_API}/api/stats/track/${beat.id}/cart`, {method:'POST', keepalive:true}).catch(()=>{});
  }
  setTimeout(()=>{ window.location.href = `licence-page.html?id=${beat.id}`; }, 120);
};

let currentBeats = [];
let renderedCount = 0;
const CHUNK = 24;
let isLoadingChunk = false;
let observer = null;

function createGridCard(beat, index, allBeats){
  const mode = getMode(beat);
  const card = document.createElement('div');
  card.className = 'featured-card grid-featured-card';
  card.dataset.mode = mode;
  card.dataset.index = index;
  card.innerHTML = `
      <div class="f-cover-wrap">
        <img src="${beat.cover_url || 'images/studio.jpg'}" loading="lazy" decoding="async" alt="${beat.title}">
        <button class="f-play grid-play" aria-label="play"><span class="f-icon">${PLAY_SVG}</span></button>
      </div>
      <div class="f-content">
        <div class="f-title">${beat.title}</div>
        <div class="f-meta">#${beat.genre||'Trap'} • ${beat.bpm||140} BPM</div>
        <div class="f-price">${getPriceHTML(beat)}</div>
        <button class="f-buy ${mode==='free'?'is-free':''}">${mode==='free'?'Free Download':'Buy'}</button>
      </div>`;

  const playBtn = card.querySelector('.f-play');
  const buyBtn = card.querySelector('.f-buy');

  playBtn.onclick = (e)=>{
    e.stopPropagation();
    const isCurrent = window.globalPlayer?.currentIndex === index && window.__CURRENT_LIST__ === 'grid';
    if(isCurrent && window.globalPlayer?.isPlaying) window.globalPlayer.pause();
    else window.globalPlayer.play(index, allBeats, 'grid');
  };

  buyBtn.onclick = (e)=>{ e.stopPropagation(); handleBuy(beat, buyBtn); };

  return card;
}

function renderNextChunk(){
  const container = document.getElementById('gridContainer');
  if(!container || isLoadingChunk) return;
  if(renderedCount >= currentBeats.length) return;
  isLoadingChunk = true;
  const frag = document.createDocumentFragment();
  const next = currentBeats.slice(renderedCount, renderedCount + CHUNK);
  next.forEach((beat, i) => {
    const card = createGridCard(beat, renderedCount + i, currentBeats);
    frag.appendChild(card);
  });
  container.appendChild(frag);
  renderedCount += next.length;
  isLoadingChunk = false;
}

function initInfiniteObserver(){
  const sentinel = document.getElementById('gridSentinel');
  if(!sentinel) return;
  if(observer) observer.disconnect();
  observer = new IntersectionObserver((entries)=>{
    if(entries[0].isIntersecting) renderNextChunk();
  }, { rootMargin: '800px' });
  observer.observe(sentinel);
}

function renderGridView(filteredBeats = null) {
  const container = document.getElementById('gridContainer');
  const sentinel = document.getElementById('gridSentinel') || (()=>{ const s=document.createElement('div'); s.id='gridSentinel'; s.style.height='400px'; s.style.width='100%'; document.getElementById('gridSection')?.appendChild(s); return s; })();
  if (!container) return;
  currentBeats = (filteredBeats || window.filteredPlaylistBeats || window.store.beats || []).map(b=>({...b, price: fixPrice(b.price) }));
  container.innerHTML = '';
  renderedCount = 0;
  renderNextChunk();
  renderNextChunk();
  initInfiniteObserver();
  document.removeEventListener("playerPlay", window.__gridPlaySync__);
  window.__gridPlaySync__ = (e) => {
    const { index, listId } = e.detail||{};
    document.querySelectorAll(".grid-featured-card.f-icon").forEach((el, i) => {
      el.innerHTML = (listId === "grid" && i === index)? PAUSE_SVG : PLAY_SVG;
    });
  };
  document.addEventListener("playerPlay", window.__gridPlaySync__);
  document.addEventListener("playerPause", () => {
    if (window.__CURRENT_LIST__!== "grid") return;
    document.querySelectorAll(".grid-featured-card.f-icon").forEach(b => b.innerHTML = PLAY_SVG);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!window.store?.loaded) {
    await new Promise(resolve => {
      const check = setInterval(() => { if (window.store?.loaded) { clearInterval(check); resolve(); } }, 50);
    });
  }
  initToggle();
  initSearch();
  window.addEventListener('cc_monetize_changed', (e) => {
    const { beatId, mode, price } = e.detail || {};
    if (!beatId) return;
    const b = window.store?.beats?.find(x=>String(x.id)===String(beatId));
    if (b) { b.monetization_mode = mode; b.monetizationMode = mode; b.is_free = mode==='free'?1:0; b.has_free_tagged = mode==='hybrid'?1:0; b.price = fixPrice(price??b.price); }
    renderGridView(currentBeats);
    if(document.getElementById("arsenalSection")?.style.display!== "none" && window.renderWave) window.renderWave(window.filteredPlaylistBeats || null);
  });
});

function initToggle() {
  const listBtn = document.getElementById("listBtn");
  const gridBtn = document.getElementById("gridBtn");
  const listSection = document.getElementById("arsenalSection");
  const gridSection = document.getElementById("gridSection");
  if (!listBtn ||!gridBtn) return;
  listBtn.addEventListener("click", () => {
    listSection.style.display = "block"; gridSection.style.display = "none";
    listBtn.classList.add("active"); gridBtn.classList.remove("active");
    if (!listSection.dataset.loaded) { renderWave(null); listSection.dataset.loaded = "true"; }
  });
  gridBtn.addEventListener("click", () => {
    listSection.style.display = "none"; gridSection.style.display = "block";
    gridBtn.classList.add("active"); listBtn.classList.remove("active");
    renderGridView();
    gridSection.dataset.loaded = "true";
  });
  listBtn.click();
}

function initSearch() {
  const input = document.getElementById('beatSearch');
  const dropdown = document.getElementById('searchDropdown');
  if (!input ||!dropdown) return;
  input.value = '';
  let originalBeats = null, currentResults = [];
  input.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    if (!window.store?.beats) return;
    if (!originalBeats) originalBeats = [...window.store.beats];
    if (!query) {
      dropdown.classList.remove('active');
      if (originalBeats) { window.store.beats = originalBeats; rerenderAllSections(originalBeats); currentResults = originalBeats; originalBeats = null; }
      return;
    }
    const results = originalBeats.filter(beat => [beat.title, beat.genre, beat.tags?.join(' '), beat.key, beat.mood, beat.bpm].map(x=>String(x||'').toLowerCase()).join(' ').includes(query));
    currentResults = results;
    if (currentResults.length > 0) { showDropdown(currentResults.slice(0, 6)); rerenderAllSections(currentResults); }
    else { showInfiniteRespawn(); rerenderAllSections(originalBeats); }
  });
  function rerenderAllSections(beats) {
    if (window.renderWave && document.getElementById("arsenalSection")?.style.display!== "none") window.renderWave(beats);
    if (document.getElementById("gridSection")?.style.display!== "none") renderGridView(beats);
  }
  function showDropdown(beats) {
    dropdown.innerHTML = '';
    beats.forEach((beat) => {
      const item = document.createElement('div'); item.className = 'search-item';
      item.innerHTML = `<img src="${beat.cover_url || 'images/studio.jpg'}" /><div class="search-item-info"><div class="search-item-title">${beat.title}</div><div class="search-item-meta">${beat.genre || 'Unknown'} • ${beat.bpm || '--'} BPM ${getMode(beat)==='free'? ' • FREE':''}</div></div><div class="search-item-play">${PLAY_SVG}</div>`;
      item.onclick = () => { input.value = beat.title; dropdown.classList.remove('active'); if (window.globalPlayer) window.globalPlayer.play(0, [beat], "wave"); rerenderAllSections([beat]); };
      dropdown.appendChild(item);
    });
    dropdown.classList.add('active');
  }
  function showInfiniteRespawn() {
    dropdown.innerHTML = `<div class="search-item" style="justify-content:center;color:#00eaff">No matches</div>`;
    dropdown.classList.add('active'); setTimeout(() => dropdown.classList.remove('active'), 1500);
  }
  document.addEventListener('click', (e) => { if (!e.target.closest('.arsenal-search')) dropdown.classList.remove('active'); });
}

window.renderGridView = renderGridView;



//THE FILTER BAR LOGIC

// LINK PILLS TO EXISTING SEARCH
document.querySelectorAll('.pill').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.pill').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    
    const genre = btn.dataset.filter || btn.innerText;
    const searchInput = document.getElementById('beatSearch');
    
    if(genre.toLowerCase() === 'all'){
      searchInput.value = '';
    } else {
      searchInput.value = genre;
    }
    searchInput.dispatchEvent(new Event('input')); // triggers your existing filter
  });
});



// AUTO FADE DROPDOWN AFTER 3 SECS
let dropdownTimer;

function showDropdown(){
  const dd = document.getElementById('searchDropdown');
  dd.classList.remove('fade-out');
  clearTimeout(dropdownTimer);
  dropdownTimer = setTimeout(()=>{
    dd.classList.add('fade-out');
  }, 3000); // 3 secs
}

// hook into your existing input listener
const beatSearch = document.getElementById('beatSearch');
const searchDropdown = document.getElementById('searchDropdown');

if(beatSearch){
  beatSearch.addEventListener('input', ()=>{
    if(beatSearch.value.length > 0){
      searchDropdown.style.display = 'block';
      showDropdown();
    }
  });
  
  // show again on hover/focus
  searchDropdown.addEventListener('mouseenter', ()=>{
    searchDropdown.classList.remove('fade-out');
    clearTimeout(dropdownTimer);
  });
  searchDropdown.addEventListener('mouseleave', ()=>{
    showDropdown();
  });
}
// sticky shadow hint
const filterBar = document.querySelector('.view-toggle');
window.addEventListener('scroll', () => {
  if(window.scrollY > 80) filterBar?.classList.add('is-stuck');
  else filterBar?.classList.remove('is-stuck');
});



const bar = document.querySelector('.view-toggle');
const navH = document.querySelector('nav').offsetHeight;
const startTop = bar.getBoundingClientRect().top + window.scrollY;

window.addEventListener('scroll', () => {
  if (window.scrollY >= startTop - navH) {
    bar.style.position = 'fixed';
    bar.style.top = navH + 'px';
    bar.style.left = '0';
    bar.style.right = '0';
    bar.style.zIndex = '1002';
    bar.style.width = '100%';
  } else {
    bar.style.position = 'sticky';
    bar.style.top = navH + 'px';
  }
});
