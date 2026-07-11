// playlist-similar.js - FULL FIXED - SIMILAR + RECENT BOTH WORK + D1 + MONETIZATION + PRICE FIX
const API_URL = 'https://api.dopetonevault.com';
const STATS_API = 'https://dopetone-stats.dopetone701.workers.dev';

const getMode = (b) => {
  if (!b) return 'paid';
  let m = (b.monetization_mode || b.monetizationMode || '').toLowerCase().trim();
  if (['free','hybrid','paid'].includes(m)) return m;
  if (m.includes('tagged')) return 'hybrid';
  if (b.is_free == 1 || b.is_free === true) return 'free';
  if (b.has_free_tagged == 1) return 'hybrid';
  return 'paid';
};

// 🔥 PRICE FIX 2999 -> 29.99
function fixPrice(p){
  if(p===null||p===undefined) return 29.99;
  let price = Number(p);
  if(isNaN(price)) return 29.99;
  if(price >= 1000) price = price / 100; // 2999 -> 29.99 , 1999 -> 19.99
  if(price >= 100) price = price / 100; // just in case 2999 missed
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
    price: fixPrice(b.price ?? b.amount ?? 29.99)
  };
}

const getPriceHTML = (b) => {
  const mode=getMode(b);
  const price=fixPrice(b.price||29.99);
  if(mode==='free') return `<span class="old">$49</span><span class="new" style="color:#3b82f6;font-weight:800">FREE</span>`;
  return `<span class="old">$49</span><span class="new">$${price.toFixed(2)}</span>`;
};
const getBuyLabel = (b) => getMode(b)==='free'?'Free Download':'Add To Cart';

function getD1UserKey() {
  if (!localStorage.getItem('dopetone_device_id')) localStorage.setItem('dopetone_device_id', Math.random().toString(36).slice(2) + Date.now());
  return window.Auth?.user?.id || localStorage.getItem('dopetone_user_id') || `anon_${localStorage.getItem('dopetone_device_id')}`;
}

function addToRecentlyViewed(beat) {
    if (!beat) return; const id = beat.id || beat.beat_id || beat._id || beat.uuid; if (!id) return;
    let recent = JSON.parse(localStorage.getItem("dopetone_recent")) || [];
    const beatData = normalizeBeat({
        id: id, title: beat.title || beat.name || "Untitled",
        cover: beat.cover_url || beat.cover || "images/studio.jpg", cover_url: beat.cover_url || beat.cover,
        genre: beat.genre || "Trap", bpm: beat.bpm || 140,
        mp3_url: beat.mp3_url || beat.audio, audio: beat.mp3_url || beat.audio,
        mood: beat.mood || "", type: beat.type || "", key: beat.key || "", zip_url: beat.zip_url || "",
        monetization_mode: beat.monetization_mode, price: fixPrice(beat.price)
    });
    recent = recent.filter(item => String(item.id) != String(beatData.id)); recent.unshift(beatData); recent = recent.slice(0, 8);
    localStorage.setItem("dopetone_recent", JSON.stringify(recent)); renderRecentTracks();
}

export async function renderRecentTracks() {
    const ids = ["recentTrack", "rpTrackMount", "recentPlayedMount", "recentPlayedWrap"];
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
                <div style="position: relative;"><img src="${beat.cover}"><button class="play-overlay featured-play"><span class="play-icon">▶</span></button>${mode==='free'?'<span style="position:absolute;top:6px;left:6px;background:#3b82f6;color:#fff;font-size:9px;font-weight:800;padding:2px 5px;border-radius:3px">FREE</span>':''}</div>
                <div class="featured-content"><div class="featured-title">${beat.title}</div><div class="featured-meta">${beat.genre} • ${beat.bpm} BPM ${mode==='free'?'<span style="color:#3b82f6">• FREE</span>':''}</div><div class="featured-price" style="cursor:pointer">${getPriceHTML(beat)}</div><button class="featured-buy" style="cursor:pointer">${getBuyLabel(beat)}</button></div>`;
            card.querySelector(".featured-play").onclick = (e) => {
                e.stopPropagation(); addToRecentlyViewed(beat);
                const audio = window.__PLAYER__; const isSameTrack = window.__CURRENT_LIST__ === "playlist-recent" && window.__CURRENT_INDEX__ === index;
                if (isSameTrack && audio) { if (audio.paused) audio.play(); else audio.pause(); } else { window.globalPlayer?.play(index, recent, "playlist-recent"); }
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
            // 🔥 FIXED ENDPOINT - was /api/beats which is wrong
            const res = await fetch(`${API_URL}/beats`);
            if (res.ok) beats = await res.json(); else throw new Error();
        } catch(err) {
            try{ const res2 = await fetch(`${STATS_API}/api/stats/top`); if (res2.ok) beats = await res2.json(); }catch{}
        }
        if(!beats?.length){ const playlists = JSON.parse(localStorage.getItem("playlists") || "[]"); beats = playlists.flatMap(p => p.beats || []).slice(0,10); }
        if(!beats?.length){ container.innerHTML = `<div class="empty-playlist">No tracks found - add some beats first</div>`; return; }
        beats = beats.map(normalizeBeat);
        if (currentBeatId) beats = beats.filter(b => String(b.id) !== String(currentBeatId));
        container.innerHTML = ""; beats = beats.sort(() => Math.random() - 0.5).slice(0, 10);
        beats.forEach((beat, index) => {
            const mode=getMode(beat);
            const card = document.createElement("div"); card.className = "featured-card"; card.dataset.index = index;
            card.innerHTML = `
                <div style="position: relative;"><img src="${beat.cover_url || "images/studio.jpg"}"><button class="play-overlay featured-play"><span class="play-icon">▶</span></button>${mode==='free'?'<span style="position:absolute;top:8px;left:8px;background:#3b82f6;color:#fff;font-size:10px;font-weight:800;padding:3px 6px;border-radius:4px">FREE</span>':''}</div>
                <div class="featured-content"><div class="featured-title">${beat.title || "Untitled"}</div><div class="featured-meta">${beat.genre || "Trap"} • ${beat.bpm || 140} BPM</div><div class="featured-price" style="cursor:pointer">${getPriceHTML(beat)}</div><button class="featured-buy" style="cursor:pointer">${getBuyLabel(beat)}</button></div>`;
            card.querySelector(".featured-play").onclick = (e) => {
                e.stopPropagation(); addToRecentlyViewed(beat);
                const audio = window.__PLAYER__; const isSameTrack = window.__CURRENT_LIST__ === "playlist-similar" && window.__CURRENT_INDEX__ === index;
                if (isSameTrack && audio) { if (audio.paused) audio.play(); else audio.pause(); } else { window.globalPlayer?.play(index, beats, "playlist-similar"); }
            };
            const viewBtn = card.querySelector(".featured-buy"); updateCartButtonState(viewBtn, beat);
            viewBtn.onclick = (e) => { e.stopPropagation(); handleCartToggle(viewBtn, beat); };
            card.querySelector(".featured-price").onclick = (e)=>{ e.stopPropagation(); handleCartToggle(viewBtn, beat); };
            container.appendChild(card);
        });
        enableCinematic(container); initSimilarDragScroll(); syncPlayButtons();
        console.log("✅ Similar tracks loaded");
    }catch(err){ console.log(err); container.innerHTML = `<div class="empty-playlist">Failed to load tracks - check API</div>`; }
}

export const renderSimilarTracks = renderPlaylistSimilarTracks;

function updateCartButtonState(btn, beat) {
    let cart = JSON.parse(localStorage.getItem("dopetone_cart")) || []; const exists = cart.find(item => String(item.id)==String(beat.id));
    const mode=getMode(beat);
    if(mode==='free'){ btn.textContent = "Free Download"; btn.classList.remove("added"); return; }
    if(exists){ btn.textContent = "Remove"; btn.classList.add("added"); } else { btn.textContent = "Add To Cart"; btn.classList.remove("added"); }
}

function handleCartToggle(btn, beat) {
    const mode=getMode(beat);
    if(mode==='free'){
      const a=document.createElement('a'); a.href=beat.mp3_url||beat.audio; a.download=`${beat.title}.mp3`; document.body.appendChild(a); a.click(); a.remove();
      btn.textContent="Downloaded ✓"; setTimeout(()=>btn.textContent="Free Download",1500); return;
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
        if(!window.currentBeat && typeof window.switchActiveBeat === "function") window.switchActiveBeat(newBeat); else window.renderCartBeatRow?.();
    }
    window.renderCartBeatRow?.(); window.updateCartCount?.(); window.checkEmptyState?.(); document.dispatchEvent(new CustomEvent("cartUpdated"));
}

function syncPlayButtons() {
    document.removeEventListener("playerPlay", updatePlayIcons); document.removeEventListener("playerPause", updatePauseIcons);
    document.addEventListener("playerPlay", updatePlayIcons); document.addEventListener("playerPause", updatePauseIcons); updateIconsFromGlobalState();
}
function updatePlayIcons(e) {
    const { index, listId } = e.detail||{};
    document.querySelectorAll("#similarTrack .play-icon, #recentTrack .play-icon, #rpTrackMount .play-icon").forEach(icon => { icon.textContent = "▶"; });
    if (listId === "playlist-similar") { const card = document.querySelector(`#similarTrack .featured-card[data-index="${index}"]`); if (card) card.querySelector(".play-icon").textContent = "⏸"; }
    if (listId === "playlist-recent") { const card = document.querySelector(`#recentTrack .recent-card[data-index="${index}"], #rpTrackMount .recent-card[data-index="${index}"]`); if (card) card.querySelector(".play-icon").textContent = "⏸"; }
}
function updatePauseIcons() {
    if (window.__CURRENT_LIST__ === "playlist-similar") { const card = document.querySelector(`#similarTrack .featured-card[data-index="${window.__CURRENT_INDEX__}"]`); if (card) card.querySelector(".play-icon").textContent = "▶"; }
    if (window.__CURRENT_LIST__ === "playlist-recent") { const card = document.querySelector(`#recentTrack .recent-card[data-index="${window.__CURRENT_INDEX__}"], #rpTrackMount .recent-card[data-index="${window.__CURRENT_INDEX__}"]`); if (card) card.querySelector(".play-icon").textContent = "▶"; }
}
function updateIconsFromGlobalState() {
    if (!window.__PLAYER__?.paused) {
        if (window.__CURRENT_LIST__ === "playlist-similar") { const card = document.querySelector(`#similarTrack .featured-card[data-index="${window.__CURRENT_INDEX__}"]`); if (card) card.querySelector(".play-icon").textContent = "⏸"; }
        if (window.__CURRENT_LIST__ === "playlist-recent") { const card = document.querySelector(`#recentTrack .recent-card[data-index="${window.__CURRENT_INDEX__}"], #rpTrackMount .recent-card[data-index="${window.__CURRENT_INDEX__}"]`); if (card) card.querySelector(".play-icon").textContent = "⏸"; }
    }
}
function enableCinematic(container) {
  const cards = container.querySelectorAll(".featured-card");
  cards.forEach(card => {
    card.addEventListener("mousemove", (e) => { const rect = card.getBoundingClientRect(); const x = ((e.clientX - rect.left) / rect.width) * 100; const y = ((e.clientY - rect.top) / rect.height) * 100; card.style.setProperty("--x", `${x}%`); card.style.setProperty("--y", `${y}%`); });
    card.addEventListener("mouseleave", () => { card.style.setProperty("--x", "50%"); card.style.setProperty("--y", "50%"); });
  });
}
function initSimilarDragScroll(){
    const slider = document.getElementById("similarTrack"); if(!slider || slider.dataset.dragInit) return; slider.dataset.dragInit="1";
    let isDown = false, startX, scrollLeft;
    slider.addEventListener("mousedown", (e) => { isDown = true; slider.classList.add("dragging"); startX = e.pageX - slider.offsetLeft; scrollLeft = slider.scrollLeft; });
    slider.addEventListener("mouseleave", () => { isDown = false; slider.classList.remove("dragging"); });
    slider.addEventListener("mouseup", () => { isDown = false; slider.classList.remove("dragging"); });
    slider.addEventListener("mousemove", (e) => { if(!isDown) return; e.preventDefault(); const x = e.pageX - slider.offsetLeft; const walk = (x - startX) * 1.6; slider.scrollLeft = scrollLeft - walk; });
}

// 🔥 LIVE CC SYNC
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
