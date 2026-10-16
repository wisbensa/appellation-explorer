import {originCountries,isWithinRegion,validateBrowseMetadata} from './identity-transitions.mjs';
const label = (en,ja=en) => ({ja,en});
const labels={DOCG:label('DOCG'),DOC:label('DOC'),IGT:label('IGT'),AOC_AOP:label('AOC / AOP'),IGP:label('IGP'),Qualitätswein:label('Qualitätswein'),Prädikatswein:label('Prädikatswein'),Landwein:label('Landwein'),DOCa:label('DOCa'),DO:label('DO'),VP:label('Vino de Pago'),VC:label('Vino de Calidad'),regionale:label('Régionale','地方名（Régionale）'),village:label('Village','村名（Village）'),grand_cru:label('Grand Cru'),unknown:label('Classification unconfirmed','分類未確認')};
const order=['DOCG','DOC','IGT','regionale','village','grand_cru','AOC_AOP','IGP','Qualitätswein','Prädikatswein','Landwein','DOCa','DO','VP','VC','unknown'];
function nativeGroup(data,app,country) {
  const terms=new Set(app.traditionalTerms||[]);
  // Only a confirmed domestic class in this origin jurisdiction. Foreign
  // protection and generic EU PDO cannot manufacture a domestic DOCG class.
  for(const id of app.protectionIds||[]) {
    const protection=(data.protections||[]).find(row=>row.id===id),scheme=(data.schemes||[]).find(row=>row.id===protection?.schemeId);
    if(protection?.appellationId===app.id&&protection.state==='protected'&&protection.mechanism==='domestic_designation'&&protection.jurisdiction?.kind==='country'&&protection.jurisdiction.countryId===country&&scheme?.jurisdiction?.kind==='country'&&scheme.jurisdiction.countryId===country&&protection.nativeClass?.state==='known'&&protection.nativeClass.evidenceRefs?.length&&scheme.nativeClasses?.some(row=>row.id===protection.nativeClass.value))terms.add(protection.nativeClass.value);
  }
  const choices={IT:['DOCG','DOC','IGT'],DE:['Qualitätswein','Prädikatswein','Landwein'],ES:['DOCa','DO','VP','VC','IGP']}[country];
  if(choices){const found=choices.filter(term=>terms.has(term));return found.length===1?found[0]:'unknown';}
  if(country==='FR'){
    const a=terms.has('AOC')||terms.has('AOP')||app.gi==='PDO',b=terms.has('IGP')||app.gi==='PGI';
    return a!==b?(a?'AOC_AOP':'IGP'):'unknown';
  }
  return 'unknown';
}
// Only presentation: callers supply the currently eligible global/filtered apps.
// No extra query conditions, new region nodes, parent links or quality scores.
export function regionalAppellationGroups(data,apps,regionId) {
  const region=(data.regions||[]).find(row=>row.id===regionId), groups=new Map();
  const metadata=validateBrowseMetadata(data).length?[]:data.regionalClassifications||[];
  for(const app of new Map(apps.map(row=>[row.id,row])).values()) {
    if(regionId&&!isWithinRegion(data,app.regionIds,regionId))continue;
    const countries=originCountries(app),country=region?.countryId||(region?.countryIds||[]).find(id=>countries.includes(id))||(countries.length===1?countries[0]:null);
    // Exact context only: a Bourgogne label is not inherited by every FR region.
    const contextual=metadata.find(row=>row.appellationId===app.id&&row.regionId===regionId);
    const id=contextual?.classification||nativeGroup(data,app,country);
    if(!groups.has(id))groups.set(id,{id,label:labels[id],appellations:[]});
    groups.get(id).appellations.push(app);
  }
  return order.filter(id=>groups.has(id)).map(id=>groups.get(id));
}

export {transitionForAppellation} from "./identity-transitions.mjs";
