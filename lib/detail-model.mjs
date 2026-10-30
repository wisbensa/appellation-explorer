/** Finite display model. Consumes validated DTO only; never interprets source prose.
 * V01–V07: identity belongs to occurrences, not captions, quote locators or strings.
 * The DTO is retained by reference, not cloned into history or duplicated as text.
 */
export function detailOccurrenceId(version, ownerKind, ownerId, field, ...path) {
  return [version, ownerKind, ownerId, field, ...path].map(x => encodeURIComponent(String(x)).replaceAll('~', '%7E')).join('~');
}

export function createDetailModel(data, entity) {
  const version = data.version;
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
      fieldKey, readingId, role: data.schemaVersion === 7 && source.role ? source.role : 'unclassified',
      applicability: data.schemaVersion === 7 && source.scope ? source.scope : 'unresolved',
      text: data.schemaVersion === 7 && source.text ? source.text : source, source };
    notes.push(n); return n;
  }
  function field(source, owner, key) {
    const f = { id: id(owner.kind, owner.id, key), ownerId: owner.modelId, key,
      state: source.state, source, readings: [], notes: [], citations: [] };
    f.citations = citationRefs(source.evidence, f.id);
    for (const [index, value] of (source.values || []).entries()) {
      const reading = { id: id(owner.kind, owner.id, key, 'value', index), fieldId: f.id,
        ownerId: owner.modelId, source: value, coverage: data.schemaVersion === 7 ? value.presentation?.coverage || 'unresolved' : 'unresolved',
        applicability: data.schemaVersion === 7 ? value.presentation?.applicability || 'unresolved' : 'unresolved',
        overviewEligible: data.schemaVersion === 7 && value.presentation?.overviewEligible === true, notes: [], citations: [] };
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
      fields: [], notes: [], citations: [] };
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
    const item = { id: occurrenceId, source: observation, qualifications: data.schemaVersion===7?(observation.conditions||[]).filter(c=>c.role==='qualification').map(c=>c.text):(observation.conditions||[]), citations: citationRefs(observation.evidence, occurrenceId) };
    if (!grapeGroups.has(observation.grapeId)) grapeGroups.set(observation.grapeId, []);
    grapeGroups.get(observation.grapeId).push(item);
  }
  const sharedFields=(entity.sharedFields||[]).map(key=>({key,fieldIds:subjects.flatMap(s=>s.fields.filter(f=>f.key===key).map(f=>f.id))}));
  return { version, entity, owner: pageOwner, subjects, sharedFields, owners, fields, readings, notes,
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
 let qualifierIds=typeId?[...new Set(within.flatMap(s=>s.qualifiers.map(t=>t.id)))]:[];
 let qualifierId=qualifierIds.includes(validSaved?.qualifierId)?validSaved.qualifierId:null;
 if(direct&&!browseDetailSubjects(subjects,{typeId,qualifierId}).some(s=>s.id===direct.id)){typeId=null;qualifierId=null;qualifierIds=[];}
 const browse={ownerId:model.entity.id,typeId,qualifierId};
 const selected=browseDetailSubjects(subjects,browse),selectedIds=new Set(selected.map(s=>s.id));
 const matchedIds=new Set(matchIds);
 const overviewReady=s=>s.fields.filter(f=>f.readings.length&&f.readings.every(r=>r.overviewEligible)).length;
 const ordered=[...subjects].sort((a,b)=>Number(b.id===contextId)-Number(a.id===contextId)||Number(matchedIds.has(b.id))-Number(matchedIds.has(a.id))||Number(selectedIds.has(b.id))-Number(selectedIds.has(a.id))||Number(overviewReady(b))-Number(overviewReady(a)));
 return {browse,typeGroups,qualifierIds,selectedIds,ordered};
}
