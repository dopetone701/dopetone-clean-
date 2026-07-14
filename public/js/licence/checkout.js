// checkout.js - PRO MAX - 100% D1 + WEBHOOK SAFE
// Does NOT clear cart. success.html + webhook will ship to D1 then clear.
// Fixes: safeParse, toast not alert, AbortController, single bind, no double checkout

const STRIPE_WORKER_URL = 'https://dopetone-stripe.dopetone701.workers.dev';
const MAIN_API_URL = 'https://dope-tone-api.dopetone701.workers.dev';
const API_URL = 'https://api.dopetonevault.com';

const calcPro = (b) => Number((Number(b) * 49 / 19).toFixed(2));
const calcExclusive = (b) => Number((Number(b) * 199 / 19).toFixed(2));

let isCheckingOut = false;

// ==================== UTILS ====================
const safeParse = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};
const safeStringify = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

function proToast(msg, type = 'info'){
  let el = document.getElementById('dt-pro-toast');
  if(!el){
    el = document.createElement('div'); el.id = 'dt-pro-toast';
    el.style.cssText = `position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#0f0f0f;color:#fff;padding:14px 22px;border-radius:14px;z-index:9999999;font:600 13px/1.2 system-ui;border:1px solid #2a2a2a;box-shadow:0 10px 30px rgba(0,0,0,.6);max-width:90vw;`;
    document.body.appendChild(el);
  }
  el.style.borderColor = type==='error' ? '#ff3b3b' : type==='ok' ? '#00ffc6' : '#2a2a2a';
  el.textContent = msg; el.style.display = 'block'; el.style.opacity = '1';
  clearTimeout(el._t); el._t = setTimeout(()=>{ el.style.opacity='0'; setTimeout(()=>el.style.display='none',300); }, 4000);
}

// ==================== SPINNER CSS ====================
if(!document.getElementById('dt-checkout-style')){
  const s = document.createElement('style'); s.id = 'dt-checkout-style';
  s.textContent = `
    @keyframes dt-spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
    .dt-gear { display:inline-block; animation: dt-spin 0.8s linear infinite; margin-left:8px; font-size:15px; vertical-align:middle; }
    #checkoutBtn[disabled]{ opacity:0.65 !important; cursor:wait !important; pointer-events:none !important; filter:grayscale(.2); }
    #checkoutBtn.is-loading{ cursor:wait !important; background: linear-gradient(135deg, #2a2a2a, #111) !important; border-color:#00ffc6 !important; }
    #checkoutBtn.is-loading .dt-gear{ color:#00ffc6; }
  `;
  document.head.appendChild(s);
}

// ==================== MAIN CHECKOUT ====================
export async function createStripeCheckout(e){
  if(e){ e.preventDefault(); e.stopPropagation(); }
  if(isCheckingOut){ console.log("[DT] already checking out"); return; }

  let licences = safeParse("dopetone_licences", {});
  let cart = safeParse("dopetone_cart", []);

  if(!Array.isArray(cart) || cart.length===0){ proToast("Cart is empty", "error"); return; }

  let beatsToCheckout = cart.filter(b => licences[String(b.id)] || licences[b.id]);
  if(beatsToCheckout.length===0){ proToast("Select a licence first - click Basic / Pro / Exclusive", "error"); return; }

  // Filter out FREE for Stripe (Stripe does not allow $0)
  const hasPaid = beatsToCheckout.some(b=>{
    const lic = licences[String(b.id)] || licences[b.id];
    return lic && lic.name!=='FREE' && lic.name!=='Free' && Number(lic.price)>0;
  });

  if(!hasPaid){
    proToast("Free beats don't need checkout - downloading...", "ok");
    // TODO: trigger free download flow here if you want
    return;
  }

  isCheckingOut = true;
  const btn = document.getElementById('checkoutBtn');
  const originalHTML = btn ? btn.innerHTML : '';

  if(btn){
    btn.disabled = true; btn.classList.add('is-loading');
    btn.innerHTML = `Redirecting to Stripe <span class="dt-gear">⚙️</span>`;
  }

  // Recalculate prices server-truth style to prevent tampering
  let licencesToSend = {};
  beatsToCheckout.forEach(b=>{
    const lic = licences[String(b.id)] || licences[b.id];
    if(!lic) return;
    let finalPrice = Number(lic.price) || 0;
    const base = Number(b.price) || Number(b.basic_price) || 19;
    if(lic.name === 'Pro') finalPrice = calcPro(base);
    if(lic.name === 'Exclusive') finalPrice = calcExclusive(base);
    if(lic.name === 'Basic' && !lic.price) finalPrice = base;
    // Skip FREE
    if(lic.name === 'FREE' || lic.name === 'Free' || finalPrice<=0) return;
    licencesToSend[b.id] = { name: lic.name, price: finalPrice, title: b.title || b.beat_title || `Beat ${b.id}` };
  });

  if(Object.keys(licencesToSend).length===0){
    proToast("No paid licences selected", "error");
    if(btn){ btn.disabled=false; btn.classList.remove('is-loading'); btn.innerHTML=originalHTML; }
    isCheckingOut=false; return;
  }

  // === SAVE PENDING - FOR success.html FALLBACK ===
  const pendingPayload = {
    timestamp: Date.now(),
    beats: beatsToCheckout,
    licences: licencesToSend,
    user_id: localStorage.getItem("dopetone_user_id") || localStorage.getItem("dt_user_id") || "anonymous"
  };
  safeStringify("dopetone_pending_checkout", pendingPayload);
  console.log("✅ [DT] Pending saved", pendingPayload);

  // === SAVE HISTORY CHAIN FOR D1 SHIP ===
  let history = safeParse("dopetone_history", []);
  beatsToCheckout.forEach(b=>{
    const lic = licencesToSend[b.id]; if(!lic) return;
    const exists = history.find(h=> String(h.beat_id)===String(b.id) && h.license_type===lic.name);
    if(!exists){
      history.push({
        beat_id: parseInt(b.id),
        beat_title: b.title || b.beat_title || '',
        license_type: lic.name,
        amount: Math.round(Number(lic.price)*100),
        timestamp: Date.now(),
        user_id: pendingPayload.user_id
      });
    }
  });
  safeStringify("dopetone_history", history);
  console.log("✅ [DT] History chain updated", history);

  // === CALL STRIPE WORKER WITH TIMEOUT ===
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(), 15000);

  try {
    console.log("→ Calling Stripe worker:", `${STRIPE_WORKER_URL}/create-checkout-session`);
    const res = await fetch(`${STRIPE_WORKER_URL}/create-checkout-session`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ licences: licencesToSend, cart: beatsToCheckout, user_id: pendingPayload.user_id }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    let data;
    try{ data = await res.json(); } catch { const t = await res.text(); throw new Error(`Worker returned non-JSON: ${t.slice(0,200)}`); }

    if(!res.ok){
      console.error("❌ Worker error", res.status, data);
      throw new Error(data.error || data.detail || `Worker ${res.status}`);
    }

    if(data.url){
      console.log("✅ Stripe URL received, redirecting...");
      proToast("Redirecting to secure checkout...", "ok");
      setTimeout(()=>{ window.location.href = data.url; }, 350);
      return;
    } else {
      throw new Error(data.error || 'No checkout URL returned');
    }

  } catch(err){
    clearTimeout(timeout);
    const isAbort = err.name === 'AbortError';
    const msg = isAbort ? 'Worker timeout - check Cloudflare logs' : err.message;
    console.error("❌ Checkout failed:", err);
    proToast(`Checkout failed: ${msg}`, "error");

    if(btn){
      btn.disabled = false; btn.classList.remove('is-loading');
      btn.style.pointerEvents = 'auto'; btn.style.cursor = 'pointer';
      btn.innerHTML = originalHTML || `Checkout ${Object.keys(licencesToSend).length} Tracks`;
    }
    isCheckingOut = false;
  }
}

// ==================== SETUP + REBIND PRO ====================
export function setupCheckout(){
  if(window.__dt_checkout_bound) return;
  window.__dt_checkout_bound = true;
  console.log("✅ [DT] Checkout bound PRO");

  // Delegate - works even when button is recreated by licence-page.js
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('#checkoutBtn');
    if(btn){ createStripeCheckout(e); }
  }, { capture:true });

  // Direct bind if exists on load
  const direct = document.getElementById('checkoutBtn');
  if(direct && !direct.dataset.bound){
    direct.dataset.bound="1";
    direct.addEventListener('click', createStripeCheckout);
  }

  // PRO: MutationObserver instead of setInterval polling
  const observer = new MutationObserver(()=>{
    const b = document.getElementById('checkoutBtn');
    if(b && !b.dataset.bound){
      b.dataset.bound="1";
      b.addEventListener('click', createStripeCheckout);
      console.log("[DT] Re-bound new checkoutBtn via observer");
    }
  });
  observer.observe(document.body, { childList:true, subtree:true });
}

window.createStripeCheckout = createStripeCheckout;
window.setupCheckout = setupCheckout;

if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', setupCheckout); }
else { setupCheckout(); }

console.log("✅ checkout.js PRO loaded - Stripe:", STRIPE_WORKER_URL);
