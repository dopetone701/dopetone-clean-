// ===============================
// 🎵 PLAYLISTS PAGE FINAL - CLOUDFLARE ONLY + MONETIZATION + PRO DOWNLOAD
// GRID = FEATURED EXACT CLONE - FIXED
// ===============================
import { renderPlaylistCapsulesOnly } from "./dt-vault-render.js"
import { renderWave } from "../sections/wave.js"
import { renderPlaylistSimilarTracks } from "./playlist-similar.js"

// === MONETIZATION + PRO DOWNLOAD (FEATURED CLONE) ===
const STATS_API = "https://dopetone-stats.dopetone701.workers.dev";
const activeDownloads = new Set();
const PLAY_SVG_FEAT = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg>`;
const PAUSE_SVG_FEAT = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

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
  if (mode === 'free') return `<span class="free-dna">FREE</span>`;
  return `<span class="old">$49</span><span class="new">$${price}</span>`;
};
const getBuyLabel = (b) => getMode(b)==='free'?'Free Download':'Add To Cart';

async function trackDownload(beat){
  try{
    const dlEl = document.getElementById('totalDownloads');
    if(dlEl) dlEl.textContent = String((parseInt(dlEl.textContent||'0')||0)+1);
    window.dispatchEvent(new CustomEvent('cc_downloaded', {detail:{beat_id:beat.id, title:beat.title}}));
    window.dispatchEvent(new CustomEvent('cc_track_download', {detail:{beatId:beat.id}}));
    fetch(`${STATS_API}/api/stats/track/${beat.id}/download`, {method:'POST', keepalive:true}).catch(()=>{});
    fetch(`${STATS_API}/api/stats/global/download`, {method:'POST', keepalive:true, body: JSON.stringify({beat_id: beat.id})}).catch(()=>{});
  }catch{}
}

async function proDownload(beat, btn){
  if(activeDownloads.has(String(beat.id))) return;
  activeDownloads.add(String(beat.id));
  const origText = btn ? btn.innerHTML : 'Free Download';
  const origBg = btn ? btn.style.background : '';
  try{
    if(btn){
      btn.disabled = true;
      btn.innerHTML = `<span style="display:flex;align-items:center;gap:6px;justify-content:center"><span style="width:14px;height:14px;border:2px solid #000;border-top-color:transparent;border-radius:50%;display:inline-block;animation:spin .6s linear infinite"></span> Preparing...</span>`;
    }
    await trackDownload(beat);
    try{
      const cart = JSON.parse(localStorage.getItem("dopetone_cart")||"[]");
      localStorage.setItem('dopetone_cart_count', String(cart.length));
      window.dispatchEvent(new CustomEvent('cc_cart_updated', {detail:{beat_id:beat.id, count: cart.length, action:'download'}}));
    }catch{}

    const url = beat.mp3_url || beat.audio_url || beat.audio;
    if(!url) throw new Error('No audio url');
    const res = await fetch(url, {mode:'cors', cache:'no-store'});
    if(!res.ok) throw new Error('Fetch failed');
    if(btn) btn.innerHTML = `<span style="display:flex;align-items:center;gap:6px;justify-content:center"><span style="width:14px;height:14px;border:2px solid #000;border-top-color:transparent;border-radius:50%;display:inline-block;animation:spin .6s linear infinite"></span> Downloading...</span>`;
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${(beat.title||'beat').replace(/[^a-z0-9]/gi,'_')}_DopeTone_FREE.mp3`;
    a.style.display='none';
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{ URL.revokeObjectURL(blobUrl); a.remove(); }, 2000);
    if(btn){
      btn.innerHTML = `✓ Downloaded`;
      btn.style.background = '#10b981';
      btn.style.color = '#fff';
      setTimeout(()=>{
        btn.innerHTML = origText;
        btn.style.background = origBg;
        btn.style.color = '';
        btn.disabled = false;
        activeDownloads.delete(String(beat.id));
      }, 2500);
    } else {
      activeDownloads.delete(String(beat.id));
    }
  }catch(err){
    console.error('[PRO DOWNLOAD FAIL]', err);
    try{
      const a=document.createElement('a');
      a.href=beat.mp3_url||beat.audio_url||beat.audio;
      a.download=`${beat.title}.mp3`;
      a.target='_blank'; a.rel='noopener';
      document.body.appendChild(a); a.click(); a.remove();
      if(btn){
        btn.innerHTML = `✓ Downloaded`;
        setTimeout(()=>{ btn.innerHTML=origText; btn.disabled=false; activeDownloads.delete(String(beat.id)); },2000);
      }
    }catch{
      if(btn){
        btn.innerHTML = `Failed - Retry`;
        btn.disabled=false;
        activeDownloads.delete(String(beat.id));
      }
    }
  }
}

if(!document.getElementById('dt-spin-style')){
  const s=document.createElement('style'); s.id='dt-spin-style';
  s.textContent='@keyframes spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(s);
}

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
    sample: beat.sample || beat.mp3_url || beat.audio,
    monetization_mode: beat.monetization_mode || beat.monetizationMode || 'paid',
    monetizationMode: beat.monetizationMode || beat.monetization_mode || 'paid',
    price: beat.price || 29.99
  };
}

console.log("🎵 playlists-page loaded");
renderPlaylistSimilarTracks();

document.addEventListener("DOMContentLoaded", async () => {
    ensureDownloadsPlaylist();
    renderPlaylistCapsulesOnly();
    const addBtn = document.getElementById("playlistMiniAdd");
    if(addBtn){
        addBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if(window.openPlaylistModal) window.openPlaylistModal();
        });
    }
    initToggle();
    initPlaylistSearch();
    initPlaylistCapsules();
    window.addEventListener('cc_monetize_changed', (e)=>{
      const {beatId,mode}=e.detail||{}; if(!beatId) return;
      const all = window.store?.beats?.find(x=>String(x.id)===String(beatId));
      if(all){ all.monetization_mode=mode; all.monetizationMode=mode; all.is_free=mode==='free'?1:0; all.has_free_tagged=mode==='hybrid'?1:0; }
      renderActiveView();
    });
});

function ensureDownloadsPlaylist(){
    let playlists = JSON.parse(localStorage.getItem("dopetone_playlists")) || [];
    let downloads = playlists.find(p => p.id === "downloads_playlist");
    if(!downloads){
        downloads = { id: "downloads_playlist", name: "Downloads", isDownloads: true, beats: [] };
        playlists.unshift(downloads);
        localStorage.setItem("dopetone_playlists", JSON.stringify(playlists));
    }
}
function getDownloadsPlaylist(){
    const playlists = JSON.parse(localStorage.getItem("dopetone_playlists")) || [];
    const downloads = playlists.find(p => p.isDownloads || p.id === "downloads_playlist");
    return (downloads?.beats || []).map(normalizeBeat);
}
function getLikedPlaylist(){
    const playlists = JSON.parse(localStorage.getItem("playlists")) || [];
    const liked = playlists.find(p => p.isLiked);
    return (liked?.beats || []).map(normalizeBeat);
}
function initPlaylistCapsules(){
    const container = document.getElementById("playlistCapsules");
    if(!container) return;
    renderPlaylistCapsulesOnly();
    const urlParams = new URLSearchParams(window.location.search);
    const targetPlaylistId = urlParams.get("id") || "dt_liked_playlist";
    loadPlaylistById(targetPlaylistId);
    setTimeout(() => {
        const capsules = document.querySelectorAll(".playlist-capsule");
        capsules.forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".playlist-capsule").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                loadPlaylistById(btn.dataset.id);
                updateURL(btn.dataset.id);
            });
        });
    },100);
}
function loadPlaylistById(playlistId){
    if(playlistId === "liked_playlist"){ window.filteredPlaylistBeats = getLikedPlaylist(); window.__CURRENT_PLAYLIST_ID__ = "liked_playlist"; }
    else if(playlistId === "downloads_playlist"){ window.filteredPlaylistBeats = getDownloadsPlaylist(); window.__CURRENT_PLAYLIST_ID__ = "downloads_playlist"; }
    else { const playlists = window.getPlaylists() || []; const playlist = playlists.find(p => p.id === playlistId); window.filteredPlaylistBeats = (playlist?.beats || []).map(normalizeBeat); window.__CURRENT_PLAYLIST_ID__ = playlistId; }
    renderActiveView();
}
function renderActiveView(){
    const listBtn = document.getElementById("listBtn"); const listSection = document.getElementById("arsenalSection"); const gridSection = document.getElementById("gridSection");
    if(listBtn?.classList.contains("active")){ listSection.style.display = "block"; gridSection.style.display = "none"; if(typeof renderWave==='function') renderWave(); }
    else { listSection.style.display = "none"; gridSection.style.display = "block"; renderGridView(); }
}
function updateURL(playlistId){ const url = new URL(window.location); url.searchParams.set("id", playlistId); window.history.pushState({}, "", url); }
function initToggle(){
    const listBtn = document.getElementById("listBtn"); const gridBtn = document.getElementById("gridBtn"); const listSection = document.getElementById("arsenalSection"); const gridSection = document.getElementById("gridSection");
    if(!listBtn ||!gridBtn) return;
    listBtn.addEventListener("click", () => { listSection.style.display = "block"; gridSection.style.display = "none"; listBtn.classList.add("active"); gridBtn.classList.remove("active"); if(typeof renderWave==='function') renderWave(); });
    gridBtn.addEventListener("click", () => { listSection.style.display = "none"; gridSection.style.display = "block"; gridBtn.classList.add("active"); listBtn.classList.remove("active"); renderGridView(); });
}
function initPlaylistSearch(){
    const input = document.getElementById('beatSearch'); const dropdown = document.getElementById('searchDropdown');
    if (!input ||!dropdown) return;
    input.value = ''; setTimeout(() => input.value = '', 100);
    let searchTimeout; let currentResults = [];
    input.addEventListener('input', (e) => {
        clearTimeout(searchTimeout); const query = e.target.value.trim().toLowerCase();
        searchTimeout = setTimeout(() => {
            if (!query) { dropdown.classList.remove('active'); loadPlaylistById(window.__CURRENT_PLAYLIST_ID__ || "liked_playlist"); return; }
            const playlists = window.getPlaylists() || []; const likedBeats = getLikedPlaylist(); const downloadsBeats = getDownloadsPlaylist();
            let playlistResults = [];
            likedBeats.forEach(beat => { if (matchesQuery(beat, query)) playlistResults.push({...beat, _playlistTag: 'Liked', _playlistId: 'liked_playlist' }); });
            downloadsBeats.forEach(beat => { if (matchesQuery(beat, query)) playlistResults.push({...beat, _playlistTag: 'Downloads', _playlistId: 'downloads_playlist' }); });
            playlists.forEach(pl => { if (pl.isLiked) return; pl.beats?.forEach(beat => { const nb=normalizeBeat(beat); if (matchesQuery(nb, query)) playlistResults.push({...nb, _playlistTag: pl.name, _playlistId: pl.id }); }); });
            if (playlistResults.length === 0) {
                const allBeats = window.store?.beats || [];
                const globalResults = allBeats.filter(beat => matchesQuery(beat, query)).map(beat => ({...beat, _playlistTag: 'Beats Arsenal', _playlistId: 'global', _isGlobal: true }));
                if (globalResults.length > 0) { showDropdown(globalResults.slice(0, 8), true); window.filteredPlaylistBeats = globalResults; renderActiveView(); currentResults = globalResults; return; }
            }
            if (playlistResults.length > 0) {
                const currentId = window.__CURRENT_PLAYLIST_ID__; playlistResults.forEach(r => { if (r._playlistId === currentId) r._playlistTag = null; });
                showDropdown(playlistResults.slice(0, 8), false); window.filteredPlaylistBeats = playlistResults; renderActiveView(); currentResults = playlistResults;
            } else { showInfiniteRespawn(); window.filteredPlaylistBeats = []; renderActiveView(); currentResults = []; }
        }, 150);
    });
    function matchesQuery(beat, query) { const searchable = [beat.title, beat.genre, beat.tags?.join(' '), beat.key, beat.mood, beat.bpm, beat.name].map(x => String(x || '').toLowerCase()).join(' '); return searchable.includes(query); }
    function showDropdown(beats, isGlobal) {
        dropdown.innerHTML = ''; if (isGlobal) { const h=document.createElement('div'); h.className='search-item'; h.style='justify-content:center;color:#00eaff;font-size:11px;background:rgba(0,234,255,0.08)'; h.innerHTML='🔥 From Beats Arsenal'; dropdown.appendChild(h); }
        beats.forEach((beat) => {
            const item = document.createElement('div'); item.className = 'search-item';
            item.innerHTML = `<img src="${beat.cover_url || beat.cover || 'images/logo.png'}" /><div class="search-item-info"><div class="search-item-title">${beat.title || beat.name}</div><div class="search-item-meta">${beat.genre || 'Unknown'} • ${beat.bpm || '--'} BPM ${getMode(beat)==='free'?'<span style="color:#3b82f6">FREE</span>':''} ${beat._playlistTag? `<span style="color:rgba(0,234,255,0.7);font-size:10px;margin-left:8px;font-style:italic;">${beat._playlistTag}</span>` : ''}</div></div><div class="search-item-play">▶</div>`;
            item.onclick = () => { input.value = beat.title || beat.name; dropdown.classList.remove('active'); if (window.globalPlayer) window.globalPlayer.play(0, [beat], beat._isGlobal? "global_search" : "playlist_search"); window.filteredPlaylistBeats = [beat]; renderActiveView(); };
            dropdown.appendChild(item);
        }); dropdown.classList.add('active');
    }
    function showInfiniteRespawn() { dropdown.innerHTML = `<div class="search-item" style="justify-content:center;color:#00eaff;font-size:13px;">💀 No matches in playlists or arsenal</div>`; dropdown.classList.add('active'); setTimeout(()=>dropdown.classList.remove('active'),2000); }
    document.addEventListener('click', (e) => { if (!e.target.closest('.arsenal-search')) dropdown.classList.remove('active'); });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && currentResults.length > 0) { e.preventDefault(); const fb=currentResults[0]; input.value=fb.title||fb.name; dropdown.classList.remove('active'); if(window.globalPlayer) window.globalPlayer.play(0, [fb], fb._isGlobal? "global_search" : "playlist_search"); window.filteredPlaylistBeats = [fb]; renderActiveView(); }
        if (e.key === 'Escape') { input.value=''; input.dispatchEvent(new Event('input')); input.blur(); }
    });
}
window.filterBeatsToSight = function(beats) {
    const input = document.getElementById('beatSearch'); if (input && beats.length === 1) input.value = beats[0].title || beats[0].name;
    window.filteredPlaylistBeats = beats; renderActiveView();
};

// ===============================
// 🔳 GRID VIEW = FEATURED EXACT
// ===============================
function renderGridView(){
    const container = document.getElementById("gridContainer"); if(!container) return;
    const beats = window.filteredPlaylistBeats || [];
    container.innerHTML = "";
    if(!beats.length){ container.innerHTML = `<div class="empty-playlist" style="grid-column:1/-1;text-align:center;padding:40px;color:#666">No beats found</div>`; return; }
    beats.forEach((beat,index) => {
        const mode=getMode(beat);
        const card = document.createElement("div");
        card.className = "beat-card";
        card.dataset.beatId = beat.id;
        card.innerHTML = `
        <div class="beat-cover-wrap">
            <img src="${beat.cover_url || beat.cover || "images/logo.png"}" class="beat-cover" loading="lazy" alt="${beat.title}">
            <button class="beat-play-btn" data-index="${index}"><span class="f-icon">${PLAY_SVG_FEAT}</span></button>
            ${mode==='free'?'<span style="position:absolute;top:8px;left:8px;background:linear-gradient(90deg,#4da6ff,#fff,#ff4d94);color:#000;font-size:10px;font-weight:800;padding:3px 6px;border-radius:4px;z-index:2">FREE</span>':''}
        </div>
        <div class="beat-content">
            <div class="beat-title">${beat.title || beat.name || "Untitled"}</div>
            <div class="beat-meta">#${beat.genre || "Trap"} • ${beat.bpm || "--"} BPM</div>
            <div class="beat-price-row">${getPriceHTML(beat)}</div>
            <button class="beat-buy-btn ${mode==='free'?'is-free':''}">${getBuyLabel(beat)}</button>
        </div>
        `;
        card.addEventListener("mousemove", e=>{
          const r=card.getBoundingClientRect();
          card.style.setProperty("--x", `${(e.clientX-r.left)/r.width*100}%`);
          card.style.setProperty("--y", `${(e.clientY-r.top)/r.height*100}%`);
        });
        card.querySelector(".beat-play-btn").onclick = (e) => { e.stopPropagation(); if(window.globalPlayer) window.globalPlayer.play(index, beats, "playlist_grid"); };
        const addBtn = card.querySelector(".beat-buy-btn");
        let cart = JSON.parse(localStorage.getItem("dopetone_cart")) || []; const exists = cart.find(item => String(item.id) == String(beat.id));
        if(exists && mode!=='free'){ addBtn.textContent = "Remove"; addBtn.classList.add("added"); }

        const buyAction = async (e) => {
          e.stopPropagation();
          const btn = e.currentTarget.closest('.beat-card')?.querySelector('.beat-buy-btn') || addBtn;
          const m = getMode(beat);
          if(m==='free'){ await proDownload(beat, btn); return; }
          let cart = JSON.parse(localStorage.getItem("dopetone_cart")) || [];
          const ex = cart.find(item => String(item.id) == String(beat.id));
          if(ex){
            cart = cart.filter(item => String(item.id)!= String(beat.id));
            localStorage.setItem("dopetone_cart", JSON.stringify(cart));
            btn.textContent = "Add To Cart"; btn.classList.remove("added");
          } else {
            const newBeat = normalizeBeat(beat);
            cart.push(newBeat);
            localStorage.setItem("dopetone_cart", JSON.stringify(cart));
            btn.textContent = "Added ✓"; btn.classList.add("added");
          }
          window.renderCartBeatRow?.(); window.updateCartCount?.(); window.checkEmptyState?.();
        };
        card.querySelector(".beat-buy-btn").onclick = buyAction;
        card.querySelector(".beat-price-row").onclick = buyAction;
        container.appendChild(card);
    });
    syncGridPlayButtons();
}

function syncGridPlayButtons(){
    document.querySelectorAll("#gridContainer .beat-play-btn .f-icon").forEach(el => { el.innerHTML = PLAY_SVG_FEAT; });
    document.querySelectorAll("#gridContainer .beat-card").forEach(c=>c.classList.remove("is-active"));
    const currentBeat = window.__CURRENT_BEAT__; const isPlaying = window.globalPlayer?.isPlaying(); if(!currentBeat ||!isPlaying) return;
    const activeCard = document.querySelector(`#gridContainer .beat-card[data-beat-id="${currentBeat.id}"]`);
    if(activeCard){
        const icon = activeCard.querySelector(".f-icon");
        if(icon) icon.innerHTML = PAUSE_SVG_FEAT;
        activeCard.classList.add("is-active");
    }
}
document.addEventListener("playerPlay", () => syncGridPlayButtons());
document.addEventListener("playerPause", () => {
    document.querySelectorAll("#gridContainer .beat-play-btn .f-icon").forEach(el => { el.innerHTML = PLAY_SVG_FEAT; });
    document.querySelectorAll("#gridContainer .beat-card").forEach(c=>c.classList.remove("is-active"));
});
document.addEventListener("trackChange", () => syncGridPlayButtons());
document.addEventListener("DOMContentLoaded", () => { setTimeout(syncGridPlayButtons, 300); });

// drag scroll
const capsules = document.querySelector(".playlist-capsules");
if(capsules){
    let isDown = false, startX = 0, scrollLeft = 0;
    capsules.addEventListener("mousedown", e => { isDown = true; capsules.classList.add("dragging"); startX = e.pageX; scrollLeft = capsules.scrollLeft; });
    window.addEventListener("mouseup", () => { isDown = false; capsules.classList.remove("dragging"); });
    capsules.addEventListener("mousemove", e => { if(!isDown) return; e.preventDefault(); capsules.scrollLeft = scrollLeft - (e.pageX - startX) * 1.4; });
}

// like system + more panel (fixed handleBuy -> proDownload)
document.addEventListener("DOMContentLoaded", () => {
    function getLikedBeats(){ return JSON.parse(localStorage.getItem("liked_beats")) || []; }
    function saveLikedBeats(data){ localStorage.setItem("liked_beats", JSON.stringify(data)); }
    function getPlaylists(){ return JSON.parse(localStorage.getItem("playlists")) || []; }
    function savePlaylists(data){ localStorage.setItem("playlists", JSON.stringify(data)); }
    function isBeatLiked(beat){ if(!beat) return false; return getLikedBeats().includes(String(beat.id)); }
    function refreshDesktopHeart(){ const btn=document.getElementById("loveTrackBtn"); const beat=window.__CURRENT_BEAT__; if(!btn||!beat) return; const liked=isBeatLiked(beat); btn.classList.toggle("active", liked); const heart=btn.querySelector(".love-heart"); if(heart) heart.textContent=liked?"❤️":"♡"; }
    function refreshMobileHeart(){ const btn=document.getElementById("mpLike"); const beat=window.__CURRENT_BEAT__; if(!btn||!beat) return; btn.innerHTML=`<span class="love-heart">${isBeatLiked(beat)?"❤️":"♡"}</span>`; }
    function refreshLikeUI(){ refreshDesktopHeart(); refreshMobileHeart(); }
    function updateLikedPlaylist(beat, shouldLike){
        let playlists = getPlaylists(); let likedPlaylist = playlists.find(p => p.isLiked); const nb=normalizeBeat(beat);
        if(shouldLike &&!likedPlaylist){ likedPlaylist={ id:"liked_playlist", name:"Liked", isLiked:true, beats:[] }; playlists.unshift(likedPlaylist); }
        if(likedPlaylist){ if(shouldLike){ if(!likedPlaylist.beats.some(b=>String(b.id)===String(nb.id))) likedPlaylist.beats.push(nb); } else { likedPlaylist.beats=likedPlaylist.beats.filter(b=>String(b.id)!==String(nb.id)); if(!likedPlaylist.beats.length) playlists=playlists.filter(p=>!p.isLiked); } }
        savePlaylists(playlists);
    }
    function toggleBeatLike(){
        const beat=window.__CURRENT_BEAT__; if(!beat) return; let liked=getLikedBeats(); const exists=liked.includes(String(beat.id));
        if(exists){ liked=liked.filter(id=>String(id)!==String(beat.id)); updateLikedPlaylist(beat,false); } else { liked.push(String(beat.id)); updateLikedPlaylist(beat,true); }
        saveLikedBeats(liked);
        const countEl=document.getElementById("likeCount"); if(countEl){ let cur=Number(countEl.textContent||0); countEl.textContent=exists?Math.max(0,cur-1):cur+1; const cached=JSON.parse(localStorage.getItem("dopetone_like_counts"))||{}; cached[beat.id]=Number(countEl.textContent); localStorage.setItem("dopetone_like_counts",JSON.stringify(cached)); }
        refreshLikeUI(); window.dispatchEvent(new Event("playlistsUpdated"));
    }
    document.getElementById("loveTrackBtn")?.addEventListener("click",toggleBeatLike);
    document.getElementById("mpLike")?.addEventListener("click",toggleBeatLike);
    document.addEventListener("trackChange", refreshLikeUI); document.addEventListener("playerPlay", refreshLikeUI); setTimeout(refreshLikeUI,100);
    window.refreshLikeUI=refreshLikeUI; window.toggleBeatLike=toggleBeatLike;
});

document.addEventListener("click", async (e) => {
  const moreBtn = e.target.closest("#mpMore, #gpMore"); if(!moreBtn) return; e.stopPropagation();
  const beat = window.__CURRENT_BEAT__; if (!beat) return; const nb=normalizeBeat(beat);
  const old = document.getElementById("playerMorePanel"); if (old) { old.remove(); return; }
  const mode=getMode(nb);
  const panel = document.createElement("div"); panel.id = "playerMorePanel";
  panel.innerHTML = `
    <div class="more-panel-header"><img src="${nb.cover_url || 'images/logo.png'}" /><div class="more-panel-info"><div class="more-title">${nb.title || nb.name}</div><div class="more-artist">${nb.artist || 'Dope Tone'} • ${mode==='free'?'<span style="color:#3b82f6">FREE</span>':`$${nb.price||29.99}`}</div></div><button class="more-close">✕</button></div>
    <div class="more-panel-actions">
      <button class="more-item" data-action="playlist"><span>🎵</span> Create Playlist</button>
      <button class="more-item" data-action="add_playlist"><span>➕</span> Add To Playlist</button>
      <button class="more-item" data-action="dopetone_cart"><span>🛒</span> ${mode==='free'?'Free Download':'Add To Cart'}</button>
      <button class="more-item" data-action="download"><span>⬇</span> Free Download</button>
      <button class="more-item" data-action="share"><span>🔗</span> Share</button>
      <button class="more-item buy" data-action="buy"><span>💳</span> ${mode==='free'?'Download Now':'Buy Now'}</button>
      ${localStorage.getItem("isOwner")==="true"? `<button class="more-item delete" data-action="delete"><span>🗑</span> Delete Beat</button>` : ""}
    </div>
  `;
  document.body.appendChild(panel); requestAnimationFrame(()=>panel.classList.add("active"));
  panel.querySelector(".more-close").onclick = () => { panel.classList.remove("active"); setTimeout(()=>panel.remove(),250); };
  setTimeout(()=>{ document.addEventListener("click", function closeOutside(ev){ if(!panel.contains(ev.target) &&!ev.target.closest("#mpMore, #gpMore")){ panel.classList.remove("active"); setTimeout(()=>panel.remove(),250); document.removeEventListener("click", closeOutside); } }); },50);
  panel.querySelectorAll(".more-item").forEach(btn => {
    btn.onclick = async () => {
      const action = btn.dataset.action;
      if(action==="playlist" && window.openPlaylistModal) window.openPlaylistModal(nb);
      if(action==="add_playlist" && window.openAddToPlaylistModal) window.openAddToPlaylistModal(nb);
      if(action==="dopetone_cart" || action==="download" || action==="buy"){
        if(mode==='free'){ await proDownload(nb, btn); }
        else {
          if(action==="dopetone_cart"){
            let cart=JSON.parse(localStorage.getItem("dopetone_cart"))||[]; if(!cart.find(i=>String(i.id)===String(nb.id))){cart.push(nb); localStorage.setItem("dopetone_cart",JSON.stringify(cart));}
            window.renderCartBeatRow?.(); window.updateCartCount?.(); showCartToast(nb.title||nb.name);
          } else {
            window.location.href=`licence-page.html?id=${nb.id}`;
          }
        }
      }
      if(action==="share" && navigator.share) await navigator.share({title:nb.title||nb.name,url:location.href});
      panel.classList.remove("active"); setTimeout(()=>panel.remove(),250);
    };
  });
});
function showCartToast(text){
  let toast=document.getElementById("cartToast"); if(!toast){ toast=document.createElement("div"); toast.id="cartToast"; document.body.appendChild(toast); }
  toast.textContent=text; toast.classList.add("active"); clearTimeout(toast.__timer); toast.__timer=setTimeout(()=>toast.classList.remove("active"),2200);
}
