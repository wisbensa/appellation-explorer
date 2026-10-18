import {isSourceDomainRegistrationNumber} from './variety-registration-code.mjs';
import {declaredAnnexParent} from './declared-annex-scope.mjs';
import {joinSourceLineHyphens,withoutGazettePageBreaks} from './source-layout.mjs';
import {nationalCultivarIdentityEvidence} from './national-cultivar-identity-proof.mjs';
// Browser-safe source grammar for an explicitly scoped non-aromatic annex.
// No global botanical/aromatic classification is created by this profile.
export const SCOPED_ANNEX_PROFILE='it-scoped-annex-vineyard-v1';
const norm=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/\s+/g,' ').trim();
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const fields=(x,ks)=>obj(x)&&Object.keys(x).every(k=>ks.includes(k))&&ks.every(k=>Object.hasOwn(x,k));
const ev=x=>Array.isArray(x)&&x.length&&x.every(e=>e?.sourceId&&e.locator&&typeof e.quote==='string'&&e.quote.trim());
const bound=e=>fields(e,['sourceId','sourceHash','locator','quote'])&&/^[a-f0-9]{64}$/.test(e.sourceHash)&&e.sourceId===`source-${e.sourceHash}`&&e.locator&&e.quote;
// Retain both spellings. Apostrophe typography is not a synonym: require an
// exact source-bound registration/name row before bridging different forms.
const typography=s=>String(s||'').normalize('NFC').replace(/[‘’]/g,"'").toLowerCase().replace(/\s+/g,' ').trim();
const collisionKey=s=>norm(s).replace(/[‘’]/g,"'");
const registrationCode=s=>String(s).replace(/^0+(?=\d)/,'');
function regionalIdentityEvidence(e,registrationNumber,canonicalName,color){
 if(!/^source-[a-f0-9]{64}$/.test(e?.sourceId||'')||!isSourceDomainRegistrationNumber(registrationNumber)||typeof canonicalName!=='string')return false;
 const row=e.quote?.match(/^(\d{1,4}) ([\p{L}][\p{L}'’ -]*?) (B|N|G|Rs)\.? (I|O) (?:D\.M\.?\s*\d{1,2}\/\d{1,2}\/\d{2,4}|Reg\. \d+\/\d{4})$/u);
 const locator=e.locator?.match(/^page [1-9]\d*, registration (\d{3,4})$/);
 return Boolean(row&&locator&&registrationCode(row[1])===registrationCode(registrationNumber)&&registrationCode(locator[1])===registrationCode(registrationNumber)&&typography(row[2])===typography(canonicalName)&&row[3]===color);
}
const bindingNameVerified=(b,color)=>norm(b.sourceName)===norm(b.canonicalName)||
 (collisionKey(b.sourceName)===collisionKey(b.canonicalName)&&(b.evidence||[]).some(e=>nationalCultivarIdentityEvidence(e,b.registrationNumber,b.canonicalName)))||
 (typography(b.sourceName)===typography(b.canonicalName)&&(b.evidence||[]).some(e=>regionalIdentityEvidence(e,b.registrationNumber,b.canonicalName,color)));
export function compileScopedAnnexDefinition(definition,annexDefinition,scope,context,declarationContext){
 if(context||declarationContext){
  if(!bound(context)||!bound(declarationContext)||context.sourceId!==definition?.sourceId||declarationContext.sourceId!==definition?.sourceId)return null;
  const parent=declaredAnnexParent(declarationContext.quote,context.quote,definition.quote,scope);
  return parent?compileScopedAnnexDefinition(definition,annexDefinition,parent):null;
 }
 if(!bound(definition)||!bound(annexDefinition)||definition.sourceId!==annexDefinition.sourceId||!fields(scope,['entityId','denomination','wineName','wineType','region'])||!scope.entityId||!['bianco','rosso'].includes(scope.wineType)||norm(scope.wineName)!==`${norm(scope.denomination)} ${scope.wineType}`)return null;
 const clause=joinSourceLineHyphens(definition.quote).replace(/\s+/g,' ').trim().replace(/^Art(?:icolo|\.)\s*2\.?\s+Base ampelografica\s*/i,'');
 const m=clause.match(/^(?:\d+\.\s*)?La denominazione di origine controllata [“"«]([^”"»]+)[”"»] senza alcuna specificazione è riservata al vino bianco o rosso ottenuto da uve provenienti da vigneti composti da uno o più vitigni a bacca di colore analogo, non aromatici, idonei alla coltivazione nella regione ([\p{L}'’ -]+), iscritti nel Registro Nazionale delle varietà di vite per uve da vino, riportati nell['’]allegato (\d+) del presente disciplinare\.$/iu);
 if(!m||norm(m[1])!==norm(scope.denomination)||norm(m[2])!==norm(scope.region))return null;
 const a=annexDefinition.quote.match(/^ALLEGATO\s+(\d+)\s*\nElenco delle varietà non aromatiche idonee alla coltivazione nella\s+Regione\s+([\p{L}'’ -]+),\s*per la\s+produzione dei vini a DOP\s+[“"«]([^”"»]+)[”"»]\s+tipologia Bianco e tipologia Rosso\.\s*\nVarietà\s*\n([\s\S]+)$/u);
 if(!a||a[1]!==m[3]||norm(a[2])!==norm(scope.region)||norm(a[3])!==norm(scope.denomination))return null;
 const rows=[];
 for(const line of withoutGazettePageBreaks(a[4]).split('\n').map(s=>s.trim()).filter(Boolean)){
  const r=line.match(/^([\p{L}][\p{L}\p{M}'’ -]*?)\s+(B|N|G|Rs)\.?$/u);if(!r)return null;
  rows.push({name:r[1],code:r[2]});
 }
 if(!rows.length||new Set(rows.map(r=>collisionKey(r.name))).size!==rows.length)return null;
 const known=rows.filter(r=>r.code===(scope.wineType==='bianco'?'B':'N'));
 if(!known.length)return null;
 return {basis:'vineyard',sourceRelation:'grapes-from-vineyard',known,unresolved:rows.filter(r=>!['B','N'].includes(r.code)),original:definition.quote};
}
export function scopedAnnexDomainEvidence(rule){const d=rule?.sourceDomain;return d?.profile===SCOPED_ANNEX_PROFILE?[d.definition,d.annexDefinition,d.context,d.declarationContext,...(d.scopeEvidence||[]),...(d.identityBindings||[]).flatMap(b=>b.evidence||[])].filter(Boolean):[];}
function auditedScopedAnnexDefinition(rule){
 try{
 const d=rule?.sourceDomain,declared=Object.hasOwn(d||{},'declarationContext');if(!fields(d,['profile','definition','annexDefinition','scope','scopeEvidence','identityBindings',...(declared?['context','declarationContext']:[])])||d.profile!==SCOPED_ANNEX_PROFILE||rule.complete!==false||rule.alternatives||rule.basis!=='vineyard'||rule.original!==d.definition.quote||!ev(d.scopeEvidence))return null;
 const compiled=compileScopedAnnexDefinition(d.definition,d.annexDefinition,d.scope,d.context,d.declarationContext);if(!compiled||!ev(rule.evidence)||![d.definition,d.annexDefinition,...(declared?[d.context,d.declarationContext]:[])].every(e=>rule.evidence.some(r=>r.sourceId===e.sourceId&&r.locator===e.locator&&r.quote===e.quote)))return null;
 if(d.scopeEvidence.some(e=>e.sourceId!==d.definition.sourceId)||(!declared&&!d.scopeEvidence.some(e=>norm(e.quote.replace(/[“”"«»]/g,'').replace(/[.;]\s*$/,''))===norm(d.scope.wineName))))return null;
 return compiled;
 }catch{return null;}
}
export function scopedAnnexDomainDefinitionVerified(rule){
 return Boolean(fields(rule,['complete','basis','grapeIds','constraints','original','evidence','sourceDomain'])&&auditedScopedAnnexDefinition(rule)&&Array.isArray(rule.grapeIds)&&rule.grapeIds.length===0&&Array.isArray(rule.constraints)&&rule.constraints.length===0&&Array.isArray(rule.sourceDomain.identityBindings)&&rule.sourceDomain.identityBindings.length===0);
}
export function scopedAnnexDomainWitness(rule){
 try{
 const compiled=auditedScopedAnnexDefinition(rule),d=rule?.sourceDomain;if(!compiled)return null;
 const bs=d.identityBindings;if(!Array.isArray(bs)||bs.length!==compiled.known.length||bs.some(b=>!fields(b,['grapeId','sourceName','canonicalName','registrationNumber','evidence'])||!b.grapeId||(b.registrationNumber!==null&&(!isSourceDomainRegistrationNumber(b.registrationNumber)))||!ev(b.evidence)||!bindingNameVerified(b,compiled.known.find(r=>r.name===b.sourceName)?.code)))return null;
 if(new Set(bs.map(b=>collisionKey(b.sourceName))).size!==bs.length||new Set(bs.map(b=>collisionKey(b.canonicalName))).size!==bs.length||new Set(bs.filter(b=>b.registrationNumber!==null).map(b=>registrationCode(b.registrationNumber))).size!==bs.filter(b=>b.registrationNumber!==null).length||compiled.known.some(r=>!bs.some(b=>b.sourceName===r.name)))return null;
 const ids=bs.map(b=>b.grapeId);if(new Set(ids).size!==ids.length||JSON.stringify([...ids].sort())!==JSON.stringify([...(rule.grapeIds||[])].sort()))return null;
 const cs=rule.constraints;if(!Array.isArray(cs)||cs.length!==1)return null;const c=cs[0];
 if(!fields(c,['grapeIds','min','max','basis','evidence'])||c.min!==100||c.max!==100||c.basis!=='vineyard'||!ev(c.evidence)||JSON.stringify([...c.grapeIds].sort())!==JSON.stringify([...ids].sort()))return null;
 return {complete:true,basis:'vineyard',grapeIds:ids,constraints:cs,original:rule.original,evidence:rule.evidence};
 }catch{return null;}
}
