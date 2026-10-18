import contexts from './reviewed-production-contexts.mjs';
import{key}from'./text-key.mjs';
const compact=value=>String(value||'').normalize('NFKC').replace(/\s+/g,' ').trim();
export function reviewedProductionContext(evidence,scope,purpose){
 if(!evidence?.sourceId||!evidence.quote||!evidence.locator||!scope?.denomination)return false;
 const matches=contexts.filter(record=>record.sourceId===evidence.sourceId&&record.sourceId===`source-${record.sourceHash}`&&key(record.denomination)===key(scope.denomination)&&record.reviewedPurposes.includes(purpose)&&compact(record.article)===compact(evidence.quote));
 return matches.length===1&&matches[0].paragraphCoverage.length>0&&matches[0].paragraphCoverage.every(row=>Number.isInteger(row.paragraph)&&row.paragraph>0&&row.scope);
}

export function reviewedLabelClauses(evidence,scope,purpose){
 if(!Array.isArray(evidence)||!evidence.length)return false;
 const matches=contexts.filter(record=>key(record.denomination)===key(scope?.denomination)&&record.reviewedPurposes.includes(purpose)&&record.labellingArticle&&evidence.every(e=>e.sourceId===record.sourceId&&e.locator&&compact(record.labellingArticle).includes(compact(e.quote).replace(/^\d+\.\s*/,''))));
 return matches.length===1;
}
