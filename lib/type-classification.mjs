import records from './reviewed-wine-characteristics.mjs';
import {key} from './text-key.mjs';
const compact=x=>String(x||'').replace(/\s+/g,' ').trim();
const fields=(x,ks)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===ks.length&&ks.every(k=>Object.hasOwn(x,k));
export function reviewedCharacteristicsRecord({sourceId,entry,articleOne,articleFive,articleSix,kind}) {
 const rows=records.filter(r=>r.kind===kind&&r.sourceId===sourceId&&r.entityId===entry.id&&key(r.denomination)===key(entry.name.original)&&compact(r.articleOne)===compact(articleOne)&&compact(r.articleSix)===compact(articleSix)&&(!r.articleFive||compact(r.articleFive)===compact(articleFive)));
 return rows.length===1?rows[0]:null;
}
export function typeClassificationVerified(wine){
 const p=wine?.typeClassification;
 if(wine?.type!=='vino'||!fields(p,['profile','category','colorState','scope','evidence'])||!['it-source-category-unknown-color-v1','it-source-characteristic-color-range-v1'].includes(p.profile)||p.colorState!=='unknown'||!fields(p.scope,['entityId','denomination','wineName'])||wine.name?.original!==p.scope.wineName||!Array.isArray(p.evidence)||p.evidence.length!==2||p.evidence.some(e=>!e?.sourceId||!e.locator||!e.quote))return false;
 const range=p.profile==='it-source-characteristic-color-range-v1';if(p.category!==(range?'Vino':'1. Vino'))return false;
 const rows=records.filter(r=>r.kind===(range?'multiple-color-range':'unknown-color-category')&&r.entityId===p.scope.entityId&&r.denomination===p.scope.denomination&&r.wineName===p.scope.wineName&&p.evidence.every(e=>e.sourceId===r.sourceId)&&compact(p.evidence[0].quote)===compact(r.articleOne)&&compact(p.evidence[1].quote)===compact(r.characteristics));
 if(rows.length!==1)return false;
 if(range){const colors=rows[0].characteristics.match(/colore\s*:\s*da (bianco|rosso|rosato) a (bianco|rosso|rosato)\b[^;]*;/iu);return Boolean(colors&&colors[1]!==colors[2]);}
 return /categoria:\s*1\.\s*Vino/i.test(rows[0].articleOne)&&/colore\s*:\s*[^;]+;/i.test(rows[0].characteristics)&&!/(?:rosso|bianco|rosato|rosé)/i.test(rows[0].characteristics.match(/colore\s*:\s*([^;]+);/i)[1]);
}
