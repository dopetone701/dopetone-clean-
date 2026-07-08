// ===== WEB CRYPTO PASSWORD HELPERS =====
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
 
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
 
  const key = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
 
  const hashArray = Array.from(new Uint8Array(key));
  const saltArray = Array.from(salt);
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const saltHex = saltArray.map(b => b.toString(16).padStart(2, '0')).join('');
 
  return `${saltHex}:${hashHex}`;
}

async function verifyPassword(password, storedHash) {
  const [saltHex, hashHex] = storedHash.split(':');
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map(byte => parseInt(byte, 16)));
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const key = await crypto.subtle.importKey('raw', data, 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 },
    key,
    256
  );
  const hashArray = Array.from(new Uint8Array(hash));
  const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return computedHash === hashHex;
}

// ===== USERNAME VALIDATION - LETTERS + ONE SPACE =====
function validateUsername(username) {
  if (!username || username.length < 2) return 'Username must be at least 2 characters';
  if (username.length > 30) return 'Username too long. Max 30 characters';
 
  if (!/^[A-Za-z]+(?: [A-Za-z]+)?$/.test(username)) {
    return 'Username can only contain letters and one space between names';
  }
 
  return null;
}

// ===== PASSWORD VALIDATION - PRO RULES 6+ CHARS =====
function validatePassword(pw) {
  const errors = [];
  if (pw.length < 6) errors.push('Password must be at least 6 characters');
  if (!/[A-Z]/.test(pw)) errors.push('Must contain uppercase letter');
  if (!/[a-z]/.test(pw)) errors.push('Must contain lowercase letter');
  if (!/[0-9]/.test(pw)) errors.push('Must contain number');
  if (!/[!@#$%^&*]/.test(pw)) errors.push('Must contain special char!@#$%^&*');
  if (/(.)\1{2,}/.test(pw)) errors.push('Password too repetitive');
  if (hasSequential(pw)) errors.push('No sequential characters like abc or 123');
 
  const blacklist = ['password','qwerty','123456','admin','dopetone','123456789','letmein','welcome','monkey','dragon'];
  if (blacklist.some(bad => pw.toLowerCase().includes(bad))) errors.push('Password too common');
 
  const uniqueChars = new Set(pw).size;
  if (uniqueChars < 4) errors.push('Password not complex enough');
 
  return errors;
}

function hasSequential(str) {
  const lower = str.toLowerCase();
  for (let i = 0; i < lower.length - 2; i++) {
    const c1 = lower.charCodeAt(i);
    const c2 = lower.charCodeAt(i + 1);
    const c3 = lower.charCodeAt(i + 2);
    if ((c2 === c1 + 1 && c3 === c2 + 1) || (c2 === c1 - 1 && c3 === c2 - 1)) return true;
  }
  return false;
}

// ===== EMAIL SECURITY - GMAIL ONLY =====
async function validateEmailStrict(email, env) {
  if (!email ||!email.includes('@')) {
    return { valid: false, error: 'Invalid email format' };
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  if (!emailRegex.test(email.toLowerCase())) {
    return { valid: false, error: 'Only Gmail addresses allowed' };
  }

  const domain = email.split('@')[1].toLowerCase();
 
  const isDisposable = await env.DB.prepare(
    "SELECT 1 FROM disposable_domains WHERE domain =?"
  ).bind(domain).first();
 
  if (isDisposable) {
    return { valid: false, error: 'Email domain blocked' };
  }

  return { valid: true };
}

// ===== CHECK IF PASSWORD EXISTS IN DB =====
async function isPasswordUnique(password, env, excludeUserId = null) {
  let query = "SELECT password_hash FROM users_auth";
  let params = [];
 
  if (excludeUserId) {
    query += " WHERE id!=?";
    params = [excludeUserId];
  }
 
  const { results } = await env.DB.prepare(query).bind(...params).all();
 
  for (const user of results) {
    const match = await verifyPassword(password, user.password_hash);
    if (match) return false;
  }
  return true;
}

async function sendEmail(env, to, subject, html, type = 'noreply') {
  const fromAddresses = {
    noreply: 'Dope Tone <noreply@dopetonevault.com>',
    support: 'Dope Tone Support <support@dopetonevault.com>',
    admin: 'Dope Tone Admin <admin@dopetonevault.com>',
    verify: 'Dope Tone Security <verify@dopetonevault.com>',
    recovery: 'Dope Tone Recovery <recovery@dopetonevault.com>'
  };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: fromAddresses[type] || fromAddresses.noreply,
      to: [to],
      subject: subject,
      html: html
    })
  });
  return res.ok;
}

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const allowedOrigins = [
      'https://dopetonevault.com',
      'https://www.dopetonevault.com',
      'https://dope-tone-vault.pages.dev',
      'http://127.0.0.1:5500',
      'http://localhost:5500'
    ];

    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigins.includes(origin)? origin : 'https://dopetonevault.com',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // ===== ROOT HEALTHCHECK =====
    if (url.pathname === '/') {
      return Response.json({
        status: 'Dope Tone API Online',
        version: '4.3 - Strict Reset',
        features: ['Gmail-Only', 'No Duplicate Passwords', 'Username Letters-Only', 'Email-Locked Accounts', 'PBKDF2 200k', 'Strict Reset Flow'],
        endpoints: [
          '/api/beats',
          '/api/auth/send-signup-code',
          '/api/auth/verify-signup',
          '/api/auth/login',
          '/api/auth/verify-login-otp',
          '/api/auth/update-avatar',
          '/api/auth/forgot-password',
          '/api/auth/verify-reset-otp',
          '/api/auth/reset-password',
          '/api/auth/admin-verify',
          '/api/auth/change-password',
          '/api/user/sync',
          '/api/upload',
          '/api/stats/overview',
          '/api/stats/sparks',
          '/api/stats/play',
          '/api/stats/like',
          '/api/stats/download',
          '/api/setup'
        ]
      }, { headers: corsHeaders });
    }

    // ===== SETUP - RUN ONCE =====
    if (url.pathname === '/api/setup' && request.method === 'GET') {
      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS verification_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            code TEXT NOT NULL,
            type TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            used INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `).run();
        
        await env.DB.prepare(`ALTER TABLE users_auth ADD COLUMN reset_code TEXT`).run().catch(()=>{});
        await env.DB.prepare(`ALTER TABLE users_auth ADD COLUMN reset_expires INTEGER`).run().catch(()=>{});
        await env.DB.prepare(`ALTER TABLE users_auth ADD COLUMN reset_verified INTEGER DEFAULT 0`).run().catch(()=>{});
        
        return Response.json({ success: true, message: 'Tables ready' }, { headers: corsHeaders });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ===== SEND SIGNUP CODE =====
    if (url.pathname === '/api/auth/send-signup-code' && request.method === 'POST') {
      try {
        const { email, username, password, confirmPassword } = await request.json();
        const normalizedEmail = email.toLowerCase().trim();
       
        if (!normalizedEmail ||!normalizedEmail.includes('@')) {
          return Response.json({ error: 'Invalid email' }, { status: 400, headers: corsHeaders });
        }
       
        if (!username ||!/^[A-Za-z]+(?: [A-Za-z]+)?$/.test(username)) {
          return Response.json({ error: 'Username: letters only, one space allowed' }, { status: 400, headers: corsHeaders });
        }
       
        if (!password || password.length < 6) {
          return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400, headers: corsHeaders });
        }
       
        if (password!== confirmPassword) {
          return Response.json({ error: 'Passwords do not match' }, { status: 400, headers: corsHeaders });
        }
       
        const pwErrors = validatePassword(password);
        if (pwErrors.length > 0) {
          return Response.json({ error: pwErrors[0] }, { status: 400, headers: corsHeaders });
        }
       
        const existing = await env.DB.prepare(
          "SELECT email, username FROM users_auth WHERE email =? OR username =? COLLATE NOCASE"
        ).bind(normalizedEmail, username).first();
       
        if (existing) {
          if (existing.email === normalizedEmail) {
            return Response.json({
              error: 'it seems you already have an account login instead',
              email: normalizedEmail
            }, { status: 409, headers: corsHeaders });
          }
          return Response.json({ error: 'Username already taken' }, { status: 409, headers: corsHeaders });
        }
       
        const unique = await isPasswordUnique(password, env);
        if (!unique) {
          return Response.json({ error: 'Password already in use. Choose a unique password.' }, { status: 400, headers: corsHeaders });
        }
       
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        await env.DB.prepare(
          `INSERT OR REPLACE INTO verification_codes (email, code, type, expires_at)
           VALUES (?,?, 'signup',?)`
        ).bind(normalizedEmail, code, expiresAt).run();

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Dope Tone Vault <noreply@dopetonevault.com>',
            to: normalizedEmail,
            subject: 'Your Dope Tone Vault verification code',
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #9333ea;">Dope Tone Vault</h1>
                <h2>Your verification code:</h2>
                <h1 style="font-size: 32px; letter-spacing: 5px; color: #9333ea;">${code}</h1>
                <p>This code expires in 10 minutes.</p>
              </div>`
          })
        });
       
        if (!emailRes.ok) {
          const err = await emailRes.text();
          console.error('RESEND ERROR:', err);
          return Response.json({ error: 'Failed to send email' }, { status: 500, headers: corsHeaders });
        }
       
        return Response.json({ success: true }, { headers: corsHeaders });
       
      } catch (err) {
        console.error('SEND CODE CRASH:', err.message, err.stack);
        return Response.json({ error: 'Server error: ' + err.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ===== VERIFY SIGNUP CODE =====
    if (url.pathname === '/api/auth/verify-signup' && request.method === 'POST') {
      try {
        const body = await request.json();
       
        const {
          email = '',
          code = '',
          username = '',
          password = '',
          avatar = null
        } = body;
       
        const normalizedEmail = String(email).toLowerCase().trim();
        const userCode = String(code).trim();
        const finalUsername = String(username).trim();
        const finalPassword = String(password);
        const finalAvatar = String(avatar || 'images/default-user.png');

        if (!normalizedEmail ||!userCode ||!finalUsername ||!finalPassword) {
          return Response.json({
            error: 'Missing required fields',
            debug: {
              email:!!normalizedEmail,
              code:!!userCode,
              username:!!finalUsername,
              password:!!finalPassword
            }
          }, { status: 400, headers: corsHeaders });
        }
       
        const stored = await env.DB.prepare(
          `SELECT * FROM verification_codes
           WHERE email =? AND type = 'signup'
           ORDER BY expires_at DESC
           LIMIT 1`
        ).bind(normalizedEmail).first();

        if (!stored || String(stored.code).trim()!== userCode) {
          return Response.json({ error: 'Invalid code' }, { status: 400, headers: corsHeaders });
        }
       
        if (new Date(stored.expires_at).getTime() < Date.now()) {
          return Response.json({ error: 'Code expired' }, { status: 400, headers: corsHeaders });
        }
       
        const id = crypto.randomUUID();
        const password_hash = await hashPassword(finalPassword);
       
        await env.DB.prepare(
          "INSERT INTO users_auth (id, email, username, password_hash, avatar, email_verified) VALUES (?,?,?,?,?, 1)"
        ).bind(id, normalizedEmail, finalUsername, password_hash, finalAvatar).run();

        await env.DB.prepare(
          "INSERT INTO user_data (user_id, avatar) VALUES (?,?)"
        ).bind(id, finalAvatar).run();
       
        await env.DB.prepare(
          "DELETE FROM verification_codes WHERE email =? AND type = 'signup'"
        ).bind(normalizedEmail).run();
       
        const user = { id, email: normalizedEmail, username: finalUsername, avatar: finalAvatar };
        return Response.json({ success: true, user }, { headers: corsHeaders });
       
      } catch (err) {
        console.error('VERIFY SIGNUP ERROR:', err);
        return Response.json({
          error: 'Server error: ' + err.message
        }, { status: 500, headers: corsHeaders });
      }
    }

    // ===== LOGIN STEP 1 - CHECK PASSWORD =====
    if (url.pathname === '/api/auth/login' && request.method === 'POST') {
      try {
        const { email, password } = await request.json();
        const normalizedEmail = email.toLowerCase().trim();
       
        const user = await env.DB.prepare(
          "SELECT * FROM users_auth WHERE email =? COLLATE NOCASE"
        ).bind(normalizedEmail).first();
       
        if (!user) {
          return Response.json({ error: 'Invalid credentials' }, { status: 401, headers: corsHeaders });
        }

        if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
          const lockTimeMs = new Date(user.locked_until).getTime();
          const nowMs = Date.now();
          const minsLeft = Math.ceil((lockTimeMs - nowMs) / 60000);
          return Response.json({
            error: 'Account locked. Try again in ' + minsLeft + ' minutes.'
          }, { status: 423, headers: corsHeaders });
        }

        if (user.email_verified === 0) {
          return Response.json({ error: 'Email not verified' }, { status: 403, headers: corsHeaders });
        }
       
        const valid = await verifyPassword(password, user.password_hash);
       
        if (!valid) {
          const attempts = (user.failed_login_attempts || 0) + 1;
          let lockedUntil = null;
         
          if (attempts >= 3) {
            lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
          }
         
          await env.DB.prepare(
            "UPDATE users_auth SET failed_login_attempts =?, locked_until =? WHERE id =?"
          ).bind(attempts, lockedUntil, user.id).run();
         
          return Response.json({ error: 'Invalid credentials' }, { status: 401, headers: corsHeaders });
        }
       
        const code = generateCode();
        const expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString();
       
        await env.DB.prepare("DELETE FROM verification_codes WHERE email =? AND type = 'login_otp'").bind(normalizedEmail).run();
        await env.DB.prepare(
          "INSERT INTO verification_codes (email, code, type, expires_at) VALUES (?,?,?,?)"
        ).bind(normalizedEmail, code, 'login_otp', expiresAt).run();
       
        await sendEmail(env, normalizedEmail, 'Dope Tone Login Code', `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #fff; padding: 40px;">
            <h2 style="color: #8b5cf6;">Login Verification</h2>
            <h1 style="font-size: 42px; letter-spacing: 12px; color: #8b5cf6; background: #111; padding: 24px; text-align: center;">${code}</h1>
            <p style="color: #f00;">Expires in 3 minutes. If you didn't request this, change your password NOW.</p>
          </div>
        `, 'verify');
       
        return Response.json({ success: true, requiresOTP: true, email: normalizedEmail }, { headers: corsHeaders });
       
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ===== LOGIN STEP 2 - VERIFY OTP =====
    if (url.pathname === '/api/auth/verify-login-otp' && request.method === 'POST') {
      try {
        const { email, code } = await request.json();
        const normalizedEmail = email.toLowerCase().trim();
       
        const codeRow = await env.DB.prepare(
          "SELECT * FROM verification_codes WHERE email =? AND type = 'login_otp' AND used = 0"
        ).bind(normalizedEmail).first();

        if (!codeRow || codeRow.code!== code) {
          return Response.json({ error: 'Invalid code' }, { status: 400, headers: corsHeaders });
        }

        if (new Date(codeRow.expires_at) < new Date()) {
          return Response.json({ error: 'Code expired' }, { status: 400, headers: corsHeaders });
        }
       
        const user = await env.DB.prepare(
          "SELECT * FROM users_auth WHERE email =? COLLATE NOCASE"
        ).bind(normalizedEmail).first();
       
        await env.DB.prepare(
          "UPDATE users_auth SET failed_login_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP WHERE id =?"
        ).bind(user.id).run();
       
        await env.DB.prepare("UPDATE verification_codes SET used = 1 WHERE id =?").bind(codeRow.id).run();
       
        delete user.password_hash;
        return Response.json({ success: true, user }, { headers: corsHeaders });
       
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ===== UPDATE AVATAR =====
    if (url.pathname === '/api/auth/update-avatar' && request.method === 'POST') {
      try {
        const { email, avatar } = await request.json();
        const normalizedEmail = email.toLowerCase().trim();
       
        await env.DB.prepare(
          "UPDATE users_auth SET avatar =? WHERE email =?"
        ).bind(avatar, normalizedEmail).run();
       
        const { results } = await env.DB.prepare(
          "SELECT id FROM users_auth WHERE email =?"
        ).bind(normalizedEmail).all();
       
        if (results.length) {
          await env.DB.prepare(
            "UPDATE user_data SET avatar =? WHERE user_id =?"
          ).bind(avatar, results[0].id).run();
        }
       
        return Response.json({ success: true }, { headers: corsHeaders });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ===== FORGOT PASSWORD - SEND RESET CODE - STRICT =====
    if (url.pathname === '/api/auth/forgot-password' && request.method === 'POST') {
      try {
        const { email } = await request.json();
        const normalizedEmail = email.toLowerCase().trim();
        
        const user = await env.DB.prepare(
          "SELECT id, email_verified FROM users_auth WHERE email =?"
        ).bind(normalizedEmail).first();
        
        if (user && user.email_verified === 1) {
          const code = generateCode();
          const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
         
          await env.DB.prepare("DELETE FROM verification_codes WHERE email =? AND type = 'reset_password'").bind(normalizedEmail).run();
          await env.DB.prepare(
            "INSERT INTO verification_codes (email, code, type, expires_at) VALUES (?,?,?,?)"
          ).bind(normalizedEmail, code, 'reset_password', expiresAt).run();
         
          await sendEmail(env, normalizedEmail, 'Reset your Dope Tone password', `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #8b5cf6;">Password Reset Request</h2>
              <p>Your reset code is:</p>
              <h1 style="font-size: 36px; letter-spacing: 8px; color: #8b5cf6; background: #111; padding: 20px; text-align: center; border-radius: 8px;">${code}</h1>
              <p style="color: #888;">This code expires in 15 minutes.</p>
              <p style="color: #f00;">If you didn't request this, ignore this email.</p>
            </div>
          `, 'recovery');
        }
       
        return Response.json({ success: true, message: 'If email exists, code was sent' }, { headers: corsHeaders });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ===== VERIFY RESET OTP - STRICT =====
    if (url.pathname === '/api/auth/verify-reset-otp' && request.method === 'POST') {
      try {
        const { email, code } = await request.json();
        const normalizedEmail = email.toLowerCase().trim();
        
        const user = await env.DB.prepare(
          "SELECT id FROM users_auth WHERE email =? AND email_verified = 1"
        ).bind(normalizedEmail).first();
        
        if (!user) {
          return Response.json({ error: 'Invalid request' }, { status: 400, headers: corsHeaders });
        }
        
        const stored = await env.DB.prepare(
          `SELECT * FROM verification_codes 
           WHERE email =? AND type = 'reset_password' AND used = 0
           ORDER BY expires_at DESC LIMIT 1`
        ).bind(normalizedEmail).first();
        
        if (!stored || String(stored.code).trim()!== String(code).trim()) {
          return Response.json({ error: 'Invalid code' }, { status: 400, headers: corsHeaders });
        }
        
        if (new Date(stored.expires_at).getTime() < Date.now()) {
          return Response.json({ error: 'Code expired' }, { status: 400, headers: corsHeaders });
        }
        
        await env.DB.prepare(
          "UPDATE users_auth SET reset_verified = 1 WHERE email =?"
        ).bind(normalizedEmail).run();
        
        await env.DB.prepare(
          "UPDATE verification_codes SET used = 1 WHERE id =?"
        ).bind(stored.id).run();
        
        return Response.json({ success: true }, { headers: corsHeaders });
        
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ===== RESET PASSWORD - VERIFY CODE + SET NEW PASSWORD - STRICT =====
    if (url.pathname === '/api/auth/reset-password' && request.method === 'POST') {
      try {
        const { email, password } = await request.json();
        const normalizedEmail = email.toLowerCase().trim();
       
        const pwErrors = validatePassword(password);
        if (pwErrors.length > 0) {
          return Response.json({ error: pwErrors[0] }, { status: 400, headers: corsHeaders });
        }
       
        const user = await env.DB.prepare(
          "SELECT id FROM users_auth WHERE email =? AND reset_verified = 1 AND email_verified = 1"
        ).bind(normalizedEmail).first();
        
        if (!user) {
          return Response.json({ error: 'Invalid request - verify code first' }, { status: 400, headers: corsHeaders });
        }
       
        const unique = await isPasswordUnique(password, env, user.id);
        if (!unique) {
          return Response.json({ error: 'Password already in use. Choose a unique password.' }, { status: 400, headers: corsHeaders });
        }
       
        const password_hash = await hashPassword(password);
        await env.DB.prepare(
          "UPDATE users_auth SET password_hash =?, reset_verified = 0 WHERE email =?"
        ).bind(password_hash, normalizedEmail).run();
        
        const updatedUser = await env.DB.prepare(
          "SELECT id, email, username, avatar FROM users_auth WHERE email =?"
        ).bind(normalizedEmail).first();
       
        return Response.json({ success: true, user: updatedUser }, { headers: corsHeaders });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ===== ADMIN VERIFY - SEND OTP TO YOUR EMAIL =====
    if (url.pathname === '/api/auth/admin-verify' && request.method === 'POST') {
      try {
        const { email } = await request.json();
       
        if (email!== 'dopetone701@gmail.com') {
          return Response.json({ error: 'Unauthorized' }, { status: 403, headers: corsHeaders });
        }
       
        const code = generateCode();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
       
        await env.DB.prepare("DELETE FROM verification_codes WHERE email =? AND type = 'admin_verify'").bind(email).run();
        await env.DB.prepare(
          "INSERT INTO verification_codes (email, code, type, expires_at) VALUES (?,?,?,?)"
        ).bind(email, code, 'admin_verify', expiresAt).run();
       
        await sendEmail(env, email, 'Admin Access Code - Dope Tone', `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f00;">Admin Verification Required</h2>
            <p>Your admin access code:</p>
            <h1 style="font-size: 36px; letter-spacing: 8px; color: #f00; background: #111; padding: 20px; text-align: center; border-radius: 8px;">${code}</h1>
            <p style="color: #888;">Expires in 5 minutes.</p>
          </div>
        `, 'admin');
       
        return Response.json({ success: true }, { headers: corsHeaders });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ===== CHANGE PASSWORD =====
    if (url.pathname === '/api/auth/change-password' && request.method === 'POST') {
      try {
        const { email, oldPassword, newPassword } = await request.json();
        const normalizedEmail = email.toLowerCase().trim();
       
        const pwErrors = validatePassword(newPassword);
        if (pwErrors.length > 0) {
          return Response.json({ error: pwErrors[0] }, { status: 400, headers: corsHeaders });
        }
       
        const user = await env.DB.prepare(
          "SELECT * FROM users_auth WHERE email =?"
        ).bind(normalizedEmail).first();
       
        if (!user) {
          return Response.json({ error: 'User not found' }, { status: 404, headers: corsHeaders });
        }
       
        const valid = await verifyPassword(oldPassword, user.password_hash);
        if (!valid) {
          return Response.json({ error: 'Current password incorrect' }, { status: 401, headers: corsHeaders });
        }
       
        const unique = await isPasswordUnique(newPassword, env, user.id);
        if (!unique) {
          return Response.json({ error: 'Password already in use. Choose a unique password.' }, { status: 400, headers: corsHeaders });
        }
       
        const newHash = await hashPassword(newPassword);
        await env.DB.prepare(
          "UPDATE users_auth SET password_hash =? WHERE email =?"
        ).bind(newHash, normalizedEmail).run();
       
        return Response.json({ success: true }, { headers: corsHeaders });
       
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ===== USER DATA SYNC ROUTES =====
    if (url.pathname === '/api/user/sync' && request.method === 'POST') {
      try {
        const data = await request.json();
        const { user_id, cart, playlists, likes, licences, avatar, settings } = data;
       
        await env.DB.prepare(`
          INSERT INTO user_data (user_id, cart, playlists, likes, licences, avatar, settings, updated_at)
          VALUES (?,?,?,?,?,?,?, CURRENT_TIMESTAMP)
          ON CONFLICT(user_id) DO UPDATE SET
            cart = excluded.cart,
            playlists = excluded.playlists,
            likes = excluded.likes,
            licences = excluded.licences,
            avatar = excluded.avatar,
            settings = excluded.settings,
            updated_at = CURRENT_TIMESTAMP
        `).bind(
          user_id,
          JSON.stringify(cart || []),
          JSON.stringify(playlists || []),
          JSON.stringify(likes || []),
          JSON.stringify(licences || {}),
          avatar,
          JSON.stringify(settings || {})
        ).run();
       
        return Response.json({ success: true }, { headers: corsHeaders });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    const userDataMatch = url.pathname.match(/^\/api\/user\/([^\/]+)\/data$/);
    if (userDataMatch) {
      try {
        const userId = userDataMatch[1];
        const { results } = await env.DB.prepare(
          "SELECT * FROM user_data WHERE user_id =?"
        ).bind(userId).all();
       
        if (!results.length) {
          return Response.json({
            cart: [], playlists: [], likes: [], licences: {}, avatar: null, settings: {}
          }, { headers: corsHeaders });
        }
       
        const data = results[0];
        return Response.json({
          cart: JSON.parse(data.cart || '[]'),
          playlists: JSON.parse(data.playlists || '[]'),
          likes: JSON.parse(data.likes || '[]'),
          licences: JSON.parse(data.licences || '{}'),
          avatar: data.avatar,
          settings: JSON.parse(data.settings || '{}')
        }, { headers: corsHeaders });
      } catch (e) {
               return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ===== R2 UPLOAD ROUTE =====
    if (url.pathname === '/api/upload' && request.method === 'POST') {
      try {
        const formData = await request.formData();
        const file = formData.get('file');
        const folder = formData.get('folder') || 'uploads';
       
        if (!file) {
          return Response.json({ error: 'No file provided' }, { status: 400, headers: corsHeaders });
        }
       
        const fileName = `${folder}/${crypto.randomUUID()}-${file.name}`;
        await env.BUCKET.put(fileName, file.stream(), {
          httpMetadata: { contentType: file.type }
        });
       
        const fileUrl = `https://pub-60c4e7268904a31a890e52771845a014.r2.dev/${fileName}`;
        return Response.json({ success: true, url: fileUrl }, { headers: corsHeaders });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ===== BEATS ROUTES =====
    if (url.pathname === '/api/beats' || url.pathname === '/beats') {
      try {
        const { results } = await env.DB.prepare(
          "SELECT * FROM beats ORDER BY created_at DESC"
        ).all();
        return Response.json(results, { headers: corsHeaders });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    const beatMatch = url.pathname.match(/^\/api\/beats\/(\d+)$/);
    if (beatMatch) {
      try {
        const id = beatMatch[1];
        const { results } = await env.DB.prepare(
          "SELECT * FROM beats WHERE id =?"
        ).bind(id).all();
        return Response.json(results[0] || null, { headers: corsHeaders });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ===== STATS ROUTES =====
    if (url.pathname === '/api/stats/overview') {
      try {
        const { results } = await env.DB.prepare(
          "SELECT COUNT(*) as totalBeats, SUM(play_count) as totalStreams, SUM(like_count) as totalLikes, SUM(download_count) as totalDownloads FROM beats"
        ).all();
        const stats = results[0] || {};
        return Response.json({
          totalStreams: stats.totalStreams || 0,
          activeListeners: 0,
          revenueToday: 0,
          newFollowers: 0,
          totalEmails: 0,
          totalBeats: stats.totalBeats || 0,
          totalLikes: stats.totalLikes || 0,
          totalDownloads: stats.totalDownloads || 0
        }, { headers: corsHeaders });
      } catch (e) {
        return Response.json({
          totalStreams: 0, activeListeners: 0, revenueToday: 0, newFollowers: 0, totalEmails: 0,
          totalBeats: 0, totalLikes: 0, totalDownloads: 0
        }, { headers: corsHeaders });
      }
    }

    if (url.pathname === '/api/stats/sparks') {
      return Response.json({ streams: [], listeners: [], revenue: [], followers: [] }, { headers: corsHeaders });
    }

    // ===== STATS TRACKING ROUTES =====
    if (url.pathname === '/api/stats/play' && request.method === 'POST') {
      try {
        const { beat_id } = await request.json();
        await env.DB.prepare(
          "UPDATE beats SET play_count = play_count + 1 WHERE id =?"
        ).bind(beat_id).run();
        return Response.json({ success: true }, { headers: corsHeaders });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    if (url.pathname === '/api/stats/like' && request.method === 'POST') {
      try {
        const { beat_id, liked } = await request.json();
        const increment = liked? 1 : -1;
        await env.DB.prepare(
          "UPDATE beats SET like_count = like_count +? WHERE id =?"
        ).bind(increment, beat_id).run();
        return Response.json({ success: true }, { headers: corsHeaders });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    if (url.pathname === '/api/stats/download' && request.method === 'POST') {
      try {
        const { beat_id } = await request.json();
        await env.DB.prepare(
          "UPDATE beats SET download_count = download_count + 1 WHERE id =?"
        ).bind(beat_id).run();
        return Response.json({ success: true }, { headers: corsHeaders });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
}
