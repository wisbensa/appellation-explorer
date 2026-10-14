import { regionBelongs } from './search.mjs';

// Editorial navigation only: these headings are not Regions, filters or GI rules.
// Source/mapping/version: docs/sources/italy-browse-geography.md.
export const browseProfiles = {
  IT: { groups: [
    { id: 'north-west', label: { ja: '北西', en: 'North-west' }, regionNames: ['Piemonte', "Valle d'Aosta", "Valle d'Aosta/Vallée d'Aoste", 'Liguria', 'Lombardia'] },
    { id: 'north-east', label: { ja: '北東', en: 'North-east' }, regionNames: ['Trentino-Alto Adige', 'Trentino-Alto Adige/Südtirol', 'Veneto', 'Friuli-Venezia Giulia', 'Emilia-Romagna'] },
    { id: 'centre', label: { ja: '中部', en: 'Centre' }, regionNames: ['Toscana', 'Umbria', 'Marche', 'Lazio'] },
    { id: 'south', label: { ja: '南部', en: 'South' }, regionNames: ['Abruzzo', 'Molise', 'Campania', 'Puglia', 'Basilicata', 'Calabria'] },
    { id: 'islands', label: { ja: '島嶼', en: 'Islands' }, regionNames: ['Sicilia', 'Sardegna'] }
  ] }
};
const key = value => String(value || '').normalize('NFKC').toLocaleLowerCase('it').replace(/[’‘]/g,"'").replace(/[‐‑–—-]/g,' ').replace(/\s+/g,' ').trim();
export const distinctAppellations = apps => [...new Map(apps.map(app => [app.id, app])).values()];
export function countryEntries(data) {
  return (data.countries || []).map(country => ({ entity: country, count: distinctAppellations((data.appellations || []).filter(app => app.countryId === country.id)).length })).filter(entry => entry.count);
}
export function regionEntries(data, countryId, parentId = null) {
  return (data.regions || []).filter(region => region.countryId === countryId && (region.parentId || null) === parentId).map(region => ({ entity: region, count: distinctAppellations((data.appellations || []).filter(app => app.countryId === countryId && regionBelongs(data, app.regionIds, region.id))).length })).filter(entry => entry.count);
}
// Group membership may be many-to-many. Unmapped published regions stay reachable.
// Children use the published hierarchy at any depth; no fabricated intermediate tier.
export function browseRegionGroups(data, countryId, parentId = null, profiles = browseProfiles) {
  const entries = regionEntries(data, countryId, parentId);
  const definitions = parentId ? [] : profiles[countryId]?.groups || [];
  const assigned = new Set();
  const groups = definitions.map(group => {
    const names = new Set((group.regionNames || []).map(key));
    const members = entries.filter(({entity}) => (group.regionIds || []).includes(entity.id) || names.has(key(entity.name?.original || entity.name)));
    members.forEach(({entity}) => assigned.add(entity.id));
    return { id: group.id, label: group.label, entries: members };
  }).filter(group => group.entries.length);
  const rest = entries.filter(({entity}) => !assigned.has(entity.id));
  if (rest.length) groups.push({ id: 'ungrouped', label: definitions.length ? { ja: 'その他の地域', en: 'Other regions' } : null, entries: rest });
  return groups;
}
