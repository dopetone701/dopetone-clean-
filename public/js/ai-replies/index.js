// public/js/ai-replies/index.js - v5 PRO MASTER ROUTER - 30 LINES, CALLS IN ORDER
import { getGreetingPro } from './greetings-pro.js';
import { detectIntentPro } from './intent-detector-pro.js';
import { fetchBeatsPro } from './beat-engine-pro.js';
import { buildResponsePro } from './response-builder-pro.js';
import { saveMemoryPro, shouldGreetPro, getMemoryPro } from './conversation-memory-pro.js';

export async function getAIReplyPro(userText=""){
  // 1. Parse intent + entities (true AI)
  let parsed = detectIntentPro(userText);
  
  // 2. Greetings first (10hr memory)
  let greet = getGreetingPro(parsed);
  if(greet && shouldGreetPro() && !parsed.entities.genre && parsed.intent!=='need_beat'){
    return greet;
  }

  // 3. Fetch beats if needed
  let beatsResult = { beats:[], fallback:false };
  if(parsed.intent==='need_beat' || parsed.intent==='what_we_have' || parsed.entities.genre){
    let mem = getMemoryPro();
    let genre = parsed.entities.genre || mem.genre || 'trap';
    parsed.entities.genre = genre;
    beatsResult = await fetchBeatsPro({...parsed.entities, page:0, limit:3});
    if(beatsResult.beats.length){
      saveMemoryPro({genre, mood:parsed.entities.mood, bpm:parsed.entities.bpm, key:parsed.entities.key, price_max:parsed.entities.price_max, beats:beatsResult.beats});
      // Trigger frontend render same as posts
      window.dispatchEvent(new CustomEvent('ai_top3', { detail: { beats: beatsResult.beats, genre } }));
    }
  } else {
    saveMemoryPro({}); // update lastChat
  }

  // 4. Build short sales response
  let response = buildResponsePro({intent:parsed.intent, entities:parsed.entities, beatsResult});
  return response;
}

// Legacy compatibility for notice-board.js
export async function getAIReply(userText){
  let r = await getAIReplyPro(userText);
  return `${r.text}\n\n${r.options.map(o=>`[${o}]`).join(' ')}`;
}

if(typeof window!=='undefined'){
  window.DopeAI_Pro = { getAIReplyPro, getAIReply };
  console.log("DopeAI v5 PRO MASTER READY - 6 files, embedding intent, 10hr memory, never empty, drives to buy");
}
