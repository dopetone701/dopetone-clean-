// ===== control-center-helpers.js =====
// SPARKLINES IN TOP STAT CARDS WITH GLOW AURA + % CHANGE

(function() {
  'use strict';
  console.log('[DT Helper] Starting stat card sparklines with glow + change%...');

  let attempts = 0;
  const maxAttempts = 50;

  function init() {
    attempts++;
    if (typeof Chart === 'undefined' ||!document.getElementById('totalPlays')) {
      if (attempts < maxAttempts) return setTimeout(init, 100);
      return console.error('[DT Helper] Chart.js or stat cards not found');
    }

    console.log('[DT Helper] Core found. Injecting stat card sparklines.');

    // Hook into loadDashboard to update sparklines when data loads
    const _originalLoadDashboard = window.loadDashboard;
    if (_originalLoadDashboard) {
      window.loadDashboard = async function() {
        await _originalLoadDashboard();
        setTimeout(drawAllSparklines, 100);
      };
    }

    // Initial draw
    setTimeout(drawAllSparklines, 500);
    console.log('[DT Helper] Ready');
  }

  async function drawAllSparklines() {
    try {
      const apiUrl = window.API_URL || 'https://dope-tone-api.dopetone701.workers.dev';
      const res = await fetch(`${apiUrl}/api/stats/history`);
      if (!res.ok) throw new Error('History fetch failed');

      const history = await res.json();
      console.log('[DT Helper] History loaded:', history);

      // Draw sparklines + calculate % change
      updateStatCard('playsSpark', 'playsChange', history.plays || [], '#8b5cf6');
      updateStatCard('downloadsSpark', 'downloadsChange', history.downloads || [], '#10b981');
      updateStatCard('cartSpark', 'cartChange', history.cart || [], '#f59e0b');
      updateStatCard('likesSpark', 'likesChange', history.likes || [], '#ef4444');
      updateStatCard('ordersSpark', 'ordersChange', history.orders || [], '#3b82f6');
      updateStatCard('revenueSpark', 'revenueChange', history.revenue || [], '#10b981');

    } catch (err) {
      console.error('[DT Helper] Sparkline draw failed:', err);
      // Fallback: draw flat lines with 0%
      drawSpark('playsSpark', [], '#8b5cf6');
      drawSpark('downloadsSpark', [], '#10b981');
      drawSpark('cartSpark', [], '#f59e0b');
      drawSpark('likesSpark', [], '#ef4444');
      drawSpark('ordersSpark', [], '#3b82f6');
      drawSpark('revenueSpark', [], '#10b981');
      setFallbackChange();
    }
  }

  function updateStatCard(canvasId, changeId, data, color) {
    // Draw sparkline
    drawSpark(canvasId, data, color);

    // Calculate % change
    const changeEl = document.getElementById(changeId);
    if (!changeEl) return;

    if (!data || data.length < 2) {
      changeEl.textContent = '+0%';
      changeEl.style.color = '#666';
      return;
    }

    const today = data[data.length - 1] || 0;
    const yesterday = data[data.length - 2] || 0;

    if (yesterday === 0) {
      changeEl.textContent = today > 0? '+100%' : '+0%';
      changeEl.style.color = today > 0? '#10b981' : '#666';
      return;
    }

    const percentChange = ((today - yesterday) / yesterday) * 100;
    const rounded = Math.round(percentChange);

    if (rounded > 0) {
      changeEl.textContent = `+${rounded}%`;
      changeEl.style.color = '#10b981'; // Green
    } else if (rounded < 0) {
      changeEl.textContent = `${rounded}%`;
      changeEl.style.color = '#ef4444'; // Red
    } else {
      changeEl.textContent = '+0%';
      changeEl.style.color = '#666'; // Gray
    }
  }

  function setFallbackChange() {
    ['playsChange', 'downloadsChange', 'cartChange', 'likesChange', 'ordersChange', 'revenueChange'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = '+0%';
        el.style.color = '#666';
      }
    });
  }

  function drawSpark(canvasId, data, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.warn('[DT Helper] Canvas not found:', canvasId);
      return;
    }

    const ctx = canvas.getContext('2d');

    // Destroy old chart
    if (window.charts && window.charts[canvasId]) {
      window.charts[canvasId].destroy();
    }

    // No data = flat line with glow
    if (!data || data.length < 2) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 0;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(5, canvas.height / 2);
      ctx.lineTo(canvas.width - 5, canvas.height / 2);
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset
      return;
    }

    // Create gradient fill for glow effect under line
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, color + '40'); // 25% opacity at top
    gradient.addColorStop(1, color + '00'); // 0% at bottom

    // Ensure charts object exists
    if (!window.charts) window.charts = {};

    // Chart with glow
    window.charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((_, i) => i),
        datasets: [{
          data: data,
          borderColor: color,
          backgroundColor: gradient,
          borderWidth: 2.5,
          tension: 0.4,
          fill: true,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
        elements: {
          line: {
            borderJoinStyle: 'round'
          }
        }
      },
      plugins: [{
        // Custom plugin for canvas glow
        id: 'glow',
        beforeDatasetDraw(chart) {
          const ctx = chart.ctx;
          ctx.save();
          ctx.shadowColor = color;
          ctx.shadowBlur = 12;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 2;
        },
        afterDatasetDraw(chart) {
          chart.ctx.restore();
        }
      }]
    });
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
