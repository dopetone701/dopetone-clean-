// ===============================
// DT VAULT MODAL - RESPECTS WORKING WAVE.JS - NO WAVE.JS EDIT NEEDED
// Just drop this file, it auto-replaces window.openAddToPlaylistModal
// ===============================
import { getVaultPlaylists, createVaultPlaylist, addBeatToVault } from "./dt-vault-storage.js"

const getMode = (b) => {
  if (!b) return 'paid';
  let m = (b.monetization_mode || b.monetizationMode || '').toLowerCase().trim();
  if (['free','hybrid','paid'].includes(m)) return m;
  if (m.includes('tagged')) return 'hybrid';
  if (b.is_free == 1 || b.is_free === true) return 'free';
  if (b.has_free_tagged == 1) return 'hybrid';
  return 'paid';
};
function normalizeBeat(b){
  if(!b) return null;
  return {...b, id:String(b.id), title:b.title||"Untitled", cover:b.cover||b.cover_url||"images/logo.png", cover_url:b.cover_url||b.cover||"images/logo.png", audio:b.audio||b.mp3_url, mp3_url:b.mp3_url||b.audio, bpm:b.bpm||140, key:b.key||"--", genre:b.genre||"Trap", price:b.price??29.99};
}
function toast(text=""){
  let t=document.getElementById("playlistToast");
  if(!t){ t=document.createElement("div"); t.id="playlistToast"; t.style.cssText="position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#111;color:#fff;padding:10px 18px;border-radius:10px;font-size:13px;z-index:9999;opacity:0;transition:.25s;pointer-events:none"; document.body.appendChild(t); }
  t.textContent=text; t.style.opacity="1"; clearTimeout(t.__timer); t.__timer=setTimeout(()=>t.style.opacity="0",2200);
}

function openVaultModalImpl(){
  const old=document.getElementById("playlistModal"); if(old) old.remove();
  const modal=document.createElement("div"); modal.id="playlistModal";
  modal.innerHTML=`
  <div class="playlist-modal-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(8px);z-index:100"></div>
  <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:90%;max-width:380px;background:linear-gradient(145deg,#12121a,#0a0a12);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:20px;z-index:101">
    <div style="display:flex;justify-content:space-between;margin-bottom:8px"><h2 style="color:#fff;font-size:20px;font-weight:800;margin:0">Create Playlist</h2><span class="plClose" style="width:32px;height:32px;background:rgba(255,255,255,.06);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff">✕</span></div>
    <p style="color:#666;font-size:12px;margin:0 0 14px">Build your sound arsenal</p>
    <input id="playlistNameInput" type="text" maxlength="24" placeholder="Night Drive, Dark Rage..." style="width:100%;height:42px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#fff;padding:0 14px;outline:none" />
    <button id="createPlaylistBtn" style="width:100%;margin-top:12px;height:44px;background:linear-gradient(90deg,#ff3c3c,#ff7a00);border:none;border-radius:12px;color:#fff;font-weight:800;cursor:pointer">Create Playlist</button>
    <div id="playlistError" style="color:#ff3c3c;font-size:12px;margin-top:8px;display:none"></div>
  </div>`;
  document.body.appendChild(modal);
  const input=modal.querySelector("#playlistNameInput");
  modal.querySelector(".playlist-modal-backdrop").onclick=()=>modal.remove();
  modal.querySelector(".plClose").onclick=()=>modal.remove();
  modal.querySelector("#createPlaylistBtn").onclick=()=>{
    const name=input.value.trim(); if(!name){ const e=modal.querySelector("#playlistError"); e.textContent="Enter playlist name"; e.style.display="block"; return; }
    const res=createVaultPlaylist(name);
    if(!res.ok){ const e=modal.querySelector("#playlistError"); e.textContent=res.message; e.style.display="block"; return; }
    if(window.__PENDING_VAULT_BEAT__){ addBeatToVault(res.playlist.id, normalizeBeat(window.__PENDING_VAULT_BEAT__)); window.__PENDING_VAULT_BEAT__=null; }
    modal.remove(); toast(`Playlist "${name}" created`);
  };
  setTimeout(()=>input.focus(),100);
}

function openAddToVaultModalImpl(beat){
  const old=document.getElementById("playlistModal"); if(old) old.remove();
  const safe=normalizeBeat(beat); if(!safe) return;
  const mode=getMode(safe);
  const playlists=getVaultPlaylists().filter(p=>!p.isLiked);

  const modal=document.createElement("div"); modal.id="playlistModal";
  modal.innerHTML=`
  <div class="playlist-modal-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(10px);z-index:100"></div>
  <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:92%;max-width:440px;background:linear-gradient(145deg,#12121a,#0a0a12);border:1px solid rgba(255,255,255,.1);border-radius:22px;padding:18px;z-index:101;max-height:85vh;overflow:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><h2 style="color:#fff;font-size:18px;font-weight:800;margin:0">Add To Playlist</h2><span class="plClose2" style="width:32px;height:32px;background:rgba(255,255,255,.06);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff">✕</span></div>
    <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:14px;margin-bottom:16px">
      <div style="width:44px;height:44px;border-radius:8px;overflow:hidden;flex-shrink:0;background:#0f172a"><img src="${safe.cover_url}" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.src='images/logo.png'" /></div>
      <div style="flex:1;min-width:0"><div style="color:#fff;font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${safe.title}</div><div style="color:rgba(255,255,255,.5);font-size:10px;margin-top:2px">${safe.key} • ${safe.genre} • ${safe.bpm} BPM ${mode==='free'? ' • FREE':''}</div></div>
      <div style="font-size:11px;font-weight:800;color:${mode==='free'?'#fff':'#00f0ff'}">${mode==='free'?'FREE':`$${Number(safe.price||29.99).toFixed(2)}`}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto">
      ${playlists.length? playlists.map(pl=>{
        const exists=pl.beats.find(b=>String(b.id)===String(safe.id));
        return `<button class="pl-pick" data-id="${pl.id}" style="display:flex;align-items:center;gap:12px;padding:12px;background:${exists?'rgba(255,60,60,.08)':'rgba(255,255,255,.04)'};border:1px solid ${exists?'rgba(255,60,60,.2)':'rgba(255,255,255,.06)'};border-radius:14px;cursor:pointer;text-align:left;width:100%"><div style="width:36px;height:36px;background:${exists?'linear-gradient(135deg,#ff3c3c,#ff7a00)':'rgba(255,255,255,.08)'};border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800">${pl.name[0].toUpperCase()}</div><div style="flex:1"><div style="color:#fff;font-size:13px;font-weight:600">${pl.name}</div><div style="color:#666;font-size:11px">${pl.beats.length} tracks</div></div><div style="font-size:11px;font-weight:700;color:${exists?'#00ffc8':'#ff7a00'}">${exists?'✓ Added':'+ Add'}</div></button>`;
      }).join("") : `<div style="color:#555;text-align:center;padding:20px;font-size:12px">No playlists yet</div>`}
    </div>
    <button id="newPlBtn" style="width:100%;margin-top:12px;height:42px;background:rgba(255,255,255,.04);border:1px dashed rgba(255,255,255,.15);border-radius:12px;color:#888;font-weight:700;cursor:pointer">+ Create New Playlist</button>
  </div>`;
  document.body.appendChild(modal);
  modal.querySelector(".playlist-modal-backdrop").onclick=()=>modal.remove();
  modal.querySelector(".plClose2").onclick=()=>modal.remove();
  modal.querySelectorAll(".pl-pick").forEach(b=>b.onclick=()=>{
    const id=b.dataset.id; const res=addBeatToVault(id, safe);
    const pl=playlists.find(p=>p.id===id);
    modal.remove(); toast(res.removed? `Removed from ${pl.name}` : `Added to ${pl.name}`);
  });
  modal.querySelector("#newPlBtn").onclick=()=>{ modal.remove(); setTimeout(()=>{ window.__PENDING_VAULT_BEAT__=safe; openVaultModalImpl(); },150); };
}

// AUTO-RESPECT WORKING WAVE.JS - OVERRIDE GLOBAL
window.openPlaylistModal = openVaultModalImpl;
window.openAddToPlaylistModal = openAddToVaultModalImpl;
window.openVaultModal = openVaultModalImpl;
window.openAddToVaultModal = openAddToVaultModalImpl;
window.closePlaylistModal = ()=>{ const m=document.getElementById("playlistModal"); if(m) m.remove(); };

console.log("DT VAULT MODAL: ready - respects wave.js");
