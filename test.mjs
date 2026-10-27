import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,advance,startQueue,sendFleet,prices,production,fastForward,validateSave,storageCapacity} from './engine.mjs';
const M=60_000,H=60*M;
test('universo criado com 20 bots em posições únicas e save válido',()=>{
 const s=createGame(1_000_000);assert.equal(s.bots.length,20);assert.equal(new Set(s.bots.map(b=>`${b.galaxy}:${b.system}:${b.position}`)).size,20);assert.equal(validateSave(s),true);
});
test('produção de recursos ao longo de uma hora e capacidade máxima',()=>{
 const s=createGame(1_000_000),start=s.player.resources.metal,rate=production(s.player.buildings).metal;
 advance(s,1_000_000+H);assert.ok(s.player.resources.metal>=start+rate-.01);assert.ok(s.player.resources.metal<=storageCapacity(1));
});
test('fila de edifícios debita recursos e conclui mais tarde',()=>{
 const s=createGame(1_000_000),before=s.player.resources.metal;
 const res=startQueue(s,'building','metal');assert.equal(res.ok,true);assert.ok(s.player.resources.metal<before);
 const finish=s.player.queues.building.endAt;advance(s,finish-1);assert.equal(s.player.buildings.metal,3);
 advance(s,finish+1);assert.equal(s.player.buildings.metal,4);assert.equal(s.player.queues.building,null);
});
test('restrições impedem gastar naves inexistentes e criar novas filas em paralelo',()=>{
 const s=createGame(1_000_000);assert.equal(startQueue(s,'building','solar').ok,true);assert.equal(startQueue(s,'building','metal').ok,false);
 assert.equal(sendFleet(s,1,{lightFighter:30}).ok,false);
});
test('espionagem gera relatório, regresso da sonda e desaparecimento da missão',()=>{
 const s=createGame(1_000_000),starting=s.player.ships.probe;
 assert.equal(sendFleet(s,1,{probe:1},'spy').ok,true);assert.equal(s.player.ships.probe,starting-1);
 advance(s,1_000_000+H);assert.equal(s.player.ships.probe,starting);assert.equal(s.fleets.length,0);assert.ok(s.reports.some(x=>x.title==='Relatório de espionagem'));
});
test('ataque produz relatório e não deixa contagens negativas',()=>{
 const s=createGame(1_000_000),res=sendFleet(s,1,{lightFighter:3,smallCargo:1},'attack');assert.equal(res.ok,true);
 advance(s,1_000_000+H);assert.ok(s.reports.some(x=>x.title.includes('combate')||x.title==='Ataque repelido'));
 assert.ok(Object.values(s.player.ships).every(v=>v>=0));assert.ok(s.fleets.length===0);
});
test('bots evoluem sozinhos e avanço rápido mantém save válido',()=>{
 const s=createGame(Date.now()),n=s.bots[0].actions;
 fastForward(s,3);assert.ok(s.bots[0].actions>n);assert.equal(validateSave(JSON.parse(JSON.stringify(s))),true);
});
test('não permite pesquisas sem laboratório e capacidades acima de zero',()=>{
 const s=createGame(1_000_000);s.player.buildings.lab=0;
 assert.equal(startQueue(s,'research','weapons').ok,false);assert.ok(storageCapacity(0)>0);
});

test('reabrir após 48 horas equivale à simulação contínua, incluindo filas e frotas',()=>{
 const start=1_000_000,s=createGame(start);
 assert.equal(startQueue(s,'building','metal').ok,true);
 assert.equal(startQueue(s,'research','weapons').ok,true);
 assert.equal(startQueue(s,'ship','probe',2).ok,true);
 assert.equal(sendFleet(s,1,{probe:1},'spy').ok,true);
 const resumed=JSON.parse(JSON.stringify(s));
 for(let t=start+M;t<=start+48*H;t+=M)advance(s,t);
 advance(resumed,start+48*H);
 // Accumulating per minute introduces floating point differences below a resource fraction.
 const normalized=structuredClone(s),actual=structuredClone(resumed);
 for(const [a,b] of [[actual.player,normalized.player],...actual.bots.map((b,i)=>[b,normalized.bots[i]])]){
  for(const k of Object.keys(a.resources)){assert.ok(Math.abs(a.resources[k]-b.resources[k])<1e-6);a.resources[k]=b.resources[k];}
 }
 assert.deepEqual(actual,normalized);
 assert.equal(s.player.buildings.metal,4);assert.equal(s.player.tech.weapons,1);
 assert.ok(s.reports.some(r=>r.title==='Produção concluída'&&r.text.includes('Sonda de Espionagem ×2')));assert.equal(s.fleets.filter(f=>f.owner==='player').length,0);
 assert.ok(s.bots.every(b=>b.actions===96));assert.equal(validateSave(s),true);
});

test('produção muda no instante da conclusão da mina, sem aplicar o nível retroativamente',()=>{
 const start=1_000_000,s=createGame(start);startQueue(s,'building','metal');
 const end=s.player.queues.building.endAt,initial=s.player.resources.metal,old=production(s.player.buildings).metal;
 const upgraded=production({...s.player.buildings,metal:4}).metal;
 advance(s,end+H);
 assert.ok(Math.abs(s.player.resources.metal-(initial+old*(end-start)/H+upgraded))<1e-7);
});

test('saves danificados são rejeitados antes de substituir o universo',()=>{
 const corruptions=[s=>s.player.resources.metal=-1,s=>s.player.buildings.metal=Infinity,
  s=>s.lastSimulated=NaN,s=>s.offsetMs='1',s=>delete s.player.queues.hangar,
  s=>s.player.queues.building={category:'building',key:'__proto__',qty:1,endAt:4},
  s=>delete s.bots[0].ships,s=>s.bots[1].id=s.bots[0].id,
  s=>s.bots.pop(),s=>s.fleets.push({}),s=>s.reports[0].text=null];
 for(const corrupt of corruptions){const s=createGame(1_000_000);corrupt(s);assert.equal(validateSave(s),false);}
 assert.equal(validateSave(null),false);
});

test('relógio recuado e destino infinito não alteram a simulação',()=>{
 const s=createGame(1_000_000),before=structuredClone(s);
 advance(s,900_000);advance(s,Infinity);assert.deepEqual(s,before);
});

test('avanço rápido respeita um save com relógio futuro',()=>{
 const s=createGame(Date.now()+2*H),before=s.lastSimulated;
 fastForward(s,1);assert.equal(s.lastSimulated,before+H);
});

import {createStorage} from './storage.mjs';
const memoryStorage=()=>{let value=null;return {getItem:()=>value,setItem:(_,v)=>{value=v;}};};
test('fallback local é imediato, sobrevive a reabertura e aceita saves antigos',async()=>{
 const local=memoryStorage(),s=createGame(1_000_000);
 local.setItem('galaxia-save',JSON.stringify(s));
 const store=createStorage({localStorage:local});assert.deepEqual(await store.load(),s);
 s.player.planetName='Planeta preservado';const saved=store.save(s);
 assert.equal(JSON.parse(local.getItem()).game.player.planetName,'Planeta preservado');
 await saved;assert.deepEqual(await createStorage({localStorage:local}).load(),s);
});
test('falha dos dois armazenamentos é reportada, sem falso sucesso',async()=>{
 const store=createStorage({localStorage:{setItem(){throw Error('quota');}}});
 await store.load();await assert.rejects(store.save(createGame(1_000_000)));
});
test('save local inválido não é carregado',async()=>{
 const local=memoryStorage();local.setItem('galaxia-save','{"version":1}');
 assert.equal(await createStorage({localStorage:local}).load(),null);
});

test('recursos saqueados acima da capacidade não desaparecem com o tempo',()=>{
 const s=createGame(1_000_000);s.player.resources.metal=storageCapacity(1)+500;
 advance(s,1_000_000+M);assert.equal(s.player.resources.metal,storageCapacity(1)+500);
});

function fakeIndexedDB(initial,{failWrite=false}={}){
 let stored=initial;
 const db={transaction(){const tx={objectStore(){return {
  get(){const req={};queueMicrotask(()=>req.onsuccess?.({}));Object.defineProperty(req,'result',{get:()=>stored});return req;},
  put(value){queueMicrotask(()=>{if(failWrite){tx.error=Error('quota IDB');tx.onabort?.();}else{stored=value;tx.oncomplete?.();}});}
 };}};return tx;}};
 return {open(){const req={result:db};queueMicrotask(()=>req.onsuccess?.());return req;}};
}
test('fallback mais recente prevalece sobre IndexedDB antigo após falha de escrita',async()=>{
 const old=createGame(1_000_000),newer=structuredClone(old);newer.player.planetName='Novo universo';
 const local=memoryStorage(),idb=fakeIndexedDB({savedAt:1,game:old},{failWrite:true});
 const store=createStorage({indexedDB:idb,localStorage:local});assert.deepEqual(await store.load(),old);
 await store.save(newer);
 const reopened=createStorage({indexedDB:idb,localStorage:local});assert.deepEqual(await reopened.load(),newer);
});
test('IndexedDB válido recupera gravação mesmo sem localStorage',async()=>{
 const s=createGame(1_000_000),idb=fakeIndexedDB(s),store=createStorage({indexedDB:idb});
 assert.deepEqual(await store.load(),s);s.player.planetName='Só IndexedDB';await store.save(s);
 assert.deepEqual(await createStorage({indexedDB:idb}).load(),s);
});
test('IndexedDB inválido não esconde cópia local válida',async()=>{
 const s=createGame(1_000_000),local=memoryStorage();local.setItem('galaxia-save',JSON.stringify(s));
 assert.deepEqual(await createStorage({indexedDB:fakeIndexedDB({version:1}),localStorage:local}).load(),s);
});
