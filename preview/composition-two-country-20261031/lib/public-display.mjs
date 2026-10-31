import {validateGrapeUseProof, evaluateRecordGrapeUse} from './grape-use-proof.mjs';
import { COUNTRY_BROWSE_GROUPS } from './country-browse-config.mjs';
/** Source-neutral published presentation contract. No acquisition, parsing or proof dependencies. */
export const DISPLAY_FORMAT = 'appellation-explorer-display';
export const DISPLAY_FIELDS = Object.freeze(['composition','sensory','ageing','alcohol','production','area','varietalLabelling']);
export const PUBLISHED_TYPE_IDS=Object.freeze({type:Object.freeze(['red','white','rose','sparkling','semi-sparkling','passito','fortified'].map(x=>'published-heading:'+x)),qualifier:Object.freeze(['riserva','classico','superiore','novello','late-harvest'].map(x=>'published-heading:'+x))});
const kinds = ['country','region','appellation','designation','grape','gi','traditional','type','qualifier'];
const keys = (value,allowed,path) => { object(value,path); for(const key of Object.keys(value))if(!allowed.includes(key))fail(`${path}: unsupported key ${key}`); };
const states = ['known','unknown','conflict','notApplicable','not_found','unverified','no_obligation'];
const fail = message => { throw new Error(`Invalid public display data: ${message}`); };
const array = (value,path) => { if (!Array.isArray(value)) fail(`${path} must be an array`); return value; };
const string = (value,path) => { if (typeof value !== 'string' || !value.trim()) fail(`${path} must be nonempty text`); };
const object = (value,path) => { if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${path} must be an object`); };
const localized = (value,path) => { object(value,path); string(value.original || value.en || value.ja,path); for(const key of Object.keys(value)) if(!['original','en','ja'].includes(key)||typeof value[key]!=='string') fail(`${path} has invalid localized text`); };
const ids = (values,path) => { const seen = new Set(); for(const value of array(values,path)) { object(value,path); string(value.id,`${path}.id`); if(seen.has(value.id)) fail(`${path}: duplicate id ${value.id}`); seen.add(value.id); } return seen; };
const ref = (id,set,path) => { string(id,`${path}.id`); if(!set.has(id)) fail(`${path}: unresolved reference ${id}`); };
export const textValue = (value,lang='en') => typeof value === 'string' ? value : value?.[lang] || value?.original || value?.en || value?.ja || '';
export const displayName = (entity,lang) => textValue(entity?.name,lang);
export function canonicalFilters(filters) {
  return JSON.stringify([...new Map(filters.map(f=>[JSON.stringify([f.kind,f.id,f.mode]),[f.kind,f.id,f.mode]])).values()].sort((a,b)=>JSON.stringify(a)<JSON.stringify(b)?-1:JSON.stringify(a)>JSON.stringify(b)?1:0));
}
export function validateDisplayData(data) {
  object(data,'root');
  if(data.format!==DISPLAY_FORMAT || ![1,2,3,4,5,6,7,8,9].includes(data.schemaVersion)) fail('unsupported format/version; legacy data is not accepted');
  const top=['format','schemaVersion','version','countries','regions','grapes','appellations','designations','candidates','sources','transitions','regionGroups','appellationGroups'];
  for(const key of Object.keys(data)) if(!top.includes(key)&&key!=='readerPresentation') fail(`unsupported root key ${key}`);
  string(data.version,'version');
  const sets={}; for(const key of top.slice(3)) sets[key]=key==='candidates'?new Set(array(data[key],key).map(c=>{object(c,'candidate');string(c.id,'candidate.id');return c.id;})):ids(data[key],key);
  if(!data.appellations.length) fail('empty publication is prohibited');
  const sourceEvidence=(evidence,path)=>{ for(const e of array(evidence,path)){ keys(e,['sourceId','quote','locator','language','conditions'],path);ref(e.sourceId,sets.sources,path);string(e.quote,`${path}.quote`);string(e.locator,`${path}.locator`); if(e.language!==undefined)string(e.language,`${path}.language`);if(e.conditions!==undefined)string(e.conditions,`${path}.conditions`); } };
  const paragraphs=(xs,path)=>array(xs,path).forEach(x=>localized(x,path));
  const disclosure=(v,path)=>{keys(v,['title','paragraphs'],path);localized(v.title,path);paragraphs(v.paragraphs,path);};
  const originalText=(v,path)=>{keys(v,['label','text','language'],path);localized(v.label,path);string(v.text,path);string(v.language,path);};
  let wineRatioIds;
  const constraintGroup=(g,path)=>{
    keys(g,['kind','id','basis','label','subjectLabel','memberMode','members','quantity','contexts','conditions','evidence','combination','eachMinimum',...([4,5].includes(data.schemaVersion)?['aggregation']:[])],path);
    if(g.kind!=='constraint')fail(`${path}.kind`);
    localized(g.subjectLabel,`${path}.subjectLabel`);
    const modes=['single','selected-option','collective','residual-open-set'];
    if(!modes.includes(g.memberMode))fail(`${path}.memberMode`);
    ids(g.members,`${path}.members`);
    for(const member of g.members){keys(member,['id','label','grapeId'],path);localized(member.label,path);if(member.grapeId!==undefined)ref(member.grapeId,sets.grapes,path);}
    const count=g.members.length;
    if((['single','selected-option'].includes(g.memberMode)&&count!==1)||(g.memberMode==='collective'&&count<2)||(g.memberMode==='residual-open-set'&&count!==0))fail(`${path}.member count`);
    keys(g.quantity,['operator','text'],`${path}.quantity`);localized(g.quantity.text,`${path}.quantity.text`);
    if(g.memberMode==='collective'){if(!['joint','alone-or-jointly'].includes(g.combination))fail(`${path}.combination`);}
    else if(Object.hasOwn(g,'combination'))fail(`${path}.combination forbidden`);
    const singleExact=[4,5].includes(data.schemaVersion)&&g.memberMode==='single'&&g.quantity.operator==='stated-exact';
    if(singleExact){if(g.basis!=='vineyard'||g.aggregation!=='holding')fail(`${path}.exact single basis/aggregation`);}else if(Object.hasOwn(g,'aggregation'))fail(`${path}.aggregation forbidden`);
    const operators=g.memberMode==='single'?['minimum','maximum','range',...(singleExact?['stated-exact']:[])]:g.memberMode==='selected-option'?['minimum']:g.memberMode==='residual-open-set'?['maximum']:g.combination==='joint'?['minimum','stated-exact']:['range','maximum'];
    if(!operators.includes(g.quantity.operator))fail(`${path}.operator matrix`);
    if(Object.hasOwn(g,'eachMinimum')){
      if(g.memberMode!=='collective'||g.combination!=='joint'||!['minimum','stated-exact'].includes(g.quantity.operator))fail(`${path}.eachMinimum forbidden`);
      keys(g.eachMinimum,['text'],`${path}.eachMinimum`);localized(g.eachMinimum.text,`${path}.eachMinimum.text`);
    }
    paragraphs(g.contexts,`${path}.contexts`);paragraphs(g.conditions,`${path}.conditions`);
    sourceEvidence(g.evidence,`${path}.evidence`);if(!g.evidence.length)fail(`${path}.constraint evidence missing`);
  };
  const compositionCore=(v,path)=>{
    keys(v,['notice','summary','grapeIds','listLabel','listSummary','ratioGroups','duties','guide','applicability'],path);
    for(const k of ['notice','summary','listLabel','listSummary'])if(v[k]!==undefined)localized(v[k],`${path}.${k}`);
    array(v.grapeIds,`${path}.grapeIds`).forEach(id=>ref(id,sets.grapes,path));
    for(const g of array(v.ratioGroups,`${path}.ratioGroups`)){
      object(g,path);string(g.id,path);if(!['vineyard','grapes','must','wine','mixed','unknown'].includes(g.basis))fail(`${path}.basis`);localized(g.label,path);
      if([2,3,4,5].includes(data.schemaVersion)&&wineRatioIds){if(wineRatioIds.has(g.id))fail(`${path}: duplicate ratio group id`);wineRatioIds.add(g.id);}
      if([2,3,4,5].includes(data.schemaVersion)&&Object.hasOwn(g,'kind')){constraintGroup(g,path);continue;}
      keys(g,['id','basis','label','rows'],path);
      ids(g.rows,path);for(const r of g.rows){keys(r,['id','label','ratio','grapeIds','expandMembers','membersLabel'],path);localized(r.label,path);localized(r.ratio,path);array(r.grapeIds,path).forEach(id=>ref(id,sets.grapes,path));if(typeof r.expandMembers!=='boolean')fail('ratio member expansion');localized(r.membersLabel,path);}
    }
    for(const d of array(v.duties,`${path}.duties`)){keys(d,['grapeId','text','explanation','evidence'],path);ref(d.grapeId,sets.grapes,path);localized(d.text,path);localized(d.explanation,path);sourceEvidence(d.evidence,path);if(!d.evidence.length)fail('duty evidence missing');}
    for(const k of ['guide','applicability'])if(v[k]!==undefined)disclosure(v[k],`${path}.${k}`);
  };
  const compositionView=(v,path)=>{
    keys(v,['main','orderedPair','conditional'],path);compositionCore(v.main,`${path}.main`);
    if(v.orderedPair){const o=v.orderedPair;keys(o,['paragraphs','grapeIds','guide'],path);paragraphs(o.paragraphs,path);array(o.grapeIds,path).forEach(id=>ref(id,sets.grapes,path));disclosure(o.guide,path);}
    if(v.conditional){const c=v.conditional;keys(c,['referenceLabel','branches'],path);localized(c.referenceLabel,path);ids(c.branches,path);for(const b of c.branches){keys(b,['id','title','statusLabel','content'],path);localized(b.title,path);localized(b.statusLabel,path);compositionCore(b.content,path);}}
  };
  const sourceNotes=(items,path)=>{for(const c of array(items,path)){keys(c,['text','role','scope'],path);localized(c.text,path);if(!['target-label','qualification','partial-reading','unclassified','source-context'].includes(c.role)||!['source-record','unresolved'].includes(c.scope))fail(`${path}: context semantics`);}};
  const readingPresentation=(v,path)=>{
    const p=v.presentation;keys(p,['coverage','applicability','overviewEligible'],path);
    if(!['complete','partial','unresolved'].includes(p.coverage)||!['source-record','unresolved','conflict'].includes(p.applicability)||typeof p.overviewEligible!=='boolean')fail(`${path}: reading presentation`);
    if(p.overviewEligible&&(p.coverage!=='complete'||p.applicability!=='source-record'||!v.translation||!Object.values(v.translation).some(t=>typeof t==='string'&&t.trim())))fail(`${path}: ineligible summary`);
    sourceNotes(v.contexts,path);
  };
  const documentStatements=(items,path)=>{
    for(const d of array(items,path)){
      keys(d,['label','text','contexts','evidence','explanationJa','role','scope'],path);
      if(typeof d.label==='string')string(d.label,path);else localized(d.label,path);
      string(d.text,path);for(const c of array(d.contexts,path)){if(typeof c==='string')string(c,path);else localized(c,path);}
      sourceEvidence(d.evidence,path);if(!d.evidence.length)fail(`${path}: statement evidence`);
      if(d.explanationJa!==undefined)string(d.explanationJa,path);
      if(!['substantive','source-context'].includes(d.role)||d.scope!=='document-per-wine-unassessed')fail(`${path}: statement semantics`);
    }
  };
  const presentation=(p,path)=>{
    keys(p,['state','text','items','evidence','compositionView','values','statusDetail','calculation','unmappedNotice','translation','original','guide','historicalSummaries'],path);
    if(!states.includes(p.state))fail(`${path}.state`);localized(p.text,`${path}.text`);sourceEvidence(p.evidence,`${path}.evidence`);
    if(['known','no_obligation'].includes(p.state)&&!p.evidence.length)fail(`${path}: known display requires evidence`);
    for(const item of array(p.items,`${path}.items`)){keys(item,['text','grapeId','evidence'],path);localized(item.text,`${path}.items.text`);if(item.grapeId)ref(item.grapeId,sets.grapes,path);sourceEvidence(item.evidence,`${path}.items.evidence`);}
    if(p.compositionView)compositionView(p.compositionView,`${path}.compositionView`);
    if(p.values)for(const v of array(p.values,`${path}.values`)){keys(v,['text','contexts','translation','evidence',...([7,8,9].includes(data.schemaVersion)?['presentation']:[])],path);localized(v.text,path);if([7,8,9].includes(data.schemaVersion))readingPresentation(v,path);else paragraphs(v.contexts,path);if(v.translation)localized(v.translation,path);sourceEvidence(v.evidence,path);}
    if(['not_found','unverified'].includes(p.state)&&!p.statusDetail)fail(`${path}: explicit status explanation required`);
    if(p.statusDetail){keys(p.statusDetail,['label','text'],path);localized(p.statusDetail.label,path);localized(p.statusDetail.text,path);}
    if(p.calculation)paragraphs(p.calculation,path);
    if(p.unmappedNotice)localized(p.unmappedNotice,path);
    if(p.translation){keys(p.translation,['text','note'],path);localized(p.translation.text,path);localized(p.translation.note,path);}
    if(p.original)originalText(p.original,path);
    if(p.guide)disclosure(p.guide,path);
    if(p.historicalSummaries)paragraphs(p.historicalSummaries,path);
  };

  for(const collection of ['countries','regions','grapes','appellations','designations','candidates','transitions'])for(const entity of data[collection])localized(entity.name,`${collection}.${entity.id}.name`);
  for(const country of data.countries)keys(country,['id','name'],'country');
  for(const grape of data.grapes)keys(grape,['id','name'],'grape');
  for(const region of data.regions){keys(region,['id','name','countryId','parentId'],'region');ref(region.countryId,sets.countries,'region country');if(region.parentId)ref(region.parentId,sets.regions,'region parent');let node=region;const seen=new Set();while(node){if(seen.has(node.id))fail('region cycle');seen.add(node.id);node=data.regions.find(r=>r.id===node.parentId);if(node&&node.countryId!==region.countryId)fail('cross-country region parent');}}
  const candidateKeys=new Set();for(const c of data.candidates){string(c.id,'candidate.id');keys(c,['id','name','kind','searchTerms','countryId','regionIds','parentId','appellationId','qualification'],'candidate');if(!kinds.includes(c.kind))fail('candidate kind');array(c.searchTerms,'candidate.searchTerms').forEach(x=>string(x,'search term')); const key=`${c.kind}:${c.id}`;if(candidateKeys.has(key))fail('duplicate candidate');candidateKeys.add(key);const collection={country:'countries',region:'regions',grape:'grapes',appellation:'appellations',designation:'designations'}[c.kind];if(collection&&!(c.kind==='appellation'&&sets.transitions.has(c.id)))ref(c.id,sets[collection],'candidate target');if(c.countryId)ref(c.countryId,sets.countries,'candidate country');if(c.parentId)ref(c.parentId,sets.regions,'candidate parent');if(c.appellationId)ref(c.appellationId,sets.appellations,'candidate appellation');if(c.regionIds)array(c.regionIds,'candidate regions').forEach(id=>ref(id,sets.regions,'candidate region'));if(c.qualification!==undefined)string(c.qualification,'candidate qualification');}
  const declaredSources=(entity)=>{ const visit=value=>{if(!value||typeof value!=='object')return;if(value.sourceId&&!entity.sourceIds.includes(value.sourceId))fail('evidence source missing from entity sourceIds');for(const child of Object.values(value))if(child&&typeof child==='object')Array.isArray(child)?child.forEach(visit):visit(child);};visit(entity);};
  const allWineIds=new Set();
  for(const entity of [...data.appellations,...data.designations]){
    keys(entity,[...(data.schemaVersion===9&&data.appellations.includes(entity)?['compositionStatements']:[]),...([8,9].includes(data.schemaVersion)&&data.appellations.includes(entity)?['grapeUseScopes','grapeUseCoverage','sharedFieldGroups']:[]),...([7,8,9].includes(data.schemaVersion)?['documentStatements']:[]),'id','name','countryId','regionIds','sourceIds','evidence','sharedFields','wines','appellationId','qualification','gi','traditionalTerms','level','notice','applicability','designationContext','conditionalAmendments',...([3,4,5].includes(data.schemaVersion)&&data.appellations.includes(entity)?['designationAgeing']:[]),...(data.schemaVersion===5&&data.appellations.includes(entity)?['grapeNonUse']:[]),...([6,7,8,9].includes(data.schemaVersion)&&data.appellations.includes(entity)?['publishedGrapeObservations']:[])],'entity');
    if(data.appellations.includes(entity)){ref(entity.countryId,sets.countries,'appellation country');array(entity.regionIds,'regionIds').forEach(id=>{ref(id,sets.regions,'appellation region');if(data.regions.find(r=>r.id===id).countryId!==entity.countryId)fail('appellation region country');});}
    else ref(entity.appellationId,sets.appellations,'designation parent');
    for(const key of ['qualification','gi','level'])if(entity[key]!==undefined)string(entity[key],key);if(entity.traditionalTerms!==undefined)array(entity.traditionalTerms,'traditionalTerms').forEach(x=>string(x,'traditional term'));
    if([7,8,9].includes(data.schemaVersion))documentStatements(entity.documentStatements,'documentStatements');
    array(entity.sourceIds,'sourceIds').forEach(id=>ref(id,sets.sources,'sourceIds'));sourceEvidence(entity.evidence,'entity.evidence');
    if(Object.hasOwn(entity,'compositionStatements')){
      const rows=entity.compositionStatements;ids(rows,'compositionStatements');
      const bilingual=(v,path)=>{keys(v,['ja','en'],path);string(v.ja,path+'.ja');string(v.en,path+'.en');};
      for(const row of rows){
        keys(row,['id','subject','requirement','scope','targetNames','conditions','sourceIds','evidence'],'composition statement');
        for(const key of ['subject','requirement','scope'])bilingual(row[key],'composition statement '+key);
        for(const key of ['targetNames','conditions'])array(row[key],key).forEach(v=>bilingual(v,key));
        if(!row.targetNames.length)fail('composition target names missing');
        const sources=array(row.sourceIds,'composition sourceIds');if(!sources.length||new Set(sources).size!==sources.length)fail('composition sources missing or repeated');
        sources.forEach(id=>ref(id,new Set(entity.sourceIds),'composition owner source'));
        sourceEvidence(row.evidence,'composition evidence');if(!row.evidence.length)fail('composition evidence missing');
        for(const e of row.evidence)if(!sources.includes(e.sourceId))fail('composition evidence source missing');
      }
    }

    for(const key of ['notice','applicability','designationContext'])if(entity[key]!==undefined)presentation(entity[key],key);
    if(Object.hasOwn(entity,'designationAgeing')){presentation(entity.designationAgeing,'designationAgeing');if(entity.designationAgeing.compositionView)fail('composition view on other field');if(entity.designationAgeing.historicalSummaries)fail('historical summaries belong to applicability');}
    if(entity.conditionalAmendments)for(const a of array(entity.conditionalAmendments,'conditionalAmendments')){keys(a,['id','title','statusLabel','articleLabel','actDateLabel','commencementLabel','durationLabel','originals','evidence'],'amendment');string(a.id,'amendment id');for(const k of ['title','statusLabel','articleLabel','actDateLabel','commencementLabel','durationLabel'])localized(a[k],`amendment.${k}`);array(a.originals,'amendment originals').forEach(o=>originalText(o,'amendment original'));sourceEvidence(a.evidence,'amendment evidence');}
    array(entity.sharedFields,'sharedFields').forEach(k=>{if(!DISPLAY_FIELDS.includes(k))fail('shared field');});
    for(const wine of array(entity.wines,'wines')){
      object(wine,'wine');string(wine.id,'wine id');if(allWineIds.has(wine.id))fail('duplicate wine id');allWineIds.add(wine.id);localized(wine.name,'wine name');localized(wine.shortName,'wine shortName');localized(wine.scope,'wine scope');sourceEvidence(wine.evidence,'wine evidence');object(wine.display,'wine display');
      for(const key of Object.keys(wine))if(![...([7,8,9].includes(data.schemaVersion)?['subjectIdentity','notes']:['classificationNotice']),'id','name','shortName','scope','evidence','display','searchCases','productionConditions',...([6,7,8,9].includes(data.schemaVersion)?['publishedTypeObservation']:[])].includes(key))fail(`unsupported wine key ${key}`);
      if([7,8,9].includes(data.schemaVersion)){const i=wine.subjectIdentity;keys(i,['kind','state'],'subjectIdentity');if(i.kind!=='record'||i.state!=='unresolved')fail('subjectIdentity semantics');}
      if(wine.notes!==undefined)sourceNotes(wine.notes,'wine.notes');
      if(wine.classificationNotice)localized(wine.classificationNotice,'classificationNotice');
      if(wine.productionConditions){const p=wine.productionConditions;keys(p,['title','paragraphs','evidence'],'productionConditions');localized(p.title,'productionConditions');paragraphs(p.paragraphs,'productionConditions');sourceEvidence(p.evidence,'productionConditions');}
      if(Object.hasOwn(wine,'publishedTypeObservation')){
        const o=wine.publishedTypeObservation;keys(o,['scope','terms','evidenceIndices'],'published type observation');
        if(o.scope!=='published-summary-target-heading')fail('published type scope');
        const seen=new Set();for(const t of array(o.terms,'published type terms')){keys(t,['kind','id'],'published type term');if(!['type','qualifier'].includes(t.kind)||!PUBLISHED_TYPE_IDS[t.kind].includes(t.id)||!candidateKeys.has(`${t.kind}:${t.id}`)||seen.has(t.id))fail('published type identity');seen.add(t.id);}
        if(!seen.size||seen.size>12)fail('published type terms missing');
        if(['red','white','rose'].filter(x=>seen.has('published-heading:'+x)).length>1||['sparkling','semi-sparkling'].filter(x=>seen.has('published-heading:'+x)).length>1)fail('published type contradictory terms');
        const ei=array(o.evidenceIndices,'published type evidence');if(!ei.length||new Set(ei).size!==ei.length)fail('published type evidence missing');for(const i of ei){if(!Number.isSafeInteger(i)||i<0||i>=wine.evidence.length)fail('published type evidence index');if(data.sources.find(s=>s.id===wine.evidence[i].sourceId)?.identity.state!=='available')fail('published type captured evidence');}
        if(ei.some((i,index)=>i!==ei[0]+index))fail('published type evidence indices must be contiguous');const headingEvidence=ei.map(i=>wine.evidence[i]);const norm=s=>s.replace(/\s+/gu,' ').trim();if(new Set(headingEvidence.map(e=>e.sourceId)).size!==1||norm(headingEvidence.map(e=>e.quote).join(' '))!==norm(wine.name.original||''))fail('published type heading evidence mismatch');
      }
      wineRatioIds=new Set();
      for(const field of DISPLAY_FIELDS){presentation(wine.display[field],`wine.display.${field}`);if(field!=='composition'&&wine.display[field].compositionView)fail('composition view on other field');if(wine.display[field].historicalSummaries)fail('historical summaries belong to applicability');}
      wineRatioIds=undefined;
      for(const key of Object.keys(wine.display))if(!DISPLAY_FIELDS.includes(key))fail('unsupported display field');
      if([6,7,8,9].includes(data.schemaVersion)&&array(wine.searchCases,'wine.searchCases').length)fail('snapshot6 wine search cases forbidden');
      const caseKeys=new Set();for(const entry of array(wine.searchCases,'wine.searchCases')){
        keys(entry,['filters','state','scopeId','evidence','conditions',...(data.schemaVersion===5?['targetDate']:[])],'search case');const filters=array(entry.filters,'case.filters');if(!filters.length)fail('empty search case');for(const f of filters){keys(f,['kind','id','mode'],'filter');string(f.id,'filter.id');if(!['grape','gi','traditional','type','qualifier'].includes(f.kind)||!['include','exclude','required'].includes(f.mode)||(f.kind==='grape'?!['include','required'].includes(f.mode):f.mode==='required'))fail('unsupported search filter');if(!candidateKeys.has(`${f.kind}:${f.id}`))fail('unknown search filter target');}
        if(Object.hasOwn(entry,'targetDate')&&(typeof entry.targetDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(entry.targetDate)||!Number.isFinite(Date.parse(entry.targetDate+'T00:00:00Z'))||new Date(entry.targetDate+'T00:00:00Z').toISOString().slice(0,10)!==entry.targetDate))fail('case targetDate');const key=canonicalFilters(filters);if(caseKeys.has(key))fail('duplicate joint search case');caseKeys.add(key);if(!['match','noMatch','unknown','conflict','notApplicable'].includes(entry.state))fail('search case state');string(entry.scopeId,'case.scopeId');sourceEvidence(entry.evidence,'case.evidence');if(['match','noMatch'].includes(entry.state)&&!entry.evidence.length)fail('search outcome requires evidence');array(entry.conditions,'case.conditions').forEach(c=>localized(c,'condition'));
      }
    }
    if(Object.hasOwn(entity,'publishedGrapeObservations')){
      const seen=new Set();
      for(const o of array(entity.publishedGrapeObservations,'published grape observations')){
        keys(o,['grapeId','scope','evidence','conditions'],'published grape observation');
        ref(o.grapeId,sets.grapes,'observed grape');
        if(seen.has(o.grapeId)||o.scope!=='published-summary')fail('published grape observation identity/scope');
        seen.add(o.grapeId);
        if(!candidateKeys.has(`grape:${o.grapeId}`))fail('observed grape candidate missing');
        sourceEvidence(o.evidence,'published grape evidence');
        if(!o.evidence.length||o.evidence.some(e=>data.sources.find(s=>s.id===e.sourceId)?.identity.state!=='available'))fail('published grape requires captured evidence');
        if([7,8,9].includes(data.schemaVersion)){for(const c of array(o.conditions,'published grape conditions')){keys(c,['text','role','scope'],'published grape condition');localized(c.text,'published grape condition');if(!['qualification','source-context'].includes(c.role)||c.scope!=='published-summary')fail('published grape condition role/scope');}}else paragraphs(o.conditions,'published grape conditions');if(!o.conditions.length)fail('published grape scope conditions missing');
      }
    }
    if(Object.hasOwn(entity,'grapeNonUse'))validateNonUsePresentation(entity.grapeNonUse,sets);
    declaredSources(entity);
    for(const field of entity.sharedFields){if(!entity.wines.length||!entity.wines.every(w=>JSON.stringify(w.display[field])===JSON.stringify(entity.wines[0].display[field])))fail('shared fields differ');}
  }
  for(const s of data.sources){keys(s,['id','title','agency','url','linkLabel','primary','identity','archiveHash','archiveMember','publishedAt','effectiveFrom','retrievedAt','verifiedAt'],'source');string(s.title,'source.title');string(s.agency,'source.agency');localized(s.linkLabel,'source.linkLabel');if(s.url){let url;try{url=new URL(s.url);}catch{fail('source URL');}if(!['https:','http:'].includes(url.protocol))fail('source URL protocol');}if(typeof s.primary!=='boolean')fail('source.primary');keys(s.identity,['state','sha256','notice'],'source.identity');if(s.identity.state==='available'){if(typeof s.identity.sha256!=='string'||!/^[a-f0-9]{64}$/i.test(s.identity.sha256)||s.identity.notice!==undefined)fail('source identity hash');}else if(s.identity.state==='unavailable'){localized(s.identity.notice,'source identity notice');if(s.identity.sha256!==undefined)fail('unavailable identity has hash');}else fail('source identity state');for(const key of ['archiveHash','archiveMember','publishedAt','effectiveFrom','retrievedAt','verifiedAt'])if(s[key]!==undefined)string(s[key],`source.${key}`);if(s.archiveHash!==undefined&&!/^[a-f0-9]{64}$/i.test(s.archiveHash))fail('archive hash');}
  for(const tr of data.transitions){keys(tr,['id','name','kind','message','successorIds','sourceIds','evidence'],'transition');if(sets.appellations.has(tr.id))fail('transition collides with current appellation');localized(tr.message,'transition.message');array(tr.successorIds,'successorIds').forEach(id=>ref(id,sets.appellations,'successor'));array(tr.sourceIds,'transition.sourceIds').forEach(id=>ref(id,sets.sources,'transition source'));sourceEvidence(tr.evidence,'transition evidence');declaredSources(tr);}
  const groupedRegions=new Set();
  for(const g of data.regionGroups){keys(g,['id','countryId','parentId','label','regionIds'],'region group');ref(g.countryId,sets.countries,'region group country');if(g.parentId){ref(g.parentId,sets.regions,'region group parent');if(data.regions.find(r=>r.id===g.parentId).countryId!==g.countryId)fail('region group parent country');}localized(g.label,'region group label');array(g.regionIds,'region group ids').forEach(id=>{ref(id,sets.regions,'region group member');const key=JSON.stringify([g.countryId,g.parentId||null,id]);if(groupedRegions.has(key))fail('duplicate region group membership');groupedRegions.add(key);const r=data.regions.find(r=>r.id===id);if(r.countryId!==g.countryId||(r.parentId||null)!==(g.parentId||null))fail('region group membership');});}
  for(const g of data.appellationGroups){keys(g,['id','regionId','label','appellationIds'],'appellation group');ref(g.regionId,sets.regions,'appellation group region');localized(g.label,'appellation group label');array(g.appellationIds,'appellation group ids').forEach(id=>{ref(id,sets.appellations,'appellation group member');if(!regionBelongs(data,data.appellations.find(a=>a.id===id).regionIds,g.regionId))fail('appellation group membership');});}
  if([8,9].includes(data.schemaVersion))for(const app of data.appellations){
    validateGrapeUseProof(data,app);
    const owners=[app,...data.designations.filter(d=>d.appellationId===app.id)];
    const records=new Map(owners.flatMap(e=>e.wines.map(w=>[w.id,{wine:w,entity:e}]))),groupIds=new Set(),members=new Set();
    for(const g of array(app.sharedFieldGroups??[],'sharedFieldGroups')){
      keys(g,['id','field','recordIds','evidence'],'shared field group');string(g.id,'shared group id');
      if(groupIds.has(g.id)||!DISPLAY_FIELDS.includes(g.field))fail('shared group identity');groupIds.add(g.id);
      const rs=array(g.recordIds,'shared record IDs');if(rs.length<2||new Set(rs).size!==rs.length)fail('shared group cardinality');
      sourceEvidence(g.evidence,'shared group evidence');if(!g.evidence.length||g.evidence.some(e=>data.sources.find(s=>s.id===e.sourceId)?.identity.state!=='available'))fail('shared group captured evidence');
      let canonical;
      for(const rid of rs){const r=records.get(rid),key=JSON.stringify([rid,g.field]);if(!r||members.has(key)||r.entity.sharedFields.includes(g.field))fail('shared group membership');members.add(key);
        const field=JSON.stringify(r.wine.display[g.field]);if(canonical===undefined)canonical=field;else if(field!==canonical)fail('shared group fields differ');}
    }
  }
  if(data.readerPresentation!==undefined) validateReaderPresentation(data);
  return data;
}
/** Proposed schema-5 presentation ONLY. Shape, references and commitments are
 * not proof authority. Production persistence/build reject ALL schema-5 data.
 * No completeness assertion here can create an admitted source assessment. */
function validateNonUsePresentation(b,sets){
  let nodes=0;const visit=(v,depth)=>{if(++nodes>100000||depth>32)fail('non-use bounds');if(v===null||typeof v==='string'||typeof v==='boolean')return;if(typeof v==='number'&&Number.isFinite(v))return;if(!v||typeof v!=='object')fail('non-use JSON');const isArray=Array.isArray(v),proto=Object.getPrototypeOf(v);if(isArray?proto!==Array.prototype:proto!==Object.prototype&&proto!==null)fail('non-use JSON prototype');if(isArray&&Object.keys(v).length!==v.length)fail('non-use JSON array');for(const k of Reflect.ownKeys(v)){if(isArray&&k==='length')continue;const d=Object.getOwnPropertyDescriptor(v,k);if(typeof k!=='string'||!d.enumerable||!Object.hasOwn(d,'value')||(isArray&&!/^(0|[1-9][0-9]*)$/.test(k)))fail('non-use own data');visit(d.value,depth+1);}};visit(b,0);if(new TextEncoder().encode(JSON.stringify(b)).byteLength>4*1024*1024)fail('non-use bounds');
  const exact=(v,required,optional=[])=>{keys(v,[...required,...optional],'non-use');if(required.some(k=>!Object.hasOwn(v,k)))fail('non-use missing key');};
  const hash=v=>{if(typeof v!=='string'||!/^[a-f0-9]{64}$/.test(v))fail('non-use hash');};
  const evidence=xs=>{if(!array(xs,'non-use evidence').length)fail('non-use evidence');for(const e of xs){exact(e,['sourceId','quote','locator'],['language']);ref(e.sourceId,sets.sources,'non-use source');string(e.quote,'quote');string(e.locator,'locator');if(e.language!==undefined)string(e.language,'language');}};
  exact(b,['version','targetDate','domain','cases']);if(b.version!=='appellation-grape-non-use-1')fail('non-use version');if(typeof b.targetDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.targetDate)||!Number.isFinite(Date.parse(b.targetDate+'T00:00:00Z'))||new Date(b.targetDate+'T00:00:00Z').toISOString().slice(0,10)!==b.targetDate)fail('non-use date');
  const d=b.domain;exact(d,['id','inventoryHash','conditionInventoryHash','quantifier','coverage','cells']);string(d.id,'domain');hash(d.inventoryHash);hash(d.conditionInventoryHash);if(d.quantifier!=='all-source-types-geographical-and-conditional-scopes'||!['complete','incomplete'].includes(d.coverage))fail('non-use domain');ids(d.cells,'non-use cells');const cells=new Map();for(const c of d.cells){exact(c,['id','scopeId','conditionDomainId']);string(c.scopeId,'scope');string(c.conditionDomainId,'condition domain');cells.set(c.id,c);}
  const seen=new Set();for(const c of array(b.cases,'non-use cases')){object(c,'non-use case');ref(c.grapeId,sets.grapes,'non-use grape');if(seen.has(c.grapeId))fail('non-use duplicate grape');seen.add(c.grapeId);
    if(c.state==='match'){exact(c,['grapeId','state','coverageRef','evidence']);if(d.coverage!=='complete'||!cells.size)fail('non-use empty/incomplete domain');exact(c.coverageRef,['assessmentHash','inventoryHash','conditionInventoryHash']);hash(c.coverageRef.assessmentHash);if(c.coverageRef.inventoryHash!==d.inventoryHash||c.coverageRef.conditionInventoryHash!==d.conditionInventoryHash)fail('non-use coverage binding');evidence(c.evidence);}
    else if(c.state==='noMatch'){exact(c,['grapeId','state','witness']);const w=c.witness;exact(w,['cellId','scopeId','conditionDomainId','evidence']);const cell=cells.get(w.cellId);if(!cell||cell.scopeId!==w.scopeId||cell.conditionDomainId!==w.conditionDomainId)fail('non-use witness binding');evidence(w.evidence);}
    else if(c.state==='unknown'){exact(c,['grapeId','state','reason','unresolvedCellIds']);if(!['incomplete-domain','unresolved-cell','applicability-unproved','identity-unproved'].includes(c.reason))fail('non-use reason');const refs=array(c.unresolvedCellIds,'unresolved cells');if(new Set(refs).size!==refs.length||refs.some(id=>!cells.has(id)))fail('non-use unresolved cell');}
    else fail('non-use state');
  }
}
const nonUseFilter=f=>f.kind==='grape'&&f.mode==='non-use';
/** Appellation-wide gate: never derive the domain from filtered/public wines. */
export function evaluateAppellationNonUse(data,app,filters){
  const fs=filters.filter(nonUseFilter);if(!fs.length)return null;
  if([6,7,8,9].includes(data.schemaVersion))return {status:'unknown',reason:'published-listing-does-not-establish-non-use',conditions:[]};
  if(fs.some(f=>!data.grapes.some(g=>g.id===f.id)))return {status:'unknown',reason:'non-use-reference-unproved',conditions:[]};
  if(filters.some(f=>f.kind==='grape'&&f.mode==='exclude'))return {status:'unknown',reason:'retired-exclude',conditions:[]};
  if(filters.some(f=>f.kind==='grape'&&['include','required'].includes(f.mode)&&fs.some(n=>n.id===f.id)))return {status:'noMatch',reason:'contradictory-grape-predicates',conditions:[]};
  const cases=data.schemaVersion===5?app.grapeNonUse?.cases:undefined;
  const states=[...new Set(fs.map(f=>f.id))].map(id=>cases?.find(c=>c.grapeId===id)?.state??'unknown');
  return {status:states.includes('noMatch')?'noMatch':states.every(s=>s==='match')?'match':'unknown',reason:cases?'appellation-non-use':'non-use-unsupported',conditions:[],appellationLevel:true};
}
export function createPublicDataLoader({fetcher=globalThis.fetch,url='./data/display.json'}={}) {
  let data;
  return {async start(){const response=await fetcher(url);if(!response.ok)throw new Error(`Public display HTTP ${response.status}`);const next=validateDisplayData(await response.json());data=next;return data;},isReady(){return Boolean(data);},async ensureRoute(){if(!data)throw new Error('Public display is not loaded');}};
}
export const buildCandidates = data => data.candidates;
// Search only supplied labels. Keep punctuation for incremental queries and
// remove separators only inside kana runs, never at a Latin/kanji boundary.
const searchKeys = text => {
  const value=text.normalize('NFKC').toLocaleLowerCase().trim();
  const kana=value.normalize('NFD').replace(/[\u30a1-\u30f6\u30fd-\u30fe]/gu,c=>String.fromCodePoint(c.codePointAt(0)-0x60)).normalize('NFC');
  const compact=kana.replace(/([\p{Script=Hiragana}\p{Script=Katakana}\u30fc][\u3099\u309a]*)[\s\u30fb\u00b7]+(?=[\p{Script=Hiragana}\p{Script=Katakana}\u30fc])/gu,'$1');
  return [...new Set([kana,compact])].filter(Boolean);
};
const matchRank=(term,query)=>{
  if(term===query)return 0;
  for(let at=term.indexOf(query);at!==-1;at=term.indexOf(query,at+1)){
    // Some voiced kana have no precomposed hiragana. Do not accept an
    // unvoiced query ending inside their base + combining-mark spelling.
    if(/\p{M}/u.test(term[at]??'')||/\p{M}/u.test(term[at+query.length]??''))continue;
    return at===0?1:2;
  }
  return 3;
};
export function findCandidates(data,query,lang){
  const queries=searchKeys(query);if(!queries.length)return [];
  return data.candidates.map(candidate=>{
    const names=new Set(Object.values(candidate.name).filter(v=>typeof v==='string'&&v.trim()).flatMap(searchKeys));
    let rank=3,role=1;
    for(const term of new Set([...names,...candidate.searchTerms.flatMap(searchKeys)])){
      const nextRank=Math.min(...queries.map(q=>matchRank(term,q))),nextRole=names.has(term)?0:1;
      if(nextRank<rank||nextRank===rank&&nextRole<role){rank=nextRank;role=nextRole;}
    }
    return {candidate,rank,role};
  }).filter(c=>c.rank<3).sort((a,b)=>a.rank-b.rank||a.role-b.role||displayName(a.candidate,lang).localeCompare(displayName(b.candidate,lang),lang)||a.candidate.id.localeCompare(b.candidate.id)).map(({candidate,rank})=>({...candidate,rank}));
}
export function upsertFilter(filters,filter,mode=filter.mode||'include'){return [...filters.filter(f=>!(f.kind===filter.kind&&f.id===filter.id)),{kind:filter.kind,id:filter.id,mode}];}
export function regionBelongs(data,regionIds,id){return regionIds.some(regionId=>{let region=data.regions.find(r=>r.id===regionId);const seen=new Set();while(region&&!seen.has(region.id)){if(region.id===id)return true;seen.add(region.id);region=data.regions.find(r=>r.id===region.parentId);}return false;});}
export const transitionForAppellation=(data,id)=>data.transitions.find(t=>t.id===id);
export const countryEntries=data=>data.countries.map(entity=>({entity,count:data.appellations.filter(a=>a.countryId===entity.id).length}));
// Explicit DTO headings are authoritative for this browse level. The finite
// editorial setting is used only when none were supplied; saved DTO bytes and
// source/legal membership are never changed. Unknown IDs remain reachable.
export function browseRegionGroups(data,countryId,parentId){
  const parent=parentId||null;
  const eligible=data.regions.filter(r=>r.countryId===countryId&&(r.parentId||null)===parent);
  const supplied=data.regionGroups.filter(g=>g.countryId===countryId&&(g.parentId||null)===parent);
  const configured=COUNTRY_BROWSE_GROUPS.filter(g=>g.countryId===countryId&&(g.parentId||null)===parent);
  const groups=supplied.length?supplied:configured;
  const make=regions=>regions.map(entity=>({entity,count:new Set(data.appellations.filter(a=>regionBelongs(data,a.regionIds,entity.id)).map(a=>a.id)).size})).filter(entry=>entry.count>0);
  const used=new Set(groups.flatMap(g=>g.regionIds));
  return [...groups.map(g=>({...g,entries:make(eligible.filter(r=>g.regionIds.includes(r.id)))})),{id:'ungrouped',label:groups.length?{ja:'その他の地域',en:'Other regions'}:null,entries:make(eligible.filter(r=>!used.has(r.id)))}].filter(g=>g.entries.length);
}

export function regionalAppellationGroups(data,apps,regionId){const groups=data.appellationGroups.filter(g=>g.regionId===regionId);const used=new Set();const result=groups.map(g=>({...g,appellations:apps.filter(a=>{if(used.has(a.id)||!g.appellationIds.includes(a.id))return false;used.add(a.id);return true;})}));const rest=apps.filter(a=>!used.has(a.id));if(rest.length)result.push({id:'ungrouped',label:{ja:'呼称',en:'Appellations'},appellations:rest});return result.filter(g=>g.appellations.length);}
export function evaluateWine(data,app,wine,filters){
  let regionUnknown=false;for(const f of filters.filter(f=>['country','region'].includes(f.kind))){if([6,7,8,9].includes(data.schemaVersion)&&f.kind==='region'&&!app.regionIds.length){regionUnknown=true;continue;}const present=f.kind==='country'?app.countryId===f.id:regionBelongs(data,app.regionIds,f.id);if(f.mode==='exclude'?present:!present)return {status:'noMatch',conditions:[]};}if(regionUnknown)return {status:'unknown',reason:'region-membership-unconfirmed',conditions:[]};
  if([8,9].includes(data.schemaVersion)&&filters.some(f=>f.kind==='grape')){
    const grapes=filters.filter(f=>f.kind==='grape');
    const others=filters.filter(f=>!['country','region','grape'].includes(f.kind));
    if(others.some(f=>!['type','qualifier'].includes(f.kind)||f.mode!=='include'))return {status:'unknown',reason:'joint-scope-unproved',conditions:[]};
    if(others.some(f=>!wine.publishedTypeObservation?.terms.some(t=>t.kind===f.kind&&t.id===f.id)))return {status:'unknown',reason:'target-type-unproved',conditions:[]};
    return evaluateRecordGrapeUse(app,wine,grapes);
  }
  const nonUse=evaluateAppellationNonUse(data,app,filters);if(nonUse&&nonUse.status!=='match')return nonUse;
  const semantic=filters.filter(f=>!['country','region'].includes(f.kind)&&!nonUseFilter(f));if(!semantic.length)return nonUse??{status:'match',conditions:[]};
  if([6,7,8,9].includes(data.schemaVersion)&&semantic.length===1&&['type','qualifier'].includes(semantic[0].kind)&&semantic[0].mode==='include'){
    const o=wine.publishedTypeObservation;if(o?.terms.some(t=>t.kind===semantic[0].kind&&t.id===semantic[0].id))return {status:'match',scope:o.scope,scopeId:wine.id,evidence:o.evidenceIndices.map(i=>wine.evidence[i]),conditions:[{ja:'公式要約の当該タイプ見出しに明記された特徴です。網羅的な許可・不使用や他条件との同時成立は示しません。',en:'Explicitly stated in this target’s published summary heading; not exhaustive permission, non-use or proof of conjunction with other conditions.'}]};
  }
  const entry=wine.searchCases.find(c=>canonicalFilters(c.filters)===canonicalFilters(semantic));if(nonUse&&(!entry||entry.targetDate!==app.grapeNonUse?.targetDate||!app.grapeNonUse.domain.cells.some(c=>c.scopeId===entry.scopeId)))return {status:'unknown',reason:'joint-time-scope-unproved',conditions:[]};return {status:entry?.state||'unknown',conditions:entry?.conditions||[],scopeId:entry?.scopeId,evidence:entry?.evidence||[]};
}
/** A published summary observation is appellation/document-level, never a wine
 * permission, obligation, ratio, conjunction or complete-domain negative. */
export function evaluatePublishedGrapeObservation(data,app,filters){
  if(![6,7].includes(data.schemaVersion))return null;
  const semantic=filters.filter(f=>!['country','region'].includes(f.kind));
  if(semantic.length!==1||semantic[0].kind!=='grape'||semantic[0].mode!=='include')return null;
  const observation=app.publishedGrapeObservations?.find(o=>o.grapeId===semantic[0].id);
  return observation?{status:'match',appellationLevel:true,scope:observation.scope,conditions:[7,8,9].includes(data.schemaVersion)?observation.conditions.filter(c=>c.role==='qualification').map(c=>c.text):observation.conditions,evidence:observation.evidence}:null;
}
export function searchAppellations(data,filters){const results=[],unknownAppellations=[];for(const appellation of data.appellations){const identityOutcome=evaluateWine(data,appellation,{searchCases:[]},filters.filter(f=>['country','region'].includes(f.kind)));if(identityOutcome.status==='noMatch')continue;if(identityOutcome.status==='unknown'){unknownAppellations.push(appellation);continue;}/* Identity predicates do not require a declared wine. Empty browse and rule predicates retain their existing paths. */if(filters.length&&filters.every(f=>['country','region'].includes(f.kind))&&!appellation.wines.length&&!data.designations.some(d=>d.appellationId===appellation.id&&d.wines.length)){results.push({appellation,matches:[]});continue;}const publishedGrapeOutcome=evaluatePublishedGrapeObservation(data,appellation,filters);if(publishedGrapeOutcome){results.push({appellation,matches:[],publishedGrapeOutcome});continue;}const gate=evaluateAppellationNonUse(data,appellation,filters);if(gate?.status==='noMatch')continue;if(gate?.status==='unknown'){unknownAppellations.push(appellation);continue;}if(gate&&filters.every(f=>nonUseFilter(f)||['country','region'].includes(f.kind))){results.push({appellation,matches:[],nonUseOutcome:gate});continue;}const matches=[];let unresolved=false;const entities=[appellation,...data.designations.filter(d=>d.appellationId===appellation.id)];for(const entity of entities)for(const wine of entity.wines){const outcome=evaluateWine(data,appellation,wine,filters);if(outcome.status==='match')matches.push({wine,...(entity!==appellation?{designation:entity}:{}),...outcome});else if(['unknown','conflict'].includes(outcome.status))unresolved=true;}if(matches.length)results.push({appellation,matches});if((gate&&!matches.length)||unresolved||(!appellation.wines.length&&entities.every(e=>!e.wines.length)))unknownAppellations.push(appellation);}return {results,unknownCount:unknownAppellations.length,unknownAppellations};}

/** Versioned display projection. Source meaning stays in the original DTO. */
export function validateReaderPresentation(data) {
 const r=data.readerPresentation;
 if(![7,8,9].includes(data.schemaVersion))fail('reader projection requires schema7/8/9');
 keys(r,['version','sourceVersion','canonicalVersion','records'],'readerPresentation');
 if(r.version!==1||r.sourceVersion!==data.version)fail('reader projection version binding');
 string(r.canonicalVersion,'reader canonical version');
 const records=new Map([...data.appellations,...data.designations].flatMap(e=>e.wines).map(w=>[w.id,w])),seen=new Set();
 const readerText=(v,label)=>{keys(v,['ja','en'],label);if(!Object.keys(v).length)fail(label+' empty');for(const text of Object.values(v))string(text,label);};
 for(const entry of array(r.records,'reader records')){
  keys(entry,['recordId','title','titleKind','scope','fields'],'reader record');
  const w=records.get(entry.recordId);if(!w||seen.has(entry.recordId))fail('reader record identity');seen.add(entry.recordId);
  readerText(entry.title,'reader title');if(entry.titleKind!==undefined&&(entry.titleKind!=='whole-record-literal'||entry.title.ja!==w.name.original||entry.title.en!==w.name.original||entry.scope!==undefined))fail('reader literal title binding');if(entry.scope!==undefined)readerText(entry.scope,'reader scope');
  const fieldKeys=new Set();
  for(const f of array(entry.fields,'reader fields')){
   keys(f,['key','paragraphs'],'reader field');if(!DISPLAY_FIELDS.includes(f.key)||!w.display[f.key]||fieldKeys.has(f.key))fail('reader field binding');fieldKeys.add(f.key);
   const refs=new Set();for(const p of array(f.paragraphs,'reader paragraphs')){
    keys(p,['valueIndex','contextIndex','aspect','placement','text'],'reader paragraph');
    if(!Number.isInteger(p.valueIndex)||p.valueIndex<0||!w.display[f.key].values?.[p.valueIndex])fail('reader value binding');
    const value=w.display[f.key].values[p.valueIndex];
    if(p.contextIndex!==undefined&&(!Number.isInteger(p.contextIndex)||p.contextIndex<0||!value.contexts?.[p.contextIndex]))fail('reader context binding');
    const ref=p.valueIndex+':'+(p.contextIndex??'value');if(refs.has(ref))fail('duplicate reader paragraph');refs.add(ref);
    if(!['colour','aroma','taste','foam','metric','condition','description'].includes(p.aspect)||!['overview','details'].includes(p.placement))fail('reader role/placement');readerText(p.text,'reader paragraph text');
   }
  }
 }
 return r;
}
