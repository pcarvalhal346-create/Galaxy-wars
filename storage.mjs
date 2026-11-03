import {validateSave} from './engine.mjs';

// Mirror synchronously before waiting for IndexedDB: iOS may suspend a hidden page.
// Both backends use the same envelope; legacy, unwrapped saves remain readable.
export function createStorage({indexedDB, localStorage}) {
  let db, chain=Promise.resolve(), stamp=0;
  const unpack=value=>{
    const game=value?.game??value;
    return validateSave(game)?{game,savedAt:Number.isFinite(value?.savedAt)?value.savedAt:0}:null;
  };
  const readIDB=()=>new Promise((resolve,reject)=>{
    const tx=db.transaction('games','readonly'),req=tx.objectStore('games').get('save');
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.onabort=()=>reject(tx.error);
  });
  const writeIDB=value=>new Promise((resolve,reject)=>{
    const tx=db.transaction('games','readwrite');tx.objectStore('games').put(value,'save');
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
  return {
    async load(){
      let primary,fallback;
      try {
        db=await new Promise((resolve,reject)=>{
          if(!indexedDB)return reject(Error('Sem IndexedDB'));
          const req=indexedDB.open('galaxia-classica-offline',1);
          req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('games'))req.result.createObjectStore('games');};
          req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
          req.onblocked=()=>reject(Error('IndexedDB bloqueado'));
        });
        primary=unpack(await readIDB());
      }catch {db=null;}
      try {fallback=unpack(JSON.parse(localStorage.getItem('galaxia-save')||'null'));}catch {}
      const selected=[primary,fallback].filter(Boolean).sort((a,b)=>b.savedAt-a.savedAt)[0];
      stamp=selected?.savedAt||0;return selected?.game??null;
    },
    save(game){
      const value={savedAt:stamp=Math.max(Date.now(),stamp+1),game:JSON.parse(JSON.stringify(game))};
      let mirrored=false;
      try {localStorage.setItem('galaxia-save',JSON.stringify(value));mirrored=true;}catch {}
      chain=chain.catch(()=>{}).then(async()=>{
        try {if(!db)throw Error('Sem IndexedDB');await writeIDB(value);}
        catch(error){if(!mirrored)throw error;}
      });
      return chain;
    }
  };
}
