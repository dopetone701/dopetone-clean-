// store.js
window.store = {
  beats: [],
  filteredBeats: [],
  loaded: false
}
// ========================================
// 🔥 GLOBAL STORE
// ========================================


window.store = {


    beats: [],
    filteredBeats: [],
    loaded: false


}




// ========================================
// 🔥 APP BOOT
// ========================================


document.addEventListener(
    "DOMContentLoaded",
    () => {


        loadUser()


        syncCartUI()


        initGlobalCartButtons()


    }
)




// ========================================
// 🔥 LOAD USER
// ========================================


function loadUser(){


    const loginBtn =
    document.getElementById(
        "loginBtn"
    )


    const signupBtn =
    document.getElementById(
        "signupBtn"
    )


    const userArea =
    document.getElementById(
        "userArea"
    )


    const panelName =
    document.getElementById(
        "panelName"
    )


    const userAvatar =
    document.getElementById(
        "userAvatar"
    )


    const panelAvatar =
    document.getElementById(
        "panelAvatar"
    )


    const mobileProfileAvatar =
    document.getElementById(
        "mobileProfileAvatar"
    )


    const loggedIn =
    localStorage.getItem(
        "loggedIn"
    )


    const currentUser =
    JSON.parse(
        localStorage.getItem(
            "currentUser"
        )
    )




    // RESET
    if(loginBtn){
        loginBtn.style.display =
        "flex"
    }


    if(signupBtn){
        signupBtn.style.display =
        "flex"
    }


    if(userArea){
        userArea.style.display =
        "none"
    }




    // USER ACTIVE
    if(
        loggedIn === "true" &&
        currentUser
    ){


        if(loginBtn){
            loginBtn.style.display =
            "none"
        }


        if(signupBtn){
            signupBtn.style.display =
            "none"
        }


        if(userArea){
            userArea.style.display =
            "flex"
        }


        if(panelName){
            panelName.textContent =
            currentUser.username
        }


        if(
            currentUser.avatar &&
            userAvatar
        ){
            userAvatar.src =
            currentUser.avatar
        }


        if(
            currentUser.avatar &&
            panelAvatar
        ){
            panelAvatar.src =
            currentUser.avatar
        }


        if(
            currentUser.avatar &&
            mobileProfileAvatar
        ){
            mobileProfileAvatar.src =
            currentUser.avatar
        }


    }


}




// ========================================
// 🛒 CART UI
// ========================================


function syncCartUI(){


    const cart =
    JSON.parse(
        localStorage.getItem(
            "dopetone_cart"
        )
    ) || []




    const counters =
    document.querySelectorAll(
        ".cart-count"
    )


    counters.forEach(counter => {


        counter.textContent =
        cart.length


        counter.style.display =
        cart.length > 0
        ? "flex"
        : "none"


    })




    const mobileCartBtn =
    document.getElementById(
        "mobileCartBtn"
    )


    if(mobileCartBtn){


        mobileCartBtn.setAttribute(
            "data-count",
            cart.length
        )


    }


}




// ========================================
// 🛒 OPEN CART
// ========================================


function openCartPage(){


    window.location.href =
    "licence-page.html"


}




// ========================================
// 🛒 CART BUTTONS
// ========================================


document.addEventListener(
    "click",
    (e) => {


        const cartBtn =
        e.target.closest(
            "#cartBtn, #mobileCartBtn"
        )


        if(!cartBtn) return


        e.preventDefault()


        openCartPage()


    }
)




// ========================================
// 🛒 BUY BUTTON SYSTEM
// ========================================


function initGlobalCartButtons(){


    const buttons =
    document.querySelectorAll(
        ".buy-btn"
    )


    buttons.forEach(btn => {


        if(btn.dataset.ready) return


        btn.dataset.ready = "true"


        btn.addEventListener(
            "click",
            () => {


                const beat = {


                    id:
                    btn.dataset.id,


                    title:
                    btn.dataset.title,


                    cover:
                    btn.dataset.cover,


                    genre:
                    btn.dataset.genre,


                    bpm:
                    btn.dataset.bpm,


                    audio:
                    btn.dataset.audio


                }


                if(!beat.id){
                    return
                }


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


                if(!exists){


                    cart.push(beat)


                    localStorage.setItem(
                        "dopetone_cart",
                        JSON.stringify(cart)
                    )


                }


                syncCartUI()


                window.location.href =
                `licence-page.html?id=${beat.id}`


            }
        )


    })


}




// ========================================
// 🌍 GLOBAL ACCESS
// ========================================


window.loadUser =
loadUser


window.syncCartUI =
syncCartUI
