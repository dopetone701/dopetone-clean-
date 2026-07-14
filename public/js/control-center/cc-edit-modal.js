// cc-edit-modal.js - FINAL PRO - hybrid + revenue + instant sync + no lock bug
import { BEATS_API, allBeats, setAllBeats, setFilteredBeats } from './cc-config.js';
import { renderBeatsTable } from './cc-beats-table.js';

let editingBeat = null;
function qs(sel, root = document) { return root.querySelector(sel); }

function ensureModalHTML() {
  const modal = document.getElementById('editModal');
  if (!modal) return null;
  if (modal.querySelector('.edit-modal-box')) return modal;

  modal.innerHTML = `
  <div class="edit-modal-box" style="max-height:92vh;overflow-y:auto;background:#111;border:1px solid #222">
    <div class="edit-modal-header" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #222">
      <h3><i class="fa-solid fa-pen-to-square"></i> Edit Beat — All Files</h3>
      <button id="editModalClose" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer">✕</button>
    </div>
    <div class="edit-modal-body" style="padding:16px">
      <div class="edit-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="edit-field"><label>Title *</label><input id="editTitle" style="width:100%"></div>
        <div class="edit-field"><label>Artist</label><input id="editArtist" style="width:100%"></div>
        <div class="edit-field"><label>Price ($) *</label><input id="editPrice" type="number" step="0.01" style="width:100%"></div>
        <div class="edit-field"><label>Revenue ($) *</label><input id="editRevenue" type="number" step="0.01" style="width:100%"></div>
        <div class="edit-field"><label>BPM</label><input id="editBpm" type="number" style="width:100%"></div>
        <div class="edit-field"><label>Key</label><input id="editKey" style="width:100%"></div>
        <div class="edit-field"><label>Genre</label><select id="editGenre" style="width:100%"><option value="">Select</option><option>Trap</option><option>Drill</option><option>Afro</option><option>R&B</option><option>Boom Bap</option><option>Plugg</option><option>Other</option></select></div>
        <div class="edit-field"><label>Monetization *</label>
          <select id="editMode" style="width:100%">
            <option value="paid">💲 Paid Only</option>
            <option value="hybrid">🏷️ Tagged Free (Hybrid)</option>
            <option value="free">🎁 FREE</option>
          </select>
        </div>
        <div class="edit-field" style="grid-column:1/-1"><label>Tags</label><input id="editTags" placeholder="dark, melodic" style="width:100%"></div>
      </div>
      <div class="edit-field" style="margin-top:12px"><label>Description</label><textarea id="editDesc" rows="3" style="width:100%"></textarea></div>

      <div class="edit-upload-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px">
        <div class="upload-box" style="border:1px solid #222;padding:10px;border-radius:8px">
          <label>Cover → covers/</label><input type="file" id="editCoverFile" accept="image/*">
          <div class="upload-preview" id="editCoverPreview" style="margin-top:8px"></div>
          <div id="editCoverName" style="font-size:11px;color:#888;margin-top:6px;word-break:break-all"></div>
          <a id="editCoverDownload" href="#" target="_blank" download style="display:none;margin-top:6px;font-size:11px;padding:6px 10px;border:1px solid #333;border-radius:6px;text-decoration:none;color:#fff;background:#222">⬇ Download Cover</a>
        </div>
        <div class="upload-box" style="border:1px solid #222;padding:10px;border-radius:8px">
          <label>Preview MP3 → beats/</label><input type="file" id="editAudioFile" accept="audio/*,.mp3">
          <div id="editAudioName" style="font-size:11px;color:#888;margin-top:6px;word-break:break-all"></div>
          <audio id="editAudioPreview" controls style="width:100%;margin-top:8px;display:none"></audio>
          <a id="editAudioDownload" href="#" target="_blank" download style="display:none;margin-top:6px;font-size:11px;padding:6px 10px;border:1px solid #333;border-radius:6px;text-decoration:none;color:#fff;background:#222">⬇ Download MP3</a>
        </div>
        <div class="upload-box" style="border:1px solid #222;padding:10px;border-radius:8px">
          <label>Full WAV → wavs/</label><input type="file" id="editWavFile" accept=".wav,audio/wav">
          <div id="editWavName" style="font-size:11px;color:#888;margin-top:6px;word-break:break-all"></div>
          <a id="editWavDownload" href="#" target="_blank" download style="display:none;margin-top:6px;font-size:11px;padding:6px 10px;border:1px solid #333;border-radius:6px;text-decoration:none;color:#fff;background:#222">⬇ Download WAV</a>
        </div>
        <div class="upload-box" style="border:1px solid #222;padding:10px;border-radius:8px">
          <label>Project ZIP → projects/</label><input type="file" id="editZipFile" accept=".zip,.rar,.flp,.als">
          <div id="editZipName" style="font-size:11px;color:#888;margin-top:6px;word-break:break-all"></div>
          <a id="editZipDownload" href="#" target="_blank" download style="display:none;margin-top:6px;font-size:11px;padding:6px 10px;border:1px solid #333;border-radius:6px;text-decoration:none;color:#fff;background:#222">⬇ Download ZIP</a>
        </div>
      <div class="edit-status" id="editStatus" style="margin-top:14px;color:#888;font-size:12px">Ready</div>
    </div>
    <div class="edit-modal-footer" style="display:flex;gap:8px;justify-content:flex-end;padding:12px 16px;border-top:1px solid #222">
      <button class="btn-ghost" id="editCancel" style="padding:8px 14px;border:1px solid #333;border-radius:6px;background:#111;color:#fff;cursor:pointer">Cancel</button>
      <button class="btn-danger" id="editDeleteBtn" style="padding:8px 14px;border:none;border-radius:6px;background:#ff3b3b;color:#fff;cursor:pointer">Delete Beat</button>
      <button class="btn-primary" id="editSave" style="padding:8px 14px;border:none;border-radius:6px;background:#fff;color:#000;cursor:pointer">Save Changes</button>
    </div>
  </div>`;
  return modal;
}

function bindFileInput(fileId, nameId, previewId, folderLabel) {
  const modal = document.getElementById('editModal');
  const input = qs(`#${fileId}`, modal);
  if (!input) return;
  input.onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const nameEl = qs(`#${nameId}`, modal);
    if (nameEl) nameEl.textContent = `New: ${f.name} → ${folderLabel}/ (${(f.size/1024/1024).toFixed(2)} MB)`;
    if (previewId) {
      const prev = qs(`#${previewId}`, modal);
      if (prev) {
        if (prev.tagName === 'DIV') {
          if (f.type.startsWith('image/')) prev.innerHTML = `<img src="${URL.createObjectURL(f)}" style="width:80px;height:80px;object-fit:cover;border-radius:8px">`;
        } else if (prev.tagName === 'AUDIO') {
          prev.src = URL.createObjectURL(f); prev.style.display = 'block';
        }
      }
    }
  };
}

export function openEditModal(beat) {
  editingBeat = beat;
  const modal = ensureModalHTML();
  if (!modal) return;

  qs('#editTitle', modal).value = beat.title || '';
  qs('#editArtist', modal).value = beat.artist || 'DopeTone';
  qs('#editPrice', modal).value = beat.price ?? 29.99;
  qs('#editRevenue', modal).value = beat.revenue ?? 0;
  qs('#editBpm', modal).value = beat.bpm || '';
  qs('#editKey', modal).value = beat.key || '';
  qs('#editGenre', modal).value = beat.genre || '';
  qs('#editMode', modal).value = beat.monetization_mode || (beat.has_free_tagged ? 'hybrid' : 'paid');
  qs('#editTags', modal).value = beat.tags || '';
  qs('#editDesc', modal).value = beat.description || '';

  const coverUrl = beat.cover_url || '';
  const mp3Url = beat.mp3_url || beat.audio_url || '';
  const wavUrl = beat.wav_url || '';
  const zipUrl = beat.zip_url || beat.project_url || '';

  qs('#editCoverPreview', modal).innerHTML = coverUrl ? `<img src="${coverUrl}" style="width:80px;height:80px;object-fit:cover;border-radius:8px">` : '<span style="color:#555">No cover</span>';
  qs('#editCoverName', modal).textContent = coverUrl ? `Current: ${coverUrl.split('/').pop()}` : 'No cover';
  const cd = qs('#editCoverDownload', modal); cd.href = coverUrl || '#'; cd.style.display = coverUrl ? 'inline-block' : 'none';

  const ap = qs('#editAudioPreview', modal);
  ap.src = mp3Url; ap.style.display = mp3Url ? 'block' : 'none';
  qs('#editAudioName', modal).textContent = mp3Url ? `Current: ${mp3Url.split('/').pop()}` : 'No MP3';
  const ad = qs('#editAudioDownload', modal); ad.href = mp3Url || '#'; ad.style.display = mp3Url ? 'inline-block' : 'none';

  qs('#editWavName', modal).textContent = wavUrl ? `Current: ${wavUrl.split('/').pop()}` : 'No WAV — wavs/';
  const wd = qs('#editWavDownload', modal); wd.href = wavUrl || '#'; wd.style.display = wavUrl ? 'inline-block' : 'none';

  qs('#editZipName', modal).textContent = zipUrl ? `Current: ${zipUrl.split('/').pop()}` : 'No ZIP — projects/';
  const zd = qs('#editZipDownload', modal); zd.href = zipUrl || '#'; zd.style.display = zipUrl ? 'inline-block' : 'none';

  const status = qs('#editStatus', modal);
  status.textContent = `Editing ${beat.id} — ${beat.monetization_mode || 'paid'} — $${beat.revenue || 0}`;
  status.style.color = '#888';

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  qs('#editModalClose', modal).onclick = closeEditModal;
  qs('#editCancel', modal).onclick = closeEditModal;
  modal.onclick = (e) => { if (e.target === modal) closeEditModal(); };

  bindFileInput('editCoverFile', 'editCoverName', 'editCoverPreview', 'covers');
  bindFileInput('editAudioFile', 'editAudioName', 'editAudioPreview', 'beats');
  bindFileInput('editWavFile', 'editWavName', null, 'wavs');
  bindFileInput('editZipFile', 'editZipName', null, 'projects');

  qs('#editMode', modal).onchange = (e) => {
    const mode = e.target.value;
    const priceInput = qs('#editPrice', modal);
    if (mode === 'free') {
      if (priceInput.value != 0) priceInput.dataset.prev = priceInput.value;
      priceInput.value = 0;
      status.textContent = 'Mode: FREE - will show as FREE in player';
      status.style.color = '#3b82f6';
    } else if (mode === 'hybrid') {
      if (priceInput.dataset.prev && priceInput.value == 0) priceInput.value = priceInput.dataset.prev;
      status.textContent = 'Mode: TAGGED FREE - free with tag + paid without';
      status.style.color = '#f59e0b';
    } else {
      if (priceInput.value == 0) priceInput.value = priceInput.dataset.prev || 29.99;
      status.textContent = 'Mode: PAID - paid only';
      status.style.color = '#10b981';
    }
  };

  qs('#editDeleteBtn', modal).onclick = () => deleteBeat(beat.id);
  qs('#editSave', modal).onclick = saveEdit;
}

export function closeEditModal() {
  const modal = document.getElementById('editModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
  editingBeat = null;
}

async function saveEdit() {
  if (!editingBeat) return;
  const modal = document.getElementById('editModal');
  const status = qs('#editStatus', modal);
  const btn = qs('#editSave', modal);
  if (btn.disabled) return;
  const origText = btn.textContent;

  btn.disabled = true;
  btn.textContent = 'Uploading...';
  status.textContent = 'Saving to D1 + R2 (beats/covers/wavs/projects)...';
  status.style.color = '#888';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const fd = new FormData();
    fd.append('title', qs('#editTitle', modal).value.trim());
    fd.append('artist', qs('#editArtist', modal).value.trim());
    fd.append('price', qs('#editPrice', modal).value);
    fd.append('revenue', qs('#editRevenue', modal).value);
    fd.append('bpm', qs('#editBpm', modal).value);
    fd.append('key', qs('#editKey', modal).value);
    fd.append('genre', qs('#editGenre', modal).value);
    const mode = qs('#editMode', modal).value;
    fd.append('monetization_mode', mode);
    fd.append('has_free_tagged', mode === 'hybrid' ? '1' : '0');
    fd.append('tags', qs('#editTags', modal).value);
    fd.append('description', qs('#editDesc', modal).value);

    const cf = qs('#editCoverFile', modal).files[0]; if (cf) fd.append('cover', cf);
    const af = qs('#editAudioFile', modal).files[0]; if (af) fd.append('audio', af);
    const wf = qs('#editWavFile', modal).files[0]; if (wf) fd.append('wav', wf);
    const zf = qs('#editZipFile', modal).files[0]; if (zf) fd.append('zip', zf);

    const res = await fetch(`${BEATS_API}/beats/${editingBeat.id}`, { method: 'PUT', body: fd, signal: controller.signal });
    clearTimeout(timeout);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

    // INSTANT UI UPDATE - NO REFRESH NEEDED
    const updated = data.beat;
    const newAll = allBeats.map(b => String(b.id) === String(editingBeat.id) ? updated : b);
    setAllBeats(newAll);
    setFilteredBeats(newAll);
    renderBeatsTable(newAll);

    status.textContent = `✅ Saved - ${updated.monetization_mode.toUpperCase()} - $${updated.revenue}`;
    status.style.color = '#00ff88';

    setTimeout(() => {
      closeEditModal();
      btn.disabled = false;
      btn.textContent = origText;
    }, 500);

  } catch (err) {
    clearTimeout(timeout);
    console.error(err);
    status.textContent = '❌ ' + (err.name === 'AbortError' ? 'Upload timed out (file too big) - try smaller file' : err.message);
    status.style.color = '#ff5050';
    btn.disabled = false;
    btn.textContent = origText;
  }
}

async function deleteBeat(id) {
  const modal = document.getElementById('editModal');
  const status = qs('#editStatus', modal);
  const btn = qs('#editDeleteBtn', modal);
  if (!confirm(`Delete beat ${id} forever? This deletes from R2 (covers/beats/wavs/projects) + D1`)) return;
  btn.disabled = true;
  if (status) status.textContent = 'Deleting from R2 + D1...';
  try {
    const res = await fetch(`${BEATS_API}/beats/${id}`, { method: 'DELETE' });
    const txt = await res.text();
    let data; try { data = JSON.parse(txt); } catch { data = { raw: txt }; }
    if (!res.ok) throw new Error(data.error || txt || 'Delete failed');
    const newAll = allBeats.filter(b => String(b.id) !== String(id));
    setAllBeats(newAll);
    setFilteredBeats(newAll);
    renderBeatsTable(newAll);
    closeEditModal();
  } catch (e) {
    if (status) { status.textContent = '❌ ' + e.message; status.style.color = '#ff5050'; }
    alert('Delete failed: ' + e.message);
    btn.disabled = false;
  }
}

window.addEventListener('cc_edit_beat', (e) => { const b = allBeats.find(x => String(x.id) === String(e.detail)); if (b) openEditModal(b); });
window.ccEditBeat = (id) => { const b = allBeats.find(x => String(x.id) === String(id)); if (b) openEditModal(b); };
