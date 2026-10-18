import {proofValuesEqual as eq} from './proof-value-equality.mjs';
import {reviewedProductionContext,reviewedLabelClauses} from './source-context-proof.mjs';
import {key} from './text-key.mjs';
const compact=x=>String(x||'').replace(/\s+/g,' ').trim();

const evidence=e=>e&&/^source-[a-f0-9]{64}$/.test(e.sourceId||'')&&e.locator&&e.quote;
const fields=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).every(k=>keys.includes(k))&&keys.every(k=>Object.hasOwn(x,k));
export function readAuthorizedVarietalLabelDefinition(definition,scope) {
 if(!fields(definition,['evidence'])||!Array.isArray(definition.evidence)||definition.evidence.length!==4||!definition.evidence.every(evidence)||new Set(definition.evidence.map(e=>e.sourceId)).size!==1)return null;
 if(!fields(scope,['entityId','denomination','wineName','wineType'])||Object.values(scope).some(x=>typeof x!=='string'||!x.trim()))return null;
 if(!reviewedProductionContext(definition.evidence[3],scope,'authorized-varietal-label')||!reviewedLabelClauses(definition.evidence.slice(1,3),scope,'authorized-varietal-label'))return null;
 const [recipe,authorization,color]=definition.evidence.map(e=>compact(e.quote).replace(/^\d+\.\s*/,''));
 const rule=recipe.match(/^Nell[’']ambito dei vini spumanti, la denominazione di origine controllata [“"]([^”"]+)[”"] seguita da una delle specificazioni di vitigno:\s*([\p{L};\s]+);\s*è riservata ai vini spumanti ottenuti dalle uve provenienti dai vigneti costituiti dai rispettivi vitigni per almeno l[’'](\d+(?:[,.]\d+)?)%; possono concorrere per la restante parte i vitigni ([\p{L}\s/]+)\.$/iu);
 const label=authorization.match(/^In sede di designazione, per gli spumanti ottenuti da ([\p{L},\s]+), e' ammesso il sinonimo ([\p{L}\s]+)\. Per i vini rossi [“"]([^”"]+)[”"] Pinot nero è consentito altresì il sinonimo Pinot noir\.[”"]?$/iu);
 if(!rule||!label||key(rule[1])!==key(scope.denomination)||key(label[3])!==key(scope.denomination))return null;
 let principals=rule[2].split(';').map(x=>x.trim()).filter(Boolean),allowed=rule[4].split(/\s+e\/o\s+/i).map(x=>x.trim());
 const authorized=label[1].split(/,\s*|\s+e\s+/i).map(x=>x.trim()),synonym=label[2].trim(),minimum=Number(rule[3].replace(',','.'));
 if(principals.length<2||principals.length>5||new Set(principals.map(key)).size!==principals.length||!eq(principals.map(key).sort(),authorized.map(key).sort())||principals.some(n=>!allowed.some(a=>key(a)===key(n)))||new Set(allowed.map(key)).size!==allowed.length||minimum<=0||minimum>100)return null;
 const full=compact(definition.evidence[3].quote),selected=compact(definition.evidence[0].quote);
 if(!full.includes(selected))return null;
 const outside=full.replace(selected,' '),escape=x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const targetHead=new RegExp(`(?:[“"]${escape(scope.denomination)}[”"]\\s+${escape(synonym)}|\\b(?:vino|tipologia|specificazione|per(?: il)?)\\s+[“"]?${escape(synonym)}[”"]?)(?=\\s*(?:[;:,.]|(?:è|e'|deve|sono|si|spumante|riserva)\\b))`,'i');
 if(targetHead.test(outside))return null;
 const target=key(scope.wineName),base=key(scope.denomination+' '+synonym),type=key(scope.wineType);
 if(!['spumante','bianco spumante','rosato spumante'].includes(type)||/frizzante|passito|rosso|liquoroso/.test(type)||![base,base+' spumante',base+' spumante rosato'].includes(target))return null;
 if(/rosato/.test(type)||target.endsWith(' rosato')) {
  const m=color.match(/^Nella designazione e presentazione dei vini a denominazione di origine controllata [“"]([^”"]+)[”"] spumante rosato, anche con specificazione dei vitigni ([\p{L},\s-]+) è consentito utilizzare anche i termini [“"]rosa[”"] o [“"]rosé[”"]\.$/iu);
  if(!m||key(m[1])!==key(scope.denomination)||!m[2].split(/,\s*|\s+e\s+/).some(n=>key(n)===key(synonym)))return null;
  const roseNames=m[2].split(/,\s*|\s+e\s+/).map(key);principals=principals.filter(n=>roseNames.includes(key(n)));if(!principals.length)return null;
 }
 return {principals,allowed,synonym,minimum};
}
function built(definition,scope,bindings) {
 const read=readAuthorizedVarietalLabelDefinition(definition,scope);if(!read)return null;
 if(!Array.isArray(bindings)||bindings.length!==read.allowed.length||bindings.some(b=>!fields(b,['grapeId','sourceName','canonicalName','evidence'])||!b.grapeId||key(b.sourceName)!==key(b.canonicalName)||!Array.isArray(b.evidence)||!b.evidence.length||!b.evidence.every(evidence))||new Set(bindings.map(b=>key(b.sourceName))).size!==bindings.length||new Set(bindings.map(b=>b.grapeId)).size!==bindings.length)return null;
 const id=name=>bindings.find(b=>key(b.sourceName)===key(name))?.grapeId;
 if(read.allowed.some(n=>!id(n)))return null;
 const ids=read.allowed.map(id),proof=definition.evidence;
 return read.principals.map(principal=>({condition:{kind:'authorized_varietal_label',label:read.synonym,method:'spumante',namedVarietal:principal,original:proof[1].quote,evidence:proof},rule:{complete:true,basis:'vineyard',grapeIds:ids,constraints:[{grapeIds:[id(principal)],min:read.minimum,basis:'vineyard',evidence:[proof[0]]},{grapeIds:ids.filter(g=>g!==id(principal)),max:100-read.minimum,basis:'vineyard',evidence:[proof[0]]}],original:proof[0].quote,evidence:proof}}));
}
export function compileAuthorizedVarietalLabelUse({definition,scope,identityBindings,referenceDate}) {
 const branches=built(definition,scope,identityBindings);if(!branches)return null;
 return {complete:false,basis:'vineyard',grapeIds:[...new Set(branches.flatMap(b=>b.rule.grapeIds))],constraints:[],original:definition.evidence[0].quote,evidence:definition.evidence,conditionalUse:{profile:'it-authorized-varietal-label-v1',nonExhaustive:true,definition,scope,referenceDate,identityBindings,branches}};
}
export function authorizedVarietalLabelWitnesses(rule) {
 try {
 if(!fields(rule,['complete','basis','grapeIds','constraints','original','evidence','conditionalUse'])||rule.complete!==false||rule.basis!=='vineyard'||!Array.isArray(rule.constraints)||rule.constraints.length)return null;
 const p=rule.conditionalUse;if(!fields(p,['profile','nonExhaustive','definition','scope','referenceDate','identityBindings','branches'])||p.profile!=='it-authorized-varietal-label-v1'||p.nonExhaustive!==true||!/^\d{4}-\d{2}-\d{2}$/.test(p.referenceDate||'')||new Date(p.referenceDate+'T00:00:00Z').toISOString().slice(0,10)!==p.referenceDate)return null;
 const branches=built(p.definition,p.scope,p.identityBindings);if(!branches||!eq(branches,p.branches)||rule.original!==p.definition.evidence[0].quote||!eq(rule.evidence,p.definition.evidence)||!eq(rule.grapeIds,[...new Set(branches.flatMap(b=>b.rule.grapeIds))]))return null;
 return branches.map(b=>({...b,active:true,timingStatus:'unlimited'}));
 }catch{return null;}
}
export function authorizedVarietalLabelEvidence(rule){return [...(rule?.conditionalUse?.definition?.evidence||[]),...(rule?.conditionalUse?.identityBindings||[]).flatMap(b=>b.evidence||[])];}
