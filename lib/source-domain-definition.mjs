// Browser-safe, finite source grammar. Unknown text is never an attestation.
import {joinSourceLineHyphens} from './source-layout.mjs';
const NUM='(\\d+(?:[,.]\\d+)?)';
const amount=s=>Number(s.replace(',','.'));
const normalized=s=>joinSourceLineHyphens(s).replace(/\s+/g,' ').trim();
import {compileComplementSentence, regionNameValid} from './italian-complementary-clause.mjs';
export {compileComplementSentence, regionNameValid};
function names(text){
 const result=text.replace(/^vitign[oi]\s+/i,'').split(/\s+e\/o\s+|\s+e\s+|,\s*/).map(s=>s.trim().replace(/\s+[BN]\.\s*$/,''));
 return result.length&&result.every(s=>/^[\p{L}][\p{L}'’ -]{0,70}$/u.test(s)&&! /(?<![\p{L}\p{N}])(?:uve|vigneti|purch[eé]|solo|salvo|con|previa|autorizzazione|autorizzat[oaie]|minimo|massimo|vitigni|o|non|esclus[oaie])(?![\p{L}\p{N}])/iu.test(s))?result:null;
}
export function compileNamedVineyardRows(text){
 let rest=normalized(text).replace(/^Vitigno almeno ([\p{L}'’ -]+) (\d+(?:[,.]\d+)?)\s*%/u,'$1 almeno $2%'), rows=[];
 while(rest){
  const range=rest.match(new RegExp(`^(?:[-–]\\s*)?(.+?)\\s*:?\\s+da(?:l|ll[’'])?\\s*${NUM}\\s*%?\\s+a(?:l|ll[’'])?\\s*${NUM}\\s*%[.;]?\\s*`,'iu'));
  const minimum=rest.match(new RegExp(`^(?:[-–]\\s*)?(.+?)\\s*(?::\\s*)?(?:minimo\\s*:?\\s*|(?:per )?almeno(?: il| l['’])?\\s*)${NUM}\\s*%[.;]?\\s*`,'iu'));
  const m=range||minimum;if(!m)return null;const n=names(m[1]);if(!n)return null;
  const min=amount(m[2]),max=range?amount(m[3]):undefined;if(min<0||min>100||max!==undefined&&(max<min||max>100))return null;
  rows.push({names:n,min,...(max===undefined?{}:{max})});rest=rest.slice(m[0].length);
 }
 return rows.length?rows:null;
}
/** Only optional complementary vineyard rows. A principal's conditions cannot
 * be moved into this remainder: all principal prose is consumed separately. */
export function compileOptionalComplementDefinition(text){
 const staged=compileNationalMinimumRemainderDefinition(text) || compileWhiteVinifiedComplementDefinition(text) || compileMinimumRemainderDefinition(text) || compilePrincipalRangeDefinition(text) || compileUnqualifiedColorDefinition(text);if(staged)return staged;
 if(typeof text!=='string')return null;
 const body=text.replace(/^\s*Art(?:icolo|\.)\s*2\s+Base ampelografi(?:ca|a)\s*/i,'').trim();
 const split=body.match(/\b(?:possono(?: inoltre)? con(?:-[ \t]*\r?\n[ \t]*)?correre|Per il complessivo rimanente|altri vitigni)\b/i);if(!split)return null;
 const remainderOriginal=body.slice(split.index).trim();
 const prefix=normalized(body.slice(0,split.index));
 // Quoted denomination names are opaque identifiers, never operative prose.
 const composition=prefix.match(/^([\s\S]+?composizione (?:ampelografica|varietale)):\s*([\s\S]*)$/i);if(!composition)return null;
 const identityClaims=[];
 const namedText=composition[2].replace(/([\p{L}][\p{L}'’ -]*?)(?: N\.)? \(sinonimo ([\p{L}][\p{L}'’ -]*)\)/gu,(whole,canonicalName,alias)=>{canonicalName=canonicalName.replace(/^vitign[oi]\s+/i,'').trim();if(!names(canonicalName)||!names(alias))return whole;identityClaims.push({kind:'explicit-synonym',canonicalName,alias});return canonicalName;});
 const named=compileNamedVineyardRows(namedText.replace(/\s+da soli o congiuntamente(?=[;.])/iu,''));if(!named||identityClaims.some(claim=>!named.some(row=>row.names.includes(claim.canonicalName))))return null;
 const before=composition[1].replace(/[«“"]([^»”"]+)[»”"]/g,'"NAME"');
 const namesPattern=named.flatMap(row=>row.names).map(name=>name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
 const title=`"NAME"(?: (?:${namesPattern}|riserva|spumante))*`;
 const denomination=`(?:di origine |d['’]origine )?controllata(?: e garantita)?`;
 const production="(?:devono essere ottenuti|sono ottenuti) (?:da|dalle) uve provenienti (?:da|dai) vigneti aventi,? (?:in|nell['’]) ?ambito aziendale,? la seguente composizione ampelografica";
 const introductions=[
  `^(?:\\d+\\.\\s*)?La denominazione di origine controllata "NAME" senza altra specificazione (?:è|e['’]) riservata ai vini rossi, ottenuti dalle uve provenienti dai vigneti aventi nell['’]ambito aziendale la seguente composizione ampelografica$`,
  `^\\d+\\s*-\\s*La denominazione di origine controllata "NAME" seguita dalla qualifica "NAME" (?:è|e['’]) riservata ai vini ottenuti da uve provenienti da vigneti aventi, in ambito aziendale, la seguente composizione ampelografica$`,
  `^(?:\\d+\\.\\s*)?La denominazione "NAME" o "NAME" (?:è|e['’]) riservata al vino rosso ottenuto dalle uve, provenienti dai vigneti aventi nell['’]ambito aziendale la seguente composizione ampelografica$`,
  `^(?:\\d+\\.\\s*)?I vini a D\\.O\\.C\\.G\\. ${title} ${production}$`,
  `^(?:\\d+\\.\\s*)?I vini a denominazione ${denomination} ${title}(?: (?:e|o) ${title})?(?: anche riserva e spumante)? ${production}$`,
  `^La denominazione ${denomination} "NAME" nelle tipologie previste all['’]articolo 1, è riservata ai vini spumanti, ottenuti dalle uve provenienti da vigneti aventi nell['’]ambito aziendale la seguente composizione ampelografica$`,
  `^(?:\\d+\\.\\s*)?La denominazione ${denomination} ${title} è riservata al vino ottenuto dalle uve provenienti dai vigneti aventi nell['’]ambito aziendale la seguente composizione ampelografica$`,
  `^La denominazione ${denomination} "NAME" è riservata ai vini ottenuti da uve di vigneti aventi, in ambito aziendale, la seguente composizione varietale$`
 ];
 if(!introductions.some(pattern=>new RegExp(pattern,'iu').test(before)))return null;
 const remainder=compileComplementSentence(remainderOriginal);if(!remainder)return null;
 return {basis:'vineyard',named,remainder,sourceRelation:'grapes-from-vineyard',...(identityClaims.length?{identityClaims}: {})};
}

// A national-register-only residual clause. The residual cap is bound to the
// same clause's explicit minimum; a bare percentage elsewhere is not inferred.
export function compileNationalMinimumRemainderDefinition(text){
 if(typeof text!=='string')return null;
 const n=normalized(text).replace(/^Art(?:icolo|\.)\s*2\s+Base ampelografica\s*/iu,'');
 const m=n.match(/^(?:\d+\.\s*)?La denominazione di origine controllata [«“"][^»”"]+[»”"] è riservata al vino (rosso|bianco|rosato) ottenuto da uve provenienti da vigneti aventi nell['’]ambito aziendale la seguente composizione ampelografica: (.+?) da soli o congiuntamente: minimo (\d+(?:[,.]\d+)?)\s*%; (altri vitigni a bacca (rossa|nera|bianca), (non aromatici|aromatici), da soli o congiuntamente, per il restante (\d+(?:[,.]\d+)?)\s*% iscritti nel Registro Nazionale delle variet[aà] di vite per uve da vino, approvato con D\.M\. \d{1,2} [\p{L}]+ \d{4} e successivi aggiornamenti\.)$/iu);
 if(!m)return null;
 const principal=names(m[2]),min=amount(m[3]),max=amount(m[7]);
 if(!principal?.length||new Set(principal).size!==principal.length||min<0||min>100||max<0||max>100||min+max!==100)return null;
 const original=text.match(/altri\s+vitigni[\s\S]*$/iu)?.[0];if(!original)return null;
 return {basis:'vineyard',named:[{names:principal,min}],remainder:{original,max,requirements:[{kind:'national-registration',country:'IT',category:'wine'},{kind:'berry-color',color:m[5]},{kind:'aromatic-classification',value:m[6].toLowerCase()==='non aromatici'?'non-aromatic':'aromatic'}]},sourceRelation:'grapes-from-vineyard'};
}

// The color/process restriction governs the complementary clause. Its named
// exception is separately capped; it is never mistaken for an exclusion.
export function compileWhiteVinifiedComplementDefinition(text){
 if(typeof text!=='string')return null;
 const n=normalized(text),quoted=n.replace(/[«“"]([^»”"]+)[»”"]/g,'"NAME"');
 const prefix=quoted.match(/^I vini spumanti e frizzanti con la denominazione di origine controllata "NAME" [\p{L}'’ -]+(?: o "NAME" [\p{L}'’ -]+)* sono ottenuti da uve provenienti da vigneti composti dal vitigno /iu);if(!prefix)return null;
 const production=n.indexOf('sono ottenuti da uve provenienti da vigneti composti dal vitigno ');if(production<0)return null;
 const after=n.slice(production+'sono ottenuti da uve provenienti da vigneti composti dal vitigno '.length);
 const m=after.match(/^([\p{L}'’ -]+) per almeno l['’](\d+(?:[,.]\d+)?)\s*%; (possono concorrere, per la restante parte, altri vitigni a bacca bianca o nera, questi ultimi vinificati in bianco, non aromatici idonei alla coltivazione nella regione ([\p{L}'’ -]+), con l['’]esclusione del ([\p{L}'’ -]+) per il quale è consentita la presenza fino al (\d+(?:[,.]\d+)?)\s*%\.)$/iu);if(!m)return null;
 const principal=names(m[1]),exception=names(m[5]),min=amount(m[2]),cap=amount(m[6]);if(!regionNameValid(m[4])||principal?.length!==1||exception?.length!==1||principal[0]===exception[0]||min<0||min>100||cap<0||cap>100-min)return null;
 const original=text.match(/possono\s+concorrere[\s\S]*$/iu)?.[0];if(!original)return null;
 return {basis:'vineyard',named:[{names:principal,min}],remainder:{original,max:100-min,requirements:[{kind:'regional-eligibility',region:m[4]},{kind:'berry-color',colors:['bianca','nera']},{kind:'conditional-vinification',when:{berryColor:'nera'},operation:'white-vinification'},{kind:'aromatic-classification',value:'non-aromatic',exceptNames:exception},{kind:'named-exception',names:exception,max:cap}]},sourceRelation:'grapes-from-vineyard'};
}

export function compileVineyardPresenceDefinition(text){
 if(typeof text!=='string')return null;
 const n=normalized(text).replace(/^Art(?:icolo|\.)\s*2\s+Base ampelografica\s*/i,'');
 const m=n.match(/^(?:\d+\.\s*)?Il vino a denominazione di origine controllata [“"«][^”"»]+[”"»] deve essere ottenuto dalle uve provenienti da vigneti aventi in ambito aziendale la seguente composizione ampelografica: ([\p{L}'’ -]+) al (\d+(?:[,.]\d+)?)\s*%\. Tuttavia è consentito che nell['’]ambito dei vigneti siano presenti, fino ad un massimo del (\d+(?:[,.]\d+)?)\s*%, i vitigni non aromatici idonei alla coltivazione dalla Regione ([\p{L}'’ -]+)\.$/iu);
 if(!m)return null;const principal=names(m[1]),min=amount(m[2]),max=amount(m[3]);if(!regionNameValid(m[4])||principal?.length!==1||min!==100||max<0||max>100)return null;
 const original=text.match(/Tuttavia\s+è\s+consentito[\s\S]*$/u)?.[0];if(!original)return null;
 return {basis:'vineyard',named:[{names:principal,min,max:min}],presenceTolerance:{original,max,requirements:[{kind:'aromatic-classification',value:'non-aromatic'},{kind:'regional-eligibility',region:m[4]}]},sourceRelation:'grapes-from-vineyard'};
}

// Complete optional-complement sentence variants. Punctuation may wrap, but
// every operative word must belong to one of these finite production forms.

function compileMinimumRemainderDefinition(text){
 if(typeof text!=='string')return null;
 const n=normalized(text),m=n.match(/^(?:\d+\.\s*)?I vini designati con la Denominazione di Origine Controllata e Garantita ([\s\S]+?), devono essere ottenuti da uve provenienti da vigneti composti per non meno del (\d+(?:[,.]\d+)?)\s*% dal vitigno ([\p{L}'’ -]+) (e per il restante (\d+(?:[,.]\d+)?)\s*% provenienti da vitigni a bacca (bianca|nera|rossa) (aromatici|non aromatici) idonei alla coltivazione nella Regione ([\p{L}'’ -]+)\.)$/iu);if(!m)return null;
 const titles=m[1].replace(/[«“"][^»”"]+[»”"]/g,'NAME');
 if(!/^NAME(?:\s+(?:o NAME|spumante|spumantemetodo classico \(metodo tradizionale\)|vendemmia tardiva)|,\s*NAME)*$/i.test(titles))return null;
 const principal=names(m[3]),min=amount(m[2]),max=amount(m[5]);if(principal?.length!==1||min<0||min>100||max!==100-min||!regionNameValid(m[8]))return null;
 const original=text.match(/e\s+per\s+il\s+restante[\s\S]+$/i)?.[0];if(!original)return null;
 return {basis:'vineyard',named:[{names:principal,min}],remainder:{original,max,requirements:[{kind:'berry-color',color:m[6]},{kind:'aromatic-classification',value:m[7].toLowerCase()==='non aromatici'?'non-aromatic':'aromatic'},{kind:'regional-eligibility',region:m[8]}]},sourceRelation:'grapes-from-vineyard'};
}

export function compileClosedNamedVineyardDefinition(text){
 if(typeof text!=='string')return null;
 const m=normalized(text).match(/^Il vino [«“"][^»”"]+[»”"] deve essere ottenuto dalle uve provenienti dai vigneti composti dal vitigno ([\p{L}'’ -]+)\. Possono concorrere alla produzione di detto vino le uve provenienti dal vitigno ([\p{L}'’ -]+) presenti nei vigneti fino ad un massimo del (\d+(?:[,.]\d+)?) (?:per cento|%)\.$/iu);
 if(!m)return null;const principal=names(m[1]),auxiliary=names(m[2]),max=amount(m[3]);
 if(principal?.length!==1||auxiliary?.length!==1||principal[0].toLowerCase()===auxiliary[0].toLowerCase()||max<0||max>100)return null;
 return {basis:'vineyard',named:[{names:principal,min:100-max},{names:auxiliary,max}],sourceRelation:'grapes-from-vineyard'};
}

function compilePrincipalRangeDefinition(text){
 if(typeof text!=='string')return null;
 const n=normalized(text).replace(/^Art(?:icolo|\.)\s*2\s+Base ampelografica\s*/i,'');
 const m=n.match(/^(?:\d+\.\s*)?I vini a denominazione di origine controllata [«“"]([^»”"]+)[»”"] devono essere ottenuti dalle uve provenienti da vigneti composti\s*, in ambito aziendale, dal vitigno ([\p{L}'’ -]+): da(?:l|ll[’'])?\s*(\d+(?:[,.]\d+)?)\s*%? al (\d+(?:[,.]\d+)?)\s*%; (altri vitigni[\s\S]+): da 0 a (\d+(?:[,.]\d+)?)\s*%\.$/iu);if(!m)return null;
 const named=names(m[2]),min=amount(m[3]),max=amount(m[4]),cap=amount(m[6]);if(named?.length!==1||min<0||max!==100||cap!==100-min)return null;
 const remainder=compileComplementSentence(`${m[5]}: massimo ${m[6]}%.`);if(!remainder)return null;
 const original=text.match(/altri\s+vitigni[\s\S]+$/iu)?.[0];if(!original)return null;
 return {basis:'vineyard',named:[{names:named,min,max}],remainder:{...remainder,original},sourceRelation:'grapes-from-vineyard'};
}

export function compileDirectGrapeComplementDefinition(text){
 if(typeof text!=='string')return null;
 const n=normalized(text).replace(/^Art(?:icolo|\.)\s*2\s+Base ampelografi(?:ca|a)\s*/i,'');
 const closed=n.match(/^Il vino a denominazione di origine controllata [«“"]([^»”"]+)[»”"] deve essere ottenuto dalle uve del vitigno [«“"]([\p{L}'’ -]+)[»”"]\. (Possono inoltre concorrere[\s\S]+)$/iu);
 if(closed){const named=names(closed[2]),original=text.match(/Possono\s+inoltre\s+concorrere[\s\S]+$/u)?.[0],remainder=original&&compileComplementSentence(original);if(named?.length!==1||!remainder)return null;return {basis:'grapes',named:[{names:named,min:100-remainder.max}],remainder,sourceRelation:'direct-grape-composition'};}
 const m=n.match(/^Il vino a denominazione di origine controllata [«“"]([^»”"]+)[»”"] deve essere ottenuto dalle uve del vitigno ([\p{L}'’ -]+) da(?:l|ll[’'])\s*(\d+(?:[,.]\d+)?)\s*%? al (\d+(?:[,.]\d+)?)\s*%\. Possono concorrere alla produzione di detti vini uve provenienti nell['’]ambito aziendale da vitigni ([\s\S]+) fino ad un massimo del (\d+(?:[,.]\d+)?)\s*%\.$/iu);if(!m)return null;
 const named=names(m[2]),min=amount(m[3]),max=amount(m[4]),cap=amount(m[6]);if(named?.length!==1||min<0||max!==100||cap!==100-min)return null;
 const remainder=compileComplementSentence(`altri vitigni ${m[5]}: massimo ${m[6]}%.`);if(!remainder)return null;
 const original=text.match(/Possono\s+concorrere[\s\S]+$/u)?.[0];if(!original)return null;
 return {basis:'grapes',named:[{names:named,min,max}],remainder:{...remainder,original},sourceRelation:'direct-grape-composition'};
}

function compileUnqualifiedColorDefinition(text){
 if(typeof text!=='string')return null;
 const n=normalized(text),m=n.match(/^(?:\d+\.\s*)?La denominazione [«“"]([^»”"]+)[»”"] senza alcuna specificazione è riservata al vino rosso ottenuto da uve provenienti da vigneti aventi nell['’]ambito aziendale la composizione di vitigni seguente: (.+?), da soli o congiuntamente minimo il (\d+(?:[,.]\d+)?)%\. (Possono concorrere[\s\S]+)$/iu);if(!m)return null;
 const named=compileNamedVineyardRows(`${m[2]} minimo ${m[3]}%`),original=text.match(/Possono\s+concorrere[\s\S]+$/u)?.[0],remainder=original&&compileComplementSentence(original);if(!named||!remainder)return null;
 return {basis:'vineyard',named,remainder,sourceRelation:'grapes-from-vineyard'};
}

// The full corresponding-variety paragraph is reusable both as a selected
// recipe and as a fully consumed, disjoint sibling of a singular-color row.
export function compileCorrespondingVineyardParagraph(text){
 if(typeof text!=='string')return null;
 const m=normalized(text).match(/^\d+\. La denominazione [«“"]([^»”"]+)[»”"] con la specificazione di uno dei seguenti vitigni: (.+?) è riservata ai vini ottenuti da uve provenienti da vigneti aventi, in ambito aziendale, la corrispondente composizione ampelografica per almeno (\d+(?:[,.]\d+)?)%, (possono concorrere[\s\S]+)$/iu);if(!m)return null;
 const list=compileNamedVineyardRows(`${m[2].replace(/\s*-\s*/g,',').replace(/^,/,'')} minimo ${m[3]}%`)?.[0]?.names;
 const remainder=compileComplementSentence(text.match(/possono\s+concorrere[\s\S]+$/iu)?.[0]||''),min=amount(m[3]);
 if(!list||new Set(list).size!==list.length||!remainder||min+remainder.max!==100)return null;
 return {denomination:m[1],names:list,min,remainder};
}

// An overlapping bare label can name separately declared colors. This finite
// reader uses explicit declaration and consumption colors, never grape names
// or berry color. Its evidence remains bound to the same source by the caller.
function declaredProductionColor(text,scopeEvidence){
 const key=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const header=normalized(text).match(/^(?:\d+\.\s*)?I vini a denominazione (?:di origine|d['’]origine) controllata(?: e garantita)? (.+?) (?:devono essere ottenuti|sono ottenuti) /iu)?.[1];
 if(!header)return null;
 const groups=header.replace(/ anche riserva e spumante$/iu,'').split(/\s+e\s+(?=[«“"])/u);
 const label=/^[«“"][^»”"]+[»”"](?: [\p{L}'’ -]+)?(?: o [«“"][^»”"]+[»”"](?: [\p{L}'’ -]+)?)*$/u;
 if(groups.some(group=>!label.test(group)))return null;
 const declarations=[];
 const declarationEvidence=scopeEvidence.filter(e=>/^\s*Art(?:icolo|\.)\s*1\b/u.test(e.quote||''));
 if(!declarationEvidence.length)return null;
 for(const e of declarationEvidence){
  const rows=[...e.quote.matchAll(/(?:^|\n)\s*-Vini (rossi|bianchi|rosati), Categoria \(1\) Vino:?\s*\n([^\n]+)/gu)].map(m=>({title:m[2].trim().replace(/[;:.]+$/u,''),color:({rossi:'rosso',bianchi:'bianco',rosati:'rosato'})[m[1]]}));
  if(rows.some(d=>!label.test(d.title))||!rows.some(d=>groups.some(group=>key(group)===key(d.title))))return null;
  declarations.push(...rows);
 }
 const selected=declarations.filter(d=>groups.some(group=>key(group)===key(d.title)));
 const colors=[...new Set(selected.map(d=>d.color))];if(colors.length!==1)return null;
 const color=colors[0],aliases=[...new Set(selected.flatMap(d=>d.title.split(/\s+o\s+/u).map(key)))];
 const quotedAliases=new Set(selected.flatMap(d=>[...d.title.matchAll(/[«“"]([^»”"]+)[»”"]/gu)].map(m=>key(m[1]))));
 const mentionsAlias=body=>[...body.matchAll(/[«“"]([^»”"]+)[»”"]/gu)].some(m=>quotedAliases.has(key(m[1])));
 const declaredColors=new Set(declarations.filter(d=>d.title.split(/\s+o\s+/u).some(title=>aliases.includes(key(title)))).map(d=>d.color));
 const checked=[];
 for(const e of scopeEvidence){
  if(!/^\s*Art(?:icolo|\.)\s*6\b/u.test(e.quote||''))continue;
  const blocks=e.quote.split(/(?=(?:^|\n)\s*(?:\d+\.\s+|(?:I vini|Il vino)\b))/u);
  if(normalized(blocks.shift())!=='Articolo 6 Caratteristiche al consumo'||!blocks.length)return null;
  const observedColors=new Set();
  for(const block of blocks){
   const n=normalized(block);
   const m=n.match(/^\d+\. (?:I vini|Il vino) a denominazione (?:di origine|d['’]origine) controllata(?: e garantita)? (.+?) \((rosso|bianco|rosato)\), anche con menzione [«“"]?vigna[»”"]?, all['’]atto dell['’]immissione al consumo, (?:devono|deve) rispondere alle seguenti caratteristiche: ([\s\S]+)$/iu);
   if(!m){
    // A separately qualified method has a disjoint full title. Unknown or
    // unqualified same-title blocks cannot disappear during color selection.
    const method=n.match(/^\d+\. (?:I vini|Il vino) a denominazione (?:di origine|d['’]origine) controllata(?: e garantita)? ([«“"][^»”"]+[»”"] (?:spumante|frizzante|passito)), all['’]atto dell['’]immissione al consumo, (?:devono|deve) rispondere alle seguenti caratteristiche: ([\s\S]+)$/iu);
    if(!method||aliases.includes(key(method[1]))||mentionsAlias(method[2]))return null;
    continue;
   }
   if(mentionsAlias(m[3]))return null;
   const titles=m[1].split(/\s+e\s+(?=[«“"])/u);if(titles.some(title=>!label.test(title)))return null;
   if(!titles.some(title=>aliases.includes(key(title))))continue;
   const blockColor=m[2].toLowerCase();
   if(!declaredColors.has(blockColor)||observedColors.has(blockColor))return null;
   const wording=m[3].match(/^colore:\s*([^;]+);/iu)?.[1];
   if(!wording||[...m[3].matchAll(/\bcolore\s*:/giu)].length!==1)return null;
   const hues={rosso:/^(?:rosso(?: rubino(?: o granato)?)?|granato)$/iu,bianco:/^(?:dal )?giallo paglierino(?: al giallo dorato)?$/iu,rosato:/^(?:rosato|rosa)$/iu};
   if(!hues[blockColor].test(wording.trim()))return null;
   observedColors.add(blockColor);
  }
  checked.push(observedColors.size===declaredColors.size&&[...declaredColors].every(c=>observedColors.has(c)));
 }
 return checked.length&&checked.every(Boolean)?color:null;
}

// Direct profiles still have concrete legal targets. A numeric recipe is not
// authority to relabel it as another wine. Family variants absent from the
// production heading require a same-source explicit declaration/heading.
export function directSourceScopeVerified(text,scope,scopeEvidence=[]){
 if(typeof text!=='string'||!scope?.denomination||!scope.wineName||!scope.wineType)return false;
 const key=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/spumantemetodo/g,'spumante metodo').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const n=normalized(text),predicate=n.search(/(?:devono essere ottenuti|deve essere ottenuto|sono ottenuti|(?:è|e['’]) riservata)\b/iu);
 if(predicate<0)return false;
 const header=n.slice(0,predicate),first=header.search(/[«“"]/u);if(first<0)return false;
 let title=header.slice(first).replace(/\s+nelle tipologie previste all['’]articolo 1,?\s*$/iu,'').replace(/\s+senza (?:altra|alcuna) specificazione\s*$/iu,'').replace(/\s+seguita dalla qualifica\s+/iu,' ').replace(/[,\s]+$/,'');
 const also=title.match(/\s+anche riserva e spumante$/iu);if(also)title=title.slice(0,also.index);
 const sourceGroups=title.split(/,\s*|\s+e\s+(?=[«“"])/u).map(s=>s.trim());
 if(sourceGroups.some(s=>!s))return false;
 const target=key(scope.wineName),denomination=key(scope.denomination),type=key(scope.wineType);
 const firstDenomination=header.slice(first).match(/^[«“"]([^»”"]+)[»”"]/u)?.[1];
 if(key(firstDenomination)!==denomination)return false;
 const typeParts=String(scope.wineType).toLowerCase().split(/\s*\/\s*/).map(key);
 if(typeParts.some(p=>!['rosso','bianco','rosato','spumante','frizzante','passito','liquoroso','vendemmia tardiva','metodo classico','vino'].includes(p)))return false;
 const methods=s=>[...key(s).matchAll(/\b(spumante|frizzante|passito|liquoroso|vendemmia tardiva|metodo classico)\b/g)].map(m=>m[1]);
 const actualMethods=methods(type),reservation=n.slice(predicate).split(/\bottenut[oi]\b/u)[0];
 const reservedMethods=[...reservation.matchAll(/\b(spumanti|frizzanti|passiti)\b/giu)].map(m=>({spumanti:'spumante',frizzanti:'frizzante',passiti:'passito'})[m[1].toLowerCase()]);
 const leadingMethods=[...header.slice(0,first).matchAll(/\b(spumanti|frizzanti|passiti)\b/giu)].map(m=>({spumanti:'spumante',frizzanti:'frizzante',passiti:'passito'})[m[1].toLowerCase()]);
 const limitedMethods=[...new Set([...reservedMethods,...leadingMethods])];
 if(limitedMethods.length&&(actualMethods.length!==1||!limitedMethods.includes(actualMethods[0])))return false;
 const reservedColors=[...reservation.matchAll(/\b(ross[oi]|bianch[oi]|rosat[oi])\b/giu)].map(m=>/^ross/i.test(m[1])?'rosso':/^bianch/i.test(m[1])?'bianco':'rosato');
 if(reservedColors.length&&typeParts.filter(p=>['rosso','bianco','rosato'].includes(p)).some(p=>!reservedColors.includes(p)))return false;
 if(reservedColors.length&&!typeParts.some(p=>reservedColors.includes(p)))return false;
 const singularColor=reservation.match(/^(?:è|e['’]) riservata al vino (rosso|bianco|rosato) $/iu)?.[1]?.toLowerCase();
 if(singularColor&&target===denomination&&(typeParts.length!==1||typeParts[0]!==singularColor))return false;
 const variants=sourceGroups.flatMap(group=>{
  const aliases=group.split(/\s+o\s+/u).map(key),rows=[key(group),...aliases];
  if(also)for(const qualifier of ['riserva','spumante'])rows.push(aliases.map(a=>a+' '+qualifier).join(' o '),...aliases.map(a=>a+' '+qualifier));
  return rows;
 });
 if(singularColor&&new Set(variants).size===1&&variants[0]===denomination&&target!==denomination&&target!==`${denomination} ${singularColor}`)return false;
 const exact=variants.includes(target);
 // A directly quoted or separately declared sparkling/color title cannot be
 // assigned a conflicting still/color type by a surrounding record.
 const targetMethods=methods(target);if(targetMethods.some(m=>!actualMethods.includes(m)))return false;
 const titledColor=target.match(/\b(rosso|bianco|rosato)\b/)?.[1];if(titledColor&&!typeParts.includes(titledColor))return false;
 // A matching title cannot discard a supplied governing context. Standalone
 // complete clauses remain supported only when no contextual record is given.
 const contextVerified=(conflictingNames=[target,denomination])=>{
  const contexts=scopeEvidence.map(e=>normalized(e?.quote||'')).filter(q=>q.includes(n)||/^Art(?:icolo|\.)\s*2\b/iu.test(q));
  if(!contexts.length)return false;
  return contexts.every(context=>{
   if(!context.includes(n)||context.indexOf(n)!==context.lastIndexOf(n))return false;
   const outside=context.replace(n,'').replace(/^Art(?:icolo|\.)\s*2\s*[-–.]?\s*Base ampelografi(?:ca|a)\s*/iu,'').trim();
   if(!outside)return true;
   const siblings=outside.split(/(?=\b\d+\.\s*(?:La denominazione|I vini|Il vino)\b)/u).filter(Boolean);
   return siblings.length>0&&siblings.every(sibling=>{
    const corresponding=compileCorrespondingVineyardParagraph(sibling);
    if(corresponding)return key(corresponding.denomination)===denomination&&!corresponding.names.some(name=>conflictingNames.includes(key(`${corresponding.denomination} ${name}`)));
    if(!(compileOptionalComplementDefinition(sibling)||compileVineyardPresenceDefinition(sibling)||compileDirectGrapeComplementDefinition(sibling)))return false;
    if(!conflictingNames.some(wineName=>directSourceScopeVerified(sibling,{...scope,wineName},[])))return true;
    const selectedColor=declaredProductionColor(text,scopeEvidence),siblingColor=declaredProductionColor(sibling,scopeEvidence);
    return Boolean(selectedColor&&siblingColor&&selectedColor!==siblingColor&&typeParts.length===1&&typeParts[0]===selectedColor);
   });
  });
 };
 if(exact)return target!==denomination||!scopeEvidence.length||contextVerified([target,...(singularColor?[`${denomination} ${singularColor}`]:[])]);
 // A singular explicitly reserved color is the concrete unqualified wine.
 // It does not introduce a method or a qualification, and cannot stand in for
 // a color-unspecified or multi-color reservation.
 if(new Set(variants).size===1&&variants[0]===denomination&&/senza alcuna specificazione\s*$/iu.test(header)&&reservedColors.length===1&&!actualMethods.length&&target===`${denomination} ${reservedColors[0]}`)return true;
 const declarationMatches=scopeEvidence.some(e=>{
  let row=normalized(e?.quote||'').replace(/^[-–]\s*/,'').replace(/[;:,.]+$/,'').trim();
  if(/\b(?:purché|previa|salvo|solo|condizion\w*|deve|devono|riservat\w*|ottenut\w*)\b/iu.test(row))return false;
  const optional=row.match(/\s*\(anche (riserva|superiore)\)\s*$/iu);
  const rows=optional?[row.slice(0,optional.index),row.slice(0,optional.index)+' '+optional[1]]:[row];
  return rows.some(r=>key(r)===target);
 });
 if(!declarationMatches)return false;
 // Naming the singular explicitly reserved color is not family inheritance.
 // Require its concrete declaration and consume the complete production
 // context, rejecting every unknown or competing sibling before allowing it.
 if(singularColor&&new Set(variants).size===1&&variants[0]===denomination&&target===`${denomination} ${singularColor}`){
  if(typeParts.length!==1||typeParts[0]!==singularColor||actualMethods.length)return false;
  return contextVerified();
 }
 // The finite qualification relation does not create a new variety, color,
 // production method or geographic scope.
 const base=target.replace(/ (?:riserva|superiore)$/,'');
 if(base!==target&&variants.includes(base)&&actualMethods.every(m=>methods(base).includes(m)||limitedMethods.includes(m))){
  return scopeEvidence.some(e=>{
   const context=normalized(e?.quote||'');if(context===n)return true;if(!context.includes(n)||context.indexOf(n)!==context.lastIndexOf(n))return false;
   const outside=context.replace(n,'').replace(/^Art(?:icolo|\.)\s*2\s*[-–.]?\s*Base ampelografi(?:ca|a)\s*/iu,'').trim();
   if(!outside)return true;
   const siblings=outside.split(/(?=\b\d+\.\s+(?:La denominazione|I vini|Il vino)\b)/u).filter(Boolean);
   return siblings.length>0&&siblings.every(sibling=>{
    if(!(compileOptionalComplementDefinition(sibling)||compileVineyardPresenceDefinition(sibling)||compileDirectGrapeComplementDefinition(sibling)))return false;
    return ![target,base,denomination].some(wineName=>directSourceScopeVerified(sibling,{...scope,wineName},[]));
   });
  });
 }
 const broad=variants.some(v=>v===denomination)&&sourceGroups.length===1&&key(title)===denomination;
 // An explicit declaration alone cannot select a generic recipe over an
 // unseen sibling recipe. Broad family inheritance needs the complete
 // Article2 evidence consumed by this very definition, without other rules.
 const completeProduction=scopeEvidence.some(e=>normalized(e?.quote||'').replace(/^Art(?:icolo|\.)\s*2\.?\s+Base ampelografi(?:ca|a)\s*/iu,'')===n.replace(/^Art(?:icolo|\.)\s*2\.?\s+Base ampelografi(?:ca|a)\s*/iu,''));
 return broad&&!/senza (?:altra|alcuna) specificazione/iu.test(header)&&completeProduction&&target.startsWith(denomination+' ');
}
