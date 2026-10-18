function isoDate(day, month, year) {
  const value = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value ? null : value;
}

export const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
export function officialDates(text) {
  const matches = [...String(text).matchAll(/\b(\d{1,2})(?:\s*[./-]\s*(\d{1,2})\s*[./-]\s*|\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+)(\d{4})\b/gi)];
  return matches.map(match => ({ date: isoDate(match[1], match[2] || MONTHS.indexOf(match[3].toLowerCase()) + 1, match[4]), quote: match[0], offset: match.index })).filter(item => item.date);
}

export function noticeLegalMetadata(notice) {
  // The date in an act's own title is distinct from website update/publication
  // dates. Never choose the most recent arbitrary date in the page.
  const titleAct = /\b(?:decreto|d\.?\s*m|provvedimento|regolamento|rettifica)\b\.?/i.exec(notice.title);
  const titleTail = titleAct ? notice.title.slice(titleAct.index + titleAct[0].length) : '';
  const titleDate = officialDates(titleTail)[0];
  const datedActTitle = titleDate && /^\s*(?:del\s+)?$/.test(titleTail.slice(0, titleDate.offset));
  const signature = String(notice.original || '').match(/\b(?:Roma|Bruxelles|Strasburgo),?\s+(?:(?:il|l[iì])\s+)?\d{1,2}(?:\s*[./-]|\s+(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre))[\s\S]{0,35}/i)?.[0];
  // A legal act's preamble cites older decrees. Those reference dates are not
  // the date of this act and must never falsely prove incorporation.
  const protocolDates = [...new Set([...String(notice.original || '').matchAll(/Prot\.\s*Uscita\s+N\.[0-9]+\s+del\s+(\d{1,2}\/\d{1,2}\/\d{4})/gi)].flatMap(match => officialDates(match[1]).map(item => item.date)))];
  // A dated own decree heading can be printed in the original while its web
  // caption omits the date. Stop before the first preamble/operative clause;
  // quoted or cited later decrees cannot contribute their dates.
  const originalHeader = String(notice.original || '').split(/(?:^|\n)\s*(?:VIST[OAIE]|CONSIDERAT[OA]|RITENUT[OA]|D\s*E\s*C\s*R\s*E\s*T\s*A)\b/i)[0];
  const originalHeadingDates = [...originalHeader.matchAll(/(?:^|\n)[ \t]*Decreto[ \t]+([^\n]{1,60}?)[ \t]+concernente\b/gi)].flatMap(match => {
    const date = officialDates(match[1])[0];
    return date && date.offset === 0 && date.quote.length === match[1].trim().length ? [date.date] : [];
  });
  const assertedDates=[...(datedActTitle?[titleDate.date]:[]),...(signature && officialDates(signature)[0]?.date?[officialDates(signature)[0].date]:[]),...protocolDates,...originalHeadingDates];
  const dateConflict=new Set(assertedDates).size>1;
  const actDate=dateConflict ? undefined : assertedDates[0];
  const start = String(notice.original || '').match(/(?:entra in vigore|efficace|si applica|a decorrere)\s+(?:a partire\s+)?(?:dal|dalla data del|il)\s+([^.;\n]{1,55})/i)?.[1];
  const end = String(notice.original || '').match(/(?:valid[oa]|efficace|si applica|applicazione)[^.;\n]{0,90}?fino al\s+([^.;\n]{1,55})/i)?.[1];
  return { ...notice, ...(dateConflict ? {actDate:undefined,dateConflict:{dates:[...new Set(assertedDates)],title:notice.title,signature,protocolDates}} : actDate ? {actDate} : {}), ...(start && officialDates(start)[0]?.date ? { effectiveFrom: officialDates(start)[0].date } : {}), ...(end && officialDates(end)[0]?.date ? { effectiveTo: officialDates(end)[0].date } : {}) };
}

