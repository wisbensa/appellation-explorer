import {proofValuesEqual as same} from './proof-value-equality.mjs';
// Source-bound child Article 2 and its explicitly referenced parent recipe.
// Neither child wording identifies a percentage denominator; do not borrow
// the parent's vineyard basis or replace the child's principal minimum.
const key=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const compact=s=>String(s||'').replace(/\s+/g,' ').trim();
const clean=s=>compact(s).replace(/^Art(?:icolo|\.)\s*2\s*(?:Base ampelografica\s*)?/i,'');

const valid=e=>e&&/^source-[a-f0-9]{64}$/.test(e.sourceId||'')&&typeof e.quote==='string'&&e.quote&&typeof e.locator==='string'&&e.locator;
const q='[“"«]([^”"»]+)[”"»]';
const target=new RegExp(`^Il vino a d\\.?o\\.?c\\.?g\\.? ${q} superiore ${q}(?: o ${q})?,? deve essere ottenuto dal vitigno ([\\p{L}’' -]+) nella misura minima de(?:ll[’']|l )([0-9]+)%(.*)$`,'iu');
function recipe(text){const m=clean(text).match(target);return m?{denomination:m[1],subzone:m[2],aliases:m[3]?[m[3]]:[],principal:m[4].trim(),min:Number(m[5]),remainder:m[6].trim()}:null;}
export function readHistoricalSubzoneDefinition(d){
 if(d?.profile!=='it-grandfathered-subzone-v1'||!Array.isArray(d.evidence)||d.evidence.length!==6||!d.evidence.every(valid))return null;
 const [current,intro,legacy,pub,approval,parent]=d.evidence;
 const pieces=clean(current.quote).split(/(?=In deroga alle disposizioni di cui al comma 1,)/i);
 const introduced=clean(intro.quote).split(/(?=In deroga alle disposizioni di cui al comma 1,)/i);
 if(pieces.length!==2||introduced.length!==2)return null;
 const now=recipe(pieces[0]),then=recipe(legacy.quote),first=recipe(introduced[0]);
 if(!now||!then||!first||!same(now.aliases.map(key),(d.aliases||[]).map(key)))return null;
 for(const row of [now,then,first])if(key(row.denomination)!==key(d.denomination)||key(row.subzone)!==key(d.subzone)||!same(row.aliases.map(key),now.aliases.map(key))||key(row.principal)!==key(now.principal)||row.min<=0||row.min>100)return null;
 const remainder=s=>key(s.replace(/^,\s*/,''));
 if(now.min!==first.min||remainder(now.remainder)!==remainder(first.remainder)||key(pieces[1])!==key(introduced[1]))return null;
 const open=now.remainder.match(/^,?\s*altri vitigni a bacca nera non aromatici, idonei alla coltivazione nella regione ([\p{L} -]+): massimo (\d+)%\.$/iu);
 const cross=then.remainder.match(new RegExp(`^ed il rimanente(?: (\\d+)%)? da uve di vitigni a bacca nera indicati nel disciplinare del ${q}\\.$`,'iu'));
 if(!open||!cross||key(cross[2])!==key(d.denomination)||now.min+Number(open[2])!==100||cross[1]&&then.min+Number(cross[1])!==100)return null;
 const derogation=compact(pieces[1]);
 const registration=derogation.match(new RegExp(`^In deroga alle disposizioni di cui al comma 1, i vigneti che alla data di pubblicazione del presente decreto sono iscritti allo schedario viticolo per la DOCG ${q} in conformità alle disposizioni di cui all[’']art\\. 2 del relativo disciplinare, approvato con DM (\\d+) ([a-z]+) (\\d{4}), sono idonei alla produzione dei vini di cui all[’']art\\. 1\\.$`,'i'));
 const months={gennaio:1,febbraio:2,marzo:3,aprile:4,maggio:5,giugno:6,luglio:7,agosto:8,settembre:9,ottobre:10,novembre:11,dicembre:12};
 if(!registration||key(registration[1])!==key(d.denomination)||!months[registration[3]])return null;
 const decreeDate=`${registration[4]}-${String(months[registration[3]]).padStart(2,'0')}-${registration[2].padStart(2,'0')}`;
 if(!new RegExp(`DECRETO ${Number(registration[2])} ${registration[3]} ${registration[4]}\\.`,'i').test(compact(approval.quote))||approval.sourceId!==legacy.sourceId||parent.sourceId!==legacy.sourceId)return null;
 const date=d.publicationDate?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
 const publicationTime=new Date(d.publicationDate+'T00:00:00Z');
 if(!date||!Number.isFinite(publicationTime.getTime())||publicationTime.toISOString().slice(0,10)!==d.publicationDate||intro.sourceId!==pub.sourceId)return null;
 const month=Object.keys(months).find(m=>months[m]===Number(date[2]));
 if(!/GAZZETTA UFFICIALE/i.test(pub.quote)||!new RegExp(`\\b${Number(date[3])} ${month} ${date[1]}\\b`,'i').test(compact(pub.quote)))return null;
 const base=clean(parent.quote).match(new RegExp(`^1\\. I vini a d\\.?o\\.?c\\.?g\\.? ${q} devono essere ottenuti dalle uve provenienti da vigneti aventi, nell[’']ambito aziendale, la seguente composizione ampelografica: ([\\p{L}’' -]+): minimo (\\d+)%; ([\\p{L}’', -]+), da soli o congiuntamente: massimo (\\d+)%\\.$`,'iu'));
 if(!base||key(base[1])!==key(d.denomination)||key(base[2])!==key(now.principal)||Number(base[3])+Number(base[5])!==100||d.legacyArticle!==legacy.quote)return null;
 const names=base[4].split(/,\s*|\s+e\s+/).map(s=>s.trim());
 if(names.some(n=>!n)||new Set([now.principal,...names].map(key)).size!==names.length+1||cross[1]&&Number(cross[1])>Number(base[5]))return null;
 const currentText=current.quote.slice(0,current.quote.indexOf('In deroga')).trim();
 return {current:currentText,legacy:legacy.quote,principal:now.principal,names,minimum:[now.min,then.min],legacyCap:cross[1]?Number(cross[1]):null,currentCap:Number(open[2]),conditions:[{kind:'general_rule',original:currentText,evidence:[current]},{kind:'vineyard_registered_by',denomination:d.denomination,subzone:d.subzone,date:d.publicationDate,conformsTo:{decreeDate,article:2},original:derogation,evidence:d.evidence}]};
}
function build(d,scope,referenceDate,bindings){
 const read=readHistoricalSubzoneDefinition(d);if(!read)return null;
 if(!scope||!scope.entityId||key(scope.denomination)!==key(d.denomination)||scope.wineType!=='rosso'||![d.subzone,...d.aliases].some(n=>key(scope.wineName)===key(`${d.denomination} superiore ${n}`)))return null;
 if(referenceDate!==null&&(!/^\d{4}-\d{2}-\d{2}$/.test(referenceDate)||!Number.isFinite(new Date(referenceDate+'T00:00:00Z').getTime())))return null;
 const names=[read.principal,...read.names];
 if(!Array.isArray(bindings)||bindings.length!==names.length||bindings.some((b,i)=>!b.grapeId||key(b.sourceName)!==key(names[i])||key(b.canonicalName)!==key(names[i])||!Array.isArray(b.evidence)||!b.evidence.length||!b.evidence.every(valid)||!same(b.evidence,[d.evidence[i?5:0]]))||new Set(bindings.map(b=>b.grapeId)).size!==bindings.length)return null;
 const ids=bindings.map(b=>b.grapeId);
 const branches=[0,1].map(i=>{const original=i?read.legacy:read.current;const evidence=[{...d.evidence[i?2:0],quote:original},...(i?[d.evidence[5]]:[])];return {condition:read.conditions[i],rule:{complete:false,basis:'unknown',grapeIds:i?ids:[ids[0]],constraints:[{grapeIds:[ids[0]],min:read.minimum[i],basis:'unknown',evidence},...(i&&read.legacyCap!==null?[{grapeIds:ids.slice(1),max:read.legacyCap,basis:'unknown',evidence}]:[])],original,evidence}};});
 return {complete:false,basis:'unknown',grapeIds:[ids[0]],constraints:[],original:d.evidence[0].quote,evidence:structuredClone(d.evidence),conditionalUse:{profile:d.profile,definition:structuredClone(d),scope:structuredClone(scope),referenceDate,identityBindings:structuredClone(bindings),branches}};
}
export function compileHistoricalSubzoneUse(d,parseBranch,{scope,referenceDate=null}={}){
 const read=readHistoricalSubzoneDefinition(d);if(!read)return null;
 const grapes=[];
 for(const [i,name] of [read.principal,...read.names].entries()){
  const evidence=[d.evidence[i?5:0]];
  const parsed=parseBranch(`${name}: 100%`,evidence[0]);
  const grape=parsed?.grapes?.find(g=>key(g.name.original)===key(name));if(!grape)return null;
  grapes.push({...grape,evidence});
 }
 const bindings=grapes.map(g=>({grapeId:g.id,sourceName:g.name.original,canonicalName:g.name.original,evidence:g.evidence}));
 const rule=build(d,scope,referenceDate,bindings);
 return rule?{rule,grapes,unsupported:[],collectionHolds:[]}:null;
}
export function historicalSubzoneWitnesses(rule){
 try{const p=rule?.conditionalUse;if(p?.profile!=='it-grandfathered-subzone-v1')return null;
 const expected=build(p.definition,p.scope,p.referenceDate,p.identityBindings);if(!expected||!same(rule,expected))return null;
 return p.branches.map(b=>({...b,active:true,timingStatus:'unlimited',permissionWitness:{kind:'homogeneous-named-source',grapeId:rule.grapeIds[0]}}));
 }catch{return null;}
}
