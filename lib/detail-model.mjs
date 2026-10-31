/** Finite display model. Consumes validated DTO only; never interprets source prose.
 * V01–V07: identity belongs to occurrences, not captions, quote locators or strings.
 * The DTO is retained by reference, not cloned into history or duplicated as text.
 */
export function detailOccurrenceId(version, ownerKind, ownerId, field, ...path) {
  return [version, ownerKind, ownerId, field, ...path].map(x => encodeURIComponent(String(x)).replaceAll('~', '%7E')).join('~');
}

export function createDetailModel(data, entity) {
  const version = data.version;
  const readerRecords=new Map((data.readerPresentation?.records||[]).map(r=>[r.recordId,r]));
  const readingRoles=[7,8].includes(data.schemaVersion);
  const citations = [];
  const citationByContent = new Map();
  const owners = [];
  const fields = [];
  const readings = [];
  const notes = [];
  const links = [];
  const id = (kind, ownerId, key, ...path) => detailOccurrenceId(version, kind, ownerId, key, ...path);
  function citationRefs(evidence, occurrenceId) {
    return (evidence || []).map((source, index) => {
      // Sharing affects presentation only. Every occurrence keeps its own edge.
      const key = JSON.stringify([source.sourceId, source.quote, source.locator, source.language ?? null, source.conditions ?? null]);
      let citation = citationByContent.get(key);
      if (!citation) {
        citation = { id: id('citation', entity.id, 'evidence', citations.length), source };
        citationByContent.set(key, citation); citations.push(citation);
      }
      const edge = { id: `${occurrenceId}~citation~${index}`, from: occurrenceId, to: citation.id };
      links.push(edge); return edge;
    });
  }
  function note(source, owner, fieldKey, path, readingId = null) {
    const n = { id: id(owner.kind, owner.id, fieldKey, ...path), ownerId: owner.modelId,
      fieldKey, readingId, role: readingRoles && source.role ? source.role : 'unclassified',
      applicability: readingRoles && source.scope ? source.scope : 'unresolved',
      text: readingRoles && source.text ? source.text : source, source };
    notes.push(n); return n;
  }
  function field(source, owner, key) {
    const f = { id: id(owner.kind, owner.id, key), ownerId: owner.modelId, key,
      state: source.state, source, reader:readerRecords.get(owner.id)?.fields.find(f=>f.key===key), readings: [], notes: [], citations: [] };
    f.citations = citationRefs(source.evidence, f.id);
    for (const [index, value] of (source.values || []).entries()) {
      const reading = { id: id(owner.kind, owner.id, key, 'value', index), fieldId: f.id,
        ownerId: owner.modelId, source: value, coverage: readingRoles ? value.presentation?.coverage || 'unresolved' : 'unresolved',
        applicability: readingRoles ? value.presentation?.applicability || 'unresolved' : 'unresolved',
        overviewEligible: readingRoles && value.presentation?.overviewEligible === true, notes: [], citations: [] };
      reading.citations = citationRefs(value.evidence, reading.id);
      reading.notes = (value.contexts || []).map((context, n) => note(context, owner, key, ['value', index, 'note', n], reading.id));
      readings.push(reading); f.readings.push(reading);
    }
    for (const keyName of ['statusDetail', 'guide', 'unmappedNotice']) {
      if (source[keyName]) f.notes.push(note(source[keyName], owner, key, [keyName]));
    }
    // Typed items remain attached to their field. Their IDs never depend on labels.
    f.items = (source.items || []).map((source, index) => {
      const itemId = id(owner.kind, owner.id, key, 'item', index);
      return { id: itemId, fieldId: f.id, source, citations: citationRefs(source.evidence, itemId) };
    });
    fields.push(f); return f;
  }
  function owner(source, kind) {
    const o = { id: source.id, modelId: id(kind, source.id, 'owner'), kind, source,
      fields: [], notes: [], citations: [], reader:readerRecords.get(source.id) };
    o.citations = citationRefs(source.evidence, o.modelId);
    if (source.notice) { if(source.notice.state) o.fields.push(field(source.notice,o,'notice')); else o.notes.push(note(source.notice,o,'notice',['notice'])); }
    for(const [index,entry] of (source.notes||[]).entries())o.notes.push(note(entry,o,'notes',['note',index]));
    if (source.classificationNotice) o.notes.push(note(source.classificationNotice, o, 'classificationNotice', ['notice']));
    owners.push(o); return o;
  }
  const pageOwner = owner(entity, entity.appellationId ? 'designation' : 'appellation');
  const parent=entity.appellationId?data.appellations.find(a=>a.id===entity.appellationId):null;
  if(parent)owner(parent,'appellation');
  const subjects = (entity.wines || []).map(source => {
    const o = owner(source, 'record');
    // A heading observation is a classification observation, not single-wine proof.
    o.subjectKind = source.subjectIdentity?.kind || 'record'; o.identification = source.subjectIdentity?.state || 'unresolved';
    o.types = (source.publishedTypeObservation?.terms || []).filter(t => t.kind === 'type');
    o.qualifiers = (source.publishedTypeObservation?.terms || []).filter(t => t.kind === 'qualifier');
    o.fields.push(...Object.entries(source.display || {}).map(([key, value]) => field(value, o, key)));
    return o;
  });
  if (entity.designationAgeing) pageOwner.fields.push(field(entity.designationAgeing, pageOwner, 'ageing'));
  const documentStatements = (entity.documentStatements || []).map((source,index) => ({
    id: id(pageOwner.kind, entity.id, 'documentStatement', index), source,
    citations: citationRefs(source.evidence, id(pageOwner.kind, entity.id, 'documentStatement', index))
  }));
  const grapeGroups = new Map();
  for (const [index, observation] of (entity.publishedGrapeObservations || []).entries()) {
    const occurrenceId = id(pageOwner.kind, entity.id, 'publishedGrapes', index);
    const item = { id: occurrenceId, source: observation, qualifications: readingRoles?(observation.conditions||[]).filter(c=>c.role==='qualification').map(c=>c.text):(observation.conditions||[]), citations: citationRefs(observation.evidence, occurrenceId) };
    if (!grapeGroups.has(observation.grapeId)) grapeGroups.set(observation.grapeId, []);
    grapeGroups.get(observation.grapeId).push(item);
  }
  // Proof ownership is supplied by the source; the reader never derives use from a name/ratio.
  const useOwner=parent||entity;
  const subjectIds=new Set(subjects.map(s=>s.id));
  const grapeUseScopes=(data.schemaVersion===8?useOwner.grapeUseScopes||[]:[]).filter(scope=>scope.target.kind==='records'?scope.target.recordIds.some(id=>subjectIds.has(id)):!parent).map(scope=>{
    const modelId=id('grape-use',useOwner.id,scope.id);
    const required=new Map(scope.individualRequired.map(claim=>[claim.allowedIndex,claim]));
    return {id:modelId,source:scope,targetIds:scope.target.kind==='records'?scope.target.recordIds.filter(id=>subjectIds.has(id)):[],
      grapes:scope.allowed.map((claim,index)=>({source:claim,grape:data.grapes.find(g=>g.id===claim.grapeId),required:required.get(index)?.value??null})),
      citations:citationRefs(scope.evidence,modelId)};
  });
  const allRecords=[...(useOwner.wines||[]),...(data.designations||[]).filter(d=>d.appellationId===useOwner.id).flatMap(d=>d.wines||[])];
  const sharedFieldGroups=(data.schemaVersion===8?useOwner.sharedFieldGroups||[]:[]).filter(group=>group.recordIds.some(id=>subjectIds.has(id))).map(group=>{
    const canonicalId=group.recordIds[0];
    let canonical=owners.find(o=>o.kind==='record'&&o.id===canonicalId);
    if(!canonical){canonical=owner(allRecords.find(w=>w.id===canonicalId),'record');canonical.types=(canonical.source.publishedTypeObservation?.terms||[]).filter(t=>t.kind==='type');canonical.qualifiers=(canonical.source.publishedTypeObservation?.terms||[]).filter(t=>t.kind==='qualifier');canonical.fields.push(field(canonical.source.display[group.field],canonical,group.field));}
    const modelId=id('shared-field',useOwner.id,group.id);
    return {id:modelId,source:group,field:canonical.fields.find(f=>f.key===group.field),
      targets:group.recordIds.map(id=>allRecords.find(w=>w.id===id)),citations:citationRefs(group.evidence,modelId)};
  });
  // Exact supplied applicability sets only: never union independent proofs.
  const readingSetMap=new Map();
  const setFor=ids=>{const key=JSON.stringify([...ids].sort());if(!readingSetMap.has(key))readingSetMap.set(key,{id:id('reading-set',entity.id,key),targetIds:[...ids],targets:ids.map(recordId=>allRecords.find(w=>w.id===recordId)),grapeScopes:[],fieldGroups:[]});return readingSetMap.get(key);};
  for(const scope of grapeUseScopes)if(scope.source.target.kind==='records'&&scope.source.target.recordIds.length>1)setFor(scope.source.target.recordIds).grapeScopes.push(scope);
  for(const group of sharedFieldGroups)setFor(group.source.recordIds).fieldGroups.push(group);
  const readingSets=[...readingSetMap.values()];
  const sharedFields=(entity.sharedFields||[]).map(key=>({key,fieldIds:subjects.flatMap(s=>s.fields.filter(f=>f.key===key).map(f=>f.id))}));
  return { version, entity, grapeUseScopes, sharedFieldGroups, readingSets, owner: pageOwner, subjects, sharedFields, owners, fields, readings, notes,
    citations, links, documentStatements, publishedGrapes: [...grapeGroups].map(([grapeId, observations]) => ({ grapeId, grape: data.grapes.find(g=>g.id===grapeId), observations })),
    documents: data.sources.filter(s => [...(entity.sourceIds || []),...(parent?.sourceIds||[])].includes(s.id)) };
}

/** Filtering a local list never changes global search conditions or classification. */
export function filterDetailSubjects(subjects, query, lang = 'ja') {
  const needle = query.trim().normalize('NFKC').toLocaleLowerCase(lang);
  if (!needle) return subjects;
  return subjects.filter(s => Object.values(s.source.name || {}).concat(Object.values(s.source.shortName || {}))
    .some(label => typeof label === 'string' && label.normalize('NFKC').toLocaleLowerCase(lang).includes(needle)));
}

/** Local reading navigation uses only explicit DTO observations, never names. */
export function browseDetailSubjects(subjects, {typeId=null, qualifierId=null}={}) {
  const within=!typeId?subjects:subjects.filter(s=>s.types.some(t=>t.id===typeId));
  return qualifierId?within.filter(s=>s.qualifiers.some(t=>t.id===qualifierId)):within;
}

/** One owner for local reading order, valid choices and references. No source interpretation. */
export function createReadingNavigation(model,{saved=null,contextId=null,matchIds=[]}={}) {
 const subjects=model.subjects, typeGroups=new Map();
 for(const subject of subjects)for(const term of subject.types){
  if(!typeGroups.has(term.id))typeGroups.set(term.id,[]);
  typeGroups.get(term.id).push(subject);
 }
 const validSaved=saved?.ownerId===model.entity.id?saved:null;
 let typeId=validSaved?.typeId??null;
 if(!typeGroups.has(typeId))typeId=null;
 const direct=subjects.find(s=>s.id===contextId);
 // Saved direct links always reach their record. No inferred default qualifier.
 if(direct&&!validSaved)typeId=null;
 const within=browseDetailSubjects(subjects,{typeId});
 const typesCoverAll=typeGroups.size>0&&[...typeGroups.values()].every(group=>group.length===subjects.length);
 let qualifierIds=typeId||typesCoverAll?[...new Set(within.flatMap(s=>s.qualifiers.map(t=>t.id)))]:[];
 let qualifierId=qualifierIds.includes(validSaved?.qualifierId)?validSaved.qualifierId:null;
 if(direct&&!browseDetailSubjects(subjects,{typeId,qualifierId}).some(s=>s.id===direct.id)){typeId=null;qualifierId=null;qualifierIds=[];}
 const browse={ownerId:model.entity.id,typeId,qualifierId};
 const selected=browseDetailSubjects(subjects,browse),selectedIds=new Set(selected.map(s=>s.id));
 const matchedIds=new Set(matchIds);
 const overviewReady=s=>s.fields.filter(f=>f.readings.length&&f.readings.every(r=>r.overviewEligible)).length;
 const ordered=[...subjects].sort((a,b)=>Number(b.id===contextId)-Number(a.id===contextId)||Number(matchedIds.has(b.id))-Number(matchedIds.has(a.id))||Number(selectedIds.has(b.id))-Number(selectedIds.has(a.id))||Number(overviewReady(b))-Number(overviewReady(a)));
 return {browse,typeGroups,qualifierIds,selectedIds,ordered};
}

/** Paginate explicit, non-overlapping applicability groups, not their member count.
 * Overlapping different sets stay independent; this never unions their meaning.
 */
export function initialReadingGroups(subjects,readingSets,selectedIds,limit=2) {
 const available=new Set(subjects.map(s=>s.id));
 const sets=readingSets.filter(set=>set.targetIds.length>1&&set.targetIds.every(id=>available.has(id)));
 const unambiguous=sets.filter(set=>!sets.some(other=>other!==set&&other.targetIds.some(id=>set.targetIds.includes(id))));
 const visited=new Set(),groups=[];
 for(const subject of subjects){
  if(!selectedIds.has(subject.id)||visited.has(subject.id))continue;
  const set=unambiguous.find(group=>group.targetIds.includes(subject.id));
  const members=set?subjects.filter(s=>selectedIds.has(s.id)&&set.targetIds.includes(s.id)):[subject];
  groups.push(members);for(const member of members)visited.add(member.id);
 }
 const firstIds=new Set(groups.slice(0,limit).flat().map(s=>s.id));
 return {first:subjects.filter(s=>firstIds.has(s.id)),rest:subjects.filter(s=>!firstIds.has(s.id))};
}
