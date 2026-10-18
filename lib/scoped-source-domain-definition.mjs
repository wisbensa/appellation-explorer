import {compileDeclaredColorFamily} from './declared-color-family.mjs';
import {declarationLines,characteristicColor} from './wine-scopes.mjs';
import {declaredVarietalParents,declaredShortMoscatoScope,reviewedDeclaredSourceHash,fullyConsumedVarietalDeclarations} from './declared-varietal-scope.mjs';
import {compileExtendedCorrespondingFamily} from './corresponding-family-context.mjs';
import {compileNamedVineyardRows,compileComplementSentence,compileCorrespondingVineyardParagraph,regionNameValid} from './source-domain-definition.mjs';
import {joinSourceLineHyphens} from './source-layout.mjs';
const norm=value=>String(value).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[«»“”"'’‘]/g,' ').replace(/\s+/g,' ').trim();
const flat=value=>joinSourceLineHyphens(value).replace(/\s+/g,' ').trim();
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function targets(heading,denomination){
 const quoted=[...heading.matchAll(/[«“"]([^»”"]+)[»”"]/g)];
 if(!quoted.length||quoted.some(m=>norm(m[1])!==norm(denomination)))return null;
 const suffix=heading.replace(/[«“"][^»”"]+[»”"]/g,'').replace(/:\s*$/,'').trim();
 const names=suffix.split(/\s+e\s+|\s+o\s+|,\s*/).map(x=>x.trim());
 if(names.some(x=>!/^[\p{L}][\p{L}'’ -]*(?:\s*\([\p{L}][\p{L}'’ -]*\))?$/u.test(x)))return null;
 return [...new Set([...names.map(name=>norm(`${denomination} ${name}`)),...(names.length===2&&/\s+o\s+/.test(suffix)?[norm(`${denomination} ${suffix}`)]:[])])];
}
function recipe(body,allowOpaqueAlias=false){
 const split=body.match(/\bpossono(?: inoltre)? concorrere\b/i);
 if(!split){const pure=flat(body).replace(/^Vitigno /i,'').replace(/:\s*/g,' ').replace(/;$/,'').match(/^(?:([\p{L}'’ -]+)\s+100\s*%|100\s*%\s+([\p{L}'’ -]+))\.?$/u);return pure&&compileNamedVineyardRows(`${pure[1]||pure[2]}: minimo 100%`)?{closed:true,basis:'vineyard',named:[{names:[pure[1]||pure[2]],min:100,max:100}],sourceRelation:'grapes-from-vineyard'}:null;}
 let vineyardRegistration;
 if(/È consentita, per questa ultima tipologia,/.test(body)) {
  const tail=flat(body.slice(body.indexOf('È consentita, per questa ultima tipologia,'))).replace(/individuabi-\s*li/,'individuabili');
  if(!/^È consentita, per questa ultima tipologia, l['’]iscrizione allo schedario di porzioni di vigneto distinte, purché nettamente individuabili, effettivamente coltivate e\/o l['’]iscrizione di singoli ceppi limitatamente ai vigneti esistenti, con l['’]indicazione della relativa superficie coltivata\.$/.test(tail))return null;
  vineyardRegistration={original:body.slice(body.indexOf('È consentita, per questa ultima tipologia,')).trim(),conditions:['distinct-identifiable-cultivated-portions','individual-vines-only-existing-vineyards','stated-cultivated-surface']};
  body=body.slice(0,body.indexOf('È consentita, per questa ultima tipologia,')).trim();
 }
 let namedText=body.slice(0,split.index).trim().replace(/,$/,';');
 const identityClaims=[];
 namedText=namedText.replace(/([\p{Lu}][\p{L}'’ -]*?) \(([\p{Lu}][\p{L}'’ -]*)\)(?=\s*(?::|minimo|almeno|da))/gu,(whole,canonicalName,alias)=>{identityClaims.push({kind:'registered-synonym',canonicalName:canonicalName.trim(),alias});return canonicalName;});
 const alias=namedText.match(/^([\p{Lu}][\p{L}'’ -]*?) o ([\p{Lu}][\p{L}'’ -]*?):(.*)$/u);
 if(alias){identityClaims.push({kind:'registered-synonym',canonicalName:alias[1],alias:alias[2]});namedText=alias[1]+':'+alias[3];}
 const joint=namedText.match(/^([\s\S]+?),\s*congiuntamente:\s*minimo\s*(\d+)\s*%;\s*ferma la suddetta percentuale minima, ciascuno dei (due|tre|quattro|cinque|sei|sette|otto|nove|dieci) viti(?:-\s*)?gni deve essere presente in misura comunque non inferiore al (\d+)\s*% del\s+totale\.$/u);
 let named;
 if(joint){named=compileNamedVineyardRows(`${joint[1]}: minimo ${joint[2]}%`);const count=['due','tre','quattro','cinque','sei','sette','otto','nove','dieci'].indexOf(joint[3])+2;if(!named||named[0].names.length!==count||+joint[4]>100)return null;named.push(...named[0].names.map(name=>({names:[name],min:+joint[4]})));}
 else named=compileNamedVineyardRows(namedText);
 const remainder=compileComplementSentence(body.slice(split.index).trim());
 return named&&remainder?{basis:'vineyard',named,remainder,sourceRelation:'grapes-from-vineyard',...(identityClaims.length?{identityClaims}:{}),...(vineyardRegistration?{vineyardRegistration}:{})}:null;
}
/** Full Article2 context and exact raw selected row. No synthetic concatenation,
 * no default vineyard basis, and every sibling row must be a closed grammar. */
export function compileScopedOptionalComplementDefinition(context,definition,scope){
 if(typeof context!=='string'||typeof definition!=='string'||!scope?.denomination||!scope?.wineName||context.split(definition).length!==2)return null;
 const corresponding=compileExtendedCorrespondingFamily(context,definition,scope) || compileCorrespondingFamily(context,definition,scope) || compileGeographicFamily(context,definition,scope) || compileGeographicHeadingRows(context,definition,scope) || compileSectionedHeadingFamily(context,definition,scope) || compileNumberedNamedFamily(context,definition,scope) || compilePrefixNamedFamily(context,definition,scope) || compileNationalCorrespondingFamily(context,definition,scope) || compileListedCorrespondingFamily(context,definition,scope);if(corresponding)return corresponding;
 const article=context.replace(/^\s*Art(?:icolo|\.)\s*2\.?\s+Base ampelografi(?:ca|a)(?: dei vigneti)?\s*/i,'').replace(/\s*—\s*\d+\s*—\s*\d{1,2}-\d{1,2}-\d{4} GAZZETTA UFFICIALE DELLA REPUBBLICA ITALIANA Serie generale - n\. \d+\s*$/u,'');
 const intro=article.match(/^[\s\S]+?composizione ampelografica:\s*/i);
 if(!intro)return null;
 const governing=flat(intro[0]).match(/^(?:\d+\.\s*)?I vini a denominazione di origine controllata [«“"]([^»”"]+)[»”"]\s*devono essere ottenuti (?:da uve provenienti da|dalle uve prodotte dai) vigneti aventi,? (?:in|nell['’]) ?ambito aziendale,? la seguente composizione ampelografica:$/i);
 if(!governing||norm(governing[1])!==norm(scope.denomination))return null;
 const remaining=article.slice(intro[0].length);
 const starts=[...remaining.matchAll(/(?:^|\n)[ \t]*[«“"][^»”"]+[»”"][^\n]*?:/g)];
 if(!starts.length||starts[0].index!==0)return null;
 const rows=starts.map((m,i)=>({heading:m[0].trim(),original:remaining.slice(m.index,starts[i+1]?.index??remaining.length).trim()}));
 let selected=null;const allTargets=[];
 for(const row of rows){
  const choices=targets(row.heading,scope.denomination);if(!choices)return null;
  if(choices.some(name=>allTargets.includes(name)))return null;allTargets.push(...choices);
  const body=row.original.slice(row.original.indexOf(':')+1).trim();
  if(!recipe(body,true))return null;
  if(choices.includes(norm(scope.wineName))){if(selected)return null;selected={row,body};}
 }
 // The exact original selection may include the already-recognized terminal
 // Gazette page footer. Compare the same bounded reading view on both sides;
 // never discard arbitrary numeric lines or a substantive trailing clause.
 const selectedDefinition=definition.replace(/\s*—\s*\d+\s*—\s*\d{1,2}-\d{1,2}-\d{4} GAZZETTA UFFICIALE DELLA REPUBBLICA ITALIANA Serie generale - n\. \d+\s*$/u,'').trim();
 if(!selected||selected.row.original!==selectedDefinition)return null;
 const compiled=recipe(selected.body);return compiled&&!compiled.closed?compiled:null;
}

// A finite corresponding-variety family whose other numbered paragraphs have
// positively disjoint unqualified/color/method targets. Every paragraph's full
// source grammar is recognized before the one named definition is selected.
export function compileScopedOptionalComplementAlternatives(context,definition,scope){
 if(typeof context!=='string'||typeof definition!=='string'||!scope?.denomination||!scope?.wineName||context.split(definition).length!==2)return null;
 return compileCorrespondingFamily(context,definition,scope,true);
}
function compileCorrespondingFamily(context,definition,scope,alternativesOnly=false){
 const body=context.replace(/^\s*Art(?:icolo|\.)\s*2\.?\s+Base ampelografi(?:ca|a)\s*/i,'');
 const starts=[...body.matchAll(/(?:^|\n)\s*\d+\.\s+La denominazione /g)];
 if(!starts.length||starts[0].index!==0)return null;
 const blocks=starts.map((m,i)=>body.slice(m.index,starts[i+1]?.index??body.length).trim());
 const seenTargets=new Set();let selected=null;
 for(const raw of blocks){
  const text=flat(raw),name=text.match(/^\d+\. La denominazione di origine [«“"]([^»”"]+)[»”"]/i)?.[1];if(norm(name)!==norm(scope.denomination))return null;
  const quoted=text.match(/^\d+\. La denominazione di origine [«“"][^»”"]+[»”"](.*)$/i)[1];
  const list=quoted.match(/^,? seguita da una delle specificazioni di vitigno: (.+?), è riservata ai vini ottenuti dalle uve provenienti dai vigneti aventi nell['’]ambito aziendale almeno l['’](\d+(?:[,.]\d+)?)\s*% dei corrispondenti vitigni; (possono concorrere[\s\S]+)$/iu);
  if(list){
   const rows=compileNamedVineyardRows(`${list[1]}: minimo ${list[2]}%`);if(!rows||rows.length!==1)return null;
   const remainderOriginal=raw.match(/possono\s+concorrere[\s\S]+$/iu)?.[0],remainder=remainderOriginal&&compileComplementSentence(remainderOriginal);if(!remainder||remainder.max!==100-rows[0].min)return null;
   for(const sourceName of rows[0].names){const target=norm(`${scope.denomination} ${sourceName}`);if(seenTargets.has(target))return null;seenTargets.add(target);if(target===norm(scope.wineName)){if(!['bianco','rosso','rosato'].includes(scope.wineType)||raw!==definition.trim()||selected)return null;selected={basis:'vineyard',named:[{names:[sourceName],min:rows[0].min}],remainder,sourceRelation:'grapes-from-vineyard'};}}
   continue;
  }
  const choice=quoted.match(/^ (rosso passito|bianco passito|rosato) è riservata ai vini ottenuti dalle uve dei vitigni ([\p{L}'’ -]+) provenienti dai vigneti aventi nell['’]ambito aziendale almeno (?:il |l['’])(\d+(?:[,.]\d+)?)\s*% del corrispondente vitigno; (possono concorrere[\s\S]+)$/iu);
  if(choice){
   const targets=[norm(`${scope.denomination} ${choice[1]}`)];if(targets.some(t=>seenTargets.has(t)))return null;targets.forEach(t=>seenTargets.add(t));
   const names=choice[2].split(/\s+o\s+/i);if(names.length<2||names.some(name=>!compileNamedVineyardRows(`${name}: minimo ${choice[3]}%`)))return null;
   const remainder=compileComplementSentence(raw.match(/possono\s+concorrere[\s\S]+$/iu)?.[0]||'');if(!remainder||remainder.max!==100-Number(choice[3].replace(',','.'))||new Set(names.map(norm)).size!==names.length)return null;
   if(targets.includes(norm(scope.wineName))){
    if(!alternativesOnly||selected||raw!==definition.trim()||norm(scope.wineType.replace(/\s*\/\s*/g,' '))!==norm(choice[1]))return null;
    selected=names.map(name=>({basis:'vineyard',named:[{names:[name],min:Number(choice[3].replace(',','.'))}],remainder,sourceRelation:'grapes-from-vineyard'}));
   }
   continue;
  }
  const unqualified=quoted.match(/^ senza alcuna specificazione è riservata al vino rosso o bianco ottenuto da uve provenienti da vigneti composti in ambito aziendale da uno o più vitigni a bacca di colore analogo non aromatici, idonei alla coltivazione nella Regione ([\p{L}'’ -]+) ed iscritti nel Registro Nazionale delle varietà di vite per uve da vino, approvato con D\.M\. \d+ [\p{L}]+ \d{4} e successivi aggiornamenti, riportati nell['’]allegato \d+ del presente disciplinare[. ]*$/iu);
  if(unqualified){if(!regionNameValid(unqualified[1]))return null;for(const color of ['rosso','bianco']){const target=norm(`${scope.denomination} ${color}`);if(seenTargets.has(target)||target===norm(scope.wineName))return null;seenTargets.add(target);}continue;}
  return null;
 }
 return alternativesOnly?(Array.isArray(selected)?selected:null):selected;
}

function compileGeographicFamily(context,definition,scope){
 if(context.trim()!==definition.trim())return null;
 const text=flat(definition).replace(/^Art(?:icolo|\.)\s*2\s*[-–]?\s*Base ampelografica\s*/i,'');
 const simple=text.match(/^La denominazione di origine controllata [«“"]([^»”"]+)[»”"] con riferimento alla sottozona [«“"]([^»”"]+)[»”"] è riservata al vino ottenuto da uve provenienti da vigneti aventi in ambito aziendale la seguente composizione ampelografica: ([\s\S]+?); (possono concorrere[\s\S]+)$/iu);
 if(simple){
  if(norm(simple[1])!==norm(scope.denomination)||norm(`${simple[1]} ${simple[2]}`)!==norm(scope.wineName))return null;
  const named=compileNamedVineyardRows(simple[3]),remainder=compileComplementSentence(definition.match(/possono\s+concorrere[\s\S]+$/iu)?.[0]||'');
  return named&&remainder?{basis:'vineyard',named,remainder,sourceRelation:'grapes-from-vineyard'}:null;
 }
 const group=text.match(/^I vini designati (.+?) seguiti dalla specificazione aggiuntiva della sottozona [«“"]([^»”"]+)[»”"] devono essere ottenuti da uve provenienti da vigneti composti per non meno del (\d+(?:[,.]\d+)?)\s*% dal vitigno ([\p{L}'’ -]+) e per il restante (\d+(?:[,.]\d+)?)\s*% provenienti da vitigni a bacca (bianca|nera|rossa) (aromatici|non aromatici) idonei alla coltivazione nella Regione ([\p{L}'’ -]+)\.$/iu);if(!group)return null;
 const titles=group[1].split(/,\s*|\s+e\s+(?=[«“"])/).map(s=>s.trim());
 if(titles.some(title=>! /^(?:[«“"][^»”"]+[»”"])(?: o [«“"][^»”"]+[»”"])?(?: spumante(?: metodo classico \(metodo tradizionale\))?| vendemmia tardiva)?$/.test(title)))return null;
 if(![...group[1].matchAll(/[«“"]([^»”"]+)[»”"]/g)].some(m=>norm(m[1])===norm(scope.denomination)))return null;
 const match=scope.wineName.match(/^(.+?) con la specificazione [«“"]([^»”"]+)[»”"]$/u);if(!match||norm(match[2])!==norm(group[2])||titles.filter(title=>norm(title)===norm(match[1])).length!==1)return null;
 const named=compileNamedVineyardRows(`${group[4]}: minimo ${group[3]}%`),max=Number(group[5].replace(',','.'));if(!regionNameValid(group[8])||!named||max!==100-named[0].min)return null;
 const original=definition.match(/e\s+per\s+il\s+restante[\s\S]+$/iu)?.[0];if(!original)return null;
 return {basis:'vineyard',named,remainder:{original,max,requirements:[{kind:'berry-color',color:group[6]},{kind:'aromatic-classification',value:group[7].toLowerCase()==='non aromatici'?'non-aromatic':'aromatic'},{kind:'regional-eligibility',region:group[8]}]},sourceRelation:'grapes-from-vineyard'};
}

function compileGeographicHeadingRows(context,definition,scope){
 const article=context.replace(/^\s*Art(?:icolo|\.)\s*2\.?\s+Base ampelografica\s*/i,'');
 const opening=article.match(/^[\s\S]+?composizione\s+ampelografica:\s*/i);if(!opening)return null;
 const intro=flat(opening[0]).match(/^\d+\. I vini a Denominazione di Origine Controllata [“"«]\s*([^”"»]+)[”"»] ([\p{L}'’ -]+), devono essere ottenuti dalle uve provenienti da vigneti aventi in ambito aziendale la seguente composizione ampelografica:$/iu);if(!intro||norm(intro[1])!==norm(scope.denomination))return null;
 const subzone=intro[2],rest=article.slice(opening[0].length),pattern=new RegExp(`(?:^|\\n)${escape(subzone.toUpperCase())}[^\\n]*`,'gu'),heads=[...rest.matchAll(pattern)];if(!heads.length||heads[0].index!==0)return null;
 let selected=null;const targets=[];
 for(const [i,head] of heads.entries()){
  const original=rest.slice(head.index,heads[i+1]?.index??rest.length).trim(),heading=head[0].trim();
  const labels=heading.split(/\s+e\s+/i);if(labels.some(label=>!label.startsWith(subzone.toUpperCase()+' ')||! /^[\p{L}'’ -]+$/u.test(label)))return null;
  const localTargets=labels.map(label=>norm(`${scope.denomination} ${label}`));if(localTargets.some(t=>targets.includes(t)))return null;targets.push(...localTargets);
  const body=original.slice(heading.length).trim(),compiled=recipe(body);if(!compiled||compiled.closed)return null;
  if(localTargets.includes(norm(scope.wineName))){if(selected||original!==definition.trim())return null;selected=compiled;}
 }
 return selected;
}

function compileSectionedHeadingFamily(context,definition,scope,closedOnly=false){
 const article=context.replace(/^\s*Art(?:icolo|\.)\s*2\.?\s+Base ampelografica\s*/i,'');
 const starts=[...article.matchAll(/(?:^|\n)\s*\d+\.\s*(?=La denominazione)/g)];if(!starts.length||starts[0].index!==0)return null;
 const seen=new Set();let selected=null,headed=false;
 const register=labels=>{const targets=labels.map(label=>norm(`${scope.denomination} ${label}`));if(targets.some(t=>seen.has(t)))return null;targets.forEach(t=>seen.add(t));return targets;};
 for(const [i,start] of starts.entries()){
  const raw=article.slice(start.index,starts[i+1]?.index??article.length).trim(),text=flat(raw);
  const intro=text.match(/^\d+\.\s*La denominazione di origine controllata [«“"]([^»”"]+)[»”"] (.+?) e['’] riservata ai vini ottenuti da uve(.+?): (.+)$/iu);if(!intro||norm(intro[1])!==norm(scope.denomination))return null;
  if(intro[2]==='seguita da una delle specificazioni di cui appresso,'){
   if(headed||intro[3]!==' di vigneti aventi, in ambito aziendale, la seguente composizione ampelografica')return null;headed=true;
   const pre=raw.match(/composizione\s+ampelografica:\s*/i);const rest=raw.slice(pre.index+pre[0].length);
   const heads=[...rest.matchAll(/(?:^|\n)([\p{L}][\p{L}'’ , -]*):\s*\n/gu)];if(!heads.length||heads[0].index!==0)return null;
   for(const [j,head] of heads.entries()){
    const original=rest.slice(head.index,heads[j+1]?.index??rest.length).trim();const labels=head[1].split(/,\s*|\s+e\s+/),targets=register(labels);if(!targets)return null;
    const compiled=recipe(original.slice(head[1].length+1).trim());if(!compiled)return null;
    if(targets.some(target=>target===norm(scope.wineName)||target.replace(/ (riserva|superiore|novello)$/,'$1')===norm(scope.wineName))||(closedOnly&&norm(scope.wineName)===norm(scope.denomination+' Moscato')&&labels.length===1&&/^Moscato (bianco|giallo)$/i.test(labels[0])&&heads.filter(h=>/^Moscato\s/i.test(h[1])).length===1)){if(selected||Boolean(compiled.closed)!==closedOnly||(original!==definition.trim()&&raw!==definition.trim()))return null;selected=compiled;if(closedOnly&&compiled.named[0].names[0]==='Moscato'&&heads.filter(h=>/^Moscato\s/i.test(h[1])).length===1&&labels.length===1&&/^Moscato (bianco|giallo)$/i.test(labels[0]))selected={...compiled,sourceNamed:compiled.named,named:[{...compiled.named[0],names:[labels[0]]}]};}
   }
   continue;
  }
  const title=intro[2].match(/^(?:con la specificazione|seguita dalla indicazione) (.+)$/iu);if(!title)return null;
  const labels=title[1].replace(/[«»“”"]/g,'').split(/,\s*|\s+e\s+/).map(x=>x.trim()).filter(Boolean);if(labels.some(x=>! /^[\p{L}'’ -]+$/u.test(x)))return null;
  const targets=register(labels);if(!targets||targets.includes(norm(scope.wineName)))return null;
  if(!/^(?:, non aromatiche, provenienti dai vigneti aventi in ambito aziendale la seguente composizione ampelografica| a bacca nera(?:, non aromatiche,|) provenienti dai seguenti vitigni, presenti in ambito aziendale)$/.test(intro[3]))return null;
  if(!compileNamedVineyardRows(`${intro[4].replace(/\.$/,'')}: minimo 0%`))return null;
 }
 return headed?selected:null;
}

function compileNumberedNamedFamily(context,definition,scope){
 const article=context.replace(/^\s*Art(?:icolo|\.)\s*2\.?\s+Base ampelografica\s*/i,'');
 const starts=[...article.matchAll(/(?:^|\n)\s*\d+\.\s*(?=La denominazione)/g)];if(!starts.length||starts[0].index!==0)return null;
 const seen=new Set();let selected=null,hasNamed=false;
 const bind=(labels,raw,compiled)=>{for(const label of labels){const target=norm(`${scope.denomination} ${label}`);if(seen.has(target))return false;seen.add(target);if(target===norm(scope.wineName)){if(selected||raw!==definition.trim()||!compiled)return false;selected=compiled;}}return true;};
 for(const [i,start] of starts.entries()){
  const raw=article.slice(start.index,starts[i+1]?.index??article.length).trim(),text=flat(raw),prefix=text.match(/^\d+\. La denominazione di origine controllata [«“"]([^»”"]+)[»”"] (.+)$/iu);if(!prefix||norm(prefix[1])!==norm(scope.denomination))return null;
  const rest=prefix[2];
  const unnamed=rest.match(/^senza alcuna specificazione è riservata al vino bianco o rosso ottenuto da uve provenienti da vigneti composti da uno o più vitigni a bacca di colore analogo, non aromatici, idonei alla coltivazione nella regione ([\p{L}'’ -]+), iscritti nel Registro Nazionale delle varietà di vite per uve da vino, riportati nell['’]allegato \d+ del presente disciplinare\.$/iu);
  if(unnamed){if(!regionNameValid(unnamed[1])||!bind(['bianco','rosso'],raw,null))return null;continue;}
  const geographic=rest.match(/^accompagnata dalla menzione geografica [«“"]([^»”"]+)[»”"] e seguita dalla specificazione ([\p{L}'’ -]+) è riservata al vino ottenuto da uve provenienti dai vigneti composti per almeno l['’](\d+(?:[,.]\d+)?)% dal vitigno ([\p{L}'’ -]+); (possono concorrere[\s\S]+)$/iu);
  if(geographic){const named=compileNamedVineyardRows(`${geographic[4]} minimo ${geographic[3]}%`),remainder=compileComplementSentence(raw.match(/possono\s+concorrere[\s\S]+$/iu)?.[0]||'');if(!named||!remainder||!bind([`${geographic[1]} ${geographic[2]}`],raw,{basis:'vineyard',named,remainder,sourceRelation:'grapes-from-vineyard'}))return null;continue;}
  const heading=rest.match(/^seguita da una delle specificazioni di cui appresso, è riservata ai vini ottenuti da uve di vigneti aventi, rispettivamente, la seguente composizione varietale: /iu);if(!heading||hasNamed)return null;hasNamed=true;
  const offset=raw.match(/composizione\s+varietale:\s*/iu),rows=raw.slice(offset.index+offset[0].length),heads=[...rows.matchAll(/(?:^|\n)([\p{L}][\p{L}'’ -]*):\s*\n/gu)];if(!heads.length||heads[0].index!==0)return null;
  for(const [j,head] of heads.entries()){
   const row=rows.slice(head.index,heads[j+1]?.index??rows.length).trim(),body=row.slice(head[1].length+1).trim(),split=body.match(/possono\s+concorrere/iu);if(!split)return null;
   const named=compileNamedVineyardRows(body.slice(0,split.index).replace(/,?\s*da soli o congiuntamente\s*/iu,' ')),remainder=compileComplementSentence(body.slice(split.index));if(!named||!remainder)return null;
   const labels=[head[1],...head[1].split(/\s+o\s+/)].filter((x,i,a)=>a.indexOf(x)===i);if(!bind(labels,raw,{basis:'vineyard',named,remainder,sourceRelation:'grapes-from-vineyard'}))return null;
  }
 }
 return hasNamed?selected:null;
}

function compilePrefixNamedFamily(context,definition,scope){
 const article=context.replace(/^\s*Art(?:icolo|\.)\s*2\.?\s+Base ampelografi(?:ca|a)\s*/i,'');
 const parts=article.split(/\n(?=La (?:denominazione|tipologia) )/);if(parts.length<2)return null;
 let selected=null,hasNamed=false;const seen=new Set();
 const bind=(labels,raw,compiled)=>{for(const label of labels){const target=norm(`${scope.denomination} ${label}`);if(seen.has(target))return false;seen.add(target);if(target===norm(scope.wineName)){if(selected||!compiled||raw!==definition.trim())return false;selected=compiled;}}return true;};
 for(const part of parts){const raw=part.trim(),text=flat(raw),quoted=[...text.matchAll(/[«“"]([^»”"]+)[»”"]/g)];if(!quoted.length||quoted.some(m=>norm(m[1])!==norm(scope.denomination)))return null;
  const ordinary=text.match(/^La denominazione di origine controllata [«“"][^»”"]+[»”"], è riservata ai vini rossi e rosati ottenuti da uve provenienti da vigneti aventi nell['’]ambito aziendale la seguente composizione ampelografica: (.+?) da soli o congiuntamente minimo (\d+(?:[,.]\d+)?)%\. (Possono concorrere[\s\S]+)$/iu);
  if(ordinary){const named=compileNamedVineyardRows(`${ordinary[1]} minimo ${ordinary[2]}%`),remainder=compileComplementSentence(raw.match(/Possono\s+concorrere[\s\S]+$/u)?.[0]||'');if(!named||!remainder||!bind(['rosso','rosato'],raw,{basis:'vineyard',named,remainder,sourceRelation:'grapes-from-vineyard'}))return null;continue;}
  const namedIntro=text.match(/^La denominazione di origine controllata [«“"][^»”"]+[»”"] seguita da una delle specificazioni di cui appresso, è riservata ai vini ottenuti da uve di vigneti aventi, in ambito aziendale, rispettivamente, la seguente composizione: /iu);
  if(namedIntro){if(hasNamed)return null;hasNamed=true;const offset=raw.match(/seguente\s+composizione:\s*/iu),rows=raw.slice(offset.index+offset[0].length),heads=[...rows.matchAll(/(?:^|\n)([\p{L}][\p{L}'’ -]*): /gu)];if(!heads.length||heads[0].index!==0)return null;
   for(const [i,head] of heads.entries()){const row=rows.slice(head.index,heads[i+1]?.index??rows.length).trim(),body=flat(row.slice(head[1].length+1)),m=body.match(/^(?:per almeno (?:il |l['’])(\d+(?:[,.]\d+)?)% ([\p{L}'’ -]+)[;,]|(.+?), da soli o congiuntamente, per almeno l['’](\d+(?:[,.]\d+)?)%;) (per il complessivo rimanente[\s\S]+)$/iu);if(!m)return null;
    const min=Number((m[1]||m[4]).replace(',','.')),named=compileNamedVineyardRows(`${m[2]||m[3]} minimo ${min}%`),remainder=compileComplementSentence(row.match(/per\s+il\s+complessivo\s+rimanente[\s\S]+$/iu)?.[0]||'',{remainingMaximum:100-min});if(!named||!remainder||!bind([head[1]],raw,{basis:'vineyard',named,remainder,sourceRelation:'grapes-from-vineyard'}))return null;
   }continue;
  }
  // This local subzone is a positively separate scope. Its whole recipe must
  // still be consumed; unknown operative additions cannot be skipped.
  const special=text.match(/^La tipologia [«“"][^»”"]+[»”"] ([\p{L}'’ -]+) è riservata al vino rosso ottenuto dalle uve provenienti dai vigneti aventi nell['’]ambito aziendale limitatamente ai vigneti ricadenti nella tipologia [«“"][^»”"]+[»”"] ([\p{L}'’ -]+) la seguente composizione: (.+?), congiuntamente minimo (\d+(?:[,.]\d+)?)%\. Possono concorrere alla produzione di detto vino altri vitigni a bacca (bianca|nera|rossa|di colore analogo) non aromatici da soli o congiuntamente per un massimo del (\d+(?:[,.]\d+)?)% idonei alla coltivazione per la regione ([\p{L}'’ -]+)\.[. ]*$/iu);
  if(!special||norm(special[1])!==norm(special[2])||Number(special[4])+Number(special[6])!==100||(norm(scope.wineName)===norm(`${scope.denomination} ${special[1]}`)&&scope.wineType!=='rosso'))return null;
  const named=compileNamedVineyardRows(`${special[3]} minimo ${special[4]}%`),remainder=compileComplementSentence(`altri vitigni a bacca ${special[5]} non aromatici idonei alla coltivazione per la regione ${special[7]}: massimo ${special[6]}%.`);
  const rawGroup=raw.match(/seguente\s+composizione:\s*([\s\S]+?),\s*congiuntamente\s+minimo/u)?.[1],rawComplement=raw.match(/Possono\s+concorrere[\s\S]+$/u)?.[0];
  if(!named||!remainder||!rawGroup||!rawComplement||!bind([special[1]],raw,{basis:'vineyard',named,remainder:{...remainder,original:rawComplement},sourceRelation:'grapes-from-vineyard',registryTokenGroup:{original:rawGroup,region:special[7]}}))return null;
 }
 return hasNamed?selected:null;
}

// A separately written consumption heading can specialize an already
// declared qualification only where its color and qualification each share
// this exact same fully audited production row. It creates no new recipe.
function compileCharacteristicSpecialization(context,definition,scope,declaration,characteristics){
 if(typeof characteristics!=='string'||!fullyConsumedVarietalDeclarations(declaration,scope))return null;
 const suffix=norm(scope.wineName).slice(norm(scope.denomination).length+1),m=suffix.match(/^(bianco|rosso|rosato) (novello)$/u);
 if(!m||scope.wineType!==m[1]||norm(scope.wineName)!==norm(`${scope.denomination} ${m[1]} ${m[2]}`))return null;
 const labels=declarationLines(declaration).map(line=>line.trim().match(/^[«“”"]([^»”"]+)[»”"] ([\p{L}'’ -]+)[;.]?$/u)).filter(Boolean).filter(row=>norm(row[1])===norm(scope.denomination)).map(row=>norm(row[2]));
 if(labels.includes(suffix)||labels.filter(s=>s===m[1]).length!==1||labels.filter(s=>s===m[2]).length!==1)return null;
 const starts=[...characteristics.matchAll(/(?:^|\n)[ \t]*[«“”"][^»”"]+[»”"][^\n]*\n(?=(?:colore|Colore)\s*:)/gu)];
 const blocks=starts.map((head,i)=>characteristics.slice(head.index,starts[i+1]?.index??characteristics.length).trim());
 const selected=blocks.filter(block=>norm(block.split('\n')[0])===norm(scope.wineName));if(selected.length!==1)return null;
 const body=selected[0].split('\n').slice(1).join('\n');
 if(!/^colore:[^;\n]+;?\nodore:[^;\n]+;\nsapore:[^;\n]+;\ntitolo alcolometrico volumico totale minimo: \d+(?:[,.]\d+)?% vol;\nacidità totale minima: \d+(?:[,.]\d+)? g\/l;\nestratto non riduttore minimo: \d+(?:[,.]\d+)? g\/l\.$/u.test(body)||characteristicColor(body)!==m[1])return null;
 const qualification=compileScopedOptionalComplementDefinition(context,definition,{...scope,wineName:`${scope.denomination} ${m[2]}`}),color=compileScopedOptionalComplementDefinition(context,definition,{...scope,wineName:`${scope.denomination} ${m[1]}`});
 if(!qualification||!color||JSON.stringify(qualification)!==JSON.stringify(color))return null;
 return {...qualification,characteristicSpecialization:{parentWineName:`${scope.denomination} ${m[2]}`,characteristics:selected[0]}};
}
export function compileDeclaredOptionalComplementDefinition(context,definition,scope,declaration,characteristics){
 const colorFamily=compileDeclaredColorFamily(context,definition,scope,declaration,characteristics);if(colorFamily)return colorFamily;
 const specialization=compileCharacteristicSpecialization(context,definition,scope,declaration,characteristics);if(specialization)return specialization;
 const referenced=compileArticleOneReferenceDefinition(context,definition,scope,declaration);if(referenced)return referenced;
 if(!fullyConsumedVarietalDeclarations(declaration,scope)&&!reviewedDeclaredSourceHash(context,declaration,scope))return null;
 if(declaredShortMoscatoScope(declaration,scope)) {
  const named=flat(definition).match(/specificazioni di vitigno:\s*([\s\S]+?),\s*(?:è|e') riservata/iu)?.[1];
  if(!named)return null;
  const names=named.split(/;\s*/).map(n=>n.trim()).filter(n=>/^Moscato\s+[\p{L}]+$/iu.test(n));
  if(names.length!==1)return null;
  return compileExtendedCorrespondingFamily(context,definition,{...scope,wineName:scope.denomination+' '+names[0]});
 }
 const parents=declaredVarietalParents(declaration,scope);if(parents.length!==1)return null;
 const parent=parents[0],outside=context.replace(definition,'');
 if(norm(outside).includes(norm(scope.wineName)))return null;
 // A color/method-wide recipe is a competing child predicate, even when the
 // selected definition happens to be the ordinary varietal paragraph. Select
 // that branch before considering a generic parent; never inherit its minimum.
 if(parent.dimension==='passito'){
  const color=parent.wineType;if(!['bianco','rosso'].includes(color))return null;
  const passitoScope={...scope,wineName:scope.denomination+' '+color+' passito',wineType:color+' / passito'};
  const specific=compileScopedOptionalComplementAlternatives(context,definition,passitoScope);
  const selected=specific?.filter(c=>c.named.length===1&&c.named[0].names.length===1&&norm(c.named[0].names[0])===norm(parent.principal));
  if(selected?.length===1)return selected[0];
  const hasOverride=[...context.matchAll(/(?:^|\n)\s*\d+\.\s+La denominazione /g)].some((start,i,starts)=>{
   const raw=context.slice(start.index,starts[i+1]?.index??context.length).trim();
   return Boolean(compileScopedOptionalComplementAlternatives(context,raw,passitoScope));
  });
  if(hasOverride)return null;
 }
 const baseScope={...scope,wineName:parent.wineName,wineType:parent.wineType};
 const extended=/seguita da una delle seguenti\s+specificazioni di vitigno/i.test(context);
 const compiled=extended?compileExtendedCorrespondingFamily(context,definition,{...baseScope,wineType:scope.wineType}):compileScopedOptionalComplementDefinition(context,definition,baseScope);
 if(compiled&&compiled.named.length===1&&compiled.named[0].names.length===1&&norm(compiled.named[0].names[0])===norm(parent.principal))return compiled;
 return null;
}

function compileNationalCorrespondingFamily(context,definition,scope){
 const article=context.replace(/^\s*Art(?:icolo|\.)\s*2\.?\s+Base ampelografica\s*/i,'');
 const starts=[...article.matchAll(/(?:^|\n)\d+\. La denominazione /g)];if(starts.length!==2||starts[0].index!==0)return null;
 const parts=starts.map((m,i)=>article.slice(m.index,starts[i+1]?.index??article.length).trim());let selected=null;
 const first=flat(parts[0]).match(/^\d+\. La denominazione di origine controllata [«“"]([^»”"]+)[»”"] è riservata al vino rosso ottenuto da uve provenienti da vigneti aventi nell['’]ambito aziendale la seguente composizione ampelografica: (.+?) da soli o congiuntamente: minimo (\d+(?:[,.]\d+)?)%; altri vitigni a bacca (bianca|nera|rossa), non aromatici, da soli o congiuntamente, per il restante (\d+(?:[,.]\d+)?)% iscritti nel Registro Nazionale delle varietà di vite per uve da vino, approvato con D\.M\. \d+ [\p{L}]+ \d{4} e successivi aggiornamenti\.$/iu);
 if(!first||norm(first[1])!==norm(scope.denomination)||Number(first[3])+Number(first[5])!==100)return null;
 const named=compileNamedVineyardRows(`${first[2]} minimo ${first[3]}%`),original=parts[0].match(/altri\s+vitigni[\s\S]+$/iu)?.[0];if(!named||!original)return null;
 if(norm(scope.wineName)===norm(`${scope.denomination} rosso`)){if(parts[0]!==definition.trim())return null;selected={basis:'vineyard',named,remainder:{original,max:Number(first[5]),requirements:[{kind:'berry-color',color:first[4]},{kind:'aromatic-classification',value:'non-aromatic'},{kind:'national-registration'}]},sourceRelation:'grapes-from-vineyard'};}
 const second=compileCorrespondingVineyardParagraph(parts[1]);if(!second||norm(second.denomination)!==norm(scope.denomination))return null;
 for(const name of second.names)if(norm(scope.wineName)===norm(`${scope.denomination} ${name}`)){if(selected||parts[1]!==definition.trim())return null;selected={basis:'vineyard',named:[{names:[name],min:second.min}],remainder:second.remainder,sourceRelation:'grapes-from-vineyard'};}
 return selected;
}

function compileListedCorrespondingFamily(context,definition,scope){
 const article=context.replace(/^\s*Art(?:icolo|\.)\s*2\.?\s+Base ampelografica\s*/i,'');
 const starts=[...article.matchAll(/(?:^|\n)\d+\. La denominazione /g)];if(starts.length!==3||starts[0].index!==0)return null;
 const parts=starts.map((m,i)=>article.slice(m.index,starts[i+1]?.index??article.length).trim());
 const first=flat(parts[0]).match(/^\d+\. La denominazione di origine controllata [«“"]([^»”"]+)[»”"] senza alcuna specificazione è riservata ai vini rosso, rosso novello, rosato, rosato spumante ottenuti da uve provenienti da vigneti aventi in ambito aziendale la seguente composizione ampelografica: (.+?), da soli o congiuntamente minimo (\d+(?:[,.]\d+)?)%\. (Possono concorrere[\s\S]+)$/iu);
 if(!first||norm(first[1])!==norm(scope.denomination))return null;
 const identityClaims=[];
 const firstNames=first[2].replace(/([\p{Lu}][\p{L}'’ -]*?) \(detta ([\p{Lu}][\p{L}'’ -]*)\)/gu,(whole,canonicalName,alias)=>{if(!compileNamedVineyardRows(`${canonicalName} minimo 0%`)||!compileNamedVineyardRows(`${alias} minimo 0%`))return whole;identityClaims.push({kind:'source-local-designation',canonicalName,alias});return canonicalName;});
 const firstNamed=compileNamedVineyardRows(`${firstNames} minimo ${first[3]}%`),firstRemainder=compileComplementSentence(parts[0].match(/Possono\s+concorrere[\s\S]+$/u)?.[0]||'');
 if(!firstNamed||!firstRemainder||Number(first[3])+firstRemainder.max!==100)return null;
 const second=flat(parts[1]).match(/^\d+\. La denominazione di origine controllata [«“"]([^»”"]+)[»”"] senza alcuna specificazione è riservata al vino bianco e bianco spumante ottenuto da uve provenienti da vigneti aventi in ambito aziendale la seguente composizione ampelografica: 100% ([\p{L}'’ -]+)\.$/iu);if(!second||norm(second[1])!==norm(scope.denomination)||!compileNamedVineyardRows(`${second[2]} minimo 100%`))return null;
 const third=flat(parts[2]).match(/^\d+\. La denominazione di origine controllata [«“"]([^»”"]+)[»”"] con la specificazione di uno dei seguenti vitigni: (.+?) è riservata ai vini ottenuti dalle uve provenienti dai vigneti costituiti per almeno l['’](\d+(?:[,.]\d+)?)% dai corrispondenti vitigni\. (Possono concorrere[\s\S]+)$/iu);if(!third||norm(third[1])!==norm(scope.denomination))return null;
 const listText=parts[2].match(/seguenti\s+vitigni:\s*([\s\S]+?)\s+è riservata/u)?.[1],names=listText?.split('\n').map(s=>s.trim()).filter(Boolean);if(!names?.length||new Set(names.map(norm)).size!==names.length||names.some(name=>!compileNamedVineyardRows(`${name} minimo 0%`)))return null;
 const remainder=compileComplementSentence(parts[2].match(/Possono\s+concorrere[\s\S]+$/u)?.[0]||'');if(!remainder||Number(third[3])+remainder.max!==100)return null;
 if(parts[0]===definition.trim()&&['rosso','rosso novello','rosato','rosato spumante'].some(label=>norm(scope.wineName)===norm(`${scope.denomination} ${label}`)))return {basis:'vineyard',named:firstNamed,remainder:firstRemainder,sourceRelation:'grapes-from-vineyard',...(identityClaims.length?{identityClaims}:{})};
 const principal=names.filter(name=>norm(scope.wineName)===norm(`${scope.denomination} ${name}`));if(parts[2]!==definition.trim()||principal.length!==1)return null;
 return {basis:'vineyard',named:[{names:principal,min:Number(third[3])}],remainder,sourceRelation:'grapes-from-vineyard'};
}

function compileArticleOneReferenceDefinition(context,definition,scope,declaration){
 if(context!==definition||typeof declaration!=='string')return null;
 const text=flat(definition).replace(/^Art(?:icolo|\.)\s*2\s+Base ampelografica\s*/i,'');
 const m=text.match(/^La denominazione di cui all['’]art\. 1 è riservata ai vini rossi, rosati e passiti ottenuti dalle uve provenienti da vigneti composti nell['’]ambito aziendale per almeno il (\d+(?:[,.]\d+)?)% dal vitigno ([\p{L}'’ -]+); possono concorrere inoltre fino al (\d+(?:[,.]\d+)?)%, da soli o congiuntamente , le uve provenienti dai vitigni (.+?) e altri vitigni aromatici idonei alla coltivazione per la regione ([\p{L}'’ -]+) \.$/iu);
 const all=text.match(/^1\.\s*I vini di cui all['’]art\.\s*1, nelle loro diverse tipologie, devono essere ottenuti da uve provenienti da vigneti composti per non meno del (\d+(?:[,.]\d+)?)% dal vitigno ([\p{L}'’ -]+) e per il restante (\d+(?:[,.]\d+)?)% provenienti da vitigni idonei alla coltivazione nella Regione ([\p{L}'’ -]+)\.$/iu);
 if(!m&&!all)return null;
 const matched=m||all;
 const named=compileNamedVineyardRows(`${matched[2]} minimo ${matched[1]}%`),aux=m?compileNamedVineyardRows(`${m[4]} minimo 0%`)?.[0]?.names:[],max=Number(matched[3].replace(',','.'));if(!regionNameValid(m?m[5]:all[4])||!named||named[0].names.length!==1||!aux||Number(matched[1].replace(',','.'))+max!==100)return null;
 const article=declaration.replace(/^\s*Art(?:icolo|\.)\s*1\s+Denominazione e vini\s*/i,''),intro=article.match(all?/^([\s\S]+?presente\s+disciplinare\s+di\s+produzione\s+per\s+le\s+seguenti\s+tipologie):\s*/u:/^([\s\S]+?presente disciplinare di produzione):\s*/u);if(!intro)return null;
 const opening=flat(intro[1]).match(all?/^1\. La denominazione di origine controllata e garantita (.+?) è riservata ai vini che rispondono ai requisiti stabiliti nel presente disciplinare di produzione per le seguenti tipologie$/u:/^La denominazione di origine controllata (.+?) è riservata ai vini che rispondono alle condizioni ed ai requisiti stabiliti dal presente disciplinare di produzione$/u);if(!opening)return null;
 const aliasPattern='[«“"][^»”"]+[»”"](?: o [«“"][^»”"]+[»”"])*';
 if(!new RegExp(`^${aliasPattern}$`,'u').test(opening[1])||![...opening[1].matchAll(/[«“"]([^»”"]+)[»”"]/g)].some(q=>norm(q[1])===norm(scope.denomination)))return null;
 const rows=article.slice(intro[0].length).split(/\n(?=[«“"])/).map(flat).filter(Boolean),targets=[],targetMethods=[];
 for(const row of rows){const r=row.match(new RegExp(`^(${aliasPattern})(?: (spumante|passito))? ?\\.?$`,'iu'));if(!r||norm(r[1])!==norm(opening[1]))return null;const title=r[1].replace(/^[«“"][^»”"]+[»”"]/,scope.denomination),method=r[2]?' '+r[2]:'';const variants=[norm(r[1]+method),norm(title+method)];if(r[2]){const aliases=[...r[1].matchAll(/[«“"]([^»”"]+)[»”"]/g)].map(q=>q[1]);aliases[0]=scope.denomination;variants.push(norm(aliases.map(alias=>alias+method).join(' o ')));}targets.push([...new Set(variants)]);targetMethods.push((r[2]||'').toLowerCase());}
 if(all&&new Set(targets.flat()).size!==targets.flat().length)return null;
 if(targets.filter(variants=>variants.includes(norm(scope.wineName))).length!==1)return null;
 if(all){const selected=targets.findIndex(v=>v.includes(norm(scope.wineName))),parts=String(scope.wineType||'').toLowerCase().split(/\s*\/\s*/);if(parts.some(p=>!['bianco','rosso','rosato','spumante','passito'].includes(p))||parts.filter(p=>['bianco','rosso','rosato'].includes(p)).length!==1||parts.filter(p=>['spumante','passito'].includes(p)).join(' ')!==targetMethods[selected])return null;}
 if(all){const original=definition.match(/e\s+per\s+il\s+restante[\s\S]+$/iu)?.[0];if(!original)return null;return {basis:'vineyard',named,remainder:{original,max,requirements:[{kind:'regional-eligibility',region:all[4]}]},sourceRelation:'grapes-from-vineyard'};}
 const original=definition.match(/possono\s+concorrere[\s\S]+$/u)?.[0];if(!original)return null;
 return {basis:'vineyard',named,remainder:{original,max,requirements:[{kind:'named-complement-alternatives',names:aux},{kind:'aromatic-classification',value:'aromatic',appliesTo:'other-complement-varieties'},{kind:'regional-eligibility',region:m[5],appliesTo:'other-complement-varieties'}]},sourceRelation:'grapes-from-vineyard'};
}

export function compileScopedClosedVineyardDefinition(context,definition,scope){
 if(typeof context!=='string'||typeof definition!=='string'||context.split(definition).length!==2)return null;
 const compiled=compileSectionedHeadingFamily(context,definition,scope,true);
 return compiled?.closed?compiled:null;
}
