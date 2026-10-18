import {key} from './text-key.mjs';
import {joinSourceLineHyphens} from './source-layout.mjs';

// Only a numbered prose/quoted paragraph starts a production boundary.
// Decimal percentage rows and numeric dates do not meet the letter/quote test.
const productionParagraphPattern=String.raw`^\s*\d+\s*[.)\-–]\s*(?=[\p{L}“"«])`;
export function productionParagraphBoundary(text) { return String(text).search(new RegExp(productionParagraphPattern,'mu')); }
export function productionParagraphs(text) { return String(text).split(new RegExp(`(?=${productionParagraphPattern})`,'mu')); }

const colors = /\b(?:rosso|rossi|bianco|bianchi|rosato|rosati|ros[eé])\b/gi;
const canonicalColor = value => ({rossi:'rosso',bianchi:'bianco',rosati:'rosato',rose:'rosato'})[key(value)] || key(value);
export function scopeColors(text) { return [...new Set([...String(text).matchAll(colors)].map(m=>canonicalColor(m[0])))]; }
export function scopeSignature(wine) {
  return JSON.stringify({color:scopeColors(wine.colorContext || wine.type || '').sort(),methods:[...String(wine.type || '').matchAll(/\b(spumante|frizzante|passito|liquoroso|vendemmia tardiva|metodo classico)\b/gi)].map(m=>key(m[0])).sort(),qualifiers:(wine.qualifiers || []).map(key).sort()});
}
// An explicit "or" between complete quoted names establishes aliases only
// inside this declaration. A catalogue alias never collapses distinct wines.
export function declaredAliases(line) {
  const value=String(line).trim().replace(/^[-–\s\d.]+/,'').replace(/[;:.]\s*$/,'');
  const parts=value.split(/\s+o\s+(?=[“”"«])/i);
  if(parts.length < 2 || parts.some(p=>!/[“”"«][^”"»]+[”"»]/.test(p))) return [];
  const suffix=parts.at(-1).match(/[”"»]\s*([^”"»]*)$/)?.[1]?.trim() || '';
  const sharedSuffix=/^(?:(?:tranquillo|spumante|frizzante|passito|riserva|superiore|novello|rosso|bianco|rosato|ros[eé]|vendemmia tardiva|metodo classico)(?:\s+|$)|\(metodo tradizionale\)\s*)+$/i.test(suffix) ? suffix : '';
  return parts.map(part=>{
    let name=part.replace(/[“”"«»]/g,' ').replace(/\s+/g,' ').trim();
    if(sharedSuffix && !key(name).endsWith(key(sharedSuffix))) name+=' '+sharedSuffix;
    return name;
  });
}
export function scopeHeadingTargets(heading,wines) {
  let head=heading.replace(/\s+/g,' ').trim();
  const typology=head.match(/^Tipologia\s+([\p{L}'’ -]+):$/iu);
  if(typology) {
    const candidates=wines.filter(wine=>{
      if(key(wine.suffix)===key(typology[1]))return true;
      // The qualification after complete quoted alternative denominations
      // belongs to each alias, not to one fragment of the display name.
      const declared=String(wine.evidenceText||'').replace(/\s+/g,' ').trim().match(/^[«“"][^»”"]+[»”"](?:\s+o\s+[«“"][^»”"]+[»”"])+\s+([\p{L}'’ -]+)[;.]?$/u);
      return declared && declaredAliases(wine.evidenceText).length>1 && key(declared[1])===key(typology[1]);
    });
    return new Set(candidates.map(wine=>key(wine.name)+'|'+scopeSignature(wine))).size===1?candidates:[];
  }
  // A repeated qualified heading explicitly groups its ordinary and Vigna
  // presentation. Bind only that exact declared qualification; retain the
  // whole block so Vigna-specific analytical values remain conditional.
  const qualifiedMention=head.match(/^([“"«][^”"»]+[”"»])\s+(riserva|superiore)\s+e\s+\2\s+vigna\s*[:;]?$/i);
  if (qualifiedMention) {
    const target=key(qualifiedMention[1]+' '+qualifiedMention[2]);
    const matches=wines.filter(w=>[w.name,...(w.aliases||[])].some(name=>key(name)===target));
    return matches.length===1 ? matches : [];
  }
  const sharedMention=head.match(/^(.*?)\s+con (?:la )?menzione\s+[“"«]?vigna[”"»]?\s+e\/o\s+[“"«]?(riserva|superiore)[”"»]?\s*[:;]?$/i);
  if(sharedMention) {const matches=wines.filter(w=>key(w.name)===key(sharedMention[1]+' '+sharedMention[2]));return matches.length===1?matches:[];}
  if (/sottozon|geograf|(?<!anche )con (?:la )?menzione\s+[“"«]?vigna/i.test(head)) return [];
  const declared=scopeColors((head.match(/\((rosso|bianco|rosato)\)/i)||[])[0] || '');
  head=head.split(/all[’']atto|(?:deve|devono)\s+(?:essere|rispondere)|(?:è|e')\s+riservat/i)[0];
  head=head.replace(/^\s*(?:\d+\.\s*)?(?:I vini|Il vino|La denominazione)\s+(?:(?:a denominazione |di )?(?:di origine|d[’']origine)?\s*controllata(?: e garantita)?\s+)?/i,'');
  head=head.replace(/,?\s*anche con (?:la )?menzione\s+[“"«]?vigna[”"»]?/gi,'').replace(/\((?:rosso|bianco|rosato)\)/gi,'');
  // An obligation-only continuation has no wine label. Empty parts would
  // vacuously match every candidate and turn prose into a section heading.
  if (!key(head)) return [];
  const groups=head.split(/\s+e\s+(?=[“”"«])/i);
  const targets=[];
  for(const group of groups) {
    if (/\bvigna\s*$/i.test(key(group))) {
      const ordinary=key(group).replace(/ vigna$/,'');
      if(targets.some(w=>[w.name,...(w.aliases||[])].some(name=>key(name)===ordinary))) continue;
      return [];
    }
    const aliases=declaredAliases(group);
    const parts=aliases.length ? aliases.map(key) : group.split(/\s+o\s+(?=[“”"«])/i).map(part=>key(part)).filter(Boolean);
    if (!parts.length) return [];
    const candidates=wines.filter(w=>parts.every(part=>[w.name,...(w.aliases||[])].some(name=>key(name)===part)) && (!declared.length || declared.every(color=>scopeColors(w.colorContext || w.type).includes(color))));
    if(!candidates.length || new Set(candidates.map(w=>key(w.name)+'|'+scopeSignature(w))).size!==1) return [];
    targets.push(...candidates);
  }
  return [...new Set(targets)];
}

// Syntax can end a row without resolving its wine identity. Keep unknown
// labels unresolved: this is containment, never spelling correction.
export function quotedSectionBoundary(lines, index) {
  let heading=lines[index].trim(), end=index;
  if (!/^\s*(?:\d+\.\s*)?[“"«]/.test(heading)) return false;
  while (end+1<lines.length && end-index<2 && !/^[^“"«]*[“"«][^”"»]+[”"»]/.test(heading)) heading+=' '+lines[++end].trim();
  const inlineRecipe=heading.match(/^(?:\d+\.\s*)?[“"«][^”"»]+[”"»]\s+([\p{L}\p{M}'’ ()-]+?)\s*:\s*[^\n]*\d+(?:[,.]\d+)?\s*%/u);
  if (inlineRecipe && !/^(?:minimo|massimo|almeno|fino a|da soli o congiuntamente)$/i.test(inlineRecipe[1].trim())) return true;
  const label=heading.match(/^(?:\d+\.\s*)?[“"«]([^”"»]+)[”"»]\s*([\p{L}\p{M}'’ ()-]*?)\s*[:;]?$/u);
  if (!label || /\b(?:vigna|menzione|geografic\w*|sottozon\w*|sono|deve|devono|ottenut\w*|vitign\w*|possono|pu[oò]|essere|designat\w*|concorrono)\b/i.test(heading)) return false;
  // A short, unquoted continuation may wrap a wine suffix. A second quote,
  // prose sentence, or analytical row is never absorbed into the label.
  for(let offset=1;offset<=3 && end+offset<lines.length;offset++) {
    const next=lines[end+offset].trim();
    if (!next) continue;
    if (/^(?:[-–]\s*)?(?:colore|odore|sapore|profumo|spuma|titolo alcolometrico|acidit[àa]|estratto)\b\s*:?/i.test(next)) return true;
    if (/^(?:[-–]\s*)?(?:(?:periodo (?:minimo )?di )?(?:invecchiamento|affinamento|maturazione))\b.*\b(?:mesi|anni|anno)\b/i.test(next)) return true;
    // Recipe rows need a qualified complete wine label and a production
    // statement. A quoted cultivar list is not a list of wine headings.
    if (label[2].trim() && (/^(?:deve|devono) essere ottenut[oi]\b|^(?:uve|vitigni)\s*:/i.test(next) || /^[\p{L}'’ -]+:?\s*(?:minimo|massimo|almeno)\s*\d+(?:[,.]\d+)?\s*%/iu.test(next))) return true;
    if (!/^[\p{L}\p{M}'’ -]{1,80}[:;]?$/u.test(next) || /\b(?:il|la|le|sono|deve|devono|con|per|possono)\b/i.test(next)) return false;
  }
  return false;
}

export function scopedSection(article,wine,wines,cache) {
  const lines=article.split('\n');
  let starts=cache?.get(article);
  if(!starts) {
  starts=[];
  for(let index=0;index<lines.length;index++) {
    // Join only a wrapped characteristics introduction, not a later wine row.
    let head=lines[index], end=index;
    if(/^\s*(?:\d+\.\s*)?(?:Il vino|I vini)\b/.test(head)) {
      while(end+1<lines.length && end-index<5 && !/caratteristiche\s*:|all[’']atto/.test(head) && !quotedSectionBoundary(lines,end+1)) head+=' '+lines[++end];
    }
    const targets=scopeHeadingTargets(head,wines);
    if(targets.length || quotedSectionBoundary(lines,index) || /^\s*Tipologia\s+[\p{L}'’ -]+:\s*$/iu.test(head)) {starts.push({index,targets,narrative:/^\s*(?:\d+\.\s*)?(?:Il vino|I vini)\b/.test(head)});index=end;}
  }
  cache?.set(article,starts);
  }
  const matches=starts.filter(s=>s.targets.includes(wine));
  if(!matches.length) return null;
  const start=matches.find(s=>!s.narrative) || matches[0], next=starts.find(s=>s.index>start.index);
  return lines.slice(start.index,next?.index??lines.length).join('\n');
}

// Only an explicit varietal-name alternative in the declaration establishes
// these local wine-label aliases. Color/method/category qualifiers are not aliases.
export function varietalLabelAliases(base, suffix) {
  const match=suffix.replace(/[.;:]\s*$/, '').match(/^([\p{L}][\p{L}'’ -]*?)\s+(?:o\s+([\p{L}][\p{L}'’ -]*)|\(([^)]+)\))$/iu);
  if(!match || /\b(?:anche|categoria|metodo|riserva|superiore|rosso|bianco|rosato|spumante|frizzante|passito)\b/i.test(suffix)) return [];
  const left=match[1].trim(), right=(match[2]||match[3]).trim();
  if(!/^[\p{L}][\p{L}'’ -]*$/u.test(right)) return [];
  return [`${base} ${left}`,`${base} ${right}`,`${base} ${left} (${right})`,`${base} ${left} o ${right}`];
}

// Repair only a missing space before a title-cased qualification, and only
// against an independently written full label. Never split arbitrary names,
// infer methods, or treat compact spelling alone as a qualification.
export function corroboratedWineLabel(value, labels) {
  const spaced = value.replace(/(\p{Ll})(Riserva|Superiore|Novello)(?=$|[\s;:.,)])/gu, '$1 $2');
  if (spaced === value) return value;
  const matches = [...new Set(labels.filter(label => key(label) === key(spaced)))];
  return matches.length === 1 ? matches[0] : value;
}

export function characteristicColor(text) {
  const color=String(text).match(/colore\s*:?\s*(?:da(?:l)?\s+)?(rosso|bianco|rosato|ros[eé]|rubino|granato|rosa|giallo|paglierino)\b/i)?.[1]?.toLowerCase();
  return ({rubino:'rosso',granato:'rosso',rosa:'rosato',giallo:'bianco',paglierino:'bianco',rose:'rosato','rosé':'rosato'})[color] || color;
}

export function declarationLines(text) {
  const lines=String(text).split('\n'), joined=[];
  for(let i=0;i<lines.length;i++) {
    let line=lines[i];
    if (/;\s*anche con .*sottozone\s*:/i.test(line)) {
      while(i+1<lines.length && /,\s*$/.test(line)) line+='\n'+lines[++i];
      line=line.split(/;\s*anche con .*sottozone\s*:/i)[0]+';';
    }
    while(i+1<lines.length && (/\s[oe]\s*$/.test(line) || /^[-–\s\d.]*[“”"«]/.test(line) && !/denominazione|menzione|vigna|caratteristiche/i.test(line) && (line.match(/[“”"«»]/g)||[]).length%2===1 && !/^\s*[“”"«]|colore\s*:|titolo alcolometrico/i.test(lines[i+1]))) line+='\n'+lines[++i];
    while(i+1<lines.length && !/^\s*[“”"«]|(?:colore|odore|sapore|titolo|acidit|estratto)\s*:/i.test(lines[i+1]) &&
      (/\([^)]*$/.test(line) || /^\s*(?:spumante|frizzante|passito|riserva|superiore)\b/i.test(lines[i+1]) || /[”"»]\s*$/.test(line) && /^\s*[\p{L}-]+\s+(?:spumante|frizzante|passito)\b/iu.test(lines[i+1]))) line+='\n'+lines[++i];
    if(i+1<lines.length && /^\s*(?:(?:Superiore|Riserva)\s+)?con una delle.*menzioni geografiche/i.test(lines[i+1])) line+='\n'+lines[++i];
    // Only a declaration row can yield more declaration rows. Splitting prose
    // such as ‘Le sottozone «A» e «B» sono ...’ fabricates a wine from its tail.
    const declaration = /^[-–\s\d.]*[“”"«]/.test(line);
    joined.push(...(declaration ? line.split(/[,;]\s*(?=[“”"«])|\s+e\s+(?=[“”"«])/i) : [line]));
  }
  return joined;
}

export function consumptionDeclarations(article) {
  const starts=[...String(article).matchAll(/(?:^|\n)\s*(?:\d+\.\s*)?Il vino\s+/gi)], output=[];
  for(const [i,start] of starts.entries()) {
    const block=article.slice(start.index,starts[i+1]?.index??article.length).trim();
    const end=block.search(/all[’']atto/i);
    if(end<0 || end>700 || !/(?:colore|odore|sapore)\s*:/i.test(block)) continue;
    // A subsequent quoted heading owns the characteristics; the introduction is not another wine record.
    const beforeCharacteristics=block.slice(end).split(/(?:colore|odore|sapore|profumo)\s*:/i)[0];
    if (/(?:^|\n)\s*[“"«]/.test(beforeCharacteristics)) continue;
    const head=block.slice(0,end).replace(/^\s*(?:\d+\.\s*)?Il vino\s+(?:(?:a denominazione (?:di origine|d[’']origine) controllata(?: e garantita)?|a DOC(?:G)?)\s+)?/i,'').replace(/[,\s]+$/,'').replace(/\s+/g,' ');
    if(!/^[“”"«]/.test(head) || /\s+e\s+[“”"«]|menzione|vigna|sottozon|geograf/i.test(head)) continue;
    output.push({originalLine:head,characteristics:block});
  }
  return output;
}

// Bind each complete, explicit list before the production predicate. A later
// numbered paragraph is always a boundary, including an unsupported paragraph.
export function grapeScopeSection(article, wine, wines) {
  const blocks=productionParagraphs(article);
  const matches=[];
  for(const block of blocks) {
    const explicitMethods=block.replace(/\s+/g,' ').match(/\bI vini (spumanti e frizzanti|frizzanti e spumanti) con la denominazione (?:di origine|d[’']origine) controllata(?: e garantita)?\s+(.+?)\s+sono ottenuti\b/i);
    if(explicitMethods) {
      const labels=declaredAliases(explicitMethods[2]);
      const methods=explicitMethods[1].toLowerCase().split(' e ').map(method=>method.replace(/i$/,'e'));
      const selected=wines.filter(candidate=>{
        const actual=[...new Set([...(String(candidate.type || '').match(/spumante|frizzante|passito|liquoroso|vendemmia tardiva|metodo classico/gi)||[]),candidate.methodContext].filter(Boolean).map(key))];
        return actual.length===1 && methods.includes(actual[0]) &&
          (key(candidate.name)===key(explicitMethods[2]) || labels.length && labels.every(label=>[candidate.name,...(candidate.aliases || [])].some(name=>key(name)===key(label))));
      });
      const sameMethod=selected.filter(candidate=>key(productionScopeLabel(candidate))===key(productionScopeLabel(wine)));
      if(selected.includes(wine) && sameMethod.length===1) {
        const start=block.search(/\bI vini\s+(?:spumanti\s+e\s+frizzanti|frizzanti\s+e\s+spumanti)\s+con la denominazione/i);
        matches.push(block.slice(start).trim());
      }
      continue;
    }
    const match=block.replace(/\s+/g,' ').match(/^(?:Art(?:icolo|\.)\s*2\s+Base ampelograf(?:ica|ia)(?: dei vigneti)?\s+)?(?:\d+\s*[.)-]\s*)?(?:I vini|Il vino)\s+(?:(?:designati con la\s+|a\s+)?Denominazione (?:di origine|d[’']origine) controllata(?: e garantita)?\s+)?(.+?)\s+(?:devono essere ottenuti|sono ottenuti|deve essere ottenuto|è ottenuto)\b/i);
    if(!match) continue;
    const heading=match[1].replace(/,\s*$/,'').replace(/spumante(?=metodo)/gi,'spumante ');
    const references=heading.split(/,\s*(?=[“”"«])|\s+e\s+(?=[“”"«])/i);
    const selected=[];
    let complete=true;
    for(const reference of references) {
      const expansion=reference.match(/^(.*?)\s+anche\s+(riserva|superiore|novello)(?:\s+e\s+(spumante|frizzante))?$/i);
      const variants=expansion?[expansion[1],expansion[1]+' '+expansion[2],...(expansion[3]?[expansion[1]+' '+expansion[3]]:[])]:[reference];
      for(const variant of variants) {
        const aliases=expansion ? declaredAliases(expansion[1]).map(alias=>alias+variant.slice(expansion[1].length)) : declaredAliases(variant);
        const labels=aliases.length?aliases:[variant.replace(/[“”"«»]/g,'')];
        const full=wines.filter(item=>key(productionScopeLabel(item))===key(variant));
        const exact=full.length===1?full:labels.length===1?wines.filter(item=>key(productionScopeLabel(item))===key(labels[0])):[];
        const candidates=exact.length===1?exact:wines.filter(item=>labels.every(label=>[item.name,...(item.aliases||[])].some(name=>key(productionScopeLabel(item,name))===key(label))));
        if(candidates.length!==1) {complete=false;break;}
        selected.push(candidates[0]);
      }
      if(!complete) break;
    }
    if(complete && selected.includes(wine)) matches.push(block.trim());
  }
  return matches.length===1?matches[0]:null;
}

// Method metadata is part of identity even when omitted from display names.
export function productionScopeLabel(wine, label=wine.name) {
  const methods=[...new Set([...(String(wine.type || '').match(/\b(?:spumante|frizzante|passito|liquoroso|vendemmia tardiva|metodo classico)\b/gi)||[]),wine.methodContext].filter(Boolean).map(key))];
  return [label,...methods.filter(method=>!new RegExp(`\\b${method}\\b`,'i').test(label))].join(' ').trim();
}

// Resolve a finite list of varietal specifications inside its own production
// paragraph. The selected row/variable keeps the complete original proof.
// Official designation synonyms are scope labels, not global grape identities.
function selectedVarietalDesignation(labels, suffix) {
  const exact=labels.filter(label=>key(label)===key(suffix));
  if(exact.length===1) return exact[0];
  if(key(suffix)!=='moscato') return undefined;
  const candidates=labels.filter(label=>['moscato bianco','moscato giallo'].includes(key(label)));
  return candidates.length===1?candidates[0]:undefined;
}

export function varietalProductionSection(article, wine, entry, wines=[wine]) {
  const starts=[...article.matchAll(/(?:^|\n)\s*(?:\d+\s*[.)\-–]\s*)?(?:Nell[’']ambito dei vini (?:spumanti|frizzanti),\s*)?La (?:denominazione|tipologia)\b/gi)];
  const names=[entry.name.original,...(entry.name.aliases||[])].map(key);
  const matches=[];
  for(const [index,start] of starts.entries()) {
    const nextParagraph=productionParagraphBoundary(article.slice(start.index+start[0].length));
    const end=nextParagraph<0?article.length:start.index+start[0].length+nextParagraph;
    const block=article.slice(start.index,Math.min(end,starts[index+1]?.index??article.length)).trim();
    const rawHead=block.split(/(?:è|e')\s+riservata/i)[0];
    if(rawHead===block) continue;
    const head=joinSourceLineHyphens(rawHead);
    const quoted=[...head.matchAll(/[“”"«]([^”"»]+)[”"»]/g)];
    if(!quoted.length || !names.includes(key(quoted[0][1]))) continue;
    const effectiveSuffix=productionScopeLabel(wine,wine.suffix || '');
    const targetTail=head.slice(quoted[0].index+quoted[0][0].length).replace(/\s+/g,' ').trim();
    const passitoColor=targetTail.match(/^(bianco|rosso) passito$/i)?.[1]?.toLowerCase();
    const namedPassito=effectiveSuffix.match(/^([\p{L}][\p{L}'’ -]*?) passito$/iu);
    if(passitoColor && namedPassito && scopeColors(wine.type).length===1 && scopeColors(wine.type)[0]===passitoColor && /\bpassito\b/i.test(wine.type)) {
      const choice=block.replace(/\s+/g,' ').match(/ottenuti dalle uve dei vitigni ([\p{L}][\p{L}'’ -]+?) provenienti dai vigneti aventi nell['’]ambito aziendale almeno (?:il\s+|l['’]\s*)\d+(?:[,.]\d+)?% del corrispondente vitigno/iu);
      const labels=choice?.[1].split(/\s+o\s+/i).map(label=>label.trim()) || [];
      const selected=labels.find(label=>key(label)===key(namedPassito[1]));
      const targets=wines.filter(candidate=>key(productionScopeLabel(candidate))===key(quoted[0][1]+' '+namedPassito[1]+' passito'));
      if(selected && labels.length>1 && targets.length===1 && targets[0]===wine) matches.push({original:block,ruleText:block,boundGrape:selected,correspondingPrincipal:selected});
      if(selected) continue;
    }
    const qualifiedAliases=head.replace(/\s+/g,' ').match(/^(?:\d+\s*[.)\-–]\s*)?La denominazione(?: (?:di origine|d[’']origine) controllata(?: e garantita)?)?\s+(.+?)\s+con la specificazione\s+(.+)$/i);
    if (qualifiedAliases && !/^di uno dei seguenti vitigni\b/i.test(qualifiedAliases[2])) {
      const bases=qualifiedAliases[1].split(/\s+o\s+/i).map(key);
      const labels=qualifiedAliases[2].split(/[“”"«»]|,|\s+e\s+/i).map(label=>label.trim()).filter(Boolean);
      if(bases.length && bases.every(base=>names.includes(base)) && labels.length && labels.every(label=>/^[\p{L}][\p{L}'’ -]*$/u.test(label))) {
        const fullBase=key(qualifiedAliases[1]);
        const selected=labels.filter(label=>key(productionScopeLabel(wine))===`${fullBase} ${key(label)}`);
        if(selected.length===1 && wines.filter(candidate=>key(productionScopeLabel(candidate))===key(productionScopeLabel(wine))).length===1) matches.push({original:block});
      }
      continue;
    }
    const geography=targetTail.match(/^accompagnata dalla menzione geografica [“"«]([^”"»]+)[”"»] e seguita dalla specificazione ([\p{L}][\p{L}'’ -]*)$/iu);
    const unqualified=quoted.length===1 && /^senza alcuna menzione aggiuntiva$/i.test(targetTail) && head.match(/^\s*(?:\d+\s*[.)\-–]\s*)?Nell[’']ambito dei vini (spumanti|frizzanti),/i);
    if (geography || unqualified) {
      const suffix=geography ? `${geography[1]} ${geography[2]}` : unqualified[1].toLowerCase().replace(/i$/,'e');
      const targets=wines.filter(candidate=>key(productionScopeLabel(candidate))===key(quoted[0][1]+' '+suffix) && key(productionScopeLabel(candidate,candidate.suffix || ''))===key(suffix));
      if(targets.length===1 && targets[0]===wine && key(effectiveSuffix)===key(suffix)) matches.push({original:block});
      continue;
    }
    const correspondingList=targetTail.match(/^con la specificazione di uno dei seguenti vitigni\s*:\s*([\s\S]+)$/i);
    if (correspondingList) {
      const labels=correspondingList[1].split(/\s*;\s*|\s*,\s*|\s+-/).map(label=>label.replace(/^[-\s]+/,'').trim()).filter(Boolean);
      // PDF line breaks are significant for this finite list, unlike wrapped
      // narrative prose. Read the original tail to retain separate cultivars.
      const originalList=head.slice(quoted[0].index+quoted[0][0].length).match(/seguenti\s+vitigni\s*:\s*([\s\S]+)$/i)?.[1];
      const rows=originalList?.split(/\n|;|,/).map(label=>label.replace(/^[-\s]+/,'').trim()).filter(Boolean) || labels;
      const selected=rows.find(label=>key(label)===key(effectiveSuffix));
      const targets=selected?wines.filter(candidate=>key(productionScopeLabel(candidate))===key(quoted[0][1]+' '+selected)):[];
      if(selected && targets.length===1 && targets[0]===wine && rows.every(label=>/^[\p{L}][\p{L}'’ -]*$/u.test(label))) {
        if(/(?:dai|dei)\s+corrispondenti\s+vitigni/i.test(block)) matches.push({original:block,boundGrape:selected});
        else if(/la\s+corrispondente\s+composizione\s+ampelografica\s+per\s+almeno/i.test(block)) matches.push({original:block,boundGrape:selected,ruleText:block.replace(/la\s+corrispondente\s+composizione\s+ampelografica(?=\s+per\s+almeno)/i,`il vitigno ${selected}`)});
      }
      continue;
    }
    // A declared list names full labels. It does not authorize implicit
    // inheritance by a method, ageing mention or a neighboring list row.
    const explicitList=head.slice(quoted[0].index+quoted[0][0].length).replace(/\s+/g,' ').trim()
      .match(/^(?:con la specificazione|seguita dalla indicazione)\s+(.+)$/i);
    if(explicitList) {
      const labels=explicitList[1].replace(/[“”"«»]/g,'').replace(/[,\s]+$/,'').split(/,\s*|\s+e\s+/i);
      if(labels.every(label=>/^[\p{L}][\p{L}'’ -]*$/u.test(label)) && labels.some(label=>key(label)===key(effectiveSuffix))) matches.push({original:block});
      continue;
    }
    if(quoted.length!==1 || !/seguita.*specificazioni/s.test(head)) continue;
    const method=head.match(/Nell[’']ambito dei vini (spumanti|frizzanti)/i)?.[1]?.toLowerCase().replace(/i$/, 'e');
    if (method && !String(wine.type).split(' / ').includes(method)) continue;
    if (method && /dai\s+rispettivi\s+vitigni\s+per\s+almeno\s+l[’']\s*\d+(?:[,.]\d+)?%/i.test(block)) {
      const labels=head.match(/specificazioni di vitigno\s*:\s*([\s\S]*)/i)?.[1]?.split(';').map(v=>v.trim()).filter(Boolean) || [];
      const suffix=wine.suffix.replace(new RegExp(` ${method}$`, 'i'), '');
      const selected=labels.find(label=>key(label)===key(suffix));
      if (selected) matches.push({original:block,boundGrape:selected});
    // Bind the variable only from the finite list in this production clause.
    } else if(/specificazioni di vitigno\s*:/i.test(head) && /(?:dai|dei)\s+corrispondenti\s+vitigni/i.test(block)) {
      const list=head.match(/specificazioni di vitigno\s*:\s*([\s\S]*)/i)?.[1];
      const labels=list?.replace(/\s+/g,' ').replace(/[,\s]+$/,'').split(/,|;/).map(v=>v.trim()).filter(Boolean) || [];
      const selected=selectedVarietalDesignation(labels,effectiveSuffix);
      if(selected && labels.every(label=>/^[\p{L}][\p{L}'’ -]*$/u.test(label))) matches.push({original:block,boundGrape:selected});
    } else if(/rispettivamente|seguente composizione ampelografica/i.test(block.replace(/\s+/g,' '))) {
      const rows=[...block.matchAll(/^\s*([\p{L}][\p{L}'’ , -]{0,160})\s*:/gmu)].filter(row=>!/^vitign[oi]\b/i.test(row[1].trim()));
      const designation=selectedVarietalDesignation(rows.map(row=>row[1].trim()),effectiveSuffix);
      for(const [i,row] of rows.entries()) if(key(row[1])===key(designation || '') || row[1].split(/,\s*|\s+e\s+/i).some(label=>[label,...varietalLabelAliases('',label)].some(alias=>key(corroboratedWineLabel(effectiveSuffix, [alias]))===key(alias)))) {
        matches.push({original:block, ruleText:block.slice(0,rows[0].index)+block.slice(row.index,rows[i+1]?.index??block.length)});
      }
    } else if(/esclusivamente dai corrispondenti vitigni/i.test(block)) {
      const list=head.match(/specificazioni\s*:\s*([\s\S]*)/i)?.[1];
      const labels=list?.replace(/\s+/g,' ').split(/,|;/).map(v=>v.trim()).filter(Boolean) || [];
      const selected=labels.find(label=>key(label)===key(wine.suffix));
      const stem=selected?.replace(/\s+(?:spumante|frizzante|rosso|rosato|bianco)$/i,'');
      if(selected && labels.some(label=>key(label)===key(stem))) matches.push({original:block,boundGrape:stem});
    }
  }
  return matches.length===1?matches[0]:null;
}

// A sole denomination-wide paragraph may govern the declared ordinary wine
// and its ageing qualifications. Match every name token; method, geography,
// varietal and color-labelled siblings are not inferred from a base recipe.
export function denominationFamilyProductionScope(article, entry, wines, declaredWines=[]) {
  // A ministry protocol may be laid out beside the article heading. Consume
  // only its complete administrative syntax here, never arbitrary heading
  // tails or anything within the production paragraph. Evidence stays raw.
  const body=String(article).replace(/^Art(?:icolo|\.)\s*2\.?\s+Base ampelograf(?:ica|ia)(?: dei vigneti)?\s*(?:(?:MIPAAF|DG PQAI) - PQAI 04 - Prot\. Uscita N\.\d+ del \d{2}\/\d{2}\/\d{4}\s*)?/i,'').replace(/^\d+\.\s*/,'');
  if (productionParagraphBoundary(body)>=0 || /\n\s*[“"«]|\b(?:in deroga|tuttavia)\b/i.test(body)) return false;
  const continuation=body.replace(/\s+/g,' ').split(/devono essere ottenuti|deve essere ottenuto|(?:è|e') riservata/i).slice(1).join(' ');
  if (/\b(?:la tipologia|per la tipologia|il vino|i vini|la denominazione|per (?:la |il |lo |i |le )?(?:riserva|superiore|novello|spumante|frizzante|passito))\b/i.test(continuation)) return false;
  // Join a line-end word split only in the target matcher; the complete
  // resulting label must still equal the official denomination or alias.
  const head=joinSourceLineHyphens(body).replace(/\s+/g,' ').match(/^(?:(?:I vini|Il vino)(?:\s+(?:a denominazione (?:di origine|d[’']origine) controllata(?: e garantita)?|a D\.?O\.?C\.?(?:G\.?)?))?|La denominazione(?: (?:di origine|d[’']origine) controllata(?: e garantita)?)?)\s+(.+?)\s+(?:(?:devono essere ottenuti|deve essere ottenuto)|(?:è|e') riservata)\b/i)?.[1];
  if (!head) return false;
  const reservation=body.replace(/\s+/g,' ').match(/(?:è|e') riservata([\s\S]*?)(?:\bottenut[oi]\b|$)/i)?.[1] || '';
  if(/spumant|frizzant|passit|liquoros|vendemmia tardiva|\btranquill[oi]\b|\bferm[oi]\b/i.test(reservation)) return false;
  const reservedColors=scopeColors(reservation);
  if(reservedColors.length && wines.some(wine=>!scopeColors(wine.colorContext || wine.type).length || scopeColors(wine.colorContext || wine.type).some(color=>!reservedColors.includes(color)))) return false;
  const names=[entry.name.original,...(entry.name.aliases || [])].map(key);
  const labels=head.replace(/,\s*$/,'').split(/\s+o\s+/i).map(key);
  if (!labels.length || !labels.every(label=>names.includes(label))) return false;
  if (declaredWines.length && wines.length && wines.every(wine=>{
    const matches=declaredWines.filter(candidate=>key(productionScopeLabel(candidate))===key(productionScopeLabel(wine)));
    const colors=scopeColors(wine.colorContext || wine.type || '');
    return matches.length===1 && wines.filter(candidate=>key(productionScopeLabel(candidate))===key(productionScopeLabel(wine))).length===1 &&
      scopeColors(matches[0].colorContext || matches[0].type || '').every(color=>colors.includes(color));
  })) return true;
  const known=[...names].sort((a,b)=>b.length-a.length).map(name=>name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
  const family=new RegExp(`^(?:${known})(?: o (?:${known}))*(?: (?:(?:tipologia|con menzione|con la menzione) )?(?:riserva|superiore))?$`);
  const colors=wines.map(wine=>scopeColors(wine.colorContext || wine.type || '').sort().join('|'));
  if (colors.some(color=>!color || color.includes('|')) || new Set(colors).size!==1) return false;
  return wines.length>0 && wines.every(wine=>!wine.methodContext && !/spumante|frizzante|passito|liquoroso|vendemmia tardiva/i.test(wine.type || '') && family.test(key(wine.name)));
}

export function articleOneProductionScope(article,entry) {
  const body=article.replace(/^Art(?:icolo|\.)\s*2\.?\s+Base ampelograf(?:ica|ia)(?: dei vigneti)?\s*/i,'').replace(/^\d+\s*[.)\-–]\s*/,'');
  if(productionParagraphBoundary(body)>=0) return false;
  const intro=article.replace(/^Art(?:icolo|\.)\s*2\s+Base ampelograf(?:ica|ia)(?: dei vigneti)?\s*/i,'').replace(/^\d+\.\s*/,'').split(/(?:è|e')\s+riservat|devono\s+essere\s+ottenuti/i)[0];
  const reference=intro.match(/(?:di cui|previste)\s+all[’']art(?:icolo|\.)\s*1\b/i);
  if(!reference) return false;
  const prefix=intro.slice(0,reference.index).trim();
  if(/^(?:I vini|La denominazione)$/i.test(prefix)) return true;
  const declaration=prefix.replace(/^La denominazione(?:\s+(?:di origine|d[’']origine) controllata(?: e garantita)?)?\s+/i,'');
  if(declaration===prefix) return false;
  const quoted=[...declaration.matchAll(/[“”"«]([^”"»]+)[”"»]/g)];
  const names=[entry.name.original,...(entry.name.aliases||[])].map(key);
  return quoted.length>0 && quoted.every(m=>names.includes(key(m[1]))) &&
    !declaration.replace(/[“”"«]([^”"»]+)[”"»]/g,'').replace(/\bnelle tipologie\b|\bo\b|[,\s]/gi,'');
}
