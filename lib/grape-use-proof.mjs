/** Source-neutral schema8 proof validation and finite predicates. No source text parsing. */
const fail = m => { throw Error(`Invalid grape use proof: ${m}`); };
const list = x => { if (!Array.isArray(x)) fail('array'); return x; };
const exact = (x, required, optional=[]) => { if (!x || Array.isArray(x) || typeof x !== 'object' || required.some(k=>!Object.hasOwn(x,k)) || Object.keys(x).some(k=>![...required,...optional].includes(k))) fail('keys'); };
const unique = xs => { list(xs); if(new Set(xs).size!==xs.length)fail('duplicates');return xs; };
const text = x => { exact(x,[],['original','ja','en']);if(!Object.keys(x).length||Object.values(x).some(s=>typeof s!=='string'||!s.trim()))fail('localized text'); };
const indices = (xs,n) => { unique(xs);if(!xs.length||xs.some(i=>!Number.isSafeInteger(i)||i<0||i>=n))fail('indices'); };
const id = x => { if(typeof x!=='string'||!x.trim())fail('id'); };
export function validateGrapeUseProof(data,app) {
 const records=[...app.wines,...data.designations.filter(d=>d.appellationId===app.id).flatMap(d=>d.wines)];
 const recordIds=new Set(records.map(w=>w.id)),grapes=new Set(data.grapes.map(g=>g.id)),scopes=new Map();
 for(const s of list(app.grapeUseScopes)) {
  exact(s,['id','label','target','conditions','selectionEvidenceIndices','allowed','individualRequired','explicitDenied','jointUse','evidence'],['closedAllowed']);id(s.id);if(scopes.has(s.id))fail('scope id');scopes.set(s.id,s);text(s.label);list(s.conditions).forEach(text);
  for(const e of list(s.evidence)){exact(e,['sourceId','quote','locator'],['language','conditions']);id(e.quote);id(e.locator);if(e.language!==undefined)id(e.language);if(e.conditions!==undefined)id(e.conditions);if(!app.sourceIds.includes(e.sourceId)||data.sources.find(x=>x.id===e.sourceId)?.identity.state!=='available')fail('captured evidence');}
  const ei=xs=>indices(xs,s.evidence.length);ei(s.selectionEvidenceIndices);
  if(s.target?.kind==='records'){exact(s.target,['kind','recordIds','evidenceIndices']);unique(s.target.recordIds);if(!s.target.recordIds.length||s.target.recordIds.some(x=>!recordIds.has(x)))fail('target records');ei(s.target.evidenceIndices);}
  else {exact(s.target,['kind']);if(s.target.kind!=='appellation-existential')fail('target kind');}
  const allowed=new Set();for(const a of list(s.allowed)){exact(a,['grapeId','evidenceIndices']);if(!grapes.has(a.grapeId)||allowed.has(a.grapeId))fail('allowed grape');allowed.add(a.grapeId);ei(a.evidenceIndices);}
  const required=new Set();for(const r of list(s.individualRequired)){exact(r,['allowedIndex','value','evidenceIndices']);indices([r.allowedIndex],s.allowed.length);if(required.has(r.allowedIndex)||typeof r.value!=='boolean')fail('required');required.add(r.allowedIndex);ei(r.evidenceIndices);}
  const denied=new Set();for(const d of list(s.explicitDenied)){exact(d,['grapeId','evidenceIndices']);if(!grapes.has(d.grapeId)||denied.has(d.grapeId)||allowed.has(d.grapeId))fail('denied grape');denied.add(d.grapeId);ei(d.evidenceIndices);}
  if(s.closedAllowed!==undefined){exact(s.closedAllowed,['evidenceIndices']);if(!s.allowed.length)fail('empty closed set');ei(s.closedAllowed.evidenceIndices);}
  for(const w of list(s.jointUse)){exact(w,['allowedIndices','evidenceIndices']);indices(w.allowedIndices,s.allowed.length);if(w.allowedIndices.length<2)fail('joint cardinality');ei(w.evidenceIndices);}
  if(s.target.kind==='appellation-existential'&&(s.individualRequired.length||s.explicitDenied.length||s.jointUse.length||s.closedAllowed))fail('existential claims');
 }
 const c=app.grapeUseCoverage;if(c===undefined)return;
 exact(c,['records'],['domain']);const covered=new Set();
 const evidenceRefs=(rs,allowedScopes)=>{if(!list(rs).length)fail('coverage evidence');for(const r of rs){exact(r,['scopeId','evidenceIndices']);if(!allowedScopes.includes(r.scopeId)||!scopes.has(r.scopeId))fail('coverage scope evidence');indices(r.evidenceIndices,scopes.get(r.scopeId).evidence.length);}};
 for(const r of list(c.records)){exact(r,['recordId','scopeIds','evidenceRefs']);if(!recordIds.has(r.recordId)||covered.has(r.recordId))fail('coverage record');covered.add(r.recordId);unique(r.scopeIds);const expected=[...scopes.values()].filter(s=>s.target.kind==='records'&&s.target.recordIds.includes(r.recordId)).map(s=>s.id);if(!expected.length||r.scopeIds.length!==expected.length||r.scopeIds.some(x=>!expected.includes(x)))fail('coverage exact scopes');evidenceRefs(r.evidenceRefs,r.scopeIds);}
 if(c.domain!==undefined){const d=c.domain;exact(d,['recordIds','evidenceRefs']);unique(d.recordIds);if(!recordIds.size||d.recordIds.length!==recordIds.size||d.recordIds.some(x=>!recordIds.has(x)||!covered.has(x))||[...scopes.values()].some(s=>s.target.kind==='appellation-existential'))fail('coverage domain');evidenceRefs(d.evidenceRefs,[...scopes.keys()]);}
}
export function evaluateGrapeUseScope(scope,filters) {
 const indices=new Set(),usedEvidence=new Set(scope.selectionEvidenceIndices);
 const add=xs=>xs.forEach(i=>usedEvidence.add(i));if(scope.target.kind==='records')add(scope.target.evidenceIndices);
 const states=filters.map(f=>{
  const i=scope.allowed.findIndex(a=>a.grapeId===f.id),a=scope.allowed[i],r=scope.individualRequired.find(r=>r.allowedIndex===i),d=scope.explicitDenied.find(d=>d.grapeId===f.id);
  const forbidden=!!d||!!scope.closedAllowed&&i<0;
  if(a)add(a.evidenceIndices);if(r)add(r.evidenceIndices);if(d)add(d.evidenceIndices);if(forbidden&&scope.closedAllowed)add(scope.closedAllowed.evidenceIndices);
  if(f.mode==='permitted'){if(a)indices.add(i);return a?true:forbidden?false:null;}
  if(f.mode==='required'){if(r?.value===true)indices.add(i);return r?r.value:forbidden?false:null;}
  if(f.mode==='non-use')return forbidden?true:a?false:null;
  return null;
 });
 let status=states.includes(false)?'noMatch':states.includes(null)?'unknown':'match';
 if(status==='match'){
  const optional=[...indices].filter(i=>!scope.individualRequired.some(r=>r.allowedIndex===i&&r.value));
  const w=optional.length>1?scope.jointUse.find(w=>optional.every(i=>w.allowedIndices.includes(i))):null;
  if(optional.length>1&&!w)status='unknown';if(w)add(w.evidenceIndices);
  for(const i of indices){const r=scope.individualRequired.find(r=>r.allowedIndex===i&&r.value);if(r)add(r.evidenceIndices);}
 }
 return {status,scopeId:scope.id,scopeLabel:scope.label,conditions:scope.conditions,evidence:[...usedEvidence].sort((a,b)=>a-b).map(i=>scope.evidence[i])};
}
export function evaluateRecordGrapeUse(app,wine,filters) {
 const scopes=app.grapeUseScopes.filter(s=>s.target.kind==='records'&&s.target.recordIds.includes(wine.id));
 const outcomes=scopes.map(s=>evaluateGrapeUseScope(s,filters));const matches=outcomes.filter(o=>o.status==='match');
 if(matches.length)return {status:'match',scopeIds:matches.map(o=>o.scopeId),scopeOutcomes:matches,conditions:matches.flatMap(o=>o.conditions),evidence:matches.flatMap(o=>o.evidence)};
 const covered=app.grapeUseCoverage?.records.some(r=>r.recordId===wine.id);
 return {status:covered&&outcomes.length&&outcomes.every(o=>o.status==='noMatch')?'noMatch':'unknown',conditions:[],scopeOutcomes:outcomes,reason:covered?'grape-use-unresolved':'grape-use-coverage-unproved'};
}
