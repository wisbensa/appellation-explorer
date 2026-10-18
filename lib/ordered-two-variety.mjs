import {proofValuesEqual as same} from './proof-value-equality.mjs';
import{key}from'./text-key.mjs';
const compact=value=>String(value||'').replace(/\s+/g,' ').trim();
export function compileOrderedTwoVarietyDefinition(text){
 const clause=compact(String(text).replace(/\(solo per vini spumanti\)[ \t]*(?=\n)/g,'(solo per vini spumanti);')).replace(/^\d+\.\s*/,'');
 const m=clause.match(/^La denominazione di origine controllata [“"]([^”"]+)[”"] con la specificazione di due vitigni è riservata al vino, al vino spumante ed al vino frizzante ottenuto dal taglio di mosti o di vini, di colore analogo, delle varietà di vite di seguito indicate:\s*-\s*a bacca bianca\s+(.+?)\s+nonché ([\p{L}\s]+) \(vinificato in bianco o in rosato\)\.\s*-\s*a bacca nera:\s*(.+?)\s+Il vino così ottenuto deve derivare integralmente dai due vitigni indicati\. La varietà che concorre in misura minore deve rappresentare almeno il (\d+(?:[,.]\d+)?)% del totale e nella designazione e presentazione del prodotto, deve seguire il nome della varietà prevalente\.$/iu);
 if(!m)return null;
 const names=part=>part.split(';').map(x=>x.trim()).filter(Boolean);
 const white=names(m[2]),black=names(m[4]),minimum=Number(m[5].replace(',','.'));
 if(!white.length||!black.length||minimum<=0||minimum>=50)return null;
 const read=items=>items.map(label=>{const match=label.match(/^([\p{L}][\p{L}'’ -]*?)(?:\s*\(solo per vini (spumanti)\))?$/u);return match?{name:match[1].trim(),...(match[2]?{method:'spumante'}:{})}:null;});
 const w=read(white),b=read(black),special=m[3].trim();
 if([...w,...b].some(x=>!x)||new Set(w.map(x=>key(x.name))).size!==w.length||new Set(b.map(x=>key(x.name))).size!==b.length||!b.some(x=>key(x.name)===key(special)))return null;
 return {denomination:m[1],basis:'wine',materialAlternatives:['must','wine'],analogousMaterialColor:true,exactVarieties:2,total:100,minorityMinimum:minimum,firstStrictlyPredominant:true,groups:{white:[...w,{name:special,vinificationColors:['bianco','rosato']}],black:b},original:text};
}

import{reviewedProductionContext,reviewedLabelClauses}from'./source-context-proof.mjs';
const evidence=e=>e&&/^source-[a-f0-9]{64}$/.test(e.sourceId||'')&&e.locator&&e.quote;
const fields=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).every(k=>keys.includes(k))&&keys.every(k=>Object.hasOwn(x,k));

function readPairDefinition(definition,scope){
 if(!fields(definition,['evidence'])||!Array.isArray(definition.evidence)||definition.evidence.length!==5||!definition.evidence.every(evidence)||new Set(definition.evidence.map(e=>e.sourceId)).size!==1||!fields(scope,['entityId','denomination','wineName','wineType']))return null;
 if(!reviewedProductionContext(definition.evidence[4],scope,'ordered-two-variety')||!reviewedLabelClauses(definition.evidence.slice(1,4),scope,'ordered-two-variety'))return null;
 const compiled=compileOrderedTwoVarietyDefinition(definition.evidence[0].quote);if(!compiled||key(compiled.denomination)!==key(scope.denomination)||!compact(definition.evidence[4].quote).includes(compact(definition.evidence[0].quote)))return null;
 const name=key(scope.wineName),base=key(scope.denomination),type=key(scope.wineType);
 if(!name.startsWith(base+' ')||/passito|liquoroso|riserva|superiore/.test(type))return null;
 const suffix=name.slice(base.length+1),generic=suffix.match(/^(frizzante )?con specificazione di due vitigni a bacca (bianca|nera)$/);
 if(generic){const color=generic[2]==='bianca'?'bianco':'rosso';if(type!==color+(generic[1]?' frizzante':''))return null;return {compiled,color,group:generic[2]==='bianca'?'white':'black',method:generic[1]?'frizzante':'still'};}
 const [authorization,pairAuthorization,roseAuthorization]=definition.evidence.slice(1,4).map(e=>compact(e.quote).replace(/^\d+\.\s*/,''));
 const alias=authorization.match(/^In sede di designazione, per gli spumanti ottenuti da ([\p{L},\s]+), e' ammesso il sinonimo ([\p{L}\s]+)\. Per i vini rossi [“"]([^”"]+)[”"] Pinot nero è consentito altresì il sinonimo Pinot noir\.[”"]?$/iu);
 const pair=pairAuthorization.match(/^Ferme restando le disposizioni comunitarie e nazionali riguardanti gli spumanti, la denominazione di origine controllata [“"]([^”"]+)[”"] con le specificazioni [“"]([^”"]+)[”"] e [“"]([^”"]+)[”"] puo' essere utilizzata per designare i vini spumanti ottenuti con la mescolanza dei mosti o vini ottenuti da uve di vigneti delle rispettive varieta' iscritti agli schedari viticoli del presente disciplinare, che corrispondono alle condizioni ed ai requisiti stabiliti dal presente disciplinare e con la prevalenza quantitativa di quello indicato per primo\.$/iu);
 if(!['spumante','bianco spumante','rosato spumante'].includes(type)||!alias||!pair||key(alias[3])!==base||key(pair[1])!==base||!/\bspumante\b/.test(type)||/frizzante|rosso/.test(type))return null;
 const designation=[pair[2],pair[3]].map(n=>n.split(/\s*-\s*/)).find(parts=>parts.length===2&&[key(parts.join(' ')+' spumante'),key(parts.join(' ')+' spumante rosato')].includes(suffix));
 if(!designation)return null;
 const aliasName=alias[2].trim(),aliasMembers=alias[1].split(/,\s*|\s+e\s+/).map(n=>n.trim());
 if(designation.filter(n=>key(n)===key(aliasName)).length!==1||aliasMembers.some(n=>!compiled.groups.white.some(g=>key(g.name)===key(n))))return null;
 const color=/rosato/.test(type)?'rosato':'bianco';
 if(suffix.endsWith(' rosato')!==(color==='rosato'))return null;
 if(color==='rosato'){
  const rose=roseAuthorization.match(/^Nella designazione e presentazione dei vini a denominazione di origine controllata [“"]([^”"]+)[”"] spumante rosato, anche con specificazione dei vitigni ([\p{L},\s-]+) è consentito utilizzare anche i termini [“"]rosa[”"] o [“"]rosé[”"]\.$/iu);
  if(!rose||key(rose[1])!==base||!rose[2].split(/,\s*|\s+e\s+/).some(n=>key(n)===key(designation.join(' '))))return null;
 }
 const permittedAliases=color==='rosato'?aliasMembers.filter(n=>compiled.groups.white.some(g=>key(g.name)===key(n)&&g.vinificationColors?.includes('rosato'))):aliasMembers;
 return {compiled,color,group:'white',method:'spumante',designation,aliasName,aliasMembers:permittedAliases};
}
function buildPairs(definition,scope,bindings){
 const read=readPairDefinition(definition,scope);if(!read||!Array.isArray(bindings)||bindings.length<2||bindings.some(b=>!fields(b,['grapeId','sourceName','canonicalName','evidence'])||!b.grapeId||key(b.sourceName)!==key(b.canonicalName)||!Array.isArray(b.evidence)||!b.evidence.length||!b.evidence.every(evidence))||new Set(bindings.map(b=>key(b.sourceName))).size!==bindings.length||new Set(bindings.map(b=>b.grapeId)).size!==bindings.length)return null;
 const candidates=read.compiled.groups[read.group].filter(g=>(!g.method||g.method===read.method)&&(!g.vinificationColors||g.vinificationColors.includes(read.color)));
 if(bindings.some(b=>!candidates.some(g=>key(g.name)===key(b.sourceName))))return null;
 const pairs=[];
 for(const first of bindings)for(const second of bindings){
  if(first.grapeId===second.grapeId)continue;
  if(read.designation&&!read.designation.every((label,i)=>key(label)===key(read.aliasName)?read.aliasMembers.some(n=>key(n)===key([first,second][i].sourceName)):key(label)===key([first,second][i].sourceName)))continue;
  const ids=[first.grapeId,second.grapeId],proof=definition.evidence;
  const condition={kind:'ordered_two_variety_material',material:'wine',sourceMaterialAlternatives:read.compiled.materialAlternatives,minorityMinimum:read.compiled.minorityMinimum,analogousMaterialColor:true,color:read.color,method:read.method,orderedVarieties:[first.sourceName,second.sourceName],displayedVarieties:read.designation||[first.sourceName,second.sourceName],vinification:[first,second].flatMap(b=>candidates.find(g=>key(g.name)===key(b.sourceName))?.vinificationColors?[{variety:b.sourceName,color:read.color}]:[]),original:proof[0].quote,evidence:proof};
  const constraints=[{grapeIds:[ids[0]],min:50,minExclusive:true,max:100-read.compiled.minorityMinimum,basis:'wine',evidence:[proof[0]]},{grapeIds:[ids[1]],min:read.compiled.minorityMinimum,max:50,maxExclusive:true,basis:'wine',evidence:[proof[0]]}];
  pairs.push({condition,rule:{complete:true,basis:'wine',grapeIds:ids,constraints,original:proof[0].quote,evidence:proof}});
 }
 return pairs.length?pairs:null;
}
export function compileOrderedTwoVarietyUse({definition,scope,identityBindings,referenceDate}){
 const branches=buildPairs(definition,scope,identityBindings);if(!branches)return null;
 return {complete:false,basis:'wine',grapeIds:[...new Set(branches.flatMap(b=>b.rule.grapeIds))],constraints:[],original:definition.evidence[0].quote,evidence:definition.evidence,conditionalUse:{profile:'it-ordered-two-variety-v1',nonExhaustive:true,definition,scope,referenceDate,identityBindings}};
}
export function orderedTwoVarietyWitnesses(rule){try{
 if(!fields(rule,['complete','basis','grapeIds','constraints','original','evidence','conditionalUse'])||rule.complete!==false||rule.basis!=='wine'||!Array.isArray(rule.constraints)||rule.constraints.length)return null;
 const p=rule.conditionalUse;if(!fields(p,['profile','nonExhaustive','definition','scope','referenceDate','identityBindings'])||p.profile!=='it-ordered-two-variety-v1'||p.nonExhaustive!==true||!/^\d{4}-\d{2}-\d{2}$/.test(p.referenceDate||'')||new Date(p.referenceDate+'T00:00:00Z').toISOString().slice(0,10)!==p.referenceDate)return null;
 const branches=buildPairs(p.definition,p.scope,p.identityBindings);if(!branches||rule.original!==p.definition.evidence[0].quote||!same(rule.evidence,p.definition.evidence)||!same(rule.grapeIds,[...new Set(branches.flatMap(b=>b.rule.grapeIds))]))return null;
 return branches.map(b=>({...b,active:true,timingStatus:'unlimited'}));
}catch{return null;}}
export function orderedTwoVarietyEvidence(rule){return [...(rule?.conditionalUse?.definition?.evidence||[]),...(rule?.conditionalUse?.identityBindings||[]).flatMap(b=>b.evidence||[])];}
export function orderedTwoVarietyCandidates(definition,scope){const r=readPairDefinition(definition,scope);return r?r.compiled.groups[r.group].filter(g=>(!g.method||g.method===r.method)&&(!g.vinificationColors||g.vinificationColors.includes(r.color))).filter(g=>!r.designation||r.designation.some(n=>key(n)===key(g.name))||r.aliasMembers.some(n=>key(n)===key(g.name))):[];}
