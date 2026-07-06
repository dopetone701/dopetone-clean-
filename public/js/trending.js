// ===============================
// TRENDING SECTION (FILTER WIRED SAFE + BIG SVG ICONS)
// ===============================
import { globalFilter } from './global-filter.js';

export function renderTrending() {
  const container = document.getElementById("trendingGrid")
  if (!container ||!window.store?.beats?.length) return

  const beats = globalFilter.filterBeats(window.store.beats, 'trending')

  container.innerHTML = ""
  let activeBeatId = null

  // =========================
  // 🧩 INITIAL (4 CARDS)
  // =========================
  beats.slice(0, 4).forEach((beat, i) => {
    container.appendChild(createCard(beat, i))
  })

  let pointer = 4
  let rotIndex = 0

  // =========================
  // 🔁 ROTATION (SAFE)
  // =========================
  setInterval(() => {
    const cards = [...container.querySelectorAll(".trending-card")]
    if (!cards.length) return

    let card = null

    for (let i = 0; i < cards.length; i++) {
      const tryCard = cards[(rotIndex + i) % cards.length]
      if (!tryCard.classList.contains("active")) {
        card = tryCard
        rotIndex = (rotIndex + i + 1) % cards.length
        break
      }
    }

    if (!card) {
      card = cards[rotIndex]
      rotIndex = (rotIndex + 1) % cards.length
    }

    if (card.classList.contains("active")) return

    card.classList.add("fade-out")

    setTimeout(() => {
      const beat = beats[pointer % beats.length]
      const beatIndex = pointer % beats.length
      pointer++

      updateCard(card, beat, beatIndex)
      card.classList.remove("fade-out")
      card.classList.add("fade-in")

      setTimeout(() => {
        card.classList.remove("fade-in")
      }, 200)
    }, 200)
  }, 1800)

  // =========================
  // 🧩 CREATE CARD
  // =========================
  function createCard(beat, index) {
    const card = document.createElement("div")
    card.className = "trending-card"
    card.dataset.id = beat.id
    card.dataset.index = index

    card.innerHTML = `
      <img src="${beat.cover_url || beat.image || 'images/studio.jpg'}" />
      <button class="trending-play">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </button>
      <div class="trending-info">
        <div class="trending-title">${beat.title}</div>
        <div class="trending-genre">${beat.genre || "Unknown"}</div>
      </div>
    `

    attachPlay(card, beat, index)
    attachNavigation(card, beat)
    return card
  }

  // =========================
  // 🔄 UPDATE CARD
  // =========================
  function updateCard(card, beat, index) {
    card.dataset.id = beat.id
    card.dataset.index = index
    card.querySelector("img").src = beat.cover_url || beat.image || 'images/studio.jpg'
    card.querySelector(".trending-title").textContent = beat.title
    card.querySelector(".trending-genre").textContent = beat.genre || "Unknown"
    
    const btn = card.querySelector(".trending-play")
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z"/>
      </svg>
    `
    attachPlay(card, beat, index)
    attachNavigation(card, beat)
  }

  // =========================
  // ▶ PLAY SYSTEM
  // =========================
  function attachPlay(card, beat, index) {
    const btn = card.querySelector(".trending-play")
    btn.onclick = (e) => {
      e.stopPropagation()
      window.globalPlayer.play(index, [...beats], "trending")
    }
  }

  // =========================
  // 💀 NAVIGATION
  // =========================
  function attachNavigation(card, beat) {
    function addToCart() {
      let cart = JSON.parse(localStorage.getItem("dopetone_cart")) || []
      const cartBeat = {
        id: beat.id,
        title: beat.title,
        cover: beat.cover_url,
        cover_url: beat.cover_url,
        genre: beat.genre,
        bpm: beat.bpm,
        audio: beat.mp3_url || beat.audio,
        mp3_url: beat.mp3_url,
        mood: beat.mood,
        key: beat.key,
        type: beat.type
      }
      const exists = cart.find(item => item.id == beat.id)
      if(!exists){
        cart.push(cartBeat)
        localStorage.setItem("dopetone_cart", JSON.stringify(cart))
      }
    }

    card.ondblclick = (e) => {
      if (e.target.closest(".trending-play")) return
      addToCart()
      window.location.href = `licence-page.html?id=${beat.id}`
    }

    let lastTap = 0
    card.addEventListener("touchend", (e) => {
      if (e.target.closest(".trending-play")) return
      const now = Date.now()
      if(now - lastTap < 350){
        e.preventDefault()
        addToCart()
        window.location.href = `licence-page.html?id=${beat.id}`
      }
      lastTap = now
    }, { passive:false })
  }

  // =========================
  // 🔥 PLAYER SYNC
  // =========================
  document.addEventListener("playerPlay", (e) => {
    const { index, listId } = e.detail
    const currentBeat = beats[index]
    if (!currentBeat) return

    activeBeatId = (listId === "trending")? currentBeat.id : null

    document.querySelectorAll(".trending-card").forEach(card => {
      const btn = card.querySelector(".trending-play")
      if (listId === "trending" && card.dataset.id == activeBeatId) {
        card.classList.add("active")
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
          </svg>
        `
      } else {
        card.classList.remove("active")
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        `
      }
    })
  })

  document.addEventListener("playerPause", () => {
    document.querySelectorAll(".trending-play").forEach(btn => {
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      `
    })
  })
}
