import {compileScopedOptionalComplementDefinition} from './scoped-source-domain-definition.mjs';
import {fullyConsumedVarietalDeclarations} from './declared-varietal-scope.mjs';
import {declarationLines} from './wine-scopes.mjs';
import {joinSourceLineHyphens} from './source-layout.mjs';
const norm=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/\s+/g,' ').trim();
// An explicit color/type declaration transports its own ordinary annex domain.
// Neither a suffix match nor the absence of a child-specific recipe is proof.
export function declaredAnnexParent(declaration,context,definition,scope){
 if(typeof declaration!=='string'||typeof context!=='string'||typeof definition!=='string'||!['bianco','rosso'].includes(scope?.wineType)||norm(scope.wineName)!==`${norm(scope.denomination)} ${scope.wineType} novello`)return null;
 if(!fullyConsumedVarietalDeclarations(declaration,scope))return null;
 const text=joinSourceLineHyphens(declaration),intro=text.match(/^[\s\S]+?tipologie,\s*specificazioni\s+aggiuntive\s+o\s+menzioni:\s*/iu);
 if(!intro)return null;
 let color='',found=0;const seen=new Set();
 for(const raw of declarationLines(text.slice(intro[0].length))){
  const line=raw.replace(/\s+/g,' ').trim();if(!line)continue;
  const group=line.match(/^Vini (bianchi|rossi|rosati):$/u);
  if(group){color=({bianchi:'bianco',rossi:'rosso',rosati:'rosato'})[group[1]];continue;}
  const row=line.match(/^[“"«]([^”"»]+)[”"»] ([\p{L}'’ -]+?)(?:, anche (Novello|Superiore|Riserva))?[;.]?$/u);
  if(!row||!color||norm(row[1])!==norm(scope.denomination))return null;
  const name=norm(row[2]);if(seen.has(name)||name===`${scope.wineType} novello`)return null;seen.add(name);
  if(name===scope.wineType){if(color!==scope.wineType||row[3]!=='Novello')return null;found++;}
 }
 if(found!==1||context.split(definition).length!==2||/\bnovello\b/i.test(context))return null;
 // Existing finite numbered-family compiler consumes every sibling clause,
 // including the unqualified color clause. A synthetic context is never used.
 const paragraphs=context.split(/\n(?=\d+\. La denominazione)/u);
 const named=paragraphs.filter(p=>/seguita da una delle specificazioni di cui appresso/.test(joinSourceLineHyphens(p).replace(/\s+/g,' ')));
 if(named.length!==1)return null;
 const label=named[0].match(/composizione\s+varietale:\s*\n([^:\n]+):/u)?.[1];if(!label)return null;
 const sibling={...scope,wineName:`${scope.denomination} ${label}`};
 if(!compileScopedOptionalComplementDefinition(context,named[0].trim(),sibling))return null;
 return {...scope,wineName:`${scope.denomination} ${scope.wineType}`};
}
