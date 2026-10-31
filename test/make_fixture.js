const fs=require('fs');
const rows=fs.readFileSync('test/espn_rows.txt','utf8').trim().split('\n').map(l=>l.split('|'));
const events=rows.map(r=>({id:r[0],date:r[1],name:`${r[4]} at ${r[7]}`,shortName:`${r[5]} @ ${r[8]}`,competitions:[{neutralSite:r[10]==='N',
 status:{period:+r[11],displayClock:r[12],type:{state:r[2],shortDetail:r[3],completed:r[2]==='post'}},
 competitors:[{homeAway:'home',score:r[9],team:{id:r[8],location:r[7],abbreviation:r[8],displayName:r[7],shortDisplayName:r[7]}},
              {homeAway:'away',score:r[6],team:{id:r[5],location:r[4],abbreviation:r[5],displayName:r[4],shortDisplayName:r[4]}}]}]}));
fs.writeFileSync('test/espn_fixture.json',JSON.stringify({events}));
const P=require('../parser.js'); const d=JSON.parse(fs.readFileSync('data/picks.json'));
const ev=P.flattenEvents({events});
for(const g of d.games){const m=P.matchEvent(g,ev); const e=P.evaluate(g,m&&m.event);
 console.log(g.idx,g.a.name,'-'+g.spread,'vs',g.b.name,'=>',m?m.quality+' '+m.event.shortName:'NO MATCH', e.state, e.scoreA,e.scoreB,'margin',e.margin,'cov',e.covering);}
