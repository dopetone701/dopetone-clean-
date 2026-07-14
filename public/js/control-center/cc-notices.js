// cc-notices.js - FINAL WORKING - R2 for heavy files, D1 for light only + 1 BIG + SMALL toggle
import { STATS_API, MAIN_API, allBeats } from './cc-config.js';

const DROP_API = "https://dt-drop-zone-api.dopetone701.workers.dev";

let selectedBeats = [];
window.selectedBeats = selectedBeats;
let noticeHistoryLoading = false;
let lastPostHash = '';

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
      let html = '<div style="border:1px solid #333;border-radius:12px;padding:12px;background:#0a0a0a;">';
      html += '<div style="font-size:10px;color:#8b5cf6;margin-bottom:8px;letter-spacing:1px">PREVIEW • DARK 1 BIG + SMALL TOGGLE</div>';
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

        // === HEAVY FILE -> R2 ===
        if (file) {
          if (file.size > 50 * 1024 * 1024) throw new Error('File too big - max 50MB');
          postBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> UPLOADING TO R2...';
          const fd = new FormData();
          fd.append('file', file);
          const upRes = await fetch(`${DROP_API}/api/upload`, { method: 'POST', body: fd });
          const upData = await upRes.json();
          if (!upData.success) throw new Error(upData.error || 'R2 upload failed');
          mediaPayload = { type: file.type.startsWith('image/')? 'image':'video', url: upData.url };
        }

        // === LIGHT DATA -> D1 ===
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
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify(payload)
        });
        const data1 = await res1.json().catch(()=>({}));
        if (!res1.ok ||!data1.success) throw new Error(data1.error || `DROP API ${res1.status}`);

        // Dual sync to old STATS_API (optional)
        try {
          await fetch(`${STATS_API}/api/notices`, {
            method: 'POST',
            headers: { 'Content-Type':'application/json' },
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
    <div class="beat-pick" data-id="${b.id}" style="border:1px solid ${selectedBeats.find(x=>String(x.id)===String(b.id))? '#8b5cf6':'#222'};border-radius:8px;padding:6px;cursor:pointer;background:${selectedBeats.find(x=>String(x.id)===String(b.id))? '#8b5cf611':'#0a0a0a'};position:relative">
      ${selectedBeats.find(x=>String(x.id)===String(b.id))? '<div style="position:absolute;top:4px;right:4px;background:#8b5cf6;color:#fff;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px">✓</div>':''}
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
    <div style="border:1px solid #8b5cf6;border-radius:12px;padding:10px;background:#0a0a0a;display:flex;gap:10px">
      <img src="${main.cover_url||main.cover||''}" style="width:90px;height:90px;object-fit:cover;border-radius:10px;border:1px solid #222">
      <div style="flex:1">
        <div style="font-size:10px;color:#8b5cf6;letter-spacing:1px">MAIN DROP • ${selectedBeats.length} BEATS - 1 BIG + SMALL TOGGLE</div>
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
      <span style="font-size:10px;color:#8b5cf6;font-weight:800">${selectedBeats.length} BEATS</span>
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
      listEl.innerHTML = '<div style="color:#444;font-size:12px;text-align:center;padding:30px"><i class="fa-solid fa-inbox"></i><br>No drops yet</div>';
      return;
    }
    listEl.innerHTML = notices.map(n => {
      const time = new Date(n.timestamp||n.created_at||Date.now()).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
      const exp = n.expiresAt? `<span style="background:#f59e0b22;color:#f59e0b;padding:1px 6px;border-radius:10px;font-size:9px">24H</span>` : `<span style="background:#222;color:#666;padding:1px 6px;border-radius:10px;font-size:9px">♾️ PERMA</span>`;
      const promo = n.type==='promotion'? `<span style="background:#8b5cf622;color:#8b5cf6;padding:1px 6px;border-radius:10px;font-size:9px">📢 ${n.promotion?.items?.length||0} BEATS</span>` : '';
      const preview = n.promotion?.items?.[0]? `<img src="${n.promotion.items[0].cover_url}" style="width:32px;height:32px;border-radius:4px;object-fit:cover;margin-top:6px">` : (n.media?.type==='image'? `<img src="${n.media.url}" style="width:60px;height:40px;border-radius:4px;object-fit:cover;margin-top:6px">` : '');
      return `<div style="padding:10px;margin-bottom:8px;background:#0a0a0a;border:1px solid #1a1a1a;border-radius:8px;display:flex;justify-content:space-between;gap:10px">
        <div style="flex:1;min-width:0">
          <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px;flex-wrap:wrap"><span style="font-size:10px;color:#555">${time}</span>${exp}${promo}</div>
          <div style="font-size:12px;color:#ccc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml((n.content||'').slice(0,100))||'[Media/Promo Drop]'}</div>
          ${preview}
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <button onclick="window.deleteNotice('${n.id}')" style="width:28px;height:28px;border-radius:50%;background:#111;border:1px solid #222;color:#666;cursor:pointer"><i class="fa-solid fa-trash" style="font-size:10px"></i></button>
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
  showToast('Deleted ✓');
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
  t.style.background = err? '#ef4444' : '#fff';
  t.style.color = err? '#fff' : '#000';
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 2500);
}

function debounce(fn, wait) { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),wait); }; }
function escapeHtml(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
window.addEventListener('cc_dashboard_refresh', () => loadNoticeHistory(true));

export { loadNoticeHistory };
