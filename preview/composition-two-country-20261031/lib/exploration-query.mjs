import {evaluateGrapeUseScope} from './grape-use-proof.mjs';
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
function stateOf(filters,version=3) {
  if (!validFilters(filters)) return {status:'invalid',reason:'invalid-filter-shape'};
  if (filters.some(f => f.kind === 'grape' && f.mode === 'exclude')) return {status:'retired',reason:'retired-grape-exclude'};
  if (filters.some(f => f.kind === 'grape' && f.mode === 'include')) return {status:'ambiguous',reason:'legacy-grape-include'};
  if(filters.some(f=>f.kind==='grape'&&(f.mode==='listed'||version!==3&&f.mode==='non-use')))return {status:'migration-required',reason:'grape-intent-migration-required'};
  return {status:'ok',reason:null};
}
export function parseExplorationQuery(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !['fv','f'].includes(k)))
    return {status:'invalid',reason:'invalid-query-shape',version:null,filters:[]};
  const version = input.fv === undefined ? null : input.fv === '2' ? 2 : input.fv === '3' ? 3 : undefined;
  if (version === undefined) return {status:'invalid',reason:'unsupported-query-version',version:null,filters:[]};
  if (input.f !== undefined && typeof input.f !== 'string') return {status:'invalid',reason:'invalid-filter-json',version,filters:[]};
  let filters;
  try { filters = input.f === undefined ? [] : JSON.parse(input.f); } catch { return {status:'invalid',reason:'invalid-filter-json',version,filters:[]}; }
  const result = stateOf(filters,version);
  if (result.status === 'invalid') return {...result,version,filters:[]};
  if (version === null && filters.some(f => f.kind === 'grape' && ['listed','permitted'].includes(f.mode)))
    return {status:'invalid',reason:'explicit-mode-requires-version',version,filters:copy(filters)};
  return {...result,version,filters:copy(filters)};
}
export function serializeExplorationQuery(filters,{version=3}={}) {
  // Versioning preserves unresolved legacy meaning; it does not resolve it.
  if (stateOf(filters).status === 'invalid') throw new Error('Invalid exploration filters');
  if(![2,3].includes(version))throw new Error('Invalid exploration version');
  if(version===3&&stateOf(filters,version).status!=='ok')throw new Error('Unresolved exploration migration');
  return {fv:String(version),f:JSON.stringify(copy(filters))};
}
export function canonicalExplorationFilters(filters,{version=3}={}) {
  if (!validFilters(filters)) throw new Error('Invalid exploration filters');
  return JSON.stringify([version,[...new Set(filters.map(f => JSON.stringify([f.kind,f.id,f.mode])))].sort().map(s => JSON.parse(s))]);
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
export function evaluateExplorationQuery(data, filters, {version=3}={}) {
  if(![null,2,3].includes(version))return empty('invalid','unsupported-query-version');
  const state = stateOf(filters,version);
  if (state.status !== 'ok') return empty(state.status,state.reason);
  if (filters.some(f => !knownReference(data,f))) return empty('invalid','unknown-filter-reference');
  if([8,9].includes(data.schemaVersion)&&filters.some(f=>f.kind==='grape')){
    const results=[],unknownAppellations=[];
    const identity=filters.filter(f=>['country','region'].includes(f.kind));
    const semantic=filters.filter(f=>!['country','region'].includes(f.kind));
    for(const app of data.appellations){
      const gate=evaluateWine(data,app,{searchCases:[]},identity);
      if(gate.status==='noMatch')continue;
      if(gate.status!=='match'){unknownAppellations.push(app);continue;}
      const entities=[app,...data.designations.filter(d=>d.appellationId===app.id)];
      const matches=[];let unresolved=false,count=0;
      for(const entity of entities)for(const wine of entity.wines){
        count++;const o=evaluateWine(data,app,wine,filters);
        if(o.status==='match')matches.push({wine,...(entity!==app?{designation:entity}:{}),...o});
        else if(o.status!=='noMatch')unresolved=true;
      }
      const existential=semantic.length===1&&semantic[0].kind==='grape'&&semantic[0].mode==='permitted'
        ?app.grapeUseScopes.filter(s=>s.target.kind==='appellation-existential').map(s=>evaluateGrapeUseScope(s,semantic)).filter(o=>o.status==='match'):[];
      if(matches.length||existential.length)results.push({appellation:app,matches,...(existential.length?{grapeUseOutcome:{status:'match',appellationLevel:true,scopeOutcomes:existential,conditions:existential.flatMap(o=>o.conditions),evidence:existential.flatMap(o=>o.evidence)}}:{})});
      if(unresolved||!count||!app.grapeUseCoverage?.domain)unknownAppellations.push(app);
    }
    return {status:'ok',reason:null,results,unknownCount:unknownAppellations.length,unknownAppellations};
  }
  const permitted = filters.some(f => f.kind === 'grape' && f.mode === 'permitted');
  if (!permitted) return {status:'ok',reason:null,...searchAppellations(data,filters)};
  const identity = filters.filter(f => ['country','region'].includes(f.kind));
  const results = [], unknownAppellations = [];
  for (const app of data.appellations) {
    const scope = evaluateWine(data,app,{searchCases:[]},identity);
    if (scope.status === 'noMatch') continue;
    if (scope.status !== 'match') { unknownAppellations.push(app); continue; }
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
  return {status:'ok',reason:null,results,unknownCount:unknownAppellations.length,unknownAppellations};
}
