// ===============================
// 🎵 PLAYLIST RENDER FINAL FIXED
// ===============================


import {
    getPlaylists
}
from "./playlist-storage.js"




// ===============================
// 🎨 MAIN
// ===============================
export function renderPlaylists(){


    renderHomepagePlaylists()


    renderLicencePlaylists()
}




// ===============================
// 🏠 HOMEPAGE
// ===============================
export function renderHomepagePlaylists(){


    const mount =
    document.getElementById(
        "homepagePlaylists"
    )


    if(!mount) return


    const playlists =
    getPlaylists()


    // ===============================
// 🔥 FILTER PLAYLISTS
// ===============================
const filtered =
playlists.filter(playlist => {


    // ❤️ HIDE EMPTY LIKED
    if(playlist.isLiked){


        const likedIds =
        JSON.parse(
            localStorage.getItem(
                "liked_beats"
            )
        ) || []


        return likedIds.length > 0
    }


    // 🎵 KEEP NORMAL PLAYLISTS
    return true
})



    if(!filtered.length){


        mount.innerHTML = ""


        return
    }


    mount.innerHTML = `


    <section class="playlist-section">


        <div class="playlist-top">


            <h2 class="section-title fire-title">
                🎵 Your Playlists
            </h2>


        </div>


        <div class="playlist-grid">


            ${
                filtered
                .slice(0,9)
                .map(
                    renderPlaylistCard
                )
                .join("")
            }


        </div>


    </section>
    `


    setTimeout(() => {


        initPlaylistWaves()


    },120)
}




// ===============================
// 📜 LICENCE PAGE
// ===============================
export function renderLicencePlaylists(){


    const mount =
    document.getElementById(
        "licencePlaylists"
    )


    if(!mount) return


    const playlists =
    getPlaylists()


    const filtered =
    playlists.filter(playlist => {


        


        return true
    })


    if(!filtered.length){


        mount.innerHTML = ""


        return
    }


    mount.innerHTML = `


    <section class="playlist-section playlist-section-licence">


        <div class="playlist-top playlist-top-licence">


            <h2 class="playlist-title-licence">


                <span class="playlist-title-icon">
                    🎵
                </span>


                <span>
                    Your Playlists
                </span>


            </h2>


        </div>


        <div class="playlist-grid">


            ${
                filtered
                .slice(0,6)
                .map(
                    renderPlaylistCard
                )
                .join("")
            }


        </div>


    </section>
    `


    setTimeout(() => {


        initPlaylistWaves()


    },120)
}




// ===============================
// 🌊 WAVES
// ===============================
function initPlaylistWaves(){


    if(typeof WaveSurfer === "undefined")
    return


    const rows =
    document.querySelectorAll(
        ".playlist-row"
    )


    rows.forEach(row => {


        if(row.dataset.waveLoaded)
        return


        const waveContainer =
        row.querySelector(
            ".playlist-wave"
        )


        const trackBtn =
        row.querySelector(
            ".playlist-track-play"
        )


        if(!waveContainer || !trackBtn)
        return


        const realBeatId =
        trackBtn.dataset.realbeat


        const playlistId =
        trackBtn.dataset.playlist


        let beat = null


        getPlaylists().forEach(playlist => {


            if(playlist.id !== playlistId)
            return


            const found =
            playlist.beats.find(
                b => b.id == realBeatId
            )


            if(found){
                beat = found
            }
        })


        if(!beat?.mp3_url)
        return


        const wave =
        WaveSurfer.create({


            container: waveContainer,


            waveColor: "#1e293b",


            progressColor: "#ff003c",


            height: 40,


            normalize: true,


            fillParent: true,


            cursorWidth: 0,


            responsive: true,


            interact: true

        })


        wave.load(
            beat.mp3_url
        )
        // 🔥 SEEK WITHOUT BREAKING LIQUID WAVES
wave.on("click", (progress) => {


    const audio =
    window.__DOPE_TONE_AUDIO__


    if(!audio) return


    const duration =
    audio.duration || 0


    if(!duration) return


    audio.currentTime =
    duration * progress
})



        row.__wave = wave


        row.dataset.waveLoaded =
        "true"
    })
}




// ===============================
// 🎵 CARD
// ===============================
function renderPlaylistCard(
    playlist
){


    const beats =
    playlist.beats || []


    return `


    <div
    class="playlist-card"
    data-playlist="${playlist.id}"
    >


        <div class="playlist-card-top">


            <div>


                <div class="playlist-name">
                    ${playlist.name}
                </div>


                <div class="playlist-count">
                    ${beats.length} tracks
                </div>


            </div>


            <button
            class="playlist-play-btn"
            >
                ▶
            </button>


        </div>


        <div class="playlist-rows">


            ${
                beats.length


                ?


                beats.map((beat,index) => `


                <div class="playlist-row">


                    <div class="playlist-row-left">


                        <div class="playlist-cover-wrap">


                            <img
                            src="${
                                beat.cover_url ||
                                "images/logo.png"
                            }"
                            class="playlist-cover"
                            >


                        </div>


                        <div class="playlist-row-info">


                            <div class="playlist-track-title">
                                ${
                                    beat.title ||
                                    "Untitled"
                                }
                            </div>


                            <div class="playlist-track-meta">


                                <span>
                                    ${
                                        beat.genre ||
                                        "Trap"
                                    }
                                </span>


                                <span class="dot">
                                    •
                                </span>


                                <span>
                                    ${
                                        beat.bpm ||
                                        "140"
                                    } BPM
                                </span>


                            </div>


                        </div>


                    </div>


                    <div
                    class="wave-bar playlist-wave"
                    ></div>


                    <button
                    class="playlist-track-play"
                    data-playlist="${playlist.id}"
                    data-index="${index}"
                    data-realbeat="${beat.id}"
                    >
                        ▶
                    </button>


                </div>
                `).join("")


                :


                `
                <div class="playlist-empty">
                    No beats yet
                </div>
                `
            }


        </div>


        <div class="playlist-footer">


            <a
            href="playlists.html?id=${
                playlist.id
            }"
            class="playlist-open-btn"
            >
                Open Playlist
            </a>


            ${
                !playlist.isLiked


                ?


                `
                <button
                class="playlist-delete-btn"
                data-playlist="${
                    playlist.id
                }"
                >
                    🗑
                </button>
                `


                :


                ""
            }


        </div>


    </div>
    `
}




// ===============================
// 🔥 RESET UI
// ===============================
function resetPlaylistUI(){


    document
    .querySelectorAll(
        ".playlist-track-play"
    )
    .forEach(btn => {


        btn.classList.remove(
            "active"
        )


        btn.innerHTML = "▶"
    })


    document
    .querySelectorAll(
        ".playlist-play-btn"
    )
    .forEach(btn => {


        btn.classList.remove(
            "active"
        )


        btn.innerHTML = "▶"
    })
}




// ===============================
// 🔥 EVENTS
// ===============================
document.addEventListener(
    "click",
    e => {


        // 🗑 DELETE
        const deleteBtn =
        e.target.closest(
            ".playlist-delete-btn"
        )


        if(deleteBtn){


    const playlistId =
    deleteBtn.dataset.playlist


    const playlist =
    getPlaylists().find(
        p => p.id === playlistId
    )


    if(!playlist) return


    // ===============================
// 🔥 DELETE CONFIRM PANEL
// ===============================
const existingDelete =
document.getElementById(
    "deletePlaylistConfirm"
)


if(existingDelete){
    existingDelete.remove()
}


const confirmBox =
document.createElement("div")


confirmBox.id =
"deletePlaylistConfirm"


confirmBox.innerHTML = `


<div class="delete-confirm-backdrop"></div>


<div class="delete-confirm-panel">


    <div class="delete-confirm-glow"></div>


    <div class="delete-confirm-icon">
        🗑
    </div>


    <div class="delete-confirm-title">
        Delete Playlist
    </div>


    <div class="delete-confirm-text">


        "${playlist.name}" will be permanently removed.


    </div>


    <div class="delete-confirm-actions">


        <button class="delete-cancel-btn">
            Cancel
        </button>


        <button class="delete-confirm-btn">
            Delete
        </button>


    </div>


</div>
`


document.body.appendChild(
    confirmBox
)


// CLOSE
confirmBox
.querySelector(
    ".delete-confirm-backdrop"
)
.onclick = () => {


    confirmBox.remove()
}


// CANCEL
confirmBox
.querySelector(
    ".delete-cancel-btn"
)
.onclick = () => {


    confirmBox.remove()
}


// DELETE
confirmBox
.querySelector(
    ".delete-confirm-btn"
)
.onclick = () => {


    // 🔥 STOP ACTIVE PLAYLIST
    if(
        window.__CURRENT_LIST__ ===
        playlistId
    ){


        window.__DOPE_TONE_AUDIO__?.pause()


        window.__ACTIVE_TRACK_KEY__ =
        null
    }


    window.deletePlaylist?.(
        playlistId
    )


    confirmBox.remove()
}



    if(!confirmed) return


    // 🔥 STOP PLAYER IF ACTIVE PLAYLIST
    if(
        window.__CURRENT_LIST__ ===
        playlistId
    ){


        window.__DOPE_TONE_AUDIO__?.pause()


        window.__ACTIVE_TRACK_KEY__ =
        null
    }


    window.deletePlaylist?.(
        playlistId
    )


    return
}





        // ===============================
        // ▶ TRACK BTN
        // ===============================
        const trackBtn =
        e.target.closest(
            ".playlist-track-play"
        )


        if(trackBtn){


            const playlistId =
            trackBtn.dataset.playlist


            const index =
            Number(
                trackBtn.dataset.index
            )


            const playlist =
            getPlaylists().find(
                p => p.id === playlistId
            )


            if(!playlist) return


            const card =
            trackBtn.closest(
                ".playlist-card"
            )


            const alreadyActive =
            trackBtn.classList.contains(
                "active"
            )


            // 🔥 TOGGLE SAME TRACK
            if(alreadyActive){


                if(
                    window.__DOPE_TONE_AUDIO__?.paused
                ){


                    window.globalPlayer.toggle()


                    trackBtn.innerHTML = "⏸"


                    trackBtn.classList.add(
                        "active"
                    )


                    const pbtn =
                    card.querySelector(
                        ".playlist-play-btn"
                    )


                    if(pbtn){


                        pbtn.classList.add(
                            "active"
                        )


                        pbtn.innerHTML = "⏸"
                    }


                }else{


                    window.globalPlayer.toggle()


                    trackBtn.innerHTML = "▶"


                    trackBtn.classList.remove(
                        "active"
                    )


                    const pbtn =
                    card.querySelector(
                        ".playlist-play-btn"
                    )


                    if(pbtn){


                        pbtn.classList.remove(
                            "active"
                        )


                        pbtn.innerHTML = "▶"
                    }
                }


                return
            }


            resetPlaylistUI()


            trackBtn.classList.add(
                "active"
            )


            trackBtn.innerHTML = "⏸"


            const playlistBtn =
            card.querySelector(
                ".playlist-play-btn"
            )


            if(playlistBtn){


                playlistBtn.classList.add(
                    "active"
                )


                playlistBtn.innerHTML = "⏸"
            }
            


            window.globalPlayer?.play(
                index,
                playlist.beats,
                playlistId
            )


            return
        }




        // ===============================
        // ▶ PLAYLIST BTN
        // ===============================
        const playBtn =
        e.target.closest(
            ".playlist-play-btn"
        )


        if(playBtn){


            const card =
            playBtn.closest(
                ".playlist-card"
            )


            const playlistId =
            card.dataset.playlist


            const playlist =
            getPlaylists().find(
                p => p.id === playlistId
            )


            if(!playlist) return


            // 🔥 TOGGLE
            if(
                playBtn.classList.contains(
                    "active"
                )
            ){


                if(
                    window.__DOPE_TONE_AUDIO__?.paused
                ){


                    window.globalPlayer.toggle()


                    playBtn.classList.add(
                        "active"
                    )


                    playBtn.innerHTML = "⏸"


                    const activeTrack =
                    card.querySelector(
                        ".playlist-track-play.active"
                    )


                    if(activeTrack){


                        activeTrack.classList.add(
                            "active"
                        )


                        activeTrack.innerHTML = "⏸"
                    }


                }else{


                    window.globalPlayer.toggle()


                    playBtn.classList.remove(
                        "active"
                    )


                    playBtn.innerHTML = "▶"


                    const activeTrack =
                    card.querySelector(
                        ".playlist-track-play.active"
                    )


                    if(activeTrack){


                        activeTrack.classList.remove(
                            "active"
                        )


                        activeTrack.innerHTML = "▶"
                    }
                }


                return
            }


            resetPlaylistUI()


            playBtn.classList.add(
                "active"
            )


            playBtn.innerHTML = "⏸"


            const firstTrack =
            card.querySelector(
                ".playlist-track-play"
            )


            if(firstTrack){


                firstTrack.classList.add(
                    "active"
                )


                firstTrack.innerHTML = "⏸"
            }


            window.globalPlayer?.play(
                0,
                playlist.beats,
                playlistId
            )


            return
        }
    }
)




// ===============================
// 🔥 ACTIVE TRACK + PROGRESSIVE WAVE SYNC
// ===============================
// ===============================
// 🌊 LIVE PROGRESSIVE WAVES
// ===============================
document.removeEventListener(
    "playerTimeUpdate",
    window.__playlistWaveProgress__
)


window.__playlistWaveProgress__ = (e) => {


    const {
        index,
        listId,
        percent
    } = e.detail


    if(listId == null) return


    const card =
    document.querySelector(
        `.playlist-card[data-playlist="${listId}"]`
    )


    if(!card) return


    const rows =
    card.querySelectorAll(
        ".playlist-row"
    )


    rows.forEach((row,i) => {


        const wave =
        row.__wave


        if(!wave) return


        // 🔥 ACTIVE TRACK
        if(i === index){


            try{


                wave.seekTo(percent)


            }catch(err){}
        }


        // 🔥 RESET OTHERS
        else{


            try{


                wave.seekTo(0)


            }catch(err){}
        }
    })
}


document.addEventListener(
    "playerTimeUpdate",
    window.__playlistWaveProgress__
)









// ===============================
// ⏸ PAUSE WAVE
// ===============================
document.addEventListener(
    "playerPause",
    () => {


        document
        .querySelectorAll(
            ".playlist-row"
        )
        .forEach(row => {


            const wave = row.__wave


            if(!wave) return


            try{


                wave.pause()


            }catch(err){}
        })
    }
)





// ===============================
// 🚀 AUTO
// ===============================
document.addEventListener(
    "DOMContentLoaded",
    renderPlaylists
)

// ===============================
// 🔥 PLAY / PAUSE UI SYNC
// ===============================


// ▶ PLAY
document.addEventListener(
    "playerPlay",
    e => {


        const {
            index,
            listId
        } = e.detail


        // RESET ALL
        document
        .querySelectorAll(
            ".playlist-track-play"
        )
        .forEach(btn => {


            btn.classList.remove(
                "active"
            )


            btn.innerHTML = "▶"
        })


        document
        .querySelectorAll(
            ".playlist-play-btn"
        )
        .forEach(btn => {


            btn.classList.remove(
                "active"
            )


            btn.innerHTML = "▶"
        })


        // ACTIVE CARD
        const card =
        document.querySelector(
            `.playlist-card[data-playlist="${listId}"]`
        )


        if(!card) return


        // ACTIVE PLAYLIST BTN
        const playlistBtn =
        card.querySelector(
            ".playlist-play-btn"
        )


        if(playlistBtn){


            playlistBtn.classList.add(
                "active"
            )


            playlistBtn.innerHTML = "⏸"
        }


        // ACTIVE TRACK BTN
        const trackBtns =
        card.querySelectorAll(
            ".playlist-track-play"
        )


        const activeTrack =
        trackBtns[index]


        if(activeTrack){


            activeTrack.classList.add(
                "active"
            )


            activeTrack.innerHTML = "⏸"
        }
    }
)




// ⏸ PAUSE
document.addEventListener(
    "playerPause",
    () => {


        // RESET TRACKS
        document
        .querySelectorAll(
            ".playlist-track-play"
        )
        .forEach(btn => {


            btn.classList.remove(
                "active"
            )


            btn.innerHTML = "▶"
        })


        // RESET PLAYLIST BTNS
        document
        .querySelectorAll(
            ".playlist-play-btn"
        )
        .forEach(btn => {


            btn.classList.remove(
                "active"
            )


            btn.innerHTML = "▶"
        })
    }
)
window.addEventListener(
    "playlistsUpdated",
    () => {

        const state = {
            index: window.__CURRENT_INDEX__,
            listId: window.__CURRENT_LIST__,
            playing: !window.__DOPE_TONE_AUDIO__?.paused
        }

        renderPlaylists()

        if(state.playing){

            document.dispatchEvent(
                new CustomEvent(
                    "playerPlay",
                    {
                        detail:{
                            index: state.index,
                            listId: state.listId
                        }
                    }
                )
            )
        }
    }
)





// ===============================
// 🌍 GLOBAL
// ===============================
window.renderPlaylists =
renderPlaylists
// ===============================
// 🔥 LIVE VISUAL UPDATE
// ===============================
window.addEventListener(
    "playlistVisualUpdate",
    () => {


        // ONLY UPDATE COUNTS/TEXT
        document
        .querySelectorAll(
            ".playlist-card"
        )
        .forEach(card => {


            const playlistId =
            card.dataset.playlist


            const playlist =
            getPlaylists().find(
                p => p.id === playlistId
            )


            if(!playlist) return


            // UPDATE COUNT
            const count =
            card.querySelector(
                ".playlist-count"
            )


            if(count){


                count.textContent =
                `${playlist.beats.length} tracks`
            }


        })


    }
)
// ===============================
// 🎵 RENDER CAPSULES ONLY
// ===============================
export function renderPlaylistCapsulesOnly(){

    const container =
    document.getElementById(
        "playlistCapsules"
    )

    if(!container) return

    const playlists =
    window.getPlaylists() || []

    container.innerHTML = ""

    playlists.forEach(playlist => {

        const btn =
        document.createElement("button")

        btn.className =
        "playlist-capsule"

        btn.textContent =
        playlist.name

        // 🔥 ACTIVE PLAYLIST
        btn.onclick = () => {

            document
            .querySelectorAll(
                ".playlist-capsule"
            )
            .forEach(c => {

                c.classList.remove(
                    "active"
                )

            })

            btn.classList.add(
                "active"
            )

            // 🔥 STORE ACTIVE PLAYLIST
            window.activePlaylist =
            playlist

            console.log(
                "🎵 Active:",
                playlist.name
            )
        }

        container.appendChild(btn)
    })
}
