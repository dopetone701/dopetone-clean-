// cc-beats-table.js - All Beats Analytics Table Module
import { 
  MAIN_API, 
  STATS_API,
  allBeats, 
  filteredBeats, 
  setAllBeats, 
  setFilteredBeats,
  currentTrack,
  isPlaying
} from './cc-config.js';
import { togglePlay } from './cc-player.js';

// ===== INIT BEATS TABLE =====
export async function initBeatsTable() {
  // Search input
  const searchInput = document.getElementById('beatsSearch');
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      const query = e.target.value.toLowerCase().trim();
      const filtered = query
        ? allBeats.filter(b =>
            b.title.toLowerCase().includes(query) ||
            (b.artist && b.artist.toLowerCase().includes(query)) ||
            (b.genre && b.genre.toLowerCase().includes(query)) ||
            (b.tags && b.tags.toLowerCase().includes(query))
          )
        : allBeats;
      setFilteredBeats(filtered);
      renderBeatsTable(filtered);
    }, 300));
  }

  // Load initial beats
  await loadBeats();
}

// ===== LOAD BEATS FROM MAIN API =====
async function loadBeats() {
  try {
    console.log('[CC Beats Table] Fetching beats from MAIN_API');
    
    const res = await fetch(`${MAIN_API}/beats`);
    if (!res.ok) throw new Error(`Beats failed: ${res.status}`);
    
    const beats = await res.json();
    setAllBeats(beats);
    setFilteredBeats(beats);
    
    renderBeatsTable(beats);
    
    console.log('[CC Beats Table] Loaded beats:', beats.length);
  } catch (err) {
    console.error('[CC Beats Table] Load failed:', err);
    const tbody = document.getElementById('beatsTableBody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Failed to load beats</td></tr>`;
    }
  }
}

// ===== RENDER BEATS TABLE =====
export function renderBeatsTable(beats) {
  const tbody = document.getElementById('beatsTableBody');
  if (!tbody) return;

  if (beats.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No beats found</td></tr>`;
    return;
  }

  tbody.innerHTML = beats.map(beat => {
    const isFree = beat.monetization_mode === 'free';
    const revenue = isFree? 'FREE' : `$${((beat.download_count || 0) * (beat.price || 0)).toFixed(2)}`;
    const isThisTrackPlaying = currentTrack && currentTrack.id == beat.id && isPlaying;

    return `
      <tr data-beat-id="${beat.id}">
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="${beat.cover_url || beat.cover || 'images/logo.png'}" style="width:32px;height:32px;border-radius:4px;object-fit:cover;" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%238b5cf6%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'">
            <div>
              <strong>${beat.title}</strong>
              <div style="font-size:11px;color:#666;">${beat.artist || 'DopeTone'}</div>
            </div>
          </div>
        </td>
        <td>${beat.play_count || 0}</td>
        <td>${beat.download_count || 0}</td>
        <td>${beat.like_count || 0}</td>
        <td>0</td>
        <td style="${isFree? 'color:#3b82f6;font-weight:600;' : ''}">${revenue}</td>
        <td>
          <button class="action-btn play-btn" onclick="window.ccTogglePlay(${beat.id})" data-id="${beat.id}" title="${isThisTrackPlaying? 'Pause' : 'Play'}">
            <i class="fa-solid fa-${isThisTrackPlaying? 'pause' : 'play'}"></i>
          </button>
          <button class="action-btn" onclick="window.ccEditBeat(${beat.id})" title="Edit">
            <i class="fa-solid fa-edit"></i>
          </button>
          <button class="action-btn delete" onclick="window.ccDeleteBeat(${beat.id})" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ===== TOGGLE PLAY - Exposed to window for inline onclick =====
window.ccTogglePlay = function(id) {
  togglePlay(id);
};

// ===== EDIT BEAT =====
window.ccEditBeat = function(id) {
  window.dispatchEvent(new CustomEvent('cc_edit_beat', { detail: id }));
};

// ===== DELETE BEAT =====
window.ccDeleteBeat = async function(id) {
  if (!confirm('Delete this beat? This cannot be undone.')) return;
  
  try {
    const res = await fetch(`${MAIN_API}/beats/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    
    // Remove from local state
    const updatedBeats = allBeats.filter(b => b.id != id);
    setAllBeats(updatedBeats);
    setFilteredBeats(updatedBeats.filter(b => filteredBeats.some(f => f.id == b.id)));
    
    renderBeatsTable(filteredBeats);
    
    // Refresh stats
    window.dispatchEvent(new CustomEvent('cc_stats_updated'));
    
    alert('Beat deleted successfully');
  } catch (err) {
    alert('Delete failed: ' + err.message);
  }
};

// ===== REFRESH BEATS TABLE =====
export async function refreshBeatsTable() {
  await loadBeats();
}

// ===== UPDATE PLAY BUTTON IN TABLE =====
export function updatePlayButtonInTable(id, playing) {
  const btn = document.querySelector(`.play-btn[data-id="${id}"]`);
  if (btn) btn.innerHTML = `<i class="fa-solid fa-${playing? 'pause' : 'play'}"></i>`;
}

// ===== UTILITY: Debounce =====
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => { clearTimeout(timeout); func(...args); };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Listen for external refresh requests
window.addEventListener('cc_dashboard_refresh', () => {
  loadBeats();
});
