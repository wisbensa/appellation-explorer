import {proofValuesEqual as same} from './proof-value-equality.mjs';
import {readHistoricalSubzoneDefinition,compileHistoricalSubzoneUse,historicalSubzoneWitnesses} from './historical-subzone.mjs';
import {sourceDomainWitness} from './source-domain.mjs';
import {compileClosedNamedVineyardDefinition} from './source-domain-definition.mjs';
const key=value=>String(value || '').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();

const months={gennaio:1,febbraio:2,marzo:3,aprile:4,maggio:5,giugno:6,luglio:7,agosto:8,settembre:9,ottobre:10,novembre:11,dicembre:12};
const compact=value=>String(value || '').replace(/\s+/g,' ').trim();
const iso=(day,month,year)=>`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
const evidenceValid=e=>Boolean(e && /^source-[a-f0-9]{64}$/.test(e.sourceId || '') && e.locator && e.quote);


// Read only the exact source-observed grandfathering grammar. A date from a
// later consolidated edition is never the publication event of this clause.
export function readHistoricalVineyardDefinition(definition) {
  if(definition?.profile==='it-grandfathered-subzone-v1')return readHistoricalSubzoneDefinition(definition);
  if(!definition || !Array.isArray(definition.evidence) || definition.evidence.length!==5 || !definition.evidence.every(evidenceValid)) return null;
  const [currentEvidence,introductionEvidence,legacyEvidence,publicationEvidence,legacyApprovalEvidence]=definition.evidence;
  const article=compact(currentEvidence.quote),introduced=compact(introductionEvidence.quote),legacy=compact(legacyEvidence.quote);
  const boundary=article.search(/(?:\b2\.\s+)?In deroga alle disposizioni di cui al comma 1,/i);
  if(boundary<0) return null;
  const current=String(currentEvidence.quote).split(/(?:\b2\.\s+)?In deroga alle disposizioni di cui al comma 1,/i)[0].trim(),derogation=article.slice(boundary);
  const match=derogation.match(/^(?:2\. )?In deroga alle disposizioni di cui al comma 1, i vigneti che alla data di pubblicazione del presente decreto sono iscritti allo schedario viticolo per la (?:D\.?O\.?C\.?G\.?|Denominazione di Origine Controllata)\s+[“"«]([^”"»]+)[”"»]\s+in conformità alle disposizioni di cui all[’']art\.\s*2 del relativo disciplinare, approvato con (?:DM|DPR)\s+(\d{1,2})\s+([a-z]+)\s+(\d{4}), sono idonei alla produzione dei vini di cui all[’']art\.\s*1(?:, e dovranno adeguarsi alle disposizioni del comma 1 nell[’\x27]arco di (\d+) anni dalla data di pubblicazione del presente decreto)?\.$/i);
  if(!match || !months[match[3].toLowerCase()]) return null;
  const denomination=match[1],decreeDate=iso(match[2],months[match[3].toLowerCase()],match[4]);
  if(key(definition.denomination)!==key(denomination) || key(introduced.replace(/presentedecreto/gi,'presente decreto'))!==key(article)) return null;
  const target=compact(current).match(/I vini a D\.?O\.?C\.?G\.?\s+[“"«]([^”"»]+)[”"»]\s+devono essere ottenuti dalle uve provenienti da vigneti aventi,?/i);
  const historicalTarget=legacy.match(/I(?:l)? vini a D\.?O\.?C\.?G\.?\s+[“"«]([^”"»]+)[”"»]\s+devono essere ottenuti dalle uve provenienti da vigneti aventi,?/i);
  const timedTarget=compact(current).match(/La Denominazione di Origine Controllata [“"«]([^”"»]+)[”"»] è riservata ai vini ottenuti da uve/i);
  const timedHistoricalTarget=legacy.match(/Il vino [“"«]([^”"»]+)[”"»] deve essere ottenuto dalle uve provenienti dai vigneti composti dal vitigno/i);
  const currentTarget=target || (match[5] ? timedTarget : null),oldTarget=historicalTarget || (match[5] ? timedHistoricalTarget : null);
  if(!currentTarget || !oldTarget || key(currentTarget[1])!==key(denomination) || key(oldTarget[1])!==key(denomination) || /in deroga|tuttavia|\b2\./i.test(legacy.replace(/^Art(?:icolo|\.)\s*2/i,''))) return null;
  const approval=compact(legacyApprovalEvidence.quote);
  if(!new RegExp(`(?:DECRETO|DECRETO DEL PRESIDENTE DELLA REPUBBLICA)\\s+0?${Number(match[2])}\\s+${match[3]}\\s+${match[4]}`,'i').test(approval) || !definition.legacyArticle || compact(legacyEvidence.quote)!==compact(definition.legacyArticle) || legacyApprovalEvidence.sourceId!==legacyEvidence.sourceId) return null;
  const date=definition.publicationDate?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!date) return null;
  const parsedDate=new Date(definition.publicationDate+'T00:00:00Z');
  if(!Number.isFinite(parsedDate.getTime()) || !parsedDate.toISOString().startsWith(definition.publicationDate)) return null;
  const publication=compact(publicationEvidence.quote);
  const numericDate=new RegExp(`\\b0?${Number(date[3])}[-/.]0?${Number(date[2])}[-/.]${date[1]}\\b`);
  const monthName=Object.keys(months).find(name=>months[name]===Number(date[2]));
  const textDate=new RegExp(`\\b0?${Number(date[3])}\\s+${monthName}\\s+${date[1]}\\b`,'i');
  if(!/GAZZETTA UFFICIALE/i.test(publication) || !numericDate.test(publication) && !textDate.test(publication) || publicationEvidence.sourceId!==introductionEvidence.sourceId) return null;
  const currentCondition={kind:'general_rule',original:current,evidence:[currentEvidence]};
  if(/ottenuti da uve a bacca nera, non aromatiche, provenienti dai seguenti vitigni, presenti in ambito\s+aziendale:/i.test(compact(current))) currentCondition.requirements=[{kind:'fruit-color',value:'black',original:'uve a bacca nera'},{kind:'fruit-aromaticity',value:'non-aromatic',original:'non aromatiche'}];
  const historicalCondition={kind:'vineyard_registered_by',denomination,date:definition.publicationDate,conformsTo:{decreeDate,article:2},original:derogation,evidence:[currentEvidence,introductionEvidence,legacyEvidence,publicationEvidence,legacyApprovalEvidence]};
  if(match[5]) {
    const years=Number(match[5]);
    if(!Number.isSafeInteger(years) || years<1 || years>100) return null;
    const deadline=new Date(parsedDate); deadline.setUTCFullYear(deadline.getUTCFullYear()+years);
    historicalCondition.adaptationDeadline=deadline.toISOString().slice(0,10);
    historicalCondition.adaptationYears=years;
  }
  return {current,legacy:definition.legacyArticle,conditions:[currentCondition,historicalCondition]};
}

// parseBranch must preserve its own source identity and collection proof. This
// compiler is not an adoption gate; runtime validation/evaluation must support
// this discriminated profile before callers expose it as complete.
export function compileHistoricalVineyardUse(definition,parseBranch,{scope,referenceDate=null}={}) {
  if(definition?.profile==='it-grandfathered-subzone-v1')return compileHistoricalSubzoneUse(definition,parseBranch,{scope,referenceDate});
  const read=readHistoricalVineyardDefinition(definition);
  if(!read || typeof parseBranch!=='function') return null;
  const parsed=[parseBranch(read.current,definition.evidence[0]),parseBranch(read.legacy,definition.evidence[2])];
  if(parsed.some((p,i)=>!p?.rule || (!p.rule.complete && !sourceDomainWitness(p.rule) && !(i===0 && read.conditions[0].requirements && compileClosedHistoricalRows(read.current))) || p.rule.alternatives || p.rule.conditionalUse)) return null;
  const branches=parsed.map((p,index)=>({condition:read.conditions[index],rule:p.rule}));
  const grapes=[...new Map(parsed.flatMap(p=>p.grapes).map(g=>[g.id,g])).values()];
  const identityBindings=grapes.map(g=>({grapeId:g.id,sourceName:g.name.original,canonicalName:g.name.original,evidence:g.evidence}));
  if(!validDate(referenceDate))return null;
  const conditionalUse={profile:'it-grandfathered-vineyard-v1',definition:structuredClone(definition),scope:structuredClone(scope),referenceDate,identityBindings,branches};
  const activeIds=[...new Set(branches.flatMap((b,i)=>b.condition.adaptationDeadline && referenceDate>=b.condition.adaptationDeadline ? [] : b.rule.basis==='unknown' && i===0 ? [b.rule.grapeIds[0]] : b.rule.grapeIds))];
  return {rule:{complete:false,basis:parsed.every(p=>p.rule.basis==='vineyard')?'vineyard':'unknown',grapeIds:activeIds,constraints:[],original:definition.evidence[0].quote,evidence:structuredClone(definition.evidence),conditionalUse},grapes,unsupported:[],collectionHolds:[]};
}

export function validateHistoricalVineyardUse(rule,{validateBranch,reparseBranch}={}) {
  if(rule?.conditionalUse?.profile==='it-grandfathered-subzone-v1') return historicalSubzoneWitnesses(rule) ? [] : ['Unverified historical subzone source definition'];
  const profile=rule?.conditionalUse;
  if(profile?.profile!=='it-grandfathered-vineyard-v1') return ['Unsupported conditional vineyard profile'];
  const read=readHistoricalVineyardDefinition(profile.definition);
  if(!read || !Array.isArray(profile.branches) || profile.branches.length!==2) return ['Unverified historical vineyard source definition'];
  if(!same(profile.branches.map(b=>b.condition),read.conditions)) return ['Historical vineyard conditions differ from source'];
  if(rule.original!==profile.definition.evidence[0].quote || !same(rule.evidence,profile.definition.evidence)) return ['Conditional rule evidence mismatch'];
  if(typeof validateBranch!=='function' || typeof reparseBranch!=='function') return ['Conditional branch validators are unavailable'];
  const errors=[];
  for(const [index,branch] of profile.branches.entries()) {
    errors.push(...validateBranch(branch.rule));
    const expected=reparseBranch(index===0?read.current:read.legacy,profile.definition.evidence[index===0?0:2],branch.rule);
    if(!expected || !same(expected,branch.rule)) errors.push('Conditional branch differs from source-recomputed recipe');
  }
  const ids=[...new Set(profile.branches.flatMap(b=>b.rule.grapeIds))].sort();
  if(!same(ids,[...(rule.grapeIds || [])].sort()) || rule.constraints?.length) errors.push('Conditional permitted universe or constraints were changed');
  return errors;
}

// Closed two-row recipes are source bounded; open collection wording cannot
// enter this path and must use the separately validated source-domain proof.
export function compileClosedHistoricalRows(text) {
  const clean=compact(text).replace(/^Articolo 2 (?:base ampelografica|Base ampelografia)\s*/i,'').replace(/^1\.\s*/,'');
  const body=clean.match(/^(?:I vini a d\.?o\.?c\.?g\.? [“"«][^”"»]+[”"»] devono essere ottenuti dalle uve provenienti da vigneti aventi, nell[’']ambito aziendale, la seguente composizione ampelografica|La Denominazione di Origine Controllata [“"«][^”"»]+[”"»] è riservata ai vini ottenuti da uve a bacca nera, non aromatiche, provenienti dai seguenti vitigni, presenti in ambito aziendale):\s*(.+)$/i)?.[1];
  if(!body) return null;
  const match=body.match(/^-?\s*([\p{L}'’ -]+):?\s+minimo\s+(\d+(?:[,.]\d+)?)\s*%;\s*-?\s*([\p{L}'’, -]+?)(?:,?\s+da soli o congiuntamente):?\s+massimo\s+(\d+(?:[,.]\d+)?)\s*%\.$/iu);
  if(!match) return null;
  const principal=match[1].trim(),names=match[3].split(/\s*,\s*|\s+e\s+/).map(x=>x.trim()).filter(Boolean);
  const min=Number(match[2].replace(',','.')),max=Number(match[4].replace(',','.'));
  if(!names.length || min<0 || min>100 || max<0 || max>100 || min+max!==100 || new Set([principal,...names].map(key)).size!==names.length+1) return null;
  return {basis:'vineyard',sourceRelation:'grapes-from-vineyard',named:[{names:[principal],min},{names,max}]};
}

const onlyKeys=(v,keys)=>v && typeof v==='object' && !Array.isArray(v) && Object.keys(v).every(k=>keys.includes(k)) && keys.every(k=>Object.hasOwn(v,k));
const sameSet=(a,b)=>same([...a].sort(),[...b].sort()) && new Set(a).size===a.length && new Set(b).size===b.length;
export function conditionalVineyardWitnesses(rule) {
 if(rule?.conditionalUse?.profile==='it-grandfathered-subzone-v1')return historicalSubzoneWitnesses(rule);
 try {
  if(!onlyKeys(rule,['complete','basis','grapeIds','constraints','original','evidence','conditionalUse']) || rule.complete!==false || !['vineyard','unknown'].includes(rule.basis) || !Array.isArray(rule.constraints) || rule.constraints.length) return null;
  const p=rule.conditionalUse;
  if(!onlyKeys(p,['profile','definition','scope','referenceDate','identityBindings','branches']) || p.profile!=='it-grandfathered-vineyard-v1') return null;
  if(!onlyKeys(p.scope,['entityId','denomination','wineName','wineType']) || Object.values(p.scope).some(x=>typeof x!=='string'||!x.trim()) || key(p.scope.denomination)!==key(p.definition.denomination)) return null;
  const read=readHistoricalVineyardDefinition(p.definition);
  if(!read || !Array.isArray(p.branches) || p.branches.length!==2 || rule.original!==p.definition.evidence[0].quote || !same(rule.evidence,p.definition.evidence)) return null;
  if(!validDate(p.referenceDate))return null;
  const bindings=p.identityBindings;
  if(!Array.isArray(bindings) || !bindings.length || bindings.some(b=>!onlyKeys(b,['grapeId','sourceName','canonicalName','evidence']) || !b.grapeId || !b.sourceName || key(b.sourceName)!==key(b.canonicalName) || !Array.isArray(b.evidence) || !b.evidence.length || !b.evidence.every(evidenceValid)) || new Set(bindings.map(b=>key(b.sourceName))).size!==bindings.length) return null;
  const witnesses=[];
  for(const [i,b] of p.branches.entries()) {
   const original=i===0?read.current:read.legacy,source=p.definition.evidence[i===0?0:2];
   if(!onlyKeys(b,['condition','rule']) || !same(b.condition,read.conditions[i]) || b.rule.original!==original || !b.rule.evidence?.some(e=>e.sourceId===source.sourceId && e.quote===original)) return null;
   let witness,permissionWitness;
   if(b.rule.sourceDomain) {
    if(!same(b.rule.sourceDomain.scope,p.scope) || b.rule.sourceDomain.definition.sourceId!==source.sourceId) return null;
    if(!sourceDomainWitness(b.rule))return null;witness=b.rule;
   } else {
    if((!b.rule.complete && !(i===0 && read.conditions[0].requirements)) || b.rule.alternatives || b.rule.conditionalUse || !['vineyard','unknown'].includes(b.rule.basis)) return null;
    const compiled=compileClosedHistoricalRows(original) || compileClosedNamedVineyardDefinition(original);
    if(!compiled)return null;
    const named=[...new Set(compiled.named.flatMap(r=>r.names))];
    const mapped=named.map(name=>bindings.find(x=>key(x.sourceName)===key(name)));
    if(mapped.some(x=>!x))return null;
    const ids=mapped.map(x=>x.grapeId);
    const constraints=compiled.named.map(row=>({grapeIds:row.names.map(name=>bindings.find(x=>key(x.sourceName)===key(name)).grapeId),...(row.min===undefined?{}:{min:row.min}),...(row.max===undefined?{}:{max:row.max}),basis:b.rule.basis}));
    if(!sameSet(ids,b.rule.grapeIds) || !same(constraints,b.rule.constraints.map(({evidence,...rest})=>rest)) || b.rule.constraints.some(c=>!Array.isArray(c.evidence)||!c.evidence.length||c.evidence.some(e=>e.sourceId!==source.sourceId||!evidenceValid(e))))return null;
    if(b.rule.basis==='unknown') {
      if(i!==0 || !read.conditions[0].requirements || compiled.named.length!==2 || compiled.named[0].names.length!==1 || compiled.named[0].min>100 || compiled.named[0].max!==undefined || compiled.named[1].min!==undefined || compiled.named[1].max<0) return null;
      permissionWitness={kind:'homogeneous-named-source',grapeId:ids[0]};witness=b.rule;
    } else witness={...b.rule,complete:true};
   }
   const timingStatus=!b.condition.adaptationDeadline ? 'unlimited' : p.referenceDate<b.condition.adaptationDeadline ? 'active' : p.referenceDate===b.condition.adaptationDeadline ? 'boundary-unknown' : 'expired';
   const active=!['boundary-unknown','expired'].includes(timingStatus);
   witnesses.push({rule:witness,condition:b.condition,active,timingStatus,...(permissionWitness?{permissionWitness}:{})});
  }
  if(rule.basis!==(p.branches.every(b=>b.rule.basis==='vineyard')?'vineyard':'unknown'))return null;
  const ids=[...new Set(p.branches.flatMap(b=>b.rule.grapeIds))];
  const activeIds=[...new Set(witnesses.filter(w=>w.active).flatMap(w=>w.permissionWitness ? [w.permissionWitness.grapeId] : w.rule.grapeIds))];
  if(!sameSet(activeIds,rule.grapeIds) || !sameSet(ids,bindings.map(b=>b.grapeId)))return null;
  return witnesses;
 } catch {return null;}
}
export function conditionalVineyardEvidence(rule) {
 const p=rule?.conditionalUse;
 return p ? [...(p.definition?.evidence||[]),...(p.identityBindings||[]).flatMap(b=>b.evidence||[]),...(p.branches||[]).flatMap(b=>b.rule?.evidence||[])] : [];
}

function validDate(value) {if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;}
