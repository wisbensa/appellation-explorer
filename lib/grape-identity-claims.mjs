import {isSourceDomainRegistrationNumber} from './variety-registration-code.mjs';
import reviewed from './reviewed-grape-identity-claims.mjs';
import {key} from './text-key.mjs';
import {nationalCultivarIdentityEvidence} from './national-cultivar-identity-proof.mjs';
const compact=x=>String(x||'').replace(/\s+/g,' ').trim();
const escape=x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const nationalRow=e=>e?.url==='http://catalogoviti.politicheagricole.it/post2.php'||/^wine catalogue page\b/.test(e?.locator||'');
export function sourceIdentityClaimsVerified(compiled,bindings){
 if(compiled.identityClaims===undefined)return true;
 const claims=compiled.identityClaims;if(!Array.isArray(claims)||!claims.length)return false;
 return claims.every(claim=>{
  if(!claim||Object.keys(claim).sort().join(',')!=='alias,canonicalName,kind'||!['explicit-synonym','registered-synonym','source-local-designation'].includes(claim.kind))return false;
  if(claim.kind==='source-local-designation'){
   const b=bindings.find(b=>key(b.sourceName)===key(claim.canonicalName)&&key(b.canonicalName)===key(claim.canonicalName));
   if(!b||!isSourceDomainRegistrationNumber(b.registrationNumber))return false;
   const code=b.registrationNumber.replace(/^0+(?=\d)/,'');
   const alpha=/^[A-Z]/.test(code);
   const pattern=new RegExp(`(?:^|\\s)${alpha?'('+escape(code)+')':'0*'+code}\\s+${escape(b.canonicalName)}\\s+[NBG]\\.`,'iu');
   // The source compiler proves this annotation locally. It does not add the
   // designation to the registry, bind a second identity, or prove alias use.
   return b.evidence?.some(e=>nationalRow(e)?nationalCultivarIdentityEvidence(e,b.registrationNumber,b.canonicalName):/^source-[a-f0-9]{64}$/.test(e.sourceId)&&e.locator&&(()=>{const m=pattern.exec(compact(e.quote));return Boolean(m&&(!alpha||m[1]===code));})())===true;
  }
  const rows=reviewed.filter(r=>key(r.canonicalName)===key(claim.canonicalName)&&r.aliases.some(a=>key(a)===key(claim.alias)));
  if(rows.length!==1)return false;const r=rows[0],b=bindings.find(b=>key(b.sourceName)===key(claim.canonicalName)&&key(b.canonicalName)===key(r.canonicalName));
  if(!b||String(b.registrationNumber).replace(/^0+(?=\d)/,'')!==r.registrationNumber)return false;
  const identity=b.evidence?.some(e=>e.sourceId===r.sourceId&&compact(e.quote)===compact(r.evidence.quote));
  const currentPattern=new RegExp(`(?:^|\\s)0*${r.registrationNumber}\\s+${escape(r.canonicalName)}\\s+[NBG]\\.`,'iu');
  const current=b.evidence?.some(e=>e.sourceId!==r.sourceId&&(nationalRow(e)?nationalCultivarIdentityEvidence(e,r.registrationNumber,r.canonicalName):/^source-[a-f0-9]{64}$/.test(e.sourceId)&&e.locator&&currentPattern.test(compact(e.quote))));
  return Boolean(identity&&current);
 });
}
