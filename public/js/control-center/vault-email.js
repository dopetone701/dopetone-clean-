// vault-email.js - FINAL no-console version
// Auto adds Email button + personalized send

(function(){
  const MAIN_API = "https://emails-api.dopetone701.workers.dev";

  function getAudience(){
    // tries your allEmails first, then table
    if(window.allEmails && window.allEmails.length){
      const active = document.querySelector('#proFilterBar.filter-pill.active');
      const filter = active? active.dataset.filter : 'all';
      // reuse your filtering logic
      if(window.getFiltered) {
        try { return getFiltered(); } catch {}
      }
      return window.allEmails;
    }
    return [...document.querySelectorAll('#emailTableBody tr')].map(tr=>{
      const email = (tr.innerText.match(/[\w.-]+@[\w.-]+\.\w+/)||[])[0];
      const rawName = tr.querySelector('td span')?.innerText || '';
      const name = rawName || email?.split('@')[0] || 'there';
      return email? {email, name} : null;
    }).filter(Boolean);
  }

  function openComposer(){
    if(document.getElementById('vault-composer')) return;
    const audience = getAudience();
    const modal = document.createElement('div');
    modal.id = 'vault-composer';
    modal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px">
      <div style="width:100%;max-width:420px;background:#121212;border:1px solid #2a2a2a;border-radius:20px;padding:22px;box-shadow:0 20px 60px #000">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div><div style="color:#fff;font-weight:800;font-size:14px">Email Audience</div><div style="color:#00ff88;font-size:11px">● ${audience.length} filtered • names auto</div></div>
          <button id="vault-x" style="background:#1e1e1e;border:1px solid #333;color:#777;width:30px;height:30px;border-radius:50%;cursor:pointer">✕</button>
        </div>
        <label style="font-size:11px;color:#666;letter-spacing:.5px">H2</label>
        <input id="vault-h2" placeholder="you didnt just open the vault u dived" value="you didnt just open the vault u dived" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;padding:12px;border-radius:10px;margin:6px 0 14px 0;box-sizing:border-box;font-size:13px">
        <label style="font-size:11px;color:#666;letter-spacing:.5px">PARAGRAPH</label>
        <textarea id="vault-p" placeholder="This is for u pick it up" style="width:100%;height:110px;background:#1a1a1a;border:1px solid #333;color:#ccc;padding:12px;border-radius:10px;box-sizing:border-box;resize:none;font-size:13px">This is for u pick it up.</textarea>
        <div style="background:#0f0f0f;border:1px dashed #222;border-radius:10px;padding:10px;margin-top:12px;font-size:11px;color:#555">Preview: Hi <b style="color:#fff">${audience[0]?.name?.split(' ')[0]||'Alex'}</b>, you didnt just open the vault u dived<br>This is for u pick it up.</div>
        <button id="vault-send" style="width:100%;background:#fff;color:#000;border:none;padding:14px;border-radius:99px;font-weight:900;margin-top:14px;cursor:pointer">Send Personalized to ${audience.length} →</button>
        <div id="vault-status" style="font-size:11px;color:#666;margin-top:10px;text-align:center">From creators@dopetonevault.com • Aura CTA locked in BG</div>
      </div>
    </div>`;
    document.body.appendChild(modal);

    document.getElementById('vault-x').onclick = () => modal.remove();
    modal.onclick = (e) => { if(e.target.id==='vault-composer') modal.remove(); };

    document.getElementById('vault-send').onclick = async () => {
      const h2 = document.getElementById('vault-h2').value.trim();
      const p = document.getElementById('vault-p').value.trim();
      const list = getAudience();
      if(!h2||!p) return alert("Fill H2 and paragraph");
      if(!list.length) return alert("No emails in this filter");

      const btn = document.getElementById('vault-send');
      const st = document.getElementById('vault-status');
      btn.disabled=true; btn.textContent=`Sending ${list.length} personalized...`;
      st.textContent=`Fetching owner names & sending from creators@...`;

      try{
        const res = await fetch(`${MAIN_API}/api/emails/bulk`,{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({emails: list.map(a=>a.email), h2, p})
        });
        const data = await res.json();
        if(!data.success) throw new Error(data.error);
        st.innerHTML = `<span style="color:#00ff88">✅ Sent ${data.count} personalized as: Hi [name], ${h2}</span>`;
        setTimeout(()=>modal.remove(),2500);
      }catch(e){
        st.innerHTML = `<span style="color:#ff5050">❌ ${e.message}</span>`;
        btn.disabled=false; btn.textContent=`Send Personalized to ${list.length} →`;
      }
    };
  }

  function injectButton(){
    const bar = document.getElementById('proFilterBar');
    if(!bar || document.getElementById('vault-email-btn')) return;
    const btn = document.createElement('button');
    btn.id='vault-email-btn';
    btn.innerHTML='✉️ Email';
    btn.style.cssText='background:#fff;color:#000;border:none;padding:7px 16px;border-radius:99px;font-weight:800;font-size:12px;margin-left:12px;cursor:pointer';
    btn.onclick = openComposer;
    bar.appendChild(btn);
  }

  // Auto inject when page ready
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', injectButton);
  else injectButton();
  // retry if your table loads later
  setInterval(injectButton, 2000);
})();
