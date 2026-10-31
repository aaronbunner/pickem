const XLSX = require('xlsx'); const P = require('../parser.js'); P.parseWorkbook.XLSX = XLSX;
const wb = XLSX.readFile(process.argv[2]);
const d = P.parseWorkbook(wb);
require('fs').writeFileSync(process.argv[3], JSON.stringify(d, null, 1));
console.log(d.season, d.weekNumber, d.weekLabel, d.dates, 'players', d.players.length, 'games', d.games.length, 'tb', d.tiebreakGame);
d.games.forEach(g=>console.log(g.idx, g.day, g.slot, g.a.name, g.a.home?'(H)':'', g.spread, g.b.name, g.b.home?'(H)':'', g.neutral?'N':'', g.sheetResult||''));
console.log('Aaron B picks', d.picks['Aaron B'].join(''), 'tb', d.tiebreak['Aaron B'], 'weekly', d.weekly['Aaron B'], 'cum', d.cumulative['Aaron B']);
console.log('missing picks:', d.players.filter(p=>d.picks[p].some(x=>!x)).map(p=>p+':'+d.picks[p].filter(x=>!x).length));
