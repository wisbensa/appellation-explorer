// Browser-safe, source-bound reading of the complete code/name/status table.
// This proves a referenced regional authorization vocabulary, never a national
// identity universe. Observation rows remain in the ambiguity vocabulary.
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const fields=(v,keys)=>object(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const key=v=>String(v).normalize('NFKD').replace(/\p{M}/gu,'').replace(/[’‘]/g,"'").toLowerCase().replace(/\s+/g,' ').trim();
const stable=value=>Array.isArray(value)?value.map(stable):object(value)?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value;
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const exactName=v=>String(v).normalize('NFC').replace(/[’‘]/g,"'").toLowerCase().replace(/\s+/g,' ').trim();
const evidence=v=>Array.isArray(v)&&v.length&&v.every(e=>object(e)&&/^source-[a-f0-9]{64}$/.test(e.sourceId)&&typeof e.locator==='string'&&e.locator&&typeof e.quote==='string'&&e.quote.trim());
const setEqual=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===new Set(a).size&&b.length===new Set(b).size&&same([...a].sort(),[...b].sort());
export const REGIONAL_IDENTITY_TABLE_PROFILE='it-regional-code-name-status-table-v1';
export function readRegionalIdentityInventory(inventory){
 try{
  if(!fields(inventory,['profile','regionKey','definition','pages'])||inventory.profile!==REGIONAL_IDENTITY_TABLE_PROFILE||!Array.isArray(inventory.pages)||!inventory.pages.length)return null;
  const d=inventory.definition;
  if(!fields(d,['sourceId','sourceHash','locator','quote'])||!/^source-[a-f0-9]{64}$/.test(d.sourceId)||d.sourceId!==`source-${d.sourceHash}`||!d.locator||inventory.pages.some((p,i)=>!fields(p,['number','text'])||p.number!==i+1||typeof p.text!=='string'||!p.text.trim())||inventory.pages.map(p=>p.text).join('\n')!==d.quote)return null;
  const lines=inventory.pages.flatMap(p=>p.text.split('\n').map(text=>({text,page:p.number}))),header=lines.splice(0,7).map(l=>l.text);
  if(header[0]!=='Classificazione delle varietà di vite per la produzione di vino.'||!/^Elenco delle varietà autorizzate alla coltivazione nella Regione [\p{L}'’ -]+$/u.test(header[1])||key(header[1].slice('Elenco delle varietà autorizzate alla coltivazione nella Regione '.length))!==inventory.regionKey||!same(header.slice(2),['Provvedimento','Codice Tipo','Varietà iscrizione catalogo','catalogo autorizzazione','nazionale']))return null;
  if(lines.pop()?.text!=='Legenda: I – idonee alla coltivazione O – in osservazione')return null;
  const rows=[];
  for(const line of lines){
   const m=line.text.match(/^(\d{1,4}) ([\p{L}][\p{L}'’ -]*?) (B|N|G|Rs)\.? (I|O) (?:D\.M\.?\s*\d{1,2}\/\d{1,2}\/\d{2,4}|Reg\. \d+\/\d{4})$/u);if(!m)return null;
   const registrationNumber=String(Number(m[1])).padStart(3,'0');
   rows.push({registrationNumber,canonicalName:m[2],berryColorCode:m[3],eligible:m[4]==='I',evidence:[{sourceId:d.sourceId,locator:`page ${line.page}, registration ${registrationNumber}`,quote:line.text}]});
  }
  if(!rows.length||new Set(rows.map(r=>r.registrationNumber)).size!==rows.length||new Set(rows.map(r=>key(r.canonicalName))).size!==rows.length)return null;
  return rows;
 }catch{return null;}
}
export function createRegionalIdentityInventory(pages,source,region){
 const inventory={profile:REGIONAL_IDENTITY_TABLE_PROFILE,regionKey:key(region),definition:{sourceId:source.id,sourceHash:source.sha256,locator:'complete official regional variety table, all pages',quote:pages.map(p=>p.text).join('\n')},pages:pages.map(p=>({number:p.number,text:p.text}))};
 return readRegionalIdentityInventory(inventory)?inventory:null;
}
export function registrySnapshotRows(snapshot){
 try{
  if(!fields(snapshot,['inventory','closure','coverage','dependency']))return null;
  const {inventory,closure,coverage,dependency}=snapshot,rows=readRegionalIdentityInventory(inventory);if(!rows)return null;
  if(!fields(closure,['regionKey','scope','conditions','evidence','registrationNumbers'])||closure.regionKey!==inventory.regionKey||!closure.scope||!fields(closure.conditions,['original','verified','evidence'])||closure.conditions.verified!==true||!evidence(closure.conditions.evidence)||closure.conditions.original!=='Legenda: I – idonee alla coltivazione O – in osservazione'||!closure.conditions.evidence.some(e=>e.sourceId===inventory.definition.sourceId&&e.quote===closure.conditions.original)||!evidence(closure.evidence)||!closure.evidence.some(e=>e.sourceId===inventory.definition.sourceId&&inventory.definition.quote.includes(e.quote)))return null;
  if(!setEqual(closure.registrationNumbers,rows.filter(r=>r.eligible).map(r=>r.registrationNumber)))return null;
  if(!fields(coverage,['kind','regionKey','complete','dataRows'])||coverage.kind!=='regional'||coverage.regionKey!==inventory.regionKey||coverage.complete!==true||coverage.dataRows!==rows.length)return null;
  if(!fields(dependency,['kind','regionKey','state','sourceIds'])||dependency.kind!=='regional'||dependency.regionKey!==inventory.regionKey||dependency.state!=='available'||!Array.isArray(dependency.sourceIds)||!dependency.sourceIds.includes(inventory.definition.sourceId)||!closure.evidence.some(e=>e.sourceId!==inventory.definition.sourceId&&dependency.sourceIds.includes(e.sourceId)&&e.locator==='current official variety-table attachment'))return null;
  return rows;
 }catch{return null;}
}
function uniquePartition(rawGroup,rows){
 if(typeof rawGroup!=='string'||!/^[\p{L}'’ ,\r\n-]+$/u.test(rawGroup))return null;
 const groups=rawGroup.split(',').map(g=>g.trim());if(groups.some(g=>!g))return null;
 const components=[];
 for(const group of groups){
  const words=group.split(/\s+/);if(words.length>12)return null;const solutions=[];
  const visit=(start,path)=>{if(solutions.length>1)return;if(start===words.length){solutions.push(path);return;}for(let end=start+1;end<=words.length;end++){const name=exactName(words.slice(start,end).join(' '));for(const row of rows.filter(r=>exactName(r.canonicalName)===name))visit(end,[...path,row]);}};
  visit(0,[]);if(solutions.length!==1)return null;components.push(...solutions[0]);
 }
 if(components.some(r=>!r.eligible)||new Set(components.map(r=>r.registrationNumber)).size!==components.length)return null;
 return components;
}
export function createRegistryTokenPartitionProof(compiled,snapshot){
 const group=compiled?.registryTokenGroup,rows=registrySnapshotRows(snapshot);
 if(!group||!rows||key(group.region)!==snapshot.inventory.regionKey)return null;
 const components=uniquePartition(group.original,rows);if(!components)return null;
 return {profile:'registry-exact-token-partition-v1',rawGroup:group.original,snapshot,components};
}
export function applyRegistryTokenPartition(compiled,proof){
 try{
  if(!fields(proof,['profile','rawGroup','snapshot','components'])||proof.profile!=='registry-exact-token-partition-v1'||!compiled?.registryTokenGroup||proof.rawGroup!==compiled.registryTokenGroup.original)return null;
  const expected=createRegistryTokenPartitionProof(compiled,proof.snapshot);if(!expected||!same(expected.components,proof.components)||compiled.named.length!==1)return null;
  // Replacing names is the only projection. The group minimum, remainder,
  // raw definition and scope are neither reconstructed nor weakened.
  return {...compiled,named:[{...compiled.named[0],names:expected.components.map(r=>r.canonicalName)}]};
 }catch{return null;}
}
export function registryTokenPartitionEvidence(proof){return proof?[proof.snapshot?.inventory?.definition,...(proof.snapshot?.closure?.evidence||[]),...(proof.snapshot?.closure?.conditions?.evidence||[]),...(proof.components||[]).flatMap(c=>c.evidence||[])].filter(Boolean):[];}
