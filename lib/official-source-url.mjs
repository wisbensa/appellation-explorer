// Exact public endpoints linked by CREA/SFN. This is not a protocol fallback:
// HTTPS failures never turn an arbitrary URL into an HTTP request.
const legacyCatalogueHost = 'catalogoviti.politicheagricole.it';
export const IT_NATIONAL_WINE_BASE = Object.freeze({ country: 'IT', url: `http://${legacyCatalogueHost}/post2.php`, catalogueUrl: `http://${legacyCatalogueHost}/catalogo.php`, category: 'wine', pageSize: 1000 });
const legacyCataloguePaths = new Set([IT_NATIONAL_WINE_BASE.catalogueUrl, IT_NATIONAL_WINE_BASE.url].map(value => new URL(value).pathname));
export function isPublishedCatalogueHTTP(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' && u.hostname === legacyCatalogueHost && !u.port &&
      !u.username && !u.password && !u.search && !u.hash && legacyCataloguePaths.has(u.pathname) &&
      u.href === `http://${legacyCatalogueHost}${u.pathname}`;
  } catch { return false; }
}
export function isOfficialResourceURL(value) {
  try {
    const u = new URL(value);
    return !u.username && !u.password && (u.protocol === 'https:' || isPublishedCatalogueHTTP(u.href));
  } catch { return false; }
}
export function officialResponseURLAllowed(requested, final) {
  if (!isOfficialResourceURL(final)) return false;
  if (requested === undefined) return true;
  if (!isOfficialResourceURL(requested)) return false;
  const a = new URL(requested), b = new URL(final);
  // No downgrade and no redirects at all for the explicitly listed HTTP input.
  return a.protocol === 'https:' ? b.protocol === 'https:' : a.href === b.href;
}
