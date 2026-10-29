/** Editorial browse headings, not legal hierarchy or appellation membership.
 * Owner: WINE_APP_SPEC_LATEST §9.2; official evidence:
 * docs/sources/italy-browse-geography.md (ISTAT geographical divisions).
 * Exact existing public region identities only; never match display names.
 * Trento/Bolzano remain separate source facets within the north-east heading.
 */
export const COUNTRY_BROWSE_GROUPS = Object.freeze([
  ['north-west', '北西', 'North-west', ['Piemonte', 'Valle d’Aosta', 'Liguria', 'Lombardia']],
  ['north-east', '北東', 'North-east', ['Trento', 'Bolzano', 'Veneto', 'Friuli-Venezia Giulia', 'Emilia-Romagna']],
  ['centre', '中部', 'Centre', ['Toscana', 'Umbria', 'Marche', 'Lazio']],
  ['south', '南部', 'South', ['Abruzzo', 'Molise', 'Campania', 'Puglia', 'Basilicata', 'Calabria']],
  ['islands', 'シチリア・サルデーニャ', 'Islands', ['Sicilia', 'Sardegna']]
].map(([key, ja, en, ids]) => Object.freeze({
  id: `italy-browse:${key}`, countryId: 'it', parentId: null,
  label: Object.freeze({ja, en}), regionIds: Object.freeze(ids.map(id => `it-region:${id}`))
})));
