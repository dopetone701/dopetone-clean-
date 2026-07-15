// ===============================
// FEATURED - PRO AUTO FILTER - 60FPS - NO LAG
// ===============================
import { globalFilter } from '../global-filter.js';

const PLAY_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg>`;
const PAUSE_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

const getMode = b => {
  const m = (b.monetization_mode||b.monetizationMode||'').toLowerCase();
  if(['free','hybrid','paid'].includes(m)) return m;
  if(b.is_free==1) return 'free';
  if(b.has_free_tagged==1) return 'hybrid';
  return 'paid';
};
const fixPrice = p => { let n=Number(p??29.99); if(n>=100) n/=100; return Number((isNaN(n)?29.99:n).toFixed(2)); };
const getPriceHTML = b => getMode(b)==='free'
? `<span class="free-dna">FREE</span>`
  : `<span class="old">$49</span><span class="new">$${fixPrice(b.price).toFixed(2)}</span>`;
const getBuyLabel = b => getMode(b)==='free'? 'Free Download' : 'Buy';

// === PRO AUTO FEATURED LOGIC ===
function getFeaturedBeats(allBeats){
  if(!allBeats?.length) return []

  // 1. If admin marked featured, respect it
  let marked = allBeats.filter(b=> b.is_featured==1 || b.featured==1 || b.featured===true)
  if(marked.length >= 5) return marked.slice(0,10)

  // 2. AUTO SCORE: plays 50% + freshness 25% + price/value 15% + random 10% (like BeatStars)
  const now = Date.now()
  const scored = [...allBeats].map(b=>{
    const plays = b.play_count?? b.plays?? b.total_plays?? 0
    const created = b.created_at? new Date(b.created_at).getTime() : 0
    const ageDays = created? (now - created)/(1000*60*60*24) : 365
    const freshness = Math.max(0, 1 - ageDays/90) // 90 days = fresh
    const price = fixPrice(b.price)
    // score
    const score = (plays*0.5) + (freshness*1000*0.25) + (price*0.15*10) + (Math.random()*50)
    return {...b, _score: score}
  })
  scored.sort((a,b)=> b._score - a._score)

  // merge: keep marked on top, fill with top scored
  const merged = [...marked,...scored.filter(b=>!marked.find(m=>m.id==b.id))]
  return merged.slice(0,10)
}

export function renderFeatured(){
  const root = document.getElementById("featuredTrack");
  if(!root ||!window.store?.beats?.length) return;

  const beats = getFeaturedBeats(window.store.beats)
  if(!beats.length) return

  let current = Math.floor(beats.length/2), cards=[], activeIndex=null, isPlaying=false;

  // Build once - Fragment = light
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
    buyBtn.onclick = e=>{
      e.stopPropagation();
      if(getMode(beat)==='free'){
        const a=document.createElement('a'); a.href=beat.mp3_url||beat.audio; a.download=`${beat.title}.mp3`;
        document.body.appendChild(a); a.click(); a.remove(); return;
      }
      let cart=JSON.parse(localStorage.getItem("dopetone_cart")||"[]");
      if(!cart.find(x=>String(x.id)===String(beat.id))) { cart.push(beat); localStorage.setItem("dopetone_cart",JSON.stringify(cart)); }
      location.href=`licence-page.html?id=${beat.id}`;
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

   // === TOUCH SWIPE - LOCK VERTICAL SCROLL ===
  let sx=0, sy=0, st=0, isSwiping=false;
  root.addEventListener('touchstart',e=>{
    sx=e.touches[0].clientX;
    sy=e.touches[0].clientY;
    st=Date.now();
    isSwiping=false;
  },{passive:true});

  root.addEventListener('touchmove',e=>{
    if(!sx) return;
    const dx=e.touches[0].clientX-sx;
    const dy=e.touches[0].clientY-sy;
    // if horizontal swipe > vertical, lock page scroll
    if(Math.abs(dx) > Math.abs(dy) && Math.abs(dx)>10){
      isSwiping=true;
      e.preventDefault();
    }
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
