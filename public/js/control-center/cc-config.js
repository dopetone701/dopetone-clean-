// cc-config.js - SHARED CONFIG
export const MAIN_API = 'https://api.dopetonevault.com';
export const STATS_API = 'https://dopetone-stats.dopetone701.workers.dev';
export const ADMIN_EMAIL = 'dopetone701@gmail.com';
export const DEFAULT_LOGO = 'images/logo.png';

export const user = JSON.parse(localStorage.getItem('dopetone_user') || '{}');

// Global state
export let allBeats = [];
export let filteredBeats = [];
export let currentTrack = null;
export let isPlaying = false;
export let topTracks = [];
export let currentTopIndex = 0;
export let currentBeatId = null;
export let currentRange = 'day';
export const charts = {};

// Setters for modules to update shared state
export function setAllBeats(beats) { allBeats = beats; }
export function setFilteredBeats(beats) { filteredBeats = beats; }
export function setCurrentTrack(track) { currentTrack = track; }
export function setIsPlaying(state) { isPlaying = state; }
export function setTopTracks(tracks) { topTracks = tracks; }
export function setCurrentTopIndex(idx) { currentTopIndex = idx; }
export function setCurrentBeatId(id) { currentBeatId = id; }
export function setCurrentRange(range) { currentRange = range; }

// ===== UNIVERSAL D1 EVENT LOGGER =====
export async function logBeatEvent(beatId, eventType) {
  if (!beatId) return;
  try {
    const res = await fetch(`${STATS_API}/api/stats/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        beatId: parseInt(beatId), // Force integer for D1
        eventType: eventType // 'play', 'like', 'download', 'cart'
      })
    });
    if (!res.ok) throw new Error(`D1 ${res.status}`);
    console.log(`✅ D1: ${eventType} logged for beat ${beatId}`);
  } catch (err) {
    console.warn(`❌ D1 ${eventType} failed:`, err);
  }
}

// Shorthand wrappers
export const logPlay = (beatId) => logBeatEvent(beatId, 'play');
export const logLike = (beatId, liked = true) => liked && logBeatEvent(beatId, 'like');
export const logDownload = (beatId) => logBeatEvent(beatId, 'download');
export const logCart = (beatId, added = true) => added && logBeatEvent(beatId, 'cart');

// ===== LOAD DASHBOARD STATS =====
export async function loadDashboardStats() {
  try {
    console.log('[CC] Loading real stats from D1...');
    const res = await fetch(`${STATS_API}/api/stats/global?range=${currentRange}`);
    if (!res.ok) throw new Error(`Stats fetch failed: ${res.status}`);

    const data = await res.json();
    console.log('[CC] Real stats loaded:', data);

    // Update stat cards
    const el = (id) => document.getElementById(id);
    if (el('totalPlays')) el('totalPlays').textContent = (data.totalPlays || 0).toLocaleString();
    if (el('totalDownloads')) el('totalDownloads').textContent = (data.totalDownloads || 0).toLocaleString();
    if (el('cartItems')) el('cartItems').textContent = (data.cartItems || 0).toLocaleString();
    if (el('totalLikes')) el('totalLikes').textContent = (data.totalLikes || 0).toLocaleString();
    if (el('totalOrders')) el('totalOrders').textContent = (data.totalOrders || 0).toLocaleString();
    if (el('totalRevenue')) el('totalRevenue').textContent = `$${(data.totalRevenue || 0).toLocaleString()}`;

    // Dispatch event for charts/sparklines
    window.dispatchEvent(new CustomEvent('cc_stats_loaded', { detail: data }));

    return data;
  } catch (err) {
    console.error('[CC Config] Stats load failed:', err);
    return null;
  }
}

// ===== LOAD ALL BEATS =====
export async function loadAllBeats() {
  try {
    console.log('[CC] Loading beats from API...');
    const res = await fetch(`${MAIN_API}/beats`);
    if (!res.ok) throw new Error(`Beats fetch failed: ${res.status}`);

    const beats = await res.json();
    console.log('[CC] Beats loaded:', beats.length);
    setAllBeats(beats);
    setFilteredBeats(beats);

    // Dispatch event for tables/lists
    window.dispatchEvent(new CustomEvent('cc_beats_loaded', { detail: beats }));

    return beats;
  } catch (err) {
    console.error('[CC Config] Beats load failed:', err);
    setAllBeats([]);
    setFilteredBeats([]);
    return [];
  }
}

// ===== LOAD TOP TRACKS =====
export async function loadTopTracks() {
  try {
    console.log('[CC] Loading top tracks...');
    const res = await fetch(`${STATS_API}/api/stats/top`);
    if (!res.ok) throw new Error(`Top tracks fetch failed: ${res.status}`);

    const tracks = await res.json();
    console.log('[CC] Top tracks loaded:', tracks.length);
    setTopTracks(tracks);

    window.dispatchEvent(new CustomEvent('cc_top_tracks_loaded', { detail: tracks }));

    return tracks;
  } catch (err) {
    console.error('[CC Config] Top tracks load failed:', err);
    setTopTracks([]);
    return [];
  }
}

// ===== HELPER: Format number =====
export function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}

// ===== HELPER: Get time ago =====
export function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
