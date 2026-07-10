export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

    try {
      // 1. LOG A PLAY
      if (url.pathname === '/api/stats/play' && req.method === 'POST') {
        const { beat_id, user_id } = await req.json();
        if (!beat_id) return json({ error: 'beat_id required' }, 400, cors);

        await env.DB.prepare(`UPDATE beats SET play_count = play_count + 1 WHERE id =?`).bind(beat_id).run();
        await env.DB.prepare(`INSERT INTO play_history (beat_id, user_id, timestamp) VALUES (?,?,?)`)
         .bind(beat_id, user_id || 'anon', new Date().toISOString()).run();

        return json({ success: true }, 200, cors);
      }

      // 2. LOG A LIKE
      if (url.pathname === '/api/stats/like' && req.method === 'POST') {
        const { beat_id, liked } = await req.json();
        if (!beat_id) return json({ error: 'beat_id required' }, 400, cors);

        const delta = liked? 1 : -1;
        await env.DB.prepare(`UPDATE beats SET like_count = like_count +? WHERE id =?`).bind(delta, beat_id).run();

        // also log to history so it shows on graph
        await env.DB.prepare(`INSERT INTO like_history (beat_id, liked, timestamp) VALUES (?,?,?)`)
         .bind(beat_id, liked? 1 : 0, new Date().toISOString()).run().catch(() => {});

        return json({ success: true }, 200, cors);
      }

      // 3. LOG A DOWNLOAD
      if (url.pathname === '/api/stats/download' && req.method === 'POST') {
        const { beat_id } = await req.json();
        if (!beat_id) return json({ error: 'beat_id required' }, 400, cors);

        await env.DB.prepare(`UPDATE beats SET download_count = download_count + 1 WHERE id =?`).bind(beat_id).run();

        await env.DB.prepare(`INSERT INTO download_history (beat_id, timestamp) VALUES (?,?)`)
         .bind(beat_id, new Date().toISOString()).run().catch(() => {});

        return json({ success: true }, 200, cors);
      }

      // 4. LOG CART ADD
      if (url.pathname === '/api/stats/cart' && req.method === 'POST') {
        const { beat_id, added } = await req.json();
        if (!beat_id) return json({ error: 'beat_id required' }, 400, cors);

        await env.DB.prepare(`INSERT INTO cart_history (beat_id, added, timestamp) VALUES (?,?,?)`)
         .bind(beat_id, added? 1 : 0, new Date().toISOString()).run().catch(() => {});

        return json({ success: true }, 200, cors);
      }

      // 5. TOP 5 TRACKS
      if (url.pathname === '/api/stats/top') {
        const { results } = await env.DB.prepare(`
          SELECT id, title, cover_url, play_count, like_count, download_count,
                 (play_count + like_count * 2.0) as score
          FROM beats ORDER BY score DESC LIMIT 5
        `).all();
        return json(results, 200, cors);
      }

      // 6. GLOBAL STATS - ALL 4 METRICS
      if (url.pathname === '/api/stats/global') {
        const range = url.searchParams.get('range') || 'day';
        const sql = {
          hour: {
            plays: `SELECT strftime('%Y-%m-%d %H:00', timestamp) as t, COUNT(*) as c FROM play_history WHERE timestamp > datetime('now', '-24 hours') GROUP BY t ORDER BY t`,
            likes: `SELECT strftime('%Y-%m-%d %H:00', timestamp) as t, SUM(liked) as c FROM like_history WHERE timestamp > datetime('now', '-24 hours') GROUP BY t ORDER BY t`,
            downloads: `SELECT strftime('%Y-%m-%d %H:00', timestamp) as t, COUNT(*) as c FROM download_history WHERE timestamp > datetime('now', '-24 hours') GROUP BY t ORDER BY t`,
            cart: `SELECT strftime('%Y-%m-%d %H:00', timestamp) as t, SUM(added) as c FROM cart_history WHERE timestamp > datetime('now', '-24 hours') GROUP BY t ORDER BY t`
          },
          day: {
            plays: `SELECT date(timestamp) as t, COUNT(*) as c FROM play_history WHERE timestamp > date('now', '-30 days') GROUP BY t ORDER BY t`,
            likes: `SELECT date(timestamp) as t, SUM(liked) as c FROM like_history WHERE timestamp > date('now', '-30 days') GROUP BY t ORDER BY t`,
            downloads: `SELECT date(timestamp) as t, COUNT(*) as c FROM download_history WHERE timestamp > date('now', '-30 days') GROUP BY t ORDER BY t`,
            cart: `SELECT date(timestamp) as t, SUM(added) as c FROM cart_history WHERE timestamp > date('now', '-30 days') GROUP BY t ORDER BY t`
          },
          week: {
            plays: `SELECT strftime('%Y-W%W', timestamp) as t, COUNT(*) as c FROM play_history WHERE timestamp > date('now', '-12 weeks') GROUP BY t ORDER BY t`,
            likes: `SELECT strftime('%Y-W%W', timestamp) as t, SUM(liked) as c FROM like_history WHERE timestamp > date('now', '-12 weeks') GROUP BY t ORDER BY t`,
            downloads: `SELECT strftime('%Y-W%W', timestamp) as t, COUNT(*) as c FROM download_history WHERE timestamp > date('now', '-12 weeks') GROUP BY t ORDER BY t`,
            cart: `SELECT strftime('%Y-W%W', timestamp) as t, SUM(added) as c FROM cart_history WHERE timestamp > date('now', '-12 weeks') GROUP BY t ORDER BY t`
          }
        };

        const [plays, likes, downloads, cart] = await Promise.all([
          env.DB.prepare(sql[range].plays).all().catch(() => ({ results: [] })),
          env.DB.prepare(sql[range].likes).all().catch(() => ({ results: [] })),
          env.DB.prepare(sql[range].downloads).all().catch(() => ({ results: [] })),
          env.DB.prepare(sql[range].cart).all().catch(() => ({ results: [] }))
        ]);

        const totals = await env.DB.prepare(`SELECT SUM(play_count) as plays, SUM(download_count) as downloads, SUM(like_count) as likes FROM beats`).first();

        return json({
          history: {
            plays: plays.results.map(r => ({ date: r.t, value: r.c })),
            likes: likes.results.map(r => ({ date: r.t, value: r.c })),
            downloads: downloads.results.map(r => ({ date: r.t, value: r.c })),
            cart: cart.results.map(r => ({ date: r.t, value: r.c }))
          },
          totals: totals
        }, 200, cors);
      }

      // 7. TRACK PERFORMANCE - ALL 4 METRICS
      if (url.pathname.startsWith('/api/stats/track/')) {
        const beatId = url.pathname.split('/')[4];
        const range = url.searchParams.get('range') || 'day';
        const sql = {
          hour: {
            plays: `SELECT strftime('%Y-%m-%d %H:00', timestamp) as t, COUNT(*) as c FROM play_history WHERE beat_id =? AND timestamp > datetime('now', '-24 hours') GROUP BY t ORDER BY t`,
            likes: `SELECT strftime('%Y-%m-%d %H:00', timestamp) as t, SUM(liked) as c FROM like_history WHERE beat_id =? AND timestamp > datetime('now', '-24 hours') GROUP BY t ORDER BY t`,
            downloads: `SELECT strftime('%Y-%m-%d %H:00', timestamp) as t, COUNT(*) as c FROM download_history WHERE beat_id =? AND timestamp > datetime('now', '-24 hours') GROUP BY t ORDER BY t`,
            cart: `SELECT strftime('%Y-%m-%d %H:00', timestamp) as t, SUM(added) as c FROM cart_history WHERE beat_id =? AND timestamp > datetime('now', '-24 hours') GROUP BY t ORDER BY t`
          },
          day: {
            plays: `SELECT date(timestamp) as t, COUNT(*) as c FROM play_history WHERE beat_id =? AND timestamp > date('now', '-30 days') GROUP BY t ORDER BY t`,
            likes: `SELECT date(timestamp) as t, SUM(liked) as c FROM like_history WHERE beat_id =? AND timestamp > date('now', '-30 days') GROUP BY t ORDER BY t`,
            downloads: `SELECT date(timestamp) as t, COUNT(*) as c FROM download_history WHERE beat_id =? AND timestamp > date('now', '-30 days') GROUP BY t ORDER BY t`,
            cart: `SELECT date(timestamp) as t, SUM(added) as c FROM cart_history WHERE beat_id =? AND timestamp > date('now', '-30 days') GROUP BY t ORDER BY t`
          },
          week: {
            plays: `SELECT strftime('%Y-W%W', timestamp) as t, COUNT(*) as c FROM play_history WHERE beat_id =? AND timestamp > date('now', '-12 weeks') GROUP BY t ORDER BY t`,
            likes: `SELECT strftime('%Y-W%W', timestamp) as t, SUM(liked) as c FROM like_history WHERE beat_id =? AND timestamp > date('now', '-12 weeks') GROUP BY t ORDER BY t`,
            downloads: `SELECT strftime('%Y-W%W', timestamp) as t, COUNT(*) as c FROM download_history WHERE beat_id =? AND timestamp > date('now', '-12 weeks') GROUP BY t ORDER BY t`,
            cart: `SELECT strftime('%Y-W%W', timestamp) as t, SUM(added) as c FROM cart_history WHERE beat_id =? AND timestamp > date('now', '-12 weeks') GROUP BY t ORDER BY t`
          }
        };

        const [plays, likes, downloads, cart] = await Promise.all([
          env.DB.prepare(sql[range].plays).bind(beatId).all().catch(() => ({ results: [] })),
          env.DB.prepare(sql[range].likes).bind(beatId).all().catch(() => ({ results: [] })),
          env.DB.prepare(sql[range].downloads).bind(beatId).all().catch(() => ({ results: [] })),
          env.DB.prepare(sql[range].cart).bind(beatId).all().catch(() => ({ results: [] }))
        ]);

        const beat = await env.DB.prepare(`SELECT title FROM beats WHERE id =?`).bind(beatId).first();

        // Merge all datasets by date
        const dateMap = {};
        plays.results.forEach(r => { dateMap[r.t] = { date: r.t, plays: r.c, likes: 0, downloads: 0, cart: 0 }; });
        likes.results.forEach(r => { if (!dateMap[r.t]) dateMap[r.t] = { date: r.t, plays: 0, likes: 0, downloads: 0, cart: 0 }; dateMap[r.t].likes = r.c; });
        downloads.results.forEach(r => { if (!dateMap[r.t]) dateMap[r.t] = { date: r.t, plays: 0, likes: 0, downloads: 0, cart: 0 }; dateMap[r.t].downloads = r.c; });
        cart.results.forEach(r => { if (!dateMap[r.t]) dateMap[r.t] = { date: r.t, plays: 0, likes: 0, downloads: 0, cart: 0 }; dateMap[r.t].cart = r.c; });

        const points = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

        return json({
          beatTitle: beat?.title || 'Unknown',
          points: points
        }, 200, cors);
      }

      // 8. OVERVIEW FOR TOP STATS
      if (url.pathname === '/api/stats/overview') {
        const totals = await env.DB.prepare(`SELECT SUM(play_count) as totalStreams, 0 as revenueToday, 0 as totalEmails FROM beats`).first();
        return json(totals, 200, cors);
      }

      return json({ error: 'Not found' }, 404, cors);
    } catch (e) {
      return json({ error: e.message }, 500, cors);
    }
  }
};

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json',...headers } });
