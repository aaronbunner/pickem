const { chromium, devices } = require('playwright'); const fs=require('fs'); const path=require('path'); const http=require('http');
const root='/home/claude/pickem';
const srv=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p);
 if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('nf');}
 const ext=path.extname(f); res.writeHead(200,{'content-type':{'.html':'text/html','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml'}[ext]||'text/plain'}); fs.createReadStream(f).pipe(res);});
(async()=>{ await new Promise(r=>srv.listen(8765,r));
 const b=await chromium.launch(); const ctx=await b.newContext({...devices['iPhone 13'], timezoneId:'America/Chicago'});
 await ctx.route(/site\.api\.espn\.com/, r=>r.fulfill({status:200,contentType:'application/json',body:fs.readFileSync('test/espn_fixture.json','utf8')}));
 const page=await ctx.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await page.goto('http://localhost:8765/'+(process.argv[2]||'')); await page.waitForTimeout(800);
 await page.screenshot({path:'test/s0_picker.png'});
 if(!(process.argv[2]||'').includes('admin')){
 await page.click('text=Aaron B'); await page.waitForTimeout(800);
 await page.screenshot({path:'test/s1_picks.png',fullPage:false});
 await page.click('nav >> text=Leaders'); await page.waitForTimeout(300); await page.screenshot({path:'test/s2_board.png',fullPage:false});
 await page.click('nav >> text=1 v 1'); await page.waitForTimeout(300); await page.screenshot({path:'test/s3_h2h.png',fullPage:false});
 console.log(await page.evaluate(()=>document.querySelector('#statusText').textContent));
 }
 console.log('errors:',errs); await b.close(); srv.close();})();
