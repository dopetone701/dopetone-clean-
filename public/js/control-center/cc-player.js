// cc-player.js - FULL D1 COUNTS - LIKES/DOWNLOADS/PLAYS/CART FROM WORKER
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

let audio = null;
let playBtn = null;

// ===== D1 REAL COUNTS CACHE =====
let d1StatsCache = {};
async function fetchD1BeatStats(beatId) {
  try {
    // Try beat stats endpoint
    const res = await fetch(`${STATS_API}/api/stats/beat/${beatId}`);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
    // Fallback: get from top list and filter
    const res2 = await fetch(`${STATS_API}/api/stats/top`);
    if (res2.ok) {
      const list = await res2.json();
      const found = list.find(b => String(b.beat_id || b.id) === String(beatId));
      if (found) return found;
    }
    // Fallback 2: get liked/cart counts from dedicated endpoints
    const [likedRes, cartRes] = await Promise.all([
      fetch(`${STATS_API}/api/stats/liked`).then(r=>r.ok?r.json():[]).catch(()=>[]),
      fetch(`${STATS_API}/api/stats/abandoned`).then(r=>r.ok?r.json():[]).catch(()=>[])
    ]);
    const likes = Array.isArray(likedRes) ? likedRes.filter(l=>String(l.beat_id)===String(beatId)).length : 0;
    const carts = Array.isArray(cartRes) ? cartRes.filter(c=>String(c.beat_id)===String(beatId)).length : 0;
    return { like_count: likes, cart_count: carts };
  } catch(e){ return null; }
}

// ===== INIT PLAYER =====
export function initPlayer() {
  audio = document.getElementById('audioPlayer');
  playBtn = document.getElementById('playBtn');
 
  if (!audio ||!playBtn) {
    console.error('[CC Player] Player elements not found');
    return;
  }

  const lastTrack = JSON.parse(localStorage.getItem('dt_cc_current') || 'null');
  const wasPlaying = localStorage.getItem('dt_cc_playing') === 'true';
 
  if (lastTrack) {
    updateQuickPlayerUI(lastTrack, false);
    audio.src = lastTrack.mp3_url || lastTrack.audio;
    if (wasPlaying) {
      audio.play().catch(() => {});
    }
  }

  window.addEventListener('cc_track_change', (e) => {
    updateQuickPlayerUI(e.detail, true);
  });

  window.addEventListener('cc_player_state', (e) => {
    setIsPlaying(e.detail.playing);
    playBtn.innerHTML = `<i class="fa-solid fa-${e.detail.playing? 'pause' : 'play'}"></i>`;
    if (currentTrack) updatePlayButton(currentTrack.id, e.detail.playing);
  });

  document.getElementById('nextBtn').onclick = () => {
    if (topTracks.length === 0) return;
    const nextIdx = (currentTopIndex + 1) % topTracks.length;
    setCurrentTopIndex(nextIdx);
    playBeat(topTracks[nextIdx].id);
  };

  document.getElementById('prevBtn').onclick = () => {
    if (topTracks.length === 0) return;
    const prevIdx = (currentTopIndex - 1 + topTracks.length) % topTracks.length;
    setCurrentTopIndex(prevIdx);
    playBeat(topTracks[prevIdx].id);
  };

  playBtn.onclick = () => {
    if (!currentTrack) return;
    if (isPlaying) {
      audio.pause();
      playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      updatePlayButton(currentTrack.id, false);
      localStorage.setItem('dt_cc_playing', 'false');
    } else {
      audio.play();
      playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
      updatePlayButton(currentTrack.id, true);
      localStorage.setItem('dt_cc_playing', 'true');
      // 🔥 D1 PLAY
      fetch(`${STATS_API}/api/stats/event`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ beat_id: parseInt(currentTrack.id), event_type: 'play', user_id: 'admin' })
      }).then(()=> refreshD1Counts(currentTrack.id)).catch(()=>{});
    }
    setIsPlaying(!isPlaying);
  };

  audio.onended = () => {
    playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    if (currentTrack) updatePlayButton(currentTrack.id, false);
    setIsPlaying(false);
    localStorage.setItem('dt_cc_playing', 'false');
    updateActiveSpeaker();
  };

  audio.onerror = (e) => {
    console.error('[CC Player] Audio error:', e);
    playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    setIsPlaying(false);
  };
}

// ===== UPDATE QUICK PLAYER UI - D1 COUNTS =====
export async function updateQuickPlayerUI(beat, playing) {
  document.getElementById('playerCover').src = beat.cover || beat.cover_url || DEFAULT_LOGO;
  document.getElementById('playerTitle').textContent = beat.title;
  document.getElementById('playerArtist').textContent = beat.artist || 'DopeTone';
  
  // 🔥 IMMEDIATE: show old counts, then override with D1 real counts
  document.getElementById('playerPlays').textContent = (beat.play_count || 0).toLocaleString();
  document.getElementById('playerLikes').textContent = (beat.like_count || 0).toLocaleString();
  document.getElementById('playerDownloads').textContent = (beat.download_count || 0).toLocaleString();

  const cart = JSON.parse(localStorage.getItem('dopetone_cart') || '[]');
  document.getElementById('playerCart').textContent = cart.filter(c => c.id == beat.id).length;

  // 🔥 D1 REAL COUNTS - OVERWRITE FOR CHART ACCURACY
  try {
    const d1 = await fetchD1BeatStats(beat.id);
    if (d1) {
      // Worker returns play_count, like_count, download_count, cart_count from active_* tables
      if (d1.play_count !== undefined) document.getElementById('playerPlays').textContent = Number(d1.play_count).toLocaleString();
      if (d1.like_count !== undefined) document.getElementById('playerLikes').textContent = Number(d1.like_count).toLocaleString();
      if (d1.download_count !== undefined) document.getElementById('playerDownloads').textContent = Number(d1.download_count).toLocaleString();
      if (d1.cart_count !== undefined) document.getElementById('playerCart').textContent = Number(d1.cart_count).toLocaleString();
      // Also count from active_* if direct count fields missing
      if (d1.likes !== undefined) document.getElementById('playerLikes').textContent = Number(d1.likes).toLocaleString();
      if (d1.carts !== undefined) document.getElementById('playerCart').textContent = Number(d1.carts).toLocaleString();
      
      // Cache for graph tooltip
      d1StatsCache[beat.id] = d1;
      // Update beat object so chart tooltip shows real
      beat.play_count = d1.play_count ?? beat.play_count;
      beat.like_count = d1.like_count ?? d1.likes ?? beat.like_count;
      beat.download_count = d1.download_count ?? beat.download_count;
      beat.cart_count = d1.cart_count ?? d1.carts ?? 0;
    }
  } catch(e){}

  playBtn.innerHTML = `<i class="fa-solid fa-${playing? 'pause' : 'play'}"></i>`;
  setIsPlaying(playing);
  setCurrentTrack(beat);
  setCurrentBeatId(beat.id);

  const topIdx = topTracks.findIndex(t => t.id == beat.id);
  if (topIdx!== -1) setCurrentTopIndex(topIdx);

  localStorage.setItem('dt_cc_current', JSON.stringify(beat));
  localStorage.setItem('dt_cc_playing', playing);
 
  updateMonetizeUI(beat);
  updateActiveSpeaker();

  if (beat && beat.id) {
    selectTrackForGraph(beat.id, beat.title);
  }
}

async function refreshD1Counts(beatId) {
  const d1 = await fetchD1BeatStats(beatId);
  if (!d1) return;
  if (d1.play_count !== undefined) document.getElementById('playerPlays').textContent = Number(d1.play_count).toLocaleString();
  if (d1.like_count !== undefined) document.getElementById('playerLikes').textContent = Number(d1.like_count).toLocaleString();
  if (d1.download_count !== undefined) document.getElementById('playerDownloads').textContent = Number(d1.download_count).toLocaleString();
  if (d1.cart_count !== undefined) document.getElementById('playerCart').textContent = Number(d1.cart_count).toLocaleString();
}

// ===== PLAY BEAT - LOG TO D1 =====
export async function playBeat(id) {
  const beat = topTracks.find(b => b.id == id) || currentTrack;
  if (!beat) return;

  setCurrentTrack(beat);
  setCurrentBeatId(beat.id);
  audio.src = beat.mp3_url || beat.audio;
  await updateQuickPlayerUI(beat, true);
  selectTrackForGraph(beat.id, beat.title);

  audio.play().catch(e => console.log('Autoplay blocked:', e));
  setIsPlaying(true);
  updatePlayButton(id, true);

  try {
    await fetch(`${STATS_API}/api/stats/event`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ beat_id: parseInt(id), event_type: 'play', user_id: 'admin' })
    });
    setTimeout(() => {
      refreshD1Counts(id);
      window.dispatchEvent(new CustomEvent('cc_stats_updated'));
      // Force chart reload with real counts
      selectTrackForGraph(beat.id, beat.title);
    }, 800);
  } catch (err) {
    console.error('[CC Player] Track play log failed:', err);
  }
}

export function togglePlay(id) {
  if (currentTrack && currentTrack.id == id) {
    if (isPlaying) {
      audio.pause();
      playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      updatePlayButton(id, false);
      setIsPlaying(false);
      localStorage.setItem('dt_cc_playing', 'false');
    } else {
      audio.play();
      playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
      updatePlayButton(id, true);
      setIsPlaying(true);
      localStorage.setItem('dt_cc_playing', 'true');
      fetch(`${STATS_API}/api/stats/event`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ beat_id: parseInt(id), event_type: 'play', user_id: 'admin' })
      }).then(()=>refreshD1Counts(id)).catch(()=>{});
    }
    updateActiveSpeaker();
  } else {
    playBeat(id);
  }
}

function updatePlayButton(id, playing) {
  const btn = document.querySelector(`.play-btn[data-id="${id}"]`);
  if (btn) btn.innerHTML = `<i class="fa-solid fa-${playing? 'pause' : 'play'}"></i>`;
}

function updateMonetizeUI(beat) {
  const btn = document.getElementById('monetizeBtn');
  const badge = document.getElementById('monetizeBadge');
  if (!btn ||!badge) return;
  const mode = beat.monetization_mode || 'paid';
  const config = {
    'paid': { icon: 'fa-dollar-sign', color: '#10b981', text: 'PAID', title: 'Monetized - No Free' },
    'hybrid': { icon: 'fa-tags', color: '#f59e0b', text: 'TAGGED FREE', title: 'Monetized + Free Tagged' },
    'free': { icon: 'fa-gift', color: '#3b82f6', text: 'FREE', title: 'Fully Free Download' }
  };
  const c = config[mode];
  btn.innerHTML = `<i class="fa-solid ${c.icon}"></i>`;
  btn.style.color = c.color;
  btn.title = c.title;
  badge.textContent = c.text;
  badge.style.background = `${c.color}20`;
  badge.style.color = c.color;
  badge.style.border = `1px solid ${c.color}40`;
}

window.addEventListener('cc_play_track', (e) => {
  const track = e.detail;
  if (!track) return;
  setCurrentTrack(track);
  setCurrentBeatId(track.id);
  audio.src = track.audio || track.mp3_url;
  audio.load();
  audio.play().then(() => {
    setIsPlaying(true);
    updateQuickPlayerUI(track, true);
    window.dispatchEvent(new CustomEvent('cc_playback_changed'));
    window.dispatchEvent(new CustomEvent('cc_track_changed'));
  }).catch(err => { console.error('[Player] Play failed:', err); });
});

window.addEventListener('cc_load_track', (e) => {
  const track = e.detail;
  if (!track) return;
  setCurrentTrack(track);
  setCurrentBeatId(track.id);
  audio.src = track.audio || track.mp3_url;
  audio.load();
  setIsPlaying(false);
  updateQuickPlayerUI(track, false);
  window.dispatchEvent(new CustomEvent('cc_track_changed'));
  window.dispatchEvent(new CustomEvent('cc_playback_changed'));
});

window.editCurrentTrack = function() {
  if (!currentTrack) return alert('No track loaded');
  window.dispatchEvent(new CustomEvent('cc_edit_beat', { detail: currentTrack.id }));
};

window.cycleMonetization = async function() {
  if (!currentTrack) return alert('No track loaded');
  const modes = ['paid', 'hybrid', 'free'];
  const currentMode = currentTrack.monetization_mode || 'paid';
  const nextIndex = (modes.indexOf(currentMode) + 1) % 3;
  const newMode = modes[nextIndex];
  try {
    const res = await fetch(`${MAIN_API}/beats/monetize`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ id: currentTrack.id, mode: newMode, has_free_tagged: newMode === 'hybrid'? 1 : 0 })
    });
    if (!res.ok) throw new Error('Update failed');
    currentTrack.monetization_mode = newMode;
    currentTrack.has_free_tagged = newMode === 'hybrid'? 1 : 0;
    updateMonetizeUI(currentTrack);
    window.dispatchEvent(new CustomEvent('cc_dashboard_refresh'));
  } catch (err) { alert('Monetization update failed: ' + err.message); }
};

function updateActiveSpeaker() {
  document.querySelectorAll('.top-item').forEach(el => {
    const beatId = parseInt(el.dataset.id);
    const volumeIcon = el.querySelector('.fa-volume-high');
    if (volumeIcon) volumeIcon.remove();
    if (currentTrack && currentTrack.id == beatId && isPlaying) {
      const iconHTML = '<i class="fa-solid fa-volume-high" style="color:#8b5cf6;"></i>';
      el.insertAdjacentHTML('beforeend', iconHTML);
      el.style.borderColor = '#8b5cf6';
    } else { el.style.borderColor = '#333'; }
  });
}

export { updateActiveSpeaker };

// 🔥 LISTEN FOR CART/LIKE FROM OTHER MODULES - REFRESH COUNTS
window.addEventListener('cc_cart_updated', (e) => {
  if (e.detail?.beat_id == currentBeatId) refreshD1Counts(e.detail.beat_id);
});
window.addEventListener('cc_like_updated', (e) => {
  if (e.detail?.beat_id == currentBeatId) refreshD1Counts(e.detail.beat_id);
});
