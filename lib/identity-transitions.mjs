// Optional display metadata. Legal facts remain source-bound; this is not an
// identity resolver and never creates successor identities or inherited rules.
const text = value => typeof value === 'string' && value.trim().length > 0;
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const shape = (value, keys) => object(value) && Object.keys(value).every(key => keys.includes(key)) && keys.every(key => Object.hasOwn(value,key));
export const originCountries = app => app.countryId ? [app.countryId] : app.origin?.state === 'confirmed' ? app.origin.countryIds || [] : [];
export function isWithinRegion(data, ids, regionId) {
  const regions=new Map((data.regions||[]).map(row=>[row.id,row]));
  return (ids||[]).some(id=>{const seen=new Set();while(id&&!seen.has(id)){if(id===regionId)return true;seen.add(id);id=regions.get(id)?.parentId;}return false;});
}
export function validateBrowseMetadata(data) {
  const errors=[], apps=new Map((data.appellations||[]).map(row=>[row.id,row])), regions=new Map((data.regions||[]).map(row=>[row.id,row]));
  const sources=new Map((data.sources||[]).map(row=>[row.id,row]));
  const evidence = rows => Array.isArray(rows)&&rows.length>0&&rows.every(row=>shape(row,['sourceId','locator','quote'])&&text(row.sourceId)&&sources.has(row.sourceId)&&/^[a-f0-9]{64}$/.test(sources.get(row.sourceId).sha256||'')&&text(row.quote)&&(text(row.locator)||object(row.locator)&&Object.keys(row.locator).length>0));
  for(const field of ['regionalClassifications','identityTransitions'])if(data[field]!==undefined&&!Array.isArray(data[field]))errors.push(`Invalid ${field} collection`);
  const assigned=new Set();
  for(const row of Array.isArray(data.regionalClassifications)?data.regionalClassifications:[]) {
    const app=apps.get(row?.appellationId),region=regions.get(row?.regionId),key=JSON.stringify([row?.appellationId,row?.regionId]);
    if(!shape(row,['appellationId','regionId','system','classification','evidence'])||row.system!=='bourgogne'||!['regionale','village','grand_cru'].includes(row.classification)||!app||!originCountries(app).includes('FR')||!region||!(region.countryId==='FR'||region.countryIds?.includes('FR'))||!isWithinRegion(data,app.regionIds,row.regionId)||!evidence(row.evidence)||assigned.has(key))errors.push(`Invalid regional classification ${row?.appellationId||''}`);
    assigned.add(key);
  }
  const retired=new Set(),designationIds=new Set((data.designations||[]).map(row=>row.id));
  for(const row of Array.isArray(data.identityTransitions)?data.identityTransitions:[]) {
    if(!shape(row,['id','kind','name','successorIds','evidence'])||!text(row.id)||retired.has(row.id)||apps.has(row.id)||designationIds.has(row.id)||!['merge','split'].includes(row.kind)||!object(row.name)||!text(row.name.original)||Object.keys(row.name).some(key=>!['original','ja','en','aliases'].includes(key))||['ja','en'].some(key=>row.name[key]!==undefined&&!text(row.name[key]))||row.name.aliases!==undefined&&(!Array.isArray(row.name.aliases)||row.name.aliases.some(value=>!text(value)))||!Array.isArray(row.successorIds)||new Set(row.successorIds).size!==row.successorIds.length||row.successorIds.some(id=>!text(id)||!apps.has(id)||id===row.id)||row.kind==='split'&&row.successorIds.length===1||!evidence(row.evidence))errors.push(`Invalid identity transition ${row?.id||''}`);
    retired.add(row?.id);
  }
  return errors;
}
export function transitionForAppellation(data,id) {
  // Invalid metadata cannot supply links even for legacy standalone fixtures.
  if(validateBrowseMetadata(data).length)return null;
  return (data.identityTransitions||[]).find(row=>row.id===id)||null;
}
