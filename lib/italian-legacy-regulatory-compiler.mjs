// Finite, browser-safe compiler for the reviewed legacy ordinary-amendment
// grammar. The caller separately proves source bytes, own-act/annex boundaries,
// corroboration ownership and currentness. No denomination registry or clock.
const SOURCE = /^source-[a-f0-9]{64}$/;
const MONTHS = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
const ISO = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && Number.isFinite(Date.parse(x + 'T00:00:00Z')) && new Date(x + 'T00:00:00Z').toISOString().slice(0,10) === x;
const numericDate = x => { const m = String(x).match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/); const d = m && `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`; return ISO(d) ? d : null; };
const italianDate = x => { const m = String(x).match(/^(\d{1,2}) ([a-zà]+) (\d{4})$/i); const d = m && `${m[3]}-${String(MONTHS.indexOf(m[2].toLowerCase()) + 1).padStart(2,'0')}-${m[1].padStart(2,'0')}`; return ISO(d) ? d : null; };
const normalize = text => String(text).normalize('NFKC').replace(/[’‘]/g,"'").replace(/[«»“”]/g,'"').replace(/[–−]/g,'-').replace(/\s+/g,' ').trim();
const key = text => normalize(text).toLocaleLowerCase('it');
const protocol = /(?:MIPAAF|DG PQAI) - PQAI 04 - Prot\. Uscita N\.\d+ del (\d{2}\/\d{2}\/\d{4})/g;
const article = String.raw`(?:articolo\s*|art\.\s*)`;
const modified = String.raw`(?:"modifiche ordinarie"|modifiche ordinarie)`;
const quotedNames = String.raw`"([^"]+)"(?: o "([^"]+)")?`;
const historicalDate = String.raw`(?:\d{1,2} [a-zà]+ \d{4}|\d{1,2}\.\d{1,2}\.\d{4})`;
const decreeKind = String.raw`(?:decreto ministeriale|provvedimento ministeriale|D\.M\.|DM)`;
const history = String.raw`(?:così come consolidato con il ${decreeKind} ${historicalDate} e da ultimo modificato con il ${decreeKind} ${historicalDate} richiamati in premessa|approvato con il Regolamento di esecuzione \(UE\) n\.\s*\d{4}\/\d+ della Commissione del ${historicalDate} richiamato in premessa)`;
const fullMatch = (pattern,text) => new RegExp(`^(?:${pattern})$`,'i').exec(text);

function cleanEvidence(e,actDate) {
  if (e.originalQuote !== undefined || e.layoutProof !== undefined) {
    if (typeof e.originalQuote !== 'string' || e.layoutProof?.kind !== 'positioned-repeated-page-footer' || !Array.isArray(e.layoutProof.removed) || !e.layoutProof.removed.length) return null;
    let raw=e.originalQuote,last=raw.length;
    const removed=[...e.layoutProof.removed].sort((a,b)=>b.quoteOffset-a.quoteOffset);
    for (const r of removed) {
      const token='\n'+r.text,at=r.quoteOffset;
      if (!Number.isInteger(at)||at<0||at+token.length>last||!/^\d+$/.test(r.text||'')||!Number.isInteger(r.page)||r.page<1||String(r.page)!==r.text||!Number.isFinite(r.x)||r.x<250||!Number.isFinite(r.y)||r.y<0||r.y>=60||raw.slice(at,at+token.length)!==token||!['\n',''].includes(raw.slice(at+token.length,at+token.length+1))) return null;
      raw=raw.slice(0,at)+raw.slice(at+token.length); last=at;
    }
    if (raw!==e.quote) return null;
  }
  let text = e.quote;
  // These are distinctive publication/protocol ornaments, not bare numbers.
  text = text.replace(/^\s*\d{1,2}-\d{1,2}-\d{4}\s+GAZZETTA UFFICIALE DELLA REPUBBLICA ITALIANA[^\n]*$/gm,'').replace(/^\s*—\s*\d+\s*—\s*$/gm,'');
  let valid = true;
  text = text.replace(protocol, (all, value) => { if (numericDate(value) !== actDate) valid = false; return ''; });
  if (!valid) return null;
  return normalize(text.replace(/([\p{L}])-\s*\n\s*(?=[\p{L}])/gu,'$1'));
}
function readOwnArticle(own,n,actDate) {
  const found = own.filter(e => new RegExp(`^approved decree, Article ${n}:`).test(e.locator || ''));
  const unique = [...new Set(found.map(e => e.quote))];
  if (unique.length !== 1) return null;
  if (found.some(e => cleanEvidence(e,actDate) === null)) return null;
  const evidence = found.find(e => e.quote === unique[0]);
  const text = cleanEvidence(evidence,actDate);
  if (!text || !new RegExp(`^Art(?:icolo|\\.)\\s*${n}\\.?\\s+1\\. `,'i').test(text)) return null;
  const body = text.replace(new RegExp(`^Art(?:icolo|\\.)\\s*${n}\\.?\\s+`,'i'),'');
  const parts = body.split(/\s+(?=[1-9]\.\s+[A-ZÀÈ])/u), paragraphs = [];
  for (let i = 0; i < parts.length; i++) { const m = parts[i].match(/^(\d+)\. ([\s\S]+)$/); if (!m || Number(m[1]) !== i + 1) return null; paragraphs.push(m[2]); }
  return {evidence,paragraphs};
}
function publication(own,inputEvidence,actDate,names) {
  const proof = own.filter(e => e.locator === 'Gazzetta Ufficiale issue header');
  const dates = [];
  for (const e of proof) { const m = e.quote.match(/^(\d{1,2}-\d{1,2}-\d{4})\s+GAZZETTA UFFICIALE DELLA REPUBBLICA ITALIANA[^\n]*$/); if (!m || !numericDate(m[1])) return null; dates.push(numericDate(m[1])); }
  const corroboration = inputEvidence.filter(e => e.locator === 'approved decree, corroborated Gazzetta publication date');
  for (const e of corroboration) {
    if (!SOURCE.test(e.sourceId || '') || typeof e.quote !== 'string' || e.actDate !== actDate || !ISO(e.publicationDate)) return null;
    const text = normalize(e.quote.replace(/([\p{L}])-\s*\n\s*(?=[\p{L}])/gu,'$1'));
    const notice=fullMatch(String.raw`Si rende noto che, nella G\.U\.U\.E\. n\. C/\d+ del (${historicalDate}), è stata pubblicata la comunicazione della Commissione europea relativa all'approvazione della "modifica ordinaria", che modifica il documento unico, del disciplinare di produzione della DOP dei vini "([^"]+)" avvenuta con decreto ministeriale (${historicalDate}), pubblicato nella Gazzetta Ufficiale della Repubblica italiana n\. \d+ del (${historicalDate})\.`,text);
    if (notice) {
      if (!names.includes(key(notice[2])) || italianDate(notice[3])!==actDate || italianDate(notice[4])!==e.publicationDate || !italianDate(notice[1])) return null;
      proof.push(e); dates.push(e.publicationDate); continue;
    }
    const acts = [...text.matchAll(/\b(?:D\.M\.|DM)\s*(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4})\b/gi)].map(m => numericDate(m[1]));
    const gu = [...text.matchAll(/\bG\.?U\.?(?!\s*\.?\s*U\.?E\b|UE\b)(?:R\.?I\.?)?\s*(?:n\.?\s*)?\d+\s*(?:-\s*|del\s*)(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4})\b/gi)].map(m => numericDate(m[1]));
    if (acts.length !== 1 || acts[0] !== actDate || gu.length !== 1 || gu[0] !== e.publicationDate) return null;
    proof.push(e); dates.push(gu[0]);
  }
  const unique = [...new Set(dates)];
  return unique.length === 1 && unique[0] >= actDate ? {date:unique[0],evidence:proof} : null;
}
function parseAdditions(text,names,campaignStart,evidence) {
  const historical = [], labels = [];
  let rest = text;
  const add = (kind,original,values,which=historical) => which.push({kind,...values,relationship:'additive_to_current_application',queryCapability:'unsupported',original,evidence:[evidence]});
  const nameKnown = value => names.includes(key(value));
  // Prior production explicitly reclassified into the current designation.
  let m = new RegExp(String.raw`^(Inoltre, le stesse modifiche sono applicabili anche nei riguardi delle produzioni di vini atti a diventare (DOCG|DOC) "([^"]+)" derivanti d(?:a|e)lle vendemmie (\d{4}) e (\d{4}), mediante apposita riclassificazione a "([^"]+)" (DOCG|DOC), a condizione che le relative partite siano in possesso dei requisiti stabiliti nell'allegato disciplinare di produzione e che ne sia verificata la rispondenza da parte del competente Organismo di controllo\.)(?: |$)`,'i').exec(rest);
  if (m) { if (!nameKnown(m[6]) || Number(m[4]) >= campaignStart || Number(m[5]) >= campaignStart || Number(m[4]) >= Number(m[5])) return null; add('conditional_historical_reclassification',m[1],{harvestYears:[Number(m[4]),Number(m[5])],fromDenomination:m[3],fromTraditionalTerm:m[2].toUpperCase(),toDenomination:m[6],toTraditionalTerm:m[7].toUpperCase()}); rest=rest.slice(m[0].length); }
  // Prior harvest permission for a named subzone; all conditions are consumed.
  m = new RegExp(String.raw`^(Le stesse modifiche sono applicabili anche nei riguardi delle produzioni di vini atti a diventare (DOCG|DOC) "([^"]+)" derivanti dalle vendemmie (\d{4}) e (\d{4}), ai fini della loro designazione con la sottozona "([^"]+)", a condizione che le relative partite siano in possesso dei requisiti stabiliti nell'allegato disciplinare di produzione per detta sottozona e che ne sia verificata la rispondenza da parte del competente Organismo di controllo\.)(?: |$)`,'i').exec(rest);
  if (m) { if (!nameKnown(m[3]) || Number(m[4]) >= campaignStart || Number(m[5]) >= campaignStart || Number(m[4]) >= Number(m[5])) return null; add('conditional_historical_subzone_permission',m[1],{harvestYears:[Number(m[4]),Number(m[5])],denomination:m[3],traditionalTerm:m[2].toUpperCase(),subzone:m[6]}); rest=rest.slice(m[0].length); }
  m = new RegExp(String.raw`^(Inoltre, le stesse modifiche sono applicabili anche nei riguardi delle giacenze di vino atte a produrre la (DOCG|DOC) "([^"]+)" provenienti dalle vendemmie (\d{4}) e precedenti, a condizione che le relative partite siano in possesso dei requisiti stabiliti nell'allegato disciplinare per le relative tipologie e che ne sia verificata la rispondenza da parte del competente organismo di controllo\.)(?: |$)`,'i').exec(rest);
  if (m) { if (!nameKnown(m[3]) || Number(m[4]) >= campaignStart) return null; add('conditional_historical_stock_permission',m[1],{harvestThrough:Number(m[4]),denomination:m[3],traditionalTerm:m[2].toUpperCase()}); rest=rest.slice(m[0].length); }
  m = new RegExp(String.raw`^(Inoltre le stesse modifiche sono applicabili anche per le produzioni provenienti dalle vendemmie (\d{4}) e precedenti atte ad essere classificate a (DOCG|DOC) "([^"]+)" e che siano in possesso dei requisiti stabiliti nell'allegato disciplinare\.)(?: |$)`,'i').exec(rest);
  if (m) { if (!nameKnown(m[4]) || Number(m[2]) >= campaignStart) return null; add('conditional_historical_classification_permission',m[1],{harvestThrough:Number(m[2]),denomination:m[4],traditionalTerm:m[3].toUpperCase()}); rest=rest.slice(m[0].length); }
  // A campaign range is retained as such; it is not a harvest-year cutoff.
  m = new RegExp(String.raw`^(Inoltre, le stesse modifiche sono applicabili anche nei riguardi delle partite di vino atte a diventare (DOP|DOCG|DOC) ${quotedNames} provenienti dalle campagne (\d{4})/(\d{4}) e precedenti che siano in possesso dei requisiti stabiliti nell'allegato disciplinare consolidato\.)(?: |$)`,'i').exec(rest);
  if (m) { if (!nameKnown(m[3]) || m[4]&&!nameKnown(m[4]) || Number(m[6])!==Number(m[5])+1 || Number(m[6])>campaignStart) return null; add('conditional_historical_campaign_permission',m[1],{campaignThrough:{startYear:Number(m[5]),endYear:Number(m[6])},denomination:m[3],aliases:m[4]?[m[4]]:[],traditionalTerm:m[2].toUpperCase()}); rest=rest.slice(m[0].length); }
  m = new RegExp(String.raw`^(Inoltre è consentito lo smaltimento, entro il (${historicalDate}), delle etichette detenute dalle ditte interessate alla data di entrata in vigore del presente decreto, riportanti il marchio registrato "([^"]+)", che per alcuni aspetti grafici di etichettatura non risultano conformi alle disposizioni di cui all'articolo (\d+) dell'annesso disciplinare di produzione per la sottozona "([^"]+)"\.)(?: |$)`,'i').exec(rest);
  if (m) { const date=italianDate(m[2])||numericDate(m[2]); if (!date || m[3] !== m[5] || !historical.some(h=>h.subzone===m[5])) return null; add('conditional_held_label_use',m[1],{useThrough:date,registeredMark:m[3],subzone:m[5],article:Number(m[4])},labels); rest=rest.slice(m[0].length); }
  m = new RegExp(String.raw`^(Inoltre, è consentito lo smaltimento delle etichette detenute dalle ditte interessate alla data di entrata in vigore del presente decreto, che risultano conformi alle norme del preesistente disciplinare di produzione richiamato in premessa, ma che non risultano conformi alle disposizioni previste dall'art\. (\d+) dell'allegato disciplinare di produzione, purché tali etichette siano utilizzate entro il (${historicalDate})\.)(?: |$)`,'i').exec(rest);
  if (m) { const date=italianDate(m[3])||numericDate(m[3]); if (!date) return null; add('conditional_held_label_use',m[1],{useThrough:date,article:Number(m[2])},labels); rest=rest.slice(m[0].length); }
  if (rest) return null;
  return {historical,labels};
}

export function compileItalianLegacyRegulatoryApplication({entry,sourceId,actDate,evidence:inputEvidence} = {}) {
  if (typeof entry?.name?.original !== 'string' || !entry.name.original.trim() || !Array.isArray(entry.name.aliases||[]) || (entry.name.aliases||[]).some(x=>typeof x!=='string') || !SOURCE.test(sourceId || '') || !ISO(actDate) || !Array.isArray(inputEvidence) || inputEvidence.some(e=>!e||typeof e!=='object')) return null;
  const own = inputEvidence.filter(e=>e?.sourceId===sourceId&&typeof e.quote==='string');
  const signatures = [...new Set(own.filter(e=>e.locator==='approved decree, own act date').map(e=>normalize(e.quote)))];
  if (signatures.length !== 1) return null;
  const signature = signatures[0], roma = signature.match(/^Roma, (.+)$/), protocolDate = signature.match(/^(?:MIPAAF|DG PQAI) - PQAI 04 - Prot\. Uscita N\.\d+ del (\d{2}\/\d{2}\/\d{4})$/);
  if ((roma ? italianDate(roma[1]) : protocolDate ? numericDate(protocolDate[1]) : null) !== actDate) return null;
  const first=readOwnArticle(own,1,actDate), second=readOwnArticle(own,2,actDate);
  if (!first || !second || ![2,3].includes(first.paragraphs.length) || own.some(e=>{const n=e.locator?.match(/^approved decree, Article (\d+):/)?.[1];return n&&!['1','2'].includes(n);})) return null;
  const names=[entry.name.original,...(entry.name.aliases||[])].map(key), known=value=>names.includes(key(value));
  const approval=fullMatch(String.raw`Al disciplinare di produzione della DOP dei vini ${quotedNames}(?:, ${history},)? sono approvate le (?:${modified}|modifiche) di cui alla proposta pubblicata (?:nella|sulla) Gazzetta ufficiale della Repubblica italiana n\.? \d+ del ${historicalDate}\.`,first.paragraphs[0]);
  if (!approval || !known(approval[1]) || (approval[2]&&!known(approval[2]))) return null;
  // The unquoted-name variant is bounded by its exact consolidation predicate.
  const attachment=first.paragraphs.length===2&&fullMatch(String.raw`Il disciplinare di produzione della DOP dei vini (.+?),? consolidato con (?:le )?${modified} di cui al (?:comma 1,|precedente comma) ed il relativo documento unico consolidato,? figurano rispettivamente agli allegati A e B del presente decreto\.`,first.paragraphs[1]);
  const splitAttachment=first.paragraphs.length===3&&fullMatch(String.raw`Il disciplinare di produzione della DOP dei vini ${quotedNames} così come aggiornato con le modifiche di cui al Provvedimento ministeriale (${historicalDate}), rese applicabili nel territorio dell'Unione europea a seguito dell'avvenuta pubblicazione con le modalità e nei termini richiamati in premessa, e consolidato con ${modified} di cui al precedente comma 1, è riportato all'allegato A\.`,first.paragraphs[1]);
  if (!attachment && !splitAttachment) return null;
  if (splitAttachment && (!fullMatch(String.raw`All'allegato B è riportato il documento unico consolidato\.`,first.paragraphs[2]) || !(italianDate(splitAttachment[3])||numericDate(splitAttachment[3])) || (italianDate(splitAttachment[3])||numericDate(splitAttachment[3]))>=actDate)) return null;
  const attached=splitAttachment || fullMatch(quotedNames,attachment[1]) || [null,attachment[1]];
  if (!known(attached[1]) || key(attached[1])!==key(approval[1]) || key(attached[2])!==key(approval[2])) return null;
  const p=second.paragraphs;
  if (p.length<4 || p.length>5 || !fullMatch(String.raw`Il presente decreto entra in vigore a livello nazionale il giorno della sua pubblicazione (?:sulla|nella) Gazzetta Ufficiale della Repubblica italiana\.`,p[0])) return null;
  if (!fullMatch(String.raw`Le ${modified} di cui all'${article}1 sono comunicate, entro (?:30|trenta) giorni dalla predetta data di pubblicazione, alla Commissione UE tramite il sistema informativo "e-Ambrosia" messo a disposizione ai sensi dell'${article}30, par\. 1, lettera a\) del Regolamento \(UE\) n\. 34/2019\. Le stesse modifiche entrano in vigore nel territorio dell'Unione europea a seguito della loro pubblicazione da parte della Commissione (?:sulla|nella) Gazzetta Ufficiale dell'Unione europea, entro (?:3|tre) mesi dalla data della citata comunicazione\.`,p[1])) return null;
  const campaign=new RegExp(String.raw`^Fatto salvo quanto previsto ai commi 1 e 2, le ${modified} di cui all'${article}1 sono applicabili a decorrere dalla campagna vendemmiale (\d{4})/(\d{4})\.(?: ([\s\S]+))?$`,'i').exec(p[2]);
  if (!campaign || Number(campaign[2])!==Number(campaign[1])+1) return null;
  const additions=parseAdditions(campaign[3]||'',names,Number(campaign[1]),second.evidence);
  if (!additions) return null;
  if (p.length===5 && !fullMatch(String.raw`L'elenco dei codici,? previsto dall'${article}18,? comma 6,? del Decreto ministeriale 16 dicembre 2010, è aggiornato in relazione alle modifiche di cui all'${article}1\.`,p[3])) return null;
  const admin=fullMatch(String.raw`Il presente decreto e il disciplinare consolidato (?:della DOP(?: dei vini)?|della denominazione di origine controllata(?: e garantita)? dei vini) ${quotedNames},? di cui all'${article}1 saranno (?:pubblicati|inseriti) sul sito internet del Ministero - Sezione Qualità - Vini DOP e IGP\. Il presente decreto sarà pubblicato nella Gazzetta Ufficiale della Repubblica italiana\.`,p.at(-1));
  if (!admin || !known(admin[1]) || (admin[2]&&!known(admin[2]))) return null;
  const published=publication(own,inputEvidence,actDate,names);
  if (!published) return null;
  if (additions.labels.some(x=>x.useThrough<published.date)) return null;
  const nationalEvidence=[second.evidence];
  return {
    national:{jurisdiction:'IT',commencement:{state:'confirmed',effectiveFrom:published.date,evidence:[...nationalEvidence,...published.evidence]},campaign:{state:'confirmed',kind:'harvest_campaign_from',from:{startYear:Number(campaign[1]),endYear:Number(campaign[2])},evidence:nationalEvidence},...(additions.historical.length?{retroactiveExtensions:additions.historical}:{}),...(additions.labels.length?{transitionalExtensions:additions.labels}:{})},
    union:{jurisdiction:'EU',state:'unverified',effectiveFrom:null,condition:'commission_publication_of_approved_amendment_in_union_official_journal',evidence:nationalEvidence},
    attachmentRoles:{specification:'A',singleDocument:'B'},
    evidence:[...own.filter(e=>/^approved decree, (?:Article [12]:|own act date$)/.test(e.locator||'')),...published.evidence]
  };
}
