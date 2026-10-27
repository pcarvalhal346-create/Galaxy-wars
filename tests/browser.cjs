const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const fs=require('node:fs'),artifactDir=process.env.ARTIFACT_DIR||'/tmp/galaxia-browser';fs.mkdirSync(artifactDir,{recursive:true});
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3,acceptDownloads:true});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url=process.env.GAME_URL||'http://127.0.0.1:8000/Galaxy-wars/';
 await page.goto(new URL('/',url).href);await page.evaluate(()=>caches.open('unrelated-project-cache'));
 await page.goto(url);await page.waitForSelector('[data-nav="galaxy"]');
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const meta=await page.evaluate(async()=>{
  const m=await (await fetch('./manifest.webmanifest')).json();
  const icons=await Promise.all(m.icons.map(async i=>{const b=await createImageBitmap(await(await fetch(i.src)).blob());return [b.width,b.height];}));
  await caches.open('unrelated-project-cache');
  return {manifest:m,icons,caches:await caches.keys()};
 });
 assert.equal(meta.manifest.start_url,'./');assert.equal(meta.manifest.scope,'./');assert.deepEqual(meta.icons,[[192,192],[512,512]]);
 await page.locator('[data-nav="buildings"]').click();await page.locator('[data-action="build:metal"]').click();
 await page.locator('[data-nav="galaxy"]').click();assert.equal(await page.locator('.galaxy-table tbody tr').count(),20);
 await page.locator('[data-action="spy:1"]').click();await page.locator('[data-action="send"]').click();
 await page.waitForFunction(()=>document.getElementById('save-indicator').textContent.includes('Guardado'));
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('galaxia-save')).game);
 // Close and reopen with an elapsed clock, without any network.
 await context.setOffline(true);await page.close();
 const resumed=await context.newPage();resumed.on('pageerror',e=>errors.push(e.message));
 await resumed.clock.install({time:Date.now()+3*3600000});
 await resumed.goto(url+'?offline=1');await resumed.waitForSelector('[data-nav="overview"]');
 await resumed.waitForFunction(()=>document.getElementById('save-indicator').textContent.includes('Guardado'));
 const after=await resumed.evaluate(()=>JSON.parse(localStorage.getItem('galaxia-save')).game);
 assert.equal(after.player.buildings.metal,4);assert.equal(after.player.queues.building,null);
 assert.equal(after.player.ships.probe,before.player.ships.probe+1);assert.equal(after.fleets.filter(f=>f.owner==='player').length,0);
 assert.ok(after.player.resources.metal>before.player.resources.metal);assert.ok(after.bots.every(b=>b.actions>=6));
 for(const view of ['overview','buildings','research','shipyard','galaxy','fleets','reports','settings']){
  await resumed.locator(`[data-nav="${view}"]`).click();
  assert.ok(await resumed.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow: ${view}`);
 }
 await resumed.screenshot({path:`${artifactDir}/iphone-settings.png`,fullPage:true});
 await resumed.locator('[data-nav="galaxy"]').click();await resumed.screenshot({path:`${artifactDir}/iphone-galaxy.png`,fullPage:true});
 await resumed.locator('[data-nav="settings"]').click();
 const downloaded=resumed.waitForEvent('download');await resumed.locator('[data-action="export"]').click();
 await (await downloaded).saveAs(`${artifactDir}/export.json`);
 const exported=JSON.parse(fs.readFileSync(`${artifactDir}/export.json`));assert.equal(exported.player.buildings.metal,4);
 exported.player.planetName='Importação preservada';fs.writeFileSync(`${artifactDir}/import.json`,JSON.stringify(exported));
 resumed.on('dialog',d=>d.accept());
 await resumed.locator('#import-file').setInputFiles(`${artifactDir}/import.json`);
 await resumed.waitForFunction(()=>JSON.parse(localStorage.getItem('galaxia-save')).game.player.planetName==='Importação preservada');
 await resumed.reload();await resumed.waitForSelector('.hero h2');assert.equal(await resumed.locator('.hero h2').textContent(),'Importação preservada');
 assert.ok((await resumed.evaluate(()=>caches.keys())).includes('unrelated-project-cache'));
 // A malformed import leaves the current game untouched.
 fs.writeFileSync(`${artifactDir}/invalid.json`,'{"version":1}');
 await resumed.locator('#import-file').setInputFiles(`${artifactDir}/invalid.json`);await resumed.waitForFunction(()=>document.getElementById('toast').textContent.includes('não é um jogo válido'));
 assert.equal(await resumed.locator('.hero h2').textContent(),'Importação preservada');
 for(const width of [320,375,430,844]){await resumed.setViewportSize({width,height:width===844?390:844});assert.ok(await resumed.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`viewport ${width}`);}
 assert.deepEqual(errors,[]);
 console.log('PASS: subpath PWA, manifest/icons, offline close/reopen, mines/queues/bots/fleet, 8 views, export/import/reload, invalid import, cache isolation, widths 320/375/390/430/844.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
