// ===============================
// 🔥 DT VAULT ENGINE - NEW NAMESPACE
// ===============================
import { VAULT_KEY, getVaultPlaylists, saveVaultPlaylists } from "./dt-vault-storage.js"

function uid(){ return 'dt_' + Math.random().toString(36).slice(2,9) + Date.now().toString(36); }

export function createVaultPlaylist(name){
    if(!name || !name.trim()) return { ok:false, message:"Enter name" };
    const playlists = getVaultPlaylists();
    if(playlists.find(p=>p.name.toLowerCase()===name.toLowerCase().trim())) return { ok:false, message:"Already exists" };
    const pl = { id: uid(), name: name.trim(), isLiked:false, created: Date.now(), beats:[] };
    playlists.push(pl);
    saveVaultPlaylists(playlists);
    return { ok:true, playlist: pl };
}

export function addBeatToVault(playlistId, beat){
    const playlists = getVaultPlaylists();
    const pl = playlists.find(p=>p.id===playlistId);
    if(!pl) return { ok:false };
    const exists = pl.beats.find(b=>String(b.id)===String(beat.id));
    if(exists){
        pl.beats = pl.beats.filter(b=>String(b.id)!==String(beat.id));
        saveVaultPlaylists(playlists);
        return { ok:true, removed:true };
    } else {
        pl.beats.unshift(beat);
        saveVaultPlaylists(playlists);
        return { ok:true, added:true };
    }
}

export function removeBeatFromVault(playlistId, beatId){
    const playlists = getVaultPlaylists();
    const pl = playlists.find(p=>p.id===playlistId);
    if(!pl) return;
    pl.beats = pl.beats.filter(b=>String(b.id)!==String(beatId));
    saveVaultPlaylists(playlists);
}

window.createVaultPlaylist = createVaultPlaylist;
window.addBeatToVault = addBeatToVault;
