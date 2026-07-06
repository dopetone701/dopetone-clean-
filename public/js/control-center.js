// ===== CONFIG =====
const API_URL = 'https://api.dopetonevault.com/api/beats'
const ADMIN_EMAIL = 'dopetone701@gmail.com';
const DEFAULT_LOGO = 'images/logo.png';

// ===== AUTH CHECK =====
const user = JSON.parse(localStorage.getItem('dopetone_user') || '{}');
if (!user.email || user.email.toLowerCase()!== ADMIN_EMAIL.toLowerCase()) {
  window.location.href = '/';
}

// ===== DATA STORES =====
let allBeats = [];
let filteredBeats = [];
let currentTrack = null;
let isPlaying = false;
let editingBeatId = null;
let fakeTraffic = { views: false, likes: false, cart: false, speed: 5 };
let topTracks = [];
let currentTopIndex = 0;

// ===== CHARTS =====
const charts = {};
let curveHistory = {}; // Local cache of cloud data


document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Dopetone] Control Center booting... D1 connection active');

  // ===== SCOFIELD STATE =====
  

  // Load curve history from localStorage as cache
  curveHistory = JSON.parse(localStorage.getItem('dt_curve_history') || '{}');

  // ===== INIT CHART - UNIFIED MIXER =====
  const ctx = document.getElementById('tradeChart').getContext('2d');

  const gradientPlays = ctx.createLinearGradient(0, 0, 0, 300);
  gradientPlays.addColorStop(0, 'rgba(139, 92, 246, 0.4)');
  gradientPlays.addColorStop(1, 'rgba(139, 92, 246, 0)');

  const gradientLikes = ctx.createLinearGradient(0, 0, 0, 300);
  gradientLikes.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
  gradientLikes.addColorStop(1, 'rgba(239, 68, 68, 0)');

  const gradientDownloads = ctx.createLinearGradient(0, 0, 0, 300);
  gradientDownloads.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
  gradientDownloads.addColorStop(1, 'rgba(16, 185, 129, 0)');

  const gradientCart = ctx.createLinearGradient(0, 0, 0, 300);
  gradientCart.addColorStop(0, 'rgba(245, 158, 11, 0.4)');
  gradientCart.addColorStop(1, 'rgba(245, 158, 11, 0)');

  charts.trade = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Plays',
          data: [],
          borderColor: '#8b5cf6',
          backgroundColor: gradientPlays,
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointRadius: (ctx) => ctx.dataIndex === ctx.dataset.data.length - 1? 6 : 0,
          pointHoverRadius: 8,
          pointBackgroundColor: '#8b5cf6',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        },
        {
          label: 'Likes',
          data: [],
          borderColor: '#ef4444',
          backgroundColor: gradientLikes,
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointRadius: (ctx) => ctx.dataIndex === ctx.dataset.data.length - 1? 6 : 0,
          pointHoverRadius: 8,
          pointBackgroundColor: '#ef4444',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        },
        {
          label: 'Downloads',
          data: [],
          borderColor: '#10b981',
          backgroundColor: gradientDownloads,
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointRadius: (ctx) => ctx.dataIndex === ctx.dataset.data.length - 1? 6 : 0,
          pointHoverRadius: 8,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        },
        {
          label: 'Cart',
          data: [],
          borderColor: '#f59e0b',
          backgroundColor: gradientCart,
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointRadius: (ctx) => ctx.dataIndex === ctx.dataset.data.length - 1? 6 : 0,
          pointHoverRadius: 8,
          pointBackgroundColor: '#f59e0b',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300, easing: 'easeInOutQuart' },
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#888',
            usePointStyle: true,
            padding: 15,
            font: { size: 11 }
          }
        },
        tooltip: {
          backgroundColor: '#1a1a1a',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#333',
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          callbacks: {
            title: (items) => {
              const ts = items[0].label;
              return `Time: ${new Date(ts).toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                hour: currentRange === 'hour'? '2-digit' : undefined,
                minute: currentRange === 'hour'? '2-digit' : undefined 
              })}`;
            },
            label: (context) => `${context.dataset.label}: ${context.parsed.y}`
          }
        }
      },
      scales: {
        x: {
          type: 'time', // SCOFIELD: Time scale for Hr/Day/Week
          time: { unit: currentRange },
          ticks: {
            color: '#666',
            font: { size: 10 },
            maxTicksLimit: 8,
            callback: function(value) {
              const date = new Date(value);
              if (currentRange === 'hour') return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              if (currentRange === 'week') return `W${getWeekNumber(date)}`;
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
          },
          grid: { display: false },
          border: { display: false }
        },
        y: {
          ticks: {
            color: '#666',
            font: { size: 10 },
            callback: function(value) { return value.toFixed(0); }
          },
          grid: { color: 'rgba(255,255,255,0.05)' },
          border: { display: false },
          beginAtZero: false,
          suggestedMin: function(context) {
            const datasets = context.chart.data.datasets;
            const allData = datasets.flatMap(ds => ds.data).filter(v => v!== null && v!== undefined);
            if (!allData.length) return 0;
            const min = Math.min(...allData);
            const max = Math.max(...allData);
            const padding = Math.max((max - min) * 0.2, 1);
            return Math.max(0, min - padding);
          },
          suggestedMax: function(context) {
            const datasets = context.chart.data.datasets;
            const allData = datasets.flatMap(ds => ds.data).filter(v => v!== null && v!== undefined);
            if (!allData.length) return 10;
            const min = Math.min(...allData);
            const max = Math.max(...allData);
            const padding = Math.max((max - min) * 0.2, 1);
            return max + padding;
          }
        }
      }
    }
  });

  // ===== TOGGLE BUTTONS - FL Snap Selector =====
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRange = btn.dataset.range; // hour | day | week
      
      // Update chart scale = FL Zoom change
      charts.trade.options.scales.x.time.unit = currentRange === 'hour'? 'hour' : currentRange === 'week'? 'week' : 'day';
      
      // Reload data for new range
      loadTradeChartData(currentBeatId, currentRange);
    };
  });

  // ===== HELPER: Get Week Number =====
  function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  }

  // ===== LOAD CHART DATA - FAKE FOR NOW =====
  // ===== LOAD CHART DATA - NOW REMEMBERS SELECTION =====
// ===== LOAD CHART DATA - CACHE FAKE DATA SO IT STOPS CHANGING =====
window.loadTradeChartData = async function(beatId = null, range = 'day') {
  // 1. SAFETY CHECK
  if (!charts.trade) {
    console.warn('[Dopetone] Chart not ready.');
    return;
  }

  // 2. REMEMBER SELECTION - This is why it was resetting
  if (beatId!== null) currentBeatId = beatId;
  currentRange = range;
  
  // 3. SCOFIELD FIX: Cache fake data per beat+range so it doesn't regen on every click
  const cacheKey = `${currentBeatId || 'all'}_${range}`;
  
  // Check if we already generated this dataset
  if (!window.fakeDataCache) window.fakeDataCache = {};
  
  if (!window.fakeDataCache[cacheKey]) {
    // ONLY GENERATE ONCE PER SESSION
    const now = new Date();
    window.fakeDataCache[cacheKey] = {
      hour: Array.from({length: 24}, (_, i) => {
        const d = new Date(now); 
        d.setHours(now.getHours() - 23 + i);
        return { 
          date: d.toISOString(), 
          plays: Math.floor(Math.random()*30)+5, 
          likes: Math.floor(Math.random()*10), 
          downloads: Math.floor(Math.random()*5), 
          cart: Math.floor(Math.random()*3) 
        };
      }),
      day: Array.from({length: 30}, (_, i) => {
        const d = new Date(now); 
        d.setDate(now.getDate() - 29 + i);
        return { 
          date: d.toISOString().split('T')[0], 
          plays: Math.floor(Math.random()*300)+50, 
          likes: Math.floor(Math.random()*100), 
          downloads: Math.floor(Math.random()*50), 
          cart: Math.floor(Math.random()*20) 
        };
      }),
      week: Array.from({length: 12}, (_, i) => {
        const d = new Date(now); 
        d.setDate(now.getDate() - (11-i)*7);
        return { 
          date: d.toISOString().split('T')[0], 
          plays: Math.floor(Math.random()*2000)+500, 
          likes: Math.floor(Math.random()*800), 
          downloads: Math.floor(Math.random()*400), 
          cart: Math.floor(Math.random()*150) 
        };
      })
    }[range];
  }
  
  const data = window.fakeDataCache[cacheKey];
  
  // 4. UPDATE TITLE - USE PLAYER TRACK, NOT #1
  const nameEl = document.getElementById('graphBeatName');
  if (nameEl) {
    if (currentBeatId) {
      const beat = allBeats.find(b => b.id == currentBeatId);
      nameEl.textContent = `${beat?.title || 'Track'} - ${range}`;
    } else {
      nameEl.textContent = `All Tracks - ${range}`;
    }
  }
  
  // 5. UPDATE CHART - NO MORE RANDOM JUMPS
  if (charts.trade && charts.trade.data) {
    charts.trade.data.labels = data.map(d => d.date);
    charts.trade.data.datasets[0].data = data.map(d => d.plays);
    charts.trade.data.datasets[1].data = data.map(d => d.likes);
    charts.trade.data.datasets[2].data = data.map(d => d.downloads);
    charts.trade.data.datasets[3].data = data.map(d => d.cart);
    charts.trade.update('none'); // 'none' = instant, no animation jitter
  }
};


  // ===== SELECT TRACK FUNCTION - For Top Songs Click =====
  window.selectTrackForGraph = function(beatId, beatTitle) {
    loadTradeChartData(beatId, currentRange);
  };

  // ===== INIT =====
  await Promise.all([loadDashboard(), loadTickets(), loadEmails()]);
  initQuickPlayer();
  loadTradeChartData(null, 'day'); // Load default: All tracks, Day view

  // BEATS SEARCH - FOR SCROLLABLE TABLE
  document.getElementById('beatsSearch').addEventListener('input', debounce((e) => {
    const query = e.target.value.toLowerCase().trim();
    const filtered = query
 ? allBeats.filter(b =>
        b.title.toLowerCase().includes(query) ||
        (b.artist && b.artist.toLowerCase().includes(query)) ||
        (b.genre && b.genre.toLowerCase().includes(query)) ||
        (b.tags && b.tags.toLowerCase().includes(query))
      )
    : allBeats;
    renderBeatsTable(filtered);
  }, 300));

  initFakeTraffic();
  startAutoRefresh();

  // SEARCH
  document.getElementById('searchBar').addEventListener('input', debounce((e) => {
    const query = e.target.value.toLowerCase().trim();
    filteredBeats = query
? allBeats.filter(b =>
        b.title.toLowerCase().includes(query) ||
        (b.artist && b.artist.toLowerCase().includes(query)) ||
        (b.genre && b.genre.toLowerCase().includes(query))
      )
    : allBeats;
    renderBeatsTable(filteredBeats);
  }, 300));
});

// ===== LOAD DASHBOARD =====
async function loadDashboard() {
  try {
    console.log('[Dopetone] Fetching from:', API_URL);

    const [overview, beats] = await Promise.all([
      fetch(`${API_URL}/api/stats/overview`).then(r => {
        if (!r.ok) throw new Error(`Overview failed: ${r.status}`);
        return r.json();
      }),
      fetch(`${API_URL}/beats`).then(r => {
        if (!r.ok) throw new Error(`Beats failed: ${r.status}`);
        return r.json();
      })
    ]);

    console.log('[Dopetone] D1 Data loaded:', { overview, beatsCount: beats.length });

    allBeats = beats;
    filteredBeats = beats;

    // Update top stats
    document.getElementById('totalPlays').textContent = (overview.totalStreams || 0).toLocaleString();
    document.getElementById('totalRevenue').textContent = '$' + (overview.revenueToday || 0).toLocaleString();

    const totalDownloads = beats.reduce((sum, b) => sum + (b.download_count || 0), 0);
    const totalLikes = beats.reduce((sum, b) => sum + (b.like_count || 0), 0);
    document.getElementById('totalDownloads').textContent = totalDownloads.toLocaleString();
    document.getElementById('totalLikes').textContent = totalLikes.toLocaleString();
    document.getElementById('emailCount').textContent = `(${overview.totalEmails || 0})`;

    const cart = JSON.parse(localStorage.getItem('dopetone_cart') || '[]');
    document.getElementById('cartItems').textContent = cart.length;

    const orders = JSON.parse(localStorage.getItem('dopetone_orders') || '[]');
    document.getElementById('totalOrders').textContent = orders.length;

    renderTopSongs(beats);
    renderBeatsTable(filteredBeats);

       // SCOFIELD FIX: ARM PLAYER + GRAPH TO TOP TRACK
    if (topTracks.length > 0) {
      const topBeat = topTracks[0];

      // Arm player
      if (!currentTrack) {
        updateQuickPlayerUI(topBeat, false);
        audio.src = topBeat.mp3_url || topBeat.audio;
        currentTopIndex = 0;
        console.log('[Dopetone] Player armed with #1 track:', topBeat.title);
      }

      // SCOFIELD FIX: ARM GRAPH TO TOP TRACK INSTEAD OF ALL TRACKS
      currentBeatId = topBeat.id;
      await loadTradeChartData(topBeat.id, currentRange);
      console.log('[Dopetone] Graph armed with #1 track:', topBeat.title);
    }


    // SCOFIELD FIX: Don't call updateTradeChart here. Graph stays on selected track.
    // REMOVE THIS LINE: if (currentTrack) { await updateTradeChart(currentTrack.id); }

  } catch (err) {
    console.error('[Dopetone] Dashboard load failed:', err);
    document.getElementById('totalPlays').textContent = 'Error';
  }
}


function renderTopSongs(beats) {
  const topList = document.getElementById('topSongs');
  const sorted = [...beats].sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).slice(0, 5);

  topTracks = sorted;

  // SCOFIELD FIX: NO RANK NUMBERS. Just tracks.
  topList.innerHTML = sorted.length? sorted.map((s) => `
    <div class="top-item" data-id="${s.id}" data-title="${s.title}" style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:6px;cursor:pointer;background:#0a0a0a;border:1px solid ${currentBeatId == s.id? '#8b5cf6' : '#333'};margin-bottom:8px;transition:all 0.2s;">
      <img src="${s.cover_url || s.cover || 'images/logo.png'}" style="width:40px;height:40px;border-radius:4px;object-fit:cover;" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%238b5cf6%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'">
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:bold;">${s.title}</div>
        <div style="font-size:11px;color:#666;"><i class="fa-solid fa-play"></i> ${s.play_count || 0}</div>
      </div>
      ${currentTrack && currentTrack.id == s.id && isPlaying? '<i class="fa-solid fa-volume-high" style="color:#8b5cf6;"></i>' : ''}
    </div>
  `).join('') : '<div class="empty-state"><p>No data yet</p></div>';

  // SCOFIELD FIX: Click loads to player + respects isPlaying state
  document.querySelectorAll('.top-item').forEach(el => {
    el.onclick = () => {
      const beatId = parseInt(el.dataset.id);
      const beatTitle = el.dataset.title;
      const beat = allBeats.find(b => b.id == beatId);
      if (!beat) return;
      
      // Highlight selected
      document.querySelectorAll('.top-item').forEach(s => s.style.borderColor = '#333');
      el.style.borderColor = '#8b5cf6';
      
      // Load into graph - always
      selectTrackForGraph(beatId, beatTitle);
      
      // SCOFIELD FIX: Load to player + smart play logic
      currentTrack = beat;
      audio.src = beat.mp3_url || beat.audio;
      updateQuickPlayerUI(beat, isPlaying); // Keep current play state
      
      // If player was already playing, play this new track too
      if (isPlaying) {
        audio.play().catch(e => console.log('Autoplay blocked:', e));
      } else {
        // If player was paused, just load it paused
        audio.pause();
        playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      }
    };
  });
}



// ===== RENDER BEATS TABLE =====
function renderBeatsTable(beats) {
  const tbody = document.getElementById('beatsTableBody');

  if (beats.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No beats found</td></tr>`;
    return;
  }

  tbody.innerHTML = beats.map(beat => {
    const isFree = beat.monetization_mode === 'free';
    const revenue = isFree? 'FREE' : `$${((beat.download_count || 0) * (beat.price || 0)).toFixed(2)}`;
    const isThisTrackPlaying = currentTrack && currentTrack.id == beat.id && isPlaying;

    return `
      <tr data-beat-id="${beat.id}">
        <td><strong>${beat.title}</strong></td>
        <td>${beat.play_count || 0}</td>
        <td>${beat.download_count || 0}</td>
        <td>${beat.like_count || 0}</td>
        <td>0</td>
        <td style="${isFree? 'color:#3b82f6;font-weight:600;' : ''}">${revenue}</td>
        <td>
          <button class="action-btn play-btn" onclick="togglePlay(${beat.id})" data-id="${beat.id}">
            <i class="fa-solid fa-${isThisTrackPlaying? 'pause' : 'play'}"></i>
          </button>
          <button class="action-btn" onclick="editBeat(${beat.id})">
            <i class="fa-solid fa-edit"></i>
          </button>
          <button class="action-btn delete" onclick="deleteBeat(${beat.id})">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ===== UPDATE CHART - CLOUDFLARE D1/R2 BACKEND =====
async function updateTradeChart(beatId) {
  if (!beatId ||!currentTrack || currentTrack.id!= beatId) return;

  const beat = allBeats.find(b => b.id == beatId);
  if (!beat) return;

  // Get or create curve history for this beat
  if (!curveHistory[beatId]) {
    curveHistory[beatId] = { labels: [], plays: [], likes: [], downloads: [], cart: [] };
  }

  const now = new Date();
  const timeLabel = now.toISOString(); // STORE ISO FOR X-AXIS

  const cart = JSON.parse(localStorage.getItem('dopetone_cart') || '[]');
  const cartCount = cart.filter(c => c.id == beatId).length;

  const dataPoint = {
    beat_id: beatId,
    timestamp: now.toISOString(),
    plays: beat.play_count || 0,
    likes: beat.like_count || 0,
    downloads: beat.download_count || 0,
    cart: cartCount
  };

  // PUSH TO CLOUDFLARE D1
  try {
    await fetch(`${API_URL}/api/stats/curve`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(dataPoint)
    });
  } catch (err) {
    console.error('Cloudflare curve save failed:', err);
  }

  // Update local cache
  curveHistory[beatId].labels.push(timeLabel);
  curveHistory[beatId].plays.push(dataPoint.plays);
  curveHistory[beatId].likes.push(dataPoint.likes);
  curveHistory[beatId].downloads.push(dataPoint.downloads);
  curveHistory[beatId].cart.push(dataPoint.cart);

  // Keep last 50 points for dynamics
  if (curveHistory[beatId].labels.length > 50) {
    curveHistory[beatId].labels.shift();
    curveHistory[beatId].plays.shift();
    curveHistory[beatId].likes.shift();
    curveHistory[beatId].downloads.shift();
    curveHistory[beatId].cart.shift();
  }

  // Save to localStorage as cache
  localStorage.setItem('dt_curve_history', JSON.stringify(curveHistory));

  // Update chart
  charts.trade.data.labels = curveHistory[beatId].labels;
  charts.trade.data.datasets[0].data = curveHistory[beatId].plays;
  charts.trade.data.datasets[1].data = curveHistory[beatId].likes;
  charts.trade.data.datasets[2].data = curveHistory[beatId].downloads;
  charts.trade.data.datasets[3].data = curveHistory[beatId].cart;
  charts.trade.update('none');
}

// ===== LOAD BEAT CURVE FROM CLOUDFLARE =====
async function loadBeatCurve(beatId) {
  try {
    // Try Cloudflare first
    const res = await fetch(`${API_URL}/api/stats/curve/${beatId}`);
    if (res.ok) {
      const cloudData = await res.json();
      curveHistory[beatId] = {
        labels: cloudData.map(d => d.timestamp), // KEEP AS ISO STRING
        plays: cloudData.map(d => d.plays),
        likes: cloudData.map(d => d.likes),
        downloads: cloudData.map(d => d.downloads),
        cart: cloudData.map(d => d.cart)
      };
      // Cache locally
      localStorage.setItem('dt_curve_history', JSON.stringify(curveHistory));
    }
  } catch (err) {
    console.error('Cloudflare curve fetch failed, using cache:', err);
    // Fallback to localStorage cache
    if (!curveHistory[beatId]) {
      curveHistory[beatId] = { labels: [], plays: [], likes: [], downloads: [], cart: [] };
    }
  }

  charts.trade.data.labels = curveHistory[beatId].labels;
  charts.trade.data.datasets[0].data = curveHistory[beatId].plays;
  charts.trade.data.datasets[1].data = curveHistory[beatId].likes;
  charts.trade.data.datasets[2].data = curveHistory[beatId].downloads;
  charts.trade.data.datasets[3].data = curveHistory[beatId].cart;
  charts.trade.update();
}

// ===== QUICK PLAYER WITH TOP 5 NAVIGATION =====
const audio = document.getElementById('audioPlayer');
const playBtn = document.getElementById('playBtn');

function initQuickPlayer() {
  const lastTrack = JSON.parse(localStorage.getItem('dt_cc_current') || 'null');
  const wasPlaying = localStorage.getItem('dt_cc_playing') === 'true';

  if (lastTrack && wasPlaying) {
    updateQuickPlayerUI(lastTrack, wasPlaying);
    if (wasPlaying) audio.play().catch(() => {});
  }

  window.addEventListener('cc_track_change', (e) => {
    updateQuickPlayerUI(e.detail, true);
  });

  window.addEventListener('cc_player_state', (e) => {
    isPlaying = e.detail.playing;
    playBtn.innerHTML = `<i class="fa-solid fa-${isPlaying? 'pause' : 'play'}"></i>`;
    if (currentTrack) updatePlayButton(currentTrack.id, isPlaying);
  });

  window.addEventListener('cc_like_change', () => loadDashboard());
  window.addEventListener('cc_download', () => loadDashboard());

  document.getElementById('nextBtn').onclick = () => {
    if (topTracks.length === 0) return;
    currentTopIndex = (currentTopIndex + 1) % topTracks.length;
    playBeat(topTracks[currentTopIndex].id);
  };

  document.getElementById('prevBtn').onclick = () => {
    if (topTracks.length === 0) return;
    currentTopIndex = (currentTopIndex - 1 + topTracks.length) % topTracks.length;
    playBeat(topTracks[currentTopIndex].id);
  };
}

function updateQuickPlayerUI(beat, playing) {
  document.getElementById('playerCover').src = beat.cover || beat.cover_url || DEFAULT_LOGO;
  document.getElementById('playerTitle').textContent = beat.title;
  document.getElementById('playerArtist').textContent = beat.artist || 'DopeTone';
  document.getElementById('playerPlays').textContent = (beat.play_count || 0).toLocaleString();
  document.getElementById('playerLikes').textContent = (beat.like_count || 0).toLocaleString();
  document.getElementById('playerDownloads').textContent = (beat.download_count || 0).toLocaleString();

  const cart = JSON.parse(localStorage.getItem('dopetone_cart') || '[]');
  document.getElementById('playerCart').textContent = cart.filter(c => c.id == beat.id).length;

  playBtn.innerHTML = `<i class="fa-solid fa-${playing? 'pause' : 'play'}"></i>`;
  isPlaying = playing;
  currentTrack = beat;

  const topIdx = topTracks.findIndex(t => t.id == beat.id);
  if (topIdx!== -1) currentTopIndex = topIdx;

  localStorage.setItem('dt_cc_current', JSON.stringify(beat));
  localStorage.setItem('dt_cc_playing', playing);
  updateMonetizeUI(beat);
  function updateQuickPlayerUI(beat, playing) {
  //... your existing code...
  
  // SCOFIELD ADD: Update speaker instantly
  updateActiveSpeaker();
  
  if (beat && beat.id) {
    selectTrackForGraph(beat.id, beat.title);
  }
}

}

window.editCurrentTrack = function() {
  if (!currentTrack) return alert('No track loaded');
  editBeat(currentTrack.id);
};

window.cycleMonetization = async function() {
  if (!currentTrack) return alert('No track loaded');

  const modes = ['paid', 'hybrid', 'free'];
  const currentMode = currentTrack.monetization_mode || 'paid';
  const nextIndex = (modes.indexOf(currentMode) + 1) % 3;
  const newMode = modes[nextIndex];

  try {
    const res = await fetch(`${API_URL}/beats/monetize`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        id: currentTrack.id,
        mode: newMode,
        has_free_tagged: newMode === 'hybrid'? 1 : 0
      })
    });

    if (!res.ok) throw new Error('Update failed');

    currentTrack.monetization_mode = newMode;
    currentTrack.has_free_tagged = newMode === 'hybrid'? 1 : 0;
    updateMonetizeUI(currentTrack);
    await loadDashboard();
  } catch (err) {
    alert('Monetization update failed: ' + err.message);
  }
};

function updateMonetizeUI(beat) {
  const btn = document.getElementById('monetizeBtn');
  const badge = document.getElementById('monetizeBadge');
  const mode = beat.monetization_mode || 'paid';

  const config = {
    'paid': { icon: 'fa-dollar-sign', color: '#10b981', text: 'PAID', title: 'Monetized - No Free' },
    'hybrid': { icon: 'fa-tags', color: '#f59e0b', text: 'TAGGED FREE', title: 'Monetized + Free Tagged' },
    'free': { icon: 'fa-gift', color: '#3b82f6', text: 'FREE', title: 'Fully Free Download' }
  };

  const c = config[mode];
  btn.innerHTML = `<i class="fa-solid ${c.icon}"></i>`;
  btn.style.color = c.color;
  btn.title = c.title;
  badge.textContent = c.text;
  badge.style.background = `${c.color}20`;
  badge.style.color = c.color;
  badge.style.border = `1px solid ${c.color}40`;
}

window.playBeat = async function(id) {
  const beat = allBeats.find(b => b.id == id);
  if (!beat) return;

  currentTrack = beat;
  audio.src = beat.mp3_url || beat.audio;
  updateQuickPlayerUI(beat, true);
  // SCOFIELD FIX: Auto-sync graph to current playing track
  selectTrackForGraph(beat.id, beat.title); // ← ADD THIS LINE


  // LOAD CURVE FROM CLOUDFLARE INSTANTLY
  await loadBeatCurve(id);

  audio.play();
  isPlaying = true;
  updatePlayButton(id, true);

  try {
    await fetch(`${API_URL}/api/stats/play`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ beat_id: id, user_id: user.email })
    });
    loadDashboard();
    setTimeout(() => updateTradeChart(id), 500);
  } catch (err) {
    console.error('Track play failed:', err);
  }
  

};

window.togglePlay = function(id) {
  if (currentTrack && currentTrack.id == id) {
    if (isPlaying) {
      audio.pause();
      playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      updatePlayButton(id, false);
      isPlaying = false;
      localStorage.setItem('dt_cc_playing', 'false');
    } else {
      audio.play();
      playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
      updatePlayButton(id, true);
      isPlaying = true;
      localStorage.setItem('dt_cc_playing', 'true');
    }
    updateActiveSpeaker();
  } else {
    playBeat(id);
  }

};

function updatePlayButton(id, playing) {
  const btn = document.querySelector(`.play-btn[data-id="${id}"]`);
  if (btn) btn.innerHTML = `<i class="fa-solid fa-${playing? 'pause' : 'play'}"></i>`;
}

playBtn.onclick = () => {
  if (!currentTrack) return;
  if (isPlaying) {
    audio.pause();
    playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    updatePlayButton(currentTrack.id, false);
    localStorage.setItem('dt_cc_playing', 'false');
  } else {
    audio.play();
    playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    updatePlayButton(currentTrack.id, true);
    localStorage.setItem('dt_cc_playing', 'true');
  }
  isPlaying =!isPlaying;
};

audio.onended = () => {
  playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
  if (currentTrack) updatePlayButton(currentTrack.id, false);
  isPlaying = false;
  localStorage.setItem('dt_cc_playing', 'false');
  updateActiveSpeaker();
};

// ===== EDIT/DELETE =====
window.editBeat = function(id) {
  const beat = allBeats.find(b => b.id == id);
  if (!beat) return;
  editingBeatId = id;

  document.getElementById('editModal').innerHTML = `
    <div class="modal-content" onclick="event.stopPropagation()">
      <h3>Edit Beat: ${beat.title}</h3>
      <div class="form-group">
        <label>Title</label>
        <input type="text" id="editTitle" value="${beat.title}">
      </div>
      <div class="form-group">
        <label>Artist</label>
        <input type="text" id="editArtist" value="${beat.artist || 'DopeTone'}">
      </div>
      <div class="form-group">
        <label>Genre</label>
        <input type="text" id="editGenre" value="${beat.genre || ''}">
      </div>
      <div class="form-group">
        <label>BPM</label>
        <input type="number" id="editBpm" value="${beat.bpm || 0}">
      </div>
      <div class="form-group">
        <label>Price ($)</label>
        <input type="number" id="editPrice" step="0.01" value="${beat.price || 0}">
      </div>
      <div class="form-group">
        <label>Replace Cover Image</label>
        <input type="file" id="editCover" accept="image/*">
        <small style="color:#666;font-size:11px;">Current: ${beat.cover_url || beat.cover || 'none'}</small>
      </div>
      <div class="form-group">
        <label>Replace MP3</label>
        <input type="file" id="editMp3" accept="audio/mp3">
        <small style="color:#666;font-size:11px;">Current: ${beat.mp3_url || beat.audio || 'none'}</small>
      </div>
      <div class="form-group">
        <label>Tags (comma separated)</label>
        <input type="text" id="editTags" value="${beat.tags || ''}">
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeEditModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveEdit()">Save Changes</button>
      </div>
    </div>
  `;

  document.getElementById('editModal').classList.add('active');
  document.body.classList.add('modal-open'); // LOCK BODY SCROLL
};

window.closeEditModal = function() {
  document.getElementById('editModal').classList.remove('active');
  document.body.classList.remove('modal-open'); // UNLOCK BODY
  editingBeatId = null;
};

// Close modal when clicking outside
document.getElementById('editModal').addEventListener('click', function(e) {
  if (e.target === this) closeEditModal();
});

window.saveEdit = async function() {
  if (!editingBeatId) return;

  const saveBtn = document.querySelector('#editModal.btn-primary');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

  try {
    const R2_PUBLIC_URL = "https://cdn.dopetonevault.com";
    const timestamp = Date.now();
    const clean = (name) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-.]/g, '').replace(/-+/g, '-');

    let coverUrl = null;
    let mp3Url = null;

    // UPLOAD NEW COVER IF SELECTED
    const coverFile = document.getElementById('editCover').files[0];
    if (coverFile) {
      const ext = coverFile.name.split('.').pop() || 'jpg';
      const coverKey = `covers/${timestamp}-${clean(editingBeatId + '-' + coverFile.name)}.${ext}`;

      const formData = new FormData();
      formData.append('file', coverFile);
      formData.append('folder', 'covers');

      const uploadRes = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      coverUrl = uploadData.url;
    }

    // UPLOAD NEW MP3 IF SELECTED
    const mp3File = document.getElementById('editMp3').files[0];
    if (mp3File) {
      const mp3Key = `beats/${timestamp}-${clean(editingBeatId + '-' + mp3File.name)}`;

      const formData = new FormData();
      formData.append('file', mp3File);
      formData.append('folder', 'beats');

      const uploadRes = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      mp3Url = uploadData.url;
    }

    const data = {
      id: editingBeatId,
      title: document.getElementById('editTitle').value,
      artist: document.getElementById('editArtist').value,
      genre: document.getElementById('editGenre').value,
      bpm: parseInt(document.getElementById('editBpm').value) || 0,
      price: parseFloat(document.getElementById('editPrice').value) || 0,
      cover_url: coverUrl, // null = keep existing in worker
      mp3_url: mp3Url, // null = keep existing in worker
      tags: document.getElementById('editTags').value
    };

    const res = await fetch(`${API_URL}/beats`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(data)
    });

    if (!res.ok) throw new Error('Update failed');
    closeEditModal();
    await loadDashboard();
    alert('Beat updated! Files replaced in R2.');
  } catch (err) {
    alert('Update failed: ' + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = 'Save Changes';
  }
};

window.deleteBeat = async function(id) {
  if (!confirm('Delete this beat?')) return;
  try {
    const res = await fetch(`${API_URL}/beats/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    // Delete curve history too
    delete curveHistory[id];
    localStorage.setItem('dt_curve_history', JSON.stringify(curveHistory));
    // Delete from Cloudflare
    await fetch(`${API_URL}/api/stats/curve/${id}`, { method: 'DELETE' }).catch(() => {});
    loadDashboard();
  } catch (err) {
    alert('Delete failed: ' + err.message);
  }
};

// ===== LOAD TICKETS - NO BLINK =====
let ticketsLoading = false;
let ticketsCache = null;

async function loadTickets() {
  if (ticketsLoading) return;
  ticketsLoading = true;
  
  const listEl = document.getElementById('ticketList');
  const countEl = document.getElementById('ticketCount');
  
  if (ticketsCache && Date.now() - ticketsCache.time < 30000) {
    renderTickets(ticketsCache.data);
    ticketsLoading = false;
    return;
  }
  
  try {
    const res = await fetch(`${API_URL}/api/tickets/list`);
    const data = await res.json();
    
    ticketsCache = { data, time: Date.now() };
    renderTickets(data);
    
  } catch (err) {
    console.error('Ticket load error:', err);
    listEl.innerHTML = '<div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><p>Failed to load</p></div>';
    countEl.textContent = '(0)';
  } finally {
    ticketsLoading = false;
  }
}

function renderTickets(data) {
  const listEl = document.getElementById('ticketList');
  const countEl = document.getElementById('ticketCount');
  
  if (!data.success || !data.tickets.length) {
    listEl.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>No open tickets</p></div>';
    countEl.textContent = '(0)';
    return;
  }
  
  countEl.textContent = `(${data.tickets.length})`;
  
  const newHTML = data.tickets.map(t => {
    // Priority colors
    const priorityColors = {
      'Critical': '#dc2626',
      'High': '#ef4444', 
      'Medium': '#f59e0b',
      'Low': '#666'
    };
    const priorityColor = priorityColors[t.priority] || '#666';
    
    // Status colors  
    const statusColors = {
      'open': '#ef4444',
      'InProgress': '#f59e0b',
      'Resolved': '#10b981'
    };
    const statusColor = statusColors[t.status] || '#ef4444';
    
    return `
      <div style="padding:12px;border-bottom:1px solid #2a2a2a;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <strong style="color:#fff;">${t.subject}</strong>
          <span style="font-size:11px;color:#666;">${new Date(t.created_at).toLocaleDateString()}</span>
        </div>
        <div style="font-size:12px;color:#999;margin-bottom:8px;">
          ${t.name} - ${t.email} 
          <span style="margin-left:8px;padding:2px 6px;background:${priorityColor}20;color:${priorityColor};border-radius:3px;font-size:10px;font-weight:600;">${t.priority || 'Medium'}</span>
          <span style="margin-left:4px;padding:2px 6px;background:${statusColor}20;color:${statusColor};border-radius:3px;font-size:10px;font-weight:600;">${t.status}</span>
        </div>
        <div style="font-size:13px;color:#ccc;margin-bottom:10px;">${t.message}</div>
        ${t.status !== 'Resolved'? `
        <button onclick="closeTicket(${t.id})" style="padding:4px 10px;background:#ef4444;border:none;border-radius:4px;color:#fff;font-size:11px;cursor:pointer;">
          <i class="fa-solid fa-check"></i> Close
        </button>` : ''}
      </div>
    `;
  }).join('');
  
  if (listEl.innerHTML !== newHTML) {
    listEl.innerHTML = newHTML;
  }
}


// ===== LOAD EMAILS =====
// ===== LOAD EMAILS - NO BLINK =====
let emailsLoading = false;
let emailsCache = null;

async function loadEmails() {
  // Prevent multiple simultaneous calls
  if (emailsLoading) return;
  emailsLoading = true;
  
  const tbody = document.getElementById('emailTableBody');
  const countEl = document.getElementById('emailCount');
  
  // Use cache if we have it and it's fresh
  if (emailsCache && Date.now() - emailsCache.time < 30000) {
    renderEmails(emailsCache.data);
    emailsLoading = false;
    return;
  }
  
  try {
    const res = await fetch(`${API_URL}/api/emails/list`);
    const data = await res.json();
    
    // Cache for 30 seconds
    emailsCache = { data, time: Date.now() };
    renderEmails(data);
    
  } catch (err) {
    console.error('Email load error:', err);
    tbody.innerHTML = '<tr><td colspan="3" class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><p>Failed to load emails</p></td></tr>';
    countEl.textContent = '(0)';
  } finally {
    emailsLoading = false;
  }
}

function renderEmails(data) {
  const tbody = document.getElementById('emailTableBody');
  const countEl = document.getElementById('emailCount');
  
  if (!data.success || !data.emails.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty-state"><i class="fa-solid fa-inbox"></i><p>No emails yet</p></td></tr>';
    countEl.textContent = '(0)';
    return;
  }
  
  countEl.textContent = `(${data.emails.length})`;
  
  // Only update if content actually changed
  const newHTML = data.emails.map(e => `
    <tr>
      <td>${e.email}</td>
      <td><span style="font-size:11px;color:#8b5cf6;">${e.source || 'direct'}</span></td>
      <td style="color:#666;font-size:12px;">${new Date(e.created_at).toLocaleDateString()}</td>
    </tr>
  `).join('');
  
  if (tbody.innerHTML !== newHTML) {
    tbody.innerHTML = newHTML;
  }
}


// ===== FAKE TRAFFIC - HITS D1 =====
function initFakeTraffic() {
  document.getElementById('fakeViewsBtn').onclick = function() {
    fakeTraffic.views =!fakeTraffic.views;
    this.classList.toggle('active');
    this.innerHTML = `<i class="fa-solid fa-eye"></i> Auto Views: ${fakeTraffic.views? 'ON' : 'OFF'}`;
  };

  document.getElementById('fakeLikesBtn').onclick = function() {
    fakeTraffic.likes =!fakeTraffic.likes;
    this.classList.toggle('active');
    this.innerHTML = `<i class="fa-solid fa-heart"></i> Auto Likes: ${fakeTraffic.likes? 'ON' : 'OFF'}`;
  };

  document.getElementById('fakeCartBtn').onclick = function() {
    fakeTraffic.cart =!fakeTraffic.cart;
    this.classList.toggle('active');
    this.innerHTML = `<i class="fa-solid fa-cart-plus"></i> Auto Cart: ${fakeTraffic.cart? 'ON' : 'OFF'}`;
  };

  document.getElementById('fakeSpeed').oninput = function() {
    fakeTraffic.speed = parseInt(this.value);
    document.getElementById('speedLabel').textContent = this.value + 'x';
  };

  setInterval(async () => {
    if (allBeats.length === 0) return;
    const randomBeat = allBeats[Math.floor(Math.random() * allBeats.length)];

    if (fakeTraffic.views && Math.random() < fakeTraffic.speed / 10) {
      await fetch(`${API_URL}/api/stats/play`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ beat_id: randomBeat.id, user_id: 'bot' })
      }).catch(() => {});
    }

    if (fakeTraffic.likes && Math.random() < fakeTraffic.speed / 20) {
      await fetch(`${API_URL}/api/stats/like`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ beat_id: randomBeat.id, liked: true })
      }).catch(() => {});
    }

    if (fakeTraffic.cart && Math.random() < fakeTraffic.speed / 30) {
      const cart = JSON.parse(localStorage.getItem('dopetone_cart') || '[]');
      if (!cart.find(c => c.id == randomBeat.id)) {
        cart.push(randomBeat);
        localStorage.setItem('dopetone_cart', JSON.stringify(cart));
      }
    }

    if (fakeTraffic.views || fakeTraffic.likes || fakeTraffic.cart) {
      loadDashboard();
    }
  }, 2000);
}

// ===== AUTO REFRESH =====
function startAutoRefresh() {
  setInterval(() => {
    loadDashboard();
    loadTickets();
  }, 15000);
}

// ===== UTILITY: Debounce =====
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => { clearTimeout(timeout); func(...args); };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
// ===== EXPOSE TO WINDOW FOR HELPERS =====
window.renderBeatsTable = renderBeatsTable;
window.loadDashboard = loadDashboard;
window.allBeats = allBeats;
window.filteredBeats = filteredBeats;
window.curveHistory = curveHistory;
window.charts = charts;
window.playBeat = playBeat;
window.editBeat = editBeat;
window.deleteBeat = deleteBeat;
window.togglePlay = togglePlay;

// ===== GLOBAL ERROR KILLER =====
window.addEventListener('error', (e) => {
  console.error('[Dopetone] JS Error caught:', e.message);
  const maxId = setTimeout(() => {}, 0);
  for (let i = 0; i < maxId; i++) { clearTimeout(i); clearInterval(i); }
});

// ===== GLOBAL ERROR KILLER =====
window.addEventListener('error', (e) => {
  console.error('[Dopetone] JS Error caught:', e.message);
  const maxId = setTimeout(() => {}, 0);
  for (let i = 0; i < maxId; i++) { clearTimeout(i); clearInterval(i); }
});
// ===== SCOFIELD GRAPH ENGINE =====
let tradeChart;
let currentBeatId = null; // null = all tracks
let currentRange = 'day'; // default = Day view like FL Bar snap

// 1. INIT CHART - Your empty Piano Roll
function initTradeChart() {
  const ctx = document.getElementById('tradeChart').getContext('2d');
  tradeChart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [{
        label: 'Plays',
        data: [],
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { 
          type: 'time',
          time: { unit: 'day' }, // Will change on toggle
          grid: { color: '#1a1a1a' }
        },
        y: { 
          beginAtZero: true,
          grid: { color: '#1a1a1a' }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}

// 2. FETCH DATA - Like loading audio into Edison
async function loadTrackPerformance(beatId = null, range = 'day') {
  currentBeatId = beatId;
  currentRange = range;
  
  // BODMAS: O = Object to send
  const url = beatId 
   ? `${NOX_API}/api/analytics/track/${beatId}?range=${range}`
    : `${NOX_API}/api/analytics/all?range=${range}`;
    
  const res = await fetch(url);
  const data = await res.json(); // [{date: "2026-06-01", plays: 142},...]
  
  // Update graph title = Show track name like FL shows sample name
  const titleEl = document.getElementById('graphTitle');
  const nameEl = document.getElementById('graphBeatName');
  if (beatId && data.beatTitle) {
    titleEl.textContent = 'Track Performance';
    nameEl.textContent = `${data.beatTitle} - Monthly`;
  } else {
    titleEl.textContent = 'Track Performance';
    nameEl.textContent = 'All Tracks';
  }
  
  // Update chart = Draw notes in Piano Roll
  tradeChart.data.datasets[0].data = data.points.map(p => ({
    x: p.date,
    y: p.plays
  }));
  
  // Change X-axis scale = FL Zoom: Hour/Day/Week
  tradeChart.options.scales.x.time.unit = range;
  tradeChart.update();
}

// 3. TOGGLE BUTTONS - Like changing Snap in FL
document.addEventListener('DOMContentLoaded', () => {
  initTradeChart();
  loadTrackPerformance(null, 'day'); // Load all tracks, day view first
  
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const range = btn.dataset.range; // hour | day | week
      loadTrackPerformance(currentBeatId, range);
    };
  });
});

// 4. CLICK TOP SONG = Load that track into graph
// Add this inside your existing topSongs click handler
function selectTrackForGraph(beatId, beatTitle) {
  loadTrackPerformance(beatId, currentRange);
}
// ===== SCOFIELD FIX: INSTANT SPEAKER UPDATE =====
function updateActiveSpeaker() {
  document.querySelectorAll('.top-item').forEach(el => {
    const beatId = parseInt(el.dataset.id);
    const volumeIcon = el.querySelector('.fa-volume-high');
    
    // Remove old icon
    if (volumeIcon) volumeIcon.remove();
    
    // Add if this is current playing track
    if (currentTrack && currentTrack.id == beatId && isPlaying) {
      const iconHTML = '<i class="fa-solid fa-volume-high" style="color:#8b5cf6;"></i>';
      el.insertAdjacentHTML('beforeend', iconHTML);
      el.style.borderColor = '#8b5cf6';
    } else {
      el.style.borderColor = '#333';
    }
  });
}
