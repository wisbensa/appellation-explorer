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

// Display-only compatibility. Optional explicit min/max bounds are not written
// back to v1 data; absent bounds remain unknown rather than assumed minima.
export function alcoholPresentation(field, value, language = 'ja') {
  const ja = language === 'ja';
  const labels = ja ? {actual:'実アルコール度数',total:'総アルコール度数',natural:'自然アルコール度数',potential:'潜在アルコール度数'} : {actual:'Actual alcohol',total:'Total alcohol',natural:'Natural alcohol',potential:'Potential alcohol'};
  const proof = alcoholDisplayProof(field, value);
  const finite = n => typeof n === 'number' && Number.isFinite(n);
  let lower = finite(value.min) ? value.min : value.minimum === true ? value.value : null;
  let upper = finite(value.max) ? value.max : value.maximum === true ? value.value : null;
  if (lower == null && upper == null && proof.minimum) lower = value.value;
  const unit = value.unit === '% vol' || value.unit === '%' ? '%' : value.unit || (ja?'（単位未確認）':' (unit unverified)');
  const format = n => `${n}${unit}`;
  const invalid = value.min !== undefined && !finite(value.min) || value.max !== undefined && !finite(value.max) || !labels[value.metric] || !finite(value.value) || lower != null && !finite(lower) || upper != null && !finite(upper) || lower != null && upper != null && (lower > upper || lower === upper && (value.minExclusive || value.maxExclusive));
  let amount;
  if (invalid) amount = ja?'数値・指標・上下限の対応が未確認です。公式原文を確認してください。':'Metric/value/bound correspondence is unverified; consult the official original.';
  else {
    const parts=[];
    if (lower != null) parts.push(ja?`${format(lower)}${value.minExclusive?'超':'以上'}`:`${value.minExclusive?'>':'≥'} ${format(lower)}`);
    if (upper != null) parts.push(ja?`${format(upper)}${value.maxExclusive?'未満':'以下'}`:`${value.maxExclusive?'<':'≤'} ${format(upper)}`);
    amount=parts.length?parts.join(ja?'、':' and '):`${format(value.value)}${ja?'（上下限は未確認）':' (bound unverified)'}`;
  }
  const contexts=[];
  // Keep both applicability and conditions: they can describe different facts.
  for(const [key,title] of [['applicability',ja?'適用対象':'Applies to'],['conditions',ja?'条件':'Conditions'],['stage',ja?'製造段階':'Production stage']]) {
    const raw=value[key] ?? field?.[key];if (!raw) continue;
    const original=typeof raw==='string'?raw:raw.original;
    if (original) {
      const known=key==='applicability' && original.match(/^\s*\d+(?:[,.]\d+)?\s*%\s*(?:vol\.?)?\s*per\s+(?:la\s+)?tipologia\s+(bianco|rosso|rosato)(\s+(?:novello|frizzante|passito|abboccato|dolce))?\s*$/i);
      const terms={bianco:'白',rosso:'赤',rosato:'ロゼ',novello:'ノヴェッロ',frizzante:'微発泡',passito:'パッシート',abboccato:'やや甘口',dolce:'甘口'};
      contexts.push({key,text:ja&&known?`${title}：${[known[1],known[2]?.trim()].filter(Boolean).map(x=>terms[x.toLowerCase()]).join('・')}`:`${title}（${ja?'公式記述':'official wording'}）：${original}`});
    }
    else contexts.push({key,text:ja?`${title}の表示形式は未対応です。公式原文を確認してください。`:`Unsupported ${title.toLowerCase()} format; consult the official original.`});
  }
  const label=labels[value.metric] || (ja?'指標未確認':'Unverified metric');
  return {text:ja?`${label}は${amount}${invalid?'':'です。'}`:`${label}: ${amount}`,contexts,proof,unresolved:invalid || lower==null && upper==null};
}

// A disclosure/audit signal only, never a parser or proof of metric/scope.
// Unmapped numbers may belong to another type in the retained paragraph.
export function alcoholUnmappedClauses(field) {
  const known = new Set((field?.values || []).flatMap(v=>[v.value,v.min,v.max]).filter(Number.isFinite));
  return (field?.original || '').split(';').map(s=>s.trim()).filter(clause=>
    [...clause.matchAll(/\d+(?:\s*[,\.]\s*\d+)?\s*%/g)].some(m=>!known.has(Number(m[0].replace('%','').replace(/\s/g,'').replace(',','.')))));
}
