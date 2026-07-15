// cc-player.js - UPGRADED: table play replaces player + graph instantly
import {
  MAIN_API,
  STATS_API,
  DEFAULT_LOGO,
  currentTrack,
  isPlaying,
  topTracks,
  allBeats,
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
let monetizeCache = {};
let liveVerifyInterval = null;
let lastCloudHash = '';

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

async function fetchMonetizationById(beatId) {
  if (monetizeCache[beatId]) return monetizeCache[beatId];
  try {
    const res = await fetch(`${TRACK_PRICE_API}/beats/${beatId}`);
    if (res.ok) {
      const data = await res.json();
      const beat = data.beat || data;
      const mode = beat.monetization_mode || beat.monetizationMode || (beat.has_free_tagged? 'hybrid' : 'paid');
      if (mode) { monetizeCache[beatId] = mode; return mode; }
    }
  } catch(e){}
  return 'paid';
}

function startLiveCloudVerify(beatId) {
  stopLiveCloudVerify();
  lastCloudHash = '';
  liveVerifyInterval = setInterval(async () => {
    const modal = document.getElementById('editModal');
    if (!modal ||!modal.classList.contains('active')) { stopLiveCloudVerify(); return; }
    try {
      const res = await fetch(`${TRACK_PRICE_API}/beats/${beatId}?t=${Date.now()}`);
      if (!res.ok) return;
      const data = await res.json();
      const cloudBeat = data.beat || data;
      const hash = `${cloudBeat.title}|${cloudBeat.artist}|${cloudBeat.cover_url}|${cloudBeat.monetization_mode}|${cloudBeat.has_free_tagged}|${cloudBeat.price}|${cloudBeat.revenue}`;
      if (hash === lastCloudHash) return;
      lastCloudHash = hash;
      monetizeCache[beatId] = cloudBeat.monetization_mode;
      const idx = topTracks.findIndex(t=> String(t.id) === String(beatId));
      if (idx!== -1) topTracks[idx] = {...topTracks[idx],...cloudBeat };
      if (currentTrack && String(currentTrack.id) === String(beatId)) {
        await updateQuickPlayerUI({...currentTrack,...cloudBeat }, isPlaying);
      }
    } catch(e){}
  }, 1500);
}

function stopLiveCloudVerify() {
  if (liveVerifyInterval) { clearInterval(liveVerifyInterval); liveVerifyInterval = null; }
}
window.stopLiveVerify = stopLiveCloudVerify;

export function initPlayer() {
  audio = document.getElementById('audioPlayer');
  playBtn = document.getElementById('playBtn');
  monetizeBtn = document.getElementById('monetizeBtn');
  if (!audio ||!playBtn) return;
  if (monetizeBtn) monetizeBtn.onclick = () => cycleMonetization();
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
  document.getElementById('nextBtn')?.addEventListener('click', ()=>{
    if (!topTracks.length) return;
    const nextIdx = (currentTopIndex+1)%topTracks.length;
    setCurrentTopIndex(nextIdx);
    playBeat(topTracks[nextIdx].id);
  });
  document.getElementById('prevBtn')?.addEventListener('click', ()=>{
    if (!topTracks.length) return;
    const prevIdx = (currentTopIndex-1+topTracks.length)%topTracks.length;
    setCurrentTopIndex(prevIdx);
    playBeat(topTracks[prevIdx].id);
  });
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

  const modal = document.getElementById('editModal');
  if(modal){
    modal.addEventListener('click', (e)=>{
      if(e.target === modal || e.target.closest('#editModalClose')){
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        stopLiveCloudVerify();
      }
    });
  }
}

export async function updateQuickPlayerUI(beat, playing) {
  document.getElementById('playerCover').src = beat.cover || beat.cover_url || DEFAULT_LOGO;
  document.getElementById('playerTitle').textContent = beat.title;
  document.getElementById('playerArtist').textContent = beat.artist || 'DopeTone';
  document.getElementById('playerPlays').textContent = (beat.play_count||0).toLocaleString();
  document.getElementById('playerLikes').textContent = (beat.like_count||0).toLocaleString();
  document.getElementById('playerDownloads').textContent = (beat.download_count||0).toLocaleString();
  const cart = JSON.parse(localStorage.getItem('dopetone_cart')||'[]');
  document.getElementById('playerCart').textContent = cart.filter(c=>c.id==beat.id).length;

  let realMode = beat.monetization_mode || beat.monetizationMode || monetizeCache[beat.id] || await fetchMonetizationById(beat.id);
  beat.monetization_mode = realMode; beat.monetizationMode = realMode; monetizeCache[beat.id] = realMode;

  try {
    const d1 = await fetchD1BeatStats(beat.id);
    if (d1) {
      if (d1.play_count!==undefined) document.getElementById('playerPlays').textContent = Number(d1.play_count).toLocaleString();
      if (d1.like_count!==undefined) document.getElementById('playerLikes').textContent = Number(d1.like_count).toLocaleString();
      if (d1.download_count!==undefined) document.getElementById('playerDownloads').textContent = Number(d1.download_count).toLocaleString();
      if (d1.cart_count!==undefined) document.getElementById('playerCart').textContent = Number(d1.cart_count).toLocaleString();
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
  if (d1.play_count!==undefined) document.getElementById('playerPlays').textContent=Number(d1.play_count).toLocaleString();
  if (d1.like_count!==undefined) document.getElementById('playerLikes').textContent=Number(d1.like_count).toLocaleString();
  if (d1.download_count!==undefined) document.getElementById('playerDownloads').textContent=Number(d1.download_count).toLocaleString();
  if (d1.cart_count!==undefined) document.getElementById('playerCart').textContent=Number(d1.cart_count).toLocaleString();
}

// UPGRADED: finds beat in allBeats + topTracks + currentTrack
export async function playBeat(id) {
  const beat = allBeats.find(b=> String(b.id)===String(id)) || topTracks.find(b=> String(b.id)===String(id)) || currentTrack;
  if (!beat) { console.warn('playBeat not found', id); return; }
  console.log('[CC Player] Playing from table:', beat.title, id);
  setCurrentTrack(beat);
  setCurrentBeatId(beat.id);
  if (audio) audio.src = beat.mp3_url || beat.audio_url || beat.audio;
  await updateQuickPlayerUI(beat,true);
  if (audio) audio.play().catch(e=>console.log('Autoplay blocked:',e));
  setIsPlaying(true);
  updatePlayButton(id,true);
  try {
    await fetch(`${STATS_API}/api/stats/event`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({beat_id:parseInt(id),event_type:'play',user_id:'admin'})});
    setTimeout(()=> refreshD1Counts(id), 800);
  } catch(err){}
}

export function togglePlay(id) {
  // ALWAYS play immediately - no pause on first click
  playBeat(id);
}

export function hardTogglePlay(id){
  if (currentTrack && String(currentTrack.id)===String(id) && isPlaying) {
    if (audio) audio.pause();
    if (playBtn) playBtn.innerHTML='<i class="fa-solid fa-play"></i>';
    updatePlayButton(id,false);
    setIsPlaying(false);
    localStorage.setItem('dt_cc_playing','false');
    updateActiveSpeaker();
  } else {
    playBeat(id);
  }
}

function updatePlayButton(id,playing){ document.querySelectorAll(`.play-btn[data-id="${id}"]`).forEach(btn=> btn.innerHTML=`<i class="fa-solid fa-${playing?'pause':'play'}"></i>`); }

function updateMonetizeUI(beat) {
  const btn=document.getElementById('monetizeBtn');
  const badge=document.getElementById('monetizeBadge');
  if(!btn||!badge) return;
  const mode = beat.monetization_mode || 'paid';
  const config={
    'paid':{icon:'fa-dollar-sign',color:'#10b981',text:'PAID'},
    'hybrid':{icon:'fa-tags',color:'#f59e0b',text:'TAGGED FREE'},
    'free':{icon:'fa-gift',color:'#3b82f6',text:'FREE'}
  };
  const c=config[mode]||config['paid'];
  btn.innerHTML=`<i class="fa-solid ${c.icon}"></i>`;
  btn.style.color=c.color; btn.style.border=`1px solid ${c.color}40`; btn.style.background=`${c.color}15`;
  badge.textContent=c.text; badge.style.background=`${c.color}20`; badge.style.color=c.color; badge.style.border=`1px solid ${c.color}40`;
  btn.onclick=()=>cycleMonetization(); badge.onclick=()=>cycleMonetization();
}

window.addEventListener('cc_edit_beat', (e) => { if(e.detail) startLiveCloudVerify(e.detail); });
window.addEventListener('cc_beat_updated', (e) => {
  const updated = e.detail; if (!updated) return;
  monetizeCache[updated.id] = updated.monetization_mode;
  const idx = topTracks.findIndex(t=> String(t.id) === String(updated.id));
  if (idx!== -1) topTracks[idx] = {...topTracks[idx],...updated };
  if (currentTrack && String(currentTrack.id) === String(updated.id)) {
    updateQuickPlayerUI({...currentTrack,...updated }, isPlaying);
  }
});

const observer = new MutationObserver(() => {
  const modal = document.getElementById('editModal');
  if (modal &&!modal.classList.contains('active')) stopLiveCloudVerify();
});
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('editModal');
  if (modal) observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
});

window.addEventListener('cc_play_track',(e)=>{
  const track=e.detail; if(!track) return;
  setCurrentTrack(track); setCurrentBeatId(track.id);
  if(audio){ audio.src=track.audio||track.mp3_url; audio.load(); audio.play().then(()=>{ setIsPlaying(true); updateQuickPlayerUI(track,true); }).catch(()=>{}); }
});
window.addEventListener('cc_load_track',(e)=>{
  const track=e.detail; if(!track) return;
  setCurrentTrack(track); setCurrentBeatId(track.id);
  if(audio){ audio.src=track.audio||track.mp3_url; audio.load(); }
  setIsPlaying(false); updateQuickPlayerUI(track,false);
});

window.editCurrentTrack=function(){
  if(!currentTrack) return alert('No track loaded');
  const modal = document.getElementById('editModal');
  if(modal){ modal.classList.add('active'); document.body.classList.add('modal-open'); }
  window.dispatchEvent(new CustomEvent('cc_edit_beat',{detail:currentTrack.id}));
  if(window.loadBeatIntoModal) window.loadBeatIntoModal(currentTrack.id);
  startLiveCloudVerify(currentTrack.id);
};

window.cycleMonetization=async function(){
  if(!currentTrack) return;
  const modes=['paid','hybrid','free'];
  const currentMode=currentTrack.monetization_mode||'paid';
  const newMode=modes[(modes.indexOf(currentMode)+1)%3];
  currentTrack.monetization_mode=newMode;
  currentTrack.has_free_tagged=newMode==='hybrid'?1:0;
  monetizeCache[currentTrack.id]=newMode;
  updateMonetizeUI(currentTrack);
  try{
    await fetch(`${TRACK_PRICE_API}/beats/monetize`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:currentTrack.id, mode:newMode, has_free_tagged:newMode==='hybrid'?1:0})});
    const idx=topTracks.findIndex(t=>t.id==currentTrack.id);
    if(idx!==-1){ topTracks[idx].monetization_mode=newMode; }
    localStorage.setItem('dt_cc_current',JSON.stringify(currentTrack));
  }catch(err){}
};

function updateActiveSpeaker(){
  document.querySelectorAll('.top-item').forEach(el=>{
    const beatId=el.dataset.id;
    el.querySelectorAll('.fa-volume-high').forEach(i=>i.remove());
    if(currentTrack && String(currentTrack.id)===String(beatId) && isPlaying){
      el.insertAdjacentHTML('beforeend','<i class="fa-solid fa-volume-high" style="color:#8b5cf6;margin-left:auto"></i>');
      el.style.borderColor='#8b5cf6';
    } else { el.style.borderColor='#333'; }
  });
  // also table rows
  document.querySelectorAll('tr[data-beat-id]').forEach(tr=>{
    tr.style.background = (currentTrack && String(tr.dataset.beatId)===String(currentTrack.id))? '#8b5cf611' : '';
  });
}
export { updateActiveSpeaker };
document.addEventListener('DOMContentLoaded',()=>{ document.getElementById('monetizeBtn')?.addEventListener('click',()=>window.cycleMonetization()); });
