// cc-init.js - MAIN ENTRY
import * as CONFIG from './cc-config.js';
import { initCharts } from './cc-charts.js';
import { initPlayer } from './cc-player.js';
import { initTopTracks } from './cc-top-tracks.js';
import { initBeatsTable } from './cc-beats-table.js';
import { loadEmails } from './cc-emails.js';
import { loadTickets } from './cc-tickets.js';
import { initNotices } from './cc-notices.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[CC] Control Center booting...');

  // Auth check
  if (!CONFIG.user.email || CONFIG.user.email.toLowerCase() !== CONFIG.ADMIN_EMAIL) {
    console.log('[CC] Unauthorized - redirecting');
    window.location.href = '/';
    return;
  }

  console.log('[CC] Loading REAL data from D1...');

  // Load REAL DATA FIRST - no test mode
  try {
    await Promise.all([
      CONFIG.loadDashboardStats(),  // GETS totalPlays: 63 from your D1
      CONFIG.loadAllBeats(),        // GETS your beats with real play_count
      CONFIG.loadTopTracks(),       // GETS top performing from beat_events
    ]);
    
    console.log('[CC] Real data loaded successfully');
  } catch (err) {
    console.error('[CC] Failed to load real data:', err);
  }

  // Then init UI modules
  console.log('[CC] Initializing UI modules...');
  try {
    await Promise.all([
      initCharts(),     // Draws graphs with real history
      initPlayer(),     // Sets up Quick Player
      initTopTracks(),  // Renders top tracks section
      initBeatsTable(), // Renders beats table with real stats
      loadEmails(),     // Loads emails
      loadTickets(),    // Loads support tickets
      initNotices(),    // Loads notices
    ]);
    
    console.log('[CC] All modules loaded with REAL D1 data');
  } catch (err) {
    console.error('[CC] Module init failed:', err);
  }
});

// Listen for range changes from UI - reload real stats
window.addEventListener('cc_range_change', (e) => {
  CONFIG.setCurrentRange(e.detail);
  CONFIG.loadDashboardStats();
});
