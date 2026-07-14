// cc-create-beat.js - PRO - beats/ covers/ wavs/ projects/
import { BEATS_API, allBeats, setAllBeats, setFilteredBeats } from './cc-config.js';
import { renderBeatsTable } from './cc-beats-table.js';

const DEFAULT_PRICE = 29.99;

class CreateBeatManager {
  constructor() {
    this.wired = false;
    this.modal = null;
  }

  getModal() {
    if (!this.modal) this.modal = document.getElementById('createModal');
    return this.modal;
  }

  by(id) {
    return this.getModal()?.querySelector(id);
  }

  wire() {
    if (this.wired) return;
    const modal = this.getModal();
    if (!modal) return;

    this.by('#createModalClose').onclick = () => this.close();
    this.by('#createCancel').onclick = () => this.close();
    modal.addEventListener('click', (e) => { if (e.target === modal) this.close(); });

    // Cover -> covers/
    this.by('#createCoverFile')?.addEventListener('change', (e) => {
      const f = e.target.files[0]; if (!f) return;
      this.by('#createCoverPreview').innerHTML = `<img src="${URL.createObjectURL(f)}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;margin-top:6px">`;
      const nameEl = this.by('#createCoverName');
      if (nameEl) nameEl.textContent = `covers/${f.name}`;
    });

    // MP3 -> beats/
    this.by('#createAudioFile')?.addEventListener('change', (e) => {
      const f = e.target.files[0]; if (!f) return;
      this.by('#createAudioName').textContent = `beats/${f.name} • ${(f.size/1024/1024).toFixed(2)} MB`;
      const ap = this.by('#createAudioPreview');
      if (ap) { ap.src = URL.createObjectURL(f); ap.style.display = 'block'; }
    });

    // WAV -> wavs/
    this.by('#createWavFile')?.addEventListener('change', (e) => {
      const f = e.target.files[0]; if (!f) return;
      this.by('#createWavName').textContent = `wavs/${f.name} • ${(f.size/1024/1024).toFixed(2)} MB`;
    });

    // ZIP -> projects/
    this.by('#createZipFile')?.addEventListener('change', (e) => {
      const f = e.target.files[0]; if (!f) return;
      this.by('#createZipName').textContent = `projects/${f.name} • ${(f.size/1024/1024).toFixed(2)} MB`;
    });

    this.by('#createSave').onclick = () => this.submit();
    modal.querySelectorAll('.price-preset').forEach(b => {
      b.onclick = () => { this.by('#createPrice').value = b.dataset.price; };
    });

    this.wired = true;
  }

  open() {
    const modal = this.getModal(); if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    this.wire();
    const s = this.by('#createStatus');
    if (s) { s.textContent = 'Ready — beats/ covers/ wavs/ projects/'; s.style.color = '#888'; }
  }

  close() {
    const modal = this.getModal();
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  async submit() {
    const modal = this.getModal();
    const status = this.by('#createStatus');
    const btn = this.by('#createSave');
    const val = (id) => this.by(id)?.value?.trim() || '';

    const payload = {
      title: val('#createTitle'),
      artist: val('#createArtist') || 'DopeTone',
      price: val('#createPrice') || DEFAULT_PRICE,
      bpm: val('#createBpm'),
      key: val('#createKey'),
      genre: val('#createGenre') || 'Trap',
      mood: val('#createMood') || '',
      type: val('#createType') || val('#createGenre') || 'Trap',
      mode: val('#createMode') || 'paid',
      tags: val('#createTags'),
      desc: val('#createDesc')
    };

    const coverFile = this.by('#createCoverFile')?.files[0];
    const audioFile = this.by('#createAudioFile')?.files[0];
    const wavFile = this.by('#createWavFile')?.files[0];
    const zipFile = this.by('#createZipFile')?.files[0];

    if (!payload.title ||!coverFile ||!audioFile) {
      status.textContent = '❌ Title + Cover + MP3 required'; status.style.color = '#ff5050'; return;
    }

    btn.disabled = true;
    const orig = btn.innerHTML;
    btn.innerHTML = 'Uploading...';
    status.textContent = 'Uploading to R2: beats/ covers/ wavs/ projects/...'; status.style.color = '#888';

    try {
      const fd = new FormData();
      fd.append('title', payload.title);
      fd.append('artist', payload.artist);
      fd.append('price', payload.price);
      fd.append('bpm', payload.bpm);
      fd.append('key', payload.key);
      fd.append('genre', payload.genre);
      fd.append('mood', payload.mood);
      fd.append('type', payload.type);
      fd.append('tags', payload.tags);
      fd.append('description', payload.desc);
      fd.append('monetization_mode', parseFloat(payload.price) === 0? 'free' : payload.mode);

      // CORRECT R2 KEYS
      fd.append('cover', coverFile); // -> covers/
      fd.append('audio', audioFile); // -> beats/ -> saves mp3_url + audio_url
      if (wavFile) fd.append('wav', wavFile); // -> wavs/
      if (zipFile) fd.append('zip', zipFile); // -> projects/

      const res = await fetch(`${BEATS_API}/beats`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const newBeat = data.beat || data;
      const updated = [newBeat,...allBeats];
      setAllBeats(updated);
      setFilteredBeats(updated);
      renderBeatsTable(updated);

      status.textContent = `✅ ${payload.title} created — $${payload.price}`; status.style.color = '#00ff88';
      setTimeout(() => {
        this.close();
        this.by('#createTitle').value = '';
        this.by('#createCoverPreview').innerHTML = '';
        const ap = this.by('#createAudioPreview'); if (ap) ap.style.display = 'none';
        modal.querySelector('form')?.reset();
      }, 800);

    } catch (err) {
      status.textContent = '❌ ' + err.message; status.style.color = '#ff5050';
      console.error('[CC Create]', err);
    } finally {
      btn.disabled = false; btn.innerHTML = orig;
    }
  }
}

const manager = new CreateBeatManager();
export const openCreate = () => manager.open();
export const closeCreate = () => manager.close();

// Single wire, no setInterval leak
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('createBeatBtn') || document.getElementById('ccCreateBeatBtn');
  if (btn) btn.onclick = () => manager.open();
});
