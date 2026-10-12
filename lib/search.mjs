import { japaneseDisplay } from './display-names.mjs';
import { evaluateGrapeUse } from './blend.mjs';

export function displayName(entity, language = 'ja') {
  const name = entity?.name ?? entity;
  return typeof name === 'string' ? (language === 'ja' ? japaneseDisplay(name) || name : name) : (name?.[language] || (language === 'ja' ? japaneseDisplay(name?.original) : '') || name?.original || name?.en || name?.ja || '');
}

export function normalizeName(value) {
  return String(value ?? '').normalize('NFKC').replace(/[ァ-ヶ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60)).normalize('NFD').replace(/([A-Za-z])\p{M}+/gu, '$1').normalize('NFC').toLowerCase().replace(/[’‘]/g, "'").replace(/[・\s]+/g, '').trim();
}

function names(entity) {
  const name = entity?.name ?? entity;
  if (typeof name === 'string') return { names: [name], aliases: [] };
  return { names: [...new Set([name?.original, name?.ja, name?.en, japaneseDisplay(name?.original)].filter(Boolean))], aliases: name?.aliases ?? [] };
}

export function buildCandidates(data, { facets = false } = {}) {
  const result = [];
  const add = (kind, entity, extra = {}) => result.push(structuredClone({ kind, id: entity.id, name: entity.name, ...extra }));
  for (const entity of data.countries ?? []) add('country', entity);
  for (const entity of data.regions ?? []) add('region', entity, { countryId: entity.countryId, parentId: entity.parentId });
  for (const entity of data.appellations ?? []) add('appellation', entity, { countryId: entity.countryId, regionIds: entity.regionIds });
  for (const entity of data.designations ?? []) add('designation', entity, { appellationId: entity.appellationId, qualification: entity.qualification });
  for (const entity of data.grapes ?? []) add('grape', entity);
  const terms = new Map();
  for (const app of data.appellations ?? []) {
    for (const value of [app.gi].filter(Boolean)) terms.set(`gi:${value}`, { kind: 'gi', id: value, name: { original: value } });
    for (const value of app.traditionalTerms ?? []) terms.set(`traditional:${value}`, { kind: 'traditional', id: value, name: { original: value } });
    for (const wine of [...(app.wines ?? []), ...(data.designations ?? []).filter(item => item.appellationId === app.id).flatMap(item => item.wines ?? [])]) {
      if (wine.type) for (const type of facets ? typeParts(wine.type) : [wine.type]) terms.set(`type:${type}`, { kind: 'type', id: type, name: { original: type } });
      for (const value of wine.qualifiers ?? []) terms.set(`qualifier:${value}`, { kind: 'qualifier', id: value, name: { original: value } });
    }
  }
  result.push(...terms.values());
  return result;
}

export function findCandidates(data, query, language = 'ja') {
  const q = normalizeName(query);
  if (!q) return [];
  const candidates = buildCandidates(data, { facets: true });
  const result = [];
  for (const candidate of candidates) {
    const values = names(candidate);
    let rank = Infinity;
    for (const [kind, texts] of [['names', values.names], ['aliases', values.aliases]]) {
      for (const text of texts) {
        const n = normalizeName(text);
        const method = n === q ? 0 : n.startsWith(q) ? 1 : n.includes(q) ? 2 : Infinity;
        rank = Math.min(rank, method * 2 + (kind === 'aliases' ? 1 : 0));
      }
    }
    if (rank < Infinity) result.push({ ...candidate, rank });
  }
  const order = ['country', 'region', 'appellation', 'designation', 'grape', 'gi', 'traditional', 'type', 'qualifier'];
  const collator = new Intl.Collator(language, { numeric: true });
  const unique = new Map();
  for (const item of result) {
    const key = `${item.kind}:${item.id}:${item.appellationId ?? ''}`;
    if (!unique.has(key) || unique.get(key).rank > item.rank) unique.set(key, item);
  }
  return [...unique.values()].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.rank - b.rank || collator.compare(displayName(a, language), displayName(b, language)) || `${a.kind}:${a.id}`.localeCompare(`${b.kind}:${b.id}`));
}

export function upsertFilter(filters, candidate, mode = 'include') {
  const filter = { kind: candidate.kind, id: candidate.id, mode };
  const index = filters.findIndex(item => item.kind === filter.kind && item.id === filter.id);
  if (index < 0) return [...filters, filter];
  return filters.map((item, i) => i === index ? filter : item);
}

export function regionBelongs(data, regionIds, targetId) {
  const regions = new Map((data.regions ?? []).map(region => [region.id, region]));
  return (regionIds ?? []).some(id => {
    const seen = new Set();
    while (id && !seen.has(id)) {
      if (id === targetId) return true;
      seen.add(id);
      id = regions.get(id)?.parentId;
    }
    return false;
  });
}

export const typeParts = value => [...new Set(String(value || '').split(/\s*\/\s*/).filter(Boolean))];

function ordinaryMatch(data, app, wine, filter) {
  let value;
  switch (filter.kind) {
    case 'country': value = app.countryId === filter.id; break;
    case 'region': value = Array.isArray(app.regionIds) ? regionBelongs(data, app.regionIds, filter.id) : undefined; break;
    case 'gi': value = app.gi ? app.gi === filter.id : undefined; break;
    case 'traditional': value = Array.isArray(app.traditionalTerms) ? app.traditionalTerms.includes(filter.id) : undefined; break;
    case 'type': value = wine.type ? typeParts(filter.id).every(part => typeParts(wine.type).includes(part)) : undefined; break;
    case 'qualifier': value = Array.isArray(wine.qualifiers) ? wine.qualifiers.includes(filter.id) : undefined; break;
    default: return 'unknown';
  }
  if (value === undefined) return 'unknown';
  return (filter.mode === 'exclude' ? !value : value) ? 'match' : 'no_match';
}

export function evaluateWine(data, app, wine, filters) {
  const ordinary = filters.filter(filter => filter.kind !== 'grape').map(filter => ordinaryMatch(data, app, wine, filter));
  if (ordinary.includes('no_match')) return { status: 'no_match', reasons: [] };
  const grapes = filters.filter(filter => filter.kind === 'grape');
  let blend = { status: 'match' };
  if (grapes.length) blend = evaluateGrapeUse(wine.grapeRule, grapes.filter(item => item.mode !== 'exclude').map(item => item.id), grapes.filter(item => item.mode === 'exclude').map(item => item.id));
  if (blend.status === 'no_match') return { status: 'no_match', reasons: [] };
  if (ordinary.includes('unknown') || blend.status === 'unknown') return { status: 'unknown', reasons: [] };
  return { status: 'match', composition: blend.composition, reasons: grapes.map(filter => ({ kind: 'grape', grapeId: filter.id, mode: filter.mode, original: wine.grapeRule?.original ?? '', evidence: wine.grapeRule?.evidence ?? [] })) };
}

export function searchAppellations(data, filters = []) {
  const results = [];
  let unknownCount = 0;
  const unknownAppellations = [];
  for (const app of data.appellations ?? []) {
    const scopes = [...(app.wines ?? []).map(wine => ({ wine })), ...(data.designations ?? []).filter(item => item.appellationId === app.id).flatMap(designation => (designation.wines ?? []).map(wine => ({ wine, designation })))];
    const matches = [];
    let unknown = false;
    for (const scope of scopes) {
      const outcome = evaluateWine(data, app, scope.wine, filters);
      if (outcome.status === 'match') matches.push({ ...scope, ...outcome });
      else if (outcome.status === 'unknown') unknown = true;
    }
    if (matches.length) results.push({ appellation: app, matches });
    else if (unknown || !scopes.length) { unknownCount++; unknownAppellations.push(app); }
  }
  return { results, unknownCount, unknownAppellations };
}

export function validateCandidates(data) {
  const expected = buildCandidates(data);
  const key = item => `${item.kind}:${item.id}:${item.appellationId ?? ''}`;
  const actual = data.candidates ?? [];
  const stable = value => {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().filter(name => value[name] !== undefined).map(name => [name, stable(value[name])]));
    return value;
  };
  const expectedByKey = new Map(expected.map(item => [key(item), JSON.stringify(stable(item))]));
  const seen = new Set();
  const errors = [];
  for (const item of actual) {
    const id = key(item);
    if (seen.has(id)) errors.push(`Duplicate search candidate: ${id}`);
    if (!expectedByKey.has(id)) errors.push(`Candidate has no public target: ${id}`);
    else if (JSON.stringify(stable(item)) !== expectedByKey.get(id)) errors.push(`Candidate differs from its public target: ${id}`);
    seen.add(id);
  }
  for (const item of expected) if (!seen.has(key(item))) errors.push(`Missing search candidate: ${key(item)}`);
  return errors;
}
