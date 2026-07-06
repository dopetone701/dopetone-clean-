// ===============================
// 🔥 GLOBAL FILTER ENGINE - SAFE
// ===============================

class GlobalFilter {
  constructor() {
    this.rules = this.getDefaultRules();
    this.currentPage = this.detectPage();
  }

  detectPage() {
    const path = window.location.pathname;
    if (path.includes('index') || path === '/' || path.includes('localhost')) return 'home';
    if (path.includes('beats')) return 'beats';
    if (path.includes('playlists')) return 'playlists';
    return 'default';
  }

  // DEFAULT RULES - LOOSE SO NOTHING BREAKS
  getDefaultRules() {
    return {
      home: {
        featured: { tags: [], genres: [], minBpm: 0, maxBpm: 999, keys: [], moods: [], typeBeats: [], sort: 'date_desc', limit: 12, minPlays: 0 },
        latest: { tags: [], genres: [], minBpm: 0, maxBpm: 999, keys: [], moods: [], typeBeats: [], sort: 'date_desc', limit: 20 },
        trending: { tags: [], genres: [], minBpm: 0, maxBpm: 999, keys: [], moods: [], typeBeats: [], sort: 'plays_desc', limit: 15, minPlays: 0 },
        all: { tags: [], genres: [], minBpm: 0, maxBpm: 999, keys: [], moods: [], typeBeats: [], sort: 'date_desc', limit: 50 }
      },
      beats: {
        featured: { tags: [], genres: [], minBpm: 0, maxBpm: 999, keys: [], moods: [], typeBeats: [], sort: 'date_desc', limit: 8 },
        all: { tags: [], genres: [], minBpm: 0, maxBpm: 999, keys: [], moods: [], typeBeats: [], sort: 'date_desc', limit: 50 }
      }
    };
  }

  filterBeats(allBeats, sectionName, customRules = {}) {
    if (!allBeats ||!allBeats.length) {
      console.warn(`[GlobalFilter] No beats to filter for ${sectionName}`);
      return [];
    }

    const pageRules = this.rules[this.currentPage] || this.rules.home;
    const rules = {...pageRules[sectionName],...customRules };
    
    if (!rules) return allBeats.slice(0, 10);

    let filtered = [...allBeats];

    if (rules.tags && rules.tags.length) {
      filtered = filtered.filter(beat => 
        beat.tags && rules.tags.some(tag => 
          beat.tags.map(t => String(t).toLowerCase()).includes(tag.toLowerCase())
        )
      );
    }

    if (rules.genres && rules.genres.length) {
      filtered = filtered.filter(beat => 
        beat.genre && rules.genres.map(g => g.toLowerCase()).includes(beat.genre.toLowerCase())
      );
    }

    if (rules.minBpm || rules.maxBpm) {
      filtered = filtered.filter(beat => {
        const bpm = parseInt(beat.bpm) || 0;
        return bpm >= (rules.minBpm || 0) && bpm <= (rules.maxBpm || 999);
      });
    }

    if (rules.keys && rules.keys.length) {
      filtered = filtered.filter(beat => 
        beat.key && rules.keys.map(k => k.toLowerCase()).includes(beat.key.toLowerCase())
      );
    }

    if (rules.moods && rules.moods.length) {
      filtered = filtered.filter(beat => 
        beat.mood && rules.moods.some(mood => 
          beat.mood.toLowerCase().includes(mood.toLowerCase())
        )
      );
    }

    if (rules.typeBeats && rules.typeBeats.length) {
      filtered = filtered.filter(beat => 
        beat.type_beat && rules.typeBeats.some(type => 
          beat.type_beat.toLowerCase().includes(type.toLowerCase())
        )
      );
    }

    if (rules.minPlays && rules.minPlays > 0) {
      filtered = filtered.filter(beat => (beat.plays || 0) >= rules.minPlays);
    }

    filtered = this.sortBeats(filtered, rules.sort);
    if (rules.limit) filtered = filtered.slice(0, rules.limit);

    // FALLBACK: If filter kills all beats, return unfiltered
    if (filtered.length === 0) {
      console.warn(`[GlobalFilter] Filter empty for ${sectionName}. Using fallback.`);
      return allBeats.slice(0, rules.limit || 10);
    }

    console.log(`[GlobalFilter] ${sectionName}: ${filtered.length} beats`);
    return filtered;
  }

  sortBeats(beats, sortType) {
    switch(sortType) {
      case 'featured':
        return beats.sort((a, b) => {
          if (b.featured &&!a.featured) return 1;
          if (!b.featured && a.featured) return -1;
          return (b.plays || 0) - (a.plays || 0);
        });
      case 'date_desc':
        return beats.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      case 'plays_desc':
        return beats.sort((a, b) => (b.plays || 0) - (a.plays || 0));
      default:
        return beats;
    }
  }
}

export const globalFilter = new GlobalFilter();
window.globalFilter = globalFilter;
