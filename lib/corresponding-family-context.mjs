import {compileNamedVineyardRows,compileComplementSentence,compileWhiteVinifiedComplementDefinition} from './source-domain-definition.mjs';
import {compileOrderedTwoVarietyDefinition} from './ordered-two-variety.mjs';
const norm=value=>String(value).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[«»“”"'’‘]/g,' ').replace(/\s+/g,' ').trim();
const flat=value=>value.replace(/\s+/g,' ').trim();
const num=value=>Number(value.replace(',','.'));
const listNames=value=>compileNamedVineyardRows(`${value.replace(/;\s*/g,', ')}: minimo 0%`)?.[0]?.names;
const sourceResult=(names,min,remainder)=>({basis:'vineyard',named:[{names,min}],remainder,sourceRelation:'grapes-from-vineyard'});
/** Full closure for a corresponding-variety Article2 family with explicit
 * ordinary, sparkling, exactly-two-variety and administrative sibling scopes. */
export function compileExtendedCorrespondingFamily(context,definition,scope,{declaredColorMethod=false}={}){
 const body=context.replace(/^\s*Art(?:icolo|\.)\s*2\.?\s+Base ampelografica\s*/i,'');
 const starts=[...body.matchAll(/(?:^|\n)\s*\d+\.\s+(?=[\p{L}])/gu)];if(!starts.length||starts[0].index!==0)return null;
 const sections=starts.flatMap((m,i)=>body.slice(m.index,starts[i+1]?.index??body.length).trim().split(/\n(?=(?:La denominazione di origine controllata|I vini spumanti e frizzanti)\b)/));
 let selected=null,selectedName=null;const replacementGroups=new Map(),methodExclusions=[],seen=new Set();let familyFound=false;
 const record=(raw,label,compiled)=>{const target=norm(`${scope.denomination} ${label}`);if(seen.has(target))return false;seen.add(target);if(target===norm(scope.wineName)){if(selected||flat(raw)!==flat(definition))return false;selected=compiled;selectedName=label;}return true;};
 for(const raw of sections){
  const text=flat(raw).replace(/^\d+\.\s*/,'');
  const quotes=[...text.matchAll(/[«“"]([^»”"]+)[»”"]/g)];if(quotes.length&&!quotes.some(m=>norm(m[1])===norm(scope.denomination)))return null;
  const generic=text.match(/^La denominazione d['’]origine controllata [«“"]([^»”"]+)[»”"] seguita da una delle seguenti specificazioni di vitigno: (.+?), (?:è|e') riservata ai vini ottenuti da uve di vigneti composti dai corrispondenti vitigni per almeno l['’](\d+(?:[,.]\d+)?)\s*%; (possono concorrere[\s\S]+)$/iu);
  if(generic){
   if(familyFound||norm(generic[1])!==norm(scope.denomination))return null;familyFound=true;
   const names=listNames(generic[2]),min=num(generic[3]),remainder=compileComplementSentence(raw.match(/possono\s+concorrere[\s\S]+$/iu)?.[0]||'',{remainingMaximum:100-min});if(!names||!remainder||min<0||min>100)return null;
   for(const name of names)if(!record(raw,name,sourceResult([name],min,remainder)))return null;
   continue;
  }
  const basic=text.match(/^La denominazione d['’]origine controllata [«“"]([^»”"]+)[»”"] (bianco|rosso|rosato) è riservata al vino ottenuto da uve provenienti da vigneti aventi in ambito aziendale la seguente composizione ampelografica: (.+?) da soli o congiuntamente per almeno (\d+(?:[,.]\d+)?)\s*%\s*; (per la restante parte,[\s\S]+)$/iu);
  if(basic){if(norm(scope.wineName)===norm(`${scope.denomination} ${basic[2]}`)&&/spumante/i.test(scope.wineType)&&!declaredColorMethod)return null;const names=listNames(basic[3]),min=num(basic[4]),remainder=compileComplementSentence(raw.match(/per\s+la\s+restante\s+parte,[\s\S]+$/iu)?.[0]||'',{remainingMaximum:100-min});if(!names||!remainder||norm(basic[1])!==norm(scope.denomination))return null;if(!record(raw,basic[2],sourceResult(names,min,remainder)))return null;continue;}
  const exclusive=text.match(/^La denominazione di origine controllata [«“"]([^»”"]+)[»”"] ([\p{L}'’ -]+ passito) è riservata ai vini ottenuti da uve di vigneti composti dal vitigno ([\p{L}'’ -]+) per il 100%\.$/iu);
  if(exclusive){if(norm(exclusive[1])!==norm(scope.denomination)||!listNames(exclusive[3])||norm(scope.wineName)===norm(`${scope.denomination} ${exclusive[2]}`))return null;continue;}
  const two=compileOrderedTwoVarietyDefinition(raw);if(two){if(norm(two.denomination)!==norm(scope.denomination)||/due vitigni/i.test(scope.wineName))return null;continue;}
  const process=compileWhiteVinifiedComplementDefinition(raw);if(process){if(/spumante|frizzante/i.test(scope.wineType))methodExclusions.push(...process.named.flatMap(row=>row.names));continue;}
  const replacements=text.split(/; per la produzione del vino /i);
  if(replacements.length===2&&/^Per la produzione del vino /i.test(text)){
   for(const [i,clause] of replacements.entries()){const m=(i?`Per la produzione del vino ${clause}`:clause).match(/^Per la produzione del vino [«“"]([^»”"]+)[»”"] ([\p{L}'’ -]+) possono concorrere, congiuntamente o disgiuntamente, le uve delle varietà ([\p{L}'’ ,.-]+)\.?$/iu);if(!m||norm(m[1])!==norm(scope.denomination))return null;const members=listNames(m[3].replace(/\.$/,''));if(!members||members.length<2||new Set(members.map(norm)).size!==members.length||replacementGroups.has(norm(m[2])))return null;replacementGroups.set(norm(m[2]),members);}continue;
  }
  const sparkling=text.match(/^Nell['’]ambito dei vini spumanti, la denominazione di origine controllata [«“"]([^»”"]+)[»”"] senza alcuna menzione aggiuntiva (?:è|e') riservata al vino spumante ottenuto dalle uve provenienti dai vigneti composti dalle seguenti varietà di viti ([\s\S]+?)\s*\.\s*per almeno (\d+(?:[,.]\d+)?)\s*%; (per la restante parte,[\s\S]+)$/iu);
  if(sparkling){const names=listNames(sparkling[2].replace(/e\/o(?=[\p{L}])/gu,'e/o ')),min=num(sparkling[3]),remainder=compileComplementSentence(raw.match(/per\s+la\s+restante\s+parte,[\s\S]+$/iu)?.[0]||'',{remainingMaximum:100-min});if(!names||!remainder||norm(sparkling[1])!==norm(scope.denomination)||norm(scope.wineName)===norm(`${scope.denomination} spumante`))return null;if(declaredColorMethod&&norm(scope.wineName)===norm(scope.denomination)){if(!record(raw,'',sourceResult(names,min,remainder)))return null;}continue;}
  const special=text.match(/^Nell['’]ambito dei vini spumanti, la denominazione di origine controllata [«“"]([^»”"]+)[»”"] seguita da una delle specificazioni di vitigno: (.+?); è riservata ai vini spumanti ottenuti dalle uve provenienti dai vigneti costituiti dai rispettivi vitigni per almeno l['’](\d+(?:[,.]\d+)?)\s*%; possono concorrere per la restante parte i vitigni ([\p{L}'’ /-]+)\.$/iu);
  if(special){const names=listNames(special[2]),aux=listNames(special[4]);if(!names||!aux||num(special[3])<0||num(special[3])>100||norm(special[1])!==norm(scope.denomination))return null;if(/spumante/i.test(scope.wineType))methodExclusions.push(...names);continue;}
  const registration=/^Sono iscritti allo schedario viticolo, ai fini della rivendicazione dei vini a D\.O\.C\. [«“"][^»”"]+[»”"] di cui all['’]articolo 1, i vigneti iscritti allo schedario per le D\.O\.C\. e le D\.O\.C\.G\. le cui zone di produzione sono interamente comprese nell['’]area delimitata all['’]articolo 3, purché abbiano le caratteristiche rispondenti a quelle definite nel presente disciplinare e, in particolare, la composizione ampelografica compatibile\.$/iu.test(text);
  if(registration)continue;
  const claims=/^È['’] facoltà del conduttore degli stessi vigneti di cui al presente articolo all['’]atto della denuncia annuale delle uve, effettuare rivendicazioni anche per più denominazioni di origine per uve provenienti dallo stesso vigneto\. Nel caso di più rivendicazioni, di denominazioni di origine riferite a quote parti del raccolto di uve provenienti dallo stesso vigneto, la resa complessiva di uva per ettaro del vigneto non potrà superare il limite massimo più restrittivo tra quelli stabiliti dai disciplinari di produzione dei vini a DOC e DOCG rivendicati\.$/iu.test(text);
  if(claims)continue;
  return null;
 }
 if(!familyFound||!selected||methodExclusions.some(name=>norm(name)===norm(selectedName)))return null;
 const replacement=replacementGroups.get(norm(selectedName));
 if(replacement){if(selected.named.length!==1||selected.named[0].names.length!==1||norm(selected.named[0].names[0])!==norm(selectedName))return null;selected={...selected,named:[{...selected.named[0],names:replacement}],principalGroupAuthorization:{label:selectedName,members:replacement}};}
 return selected;
}
