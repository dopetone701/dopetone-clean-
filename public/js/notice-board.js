// notice-board-v5-pro.js - FIXED - AI RENDERS EXACT PST STYLE + PLAYABLE + DISAPPEAR ON SELECT
const DROP_API = "https://dt-drop-zone-api.dopetone701.workers.dev";
const AI_API_URL = "https://ai-api.dopetone701.workers.dev";
const FEED = document.getElementById('noticeBoardFeed');
const INPUT = document.getElementById('noticeBoardInput');
const SEND = document.getElementById('noticeBoardSend');
if (INPUT) { INPUT.placeholder = "Try: I need EDM 145 bpm Cm or what you have? 💬"; INPUT.style.fontSize="16px"; }
if (SEND) SEND.style.display='flex';

let activeBeat = null, activeBeatsList = [], lastChatIds = new Set(), dropsHash = '', chatVisible = false, chatActiveUntil = 0, lastSentContent='', lastSentTime=0, isSending=false;
// USER-ONLY 1HR HIDE - DB SAFE
const TTL = 60*60*1000;
const isExpired = (t) => Date.now() - new Date(t||Date.now()).getTime() > TTL;
const ttlLeft = (t) => Math.max(0, TTL - (Date.now() - new Date(t||Date.now()).getTime()));
const hideUserOnly = (el) => {
  if(!el || !el.parentElement) return;
  el.style.transition='all .4s ease'; el.style.opacity='0'; el.style.transform='translateY(-10px)';
  setTimeout(()=>el.remove(),400);
};

window._dropsCache = window._dropsCache || [];
window._aiDropsCache = []; // virtual drops for AI beats

function getRealUser(){
  try{ let u=JSON.parse(localStorage.getItem('dope_user')||'null'); const email=u?.email||localStorage.getItem('dt_email')||''; const name=u?.name||'Fan'; let uid=localStorage.getItem('dt_uid'); if(!uid){uid='uid_'+Date.now(); localStorage.setItem('dt_uid',uid);} return {name,email,uid}; }catch{ return {name:'Fan',email:'',uid:localStorage.getItem('dt_uid')||'anon'}; }
}
function escapeHtml(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
(function(){ const m=document.querySelector('meta[name=viewport]'); if(m) m.content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"; })();

// ============ MODAL - SAME AS PST - PLAYABLE ============
function ensureModal() {
  if (document.getElementById('dtBeatModal')) return;
  const modal = document.createElement('div');
  modal.id = 'dtBeatModal';
  modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.88);backdrop-filter:blur(12px);align-items:center;justify-content:center;padding:16px';
  modal.innerHTML = `
    <div style="width:100%;max-width:420px;background:#121212;border:1px solid #282828;border-radius:24px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.9)">
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
  const list = activeBeatsList.map(b=>({id:b.id, title:b.title, cover_url:b.cover_url||b.cover, mp3_url:b.mp3_url||b.audio_url, wav_url:b.wav_url, bpm:b.bpm, key:b.key, genre:b.genre, price:b.display_price||b.basic_price||b.price}));
  const idx = list.findIndex(b=> String(b.id)===String(beat.id));
  if(window.globalPlayer && window.globalPlayer.play) window.globalPlayer.play(idx>=0? idx:0, list, 'drop-zone');
  else if(window.__DOPE_TONE_AUDIO__){ // fallback
    const audio = window.__DOPE_TONE_AUDIO__;
    audio.src = beat.mp3_url || beat.audio_url;
    audio.play();
  }
  const icon = document.getElementById('dtPlayIcon'); if(icon) icon.className = 'fa-solid fa-pause';
  window.__CURRENT_BEAT__ = beat;
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
  // Check real drops
  if(dropId){ drop = window._dropsCache?.find(d=>d.id===dropId); if(drop) beats = drop.promotion?.items || []; }
  if(!beats.length){ drop = window._dropsCache?.find(d=>(d.promotion?.items||[]).some(x=>String(x.id)===String(beatId))); if(drop) beats = drop.promotion?.items || []; }
  // Check AI virtual drops
  if(!beats.length){ drop = window._aiDropsCache?.find(d=>(d.promotion?.items||[]).some(x=>String(x.id)===String(beatId))); if(drop) beats = drop.promotion?.items || []; }
  if(!beats.length){ if(window.__CURRENT_BEAT__ && String(window.__CURRENT_BEAT__.id)===String(beatId)) beats=[window.__CURRENT_BEAT__]; }
  // If single AI beat clicked from recommend wrap, use activeBeatsList
  if(!beats.length && activeBeatsList.length){ beats = activeBeatsList; }
  if(!beats.length) return;
  activeBeatsList = beats;
  const activeIndex = beats.findIndex(x=>String(x.id)===String(beatId));
  const b = beats[activeIndex>=0?activeIndex:0];
  activeBeat = b;
  document.getElementById('dtBigCover').src = b.cover_url || b.cover;
  document.getElementById('dtBigTitle').textContent = b.title;
  document.getElementById('dtBigMeta').innerHTML = `
    <span style="background:#232323;padding:4px 8px;border-radius:99px">🎵 ${b.genre||'Beat'} ${b.mood? '• '+b.mood : ''}</span>
    <span style="background:#232323;padding:4px 8px;border-radius:99px">${b.bpm? b.bpm+' BPM' : 'DopeTone'} ${b.key? '• '+b.key : ''}</span>
    ${b.display_price||b.basic_price||b.price? `<span style="background:#0d3bff;color:#fff;padding:4px 10px;border-radius:99px;font-weight:800">$${b.display_price||b.basic_price||b.price}</span>` : '<span style="background:#fff;color:#000;padding:4px 10px;border-radius:99px;font-weight:800">NEW DROP</span>'}
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
    restEl.innerHTML = beats.map(x=>`<img src="${x.cover_url||x.cover}" onclick="openBeatCard('${x.id}','${drop? drop.id : ''}')" style="width:60px;height:60px;border-radius:10px;object-fit:cover;cursor:pointer;flex-shrink:0;border:${String(x.id)===String(b.id)?'2px solid #0d3bff':'1px solid #333'}">`).join('');
  }
  document.getElementById('dtBeatModal').style.display='flex';
  if(!isPlaying) playBeatLinked(b);
};
window.closeBeatModal = () => { document.getElementById('dtBeatModal').style.display='none'; };

// ============ CHAT LAYOUT ============
function buildLayout(){
  if(!FEED||document.getElementById('dtDropsWrap')) return;
  FEED.innerHTML=`
    <style>
   .ai-opt-btn:active{ transform:scale(.95); background:#0d3bff!important }
    #dtChatList{scrollbar-width:none!important;-ms-overflow-style:none!important} #dtChatList::-webkit-scrollbar{display:none!important}
    #dtChatList{scroll-behavior:smooth}
    </style>
    <div id="dtDropsWrap" style="display:flex;flex-direction:column;gap:12px;margin-bottom:14px"></div>
    <div id="dtChatWrap" style="margin-top:14px;background:#0a0a0a;border:1px solid #1e1e2e;border-radius:20px;overflow:hidden;max-height:0px;opacity:0;transform:translateY(-20px);pointer-events:none;transition:all.6s cubic-bezier(.22,1,.36,1)">
      <div style="padding:10px 14px;background:#0a0a0f;border-bottom:1px solid #1e1e2e;display:flex;align-items:center;gap:8px"><div style="width:7px;height:7px;background:#0d3bff;border-radius:50%;box-shadow:0 0 8px #0d3bff"></div><span style="color:#fff;font-size:10px;font-weight:800">LIVE CHAT • Dope Tone Creators • v5 PRO</span><span id="dtTypingHead" style="margin-left:auto;font-size:9px;color:#0d3bff;display:none">typing...</span></div>
      <div id="dtChatList" style="height:340px;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background-image:url('images/chat-bg.png');background-size:cover;background-position:center;background-color:#000"></div>
      <div id="dtTypingIndicator" style="display:none;padding:0 14px 10px;background:rgba(0,0,0,.75)"><div style="display:flex;gap:8px;align-items:center"><div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#0d3bff,#ff1a2e);display:flex;align-items:center;justify-content:center;color:#fff;font-size:7px;font-weight:800">CR</div><div style="background:#15152a;border:1px solid #0d3bff33;padding:10px 14px;border-radius:18px">●●</div></div></div>
    </div>
    <div id="dtRecommendWrap" style="margin-top:12px;display:none"></div>`;
}

loadProAI();


function showChatSmooth(){
  const w=document.getElementById('dtChatWrap'); if(!w) return;
  if(w.classList.contains('dt-fs-active')){
    chatVisible=true; chatActiveUntil=Date.now()+60000; return;
  }
  w.style.maxHeight='520px'; w.style.opacity='1'; w.style.transform='translateY(0)'; w.style.pointerEvents='auto';
  chatVisible=true; chatActiveUntil=Date.now()+60000;
  setTimeout(()=>{ const list=document.getElementById('dtChatList'); if(list) list.scrollTo({top:list.scrollHeight, behavior:'smooth'}); }, 100);
}
function hideChatSmooth(){
  const w=document.getElementById('dtChatWrap'); if(!w||!chatVisible) return;
  if(w.classList.contains('dt-fs-active')) return;
  if(Date.now() < chatActiveUntil) return;
  w.style.maxHeight='0px'; w.style.opacity='0'; w.style.transform='translateY(-20px)'; w.style.pointerEvents='none'; chatVisible=false;
}

function hideChatSmooth(){
  const w=document.getElementById('dtChatWrap'); if(!w||!chatVisible) return;
  w.style.maxHeight='0px'; w.style.opacity='0'; w.style.transform='translateY(-20px)'; w.style.pointerEvents='none'; chatVisible=false;
  const posts=document.getElementById('dtDropsWrap'); 
if(posts) posts.scrollTo({top:0, behavior:'smooth'});
}


function scrollToLatest(){ const l=document.getElementById('dtChatList'); if(l) l.scrollTo({top:l.scrollHeight, behavior:'smooth'}); }
function showTyping(s=true){ const el=document.getElementById('dtTypingIndicator'); const h=document.getElementById('dtTypingHead'); if(el) el.style.display=s?'block':'none'; if(h) h.style.display=s?'block':'none'; if(s) scrollToLatest(); }

function appendBubble(c,isTemp=false){
  if(isExpired(c.created_at)) return;
  const list=document.getElementById('dtChatList'); if(!list) return;
  if(!isTemp && lastChatIds.has(c.id)) return;
  const {uid}=getRealUser();
  if(c.is_admin==1 && c.reply_to_user_id && String(c.reply_to_user_id)!==String(uid)) return;
  if(!isTemp) lastChatIds.add(c.id);
  const isCreator=c.is_admin==1; if(isCreator) showTyping(false);
  const div=document.createElement('div'); 
  div.dataset.id=c.id; 
  div.dataset.ts=c.created_at; 
  div.className='dt-chat-item';
  if(isCreator){
    div.style.cssText='align-self:flex-start;max-width:85%;display:flex;gap:8px';
    div.innerHTML=`<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#0d3bff,#ff1a2e);display:flex;align-items:center;justify-content:center;color:#fff;font-size:7px;font-weight:800">CR</div><div style="background:linear-gradient(135deg,#15152a,#0f0f1e);border:1px solid #0d3bff44;border-left:2px solid #0d3bff;color:#e6e9ff;padding:10px 14px;border-radius:18px 18px 18px 4px;font-size:13px;white-space:pre-wrap;word-break:break-word"><div style="font-size:7px;color:#6d7bff;font-weight:800;margin-bottom:3px">Creators • private</div>${escapeHtml(c.message)}<div style="font-size:9px;color:#555;margin-top:5px">${new Date(c.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div></div>`;
  }else{
    div.style.cssText='align-self:flex-end;max-width:80%;display:flex;gap:8px;flex-direction:row-reverse';
    div.innerHTML=`<div style="width:28px;height:28px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;color:#000;font-size:9px;font-weight:900">${escapeHtml((c.user_name||'F')[0].toUpperCase())}</div><div style="background:linear-gradient(135deg,#0d3bff,#2a3fff);border:1px solid #3a5bff;border-right:2px solid #ff1a2e;color:#fff;padding:10px 14px;border-radius:18px 18px 4px 18px;font-size:13px;font-weight:600;box-shadow:0 4px 20px rgba(13,59,255,.45)">${escapeHtml(c.message)}<div style="font-size:9px;color:#b9c4ff;text-align:right;margin-top:4px">${new Date(c.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} ✓✓</div></div>`;
  }
  list.appendChild(div); 
  scrollToLatest();
  setTimeout(()=> hideUserOnly(div), ttlLeft(c.created_at));
  if(isCreator && String(c.reply_to_user_id)===String(uid)) showChatSmooth();
}



// ============ v5 PRO AI SYSTEM - PST STYLE RENDER ============
let proAIReady = false;
let proModules = {};

async function loadProAI(){
  if(proAIReady) return proModules;
  try{
    const [intentMod, beatMod, greetMod, respMod, memMod] = await Promise.all([
      import('./ai-replies/intent-detector-pro.js'),
      import('./ai-replies/beat-engine-pro.js'),
      import('./ai-replies/greetings-pro.js'),
      import('./ai-replies/response-builder-pro.js'),
      import('./ai-replies/conversation-memory-pro.js')
    ]);
    proModules = { intentMod, beatMod, greetMod, respMod, memMod };
    proAIReady = true;
    console.log('DopeAI v5 PRO modules loaded');
    return proModules;
  }catch(e){
    console.log('Pro AI load failed', e);
    return null;
  }
}

// === NEW - EXACT PST STYLE ===
function renderRecommendationsPro(beats, genre, fallback=false, entities={}){
  const wrap = document.getElementById('dtRecommendWrap');
  if(!wrap ||!beats.length) return;
  
  // Make beats playable - push to virtual cache + active list
  activeBeatsList = beats;
  const virtualDropId = 'ai-drop-'+Date.now();
  window._aiDropsCache.push({
    id: virtualDropId,
    promotion: { items: beats }
  });

  wrap.style.display='block';
  let fallbackHtml = '';// CAUTION REMOVED V6
  
  const big = beats[0];
  const small = beats.slice(1);
  
  // EXACT SAME AS loadDrops() PST STYLE - image 2
  wrap.innerHTML = `
    <div style="background:#121212;border:1px solid #282828;border-radius:20px;overflow:hidden">
      <div style="padding:10px 14px;background:#181818;border-bottom:1px solid #282828;display:flex;align-items:center;gap:8px;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="width:7px;height:7px;background:#0d3bff;border-radius:50%;box-shadow:0 0 8px #0d3bff"></span>
          <span style="font-size:11px;color:#fff;font-weight:800;letter-spacing:.5px">${beats.length} BEATS DROP • TOP 3 ${ (genre||'').toUpperCase() } • MATCH</span>
        </div>
        <button onclick="document.getElementById('dtRecommendWrap').style.display='none'" style="background:#232323;border:1px solid #333;color:#888;width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:12px">✕</button>
      </div>
      
      <div style="padding:14px;display:flex;gap:14px">
        <img src="${big.cover_url||big.cover||'images/default.png'}" onclick="openBeatCard('${big.id}','${virtualDropId}')" style="width:140px;height:140px;border-radius:14px;object-fit:cover;cursor:pointer;border:1px solid #282828;flex-shrink:0">
        <div style="flex:1;min-width:0">
          <div style="color:#fff;font-size:16px;font-weight:800;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(big.title)}</div>
          <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
              <span style="background:#232323;color:#b3b3b3;font-size:10px;padding:4px 8px;border-radius:99px">🎵 ${big.genre||genre||'Beat'} ${big.mood? '• '+big.mood : ''}</span>
              <span style="background:#232323;color:#b3b3b3;font-size:10px;padding:4px 8px;border-radius:99px">${big.bpm? big.bpm+' BPM' : 'DopeTone'} ${big.key? '• '+big.key : ''}</span>
              <span style="background:#0d3bff;color:#fff;font-size:10px;font-weight:800;padding:4px 10px;border-radius:99px">$${big.display_price||big.basic_price||big.price||'9.99'}</span>
              ${big.is_free? `<span style="background:#00c851;color:#fff;font-size:9px;font-weight:800;padding:3px 7px;border-radius:99px">FREE</span>`:''}
          </div>
          <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
              ${small.map(b=>`<img src="${b.cover_url||b.cover}" onclick="openBeatCard('${b.id}','${virtualDropId}')" title="${b.title}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;cursor:pointer;border:1px solid #282828">`).join('')}
          </div>
        </div>
      </div>
      
      <div style="padding:10px 14px;border-top:1px solid #1e1e2e;display:flex;flex-wrap:wrap;gap:8px" id="dtOptionsWrap"></div>
    </div>
  `;
  wrap.scrollIntoView({behavior:'smooth', block:'center'});
}

function renderOptionsPro(options){
  const wrap = document.getElementById('dtOptionsWrap');
  if(!wrap) return;
  wrap.innerHTML = (options||[]).map(o=>`<button class="ai-opt-btn" data-val="${o}" style="background:#1e1e2e;border:1px solid #0d3bff66;color:#fff;padding:7px 14px;border-radius:99px;font-size:11px;font-weight:700;cursor:pointer">${o}</button>`).join('');
}

if(!window._aiOptsBound){
  document.addEventListener('click', async (e)=>{
    if(!e.target.classList.contains('ai-opt-btn')) return;
    const val = e.target.dataset.val;
    // DISAPPEAR CANVAS AFTER SELECT - your request
    const recWrap = document.getElementById('dtRecommendWrap');
    if(recWrap) recWrap.style.display='none';
    const input = document.getElementById('noticeBoardInput');
    if(input) input.value = val;
    await sendChat();
  });
  window._aiOptsBound = true;
}

async function getGiantReply(userText){
  const t = (userText||'').toLowerCase().trim();
  let pro = await loadProAI();
  if(!pro){
    return "We got you. What beat you like? Select below 👇 [Trap 🔥] [R&B 💙] [EDM ⚡] [Afrobeat 🌍] [Amapiano 🪘]";
  }
  let parsed = pro.intentMod.detectIntentPro(userText);
  console.log('[V6 INFINITE] intent:', parsed.intent, 'entities:', parsed.entities, 'source:', parsed.source, 'page:', pro.memMod.getMemoryPro().page);

  let greet = pro.greetMod.getGreetingPro(parsed);
  if(greet && pro.memMod.shouldGreetPro() && !parsed.entities.genre && parsed.intent!=='need_beat' && parsed.intent!=='next_page' && parsed.intent!=='recent'){
    setTimeout(()=> renderOptionsPro(greet.options), 200);
    return greet.text;
  }

  let beatsResult = { beats:[], fallback:false };
  let shouldFetch = ['need_beat','what_we_have','pricing','next_page','buy_intent','recent'].includes(parsed.intent) || parsed.entities.genre || parsed.entities.q;

  if(shouldFetch){
    let mem = pro.memMod.getMemoryPro();
    let genre = parsed.entities.genre || mem.genre || (parsed.intent==='recent'? null : 'trap');
    if(genre) parsed.entities.genre = genre;

    let page = 0;
    if(parsed.intent==='next_page'){
      page = (mem.page||0) + 1;
      pro.memMod.saveMemoryPro({page: page});
    } else if(parsed.intent==='recent'){
      page = 0;
      pro.memMod.saveMemoryPro({page:0});
    } else {
      if(genre && genre!==mem.genre) page = 0;
      else page = mem.page||0;
      if(parsed.intent!=='next_page') pro.memMod.saveMemoryPro({page:0});
    }

    beatsResult = await pro.beatMod.fetchBeatsPro({...parsed.entities, page: page, limit:3, intent: parsed.intent});
    
    if(beatsResult.beats.length){
      pro.memMod.saveMemoryPro({
        genre, 
        mood:parsed.entities.mood||mem.mood, 
        bpm:parsed.entities.bpm||mem.bpm, 
        key:parsed.entities.key||mem.key, 
        price_max:parsed.entities.price_max||mem.price_max, 
        beats:beatsResult.beats,
        lastUserText: userText,
        intent: parsed.intent
      });
      window.dispatchEvent(new CustomEvent('ai_top3', { detail: { beats: beatsResult.beats, genre } }));
      renderRecommendationsPro(beatsResult.beats, genre||'recent', beatsResult.fallback, parsed.entities);
    } else if(parsed.intent==='next_page'){
      pro.memMod.saveMemoryPro({page:0});
    }
  } else {
    pro.memMod.saveMemoryPro({lastUserText:userText, intent:parsed.intent});
  }

  let resp = pro.respMod.buildResponsePro({intent: parsed.intent, entities: parsed.entities, beatsResult});
  setTimeout(()=> renderOptionsPro(resp.options), 300);

  // V6 INFINITE LEARNING - NEVER FORGET
  try{
    fetch(`${AI_API_URL}/api/learn`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        uid: localStorage.getItem('dt_uid')||'anon',
        user_text: userText,
        intent: parsed.intent,
        genre: parsed.entities.genre||beatsResult.genre||'',
        mood: parsed.entities.mood||'',
        bpm: parsed.entities.bpm||'',
        key: parsed.entities.key||'',
        price_max: parsed.entities.price_max||'',
        q: parsed.entities.q||'',
        response: resp.text,
        beats: beatsResult.beats
      })
    }).then(r=>r.json()).then(d=> console.log('[V6 LEARNED]', d)).catch(()=>{});
  }catch{}

  return resp.text;
}


async function showAutoReply(userText){
  const {uid}=getRealUser();
  showTyping(true);
  const wrap = document.getElementById('dtChatWrap');
  const list = document.getElementById('dtChatList');
  if(wrap) wrap.scrollIntoView({behavior:'smooth', block:'center'});

  const msg = await getGiantReply(userText || lastSentContent);
  
  // FAST - 200ms only
  setTimeout(()=>{
    showTyping(false);
    appendBubble({id:'auto-'+Date.now(), user_name:'Dope Tone Creators', user_id:'admin', message:msg, is_admin:1, reply_to_user_id:uid, created_at:new Date().toISOString() });
    if(list) list.scrollTo({top:list.scrollHeight, behavior:'smooth'});
  }, 200);
}

async function sendChat(){
  if(isSending) return;
  const t=INPUT?.value.trim();
  if(!t) return;
  if(t===lastSentContent && (Date.now()-lastSentTime)<2000) return;
  isSending=true;
  const {name,email,uid}=getRealUser();
  INPUT.value='';
  const fsClone = document.getElementById('dtFsInputClone');
  if(fsClone) fsClone.value = '';
  lastSentContent=t;
  lastSentTime=Date.now();
  appendBubble({id:'tmp-'+Date.now(),user_name:name,user_id:uid,message:t,is_admin:0,created_at:new Date().toISOString()},true);
  showChatSmooth();
  const wrap = document.getElementById('dtChatWrap');
  const list = document.getElementById('dtChatList');
  if(wrap) wrap.scrollIntoView({behavior:'smooth', block:'start'});
  if(list) list.scrollTo({top:list.scrollHeight, behavior:'smooth'});

  if(SEND) SEND.disabled=true;
  try{ await fetch(`${DROP_API}/api/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_name:name,user_id:uid,email,message:t,is_admin:0})}); }catch{}
  if(SEND) SEND.disabled=false;
  isSending=false;
  
  // FAST - no 500ms wait
  pollChat();
  showAutoReply(t);
}


async function loadDrops() {
  if (!FEED) return;
  try {
    const res = await fetch(`${DROP_API}/api/notices?t=${Date.now()}`,{cache:'no-store'});
    const drops = await res.json();
    const hash=JSON.stringify(drops.map(d=>d.id)); if(hash===dropsHash) return; dropsHash=hash;
    window._dropsCache = drops;
    const wrap=document.getElementById('dtDropsWrap'); if(!wrap) return;
    if (!drops.length) { wrap.innerHTML=`<div style="padding:50px;text-align:center;background:#121212;border-radius:16px;border:1px solid #232323;color:#555">No drops - be first to request! What beat you need? [Trap 🔥] [EDM ⚡] [Afrobeat 🌍]</div>`; return; }
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
              <span style="font-size:11px;color:#fff;font-weight:800;letter-spacing:.5px">${beats.length} BEATS DROP • TOP 3 MATCH</span>
            </div>
            <div style="padding:14px;display:flex;gap:14px">
              <img src="${big.cover_url||big.cover}" onclick="openBeatCard('${big.id}','${n.id}')" style="width:140px;height:140px;border-radius:14px;object-fit:cover;cursor:pointer;border:1px solid #282828;flex-shrink:0">
              <div style="flex:1;min-width:0">
                <div style="color:#fff;font-size:16px;font-weight:800;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${big.title}</div>
                <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
                  <span style="background:#232323;color:#b3b3b3;font-size:10px;padding:4px 8px;border-radius:99px">${big.genre||'Beat'} ${big.mood? '• '+big.mood : ''}</span>
                  <span style="background:#232323;color:#b3b3b3;font-size:10px;padding:4px 8px;border-radius:99px">${big.bpm? big.bpm+' BPM' : 'DopeTone'} ${big.key? '• '+big.key : ''}</span>
                  ${big.price||big.basic_price? `<span style="background:#0d3bff;color:#fff;font-size:10px;font-weight:800;padding:4px 8px;border-radius:99px">$${big.display_price||big.basic_price||big.price}</span>` : ''}
                </div>
                <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
                  ${small.map(b=>`<img src="${b.cover_url||b.cover}" onclick="openBeatCard('${b.id}','${n.id}')" title="${b.title}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;cursor:pointer;border:1px solid #282828">`).join('')}
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
  } catch(e){ console.log('drops error', e); }
}


async function pollChat(){ 
  try{ 
    const {uid}=getRealUser(); 
    const r=await fetch(`${DROP_API}/api/chat?uid=${uid}&t=${Date.now()}`,{cache:'no-store'}); 
    let chats=await r.json(); 
    // ONLY AI replies from server - your own messages stay local only (DB still saves)
    chats.filter(c=> c.is_admin==1 && !isExpired(c.created_at)).forEach(c=>appendBubble(c)); 
  }catch{} 
}

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


setInterval(()=>{
  document.querySelectorAll('.dt-chat-item[data-ts]').forEach(el=>{
    if(isExpired(el.dataset.ts)) hideUserOnly(el);
  });
}, 20000);


// WHATSAPP MAGNET INPUT - mobile only
(function(){
  if(!window.visualViewport) return;
  const mobBar = ()=>document.getElementById('dtMobileInputBar');
  let lastH = window.visualViewport.height;
  window.visualViewport.addEventListener('resize', ()=>{
    const bar = mobBar(); if(!bar || !bar.classList.contains('active')) return;
    const diff = window.innerHeight - window.visualViewport.height;
    if(diff > 100){ // keyboard open
      bar.style.bottom = diff + 'px';
      const list = document.getElementById('dtChatList');
      if(list){ setTimeout(()=> list.scrollTo({top:list.scrollHeight, behavior:'smooth'}), 100); }
    } else {
      bar.style.bottom = '0px';
    }
    lastH = window.visualViewport.height;
  });
  window.visualViewport.addEventListener('scroll', ()=>{
    const bar = mobBar(); if(!bar) return;
    if(window.visualViewport.offsetTop > 0){
      bar.style.transform = `translateY(-${window.visualViewport.offsetTop}px)`;
    } else {
      bar.style.transform = 'translateY(0)';
    }
  });
})();







// ============ MOBILE FULLSCREEN FIX - SURGICAL ============
(function(){
  if(document.getElementById('dtMobileFSStyle')) return;
  const style = document.createElement('style');
  style.id='dtMobileFSStyle';
  style.textContent = `
  @media (max-width: 768px){
    body.dt-chat-fs { overflow:hidden !important; position:fixed; width:100%; }
    #dtChatWrap.dt-fs-active{
      position:fixed !important; inset:0 !important;
      z-index:9999999 !important;
      max-height:100dvh !important;
      height:100dvh !important;
      width:100% !important;
      margin:0 !important; border-radius:0 !important;
      display:flex !important; flex-direction:column !important;
      transform:none !important; opacity:1 !important;
      background:#000 !important;
    }
    #dtChatWrap.dt-fs-active #dtChatList{ flex:1 !important; height:auto !important; max-height:none !important; }
    #dtChatWrap.dt-fs-active #dtChatList{ padding-bottom:90px !important; }
    #dtMobileInputBar{
      position:fixed; left:0; right:0; bottom:0;
      z-index:10000000; background:#0a0a0a;
      border-top:1px solid #1e1e2e; padding:10px 10px calc(10px + env(safe-area-inset-bottom));
      display:none; gap:8px; align-items:center;
    }
    #dtMobileInputBar.active{ display:flex; }
    #dtMobileInputBar input{
      flex:1; background:#151515; border:1px solid #282828; color:#fff;
      padding:12px 14px; border-radius:99px; font-size:16px !important; outline:none;
    }
    #dtFsMinBtn{
      width:32px; height:32px; border-radius:50%; background:#1e1e1e; border:1px solid #333;
      color:#fff; display:flex; align-items:center; justify-content:center;
      cursor:pointer; flex-shrink:0;
    }
  }
  `;
  document.head.appendChild(style);

  const isMobile = () => window.matchMedia('(max-width: 768px)').matches;
  let originalInputParent = null;
  let originalSendNext = null;
  let bodyTop = 0;

  function ensureFsUI(){
    const chatWrap = document.getElementById('dtChatWrap');
    if(!chatWrap) return;
    // add minimize btn to header
    let header = chatWrap.querySelector('div');
    if(header && !document.getElementById('dtFsMinBtn')){
      const minBtn = document.createElement('button');
      minBtn.id='dtFsMinBtn';
      minBtn.innerHTML='⌄';
      minBtn.style.cssText='margin-left:auto;background:#1e1e1e;border:1px solid #333;color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;display:none';
      minBtn.onclick = exitFS;
      header.appendChild(minBtn);
    }
    // create mobile bottom bar
    if(!document.getElementById('dtMobileInputBar')){
      const bar = document.createElement('div');
      bar.id='dtMobileInputBar';
      const cloneInput = document.createElement('input');
      cloneInput.id='dtFsInputClone';
      cloneInput.placeholder = INPUT?.placeholder || 'Message...';
      const minBtn2 = document.createElement('button');
      minBtn2.id='dtFsMinBtn2';
      minBtn2.innerHTML='✕';
      minBtn2.style.cssText='width:40px;height:40px;border-radius:50%;background:#232323;border:1px solid #333;color:#fff;cursor:pointer';
      minBtn2.onclick = exitFS;
      bar.appendChild(cloneInput);
      bar.appendChild(document.getElementById('noticeBoardSend') ? document.getElementById('noticeBoardSend').cloneNode(true) : Object.assign(document.createElement('button'),{textContent:'➤'}));
      bar.insertBefore(minBtn2, bar.firstChild);
      document.body.appendChild(bar);
      
      // sync clone -> real
      cloneInput.addEventListener('input', ()=>{ if(INPUT) INPUT.value = cloneInput.value; });
      cloneInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); if(INPUT) INPUT.value = cloneInput.value; sendChat(); setTimeout(()=>{ cloneInput.value=''; cloneInput.focus(); },100); } });
      bar.lastChild.onclick = ()=>{ if(INPUT) INPUT.value = cloneInput.value; sendChat(); cloneInput.value=''; cloneInput.focus(); };
    }
  }

  function enterFS(){
    if(!isMobile()) return;
    const chatWrap = document.getElementById('dtChatWrap');
    const mobBar = document.getElementById('dtMobileInputBar');
    if(!chatWrap) return;
    ensureFsUI();
    
    bodyTop = window.scrollY;
    document.body.classList.add('dt-chat-fs');
    document.body.style.top = `-${bodyTop}px`;
    
    chatWrap.classList.add('dt-fs-active');
    document.getElementById('dtFsMinBtn').style.display='flex';
    if(mobBar){
      mobBar.classList.add('active');
      const clone = document.getElementById('dtFsInputClone');
      if(clone){ clone.value = INPUT?.value || ''; setTimeout(()=>clone.focus(), 150); }
    }
    // hide original input row on mobile to avoid double
    if(INPUT?.parentElement) INPUT.parentElement.style.display='none';
    scrollToLatest();
  }

  function exitFS(){
    const chatWrap = document.getElementById('dtChatWrap');
    const mobBar = document.getElementById('dtMobileInputBar');
    document.body.classList.remove('dt-chat-fs');
    document.body.style.top='';
    window.scrollTo(0, bodyTop);
    if(chatWrap) chatWrap.classList.remove('dt-fs-active');
    if(mobBar) mobBar.classList.remove('active');
    if(INPUT?.parentElement) INPUT.parentElement.style.display='';
    const minBtn = document.getElementById('dtFsMinBtn');
    if(minBtn) minBtn.style.display='none';
  }

  // hook input focus
  const attach = () => {
    if(!INPUT) return;
    INPUT.addEventListener('focus', ()=>{ if(isMobile()) enterFS(); }, {passive:true});
    INPUT.addEventListener('click', ()=>{ if(isMobile()) enterFS(); }, {passive:true});
    // prevent your hideChatSmooth from collapsing it
    const origHide = window.hideChatSmooth || hideChatSmooth;
    window.hideChatSmooth = function(){ if(document.getElementById('dtChatWrap')?.classList.contains('dt-fs-active')) return; origHide(); };
  };

  const iv = setInterval(()=>{ if(document.getElementById('dtChatWrap') && INPUT){ clearInterval(iv); ensureFsUI(); attach(); } }, 500);
  window.addEventListener('resize', ()=>{ if(!isMobile()) exitFS(); });
  window.exitMobileChatFS = exitFS; // global for you
})();

console.log("DopeAI NOTICE BOARD v5 PRO PST STYLE - playable + disappear on select");
