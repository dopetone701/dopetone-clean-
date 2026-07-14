// cc-tickets.js - PRO SPOTIFY / YOUTUBE STYLE - FINAL
import { MAIN_API } from './cc-config.js';

const TICKETS_API = "https://support-tickets-api.dopetone701.workers.dev";

let ticketsLoading = false;
let ticketsCache = null;
let allTicketsRaw = [];
let activeTicketFilter = 'all';
let ticketSearchQuery = '';

// ===== INIT =====
export async function initTickets() {
  const refreshBtn = document.getElementById('ticketRefreshBtn');
  const searchToggle = document.getElementById('ticketSearchToggle');
  const searchInput = document.getElementById('ticketSearchInput');
  const markAllBtn = document.getElementById('ticketMarkAllBtn');
  const exportBtn = document.getElementById('ticketExportBtn');

  if (refreshBtn) refreshBtn.onclick = () => refreshTickets();
  if (searchToggle) searchToggle.onclick = () => {
    if (searchInput) {
      searchInput.style.display = searchInput.style.display === 'none'? 'block' : 'none';
      if (searchInput.style.display!== 'none') searchInput.focus();
    }
  };
  if (searchInput) searchInput.oninput = (e) => {
    ticketSearchQuery = e.target.value.toLowerCase().trim();
    renderTickets({ success: true, tickets: allTicketsRaw });
  };
  if (markAllBtn) markAllBtn.onclick = () => {
    document.querySelectorAll('.ticket-row').forEach(r => r.style.opacity = '0.6');
  };
  if (exportBtn) exportBtn.onclick = () => exportTicketsCSV();

  // Filter pills
  document.querySelectorAll('#ticketFilterBar.filter-pill').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('#ticketFilterBar.filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTicketFilter = btn.dataset.filter;
      renderTickets({ success: true, tickets: allTicketsRaw });
    };
  });

  await loadTickets();
  setInterval(() => loadTickets(true), 15000);
}

// ===== LOAD =====
export async function loadTickets(silent = false) {
  if (ticketsLoading) return;
  ticketsLoading = true;

  const skeleton = document.getElementById('ticketSkeleton');
  const refreshBtn = document.getElementById('ticketRefreshBtn');

  if (refreshBtn &&!silent) refreshBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

  try {
    const res = await fetch(`${TICKETS_API}/api/tickets/list?t=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.success && data.tickets) {
      // Detect new tickets for live count
      const newCount = ticketsCache? data.tickets.length - (ticketsCache.data.tickets?.length || 0) : 0;
      const liveCountEl = document.getElementById('ticketLiveCount');
      if (liveCountEl && newCount > 0 && ticketsCache) {
        liveCountEl.textContent = `${newCount} new`;
        liveCountEl.style.color = '#00ff88';
        setTimeout(() => { liveCountEl.textContent = '0 new'; liveCountEl.style.color = '#444'; }, 3000);
      }

      allTicketsRaw = data.tickets;
      ticketsCache = { data, time: Date.now() };
      if (skeleton) skeleton.style.display = 'none';
      renderTickets(data);
    }
  } catch (err) {
    console.error('[CC Tickets] Load error:', err);
    const listEl = document.getElementById('ticketList');
    if (listEl &&!silent) {
      listEl.innerHTML = `<div style="padding:40px;text-align:center;color:#666"><i class="fa-solid fa-circle-exclamation" style="font-size:20px;margin-bottom:8px"></i><p>Failed to load tickets<br><small>${err.message}</small></p><button onclick="window.ccTicketsRefresh()" style="margin-top:10px;padding:6px 12px;background:#222;border:1px solid #333;border-radius:6px;color:#fff;font-size:11px">Retry</button></div>`;
    }
  } finally {
    ticketsLoading = false;
    if (refreshBtn) refreshBtn.innerHTML = '<i class="fa-solid fa-rotate"></i>';
  }
}

// ===== RENDER - SPOTIFY ROW STYLE =====
function renderTickets(data) {
  const listEl = document.getElementById('ticketList');
  const countEl = document.getElementById('ticketCount');
  const footerCount = document.getElementById('ticketFooterCount');
  if (!listEl) return;

  let tickets = data.tickets || [];

  // Update pill counts
  const counts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    answered: tickets.filter(t => t.status === 'answered').length,
    Critical: tickets.filter(t => (t.priority || '').toLowerCase() === 'critical' || (t.priority || '').toLowerCase() === 'high').length,
    Resolved: tickets.filter(t => t.status === 'Resolved' || t.status === 'closed').length
  };
  const setCount = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setCount('t_all', counts.all);
  setCount('t_open', counts.open);
  setCount('t_ans', counts.answered);
  setCount('t_crit', counts.Critical);
  setCount('t_done', counts.Resolved);
  if (countEl) countEl.textContent = `(${tickets.length})`;
  if (footerCount) footerCount.textContent = `${tickets.length} tickets`;

  // Apply filter
  if (activeTicketFilter!== 'all') {
    if (activeTicketFilter === 'open') tickets = tickets.filter(t => t.status === 'open');
    else if (activeTicketFilter === 'answered') tickets = tickets.filter(t => t.status === 'answered');
    else if (activeTicketFilter === 'Critical') tickets = tickets.filter(t => ['critical','high'].includes((t.priority||'').toLowerCase()));
    else if (activeTicketFilter === 'Resolved') tickets = tickets.filter(t => ['resolved','closed'].includes((t.status||'').toLowerCase()));
  }

  // Apply search
  if (ticketSearchQuery) {
    tickets = tickets.filter(t =>
      (t.subject||'').toLowerCase().includes(ticketSearchQuery) ||
      (t.email||'').toLowerCase().includes(ticketSearchQuery) ||
      (t.message||'').toLowerCase().includes(ticketSearchQuery) ||
      (t.name||t.username||'').toLowerCase().includes(ticketSearchQuery)
    );
  }

  if (!tickets.length) {
    listEl.innerHTML = `<div style="padding:50px 20px;text-align:center;color:#444"><i class="fa-solid fa-inbox" style="font-size:24px;display:block;margin-bottom:10px;opacity:0.5"></i><p style="font-size:13px">No tickets in ${activeTicketFilter}</p><small style="font-size:11px;color:#333">${ticketSearchQuery? `Search: "${ticketSearchQuery}"` : 'All caught up ✓'}</small></div>`;
    return;
  }

  const html = tickets.map(t => {
    const initial = (t.name||t.username||t.email||'U').charAt(0).toUpperCase();
    const colors = { 'Critical': '#dc2626', 'High': '#ef4444', 'Medium': '#f59e0b', 'Low': '#555' };
    const pColor = colors[t.priority] || '#555';
    const statusMap = { 'open': { bg:'#ef444422', color:'#ef4444', label:'OPEN' }, 'answered': { bg:'#3b82f622', color:'#3b82f6', label:'REPLIED' }, 'Resolved': { bg:'#10b98122', color:'#10b981', label:'DONE' }, 'closed': { bg:'#222', color:'#666', label:'CLOSED' } };
    const s = statusMap[t.status] || statusMap['open'];
    const timeAgo = getTimeAgo(t.created_at);

    return `
      <div class="ticket-row" data-id="${t.id}" style="display:flex;gap:12px;padding:12px 16px;border-bottom:1px solid #0f0f0f;background:#080808;transition:background.15s;cursor:pointer">
        <div style="width:36px;height:36px;border-radius:50%;background:#1a1a1a;border:1px solid #222;display:flex;align-items:center;justify-content:center;color:#666;font-weight:700;font-size:13px;flex-shrink:0">${initial}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;flex-wrap:wrap">
            <span style="color:#fff;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px">${escapeHtml(t.subject||'Support Request')}</span>
            <span style="padding:1px 6px;border-radius:4px;background:${s.bg};color:${s.color};font-size:9px;font-weight:700;letter-spacing:.5px">${s.label}</span>
            <span style="padding:1px 5px;border-radius:4px;background:${pColor}22;color:${pColor};font-size:9px;font-weight:600">${(t.priority||'Medium').toUpperCase()}</span>
            <span style="margin-left:auto;font-size:10px;color:#444">${timeAgo}</span>
          </div>
          <div style="font-size:11px;color:#888;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(t.name||t.username||'') } • ${escapeHtml(t.email||'')} </div>
          <div style="font-size:12px;color:#aaa;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${escapeHtml((t.message||'').slice(0,120))}</div>
        </div>
        <div class="ticket-actions" style="display:flex;flex-direction:column;gap:4px;opacity:0;transition:opacity.15s;flex-shrink:0">
          <button onclick="event.stopPropagation(); window.ccCloseTicket('${t.id}')" style="width:28px;height:28px;border-radius:50%;background:#111;border:1px solid #222;color:#666;display:flex;align-items:center;justify-content:center;cursor:pointer" title="Close"><i class="fa-solid fa-check" style="font-size:10px"></i></button>
          <button onclick="event.stopPropagation(); window.ccOpenTicket('${t.id}')" style="width:28px;height:28px;border-radius:50%;background:#111;border:1px solid #222;color:#666;display:flex;align-items:center;justify-content:center;cursor:pointer" title="View"><i class="fa-solid fa-ellipsis" style="font-size:10px"></i></button>
        </div>
      </div>
    `;
  }).join('');

  listEl.innerHTML = html;
}

// ===== ACTIONS =====
window.ccCloseTicket = async function(id) {
  if (!confirm('Close this ticket?')) return;
  try {
    const btn = document.querySelector(`.ticket-row[data-id="${id}"]`);
    if (btn) btn.style.opacity = '0.3';

    const res = await fetch(`${TICKETS_API}/api/tickets/close`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ id, status: 'closed' })
    });
    const data = await res.json();
    if (!res.ok ||!data.success) throw new Error(data.error||'Failed');

    // Instant remove animation
    const row = document.querySelector(`.ticket-row[data-id="${id}"]`);
    if (row) {
      row.style.transform = 'translateX(100%)';
      row.style.transition = 'all.3s';
      setTimeout(() => {
        allTicketsRaw = allTicketsRaw.filter(t => t.id!== id);
        ticketsCache = null;
        renderTickets({ success: true, tickets: allTicketsRaw });
        window.dispatchEvent(new CustomEvent('cc_dashboard_refresh'));
      }, 300);
    } else {
      await refreshTickets();
    }
  } catch (err) {
    alert('Close failed: ' + err.message);
    await refreshTickets();
  }
};

window.ccOpenTicket = function(id) {
  const ticket = allTicketsRaw.find(t => t.id === id);
  if (!ticket) return;
  alert(`Subject: ${ticket.subject}\nFrom: ${ticket.email}\n\n${ticket.message}\n\nStatus: ${ticket.status}`);
};

export async function refreshTickets() {
  ticketsCache = null;
  allTicketsRaw = [];
  const skeleton = document.getElementById('ticketSkeleton');
  if (skeleton) skeleton.style.display = 'block';
  await loadTickets();
}

function exportTicketsCSV() {
  if (!allTicketsRaw.length) return alert('No tickets');
  const csv = ['id,email,subject,status,priority,created_at'].concat(allTicketsRaw.map(t => `"${t.id}","${t.email}","${(t.subject||'').replace(/"/g,'""')}","${t.status}","${t.priority}","${t.created_at}"`)).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `tickets_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

function escapeHtml(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function getTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

window.ccTicketsRefresh = refreshTickets;
window.addEventListener('cc_dashboard_refresh', () => refreshTickets());

export default { initTickets, loadTickets, refreshTickets };
