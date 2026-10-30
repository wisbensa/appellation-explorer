import {evaluateWine, searchAppellations} from './public-display.mjs';

// Query semantics are explicit UI state, not additions to the published DTO.
const kinds = new Set(['country','region','grape','gi','traditional','type','qualifier']);
const grapeModes = new Set(['listed','permitted','required','non-use','include','exclude']);
function validFilters(filters) {
  return Array.isArray(filters) && filters.every(f => f && typeof f === 'object' && !Array.isArray(f)
    && Object.keys(f).length === 3 && Object.keys(f).every(k => ['kind','id','mode'].includes(k))
    && kinds.has(f.kind) && typeof f.id === 'string' && f.id.trim()
    && (f.kind === 'grape' ? grapeModes.has(f.mode) : ['include','exclude'].includes(f.mode)));
}
const copy = filters => filters.map(f => ({kind:f.kind,id:f.id,mode:f.mode}));
function stateOf(filters) {
  if (!validFilters(filters)) return {status:'invalid',reason:'invalid-filter-shape'};
  if (filters.some(f => f.kind === 'grape' && f.mode === 'exclude')) return {status:'retired',reason:'retired-grape-exclude'};
  if (filters.some(f => f.kind === 'grape' && f.mode === 'include')) return {status:'ambiguous',reason:'legacy-grape-include'};
  return {status:'ok',reason:null};
}
export function parseExplorationQuery(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !['fv','f'].includes(k)))
    return {status:'invalid',reason:'invalid-query-shape',version:null,filters:[]};
  const version = input.fv === undefined ? null : input.fv === '2' ? 2 : undefined;
  if (version === undefined) return {status:'invalid',reason:'unsupported-query-version',version:null,filters:[]};
  if (input.f !== undefined && typeof input.f !== 'string') return {status:'invalid',reason:'invalid-filter-json',version,filters:[]};
  let filters;
  try { filters = input.f === undefined ? [] : JSON.parse(input.f); } catch { return {status:'invalid',reason:'invalid-filter-json',version,filters:[]}; }
  const result = stateOf(filters);
  if (result.status === 'invalid') return {...result,version,filters:[]};
  if (version === null && filters.some(f => f.kind === 'grape' && ['listed','permitted'].includes(f.mode)))
    return {status:'invalid',reason:'explicit-mode-requires-version',version,filters:copy(filters)};
  return {...result,version,filters:copy(filters)};
}
export function serializeExplorationQuery(filters) {
  // Versioning preserves unresolved legacy meaning; it does not resolve it.
  if (stateOf(filters).status === 'invalid') throw new Error('Invalid exploration filters');
  return {fv:'2',f:JSON.stringify(copy(filters))};
}
export function canonicalExplorationFilters(filters) {
  if (!validFilters(filters)) throw new Error('Invalid exploration filters');
  return JSON.stringify([...new Set(filters.map(f => JSON.stringify([f.kind,f.id,f.mode])))].sort().map(s => JSON.parse(s)));
}
export function upsertExplorationFilter(filters, filter) {
  if (!validFilters(filters) || !validFilters([filter])) throw new Error('Invalid exploration filter');
  // Meaning changes require an explicit remove/change action, never an implicit upsert.
  return filters.some(f => f.kind === filter.kind && f.id === filter.id && f.mode === filter.mode)
    ? copy(filters) : [...copy(filters),...copy([filter])];
}
const empty = (status,reason) => ({status,reason,results:[],unknownCount:0,unknownAppellations:[]});
function knownReference(data,f) {
  const collection = {country:'countries',region:'regions',grape:'grapes'}[f.kind];
  return collection ? data[collection].some(x => x.id === f.id) : data.candidates.some(x => x.kind === f.kind && x.id === f.id);
}
export function evaluateExplorationQuery(data, filters) {
  const state = stateOf(filters);
  if (state.status !== 'ok') return empty(state.status,state.reason);
  if (filters.some(f => !knownReference(data,f))) return empty('invalid','unknown-filter-reference');
  const listed = filters.filter(f => f.kind === 'grape' && f.mode === 'listed');
  const permitted = filters.some(f => f.kind === 'grape' && f.mode === 'permitted');
  if (!listed.length && !permitted) return {status:'ok',reason:null,...searchAppellations(data,filters)};
  const identity = filters.filter(f => ['country','region'].includes(f.kind));
  const rules = filters.filter(f => !['country','region'].includes(f.kind) && !(f.kind === 'grape' && f.mode === 'listed'));
  const results = [], unknownAppellations = [];
  for (const app of data.appellations) {
    const scope = evaluateWine(data,app,{searchCases:[]},identity);
    if (scope.status === 'noMatch') continue;
    if (scope.status !== 'match') { unknownAppellations.push(app); continue; }
    if (listed.length) {
      // Appellation observations cannot prove conjunction with a wine-level rule.
      if (rules.length) { unknownAppellations.push(app); continue; }
      const observations = [...new Set(listed.map(f => f.id))].map(id => {
        const found = (app.publishedGrapeObservations ?? []).filter(o => o.grapeId === id);
        return found.length === 1 && found[0].scope === 'published-summary' && found[0].evidence?.length ? found[0] : null;
      });
      if (observations.some(o => !o)) { unknownAppellations.push(app); continue; }
      results.push({appellation:app,matches:[],publishedGrapeOutcome:{status:'match',appellationLevel:true,scope:'published-summary',observations,
        evidence:observations.flatMap(o => o.evidence),conditions:observations.flatMap(o => data.schemaVersion === 7
          ? o.conditions.filter(c => c.role === 'qualification' && c.scope === 'published-summary').map(c => c.text)
          : o.conditions)}});
      continue;
    }
    // This internal adapter alone maps the explicit permission predicate to the
    // existing rule-case spelling. Never call the published-listing shortcut.
    const ruleFilters = filters.map(f => f.kind === 'grape' && f.mode === 'permitted' ? {...f,mode:'include'} : f);
    const entities = [app,...data.designations.filter(d => d.appellationId === app.id)];
    const matches = []; let unresolved = false, count = 0;
    for (const entity of entities) for (const wine of entity.wines) {
      count++;
      const outcome = evaluateWine(data,app,wine,ruleFilters);
      if (outcome.status === 'match') matches.push({wine,...(entity !== app ? {designation:entity} : {}),...outcome});
      else if (['unknown','conflict'].includes(outcome.status)) unresolved = true;
    }
    if (matches.length) results.push({appellation:app,matches});
    if (unresolved || !count) unknownAppellations.push(app);
  }
  return {status:'ok',reason:listed.length && rules.length ? 'mixed-scope-unproved' : null,results,unknownCount:unknownAppellations.length,unknownAppellations};
}
