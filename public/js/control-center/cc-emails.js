// ===============================
// cc-emails.js - FINAL WITH creators@ SENDING
// Worker: emails-api.dopetone701.workers.dev
// FROM: creators@dopetonevault.com
// ===============================
const MAIN_API = "https://emails-api.dopetone701.workers.dev";

let emailsLoading = false;
let allEmails = [];
let currentFilter = 'all';

export async function initEmails() {
  wireFilters();
  await loadEmails();
  setInterval(loadEmails, 30000);
}

function wireFilters(){
  const bar = document.getElementById('proFilterBar');
  if(!bar) return;
  bar.querySelectorAll('.filter-pill').forEach(btn=>{
    btn.onclick = ()=>{
      bar.querySelectorAll('.filter-pill').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      render();
    };
  });
  document.getElementById('copyAudienceBtn')?.addEventListener('click', copyAudience);
  document.getElementById('exportBtn')?.addEventListener('click', exportEmails);
  
  // NEW - WIRE SEND BUTTON
  document.getElementById('sendBulkBtn')?.addEventListener('click', sendBulkEmails);
  document.getElementById('bulkSendBtn')?.addEventListener('click', sendBulkEmails);
}

async function loadEmails(){
  if(emailsLoading) return;
  emailsLoading=true;
  try{
    const res = await fetch(`${MAIN_API}/api/emails/list?unified=true`, {cache:'no-store'});
    const data = await res.json();
    const map = new Map();
    (data.emails||[]).forEach(raw=>{
      const email = (raw.email||'').toLowerCase().trim();
      if(!email ||!email.includes('@')) return;
      if(!map.has(email)) map.set(email, {email, sources:new Set(), created_at: raw.created_at||new Date().toISOString(), name: raw.name||'', verified: false});
      const entry = map.get(email);
      entry.sources.add((raw.source||'subscription').toLowerCase());
      if(raw.verified) entry.verified = true;
      if(raw.created_at && new Date(raw.created_at) < new Date(entry.created_at)) entry.created_at = raw.created_at;
      if(raw.name) entry.name = raw.name;
    });
    allEmails = Array.from(map.values()).map(e=>{
      const sources = Array.from(e.sources);
      return {
       ...e,
        sources,
        isAccount: sources.includes('account'),
        isNewsletter: sources.includes('newsletter'),
        isSub: sources.includes('subscription'),
        isVIP: sources.includes('account') && (sources.includes('subscription') || sources.includes('newsletter')),
        isNeverSubscribed: sources.includes('account') &&!sources.includes('newsletter') &&!sources.includes('subscription'),
        isWarm:!sources.includes('account') && sources.includes('subscription'),
      };
    }).sort((a,b)=> new Date(b.created_at)-new Date(a.created_at));
    render();
  }catch(err){
    console.error('[Emails]', err);
    document.getElementById('emailTableBody').innerHTML = `<tr><td colspan="4" class="empty-state">Failed: ${err.message}</td></tr>`;
  } finally { emailsLoading=false; }
}

function getFiltered(){
  switch(currentFilter){
    case 'account': return allEmails.filter(e=>e.isAccount);
    case 'newsletter': return allEmails.filter(e=>e.isNewsletter);
    case 'subscription': return allEmails.filter(e=>e.isSub);
    case 'never_subscribed': return allEmails.filter(e=>e.isNeverSubscribed);
    case 'vip': return allEmails.filter(e=>e.isVIP);
    case 'warm': return allEmails.filter(e=>e.isWarm);
    case 'all':
    default:
      return allEmails.filter(e=>!e.isVIP);
  }
}

// NEW - MEANINGFUL SEND FUNCTION WITH creators@
async function sendBulkEmails(){
  const filtered = getFiltered();
  if(!filtered.length) return alert("No emails in this filter");

  // Get subject and html from your UI - tries multiple IDs
  const subjectEl = document.getElementById('bulkSubject') || document.getElementById('emailSubject') || document.getElementById('subjectInput');
  const htmlEl = document.getElementById('bulkBody') || document.getElementById('emailBody') || document.getElementById('emailHtml') || document.getElementById('bodyInput');
  
  const subject = subjectEl?.value || "I built this because I was tired of fake packs";
  const html = htmlEl?.value || `
    <div style="background:#0a0a0a;color:#e8e8e8;font-family:Helvetica,Arial,sans-serif;padding:40px 20px;">
    <div style="max-width:600px;margin:0 auto;background:#121212;border:1px solid #232323;border-radius:16px;padding:32px;">
    <h2 style="color:#fff;">You didn't just subscribe. You joined the vault.</h2>
    <p style="color:#ccc;">Yo, it's DopeTone — Emma & Don here. We built DopeToneVault because we were tired of fake packs that do nothing in your DAW.</p>
    <p style="color:#ccc;">You're one of the first ${filtered.length} in our D1. So no discount code — I'm giving you the Vault free for 48h.</p>
    <a href="https://dopetonevault.com" style="display:inline-block;background:#fff;color:#000;padding:14px 28px;border-radius:99px;text-decoration:none;font-weight:800;">ENTER THE VAULT →</a>
    <p style="font-size:11px;color:#444;margin-top:32px;">From creators@dopetonevault.com — reply goes to us.</p>
    </div></div>
  `;

  const btn = document.getElementById('sendBulkBtn') || document.getElementById('bulkSendBtn') || document.getElementById('sendTo5Btn');
  const origText = btn ? btn.innerHTML : "";
  if(btn){ btn.innerHTML = `Sending ${filtered.length}...`; btn.disabled = true; }

  try{
    const res = await fetch(`${MAIN_API}/api/emails/bulk`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        emails: filtered.map(e=>e.email),
        subject,
        html
      })
    });
    const data = await res.json();
    if(!data.success) throw new Error(data.error || "Send failed");
    alert(`✅ Sent ${data.count} emails from creators@dopetonevault.com\n\nCheck Resend logs`);
  }catch(err){
    alert(`❌ Failed: ${err.message}`);
  }finally{
    if(btn){ btn.innerHTML = origText; btn.disabled = false; }
  }
}

function render(){
  const tbody = document.getElementById('emailTableBody');
  const countEl = document.getElementById('emailCount');
  const bulkCount = document.getElementById('bulkCount');
  if(!tbody) return;
  const counts = {
    all: allEmails.filter(e=>!e.isVIP).length,
    account: allEmails.filter(e=>e.isAccount).length,
    newsletter: allEmails.filter(e=>e.isNewsletter).length,
    subscription: allEmails.filter(e=>e.isSub).length,
    never: allEmails.filter(e=>e.isNeverSubscribed).length,
    vip: allEmails.filter(e=>e.isVIP).length,
    warm: allEmails.filter(e=>e.isWarm).length,
  };
  document.getElementById('c_all') && (document.getElementById('c_all').textContent = counts.all);
  document.getElementById('c_acc') && (document.getElementById('c_acc').textContent = counts.account);
  document.getElementById('c_news') && (document.getElementById('c_news').textContent = counts.newsletter);
  document.getElementById('c_sub') && (document.getElementById('c_sub').textContent = counts.subscription);
  document.getElementById('c_never') && (document.getElementById('c_never').textContent = counts.never);
  document.getElementById('c_vip') && (document.getElementById('c_vip').textContent = counts.vip);
  document.getElementById('c_warm') && (document.getElementById('c_warm').textContent = counts.warm);
  const filtered = getFiltered();
  if(countEl) countEl.textContent = `(${filtered.length})`;
  if(bulkCount) bulkCount.textContent = filtered.length;
  if(!filtered.length){
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state"><i class="fa-solid fa-inbox"></i><p>No ${currentFilter} emails</p></td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map(e=>{
    let badges = '';
    if(e.isAccount) badges += `<span style="background:#00c6ff22;color:#00c6ff;border:1px solid #00c6ff44;padding:2px 6px;border-radius:10px;font-size:9px">ACCOUNT</span>`;
    if(e.isNewsletter) badges += `<span style="background:#8b5cf622;color:#8b5cf6;border:1px solid #8b5cf644;padding:2px 6px;border-radius:10px;font-size:9px">NEWS</span>`;
    if(e.isSub) badges += `<span style="background:#ffaa0022;color:#ffaa00;border:1px solid #ffaa0044;padding:2px 6px;border-radius:10px;font-size:9px">SUB</span>`;
    if(e.isVIP) badges += `<span style="background:#00ff8822;color:#00ff88;border:1px solid #00ff8844;padding:2px 6px;border-radius:10px;font-size:9px">VIP</span>`;
    if(e.isNeverSubscribed) badges += `<span style="background:#ff505022;color:#ff5050;border:1px solid #ff505044;padding:2px 6px;border-radius:10px;font-size:9px">COLD</span>`;
    return `<tr>
      <td><div style="display:flex;flex-direction:column"><span style="font-weight:500">${e.email} ${e.verified?'<i class="fa-solid fa-circle-check" style="color:#00ff88"></i>':''}</span><span style="font-size:11px;color:#666">${e.name||''}</span></div></td>
      <td><div style="display:flex;gap:4px;flex-wrap:wrap">${badges}</div></td>
      <td style="font-size:12px;color:#666">${new Date(e.created_at).toLocaleDateString()}</td>
      <td><button class="action-btn" onclick="navigator.clipboard.writeText('${e.email}')"><i class="fa-solid fa-copy"></i></button></td>
    </tr>`;
  }).join('');
}

function copyAudience(){
  const list = getFiltered().map(e=>e.email).join(', ');
  navigator.clipboard.writeText(list);
  const btn = document.getElementById('copyAudienceBtn');
  const old = btn.innerHTML;
  btn.innerHTML = `<i class="fa-solid fa-check"></i> Copied ${getFiltered().length}`;
  setTimeout(()=>btn.innerHTML=old, 1500);
}

function exportEmails(){
  const rows = [['email','sources','isAccount','isNewsletter','isSub','isNeverSubscribed','isVIP','created_at']];
  getFiltered().forEach(e=> rows.push([e.email, e.sources.join('|'), e.isAccount, e.isNewsletter, e.isSub, e.isNeverSubscribed, e.isVIP, e.created_at]));
  const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=`dopetone-${currentFilter}-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

window.addEventListener('cc_dashboard_refresh', ()=>loadEmails());
// Expose send function globally for inline onclick
window.sendBulkEmails = sendBulkEmails;
