// ===============================
// 🌍 GLOBAL PLAYER - DOPE TONE PRO - FULL LENGTH WITH DROP ZONE PLUG
// ===============================
// ===============================
// 🎯 STATS MANAGER - DOPETONE
// ===============================

const STATS_API = 'https://dopetone-stats.dopetone701.workers.dev';

function logBeatEvent(beatId, eventType) {
  if (!beatId) return;
  fetch(`${STATS_API}/api/stats/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      beatId: parseInt(beatId),
      eventType: eventType
    })
  }).catch(err => console.warn('[Stats] Event log failed:', err));
}

function logPlay(beatId) { logBeatEvent(beatId, 'play'); }
function logLike(beatId, liked) { if (liked) logBeatEvent(beatId, 'like'); }
function logDownload(beatId) { logBeatEvent(beatId, 'download'); }
function logCart(beatId, added) { if (added) logBeatEvent(beatId, 'cart'); }

document.addEventListener("DOMContentLoaded", () => {

  const audio = new Audio()
  audio.crossOrigin = "anonymous"
  audio.preload = 'auto'
  audio.playsInline = true
  audio.mozPreservesPitch = false
  audio.webkitPreservesPitch = false
  audio.setAttribute('data-keep-alive', 'true')

  window.__DOPE_TONE_AUDIO__ = audio
  window._globalAudio = audio

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
  let playedBeats = new Set();

  let isShuffled = localStorage.getItem('dt_shuffle') === 'true'
  let repeatMode = parseInt(localStorage.getItem('dt_repeat') || '0')

  const PLAY_ICON = "M8 5v14l11-7z";
  const PAUSE_ICON = "M6 19h4V5H6v14zm8-14v14h4V5h-4z";

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
  const addBtn = document.getElementById("gpAdd")
  const mpAdd = document.getElementById("mpAdd")

  const mpPlay = document.getElementById("mpPlay")
  const mpPrev = document.getElementById("mpPrev")
  const mpNext = document.getElementById("mpNext")
  const mpHeart = document.getElementById("mpHeart")
  const mpDownload = document.getElementById("mpDownload")

  const gpPlayPath = document.getElementById("gpPlayPath")
  const mpPlayPath = document.getElementById("mpPlayPath")

  if (!playBtn) {
    console.error('[Dopetone] Global player missing #gpPlay button');
    return;
  }

  function applySavedState() {
    if (isShuffled) shuffleBtn?.classList.add("active")
    if (repeatMode === 1) repeatBtn?.classList.add("active")
    if (repeatMode === 2) repeatBtn?.classList.add("active", "repeat-one")
  }
  applySavedState()

  function updateMobilePlayerAura(song) {
    const player = document.getElementById('mobilePlayer');
    const coverImg = document.getElementById('mpCover');
    const titleEl = document.getElementById('mpTitle');
    const artistEl = document.getElementById('mpArtist');
    if (!player ||!song) return;
    const coverUrl = song.cover_url || song.cover || song.artwork || song.image || song.img;
    if (coverUrl) {
      player.style.backgroundImage = `url('${coverUrl}')`;
      if (coverImg) {
        coverImg.src = coverUrl;
        coverImg.alt = song.title || 'Album Cover';
      }
      if (cover) cover.src = coverUrl;
    }
    if (titleEl) titleEl.textContent = song.title || 'Unknown';
    if (title) title.textContent = song.title || 'Unknown';
    if (artistEl) artistEl.textContent = song.artist || song.producer || 'Dope Tone';
  }

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

  function stopAll() {
    document.querySelectorAll(".wave-row").forEach(row => {
      if (row.__wave) row.__wave.seekTo(0)
    })
  }

  function loadTrack(index, silent = false) {
    const beat = playlist[index]
    if (!beat?.mp3_url) return
    const wasPlaying =!audio.paused
    const isNewTrack = audio.src!== beat.mp3_url
    if (isNewTrack) {
      audio.pause()
      audio.src = beat.mp3_url
      audio.dataset.beatId = beat.id
      audio.load()
    }
    currentIndex = index
    window.__CURRENT_INDEX__ = index
    window.__CURRENT_LIST__ = currentListId
    window.__CURRENT_BEAT__ = beat
    updateMobilePlayerAura(beat)
    const isLiked = beat.liked || false
    ;[heartBtn, mpHeart].filter(Boolean).forEach(btn => {
      btn.classList.toggle('active', isLiked)
    })
    if (!isNewTrack) {
      audio.currentTime = 0
    }
    const row = document.querySelectorAll(".wave-row")[index]
    currentWave = row?.__wave || null
    if (!silent) {
      requestIdleCallback(() => {
        document.dispatchEvent(new CustomEvent("trackChange", { detail: beat }))
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
    if (wasPlaying || isNewTrack) {
      audio.play().catch(err => console.warn('[Player] Autoplay blocked:', err))
    }
  }

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
    document.querySelectorAll(".playlist-track-play.active,.playlist-play-btn.active,.grid-play.active").forEach(btn => btn.classList.remove("active"))
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
        console.warn('[Player] Play failed:', e)
        setTimeout(() => audio.play().catch(()=>{}), 100)
      })
    })
  }

  const togglePlay = (e) => {
    e?.preventDefault()
    e?.stopPropagation()
    if (!audio.src && playlist.length) {
      playTrack(0, playlist, currentListId)
      return
    }
    if (audio.paused) {
      audio.play().catch(err => console.warn('[Player] Play failed:', err))
    } else {
      audio.pause()
    }
  }

  playBtn.addEventListener('click', togglePlay)
  mpPlay?.addEventListener('click', togglePlay)

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
    logLike(beat.id, isLiked);
    window.dispatchEvent(new CustomEvent('cc_like_change', { detail: { beat_id: beat.id, liked: isLiked } }));
  }

  heartBtn?.addEventListener('click', handleLike)
  mpHeart?.addEventListener('click', handleLike)

  const handleDownload = async (e) => {
    e?.preventDefault()
    e?.stopPropagation()
    const beat = playlist[currentIndex]
    if (!beat) return
    logDownload(beat.id);
    window.dispatchEvent(new CustomEvent('cc_download', { detail: { beat_id: beat.id } }));
    const a = document.createElement('a')
    a.href = beat.mp3_url
    a.download = `${beat.title}.mp3`
    a.click()
  }

  downloadBtn?.addEventListener('click', handleDownload)
  mpDownload?.addEventListener('click', handleDownload)

  const handleAddToCart = async (e) => {
    e?.preventDefault()
    e?.stopPropagation()
    const beat = playlist[currentIndex]
    if (!beat) return
    const btn = e.currentTarget
    const isAdded =!btn.classList.contains('active')
    btn.classList.toggle('active')
    mpAdd?.classList.toggle('active', isAdded)
    addBtn?.classList.toggle('active', isAdded)
    logCart(beat.id, isAdded);
    window.dispatchEvent(new CustomEvent('cc_cart_change', { detail: { beat_id: beat.id, added: isAdded } }));
  }

  addBtn?.addEventListener('click', handleAddToCart)
  mpAdd?.addEventListener('click', handleAddToCart)

  shuffleBtn && shuffleBtn.addEventListener('click', toggleShuffle)
  repeatBtn && repeatBtn.addEventListener('click', cycleRepeat)

  function updatePlayIcons(isPlaying) {
    const icon = isPlaying? PAUSE_ICON : PLAY_ICON;
    if (gpPlayPath) gpPlayPath.setAttribute('d', icon);
    if (mpPlayPath) mpPlayPath.setAttribute('d', icon);
    document.getElementById("gpPlay")?.setAttribute("title", isPlaying? "Pause" : "Play");
    document.getElementById("mpPlay")?.setAttribute("title", isPlaying? "Pause" : "Play");
    document.body.classList.toggle("playing", isPlaying)
    // Sync Drop Zone beautiful modal icon
    const dropIcon = document.getElementById('dtPlayIcon');
    if(dropIcon) dropIcon.className = isPlaying? 'fa-solid fa-pause' : 'fa-solid fa-play';
  }

  audio.addEventListener("play", () => {
    updatePlayIcons(true)
    const beatId = audio.dataset.beatId;
    if (beatId &&!playedBeats.has(beatId)) {
      logPlay(beatId);
      playedBeats.add(beatId);
    }
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
    document.dispatchEvent(new CustomEvent("playerPlay", { detail: { index: currentIndex, listId: currentListId, beat: playlist[currentIndex] } }))
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

  function format(t) {
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60).toString().padStart(2, "0")
    return m + ":" + s
  }

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
    document.dispatchEvent(new CustomEvent("playerTimeUpdate", { detail: { index: currentIndex, percent, listId: currentListId } }))
  })

  audio.addEventListener("ended", () => {
    if (repeatMode === 2) {
      audio.currentTime = 0
      audio.play()
    } else {
      handleNext()
    }
  })

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

  window.playBeat = (id) => {
    const idx = playlist.findIndex(b=> String(b.id)===String(id));
    if(idx>=0) playTrack(idx, [], currentListId);
    else {
      const all = window.store?.beats || [];
      const b = all.find(x=> String(x.id)===String(id));
      if(b) playTrack(0, [b], 'single');
      else {
        // Also search in drop cache
        const drops = window._dropsCache || [];
        for(const d of drops){
          const found = (d.promotion?.items||[]).find(x=> String(x.id)===String(id));
          if(found){
            const list = d.promotion.items.map(it=>({id:it.id, title:it.title, cover_url:it.cover_url, mp3_url:it.audio_url||it.mp3_url||it.audio}));
            const fIdx = list.findIndex(x=> String(x.id)===String(id));
            playTrack(fIdx>=0? fIdx:0, list, 'drop-zone');
            break;
          }
        }
      }
    }
  };
  window.pauseBeat = () => audio.pause();

  if (window.location.pathname.includes('playlists.html')) {
    const recentBeats = JSON.parse(localStorage.getItem('recent_played') || '[]')
    if (recentBeats.length &&!window.__CURRENT_BEAT__) {
      playlist = recentBeats
      originalPlaylist = [...recentBeats]
      currentListId = 'recent'
      loadTrack(0, true)
    }
  }

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

  // === DT DROP ZONE - CLICK COVER ON PLAYER OPENS YOUR BEAUTIFUL MODAL ===
  const gpCoverEl = document.getElementById('gpCover');
  const mpCoverEl = document.getElementById('mpCover');
  const gpTitleEl = document.getElementById('gpTitle');

  function handlePlayerCoverClick(e){
    const beat = window.__CURRENT_BEAT__;
    if(!beat) return;
    e.stopPropagation();
    // If this beat exists in drop zone cache, open with dropId for full list
    const drops = window._dropsCache || [];
    let foundDropId = null;
    for(const d of drops){
      if((d.promotion?.items||[]).some(b=> String(b.id)===String(beat.id))){
        foundDropId = d.id;
        break;
      }
    }
    if(foundDropId && window.openBeatCard){
      window.openBeatCard(String(beat.id), foundDropId);
    } else if(window.openDropBeatModal){
      window.openDropBeatModal(String(beat.id));
    } else if(window.openBeatCard){
      window.openBeatCard(String(beat.id), null);
    }
  }

  if(gpCoverEl){
    gpCoverEl.style.cursor='pointer';
    gpCoverEl.title='Open Drop Card';
    gpCoverEl.addEventListener('click', handlePlayerCoverClick);
  }
  if(mpCoverEl){
    mpCoverEl.style.cursor='pointer';
    mpCoverEl.addEventListener('click', handlePlayerCoverClick);
  }
  // Also title click opens modal
  if(gpTitleEl){
    gpTitleEl.style.cursor='pointer';
    gpTitleEl.addEventListener('click', handlePlayerCoverClick);
  }

  console.log('[Dopetone] Global Player loaded. Drop Zone plugged - click cover opens beautiful modal, toggle linked.');
})

function initMobilePlayer() {
  const globalPlayer = document.getElementById('globalPlayerUI')
  const mobilePlayer = document.getElementById('mobilePlayer')
  const mpClose = document.getElementById('mpClose')
  if (!globalPlayer ||!mobilePlayer) return
  globalPlayer.addEventListener('click', (e) => {
    if (e.target.closest('.gp-controls button')) return
    if (e.target.closest('#gpAdd')) return
    if (window.innerWidth > 768) return
    openMobilePlayer()
  })
  mpClose?.addEventListener('click', closeMobilePlayer)
  let startY = 0
  let isDragging = false
  let startTime = 0
  mobilePlayer.addEventListener('touchstart', (e) => {
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
    if (diff > 0) {
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
    if (diff > 120 || velocity > 0.5) {
      closeMobilePlayer()
    } else {
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
