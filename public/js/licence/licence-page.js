
// ================================
// 🔐 CONFIG
// ================================
const SUPABASE_URL = "https://puscryqnudgxjlzhrqrf.supabase.co";
const API_KEY = "sb_publishable_Ji4XS2HywMG57NefOBEzYw_c4TPF-kf";

// ================================
// 📦 PARAMS
// ================================
const params = new URLSearchParams(window.location.search);
const beatId = params.get("id");

let audio = null;
let playBtn = null;

// ================================
// 🚀 INIT
// ================================
document.addEventListener("DOMContentLoaded", () => {
  playBtn = document.getElementById("playBtn");
  loadBeat();
  highlightDefaultPlan();
});

// ================================
// 🎯 LOAD BEAT (BULLETPROOF)
// ================================
async function loadBeat() {
  try {
    if (!beatId) {
      console.warn("⚠️ No beat ID");
      return;
    }

    const url = `${SUPABASE_URL}/rest/v1/beats?id=eq.${beatId}&select=*`;

    const res = await fetch(url, {
      headers: {
        apikey: API_KEY,
        Authorization: `Bearer ${API_KEY}`,
      },
    });

    if (!res.ok) throw new Error("API ERROR " + res.status);

    const data = await res.json();
    const beat = data?.[0];

    if (!beat) {
      console.warn("⚠️ Beat not found");
      return;
    }

    console.log("✅ BEAT:", beat);
    // 💀 PRO ATTENTION HIT
setTimeout(() => {
  const proCard = document.querySelector('.licence-card.pro');
  if (proCard) {
    proCard.classList.add('attention');

    // remove after animation so it can be reused
    setTimeout(() => {
      proCard.classList.remove('attention');
    }, 600);
  }
}, 1200);

// ✅ ALWAYS set title FIRST (fix loading issue)
safeSet("title", beat.title);


    // 🔥 SORT VALUES (LONG → SHORT)
const values = [
  beat.type || "",
  beat.genre || "",
  beat.mood || "",
  beat.key || "",
  beat.bpm ? beat.bpm + "" : ""
];

// sort longest → shortest
values.sort((a, b) => b.length - a.length);

// assign back IN ORDER (UI stays same, values change)
const ids = ["type", "genre", "mood", "key", "bpm"];

ids.forEach((id, index) => {
  const value = values[index];

  if (value) {
    safeSet(id, value);
  } else {
    hide(id);
  }
});

    const cover = document.getElementById("cover");
    if (cover && beat.cover_url) {
      cover.src = beat.cover_url;
    }

    // ================================
    // 🔊 AUDIO
    // ================================
    if (beat.mp3_url) {
      audio = new Audio(beat.mp3_url);
      setupPlayer();
      setupFreeDownload(beat);
    }

    // ================================
    // 🌌 DYNAMIC BACKGROUND (FIXED 🔥)
    // ================================
    applyDynamicBG(beat.cover_url);

  } catch (err) {
    console.error("🔥 LOAD FAILED:", err.message);
  }
}

// ================================
// 🧼 SAFE TEXT HANDLER
// ================================
function safeSet(id, value) {
  const el = document.getElementById(id);
  if (!el) return;

  if (!value || value === "null" || value === "") {
    el.style.display = "none";
  } else {
    el.textContent = value;
  }
}

function hide(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
}

// ================================
// ▶ PLAYER (STABLE)
// ================================
function setupPlayer() {
  if (!playBtn || !audio) return;

  playBtn.style.cursor = "pointer";

  playBtn.addEventListener("click", () => {
    if (audio.paused) {
      audio.play();
      playBtn.textContent = "⏸";
    } else {
      audio.pause();
      playBtn.textContent = "▶";
    }
  });

  audio.addEventListener("ended", () => {
    playBtn.textContent = "▶";
  });
}

// ================================
// 🎁 FREE DOWNLOAD
// ================================
function setupFreeDownload(beat) {
  const btn = document.querySelector(".free-btn");
  if (!btn || !beat.mp3_url) return;

  btn.addEventListener("click", () => {
    const name = prompt("Your Name");
    const email = prompt("Your Email");

    if (!name || !email) return;

    window.location.href = beat.mp3_url;
  });
}

// ================================
// 🌌 DYNAMIC BG (RESTORED PROPERLY)
// ================================
function applyDynamicBG(image) {
  if (!image) return;

  document.body.style.background = `
    radial-gradient(circle at 20% 30%, rgba(255,255,255,0.08), transparent 40%),
    radial-gradient(circle at 80% 70%, rgba(255,255,255,0.05), transparent 40%),
    url(${image}) center/cover no-repeat fixed
  `;

  document.body.style.backgroundBlendMode = "overlay";
}

// ================================
// 💎 DEFAULT PRO HIGHLIGHT
// ================================
function highlightDefaultPlan() {
  const proCard = document.querySelector(".pro-card");
  if (proCard) {
    proCard.classList.add("active");
  }
}
function safeSet(id, value) {
  const el = document.getElementById(id);
  if (!el) return;

  const row = el.closest(".meta-row");

  if (!value || value === "null" || value === "") {
    if (row) row.style.display = "none";
  } else {
    el.textContent = value;
  }
}
// ❤️ LIKE SYSTEM
const likeBtn = document.getElementById("likeBtn");
const heartIcon = document.getElementById("heartIcon");
const likeCount = document.getElementById("likeCount");

let liked = false;
let likes = 0;

likeBtn.onclick = () => {
  liked = !liked;

  if (liked) {
    heartIcon.textContent = "❤️";
    likeBtn.classList.add("active");
    likes++;
  } else {
    heartIcon.textContent = "♡";
    likeBtn.classList.remove("active");
    likes--;
  }

  likeCount.textContent = likes;
};


// ➕ PLAYLIST PANEL
const addBtn = document.getElementById("addBtn");
const panel = document.getElementById("playlistPanel");

addBtn.onclick = () => {
  panel.classList.toggle("show");
};


// ➡️ SHARE
const shareBtn = document.getElementById("shareBtn");

shareBtn.onclick = () => {
  navigator.clipboard.writeText(window.location.href);
  alert("Link copied 🔥");
};
const cards = document.querySelectorAll('.licence-card');

cards.forEach(card => {
  card.addEventListener('click', () => {

    // reset all
    cards.forEach(c => {
      c.classList.remove('active', 'expanded', 'faded');
    });

    // shrink first
    card.classList.add('active');

    // fade others
    cards.forEach(c => {
      if (c !== card) c.classList.add('faded');
    });

    // expand after delay
    setTimeout(() => {
      card.classList.add('expanded');
    }, 200);

  });
});
// Wait until page fully loads
window.addEventListener("load", () => {
  console.log("🚀 Page loaded");

  // ✅ Initialize Stripe
  const stripe = Stripe("pk_test_51TMjXCJrs2djvfJIbYMYgQ23yy0vzIwPvbPc9m5qghzGgg9NMECTyNWebBGqkLULxb4rI1dXwBS5uYjLKLQY3idp003dEmbIVy"); // 🔁 replace with your real key

  // ✅ Get all pay buttons
  const buttons = document.querySelectorAll(".pay-btn");

  console.log("Buttons found:", buttons.length);

  if (!buttons.length) {
    console.error("❌ No pay buttons found");
    return;
  }

  // ✅ Loop through buttons
  buttons.forEach((btn) => {
    btn.addEventListener("click", async () => {

      // Get data from button
      const price = Number(btn.dataset.price);
      const name = btn.dataset.name;

      console.log("🔥 Buying:", name, price);

      // Validate
      if (!price || !name) {
        console.error("❌ Missing price or name");
        return;
      }

      try {
        // ✅ Call backend
        const res = await fetch("https://dopetone-clean.onrender.com/create-checkout-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            price,
            name,
          }),
        });

        // ✅ Convert response
        const data = await res.json();
        console.log("Session response:", data);

        // ❌ No session returned
        if (!data.id) {
          console.error("❌ No session ID returned");
          return;
        }

        // ✅ Redirect to Stripe Checkout
        const result = await stripe.redirectToCheckout({
          sessionId: data.id,
        });

        // ❌ Stripe error
        if (result.error) {
          console.error("❌ Stripe redirect error:", result.error.message);
        }

      } catch (err) {
        console.error("❌ Payment error:", err);
      }
    });
  });
});
