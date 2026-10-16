import { validateBrowseMetadata } from './identity-transitions.mjs';
// The entry is read once per page. Every subsequent request is bound to that
// release's immutable paths and SHA-256 hashes, including cached responses.
import { expandEvidence, evidenceIds } from './public-artifact-codec.mjs';

export function createPublicDataLoader({fetchImpl=globalThis.fetch,cryptoImpl=globalThis.crypto,baseURL=globalThis.location?.href||'http://localhost/'}={}) {
  let manifest, data, starting;
  const cache=new Map(), ready=new Set(), pending=new Map(), failedPaths=new Set();
  const url=new URL('./data.json',baseURL);
  async function fetchBytes(target,cacheMode) {
    const response=await fetchImpl(target,{cache:cacheMode,signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error(`Unable to load published data (HTTP ${response.status}).`);
    return new Uint8Array(await response.arrayBuffer());
  }
  function descriptorPath(descriptor) {
    const path=descriptor?.path;
    if(typeof path!=='string'||!/^data\/[a-f0-9]{64}\/[a-z]+-[a-f0-9]{64}\.json$/.test(path)||!path.endsWith(`-${descriptor.hash}.json`)||!path.startsWith(`data/${manifest.releaseId}/`)||path.split('/').some(p=>p==='.'||p==='..')||/[?#\\]/.test(path)||!/^([a-f0-9]{64})$/.test(descriptor.hash||''))throw new Error('Invalid release-bound data reference.');
    return path;
  }
  async function load(descriptor) {
    const path=descriptorPath(descriptor),key=`${path}:${descriptor.hash}`;
    if(!cache.has(key))cache.set(key,(async()=>{
      const bytes=await fetchBytes(new URL(path,url),failedPaths.has(path)?'reload':'default');
      const digest=new Uint8Array(await cryptoImpl.subtle.digest('SHA-256',bytes));
      const hash=Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');
      if(hash!==descriptor.hash)throw new Error('Published data integrity check failed. Retry this version.');
      return JSON.parse(new TextDecoder().decode(bytes));
    })().catch(error=>{cache.delete(key);failedPaths.add(path);throw error;}));
    return cache.get(key);
  }
  async function hydrated(descriptor) {
    const payload=await load(descriptor),records=new Map();
    const ids=evidenceIds(payload);
    if(descriptor.evidenceIds&&JSON.stringify(ids)!==JSON.stringify([...descriptor.evidenceIds].sort()))throw new Error('Published evidence closure mismatch.');
    await Promise.all(ids.map(async id=>{
      const binding=manifest.evidence?.[id];
      const reference=typeof binding==='string'?manifest.evidenceShards?.[binding]:binding;
      if(!reference)throw new Error('Missing release-bound evidence reference.');
      const shard=await load(reference);
      if(!Object.hasOwn(shard.records||{},id))throw new Error('Missing evidence record.');
      records.set(id,shard.records[id]);
    }));
    return expandEvidence(payload,records);
  }
  function routeKey(route,id) {
    if(route==='region'&&manifest?.regions?.[id])return `region:${id}`;
    if(route==='designation')id=data?.designations?.find(row=>row.id===id)?.appellationId;
    if(['appellation','designation'].includes(route)&&manifest?.details?.[id])return `detail:${id}`;
    return null;
  }
  function merge(payload,entityId) {
    if(payload.schemaVersion!==undefined&&payload.schemaVersion!==data.schemaVersion||payload.version!==undefined&&payload.version!==data.version)throw new Error('Detail version mismatch.');
    if(!Array.isArray(payload.appellations)||payload.appellations.length!==1||payload.appellations[0]?.id!==entityId)throw new Error('Detail identity mismatch.');
    const expected=data.designations.filter(row=>row.appellationId===entityId).map(row=>row.id).sort();
    if(!Array.isArray(payload.designations)||payload.designations.some(row=>row.appellationId!==entityId)||JSON.stringify(payload.designations.map(row=>row.id).sort())!==JSON.stringify(expected))throw new Error('Designation closure mismatch.');
    const allowed=new Set(['appellations','designations','sources','terms','grapeCollections','schemes','identityBindings','protections','scopes','conditions','ruleClaims','dependencies','evidence']);
    for(const [key,rows] of Object.entries(payload)){
      if(!allowed.has(key)||!Array.isArray(rows)||!Array.isArray(data[key]))throw new Error('Invalid detail collection.');
      if(new Set(rows.map(row=>row?.id)).size!==rows.length)throw new Error('Duplicate detail identity.');
    }
    // Never replace the global catalogue with a regional subset. A hydrated
    // detail only upgrades existing identities; search always sees every region.
    const updates={};
    for(const [key,rows] of Object.entries(payload))if(Array.isArray(rows)&&Array.isArray(data[key])){
      const byId=new Map(data[key].map(row=>[row.id,row]));
      for(const row of rows){if(!row?.id)throw new Error('Invalid detail identity.');byId.set(row.id,row);}
      updates[key]=[...byId.values()];
    }
    Object.assign(data,updates);
  }
  return {
    get data(){return data;},
    get manifest(){return manifest;},
    async start(){
      if(data)return data;
      if(!starting)starting=(async()=>{
        const entry=manifest||JSON.parse(new TextDecoder().decode(await fetchBytes(url,'no-cache')));
        // Keep development fixtures and earlier standalone publications readable.
        if(!entry.format&&[1,2].includes(entry.schemaVersion)){if(validateBrowseMetadata(entry).length)throw new Error('Invalid browse metadata.');data=entry;return data;}
        if(entry.format!=='wine-chunks-1'||![1,2].includes(entry.readerVersion)||![1,2].includes(entry.schemaVersion)||!/^([a-f0-9]{64})$/.test(entry.releaseId||''))throw new Error('Unsupported published data release.');
        // A retry after an index failure stays on the already selected release.
        manifest ||= entry;
        const candidate=await hydrated(manifest.index);
        if(candidate.deliveryProjection!=='global-search-1'||candidate.schemaVersion!==manifest.schemaVersion||candidate.version!==manifest.dataVersion||(candidate.contractVersion||null)!==(manifest.contractVersion||null))throw new Error('Published index version mismatch.');
        if(!Array.isArray(candidate.appellations)||!Array.isArray(candidate.designations)||!Array.isArray(candidate.regions))throw new Error('Invalid global catalogue.');
        for(const app of candidate.appellations)descriptorPath(manifest.details?.[app.id]);
        for(const region of candidate.regions)descriptorPath(manifest.regions?.[region.id]);
        for(const designation of candidate.designations)if(!candidate.appellations.some(app=>app.id===designation.appellationId))throw new Error('Invalid designation parent.');
        if(manifest.readerVersion===1&&(candidate.regionalClassifications!==undefined||candidate.identityTransitions!==undefined))throw new Error('Browse metadata requires artifact reader version 2.');
        if(validateBrowseMetadata(candidate).length)throw new Error('Invalid browse metadata.');
        data=candidate;return data;
      })().catch(error=>{starting=null;throw error;});
      return starting;
    },
    isReady(route,id){const key=routeKey(route,id);return Boolean(data)&&(!key||ready.has(key));},
    async ensureRoute(route,id){
      await this.start();const key=routeKey(route,id);
      if(!key||ready.has(key))return data;
      if(!pending.has(key))pending.set(key,(async()=>{
        const [kind,...parts]=key.split(':'),entityId=parts.join(':');
        const payload=await hydrated(kind==='region'?manifest.regions[entityId]:manifest.details[entityId]);
        if(kind==='region'){
          const inRegion=app=>(app.regionIds||[]).some(id=>{const seen=new Set();while(id&&!seen.has(id)){if(id===entityId)return true;seen.add(id);id=data.regions.find(region=>region.id===id)?.parentId;}return false;});
          const expected=data.appellations.filter(inRegion).map(app=>app.id).sort();
          if(payload.regionId!==entityId||!Array.isArray(payload.appellationIds)||JSON.stringify([...payload.appellationIds].sort())!==JSON.stringify(expected))throw new Error('Invalid regional catalogue.');
        }else{
          if(!payload.appellations?.some(app=>app.id===entityId))throw new Error('Detail identity mismatch.');
          merge(payload,entityId);
        }
        ready.add(key);return data;
      })().finally(()=>pending.delete(key)));
      return pending.get(key);
    }
  };
}
