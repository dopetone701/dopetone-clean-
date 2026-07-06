// ===============================
// 🎵 PLAYLIST MODAL
// ===============================


import {
    createPlaylist,
    addBeatToPlaylist
}
from "./playlist-engine.js"


import {
    getPlaylists
}
from "./playlist-storage.js"






// ===============================
// 🎵 PLAYLIST TOAST
// ===============================
function showPlaylistToast(
    text = ""
){


    let toast =
    document.getElementById(
        "playlistToast"
    )


    if(!toast){


        toast =
        document.createElement("div")


        toast.id =
        "playlistToast"


        document.body.appendChild(
            toast
        )
    }


    toast.textContent = text


    toast.classList.add(
        "show"
    )


    clearTimeout(
        toast.__timer
    )


    toast.__timer =
    setTimeout(() => {


        toast.classList.remove(
            "show"
        )


    },2200)
}






// ===============================
// 🎵 CREATE PLAYLIST MODAL
// ===============================
export function openPlaylistModal(){


    closePlaylistModal()


    const modal =
    document.createElement("div")


    modal.id =
    "playlistModal"


    modal.innerHTML = `


    <div class="playlist-modal-backdrop"></div>


    <div class="playlist-modal-box">


        <div class="playlist-glow"></div>


        <h2>
            Create Playlist
        </h2>


        <p>
            Build your sound arsenal
        </p>


        <input
        id="playlistNameInput"
        type="text"
        maxlength="24"
        placeholder="Night Drive"
        />


        <div class="playlist-suggestions">


            <button>
                Dark Rage
            </button>


            <button>
                Night Drive
            </button>


            <button>
                808 Chaos
            </button>


            <button>
                Sad Piano
            </button>


        </div>


        <button id="createPlaylistBtn">
            Create Playlist
        </button>


        <div
        id="playlistError"
        class="playlist-error"
        ></div>


    </div>
    `


    document.body.appendChild(
        modal
    )






    // ===============================
    // ELEMENTS
    // ===============================
    const backdrop =
    modal.querySelector(
        ".playlist-modal-backdrop"
    )


    const input =
    document.getElementById(
        "playlistNameInput"
    )


    const createBtn =
    document.getElementById(
        "createPlaylistBtn"
    )


    const error =
    document.getElementById(
        "playlistError"
    )






    // ===============================
    // CLOSE
    // ===============================
    backdrop.onclick = () => {


        closePlaylistModal()
    }






    // ===============================
    // SUGGESTIONS
    // ===============================
    modal
    .querySelectorAll(
        ".playlist-suggestions button"
    )
    .forEach(btn => {


        btn.onclick = () => {


            input.value =
            btn.textContent.trim()
        }
    })






    // ===============================
    // CREATE
    // ===============================
    createBtn.onclick = () => {


        const name =
        input.value.trim()


        if(!name){


            error.textContent =
            "Enter playlist name"


            return
        }


        const result =
        createPlaylist(name)


        if(!result.ok){


            error.textContent =
            result.message


            return
        }
        // 🔥 AUTO ADD PENDING BEAT
if(window.__PENDING_PLAYLIST_BEAT__){


    addBeatToPlaylist(
        result.playlist.id,
        window.__PENDING_PLAYLIST_BEAT__
    )


    window.__PENDING_PLAYLIST_BEAT__ =
    null
}



        closePlaylistModal()



        showPlaylistToast(
            "Playlist created"
        )
    }
}






// ===============================
// ➕ ADD TO PLAYLIST MODAL
// ===============================
export function openAddToPlaylistModal(
    beat
){


    closePlaylistModal()






    // ===============================
    // 🔥 FILTER PLAYLISTS
    // REMOVE LIKED PLAYLIST
    // ===============================
    const playlists =
    getPlaylists().filter(
        playlist => {


            return (
                !playlist.isLiked
                &&
                playlist.id !==
                "liked_playlist"
            )
        }
    )






    const modal =
    document.createElement("div")


    modal.id =
    "playlistModal"






    modal.innerHTML = `


    <div class="playlist-modal-backdrop"></div>


    <div class="playlist-modal-box">


        <div class="playlist-glow"></div>


        <h2>
            Add To Playlist
        </h2>


        <div class="playlist-picker-list">


            ${
                playlists.map(
                    playlist => {


                        const exists =
                        playlist.beats.find(
                            b => b.id === beat.id
                        )


                        return `
                        <button
                        class="playlist-pick-item"
                        data-id="${playlist.id}"
                        >


                            <span>
                                ${playlist.name}
                            </span>


                            <span>
                                ${
                                    exists
                                    ? "✓ Added"
                                    : `${playlist.beats.length} tracks`
                                }
                            </span>


                        </button>
                        `
                    }
                ).join("")
            }


        </div>


        <button
        id="newPlaylistQuickBtn"
        class="create-new-playlist-btn"
        >
            + Create New Playlist
        </button>


    </div>
    `






    document.body.appendChild(
        modal
    )






    // ===============================
    // CLOSE
    // ===============================
    modal
    .querySelector(
        ".playlist-modal-backdrop"
    )
    .onclick = () => {


        closePlaylistModal()
    }






    // ===============================
    // PICK PLAYLIST
    // ===============================
    modal
    .querySelectorAll(
        ".playlist-pick-item"
    )
    .forEach(btn => {


        btn.onclick = () => {


            const playlistId =
            btn.dataset.id


            const result =
            addBeatToPlaylist(
                playlistId,
                beat
            )


            closePlaylistModal()


            const playlist =
playlists.find(
    p => p.id === playlistId
)


if(result?.removed){


    showPlaylistToast(
        `Removed from ${playlist.name}`
    )


}else{


    showPlaylistToast(
        `Added to ${playlist.name}`
    )
}

        }
    })






    // ===============================
    // CREATE NEW PLAYLIST
    // ===============================
    const quickBtn =
    document.getElementById(
        "newPlaylistQuickBtn"
    )


    quickBtn.onclick = () => {


        closePlaylistModal()


        setTimeout(() => {


            openPlaylistModal()


        },120)
    }
}






// ===============================
// ❌ CLOSE
// ===============================
export function closePlaylistModal(){


    const modal =
    document.getElementById(
        "playlistModal"
    )


    if(modal){


        modal.remove()
    }
}






// ===============================
// 🌍 GLOBALS
// ===============================
window.openPlaylistModal =
openPlaylistModal


window.openAddToPlaylistModal =
openAddToPlaylistModal


window.showPlaylistToast =
showPlaylistToast
