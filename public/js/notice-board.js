// js/notice-board.js - BEAUTIFUL + ANY TRACK - DROP ZONE OR SINGLE
const DROP_API = "https://dt-drop-zone-api.dopetone701.workers.dev";
const TICKETS_API = "https://support-tickets-api.dopetone701.workers.dev";
const FEED = document.getElementById('noticeBoardFeed');
const INPUT = document.getElementById('noticeBoardInput');
const SEND = document.getElementById('noticeBoardSend');
if (INPUT) INPUT.placeholder = "Talk to us... 💬";

let activeBeat = null;
let activeBeatsList = [];
let activeIndex = 0;

function ensureModal() {
  if (document.getElementById('dtBeatModal')) return;
  const m = document.createElement('div');
  m.id = 'dtBeatModal';
  m.style.cssText = 'display:none;position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.88);backdrop-filter:blur(12px);align-items:center;justify-content:center;padding:16px';
  m.innerHTML = `
    <div style="width:100%;max-width:400px;background:#121212;border:1px solid #282828;border-radius:24px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.9)">
      <div style="position:relative">
        <img id="dtBigCover" src="" style="width:100%;aspect-ratio:1;object-fit:cover">
        <button onclick="closeBeatModal()" style="position:absolute;top:14px;right:14px;width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,.7);border:1px solid #333;color:#fff;font-size:16px;cursor:pointer">✕</button>
        <button id="dtBigPlay" style="position:absolute;bottom:-24px;right:18px;width:56px;height:56px;border-radius:50%;background:#1ED760;color:#000;border:none;font-size:20px;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center"><i id="dtPlayIcon" class="fa-solid fa-play" style="margin-left:2px"></i></button>
      </div>
      <div style="padding:22px 18px 16px">
        <div id="dtBigTitle" style="color:#fff;font-size:20px;font-weight:800;line-height:1.2"></div>
        <div id="dtBigMeta" style="color:#b3b3b3;font-size:12px;margin-top:6px;display:flex;gap:8px;flex-wrap:wrap"></div>
        <div id="dtRest" style="display:flex;gap:8px;overflow-x:auto;margin-top:18px;padding-bottom:4px"></div>
      </div>
    </div>`;
  m.onclick = (e) => { if (e.target.id==='dtBeatModal') closeBeatModal(); };
  document.body.appendChild(m);
}
ensureModal();

function playBeatLinked(beat){
  activeBeat = beat;
  const list = activeBeatsList.map(b=>({id:b.id, title:b.title, cover_url:b.cover_url||b.cover, cover:b.cover_url, mp3_url:b.mp3_url||b.audio_url||b.audio}));
  const idx = list.findIndex(b=> String(b.id)===String(beat.id));
  if(window.globalPlayer && window.globalPlayer.play){
    window.globalPlayer.play(idx>=0? idx:0, list, 'drop-zone');
  }else if(beat.mp3_url || beat.audio_url || beat.audio){
    const a = window.__DOPE_TONE_AUDIO__ || new Audio();
    a.src = beat.mp3_url || beat.audio_url || beat.audio;
    a.play().catch(()=>{});
    window.__DOPE_TONE_AUDIO__ = a;
  }
  const icon = document.getElementById('dtPlayIcon');
  if(icon) icon.className = 'fa-solid fa-pause';
}

function togglePlay(){
  if(!activeBeat) return;
  const audio = window.__DOPE_TONE_AUDIO__;
  const icon = document.getElementById('dtPlayIcon');
  if(audio &&!audio.paused){
    if(window.globalPlayer) window.globalPlayer.toggle();
    else audio.pause();
    if(icon) icon.className='fa-solid fa-play';
  }else{
    playBeatLinked(activeBeat);
    if(icon) icon.className='fa-solid fa-pause';
  }
}

window.openBeatCard = (beatId, dropId) => {
  ensureModal();
  let beats = [];
  let drop = null;

  // 1. Try find in drop zone cache
  if(dropId){
    drop = window._dropsCache?.find(d=>d.id===dropId);
    if(drop) beats = drop.promotion?.items || [];
  }
  if(!beats.length){
    drop = window._dropsCache?.find(d=>(d.promotion?.items||[]).some(x=>String(x.id)===String(beatId)));
    if(drop) beats = drop.promotion?.items || [];
  }

  // 2. If NOT from drop zone -> build single track from current player or store
  if(!beats.length){
    let single = null;
    // From global player current beat
    if(window.__CURRENT_BEAT__ && String(window.__CURRENT_BEAT__.id)===String(beatId)){
      const cb = window.__CURRENT_BEAT__;
      single = {id:cb.id, title:cb.title, cover_url:cb.cover_url||cb.cover, genre:cb.genre, bpm:cb.bpm, price:cb.price, mp3_url:cb.mp3_url, audio_url:cb.mp3_url};
    }
    // From global playlist
    if(!single && window.globalPlayer && window.globalPlayer.getPlaylist){
      const pl = window.globalPlayer.getPlaylist();
      const found = pl.find(x=> String(x.id)===String(beatId));
      if(found) single = {id:found.id, title:found.title, cover_url:found.cover_url||found.cover, genre:found.genre, bpm:found.bpm, price:found.price, mp3_url:found.mp3_url, audio_url:found.mp3_url};
    }
    // From beats store
    if(!single && window.store?.beats){
      const found = window.store.beats.find(x=> String(x.id)===String(beatId));
      if(found) single = {id:found.id, title:found.title, cover_url:found.cover_url, genre:found.genre, bpm:found.bpm, price:found.price, mp3_url:found.mp3_url||found.audio_url, audio_url:found.mp3_url};
    }
    // Fallback from passed beatId only
    if(single) beats = [single];
  }

  if(!beats.length) return;
  activeBeatsList = beats;
  activeIndex = beats.findIndex(x=>String(x.id)===String(beatId));
  if(activeIndex<0) activeIndex=0;
  const b = beats[activeIndex];
  activeBeat = b;

  document.getElementById('dtBigCover').src = b.cover_url;
  document.getElementById('dtBigTitle').textContent = b.title;
  document.getElementById('dtBigMeta').innerHTML = `
    <span style="background:#232323;padding:4px 8px;border-radius:99px">🎵 ${b.genre||'Beat'}</span>
    <span style="background:#232323;padding:4px 8px;border-radius:99px">${b.bpm? b.bpm+' BPM' : 'DopeTone Exclusive'}</span>
    ${b.price? `<span style="background:#1ED760;color:#000;padding:4px 10px;border-radius:99px;font-weight:800">$${b.price}</span>` : '<span style="background:#fff;color:#000;padding:4px 10px;border-radius:99px;font-weight:800">NEW DROP</span>'}
  `;

  const playBtn = document.getElementById('dtBigPlay');
  const icon = document.getElementById('dtPlayIcon');
  const audio = window.__DOPE_TONE_AUDIO__;
  const isPlaying = audio &&!audio.paused && window.__CURRENT_BEAT__ && String(window.__CURRENT_BEAT__.id)===String(b.id);
  if(icon) icon.className = isPlaying? 'fa-solid fa-pause' : 'fa-solid fa-play';
  playBtn.onclick = () => togglePlay();

  // IF ONLY 1 TRACK -> NO CUE, IF FROM DROP ZONE -> SHOW CUE
  const restEl = document.getElementById('dtRest');
  if(beats.length<=1){
    restEl.innerHTML = '';
    restEl.style.display='none';
  }else{
    restEl.style.display='flex';
    restEl.innerHTML = beats.map(x=>`
      <div style="position:relative;flex-shrink:0">
        <img src="${x.cover_url}" onclick="openBeatCard('${x.id}','${drop? drop.id : ''}')" style="width:60px;height:60px;border-radius:10px;object-fit:cover;cursor:pointer;border:${String(x.id)===String(b.id)?'2px solid #1ED760':'1px solid #333'}">
        <button onclick="event.stopPropagation(); this.parentElement.remove()" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:#000;border:1px solid #333;color:#fff;font-size:9px;cursor:pointer">✕</button>
      </div>
    `).join('');
  }

  document.getElementById('dtBeatModal').style.display='flex';
  // Don't auto play if already playing same track
  if(!isPlaying) playBeatLinked(b);
};

window.closeBeatModal = () => { const m=document.getElementById('dtBeatModal'); if(m) m.style.display='none'; };
window.openDropBeatModal = (id) => window.openBeatCard(id, null);

async function loadDrops() {
  if (!FEED) return;
  try {
    const res = await fetch(`${DROP_API}/api/notices?t=${Date.now()}`, {cache:'no-store'});
    const drops = await res.json();
    window._dropsCache = drops;
    if (!drops.length) {
      FEED.innerHTML = `<div style="padding:50px;text-align:center;background:#121212;border-radius:16px;border:1px solid #232323;color:#555">No drops</div>`;
      return;
    }
    FEED.innerHTML = drops.map(n => {
      const beats = n.promotion?.items || [];
      const isPromo = beats.length>0;
      let promoHTML = '';
      if (isPromo) {
        const big = beats[0];
        const small = beats.slice(1);
        promoHTML = `
          <div style="margin-top:14px;background:#121212;border:1px solid #282828;border-radius:16px;overflow:hidden">
            <div style="padding:10px 14px;background:#181818;border-bottom:1px solid #282828;display:flex;align-items:center;gap:8px">
              <span style="width:7px;height:7px;background:#1ED760;border-radius:50%;box-shadow:0 0 8px #1ED760"></span>
              <span style="font-size:11px;color:#fff;font-weight:800;letter-spacing:.5px">${beats.length} BEATS DROP</span>
            </div>
            <div style="padding:14px;display:flex;gap:14px">
              <img src="${big.cover_url}" onclick="openBeatCard('${big.id}','${n.id}')" style="width:140px;height:140px;border-radius:14px;object-fit:cover;cursor:pointer;border:1px solid #282828;flex-shrink:0">
              <div style="flex:1;min-width:0">
                <div style="color:#fff;font-size:16px;font-weight:800;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${big.title}</div>
                <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
                  <span style="background:#232323;color:#b3b3b3;font-size:10px;padding:4px 8px;border-radius:99px">DOPE TONE</span>
                  <span style="background:#232323;color:#b3b3b3;font-size:10px;padding:4px 8px;border-radius:99px">${big.genre||'Trap / Drill'}</span>
                  ${big.price? `<span style="background:#fff;color:#000;font-size:10px;font-weight:800;padding:4px 8px;border-radius:99px">$${big.price}</span>` : ''}
                </div>
                <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
                  ${small.map(b=>`<img src="${b.cover_url}" onclick="openBeatCard('${b.id}','${n.id}')" title="${b.title}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;cursor:pointer;border:1px solid #282828">`).join('')}
                </div>
              </div>
            </div>
          </div>`;
      }
      let mediaHTML = '';
      if (!isPromo && n.media?.url) {
        if (n.media.type==='image') mediaHTML = `<img src="${n.media.url}" style="width:100%;border-radius:16px;margin-top:14px;border:1px solid #282828;max-height:500px;object-fit:cover">`;
        else mediaHTML = `<video src="${n.media.url}" controls style="width:100%;border-radius:16px;margin-top:14px;border:1px solid #282828"></video>`;
      }
      return `
        <div style="background:#121212;border:1px solid #282828;border-radius:20px;padding:16px;margin-bottom:14px">
          <div style="display:flex;gap:10px;align-items:center">
            <div style="width:32px;height:32px;border-radius:50%;background:#000;border:1px solid #333;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:11px">DT</div>
            <div><b style="color:#fff;font-size:13px">DopeTone</b> <span style="color:#888;font-size:11px;margin-left:6px">${new Date(n.created_at||Date.now()).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span></div>
          </div>
          ${n.content? `<div style="color:#e8e8e8;font-size:14px;margin-top:12px;white-space:pre-wrap;line-height:1.5">${n.content}</div>`:''}
          ${promoHTML}
          ${mediaHTML}
        </div>`;
    }).join('');
  } catch(e){ FEED.innerHTML = `<div style="color:#ef4444;text-align:center;padding:20px">${e.message}</div>`; }
}

document.addEventListener('DOMContentLoaded', loadDrops);
if (document.readyState!=='loading') loadDrops();
setInterval(loadDrops, 10000);

if (SEND && INPUT) {
  SEND.onclick = async () => {
    const t=INPUT.value.trim(); if(!t) return;
    SEND.disabled=true; SEND.innerHTML='...';
    try{ await fetch(`${TICKETS_API}/api/tickets/create`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Fan',email:`fan${Date.now()}@dopetone.zone`,subject:'Drop Zone',message:t,priority:'Medium',source:'drop_zone'})}); INPUT.value=''; }catch{}
    SEND.innerHTML=`<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" stroke-width="2"/></svg>`; SEND.disabled=false;
  };
  INPUT.onkeydown = e=>{ if(e.key==='Enter') SEND.onclick(); };
}
