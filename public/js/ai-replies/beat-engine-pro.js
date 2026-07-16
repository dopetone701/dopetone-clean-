// beat-engine-pro.js - V6 INFINITE - SMART SEARCH + RECENT
const AI_API = "https://ai-api.dopetone701.workers.dev";

export async function fetchBeatsPro({genre, mood, bpm, key, q, type, price_max, page=0, limit=3, intent=''}){
  let offset = page*limit;
  
  async function callRecommend(params){
    try{
      let qs = new URLSearchParams();
      Object.entries(params).forEach(([k,v])=>{ if(v!=null && v!=='' && k!=='page') qs.set(k,v); });
      qs.set('limit', limit); qs.set('offset', offset); qs.set('t', Date.now());
      if(intent) qs.set('intent', intent);
      let res = await fetch(`${AI_API}/api/recommend?${qs.toString()}`, {cache:'no-store'});
      if(res.ok){
        let data = await res.json();
        return { beats: data.top3||data.beats||[], fallback: !!data.fallback, level: data.level||'exact' };
      }
    }catch(e){ console.log('rec err',e); }
    return { beats:[], fallback:true, level:'error' };
  }

  // V6: If intent is recent, hit /recent directly
  if(intent==='recent'){
    try{
      let r = await fetch(`${AI_API}/api/recent?limit=${limit}&offset=${offset}&t=${Date.now()}`, {cache:'no-store'});
      if(r.ok){ let d = await r.json(); if(d.top3?.length) return {beats:d.top3, fallback:false, level:'recent'}; }
    }catch{}
  }

  // V6: Try smart-search (memory + vocab) before normal chain
  if(q || genre){
    try{
      let searchQ = q || genre || '';
      let s = await fetch(`${AI_API}/api/smart-search?q=${encodeURIComponent(searchQ)}&t=${Date.now()}`, {cache:'no-store'});
      if(s.ok){
        let sd = await s.json();
        if(sd.found && sd.beats?.length){
          return {beats:sd.beats, fallback:false, level:'smart-'+sd.source, genre:sd.genre};
        }
      }
    }catch{}
  }

  let chains = [
    {genre, mood, bpm, key, q, type, price_max},
    {genre, mood, bpm, key, q, type},
    {genre, mood, q},
    {genre, mood},
    {genre},
    {q},
    {} // never empty
  ];
  for(let c of chains){
    if(!Object.values(c).some(v=>v)) { // empty chain = top plays
      let r = await callRecommend({limit, offset});
      if(r.beats.length) return r;
      continue;
    }
    let r = await callRecommend({...c, intent});
    if(r.beats.length) return r;
  }
  // local fallback
  try{
    let all = window.__ALL_BEATS__ || JSON.parse(localStorage.getItem('dt_beats_cache')||'[]');
    if(all.length){
      let f = [...all].sort((a,b)=>(b.play_count||b.plays||0)-(a.plays||0)).slice(offset, offset+limit);
      if(f.length) return { beats:f, fallback:true, level:'local' };
    }
  }catch{}
  return { beats:[], fallback:true, level:'empty' };
}
if(typeof window!=='undefined'){ window.DopeBeatEnginePro = { fetchBeatsPro }; }
