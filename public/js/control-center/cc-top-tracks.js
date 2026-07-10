// cc-top-tracks.js - Top Performing Tracks Module
import {
  STATS_API,
  topTracks,
  setTopTracks,
  currentTrack,
  isPlaying,
  allBeats,
  currentBeatId
} from './cc-config.js';
import { selectTrackForGraph } from './cc-charts.js';

// ===== LOAD TOP 5 FROM D1 =====
export async function loadTopTracks() {
  try {
    const res = await fetch(`${STATS_API}/api/stats/top`);
    if (!res.ok) throw new Error('Top tracks fetch failed');
   
    const tracks = await res.json();
    setTopTracks(tracks);
    renderTopSongs(tracks);
   
    // Auto-arm player + graph to #1 track if nothing loaded
    if (tracks.length > 0 && !currentTrack) {
      const topBeat = tracks[0];
      window.dispatchEvent(new CustomEvent('cc_arm_track', {
        detail: topBeat
      }));
    }
  } catch (err) {
    console.error('[CC Top Tracks] Load failed:', err);
    setTopTracks([]);
    renderTopSongs([]);
  }
}

// ===== RENDER TOP SONGS =====
function renderTopSongs(beats) {
  const topList = document.getElementById('topSongs');
  if (!topList) {
    console.error('[CC Top Tracks] topSongs element not found');
    return;
  }

  // Fallback: sort by play_count if D1 empty
  const sorted = beats.length ? beats : [...allBeats]
    .sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
    .slice(0, 5);

  setTopTracks(sorted);

  topList.innerHTML = sorted.length ? sorted.map((s, idx) => {
    const isActive = currentBeatId == s.id;
    const isCurrentPlaying = currentTrack && currentTrack.id == s.id && isPlaying;
    
    return `
      <div class="top-item" data-id="${s.id}" data-title="${s.title}" 
           style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:6px;cursor:pointer;background:#0a0a0a;border:1px solid ${isActive ? '#8b5cf6' : '#333'};margin-bottom:8px;transition:all 0.2s;">
        <div style="font-size:16px;color:#8b5cf6;font-weight:bold;width:20px;">${idx + 1}</div>
        <img src="${s.cover_url || s.cover || 'images/logo.png'}" style="width:40px;height:40px;border-radius:4px;object-fit:cover;" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%238b5cf6%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'">
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:bold;">${s.title}</div>
          <div style="font-size:11px;color:#666;">
            <i class="fa-solid fa-play"></i> ${(s.play_count || 0).toLocaleString()}
            <span style="margin-left:8px;"><i class="fa-solid fa-heart"></i> ${(s.like_count || 0).toLocaleString()}</span>
          </div>
        </div>
        ${isCurrentPlaying ? '<i class="fa-solid fa-volume-high" style="color:#8b5cf6;animation:pulse 1.5s infinite;"></i>' : ''}
      </div>
    `;
  }).join('') : '<div class="empty-state"><p>No data yet</p></div>';

  // Click handler: load to graph + player with smart play logic
  document.querySelectorAll('.top-item').forEach(el => {
    el.onclick = () => {
      const beatId = parseInt(el.dataset.id);
      const beat = allBeats.find(b => b.id == beatId) || sorted.find(b => b.id == beatId);
      if (!beat) return;

      // Highlight selected
      document.querySelectorAll('.top-item').forEach(s => s.style.borderColor = '#333');
      el.style.borderColor = '#8b5cf6';

      // Load into graph - let cc-charts handle setCurrentBeatId
      selectTrackForGraph(beatId, beat.title);

      // Build player track object
      const playerTrack = {
        id: beat.id,
        title: beat.title,
        artist: beat.artist || 'Dope Tone',
        cover: beat.cover_url || beat.cover,
        audio: beat.mp3_url || beat.audio,
        price: beat.price,
        stats: {
          plays: beat.play_count || 0,
          likes: beat.like_count || 0,
          downloads: beat.download_count || 0
        }
      };

      // Smart play logic: use events, don't call setters directly
      if (isPlaying) {
        // Player is playing - switch and play instantly
        window.dispatchEvent(new CustomEvent('cc_play_track', {
          detail: playerTrack
        }));
      } else {
        // Player is paused - just load
        window.dispatchEvent(new CustomEvent('cc_load_track', {
          detail: playerTrack
        }));
      }
    };
  });
}

// ===== REFRESH TOP TRACKS =====
export async function refreshTopTracks() {
  await loadTopTracks();
}

// Listen for stats updates from player
window.addEventListener('cc_stats_updated', () => {
  loadTopTracks();
});

// Listen for player state changes to update UI
window.addEventListener('cc_track_changed', () => {
  renderTopSongs(topTracks);
});

window.addEventListener('cc_playback_changed', () => {
  renderTopSongs(topTracks);
});
