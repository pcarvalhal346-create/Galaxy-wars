// Galáxia Clássica Offline — motor de jogo original, inteiramente local.
export const VERSION = 1;
export const BOT_INTERVAL = 30 * 60 * 1000;
const HOUR = 3600_000;
const MINUTE = 60_000;

export const BUILDINGS = {
  metal: {name:'Mina de Metal',desc:'Extrai metal para estruturas e naves.',icon:'⛏',cost:{metal:60,crystal:15,deuterium:0},mult:1.5},
  crystal: {name:'Mina de Cristal',desc:'Produz cristal para tecnologia e frota.',icon:'◈',cost:{metal:48,crystal:24,deuterium:0},mult:1.6},
  deuterium: {name:'Sintetizador de Deutério',desc:'Produz combustível para as frotas.',icon:'◉',cost:{metal:225,crystal:75,deuterium:0},mult:1.5},
  solar: {name:'Central Solar',desc:'Fornece energia às minas.',icon:'☀',cost:{metal:75,crystal:30,deuterium:0},mult:1.5},
  robotics: {name:'Fábrica de Robôs',desc:'Acelera a construção de edifícios.',icon:'⚙',cost:{metal:400,crystal:120,deuterium:200},mult:2},
  shipyard: {name:'Hangar',desc:'Permite construir naves e defesas.',icon:'✈',cost:{metal:400,crystal:200,deuterium:100},mult:2},
  lab: {name:'Laboratório de Pesquisa',desc:'Desbloqueia e acelera tecnologias.',icon:'⌬',cost:{metal:200,crystal:400,deuterium:200},mult:2},
  storage: {name:'Armazéns',desc:'Aumentam a capacidade de recursos.',icon:'▣',cost:{metal:300,crystal:150,deuterium:0},mult:2},
};
export const TECH = {
  energy: {name:'Tecnologia de Energia',desc:'Fundamentos de geração e conversão.',icon:'⚡',cost:{metal:0,crystal:800,deuterium:400},mult:2},
  combustion: {name:'Motor de Combustão',desc:'Propulsão das naves ligeiras.',icon:'⟲',cost:{metal:400,crystal:0,deuterium:600},mult:2},
  espionage: {name:'Espionagem',desc:'Reconhecimento dos impérios inimigos.',icon:'◎',cost:{metal:200,crystal:1000,deuterium:200},mult:2},
  weapons: {name:'Tecnologia de Armas',desc:'+10% ao ataque por nível.',icon:'✦',cost:{metal:800,crystal:200,deuterium:0},mult:2},
  armor: {name:'Tecnologia de Blindagem',desc:'+10% à resistência das naves.',icon:'⬡',cost:{metal:1000,crystal:0,deuterium:0},mult:2},
  computer: {name:'Tecnologia de Computadores',desc:'Mais capacidade de comando de frotas.',icon:'▤',cost:{metal:0,crystal:400,deuterium:600},mult:2},
};
export const UNITS = {
  smallCargo: {name:'Cargueiro Pequeno',desc:'Transporte rápido de recursos.',icon:'◇',cost:{metal:2000,crystal:2000,deuterium:0},attack:5,capacity:5000,needs:{shipyard:1}},
  lightFighter: {name:'Caça Ligeiro',desc:'Nave de combate económica.',icon:'➤',cost:{metal:3000,crystal:1000,deuterium:0},attack:50,capacity:50,needs:{shipyard:1}},
  heavyFighter: {name:'Caça Pesado',desc:'Mais robusto e poderoso.',icon:'◢',cost:{metal:6000,crystal:4000,deuterium:0},attack:150,capacity:100,needs:{shipyard:2}},
  cruiser: {name:'Cruzador',desc:'Ideal contra forças ligeiras.',icon:'✧',cost:{metal:20000,crystal:7000,deuterium:2000},attack:400,capacity:800,needs:{shipyard:3}},
  battleship: {name:'Nave de Batalha',desc:'Grande poder de ataque.',icon:'◆',cost:{metal:45000,crystal:15000,deuterium:0},attack:1000,capacity:1500,needs:{shipyard:4}},
  probe: {name:'Sonda de Espionagem',desc:'Informação sobre planetas rivais.',icon:'◌',cost:{metal:0,crystal:1000,deuterium:0},attack:0,capacity:0,needs:{shipyard:1}},
};
export const DEFENSE = {
  rocket: {name:'Lançador de Mísseis',desc:'Defesa básica contra ataques.',icon:'⌁',cost:{metal:2000,crystal:0,deuterium:0},attack:80,needs:{shipyard:1}},
  laser: {name:'Laser Ligeiro',desc:'Canhão planetário reforçado.',icon:'☄',cost:{metal:1500,crystal:500,deuterium:0},attack:140,needs:{shipyard:2}},
};
export const RESOURCE_NAMES = {metal:'Metal',crystal:'Cristal',deuterium:'Deutério'};
const botNames = ['Órion','Draco','Aquila','Fénix','Vega','Andrómeda','Titã','Ícaro','Atlas','Lira','Cérbero','Ares','Nova','Némesis','Hydra','Perseu','Sentinela','Centauro','Érebo','Ragnar'];
const botStyles = ['Mineiro','Agressivo','Defensivo','Equilibrado'];
const blank = () => ({metal:0,crystal:0,deuterium:0});
const clone = x => JSON.parse(JSON.stringify(x));
const safe = n => Number.isFinite(n)?n:0;
const rnum = (s) => { s.rng = (Math.imul(1664525, (s.rng >>> 0)) + 1013904223) >>> 0;return s.rng/4294967296; };
const roll = (s,a,b) => a + Math.floor(rnum(s)*(b-a+1));
const log = (s,title,text,type='info',at=s.lastSimulated) => {s.reports.unshift({id:++s.seq,at,title,text,type});s.reports=s.reports.slice(0,100)};

export function createGame(now=Date.now()) {
  const bots = botNames.map((name,i)=>{
    const style=botStyles[i%4],tier=i%5;
    return {id:i+1,name:`Império ${name}`,style,galaxy:1,system:2+Math.floor(i/5)*6+(i%5),position:3+(i*3)%12,
      resources:{metal:1800+tier*350,crystal:1100+tier*250,deuterium:550+tier*120},
      buildings:{metal:2+tier,crystal:1+tier, deuterium:1+Math.floor(tier/2),solar:3+tier},
      tech:{weapons:Math.floor(tier/2),armor:0},
      ships:{smallCargo:1+tier,lightFighter:2+tier*2,heavyFighter:0,cruiser:0,battleship:0,probe:1},
      defense:{rocket:tier,laser:0},actions:0
    };
  });
  return {version:VERSION,seq:0,rng:8327611,lastSimulated:now,botTickAt:now+BOT_INTERVAL,createdAt:now,offsetMs:0,
    player:{name:'Comandante',galaxy:1,system:1,position:1,planetName:'Nova Terra',
      resources:{metal:7000,crystal:5200,deuterium:1800},
      buildings:{metal:3,crystal:2,deuterium:1,solar:5,robotics:0,shipyard:1,lab:1,storage:1},
      tech:{energy:0,combustion:1,espionage:1,weapons:0,armor:0,computer:0},
      ships:{smallCargo:3,lightFighter:4,heavyFighter:0,cruiser:0,battleship:0,probe:2},
      defense:{rocket:0,laser:0},queues:{building:null,research:null,hangar:null}},
    bots,fleets:[],reports:[{id:0,at:now,title:'Bem-vindo, Comandante',text:'O teu planeta está pronto. Desenvolve as minas, explora a galáxia e enfrenta 20 impérios autónomos. O progresso é guardado neste dispositivo.',type:'good'}]
  };
}
export function expense(base,mult,level) {return Object.fromEntries(Object.keys(RESOURCE_NAMES).map(k=>[k,Math.ceil((base[k]||0)*Math.pow(mult,level))]));}
export function prices(cat,key,level=0,qty=1) {const d=cat==='building'?BUILDINGS[key]:cat==='tech'?TECH[key]:cat==='ship'?UNITS[key]:DEFENSE[key];if(!d)return blank();let x=(cat==='building'||cat==='tech')?expense(d.cost,d.mult,level):d.cost;return Object.fromEntries(Object.keys(RESOURCE_NAMES).map(k=>[k,(x[k]||0)*qty]));}
export function affordable(res,cost) {return Object.keys(RESOURCE_NAMES).every(k=>safe(res[k]) + 1e-7 >= (cost[k]||0));}
const pay = (res,cost) => { for(const k of Object.keys(RESOURCE_NAMES)) res[k]=Math.max(0,res[k]-(cost[k]||0)); };
export function storageCapacity(level=0){return Math.floor(30000*Math.pow(1.65,level));}
export function production(buildings) {
  const m=buildings.metal||0,c=buildings.crystal||0,d=buildings.deuterium||0,sl=buildings.solar||0;
  const supplied=20*sl*Math.pow(1.1,sl)+15;
  const required=10*m*Math.pow(1.1,m)+10*c*Math.pow(1.1,c)+20*d*Math.pow(1.1,d);
  const ratio=required>0?Math.min(1,supplied/required):1;
  return {metal:(40+30*m*Math.pow(1.1,m))*ratio,crystal:(20+20*c*Math.pow(1.1,c))*ratio,deuterium:10*d*Math.pow(1.1,d)*ratio,
    energyProduced:Math.round(supplied),energyUsed:Math.round(required),energyRatio:ratio};
}
const accrue = (s, delta) => {
  if(delta<=0)return;const hours=delta/HOUR,p=s.player,prod=production(p.buildings),cap=storageCapacity(p.buildings.storage);
  for(const k of Object.keys(RESOURCE_NAMES))p.resources[k]=Math.max(p.resources[k],Math.min(cap,p.resources[k]+prod[k]*hours));
  for(const b of s.bots){const bProd=production(b.buildings);for(const k of Object.keys(RESOURCE_NAMES))b.resources[k]=Math.min(2000000,b.resources[k]+bProd[k]*hours);}
};
export function queueDuration(category,cost,s){
  const base = Math.max(25000,((cost.metal||0)+(cost.crystal||0)+(cost.deuterium||0)*0.5) * (category==='building'?380:category==='research'?260:210));
  const factor=category==='building'?(1+(s.player.buildings.robotics||0)):category==='research'?(1+(s.player.buildings.lab||0)):1+(s.player.buildings.shipyard||0);
  return Math.max(20000,Math.min(7*24*HOUR,Math.round(base/factor)));
}
export function startQueue(s,category,key,qty=1){
  const p=s.player;
  let dict,queue,level=0;
  if(category==='building'){dict=BUILDINGS;queue='building';level=p.buildings[key]||0;}
  else if(category==='research'){dict=TECH;queue='research';level=p.tech[key]||0;if((p.buildings.lab||0)<1)return {ok:false,message:'Constrói primeiro um laboratório.'};}
  else if(category==='ship'||category==='defense'){dict=category==='ship'?UNITS:DEFENSE;queue='hangar';if((p.buildings.shipyard||0)<1)return {ok:false,message:'Precisas de um hangar.'};}
  else return {ok:false,message:'Ação desconhecida.'};
  if(!dict[key])return {ok:false,message:'Item desconhecido.'};
  if(p.queues[queue])return {ok:false,message:'Já existe uma tarefa nesta fila.'};
  if(!Number.isInteger(qty)||qty<1||qty>100)return {ok:false,message:'Quantidade inválida (1–100).'};
  if(category==='building'||category==='research')qty=1;
  if(dict[key].needs && Object.entries(dict[key].needs).some(([need,lvl])=>(p.buildings[need]||0)<lvl))return {ok:false,message:`É necessário hangar nível ${dict[key].needs.shipyard}.`};
  const cost=prices(category==='research'?'tech':category,key,level,qty);
  if(!affordable(p.resources,cost))return {ok:false,message:'Recursos insuficientes.'};
  pay(p.resources,cost);
  p.queues[queue]={category,key,qty,endAt:s.lastSimulated+queueDuration(category,cost,s),startedAt:s.lastSimulated};
  log(s,'Ordem registada',`${dict[key].name}${qty>1?' ×'+qty:''} entrou na fila de ${queue==='building'?'construção':queue==='research'?'pesquisa':'produção'}.`,'info');
  return {ok:true,message:'Produção iniciada.'};
}
function finishQueue(s,queue){const p=s.player,q=p.queues[queue];if(!q)return;
  if(q.category==='building')p.buildings[q.key]=(p.buildings[q.key]||0)+1;
  else if(q.category==='research')p.tech[q.key]=(p.tech[q.key]||0)+1;
  else if(q.category==='ship')p.ships[q.key]=(p.ships[q.key]||0)+q.qty;
  else p.defense[q.key]=(p.defense[q.key]||0)+q.qty;
  const cat=q.category==='building'?BUILDINGS:q.category==='research'?TECH:q.category==='ship'?UNITS:DEFENSE;
  log(s,'Produção concluída',`${cat[q.key].name}${q.qty>1?' ×'+q.qty:''} concluído.`,'good');p.queues[queue]=null;
}
const fleetPower=(ships,tech={}) => Object.entries(ships).reduce((v,[k,n])=>v+(UNITS[k]?.attack||0)*n,0)*(1+0.1*(tech.weapons||0));
const defensePower=(def)=>Object.entries(def).reduce((v,[k,n])=>v+(DEFENSE[k]?.attack||0)*n,0);
const fleetCapacity=(ships)=>Object.entries(ships).reduce((v,[k,n])=>v+(UNITS[k]?.capacity||0)*n,0);
const shipCount=ships=>Object.values(ships).reduce((a,b)=>a+b,0);
const lossShips=(s,ships,fraction)=>{const survivors={};for(const [k,n] of Object.entries(ships)){const lost=Math.min(n,Math.floor(n*fraction+(rnum(s)<(n*fraction%1)?1:0)));survivors[k]=n-lost;}return survivors;};
const addShips=(dest,ships)=>{for(const [k,v] of Object.entries(ships))dest[k]=(dest[k]||0)+v;};
const applyLoot=(resources,capacity)=>{const total=Object.values(resources).reduce((a,b)=>a+b,0);const steal=Math.min(total*0.5,capacity);if(steal<=0)return blank();const out=blank();let remaining=steal;for(const k of Object.keys(RESOURCE_NAMES)){out[k]=Math.min(resources[k],steal*(resources[k]/Math.max(total,1)),remaining);resources[k]-=out[k];remaining-=out[k];}return out;};
export function coords(x){return `[${x.galaxy}:${x.system}:${x.position}]`}
function fleetTravelMs(bot){return Math.round((55+(bot.system||1)*2)*1000)};
export function sendFleet(s,botId,ships,mission='attack') {
  const target=s.bots.find(b=>b.id===Number(botId)); if(!target)return {ok:false,message:'Destino inválido.'};
  if(!['attack','spy'].includes(mission))return {ok:false,message:'Missão inválida.'};
  if(s.fleets.filter(f=>f.owner==='player').length>=Math.min(8,2+(s.player.tech.computer||0)))return {ok:false,message:'Sem posições de frota disponíveis.'};
  const clean={};let count=0;for(const k of Object.keys(UNITS)){
    let n=Number(ships[k]||0);if(!Number.isInteger(n)||n<0||n>100000)return {ok:false,message:'Quantidade inválida.'};
    if(n>(s.player.ships[k]||0))return {ok:false,message:'Não tens naves suficientes.'};clean[k]=n;count+=n;
  }
  if(mission==='spy'){if(clean.probe<1||count!==clean.probe)return {ok:false,message:'Para espionagem, envia apenas sondas.'};}
  else if(!count||fleetPower(clean,s.player.tech)<=0)return {ok:false,message:'Seleciona naves de combate.'};
  const fuel=Math.max(1,Math.ceil((count+1)*(target.system+5)/5));
  if(s.player.resources.deuterium<fuel)return {ok:false,message:'Deutério insuficiente para o voo.'};
  s.player.resources.deuterium-=fuel;for(const [k,n]of Object.entries(clean))s.player.ships[k]-=n;
  const eta=fleetTravelMs(target),fleet={id:++s.seq,owner:'player',botId:target.id,mission,phase:'outbound',ships:clean,cargo:blank(),travelMs:eta,arrivesAt:s.lastSimulated+eta};
  s.fleets.push(fleet);log(s,'Frota lançada',`${mission==='spy'?'Espionagem':'Ataque'} rumo a ${target.name} ${coords(target)}.`, 'info');
  return {ok:true,message:'Frota enviada.'};
}
function launchBotAttack(s,b){
  const ships={smallCargo:Math.min(2,b.ships.smallCargo||0),lightFighter:Math.min(4,b.ships.lightFighter||0),heavyFighter:Math.min(2,b.ships.heavyFighter||0)};
  if(fleetPower(ships)<100)return;
  for(const [k,n]of Object.entries(ships))b.ships[k]-=n;
  const eta=fleetTravelMs(b);
  s.fleets.push({id:++s.seq,owner:'bot',botId:b.id,mission:'attack',phase:'outbound',ships,cargo:blank(),travelMs:eta,arrivesAt:s.lastSimulated+eta});
  log(s,'Ataque detetado!',`${b.name} enviou uma frota em direção a ${s.player.planetName}.`,'danger');
}
function settleBattle(s,f) {
  const b=s.bots.find(x=>x.id===f.botId);if(!b)return;
  const playerAttack=f.owner==='player';const atkTech=playerAttack?s.player.tech:b.tech;
  const defShips=playerAttack?b.ships:s.player.ships;const defDefense=playerAttack?b.defense:s.player.defense;const defRes=playerAttack?b.resources:s.player.resources;
  const defTech=playerAttack?b.tech:s.player.tech;
  const attack=fleetPower(f.ships,atkTech);const defense=(fleetPower(defShips,defTech)+defensePower(defDefense))*(1+0.1*(defTech.armor||0));
  const wins=attack>defense*(0.75+rnum(s)*0.4);let loot=blank();
  if(wins){
    f.ships=lossShips(s,f.ships,Math.min(0.65,defense/Math.max(1,attack)*0.35));
    const loss=lossShips(s,defShips,Math.min(1,0.65+attack/Math.max(defense,1)*0.15));for(const k of Object.keys(defShips))defShips[k]=loss[k]||0;
    const remain=lossShips(s,defDefense,0.25);for(const k of Object.keys(defDefense))defDefense[k]=remain[k]||0;
    loot=applyLoot(defRes,fleetCapacity(f.ships));f.cargo=loot;
  }else{
    f.ships=lossShips(s,f.ships,Math.min(1,0.85+defense/Math.max(attack,1)*0.2));
    const loss=lossShips(s,defShips,Math.min(.4,attack/Math.max(defense,1)*0.2));for(const k of Object.keys(defShips))defShips[k]=loss[k]||0;
  }
  const attacker=playerAttack?'A tua frota':b.name;
  const totalLoot=Object.values(loot).reduce((a,v)=>a+v,0);
  log(s,wins?(playerAttack?'Vitória em combate':'Planeta atacado!'):(playerAttack?'Ataque repelido':'Defesa bem-sucedida'),
    `${attacker} ${wins?'venceu':'perdeu'} o combate em ${playerAttack?b.name:s.player.planetName}. ${Math.round(totalLoot).toLocaleString('pt-PT')} recursos saqueados.`,
    (wins===playerAttack)?'good':'danger');
}
function resolveFleet(s,f){const b=s.bots.find(x=>x.id===f.botId);if(!b){s.fleets=s.fleets.filter(x=>x!==f);return;}
  if(f.phase==='outbound'){
    if(f.mission==='spy'){
      log(s,'Relatório de espionagem',`${b.name} ${coords(b)} · Metal ${Math.floor(b.resources.metal)} · Cristal ${Math.floor(b.resources.crystal)} · Deutério ${Math.floor(b.resources.deuterium)} · Poder de frota ${Math.round(fleetPower(b.ships,b.tech))} · Defesas ${Math.round(defensePower(b.defense))}.`,'info');
    }else settleBattle(s,f);
    f.phase='returning';f.arrivesAt=s.lastSimulated+f.travelMs;
  } else {
    const home=f.owner==='player'?s.player:b;
    addShips(home.ships,f.ships);
    for(const k of Object.keys(RESOURCE_NAMES))home.resources[k]+=f.cargo[k]||0;
    if(f.owner==='player')log(s,'Frota regressou',`Frota de ${b.name} regressou ao teu planeta. Recursos entregues: ${Math.floor(Object.values(f.cargo).reduce((a,v)=>a+v,0))}.`,'good');
    s.fleets=s.fleets.filter(x=>x!==f);
  }
}
function botTurn(s){
  for(const b of s.bots){
    b.actions++;
    const n=b.actions;const primary=n%3===0?'crystal':n%5===0?'solar':'metal';
    // IA simplificada: investe na economia, depois expande frota e defesas.
    const build=BUILDINGS[primary],lvl=b.buildings[primary]||0,cost=prices('building',primary,lvl);
    if(affordable(b.resources,cost)&&lvl<22){pay(b.resources,cost);b.buildings[primary]++;}
    if(n%4===0){const unit=b.style==='Mineiro'?'smallCargo':b.style==='Agressivo'?'lightFighter':b.style==='Defensivo'?'lightFighter':'smallCargo';const price=prices('ship',unit,0,1);if(affordable(b.resources,price)){pay(b.resources,price);b.ships[unit]=(b.ships[unit]||0)+1;}}
    if(b.style==='Defensivo'&&n%6===0){const cost=prices('defense','rocket');if(affordable(b.resources,cost)){pay(b.resources,cost);b.defense.rocket=(b.defense.rocket||0)+1;}}
    if(n%20===0&&rnum(s)<0.25){b.tech.weapons=(b.tech.weapons||0)+1;}
    if(b.style==='Agressivo'&&n%12===0&&rnum(s)<0.18&&s.fleets.filter(f=>f.owner==='bot'&&f.botId===b.id).length===0)launchBotAttack(s,b);
  }
}
export function advance(s,time=Date.now()){
  const target=Number.isFinite(time)?Math.max(s.lastSimulated,time):s.lastSimulated;
  if(!Number.isFinite(s.botTickAt)||s.botTickAt<=s.lastSimulated-3*BOT_INTERVAL)s.botTickAt=s.lastSimulated+BOT_INTERVAL;
  let cycles=0;
  while(s.lastSimulated<target&&cycles++<100000){
    const pending=Object.values(s.player.queues).filter(Boolean).map(q=>q.endAt);
    const fleetTimes=s.fleets.map(f=>f.arrivesAt);
    const event=Math.min(target,s.botTickAt,...pending,...fleetTimes);
    const next=event>s.lastSimulated?event:s.lastSimulated;
    accrue(s,next-s.lastSimulated);s.lastSimulated=next;
    for(const [queue,q] of Object.entries(s.player.queues))if(q&&q.endAt<=next)finishQueue(s,queue);
    for(const f of [...s.fleets])if(f.arrivesAt<=next)resolveFleet(s,f);
    if(s.botTickAt<=next){botTurn(s);s.botTickAt+=BOT_INTERVAL;}
    if(next===target)break;
    // Prevent a malformed imported save from trapping the simulation.
    if(next===event&&event<target&&event===s.lastSimulated&&s.botTickAt<=next)break;
  }
  return s;
}
export function fastForward(s,hours=1){ if(!Number.isFinite(hours)||hours<=0||hours>168)return; const target=Math.max(s.lastSimulated,Date.now()+(s.offsetMs||0))+hours*HOUR;s.offsetMs=target-Date.now();advance(s,target); }
export function scorePlayer(s){const p=s.player;return Math.floor(Object.values(p.buildings).reduce((a,v)=>a+v*350,0)+Object.values(p.tech).reduce((a,v)=>a+v*800,0)+fleetPower(p.ships,p.tech));}
export function scoreBot(b){return Math.floor(Object.values(b.buildings).reduce((a,v)=>a+v*350,0)+fleetPower(b.ships,b.tech)+defensePower(b.defense));}
export function timeRemaining(at,now=Date.now()){const ss=Math.max(0,Math.ceil((at-now)/1000));const h=Math.floor(ss/3600),m=Math.floor((ss%3600)/60),sec=ss%60;return h?`${h}h ${String(m).padStart(2,'0')}m`:m?`${m}m ${String(sec).padStart(2,'0')}s`:`${sec}s`;}
// Imported/local saves are untrusted. Validate every field consumed by the simulation.
export function validateSave(x){
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const number=v=>Number.isFinite(v)&&v>=0&&v<=Number.MAX_SAFE_INTEGER;
  const integer=v=>number(v)&&Number.isInteger(v);
  const text=v=>typeof v==='string'&&v.length<=10000;
  const counts=(v,keys,level=false)=>object(v)&&Object.keys(v).every(k=>keys.includes(k))&&
    keys.every(k=>integer(v[k])&&(!level||v[k]<=1000));
  const resources=v=>object(v)&&Object.keys(RESOURCE_NAMES).every(k=>number(v[k]));
  const location=v=>['galaxy','system','position'].every(k=>integer(v[k])&&v[k]>0);
  if(!object(x)||x.version!==VERSION||!integer(x.seq)||!integer(x.rng)||
    !number(x.lastSimulated)||!number(x.createdAt)||!number(x.botTickAt)||
    !number(x.offsetMs)||!Array.isArray(x.bots)||x.bots.length!==20||
    !Array.isArray(x.fleets)||x.fleets.length>1000||!Array.isArray(x.reports)||x.reports.length>100)return false;
  const p=x.player;
  if(!object(p)||!text(p.name)||!text(p.planetName)||!location(p)||!resources(p.resources)||
    !counts(p.buildings,Object.keys(BUILDINGS),true)||!counts(p.tech,Object.keys(TECH),true)||
    !counts(p.ships,Object.keys(UNITS))||!counts(p.defense,Object.keys(DEFENSE))||!object(p.queues))return false;
  for(const [name,categories] of Object.entries({building:['building'],research:['research'],hangar:['ship','defense']})){
    const q=p.queues[name];if(q===null)continue;
    if(!object(q)||!categories.includes(q.category)||!integer(q.qty)||q.qty<1||q.qty>100||!number(q.endAt))return false;
    const dict=q.category==='building'?BUILDINGS:q.category==='research'?TECH:q.category==='ship'?UNITS:DEFENSE;
    if(!Object.hasOwn(dict,q.key)||(['building','research'].includes(q.category)&&q.qty!==1))return false;
    if(q.startedAt!==undefined&&(!number(q.startedAt)||q.startedAt>q.endAt))return false;
  }
  const ids=new Set(),positions=new Set();
  for(const b of x.bots){
    if(!object(b)||!integer(b.id)||b.id<1||ids.has(b.id)||!text(b.name)||!botStyles.includes(b.style)||
      !location(b)||!resources(b.resources)||!counts(b.buildings,['metal','crystal','deuterium','solar'],true)||
      !counts(b.tech,['weapons','armor'])||!counts(b.ships,Object.keys(UNITS))||
      !counts(b.defense,Object.keys(DEFENSE))||!integer(b.actions))return false;
    const pos=coords(b);if(positions.has(pos)||pos===coords(p))return false;positions.add(pos);ids.add(b.id);
  }
  const fleetIds=new Set();
  for(const f of x.fleets){
    if(!object(f)||!integer(f.id)||f.id>x.seq||fleetIds.has(f.id)||!ids.has(f.botId)||
      !['player','bot'].includes(f.owner)||!['attack','spy'].includes(f.mission)||
      !['outbound','returning'].includes(f.phase)||!object(f.ships)||
      !Object.entries(f.ships).every(([k,v])=>Object.hasOwn(UNITS,k)&&integer(v))||
      !resources(f.cargo)||!number(f.arrivesAt)||!number(f.travelMs)||f.travelMs<1)return false;
    fleetIds.add(f.id);
  }
  return x.reports.every(r=>object(r)&&integer(r.id)&&r.id<=x.seq&&number(r.at)&&text(r.title)&&text(r.text)&&['info','good','danger'].includes(r.type));
}
export const internalForTests = {fleetPower,defensePower,fleetCapacity};
