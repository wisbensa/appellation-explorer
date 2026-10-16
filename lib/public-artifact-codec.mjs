// Pure browser-safe decoding. Transport IDs never replace source-native IDs.
export const ARTIFACT_FORMAT = 'wine-chunks-1';
export const READER_VERSION = 2;
export function evidenceIds(value) {
  const ids = new Set();
  const visit = item => {
    if (!item || typeof item !== 'object') return;
    if (!Array.isArray(item) && Object.hasOwn(item, '$evidence')) {
      if (Object.keys(item).length !== 1 || typeof item.$evidence !== 'string') throw new Error('Invalid evidence reference');
      ids.add(item.$evidence); return;
    }
    for (const child of Object.values(item)) visit(child);
  };
  visit(value); return [...ids].sort();
}
export function expandEvidence(value, records) {
  const visit = item => {
    if (!item || typeof item !== 'object') return item;
    if (Array.isArray(item)) return item.map(visit);
    if (Object.hasOwn(item, '$evidence')) {
      if (Object.keys(item).length !== 1 || typeof item.$evidence !== 'string') throw new Error('Invalid evidence reference');
      const record = records instanceof Map ? records.get(item.$evidence) : records?.[item.$evidence];
      if (!record || evidenceIds(record).length) throw new Error(`Missing or recursive evidence reference: ${item.$evidence}`);
      return structuredClone(record);
    }
    return Object.fromEntries(Object.entries(item).map(([key, child]) => [key, visit(child)]));
  };
  return visit(value);
}
