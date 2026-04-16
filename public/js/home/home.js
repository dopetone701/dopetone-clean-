function displayBeats(beats) {
  const container = document.getElementById("beatsContainer")
  if (!container) return

  container.innerHTML = ""

  beats.forEach((beat) => {
    const div = document.createElement("div")
    div.className = "beat-card"

    div.innerHTML = `
      <!-- 🎧 COVER -->
      <div class="beat-cover">
        <img src="${beat.cover_url || "images/default-cover.jpg"}" />

        <div class="play-btn" data-src="${beat.mp3_url || ""}">▶</div>
      </div>

      <!-- 📝 TITLE -->
      <h3 class="beat-title">${beat.title || "Untitled"}</h3>

      <!-- 💰 ACTIONS -->
      <div class="beat-actions">
        <button class="buy-btn" data-id="${beat.id}">Buy</button>
        <button class="free-btn" data-src="${beat.mp3_url || ""}">
          Get Free 🔓
        </button>
      </div>
    `

    // 🟩 SAFE CARD CLICK (NO MORE PLAY BUG)
    div.addEventListener("click", (e) => {
      if (
        e.target.closest(".play-btn") ||
        e.target.closest(".buy-btn") ||
        e.target.closest(".free-btn")
      ) {
        return
      }

      window.location.href = `licence-page.html?id=${beat.id}`
    })

    container.appendChild(div)
  })
}






// 🎧 PLAYER + BUTTON SYSTEM
let currentAudio = null
let currentBtn = null

document.addEventListener("click", (e) => {

  // ▶ PLAY BUTTON (SAFE)
  const playBtn = e.target.closest(".play-btn")
  if (playBtn) {
    e.preventDefault()
    e.stopPropagation()

    const src = playBtn.dataset.src
    if (!src) return

    // 🔁 TOGGLE SAME
    if (currentBtn === playBtn && currentAudio) {
      if (!currentAudio.paused) {
        currentAudio.pause()
        setPlay(playBtn)
      } else {
        currentAudio.play()
        setPause(playBtn)
      }
      return
    }

    // ⛔ STOP PREVIOUS
    if (currentAudio) {
      currentAudio.pause()
      if (currentBtn) setPlay(currentBtn)
    }

    // ▶ NEW AUDIO
    currentAudio = new Audio(src)
    currentBtn = playBtn

    currentAudio.play()
    setPause(playBtn)

    currentAudio.onended = () => {
      setPlay(playBtn)
      currentAudio = null
      currentBtn = null
    }

    return
  }



  // 💰 BUY BUTTON
  const buyBtn = e.target.closest(".buy-btn")
  if (buyBtn) {
    e.preventDefault()
    e.stopPropagation()

    const id = buyBtn.dataset.id
    window.location.href = `licence-page.html?id=${id}`
    return
  }



  // 🟦 FREE (SUBSCRIBE + DOWNLOAD)
  const freeBtn = e.target.closest(".free-btn")
  if (freeBtn) {
    e.preventDefault()
    e.stopPropagation()

    const name = prompt("Enter your name:")
    if (!name) return

    const email = prompt("Enter your email:")
    if (!email) return

    const src = freeBtn.dataset.src
    if (src) {
      window.open(src, "_blank")
    }

    alert(`🔥 Welcome ${name}! Download unlocked.`)
    return
  }
})





// 🔘 BUTTON STATES
function setPlay(btn) {
  btn.textContent = "▶"
  btn.classList.remove("playing")
}

function setPause(btn) {
  btn.textContent = "⏸"
  btn.classList.add("playing")
}
