// ===============================
// 🎵 PLAYLIST RENDER FINAL FIXED + D1 LIKES + MONETIZATION + MOBILE COVER FIX
// ===============================
const STATS_API = 'https://dopetone-stats.dopetone701.workers.dev';

// === MONETIZATION ===
const getMode = (b) => {
  if (!b) return 'paid';
  let m = (b.monetization_mode || b.monetizationMode || '').toLowerCase().trim();
  if (['free','hybrid','paid'].includes(m)) return m;
  if (m.includes('tagged')) return 'hybrid';
  if (b.is_free == 1 || b.is_free === true) return 'free';
  if (b.has_free_tagged == 1) return 'hybrid';
  return 'paid';
};

function fixPrice(p){
  if(p===null||p===undefined) return 29.99;
  let price = Number(p);
  if(isNaN(price)) return 29.99;
  if(price >= 1000) price = price / 100; // 2999 -> 29.99
  if(price >= 100) price = price / 100;
  return Number(price.toFixed(2));
}

function normalizeBeat(b){
  if(!b) return null;
  const coverSrc = b.cover || b.cover_url || b.coverUrl || b.image || "images/logo.png";
  return {
   ...b,
    id: b.id || b.beat_id || b._id,
    title: b.title || b.name || "Untitled",
    cover: coverSrc,
    cover_url: coverSrc,
    coverUrl: coverSrc,
    audio: b.audio || b.mp3_url,
    mp3_url: b.mp3_url || b.audio,
    genre: b.genre || "Trap",
    bpm: b.bpm || 140,
    monetization_mode: b.monetization_mode || b.monetizationMode || getMode(b),
    monetizationMode: b.monetizationMode || b.monetization_mode || getMode(b),
    price: fixPrice(b.price?? 29.99)
  };
}

function getD1UserKey() {
  if (!localStorage.getItem('dopetone_device_id')) {
    localStorage.setItem('dopetone_device_id', Math.random().toString(36).slice(2) + Date.now());
  }
  return window.Auth?.user?.id || localStorage.getItem('dopetone_user_id') || `anon_${localStorage.getItem('dopetone_device_id')}`;
}
async function syncLikedFromD1() {
  try {
    const res = await fetch(`${STATS_API}/api/stats/liked`);
    if (!res.ok) return;
    const data = await res.json();
    const userKey = getD1UserKey();
    const myLikes = data.filter(d => d.user_key === userKey);
    if (myLikes.length >= 0) {
      localStorage.setItem('_d1_liked_count', String(myLikes.length));
      localStorage.setItem('_d1_liked_ids', JSON.stringify(myLikes.map(l => String(l.beat_id))));
    }
  } catch(e) {}
}
syncLikedFromD1();
setInterval(syncLikedFromD1, 10000);

import { getPlaylists } from "./playlist-storage.js"

// Inject pointer style
(function injectPlaylistRenderPointer(){
  if(document.getElementById('pr-pointer-fix')) return;
  const s=document.createElement('style'); s.id='pr-pointer-fix';
  s.textContent=`.playlist-track-play,.playlist-play-btn,.playlist-open-btn,.playlist-delete-btn{cursor:pointer!important}.playlist-row{cursor:pointer}.playlist-price{cursor:pointer!important}.playlist-cover{width:48px;height:48px;object-fit:cover;border-radius:8px;background:#0f172a;display:block!important}`;
  document.head.appendChild(s);
})();

export function renderPlaylists(){
    renderHomepagePlaylists();
    renderLicencePlaylists();
}

export function renderHomepagePlaylists(){
    const mount = document.getElementById("homepagePlaylists");
    if(!mount) return;
    const playlists = getPlaylists();
    const filtered = playlists.filter(playlist => {
        if(playlist.isLiked){
            const likedIds = JSON.parse(localStorage.getItem("liked_beats")) || [];
            const d1Count = parseInt(localStorage.getItem('_d1_liked_count') || '0');
            const d1Ids = JSON.parse(localStorage.getItem('_d1_liked_ids') || '[]');
            return likedIds.length > 0 || d1Count > 0 || d1Ids.length > 0 || playlist.beats.length > 0;
        }
        return true;
    });
    if(!filtered.length){ mount.innerHTML = ""; return; }
    mount.innerHTML = `
    <section class="playlist-section">
        <div class="playlist-top"><h2 class="section-title fire-title">🎵 Your Playlists</h2></div>
        <div class="playlist-grid">${filtered.slice(0,9).map(renderPlaylistCard).join("")}</div>
    </section>`;
    setTimeout(() => { initPlaylistWaves(); },120);
}

export function renderLicencePlaylists(){
    const mount = document.getElementById("licencePlaylists");
    if(!mount) return;
    const playlists = getPlaylists();
    const filtered = playlists.filter(() => true);
    if(!filtered.length){ mount.innerHTML = ""; return; }
    mount.innerHTML = `
    <section class="playlist-section playlist-section-licence">
        <div class="playlist-top playlist-top-licence"><h2 class="playlist-title-licence"><span class="playlist-title-icon">🎵</span><span>Your Playlists</span></h2></div>
        <div class="playlist-grid">${filtered.slice(0,6).map(renderPlaylistCard).join("")}</div>
    </section>`;
    setTimeout(() => { initPlaylistWaves(); },120);
}

function initPlaylistWaves(){
    if(typeof WaveSurfer === "undefined") return;
    const rows = document.querySelectorAll(".playlist-row");
    rows.forEach(row => {
        if(row.dataset.waveLoaded) return;
        const waveContainer = row.querySelector(".playlist-wave");
        const trackBtn = row.querySelector(".playlist-track-play");
        if(!waveContainer ||!trackBtn) return;
        const realBeatId = trackBtn.dataset.realbeat;
        const playlistId = trackBtn.dataset.playlist;
        let beat = null;
        getPlaylists().forEach(playlist => {
            if(playlist.id!== playlistId) return;
            const found = playlist.beats.find(b => String(b.id) == String(realBeatId));
            if(found) beat = found;
        });
        if(!beat?.mp3_url &&!beat?.audio) return;
        const wave = WaveSurfer.create({
            container: waveContainer, waveColor: "#1e293b", progressColor: "#ff003c", height: 40, normalize: true, fillParent: true, cursorWidth: 0, responsive: true, interact: true
        });
        wave.load(beat.mp3_url || beat.audio);
        wave.on("click", (progress) => {
            const audio = window.__DOPE_TONE_AUDIO__; if(!audio) return; const duration = audio.duration || 0; if(!duration) return; audio.currentTime = duration * progress;
        });
        row.__wave = wave; row.dataset.waveLoaded = "true";
    });
}

function renderPlaylistCard(playlist){
    const beats = (playlist.beats || []).map(normalizeBeat).filter(Boolean);
    return `
    <div class="playlist-card" data-playlist="${playlist.id}">
        <div class="playlist-card-top">
            <div><div class="playlist-name">${playlist.name}</div><div class="playlist-count">${beats.length} tracks</div></div>
            <button class="playlist-play-btn">▶</button>
        </div>
        <div class="playlist-rows">
            ${beats.length? beats.map((beat,index) => {
                const mode=getMode(beat);
                const coverSrc = beat.cover_url || beat.cover || "images/logo.png";
                return `
                <div class="playlist-row" data-mode="${mode}">
                    <div class="playlist-row-left">
                        <div class="playlist-cover-wrap" style="position:relative;min-width:48px">
                            <img src="${coverSrc}" class="playlist-cover" loading="lazy" decoding="async" onerror="this.src='images/logo.png'" style="width:48px;height:48px;object-fit:cover;border-radius:8px;background:#0f172a;display:block">
                            ${mode==='free'?`<span style="position:absolute;top:-4px;left:-4px;background:#3b82f6;color:#fff;font-size:8px;font-weight:800;padding:2px 4px;border-radius:3px;z-index:2">FREE</span>`:''}
                        </div>
                        <div class="playlist-row-info">
                            <div class="playlist-track-title">${beat.title || "Untitled"}</div>
                            <div class="playlist-track-meta"><span>${beat.genre || "Trap"}</span><span class="dot">•</span><span>${beat.bpm || "140"} BPM</span><span class="dot">•</span><span class="playlist-price" style="cursor:pointer;${mode==='free'?'color:#3b82f6;font-weight:700':''}">${mode==='free'?'FREE':`$${fixPrice(beat.price).toFixed(2)}`}</span></div>
                        </div>
                    </div>
                    <div class="wave-bar playlist-wave"></div>
                    <button class="playlist-track-play" data-playlist="${playlist.id}" data-index="${index}" data-realbeat="${beat.id}">▶</button>
                </div>
                `}).join("") : `<div class="playlist-empty">No beats yet</div>`
            }
        </div>
        <div class="playlist-footer">
            <a href="playlists.html?id=${playlist.id}" class="playlist-open-btn">Open Playlist</a>
            ${!playlist.isLiked? `<button class="playlist-delete-btn" data-playlist="${playlist.id}">🗑</button>` : ""}
        </div>
    </div>`;
}

function resetPlaylistUI(){
    document.querySelectorAll(".playlist-track-play").forEach(btn => { btn.classList.remove("active"); btn.innerHTML = "▶"; });
    document.querySelectorAll(".playlist-play-btn").forEach(btn => { btn.classList.remove("active"); btn.innerHTML = "▶"; });
}

document.addEventListener("click", e => {
        const deleteBtn = e.target.closest(".playlist-delete-btn");
        if(deleteBtn){
    const playlistId = deleteBtn.dataset.playlist;
    const playlist = getPlaylists().find(p => p.id === playlistId); if(!playlist) return;
    const existingDelete = document.getElementById("deletePlaylistConfirm"); if(existingDelete) existingDelete.remove();
    const confirmBox = document.createElement("div"); confirmBox.id = "deletePlaylistConfirm";
    confirmBox.innerHTML = `
<div class="delete-confirm-backdrop"></div>
<div class="delete-confirm-panel">
    <div class="delete-confirm-glow"></div>
    <div class="delete-confirm-icon">🗑</div>
    <div class="delete-confirm-title">Delete Playlist</div>
    <div class="delete-confirm-text">"${playlist.name}" will be permanently removed.</div>
    <div class="delete-confirm-actions"><button class="delete-cancel-btn">Cancel</button><button class="delete-confirm-btn">Delete</button></div>
</div>`;
    document.body.appendChild(confirmBox);
    confirmBox.querySelector(".delete-confirm-backdrop").onclick = () => confirmBox.remove();
    confirmBox.querySelector(".delete-cancel-btn").onclick = () => confirmBox.remove();
    confirmBox.querySelector(".delete-confirm-btn").onclick = () => {
        if(window.__CURRENT_LIST__ === playlistId){ window.__DOPE_TONE_AUDIO__?.pause(); window.__ACTIVE_TRACK_KEY__ = null; }
        window.deletePlaylist?.(playlistId); confirmBox.remove();
    };
    return;
}
        const trackBtn = e.target.closest(".playlist-track-play");
        if(trackBtn){
            const playlistId = trackBtn.dataset.playlist; const index = Number(trackBtn.dataset.index);
            const playlist = getPlaylists().find(p => p.id === playlistId); if(!playlist) return;
            const card = trackBtn.closest(".playlist-card");
            const alreadyActive = trackBtn.classList.contains("active");
            if(alreadyActive){
                if(window.__DOPE_TONE_AUDIO__?.paused){ window.globalPlayer.toggle(); trackBtn.innerHTML = "⏸"; trackBtn.classList.add("active"); const pbtn=card.querySelector(".playlist-play-btn"); if(pbtn){pbtn.classList.add("active"); pbtn.innerHTML="⏸";} }
                else{ window.globalPlayer.toggle(); trackBtn.innerHTML = "▶"; trackBtn.classList.remove("active"); const pbtn=card.querySelector(".playlist-play-btn"); if(pbtn){pbtn.classList.remove("active"); pbtn.innerHTML="▶";} }
                return;
            }
            resetPlaylistUI(); trackBtn.classList.add("active"); trackBtn.innerHTML = "⏸";
            const playlistBtn = card.querySelector(".playlist-play-btn"); if(playlistBtn){ playlistBtn.classList.add("active"); playlistBtn.innerHTML = "⏸"; }
            const cleanBeats = playlist.beats.map(normalizeBeat);
            window.globalPlayer?.play(index, cleanBeats, playlistId); return;
        }
        const playBtn = e.target.closest(".playlist-play-btn");
        if(playBtn){
            const card = playBtn.closest(".playlist-card"); const playlistId = card.dataset.playlist; const playlist = getPlaylists().find(p => p.id === playlistId); if(!playlist) return;
            if(playBtn.classList.contains("active")){
                if(window.__DOPE_TONE_AUDIO__?.paused){ window.globalPlayer.toggle(); playBtn.classList.add("active"); playBtn.innerHTML = "⏸"; const activeTrack=card.querySelector(".playlist-track-play.active"); if(activeTrack){activeTrack.classList.add("active"); activeTrack.innerHTML="⏸";} }
                else{ window.globalPlayer.toggle(); playBtn.classList.remove("active"); playBtn.innerHTML = "▶"; const activeTrack=card.querySelector(".playlist-track-play.active"); if(activeTrack){activeTrack.classList.remove("active"); activeTrack.innerHTML="▶";} }
                return;
            }
            resetPlaylistUI(); playBtn.classList.add("active"); playBtn.innerHTML = "⏸";
            const firstTrack = card.querySelector(".playlist-track-play"); if(firstTrack){ firstTrack.classList.add("active"); firstTrack.innerHTML = "⏸"; }
            const cleanBeats = playlist.beats.map(normalizeBeat);
            window.globalPlayer?.play(0, cleanBeats, playlistId); return;
        }
    }
);

document.removeEventListener("playerTimeUpdate", window.__playlistWaveProgress__);
window.__playlistWaveProgress__ = (e) => {
    const { index, listId, percent } = e.detail||{}; if(listId == null) return;
    const card = document.querySelector(`.playlist-card[data-playlist="${listId}"]`); if(!card) return;
    const rows = card.querySelectorAll(".playlist-row");
    rows.forEach((row,i) => { const wave = row.__wave; if(!wave) return; if(i === index){ try{ wave.seekTo(percent); }catch(err){} } else { try{ wave.seekTo(0); }catch(err){} } });
};
document.addEventListener("playerTimeUpdate", window.__playlistWaveProgress__);

document.addEventListener("playerPause", () => {
        document.querySelectorAll(".playlist-row").forEach(row => { const wave=row.__wave; if(!wave) return; try{ wave.pause(); }catch(err){} });
});

document.addEventListener("DOMContentLoaded", renderPlaylists);

document.addEventListener("playerPlay", e => {
        const { index, listId } = e.detail||{};
        document.querySelectorAll(".playlist-track-play").forEach(btn => { btn.classList.remove("active"); btn.innerHTML = "▶"; });
        document.querySelectorAll(".playlist-play-btn").forEach(btn => { btn.classList.remove("active"); btn.innerHTML = "▶"; });
        const card = document.querySelector(`.playlist-card[data-playlist="${listId}"]`); if(!card) return;
        const playlistBtn = card.querySelector(".playlist-play-btn"); if(playlistBtn){ playlistBtn.classList.add("active"); playlistBtn.innerHTML = "⏸"; }
        const trackBtns = card.querySelectorAll(".playlist-track-play"); const activeTrack = trackBtns[index]; if(activeTrack){ activeTrack.classList.add("active"); activeTrack.innerHTML = "⏸"; }
});
document.addEventListener("playerPause", () => {
        document.querySelectorAll(".playlist-track-play").forEach(btn => { btn.classList.remove("active"); btn.innerHTML = "▶"; });
        document.querySelectorAll(".playlist-play-btn").forEach(btn => { btn.classList.remove("active"); btn.innerHTML = "▶"; });
});

window.addEventListener("playlistsUpdated", () => {
        const state = { index: window.__CURRENT_INDEX__, listId: window.__CURRENT_LIST__, playing:!window.__DOPE_TONE_AUDIO__?.paused };
        renderPlaylists();
        if(state.playing){ document.dispatchEvent(new CustomEvent("playerPlay", { detail:{ index: state.index, listId: state.listId } })); }
});

window.renderPlaylists = renderPlaylists;

window.addEventListener("playlistVisualUpdate", () => {
        document.querySelectorAll(".playlist-card").forEach(card => {
            const playlistId = card.dataset.playlist;
            const playlist = getPlaylists().find(p => p.id === playlistId); if(!playlist) return;
            const count = card.querySelector(".playlist-count"); if(count) count.textContent = `${playlist.beats.length} tracks`;
        });
});

export function renderPlaylistCapsulesOnly(){
    const container = document.getElementById("playlistCapsules"); if(!container) return;
    const playlists = window.getPlaylists() || []; container.innerHTML = "";
    playlists.forEach(playlist => {
        const btn = document.createElement("button"); btn.className = "playlist-capsule"; btn.textContent = playlist.name;
        btn.onclick = () => {
            document.querySelectorAll(".playlist-capsule").forEach(c => c.classList.remove("active"));
            btn.classList.add("active"); window.activePlaylist = playlist;
            console.log("🎵 Active:", playlist.name);
        };
        container.appendChild(btn);
    });
}

// 🔥 LIVE MONETIZATION UPDATE FOR PLAYLISTS
window.addEventListener('cc_monetize_changed', (e)=>{
  const {beatId,mode,price}=e.detail||{}; if(!beatId) return;
  try{
    let pls = JSON.parse(localStorage.getItem("playlists"))||[];
    pls.forEach(p=>{ p.beats?.forEach(b=>{ if(String(b.id)===String(beatId)){ b.monetization_mode=mode; b.monetizationMode=mode; b.is_free=mode==='free'?1:0; b.has_free_tagged=mode==='hybrid'?1:0; b.price=fixPrice(price??b.price); } }); });
    localStorage.setItem("playlists",JSON.stringify(pls));
    let dtPls = JSON.parse(localStorage.getItem("dopetone_playlists"))||[];
    dtPls.forEach(p=>{ p.beats?.forEach(b=>{ if(String(b.id)===String(beatId)){ b.monetization_mode=mode; b.monetizationMode=mode; b.price=fixPrice(price??b.price); } }); });
    localStorage.setItem("dopetone_playlists",JSON.stringify(dtPls));
  }catch{}
  renderPlaylists();
});
