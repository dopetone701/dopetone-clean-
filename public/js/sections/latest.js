// ===============================
// LATEST SECTION (RP STRUCTURE CLONE)
// ===============================
const MAX_LATEST = 10;
let isDragging = false;
let dragThreshold = 5;

const PLAY_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v14l11-7-11-7z"/></svg>`;
const PAUSE_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

export function renderLatest() {
  const section = document.getElementById("latestWrap");
  const container = document.getElementById("latestMount");
  if (!container ||!section) return;

  // play btn + mobile layout – Latest only
  if (!document.getElementById('latest-play-visibility')) {
    const s = document.createElement('style');
    s.id = 'latest-play-visibility';
 s.textContent = `
/* play button – always on mobile */
#latestMount.rp-playbtn {
  opacity: 1!important;
  visibility: visible!important;
  pointer-events: auto!important;
  z-index: 5;
}

#latestMount.rp-playbtn.rp-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
#latestMount.rp-playbtn.rp-icon svg {
  width: 1em;
  height: 1em;
  fill: currentColor;
  display: block;
}

@media (min-width: 769px) {
  #latestMount.rp-playbtn { opacity: 0!important; }
  #latestMount.rp-card:hover.rp-playbtn,
  #latestMount.rp-card.active.rp-playbtn,
  #latestMount.rp-playbtn.rp-active { opacity: 1!important; }
}

/* mobile – gap + centered text */
@media (max-width: 768px) {
  #latestMount.rp-scroll { gap: 12px!important; padding: 8px 12px 16px!important; }
  #latestMount.rp-card { min-width: 140px!important; width: 140px!important; flex: 0 0 140px!important; }
  #latestMount.rp-card.rp-cover,
  #latestMount.rp-card.rp-cover img { width: 140px!important; height: 140px!important; object-fit: cover!important; }
  #latestMount.rp-card.rp-title { text-align: center!important; font-size: 13px!important; margin-top: 8px!important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
}
`;

    document.head.appendChild(s);
  }

  const allBeats = window.store?.beats || [];
  const latestBeats = [...allBeats]
  .sort((a, b) => {
      if (a.created_at && b.created_at) return new Date(b.created_at) - new Date(a.created_at);
      return b.id - a.id;
    })
  .slice(0, MAX_LATEST);

  if (!latestBeats.length) {
    section.classList.remove('rp-active');
    container.innerHTML = '';
    return;
  }

  section.classList.add('rp-active');
  container.innerHTML = '';

  const scroller = document.createElement('div');
  scroller.className = 'rp-scroll';

  latestBeats.forEach((beat, index) => {
    const card = document.createElement("div");
    card.className = "rp-card";
    card.dataset.beatId = beat.id;
    card.dataset.index = index;

    card.innerHTML = `
      <div class="rp-cover">
        <img src="${beat.cover_url || beat.image || 'images/studio.jpg'}" alt="${beat.title}" loading="lazy" />
        <button class="rp-playbtn" data-beat-id="${beat.id}">
          <span class="rp-icon">${PLAY_SVG}</span>
        </button>
      </div>
      <div class="rp-title">${beat.title || 'Untitled'}</div>
    `;

    const playBtn = card.querySelector(".rp-playbtn");
    playBtn.onclick = (e) => {
      e.stopPropagation();
      if (isDragging) return;
      const currentBeat = window.__CURRENT_BEAT__;
      const currentList = window.__CURRENT_LIST__;
      const isPlaying = window.globalPlayer?.isPlaying();
      if (currentBeat?.id === beat.id && currentList === 'latest' && isPlaying) {
        window.globalPlayer?.pause();
      } else {
        window.globalPlayer?.play(index, [...latestBeats], "latest");
      }
    };

    card.onclick = (e) => {
      if (e.target.closest(".rp-playbtn")) return;
      if (isDragging) { e.preventDefault(); e.stopPropagation(); return; }
      let cart = JSON.parse(localStorage.getItem("dopetone_cart")) || [];
      const cartBeat = {
        id: beat.id, title: beat.title,
        cover: beat.cover_url, cover_url: beat.cover_url,
        genre: beat.genre, bpm: beat.bpm,
        audio: beat.mp3_url || beat.audio,
        mp3_url: beat.mp3_url, zip_url: beat.zip_url,
        mood: beat.mood, key: beat.key, type: beat.type
      };
      if (!cart.find(item => item.id == beat.id)) {
        cart.push(cartBeat);
        localStorage.setItem("dopetone_cart", JSON.stringify(cart));
      }
      window.location.href = `licence-page.html?id=${beat.id}`;
    };

    scroller.appendChild(card);
  });

  const moreCard = document.createElement("div");
  moreCard.className = "rp-card more-card";
  moreCard.innerHTML = `
    <div class="rp-cover more-cover">
      <div class="more-grid"><div class="more-dot"></div><div class="more-dot"></div><div class="more-dot"></div><div class="more-dot"></div><div class="more-dot"></div><div class="more-dot"></div></div>
    </div>
    <div class="rp-title">View All Beats</div>
  `;
  moreCard.onclick = () => { if (!isDragging) window.location.href = "beats.html"; };
  scroller.appendChild(moreCard);

  container.appendChild(scroller);
  syncLatestPlayButtons();
  initLatestScroll(container);
}

function syncLatestPlayButtons() {
  const container = document.getElementById("latestMount");
  if (!container) return;
  const buttons = container.querySelectorAll('.rp-playbtn');

  const currentBeat = window.__CURRENT_BEAT__;
  const currentList = window.__CURRENT_LIST__;
  const isPlaying = window.globalPlayer?.isPlaying() ||!window.__DOPE_TONE_AUDIO__?.paused;

  buttons.forEach(btn => {
    const beatId = btn.dataset.beatId;
    const icon = btn.querySelector('.rp-icon');
    const card = btn.closest('.rp-card');
    const active = currentBeat?.id == beatId && currentList === 'latest' && isPlaying;
    if (icon) icon.innerHTML = active? PAUSE_SVG : PLAY_SVG;
    btn.classList.toggle('rp-active', active);
    card?.classList.toggle('active', active);
  });
}

function initLatestScroll(section) {
  let isDown = false, startX, scrollLeft, dragDistance = 0;

  section.addEventListener('wheel', (e) => {
    if (e.deltaY === 0) return;
    e.preventDefault();
    section.scrollBy({ left: e.deltaY * 1.5, behavior: 'smooth' });
  }, { passive: false });

  section.addEventListener('mousedown', (e) => {
    isDown = true; isDragging = false; dragDistance = 0;
    section.style.cursor = 'grabbing';
    startX = e.pageX - section.offsetLeft;
    scrollLeft = section.scrollLeft;
  });
  section.addEventListener('mouseleave', () => { isDown = false; section.style.cursor = 'grab'; });
  section.addEventListener('mouseup', () => {
    isDown = false; section.style.cursor = 'grab';
    setTimeout(() => { isDragging = false; dragDistance = 0; }, 0);
  });
  section.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - section.offsetLeft;
    const walk = (x - startX) * 2;
    dragDistance = Math.abs(walk);
    if (dragDistance > dragThreshold) isDragging = true;
    section.scrollLeft = scrollLeft - walk;
  });

  let touchStartX = 0, touchStartPos = 0;
  section.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartPos = section.scrollLeft;
    isDragging = false; dragDistance = 0;
  }, { passive: true });
  section.addEventListener('touchmove', (e) => {
    const delta = e.touches[0].clientX - touchStartX;
    dragDistance = Math.abs(delta);
    if (dragDistance > dragThreshold) isDragging = true;
    section.scrollLeft = touchStartPos - delta;
  }, { passive: true });
  section.addEventListener('touchend', () => {
    setTimeout(() => { isDragging = false; dragDistance = 0; }, 50);
  });
}

document.addEventListener("playerPlay", () => setTimeout(syncLatestPlayButtons, 50));
document.addEventListener("playerPause", () => setTimeout(syncLatestPlayButtons, 50));
document.addEventListener("trackChange", () => setTimeout(syncLatestPlayButtons, 50));

window.renderLatest = renderLatest;
