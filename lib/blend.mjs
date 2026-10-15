// Two-phase simplex: maximize c*x subject to A*x <= b and x >= 0.
// All wine rules use percent units. A shared positive slack proves simultaneous inclusion.
const EPS = 1e-9;

// This identifies the stated denominator, not a conversion between stages.
// Unsupported wording stays unknown; a vineyard percentage never proves a
// harvested-grape weight or a finished-wine volume percentage.
export function inferRatioBasis(text = '') {
  const original = text.replace(/\s+/g, ' ');
  const stages = [];
  const explicitVineyardCap=/nei vigneti\s+fino ad un massimo del\s+\d+(?:[,.]\d+)?\s*%/i.test(original);
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

export function evaluateGrapeUse(rule, includeIds = [], excludeIds = []) {
  if (includeIds.some(id => excludeIds.includes(id))) return { status: 'no_match', reason: 'Contradictory grape conditions' };
  if (rule?.alternatives) {
    const results = rule.alternatives.map(item => evaluateGrapeUse(item, includeIds, excludeIds));
    return results.find(item => item.status === 'match') ?? (results.some(item => item.status === 'unknown') ? { status: 'unknown' } : { status: 'no_match' });
  }
  if (validateGrapeRule(rule).length || !rule.complete) return { status: 'unknown', reason: 'Incomplete grape rules' };
  const groups = new Map();
  for (const constraint of rule.constraints) {
    const basis = ratioBasis(rule, constraint);
    if (!groups.has(basis)) groups.set(basis, []);
    groups.get(basis).push(constraint);
  }
  const bases = new Set(groups.size ? groups.keys() : [ratioBasis(rule)]);
  if (bases.size === 1 && ['grapes', 'wine'].includes([...bases][0])) return { ...evaluateBlend(rule, includeIds, excludeIds), basis: [...bases][0] };
  const text = sourceWording(rule);
  const source = /(?:ottenut[oi]|prodott[oi])\s+(?:da(?:lle)?|con)\s+uve\s+provenienti(?:,\s*in\s+ambito\s+aziendale,)?\s+da[il]*\s+vigneti\s*,?\s+(?:aventi|composti)\b/i.test(text);
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
  if (rule?.alternatives) return rule.alternatives.length > 0 && rule.alternatives.every(grapeUsePermissionProved);
  return Boolean(rule?.evidence?.length && rule.evidence.every(e => e.sourceId && e.locator && e.quote) &&
    rule.grapeIds?.length && rule.grapeIds.every(id => evaluateGrapeUse(rule, [id]).status === 'match'));
}

// Advisory mandatory-use coverage only; not an adoption/release gate.
// Queries still evaluate their own simultaneous inclusion/omission conditions.
export function grapeUseProofComplete(rule) {
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
  if (rule?.alternatives) return rule.alternatives.flatMap(r => validateGrapeRule(r, knownIds));
  if (!rule || !Array.isArray(rule.grapeIds) || !Array.isArray(rule.constraints)) return ['Missing grape rule'];
  const validBasis = value => value === undefined || ['vineyard', 'grapes', 'must', 'wine', 'mixed', 'unknown'].includes(value);
  if (!validBasis(rule.basis)) errors.push('Invalid ratio basis');
  const statedBasis = inferRatioBasis(rule.scope ? sourceWording(rule) : rule.original);
  if (rule.scope && !sourceWording(rule)) errors.push('Unverified grape rule scope');
  if (rule.basis && statedBasis !== 'unknown' && rule.basis !== statedBasis) errors.push('Ratio basis contradicts the original wording');
  if (new Set(rule.grapeIds).size !== rule.grapeIds.length || !rule.grapeIds.length) errors.push('Invalid permitted grape universe');
  if (knownIds && rule.grapeIds.some(id => !knownIds.has(id))) errors.push('Unknown grape reference');
  for (const c of rule.constraints) {
    if (!validBasis(c.basis)) errors.push('Invalid ratio basis');
    const stated = inferRatioBasis(c.evidence?.[0]?.quote || '');
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
