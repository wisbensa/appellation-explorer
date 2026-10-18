// Pure proof compiler shared by acquisition, public validation and the browser.
// Publication and exact acquired attachment binding travel together; a confirmed
// flag or a national approval alone cannot establish Union application.
import { officialDates } from './legal-notice-metadata.mjs';
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function italianUnionPublicationUrl(publication) {
  const match=String(publication?.uri||'').match(/^https?:\/\/data\.europa\.eu\/eli\/C\/(\d{4})\/(\d{1,5})\/oj\/?$/);
  return match ? `https://eur-lex.europa.eu/legal-content/IT/TXT/PDF/?uri=OJ:C_${match[1]}${match[2].padStart(5,'0')}` : null;
}
export function readItalianUnionPublication({original,entry,sourceId,publication,nationalSourceId,bindings}) {
  if(!/^source-[a-f0-9]{64}$/.test(sourceId||'')||!/^source-[a-f0-9]{64}$/.test(nationalSourceId||'')||!italianUnionPublicationUrl(publication)) return null;
  const text=String(original).replace(/\s+/g,' ').trim(),head=text.slice(0,3500);
  const publicationId=publication.uri.match(/\/eli\/(C\/\d{4}\/\d+)\/oj/)[1];
  if(!head.includes(publicationId))return null;
  if(!/Pubblicazione della comunicazione di una modifica ordinaria approvata del disciplinare/i.test(head)||!/COMUNICAZIONE DELL[’']APPROVAZIONE DI UNA MODIFICA ORDINARIA/.test(head)||!/DOCUMENTO UNICO/.test(text))return null;
  const ref=head.match(new RegExp(`Numero di riferimento UE: (${escape(entry.id)}-AM\\d+)\\b`));
  if(new Set([...text.matchAll(/Numero di riferimento UE: ([A-Z0-9-]+)/g)].map(m=>m[1])).size!==1)return null;
  if(!ref||![entry.name.original,...(entry.name.aliases||[])].some(name=>new RegExp(`[«“"]${escape(name)}[»”"]`,'i').test(head))) return null;
  const referenceNames=[...text.matchAll(/[«“"]([^»”"]+)[»”"]\s+Numero di riferimento UE:/g)].map(m=>m[1]);
  const names=[entry.name.original,...(entry.name.aliases||[])].map(name=>name.toLocaleLowerCase('it'));
  if(referenceNames.length!==2||referenceNames.some(name=>!names.includes(name.toLocaleLowerCase('it'))))return null;
  const dates=officialDates(head.slice(0,450));
  if(!publication.date||!dates.some(date=>date.date===publication.date))return null;
  const backlink=text.match(/Riferimento elettronico \(URL\) alla pubblicazione del disciplinare\s+(https:\/\/www\.masaf\.gov\.it\/flex\/cm\/pages\/ServeBLOB\.php\/L\/IT\/IDPagina\/\d+)\b/);
  const binding=backlink&&(bindings||[]).find(item=>item?.pageUrl===backlink[1]&&item.sourceId===nationalSourceId&&item.kind==='consolidated');
  if(!binding||!Array.isArray(binding.evidence)||!binding.evidence.length||binding.evidence.some(e=>!e||!/^source-[a-f0-9]{64}$/.test(e.sourceId||'')||typeof e.locator!=='string'||!e.locator||typeof e.quote!=='string'||!e.quote.trim()))return null;
  return {state:'confirmed',jurisdiction:'EU',effectiveFrom:publication.date,sourceId,nationalSourceId,amendmentReference:ref[1],specificationPageUrl:backlink[1],publication:{uri:publication.uri,date:publication.date},binding:{pageUrl:binding.pageUrl,sourceId:binding.sourceId,kind:binding.kind,evidence:structuredClone(binding.evidence)},evidence:[{sourceId,locator:'official EU approved standard-amendment communication, single document and exact specification backlink',quote:original},...(binding.evidence||[])]};
}

const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
export function verifyItalianUnionPublicationProof({proof,entry,nationalSourceId,actDate,referenceDate}) {
  if(!proof||!Array.isArray(proof.evidence)||proof.nationalSourceId!==nationalSourceId||!/^\d{4}-\d{2}-\d{2}$/.test(referenceDate||'')||!/^\d{4}-\d{2}-\d{2}$/.test(actDate||'')||proof.effectiveFrom<actDate||proof.effectiveFrom>referenceDate)return null;
  const originals=(proof.evidence||[]).filter(e=>e?.sourceId===proof.sourceId&&e.locator==='official EU approved standard-amendment communication, single document and exact specification backlink');
  if(originals.length!==1)return null;
  const rebuilt=readItalianUnionPublication({original:originals[0].quote,entry,sourceId:proof.sourceId,publication:proof.publication,nationalSourceId,bindings:[proof.binding]});
  return rebuilt&&JSON.stringify(canonical(rebuilt))===JSON.stringify(canonical(proof))?rebuilt:null;
}
