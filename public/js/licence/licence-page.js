import { renderSimilarTracks } from "./licence-similar.js"
import { setupCheckout } from "./checkout.js";

// ==================== REAL APIS - PRO ====================
const API_URL = 'https://api.dopetonevault.com';
const D1_API_URL = 'https://dope-tone-api.dopetone701.workers.dev';
const WORKER_URL = API_URL;
const STATS_API = 'https://dopetone-stats.dopetone701.workers.dev';
const STRIPE_WORKER_URL = 'https://dopetone-stripe.dopetone701.workers.dev';

// ==================== PRO SAFE HELPERS ====================
const safeParse = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v? JSON.parse(v) : fallback; }
  catch { return fallback; }
};
const safeSetItem = (k,v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} };
const safeGet = (id) => document.getElementById(id);

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
    price: beat.price?? beat.basic_price?? 29.99,
    type_beat: beat.type_beat || beat.typeBeat || beat.type || beat.beat_type || "--",
    type: beat.type_beat || beat.typeBeat || beat.type || beat.beat_type || "--"
  };
}

const calcPro = (basic) => Number((Number(basic) * 49 / 19).toFixed(2));
const calcExclusive = (basic) => Number((Number(basic) * 199 / 19).toFixed(2));

const params = new URLSearchParams(window.location.search);
let beatId = params.get("id");
let audio = null;
let selectedLicences = safeParse("dopetone_licences",{});
let selectedLicence = null;
let activeCartBeat = null;
let beatsCache = null;
let beatsCacheTime = 0;

// ==================== INIT - PRO ORDER ====================
window.addEventListener("load", async () => {
    setupCheckout(); // PRO: must be first so window.createStripeCheckout exists
    setupPlayer();
    setupLike();
    setupShare();
    setupLicenceSelection();
    setupAddToCart();
    updateCartCount();

    const cart = safeParse("dopetone_cart", []).map(ensureMode);

    if (!beatId && cart.length > 0) {
        const b = cart[0];
        beatId = b.id;
        activeCartBeat = b;
        window.currentBeat = b;
        window.__CURRENT_BEAT__ = b;
        safeGet("title")&&(safeGet("title").textContent = b.title);
        safeGet("cover")&&(safeGet("cover").src = b.cover_url || b.cover || "images/logo.png");
        safeGet("genre")&&(safeGet("genre").textContent = b.genre || "--");
        safeGet("bpm")&&(safeGet("bpm").textContent = b.bpm || "--");
        safeGet("type")&&(safeGet("type").textContent = b.type_beat || b.type || "--");
        safeGet("mood")&&(safeGet("mood").textContent = b.mood || "--");
        safeGet("key")&&(safeGet("key").textContent = b.key || "--");
        document.body.classList.add("active-mode");
        document.body.classList.remove("empty-mode");
        history.replaceState({}, "", `?id=${b.id}`);
        renderSimilarTracks([b]);
        updatePrices(b);
        applyMonetizationRules(b);
    } else if (beatId) {
        await loadBeat();
    }

    checkEmptyState();
    renderCartBeatRow();
    updateSelectedBar();
    updateCheckoutTheme();

    setTimeout(() => document.querySelector(`[data-id="${beatId}"]`)?.classList.add("active"), 200);
    setTimeout(initCartScroll, 500);
    setTimeout(forceTitle, 2000);
    setTimeout(nukePlays, 100);

    window.addEventListener('cc_monetize_changed', (e)=>{
      const {beatId:bid,mode}=e.detail||{};
      if(!bid || String(bid)!==String(beatId)) return;
      if(window.currentBeat){
        window.currentBeat=ensureMode({...window.currentBeat, monetization_mode:mode});
        updatePrices(window.currentBeat);
        applyMonetizationRules(window.currentBeat);
      }
    });
});

// ==================== LOAD BEAT FROM D1 ====================
async function loadBeat(){
    try {
        const cart = safeParse("dopetone_cart", []).map(ensureMode);
        if(!beatId) return;
        const cartBeat = cart.find(b => String(b.id)==String(beatId));
        if (cartBeat) {
            if (!beatsCache || Date.now() - beatsCacheTime > 30000) {
                const res = await fetch(`${API_URL}/beats`);
                const fresh = await res.json();
                beatsCache = fresh.map(ensureMode);
                beatsCacheTime = Date.now();
            }
            const freshBeat = beatsCache.find(b => String(b.id)==String(beatId)) || cartBeat;
            window.currentBeat = ensureMode({
              ...cartBeat,
              ...freshBeat,
                monetization_mode: cartBeat.monetization_mode || freshBeat.monetization_mode || 'paid',
                play_count: freshBeat.play_count || 0,
                price: freshBeat.price || cartBeat.price || 29.99
            });
            window.__CURRENT_BEAT__ = window.currentBeat;
            updateBeatUI(window.currentBeat);
            return;
        }
        if (!beatsCache || Date.now() - beatsCacheTime > 30000) {
            const res = await fetch(`${API_URL}/beats`);
            const fresh = await res.json();
            beatsCache = fresh.map(ensureMode);
            beatsCacheTime = Date.now();
        }
        const beat = beatsCache.find(b => String(b.id)==String(beatId));
        if(!beat) return;
        window.currentBeat = ensureMode({
            id: beat.id, title: beat.title, cover: beat.cover_url, cover_url: beat.cover_url,
            genre: beat.genre || "--", bpm: beat.bpm || "--",
            type: beat.type_beat || beat.typeBeat || beat.type || "--",
            type_beat: beat.type_beat || beat.typeBeat || beat.type || "--",
            mood: beat.mood || "--", key: beat.key || "--",
            audio: beat.mp3_url, play_count: beat.play_count || beat.plays || 0,
            monetization_mode: beat.monetization_mode || getMode(beat) || 'paid',
            has_free_tagged: beat.has_free_tagged || 0,
            price: beat.price || beat.basic_price || 29.99
        });
        window.__CURRENT_BEAT__ = window.currentBeat;
        updateBeatUI(window.currentBeat);
    } catch(err) { console.log('loadBeat error:', err); }
}

function updateBeatUI(beat) {
    beat = ensureMode(beat);
    safeSet("title", beat.title); safeSet("genre", beat.genre); safeSet("bpm", beat.bpm);
    safeSet("type", beat.type_beat || beat.type || "--"); safeSet("mood", beat.mood || "--"); safeSet("key", beat.key || "--");
    const cover = safeGet("cover"); if(cover) { cover.src = beat.cover || beat.cover_url || "images/logo.png"; }
    if(beat.audio) audio = new Audio(beat.audio);
    let playEl = safeGet("playCount");
    if (!playEl) {
        playEl = document.createElement("div"); playEl.id = "playCount"; playEl.className = "beat-plays";
        const titleEl = safeGet("title"); titleEl?.parentNode?.insertBefore(playEl, titleEl.nextSibling);
    }
    const plays = beat.play_count?? 0;
    playEl.textContent = `${plays.toLocaleString()} plays`;
    playEl.style.cssText = 'display:block;opacity:1;color:#b3b3b3;text-align:center;margin-top:8px';
    updatePrices(beat); renderCartBeatRow(); renderSimilarTracks([beat]);
    setTimeout(forceTitle, 100); applyMonetizationRules(beat); setTimeout(nukePlays, 100);
}

// PRO FIX: onclick not addEventListener loop
function updateCartCount(){
    const cart = safeParse("dopetone_cart", []);
    document.querySelectorAll(".cart-count").forEach(el => { el.textContent = cart.length; });
    const goToCart = () => {
        if(cart.length === 0){ window.location.href = "licence-page.html"; return; }
        window.location.href = `licence-page.html?id=${cart[0].id}`;
    };
    const cartBtn = safeGet("cartBtn"); if(cartBtn) cartBtn.onclick = (e)=>{ e.preventDefault(); goToCart(); };
    const mobileCartBtn = safeGet("mobileCartBtn"); if(mobileCartBtn) mobileCartBtn.onclick = (e)=>{ e.preventDefault(); goToCart(); };
}

function checkEmptyState(){
    const cart = safeParse("dopetone_cart", []);
    if(cart.length === 0){
        renderSimilarTracks(); const st = safeGet("similarTitle"); if(st) st.textContent = "Recommended Tracks";
        beatId = null; activeCartBeat = null; window.currentBeat = null; selectedLicence = null; audio = null;
        window.history.replaceState({}, "", "licence-page.html");
        document.body.classList.add("empty-mode"); document.body.classList.remove("active-mode");
        safeSet("title", "CART EMPTY"); ["genre","bpm","type","mood","key"].forEach(id=>safeSet(id,"--"));
        const cover = safeGet("cover"); if(cover) cover.src = "images/logo.png";
        const playBtn = safeGet("playBtn"); if(playBtn) playBtn.textContent = "▶";
        document.querySelectorAll(".old,.new").forEach(el => el.textContent = "$00");
        localStorage.removeItem("dopetone_licences"); selectedLicences = {};
        renderCartBeatRow(); updateSelectedBar(); updateCheckoutTheme(); return;
    }
    const similarTitle = safeGet("similarTitle"); if(similarTitle) similarTitle.textContent = "Similar Tracks";
    document.body.classList.remove("empty-mode"); document.body.classList.add("active-mode");
}

function applyDynamicBG(image){ if(!image) return; document.body.style.background = `radial-gradient(circle at 20% 30%, rgba(255,255,255,.08), transparent 40%), url(${image}) center/cover no-repeat fixed`; }

function setupShare(){
    const shareBtn = safeGet("shareBtn"); if(!shareBtn) return;
    shareBtn.onclick = async() => {
        const beat = window.currentBeat;
        const shareData = { title: beat?.title || 'Dope Tone Beat', text: `🔥 Check out "${beat?.title}" on Dope Tone`, url: window.location.href };
        try{ if (navigator.share && navigator.canShare?.(shareData)) await navigator.share(shareData); else throw 0; }
        catch{ try{ await navigator.clipboard.writeText(window.location.href); showToast('Link copied 🔗'); }catch{ showToast('Copy failed'); } }
    };
}

function showToast(msg) {
    const toast = document.createElement('div'); toast.textContent = msg;
    toast.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.9);color:#fff;padding:12px 24px;border-radius:24px;z-index:99999;font-size:14px;backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.1);`;
    document.body.appendChild(toast); setTimeout(() => toast.remove(), 2000);
}

function setupLicenceSelection(){
    const cards = document.querySelectorAll(".licence-card");
    document.querySelectorAll(".pay-btn").forEach(btn => {
        btn.onclick = () => {
            const card = btn.closest(".licence-card"); if(!card||card.classList.contains('locked')) return;
            cards.forEach(c => { c.classList.remove("active","faded"); });
            card.classList.add("active"); cards.forEach(c => { if(c!==card) c.classList.add("faded"); });
            selectedLicences[beatId] = { name: btn.dataset.name, price: Number(btn.dataset.price), title: window.currentBeat?.title||'Beat' };
            safeSetItem("dopetone_licences", selectedLicences); updateSelectedBar(); updateCheckoutTheme();
        };
    });
}

function renderCartBeatRow(){
    const wrap = document.querySelector("#cartBeatRow"); if(!wrap) return;
    let cart = safeParse("dopetone_cart", []).map(ensureMode); wrap.innerHTML = "";
    cart.forEach(beat => {
        const loggedKey = `d1_cart_logged_${beat.id}`;
        if (!sessionStorage.getItem(loggedKey)) {
            fetch(`${STATS_API}/api/stats/event`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({beatId: parseInt(beat.id), eventType: 'cart'}) }).catch(()=>{});
            sessionStorage.setItem(loggedKey, '1');
        }
    });
    cart.forEach((beat) => {
        const b = ensureMode(beat); const card = document.createElement("div"); card.className = "cart-beat-card"; card.dataset.id = b.id; card.dataset.mode = b.monetization_mode;
        if(String(b.id) === String(activeCartBeat?.id || beatId)) card.classList.add("active");
        card.innerHTML = `<button class="remove-cart-track" data-id="${b.id}">✕</button><img src="${b.cover || b.cover_url || "images/logo.png"}"><h4>${b.title}</h4><span style="position:absolute;top:4px;left:4px;font-size:8px;padding:2px 4px;border-radius:3px;font-weight:800;color:#fff;background:${b.monetization_mode==='free'?'#3b82f6':b.monetization_mode==='hybrid'?'#f59e0b':'#ff003c'}">${b.monetization_mode.toUpperCase()}</span>`;
        card.querySelector(".remove-cart-track").onclick = (e) => { e.stopPropagation(); e.preventDefault(); removeBeatFromCart(e, b.id); };
        card.onclick = async () => {
            document.querySelectorAll(".cart-beat-card").forEach(c => c.classList.remove("active")); card.classList.add("active");
            await switchActiveBeat(b); const licenceBeat = { id: b.id, title: b.title, cover_url: b.cover || b.cover_url, mp3_url: b.audio };
            window.__LICENCE_BEAT__ = licenceBeat; window.__CURRENT_BEAT__ = b; window.globalPlayer?.play(0, [licenceBeat], `licence_${b.id}_${Date.now()}`);
            renderSimilarTracks([window.currentBeat]); setTimeout(forceTitle, 100); setTimeout(nukePlays, 100);
        };
        wrap.appendChild(card);
    });
}

function updateCheckoutTheme(){
    document.body.classList.remove("selected-free","selected-basic","selected-pro","selected-exclusive");
    document.querySelectorAll(".licence-card.active").forEach(card => {
        if(card.classList.contains("free")) document.body.classList.add("selected-free");
        if(card.classList.contains("basic")) document.body.classList.add("selected-basic");
        if(card.classList.contains("pro")) document.body.classList.add("selected-pro");
        if(card.classList.contains("exclusive")) document.body.classList.add("selected-exclusive");
    });
}

function updatePrices(beat){
    const b = ensureMode(beat || window.currentBeat); if(!b) return;
    const cart = safeParse("dopetone_cart", []); if(cart.length === 0){ document.querySelectorAll(".old,.new").forEach(el => el.textContent = "$00"); return; }
    const basic = Number(b.price?? 19); const pro = calcPro(basic); const exclusive = calcExclusive(basic);
    const prices = { free:0, basic, pro, exclusive };
    Object.keys(prices).forEach(type => {
        const card = document.querySelector(`.licence-card.${type}`); if(!card) return;
        const oldPrice = card.querySelector(".old"); const newPrice = card.querySelector(".new"); const btn = card.querySelector(".pay-btn"); const value = prices[type];
        if(oldPrice) oldPrice.textContent = type==='free'? "$00" : `$${(value*1.5).toFixed(2)}`;
        if(newPrice) newPrice.textContent = type==='free'? "$00" : `$${value.toFixed(2)}`;
        if(btn) btn.dataset.price = value;
    });
}

function safeSet(id, value){ const el = safeGet(id); if(!el) return; el.textContent = value || "--"; }

function setupPlayer(){
    const playBtn = safeGet("playBtn"); if(!playBtn) return;
    playBtn.onclick = async () => {
        const beat = window.currentBeat; if(!beat) return;
        const licenceBeat = { id: beat.id, title: beat.title, cover_url: beat.cover || beat.cover_url || "images/logo.png", mp3_url: beat.audio, genre: beat.genre, bpm: beat.bpm };
        const sameTrack = String(window.__LICENCE_ACTIVE_ID__) === String(licenceBeat.id); const isPlaying = window.globalPlayer?.isPlaying?.();
        if (sameTrack && isPlaying) { window.globalPlayer.pause(); return; }
        if (sameTrack &&!isPlaying) { window.globalPlayer.resume(); return; }
        window.__LICENCE_ACTIVE_ID__ = licenceBeat.id; window.__CURRENT_BEAT__ = ensureMode(licenceBeat); window.__ACTIVE_TRACK_KEY__ = null;
        window.globalPlayer?.play(0, [licenceBeat], `licence_${beat.id}`); try{ await fetch(`${API_URL}/beats/${beat.id}/play`, { method: 'POST' }); }catch{}
    };
    document.addEventListener("playerPlay", () => { const p=safeGet("playBtn"); if(p) p.textContent="⏸"; });
    document.addEventListener("playerPause", () => { const p=safeGet("playBtn"); if(p) p.textContent="▶"; });
}

function setupLike(){
    const likeBtn = safeGet("likeBtn"); const heartIcon = safeGet("heartIcon"); if(!likeBtn||!heartIcon) return;
    function updateLikeUI(){ const beat=window.__CURRENT_BEAT__; if(!beat) return; const playlists=window.getPlaylists?.()||[]; const liked=playlists.find(p=>p.isLiked); const isLiked=liked?.beats?.some(b=>b.id===beat.id); const btn=safeGet('likeBtn'); if(isLiked){ btn.classList.add('liked'); heartIcon.setAttribute('fill','currentColor'); } else { btn.classList.remove('liked'); heartIcon.setAttribute('fill','none'); } }
    likeBtn.onclick = () => { const beat=window.__CURRENT_BEAT__; if(!beat) return; window.toggleBeatLike?.(); updateLikeUI(); }; window.updateLicenceLikeUI = updateLikeUI;
}

function setupAddToCart(){
    const addBtn = safeGet("addBtn"); if(!addBtn) return;
    addBtn.onclick = async () => {
        if(!window.currentBeat) return; let cart = safeParse("dopetone_cart", []);
        const beat = ensureMode({ id: window.currentBeat.id, title: window.currentBeat.title, cover: window.currentBeat.cover, cover_url: window.currentBeat.cover_url, genre: window.currentBeat.genre, bpm: window.currentBeat.bpm, type: window.currentBeat.type_beat || window.currentBeat.type || "--", type_beat: window.currentBeat.type_beat || window.currentBeat.type || "--", mood: window.currentBeat.mood || "--", key: window.currentBeat.key || "--", audio: window.currentBeat.audio, play_count: window.currentBeat.play_count || 0, monetization_mode: window.currentBeat.monetization_mode || getMode(window.currentBeat) || 'paid', has_free_tagged: window.currentBeat.has_free_tagged || 0, price: window.currentBeat.price||29.99 });
        if(cart.find(item => String(item.id)==String(beat.id))) return;
        cart.push(beat); safeSetItem("dopetone_cart", cart);
        try { await fetch(`${WORKER_URL}/api/stats/track`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ beat_id: parseInt(beat.id), event_type: 'cart' }) }); } catch {}
        if(cart.length === 1){ activeCartBeat = beat; beatId = beat.id; switchActiveBeat(beat); }
        renderCartBeatRow(); updateCartCount(); document.body.classList.remove("empty-mode");
    };
}

async function switchActiveBeat(beat){
    const fixed = ensureMode(beat); activeCartBeat = fixed; beatId = fixed.id;
    const url = new URL(window.location); url.searchParams.set("id", fixed.id); window.history.pushState({}, "", url);
    window.updateLicenceLikeUI?.(); window.currentBeat = fixed; window.__CURRENT_BEAT__ = fixed;
    try{ let cart = safeParse("dopetone_cart",[]).map(ensureMode); cart = cart.map(c => String(c.id)===String(fixed.id)? fixed : ensureMode(c)); safeSetItem("dopetone_cart", cart); }catch{}
    selectedLicences = safeParse("dopetone_licences", {});
    const savedLicence = selectedLicences[fixed.id]; document.querySelectorAll(".licence-card").forEach(card => card.classList.remove("active","faded"));
    if(savedLicence){ document.querySelectorAll(".licence-card").forEach(card => { const btn=card.querySelector(".pay-btn"); if(btn?.dataset.name===savedLicence.name) card.classList.add("active"); else card.classList.add("faded"); }); }
    document.querySelectorAll(".cart-beat-card").forEach(card => { if(card.querySelector("h4")?.textContent?.trim()===fixed.title) card.classList.add("active") });
    updatePrices(fixed); applyMonetizationRules(fixed); updateSelectedBar(); updateCheckoutTheme();
    safeSet("title", fixed.title); safeSet("genre", fixed.genre); safeSet("bpm", fixed.bpm); safeSet("type", fixed.type_beat || fixed.type || "--"); safeSet("mood", fixed.mood || "--"); safeSet("key", fixed.key || "--");
    const cover = safeGet("cover"); if(cover){ cover.src = fixed.cover || fixed.cover_url || "images/logo.png"; }
    if(fixed.audio){ audio = new Audio(fixed.audio); } renderCartBeatRow(); renderSimilarTracks([fixed]);
}

async function loadGlobalLikeCount(beatId){ if(!beatId) return; try{ const res=await fetch(`${API_URL}/beats`); const beats=await res.json(); const beat=beats.find(b=>b.id==beatId); const el=safeGet("likeCount"); if(el) el.textContent=beat?.like_count||0; }catch{} }

function updateSelectedBar(){
    const selectedWrap = document.querySelector(".selected-licence"); if(!selectedWrap) return;
    const cart = safeParse("dopetone_cart", []); selectedLicences = safeParse("dopetone_licences", {});
    let totalPrice = 0, count = 0, licenceHTML = "", historyChain = safeParse("dopetone_history",[]);
    cart.forEach(beat => {
        const licence = selectedLicences[beat.id]; if(!licence) return;
        totalPrice += Number(licence.price); count++; licenceHTML += `<div class="selected-track-line"><div class="selected-track-info"><strong>${beat.title}</strong><span class="licence-color-${licence.name.toLowerCase()}">${licence.name} • $${licence.price}</span></div><button class="remove-selected-licence" data-beat="${beat.id}">✕</button></div>`;
        if(!historyChain.find(h => String(h.beat_id)==String(beat.id) && h.license_type==licence.name)) historyChain.push({ beat_id: parseInt(beat.id), beat_title: beat.title, license_type: licence.name, amount: Math.round(Number(licence.price)*100), timestamp: Date.now() });
    });
    safeSetItem("dopetone_history", historyChain);
    if(licenceHTML === ""){ selectedWrap.innerHTML = `<div class="selected-left"><h3>Selected<br>Licence</h3><div class="total-box"><span>Total</span><div id="totalPrice">$0</div></div></div><div class="selected-right"><div id="selectedName">None</div><button id="checkoutBtn">Checkout</button></div>`; }
    else { selectedWrap.innerHTML = `<div class="selected-left"><h3>Selected<br>Licence</h3><div class="total-box"><span>Total</span><div id="totalPrice">$${totalPrice.toFixed(2)}</div></div></div><div class="selected-right"><div id="selectedName">${licenceHTML}</div><button id="checkoutBtn">Checkout ${count} Tracks</button></div>`; }
    document.querySelectorAll(".remove-selected-licence").forEach(btn => {
        btn.onclick = () => {
            const bid = btn.dataset.beat; delete selectedLicences[bid]; safeSetItem("dopetone_licences", selectedLicences);
            let hist = safeParse("dopetone_history",[]); hist = hist.filter(h => String(h.beat_id)!==String(bid)); safeSetItem("dopetone_history", hist);
            document.querySelectorAll(".licence-card").forEach(card => card.classList.remove("active","faded")); updateSelectedBar(); updateCheckoutTheme();
        };
    });
    const checkoutBtn = safeGet("checkoutBtn"); if(checkoutBtn) checkoutBtn.onclick = window.createStripeCheckout;
}

function removeBeatFromCart(event, id){
    event.stopPropagation(); event.preventDefault();
    let cart = safeParse("dopetone_cart", []); cart = cart.filter(beat => String(beat.id)!=String(id)); safeSetItem("dopetone_cart", cart);
    let licences = safeParse("dopetone_licences", {}); delete licences[id]; safeSetItem("dopetone_licences", licences);
    let hist = safeParse("dopetone_history",[]); hist = hist.filter(h=>String(h.beat_id)!==String(id)); safeSetItem("dopetone_history", hist);
    updateCartCount();
    if(cart.length === 0){
        beatId = null; activeCartBeat = null; selectedLicence = null; window.currentBeat = null; if(audio){ audio.pause(); audio.currentTime = 0; } audio = null;
        document.body.classList.add("empty-mode"); document.body.classList.remove("active-mode");
        safeSet("title","CART EMPTY"); ["genre","bpm","type","mood","key"].forEach(k=>safeSet(k,"--"));
        const cover=safeGet("cover"); if(cover) cover.src="images/logo.png"; window.history.replaceState({}, "", "licence-page.html");
        selectedLicences={}; localStorage.removeItem("dopetone_licences");
        document.querySelectorAll(".licence-card").forEach(card => card.classList.remove("active","faded","locked"));
        document.body.style.background="#05070d"; document.querySelectorAll(".old,.new").forEach(el=>el.textContent="$00");
        renderCartBeatRow(); renderSimilarTracks(); checkEmptyState(); updateSelectedBar(); updateCheckoutTheme(); return;
    }
    if(String(id)===String(beatId)){ const next=ensureMode(cart[0]); beatId=next.id; activeCartBeat=next; const u=new URL(location); u.searchParams.set("id",beatId); history.replaceState({}, "", u); switchActiveBeat(next); }
    renderCartBeatRow(); checkEmptyState(); renderSimilarTracks(); updateSelectedBar(); updateCheckoutTheme();
}

function initCartScroll() {
    const slider = safeGet("cartBeatRow"); if(!slider) return; let isDown=false,startX,scrollLeft;
    slider.onmousedown = (e) => { if(e.target.closest(".remove-cart-track")) return; isDown=true; startX=e.pageX-slider.offsetLeft; scrollLeft=slider.scrollLeft; };
    slider.onmouseleave = () => { isDown=false; }; slider.onmouseup = () => { isDown=false; };
    slider.onmousemove = (e) => { if(!isDown) return; e.preventDefault(); const x=e.pageX-slider.offsetLeft; slider.scrollLeft=scrollLeft-(x-startX)*2; };
    slider.onwheel = (e) => { if(slider.scrollWidth<=slider.clientWidth) return; e.preventDefault(); slider.scrollLeft+=e.deltaY; };
}

function forceTitle() {
    const cart = safeParse("dopetone_cart", []); if (cart.length === 0) return;
    const beat = window.currentBeat || cart[0]; const titleEl = safeGet("title");
    if (titleEl && beat?.title) { titleEl.textContent = beat.title; titleEl.style.cssText = "opacity:1!important;visibility:visible!important"; }
}

function applyMonetizationRules(beat) {
    beat = ensureMode(beat); const mode = getMode(beat) || 'paid';
    const freeCard = document.querySelector('.licence-card.free'); const paidCards = document.querySelectorAll('.licence-card.basic,.licence-card.pro,.licence-card.exclusive');
    document.querySelectorAll('.licence-card').forEach(c=>{ c.classList.remove('locked','auto-selected'); c.style.pointerEvents='auto'; c.style.opacity='1'; c.style.filter='none'; const b=c.querySelector('.pay-btn'); if(b){ b.disabled=false; b.style.cursor='pointer'; } });
    if (mode === 'free') {
        paidCards.forEach(c => { c.classList.add('locked'); c.style.pointerEvents='none'; c.style.opacity='0.25'; c.style.filter='grayscale(1)'; const btn=c.querySelector('.pay-btn'); if(btn) btn.disabled=true; });
        if (freeCard) { freeCard.classList.add('auto-selected','active'); selectedLicences[beat.id]={name:'FREE',price:0,title:beat.title}; safeSetItem('dopetone_licences',selectedLicences); setTimeout(()=>{updateSelectedBar();updateCheckoutTheme();},50); }
    } else if (mode === 'paid') {
        if (freeCard) { freeCard.classList.add('locked'); freeCard.style.pointerEvents='none'; freeCard.style.opacity='0.25'; const btn=freeCard.querySelector('.pay-btn'); if(btn) btn.disabled=true; if(selectedLicences[beat.id]?.name==='FREE'){ delete selectedLicences[beat.id]; safeSetItem('dopetone_licences',selectedLicences); } }
    }
}

async function nukePlays() {
    const beat = window.currentBeat; if (!beat) return;
    if (beat.play_count === undefined) { try{ const r=await fetch(`${API_URL}/beats`); const d=await r.json(); const f=d.find(x=>String(x.id)==String(beat.id)); if(f) beat.play_count=f.play_count||0; }catch{} }
    let el = safeGet("playCount"); if(!el){ el=document.createElement("div"); el.id="playCount"; } const title=safeGet("title"); if(title?.parentNode&&el.parentNode!==title.parentNode) title.parentNode.insertBefore(el,title.nextSibling);
    el.textContent = `${(beat.play_count??0).toLocaleString()} plays`; el.style.cssText="display:block;color:#b3b3b3;font-size:14px;text-align:center;margin:8px 0;";
}
setInterval(nukePlays, 5000);

document.addEventListener("DOMContentLoaded", () => {
    const playBtn = safeGet("playBtn"); if(!playBtn) return;
    playBtn.addEventListener("click", async () => {
        const beat = window.__LICENCE_BEAT__; if(!beat) return; window.globalPlayer.play(0, [beat], "licence-page");
    });
});

window.removeBeatFromCart = removeBeatFromCart; window.renderCartBeatRow = renderCartBeatRow;
window.updateCartCount = updateCartCount; window.checkEmptyState = checkEmptyState;
window.switchActiveBeat = switchActiveBeat; window.updatePrices = updatePrices; window.updateSelectedBar = updateSelectedBar;
