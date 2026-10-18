import reviewed from './reviewed-variety-identity-evidence.mjs';

// Source-bound registered identity claims; no eligibility or completeness assertion.
// Keep the browser proof view deterministic and independent of acquisition metadata.
export default reviewed.records.map(({registrationNumber,canonicalName,aliases,source,evidence})=>({
  registrationNumber,
  canonicalName,
  aliases:[...aliases],
  sourceId:source.id,
  evidence:{...evidence}
}));
