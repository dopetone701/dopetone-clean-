console.log("STORE FILE RUNNING");

// 🟥 GLOBAL STORE (DO NOT MOVE)
window.store = {
  beats: [],
  loaded: false
}

// ================================
// 🟥 SUPABASE CONNECTION
// ================================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const db = createClient(
  "https://puscryqnudgxjlzhrqrf.supabase.co",
  "sb_publishable_Ji4XS2HywMG57NefOBEzYw_c4TPF-kf"
)


// ================================
// 🟦 APP START
// ================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 app started")

  initUI()
  initMobileMenu()
  initOrbit()
  loadBeats()
})


// ================================
// 🟩 UI CONTROLS (CREATE PANEL SAFE)
// ================================
function initUI() {

  const createBtn = document.getElementById("createBtn")
  const createPanel = document.getElementById("createPanel")

  if (createBtn && createPanel) {
    createPanel.classList.remove("active")

    createBtn.addEventListener("click", () => {
      createPanel.classList.toggle("active")
    })
  }

  // ✅ FORM SAFE
  const form = document.getElementById("beatForm")

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault()
      console.log("✅ form working")
    })
  }
}


// ================================
// 💙 MOBILE MENU SYSTEM (SLIDE + OVERLAY)
// ================================
function initMobileMenu() {

  const toggle = document.querySelector(".menu-toggle")
  const panel = document.querySelector(".mobile-panel")
  const overlay = document.querySelector(".overlay")

  if (!toggle || !panel || !overlay) return

  // 🔥 OPEN
  toggle.addEventListener("click", () => {
    panel.classList.add("active")
    overlay.classList.add("active")
  })

  // 🔥 CLOSE FUNCTION
  function closeMenu() {
    panel.classList.remove("active")
    overlay.classList.remove("active")
  }

  // click outside
  overlay.addEventListener("click", closeMenu)

  // click link
  panel.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", closeMenu)
  })
}


function initOrbit() {

  // 🔴 ONLY HERO BUTTONS (important)
  const buttons = document.querySelectorAll('.hero .cta-btn');

  // safety
  if (!buttons.length) return;
if (orbitPaused) return;

  function orbitLoop() {

    buttons.forEach((btn, index) => {

      setTimeout(() => {

        // start animation
        btn.classList.add('orbit');

        setTimeout(() => {
          btn.classList.remove('orbit');
        }, 2000); // 👈 HOLD TIME (2s)

      }, index * 2500); // 👈 NO OVERLAP (each waits its turn)

    });

    // 🔁 LOOP AGAIN CLEANLY
    setTimeout(orbitLoop, buttons.length * 2500 + 1500);
  }

  orbitLoop();
 // 🟥 IDLE DETECTION

let idleTimer;

function resetIdle() {
  orbitPaused = true;

  clearTimeout(idleTimer);

  idleTimer = setTimeout(() => {
    orbitPaused = false;
    initOrbit(); // restart orbit
  }, 4000); // after 4s idle
}

["click", "scroll", "touchstart"].forEach(event => {
  document.addEventListener(event, resetIdle);
});

 
}
// 🟦 STOP ORBIT ON USER INTERACTION

let orbitPaused = false;

document.addEventListener("click", () => {
  orbitPaused = true;
});


// ================================
// 🔵 LOAD BEATS FROM DATABASE
// ================================
async function loadBeats() {
  const container = document.getElementById("beatsContainer")

  if (!container) return

  const { data, error } = await db
    .from("beats")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("❌ Error loading beats:", error)
    return
  }

  displayBeats(data)
}


// ================================
// 🟣 DISPLAY BEATS (CARDS)
// ================================




const toggle = document.querySelector(".menu-toggle");
const panel = document.querySelector(".mobile-panel");

toggle.addEventListener("click", () => {
  panel.classList.toggle("active");
  document.body.classList.toggle("panel-open");
});
document.addEventListener("click", (e) => {
  if (
    panel.classList.contains("active") &&
    !panel.contains(e.target) &&
    !toggle.contains(e.target)
  ) {
    panel.classList.remove("active");
    document.body.classList.remove("panel-open");
  }
});
/* 🟦🟦🟦 🔵 CLOSE ON LINK CLICK */

document.querySelectorAll(".mobile-panel a").forEach(link => {
  link.addEventListener("click", () => {
    panel.classList.remove("active");
    document.body.classList.remove("panel-open");
  });
});
/* 🟩🟩🟩 🟢 SWIPE TO CLOSE */

let startX = 0;

panel.addEventListener("touchstart", (e) => {
  startX = e.touches[0].clientX;
});

panel.addEventListener("touchmove", (e) => {
  let currentX = e.touches[0].clientX;
  let diff = currentX - startX;

  // swipe right → close
  if (diff > 80) {
    panel.classList.remove("active");
    document.body.classList.remove("panel-open");
  }
});
let currentAudio = null
let currentBtn = null

document.addEventListener("click", (e) => {
  const playBtn = e.target.closest(".play-btn")
  const buyBtn = e.target.closest(".buy-btn")
  const downloadBtn = e.target.closest(".download-btn")

  // 🎧 PLAY
  if (playBtn) {
    e.stopPropagation()

    const src = playBtn.getAttribute("data-src")
    if (!src) return

    // toggle same button
    if (currentBtn === playBtn && currentAudio) {
      if (!currentAudio.paused) {
        currentAudio.pause()
        playBtn.textContent = "▶"
      } else {
        currentAudio.play()
        playBtn.textContent = "⏸"
      }
      return
    }

    // stop previous
    if (currentAudio) {
      currentAudio.pause()
      if (currentBtn) currentBtn.textContent = "▶"
    }

    // play new
    currentAudio = new Audio(src)
    currentBtn = playBtn

    currentAudio.play()
    playBtn.textContent = "⏸"

    currentAudio.onended = () => {
      playBtn.textContent = "▶"
      currentAudio = null
      currentBtn = null
    }
  }

  // 💰 BUY
  if (buyBtn) {
    e.stopPropagation()
    const id = buyBtn.dataset.id
    window.location.href = `licence-page.html?id=${id}`
  }

  // ⬇ DOWNLOAD
  if (downloadBtn) {
    e.stopPropagation()

    let email = localStorage.getItem("user_email")

    if (!email) {
      email = prompt("Enter your email to download")
      if (!email) return
      localStorage.setItem("user_email", email)
    }

    const link = document.createElement("a")
    link.href = downloadBtn.dataset.src
    link.download = ""
    link.click()
  }
})
