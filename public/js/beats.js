// ===============================
// 🔥 BEATS.JS - INFINITE ARSENAL + MONETIZATION LIVE + INFINITE SCROLL
// ===============================
import { renderWave } from "./sections/wave.js";
console.log("🚀 Beats.js loaded - INFINITE MODE");

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

const getPriceHTML = (b, oldClass='grid-old', newClass='grid-new') => {
  const mode = getMode(b);
  const price = fixPrice(b.price || 29.99);
  if (mode === 'free') return `<span class="${newClass}" style="color:#3b82f6;font-weight:800">FREE</span>`;
  return `<span class="${oldClass}" style="text-decoration:line-through;opacity:0.5">$49</span><span class="${newClass}">$${price.toFixed(2)}</span>`;
};

const handleBuy = (beat) => {
  if (getMode(beat) === 'free') {
    const a = document.createElement('a'); a.href = beat.mp3_url || beat.audio; a.download = `${beat.title}.mp3`; document.body.appendChild(a); a.click(); a.remove(); return;
  }
  let cart = JSON.parse(localStorage.getItem("dopetone_cart") || "[]");
  const cartBeat = {
    id: beat.id, title: beat.title, cover: beat.cover_url, cover_url: beat.cover_url,
    genre: beat.genre, bpm: beat.bpm, audio: beat.mp3_url || beat.audio,
    mp3_url: beat.mp3_url, zip_url: beat.zip_url, mood: beat.mood, type: beat.type, key: beat.key,
    monetization_mode: getMode(beat), price: fixPrice(beat.price)
  };
  if (!cart.find(x => String(x.id) === String(beat.id))) {
    cart.push(cartBeat); localStorage.setItem("dopetone_cart", JSON.stringify(cart));
  }
  window.location.href = `licence-page.html?id=${beat.id}`;
};

// 🔥 INFINITE SCROLL STATE
let currentBeats = [];
let renderedCount = 0;
const CHUNK = 24;
let isLoadingChunk = false;
let observer = null;

function createGridCard(beat, index, allBeats){
  const mode = getMode(beat);
  const price = fixPrice(beat.price);
  const card = document.createElement('div');
  card.className = 'grid-card';
  card.dataset.mode = mode;
  card.dataset.index = index;
  card.innerHTML = `
    <div class="grid-media"><img src="${beat.cover_url || 'images/studio.jpg'}" loading="lazy" decoding="async"/><button class="play-btn grid-play">▶</button>${mode==='free'?'<span style="position:absolute;top:8px;left:8px;background:#3b82f6;color:#fff;font-size:10px;font-weight:800;padding:3px 6px;border-radius:4px;z-index:2">FREE</span>':''}</div>
    <div class="grid-title">${beat.title}</div>
    <div class="grid-tag">#${beat.genre || "Trap"}</div>
    <div class="grid-price-row" data-mode="${mode}"><span class="new-price">$${mode==='free'?'FREE':price.toFixed(2)}</span></div>
    <div class="grid-actions"><button class="grid-buy">${mode==='free'?'Free Download':'Buy'}</button></div>
  `;
  card.querySelector('.grid-play').onclick = (e) => {
    e.stopPropagation();
    const isCurrent = window.globalPlayer?.currentIndex === index && window.__CURRENT_LIST__ === 'grid';
    if (isCurrent && window.globalPlayer?.isPlaying) window.globalPlayer.pause(); else window.globalPlayer.play(index, allBeats, 'grid');
  };
  const buyAction = (e) => { e.stopPropagation(); handleBuy(beat); };
  card.querySelector('.grid-buy').onclick = buyAction;
  card.querySelector('.grid-price-row').onclick = buyAction;
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
  console.log(`✅ Chunk loaded: ${renderedCount}/${currentBeats.length}`);
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
  const sentinel = document.getElementById('gridSentinel') || (()=>{ const s=document.createElement('div'); s.id='gridSentinel'; s.style.height='1px'; document.getElementById('gridSection')?.appendChild(s); return s; })();
  if (!container) return;

  currentBeats = (filteredBeats || window.filteredPlaylistBeats || window.store.beats || []).map(b=>({...b, price: fixPrice(b.price) }));
  container.innerHTML = '';
  renderedCount = 0;

  // Render first chunk instantly
  renderNextChunk();
  renderNextChunk(); // 2 chunks for fast fill

  initInfiniteObserver();

  document.removeEventListener("playerPlay", window.__gridPlaySync__);
  window.__gridPlaySync__ = (e) => {
    const { index, listId } = e.detail||{};
    document.querySelectorAll(".grid-play").forEach((b, i) => { b.textContent = (listId === "grid" && i === index)? "⏸" : "▶"; });
  };
  document.addEventListener("playerPlay", window.__gridPlaySync__);
  document.addEventListener("playerPause", () => {
    if (window.__CURRENT_LIST__!== "grid") return;
    document.querySelectorAll(".grid-play").forEach(b => b.textContent = "▶");
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!window.store?.loaded) {
    await new Promise(resolve => {
      const check = setInterval(() => { if (window.store?.loaded) { clearInterval(check); resolve(); } }, 50);
    });
  }
  const beats = window.filteredPlaylistBeats || window.store.beats || [];
  initToggle();
  initSearch();

  window.addEventListener('cc_monetize_changed', (e) => {
    const { beatId, mode, price } = e.detail || {};
    if (!beatId) return;
    const b = window.store?.beats?.find(x=>String(x.id)===String(beatId));
    if (b) { b.monetization_mode = mode; b.monetizationMode = mode; b.is_free = mode==='free'?1:0; b.has_free_tagged = mode==='hybrid'?1:0; b.price = fixPrice(price??b.price); }
    // Re-render with same filter
    renderGridView(currentBeats);
    if(document.getElementById("arsenalSection")?.style.display!== "none") renderWave(window.filteredPlaylistBeats || null);
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
      item.innerHTML = `<img src="${beat.cover_url || 'images/studio.jpg'}" /><div class="search-item-info"><div class="search-item-title">${beat.title}</div><div class="search-item-meta">${beat.genre || 'Unknown'} • ${beat.bpm || '--'} BPM ${getMode(beat)==='free'? ' • FREE':''}</div></div><div class="search-item-play">▶</div>`;
      item.onclick = () => { input.value = beat.title; dropdown.classList.remove('active'); if (window.globalPlayer) window.globalPlayer.play(0, [beat], "wave"); rerenderAllSections([beat]); };
      dropdown.appendChild(item);
    });
    dropdown.classList.add('active');
  }
  function showInfiniteRespawn() {
    dropdown.innerHTML = `<div class="search-item" style="justify-content:center;color:#00eaff">💀 No matches</div>`;
    dropdown.classList.add('active'); setTimeout(() => dropdown.classList.remove('active'), 1500);
  }
  document.addEventListener('click', (e) => { if (!e.target.closest('.arsenal-search')) dropdown.classList.remove('active'); });
}

// Expose for other pages
window.renderGridView = renderGridView;
