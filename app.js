import {createStorage} from './storage.mjs';
import {createGame,advance,fastForward,startQueue,sendFleet,BUILDINGS,TECH,UNITS,DEFENSE,RESOURCE_NAMES,prices,affordable,production,storageCapacity,scorePlayer,scoreBot,timeRemaining,coords,validateSave,VERSION} from './engine.mjs';
const $=id=>document.getElementById(id);
const MINUTE = 60_000;
const fmt=n=>Math.floor(Number(n)||0).toLocaleString('pt-PT');
const date=ms=>new Date(ms).toLocaleString('pt-PT',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const navItems=[['overview','⌂','Visão geral'],['buildings','▥','Edifícios'],['research','⌬','Pesquisas'],['shipyard','✈','Hangar'],['galaxy','✧','Galáxia'],['fleets','⇄','Frotas'],['reports','▤','Relatórios'],['settings','⚙','Opções']];
let state,view='overview',modalBot=null,lastUiRefresh=0,savePending=false,saveFailed=false,saveGeneration=0,toastTimer=0;
const gameNow=()=>Date.now()+(state?.offsetMs||0);
const duration=at=>timeRemaining(at,gameNow());
const canAfford=(cat,key,level=0,qty=1)=>affordable(state.player.resources,prices(cat,key,level,qty));
const enough=(cost)=>Object.keys(RESOURCE_NAMES).map(k=>`<span class="${state.player.resources[k]+.001<(cost[k]||0)?'lacking':''}">${k==='metal'?'M':k==='crystal'?'C':'D'} ${fmt(cost[k]||0)}</span>`).join(' · ');
const btn=(label,action,extra='',disabled=false)=>`<button class="btn ${extra}" data-action="${action}" ${disabled?'disabled':''}>${label}</button>`;
const status=p=>p?'<span class="pill">EM PRODUÇÃO</span>':'';
function notify(msg,error=false){const el=$('toast');el.textContent=msg;el.className=`show${error?' error':''}`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.className='',3600);}
function navRender(){
  $('nav').innerHTML=navItems.map(([key,icon,label])=>`<button class="nav-item ${key===view?'active':''}" data-nav="${key}" aria-current="${key===view?'page':'false'}"><span aria-hidden="true">${icon}</span>${label}</button>`).join('');
  $('page-title').textContent=navItems.find(x=>x[0]===view)?.[2]||'Galáxia';
}
function resourcesRender(){const p=state.player,prod=production(p.buildings),cap=storageCapacity(p.buildings.storage);
  const r=[['metal','⛏','Metal',`+${fmt(prod.metal)}/h`],['crystal','◈','Cristal',`+${fmt(prod.crystal)}/h`],['deuterium','◉','Deutério',`+${fmt(prod.deuterium)}/h`]];
  $('resources').innerHTML=r.map(([k,i,label,sub])=>`<div class="resource"><div class="res-label"><b>${i}</b>${label}</div><div class="res-num" title="${fmt(p.resources[k])}">${fmt(p.resources[k])}</div><div class="res-sub">${sub} · limite ${fmt(cap)}</div></div>`).join('')+`<div class="resource energy ${prod.energyRatio<1?'low':''}"><div class="res-label"><b>⚡</b> Energia</div><div class="res-num">${fmt(prod.energyProduced-prod.energyUsed)}</div><div class="res-sub">${fmt(prod.energyProduced)} / ${fmt(prod.energyUsed)} · ${Math.floor(prod.energyRatio*100)}% eficiência</div></div>`;
  $('connection').textContent=navigator.onLine?'◉ Jogo local ativo':'◉ Sem internet — ativo';
  $('save-indicator').textContent=saveFailed?'● Falha ao guardar':savePending?'● A guardar':'● Guardado neste dispositivo';
}
function queueBlock(queue){const q=state.player.queues[queue];if(!q)return '';
  const definition=q.category==='building'?BUILDINGS[q.key]:q.category==='research'?TECH[q.key]:q.category==='ship'?UNITS[q.key]:DEFENSE[q.key];
  return `<div class="card queue-card"><div class="queue-head"><div><div class="mini-kicker">Fila ativa</div><strong>${definition?.name||q.key} ${q.qty>1?'×'+q.qty:''}</strong></div><span class="queue-timer" data-countdown="${q.endAt}">${duration(q.endAt)}</span></div><div class="progress"><span style="width:${Math.max(3,Math.min(100,100-(q.endAt-gameNow())/Math.max(1,q.endAt-(q.startedAt??q.endAt-300000))*100))}%"></span></div></div>`;
}
function overview(){const p=state.player,prod=production(p.buildings);
  const fleets=state.fleets.filter(f=>f.owner==='player');const latest=state.reports[0];
  return `<section class="hero card"><div class="hero-copy"><div class="mini-kicker">PLANETA PRINCIPAL · ${coords(p)}</div><h2>${escape(p.planetName)}</h2><p>O teu império começa aqui. Investe na economia, desenvolve novas tecnologias e enfrenta os impérios rivais. Tudo funciona neste dispositivo, mesmo sem internet.</p><div class="btn-row">${btn('Desenvolver minas','goto:buildings')}${btn('Explorar galáxia','goto:galaxy','secondary')}</div></div><div class="hero-planet"><div class="stars"></div></div></section>
  <div class="stats-row"><div class="card stat-card"><div class="number">${scorePlayer(state).toLocaleString('pt-PT')}</div><div class="caption">Poder do império</div></div><div class="card stat-card"><div class="number">${state.bots.length}</div><div class="caption">Impérios rivais</div></div><div class="card stat-card"><div class="number">${fleets.length}</div><div class="caption">Frotas no espaço</div></div></div>
  <section style="margin-top:23px"><div class="section-heading"><div><h2>Operações em curso</h2><p>Atualizadas automaticamente pelo relógio do jogo.</p></div></div><div class="stack">${queueBlock('building')}${queueBlock('research')}${queueBlock('hangar')}${!Object.values(p.queues).some(Boolean)?'<div class="card empty">Nenhuma construção em curso. Começa pela economia.</div>':''}</div></section>
  <section style="margin-top:23px" class="info-grid"><div class="card info-card"><h3>⚡ Balanço energético</h3><p>Produção: <b>${fmt(prod.energyProduced)}</b> · Consumo: <b>${fmt(prod.energyUsed)}</b></p><p>Eficiência das minas: <b>${Math.round(prod.energyRatio*100)}%</b></p>${prod.energyRatio<1?'<p style="color:#efad8e">Constrói uma Central Solar para evitar perda de produção.</p>':''}</div><div class="card info-card"><h3>▤ Último acontecimento</h3><p><b>${escape(latest?.title||'Sem novidades')}</b></p><p>${escape(latest?.text||'')}</p><p>${date(latest?.at||gameNow())}</p></div></section>`;
}
function builds(){return `<div class="section-heading"><div><h2>Infraestruturas planetárias</h2><p>Construção de uma estrutura de cada vez. As minas produzem mesmo quando fechas o jogo.</p></div></div>${queueBlock('building')}<div class="list-grid" style="margin-top:12px">${Object.entries(BUILDINGS).map(([key,v])=>{
  const level=state.player.buildings[key]||0,cost=prices('building',key,level);const blocked=!!state.player.queues.building||!canAfford('building',key,level);
  return `<article class="card item"><div class="item-header"><div class="item-icon">${v.icon}</div><div><h3>${v.name}</h3><p class="desc">${v.desc}</p></div></div><div class="badge-row"><span class="pill info">Nível ${level}</span>${state.player.queues.building?.key===key?status(true):''}</div><div class="item-footer"><div class="cost"><div class="muted">Próximo nível</div>${enough(cost)}</div>${btn('Construir','build:'+key,'small',blocked)}</div></article>`;
}).join('')}</div>`;}
function research(){return `<div class="section-heading"><div><h2>Árvore de tecnologias</h2><p>Investigações melhoram o desempenho militar e a capacidade de exploração.</p></div></div>${queueBlock('research')}<div class="list-grid" style="margin-top:12px">${Object.entries(TECH).map(([key,v])=>{
  const level=state.player.tech[key]||0,cost=prices('tech',key,level),blocked=!!state.player.queues.research||!canAfford('tech',key,level);
  return `<article class="card item"><div class="item-header"><div class="item-icon">${v.icon}</div><div><h3>${v.name}</h3><p class="desc">${v.desc}</p></div></div><div class="badge-row"><span class="pill info">Nível ${level}</span></div><div class="item-footer"><div class="cost">${enough(cost)}</div>${btn('Pesquisar','research:'+key,'small',blocked)}</div></article>`;
}).join('')}</div>`;}
function shipyard(){return `<div class="section-heading"><div><h2>Produção militar</h2><p>As naves construídas aqui podem espiar e atacar os impérios rivais.</p></div></div>${queueBlock('hangar')}<div class="list-grid" style="margin-top:12px">${Object.entries({...UNITS,...DEFENSE}).map(([key,v])=>{
  const cat=UNITS[key]?'ship':'defense',owned=state.player[cat==='ship'?'ships':'defense'][key]||0,need=v.needs?.shipyard||1,locked=(state.player.buildings.shipyard||0)<need,cost=prices(cat,key,0),blocked=!!state.player.queues.hangar||locked||!canAfford(cat,key);
  return `<article class="card item"><div class="item-header"><div class="item-icon">${v.icon}</div><div><h3>${v.name}</h3><p class="desc">${v.desc}</p></div></div><div class="badge-row"><span class="pill info">${owned} unidades</span>${locked?`<span class="pill warn">Hangar n.º ${need} necessário</span>`:''}</div><div class="cost">Custo por unidade: ${enough(cost)}</div><div class="item-footer"><div class="qty-box"><label class="label" for="qty-${key}">Qtd.</label><input id="qty-${key}" class="number-input" type="number" inputmode="numeric" min="1" max="100" value="1" ${locked?'disabled':''}></div>${btn('Produzir',cat+':'+key,'small',blocked)}</div></article>`;
}).join('')}</div>`;}
function galaxy(){const bots=[...state.bots].sort((a,b)=>a.system-b.system||a.position-b.position);
  return `<div class="section-heading"><div><h2>Galáxia 1 · 20 impérios</h2><p>Os bots expandem a economia, constroem frotas e alguns poderão atacar-te.</p></div><span class="pill">${bots.length} rivais</span></div><div class="card table-scroll"><table class="table galaxy-table"><thead><tr><th>Coordenadas</th><th>Império</th><th>Poder</th><th>Ações</th></tr></thead><tbody>${bots.map(b=>`<tr><td><span class="pill info">${coords(b)}</span></td><td><div class="bot-title">${escape(b.name)}</div><div class="bot-sub">${escape(b.style)}</div></td><td>${fmt(scoreBot(b))}</td><td><div class="actions">${btn('Espiar','spy:'+b.id,'ghost small',state.player.ships.probe<1)}${btn('Atacar','attack:'+b.id,'secondary small')}</div></td></tr>`).join('')}</tbody></table></div><p class="hint">Espionagem requer pelo menos uma sonda. O ataque usa as naves selecionadas no painel de missão.</p>`;}
function fleets(){const active=state.fleets;
  return `<div class="section-heading"><div><h2>Movimentos de frota</h2><p>As missões avançam com o tempo, mesmo depois de fechares o jogo.</p></div></div><div class="card">${active.length?`<div class="table-scroll"><table class="table"><thead><tr><th>Origem</th><th>Missão</th><th>Destino</th><th>Estado</th><th>Chegada</th></tr></thead><tbody>${active.map(f=>{const b=state.bots.find(b=>b.id===f.botId);return `<tr><td>${f.owner==='player'?'Tua':escape(b?.name||'Bot')}</td><td>${f.mission==='spy'?'Espionagem':'Ataque'}</td><td>${f.owner==='player'?escape(b?.name||'Planeta'):'Nova Terra'}</td><td>${f.phase==='outbound'?'<span class="pill warn">A caminho</span>':'<span class="pill info">Regresso</span>'}</td><td data-countdown="${f.arrivesAt}">${duration(f.arrivesAt)}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">Não tens frotas em movimento. Visita a Galáxia para iniciar uma missão.</div>'}</div>`;}
function reports(){return `<div class="section-heading"><div><h2>Registo do universo</h2><p>Construções, combates, espionagem e acontecimentos recentes.</p></div><span class="pill info">${state.reports.length} registos</span></div><div class="card">${state.reports.map(r=>`<article class="report"><div class="report-dot ${r.type||''}"></div><div><div class="report-title">${escape(r.title)}</div><div class="report-date">${date(r.at)}</div><div class="report-text">${escape(r.text)}</div></div></article>`).join('')}</div>`;}
function settings(){return `<div class="section-heading"><div><h2>Guardar e gerir o teu universo</h2><p>Este jogo não envia os teus dados para nenhum servidor.</p></div></div><div class="settings-grid"><div class="card settings-card"><h3>▣ Cópia de segurança</h3><p>Exporta o progresso como um ficheiro JSON para a app Ficheiros do iPhone. É importante antes de remover a PWA ou limpar dados do Safari.</p><div class="btn-row">${btn('Exportar progresso','export','small')}${btn('Importar progresso','import','secondary small')}</div></div><div class="card settings-card"><h3>⏱ Testar a evolução do universo</h3><p>Este botão simula uma hora adicional: produção, construções, frotas e decisões dos bots. Útil para testar o jogo sem esperar.</p><div class="btn-row">${btn('Simular +1 hora','forward','secondary small')}</div></div><div class="card settings-card"><h3>✦ Instalar no iPhone</h3><p>Abre o site em Safari, seleciona Partilhar → Adicionar ao ecrã principal → Abrir como aplicação. Depois da primeira instalação, funciona sem internet.</p><p>O jogo exige uma publicação inicial num endereço HTTPS, como o GitHub Pages. Não necessita de servidor de jogo.</p></div><div class="card settings-card"><h3>⚙ Novo universo</h3><p>Começa novamente com um planeta e 20 bots. Esta ação apaga o progresso local atual, por isso exporta primeiro uma cópia.</p>${btn('Reiniciar universo','reset','danger small')}</div></div><div class="alert" style="margin-top:16px">Protótipo original inspirado em jogos clássicos de estratégia espacial. Não é o XGProyect-FMJ convertido nem uma reprodução integral das suas mecânicas. O motor de combates e os bots estão simplificados para permitir uma primeira versão jogável offline.</div>`;}
function renderView(){
  navRender();const views={overview,buildings:builds,research,shipyard,galaxy,fleets,reports,settings};
  $('view').innerHTML=(views[view]||overview)();lastUiRefresh=Date.now();
}
function renderAll(){resourcesRender();renderView()}
function updateCountdowns(){document.querySelectorAll('[data-countdown]').forEach(el=>el.textContent=duration(Number(el.dataset.countdown)))}
let modalFocus;
function modalOpen(botId,mission){
  modalFocus=document.activeElement;
  const b=state.bots.find(b=>b.id===botId);if(!b)return;
  modalBot={botId,mission};const spy=mission==='spy';
  $('modal').innerHTML=`<div class="modal-overlay" data-action="close-bg"><div class="modal-card" role="dialog" aria-modal="true" aria-label="Preparar missão"><div class="mini-kicker">${spy?'RECONHECIMENTO':'OPERAÇÃO MILITAR'}</div><h2>${spy?'Espiar':'Atacar'} ${escape(b.name)}</h2><p>Destino ${coords(b)} · Frota de ida e volta · Combate automático no destino.</p><hr class="divider"><div class="modal-grid">${(spy?['probe']:Object.keys(UNITS).filter(k=>k!=='probe')).map(k=>`<label for="fleet-${k}"><strong>${UNITS[k].name}</strong><br><span class="muted">Disponíveis: ${fmt(state.player.ships[k]||0)}</span></label><input class="number-input" data-fleet-ship="${k}" id="fleet-${k}" type="number" min="0" max="${state.player.ships[k]||0}" inputmode="numeric" value="${spy?Math.min(1,state.player.ships.probe||0):k==='lightFighter'?Math.min(3,state.player.ships.lightFighter||0):k==='smallCargo'?Math.min(1,state.player.ships.smallCargo||0):0}">`).join('')}</div><div class="hint">O combustível é retirado no lançamento. O saque é transportado conforme a capacidade das naves sobreviventes.</div><div class="modal-footer">${btn('Cancelar','close','ghost')}${btn('Enviar frota','send','')}</div></div></div>`;
  $('app').inert=true;document.body.classList.add('modal-open');
  $('modal').querySelector('input,button')?.focus();
}
function modalClose(){modalBot=null;$('modal').innerHTML='';$('app').inert=false;document.body.classList.remove('modal-open');modalFocus?.focus();}
// Access can throw in private/restricted browser contexts.
let local;try{local=window.localStorage;}catch{}
const storage=createStorage({indexedDB:window.indexedDB,localStorage:local});
function persist(){
  if(!state)return Promise.resolve(false);
  const generation=++saveGeneration;savePending=true;
  return storage.save(state).then(()=>{
    if(generation===saveGeneration){savePending=false;saveFailed=false;resourcesRender();}return true;
  },()=>{
    if(generation===saveGeneration){savePending=false;saveFailed=true;resourcesRender();}
    notify('Não foi possível guardar. Exporta o progresso.',true);return false;
  });
}
const load=()=>storage.load();
function actQueue(category,key){advance(state,gameNow());const quantity=Number($(`qty-${key}`)?.value||1);
  const result=startQueue(state,category,key,quantity);notify(result.message,!result.ok);if(result.ok){renderAll();persist();}
}
function exportSave(){advance(state,gameNow());persist();const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`galaxia-classica-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);notify('Cópia de segurança criada. Guarda o ficheiro em Ficheiros.');}
async function importSave(file){if(!file)return;try{if(file.size>8_000_000)throw Error('Ficheiro demasiado grande.');const s=JSON.parse(await file.text());if(!validateSave(s))throw Error('Ficheiro não é um jogo válido desta versão.');if(!window.confirm('Substituir o universo atual pelo ficheiro escolhido?'))return;
    advance(s,Date.now()+(s.offsetMs||0));state=s;renderAll();const saved=await persist();notify(saved?'Universo importado com sucesso.':'Universo importado, mas não foi possível guardá-lo. Exporta o progresso.',!saved);
  }catch(err){notify(err.message||'Não foi possível importar.',true)}finally{$('import-file').value=''}}
function onClick(event){const nav=event.target.closest('[data-nav]');if(nav){view=nav.dataset.nav;renderAll();window.scrollTo({top:0,behavior:'instant'});return;}
  const el=event.target.closest('[data-action]');if(!el)return;const action=el.dataset.action;
  if(action==='close-bg'&&event.target!==el)return;
  if(action.startsWith('goto:')){view=action.split(':')[1];renderAll();return;}
  if(action.startsWith('build:'))return actQueue('building',action.split(':')[1]);
  if(action.startsWith('research:'))return actQueue('research',action.split(':')[1]);
  if(action.startsWith('ship:'))return actQueue('ship',action.split(':')[1]);
  if(action.startsWith('defense:'))return actQueue('defense',action.split(':')[1]);
  if(action.startsWith('spy:')||action.startsWith('attack:')){const [mission,id]=action.split(':');return modalOpen(Number(id),mission)}
  if(action==='close'||action==='close-bg')return modalClose();
  if(action==='send'){
    advance(state,gameNow());const ships={};for(const input of document.querySelectorAll('[data-fleet-ship]'))ships[input.dataset.fleetShip]=Number(input.value||0);
    const result=sendFleet(state,modalBot.botId,ships,modalBot.mission);notify(result.message,!result.ok);if(result.ok){modalClose();view='fleets';renderAll();persist();}return;
  }
  if(action==='export')return exportSave();
  if(action==='import')return $('import-file').click();
  if(action==='reset'){
    if(!window.confirm('Apagar o progresso atual e começar um novo universo com 20 bots? Esta ação não pode ser anulada.'))return;
    state=createGame(Date.now());view='overview';renderAll();persist();notify('Novo universo criado.');return;
  }
  if(action==='forward'){advance(state,gameNow());fastForward(state,1);renderAll();persist();notify('O universo avançou uma hora.');return;}
}
async function init(){const saved=await load();state=validateSave(saved)?saved:createGame(Date.now());
  const before=state.lastSimulated;advance(state,gameNow());renderAll();await persist();
  if(gameNow()-before>MINUTE)notify(`O teu universo avançou ${Math.floor((gameNow()-before)/MINUTE)} minutos desde a última visita.`);
  document.addEventListener('click',onClick);
  document.addEventListener('keydown',event=>{
    if(!modalBot)return;
    if(event.key==='Escape'){modalClose();return;}
    if(event.key==='Tab'){
      const items=[...$('modal').querySelectorAll('input:not(:disabled),button:not(:disabled)')];
      if(event.shiftKey&&document.activeElement===items[0]){event.preventDefault();items.at(-1)?.focus();}
      else if(!event.shiftKey&&document.activeElement===items.at(-1)){event.preventDefault();items[0]?.focus();}
    }
  });
  window.addEventListener('pagehide',()=>{advance(state,gameNow());persist();});
  $('import-file').addEventListener('change',e=>importSave(e.target.files?.[0]));
  window.addEventListener('online',resourcesRender);window.addEventListener('offline',resourcesRender);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){advance(state,gameNow());persist();}else{advance(state,gameNow());renderAll();persist();}});
  setInterval(()=>{if(document.visibilityState==='hidden')return;
    const beforeReports=state.seq;
    advance(state,gameNow());resourcesRender();updateCountdowns();
    if(state.seq!==beforeReports||Date.now()-lastUiRefresh>20000){if(!modalBot&&!$('view').contains(document.activeElement))renderView();}
  },1000);
  setInterval(()=>{if(state){advance(state,gameNow());persist()}},15000);
  if('serviceWorker' in navigator){try{await navigator.serviceWorker.register('./sw.js',{scope:'./'});await navigator.serviceWorker.ready;notify('Jogo disponível offline neste dispositivo.')}catch(err){console.warn('PWA sem cache:',err)}}
}
init().catch(err=>{$('view').innerHTML=`<div class="alert">Erro ao iniciar o jogo: ${escape(err.message)}. Recarrega a página.</div>`;console.error(err)});
