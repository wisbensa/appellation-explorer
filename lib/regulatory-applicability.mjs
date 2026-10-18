import {verifyItalianUnionPublicationProof} from './italian-union-publication-proof.mjs';
import {compileItalianRegulatoryApplication} from './italian-regulatory-compiler.mjs';
import reviewed from './reviewed-regulatory-applicability.mjs';
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const stable=x=>Array.isArray(x)?x.map(stable):object(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const dedup=x=>Array.isArray(x)?x.map(dedup).filter((v,i,a)=>a.findIndex(w=>same(v,w))===i):object(x)?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,dedup(v)])):x;
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const contains=(actual,expected)=>Array.isArray(actual)&&expected.every(e=>actual.some(a=>a.sourceId===e.sourceId&&typeof a.locator==='string'&&a.locator&&typeof a.quote==='string'&&a.quote.includes(e.quote)));
const profile='it-national-approved-specification-v1';
export function buildRegulatoryApplicability(input){
 const legacy=reviewed.find(r=>r.entityId===input?.entityId&&r.sourceId===input.sourceId);
 const denomination=input?.denomination||input?.name?.original||input?.name||legacy?.name;
 const aliases=input?.aliases||input?.name?.aliases||[];
 const actDate=input?.actDate;
 if(typeof input?.entityId!=='string'||!input.entityId||typeof denomination!=='string'||!denomination||!Array.isArray(aliases)||aliases.some(x=>typeof x!=='string')||!date(input.referenceDate)||!date(actDate))return null;
 const parsed=compileItalianRegulatoryApplication({entry:{name:{original:denomination,aliases}},sourceId:input.sourceId,actDate,evidence:input.evidence});
 if(!parsed||input.referenceDate<parsed.national.commencement.effectiveFrom||actDate>parsed.national.commencement.effectiveFrom||!same(dedup(input.national),dedup(parsed.national)))return null;
 const spec=input.specification;
 if(!object(spec)||Object.keys(spec).sort().join(',')!=='annex,end,start,textSha256'||!['A','1'].includes(spec.annex)||!Number.isInteger(spec.start)||spec.start<0||!Number.isInteger(spec.end)||spec.end<=spec.start||!/^([a-f0-9]{64})$/.test(spec.textSha256))return null;
 if(!parsed.attachmentRoles||spec.annex!==parsed.attachmentRoles.specification)return null;
 const suppliedProof=input.union?.publicationProof;
 const publicationProof=suppliedProof&&parsed.union.condition==='commission_publication_of_approved_amendment_and_single_document_in_oj_c'
  ?verifyItalianUnionPublicationProof({proof:suppliedProof,entry:{id:input.entityId,name:{original:denomination,aliases}},nationalSourceId:input.sourceId,actDate,referenceDate:input.referenceDate}):null;
 if(suppliedProof&&!publicationProof)return null;
 const published=publicationProof?{jurisdiction:'EU',state:'confirmed',effectiveFrom:publicationProof.effectiveFrom,condition:parsed.union.condition,nationalSourceId:input.sourceId,bindingPageUrl:publicationProof.specificationPageUrl,evidence:publicationProof.evidence,publicationProof}:null;
 const unions=[parsed.union,...(legacy?.confirmedUnion?[legacy.confirmedUnion]:[]),...(published?[published]:[])];
 const union=unions.find(u=>{
  const supplied=input.union;if(!object(supplied)||Object.keys(supplied).some(k=>!['jurisdiction','state','effectiveFrom','condition','evidence','nationalSourceId','bindingPageUrl','bindingEvidence','publicationProof'].includes(k)))return false;
  if(!['jurisdiction','state','effectiveFrom','condition'].every(k=>same(supplied[k],u[k])))return false;
  if(!same(supplied.publicationProof,u.publicationProof))return false;
  for(const k of ['nationalSourceId','bindingPageUrl'])if(Object.hasOwn(supplied,k)&&supplied[k]!==u[k])return false;
  const proof=[...(supplied.evidence||[]),...(supplied.bindingEvidence||[])];
  return contains(proof,u.evidence)&&contains(proof,u.bindingEvidence||[])&&(!u.effectiveFrom||u.effectiveFrom<=input.referenceDate);
 });
 if(!union)return null;
 return structuredClone({profile,entityId:input.entityId,denomination,aliases,actDate,sourceId:input.sourceId,referenceDate:input.referenceDate,national:dedup(parsed.national),union:dedup(union),specification:spec,evidence:dedup(parsed.evidence)});
}
export function regulatoryApplicabilityVerified(app){
 const p=app?.regulatoryApplicability;if(app.countryId!=='IT'||!p||p.profile!==profile||p.entityId!==app.id||p.denomination!==app.name?.original||!same(p.aliases||[],app.name?.aliases||[]))return false;
 const rebuilt=buildRegulatoryApplicability(p);return Boolean(rebuilt&&same(rebuilt,p));
}
export function regulatoryApplicabilityRequired(app){
 const selected=new Set(),operative=new Set();
 const visit=(value,ids,readOperative=false)=>{if(typeof value==='string'){if(/^source-[a-f0-9]{64}$/.test(value))ids.add(value);return;}if(Array.isArray(value)){value.forEach(v=>visit(v,ids,readOperative));return;}if(object(value)){if(readOperative&&/^approved decree, Article [123]:/.test(value.locator||'')&&/^source-[a-f0-9]{64}$/.test(value.sourceId||''))operative.add(value.sourceId);Object.values(value).forEach(v=>visit(v,ids,readOperative));}};
 // Current recipes and explicit selected scope establish ownership. A cited
 // historical notice in documentRelations does not establish adoption.
 visit([app?.sourceIds,app?.wines,app?.evidence,app?.regulatoryApplicability,app?.currentness?.scopedApplicability],selected);
 visit(app,new Set(),true);
 return [...operative].some(id=>selected.has(id))||reviewed.some(r=>r.entityId===app?.id&&selected.has(r.sourceId));
}
export function regulatoryApplicabilityEvidence(app){const p=app?.regulatoryApplicability;return p?[...p.evidence,...(p.union?.evidence||[]),...(p.union?.bindingEvidence||[])]:[];}
export function regulatoryApplicabilityCondition(app){
 if(!regulatoryApplicabilityVerified(app))return null;const p=app.regulatoryApplicability,n=p.national;
 return {kind:'national_regulatory_applicability',jurisdiction:'IT',referenceDate:p.referenceDate,commencement:n.commencement.effectiveFrom,...(n.campaign?.state==='confirmed'?{campaignFrom:n.campaign.from,campaignKind:n.campaign.kind}:{dateFrom:n.application.effectiveFrom}),unionState:p.union.state,unionEffectiveFrom:p.union.effectiveFrom,evidence:regulatoryApplicabilityEvidence(app)};
}
export function regulatoryApplicabilityLabel(app,language='en'){
 const c=regulatoryApplicabilityCondition(app);if(!c)return '';const ja=language==='ja',period=c.campaignFrom?`${c.campaignFrom.startYear}/${String(c.campaignFrom.endYear).slice(-2)}`:c.dateFrom;
 const national=ja?`イタリア国内・${period}${c.campaignFrom?(c.campaignKind==='harvest_campaign_from'?'収穫年度以降':'醸造年度以降'):'以降'}`:`Italy · from ${period}${c.campaignFrom?(c.campaignKind==='harvest_campaign_from'?' harvest campaign':' wine campaign'):''}`;
 return national+(c.unionState==='confirmed'?(ja?`（EU域内：${c.unionEffectiveFrom}以降）`:` (EU: from ${c.unionEffectiveFrom})`):(ja?'（EU域内適用は未確認）':' (EU applicability unverified)'));
}

export function regulatoryHistoricalSummaries(app,language='en'){
 if(!regulatoryApplicabilityVerified(app))return [];
 const ja=language==='ja',p=app.regulatoryApplicability;
 return [...(p.national.retroactiveExtensions||[]),...(p.national.transitionalExtensions||[])].map(h=>{
  const years=h.harvestYears?.join(' / ')||h.harvestThrough;
  const qualification=ja?'現行規則の要件への適合が必要。':'Compliance with the specification is required.';
  let text;
  switch(h.kind){
   case 'conditional_historical_harvest_permission':text=ja?`${h.harvestYear}年収穫分の${h.typology.denomination}、伝統方式のロゼ・スパークリングに限る特則。原料${h.principal.cultivar}最低${h.principal.min}%の基礎ロットに${h.complementary.cultivar}${h.complementary.min}～${h.complementary.max}%を補完（第${h.practice.article}条第${h.practice.paragraph}項）。補完分は${h.reclassification.territoryDenomination}の区域内の別の原産地呼称の生産物を事前に再分類し、法律${h.reclassification.compatibility.law}第${h.reclassification.compatibility.article}条の技術・生産上の適合条件を満たす必要があります。`:`Harvest ${h.harvestYear} only, ${h.typology.denomination} traditional-method rosé sparkling wine. A base lot from ${h.principal.cultivar} at least ${h.principal.min}% receives ${h.complementary.cultivar} ${h.complementary.min}–${h.complementary.max}% under Article ${h.practice.article}(${h.practice.paragraph}). The complement requires prior reclassification from another denomination within ${h.reclassification.territoryDenomination}, subject to technical/production compatibility under Law ${h.reclassification.compatibility.law}, Article ${h.reclassification.compatibility.article}.`;break;
   case 'conditional_historical_reclassification':text=ja?`${years}年収穫分：${h.fromDenomination} ${h.fromTraditionalTerm}から${h.toDenomination} ${h.toTraditionalTerm}への再分類。${qualification}管轄検査機関による適合確認が必要。`:`Harvests ${years}: reclassification from ${h.fromDenomination} ${h.fromTraditionalTerm} to ${h.toDenomination} ${h.toTraditionalTerm}. ${qualification} The competent control body must verify compliance.`;break;
   case 'conditional_historical_subzone_permission':text=ja?`${years}年収穫分：${h.denomination} ${h.traditionalTerm}の${h.subzone}表示。該当サブゾーン規則への適合と管轄検査機関の確認が必要。`:`Harvests ${years}: ${h.subzone} designation for ${h.denomination} ${h.traditionalTerm}, subject to the subzone specification and competent control-body verification.`;break;
   case 'conditional_historical_stock_permission':text=ja?`${years}年以前の収穫分の在庫：${h.denomination} ${h.traditionalTerm}の該当タイプの規則への適合と管轄検査機関の確認が必要。`:`Stocks from harvest ${years} and earlier: ${h.denomination} ${h.traditionalTerm}, subject to the relevant type's specification and competent control-body verification.`;break;
   case 'conditional_historical_classification_permission':text=ja?`${years}年以前の収穫分：${h.denomination} ${h.traditionalTerm}として分類可能な生産物。${qualification}`:`Production from harvest ${years} and earlier eligible for ${h.denomination} ${h.traditionalTerm}. ${qualification}`;break;
   case 'conditional_held_label_use':text=ja?`施行日に保有していたラベルの使用期限：${h.useThrough}。${h.registeredMark?`登録商標${h.registeredMark}、サブゾーン${h.subzone}の第${h.article}条に関する表示特則。`:`旧規則に適合するが現行第${h.article}条に適合しないラベルが対象。`}`:`Labels already held at commencement may be used through ${h.useThrough}. ${h.registeredMark?`Registered mark ${h.registeredMark}, subzone ${h.subzone}, Article ${h.article} labeling exception.`:`Applies to labels complying with the previous specification but not current Article ${h.article}.`}`;break;
   default:return ja?'原文に条件付きの過年度生産物の特則があります。個別の適用可否は未判定です。':'The source retains a conditional historical-production provision; individual applicability is not assessed.';
  }
  return text+(ja?' この特則は検索判定に適用していません。':' This provision is not applied to search answers.');
 });
}
