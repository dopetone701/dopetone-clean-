// ===============================
// 🔥 DOPE TONE LIQUID EQ - INVERTED DYNAMICS BOSS
// ===============================
window.initLiquidEq = function(){
  'use strict';


  let analyser = null;
  let audioCtx = null;
  let source = null;
  let dataArray = null;
  let canvas = null;
  let ctx = null;
  let animationId = null;
  let isSetup = false;

  const BANDS = 60;
  let bars = new Array(BANDS).fill(0);
  let noiseFloor = new Array(BANDS).fill(0);
  let globalEnergy = 0;

  function getAudio() {
    return window.__DOPE_TONE_AUDIO__ || document.querySelector('audio') || null;
  }

  function getCoverImg() {
    return document.getElementById("gpCover");
  }

  function setupCanvas() {
    canvas = document.getElementById("liquidEq");
    if (!canvas) return false;
    ctx = canvas.getContext("2d");
    canvas.width = 70;
    canvas.height = 70;
    return true;
  }

  function updateCoverBlur() {
    const img = getCoverImg();
    const card = document.querySelector(".player-cover-wrap");
    if (!img ||!img.src ||!card) return;
    card.style.setProperty('--cover', `url(${img.src})`);
  }

  function connectAudio() {
    const audio = getAudio();
    if (!audio || audioCtx) return;

    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0.0;
      
      source = audioCtx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      dataArray = new Uint8Array(analyser.frequencyBinCount);

      console.log("DOPE TONE EQ: Inverted Dynamics");
    } catch(e) {
      console.error("DOPE TONE EQ ERROR:", e);
    }
  }

  function getBandBuckets() {
    const buckets = [];
    const minFreq = 15;
    const maxFreq = 20000;
    const nyquist = audioCtx.sampleRate / 2;
    const binHz = nyquist / dataArray.length;
    
    for (let i = 0; i < BANDS; i++) {
      const ratio = i / BANDS;
      const skewedRatio = Math.pow(ratio, 1.15);
      const freq = minFreq * Math.pow(maxFreq / minFreq, skewedRatio);
      const nextFreq = minFreq * Math.pow(maxFreq / minFreq, Math.pow((i + 1) / BANDS, 1.15));
      
      const startBin = Math.max(1, Math.floor(freq / binHz));
      const endBin = Math.min(Math.floor(nextFreq / binHz), dataArray.length - 1);
      
      buckets.push([startBin, endBin]);
    }
    return buckets;
  }

  function getBandWeight(index) {
    if (index < 10) return 0.9;
    if (index >= 15 && index <= 35) return 1.7;
    if (index >= 12 && index <= 40) return 1.35;
    return 1.0;
  }

  function getMidFloor(index, energy) {
    const busyFactor = Math.max(0, 1 - energy * 2);
    if (index >= 15 && index <= 35) return 3 * busyFactor;
    if (index >= 12 && index <= 40) return 1.5 * busyFactor;
    return 0;
  }

  function drawLiquid() {
    animationId = requestAnimationFrame(drawLiquid);

    if (!ctx) return;

    const audio = getAudio();

    if (audio &&!audio.paused &&!audioCtx) {
      connectAudio();
    }

    ctx.clearRect(0, 0, 70, 70);

    if (!audio || audio.paused ||!analyser ||!dataArray) {
      for (let i = 0; i < BANDS; i++) {
        const floor = getMidFloor(i, 0);
        bars[i] = Math.max(floor, bars[i] * 0.85);
      }
      noiseFloor = noiseFloor.map(v => v * 0.95);
      globalEnergy *= 0.9;
      drawBars();
      return;
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    analyser.getByteFrequencyData(dataArray);

    let energySum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      energySum += dataArray[i];
    }
    globalEnergy = globalEnergy * 0.8 + (energySum / dataArray.length / 255) * 0.2;

    const buckets = getBandBuckets();

    for (let i = 0; i < BANDS; i++) {
      let max = 0;
      for (let j = buckets[i][0]; j <= buckets[i][1]; j++) {
        max = Math.max(max, dataArray[j]);
      }
      
      const raw = max / 255;
      
      noiseFloor[i] = noiseFloor[i] * 0.995 + raw * 0.005;
      
      // 🔥 INVERTED THRESHOLD - LOUD = EASIER TO TRIGGER
      let threshold = 0.05 + globalEnergy * 0.01; // Higher when loud = less gate
      if (i < 10) threshold = 0.085 + globalEnergy * 0.02; // Kick needs more when loud
      else if (i >= 15 && i <= 35) threshold = 0.025 + globalEnergy * 0.005;
      
      const gated = Math.max(0, raw - noiseFloor[i] * (1.3 - globalEnergy * 0.3));
      
      const midBoost = getBandWeight(i);
      const boosted = gated * midBoost;
      
      const floor = getMidFloor(i, globalEnergy);
      // 🔥 MORE GAIN WHEN BUSY
      const gainBoost = 58 + globalEnergy * 25; // 58-83 depending on loudness
      const target = boosted > threshold? (boosted - threshold) * gainBoost : floor;
      
      // ===============================
      // 🔥 INVERTED DYNAMICS - BUSY = WILD
      // ===============================
      let decay = 0.87 - globalEnergy * 0.15; // LOUD = LOOSE 0.72, QUIET = TIGHT 0.87
      if (i < 10) decay = 0.78 - globalEnergy * 0.13; // Kick loose when loud
      else if (i >= 15 && i <= 35) decay = 0.77 + globalEnergy * 0.05; // Mids tighter when loud
      else if (i > 48) decay = 0.85 - globalEnergy * 0.1;
      
      if (target > bars[i]) {
        // Attack INVERTED - loud = slower = more overshoot = more action
        const attack = 1.0 - globalEnergy * 0.2; // 0.8-1.0, lower when loud
        bars[i] = bars[i] * (1 - attack) + target * attack;
      } else {
        bars[i] = Math.max(floor, bars[i] * decay + target * (1 - decay));
      }
    }

    drawBars();
  }

  function drawNeonLine() {
    const w = 70;
    const h = 70;
    const centerY = h / 2;
    const inset = 2;
    
    // 🔥 MORE GLOW WHEN BUSY
    const glowIntensity = 10 + globalEnergy * 12;
    
    const gradient = ctx.createLinearGradient(inset, centerY, w - inset, centerY);
    
    gradient.addColorStop(0, 'rgba(80, 180, 255, 0)');
    gradient.addColorStop(0.1, 'rgba(80, 180, 255, 0.3)');
    gradient.addColorStop(0.5, 'rgba(120, 200, 255, 1)');
    gradient.addColorStop(0.9, 'rgba(80, 180, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(80, 180, 255, 0)');
    
    ctx.shadowBlur = glowIntensity;
    ctx.shadowColor = 'rgba(45, 150, 255, 1)';
    ctx.strokeStyle = gradient;
    ctx.lineCap = 'round';
    
    ctx.lineWidth = 2.5 + globalEnergy * 1.5; // Thicker when loud
    ctx.beginPath();
    ctx.moveTo(inset, centerY);
    ctx.lineTo(w - inset, centerY);
    ctx.stroke();

    ctx.shadowBlur = glowIntensity * 0.6;
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.5 + globalEnergy;
    
    ctx.beginPath();
    ctx.moveTo(inset + 2, centerY);
    ctx.lineTo(w - inset - 2, centerY);
    ctx.stroke();

    const coreGradient = ctx.createLinearGradient(inset, centerY, w - inset, centerY);
    coreGradient.addColorStop(0, 'rgba(200, 230, 255, 0)');
    coreGradient.addColorStop(0.15, 'rgba(220, 240, 255, 0.5)');
    coreGradient.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
    coreGradient.addColorStop(0.85, 'rgba(220, 240, 255, 0.5)');
    coreGradient.addColorStop(1, 'rgba(200, 230, 255, 0)');
    
    ctx.shadowBlur = 4 + globalEnergy * 4;
    ctx.strokeStyle = coreGradient;
    ctx.lineWidth = 0.8 + globalEnergy * 0.5;
    
    ctx.beginPath();
    ctx.moveTo(inset + 4, centerY);
    ctx.lineTo(w - inset - 4, centerY);
    ctx.stroke();
    
    ctx.shadowBlur = 0;
  }

  function drawBars() {
    const w = 70;
    const h = 70;
    const centerY = h / 2;
    const inset = 2;
    const drawWidth = w - inset * 2;
    const step = drawWidth / (BANDS - 1);

    drawNeonLine();

    const gradient = ctx.createLinearGradient(0, h, 0, 0);
    gradient.addColorStop(0, 'rgba(26,77,255,1)');
    gradient.addColorStop(0.5, 'rgba(45,99,255,0.8)');
    gradient.addColorStop(1, 'rgba(255,45,58,0.6)');

    ctx.fillStyle = gradient;
    ctx.shadowBlur = 12 + globalEnergy * 12; // More glow when busy
    ctx.shadowColor = 'rgba(45,99,255,0.8)';
    
    ctx.beginPath();
    ctx.moveTo(inset, centerY);
    
    for (let i = 0; i < BANDS - 1; i++) {
      const x1 = inset + i * step;
      const y1 = centerY - bars[i] * 0.9;
      const x2 = inset + (i + 1) * step;
      const y2 = centerY - bars[i + 1] * 0.9;
      
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      
      ctx.quadraticCurveTo(x1, y1, cx, cy);
    }
    
    ctx.lineTo(w - inset, centerY);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.translate(0, h);
    ctx.scale(1, -1);
    ctx.globalAlpha = 0.35 + globalEnergy * 0.1; // More reflection when busy
    
    ctx.beginPath();
    ctx.moveTo(inset, centerY);
    
    for (let i = 0; i < BANDS - 1; i++) {
      const x1 = inset + i * step;
      const y1 = centerY - bars[i] * 0.9;
      const x2 = inset + (i + 1) * step;
      const y2 = centerY - bars[i + 1] * 0.9;
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      ctx.quadraticCurveTo(x1, y1, cx, cy);
    }
    
    ctx.lineTo(w - inset, centerY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.shadowBlur = 0;
  }

  function init() {
    if (isSetup) return;
    isSetup = true;

    console.log("DOPE TONE EQ: Inverted Dynamics");

    document.addEventListener("playerPlay", () => {
      setTimeout(updateCoverBlur, 300);
      if (audioCtx?.state === 'suspended') {
        audioCtx.resume();
      }
    });

    const cover = getCoverImg();
    if (cover) {
      cover.addEventListener('load', updateCoverBlur);
      if (cover.complete) updateCoverBlur();
    }

    setupCanvas();
    drawLiquid();
  }

   init();
};
if(document.getElementById('liquidEq')){ window.initLiquidEq(); }
