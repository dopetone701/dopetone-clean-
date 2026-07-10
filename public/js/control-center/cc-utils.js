// cc-utils.js - Shared Utilities Module

// ===== DEBOUNCE =====
// Delays function execution until after wait ms have elapsed since last call
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ===== THROTTLE =====
// Ensures function runs at most once per wait ms
export function throttle(func, wait = 300) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, wait);
    }
  };
}

// ===== FORMAT NUMBER =====
// 1234 -> 1.2K, 1000000 -> 1M
export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  const n = Number(num);
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
}

// ===== FORMAT CURRENCY =====
// 1234.5 -> $1,234.50
export function formatCurrency(amount, currency = 'USD') {
  if (amount === null || amount === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

// ===== TIME AGO =====
// Date -> "2h ago", "3d ago", etc
export function getTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ===== FORMAT DATE =====
// ISO string -> "Jan 15, 2026" or "Jan 15, 2:30 PM"
export function formatDate(dateString, includeTime = false) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const options = {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  };
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  return date.toLocaleDateString('en-US', options);
}

// ===== GET WEEK NUMBER =====
// Date -> week number of year (1-53)
export function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ===== TOAST NOTIFICATION =====
let toastTimeout = null;
export function showToast(message, isError = false, duration = 3000) {
  let t = document.getElementById('ccToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'ccToast';
    t.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 6px;
      font-weight: 600;
      z-index: 99999;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
      max-width: 400px;
    `;
    document.body.appendChild(t);
  }
  
  t.style.background = isError? '#ef4444' : '#10b981';
  t.style.color = '#fff';
  t.innerText = message;
  t.style.display = 'block';
  t.style.opacity = '1';
  t.style.transform = 'translateX(0)';
  
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(20px)';
    setTimeout(() => t.style.display = 'none', 300);
  }, duration);
}

// ===== CONFIRM DIALOG =====
// Returns Promise<boolean>
export function confirmDialog(message, title = 'Confirm') {
  return new Promise((resolve) => {
    const result = window.confirm(`${title}\n\n${message}`);
    resolve(result);
  });
}

// ===== COPY TO CLIPBOARD =====
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard');
    return true;
  } catch (err) {
    console.error('[CC Utils] Copy failed:', err);
    showToast('Copy failed', true);
    return false;
  }
}

// ===== DOWNLOAD FILE =====
export function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// ===== PARSE CSV =====
export function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    headers.forEach((h, idx) => row[h] = values[idx] || '');
    rows.push(row);
  }
  
  return rows;
}

// ===== ESCAPE HTML =====
// Prevents XSS in user content
export function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== TRUNCATE TEXT =====
export function truncate(text, maxLength = 50, suffix = '...') {
  if (!text || text.length <= maxLength) return text || '';
  return text.substring(0, maxLength - suffix.length) + suffix;
}

// ===== VALIDATE EMAIL =====
export function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// ===== VALIDATE URL =====
export function isValidURL(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ===== GET RANDOM COLOR =====
export function getRandomColor() {
  const colors = ['#8b5cf6', '#ef4444', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// ===== SLEEP/DELAY =====
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== RETRY WITH BACKOFF =====
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      const delay = baseDelay * Math.pow(2, i);
      console.log(`[CC Utils] Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await sleep(delay);
    }
  }
}

// ===== LOCALSTORAGE WRAPPER =====
export const storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
};
