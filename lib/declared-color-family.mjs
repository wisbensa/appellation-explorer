import {declarationLines,characteristicColor} from './wine-scopes.mjs';
import {fullyConsumedVarietalDeclarations,reviewedDeclaredSourceHash} from './declared-varietal-scope.mjs';
import {compileExtendedCorrespondingFamily} from './corresponding-family-context.mjs';
const norm=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[«»“”"'’‘]/g,' ').replace(/\s+/g,' ').trim();
const categories=['vino','vino ottenuto da uve appassite','vino di uve stramature'];
export function compileDeclaredColorFamily(context,definition,scope,declaration,characteristics){
 if(typeof characteristics!=='string'||!scope||(!fullyConsumedVarietalDeclarations(declaration,scope)&&!reviewedDeclaredSourceHash(context,declaration,scope)))return null;
 const name=norm(scope.wineName),denomination=norm(scope.denomination),type=norm(scope.wineType),suffix=name.slice(denomination.length).trim();
 if(!name.startsWith(denomination))return null;
 const passito=suffix.match(/^(bianco|rosso) passito \(categoria: ([^)]+)\)$/),sparkling=['','rosso','rosato'].includes(suffix)&&type===(suffix?`${suffix} / spumante`:'spumante');
 if(!sparkling&&(!passito||!categories.includes(passito[2])||type!==`${passito[1]} / passito`))return null;
 const method=sparkling?'spumante':'passito',color=sparkling?suffix:passito[1];let group='',matches=0;
 for(const raw of declarationLines(declaration)){
  const line=raw.replace(/\s+/g,' ').trim(),g=line.match(/^-?\s*Vini (bianchi|rossi|rosati|spumanti|frizzanti|passiti)\s*:/i);
  if(g){group=g[1].toLowerCase();continue;}
  if(group!==(sparkling?'spumanti':'passiti'))continue;
  const m=line.match(/^[-–\s]*[«“"]([^»”"]+)[»”"]\s*(.*?)[;.]?[”"]?$/u);if(!m||norm(m[1])!==denomination)continue;
  const tail=norm(m[2]).replace(/[;.]$/,'').trim();
  if(sparkling){if(tail===suffix)matches++;}
  else {const p=tail.match(/^(bianco|rosso) passito \(nelle categorie: ([^)]+)\)$/);if(p&&p[1]===color){const cs=p[2].split(',').map(s=>s.trim());if(cs.some(c=>!categories.includes(c))||new Set(cs).size!==cs.length)return null;if(cs.includes(passito[2]))matches++;}}
 }
 if(matches!==1)return null;
 const lines=characteristics.split('\n'),blocks=[];let current;
 for(const line of lines){
  const field=/^\s*(?:colore|odore|profumo|sapore|spuma|titolo|acidit|estratto)\b/i.test(line);
  if(current&&!current.body.some(v=>/^\s*(?:colore|spuma)\s*:/i.test(v))&&!field){current.heading+=' '+line;continue;}
  if(norm(line).startsWith(denomination+' ')){current={heading:line,body:[]};blocks.push(current);}else if(current)current.body.push(line);
 }
 const expected=sparkling?norm(`${scope.denomination} ${suffix} spumante`):name;
 const selected=blocks.filter(b=>norm(b.heading).split(';').map(x=>x.trim()).includes(expected));if(selected.length!==1)return null;
 const block=selected[0],body=block.body.join('\n');
 if(!/colore\s*:/i.test(body)||!/(?:odore|profumo)\s*:/i.test(body)||!/sapore\s*:/i.test(body)||!/titolo alco{1,2}lometrico/i.test(body)||!/acidit(?:à|a') totale minima/i.test(body)||!/estratto non riduttore minimo/i.test(body))return null;
 if(color&&characteristicColor(body)!==color)return null;
 if(sparkling&&!/spuma\s*:/i.test(body))return null;
 if(passito&&norm(context.replace(definition,'')).includes(norm(`${scope.denomination} ${color} passito`)))return null;
 const baseScope={...scope,wineName:scope.denomination+(color?' '+color:'')};
 const compiled=compileExtendedCorrespondingFamily(context,definition,baseScope,{declaredColorMethod:true});
 if(!compiled)return null;
 return {...compiled,characteristicSpecialization:{parentWineName:baseScope.wineName,characteristics:[block.heading,...block.body].join('\n').trim()}};
}
