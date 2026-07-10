// cc-emails.js - Email List Module
import { MAIN_API } from './cc-config.js';

let emailsLoading = false;
let emailsCache = null;

// ===== INIT EMAILS =====
export async function initEmails() {
  await loadEmails();
  
  // Auto-refresh every 30 seconds
  setInterval(() => {
    loadEmails();
  }, 30000);
}

// ===== LOAD EMAILS - FROM MAIN_API =====
export async function loadEmails() {
  if (emailsLoading) return;
  emailsLoading = true;

  const tbody = document.getElementById('emailTableBody');
  const countEl = document.getElementById('emailCount');

  // Use cache if fresh (< 30 seconds)
  if (emailsCache && Date.now() - emailsCache.time < 30000) {
    renderEmails(emailsCache.data);
    emailsLoading = false;
    return;
  }

  try {
    const res = await fetch(`${MAIN_API}/api/emails/list`);
    if (!res.ok) throw new Error(`Email fetch failed: ${res.status}`);
    
    const data = await res.json();
    
    // Cache for 30 seconds
    emailsCache = { data, time: Date.now() };
    renderEmails(data);
    
  } catch (err) {
    console.error('[CC Emails] Load error:', err);
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="3" class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><p>Failed to load emails</p></td></tr>';
    }
    if (countEl) countEl.textContent = '(0)';
  } finally {
    emailsLoading = false;
  }
}

// ===== RENDER EMAILS =====
function renderEmails(data) {
  const tbody = document.getElementById('emailTableBody');
  const countEl = document.getElementById('emailCount');
  
  if (!tbody) return;

  if (!data.success ||!data.emails ||!data.emails.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty-state"><i class="fa-solid fa-inbox"></i><p>No emails yet</p></td></tr>';
    if (countEl) countEl.textContent = '(0)';
    return;
  }

  if (countEl) countEl.textContent = `(${data.emails.length})`;

  // Only update DOM if content actually changed
  const newHTML = data.emails.map(e => `
    <tr>
      <td>${e.email}</td>
      <td><span style="font-size:11px;color:#8b5cf6;">${e.source || 'direct'}</span></td>
      <td style="color:#666;font-size:12px;">${new Date(e.created_at).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })}</td>
    </tr>
  `).join('');

  if (tbody.innerHTML!== newHTML) {
    tbody.innerHTML = newHTML;
  }
}

// ===== EXPORT EMAILS TO CSV =====
export async function exportEmails() {
  try {
    const res = await fetch(`${MAIN_API}/api/emails/export`);
    if (!res.ok) throw new Error('Export failed');
    
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dopetone-emails-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    alert('Emails exported successfully');
  } catch (err) {
    console.error('[CC Emails] Export failed:', err);
    alert('Export failed: ' + err.message);
  }
}

// ===== REFRESH EMAILS =====
export async function refreshEmails() {
  emailsCache = null; // Invalidate cache
  await loadEmails();
}

// Listen for external refresh requests
window.addEventListener('cc_dashboard_refresh', () => {
  refreshEmails();
});
