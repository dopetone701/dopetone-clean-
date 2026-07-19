// cc-create-beat.js - V22 PRO - Rocket Upload - Big Boss - BG upload - Cents allowed - Progress bars
import { BEATS_API } from './cc-config.js';

const WORKER_URL = 'https://creation-system-api.dopetone701.workers.dev';
const CDN_URL = 'https://cdn.dopetonevault.com';
const SINGLE_LIMIT = 90 * 1024 * 1024;
const CHUNK_SIZE = 5 * 1024 * 1024;
const CONCURRENCY = 3;

class ProUploader {
  constructor(apiBase) { this.api = apiBase.replace(/\/$/, ''); this.worker = WORKER_URL; }
  async uploadSimple(file, folder, progWrap) {
    const safe = file.name.replace(/[^a-zA-Z0-9.-]/g,'_');
    const key = `${folder}/${Date.now()}-${safe}`;
    const fill = progWrap?.querySelector('.prog-fill');
    const text = progWrap?.querySelector('.prog-text');
    if(progWrap){ progWrap.style.display='block'; if(fill) fill.style.width='5%'; if(text) text.textContent='Starting...'; }
    try {
      // XHR for progress
      return await new Promise((resolve, reject)=>{
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', `${this.worker}/upload-single?key=${encodeURIComponent(key)}`, true);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.upload.onprogress = (e)=>{
          if(e.lengthComputable && fill){
            const pct = Math.round((e.loaded/e.total)*100);
            fill.style.width = pct+'%';
            if(text) text.textContent = `${pct}% ${(e.loaded/1024/1024).toFixed(1)}MB / ${(e.total/1024/1024).toFixed(1)}MB`;
          }
        };
        xhr.onload = ()=>{
          try{
            const data = JSON.parse(xhr.responseText);
            if(xhr.status>=200 && xhr.status<300 && data.url){
              if(fill) fill.style.width='100%';
              if(text) text.textContent=`Done ✓ Standard ${(data.size/1024/1024).toFixed(2)}MB`;
              resolve({ url: data.cdnUrl || data.url, key: data.key || key });
            } else reject(new Error(data.error||`Upload ${xhr.status}`));
          }catch{ reject(new Error(`Upload ${xhr.status}`)); }
        };
        xhr.onerror = ()=>reject(new Error('Network'));
        xhr.send(file);
      });
    } catch(e){
      // fallback legacy
      const form = new FormData(); form.append('file', file); form.append('folder', folder);
      return new Promise((resolve, reject)=>{
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${this.api}/upload`, true);
        xhr.upload.onprogress=(ev)=>{ if(ev.lengthComputable && fill){ const pct=Math.round((ev.loaded/ev.total)*100); fill.style.width=pct+'%'; if(text) text.textContent=`${pct}%`; } };
        xhr.onload=()=>{ try{ const d=JSON.parse(xhr.responseText); if(xhr.status>=200&&xhr.status<300&&d.cdnUrl) resolve({ url:d.cdnUrl, key:d.key||key }); else reject(new Error(d.error||`Upload ${xhr.status}`)); }catch{ reject(new Error(`Upload ${xhr.status}`)); } };
        xhr.onerror=()=>reject(new Error('Network'));
        xhr.send(form);
      });
    }
  }
  async initMultipart(filename, folder) {
    const key = `${folder}/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g,'_')}`;
    try {
      const res = await fetch(`${this.worker}/create-multipart`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, contentType: 'application/octet-stream' }) });
      const data = await res.json();
      if (res.ok) return { key: data.key, uploadId: data.uploadId };
    } catch {}
    const res = await fetch(`${this.api}/multipart/init`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename, folder }) });
    const text = await res.text();
    if (!res.ok) throw new Error(`Init ${res.status}`);
    const j = JSON.parse(text);
    return { key: j.key, uploadId: j.uploadId || j.upload_id };
  }
  async uploadPart(key, uploadId, partNumber, chunk, progWrap, totalLoaded, fileSize) {
    const fill = progWrap?.querySelector('.prog-fill');
    const text = progWrap?.querySelector('.prog-text');
    return new Promise((resolve, reject)=>{
      const xhr = new XMLHttpRequest();
      const url = `${this.api}/multipart/upload-part?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}&partNumber=${partNumber}`;
      xhr.open('POST', url, true);
      xhr.upload.onprogress=(e)=>{
        if(e.lengthComputable && fill){
          const pct = Math.round(((totalLoaded + e.loaded)/fileSize)*100);
          fill.style.width = pct+'%';
          if(text) text.textContent = `STREAM ${pct}% ${( (totalLoaded+e.loaded)/1024/1024).toFixed(1)}/${(fileSize/1024/1024).toFixed(1)}MB`;
        }
      };
      xhr.onload=()=>{ try{ const d=JSON.parse(xhr.responseText); if(xhr.status>=200&&xhr.status<300&&d.etag) resolve(d.etag); else reject(new Error(d.error||`Part ${partNumber}`)); }catch{ reject(new Error(`Part ${partNumber} bad`)); } };
      xhr.onerror=()=>reject(new Error(`Network part ${partNumber}`));
      xhr.send(chunk);
    });
  }
  async complete(key, uploadId, parts) {
    try {
      const res = await fetch(`${this.worker}/complete-multipart`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, uploadId, parts }) });
      const data = await res.json();
      if (res.ok) return { url: data.cdnUrl || data.url, key };
    } catch {}
    const res = await fetch(`${this.api}/multipart/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, uploadId, parts }) });
    const text = await res.text();
    if (!res.ok) throw new Error(`Complete ${res.status}`);
    const data = JSON.parse(text);
    return { url: data.cdnUrl || data.url, key };
  }
  async uploadHuge(file, folder, progWrap){
    if(file.size < SINGLE_LIMIT) return await this.uploadSimple(file, folder, progWrap);
    const {key, uploadId} = await this.initMultipart(file.name, folder);
    const total = Math.ceil(file.size / CHUNK_SIZE);
    const parts = new Array(total);
    let totalLoaded = 0;
    if(progWrap) progWrap.style.display='block';
    for(let i=0;i<total;i++){
      const start=i*CHUNK_SIZE;
      const chunk=file.slice(start, Math.min(start+CHUNK_SIZE, file.size));
      const etag = await this.uploadPart(key, uploadId, i+1, chunk, progWrap, totalLoaded, file.size);
      totalLoaded+=chunk.size;
      parts[i]={partNumber:i+1, etag};
      const fill=progWrap?.querySelector('.prog-fill');
      const text=progWrap?.querySelector('.prog-text');
      if(fill) fill.style.width=Math.round((totalLoaded/file.size)*100)+'%';
      if(text) text.textContent=`STREAM ${Math.round((totalLoaded/file.size)*100)}% ${ (totalLoaded/1024/1024).toFixed(1)}/${(file.size/1024/1024).toFixed(1)}MB ✓ ${i+1}/${total}`;
    }
    return await this.complete(key, uploadId, parts);
  }
}

const uploader = new ProUploader(BEATS_API);

function qs(sel, root=document){return root.querySelector(sel);}

function ensureCreateModalHTML(){
  let modal = document.getElementById('createBeatModal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'createBeatModal';
    modal.className = 'modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);display:none;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(8px);';
    document.body.appendChild(modal);
  }
  if(modal.querySelector('.pro-modal-box')) return modal;
  modal.innerHTML = `
  <div class="pro-modal-box" style="background:linear-gradient(180deg,#141414,#0e0e0e);border:1px solid #222;border-radius:16px;width:92%;max-width:760px;max-height:92vh;overflow:auto;box-shadow:0 20px 80px rgba(0,0,0,0.9);">
    <div class="edit-modal-header" style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #222;background:rgba(0,0,0,0.4);position:sticky;top:0;z-index:2;backdrop-filter:blur(12px)">
      <h3 style="margin:0;font-size:15px;color:#fff;display:flex;align-items:center;gap:8px"><span style="font-size:18px">🚀</span> Upload Beat — Pro</h3>
      <button id="createModalClose" style="background:#111;border:1px solid #333;color:#fff;width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:14px">✕</button>
    </div>
    <form id="beatForm" style="padding:20px;">
      <div class="edit-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div class="edit-field"><label style="font-size:11px;color:#888;display:block;margin-bottom:6px;letter-spacing:0.5px">TITLE *</label><input id="title" required placeholder="e.g. ROOTS" style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:10px;border-radius:8px;outline:none"></div>
        <div class="edit-field"><label style="font-size:11px;color:#888;display:block;margin-bottom:6px">ARTIST</label><input id="artist" value="DopeTone" style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:10px;border-radius:8px"></div>
        <div class="edit-field"><label style="font-size:11px;color:#888;display:block;margin-bottom:6px">PRICE $ (cents allowed)</label><input id="price" type="number" step="0.01" min="0" value="29.99" placeholder="29.99" style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:10px;border-radius:8px"></div>
        <div class="edit-field"><label style="font-size:11px;color:#888;display:block;margin-bottom:6px">BPM</label><input id="bpm" type="number" value="100" style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:10px;border-radius:8px"></div>
        <div class="edit-field"><label style="font-size:11px;color:#888;display:block;margin-bottom:6px">KEY</label><input id="key" placeholder="C, Gm" style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:10px;border-radius:8px"></div>
        <div class="edit-field"><label style="font-size:11px;color:#888;display:block;margin-bottom:6px">GENRE</label><input id="genre" list="genreList" placeholder="Afro" style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:10px;border-radius:8px"><datalist id="genreList"><option value="Afro"><option value="Trap"><option value="Drill"><option value="R&B"><option value="Boom Bap"><option value="Plugg"><option value="Dance"></datalist></div>
        <div class="edit-field"><label style="font-size:11px;color:#888;display:block;margin-bottom:6px">MOOD</label><input id="mood" placeholder="Dance" style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:10px;border-radius:8px"></div>
        <div class="edit-field"><label style="font-size:11px;color:#888;display:block;margin-bottom:6px">TYPE</label><input id="type" placeholder="Afro" style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:10px;border-radius:8px"></div>
        <div class="edit-field"><label style="font-size:11px;color:#888;display:block;margin-bottom:6px">MONETIZATION</label><select id="monetization" style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:10px;border-radius:8px"><option value="paid">💲 Paid</option><option value="hybrid">🏷️ Tagged Free</option><option value="free">🎁 FREE</option></select></div>
        <div class="edit-field" style="grid-column:1/-1"><label style="font-size:11px;color:#888;display:block;margin-bottom:6px">TAGS</label><input id="tags" placeholder="Dance, Afro, Summer" style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:10px;border-radius:8px"></div>
      </div>
      <div class="edit-field" style="margin-top:14px"><label style="font-size:11px;color:#888;display:block;margin-bottom:6px">DESCRIPTION</label><textarea id="description" rows="2" placeholder="Story behind the beat..." style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:10px;border-radius:8px;resize:none"></textarea></div>
      
      <div class="edit-upload-row" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:18px">
        <div class="upload-box" style="background:#0f0f0f;padding:14px;border-radius:12px;border:1px solid #222;transition:all 0.3s">
          <label style="font-size:11px;color:#aaa;display:block;margin-bottom:8px;font-weight:600">🖼️ COVER * → covers/</label><input type="file" id="coverInput" accept="image/*" required style="width:100%;font-size:11px;color:#888"><img id="coverPreview" style="width:100%;max-height:110px;object-fit:cover;margin-top:10px;border-radius:8px;display:none;border:1px solid #222">
          <div id="progCover" style="display:none;margin-top:10px"><div style="height:6px;background:#222;border-radius:99px;overflow:hidden"><div class="prog-fill" style="height:100%;width:0%;background:linear-gradient(90deg,#00ff88,#00cc6a);transition:width 0.2s"></div></div><span class="prog-text" style="font-size:10px;color:#00ff88;margin-top:4px;display:block">0%</span></div>
        </div>
        <div class="upload-box" style="background:#0f0f0f;padding:14px;border-radius:12px;border:1px solid #222">
          <label style="font-size:11px;color:#aaa;display:block;margin-bottom:8px;font-weight:600">🎵 MP3 * → beats/</label><input type="file" id="mp3Input" accept="audio/*" required style="width:100%;font-size:11px;color:#888"><audio id="mp3Preview" controls style="width:100%;margin-top:8px;height:36px;display:none"></audio>
          <div id="progMp3" style="display:none;margin-top:10px"><div style="height:6px;background:#222;border-radius:99px;overflow:hidden"><div class="prog-fill" style="height:100%;width:0%;background:linear-gradient(90deg,#00f2ff,#0099cc);transition:width 0.2s"></div></div><span class="prog-text" style="font-size:10px;color:#00f2ff;margin-top:4px;display:block">0%</span></div>
        </div>
        <div class="upload-box" style="background:#0f0f0f;padding:14px;border-radius:12px;border:1px solid #222">
          <label style="font-size:11px;color:#aaa;display:block;margin-bottom:8px;font-weight:600">🎧 WAV → wavs/</label><input type="file" id="wavInput" accept=".wav,audio/wav" style="width:100%;font-size:11px;color:#888">
          <div id="progWav" style="display:none;margin-top:10px"><div style="height:6px;background:#222;border-radius:99px;overflow:hidden"><div class="prog-fill" style="height:100%;width:0%;background:linear-gradient(90deg,#f59e0b,#d97706);transition:width 0.2s"></div></div><span class="prog-text" style="font-size:10px;color:#f59e0b;margin-top:4px;display:block">0%</span></div>
        </div>
        <div class="upload-box" style="background:#0f0f0f;padding:14px;border-radius:12px;border:1px solid #222">
          <label style="font-size:11px;color:#aaa;display:block;margin-bottom:8px;font-weight:600">📦 ZIP → projects/ (Standard)</label><input type="file" id="zipInput" accept=".zip" style="width:100%;font-size:11px;color:#888">
          <div id="progZip" style="display:none;margin-top:10px"><div style="height:6px;background:#222;border-radius:99px;overflow:hidden"><div class="prog-fill" style="height:100%;width:0%;background:linear-gradient(90deg,#a855f7,#7c3aed);transition:width 0.2s"></div></div><span class="prog-text" style="font-size:10px;color:#a855f7;margin-top:4px;display:block">0%</span></div>
        </div>
      </div>

      <div id="createStatus" style="margin-top:16px;padding:12px;background:#111;border:1px solid #222;border-radius:10px;font-size:11px;color:#888;display:flex;align-items:center;gap:8px"><span>🚀</span> Ready to upload — Background upload enabled, you can keep working</div>
      
      <div style="padding:16px 0 0;display:flex;gap:10px;justify-content:flex-end;align-items:center">
        <button type="button" id="createCancel" style="padding:10px 18px;background:#111;border:1px solid #333;color:#fff;border-radius:8px;cursor:pointer;font-weight:600">Cancel</button>
        <button type="submit" id="uploadBtn" style="padding:10px 24px;background:linear-gradient(135deg,#00ff88,#00cc6a);border:none;color:#000;border-radius:8px;cursor:pointer;font-weight:800;display:flex;align-items:center;gap:8px"><span>🚀</span> Upload Beat</button>
      </div>
    </form>
  </div>`;
  return modal;
}

function openCreateBeatModal(){
  const modal = ensureCreateModalHTML();
  if(!modal) return;
  modal.classList.add('active');
  modal.style.display='flex';
  document.body.classList.add('modal-open');
  document.body.style.overflow='hidden';
  initCreateBeatModal();
}

function closeCreateBeatModal(){
  const modal = document.getElementById('createBeatModal');
  if(!modal) return;
  // Don't close if uploading in background
  if(modal.dataset.uploading==='1'){
    if(!confirm('Upload running in background — close anyway? Progress will continue.')) return;
  }
  modal.classList.remove('active');
  modal.style.display='none';
  document.body.classList.remove('modal-open');
  document.body.style.overflow='';
}

window.openCreateBeatModal = openCreateBeatModal;
window.closeCreateBeatModal = closeCreateBeatModal;
window.ccOpenCreate = openCreateBeatModal;

export function initCreateBeatModal() {
  const modal = ensureCreateModalHTML();
  if (!modal) return;
  const form = modal.querySelector('form');
  if (!form) return;
  if(form.dataset.bound==='1') {
    // rebind close buttons
    qs('#createModalClose', modal)?.addEventListener('click', closeCreateBeatModal);
    return;
  }
  form.dataset.bound='1';

  const mp3Input = document.getElementById('mp3Input');
  const coverInput = document.getElementById('coverInput');
  const mp3Preview = document.getElementById('mp3Preview');
  const coverPreview = document.getElementById('coverPreview');
  const uploadBtn = document.getElementById('uploadBtn');

  if (mp3Input && mp3Preview) {
    mp3Input.onchange = (e) => { const file = e.target.files[0]; if (file) { mp3Preview.src = URL.createObjectURL(file); mp3Preview.style.display='block'; } };
  }
  if (coverInput && coverPreview) {
    coverInput.onchange = (e) => { const file = e.target.files[0]; if (file) { coverPreview.src = URL.createObjectURL(file); coverPreview.style.display='block'; } };
  }

  qs('#createModalClose', modal)?.addEventListener('click', closeCreateBeatModal);
  qs('#createCancel', modal)?.addEventListener('click', closeCreateBeatModal);
  modal.addEventListener('click', (e)=>{ if(e.target===modal && modal.dataset.uploading!=='1') closeCreateBeatModal(); });

  form.onsubmit = async (e) => {
    e.preventDefault();
    const title = document.getElementById('title')?.value?.trim();
    const artist = document.getElementById('artist')?.value?.trim() || 'DopeTone';
    const genre = document.getElementById('genre')?.value?.trim() || '';
    const mood = document.getElementById('mood')?.value?.trim() || '';
    const type = document.getElementById('type')?.value?.trim() || '';
    const tags = document.getElementById('tags')?.value?.trim() || '';
    const description = document.getElementById('description')?.value?.trim() || '';
    const bpm = document.getElementById('bpm')?.value || '';
    const keyVal = document.getElementById('key')?.value?.trim() || '';
    const priceRaw = document.getElementById('price')?.value || '29.99';
    const price = parseFloat(priceRaw) || 29.99; // CENTS ALLOWED
    const monetization = document.getElementById('monetization')?.value || 'paid';

    const mp3File = mp3Input?.files[0];
    const coverFile = coverInput?.files[0];
    const wavFile = document.getElementById('wavInput')?.files[0];
    const zipFile = document.getElementById('zipInput')?.files[0];

    if (!title || !mp3File || !coverFile) { alert('Title, MP3 and Cover are required'); return; }

    // BIG BOSS - SINK IN - LOSE COLOR AND UNCLICKABLE - BG UPLOAD
    const status = document.getElementById('createStatus');
    const allInputs = form.querySelectorAll('input, textarea, select');
    modal.dataset.uploading='1';
    form.style.opacity='0.5';
    form.style.filter='grayscale(0.8)';
    form.style.pointerEvents='none';
    if(uploadBtn){
      uploadBtn.disabled=true;
      uploadBtn.style.opacity='0.5';
      uploadBtn.style.pointerEvents='none';
      uploadBtn.innerHTML='<span>🚀</span> Uploading in BG...';
    }
    if(status){
      status.style.display='flex';
      status.style.background='#0a0a0a';
      status.style.borderColor='#00ff88';
      status.style.color='#00ff88';
      status.innerHTML='🚀 <b>Background upload running — you can keep working!</b> Progress bars updating...';
    }
    // Allow closing modal while uploading continues in background
    allInputs.forEach(i=>{ i.disabled=true; });

    try {
      let mp3Data, coverData, wavData, zipData;
      
      const progCover = document.getElementById('progCover');
      const progMp3 = document.getElementById('progMp3');
      const progWav = document.getElementById('progWav');
      const progZip = document.getElementById('progZip');

      // Upload with progress bars - BG
      coverData = await uploader.uploadSimple(coverFile, 'covers', progCover);
      mp3Data = await uploader.uploadBeast(mp3File, 'beats', progMp3, 'MP3');
      if (wavFile) wavData = await uploader.uploadHuge(wavFile, 'wavs', progWav);
      if (zipFile) zipData = await uploader.uploadHuge(zipFile, 'projects', progZip);

      if(status) status.innerHTML='💾 Saving to D1 - Exact 41 cols...';

      const payload = {
        title, artist, genre, mood, type, tags, description,
        bpm: bpm ? parseInt(bpm) : 100,
        key: keyVal,
        price: price, // FLOAT - CENTS ALLOWED - will be stored as REAL even if column INTEGER
        monetization_mode: monetization,
        has_free_tagged: monetization==='hybrid'?1:0,
        mp3_url: mp3Data.url, audio_url: mp3Data.url, mp3_key: mp3Data.key, audio_key: mp3Data.key,
        cover_url: coverData.url, cover_key: coverData.key,
        wav_url: wavData?.url || null, wav_key: wavData?.key || null,
        zip_url: zipData?.url || null, zip_key: zipData?.key || null,
        revenue: 0, basic_price: price, is_free: monetization==='free'?1:0
      };

      const res = await fetch(`${BEATS_API}/beats`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      const text = await res.text();
      if (!res.ok) throw new Error(`DB save ${res.status}: ${text.slice(0,800)}`);

      if(status){
        status.innerHTML='✅ <b>Beat uploaded — Rocket Pro!</b> — Refreshing...';
        status.style.borderColor='#00ff88';
        status.style.background='#002a14';
      }

      setTimeout(()=>{
        alert('🚀🔥 Beat uploaded — Big Boss Pro — BG Upload Done!');
        form.reset();
        if (mp3Preview) mp3Preview.style.display='none';
        if (coverPreview) coverPreview.style.display='none';
        // Reset UI
        form.style.opacity='1';
        form.style.filter='none';
        form.style.pointerEvents='auto';
        allInputs.forEach(i=>{ i.disabled=false; });
        modal.dataset.uploading='0';
        closeCreateBeatModal();
        window.location.reload();
      }, 800);

    } catch(err){
      console.error(err);
      if(status){ status.textContent='❌ '+err.message; status.style.color='#ff5050'; status.style.borderColor='#ff5050'; }
      // Restore
      form.style.opacity='1';
      form.style.filter='none';
      form.style.pointerEvents='auto';
      allInputs.forEach(i=>{ i.disabled=false; });
      if(uploadBtn){ uploadBtn.disabled=false; uploadBtn.style.opacity='1'; uploadBtn.style.pointerEvents='auto'; uploadBtn.innerHTML='<span>🚀</span> Upload Beat'; }
      modal.dataset.uploading='0';
      alert('Upload failed: '+err.message);
    }
  };
}

document.addEventListener('DOMContentLoaded', () => {
  ensureCreateModalHTML();
  initCreateBeatModal();
  const possibleBtns = [
    document.getElementById('createBeatBtn'),
    document.getElementById('newBeatBtn'),
    document.getElementById('openCreateModal'),
    document.querySelector('[data-action="create-beat"]'),
    ...Array.from(document.querySelectorAll('button')).filter(b=>{
      const t=(b.textContent||'').toLowerCase();
      return (t.includes('create beat') || t.includes('new beat') || t.includes('add beat') || t.includes('+ beat')) && b.id!=='uploadBtn';
    })
  ].filter(Boolean);
  possibleBtns.forEach(btn=>{
    if(btn.dataset.boundCreate) return;
    btn.addEventListener('click', (e)=>{ e.preventDefault(); openCreateBeatModal(); });
    btn.dataset.boundCreate='1';
  });
});

export async function uploadPack(zipFile, coverFile, packData, btn) {
  if (!zipFile) throw new Error('ZIP required');
  const zipData = await uploader.uploadSimple(zipFile, 'packs', document.getElementById('progZip'));
  let coverData = null;
  if (coverFile) coverData = await uploader.uploadSimple(coverFile, 'covers', document.getElementById('progCover'));
  return { zipUrl: zipData.url, zipKey: zipData.key, coverUrl: coverData?.url, coverKey: coverData?.key };
}
