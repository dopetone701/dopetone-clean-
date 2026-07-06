async function loadFooter() {


    const footerTarget =
    document.getElementById("footerMount")


    if(!footerTarget) return


    const res =
    await fetch("dopetone-footer.html")


    const html =
    await res.text()


    footerTarget.innerHTML = html
}


loadFooter()
