// ========================================
// 🔥 PLAYLIST CAPSULE DRAG SCROLL
// ========================================

const capsules =
document.querySelector(
".playlist-capsules"
)

if(capsules){

    let isDown = false
    let startX = 0
    let scrollLeft = 0

    // ===============================
    // DESKTOP
    // ===============================

    capsules.addEventListener(
    "mousedown",
    e => {

        isDown = true

        capsules.classList.add(
        "dragging"
        )

        startX = e.pageX

        scrollLeft =
        capsules.scrollLeft
    })

    window.addEventListener(
    "mouseup",
    () => {

        isDown = false

        capsules.classList.remove(
        "dragging"
        )
    })

    capsules.addEventListener(
    "mousemove",
    e => {

        if(!isDown) return

        e.preventDefault()

        const walk =
        (e.pageX - startX) * 1.4

        capsules.scrollLeft =
        scrollLeft - walk
    })

    // ===============================
    // MOBILE TOUCH
    // ===============================

    let touchStartX = 0
    let touchScrollLeft = 0

    capsules.addEventListener(
    "touchstart",
    e => {

        touchStartX =
        e.touches[0].clientX

        touchScrollLeft =
        capsules.scrollLeft
    },
    { passive:true }
    )

    capsules.addEventListener(
    "touchmove",
    e => {

        const touchX =
        e.touches[0].clientX

        const walk =
        (touchX - touchStartX) * 1.3

        capsules.scrollLeft =
        touchScrollLeft - walk
    },
    { passive:true }
    )

}
