// Full legal definition only: named sources remain conditional on the stated
// principal-level properties. No unproved cultivar becomes a permitted ID.
export const CLOSED_NAMED_PROPERTY_PROFILE='it-closed-named-property-v1';
const norm=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[«»“”"]/g,'').replace(/\s+/g,' ').trim();
const fields=(x,ks)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).every(k=>ks.includes(k))&&ks.every(k=>Object.hasOwn(x,k));
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
export function compileClosedNamedPropertyDefinition(text,scope){
 if(typeof text!=='string'||!scope?.denomination||!scope.wineName)return null;
 const n=text.replace(/\s+/g,' ').trim();
 const m=n.match(/^\d+\.\s*La denominazione di origine controllata [«“"]([^»”"]+)[»”"] (?:con la specificazione|seguita dalla indicazione) (.+?) e['’] riservata ai vini ottenuti da uve(, non aromatiche, provenienti dai vigneti aventi in ambito aziendale la seguente composizione ampelografica| a bacca nera(?:, non aromatiche,|) provenienti dai seguenti vitigni, presenti in ambito aziendale): ([\s\S]+)\.$/iu);
 if(!m||norm(m[1])!==norm(scope.denomination))return null;
 const labels=m[2].replace(/[«»“”"]/g,'').split(/,\s*|\s+e\s+/).map(x=>x.trim()).filter(Boolean);
 if(labels.some(label=>! /^[\p{L}'’ -]+$/u.test(label))||new Set(labels.map(norm)).size!==labels.length||labels.filter(label=>norm(`${scope.denomination} ${label}`)===norm(scope.wineName)).length!==1)return null;
 const names=m[4].split(/\s+e\/o\s+/).map(name=>name.trim());
 if(!names.length||names.some(name=>! /^[\p{L}][\p{L}'’ -]*(?: [BN]\.)?$/u.test(name)||/\b(?:uve|vigneti|purché|previa|solo|salvo|autorizzazione|vitigni)\b/i.test(name))||new Set(names.map(norm)).size!==names.length)return null;
 const requirements=[...(/a bacca nera/.test(m[3])?[{kind:'berry-color',color:'nera'}]:[]),...(/non aromatiche/.test(m[3])?[{kind:'aromatic-classification',value:'non-aromatic'}]:[])];
 if(!requirements.length)return null;
 return {names,requirements,sourceRelation:'named-grape-sources'};
}
export function closedNamedPropertyDomainEvidence(rule){const d=rule?.sourceDomain;return d?.profile===CLOSED_NAMED_PROPERTY_PROFILE?[d.definition]:[];}
export function closedNamedPropertyDomainDefinitionVerified(rule){
 try{
  const d=rule?.sourceDomain;if(!fields(rule,['complete','basis','grapeIds','constraints','original','evidence','sourceDomain'])||!fields(d,['profile','definition','scope','compiled','identityBindings'])||d.profile!==CLOSED_NAMED_PROPERTY_PROFILE||rule.complete!==false||rule.basis!=='unknown'||!Array.isArray(rule.grapeIds)||rule.grapeIds.length||!Array.isArray(rule.constraints)||rule.constraints.length||!Array.isArray(d.identityBindings)||d.identityBindings.length)return false;
  if(!fields(d.scope,['entityId','denomination','wineName','wineType'])||Object.values(d.scope).some(x=>typeof x!=='string'||!x.trim()))return false;
  const e=d.definition;if(!fields(e,['sourceId','sourceHash','locator','quote'])||! /^[a-f0-9]{64}$/.test(e.sourceHash)||e.sourceId!==`source-${e.sourceHash}`||typeof e.locator!=='string'||!e.locator||e.quote!==rule.original)return false;
  if(!Array.isArray(rule.evidence)||!rule.evidence.length||!rule.evidence.every(x=>x?.sourceId&&x.locator&&typeof x.quote==='string'&&x.quote.trim())||!rule.evidence.some(x=>x.sourceId===e.sourceId&&x.locator===e.locator&&x.quote===e.quote))return false;
  const compiled=compileClosedNamedPropertyDefinition(e.quote,d.scope);return Boolean(compiled&&same(compiled,d.compiled));
 }catch{return false;}
}
