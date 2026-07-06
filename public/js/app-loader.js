// js/app-loader.js
async function bootApp() {
  try {
    console.log('1. Loading navbar...');
    const navRes = await fetch('navbar.html');
    console.log('Navbar status:', navRes.status);
    const navHtml = await navRes.text();
    document.getElementById('navbarMount').innerHTML = navHtml;

    console.log('2. Loading auth.html...');
    const authRes = await fetch('auth.html');
    console.log('Auth status:', authRes.status);
    const authHtml = await authRes.text();
    document.getElementById('authMount').innerHTML = authHtml;

    console.log('3. Loading auth.js...');
    await import('./auth.js');
    console.log('4. Auth booted:', !!window.Auth);
    console.log('5. accountBtn found:', !!document.getElementById('accountBtn'));

    window.initMobileMenu?.();

  } catch (err) {
    console.error('BOOT CRASHED:', err);
  }
}

document.addEventListener('DOMContentLoaded', bootApp);
