// cc-player.js - FINAL - MONETIZE BTN PER TRACK ID FROM DB - PRO
// STATS stay on STATS_API, MONETIZATION only on track-price-api
import {
  MAIN_API,
  STATS_API,
  DEFAULT_LOGO,
  currentTrack,
  isPlaying,
  topTracks,
  currentTopIndex,
  setCurrentTrack,
  setIsPlaying,
  setCurrentTopIndex,
  currentBeatId,
  setCurrentBeatId
} from './cc-config.js';
import { selectTrackForGraph } from './cc-charts.js';

const TRACK_PRICE_API = "https://track-price-api.dopetone701.workers.dev";

let audio = null;
let playBtn = null;
let monetizeBtn = null;
let d1StatsCache = {};
let monetizeCache = {}; // { beatId: mode }

async function fetchD1BeatStats(beatId) {
  try {
    const res = await fetch(`${STATS_API}/api/stats/beat/${beatId}`);
    if (res.ok) return await res.json();
    const res2 = await fetch(`${STATS_API}/api/stats/top`);
    if (res2.ok) {
      const list = await res2.json();
      const found = list.find(b => String(b.beat_id || b.id) === String(beatId));
      if (found) return found;
    }
    const [likedRes, cartRes] = await Promise.all([
      fetch(`${STATS_API}/api/stats/liked`).then(r=>r.ok?r.json():[]).catch(()=>[]),
      fetch(`${STATS_API}/api/stats/abandoned`).then(r=>r.ok?r.json():[]).catch(()=>[])
    ]);
    const likes = Array.isArray(likedRes)? likedRes.filter(l=>String(l.beat_id)===String(beatId)).length : 0;
    const carts = Array.isArray(cartRes)? cartRes.filter(c=>String(c.beat_id)===String(beatId)).length : 0;
    return { like_count: likes, cart_count: carts };
  } catch(e){ return null; }
}

// 🔥 MONETIZATION - ONLY track-price-api
async function fetchMonetizationById(beatId) {
  if (monetizeCache[beatId]) return monetizeCache[beatId];
  try {
    // 1. Primary: track-price-api
    const res = await fetch(`${TRACK_PRICE_API}/beats/${beatId}`);
    if (res.ok) {
      const data = await res.json();
      const beat = data.beat || data;
      const mode = beat.monetization_mode || beat.monetizationMode || (beat.has_free_tagged? 'hybrid' : 'paid');
      if (mode) {
        monetizeCache[beatId] = mode;
        return mode;
      }
    }
    // 2. Fallback: top list already has mode
    const res2 = await fetch(`${STATS_API}/api/stats/top`);
    if (res2.ok) {
      const list = await res2.json();
      const found = list.find(b => String(b.id) === String(beatId));
      if (found?.monetization_mode) {
        monetizeCache[beatId] = found.monetization_mode;
        return found.monetization_mode;
      }
    }
  } catch(e){}
  return 'paid';
}

export function initPlayer() {
  audio = document.getElementById('audioPlayer');
  playBtn = document.getElementById('playBtn');
  monetizeBtn = document.getElementById('monetizeBtn');
  if (!audio ||!playBtn) return;
  if (monetizeBtn) {
    monetizeBtn.style.cursor = 'pointer';
    monetizeBtn.onclick = () => cycleMonetization();
  }
  const lastTrack = JSON.parse(localStorage.getItem('dt_cc_current') || 'null');
  const wasPlaying = localStorage.getItem('dt_cc_playing') === 'true';
  if (lastTrack) {
    updateQuickPlayerUI(lastTrack, false);
    audio.src = lastTrack.mp3_url || lastTrack.audio;
    if (wasPlaying) audio.play().catch(()=>{});
  }
  window.addEventListener('cc_track_change', (e) => { updateQuickPlayerUI(e.detail, true); });
  window.addEventListener('cc_player_state', (e) => {
    setIsPlaying(e.detail.playing);
    if (playBtn) playBtn.innerHTML = `<i class="fa-solid fa-${e.detail.playing?'pause':'play'}"></i>`;
    if (currentTrack) updatePlayButton(currentTrack.id, e.detail.playing);
  });
  const nextBtn = document.getElementById('nextBtn');
  if (nextBtn) nextBtn.onclick = () => {
    if (topTracks.length===0) return;
    const nextIdx = (currentTopIndex+1)%topTracks.length;
    setCurrentTopIndex(nextIdx);
    playBeat(topTracks[nextIdx].id);
  };
  const prevBtn = document.getElementById('prevBtn');
  if (prevBtn) prevBtn.onclick = () => {
    if (topTracks.length===0) return;
    const prevIdx = (currentTopIndex-1+topTracks.length)%topTracks.length;
    setCurrentTopIndex(prevIdx);
    playBeat(topTracks[prevIdx].id);
  };
  playBtn.onclick = () => {
    if (!currentTrack) return;
    if (isPlaying) {
      audio.pause();
      playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      updatePlayButton(currentTrack.id,false);
      localStorage.setItem('dt_cc_playing','false');
    } else {
      audio.play();
      playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
      updatePlayButton(currentTrack.id,true);
      localStorage.setItem('dt_cc_playing','true');
      fetch(`${STATS_API}/api/stats/event`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({beat_id:parseInt(currentTrack.id),event_type:'play',user_id:'admin'})}).then(()=>refreshD1Counts(currentTrack.id)).catch(()=>{});
    }
    setIsPlaying(!isPlaying);
  };
  audio.onended = () => {
    playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    if (currentTrack) updatePlayButton(currentTrack.id,false);
    setIsPlaying(false);
    localStorage.setItem('dt_cc_playing','false');
    updateActiveSpeaker();
  };
  audio.onerror = () => { playBtn.innerHTML = '<i class="fa-solid fa-play"></i>'; setIsPlaying(false); };
}

export async function updateQuickPlayerUI(beat, playing) {
  const coverEl = document.getElementById('playerCover');
  if (coverEl) coverEl.src = beat.cover || beat.cover_url || DEFAULT_LOGO;
  const titleEl = document.getElementById('playerTitle');
  if (titleEl) titleEl.textContent = beat.title;
  const artistEl = document.getElementById('playerArtist');
  if (artistEl) artistEl.textContent = beat.artist || 'DopeTone';
  const playsEl = document.getElementById('playerPlays');
  const likesEl = document.getElementById('playerLikes');
  const downloadsEl = document.getElementById('playerDownloads');
  const cartEl = document.getElementById('playerCart');
  if (playsEl) playsEl.textContent = (beat.play_count||0).toLocaleString();
  if (likesEl) likesEl.textContent = (beat.like_count||0).toLocaleString();
  if (downloadsEl) downloadsEl.textContent = (beat.download_count||0).toLocaleString();
  const cart = JSON.parse(localStorage.getItem('dopetone_cart')||'[]');
  if (cartEl) cartEl.textContent = cart.filter(c=>c.id==beat.id).length;

  // 🔥 MONETIZATION PER ID - from price API only
  let realMode = beat.monetization_mode || beat.monetizationMode;
  if (!realMode) {
    const cached = topTracks.find(t=> String(t.id)===String(beat.id));
    realMode = cached?.monetization_mode || cached?.monetizationMode;
  }
  if (!realMode) {
    realMode = await fetchMonetizationById(beat.id);
  }
  if (realMode) {
    beat.monetization_mode = realMode;
    beat.monetizationMode = realMode;
    monetizeCache[beat.id] = realMode;
  }

  try {
    const d1 = await fetchD1BeatStats(beat.id);
    if (d1) {
      if (playsEl && d1.play_count!==undefined) playsEl.textContent = Number(d1.play_count).toLocaleString();
      if (likesEl && d1.like_count!==undefined) likesEl.textContent = Number(d1.like_count).toLocaleString();
      if (downloadsEl && d1.download_count!==undefined) downloadsEl.textContent = Number(d1.download_count).toLocaleString();
      if (cartEl && d1.cart_count!==undefined) cartEl.textContent = Number(d1.cart_count).toLocaleString();
      if (likesEl && d1.likes!==undefined) likesEl.textContent = Number(d1.likes).toLocaleString();
      if (cartEl && d1.carts!==undefined) cartEl.textContent = Number(d1.carts).toLocaleString();
      d1StatsCache[beat.id]=d1;
      beat.play_count = d1.play_count?? beat.play_count;
      beat.like_count = d1.like_count?? d1.likes?? beat.like_count;
      beat.download_count = d1.download_count?? beat.download_count;
      beat.cart_count = d1.cart_count?? d1.carts?? 0;
    }
  } catch(e){}

  if (playBtn) playBtn.innerHTML = `<i class="fa-solid fa-${playing?'pause':'play'}"></i>`;
  setIsPlaying(playing);
  setCurrentTrack(beat);
  setCurrentBeatId(beat.id);
  const topIdx = topTracks.findIndex(t=>t.id==beat.id);
  if (topIdx!==-1) setCurrentTopIndex(topIdx);
  localStorage.setItem('dt_cc_current',JSON.stringify(beat));
  localStorage.setItem('dt_cc_playing',playing);
  updateMonetizeUI(beat);
  updateActiveSpeaker();
  if (beat && beat.id) selectTrackForGraph(beat.id, beat.title);
}

async function refreshD1Counts(beatId) {
  const d1 = await fetchD1BeatStats(beatId);
  if (!d1) return;
  const playsEl=document.getElementById('playerPlays');
  const likesEl=document.getElementById('playerLikes');
  const downloadsEl=document.getElementById('playerDownloads');
  const cartEl=document.getElementById('playerCart');
  if (playsEl && d1.play_count!==undefined) playsEl.textContent=Number(d1.play_count).toLocaleString();
  if (likesEl && d1.like_count!==undefined) likesEl.textContent=Number(d1.like_count).toLocaleString();
  if (downloadsEl && d1.download_count!==undefined) downloadsEl.textContent=Number(d1.download_count).toLocaleString();
  if (cartEl && d1.cart_count!==undefined) cartEl.textContent=Number(d1.cart_count).toLocaleString();
}

export async function playBeat(id) {
  const beat = topTracks.find(b=>b.id==id) || currentTrack;
  if (!beat) return;
  setCurrentTrack(beat);
  setCurrentBeatId(beat.id);
  if (audio) audio.src = beat.mp3_url || beat.audio;
  await updateQuickPlayerUI(beat,true);
  selectTrackForGraph(beat.id, beat.title);
  if (audio) audio.play().catch(e=>console.log('Autoplay blocked:',e));
  setIsPlaying(true);
  updatePlayButton(id,true);
  try {
    await fetch(`${STATS_API}/api/stats/event`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({beat_id:parseInt(id),event_type:'play',user_id:'admin'})});
    setTimeout(()=>{ refreshD1Counts(id); window.dispatchEvent(new CustomEvent('cc_stats_updated')); selectTrackForGraph(beat.id,beat.title); },800);
  } catch(err){ console.error('[CC Player] log failed',err); }
}

export function togglePlay(id) {
  if (currentTrack && currentTrack.id==id) {
    if (isPlaying) {
      if (audio) audio.pause();
      if (playBtn) playBtn.innerHTML='<i class="fa-solid fa-play"></i>';
      updatePlayButton(id,false);
      setIsPlaying(false);
      localStorage.setItem('dt_cc_playing','false');
    } else {
      if (audio) audio.play();
      if (playBtn) playBtn.innerHTML='<i class="fa-solid fa-pause"></i>';
      updatePlayButton(id,true);
      setIsPlaying(true);
      localStorage.setItem('dt_cc_playing','true');
      fetch(`${STATS_API}/api/stats/event`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({beat_id:parseInt(id),event_type:'play',user_id:'admin'})}).then(()=>refreshD1Counts(id)).catch(()=>{});
    }
    updateActiveSpeaker();
  } else { playBeat(id); }
}

function updatePlayButton(id,playing){ const btn=document.querySelector(`.play-btn[data-id="${id}"]`); if(btn) btn.innerHTML=`<i class="fa-solid fa-${playing?'pause':'play'}"></i>`; }

function updateMonetizeUI(beat) {
  const btn=document.getElementById('monetizeBtn');
  const badge=document.getElementById('monetizeBadge');
  if(!btn||!badge) return;
  const mode = beat.monetization_mode || beat.monetizationMode || monetizeCache[beat.id] || 'paid';
  const config={
    'paid':{icon:'fa-dollar-sign',color:'#10b981',text:'PAID',title:`ID ${beat.id} - Paid Only - Click for TAGGED FREE`},
    'hybrid':{icon:'fa-tags',color:'#f59e0b',text:'TAGGED FREE',title:`ID ${beat.id} - Tagged Free + Paid - Click for FREE`},
    'free':{icon:'fa-gift',color:'#3b82f6',text:'FREE',title:`ID ${beat.id} - Fully Free - Click for PAID`}
  };
  const c=config[mode]||config['paid'];
  btn.innerHTML=`<i class="fa-solid ${c.icon}"></i>`;
  btn.style.color=c.color;
  btn.style.border=`1px solid ${c.color}40`;
  btn.style.background=`${c.color}15`;
  btn.title=c.title;
  badge.textContent=c.text;
  badge.style.background=`${c.color}20`;
  badge.style.color=c.color;
  badge.style.border=`1px solid ${c.color}40`;
  btn.onclick=()=>cycleMonetization();
  badge.style.cursor='pointer';
  badge.onclick=()=>cycleMonetization();
  console.log(`[CC Monetize] UI for ID ${beat.id} = ${mode} from PRICE API`);
}

window.addEventListener('cc_play_track',(e)=>{
  const track=e.detail; if(!track) return;
  setCurrentTrack(track); setCurrentBeatId(track.id);
  if(audio){ audio.src=track.audio||track.mp3_url; audio.load(); audio.play().then(()=>{ setIsPlaying(true); updateQuickPlayerUI(track,true); window.dispatchEvent(new CustomEvent('cc_playback_changed')); window.dispatchEvent(new CustomEvent('cc_track_changed')); }).catch(err=>console.error(err)); }
});
window.addEventListener('cc_load_track',(e)=>{
  const track=e.detail; if(!track) return;
  setCurrentTrack(track); setCurrentBeatId(track.id);
  if(audio){ audio.src=track.audio||track.mp3_url; audio.load(); }
  setIsPlaying(false); updateQuickPlayerUI(track,false);
  window.dispatchEvent(new CustomEvent('cc_track_changed')); window.dispatchEvent(new CustomEvent('cc_playback_changed'));
});
window.editCurrentTrack=function(){ if(!currentTrack) return alert('No track loaded'); window.dispatchEvent(new CustomEvent('cc_edit_beat',{detail:currentTrack.id})); };

// 🔥 ONLY PLACE THAT CALLS track-price-api FOR WRITE
window.cycleMonetization=async function(){
  if(!currentTrack) return alert('No track loaded');
  const modes=['paid','hybrid','free'];
  const currentMode=currentTrack.monetization_mode||currentTrack.monetizationMode||monetizeCache[currentTrack.id]||'paid';
  const nextIndex=(modes.indexOf(currentMode)+1)%3;
  const newMode=modes[nextIndex];
  console.log(`[CC Monetize] ID ${currentTrack.id}: ${currentMode} -> ${newMode} via ${TRACK_PRICE_API}`);

  // Optimistic UI
  currentTrack.monetization_mode=newMode;
  currentTrack.monetizationMode=newMode;
  currentTrack.has_free_tagged=newMode==='hybrid'?1:0;
  monetizeCache[currentTrack.id]=newMode;
  updateMonetizeUI(currentTrack);

  try{
    const res = await fetch(`${TRACK_PRICE_API}/beats/monetize`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({id:currentTrack.id, mode:newMode, has_free_tagged:newMode==='hybrid'?1:0})
    });

    if(!res.ok){
      console.warn('[CC Monetize] PRICE API fail',res.status);
      const errText = await res.text();
      console.warn(errText);
      return;
    }
    const data=await res.json().catch(()=>({}));
    console.log('[CC Monetize] Success',data);
    const idx=topTracks.findIndex(t=>t.id==currentTrack.id);
    if(idx!==-1){
      topTracks[idx].monetization_mode=newMode;
      topTracks[idx].monetizationMode=newMode;
      topTracks[idx].has_free_tagged=newMode==='hybrid'?1:0;
    }
    localStorage.setItem('dt_cc_current',JSON.stringify(currentTrack));
    window.dispatchEvent(new CustomEvent('cc_monetize_changed',{detail:{beatId:currentTrack.id,mode:newMode}}));
    window.dispatchEvent(new CustomEvent('cc_dashboard_refresh'));
    const toast=document.createElement('div');
    toast.textContent=`ID ${currentTrack.id}: ${newMode.toUpperCase()}`;
    toast.style.cssText=`position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1a1a1a;border:1px solid #333;color:#fff;padding:10px 20px;border-radius:8px;z-index:9999;font-size:13px;`;
    document.body.appendChild(toast);
    setTimeout(()=>toast.remove(),2000);
  }catch(err){
    console.error('[CC Monetize] Error',err);
  }
};

function updateActiveSpeaker(){
  document.querySelectorAll('.top-item').forEach(el=>{
    const beatId=parseInt(el.dataset.id);
    const volumeIcon=el.querySelector('.fa-volume-high');
    if(volumeIcon) volumeIcon.remove();
    if(currentTrack && currentTrack.id==beatId && isPlaying){
      const iconHTML='<i class="fa-solid fa-volume-high" style="color:#8b5cf6;"></i>';
      el.insertAdjacentHTML('beforeend',iconHTML);
      el.style.borderColor='#8b5cf6';
    } else { el.style.borderColor='#333'; }
  });
}
export { updateActiveSpeaker };
window.addEventListener('cc_cart_updated',(e)=>{ if(e.detail?.beat_id==currentBeatId) refreshD1Counts(e.detail.beat_id); });
window.addEventListener('cc_like_updated',(e)=>{ if(e.detail?.beat_id==currentBeatId) refreshD1Counts(e.detail.beat_id); });
document.addEventListener('DOMContentLoaded',()=>{ const btn=document.getElementById('monetizeBtn'); if(btn) btn.onclick=()=>window.cycleMonetization(); });
