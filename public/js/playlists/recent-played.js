// ===============================
// 🎵 RP UNIQUE - NO CONFLICTS
// ===============================

const PLAY_SVG = `
<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M8 5.14v14l11-7-11-7z"/>
</svg>`;

const PAUSE_SVG = `
<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M6 19h4V5H6zm8-14v14h4V5z"/>
</svg>`;


const RECENT_KEY = 'recent_played';
const MAX_RECENT = 10;
let isScrolling = false;
let hasAnimated = false;

// DRAG STATE - GLOBAL SO CARD CLICKS CAN CHECK
let isDragging = false;
let dragThreshold = 5;

// ===============================
// 📦 STORAGE
// ===============================
function getRecentBeats() {
  return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
}

function saveRecentBeats(beats) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(beats.slice(0, MAX_RECENT)));
}

export function addToRecent(beat) {
  if (!beat ||!beat.id) return;
 
  let beats = getRecentBeats();
 
  // Already first - bail
  if (beats[0]?.id === beat.id) return;
 
  beats = beats.filter(b => b.id!== beat.id);
  beats.unshift(beat);
  saveRecentBeats(beats);
 
  // Re-render silently if not playing
  if (!window.globalPlayer?.isPlaying()) {
    renderRecentPlayed(true);
  } else {
    setTimeout(syncPlayButtons, 50);
  }
}

export function getCurrentBeat() {
  const beats = getRecentBeats();
  return beats[0] || null;
}

// ===============================
// 🎨 RENDER - UNIQUE CARDS
// ===============================
export function renderRecentPlayed(silent = false) {
  const section = document.getElementById("recentPlayedWrap");
  const container = document.getElementById("rpTrackMount");
  if (!container ||!section) return;

  let beats = getRecentBeats();

  if (!beats.length) {
    section.classList.remove('rp-active');
    container.innerHTML = '';
    return;
  }

  section.classList.add('rp-active');
  container.innerHTML = '';

  // SCROLL SNAP WRAPPER
  const scroller = document.createElement('div');
  scroller.className = 'rp-scroll';
 
  beats.slice(0, 10).forEach((beat, index) => {
    const card = document.createElement('div');
    card.className = 'rp-card';
    card.dataset.beatId = beat.id;
    card.dataset.index = index;

    card.innerHTML = `
      <div class="rp-cover">
        <img src="${beat.cover_url || 'images/logo.png'}" alt="${beat.title}" loading="lazy" />
        <button class="rp-playbtn" data-beat-id="${beat.id}">
         <span class="rp-icon">${PLAY_SVG}</span>

        </button>
      </div>
      <div class="rp-title">${beat.title || 'Untitled'}</div>
    `;

    // PLAY BUTTON - BLOCK ON DRAG
    const playBtn = card.querySelector('.rp-playbtn');
    playBtn.onclick = (e) => {

    e.stopPropagation();

    if (isDragging) {
        e.preventDefault();
        return;
    }

    const audio =
        window.__PLAYER__ ||
        window.__DOPE_TONE_AUDIO__ ||
        document.querySelector("audio");

    const currentBeat = window.__CURRENT_BEAT__;

    const sameBeat =
        String(currentBeat?.id) === String(beat.id);

    if (sameBeat && audio && !audio.paused) {

        audio.pause();

    } else if (sameBeat && audio && audio.paused) {

        audio.play().catch(() => {});

    } else {

        window.globalPlayer?.play(index, beats, "recent");

    }

    setTimeout(syncPlayButtons, 50);

};


    // CARD CLICK - SCROLL TO CENTER - BLOCK ON DRAG
    card.onclick = (e) => {
      // If we dragged, don't trigger click
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      
      card.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    };

    scroller.appendChild(card);
  });

  container.appendChild(scroller);
  syncPlayButtons();
 
  // AUTO SLIDE ON FIRST VIEW
  if (!silent) {
    observeSection(section);
  }
}

// ===============================
// 🎬 INTERSECTION OBSERVER - SLIDE IN
// ===============================
function observeSection(section) {
  if (hasAnimated) return;
 
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting &&!hasAnimated) {
        hasAnimated = true;
        slideToFirst();
        observer.disconnect();
      }
    });
  }, { threshold: 0.3 });

  observer.observe(section);
}

function slideToFirst() {
  const firstCard = document.querySelector('.rp-card');
  if (!firstCard) return;
 
  setTimeout(() => {
    firstCard.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest'
    });
  }, 200);
}

// ===============================
// 🔄 SYNC PLAY BUTTONS
// ===============================
function syncPlayButtons() {

    const buttons = document.querySelectorAll(".rp-playbtn");

    buttons.forEach(btn => {
        btn.classList.remove("rp-active");

        const icon = btn.querySelector(".rp-icon");

        if (icon)
            icon.innerHTML = PLAY_SVG;
    });

    const audio =
        window.__PLAYER__ ||
        window.__DOPE_TONE_AUDIO__ ||
        document.querySelector("audio");

    if (!audio || audio.paused)
        return;

    const currentBeat = window.__CURRENT_BEAT__;

    buttons.forEach(btn => {

        if (String(btn.dataset.beatId) === String(currentBeat?.id)) {

            btn.classList.add("rp-active");

            const icon = btn.querySelector(".rp-icon");

            if (icon)
                icon.innerHTML = PAUSE_SVG;
        }

    });

}


// ===============================
// 🎯 SCROLL HIGHLIGHT
// ===============================
function highlightCenterCard() {
  const container = document.getElementById("rpTrackMount");
  if (!container) return;
 
  const cards = container.querySelectorAll('.rp-card');
  const containerRect = container.getBoundingClientRect();
  const centerX = containerRect.left + containerRect.width / 2;
 
  let closestCard = null;
  let closestDistance = Infinity;
 
  cards.forEach(card => {
    const rect = card.getBoundingClientRect();
    const cardCenterX = rect.left + rect.width / 2;
    const distance = Math.abs(centerX - cardCenterX);
   
    if (distance < closestDistance) {
      closestDistance = distance;
      closestCard = card;
    }
  });
 
  cards.forEach(card => card.classList.remove('rp-inview'));
  if (closestCard) closestCard.classList.add('rp-inview');
}

// ===============================
// 🎯 EVENTS
// ===============================

// PLAYER PLAY
document.addEventListener("playerPlay", (e) => {
  const beat = e.detail?.beat || window.__CURRENT_BEAT__;
  if (beat) addToRecent(beat);
  setTimeout(syncPlayButtons, 50);
});

// PAUSE
document.addEventListener("playerPause", () => {
  setTimeout(syncPlayButtons, 50);
});

// TRACK CHANGE
document.addEventListener("trackChange", () => {
  setTimeout(syncPlayButtons, 50);
});

// INIT + SCROLL + DRAG - SINGLE DOMCONTENTLOADED
document.addEventListener('DOMContentLoaded', () => {
  renderRecentPlayed();
 
  const container = document.getElementById("rpTrackMount");
  if (!container) return;
 
  // SCROLL HIGHLIGHT
  container.addEventListener('scroll', () => {
    if (isScrolling) return;
    isScrolling = true;
   
    setTimeout(() => {
      highlightCenterCard();
      isScrolling = false;
    }, 150);
  });

  // MOUSE WHEEL = HORIZONTAL SCROLL
  container.addEventListener('wheel', (e) => {
    if (e.deltaY === 0) return;
    e.preventDefault();
    container.scrollBy({
      left: e.deltaY * 1.2,
      behavior: 'smooth'
    });
  }, { passive: false });

  // DRAG TO SCROLL - NO CLICK ON DRAG
  let isDown = false;
  let startX;
  let scrollLeft;

  container.addEventListener('mousedown', (e) => {
    isDown = true;
    isDragging = false;
    container.style.cursor = 'grabbing';
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
  });

  container.addEventListener('mouseleave', () => {
    isDown = false;
    container.style.cursor = 'grab';
  });

  container.addEventListener('mouseup', () => {
    isDown = false;
    container.style.cursor = 'grab';
    // Reset drag flag after click event fires
    setTimeout(() => {
      isDragging = false;
    }, 0);
  });

  container.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 2;
    
    // If moved more than threshold, mark as drag
    if (Math.abs(walk) > dragThreshold) {
      isDragging = true;
    }
    
    container.scrollLeft = scrollLeft - walk;
  });


  const audio =
    window.__PLAYER__ ||
    window.__DOPE_TONE_AUDIO__ ||
    document.querySelector("audio");

if (audio) {

    audio.addEventListener("play", syncPlayButtons);

    audio.addEventListener("pause", syncPlayButtons);

    audio.addEventListener("ended", syncPlayButtons);

}

});

// STORAGE SYNC
window.addEventListener("storage", (e) => {
  if (e.key === RECENT_KEY) renderRecentPlayed(true);
});

// EXPORT
window.renderRecentPlayed = renderRecentPlayed;
window.addToRecent = addToRecent;
