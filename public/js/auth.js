// ========================================
// 🔥 AUTH MANAGER v3.4 - FORGOT PASSWORD FLOW
// ========================================

const ADMIN_EMAIL = 'dopetone701@gmail.com';
const API_URL = 'https://api.dopetonevault.com';
const DEFAULT_AVATAR = 'images/default-user.png';

class AuthManager {
  constructor() {
    this.user = null;
    this.isSignup = false;
    this.cropper = null;
    this.avatarData = DEFAULT_AVATAR;
    this.els = {};
    this._globalListenersAdded = false;
    this._navbarReady = false;
   
    // OTP STATE
    this.otpEmail = '';
    this.otpTimer = null;
    this.otpSeconds = 300;
    this.pendingUsername = '';
    this.pendingPassword = '';

    // FORGOT PASSWORD STATE
    this.isResetFlow = false;

    const justLoggedOut = sessionStorage.getItem('just_logged_out');
    if (justLoggedOut) {
      sessionStorage.removeItem('just_logged_out');
      this.clearAllUserData();
    }

    this.init();
  }

  // 🔥 MAIN INIT - waits for navbar before binding anything
  async init() {
    await this.waitForNavbar();
    this._navbarReady = true;
   
    this.cacheElements();
    this.bindGlobalEvents();
    this.initSession();
   
    console.log("✅ AuthManager ready - navbar loaded");
  }

  // 🔥 WAIT FOR NAVBAR HELPER
  waitForNavbar() {
    return new Promise((resolve) => {
      const hasAccountBtn =!!document.getElementById('accountBtn');
      const hasLoginBtn =!!document.getElementById('loginBtn');
      const hasUserAvatar =!!document.getElementById('userAvatar');
     
      if (hasAccountBtn || hasLoginBtn || hasUserAvatar) {
        return resolve();
      }

      const observer = new MutationObserver(() => {
        if (document.getElementById('accountBtn') ||
            document.getElementById('loginBtn') ||
            document.getElementById('userAvatar')) {
          observer.disconnect();
          resolve();
        }
      });
     
      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        resolve();
      }, 3000);
    });
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
        this.setUserStorage('dopetone_cart', JSON.stringify(cloudData.cart || []));
        this.setUserStorage('dopetone_playlists', JSON.stringify(cloudData.playlists || []));
        this.setUserStorage('dopetone_liked_beats', JSON.stringify(cloudData.likes || []));
        this.setUserStorage('dopetone_licences', JSON.stringify(cloudData.licences || {}));

        if (cloudData.avatar) {
          console.log('✅ Loading avatar from D1:', cloudData.avatar);
          this.user.avatar = cloudData.avatar;
          this.avatarData = cloudData.avatar;
          localStorage.setItem('dopetone_user', JSON.stringify(this.user));
         
          document.querySelectorAll('[data-user-avatar], #userAvatar, #panelAvatar,.header-avatar')
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
      'avatarPreview', 'accountPanel', 'panelName', 'panelEmail',
      'panelAvatar', 'logoutAction', 'authToastText', 'authToast',
      'cropModal', 'cropImage', 'saveCrop', 'cancelCrop', 'changeAvatarInput',
      'usernameGroup', 'forgotPasswordBtn', 'authBox', 'controlCenterBtn',
      'togglePassword',
      // OTP
      'otpModal', 'otpEmail', 'otpInputs', 'otpVerifyBtn', 'otpResendBtn',
      'otpError', 'otpCloseBtn', 'otpCountdown',
      // LOGOUT
      'logoutModal', 'logoutCancelBtn', 'logoutConfirmBtn',
      // RESET PASSWORD
      'resetPasswordModal', 'resetEmail', 'newPassword', 'confirmNewPassword',
      'resetSubmitBtn', 'resetError', 'resetCloseBtn', 'toggleNewPassword',
      'toggleConfirmPassword', 'resetPasswordForm'
    ];

    ids.forEach(id => this.els[id] = document.getElementById(id));
  }

  bindGlobalEvents() {
    if (this._globalListenersAdded) return;
    this._globalListenersAdded = true;

    // 🔥 SINGLE GLOBAL CLICK HANDLER
    document.addEventListener('click', (e) => {
      const loginEl = e.target.closest('#loginBtn, #mobileLoginBtn');
      const signupEl = e.target.closest('#signupBtn, #mobileSignupBtn');
      const accountEl = e.target.closest('#accountBtn, #userAvatar,.avatar-btn');

      if (loginEl) {
        e.preventDefault();
        e.stopPropagation();
        this.closeMobileNav();
        this.openModal(false);
        return;
      }

      if (signupEl) {
        e.preventDefault();
        e.stopPropagation();
        this.closeMobileNav();
        this.openModal(true);
        return;
      }

      if (accountEl) {
        e.preventDefault();
        e.stopPropagation();
        if (this.user) {
          this.toggleAccountPanel();
        } else {
          this.openModal(false);
        }
        return;
      }

      // CLOSE PANEL WHEN CLICKING OUTSIDE
      const panel = document.getElementById('accountPanel');
      if (panel?.classList.contains('active')) {
        if (!panel.contains(e.target)) {
          panel.classList.remove('active');
        }
      }
    }, true);

    // STATIC MODAL ELEMENTS
    this.els.authCloseBtn?.addEventListener('click', () => this.closeModal());
    this.els.authModal?.addEventListener('click', (e) => {
      if (e.target === this.els.authModal) this.closeModal();
    });

    this.els.authForm?.addEventListener('submit', (e) => this.handleSubmit(e));
    this.els.switchAuthBtn?.addEventListener('click', () => this.toggleMode());
    this.els.forgotPasswordBtn?.addEventListener('click', () => this.handleForgotPassword());
    this.els.logoutAction?.addEventListener('click', () => this.logout());

    // PASSWORD TOGGLE
    this.els.togglePassword?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const input = this.els.authPassword;
      const icon = e.currentTarget.querySelector('i');

      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    });

    // OTP MODAL EVENTS
    this.els.otpCloseBtn?.addEventListener('click', () => this.closeOtpModal());
    this.els.otpVerifyBtn?.addEventListener('click', () => this.verifyOtp());
    this.els.otpResendBtn?.addEventListener('click', () => this.resendOtp());
    this.setupOtpInputs();

    // LOGOUT MODAL EVENTS
    this.els.logoutCancelBtn?.addEventListener('click', () => this.hideModal(this.els.logoutModal));
    this.els.logoutConfirmBtn?.addEventListener('click', () => this.confirmLogout());

    // RESET PASSWORD MODAL EVENTS
    this.els.resetCloseBtn?.addEventListener('click', () => this.closeResetModal());
    this.els.resetPasswordForm?.addEventListener('submit', (e) => this.handleResetPassword(e));

    this.els.toggleNewPassword?.addEventListener('click', (e) => {
      e.preventDefault();
      this.togglePasswordVisibility(this.els.newPassword, e.currentTarget);
    });

    this.els.toggleConfirmPassword?.addEventListener('click', (e) => {
      e.preventDefault();
      this.togglePasswordVisibility(this.els.confirmNewPassword, e.currentTarget);
    });

    // AVATAR INPUTS
    this.els.avatarInput?.addEventListener('change', (e) => {
      if (e.target.files[0]) this.openCropper(e.target.files[0]);
    });

    this.els.changeAvatarInput?.addEventListener('change', (e) => {
      if (e.target.files[0]) this.openCropper(e.target.files[0]);
    });

    // CROP MODAL
    this.els.cancelCrop?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.closeCropper();
    });

    this.els.saveCrop?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.saveCrop();
    });

    // ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
        this.closeAccountPanel();
        this.closeOtpModal();
        this.closeResetModal();
        this.hideModal(this.els.logoutModal);
      }
    });

    // ACCOUNT PANEL ACTIONS
    document.addEventListener('click', e => {
      if (e.target.closest('#controlCenterBtn')) {
        window.location.href = 'control-center.html';
        return;
      }
      if (e.target.closest('[data-action="playlists"]')) {
        window.location.href = 'playlists.html';
        return;
      }
      if (e.target.closest('[data-action="liked"]')) {
        window.location.href = 'playlists.html?tab=liked_playlist';
        return;
      }
      if (e.target.closest('[data-action="downloads"]')) {
        window.location.href = 'playlists.html?tab=downloads_playlist';
        return;
      }
      if (e.target.closest('#logoutAction')) {
        this.logout();
        return;
      }
    });
  }

  closeMobileNav() {
    document.getElementById('mobileNav')?.classList.remove('active');
    document.getElementById('accountPanel')?.classList.remove('active');
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
    if (!this.els.authModal ||!this.els.authTitle) return;
 
    this.els.authTitle.textContent = this.isSignup? 'Create Account' : 'Welcome Back';
    this.els.authSubtitle.textContent = this.isSignup? 'Join the arsenal today' : 'Login to access your arsenal';
 
    if (this.isSignup && this.els.avatarPreview) {
      const img = this.els.avatarPreview.querySelector('img');
      if (img) img.src = this.avatarData || DEFAULT_AVATAR;
    }

    // EMAIL - always show
    if (this.els.authEmail) {
      const emailGroup = this.els.authEmail.closest('.auth-input-group');
      if (emailGroup) emailGroup.style.display = 'block';
      this.els.authEmail.required = true;
    }
 
    if (this.els.authPassword) {
      this.els.authPassword.autocomplete = this.isSignup? 'new-password' : 'current-password';
    }
 
    // USERNAME - only on signup
    if (this.els.usernameGroup) {
      this.els.usernameGroup.style.display = this.isSignup? 'block' : 'none';
      if (this.els.authUsername) this.els.authUsername.required = this.isSignup;
    }
 
    // AVATAR - only on signup
    if (this.els.signupAvatarWrap) {
      this.els.signupAvatarWrap.style.display = this.isSignup? 'flex' : 'none';
    }

    // 🔥 FORGOT PASSWORD - LOGIN ONLY
    if (this.els.forgotPasswordBtn) {
      this.els.forgotPasswordBtn.style.display = this.isSignup? 'none' : 'block';
    }
 
    if (this.els.switchAuthText) {
      this.els.switchAuthText.textContent = this.isSignup? 'Already have an account?' : "Don't have an account?";
    }
    if (this.els.switchAuthBtn) {
      this.els.switchAuthBtn.textContent = this.isSignup? 'Login' : 'Sign Up';
    }
    this.els.authBox?.setAttribute('data-mode', this.isSignup? 'signup' : 'login');
  }

  async handleSubmit(e) {
    e.preventDefault();
    const username = this.els.authUsername?.value.trim() || '';
    const email = this.els.authEmail?.value.trim() || '';
    const password = this.els.authPassword?.value.trim() || '';

    if (!email.toLowerCase().endsWith('@gmail.com')) {
      return this.showError('Only Gmail addresses allowed');
    }
    if (this.isSignup &&!/^[A-Za-z]{2,20}$/.test(username)) {
      return this.showError('Username: letters only, 2-20 characters');
    }

    if (this.els.authSubmit) {
      this.els.authSubmit.disabled = true;
      this.els.authSubmit.textContent = 'Please wait...';
    }

    try {
      if (this.isSignup) {
        const res = await fetch(`${API_URL}/api/auth/send-signup-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, confirmPassword: password, username })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        this.pendingUsername = username;
        this.pendingPassword = password;

        this.closeModal();
        this.openOtpModal(email);

      } else {
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        if (data.requiresOTP) {
          this.closeModal();
          this.openOtpModal(email);
        } else {
          this.user = data.user;
          localStorage.setItem('dopetone_user', JSON.stringify(this.user));
          localStorage.setItem('dopetone_user_id', this.user.id);
          this.syncUI();
          this.showToast(`Welcome ${this.user.username}`);
          this.closeModal();
        }
      }

    } catch (err) {
      if (err.message.includes('it seems you already have an account')) {
        this.showError('it seems you already have an account login instead');
        this.isSignup = false;
        this.updateModalUI();
      } else {
        this.showError(err.message);
      }
    } finally {
      if (this.els.authSubmit) {
        this.els.authSubmit.disabled = false;
        this.els.authSubmit.textContent = 'Continue';
      }
    }
  }

  // ==================== OTP LOGIC ====================

  setupOtpInputs() {
    const inputs = document.querySelectorAll('.otp-digit');

    inputs.forEach((input, idx) => {
      input.addEventListener('input', (e) => {
        const val = e.target.value;
        if (!/^[0-9]$/.test(val)) {
          e.target.value = '';
          return;
        }

        e.target.classList.add('filled');

        if (val && idx < 5) {
          inputs[idx + 1].focus();
        }

        this.checkOtpComplete();
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' &&!e.target.value && idx > 0) {
          inputs[idx - 1].focus();
          inputs[idx - 1].value = '';
          inputs[idx - 1].classList.remove('filled');
          this.checkOtpComplete();
        }
      });

      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const paste = e.clipboardData.getData('text').slice(0, 6);
        if (!/^\d+$/.test(paste)) return;

        paste.split('').forEach((digit, i) => {
          if (inputs[i]) {
            inputs[i].value = digit;
            inputs[i].classList.add('filled');
          }
        });

        this.checkOtpComplete();
        inputs[Math.min(paste.length - 1, 5)].focus();
      });
    });
  }

  checkOtpComplete() {
    const inputs = document.querySelectorAll('.otp-digit');
    const code = Array.from(inputs).map(i => i.value).join('');
    this.els.otpVerifyBtn.disabled = code.length!== 6;
    return code.length === 6? code : null;
  }

  openOtpModal(email) {
    this.otpEmail = email;
    this.els.otpEmail.textContent = email;
    this.els.otpError.style.display = 'none';

    document.querySelectorAll('.otp-digit').forEach(i => {
      i.value = '';
      i.classList.remove('filled', 'error');
    });

    this.showModal(this.els.otpModal);
    setTimeout(() => document.querySelector('.otp-digit').focus(), 100);
    this.startOtpTimer();
  }

  closeOtpModal() {
    this.hideModal(this.els.otpModal);
    clearInterval(this.otpTimer);
    this.isResetFlow = false;
  }

  startOtpTimer() {
    this.otpSeconds = 300;
    this.els.otpResendBtn.disabled = true;

    clearInterval(this.otpTimer);
    this.otpTimer = setInterval(() => {
      this.otpSeconds--;
      const mins = Math.floor(this.otpSeconds / 60);
      const secs = this.otpSeconds % 60;
      this.els.otpCountdown.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

      if (this.otpSeconds <= 0) {
        clearInterval(this.otpTimer);
        this.els.otpResendBtn.disabled = false;
        this.els.otpCountdown.textContent = 'Expired';
      }
    }, 1000);
  }

  async verifyOtp() {
    const code = this.checkOtpComplete();
    if (!code) return;

    this.els.otpVerifyBtn.disabled = true;
    this.els.otpVerifyBtn.textContent = 'Verifying...';
    this.els.otpError.style.display = 'none';

    try {
      // RESET PASSWORD FLOW
      if (this.isResetFlow) {
        const res = await fetch(`${API_URL}/api/auth/verify-reset-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: this.otpEmail, code })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        this.closeOtpModal();
        this.openResetModal(this.otpEmail);
        return;
      }

      // NORMAL SIGNUP/LOGIN FLOW
      const endpoint = this.isSignup? '/api/auth/verify-signup' : '/api/auth/verify-login-otp';
      const body = this.isSignup
       ? { email: this.otpEmail, code, username: this.pendingUsername, password: this.pendingPassword, avatar: this.avatarData }
        : { email: this.otpEmail, code };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      this.user = data.user;
      localStorage.setItem('dopetone_user', JSON.stringify(this.user));
      localStorage.setItem('dopetone_user_id', this.user.id);
      this.syncUI();
      this.showToast(`Welcome ${this.user.username}`);
      this.closeOtpModal();
      this.closeModal();

    } catch (err) {
      this.els.otpError.textContent = err.message;
      this.els.otpError.style.display = 'block';
      document.querySelectorAll('.otp-digit').forEach(i => {
        i.classList.add('error');
        i.value = '';
        i.classList.remove('filled');
      });
      setTimeout(() => {
        document.querySelectorAll('.otp-digit').forEach(i => i.classList.remove('error'));
        document.querySelector('.otp-digit').focus();
      }, 400);
    } finally {
      this.els.otpVerifyBtn.disabled = false;
      this.els.otpVerifyBtn.textContent = 'Verify Code';
    }
  }

  async resendOtp() {
    this.els.otpResendBtn.disabled = true;
    this.els.otpResendBtn.textContent = 'Sending...';

    try {
      let endpoint, body;

      if (this.isResetFlow) {
        endpoint = '/api/auth/forgot-password';
        body = { email: this.otpEmail };
      } else {
        endpoint = this.isSignup? '/api/auth/send-signup-code' : '/api/auth/send-login-otp';
        body = this.isSignup
        ? { email: this.otpEmail, password: this.pendingPassword, confirmPassword: this.pendingPassword, username: this.pendingUsername }
          : { email: this.otpEmail };
      }

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error('Failed to resend');

      this.showToast('Code resent');
      this.startOtpTimer();

      document.querySelectorAll('.otp-digit').forEach(i => {
        i.value = '';
        i.classList.remove('filled');
      });
      document.querySelector('.otp-digit').focus();

    } catch (err) {
      this.els.otpError.textContent = 'Failed to resend code';
      this.els.otpError.style.display = 'block';
    } finally {
      this.els.otpResendBtn.textContent = 'Resend code';
    }
  }

  // ==================== RESET PASSWORD LOGIC ====================

  openResetModal(email) {
    this.els.resetEmail.textContent = email;
    this.els.resetError.style.display = 'none';
    this.els.newPassword.value = '';
    this.els.confirmNewPassword.value = '';
    this.showModal(this.els.resetPasswordModal);
    setTimeout(() => this.els.newPassword.focus(), 100);
  }

  closeResetModal() {
    this.hideModal(this.els.resetPasswordModal);
    this.isResetFlow = false;
  }

  async handleResetPassword(e) {
    e.preventDefault();

    const newPass = this.els.newPassword.value.trim();
    const confirmPass = this.els.confirmNewPassword.value.trim();

    if (newPass.length < 6) {
      this.showResetError('Password must be at least 6 characters');
      return;
    }

    if (newPass!== confirmPass) {
      this.showResetError('Passwords do not match');
      return;
    }

    this.els.resetSubmitBtn.disabled = true;
    this.els.resetSubmitBtn.textContent = 'Resetting...';

    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.otpEmail,
          password: newPass
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Auto-login after reset
      this.user = data.user;
      localStorage.setItem('dopetone_user', JSON.stringify(this.user));
      localStorage.setItem('dopetone_user_id', this.user.id);

      this.syncUI();
      this.showToast('Password reset successful!');
      this.closeResetModal();
      this.isResetFlow = false;

    } catch (err) {
      this.showResetError(err.message || 'Failed to reset password');
    } finally {
      this.els.resetSubmitBtn.disabled = false;
      this.els.resetSubmitBtn.textContent = 'Reset Password';
    }
  }

  showResetError(msg) {
    this.els.resetError.textContent = msg;
    this.els.resetError.style.display = 'block';
  }

  togglePasswordVisibility(input, btn) {
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    } else {
      input.type = 'password';
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
  }

  // ==================== LOGOUT LOGIC ====================

  logout() {
    this.showModal(this.els.logoutModal);
  }

  async confirmLogout() {
    this.hideModal(this.els.logoutModal);

    await this.saveUserDataToCloud();

    localStorage.removeItem('dopetone_user');
    localStorage.removeItem('dopetone_user_id');

    this.user = null;
    this.avatarData = DEFAULT_AVATAR;

    this.closeAccountPanel();
    this.syncUI();
    this.showToast('Logged out');

    window.dispatchEvent(new CustomEvent('auth:logout'));
    sessionStorage.setItem('just_logged_out', '1');

    setTimeout(() => {
      window.location.href = window.location.pathname;
    }, 800);
  }

  // ==================== REST OF METHODS ====================

  async handleForgotPassword() {
    const email = this.els.authEmail?.value.trim();

    if (!email) {
      this.showError('Enter your email first');
      this.els.authEmail?.focus();
      return;
    }

    if (!this.isValidEmail(email)) {
      this.showError('Enter a valid email');
      return;
    }

    if (!email.toLowerCase().endsWith('@gmail.com')) {
      this.showError('Only Gmail addresses allowed');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      this.isResetFlow = true;
      this.closeModal();
      this.openOtpModal(email);
      this.showToast('Reset code sent to your email');

    } catch (err) {
      this.showError(err.message || 'Failed to send reset code');
    }
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  openCropper(file) {
    const reader = new FileReader();
    reader.onload = () => {
      if (!this.els.cropImage ||!this.els.cropModal) return;

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
      this.showToast('Uploading photo...');

      const fd = new FormData();
      fd.append('file', blob, 'avatar.png');
      fd.append('folder', 'avatars');

      try {
        const res = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          body: fd
        });
        const data = await res.json();

        if (data.success && data.url) {
          this.avatarData = data.url;
          console.log('✅ Avatar uploaded to R2:', data.url);
        } else {
          throw new Error('Upload failed');
        }
      } catch (err) {
        this.avatarData = canvas.toDataURL('image/png');
        console.log('⚠️ Using base64 fallback');
      }

      if (this.els.avatarPreview) {
        this.els.avatarPreview.innerHTML = `<img src="${this.avatarData}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
      }

      if (this.user) {
        this.user.avatar = this.avatarData;
        localStorage.setItem('dopetone_user', JSON.stringify(this.user));

        await fetch(`${API_URL}/api/auth/update-avatar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: this.user.email, avatar: this.avatarData })
        }).catch(() => {});

        await this.saveUserDataToCloud();
        this.showToast('Photo updated');
      } else {
        this.showToast('Photo ready');
      }

      this.closeCropper();
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
    const panel = document.getElementById('accountPanel');
    if (!panel) {
      console.error('❌ accountPanel NOT FOUND IN DOM');
      return;
    }
   
    panel.classList.toggle('active');
    panel.setAttribute('aria-hidden', panel.classList.contains('active')? 'false' : 'true');

       if (panel.classList.contains('active') && this.user) {
      const avatar = this.user.avatar || DEFAULT_AVATAR;
      const name = this.user.username || this.user.email.split('@')[0];
     
      const panelAvatar = document.getElementById('panelAvatar');
      const panelName = document.getElementById('panelName');
      const panelEmail = document.getElementById('panelEmail');
     
      if (panelAvatar) panelAvatar.src = avatar;
      if (panelName) panelName.textContent = name;
      if (panelEmail) panelEmail.textContent = this.user.email;
    }
  }

  closeAccountPanel() {
    const panel = document.getElementById('accountPanel');
    if (!panel) return;
    panel.classList.remove('active');
    panel.setAttribute('aria-hidden', 'true');
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
    const isAdmin = this.user?.email === ADMIN_EMAIL;

    const controlCenterBtn = document.getElementById('controlCenterBtn');
    const mobileProfileName = document.getElementById('mobileProfileName');
    const mobileProfileSub = document.getElementById('mobileProfileSub');
    const mobileProfileAvatar = document.getElementById('mobileProfileAvatar');
    const authGuest = document.getElementById('authGuest');
    const authUser = document.getElementById('authUser');
    const userAvatar = document.getElementById('userAvatar');
    const panelName = document.getElementById('panelName');
    const panelEmail = document.getElementById('panelEmail');
    const panelAvatar = document.getElementById('panelAvatar');

    if (isLoggedIn) {
      document.body.classList.add('logged-in');
      if (isAdmin) document.body.classList.add('is-admin');
     
      const avatar = this.user.avatar || DEFAULT_AVATAR;
      const name = this.user.username || this.user.email.split('@')[0];

      if (authGuest) authGuest.style.display = 'none';
      if (authUser) authUser.style.display = 'flex';

      const avatars = [userAvatar, panelAvatar, mobileProfileAvatar].filter(Boolean);

      avatars.forEach(img => {
        img.src = avatar;
        img.onerror = () => img.src = DEFAULT_AVATAR;
      });

      if (panelName) panelName.textContent = name;
      if (panelEmail) panelEmail.textContent = this.user.email;
      if (mobileProfileName) mobileProfileName.textContent = name;
      if (mobileProfileSub) mobileProfileSub.textContent = this.user.email;

      if (controlCenterBtn) {
        controlCenterBtn.style.display = isAdmin? 'flex' : 'none';
      }

    } else {
      document.body.classList.remove('logged-in', 'is-admin');
     
      if (authGuest) authGuest.style.display = 'flex';
      if (authUser) authUser.style.display = 'none';
     
      if (mobileProfileName) mobileProfileName.textContent = 'Guest';
      if (mobileProfileSub) mobileProfileSub.textContent = 'Tap to sign in';
      if (mobileProfileAvatar) mobileProfileAvatar.src = DEFAULT_AVATAR;
      if (controlCenterBtn) controlCenterBtn.style.display = 'none';
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
} // END OF AuthManager CLASS

// HELPER FUNCTION
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
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

// 🔥 Expose for app.js to get real userId
window.getCurrentUserId = () => window.Auth?.user?.id || 'anonymous';
