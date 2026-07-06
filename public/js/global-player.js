// ===============================
// 🌍 GLOBAL PLAYER - DOPE TONE PRO
// ===============================

document.addEventListener("DOMContentLoaded", () => {

  // ===============================
  // 🎵 AUDIO - ANTI-STUTTER
  // ===============================
  const audio = new Audio()
  audio.crossOrigin = "anonymous"
  audio.preload = 'auto'
  audio.playsInline = true
  audio.mozPreservesPitch = false
  audio.webkitPreservesPitch = false
  audio.setAttribute('data-keep-alive', 'true')

  window.__DOPE_TONE_AUDIO__ = audio

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && audio.paused && window.__CURRENT_BEAT__) {
      audio.play().catch(()=>{})
    }
  })

  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => audio.play())
    navigator.mediaSession.setActionHandler('pause', () => audio.pause())
    navigator.mediaSession.setActionHandler('nexttrack', () => window.globalPlayer?.next())
    navigator.mediaSession.setActionHandler('previoustrack', () => window.globalPlayer?.prev())
  }

  let playlist = []
  let originalPlaylist = []
  let currentIndex = -1
  let currentListId = null
  let currentTrackKey = null
  let currentWave = null

  let isShuffled = localStorage.getItem('dt_shuffle') === 'true'
  let repeatMode = parseInt(localStorage.getItem('dt_repeat') || '0') // 0=off, 1=all, 2=one

  // ===============================
  // 🔥 ICON PATHS - SINGLE SOURCE OF TRUTH
  // ===============================
  const PLAY_ICON = "M8 5v14l11-7z";
  const PAUSE_ICON = "M6 19h4V5H6v14zm8-14v14h4V5h-4z";

  // ===============================
  // 🔥 D1 TRACKING HELPERS
  // ===============================
  const API_URL = 'https://dope-tone-api.dopetone701.workers.dev';

  async function trackBeatPlay(beatId) {
    try {
      await fetch(`${API_URL}/api/stats/play`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          beat_id: beatId,
          user_id: window.Auth?.user?.id || 'anonymous',
          timestamp: Date.now()
        })
      });
    } catch (err) {
      console.error('trackBeatPlay error:', err);
    }
  }

  async function trackBeatLike(beatId, isLiked) {
    try {
      await fetch(`${API_URL}/api/stats/like`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          beat_id: beatId,
          liked: isLiked,
          user_id: window.Auth?.user?.id || 'anonymous',
          timestamp: Date.now()
        })
      });
    } catch (err) {
      console.error('trackBeatLike error:', err);
    }
  }

  async function trackBeatDownload(beatId) {
    try {
      await fetch(`${API_URL}/api/stats/download`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          beat_id: beatId,
          user_id: window.Auth?.user?.id || 'anonymous',
          timestamp: Date.now()
        })
      });
    } catch (err) {
      console.error('trackBeatDownload error:', err);
    }
  }

  // ===============================
  // 🎯 UI ELEMENTS
  // ===============================
  const playBtn = document.getElementById("gpPlay")
  const nextBtn = document.getElementById("gpNext")
  const prevBtn = document.getElementById("gpPrev")
  const shuffleBtn = document.getElementById("gpShuffle")
  const repeatBtn = document.getElementById("gpRepeat")
  const heartBtn = document.getElementById("gpHeart")
  const downloadBtn = document.getElementById("gpDownload")
  const bar = document.getElementById("gpBar")
  const title = document.getElementById("gpTitle")
  const cover = document.getElementById("gpCover")
  const current = document.getElementById("gpCurrent")
  const duration = document.getElementById("gpDuration")

  // Mobile player
  const mpPlay = document.getElementById("mpPlay")
  const mpPrev = document.getElementById("mpPrev")
  const mpNext = document.getElementById("mpNext")
  const mpHeart = document.getElementById("mpHeart")
  const mpDownload = document.getElementById("mpDownload")

  // SVG Paths
  const gpPlayPath = document.getElementById("gpPlayPath")
  const mpPlayPath = document.getElementById("mpPlayPath")

  if (!playBtn) {
    console.error('[Dopetone] Global player missing #gpPlay button');
    return;
  }

  // ===============================
  // 💾 APPLY SAVED STATE ON LOAD
  // ===============================
  function applySavedState() {
    if (isShuffled) shuffleBtn?.classList.add("active")
    if (repeatMode === 1) repeatBtn?.classList.add("active")
    if (repeatMode === 2) repeatBtn?.classList.add("active", "repeat-one")
  }
  applySavedState()

  // ===============================
  // 🌊 UPDATE MOBILE PLAYER AURA
  // ===============================
  function updateMobilePlayerAura(song) {
    const player = document.getElementById('mobilePlayer');
    const coverImg = document.getElementById('mpCover');
    const titleEl = document.getElementById('mpTitle');
    const artistEl = document.getElementById('mpArtist');
    
    if (!player ||!song) return;
    
    // Update background aura
    const coverUrl = song.cover_url || song.cover || song.artwork || song.image || song.img;
    if (coverUrl) {
      player.style.backgroundImage = `url('${coverUrl}')`;
      if (coverImg) {
        coverImg.src = coverUrl;
        coverImg.alt = song.title || 'Album Cover';
      }
      if (cover) cover.src = coverUrl;
    }
    
    // Update text
    if (titleEl) titleEl.textContent = song.title || 'Unknown';
    if (title) title.textContent = song.title || 'Unknown';
    if (artistEl) artistEl.textContent = song.artist || song.producer || 'Dope Tone';
  }

  // ===============================
  // 🔀 SHUFFLE LOGIC
  // ===============================
  function toggleShuffle(e) {
    e?.stopPropagation()
    isShuffled =!isShuffled
    localStorage.setItem('dt_shuffle', isShuffled)

    if (isShuffled) {
      repeatMode = 0
      localStorage.setItem('dt_repeat', '0')
      repeatBtn?.classList.remove("active", "repeat-one")
      repeatBtn?.setAttribute("title", "Enable repeat")

      const currentTrack = playlist[currentIndex]
      originalPlaylist = [...playlist]

      playlist = playlist.filter((_, i) => i!== currentIndex)
      for (let i = playlist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[playlist[i], playlist[j]] = [playlist[j], playlist[i]]
      }
      if (currentTrack) playlist.unshift(currentTrack)
      currentIndex = 0

      shuffleBtn?.classList.add("active")
      shuffleBtn?.setAttribute("title", "Disable shuffle")
    } else {
      const currentTrack = playlist[currentIndex]
      playlist = [...originalPlaylist]
      currentIndex = playlist.findIndex(t => t.id === currentTrack?.id)
      if (currentIndex === -1) currentIndex = 0

      shuffleBtn?.classList.remove("active")
      shuffleBtn?.setAttribute("title", "Enable shuffle")
    }

    window.__CURRENT_INDEX__ = currentIndex
    document.dispatchEvent(new CustomEvent("playlistShuffled", { detail: { isShuffled } }))
  }

  // ===============================
  // 🔁 REPEAT LOGIC
  // ===============================
  function cycleRepeat(e) {
    e?.stopPropagation()
    repeatMode = (repeatMode + 1) % 3
    localStorage.setItem('dt_repeat', repeatMode)

    if (repeatMode!== 0 && isShuffled) {
      isShuffled = false
      localStorage.setItem('dt_shuffle', 'false')
      shuffleBtn?.classList.remove("active")
      shuffleBtn?.setAttribute("title", "Enable shuffle")
      const currentTrack = playlist[currentIndex]
      playlist = [...originalPlaylist]
      currentIndex = playlist.findIndex(t => t.id === currentTrack?.id)
      if (currentIndex === -1) currentIndex = 0
    }

    repeatBtn?.classList.remove("repeat-one", "active")

    if (repeatMode === 1) {
      repeatBtn?.classList.add("active")
      repeatBtn?.setAttribute("title", "Repeat: All")
    } else if (repeatMode === 2) {
      repeatBtn?.classList.add("active", "repeat-one")
      repeatBtn?.setAttribute("title", "Repeat: One")
    } else {
      repeatBtn?.setAttribute("title", "Enable repeat")
    }
  }

  // ===============================
  // 🛑 STOP ALL WAVES
  // ===============================
  function stopAll() {
    document.querySelectorAll(".wave-row").forEach(row => {
      if (row.__wave) row.__wave.seekTo(0)
    })
  }

  // ===============================
  // 🎯 LOAD TRACK
  // ===============================
  function loadTrack(index, silent = false) {
    const beat = playlist[index]
    if (!beat?.mp3_url) return

    const wasPlaying =!audio.paused

    if (audio.src!== beat.mp3_url) {
      audio.pause()
      audio.src = beat.mp3_url
      audio.load()

      if (wasPlaying &&!silent) {
        audio.addEventListener('canplaythrough', function onCanPlay() {
          audio.removeEventListener('canplaythrough', onCanPlay)
          audio.play().catch(()=>{})
        }, { once: true })
      }
    }

    currentIndex = index
    window.__CURRENT_INDEX__ = index
    window.__CURRENT_LIST__ = currentListId
    window.__CURRENT_BEAT__ = beat

    // Update mobile aura + all info
    updateMobilePlayerAura(beat)

    const isLiked = beat.liked || false
    ;[heartBtn, mpHeart].filter(Boolean).forEach(btn => {
      btn.classList.toggle('active', isLiked)
    })

    if (audio.src === beat.mp3_url) {
      audio.currentTime = 0
    }

    const row = document.querySelectorAll(".wave-row")[index]
    currentWave = row?.__wave || null

    if (!silent) {
      requestIdleCallback(() => {
        document.dispatchEvent(new CustomEvent("trackChange", { detail: beat }))
        trackBeatPlay(beat.id)
        localStorage.setItem('dt_cc_current', JSON.stringify({
          id: beat.id,
          title: beat.title,
          cover: beat.cover_url,
          list: currentListId,
          timestamp: Date.now()
        }))
        window.dispatchEvent(new CustomEvent('cc_track_change', { detail: beat }))

        if ('mediaSession' in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: beat.title,
            artist: 'Dope Tone',
            artwork: [{ src: beat.cover_url || 'images/logo.png', sizes: '512x512', type: 'image/png' }]
          })
        }
      })
    }
  }

  // ===============================
  // ▶ PLAY TRACK
  // ===============================
  function playTrack(index = 0, list = [], listId = "default") {
    window.refreshMobileHeart?.()

    if (list.length) {
      playlist = [...list]
      originalPlaylist = [...list]
      currentListId = listId
      if (isShuffled) {
        isShuffled = false
        localStorage.setItem('dt_shuffle', 'false')
        shuffleBtn?.classList.remove("active")
      }
    }

    if (!playlist.length ||!playlist[index]?.mp3_url) return

    const beat = playlist[index]
    const newTrackKey = `${currentListId}_${index}_${beat.id}`
    const isSameTrack = currentTrackKey === newTrackKey

    document.querySelectorAll(".playlist-track-play.active,.playlist-play-btn.active,.grid-play.active")
  .forEach(btn => btn.classList.remove("active"))

    if (isSameTrack) {
      if (audio.paused) audio.play().catch(()=>{})
      else audio.pause()
      return
    }

    audio.pause()
    stopAll()

    requestAnimationFrame(() => {
      loadTrack(index)
      currentTrackKey = newTrackKey
      window.__ACTIVE_TRACK_KEY__ = newTrackKey

      if (window.location.pathname.includes('beats.html') && window.filterBeatsToSight) {
        window.filterBeatsToSight([beat])
      }

      audio.play().catch(e => {
        setTimeout(() => audio.play().catch(()=>{}), 100)
      })
    })
  }

  // ===============================
  // ▶ PLAY/PAUSE BUTTONS
  // ===============================
  const togglePlay = (e) => {
    e?.preventDefault()
    e?.stopPropagation()
    if (!audio.src && playlist.length) {
      playTrack(0, playlist, currentListId)
      return
    }
    if (audio.paused) audio.play()
    else audio.pause()
  }

  playBtn.addEventListener('click', togglePlay)
  mpPlay?.addEventListener('click', togglePlay)

  // ===============================
  // ⏭ NEXT
  // ===============================
  const handleNext = (e) => {
    e?.preventDefault()
    e?.stopPropagation()
    if (!playlist.length) return

    if (repeatMode === 2) {
      audio.currentTime = 0
      audio.play()
      return
    }

    if (isShuffled) {
      let randomIndex
      do {
        randomIndex = Math.floor(Math.random() * playlist.length)
      } while (playlist.length > 1 && randomIndex === currentIndex)
      currentIndex = randomIndex
    } else {
      if (currentIndex === playlist.length - 1) {
        if (repeatMode === 1) currentIndex = 0
        else {
          audio.pause()
          return
        }
      } else {
        currentIndex++
      }
    }

    loadTrack(currentIndex)

    if (window.location.pathname.includes('beats.html')) {
      const currentBeat = playlist[currentIndex]
      if (currentBeat && window.filterBeatsToSight) {
        window.filterBeatsToSight([currentBeat])
      }
    }

    audio.play()
  }

  nextBtn.addEventListener('click', handleNext)
  mpNext && mpNext.addEventListener('click', handleNext)

  // ===============================
  // ⏮ PREVIOUS
  // ===============================
  const handlePrev = (e) => {
    e?.preventDefault()
    e?.stopPropagation()
    if (!playlist.length) return

    if (audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }

    if (isShuffled) {
      let randomIndex
      do {
        randomIndex = Math.floor(Math.random() * playlist.length)
      } while (playlist.length > 1 && randomIndex === currentIndex)
      currentIndex = randomIndex
    } else {
      currentIndex = (currentIndex - 1 + playlist.length) % playlist.length
    }

    loadTrack(currentIndex)

    if (window.location.pathname.includes('beats.html')) {
      const currentBeat = playlist[currentIndex]
      if (currentBeat && window.filterBeatsToSight) {
        window.filterBeatsToSight([currentBeat])
      }
    }

    audio.play()
  }

  prevBtn.addEventListener('click', handlePrev)
  mpPrev && mpPrev.addEventListener('click', handlePrev)

  // ===============================
  // ❤️ LIKE BUTTON
  // ===============================
  const handleLike = async (e) => {
    e?.preventDefault()
    e?.stopPropagation()
    const beat = playlist[currentIndex]
    if (!beat) return

    const btn = e.currentTarget
    const isLiked =!btn.classList.contains('active')
    btn.classList.toggle('active')
    mpHeart?.classList.toggle('active', isLiked)
    heartBtn?.classList.toggle('active', isLiked)

    beat.liked = isLiked

    trackBeatLike(beat.id, isLiked);
    window.dispatchEvent(new CustomEvent('cc_like_change', {
      detail: { beat_id: beat.id, liked: isLiked }
    }));
  }

  heartBtn?.addEventListener('click', handleLike)
  mpHeart?.addEventListener('click', handleLike)

  // ===============================
  // ⬇️ DOWNLOAD BUTTON
  // ===============================
  const handleDownload = async (e) => {
    e?.preventDefault()
    e?.stopPropagation()
    const beat = playlist[currentIndex]
    if (!beat) return

    trackBeatDownload(beat.id);
    window.dispatchEvent(new CustomEvent('cc_download', { detail: { beat_id: beat.id } }));

    const a = document.createElement('a')
    a.href = beat.mp3_url
    a.download = `${beat.title}.mp3`
    a.click()
  }

  downloadBtn?.addEventListener('click', handleDownload)
  mpDownload?.addEventListener('click', handleDownload)

  // ===============================
  // 🔀🔁 BINDINGS
  // ===============================
  shuffleBtn && shuffleBtn.addEventListener('click', toggleShuffle)
  repeatBtn && repeatBtn.addEventListener('click', cycleRepeat)

  // ===============================
  // 🔄 PLAY STATE - SINGLE PATH SWAP
  // ===============================
  function updatePlayIcons(isPlaying) {
    const icon = isPlaying? PAUSE_ICON : PLAY_ICON;
    if (gpPlayPath) gpPlayPath.setAttribute('d', icon);
    if (mpPlayPath) mpPlayPath.setAttribute('d', icon);
   
    document.getElementById("gpPlay")?.setAttribute("title", isPlaying? "Pause" : "Play");
    document.getElementById("mpPlay")?.setAttribute("title", isPlaying? "Pause" : "Play");
    document.body.classList.toggle("playing", isPlaying)
  }

  audio.addEventListener("play", () => {
    updatePlayIcons(true)

    localStorage.setItem('dt_cc_playing', 'true');
    window.dispatchEvent(new CustomEvent('cc_player_state', { detail: { playing: true } }));

    if (currentListId === 'grid') {
      document.querySelectorAll(".grid-play").forEach((b, i) => {
        if (i === currentIndex) {
          b.classList.add("active")
          b.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="pointer-events:none;"><path d="${PAUSE_ICON}"/></svg>`
        } else {
          b.classList.remove("active")
          b.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="pointer-events:none;"><path d="${PLAY_ICON}"/></svg>`
        }
      })
    }

    document.dispatchEvent(
      new CustomEvent("playerPlay", {
        detail: { index: currentIndex, listId: currentListId, beat: playlist[currentIndex] }
      })
    )
  })

  audio.addEventListener("pause", () => {
    updatePlayIcons(false)

    localStorage.setItem('dt_cc_playing', 'false');
    window.dispatchEvent(new CustomEvent('cc_player_state', { detail: { playing: false } }));

    if (currentListId === 'grid') {
      document.querySelectorAll(".grid-play").forEach(b => {
        b.classList.remove("active")
        b.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="pointer-events:none;"><path d="${PLAY_ICON}"/></svg>`
      })
    }

    document.dispatchEvent(new Event("playerPause"))
  })

  // ===============================
  // ⏱ FORMAT TIME
  // ===============================
  function format(t) {
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60).toString().padStart(2, "0")
    return m + ":" + s
  }

  // ===============================
  // ⏱ TIME UPDATE
  // ===============================
  audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return
    const percent = audio.currentTime / audio.duration

    if (bar) bar.style.width = percent * 100 + "%"
    if (current) current.textContent = format(audio.currentTime)
    if (duration) duration.textContent = format(audio.duration)

    const mpBar = document.getElementById("mpBar")
    const mpCurrent = document.getElementById("mpCurrent")
    const mpDuration = document.getElementById("mpDuration")
    if (mpBar) mpBar.style.width = percent * 100 + "%"
    if (mpCurrent) mpCurrent.textContent = format(audio.currentTime)
    if (mpDuration) mpDuration.textContent = format(audio.duration)

    document.dispatchEvent(
      new CustomEvent("playerTimeUpdate", {
        detail: { index: currentIndex, percent, listId: currentListId }
      })
    )
  })

  // ===============================
  // 🔚 AUTO NEXT
  // ===============================
  audio.addEventListener("ended", () => {
    if (repeatMode === 2) {
      audio.currentTime = 0
      audio.play()
    } else {
      handleNext()
    }
  })

  // ===============================
  // 🎯 SEEK SYSTEM
  // ===============================
  function setupSeeker(wrapId, barId) {
    const progressWrap = document.getElementById(wrapId)
    if (!progressWrap) return

    function seekTo(clientX) {
      if (!audio.duration) return
      const rect = progressWrap.getBoundingClientRect()
      const clickX = clientX - rect.left
      const percent = Math.max(0, Math.min(1, clickX / rect.width))
      audio.currentTime = percent * audio.duration
    }

    progressWrap.addEventListener("click", e => seekTo(e.clientX))
    progressWrap.addEventListener("touchstart", e => {
      e.preventDefault()
      seekTo(e.touches[0].clientX)
    }, { passive: false })

    let dragging = false
    progressWrap.addEventListener("mousedown", e => {
      dragging = true
      seekTo(e.clientX)
    })
    document.addEventListener("mouseup", () => { dragging = false })
    document.addEventListener("mousemove", e => {
      if (!dragging) return
      seekTo(e.clientX)
    })
    progressWrap.addEventListener("touchmove", e => {
      e.preventDefault()
      seekTo(e.touches[0].clientX)
    }, { passive: false })
  }

  setupSeeker("gpProgress")
  setupSeeker("mpProgress")

  // ===============================
  // 🌍 GLOBAL ACCESS
  // ===============================
  window.globalPlayer = {
    play: playTrack,
    toggle: togglePlay,
    next: handleNext,
    prev: handlePrev,
    isPlaying: () =>!audio.paused,
    loadTrack: loadTrack,
    getCurrentIndex: () => currentIndex,
    getCurrentList: () => currentListId,
    getPlaylist: () => playlist,
    toggleShuffle: toggleShuffle,
    cycleRepeat: cycleRepeat,
    getShuffleState: () => isShuffled,
    getRepeatMode: () => repeatMode
  }

  // ===============================
  // 💀 NUCLEAR: AUTO-LOAD FROM RECENT
  // ===============================
  if (window.location.pathname.includes('playlists.html')) {
    const recentBeats = JSON.parse(localStorage.getItem('recent_played') || '[]')
    if (recentBeats.length &&!window.__CURRENT_BEAT__) {
      playlist = recentBeats
      originalPlaylist = [...recentBeats]
      currentListId = 'recent'
      loadTrack(0, true)
    }
  }

  // ===============================
  // 🔥 ALL BEATS: AUTO-ARM RANDOM
  // ===============================
  if (window.location.pathname.includes('beats.html')) {
    const armRandomBeat = () => {
      if (window.store?.beats?.length &&!window.__CURRENT_BEAT__) {
        const randomIndex = Math.floor(Math.random() * window.store.beats.length)
        playlist = [...window.store.beats]
        originalPlaylist = [...window.store.beats]
        currentListId = 'all-beats'
        loadTrack(randomIndex, true)
      }
    }

    if (window.store?.loaded) {
      armRandomBeat()
    } else {
      const checkStore = setInterval(() => {
        if (window.store?.loaded) {
          clearInterval(checkStore)
          armRandomBeat()
        }
      }, 50)
    }
  }

  console.log('[Dopetone] Global Player loaded. Single-path icons active.');
})

// ===============================
// FULLSCREEN MOBILE PLAYER - FIXED SWIPE
// ===============================
function initMobilePlayer() {
  const globalPlayer = document.getElementById('globalPlayerUI')
  const mobilePlayer = document.getElementById('mobilePlayer')
  const mpClose = document.getElementById('mpClose')

  if (!globalPlayer ||!mobilePlayer) return

  // TAP MINI PLAYER TO OPEN FULLSCREEN
  globalPlayer.addEventListener('click', (e) => {
    if (e.target.closest('.gp-controls button')) return
    if (e.target.closest('#gpAdd')) return
    if (window.innerWidth > 768) return

    openMobilePlayer()
  })

  // CLOSE FULLSCREEN
  mpClose?.addEventListener('click', closeMobilePlayer)

  // Swipe down to close - FIXED
  let startY = 0
  let isDragging = false
  let startTime = 0

  mobilePlayer.addEventListener('touchstart', (e) => {
    // Only allow swipe from top area
    if (e.target.closest('#mpControls') || e.target.closest('#mpProgress')) return
    
    startY = e.touches[0].clientY
    startTime = Date.now()
    isDragging = true
    mobilePlayer.style.transition = 'none'
  }, { passive: true })

  mobilePlayer.addEventListener('touchmove', (e) => {
    if (!isDragging) return
    
    const currentY = e.touches[0].clientY
    const diff = currentY - startY

    if (diff > 0) { // Only allow swipe down
      e.preventDefault()
      const opacity = Math.max(0.3, 1 - (diff / 400))
      mobilePlayer.style.transform = `translateY(${diff}px)`
      mobilePlayer.style.opacity = opacity
    }
  }, { passive: false })

  mobilePlayer.addEventListener('touchend', (e) => {
    if (!isDragging) return
    isDragging = false
    
    const currentY = e.changedTouches[0].clientY
    const diff = currentY - startY
    const velocity = diff / (Date.now() - startTime)

    mobilePlayer.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease'

    // Close if swiped >120px or fast flick
    if (diff > 120 || velocity > 0.5) {
      closeMobilePlayer()
    } else {
      // Snap back
      mobilePlayer.style.transform = 'translateY(0)'
      mobilePlayer.style.opacity = '1'
    }
  })
}

function openMobilePlayer() {
  const mobilePlayer = document.getElementById('mobilePlayer')
  if (!mobilePlayer) return

  syncPlayerData()
  mobilePlayer.classList.add('active')
  document.body.style.overflow = 'hidden'
  
  // Reset transform in case it was left mid-swipe
  mobilePlayer.style.transform = 'translateY(0)'
  mobilePlayer.style.opacity = '1'
  mobilePlayer.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease'
}

function closeMobilePlayer() {
  const mobilePlayer = document.getElementById('mobilePlayer')
  if (!mobilePlayer) return

  mobilePlayer.classList.remove('active')
  mobilePlayer.style.transform = 'translateY(100%)'
  mobilePlayer.style.opacity = '0'
  document.body.style.overflow = ''
  
  // Reset after animation
  setTimeout(() => {
    mobilePlayer.style.transform = ''
    mobilePlayer.style.opacity = ''
    mobilePlayer.style.transition = ''
  }, 400)
}

function syncPlayerData() {
  const gpCover = document.getElementById('gpCover')
  const mpCover = document.getElementById('mpCover')
  if (gpCover && mpCover) mpCover.src = gpCover.src

  const gpTitle = document.getElementById('gpTitle')
  const mpTitle = document.getElementById('mpTitle')
  if (gpTitle && mpTitle) mpTitle.textContent = gpTitle.textContent

  // Sync play state via single path
  const audio = window.__DOPE_TONE_AUDIO__
  if (audio) {
    const isPlaying =!audio.paused
    const PLAY_ICON = "M8 5v14l11-7z"
    const PAUSE_ICON = "M6 19h4V5H6v14zm8-14v14h4V5h-4z"
    const icon = isPlaying? PAUSE_ICON : PLAY_ICON
    document.getElementById("mpPlayPath")?.setAttribute('d', icon)
  }

  const gpBar = document.getElementById('gpBar')
  const mpBar = document.getElementById('mpBar')
  if (gpBar && mpBar) mpBar.style.width = gpBar.style.width

  const gpCurrent = document.getElementById('gpCurrent')
  const mpCurrent = document.getElementById('mpCurrent')
  if (gpCurrent && mpCurrent) mpCurrent.textContent = gpCurrent.textContent

  const gpDuration = document.getElementById('gpDuration')
  const mpDuration = document.getElementById('mpDuration')
  if (gpDuration && mpDuration) mpDuration.textContent = gpDuration.textContent

  const mobilePlayer = document.getElementById('mobilePlayer')
  if (mobilePlayer && gpCover) {
    mobilePlayer.style.backgroundImage = `url(${gpCover.src})`
  }
}

document.addEventListener('DOMContentLoaded', initMobilePlayer)
