import {proofValuesEqual} from './proof-value-equality.mjs';
import {reviewedSourceComparators} from './reviewed-source-comparators.mjs';
import {compileOptionalComplementDefinition,compileComplementSentence,compileNamedVineyardRows} from './source-domain-definition.mjs';

const flat=value=>String(value||'').replace(/\s+/g,' ').trim();
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const envelope=value=>object(value)&&Object.keys(value).length===4&&['sourceId','sourceHash','locator','quote'].every(k=>typeof value[k]==='string'&&value[k])&&/^[a-f0-9]{64}$/.test(value.sourceHash);
export function sourceComparatorEvidence(proof){return ['registration','summaryIdentity','summary','summaryRole'].map(k=>proof?.[k]).filter(Boolean);}

// This is a reviewed relationship between exact sources, not a catalogue of
// permissions. Operative names, scope, percentage and vineyard basis are read
// again from the independently bound original row and registered summary.
export function compileSourceComparatorDefinition(context,definition,scope,proof){
 try{
  if(!envelope(context)||!envelope(definition)||context.sourceId!==`source-${context.sourceHash}`||definition.sourceId!==context.sourceId||definition.sourceHash!==context.sourceHash)return null;
  const records=reviewedSourceComparators.filter(r=>r.nationalSourceHash===context.sourceHash&&r.nationalArticle===context.quote&&proofValuesEqual(r.proof,proof));
  if(records.length!==1||sourceComparatorEvidence(proof).some(e=>!envelope(e)))return null;
  const record=records[0],registration=JSON.parse(proof.registration.quote),sources=record.sources;
  if(registration.status!=='Registered'||registration.statusId!==4||registration.lastApprovedId!==registration.id||registration.countryId!=='it'||registration.qualityProductType!=='Wine'||registration.fileName!==scope?.entityId||registration.protectedName!==scope?.denomination)return null;
  const summarySource=sources.find(s=>s.id===proof.summary.sourceId&&s.sha256===proof.summary.sourceHash),registrationSource=sources.find(s=>s.id===proof.registration.sourceId&&s.sha256===proof.registration.sourceHash);
  const attachment=summarySource?.url.match(/^https:\/\/ec\.europa\.eu\/geographical-indications-register\/eambrosia-public-api\/api\/v1\/attachments\/(\d+)$/)?.[1];
  if(!attachment||registrationSource?.url!==`https://ec.europa.eu/geographical-indications-register/eambrosia-public-api/api/gi-applications/id/${registration.id}`)return null;
  const links=registration.singleDocTechFile?.filter(l=>l.uri===attachment);if(links?.length!==1)return null;
  const identity=flat(proof.summaryIdentity.quote),role=flat(proof.summaryRole.quote);
  if(!identity.includes(`Numero di fascicolo: ${registration.fileName}-AM`)||!identity.includes(`Ref. ${links[0].text} - `)||!identity.includes('I. DOCUMENTO UNICO')||!role.includes('Sintesi del documento unico riepilogativo senza alcuna modifica al disciplinare di produzione'))return null;
  if([proof.summaryIdentity,proof.summaryRole].some(e=>e.sourceId!==summarySource.id||e.sourceHash!==summarySource.sha256))return null;
  const article=context.quote.replace(/^Art(?:icolo|\.)\s*2\s+Base ampelografi(?:ca|a)\s*/i,''),blocks=article.split(/\n(?=\d+\s*-)/).map(s=>s.trim());
  if(blocks.filter(b=>b===definition.quote).length!==1||context.quote.split(definition.quote).length!==2)return null;
  for(const block of blocks)if(block!==definition.quote&&!compileOptionalComplementDefinition(block))return null;
  const row=flat(definition.quote).match(/^\d+\s*-\s*La denominazione di origine controllata [“"«]([^”"»]+)[”"»] seguita da una delle specificazioni di cui appresso, è riservata ai vini ottenuti da uve provenienti da vigneti aventi, in ambito aziendale, la seguente composizione ampelografica: ([\p{L}'’ -]+): ([\p{L}'’ -]+) (\d+(?:[,.]\d+)?)\s*%; (possono concorrere[\s\S]+)$/u);
  if(!row||row[1]!==scope.denomination)return null;
  const targets=row[2].split(' e ');if(new Set(targets).size!==targets.length||!targets.some(t=>`${row[1]} ${t}`===scope.wineName))return null;
  const observed=Number(row[4].replace(',','.'));if(observed<=0||observed>=100||!compileNamedVineyardRows(`${row[3]} minimo ${row[4]}%`))return null;
  const claims=[...flat(proof.summary.quote).matchAll(/Il vino [“"«]([^”"»]+)[”"»] ([\p{L}'’ -]+) è ottenuto dal vitigno ([\p{L}'’ -]+) \(min (\d+(?:[,.]\d+)?)%\) è di colore (rosso|bianco|rosato)\b/gu)].filter(m=>m[1]===row[1]&&m[2]===row[2]&&m[3]===row[3]&&Number(m[4].replace(',','.'))===observed&&m[5]===scope.wineType);
  if(claims.length!==1)return null;
  const remainderOriginal=definition.quote.match(/possono\s+concorrere[\s\S]+$/u)?.[0],remainder=remainderOriginal&&compileComplementSentence(remainderOriginal);
  if(!remainder||remainder.max!==100-observed)return null;
  return {basis:'vineyard',named:[{names:[row[3]],min:observed}],remainder,sourceRelation:'grapes-from-vineyard'};
 }catch{return null;}
}
