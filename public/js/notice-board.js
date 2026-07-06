// ===============================
// 📜 NOTICE BOARD - PROMO FIXED
// ===============================
const API_URL = 'https://api.dopetonevault.com/api/beats'
const noticeBoardFeed = document.getElementById('noticeBoardFeed');
const noticeBoardInput = document.getElementById('noticeBoardInput');
const noticeBoardSend = document.getElementById('noticeBoardSend');

let currentPostId = null;
// ADD TO CART AND GO TO LICENCE
window.addToCartAndGoToLicence = function(beat) {
  let cart = JSON.parse(localStorage.getItem("dopetone_cart") || "[]");

  // Check if already in cart
  if (!cart.find(b => b.id == beat.id)) {
    cart.push({
      id: beat.id,
      title: beat.title,
      cover: beat.cover_url,
      cover_url: beat.cover_url,
      audio: beat.audio_url,
      genre: '--',
      bpm: '--',
      type: '--',
      mood: '--',
      key: '--'
    });
    localStorage.setItem("dopetone_cart", JSON.stringify(cart));
  }

  // Go to licence page with this beat active
  window.location.href = `licence-page.html?id=${beat.id}`;
};

console.log('[NOX] Notice Board Init');

function renderNotice(item) {
  if (!noticeBoardFeed ||!item || item.from!== 'admin') return;
  const text = item.content || '';
  const time = new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  let html = '';

  if (item.promotion?.items?.length) {
    const beats = item.promotion.items;
    // Store for player access
    window.__CURRENT_PROMO__ = beats;

    const main = beats[0];
    const rest = beats.slice(1, 4);

    html = `
    <div style="background:#0a0a0a;border-radius:16px;overflow:hidden;border:1px solid #2a2a2a;">
      <div style="padding:14px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <div style="width:24px;height:24px;background:#8b5cf6;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;">🔥</div>
          <span style="font-size:12px;font-weight:600;color:#fff;">FEATURED DROP</span>
          <span style="margin-left:auto;font-size:10px;color:#666;">${time}</span>
        </div>

        <!-- MAIN BEAT -->
        <div style="background:#141414;border-radius:12px;padding:12px;margin-bottom:10px;border:1px solid #2a2a2a;cursor:pointer;" onclick="addToCartAndGoToLicence(${JSON.stringify(main).replace(/"/g, '&quot;')})">
         <div style="display:flex;gap:12px;align-items:center;">
            <img src="${main.cover_url||'images/logo.png'}" style="width:70px;height:70px;border-radius:8px;object-fit:cover;flex-shrink:0;" onerror="this.src='images/logo.png'">
            <div style="flex:1;min-width:0;">
              <div style="font-size:15px;font-weight:bold;color:#fff;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${main.title}</div>
              <div style="font-size:11px;color:#999;display:flex;gap:12px;">
                <span><i class="fa-solid fa-play" style="color:#8b5cf6;"></i> ${(main.plays||0).toLocaleString()}</span>
                <span><i class="fa-solid fa-heart" style="color:#ef4444;"></i> ${main.likes||0}</span>
                <span style="color:#22c55e;font-weight:bold;">$${main.price||29.99}</span>
              </div>
            </div>
            <div style="width:40px;height:40px;background:#8b5cf6;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;" onclick="event.stopPropagation();playPromoBeat(${main.id},'${main.audio_url||''}',this)">
              <i class="fa-solid fa-play" id="play-${main.id}" style="color:white;font-size:14px;margin-left:2px;"></i>
            </div>
          </div>
        </div>

        <!-- 3 SMALL BEATS -->
        ${rest.length>0?`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px;">
          ${rest.map(b=>`
            <div style="background:#141414;border-radius:8px;padding:8px;text-align:center;cursor:pointer;border:1px solid #222;position:relative;" onclick="addToCartAndGoToLicence(${JSON.stringify(b).replace(/"/g, '&quot;')})">
             <img src="${b.cover_url||'images/logo.png'}" style="width:100%;height:55px;object-fit:cover;border-radius:6px;margin-bottom:5px;" onerror="this.src='images/logo.png'">
              <div style="font-size:10px;color:#ccc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${b.title}</div>
              <div style="position:absolute;top:4px;right:4px;width:20px;height:20px;background:rgba(0,0,0,0.7);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;" onclick="event.stopPropagation();playPromoBeat(${b.id},'${b.audio_url||''}',this)">
                <i class="fa-solid fa-play" id="play-${b.id}" style="color:#8b5cf6;font-size:8px;margin-left:1px;"></i>
              </div>
            </div>
          `).join('')}
        </div>`:''}

        ${text?`<div style="font-size:13px;color:#ddd;line-height:1.5;padding-top:10px;border-top:1px solid #222;white-space:pre-wrap;">${text}</div>`:''}
      </div>
    </div>`;
  } else {
    let embedHtml = item.media?.url? (item.media.type==='video'?`<video src="${item.media.url}" controls style="width:100%;max-height:350px;background:#000;"></video>`:`<img src="${item.media.url}" style="width:100%;max-height:400px;object-fit:contain;background:#000;">`) : '';
    html = `<div style="background:#0f0f;border-radius:14px;overflow:hidden;border:1px solid #222;">${embedHtml}<div style="padding:14px;"><div style="display:flex;gap:10px;align-items:center;"><div style="width:28px;height:28px;background:linear-gradient(135deg,#8b5cf6,#6366f1);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:12px;">DT</div><div><div style="font-size:13px;font-weight:600;color:#fff;">Dope Tone</div><div style="font-size:11px;color:#888;">${time}</div></div></div>${text?`<div style="margin-top:10px;font-size:14px;color:#e0e0e0;white-space:pre-wrap;">${text}</div>`:''}</div></div>`;
  }

  noticeBoardFeed.innerHTML = html;
}

// GLOBAL PLAY - USES YOUR MAIN PLAYER
window.playPromoBeat = function(beatId, audioUrl, btn) {
  if (!window.globalPlayer ||!audioUrl) {
    console.error('Player not ready');
    return;
  }

  const icon = btn.querySelector('i') || document.getElementById(`play-${beatId}`);
  const audio = window.__DOPE_TONE_AUDIO__;
  const isCurrent = window.__CURRENT_BEAT__?.id === beatId;
  const isPlaying = audio &&!audio.paused;

  // Reset all icons
  document.querySelectorAll('[id^="play-"]').forEach(i => {
    i.className = 'fa-solid fa-play';
    i.style.marginLeft = i.parentElement.offsetWidth < 25? '1px' : '2px';
  });

  if (isCurrent && isPlaying) {
    window.globalPlayer.toggle();
    return;
  }

  // Get beat data
  const promoBeats = window.__CURRENT_PROMO__ || [];
  const beatData = promoBeats.find(b => b.id == beatId) || {};

  const beat = {
    id: beatId,
    title: beatData.title || 'Promo Beat',
    mp3_url: audioUrl,
    cover_url: beatData.cover_url || '',
    liked: false
  };

  // Play instantly - single click switch
  window.globalPlayer.play(0, [beat], 'promo');

  // Update icon
  setTimeout(() => {
    icon.className = 'fa-solid fa-pause';
    icon.style.marginLeft = '0';
  }, 100);

  // Reset on end
  if (audio) {
    audio.onended = () => {
      icon.className = 'fa-solid fa-play';
      icon.style.marginLeft = btn.parentElement.offsetWidth < 25? '1px' : '2px';
    };
  }
};

// User feedback
if (noticeBoardSend) {
  noticeBoardSend.addEventListener('click', async () => {
    const text = noticeBoardInput.value.trim();
    if (!text) return;
    noticeBoardInput.value = '';
    noticeBoardInput.placeholder = 'thank u 😊';
    noticeBoardInput.disabled = true;
    setTimeout(() => { noticeBoardInput.placeholder = 'Reply...'; noticeBoardInput.disabled = false; }, 2000);
    fetch(`${API_BASE}/api/messages/log`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:'fan@dopetone.com',source:'board',text}) }).catch(()=>{});
  });
}

// Load single latest post
async function loadNotices() {
  if (!noticeBoardFeed) return;
  try {
    const res = await fetch(`${API_BASE}/api/notices?cache=${Date.now()}`);
    const notices = await res.json();
    const latest = Array.isArray(notices) && notices.length > 0? notices[0] : null;

    if (!latest || latest.from!== 'admin') {
      if (currentPostId!== null) {
        currentPostId = null;
        noticeBoardFeed.innerHTML = '<div style="color:#666;padding:30px;text-align:center;">No drops yet</div>';
      }
      return;
    }

    if (latest.id!== currentPostId) {
      currentPostId = latest.id;
      console.log('[NOX] New post:', latest.promotion? `${latest.promotion.items.length} beats` : 'text');
      renderNotice(latest);
    }
  } catch(e) { console.error(e); }
}

loadNotices();
setInterval(loadNotices, 8000);
