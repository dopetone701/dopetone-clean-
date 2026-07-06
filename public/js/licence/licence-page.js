import { renderSimilarTracks } from "./licence-similar.js"

const API_URL = 'https://dope-tone-api.dopetone701.workers.dev';
const WORKER_URL = API_URL;
const params = new URLSearchParams(window.location.search);
let beatId = params.get("id");
let audio = null;
let selectedLicences = {};
let selectedLicence = null;
let activeCartBeat = null;
let beatsCache = null; 
let beatsCacheTime = 0; 


// 🚀 INIT - THIS WAS MISSING
window.addEventListener("load", async () => {
    setupPlayer(); setupLike(); setupShare(); setupLicenceSelection();
    setupCheckout(); setupAddToCart(); updateCartCount();

    const cart = JSON.parse(localStorage.getItem("dopetone_cart") || "[]");

    if (!beatId && cart.length > 0) {
        const b = cart[0];
        beatId = b.id; activeCartBeat = b; window.currentBeat = b;
        window.__CURRENT_BEAT__ = b;
        document.getElementById("title").textContent = b.title;
        document.getElementById("cover").src = b.cover_url || b.cover || "images/logo.png";
        document.getElementById("genre").textContent = b.genre || "--";
        document.getElementById("bpm").textContent = b.bpm || "--";
document.getElementById("type").textContent = b.type || "--";
document.getElementById("mood").textContent = b.mood || "--";
document.getElementById("key").textContent = b.key || "--";


        document.body.classList.add("active-mode");
        document.body.classList.remove("empty-mode");
        history.replaceState({}, "", `?id=${b.id}`);
        renderSimilarTracks([b]);
        applyMonetizationRules(b); 
    } else if (beatId) {
        await loadBeat();
    }

    checkEmptyState(); renderCartBeatRow(); updateSelectedBar(); updateCheckoutTheme();
    setTimeout(() => document.querySelector(`[data-id="${beatId}"]`)?.classList.add("active"), 200);
    setTimeout(initCartScroll, 500);
    setTimeout(forceTitle, 2000);
    setTimeout(nukePlays, 100);

   


    
});

async function loadBeat(){
    try {
        const cart = JSON.parse(localStorage.getItem("dopetone_cart") || "[]");
        if(!beatId) return;

        const cartBeat = cart.find(b => b.id == beatId);
        if (cartBeat) {
            // Fetch fresh data
            if (!beatsCache || Date.now() - beatsCacheTime > 30000) {
                const res = await fetch(`${API_URL}/beats`);
                beatsCache = await res.json();
                beatsCacheTime = Date.now();
            }
            const freshBeat = beatsCache.find(b => b.id == beatId) || cartBeat;

            window.currentBeat = {
   ...cartBeat, // cart first
   ...freshBeat, // fresh overwrites
    monetization_mode: freshBeat.monetization_mode || 'paid',
    play_count: freshBeat.play_count || 0 // 🔥 FORCE FRESH PLAYS
};

            window.__CURRENT_BEAT__ = window.currentBeat;
            updateBeatUI(window.currentBeat);
            return;
        }

        // Not in cart — load from API
        if (!beatsCache || Date.now() - beatsCacheTime > 30000) {
            const res = await fetch(`${API_URL}/beats`);
            beatsCache = await res.json();
            beatsCacheTime = Date.now();
        }
        const beat = beatsCache.find(b => b.id == beatId);
        if(!beat) return;

        window.currentBeat = {
            id: beat.id,
            title: beat.title,
            cover: beat.cover_url,
            cover_url: beat.cover_url,
            genre: beat.genre || "--",
            bpm: beat.bpm || "--",
            type: beat.type || "--",
            mood: beat.mood || "--",
            key: beat.key || "--",
            audio: beat.mp3_url,
            play_count: beat.play_count || beat.plays || 0,
            monetization_mode: beat.monetization_mode || 'paid',
            has_free_tagged: beat.has_free_tagged || 0
        };

        window.__CURRENT_BEAT__ = window.currentBeat;
        updateBeatUI(window.currentBeat);
    } catch(err) { 
        console.log('loadBeat error:', err); 
    }
}

function updateBeatUI(beat) {
    safeSet("title", beat.title);
    safeSet("genre", beat.genre);
    safeSet("bpm", beat.bpm);
    safeSet("type", beat.type || "--");
    safeSet("mood", beat.mood || "--");
    safeSet("key", beat.key || "--");

    const cover = document.getElementById("cover");
    if(cover) {
        cover.src = beat.cover || beat.cover_url || "images/logo.png";
    }
    if(beat.audio) audio = new Audio(beat.audio);

    // 🔥 PLAYS - single declaration
    let playEl = document.getElementById("playCount");
    if (!playEl) {
        playEl = document.createElement("div");
        playEl.id = "playCount";
        playEl.className = "beat-plays";
        const titleEl = document.getElementById("title");
        titleEl?.parentNode?.insertBefore(playEl, titleEl.nextSibling);
    }

    const plays = beat.play_count?? 0;
    playEl.textContent = `${plays.toLocaleString()} plays`;
    playEl.style.display = 'block';
    playEl.style.opacity = '1';
    playEl.style.color = '#b3b3b3';
    playEl.style.textAlign = 'center';
    playEl.style.marginTop = '8px';

    updatePrices();
    renderCartBeatRow();
    renderSimilarTracks([beat]);
    setTimeout(forceTitle, 100);
    applyMonetizationRules(beat);
    setTimeout(nukePlays, 100);
}

// [KEEP ALL YOUR OTHER FUNCTIONS BELOW THIS LINE - updateCartCount, checkEmptyState, etc.]
// BUT DELETE THE OLD loadBeat() THAT USES SUPABASE_URL (around line 400 in your paste)








// ========================================
// 🛒 CART COUNT
// ========================================


function updateCartCount(){


    const cartBtn =
    document.getElementById(
        "cartBtn"
    );


    const mobileCartBtn =
    document.getElementById(
        "mobileCartBtn"
    );


    const cart =
    JSON.parse(
        localStorage.getItem(
            "dopetone_cart"
        )
    ) || [];


    // =========================
    // UPDATE COUNTS
    // =========================


    document
    .querySelectorAll(".cart-count")
    .forEach(el => {


        el.textContent = cart.length;


    });


    // =========================
    // OPEN CART
    // =========================


    const goToCart = () => {


        // no tracks
        if(cart.length === 0){


            window.location.href =
            "licence-page.html";


            return;
        }


        // 🔥 FORCE FIRST TRACK
        const firstBeat = cart[0];


        window.location.href =
        `licence-page.html?id=${firstBeat.id}`;
    };


   if(cartBtn){


    cartBtn.addEventListener(
        "click",
        (e) => {


            e.preventDefault();
            e.stopPropagation();


            goToCart();
        }
    );
}



   if(mobileCartBtn){


    mobileCartBtn.addEventListener(
        "click",
        (e) => {


            e.preventDefault();
            e.stopPropagation();


            goToCart();
        }
    );
}



}





// ========================================
// 🌫 EMPTY / ACTIVE MODE
// ========================================


function checkEmptyState(){






    const cover =
    document.getElementById(
        "cover"
    );




    const cart =
    JSON.parse(
        localStorage.getItem(
            "dopetone_cart"
        )
    ) || [];


    // =========================
// EMPTY STATE
// =========================

if(cart.length === 0){

    // ========================================
    // 🎧 SHOW RECOMMENDED TRACKS
    // ========================================


    renderSimilarTracks()


    console.log("EMPTY STATE TRIGGERED");


    console.log("EMPTY STATE TRIGGERED");
console.log("currentBeat:", window.currentBeat);
console.log("activeCartBeat:", activeCartBeat);
console.log("beatId:", beatId);
// ========================================
// 🎯 CHANGE SECTION TITLE
// ========================================


const similarTitle =
document.getElementById(
    "similarTitle"
)


if(similarTitle){


    similarTitle.textContent =
    "Recommended Tracks"
}





    // 🔥 clear globals
    beatId = null




    activeCartBeat = null




    window.currentBeat = null




    selectedLicence = null




    audio = null




    // 🔥 clear url id
    window.history.replaceState(
        {},
        "",
        "licence-page.html"
    )




    // 🔥 body state
    document.body.classList.add(
        "empty-mode"
    )




    document.body.classList.remove(
        "active-mode"
    )




    // 🔥 reset text
    safeSet("title", "CART EMPTY")
    safeSet("genre", "--")
    safeSet("bpm", "--")
    safeSet("type", "--")
    safeSet("mood", "--")
    safeSet("key", "--")




    // 🔥 reset cover
    const cover =
    document.getElementById("cover")




    if(cover){




        cover.src =
        "images/logo.png"
    }




    // 🔥 reset player btn
    const playBtn =
    document.getElementById("playBtn")




    if(playBtn){




        playBtn.textContent = "▶"
    }
    // 💰 reset prices
document.querySelectorAll(".old").forEach(el => {
    el.textContent = "$00"
})




document.querySelectorAll(".new").forEach(el => {
    el.textContent = "$00"
})






    // 🔥 remove all licences
    localStorage.removeItem(
        "dopetone_licences"
    )




    selectedLicences = {}




    // 🔥 refresh ui
    renderCartBeatRow()




    updateSelectedBar()




    updateCheckoutTheme()




    return
}






    // =========================
    // ACTIVE STATE
    // =========================



    const similarTitle =
document.getElementById(
    "similarTitle"
)


if(similarTitle){


    similarTitle.textContent =
    "Similar Tracks"
}





    document.body.classList.remove(
        "empty-mode"
    );




    document.body.classList.add(
        "active-mode"
    );




   



}


// ========================================
// 🌌 BG
// ========================================




function applyDynamicBG(image){




    document.body.style.background = `
    radial-gradient(circle at 20% 30%, rgba(255,255,255,.08), transparent 40%),
    radial-gradient(circle at 80% 70%, rgba(255,255,255,.05), transparent 40%),
    url(${image}) center/cover no-repeat fixed
    `;




}

// ========================================
// 🔗 SHARE
// ========================================




function setupShare(){
    const shareBtn = document.getElementById("shareBtn");
    if(!shareBtn) return;

    shareBtn.addEventListener("click", async() => {
        const beat = window.currentBeat;
        const shareData = {
            title: beat?.title || 'Dope Tone Beat',
            text: `🔥 Check out "${beat?.title}" on Dope Tone`,
            url: window.location.href
        };

        // Native share sheet (mobile/desktop)
        if (navigator.share && navigator.canShare?.(shareData)) {
            try {
                await navigator.share(shareData);
                console.log('Shared successfully');
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.log('Share failed:', err);
                    fallbackCopy();
                }
            }
        } else {
            // Fallback: copy link
            fallbackCopy();
        }
    });

    async function fallbackCopy() {
        try {
            await navigator.clipboard.writeText(window.location.href);
            // Premium toast instead of alert
            showToast('Link copied 🔗');
        } catch(err) {
            console.log(err);
        }
    }
}

// Add this toast function at bottom of file
function showToast(msg) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.cssText = `
        position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
        background: rgba(0,0,0,0.9); color: white; padding: 12px 24px;
        border-radius: 24px; z-index: 99999; font-size: 14px;
        backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}












// ========================================
// 🎯 LICENCE SELECT
// ========================================




function setupLicenceSelection(){




    const cards =
    document.querySelectorAll(
    ".licence-card"
    );




    const buttons =
    document.querySelectorAll(
    ".pay-btn"
    );




    buttons.forEach(btn => {




        btn.addEventListener(
        "click",
        () => {




            const card =
            btn.closest(
            ".licence-card"
            );




            if(!card) return;




            // fade only after selection
cards.forEach(c => {




    c.classList.remove(
        "faded"
    );




    if(c !== card){




        c.classList.add(
            "faded"
        );




    }




});






            card.classList.add(
            "active"
            );




            cards.forEach(c => {




                if(c !== card){




                    c.classList.add(
                    "faded"
                    );




                }




            });




            selectedLicences[beatId] = {




         name:
         btn.dataset.name,




         price:
          Number(btn.dataset.price)
         };
         localStorage.setItem(
    "dopetone_licences",
    JSON.stringify(selectedLicences)
);








            updateSelectedBar();




            updateCheckoutTheme();




        });




    });




}


// ========================================
// 🔥 CART ROW
// ========================================




function renderCartBeatRow(){
    const wrap = document.querySelector("#cartBeatRow");
    if(!wrap) return;

    const cart = JSON.parse(localStorage.getItem("dopetone_cart")) || [];
    wrap.innerHTML = "";

    cart.forEach((beat) => {
        const card = document.createElement("div");
        card.className = "cart-beat-card";
        card.dataset.id = beat.id;

        if(String(beat.id) === String(activeCartBeat?.id || beatId)){
            card.classList.add("active");
        }

        card.innerHTML = `
            <button class="remove-cart-track" data-id="${beat.id}">✕</button>
            <img src="${beat.cover || beat.cover_url || "images/logo.png"}">
            <h4>${beat.title}</h4>
        `;

        // Remove button - separate listener
        const removeBtn = card.querySelector(".remove-cart-track");
        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            e.preventDefault();
            removeBeatFromCart(e, beat.id);
        });

        // Card click - switch beat
        card.addEventListener("click", async () => {
            document.querySelectorAll(".cart-beat-card").forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            await switchActiveBeat(beat);

            const licenceBeat = {
                id: beat.id,
                title: beat.title,
                cover_url: beat.cover || beat.cover_url,
                mp3_url: beat.audio,
                genre: beat.genre,
                bpm: beat.bpm
            };

            window.__LICENCE_BEAT__ = licenceBeat;
            window.__CURRENT_BEAT__ = licenceBeat;
            window.__ACTIVE_TRACK_KEY__ = null;
            window.globalPlayer?.play(0, [licenceBeat], `licence_${beat.id}_${Date.now()}`);

            
            updateSelectedBar();
            updateCheckoutTheme();
            renderSimilarTracks([window.currentBeat]);
            setTimeout(forceTitle, 100);
            setTimeout(nukePlays, 100);


        });

        wrap.appendChild(card);
    });
}







// ========================================
// 💳 STRIPE CHECKOUT
// ========================================




function setupCheckout(){


    const checkoutBtn =
    document.getElementById(
        "checkoutBtn"
    );


    if(!checkoutBtn) return;


    checkoutBtn.onclick = async () => {


        // 🔥 LOAD LICENCES
        const licences =
        JSON.parse(
            localStorage.getItem(
                "dopetone_licences"
            )
        ) || {};


        // 🔥 CHECK IF EMPTY
        if(
            Object.keys(licences).length === 0
        ){


            alert(
                "Select a licence first"
            );


            return;
        }


        // ====================================
        // ✅ CHECKOUT READY
        // ====================================


        console.log(
            "CHECKOUT DATA",
            licences
        );
        // 🔥 LOG PURCHASE TO D1 FOR CONTROL CENTER REVENUE
for(const beatId in licences){
    const licence = licences[beatId];
    fetch(`${WORKER_URL}/api/purchase`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
            beat_id: beatId,
            user_id: 'anonymous',
            amount: licence.price * 100,
            license_type: licence.name.toLowerCase()
        })
    }).catch(()=>{});
}



        alert(
            "Stripe Ready 🔥"
        );


    };


}










// ========================================
// 🌈 CHECKOUT COLORS
// ========================================




function updateCheckoutTheme(){




    document.body.classList.remove(
        "selected-free",
        "selected-basic",
        "selected-pro",
        "selected-exclusive"
    );




    const activeCards =
    document.querySelectorAll(
        ".licence-card.active"
    );




    activeCards.forEach(card => {




        if(card.classList.contains("free")){
            document.body.classList.add(
                "selected-free"
            );
        }




        if(card.classList.contains("basic")){
            document.body.classList.add(
                "selected-basic"
            );
        }




        if(card.classList.contains("pro")){
            document.body.classList.add(
                "selected-pro"
            );
        }




        if(card.classList.contains("exclusive")){
            document.body.classList.add(
                "selected-exclusive"
            );
        }




    });




}





    // =========================
    // ACTIVE STATE
    // =========================


    document.body.classList.remove(
        "empty-mode"
    );


    document.body.classList.add(
        "active-mode"
    );




// ========================================
// 🎧 LOAD BEAT
// ========================================





// ========================================
// 💰 UPDATE PRICES
// ========================================


function updatePrices(){
    // 🔥 Don't update if cards are locked by monetization
    const isLocked = document.querySelector('.licence-card.locked');
    if (isLocked && window.currentBeat?.monetization_mode === 'free') {
        return; // Skip — applyMonetizationRules handles it
    }

    const cart =
JSON.parse(
    localStorage.getItem(
        "dopetone_cart"
    )
) || [];


if(cart.length === 0){


    document.querySelectorAll(".old").forEach(el => {
        el.textContent = "$00";
    });


    document.querySelectorAll(".new").forEach(el => {
        el.textContent = "$00";
    });


    return;
}



    const prices = {


        free:0,
        basic:19,
        pro:49,
        exclusive:199


    };


    Object.keys(prices).forEach(type => {


        const card =
        document.querySelector(
        `.licence-card.${type}`
        );


        if(!card) return;


        const oldPrice =
        card.querySelector(".old");


        const newPrice =
        card.querySelector(".new");


        // =========================
        // REAL PRICE
        // =========================


        const value =
        prices[type];
        if(cart.length === 0){


    if(oldPrice){
        oldPrice.textContent = "$00";
    }


    if(newPrice){
        newPrice.textContent = "$00";
    }


    return;
}



        // =========================
        // OLD PRICE
        // =========================


        if(oldPrice){


            oldPrice.textContent =
            `$${value + 20}`;


        }


        // =========================
        // NEW PRICE
        // =========================


        if(newPrice){


            newPrice.textContent =
            `$${value}`;


        }


    });


}





// ========================================
// 🧼 SAFE SET
// ========================================


function safeSet(id, value){


    const el =
    document.getElementById(id);


    if(!el) return;


    el.textContent =
    value || "--";


}



// ========================================
// ▶ PLAYER
// ========================================


// ========================================
// ▶ PLAYER
// ========================================
function setupPlayer(){
    const playBtn = document.getElementById("playBtn");
    if(!playBtn) return;

    playBtn.addEventListener("click", async () => {
        const beat = window.currentBeat;
        if(!beat) return;

        const licenceBeat = {
            id: beat.id,
            title: beat.title,
            cover_url: beat.cover || beat.cover_url || "images/logo.png",
            mp3_url: beat.audio,
            genre: beat.genre,
            bpm: beat.bpm
        };

        // Check if same track
        const sameTrack = String(window.__LICENCE_ACTIVE_ID__) === String(licenceBeat.id);
        const isPlaying = window.globalPlayer?.isPlaying?.();

        // Toggle pause if same track playing
        if (sameTrack && isPlaying) {
            window.globalPlayer.pause();
            return;
        }

        // Toggle resume if same track paused
        if (sameTrack &&!isPlaying) {
            window.globalPlayer.resume();
            return;
        }

        // New track - play it
        window.__LICENCE_ACTIVE_ID__ = licenceBeat.id;
        window.__CURRENT_BEAT__ = licenceBeat;
        window.__ACTIVE_TRACK_KEY__ = null;

        // 🔥 FIXED: No Date.now() - use stable key
        window.globalPlayer?.play(0, [licenceBeat], `licence_${beat.id}`);
        async function incrementPlayCount(beatId) {
    await fetch(`${API_URL}/beats/${beatId}/play`, {
        method: 'POST'
    });
}

// Call it when play starts
document.getElementById('playBtn').addEventListener('click', () => {
    incrementPlayCount(window.currentBeat.id);
});

    });

    // Sync play button UI
    document.addEventListener("playerPlay", () => {
        playBtn.textContent = "⏸";
    });

    document.addEventListener("playerPause", () => {
        playBtn.textContent = "▶";
    });

    document.addEventListener("trackChange", e => {
        const beat = e.detail;
        if(!beat) return;

        const currentId = beat.id;
        const licenceId = window.currentBeat?.id;

        if (String(currentId) === String(licenceId)) {
            playBtn.textContent = "⏸";
        } else {
            playBtn.textContent = "▶";
        }
    });
}







// ========================================
// ❤️ LICENCE LIKE SYSTEM FINAL
// ========================================


function setupLike(){


    const likeBtn =
    document.getElementById(
        "likeBtn"
    )


    const heartIcon =
    document.getElementById(
        "heartIcon"
    )


    if(!likeBtn || !heartIcon)
    return


    // ====================================
    // 🔥 UPDATE UI
    // ====================================


    function updateLikeUI(){


        const beat =
window.__CURRENT_BEAT__


        if(!beat) return


        const playlists =
        window.getPlaylists?.() || []


        const liked =
        playlists.find(
            p => p.isLiked
        )


        const isLiked =
        liked?.beats?.some(
            b => b.id === beat.id
        )


        const btn = document.getElementById('likeBtn');
if (isLiked) {
    btn.classList.add('liked');
    heartIcon.setAttribute('fill', 'currentColor');
} else {
    btn.classList.remove('liked');
    heartIcon.setAttribute('fill', 'none');
}


        // ❤️ mobile heart
        const mpLike =
        document.getElementById(
            "mpLike"
        )


        if(mpLike){
            mpLike.textContent =
            isLiked ? "❤️" : "♡"
        }


        // ❤️ desktop heart
        const desktopHeart =
        document.querySelector(
            ".love-heart"
        )


        if(desktopHeart){
            desktopHeart.textContent =
            isLiked ? "❤️" : "♡"
        }
    }


    // ====================================
    // 🔥 CLICK
    // ====================================


    likeBtn.addEventListener(
    "click",
    () => {


        const beat =
window.__CURRENT_BEAT__


        if(!beat) return


        // 🔥 toggle liked
        window.toggleBeatLike?.()


        // 🔥 refresh ui
        updateLikeUI()
    })


    // ====================================
    // 🔥 GLOBAL ACCESS
    // ====================================


    window.updateLicenceLikeUI =
    updateLikeUI
}


// ========================================
// 🛒 ADD TO CART
// ========================================


function setupAddToCart(){


    const addBtn =
    document.getElementById(
        "addBtn"
    );


    if(!addBtn) return;


    addBtn.addEventListener(
    "click",
    () => {


        if(!window.currentBeat){
            return;
        }
        const panel =
document.getElementById(
    "quickPlaylistPanel"
)


if(panel){


    const playlists =
    window.getPlaylists?.()
    ?.filter(
        p => !p.isLiked
    ) || []


    panel.innerHTML = ""


    // existing playlists
    playlists.forEach(
    playlist => {


        const btn =
        document.createElement(
            "button"
        )


        btn.className =
        "quick-playlist-item"


        btn.textContent =
        playlist.name


        btn.onclick = (e) => {


            e.stopPropagation()


            window.addBeatToPlaylist?.(
                playlist.id,
                window.currentBeat
            )


            panel.classList.remove(
                "active"
            )
        }


        panel.appendChild(btn)
    })


    // create playlist
    const createBtn =
    document.createElement(
        "button"
    )


    createBtn.className =
    "quick-playlist-item create"


    createBtn.textContent =
    "+ Create Playlist"


    createBtn.onclick = (e) => {


        e.stopPropagation()


        panel.classList.remove(
            "active"
        )


        window.openPlaylistModal?.(
            window.currentBeat
        )
    }


    panel.appendChild(createBtn)


    panel.classList.toggle(
        "active"
    )
}



        let cart =
        JSON.parse(
            localStorage.getItem(
                "dopetone_cart"
            )
        ) || [];


        const beat = {
    id: window.currentBeat.id,
    title: window.currentBeat.title,
    cover: window.currentBeat.cover,
    cover_url: window.currentBeat.cover_url,
    genre: window.currentBeat.genre,
    bpm: window.currentBeat.bpm,
    type: window.currentBeat.type,
    mood: window.currentBeat.mood,
    key: window.currentBeat.key,
    audio: window.currentBeat.audio,
    play_count: window.currentBeat.play_count || 0, // 🔥
    monetization_mode: window.currentBeat.monetization_mode || 'paid',
    has_free_tagged: window.currentBeat.has_free_tagged || 0
};




        const exists =
        cart.find(
            item => item.id == beat.id
        );


        if(exists){
            return;
        }


        // =========================
        // ADD TRACK
        // =========================


        cart.push(beat);


        localStorage.setItem(
            "dopetone_cart",
            JSON.stringify(cart)
        );


        // =========================
        // FIRST TRACK ACTIVE
        // =========================


        if(cart.length === 1){


            activeCartBeat =
            beat;


            beatId =
            beat.id;


            


            switchActiveBeat(
                beat
            );


        }


        renderCartBeatRow();


        updateCartCount();


        document.body.classList.remove(
            "empty-mode"
        );


    });


}



// ========================================
// 🔥 SWITCH ACTIVE TRACK
// ========================================


async function switchActiveBeat(beat){
console.log("SWITCH ACTIVE CALLED", beat);




    activeCartBeat =
    beat;
    renderCartBeatRow();





    beatId =
    beat.id;




    // =========================
    // URL
    // =========================




    const url =
    new URL(
        window.location
    );




    url.searchParams.set(
        "id",
        beat.id
    );




    window.history.pushState(
        {},
        "",
        url
    );
    // ❤️ refresh heart state
window.updateLicenceLikeUI?.()


    // =========================
    // UPDATE GLOBAL
    // =========================

    window.currentBeat =
    beat;
    


    window.__CURRENT_BEAT__ =
beat


 



    // =========================================
// RESTORE TRACK LICENCE
// =========================================


selectedLicences =
JSON.parse(
    localStorage.getItem(
        "dopetone_licences"
    )
) || {};




const savedLicence =
selectedLicences[beat.id];




// reset all cards first
document
.querySelectorAll(
    ".licence-card"
)
.forEach(card => {


    card.classList.remove(
        "active",
        "faded"
    );


});




// =========================================
// NO LICENCE YET
// =========================================

// no licence selected for this beat
if(!savedLicence){


    selectedLicence = null;


    document
    .querySelectorAll(".licence-card")
    .forEach(card => {


        card.classList.remove(
            "active",
            "faded"
        );


    });


}else{


    // restore selected licence UI
    document
    .querySelectorAll(
        ".licence-card"
    )
    .forEach(card => {


        const btn =
        card.querySelector(
            ".pay-btn"
        );


        if(!btn) return;


        const licenceName =
        btn.dataset.name;


        if(
            licenceName ===
            savedLicence.name
        ){


            card.classList.add(
                "active"
            );


        }else{


            card.classList.add(
                "faded"
            );


        }


    });


    selectedLicence =
    savedLicence;


}


document
.querySelectorAll(
    ".cart-beat-card"
)
.forEach(card => {

    const title =
    card.querySelector("h4")
    ?.textContent
    ?.trim()

    if(title === beat.title){

        card.classList.add(
            "active"
        )
    }
})
// =====================================
// ❤️ REFRESH LIKES AFTER TRACK STABLE
// =====================================

setTimeout(() => {

    window.refreshLikeUI?.()

    window.updateLicenceLikeUI?.()

    loadGlobalLikeCount(
        beat.id
    )

}, 120)









// restore bottom bar
updateSelectedBar();




// restore checkout glow
updateCheckoutTheme();





    // =========================
    // UI
    // =========================




    safeSet(
    "title",
    beat.title
);


safeSet(
    "genre",
    beat.genre
);


safeSet(
    "bpm",
    beat.bpm
);


safeSet(
    "type",
    beat.type || "--"
);


safeSet(
    "mood",
    beat.mood || "--"
);


safeSet(
    "key",
    beat.key || "--"
);
// ADD THIS
let playEl = document.getElementById("playCount");
if (playEl) {
    
const plays = beat.play_count ?? 0;
document.getElementById("playCount").textContent = `${plays.toLocaleString()} plays`;

}



    const cover =
    document.getElementById(
        "cover"
    );




    if(cover){




        cover.src =
        beat.cover ||
        beat.cover_url ||
        "images/logo.png";




        applyDynamicBG(
            beat.cover ||
            beat.cover_url
        );




    }




    // =========================
    // AUDIO
    // =========================




    if(beat.audio){




        audio =
        new Audio(
            beat.audio
        );




    }




    // =========================
    // DO NOT RESET LICENCE
    // =========================




    if(selectedLicence){




        document.getElementById(
            "totalPrice"
        ).textContent =
        `$${selectedLicence.price}`;




        document.getElementById(
            "checkoutBtn"
        ).textContent =
        `Checkout ${selectedLicence.name}`;




        updateSelectedBar();




    }else{




        document.getElementById(
            "totalPrice"
        ).textContent =
        "$0";




        document.getElementById(
            "checkoutBtn"
        ).textContent =
        "Checkout";




    }




    // =========================
    // ACTIVE SMALL CARD
    // =========================




    const allCards =
document.querySelectorAll(
    ".cart-beat-card"
);




// remove old active
allCards.forEach(card => {


    card.classList.remove(
        "active"
    );


});




// activate clicked one
allCards.forEach(card => {


    if(
        card.dataset.id == beat.id
    ){


        card.classList.add(
            "active"
        );


    }


});





    document
    .querySelectorAll(
        ".cart-beat-card"
    )
    .forEach(card => {




        const title =
        card.querySelector("h4")
        ?.textContent
        ?.trim();




        if(title === beat.title){




            card.classList.add(
                "active"
            );




        }




    });
    // Add at end of switchActiveBeat, after all the UI updates
renderSimilarTracks([beat]);

applyMonetizationRules(beat);
window.currentBeat.monetization_mode = beat.monetization_mode || 'paid'; // 🔥 FORCE IT





}


// =====================================
// 🌍 LOAD GLOBAL LIKE COUNT
// =====================================


async function loadGlobalLikeCount(beatId){
    if(!beatId) return;
    try {
        const res = await fetch(`${API_URL}/beats`);
        const beats = await res.json();
        const beat = beats.find(b => b.id == beatId);
        const count = beat?.like_count || 0;
        
        const countEl = document.getElementById("likeCount");
        if(countEl) countEl.textContent = count;
    } catch(err) {
        console.log("like count error:", err);
    }
}




// ========================================
// 📊 UPDATE BAR
// ========================================


function updateSelectedBar(){


    const selectedWrap =
    document.querySelector(
        ".selected-licence"
    );


    if(!selectedWrap) return;




    const cart =
    JSON.parse(
        localStorage.getItem(
            "dopetone_cart"
        )
    ) || [];




    // LOAD SAVED LICENCES
    selectedLicences =
    JSON.parse(
        localStorage.getItem(
            "dopetone_licences"
        )
    ) || {};




    let totalPrice = 0;


    let count = 0;


    let licenceHTML = "";




    cart.forEach(beat => {


        const licence =
        selectedLicences[beat.id];


        if(!licence) return;




        totalPrice +=
        Number(licence.price);


        count++;




        licenceHTML += `


            <div class="selected-track-line">


                <div class="selected-track-info">


                    <strong>
                        ${beat.title}
                    </strong>


                    <span class="
                    licence-color-${licence.name.toLowerCase()}
                    ">
                        ${licence.name}
                        •
                        $${licence.price}
                    </span>


                </div>


                <button
                    class="remove-selected-licence"
                    data-beat="${beat.id}"
                >
                    ✕
                </button>


            </div>


        `;


    });




    // =========================
    // EMPTY
    // =========================


    if(licenceHTML === ""){


        selectedWrap.innerHTML = `


            <div class="selected-left">


                <h3>
                    Selected<br>
                    Licence
                </h3>


                <div class="total-box">


                    <span>Total</span>


                    <div id="totalPrice">
                        $0
                    </div>


                </div>


            </div>


            <div class="selected-right">


                <div id="selectedName">
                    None
                </div>


                <button id="checkoutBtn">
                    Checkout
                </button>


            </div>


        `;


        setupCheckout();


        return;


    }




    // =========================
    // FULL UI
    // =========================


    selectedWrap.innerHTML = `


        <div class="selected-left">


            <h3>
                Selected<br>
                Licence
            </h3>


            <div class="total-box">


                <span>Total</span>


                <div id="totalPrice">
                    $${totalPrice}
                </div>


            </div>


        </div>


        <div class="selected-right">


            <div id="selectedName">


                ${licenceHTML}


            </div>


            <button id="checkoutBtn">
                Checkout ${count} Tracks
            </button>


        </div>


    `;




    // ========================================
    // ❌ REMOVE LICENCE
    // ========================================


    document
    .querySelectorAll(
        ".remove-selected-licence"
    )
    .forEach(btn => {


        btn.addEventListener(
        "click",
        () => {


            const beatId =
            btn.dataset.beat;


            // REMOVE LICENCE
            delete selectedLicences[beatId];


            // SAVE
            localStorage.setItem(
                "dopetone_licences",
                JSON.stringify(
                    selectedLicences
                )
            );


            // RESET ACTIVE UI
            document
            .querySelectorAll(
                ".licence-card"
            )
            .forEach(card => {


                card.classList.remove(
                    "active",
                    "faded"
                );


            });


            // REFRESH
            updateSelectedBar();


        });


    });




    // =========================
    // REBIND CHECKOUT
    // =========================


    setupCheckout();


}







// ========================================
// 🗑 REMOVE TRACK FROM CART
// ========================================


function removeBeatFromCart(event, id){
    event.stopPropagation();
    event.preventDefault();

    let cart = JSON.parse(localStorage.getItem("dopetone_cart")) || [];

    // Remove track
    cart = cart.filter(beat => beat.id!= id);
    localStorage.setItem("dopetone_cart", JSON.stringify(cart));

    // Remove its licence too
    let licences = JSON.parse(localStorage.getItem("dopetone_licences") || "{}");
    delete licences[id];
    localStorage.setItem("dopetone_licences", JSON.stringify(licences));

    updateCartCount();

    // If cart empty
    if(cart.length === 0){
        beatId = null;
        activeCartBeat = null;
        selectedLicence = null;
        window.currentBeat = null;
        if(audio){ audio.pause(); audio.currentTime = 0; }
        audio = null;

        document.body.classList.add("empty-mode");
        document.body.classList.remove("active-mode");

        safeSet("title","CART EMPTY");
        safeSet("genre","--"); safeSet("bpm","--"); safeSet("type","--");
        safeSet("mood","--"); safeSet("key","--");

        const cover = document.getElementById("cover");
        if(cover) cover.src = "images/logo.png";

        document.getElementById("selectedName").textContent = "None";
        document.getElementById("totalPrice").textContent = "$0";
        document.getElementById("checkoutBtn").textContent = "Checkout";

        window.history.replaceState({}, "", "licence-page.html");
        selectedLicences = {};
        localStorage.removeItem("dopetone_licences");
        document.querySelectorAll(".licence-card").forEach(card => {
            card.classList.remove("active", "faded");
        });
        document.body.style.background = "#05070d";
        document.querySelectorAll(".licence-card.old").forEach(el => el.textContent = "$00");
        document.querySelectorAll(".licence-card.new").forEach(el => el.textContent = "$00");

        renderCartBeatRow();
        renderSimilarTracks();
        checkEmptyState();
        updateSelectedBar();
        updateCheckoutTheme();
        return;
    }

    // 🔥 IF REMOVED BEAT WAS ACTIVE, ARM FIRST REMAINING
    if(String(id) === String(beatId)) {
        const nextBeat = cart[0];
        beatId = nextBeat.id;
        activeCartBeat = nextBeat;
        const url = new URL(window.location);
        url.searchParams.set("id", beatId);
        window.history.replaceState({}, "", url);
        switchActiveBeat(nextBeat);
    }

    renderCartBeatRow();
    checkEmptyState();
    renderSimilarTracks();
    updateSelectedBar();
    updateCheckoutTheme();
    

}


document.addEventListener(
"DOMContentLoaded",
() => {


    const playBtn =
    document.getElementById("playBtn")


    if(!playBtn) return


    playBtn.addEventListener(
    "click",
    async () => {


        const beat =
        window.__LICENCE_BEAT__


        if(!beat) return


        window.globalPlayer.play(
            0,
            [beat],
            "licence-page"
        )


    })


})


// ========================================
// 🌍 GLOBAL REMOVE ACCESS
// ========================================


window.removeBeatFromCart =
removeBeatFromCart
// ========================================
// 🌍 GLOBAL ACCESS
// ========================================


window.renderCartBeatRow =
renderCartBeatRow


window.updateCartCount =
updateCartCount


window.checkEmptyState =
checkEmptyState


window.switchActiveBeat =
switchActiveBeat



// ========================================
// 🖱 DRAG SCROLL CART ROW - FIXED
// ========================================
// ========================================
// 🖱 SCROLL - BRUTE FORCE
// ========================================
function initCartScroll() {
    const slider = document.getElementById("cartBeatRow");
    if(!slider) return;

    let isDown = false, startX, scrollLeft;

    slider.onmousedown = (e) => {
        if(e.target.closest(".remove-cart-track")) return;
        isDown = true;
        slider.style.cursor = 'grabbing';
        startX = e.pageX;
        scrollLeft = slider.scrollLeft;
        e.preventDefault();
    };

    slider.onmouseleave = () => { isDown = false; slider.style.cursor = 'grab'; };
    slider.onmouseup = () => { isDown = false; slider.style.cursor = 'grab'; };

    slider.onmousemove = (e) => {
        if(!isDown) return;
        e.preventDefault();
        slider.scrollLeft = scrollLeft - (e.pageX - startX) * 2;
    };

    slider.onwheel = (e) => {
        const hasOverflow = slider.scrollWidth > slider.clientWidth;
        const isOverCard = e.target.closest('.cart-beat-card');
        
        if (!hasOverflow || !isOverCard) return;
        
        const atStart = slider.scrollLeft <= 0;
        const atEnd = slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 1;
        
        if ((atStart && e.deltaY < 0) || (atEnd && e.deltaY > 0)) return;
        
        e.preventDefault();
        slider.scrollLeft += e.deltaY;
    };

    slider.style.overflowX = "auto";
    slider.style.cursor = "grab";
}

// Run after everything loads
setTimeout(initCartScroll, 500);
window.addEventListener("load", () => setTimeout(initCartScroll, 1000));
// 🔥 FORCE TITLE FUNCTION - ADD THIS
function forceTitle() {
    const cart = JSON.parse(localStorage.getItem("dopetone_cart") || "[]");
    if (cart.length === 0) return;

    const beat = window.currentBeat || cart[0];
    const titleEl = document.getElementById("title");

    if (titleEl && beat && beat.title) {
        titleEl.textContent = beat.title;
        titleEl.style.cssText = "opacity:1!important;visibility:visible!important";
        console.log("✅ TITLE SET:", beat.title);
    } else {
        console.log("❌ TITLE FAILED:", {titleEl:!!titleEl, beat:!!beat, title: beat?.title});
    }
}



// 🔥 MONETIZATION CONTROLLER
function applyMonetizationRules(beat) {
    const mode = beat.monetization_mode || 'paid';
    console.log('🔥 APPLYING MODE:', mode, 'for beat:', beat.title);
    
    const cards = document.querySelectorAll('.licence-card');
    const freeCard = document.querySelector('.licence-card.free');
    const paidCards = document.querySelectorAll('.licence-card.basic, .licence-card.pro, .licence-card.exclusive');
    
    // Reset
    cards.forEach(c => {
        c.classList.remove('locked', 'auto-selected');
        c.style.pointerEvents = 'auto';
        c.style.opacity = '1';
        const oldPrice = c.querySelector('.old');
        const newPrice = c.querySelector('.new');
        if (oldPrice && newPrice) {
            // Restore original prices
            const type = c.classList.contains('free') ? 'free' : 
                        c.classList.contains('basic') ? 'basic' :
                        c.classList.contains('pro') ? 'pro' : 'exclusive';
            const prices = {free:0, basic:19, pro:49, exclusive:199};
            oldPrice.textContent = `$${prices[type] + 20}`;
            newPrice.textContent = `$${prices[type]}`;
        }
    });
    
    if (mode === 'free') {
        console.log('✅ FREE MODE');
        // Lock paid cards
        paidCards.forEach(c => {
            c.classList.add('locked');
            c.style.pointerEvents = 'none';
            c.style.opacity = '0.25';
            c.querySelector('.old').textContent = '$00';
            c.querySelector('.new').textContent = '$00';
        });
        // Auto-select free
        if (freeCard) {
            freeCard.classList.add('auto-selected', 'active');
            selectedLicences[beat.id] = { name: 'FREE', price: 0 };
            localStorage.setItem('dopetone_licences', JSON.stringify(selectedLicences));
            setTimeout(() => { updateSelectedBar(); updateCheckoutTheme(); }, 100);
        }
        
    } else if (mode === 'paid') {
        console.log('✅ PAID MODE');
        // Lock free card
        if (freeCard) {
            freeCard.classList.add('locked');
            freeCard.style.pointerEvents = 'none';
            freeCard.style.opacity = '0.25';
        }
        
    } else {
        console.log('✅ HYBRID MODE - all unlocked');
        // Hybrid: all unlocked (default state)
    }
}
// 🔥 ULTRA NUCLEAR PLAYS - WITH API FETCH
async function nukePlays() {
    const beat = window.currentBeat; if (!beat) return;
    
    if (beat.play_count === undefined) {
        try {
            const r = await fetch(`${API_URL}/beats`);
            const d = await r.json();
            const f = d.find(x => x.id == beat.id);
            if (f) beat.play_count = f.play_count || 0;
        } catch(e) {}
    }
    
    let el = document.getElementById("playCount");
    if (!el) {
        el = document.createElement("div");
        el.id = "playCount";
        el.setAttribute("style", "all:unset!important;display:block!important;visibility:visible!important;opacity:1!important;position:relative!important;width:100%!important;height:auto!important;z-index:999999!important;");
    }
    
    const title = document.getElementById("title");
    if (title?.parentNode && el.parentNode !== title.parentNode) {
        title.parentNode.insertBefore(el, title.nextSibling);
    }
    
    const plays = beat.play_count ?? 0;
    el.innerHTML = `<div style="all:unset!important;display:block!important;color:#b3b3b3!important;font-size:14px!important;text-align:center!important;margin:8px 0!important;padding:0!important;opacity:1!important;visibility:visible!important;">${plays.toLocaleString()} plays</div>`;
    
    // Force it every time
    el.style.cssText = "all:unset!important;display:block!important;visibility:visible!important;opacity:1!important;position:relative!important;z-index:999999!important;width:100%!important;text-align:center!important;";
    
    console.log('🔥 NUKE VISIBLE:', plays);
}

setInterval(nukePlays, 300);
