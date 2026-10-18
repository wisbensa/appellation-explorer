// Browser-safe Italian complementary-clause readers. Recognition describes
// source syntax only; membership, scope binding and immutable-source proof
// verification remain independent consumers. Unknown words are never consumed.
import {joinSourceLineHyphens} from './source-layout.mjs';
import {key} from './text-key.mjs';
const amount=s=>Number(s.replace(',','.'));
const normalized=s=>joinSourceLineHyphens(s).replace(/\s+/g,' ').trim();
export const regionNameValid=value=>/^[\p{Lu}][\p{L}'’–-]*(?: (?:[\p{Lu}][\p{L}'’–-]*|d['’][\p{Lu}][\p{L}'’–-]*))*$/u.test(value);
function compileRegionalComplement(original, {remainingMaximum} = {}){
 let r=normalized(original.replace(/([\p{L}])-\s*\n\s*(?=[\p{L}])/gu,'$1')).replace(/(?<!\d),\s*|,\s*(?!\d)/g,' ');
 r=normalized(r);
 const priorReference=/ come sopra identificati[;. ]*$/.test(r);
 if(priorReference)r=r.replace(/ come sopra identificati[;. ]*$/,'');
 const cap='(\\d+(?:[,.]\\d+)?)\\s*%';
 const region="([\\p{L}][\\p{L}'’ -]{0,60}?)";
 const properties='(?:(?:a bacca|purché con bacca) (bianca|nera|rossa|di colore analogo) )?(?:(non aromatici|aromatici) )?(?:da soli o congiuntamente )?(?:presenti in ambito aziendale )?idonei (?:alla )?coltivazione (?:nella|per la|per) regione '+region;
 const register="(?: (?:ed? )?iscritti nel registro nazionale (?:delle|della) variet[aà] di vite per uve da vino approvato (?:con )?D\\.M\\. \\d+ [\\p{L}]+ \\d{4} e successivi aggiornamenti(?: riportati nell['’]allegato \\d+ del presente disciplinare)?)?";
 const production='(?:alla produzione di (?:detti vini|detto vino) )?';
 const joint='(?:congiuntamente o disgiuntamente )?';
 const grapes='(?:(?:le )?uve (?:provenienti dai?|di altri) )?(?:altri )?vitigni ';
 const before='^possono(?: inoltre)? concorrere '+production+joint;
 const variants=[
  ['^altri vitigni '+properties+' per un massimo del '+cap+register+'[;. ]*$',false],
  [before+'vitigni per un massimo del '+cap+' altri vitigni '+properties+register+'[;. ]*$',true],
  ['^(?:possono concorrere per la restante parte altri vitigni|per la restante parte possono concorrere i vitigni|per il complessivo rimanente possono concorrere i vitigni) '+properties+register+'[;. ]*$',false,true],
  ['^altri vitigni '+properties+': massimo '+cap+'[;. ]*$',false],
  [before+grapes+properties+' (?:fino ad? un massimo del|per un massimo del|nella misura massima del) '+cap+register+'[;. ]*$',false],
  [before+'(?:fino ad? un massimo del|per un massimo del|nella misura massima del) '+cap+'\\.? '+production+joint+grapes+properties+register+'[;. ]*$',true],
  ['^Per il complessivo rimanente '+cap+' possono concorrere alla produzione di detti vini le uve provenienti dai vitigni '+properties+register+'[;. ]*$',true]
 ];
 for(const [pattern,front,remaining] of variants){
  const m=r.match(new RegExp(pattern,'iu'));if(!m)continue;
  const color=m[front?2:1],aromatic=m[front?3:2],regionName=m[front?4:3],max=remaining?remainingMaximum:amount(m[front?1:4]);
  if(!Number.isFinite(max)||max<0||max>100||!regionNameValid(regionName)||/\b(?:purché|solo|salvo|con|previa|secondo|subordinatamente|autorizzazione)\b/i.test(regionName))return null;
  return {original,max,requirements:[{kind:'regional-eligibility',region:regionName},...(color?[{kind:'berry-color',color}]:[]),...(aromatic?[{kind:'aromatic-classification',value:aromatic.toLowerCase()==='non aromatici'?'non-aromatic':'aromatic'}]:[]),...(/iscritti nel registro/i.test(r)?[{kind:'national-registration'}]:[]),...(priorReference?[{kind:'source-reference',reference:'preceding-identified-varieties'}]:[])]};
 }
 return null;
}

const sourceSpan = (original, start = 0, end = original.length) => ({start, end, quote: original.slice(start, end)});
const matchSpan = (original, match, offset = 0) => sourceSpan(original, offset + match.index, offset + match.index + match[0].length);
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const item of Object.values(value)) freeze(item);
    Object.freeze(value);
  }
  return value;
};

function clauseResult(original, definition, profile = 'regional-optional-complement', dependencies = []) {
  const span = sourceSpan(original);
  return freeze({
    grammar: {id: `it-${profile}`, version: 1},
    status: definition ? 'consumed' : 'unsupported',
    original, normalized: normalized(original),
    scope: {kind: 'complementary-varieties', sourceSpan: span},
    // A complementary sentence alone does not establish a production stage.
    // The enclosing complete definition retains the controlling denominator.
    basis: 'unknown', namedGroups: [],
    bounds: definition?.max === undefined ? [] : [{max: definition.max, sourceSpan: span}],
    requirements: definition?.requirements || [],
    conditions: (definition?.requirements || []).filter(item => ['berry-color', 'aromatic-classification'].includes(item.kind)).map(item => ({...item, scope: 'complementary-varieties', sourceSpan: span})),
    dependencies: [...dependencies, ...(definition?.requirements || []).filter(item => item.kind === 'berry-color' && /analogo/i.test(item.color || '')).map(() => ({kind:'principal-berry-color'}))],
    consumedSpans: definition ? [span] : [],
    residualSpans: definition ? [] : [span],
    ...(definition ? {definition} : {})
  });
}

/** Complete finite regional grammar, with exact untouched consumption spans.
 * The legacy compiler view is deliberately kept byte-for-byte shape compatible. */
export function readComplementSentence(original, options = {}) {
  return clauseResult(original, compileRegionalComplement(original, options));
}
export function compileComplementSentence(original, options = {}) {
  const result = readComplementSentence(original, options);
  // Consumers historically receive a mutable definition; do not expose the
  // immutable internal parse tree through this compatibility projection.
  return result.definition ? {original, max: result.definition.max, requirements: result.requirements.map(item => ({...item}))} : null;
}

/** Recognition for the existing short annex/materialization profiles. Their
 * scope and dependency bindings are explicit, rather than mixed into grammar. */
export function readCollectionPermission(original, {quantified = true} = {}) {
  const compiled = compileRegionalComplement(original, quantified ? {} : {remainingMaximum: 100}) || compileRegionalComplement(original.replace(/: dal 0 al (\d+(?:[,.]\d+)?)\s*%[.]?$/iu, ': massimo $1%.'));
  if (compiled) return clauseResult(original, {...compiled, original});
  let text = normalized(original).replace(/^Art(?:icolo|\.)\s*2\s+(?:Base ampelografi(?:ca|a)\s+)?/iu, '').replace(/^\d+(?:\.\d+)?\.?\s*/u, '');
  const result = (profile, requirements = [], max, dependencies = []) => clauseResult(original, {original, ...(max === undefined ? {} : {max}), requirements}, profile, dependencies);
  const annex = quantified ? text.match(/^(?:Possono concorrere fino ad? un massimo del (\d+(?:[,.]\d+)?)\s*%,? altri vitigni idonei alla coltivazione riportati nell['’]allegato (\d+))[.]?$/iu) : text.match(/^(?:(?:I vini sono ottenuti da|possono concorrere altri) vitigni idonei alla coltivazione (?:riportati nell['’]|nell['’])Allegato (\d+))[.]?$/iu);
  if (annex && (!quantified || amount(annex[1]) <= 100)) return result('annex-collection-permission', [], quantified ? amount(annex[1]) : undefined, [{kind: 'annex-reference', number: Number(annex[quantified ? 2 : 1])}]);
  const afterCap = text.match(/^Possono concorrere alla produzione di detto vino altri vitigni a bacca di colore analogo non aromatici da soli o congiuntamente per un massimo del (\d+(?:[,.]\d+)?)\s*% idonei alla coltivazione per la regione ([\p{L}'’ -]+?)[. ]*$/iu);
  if (quantified && afterCap && amount(afterCap[1]) <= 100 && regionNameValid(afterCap[2])) return result('post-cap-collection-permission', [{kind:'regional-eligibility',region:afterCap[2]},{kind:'berry-color',color:'di colore analogo'},{kind:'aromatic-classification',value:'non-aromatic'}], amount(afterCap[1]));
  const percentBefore = text.match(/^e per il restante (\d+(?:[,.]\d+)?)\s*% provenienti da vitigni idonei alla coltivazione nella Regione ([\p{L}'’ -]+?)[. ]*$/iu);
  if (quantified && percentBefore && amount(percentBefore[1]) <= 100 && regionNameValid(percentBefore[2])) return result('remaining-collection-permission', [{kind:'regional-eligibility',region:percentBefore[2]}], amount(percentBefore[1]));
  if (!quantified) {
    text = text.replace(/^Art(?:icolo|\.)\s*2\s+Base ampelografi(?:ca|a)\s*/iu, '');
    text = text.replace(/^Il vino a denominazione di origine controllata [«“"][^»”"]+[»”"] deve essere ottenuto dalle uve provenienti da vigneti aventi in ambito aziendale la seguente composizione ampelografica:\s*/iu, '');
  }
  const prefix = String.raw`(?:(?:per il complessivo rimanente possono concorrere i vitigni)|(?:(?:possono (?:inoltre )?concorrere (?:alla produzione di (?:detti vini|detto vino) )?)?(?:(?:le )?uve (?:di altri|provenienti (?:nell['’]ambito aziendale )?da) )?(?:altri )?vitigni))`;
  const properties = String.raw`(?: (?:a bacca(?: di colore)?|di colore) (?<color>bianca|nera|rossa|analogo))?(?:,? (?<aromatic>(?:non )?aromatic(?:i|he|o|a)))?,? idonei alla coltivazione`;
  const jurisdiction = String.raw`(?: (?:nella |per la |per )?[Rr]egione (?<region>[\p{L}][\p{L}'’ -]*?))?`;
  const cap = quantified ? String.raw`(?:: (?:massimo |dal 0 al )| (?:fino ad? un massimo del|per un massimo del) )(?<max>\d+(?:[,.]\d+)?)\s*%` : '';
  const bareCap = quantified && text.match(/^altri vitigni: massimo (\d+(?:[,.]\d+)?)\s*%[.]?$/iu);
  if (bareCap) return result('short-collection-permission', [], amount(bareCap[1]));
  const match = text.match(new RegExp('^' + prefix + properties + jurisdiction + cap + '[.]?$', 'iu'));
  if (match && (!match.groups.region || regionNameValid(match.groups.region))) {
    const {color, aromatic, region, max} = match.groups;
    const requirements = [...(region ? [{kind:'regional-eligibility',region}] : []), ...(color ? [{kind:'berry-color',color:color.toLowerCase() === 'analogo' ? 'di colore analogo' : color.toLowerCase()}] : []), ...(aromatic ? [{kind:'aromatic-classification',value:/^non /iu.test(aromatic) ? 'non-aromatic' : 'aromatic'}] : [])];
    return result('short-collection-permission', requirements, max === undefined ? undefined : amount(max));
  }
  return clauseResult(original, null, 'collection-permission');
}

/** Membership cannot attest syntax. Conversely, consuming syntax does not
 * establish a referenced jurisdiction or annex. Keep this binding independent. */
export function collectionPermissionSatisfied(parsed, resolution, materialized = false) {
  if (parsed.status !== 'consumed') return false;
  const regionBound = region => !region || !materialized && (!resolution || resolution.state !== 'confirmed') || Array.isArray(resolution?.regionReferences) && resolution.regionReferences.some(value => key(value).replace(/^regione /u, '') === key(region).replace(/^regione /u, ''));
  return parsed.requirements.filter(item => item.kind === 'regional-eligibility').every(item => regionBound(item.region)) && parsed.dependencies.every(item => item.kind !== 'annex-reference' || Number.isInteger(resolution?.annexReference) && resolution.annexReference === item.number);
}

// Layout view with lossless source bounds. Only the historical region-reference
// PDF line-wrap transformation is applied here; no legal words are discarded.
function regionView(original) {
  let text = '', spans = [], previous = 0;
  for (const match of original.matchAll(/([\p{L}])-\r?\n[ \t]*([\p{L}])/gu)) {
    for (let i = previous; i < match.index; i++) {text += original[i]; spans.push([i, i + 1]);}
    text += match[1] + match[2];
    for (let i = 0; i < match[1].length; i++) spans.push([match.index + i, match.index + i + 1]);
    const last = match.index + match[0].length - match[2].length;
    for (let i = 0; i < match[2].length; i++) spans.push([last + i, last + i + 1]);
    previous = match.index + match[0].length;
  }
  for (let i = previous; i < original.length; i++) {text += original[i]; spans.push([i, i + 1]);}
  return {text, span: (start, end) => sourceSpan(original, spans[start]?.[0] ?? original.length, spans[end - 1]?.[1] ?? original.length)};
}

const contexts = new WeakSet();
/** Shared property observations for collection membership. Partial observations
 * are not complete permissions: the separate finite clause result must consume
 * all operative text before extract can materialize a complete grape rule. */
export function readCollectionContext(original, retained) {
  if (contexts.has(retained) && retained.original === original) return retained;
  const materialColor = original.match(/\btaglio\s+di\s+mosti\s+o\s+di\s+vini\s*,\s*di\s+colore\s+analogo\b/i);
  const view = regionView(original);
  const regionalReferences = [...view.text.matchAll(/\bidone[ioae]\s+(?:(?:alla\s+)?coltivazione\s+)?(?:nella\s+|per\s+la\s+|per\s+|in\s+)([\p{L}'’ -]+(?:\s+[\p{L}'’ -]+)*)/giu)].map(match => ({value:match[1],sourceSpan:view.span(match.index,match.index+match[0].length)}));
  const restriction = original.match(/(?:a\s+bacca|bacca\s+di\s+colore|di\s+colore)\s+(bianca|nera|rossa|analogo)/i);
  const berryColor = restriction && !/^\s+[oe]\s+(?:bianca|nera|rossa)/i.test(original.slice(restriction.index + restriction[0].length)) ? {value:restriction[1].toLowerCase(),sourceSpan:matchSpan(original,restriction)} : null;
  const start = original.search(/\baltri\s+vitigni\b/iu), offset = Math.max(0, start), aromaticText = original.slice(offset);
  const aromaticTokens = aromaticText.match(/[\p{L}\p{N}_\p{Pd}]*aromatic[\p{L}\p{N}_\p{Pd}]*/giu) || [];
  const unsupportedAromatic = aromaticTokens.some(token => !/^aromatic(?:i|he|o|a)$/iu.test(token)) || /\bnon\s*\p{P}+\s*aromatic/iu.test(aromaticText);
  const aromaticPredicates = [...aromaticText.matchAll(/(?<![\p{L}\p{N}_\p{Pd}])(?:(non)\s+)?aromatic(?:i|he|o|a)(?![\p{L}\p{N}_\p{Pd}])(?:\s*,?\s+idonei\s+alla\s+coltivazione)?/giu)].map(match => ({value:match[1]?'non-aromatic':'aromatic',sourceSpan:matchSpan(original,match,offset)}));
  const result = freeze({grammar:{id:'it-collection-properties',version:1},original,status:'observed',scope:{kind:start>=0?'complementary-varieties':'collection-context',sourceSpan:sourceSpan(original,offset)},materialColor:materialColor?{sourceSpan:matchSpan(original,materialColor)}:null,regionalReferences,nationalRegistration:/iscritti\s+nel\s+Registro\s+Nazionale\s+delle\s+variet[aà]\s+di\s+vite/iu.test(original),berryColor,aromatic:{sourceSpan:sourceSpan(original,offset),unsupported:unsupportedAromatic,predicates:aromaticPredicates},conditions:readPermissionConditions(original)});
  contexts.add(result);
  return result;
}

/** Preserve the existing bounded condition profiles and diagnostic quotes.
 * Ignored conditions are only those already consumed by an enclosing profile. */
export function readPermissionConditions(text, ignoredClauses = []) {
  const original = ignoredClauses.reduce((remaining, clause) => remaining.replace(clause, ''), text);
  let residual = original;
  const conditions = [];
  const aromatic = /\b(?:(?:non\s+)?aromatici\s*,?\s+idonei\s+alla\s+coltivazione|non\s+aromatici\s*,\s*(?:presenti\s+in\s+ambito\s+aziendale\s*,\s*idonei\s+alla\s+coltivazione|idonei\s+coltivazione))\b/gi;
  for (const match of residual.matchAll(aromatic)) conditions.push({kind:'aromatic-classification',profile:'eligibility-modifier',nonAromatic:/^non\s+aromatic/i.test(match[0]),quote:match[0]});
  residual = residual.replace(aromatic, 'idonei alla coltivazione');
  const joint = /non\s+aromatici\s*,?\s+da\s+soli\s+o\s+congiuntamente\s*,?\s+per\s+(?:un\s+massimo\s+del|il\s+restante)\s+\d+(?:[,.]\d+)?\s*%\s+(?:idonei\s+alla\s+coltivazione|iscritti\s+nel\s+Registro\s+Nazionale)/gi;
  for (const match of residual.matchAll(joint)) conditions.push({kind:'aromatic-classification',profile:'joint-maximum-modifier',nonAromatic:true,quote:match[0]});
  residual = residual.replace(joint, '');
  residual = residual.replace(/purch[eé]\s+con\s+bacca\s+di\s+colore\s+analogo\s*,?\s*/gi, quote => {conditions.push({kind:'berry-color',profile:'analogous-proviso',quote});return '';});
  return {original,conditions,unsupported:/in deroga|ad eccezione|con esclusione|con l[’']esclusione|eccetto|non\s+aromatic|aromatici\s+idonei|purch[eé]|a condizione|complessivo.*(?:non|massimo)/i.test(residual),berryRestriction:/(?:a\s+bacca|bacca\s+di\s+colore|di\s+colore)\s+(?:bianca|nera|rossa|analogo)(?!\s+[oe]\s+(?:bianca|nera|rossa))/i.test(text),alternative:/in alternativa|alternativamente|oppure|ovvero/i.test(text)};
}
