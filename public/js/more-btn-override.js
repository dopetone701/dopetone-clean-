// ===============================
// 🔥 MORE BUTTON OVERRIDE FINAL
// DOPE TONE - email gate v3
// ===============================

const API_URL = 'https://dope-tone-api.dopetone701.workers.dev';
let __DT_CURRENT_BEAT__ = null;

// ---------- email check ----------
function hasCollectedEmail(){
  return localStorage.getItem('dt_email_collected') === 'true'
    || (JSON.parse(localStorage.getItem('dt_emails') || '[]').length > 0)
    || !!JSON.parse(localStorage.getItem('dopetone_user') || '{}').email;
}

function markEmailCollected(email){
  localStorage.setItem('dt_email_collected', 'true');
  if(email) localStorage.setItem('dt_last_email', email);
}

// set true while testing, so you actually see the gate
const FORCE_FREE_FOR_TEST = false;

function isFreeDownloadable(beat){
  if(!beat){ console.warn('[DT] no beat object'); return false; }
  
  console.log('[DT] checking beat:', beat.title, beat);
  
  const mode = beat.monetization_mode;
  const free = 
    mode === 'free' ||
    mode === 'hybrid' ||
    beat.has_free_tagged === 1 ||
    beat.has_free_tagged === true ||
    beat.is_free === true ||
    beat.free === true ||
    beat.free_download === true ||
    beat.price === 0 ||
    beat.price === '0';
  
  console.log('[DT] isFree?', free, 'mode:', mode);
  return FORCE_FREE_FOR_TEST ? true : free;
}

window.openDownloadGate = function(beat){
  // fallback to global current beat if none passed
  beat = beat || window.__CURRENT_BEAT__;
  __DT_CURRENT_BEAT__ = beat;

  if(!beat){
    console.error('[DT] no beat to download');
    return;
  }

  // 1. paid only -> licence
  if(!isFreeDownloadable(beat)){
    console.log('[DT] paid beat, going to licence');
    window.location.href = `licence-page.html?id=${beat.id}`;
    return;
  }

  // 2. free/hybrid, already gave email? -> instant
  if(hasCollectedEmail()){
    console.log('[DT] email already collected, instant download');
    startDopeToneDownload();
    return;
  }

  // 3. first time -> show gate
  createDownloadGate();
  document.getElementById('downloadGate').classList.add('active');
};


// ---------- download gate - JS injected ----------
function createDownloadGate(){
  if(document.getElementById('downloadGate')) return;
  const gate = document.createElement('div');
  gate.id = 'downloadGate';
  gate.className = 'download-gate';
  gate.innerHTML = `
  <div class="gate-content">
    <button class="gate-close" type="button">✕</button>
    <div class="gate-icon">👑</div>
    <h3>Unlock HQ Download</h3>
    <p class="gate-subtitle">Get 320kbps + exclusive drops. Join 12k+ producers.</p>
    <form id="gateForm" class="gate-form" novalidate>
      <input type="email" id="gateEmailInput" placeholder="your@email.com" required autocomplete="email">
      <button type="submit" class="gate-btn">Continue →</button>
    </form>
    <p class="gate-privacy">🔒 No spam. Unsubscribe anytime.</p>
    <button class="gate-skip" type="button">Maybe later</button>
  </div>`;
  document.body.appendChild(gate);

  gate.querySelector('.gate-close').onclick = closeDownloadGate;
  gate.querySelector('.gate-skip').onclick = closeDownloadGate;
  gate.addEventListener('click', e => { if(e.target === gate) closeDownloadGate(); });

  gate.querySelector('#gateForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('gateEmailInput');
    const email = input.value.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if(!valid){ input.style.borderColor = '#ff3c3c'; return; }
    input.style.borderColor = '';

    // save locally
    const emails = JSON.parse(localStorage.getItem('dt_emails') || '[]');
    emails.push({email, track: __DT_CURRENT_BEAT__?.id, time: Date.now()});
    localStorage.setItem('dt_emails', JSON.stringify(emails));
    markEmailCollected(email);

    // send to your API - matches your /api/emails/list endpoint
    fetch(`${API_URL}/api/emails`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({email, source: 'download_gate', beat_id: __DT_CURRENT_BEAT__?.id})
    }).catch(()=>{});

    startDopeToneDownload();
  });
}

window.closeDownloadGate = function(){
  document.getElementById('downloadGate')?.classList.remove('active');
  __DT_CURRENT_BEAT__ = null;
};
window.skipDownloadGate = window.closeDownloadGate;

// ---------- actual download ----------
async function startDopeToneDownload(){
  const beat = __DT_CURRENT_BEAT__;
  if(!beat) return;

  const btn = document.querySelector('#gateForm .gate-btn');
  if(btn){ btn.disabled = true; btn.textContent = 'Preparing...'; }

  fetch(`${API_URL}/api/stats/download`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({beat_id: beat.id})
  }).catch(()=>{});

  const downloadUrl = `${API_URL}/api/download/${beat.id}?url=${encodeURIComponent(beat.mp3_url || beat.url)}&title=${encodeURIComponent(beat.title)}`;

  try {
    const res = await fetch(downloadUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${beat.title}.mp3`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setTimeout(closeDownloadGate, 800);
  } catch(err) {
    console.error(err);
    alert('Download failed, try again');
    if(btn){ btn.disabled = false; btn.textContent = 'Continue →'; }
  }
}

// ---------- main entry - use this everywhere ----------
window.openDownloadGate = function(beat){
  __DT_CURRENT_BEAT__ = beat;

  // 1. paid only? -> licence page, no free download
  if(!isFreeDownloadable(beat)){
    window.location.href = `licence-page.html?id=${beat.id}`;
    return;
  }

  // 2. free/hybrid beat
  // already gave email? instant download
  if(hasCollectedEmail()){
    startDopeToneDownload();
    return;
  }

  // 3. first time, no email yet -> show gate
  createDownloadGate();
  document.getElementById('downloadGate').classList.add('active');
  setTimeout(() => document.getElementById('gateEmailInput')?.focus(), 50);
};

// ---------- hook all download buttons ----------
document.addEventListener('click', (e) => {
  const dl = e.target.closest('.wave-download');
  if(!dl) return;
  e.preventDefault(); e.stopPropagation();
  const beat = window.__CURRENT_BEAT__;
  if(beat) window.openDownloadGate(beat);
});

// ---------- your existing more-button / proMenuSheet code below ----------
// keep your sheet creation exactly as is, just make sure the download action is:
//   btn.onclick = () => { sheet.remove(); window.openDownloadGate(beat); }

// ===============================
// 🔥 MORE BUTTON SYSTEM
// ===============================
document.addEventListener("DOMContentLoaded", () => {

  const moreBtn =
    document.getElementById("mpMore")
    || document.getElementById("gpMore");

  // sync pc btn
  const gpMore = document.getElementById("gpMore");
  const mpMore = document.getElementById("mpMore");

  if(gpMore && mpMore){
    gpMore.onclick = () => {
      mpMore.click();
    };
  }

  if (!moreBtn) {
    console.log("mpMore not found");
    return;
  }

  // remove broken old listeners
  const cleanBtn = moreBtn.cloneNode(true);
  moreBtn.replaceWith(cleanBtn);

  // ===============================
  // NEW CLICK SYSTEM
  // ===============================
  cleanBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    console.log("MORE OPEN");

    const beat = window.__CURRENT_BEAT__;
    if (!beat) {
      console.log("NO CURRENT BEAT");
      return;
    }

    // remove old sheet
    const old = document.getElementById("proMenuSheet");
    if (old) old.remove();

    // ===============================
    // CREATE SHEET
    // ===============================
    const sheet = document.createElement("div");
    sheet.id = "proMenuSheet";
    sheet.innerHTML = `
      <div class="sheet-backdrop"></div>
      <div class="sheet-panel">
        <div class="sheet-handle"></div>
        <div class="sheet-title">${beat.title}</div>

        <button class="sheet-item" data-action="playlist">
          🎵 Create Playlist
        </button>
        <button class="sheet-item" data-action="add_playlist">
          ➕ Add To Playlist
        </button>
        <button class="sheet-item" data-action="dopetone_cart">
          🛒 Add To Cart
        </button>
        <button class="sheet-item" data-action="download">
          ⬇ Free Download
        </button>
        <button class="sheet-item" data-action="share">
          🔗 Share
        </button>
        <button class="sheet-item buy" data-action="buy">
          💳 Buy Now
        </button>
        ${
          localStorage.getItem("isOwner") === "true"
        ? `<button class="sheet-item delete" data-action="delete">🗑 Delete Beat</button>`
          : ""
        }
      </div>
    `;

    document.body.appendChild(sheet);

    // ===============================
    // CLOSE
    // ===============================
    const backdrop = sheet.querySelector(".sheet-backdrop");
    backdrop.onclick = () => {
      sheet.remove();
    };

    // ===============================
    // ACTIONS
    // ===============================
    sheet.querySelectorAll(".sheet-item").forEach(btn => {
      btn.onclick = async () => {
        const action = btn.dataset.action;

        if(action === "playlist") {
          if(window.openPlaylistModal){
            window.openPlaylistModal(beat);
          }
          sheet.remove();
          return;
        }

        // CART
        if(action === "dopetone_cart") {
          let cart = JSON.parse(localStorage.getItem("dopetone_cart")) || [];
          const exists = cart.find(item => item.id === beat.id);
          if(!exists){ cart.push(beat); }
          localStorage.setItem("dopetone_cart", JSON.stringify(cart));

          if(window.renderCartBeatRow){ window.renderCartBeatRow(); }
          if(window.checkEmptyState){ window.checkEmptyState(); }
          if(window.updateCartCount){ window.updateCartCount(); }

          const cartCount = document.getElementById("cartCount");
          if(cartCount){
            cartCount.textContent = cart.length;
            cartCount.classList.remove("bump");
            void cartCount.offsetWidth;
            cartCount.classList.add("bump");
          }
          showCartToast(beat.title);
          sheet.remove();
          return;
        }

        // ===============================
        // ➕ ADD TO PLAYLIST
        // ===============================
        if(action === "add_playlist"){
          const playlists = window.getPlaylists().filter(
            playlist =>!playlist.isLiked && playlist.id!== "liked_playlist"
          );

          document.getElementById("addPlaylistModal")?.remove();

          const modal = document.createElement("div");
          modal.id = "addPlaylistModal";
          modal.innerHTML = `
          <div class="playlist-picker-backdrop"></div>
          <div class="playlist-picker">
            <div class="playlist-picker-title">Add To Playlist</div>
            <div class="playlist-picker-list">
              ${
                playlists.map(playlist => {
                  const exists = playlist.beats.find(b => b.id === beat.id);
                  return `
                  <button class="playlist-pick-item" data-id="${playlist.id}">
                    <span>${playlist.name}</span>
                    <span>${exists? "✓ Added" : playlist.beats.length + " tracks"}</span>
                  </button>`;
                }).join("")
              }
              <button class="playlist-create-new">+ Create New Playlist</button>
            </div>
          </div>`;

          document.body.appendChild(modal);

          modal.querySelector(".playlist-picker-backdrop").onclick = () => {
            modal.remove();
          };

          modal.querySelectorAll(".playlist-pick-item").forEach(btn => {
            btn.onclick = () => {
              const playlistId = btn.dataset.id;
              const result = window.addBeatToPlaylist(playlistId, beat);
              const info = btn.querySelectorAll("span")[1];
              info.style.minWidth = "90px";
              info.style.textAlign = "right";
              info.style.transition = "opacity.25s ease";
              info.style.opacity = "0";
              setTimeout(() => {
                info.textContent = result?.removed? "Removed" : "✓ Added";
                info.style.opacity = "1";
              },120);

              setTimeout(() => {
                const updatedPlaylist = playlists.find(p => p.id === playlistId);
                if(!updatedPlaylist) return;
                info.style.opacity = "0";
                setTimeout(() => {
                  info.textContent = `${updatedPlaylist.beats.length} tracks`;
                  info.style.opacity = "1";
                },180);
              },1800);

              const playlist = playlists.find(p => p.id === playlistId);
              showCartToast(
                result?.removed
               ? `Removed from ${playlist.name}`
                : `Added to ${playlist.name}`
              );
            };
          });

          modal.querySelector(".playlist-create-new").onclick = () => {
            modal.remove();
            if(window.openPlaylistModal){
              window.openPlaylistModal();
              window.__PENDING_PLAYLIST_BEAT__ = beat;
            }
          };
          sheet.remove();
          return;
        }

        // ===============================
        // ⬇ DOWNLOAD - DOPE TONE GATE
        // ===============================
        if(action === "download") {
          sheet.remove();
          window.openDownloadGate(beat);
          return;
        }

        // SHARE
        if(action === "share") {
          if(navigator.share) {
            await navigator.share({
              title: beat.title,
              url: location.href
            });
          }
          sheet.remove();
          return;
        }

        // BUY
        if(action === "buy") {
          const beat = window.__CURRENT_BEAT__;
          if(!beat) return;

          let cart = JSON.parse(localStorage.getItem("dopetone_cart")) || [];
          const exists = cart.find(item => item.id == beat.id);
          if(!exists){
            cart.push(beat);
            localStorage.setItem("dopetone_cart", JSON.stringify(cart));
          }

          if(window.renderCartBeatRow){ window.renderCartBeatRow(); }
          if(window.checkEmptyState){ window.checkEmptyState(); }
          if(window.updateCartCount){ window.updateCartCount(); }

          const isLicencePage = window.location.pathname.includes("licence-page");
          if(isLicencePage){
            if(window.switchActiveBeat){ window.switchActiveBeat(beat); }
            const licenceCard = document.querySelector(".licence-layout");
            if(licenceCard){
              const targetY = licenceCard.getBoundingClientRect().top + window.pageYOffset - 40;
              const startY = window.scrollY;
              const distance = targetY - startY;
              const duration = 1800;
              let startTime = null;
              function easeInOutCubic(t){
                return t < 0.5? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
              }
              function animateScroll(currentTime){
                if(!startTime){ startTime = currentTime; }
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const ease = easeInOutCubic(progress);
                window.scrollTo(0, startY + distance * ease);
                if(progress < 1){ requestAnimationFrame(animateScroll); }
              }
              requestAnimationFrame(animateScroll);
            }
          } else {
            window.location.href = `licence-page.html?id=${beat.id}`;
          }
          sheet.remove();
          return;
        }

        // DELETE
        if(action === "delete") {
          alert("Connect Firebase delete");
          sheet.remove();
          return;
        }

        sheet.remove();
      };
    });
  });
});

function showCartToast(text){
  let toast = document.getElementById("cartToast");
  if(!toast){
    toast = document.createElement("div");
    toast.id = "cartToast";
    document.body.appendChild(toast);
  }
  toast.textContent = text;
  toast.classList.add("active");
  clearTimeout(toast.__timer);
  toast.__timer = setTimeout(() => {
    toast.classList.remove("active");
  },2200);
}

// ===============================
// 💻 PC MORE TOGGLE FINAL
// ===============================
const desktopMoreBtn = document.getElementById("gpMore");
if(desktopMoreBtn){
  desktopMoreBtn.addEventListener("click",(e)=>{
    e.stopPropagation();
    const existing = document.getElementById("proMenuSheet");
    if(existing){
      const panel = existing.querySelector(".sheet-panel");
      panel.style.animation = "pcMoreClose.22s ease forwards";
      setTimeout(()=>{ existing.remove(); },200);
      return;
    }
    document.getElementById("mpMore")?.click();
    setTimeout(()=>{
      const sheet = document.getElementById("proMenuSheet");
      if(!sheet) return;
      document.addEventListener("click", closeOutside);
      function closeOutside(ev){
        const panel = sheet.querySelector(".sheet-panel");
        if(ev.target.closest(".sheet-panel")) return;
        if(ev.target.closest("#gpMore")) return;
        panel.style.animation = "pcMoreClose.22s ease forwards";
        setTimeout(()=>{ sheet.remove(); },200);
        document.removeEventListener("click", closeOutside);
      }
    },50);
  });
}

// ===============================
// 🔥 FORCE ANIMATED CLOSE
// ===============================
document.addEventListener("click",(e)=>{
  const sheet = document.getElementById("proMenuSheet");
  if(!sheet) return;
  if(e.target.closest(".sheet-panel")) return;
  if(e.target.closest("#gpMore")) return;
  const panel = sheet.querySelector(".sheet-panel");
  if(!panel) return;
  e.preventDefault();
  panel.style.animation = "pcMoreClose.22s ease forwards";
  setTimeout(()=>{ sheet.remove(); },200);
});
