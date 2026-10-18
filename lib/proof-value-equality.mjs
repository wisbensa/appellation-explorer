// Proof envelopes are JSON values. Object member order is not part of their
// meaning; array order, exact text, types and every member remain significant.
export function proofValuesEqual(left, right) {
  const encode = value => JSON.stringify(value, (_key, child) =>
    child && typeof child === 'object' && !Array.isArray(child)
      ? Object.fromEntries(Object.keys(child).sort().map(key => [key, child[key]]))
      : child);
  return encode(left) === encode(right);
}
