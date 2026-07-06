// ===============================
// 🔍 ARSENAL SEARCH - INSTANT PLAY
// ===============================

export function initArsenalSearch() {
  const input = document.getElementById('beatSearch');
  const dropdown = document.getElementById('searchDropdown');
  
  if (!input ||!dropdown) {
    console.error('[Search] Missing #beatSearch or #searchDropdown');
    return;
  }

  let searchTimeout;
  let originalBeats = null;
  let currentResults = []; // 🔥 Track filtered beats for playback

  input.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim().toLowerCase();

    searchTimeout = setTimeout(() => {
      if (!window.store?.beats) {
        console.error('[Search] window.store.beats not found');
        return;
      }

      // Backup original
      if (!originalBeats) {
        originalBeats = [...window.store.beats];
      }

      if (!query) {
        dropdown.classList.remove('active');
        if (originalBeats) {
          window.store.beats = originalBeats;
          rerenderAllSections(originalBeats);
          currentResults = originalBeats;
          originalBeats = null;
        }
        return;
      }

      // FILTER
      const results = originalBeats.filter(beat => {
        const searchable = [
          beat.title,
          beat.genre,
          beat.tags?.join(' '),
          beat.key,
          beat.mood,
          beat.bpm
        ].map(x => String(x || '').toLowerCase()).join(' ');
        
        return searchable.includes(query);
      });

      // EXACT MATCH
      const exactMatch = originalBeats.find(
        beat => beat.title?.toLowerCase() === query
      );

      currentResults = exactMatch? [exactMatch] : results; // 🔥 SAVE FOR PLAYBACK

      if (currentResults.length > 0) {
        showDropdown(currentResults.slice(0, 6));
        rerenderAllSections(currentResults);
      } else {
        showNoResults();
        rerenderAllSections([]);
        currentResults = [];
      }

    }, 150);
  });

  // 🔥 RERENDER WAVE + OTHERS
  function rerenderAllSections(beats) {
    if (window.renderWave) {
      window.renderWave(beats);
    }
    console.log(`[Search] Filtered to ${beats.length} beats`);
  }

  // 🔥 INSTANT PLAY ON CLICK
  function showDropdown(beats) {
    dropdown.innerHTML = '';
    beats.forEach((beat, index) => {
      const item = document.createElement('div');
      item.className = 'search-item';
      item.innerHTML = `
        <img src="${beat.cover_url || 'images/studio.jpg'}" />
        <div class="search-item-info">
          <div class="search-item-title">${beat.title}</div>
          <div class="search-item-meta">${beat.genre || 'Unknown'} • ${beat.bpm || '--'} BPM</div>
        </div>
        <div class="search-item-play">▶</div>
      `;
      
      item.onclick = () => {
  input.value = beat.title;
  dropdown.classList.remove('active');
  
  // 🔥 FIND BEAT IN WAVE + PLAY IT
  if (window.globalPlayer) {
    const waveBeats = currentResults.length > 0? currentResults : [beat];
    const playIndex = waveBeats.findIndex(b => b.id === beat.id);
    
    // Play with listId "wave" so Wave buttons sync
    window.globalPlayer.play(playIndex, [...waveBeats], "wave");
    console.log(`[Search] Playing: ${beat.title}`);
  }
  
  // Update wave to show only this beat
  window.renderWave([beat]);
};

      
      dropdown.appendChild(item);
    });
    dropdown.classList.add('active');
  }

  function showNoResults() {
    dropdown.innerHTML = `<div class="search-item" style="justify-content: center; color: #64748b;">No beats found</div>`;
    dropdown.classList.add('active');
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.arsenal-search')) {
      dropdown.classList.remove('active');
    }
  });

  input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && currentResults.length > 0) {
    e.preventDefault();
    const firstBeat = currentResults[0];
    input.value = firstBeat.title;
    dropdown.classList.remove('active');
    
    if (window.globalPlayer) {
      // 🔥 Use "wave" not "search" for button sync
      window.globalPlayer.play(0, [...currentResults], "wave");
    }
    window.renderWave([firstBeat]);
  }
  
  if (e.key === 'Escape') {
    input.value = '';
    input.dispatchEvent(new Event('input'));
    input.blur();
  }
});

  console.log('[Search] Initialized with instant play ✅');
}
