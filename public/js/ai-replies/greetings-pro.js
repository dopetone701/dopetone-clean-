// public/js/ai-replies/greetings-pro.js - v5 PRO - FIRST HIT, SHORT, BUY DRIVER OPTIONS
import { shouldGreetPro } from './conversation-memory-pro.js';
const GENRE_OPTS = ["Trap 🔥","R&B 💙","EDM ⚡","Afrobeat 🌍","Future Bass 🚀","Dubstep 🔊","Amapiano 🪘","Pop ✨","Dancehall 🔥","What we have? 👀"];

export function getGreetingPro(parsed){
  const t = (parsed?.t||'').toLowerCase();
  const isHow = /how are you|how you doing|you good/.test(t);
  if(isHow){
    return { text: "I'm good fam, ready to cook you heat 🔥 What vibe today?", options: GENRE_OPTS, greeted:true };
  }
  if(shouldGreetPro()){
    if(t.length<25 && !parsed?.entities?.genre){
      return { text: "Hey fam 👋 Perfect, we got you back. What beat you like? Select below 👇", options: GENRE_OPTS, greeted:true };
    }
  }
  return null;
}
export function getGenreOptions(){ return GENRE_OPTS; }
