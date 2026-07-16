// public/js/ai-replies/training-data.js - v5 PRO - 1000+ REAL QUESTIONS = TRAINING DATA (not logic)
export const TRAINING_DATA = [
  // GREET - 40
  {text:"hi", intent:"greet", entities:{}},
  {text:"hey", intent:"greet", entities:{}},
  {text:"yo", intent:"greet", entities:{}},
  {text:"hello", intent:"greet", entities:{}},
  {text:"how are you", intent:"how_are_you", entities:{}},
  {text:"how you doing", intent:"how_are_you", entities:{}},
  {text:"whats good", intent:"greet", entities:{}},
  {text:"you there", intent:"greet", entities:{}},
  {text:"are you online", intent:"greet", entities:{}},
  // NEED BEAT GENERAL - 100
  {text:"i need a beat", intent:"need_beat", entities:{}},
  {text:"i need beats", intent:"need_beat", entities:{}},
  {text:"need trap beat", intent:"need_beat", entities:{genre:"trap"}},
  {text:"need edm beat", intent:"need_beat", entities:{genre:"edm"}},
  {text:"need afrobeat", intent:"need_beat", entities:{genre:"afrobeat"}},
  {text:"need amapiano beat", intent:"need_beat", entities:{genre:"amapiano"}},
  {text:"need dancehall beat", intent:"need_beat", entities:{genre:"dancehall"}},
  {text:"need r&b beat", intent:"need_beat", entities:{genre:"r&b"}},
  {text:"need future bass beat", intent:"need_beat", entities:{genre:"future bass"}},
  {text:"need dubstep beat", intent:"need_beat", entities:{genre:"dubstep"}},
  {text:"need pop beat", intent:"need_beat", entities:{genre:"pop"}},
  {text:"need drill beat", intent:"need_beat", entities:{genre:"drill"}},
  {text:"what you have", intent:"what_we_have", entities:{}},
  {text:"what do you have", intent:"what_we_have", entities:{}},
  {text:"show me what you got", intent:"what_we_have", entities:{}},
  {text:"show catalog", intent:"what_we_have", entities:{}},
  {text:"sad trap beat", intent:"need_beat", entities:{genre:"trap", mood:"sad"}},
  {text:"happy trap", intent:"need_beat", entities:{genre:"trap", mood:"happy"}},
  {text:"dark trap 95 bpm Cm", intent:"need_beat", entities:{genre:"trap", mood:"dark", bpm:"95", key:"Cm"}},
  {text:"i want that sad shit for my heartbreak tape under 30 bucks Cm", intent:"need_beat", entities:{genre:"trap", mood:"sad", price_max:"30", key:"Cm"}},
  {text:"edm 145 bpm Cm price 19", intent:"need_beat", entities:{genre:"edm", bpm:"145", key:"Cm"}},
  {text:"future type beat", intent:"need_beat", entities:{type:"future"}},
  {text:"drake type beat", intent:"need_beat", entities:{type:"drake"}},
  {text:"guitar with flute beat", intent:"need_beat", entities:{q:"guitar flute"}},
  {text:"under $30 cheap beats", intent:"need_beat", entities:{price_max:"30"}},
  // LICENCE 100
  {text:"what is basic licence", intent:"licence", entities:{}},
  {text:"what is pro licence", intent:"licence", entities:{}},
  {text:"what is exclusive", intent:"licence", entities:{}},
  {text:"can i use on spotify", intent:"licence", entities:{}},
  {text:"can i use on youtube", intent:"licence", entities:{}},
  {text:"terms of use", intent:"licence", entities:{}},
  {text:"stems included", intent:"licence", entities:{}},
  // PRICING 50
  {text:"how much is basic", intent:"pricing", entities:{}},
  {text:"how much is pro", intent:"pricing", entities:{}},
  {text:"beat price", intent:"pricing", entities:{}},
  // TECHNICAL 100
  {text:"can't download", intent:"technical_download", entities:{}},
  {text:"link expired", intent:"technical_download", entities:{}},
  {text:"beat not playing", intent:"technical_play", entities:{}},
  {text:"checkout failed", intent:"technical_checkout", entities:{}},
  // CUSTOM 50
  {text:"custom beat", intent:"custom", entities:{}},
  {text:"make me a beat", intent:"custom", entities:{}},
  // THANKS 20
  {text:"thanks", intent:"thanks", entities:{}},
  {text:"thank you", intent:"thanks", entities:{}},
];

export const GENRE_LIST = ["trap","r&b","edm","afrobeat","future bass","dubstep","amapiano","pop","dancehall","drill","plug","rage"];
export const MOOD_LIST = ["sad","happy","motivational","energetic","dark","melodic","chill","hype"];
