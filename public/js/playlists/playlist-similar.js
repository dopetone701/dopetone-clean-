// playlist-similar.js - FULL FIXED - PRO FILTERED + PRO DOWNLOAD LIKE FEATURED + SVG TOGGLE
const API_URL = 'https://api.dopetonevault.com';
const STATS_API = 'https://dopetone-stats.dopetone701.workers.dev';

const PLAY_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="display:block"><path d="M8 5.14v14l11-7-11-7z"/></svg>`;
const PAUSE_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="display:block"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

const activeDownloadsSimilar = new Set();

const getMode = (b) => {
  if (!b) return 'paid';
  let m = (b.monetization_mode || b.monetizationMode || '').toLowerCase().trim();
  if (['free','hybrid','paid'].includes(m)) return m;
  if (m.includes('tagged')) return 'hybrid';
  if (b.is_free == 1 || b.is_free === true) return 'free';
  if (b.has_free_tagged == 1) return 'hybrid';
  return 'paid';
};

function fixPrice(p){
  if(p===null||p===undefined) return 29.99;
  let price = Number(p);
  if(isNaN(price)) return 29.99;
  if(price >= 1000) price = price / 100;
  if(price >= 100) price = price / 100;
  return Number(price.toFixed(2));
}

function normalizeBeat(b){
  if(!b) return null;
  return {
 ...b,
    id: b.id || b.beat_id || b._id,
    audio: b.audio || b.mp3_url,
    mp3_url: b.mp3_url || b.audio,
    cover: b.cover || b.cover_url,
    cover_url: b.cover_url || b.cover,
    zip_url: b.zip_url || b.project_file,
    monetization_mode: b.monetization_mode || b.monetizationMode || getMode(b),
    monetizationMode: b.monetizationMode || b.monetization_mode || getMode(b),
    price: fixPrice(b.price?? b.amount?? 29.99)
  };
}

const getPriceHTML = (b) => {
  const mode=getMode(b);
  const price=fixPrice(b.price||29.99);
  if(mode==='free') return `<span class="old">$49</span><span class="new" style="color:#7dd3ff;font-weight:800">FREE</span>`;
  return `<span class="old">$49</span><span class="new">$${price.toFixed(2)}</span>`;
};
const getBuyLabel = (b) => getMode(b)==='free'?'Free Download':'Add To Cart';

function getD1UserKey() {
  if (!localStorage.getItem('dopetone_device_id')) localStorage.setItem('dopetone_device_id', Math.random().toString(36).slice(2) + Date.now());
  return window.Auth?.user?.id || localStorage.getItem('dopetone_user_id') || `anon_${localStorage.getItem('dopetone_device_id')}`;
}

async function trackDownloadSimilar(beat){
  try{
    const dlEl = document.getElementById('totalDownloads');
    if(dlEl) dlEl.textContent = String((parseInt(dlEl.textContent||'0')||0)+1);
    window.dispatchEvent(new CustomEvent('cc_downloaded', {detail:{beat_id:beat.id, title:beat.title}}));
    window.dispatchEvent(new CustomEvent('cc_track_download', {detail:{beatId:beat.id}}));
    fetch(`${STATS_API}/api/stats/track/${beat.id}/download`, {method:'POST', keepalive:true}).catch(()=>{});
    fetch(`${STATS_API}/api/stats/global/download`, {method:'POST', keepalive:true, headers:{'Content-Type':'application/json'}, body: JSON.stringify({beat_id: beat.id})}).catch(()=>{});
  }catch{}
}

async function proDownloadSimilar(beat, btn){
  if(activeDownloadsSimilar.has(String(beat.id))) return;
  activeDownloadsSimilar.add(String(beat.id));
  const origText = btn? btn.innerHTML : 'Free Download';
  try{
    if(btn){
      btn.disabled = true;
      btn.innerHTML = `<span style="display:flex;align-items:center;gap:6px;justify-content:center"><span style="width:14px;height:14px;border:2px solid #000;border-top-color:transparent;border-radius:50%;display:inline-block;animation:spin.6s linear infinite"></span> Preparing...</span>`;
    }
    await trackDownloadSimilar(beat);
    try{
      const cart = JSON.parse(localStorage.getItem("dopetone_cart")||"[]");
      localStorage.setItem('dopetone_cart_count', String(cart.length));
      window.dispatchEvent(new CustomEvent('cc_cart_updated', {detail:{beat_id:beat.id, count: cart.length, action:'download'}}));
    }catch{}

    const url = beat.mp3_url || beat.audio;
    if(!url) throw new Error('No audio url');
    const res = await fetch(url, {mode:'cors', cache:'no-store'});
    if(!res.ok) throw new Error('Fetch failed');
    if(btn) btn.innerHTML = `<span style="display:flex;align-items:center;gap:6px;justify-content:center"><span style="width:14px;height:14px;border:2px solid #000;border-top-color:transparent;border-radius:50%;display:inline-block;animation:spin.6s linear infinite"></span> Downloading...</span>`;
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
        btn.style.background = '';
        btn.style.color = '';
        btn.disabled = false;
        activeDownloadsSimilar.delete(String(beat.id));
      }, 2500);
    }
  }catch(err){
    console.error('[PRO DOWNLOAD SIMILAR FAIL]', err);
    try{
      const a=document.createElement('a');
      a.href=beat.mp3_url||beat.audio_url||beat.audio;
      a.download=`${beat.title}.mp3`;
      a.target='_blank'; a.rel='noopener';
      document.body.appendChild(a); a.click(); a.remove();
      if(btn){ btn.innerHTML = `✓ Downloaded`; setTimeout(()=>{ btn.innerHTML=origText; btn.disabled=false; activeDownloadsSimilar.delete(String(beat.id)); },2000); }
    }catch{
      if(btn){ btn.innerHTML = `Failed - Retry`; btn.disabled=false; activeDownloadsSimilar.delete(String(beat.id)); }
    }
  }
}
window.proDownloadSimilar = proDownloadSimilar;

if(!document.getElementById('dt-spin-style')){
  const s=document.createElement('style'); s.id='dt-spin-style';
  s.textContent='@keyframes spin{to{transform:rotate(360deg)}} #similarTrack{cursor:grab} #similarTrack.dragging{cursor:grabbing} #similarTrack img{pointer-events:none}.play-icon{display:flex;align-items:center;justify-content:center}.featured-play{display:flex;align-items:center;justify-content:center} #similarTrack{user-select:none;-webkit-user-select:none} #similarTrack.dragging *{user-select:none!important}';
  document.head.appendChild(s);
}

function addToRecentlyViewed(beat) {
    if (!beat) return; const id = beat.id || beat.beat_id || beat._id || beat.uuid; if (!id) return;
    let recent = JSON.parse(localStorage.getItem("dopetone_recent")) || [];
    const beatData = normalizeBeat({
        id: id, title: beat.title || beat.name || "Untitled",
        cover: beat.cover_url || beat.cover || "images/studio.jpg", cover_url: beat.cover_url || beat.cover,
        genre: beat.genre || "Trap", bpm: beat.bpm || 140,
        mp3_url: beat.mp3_url || beat.audio, audio: beat.mp3_url || beat.audio,
        mood: beat.mood || "", type: beat.type || "", key: beat.key || "", tags: beat.tags || [], zip_url: beat.zip_url || "",
        monetization_mode: beat.monetization_mode, price: fixPrice(beat.price)
    });
    recent = recent.filter(item => String(item.id)!= String(beatData.id)); recent.unshift(beatData); recent = recent.slice(0, 8);
    localStorage.setItem("dopetone_recent", JSON.stringify(recent)); renderRecentTracks();
}

export async function renderRecentTracks() {
// AFTER - LET RP FILE OWN rpTrackMount
const ids = ["recentTrack"];
    const containers = ids.map(id => document.getElementById(id)).filter(Boolean);
    if(!containers.length) return;
    let recent = (JSON.parse(localStorage.getItem("dopetone_recent")) || []).map(normalizeBeat);
    containers.forEach(container => {
        if(!recent.length){
            if (container.id === "recentPlayedWrap") {
                const inner = document.getElementById("rpTrackMount");
                if (inner) inner.innerHTML = `<div class="empty-playlist">Play some beats to see them here</div>`; return;
            }
            container.innerHTML = `<div class="empty-playlist">Play some beats to see them here</div>`; return;
        }
        let target = container; if (container.id === "recentPlayedWrap") { target = document.getElementById("rpTrackMount"); if (!target) return; }
        target.innerHTML = "";
        recent.forEach((beat, index) => {
            const mode=getMode(beat);
            const card = document.createElement("div"); card.className = "recent-card"; card.dataset.index = index;
            card.innerHTML = `
                <div style="position: relative;"><img src="${beat.cover}"><button class="play-overlay featured-play"><span class="play-icon">${PLAY_SVG}</span></button>${mode==='free'?'<span style="position:absolute;top:6px;left:6px;background:linear-gradient(90deg,#4da6ff,#fff,#ff4d94);color:#000;font-size:9px;font-weight:800;padding:2px 5px;border-radius:3px">FREE</span>':''}</div>
                <div class="featured-content"><div class="featured-title">${beat.title}</div><div class="featured-meta">${beat.genre} • ${beat.bpm} BPM</div><div class="featured-price" style="cursor:pointer">${getPriceHTML(beat)}</div><button class="featured-buy ${mode==='free'?'is-free':''}" style="cursor:pointer">${getBuyLabel(beat)}</button></div>`;
            card.querySelector(".featured-play").onclick = (e) => {
                e.stopPropagation();
                const audio = document.querySelector('audio') || window.__PLAYER__;
                const isSame = window.__CURRENT_LIST__ === "playlist-recent" && window.__CURRENT_INDEX__ === index;
                if (isSame && audio && audio.src) {
                    if (audio.paused) {
                        audio.play().catch(()=>{});
                        e.currentTarget.querySelector('.play-icon').innerHTML = PAUSE_SVG;
                    } else {
                        audio.pause();
                        e.currentTarget.querySelector('.play-icon').innerHTML = PLAY_SVG;
                    }
                } else {
                    addToRecentlyViewed(beat);
                    window.__CURRENT_LIST__ = "playlist-recent";
                    window.__CURRENT_INDEX__ = index;
                    window.globalPlayer?.play(index, recent, "playlist-recent");
                }
            };
            const viewBtn = card.querySelector(".featured-buy"); updateCartButtonState(viewBtn, beat);
            viewBtn.onclick = (e) => { e.stopPropagation(); handleCartToggle(viewBtn, beat); };
            card.querySelector(".featured-price").onclick = (e)=>{ e.stopPropagation(); handleCartToggle(viewBtn, beat); };
            target.appendChild(card);
        });
    });
}

export async function renderPlaylistSimilarTracks(currentBeatId = null) {
    const container = document.getElementById("similarTrack"); if(!container) return;
    try{
        let beats = [];
        try {
            const res = await fetch(`${API_URL}/beats`);
            if (res.ok) beats = await res.json(); else throw new Error();
        } catch(err) {
            try{ const res2 = await fetch(`${STATS_API}/api/stats/top`); if (res2.ok) beats = await res2.json(); }catch{}
        }
        if(!beats?.length){ const playlists = JSON.parse(localStorage.getItem("playlists") || "[]"); beats = playlists.flatMap(p => p.beats || []).slice(0,50); }
        if(!beats?.length){ container.innerHTML = `<div class="empty-playlist">No tracks found</div>`; return; }
        beats = beats.map(normalizeBeat).filter(b=>b && b.id);
        let current = null;
        if(currentBeatId) current = beats.find(b=>String(b.id)===String(currentBeatId));
        if(!current) current = window.__CURRENT_BEAT__? normalizeBeat(window.__CURRENT_BEAT__) : null;
        if(!current){
            const recent = JSON.parse(localStorage.getItem("dopetone_recent")||"[]");
            if(recent[0]) current = normalizeBeat(recent[0]);
        }
        if(!current) current = beats[0];
        beats = beats.filter(b => String(b.id)!== String(current?.id));
        function similarityScore(a, b){
            if(!a ||!b) return 0; let score = 0;
            if(a.genre && b.genre && String(a.genre).toLowerCase()===String(b.genre).toLowerCase()) score+=40;
            if(a.bpm && b.bpm){
                const diff = Math.abs(Number(a.bpm)-Number(b.bpm));
                if(diff<=5) score+=30; else if(diff<=10) score+=25; else if(diff<=20) score+=15; else if(diff<=30) score+=5;
            }
            if(a.key && b.key){
                const ak = String(a.key).toLowerCase().replace(/m$/,''); const bk = String(b.key).toLowerCase().replace(/m$/,'');
                if(String(a.key).toLowerCase()===String(b.key).toLowerCase()) score+=20; else if(ak[0]===bk[0]) score+=10;
            }
            if(a.mood && b.mood && String(a.mood).toLowerCase()===String(b.mood).toLowerCase()) score+=15;
            if(a.tags && b.tags){
                try{
                    const aTags = Array.isArray(a.tags)?a.tags.flat():String(a.tags).split(',').map(s=>s.trim());
                    const bTags = Array.isArray(b.tags)?b.tags.flat():String(b.tags).split(',').map(s=>s.trim());
                    const overlap = aTags.filter(t=> bTags.map(x=>String(x).toLowerCase()).includes(String(t).toLowerCase()));
                    score += Math.min(overlap.length*5, 15);
                }catch{}
            }
            if(a.type && b.type && String(a.type).toLowerCase()===String(b.type).toLowerCase()) score+=10;
            return score;
        }
        if(current){
            const scored = beats.map(b=>({beat:b, score: similarityScore(current, b)}));
            scored.sort((a,b)=> b.score - a.score);
            const high = scored.filter(x=>x.score>0);
            beats = high.length >= 4? high.map(x=>x.beat) : scored.map(x=>x.beat);
        }
        beats = beats.slice(0, 12);
        container.innerHTML = "";
        beats.forEach((beat, index) => {
            const mode=getMode(beat);
            const card = document.createElement("div"); card.className = "featured-card"; card.dataset.index = index;
            card.innerHTML = `
                <div style="position: relative;"><img src="${beat.cover_url || "images/studio.jpg"}"><button class="play-overlay featured-play"><span class="play-icon">${PLAY_SVG}</span></button>${mode==='free'?'<span style="position:absolute;top:8px;left:8px;background:linear-gradient(90deg,#4da6ff,#fff,#ff4d94);color:#000;font-size:10px;font-weight:800;padding:3px 6px;border-radius:4px">FREE</span>':''}</div>
                <div class="featured-content"><div class="featured-title">${beat.title || "Untitled"}</div><div class="featured-meta">${beat.genre || "Trap"} • ${beat.bpm || 140} BPM</div><div class="featured-price" style="cursor:pointer">${getPriceHTML(beat)}</div><button class="featured-buy ${mode==='free'?'is-free':''}" style="cursor:pointer">${getBuyLabel(beat)}</button></div>`;
            card.querySelector(".featured-play").onclick = (e) => {
                e.stopPropagation();
                const audio = document.querySelector('audio') || window.__PLAYER__;
                const isSame = window.__CURRENT_LIST__ === "playlist-similar" && window.__CURRENT_INDEX__ === index;
                if (isSame && audio && audio.src) {
                    if (audio.paused) {
                        audio.play().catch(()=>{});
                        e.currentTarget.querySelector('.play-icon').innerHTML = PAUSE_SVG;
                    } else {
                        audio.pause();
                        e.currentTarget.querySelector('.play-icon').innerHTML = PLAY_SVG;
                    }
                } else {
                    addToRecentlyViewed(beat);
                    window.__CURRENT_LIST__ = "playlist-similar";
                    window.__CURRENT_INDEX__ = index;
                    window.globalPlayer?.play(index, beats, "playlist-similar");
                }
            };
            const viewBtn = card.querySelector(".featured-buy"); updateCartButtonState(viewBtn, beat);
            viewBtn.onclick = (e) => { e.stopPropagation(); handleCartToggle(viewBtn, beat); };
            card.querySelector(".featured-price").onclick = (e)=>{ e.stopPropagation(); handleCartToggle(viewBtn, beat); };
            container.appendChild(card);
        });
        enableCinematic(container); initSimilarDragScroll(); syncPlayButtons();
        console.log(`✅ Similar filtered by ${current?.genre} / ${current?.bpm} BPM`);
    }catch(err){ console.log(err); container.innerHTML = `<div class="empty-playlist">Failed to load</div>`; }
}

export const renderSimilarTracks = renderPlaylistSimilarTracks;

function updateCartButtonState(btn, beat) {
    let cart = JSON.parse(localStorage.getItem("dopetone_cart")) || []; const exists = cart.find(item => String(item.id)==String(beat.id));
    const mode=getMode(beat);
    if(mode==='free'){ btn.textContent = "Free Download"; btn.classList.remove("added"); return; }
    if(exists){ btn.textContent = "Remove"; btn.classList.add("added"); } else { btn.textContent = "Add To Cart"; btn.classList.remove("added"); }
}

async function handleCartToggle(btn, beat) {
    const mode=getMode(beat);
    if(mode==='free'){
      await proDownloadSimilar(beat, btn);
      return;
    }
    let cart = JSON.parse(localStorage.getItem("dopetone_cart")) || []; const exists = cart.find(item => String(item.id)==String(beat.id)); const userKey = getD1UserKey();
    if(exists){
        cart = cart.filter(item => String(item.id)!=String(beat.id)); localStorage.setItem("dopetone_cart", JSON.stringify(cart));
        btn.textContent = "Add To Cart"; btn.classList.remove("added");
        fetch(`${STATS_API}/api/stats/untrack`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({beat_id: parseInt(beat.id), event_type: 'cart', user_id: userKey})}).catch(()=>{});
    } else {
        const newBeat = normalizeBeat(beat);
        cart.push(newBeat); localStorage.setItem("dopetone_cart", JSON.stringify(cart));
        btn.textContent = "Added ✓"; btn.classList.add("added");
        fetch(`${STATS_API}/api/stats/event`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({beatId: parseInt(beat.id), eventType: 'cart', user_id: userKey})}).catch(()=>{});
        window.renderCartBeatRow?.();
    }
    window.renderCartBeatRow?.(); window.updateCartCount?.(); window.checkEmptyState?.(); document.dispatchEvent(new CustomEvent("cartUpdated"));
}

function syncPlayButtons() {
    document.removeEventListener("playerPlay", updatePlayIcons);
    document.removeEventListener("playerPause", updatePauseIcons);
    document.removeEventListener("playerEnded", updateEndedIcons);

    document.addEventListener("playerPlay", updatePlayIcons);
    document.addEventListener("playerPause", updatePauseIcons);
    document.addEventListener("playerEnded", updateEndedIcons);

    const audio = window.__PLAYER__ || document.querySelector("audio");

    if (audio) {
        audio.removeEventListener("play", updateIconsFromGlobalState);
        audio.removeEventListener("pause", updateIconsFromGlobalState);
        audio.removeEventListener("ended", updateEndedIcons);

        audio.addEventListener("play", updateIconsFromGlobalState);
        audio.addEventListener("pause", updateIconsFromGlobalState);
        audio.addEventListener("ended", updateEndedIcons);
    }

    updateIconsFromGlobalState();
}

function resetPlayIcons() {
    document.querySelectorAll(
        "#similarTrack .play-icon, #recentTrack .play-icon, #rpTrackMount .play-icon"
    ).forEach(icon => {
        icon.innerHTML = PLAY_SVG;
    });
}

function updatePlayIcons(e) {
    resetPlayIcons();

    const { index, listId } = e.detail || {};

    if (listId === "playlist-similar") {
        const icon = document.querySelector(
            `#similarTrack .featured-card[data-index="${index}"] .play-icon`
        );
        if (icon) icon.innerHTML = PAUSE_SVG;
    }

    if (listId === "playlist-recent") {
        document.querySelectorAll(
            `#recentTrack .recent-card[data-index="${index}"] .play-icon,
             #rpTrackMount .recent-card[data-index="${index}"] .play-icon`
        ).forEach(icon => icon.innerHTML = PAUSE_SVG);
    }
}

function updatePauseIcons() {
    updateIconsFromGlobalState();
}

function updateEndedIcons() {
    resetPlayIcons();
}

function updateIconsFromGlobalState() {

    resetPlayIcons();

    const audio = window.__PLAYER__ || document.querySelector("audio");

    if (!audio || audio.paused) return;

    const index = window.__CURRENT_INDEX__;
    const list = window.__CURRENT_LIST__;

    if (list === "playlist-similar") {
        const icon = document.querySelector(
            `#similarTrack .featured-card[data-index="${index}"] .play-icon`
        );
        if (icon) icon.innerHTML = PAUSE_SVG;
    }

    if (list === "playlist-recent") {
        document.querySelectorAll(
            `#recentTrack .recent-card[data-index="${index}"] .play-icon,
             #rpTrackMount .recent-card[data-index="${index}"] .play-icon`
        ).forEach(icon => icon.innerHTML = PAUSE_SVG);
    }
}

function enableCinematic(container) {
  const cards = container.querySelectorAll(".featured-card,.recent-card");
  cards.forEach(card => {
    card.addEventListener("mousemove", (e) => { const rect = card.getBoundingClientRect(); const x = ((e.clientX - rect.left) / rect.width) * 100; const y = ((e.clientY - rect.top) / rect.height) * 100; card.style.setProperty("--x", `${x}%`); card.style.setProperty("--y", `${y}%`); });
    card.addEventListener("mouseleave", () => { card.style.setProperty("--x", "50%"); card.style.setProperty("--y", "50%"); });
  });
}
function initSimilarDragScroll(){
    const slider = document.getElementById("similarTrack");
    if(!slider || slider.dataset.dragInit) return;
    slider.dataset.dragInit="1";
    slider.style.touchAction = "pan-y";
    slider.style.webkitOverflowScrolling = "touch";

    let isDown = false, startX = 0, scrollLeft = 0, hasDragged = false;
    let startY = 0, isHorizontal = null;

    // MOUSE
    slider.addEventListener("mousedown", (e) => {
      if(e.target.closest('button')) return;
      isDown = true; hasDragged = false; isHorizontal = true;
      slider.classList.add("dragging");
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    });
    slider.addEventListener("mouseleave", () => { isDown = false; slider.classList.remove("dragging"); });
    slider.addEventListener("mouseup", () => {
      isDown = false; slider.classList.remove("dragging");
      setTimeout(()=> hasDragged = false, 100);
    });
    slider.addEventListener("mousemove", (e) => {
      if(!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 1.2;
      if(Math.abs(walk) > 3) hasDragged = true;
      slider.scrollLeft = scrollLeft - walk;
    });

    // TOUCH
    slider.addEventListener("touchstart", e => {
      if(e.target.closest('button')) return;
      isDown = true; hasDragged = false; isHorizontal = null;
      startX = e.touches[0].pageX - slider.offsetLeft;
      startY = e.touches[0].pageY;
      scrollLeft = slider.scrollLeft;
    }, {passive:true});

    slider.addEventListener("touchmove", e => {
      if(!isDown) return;
      const x = e.touches[0].pageX - slider.offsetLeft;
      const y = e.touches[0].pageY;
      const walkX = x - startX;
      const walkY = y - startY;

      if(isHorizontal === null){
        isHorizontal = Math.abs(walkX) > Math.abs(walkY);
      }
      if(isHorizontal){
        if(e.cancelable) e.preventDefault();
        if(Math.abs(walkX) > 3) hasDragged = true;
        slider.scrollLeft = scrollLeft - walkX;
      }
    }, {passive:false});

    slider.addEventListener("touchend", (e) => {
      isDown = false;
      slider.classList.remove("dragging");
      if(hasDragged){
        e.preventDefault();
        const blocker = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
        document.addEventListener('click', blocker, {capture:true, once:true});
        setTimeout(()=> hasDragged = false, 100);
      }
    });

    slider.addEventListener("click", (e) => {
      if(hasDragged){ e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }
    }, true);
}

window.addEventListener('cc_monetize_changed', (e)=>{
  const {beatId,mode,price}=e.detail||{}; if(!beatId) return;
  try{
    let recent=JSON.parse(localStorage.getItem("dopetone_recent")||"[]");
    let changed=false;
    recent.forEach(b=>{ if(String(b.id)===String(beatId)){ b.monetization_mode=mode; b.monetizationMode=mode; b.price=fixPrice(price??b.price); b.is_free=mode==='free'?1:0; changed=true; } });
    if(changed) localStorage.setItem("dopetone_recent",JSON.stringify(recent));
  }catch{}
  renderRecentTracks(); renderPlaylistSimilarTracks(window.__CURRENT_BEAT__?.id||null);
});
