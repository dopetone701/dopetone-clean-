// email-composer.js FINAL - H2 + Paragraph + Personalized Name
(() => {
  document.getElementById('vault-composer')?.remove();
  document.getElementById('vault-email-btn')?.remove();

  // Get filtered emails with names from your cc-emails.js
  function getSelected() {
    // Uses your allEmails if available, else reads table
    if(window.allEmails && window.getFiltered){
      try { return window.getFiltered(); } catch{}
    }
    return [...document.querySelectorAll('#emailTableBody tr')].map(tr=>{
      const email = (tr.innerText.match(/[\w.-]+@[\w.-]+\.\w+/)||[])[0];
      return email? {email, name: email.split('@')[0]} : null;
    }).filter(Boolean);
  }

  // BG HTML - Locked with Aura CTA, only H2 + P inject
  const buildHtml = (ownerName, h2, p) => `
<div style="background:#080808;padding:24px;font-family:Helvetica,Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;background:#0f0f0f;border:1px solid #1e1e1e;border-radius:20px;overflow:hidden">
    <div style="padding:32px">
      <div style="font-size:11px;color:#555;letter-spacing:1px">FOR ${ownerName.toUpperCase()}</div>
      <h2 style="color:#fff;font-size:22px;margin:12px 0;font-weight:800">Hi ${ownerName}, ${h2}</h2>
      <p style="color:#bbb;font-size:14px;line-height:1.7">${p}</p>
      <div style="margin-top:8px;color:#888;font-size:13px">This is for u pick it up.</div>
    </div>
    <div style="padding:0 32px 28px 32px">
      <div style="background:#151515;border:1px solid #222;border-radius:12px;padding:14px;display:flex;gap:12px;align-items:center">
        <div style="width:44px;height:44px;background:#fff;border-radius:10px;display:flex;align-items:center;justify-content:center">🔮</div>
        <div><div style="color:#fff;font-weight:700;font-size:12px">AURA ENGINE</div><div style="color:#777;font-size:11px">Your packs, now intelligent.</div></div>
      </div>
      <a href="https://dopetonevault.com/vault" style="display:block;background:#fff;color:#000;text-align:center;padding:14px;border-radius:99px;text-decoration:none;font-weight:900;margin-top:16px">ENTER THE VAULT →</a>
    </div>
  </div>
</div>`;

  function openWindow(){
    if(document.getElementById('vault-composer')) return;
    const selected = getSelected();
    const count = selected.length;
    const filterName = document.querySelector('.filter-pill.active')?.innerText || 'Selected';

    const w = document.createElement('div');
    w.id = 'vault-composer';
    w.innerHTML = `
    <div style="position:fixed;inset:0;background:#000a;z-index:9999999;display:flex;align-items:center;justify-content:center">
      <div style="width:400px;background:#121212;border:1px solid #333;border-radius:16px;padding:20px;box-shadow:0 20px 60px #000">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <div><b style="color:#fff">Email ${filterName}</b><div style="font-size:11px;color:#00ff88">● ${count} emails • names auto-injected</div></div>
          <button id="vault-x" style="background:#222;border:1px solid #333;color:#888;width:28px;height:28px;border-radius:50%;cursor:pointer">✕</button>
        </div>

        <label style="font-size:11px;color:#666">H2 - e.g: you didnt just open the vault u dived</label>
        <input id="vault-h2" placeholder="you didnt just open the vault u dived" value="you didnt just open the vault u dived" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#fff;padding:12px;border-radius:8px;margin:4px 0 12px 0;box-sizing:border-box">

        <label style="font-size:11px;color:#666">Paragraph</label>
        <textarea id="vault-p" placeholder="This is for u..." style="width:100%;height:100px;background:#1a1a1a;border:1px solid #333;color:#ccc;padding:12px;border-radius:8px;box-sizing:border-box">This is for u pick it up.</textarea>

        <div style="background:#0f0f0f;border:1px dashed #333;border-radius:8px;padding:10px;margin-top:12px;font-size:11px;color:#555">
          Preview: <span style="color:#888">Hi <b style="color:#fff">${selected[0]?.name||'Alex'}</b>, <span id="prev-h2">you didnt just open the vault u dived</span><br><span id="prev-p">This is for u pick it up.</span></span>
        </div>

        <button id="vault-send" style="width:100%;background:#fff;color:#000;border:none;padding:13px;border-radius:99px;font-weight:800;margin-top:14px;cursor:pointer">Send to ${count} Personalized from creators@ →</button>
        <div id="vault-status" style="font-size:11px;color:#666;margin-top:8px;text-align:center"></div>
      </div>
    </div>`;
    document.body.appendChild(w);

    // Live preview
    const h2Input = document.getElementById('vault-h2');
    const pInput = document.getElementById('vault-p');
    h2Input.oninput = ()=> document.getElementById('prev-h2').textContent = h2Input.value;
    pInput.oninput = ()=> document.getElementById('prev-p').textContent = pInput.value;

    document.getElementById('vault-x').onclick = ()=> w.remove();

    document.getElementById('vault-send').onclick = async()=>{
      const h2 = document.getElementById('vault-h2').value.trim();
      const p = document.getElementById('vault-p').value.trim();
      const audience = getSelected();
      if(!h2 ||!p) return alert("Type H2 and paragraph");
      if(!audience.length) return alert("Select filter - no emails");

      const btn = document.getElementById('vault-send');
      const status = document.getElementById('vault-status');
      btn.disabled=true; btn.textContent=`Sending to ${audience.length}...`;
      status.textContent=`Worker fetching owner names & sending...`;

      try{
        // Send BULK with h2 + p, worker will fetch names from D1 and personalize
        const res = await fetch("https://emails-api.dopetone701.workers.dev/api/emails/bulk",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            emails: audience.map(a=>a.email),
            h2: h2,
            p: p
          })
        });
        const data = await res.json();
        if(!data.success) throw new Error(data.error);
        status.innerHTML=`<span style="color:#00ff88">✅ Sent ${data.count} personalized • Hi Alex, ${h2}</span>`;
        setTimeout(()=>w.remove(),2000);
      }catch(e){
        status.innerHTML=`<span style="color:#ff5050">❌ ${e.message}</span>`;
        btn.disabled=false; btn.textContent=`Send to ${audience.length} Personalized →`;
      }
    };
  }

  // Add "Email" button next to your filters
  const bar = document.getElementById('proFilterBar');
  if(bar){
    const btn = document.createElement('button');
    btn.id='vault-email-btn';
    btn.textContent='✉️ Email';
    btn.style.cssText='background:#fff;color:#000;border:none;padding:6px 14px;border-radius:99px;font-weight:800;font-size:12px;margin-left:10px;cursor:pointer';
    btn.onclick = openWindow;
    bar.appendChild(btn);
  }

  // Also open when you click any email row action
  document.addEventListener('click', (e)=>{
    if(e.target.closest('.action-btn')) openWindow();
  });

  console.log("Vault Email Ready: Select filter → Click Email → Type H2 + P → Send personalized");
})();
