import {isSourceDomainRegistrationNumber} from './variety-registration-code.mjs';
import {CNR_ANNOTATED_PROFILE,cnrAnnotatedDomainWitness,cnrAnnotatedDomainEvidence} from './cnr-annotation-proof.mjs';
import {applyRegistryTokenPartition,registryTokenPartitionEvidence} from './registry-token-partition.mjs';
import {compileSourceComparatorDefinition,sourceComparatorEvidence} from './source-comparator.mjs';
import {reviewedDeclaredSourceHash,fullyConsumedVarietalDeclarations} from './declared-varietal-scope.mjs';
import {CLOSED_NAMED_PROPERTY_PROFILE,closedNamedPropertyDomainDefinitionVerified,closedNamedPropertyDomainEvidence} from './source-domain-closed-named.mjs';
import {sourceIdentityClaimsVerified} from './grape-identity-claims.mjs';
import {reviewedCultivarBindingVerified} from './reviewed-cultivar-identities.mjs';
import {compileScopedOptionalComplementDefinition,compileScopedOptionalComplementAlternatives,compileDeclaredOptionalComplementDefinition} from './scoped-source-domain-definition.mjs';
import {SCOPED_ANNEX_PROFILE,scopedAnnexDomainWitness,scopedAnnexDomainEvidence,scopedAnnexDomainDefinitionVerified} from './source-domain-scoped-annex.mjs';
import {compileOptionalComplementDefinition,compileVineyardPresenceDefinition,compileDirectGrapeComplementDefinition,directSourceScopeVerified} from './source-domain-definition.mjs';

export const OPTIONAL_COMPLEMENT_PROFILE='it-optional-complement-vineyard-v1';
const SCOPED_OPTIONAL_PROFILE='it-scoped-optional-complement-vineyard-v1';
const DIRECT_GRAPE_PROFILE='it-optional-complement-grapes-v1';
const compilers={[DIRECT_GRAPE_PROFILE]:compileDirectGrapeComplementDefinition,[OPTIONAL_COMPLEMENT_PROFILE]:compileOptionalComplementDefinition,'it-vineyard-presence-tolerance-v1':compileVineyardPresenceDefinition};
const object=value=>value && typeof value==='object' && !Array.isArray(value);
const fields=(value,keys)=>object(value)&&Object.keys(value).every(key=>keys.includes(key))&&keys.every(key=>Object.hasOwn(value,key));
const stable=value=>Array.isArray(value)?value.map(stable):object(value)?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
const identityName=value=>String(value).normalize('NFKD').replace(/\p{M}/gu,'').replace(/[’‘]/g,"'").toLowerCase().replace(/\s+/g,' ').trim();
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const evidence=value=>Array.isArray(value)&&value.length>0&&value.every(item=>object(item)&&typeof item.sourceId==='string'&&item.sourceId&&typeof item.locator==='string'&&item.locator&&typeof item.quote==='string'&&item.quote.trim());

// A closed, finite witness support is never the full legal permission universe.
// Recompile the complete source clause; stored flags/bounds cannot attest proof.
export function sourceDomainWitness(rule) {
 try {
  const domain=rule?.sourceDomain;
  if(domain?.profile===CNR_ANNOTATED_PROFILE)return cnrAnnotatedDomainWitness(rule);
  if(domain?.profile===SCOPED_ANNEX_PROFILE)return scopedAnnexDomainWitness(rule);
  const subset=domain?.knownPrincipalOnly===true,partition=Object.hasOwn(domain||{},'tokenPartitionProof');
  if(Object.hasOwn(domain||{},'knownPrincipalOnly')&&!subset)return null;
  const specialized=Object.hasOwn(domain||{},'characteristicsContext');
  const comparator=Object.hasOwn(domain||{},'comparatorProof');
  const scoped=domain?.profile===SCOPED_OPTIONAL_PROFILE,declared=scoped&&Object.hasOwn(domain,'declarationContext'),targetEvidence=!scoped&&Object.hasOwn(domain||{},'scopeEvidence');
  if(!fields(domain,['profile','definition','identityBindings','compiled','scope',...(scoped?['context']:[]),...(declared?['declarationContext']:[]),...(subset?['knownPrincipalOnly']:[]),...(targetEvidence?['scopeEvidence']:[]),...(partition?['tokenPartitionProof']:[]),...(specialized?['characteristicsContext']:[]),...(comparator?['comparatorProof']:[])])||(!scoped&&!Object.hasOwn(compilers,domain.profile))||rule.complete!==false||rule.alternatives||rule.conditionalUse) return null;
  if(comparator&&(!scoped||declared||subset||partition||specialized))return null;
  if(!fields(domain.scope,['entityId','denomination','wineName','wineType'])||Object.values(domain.scope).some(value=>typeof value!=='string'||!value.trim()))return null;
  const definition=domain.definition;
  if(!fields(definition,['sourceId','sourceHash','locator','quote'])||!/^source-[a-f0-9]{64}$/.test(definition.sourceId)||definition.sourceId!==`source-${definition.sourceHash}`||!definition.locator||definition.quote!==rule.original) return null;
  if(scoped&&(!fields(domain.context,['sourceId','sourceHash','locator','quote'])||domain.context.sourceId!==definition.sourceId||domain.context.sourceHash!==definition.sourceHash||!domain.context.locator||typeof domain.context.quote!=='string'))return null;
  if(declared&&(!fields(domain.declarationContext,['sourceId','sourceHash','locator','quote'])||domain.declarationContext.sourceId!==definition.sourceId||domain.declarationContext.sourceHash!==definition.sourceHash||!domain.declarationContext.locator||typeof domain.declarationContext.quote!=='string'))return null;
  if(specialized&&(!declared||!fields(domain.characteristicsContext,['sourceId','sourceHash','locator','quote'])||domain.characteristicsContext.sourceId!==definition.sourceId||domain.characteristicsContext.sourceHash!==definition.sourceHash||!domain.characteristicsContext.locator||typeof domain.characteristicsContext.quote!=='string'))return null;
  const declaredHash=declared&&reviewedDeclaredSourceHash(domain.context.quote,domain.declarationContext.quote,domain.scope);if(declaredHash&&!fullyConsumedVarietalDeclarations(domain.declarationContext.quote,domain.scope)&&declaredHash!==definition.sourceHash)return null;
  if(![...((scoped?domain.context.quote:definition.quote)+(declared?'\n'+domain.declarationContext.quote:'')).matchAll(/[«“"]([^»”"]+)[»”"]/g)].some(match=>identityName(match[1])===identityName(domain.scope.denomination)))return null;
  if(!evidence(rule.evidence)||!rule.evidence.some(item=>item.sourceId===definition.sourceId&&item.locator===definition.locator&&item.quote===definition.quote))return null;
  if(comparator&&sourceComparatorEvidence(domain.comparatorProof).some(e=>!rule.evidence.some(r=>r.sourceId===e.sourceId&&r.locator===e.locator&&r.quote===e.quote)))return null;
  if(targetEvidence&&(!evidence(domain.scopeEvidence)||domain.scopeEvidence.some(e=>e.sourceId!==definition.sourceId||!rule.evidence.some(r=>r.sourceId===e.sourceId&&r.locator===e.locator&&r.quote===e.quote))))return null;
  if(!scoped&&!directSourceScopeVerified(definition.quote,domain.scope,domain.scopeEvidence||[]))return null;
  let compiled=comparator?compileSourceComparatorDefinition(domain.context,definition,domain.scope,domain.comparatorProof):declared?compileDeclaredOptionalComplementDefinition(domain.context.quote,definition.quote,domain.scope,domain.declarationContext.quote,domain.characteristicsContext?.quote):scoped?compileScopedOptionalComplementDefinition(domain.context.quote,definition.quote,domain.scope):compilers[domain.profile](definition.quote);
  if(scoped&&!declared&&!comparator&&!compiled){const choices=compileScopedOptionalComplementAlternatives(domain.context.quote,definition.quote,domain.scope);const matched=choices?.filter(choice=>same(choice,domain.compiled));if(matched?.length===1)compiled=matched[0];}
  if(Boolean(compiled?.characteristicSpecialization)!==specialized)return null;
  if(partition){if(!scoped||subset)return null;compiled=applyRegistryTokenPartition(compiled,domain.tokenPartitionProof);}
  else if(compiled?.registryTokenGroup)return null;
  const direct=domain.profile===DIRECT_GRAPE_PROFILE,basis=direct?'grapes':'vineyard';
  if(!compiled||!same(compiled,domain.compiled)||compiled.basis!==basis||compiled.sourceRelation!==(direct?'direct-grape-composition':'grapes-from-vineyard'))return null;
  const bindings=domain.identityBindings;
  if(!Array.isArray(bindings)||!bindings.length||bindings.some(item=>!fields(item,['grapeId','sourceName','canonicalName','registrationNumber','evidence'])||!item.grapeId||!item.sourceName||!item.canonicalName||(item.registrationNumber!==null&&(!isSourceDomainRegistrationNumber(item.registrationNumber)))||!evidence(item.evidence)))return null;
  if(new Set(bindings.map(item=>item.sourceName)).size!==bindings.length||bindings.some(item=>identityName(item.sourceName)!==identityName(item.canonicalName)&&!reviewedCultivarBindingVerified(item,definition)))return null;
  if(!sourceIdentityClaimsVerified(compiled,bindings))return null;
  if(partition&&domain.tokenPartitionProof.components.some(component=>!bindings.some(binding=>binding.sourceName===component.canonicalName&&binding.registrationNumber===component.registrationNumber&&component.evidence.every(e=>binding.evidence.some(b=>b.sourceId===e.sourceId&&b.locator===e.locator&&b.quote===e.quote)))))return null;
  const names=[...new Set(compiled.named.flatMap(row=>row.names))];
  if(subset?(!scoped||bindings.some(item=>!names.includes(item.sourceName))||bindings.length>=names.length):(names.length!==bindings.length||names.some(name=>!bindings.some(item=>item.sourceName===name))))return null;
  const ids=[...new Set(bindings.map(item=>item.grapeId))];if(ids.length!==bindings.length)return null;
  if(!same([...ids].sort(),[...(rule.grapeIds||[])].sort())||ids.length!==rule.grapeIds.length||rule.basis!==basis)return null;
  const constraints=compiled.named.map(row=>({grapeIds:[...new Set(row.names.flatMap(name=>{const binding=bindings.find(item=>item.sourceName===name);return binding?[binding.grapeId]:[];}))],...(row.min===undefined?{}:{min:row.min}),...(row.max===undefined?{}:{max:row.max}),basis}));
  if(!Array.isArray(rule.constraints)||rule.constraints.some(c=>Object.keys(c).some(k=>!['grapeIds','min','max','basis','evidence'].includes(k))||!evidence(c.evidence)))return null;
  if(comparator&&rule.constraints.some(c=>[definition,...sourceComparatorEvidence(domain.comparatorProof)].some(e=>!c.evidence.some(r=>r.sourceId===e.sourceId&&r.locator===e.locator&&r.quote===e.quote))))return null;
  if(subset?(rule.constraints.length!==0||constraints.some(c=>!c.grapeIds.length&&c.min>0)):!same(constraints,rule.constraints.map(({evidence,...constraint})=>constraint)))return null;
  const remainder=domain.profile==='it-vineyard-presence-tolerance-v1'?compiled.presenceTolerance:compiled.remainder;
  if(!remainder||typeof remainder.original!=='string'||!definition.quote.includes(remainder.original)||!Number.isFinite(remainder.max)||remainder.max<0||remainder.max>100||!Array.isArray(remainder.requirements))return null;
  // Only this internal projection assumes all unknown complementary use is0.
  // It must never be serialized as a complete public rule or used for necessity.
  return {complete:true,basis,grapeIds:ids,constraints:subset?constraints.filter(c=>c.grapeIds.length).map(c=>({...c,evidence:rule.evidence})):rule.constraints,original:scoped?domain.context.quote:rule.original,evidence:rule.evidence};
 } catch {return null;}
}
// Definition audit is not a positive-use or numeric feasibility witness.
export function sourceDomainDefinitionVerified(rule){
 if(rule?.sourceDomain?.profile===CLOSED_NAMED_PROPERTY_PROFILE)return closedNamedPropertyDomainDefinitionVerified(rule);
 return rule?.sourceDomain?.profile===SCOPED_ANNEX_PROFILE&&scopedAnnexDomainDefinitionVerified(rule);
}
// Traverse only the recognized four-field source-definition envelope. A
// coincidental field named hash elsewhere in proof metadata is not a contract.
export function sourceDomainDefinitions(rule) {
 const found=[],seen=new Set();
 const visit=value=>{if(!value||typeof value!=='object'||seen.has(value))return;seen.add(value);if(fields(value,['sourceId','sourceHash','locator','quote']))found.push(value);for(const child of Object.values(value))visit(child);};
 visit(rule?.sourceDomain);return found;
}
export function sourceDomainEvidence(rule) {
 const domain=rule?.sourceDomain;
 if(!domain)return [];
 if(domain.profile===CNR_ANNOTATED_PROFILE)return cnrAnnotatedDomainEvidence(rule);
 if(domain.profile===CLOSED_NAMED_PROPERTY_PROFILE)return closedNamedPropertyDomainEvidence(rule);
 if(domain.profile===SCOPED_ANNEX_PROFILE)return scopedAnnexDomainEvidence(rule);
 return [domain.definition,domain.context,domain.declarationContext,domain.characteristicsContext,...sourceComparatorEvidence(domain.comparatorProof),...(domain.scopeEvidence||[]),...registryTokenPartitionEvidence(domain.tokenPartitionProof),...(domain.identityBindings||[]).flatMap(item=>item.evidence||[])].filter(Boolean);
}
function requirementSummary(requirement,ja){
 const colors={bianca:ja?'白ブドウ':'white grapes',bianco:ja?'白ブドウ':'white grapes',rosse:ja?'黒ブドウ':'red grapes',rossa:ja?'黒ブドウ':'red grapes',rosso:ja?'黒ブドウ':'red grapes',nera:ja?'黒ブドウ':'black grapes',nero:ja?'黒ブドウ':'black grapes'};
 switch(requirement.kind){
 case 'regional-eligibility':return (ja?`${requirement.region}州で栽培適格`:`eligible for cultivation in ${requirement.region}`)+(requirement.appliesTo==='other-complement-varieties'?(ja?'（その他の補助品種）':' (other complementary varieties)'):'');
 case 'berry-color':return (requirement.colors||[requirement.color]).map(color=>colors[color]||color).join(ja?'・':' / ');
 case 'named-complement-alternatives':return (ja?'明示された補助品種: ':'Explicitly named complementary alternatives: ')+requirement.names.join(', ');
 case 'aromatic-classification':return (requirement.value==='non-aromatic'?(ja?'非芳香性':'non-aromatic'):(ja?'芳香性':'aromatic'))+(requirement.exceptNames?.length?` (${ja?'例外':'except'}: ${requirement.exceptNames.join(', ')})`:'')+(requirement.appliesTo==='other-complement-varieties'?(ja?'（その他の補助品種のみ）':' (other complementary varieties only)'):'');
 case 'national-registration':return ja?'国の品種登録が必要':'national variety registration required';
 case 'conditional-vinification':return ja?'黒ブドウは白ワイン醸造が条件':'black grapes require white vinification';
 case 'named-exception':return `${requirement.names.join(', ')}: ${ja?'例外上限':'exception cap'} ${requirement.max}%`;
 default:return '';
 }
}
export function sourceDomainConditionSummaries(rule,language='en'){
 const d=rule?.sourceDomain,ja=language==='ja';if(!d)return [];
 if(d.profile===CLOSED_NAMED_PROPERTY_PROFILE)return [ja?'原文に列挙された品種と、その主原料にかかる条件。個別の適合性は未確認です。':'Source-listed varieties with conditions on the principal grape sources; individual compliance remains unverified.',...d.compiled.requirements.map(r=>requirementSummary(r,ja)).filter(Boolean)];
 const registrationSummary=d.compiled?.vineyardRegistration?[ja?'畑登録の特則：識別可能な栽培区画、または既存の畑の個々の樹（栽培面積の明記が必要）。個別の適格性は未判定です。':'Vineyard registration provision: identifiable cultivated portions, or individual vines in existing vineyards with stated cultivated surface. Individual eligibility is not assessed.']:[];
 const principalSummary=d.knownPrincipalOnly ? d.compiled.named.map(row=>`${ja?'原文の主要品種群':'Source principal group'}: ${row.names.join(' / ')}; ${row.min===undefined?'':`${ja?'最低':'minimum'} ${row.min}%`} ${row.max===undefined?'':`${ja?'最高':'maximum'} ${row.max}%`}. ${ja?'未同定の品種を含む。表示した品種だけの法定比率ではありません。':'Includes unresolved identities; this is not a legal minimum for the displayed subset.'}`) : [];
 const component=d.compiled?.remainder||d.compiled?.presenceTolerance;
 if(component)return [...registrationSummary,...principalSummary,`${d.compiled?.presenceTolerance?(ja?'畑への混在のみ（原料への使用許可ではありません）':'Vineyard presence only; no fruit-use permission'):(d.compiled.basis==='grapes'?(ja?'補助品種の原料ブドウ比率':'Complementary grape composition'):(ja?'補助品種の畑の比率':'Complementary varieties in vineyards'))}: ${ja?'上限':'maximum'} ${component.max}%`,...component.requirements.map(r=>requirementSummary(r,ja)).filter(Boolean)];
 if(d.profile===SCOPED_ANNEX_PROFILE)return [ja?`${d.scope.region}州で栽培適格の非芳香性${d.scope.wineType==='bianco'?'白':'黒'}ブドウ。別表の適用範囲内。`:`Non-aromatic ${d.scope.wineType==='bianco'?'white':'black'} grapes eligible in ${d.scope.region}, within the scoped annex.`];
 return [];
}
export function sourceDomainDisplay(rule,language='en') {
 const domains=(rule?.alternatives||[rule]).filter(item=>item?.sourceDomain);
 if(!domains.length)return null;
 const count=new Set((rule?.alternatives||[rule]).flatMap(item=>item.grapeIds||[])).size;
 const definitionOnly=domains.every(sourceDomainDefinitionVerified);
 return {count,summaries:domains.flatMap(item=>sourceDomainConditionSummaries(item,language)),label:definitionOnly?(language==='ja'?'原文で定義された使用可能範囲（個別品種は未確認）':'Source-defined permission domain; individual varieties unverified'):language==='ja'?`このアプリで使用可能と確認済みの${count}品種`:`${count} varieties with proved permission in this app`,notice:language==='ja'?'法的な許可範囲は以下の原文で定義されています。未確認の品種を使用禁止とはしていません。畑の比率をワインの配合率へ換算していません。':'The legal permission domain is defined by the source wording below. Unverified varieties are not treated as prohibited. Vineyard proportions are not wine blending proportions.',domains:domains.map(item=>item.sourceDomain.compiled?.presenceTolerance?`${language==='ja'?'畑への混在に限る条件（原料への使用許可ではありません）':'Vineyard presence only (not permission to use the fruit)'}: ${item.sourceDomain.compiled.presenceTolerance.original}`:item.sourceDomain.compiled?.remainder?.original||item.sourceDomain.definition?.quote||'')};
}

export function ruleRequiresReader3(rule){return Boolean(rule&&(rule.sourceDomain||rule.conditionalUse||(rule.alternatives||[]).some(ruleRequiresReader3)));}
