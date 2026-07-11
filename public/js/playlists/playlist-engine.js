// ===============================
// 🎵 PLAYLIST ENGINE - CLOUDFLARE READY + D1 LIKES SYNC + MONETIZATION
// ===============================
import { getPlaylists, savePlaylists } from "./playlist-storage.js"

const WORKER_URL = 'https://dope-tone-api.dopetone701.workers.dev';
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
const handleBuy = (beat) => {
  if (getMode(beat)==='free') {
    const a=document.createElement('a'); a.href=beat.mp3_url||beat.audio; a.download=`${beat.title}.mp3`; a.click(); return true;
  }
  return false;
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
    monetization_mode: beat.monetization_mode || beat.monetizationMode || 'paid',
    monetizationMode: beat.monetizationMode || beat.monetization_mode || 'paid',
    price: beat.price || 29.99,
    is_free: beat.is_free ?? 0,
    has_free_tagged: beat.has_free_tagged ?? 0
  };
}

function getUserKeyForStats(){
  return window.Auth?.user?.id || localStorage.getItem('dopetone_user_id') || `anon_${localStorage.getItem('dopetone_device_id') || 'device'}` ;
}
if (!localStorage.getItem('dopetone_device_id')) {
  localStorage.setItem('dopetone_device_id', Math.random().toString(36).slice(2) + Date.now());
}

function ensureLikedPlaylist(){
    const playlists = getPlaylists();
    let liked = playlists.find(p => p.isLiked);
    if(!liked){
        liked = { id: "liked_playlist", name: "Liked", isLiked: true, created: Date.now(), beats: [] };
        playlists.unshift(liked); savePlaylists(playlists);
    }
    return liked;
}
ensureLikedPlaylist();

function preservePlayerState(){
    return { index: window.__CURRENT_INDEX__, listId: window.__CURRENT_LIST__, playing: window.globalPlayer?.isPlaying?.(), percent: (window.__DOPE_TONE_AUDIO__?.currentTime || 0) / (window.__DOPE_TONE_AUDIO__?.duration || 1) };
}
function restorePlayerState(state){
    if(!state) return;
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            document.dispatchEvent(new CustomEvent("playerTimeUpdate", { detail: { index: state.index, listId: state.listId, percent: state.percent } }));
            if(state.playing){ document.dispatchEvent(new CustomEvent("playerPlay", { detail: { index: state.index, listId: state.listId } })); }
        });
    });
}

export function createPlaylist(name){
    let playlists = getPlaylists();
    const customPlaylists = playlists.filter(p => !p.isLiked);
    if(customPlaylists.length >= 7){ return { ok:false, message: "Playlist limit reached" }; }
    const exists = playlists.find(p => p.name.toLowerCase() === name.toLowerCase());
    if(exists){ return { ok:false, message: "Playlist already exists" }; }
    const playlist = { id: "pl_" + Date.now(), name, created: Date.now(), beats:[] };
    playlists.push(playlist); savePlaylists(playlists);
    const state = preservePlayerState(); window.renderPlaylists?.(); restorePlayerState(state);
    return { ok:true, playlist };
}

export function addBeatToPlaylist(playlistId, beat){
    if(!playlistId || !beat) return;
    if(playlistId === "liked_playlist"){ return { blocked:true }; }
    const playlists = getPlaylists(); const playlist = playlists.find(p => p.id === playlistId); if(!playlist) return;
    const normalizedBeat = normalizeBeat(beat);
    const existsIndex = playlist.beats.findIndex(b => b.id === normalizedBeat.id);
    if(existsIndex !== -1){ playlist.beats.splice(existsIndex, 1); savePlaylists(playlists); const state = preservePlayerState(); window.renderPlaylists?.(); restorePlayerState(state); return { removed:true }; }
    playlist.beats.unshift(normalizedBeat); savePlaylists(playlists); const state = preservePlayerState(); window.renderPlaylists?.(); restorePlayerState(state);
    return { added:true };
}

export function removeBeatFromPlaylist(playlistId, beatId){
    const playlists = getPlaylists(); const playlist = playlists.find(p => p.id === playlistId); if(!playlist) return;
    playlist.beats = playlist.beats.filter(beat => beat.id !== beatId); savePlaylists(playlists);
    const state = preservePlayerState(); window.renderPlaylists?.(); restorePlayerState(state);
}

export function toggleLikedBeat(beat){
    const playlists = getPlaylists(); const liked = playlists.find(p => p.isLiked); if(!liked) return;
    const normalizedBeat = normalizeBeat(beat); const exists = liked.beats.find(b => b.id === normalizedBeat.id);
    if(exists){ liked.beats = liked.beats.filter(b => b.id !== normalizedBeat.id); } else { liked.beats.unshift(normalizedBeat); }
    savePlaylists(playlists); window.dispatchEvent(new Event("playlistsUpdated"));
}

export function deletePlaylist(playlistId){
    let playlists = getPlaylists();
    playlists = playlists.filter(playlist => { if(playlist.isLiked) return true; return playlist.id !== playlistId; });
    savePlaylists(playlists); const state = preservePlayerState(); window.renderPlaylists?.(); restorePlayerState(state);
}

export function getPlaylist(playlistId){ const playlists = getPlaylists(); return playlists.find(p => p.id === playlistId); }

window.getPlaylists = getPlaylists; window.createPlaylist = createPlaylist; window.addBeatToPlaylist = addBeatToPlaylist; window.removeBeatFromPlaylist = removeBeatFromPlaylist; window.deletePlaylist = deletePlaylist; window.toggleLikedBeat = toggleLikedBeat;

document.addEventListener("DOMContentLoaded", () => {
    function getLikedBeats(){ return JSON.parse(localStorage.getItem("liked_beats")) || []; }
    function saveLikedBeats(data){ localStorage.setItem("liked_beats", JSON.stringify(data)); }
    function getPlaylistsLocal(){ return JSON.parse(localStorage.getItem("playlists")) || []; }
    function savePlaylistsLocal(data){ localStorage.setItem("playlists", JSON.stringify(data)); }
    function isBeatLiked(beat){ if(!beat) return false; return getLikedBeats().includes(String(beat.id)); }
    function refreshDesktopHeart(){ const btn=document.getElementById("loveTrackBtn"); const beat=window.__CURRENT_BEAT__; if(!btn||!beat) return; const liked=isBeatLiked(beat); btn.classList.toggle("active", liked); const heart=btn.querySelector(".love-heart"); if(heart) heart.textContent=liked?"❤️":"♡"; }
    function refreshMobileHeart(){ const btn=document.getElementById("mpLike"); const beat=window.__CURRENT_BEAT__; if(!btn||!beat) return; btn.innerHTML=`<span class="love-heart">${isBeatLiked(beat)?"❤️":"♡"}</span>`; }
    function refreshLikeUI(){ refreshDesktopHeart(); refreshMobileHeart(); }
    function updateLikedPlaylist(beat, shouldLike){
        let playlists = getPlaylistsLocal(); let likedPlaylist = playlists.find(p => p.isLiked); const nb=normalizeBeat(beat);
        if(shouldLike && !likedPlaylist){ likedPlaylist={ id:"liked_playlist", name:"Liked", isLiked:true, beats:[] }; playlists.unshift(likedPlaylist); }
        if(likedPlaylist){ if(shouldLike){ if(!likedPlaylist.beats.some(b=>String(b.id)===String(nb.id))) likedPlaylist.beats.push(nb); } else { likedPlaylist.beats=likedPlaylist.beats.filter(b=>String(b.id)!==String(nb.id)); if(likedPlaylist.beats.length===0) playlists=playlists.filter(p=>!p.isLiked); } }
        savePlaylistsLocal(playlists);
    }
    async function loadGlobalLikeCount(beatId){
        if(!beatId) return;
        try { const res=await fetch(`${STATS_API}/api/stats/track/${beatId}?range=day`); if(!res.ok) return; const json=await res.json(); const count=json.stats?.like_count||0; const countEl=document.getElementById("likeCount"); if(countEl){ countEl.textContent=count; const cached=JSON.parse(localStorage.getItem("dopetone_like_counts"))||{}; cached[beatId]=count; localStorage.setItem("dopetone_like_counts",JSON.stringify(cached)); } }catch(e){}
    }
    window.loadGlobalLikeCount = loadGlobalLikeCount;

    async function toggleBeatLike(){
        const beat=window.__CURRENT_BEAT__; if(!beat) return; let liked=getLikedBeats(); const exists=liked.includes(String(beat.id)); const userKey=getUserKeyForStats();
        if(exists){ liked=liked.filter(id=>String(id)!==String(beat.id)); updateLikedPlaylist(beat,false); } else { liked.push(String(beat.id)); updateLikedPlaylist(beat,true); }
        saveLikedBeats(liked);
        try {
            if (exists) { await fetch(`${STATS_API}/api/stats/untrack`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ beat_id:parseInt(beat.id), beatId:parseInt(beat.id), event_type:'like', eventType:'like', user_id:userKey, user_key:userKey })}); }
            else { await fetch(`${STATS_API}/api/stats/event`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ beatId:parseInt(beat.id), beat_id:parseInt(beat.id), eventType:'like', event_type:'like', user_id:userKey, user_key:userKey })}); }
            setTimeout(()=>loadGlobalLikeCount(beat.id),500);
        } catch(err){ console.error('[LIKE D1] sync failed',err); }
        const countEl=document.getElementById("likeCount"); if(countEl){ let cur=Number(countEl.textContent||0); countEl.textContent=exists?Math.max(0,cur-1):cur+1; const cached=JSON.parse(localStorage.getItem("dopetone_like_counts"))||{}; cached[beat.id]=Number(countEl.textContent); localStorage.setItem("dopetone_like_counts",JSON.stringify(cached)); }
        refreshLikeUI(); window.dispatchEvent(new Event("playlistsUpdated")); window.dispatchEvent(new Event("playlistVisualUpdate"));
    }
    document.getElementById("loveTrackBtn")?.addEventListener("click",toggleBeatLike);
    document.getElementById("mpLike")?.addEventListener("click",toggleBeatLike);
    document.addEventListener("trackChange", refreshLikeUI);
    document.addEventListener("trackChange", e => { const beat=e.detail; if(!beat) return; window.__CURRENT_BEAT__=normalizeBeat(beat); window.updateLicenceLikeUI?.(); loadGlobalLikeCount?.(beat.id); });
    document.addEventListener("playerPlay", refreshLikeUI); window.addEventListener("storage", refreshLikeUI);
    setTimeout(refreshLikeUI,100);
    window.refreshLikeUI=refreshLikeUI; window.refreshMobileHeart=refreshMobileHeart; window.toggleBeatLike=toggleBeatLike;
});

document.addEventListener("click", async (e) => {
  const moreBtn = e.target.closest("#mpMore, #gpMore"); if(!moreBtn) return; e.stopPropagation();
  const beat = window.__CURRENT_BEAT__; if (!beat) return; const nb=normalizeBeat(beat);
  const old = document.getElementById("playerMorePanel"); if (old) { old.remove(); return; }
  const mode=getMode(nb);
  const panel = document.createElement("div"); panel.id = "playerMorePanel";
  panel.innerHTML = `
    <div class="more-panel-header"><img src="${nb.cover_url || 'images/logo.png'}" /><div class="more-panel-info"><div class="more-title">${nb.title || nb.name}</div><div class="more-artist">${nb.artist || 'Dope Tone'} • ${mode==='free'?'<span style="color:#3b82f6;font-weight:800">FREE</span>':`$${nb.price||29.99}`}</div></div><button class="more-close">✕</button></div>
    <div class="more-panel-actions">
      <button class="more-item" data-action="playlist"><span>🎵</span> Create Playlist</button>
      <button class="more-item" data-action="add_playlist"><span>➕</span> Add To Playlist</button>
      <button class="more-item" data-action="dopetone_cart"><span>🛒</span> ${mode==='free'?'Free Download':'Add To Cart'}</button>
      <button class="more-item" data-action="download"><span>⬇</span> Free Download</button>
      <button class="more-item" data-action="share"><span>🔗</span> Share</button>
      <button class="more-item buy" data-action="buy"><span>💳</span> ${mode==='free'?'Download Now':'Buy Now'}</button>
      ${localStorage.getItem("isOwner")==="true"? `<button class="more-item delete" data-action="delete"><span>🗑</span> Delete Beat</button>` : ""}
    </div>`;
  document.body.appendChild(panel); requestAnimationFrame(()=>panel.classList.add("active"));
  panel.querySelector(".more-close").onclick = () => { panel.classList.remove("active"); setTimeout(()=>panel.remove(),250); };
  setTimeout(()=>{ document.addEventListener("click", function closeOutside(ev){ if(!panel.contains(ev.target) &&!ev.target.closest("#mpMore, #gpMore")){ panel.classList.remove("active"); setTimeout(()=>panel.remove(),250); document.removeEventListener("click", closeOutside); } }); },50);
  panel.querySelectorAll(".more-item").forEach(btn => {
    btn.onclick = async () => {
      const action = btn.dataset.action;
      if(action==="playlist" && window.openPlaylistModal) window.openPlaylistModal(nb);
      if(action==="add_playlist" && window.openAddToPlaylistModal) window.openAddToPlaylistModal(nb);
      if(action==="dopetone_cart"){
        if(handleBuy(nb)){ showCartToast(nb.title||nb.name+" Downloaded"); }
        else {
          let cart=JSON.parse(localStorage.getItem("dopetone_cart"))||[]; if(!cart.find(i=>i.id===nb.id)){cart.push(nb); localStorage.setItem("dopetone_cart",JSON.stringify(cart));
            const userKey=getUserKeyForStats(); fetch(`${STATS_API}/api/stats/event`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({beatId:parseInt(nb.id),eventType:'cart',user_id:userKey})}).catch(()=>{}); }
          window.renderCartBeatRow?.(); window.checkEmptyState?.(); window.updateCartCount?.(); showCartToast(nb.title||nb.name);
        }
      }
      if(action==="download"){ const link=document.createElement("a"); link.href=nb.mp3_url||nb.audio; link.download=(nb.title||nb.name)+".mp3"; document.body.appendChild(link); link.click(); link.remove(); }
      if(action==="share" && navigator.share) await navigator.share({title:nb.title||nb.name,url:location.href});
      if(action==="buy"){ if(mode==='free') handleBuy(nb); else window.location.href=`licence-page.html?id=${nb.id}`; }
      panel.classList.remove("active"); setTimeout(()=>panel.remove(),250);
    };
  });
});

function showCartToast(text){
  let toast=document.getElementById("cartToast"); if(!toast){ toast=document.createElement("div"); toast.id="cartToast"; document.body.appendChild(toast); }
  toast.textContent=text; toast.classList.add("active"); clearTimeout(toast.__timer); toast.__timer=setTimeout(()=>toast.classList.remove("active"),2200);
}
