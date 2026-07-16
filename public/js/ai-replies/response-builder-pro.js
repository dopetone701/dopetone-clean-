// response-builder-pro.js - V6 INFINITE - HANDLES RECENT + NEXT + LEARNS
export function buildResponsePro({intent, entities, beatsResult}){
 let beats = beatsResult?.beats||[];
 let fallback = beatsResult?.fallback;
 let genre = entities.genre || beatsResult?.genre || 'beat';
 let first = beats[0]||{};
 let bpmInfo = first.bpm? `${first.bpm} BPM` : (entities.bpm? `${entities.bpm} BPM` : '');
 let keyInfo = first.key || entities.key || '';
 let priceVal = first.display_price||first.basic_price||first.price;
 let priceInfo = priceVal!=null? `$${priceVal}` : (entities.price_max? `under $${entities.price_max}` : '$9.99');
 let hasFree = beats.some(b=> b.is_free || b.price==0 || (b.tags||'').toLowerCase().includes('free') || b.has_free_tagged);

 let text = '';
 let options = [];

 if(intent==='how_are_you'){
  text = "I'm good fam, ready to cook you heat 🔥 What vibe today?";
  options = ["Trap 🔥","R&B 💙","EDM ⚡","Afrobeat 🌍","Amapiano 🪘","Recent drops 👀"];
 } else if(intent==='recent'){
  if(!beats.length){
   text = "Fresh drops loading... what genre you want? 🔥";
   options = ["Trap 🔥","R&B 💙","EDM ⚡","Afrobeat 🌍","Amapiano 🪘"];
  } else {
   text = `Freshest ${beats.length} drops - just landed 🔥 ${bpmInfo} ${priceInfo}`.trim();
   if(hasFree) text += `\nFree tagged available 😊`;
   options = ["Yes, need this 🔥","Show licence 📜","Next 3 ➡️","What we have? 👀"];
  }
 } else if(intent==='next_page'){
  if(!beats.length){
   text = `No more ${genre} in vault fam, but got more heat 🔥`;
   options = ["Show trap 🔥","R&B 💙","EDM ⚡","Recent drops 👀","Custom? Connect creator 👨‍🔧"];
  } else {
   text = `Next 3 ${genre} - ${bpmInfo} ${keyInfo} ${priceInfo} 🔥`.trim();
   if(hasFree) text += `\nFree version available 😊`;
   options = ["Yes, need this 🔥","Show licence 📜","Next 3 ➡️","Custom? Connect creator 👨‍🔧"];
  }
 } else if(intent==='buy_intent'){
  text = `Say less 🔥 Which licence? Basic $9-$29 MP3+WAV, Pro $25-$75 WAV+Stems, Exclusive $104-$303 👑`;
  options = ["Basic $9-$29","Pro $25-$75 🔥","Exclusive 👑","Show licence 📜"];
 } else if(intent==='need_beat'){
  if(!beats.length){
   text = "We got you. What beat you like? Select below 👇";
   options = ["Trap 🔥","R&B 💙","EDM ⚡","Afrobeat 🌍","Future Bass 🚀","Dubstep 🔊","Amapiano 🪘","Pop ✨","Dancehall 🔥","Recent drops 👀"];
  } else if(fallback){
   text = `Top 3 ${genre} ${bpmInfo} ${keyInfo} ${priceInfo}`.trim();
   if(hasFree) text += `\nIt also has a free version 😊 want terms?`;
   options = ["Yes, need this 🔥","Show licence 📜","Next 3 ➡️","Custom? Connect creator 👨‍🔧"];
  } else {
   text = `Here top 3 ${genre} match - ${bpmInfo} ${keyInfo} ${priceInfo} 🔥`.trim();
   if(hasFree) text += `\nIt also has a free version 😊 want terms?`;
   options = ["Yes, need this 🔥","Show licence 📜","Next 3 ➡️","Custom? Connect creator 👨‍🔧"];
  }
 } else if(intent==='what_we_have'){
  text = "We got Trap, R&B, EDM, Afrobeat, Future Bass, Dubstep, Amapiano, Pop, Dancehall 🔥 What you need?";
  options = ["Trap 🔥","R&B 💙","EDM ⚡","Afrobeat 🌍","Amapiano 🪘","Future Bass 🚀","Dancehall 🔥","Recent drops 👀"];
 } else if(intent==='licence'){
  text = "Free $0 tagged, Basic $9-$29 MP3+WAV 5k, Pro $25-$75 WAV+stems 50k 🔥, Exclusive $104-$303 own forever 👑";
  options = ["Basic $9-$29","Pro $25-$75 🔥","Exclusive 👑","Recent drops 👀"];
 } else if(intent==='pricing'){
  text = "Basic $9-$29, Pro $25-$75 🔥, Exclusive $104-$303 👑 Instant delivery.";
  options = ["Show beats under $30 💰","Pro $25-$75 🔥","Exclusive 👑","Yes, need this 🔥"];
 } else if(intent.startsWith('technical')){
  text = "Got you - quick fix. Tell me beat + email, I reset link now. Valid 24h, check spam.";
  options = ["My link expired","No sound","Checkout failed","Talk to creator 👨‍🔧"];
 } else if(intent==='custom'){
  text = "Bet, custom $250 36h WAV+stems. Connecting you to private live chat with creator engineer 🤫 Hang tight.";
  options = ["Yes, connect me 👨‍🔧","Show me available first 👀"];
 } else if(intent==='thanks'){
  text = "Love! 💙 Need another heat?";
  options = ["Trap 🔥","EDM ⚡","Afrobeat 🌍","Recent drops 👀"];
 } else {
  text = "We got you. What beat you like? Select below or type what you have 👇";
  options = ["Trap 🔥","R&B 💙","EDM ⚡","Afrobeat 🌍","Amapiano 🪘","Recent drops 👀","Pop ✨"];
 }
 return { text, options, beats, fallback };
}
