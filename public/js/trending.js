// ===============================
// TRENDING SECTION - BULLETPROOF DOWNLOAD + D1 LIVE + MOST PLAYED + SCROLL SAFE
// ===============================
import { globalFilter } from './global-filter.js';

const getMode = b => {
  const m = (b.monetization_mode||b.monetizationMode||'').toLowerCase();
  if(['free','hybrid','paid'].includes(m)) return m;
  if(b.is_free==1) return 'free';
  return 'paid';
};

function pushToD1(beatId, action='cart'){
  try{
    const cart = JSON.parse(localStorage.getItem("dopetone_cart")||"[]");
    const total = cart.length;
    localStorage.setItem('dopetone_cart_count', String(total));
    window.dispatchEvent(new CustomEvent('cc_cart_updated', {detail:{beat_id:beatId, count: total, action}}));
    window.dispatchEvent(new CustomEvent('cc_player_cart_sync', {detail:{total, beat_id:beatId, action}}));
    if(action==='download' || action==='free'){
      window.dispatchEvent(new CustomEvent('cc_downloaded', {detail:{beat_id:beatId, action}}));
      const dlEl = document.getElementById('totalDownloads');
      if(dlEl) dlEl.textContent = String((parseInt(dlEl.textContent||'0')||0)+1);
    }
    const cartEl = document.getElementById('cartItems');
    if(cartEl && action==='cart') cartEl.textContent = String(Math.max(parseInt(cartEl.textContent||'0')||0, total));
  }catch{}
}

async function bulletDownload(beat){
  const url = beat.mp3_url || beat.audio || beat.audio_url;
  if(!url) return;
  try{
    pushToD1(beat.id, 'download');
    const res = await fetch(url, {mode:'cors'});
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${(beat.title||'DopeTone').replace(/[^a-z0-9]/gi,'_')}_FREE.mp3`;
    a.style.display='none';
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(blobUrl); a.remove(); }, 2000);
  }catch{
    const a=document.createElement('a'); a.href=url; a.download=`${beat.title}.mp3`; a.target='_blank'; document.body.appendChild(a); a.click(); a.remove();
  }
}

export function renderTrending() {
  const container = document.getElementById("trendingGrid")
  if (!container ||!window.store?.beats?.length) return

  let all = [...window.store.beats]
  all.sort((a,b)=>{
    const pa = a.play_count?? a.plays?? a.total_plays?? 0
    const pb = b.play_count?? b.plays?? b.total_plays?? 0
    return pb - pa
  })
  let beats = all[0]?.play_count!= null || all[0]?.plays!= null? all.slice(0,10) : globalFilter.filterBeats(all, 'trending').slice(0,10)

  container.innerHTML = ""
  let activeBeatId = null

  beats.slice(0, 4).forEach((beat, i) => {
    container.appendChild(createCard(beat, i))
  })

  let pointer = 4
  let rotIndex = 0

  setInterval(() => {
    const cards = [...container.querySelectorAll(".trending-card")]
    if (!cards.length) return
    let card = null
    for (let i = 0; i < cards.length; i++) {
      const tryCard = cards[(rotIndex + i) % cards.length]
      if (!tryCard.classList.contains("active")) {
        card = tryCard
        rotIndex = (rotIndex + i + 1) % cards.length
        break
      }
    }
    if (!card) {
      card = cards[rotIndex]
      rotIndex = (rotIndex + 1) % cards.length
    }
    if (card.classList.contains("active")) return
    card.classList.add("fade-out")
    setTimeout(() => {
      const beat = beats[pointer % beats.length]
      const beatIndex = pointer % beats.length
      pointer++
      updateCard(card, beat, beatIndex)
      card.classList.remove("fade-out")
      card.classList.add("fade-in")
      setTimeout(() => card.classList.remove("fade-in"), 200)
    }, 200)
  }, 1800)

  function createCard(beat, index) {
    const card = document.createElement("div")
    card.className = "trending-card"
    card.dataset.id = beat.id
    card.dataset.index = index
    card.innerHTML = `
      <img src="${beat.cover_url || beat.image || 'images/studio.jpg'}" draggable="false" />
      <button class="trending-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button>
      <div class="trending-info">
        <div class="trending-title">${beat.title}</div>
        <div class="trending-genre">${beat.genre || "Unknown"} ${getMode(beat)==='free'? '<span style="background:#0d3bff;color:#fff;padding:1px 5px;border-radius:99px;font-size:8px;margin-left:4px">FREE</span>':''}</div>
      </div>
    `
    attachProTap(card, beat, index)
    attachNavigation(card, beat)
    return card
  }

  function updateCard(card, beat, index) {
    card.dataset.id = beat.id
    card.dataset.index = index
    card.querySelector("img").src = beat.cover_url || beat.image || 'images/studio.jpg'
    card.querySelector(".trending-title").textContent = beat.title
    card.querySelector(".trending-genre").innerHTML = `${beat.genre || "Unknown"} ${getMode(beat)==='free'? '<span style="background:#0d3bff;color:#fff;padding:1px 5px;border-radius:99px;font-size:8px;margin-left:4px">FREE</span>':''}`
    card.querySelector(".trending-play").innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`
    attachProTap(card, beat, index)
    attachNavigation(card, beat)
  }

  function attachProTap(card, beat, index) {
    const btn = card.querySelector(".trending-play")
    const doPlay = (e)=>{ e.stopPropagation(); window.globalPlayer.play(index, [...beats], "trending") }
    btn.onclick = doPlay
    let sx=0,sy=0,st=0,moved=false
    card.addEventListener('touchstart', e=>{ const t=e.touches[0]; sx=t.clientX; sy=t.clientY; st=Date.now(); moved=false }, {passive:true})
    card.addEventListener('touchmove', e=>{ const t=e.touches[0]; if(Math.abs(t.clientX-sx)>12||Math.abs(t.clientY-sy)>12) moved=true }, {passive:true})
    card.addEventListener('touchend', e=>{
      if(e.target.closest(".trending-play")) return
      if(moved) return
      if(Date.now()-st>400) return
      e.preventDefault()
      doPlay(e)
    }, {passive:false})
  }

  function attachNavigation(card, beat) {
    function addToCart() {
      let cart = JSON.parse(localStorage.getItem("dopetone_cart") || "[]")
      if(!cart.find(item => String(item.id) == String(beat.id))){
        cart.push({ id: beat.id, title: beat.title, cover: beat.cover_url, cover_url: beat.cover_url, genre: beat.genre, bpm: beat.bpm, audio: beat.mp3_url || beat.audio, mp3_url: beat.mp3_url, mood: beat.mood, key: beat.key, type: beat.type })
        localStorage.setItem("dopetone_cart", JSON.stringify(cart))
        pushToD1(beat.id, 'cart');
      }
    }

    const handleTap = (e) => {
      if (e.target.closest(".trending-play")) return;

      // FREE = instant bullet download without leaving page
      if(getMode(beat)==='free'){
        e.preventDefault();
        bulletDownload(beat);
        let cart = JSON.parse(localStorage.getItem("dopetone_cart")||"[]");
        if(!cart.find(x=> String(x.id)==String(beat.id))){
          cart.push({id:beat.id, title:beat.title, cover:beat.cover_url, mp3_url:beat.mp3_url, _free:true});
          localStorage.setItem("dopetone_cart", JSON.stringify(cart));
          pushToD1(beat.id, 'free');
        }
        return;
      }

      // PAID
      addToCart();
      window.location.href = `licence-page.html?id=${beat.id}`;
    };

    card.ondblclick = handleTap;
    let lastTap=0
    card.addEventListener("touchend", (e) => {
      if (e.target.closest(".trending-play")) return
      const now = Date.now()
      if(now-lastTap<350){
        e.preventDefault();
        handleTap(e);
      }
      lastTap=now
    }, { passive:false })
  }

  document.addEventListener("playerPlay", (e) => {
    const { index, listId } = e.detail
    const currentBeat = beats[index]
    if (!currentBeat) return
    activeBeatId = (listId==="trending")? currentBeat.id : null
    document.querySelectorAll(".trending-card").forEach(card => {
      const btn = card.querySelector(".trending-play")
      if (listId==="trending" && card.dataset.id == activeBeatId) {
        card.classList.add("active")
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>`
      } else {
        card.classList.remove("active")
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`
      }
    })
  })

  document.addEventListener("playerPause", () => {
    document.querySelectorAll(".trending-play").forEach(btn => {
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`
    })
  })
}
