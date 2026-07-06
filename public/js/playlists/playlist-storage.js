// ===============================
// 🎵 DOPE TONE STORAGE ENGINE
// FINAL CLEAN VERSION
// ===============================


// ===============================
// 🔑 STORAGE KEYS
// ===============================
export const PLAYLIST_KEY =
"dopetone_playlists"


export const LIKED_KEY =
"liked_beats"


// ===============================
// 📦 GET PLAYLISTS
// ===============================
export function getPlaylists(){


    // ===========================
    // 📦 RAW PLAYLISTS
    // ===========================
    const raw =
    JSON.parse(
        localStorage.getItem(
            PLAYLIST_KEY
        )
    ) || []


    // ===========================
    // 🔥 SAFE CLONE
    // ===========================
    const playlists =
    structuredClone(raw)


    // ===========================
    // ❤️ LIKED IDS
    // ===========================
    const likedIds =
    (
        JSON.parse(
            localStorage.getItem(
                LIKED_KEY
            )
        ) || []
    ).map(String)


    // ===========================
    // 🌍 GLOBAL BEATS
    // ===========================
    const allBeats =
    window.allBeats || []


    // ===========================
    // ❤️ FIND LIKED PLAYLIST
    // ===========================
    let likedPlaylist =
    playlists.find(
        p => p.isLiked
    )


    // ===========================
    // ❤️ CREATE IF MISSING
    // ===========================
    if(!likedPlaylist){


        likedPlaylist = {


            id:
            "liked_playlist",


            name:
            "Liked",


            isLiked:
            true,


            created:
            Date.now(),


            beats:[]
        }


        playlists.unshift(
            likedPlaylist
        )


        savePlaylists(
            playlists
        )
    }


    // ===========================
    // 🔥 FORCE REAL LIKED BEATS
    // ===========================
    likedPlaylist.beats =
    allBeats.filter(
        beat =>
        likedIds.includes(
            String(beat.id)
        )
    )


    // ===========================
    // ✅ RETURN SAFE DATA
    // ===========================
    return playlists
}


// ===============================
// 💾 SAVE PLAYLISTS
// ===============================
export function savePlaylists(
    playlists
){


    if(!Array.isArray(playlists)){
        return
    }


    localStorage.setItem(
        PLAYLIST_KEY,
        JSON.stringify(playlists)
    )


    // 🔥 LIVE UPDATE EVENT
    window.dispatchEvent(
        new Event(
            "playlistsUpdated"
        )
    )
}


// ===============================
// ❤️ GET LIKED IDS
// ===============================
export function getLikedBeatIds(){


    return (
        JSON.parse(
            localStorage.getItem(
                LIKED_KEY
            )
        ) || []
    ).map(String)
}


// ===============================
// ❤️ SAVE LIKED IDS
// ===============================
export function saveLikedBeatIds(
    ids
){


    localStorage.setItem(
        LIKED_KEY,
        JSON.stringify(ids)
    )


    // 🔥 LIVE UPDATE EVENT
    window.dispatchEvent(
        new Event(
            "playlistsUpdated"
        )
    )
}


// ===============================
// ❤️ IS LIKED
// ===============================
export function isBeatLiked(
    beatId
){


    const liked =
    getLikedBeatIds()


    return liked.includes(
        String(beatId)
    )
}


// ===============================
// ❤️ TOGGLE LIKE
// ===============================
export function toggleLikedBeat(
    beat
){


    if(!beat?.id){
        return
    }


    let liked =
    getLikedBeatIds()


    const exists =
    liked.includes(
        String(beat.id)
    )


    // ===========================
    // ❌ REMOVE
    // ===========================
    if(exists){


        liked =
        liked.filter(
            id =>
            String(id)
            !==
            String(beat.id)
        )
    }


    // ===========================
    // ➕ ADD
    // ===========================
    else{


        liked.unshift(
            String(beat.id)
        )
    }


    saveLikedBeatIds(
        liked
    )


    return {


        liked:
        !exists
    }
}


// ===============================
// 🗑 DELETE PLAYLIST
// ===============================
export function deletePlaylist(
    playlistId
){


    if(
        playlistId ===
        "liked_playlist"
    ){
        return
    }


    let playlists =
    getPlaylists()


    playlists =
    playlists.filter(
        playlist =>
            playlist.id !==
            playlistId
    )


    savePlaylists(
        playlists
    )
}


// ===============================
// 🔍 GET SINGLE PLAYLIST
// ===============================
export function getPlaylist(
    playlistId
){


    const playlists =
    getPlaylists()


    return playlists.find(
        p =>
        p.id === playlistId
    )
}


// ===============================
// 🌍 GLOBALS
// ===============================
window.getPlaylists =
getPlaylists


window.savePlaylists =
savePlaylists


window.toggleLikedBeat =
toggleLikedBeat


window.deletePlaylist =
deletePlaylist


window.getPlaylist =
getPlaylist


window.isBeatLiked =
isBeatLiked

// ===============================
// 🎯 CAPSULE ENGINE
// ===============================
// ======================================
// ❤️ FIX LIKED PLAYLIST RENDER
// ======================================

function getLikedPlaylist(){

    const playlists =
    JSON.parse(
        localStorage.getItem("playlists")
    ) || []

    const liked =
    playlists.find(
        p => p.isLiked
    )

    return liked?.beats || []
}
