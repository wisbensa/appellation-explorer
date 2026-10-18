import {joinSourceLineHyphens} from './source-layout.mjs';
import {conditionalUseWitnesses} from './conditional-use.mjs';
import {sourceDomainWitness,sourceDomainDefinitionVerified} from './source-domain.mjs';
import {requiresCnrAnnotationProof} from './cnr-annotation-proof.mjs';
// Two-phase simplex: maximize c*x subject to A*x <= b and x >= 0.
// All wine rules use percent units. A shared positive slack proves simultaneous inclusion.
const EPS = 1e-9;

// This identifies the stated denominator, not a conversion between stages.
// Unsupported wording stays unknown; a vineyard percentage never proves a
// harvested-grape weight or a finished-wine volume percentage.
export function inferRatioBasis(text = '') {
  // A verified Italian Gazette line-wrap of this denominator keyword. Do not
  // erase general hyphens, which can be meaningful in source names/conditions.
  const original = text.replace(/\bcomposi-\s*\n\s*zione\b/gi, 'composizione').replace(/\s+/g, ' ');
  const stages = [];
  const explicitVineyardCap=/nei vigneti\s+fino ad un massimo del\s+\d+(?:[,.]\d+)?\s*(?:%|per cento\b)/i.test(original);
  if (explicitVineyardCap || /vigneti\s+costituiti\b|vigneti\s+aventi[^.;]{0,100}\bcomposizione\b/i.test(original) || /vigneti.{0,160}(?:compost|composizione (?:ampelografica|varietale))|superficie\s+(?:vitata|viticola)/i.test(original)) stages.push('vineyard');
  if (!explicitVineyardCap && /composizione delle uve|uve (?:raccolte|vendemmiate)|possono concorrere(?:(?!vitigni|registro)[^.;])*\b(?:le uve|uve provenienti)\b/i.test(original)) stages.push('grapes');
  if (/composizione (?:del|dei) most[oi]|most[oi] (?:ottenut[oi]|impiegat[oi])/i.test(original)) stages.push('must');
  if (/composizione (?:del|dei) vin[oi] finit[oi]|assemblaggio (?:del|dei) vin[oi]|vitigni che possono entrare nell['’]assemblaggio/i.test(original)) stages.push('wine');
  return stages.length > 1 ? 'mixed' : stages[0] || 'unknown';
}

export function ratioBasis(rule, constraint) {
  if (constraint?.basis) return constraint.basis;
  const quote = (constraint?.evidence?.[0]?.quote || '').replace(/\s+/g, ' ').trim();
  const local = inferRatioBasis(quote);
  if (local !== 'unknown') return local;
  // Legacy short percentage rows retain their preceding denominator statement.
  // Only look backwards inside the same proved scope, never into a later clause.
  const text = sourceWording(rule || {});
  const at = quote ? text.indexOf(quote) : -1;
  if (at >= 0) {
    const preceding = inferRatioBasis(text.slice(0, at + quote.length));
    if (preceding !== 'unknown') return preceding;
  }
  return rule?.basis || inferRatioBasis(text);
}

// Permission to use fruit from a stated vineyard is a qualitative source
// proof. It does not equate planted area, harvested mass or wine volume.
function sourceWording(rule) {
  const original = (rule.original || '').replace(/\s+/g, ' ').trim();
  const scoped = rule.scope === 'senza indicazione del nome dei vitigni' ? rule.evidence?.[0]?.quote?.replace(/\s+/g, ' ').trim() : original;
  return scoped && original.includes(scoped) ? scoped : '';
}

// Two fully stated exclusive-vineyard source forms. This only proves that the
// already scoped sole variety can supply fruit; it never converts planting
// percentages to harvested mass or accepts an isolated phrase from a sibling.
function closedVineyardSource(rule,text) {
  if(rule.grapeIds?.length!==1||rule.constraints?.length!==1)return false;
  const row=rule.constraints[0];
  if(row.grapeIds?.length!==1||row.grapeIds[0]!==rule.grapeIds[0]||row.min!==100||row.max!==100||ratioBasis(rule,row)!=='vineyard')return false;
  const proofs=(rule.evidence||[]).filter(e=>e.sourceId&&e.locator&&e.quote===rule.original);
  if(!proofs.some(proof=>row.evidence?.some(e=>e.sourceId===proof.sourceId&&e.locator&&e.quote===rule.original)))return false;
  const declaration=text.match(/^(?:\d+\.\s*)?La denominazione di origine controllata(?: e garantita)?\s+([^.;]+?)\s+è riservata ai vini\s+(.+)$/iu);
  if(!declaration||/\b(?:non|qualora|se|salvo|eccetto|deroga|previa|purch[eé]|condizione|autorizzazione)\b/iu.test(text))return false;
  return /^ottenuti da uve provenienti da vigneti, presenti in ambito aziendale, composti dal solo vitigno [\p{L}][\p{L}'’ -]*\.\s*$/iu.test(declaration[2])||
    /^ottenuti da uve di vigneti composti dal vitigno [\p{L}][\p{L}'’ -]* per il 100%\.\s*$/iu.test(declaration[2])||
    /\bseguita da una delle seguenti specificazioni\s*:/iu.test(declaration[1])&&/^ottenuti da uve di vigneti costituiti esclusivamente dai corrispondenti vitigni\.\s*$/iu.test(declaration[2]);
}

// A complete explicit named composition can establish qualitative source
// permission even when its percentage denominator has not been classified.
// Keep that uncertainty in the serialized rule: this finite proof supplies
// positive use only, never required use or a bottle-recipe percentage.
function namedSourcePermission(rule) {
 const normalize=value=>joinSourceLineHyphens(value).replace(/\s+/g,' ').trim();
 const text=normalize(rule.original||'');
 if(/\b(?:non|qualora|se|salvo|eccetto|deroga|previa|purch[eé]|condizione|autorizzazione)\b/iu.test(text))return null;
 const name="[\\p{L}][\\p{L}'’ -]*(?:\\s*\\([\\p{L}'’ -]+\\))?";
 const group=`${name}(?:\\s+ed?\\s+${name})*`;
 const number='(\\d+(?:[,.]\\d+)?)';
 const amount=value=>Number(value.replace(',','.'));
 const count=value=>value.replace(/\([^()]*\)/gu,'').split(/\s+ed?\s+/iu).length;
 const rows=[];
 const literal=text.match(new RegExp(`^[«“\"][^»”\"]+[»”\"] (?:bianco|rosso|rosato)\\s*:\\s*(?:100%\\s+(${name})|(${name})\\s+100%)\\.$`,'iu'));
 const direct=text.match(/^(?:\d+\.\s*)?I vini designati con la Denominazione di Origine Controllata(?: e Garantita)? [^.;]+ devono essere ottenuti, in ambito aziendale, dalla seguente composizione ampelografica: (.+)$/iu);
 if(literal)rows.push({count:1,min:100,max:100,quote:text});
 else if(direct){
  for(const part of direct[1].replace(/\.$/u,'').split(/;\s*/u)){
   const m=part.match(new RegExp(`^uve (?:del|da) vitigno (${name}) da un minimo del ${number}% fino ad un massimo del ${number}%$`,'iu'));
   if(!m)return null;rows.push({count:1,min:amount(m[2]),max:amount(m[3]),quote:part});
  }
 }else{
  const body=text.match(/^Art(?:icolo|\.)\s*2\.? Base ampelografica dei vigneti\s+(?:\d+\.\s*)?(.+)$/iu)?.[1];
  if(!body)return null;
  const listed=body.match(/^I vini [^.;]+ devono essere ottenuti dalle uve provenienti, nell['’]ambito aziendale, dai seguenti vitigni nella proporzione appresso indicata: (.+)$/iu);
  if(listed){
   for(const part of listed[1].replace(/\.$/u,'').split(/;\s*/u)){
    const m=part.match(new RegExp(`^(${group}): (?:da sol[ei] o congiuntamente )?dal ${number}% (?:fino )?al ${number}%$`,'iu'));
    if(!m)return null;rows.push({count:count(m[1]),min:amount(m[2]),max:amount(m[3]),quote:part});
   }
  }else{
   const m=body.match(new RegExp(`^I vini a denominazione di origine controllata(?: e garantita)? [«“"][^»”"]+[»”"] devono essere ottenuti, nell['’]ambito aziendale, dal vitigno (${name})\\. È consentito l['’]utilizzo dei vitigni (${group}) da soli o congiuntamente fino ad un massimo del ${number}%\\.$`,'iu'));
   if(!m)return null;const cap=amount(m[3]);rows.push({count:1,min:100-cap,quote:text},{count:count(m[2]),max:cap,quote:text});
  }
 }
 if(rows.length<(literal?1:2)||rows.length!==rule.constraints?.length||!['unknown','vineyard',undefined].includes(rule.basis))return null;
 const definitions=(rule.evidence||[]).filter(e=>e.sourceId&&e.locator&&e.quote===rule.original);
 if(!definitions.some(proof=>rows.every((row,i)=>{
  const c=rule.constraints[i];
  return c.grapeIds?.length===row.count&&c.min===row.min&&c.max===row.max&&!c.minExclusive&&['unknown','vineyard',undefined].includes(c.basis)&&
   c.evidence?.some(e=>e.sourceId===proof.sourceId&&e.locator&&text.includes(normalize(e.quote||''))&&normalize(e.quote||'').includes(row.quote));
 })))return null;
 const ids=rule.constraints.flatMap(c=>c.grapeIds);
 if(new Set(ids).size!==ids.length||ids.length!==rule.grapeIds.length||!rule.grapeIds.every(id=>ids.includes(id)))return null;
 return {...rule,original:'',evidence:[],basis:'vineyard',constraints:rule.constraints.map(c=>({...c,basis:'vineyard',evidence:[]}))};
}

// Existence of a named-only witness proves positive use, never domain closure.
function evaluateSourceDomain(rule, includeIds=[], excludeIds=[]) {
  const witness=sourceDomainWitness(rule);
  if(!witness)return {status:'unknown',reason:'Unverified source-defined permission domain'};
  if(includeIds.some(id=>!witness.grapeIds.includes(id))||excludeIds.some(id=>!witness.grapeIds.includes(id)))return {status:'unknown',reason:'Source-domain membership is not established'};
  // The source-domain compiler has independently proved the vineyard source
  // relation and scoped every bound. Solve those numeric bounds directly;
  // re-reading a whole Article 2 with the legacy unscoped prose heuristic can
  // accidentally import sibling must/wine denominators. This private numeric
  // projection is never evidence or a serialized legal rule.
  const numeric={...witness,original:'',evidence:[],constraints:witness.constraints.map(c=>({...c,evidence:[]}))};
  const result=evaluateBlend(numeric,includeIds,excludeIds);
  return result.status==='match'?{status:'match',basis:witness.basis==='grapes'?'grapes':'grape-source',evidence:rule.evidence}:{status:'unknown',reason:'No whole-composition source-domain witness established'};
}

function evaluateConditionalVineyard(rule,includeIds=[],excludeIds=[]){
 const branches=conditionalUseWitnesses(rule);
 if(!branches)return {status:'unknown',reason:'Unverified conditional vineyard rule'};
 for(const branch of branches){
  if(branch.active===false)continue;
  const singleton=branch.permissionWitness;
  const result=singleton?.kind==='homogeneous-named-source'
   ? (includeIds.every(id=>id===singleton.grapeId)&&excludeIds.length===0?{status:'match',basis:'grape-source',evidence:branch.rule.evidence}:{status:'unknown'})
   : evaluateGrapeUse(branch.rule,includeIds,excludeIds);
  if(result.status==='match')return {...result,conditions:branch.condition.kind==='general_rule'&&!branch.condition.requirements?.length?[]:[branch.condition]};
 }
 return {status:'unknown',reason:'No single applicable conditional recipe witness established'};
}

export function evaluateGrapeUse(rule, includeIds = [], excludeIds = []) {
  if(rule?.state==='unverified')return {status:'unknown'};
  if (includeIds.some(id => excludeIds.includes(id))) return { status: 'no_match', reason: 'Contradictory grape conditions' };
  if (rule?.conditionalUse)return evaluateConditionalVineyard(rule,includeIds,excludeIds);
  if (rule?.sourceDomain) return evaluateSourceDomain(rule,includeIds,excludeIds);
  if (rule?.alternatives) {
    const results = rule.alternatives.map(item => evaluateGrapeUse(item, includeIds, excludeIds));
    return results.find(item => item.status === 'match') ?? (results.some(item => item.status === 'unknown') ? { status: 'unknown' } : { status: 'no_match' });
  }
  if (validateGrapeRule(rule).length || !rule.complete) return { status: 'unknown', reason: 'Incomplete grape rules' };
  const namedSource=namedSourcePermission(rule);
  if(namedSource){
    if(excludeIds.length)return {status:'unknown',reason:'Qualitative named-source permission does not prove omission or mandatory use'};
    const possible=evaluateBlend(namedSource,includeIds);
    return possible.status==='match'?{status:'match',basis:'grape-source',evidence:rule.evidence}:{status:'unknown',reason:'No simultaneous named-source witness established'};
  }
  const groups = new Map();
  for (const constraint of rule.constraints) {
    const basis = ratioBasis(rule, constraint);
    if (!groups.has(basis)) groups.set(basis, []);
    groups.get(basis).push(constraint);
  }
  const bases = new Set(groups.size ? groups.keys() : [ratioBasis(rule)]);
  if (bases.size === 1 && ['grapes', 'wine'].includes([...bases][0])) return { ...evaluateBlend(rule, includeIds, excludeIds), basis: [...bases][0] };
  const text = sourceWording(rule);
  const source = /(?:ottenut[oi]|prodott[oi])\s+(?:da(?:lle)?|con)\s+uve\s+provenienti(?:,\s*in\s+ambito\s+aziendale,)?\s+da[il]*\s+vigneti\s*,?\s+(?:aventi|composti|costituiti)\b/i.test(text) || /ottenuti\s+da\s+uve\s+di\s+vigneti\s+aventi,?\s+(?:in\s+ambito\s+aziendale,?\s+)?la\s+seguente\s+composizione\s+ampelografica\s*:/i.test(text) || closedVineyardSource(rule,text);
  if (!source || !bases.has('vineyard') || [...bases].some(basis => !['vineyard', 'grapes', 'wine'].includes(basis))) return { status: 'unknown', reason: 'No supported grape-source proof for these production stages' };
  if (bases.has('grapes') && bases.has('wine')) return { status: 'unknown', reason: 'No conversion between harvested grapes and finished wine is established' };
  const atStage = basis => ({ ...rule, basis, original: '', scope: undefined, constraints: (groups.get(basis) || []).map(c => ({ ...c, basis, evidence: [] })) });
  const productBasis = bases.has('wine') ? 'wine' : 'grapes';
  const vineyard = atStage('vineyard'), grapes = atStage(productBasis);
  // A forbidden source cannot be included. A positive planting minimum alone
  // does not, however, prove that its fruit must enter every finished product.
  const possibleSource = evaluateBlend(vineyard, includeIds);
  if (possibleSource.status !== 'match') return { status: possibleSource.status, basis: 'grape-source', evidence: rule.evidence };
  const fruit = evaluateBlend(grapes, includeIds, excludeIds);
  if (fruit.status !== 'match') return { status: fruit.status, basis: 'grape-source', evidence: rule.evidence };
  const withoutExcluded = evaluateBlend(vineyard, includeIds, excludeIds);
  if (withoutExcluded.status !== 'match') return { status: 'unknown', reason: 'Planting presence does not establish mandatory use of its harvested fruit' };
  if (groups.has(productBasis)) {
    // A sufficient common-support witness: every remaining permitted variety
    // can be present at BOTH stages independently. Never combine percentages.
    // More complex support restrictions stay unresolved rather than guessing.
    const support = rule.grapeIds.filter(id => !excludeIds.includes(id));
    if ([vineyard, grapes].some(stage => evaluateBlend(stage, support, excludeIds).status !== 'match')) return { status: 'unknown', reason: 'A common permitted source support has not been proved' };
  }
  return { status: 'match', basis: 'grape-source', evidence: rule.evidence };
}

// Explain the actual mandatory-use proof without treating planting percentages
// as a bottle recipe. The evaluator remains the authority for necessity.
export function grapeDutyProof(rule, id) {
  if(rule?.sourceDomain||rule?.conditionalUse)return null;
  if (evaluateGrapeUse(rule, [id]).status !== 'match' || evaluateGrapeUse(rule, [], [id]).status !== 'no_match') return null;
  const constraints = rule.constraints || [];
  const direct = constraints.filter(c => c.grapeIds.length === 1 && c.grapeIds[0] === id && (c.min > 0 || c.minExclusive) && ['wine', 'grapes'].includes(ratioBasis(rule, c)));
  if (direct.length) return { kind:'direct', evidence: direct.flatMap(c=>c.evidence || []) };
  if (!rule.alternatives && rule.grapeIds.length === 1) return { kind:'sole-source', evidence:rule.evidence || [] };
  const remainder = constraints.filter(c => !c.grapeIds.includes(id) && c.max < 100 && ['wine','grapes'].includes(ratioBasis(rule,c)) && rule.grapeIds.filter(other=>other!==id).every(other=>c.grapeIds.includes(other)));
  if (remainder.length) return { kind:'remainder-cap', evidence:[...(rule.evidence || []), ...remainder.flatMap(c=>c.evidence || [])] };
  return {kind:'combined', evidence:(rule.alternatives || [rule]).flatMap(r=>[...(r.evidence || []), ...(r.constraints || []).flatMap(c=>c.evidence || [])])};
}

// Listing/adoption needs positive permission for each listed variety, not proof
// that every possible omission query is resolved. Public validation additionally
// checks the source records and each constraint's evidence.
export function grapeUsePermissionProved(rule) {
  if(rule?.state==='unverified')return false;
  if (rule?.alternatives) return rule.alternatives.length > 0 && rule.alternatives.every(grapeUsePermissionProved);
  return Boolean(rule?.evidence?.length && rule.evidence.every(e => e.sourceId && e.locator && e.quote) &&
    rule.grapeIds?.length && rule.grapeIds.every(id => evaluateGrapeUse(rule, [id]).status === 'match'));
}

// Advisory mandatory-use coverage only; not an adoption/release gate.
// Queries still evaluate their own simultaneous inclusion/omission conditions.
export function grapeUseProofComplete(rule) {
  if(rule?.state==='unverified')return false;
  if(rule?.conditionalUse){const branches=conditionalUseWitnesses(rule);return Boolean(branches&&branches.every(branch=>branch.active===false||!branch.permissionWitness&&grapeUseProofComplete(branch.rule)));}
  if (rule?.alternatives) return rule.alternatives.every(grapeUseProofComplete);
  if (evaluateGrapeUse(rule).status !== 'match') return false;
  const requiredGroups = (rule.constraints || []).filter(c => ratioBasis(rule, c) === 'vineyard').flatMap(c => [
    ...(c.min > 0 || c.minExclusive ? [c.grapeIds] : []),
    ...(c.max !== undefined && c.max < 100 ? [rule.grapeIds.filter(id => !c.grapeIds.includes(id))] : [])
  ]);
  return requiredGroups.every(ids => evaluateGrapeUse(rule, [], ids).status !== 'unknown');
}

// Check consistency within each stated denominator without adding ratios
// from different stages. This is not proof of a finished-wine composition.
export function evaluateRuleConsistency(rule) {
  if(rule?.state==='unverified')return {status:'unknown'};
  if(rule?.conditionalUse)return evaluateConditionalVineyard(rule);
  if(rule?.sourceDomain)return evaluateSourceDomain(rule);
  if (rule?.alternatives) {
    const results = rule.alternatives.map(evaluateRuleConsistency);
    return results.find(item => item.status === 'match') ?? (results.some(item => item.status === 'unknown') ? { status: 'unknown' } : { status: 'no_match' });
  }
  if (validateGrapeRule(rule).length || !rule.complete) return { status: 'unknown' };
  const groups = new Map();
  for (const constraint of rule.constraints) {
    const basis = ratioBasis(rule, constraint);
    if (!groups.has(basis)) groups.set(basis, []);
    groups.get(basis).push(constraint);
  }
  if (!groups.size) return evaluateBlend(rule);
  const results = [...groups.values()].map(constraints => evaluateBlend({ ...rule, constraints }));
  return { status: results.some(item => item.status === 'no_match') ? 'no_match' : results.some(item => item.status === 'unknown') ? 'unknown' : 'match' };
}
function solve(A, b, c) {
  const m = b.length, n = c.length, B = Array(m), N = Array(n + 1);
  const D = Array.from({ length: m + 2 }, () => Array(n + 2).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) D[i][j] = A[i][j];
    B[i] = n + i; D[i][n] = -1; D[i][n + 1] = b[i];
  }
  for (let j = 0; j < n; j++) { N[j] = j; D[m][j] = -c[j]; }
  N[n] = -1; D[m + 1][n] = 1;
  function pivot(r, s) {
    const inverse = 1 / D[r][s];
    for (let i = 0; i < m + 2; i++) if (i !== r)
      for (let j = 0; j < n + 2; j++) if (j !== s) D[i][j] -= D[r][j] * D[i][s] * inverse;
    for (let j = 0; j < n + 2; j++) if (j !== s) D[r][j] *= inverse;
    for (let i = 0; i < m + 2; i++) if (i !== r) D[i][s] *= -inverse;
    D[r][s] = inverse; [B[r], N[s]] = [N[s], B[r]];
  }
  function simplex(phase) {
    const x = phase === 1 ? m + 1 : m;
    for (let steps = 0; steps < 10000; steps++) {
      let s = -1;
      for (let j = 0; j <= n; j++) {
        if (phase === 2 && N[j] === -1) continue;
        if (s === -1 || D[x][j] < D[x][s] - EPS || (Math.abs(D[x][j] - D[x][s]) <= EPS && N[j] < N[s])) s = j;
      }
      if (D[x][s] >= -EPS) return true;
      let r = -1;
      for (let i = 0; i < m; i++) if (D[i][s] > EPS) {
        const ratio = D[i][n + 1] / D[i][s];
        const previous = r === -1 ? Infinity : D[r][n + 1] / D[r][s];
        if (r === -1 || ratio < previous - EPS || (Math.abs(ratio - previous) <= EPS && B[i] < B[r])) r = i;
      }
      if (r === -1) return false;
      pivot(r, s);
    }
    throw new Error('Blend solver iteration limit exceeded');
  }
  let r = 0;
  for (let i = 1; i < m; i++) if (D[i][n + 1] < D[r][n + 1]) r = i;
  if (D[r][n + 1] < -EPS) {
    pivot(r, n);
    if (!simplex(1) || D[m + 1][n + 1] < -EPS || Math.abs(D[m + 1][n + 1]) > EPS) return null;
    r = B.indexOf(-1);
    if (r !== -1) {
      let s = 0;
      for (let j = 1; j <= n; j++) if (D[r][j] < D[r][s] - EPS || (Math.abs(D[r][j] - D[r][s]) <= EPS && N[j] < N[s])) s = j;
      if (Math.abs(D[r][s]) > EPS) pivot(r, s);
    }
  }
  if (!simplex(2)) throw new Error('Unbounded blend rule');
  const values = Array(n).fill(0);
  for (let i = 0; i < m; i++) if (B[i] < n && B[i] >= 0) values[B[i]] = D[i][n + 1];
  return { value: D[m][n + 1], values };
}

export function validateGrapeRule(rule, knownIds = null) {
  const errors = [];
  // A stored complete flag cannot replace the proof for an annotated closed
  // production clause. Existing verified source-domain profiles recompile
  // their own explicit-synonym grammar independently.
  if(!rule?.sourceDomain&&requiresCnrAnnotationProof(rule))return ['Missing annotated production proof'];
  const domainWitness=rule?.sourceDomain?sourceDomainWitness(rule):null;
  if(rule?.conditionalUse){
    const branches=conditionalUseWitnesses(rule);
    if(!branches)return ['Invalid conditional vineyard proof'];
    return branches.flatMap(branch=>validateGrapeRule(branch.rule,knownIds)).concat(rule.grapeIds.every(id=>evaluateConditionalVineyard(rule,[id]).status==='match')?[]:['Conditional materialized grape lacks positive-use witness']);
  }
  if(rule?.sourceDomain){
    if(sourceDomainDefinitionVerified(rule))return [];
    if(!domainWitness)errors.push('Invalid source-defined permission proof');
    else if(!rule.grapeIds.every(id=>evaluateSourceDomain(rule,[id]).status==='match'))errors.push('Source-defined materialized grape lacks positive-use witness');
  }
  if (rule?.alternatives) return [...errors,...rule.alternatives.flatMap(r => validateGrapeRule(r, knownIds))];
  if (!rule || !Array.isArray(rule.grapeIds) || !Array.isArray(rule.constraints)) return ['Missing grape rule'];
  const validBasis = value => value === undefined || ['vineyard', 'grapes', 'must', 'wine', 'mixed', 'unknown'].includes(value);
  if (!validBasis(rule.basis)) errors.push('Invalid ratio basis');
  // Exact finite source-domain compilation binds the denominator for every
  // named bound; a legacy keyword heuristic cannot override that scoped proof.
  const statedBasis = domainWitness?.basis || inferRatioBasis(rule.scope ? sourceWording(rule) : rule.original);
  if (rule.scope && !sourceWording(rule)) errors.push('Unverified grape rule scope');
  if (rule.basis && statedBasis !== 'unknown' && rule.basis !== statedBasis) errors.push('Ratio basis contradicts the original wording');
  if (new Set(rule.grapeIds).size !== rule.grapeIds.length || !rule.grapeIds.length) errors.push('Invalid permitted grape universe');
  if (knownIds && rule.grapeIds.some(id => !knownIds.has(id))) errors.push('Unknown grape reference');
  for (const c of rule.constraints) {
    if (!validBasis(c.basis)) errors.push('Invalid ratio basis');
    const stated = domainWitness?.basis || inferRatioBasis(c.evidence?.[0]?.quote || '');
    if (c.basis && stated !== 'unknown' && c.basis !== stated) errors.push('Constraint basis contradicts its evidence');
    if (!Array.isArray(c.grapeIds) || !c.grapeIds.length || new Set(c.grapeIds).size !== c.grapeIds.length || c.grapeIds.some(id => !rule.grapeIds.includes(id))) errors.push('Invalid constraint grape group');
    for (const k of ['min', 'max']) if (c[k] !== undefined && (!Number.isFinite(c[k]) || c[k] < 0 || c[k] > 100)) errors.push('Invalid percent bound');
    if (c.min === undefined && c.max === undefined) errors.push('Empty constraint');
    if (c.minExclusive !== undefined && (typeof c.minExclusive !== 'boolean' || c.min === undefined)) errors.push('Invalid strict lower bound');
    if (c.min !== undefined && c.max !== undefined && c.min > c.max) errors.push('Reversed constraint bounds');
  }
  return errors;
}

export function evaluateBlend(rule, includeIds = [], excludeIds = []) {
  if(rule?.state==='unverified')return {status:'unknown'};
  if(rule?.conditionalUse)return evaluateConditionalVineyard(rule,includeIds,excludeIds);
  if(rule?.sourceDomain)return evaluateSourceDomain(rule,includeIds,excludeIds);
  if (includeIds.some(id => excludeIds.includes(id))) return { status: 'no_match', reason: 'Contradictory grape conditions' };
  if (rule?.alternatives) {
    const results = rule.alternatives.map(r => evaluateBlend(r, includeIds, excludeIds));
    return results.find(r => r.status === 'match') ?? (results.some(r => r.status === 'unknown') ? { status: 'unknown' } : { status: 'no_match' });
  }
  if (validateGrapeRule(rule).length || !rule.complete) return { status: 'unknown', reason: 'Incomplete grape rules' };
  const ids = rule.grapeIds;
  if (includeIds.some(id => !ids.includes(id))) return { status: 'no_match', reason: 'Grape outside the confirmed permitted universe' };
  const n = ids.length + 1, A = [], b = [];
  const add = (coefficients, bound) => { A.push(coefficients); b.push(bound); };
  const total = ids.map(() => 1).concat(0);
  add(total, 100); add(total.map(v => -v), -100);
  for (const constraint of rule.constraints) {
    const row = ids.map(id => constraint.grapeIds.includes(id) ? 1 : 0).concat(0);
    if (constraint.max !== undefined) add(row, constraint.max);
    if (constraint.min !== undefined) {
      const lower = row.map(v => -v);
      if (constraint.minExclusive) lower[n - 1] = 1;
      add(lower, -constraint.min);
    }
  }
  for (const id of excludeIds) if (ids.includes(id)) add(ids.map(g => g === id ? 1 : 0).concat(0), 0);
  for (const id of includeIds) add(ids.map(g => g === id ? -1 : 0).concat(1), 0);
  add(ids.map(() => 0).concat(1), 100);
  const objective = ids.map(() => 0).concat(1);
  const result = solve(A, b, objective);
  if (!result || ((includeIds.length || rule.constraints.some(c => c.minExclusive)) && result.value <= EPS)) return { status: 'no_match', reason: 'No single permitted composition satisfies the conditions' };
  return { status: 'match', composition: Object.fromEntries(ids.map((id, i) => [id, Math.max(0, result.values[i])])) };
}
