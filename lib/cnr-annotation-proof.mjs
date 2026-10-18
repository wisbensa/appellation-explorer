// Shared finite acquired-source proof. No filesystem, network, global aliasing or legal-currentness inference.
import {key} from './text-key.mjs';
import {joinSourceLineHyphens} from './source-layout.mjs';
import {compileNamedVineyardRows} from './source-domain-definition.mjs';
import {sourceIdentityClaimsVerified} from './grape-identity-claims.mjs';
import reviewedIdentities from './reviewed-grape-identity-claims.mjs';
import {nationalCultivarIdentityEvidence} from './national-cultivar-identity-proof.mjs';
import {proofValuesEqual as same} from './proof-value-equality.mjs';
export const CNR_ANNOTATED_PROFILE='it-cnr-annotated-vineyard-v1';
export const CNR_INPUT_PROFILE='cnr-botanical-annotation-input-v1';
export const CNR_PROOF_PROFILE='cnr-botanical-annotation-proof-v1';
export const CNR_ANNOTATION_ROUTE=Object.freeze({head:'Uva rara',annotation:'Bonarda novarese',registrationNumber:'248',recordUrl:'https://vitisdb.it/varieties/show/984',submitterUrl:'https://vitisdb.it/submitters/show/9',institutionUrl:'https://www.cnr.it/it/banche-dati-istituti?cds=121'});
export const CNR_LOCATORS=Object.freeze({registration:'national registration fields: codice and nome ufficiale',history:'shortHistory: complete paragraph',manager:'generalInformationManagedBy: manager',submitter:'generalInfo: Nome and Codice',institution:'Italian Vitis Database: complete institutional panel'});
const fields=(v,ks)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===ks.length&&ks.every(k=>Object.hasOwn(v,k));
const norm=v=>String(v??'').replace(/\s+/g,' ').trim();
const flat=v=>norm(joinSourceLineHyphens(v));
const esc=v=>v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const code=v=>String(v??'').replace(/^0+(?=\d)/,'');
const ev=e=>e&&typeof e.sourceId==='string'&&e.sourceId&&typeof e.locator==='string'&&e.locator&&typeof e.quote==='string'&&e.quote.trim();
const eqev=(a,b)=>a?.sourceId===b?.sourceId&&a?.locator===b?.locator&&a?.quote===b?.quote;
const sourceDefinition=e=>fields(e,['sourceId','sourceHash','locator','quote'])&&/^[a-f0-9]{64}$/.test(e.sourceHash)&&e.sourceId===`source-${e.sourceHash}`&&ev(e)&&e.quote.length<=12000;
const pairPattern=new RegExp(`\\b${esc(CNR_ANNOTATION_ROUTE.head)}\\s*\\(\\s*${esc(CNR_ANNOTATION_ROUTE.annotation)}\\s*\\)`,'iu');
export const hasCnrAnnotationToken=text=>typeof text==='string'&&pairPattern.test(text);

// Complete reviewed narrative grammar. Captured dates/citations are descriptive,
// while subject, positive synonym/variant relation and exclusions are mandatory.
function historyPair(text){
 const n=norm(text).replace(/[‘’]/g,"'");
 const pattern=/^Il nome '([^']+)', utilizzato storicamente per indicare questa varietà nell'Oltrepò pavese, non si ritrova nelle fonti storiche che alla fine del XIX secolo \(Di Rovasenda, (\d{4})\), mentre il sinonimo '([^']+)' è quello con cui ricordano il vitigno per le zone di Ivrea e di Biella rispettivamente Gatta \((\d{4})\) e Milano \((\d{4})\)\. Questo sinonimo \(con le varianti '([^']+)', '([^']+)' e simili\), tuttora utilizzato nelle aree del Piemonte settentrionale, fu in seguito gradualmente rifiutato nei testi ufficiali per evitare confusioni con altri vitigni, tra cui la Bonarda piemontese e la Croatina, chiamata 'Bonarda' nel Pavese e in una ristretta zona dell'Astigiano\. E' sempre Giuseppe di Rovasenda \((\d{4})\) che ricorda come l'Uva rara fosse indicata in alcune zone piemontesi anche come 'Balsamea' o 'Balsamina', forse per via del gradevole aroma dell'uva\.$/u;
 const m=n.match(pattern);return Boolean(m&&key(m[1])===key(CNR_ANNOTATION_ROUTE.head)&&m[3]==='Bonarda'&&m[6]==='Bonarda di Cavaglià'&&m[7]===CNR_ANNOTATION_ROUTE.annotation);
}
export function cnrAnnotationSnapshotVerified(snapshot){
 try{
  if(!fields(snapshot,['profile','sources','registration','history','manager','submitter','institution'])||snapshot.profile!==CNR_INPUT_PROFILE||!Array.isArray(snapshot.sources)||snapshot.sources.length!==3)return false;
  const route=CNR_ANNOTATION_ROUTE,urls=[route.recordUrl,route.submitterUrl,route.institutionUrl];
  if(new Set(snapshot.sources.map(s=>s.url)).size!==3||snapshot.sources.some(s=>!urls.includes(s.url)||s.finalUrl!==s.url||s.kind!=='botanical-annotation-corroboration'||!s.retrievedAt||!Number.isFinite(Date.parse(s.retrievedAt))||! /^[a-f0-9]{64}$/.test(s.sha256)||s.id!==`source-${s.sha256}`))return false;
  for(const name of Object.keys(CNR_LOCATORS)){
   const d=snapshot[name],url=name==='submitter'?route.submitterUrl:name==='institution'?route.institutionUrl:route.recordUrl;
   if(!sourceDefinition(d)||d.locator!==CNR_LOCATORS[name]||!snapshot.sources.some(s=>s.url===url&&s.id===d.sourceId&&s.sha256===d.sourceHash))return false;
  }
  return norm(snapshot.registration.quote)==='codice 248 nome ufficiale Uva rara N.'&&historyPair(snapshot.history.quote)&&norm(snapshot.manager.quote)==='informazioni generali gestite da Istituto per la Protezione Sostenibile delle Piante - CNR'&&norm(snapshot.submitter.quote)==='Nome Istituto per la Protezione Sostenibile delle Piante - CNR Codice ITA360'&&/^Italian Vitis Database Istituto Istituto per la Protezione Sostenibile delle Piante \(IPSP\) Referente Anna SCHNEIDER E-mail: anna\.schneider@ipsp\.cnr\.it Indirizzo internet Url: http:\/\/it\.grapedb\.org$/.test(norm(snapshot.institution.quote));
 }catch{return false;}
}
function annotationVerified(proof,definition){
 return fields(proof,['profile','snapshot','nationalIdentity','productionToken'])&&proof.profile===CNR_PROOF_PROFILE&&cnrAnnotationSnapshotVerified(proof.snapshot)&&nationalCultivarIdentityEvidence(proof.nationalIdentity,CNR_ANNOTATION_ROUTE.registrationNumber,CNR_ANNOTATION_ROUTE.head)&&typeof proof.productionToken==='string'&&new RegExp(`^${pairPattern.source}$`,'iu').test(proof.productionToken)&&definition.quote.includes(proof.productionToken);
}
// A generic bare botanical-parenthetical requirement marker, independent of the
// configured cultivar, source hash, denomination and numeric limits. Existing
// registered/explicit lexical annotations retain their prior proof mechanisms.
export function requiresCnrAnnotationProof(rule){
 const text=typeof rule==='string'?rule:rule?.original;if(typeof text!=='string'||!/vigneti/i.test(text))return false;
 const start=text.search(/composizione\s+(?:varietale|ampelografica)\s*:/i);if(start<0)return false;
 const body=text.slice(start).replace(/^[^:]+:/,'');
 for(const row of body.split(/[;\n]/))for(const m of row.matchAll(/([\p{L}][\p{L}'’ -]*?)\s*\(([^()]*)\)/gu)){
  const head=m[1].trim().replace(/^vitigno\s+/iu,''),annotation=m[2].trim();
  if(/^(?:detta|detto|denominata|denominato|sinonimo)\s+/iu.test(annotation)||/^(?:B|N|G|Rs)\.?$/iu.test(annotation)||/^(?:(?:da )?sol[ioae]|singolarmente) (?:o|e\/o) congiuntamente$/iu.test(annotation))continue;
  if(reviewedIdentities.some(r=>key(r.canonicalName)===key(head)&&r.aliases.some(a=>key(a)===key(annotation))))continue;
  return true;
 }
 return false;
}
function annotatedProductionHeading(text){
 const n=flat(text).replace(/^Art(?:icolo|\.)\s*2\s+Base ampelografica\s*/iu,'');
 return n.match(/^I vini a denominazione di origine controllata [“"«]([^”"»]+)[”"»](?: e [“"«]([^”"»]+)[”"»] (riserva))? devono essere ottenuti dalle uve provenienti, in ambito aziendale, dai vigneti aventi la seguente composizione varietale:\s*(.+)$/iu);
}
export function isCnrAnnotatedProductionCandidate(text){
 if(typeof text!=='string'||text.length>12000)return false;
 const m=annotatedProductionHeading(text);
 return Boolean(m&&(!m[2]||key(m[2])===key(m[1]))&&hasCnrAnnotationToken(m[4]));
}
export function compileCnrAnnotatedDefinition({definition,scope,annotationProof}={}){
 try{
  if(!sourceDefinition(definition)||!fields(scope,['entityId','denomination','wineName','wineType'])||Object.values(scope).some(v=>typeof v!=='string'||!v.trim())||!annotationVerified(annotationProof,definition))return null;
  const m=annotatedProductionHeading(definition.quote);
  if(!m||key(m[1])!==key(scope.denomination)||m[2]&&key(m[2])!==key(m[1])||![key(m[1]),...(m[3]?[key(`${m[1]} riserva`)]:[])].includes(key(scope.wineName)))return null;
  let body=m[4],identityClaims=[],annotationCount=0;
  body=body.replace(/([\p{L}][\p{L}'’ -]*?)\s*\(([^()]*)\)/gu,(whole,head,annotation)=>{
   head=head.trim();annotation=annotation.trim();
   if(key(head)===key(CNR_ANNOTATION_ROUTE.head)&&key(annotation)===key(CNR_ANNOTATION_ROUTE.annotation)){annotationCount++;return head;}
   identityClaims.push({kind:'registered-synonym',canonicalName:head,alias:annotation});return head;
  });
  if(annotationCount!==1||/[()]/.test(body))return null;
  const named=[];
  for(let row of body.split(';').map(norm).filter(Boolean)){
   // Transport this exact maximum-only syntax to the shared range compiler;
   // a joint source group remains one row and one cap.
   const max=row.match(/^(.+?)\s*(?::\s*)?(?:da sol[ei] o congiuntamente\s+)?fino ad un massimo del\s+(\d+(?:[,.]\d+)?)\s*%\.?$/iu);
   if(max)row=`${max[1].trim().replace(/:\s*$/,'')} da 0 al ${max[2]}%`;
   const parsed=compileNamedVineyardRows(row);if(!parsed||parsed.length!==1)return null;named.push(...parsed);
  }
  const names=named.flatMap(r=>r.names);if(!named.length||new Set(names.map(key)).size!==names.length||!names.some(name=>key(name)===key(CNR_ANNOTATION_ROUTE.head))||identityClaims.some(c=>!names.some(n=>key(n)===key(c.canonicalName))))return null;
  return {basis:'vineyard',named,sourceRelation:'grapes-from-vineyard',...(identityClaims.length?{identityClaims}:{})};
 }catch{return null;}
}
export function cnrAnnotatedDomainEvidence(rule){
 const d=rule?.sourceDomain;if(d?.profile!==CNR_ANNOTATED_PROFILE)return [];
 const p=d.annotationProof,s=p?.snapshot;return [d.definition,...(s?Object.keys(CNR_LOCATORS).map(k=>s[k]):[]),p?.nationalIdentity,...(d.identityBindings||[]).flatMap(b=>b.evidence||[])].filter(Boolean);
}
export function cnrAnnotatedDomainWitness(rule){
 try{
  const d=rule?.sourceDomain;
  if(!fields(rule,['complete','basis','grapeIds','constraints','original','evidence','sourceDomain'])||rule.complete!==false||rule.basis!=='vineyard'||!fields(d,['profile','definition','scope','compiled','identityBindings','annotationProof'])||d.profile!==CNR_ANNOTATED_PROFILE||rule.original!==d.definition.quote)return null;
  const compiled=compileCnrAnnotatedDefinition(d);if(!compiled||!same(compiled,d.compiled))return null;
  const bindings=d.identityBindings,names=compiled.named.flatMap(r=>r.names);
  if(!Array.isArray(bindings)||bindings.length!==names.length||bindings.some(b=>!fields(b,['grapeId','sourceName','canonicalName','registrationNumber','evidence'])||!b.grapeId||!/^\d{1,4}$/.test(b.registrationNumber)||key(b.sourceName)!==key(b.canonicalName)||!names.includes(b.sourceName)||!Array.isArray(b.evidence)||!b.evidence.length||b.evidence.some(e=>!ev(e)))||new Set(bindings.map(b=>b.sourceName)).size!==bindings.length||new Set(bindings.map(b=>b.grapeId)).size!==bindings.length)return null;
  const head=bindings.find(b=>key(b.sourceName)===key(CNR_ANNOTATION_ROUTE.head));if(!head||code(head.registrationNumber)!==CNR_ANNOTATION_ROUTE.registrationNumber||!head.evidence.some(e=>eqev(e,d.annotationProof.nationalIdentity)))return null;
  if(bindings.some(b=>!b.evidence.some(e=>nationalCultivarIdentityEvidence(e,b.registrationNumber,b.canonicalName))))return null;
  if(!sourceIdentityClaimsVerified(compiled,bindings))return null;
  const expected=compiled.named.map(r=>({grapeIds:r.names.map(n=>bindings.find(b=>b.sourceName===n).grapeId),...(r.min===undefined?{}:{min:r.min}),...(r.max===undefined?{}:{max:r.max}),basis:'vineyard'}));
  if(!same(rule.grapeIds,bindings.map(b=>b.grapeId))||!Array.isArray(rule.constraints)||!same(expected,rule.constraints.map(({evidence,...rest})=>rest))||!Array.isArray(rule.evidence)||rule.evidence.some(e=>!ev(e)))return null;
  const proof=cnrAnnotatedDomainEvidence(rule);
  if(proof.some(e=>!rule.evidence.some(r=>eqev(r,e)))||rule.constraints.some(c=>!Array.isArray(c.evidence)||!c.evidence.length||c.evidence.some(e=>!ev(e))||!c.evidence.some(e=>eqev(e,d.definition))))return null;
  return {complete:true,basis:'vineyard',grapeIds:rule.grapeIds,constraints:rule.constraints,original:rule.original,evidence:rule.evidence};
 }catch{return null;}
}
export function createCnrAnnotatedRule({definition,scope,identityBindings,annotationProof}={}){
 const compiled=compileCnrAnnotatedDefinition({definition,scope,annotationProof});if(!compiled||!Array.isArray(identityBindings))return null;
 const d={profile:CNR_ANNOTATED_PROFILE,definition,scope,compiled,identityBindings,annotationProof};
 const rule={complete:false,basis:'vineyard',grapeIds:identityBindings.map(b=>b.grapeId),constraints:[],original:definition.quote,evidence:[],sourceDomain:d};
 for(const row of compiled.named){const ids=row.names.map(n=>identityBindings.find(b=>b.sourceName===n)?.grapeId);if(ids.some(id=>!id))return null;rule.constraints.push({grapeIds:ids,...(row.min===undefined?{}:{min:row.min}),...(row.max===undefined?{}:{max:row.max}),basis:'vineyard',evidence:[definition]});}
 rule.evidence=[...new Map(cnrAnnotatedDomainEvidence(rule).map(e=>[JSON.stringify([e.sourceId,e.locator,e.quote]),e])).values()];
 return cnrAnnotatedDomainWitness(rule)?rule:null;
}
