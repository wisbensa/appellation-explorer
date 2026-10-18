import { compileItalianLegacyRegulatoryApplication } from './italian-legacy-regulatory-compiler.mjs';
// Browser-safe Italian operative-clause compiler. No fixed denomination IDs,
// source hashes, clock, network, filesystem or current-law assumptions.
const key=x=>String(x||'').normalize('NFKC').toLocaleLowerCase('it').replace(/\s+/g,' ').trim();
const compact = text => String(text).replace(/^\s*\d{1,2}-\d{1,2}-\d{4}\s+GAZZETTA UFFICIALE DELLA REPUBBLICA ITALIANA[^\n]*$/gm,'').replace(/^\s*—\s*\d+\s*—\s*$/gm,'').replace(/([\p{L}])-\s*\n\s*(?=[\p{L}])/gu,'$1').replace(/\s+/g,' ').trim();
const numericDate=text=>{const m=String(text).match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);if(!m)return null;const s=`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;return !Number.isNaN(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s?s:null;};
export function compileItalianRegulatoryApplication(input){return compileModernItalianRegulatoryApplication(input)||compileItalianLegacyRegulatoryApplication(input);}
function compileModernItalianRegulatoryApplication({entry,sourceId,actDate,evidence:inputEvidence}){
 if(!entry?.name?.original||!/^source-[a-f0-9]{64}$/.test(sourceId||'')||!/^\d{4}-\d{2}-\d{2}$/.test(actDate||'')||!Array.isArray(inputEvidence))return null;
 const iso=x=>/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
 if(!iso(actDate))return null;
 const own=inputEvidence.filter(e=>e.sourceId===sourceId&&typeof e.quote==='string');
 const signatures=[...new Set(own.filter(e=>e.locator==='approved decree, own act date').map(e=>e.quote))];
 if(signatures.length!==1)return null;
 const signature=signatures[0].match(/^Roma,\s+(\d{1,2})\s+([a-zà]+)\s+(\d{4})$/i),months=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
 if(!signature||`${signature[3]}-${String(months.indexOf(signature[2].toLowerCase())+1).padStart(2,'0')}-${signature[1].padStart(2,'0')}`!==actDate)return null;
 const readArticle=n=>{const found=[...new Set(own.filter(e=>new RegExp('^approved decree, Article '+n+':').test(e.locator||'')).map(e=>e.quote))];return found.length===1?found[0]:null;};
 const articles=new Map([1,2,3].map(n=>[n,readArticle(n)]));if(!articles.get(1)||!articles.get(2))return null;
 const first=compact(articles.get(1)),publicationEvidenceInput=own.filter(e=>e.locator==='Gazzetta Ufficiale issue header');
 if(!publicationEvidenceInput.length)return null;
 const evidence=(locator,quote)=>({sourceId,locator,quote});
  if(!/^Art(?:icolo|\.)\s*1\.?\s+(?:Approvazione modifica ordinaria\s+)?1\. /i.test(first))return null;
  const names = [entry.name.original, ...(entry.name.aliases || [])].map(key);
  // Identity belongs to each operative predicate, never merely somewhere in
  // the article or in the quoted proposal that follows its legal subject.
  const denominationKind = String.raw`(?:protetta(?: \(menzione (?:tradizionale specifica: denominazione di origine controllata(?: e garantita)?|specifica tradizionale italiana: denominazione di origine controllata [–-] D\.O\.C\. )\))?|controllata(?: e garantita)?)`;
  const designation = String.raw`della denominazione di origine ${denominationKind}(?: dei vini)? [«“"]([^»”"]+)[»”"]`;
  const approval = first.match(/\b1\.\s+(La modifica ordinaria [\s\S]+?)(?=\s+2\.\s|$)/)?.[1];
  const approvalSubject = approval?.match(new RegExp(String.raw`^La modifica ordinaria (?:al|del) disciplinare di produzione ${designation},(?: di cui alla proposta pubblicata nella Gazzetta Ufficiale della Repubblica italiana(?:, Serie generale,| - Serie generale -) n\. \d+ del \d{1,2} [a-zà]+ \d{4},)? (?:è|e') approvata\.$`, 'i'));
  const contrary = /\b(?:non|qualora|purch[eé]|ove|se|sarebbe|sarà|potrà)\b|a condizione|subordinat|in caso/i;
  // A proposal citation inside this unconditional disposition remains history.
  if (!approvalSubject || !names.includes(key(approvalSubject[1])) || !/(?:è|e') approvata\.$/i.test(approval) || contrary.test(approval)) return null;
  const attachment = first.match(/\b2\.\s+(Il disciplinare di produzione [\s\S]+)$/)?.[1];
  const attachmentSubject = attachment?.match(new RegExp(String.raw`^Il disciplinare di produzione ${designation},? consolidato con (?:la modifica ordinaria|le modifiche ordinarie) di cui al comma 1 del presente articolo,? ed il relativo documento unico consolidato modificato (?:sono riportati rispettivamente nei documenti contraddistinti dalle lettere A\) e B\), che costituiscono parte integrante del presente decreto|figurano rispettivamente nell[’']allegato A e nell[’']allegato B al presente decreto|figurano, rispettivamente, negli allegati (?:A ?e B|1 e 2) al presente decreto)\.$`, 'i'));
  const singleAttachment = attachment?.match(new RegExp(String.raw`^Il disciplinare di produzione ${designation}, consolidato con la modifica ordinaria di cui al comma 1 del presente articolo figura, nell[’']allegato A al presente decreto\.$`, 'i'));
  const assignedAttachment=attachmentSubject||singleAttachment;
  if (!assignedAttachment || !names.includes(key(assignedAttachment[1])) || contrary.test(attachment)) return null;
  const traditional=value=>/denominazione di origine controllata e garantita/i.test(value)?'DOCG':/denominazione di origine controllata/i.test(value)?'DOC':null;
  if(traditional(approval)&&traditional(attachment)&&traditional(approval)!==traditional(attachment))return null;
  const nationalText = compact(articles.get(2) || ''), unionText = compact(articles.get(3) || '');
  if(!/^Art(?:icolo|\.)\s*2\.?\s+(?:Entrata in vigore ed applicazione nel territorio nazionale\s+)?1\. /i.test(nationalText))return null;
  const publicationHeaders = publicationEvidenceInput.map(e=>Object.assign([e.quote,e.quote.match(/^(\d{1,2}-\d{1,2}-\d{4})\s+GAZZETTA UFFICIALE DELLA REPUBBLICA ITALIANA[^\n]*$/)?.[1]],{index:0}));
  if(publicationHeaders.some(m=>!m[1]))return null;
  const publicationDates = [...new Set(publicationHeaders.map(match => numericDate(match[1])).filter(Boolean))];
  const publicationDate = publicationDates.length === 1 ? publicationDates[0] : null;
  const publicationEvidence = publicationDate ? publicationHeaders.map(match => evidence('Gazzetta Ufficiale issue header', match[0].trim())) : [];
  const nationalCommencement = /\b1\. Il presente decreto entra in vigore il giorno della sua pubblicazione nella Gazzetta Ufficiale della Repubblica italiana\./i.test(nationalText);
  const nextDayCommencement = /\b1\. Il presente decreto entra in vigore il giorno successivo (?:alla sua|alla) pubblicazione nella Gazzetta Ufficiale della Repubblica italiana\./i.test(nationalText);
  const commencementClauses = [...nationalText.matchAll(/\b1\. Il presente decreto entra in vigore\b/g)];
  const commencementDate = publicationDate && commencementClauses.length === 1 && (nationalCommencement !== nextDayCommencement)
    ? nextDayCommencement ? new Date(Date.parse(publicationDate + 'T00:00:00Z') + 86400000).toISOString().slice(0,10) : publicationDate : null;
  const campaign = nationalText.match(/\b2\. In conformità all[’'](?:art\.|articolo) 4, paragrafo 5, secondo periodo del regolamento delegato \(UE\) 2025\/27, la modifica ordinaria di cui all[’'](?:art\.|articolo) 1, comma 1, del presente decreto si applica nel territorio nazionale (?:a decorrere dalla|a partire dalla|dalla) campagna vitivinicola (\d{4})\/(\d{4})\./i);
  const campaignKnown = campaign && campaign.index + campaign[0].length === nationalText.length && Number(campaign[2]) === Number(campaign[1]) + 1 && !/\bnon\b|salvo|purch[eé]|a condizione/i.test(campaign[0]);
  // An explicit application-from-commencement clause is not a campaign
  // restriction. Retain its own temporal dimension without inventing a vintage.
  const extraNational = nationalText.match(/\b3\. ([\s\S]+)$/)?.[1];
  // A complete additive retrospective permission never restricts the preceding
  // ordinary commencement branch. Its material/lot conditions remain explicit.
  const retrospective = extraNational?.match(/^Inoltre, le stesse modifiche sono applicabili anche nei riguardi delle produzioni derivanti dalla vendemmia (\d{4}), limitatamente all’elaborazione della tipologia [«“"]([^»”"]+)[»”"] o [«“"]([^»”"]+)[»”"] spumante metodo classico rosato o rosé, mediante la pratica di cui all’art\. (\d+), comma (\d+), dell’allegato disciplinare\. A tal fine il quantitativo complementare del (\d+)-(\d+)% di ([\p{L} ]+ N\.), da aggiungere alla partita base ottenuta da uve del vitigno ([\p{L} ]+ B\.) \(minimo (\d+)%\), deve provenire dalla preliminare riclassificazione di prodotti ottenuti da uve del vitigno \8 di altra denominazione di origine ricadente sul territorio della DOCG dei vini [«“"]([^»”"]+)[»”"], nel rispetto delle compatibilità tecnico-produttive stabilite dall’art\. 38 della legge n\. 238\/2016\.$/u);
  const retrospectiveKnown=retrospective && [retrospective[2],retrospective[3],retrospective[11]].every(n=>names.includes(key(n))) && Number(retrospective[1])<Number(actDate.slice(0,4)) && Number(retrospective[6])>0 && Number(retrospective[6])<=Number(retrospective[7]) && Number(retrospective[7])+Number(retrospective[10])===100;
  const currentNationalText=retrospectiveKnown?nationalText.slice(0,nationalText.indexOf('3. '+extraNational)).trim():nationalText;
  const datedApplication = currentNationalText.match(/\b2\. In conformità all[’'](?:art\.|articolo) 4, paragrafo 5, secondo periodo del regolamento delegato \(UE\) 2025\/27, la modifica ordinaria di cui all[’'](?:art\.|articolo) 1, comma 1, del presente decreto,? si applica nel territorio nazionale dalla data di entrata in vigore del presente decreto\.$/i);
  const datedApplicationKnown = datedApplication && commencementDate && !/\bnon\b|salvo|purch[eé]|a condizione/i.test(datedApplication[0]) && !/\b3\. /.test(currentNationalText);


  const unionIntro=unionText.slice(0,unionText.indexOf('2. ',unionText.indexOf('1. ')+3)).trim();
  if(!/^Art(?:icolo|\.)\s*3\.?\s+(?:Comunicazione alla Commissione europea ed applicazione nel territorio dell[’']Unione\s+)?1\. Ai sensi dell[’'](?:art\.|articolo) 5 del regolamento delegato \(UE\) 2025\/27, dell[’'](?:art\.|articolo) 12 del regolamento di esecuzione \(UE\) 2025\/26 e dell[’'](?:art\.|articolo) 13, comma 8, del decreto ministeriale 6 dicembre 2021, richiamati nelle premesse, entro un mese dalla data di pubblicazione del presente decreto nella Gazzetta Ufficiale della Repubblica italiana, l[’']approvazione della modifica ordinaria di cui all[’'](?:art\.|articolo) 1 del presente decreto è comunicata alla Commissione europea tramite il sistema digitale di cui all[’'](?:art\.|articolo) 14, paragrafo 1, del regolamento \(UE\) 2024\/1143\.$/i.test(unionIntro))return null;
  const unionParagraph = unionText.match(/\b2\. ([\s\S]+)$/)?.[1] || '';
  const unionPublication = /^In conformità all[’'](?:art\.|articolo) 5, paragrafo 9, del regolamento delegato \(UE\) 2025\/27, la modifica ordinaria di cui all[’'](?:art\.|articolo) 1, comma 1, del presente decreto si applica nel territorio dell[’']Unione a decorrere dalla data in cui la comunicazione di approvazione della modifica ordinaria di cui al comma 1 del presente articolo ed il documento unico consolidato modificato sono pubblicati dalla Commissione europea nella Gazzetta Ufficiale dell[’']Unione europea(?:, Serie C| - Serie C -)(?:,? ai sensi dell[’'](?:art\.|articolo) 5, paragrafo 4, del regolamento delegato \(UE\) 2025\/27)?\.$/i.test(unionParagraph);

  const unionRegisterPublication = /^In conformità all[’'](?:art\.|articolo) 5, paragrafo 9, del regolamento delegato \(UE\) 2025\/27, la modifica ordinaria di cui all[’'](?:art\.|articolo) 1, comma 1, del presente decreto si applica nel territorio dell[’']Unione a decorrere dalla data in cui la comunicazione della modifica ordinaria di cui al comma 1 del presente articolo è pubblicata dalla Commissione europea nel registro delle indicazioni geografiche dell[’']Unione, ai sensi dell[’'](?:art\.|articolo) 5, paragrafo 5, del regolamento delegato \(UE\) 2025\/27\.$/i.test(unionParagraph);
  if(!unionPublication&&!unionRegisterPublication)return null;
  const unionCondition=unionPublication?'commission_publication_of_approved_amendment_and_single_document_in_oj_c':unionRegisterPublication?'commission_publication_of_approved_amendment_in_union_register':null;

  const nationalEvidence = articles.get(2) ? [evidence('approved decree, Article 2: national commencement and application', articles.get(2))] : [];
  const unionEvidence = articles.get(3) ? [evidence('approved decree, Article 3: separate Union publication condition', articles.get(3))] : [];
  const applicability = {
    national: { jurisdiction: 'IT', ...(retrospectiveKnown ? {retroactiveExtensions:[{kind:'conditional_historical_harvest_permission',harvestYear:Number(retrospective[1]),typology:{denomination:retrospective[2],method:'traditional',color:'rose',original:'spumante metodo classico rosato o rosé'},practice:{article:Number(retrospective[4]),paragraph:Number(retrospective[5])},complementary:{cultivar:retrospective[8],min:Number(retrospective[6]),max:Number(retrospective[7]),unit:'percent'},principal:{cultivar:retrospective[9],min:Number(retrospective[10]),unit:'percent'},reclassification:{required:true,from:'another denomination of origin',territoryDenomination:retrospective[11],compatibility:{law:'238/2016',article:38}},queryCapability:'unsupported',relationship:'additive_to_current_application',original:extraNational,evidence:nationalEvidence}]} : {}), ...(datedApplicationKnown ? { application: { state: 'confirmed', kind: 'date_from', effectiveFrom: commencementDate, evidence: nationalEvidence } } : {}), commencement: { state: commencementDate ? 'confirmed' : 'unverified', effectiveFrom: commencementDate, evidence: [...nationalEvidence,...publicationEvidence] },
      campaign: { state: campaignKnown ? 'confirmed' : 'unverified', ...(campaignKnown ? { from: { startYear: Number(campaign[1]), endYear: Number(campaign[2]) }, kind: 'wine_campaign_from' } : {}), evidence: nationalEvidence } },
    union: { jurisdiction: 'EU', state: 'unverified', effectiveFrom: null, ...(unionCondition ? { condition: unionCondition } : {}), evidence: unionEvidence }
  };
  // A missing/unknown current national clause never yields a public scope.
  if(!commencementDate||!(campaignKnown||datedApplicationKnown))return null;
  const disposition=nationalText.slice(nationalText.indexOf('1. '),nationalText.indexOf('2. ',nationalText.indexOf('1. ')+3)).trim();
  if(!/^1\. Il presente decreto entra in vigore il giorno (?:della sua pubblicazione|successivo (?:alla sua|alla) pubblicazione) nella Gazzetta Ufficiale della Repubblica italiana\.$/i.test(disposition))return null;
  return {...applicability,attachmentRoles:{specification:/negli allegati 1 e 2/.test(attachment)?'1':'A',singleDocument:singleAttachment?null:/negli allegati 1 e 2/.test(attachment)?'2':'B'},evidence:[...own.filter(e=>/^approved decree, (?:Article [123]:|own act date$)/.test(e.locator||'')),...publicationEvidence]};
}
