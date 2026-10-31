/* Pool sheet parser + team matching. Works in the browser (window.PoolParser) and in Node (module.exports). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PoolParser = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];

  // Sheet spellings that don't normalize to ESPN's "location" field.
  const ALIASES = {
    'pitt': 'pittsburgh', 'ulm': 'ulmonroe', 'louisianamonroe': 'ulmonroe', 'ull': 'louisiana', 'louisianalafayette': 'louisiana',
    'westernky': 'westernkentucky', 'easternky': 'easternkentucky', 'miamifl': 'miami', 'miamifla': 'miami', 'miamiohio': 'miamioh',
    'southernmississippi': 'southernmiss', 'usm': 'southernmiss', 'appalachianstate': 'appstate', 'hawaii': 'hawaii',
    'cal': 'california', 'ncstate': 'ncstate', 'nmsu': 'newmexicostate', 'utsa': 'utsa', 'unlv': 'unlv', 'byu': 'byu',
    'fiu': 'floridainternational', 'fau': 'floridaatlantic', 'ecu': 'eastcarolina', 'usf': 'southflorida', 'uconn': 'uconn',
    'olemiss': 'olemiss', 'mississippi': 'olemiss', 'sanjosestate': 'sanjosestate', 'jax state': 'jacksonvillestate',
    'jaxstate': 'jacksonvillestate', 'jacksonvillest': 'jacksonvillestate', 'ga southern': 'georgiasouthern', 'gasouthern': 'georgiasouthern',
    'centralflorida': 'ucf', 'southerncal': 'usc', 'southerncalifornia': 'usc', 'texasam': 'texasam', 'armywestpoint': 'army',
    'washingtonst': 'washingtonstate', 'oregonst': 'oregonstate', 'oklahomast': 'oklahomastate', 'kansasst': 'kansasstate',
    'michiganst': 'michiganstate', 'ohiost': 'ohiostate', 'pennst': 'pennstate', 'iowast': 'iowastate', 'arizonast': 'arizonastate',
    'mississippist': 'mississippistate', 'floridast': 'floridastate', 'boisest': 'boisestate', 'fresnost': 'fresnostate',
    'texasst': 'texasstate', 'coloradost': 'coloradostate', 'utahst': 'utahstate', 'sandiegost': 'sandiegostate', 'nd': 'notredame'
  };

  function norm(s) {
    if (!s) return '';
    s = String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');   // strip accents (San José)
    s = s.replace(/@.*$/, '');                                          // "GEORGIA @ATLANTA" -> "GEORGIA"
    s = s.toLowerCase().replace(/\bst\.?\b/g, 'state').replace(/[^a-z0-9]/g, '');
    return ALIASES[s] || s;
  }

  function cleanName(s) {
    return String(s || '').replace(/@.*$/, '').trim();
  }
  function titleCase(s) {
    return s.toLowerCase().replace(/\b([a-z])/g, c => c.toUpperCase())
      .replace(/\bUcf\b/, 'UCF').replace(/\bSmu\b/, 'SMU').replace(/\bUab\b/, 'UAB').replace(/\bByu\b/, 'BYU')
      .replace(/\bUcla\b/, 'UCLA').replace(/\bUsc\b/, 'USC').replace(/\bLsu\b/, 'LSU').replace(/\bTcu\b/, 'TCU')
      .replace(/\bUnlv\b/, 'UNLV').replace(/\bUtsa\b/, 'UTSA').replace(/\bUtep\b/, 'UTEP').replace(/\bFiu\b/, 'FIU')
      .replace(/\bFau\b/, 'FAU').replace(/\bNc\b/, 'NC').replace(/\bUconn\b/, 'UConn').replace(/\bEcu\b/, 'ECU');
  }

  /** Parse a SheetJS workbook into the pool data structure. */
  function parseWorkbook(wb) {
    const ws = wb.Sheets[wb.SheetNames[0]];
    const XLSXlib = parseWorkbook.XLSX;
    const rows = XLSXlib.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
    const cell = (r, c) => (rows[r] && rows[r][c] !== undefined) ? rows[r][c] : null;
    const str = (r, c) => { const v = cell(r, c); return v == null ? '' : String(v).trim(); };

    // Title / dates
    const title = str(0, 2);
    const seasonMatch = title.match(/(20\d\d)/);
    const season = seasonMatch ? +seasonMatch[1] : new Date().getFullYear();
    const weekLabel = str(1, 2);
    const dueLabel = str(2, 2);

    // Header row: first row with "Pick'm" in col C, or row index 6
    let hdr = rows.findIndex(r => r && r.some(v => typeof v === 'string' && /pick'?m by the spread/i.test(v)));
    if (hdr < 0) hdr = 6;

    // Players: non-empty strings from col J (9) onward on header row
    const players = [];
    for (let c = 9; c < (rows[hdr] || []).length; c++) {
      const v = cell(hdr, c);
      if (v != null && String(v).trim()) players.push({ name: String(v).trim(), col: c });
    }

    const games = [];
    const dates = [];
    let day = null, slot = null, dayDate = null;
    let r = hdr + 1;
    let tiebreakRow = -1;
    for (; r < rows.length; r++) {
      const a = str(r, 0), c3 = str(r, 2), d = str(r, 3);
      if (/^tie ?breaker/i.test(a)) { tiebreakRow = r; break; }
      if (/totals for the week/i.test(str(r, 4))) break;
      const dayMatch = c3.match(/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday),?\s*([a-z]+)\s+(\d{1,2})/i);
      if (dayMatch) {
        day = c3;
        const m = MONTHS.indexOf(dayMatch[2].toLowerCase());
        dayDate = m >= 0 ? `${season}-${String(m + 1).padStart(2, '0')}-${String(+dayMatch[3]).padStart(2, '0')}` : null;
        if (dayDate && !dates.includes(dayDate)) dates.push(dayDate);
        slot = null;
        continue;
      }
      if (/^\d{1,2}:\d{2}|later|^\d{1,2}\/?/.test(c3) && !a && !d) { slot = c3; continue; }
      const spread = cell(r, 2);
      if (a && d && typeof spread === 'number') {
        const g = {
          idx: games.length,
          row: r,
          a: { raw: a, name: titleCase(cleanName(a)), key: norm(a), home: cleanName(a) === cleanName(a).toUpperCase() },
          b: { raw: d, name: titleCase(cleanName(d)), key: norm(d), home: cleanName(d) === cleanName(d).toUpperCase() },
          spread: spread,
          day, slot, date: dayDate,
          neutral: /@/.test(a) || /@/.test(d),
          sheetScoreA: typeof cell(r, 1) === 'number' ? cell(r, 1) : null,
          sheetScoreB: typeof cell(r, 4) === 'number' ? cell(r, 4) : null,
          sheetResult: /^[AB]$/i.test(str(r, 6)) ? str(r, 6).toUpperCase() : null,
          espnId: null
        };
        games.push(g);
        continue;
      }
    }

    // Picks per player
    const picks = {};
    for (const p of players) {
      picks[p.name] = games.map(g => {
        const v = str(g.row, p.col).toUpperCase();
        return v === 'A' || v === 'B' ? v : null;
      });
    }

    // Tiebreaker
    let tiebreakGame = null; const tiebreak = {};
    if (tiebreakRow > 0) {
      tiebreakGame = str(tiebreakRow - 1, 2) || null;
      for (const p of players) { const v = cell(tiebreakRow, p.col); if (typeof v === 'number') tiebreak[p.name] = v; }
    }

    // Weekly totals + cumulative (history rows below)
    const weekly = {}; const cumulative = {};
    for (let rr = (tiebreakRow > 0 ? tiebreakRow : r); rr < rows.length; rr++) {
      const label = str(rr, 4); const c3 = str(rr, 2);
      const wk = label.match(/^week\s*(\d+)/i);
      if (wk) {
        for (const p of players) { const v = cell(rr, p.col); if (typeof v === 'number') { (weekly[p.name] = weekly[p.name] || {})[+wk[1]] = v; } }
      } else if (/cumulative/i.test(c3)) {
        for (const p of players) { const v = cell(rr, p.col); if (typeof v === 'number') cumulative[p.name] = v; }
      }
    }
    const weekNums = Object.values(weekly).flatMap(o => Object.keys(o).map(Number));
    const weekNumber = weekNums.length ? Math.max(...weekNums) + 1 : null;

    return {
      version: 1, season, weekNumber, weekLabel, dueLabel, dates,
      tiebreakGame, generatedAt: new Date().toISOString(),
      players: players.map(p => p.name),
      games: games.map(({ row, ...g }) => g),
      picks, tiebreak, weekly, cumulative
    };
  }

  /** Flatten an ESPN scoreboard payload into simple event records. */
  function flattenEvents(payload) {
    const out = [];
    for (const e of (payload && payload.events) || []) {
      const c = e.competitions && e.competitions[0]; if (!c) continue;
      const home = c.competitors.find(x => x.homeAway === 'home'), away = c.competitors.find(x => x.homeAway === 'away');
      if (!home || !away) continue;
      const st = c.status || {}; const t = st.type || {};
      const team = x => ({ id: x.team.id, loc: x.team.location, abbr: x.team.abbreviation, display: x.team.displayName,
        short: x.team.shortDisplayName, score: x.score != null ? +x.score : null, logo: x.team.logo || null,
        rank: x.curatedRank && x.curatedRank.current <= 25 ? x.curatedRank.current : null, record: (x.records && x.records[0] && x.records[0].summary) || null });
      out.push({
        id: e.id, date: e.date, name: e.name, shortName: e.shortName,
        state: t.state || 'pre',            // pre | in | post
        detail: t.shortDetail || t.detail || '', completed: !!t.completed,
        period: st.period || 0, clock: st.displayClock || '',
        neutral: !!c.neutralSite,
        home: team(home), away: team(away),
        odds: (c.odds && c.odds[0] && c.odds[0].details) || null,
        broadcast: (c.broadcasts && c.broadcasts[0] && c.broadcasts[0].names && c.broadcasts[0].names[0]) || null,
        lastPlay: (c.situation && c.situation.lastPlay && c.situation.lastPlay.text) || null,
        possession: (c.situation && c.situation.possession) || null
      });
    }
    return out;
  }

  function teamMatches(key, t) {
    return key && (key === norm(t.loc) || key === norm(t.abbr) || key === norm(t.display) || key === norm(t.short));
  }

  /** Find the ESPN event for a sheet game. Prefers stored espnId, then both-team match, then one-team match. */
  function matchEvent(game, events) {
    if (game.espnId) { const e = events.find(x => x.id === game.espnId); if (e) return { event: e, quality: 'id' }; }
    let best = null;
    for (const e of events) {
      const aHome = teamMatches(game.a.key, e.home), aAway = teamMatches(game.a.key, e.away);
      const bHome = teamMatches(game.b.key, e.home), bAway = teamMatches(game.b.key, e.away);
      if ((aHome && bAway) || (aAway && bHome)) return { event: e, quality: 'both' };
      if (!best && (aHome || aAway || bHome || bAway)) best = { event: e, quality: 'one' };
    }
    return best;
  }

  /** Sides of an event as they map to the sheet's A/B. */
  function sides(game, ev) {
    const aIsHome = teamMatches(game.a.key, ev.home) || (!teamMatches(game.a.key, ev.away) && teamMatches(game.b.key, ev.away));
    return aIsHome ? { A: ev.home, B: ev.away } : { A: ev.away, B: ev.home };
  }

  /**
   * Live status of a game against the spread.
   * Returns { state, scoreA, scoreB, margin (A minus B minus spread), covering: 'A'|'B'|null, final }
   */
  function evaluate(game, ev) {
    if (!ev) {
      if (game.sheetResult) return { state: 'post', final: true, scoreA: game.sheetScoreA, scoreB: game.sheetScoreB, covering: game.sheetResult, margin: null };
      return { state: 'pre', final: false, scoreA: null, scoreB: null, covering: null, margin: null };
    }
    const s = sides(game, ev);
    const scoreA = s.A.score, scoreB = s.B.score;
    if (ev.state === 'pre') return { state: 'pre', final: false, scoreA, scoreB, covering: null, margin: null, sides: s };
    const margin = (scoreA - scoreB) - game.spread;   // > 0 favorite covering
    const covering = margin > 0 ? 'A' : (margin < 0 ? 'B' : null);
    return { state: ev.state, final: ev.state === 'post', scoreA, scoreB, margin, covering, sides: s };
  }

  return { parseWorkbook, flattenEvents, matchEvent, evaluate, sides, norm, cleanName };
});
