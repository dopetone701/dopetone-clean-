// conversation-memory-pro.js - V6 INFINITE - 10HR + PAGE + VOCAB CACHE
const KEY = 'dt_pro_memory_v5';
const VOCAB_KEY = 'dt_vocab_cache';
export function getMemoryPro(){
  try{ 
    let m = JSON.parse(localStorage.getItem(KEY)||'{"lastChat":0,"genre":null,"mood":null,"bpm":null,"key":null,"price_max":null,"beats":[],"chatCount":0,"page":0}');
    if(m.page==null) m.page=0;
    return m;
  }catch{ return {lastChat:0,genre:null,beats:[],chatCount:0,page:0}; }
}
export function saveMemoryPro(o){
  let m = getMemoryPro();
  if(o.genre && o.genre!==m.genre){ m.page = 0; }
  if(o.pageIncrement){ m.page = (m.page||0) + o.pageIncrement; delete o.pageIncrement; }
  if(o.page!=null){ m.page = o.page; }
  Object.assign(m, o, {lastChat: Date.now(), chatCount: (m.chatCount||0)+1});
  localStorage.setItem(KEY, JSON.stringify(m));
  // Also cache vocab locally for instant next time
  try{
    if(o.genre && o.lastUserText){
      let vocab = JSON.parse(localStorage.getItem(VOCAB_KEY)||'{}');
      let words = o.lastUserText.toLowerCase().split(/\W+/).filter(w=>w.length>2);
      for(let w of words){ vocab[w] = {genre:o.genre, intent:o.intent||'need_beat', count:(vocab[w]?.count||0)+1}; }
      localStorage.setItem(VOCAB_KEY, JSON.stringify(vocab));
    }
  }catch{}
  try{
    fetch('https://ai-api.dopetone701.workers.dev/api/memory', {method:'POST', body: JSON.stringify({uid: localStorage.getItem('dt_uid')||'anon', ...m}), headers:{'Content-Type':'application/json'}}).catch(()=>{});
  }catch{}
}
export function getLastChatTime(){ return getMemoryPro().lastChat||0; }
export function shouldGreetPro(){
  const last = getLastChatTime();
  if(!last) return true;
  return (Date.now() - last) > 10*60*60*1000;
}
export function getLastGenrePro(){ return getMemoryPro().genre; }
export function getLastBeatsPro(){ return getMemoryPro().beats||[]; }
export function getPagePro(){ return getMemoryPro().page||0; }
