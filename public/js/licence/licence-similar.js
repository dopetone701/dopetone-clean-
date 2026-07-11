// ========================================
// 🔥 SIMILAR TRACKS - FIXED FOR LICENCE PAGE + MONETIZATION + PRICE FIX + NO PAID WORD
// ========================================
const API_URL = 'https://api.dopetonevault.com';

const getMode = (b) => {
  if (!b) return 'paid';
  let m = (b.monetization_mode || b.monetizationMode || '').toString().toLowerCase().trim();
  if (['free','hybrid','paid'].includes(m)) return m;
  if (b.is_free==1 || b.is_free===true) return 'free';
  if (b.has_free_tagged==1) return 'hybrid';
  return 'paid';
};

function fixPrice(p){
  if(p===null||p===undefined) return 19;
  let price = Number(p);
  if(isNaN(price)) return 19;
  if(price >= 1000) price = price / 100;
  if(price >= 100) price = price / 100;
  return Number(price.toFixed(2));
}

function normalizeBeat(beat) {
  if (!beat) return null;
  return {
...beat,
    id: beat.id || beat.beat_id,
    audio: beat.audio || beat.mp3_url,
    mp3_url: beat.mp3_url || beat.audio,
    cover: beat.cover || beat.cover_url,
    cover_url: beat.cover_url || beat.cover,
    zip_url: beat.zip_url || beat.project_file,
    monetization_mode: beat.monetization_mode || beat.monetizationMode || getMode(beat),
    monetizationMode: beat.monetizationMode || beat.monetization_mode || getMode(beat),
    price: fixPrice(beat.price?? 19)
  };
}

let _beatCache = null;
async function fetchAllBeats(){
  if(_beatCache) return _beatCache;
  try{
    const res = await fetch(`${API_URL}/beats`);
    if(!res.ok) throw new Error('beats failed');
    let beats = await res.json();
    beats = beats.map(normalizeBeat);
    _beatCache = beats;
    return beats;
  }catch(e){
    const cart = JSON.parse(localStorage.getItem("dopetone_cart")||"[]");
    const playlists = JSON.parse(localStorage.getItem("playlists")||"[]");
    const fromPlaylists = playlists.flatMap(p=>p.beats||[]);
    return [...cart,...fromPlaylists].map(normalizeBeat).slice(0,20);
  }
}

export async function renderSimilarTracks(currentList = null) {
    const container = document.getElementById("similarTrack");
    if(!container) return;
    container.innerHTML = `<div style="padding:20px;color:#888">Loading tracks...</div>`;
    try{
        let beats = await fetchAllBeats();
        if(!beats?.length){ container.innerHTML = `<div class="empty-playlist">No tracks found</div>`; return; }
        const currentId = window.currentBeat?.id || (currentList&&currentList[0]?.id);
        if(currentId) beats = beats.filter(b=>String(b.id)!==String(currentId));
        beats = beats.sort(()=>Math.random()-0.5).slice(0,10);
        container.innerHTML = "";
        const cart = JSON.parse(localStorage.getItem("dopetone_cart")||"[]");
        beats.forEach((beat, index) => {
            beat = normalizeBeat(beat);
            const mode = getMode(beat);
            const card = document.createElement("div");
            card.className = "latest-card";
            card.dataset.index = index;
            card.dataset.mode = mode;
            card.innerHTML = `
                <div class="latest-media">
                    <img src="${beat.cover_url || beat.cover || "images/studio.jpg"}" loading="lazy">
                    <button class="play-overlay latest-play"><span class="play-icon">▶</span></button>
                    ${mode==='free'?'<span style="position:absolute;top:6px;left:6px;background:#3b82f6;color:#fff;font-size:9px;font-weight:800;padding:3px 6px;border-radius:4px">FREE</span>':''}
                </div>
                <div class="latest-title">${beat.title || beat.name || "Untitled"}</div>
                <div class="latest-tag">#${beat.genre || "Trap"}</div>
                <div class="latest-price-row" style="cursor:pointer">
                    <span class="new-price" style="${mode==='free'?'color:#3b82f6;font-weight:800;font-size:16px':''}">${mode==='free'?'FREE':`$${fixPrice(beat.price).toFixed(2)}`}</span>
                </div>
                <div class="latest-actions">
                    <button class="btn-buy" style="cursor:pointer">${mode==='free'?'Free Download': (cart.find(x=>String(x.id)===String(beat.id))? 'Remove' : 'Add To Cart')}</button>
                </div>
            `;
            const exists = cart.find(item => String(item.id)==String(beat.id));
            const btn = card.querySelector(".btn-buy");
            if(exists && mode!=='free'){ btn.textContent="Remove"; btn.classList.add("added"); }
            card.querySelector(".latest-play").onclick = (e) => {
                e.stopPropagation();
                const cleanPlaylist = beats.map(b=>({ id: b.id, title: b.title, cover_url: b.cover_url||b.cover, mp3_url: b.mp3_url||b.audio, genre: b.genre, bpm: b.bpm, monetization_mode: b.monetization_mode, price: fixPrice(b.price) }));
                window.globalPlayer?.play(index, cleanPlaylist, "similar-tracks");
            };
            const handleCart = async (e) => {
                e.stopPropagation();
                const btnEl = e.currentTarget.closest('.latest-card')?.querySelector('.btn-buy') || e.currentTarget;
                let cart = JSON.parse(localStorage.getItem("dopetone_cart")||"[]");
                if(mode==='free'){
                  const a=document.createElement('a'); a.href=beat.mp3_url||beat.audio; a.download=`${beat.title}.mp3`; document.body.appendChild(a); a.click(); a.remove();
                  btnEl.textContent="Downloaded ✓"; setTimeout(()=>btnEl.textContent="Free Download",1500); return;
                }
                const exists = cart.find(item => String(item.id)==String(beat.id));
                if(exists){
                    cart = cart.filter(item => String(item.id)!=String(beat.id));
                    localStorage.setItem("dopetone_cart", JSON.stringify(cart));
                    btnEl.textContent="Add To Cart"; btnEl.classList.remove("added");
                }else{
                    cart.push(normalizeBeat(beat));
                    localStorage.setItem("dopetone_cart", JSON.stringify(cart));
                    btnEl.textContent="Added ✓"; btnEl.classList.add("added");
                    const hasActiveTrack = window.currentBeat || window.activeCartBeat;
                    if(!hasActiveTrack && typeof window.switchActiveBeat==="function"){ await window.switchActiveBeat(normalizeBeat(beat)); }
                }
                window.renderCartBeatRow?.(); window.updateCartCount?.(); window.checkEmptyState?.();
            };
            card.querySelector(".btn-buy").onclick = handleCart;
            card.querySelector(".latest-price-row").onclick = handleCart;
            container.appendChild(card);
        });
        const left = document.getElementById("similarLeft");
        const right = document.getElementById("similarRight");
        if(left && right){
          left.onclick = () => container.scrollBy({ left:-320, behavior:"smooth" });
          right.onclick = () => container.scrollBy({ left:320, behavior:"smooth" });
        }
        initDragScroll(container);
    }catch(err){ container.innerHTML=`<div class="empty-playlist">Failed to load</div>`; }
}

function initDragScroll(slider){
  if(!slider || slider.dataset.dragInit) return;
  slider.dataset.dragInit="1";
  let isDown=false, startX, scrollLeft;
  slider.addEventListener("mousedown", (e)=>{ isDown=true; slider.classList.add("dragging"); startX=e.pageX-slider.offsetLeft; scrollLeft=slider.scrollLeft; });
  slider.addEventListener("mouseleave", ()=>{ isDown=false; slider.classList.remove("dragging"); });
  slider.addEventListener("mouseup", ()=>{ isDown=false; slider.classList.remove("dragging"); });
  slider.addEventListener("mousemove", (e)=>{ if(!isDown) return; e.preventDefault(); const x=e.pageX-slider.offsetLeft; const walk=(x-startX)*1.6; slider.scrollLeft=scrollLeft-walk; });
}
window.addEventListener('cc_monetize_changed', ()=>{ _beatCache=null; renderSimilarTracks(); });
