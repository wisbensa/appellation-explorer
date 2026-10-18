import {key} from './text-key.mjs';
import {isSourceDomainRegistrationNumber} from './variety-registration-code.mjs';
const code=value=>String(value).replace(/^0+(?=\d)/,'');
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

// Only the retained seven-column wine-catalogue row is an identity proof.
// Synonym/annotation cells are deliberately not interpreted as alias authority,
// and this row never proves regional suitability or a complete collection.
export function nationalCultivarIdentityEvidence(evidence,registrationNumber,canonicalName){
 try{
  if(!/^source-[a-f0-9]{64}$/.test(evidence?.sourceId||'')||evidence.url!=='http://catalogoviti.politicheagricole.it/post2.php'||!isSourceDomainRegistrationNumber(registrationNumber)||typeof canonicalName!=='string')return false;
  const row=JSON.parse(evidence.quote);
  if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).sort().join(',')!=='cell,id'||!isSourceDomainRegistrationNumber(row.id)||code(row.id)!==code(registrationNumber)||!Array.isArray(row.cell)||row.cell.length!==7||row.cell.some(value=>typeof value!=='string'))return false;
  if(!new RegExp(`^wine catalogue page [1-9]\\d*, registration ${escape(row.id)}$`).test(evidence.locator||''))return false;
  const target=`result\\.php\\?codice=${escape(row.id)}`;
  const link=new RegExp(`^<a href=(?:"${target}"|'${target}'|${target})>([^<>]*)<\\/a>$`,'u');
  const id=row.cell[0].match(link),display=row.cell[1].match(link);
  if(!id||id[1].trim()!==row.id||!display)return false;
  const name=display[1].trim().match(/^(.+?)\s+(?:B|N|G|RS)\.?$/iu);
  return Boolean(name&&key(name[1])===key(canonicalName));
 }catch{return false;}
}
