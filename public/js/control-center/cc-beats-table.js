// cc-beats-table.js - PRO - Fixed: BEATS_API only, DELETE works, Search + Edit
import {
  BEATS_API,
  allBeats,
  setAllBeats,
  setFilteredBeats,
  currentTrack,
  isPlaying
} from './cc-config.js';
import { togglePlay } from './cc-player.js';

export async function initBeatsTable() {
  const searchInput = document.getElementById('beatsSearch');
  const topSearch = document.getElementById('searchBar');

  const handleSearch = debounce((query) => {
    const q = query.toLowerCase().trim();
    const filtered = q
      ? allBeats.filter(b =>
          (b.title||'').toLowerCase().includes(q) ||
          (b.artist||'').toLowerCase().includes(q) ||
          (b.genre||'').toLowerCase().includes(q) ||
          (b.tags||'').toLowerCase().includes(q) ||
          (b.mood||'').toLowerCase().includes(q)
        )
      : allBeats;
    setFilteredBeats(filtered);
    renderBeatsTable(filtered);
  }, 200);

  if (searchInput) searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
  if (topSearch) topSearch.addEventListener('input', (e) => {
    if (searchInput) searchInput.value = e.target.value;
    handleSearch(e.target.value);
  });

  await loadBeats();
}

async function loadBeats() {
  try {
    // ALWAYS BEATS_API - has DELETE CORS, has beats/ covers/ wavs/ projects/
    const res = await fetch(`${BEATS_API}/beats`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.beats || data.data || []);
    setAllBeats(list);
    setFilteredBeats(list);
    renderBeatsTable(list);
  } catch (err) {
    console.error('[Beats Table] Load failed:', err);
    const tbody = document.getElementById('beatsTableBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Failed: ${err.message}<br><small>${BEATS_API}/beats</small></td></tr>`;
  }
}

export function renderBeatsTable(beats) {
  const tbody = document.getElementById('beatsTableBody');
  if (!tbody) return;
  if (!beats || beats.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No beats found — Create your first beat</td></tr>`;
    return;
  }
  tbody.innerHTML = beats.map(beat => {
       const isFree = beat.monetization_mode === 'free';
    const realRev = parseFloat(beat.real_revenue || 0);
    const revenue = isFree ? 'FREE' : (realRev > 0 ? `$${realRev.toFixed(2)}` : `$${((beat.download_count || 0) * (beat.price || 0)).toFixed(2)}`);

    const isThisTrackPlaying = currentTrack && currentTrack.id == beat.id && isPlaying;
    const cover = beat.cover_url || beat.cover || 'images/logo.png';
    return `
      <tr data-beat-id="${beat.id}">
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="${cover}" style="width:36px;height:36px;border-radius:6px;object-fit:cover;border:1px solid #222" loading="lazy"
              onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHZpZXdCb3g9IjAgMCAzNiAzNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHJ4PSI4IiBmaWxsPSIjOGI1Y2Y2Ii8+PHRleHQgeD0iMTgiIHk9IjIxIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9IjcwMCI+RFQ8L3RleHQ+PC9zdmc+'">
            <div>
              <strong style="color:#fff;font-size:13px">${escapeHtml(beat.title)}</strong>
              <div style="font-size:11px;color:#888;">${escapeHtml(beat.artist || 'DopeTone')} • ${beat.bpm||'-'} BPM • ${beat.key||''}</div>
              <div style="font-size:10px;color:#555;">${beat.genre||''} ${beat.mood? '• '+beat.mood : ''}</div>
            </div>
          </div>
        </td>
        <td>${beat.play_count ?? beat.plays ?? 0}</td>
        <td>${beat.download_count ?? beat.downloads ?? 0}</td>
        <td>${beat.like_count ?? beat.likes ?? 0}</td>
        <td>${beat.cart_count ?? 0}</td>
        <td style="${isFree? 'color:#3b82f6;font-weight:700;' : 'color:#00ff88;font-weight:600;'}">${revenue}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="action-btn play-btn" onclick="window.ccTogglePlay(${JSON.stringify(beat.id)})" data-id="${beat.id}" title="${isThisTrackPlaying? 'Pause' : 'Play'}" style="width:28px;height:28px;border-radius:6px;border:1px solid #333;background:#111;color:#fff;cursor:pointer"><i class="fa-solid fa-${isThisTrackPlaying? 'pause' : 'play'}"></i></button>
            <button class="action-btn" onclick="window.ccEditBeat(${JSON.stringify(beat.id)})" title="Edit / Replace beats/ covers/ wavs/ projects/" style="width:28px;height:28px;border-radius:6px;border:none;background:#8b5cf6;color:#fff;cursor:pointer"><i class="fa-solid fa-pen-to-square"></i></button>
            <button class="action-btn delete" onclick="window.ccDeleteBeat(${JSON.stringify(beat.id)})" title="Delete from R2 + D1" style="width:28px;height:28px;border-radius:6px;border:none;background:#ff3b3b;color:#fff;cursor:pointer"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function escapeHtml(s){ return (s||'').toString().replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// FIXED GLOBALS
window.ccTogglePlay = (id)=> {
  // instant play - from table
  import('./cc-player.js').then(m=> m.playBeat(id));
  // fallback direct
  if(window.playBeatDirect) window.playBeatDirect(id);
};

// make edit work even if allBeats empty
window.ccEditBeat = (id)=> {
  console.log('[EDIT CLICK]', id, 'allBeats len', allBeats.length);
  const beat = allBeats.find(b=> String(b.id)===String(id));
  if(!beat){ alert('Beat not loaded yet, wait 1 sec'); return; }
  window.dispatchEvent(new CustomEvent('cc_edit_beat', {detail:id}));
  if(window.loadBeatIntoModal) {
    window.loadBeatIntoModal(id);
  } else {
    // direct open if edit-modal exposes openEditModal
    const modal = document.getElementById('editModal');
    if(modal){
      modal.classList.add('active');
      document.body.classList.add('modal-open');
    }
    if(window.openEditModalDirect) window.openEditModalDirect(beat);
  }
};


export async function refreshBeatsTable(){ await loadBeats(); }

export function updatePlayButtonInTable(id, playing){
  const btn = document.querySelector(`.play-btn[data-id="${id}"]`);
  if (btn) btn.innerHTML = `<i class="fa-solid fa-${playing? 'pause' : 'play'}"></i>`;
}

function debounce(func, wait){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>func(...a),wait); }; }

window.addEventListener('cc_dashboard_refresh', loadBeats);
window.addEventListener('cc_beats_loaded', (e)=> renderBeatsTable(e.detail));
