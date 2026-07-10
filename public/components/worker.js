const CONTROL_CENTER_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>NOX Control Center</title>
  <style>
    body { font-family: monospace; background:#000; color:#0f0; padding:20px }
 .nox { border:1px solid #0f0; padding:20px; margin:20px 0 }
    button { background:#0f0; color:#000; padding:10px 20px; border:none; font-weight:bold; cursor:pointer }
    input,select,textarea { width:100%; background:#111; border:1px solid #0f0; color:#0f0; padding:10px; margin:5px 0 }
 .preview { max-width:200px; margin-top:10px; border:1px solid #0f0 }
 .recent-scroll { max-height:200px; overflow-y:auto; border:1px solid #0f0; padding:10px; background:#050505 }
    label { display:flex; align-items:center; gap:8px; margin:10px 0; cursor:pointer }
    input[type="checkbox"] { width:auto }
  </style>
</head>
<body>
  <h1>🔥 NOX CONTROL CENTER 🔥</h1>

  <div class="nox">
    <h3>POST TO NOTICE BOARD</h3>
    <select id="type">
      <option value="text">Text</option>
      <option value="link">Link</option>
      <option value="image">Image</option>
      <option value="video">Video</option>
    </select>
    <input id="title" placeholder="Title (optional)">
    <textarea id="content" placeholder="Text or paste link here" rows="3"></textarea>
    <input type="file" id="file" accept="image/*,video/*">
    <img id="preview" class="preview" style="display:none">

    <label>
      <input type="checkbox" id="autodelete">
      <span>Auto-delete after 24 hours</span>
    </label>

    <button onclick="noxPost()">EXECUTE POST</button>
    <div id="status"></div>
  </div>

  <div class="nox">
    <h3>Recent Posts (scrollable)</h3>
    <div id="recent" class="recent-scroll"></div>
  </div>

<script>
const fileInput = document.getElementById('file');
const preview = document.getElementById('preview');

fileInput.onchange = () => {
  const f = fileInput.files[0];
  if (f && f.type.startsWith('image/')) {
    preview.src = URL.createObjectURL(f);
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }
};

async function noxPost() {
  const type = document.getElementById('type').value;
  const title = document.getElementById('title').value;
  const content = document.getElementById('content').value;
  const file = fileInput.files[0];
  const autodelete = document.getElementById('autodelete').checked;

  if (!content &&!file) {
    alert('Enter text OR select media');
    return;
  }

  document.getElementById('status').innerText = 'TRANSMITTING...';

  const payload = {
    content: content,
    title: title,
    type: type,
    from: 'admin',
    expiresAt: autodelete? Date.now() + 86400000 : null
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      payload.media = {
        type: file.type.startsWith('image/')? 'image' : 'video',
        url: e.target.result
      };
      await sendPost(payload);
    };
    reader.readAsDataURL(file);
  } else {
    await sendPost(payload);
  }
}

async function sendPost(payload) {
  try {
    const res = await fetch('/api/notices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    document.getElementById('status').innerText = data.success? 'NOX_SUCCESS: POST LIVE' : 'ERROR';
    if (data.success) {
      document.getElementById('title').value = '';
      document.getElementById('content').value = '';
      fileInput.value = '';
      preview.style.display = 'none';
      document.getElementById('autodelete').checked = false;
      loadRecent();
    }
  } catch(e) {
    document.getElementById('status').innerText = 'NOX_ERROR: ' + e.message;
  }
}

async function loadRecent() {
  try {
    const res = await fetch('/api/notices');
    const notices = await res.json();
    const html = notices.map(n => {
      const txt = (n.content || 'No text').substring(0,60);
      const exp = n.expiresAt? ' ⏰24h' : ' ♾️';
      const time = new Date(n.timestamp).toLocaleString();
      return '<div style="color:#0f0;margin:8px 0;padding:5px;border-bottom:1px dotted #0f0">' + time + exp + '<br>' + txt + '</div>';
    }).join('');
    document.getElementById('recent').innerHTML = html || '<div style="color:#666">No posts</div>';
  } catch(e) {}
}
loadRecent();
setInterval(loadRecent, 10000);
</script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const allowedOrigins = [
      'https://dopetonevault.com',
      'https://www.dopetonevault.com'
    ];
   
    const origin = request.headers.get('Origin');
    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigins.includes(origin)? origin : allowedOrigins[0],
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;
   
    // ===== DT DROP ZONE — WITH 24H AUTO-DELETE =====
    // ===== NOTICES VIA D1 - UNLIMITED WRITES =====
if (path === '/api/notices' && request.method === 'POST') {
  try {
    const body = await request.json();
    const now = Date.now();
    
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS notices (
        id TEXT PRIMARY KEY,
        text TEXT,
        content TEXT,
        title TEXT,
        type TEXT,
        from_user TEXT,
        timestamp INTEGER,
        media TEXT,
        promotion TEXT,
        expiresAt INTEGER,
        userIP TEXT
      )
    `).run();
    
    const notice = {
      id: `notice_${now}`,
      text: body.content || body.text || '',
      content: body.content || body.text || '',
      title: body.title || '',
      type: body.type || 'text',
      from_user: body.from || 'admin',
      timestamp: now,
      media: JSON.stringify(body.media || null),
      promotion: JSON.stringify(body.promotion || null),
      expiresAt: body.expiresAt || null,
      userIP: request.headers.get('CF-Connecting-IP') || 'unknown'
    };
    
    await env.DB.prepare(`
      INSERT INTO notices (id, text, content, title, type, from_user, timestamp, media, promotion, expiresAt, userIP)
      VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)
    `).bind(...Object.values(notice)).run();
    
    return Response.json({ success: true, status: 'NOX_SUCCESS: POST LIVE', id: notice.id }, { headers: corsHeaders });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders });
  }
}

if (path === '/api/notices' && request.method === 'GET') {
  const now = Date.now();
  
  // Delete expired
  await env.DB.prepare(`DELETE FROM notices WHERE expiresAt IS NOT NULL AND expiresAt < ?1`).bind(now).run().catch(() => {});
  
  const { results } = await env.DB.prepare(`
    SELECT * FROM notices ORDER BY timestamp DESC LIMIT 100
  `).all().catch(() => ({ results: [] }));
  
  const notices = results.map(n => ({
   ...n,
    media: n.media? JSON.parse(n.media) : null,
    promotion: n.promotion? JSON.parse(n.promotion) : null
  }));
  
  return Response.json(notices, { headers: corsHeaders });
}

if (path.startsWith('/api/notices/') && request.method === 'DELETE') {
  const id = path.split('/')[3];
  await env.DB.prepare(`DELETE FROM notices WHERE id =?1`).bind(id).run();
  return Response.json({ success: true }, { headers: corsHeaders });
}


    // ===== SECURE DOWNLOAD PROXY - NO MORE * WILDCARD =====
    if (url.pathname.startsWith('/api/download/')) {
      const beatUrl = url.searchParams.get('url');
      const title = url.searchParams.get('title') || 'dopetone-beat';
      
      if (!beatUrl) {
        return new Response('Missing URL', { status: 400, headers: corsHeaders });
      }
      
      const response = await fetch(beatUrl);
      
      return new Response(response.body, {
        headers: {
        ...corsHeaders,
          'Content-Type': 'audio/mpeg',
          'Content-Disposition': `attachment; filename="${title.replace(/[^a-z0-9]/gi, '_')}.mp3"`,
          'Cache-Control': 'public, max-age=31536000',
        }
      });
    }

    // ===== AVATAR UPLOAD TO R2 =====
    if (path === '/api/upload/avatar' && request.method === 'POST') {
      try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
          return Response.json({ error: 'No file provided' }, { status: 400, headers: corsHeaders });
        }

        if (!env.BUCKET) {
          return Response.json({ error: 'R2_NOT_BOUND' }, { status: 500, headers: corsHeaders });
        }

        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        const extension = file.name.split('.').pop().toLowerCase() || 'png';
        const filename = `avatars/avatar_${timestamp}_${randomId}.${extension}`;

        await env.BUCKET.put(filename, file.stream(), {
          httpMetadata: {
            contentType: file.type || 'image/png',
            cacheControl: 'public, max-age=31536000',
          },
        });

        const R2_PUBLIC_URL = "https://cdn.dopetonevault.com";
        const url = `${R2_PUBLIC_URL}/${filename}`;

        return Response.json({
          success: true,
          url: url,
          filename: filename
        }, { headers: corsHeaders });

      } catch (error) {
        console.error('Avatar upload error:', error);
        return Response.json({ error: 'Upload failed: ' + error.message }, { status: 500, headers: corsHeaders });
      }
    }

    if (path === '/api/notices' && request.method === 'GET') {
      const list = await env.NOTICES_KV.list({ limit: 100 });
      const now = Date.now();
      const notices = [];
      for (const key of list.keys) {
        const value = await env.NOTICES_KV.get(key.name, 'json');
        if (!value) continue;
        if (value.expiresAt && value.expiresAt < now) {
          await env.NOTICES_KV.delete(key.name);
          continue;
        }
        notices.push(value);
      }
      const valid = notices.filter(n => n && n.timestamp).sort((a, b) => b.timestamp - a.timestamp);
      return Response.json(valid, { headers: corsHeaders });
    }

    // ===== USER DATA SYNC - D1 =====
    if (path === '/api/user/sync' && request.method === 'POST') {
      try {
        const data = await request.json();
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS user_data (
            user_id TEXT PRIMARY KEY,
            avatar TEXT,
            cart TEXT,
            playlists TEXT,
            likes TEXT,
            licences TEXT,
            settings TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `).run();

        await env.DB.prepare(`
          INSERT INTO user_data (user_id, avatar, cart, playlists, likes, licences, settings)
          VALUES (?1,?2,?3,?4,?5,?6,?7)
          ON CONFLICT(user_id) DO UPDATE SET
            avatar=excluded.avatar,
            cart=excluded.cart,
            playlists=excluded.playlists,
            likes=excluded.likes,
            licences=excluded.licences,
            settings=excluded.settings,
            updated_at=CURRENT_TIMESTAMP
        `).bind(
          data.user_id,
          data.avatar || '',
          JSON.stringify(data.cart || []),
          JSON.stringify(data.playlists || []),
          JSON.stringify(data.likes || []),
          JSON.stringify(data.licences || {}),
          JSON.stringify(data.settings || {})
        ).run();

        return Response.json({success:true}, {headers:corsHeaders});
      } catch (e) {
        return Response.json({error:e.message}, {status:500, headers:corsHeaders});
      }
    }

    if (path.startsWith('/api/user/') && path.endsWith('/data') && request.method === 'GET') {
      try {
        const userId = path.split('/')[3];
        const row = await env.DB.prepare('SELECT * FROM user_data WHERE user_id=?1').bind(userId).first();
        if (!row) return Response.json({}, {headers:corsHeaders});

        return Response.json({
          avatar: row.avatar,
          cart: JSON.parse(row.cart || '[]'),
          playlists: JSON.parse(row.playlists || '[]'),
          likes: JSON.parse(row.likes || '[]'),
          licences: JSON.parse(row.licences || '{}'),
          settings: JSON.parse(row.settings || '{}')
        }, {headers:corsHeaders});
      } catch (e) {
        return Response.json({}, {headers:corsHeaders});
      }
    }

    if (path.startsWith('/api/notices/') && request.method === 'DELETE') {
      const id = path.split('/')[3];
      await env.NOTICES_KV.delete(id);
      return Response.json({ success: true }, { headers: corsHeaders });
    }

    // ===== AUTH ENDPOINTS =====
    if ((path === '/api/auth/login' || path === '/api/auth/signup') && request.method === 'POST') {
      try {
        const { email, username, avatar } = await request.json();
        const userId = 'user_' + btoa(email).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
       
        await env.DB.prepare(`CREATE TABLE IF NOT EXISTS users_auth (id TEXT PRIMARY KEY, email TEXT UNIQUE, username TEXT, avatar TEXT)`).run();
       
        let user = await env.DB.prepare('SELECT * FROM users_auth WHERE email =?1').bind(email).first();
        if (!user) {
          await env.DB.prepare('INSERT INTO users_auth (id, email, username, avatar) VALUES (?1,?2,?3,?4)').bind(userId, email, username, avatar||'').run();
          user = { id: userId, email, username, avatar: avatar||'' };
        }
        return Response.json({ success: true, user }, { headers: corsHeaders });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    // ===== HOMEPAGE =====
    if (path === '/' && request.method === 'GET') {
      return Response.json({
        status: "Worker Live",
        version: "2.0-NOX-AUTODELETE",
        d1Connected:!!env.DB,
        r2Connected:!!env.BUCKET,
        database: env.DB? "dope-tone-db-v2" : "NOT BOUND",
        bucket: env.BUCKET? "dope-tone-beats" : "NOT BOUND",
        endpoints: {
          notices: "/api/notices",
          controlCenter: "/control-center.html"
        }
      }, { headers: corsHeaders });
    }

    try {
      if (path === '/control-center.html' && request.method === 'GET') {
        return new Response(CONTROL_CENTER_HTML, { headers: { 'Content-Type': 'text/html' } });
      }

      // ===== STATS HISTORY - FOR SPARKLINES =====
      if (path === '/api/stats/history' && request.method === 'GET') {
        const days = 30;

        const plays = await env.DB.prepare(`
          SELECT DATE(played_at) as day, COUNT(*) as count
          FROM plays
          WHERE played_at >= datetime('now', '-${days} days')
          GROUP BY DATE(played_at)
          ORDER BY day ASC
        `).all().catch(() => ({ results: [] }));

        const likes = await env.DB.prepare(`
          SELECT DATE(created_at) as day, SUM(like_count) as count
          FROM beats
          WHERE created_at >= datetime('now', '-${days} days')
          GROUP BY DATE(created_at)
          ORDER BY day ASC
        `).all().catch(() => ({ results: [] }));

        const downloads = await env.DB.prepare(`
          SELECT DATE(created_at) as day, SUM(download_count) as count
          FROM beats
          WHERE created_at >= datetime('now', '-${days} days')
          GROUP BY DATE(created_at)
          ORDER BY day ASC
        `).all().catch(() => ({ results: [] }));

        const revenue = await env.DB.prepare(`
          SELECT DATE(created_at) as day, SUM(amount) as count
          FROM purchases
          WHERE created_at >= datetime('now', '-${days} days')
          GROUP BY DATE(created_at)
          ORDER BY day ASC
        `).all().catch(() => ({ results: [] }));

        const orders = await env.DB.prepare(`
          SELECT DATE(created_at) as day, COUNT(*) as count
          FROM purchases
          WHERE created_at >= datetime('now', '-${days} days')
          GROUP BY DATE(created_at)
          ORDER BY day ASC
        `).all().catch(() => ({ results: [] }));

        const fillDays = (results) => {
          const map = {};
          results.forEach(r => map[r.day] = r.count);
          const arr = [];
          for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            arr.push(map[key] || 0);
          }
          return arr;
        };

        return Response.json({
          plays: fillDays(plays.results),
          downloads: fillDays(downloads.results),
          cart: fillDays([]),
          likes: fillDays(likes.results),
          orders: fillDays(orders.results),
          revenue: fillDays(revenue.results.map(r => ({day: r.day, count: Math.floor(r.count / 100)})))
        }, { headers: corsHeaders });
      }

      // ===== EMAIL LIST ENDPOINT =====
      if (path === '/api/emails/list' && request.method === 'GET') {
        try {
          await env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS emails (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              email TEXT NOT NULL UNIQUE,
              source TEXT DEFAULT 'newsletter',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `).run().catch(() => {});

          const { results } = await env.DB.prepare(`
            SELECT email, source, created_at
            FROM emails
            ORDER BY created_at DESC
            LIMIT 100
          `).all().catch(() => ({ results: [] }));

          return Response.json({ success: true, emails: results || [] }, { headers: corsHeaders });
        } catch (err) {
          return Response.json({ success: false, emails: [] }, { headers: corsHeaders });
        }
      }

      // ===== TICKETS LIST ENDPOINT =====
      if (path === '/api/tickets/list' && request.method === 'GET') {
        try {
          await env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS support_tickets (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              email TEXT NOT NULL,
              subject TEXT NOT NULL,
              message TEXT NOT NULL,
              status TEXT DEFAULT 'open',
              priority TEXT DEFAULT 'Medium',
              ai_reply TEXT,
              resolved_at DATETIME,
              resolved_by TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              closed_at DATETIME,
              updated_at DATETIME
            )
          `).run().catch(() => {});

          const { results } = await env.DB.prepare(`
            SELECT id, name, email, subject, message, status, priority, ai_reply, created_at, resolved_at
            FROM support_tickets
            WHERE status!= 'Resolved'
            ORDER BY
              CASE priority
                WHEN 'Critical' THEN 1
                WHEN 'High' THEN 2
                WHEN 'Medium' THEN 3
                ELSE 4
              END,
              created_at DESC
            LIMIT 50
          `).all().catch(() => ({ results: [] }));

          return Response.json({ success: true, tickets: results || [] }, { headers: corsHeaders });
        } catch (err) {
          return Response.json({ success: false, tickets: [] }, { headers: corsHeaders });
        }
      }

      // ===== CLOSE TICKET ENDPOINT =====
      if (path.match(/^\/api\/tickets\/\d+\/close$/) && request.method === 'POST') {
        const id = path.split('/')[3];
        try {
          await env.DB.prepare(`
            UPDATE support_tickets
            SET status = 'closed', closed_at = datetime('now')
            WHERE id =?1
          `).bind(id).run();
          return Response.json({ success: true }, { headers: corsHeaders });
        } catch (err) {
          return Response.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders });
        }
      }

      // ===== GENERATE AI REPLY =====
      if (path.match(/^\/api\/tickets\/\d+\/ai-reply$/) && request.method === 'POST') {
        const id = path.split('/')[3];

        try {
          const ticket = await env.DB.prepare('SELECT * FROM support_tickets WHERE id =?1').bind(id).first();
          if (!ticket) return Response.json({ error: 'Ticket not found' }, { status: 404, headers: corsHeaders });

          let aiReply = `Hi ${ticket.name},\n\nThanks for contacting DopetoneVault support.\n\n`;

          const msg = (ticket.subject + ' ' + ticket.message).toLowerCase();

          if (msg.includes('download') || msg.includes('broken')) {
            aiReply += `For download issues: \n1. Check your browser's download folder\n2. Disable ad blockers temporarily\n3. Try a different browser\n\nIf the issue persists, reply with your order ID and we'll send a direct download link.`;
          } else if (msg.includes('upload') || msg.includes('failed')) {
            aiReply += `For upload problems:\n1. Ensure MP3 is under 50MB\n2. Use Chrome/Firefox\n3. Check your internet connection\n4. Convert WAV to MP3 if needed\n\nStill stuck? Send us the file at support@dopetonevault.com`;
          } else if (msg.includes('payment') || msg.includes('stripe') || msg.includes('charge')) {
            aiReply += `For payment issues:\n1. Check your bank statement - sometimes shows as pending\n2. Duplicate charges auto-refund in 3-5 days\n3. For immediate help, reply with your transaction ID\n\nWe take billing seriously and will resolve this ASAP.`;
          } else {
            aiReply += `We've received your request and our team is reviewing it. You'll hear back within 24 hours.\n\nFor urgent issues, email support@dopetonevault.com with subject "URGENT: Ticket #${id}"`;
          }

          aiReply += `\n\nBest,\nDopetoneVault Support Team`;

          await env.DB.prepare(`
            UPDATE support_tickets
            SET ai_reply =?1, status = 'InProgress', updated_at = datetime('now')
            WHERE id =?2
          `).bind(aiReply, id).run();

          return Response.json({ success: true, aiReply }, { headers: corsHeaders });
        } catch (err) {
          return Response.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders });
        }
      }

      // ===== RESOLVE TICKET =====
      if (path.match(/^\/api\/tickets\/\d+\/resolve$/) && request.method === 'POST') {
        const id = path.split('/')[3];
        const { note } = await request.json();

        try {
          await env.DB.prepare(`
            UPDATE support_tickets
            SET status = 'Resolved',
                resolved_at = datetime('now'),
                resolved_by =?1,
                closed_at = datetime('now')
            WHERE id =?2
          `).bind(note || 'Admin', id).run();

          return Response.json({ success: true }, { headers: corsHeaders });
        } catch (err) {
          return Response.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders });
        }
      }

      // ===== GET BEAT CURVE - MONTHLY OR REALTIME =====
      if (path.match(/^\/api\/stats\/curve\/\d+$/) && request.method === 'GET') {
        const beatId = path.split('/')[4];
        const range = url.searchParams.get('range') || 'realtime';

        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS beat_curve_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            beat_id INTEGER NOT NULL,
            timestamp TEXT NOT NULL,
            plays INTEGER DEFAULT 0,
            likes INTEGER DEFAULT 0,
            downloads INTEGER DEFAULT 0,
            cart INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `).run().catch(() => {});

        await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_curve_beat_time ON beat_curve_data(beat_id, timestamp)`).run().catch(() => {});

        let query;
        if (range === 'monthly') {
          query = `
            SELECT strftime('%Y-%m', timestamp) as timestamp,
                   SUM(plays) as plays, SUM(likes) as likes,
                   SUM(downloads) as downloads, SUM(cart) as cart
            FROM beat_curve_data
            WHERE beat_id =?1
            GROUP BY strftime('%Y-%m', timestamp)
            ORDER BY timestamp ASC
          `;
        } else {
          query = `
            SELECT timestamp, plays, likes, downloads, cart
            FROM beat_curve_data
            WHERE beat_id =?1
            ORDER BY timestamp ASC
            LIMIT 50
          `;
        }

        const { results } = await env.DB.prepare(query).bind(beatId).all().catch(() => ({ results: [] }));
        return Response.json(results || [], { headers: corsHeaders });
      }

      // ===== POST BEAT CURVE POINT =====
      if (path === '/api/stats/curve' && request.method === 'POST') {
        const { beat_id, timestamp, plays, likes, downloads, cart } = await request.json();
        if (!beat_id) return Response.json({ error: 'beat_id required' }, { status: 400, headers: corsHeaders });

        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS beat_curve_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            beat_id INTEGER NOT NULL,
            timestamp TEXT NOT NULL,
            plays INTEGER DEFAULT 0,
            likes INTEGER DEFAULT 0,
            downloads INTEGER DEFAULT 0,
            cart INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `).run().catch(() => {});

        await env.DB.prepare(`
          INSERT INTO beat_curve_data (beat_id, timestamp, plays, likes, downloads, cart)
          VALUES (?1,?2,?3,?4,?5,?6)
        `).bind(beat_id, timestamp, plays, likes, downloads, cart).run();

        await env.DB.prepare(`
          DELETE FROM beat_curve_data
          WHERE beat_id =?1 AND id NOT IN (
            SELECT id FROM beat_curve_data
            WHERE beat_id =?1
            ORDER BY timestamp DESC
            LIMIT 50
          )
        `).bind(beat_id).run().catch(() => {});

        return Response.json({ success: true }, { headers: corsHeaders });
      }

      // ===== DELETE BEAT CURVE =====
      if (path.match(/^\/api\/stats\/curve\/\d+$/) && request.method === 'DELETE') {
        const beatId = path.split('/')[4];
        await env.DB.prepare(`DELETE FROM beat_curve_data WHERE beat_id =?1`).bind(beatId).run().catch(() => {});
        return Response.json({ success: true }, { headers: corsHeaders });
      }

      // ===== SAVE BEAT TO D1 =====
      if (path === '/beats' && request.method === 'POST') {
        const data = await request.json();

        const result = await env.DB.prepare(`
          INSERT INTO beats (title, genre, bpm, price, mood, type, key, mp3_url, cover_url, wav_url, zip_url, play_count, download_count, like_count, is_free, monetization_mode, has_free_tagged, created_at)
          VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11, 0, 0, 0, 0, 'paid', 0, datetime('now'))
        `).bind(
          data.title,
          data.genre || null,
          data.bpm || 0,
          data.price || 0,
          data.mood || null,
          data.type || null,
          data.key || null,
          data.mp3_url,
          data.cover_url,
          data.wav_url || null,
          data.zip_url || null
        ).run();

        const beatId = result.meta.last_row_id;

        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS beat_curve_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            beat_id INTEGER NOT NULL,
            timestamp TEXT NOT NULL,
            plays INTEGER DEFAULT 0,
            likes INTEGER DEFAULT 0,
            downloads INTEGER DEFAULT 0,
            cart INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `).run().catch(() => {});

        await env.DB.prepare(`
          INSERT INTO beat_curve_data (beat_id, timestamp, plays, likes, downloads, cart)
          VALUES (?1, datetime('now'), 0, 0, 0, 0)
        `).bind(beatId).run();

        return Response.json({ success: true, id: beatId }, { headers: corsHeaders });
      }

      // ===== UPDATE BEAT =====
      if (path === '/beats' && request.method === 'PUT') {
        const data = await request.json();

        const existing = await env.DB.prepare('SELECT * FROM beats WHERE id =?1').bind(data.id).first();
        if (!existing) return Response.json({ error: 'Beat not found' }, { status: 404, headers: corsHeaders });

        const cover_url = data.cover_url || existing.cover_url;
        const mp3_url = data.mp3_url || existing.mp3_url;

        await env.DB.prepare(`
          UPDATE beats SET
            title =?1, artist =?2, genre =?3, bpm =?4, price =?5,
            cover_url =?6, mp3_url =?7, tags =?8
          WHERE id =?9
        `).bind(
          data.title, data.artist, data.genre, data.bpm, data.price,
          cover_url, mp3_url, data.tags, data.id
        ).run();

        return Response.json({ success: true }, { headers: corsHeaders });
      }

      // ===== GET BEATS =====
      if (path === "/beats" && request.method === "GET") {
        const { results } = await env.DB.prepare(
          `SELECT * FROM beats ORDER BY created_at DESC`
        ).all().catch(() => ({ results: [] }));

        const R2_PUBLIC_URL = "https://cdn.dopetonevault.com";

        const normalized = results.map(beat => ({
        ...beat,
          download_count: beat.download_count?? 0,
          like_count: beat.like_count?? 0,
          is_free: beat.is_free?? 0,
          play_count: beat.play_count?? 0,
          monetization_mode: beat.monetization_mode || 'paid',
          has_free_tagged: beat.has_free_tagged?? 0,
          mp3_url: beat.mp3_url? (beat.mp3_url.startsWith('http')? beat.mp3_url : `${R2_PUBLIC_URL}/${beat.mp3_url}`) : null,
          audio: beat.mp3_url? (beat.mp3_url.startsWith('http')? beat.mp3_url : `${R2_PUBLIC_URL}/${beat.mp3_url}`) : null,
          cover_url: beat.cover_url? (beat.cover_url.startsWith('http')? beat.cover_url : `${R2_PUBLIC_URL}/${beat.cover_url}`) : null,
          cover: beat.cover_url? (beat.cover_url.startsWith('http')? beat.cover_url : `${R2_PUBLIC_URL}/${beat.cover_url}`) : null,
          zip_url: beat.zip_url? (beat.zip_url.startsWith('http')? beat.zip_url : `${R2_PUBLIC_URL}/${beat.zip_url}`) : null
        }));

        return Response.json(normalized || [], { headers: corsHeaders });
      }

      // ===== MONETIZATION TOGGLE =====
      if (path === '/beats/monetize' && request.method === 'POST') {
        try {
          const { id, mode, has_free_tagged } = await request.json();

          if (!id ||!mode) {
            return Response.json({ error: 'id and mode required' }, { status: 400, headers: corsHeaders });
          }

          const result = await env.DB.prepare(`
            UPDATE beats SET
              monetization_mode =?1,
              has_free_tagged =?2
            WHERE id =?3
          `).bind(mode, has_free_tagged, parseInt(id)).run();

          if (!result.success || result.meta.changes === 0) {
            return Response.json({ error: 'Beat not found or no changes' }, { status: 404, headers: corsHeaders });
          }

          return Response.json({ success: true, mode }, { headers: corsHeaders });
        } catch (err) {
          return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
        }
      }

      // ===== OVERVIEW STATS =====
      if (path === '/api/stats/overview' && request.method === 'GET') {
        const totalStreams = await env.DB.prepare(`
          SELECT COALESCE(SUM(play_count), 0) as total FROM beats
        `).first().catch(() => ({ total: 0 }));

        const activeListeners = await env.DB.prepare(`
          SELECT COUNT(DISTINCT user_id) as count FROM plays
        `).first().catch(() => ({ count: 0 }));

        const revenueToday = await env.DB.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total FROM purchases
          WHERE DATE(created_at) = DATE('now')
        `).first().catch(() => ({ total: 0 }));

        const newFollowers = await env.DB.prepare(`
          SELECT COUNT(*) as count FROM beats
          WHERE DATE(created_at) = DATE('now')
        `).first().catch(() => ({ count: 0 }));

        const totalEmails = await env.DB.prepare(`SELECT COUNT(*) as count FROM users`).first().catch(() => ({ count: 0 }));

        return Response.json({
          totalStreams: totalStreams?.total || 0,
          activeListeners: activeListeners?.count || 0,
          revenueToday: Math.floor((revenueToday?.total || 0) / 100),
          newFollowers: newFollowers?.count || 0,
          totalEmails: totalEmails?.count || 0
        }, { headers: corsHeaders });
      }

      // ===== SPARKLINE DATA =====
      if (path === '/api/stats/sparks' && request.method === 'GET') {
        const beats = await env.DB.prepare(`
          SELECT play_count FROM beats ORDER BY created_at DESC LIMIT 24
        `).all().catch(() => ({ results: [] }));

        let baseData = beats.results.map(b => b.play_count || 0);
        while (baseData.length < 24) baseData.unshift(0);

        let revenueData = baseData.map(v => Math.floor(v * 1.2));
        try {
          const revenue = await env.DB.prepare(`
            SELECT DATE(created_at) as day, SUM(amount) as total
            FROM purchases
            WHERE created_at >= datetime('now', '-24 days')
            GROUP BY DATE(created_at)
            ORDER BY day ASC
          `).all();
          if (revenue.results.length > 0) {
            revenueData = Array(24).fill(0);
            revenue.results.forEach((r, i) => {
              const idx = Math.max(0, 23 - i);
              revenueData[idx] = Math.floor(r.total / 100);
            });
          }
        } catch {}

        return Response.json({
          streams: baseData,
          listeners: baseData.map(v => Math.floor(v * 0.6)),
          revenue: revenueData,
          followers: baseData.map(v => Math.floor(v * 0.1))
        }, { headers: corsHeaders });
      }

      // ===== SONG PERFORMANCE =====
      if (path.startsWith('/api/song/') && path.endsWith('/performance') && request.method === 'GET') {
        const id = path.split('/')[3];
        const range = url.searchParams.get('range') || '30d';
        const days = range === '7d'? 7 : range === '1d'? 1 : 30;

        let data;
        try {
          const plays = await env.DB.prepare(`
            SELECT DATE(played_at) as day, COUNT(*) as count
            FROM plays
            WHERE beat_id =?1 AND played_at >= datetime('now', '-' ||?2 || ' days')
            GROUP BY DATE(played_at)
            ORDER BY day ASC
          `).bind(id, days).all();

          if (plays.results.length > 0) {
            data = Array(days).fill(0);
            plays.results.forEach(p => {
              data[days - 1] = p.count;
            });
          }
        } catch {}

        if (!data) {
          const beat = await env.DB.prepare(`
            SELECT play_count FROM beats WHERE id =?1
          `).bind(id).first().catch(() => ({ play_count: 0 }));

          const totalPlays = beat?.play_count || 0;
          const dailyAvg = Math.floor(totalPlays / days) || 1;

          data = Array.from({length: days}, (_, i) => {
            const variance = Math.sin(i / 3) * (dailyAvg * 0.3);
            return Math.max(0, Math.floor(dailyAvg + variance + (Math.random() * dailyAvg * 0.2)));
          });
        }

        return Response.json(data, { headers: corsHeaders });
      }

      // ===== POST /api/stats/play =====
      if (path === '/api/stats/play' && request.method === 'POST') {
        const { beat_id, user_id } = await request.json();
        if (!beat_id) return Response.json({ error: 'beat_id required' }, { status: 400, headers: corsHeaders });

        await env.DB.prepare(`UPDATE beats SET play_count = COALESCE(play_count, 0) + 1 WHERE id =?1`).bind(beat_id).run().catch(() => {});

        await env.DB.prepare(`CREATE TABLE IF NOT EXISTS plays (id INTEGER PRIMARY KEY AUTOINCREMENT, beat_id INTEGER, user_id TEXT, played_at TEXT)`).run().catch(() => {});
        await env.DB.prepare(`INSERT INTO plays (beat_id, user_id, played_at) VALUES (?1,?2, datetime('now'))`).bind(beat_id, user_id || 'anonymous').run().catch(() => {});

        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS beat_curve_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            beat_id INTEGER NOT NULL,
            timestamp TEXT NOT NULL,
            plays INTEGER DEFAULT 0,
            likes INTEGER DEFAULT 0,
            downloads INTEGER DEFAULT 0,
            cart INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `).run().catch(() => {});

        const beat = await env.DB.prepare('SELECT play_count, like_count, download_count FROM beats WHERE id =?1').bind(beat_id).first();

        await env.DB.prepare(`
          INSERT INTO beat_curve_data (beat_id, timestamp, plays, likes, downloads, cart)
          VALUES (?1, datetime('now'),?2,?3,?4, 0)
        `).bind(beat_id, beat?.play_count || 0, beat?.like_count || 0, beat?.download_count || 0).run();

        await env.DB.prepare(`
          DELETE FROM beat_curve_data
          WHERE beat_id =?1 AND id NOT IN (
            SELECT id FROM beat_curve_data
            WHERE beat_id =?1
            ORDER BY timestamp DESC
            LIMIT 50
          )
        `).bind(beat_id).run().catch(() => {});

        return Response.json({ success: true }, { headers: corsHeaders });
      }

      // ===== POST /api/stats/like =====
      if (path === '/api/stats/like' && request.method === 'POST') {
        const { beat_id, liked } = await request.json();
        if (!beat_id) return Response.json({ error: 'beat_id required' }, { status: 400, headers: corsHeaders });

        const change = liked? 1 : -1;
        await env.DB.prepare(`UPDATE beats SET like_count = COALESCE(like_count, 0) +?1 WHERE id =?2`).bind(change, beat_id).run().catch(() => {});

        return Response.json({ success: true }, { headers: corsHeaders });
      }

      // ===== TRACK PLAY LEGACY =====
      if (path === '/api/track-play' && request.method === 'POST') {
        const { beat_id, user_id } = await request.json();
        if (!beat_id) return Response.json({ error: 'beat_id required' }, { status: 400, headers: corsHeaders });

        await env.DB.prepare(`UPDATE beats SET play_count = COALESCE(play_count, 0) + 1 WHERE id =?1`).bind(beat_id).run().catch(() => {});

        try {
          await env.DB.prepare(`INSERT INTO plays (beat_id, user_id, played_at) VALUES (?1,?2, datetime('now'))`).bind(beat_id, user_id || 'anonymous').run();
        } catch {}

        return Response.json({ success: true }, { headers: corsHeaders });
      }

      // ===== RECORD PURCHASE =====
      if (path === '/api/purchase' && request.method === 'POST') {
        const { beat_id, user_id, amount, license_type } = await request.json();

        if (!beat_id ||!amount) {
          return Response.json({ error: 'beat_id and amount required' }, { status: 400, headers: corsHeaders });
        }

        try {
          await env.DB.prepare(`
            INSERT INTO purchases (beat_id, user_id, amount, license_type, created_at)
            VALUES (?1,?2,?3,?4, datetime('now'))
          `).bind(beat_id, user_id || 'anonymous', amount, license_type || 'basic').run();

          return Response.json({ success: true }, { headers: corsHeaders });
        } catch (err) {
          return Response.json({ error: 'purchases table missing' }, { status: 500, headers: corsHeaders });
        }
      }

      // ===== SIMPLE FILE UPLOAD =====
      if (path === '/upload' && request.method === 'POST') {
        const formData = await request.formData();

        if (formData.has('file') && formData.has('folder')) {
          if (!env.BUCKET) {
            return Response.json({ error: 'R2_NOT_BOUND' }, { status: 500, headers: corsHeaders });
          }

          const file = formData.get('file');
          const folder = formData.get('folder');

          if (!file) {
            return Response.json({ error: 'file required' }, { status: 400, headers: corsHeaders });
          }

          const timestamp = Date.now();

          const clean = (name) => {
            const ext = name.split('.').pop().toLowerCase();
            const base = name.replace(/\.[^/.]+$/, '');
            return base.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
              + '.' + (['png','jpg','jpeg','webp','mp3','wav','zip'].includes(ext)? ext : 'bin');
          };

          const filename = clean(file.name);
          const key = `${folder}/${timestamp}-${filename}`;

          let contentType = file.type;
          if (filename.endsWith('.mp3')) contentType = 'audio/mpeg';
          if (filename.endsWith('.wav')) contentType = 'audio/wav';
          if (filename.endsWith('.zip')) contentType = 'application/zip';
          if (filename.endsWith('.png')) contentType = 'image/png';
          if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) contentType = 'image/jpeg';

          await env.BUCKET.put(key, file.stream(), {
            httpMetadata: {
              contentType,
              cacheControl: 'public, max-age=31536000'
            }
          });

          const R2_PUBLIC_URL = "https://cdn.dopetonevault.com";

          return Response.json({
            success: true,
            url: `${R2_PUBLIC_URL}/${key}`
          }, { headers: corsHeaders });
        }
      }

      // ===== UPDATE BEAT PRICE =====
      if (path === '/api/beat/price' && request.method === 'POST') {
        const { id, price } = await request.json();
        if (!id) return Response.json({ error: 'id required' }, { status: 400, headers: corsHeaders });

        await env.DB.prepare('UPDATE beats SET price =?1 WHERE id =?2').bind(price, id).run();

        return Response.json({ success: true }, { headers: corsHeaders });
      }

      // ===== TOGGLE BEAT FREE/PAID =====
      if (path === '/api/beat/license' && request.method === 'POST') {
        const { id, is_free } = await request.json();
        if (!id) return Response.json({ error: 'id required' }, { status: 400, headers: corsHeaders });

        await env.DB.prepare('UPDATE beats SET is_free =?1 WHERE id =?2').bind(is_free? 1 : 0, id).run();

        return Response.json({ success: true }, { headers: corsHeaders });
      }

      // ===== GET BEATS FOR DASHBOARD =====
      if (path === '/api/beats/manage' && request.method === 'GET') {
        const { results } = await env.DB.prepare(
          `SELECT id, title, price, is_free, play_count, download_count
           FROM beats ORDER BY play_count DESC LIMIT 50`
        ).all().catch(() => ({ results: [] }));
        return Response.json(results, { headers: corsHeaders });
      }

      // ===== LOG ERROR =====
      if (path === '/api/errors/log' && request.method === 'POST') {
        const { type, msg, file, line } = await request.json();
        const userAgent = request.headers.get('user-agent');

        try {
          await env.DB.prepare(
            'INSERT INTO errors (type, msg, file, line, user_agent, created_at) VALUES (?1,?2,?3,?4,?5, datetime("now"))'
          ).bind(type, msg, file || null, line || null, userAgent).run();
        } catch (e) {
          console.error('Error table missing:', e);
        }

        return Response.json({ success: true }, { headers: corsHeaders });
      }

      // ===== GET ERRORS =====
      if (path === '/api/errors' && request.method === 'GET') {
        try {
          const { results } = await env.DB.prepare(
            'SELECT * FROM errors ORDER BY created_at DESC LIMIT 50'
          ).all();
          return Response.json(results, { headers: corsHeaders });
        } catch {
          return Response.json([], { headers: corsHeaders });
        }
      }

      // ===== LOG MESSAGE =====
      if (path === '/api/messages/log' && request.method === 'POST') {
        const { email, source, text } = await request.json();
        if (!email ||!text) return Response.json({ error: 'email and text required' }, { status: 400, headers: corsHeaders });

        try {
          await env.DB.prepare(
            'INSERT INTO messages (email, source, text, created_at) VALUES (?1,?2,?3, datetime("now"))'
          ).bind(email, source || 'contact', text).run();
        } catch (e) {
          console.error('Messages table missing:', e);
        }

        return Response.json({ success: true }, { headers: corsHeaders });
      }

      // ===== GET MESSAGES =====
      if (path === '/api/messages' && request.method === 'GET') {
        try {
          const { results } = await env.DB.prepare(
            'SELECT * FROM messages ORDER BY created_at DESC LIMIT 50'
          ).all();
          return Response.json(results, { headers: corsHeaders });
        } catch {
          return Response.json([], { headers: corsHeaders });
        }
      }

      // ===== TRACK FREE DOWNLOAD =====
      if (path === '/api/download' && request.method === 'POST') {
        const { beat_id, email } = await request.json();
        if (!beat_id) return Response.json({ error: 'beat_id required' }, { status: 400, headers: corsHeaders });

        await env.DB.prepare(
          'UPDATE beats SET download_count = COALESCE(download_count, 0) + 1 WHERE id =?1'
        ).bind(beat_id).run().catch(() => {});

        if (email) {
          try {
            await env.DB.prepare(
              'INSERT OR IGNORE INTO users (email, source, created_at) VALUES (?1,?2, datetime("now"))'
            ).bind(email, 'free_download').run();
          } catch {}
        }

        return Response.json({ success: true }, { headers: corsHeaders });
      }

      // ===== SUPPORT TICKETS =====
      if (path === '/api/support/tickets' && request.method === 'POST') {
        const { email, title, description } = await request.json();

        if (!email ||!title ||!description) {
          return Response.json({ error: 'email, title, description required' }, { status: 400, headers: corsHeaders });
        }

        const result = await env.DB.prepare(`
          INSERT INTO tickets (user_email, title, description, source)
          VALUES (?1,?2,?3, 'Contact Form')
        `).bind(email, title, description).run();

        return Response.json({ success: true, id: result.meta.last_row_id }, { headers: corsHeaders });
      }

      if (path === '/api/admin/tickets' && request.method === 'GET') {
        const { results } = await env.DB.prepare(`
          SELECT * FROM tickets
          ORDER BY
            CASE priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END,
            created_at DESC
        `).all().catch(() => ({ results: [] }));

        return Response.json(results, { headers: corsHeaders });
      }

      if (path.match(/^\/api\/admin\/tickets\/\d+\/ai-reply$/) && request.method === 'POST') {
        const id = path.split('/')[4];

        const ticket = await env.DB.prepare('SELECT * FROM tickets WHERE id =?1').bind(id).first();
        if (!ticket) return Response.json({ error: 'Ticket not found' }, { status: 404, headers: corsHeaders });

        const aiReply = `Thanks for contacting DopetoneVault! Regarding "${ticket.title}": Our team will review this. For beat uploads, ensure MP3 is under 50MB. Check your dashboard for status.`;

        await env.DB.prepare(`
          UPDATE tickets SET ai_reply =?1, status = 'InProgress', updated_at = datetime('now')
          WHERE id =?2
        `).bind(aiReply, id).run();

        return Response.json({ success: true, aiReply }, { headers: corsHeaders });
      }

      if (path.match(/^\/api\/admin\/tickets\/\d+\/status$/) && request.method === 'PUT') {
        const id = path.split('/')[4];
        const { status } = await request.json();

        await env.DB.prepare(`
          UPDATE tickets SET status =?1, updated_at = datetime('now') WHERE id =?2
        `).bind(status, id).run();

        return Response.json({ success: true }, { headers: corsHeaders });
      }

      // ===== EMAIL EXPORT =====
      if (path === '/api/emails/export' && request.method === 'GET') {
        let csv = 'email,date\n';
        try {
          const users = await env.DB.prepare(`
            SELECT email, created_at FROM users ORDER BY created_at DESC
          `).all();
          users.results.forEach(u => {
            csv += `${u.email},${u.created_at}\n`;
          });
        } catch {
          csv += 'dopetone701@gmail.com,2026-06-18\n';
        }

        return new Response(csv, {
          headers: {
          ...corsHeaders,
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="dopetone-emails.csv"'
          }
        });
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });

    } catch (err) {
      console.error('Worker error:', err);
      return Response.json({ error: err.message }, {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};
