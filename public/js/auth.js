// ========================================
// 🔥 AUTH MANAGER v3.0 - CLOUDFLARE D1 ONLY
// ========================================

const ADMIN_EMAIL = 'dopetone701@gmail.com';
const API_URL = 'https://api.dopetonevault.com';

class AuthManager {
  constructor() {
    this.user = null;
    this.isSignup = false;
    this.cropper = null;
    this.avatarData = "images/default-user.png";
    this.els = {};
    this._globalListenersAdded = false;

    const justLoggedOut = sessionStorage.getItem('just_logged_out');
    if (justLoggedOut) {
      sessionStorage.removeItem('just_logged_out');
      this.clearAllUserData();
    }

    this.cacheElements();
    this.bindGlobalEvents();
    this.initSession();
  }

  // 🔥 USER-SPECIFIC STORAGE
  getUserStorage(key) {
    const userId = localStorage.getItem('dopetone_user_id');
    if (!userId) return localStorage.getItem(key) || '[]';
    return localStorage.getItem(`${key}_${userId}`) || localStorage.getItem(key) || '[]';
  }

  setUserStorage(key, value) {
    const userId = localStorage.getItem('dopetone_user_id');
    if (!userId) {
      localStorage.setItem(key, value);
      return;
    }
    localStorage.setItem(`${key}_${userId}`, value);
    if (this.user) {
      setTimeout(() => this.saveUserDataToCloud(), 500);
    }
  }

  async saveUserDataToCloud() {
    if (!this.user) return;
   
    const userId = this.user.id;
    const data = {
      user_id: userId,
      cart: JSON.parse(this.getUserStorage('dopetone_cart')),
      playlists: JSON.parse(this.getUserStorage('dopetone_playlists')),
      likes: JSON.parse(this.getUserStorage('dopetone_liked_beats')),
      licences: JSON.parse(this.getUserStorage('dopetone_licences')),
      avatar: this.user.avatar,
      settings: {
        theme: localStorage.getItem('dopetone_theme'),
        volume: localStorage.getItem('dopetone_volume')
      }
    };

    try {
      await fetch(`${API_URL}/api/user/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) {
      console.log('Cloud sync failed');
    }
  }

  async loadUserDataFromCloud() {
  if (!this.user) return;
 
  const userId = this.user.id;
  console.log('🔄 Loading from D1 for:', userId);

  try {
    const res = await fetch(`${API_URL}/api/user/${userId}/data`);
    const cloudData = await res.json();
   
    console.log('📦 D1 Response:', cloudData);

    if (cloudData) {
      // Load cart/likes/playlists
      this.setUserStorage('dopetone_cart', JSON.stringify(cloudData.cart || []));
      this.setUserStorage('dopetone_playlists', JSON.stringify(cloudData.playlists || []));
      this.setUserStorage('dopetone_liked_beats', JSON.stringify(cloudData.likes || []));
      this.setUserStorage('dopetone_licences', JSON.stringify(cloudData.licences || {}));

      // LOAD AVATAR FROM D1 - This is the key
      if (cloudData.avatar) {
        console.log('✅ Loading avatar from D1:', cloudData.avatar);
        this.user.avatar = cloudData.avatar;
        this.avatarData = cloudData.avatar;
        localStorage.setItem('dopetone_user', JSON.stringify(this.user));
        
        // Update all avatar elements
        document.querySelectorAll('[data-user-avatar], #userAvatar, #panelAvatar, .header-avatar')
          .forEach(img => { if (img) img.src = cloudData.avatar; });
      }
    }
  } catch (e) {
    console.error('❌ Cloud load failed:', e);
    this.migrateToUserStorage();
  }
}


  migrateToUserStorage() {
    if (!this.user) return;
    const userId = this.user.id;

    const keys = ['dopetone_cart', 'dopetone_playlists', 'dopetone_liked_beats', 'dopetone_licences'];
   
    keys.forEach(key => {
      const old = localStorage.getItem(key);
      if (old &&!localStorage.getItem(`${key}_${userId}`)) {
        localStorage.setItem(`${key}_${userId}`, old);
      }
    });
  }

  initSession() {
    const savedUser = localStorage.getItem('dopetone_user');
    if (savedUser) {
      this.user = JSON.parse(savedUser);
      localStorage.setItem('dopetone_user_id', this.user.id);
    }
    this.syncUI();
  }

  reinit() {
    this.cacheElements();
    this.bindGlobalEvents();
    this.syncUI();
  }

  cacheElements() {
    const ids = [
      'authModal', 'authForm', 'authTitle', 'authSubtitle', 'authUsername',
      'authEmail', 'authPassword', 'authSubmit', 'authError', 'authCloseBtn',
      'switchAuthBtn', 'switchAuthText', 'signupAvatarWrap', 'avatarInput',
      'avatarPreview', 'accountPanel', 'accountBtn', 'panelName', 'panelEmail',
      'panelAvatar', 'userAvatar', 'logoutAction', 'authToastText', 'authToast',
      'cropModal', 'cropImage', 'saveCrop', 'cancelCrop', 'changeAvatarInput',
      'usernameGroup', 'forgotPasswordBtn', 'authBox', 'controlCenterBtn'
    ];

    ids.forEach(id => this.els[id] = document.getElementById(id));

    this.els.loginTriggers = document.querySelectorAll('[data-auth="login"]');
    this.els.signupTriggers = document.querySelectorAll('[data-auth="signup"]');
    this.els.userAreas = document.querySelectorAll('[data-auth="user-area"]');
    this.els.guestAreas = document.querySelectorAll('[data-auth="guest-area"]');
  }

  bindGlobalEvents() {
    this.els.loginTriggers.forEach(btn => {
      btn.onclick = null;
      btn.onclick = () => this.openModal(false);
    });

    this.els.signupTriggers.forEach(btn => {
      btn.onclick = null;
      btn.onclick = () => this.openModal(true);
    });

    if (this.els.authCloseBtn) this.els.authCloseBtn.onclick = () => this.closeModal();
    if (this.els.authModal) this.els.authModal.onclick = (e) => { if (e.target === this.els.authModal) this.closeModal(); };
    if (this.els.switchAuthBtn) this.els.switchAuthBtn.onclick = () => this.toggleMode();
    if (this.els.authForm) this.els.authForm.onsubmit = (e) => { e.preventDefault(); this.handleSubmit(); };
    if (this.els.avatarInput) this.els.avatarInput.onchange = (e) => this.handleAvatar(e);
    if (this.els.changeAvatarInput) this.els.changeAvatarInput.onchange = (e) => this.handleAvatar(e);
    if (this.els.saveCrop) this.els.saveCrop.onclick = () => this.saveCrop();
    if (this.els.cancelCrop) this.els.cancelCrop.onclick = () => this.closeCropper();
    if (this.els.accountPanel) this.els.accountPanel.onclick = (e) => { if (e.target === this.els.accountPanel) this.closeAccountPanel(); };
    if (this.els.logoutAction) this.els.logoutAction.onclick = () => this.logout();
    if (this.els.forgotPasswordBtn) this.els.forgotPasswordBtn.onclick = () => this.handleForgotPassword();

    if (this.els.controlCenterBtn) {
      this.els.controlCenterBtn.onclick = () => {
        window.location.href = '/control-center.html';
        this.closeAccountPanel();
      };
    }

    if (!this._globalListenersAdded) {
      document.addEventListener('click', (e) => {
        const accountBtn = e.target.closest('#accountBtn');
        if (accountBtn) {
          e.preventDefault();
          e.stopPropagation();
          this.toggleAccountPanel();
        }
      });

      document.addEventListener('click', (e) => {
        const cartBtn = e.target.closest('[data-cart="open"]');
        if (cartBtn) {
          e.preventDefault();
          e.stopPropagation();
          this.handleCartClick();
        }
      });

      document.addEventListener('click', (e) => {
        const playlistsBtn = e.target.closest('[data-action="playlists"]');
        if (playlistsBtn) {
          e.preventDefault();
          e.stopPropagation();
          window.location.href = 'playlists.html';
          this.closeAccountPanel();
        }
      });

      document.addEventListener('click', (e) => {
        const likedBtn = e.target.closest('[data-action="liked"]');
        if (likedBtn) {
          e.preventDefault();
          e.stopPropagation();
          this.handleLikedClick(likedBtn);
        }
      });

      document.addEventListener('click', (e) => {
        if (this.els.accountPanel?.classList.contains('active') &&
           !e.target.closest('#accountPanel') &&
           !e.target.closest('#accountBtn')) {
          this.closeAccountPanel();
        }
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') this.syncUI();
      });
     
      window.addEventListener('pageshow', () => this.syncUI());
     
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeModal();
          this.closeAccountPanel();
          this.closeCropper();
        }
      });
      // Mobile panel profile click = open login if guest
const mobileProfileBtn = document.getElementById('mobileProfileBtn');
if (mobileProfileBtn) {
  mobileProfileBtn.onclick = () => {
    if (!this.user) {
      this.openModal(false); // Open login
      document.getElementById('navPanel')?.classList.remove('active'); // Close mobile menu
    } else {
      this.toggleAccountPanel(); // Open account panel if logged in
    }
  };
}


      window.addEventListener('cartUpdated', () => this.updateCartCount());
     
      window.addEventListener('storage', (e) => {
        if (e.key?.includes('dopetone_cart')) this.updateCartCount();
      });

      this._globalListenersAdded = true;
    }
  }

  handleCartClick() {
    const cart = JSON.parse(this.getUserStorage('dopetone_cart'));
    if (cart.length === 0) {
      window.location.href = "licence-page.html";
      return;
    }
    const firstBeat = cart[0];
    window.location.href = `licence-page.html?id=${firstBeat.id}`;
  }

  handleLikedClick(btn) {
    const playlists = JSON.parse(this.getUserStorage('dopetone_playlists'));
    const likedPlaylist = playlists.find(p => p.isLiked || p.type === 'liked');
   
    if (!likedPlaylist ||!likedPlaylist.beats || likedPlaylist.beats.length === 0) {
      btn.classList.add('shake');
      setTimeout(() => btn.classList.remove('shake'), 500);
      this.showToast('No liked tracks yet');
      this.closeAccountPanel();
      return;
    }

    window.location.href = 'playlists.html?tab=liked';
    this.closeAccountPanel();
  }

  openModal(signup = false) {
    this.isSignup = signup;
    this.updateModalUI();
    this.showModal(this.els.authModal);
    setTimeout(() => this.els.authEmail?.focus(), 100);
  }

  closeModal() {
    this.hideModal(this.els.authModal);
    this.els.authForm?.reset();
    this.clearError();
  }

  toggleMode() {
    this.isSignup =!this.isSignup;
    this.updateModalUI();
    this.clearError();
  }

  updateModalUI() {
    if (!this.els.authTitle) return;
    this.els.authTitle.textContent = this.isSignup? 'Create Account' : 'Welcome Back';
    this.els.authSubtitle.textContent = this.isSignup? 'Join the arsenal today' : 'Login to access your arsenal';
    this.els.authPassword.autocomplete = this.isSignup? 'new-password' : 'current-password';
    this.els.usernameGroup.style.display = this.isSignup? 'block' : 'none';
    this.els.signupAvatarWrap.style.display = this.isSignup? 'flex' : 'none';
    this.els.switchAuthText.textContent = this.isSignup? 'Already have an account?' : "Don't have an account?";
    this.els.switchAuthBtn.textContent = this.isSignup? 'Login' : 'Sign Up';
    this.els.authBox?.setAttribute('data-mode', this.isSignup? 'signup' : 'login');
  }

  async handleSubmit() {
    const username = this.els.authUsername.value.trim();
    const email = this.els.authEmail.value.trim();
    const password = this.els.authPassword.value.trim();

    if (!email ||!password) return this.showError('Fill all required fields');
    if (this.isSignup &&!username) return this.showError('Enter username');
    if (password.length < 6) return this.showError('Password must be 6+ characters');

    this.els.authSubmit.disabled = true;
    this.els.authSubmit.textContent = 'Please wait...';

    try {
      if (this.user) {
        await this.saveUserDataToCloud();
      }

      const endpoint = this.isSignup? '/api/auth/signup' : '/api/auth/login';
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          username: username || email.split('@')[0],
          avatar: this.avatarData
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Auth failed');

      this.user = data.user;
      console.log('👤 User from auth:', this.user);
      localStorage.setItem('dopetone_user', JSON.stringify(this.user));
      localStorage.setItem('dopetone_user_id', this.user.id);

      console.log('⏳ Loading D1 data...');
      await this.loadUserDataFromCloud();
      console.log('✅ D1 loaded, user now:', this.user);
     
      this.syncUI();
      console.log('🎨 UI synced, avatar should be:', this.user.avatar);
     
      this.showToast(`Welcome ${this.user.username}`);
      this.closeModal();

    } catch (err) {
      console.log('API failed, using local:', err);

      const userData = {
        id: 'local_' + Date.now(),
        email: email,
        username: username || email.split('@')[0],
        avatar: this.avatarData,
        created_at: new Date().toISOString()
      };

      this.user = userData;
      localStorage.setItem('dopetone_user', JSON.stringify(userData));
      localStorage.setItem('dopetone_user_id', userData.id);

      this.migrateToUserStorage();

      this.showToast(`Welcome ${userData.username} (offline)`);
      this.closeModal();
      this.syncUI();

    } finally {
      this.els.authSubmit.disabled = false;
      this.els.authSubmit.textContent = 'Continue';
    }
  }

  async handleForgotPassword() {
  const email = this.els.authEmail.value.trim();
  
  if (!email) {
    this.showError('Enter your email first');
    this.els.authEmail.focus();
    return;
  }
  
  if (!this.isValidEmail(email)) {
    this.showError('Enter a valid email');
    return;
  }
  
  this.showToast('Password reset link sent to ' + email);
  
  // TODO LATER: Send actual email with verification code
  // For now just show toast. When ready, we'll add email service.
}


  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  handleAvatar(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.showToast('Please select an image');
      return;
    }
    this.openCropper(file);
  }

  openCropper(file) {
    const reader = new FileReader();
    reader.onload = () => {
      this.els.cropImage.src = reader.result;
      this.showModal(this.els.cropModal);

      if (this.cropper) {
        this.cropper.destroy();
        this.cropper = null;
      }

      this.els.cropImage.onload = () => {
        this.cropper = new Cropper(this.els.cropImage, {
          aspectRatio: 1,
          viewMode: 1,
          autoCropArea: 0.8,
          background: false,
          dragMode: 'move',
          guides: false,
          center: true,
          highlight: false,
          cropBoxMovable: true,
          cropBoxResizable: true,
          toggleDragModeOnDblclick: false,
          responsive: true
        });
      };
    };
    reader.readAsDataURL(file);
  }

  async saveCrop() {
  if (!this.cropper) return;
 
  const canvas = this.cropper.getCroppedCanvas({ width: 500, height: 500 });
 
  canvas.toBlob(async (blob) => {
    const fd = new FormData();
    fd.append('file', blob, 'avatar.png');
    fd.append('folder', 'avatars');

    try {
      // Upload to R2
      const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) this.avatarData = data.url;
    } catch (err) {
      // Fallback to base64 if R2 fails
      this.avatarData = canvas.toDataURL('image/png');
    }

    // Update UI immediately
    document.querySelectorAll('[data-user-avatar], #userAvatar, #panelAvatar, #avatarPreview')
      .forEach(img => { if (img) img.src = this.avatarData; });

    // Save to user profile + D1
    if (this.user) {
      this.user.avatar = this.avatarData;
      localStorage.setItem('dopetone_user', JSON.stringify(this.user));
     
      // 1. Update users_auth table
      await fetch(`${API_URL}/api/auth/update-avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.user.email, avatar: this.avatarData })
      }).catch(() => {});
      
      // 2. Update user_data table for cross-device sync
      await this.saveUserDataToCloud();
    }

    this.closeCropper();
    this.showToast('Avatar saved to cloud');
  }, 'image/png', 0.9);
}


  closeCropper() {
    this.hideModal(this.els.cropModal);
    if (this.cropper) {
      this.cropper.destroy();
      this.cropper = null;
    }
  }

  toggleAccountPanel() {
    this.els.accountPanel?.classList.toggle('active');
    this.els.accountPanel?.setAttribute('aria-hidden',
      this.els.accountPanel.classList.contains('active')? 'false' : 'true'
    );
  }

  closeAccountPanel() {
    this.els.accountPanel?.classList.remove('active');
    this.els.accountPanel?.setAttribute('aria-hidden', 'true');
  }

  async logout() {
    if (!confirm('Logout? Your data will be saved.')) return;

    await this.saveUserDataToCloud();

    localStorage.removeItem('dopetone_user');
    localStorage.removeItem('dopetone_user_id');

    this.user = null;
    this.avatarData = "images/default-user.png";

    this.closeAccountPanel();
    this.syncUI();
    this.showToast('Logged out');

    window.dispatchEvent(new CustomEvent('auth:logout'));

    sessionStorage.setItem('just_logged_out', '1');

    setTimeout(() => {
      window.location.href = window.location.pathname;
    }, 800);
  }

  clearAllUserData() {
    localStorage.removeItem('dopetone_user');
    localStorage.removeItem('dopetone_user_id');
    localStorage.removeItem('dopetone_player_state');
    localStorage.removeItem('dopetone_current_track');
    sessionStorage.clear();
  }

  syncUI() {
  const savedUser = localStorage.getItem('dopetone_user');
  this.user = savedUser? JSON.parse(savedUser) : null;
  const isLoggedIn =!!this.user;
  const isAdmin = this.user?.email === 'dopetone701@gmail.com';

  const DEFAULT_AVATAR = "images/default-user.png";

  // ===== YOUR EXISTING HEADER ELEMENTS =====
  const authGuest = document.getElementById('authGuest');
  const authUser = document.getElementById('authUser');
  const controlCenterBtn = document.getElementById('controlCenterBtn');
  
  // Mobile panel elements
  const mobileProfileName = document.getElementById('mobileProfileName');
  const mobileProfileSub = document.getElementById('mobileProfileSub');
  const mobileProfileAvatar = document.getElementById('mobileProfileAvatar');

  if (isLoggedIn) {
    const avatar = this.user.avatar || DEFAULT_AVATAR;
    const name = this.user.username || this.user.email.split('@')[0];

    // 1. SWAP GUEST → USER
    if (authGuest) authGuest.style.display = 'none';
    if (authUser) authUser.style.display = 'flex';

    // 2. ADMIN ONLY: Control Center in account panel
    if (controlCenterBtn) {
      controlCenterBtn.style.display = isAdmin? 'flex' : 'none';
    }

    // 3. UPDATE ALL AVATARS
    const avatars = [
      this.els.userAvatar,
      this.els.panelAvatar,
      document.getElementById('userAvatar'),
      document.getElementById('panelAvatar'),
      mobileProfileAvatar
    ].filter(Boolean);

    avatars.forEach(img => {
      img.src = avatar;
      img.onerror = () => img.src = DEFAULT_AVATAR;
    });

    // 4. UPDATE PANEL + MOBILE MENU
    if (this.els.panelName) this.els.panelName.textContent = name;
    if (this.els.panelEmail) this.els.panelEmail.textContent = this.user.email;
    if (mobileProfileName) mobileProfileName.textContent = name;
    if (mobileProfileSub) mobileProfileSub.textContent = this.user.email;

    document.body.classList.add('logged-in');
    if (isAdmin) document.body.classList.add('is-admin');

  } else {
    // LOGGED OUT - Show login/signup, hide user stuff
    if (authGuest) authGuest.style.display = 'flex';
    if (authUser) authUser.style.display = 'none';
    if (controlCenterBtn) controlCenterBtn.style.display = 'none';

    // Reset mobile panel to guest
    if (mobileProfileName) mobileProfileName.textContent = 'Guest';
    if (mobileProfileSub) mobileProfileSub.textContent = 'Tap to sign in';
    if (mobileProfileAvatar) mobileProfileAvatar.src = DEFAULT_AVATAR;

    // Reset all avatars
    document.querySelectorAll('#userAvatar, #panelAvatar, #mobileProfileAvatar').forEach(img => {
      img.src = DEFAULT_AVATAR;
    });

    document.body.classList.remove('logged-in', 'is-admin');
  }

  this.updateCartCount();
  this.fixCameraPosition();
}

  fixCameraPosition() {
    const style = document.createElement('style');
    style.textContent = `
     .panel-avatar-wrap,.avatar-upload-box {
        position: relative;
        display: inline-block;
      }
     .panel-edit-avatar,.avatar-edit-btn {
        position: absolute!important;
        bottom: -2px!important;
        right: -2px!important;
        width: 28px!important;
        height: 28px!important;
        background: #0f0!important;
        border: 2px solid #000!important;
        border-radius: 50%!important;
        display: flex!important;
        align-items: center!important;
        justify-content: center!important;
        cursor: pointer!important;
        transition: transform 0.2s!important;
        z-index: 10!important;
      }
     .panel-edit-avatar:hover,.avatar-edit-btn:hover {
        transform: scale(1.1)!important;
      }
     .panel-edit-avatar i,.avatar-edit-btn i {
        color: #000!important;
        font-size: 12px!important;
      }
      #panelAvatar, #userAvatar {
        display: block;
        border-radius: 50%;
      }
    `;
    if (!document.getElementById('avatar-fix-style')) {
      style.id = 'avatar-fix-style';
      document.head.appendChild(style);
    }
    this.updateCartCount();
  }

  updateCartCount() {
    const cart = JSON.parse(this.getUserStorage('dopetone_cart'));
    document.querySelectorAll('.cart-count').forEach(count => {
      count.textContent = cart.length;
      count.style.display = cart.length > 0? 'flex' : 'none';
    });
  }

  showModal(el) {
    if (!el) return;
    el.classList.add('active');
    el.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }

  hideModal(el) {
    if (!el) return;
    el.classList.remove('active');
    el.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }

  showError(msg) {
    if (!this.els.authError) return alert(msg);
    this.els.authError.textContent = msg;
    this.els.authError.style.display = 'block';
  }

  clearError() {
    if (this.els.authError) this.els.authError.style.display = 'none';
  }

  showToast(text) {
    if (!this.els.authToast) return;
    this.els.authToastText.textContent = text;
    this.els.authToast.classList.add('active');
    setTimeout(() => this.els.authToast.classList.remove('active'), 2000);
  }
}

// BOOT
window.Auth = new AuthManager();

window.initAuth = () => {
  if (window.Auth) {
    window.Auth.reinit();
  } else {
    window.Auth = new AuthManager();
  }
};

window.refreshCartUI = () => {
  window.Auth?.updateCartCount();
  window.dispatchEvent(new Event('cartUpdated'));
};
