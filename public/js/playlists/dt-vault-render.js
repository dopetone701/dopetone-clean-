// ===============================
// 🎵 DT VAULT RENDER - FINAL - 100% WAVE.JS MARKUP + COVER + SVG
// ===============================
import { getVaultPlaylists } from "./dt-vault-storage.js"

const getMode = (b) => {
  if (!b) return 'paid';
  let m = (b.monetization_mode || b.monetizationMode || '').toLowerCase().trim();
  if (['free','hybrid','paid'].includes(m)) return m;
  if (m.includes('tagged')) return 'hybrid';
  if (b.is_free == 1 || b.is_free === true) return 'free';
  if (b.has_free_tagged == 1) return 'hybrid';
  return 'paid';
};
function fixPrice(p){ if(p==null) return 29.99; let pr=Number(p); if(isNaN(pr)) return 29.99; if(pr>=1000) pr/=100; if(pr>=100) pr/=100; return Number(pr.toFixed(2)); }
function normalizeBeat(b){
  if(!b) return null;
  return {...b, id:String(b.id), title:b.title||"Untitled", cover:b.cover||b.cover_url||"images/logo.png", cover_url:b.cover_url||b.cover||"images/logo.png", audio:b.audio||b.mp3_url, mp3_url:b.mp3_url||b.audio, bpm:b.bpm||140, key:b.key||"--", genre:b.genre||"Trap", price:fixPrice(b.price??29.99)};
}

export function renderVault(){
  const mount = document.getElementById("homepagePlaylists");
  if(!mount) return;
  const playlists = getVaultPlaylists();
  const liked = playlists.find(p=>p.isLiked);
  if(!liked || !liked.beats.length){ mount.innerHTML = ""; return; }

  mount.innerHTML = `
  <section class="playlist-section">
    <div class="playlist-top" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <h2 class="section-title fire-title" style="color:#fff;font-weight:800">🎵 Your Playlists</h2>
    </div>
    <div class="playlist-card" data-playlist="${liked.id}" style="background:linear-gradient(145deg, rgba(15,18,30,.92), rgba(7,10,20,.96));border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div><div style="color:#fff;font-weight:800">${liked.name}</div><div style="color:#666;font-size:11px">${liked.beats.length} tracks</div></div>
        <button class="dt-play-all" data-playlist="${liked.id}" style="width:32px;height:32px;border-radius:50%;background:#fff;border:none;cursor:pointer">▶</button>
      </div>
      <div class="wave-list" style="display:flex;flex-direction:column;gap:10px">
        ${liked.beats.map((b,i)=>renderWaveRow(b,i,liked.id)).join("")}
      </div>
    </div>
  </section>`;
  setTimeout(initVaultWaves, 200);
}

function renderWaveRow(beat, index, playlistId){
  const b = normalizeBeat(beat);
  const mode = getMode(b);
  const priceHTML = mode==='free' ? `<span class="new-price">FREE</span>` : `<span class="old-price">$49</span><span class="new-price">$${fixPrice(b.price).toFixed(2)}</span>`;
  const btnClass = mode==='paid' ? 'is-paid' : mode==='hybrid' ? 'is-hybrid' : 'is-free';
  const btnIcon = mode==='paid' 
    ? `<span style="font-weight:900">$</span>` 
    : `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`;
  
  return `
  <div class="wave-row" data-beat-id="${b.id}" data-mode="${mode}" data-playlist="${playlistId}" data-index="${index}" data-realbeat="${b.id}" style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:14px;height:64px;cursor:pointer">
    <div class="wave-left" style="display:flex;align-items:center;gap:10px;min-width:0;flex-shrink:0">
      <div class="wave-cover-wrap" style="width:44px;height:44px;border-radius:8px;overflow:hidden;position:relative;flex-shrink:0;background:#0f172a">
        <img src="${b.cover_url}" class="wave-cover" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy" onerror="this.src='images/logo.png'" />
        <button class="wave-play dt-track-play" data-playlist="${playlistId}" data-index="${index}" data-realbeat="${b.id}" style="position:absolute;inset:0;background:rgba(0,0,0,.5);border:none;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px">▶</button>
      </div>
      <div class="wave-info" style="min-width:0">
        <div class="wave-title" style="color:#fff;font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px">${b.title}</div>
        <div class="wave-meta" style="color:rgba(255,255,255,.45);font-size:9px;margin-top:2px">${b.bpm} BPM • ${b.key} • ${b.genre}</div>
      </div>
    </div>
    <div class="wave-bar" id="wave-${playlistId}-${b.id}" style="flex:1;height:42px;min-width:120px"></div>
    <div class="wave-actions" style="display:flex;align-items:center;gap:8px;flex-shrink:0">
      <div class="wave-price" data-mode="${mode}" style="font-size:11px;font-weight:800;min-width:54px;text-align:right">${priceHTML}</div>
      <button class="wave-download ${btnClass} dt-dl-btn" data-playlist="${playlistId}" data-beat="${b.id}" style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;color:#fff;cursor:pointer">${btnIcon}</button>
    </div>
  </div>`;
}

function initVaultWaves(){
  if(typeof WaveSurfer==="undefined"){ console.log("WaveSurfer not loaded yet, retry"); setTimeout(initVaultWaves,500); return; }
  document.querySelectorAll(".wave-row[data-playlist]").forEach(row=>{
    if(row.dataset.waveInit==="1") return;
    const plId=row.dataset.playlist;
    const beatId=row.dataset.realbeat;
    const playlists=getVaultPlaylists();
    const pl=playlists.find(p=>p.id===plId);
    if(!pl) return;
    const beat=pl.beats.find(b=>String(b.id)===String(beatId));
    if(!beat) return;
    const container=row.querySelector(`#wave-${plId}-${beatId}`);
    if(!container) return;
    if(container.__ws) return;

    const mode=getMode(beat);
    let progress="#00f0ff", waveColor="rgba(90,110,200,0.65)";
    if(mode==='free'){
      const c=document.createElement('canvas').getContext('2d');
      const g=c.createLinearGradient(0,0,300,0);
      g.addColorStop(0,"#4da6ff"); g.addColorStop(0.5,"#fff"); g.addColorStop(1,"#ff4d94");
      progress=g; waveColor="rgba(77,166,255,0.32)";
    }
    if(mode==='hybrid'){ progress="#f59e0b"; waveColor="rgba(245,158,11,0.35)"; }

    const ws=WaveSurfer.create({
      container, waveColor, progressColor:progress, cursorColor:"transparent",
      height:42, normalize:true, partialRender:true, fillParent:true,
      interact:true, dragToSeek:true, cursorWidth:0, barWidth:2, barGap:1, barRadius:2
    });
    ws.load(beat.mp3_url||beat.audio);
    container.__ws=ws;
    row.__wave=ws;
    row.dataset.waveInit="1";
    
    container.addEventListener('click', e=>e.stopPropagation());
  });
}

document.addEventListener("click", e=>{
  const dl=e.target.closest(".dt-dl-btn");
  if(dl){
    e.stopPropagation();
    const pl=getVaultPlaylists().find(p=>p.id===dl.dataset.playlist);
    const beat=pl?.beats.find(b=>String(b.id)===String(dl.dataset.beat));
    if(!beat) return;
    if(getMode(beat)==='free'){
      const a=document.createElement('a'); a.href=beat.mp3_url||beat.audio; a.download=`${beat.title}.mp3`; a.click();
    }else{ window.location.href=`licence-page.html?id=${beat.id}`; }
    return;
  }
  const row=e.target.closest(".wave-row[data-playlist]");
  if(row && !e.target.closest(".wave-download")){
    const plId=row.dataset.playlist;
    const idx=Number(row.dataset.index);
    const pl=getVaultPlaylists().find(p=>p.id===plId);
    if(pl && window.globalPlayer) window.globalPlayer.play(idx, pl.beats.map(normalizeBeat), plId);
  }
  const all=e.target.closest(".dt-play-all");
  if(all){
    const pl=getVaultPlaylists().find(p=>p.id===all.dataset.playlist);
    if(pl && window.globalPlayer) window.globalPlayer.play(0, pl.beats.map(normalizeBeat), pl.id);
  }
});

window.addEventListener("dt_vault_updated", renderVault);
window.addEventListener("playlistsUpdated", renderVault);
document.addEventListener("DOMContentLoaded", renderVault);
window.renderVault=renderVault;
