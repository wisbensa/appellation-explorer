import {key} from './text-key.mjs';

// Cultivar identity corroboration only. Neither an act renaming the register
// nor permission to produce, label, cultivate, or use a synonym is asserted.
export const reviewedCultivarIdentities=[{
  registrationNumber:'35',canonicalName:'Bonarda',aliases:['Bonarda Piemontese'],
  source:{id:'source-ecf6e01ddc5c44de054edb11fcd6e9a6c49028aace42981f4ce465735284a883',sha256:'ecf6e01ddc5c44de054edb11fcd6e9a6c49028aace42981f4ce465735284a883',url:'https://vitisdb.it/varieties/show/1006',agency:'Istituto per la Protezione Sostenibile delle Piante - CNR',title:'Italian Vitis Database, Bonarda: cultivar identity and documented synonyms',retrievedAt:'2026-10-17T07:44:59.429Z',kind:'reviewed-cultivar-identity'},
  evidence:[
    {locator:'registration, national catalogue code and official name',quote:'registrazione iscritto al Registro Nazionale delle Varietà di Viti si codice 35 nome ufficiale Bonarda N.'},
    {locator:'documented synonyms, complete three-item list',quote:"sinonimi sinonimi accertati (3) sinonimi accertati dall'Istituzione che compare con eventuale supporto bibliografico Negrìn (Val d'Ossola, Verbania province) Bonarda di Chieri (Piemonte) Bonarda piemontese"}
  ],
  currentRegistrations:[{sourceId:'source-b7f5d42314219ca1f6c0cac03b06ff9cdf487c3c9a632445f0e5ca2300287131',locator:'page 1, registration 035',quote:'35 Bonarda N. I Reg. 3800/1981'}]
}];
const compact=value=>String(value||'').replace(/\s+/g,' ').trim();
const sameProof=(a,b)=>a?.sourceId===b.sourceId&&a.locator===b.locator&&compact(a.quote)===compact(b.quote);
const code=value=>String(value).replace(/^0+(?=\d)/,'');
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function currentCultivarRegistrationVerified(record,grape){
  return code(grape?.registrationNumber)===record.registrationNumber&&key(grape?.name?.original||'')===key(record.canonicalName)&&record.currentRegistrations.some(expected=>grape?.evidence?.some(actual=>sameProof(actual,expected)));
}
export function reviewedCultivarBindingVerified(binding,definition){
  if(!definition||!/^source-[a-f0-9]{64}$/.test(definition.sourceId)||!definition.locator||typeof definition.quote!=='string')return false;
  const records=reviewedCultivarIdentities.filter(record=>record.registrationNumber===code(binding.registrationNumber)&&key(record.canonicalName)===key(binding.canonicalName)&&record.aliases.some(alias=>key(alias)===key(binding.sourceName)));
  if(records.length!==1)return false;
  const record=records[0],proof=binding.evidence||[];
  if(!new RegExp(`(?:^|[^\\p{L}\\p{N}])${escape(binding.sourceName)}(?=$|[^\\p{L}\\p{N}])`,'iu').test(definition.quote)||!proof.some(item=>sameProof(item,definition)))return false;
  return currentCultivarRegistrationVerified(record,{registrationNumber:binding.registrationNumber,name:{original:binding.canonicalName},evidence:proof})&&record.evidence.every(expected=>proof.some(actual=>sameProof(actual,{...expected,sourceId:record.source.id})));
}
