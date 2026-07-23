// dt-vault-render.js - YOUR PLAYLISTS FINAL PRO - SPOTIFY/BEATSTARS LEVEL
import { getVaultPlaylists } from "./dt-vault-storage.js";

const PLAY_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg>`;
const PAUSE_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
const HEART_SVG = `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
const MORE_SVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`;
const DOLLAR_SVG = `<span style="font-weight:900;font-size:15px;line-height:1">$</span>`;
const DOWNLOAD_SVG = `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`;

const getMode = (b) => {
  if (!b) return 'paid';
  let m = (b.monetization_mode || b.monetizationMode || '').toLowerCase().trim();
  if (['free','hybrid','paid'].includes(m)) return m;
  if (m.includes('tagged')) return 'hybrid';
  if (b.is_free == 1 || b.is_free === true) return 'free';
  if (b.has_free_tagged == 1) return 'hybrid';
  return 'paid';
};
const getPriceHTML = (b) => {
  const mode = getMode(b);
  if (mode === 'free') return `<span style="background:linear-gradient(90deg,#4da6ff,#fff,#ff4d94);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:800;font-size:11px;">FREE</span>`;
  return `<span style="color:#00eaff;font-weight:800;font-size:11px;">$${b.price||'29.99'}</span>`;
};

let waveCache = new Map(); // bulletproof - never clear on remove
let active=[]; let beatMap=new Map(); let playlistMap=new Map(); let obs=null;
let currentPlayingPlaylistId=null;
let isGlobalPlaying=false;

// --- CSS FINAL PRO ---
(function injectProCSS(){
  if(document.getElementById('vault-pro-final')) return;
  const s=document.createElement('style');
  s.id='vault-pro-final';
  s.textContent=`
    #homepagePlaylists{ width:100%; padding:0 16px 120px 16px; box-sizing:border-box; }
   .your-playlists-head{ display:flex; align-items:center; gap:10px; margin:10px 0 6px 2px; }
   .your-playlists-head.drop{ width:18px; height:18px; background:#00f0ff; border-radius:50% 50% 50% 0; transform:rotate(-45deg); box-shadow:0 0 10px rgba(0,240,255,.6); flex-shrink:0; }
   .your-playlists-title{ font-family:'Orbitron',sans-serif; font-size:18px; font-weight:800; color:#e9ecff; letter-spacing:1.5px; text-transform:capitalize; }
   .your-playlists-line{ width:170px; height:2px; background:linear-gradient(90deg,#4da6ff,#ff4d94); margin:0 0 18px 30px; border-radius:2px; box-shadow:0 0 8px rgba(77,166,255,.5); }

   .playlists-wrap{ display:flex; flex-direction:column; gap:18px; }
   .playlists-wrap.is-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(100%,1fr)); gap:16px; }
    @media(min-width:900px){.playlists-wrap.is-grid{ grid-template-columns:repeat(2,1fr); } }

   .playlist-block{ background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:14px; overflow:visible !important; display:flex; flex-direction:column; position:relative; z-index:1; }
   .playlist-block:has(.hamburger-menu.open){ z-index:100 !important; }
   .playlist-block-header{ display:flex; align-items:center; justify-content:space-between; padding:10px 12px; background:rgba(255,255,255,0.03); border-bottom:1px solid rgba(255,255,255,0.05); border-radius:14px 14px 0 0; }
   .playlist-block-left{ display:flex; align-items:center; gap:10px; }
   .universal-play{ width:36px; height:36px; border-radius:50%; border:none; background:linear-gradient(135deg,#0066ff,#00f0ff); color:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 0 12px rgba(0,240,255,.5); transition:.2s; flex-shrink:0; }
   .universal-play:hover{ transform:scale(1.08); }
   .universal-play.playing{ background:linear-gradient(135deg,#ff4d6d,#ff8a00); box-shadow:0 0 12px rgba(255,77,109,.5); }
   .playlist-block-title{ font-family:'Orbitron'; font-size:11px; font-weight:800; color:#a5b4ff; letter-spacing:1.2px; text-transform:uppercase; }

   .playlist-hamburger{ position:relative; z-index:5; }
   .hamburger-btn{ width:32px; height:32px; border-radius:8px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.05); color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; }
   .hamburger-btn:hover{ background:#fff; color:#000; }
   .hamburger-menu{ position:absolute; right:0; top:42px; min-width:200px; background:#0f172a; border:1px solid #1e293b; border-radius:12px; padding:6px; z-index:9999; display:none; box-shadow:0 12px 40px rgba(0,0,0,.8); }
   .hamburger-menu.open{ display:block; animation:hamPop .2s ease; }
   @keyframes hamPop{ from{ opacity:0; transform:translateY(-6px) scale(.96); } to{ opacity:1; transform:translateY(0) scale(1); } }
   .h-menu-item{ width:100%; padding:10px 12px; border:none; background:transparent; color:#e9ecff; font-size:13px; text-align:left; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:8px; }
   .h-menu-item:hover{ background:rgba(255,255,255,0.08); }
   .h-menu-item.danger{ color:#ff4d6d; }

   .vault-wave-list{ display:flex; flex-direction:column; gap:8px; padding:10px 8px; max-height:408px; overflow-y:auto!important; overflow-x:hidden; scrollbar-width:none; -ms-overflow-style:none; scroll-behavior:smooth; border-radius:0 0 14px 14px; }
   .vault-wave-list::-webkit-scrollbar{ display:none!important; width:0!important; }

   .vault-wave-row{ display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.06); cursor:pointer; transition:.18s; position:relative; }
   .vault-wave-row:hover{ background:rgba(255,255,255,0.07); border-color:rgba(0,240,255,0.18); transform:translateY(-1px); }
   .vault-wave-row.active{ background:linear-gradient(90deg,rgba(0,102,255,0.14),rgba(0,240,255,0.07)); border-color:rgba(0,240,255,0.35); }

   .wave-left{ flex:0 0 42px; display:flex; align-items:center; justify-content:center; }
   .wave-cover-wrap{ position:relative!important; width:42px!important; height:42px!important; min-width:42px!important; min-height:42px!important; border-radius:6px!important; overflow:hidden!important; background:#0e1220!important; display:flex!important; align-items:center!important; justify-content:center!important; }
   .wave-cover-wrap img{ position:absolute!important; inset:0!important; width:100%!important; height:100%!important; object-fit:cover!important; object-position:center!important; display:block!important; }
   .wave-play{ position:absolute!important; top:50%!important; left:50%!important; transform:translate(-50%,-50%)!important; width:42px!important; height:42px!important; border-radius:6px!important; border:1px solid rgba(255,255,255,0.12)!important; background:rgba(0,0,0,0.55)!important; backdrop-filter:blur(6px)!important; color:#fff!important; display:flex!important; align-items:center!important; justify-content:center!important; z-index:2!important; opacity:0!important; transition:.2s ease!important; cursor:pointer; }
   .vault-wave-row:hover .wave-play,.vault-wave-row.active .wave-play{ opacity:1!important; }
   .wave-play svg{ width:16px!important; height:16px!important; fill:#fff!important; }

   .wave-info{ flex:0 0 115px; min-width:0; margin-right:4px; }
   .wave-title{ font-size:13px; font-weight:700; color:#e9ecff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
   .wave-meta{ font-size:10px; color:rgba(233,236,255,0.5); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px; }
   .wave-bar{ flex:1; min-width:60px; height:36px; display:block!important; opacity:1!important; margin-left:2px; }
   .wave-bar canvas{ width:100%!important; height:36px!important; display:block!important; filter:brightness(1.15); }
   .wave-actions{ display:flex; align-items:center; gap:8px; flex-shrink:0; margin-left:auto; }

   .premium-remove{ width:26px; height:26px; border-radius:50%; border:1px solid rgba(255,255,255,0.08); background:rgba(0,0,0,0.4); backdrop-filter:blur(8px); color:rgba(255,255,255,0.7); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:.2s; font-size:12px; font-weight:600; flex-shrink:0; }
   .premium-remove:hover{ background:rgba(255,77,109,0.15); border-color:rgba(255,77,109,0.3); color:#ff4d6d; transform:scale(1.1); }
   .premium-remove.heart{ background:rgba(255,77,109,0.12); border-color:rgba(255,77,109,0.25); color:#ff4d6d; }
   .premium-remove.heart:hover{ background:#ff4d6d; color:#fff; }

   /* ONLY FOOTER FADE - FIXED NO WHOLE PAGE */
   body:has(#addTracksModal.open) footer.dt-footer,
   body:has(.hamburger-menu.open) footer.dt-footer {
     opacity:0.18 !important;
     filter:blur(12px) brightness(0.7) !important;
     pointer-events:none !important;
     transition: all .35s ease !important;
   }
  `;
  document.head.appendChild(s);
})();



function ensureWave(row, beat){
  if(!row || waveCache.has(String(beat.id))) return;
  const cont=row.querySelector(`#vault-wave-${beat.id}`);
  if(!cont || cont.offsetWidth<20){ setTimeout(()=>ensureWave(row,beat),150); return; }
  row.dataset.waveInit='1';
  const mode=getMode(beat);
  let progress="#00f0ff", waveC="rgba(90,110,200,0.65)";
  if(mode==='free'){ const ctx=document.createElement('canvas').getContext('2d'); const g=ctx.createLinearGradient(0,0,300,0); g.addColorStop(0,"#4da6ff"); g.addColorStop(0.5,"#fff"); g.addColorStop(1,"#ff4d94"); progress=g; waveC="rgba(77,166,255,0.32)"; }
  if(mode==='hybrid'){ progress="#f59e0b"; waveC="rgba(245,158,11,0.35)"; }
  try{
    const WS=window.WaveSurfer?.default||window.WaveSurfer;
    if(!WS) return;
    const ws=WS.create({ container:cont, waveColor:waveC, progressColor:progress, cursorColor:"transparent", height:36, normalize:true, partialRender:true, fillParent:true, interact:true, dragToSeek:true, cursorWidth:0 });
    ws.load(beat.mp3_url||beat.audio||beat.url);
    row.__wave=ws; waveCache.set(String(beat.id), ws);
    ws.on('ready',()=>{ const isActive=row.classList.contains('active'); if(!isActive) ws.seekTo(0); });
    cont.addEventListener('click', (e)=>{ e.stopPropagation(); const d=ws.getDuration(); if(d){ const r=e.offsetX/cont.offsetWidth; window.globalPlayer?.seek(r*d); } });
  }catch(e){ row.dataset.waveInit='0'; }
}

export function renderVault(partial=false, removedId=null){
  const mount=document.getElementById('homepagePlaylists');
  if(!mount) return;

  if(partial && removedId){
    const row=mount.querySelector(`.vault-wave-row[data-beat-id="${removedId}"]`);
    if(row){
      const w=waveCache.get(String(removedId));
      if(w){ try{w.destroy()}catch{} waveCache.delete(String(removedId)); }
      row.style.transition='all.25s'; row.style.opacity='0'; row.style.transform='scale(.95)';
      setTimeout(()=>{ row.remove(); updateCounts(); },250);
    }
    return;
  }

  waveCache.forEach(w=>{ try{w.destroy()}catch{} }); waveCache.clear();
  if(obs) obs.disconnect();
  beatMap.clear(); active=[]; playlistMap.clear();

  let playlists=getVaultPlaylists().slice(0,8);
  const likedPl=playlists.find(p=>p.isLiked);
  const downloadedPl=playlists.find(p=>p.id==='dt_downloaded' || p.name.toLowerCase().includes('download'));
  const custom=playlists.filter(p=>!p.isLiked && p.id!=='dt_downloaded' &&!p.name.toLowerCase().includes('download'));

  let displayList=[];
  if(likedPl && likedPl.beats.length>0) displayList.push(likedPl);
  if(downloadedPl && downloadedPl.beats.length>0) displayList.push(downloadedPl);
  displayList=[...displayList,...custom];

  // HOME PAGE LIMIT TO 2
  const isHomepage = window.location.pathname === '/' || window.location.pathname.includes('index') || document.getElementById('homepagePlaylists');
  if(isHomepage) displayList = displayList.slice(0,2);

  if(!displayList.length){
    mount.innerHTML=`<div class="your-playlists-head"><div class="drop"></div><div class="your-playlists-title">Your Playlists</div></div><div class="your-playlists-line"></div><div style="text-align:center;padding:40px;color:#666;">No playlists yet</div>`;
    return;
  }

  displayList.forEach(pl=>{
    playlistMap.set(pl.id, pl.beats);
    pl.beats.forEach(b=>{ beatMap.set(String(b.id), b); if(!active.some(a=>String(a.id)===String(b.id))) active.push(b); });
  });

  const isGrid = displayList.length>1;
  let html=`<section class="featured-section" style="padding:0; margin-bottom:14px;">
  <div class="section-title-wrap" style="display:flex;align-items:center;justify-content:space-between;">
    <h2 class="section-title">💧 Your Playlists</h2>
    <button onclick="window.location.href='playlists.html'" style="height:32px;padding:0 14px;border-radius:20px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.06);color:#a5b4ff;font-family:'Orbitron';font-size:10px;font-weight:700;letter-spacing:1px;cursor:pointer;">VIEW ALL →</button>
  </div>
</section>`;

  html+=`<div class="playlists-wrap ${isGrid?'is-grid':''}">`;

  html+=displayList.map(pl=>{
    const isLiked=pl.isLiked;
    const isDown=pl.id==='dt_downloaded' || pl.name.toLowerCase().includes('download');
    const title=isLiked? `LIKED • ${pl.beats.length} TRACKS` : isDown? `DOWNLOADED • ${pl.beats.length}` : `${pl.name.toUpperCase()} • ${pl.beats.length}`;
    const canRename =!isLiked &&!isDown;
    const canDeletePlaylist =!isLiked; // downloaded can be deleted but comes back after download

    return `<div class="playlist-block" data-vault="${pl.id}">
      <div class="playlist-block-header">
        <div class="playlist-block-left">
          <button class="universal-play" data-pl="${pl.id}" onclick="window.togglePlayAll('${pl.id}')">${PLAY_SVG}</button>
          <div class="playlist-block-title">${title}</div>
        </div>
        <div class="playlist-hamburger">
          <button class="hamburger-btn" onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle('open')">${MORE_SVG}</button>
          <div class="hamburger-menu">
            <button class="h-menu-item" onclick="window.dispatchEvent(new CustomEvent('openAddTrack',{detail:{plId:'${pl.id}'}})); this.closest('.hamburger-menu').classList.remove('open')">+ Add Tracks</button>
            ${canRename? `<button class="h-menu-item" onclick="window.dispatchEvent(new CustomEvent('renamePlaylist',{detail:{plId:'${pl.id}'}})); this.closest('.hamburger-menu').classList.remove('open')">✎ Rename</button>` : ''}
                    <button class="h-menu-item" onclick="window.location.href='playlists.html?id=${pl.id}'; this.closest('.hamburger-menu').classList.remove('open')">📋 View All Playlist</button>

            ${canRename? `<button class="h-menu-item" onclick="window.dispatchEvent(new CustomEvent('renamePlaylist',{detail:{plId:'${pl.id}'}})); this.closest('.hamburger-menu').classList.remove('open')">✎ Rename</button>` : ''}
            ${canDeletePlaylist? `<button class="h-menu-item danger" onclick="window.deleteVaultPlaylist('${pl.id}'); this.closest('.hamburger-menu').classList.remove('open')">🗑 Delete Playlist</button>` : ''}
 </div>
        </div>
      </div>
      <div class="vault-wave-list">
        ${pl.beats.map(beat=>{
          const mode=getMode(beat);
          const price=getPriceHTML(beat);
          const removeBtn=isLiked
          ? `<button class="premium-remove heart" title="Unlike" onclick="event.stopPropagation(); window.unlikeInstant('${beat.id}')">${HEART_SVG}</button>`
            : `<button class="premium-remove" title="Remove" onclick="event.stopPropagation(); window.removeInstant('${pl.id}','${beat.id}')">✕</button>`;
          return `<div class="vault-wave-row" data-beat-id="${beat.id}" data-pl="${pl.id}">
            <div class="wave-left"><div class="wave-cover-wrap"><img src="${beat.cover_url||beat.cover||'images/logo.png'}"><button class="wave-play">${PLAY_SVG}</button></div></div>
            <div class="wave-info"><div class="wave-title">${beat.title||beat.name}</div><div class="wave-meta">${beat.key||'--'} • ${beat.genre||'--'} • ${beat.bpm||'--'}</div></div>
            <div class="wave-bar" id="vault-wave-${beat.id}"></div>
            <div class="wave-actions"><div class="wave-price">${price}</div><button class="wave-download" style="width:28px;height:28px;border-radius:7px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.06);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;">${mode==='paid'?DOLLAR_SVG:DOWNLOAD_SVG}</button>${removeBtn}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('')+`</div>`;

  mount.innerHTML=html;

  // Close hamburger when click outside
  document.addEventListener('click',(e)=>{
    if(!e.target.closest('.playlist-hamburger')){
      document.querySelectorAll('.hamburger-menu.open').forEach(m=>m.classList.remove('open'));
    }
  });

  // PLAY LOGIC - DOES NOT INTERRUPT WAVESURFER, ONLY GLOBAL PLAYER
  mount.querySelectorAll('.vault-wave-row').forEach(row=>{
    const beat=beatMap.get(String(row.dataset.beatId));
    if(!beat) return;
    const playBtn=row.querySelector('.wave-play');
    const doPlay=(e)=>{
      e.stopPropagation();
      ensureWave(row,beat);
      const idx=active.findIndex(x=>String(x.id)===String(beat.id));
      currentPlayingPlaylistId=row.dataset.pl;
      window.globalPlayer?.play(idx>=0?idx:0, active, "vault");
    };
    if(playBtn) playBtn.onclick=doPlay;
    row.addEventListener('mouseenter',()=>{ if(playBtn) playBtn.style.opacity='1'; });
    row.addEventListener('mouseleave',()=>{ if(!row.classList.contains('active') && playBtn) playBtn.style.opacity='0'; });
    row.onclick=(e)=>{
      if(e.target.closest('.wave-actions')||e.target.closest('.premium-remove')||e.target.closest('.hamburger-menu')) return;
      doPlay(e);
    };
  });

  obs=new IntersectionObserver((entries)=>{
    entries.forEach(en=>{
      if(en.isIntersecting){
        const b=beatMap.get(String(en.target.dataset.beatId));
        if(b) ensureWave(en.target,b);
        obs.unobserve(en.target);
      }
    });
  },{rootMargin:"500px 0px"});
  mount.querySelectorAll('.vault-wave-row').forEach(r=>obs.observe(r));

  // SYNC - PRO LEVEL - NO INTERRUPT
  document.removeEventListener("playerPlay", window.__vaultPlaySync__);
  document.removeEventListener("playerPause", window.__vaultPauseSync__);
  window.__vaultPauseSync__=()=>{
    isGlobalPlaying=false;
    mount.querySelectorAll(".vault-wave-row").forEach(r=>{ r.classList.remove('active'); const b=r.querySelector('.wave-play'); if(b){ b.innerHTML=PLAY_SVG; b.style.opacity='0'; } });
    mount.querySelectorAll(".universal-play").forEach(b=>{ b.innerHTML=PLAY_SVG; b.classList.remove('playing'); });
  };
  document.addEventListener("playerPause", window.__vaultPauseSync__);
   window.__vaultPlaySync__=(e)=>{
    const {index,listId}=e.detail; if(listId!=="vault") return;
    isGlobalPlaying=true;
    const cur=active[index]; if(!cur) return;
    // current playlist from row that was clicked
    const clickedRow = mount.querySelector(`.vault-wave-row[data-beat-id="${cur.id}"][data-pl="${currentPlayingPlaylistId}"]`) || mount.querySelector(`.vault-wave-row[data-beat-id="${cur.id}"]`);
    if(clickedRow && !currentPlayingPlaylistId) currentPlayingPlaylistId = clickedRow.dataset.pl;
    
    // ONLY highlight in current playing playlist - NO CROSS CONNECTION
    mount.querySelectorAll(".vault-wave-row").forEach(row=>{
      const is=String(row.dataset.beatId)===String(cur.id) && String(row.dataset.pl)===String(currentPlayingPlaylistId);
      row.classList.toggle('active',is);
      const btn=row.querySelector(".wave-play");
      if(btn){ btn.innerHTML=is?PAUSE_SVG:PLAY_SVG; btn.style.opacity=is?'1':'0'; }
      if(is) ensureWave(row,cur);
    });

    // Universal buttons - only current playlist shows pause
    mount.querySelectorAll(".universal-play").forEach(btn=>{
      const plId=btn.dataset.pl;
      const isCurrent = plId===currentPlayingPlaylistId;
      btn.innerHTML=isCurrent && isGlobalPlaying?PAUSE_SVG:PLAY_SVG;
      btn.classList.toggle('playing',isCurrent && isGlobalPlaying);
    });
  };

  document.addEventListener("playerPlay", window.__vaultPlaySync__);

  document.removeEventListener("playerTimeUpdate", window.__vaultTimeSync__);
  window.__vaultTimeSync__=(e)=>{
    const {index,percent,listId}=e.detail; if(listId!=="vault") return;
    const cur=active[index]; if(!cur) return;
    mount.querySelectorAll('.vault-wave-row').forEach(row=>{
      const w=row.__wave; if(!w) return;
      if(String(row.dataset.beatId)===String(cur.id)) w.seekTo(percent);
    });
  };
  document.addEventListener("playerTimeUpdate", window.__vaultTimeSync__);
}

function updateCounts(){
  const mount=document.getElementById('homepagePlaylists');
  mount.querySelectorAll('.playlist-block').forEach(card=>{
    const rows=card.querySelectorAll('.vault-wave-row').length;
    const titleEl=card.querySelector('.playlist-block-title');
    if(titleEl && rows===0){
      card.style.transition='all.3s'; card.style.opacity='0'; card.style.transform='scale(.95)';
      setTimeout(()=>{ card.remove(); if(!mount.querySelector('.playlist-block')) renderVault(false); },300);
    }else if(titleEl){
      const base=titleEl.textContent.split('•')[0].trim();
      titleEl.textContent=`${base} • ${rows} ${rows===1?'TRACK':'TRACKS'}`;
    }
  });
}

window.unlikeInstant=(beatId)=>{
  let liked=JSON.parse(localStorage.getItem('dt_liked_v1')||'[]').filter(id=>String(id)!==String(beatId));
  localStorage.setItem('dt_liked_v1', JSON.stringify(liked));
  localStorage.setItem('dt_liked_ids', JSON.stringify(liked));

  const row = document.querySelector(`.vault-wave-row[data-beat-id="${beatId}"]`);
  if(row){
    const block = row.closest('.playlist-block');
    const w=waveCache.get(String(beatId));
    if(w){ try{w.destroy()}catch{} waveCache.delete(String(beatId)); }
    row.style.transition='all.25s'; row.style.opacity='0'; row.style.transform='scale(.95)';
    setTimeout(()=>{
      row.remove();
      if(block){
        const count = block.querySelectorAll('.vault-wave-row').length;
        const titleEl = block.querySelector('.playlist-block-title');
        if(titleEl){
          const base = titleEl.textContent.split('•')[0].trim();
          titleEl.textContent = `${base} • ${count} TRACKS`;
        }
        if(count===0){
          block.style.opacity='0'; setTimeout(()=>block.remove(),300);
        }
      }
      if(window.loadPlaylistById && window.__CURRENT_PLAYLIST_ID__){
        window.loadPlaylistById(window.__CURRENT_PLAYLIST_ID__);
      }
    },250);
  }
  window.dispatchEvent(new Event('dt_vault_updated'));
};

window.removeInstant=(plId,beatId)=>{
  let pls=JSON.parse(localStorage.getItem('dt_vault_v1')||'[]');
  const pl=pls.find(p=>p.id===plId);
  if(pl){
    pl.beats=(pl.beats||[]).filter(b=>String(b.id)!==String(beatId));
    localStorage.setItem('dt_vault_v1', JSON.stringify(pls));
  }

  const row = document.querySelector(`.playlist-block[data-vault="${plId}"].vault-wave-row[data-beat-id="${beatId}"]`) || document.querySelector(`.vault-wave-row[data-beat-id="${beatId}"]`);
  if(row){
    const block = row.closest('.playlist-block');
    const w=waveCache.get(String(beatId));
    if(w){ try{w.destroy()}catch{} waveCache.delete(String(beatId)); }
    beatMap.delete(String(beatId));
    active = active.filter(a=>String(a.id)!==String(beatId));

    row.style.transition='all.25s'; row.style.opacity='0'; row.style.transform='scale(.95)';
    setTimeout(()=>{
      row.remove();
      if(block){
        const count = block.querySelectorAll('.vault-wave-row').length;
        const titleEl = block.querySelector('.playlist-block-title');
        if(titleEl){
          const base = titleEl.textContent.split('•')[0].trim();
          titleEl.textContent = `${base} • ${count} ${count===1?'TRACK':'TRACKS'}`;
        }
        if(count===0){
          block.style.transition='all.3s'; block.style.opacity='0';
          setTimeout(()=>block.remove(),300);
        }
      }
      // refresh playlists.html if open
      if(window.loadPlaylistById){
        window.loadPlaylistById(plId);
      }
      if(window.renderPlaylistCapsulesOnly){
        window.renderPlaylistCapsulesOnly();
      }
    },250);
  }else{
    // fallback if row not in mini view
    if(window.loadPlaylistById) window.loadPlaylistById(plId);
    else renderVault(false);
  }
};

window.togglePlayAll=(plId)=>{
  const btn=document.querySelector(`.universal-play[data-pl="${plId}"]`);
  const beats=playlistMap.get(plId)||[];
  if(!beats.length) return;

  const isThisPlaylistPlaying = currentPlayingPlaylistId===plId && isGlobalPlaying;

  if(isThisPlaylistPlaying){
    window.globalPlayer?.pause();
    return;
  }

  // If same playlist paused - resume
  if(currentPlayingPlaylistId===plId && !isGlobalPlaying){
    window.globalPlayer?.resume?.() || window.globalPlayer?.play();
    return;
  }

  // New playlist - play it
  const firstId=beats[0].id;
  const idx=active.findIndex(b=>String(b.id)===String(firstId));
  currentPlayingPlaylistId=plId;
  window.globalPlayer?.play(idx>=0?idx:0, active, "vault");
};

window.deleteVaultPlaylist=(id)=>{
  if(!confirm('Delete this playlist?')) return;
  let pls=JSON.parse(localStorage.getItem('dt_vault_v1')||'[]').filter(p=>p.id!==id);
  localStorage.setItem('dt_vault_v1', JSON.stringify(pls));
  renderVault(false);
};

window.renderVault=renderVault;
document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>renderVault(false),600));
window.addEventListener('dt_vault_updated',()=>renderVault(false));
window.addEventListener('vaultUpdated',()=>renderVault(false));
window.addEventListener('playlistsUpdated',()=>renderVault(false));



// === ADD TRACKS MODAL - FIXED FOR PLAYLISTS PAGE ===
(function addTracksPro(){
  if(document.getElementById('addTracks-pro-css')) return;
  const css=document.createElement('style');
  css.id='addTracks-pro-css';
  css.textContent=`
    #addTracksModal{ position:fixed; inset:0; z-index:9999; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,0.75); backdrop-filter:blur(12px); }
    #addTracksModal.open{ display:flex; }
   .at-modal{ width:min(560px,92vw); max-height:84vh; background:#0f172a; border:1px solid rgba(0,240,255,0.18); border-radius:16px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 20px 60px rgba(0,0,0,0.7); animation:atPop .25s ease; }
    @keyframes atPop{ from{ transform:scale(.94) translateY(10px); opacity:0; } to{ transform:scale(1) translateY(0); opacity:1; } }
   .at-header{ padding:14px 16px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.06); }
   .at-header h3{ font-family:'Orbitron'; font-size:13px; color:#00f0ff; letter-spacing:1.2px; }
   .at-search{ margin:12px; display:flex; gap:8px; }
   .at-search input{ flex:1; height:38px; border-radius:10px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.05); color:#fff; padding:0 14px; outline:none; }
   .at-search input:focus{ border-color:rgba(0,240,255,0.4); }
   .at-list{ flex:1; overflow-y:auto; padding:0 8px 8px 8px; display:flex; flex-direction:column; gap:6px; scrollbar-width:none; }
   .at-list::-webkit-scrollbar{ display:none; }
   .at-row{ display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:10px; background:rgba(255,255,255,0.04); border:1px solid transparent; cursor:pointer; transition:.15s; }
   .at-row:hover{ background:rgba(255,255,255,0.06); border-color:rgba(255,255,255,0.08); }
   .at-row.selected{ background:rgba(0,240,255,0.08); border-color:rgba(0,240,255,0.25); }
   .at-check{ width:20px; height:20px; border-radius:6px; border:2px solid rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:.15s; }
   .at-row.selected .at-check{ background:#00f0ff; border-color:#00f0ff; color:#000; }
   .at-cover{ width:40px; height:40px; border-radius:6px; object-fit:cover; flex-shrink:0; }
   .at-info{ flex:1; min-width:0; }
   .at-title{ font-size:13px; font-weight:700; color:#e9ecff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
   .at-meta{ font-size:10px; color:rgba(255,255,255,0.45); }
   .at-footer{ padding:12px; border-top:1px solid rgba(255,255,255,0.06); display:flex; gap:10px; }
   .at-btn{ flex:1; height:40px; border-radius:10px; border:none; font-family:'Orbitron'; font-size:12px; font-weight:700; cursor:pointer; transition:.2s; }
   .at-cancel{ background:rgba(255,255,255,0.06); color:#aaa; }
   .at-add{ background:linear-gradient(135deg,#0066ff,#00f0ff); color:#fff; box-shadow:0 0 12px rgba(0,240,255,0.4); }
   .at-add:disabled{ opacity:.4; cursor:not-allowed; }
  `;
  document.head.appendChild(css);

  const modal=document.createElement('div');
  modal.id='addTracksModal';
  modal.innerHTML=`
    <div class="at-modal">
      <div class="at-header"><h3>ADD TRACKS TO PLAYLIST</h3><button onclick="window.closeAddTracks()" style="width:28px;height:28px;border-radius:50%;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.06);color:#fff;cursor:pointer;">✕</button></div>
      <div class="at-search" id="atSearchWrap"><input id="atSearch" placeholder="Search Guardian, Temperature..." oninput="window.filterAddTracks(this.value)"></div>
      <div class="at-list" id="atList"></div>
      <div class="at-footer" id="atFooter"><button class="at-btn at-cancel" onclick="window.closeAddTracks()">Cancel</button><button class="at-btn at-add" id="atAddBtn" onclick="window.confirmAddTracks()" disabled>Add 0 tracks</button></div>
    </div>
  `;
  document.body.appendChild(modal);

  let currentPlId=null; let selected=new Set(); let allBeatsCache=[];

  // FIXED: now loads beats on playlists.html too
  async function getAllBeats(){
    try{
      const c1=JSON.parse(localStorage.getItem('dt_beats_cache')||'[]');
      const c2=JSON.parse(localStorage.getItem('beats_cache')||'[]');
      const c3=JSON.parse(localStorage.getItem('dopetone_api_beats')||'[]');
      const c4=window.allBeats||window.beatsData||window.__beats||window.__ALL_BEATS__||[];
      let combined=[...c1,...c2,...c3,...c4];
      const map=new Map();
      combined.forEach(b=>{ if(b&&b.id) map.set(String(b.id), b); });
      let arr=Array.from(map.values());
      // If still empty (playlists.html), fetch from API - FIXES YOUR BUG
      if(arr.length < 5){
        try{
          const res = await fetch('https://api.dopetonevault.com/beats');
          if(res.ok){
            const apiBeats = await res.json();
            apiBeats.forEach(b=>{ if(!map.has(String(b.id))) map.set(String(b.id), b); });
            arr = Array.from(map.values());
            localStorage.setItem('dopetone_api_beats', JSON.stringify(arr));
          }
        }catch(e){}
      }
      return arr;
    }catch{ return window.allBeats||[]; }
  }

  window.openAddTracks= async(plId)=>{
    currentPlId=plId; selected.clear();
    allBeatsCache = await getAllBeats();
    const vault = getVaultPlaylists();
    const pl = vault.find(p=>p.id===plId);
    const isLiked = pl?.isLiked;
    const isDown = plId==='dt_downloaded' || pl?.name?.toLowerCase().includes('download');
    const list=document.getElementById('atList');
    const searchWrap=document.getElementById('atSearchWrap');
    const footer=document.getElementById('atFooter');
    if(isLiked){
      searchWrap.style.display='none'; footer.style.display='none';
      list.innerHTML=`<div style="padding:44px 20px; text-align:center;"><div style="font-size:46px; margin-bottom:14px;">❤️</div><div style="font-family:'Orbitron'; font-size:14px; font-weight:800; color:#ff4d6d; letter-spacing:1px; margin-bottom:10px;">LIKED PLAYLIST</div><div style="font-size:15px; color:#e9ecff; line-height:1.6;">Like more tracks to add beats here 😊<br><span style="color:#888; font-size:12px;">Go to All Beats and hit the heart to add</span></div><button onclick="window.closeAddTracks(); window.location.href='beats.html'" style="margin-top:20px; height:40px; padding:0 20px; border-radius:20px; border:none; background:linear-gradient(135deg,#ff4d6d,#ff8a00); color:#fff; font-weight:700; cursor:pointer;">Browse Beats →</button></div>`;
modal.classList.add('open'); 
  document.body.style.overflow='hidden'; // lock scroll
  return;
    }
    if(isDown){
      searchWrap.style.display='none'; footer.style.display='none';
      list.innerHTML=`<div style="padding:44px 20px; text-align:center;"><div style="font-size:46px; margin-bottom:14px;">⬇️</div><div style="font-family:'Orbitron'; font-size:14px; font-weight:800; color:#f59e0b; letter-spacing:1px; margin-bottom:10px;">DOWNLOADED</div><div style="font-size:15px; color:#e9ecff; line-height:1.6;">You can't add manually<br><span style="color:#888; font-size:12px;">Download tracks first and they will appear here automatically</span></div><button onclick="window.closeAddTracks();" style="margin-top:20px; height:40px; padding:0 20px; border-radius:20px; border:none; background:rgba(255,255,255,0.08); color:#fff; font-weight:700; cursor:pointer;">Close</button></div>`;
      modal.classList.add('open'); return;
    }
    searchWrap.style.display='flex'; footer.style.display='flex';
    const plBeats = (pl?.beats||[]).map(b=>String(b.id));
    const available = allBeatsCache.filter(b=>!plBeats.includes(String(b.id)));
    renderList(available);
    modal.classList.add('open');
    document.getElementById('atSearch').value='';
    setTimeout(()=>document.getElementById('atSearch').focus(),100);
  };

  function renderList(beats){
    const list=document.getElementById('atList');
    if(!beats.length){ list.innerHTML=`<div style="padding:30px;text-align:center;color:#666;font-size:13px;">No beats left to add<br><span style="font-size:11px">All beats already in playlist</span></div>`; return; }
    list.innerHTML=beats.map(b=>`<div class="at-row" data-id="${b.id}" onclick="window.toggleAtRow('${b.id}')"><div class="at-check">${selected.has(String(b.id))?'✓':''}</div><img class="at-cover" src="${b.cover_url||b.cover||'images/logo.png'}"><div class="at-info"><div class="at-title">${b.title||b.name}</div><div class="at-meta">${b.key||'--'} • ${b.genre||'--'} • ${b.bpm||'--'}</div></div></div>`).join('');
    updateBtn();
  }

  window.toggleAtRow=(id)=>{
    const sid=String(id);
    if(selected.has(sid)) selected.delete(sid); else selected.add(sid);
    const row=document.querySelector(`.at-row[data-id="${id}"]`);
    if(row){ row.classList.toggle('selected', selected.has(sid)); row.querySelector('.at-check').innerHTML=selected.has(sid)?'✓':''; }
    updateBtn();
  };

  window.filterAddTracks=(q)=>{
    const filtered=allBeatsCache.filter(b=>{
      const s=((b.title||b.name||'') + ' ' + (b.genre||'') + ' ' + (b.key||'')).toLowerCase();
      return s.includes(q.toLowerCase());
    });
    const plBeats = (getVaultPlaylists().find(p=>p.id===currentPlId)?.beats||[]).map(b=>String(b.id));
    renderList(filtered.filter(b=>!plBeats.includes(String(b.id))));
    selected.forEach(id=>{
      const r=document.querySelector(`.at-row[data-id="${id}"]`);
      if(r){ r.classList.add('selected'); r.querySelector('.at-check').innerHTML='✓'; }
    });
  };

  function updateBtn(){
    const btn=document.getElementById('atAddBtn');
    if(!btn) return;
    btn.textContent=`Add ${selected.size} track${selected.size!==1?'s':''}`;
    btn.disabled=selected.size===0;
  }

  window.confirmAddTracks=()=>{
    if(!currentPlId || selected.size===0) return;
    const beatsToAdd = allBeatsCache.filter(b=>selected.has(String(b.id)));
    let vault=JSON.parse(localStorage.getItem('dt_vault_v1')||'[]');
    const pl=vault.find(p=>p.id===currentPlId);
    if(pl){
      beatsToAdd.forEach(b=>{ if(!pl.beats.some(x=>String(x.id)===String(b.id))) pl.beats.push(b); });
      localStorage.setItem('dt_vault_v1', JSON.stringify(vault));
      window.closeAddTracks();
      window.renderVault(false);
      window.dispatchEvent(new Event('dt_vault_updated'));
      window.dispatchEvent(new Event('playlistsUpdated'));
      if(window.loadPlaylistById) window.loadPlaylistById(currentPlId);
    }
  };


window.closeAddTracks=()=>{ 
  modal.classList.remove('open'); 
  document.body.style.overflow=''; 
  selected.clear(); 
  currentPlId=null; 
};
  modal.addEventListener('click',(e)=>{ if(e.target.id==='addTracksModal') window.closeAddTracks(); });
  window.addEventListener('openAddTrack',(e)=>{ window.openAddTracks(e.detail.plId); });

  // === ADD TRACK BTN FIX - TOOLBAR ===
  function getToolbarId(){
    const p=new URLSearchParams(window.location.search);
    let id=p.get('id')||window.__CURRENT_PLAYLIST_ID__;
    if(id==='liked_playlist'){
      const v=getVaultPlaylists(); const l=v.find(x=>x.isLiked); return l?l.id:null;
    }
    return id;
  }
  const bindToolbarBtns=()=>{
    const topBtn=document.getElementById('addTrackToCurrentBtn');
    if(topBtn && !topBtn.dataset.fixed){
      topBtn.dataset.fixed='1';
      topBtn.onclick=(e)=>{
        e.stopPropagation();
        const tid=getToolbarId();
        if(!tid){ alert('Open a playlist first'); return; }
        window.openAddTracks(tid);
      };
    }
  };
  document.addEventListener('DOMContentLoaded', bindToolbarBtns);
  setInterval(bindToolbarBtns, 1000);
})();

// Keep your capsules function same
export function renderPlaylistCapsulesOnly(){
  const container = document.getElementById("playlistCapsules");
  if(!container) return;
  const playlists = getVaultPlaylists();
  const urlParams = new URLSearchParams(window.location.search);
  const activeId = urlParams.get("id") || "dt_liked_playlist";
  const visible = playlists.filter(p => p.beats && p.beats.length >= 0);
  container.innerHTML = visible.map(pl => {
    const isLiked = pl.isLiked;
    const name = isLiked ? "Liked" : pl.name;
    const isActive = pl.id === activeId || (isLiked && activeId === "liked_playlist");
    return `<button class="playlist-capsule ${isActive ? 'active' : ''}" data-id="${pl.id}">${name} <span style="opacity:.5;font-size:10px">${pl.beats.length}</span></button>`;
  }).join('');
}
window.renderPlaylistCapsulesOnly = renderPlaylistCapsulesOnly;
