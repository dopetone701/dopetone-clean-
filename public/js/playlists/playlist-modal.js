// ===============================
// 🎵 PLAYLIST MODAL - MONETIZATION SAFE
// ===============================
import { createPlaylist, addBeatToPlaylist } from "./playlist-engine.js"
import { getPlaylists } from "./playlist-storage.js"

// === MONETIZATION SAFE ===
const getMode = (b) => {
  if (!b) return 'paid';
  let m = (b.monetization_mode || b.monetizationMode || '').toLowerCase().trim();
  if (['free','hybrid','paid'].includes(m)) return m;
  if (m.includes('tagged')) return 'hybrid';
  if (b.is_free == 1 || b.is_free === true) return 'free';
  if (b.has_free_tagged == 1) return 'hybrid';
  return 'paid';
};
function normalizeBeat(beat) {
  if (!beat) return null;
  return {
    ...beat,
    audio: beat.audio || beat.mp3_url,
    mp3_url: beat.mp3_url || beat.audio,
    cover: beat.cover || beat.cover_url,
    cover_url: beat.cover_url || beat.cover,
    zip_url: beat.zip_url || beat.project_file,
    project_file: beat.project_file || beat.zip_url,
    sample: beat.sample || beat.mp3_url || beat.audio,
    monetization_mode: beat.monetization_mode || beat.monetizationMode || getMode(beat),
    monetizationMode: beat.monetizationMode || beat.monetization_mode || getMode(beat),
    price: beat.price ?? 29.99
  };
}

function showPlaylistToast(text = ""){
    let toast = document.getElementById("playlistToast");
    if(!toast){ toast = document.createElement("div"); toast.id = "playlistToast"; document.body.appendChild(toast); }
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(toast.__timer);
    toast.__timer = setTimeout(() => { toast.classList.remove("show"); },2200);
}

export function openPlaylistModal(){
    closePlaylistModal();
    const modal = document.createElement("div"); modal.id = "playlistModal";
    modal.innerHTML = `
    <div class="playlist-modal-backdrop"></div>
    <div class="playlist-modal-box">
        <div class="playlist-glow"></div>
        <h2>Create Playlist</h2>
        <p>Build your sound arsenal</p>
        <input id="playlistNameInput" type="text" maxlength="24" placeholder="Night Drive" />
        <div class="playlist-suggestions">
            <button>Dark Rage</button><button>Night Drive</button><button>808 Chaos</button><button>Sad Piano</button>
        </div>
        <button id="createPlaylistBtn">Create Playlist</button>
        <div id="playlistError" class="playlist-error"></div>
    </div>`;
    document.body.appendChild(modal);

    const backdrop = modal.querySelector(".playlist-modal-backdrop");
    const input = document.getElementById("playlistNameInput");
    const createBtn = document.getElementById("createPlaylistBtn");
    const error = document.getElementById("playlistError");

    backdrop.onclick = () => closePlaylistModal();
    modal.querySelectorAll(".playlist-suggestions button").forEach(btn => {
        btn.onclick = () => { input.value = btn.textContent.trim(); };
    });

    createBtn.onclick = () => {
        const name = input.value.trim();
        if(!name){ error.textContent = "Enter playlist name"; return; }
        const result = createPlaylist(name);
        if(!result.ok){ error.textContent = result.message; return; }
        if(window.__PENDING_PLAYLIST_BEAT__){
            addBeatToPlaylist(result.playlist.id, normalizeBeat(window.__PENDING_PLAYLIST_BEAT__));
            window.__PENDING_PLAYLIST_BEAT__ = null;
        }
        closePlaylistModal();
        showPlaylistToast("Playlist created");
    };
}

export function openAddToPlaylistModal(beat){
    closePlaylistModal();
    const safeBeat = normalizeBeat(beat);
    const mode = getMode(safeBeat);
    const playlists = getPlaylists().filter(playlist => !playlist.isLiked && playlist.id !== "liked_playlist");

    const modal = document.createElement("div"); modal.id = "playlistModal";
    modal.innerHTML = `
    <div class="playlist-modal-backdrop"></div>
    <div class="playlist-modal-box">
        <div class="playlist-glow"></div>
        <h2>Add To Playlist</h2>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding:8px 10px;background:rgba(255,255,255,0.04);border-radius:10px">
          <img src="${safeBeat.cover_url || 'images/logo.png'}" style="width:40px;height:40px;border-radius:8px;object-fit:cover"/>
          <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${safeBeat.title}</div><div style="font-size:11px;opacity:0.6">${safeBeat.genre||'Trap'} • ${mode==='free'?'<span style="color:#3b82f6;font-weight:700">FREE</span>':`$${safeBeat.price||29.99}`}</div></div>
        </div>
        <div class="playlist-picker-list">
            ${playlists.map(playlist => {
                const exists = playlist.beats.find(b => b.id === safeBeat.id);
                return `<button class="playlist-pick-item" data-id="${playlist.id}"><span>${playlist.name}</span><span>${exists? "✓ Added" : `${playlist.beats.length} tracks`}</span></button>`;
            }).join("")}
        </div>
        <button id="newPlaylistQuickBtn" class="create-new-playlist-btn">+ Create New Playlist</button>
    </div>`;
    document.body.appendChild(modal);

    modal.querySelector(".playlist-modal-backdrop").onclick = () => closePlaylistModal();
    modal.querySelectorAll(".playlist-pick-item").forEach(btn => {
        btn.onclick = () => {
            const playlistId = btn.dataset.id;
            const result = addBeatToPlaylist(playlistId, safeBeat);
            closePlaylistModal();
            const playlist = playlists.find(p => p.id === playlistId);
            if(result?.removed) showPlaylistToast(`Removed from ${playlist.name}`);
            else showPlaylistToast(`Added to ${playlist.name}`);
        };
    });

    const quickBtn = document.getElementById("newPlaylistQuickBtn");
    quickBtn.onclick = () => {
        closePlaylistModal();
        setTimeout(() => {
            window.__PENDING_PLAYLIST_BEAT__ = safeBeat;
            openPlaylistModal();
        },120);
    };
}

export function closePlaylistModal(){
    const modal = document.getElementById("playlistModal");
    if(modal) modal.remove();
}

window.openPlaylistModal = openPlaylistModal;
window.openAddToPlaylistModal = openAddToPlaylistModal;
window.showPlaylistToast = showPlaylistToast;
