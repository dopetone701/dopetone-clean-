// ===============================
// 🟥 CLOUDFLARE D1 + R2 ONLY
// ===============================

// ===============================
// 🟥 GLOBAL STORE
// ===============================
window.store = {
  beats: [],
  filteredBeats: [],
  loaded: false
}

// ================================
// 🔗 IMPORTS
// ================================
import { initQuickMenu } from "./components/quick-menu.js"
import { getBeats, getStatsOverview } from "./api.js"
import { renderLatest } from "./sections/latest.js"
import { renderFeatured } from "./sections/featured.js"
import { renderWave } from "./sections/wave.js"
import { renderTrending } from "./trending.js"
import "./global-filter.js"
import { initArsenalSearch } from "./components/arsenal-search.js"

console.log("STORE FILE RUNNING")
initQuickMenu()

// ================================
// 🟦 APP START - FULL PAGE LOAD
// ================================
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 app started")

  const pageLoader = document.getElementById('pageLoader')
  const appContent = document.getElementById('appContent')

  try {
    // 0. WAIT FOR AUTH TO LOAD
    await waitForAuth();
    console.log("✅ Auth ready:", window.Auth?.user?.email || 'guest');

    // 1. Init UI stuff that doesn't need data
    initUI()
    initMobileMenu() // safe – will auto-retry if navbar isn't injected yet
    initOrbit()
    initArsenalSearch()

    // 2. Load all data from D1/R2 - PARALLEL FETCH
    const [beats, overview] = await Promise.all([
      getBeats(),
      getStatsOverview()
    ]);

    // 3. 🔥 MAP CLOUDFLARE FIELDS TO FRONTEND FIELDS
    const normalizedBeats = (beats || []).map(beat => ({
    ...beat,
      audio: beat.mp3_url,
      cover: beat.cover_url,
      zip: beat.zip_url,
      cover_url: beat.cover_url,
      mp3_url: beat.mp3_url,
      zip_url: beat.zip_url,
      play_count: beat.play_count || 0
    }))

    window.allBeats = normalizedBeats
    window.store.beats = normalizedBeats
    window.store.filteredBeats = normalizedBeats
    window.store.loaded = true
    window.store.overview = overview

    console.log("✅ beats loaded:", window.store.beats.length)
    console.log("✅ live stats:", overview)
    console.log("✅ Cloudflare D1+R2 active")
    console.log("Sample audio URL:", normalizedBeats[0]?.audio)

    // 4. Render ALL sections - page is still hidden
    if(window.renderPlaylists){
        window.renderPlaylists()
    }

    await Promise.all([
      renderWave(),
      renderLatest(),
      renderFeatured(),
      renderTrending()
    ])

    window.dispatchEvent(new Event("playlistsUpdated"))

    // re-bind buy buttons after dynamic render
    setupGlobalBuyButtons();

    // 5. 🔥 ONLY NOW: Hide skeleton, reveal full page
    await new Promise(resolve => setTimeout(resolve, 300))

    pageLoader?.classList.add('hidden')
    appContent?.classList.add('ready')

    // 6. Remove loader from DOM after transition
    setTimeout(() => pageLoader?.remove(), 500)

    console.log('✅ Page fully loaded')

  } catch (err) {
    console.error("❌ APP FAILED:", err)
    if (pageLoader) {
      pageLoader.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;color:#ff6b6b;gap:20px;">
          <h2>Failed to load Dope Tone</h2>
          <p style="color:#999;font-size:14px;">${err.message}</p>
          <button onclick="location.reload()" style="background:#00eaff;border:none;padding:12px 24px;border-radius:8px;color:#000;font-weight:600;cursor:pointer;">Retry</button>
        </div>
      `
    }
  }
})

// ================================
// 🔐 WAIT FOR AUTH HELPER
// ================================
function waitForAuth() {
  return new Promise((resolve) => {
    // If Auth already loaded
    if (window.Auth && window.Auth.user!== undefined) {
      return resolve(window.Auth.user);
    }

    // Poll every 100ms until Auth is ready
    const checkInterval = setInterval(() => {
      if (window.Auth && window.Auth.user!== undefined) {
        clearInterval(checkInterval);
        resolve(window.Auth.user);
      }
    }, 100);

    // Timeout after 3s - continue as guest
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve(null);
    }, 3000);
  });
}

// ================================
// 🟩 UI CONTROLS
// ================================
function initUI() {
  const createBtn = document.getElementById("createBtn")
  const createPanel = document.getElementById("createPanel")

  if (createBtn && createPanel) {
    createBtn.addEventListener("click", () => {
      createPanel.classList.toggle("active")
    })
  }
}

// ================================
// 💙 MOBILE MENU – SCOFIELD FIXED
// ================================
function initMobileMenu() {
  const toggle = document.querySelector(".menu-toggle")
  const panel = document.querySelector(".mobile-panel")
  const overlay = document.querySelector(".overlay")
  const closeBtn = document.getElementById("panelCloseBtn")

  if (!toggle ||!panel ||!overlay) {
    console.warn('[SCOFIELD] Menu elements not found yet')
    return false
  }

  if (panel.dataset.navReady === "true") {
    console.log('[SCOFIELD] Menu already bound')
    return true
  }

  panel.dataset.navReady = "true"

  let startX = 0
  let currentX = 0
  let dragging = false

  function openMenu() {
    panel.classList.add("active")
    overlay.classList.add("active")
    document.body.classList.add("menu-open") // SCOFIELD: Hides player
    document.body.classList.add("panel-open")
    document.body.style.overflow = 'hidden'
    console.log('[SCOFIELD] Menu opened')
  }

  function closeMenu() {
    panel.classList.remove("active")
    overlay.classList.remove("active")
    document.body.classList.remove("menu-open")
    document.body.classList.remove("panel-open")
    document.body.style.overflow = ''
    panel.style.transition = "transform 0.32s ease"
    panel.style.transform = ""
    if (overlay) overlay.style.opacity = ""
    console.log('[SCOFIELD] Menu closed')
  }

  // SCOFIELD: Hamburger toggle
  toggle.addEventListener("click", (e) => {
    e.preventDefault()
    panel.classList.contains("active")? closeMenu() : openMenu()
  })

  // SCOFIELD: X button close
  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault()
      e.stopPropagation()
      closeMenu()
    })
  }

  // Backdrop close
  overlay.addEventListener("click", closeMenu)

  // Close on link click
  panel.addEventListener("click", (e) => {
    if (e.target.closest("a")) closeMenu()
  })

  // ESC to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu()
  })

  // Swipe to close
  panel.addEventListener("touchstart", (e) => {
    dragging = true
    startX = e.touches[0].clientX
    panel.style.transition = "none"
  }, {passive: true})

  panel.addEventListener("touchmove", (e) => {
    if (!dragging) return
    currentX = e.touches[0].clientX
    let diff = currentX - startX
    if (diff > 0) {
      panel.style.transform = `translateX(${diff}px)`
      if (overlay) overlay.style.opacity = String(Math.max(0, 1 - diff / 300))
    }
  }, {passive: true})

  panel.addEventListener("touchend", () => {
    dragging = false
    let moved = currentX - startX
    panel.style.transition = "transform 0.32s ease"
    if (moved > 80) {
      closeMenu()
    } else {
      panel.style.transform = "translateX(0)"
      if (overlay) overlay.style.opacity = "1"
    }
    startX = 0
    currentX = 0
  })

  console.log("✅ mobile nav ready")
  return true
}

// SCOFIELD: Also listen for navbar load event
window.addEventListener('navbarLoaded', () => {
  initMobileMenu()
})



// expose globally so app-loader.js can call it after injecting navbar.html
window.initMobileMenu = initMobileMenu

// auto-retry if navbar is injected late via fetch/innerHTML
if (!initMobileMenu()) {
  const navObs = new MutationObserver(() => {
    if (initMobileMenu()) navObs.disconnect()
  })
  navObs.observe(document.body, { childList: true, subtree: true })
  // stop trying after 5s
  setTimeout(() => navObs.disconnect(), 5000)
}

// ================================
// 🔁 ORBIT SYSTEM
// ================================
let orbitPaused = false

function initOrbit() {
  const buttons = document.querySelectorAll('.hero.cta-btn')
  if (!buttons.length || orbitPaused) return

  function loop() {
    buttons.forEach((btn, i) => {
      setTimeout(() => {
        btn.classList.add("orbit")
        setTimeout(() => btn.classList.remove("orbit"), 2000)
      }, i * 2500)
    })
    setTimeout(loop, buttons.length * 2500 + 1500)
  }

  loop()
}

document.addEventListener("click", () => {
  orbitPaused = true
})

/* =========================================
   🛒 MOBILE CART LINK
========================================= */
document.addEventListener("DOMContentLoaded", () => {
  const mobileCartBtn = document.getElementById("mobileCartBtn");
  if(!mobileCartBtn) return;

  function updateMobileCart(){
    const cart = JSON.parse(localStorage.getItem("dopetone_cart")) || [];
    const countEl = mobileCartBtn.querySelector("[data-cart-count],.cart-count");
    if (countEl) countEl.textContent = cart.length;
    mobileCartBtn.setAttribute("data-count", cart.length);
  }

  updateMobileCart();

  mobileCartBtn.addEventListener("click", () => {
    window.location.href = "licence-page.html";
  });

  // keep count in sync
  setInterval(updateMobileCart, 1000);
});

// ========================================
// 🌍 GLOBAL BUY BUTTON SYSTEM
// ========================================
function setupGlobalBuyButtons(){
  const buttons = document.querySelectorAll(".buy-btn");

  buttons.forEach(btn => {
    if(btn.dataset.ready) return;
    btn.dataset.ready = "true";

    btn.addEventListener("click", () => {
      const beat = {
        id: btn.dataset.id,
        title: btn.dataset.title,
        cover: btn.dataset.cover,
        cover_url: btn.dataset.cover_url || btn.dataset.cover,
        genre: btn.dataset.genre,
        bpm: btn.dataset.bpm,
        audio: btn.dataset.audio || btn.dataset.mp3_url,
        mp3_url: btn.dataset.mp3_url || btn.dataset.audio
      };

      if(!beat.id) return;

      let cart = JSON.parse(localStorage.getItem("dopetone_cart")) || [];
      const exists = cart.find(item => item.id == beat.id);

      if(!exists){
        cart.push(beat);
        localStorage.setItem("dopetone_cart", JSON.stringify(cart));
      }

      localStorage.setItem("dopetone_active_beat", JSON.stringify(beat));

      if(typeof updateCartCount === "function"){
        updateCartCount();
      }

      // 🔥 Sync cart to cloud if logged in
      window.syncUserDataToCloud?.();

      window.location.href = `licence-page.html?id=${beat.id}`;
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupGlobalBuyButtons();
});

// ========================================
// 📊 UPDATED: TRACK BEAT PLAYS TO D1 WITH USER ID
// ========================================
export async function trackBeatPlay(beatId) {
  try {
    const userId = window.Auth?.user?.id || 'anonymous';

    await fetch('https://dope-tone-api.dopetone701.workers.dev/api/track-play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        beat_id: beatId,
        user_id: userId // Now D1 knows WHO played it
      })
    });

    // Update local play_count so UI updates instantly
    const beat = window.store.beats.find(b => b.id == beatId);
    if (beat) beat.play_count = (beat.play_count || 0) + 1;

    console.log(`[Dopetone] Tracked play: beat ${beatId} by ${userId}`);

  } catch (err) {
    console.error('Failed to track play:', err);
  }
}

// Make it global so other components can call it
window.trackBeatPlay = trackBeatPlay;
// ---- AUTH BRIDGE – nav + auth modal coordination ----
const navPanel = document.querySelector('.mobile-panel');
const navOverlay = document.getElementById('navOverlay');

function closeNav(){
  navPanel?.classList.remove('active');
  navOverlay?.classList.remove('active');
  document.body.classList.remove('panel-open');
}

function openAuthModal(mode = 'login'){
  // kill nav first, otherwise its blur stays under the auth modal
  closeNav();
  
  const modal = document.getElementById('authModal');
  if(!modal) return false;
  const isSignup = mode === 'signup';
  
  const uGroup = document.getElementById('usernameGroup');
  const avatarWrap = document.getElementById('signupAvatarWrap');
  const title = document.getElementById('authTitle');
  const subtitle = document.getElementById('authSubtitle');
  const submit = document.getElementById('authSubmit');
  const switchText = document.getElementById('switchAuthText');
  const switchBtn = document.getElementById('switchAuthBtn');

  if(uGroup) uGroup.style.display = isSignup ? 'block' : 'none';
  if(avatarWrap) avatarWrap.style.display = isSignup ? 'block' : 'none';
  if(title) title.textContent = isSignup ? 'Create Account' : 'Welcome Back';
  if(subtitle) subtitle.textContent = isSignup ? 'Join the arsenal' : 'Login to access your arsenal';
  if(submit) submit.textContent = isSignup ? 'Create Account' : 'Continue';
  if(switchText) switchText.textContent = isSignup ? 'Already have an account?' : "Don't have an account?";
  if(switchBtn) switchBtn.textContent = isSignup ? 'Login' : 'Sign Up';

  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(()=>document.getElementById('authEmail')?.focus(), 50);
  return true;
}

function closeAuthModal(){
  const modal = document.getElementById('authModal');
  if(modal){
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
  // only restore scroll if nav panel is also closed
  if(!navPanel?.classList.contains('active')){
    document.body.style.overflow = '';
    document.body.classList.remove('panel-open');
    navOverlay?.classList.remove('active');
  }
}

// clean up any leftover blur when auth modal closes – works with your existing auth.js too
const authModalEl = document.getElementById('authModal');
if(authModalEl){
  new MutationObserver(() => {
    if(!authModalEl.classList.contains('active')){
      closeAuthModal();
    }
  }).observe(authModalEl, { attributes: true, attributeFilter: ['class'] });

  document.getElementById('authCloseBtn')?.addEventListener('click', () => setTimeout(closeAuthModal, 30), true);
  authModalEl.addEventListener('click', e => {
    if(e.target === authModalEl) setTimeout(closeAuthModal, 30);
  }, true);
}

// navbar buttons -> auth
document.addEventListener('click', e => {
  const loginEl = e.target.closest('#loginBtn');
  const signupEl = e.target.closest('#signupBtn');
  const accountEl = e.target.closest('#accountBtn');
  const mobileProfileEl = e.target.closest('#mobileProfileBtn');

  if (loginEl || mobileProfileEl) {
    e.preventDefault(); e.stopPropagation();
    if(window.Auth?.showLogin?.()) { closeNav(); return; }
    openAuthModal('login');
    return;
  }
  if (signupEl) {
    e.preventDefault(); e.stopPropagation();
    if(window.Auth?.showSignup?.()) return;
    openAuthModal('signup');
    return;
  }
  if (accountEl) {
    e.preventDefault();
    if(window.Auth?.openAccount?.()) return;
    document.getElementById('accountPanel')?.classList.toggle('active');
  }
}, true);
