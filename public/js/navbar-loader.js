// js/app-loader.js
async function bootApp() {
  try {
    // 1. Load navbar first
    console.log('Loading navbar...');
    const navRes = await fetch('navbar.html');
    if (!navRes.ok) throw new Error('navbar.html failed');
    const navHtml = await navRes.text();
    document.getElementById('navbarMount').innerHTML = navHtml;

    // 2. Load auth HTML fragment - NO /pages/ FOLDER
    console.log('Loading auth.html...');
    const authRes = await fetch('auth.html'); // MUST BE 'auth.html'
    if (!authRes.ok) throw new Error('auth.html failed');
    const authHtml = await authRes.text();
    document.getElementById('authMount').innerHTML = authHtml;

    // 3. Now load auth.js AFTER both HTML chunks exist
    console.log('Loading auth.js...');
    await import('./auth.js');
    console.log('AuthManager booted:', !!window.Auth);

    // 4. Init mobile menu after navbar exists
    window.initMobileMenu?.();

  } catch (err) {
    console.error('Boot failed:', err);
  }
}

document.addEventListener('DOMContentLoaded', bootApp);

