// ========================================
// 🔥 SIMILAR TRACKS
// ========================================


export async function renderSimilarTracks() {


    const container =
    document.getElementById(
        "similarTrack"
    )


    if(!container) return


    // ========================================
    // 🔥 FETCH DIRECT FROM SUPABASE
    // ========================================


    const API_URL = 'https://dope-tone-api.dopetone701.workers.dev';
    // ===============================
// 🔄 NORMALIZE BEAT FIELDS
// ===============================
function normalizeBeat(beat) {
  if (!beat) return null;
  return {
  ...beat,
    audio: beat.audio || beat.mp3_url,
    mp3_url: beat.mp3_url || beat.audio,
    cover: beat.cover || beat.cover_url,
    cover_url: beat.cover_url || beat.cover,
    zip_url: beat.zip_url || beat.project_file,
    project_file: beat.project_file || beat.zip_url,
    sample: beat.sample || beat.mp3_url || beat.audio
  };
}



    try{


        const res = await fetch(`${API_URL}/beats`);
if (!res.ok) throw new Error('Failed to fetch beats');

let beats = await res.json()
beats = beats.map(normalizeBeat);



        if(!beats?.length) return


        container.innerHTML = ""


        // ========================================
        // 🎧 RENDER
        // ========================================


        const cart =
JSON.parse(
    localStorage.getItem(
        "dopetone_cart"
    )
) || []




// EMPTY STATE
if(cart.length === 0){


    beats = beats.sort(
        () => Math.random() - 0.5
    )
}


beats
.slice(0, 10)

        .forEach((beat, index) => {


            const card =
            document.createElement("div")


            card.className =
            "latest-card"


            card.dataset.index =
            index


            card.innerHTML = `
            
                <div class="latest-media">


                    <img src="${
                        beat.cover_url ||
                        beat.cover ||
                        "images/studio.jpg"
                    }">


                    <button class="play-overlay latest-play">
                        <span class="play-icon">▶</span>
                    </button>


                </div>


                <div class="latest-title">
                    ${beat.title || beat.name}
                </div>


                <div class="latest-tag">
                    #${beat.genre || "Trap"}
                </div>


                <div class="latest-price-row">
                    <span class="old-price">$49</span>
                    <span class="new-price">$19</span>
                </div>


                <div class="latest-actions">
                    <button class="btn-buy">
                        Add To Cart
                    </button>
                </div>

            `
  // ========================================
// 🔥 ACTIVE BTN STATE
// ========================================


let cart =
JSON.parse(
    localStorage.getItem(
        "dopetone_cart"
    )
) || []


const exists =
cart.find(
    item => item.id == beat.id
)


if(exists){


    const btn =
    card.querySelector(".btn-buy")


    btn.textContent = "Remove"


    btn.classList.add("added")
}
          

// ========================================
// 🌍 GLOBAL PLAYER
// ========================================


card
.querySelector(".latest-play")
.onclick = (e) => {


    e.stopPropagation()


    // 🔥 CLEAN PLAYLIST
    const cleanPlaylist =
    beats.slice(0, 10).map(item => ({


        ...item,


        title:
        item.title || item.name,


        cover_url:
        item.cover_url ||
        item.cover,


        mp3_url:
        item.mp3_url ||
        item.audio ||
        item.mp3


    }))


    // 🔥 PLAY CURRENT INDEX
    window.globalPlayer.play(
        index,
        cleanPlaylist,
        "similar-tracks"
    )


}

           


// ========================================
// 🛒 ADD / REMOVE CART
// ========================================


card
.querySelector(".btn-buy")
.onclick = async (e) => {


    e.stopPropagation()


    const btn =
    e.currentTarget


    let cart =
    JSON.parse(
        localStorage.getItem(
            "dopetone_cart"
        )
    ) || []


    const exists =
    cart.find(
        item => item.id == beat.id
    )


    // ====================================
    // ❌ REMOVE
    // ====================================


    if(exists){


        cart =
        cart.filter(
            item => item.id != beat.id
        )


        localStorage.setItem(
            "dopetone_cart",
            JSON.stringify(cart)
        )


        btn.textContent =
        "Add To Cart"


        btn.classList.remove(
            "added"
        )


    }else{


        // ====================================
        // 🛒 ADD
        // ====================================


        const newBeat = normalizeBeat(beat);



        cart.push(newBeat)


        localStorage.setItem(
            "dopetone_cart",
            JSON.stringify(cart)
        )


        btn.textContent =
        "Added ✓"


        btn.classList.add(
            "added"
        )


        // ====================================
        // 🔥 INSTANT ACTIVE TRACK
        // ====================================


        // ====================================
// 🔥 ONLY SWITCH IF NO ACTIVE TRACK
// ====================================


const hasActiveTrack =
window.currentBeat ||
window.activeCartBeat


// 🔥 FIRST TRACK EVER
if(
    !hasActiveTrack &&
    typeof window.switchActiveBeat
    === "function"
){


    await window.switchActiveBeat(
        newBeat
    )
}


// 🔥 OTHERWISE:
// only render row
// keep current active beat
else{


    window.renderCartBeatRow?.()


}



    }


    // ====================================
    // 🔄 REFRESH UI
    // ====================================


    if(
        typeof window.renderCartBeatRow
        === "function"
    ){
        window.renderCartBeatRow()
    }


    if(
        typeof window.updateCartCount
        === "function"
    ){
        window.updateCartCount()
    }


    if(
        typeof window.checkEmptyState
        === "function"
    ){
        window.checkEmptyState()
    }


}


container.appendChild(card)

        })


    }catch(err){


        console.log(err)


    }
}
// ========================================
// 🔄 PLAY ICON SYNC
// ========================================


document.addEventListener(
"playerPlay",
(e) => {


    const {
        index,
        listId
    } = e.detail


    // 🔥 ONLY FOR SIMILAR TRACKS
    if(listId !== "similar-tracks")
    return


    document
    .querySelectorAll(
        "#similarTrack .play-icon"
    )
    .forEach(icon => {


        icon.textContent = "▶"


    })


    const active =
    document.querySelector(
        `#similarTrack .latest-card[data-index="${index}"] .play-icon`
    )


    if(active){
        active.textContent = "⏸"
    }


})




// 🔥 PAUSE
document.addEventListener(
"playerPause",
() => {


    document
    .querySelectorAll(
        "#similarTrack .play-icon"
    )
    .forEach(icon => {


        icon.textContent = "▶"


    })


})
// ========================================
// 🔥 DRAG SCROLL SIMILAR TRACKS
// ========================================


document.addEventListener(
    "DOMContentLoaded",
    () => {


        const slider =
        document.getElementById(
            "similarTrack"
        )


        if(!slider) return


        let isDown = false
        let startX
        let scrollLeft


        // 🖱 MOUSE DOWN
        slider.addEventListener(
            "mousedown",
            (e) => {


                isDown = true


                slider.classList.add(
                    "dragging"
                )


                startX =
                e.pageX -
                slider.offsetLeft


                scrollLeft =
                slider.scrollLeft
            }
        )


        // 🖱 LEAVE
        slider.addEventListener(
            "mouseleave",
            () => {


                isDown = false


                slider.classList.remove(
                    "dragging"
                )
            }
        )


        // 🖱 UP
        slider.addEventListener(
            "mouseup",
            () => {


                isDown = false


                slider.classList.remove(
                    "dragging"
                )
            }
        )


        // 🖱 MOVE
        slider.addEventListener(
            "mousemove",
            (e) => {


                if(!isDown) return


                e.preventDefault()


                const x =
                e.pageX -
                slider.offsetLeft


                const walk =
                (x - startX) * 1.6


                slider.scrollLeft =
                scrollLeft - walk
            }
        )
    }
)
