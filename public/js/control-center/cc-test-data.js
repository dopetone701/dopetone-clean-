// this is cc-edit-modal back-up
// cc-edit-modal.js - V16 FIXED - Standard Save for Zip - uses same 5MB streaming but saves as Standard
import { BEATS_API, allBeats, setAllBeats, setFilteredBeats } from './cc-config.js';
import { renderBeatsTable } from './cc-beats-table.js';

let editingBeat = null;
function qs(sel, root=document){return root.querySelector(sel);}

const WORKER_URL = 'https://creation-system-api.dopetone701.workers.dev';
const SINGLE_LIMIT = 90*1024*1024;

class BeastFinalUploaderFixed {
  constructor(apiBase){this.api=apiBase.replace(/\/$/,'');this.worker=WORKER_URL;this.chunkSize=5*1024*1024;}
  
  async uploadSmall(file,folder,progWrap){
    const safe=file.name.replace(/[^a-zA-Z0-9.-]/g,'_');
    const key=`${folder}/${Date.now()}-${safe}`;
    // FIXED: Use worker /upload-single = Standard Save for zip like Juicy Stems.zip 49MB
    try{
      if(progWrap){progWrap.style.display='block'; const fill=progWrap.querySelector('.prog-fill'); if(fill) fill.style.width='30%';}
      const res=await fetch(`${this.worker}/upload-single?key=${encodeURIComponent(key)}`,{method:'PUT',headers:{'Content-Type':file.type||'application/octet-stream'},body:file});
      const data=await res.json();
      if(res.ok && data.url){
        if(progWrap){const fill=progWrap.querySelector('.prog-fill'); const text=progWrap.querySelector('.prog-text'); if(fill) fill.style.width='100%'; if(text) text.textContent=`Done ✓ Standard ${(data.size/1024/1024).toFixed(2)}MB`;}
        return data.cdnUrl||data.url;
      }
    }catch(e){ console.warn('worker single failed, fallback legacy',e); }

    // Legacy fallback
    const form=new FormData();form.append('file',file);form.append('folder',folder);
    return new Promise((resolve,reject)=>{
      const xhr=new XMLHttpRequest();xhr.open('POST',`${this.api}/upload`,true);
      if(progWrap){progWrap.style.display='block';const fill=progWrap.querySelector('.prog-fill');const text=progWrap.querySelector('.prog-text');xhr.upload.onprogress=(e)=>{if(e.lengthComputable){const pct=Math.round((e.loaded/e.total)*100);if(fill)fill.style.width=pct+'%';if(text)text.textContent=`${pct}% ${(e.loaded/1024/1024).toFixed(1)}MB`;}};}
      xhr.onload=()=>{try{const d=JSON.parse(xhr.responseText);if(xhr.status>=200&&xhr.status<300&&d.cdnUrl)resolve(d.cdnUrl);else reject(new Error(d.error||`Upload ${xhr.status}: ${xhr.responseText?.slice(0,400)}`));}catch{reject(new Error(`Upload ${xhr.status}: ${xhr.responseText?.slice(0,400)}`));}};
      xhr.onerror=()=>reject(new Error('Network /upload'));
      xhr.send(form);
    });
  }

  async initMultipart(filename,folder){
    const key=`${folder}/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g,'_')}`;
    try{
      const res=await fetch(`${this.worker}/create-multipart`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key, contentType:'application/octet-stream'})});
      const data=await res.json();
      if(res.ok) return {key:data.key, uploadId:data.uploadId};
    }catch{}
    const res=await fetch(`${this.api}/multipart/init`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename,folder})});
    const txt=await res.text();if(!res.ok)throw new Error(`Init ${res.status}: ${txt.slice(0,600)}`);return JSON.parse(txt);
  }

  async uploadPartSequential(key,uploadId,partNumber,chunk,onProg){
    // Try new worker PUT first
    try{
      const url=`${this.worker}/upload-part?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}&partNumber=${partNumber}`;
      const res=await fetch(url,{method:'PUT',body:chunk});
      if(res.ok){
        const etag=res.headers.get('etag')||`"${partNumber}"`;
        if(onProg) onProg(chunk.size);
        return etag.replace(/"/g,'');
      }
    }catch{}
    // Legacy POST
    return new Promise((resolve,reject)=>{
      const xhr=new XMLHttpRequest();
      const url=`${this.api}/multipart/upload-part?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}&partNumber=${partNumber}`;
      xhr.open('POST',url,true);
      xhr.upload.onprogress=(e)=>{if(e.lengthComputable&&onProg)onProg(e.loaded);};
      xhr.onload=()=>{try{const d=JSON.parse(xhr.responseText);if(xhr.status>=200&&xhr.status<300&&d.etag)resolve(d.etag);else reject(new Error(d.error||`Part ${partNumber} ${xhr.status}`));}catch{reject(new Error(`Part ${partNumber} bad JSON`));}};
      xhr.onerror=()=>reject(new Error(`Network part ${partNumber}`));
      xhr.send(chunk);
    });
  }

  async completeMultipart(key,uploadId,parts){
    try{
      const res=await fetch(`${this.worker}/complete-multipart`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,uploadId,parts})});
      const data=await res.json();
      if(res.ok) return data.cdnUrl||data.url;
    }catch{}
    const res=await fetch(`${this.api}/multipart/complete`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,uploadId,parts})});
    const txt=await res.text();if(!res.ok)throw new Error(`Complete ${res.status}: ${txt.slice(0,800)}`);const data=JSON.parse(txt);return data.cdnUrl||data.url;
  }

  async uploadHuge(file,folder,progWrap){
    if(file.size<SINGLE_LIMIT) return await this.uploadSmall(file,folder,progWrap);
    const {key,uploadId}=await this.initMultipart(file.name,folder);
    const totalChunks=Math.ceil(file.size/this.chunkSize);
    const parts=new Array(totalChunks);
    let totalLoaded=0;
    if(progWrap){progWrap.style.display='block';}
    const update=(loaded)=>{
      if(!progWrap)return;
      const fill=progWrap.querySelector('.prog-fill');const text=progWrap.querySelector('.prog-text');
      if(fill)fill.style.width=Math.round((loaded/file.size)*100)+'%';
      if(text)text.textContent=`STREAM ${Math.round((loaded/file.size)*100)}% ${(loaded/1024/1024).toFixed(1)}/${(file.size/1024/1024).toFixed(1)}MB • ${parts.filter(Boolean).length}/${totalChunks} chunks ✓ Standard`;
    };
    for(let i=0;i<totalChunks;i++){
      const start=i*this.chunkSize;const chunk=file.slice(start,Math.min(start+this.chunkSize,file.size));
      const etag=await this.uploadPartSequential(key,uploadId,i+1,chunk,(partLoaded)=>{ update(totalLoaded+partLoaded); });
      totalLoaded+=chunk.size;
      parts[i]={partNumber:i+1,etag};
      update(totalLoaded);
    }
    return await this.completeMultipart(key,uploadId,parts);
  }
}

const uploader=new BeastFinalUploaderFixed(BEATS_API);

function ensureModalHTML(){
  const modal=document.getElementById('editModal');
  if(!modal)return null;
  if(modal.querySelector('.edit-modal-box'))return modal;
  modal.innerHTML=`
  <div class="edit-modal-box">
    <div class="edit-modal-header" style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid #222;background:#0e0e0e">
      <h3 style="margin:0;font-size:14px;color:#fff"><i class="fa-solid fa-pen-to-square" style="color:#00ff88"></i> Edit Beat — V16 FIXED Standard Save</h3>
      <button id="editModalClose" style="background:#111;border:1px solid #333;color:#fff;width:28px;height:28px;border-radius:6px;cursor:pointer">✕</button>
    </div>
    <div class="edit-modal-body" style="padding:18px;max-height:70vh;overflow:auto">
      <div class="edit-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="edit-field"><label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Title *</label><input id="editTitle" style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:8px;border-radius:6px"></div>
        <div class="edit-field"><label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Artist</label><input id="editArtist" style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:8px;border-radius:6px"></div>
        <div class="edit-field"><label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Price ($)</label><input id="editPrice" type="number" step="0.01" style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:8px;border-radius:6px"></div>
        <div class="edit-field"><label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Revenue ($)</label><input id="editRevenue" type="number" step="0.01" style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:8px;border-radius:6px"></div>
        <div class="edit-field"><label style="font-size:11px;color:#888;display:block;margin-bottom:4px">BPM</label><input id="editBpm" type="number" style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:8px;border-radius:6px"></div>
        <div class="edit-field"><label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Key</label><input id="editKey" placeholder="Gm" style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:8px;border-radius:6px"></div>
        <div class="edit-field"><label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Genre</label><input id="editGenre" list="genreList" style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:8px;border-radius:6px"><datalist id="genreList"><option value="Trap"><option value="Drill"><option value="Afro"><option value="R&B"><option value="Boom Bap"><option value="Plugg"><option value="Other"></datalist></div>
        <div class="edit-field"><label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Monetization</label><select id="editMode" style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:8px;border-radius:6px"><option value="paid">💲 Paid</option><option value="hybrid">🏷️ Tagged Free</option><option value="free">🎁 FREE</option></select></div>
        <div class="edit-field" style="grid-column:1/-1"><label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Tags</label><input id="editTags" style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:8px;border-radius:6px"></div>
      </div>
      <div class="edit-field" style="margin-top:12px"><label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Description</label><textarea id="editDesc" rows="3" style="width:100%;background:#111;border:1px solid #333;color:#fff;padding:8px;border-radius:6px"></textarea></div>
      <div class="edit-upload-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px">
        <div class="upload-box" style="background:#0f0f0f;padding:12px;border-radius:10px;border:1px solid #222">
          <label style="font-size:11px;color:#aaa;display:block;margin-bottom:6px">Cover → covers/</label><input type="file" id="editCoverFile" accept="image/*" style="width:100%;font-size:11px"><div id="editCoverPreview" style="margin-top:8px"></div><div id="editCoverName" style="font-size:10px;color:#888;margin-top:6px"></div><a id="editCoverDownload" href="#" target="_blank" style="font-size:10px;color:#8b5cf6;display:none">⬇ Download</a><div id="progCover" style="display:none;margin-top:8px"><div style="height:6px;background:#222;border-radius:4px;overflow:hidden"><div class="prog-fill" style="height:100%;width:0%;background:#00ff88"></div></div><span class="prog-text" style="font-size:10px;color:#888">0%</span></div>
        </div>
        <div class="upload-box" style="background:#0f0f0f;padding:12px;border-radius:10px;border:1px solid #222">
          <label style="font-size:11px;color:#aaa;display:block;margin-bottom:6px">MP3 → beats/</label><input type="file" id="editAudioFile" accept="audio/*" style="width:100%;font-size:11px"><div id="editAudioName" style="font-size:10px;color:#888;margin-top:6px"></div><audio id="editAudioPreview" controls style="width:100%;margin-top:6px;height:32px"></audio><a id="editAudioDownload" href="#" target="_blank" style="font-size:10px;color:#8b5cf6;display:none">⬇ Download MP3</a><div id="progAudio" style="display:none;margin-top:8px"><div style="height:6px;background:#222;border-radius:4px;overflow:hidden"><div class="prog-fill" style="height:100%;width:0%;background:#00f2ff"></div></div><span class="prog-text" style="font-size:10px;color:#888">0%</span></div>
        </div>
        <div class="upload-box" style="background:#0f0f0f;padding:12px;border-radius:10px;border:1px solid #222">
          <label style="font-size:11px;color:#aaa;display:block;margin-bottom:6px">WAV → wavs/ (STREAM 5MB Standard)</label><input type="file" id="editWavFile" accept=".wav,audio/wav" style="width:100%;font-size:11px"><div id="editWavName" style="font-size:10px;color:#888;margin-top:6px"></div><a id="editWavDownload" href="#" target="_blank" style="font-size:10px;color:#8b5cf6;display:none">⬇ Download WAV</a><div id="progWav" style="display:none;margin-top:8px"><div style="height:6px;background:#222;border-radius:4px;overflow:hidden"><div class="prog-fill" style="height:100%;width:0%;background:#f59e0b"></div></div><span class="prog-text" style="font-size:10px;color:#888">0%</span></div>
        </div>
        <div class="upload-box" style="background:#0f0f0f;padding:12px;border-radius:10px;border:1px solid #222">
          <label style="font-size:11px;color:#aaa;display:block;margin-bottom:6px">ZIP → projects/ (Standard Save - Fixed)</label><input type="file" id="editZipFile" accept=".zip" style="width:100%;font-size:11px"><div id="editZipName" style="font-size:10px;color:#888;margin-top:6px"></div><a id="editZipDownload" href="#" target="_blank" style="font-size:10px;color:#8b5cf6;display:none">⬇ Download ZIP</a><div id="progZip" style="display:none;margin-top:8px"><div style="height:6px;background:#222;border-radius:4px;overflow:hidden"><div class="prog-fill" style="height:100%;width:0%;background:#a855f7"></div></div><span class="prog-text" style="font-size:10px;color:#888">0%</span></div>
        </div>
      </div>
      <div id="editStatus" style="margin-top:14px;padding:10px;background:#111;border:1px solid #222;border-radius:8px;font-size:11px;color:#00ff88">V16 FIXED - Zip saved as Standard like Juicy Stems.zip 49MB test</div>
    </div>
    <div class="edit-modal-footer" style="padding:14px 18px;border-top:1px solid #222;display:flex;gap:8px;justify-content:flex-end;background:#0e0e0e">
      <button id="editCancel" style="padding:8px 14px;background:#111;border:1px solid #333;color:#fff;border-radius:6px;cursor:pointer">Cancel</button>
      <button id="editDeleteBtn" style="padding:8px 14px;background:#ff3b3b;border:none;color:#fff;border-radius:6px;cursor:pointer">Delete Beat</button>
      <button id="editSave" style="padding:8px 18px;background:#00ff88;border:none;color:#000;border-radius:6px;cursor:pointer;font-weight:700">Save V16 FIXED</button>
    </div>
  </div>`;
  return document.getElementById('editModal');
}
function bindFileInput(fileId,nameId,previewId,folderLabel){
  const modal=document.getElementById('editModal');
  const input=qs(`#${fileId}`,modal);
  if(!input)return;
  input.onchange=(e)=>{
    const f=e.target.files[0];if(!f)return;
    const nameEl=qs(`#${nameId}`,modal);
    if(nameEl)nameEl.textContent=`NEW: ${f.name} → ${folderLabel}/ (${(f.size/1024/1024).toFixed(2)} MB) ${f.size>90*1024*1024?'• STREAM 5MB Standard':'(Standard)'}`;
    if(previewId){const prev=qs(`#${previewId}`,modal);if(prev){if(prev.tagName==='DIV'&&f.type.startsWith('image/'))prev.innerHTML=`<img src="${URL.createObjectURL(f)}" style="width:100%;max-height:120px;object-fit:cover;border-radius:6px">`;else if(prev.tagName==='AUDIO'){prev.src=URL.createObjectURL(f);prev.style.display='block';}}}
  };
}
export function openEditModal(beat){
  editingBeat=beat;
  const modal=ensureModalHTML();if(!modal)return;
  qs('#editTitle',modal).value=beat.title||'';qs('#editArtist',modal).value=beat.artist||'DopeTone';qs('#editPrice',modal).value=beat.price??29.99;qs('#editRevenue',modal).value=beat.revenue??beat.real_revenue??0;qs('#editBpm',modal).value=beat.bpm||'';qs('#editKey',modal).value=beat.key||'';qs('#editGenre',modal).value=beat.genre||'';qs('#editMode',modal).value=beat.monetization_mode||(beat.has_free_tagged?'hybrid':'paid');qs('#editTags',modal).value=beat.tags||'';qs('#editDesc',modal).value=beat.description||'';
  const coverUrl=beat.cover_url||'';const mp3Url=beat.mp3_url||beat.audio_url||'';const wavUrl=beat.wav_url||'';const zipUrl=beat.zip_url||beat.project_url||'';
  qs('#editCoverPreview',modal).innerHTML=coverUrl?`<img src="${coverUrl}" style="width:100%;max-height:120px;object-fit:cover;border-radius:6px">`:'<span style="color:#555;font-size:11px">No cover</span>';
  qs('#editCoverName',modal).textContent=coverUrl?`Current: ${coverUrl.split('/').pop()}`:'No cover';const cd=qs('#editCoverDownload',modal);cd.href=coverUrl||'#';cd.style.display=coverUrl?'inline-flex':'none';
  const ap=qs('#editAudioPreview',modal);ap.src=mp3Url;ap.style.display=mp3Url?'block':'none';qs('#editAudioName',modal).textContent=mp3Url?`Current: ${mp3Url.split('/').pop()}`:'No MP3';const ad=qs('#editAudioDownload',modal);ad.href=mp3Url||'#';ad.style.display=mp3Url?'inline-flex':'none';
  qs('#editWavName',modal).textContent=wavUrl?`Current: ${wavUrl.split('/').pop()}`:'No WAV';const wd=qs('#editWavDownload',modal);wd.href=wavUrl||'#';wd.style.display=wavUrl?'inline-flex':'none';
  qs('#editZipName',modal).textContent=zipUrl?`Current: ${zipUrl.split('/').pop()}`:'No ZIP';const zd=qs('#editZipDownload',modal);zd.href=zipUrl||'#';zd.style.display=zipUrl?'inline-flex':'none';
  ['progCover','progAudio','progWav','progZip'].forEach(id=>{const el=qs('#'+id,modal);if(el){el.style.display='none';const f=el.querySelector('.prog-fill');if(f)f.style.width='0%';}});
  qs('#editStatus',modal).textContent=`V16 FIXED Standard Save - Editing ${beat.id} - zip <90MB = Standard like Juicy Stems.zip test`;
  modal.classList.add('active');document.body.classList.add('modal-open');
  qs('#editModalClose',modal).onclick=closeEditModal;qs('#editCancel',modal).onclick=closeEditModal;modal.onclick=(e)=>{if(e.target===modal)closeEditModal();};
  bindFileInput('editCoverFile','editCoverName','editCoverPreview','covers');bindFileInput('editAudioFile','editAudioName','editAudioPreview','beats');bindFileInput('editWavFile','editWavName',null,'wavs');bindFileInput('editZipFile','editZipName',null,'projects');
  qs('#editDeleteBtn',modal).onclick=()=>deleteBeat(beat.id);qs('#editSave',modal).onclick=saveEdit;
}
export function closeEditModal(){const m=document.getElementById('editModal');if(m)m.classList.remove('active');document.body.classList.remove('modal-open');document.body.style.overflow='';editingBeat=null;}
async function saveEdit(){
  if(!editingBeat)return;const modal=document.getElementById('editModal');const status=qs('#editStatus',modal);const btn=qs('#editSave',modal);if(btn.disabled)return;const orig=btn.textContent;
  btn.disabled=true;btn.textContent='V16 FIXED Saving Standard...';status.textContent='V16 FIXED: zip <90MB = Standard Save...';status.style.color='#00ff88';
  try{
    let coverUrl,mp3Url,wavUrl,zipUrl;
    const cf=qs('#editCoverFile',modal).files[0];if(cf){status.textContent=`Cover ${(cf.size/1024/1024).toFixed(2)} MB Standard...`;coverUrl=await uploader.uploadHuge(cf,'covers',qs('#progCover',modal));}
    const af=qs('#editAudioFile',modal).files[0];if(af){status.textContent=`MP3 ${(af.size/1024/1024).toFixed(2)} MB...`;mp3Url=await uploader.uploadHuge(af,'beats',qs('#progAudio',modal));}
    const wf=qs('#editWavFile',modal).files[0];if(wf){status.textContent=`WAV ${(wf.size/1024/1024).toFixed(2)} MB Standard...`;wavUrl=await uploader.uploadHuge(wf,'wavs',qs('#progWav',modal));}
    const zf=qs('#editZipFile',modal).files[0];if(zf){status.textContent=`ZIP ${(zf.size/1024/1024).toFixed(2)} MB Standard Save...`;zipUrl=await uploader.uploadHuge(zf,'projects',qs('#progZip',modal));}
    status.textContent='Saving to D1...';
    const payload={title:qs('#editTitle',modal).value.trim(),artist:qs('#editArtist',modal).value.trim(),price:parseFloat(qs('#editPrice',modal).value)||0,revenue:parseFloat(qs('#editRevenue',modal).value)||0,real_revenue:parseFloat(qs('#editRevenue',modal).value)||0,bpm:qs('#editBpm',modal).value?parseInt(qs('#editBpm',modal).value):null,key:qs('#editKey',modal).value.trim(),genre:qs('#editGenre',modal).value.trim(),monetization_mode:qs('#editMode',modal).value,has_free_tagged:qs('#editMode',modal).value==='hybrid'?1:0,tags:qs('#editTags',modal).value,description:qs('#editDesc',modal).value,...(coverUrl&&{cover_url:coverUrl}),...(mp3Url&&{mp3_url:mp3Url,audio_url:mp3Url}),...(wavUrl&&{wav_url:wavUrl}),...(zipUrl&&{zip_url:zipUrl,project_url:zipUrl})};
    const res=await fetch(`${BEATS_API}/beats/${editingBeat.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const txt=await res.text();let data;try{data=JSON.parse(txt);}catch{throw new Error(`Save HTTP ${res.status}: ${txt.slice(0,600)}`);}if(!res.ok)throw new Error(data.error||`HTTP ${res.status}`);
    const updated=data;const newAll=allBeats.map(b=>String(b.id)===String(editingBeat.id)?updated:b);setAllBeats(newAll);setFilteredBeats(newAll);renderBeatsTable(newAll);
    status.textContent=`✅ V16 FIXED SAVED Standard`;status.style.color='#00ff88';setTimeout(()=>{closeEditModal();btn.disabled=false;btn.textContent=orig;},1000);
  }catch(err){status.textContent='❌ '+err.message;status.style.color='#ff5050';btn.disabled=false;btn.textContent=orig;console.error('[EDIT V16]',err);}
}
async function deleteBeat(id){
  if(!confirm(`Delete beat ${id} forever?`))return;
  const modal=document.getElementById('editModal');const status=qs('#editStatus',modal);status.textContent='Deleting...';
  try{const res=await fetch(`${BEATS_API}/beats/${id}`,{method:'DELETE'});const data=await res.json();if(!res.ok)throw new Error(data.error||'Delete failed');const newAll=allBeats.filter(b=>String(b.id)!==String(id));setAllBeats(newAll);setFilteredBeats(newAll);renderBeatsTable(newAll);status.textContent='✅ Deleted';setTimeout(closeEditModal,500);}catch(e){status.textContent='❌ '+e.message;status.style.color='#ff5050';}
}
window.addEventListener('cc_edit_beat',(e)=>{const b=allBeats.find(x=>String(x.id)===String(e.detail));if(b)openEditModal(b);});
window.ccEditBeat=(id)=>{const b=allBeats.find(x=>String(x.id)===String(id));if(b)openEditModal(b);};
window.openEditModalDirect=openEditModal;



//⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️this is not in use its just a backup script for edit modal