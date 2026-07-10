// cc-notices.js - Notice Board + Beat Promotion Module
import { STATS_API, MAIN_API, allBeats } from './cc-config.js';

let selectedBeats = [];
let noticeHistoryLoading = false;

// ===== INIT NOTICES =====
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
  const beatList = document.getElementById('beatList');
  const promoPreview = document.getElementById('promotePreview');
  const noticePreview = document.getElementById('noticePreview');
  const imgPreview = document.getElementById('noticeImgPreview');
  const vidPreview = document.getElementById('noticeVidPreview');

  // ===== FILE PREVIEW =====
  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const f = fileInput.files[0];
      const fileInfo = document.getElementById('fileInfo');
      
      if (!f) {
        noticePreview.style.display = 'none';
        if (fileInfo) fileInfo.textContent = '';
        return;
      }
      
      noticePreview.style.display = 'block';
      if (fileInfo) fileInfo.textContent = `${f.name} (${(f.size / 1024).toFixed(1)} KB)`;
      
      if (f.type.startsWith('image/')) {
        imgPreview.src = URL.createObjectURL(f);
        imgPreview.style.display = 'block';
        vidPreview.style.display = 'none';
        typeSel.value = 'image';
      } else if (f.type.startsWith('video/')) {
        vidPreview.src = URL.createObjectURL(f);
        vidPreview.style.display = 'block';
        imgPreview.style.display = 'none';
        typeSel.value = 'video';
      }
    });
  }

  // ===== AUTO-DETECT LINKS IN TEXT =====
  if (textInput) {
    textInput.addEventListener('paste', () => {
      setTimeout(() => {
        const text = textInput.value;
        const url = text.match(/https?:\/\/[^\s]+/)?.[0];
        if (!url) return;
        
        if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url)) {
          typeSel.value = 'image';
          showToast('Image link detected');
        } else if (/\.(mp4|webm|mov)$/i.test(url)) {
          typeSel.value = 'video';
          showToast('Video link detected');
        } else if (url.includes('dopetone') && url.includes('beat')) {
          showToast('Beat link detected - use Promote button for best display');
        }
      }, 100);
    });
  }

  // ===== PROMOTE PICKER TOGGLE =====
  if (promoteBtn) {
    promoteBtn.onclick = () => {
      const isHidden = picker.style.display === 'none' ||!picker.style.display;
      picker.style.display = isHidden? 'block' : 'none';
      if (isHidden) loadBeatsForPicker();
    };
  }

  // ===== BEAT SEARCH IN PICKER =====
  if (beatSearch) {
    beatSearch.oninput = debounce(() => loadBeatsForPicker(beatSearch.value), 300);
  }

  // ===== PREVIEW BUTTON =====
  if (previewBtn) {
    previewBtn.onclick = () => {
      const text = textInput.value.trim();
      const file = fileInput.files[0];
      const previewArea = document.getElementById('noxPreviewArea');
      
      if (!text &&!file && selectedBeats.length === 0) {
        showToast('Nothing to preview', true);
        return;
      }
      
      let html = '<div style="border:1px solid #333;border-radius:6px;padding:10px;background:#0a0a0a;">';
      html += '<div style="font-size:11px;color:#8b5cf6;margin-bottom:8px;">PREVIEW</div>';
      
      if (selectedBeats.length > 0) {
        html += renderPromoPreviewHTML();
      } else if (file && file.type.startsWith('image/')) {
        html += `<img src="${URL.createObjectURL(file)}" style="max-width:100%;border-radius:4px;">`;
      } else if (file && file.type.startsWith('video/')) {
        html += `<video src="${URL.createObjectURL(file)}" style="max-width:100%;border-radius:4px;" controls></video>`;
      }
      
      if (text) {
        html += `<div style="margin-top:8px;color:#ccc;font-size:13px;">${text}</div>`;
      }
      
      html += '</div>';
      previewArea.innerHTML = html;
    };
  }

  // ===== POST BUTTON =====
  if (postBtn) {
    postBtn.onclick = async (e) => {
      e.preventDefault();
      const text = textInput.value.trim();
      const file = fileInput.files[0];
      
      if (!text &&!file && selectedBeats.length === 0) {
        showToast('Need content, media, or promoted beats', true);
        return;
      }
      
      postBtn.disabled = true;
      postBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> POSTING...';
      
      const payload = {
        type: selectedBeats.length > 0? 'promotion' : typeSel.value,
        content: text,
        from: 'admin',
        expiresAt: autoDel.checked? Date.now() + 86400000 : null,
        promotion: {
          type: 'beats',
          items: selectedBeats.map(b => ({
            id: b.id,
            title: b.title,
            cover_url: b.cover_url || b.cover,
            plays: b.play_count || 0,
            likes: b.like_count || 0,
            price: b.price,
            audio_url: b.mp3_url || b.audio || ''
          }))
        }
      };

      const send = async () => {
        try {
          const res = await fetch(`${STATS_API}/api/notices`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(payload)
          });
          
          if (!res.ok) throw new Error('Post failed');
          
          textInput.value = '';
          fileInput.value = '';
          selectedBeats = [];
          renderPromoPreview();
          noticePreview.style.display = 'none';
          document.getElementById('noxPreviewArea').innerHTML = '';
          document.getElementById('selectedCount').textContent = '0/4';
          
          showToast('POST LIVE ✓');
          loadNoticeHistory();
        } catch (err) {
          console.error('[CC Notices] Post failed:', err);
          showToast('POST FAILED', true);
        } finally {
          postBtn.disabled = false;
          postBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Post';
        }
      };

      if (file) {
        const rd = new FileReader();
        rd.onload = e => {
          payload.media = {
            type: file.type.startsWith('image/')? 'image' : 'video',
            url: e.target.result
          };
          send();
        };
        rd.readAsDataURL(file);
      } else {
        send();
      }
    };
  }

  // Load initial history
  loadNoticeHistory();
}

// ===== LOAD BEATS FOR PICKER =====
async function loadBeatsForPicker(q = '') {
  const beatList = document.getElementById('beatList');
  if (!beatList) return;

  // Use cached allBeats if available
  let beats = allBeats;
  
  // Fetch if empty
  if (!beats || beats.length === 0) {
    try {
      const res = await fetch(`${MAIN_API}/beats`);
      if (res.ok) {
        beats = await res.json();
      }
    } catch (err) {
      console.error('[CC Notices] Beats fetch failed:', err);
      beatList.innerHTML = '<div style="color:#666;font-size:12px;">Failed to load beats</div>';
      return;
    }
  }

  const filtered = beats.filter(b => 
   !q || b.title.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 20);

  beatList.innerHTML = filtered.map(b => `
    <div class="beat-pick" data-id="${b.id}" style="border:1px solid ${selectedBeats.find(x => x.id === b.id)? '#8b5cf6' : '#333'};border-radius:6px;padding:6px;cursor:pointer;background:#111;transition:all 0.2s;">
      <img src="${b.cover_url || b.cover}" style="width:100%;height:70px;object-fit:cover;border-radius:4px;">
      <div style="font-size:11px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${b.title}</div>
    </div>
  `).join('');

  // Click handlers
  document.querySelectorAll('.beat-pick').forEach(el => {
    el.onclick = () => {
      const id = parseInt(el.dataset.id);
      const beat = filtered.find(b => b.id === id);
      if (!beat) return;

      const idx = selectedBeats.findIndex(x => x.id === id);
      if (idx > -1) {
        selectedBeats.splice(idx, 1);
      } else {
        if (selectedBeats.length < 4) {
          selectedBeats.push(beat);
        } else {
          showToast('Max 4 beats', true);
          return;
        }
      }
      
      document.getElementById('selectedCount').textContent = `${selectedBeats.length}/4`;
      loadBeatsForPicker(q);
      renderPromoPreview();
    };
  });
}

// ===== RENDER PROMO PREVIEW =====
function renderPromoPreview() {
  const promoPreview = document.getElementById('promotePreview');
  if (!promoPreview) return;

  if (selectedBeats.length === 0) {
    promoPreview.innerHTML = '';
    return;
  }

  const [main,...rest] = selectedBeats;
  promoPreview.innerHTML = `
    <div style="border:1px solid #8b5cf6;border-radius:8px;padding:10px;background:#0a0a0a;">
      <div style="font-size:11px;color:#8b5cf6;margin-bottom:8px;">PROMOTION PREVIEW (${selectedBeats.length} beats)</div>
      <div style="display:flex;gap:8px;">
        <div style="flex:1.5;">
          <img src="${main.cover_url || main.cover}" style="width:100%;height:120px;object-fit:cover;border-radius:6px;">
          <div style="font-size:12px;margin-top:4px;font-weight:bold;">${main.title}</div>
        </div>
        <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          ${rest.map(b => `<img src="${b.cover_url || b.cover}" style="width:100%;height:56px;object-fit:cover;border-radius:4px;" title="${b.title}">`).join('')}
          ${Array(3 - rest.length).fill(0).map(() => `<div style="background:#111;border-radius:4px;height:56px;"></div>`).join('')}
        </div>
      </div>
    </div>
  `;
}

// ===== RENDER PROMO PREVIEW HTML =====
function renderPromoPreviewHTML() {
  if (selectedBeats.length === 0) return '';
  const [main,...rest] = selectedBeats;
  return `
    <div style="border:1px solid #8b5cf6;border-radius:8px;padding:10px;background:#0a0a0a;">
      <div style="font-size:11px;color:#8b5cf6;margin-bottom:8px;">PROMOTION (${selectedBeats.length} beats)</div>
      <div style="display:flex;gap:8px;">
        <div style="flex:1.5;">
          <img src="${main.cover_url || main.cover}" style="width:100%;height:120px;object-fit:cover;border-radius:6px;">
          <div style="font-size:12px;margin-top:4px;font-weight:bold;">${main.title}</div>
        </div>
        <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          ${rest.map(b => `<img src="${b.cover_url || b.cover}" style="width:100%;height:56px;object-fit:cover;border-radius:4px;" title="${b.title}">`).join('')}
          ${Array(3 - rest.length).fill(0).map(() => `<div style="background:#111;border-radius:4px;height:56px;"></div>`).join('')}
        </div>
      </div>
    </div>
  `;
}

// ===== LOAD NOTICE HISTORY =====
async function loadNoticeHistory() {
  if (noticeHistoryLoading) return;
  noticeHistoryLoading = true;

  const listEl = document.getElementById('noticeHistoryList');
  const countEl = document.getElementById('postCount');
  
  try {
    const res = await fetch(`${STATS_API}/api/notices`);
    if (!res.ok) throw new Error('History fetch failed');
    
    const notices = await res.json();
    
    if (countEl) countEl.textContent = `(${notices.length})`;
    
    if (!notices.length) {
      listEl.innerHTML = '<div style="color:#666;font-size:12px;text-align:center;padding:20px;">No posts yet</div>';
      return;
    }

    listEl.innerHTML = notices.map(n => {
      const txt = (n.content || 'No text').substring(0, 80);
      const exp = n.expiresAt? ` <span style="color:#f59e0b;">⏰24h</span>` : ` <span style="color:#666;">♾️</span>`;
      const time = new Date(n.timestamp).toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      const promoTag = n.type === 'promotion'? ` <span style="color:#8b5cf6;">📢 Promo</span>` : '';
      
      return `
        <div style="padding:8px;margin-bottom:6px;border-bottom:1px dotted #333;background:#0a0a0a;border-radius:4px;">
          <div style="font-size:11px;color:#666;margin-bottom:4px;">${time}${exp}${promoTag}</div>
          <div style="font-size:12px;color:#ccc;">${txt}${txt.length === 80? '...' : ''}</div>
        </div>
      `;
    }).join('');
    
  } catch (err) {
    console.error('[CC Notices] History load failed:', err);
    listEl.innerHTML = '<div style="color:#ef4444;font-size:12px;text-align:center;padding:20px;">Failed to load history</div>';
  } finally {
    noticeHistoryLoading = false;
  }
}

// ===== TOAST HELPER =====
function showToast(msg, err = false) {
  let t = document.getElementById('noxToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'noxToast';
    t.style.cssText = 'position:fixed;top:20px;right:20px;padding:15px 20px;border-radius:4px;font-weight:bold;z-index:99999;font-family:monospace;';
    document.body.appendChild(t);
  }
  t.style.background = err? '#f00' : '#0f0';
  t.style.color = err? '#fff' : '#000';
  t.innerText = msg;
  t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 3000);
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
  loadNoticeHistory();
});
