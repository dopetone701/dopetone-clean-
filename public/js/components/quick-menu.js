// ===============================
// 🔥 QUICK MENU COMPONENT
// ===============================

// 🧩 HTML generator
export function getQuickMenuHTML(isOwner = false) {
  return `
    <div class="quick-menu">
      <button class="quick-btn">⋮</button>

      <div class="quick-panel">
        <div class="quick-item cart">🛒</div>
        <div class="quick-item playlist">➕</div>
        <div class="quick-item share">🔗</div>
        <div class="quick-item delete ${isOwner ? "" : "hidden"}">🗑</div>
      </div>
    </div>
  `
}


// ===============================
// ⚙️ INIT GLOBAL EVENTS
// ===============================
export function initQuickMenu() {

  if (window.__quickMenuLoaded) return
  window.__quickMenuLoaded = true

  document.addEventListener("click", (e) => {

    const btn = e.target.closest(".quick-btn")

    // 🔥 TOGGLE PANEL
    if (btn) {
      const panel = btn.nextElementSibling

      document.querySelectorAll(".quick-panel").forEach(p => {
        if (p !== panel) p.classList.remove("show")
      })

      panel.classList.toggle("show")
      return
    }

    // ❌ CLOSE WHEN OUTSIDE
    if (!e.target.closest(".quick-menu")) {
      document.querySelectorAll(".quick-panel").forEach(p => {
        p.classList.remove("show")
      })
    }

    const card = e.target.closest("[data-id]")
    const beatId = card?.dataset.id

    if (!beatId) return

    // =========================
    // ACTIONS
    // =========================

    if (e.target.classList.contains("cart")) {
      console.log("🛒 add to cart:", beatId)
    }

    if (e.target.classList.contains("playlist")) {
      console.log("➕ add to playlist:", beatId)
    }

    if (e.target.classList.contains("share")) {
      navigator.clipboard.writeText(window.location.href)
      alert("Link copied 🔥")
    }

    if (e.target.classList.contains("delete")) {
      console.log("🗑 delete:", beatId)
    }

  })
}
