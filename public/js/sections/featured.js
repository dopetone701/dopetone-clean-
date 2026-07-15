// ===============================
// FEATURED - PRO BULLETPROOF - WAVES DOWNLOAD SYSTEM - NO CDN LEAK - D1 LIVE
// ===============================
import { globalFilter } from '../global-filter.js';

const PLAY_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg>`;
const PAUSE_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

const STATS_API = "https://dopetone-stats.dopetone701.workers.dev";

const getMode = b => {
  const m = (b.monetization_mode||b.monetizationMode||'').toLowerCase();
  if(['free','hybrid','paid'].includes(m)) return m;
  if(b.is_free==1) return 'free';
  if(b.has_free_tagged==1) return 'hybrid';
  return 'paid';
};
const fixPrice = p => { let n=Number(p??29.99); if(n>=100) n/=100; return Number((isNaN(n)?29.99:n).toFixed(2)); };
const getPriceHTML = b => getMode(b)==='free'? `<span class="free-dna">FREE</span>` : `<span class="old">$49</span><span class="new">$${fixPrice(b.price).toFixed(2)}</span>`;
const getBuyLabel = b => getMode(b)==='free'? 'Free Download' : 'Buy';

function getFeaturedBeats(allBeats){
  if(!allBeats?.length) return []
  let marked = allBeats.filter(b=> b.is_featured==1 || b.featured==1 || b.featured===true)
  if(marked.length >= 5) return marked.slice(0,10)
  const now = Date.now()
  const scored = [...allBeats].map(b=>{
    const plays = b.play_count?? b.plays?? 0
    const created = b.created_at? new Date(b.created_at).getTime() : 0
    const ageDays = created? (now - created)/(1000*60*60*24) : 365
    const freshness = Math.max(0, 1 - ageDays/90)
    const score = (plays*0.5) + (freshness*1000*0.25) + (fixPrice(b.price)*0.15*10) + (Math.random()*50)
    return {...b, _score: score}
  })
  scored.sort((a,b)=> b._score - a._score)
  const merged = [...marked,...scored.filter(b=>!marked.find(m=>m.id==b.id))]
  return merged.slice(0,10)
}

// ===== PRO WAVES BULLETPROOF DOWNLOAD - NO CDN EXPOSE =====
const activeDownloads = new Set();

async function trackDownload(beat){
  // D1 + Stats API instant
  try{
    // local D1 bump
    const dlEl = document.getElementById('totalDownloads');
    if(dlEl) dlEl.textContent = String((parseInt(dlEl.textContent||'0')||0)+1);

    // fire events for cc-charts
    window.dispatchEvent(new CustomEvent('cc_downloaded', {detail:{beat_id:beat.id, title:beat.title}}));
    window.dispatchEvent(new CustomEvent('cc_track_download', {detail:{beatId:beat.id}}));

    // server side
    fetch(`${STATS_API}/api/stats/track/${beat.id}/download`, {method:'POST', keepalive:true}).catch(()=>{});
    fetch(`${STATS_API}/api/stats/global/download`, {method:'POST', keepalive:true, body: JSON.stringify({beat_id: beat.id})}).catch(()=>{});
  }catch{}
}

async function proDownload(beat, btn){
  if(activeDownloads.has(String(beat.id))) return;
  activeDownloads.add(String(beat.id));
  const origText = btn.innerHTML;

  try{
    btn.disabled = true;
    btn.innerHTML = `<span style="display:flex;align-items:center;gap:6px"><span style="width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;display:inline-block;animation:spin.6s linear infinite"></span> Preparing...</span>`;

    // 1. Track instantly - don't wait for download
    await trackDownload(beat);
    pushToD1(beat.id, 'download');

    // 2. Fetch as blob - hides CDN URL + allows auth
    const url = beat.mp3_url || beat.audio_url || beat.audio;
    if(!url) throw new Error('No audio url');

    const res = await fetch(url, {mode:'cors', cache:'no-store'});
    if(!res.ok) throw new Error('Fetch failed');

    btn.innerHTML = `<span style="display:flex;align-items:center;gap:6px"><span style="width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;display:inline-block;animation:spin.6s linear infinite"></span> Downloading...</span>`;

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    // 3. Trigger download without leaving page (Waves style)
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${beat.title.replace(/[^a-z0-9]/gi,'_')}_DopeTone_FREE.mp3`;
    a.style.display='none';
    document.body.appendChild(a);
    a.click();

    // cleanup after 2s
    setTimeout(()=>{
      URL.revokeObjectURL(blobUrl);
      a.remove();
    }, 2000);

    btn.innerHTML = `✓ Downloaded`;
    btn.style.background = '#10b981';
    btn.style.color = '#fff';

    setTimeout(()=>{
      btn.innerHTML = origText;
      btn.style.background = '';
      btn.style.color = '';
      btn.disabled = false;
      activeDownloads.delete(String(beat.id));
    }, 2500);

  }catch(err){
    console.error('[PRO DOWNLOAD FAIL]', err);
    // fallback direct but still tracked
    try{
      const a=document.createElement('a');
      a.href=beat.mp3_url||beat.audio_url;
      a.download=`${beat.title}.mp3`;
      a.target='_blank'; a.rel='noopener';
      document.body.appendChild(a); a.click(); a.remove();
      btn.innerHTML = `✓ Downloaded`;
      setTimeout(()=>{ btn.innerHTML=origText; btn.disabled=false; activeDownloads.delete(String(beat.id)); },2000);
    }catch{
      btn.innerHTML = `Failed - Retry`;
      btn.disabled=false;
      activeDownloads.delete(String(beat.id));
    }
  }
}

function pushToD1(beatId, action='cart'){
  try{
    const cart = JSON.parse(localStorage.getItem("dopetone_cart")||"[]");
    const total = cart.length;
    const countForBeat = cart.filter(c=> String(c.id)===String(beatId)).length;
    localStorage.setItem('dopetone_cart_count', String(total));
    localStorage.setItem(`dopetone_cart_${beatId}`, String(countForBeat));
    window.dispatchEvent(new CustomEvent('cc_cart_updated', {detail:{beat_id:beatId, count: total, track_count: countForBeat, action}}));
    window.dispatchEvent(new CustomEvent('cc_player_cart_sync', {detail:{total, beat_id:beatId, action}}));
    if(action==='download'||action==='free'){
      window.dispatchEvent(new CustomEvent('cc_downloaded', {detail:{beat_id:beatId, action}}));
    }
    const cartEl = document.getElementById('cartItems');
    if(cartEl) cartEl.textContent = String(Math.max(parseInt(cartEl.textContent||'0')||0, total));
    console.log(`[FEATURED->D1] ${action} ${beatId} total=${total}`);
  }catch{}
}

export function renderFeatured(){
  const root = document.getElementById("featuredTrack");
  if(!root ||!window.store?.beats?.length) return;
  const beats = getFeaturedBeats(window.store.beats)
  if(!beats.length) return

  let current = Math.floor(beats.length/2), cards=[], activeIndex=null, isPlaying=false;

  // inject spin animation once
  if(!document.getElementById('dt-spin-style')){
    const s=document.createElement('style'); s.id='dt-spin-style';
    s.textContent='@keyframes spin{to{transform:rotate(360deg)}}.featured-card{will-change:transform;transform:translateZ(0)}';
    document.head.appendChild(s);
  }

  const frag = document.createDocumentFragment();
  beats.forEach((beat,i)=>{
    const card = document.createElement("div");
    card.className="featured-card";
    card.dataset.i=i;
    card.innerHTML = `
      <div class="f-cover-wrap">
        <img src="${beat.cover_url||beat.cover||'images/studio.jpg'}" loading="lazy" decoding="async" alt="${beat.title}">
        <button class="f-play" aria-label="play"><span class="f-icon">${PLAY_SVG}</span></button>
      </div>
      <div class="f-content">
        <div class="f-title">${beat.title}</div>
        <div class="f-meta">#${beat.genre||'Trap'} • ${beat.bpm||140} BPM</div>
        <div class="f-price">${getPriceHTML(beat)}</div>
        <button class="f-buy ${getMode(beat)==='free'?'is-free':''}">${getBuyLabel(beat)}</button>
      </div>`;

    const playBtn = card.querySelector(".f-play");
    const buyBtn = card.querySelector(".f-buy");

    playBtn.onclick = e=>{
      e.stopPropagation();
      const same = window.__CURRENT_LIST__==="featured" && window.__CURRENT_INDEX__===i;
      const audio = window.__DOPE_TONE_AUDIO__;
      if(same && audio) audio.paused? audio.play() : audio.pause();
      else window.globalPlayer?.play(i, beats, "featured");
    };

    buyBtn.onclick = async e=>{
      e.stopPropagation();
      const mode = getMode(beat);

      if(mode==='free'){
        // BULLETPROOF FREE DOWNLOAD - WAVES STYLE
        await proDownload(beat, buyBtn);
        return;
      }

      // PAID - CART + D1
      let cart=JSON.parse(localStorage.getItem("dopetone_cart")||"[]");
      if(!cart.find(x=>String(x.id)===String(beat.id))){
        cart.push(beat);
        localStorage.setItem("dopetone_cart",JSON.stringify(cart));
        pushToD1(beat.id, 'cart');
      }
      // stay on page but update charts instantly, then go licence
      setTimeout(()=>{ location.href=`licence-page.html?id=${beat.id}`; }, 150);
    };

    card.onclick = e=>{ if(!e.target.closest(".f-play,.f-buy")) animateTo(i); };
    frag.appendChild(card);
    cards.push(card);
  });
  root.innerHTML=""; root.appendChild(frag);

  function getOffset(i){ let d=i-current; if(d>beats.length/2)d-=beats.length; if(d<-beats.length/2)d+=beats.length; return d; }
  function update(){
    cards.forEach((c,i)=>{
      const o=getOffset(i);
      c.style.transform=`translate(-50%,-50%) translateX(${o*110}%) scale(${1-Math.abs(o)*0.18})`;
      c.style.opacity = Math.max(0,1-Math.abs(o)*0.45);
      c.style.zIndex = 10-Math.abs(Math.round(o));
    });
  }
  function syncUI(){
    cards.forEach((c,i)=>{
      const ic=c.querySelector(".f-icon");
      const isActive = i===activeIndex && isPlaying;
      ic.innerHTML = isActive? PAUSE_SVG : PLAY_SVG;
      c.classList.toggle("is-active", isActive);
    });
  }
  function animateTo(t){
    const s=current, len=beats.length; let d=t-s; if(d>len/2)d-=len; if(d<-len/2)d+=len;
    const dur=380, st=performance.now();
    const tick = now=>{
      const p=Math.min((now-st)/dur,1), e=1-Math.pow(1-p,3);
      current=s+d*e; update();
      if(p<1) requestAnimationFrame(tick); else { current=(t+len)%len; update(); }
    }; requestAnimationFrame(tick);
  }

  document.addEventListener("playerPlay",e=>{
    if(e.detail?.listId!=="featured"){ activeIndex=null; isPlaying=false; syncUI(); return; }
    activeIndex=e.detail.index; isPlaying=true; syncUI(); animateTo(e.detail.index);
  });
  document.addEventListener("playerPause",()=>{ if(window.__CURRENT_LIST__!=="featured")return; isPlaying=false; syncUI(); });

  let sx=0, sy=0, st=0, isSwiping=false;
  root.addEventListener('touchstart',e=>{ sx=e.touches[0].clientX; sy=e.touches[0].clientY; st=Date.now(); isSwiping=false; },{passive:true});
  root.addEventListener('touchmove',e=>{
    if(!sx) return; const dx=e.touches[0].clientX-sx; const dy=e.touches[0].clientY-sy;
    if(Math.abs(dx) > Math.abs(dy) && Math.abs(dx)>10){ isSwiping=true; e.preventDefault(); }
  },{passive:false});
  root.addEventListener('touchend',e=>{
    const dx=e.changedTouches[0].clientX-sx;
    if(isSwiping && Math.abs(dx)>40 && Date.now()-st<600){
      animateTo(dx<0? (Math.round(current)+1)%beats.length : (Math.round(current)-1+beats.length)%beats.length);
    }
    sx=0; sy=0; isSwiping=false;
  },{passive:true});

  function enableMouseLight(){
    cards.forEach(card=>{
      card.addEventListener("mousemove", e=>{
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width * 100;
        const y = (e.clientY - r.top) / r.height * 100;
        card.style.setProperty("--x", `${x}%`);
        card.style.setProperty("--y", `${y}%`);
      });
    });
  }
  enableMouseLight();
  update(); syncUI();
}
