// js/notice-board.js - MERGED FINAL - 340 LINES - AUTO CLOSE SLIDE BACK + ONE PLAYER DNA + NO DUPES + NO SCROLLBAR
const DROP_API = "https://dt-drop-zone-api.dopetone701.workers.dev";
const TICKETS_API = "https://support-tickets-api.dopetone701.workers.dev";
const FEED = document.getElementById('noticeBoardFeed');
const INPUT = document.getElementById('noticeBoardInput');
const SEND = document.getElementById('noticeBoardSend');
if (INPUT) { INPUT.placeholder = "Message Dope Tone Creators... 💬"; INPUT.style.display='flex'; }
if (SEND) SEND.style.display='flex';

let activeBeat=null,activeBeatsList=[],lastChatIds=new Set(),dropsHash='',chatActiveUntil=Date.now()+60000,chatVisible=true,isTypingTimeout=null;
let patienceTimer=null;
let lastSentContent='';
let lastSentTime=0;
let currentPreviewList=[], currentPreviewIndex=0;
let isSending = false;

function getRealUser(){
  try{
    let supa=null; for(let k of Object.keys(localStorage)){ if(k.includes('sb-')){ try{ let v=JSON.parse(localStorage.getItem(k)); supa=v?.user||v; }catch{} } }
    let u=supa||JSON.parse(localStorage.getItem('dope_user')||localStorage.getItem('user')||localStorage.getItem('dopetone_user')||'null');
    const email=u?.email||u?.user?.email||localStorage.getItem('dt_email')||'';
    const name=u?.user_metadata?.full_name||u?.user_metadata?.name||u?.displayName||u?.name||(u?.email?u.email.split('@')[0]:'')||localStorage.getItem('dt_fan_name')||'Fan';
    let uid=localStorage.getItem('dt_uid'); if(!uid){ uid='uid_'+Date.now()+'_'+Math.random().toString(36).slice(2,6); localStorage.setItem('dt_uid',uid); }
    if(email) localStorage.setItem('dt_email',email); if(name!=='Fan') localStorage.setItem('dt_fan_name',name);
    return {name,email,uid};
  }catch{ let uid=localStorage.getItem('dt_uid')||'anon_'+Date.now(); localStorage.setItem('dt_uid',uid); return {name:localStorage.getItem('dt_fan_name')||'Fan',email:'',uid}; }
}
function escapeHtml(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function ensureModal(){
  if(document.getElementById('dtBeatModal')) return;
  const m=document.createElement('div');
  m.id='dtBeatModal';
  m.style.cssText='display:none;position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.92);align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(12px)';
  m.innerHTML=`
    <div id="dtModalBox" style="width:100%;max-width:380px;background:#141414;border:1px solid #222;border-radius:20px;overflow:hidden;display:flex;flex-direction:column;max-height:90vh;transform:scale(.92) translateY(16px);opacity:0;transition:all.42s cubic-bezier(.34,1.56,.64,1);box-shadow:0 30px 80px rgba(0,0,0,.9)">
      <div style="position:relative;width:100%;background:#000;flex-shrink:0">
        <img id="dtBigCover" style="width:100%;height:auto;max-height:380px;object-fit:contain;display:block;background:#000">
        <div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 55%,rgba(0,0,0,.8) 100%);pointer-events:none"></div>
        <button onclick="closeBeatModal()" style="position:absolute;top:10px;right:10px;width:34px;height:34px;border-radius:50%;background:rgba(0,0,0,.7);border:1px solid #333;color:#fff;cursor:pointer;z-index:2;backdrop-filter:blur(10px)">✕</button>
        <div style="position:absolute;bottom:10px;left:12px;right:12px;z-index:2">
          <div id="dtBigTitle" style="color:#fff;font-size:16px;font-weight:800;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 2px 8px rgba(0,0,0,.8)"></div>
          <div id="dtBigSub" style="color:#aaa;font-size:11px;margin-top:3px"></div>
        </div>
      </div>
      <div style="padding:12px;background:#121212;border-top:1px solid #222;flex-shrink:0">
        <div style="display:flex;gap:8px">
          <button id="dtModalPlay" style="flex:1;padding:12px;background:linear-gradient(135deg,#0d3bff,#5a3bff);border:none;border-radius:10px;color:#fff;font-weight:800;cursor:pointer;box-shadow:0 4px 18px rgba(13,59,255,.45)">▶ Play in Main Player</button>
          <button id="dtModalNext" style="padding:12px 14px;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;color:#fff;cursor:pointer;font-weight:700">⏭</button>
          <button onclick="closeBeatModal()" style="padding:12px 14px;background:#1a1a1a;border:1px solid #222;border-radius:10px;color:#888;cursor:pointer">✕</button>
        </div>
        <div style="margin-top:8px;font-size:9px;color:#555;text-align:center;letter-spacing:.4px">ONE CENTER OF TRUTH • Only main player plays</div>
      </div>
    </div>`;
  m.onclick=e=>{ if(e.target.id==='dtBeatModal') closeBeatModal(); };
  document.body.appendChild(m);
}
ensureModal();

window.closeBeatModal=()=>{
  const modal=document.getElementById('dtBeatModal');
  const box=document.getElementById('dtModalBox');
  if(box){ box.style.transform='scale(.92) translateY(16px)'; box.style.opacity='0'; }
  setTimeout(()=>{ modal.style.display='none'; }, 200);
};

window.openBeatCard=(id,dropId,forcedList=null,forcedIndex=0,autoPlay=false)=>{
  ensureModal();
  let beats=forcedList||[];
  if(!beats.length){
    let drop=window._dropsCache?.find(d=>d.id===dropId)||window._dropsCache?.find(d=>(d.promotion?.items||[]).some(x=>String(x.id)===String(id)));
    if(drop) beats=drop.promotion?.items||[];
  }
  if(!beats.length){
    let s=window.__CURRENT_BEAT__&&String(window.__CURRENT_BEAT__.id)===String(id)?window.__CURRENT_BEAT__:null;
    if(s) beats=[{id:s.id,title:s.title,cover_url:s.cover_url||s.cover,mp3_url:s.mp3_url||s.audio_url}];
  }
  if(!beats.length) return;
  currentPreviewList=beats;
  let idx=beats.findIndex(b=>String(b.id)===String(id));
  if(idx<0) idx=forcedIndex||0;
  currentPreviewIndex=idx;
  const b=beats[currentPreviewIndex];
  document.getElementById('dtBigCover').src=b.cover_url||b.cover||'images/logo.png';
  document.getElementById('dtBigTitle').textContent=b.title||'Untitled';
  document.getElementById('dtBigSub').textContent=`${b.artist||'DopeTone'} • ${beats.length} beats • Tap to trigger main player`;
  const modal=document.getElementById('dtBeatModal');
  const box=document.getElementById('dtModalBox');
  modal.style.display='flex';
  requestAnimationFrame(()=>{ box.style.transform='scale(1) translateY(0)'; box.style.opacity='1'; });
  document.getElementById('dtModalPlay').onclick=()=>{
    if(window.globalPlayer?.play){
      const playIdx = beats.findIndex(x=> String(x.id)===String(b.id));
      window.globalPlayer.play(playIdx>=0?playIdx:0, beats.map(x=>({
        id:x.id, title:x.title, cover_url:x.cover_url||x.cover, mp3_url:x.mp3_url||x.audio_url||x.preview_url, artist:x.artist||'DopeTone'
      })), 'drop-zone');
    }
    window.dispatchEvent(new CustomEvent('dt_play_beat',{detail:{beat:b,list:beats,index:currentPreviewIndex}}));
    window.dispatchEvent(new CustomEvent('play_beat',{detail:b}));
    setTimeout(closeBeatModal, 350);
  };
  document.getElementById('dtModalNext').onclick=()=>{
    const next=(currentPreviewIndex+1)%beats.length;
    openBeatCard(beats.id, null, beats, next, false);
  };
  if(autoPlay) setTimeout(()=>document.getElementById('dtModalPlay').click(), 200);
};

function buildLayout(){
  if(!FEED||document.getElementById('dtDropsWrap')) return;
  FEED.innerHTML=`
    <style>
      html{scroll-behavior:smooth}
      #dtDropsWrap{scroll-behavior:smooth;transition:transform.55s cubic-bezier(.22,1,.36,1), opacity.5s ease;will-change:transform,opacity}
      #dtChatList{scrollbar-width:none!important; -ms-overflow-style:none!important;}
      #dtChatList::-webkit-scrollbar{display:none!important}
      #dtDropsWrap::-webkit-scrollbar{display:none!important}
      #dtDropsWrap{scrollbar-width:none!important; -ms-overflow-style:none!important;}
      @keyframes slideBack{0%{transform:translateY(-16px);opacity:0}100%{transform:translateY(0);opacity:1}}
      @keyframes bubblePop{0%{transform:translateY(8px) scale(.97);opacity:0}100%{transform:translateY(0) scale(1);opacity:1}}
      @keyframes pulseDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.9)}}
     .drop-anim{animation:slideBack.6s cubic-bezier(.22,1,.36,1) both}
     .bubble-premium{animation:bubblePop.3s cubic-bezier(.34,1.2,.64,1); backdrop-filter:blur(12px); box-shadow:0 4px 24px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06);}
     .typing-dots span{ width:5px;height:5px;background:#0d3bff;border-radius:50%;display:inline-block;animation:typing 1.4s infinite; margin:0 2px; }
     .typing-dots span:nth-child(2){ animation-delay:.2s;background:#ff1a2e }.typing-dots span:nth-child(3){ animation-delay:.4s }
      @keyframes typing{ 0%,60%,100%{ transform:translateY(0); opacity:.4 } 30%{ transform:translateY(-6px); opacity:1 } }
    </style>
    <div id="dtDropsWrap" style="display:flex;flex-direction:column;gap:12px;margin-bottom:14px"></div>
    <div id="dtChatWrap" style="margin-top:14px;background:#0a0a0a;border:1px solid #1e1e2e;border-radius:20px;overflow:hidden;max-height:500px;opacity:1;transform:translateY(0);transition:all.6s cubic-bezier(.22,1,.36,1)">
      <div style="padding:10px 14px;background:#0a0a0f;border-bottom:1px solid #1e1e2e;display:flex;align-items:center;gap:8px;position:sticky;top:0;z-index:2">
        <div style="width:7px;height:7px;background:#00ff88;border-radius:50%;box-shadow:0 0 8px #00ff88;animation:pulseDot 2s infinite"></div>
        <span style="color:#fff;font-size:10px;font-weight:800;letter-spacing:1px">LIVE CHAT • Dope Tone Creators</span>
        <span style="margin-left:6px;background:#0d3bff22;color:#6d7bff;padding:2px 6px;border-radius:99px;font-size:8px;font-weight:800">PRIVATE</span>
        <span id="dtTypingHead" style="margin-left:auto;font-size:9px;color:#0d3bff;display:none">Creators typing...</span>
        <button onclick="document.getElementById('dtChatList').scrollTo({top:99999,behavior:'smooth'})" style="margin-left:auto;background:#1a1a24;border:1px solid #222;border-radius:8px;padding:4px 8px;color:#888;font-size:10px;cursor:pointer">↓</button>
      </div>
      <div id="dtChatList" style="height:320px;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background-image:url('images/chat-bg.png');background-size:cover;background-position:center center;background-repeat:no-repeat;background-color:#000"></div>
      <div id="dtTypingIndicator" style="display:none;padding:0 14px 10px;background:rgba(0,0,0,.75);backdrop-filter:blur(6px)"><div style="display:flex;gap:8px;align-items:center"><div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#0d3bff,#ff1a2e);display:flex;align-items:center;justify-content:center;color:#fff;font-size:7px;font-weight:800">CR</div><div class="bubble-premium" style="background:#151515;border:1px solid #222;padding:10px 14px;border-radius:18px 18px 18px 4px"><div class="typing-dots"><span></span><span></span></div></div></div></div>
    </div>
  `;
}

function showChatSmooth(){ const w=document.getElementById('dtChatWrap'); if(!w) return; w.style.maxHeight='500px'; w.style.opacity='1'; w.style.transform='translateY(0)'; w.style.pointerEvents='auto'; chatVisible=true; chatActiveUntil=Date.now()+60000; }
function hideChatSmooth(){ const w=document.getElementById('dtChatWrap'); if(!w||!chatVisible) return; w.style.maxHeight='0px'; w.style.opacity='0'; w.style.transform='translateY(-10px)'; w.style.pointerEvents='none'; chatVisible=false; }
function scrollToLatest(){ const list=document.getElementById('dtChatList'); if(!list) return; list.scrollTo({top:list.scrollHeight, behavior:'smooth'}); }
function showTyping(show=true){
  const el=document.getElementById('dtTypingIndicator');
  const head=document.getElementById('dtTypingHead');
  if(!el) return;
  el.style.display=show?'block':'none';
  if(head) head.style.display=show?'block':'none';
  if(show) scrollToLatest();
}

const AUTO_MESSAGES = [
  "Yo! Dope Tone Creators got your message 💙❤️ We're in studio but we got you - private reply incoming soon!",
  "🔥 Received by Dope Tone Creators! We're locked in but will hit you back privately ⏳",
  "Thanks for tapping with Creators! This chat is private - only you & us see it. Reply incoming! 🙏"
];
const PATIENCE_MESSAGES = [
  "Hey fam, Creators are in session right now 🎹🎧 We saw your message though - we reply to every single one, just give us a little patience. We got you! - Dope Tone Creators",
  "Real talk - we're cooking with artists right now, that's why we haven't replied yet. Your message is safe & private, we WILL hit you back. Thanks for your patience 🙏 - Creators",
  "Yo, appreciate your patience! Creators team is handling sessions. We don't leave anyone on read - you'll get a private reply soon. Stay blessed! 💙"
];

function showAutoReply(){
  if(localStorage.getItem('dt_auto_shown')){ startPatienceCheck(); return; }
  localStorage.setItem('dt_auto_shown','1');
  setTimeout(()=>{
    showTyping(true);
    setTimeout(()=>{
      showTyping(false);
      const msg = AUTO_MESSAGES[Math.floor(Math.random()*AUTO_MESSAGES.length)];
      appendBubble({id:'auto-'+Date.now(),user_name:'Dope Tone Creators',user_id:'admin',message:msg,is_admin:1,reply_to_user_id:getRealUser().uid,created_at:new Date().toISOString()});
      scrollToLatest(); startPatienceCheck();
    }, 1200);
  }, 800);
}
function startPatienceCheck(){
  clearTimeout(patienceTimer);
  patienceTimer = setTimeout(async ()=>{
    try{
      const uid = getRealUser().uid;
      const res = await fetch(`${DROP_API}/api/chat?uid=${uid}&t=${Date.now()}`).then(r=>r.json()).catch(()=>[]);
      const hasCreatorReply = res.some(c=> c.is_admin==1 && String(c.reply_to_user_id)===String(uid) &&!String(c.id).startsWith('auto-') &&!String(c.id).startsWith('patience-'));
      const hasPatience = localStorage.getItem('dt_patience_shown');
      if(!hasCreatorReply &&!hasPatience){
        showTyping(true);
        setTimeout(()=>{
          showTyping(false);
          const pMsg = PATIENCE_MESSAGES[Math.floor(Math.random()*PATIENCE_MESSAGES.length)];
          appendBubble({id:'patience-'+Date.now(),user_name:'Dope Tone Creators',user_id:'admin',message:pMsg,is_admin:1,reply_to_user_id:uid,created_at:new Date().toISOString()});
          localStorage.setItem('dt_patience_shown','1');
          scrollToLatest();
        }, 1500);
      }
    }catch{}
  }, 50000);
}

// ============ BUBBLES - FIXED - NO DUPLICATE DIV + NO DOUBLE BOY + NO SCROLLBAR ============
function appendBubble(c,isTemp=false){
  const list=document.getElementById('dtChatList'); if(!list) return;
  if(!isTemp && lastChatIds.has(c.id)) return;
  const {uid}=getRealUser();
  if(c.is_admin==1 && c.reply_to_user_id && String(c.reply_to_user_id)!==String(uid)) return;
  if(c.is_admin==1 && c.message===lastSentContent && (Date.now()-lastSentTime)<15000) return;
  if(!isTemp && c.is_admin!=1 && c.message===lastSentContent){
    document.querySelectorAll('#dtChatList [data-id^="tmp-"]').forEach(el=>{ if(el.textContent.trim().includes(c.message.substring(0,10))) el.remove(); });
  }
  if(!isTemp) lastChatIds.add(c.id);
  const isCreator = c.is_admin==1;
  if(isCreator) showTyping(false);
  const div=document.createElement('div');
  div.dataset.id=c.id;
  if(isCreator){
    div.style.cssText='align-self:flex-start;max-width:80%;display:flex;gap:8px;animation:fadeIn.3s ease';
    div.innerHTML=`<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#0d3bff,#ff1a2e);box-shadow:0 0 12px rgba(13,59,255,.5);display:flex;align-items:center;justify-content:center;color:#fff;font-size:7px;font-weight:800;flex-shrink:0">CR</div><div class="bubble-premium" style="background:linear-gradient(135deg,#15152a,#0f0f1e);border:1px solid #0d3bff44;border-left:2px solid #0d3bff;color:#e6e9ff;padding:10px 14px;border-radius:18px 18px 18px 4px;font-size:13px;line-height:1.45"><div style="font-size:7px;color:#6d7bff;font-weight:800;margin-bottom:3px;letter-spacing:.5px">Dope Tone Creators • private</div>${escapeHtml(c.message)}<div style="font-size:9px;color:#555;margin-top:5px">${new Date(c.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div></div>`;
  }else{
    div.style.cssText='align-self:flex-end;max-width:80%;display:flex;gap:8px;flex-direction:row-reverse;animation:fadeIn.3s ease';
    div.innerHTML=`<div style="width:28px;height:28px;border-radius:50%;background:#fff;border:1px solid #222;display:flex;align-items:center;justify-content:center;color:#000;font-size:9px;font-weight:900;flex-shrink:0">${escapeHtml((c.user_name||'F')[0].toUpperCase())}</div><div class="bubble-premium" style="background:linear-gradient(135deg,#0d3bff,#2a3fff);border:1px solid #3a5bff;border-right:2px solid #ff1a2e;color:#fff;padding:10px 14px;border-radius:18px 18px 4px 18px;font-size:13px;line-height:1.45;font-weight:600;box-shadow:0 4px 20px rgba(13,59,255,.45)">${escapeHtml(c.message)}<div style="font-size:9px;color:#b9c4ff;text-align:right;margin-top:4px;display:flex;justify-content:flex-end;gap:4px">${new Date(c.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} <span style="color:#fff">✓✓</span></div></div>`;
  }
  list.appendChild(div);
  scrollToLatest();
  if(isCreator && String(c.reply_to_user_id)===String(uid)) showChatSmooth();
}

async function sendChat(){
  if(isSending) return;
  const t=INPUT?.value.trim(); if(!t) return;
  if(t===lastSentContent && (Date.now()-lastSentTime)<3000) return;
  isSending = true;
  const {name,email,uid}=getRealUser();
  INPUT.value='';
  lastSentContent = t;
  lastSentTime = Date.now();
  appendBubble({id:'tmp-'+Date.now(),user_name:name,user_id:uid,message:t,is_admin:0,created_at:new Date().toISOString()},true);
  showChatSmooth();
  scrollToLatest();
  showTyping(true);
  if(SEND) SEND.disabled=true;
  try{
    await fetch(`${DROP_API}/api/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_name:name,user_id:uid,email,message:t,is_admin:0})});
    fetch(`${TICKETS_API}/api/tickets/create`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email:email||`fan${Date.now()}@zone`,subject:'Drop Zone',message:t,source:'drop_zone'})}).catch(()=>{});
    fetch(`${DROP_API}/api/presence`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:uid,user_name:name,email})}).catch(()=>{});
  }catch{}
  if(SEND) SEND.disabled=false;
  isSending = false;
  setTimeout(()=>{ showTyping(false); showAutoReply(); }, 600);
  clearTimeout(patienceTimer);
  localStorage.removeItem('dt_patience_shown');
}

async function loadDrops(){
  try{
    const res=await fetch(`${DROP_API}/api/notices?t=${Date.now()}`,{cache:'no-store'});
    const drops=await res.json();
    const hash=JSON.stringify(drops.map(d=>d.id));
    if(hash===dropsHash) return;
    dropsHash=hash;
    window._dropsCache=drops;
    const wrap=document.getElementById('dtDropsWrap'); if(!wrap) return;
    wrap.style.willChange='transform, opacity';
    wrap.style.transition='none';
    wrap.style.transform='translateY(-14px)';
    wrap.style.opacity='0';
    setTimeout(()=>{
      wrap.innerHTML=drops.map((n,i)=>{
        const beats=n.promotion?.items||[];
        let promo='';
        if(beats.length){
          const big=beats[0]; const small=beats.slice(1);
          promo=`<div class="drop-anim" style="margin-top:12px;background:#0f0f0f;border:1px solid #222;border-radius:14px;overflow:hidden;animation-delay:${(i*0.07)}s"><div style="padding:8px 12px;background:#181818;border-bottom:1px solid #222;display:flex;justify-content:space-between;align-items:center"><span style="font-size:10px;color:#fff;font-weight:700;letter-spacing:.5px">${beats.length} BEATS DROP 🔥</span><span style="font-size:9px;color:#0d3bff;font-weight:800">TAP COVER → MAIN PLAYER</span></div><div style="padding:12px;display:flex;gap:12px"><img src="${big.cover_url}" onclick="openBeatCard('${big.id}','${n.id}')" style="width:88px;height:88px;border-radius:10px;object-fit:cover;cursor:pointer;border:1px solid #2a2a2a;box-shadow:0 8px 20px rgba(0,0,0,.6)"><div style="flex:1"><div style="color:#fff;font-weight:800;font-size:13px;line-height:1.3">${escapeHtml(big.title)}</div>${small.length? `<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">${small.map(b=>`<img src="${b.cover_url}" onclick="openBeatCard('${b.id}','${n.id}')" title="${escapeHtml(b.title)}" style="width:34px;height:34px;border-radius:7px;border:1px solid #2a2a2a;cursor:pointer;object-fit:cover">`).join('')}</div>`:''}<button onclick="openBeatCard('${big.id}','${n.id}')" style="margin-top:8px;padding:6px 10px;background:#0d3bff;border:none;border-radius:6px;color:#fff;font-size:10px;font-weight:700;cursor:pointer">▶ PREVIEW IN PLAYER</button></div></div></div>`;
        }
        let media=''; if(!beats.length&&n.media?.url){ media=n.media.type==='image'?`<img src="${n.media.url}" loading="lazy" style="width:100%;border-radius:12px;margin-top:10px;border:1px solid #222;cursor:zoom-in;max-height:420px;object-fit:cover" onclick="window.open(this.src,'_blank')">`:`<video src="${n.media.url}" controls preload="metadata" style="width:100%;border-radius:12px;margin-top:10px;border:1px solid #222;background:#000"></video>`; }
        return `<div class="drop-anim" style="background:#121212;border:1px solid #222;border-radius:18px;padding:14px;margin-bottom:12px;animation-delay:${(i*0.05)}s"><div style="display:flex;gap:8px;align-items:center"><div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#0d3bff,#ff1a2e);display:flex;align-items:center;justify-content:center;color:#fff;font-size:7px;font-weight:800;box-shadow:0 0 12px rgba(13,59,255,.4)">CR</div><b style="color:#fff;font-size:12px">Dope Tone Creators</b><span style="color:#555;font-size:10px;margin-left:6px">${new Date(n.created_at||Date.now()).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span><span style="margin-left:auto;width:6px;height:6px;background:#00ff88;border-radius:50%;box-shadow:0 0 6px #00ff88;animation:pulseDot 2s infinite"></span></div>${n.content?`<div style="color:#ddd;font-size:13px;margin-top:8px;white-space:pre-wrap;line-height:1.5">${escapeHtml(n.content)}</div>`:''}${promo}${media}</div>`;
      }).join('')||'<div style="background:#121212;border:1px solid #222;border-radius:18px;padding:30px;text-align:center;color:#555">No drops yet ✨</div>';
      void wrap.offsetHeight;
      wrap.style.transition='transform.55s cubic-bezier(.22,1,.36,1), opacity.5s ease';
      wrap.style.transform='translateY(0)';
      wrap.style.opacity='1';
      setTimeout(()=>{ wrap.style.willChange='auto'; }, 600);
    }, 120);
  }catch{}
}

async function pollChat(){
  try{
    const {uid,name,email}=getRealUser();
    const r=await fetch(`${DROP_API}/api/chat?uid=${uid}&t=${Date.now()}`,{cache:'no-store'}); const chats=await r.json();
    chats.forEach(c=>appendBubble(c));
    fetch(`${DROP_API}/api/presence`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:uid,user_name:name,email})}).catch(()=>{});
  }catch{}
}

buildLayout();
loadDrops();
pollChat();
if(INPUT){
  INPUT.onfocus=()=>showChatSmooth();
  INPUT.oninput=()=>{
    chatActiveUntil=Date.now()+60000;
    if(!chatVisible) showChatSmooth();
    clearTimeout(isTypingTimeout);
    isTypingTimeout=setTimeout(()=>{}, 1000);
  };
  INPUT.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); sendChat(); } };
}
if(SEND) SEND.onclick=()=>sendChat();
setInterval(loadDrops,15000);
setInterval(pollChat,3000);
setInterval(()=>{ if(Date.now()>chatActiveUntil&&chatVisible) hideChatSmooth(); },1000);
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeBeatModal(); });
localStorage.removeItem('dt_patience_shown');
