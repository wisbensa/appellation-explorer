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
