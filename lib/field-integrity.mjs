// Conservative checks over retained extraction evidence. No legal values are
// invented here. Legacy inconsistencies require saved-original reprocessing.
export function fieldIssues(field, kind) {
  if (!field || field.state !== 'confirmed') return [];
  const original = field.original || '';
  const values = field.values || [];
  const issues = [];
  if (kind === 'alcohol') {
    if (!values.length) issues.push('missing quantified alcohol requirement');
    for (const [term, metric] of [['totale','total'],['effettivo','actual'],['naturale','natural']]) {
      if (new RegExp(`\\b${term}(?:\\s+svolto)?\\s*[:;]?\\s*(?:minimo)?\\s*[:;]?\\s*\\d+(?:[,.]\\d+)?\\s*%`, 'i').test(original) && !values.some(value => value.metric === metric)) issues.push(`unextracted ${metric} alcohol`);
    }
  }
  if (kind === 'sensory' && /caratteristiche\s*:\s*$/i.test(original) && !/(?:colore|odore|sapore)\s*:/i.test(original)) issues.push('introduction without sensory characteristics');
  if (kind === 'area' && /^art\.\s*\d+\./i.test(original.trim()) && /invecchiamento|vinificazione|lieviti/i.test(original)) issues.push('cross-reference mistaken for area heading');
  if (kind === 'ageing' && /Durata[\s\S]*di cui in legno[\s\S]*Decorrenza/i.test(original) && (!values.some(v=>v.container === 'wood' && v.relation === 'included_in_total') || !values.some(v=>v.container==='total'))) issues.push('ageing table columns unresolved');
  const total = values.find(v=>v.container==='total');
  if (kind === 'ageing' && total && values.some(v=>v.relation==='included_in_total' && v.months > total.months)) issues.push('included duration exceeds total');
  return issues;
}

// Presentation evidence only: do not mutate retained values or infer a bound
// from another metric, number, wine or unsupported free-text condition.
export function alcoholDisplayProof(field, value) {
  const terms = { total: 'totale', actual: 'effettivo(?:\\s+svolto)?', natural: 'naturale' };
  if (!terms[value.metric]) return { minimum: value.minimum === true, evidence: [] };
  const pattern = new RegExp(`(?:titolo alcolometrico\\s+(?:volumico\\s+)?)?\\b${terms[value.metric]}\\s*[:;]?\\s*(minimo)?\\s*[:;]?\\s*(\\d+(?:[,.]\\d+)?)\\s*%(?:\\s*vol\\.?)?`, 'gi');
  const collect = evidence => evidence.flatMap(item => [...(item.quote || '').matchAll(pattern)].filter(m => Number(m[2].replace(',', '.')) === value.value).map(m => ({ ...item, quote: m[0], minimum: Boolean(m[1]) })));
  const evidence = collect(value.evidence?.length ? value.evidence : field.evidence || []);
  const minimum = value.minimum === true || evidence.length > 0 && evidence.every(item => item.minimum);
  return { minimum, evidence: [...new Map(evidence.map(item => [JSON.stringify(item), item])).values()] };
}

// Exact structured start-date phrases only; unknown legal prose is not translated
// by substituting individual words. The original remains in the field evidence.
export function ageingStartExplanation(value) {
  const text = (value || '').replace(/\s+/g, ' ').trim().replace(/[.;]$/, '');
  if (/^dal 1[°º]? novembre dell\s*[’']\s*anno di raccolta delle uve$/i.test(text)) return '収穫年11月1日から';
  if (/^(?:a decorrere |decorrere )?dal 1[°º]? novembre successivo alla vendemmia$/i.test(text)) return '収穫後の11月1日から';
  if (/^a partire dal 1 gennaio successivo all\s*[’']\s*annata di produzione delle uve$/i.test(text)) return '収穫翌年1月1日から';
  return null;
}
