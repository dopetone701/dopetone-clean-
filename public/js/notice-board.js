// js/notice-board.js - SPOTIFY LAYOUT KEPT - ONLY COLOR BLUE DNA + CHAT SLIDE FIX
const DROP_API = "https://dt-drop-zone-api.dopetone701.workers.dev";
const TICKETS_API = "https://support-tickets-api.dopetone701.workers.dev";
const FEED = document.getElementById('noticeBoardFeed');
const INPUT = document.getElementById('noticeBoardInput');
const SEND = document.getElementById('noticeBoardSend');
if (INPUT) { INPUT.placeholder = "Talk to us... 💬"; INPUT.style.fontSize="16px"; }
if (SEND) SEND.style.display='flex';

let activeBeat = null, activeBeatsList = [], lastChatIds = new Set(), dropsHash = '', chatVisible = true, chatActiveUntil = Date.now()+60000, lastSentContent='', lastSentTime=0, isSending=false;

function getRealUser(){
  try{ let u=JSON.parse(localStorage.getItem('dope_user')||'null'); const email=u?.email||localStorage.getItem('dt_email')||''; const name=u?.name||'Fan'; let uid=localStorage.getItem('dt_uid'); if(!uid){uid='uid_'+Date.now(); localStorage.setItem('dt_uid',uid);} return {name,email,uid}; }catch{ return {name:'Fan',email:'',uid:localStorage.getItem('dt_uid')||'anon'}; }
}
function escapeHtml(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// STOP IOS ZOOM FROM HIDING SEND BTN
(function(){ const m=document.querySelector('meta[name=viewport]'); if(m) m.content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"; })();

// ============ SPOTIFY MODAL - EXACT AS RESTORED, ONLY BTN COLOR BLUE ============
function ensureModal() {
  if (document.getElementById('dtBeatModal')) return;
  const modal = document.createElement('div');
  modal.id = 'dtBeatModal';
  modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.88);backdrop-filter:blur(12px);align-items:center;justify-content:center;padding:16px';
  modal.innerHTML = `
    <div style="width:100%;max-width:400px;background:#121212;border:1px solid #282828;border-radius:24px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.9)">
      <div style="position:relative">
        <img id="dtBigCover" src="" style="width:100%;aspect-ratio:1;object-fit:cover">
        <button onclick="closeBeatModal()" style="position:absolute;top:14px;right:14px;width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,.7);border:1px solid #333;color:#fff;font-size:16px;cursor:pointer">✕</button>
        <button id="dtBigPlay" style="position:absolute;bottom:-24px;right:18px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#0d3bff,#2a5bff);color:#fff;border:none;font-size:20px;cursor:pointer;box-shadow:0 8px 24px rgba(13,59,255,.5);display:flex;align-items:center;justify-content:center"><i id="dtPlayIcon" class="fa-solid fa-play" style="margin-left:2px"></i></button>
      </div>
      <div style="padding:22px 18px 16px">
        <div id="dtBigTitle" style="color:#fff;font-size:20px;font-weight:800;line-height:1.2"></div>
        <div id="dtBigMeta" style="color:#b3b3b3;font-size:12px;margin-top:6px;display:flex;gap:8px;flex-wrap:wrap"></div>
        <div id="dtRest" style="display:flex;gap:8px;overflow-x:auto;margin-top:18px;padding-bottom:4px"></div>
      </div>
    </div>`;
  modal.onclick = (e) => { if (e.target.id==='dtBeatModal') closeBeatModal(); };
  document.body.appendChild(modal);
}
ensureModal();

function playBeatLinked(beat){
  activeBeat = beat;
  const list = activeBeatsList.map(b=>({id:b.id, title:b.title, cover_url:b.cover_url||b.cover, mp3_url:b.mp3_url||b.audio_url}));
  const idx = list.findIndex(b=> String(b.id)===String(beat.id));
  if(window.globalPlayer && window.globalPlayer.play) window.globalPlayer.play(idx>=0? idx:0, list, 'drop-zone');
  const icon = document.getElementById('dtPlayIcon'); if(icon) icon.className = 'fa-solid fa-pause';
}
function togglePlay(){
  if(!activeBeat) return;
  const audio = window.__DOPE_TONE_AUDIO__;
  const icon = document.getElementById('dtPlayIcon');
  if(audio &&!audio.paused){ if(window.globalPlayer) window.globalPlayer.toggle(); else audio.pause(); if(icon) icon.className='fa-solid fa-play'; }
  else{ playBeatLinked(activeBeat); if(icon) icon.className='fa-solid fa-pause'; }
}
window.openBeatCard = (beatId, dropId) => {
  ensureModal();
  let beats = []; let drop = null;
  if(dropId){ drop = window._dropsCache?.find(d=>d.id===dropId); if(drop) beats = drop.promotion?.items || []; }
  if(!beats.length){ drop = window._dropsCache?.find(d=>(d.promotion?.items||[]).some(x=>String(x.id)===String(beatId))); if(drop) beats = drop.promotion?.items || []; }
  if(!beats.length){ if(window.__CURRENT_BEAT__) beats=[window.__CURRENT_BEAT__]; }
  if(!beats.length) return;
  activeBeatsList = beats;
  const activeIndex = beats.findIndex(x=>String(x.id)===String(beatId));
  const b = beats[activeIndex>=0?activeIndex:0];
  activeBeat = b;
  document.getElementById('dtBigCover').src = b.cover_url;
  document.getElementById('dtBigTitle').textContent = b.title;
  document.getElementById('dtBigMeta').innerHTML = `
    <span style="background:#232323;padding:4px 8px;border-radius:99px">🎵 ${b.genre||'Beat'}</span>
    <span style="background:#232323;padding:4px 8px;border-radius:99px">${b.bpm? b.bpm+' BPM' : 'DopeTone Exclusive'}</span>
    ${b.price? `<span style="background:#0d3bff;color:#fff;padding:4px 10px;border-radius:99px;font-weight:800">$${b.price}</span>` : '<span style="background:#fff;color:#000;padding:4px 10px;border-radius:99px;font-weight:800">NEW DROP</span>'}
  `;
  const playBtn = document.getElementById('dtBigPlay');
  const icon = document.getElementById('dtPlayIcon');
  const isPlaying = window.__DOPE_TONE_AUDIO__ &&!window.__DOPE_TONE_AUDIO__.paused && window.__CURRENT_BEAT__ && String(window.__CURRENT_BEAT__.id)===String(b.id);
  if(icon) icon.className = isPlaying? 'fa-solid fa-pause' : 'fa-solid fa-play';
  playBtn.onclick = () => togglePlay();
  const restEl = document.getElementById('dtRest');
  if(beats.length<=1){ restEl.innerHTML=''; restEl.style.display='none'; }
  else{
    restEl.style.display='flex';
    // ONLY CHANGE HERE: border blue instead of green #1ED760
    restEl.innerHTML = beats.map(x=>`<img src="${x.cover_url}" onclick="openBeatCard('${x.id}','${drop? drop.id : ''}')" style="width:60px;height:60px;border-radius:10px;object-fit:cover;cursor:pointer;flex-shrink:0;border:${String(x.id)===String(b.id)?'2px solid #0d3bff':'1px solid #333'}">`).join('');
  }
  document.getElementById('dtBeatModal').style.display='flex';
  if(!isPlaying) playBeatLinked(b);
};
window.closeBeatModal = () => { document.getElementById('dtBeatModal').style.display='none'; };

// ============ CHAT - BLUE RED DNA BUBBLES KEPT ============
function buildLayout(){
  if(!FEED||document.getElementById('dtDropsWrap')) return;
  FEED.innerHTML=`
    <style>
      #dtChatList{scrollbar-width:none!important;-ms-overflow-style:none!important} #dtChatList::-webkit-scrollbar{display:none!important}
      #dtChatList{scroll-behavior:smooth}
    </style>
    <div id="dtDropsWrap" style="display:flex;flex-direction:column;gap:12px;margin-bottom:14px"></div>
    <div id="dtChatWrap" style="margin-top:14px;background:#0a0a0a;border:1px solid #1e1e2e;border-radius:20px;overflow:hidden;max-height:500px;transition:all .6s cubic-bezier(.22,1,.36,1);transform:translateY(0);opacity:1">
      <div style="padding:10px 14px;background:#0a0a0f;border-bottom:1px solid #1e1e2e;display:flex;align-items:center;gap:8px"><div style="width:7px;height:7px;background:#0d3bff;border-radius:50%;box-shadow:0 0 8px #0d3bff"></div><span style="color:#fff;font-size:10px;font-weight:800">LIVE CHAT • Dope Tone Creators</span><span id="dtTypingHead" style="margin-left:auto;font-size:9px;color:#0d3bff;display:none">typing...</span></div>
      <div id="dtChatList" style="height:320px;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background-image:url('images/chat-bg.png');background-size:cover;background-position:center;background-color:#000"></div>
      <div id="dtTypingIndicator" style="display:none;padding:0 14px 10px;background:rgba(0,0,0,.75)"><div style="display:flex;gap:8px;align-items:center"><div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#0d3bff,#ff1a2e);display:flex;align-items:center;justify-content:center;color:#fff;font-size:7px;font-weight:800">CR</div><div style="background:#15152a;border:1px solid #0d3bff33;padding:10px 14px;border-radius:18px">●●</div></div></div>
    </div>`;
}
function showChatSmooth(){
  const w=document.getElementById('dtChatWrap'); if(!w) return;
  w.style.maxHeight='500px'; w.style.opacity='1'; w.style.transform='translateY(0)'; w.style.pointerEvents='auto';
  chatVisible=true; chatActiveUntil=Date.now()+60000;
  // SLIDE TO SCREEN VIEW - THIS WAS MISSING
  setTimeout(()=>{ w.scrollIntoView({behavior:'smooth', block:'center'}); scrollToLatest(); }, 100);
}
function hideChatSmooth(){
  const w=document.getElementById('dtChatWrap'); if(!w||!chatVisible) return;
  w.style.maxHeight='0px'; w.style.opacity='0'; w.style.transform='translateY(-20px)'; w.style.pointerEvents='none'; chatVisible=false;
  // SLIDE BACK TO POSTS
  const posts=document.getElementById('dtDropsWrap'); if(posts) posts.scrollIntoView({behavior:'smooth', block:'start'});
}
function scrollToLatest(){ const l=document.getElementById('dtChatList'); if(l) l.scrollTo({top:l.scrollHeight, behavior:'smooth'}); }
function showTyping(s=true){ const el=document.getElementById('dtTypingIndicator'); const h=document.getElementById('dtTypingHead'); if(el) el.style.display=s?'block':'none'; if(h) h.style.display=s?'block':'none'; if(s) scrollToLatest(); }

function appendBubble(c,isTemp=false){
  const list=document.getElementById('dtChatList'); if(!list) return;
  if(!isTemp && lastChatIds.has(c.id)) return;
  const {uid}=getRealUser();
  if(c.is_admin==1 && c.reply_to_user_id && String(c.reply_to_user_id)!==String(uid)) return;
  if(!isTemp && c.is_admin!=1 && c.message===lastSentContent){ document.querySelectorAll('#dtChatList [data-id^="tmp-"]').forEach(el=>{ if(el.textContent.includes(c.message.substring(0,8))) el.remove(); }); }
  if(!isTemp) lastChatIds.add(c.id);
  const isCreator=c.is_admin==1; if(isCreator) showTyping(false);
  const div=document.createElement('div'); div.dataset.id=c.id;
  if(isCreator){
    div.style.cssText='align-self:flex-start;max-width:80%;display:flex;gap:8px';
    div.innerHTML=`<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#0d3bff,#ff1a2e);display:flex;align-items:center;justify-content:center;color:#fff;font-size:7px;font-weight:800">CR</div><div style="background:linear-gradient(135deg,#15152a,#0f0f1e);border:1px solid #0d3bff44;border-left:2px solid #0d3bff;color:#e6e9ff;padding:10px 14px;border-radius:18px 18px 18px 4px;font-size:13px"><div style="font-size:7px;color:#6d7bff;font-weight:800;margin-bottom:3px">Creators • private</div>${escapeHtml(c.message)}<div style="font-size:9px;color:#555;margin-top:5px">${new Date(c.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div></div>`;
  }else{
    div.style.cssText='align-self:flex-end;max-width:80%;display:flex;gap:8px;flex-direction:row-reverse';
    div.innerHTML=`<div style="width:28px;height:28px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;color:#000;font-size:9px;font-weight:900">${escapeHtml((c.user_name||'F')[0].toUpperCase())}</div><div style="background:linear-gradient(135deg,#0d3bff,#2a3fff);border:1px solid #3a5bff;border-right:2px solid #ff1a2e;color:#fff;padding:10px 14px;border-radius:18px 18px 4px 18px;font-size:13px;font-weight:600;box-shadow:0 4px 20px rgba(13,59,255,.45)">${escapeHtml(c.message)}<div style="font-size:9px;color:#b9c4ff;text-align:right;margin-top:4px">${new Date(c.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} ✓✓</div></div>`;
  }
  list.appendChild(div); scrollToLatest();
  if(isCreator && String(c.reply_to_user_id)===String(uid)) showChatSmooth();
}

async function sendChat(){
  if(isSending) return; const t=INPUT?.value.trim(); if(!t) return; if(t===lastSentContent && (Date.now()-lastSentTime)<3000) return;
  isSending=true; const {name,email,uid}=getRealUser(); INPUT.value=''; lastSentContent=t; lastSentTime=Date.now();
  appendBubble({id:'tmp-'+Date.now(),user_name:name,user_id:uid,message:t,is_admin:0,created_at:new Date().toISOString()},true);
  showChatSmooth(); scrollToLatest(); // SCROLL TO LAST
  if(SEND) SEND.disabled=true;
  try{ await fetch(`${DROP_API}/api/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_name:name,user_id:uid,email,message:t,is_admin:0})}); }catch{}
  if(SEND) SEND.disabled=false; isSending=false; setTimeout(scrollToLatest, 300);
}

// ============ POSTS - EXACTLY AS RESTORED - ONLY GREEN->BLUE ============
async function loadDrops() {
  if (!FEED) return;
  try {
    const res = await fetch(`${DROP_API}/api/notices?t=${Date.now()}`, {cache:'no-store'});
    const drops = await res.json();
    const hash=JSON.stringify(drops.map(d=>d.id)); if(hash===dropsHash) return; dropsHash=hash;
    window._dropsCache = drops;
    const wrap=document.getElementById('dtDropsWrap'); if(!wrap) return;
    if (!drops.length) { wrap.innerHTML=`<div style="padding:50px;text-align:center;background:#121212;border-radius:16px;border:1px solid #232323;color:#555">No drops</div>`; return; }
    wrap.innerHTML = drops.map(n => {
      const beats = n.promotion?.items || [];
      const isPromo = beats.length>0;
      let promoHTML = '';
      if (isPromo) {
        const big = beats[0]; const small = beats.slice(1);
        promoHTML = `
          <div style="margin-top:14px;background:#121212;border:1px solid #282828;border-radius:16px;overflow:hidden">
            <div style="padding:10px 14px;background:#181818;border-bottom:1px solid #282828;display:flex;align-items:center;gap:8px">
              <span style="width:7px;height:7px;background:#0d3bff;border-radius:50%;box-shadow:0 0 8px #0d3bff"></span>
              <span style="font-size:11px;color:#fff;font-weight:800;letter-spacing:.5px">${beats.length} BEATS DROP</span>
            </div>
            <div style="padding:14px;display:flex;gap:14px">
              <img src="${big.cover_url}" onclick="openBeatCard('${big.id}','${n.id}')" style="width:140px;height:140px;border-radius:14px;object-fit:cover;cursor:pointer;border:1px solid #282828;flex-shrink:0">
              <div style="flex:1;min-width:0">
                <div style="color:#fff;font-size:16px;font-weight:800;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${big.title}</div>
                <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
                  <span style="background:#232323;color:#b3b3b3;font-size:10px;padding:4px 8px;border-radius:99px">DOPE TONE</span>
                  <span style="background:#232323;color:#b3b3b3;font-size:10px;padding:4px 8px;border-radius:99px">${big.genre||'Trap / Drill'}</span>
                  ${big.price? `<span style="background:#0d3bff;color:#fff;font-size:10px;font-weight:800;padding:4px 8px;border-radius:99px">$${big.price}</span>` : ''}
                </div>
                <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
                  ${small.map(b=>`<img src="${b.cover_url}" onclick="openBeatCard('${b.id}','${n.id}')" title="${b.title}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;cursor:pointer;border:1px solid #282828">`).join('')}
                </div>
              </div>
            </div>
          </div>`;
      }
      let mediaHTML = '';
      if (!isPromo && n.media?.url) {
        if (n.media.type==='image') mediaHTML = `<img src="${n.media.url}" style="width:100%;border-radius:16px;margin-top:14px;border:1px solid #282828;max-height:500px;object-fit:cover">`;
        else mediaHTML = `<video src="${n.media.url}" controls style="width:100%;border-radius:16px;margin-top:14px;border:1px solid #282828"></video>`;
      }
      return `
        <div style="background:#121212;border:1px solid #282828;border-radius:20px;padding:16px;margin-bottom:14px">
          <div style="display:flex;gap:10px;align-items:center">
            <div style="width:32px;height:32px;border-radius:50%;background:#000;border:1px solid #333;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:11px">DT</div>
            <div><b style="color:#fff;font-size:13px">DopeTone</b> <span style="color:#888;font-size:11px;margin-left:6px">${new Date(n.created_at||Date.now()).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span></div>
          </div>
          ${n.content? `<div style="color:#e8e8e8;font-size:14px;margin-top:12px;white-space:pre-wrap;line-height:1.5">${escapeHtml(n.content)}</div>`:''}
          ${promoHTML}
          ${mediaHTML}
        </div>`;
    }).join('');
  } catch(e){}
}
async function pollChat(){ try{ const {uid}=getRealUser(); const r=await fetch(`${DROP_API}/api/chat?uid=${uid}&t=${Date.now()}`,{cache:'no-store'}); const chats=await r.json(); chats.forEach(c=>appendBubble(c)); }catch{} }

buildLayout(); loadDrops(); pollChat();
if(INPUT){
  INPUT.addEventListener('focus', ()=>{ showChatSmooth(); setTimeout(scrollToLatest, 400); }, {passive:true});
  INPUT.oninput=()=>{ chatActiveUntil=Date.now()+60000; if(!chatVisible) showChatSmooth(); };
  INPUT.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); sendChat(); } };
}
if(SEND) SEND.onclick=()=>sendChat();
setInterval(loadDrops,10000); setInterval(pollChat,3000);
setInterval(()=>{ if(Date.now()>chatActiveUntil&&chatVisible) hideChatSmooth(); },1000);
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeBeatModal(); });
