// cc-tickets.js - Support Tickets Module
import { MAIN_API } from './cc-config.js';

let ticketsLoading = false;
let ticketsCache = null;

// ===== INIT TICKETS =====
export async function initTickets() {
  await loadTickets();
  
  // Auto-refresh every 15 seconds
  setInterval(() => {
    loadTickets();
  }, 15000);
}

// ===== LOAD TICKETS - FROM MAIN_API =====
export async function loadTickets() {
  if (ticketsLoading) return;
  ticketsLoading = true;

  const listEl = document.getElementById('ticketList');
  const countEl = document.getElementById('ticketCount');

  // Use cache if fresh (< 30 seconds)
  if (ticketsCache && Date.now() - ticketsCache.time < 30000) {
    renderTickets(ticketsCache.data);
    ticketsLoading = false;
    return;
  }

  try {
    const res = await fetch(`${MAIN_API}/api/tickets/list`);
    if (!res.ok) throw new Error(`Tickets fetch failed: ${res.status}`);
    
    const data = await res.json();
    
    // Cache for 30 seconds
    ticketsCache = { data, time: Date.now() };
    renderTickets(data);
    
  } catch (err) {
    console.error('[CC Tickets] Load error:', err);
    if (listEl) {
      listEl.innerHTML = '<div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><p>Failed to load</p></div>';
    }
    if (countEl) countEl.textContent = '(0)';
  } finally {
    ticketsLoading = false;
  }
}

// ===== RENDER TICKETS =====
function renderTickets(data) {
  const listEl = document.getElementById('ticketList');
  const countEl = document.getElementById('ticketCount');
  
  if (!listEl) return;

  if (!data.success ||!data.tickets ||!data.tickets.length) {
    listEl.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>No open tickets</p></div>';
    if (countEl) countEl.textContent = '(0)';
    return;
  }

  if (countEl) countEl.textContent = `(${data.tickets.length})`;

  const newHTML = data.tickets.map(t => {
    const priorityColors = {
      'Critical': '#dc2626',
      'High': '#ef4444',
      'Medium': '#f59e0b',
      'Low': '#666'
    };
    const priorityColor = priorityColors[t.priority] || '#666';

    const statusColors = {
      'open': '#ef4444',
      'InProgress': '#f59e0b',
      'Resolved': '#10b981',
      'closed': '#666'
    };
    const statusColor = statusColors[t.status] || '#ef4444';

    const timeAgo = getTimeAgo(t.created_at);

    return `
      <div class="ticket-item" style="padding:12px;border-bottom:1px solid #2a2a2a;background:#0a0a0a;margin-bottom:8px;border-radius:6px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <strong style="color:#fff;font-size:13px;">${t.subject}</strong>
          <span style="font-size:11px;color:#666;">${timeAgo}</span>
        </div>
        <div style="font-size:12px;color:#999;margin-bottom:8px;">
          ${t.name} - ${t.email}
          <span style="margin-left:8px;padding:2px 6px;background:${priorityColor}20;color:${priorityColor};border-radius:3px;font-size:10px;font-weight:600;">${t.priority || 'Medium'}</span>
          <span style="margin-left:4px;padding:2px 6px;background:${statusColor}20;color:${statusColor};border-radius:3px;font-size:10px;font-weight:600;">${t.status}</span>
        </div>
        <div style="font-size:13px;color:#ccc;margin-bottom:10px;line-height:1.4;">${t.message}</div>
        ${t.ai_reply? `
          <div style="background:#1a1a;border-left:3px solid #8b5cf6;padding:8px;margin-bottom:10px;border-radius:4px;">
            <div style="font-size:11px;color:#8b5cf6;margin-bottom:4px;">AI Reply:</div>
            <div style="font-size:12px;color:#999;">${t.ai_reply}</div>
          </div>
        ` : ''}
        ${t.status!== 'Resolved' && t.status!== 'closed'? `
          <button onclick="window.ccCloseTicket(${t.id})" style="padding:6px 12px;background:#ef4444;border:none;border-radius:4px;color:#fff;font-size:11px;cursor:pointer;font-weight:600;">
            <i class="fa-solid fa-check"></i> Close Ticket
          </button>
        ` : ''}
      </div>
    `;
  }).join('');

  // Only update DOM if content changed
  if (listEl.innerHTML!== newHTML) {
    listEl.innerHTML = newHTML;
  }
}

// ===== CLOSE TICKET - Exposed to window =====
window.ccCloseTicket = async function(id) {
  if (!confirm('Close this ticket?')) return;
  
  try {
    const res = await fetch(`${MAIN_API}/api/tickets/close`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ id })
    });
    
    if (!res.ok) throw new Error('Close failed');
    
    // Invalidate cache and reload
    ticketsCache = null;
    await loadTickets();
    
    // Dispatch event for dashboard refresh
    window.dispatchEvent(new CustomEvent('cc_stats_updated'));
    
  } catch (err) {
    console.error('[CC Tickets] Close failed:', err);
    alert('Close ticket failed: ' + err.message);
  }
};

// ===== REFRESH TICKETS =====
export async function refreshTickets() {
  ticketsCache = null; // Invalidate cache
  await loadTickets();
}

// ===== HELPER: Time Ago =====
function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Listen for external refresh requests
window.addEventListener('cc_dashboard_refresh', () => {
  refreshTickets();
});
