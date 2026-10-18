// Layout-only reading view. Original quotes and source offsets remain untouched.
// The joined text must still satisfy the caller's complete finite grammar.
export const joinSourceLineHyphens = value => String(value).replace(/(\p{L})-[ \t]*\r?\n[ \t]*(?=\p{Ll})/gu, '$1');

// This complete adjacent pair explicitly identifies Gazette running metadata.
// Callers constructing source claims must also verify its positioned removal.
// A bare number, an isolated banner, or a modified pair is never discarded.
export const withoutGazettePageBreaks = value => String(value).replace(/(?:^|\n)[ \t]*— (\d+) —[ \t]*\n\d{1,2}-\d{1,2}-\d{4} GAZZETTA UFFICIALE DELLA REPUBBLICA ITALIANA Serie generale - n\. \d+[ \t]*(?=\n|$)/gu, '\n');
