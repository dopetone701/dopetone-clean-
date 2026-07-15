// cc-notices.js - FINAL FIXED - GRID + REAL MAP + AURA - NO SYNTAX ERRORS
import { STATS_API, MAIN_API, allBeats } from './cc-config.js';

const DROP_API = "https://dt-drop-zone-api.dopetone701.workers.dev";

let selectedBeats = [];
window.selectedBeats = selectedBeats;
let noticeHistoryLoading = false;
let lastPostHash = '';
let selectedReplyUser = null;
let realMap = null;
let mapMarkers = {};
let allUsersCache = {};

export function initNotices() {
  const postBtn = document.getElementById('noticePostBtn');
  const previewBtn = document.getElementById('noticePreviewBtn');
  const textInput = document.getElementById('noticeText');
  const fileInput = document.getElementById('noticeFile');
  const typeSel = document.getElementById('noticeType');
  const autoDel = document.getElementById('noticeAutoDelete');
  const promoteBtn = document.getElementById('promoteBtn');
  const picker = document.getElementById('promotePicker');
  const beatSearch = document.getElementById('beatSearch');
  const imgPreview = document.getElementById('noticeImgPreview');
  const vidPreview = document.getElementById('noticeVidPreview');
  const noticePreview = document.getElementById('noticePreview');
  if (!postBtn) return;

  if (fileInput) {
    fileInput.onchange = () => {
      const f = fileInput.files[0];
      const fileInfo = document.getElementById('fileInfo');
      if (!f) {
        if (noticePreview) noticePreview.style.display = 'none';
        if (fileInfo) fileInfo.textContent = '';
        return;
      }
      if (noticePreview) noticePreview.style.display = 'block';
      if (fileInfo) fileInfo.textContent = `${f.name} (${(f.size/1024/1024).toFixed(2)} MB) - Will upload to R2`;
      if (f.type.startsWith('image/')) {
        if (imgPreview) { imgPreview.src = URL.createObjectURL(f); imgPreview.style.display = 'block'; }
        if (vidPreview) vidPreview.style.display = 'none';
        if (typeSel) typeSel.value = 'image';
      } else if (f.type.startsWith('video/')) {
        if (vidPreview) { vidPreview.src = URL.createObjectURL(f); vidPreview.style.display = 'block'; }
        if (imgPreview) imgPreview.style.display = 'none';
        if (typeSel) typeSel.value = 'video';
      }
    };
  }

  if (textInput) {
    textInput.onpaste = () => {
      setTimeout(() => {
        const url = textInput.value.match(/https?:\/\/[^\s]+/)?.[0];
        if (!url) return;
        if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url)) {
          if (typeSel) typeSel.value = 'image';
          showToast('Image link detected');
        } else if (/\.(mp4|webm|mov)$/i.test(url)) {
          if (typeSel) typeSel.value = 'video';
          showToast('Video link detected');
        }
      }, 100);
    };
  }

  if (promoteBtn) {
    promoteBtn.onclick = () => {
      const hidden =!picker || picker.style.display === 'none' ||!picker.style.display;
      if (picker) picker.style.display = hidden? 'block' : 'none';
      if (hidden) loadBeatsForPicker();
    };
  }

  if (beatSearch) beatSearch.oninput = debounce(() => loadBeatsForPicker(beatSearch.value), 300);

  if (previewBtn) {
    previewBtn.onclick = () => {
      const text = textInput?.value.trim() || '';
      const file = fileInput?.files[0];
      const area = document.getElementById('noxPreviewArea');
      if (!text &&!file &&!selectedBeats.length) return showToast('Nothing to preview', true);
      let html = '<div style="border:1px solid #222;border-radius:12px;padding:12px;background:#0a0a0a;">';
      html += '<div style="font-size:10px;color:#0066ff;margin-bottom:8px;letter-spacing:1px">PREVIEW • SPACE BLACK</div>';
      if (selectedBeats.length) html += renderPromoPreviewHTML();
      else if (file?.type.startsWith('image/')) html += `<img src="${URL.createObjectURL(file)}" style="max-width:100%;border-radius:8px">`;
      else if (file?.type.startsWith('video/')) html += `<video src="${URL.createObjectURL(file)}" style="max-width:100%;border-radius:8px" controls></video>`;
      if (text) html += `<div style="margin-top:10px;color:#fff;font-size:13px;white-space:pre-wrap">${escapeHtml(text)}</div>`;
      html += '</div>';
      if (area) area.innerHTML = html;
    };
  }

  if (postBtn) {
    postBtn.onclick = async (e) => {
      e.preventDefault();
      const text = textInput?.value.trim() || '';
      const file = fileInput?.files[0];
      if (!text &&!file &&!selectedBeats.length) return showToast('Need content', true);
      if (postBtn.disabled) return;
      postBtn.disabled = true;
      const orig = postBtn.innerHTML;
      postBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> POSTING...';
      try {
        let mediaPayload = null;
        if (file) {
if (file.size > 50 * 1024) throw new Error('File too big - max 50MB');

          postBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> UPLOADING TO R2...';
          const fd = new FormData();
          fd.append('file', file);
          const upRes = await fetch(`${DROP_API}/api/upload`, { method: 'POST', body: fd });
          const upData = await upRes.json();
          if (!upData.success) throw new Error(upData.error || 'R2 upload failed');
          mediaPayload = { type: file.type.startsWith('image/')? 'image' : 'video', url: upData.url };
        }
        postBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> SAVING TO D1...';
        const payload = {
          type: selectedBeats.length? 'promotion' : (mediaPayload? mediaPayload.type : (typeSel?.value || 'text')),
          content: text,
          from: 'admin',
          expiresAt: autoDel?.checked? Date.now() + 86400000 : null,
          media: mediaPayload,
          promotion: selectedBeats.length? {
            type: 'beats',
            items: selectedBeats.map(b => ({
              id: b.id,
              title: b.title,
              cover_url: b.cover_url || b.cover || '',
              price: b.price,
              audio_url: b.mp3_url || b.audio || ''
            }))
          } : null
        };
        const res1 = await fetch(`${DROP_API}/api/notices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data1 = await res1.json().catch(() => ({}));
        if (!res1.ok ||!data1.success) throw new Error(data1.error || `DROP API ${res1.status}`);
        try {
          await fetch(`${STATS_API}/api/notices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } catch {}
        lastPostHash = JSON.stringify(payload);
        if (textInput) textInput.value = '';
        if (fileInput) fileInput.value = '';
        selectedBeats = [];
        window.selectedBeats = selectedBeats;
        const selCount = document.getElementById('selectedCount');
        if (selCount) selCount.textContent = '0/4';
        if (noticePreview) noticePreview.style.display = 'none';
        const noxArea = document.getElementById('noxPreviewArea');
        if (noxArea) noxArea.innerHTML = '';
        const promoPrev = document.getElementById('promotePreview');
        if (promoPrev) promoPrev.innerHTML = '';
        showToast('POST LIVE ✓ R2 + D1');
        await loadNoticeHistory(true);
        window.dispatchEvent(new CustomEvent('cc_dashboard_refresh'));
      } catch (err) {
        console.error(err);
        showToast(err.message, true);
      } finally {
        postBtn.disabled = false;
        postBtn.innerHTML = orig;
      }
    };
  }

  loadNoticeHistory();
  setInterval(() => {
    const sec = document.getElementById('noticeBoardControl');
    if (sec && sec.getBoundingClientRect().top < window.innerHeight + 500) loadNoticeHistory(true);
  }, 10000);

  initChatBoss();
  initRealMap();
}

async function loadBeatsForPicker(q='') {
  const beatList = document.getElementById('beatList');
  if (!beatList) return;
  let beats = allBeats;
  if (!beats ||!beats.length) {
    try {
      const res = await fetch(`${MAIN_API}/beats?t=${Date.now()}`);
      if (res.ok) {
        const j = await res.json();
        beats = j.beats || j.products || j || [];
      }
    } catch { beatList.innerHTML = '<div style="color:#666;font-size:11px;padding:10px">Failed to load beats</div>'; return; }
  }
  const filtered = beats.filter(b =>!q || (b.title||'').toLowerCase().includes(q.toLowerCase())).slice(0,24);
  beatList.innerHTML = filtered.map(b => `
    <div class="beat-pick" data-id="${b.id}" style="border:1px solid ${selectedBeats.find(x=>String(x.id)===String(b.id))? '#0066ff':'#222'};border-radius:10px;padding:6px;cursor:pointer;background:${selectedBeats.find(x=>String(x.id)===String(b.id))? '#0066ff11':'#0a0a0a'};position:relative">
      ${selectedBeats.find(x=>String(x.id)===String(b.id))? '<div style="position:absolute;top:4px;right:4px;background:#0066ff;color:#fff;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px">✓</div>':''}
      <img src="${b.cover_url||b.cover||''}" style="width:100%;height:70px;object-fit:cover;border-radius:6px" loading="lazy">
      <div style="font-size:10px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff">${escapeHtml(b.title||'Untitled')}</div>
    </div>
  `).join('');

  document.querySelectorAll('.beat-pick').forEach(el => {
    el.onclick = () => {
      const id = el.dataset.id;
      const beat = filtered.find(b=> String(b.id)===String(id));
      if (!beat) return;
      const idx = selectedBeats.findIndex(x=> String(x.id)===String(id));
      if (idx>-1) selectedBeats.splice(idx,1);
      else {
        if (selectedBeats.length>=4) return showToast('Max 4 beats', true);
        selectedBeats.push(beat);
      }
      window.selectedBeats = selectedBeats;
      const sc = document.getElementById('selectedCount');
      if (sc) sc.textContent = `${selectedBeats.length}/4`;
      loadBeatsForPicker(q);
      renderPromoPreview();
    };
  });
}

function renderPromoPreview() {
  const el = document.getElementById('promotePreview');
  if (!el) return;
  if (!selectedBeats.length) { el.innerHTML=''; return; }
  const [main,...rest] = selectedBeats;
  el.innerHTML = `
    <div style="border:1px solid #0066ff;border-radius:12px;padding:10px;background:#0a0a0a;display:flex;gap:10px">
      <img src="${main.cover_url||main.cover||''}" style="width:90px;height:90px;object-fit:cover;border-radius:10px;border:1px solid #222">
      <div style="flex:1">
        <div style="font-size:10px;color:#0066ff;letter-spacing:1px">MAIN DROP • ${selectedBeats.length} BEATS</div>
        <div style="font-size:13px;color:#fff;font-weight:700;margin:4px 0">${escapeHtml(main.title||'')}</div>
        <div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap">${rest.map(b=>`<img src="${b.cover_url||b.cover||''}" style="width:32px;height:32px;border-radius:6px;object-fit:cover;border:1px solid #222">`).join('')}</div>
      </div>
      <button onclick="window.ccClearPromo()" style="background:#111;border:1px solid #222;color:#666;width:28px;height:28px;border-radius:50%;cursor:pointer">✕</button>
    </div>
  `;
}

function renderPromoPreviewHTML() {
  if (!selectedBeats.length) return '';
  const [main,...rest] = selectedBeats;
  return `
  <div class="promo-wrap" data-mode="big" style="border:1px solid #222;border-radius:12px;overflow:hidden;background:#080808;margin-top:10px">
    <div style="display:flex;justify-content:space-between;padding:8px 10px;background:#111;border-bottom:1px solid #222">
      <span style="font-size:10px;color:#0066ff;font-weight:800">${selectedBeats.length} BEATS</span>
      <button onclick="window.togglePreviewCover(this)" style="background:#1a1a1a;border:1px solid #333;color:#fff;border-radius:20px;padding:3px 8px;font-size:10px">Grid View</button>
    </div>
    <div class="covers-big" style="padding:10px;display:flex;gap:10px">
      <img src="${main.cover_url||main.cover||''}" style="width:100px;height:100px;border-radius:10px;object-fit:cover">
      <div><div style="color:#fff;font-weight:700">${escapeHtml(main.title||'')}</div><div style="display:flex;gap:4px;margin-top:8px">${rest.map(b=>`<img src="${b.cover_url||b.cover||''}" style="width:36px;height:36px;border-radius:6px">`).join('')}</div></div>
    </div>
    <div class="covers-grid" style="display:none;padding:10px;grid-template-columns:repeat(3,1fr);gap:6px">${selectedBeats.map(b=>`<img src="${b.cover_url||b.cover||''}" style="width:100%;aspect-ratio:1;border-radius:8px">`).join('')}</div>
  </div>`;
}

window.togglePreviewCover = (btn) => {
  const wrap = btn.closest('.promo-wrap');
  const big = wrap.querySelector('.covers-big');
  const grid = wrap.querySelector('.covers-grid');
  const isBig = wrap.dataset.mode === 'big';
  if (isBig) { big.style.display='none'; grid.style.display='grid'; wrap.dataset.mode='grid'; btn.textContent='Big View'; }
  else { big.style.display='flex'; grid.style.display='none'; wrap.dataset.mode='big'; btn.textContent='Grid View'; }
};

async function loadNoticeHistory(force=false) {
  if (noticeHistoryLoading &&!force) return;
  noticeHistoryLoading = true;
  const listEl = document.getElementById('noticeHistoryList');
  const countEl = document.getElementById('postCount');
  if (!listEl) { noticeHistoryLoading = false; return; }
  try {
    const res = await fetch(`${DROP_API}/api/notices?t=${Date.now()}`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    const notices = await res.json();
    if (countEl) countEl.textContent = `(${notices.length})`;
    if (!Array.isArray(notices) ||!notices.length) {
      listEl.innerHTML = '<div style="color:#444;font-size:12px;text-align:center;padding:30px">No drops yet</div>';
      return;
    }
    listEl.innerHTML = notices.map(n => {
      const time = new Date(n.timestamp||n.created_at||Date.now()).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
      const exp = n.expiresAt? `<span style="background:#f59e0b22;color:#f59e0b;padding:1px 6px;border-radius:10px;font-size:9px">24H</span>` : `<span style="background:#222;color:#666;padding:1px 6px;border-radius:10px;font-size:9px">PERMA</span>`;
      const promo = n.type==='promotion'? `<span style="background:#0066ff22;color:#0066ff;padding:1px 6px;border-radius:10px;font-size:9px">BEATS ${n.promotion?.items?.length||0}</span>` : '';
      const preview = n.promotion?.items?.[0]? `<img src="${n.promotion.items[0].cover_url}" style="width:32px;height:32px;border-radius:4px;object-fit:cover;margin-top:6px;border:1px solid #222">` : (n.media?.type==='image'? `<img src="${n.media.url}" style="width:60px;height:40px;border-radius:4px;object-fit:cover;margin-top:6px">` : '');
      return `<div style="padding:10px;margin-bottom:8px;background:#0a0a0a;border:1px solid #1a1a1a;border-radius:10px;display:flex;justify-content:space-between;gap:10px">
        <div style="flex:1;min-width:0">
          <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px;flex-wrap:wrap"><span style="font-size:10px;color:#555">${time}</span>${exp}${promo}</div>
          <div style="font-size:12px;color:#ccc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml((n.content||'').slice(0,100))||'[Media/Promo Drop]'}</div>
          ${preview}
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <button onclick="window.deleteNotice('${n.id}')" style="width:28px;height:28px;border-radius:50%;background:#111;border:1px solid #222;color:#666;cursor:pointer">X</button>
        </div>
      </div>`;
    }).join('');
  } catch(e){
    if (!force) listEl.innerHTML = `<div style="color:#ef4444;font-size:11px;text-align:center;padding:20px">Failed: ${escapeHtml(e.message)}</div>`;
  } finally { noticeHistoryLoading = false; }
}

window.deleteNotice = async function(id) {
  if (!confirm('Delete this drop?')) return;
  await fetch(`${DROP_API}/api/notices/${id}`, { method:'DELETE' });
  showToast('Deleted');
  await loadNoticeHistory(true);
};

window.ccClearPromo = function() {
  selectedBeats = [];
  window.selectedBeats = selectedBeats;
  const sc = document.getElementById('selectedCount');
  if (sc) sc.textContent = '0/4';
  const el = document.getElementById('promotePreview');
  if (el) el.innerHTML = '';
  loadBeatsForPicker();
};

window.ccReloadDrops = () => loadNoticeHistory(true);

function showToast(msg, err=false) {
  let t = document.getElementById('noxToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'noxToast';
    t.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 18px;border-radius:8px;font-weight:700;z-index:99999;font-size:12px;box-shadow:0 8px 30px rgba(0,0,0,.5)';
    document.body.appendChild(t);
  }
  t.style.background = err? '#ff1a1a' : '#fff';
  t.style.color = err? '#fff' : '#000';
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 2500);
}

function debounce(fn, wait) { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),wait); }; }
function escapeHtml(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
window.addEventListener('cc_dashboard_refresh', () => loadNoticeHistory(true));

// === REAL MAP ===
function initRealMap(){
  setTimeout(()=>{
    const el = document.getElementById('dzRealMap');
    if(!el) return;
    if(typeof L === 'undefined'){
      el.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#555;font-size:11px">Add Leaflet CDN</div>';
      return;
    }
    if(realMap) return;

    // REMOVE NEGATIVE FILTER - Add this to your CSS
    const style = document.createElement('style');
    style.textContent = `
      .dz-dark-tiles .leaflet-tile { filter: invert(1) hue-rotate(180deg) brightness(0.7) contrast(1.2) !important; }
      .dz-sat-tiles .leaflet-tile { filter: none !important; }
      .leaflet-container { background: #000 !important; }
    `;
    document.head.appendChild(style);

    realMap = L.map('dzRealMap', {
      zoomControl:false, 
      attributionControl:false, 
      minZoom:2
    }).setView([25.2769,55.2962], 2);

    // REAL SATELLITE - TRUE COLOR (green forests, yellow desert, blue water)
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19
    });
    const labels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19
    });
    const dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom:18 });

    let mode = 'sat'; // START WITH REAL SATELLITE
    el.classList.add('dz-sat-tiles');
    satellite.addTo(realMap);
    labels.addTo(realMap);

    // TOGGLE BUTTON
    const btn = document.createElement('button');
    btn.innerHTML = '🌙 DARK';
    btn.style.cssText = 'position:absolute;top:10px;right:10px;z-index:1000;background:#fff;color:#000;border:none;padding:6px 12px;border-radius:99px;font-size:10px;font-weight:800;cursor:pointer;box-shadow:0 4px 15px rgba(0,0,0,.5)';
    el.style.position = 'relative';
    el.appendChild(btn);

    btn.onclick = () => {
      if(mode === 'sat'){
        realMap.removeLayer(satellite);
        realMap.removeLayer(labels);
        dark.addTo(realMap);
        el.classList.remove('dz-sat-tiles');
        el.classList.add('dz-dark-tiles');
        btn.innerHTML = '🛰 REAL SAT';
        btn.style.background = '#0a0a0a';
        btn.style.color = '#fff';
        btn.style.border = '1px solid #222';
        mode = 'dark';
      } else {
        realMap.removeLayer(dark);
        satellite.addTo(realMap);
        labels.addTo(realMap);
        el.classList.remove('dz-dark-tiles');
        el.classList.add('dz-sat-tiles');
        btn.innerHTML = '🌙 DARK';
        btn.style.background = '#fff';
        btn.style.color = '#000';
        btn.style.border = 'none';
        mode = 'sat';
      }
    };

    const setHQ = (lat, lon, city, country) => {
      const hqIcon = L.divIcon({
        className: '',
        html: '<div style="width:18px;height:18px;background:#00ff88;border-radius:50%;border:3px solid #fff;box-shadow:0 0 25px #00ff88, 0 0 50px #00ff88"></div>',
        iconSize: [18,18],
        iconAnchor: [9,9]
      });
      L.marker([lat, lon], {icon: hqIcon}).addTo(realMap)
        .bindPopup('<b>CREATORS HQ</b><br>' + city + ', ' + country);
      
      const locEl = document.getElementById('dzLiveLoc');
      if(locEl) locEl.textContent = city + ', ' + country;
      const cityEl = document.getElementById('dzLiveCity');
      if(cityEl) cityEl.textContent = lat.toFixed(4) + ', ' + lon.toFixed(4);
      realMap.setView([lat, lon], 3);
    };

    fetch('https://ipapi.co/json/')
      .then(r=>r.json())
      .then(d=> setHQ(d.latitude||25.276987, d.longitude||55.296249, d.city||'Dubai', d.country_name||'UAE'))
      .catch(()=> setHQ(25.276987,55.296249,'Dubai','UAE'));

  }, 800);
}


function updateRealMap(presence){
  if(!realMap || typeof L === 'undefined') return;
  Object.values(mapMarkers).forEach(m=> { try{ realMap.removeLayer(m); }catch{} });
  mapMarkers = {};
  presence.forEach((p,i)=>{
    let lat = p.lat || p.latitude || (20 + Math.sin(i)*30 + Math.random()*5);
    let lon = p.lon || p.longitude || (0 + Math.cos(i)*50 + Math.random()*5);
    const color = '#0066ff';
    const icon = L.divIcon({
      className:'',
      html:`<div style="position:relative"><div style="width:10px;height:10px;background:${color};border-radius:50%;border:2px solid #fff;box-shadow:0 0 12px ${color}"></div><div style="position:absolute;top:14px;left:50%;transform:translateX(-50%);font-size:7px;color:#fff;background:${color};padding:1px 5px;border-radius:99px;white-space:nowrap;font-weight:800">${escapeHtml((p.user_name||'Fan').slice(0,8))}</div></div>`,
      iconSize:[10,10],
      iconAnchor:[5,5]
    });
    const m = L.marker([lat, lon], {icon}).addTo(realMap);
    m.bindPopup(`<div style="color:#000"><b>${escapeHtml(p.user_name||'Fan')}</b><br><span style="font-size:10px">LIVE</span></div>`);
    m.on('click', ()=> window.selectUser && window.selectUser(p.user_id, p.user_name));
    mapMarkers[p.user_id]=m;
  });
}

// === GRID CHAT BOSS ===
function initChatBoss(){
  const pillsWrap = document.getElementById('dzPillsWrap');
  const threadWrap = document.getElementById('dzThreadWrap');
  const btn = document.getElementById('dzReplyBtn');
  const input = document.getElementById('dzReplyInput');
  const count = document.getElementById('dzCount');
  if(!pillsWrap ||!threadWrap ||!btn ||!input) return;

  let lastChatHash='', lastPresenceHash='', isLoadingCC=false;

  // FIXED SCROLL CSS - ADD ONCE
  pillsWrap.style.cssText = 'display:flex;flex-direction:column;gap:10px;overflow-y:auto;overflow-x:hidden;max-height:220px;min-height:60px;padding:10px;border-bottom:1px solid #1e1e1e;background:#080808;scroll-behavior:smooth;';
  threadWrap.style.cssText = 'flex:1;overflow-y:auto;overflow-x:hidden;padding:12px;display:flex;flex-direction:column;gap:10px;height:340px;scroll-behavior:smooth;';
  const list = document.getElementById('dzChatList');
  pillsWrap.style.overflowY = 'auto'; pillsWrap.style.maxHeight = '220px';
threadWrap.style.overflowY = 'auto'; threadWrap.style.height = '340px';

  if(list) list.style.cssText = 'display:flex;flex-direction:column;height:600px;overflow:hidden;background:#070707;border:1px solid #1e1e1e;border-radius:12px;';

  window.selectUser = (uid, name)=>{
    selectedReplyUser = {uid, name};
    input.placeholder = `Creators to ${name}...`;
    input.focus();
    loadCC(true);
  };

  window.deleteChatForUser = async (uid, name) => {
    if(!confirm(`Delete ALL chat with ${name}?`)) return;
    const res = await fetch(`${DROP_API}/api/chat?t=${Date.now()}`).then(r=>r.json());
    const toDel = res.filter(c=> c.user_id===uid || c.reply_to_user_id===uid);
    for(let m of toDel) await fetch(`${DROP_API}/api/chat/${m.id}`, {method:'DELETE'});
    showToast(`Chat with ${name} deleted`);
    if(selectedReplyUser?.uid===uid) selectedReplyUser=null;
    lastChatHash=''; loadCC(true);
  };

  // FIXED CLICK - only once
  if(!window._dzClickBound){
    window._dzClickBound = true;
    document.addEventListener('click', (e)=>{
      const pill = e.target.closest('.fan-pill');
      if(pill && pillsWrap.contains(pill)){
        e.stopPropagation();
        selectUser(pill.dataset.uid, pill.dataset.name);
        return;
      }
      if(e.target.closest('#closeThreadBtn')){
        e.stopPropagation();
        selectedReplyUser=null;
        input.placeholder='Select a fan pill...';
        loadCC(true);
        return;
      }
      if(e.target.closest('#deleteThreadBtn')){
        e.stopPropagation();
        const b = e.target.closest('#deleteThreadBtn');
        deleteChatForUser(b.dataset.uid, b.dataset.name);
        return;
      }
      if(e.target.closest('.del-msg-btn')){
        e.stopPropagation();
        const id=e.target.closest('.del-msg-btn').dataset.id;
        if(confirm('Delete message?')) fetch(`${DROP_API}/api/chat/${id}`, {method:'DELETE'}).then(()=>{ lastChatHash=''; loadCC(true); });
      }
    });
  }

  const markBtn = document.getElementById('dzMarkRead');
  if(markBtn &&!markBtn._bound){
    markBtn._bound = true;
    markBtn.onclick = (e)=>{
      e.stopPropagation();
      Object.values(allUsersCache).forEach(u=> u.unread=0);
      localStorage.setItem('dz_read_all', String(Date.now()));
      const unreadEl = document.getElementById('dzUnread');
      if(unreadEl) unreadEl.style.display='none';
      const statNew = document.getElementById('dzStatNew');
      if(statNew) statNew.textContent = '0';
      loadCC(true);
      showToast('All marked read ✓');
    };
  }

  const clearBtn = document.getElementById('dzClearAll');
  if(clearBtn &&!clearBtn._bound){
    clearBtn._bound = true;
    clearBtn.onclick = async (e)=>{
      e.stopPropagation();
      if(!confirm('Clear ALL chats? Permanent!')) return;
      clearBtn.textContent = '...';
      try{
        const all = await fetch(`${DROP_API}/api/chat?t=${Date.now()}`).then(r=>r.json());
        for(let m of all) await fetch(`${DROP_API}/api/chat/${m.id}`, {method:'DELETE'});
        showToast('Cleared ✓');
        lastChatHash='';
        selectedReplyUser=null;
        loadCC(true);
      }catch(err){
        showToast(err.message, true);
      } finally {
        clearBtn.innerHTML = '<i class="fa-solid fa-trash"></i> CLEAR';
      }
    };
  }

  async function loadCC(force=false){
    if(isLoadingCC) return;
    isLoadingCC=true;
    try{
      const [chats, presence] = await Promise.all([
        fetch(`${DROP_API}/api/chat?t=${Date.now()}`).then(r=>r.json()),
        fetch(`${DROP_API}/api/presence?t=${Date.now()}`).then(r=>r.json()).catch(()=>[])
      ]);
      const chatHash = JSON.stringify(chats.map(c=>c.id));
      const presHash = JSON.stringify(presence.map(p=>p.user_id));
      if(!force && chatHash===lastChatHash && presHash===lastPresenceHash){ isLoadingCC=false; return; }
      lastChatHash=chatHash; lastPresenceHash=presHash;

      const liveMap = new Map(presence.map(p=>[p.user_id, {...p, online:true}]));
      const users = {};

      chats.forEach(c=>{
        if(!c.user_id || c.user_id==='admin') return;
        if(!users[c.user_id]){
          const pres = liveMap.get(c.user_id);
          users[c.user_id]={uid:c.user_id,name:c.user_name||'Fan',count:0,online:!!pres,lastMsg:'',lastTime:0,unread:0,city:pres?.city||'',country:pres?.country||'',lat:pres?.latitude||pres?.lat,lon:pres?.longitude||pres?.lon};
        }
        users[c.user_id].count++;
        users[c.user_id].name=c.user_name||users[c.user_id].name;
        users[c.user_id].lastMsg=c.message;
        users[c.user_id].lastTime=new Date(c.created_at).getTime();
        if(!c.is_admin) users[c.user_id].unread++;
      });

      chats.forEach(c=>{
        if(c.is_admin && c.reply_to_user_id && users[c.reply_to_user_id]){
          const fanMsgs = chats.filter(x=> x.user_id===c.reply_to_user_id &&!x.is_admin).sort((a,b)=> new Date(b.created_at)-new Date(a.created_at));
          const lastFan = fanMsgs[0];
          if(lastFan && new Date(c.created_at).getTime() > new Date(lastFan.created_at).getTime()){
            users[c.reply_to_user_id].unread = 0;
          }
        }
      });

      allUsersCache = users;
      const totalUnread = Object.values(users).reduce((s,u)=>s+u.unread,0);
      if(count) count.textContent = `${Object.keys(users).length} fans - ${presence.length} LIVE - ${totalUnread} NEW`;
      const unreadEl = document.getElementById('dzUnread');
      if(unreadEl){ unreadEl.textContent = `${totalUnread} NEW`; unreadEl.style.display = totalUnread>0?'block':'none'; }
      const statLive = document.getElementById('dzStatLive'); if(statLive) statLive.textContent = presence.length;
      const statNew = document.getElementById('dzStatNew'); if(statNew) statNew.textContent = totalUnread;

      const sorted = Object.values(users).sort((a,b)=>{
        if(b.unread!==a.unread) return b.unread - a.unread;
        if((b.online?1:0)!==(a.online?1:0)) return (b.online?1:0)-(a.online?1:0);
        return b.lastTime - a.lastTime;
      });

      pillsWrap.innerHTML = sorted.length? sorted.map(u=>`
        <div data-uid="${u.uid}" data-name="${escapeHtml(u.name)}" class="fan-pill" style="min-height:68px;background:${selectedReplyUser?.uid===u.uid?'#0066ff':'#0f0f0f'};border:1px solid ${u.unread>0?'#ff3b30':(selectedReplyUser?.uid===u.uid?'#0066ff':'#1e1e1e')};border-radius:14px;padding:10px 12px;display:flex;align-items:center;gap:12px;cursor:pointer;position:relative;flex-shrink:0;${u.unread>0?'box-shadow:0 0 18px rgba(255,59,48,.35)':''}">
          <div style="position:relative">
            <div style="width:44px;height:44px;border-radius:50%;background:${selectedReplyUser?.uid===u.uid?'#fff':'#1a1a1a'};display:flex;align-items:center;justify-content:center;color:${selectedReplyUser?.uid===u.uid?'#000':'#fff'};font-weight:900;font-size:14px;border:1px solid ${u.online?'#00ff88':'#222'}">${escapeHtml(u.name[0]?.toUpperCase()||'F')}</div>
            <div style="position:absolute;bottom:-2px;right:-2px;width:12px;height:12px;border-radius:50%;background:${u.online?'#00ff88':'#333'};border:2px solid #0f0f0f"></div>
            ${u.unread>0?`<div style="position:absolute;top:-6px;left:-6px;background:#ff3b30;color:#fff;font-size:9px;font-weight:900;padding:2px 6px;border-radius:99px;border:2px solid #0f0f0f;min-width:18px;text-align:center">${u.unread}</div>`:''}
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;color:#fff;font-weight:800;display:flex;align-items:center;gap:6px">${escapeHtml(u.name)} ${u.city?`<span style="font-size:8px;color:#0066ff;background:#0066ff22;padding:1px 5px;border-radius:99px">${escapeHtml(u.city)}</span>`:''}</div>
            <div style="font-size:10px;color:${u.unread>0?'#fff':'#888'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;font-weight:${u.unread>0?'700':'400'}">${escapeHtml(u.lastMsg||'No message')}</div>
            <div style="font-size:8px;color:${u.online?'#00ff88':'#555'};margin-top:3px;display:flex;gap:8px"><span>${u.online?'LIVE NOW':'offline'}</span><span>${u.count} msgs</span>${u.unread>0?`<span style="color:#ff3b30">${u.unread} unread</span>`:''}</div>
          </div>
          <div style="color:${u.unread>0?'#ff3b30':'#333'}"><i class="fa-solid fa-chevron-right" style="font-size:11px"></i></div>
        </div>
      `).join('') : `<div style="color:#555;font-size:11px;padding:24px;text-align:center;border:1px dashed #1a1a1a;border-radius:12px">No fans yet</div>`;

      if(selectedReplyUser){
        const thread = chats.filter(c=> c.user_id===selectedReplyUser.uid || c.reply_to_user_id===selectedReplyUser.uid).sort((a,b)=> new Date(a.created_at)-new Date(b.created_at));
        const visibleThread = thread.slice(-30);
        threadWrap.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#0f0f0f;border:1px solid #1e1e1e;border-radius:12px;position:sticky;top:0;z-index:10;flex-shrink:0">
            <div style="font-size:12px;color:#fff;font-weight:800">Private ${escapeHtml(selectedReplyUser.name)} <span style="color:${liveMap.has(selectedReplyUser.uid)?'#00ff88':'#666'};font-size:10px">${liveMap.has(selectedReplyUser.uid)?'LIVE NOW':'offline'}</span> <span style="background:#0066ff;color:#fff;padding:2px 8px;border-radius:99px;font-size:8px">CREATORS</span></div>
            <div style="display:flex;gap:8px">
              <button id="deleteThreadBtn" data-uid="${selectedReplyUser.uid}" data-name="${escapeHtml(selectedReplyUser.name)}" style="background:#ff1a1a;border:none;color:#fff;padding:6px 12px;border-radius:99px;font-size:9px;font-weight:800;cursor:pointer">DELETE</button>
              <button id="closeThreadBtn" style="background:#1a1a1a;border:1px solid #222;color:#666;padding:6px 12px;border-radius:99px;font-size:11px;cursor:pointer">X</button>
            </div>
          </div>
          <div style="font-size:8px;color:#444;text-align:center;letter-spacing:1px;padding:4px;background:#000a;border-radius:99px;border:1px solid #111;flex-shrink:0">GRID ${visibleThread.length} MSGS SCROLL FOR HISTORY</div>
          <div style="display:flex;flex-direction:column;gap:14px;margin-top:4px">
          ${visibleThread.map(c=>{
            const isCreator = c.is_admin==1 || c.user_id==='admin';
            return `
            <div style="display:flex;gap:10px;align-items:flex-end;${isCreator?'':'flex-direction:row-reverse'};flex-shrink:0">
              <div style="width:28px;height:28px;border-radius:50%;background:${isCreator?'#0066ff':'#fff'};display:flex;align-items:center;justify-content:center;color:${isCreator?'#fff':'#000'};font-size:8px;font-weight:900;flex-shrink:0">${isCreator?'CR':escapeHtml((c.user_name||'F')[0].toUpperCase())}</div>
              <div style="max-width:68%;padding:12px 14px;border-radius:${isCreator?'18px 18px 4px 18px':'18px 18px 18px 4px'};font-size:12px;background:${isCreator?'#151515':'#fff'};border:1px solid ${isCreator?'#222':'#e5e5e5'};color:${isCreator?'#fff':'#000'};line-height:1.5">
                ${isCreator?`<div style="font-size:7px;color:#0066ff;font-weight:800;margin-bottom:4px">Dope Tone Creators</div>`:``}
                <div style="white-space:pre-wrap;word-break:break-word">${escapeHtml(c.message)}</div>
                <div style="display:flex;justify-content:space-between;margin-top:6px;align-items:center"><span style="font-size:8px;color:#666">${new Date(c.created_at).toLocaleTimeString()}</span><button data-id="${c.id}" class="del-msg-btn" style="background:none;border:none;color:#444;cursor:pointer;font-size:11px">DEL</button></div>
              </div>
            </div>`;
          }).join('')}
          </div>
        `;
        // SCROLL TO BOTTOM
        requestAnimationFrame(()=>{
          threadWrap.scrollTop = threadWrap.scrollHeight;
        });
      } else {
        threadWrap.innerHTML = `<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#444;font-size:12px;text-align:center;flex-direction:column;gap:8px"><div>Select fan from grid<br><span style="font-size:10px;color:#0066ff">Unread red glow on top</span></div><div style="font-size:8px;color:#333;border:1px dashed #1a1a1a;padding:6px 12px;border-radius:99px">6 visible scroll for more spaced premium</div></div>`;
      }

      updateRealMap([...liveMap.values()]);

    }catch(e){ console.error(e); }
    finally{ isLoadingCC=false; }
  }

  btn.onclick = async()=>{
    const m=input.value.trim(); if(!m) return;
    if(!selectedReplyUser) return showToast('Select a fan first', true);
    btn.disabled=true;
    try{
      await fetch(`${DROP_API}/api/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_name:'Dope Tone Creators', user_id:'admin', email:'creators@dopetone.com', message:m, is_admin:1, reply_to_user_id:selectedReplyUser.uid, reply_to_name:selectedReplyUser.name})});
      input.value='';
      showToast(`Creators to ${selectedReplyUser.name}`);
      lastChatHash='';
      loadCC(true);
    }catch(err){
      showToast(err.message, true);
    } finally {
      btn.disabled=false;
    }
  };
  input.onkeydown = e=>{ if(e.key==='Enter') btn.click(); };
  loadCC(true);
  setInterval(()=>loadCC(false), 3000);
}


export { loadNoticeHistory };
