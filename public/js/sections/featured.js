// ===============================
// FEATURED - ULTRA FAST + 60FPS CINEMATIC
// ===============================
import { globalFilter } from '../global-filter.js';

const TRACK_PRICE_API = "https://track-price-api.dopetone701.workers.dev";
const PLAY_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg>`;
const PAUSE_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

const getMode = (b) => {
  if (!b) return 'paid';
  let m = (b.monetization_mode||b.monetizationMode||'').toLowerCase();
  if (['free','hybrid','paid'].includes(m)) return m;
  if (m.includes('tagged')||m.includes('hybrid')) return 'hybrid';
  if (b.is_free==1||b.is_free===true) return 'free';
  if (b.has_free_tagged==1) return 'hybrid';
  return 'paid';
};

function fixPrice(p){
  let price = Number(p ?? 29.99);
  if(isNaN(price)) return 29.99;
  if(price >= 1000) price = price/100;
  if(price >= 100) price = price/100;
  return Number(price.toFixed(2));
}

const getPriceHTML = (b) => {
  const m=getMode(b), p=fixPrice(b.price);
  return m==='free'? `<span class="new" style="color:#3b82f6;font-weight:800">FREE</span>` : `<span class="old">$49</span><span class="new">$${p.toFixed(2)}</span>`;
};
const getBuyLabel = b=>getMode(b)==='free'?'Free Download':'Buy';

let d1Map = null;

async function fetchD1(){
  try{
    const r=await fetch(`${TRACK_PRICE_API}/api/monetization/all`, {cache:'no-store'});
    const list=await r.json();
    const map={};
    list.forEach(x=>{
      let mode=(x.monetization_mode||'').toLowerCase()||(x.is_free==1?'free':x.has_free_tagged==1?'hybrid':'paid');
      map[String(x.id)]={mode, price:fixPrice(x.price)};
    });
    d1Map=map;
    return map;
  }catch{return {}}
}

export function renderFeatured(){
  const container=document.getElementById("featuredTrack");
  if(!container||!store?.beats?.length) return;
  const beats=globalFilter.filterBeats(store.beats,'featured').map(b=>({...b, price:fixPrice(b.price)}));
  let current=Math.floor(beats.length/2), activeIndex=null, isPlaying=false;
  let cards = [];

  function getOffset(i){
    let d=i-current; if(d>beats.length/2)d-=beats.length; if(d<-beats.length/2)d+=beats.length; return d;
  }

  // 🔥 CREATE DOM ONCE - NO INNERHTML ON ANIMATE
  function buildCards(){
    container.innerHTML="";
    cards = beats.map((beat,i)=>{
      const card=document.createElement("div");
      card.className="featured-card";
      card.dataset.id=beat.id;
      card.dataset.index=i;
      card.innerHTML=`
        <div style="position:relative"><img src="${beat.cover_url||beat.cover||'images/studio.jpg'}" loading="lazy" decoding="async"/>
        <button class="play-overlay featured-play"><span class="play-icon">${PLAY_SVG}</span></button>${getMode(beat)==='free'?`</span>`:''}</div>
        <div class="featured-content"><div class="featured-title">${beat.title}</div>
        <div class="featured-meta">#${beat.genre||'Trap'} • ${beat.bpm||140} BPM</div>
        <div class="featured-price">${getPriceHTML(beat)}</div>
        <button class="featured-buy">${getBuyLabel(beat)}</button></div>`;
      
      card.querySelector(".featured-play").addEventListener("click",e=>{
        e.stopPropagation();
        const same=window.__CURRENT_LIST__==="featured"&&window.__CURRENT_INDEX__===i;
        const a=window.__DOPE_TONE_AUDIO__;
        if(same&&a) a.paused?a.play():a.pause(); else window.globalPlayer?.play(i,[...beats],"featured");
      });
      card.querySelector(".featured-buy").onclick=e=>{
        e.stopPropagation();
        if(getMode(beat)==='free'){const a=document.createElement('a');a.href=beat.mp3_url||beat.audio;a.download=`${beat.title}.mp3`;document.body.appendChild(a);a.click();a.remove();return;}
        let cart=JSON.parse(localStorage.getItem("dopetone_cart")||"[]");
        if(!cart.find(x=>String(x.id)===String(beat.id))){cart.push({...beat, price:fixPrice(beat.price)});localStorage.setItem("dopetone_cart",JSON.stringify(cart));}
        location.href=`licence-page.html?id=${beat.id}`;
      };
      card.addEventListener("click",e=>{if(!e.target.closest(".featured-play,.featured-buy")) animateTo(i);});
      container.appendChild(card);
      return card;
    });
    enableCinematic();
  }

  // 🔥 UPDATE ONLY TRANSFORMS - 60FPS
  function updatePositions(){
    cards.forEach((card,i)=>{
      const o=getOffset(i);
      card.style.transform=`translate(-50%,-50%) translateX(${o*120}%) scale(${1-Math.abs(o)*0.2}) rotateY(${o*-25}deg)`;
      card.style.opacity=Math.max(0,1-Math.abs(o)*0.5);
      card.style.zIndex=10-Math.abs(Math.round(o));
    });
  }

  function syncUI(){
    cards.forEach((c,i)=>{
      const ic=c.querySelector(".play-icon"); if(!ic)return;
      const act=i===activeIndex&&isPlaying; ic.innerHTML=act?PAUSE_SVG:PLAY_SVG; c.classList.toggle("active",act);
    });
  }

  function animateTo(t){
    let s=current,len=beats.length,d=t-s; if(d>len/2)d-=len; if(d<-len/2)d+=len;
    const dur=350,st=performance.now();
    const frame=now=>{
      const p=Math.min((now-st)/dur,1);
      current=s+d*(1-Math.pow(1-p,3));
      updatePositions();
      if(p<1) requestAnimationFrame(frame); else {current=(t+len)%len; updatePositions();}
    }; requestAnimationFrame(frame);
  }

  // EVENTS
  document.addEventListener("playerPlay",e=>{
    const {index,listId}=e.detail||{}; if(listId!=="featured"){activeIndex=null;isPlaying=false;syncUI();return;}
    activeIndex=index;isPlaying=true;syncUI(); animateTo(index);
  });
  document.addEventListener("playerPause",()=>{if(window.__CURRENT_LIST__!=="featured")return; isPlaying=false;syncUI();});

  window.addEventListener('cc_monetize_changed', e=>{
    const {beatId,mode,price}=e.detail||{}; if(!beatId)return;
    const b=beats.find(x=>String(x.id)===String(beatId));
    if(b){b.monetization_mode=mode;b.monetizationMode=mode; b.price=fixPrice(price??b.price); b.is_free=mode==='free'?1:0; b.has_free_tagged=mode==='hybrid'?1:0;}
    // Update only that card price, no full rebuild
    const idx = beats.findIndex(x=>String(x.id)===String(beatId));
    if(idx>-1 && cards[idx]){
      cards[idx].querySelector(".featured-price").innerHTML = getPriceHTML(b);
      cards[idx].querySelector(".featured-buy").textContent = getBuyLabel(b);
    }
  });

  container.addEventListener('touchstart',e=>{container._sx=e.touches[0].clientX; container._st=Date.now();},{passive:true});
  container.addEventListener('touchend',e=>{
    const dx=e.changedTouches[0].clientX-container._sx;
    if(Math.abs(dx)>40&&Date.now()-container._st<600){
      const cur=Math.round(current);
      animateTo(dx<0?(cur+1)%beats.length:(cur-1+beats.length)%beats.length);
    }
  });

  // 🔥 INSTANT FIRST PAINT - NO WAIT FOR D1
  buildCards();
  updatePositions();
  syncUI();

  // 🔥 D1 sync in background, update prices silently
  fetchD1().then(map=>{
    let changed=false;
    beats.forEach(b=>{
      const d1=map[String(b.id)];
      if(d1&& (d1.mode!==getMode(b) || d1.price!==b.price)){
        b.monetization_mode=d1.mode; b.monetizationMode=d1.mode; b.price=fixPrice(d1.price); changed=true;
        const idx=beats.indexOf(b);
        if(cards[idx]){
          cards[idx].querySelector(".featured-price").innerHTML=getPriceHTML(b);
          cards[idx].querySelector(".featured-buy").textContent=getBuyLabel(b);
        }
      }
    });
    if(changed) console.log('[Featured] D1 background sync done');
  });
}

function enableCinematic(){
  document.querySelectorAll(".featured-card").forEach(card=>{
    card.addEventListener("mousemove",e=>{
      const r=card.getBoundingClientRect();
      card.style.setProperty("--x",`${(e.clientX-r.left)/r.width*100}%`);
      card.style.setProperty("--y",`${(e.clientY-r.top)/r.height*100}%`);
    });
  });
}
