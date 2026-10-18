import reviewedContexts from './reviewed-declared-varietal-contexts.mjs';
import {declarationLines} from './wine-scopes.mjs';
import {key} from './text-key.mjs';
import {joinSourceLineHyphens} from './source-layout.mjs';
const colors=['bianco','rosso','rosato'];
export function declaredVarietalParents(article,scope){
 if(typeof article!=='string'||!scope?.denomination||!scope.wineName)return [];
 const typeParts=String(scope.wineType||'').toLowerCase().split(/\s*\/\s*/);if(typeParts.some(p=>![...colors,'frizzante','spumante','passito'].includes(p))||typeParts.filter(p=>colors.includes(p)).length!==1)return [];
 const declarations=[];let groupMethod='',groupColor='';
 for(const raw of declarationLines(article)){
  const group=raw.trim().match(/^-?\s*Vini (bianchi|rossi|rosati|spumanti|frizzanti|passiti)\s*:/i);
  if(group){groupMethod=({spumanti:'spumante',frizzanti:'frizzante',passiti:'passito'})[group[1].toLowerCase()]||'';groupColor=({bianchi:'bianco',rossi:'rosso',rosati:'rosato'})[group[1].toLowerCase()]||'';continue;}
  const line=raw.replace(/\s+/g,' ').trim(),m=line.match(/^[-–\s]*[«“"]([^»”"]+)[»”"]\s*([^;]+?)[;.]?[”"]?$/u);
  if(!m||key(m[1])!==key(scope.denomination)||/geograf|sottozon|con specificazione|menzione|vigna/i.test(m[2]))continue;
  const also=m[2].match(/^(.*?), anche (Novello|Superiore|Riserva)$/i),variants=also?[also[1],also[1]+' '+also[2]]:[m[2]];
  for(const variant of variants){
   const cat=variant.match(/^(.*?)\s*\(nelle categorie:\s*([^)]*)\)$/i),rows=cat?cat[2].split(',').map(c=>({suffix:cat[1],category:c.trim()})):[{suffix:variant}];
   for(const row of rows){if(!/^[\p{L}'’ -]+$/u.test(row.suffix))continue;const name=scope.denomination+' '+row.suffix+(row.category?' (categoria: '+row.category+')':'');declarations.push({name,suffix:row.suffix,category:row.category,method:groupMethod,color:groupColor});}
  }
 }
 const targetKey=key(scope.wineName),matches=declarations.filter(d=>(key(d.name)===targetKey||(d.method&&/ (?:bianco|rosso|rosato)$/i.test(d.name)&&key(d.name.replace(/ (bianco|rosso|rosato)$/i,' '+d.method+' $1'))===targetKey))&&(!d.method||key(scope.wineType).includes(d.method))&&(!d.color||key(scope.wineType).includes(d.color)));
 if(matches.length!==1)return [];
 const child=matches[0],facet=child.suffix.match(/^(.+?)\s+(novello|superiore|riserva|frizzante|spumante|passito|bianco|rosso|rosato)$/i);
 if(!facet)return [];
 const principal=facet[1],dimension=facet[2].toLowerCase();if(colors.includes(key(principal)))return [];
 const explicitMethods=[...String(scope.wineType).matchAll(/\b(frizzante|spumante|passito|liquoroso|vendemmia tardiva)\b/gi)].map(m=>m[1].toLowerCase());
 if(['frizzante','spumante','passito'].includes(dimension)&& (explicitMethods.length!==1||explicitMethods[0]!==dimension))return [];
 if(['novello','superiore','riserva'].includes(dimension)&&explicitMethods.length)return [];
 if(colors.includes(dimension)&&(!typeParts.includes(dimension)||explicitMethods.length!==(child.method?1:0)||child.method&&explicitMethods[0]!==child.method))return [];
 const parent=declarations.filter(d=>key(d.suffix)===key(principal)&&!d.method&&!d.category);
 if(parent.length!==1)return [];
 return [{wineName:scope.denomination+' '+principal,wineType:String(scope.wineType).toLowerCase().split(/\s*\/\s*/).filter(x=>colors.includes(x)).join(' / '),principal,dimension}];
}
// A denomination's short Moscato specification is a label variable, not a
// global grape synonym. The production reader must independently find exactly
// one corresponding named Moscato member in this same source family.
export function declaredShortMoscatoScope(article,scope){
 if(key(scope.wineName)!==key(scope.denomination+' Moscato')||!['bianco','rosso','rosato'].includes(key(scope.wineType)))return false;
 const rows=declarationLines(article).map(line=>line.replace(/\s+/g,' ').trim()).filter(line=>{const m=line.match(/^[-–\s]*[«“"]([^»”"]+)[»”"]\s+Moscato[;.]?$/i);return m&&key(m[1])===key(scope.denomination);});
 return rows.length===1;
}

export function reviewedDeclaredSourceHash(context,declaration,scope){
 const compact=x=>String(x||'').replace(/\s+/g,' ').trim();
 const rows=reviewedContexts.filter(r=>key(r.denomination)===key(scope?.denomination)&&compact(r.articleOne)===compact(declaration)&&compact(r.articleTwo)===compact(context));
 return rows.length===1?rows[0].sourceHash:null;
}
// Generic complete declaration grammar. More complex geographic/group-label
// provisions use the separately reviewed context fallback, never a wildcard.
export function fullyConsumedVarietalDeclarations(article,scope){
 const text=joinSourceLineHyphens(article||'').replace(/\s+/g,' ').trim();
 const intro=text.match(/^Art(?:icolo|\.)\s*1\.?\s+Denominazione(?: e vini)?\s+(?:1\.\s*)?La denominazione di origine controllata(?: e garantita)?\s+[«“"]([^»”"]+)[»”"]\s+è riservata ai vini che rispondono alle condizioni (?:e|ed) ai requisiti (?:stabiliti|prescritti) (?:dal|nel) presente disciplinare di produzione,? per le seguenti tipologie(?: e menzioni|, specificazioni aggiuntive o menzioni)?\s*:/iu) || text.match(/^Art(?:icolo|\.)\s*1\.?\s+Denominazione(?: e vini)?\s+(?:1\.\s*)?La denominazione di origine controllata(?: e garantita)?\s+[«“"]([^»”"]+)[»”"]\s+è riservata ai seguenti vini che rispondono alle condizioni ed ai requisiti stabiliti dal presente disciplinare di produzione\s*:/iu);
 if(!intro||key(intro[1])!==key(scope?.denomination))return false;
 // Locate the same finite intro in original whitespace without losing rows.
 const compact=x=>joinSourceLineHyphens(x).replace(/\s+/g,' ').trim();let offset=0;
 while(offset<article.length&&compact(article.slice(0,offset)).length<intro[0].length)offset++;
 if(compact(article.slice(0,offset))!==intro[0])return false;
 const rows=declarationLines(article.slice(offset));let count=0;
 for(const raw of rows){
  const line=compact(raw);if(!line)continue;
  if(/^-?\s*Vini (bianchi|rossi|rosati|spumanti|frizzanti|passiti)\s*:/i.test(line)){if(!/^-?\s*Vini (bianchi|rossi|rosati|spumanti|frizzanti|passiti)\s*:$/i.test(line))return false;continue;}
  const m=line.match(/^[-–\s]*[«“”"]([^»”"]+)[»”"]\s+(.+?)[;.]?$/u);if(!m||key(m[1])!==key(scope.denomination))return false;
  let suffix=m[2].replace(/[,;.]$/,'').trim();
  const category=suffix.match(/^(.*?)\s*\(nelle categorie:\s*([^)]*)\)$/i);
  if(category){if(category[2].split(',').some(c=>!['vino','vino ottenuto da uve appassite','vino di uve stramature'].includes(key(c))))return false;suffix=category[1];}
  suffix=suffix.replace(/, anche (?:novello|riserva|superiore)$/i,'');
  suffix=suffix.replace(/\(([\p{L}\p{M}'’ -]+)\)/gu,' $1 ').replace(/\s+/g,' ').trim();
  if(!/^[\p{L}\p{M}'’ -]+$/u.test(suffix)||/\b(?:con|senza|per|solo|salvo|purché|devono|deve|riservat\w*|condizion\w*|sottozon\w*|geografic\w*|vigna)\b/iu.test(suffix))return false;
  count++;
 }
 return count>0;
}
