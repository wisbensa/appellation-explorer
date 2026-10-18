// The currently supported Italian source-domain profiles retain registration
// codes verbatim. New official codes include A01; never coerce them to numbers.
export const isSourceDomainRegistrationNumber = value => typeof value === 'string' && /^(?:\d{1,8}|[A-Z]\d{2,3})$/.test(value);
