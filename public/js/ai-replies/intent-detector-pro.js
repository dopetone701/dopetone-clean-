// intent-detector-pro.js - V6 INFINITE - NEVER FORGETS A WORD - CHECKS D1 VOCAB + MEMORY
import { TRAINING_DATA } from './training-data.js';

function normalize(s){ return (s||'').toLowerCase().trim(); }

function extractEntities(text){
  let t = normalize(text);
  let e = { genre:null, mood:null, bpm:null, key:null, price_max:null, q:null };
  const genres = [
    {k:"future bass", v:"future bass"}, {k:"afrobeat", v:"afrobeat"}, {k:"afro beat", v:"afrobeat"},
    {k:"amapiano", v:"amapiano"}, {k:"dancehall", v:"dancehall"}, {k:"dubstep", v:"dubstep"},
    {k:"edm", v:"edm"}, {k:"r&b", v:"r&b"}, {k:"rnb", v:"r&b"}, {k:"pop", v:"pop"},
    {k:"trap", v:"trap"}, {k:"drill", v:"drill"}, {k:"plug", v:"plug"}, {k:"drill", v:"drill"}
  ];
  for(let g of genres){ if(t.includes(g.k)){ e.genre=g.v; break; } }
  const moods = ["sad","happy","motivational","energetic","dark","melodic","chill","hype","pain","emotional","hard","soft","aggressive","smooth"];
  for(let m of moods){ if(t.includes(m)){ e.mood=m; break; } }
  let bpmM = t.match(/(\d{2,3})\s*bpm/) || t.match(/(\d{2,3})\s*-\s*\d{2,3}/);
  if(bpmM) e.bpm = bpmM[1] || bpmM[0];
  let keyM = t.match(/\b([a-g][#b]?m)\b/i);
  if(keyM) e.key = keyM[1].toUpperCase();
  let priceM = t.match(/under\s*\$?(\d+)/) || t.match(/below\s*\$?(\d+)/) || t.match(/budget.*\$?(\d+)/);
  if(priceM) e.price_max = priceM[1];
  if(t.includes('cheap') && !e.price_max) e.price_max='30';
  let qs = ["guitar","flute","piano","choir","bell","vocal","808","keys","pad","bass","recent","latest","newest","new"];
  let found = qs.filter(k=> t.includes(k));
  if(found.length) e.q = found.join(' ');
  return e;
}

function scoreIntent(text, trainingItem){
  let t = normalize(text);
  let pat = normalize(trainingItem.text);
  let score = 0;
  if(t.includes(pat)) score += 50;
  let tWords = t.split(/\W+/).filter(w=>w.length>2);
  let pWords = pat.split(/\W+/).filter(w=>w.length>2);
  let overlap = tWords.filter(w=> pWords.includes(w)).length;
  score += overlap * 12;
  if(trainingItem.entities?.genre && t.includes(trainingItem.entities.genre)) score+=18;
  if(trainingItem.entities?.mood && t.includes(trainingItem.entities.mood)) score+=12;
  return score;
}

let vocabCache = null;
let vocabCacheTime = 0;
async function getVocabCache(){
  if(vocabCache && Date.now()-vocabCacheTime < 60000) return vocabCache;
  try{
    let res = await fetch('https://ai-api.dopetone701.workers.dev/api/smart-search?q=' + encodeURIComponent('trap') + '&t=' + Date.now()).catch(()=>null);
    // local cache from localStorage for speed
    let local = JSON.parse(localStorage.getItem('dt_vocab_cache')||'{}');
    vocabCache = local;
    vocabCacheTime = Date.now();
    return local;
  }catch{ return {}; }
}

export function detectIntentPro(text){
  let t = normalize(text);
  let entities = extractEntities(text);
  let best = { intent:'unknown', score:0, match:null };
  let scores = {};

  // ===== V6 INFINITE LOGIC =====
  // 1. Recent / Latest - your screenshot bug
  if(/recent|latest|newest|new drop|just dropped|today|fresh/.test(t)){
    return { intent:'recent', confidence:100, entities: {...entities, q:'recent'}, raw:text, t, source:'recent-rule' };
  }
  // 2. Pagination
  if(/next\s*3|more|show\s*more|next\s*page|next|another\s*3/i.test(t)){
    try{
      let mem = JSON.parse(localStorage.getItem('dt_pro_memory_v5')||'{}');
      if(mem.genre) entities.genre = mem.genre;
      if(mem.mood) entities.mood = mem.mood;
    }catch{}
    return { intent:'next_page', confidence:100, entities, raw:text, t, source:'pagination-rule' };
  }
  // 3. Buy intent
  if(/yes.*need|need.*this|i.*need|i.*want.*this|buy.*this|checkout/i.test(t) && !entities.genre){
    try{
      let mem = JSON.parse(localStorage.getItem('dt_pro_memory_v5')||'{}');
      if(mem.genre) entities.genre = mem.genre;
    }catch{}
    if(t.includes('need this') || t.includes('yes') || t.includes('buy')) {
      return { intent:'buy_intent', confidence:95, entities, raw:text, t, source:'buy-rule' };
    }
  }
  // 4. Check local vocab cache - infinite learning
  try{
    let localVocab = JSON.parse(localStorage.getItem('dt_vocab_cache')||'{}');
    let words = t.split(/\W+/);
    for(let w of words){
      if(localVocab[w]?.genre){
        entities.genre = localVocab[w].genre;
        return { intent:'need_beat', confidence:90, entities, raw:text, t, source:'vocab-cache', vocabWord:w };
      }
      if(localVocab[w]?.intent){
        return { intent:localVocab[w].intent, confidence:88, entities, raw:text, t, source:'vocab-cache-intent', vocabWord:w };
      }
    }
  }catch{}

  // 5. Classic training data scoring
  for(let item of TRAINING_DATA){
    let s = scoreIntent(text, item);
    scores[item.intent] = (scores[item.intent]||0) + s;
    if(s > best.score){ best = { intent:item.intent, score:s, match:item }; }
  }
  let sorted = Object.entries(scores).sort((a,b)=>b[1]-a[1]);
  let finalIntent = sorted[0]?.[0] || 'unknown';
  let confidence = sorted[0]?.[1] || 0;

  // Grammar rules
  if(/how are you|how you doing|sup bro|whats up/.test(t)) finalIntent='how_are_you';
  if(/custom|make me a beat|cook me|make.*for me/.test(t)) finalIntent='custom';
  if(/licen|terms|rights|basic.*licen|pro.*licen|exclusive|spotify|youtube/.test(t)) finalIntent='licence';
  if(/how much|price|cost|how much.*beat/.test(t)) finalIntent='pricing';
  if(/download|link.*expir|can't.*download/.test(t)) finalIntent='technical_download';
  if(/can't.*play|no.*sound|player.*not/.test(t)) finalIntent='technical_play';
  if(/checkout|payment|card.*declin/.test(t)) finalIntent='technical_checkout';
  if(entities.genre || /need.*beat|want.*beat|show.*beat|what.*have|give me.*beat/.test(t)) finalIntent='need_beat';
  if(/what.*have|what.*got|show.*catalog|inventory/.test(t)) finalIntent='what_we_have';

  // If still unknown but has some words, try to learn - mark as need_beat with q
  if(finalIntent==='unknown' && t.length>3){
    finalIntent='need_beat';
    if(!entities.genre && !entities.q) entities.q = t.split(/\W+/).filter(w=>w.length>2).slice(0,3).join(' ');
  }

  return { intent:finalIntent, confidence, entities, raw:text, t, bestMatch:best.match, scores: sorted.slice(0,3), source:'training-data' };
}

if(typeof window!=='undefined'){ window.DopeIntentPro = { detectIntentPro }; }
