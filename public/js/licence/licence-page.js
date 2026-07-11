import { renderSimilarTracks } from "./licence-similar.js"
const API_URL = 'https://api.dopetonevault.com'
const WORKER_URL = API_URL;
const STATS_API = 'https://dopetone-stats.dopetone701.workers.dev';
const getMode = (b) => {
  if (!b) return 'paid';
  let m = (b.monetization_mode || b.monetizationMode || '').toLowerCase().trim();
  if (['free','hybrid','paid'].includes(m)) return m;
  if (m.includes('tagged')) return 'hybrid';
  if (b.is_free == 1 || b.is_free === true) return 'free';
  if (b.has_free_tagged == 1) return 'hybrid';
  return 'paid';
};
function ensureMode(beat){
  if(!beat) return beat;
  const mode = beat.monetization_mode || beat.monetizationMode || (beat.is_free==1?'free': beat.has_free_tagged==1?'hybrid':'paid');
  return {
  ...beat,
    monetization_mode: mode,
    monetizationMode: mode,
    is_free: mode==='free'?1:0,
    has_free_tagged: mode==='hybrid'?1:0,
    price: beat.price?? 29.99
  };
}
const params = new URLSearchParams(window.location.search);
let beatId = params.get("id");
let audio = null;
let selectedLicences = {};
let selectedLicence = null;
let activeCartBeat = null;
let beatsCache = null;
let beatsCacheTime = 0;

// 🚀 INIT - THIS WAS MISSING
window.addEventListener("load", async () => {
    setupPlayer(); setupLike(); setupShare(); setupLicenceSelection();
    setupCheckout(); setupAddToCart(); updateCartCount();
    const cart = JSON.parse(localStorage.getItem("dopetone_cart") || "[]").map(ensureMode);
    if (!beatId && cart.length > 0) {
        const b = cart[0];
        beatId = b.id; activeCartBeat = b; window.currentBeat = b;
        window.__CURRENT_BEAT__ = b;
        document.getElementById("title").textContent = b.title;
        document.getElementById("cover").src = b.cover_url || b.cover || "images/logo.png";
        document.getElementById("genre").textContent = b.genre || "--";
        document.getElementById("bpm").textContent = b.bpm || "--";
document.getElementById("type").textContent = b.type || "--";
document.getElementById("mood").textContent = b.mood || "--";
document.getElementById("key").textContent = b.key || "--";
        document.body.classList.add("active-mode");
        document.body.classList.remove("empty-mode");
        history.replaceState({}, "", `?id=${b.id}`);
        renderSimilarTracks([b]);
        applyMonetizationRules(b);
    } else if (beatId) {
        await loadBeat();
    }
    checkEmptyState(); renderCartBeatRow(); updateSelectedBar(); updateCheckoutTheme();
    setTimeout(() => document.querySelector(`[data-id="${beatId}"]`)?.classList.add("active"), 200);
    setTimeout(initCartScroll, 500);
    setTimeout(forceTitle, 2000);
    setTimeout(nukePlays, 100);
    window.addEventListener('cc_monetize_changed', (e)=>{
      const {beatId:bid,mode}=e.detail||{}; if(!bid || String(bid)!==String(beatId)) return;
      if(window.currentBeat){ window.currentBeat=ensureMode({...window.currentBeat, monetization_mode:mode}); applyMonetizationRules(window.currentBeat); }
    });
});

async function loadBeat(){
    try {
        const cart = JSON.parse(localStorage.getItem("dopetone_cart") || "[]").map(ensureMode);
        if(!beatId) return;
        const cartBeat = cart.find(b => String(b.id)==String(beatId));
        if (cartBeat) {
            if (!beatsCache || Date.now() - beatsCacheTime > 30000) {
                const res = await fetch(`${API_URL}/beats`);
                beatsCache = (await res.json()).map(ensureMode);
                beatsCacheTime = Date.now();
            }
            const freshBeat = beatsCache.find(b => String(b.id)==String(beatId)) || cartBeat;
            window.currentBeat = ensureMode({
  ...cartBeat,
  ...freshBeat,
    monetization_mode: cartBeat.monetization_mode || freshBeat.monetization_mode || 'paid',
    play_count: freshBeat.play_count || 0
            });
            window.__CURRENT_BEAT__ = window.currentBeat;
            updateBeatUI(window.currentBeat);
            return;
        }
        if (!beatsCache || Date.now() - beatsCacheTime > 30000) {
            const res = await fetch(`${API_URL}/beats`);
            beatsCache = (await res.json()).map(ensureMode);
            beatsCacheTime = Date.now();
        }
        const beat = beatsCache.find(b => String(b.id)==String(beatId));
        if(!beat) return;
        window.currentBeat = ensureMode({
            id: beat.id,
            title: beat.title,
            cover: beat.cover_url,
            cover_url: beat.cover_url,
            genre: beat.genre || "--",
            bpm: beat.bpm || "--",
            type: beat.type || "--",
            mood: beat.mood || "--",
            key: beat.key || "--",
            audio: beat.mp3_url,
            play_count: beat.play_count || beat.plays || 0,
            monetization_mode: beat.monetization_mode || getMode(beat) || 'paid',
            has_free_tagged: beat.has_free_tagged || 0,
            price: beat.price||29.99
        });
        window.__CURRENT_BEAT__ = window.currentBeat;
        updateBeatUI(window.currentBeat);
    } catch(err) {
        console.log('loadBeat error:', err);
    }
}

function updateBeatUI(beat) {
    beat = ensureMode(beat);
    safeSet("title", beat.title);
    safeSet("genre", beat.genre);
    safeSet("bpm", beat.bpm);
    safeSet("type", beat.type || "--");
    safeSet("mood", beat.mood || "--");
    safeSet("key", beat.key || "--");
    const cover = document.getElementById("cover");
    if(cover) { cover.src = beat.cover || beat.cover_url || "images/logo.png"; }
    if(beat.audio) audio = new Audio(beat.audio);
    let playEl = document.getElementById("playCount");
    if (!playEl) {
        playEl = document.createElement("div");
        playEl.id = "playCount";
        playEl.className = "beat-plays";
        const titleEl = document.getElementById("title");
        titleEl?.parentNode?.insertBefore(playEl, titleEl.nextSibling);
    }
    const plays = beat.play_count?? 0;
    playEl.textContent = `${plays.toLocaleString()} plays`;
    playEl.style.display = 'block';
    playEl.style.opacity = '1';
    playEl.style.color = '#b3b3b3';
    playEl.style.textAlign = 'center';
    playEl.style.marginTop = '8px';
    updatePrices();
    renderCartBeatRow();
    renderSimilarTracks([beat]);
    setTimeout(forceTitle, 100);
    applyMonetizationRules(beat);
    setTimeout(nukePlays, 100);
}

// ========================================
// 🛒 CART COUNT
// ========================================
function updateCartCount(){
    const cartBtn = document.getElementById("cartBtn");
    const mobileCartBtn = document.getElementById("mobileCartBtn");
    const cart = JSON.parse(localStorage.getItem("dopetone_cart")) || [];
    document.querySelectorAll(".cart-count").forEach(el => { el.textContent = cart.length; });
    const goToCart = () => {
        if(cart.length === 0){ window.location.href = "licence-page.html"; return; }
        const firstBeat = cart[0];
        window.location.href = `licence-page.html?id=${firstBeat.id}`;
    };
   if(cartBtn){ cartBtn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); goToCart(); }); }
   if(mobileCartBtn){ mobileCartBtn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); goToCart(); }); }
}

// ========================================
// 🌫 EMPTY / ACTIVE MODE
// ========================================
function checkEmptyState(){
    const cover = document.getElementById("cover");
    const cart = JSON.parse(localStorage.getItem("dopetone_cart")) || [];
if(cart.length === 0){
    renderSimilarTracks()
    console.log("EMPTY STATE TRIGGERED");
    console.log("EMPTY STATE TRIGGERED");
console.log("currentBeat:", window.currentBeat);
console.log("activeCartBeat:", activeCartBeat);
console.log("beatId:", beatId);
const similarTitle = document.getElementById("similarTitle")
if(similarTitle){ similarTitle.textContent = "Recommended Tracks" }
    beatId = null
    activeCartBeat = null
    window.currentBeat = null
    selectedLicence = null
    audio = null
    window.history.replaceState({}, "", "licence-page.html")
    document.body.classList.add("empty-mode")
    document.body.classList.remove("active-mode")
    safeSet("title", "CART EMPTY")
    safeSet("genre", "--")
    safeSet("bpm", "--")
    safeSet("type", "--")
    safeSet("mood", "--")
    safeSet("key", "--")
    const cover = document.getElementById("cover")
    if(cover){ cover.src = "images/logo.png" }
    const playBtn = document.getElementById("playBtn")
    if(playBtn){ playBtn.textContent = "▶" }
document.querySelectorAll(".old").forEach(el => { el.textContent = "$00" })
document.querySelectorAll(".new").forEach(el => { el.textContent = "$00" })
    localStorage.removeItem("dopetone_licences")
    selectedLicences = {}
    renderCartBeatRow()
    updateSelectedBar()
    updateCheckoutTheme()
    return
}
    const similarTitle = document.getElementById("similarTitle")
if(similarTitle){ similarTitle.textContent = "Similar Tracks" }
    document.body.classList.remove("empty-mode");
    document.body.classList.add("active-mode");
}

// ========================================
// 🌌 BG
// ========================================
function applyDynamicBG(image){
    document.body.style.background = `
    radial-gradient(circle at 20% 30%, rgba(255,255,255,.08), transparent 40%),
    radial-gradient(circle at 80% 70%, rgba(255,255,255,.05), transparent 40%),
    url(${image}) center/cover no-repeat fixed
    `;
}

// ========================================
// 🔗 SHARE
// ========================================
function setupShare(){
    const shareBtn = document.getElementById("shareBtn");
    if(!shareBtn) return;
    shareBtn.addEventListener("click", async() => {
        const beat = window.currentBeat;
        const shareData = { title: beat?.title || 'Dope Tone Beat', text: `🔥 Check out "${beat?.title}" on Dope Tone`, url: window.location.href };
        if (navigator.share && navigator.canShare?.(shareData)) {
            try { await navigator.share(shareData); console.log('Shared successfully'); } catch (err) { if (err.name!== 'AbortError') { console.log('Share failed:', err); fallbackCopy(); } }
        } else { fallbackCopy(); }
    });
    async function fallbackCopy() {
        try { await navigator.clipboard.writeText(window.location.href); showToast('Link copied 🔗'); } catch(err) { console.log(err); }
    }
}
function showToast(msg) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.cssText = `position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.9); color: white; padding: 12px 24px; border-radius: 24px; z-index: 99999; font-size: 14px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1);`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// ========================================
// 🎯 LICENCE SELECT
// ========================================
function setupLicenceSelection(){
    const cards = document.querySelectorAll(".licence-card");
    const buttons = document.querySelectorAll(".pay-btn");
    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            const card = btn.closest(".licence-card"); if(!card) return;
            if(card.classList.contains('locked')) return; // 🔥 BLOCK LOCKED
            cards.forEach(c => { c.classList.remove("faded"); if(c!== card &&!c.classList.contains('locked')){ c.classList.add("faded"); } });
            card.classList.add("active");
            cards.forEach(c => { if(c!== card &&!c.classList.contains('locked')){ c.classList.add("faded"); } });
            selectedLicences[beatId] = { name: btn.dataset.name, price: Number(btn.dataset.price) };
            localStorage.setItem("dopetone_licences", JSON.stringify(selectedLicences));
            updateSelectedBar();
            updateCheckoutTheme();
        });
    });
}

// ========================================
// 🔥 CART ROW - REMEMBERS MONETIZATION
// ========================================
function renderCartBeatRow(){
    const wrap = document.querySelector("#cartBeatRow");
    if(!wrap) return;
    let cart = JSON.parse(localStorage.getItem("dopetone_cart") || "[]").map(ensureMode);
    localStorage.setItem("dopetone_cart", JSON.stringify(cart));
    wrap.innerHTML = "";
    cart.forEach(beat => {
        const loggedKey = `d1_cart_logged_${beat.id}`;
        if (!sessionStorage.getItem(loggedKey)) {
            fetch(`${STATS_API}/api/stats/event`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({beatId: parseInt(beat.id), eventType: 'cart'}) }).catch(()=>{});
            sessionStorage.setItem(loggedKey, '1');
        }
    });
    cart.forEach((beat) => {
        const b = ensureMode(beat);
        const card = document.createElement("div");
        card.className = "cart-beat-card";
        card.dataset.id = b.id;
        card.dataset.mode = b.monetization_mode;
        if(String(b.id) === String(activeCartBeat?.id || beatId)){ card.classList.add("active"); }
        card.innerHTML = `
            <button class="remove-cart-track" data-id="${b.id}">✕</button>
            <img src="${b.cover || b.cover_url || "images/logo.png"}">
            <h4>${b.title}</h4>
            <span style="position:absolute;top:4px;left:4px;font-size:8px;padding:2px 4px;border-radius:3px;font-weight:800;color:#fff;background:${b.monetization_mode==='free'?'#3b82f6':b.monetization_mode==='hybrid'?'#f59e0b':'#ff003c'}">${b.monetization_mode.toUpperCase()}</span>
        `;
        const removeBtn = card.querySelector(".remove-cart-track");
        removeBtn.addEventListener("click", (e) => { e.stopPropagation(); e.preventDefault(); removeBeatFromCart(e, b.id); });
        card.addEventListener("click", async () => {
            document.querySelectorAll(".cart-beat-card").forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            await switchActiveBeat(b);
            const licenceBeat = { id: b.id, title: b.title, cover_url: b.cover || b.cover_url, mp3_url: b.audio, genre: b.genre, bpm: b.bpm };
            window.__LICENCE_BEAT__ = licenceBeat;
            window.__CURRENT_BEAT__ = b;
            window.__ACTIVE_TRACK_KEY__ = null;
            window.globalPlayer?.play(0, [licenceBeat], `licence_${b.id}_${Date.now()}`);
            updateSelectedBar();
            updateCheckoutTheme();
            renderSimilarTracks([window.currentBeat]);
            setTimeout(forceTitle, 100);
            setTimeout(nukePlays, 100);
        });
        wrap.appendChild(card);
    });
}

// ========================================
// 💳 STRIPE CHECKOUT
// ========================================
function setupCheckout(){
    const checkoutBtn = document.getElementById("checkoutBtn");
    if(!checkoutBtn) return;
    checkoutBtn.onclick = async () => {
        const licences = JSON.parse(localStorage.getItem("dopetone_licences")) || {};
        if(Object.keys(licences).length === 0){ alert("Select a licence first"); return; }
        console.log("CHECKOUT DATA", licences);
        const allFree = Object.values(licences).every(l=>l.price==0 || l.name==='FREE');
        if(allFree){ for(const bid in licences){ const b=(JSON.parse(localStorage.getItem("dopetone_cart"))||[]).find(x=>String(x.id)===String(bid)); if(b){ const a=document.createElement('a'); a.href=b.audio||b.mp3_url||b.audio; a.download=`${b.title}.mp3`; a.click(); } } alert("🔥 FREE beats downloaded!"); return; }
        for(const beatId in licences){
            const licence = licences[beatId];
            fetch(`${WORKER_URL}/api/purchase`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ beat_id: beatId, user_id: 'anonymous', amount: licence.price * 100, license_type: licence.name.toLowerCase() }) }).catch(()=>{});
        }
        alert("Stripe Ready 🔥");
    };
}

// ========================================
// 🌈 CHECKOUT COLORS
// ========================================
function updateCheckoutTheme(){
    document.body.classList.remove("selected-free","selected-basic","selected-pro","selected-exclusive");
    const activeCards = document.querySelectorAll(".licence-card.active");
    activeCards.forEach(card => {
        if(card.classList.contains("free")){ document.body.classList.add("selected-free"); }
        if(card.classList.contains("basic")){ document.body.classList.add("selected-basic"); }
        if(card.classList.contains("pro")){ document.body.classList.add("selected-pro"); }
        if(card.classList.contains("exclusive")){ document.body.classList.add("selected-exclusive"); }
    });
}
    document.body.classList.remove("empty-mode");
    document.body.classList.add("active-mode");

// ========================================
// 💰 UPDATE PRICES
// ========================================
function updatePrices(){
    const isLocked = document.querySelector('.licence-card.locked');
    if (isLocked && getMode(window.currentBeat) === 'free') { return; }
    const cart = JSON.parse(localStorage.getItem("dopetone_cart")) || [];
    if(cart.length === 0){ document.querySelectorAll(".old").forEach(el => { el.textContent = "$00"; }); document.querySelectorAll(".new").forEach(el => { el.textContent = "$00"; }); return; }
    const prices = { free:0, basic:19, pro:49, exclusive:199 };
    Object.keys(prices).forEach(type => {
        const card = document.querySelector(`.licence-card.${type}`); if(!card) return;
        const oldPrice = card.querySelector(".old"); const newPrice = card.querySelector(".new");
        const value = prices[type];
        if(cart.length === 0){ if(oldPrice){ oldPrice.textContent = "$00"; } if(newPrice){ newPrice.textContent = "$00"; } return; }
        if(oldPrice){ oldPrice.textContent = `$${value + 20}`; }
        if(newPrice){ newPrice.textContent = `$${value}`; }
    });
}

// ========================================
// 🧼 SAFE SET
// ========================================
function safeSet(id, value){ const el = document.getElementById(id); if(!el) return; el.textContent = value || "--"; }

// ========================================
// ▶ PLAYER
// ========================================
function setupPlayer(){
    const playBtn = document.getElementById("playBtn");
    if(!playBtn) return;
    playBtn.addEventListener("click", async () => {
        const beat = window.currentBeat; if(!beat) return;
        const licenceBeat = { id: beat.id, title: beat.title, cover_url: beat.cover || beat.cover_url || "images/logo.png", mp3_url: beat.audio, genre: beat.genre, bpm: beat.bpm };
        const sameTrack = String(window.__LICENCE_ACTIVE_ID__) === String(licenceBeat.id);
        const isPlaying = window.globalPlayer?.isPlaying?.();
        if (sameTrack && isPlaying) { window.globalPlayer.pause(); return; }
        if (sameTrack &&!isPlaying) { window.globalPlayer.resume(); return; }
        window.__LICENCE_ACTIVE_ID__ = licenceBeat.id;
        window.__CURRENT_BEAT__ = ensureMode(licenceBeat);
        window.__ACTIVE_TRACK_KEY__ = null;
        window.globalPlayer?.play(0, [licenceBeat], `licence_${beat.id}`);
        async function incrementPlayCount(beatId) { await fetch(`${API_URL}/beats/${beatId}/play`, { method: 'POST' }); }
        document.getElementById('playBtn').addEventListener('click', () => { incrementPlayCount(window.currentBeat.id); });
    });
    document.addEventListener("playerPlay", () => { playBtn.textContent = "⏸"; });
    document.addEventListener("playerPause", () => { playBtn.textContent = "▶"; });
    document.addEventListener("trackChange", e => {
        const beat = e.detail; if(!beat) return;
        const currentId = beat.id; const licenceId = window.currentBeat?.id;
        if (String(currentId) === String(licenceId)) { playBtn.textContent = "⏸"; } else { playBtn.textContent = "▶"; }
    });
}

// ========================================
// ❤️ LICENCE LIKE SYSTEM FINAL
// ========================================
function setupLike(){
    const likeBtn = document.getElementById("likeBtn")
    const heartIcon = document.getElementById("heartIcon")
    if(!likeBtn ||!heartIcon) return
    function updateLikeUI(){
        const beat = window.__CURRENT_BEAT__
        if(!beat) return
        const playlists = window.getPlaylists?.() || []
        const liked = playlists.find(p => p.isLiked)
        const isLiked = liked?.beats?.some(b => b.id === beat.id)
        const btn = document.getElementById('likeBtn');
        if (isLiked) { btn.classList.add('liked'); heartIcon.setAttribute('fill', 'currentColor'); } else { btn.classList.remove('liked'); heartIcon.setAttribute('fill', 'none'); }
        const mpLike = document.getElementById("mpLike")
        if(mpLike){ mpLike.textContent = isLiked? "❤️" : "♡" }
        const desktopHeart = document.querySelector(".love-heart")
        if(desktopHeart){ desktopHeart.textContent = isLiked? "❤️" : "♡" }
    }
    likeBtn.addEventListener("click", () => {
        const beat = window.__CURRENT_BEAT__
        if(!beat) return
        window.toggleBeatLike?.()
        updateLikeUI()
    })
    window.updateLicenceLikeUI = updateLikeUI
}

// ========================================
// 🛒 ADD TO CART + D1 SYNC
// ========================================
function setupAddToCart(){
    const addBtn = document.getElementById("addBtn");
    if(!addBtn) return;
    addBtn.addEventListener("click", async () => {
        if(!window.currentBeat) return;
        const panel = document.getElementById("quickPlaylistPanel");
        if(panel){
            const playlists = window.getPlaylists?.()?.filter(p =>!p.isLiked) || [];
            panel.innerHTML = "";
            playlists.forEach(playlist => {
                const btn = document.createElement("button");
                btn.className = "quick-playlist-item";
                btn.textContent = playlist.name;
                btn.onclick = (e) => { e.stopPropagation(); window.addBeatToPlaylist?.(playlist.id, window.currentBeat); panel.classList.remove("active"); };
                panel.appendChild(btn);
            });
            const createBtn = document.createElement("button");
            createBtn.className = "quick-playlist-item create";
            createBtn.textContent = "+ Create Playlist";
            createBtn.onclick = (e) => { e.stopPropagation(); panel.classList.remove("active"); window.openPlaylistModal?.(window.currentBeat); };
            panel.appendChild(createBtn);
            panel.classList.toggle("active");
        }
        let cart = JSON.parse(localStorage.getItem("dopetone_cart")) || [];
        const beat = ensureMode({
            id: window.currentBeat.id,
            title: window.currentBeat.title,
            cover: window.currentBeat.cover,
            cover_url: window.currentBeat.cover_url,
            genre: window.currentBeat.genre,
            bpm: window.currentBeat.bpm,
            type: window.currentBeat.type,
            mood: window.currentBeat.mood,
            key: window.currentBeat.key,
            audio: window.currentBeat.audio,
            play_count: window.currentBeat.play_count || 0,
            monetization_mode: window.currentBeat.monetization_mode || getMode(window.currentBeat) || 'paid',
            has_free_tagged: window.currentBeat.has_free_tagged || 0,
            price: window.currentBeat.price||29.99
        });
        const exists = cart.find(item => String(item.id)==String(beat.id));
        if(exists) return;
        cart.push(beat);
        localStorage.setItem("dopetone_cart", JSON.stringify(cart));
        try { await fetch(`${WORKER_URL}/api/stats/track`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ beat_id: parseInt(beat.id), event_type: 'cart' }) }); console.log('✅ Cart logged to D1:', beat.id); } catch (err) { console.log('❌ Cart log failed:', err); }
        if(cart.length === 1){ activeCartBeat = beat; beatId = beat.id; switchActiveBeat(beat); }
        renderCartBeatRow();
        updateCartCount();
        document.body.classList.remove("empty-mode");
    });
}

// ========================================
// 🔥 SWITCH ACTIVE TRACK - REMEMBERS MONETIZATION
// ========================================
async function switchActiveBeat(beat){
console.log("SWITCH ACTIVE CALLED", beat, "MODE:", beat.monetization_mode);
    const fixed = ensureMode(beat);
    activeCartBeat = fixed;
    renderCartBeatRow();
    beatId = fixed.id;
    const url = new URL(window.location);
    url.searchParams.set("id", fixed.id);
    window.history.pushState({}, "", url);
    window.updateLicenceLikeUI?.()
    window.currentBeat = fixed;
    window.__CURRENT_BEAT__ = fixed
    try{
      let cart = JSON.parse(localStorage.getItem("dopetone_cart")||"[]").map(ensureMode);
      cart = cart.map(c => String(c.id)===String(fixed.id)? fixed : ensureMode(c));
      localStorage.setItem("dopetone_cart", JSON.stringify(cart));
    }catch{}
    selectedLicences = JSON.parse(localStorage.getItem("dopetone_licences")) || {};
    const savedLicence = selectedLicences[fixed.id];
    document.querySelectorAll(".licence-card").forEach(card => { card.classList.remove("active","faded"); });
    if(!savedLicence){
        selectedLicence = null;
        document.querySelectorAll(".licence-card").forEach(card => { card.classList.remove("active","faded"); });
    }else{
        if(getMode(fixed)==='paid' && savedLicence.name==='FREE'){ delete selectedLicences[fixed.id]; localStorage.setItem("dopetone_licences", JSON.stringify(selectedLicences)); selectedLicence=null; }
        else if(getMode(fixed)==='free' && savedLicence.name!=='FREE'){ delete selectedLicences[fixed.id]; localStorage.setItem("dopetone_licences", JSON.stringify(selectedLicences)); selectedLicence=null; }
        else {
            document.querySelectorAll(".licence-card").forEach(card => {
                const btn = card.querySelector(".pay-btn"); if(!btn) return;
                const licenceName = btn.dataset.name;
                if(licenceName === savedLicence.name){ card.classList.add("active"); }else{ card.classList.add("faded"); }
            });
            selectedLicence = savedLicence;
        }
    }
document.querySelectorAll(".cart-beat-card").forEach(card => {
    const title = card.querySelector("h4")?.textContent?.trim()
    if(title === fixed.title){ card.classList.add("active") }
})
setTimeout(() => { window.refreshLikeUI?.(); window.updateLicenceLikeUI?.(); loadGlobalLikeCount(fixed.id) }, 120)
    updateSelectedBar();
    updateCheckoutTheme();
    safeSet("title", fixed.title);
    safeSet("genre", fixed.genre);
    safeSet("bpm", fixed.bpm);
    safeSet("type", fixed.type || "--");
    safeSet("mood", fixed.mood || "--");
    safeSet("key", fixed.key || "--");
let playEl = document.getElementById("playCount");
if (playEl) { const plays = fixed.play_count?? 0; document.getElementById("playCount").textContent = `${plays.toLocaleString()} plays`; }
    const cover = document.getElementById("cover");
    if(cover){ cover.src = fixed.cover || fixed.cover_url || "images/logo.png"; applyDynamicBG(fixed.cover || fixed.cover_url); }
    if(fixed.audio){ audio = new Audio(fixed.audio); }
    if(selectedLicence){
        document.getElementById("totalPrice").textContent = `$${selectedLicence.price}`;
        document.getElementById("checkoutBtn").textContent = `Checkout ${selectedLicence.name}`;
        updateSelectedBar();
    }else{
        document.getElementById("totalPrice").textContent = "$0";
        document.getElementById("checkoutBtn").textContent = "Checkout";
    }
    const allCards = document.querySelectorAll(".cart-beat-card");
    allCards.forEach(card => { card.classList.remove("active"); });
    allCards.forEach(card => { if(card.dataset.id == fixed.id){ card.classList.add("active"); } });
    document.querySelectorAll(".cart-beat-card").forEach(card => {
        const title = card.querySelector("h4")?.textContent?.trim();
        if(title === fixed.title){ card.classList.add("active"); }
    });
    renderSimilarTracks([fixed]);
    applyMonetizationRules(fixed);
    window.currentBeat.monetization_mode = fixed.monetization_mode || 'paid';
}

// =====================================
// 🌍 LOAD GLOBAL LIKE COUNT
// =====================================
async function loadGlobalLikeCount(beatId){
    if(!beatId) return;
    try {
        const res = await fetch(`${API_URL}/beats`);
        const beats = await res.json();
        const beat = beats.find(b => b.id == beatId);
        const count = beat?.like_count || 0;
        const countEl = document.getElementById("likeCount");
        if(countEl) countEl.textContent = count;
    } catch(err) { console.log("like count error:", err); }
}

// ========================================
// 📊 UPDATE BAR
// ========================================
function updateSelectedBar(){
    const selectedWrap = document.querySelector(".selected-licence");
    if(!selectedWrap) return;
    const cart = JSON.parse(localStorage.getItem("dopetone_cart")) || [];
    selectedLicences = JSON.parse(localStorage.getItem("dopetone_licences")) || {};
    let totalPrice = 0; let count = 0; let licenceHTML = "";
    cart.forEach(beat => {
        const licence = selectedLicences[beat.id]; if(!licence) return;
        totalPrice += Number(licence.price); count++;
        licenceHTML += `<div class="selected-track-line"><div class="selected-track-info"><strong>${beat.title}</strong><span class="licence-color-${licence.name.toLowerCase()}">${licence.name} • $${licence.price}</span></div><button class="remove-selected-licence" data-beat="${beat.id}">✕</button></div>`;
    });
    if(licenceHTML === ""){
        selectedWrap.innerHTML = `<div class="selected-left"><h3>Selected<br>Licence</h3><div class="total-box"><span>Total</span><div id="totalPrice">$0</div></div></div><div class="selected-right"><div id="selectedName">None</div><button id="checkoutBtn">Checkout</button></div>`;
        setupCheckout(); return;
    }
    selectedWrap.innerHTML = `<div class="selected-left"><h3>Selected<br>Licence</h3><div class="total-box"><span>Total</span><div id="totalPrice">$${totalPrice}</div></div></div><div class="selected-right"><div id="selectedName">${licenceHTML}</div><button id="checkoutBtn">Checkout ${count} Tracks</button></div>`;
    document.querySelectorAll(".remove-selected-licence").forEach(btn => {
        btn.addEventListener("click", () => {
            const beatId = btn.dataset.beat;
            delete selectedLicences[beatId];
            localStorage.setItem("dopetone_licences", JSON.stringify(selectedLicences));
            document.querySelectorAll(".licence-card").forEach(card => { card.classList.remove("active","faded"); });
            updateSelectedBar();
        });
    });
    setupCheckout();
}

// ========================================
// 🗑 REMOVE TRACK FROM CART + D1 SYNC
// ========================================
async function removeBeatFromCart(event, id){
    event.stopPropagation(); event.preventDefault();
    let cart = JSON.parse(localStorage.getItem("dopetone_cart")) || [];
    cart = cart.filter(beat => String(beat.id)!=String(id));
    localStorage.setItem("dopetone_cart", JSON.stringify(cart));
    let licences = JSON.parse(localStorage.getItem("dopetone_licences") || "{}");
    delete licences[id];
    localStorage.setItem("dopetone_licences", JSON.stringify(licences));
    updateCartCount();
    if(cart.length === 0){
        beatId = null; activeCartBeat = null; selectedLicence = null; window.currentBeat = null; if(audio){ audio.pause(); audio.currentTime = 0; } audio = null;
        document.body.classList.add("empty-mode"); document.body.classList.remove("active-mode");
        safeSet("title","CART EMPTY"); safeSet("genre","--"); safeSet("bpm","--"); safeSet("type","--"); safeSet("mood","--"); safeSet("key","--");
        const cover = document.getElementById("cover"); if(cover) cover.src = "images/logo.png";
        document.getElementById("selectedName").textContent = "None"; document.getElementById("totalPrice").textContent = "$0"; document.getElementById("checkoutBtn").textContent = "Checkout";
        window.history.replaceState({}, "", "licence-page.html");
        selectedLicences = {}; localStorage.removeItem("dopetone_licences");
        document.querySelectorAll(".licence-card").forEach(card => { card.classList.remove("active", "faded", "locked"); });
        document.body.style.background = "#05070d";
        document.querySelectorAll(".licence-card.old").forEach(el => el.textContent = "$00");
        document.querySelectorAll(".licence-card.new").forEach(el => el.textContent = "$00");
        renderCartBeatRow(); renderSimilarTracks(); checkEmptyState(); updateSelectedBar(); updateCheckoutTheme(); return;
    }
    if(String(id) === String(beatId)) {
        const nextBeat = cart[0].map? cart[0] : ensureMode(cart[0]);
        beatId = nextBeat.id; activeCartBeat = nextBeat;
        const url = new URL(window.location); url.searchParams.set("id", beatId); window.history.replaceState({}, "", url);
        switchActiveBeat(nextBeat);
    }
    renderCartBeatRow(); checkEmptyState(); renderSimilarTracks(); updateSelectedBar(); updateCheckoutTheme();
}

document.addEventListener("DOMContentLoaded", () => {
    const playBtn = document.getElementById("playBtn")
    if(!playBtn) return
    playBtn.addEventListener("click", async () => {
        const beat = window.__LICENCE_BEAT__
        if(!beat) return
        window.globalPlayer.play(0, [beat], "licence-page")
    })
})
window.removeBeatFromCart = removeBeatFromCart
window.renderCartBeatRow = renderCartBeatRow
window.updateCartCount = updateCartCount
window.checkEmptyState = checkEmptyState
window.switchActiveBeat = switchActiveBeat

// ========================================
// 🖱 SCROLL - BRUTE FORCE
// ========================================
function initCartScroll() {
    const slider = document.getElementById("cartBeatRow");
    if(!slider) return;
    let isDown = false, startX, scrollLeft;
    slider.onmousedown = (e) => {
        if(e.target.closest(".remove-cart-track")) return;
        isDown = true; slider.style.cursor = 'grabbing'; startX = e.pageX; scrollLeft = slider.scrollLeft; e.preventDefault();
    };
    slider.onmouseleave = () => { isDown = false; slider.style.cursor = 'grab'; };
    slider.onmouseup = () => { isDown = false; slider.style.cursor = 'grab'; };
    slider.onmousemove = (e) => { if(!isDown) return; e.preventDefault(); slider.scrollLeft = scrollLeft - (e.pageX - startX) * 2; };
    slider.onwheel = (e) => {
        const hasOverflow = slider.scrollWidth > slider.clientWidth;
        const isOverCard = e.target.closest('.cart-beat-card');
        if (!hasOverflow ||!isOverCard) return;
        const atStart = slider.scrollLeft <= 0;
        const atEnd = slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 1;
        if ((atStart && e.deltaY < 0) || (atEnd && e.deltaY > 0)) return;
        e.preventDefault(); slider.scrollLeft += e.deltaY;
    };
    slider.style.overflowX = "auto"; slider.style.cursor = "grab";
}
setTimeout(initCartScroll, 500);
window.addEventListener("load", () => setTimeout(initCartScroll, 1000));
function forceTitle() {
    const cart = JSON.parse(localStorage.getItem("dopetone_cart") || "[]");
    if (cart.length === 0) return;
    const beat = window.currentBeat || cart[0];
    const titleEl = document.getElementById("title");
    if (titleEl && beat && beat.title) { titleEl.textContent = beat.title; titleEl.style.cssText = "opacity:1!important;visibility:visible!important"; console.log("✅ TITLE SET:", beat.title); } else { console.log("❌ TITLE FAILED:", {titleEl:!!titleEl, beat:!!beat, title: beat?.title}); }
}

// 🔥 MONETIZATION CONTROLLER - FINAL CORRECT RULES
function applyMonetizationRules(beat) {
    beat = ensureMode(beat);
    const mode = getMode(beat) || 'paid';
    console.log('🔥 APPLYING MODE:', mode, 'for beat:', beat.title);
    const cards = document.querySelectorAll('.licence-card');
    const freeCard = document.querySelector('.licence-card.free');
    const paidCards = document.querySelectorAll('.licence-card.basic,.licence-card.pro,.licence-card.exclusive');
    cards.forEach(c => {
        c.classList.remove('locked', 'auto-selected'); c.style.pointerEvents = 'auto'; c.style.opacity = '1'; c.style.filter='none';
        const oldPrice = c.querySelector('.old'); const newPrice = c.querySelector('.new');
        if (oldPrice && newPrice) {
            const type = c.classList.contains('free')? 'free' : c.classList.contains('basic')? 'basic' : c.classList.contains('pro')? 'pro' : 'exclusive';
            const prices = {free:0, basic:19, pro:49, exclusive:199};
            oldPrice.textContent = `$${prices[type] + 20}`; newPrice.textContent = `$${prices[type]}`;
            const b=c.querySelector('.pay-btn'); if(b){ b.disabled=false; b.style.cursor='pointer'; }
        }
    });
    if (mode === 'free') {
        console.log('✅ FREE MODE - only FREE clickable');
        paidCards.forEach(c => {
            c.classList.add('locked'); c.style.pointerEvents = 'none'; c.style.opacity = '0.25'; c.style.filter='grayscale(1)';
            c.querySelector('.old').textContent = '$00'; c.querySelector('.new').textContent = '$00';
            const btn=c.querySelector('.pay-btn'); if(btn){ btn.disabled=true; btn.style.cursor='not-allowed'; }
        });
        if (freeCard) {
            freeCard.classList.add('auto-selected', 'active'); freeCard.style.pointerEvents='auto'; freeCard.style.opacity='1';
            selectedLicences[beat.id] = { name: 'FREE', price: 0 };
            localStorage.setItem('dopetone_licences', JSON.stringify(selectedLicences));
            setTimeout(() => { updateSelectedBar(); updateCheckoutTheme(); }, 100);
        }
    } else if (mode === 'paid') {
        console.log('✅ PAID MODE - FREE locked');
        if (freeCard) {
            freeCard.classList.add('locked'); freeCard.style.pointerEvents = 'none'; freeCard.style.opacity = '0.25'; freeCard.style.filter='grayscale(1)';
            freeCard.querySelector('.old').textContent = '$00'; freeCard.querySelector('.new').textContent = '$00';
            const btn=freeCard.querySelector('.pay-btn'); if(btn){ btn.disabled=true; btn.style.cursor='not-allowed'; }
            if(selectedLicences[beat.id]?.name==='FREE'){ delete selectedLicences[beat.id]; localStorage.setItem('dopetone_licences', JSON.stringify(selectedLicences)); }
        }
        paidCards.forEach(c=>{ c.classList.remove('locked'); c.style.pointerEvents='auto'; c.style.opacity='1'; c.style.filter='none'; });
    } else {
        console.log('✅ HYBRID MODE - all unlocked');
    }
}
async function nukePlays() {
    const beat = window.currentBeat; if (!beat) return;
    if (beat.play_count === undefined) {
        try { const r = await fetch(`${API_URL}/beats`); const d = await r.json(); const f = d.find(x => String(x.id)==String(beat.id)); if (f) beat.play_count = f.play_count || 0; } catch(e) {}
    }
    let el = document.getElementById("playCount");
    if (!el) { el = document.createElement("div"); el.id = "playCount"; el.setAttribute("style", "all:unset!important;display:block!important;visibility:visible!important;opacity:1!important;position:relative!important;width:100%!important;height:auto!important;z-index:999999!important;"); }
    const title = document.getElementById("title");
    if (title?.parentNode && el.parentNode!== title.parentNode) { title.parentNode.insertBefore(el, title.nextSibling); }
    const plays = beat.play_count?? 0;
    el.innerHTML = `<div style="all:unset!important;display:block!important;color:#b3b3b3!important;font-size:14px!important;text-align:center!important;margin:8px 0!important;padding:0!important;opacity:1!important;visibility:visible!important;">${plays.toLocaleString()} plays</div>`;
    el.style.cssText = "all:unset!important;display:block!important;visibility:visible!important;opacity:1!important;position:relative!important;z-index:999999!important;width:100%!important;text-align:center!important;";
}
setInterval(nukePlays, 300);
